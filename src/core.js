import {q,adm} from './db.js';import {als} from './ctx.js';import {bus} from './bus.js';import {saveMedia} from './media.js';
import * as waha from './drivers/waha.js';import * as baileys from './drivers/baileys.js';import * as zernio from './drivers/zernio.js';
export const D={waha,baileys,zernio};
export async function setStage(cid,sid){await q('update conversations set stage_id=$2 where id=$1',[cid,sid]);bus('conv',{id:cid});(await import('./flows.js')).onStage(cid,sid)}
export async function inbound(chId,m){ // m:{handle,name,kind,body,file,ext_id}
 const ch=(await q('select * from channels where id=$1',[chId])).rows[0];if(!ch||!ch.active)return;
 let ct=(await q('select * from contacts where channel_id=$1 and handle=$2',[chId,m.handle])).rows[0];
 if(!ct)ct=(await q('insert into contacts(name,handle,channel_id) values($1,$2,$3) returning *',[m.name||m.handle,m.handle,chId])).rows[0];
 let cv=(await q('select * from conversations where contact_id=$1 order by id desc limit 1',[ct.id])).rows[0],fresh=false;
 if(!cv){fresh=true;const st=(await q('select id from stages order by pos limit 1')).rows[0];const ag=(await q('select id from agents where active and $1=any(channel_ids) limit 1',[chId])).rows[0];
  cv=(await q('insert into conversations(contact_id,channel_id,stage_id,team_id,agent_id,ai_on) values($1,$2,$3,$4,$5,$6) returning *',[ct.id,chId,st?.id,ch.team_id,ag?.id,!!ag])).rows[0]}
 const fl=await import('./flows.js');await fl.cancel(cv.id);
 const msg=(await q("insert into messages(conversation_id,dir,kind,body,media_url,ext_id) values($1,'in',$2,$3,$4,$5) returning *",[cv.id,m.kind||'text',m.body||null,m.file?'/media/'+m.file:null,m.ext_id])).rows[0];
 cv=(await q('update conversations set unread=unread+1,last_at=now(),last_in_at=now() where id=$1 returning *',[cv.id])).rows[0];
 bus('msg',{conversation_id:cv.id,message:msg});
 if(fresh){fl.onNew(cv.id);if(cv.stage_id)fl.onStage(cv.id,cv.stage_id)}
 (await import('./ai/engine.js')).onInbound(cv,msg).catch(e=>console.error('ai',e.message))}
export async function deliver(cid,{kind='text',body,file,author_id,ai=false}){
 const cv=(await q('select c.*,ct.handle,ch.driver,ch.config,ch.id chid from conversations c join contacts ct on ct.id=c.contact_id join channels ch on ch.id=c.channel_id where c.id=$1',[cid])).rows[0];
 let ext=null,dir='out';
 if(kind==='note')dir='int';else{const last=(await q("select ext_id,kind from messages where conversation_id=$1 and dir='in' order by at desc limit 1",[cid])).rows[0];
  ext=await D[cv.driver].send({id:cv.chid,config:cv.config},{to:cv.handle,kind,body,file,replyTo:last})}
 const msg=(await q('insert into messages(conversation_id,dir,kind,body,media_url,author_id,ai,ext_id) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[cid,dir,kind,body||null,file?'/media/'+file:null,author_id||null,ai,ext])).rows[0];
 if(kind!=='note')await q('update conversations set last_at=now() where id=$1',[cid]);
 bus('msg',{conversation_id:cid,message:msg});return msg}
export async function startAll(){for(const c of (await adm("select * from channels where active and driver='baileys'")).rows)baileys.start(c,(id,m)=>als.run({tenant:c.tenant_id},()=>inbound(id,m))).catch(e=>console.error('baileys',e.message))}
