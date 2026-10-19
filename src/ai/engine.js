import {moveCRMFromConversation} from '../crm.js';
import {companyTimeZone} from '../timezone.js';
import {automationAllowed} from '../conversation-policy.js';import {localGreeting} from '../tracking-template.js';import {routeTracking} from '../tracking-routing.js';
import fs from 'fs';import {q,tenantTransaction} from '../db.js';import {deliver,setStage} from '../core.js';import {saveMedia,MEDIA,readMedia} from '../media.js';import {createAppt} from '../gcal.js';
const post=async(u,h,b)=>{const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json',...h},body:JSON.stringify(b)});if(!r.ok)throw new Error(u+' '+r.status+' '+(await r.text()).slice(0,200));return r};
const chain=async(c,fn)=>{let err;for(const x of [].concat(c||[])){try{return await fn(x)}catch(e){err=e;console.error('fallback:',e.message)}}throw err||new Error('provedor não configurado')}; // vários provedores por agente: cai pro próximo
const llm=(cfg,system,msgs)=>chain(cfg,async c=>{
 if(c.provider==='anthropic'){const j=await(await post((c.base_url||'https://api.anthropic.com')+'/v1/messages',{'x-api-key':c.key,'anthropic-version':'2023-06-01'},{model:c.model,max_tokens:1024,system,messages:msgs})).json();return j.content.map(x=>x.text||'').join('')}
 const j=await(await post((c.base_url||'https://api.openai.com/v1')+'/chat/completions',{authorization:'Bearer '+c.key},{model:c.model,messages:[{role:'system',content:system},...msgs]})).json();return j.choices[0].message.content});
const stt=(cfg,file)=>chain(cfg,async c=>{const fd=new FormData();fd.append('file',new Blob([readMedia(file)]),file);fd.append('model',c.model||'whisper-1');
 const r=await fetch((c.base_url||'https://api.openai.com/v1')+'/audio/transcriptions',{method:'POST',headers:{authorization:'Bearer '+c.key},body:fd});if(!r.ok)throw new Error('stt '+r.status);return (await r.json()).text});
const tts=(cfg,text)=>chain(cfg,async c=>{const r=await post((c.base_url||'https://api.openai.com/v1')+'/audio/speech',{authorization:'Bearer '+c.key},{model:c.model||'tts-1',voice:c.voice||'alloy',input:text,response_format:'opus'});return saveMedia(Buffer.from(await r.arrayBuffer()),'ogg')});
const emb=async t=>{const s=(await q("select value from settings where key='embed'")).rows[0]?.value;if(!s?.key)return null;
 return (await(await post((s.base_url||'https://api.openai.com/v1')+'/embeddings',{authorization:'Bearer '+s.key},{model:s.model||'text-embedding-3-small',input:t})).json()).data[0].embedding};
export async function ragAdd(agent_id,title,content){const parts=content.match(/[\s\S]{1,900}(\n|$)/g)||[content];let n=0;
 for(const p of parts){const e=await emb(p).catch(()=>null);await q('insert into docs(agent_id,title,content,emb) values($1,$2,$3,$4)',[agent_id||null,title,p,e?'['+e+']':null]);n++}return n}
async function rag(aid,text){const e=await emb(text).catch(()=>null);
 if(e)return (await q('select content from docs where (agent_id=$1 or agent_id is null) and emb is not null order by emb <=> $2::vector limit 4',[aid,'['+e+']'])).rows.map(r=>r.content);
 const w=text.split(/\s+/).filter(x=>x.length>3).slice(0,4);if(!w.length)return [];
 return (await q('select content from docs where (agent_id=$1 or agent_id is null) and content ilike any($2) limit 4',[aid,w.map(x=>'%'+x+'%')])).rows.map(r=>r.content)}
export async function respond(cv,ag,extra='',wantAudio=false,depth=0){const fresh=(await q('select * from conversations where id=$1',[cv.id])).rows[0];if(!automationAllowed(fresh)||fresh.automation_epoch!==cv.automation_epoch)return;
 const teams=(await q('select id,name from teams order by id')).rows,clock=localGreeting(new Date(),await companyTimeZone(q));
 let h=(await q("select dir,body from messages where conversation_id=$1 and kind<>'note' and dir<>'int' and body is not null order by at desc limit 20",[cv.id])).rows.reverse().map(m=>({role:m.dir==='in'?'user':'assistant',content:m.body}));
 h=h.reduce((a,m)=>{const l=a[a.length-1];l&&l.role===m.role?l.content+='\n'+m.content:a.push({...m});return a},[]);while(h[0]&&h[0].role!=='user')h.shift();if(!h.length)h=[{role:'user',content:'(início)'}];
 const lastU=[...h].reverse().find(m=>m.role==='user').content;
 const [ct,st,us,docs]=await Promise.all([q('select * from contacts where id=$1',[cv.contact_id]),q('select id,name,kind from stages order by pos'),q("select id,name,role from users where not is_ai"),rag(ag.id,lastU)]);
 const sys=`Você é ${ag.name}, atendente virtual. ${ag.prompt}
TOM: ${ag.tone||'natural e cordial'}
REGRAS: ${ag.rules||'-'}
PROIBIDO (nunca faça): ${ag.forbidden||'-'}
Contato: ${ct.rows[0].name}; ficha: ${JSON.stringify(ct.rows[0].data)}
Agora: ${new Date().toISOString()} · ${clock.fuso} · ${clock.saudacao} (hora local: ${clock.hora})
Equipes disponíveis: ${JSON.stringify(teams)}
BASE DE CONHECIMENTO (use só isto para fatos; se faltar, diga que vai confirmar):
${docs.join('\n---\n')||'(vazia)'}
Etapas do funil: ${st.rows.map(s=>s.name).join(', ')}
Atendentes humanos: ${JSON.stringify(us.rows)}
${extra}
Responda SOMENTE JSON: {"reply":"texto curto","actions":[{"t":"move_stage","stage":"nome"},{"t":"handoff","user_id":N,"why":""},{"t":"invite","user_id":N},{"t":"book","title":"","start":"ISO","minutes":30},{"t":"set","k":"campo","v":"valor"}]}
Para rastreamento veicular, use {"t":"tracking_triage","sector":"suporte|financeiro|comercial|administrativo","platform":"ceeb_vision|link|rastreabem","payment":true|false}. Só use depois de coletar os dados necessários. Para pagamento, o fluxo seguro solicitará documento e verificará o telefone.
Ações permitidas: ${(ag.tools||[]).join(',')}. Só use ações quando fizer sentido. Atualize a ficha (set) quando descobrir dados do cliente.`;
 const crm=(ag.tools||[]).includes('crm_move')?(await q("select c.id,c.title,c.board_id,s.id stage_id,s.name stage_name,s.final from crm_cards c join crm_stages s on s.board_id=c.board_id where c.conversation_id=$1 and c.status='open'",[cv.id])).rows:[];
 const crmContext='CRM desta conversa: '+JSON.stringify(crm)+'. Se crm_move for permitido, use {t: \"crm_move\", card_id:N, stage_id:N} somente para etapas intermediárias; encerramento exige humano.';
 const raw=await llm(ag.llm,sys+"\n"+crmContext,h);let out;try{out=JSON.parse(raw.match(/\{[\s\S]*\}/)[0])}catch{out={reply:raw,actions:[]}}
 let retry='';
 for(const a of out.actions||[]){const current=(await q('select * from conversations where id=$1',[cv.id])).rows[0];if(!automationAllowed(current)||current.automation_epoch!==cv.automation_epoch)return;if(!(ag.tools||[]).includes(a.t))continue;
  try{
   if(a.t==='crm_move'){const bid=await tenantTransaction(cv.tenant_id,query=>moveCRMFromConversation(query,cv,a));(await import('../bus.js')).bus('crm',{board_id:bid})}
   if(a.t==='move_stage'){const s=st.rows.find(x=>x.name.toLowerCase()===String(a.stage).toLowerCase());if(s)await setStage(cv.id,s.id)}
   if(a.t==='tracking_triage'){const result=await routeTracking(q,cv,a,text=>deliver(cv.id,{body:text,ai:true,epoch:cv.automation_epoch}));if(result==='bot'){await (await import('../bots/runtime.js')).handle({...cv,automation_mode:'bot',ai_on:false},{body:'iniciar'},false)}out.reply=null;break}
   if(a.t==='handoff'){await q("update conversations set automation_mode='human',automation_paused=true,ai_on=false,assignee_id=$1 where id=$2",[a.user_id||null,cv.id]);await deliver(cv.id,{kind:'note',body:`🤖 ${ag.name} transferiu${a.user_id?'':' (fila)'}: ${a.why||''}`,ai:true})}
   if(a.t==='invite'&&a.user_id){await q('insert into participants values($1,$2) on conflict do nothing',[cv.id,a.user_id]);await deliver(cv.id,{kind:'note',body:`🤖 ${ag.name} convidou o atendente #${a.user_id}`,ai:true})}
   if(a.t==='set')await q('update contacts set data=data||$2 where id=$1',[cv.contact_id,JSON.stringify({[a.k]:a.v})]);
   if(a.t==='book')await createAppt({contact_id:cv.contact_id,title:a.title||'Agendamento',start:a.start,minutes:a.minutes})
  }catch(e){if(a.t==='book')retry=`O horário ${a.start} falhou (${e.message}). Peça desculpas e ofereça outro horário.`;else console.error('action',a.t,e.message)}}
 if(retry&&depth<1)return respond(cv,ag,retry,wantAudio,1);
 const latest=(await q('select * from conversations where id=$1',[cv.id])).rows[0];if(!automationAllowed(latest)||latest.automation_epoch!==cv.automation_epoch||!out.reply)return;
 let file=null;if(wantAudio&&ag.tts)file=await tts(ag.tts,out.reply).catch(e=>(console.error('tts',e.message),null));
 await deliver(cv.id,file?{kind:'audio',body:out.reply,file,ai:true,epoch:cv.automation_epoch}:{body:out.reply,ai:true,epoch:cv.automation_epoch})}
export async function onInbound(cv,msg){if(!cv.ai_on||!automationAllowed(cv))return;
 const ag=(cv.agent_id&&(await q('select * from agents where id=$1 and active',[cv.agent_id])).rows[0])||(await q('select * from agents where active and $1=any(channel_ids) limit 1',[cv.channel_id])).rows[0];if(!ag)return;
 let wantAudio=false;
 if(msg.kind==='audio'){if(!ag.stt)return;const t=await stt(ag.stt,msg.media_url.split('/').pop());await q('update messages set body=$2 where id=$1',[msg.id,t]);wantAudio=true;
  (await import('../bus.js')).bus('msg',{conversation_id:cv.id,message:{...msg,body:t}})}
 else if(!msg.body)return;
 await respond(cv,ag,'',wantAudio)}

