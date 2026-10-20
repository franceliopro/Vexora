export function paymentConfirmation(p){const test=['sandbox','test'].includes(p.environment);return (test?'TESTE · Sem pagamento real\n\n':'')+'✅ Pagamento confirmado!\nValor: '+Number(p.amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+'\nReferência: '+p.ext_id+'\n\nObrigado! A confirmação desta cobrança já está registrada no seu atendimento.'}
// Each payment is claimed before contacting a network. An ambiguous send is never replayed blindly.
export async function tickPaymentNotifications({q,deliver}){
 await q("update payments set notification_status='check_required',notification_detail='Envio interrompido; confira o histórico antes de reenviar' where notification_status='sending' and notification_at<now()-interval '5 minutes'");
 const rows=(await q("select * from payments where notification_status='pending' order by id limit 50")).rows;
 for(const p of rows){const cv=(await q('select c.*,ch.active channel_active from conversations c join channels ch on ch.id=c.channel_id where c.id=$1',[p.conversation_id])).rows[0];
 if(!cv||!cv.channel_active||(cv.filing&&cv.filing!=='active')){await q("update payments set notification_status='blocked',notification_detail='Atendimento indisponível, arquivado ou inbox pausada' where id=$1 and notification_status='pending'",[p.id]);continue}
 const claimed=await q("update payments set notification_status='sending',notification_at=now() where id=$1 and notification_status='pending' returning id",[p.id]);if(!claimed.rows.length)continue;
 try{const msg=await deliver(p.conversation_id,{body:p.notification_body||paymentConfirmation(p),system:true,executor:'system'});if(!msg?.id)throw Error('Envio não confirmado');await q("update payments set notification_status='sent',notification_detail=null,notification_at=now() where id=$1",[p.id]);await q("insert into service_events(conversation_id,type,data) values($1,'payment_notification_sent',$2)",[p.conversation_id,JSON.stringify({payment_id:p.id,message_id:msg.id})])}
 catch{await q("update payments set notification_status='check_required',notification_detail='Confira o histórico, a conexão e a janela de mensagens da rede antes de reenviar' where id=$1",[p.id]);await deliver(p.conversation_id,{kind:'note',body:'Pagamento confirmado, mas o aviso ao cliente precisa ser conferido. Consulte Pagamentos → Confirmações automáticas.',system:true}).catch(()=>{})}
 }
}
