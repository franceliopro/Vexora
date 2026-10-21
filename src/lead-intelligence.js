import crypto from 'node:crypto';
import {als} from './ctx.js';
import {seal,unseal} from './service-calendar.js';
import {conversationFor} from './conversation-policy.js';
import {customFieldValue} from './customer-variables.js';
import {leadPayload,verifyLeadSignature} from './lead-payload.js';
export async function ingestLead(query,source,b){
 const p=leadPayload(b);if((await query('select id from lead_events where source_id=$1 and external_id=$2',[source.id,p.external_id])).rows.length)return {duplicate:true};
 await query('select pg_advisory_xact_lock(hashtext($1))',[source.channel_id+':'+p.handle]);
 const ct=(await query('insert into contacts(channel_id,handle,name) values($1,$2,$3) on conflict(channel_id,handle) do update set handle=excluded.handle returning *',[source.channel_id,p.handle,p.name||p.handle])).rows[0];
 const cv=(await query('select id from conversations where contact_id=$1 order by id desc limit 1',[ct.id])).rows[0];
 const fields={};for(const [name,id]of Object.entries(source.field_map||{})){if(!Object.hasOwn(p.fields,name))continue;const def=(await query("select * from field_definitions where id=$1 and active and scope='contact'",[Number(id)])).rows[0];if(!def)throw Error('Mapeamento de campo indisponível');fields[id]=customFieldValue(def,p.fields[name])}
 const event=(await query('insert into lead_events(source_id,contact_id,conversation_id,external_id,type,source,campaign,page,data) values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(tenant_id,source_id,external_id) do nothing returning *',[source.id,ct.id,cv?.id||null,p.external_id,p.type,source.name,p.campaign,p.page,JSON.stringify({fields:p.fields})])).rows[0];if(!event)return {duplicate:true};
 const origin={source:source.name,type:p.type,campaign:p.campaign,page:p.page,at:event.at};
 await query("update contacts set custom_fields=custom_fields||$2::jsonb,data=coalesce(data,'{}')||jsonb_build_object('lead_origin',coalesce(data->'lead_origin',$3::jsonb),'lead_last_touch',$3::jsonb) where id=$1",[ct.id,JSON.stringify(fields),JSON.stringify(origin)]);
 if(cv)await query("insert into service_events(conversation_id,type,data) values($1,'lead_context',$2)",[cv.id,JSON.stringify({lead_event_id:event.id,source:source.name,type:p.type})]);return {id:event.id,contact_id:ct.id,conversation_id:cv?.id||null};
}
export function mountLeadPublic(app,{ah,limit,tenantTransaction,bus}){
 app.post('/hooks/leads/:tenant/:source',limit,ah(async(req,res)=>{
 const tid=Number(req.params.tenant),id=Number(req.params.source);if(!Number.isSafeInteger(tid)||!Number.isSafeInteger(id)||tid<1||id<1)return res.status(404).json({error:'Fonte indisponível'});
 const result=await tenantTransaction(tid,async query=>{
  const source=(await query('select s.* from lead_sources s join tenants t on t.id=s.tenant_id join channels c on c.id=s.channel_id where s.id=$1 and s.active and t.active and c.active for update of s',[id])).rows[0];
  if(!source||!verifyLeadSignature(unseal(source.secret),req.rawBody||Buffer.alloc(0),(req.headers['x-vexora-timestamp']||req.headers['x-nexora-timestamp']),(req.headers['x-vexora-signature']||req.headers['x-nexora-signature'])))throw Object.assign(Error('Assinatura inválida'),{status:401});
  return ingestLead(query,source,req.body);
 });if(result.conversation_id)await als.run({tenant:tid},()=>bus('conv',{id:result.conversation_id}));res.json({ok:true,...result});
 }));
}
export function mountLeadIntelligence(app,{ah,adm,q,tenantTransaction}){
 app.get('/api/lead-sources',adm,ah(async(req,res)=>res.json((await q('select id,name,channel_id,field_map,active,created_at from lead_sources order by id desc')).rows)));
 app.post('/api/lead-sources',adm,ah(async(req,res)=>{
  const b=req.body,name=String(b.name||'').trim().slice(0,100),channel=Number(b.channel_id);if(!name||!(await q('select id from channels where id=$1 and active',[channel])).rows.length)throw Error('Informe nome e inbox ativa');
  const map=b.field_map||{};if(typeof map!=='object'||Array.isArray(map)||Object.keys(map).length>50)throw Error('Mapeamento inválido');for(const [key,id]of Object.entries(map)){if(!/^\w{1,60}$/.test(key)||!(await q("select id from field_definitions where id=$1 and scope='contact' and active",[Number(id)])).rows.length)throw Error('Campo de contato inválido')}
  const secret=crypto.randomBytes(32).toString('hex'),row=(await q('insert into lead_sources(name,channel_id,secret,field_map) values($1,$2,$3,$4) returning id',[name,channel,seal(secret),JSON.stringify(map)])).rows[0];res.json({id:row.id,secret,path:'/hooks/leads/'+req.u.tid+'/'+row.id});
 }));
 app.delete('/api/lead-sources/:id',adm,ah(async(req,res)=>{await q('update lead_sources set active=false where id=$1',[req.params.id]);res.json({ok:true})}));
 app.post('/api/lead-sources/:id/rotate',adm,ah(async(req,res)=>{const secret=crypto.randomBytes(32).toString('hex'),r=await q('update lead_sources set secret=$2 where id=$1 returning id',[req.params.id,seal(secret)]);if(!r.rows.length)throw Error('Fonte inexistente');res.json({secret,path:'/hooks/leads/'+req.u.tid+'/'+r.rows[0].id})}));
 app.get('/api/leads/intelligence',adm,ah(async(req,res)=>res.json({events:(await q('select e.*,ct.name contact_name from lead_events e left join contacts ct on ct.id=e.contact_id order by e.at desc,e.id desc limit 200')).rows,summary:(await q("select source,type,count(*)::int total,count(distinct contact_id)::int contacts from lead_events group by source,type order by total desc")).rows})));
 app.get('/api/conversations/:id/lead-context',ah(async(req,res)=>{const cv=await conversationFor(q,Number(req.params.id),req.u.id);res.json({contact:(await q('select data from contacts where id=$1',[cv.contact_id])).rows[0]?.data,events:(await q('select id,type,source,campaign,page,data,at from lead_events where contact_id=$1 order by at desc,id desc limit 50',[cv.contact_id])).rows})}));
}

export async function recordNativeReferral(query,ch,ct,cv,message){
 const r=message.referral;if(!r||typeof r!=='object'||Array.isArray(r)||!message.ext_id)return;
 const text=(value,max=300)=>typeof value==='string'||typeof value==='number'?String(value).slice(0,max):'';
 const network=ch.config?.platform|| (['waha','baileys'].includes(ch.driver)?'whatsapp':'social'),source=({instagram:'Instagram',facebook:'Messenger',messenger:'Messenger',whatsapp:'WhatsApp'}[network]||'Rede social')+' · referência';
 const data={};for(const key of ['ref','source','type','source_type','source_id','ad_id','headline','ctwa_clid'])if(text(r[key]))data[key]=text(r[key]);
 if(!Object.keys(data).length)return;
 let page='';try{const u=new URL(r.source_url||r.referer_uri);if(['https:','http:'].includes(u.protocol)&&!u.username&&!u.password){u.search='';u.hash='';page=u.href.slice(0,1000)}}catch{}
 const campaign=text(r.ref||r.ad_id||r.source_id,200),event=(await query("insert into lead_events(contact_id,conversation_id,external_id,type,source,campaign,page,data) values($1,$2,$3,'referral',$4,$5,$6,$7) on conflict(tenant_id,external_id) where source_id is null and external_id is not null do nothing returning at",[ct.id,cv.id,'native:'+ch.id+':'+message.ext_id,source,campaign,page,JSON.stringify({fields:data})])).rows[0];if(!event)return;
 const origin={source,type:'referral',campaign,page,at:event.at};
 await query("update contacts set data=coalesce(data,'{}')||jsonb_build_object('lead_origin',coalesce(data->'lead_origin',$2::jsonb),'lead_last_touch',$2::jsonb) where id=$1",[ct.id,JSON.stringify(origin)]);
}
