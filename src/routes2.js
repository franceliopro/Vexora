import crypto from 'crypto';import {q} from './db.js';import {als} from './ctx.js';import {bus} from './bus.js';import {deliver,convFor} from './core.js';
import {createOrder,enqueuePrint,ticketText,notifyStatus} from './delivery.js';import {addLesson,generate,summary,upcoming} from './school.js';import {billingTick} from './billing.js';
const ST=['novo','preparando','pronto','saiu','entregue','cancelado'];
export function mount(app,{ah,adm}){
 app.post('/api/t/orders',ah(async(req,res)=>res.json(await createOrder(req.body))));
 app.put('/api/t/orders/:id',ah(async(req,res)=>{const old=(await q('select status from orders where id=$1',[req.params.id])).rows[0];if(!old)throw new Error('pedido não encontrado');
  const {status,paid,notes}=req.body;if(status&&!ST.includes(status))throw new Error('status inválido');
  const o=(await q('update orders set status=coalesce($2,status),paid=coalesce($3,paid),notes=coalesce($4,notes),updated_at=now() where id=$1 returning *',[req.params.id,status??null,paid??null,notes??null])).rows[0];
  bus('order',{id:o.id});if(status&&status!==old.status)notifyStatus(o,deliver,convFor).catch(e=>console.error('notify',e.message));res.json(o)}));
 app.post('/api/orders/:id/print',ah(async(req,res)=>{const o=(await q('select * from orders where id=$1',[req.params.id])).rows[0];if(!o)throw new Error('pedido não encontrado');await enqueuePrint(o);res.json({ok:1})}));
 app.get('/api/orders/:id/ticket',ah(async(req,res)=>{const o=(await q('select * from orders where id=$1',[req.params.id])).rows[0];if(!o)throw new Error('pedido não encontrado');res.json({text:await ticketText(o)})}));
 app.post('/api/t/lessons',ah(async(req,res)=>res.json(await addLesson(req.body))));
 app.get('/api/school/summary',ah(async(_,res)=>res.json(await summary())));
 app.get('/api/school/lessons',ah(async(req,res)=>res.json(await upcoming(req.query.days))));
 app.post('/api/school/generate',ah(async(req,res)=>res.json(await generate(req.body))));
 app.post('/api/billing/run',adm,ah(async(req,res)=>res.json(await billingTick(req.u.tid,true))));
 app.get('/api/print/config',adm,ah(async(req,res)=>{let v=(await q("select value from settings where key='print'")).rows[0]?.value;
  if(!v?.key){v={key:crypto.randomBytes(18).toString('hex')};await q("insert into settings(key,value) values('print',$1) on conflict(tenant_id,key) do update set value=$1",[JSON.stringify(v)])}
  res.json({key:v.key,tenant:req.u.tid})}));
 app.post('/api/print/rotate',adm,ah(async(req,res)=>{const v={key:crypto.randomBytes(18).toString('hex')};await q("insert into settings(key,value) values('print',$1) on conflict(tenant_id,key) do update set value=$1",[JSON.stringify(v)]);res.json({key:v.key,tenant:req.u.tid})}))}
// Agente de impressão (PC da loja): autentica por chave longa, só enxerga os cupons da própria empresa.
export function mountPublic(app,{ah,limit}){
 const guard=(req,res,next)=>als.run({tenant:+req.params.tid||0},async()=>{try{
  const ok=(await q('select 1 from tenants where id=$1 and active',[+req.params.tid])).rowCount,k=(await q("select value from settings where key='print'")).rows[0]?.value?.key||'',g=String(req.headers['x-print-key']||'');
  if(ok&&k.length>=16&&g.length===k.length&&crypto.timingSafeEqual(Buffer.from(g),Buffer.from(k)))return next();res.sendStatus(403)}catch{res.sendStatus(500)}});
 app.get('/print/:tid/next',guard,ah(async(req,res)=>{const j=(await q('select id,data from print_jobs where not printed order by id limit 1')).rows[0];j?res.json(j):res.sendStatus(204)}));
 app.post('/print/:tid/done/:id',guard,ah(async(req,res)=>{await q('update print_jobs set printed=true where id=$1',[+req.params.id]);await q('update orders set printed=true where id=(select order_id from print_jobs where id=$1)',[+req.params.id]);res.json({ok:1})}))}
