const fs=require('fs'),assert=require('assert/strict'),ts=require('../../node_modules/typescript'),vm=require('vm');
const root=require('path').resolve(__dirname,'../..'),checks=[];
const context=vm.createContext({});
for(const p of ['src/lib/recordSlug.ts','src/lib/structuredImport.ts'])vm.runInContext(ts.transpileModule(fs.readFileSync(root+'/'+p,'utf8').replace(/^import .*;\s*$/gm,'').replace(/export /g,''),{compilerOptions:{target:ts.ScriptTarget.ES2024}}).outputText,context);
const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS '+name)};
const block=(name,extra='')=>`=== UMBRA_RECORD_BEGIN ===\nNAME: ${name}\nTYPE: Cosmology\nDESTINATION: Database > Cosmology & Foundations\nSLUG: ${name.toLowerCase().replaceAll(' ','-')}\nCANON_STATUS: CANON\nIMPORT_ACTION: AUTO\nSUMMARY:\n${name} summary.\nNATURE:\n- Darkness given consciousness\nWARNINGS:\n- Aethelgard is not the Seventh World's name\nFUTURE_UNKNOWN_SECTION:\nPreserve this custom information.\n${extra}\n=== UMBRA_RECORD_END ===`;
async function api(path,method='GET',body,token='test-admin'){const response=await fetch('http://127.0.0.1:8787'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};}
async function main(){
 const source=['Umbra','Lumina','The Seventh World'].map(n=>block(n)).join('\n');const parsed=context.parseStructuredImport(source);
 check('Exactly three structured candidates',parsed.length===3&&parsed.map(r=>r.name).join('|')==='Umbra|Lumina|The Seventh World');
 check('Content headings and warnings never become candidates',parsed.every(r=>r.sections.NATURE.includes('Darkness')&&r.sections.WARNINGS.includes('Aethelgard')));
 check('Unknown sections and full source preserved',parsed.every(r=>r.sections.FUTURE_UNKNOWN_SECTION&&r.source.includes('UMBRA_RECORD_END')));
 check('Slug punctuation and apostrophes normalize',context.recordSlug("  The Seventh World's -- Dawn!! ")==='the-seventh-worlds-dawn');
 for(const source of ['=== UMBRA_RECORD_BEGIN ===\nNAME: Bad','=== UMBRA_RECORD_END ===','=== UMBRA_RECORD_BEGIN ===\n=== UMBRA_RECORD_BEGIN ===']){let blocked=false;try{context.parseStructuredImport(source)}catch{blocked=true}check('Malformed structured boundaries fail without candidates',blocked)}
 const entities=[['database','/api/world-database/records',{name:'Lifecycle Record',record_type_id:'cosmology'},'/api/world-database','records'],['codex','/api/world-records',{name:'Lifecycle Codex',record_type:'realm'},'/api/world-records','records'],['character','/api/characters',{name:'Lifecycle Character'},'/api/characters','characters'],['location','/api/locations',{name:'Lifecycle Location'},'/api/locations','locations'],['timeline','/api/timeline',{title:'Lifecycle Event'},'/api/timeline','events'],['story_project','/api/production/projects',{title:'Lifecycle Project'},'/api/production','projects'],['story_arc','/api/production/arcs',{title:'Lifecycle Arc'},'/api/production','arcs'],['story_chapter','/api/production/chapters',{title:'Lifecycle Chapter'},'/api/production','chapters'],['story_scene','/api/production/scenes',{title:'Lifecycle Scene'},'/api/production','scenes'],['story_beat','/api/production/beats',{title:'Lifecycle Beat'},'/api/production','beats'],['journey','/api/production/journey',{title:'Lifecycle Journey',character_id:'ezra'},'/api/production','journey'],['media','/api/world-database/media',{title:'Lifecycle Media',media_type:'audio',asset_url:'https://example.test/test.mp3'},'/api/world-database','media']];
 const items=[];
 for(const [type,path,payload]of entities){const result=await api(path,'POST',payload);check(type+' creates',result.status<300&&result.data.id);items.push({type,id:result.data.id});}
 let result=await api('/api/lifecycle/bulk','POST',{action:'archive',items});check('Bulk archive confirmed by backend',result.status===200&&result.data.count===items.length);
 result=await api('/api/lifecycle/records');check('Global archive includes every supported entity',items.every(x=>result.data.records.some(r=>r.type===x.type&&r.id===x.id)));
 result=await api('/api/navigation/search?q=Lifecycle');check('Archived records excluded from active search',result.data.results.length===0);
 for(let i=0;i<entities.length;i++){const [type,,payload,listing,key]=entities[i];const r=await api(listing);if(!['database','media'].includes(type))check(type+' archived hidden from active endpoint',!(r.data[key]||[]).some(x=>x.id===items[i].id));}
 result=await api('/api/lifecycle/bulk','POST',{action:'delete',items},'test-editor');check('Editor cannot bulk permanently delete',result.status===403);
 result=await api('/api/lifecycle/bulk','POST',{action:'archive',items:[{type:'character',id:'ezra'}]},'test-editor');check('Editor cannot archive another user character',result.status===403);
 result=await api('/api/imports/submit','POST',{path:'/api/world-database/records/'+items[0].id,method:'PUT',payload:{name:'Lifecycle Record'}});check('Archived import cannot silently resurrect record',result.status===409);
 result=await api('/api/lifecycle/bulk','POST',{action:'restore',items});check('Bulk restore confirmed',result.status===200);
 result=await api('/api/navigation/search?q=Lifecycle');check('Restored records searchable again',items.every(x=>result.data.results.some(r=>r.type===x.type&&r.id===x.id)));
 await api('/api/lifecycle/relationships','POST',{source_type:'database',source_id:items[0].id,label:'Creator Of',target:'Future Canon Target',type:'Cosmology'});
 result=await api('/api/lifecycle/health');check('Missing relationship remains a pending proposal',result.data.pending_relationships.some(r=>r.target_name==='Future Canon Target'));
 const target=await api('/api/world-database/records','POST',{name:'Future Canon Target',record_type_id:'cosmology'});
 await api('/api/lifecycle/relationships/resolve','POST',{});result=await api('/api/world-database');check('Pending relationship resolves to actual created ID',result.data.links.some(r=>r.target_id===target.data.id&&r.source_id===items[0].id));
 await api('/api/lifecycle/bulk','POST',{action:'delete',items});result=await api('/api/lifecycle/records?state=all');check('Deleted records absent from canonical lifecycle inventory',items.every(x=>!result.data.records.some(r=>r.id===x.id)));
 result=await api('/api/world-database');check('Deleted references are cleaned',!result.data.links.some(r=>r.source_id===items[0].id));
 result=await api('/api/lifecycle/cleanup','POST',{});check('Empty verified-orphan cleanup succeeds safely',result.status===200);
 fs.writeFileSync(__dirname+'/stabilization-api-results.json',JSON.stringify({passed:checks.length,checks},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
