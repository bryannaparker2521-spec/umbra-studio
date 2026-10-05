const assert=require('node:assert/strict');const fs=require('node:fs');
const base='http://127.0.0.1:8787';const checks=[];
async function api(path,method='GET',body,token='test-admin'){
 const response=await fetch(base+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();return {status:response.status,data};
}
function check(name,condition){assert.ok(condition,name);checks.push(name);console.log('PASS '+name);}
async function run(){
 let r=await api('/api/explorer');check('Existing stale favorite rows are removed on load',r.status===200&&r.data.favorites.length===0);
 r=await api('/api/explorer/favorite','PUT',{item_type:'location',item_id:'deleted-location',enabled:true});check('Cannot favorite a deleted record',r.status===404);
 r=await api('/api/production/scenes/deleted','PATCH',{title:'Missing'});check('Missing Production update returns 404',r.status===404);
 const types=[['database','/api/world-database/records',{record_type_id:'cosmology',name:'Lumina',summary:'Complete paragraph one.\n\nComplete paragraph two.',details:{overview:'The light.'}}],['codex','/api/world-records',{record_type:'religion',name:'The Sacred Faith',description:'Faith lore.'}],['location','/api/locations',{name:'Moltenmaw Caverns',location_type:'cave',description:'Cavern lore.'}],['timeline','/api/timeline',{title:'The Founding',description:'History lore.'}],['story_project','/api/production/projects',{title:'The Seventh World',summary:'Project lore.'}],['story_arc','/api/production/arcs',{title:'The Ashen Son',summary:'Arc lore.'}],['story_chapter','/api/production/chapters',{title:'Chapter Eight',body_notes:'Full chapter.\n\nThe final line.',source_text:'Full chapter.\n\nThe final line.'}],['story_scene','/api/production/scenes',{title:'Into the Caverns',body_notes:'Full scene text.'}],['story_beat','/api/production/beats',{title:'A Revelation',description:'Beat lore.'}]];
 const ids={};
 for(const [type,path,payload] of types){r=await api('/api/imports/submit','POST',{path,method:'POST',payload,batch:'fixture-create'});check(type+' create captures live canonical ID',r.status===201&&r.data.id&&r.data.action==='created');ids[type]=r.data.id;const open=await api('/api/navigation/records/'+type+'/'+ids[type]);check(type+' ID resolves in original system',open.status===200&&open.data.record.id===ids[type]);}
 r=await api('/api/imports');check('Created history persists with all destination IDs',r.data.results.length===9&&r.data.results.every(x=>x.live&&x.action==='created'&&!x.reviewed_at));
 const lumina=r.data.results.find(x=>x.entity_type==='database');
 await api('/api/imports/'+lumina.id+'/review','PUT',{reviewed:true});
 r=await api('/api/imports');check('Review clears only that record',r.data.results.filter(x=>x.reviewed_at).length===1);
 r=await api('/api/imports','GET',undefined,'test-editor');check('Review is specific to the signed-in user',r.data.results.every(x=>!x.reviewed_at));
 r=await api('/api/imports/submit','POST',{path:'/api/world-database/records/'+ids.database,method:'PUT',payload:{name:'Lumina',summary:'Updated complete source.'},batch:'fixture-update'});check('Existing canonical update reports updated',r.status===200&&r.data.action==='updated');
 r=await api('/api/imports');check('Updated import needs review again',!r.data.results.find(x=>x.entity_type==='database').reviewed_at);
 r=await api('/api/imports/submit','POST',{path:'/api/world-database/records',method:'POST',payload:{name:'Lumina',record_type_id:'cosmology'},batch:'duplicate'});check('Duplicate slug collision is blocked',r.status===409);
 r=await api('/api/imports/submit','POST',{path:'/api/world-database/records/deleted',method:'PUT',payload:{name:'Missing'},batch:'missing'});check('Import never calls a missing record updated',r.status===404);
 r=await api('/api/navigation/search?q=Lumina');check('Global search returns the live actual ID',r.data.results.some(x=>x.id===ids.database&&x.type==='database'));
 await api('/api/explorer/favorite','PUT',{item_type:'location',item_id:ids.location,enabled:true});
 await api('/api/world-database/links','POST',{source_type:'location',source_id:ids.location,target_type:'character',target_id:'ezra',relation_label:'visited'});
 r=await api('/api/locations/'+ids.location,'DELETE',undefined,'test-editor');check('Editor cannot permanently delete a location',r.status===403);
 await api('/api/locations/'+ids.location,'DELETE');
 r=await api('/api/explorer');check('Deleting removes Favorites relationship',r.data.favorites.length===0);
 r=await api('/api/world-database');check('Deleting removes universal links',r.data.links.every(x=>x.source_id!==ids.location&&x.target_id!==ids.location));
 r=await api('/api/imports');check('Deleted import cannot remain an openable history item',r.data.results.every(x=>x.entity_id!==ids.location));
 r=await api('/api/navigation/records/location/'+ids.location);check('Deleted record no longer resolves',r.status===404);
 r=await api('/api/navigation/search?q=Moltenmaw');check('Deleted record absent from global search',r.data.results.length===0);
 for(const type of ['story_scene','story_beat']){const path=types.find(x=>x[0]===type)[1];r=await api(path+'/'+ids[type],'DELETE');check(type+' v1.2.1 delete still works',r.status===200);}
 // Recreate useful fixture records for the browser pass.
 await api('/api/locations','POST',{name:'Moltenmaw Caverns',description:'Cavern lore.',location_type:'cave'});
 await api('/api/production/scenes','POST',{title:'Into the Caverns',body_notes:'Full scene text.'});
 await api('/api/production/beats','POST',{title:'A Revelation',description:'Beat lore.'});
 fs.writeFileSync(__dirname+'/api-test-results.json',JSON.stringify({passed:checks.length,checks,ids},null,2));
}
run().catch(e=>{console.error(e);process.exit(1)});
