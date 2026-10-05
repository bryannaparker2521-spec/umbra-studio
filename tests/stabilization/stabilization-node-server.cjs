// Actual Worker handlers against a real, disposable SQLite database. No production writes.
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite');
const root=require('path').resolve(__dirname,'../..');
const ts=require(root+'/node_modules/typescript');
async function main(){
 const files=['src/lib/recordSlug.ts','umbra-studio-cloud/src/navigation.ts','umbra-studio-cloud/src/lifecycle.ts','umbra-studio-cloud/src/index.ts'];
 const combined=files.map(p=>fs.readFileSync(path.join(root,p),'utf8').replace(/^import .*;\s*$/gm,'').replace(/export (?=(?:async )?function|const|type)/g,'')).join('\n');
 const output=path.join(__dirname,'node-worker.mjs');fs.writeFileSync(output,ts.transpileModule(combined,{compilerOptions:{target:ts.ScriptTarget.ES2024,module:ts.ModuleKind.ESNext}}).outputText);
 const sqlite=new DatabaseSync(':memory:');
 for(const sql of JSON.parse(fs.readFileSync(path.join(__dirname,'schema.json'),'utf8')))sqlite.exec(sql);
 sqlite.exec(fs.readFileSync(root+'/umbra-studio-cloud/0014_stabilization_lifecycle.sql','utf8'));
 const db={prepare(sql){let bindings=[];const stmt=sqlite.prepare(sql);return {bind(...args){bindings=args.map(x=>x===undefined?null:x);return this},async first(column){const row=stmt.get(...bindings);return column?row?.[column]??null:row??null},async all(){return {success:true,results:stmt.all(...bindings),meta:{changes:0}}},async run(){const r=stmt.run(...bindings);return {success:true,results:[],meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}}}}},async batch(statements){sqlite.exec('BEGIN');try{const r=[];for(const stmt of statements)r.push(await stmt.run());sqlite.exec('COMMIT');return r}catch(e){sqlite.exec('ROLLBACK');throw e}}};
 const now=new Date().toISOString();
 for(const [id,role]of [['test-admin','primary_admin'],['test-editor','editor']]){
 await db.prepare('INSERT INTO studio_users(id,email,display_name,auth_status) VALUES(?,?,?,?)').bind(id,id+'@example.test',id,'active').run();
 await db.prepare('INSERT INTO studio_admin_members(user_id,role) VALUES(?,?)').bind(id,role).run();
 await db.prepare('INSERT INTO studio_auth_sessions(id,user_id,token_hash,created_at,expires_at,last_seen_at) VALUES(?,?,?,?,?,?)').bind(id,id,crypto.createHash('sha256').update(id).digest('hex'),now,'2099-01-01T00:00:00.000Z',now).run();}
 for(const [id,slug,name]of [['cosmology','cosmology','Cosmology & Foundations'],['general-lore','lore','General Lore'],['magic','magic','Powers & Magic']])await db.prepare('INSERT INTO studio_record_types(id,slug,name) VALUES(?,?,?)').bind(id,slug,name).run();
 await db.prepare("INSERT INTO studio_characters(id,user_id,name,identity,origin_lore,is_complete) VALUES('ezra','test-admin','Ezra',?, ?,1)").bind(JSON.stringify({summary:'Ezra is a traveler.'}),JSON.stringify({backstory:'Ezra crossed the Seventh World.'})).run();
 await db.prepare("INSERT INTO studio_favorites(id,user_id,entity_type,entity_id) VALUES('stale','test-admin','location','deleted-location')").run();
 const media=new Map();const bucket={async put(key,body,options){const bytes=Buffer.from(await new Response(body).arrayBuffer());media.set(key,{bytes,...options});},async get(key){const item=media.get(key);return item?{body:item.bytes,httpMetadata:item.httpMetadata||{},writeHttpMetadata(headers){for(const [k,v]of Object.entries(item.httpMetadata||{}))if(k==='contentType')headers.set('Content-Type',v)}}:null},async delete(key){media.delete(key)}};
 const worker=(await import('file:///'+output.replace(/\\/g,'/'))).default;
 http.createServer(async(req,res)=>{try{const parts=[];for await(const chunk of req)parts.push(chunk);const body=Buffer.concat(parts);const request=new Request('http://127.0.0.1:8787'+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{} )});const response=await worker.fetch(request,{umbra_studio_production:db,umbra_studio_media:bucket},{waitUntil(p){p.catch(console.error)}});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){console.error(e.message);res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}}).listen(8787,'127.0.0.1',()=>console.log('SQLITE_WORKER_READY http://127.0.0.1:8787'));
}
main().catch(e=>{console.error(e);process.exit(1)});
