import express from 'express';import http from 'http';import {WebSocketServer} from 'ws';import jwt from 'jsonwebtoken';import bcrypt from 'bcryptjs';import path from 'path';import {fileURLToPath} from 'url';import {execFile} from 'child_process';
import {q,migrate,cols} from './db.js';import {bus,setWss} from './bus.js';import {inbound,deliver,startAll,setStage,D} from './core.js';import {tickFlows} from './flows.js';import {createPayment,payWebhook} from './payments.js';import {publishPost,publishAd,adInsights} from './social.js';import {VERT,applyVertical} from './verticals.js';import {ragAdd} from './ai/engine.js';import {createAppt,cancelAppt} from './gcal.js';import {MEDIA,saveMedia} from './media.js';
const SECRET=process.env.JWT_SECRET||'dev-secret',PUB=process.env.PUBLIC_URL||'http://localhost:3000';
const app=express();app.use(express.json({limit:'30mb'}));
app.use('/media',express.static(MEDIA));app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)),'../web')));
const ah=f=>(a,b,n)=>Promise.resolve(f(a,b,n)).catch(e=>{console.error(e);b.status(400).json({error:e.message})});
const auth=(req,res,next)=>{try{req.u=jwt.verify((req.headers.authorization||'').slice(7),SECRET);next()}catch{res.status(401).json({error:'auth'})}};
const adm=(req,res,next)=>['owner','admin'].includes(req.u.role)?next():res.status(403).json({error:'sem permissão'});
const tok=u=>jwt.sign({id:u.id,role:u.role,name:u.name},SECRET,{expiresIn:'30d'});
const T=['users','teams','channels','contacts','stages','agents','docs','appointments','flows','payments','catalog','posts','ads','orders'];
const ADM_T=['users','teams','channels','agents','stages','flows'];
const chk=t=>{if(!T.includes(t))throw new Error('tabela inválida');return t};
const ins=async(t,b)=>{const c=await cols(t);const k=Object.keys(b).filter(x=>c[x]&&x!=='id');const v=k.map(x=>c[x]==='jsonb'?JSON.stringify(b[x]):b[x]);return (await q(`insert into ${t}(${k.join()}) values(${k.map((_,i)=>'$'+(i+1))}) returning *`,v)).rows[0]};
const upd=async(t,id,b)=>{const c=await cols(t);const k=Object.keys(b).filter(x=>c[x]&&x!=='id');if(!k.length)return;return (await q(`update ${t} set ${k.map((x,i)=>x+'=$'+(i+2))} where id=$1 returning *`,[id,...k.map(x=>c[x]==='jsonb'?JSON.stringify(b[x]):b[x])])).rows[0]};
const clean=r=>{delete r.pass;return r};
// ---- público
app.get('/api/status',ah(async(_,res)=>res.json({setup:!(await q('select 1 from users limit 1')).rowCount})));
app.post('/api/setup',ah(async(req,res)=>{if((await q('select 1 from users limit 1')).rowCount)throw new Error('já configurado');const {name,email,pass,business}=req.body;
 const u=await ins('users',{name,email,pass:await bcrypt.hash(pass,10),role:'owner'});if(business)await q("update settings set value=value||$1 where key='brand'",[JSON.stringify({name:business})]);res.json({token:tok(u)})}));
app.post('/api/login',ah(async(req,res)=>{const u=(await q('select * from users where email=$1 and not is_ai',[req.body.email])).rows[0];if(!u||!await bcrypt.compare(req.body.pass||'',u.pass))throw new Error('credenciais inválidas');res.json({token:tok(u)})}));
app.get('/api/brand',ah(async(_,res)=>{const s=Object.fromEntries((await q("select * from settings where key in ('brand','vertical')")).rows.map(r=>[r.key,r.value]));res.json({...s.brand,vertical:s.vertical,labels:VERT[s.vertical]||VERT.geral,verticals:Object.keys(VERT)})}));
// ---- webhooks
app.post('/webhook/:drv/:id',ah(async(req,res)=>{res.sendStatus(200);const ch=(await q('select * from channels where id=$1',[req.params.id])).rows[0];if(!ch||!D[req.params.drv]?.parse)return;const m=await D[req.params.drv].parse(ch,req.body);if(m)await inbound(ch.id,m)}));
app.post('/webhook/pay/:p',ah(async(req,res)=>{res.sendStatus(200);await payWebhook(req.params.p,req.body)}));
// pedidos externos (iFood/Keeta/99Food/loja via parceiro ou n8n): {handle,name,items:[],total,ext_id}
app.post('/webhook/order/:source',ah(async(req,res)=>{const b=req.body,ch=(await q('select id from channels where active order by id limit 1')).rows[0];let ct=(await q('select * from contacts where handle=$1',[b.handle])).rows[0];
 if(!ct)ct=(await q('insert into contacts(name,handle,channel_id) values($1,$2,$3) returning *',[b.name||b.handle,b.handle,ch?.id])).rows[0];
 const o=await ins('orders',{source:req.params.source,contact_id:ct.id,items:b.items||[],total:b.total,ext_id:b.ext_id});bus('order',o);res.json(o)}));
// ---- autenticado
app.use('/api',auth);
app.get('/api/me',(req,res)=>res.json(req.u));
app.post('/api/upload',ah(async(req,res)=>{const {data,mime=''}=req.body;let buf=Buffer.from(data,'base64'),ext=(mime.split('/')[1]||'bin').split(';')[0];let f=saveMedia(buf,ext);
 if(mime.startsWith('audio')&&ext!=='ogg'){const o=f.replace(/\.\w+$/,'.ogg');await new Promise((ok,no)=>execFile('ffmpeg',['-y','-i',MEDIA+'/'+f,'-c:a','libopus',MEDIA+'/'+o],e=>e?no(e):ok()));f=o}res.json({file:f})}));
app.get('/api/t/:t',ah(async(req,res)=>{const t=chk(req.params.t);res.json((await q(`select * from ${t} order by id desc limit 500`)).rows.map(clean))}));
app.post('/api/t/:t',ah(async(req,res)=>{const t=chk(req.params.t);if(ADM_T.includes(t)&&!['owner','admin'].includes(req.u.role))throw new Error('sem permissão');
 const b=req.body;if(t==='users'&&b.pass)b.pass=await bcrypt.hash(b.pass,10);
 if(t==='docs'){await ragAdd(b.agent_id,b.title,b.content);return res.json({ok:1})}
 if(t==='appointments')return res.json(await createAppt({contact_id:b.contact_id,title:b.title,start:b.starts_at,minutes:b.minutes}));
 if(t==='payments')return res.json(await createPayment(b));
 res.json(clean(await ins(t,b)))}));
app.put('/api/t/:t/:id',ah(async(req,res)=>{const t=chk(req.params.t);if(ADM_T.includes(t)&&!['owner','admin'].includes(req.u.role))throw new Error('sem permissão');const b=req.body;if(t==='users'){if(b.pass)b.pass=await bcrypt.hash(b.pass,10);else delete b.pass}res.json(clean(await upd(t,req.params.id,b)))}));
app.delete('/api/t/:t/:id',ah(async(req,res)=>{const t=chk(req.params.t);if(t==='appointments')await cancelAppt(req.params.id);else{if(ADM_T.includes(t)&&req.u.role==='agent')throw new Error('sem permissão');await q(`delete from ${t} where id=$1`,[req.params.id])}res.json({ok:1})}));
app.put('/api/teams/:id/members',adm,ah(async(req,res)=>{await q('delete from team_members where team_id=$1',[req.params.id]);for(const u of req.body.user_ids)await q('insert into team_members values($1,$2)',[req.params.id,u]);res.json({ok:1})}));
app.get('/api/team_members',ah(async(_,res)=>res.json((await q('select * from team_members')).rows)));
app.put('/api/brand',adm,ah(async(req,res)=>{await q("update settings set value=$1 where key='brand'",[JSON.stringify(req.body)]);bus('brand',{});res.json({ok:1})}));
app.put('/api/vertical',adm,ah(async(req,res)=>{await applyVertical(req.body.name);bus('brand',{});res.json({ok:1})}));
app.get('/api/settings/:k',adm,ah(async(req,res)=>res.json((await q('select value from settings where key=$1',[req.params.k])).rows[0]?.value||{})));
app.put('/api/settings/:k',adm,ah(async(req,res)=>{if(['brand','vertical'].includes(req.params.k))throw new Error('use rota própria');await q('insert into settings values($1,$2) on conflict(key) do update set value=$2',[req.params.k,JSON.stringify(req.body)]);res.json({ok:1})}));
// canais
app.post('/api/channels/:id/connect',adm,ah(async(req,res)=>{const ch=(await q('select * from channels where id=$1',[req.params.id])).rows[0];await D[ch.driver].connect(ch,PUB);res.json({ok:1})}));
app.get('/api/channels/:id/qr',ah(async(req,res)=>{const ch=(await q('select * from channels where id=$1',[req.params.id])).rows[0];res.json({qr:await D[ch.driver].qr(ch)})}));
// conversas
app.get('/api/conversations',ah(async(req,res)=>{const {scope='mine',q:s=''}=req.query,me=req.u.id,all=scope==='all'&&['owner','admin'].includes(req.u.role);
 res.json((await q(`select c.*,ct.name cname,ct.handle,ct.data,ch.name chname,ch.driver,
 (select body from messages m where m.conversation_id=c.id and dir<>'int' order by at desc limit 1) last,
 (select coalesce(json_agg(user_id),'[]') from participants p where p.conversation_id=c.id) parts
 from conversations c join contacts ct on ct.id=c.contact_id join channels ch on ch.id=c.channel_id
 where ($1 or c.assignee_id=$2 or exists(select 1 from participants p where p.conversation_id=c.id and p.user_id=$2) or ($3='team' and (c.assignee_id is null or c.team_id in (select team_id from team_members where user_id=$2))))
 and ($4='' or ct.name ilike '%'||$4||'%' or ct.handle ilike '%'||$4||'%') order by c.last_at desc limit 200`,[all,me,scope,s])).rows)}));
app.get('/api/conversations/:id/messages',ah(async(req,res)=>{await q('update conversations set unread=0 where id=$1',[req.params.id]);res.json((await q('select * from messages where conversation_id=$1 order by at limit 500',[req.params.id])).rows)}));
app.post('/api/conversations/:id/send',ah(async(req,res)=>res.json(await deliver(+req.params.id,{...req.body,author_id:req.u.id}))));
app.patch('/api/conversations/:id',ah(async(req,res)=>{const id=+req.params.id,b=req.body;
 if('stage_id' in b){await setStage(id,b.stage_id);delete b.stage_id}
 if('assignee_id' in b){const u=(await q('select name from users where id=$1',[b.assignee_id])).rows[0];await deliver(id,{kind:'note',body:`${req.u.name} atribuiu a ${u?.name||'ninguém'}`,author_id:req.u.id});b.ai_on=false}
 if(b.ai_on&&!('agent_id' in b)){const a=(await q('select id from agents where active limit 1')).rows[0];if(a)b.agent_id=a.id;await deliver(id,{kind:'note',body:`${req.u.name} devolveu à IA`,author_id:req.u.id})}
 const r=await upd('conversations',id,b);bus('conv',{id});res.json(r)}));
app.post('/api/conversations/:id/invite',ah(async(req,res)=>{const id=+req.params.id,u=(await q('select name from users where id=$1',[req.body.user_id])).rows[0];await q('insert into participants values($1,$2) on conflict do nothing',[id,req.body.user_id]);await deliver(id,{kind:'note',body:`${req.u.name} convidou ${u.name}`,author_id:req.u.id});bus('conv',{id});res.json({ok:1})}));
// social
app.post('/api/posts/:id/publish',ah(async(req,res)=>{await publishPost(req.params.id);res.json({ok:1})}));
app.post('/api/ads/:id/publish',ah(async(req,res)=>{await publishAd(req.params.id);res.json({ok:1})}));
app.get('/api/ads/:id/insights',ah(async(req,res)=>res.json(await adInsights(req.params.id))));
app.get('/api/stats',ah(async(_,res)=>res.json({by_stage:(await q('select s.name,count(c.id)::int n,coalesce(sum(c.amount),0)::float total from stages s left join conversations c on c.stage_id=s.id group by s.id order by s.pos')).rows,
 msgs7:(await q("select to_char(at,'DD/MM') d,count(*)::int n,count(*) filter(where ai)::int ai from messages where at>now()-interval '7 days' and dir<>'int' group by 1 order by min(at)")).rows,
 paid:(await q("select coalesce(sum(amount),0)::float t from payments where status='pago'")).rows[0].t})));
const srv=http.createServer(app),wss=new WebSocketServer({noServer:true});setWss(wss);
srv.on('upgrade',(req,s,h)=>{try{jwt.verify(new URL(req.url,'http://x').searchParams.get('t'),SECRET);wss.handleUpgrade(req,s,h,w=>wss.emit('connection',w))}catch{s.destroy()}});
await migrate();startAll();setInterval(()=>tickFlows().catch(e=>console.error(e.message)),30000);
srv.listen(process.env.PORT||3000,()=>console.log('Nexora on :'+(process.env.PORT||3000)));
