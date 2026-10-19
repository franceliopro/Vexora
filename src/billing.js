import {q} from './db.js';import {deliver,convFor} from './core.js';import {createPayment} from './payments.js';import {planCharges,planReminders,DEFAULT_RULES,money,fdate,tpl} from './lib.js';
const get=async k=>(await q('select value from settings where key=$1',[k])).rows[0]?.value;
const put=(k,v)=>q('insert into settings(key,value) values($1,$2) on conflict(tenant_id,key) do update set value=$2',[k,JSON.stringify(v)]);
const last={};
export async function billingTick(tid,force=false){if(!force&&Date.now()-(last[tid]||0)<6e5)return;last[tid]=Date.now();
 const tz=(await get('tz'))||'America/Sao_Paulo',td=new Date().toLocaleDateString('sv-SE',{timeZone:tz}),hr=+new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour:'2-digit',hour12:false}).format(new Date()),cfg=(await get('billing'))||{};
 if(!force&&(hr<(cfg.hour??9)||(await get('billing_last'))===td))return;
 const rules=cfg.rules?.length?cfg.rules:DEFAULT_RULES,subs=(await q('select * from subscriptions where active')).rows,rep={criadas:0,enviadas:0,erros:0};
 const have=new Set((await q('select subscription_id,due_date from charges')).rows.map(r=>r.subscription_id+'|'+r.due_date));
 for(const {sub,due} of planCharges(subs,have,td,rules)){let ext=null,link=null;
  if(sub.provider)try{const p=await createPayment({contact_id:sub.contact_id,provider:sub.provider,amount:sub.amount,desc:`${sub.description||'Mensalidade'} ${fdate(due)}`,dueDate:due});ext=p.ext_id;link=p.link}catch(e){rep.erros++;console.error('cobrança',e.message)}
  await q('insert into charges(subscription_id,contact_id,description,amount,due_date,ext_id,link) values($1,$2,$3,$4,$5,$6,$7) on conflict do nothing',[sub.id,sub.contact_id,sub.description,sub.amount,due,ext,link]);rep.criadas++}
 const subR=Object.fromEntries(subs.map(s=>[s.id,s.rules])),pend=(await q(`select c.*,ct.name cname from charges c join contacts ct on ct.id=c.contact_id where c.status='pendente' and c.due_date>=$1::date-15`,[td])).rows.map(c=>({...c,rules:subR[c.subscription_id]}));
 for(const {charge:c,rule:r} of planReminders(pend,td,rules)){try{const cv=await convFor(c.contact_id);
  await deliver(cv.id,{body:tpl(r.text,{nome:String(c.cname||'').split(' ')[0],valor:money(c.amount),vencimento:fdate(c.due_date),descricao:c.description||'Mensalidade',link:c.link||''}).trim()});
  await q('update charges set sent=sent||$2::jsonb where id=$1',[c.id,JSON.stringify([r.offset])]);rep.enviadas++}catch(e){rep.erros++;console.error('lembrete',e.message)}}
 if(!force)await put('billing_last',td);return {...rep,hoje:td}}
