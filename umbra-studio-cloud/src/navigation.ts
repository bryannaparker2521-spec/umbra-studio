import { recordSlug } from '../../src/lib/recordSlug';

// Only these canonical systems may be resolved or searched. Never use client table names.
export const destinations = {
  character: { table: 'studio_characters', title: 'name', path: '/api/characters', group: 'Characters' },
  codex: { table: 'studio_world_records', title: 'name', path: '/api/world-records', group: 'World' },
  location: { table: 'studio_world_locations', title: 'name', path: '/api/locations', group: 'World' },
  timeline: { table: 'studio_timeline_events', title: 'title', path: '/api/timeline', group: 'World' },
  database: { table: 'studio_database_records', title: 'name', path: '/api/world-database/records', group: 'Database' },
  story_project: { table: 'studio_story_projects', title: 'title', path: '/api/production/projects', group: 'Story' },
  story_arc: { table: 'studio_story_arcs', title: 'title', path: '/api/production/arcs', group: 'Story' },
  story_chapter: { table: 'studio_story_chapters', title: 'title', path: '/api/production/chapters', group: 'Story' },
  story_scene: { table: 'studio_story_scenes', title: 'title', path: '/api/production/scenes', group: 'Story' },
  story_beat: { table: 'studio_story_beats', title: 'title', path: '/api/production/beats', group: 'Story' },
  media: { table: 'studio_media_assets', title: 'title', path: '/api/world-database/media', group: 'Media' },
  journey: { table: 'studio_character_journey', title: 'title', path: '/api/production/journey', group: 'Story' },
} as const;
export type EntityType = keyof typeof destinations;
export const entityAliases:Record<string,EntityType>={world:'codex',world_record:'codex',world_location:'location',event:'timeline',timeline_event:'timeline',database_record:'database',world_database:'database',project:'story_project',arc:'story_arc',chapter:'story_chapter',scene:'story_scene',beat:'story_beat',character_journey:'journey',media_asset:'media'};
export function entityType(value: string): EntityType | null {
  return Object.prototype.hasOwnProperty.call(destinations, value) ? value as EntityType : entityAliases[value]||null;
}
export async function resolveRecord(db: D1Database, type: EntityType, id: string) {
  const d = destinations[type];
  const row = await db.prepare(`SELECT * FROM ${d.table} WHERE id=?`).bind(id).first<Record<string, unknown>>();
  if (!row) return null;
  for (const key of ['identity', 'appearance', 'origin_lore', 'abilities', 'relationships', 'media', 'lore_details', 'details', 'tags', 'import_metadata']) {
    if (typeof row[key] === 'string') { try { row[key] = JSON.parse(row[key] as string); } catch { /* Preserve legacy text. */ } }
  }
  return { type, id, title: String(row[d.title]), group: d.group, record: row };
}
export async function cleanFavorites(db: D1Database, userId: string) {
  await db.batch([
    db.prepare(`DELETE FROM studio_favorites WHERE user_id=? AND entity_type IN ('location','world_location') AND NOT EXISTS (SELECT 1 FROM studio_world_locations WHERE id=studio_favorites.entity_id AND archived_at IS NULL)`).bind(userId),
    db.prepare(`DELETE FROM studio_favorites WHERE user_id=? AND entity_type IN ('event','timeline','timeline_event') AND NOT EXISTS (SELECT 1 FROM studio_timeline_events WHERE id=studio_favorites.entity_id)`).bind(userId),
    ...Object.entries(destinations).map(([type, d]) => {const types=[type,...Object.entries(entityAliases).filter(([,canonical])=>canonical===type).map(([alias])=>alias)];return db.prepare(`DELETE FROM studio_favorites WHERE user_id=? AND entity_type IN (${types.map(()=>'?').join(',')}) AND NOT EXISTS (SELECT 1 FROM ${d.table} WHERE id=studio_favorites.entity_id AND archived_at IS NULL)`).bind(userId,...types);}),
  ]);
}
export async function searchRecords(db: D1Database, query: string) {
  const results = await Promise.all(Object.entries(destinations).map(async ([type, d]) => {
    const active = 'AND archived_at IS NULL';
    const term=query.slice(0,160);
    const statement=type==='database'?db.prepare(`SELECT r.id,r.name title FROM studio_database_records r JOIN studio_record_types t ON t.id=r.record_type_id WHERE (instr(lower(r.name),lower(?))>0 OR instr(lower(t.name),lower(?))>0) AND r.archived_at IS NULL ORDER BY r.name LIMIT 25`).bind(term,term):db.prepare(`SELECT id,${d.title} title FROM ${d.table} WHERE instr(lower(${d.title}),lower(?))>0 ${active} ORDER BY ${d.title} LIMIT 25`).bind(term);
    const rows=await statement.all<{id:string;title:string}>();
    return rows.results.map(row => ({ ...row, type, group: d.group }));
  }));
  return results.flat();
}
export async function importResults(db: D1Database, userId: string) {
  const rows = await db.prepare(`SELECT i.*,r.reviewed_at FROM studio_import_results i LEFT JOIN studio_import_reviews r ON r.import_id=i.id AND r.user_id=? AND r.reviewed_at>=i.imported_at ORDER BY i.imported_at DESC LIMIT 500`).bind(userId).all<Record<string, unknown>>();
  // One query per destination rather than one query per imported item.
  const liveByKey = new Map<string, { title: string; archived: boolean; group: string }>();
  await Promise.all(Object.entries(destinations).map(async ([type, d]) => {
    const ids = rows.results.filter(row => row.entity_type === type).map(row => String(row.entity_id));
    for (let offset = 0; offset < ids.length; offset += 80) {
      const page = ids.slice(offset, offset + 80);
      const archive = 'archived_at';
      const live = await db.prepare(`SELECT id,${d.title} title,${archive} archived_at FROM ${d.table} WHERE id IN (${page.map(() => '?').join(',')})`).bind(...page).all<{id:string;title:string;archived_at:string|null}>();
      for (const record of live.results) liveByKey.set(`${type}:${record.id}`, { title: record.title, archived: Boolean(record.archived_at), group: d.group });
    }
  }));
  return rows.results.map(row => { const live=liveByKey.get(`${row.entity_type}:${row.entity_id}`); return {...row,live:Boolean(live),group:live?.group,title:live?.title||row.title,archived:live?.archived||false}; });
}

/** Delegate writes to the existing canonical handlers, after live existence and slug checks. */
export async function submitImport(
  request: Request, db: D1Database, userId: string,
  dispatch: (request: Request) => Promise<Response>,
): Promise<Response> {
  const b = await request.json() as { path: string; method: string; payload: Record<string, unknown>; slug?: string; batch?: string };
  const match = Object.entries(destinations).find(([, d]) => b.path === d.path || b.path.startsWith(d.path + '/'));
  if (!match || !['POST', 'PUT', 'PATCH'].includes(b.method)) return Response.json({ error: 'Unsupported import destination.' }, { status: 400 });
  const [type, d] = match;
  const id = b.path === d.path ? '' : decodeURIComponent(b.path.slice(d.path.length + 1));
  if ((b.method === 'POST' && id) || (b.method !== 'POST' && !id) || id.includes('/')) return Response.json({ error: 'Invalid import destination.' }, { status: 400 });
  const destinationRecord = id ? await resolveRecord(db, type as EntityType, id) : null;
  if (destinationRecord?.record.archived_at && b.payload.archived_at !== null) return Response.json({ error: 'ARCHIVED MATCH. Explicitly restore before updating.' }, { status: 409 });
  if (id && !destinationRecord) return Response.json({ error: 'RECORD DOES NOT EXIST. Analyze again to create a new record.' }, { status: 404 });
  const title = String(b.payload[d.title] || '');
  let reservation = '';
  let slug = '';
  if (!id) {
    slug = recordSlug(b.slug || title);
    if (!slug) return Response.json({ error: 'A record name and valid slug are required.' }, { status: 400 });
    // Account for existing records predating the registry, including archived records.
    const names = await db.prepare(`SELECT ${d.title} title FROM ${d.table}`).all<{ title: string }>();
    if (names.results.some(row => recordSlug(row.title) === slug)) return Response.json({ error: 'This slug belongs to an existing record. Choose a different slug or update that record.' }, { status: 409 });
    reservation = crypto.randomUUID();
    try {
      await db.prepare(`INSERT INTO studio_entity_slugs(entity_type,slug,entity_id) VALUES(?,?,?)`).bind(type, slug, reservation).run();
    } catch { return Response.json({ error: 'That slug is already in use. Review the slug before creating.' }, { status: 409 }); }
  }
  const url = new URL(request.url); url.pathname = b.path; url.search = '';
  let response: Response;
  try {
    response = await dispatch(new Request(url, { method: b.method, headers: request.headers, body: JSON.stringify(b.payload) }));
  } catch (error) {
    if (reservation) await db.prepare(`DELETE FROM studio_entity_slugs WHERE entity_id=?`).bind(reservation).run();
    throw error;
  }
  const result = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    if (reservation) await db.prepare(`DELETE FROM studio_entity_slugs WHERE entity_id=?`).bind(reservation).run();
    return Response.json(result, { status: response.status });
  }
  const savedId = String(result.id || id);
  const live = savedId ? await resolveRecord(db, type as EntityType, savedId) : null;
  if (!live) return Response.json({ error: 'Import did not return a live canonical record ID.' }, { status: 500 });
  // A metadata-enrichment PUT in the same batch must not relabel a creation as an update.
  const previous = await db.prepare(`SELECT id,action,batch_id FROM studio_import_results WHERE entity_type=? AND entity_id=?`).bind(type, savedId).first<{ id: string; action: string; batch_id: string }>();
  const action = !id || (previous?.batch_id === b.batch && previous?.action === 'created') ? 'created' : 'updated';
  const importId = previous?.id || crypto.randomUUID();
  const statements = [db.prepare(`INSERT INTO studio_import_results(id,entity_type,entity_id,title,action,imported_at,imported_by,batch_id,category) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(entity_type,entity_id) DO UPDATE SET title=excluded.title,action=excluded.action,imported_at=excluded.imported_at,imported_by=excluded.imported_by,batch_id=excluded.batch_id,category=excluded.category`).bind(importId, type, savedId, live.title, action, new Date().toISOString(), userId, b.batch || '', String(live.record.record_type_id || live.record.record_type || type))];
  if (reservation) statements.unshift(db.prepare(`UPDATE studio_entity_slugs SET entity_id=? WHERE entity_type=? AND slug=? AND entity_id=?`).bind(savedId, type, slug, reservation));
  if(destinationRecord?.record.archived_at && b.payload.archived_at===null)statements.unshift(db.prepare(`UPDATE ${d.table} SET archived_at=NULL,updated_at=? WHERE id=?`).bind(new Date().toISOString(),savedId));
  await db.batch(statements);
  return Response.json({ ...result, id: savedId, action, import_id: importId, entity_type: type, slug: slug || null }, { status: response.status });
}
