import {q} from './db.js';import {payHook} from './ctx.js';import {setStage} from './core.js';
const cfg=async()=>(await q("select value from settings where key='pay'")).rows[0]?.value||{};
const J=async(u,h,b,form)=>{const r=await fetch(u,{method:'POST',headers:form?h:{'content-type':'application/json',...h},body:form?new URLSearchParams(b):JSON.stringify(b)});const j=await r.json();if(!r.ok)throw new Error(u+' '+JSON.stringify(j));return j};
export async function createPayment({contact_id,provider,amount,desc='Pagamento'}){const c=await cfg(),k=c[provider]||{};let ext,link;
 if(provider==='asaas'){const ct=(await q('select * from contacts where id=$1',[contact_id])).rows[0],H={access_token:k.key},base=k.sandbox?'https://sandbox.asaas.com/api/v3':'https://api.asaas.com/v3';
  const cu=await J(base+'/customers',H,{name:ct.name||'Cliente',cpfCnpj:ct.data?.cpf||undefined,mobilePhone:ct.handle});
  const p=await J(base+'/payments',H,{customer:cu.id,billingType:'UNDEFINED',value:amount,dueDate:new Date(Date.now()+864e5).toISOString().slice(0,10),description:desc});ext=p.id;link=p.invoiceUrl}
 else if(provider==='mercadopago'){const p=await J('https://api.mercadopago.com/checkout/preferences',{authorization:'Bearer '+k.token},{items:[{title:desc,quantity:1,unit_price:+amount,currency_id:k.currency||'BRL'}],notification_url:payHook('mercadopago')});ext=p.id;link=p.init_point}
 else if(provider==='stripe'){const p=await J('https://api.stripe.com/v1/checkout/sessions',{authorization:'Bearer '+k.key},{mode:'payment','line_items[0][quantity]':'1','line_items[0][price_data][currency]':k.currency||'brl','line_items[0][price_data][unit_amount]':String(Math.round(amount*100)),'line_items[0][price_data][product_data][name]':desc,success_url:process.env.PUBLIC_URL||'https://example.com'},true);ext=p.id;link=p.url}
 else throw new Error('provedor não suportado (asaas|mercadopago|stripe)');
 return (await q('insert into payments(contact_id,provider,ext_id,amount,link) values($1,$2,$3,$4,$5) returning *',[contact_id,provider,ext,amount,link])).rows[0]}
export async function payWebhook(provider,b){let ext,ok=false;
 if(provider==='asaas'){ext=b.payment?.id;ok=['PAYMENT_RECEIVED','PAYMENT_CONFIRMED'].includes(b.event)}
 else if(provider==='stripe'){ext=b.data?.object?.id;ok=b.type==='checkout.session.completed'}
 else if(provider==='mercadopago'){ext=b.data?.id;ok=false} // MP: confirme consultando /v1/payments/{id}; mapeie preference→payment conforme sua conta
 if(!ext||!ok)return;const p=(await q("update payments set status='pago' where ext_id=$1 returning *",[ext])).rows[0];if(!p)return;
 const cv=(await q('select id from conversations where contact_id=$1 order by id desc limit 1',[p.contact_id])).rows[0],st=(await q("select id from stages where kind='won' order by pos limit 1")).rows[0];
 if(cv&&st)await setStage(cv.id,st.id)}
