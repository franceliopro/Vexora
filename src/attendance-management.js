import {accessPredicate,conversationFor} from './conversation-policy.js';
import {adminRole,requireAction} from './governance.js';
import {serviceEvent} from './operations.js';import {text,positiveId} from './product.js';
// Shared between list and counters so visible queues and totals use identical rules.
export function queuePredicate(c='c',user='$1',scope='$2'){return `((${scope}='archived' and ${c}.filing='archived') or (${scope}='deleted' and ${c}.filing='deleted') or (${scope} not in ('archived','deleted') and ${c}.filing='active' and ((${scope}='closed' and ${c}.status='closed') or (${scope}<>'closed' and ${c}.status='open')))) and (${scope}<>'new' or ${c}.assignee_id is null) and (${scope}<>'others' or (${c}.assignee_id is not null and ${c}.assignee_id<>${user})) and (${scope}<>'mine' or ${c}.assignee_id=${user} or exists(select 1 from participants p where p.conversation_id=${c}.id and p.user_id=${user}) or exists(select 1 from conversation_team_participants tp join team_members tm on tm.team_id=tp.team_id where tp.conversation_id=${c}.id and tm.user_id=${user}))`}
export function extraQueueFilters(c='c',team='$5',owner='$6',kind='$7',label='$8',unread='$9'){return `(${team}::int is null or ${c}.team_id=${team}) and (${owner}::int is null or ${c}.assignee_id=${owner}) and (${label}::int is null or exists(select 1 from contacts fct where fct.id=${c}.contact_id and ${label}=any(fct.labels))) and (${unread}='' or (${unread}='unread' and ${c}.unread>0) or (${unread}='read' and ${c}.unread=0)) and (${kind}='' or (select m.kind from messages m where m.conversation_id=${c}.id and m.dir<>'int' order by m.at desc,m.id desc limit 1)=${kind})`}
export function parseQueueFilters(input){const ids=['team_id','owner_id'].map(k=>input[k]?positiveId(input[k]):null),kind=String(input.kind||'');if(!['','text','audio','image','video','file'].includes(kind))throw Error('Tipo inválido');const label=input.label_id?positiveId(input.label_id):null,read=String(input.read||'');if(!['','read','unread'].includes(read))throw Error('Leitura inválida');return [...ids,kind,label,read]}

const DEFAULT_ATTENDANCE_POLICY={release_mode:'manual',idle_minutes:30,presence_indicators:true};
export async function tickAttendancePolicy({q,tenantTransaction,bus}){
 const policy=(await q("select value from settings where key='attendance_policy'")).rows[0]?.value||DEFAULT_ATTENDANCE_POLICY;
 if(policy.release_mode!=='after_idle')return 0;
 const minutes=Math.max(5,Math.min(10080,Number(policy.idle_minutes)||30));
 const released=await tenantTransaction((await q("select current_setting('app.tenant')::int tenant")).rows[0]?.tenant,async query=>(await query(
  "with stale as (select id from conversations where status='open' and filing='active' and assignee_id is not null and last_at < now()-($1::int*interval '1 minute') order by last_at asc for update skip locked limit 100) update conversations c set assignee_id=null from stale where c.id=stale.id returning c.id",
  [minutes])).rows);
 for(const c of released)bus('conv',{id:c.id});
 return released.length;
}
export function mountAttendanceManagement(app,{ah,q,tenantTransaction,bus}){
 app.get('/api/attendance/policy',ah(async(req,res)=>{
  const value=(await q("select value from settings where key='attendance_policy'")).rows[0]?.value||DEFAULT_ATTENDANCE_POLICY;
  res.json({...DEFAULT_ATTENDANCE_POLICY,...value});
 }));
 app.put('/api/attendance/policy',ah(async(req,res)=>{
  if(!adminRole(req.u))return res.status(403).json({error:'Somente proprietários e administradores podem configurar as regras.'});
  const mode=String(req.body.release_mode||'manual'),minutes=Number(req.body.idle_minutes),presence=req.body.presence_indicators;
  if(!['manual','after_idle'].includes(mode))throw Error('Modo de liberação inválido');
  if(!Number.isInteger(minutes)||minutes<5||minutes>10080)throw Error('O tempo deve estar entre 5 minutos e 7 dias.');
  if(typeof presence!=='boolean')throw Error('Configuração de indicadores inválida.');
  const value={release_mode:mode,idle_minutes:minutes,presence_indicators:presence};
  await q("insert into settings(key,value) values('attendance_policy',$1::jsonb) on conflict(tenant_id,key) do update set value=excluded.value",[JSON.stringify(value)]);
  res.json(value);
 }));
 app.get('/api/attendance/alerts',ah(async(req,res)=>{res.json((await q(`select c.id,c.protocol,c.unread,coalesce((select max(m.id) from messages m where m.conversation_id=c.id and m.dir='in'),0) as incoming_id from conversations c where ${accessPredicate('c','$1')} and ${queuePredicate('c','$1',"'mine'")}`,[req.u.id])).rows)}));
 app.get('/api/attendance/counts',ah(async(req,res)=>{const channel=req.query.channel_id||'',search=String(req.query.q||'').slice(0,200);if(channel&&!/^\\d+$/.test(channel))throw Error('Inbox inválida');const extra=parseQueueFilters(req.query);const rows=(await q(`select s.scope,count(c.id)::int total from unnest(array['new','mine','others','closed','archived','deleted']) s(scope) left join (conversations c join contacts ct on ct.id=c.contact_id) on ${accessPredicate('c','$1')} and ${queuePredicate('c','$1','s.scope')} and ($2::int is null or c.channel_id=$2) and ($3='' or ct.name ilike '%'||$3||'%' or ct.handle ilike '%'||$3||'%' or c.protocol ilike '%'||regexp_replace($3,'^NX-','VX-','i')||'%' or c.id::text=ltrim(ltrim($3,'#'),'0') or exists(select 1 from messages fm where fm.conversation_id=c.id and fm.dir<>'int' and fm.body ilike '%'||$3||'%')) and ${extraQueueFilters('c','$4','$5','$6','$7','$8')} group by s.scope`,[req.u.id,channel||null,search,...extra])).rows;res.json(Object.fromEntries(rows.map(r=>[r.scope,r.total])))}));
 app.post('/api/conversations/:id/filing',ah(async(req,res)=>{requireAction(req.u,'close');const state=req.body.state;if(!['active','archived','deleted'].includes(state))throw Error('Destino inválido');await tenantTransaction(req.u.tid,async query=>{const c=await conversationFor(query,positiveId(req.params.id),req.u.id,{control:true,lock:true});if((state==='deleted'||c.filing==='deleted')&&!adminRole(req.u))throw Error('Somente administradores removem ou restauram conversas da lixeira');if(state!=='active'&&c.status!=='closed')throw Error('Finalize o atendimento antes de arquivar ou mover à lixeira');if(state==='deleted'&&String(req.body.confirm)!==String(c.id))throw Error('Digite o número do ticket para confirmar');const reason=text(req.body.reason,'Motivo',500);await query('update conversations set filing=$2,filed_at=now(),filed_by=$3,filing_reason=$4 where id=$1',[c.id,state,req.u.id,reason]);await serviceEvent(query,c.id,req.u.id,'conversation_filed',{from:c.filing,destination:state,reason})});bus('conv',{id:+req.params.id});res.json({ok:true})}));
 app.post('/api/conversations/:id/purge',ah(async(req,res)=>{
  if(!adminRole(req.u))throw Error('Somente administradores podem excluir definitivamente conversas');
  requireAction(req.u,'close');
  const id=positiveId(req.params.id);
  await tenantTransaction(req.u.tid,async query=>{
   const c=await conversationFor(query,id,req.u.id,{control:true,lock:true});
   if(c.filing!=='deleted')throw Error('Mova a conversa para a Lixeira antes de excluí-la definitivamente');
   if(c.status!=='closed')throw Error('Finalize o atendimento antes de excluir a conversa');
   if(String(req.body.confirm||'').trim()!==String(c.id))throw Error('Digite o número do ticket para confirmar a exclusão definitiva');
   const refs=(await query("select c.table_name from information_schema.columns c join information_schema.tables t on t.table_schema=c.table_schema and t.table_name=c.table_name where c.table_schema='public' and t.table_type='BASE TABLE' and c.column_name='conversation_id' order by case c.table_name when 'service_events' then 0 when 'jobs' then 1 when 'bot_runs' then 2 when 'messages' then 3 else 4 end,c.table_name")).rows;
   await query("delete from message_receipts where channel_id=$2 and external_id in (select ext_id from messages where conversation_id=$1 and ext_id is not null)",[id,c.channel_id]).catch(()=>{});
   for(const ref of refs){
    const table=String(ref.table_name).replace(/"/g,'""');
    if(['contact_notes','crm_cards'].includes(ref.table_name))await query('update "'+table+'" set conversation_id=null where conversation_id=$1',[id]);
    else await query('delete from "'+table+'" where conversation_id=$1',[id]);
   }
   await query('delete from conversations where id=$1',[id]);
  });
  bus('conv',{id,deleted:true});
  res.json({ok:true});
 }));
}
