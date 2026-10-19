import {q} from './db.js';import {bus} from './bus.js';import {money,ticketLines,renderEsc,renderText,tpl} from './lib.js';
const set=async k=>(await q('select value from settings where key=$1',[k])).rows[0]?.value;
export const DMSG={preparando:'👨‍🍳 Seu pedido #{{n}} está sendo preparado!',pronto:'✅ Seu pedido #{{n}} está pronto!',saiu:'🛵 Seu pedido #{{n}} saiu para entrega!',entregue:'Pedido #{{n}} entregue. Bom apetite! 😋',cancelado:'Seu pedido #{{n}} foi cancelado. Qualquer dúvida, é só chamar.'};
export async function menuFor(){const cfg=(await set('delivery'))||{};
 const cats=(await q('select * from menu_categories order by pos,id')).rows,items=(await q('select * from menu_items where active order by id')).rows;
 return {categories:cats.map(c=>({id:c.id,name:c.name,items:items.filter(i=>i.category_id===c.id)})),zones:(await q('select * from delivery_zones where active order by name')).rows,pay_methods:cfg.pay_methods?.length?cfg.pay_methods:['Pix','Cartão na entrega','Dinheiro'],pix_key:cfg.pix_key||''}}
// Preços SEMPRE recalculados no servidor a partir do cardápio (o cliente só manda ids/quantidades).
export async function createOrder(o,{external=false}={}){let items=[],subtotal=0,fee=0;
 if(external){items=(o.items||[]).map(i=>({qty:+i.qty||1,name:String(i.name||'Item'),total:+i.total||0,addons:i.addons||[]}));fee=+o.delivery_fee||0;subtotal=items.reduce((a,i)=>a+i.total,0)||Math.max((+o.total||0)-fee,0)}
 else{const ids=[...new Set((o.items||[]).map(i=>+i.item_id))].filter(Boolean),rows=ids.length?(await q('select * from menu_items where id=any($1) and active',[ids])).rows:[],M=Object.fromEntries(rows.map(r=>[r.id,r]));
  for(const i of o.items||[]){const m=M[+i.item_id];if(!m)throw new Error('item indisponível');const qty=Math.min(Math.max(parseInt(i.qty)||1,1),99);let unit=+m.price,vn=null;const vs=m.variants||[];
   if(vs.length){const v=vs.find(x=>x.name===i.variant)||(vs.length===1?vs[0]:null);if(!v)throw new Error('escolha o tamanho de '+m.name);unit=+v.price;vn=v.name}
   const ad=(i.addons||[]).map(n=>(m.addons||[]).find(x=>x.name===n)).filter(Boolean),total=(unit+ad.reduce((a,x)=>a+ +x.price,0))*qty;
   items.push({item_id:m.id,name:m.name,variant:vn,qty,unit,addons:ad.map(x=>({name:x.name,price:+x.price})),total});subtotal+=total}
  if(o.kind==='entrega'){if(!o.address)throw new Error('informe o endereço');const zs=(await q('select * from delivery_zones where active')).rows;
   if(zs.length){const z=zs.find(x=>x.name===o.zone);if(!z)throw new Error('região não atendida');if(subtotal<+z.min_order)throw new Error('pedido mínimo '+money(z.min_order));fee=+z.fee}}}
 if(!items.length)throw new Error('pedido vazio');
 const kind=['entrega','retirada','balcao','mesa'].includes(o.kind)?o.kind:'balcao';let row;
 for(let t=0;t<4;t++){try{row=(await q(`insert into orders(number,source,kind,contact_id,table_no,customer_name,customer_phone,address,zone,items,subtotal,delivery_fee,total,payment_method,paid,notes,ext_id)
   values((select coalesce(max(number),0)+1 from orders),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning *`,
   [o.source||(external?'externo':'painel'),kind,o.contact_id||null,o.table_no||null,o.customer_name||null,o.customer_phone||null,o.address||null,o.zone||null,JSON.stringify(items),subtotal,fee,subtotal+fee,o.payment_method||null,!!o.paid,o.notes||null,o.ext_id||null])).rows[0];break}
  catch(e){if(e.code!=='23505'||t===3)throw e}}
 bus('order',{id:row.id});if((await set('delivery'))?.auto_print)await enqueuePrint(row).catch(e=>console.error('print',e.message));return row}
export async function ticketFor(o){const c=(await set('delivery'))||{};const cols=+c.cols||48;return {L:ticketLines(o,{name:c.name,footer:c.footer},cols),cols}}
export async function enqueuePrint(o){const {L}=await ticketFor(o);await q('insert into print_jobs(order_id,data) values($1,$2)',[o.id,renderEsc(L)])}
export async function ticketText(o){const {L,cols}=await ticketFor(o);return renderText(L,cols)}
export async function notifyStatus(o,deliver,convFor){if(!o.contact_id)return;const c=(await set('delivery'))||{},t=(c.msgs||{})[o.status]??DMSG[o.status];if(!t)return;
 const cv=await convFor(o.contact_id);await deliver(cv.id,{body:tpl(t,{n:o.number})})}
