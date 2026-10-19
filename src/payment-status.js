// Called inside a tenant transaction after provider signature/environment validation.
export async function settlePayment(query,provider,body,environment){
 const ext=provider==='asaas'?body.payment?.id:body.data?.object?.id;
 const paid=provider==='asaas'?['PAYMENT_RECEIVED','PAYMENT_CONFIRMED'].includes(body.event):provider==='stripe'&&['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(body.type)&&body.data?.object?.payment_status==='paid';
 if(!ext||!paid||!environment)return null;
 const p=(await query("update payments set status='pago' where provider=$1 and ext_id=$2 and environment=$3 and status<>'pago' returning *",[provider,ext,environment])).rows[0];if(!p)return null;
 await query("update charges set status='pago',paid_at=now() where ext_id=$1 and contact_id=$2 and status<>'pago'",[ext,p.contact_id]);
 if(p.conversation_id){const message=(await query("insert into messages(conversation_id,dir,kind,body) values($1,'int','note',$2) returning *",[p.conversation_id,'Pagamento confirmado · '+Number(p.amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+' · '+(provider==='asaas'?'Asaas':'Stripe')])).rows[0];await query("insert into service_events(conversation_id,type,data) values($1,'payment_confirmed',$2)",[p.conversation_id,JSON.stringify({payment_id:p.id,provider,amount:p.amount,environment})]);return {payment:p,message}}
 return {payment:p};
}
