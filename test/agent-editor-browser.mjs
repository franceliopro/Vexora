import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const fixture={id:41,name:'Rastreabem · atendimento',active:true,prompt:'PROMPT ORIGINAL\nCom regras exclusivas.',tone:'Tom exclusivo da empresa',rules:'Não alterar regras.',forbidden:'Não revelar dados.',channel_ids:[1],tools:['handoff','labels','custom_original'],custom_actions:[{key:'custom_original',name:'Orientação original',description:'Quando solicitado',response:'Conteúdo original'}],skills:{role:'supervisor',entry:'specialist',agent_ids:[42],bot_ids:[71],board_ids:[7],connection_ids:[3]},llm:[{provider:'openrouter',key:'test-key-preserve',model:'modelo-exclusivo',base_url:'https://example.test/v1',temperature:0.23,max_tokens:777}],stt:[{provider:'groq',key:'stt-test',model:'whisper-test',base_url:'https://example.test/stt',language:'pt'}],tts:[{provider:'openai',key:'tts-test',model:'voice-test',voice:'alloy',base_url:'https://example.test/tts',speed:0.9}]};
let agents=[structuredClone(fixture),{id:42,name:'Especialista',active:false,channel_ids:[]}],writes=[],failSave=false;
const root=path.resolve('web'),server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/realtime.js'){res.setHeader('content-type','application/javascript');return res.end('window.VexoraRealtime={connect:()=>({close(){}})}')}
 if(u.pathname.startsWith('/api/')){
  let raw='';for await(const chunk of req)raw+=chunk;const b=raw?JSON.parse(raw):{},p=u.pathname.slice(4);let data=[];
  if(p==='/me')data={id:1,tid:1,role:'owner',name:'Francélio'};
  if(p==='/brand')data={name:'Véxora',color:'#6254e8',font:'Inter',labels:{contact:'Cliente'}};
  if(p==='/operation')data={time_zone:'America/Cuiaba'};
  if(p==='/t/agents')data=agents;
  if(p==='/t/users')data=[{id:1,name:'Francélio',role:'owner'}];
  if(['/integrations/channels','/inboxes','/t/channels'].includes(p))data=[{id:1,name:'WhatsApp principal',driver:'baileys',platform:'whatsapp',connection:{state:'connected'}}];
  if(p==='/t/bots')data=[{id:71,name:'Triagem Rastreabem',active:true}];
  if(p==='/crm/boards')data=[{id:7,name:'Comercial'}];
  if(p==='/agent-connections')data=[{id:3,name:'Consulta externa',active:true}];
  if(p==='/variables')data=[{key:'campos.1',scope:'contact',label:'Contato · Placa'}];
  if(/^\/agents\/\d+\/knowledge$/.test(p))data=[{id:5,title:'Base original',kind:'texto',chunks:3}];
  if((p==='/t/agents/41'&&req.method==='PUT')||(p==='/t/agents'&&req.method==='POST')){
   if(failSave){res.statusCode=400;data={error:'Falha simulada ao salvar'}}else{writes.push(structuredClone(b));if(req.method==='POST'){data={id:99,...b};agents.push(data)}else{Object.assign(agents[0],b);data=agents[0]}}
  }
  res.setHeader('content-type','application/json');return res.end(JSON.stringify(data));
 }
 const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);if(!file.startsWith(root)||!fs.existsSync(file)){res.statusCode=404;return res.end()}
 res.setHeader('content-type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(process.env.AGENT_EDITOR_PREVIEW?3199:0,'0.0.0.0',resolve));if(process.env.AGENT_EDITOR_PREVIEW){console.log('Preview at http://127.0.0.1:3199/#agent');await new Promise(()=>{})}let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];
 page.setDefaultTimeout(7000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('dialog',d=>d.accept());await page.route('https://fonts.**/**',r=>r.abort());await page.addInitScript(()=>localStorage.nx='test');
 await page.goto('http://127.0.0.1:'+server.address().port+'/#agent');await page.getByRole('button',{name:'Configurar agente',exact:true}).first().click();
 const dialog=page.locator('.agent-editor-dialog');await dialog.getByRole('tab',{name:'Perfil',exact:false}).waitFor();
 await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:'/tmp/vexora-agent-debug.png'});assert.equal(await dialog.getByRole('tab').count(),4);assert.equal(await dialog.getByLabel('Nome do agente',{exact:true}).inputValue(),fixture.name);assert.equal(await dialog.getByLabel('Tom de fala',{exact:true}).inputValue(),fixture.tone);
 await dialog.getByRole('tab',{name:'Comportamento',exact:false}).click();assert.equal(await dialog.getByLabel('Instruções / Prompt',{exact:true}).inputValue(),fixture.prompt);
 await dialog.getByRole('checkbox',{name:'Orientação original',exact:true}).waitFor();assert.ok(await dialog.getByRole('checkbox',{name:'Orientação original',exact:true}).isChecked());
 await dialog.getByRole('tab',{name:'Conhecimento',exact:false}).click();await dialog.getByText('Base original',{exact:false}).waitFor();
 await dialog.getByRole('tab',{name:'Configurações',exact:false}).click();assert.equal(await dialog.getByLabel('Estado',{exact:true}).inputValue(),'true');assert.equal(await dialog.getByLabel('Nome do modelo',{exact:true}).first().inputValue(),'modelo-exclusivo');
 await dialog.getByRole('button',{name:'Revisar configuração',exact:true}).click();await dialog.getByText('Configuração preenchida.',{exact:false}).waitFor();
 await dialog.getByRole('tabpanel',{name:'Configurações',exact:false}).getByRole('button',{name:'Salvar alterações',exact:true}).click();await dialog.getByText('Configuração salva.',{exact:true}).waitFor();
 assert.equal(writes.length,1);for(const key of Object.keys(fixture).filter(k=>k!=='id'))assert.deepEqual(writes[0][key],fixture[key],'preserve '+key);
 await page.screenshot({path:'/tmp/vexora-agent-settings-desktop.png'});
 await dialog.getByRole('tab',{name:'Perfil',exact:false}).click();await page.screenshot({path:'/tmp/vexora-agent-profile-desktop.png'});
 await dialog.getByRole('tab',{name:'Perfil',exact:false}).focus();await page.keyboard.press('ArrowDown');assert.equal(await dialog.getByRole('tab',{selected:true}).innerText(),'Comportamento\nInstruções, habilidades e destinos');
 await page.setViewportSize({width:390,height:844});await dialog.getByRole('tab',{name:'Perfil',exact:false}).click();await page.screenshot({path:'/tmp/vexora-agent-profile-mobile.png'});
 const metrics=await dialog.evaluate(d=>({viewport:innerWidth,width:d.getBoundingClientRect().width,scroll:d.scrollWidth,footer:d.querySelector('form>.nx-dialog-actions').getBoundingClientRect().bottom,height:innerHeight}));assert.ok(metrics.width<=metrics.viewport+1);assert.ok(metrics.scroll<=metrics.width+1);assert.ok(metrics.footer<=metrics.height+1);
 await dialog.getByLabel('Nome do agente',{exact:true}).fill('Nome ainda não salvo');failSave=true;await dialog.getByRole('tabpanel',{name:'Perfil',exact:false}).getByRole('button',{name:'Salvar alterações',exact:true}).click();await dialog.getByText('Não foi possível salvar:',{exact:false}).waitFor();assert.equal(await dialog.getByLabel('Nome do agente',{exact:true}).inputValue(),'Nome ainda não salvo');failSave=false;
 await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(await page.locator('.agent-editor-dialog').count(),0);
 await page.getByRole('button',{name:'Configurar agente',exact:true}).first().click();assert.equal(await page.getByLabel('Nome do agente',{exact:true}).inputValue(),fixture.name);
 await page.locator('.agent-editor-dialog').getByRole('button',{name:'Cancelar',exact:true}).click();await page.getByRole('button',{name:'+ Criar agente',exact:true}).click();await page.getByLabel('Nome do agente',{exact:true}).fill('Novo agente em rascunho');await page.getByRole('tabpanel',{name:'Perfil',exact:false}).getByRole('button',{name:'Salvar alterações',exact:true}).click();await page.getByText('Rascunho salvo · configuração incompleta.',{exact:false}).waitFor();assert.equal(writes.at(-1).active,false);
 assert.deepEqual(errors,[]);console.log('OK: four-section editor, existing values/credentials/model options preserved, active state preserved, knowledge retained, keyboard, desktop/mobile, failed save retains draft, cancel discards, partial draft saves. APIs simulated.');
}finally{await browser?.close();server.close()}
