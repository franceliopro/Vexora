import {conversationFor} from './conversation-policy.js';
export const RECEIPT_RANK={failed:0,sent:1,delivered:2,read:3};
export function baileysReceipt(status){return ({0:'failed',2:'sent',3:'delivered',4:'read',5:'read'})[status]||null}
export function wahaReceipt(ack){return ({'-1':'failed',1:'sent',2:'delivered',3:'read',4:'read'})[ack]||null}
export async function recordReceipt(query,notify,channel_id,external_id,status){
 if(typeof external_id!=='string'||!external_id||external_id.length>512||!Object.hasOwn(RECEIPT_RANK,status))return;
 const saved=(await query(`insert into message_receipts(channel_id,external_id,status,rank) values($1,$2,$3,$4) on conflict(tenant_id,channel_id,external_id) do update set status=excluded.status,rank=excluded.rank,updated_at=now() where
 (excluded.rank>message_receipts.rank and not(message_receipts.status='failed' and excluded.status='sent')) or
 (excluded.status='failed' and message_receipts.rank<2 and message_receipts.status<>'failed') returning status,updated_at`,[channel_id,external_id,status,RECEIPT_RANK[status]])).rows[0];
 if(!saved)return;
 const messages=(await query("select m.id,m.conversation_id from messages m join conversations c on c.id=m.conversation_id where c.channel_id=$1 and m.ext_id=$2 and m.dir='out'",[channel_id,external_id])).rows;
 for(const m of messages)notify('message_delivery',{conversation_id:m.conversation_id,message_id:m.id,status:saved.status,updated_at:saved.updated_at});
}
export function mountMessageReceipts(app,{ah,q}){
 app.get('/api/conversations/:id/delivery',ah(async(req,res)=>{
  const cv=await conversationFor(q,+req.params.id,req.u.id);
  const raw=String(req.query.ids||'').split(',');if(!raw.length||raw.length>30||raw.some(id=>!/^\d{1,18}$/.test(id)))throw Error('Mensagens inválidas');
  const rows=(await q(`select m.id,m.at,case when r.status is not null then r.status when m.ext_id is not null and m.ext_id<>'' then 'sent' else 'unknown' end status,r.updated_at
   from messages m join conversations c on c.id=m.conversation_id left join message_receipts r on r.channel_id=c.channel_id and r.external_id=m.ext_id
   where m.conversation_id=$1 and m.dir='out' and m.id=any($2::bigint[]) order by m.id`,[cv.id,raw])).rows;
  res.json(rows);
 }));
}
