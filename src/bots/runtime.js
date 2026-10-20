import {conversationVariables} from '../customer-variables.js';
import {companyDayVariables} from '../day-period.js';
import {customerName} from '../customer-name.js';
import {ensureAutomationProtocol} from '../service-protocol.js';
import {beginPresence} from '../ai/presence.js';
import {entryBot} from './entry.js';
import {contactAction} from '../automation-contact.js';
import {closeAutomated} from '../automation-close.js';
import {bus} from '../bus.js';
import {financialPhone} from '../financial-identity.js';
import {companyTimeZone} from '../timezone.js';
import {canBotRun} from '../conversation-policy.js';
import {localGreeting} from '../tracking-template.js';
import dns from 'dns/promises';import {q,tenantTransaction} from '../db.js';import {als} from '../ctx.js';import {advance,shouldUseAI,fallbackReady} from './engine.js';import {deliver,setStage,convFor,D} from '../core.js';import {asaasDebts,asaasPay} from '../payments.js';import {menuFor,createOrder} from '../delivery.js';import {norm,tpl,isPrivateIp} from '../lib.js';

async function safeFetch(d,ctx){let u;try{u=new URL(tpl(d.url,ctx))}catch{return {ok:false}}if(!/^https?:$/.test(u.protocol))return {ok:false};
 const addrs=await dns.lookup(u.hostname,{all:true}).catch(()=>[]);if(!addrs.length||addrs.some(a=>isPrivateIp(a.address)))return {ok:false,error:'destino bloqueado'}; // SSRF
 try{const m=(d.method||'GET').toUpperCase(),r=await fetch(u,{method:m,redirect:'manual',signal:AbortSignal.timeout(8000),headers:{'content-type':'application/json'},body:m==='GET'?undefined:tpl(d.body,ctx)});
  const t=(await r.text()).slice(0,100000);let data;try{data=JSON.parse(t)}catch{data=t}return {ok:r.ok,data}}catch{return {ok:false}}}
const mkDeps=cv=>({
 contactAction:(type,d)=>contactAction(q,cv,type,d),note:body=>deliver(cv.id,{kind:'note',body,ai:true,executor:'bot'}),
 send:(t,choices)=>deliver(cv.id,{body:String(t),choices,ai:true,executor:'bot',epoch:cv.automation_epoch}),
 close:async d=>{if(d.text)await deliver(cv.id,{body:d.text,ai:true,executor:'bot',epoch:cv.automation_epoch});const closed=await tenantTransaction(als.getStore()?.tenant,query=>closeAutomated(query,cv,{...d,executor:'bot'}));if(closed)bus('conv',{id:cv.id});return closed},
 setStage:id=>setStage(cv.id,+id),
 builtins:async()=>{const ct=(await q('select name,handle,data from contacts where id=$1',[cv.contact_id])).rows[0]||{};const n=new Date(),zone=await companyTimeZone(q),clock=localGreeting(n,zone);
  return {...clock,protocolo:cv.protocol||'',nome:String(ct.data?.preferred_name||ct.name||'').split(' ')[0],nome_completo:ct.data?.preferred_name||ct.name||'',telefone:'',dia_semana:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short'}).format(n)),...(ct.data||{}),novo_nome:customerName(ct),telefone:financialPhone((await q('select * from channels where id=$1',[cv.channel_id])).rows[0],ct),...clock,...await companyDayVariables(q),...(await conversationVariables(q,cv)).values}},
 transfer:async d=>{const current=(await q('select * from conversations where id=$1',[cv.id])).rows[0];if(!canBotRun(current)||current.automation_epoch!==cv.automation_epoch)throw Error('Automação pausada');const t=d.target||'queue';
  await q('delete from participants where conversation_id=$1',[cv.id]);await q('delete from conversation_team_participants where conversation_id=$1',[cv.id]);
  if(t==='ai'){const ag=d.agent_id?(await q('select id from agents where id=$1 and active',[d.agent_id])).rows[0]:(await q('select id from agents where active limit 1')).rows[0];await q("update conversations set routing_managed=false,routing_attempts='{}',routing_assigned_at=null,automation_mode='ai',automation_paused=false,ai_on=true,agent_id=$2,assignee_id=null where id=$1",[cv.id,ag?.id||null])}
  else if(t==='user'){if(!(await q('select id from users where id=$1 and active and deleted_at is null',[d.user_id])).rows.length)throw Error('Usuário indisponível');await q("update conversations set routing_managed=false,routing_attempts='{}',routing_assigned_at=null,automation_mode='human',automation_paused=true,ai_on=false,assignee_id=$2 where id=$1",[cv.id,d.user_id||null])}
  else if(t==='team'){if(!(await q('select id from teams where id=$1 and archived_at is null',[d.team_id])).rows.length)throw Error('Setor indisponível');await q("update conversations set routing_managed=false,routing_attempts='{}',routing_assigned_at=null,automation_mode='human',automation_paused=true,ai_on=false,assignee_id=null,team_id=$2 where id=$1",[cv.id,d.team_id||null])}
  else await q("update conversations set routing_managed=false,routing_attempts='{}',routing_assigned_at=null,automation_mode='human',automation_paused=true,ai_on=false,assignee_id=null where id=$1",[cv.id]);
  await deliver(cv.id,{kind:'note',body:`🤖 Bot transferiu a conversa (${t})`,ai:true})},
 http:safeFetch,asaasDebts:async(doc,options)=>{const ch=(await q('select * from channels where id=$1',[cv.channel_id])).rows[0],phone=financialPhone(ch,{handle:cv.handle});if(options?.verifyPhone&&!phone)throw Error('Identidade do titular requer confirmação humana neste canal');try{return await asaasDebts(doc,{...options,phone,conversation_id:cv.id})}catch(e){await deliver(cv.id,{kind:'note',body:'Consulta Asaas do bot não concluída: '+e.message,ai:true,executor:'bot'});throw e}},asaasPay,menu:menuFor,
 createOrder:o=>createOrder({...o,source:'whatsapp',contact_id:cv.contact_id,customer_name:cv.cname,customer_phone:cv.handle})});
// Retorna true se um bot "consumiu" a mensagem (a IA não deve responder).
export async function handle(cv,msg,fresh){if(!canBotRun(cv))return false;let run=(await q("select * from bot_runs where conversation_id=$1 and status='active'",[cv.id])).rows[0],bot;
 if(run&&Date.now()-new Date(run.updated_at)>12*36e5){await q("update bot_runs set status='expirado' where id=$1",[run.id]);run=null}
 if(run&&run.waiting&&msg.at&&new Date(msg.at)<=new Date(run.updated_at))return true;
 if(run){bot=(await q('select * from bots where id=$1',[run.bot_id])).rows[0];if(!bot||!bot.active&&!run.invoked){await q("update bot_runs set status='encerrado' where id=$1",[run.id]);run=null}}
 if(!run){if(!msg.body&&msg.kind!=='audio')return false;
  const routing=(await q('select config from channels where id=$1',[cv.channel_id])).rows[0]?.config?.routing;const prior=(await q('select id from bot_runs where conversation_id=$1 limit 1',[cv.id])).rows[0];bot=entryBot((await q('select * from bots where active order by id')).rows,routing,cv.channel_id,msg,fresh||!prior);if(!bot)return false;
  if(!fresh&&Number(bot.trigger?.cooldownHours)>0){const last=(await q('select max(br.updated_at) at from bot_runs br join conversations c on c.id=br.conversation_id where br.bot_id=$1 and c.contact_id=$2',[bot.id,cv.contact_id])).rows[0]?.at;if(last&&Date.now()-new Date(last)<Math.min(8760,Number(bot.trigger.cooldownHours))*36e5)return false}
  const st=(bot.graph.nodes||[]).find(n=>n.type==='start');if(!st)return false;
  run=(await q("insert into bot_runs(bot_id,conversation_id,node) values($1,$2,$3) returning *",[bot.id,cv.id,st.id])).rows[0];await q('update bots set runs=runs+1 where id=$1',[bot.id])}
 const waitingNode=(bot.graph.nodes||[]).find(n=>n.id===run.node);
 if(run.waiting&&shouldUseAI(waitingNode,msg)){
  const routing=(await q('select config from channels where id=$1',[cv.channel_id])).rows[0]?.config?.routing,preferred=cv.agent_id||routing?.agent_id||null;const ag=(await q('select * from agents where active and (id=$1 or $2=any(channel_ids)) order by (id=$1) desc nulls last,id limit 1',[preferred,cv.channel_id])).rows[0];
  const ready=fallbackReady(ag,msg);
  if(!ready&&!run.vars?._ai_unavailable){await deliver(cv.id,{kind:'note',body:'Bot manteve o menu: configure uma IA de texto ativa e, para áudio, um modelo STT. O cliente continua recebendo opções.',ai:true,executor:'bot'});run.vars={...(run.vars||{}),_ai_unavailable:true}}
  if(ready){const changed=await q("update conversations set automation_mode='ai',ai_on=true,agent_id=$3,automation_epoch=automation_epoch+1 where id=$1 and automation_epoch=$2 and not automation_paused and status='open' and assignee_id is null returning id",[cv.id,cv.automation_epoch,ag.id]);if(changed.rows.length){await q("update bot_runs set status='transferido_ia',updated_at=now() where id=$1 and status='active'",[run.id]);await deliver(cv.id,{kind:'note',body:'Bot transferiu à IA: resposta fora das opções ou áudio. Histórico preservado.'});bus('conv',{id:cv.id});return false}}
 }
 const ct=(await q('select name,handle from contacts where id=$1',[cv.contact_id])).rows[0]||{};const r={node:run.node,waiting:run.waiting,vars:run.vars||{},tries:run.tries||0};
 await ensureAutomationProtocol(q,cv,deliver,bus);const presence=await beginPresence(cv,{query:q,drivers:D}).catch(()=>({stop:async()=>{}}));let res;try{res=await advance({graph:bot.graph,run:r,text:run.waiting?(msg.body||''):null,deps:mkDeps({...cv,cname:ct.name,handle:ct.handle})})}
 catch(e){console.error('bot',e.message);await q("update bot_runs set status='erro' where id=$1 and status='active'",[run.id]);return true}finally{await presence.stop()}
 if(typeof r.vars.novo_nome==='string'&&r.vars.novo_nome!==run.vars?.novo_nome){const {cleanPreferredName}=await import('../service-entry.js');const preferred=cleanPreferredName(r.vars.novo_nome);if(preferred)await q("update contacts set data=coalesce(data,'{}'::jsonb)||$2 where id=$1",[cv.contact_id,JSON.stringify({preferred_name:preferred,novo_nome:preferred})])}
 if(res.stopped)await deliver(cv.id,{kind:'note',body:'Bot interrompido: '+res.stopped,ai:true,executor:'bot'});
 await q("update bot_runs set node=$2,waiting=$3,vars=$4,tries=$5,status=$6,updated_at=now() where id=$1 and status='active'",[run.id,r.node,r.waiting,JSON.stringify(r.vars),r.tries,res.done?'concluido':'active']);if(res.done&&run.invoked)await q("update conversations set routing_managed=false,routing_attempts='{}',routing_assigned_at=null,automation_mode='ai',ai_on=true where id=$1 and automation_mode='bot' and not automation_paused",[cv.id]);return true}

