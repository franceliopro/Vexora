import {digits,validDoc} from './lib.js';
import {q} from './db.js';import {payHook} from './ctx.js';import {setStage} from './core.js';
const cfg=async()=>(await q("select value from settings where key='pay'")).rows[0]?.value||{};
const J=async(u,h,b,form)=>{const r=await fetch(u,{method:'POST',headers:form?h:{'content-type':'application/json',...h},body:form?new URLSearchParams(b):JSON.stringify(b)});const j=await r.json();if(!r.ok)throw new Error(u+' '+JSON.stringify(j));return j};
export async function createPayment({contact_id,provider,amount,desc='Pagamento',dueDate,doc,platform}){amount=Number(amount);if(!Number.isFinite(amount)||amount<=0||amount>1000000||Math.abs(amount*100-Math.round(amount*100))>0.00001)throw new Error('Valor inválido');if(dueDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)||new Date(dueDate+'T00:00:00Z').toISOString().slice(0,10)!==dueDate))throw new Error('Vencimento inválido');const c=await cfg(),k=c[provider]||{};let ext,link;
 if(provider==='asaas'){const ak=asaasConfig(c,platform),ct=(await q('select * from contacts where id=$1',[contact_id])).rows[0];if(!ct)throw new Error('Contato não encontrado');const document=digits(doc||ct.data?.cpf||ct.data?.cnpj||'');if(!validDoc(document))throw new Error('Informe CPF/CNPJ válido');const H={access_token:ak.key,'user-agent':'Nexora'},base=aBase(ak);
  const found=(await aGet(ak,'/customers?cpfCnpj='+encodeURIComponent(document)+'&limit=100')).data||[];let customer=found.find(x=>digits(x.cpfCnpj)===document)?.id;
  if(!customer)customer=(await J(base+'/customers',H,{name:ct.name||'Cliente',cpfCnpj:document,mobilePhone:digits(ct.handle)})).id;
  const p=await J(base+'/payments',H,{customer,billingType:'UNDEFINED',value:amount,dueDate:dueDate||new Date(Date.now()+864e5).toISOString().slice(0,10),description:desc});ext=p.id;link=p.invoiceUrl;if(!ext||!link)throw new Error('Cobrança criada sem identificador/fatura; confira no Asaas antes de tentar novamente')}
 else if(provider==='mercadopago'){const p=await J('https://api.mercadopago.com/checkout/preferences',{authorization:'Bearer '+k.token},{items:[{title:desc,quantity:1,unit_price:+amount,currency_id:k.currency||'BRL'}],notification_url:payHook('mercadopago')});ext=p.id;link=p.init_point}
 else if(provider==='stripe'){const p=await J('https://api.stripe.com/v1/checkout/sessions',{authorization:'Bearer '+k.key},{mode:'payment','line_items[0][quantity]':'1','line_items[0][price_data][currency]':k.currency||'brl','line_items[0][price_data][unit_amount]':String(Math.round(amount*100)),'line_items[0][price_data][product_data][name]':desc,success_url:process.env.PUBLIC_URL||'https://example.com'},true);ext=p.id;link=p.url}
 else throw new Error('provedor não suportado (asaas|mercadopago|stripe)');
 return (await q('insert into payments(contact_id,provider,ext_id,amount,link) values($1,$2,$3,$4,$5) returning *',[contact_id,provider,ext,amount,link])).rows[0]}
export async function payWebhook(provider,b){let ext,ok=false;
 if(provider==='asaas'){ext=b.payment?.id;ok=['PAYMENT_RECEIVED','PAYMENT_CONFIRMED'].includes(b.event)}
 else if(provider==='stripe'){ext=b.data?.object?.id;ok=b.type==='checkout.session.completed'}
 else if(provider==='mercadopago'){ext=b.data?.id;ok=false} // MP: confirme consultando /v1/payments/{id}; mapeie preference→payment conforme sua conta
 if(!ext||!ok)return;await q("update charges set status='pago',paid_at=now() where ext_id=$1",[ext]);const p=(await q("update payments set status='pago' where ext_id=$1 returning *",[ext])).rows[0];if(!p)return;
 const cv=(await q('select id from conversations where contact_id=$1 order by id desc limit 1',[p.contact_id])).rows[0],st=(await q("select id from stages where kind='won' order by pos limit 1")).rows[0];
 if(cv&&st)await setStage(cv.id,st.id)}

// Asaas v3: official API contracts reviewed; sandbox credentials still required for live validation.
export const aBase=k=>k.sandbox?'https://api-sandbox.asaas.com/v3':'https://api.asaas.com/v3';
export function asaasConfig(c,platform){const root=c.asaas||{},override=platform&&root.platforms?.[platform];const k=override?{...root,...override}:root;if(!k.key)throw new Error('Asaas não configurado para esta plataforma');return k}
const aGet=async(k,p)=>{const r=await fetch(aBase(k)+p,{headers:{access_token:k.key,'user-agent':'Nexora'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Asaas '+r.status);return r.json()};
export function samePhone(a,b){const normalize=v=>{let n=digits(String(v||'').split('@')[0]);if(n.length===12||n.length===13){if(n.startsWith('55'))n=n.slice(2)}return n};const x=normalize(a),y=normalize(b);return x.length>=10&&x===y}
export async function asaasDebts(doc,{platform,verifyPhone=false,phone}={}){const k=asaasConfig(await cfg(),platform);if(!validDoc(doc))throw new Error('Documento inválido');
 const cs=(await aGet(k,'/customers?cpfCnpj='+encodeURIComponent(digits(doc))+'&limit=100')).data||[];let customers=cs.filter(c=>digits(c.cpfCnpj)===digits(doc));if(verifyPhone){customers=customers.filter(c=>samePhone(c.mobilePhone,phone)||samePhone(c.phone,phone));if(!customers.length)throw new Error('Não foi possível confirmar o telefone do titular; encaminhe ao financeiro')}
 const debts=[];for(const c of customers.slice(0,3))for(const status of ['OVERDUE','PENDING']){for(let offset=0;offset<500;offset+=100){const result=await aGet(k,`/payments?customer=${encodeURIComponent(c.id)}&status=${status}&limit=100&offset=${offset}`);for(const p of result.data||[])debts.push({id:p.id,value:p.value,dueDate:p.dueDate,status:p.status,description:p.description,invoiceUrl:p.invoiceUrl,bankSlipUrl:p.bankSlipUrl});if(!result.hasMore)break;if(offset===400)throw new Error('Muitos débitos: atendimento financeiro necessário')}}
 debts.sort((a,b)=>String(a.dueDate).localeCompare(b.dueDate));return {name:customers[0]?.name||'',debts}}
export async function asaasPay(id,{platform}={}){if(!/^pay_[a-zA-Z0-9_-]+$/.test(id))throw new Error('Cobrança inválida');const k=asaasConfig(await cfg(),platform);const [p,l,x]=await Promise.all([aGet(k,'/payments/'+id),aGet(k,`/payments/${id}/identificationField`).catch(()=>null),aGet(k,`/payments/${id}/pixQrCode`).catch(()=>null)]);
 return {invoiceUrl:p.invoiceUrl,bankSlipUrl:p.bankSlipUrl,identificationField:l?.identificationField,pixPayload:x?.payload}}
