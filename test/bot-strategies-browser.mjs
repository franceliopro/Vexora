import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const fixture={id:41,name:'Rastreabem · atendimento',active:true,prompt:'PROMPT ORIGINAL\nCom regras exclusivas.',tone:'Tom exclusivo da empresa',rules:'Não alterar regras.',forbidden:'Não revelar dados.',channel_ids:[1],tools:['handoff','labels','custom_original'],custom_actions:[{key:'custom_original',name:'Orientação original',description:'Quando solicitado',response:'Conteúdo original'}],skills:{role:'supervisor',agent_ids:[42],bot_ids:[71],board_ids:[7],connection_ids:[3]},llm:[{provider:'openrouter',key:'test-key-preserve',model:'modelo-exclusivo',base_url:'https://example.test/v1',temperature:0.23,max_tokens:777}],stt:[{provider:'groq',key:'stt-test',model:'whisper-test',base_url:'https://example.test/stt',language:'pt'}],tts:[{provider:'openai',key:'tts-test',model:'voice-test',voice:'alloy',base_url:'https://example.test/tts',speed:0.9}]};
let botConfig={id:71,name:'Triagem Rastreabem',active:true,channel_ids:[1],trigger:{kind:'attendance',type:'first'},graph:{nodes:[{id:'s',type:'start',data:{}},{id:'m',type:'message',data:{text:'Olá'}}],edges:[{from:'s',out:'next',to:'m'}]}},hoursSaved,manualSaved;
let agents=[structuredClone(fixture),{id:42,name:'Especialista',active:false,channel_ids:[]}],writes=[],failSave=false;
const root=path.resolve('web'),server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/realtime.js'){res.setHeader('content-type','application/javascript');return res.end('window.NexoraRealtime={connect:()=>({close(){}})}')}
 if(u.pathname.startsWith('/api/')){
  let raw='';for await(const chunk of req)raw+=chunk;const b=raw?JSON.parse(raw):{},p=u.pathname.slice(4);let data=[];
  if(p==='/me')data={id:1,tid:1,role:'owner',name:'Francélio'};
  if(p==='/brand')data={name:'Néxora',color:'#6254e8',font:'Inter',labels:{contact:'Cliente'}};
  if(p==='/operation')data={time_zone:'America/Cuiaba'};
  if(p==='/t/agents')data=agents;
  if(p==='/t/users')data=[{id:1,name:'Francélio',role:'owner'}];
  if(['/integrations/channels','/inboxes','/t/channels'].includes(p))data=[{id:1,name:'WhatsApp principal',driver:'baileys',platform:'whatsapp',connection:{state:'connected'}}];
  if(p==='/t/bots')data=[botConfig];if(p==='/t/bots/71'&&req.method==='PUT'){Object.assign(botConfig,b);data=botConfig}if(p==='/business-hours'){if(req.method==='PUT')hoursSaved=b;data={enabled:false,time_zone:'America/Cuiaba',open:true}}if(p==='/metadata')data={labels:[],fields:[{id:501,name:'Placa',scope:'contact'}]};if(p==='/bots/catalog')data={boards:[{id:7,name:'Comercial'}],stages:[{id:8,name:'Novo',board_id:7,board_name:'Comercial'}]};if(p==='/conversations/15/chatbots')data={bots:[{...botConfig,available:true}],running:false};if(p==='/conversations/15/bot-start'){manualSaved=b;data={id:100,status:'pending'}}if(p==='/conversations/15/bot-invocations/100')data={id:100,status:'started',detail:'Fluxo iniciado'};
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
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.route('https://fonts.**/**',r=>r.abort());await page.addInitScript(()=>localStorage.nx='test');
 await page.goto('http://127.0.0.1:'+server.address().port+'/#bots');await page.getByRole('heading',{name:'Triagem Rastreabem',exact:true}).waitFor();await page.getByRole('button',{name:'Estratégia e horários',exact:true}).click();
 let dialog=page.getByRole('dialog');await dialog.getByLabel('Finalidade do chatbot',{exact:true}).selectOption('automation');await dialog.getByLabel('Quando pode iniciar',{exact:true}).selectOption('outside');await dialog.getByRole('checkbox',{name:'API externa',exact:true}).uncheck();await dialog.getByRole('button',{name:'Salvar',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(botConfig.trigger.kind,'automation');assert.equal(botConfig.trigger.hours,'outside');assert.ok(!botConfig.trigger.sources.includes('api'));assert.equal(botConfig.graph.nodes[1].data.text,'Olá');
 await page.screenshot({path:'/tmp/nexora-chatbot-strategies-desktop.png'});
 await page.getByRole('button',{name:'Horários',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByRole('checkbox',{name:'Usar horário de atendimento',exact:true}).check();await dialog.getByLabel('Segunda-feira · início 1',{exact:true}).fill('09:00');await dialog.getByRole('button',{name:'Salvar',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(hoursSaved.week[1][0].start,'09:00');assert.equal(hoursSaved.enabled,true);
 await page.getByRole('button',{name:'Editar fluxo',exact:true}).click();await page.locator('.cg-editor').waitFor();assert.equal(await page.getByLabel('Finalidade do chatbot',{exact:true}).inputValue(),'automation');await page.getByLabel('Quando pode iniciar',{exact:true}).selectOption('always');await page.getByRole('button',{name:'Salvar fluxo',exact:true}).click();await page.getByText('Salvo',{exact:true}).waitFor();assert.equal(botConfig.trigger.hours,'always');
 const checkSize=await page.getByRole('checkbox',{name:'Pelo atendente na conversa',exact:true}).boundingBox();assert.ok(checkSize.width<=20&&checkSize.height<=20);await page.screenshot({path:'/tmp/nexora-chatbot-editor-desktop.png'});
 await page.evaluate(()=>conversationChatbot({id:15,cname:'Cliente teste',assignee_id:1}));const tool=page.locator('.conversation-tool-dock');await tool.getByRole('button',{name:'Iniciar fluxo',exact:true}).click();await tool.getByText('Solicitação registrada',{exact:false}).waitFor();assert.equal(manualSaved.mode,'hybrid');assert.equal(manualSaved.bot_id,71);assert.ok(manualSaved.request_id);await tool.getByRole('button',{name:'Conferir início',exact:true}).click();await tool.getByText('Chatbot iniciado',{exact:false}).waitFor();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/nexora-chatbot-manual-mobile.png'});await page.goto('http://127.0.0.1:'+server.address().port+'/#bots');await page.getByRole('heading',{name:'Triagem Rastreabem',exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:'/tmp/nexora-chatbot-strategies-mobile.png'});
 assert.deepEqual(errors,[]);console.log('OK: estratégia/horário/fontes preservam grafo, horário semanal editável, editor, acionamento híbrido na conversa, confirmação de início e mobile sem overflow. APIs simuladas.');
}finally{await browser?.close();server.close()}
