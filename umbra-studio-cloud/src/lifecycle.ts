import { destinations, entityAliases, entityType, resolveRecord } from './navigation';
import { recordSlug } from '../../src/lib/recordSlug';

type Actor = { id: string; role: string };
export async function lifecycleRequest(request: Request, db: D1Database, user: Actor): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/lifecycle/')) return null;
  const admin = ['admin', 'primary_admin'].includes(user.role);
  const headers = { 'Content-Type': 'application/json' };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if(request.method !== 'GET' && !['admin','primary_admin','editor'].includes(user.role)) return reply({error:'Editor permission required.'},403);
  if (url.pathname === '/api/lifecycle/relationships' && request.method === 'POST') {
    const body = await request.json() as { source_type:string; source_id:string; label:string; target:string; type?:string };
    const type=entityType(body.source_type);
    if (!type || !await resolveRecord(db,type,body.source_id) || !body.label?.trim() || !body.target?.trim()) return reply({error:'A live source, relationship label, and target name are required.'},400);
    await db.prepare(`INSERT OR IGNORE INTO studio_pending_relationships(id,source_type,source_id,target_name,target_type,relation_label,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),type,body.source_id,body.target.trim(),body.type||'',body.label.trim(),user.id,new Date().toISOString()).run();
    return reply({ok:true,...await resolvePendingRelationships(db,user.id)});
  }
  if (url.pathname === '/api/lifecycle/relationships/resolve' && request.method === 'POST') return reply({ok:true,...await resolvePendingRelationships(db,user.id)});
  if (url.pathname === '/api/lifecycle/health' && request.method === 'GET') return reply({ok:true,...await integrityScan(db)});
  if (url.pathname === '/api/lifecycle/cleanup' && request.method === 'POST') {
    if(!admin)return reply({error:'Administrator permission required.'},403);
    const scan=await integrityScan(db);
    // Only invalid polymorphic relationships are removed; canonical records and history remain intact.
    let removed=0;
    for(let offset=0;offset<scan.orphans.length;offset+=100){
      const statements=scan.orphans.slice(offset,offset+100).map(row=>{
        const endpoints=row.table==='studio_universal_links'?[['source_type','source_id'],['target_type','target_id']]:row.table==='studio_story_entity_links'?[['story_entity_type','story_entity_id'],['linked_entity_type','linked_entity_id']]:[['entity_type','entity_id']];
        const conditions=endpoints.flatMap(([typeColumn,idColumn])=>Object.entries(destinations).map(([type,d])=>{
          const aliases=[type,...Object.entries(entityAliases).filter(([,canonical])=>canonical===type).map(([alias])=>alias)];
          return `(${typeColumn} IN (${aliases.map(alias=>`'${alias}'`).join(',')}) AND NOT EXISTS(SELECT 1 FROM ${d.table} WHERE id=${row.table}.${idColumn}))`;
        }));
        if(row.table==='studio_media_attachments')conditions.push('NOT EXISTS(SELECT 1 FROM studio_media_assets WHERE id=studio_media_attachments.media_id)');
        return db.prepare(`DELETE FROM ${row.table} WHERE id=? AND (${conditions.join(' OR ')})`).bind(row.id);
      });
      const results=await db.batch(statements);removed+=results.reduce((sum,result)=>sum+result.meta.changes,0);
    }
    return reply({ok:true,removed,...await integrityScan(db)});
  }
  const managedDelete=url.pathname.match(/^\/api\/lifecycle\/managed\/([^/]+)$/);
  if(managedDelete&&request.method==='POST'){
    if(!admin)return reply({error:'Administrator permission required.'},403);
    const tables:Record<string,string>={collection:'studio_collections',tag:'studio_tags',template:'studio_field_templates',issue:'studio_continuity_issues',assignment:'studio_assignments',comment:'studio_review_comments',link:'studio_universal_links'};
    const table=tables[managedDelete[1]],body=await request.json() as {ids:string[]};
    if(!table||!Array.isArray(body.ids)||!body.ids.length||body.ids.length>100)return reply({error:'Choose 1–100 items from a supported management destination.'},400);
    const ids=[...new Set(body.ids.map(String))];
    for(const id of ids)if(!await db.prepare(`SELECT id FROM ${table} WHERE id=?`).bind(id).first())return reply({error:'An item no longer exists. Refresh before deleting.'},404);
    await db.batch(ids.map(id=>db.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id)));
    return reply({ok:true,count:ids.length,lifecycle:'deleted'});
  }
  if (url.pathname === '/api/lifecycle/records' && request.method === 'GET') {
    const state = url.searchParams.get('state') || 'archived';
    if(!['all','active','archived'].includes(state))return reply({error:'Invalid lifecycle filter.'},400);
    const typeFilter = url.searchParams.get('type');
    const rows = await Promise.all(Object.entries(destinations).filter(([type]) => !typeFilter || type === typeFilter).map(async ([type, d]) => {
      const lifecycle = state === 'all' ? '1=1' : state === 'active' ? 'archived_at IS NULL' : 'archived_at IS NOT NULL';
      const where = `WHERE ${lifecycle}${type==='character'&&!admin?' AND user_id=?':''}`;
      const statement=db.prepare(`SELECT id,${d.title} title,archived_at FROM ${d.table} ${where} ORDER BY ${d.title}`);
      const result = await (type==='character'&&!admin?statement.bind(user.id):statement).all();
      return result.results.map(r => ({ ...r, type, group: d.group, canDelete: admin }));
    }));
    return reply({ ok: true, records: rows.flat() });
  }
  const dependencies = url.pathname.match(/^\/api\/lifecycle\/dependencies\/([^/]+)\/([^/]+)$/);
  if (dependencies && request.method === 'GET') {
    const type = entityType(dependencies[1]);
    if (!type || !await resolveRecord(db, type, decodeURIComponent(dependencies[2]))) return reply({ error: 'Record no longer exists.' }, 404);
    return reply({ ok: true, dependencies: await recordDependencies(db, type, decodeURIComponent(dependencies[2])) });
  }
  if (url.pathname === '/api/lifecycle/bulk' && request.method === 'POST') {
    const body = await request.json() as { action: string; items: Array<{ type: string; id: string }> };
    if (!['archive', 'restore', 'delete'].includes(body.action) || !Array.isArray(body.items) || !body.items.length || body.items.length > 100) return reply({ error: 'Choose 1–100 records and a valid lifecycle action.' }, 400);
    if(body.items.some(item=>!item||typeof item.type!=='string'||typeof item.id!=='string'||!item.id))return reply({error:'Each item needs a canonical type and ID.'},400);
    if (body.action === 'delete' && !admin) return reply({ error: 'Administrator permission is required for permanent deletion.' }, 403);
    const unique = [...new Map(body.items.map(item => [`${item.type}:${item.id}`, item])).values()];
    const records = [];
    for (const item of unique) {
      const type = entityType(item.type);
      const live = type ? await resolveRecord(db, type, item.id) : null;
      if (!type || !live) return reply({ error: `Record no longer exists: ${item.type}:${item.id}. No actions were applied.` }, 404);
      if (type === 'character' && !admin && live.record.user_id !== user.id) return reply({ error: 'You may only change your own characters.' }, 403);
      records.push({ ...item, type });
    }
    const now = new Date().toISOString();
    await db.batch(records.map(item => {
      const d = destinations[item.type];
      return body.action === 'delete' ? db.prepare(`DELETE FROM ${d.table} WHERE id=?`).bind(item.id)
        : db.prepare(`UPDATE ${d.table} SET archived_at=?,updated_at=? WHERE id=?`).bind(body.action === 'archive' ? now : null, now, item.id);
    }));
    return reply({ ok: true, action: body.action, count: records.length, ids: records.map(r => r.id), lifecycle: body.action === 'delete' ? 'deleted' : body.action === 'archive' ? 'archived' : 'active' });
  }
  return reply({ error: 'Lifecycle route not found.' }, 404);
}

export async function recordDependencies(db: D1Database, type: string, id: string) {
  const tables = [
    ['Links', 'studio_universal_links', '(source_type=? AND source_id=?) OR (target_type=? AND target_id=?)', [type,id,type,id]],
    ['Story connections', 'studio_story_entity_links', '(story_entity_type=? AND story_entity_id=?) OR (linked_entity_type=? AND linked_entity_id=?)', [type,id,type,id]],
    ...['studio_favorites','studio_collection_items','studio_tag_assignments','studio_media_attachments','studio_assignments','studio_review_comments'].map(table => [table.replace('studio_', '').replace(/_/g,' '),table,'entity_type=? AND entity_id=?',[type,id]]),
  ] as Array<[string,string,string,string[]]>;
  const native:Record<string,Array<[string,string,string]>>={
    character:[['POV scenes','studio_story_scenes','pov_character_id'],['Character timeline events','studio_timeline_events','character_id'],['Character journeys (cascade delete)','studio_character_journey','character_id']],
    location:[['Child locations (detach)','studio_world_locations','parent_location_id'],['Location timeline events','studio_timeline_events','location_id'],['Location scenes','studio_story_scenes','location_id']],
    timeline:[['Scenes using this event','studio_story_scenes','timeline_event_id']],
    codex:[['Codex locations','studio_world_locations','codex_record_id'],['Codex timeline events','studio_timeline_events','codex_record_id']],
    story_project:[['Project arcs (cascade delete)','studio_story_arcs','project_id'],['Project chapters (cascade delete)','studio_story_chapters','project_id'],['Project scenes (cascade delete)','studio_story_scenes','project_id'],['Project plot beats (cascade delete)','studio_story_beats','project_id'],['Project journeys (cascade delete)','studio_character_journey','project_id']],
    story_arc:[['Arc chapters (detach)','studio_story_chapters','arc_id'],['Arc scenes (detach)','studio_story_scenes','arc_id'],['Arc plot beats (detach)','studio_story_beats','arc_id'],['Arc journeys (detach)','studio_character_journey','arc_id']],
    story_chapter:[['Chapter scenes (detach)','studio_story_scenes','chapter_id']],
    story_scene:[['Scene plot beats (detach)','studio_story_beats','scene_id'],['Scene journeys (detach)','studio_character_journey','scene_id']],
    media:[['Media attachments','studio_media_attachments','media_id']]
  };
  for(const [label,table,column]of native[type]||[])tables.push([label,table,column+'=?',[id]]);
  const result = await Promise.all(tables.map(async ([label, table, where, bindings]) => ({ label, count: Number((await db.prepare(`SELECT count(*) n FROM ${table} WHERE ${where}`).bind(...bindings).first<{n:number}>())?.n || 0) })));
  return result.filter(r => r.count);
}

export async function resolvePendingRelationships(db:D1Database,userId:string){
  const pending=await db.prepare(`SELECT * FROM studio_pending_relationships WHERE status='pending' ORDER BY created_at LIMIT 500`).all<Record<string,string>>();
  let resolved=0;
  for(const proposal of pending.results){
    const sourceType=entityType(proposal.source_type);
    const source=sourceType?await resolveRecord(db,sourceType,proposal.source_id):null;
    if(!sourceType||!source||source.record.archived_at)continue;
    const candidates:Array<{type:string;id:string}>=[];
    for(const [type,d]of Object.entries(destinations)){
      const rows=await db.prepare(`SELECT * FROM ${d.table} WHERE (id=? OR lower(trim(${d.title}))=lower(trim(?)) OR id IN (SELECT entity_id FROM studio_entity_slugs WHERE entity_type=? AND slug=?)) AND archived_at IS NULL`).bind(proposal.target_name,proposal.target_name,type,recordSlug(proposal.target_name)).all<Record<string,string>>();
      for(const row of rows.results){
        if(proposal.target_type){
          let semantic=type==='codex'?row.record_type:type;
          if(type==='database'){const recordType=await db.prepare('SELECT name,slug FROM studio_record_types WHERE id=?').bind(row.record_type_id).first<{name:string;slug:string}>();semantic=(recordType?.name||'')+' '+(recordType?.slug||'');}
          const norm=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
          if(!norm(semantic).includes(norm(proposal.target_type)))continue;
        }
        candidates.push({type,id:row.id});
      }
    }
    const exact=candidates.filter(candidate=>candidate.id===proposal.target_name);
    const matches=exact.length?exact:candidates;
    if(matches.length!==1)continue;
    const target=matches[0];
    const existing=await db.prepare(`SELECT id FROM studio_universal_links WHERE source_type=? AND source_id=? AND target_type=? AND target_id=? AND relation_label=?`).bind(proposal.source_type,proposal.source_id,target.type,target.id,proposal.relation_label).first();
    const writes=[db.prepare(`UPDATE studio_pending_relationships SET status='resolved',resolved_target_type=?,resolved_target_id=? WHERE id=?`).bind(target.type,target.id,proposal.id)];
    if(!existing)writes.unshift(db.prepare(`INSERT INTO studio_universal_links(id,source_type,source_id,target_type,target_id,relation_label,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),proposal.source_type,proposal.source_id,target.type,target.id,proposal.relation_label,userId,new Date().toISOString()));
    await db.batch(writes);resolved++;
  }
  return {resolved,pending:pending.results.length-resolved};
}

async function integrityScan(db:D1Database){
  const live=new Set<string>();
  for(const [type,d]of Object.entries(destinations)){const rows=await db.prepare(`SELECT id FROM ${d.table}`).all<{id:string}>();for(const row of rows.results)live.add(`${type}:${row.id}`);}
  const aliases:Record<string,string>={world:'codex',world_record:'codex',world_location:'location',event:'timeline',timeline_event:'timeline',project:'story_project',arc:'story_arc',chapter:'story_chapter',scene:'story_scene',beat:'story_beat'};
  const exists=(type:string,id:string)=>live.has(`${entityType(type)||aliases[type]||type}:${id}`);
  const orphans:Array<{table:string;id:string;reason:string}>=[];
  for(const table of ['studio_favorites','studio_collection_items','studio_tag_assignments','studio_media_attachments','studio_review_comments','studio_assignments']){
    const rows=await db.prepare(`SELECT id,entity_type,entity_id FROM ${table}`).all<{id:string;entity_type:string;entity_id:string}>();
    for(const row of rows.results)if(entityType(aliases[row.entity_type]||row.entity_type)&&!exists(row.entity_type,row.entity_id))orphans.push({table,id:row.id,reason:'Missing canonical record'});
  }
  for(const table of ['studio_universal_links','studio_story_entity_links']){
    const rows=await db.prepare(`SELECT * FROM ${table}`).all<Record<string,string>>();
    for(const row of rows.results){const sourceType=row.source_type||row.story_entity_type,targetType=row.target_type||row.linked_entity_type,sourceId=row.source_id||row.story_entity_id,targetId=row.target_id||row.linked_entity_id;if((entityType(aliases[sourceType]||sourceType)&&!exists(sourceType,sourceId))||(entityType(aliases[targetType]||targetType)&&!exists(targetType,targetId)))orphans.push({table,id:row.id,reason:'Broken relationship endpoint'});}
  }
  const missingMedia=await db.prepare('SELECT id FROM studio_media_attachments WHERE NOT EXISTS(SELECT 1 FROM studio_media_assets WHERE id=studio_media_attachments.media_id)').all<{id:string}>();
  for(const row of missingMedia.results)if(!orphans.some(item=>item.table==='studio_media_attachments'&&item.id===row.id))orphans.push({table:'studio_media_attachments',id:row.id,reason:'Missing media asset'});
  const identities=await db.prepare(`SELECT record_type_id,lower(trim(name)) name,count(*) count FROM studio_database_records WHERE archived_at IS NULL GROUP BY record_type_id,lower(trim(name)) HAVING count(*)>1`).all();
  const pending=await db.prepare(`SELECT * FROM studio_pending_relationships WHERE status='pending'`).all();
  return {orphan_count:orphans.length,orphans,duplicate_identities:identities.results,pending_relationships:pending.results};
}
