const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
const checks=[];const errors=[];
async function main(){
 const cleanupResponse=await fetch('http://127.0.0.1:8787/api/lifecycle/records?state=all',{headers:{Authorization:'Bearer test-admin'}});const cleanupRows=(await cleanupResponse.json()).records.filter(r=>r.title==='Reader Lore'||/^Fixture .* Final$/.test(r.title));if(cleanupRows.length)await fetch('http://127.0.0.1:8787/api/lifecycle/bulk',{method:'POST',headers:{Authorization:'Bearer test-admin','Content-Type':'application/json'},body:JSON.stringify({action:'delete',items:cleanupRows.map(({type,id})=>({type,id}))})});

 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {})});
 const context=await browser.newContext({viewport:{width:1024,height:700}});
 await context.addInitScript(()=>{
  localStorage.setItem('umbra-studio-auth-token','test-admin');localStorage.setItem('umbra-studio-auth-user',JSON.stringify({id:'test-admin',email:'test-admin@example.test',displayName:'Test Admin',role:'primary_admin'}));
  window.__speechLog=[];
  window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;this.rate=1;this.voice=null;}};
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Installed English Natural',lang:'en-US',voiceURI:'test-natural',localService:true,default:true}],addEventListener(){},removeEventListener(){},cancel(){window.__speechLog.push({action:'cancel'})},speak(u){window.__speechLog.push({action:'speak',text:u.text,rate:u.rate,voice:u.voice?.name})},pause(){window.__speechLog.push({action:'pause'})},resume(){window.__speechLog.push({action:'resume'})}},configurable:true});
 });
 await context.route('https://umbra-studio-cloud.bryannaparker2521-d60.workers.dev/**',async route=>{
  try{const response=await route.fetch({maxRetries:route.request().method()==='GET'?3:0,url:route.request().url().replace('https://umbra-studio-cloud.bryannaparker2521-d60.workers.dev','http://127.0.0.1:8787')});await route.fulfill({response});}catch(e){console.error(e);await route.abort();}
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:1420/');
 await page.getByRole('button',{name:'⌂ Dashboard',exact:true}).waitFor();
 console.log('INITIAL '+(await page.locator('body').innerText()).slice(0,400));
 const nav=page.locator('.practical-sidebar');
 const check=(name,condition=true)=>{assert.ok(condition,name);checks.push(name);console.log('PASS '+name)};
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 async function clickNav(name){await nav.getByRole('button',{name:new RegExp('^'+escape(name)+'(?: Imported information needs review)?$')}).click();await page.waitForTimeout(150);}
 async function expand(name){const b=nav.getByRole('button',{name:new RegExp('^[▾▸] '+escape(name)+'(?: Imported information needs review)?$')});if(await b.getAttribute('aria-expanded')==='false')await b.click();}
 await expand('World');await expand('Story');await expand('Characters');await expand('Database');
 const api=async(path,method='GET',body)=>{const r=await fetch('http://127.0.0.1:8787'+path,{method,headers:{Authorization:'Bearer test-admin','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return await r.json();};
 const created=await api('/api/world-database/records','POST',{name:'Reader Lore',record_type_id:'cosmology',summary:'Updated complete source.',details:{paragraph:'Full reader lore.'}});const fixture={ids:{database:created.id}};
 await api('/api/world-database/links','POST',{source_type:'database',source_id:fixture.ids.database,target_type:'character',target_id:'ezra',relation_label:'connected to'});
 await clickNav('Records');await page.locator('.database-record-card').filter({has:page.locator('h3').filter({hasText:/^Reader Lore(?: |$)/})}).getByRole('button',{name:'Open Record',exact:true}).click();await page.locator('.record-editor-panel').waitFor();
 await page.locator('.record-editor-panel').getByRole('button').filter({hasText:'connected to'}).first().click();await page.getByRole('heading',{name:'Ezra',exact:true}).waitFor();
 await page.locator('.practical-utilities').getByRole('button',{name:'← Back',exact:true}).click();await page.locator('.record-editor-panel').waitFor();check('Back restores the exact lore record after following a character connection',(await page.locator('.record-editor-head').innerText()).includes('Reader Lore'));
 await page.locator('.record-editor-panel').getByRole('button',{name:'🔊 Read',exact:true}).click();check('Database reader uses lore prose',(await page.evaluate(()=>window.__speechLog)).some(x=>x.action==='speak'&&x.text.includes('Updated complete source')));
 await page.getByRole('button',{name:'Close Without Saving',exact:true}).click();
 await clickNav('Smart Ingest / Import');
 const raw='# Transfer Package\nTITLE: Synthetic canon export\nSOURCE: Test conversation\n\n## Cosmology — Aurora\n### Summary\nAurora embodies light and creation.\n### Nature\nA complete first entity source.\n### Warnings\nA warning is a field, not a record.\n\n## Cosmology — Noctis\n### Summary\nNoctis embodies darkness and creation.\n### Nature\nA complete second entity source.';
 await page.locator('.import-editor').fill(raw);await page.getByRole('button',{name:'Analyze Import',exact:true}).click();await page.getByRole('textbox',{name:'Record name for section 2',exact:true}).waitFor();check('Raw ChatGPT export yields two real entity candidates',await page.getByRole('textbox',{name:/Record name for section/}).count()===2);check('Container and field headings retained without fake records',await page.locator('.smart-source-reader').allTextContents().then(values=>values.join(' ').includes('warning is a field')));
 await clickNav('Smart Ingest / Import');
 const manuscript='# BOOK — Fixture Saga Final\nProject summary.\n\n# ARC — Fixture Arc Final\nArc summary.\n\n# CHAPTER 8 — Fixture Manuscript Final\nEzra walks into Moltenmaw Caverns.\nCHAPTER SENTINEL.\n\n# SCENE 1 — Fixture Scene Final\nPOV: Ezra\nEzra sees the cave.\nSCENE SENTINEL.\n\n# BEAT — Fixture Revelation Final\nA discovery changes Ezra.';
 await page.locator('.import-editor').fill(manuscript);await page.getByRole('button',{name:'Analyze Import',exact:true}).click();await page.getByRole('button',{name:'Create / Submit Selected Sections',exact:true}).waitFor();await page.getByRole('button',{name:'Create / Submit Selected Sections',exact:true}).click();await page.getByText(/Smart Ingest manuscript routing complete:.*5 created/).waitFor();check('Wiped-database manuscript import reports created, never fictitious updates');
 const production=await api('/api/production');const chapter=production.chapters.find(x=>x.title==='Fixture Manuscript Final');const scene=production.scenes.find(x=>x.title==='Fixture Scene Final');check('Manuscript retains full chapter and scene text',chapter.source_text.includes('CHAPTER SENTINEL')&&scene.body_notes.includes('SCENE SENTINEL'));
 check('Recognized character appearance links retained',production.links.some(x=>x.story_entity_id===chapter.id&&x.linked_entity_id==='ezra'));
 await clickNav('Chapters / Episodes');await page.locator('.v9-openable-story-card').filter({hasText:'Fixture Manuscript Final'}).getByRole('button',{name:/Inspect|Open Record/}).first().click();await page.locator('.v9-story-inspector').waitFor();await page.getByRole('button',{name:'🔊 Read Manuscript',exact:true}).click();check('Chapter narrator uses complete manuscript',(await page.evaluate(()=>window.__speechLog)).filter(x=>x.action==='speak').at(-1).text.includes('CHAPTER SENTINEL'));
 check('Story breadcrumbs follow actual ownership',(await page.locator('.studio-breadcrumbs').innerText()).includes('Fixture Saga Final')&&(await page.locator('.studio-breadcrumbs').innerText()).includes('Fixture Arc Final'));
 await page.locator('.v9-story-inspector header').getByRole('button',{name:'×',exact:true}).click();
 await clickNav('Scenes');await page.locator('.v9-openable-story-card').filter({hasText:'Fixture Scene Final'}).getByRole('button',{name:/Inspect|Open Record/}).first().click();await page.locator('.v9-story-inspector').waitFor();await page.getByRole('button',{name:'🔊 Read Manuscript',exact:true}).click();check('Scene narrator uses full scene body',(await page.evaluate(()=>window.__speechLog)).filter(x=>x.action==='speak').at(-1).text.includes('SCENE SENTINEL'));
 await page.locator('.v9-story-inspector header').getByRole('button',{name:'×',exact:true}).click();
 await clickNav('Story Graph');await page.getByRole('button',{name:'Select Fixture Manuscript Final',exact:true}).click();await page.getByRole('button',{name:'🔊 Read Node',exact:true}).click();check('Graph narrator describes selected node',(await page.evaluate(()=>window.__speechLog)).filter(x=>x.action==='speak').at(-1).text.includes('Fixture Manuscript Final'));
 await clickNav('Family Tree');await page.keyboard.press('Control+k');await page.getByRole('dialog',{name:'Find a record'}).waitFor();check('Global search available inside Family Tree');await page.keyboard.press('Escape');
 await clickNav('All Characters');await page.getByRole('button',{name:'View Profile',exact:true}).first().click();await page.getByRole('heading',{name:'Story Appearances',exact:true}).waitFor();check('Character Story Appearances preserved',(await page.locator('.profile-content').innerText()).includes('Fixture Manuscript Final'));
 // Existing selection controls remain operational; delete the local fixture Scene only.
 await clickNav('Scenes');const sceneCard=page.locator('.v9-openable-story-card').filter({hasText:'Fixture Scene Final'});await sceneCard.getByRole('checkbox').check();await page.getByRole('button',{name:/Delete Selected \(1\)/}).click();await sceneCard.waitFor({state:'detached'});check('v1.2.1 multi-select delete remains functional');
 await clickNav('Plot Beats');await page.getByRole('checkbox',{name:'Select All',exact:true}).check();await page.getByRole('button',{name:'Clear Selection',exact:true}).click();check('Select All and Clear Selection still work',await page.getByRole('button',{name:/Delete Selected/}).isDisabled());
 await clickNav('Recently Imported');await page.screenshot({path:__dirname+'/final-imports-1024.png',fullPage:false});
 await page.screenshot({path:__dirname+'/final-navigation-1024.png',fullPage:true});
 check('No uncaught frontend errors',errors.length===0);
 fs.writeFileSync(__dirname+'/advanced-browser-test-results.json',JSON.stringify({passed:checks.length,checks,errors},null,2));
 await browser.close();
}
main().catch(e=>{console.error(e);process.exit(1)});
