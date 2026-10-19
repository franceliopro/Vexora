import {companyTimeZone} from '../timezone.js';
import {canBotRun} from '../conversation-policy.js';
import {localGreeting} from '../tracking-template.js';
import dns from 'dns/promises';import {q} from '../db.js';import {als} from '../ctx.js';import {advance} from './engine.js';import {deliver,setStage,convFor} from '../core.js';import {asaasDebts,asaasPay} from '../payments.js';import {menuFor,createOrder} from '../delivery.js';import {norm,tpl,isPrivateIp} from '../lib.js';
const trig=(t,text,fresh)=>{t=t||{type:'first'};if(t.type==='any')return true;if(t.type==='first')return fresh;
 if(t.type==='keyword'){const n=norm(text);return String(t.words||'').split(',').map(norm).filter(Boolean).some(w=>n===w||n.includes(w))}return false};
async function safeFetch(d,ctx){let u;try{u=new URL(tpl(d.url,ctx))}catch{return {ok:false}}if(!/^https?:$/.test(u.protocol))return {ok:false};
 const addrs=await dns.lookup(u.hostname,{all:true}).catch(()=>[]);if(!addrs.length||addrs.some(a=>isPrivateIp(a.address)))return {ok:false,error:'destino bloqueado'}; // SSRF
 try{const m=(d.method||'GET').toUpperCase(),r=await fetch(u,{method:m,redirect:'manual',signal:AbortSignal.timeout(8000),headers:{'content-type':'application/json'},body:m==='GET'?undefined:tpl(d.body,ctx)});
  const t=(await r.text()).slice(0,100000);let data;try{data=JSON.parse(t)}catch{data=t}return {ok:r.ok,data}}catch{return {ok:false}}}
const mkDeps=cv=>({
 send:t=>deliver(cv.id,{body:String(t),ai:true,epoch:cv.automation_epoch}),
 setStage:id=>setStage(cv.id,+id),
 builtins:async()=>{const ct=(await q('select name,handle,data from contacts where id=$1',[cv.contact_id])).rows[0]||{};const n=new Date(),zone=await companyTimeZone(q),clock=localGreeting(n,zone);
  return {...clock,nome:String(ct.name||'').split(' ')[0],nome_completo:ct.name||'',telefone:ct.handle||'',dia_semana:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short'}).format(n)),...(ct.data||{}),...clock}},
 transfer:async d=>{const current=(await q('select * from conversations where id=$1',[cv.id])).rows[0];if(!canBotRun(current)||current.automation_epoch!==cv.automation_epoch)throw Error('Automação pausada');const t=d.target||'queue';
  await q('delete from participants where conversation_id=$1',[cv.id]);await q('delete from conversation_team_participants where conversation_id=$1',[cv.id]);
  if(t==='ai'){const ag=d.agent_id?(await q('select id from agents where id=$1 and active',[d.agent_id])).rows[0]:(await q('select id from agents where active limit 1')).rows[0];await q("update conversations set routing_managed=false,routing_attempts='{}',routing_assigned_at=null,automation_mode='ai',automation_paused=false,ai_on=true,agent_id=$2,assignee_id=null where id=$1",[cv.id,ag?.id||null])}
  else if(t==='user')await q("update conversations set routing_managed=false,routing_attempts='{}',routing_assigned_at=null,automation_mode='human',automation_paused=true,ai_on=false,assignee_id=$2 where id=$1",[cv.id,d.user_id||null]);
  else if(t==='team')await q("update conversations set routing_managed=false,routing_attempts='{}',routing_assigned_at=null,automation_mode='human',automation_paused=true,ai_on=false,assignee_id=null,team_id=$2 where id=$1",[cv.id,d.team_id||null]);
  else await q("update conversations set routing_managed=false,routing_attempts='{}',routing_assigned_at=null,automation_mode='human',automation_paused=true,ai_on=false,assignee_id=null where id=$1",[cv.id]);
  await deliver(cv.id,{kind:'note',body:`🤖 Bot transferiu a conversa (${t})`,ai:true})},
 http:safeFetch,asaasDebts:(doc,options)=>asaasDebts(doc,{...options,phone:cv.handle}),asaasPay,menu:menuFor,
 createOrder:o=>createOrder({...o,source:'whatsapp',contact_id:cv.contact_id,customer_name:cv.cname,customer_phone:cv.handle})});
// Retorna true se um bot "consumiu" a mensagem (a IA não deve responder).
export async function handle(cv,msg,fresh){if(!canBotRun(cv))return false;let run=(await q("select * from bot_runs where conversation_id=$1 and status='active'",[cv.id])).rows[0],bot;
 if(run&&Date.now()-new Date(run.updated_at)>12*36e5){await q("update bot_runs set status='expirado' where id=$1",[run.id]);run=null}
 if(run){bot=(await q('select * from bots where id=$1',[run.bot_id])).rows[0];if(!bot||!bot.active&&!run.invoked){await q("update bot_runs set status='encerrado' where id=$1",[run.id]);run=null}}
 if(!run){if(!msg.body)return false;
  const routing=(await q('select config from channels where id=$1',[cv.channel_id])).rows[0]?.config?.routing;bot=(await q('select * from bots where active order by id')).rows.find(b=>(!routing?.enabled||b.id===routing.bot_id)&&(!b.channel_ids?.length||b.channel_ids.includes(cv.channel_id))&&trig(b.trigger,msg.body,fresh));if(!bot)return false;
  const st=(bot.graph.nodes||[]).find(n=>n.type==='start');if(!st)return false;
  run=(await q("insert into bot_runs(bot_id,conversation_id,node) values($1,$2,$3) returning *",[bot.id,cv.id,st.id])).rows[0];await q('update bots set runs=runs+1 where id=$1',[bot.id])}
 const ct=(await q('select name,handle from contacts where id=$1',[cv.contact_id])).rows[0]||{};const r={node:run.node,waiting:run.waiting,vars:run.vars||{},tries:run.tries||0};
 let res;try{res=await advance({graph:bot.graph,run:r,text:run.waiting?(msg.body||''):null,deps:mkDeps({...cv,cname:ct.name,handle:ct.handle})})}
 catch(e){console.error('bot',e.message);await q("update bot_runs set status='erro' where id=$1 and status='active'",[run.id]);return false}
 await q("update bot_runs set node=$2,waiting=$3,vars=$4,tries=$5,status=$6,updated_at=now() where id=$1 and status='active'",[run.id,r.node,r.waiting,JSON.stringify(r.vars),r.tries,res.done?'concluido':'active']);if(res.done&&run.invoked)await q("update conversations set routing_managed=false,routing_attempts='{}',routing_assigned_at=null,automation_mode='ai',ai_on=true where id=$1 and automation_mode='bot' and not automation_paused",[cv.id]);return true}

