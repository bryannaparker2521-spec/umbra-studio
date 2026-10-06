const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const deps=root+'/umbra-studio-cloud/node_modules';
const ts=require(root+'/node_modules/typescript');
const {Miniflare,convertV4MiniflareOptions}=require(deps+'/miniflare');
const schema=JSON.parse(fs.readFileSync(path.join(__dirname,'schema.json'),'utf8'));
async function main(){
 const out=path.join(__dirname,'stabilization-worker-test.mjs');
 const combined=[root+'/src/lib/recordSlug.ts',root+'/umbra-studio-cloud/src/navigation.ts',root+'/umbra-studio-cloud/src/lifecycle.ts',root+'/umbra-studio-cloud/src/index.ts'].map(p=>fs.readFileSync(p,'utf8').replace(/^import .*;\s*$/gm,'').replace(/export (?=(?:async )?function|const|type)/g,'')).join('\n');
 fs.writeFileSync(out,ts.transpileModule(combined,{compilerOptions:{target:ts.ScriptTarget.ES2024,module:ts.ModuleKind.ESNext}}).outputText);
 const mf=new Miniflare(convertV4MiniflareOptions({name:'umbra-test',modules:true,scriptPath:out,compatibilityDate:'2026-09-26',d1Databases:{umbra_studio_production:'local-test-db'},r2Buckets:['umbra_studio_media'],port:8787,host:'127.0.0.1'}));
 const db=await mf.getD1Database('umbra_studio_production');
 for(const sql of schema)await db.prepare(sql).run();
 const migration=fs.readFileSync(root+'/umbra-studio-cloud/0014_stabilization_lifecycle.sql','utf8');
 const triggers=migration.match(/CREATE TRIGGER[\s\S]+?END;/g)||[];
 for(const sql of migration.replace(/CREATE TRIGGER[\s\S]+?END;/g,'').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 for(const sql of triggers)await db.prepare(sql).run();
 const now=new Date().toISOString();
 for(const [id,role] of [['test-admin','primary_admin'],['test-editor','editor']]){
  await db.prepare('INSERT INTO studio_users(id,email,display_name,auth_status) VALUES(?,?,?,?)').bind(id,id+'@example.test',id,'active').run();
  await db.prepare('INSERT INTO studio_admin_members(user_id,role) VALUES(?,?)').bind(id,role).run();
  await db.prepare('INSERT INTO studio_auth_sessions(id,user_id,token_hash,created_at,expires_at,last_seen_at) VALUES(?,?,?,?,?,?)').bind(id,id,crypto.createHash('sha256').update(id).digest('hex'),now,'2099-01-01T00:00:00.000Z',now).run();
 }
 await db.prepare("INSERT INTO studio_record_types(id,slug,name) VALUES('cosmology','cosmology','Cosmology & Foundations')").run();
 await db.prepare("INSERT INTO studio_record_types(id,slug,name) VALUES('general-lore','lore','General Lore')").run();
 await db.prepare("INSERT INTO studio_record_types(id,slug,name) VALUES('magic','magic','Powers & Magic')").run();
 await db.prepare("INSERT INTO studio_characters(id,user_id,name,identity,origin_lore,is_complete) VALUES('ezra','test-admin','Ezra',?, ?,1)").bind(JSON.stringify({summary:'Ezra is a traveler.'}),JSON.stringify({backstory:'Ezra crossed the Seventh World.\n\nHe returned to Moltenmaw Caverns.'})).run();
 // Intentional stale relationship represents the production wipe.
 await db.prepare("INSERT INTO studio_favorites(id,user_id,entity_type,entity_id) VALUES('stale','test-admin','location','deleted-location')").run();
 console.log('LOCAL_TEST_READY '+await mf.ready);
 process.on('SIGINT',async()=>{await mf.dispose();process.exit(0)});
 setInterval(()=>{},1000);
}
main().catch(e=>{console.error(e);process.exit(1)});
