import {financialDocumentIntake} from './financial-identity.js';
import {notifyProtocol} from './service-protocol.js';
import {routingCard} from './inbox-routing.js';
import {automationAllowed} from './conversation-policy.js';
import {q,adm,tenantTransaction} from './db.js';import {als} from './ctx.js';import {bus} from './bus.js';import {saveMedia} from './media.js';
import * as meta from './drivers/meta.js';
import * as waha from './drivers/waha.js';import * as baileys from './drivers/baileys.js';import * as zernio from './drivers/zernio.js';
export const D={waha,baileys,zernio,meta};
export async function setStage(cid,sid){await q('update conversations set stage_id=$2 where id=$1',[cid,sid]);bus('conv',{id:cid});(await import('./flows.js')).onStage(cid,sid)}
export async function inbound(chId,m){
 const saved=await tenantTransaction(als.getStore()?.tenant,async query=>{
  await query("select pg_advisory_xact_lock(hashtext(current_setting('app.tenant')||':inbound:'||$1||':'||$2))",[String(chId),String(m.handle)]);
  const ch=(await query('select * from channels where id=$1',[chId])).rows[0];if(!ch||!ch.active)return null;
  if(m.ext_id&&(await query('select id from messages where ext_id=$1 and conversation_id in(select id from conversations where channel_id=$2)',[m.ext_id,chId])).rows[0])return null;
  let ct=(await query('select * from contacts where channel_id=$1 and handle=$2',[chId,m.handle])).rows[0];
  if(!ct)ct=(await query('insert into contacts(name,handle,channel_id) values($1,$2,$3) returning *',[m.name||m.handle,m.handle,chId])).rows[0];
  let cv=(await query('select * from conversations where contact_id=$1 order by id desc limit 1',[ct.id])).rows[0],fresh=false;
  if(!cv||cv.status==='closed'){fresh=true;const st=(await query('select id from stages order by pos limit 1')).rows[0],ag=ch.config?.routing?.enabled?(ch.config.routing.agent_id?(await query('select id from agents where active and id=$1',[ch.config.routing.agent_id])).rows[0]:null):(await query('select id from agents where active and $1=any(channel_ids) limit 1',[chId])).rows[0];cv=(await query('insert into conversations(contact_id,channel_id,stage_id,team_id,agent_id,ai_on) values($1,$2,$3,$4,$5,$6) returning *',[ct.id,chId,st?.id,ch.team_id,ag?.id,!!ag])).rows[0]}
  if(m.externalConversation)await query("update contacts set data=coalesce(data,'{}'::jsonb)||$2 where id=$1",[ct.id,JSON.stringify({external_conversation_id:m.externalConversation,...(m.username?{sender_username:m.username}:{})})]);
  await query('update jobs set done=true where conversation_id=$1 and not done',[cv.id]);
  const msg=(await query("insert into messages(conversation_id,dir,kind,body,media_url,ext_id,filename) values($1,'in',$2,$3,$4,$5,$6) returning *",[cv.id,m.kind||'text',m.body||null,m.file?'/media/'+m.file:null,m.ext_id||null,m.filename||null])).rows[0];
  const boards=fresh?await routingCard(query,cv,ch):[];cv=(await query('update conversations set unread=unread+1,last_at=now(),last_in_at=now() where id=$1 returning *',[cv.id])).rows[0];return {cv,msg,fresh,boards};
 });if(!saved)return;const {cv,msg,fresh}=saved;
 bus('msg',{conversation_id:cv.id,message:msg});if(fresh)await notifyProtocol(q,cv.id,deliver,bus);for(const board_id of saved.boards||[])bus('crm',{board_id});const fl=await import('./flows.js');if(fresh){await fl.onNew(cv.id);if(cv.stage_id)await fl.onStage(cv.id,cv.stage_id)}
 let used=false;try{used=await (await import('./bots/runtime.js')).handle(cv,msg,fresh)}catch(e){console.error('bot',e.message)}
 if(!used&&cv.ai_on&&automationAllowed(cv)){const context=(await q("select body from messages where conversation_id=$1 and dir='out' order by id desc limit 3",[cv.id])).rows.map(m=>m.body||'').join(' '),channel=(await q('select * from channels where id=$1',[cv.channel_id])).rows[0],contact=(await q('select * from contacts where id=$1',[cv.contact_id])).rows[0],pay=(await q("select value from settings where key='pay'")).rows[0]?.value;if(pay?.asaas?.key)used=await financialDocumentIntake({cv,text:msg.body,context,channel,contact,sandbox:!!pay.asaas.sandbox,lookup:async(doc,opts)=>(await import('./payments.js')).asaasDebts(doc,opts),send:body=>deliver(cv.id,{body,ai:true,epoch:cv.automation_epoch}),handoff:async()=>{const changed=await q("update conversations set assignee_id=null,ai_on=false,automation_mode='human',automation_paused=true,automation_epoch=automation_epoch+1,routing_managed=false,routing_attempts='{}' where id=$1 and automation_epoch=$2 and not automation_paused and status='open' returning id",[cv.id,cv.automation_epoch]);if(!changed.rows.length)return;await deliver(cv.id,{kind:'note',body:'Documento recebido: a equipe deve confirmar a identidade e consultar pelo botão Cobranças. Não use identificadores de rede como telefone.'});bus('conv',{id:cv.id})}})}
 if(!used)(await import('./ai/engine.js')).onInbound(cv,msg).catch(e=>console.error('ai',e.message));
}
export async function convFor(contactId){const cv=(await q('select * from conversations where contact_id=$1 order by id desc limit 1',[contactId])).rows[0];if(cv)return cv;const ct=(await q('select * from contacts where id=$1',[contactId])).rows[0];if(!ct?.channel_id)throw new Error('contato sem canal');const st=(await q('select id from stages order by pos limit 1')).rows[0];return (await q('insert into conversations(contact_id,channel_id,stage_id,ai_on) values($1,$2,$3,false) returning *',[ct.id,ct.channel_id,st?.id])).rows[0]}
export async function deliver(cid,{kind='text',body,file,filename,author_id,ai=false,epoch,system=false}){
 const cv=(await q('select c.*,ct.handle,ct.data contact_data,ch.driver,ch.config,ch.active channel_active,ch.id chid from conversations c join contacts ct on ct.id=c.contact_id join channels ch on ch.id=c.channel_id where c.id=$1',[cid])).rows[0];
 if(ai&&kind!=='note'&&(!automationAllowed(cv)||(epoch!==undefined&&cv.automation_epoch!==epoch)))return null;
 if(!cv)throw Error('Conversa não encontrada');if(kind!=='note'&&!cv.channel_active)throw Error('Inbox pausada ou removida. Habilite a inbox em Integrações para responder.');
 let ext=null,dir='out';
 if(kind==='note')dir='int';else{const last=(await q("select ext_id,kind from messages where conversation_id=$1 and dir='in' order by at desc limit 1",[cid])).rows[0];
  ext=await D[cv.driver].send({id:cv.chid,config:cv.config},{to:cv.handle,kind,body,file,filename,externalConversation:cv.contact_data?.external_conversation_id,replyTo:last})}
 const msg=(await q('insert into messages(conversation_id,dir,kind,body,media_url,author_id,ai,ext_id,filename) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',[cid,dir,kind,body||null,file?'/media/'+file:null,author_id||null,ai||system,ext,filename||null])).rows[0];
 if(kind!=='note')await q('update conversations set last_at=now() where id=$1',[cid]);
 bus('msg',{conversation_id:cid,message:msg});return msg}
export async function startAll(){for(const c of (await adm("select * from channels where active and driver='baileys'")).rows)baileys.start(c,(id,m)=>als.run({tenant:c.tenant_id},()=>inbound(id,m))).catch(e=>console.error('baileys',e.message))}

