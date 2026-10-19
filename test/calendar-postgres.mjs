import {mountServiceCalendar,mountCalendarPublic,calendarICS} from '../src/service-calendar.js';
import {mountOperations,validFields} from '../src/operations.js';import {mountCRM,expireCards,boardFor} from '../src/crm.js';
import {companyTimeZone,saveTimeZone} from '../src/timezone.js';
// Disposable PostgreSQL/WASM check. Requires PGLITE_MODULE and PGLITE_VECTOR_MODULE; no production database is used.
import assert from 'node:assert/strict';import fs from 'node:fs';import express from 'express';
import {mountConversationActions} from '../src/conversation-actions.js';import {conversationFor} from '../src/conversation-policy.js';import {installTemplate} from '../src/product.js';
const {PGlite}=await import(process.env.PGLITE_MODULE),{vector}=await import(process.env.PGLITE_VECTOR_MODULE),db=new PGlite({extensions:{vector}});await db.waitReady;
for(const name of fs.readdirSync('db/migrations').sort())await db.exec(fs.readFileSync('db/migrations/'+name,'utf8'));
await db.exec("create role nexora_app nosuperuser nobypassrls;grant usage on schema public to nexora_app;grant select,insert,update,delete on all tables in schema public to nexora_app;grant usage,select on all sequences in schema public to nexora_app;insert into tenants(id,name,slug) values(1,'A','a'),(2,'B','b');set role nexora_app");
const tx=(tid,fn)=>db.transaction(async t=>{await t.query("select set_config('app.tenant',$1,true)",[String(tid)]);return fn((sql,p)=>t.query(sql,p))}),q=(sql,p)=>tx(1,query=>query(sql,p));
await tx(1,async query=>{await query("insert into users(id,name,role) values(1,'Ana','agent'),(2,'Bia','agent'),(3,'Caio','agent'),(4,'Dono','owner')");await query("insert into channels(id,name,driver) values(1,'Canal A','waha')");await query("insert into contacts(id,name,handle,channel_id) values(1,'Cliente','5511999999999',1)");await installTemplate(query,'rastreamento_veicular');await query('insert into team_members(team_id,user_id) values(1,1),(1,2),(2,3)');await query('insert into conversations(id,contact_id,channel_id,team_id) values(1,1,1,1)')});
await tx(2,async query=>{await query("insert into users(id,name,role) values(20,'Outro','agent')");await query("insert into teams(id,name) values(20,'Outra')")});
assert.equal((await q('select * from teams')).rows.length,8);assert.equal((await q('select * from users where id=20')).rows.length,0);
await assert.rejects(()=>q('insert into conversation_team_participants(conversation_id,team_id) values(1,20)'),/referência inválida/);
await tx(1,query=>saveTimeZone(query,'America/Cuiaba'));await tx(2,query=>saveTimeZone(query,'America/Sao_Paulo'));assert.equal(await tx(1,companyTimeZone),'America/Cuiaba');assert.equal(await tx(2,companyTimeZone),'America/Sao_Paulo');
const app=express();app.use(express.json());app.use((req,res,next)=>{req.u={tid:1,id:Number(req.headers['x-test-user']||1),name:'Teste',role:'agent',permissions:{}};next()});const ah=fn=>(req,res)=>Promise.resolve(fn(req,res)).catch(e=>res.status(e.status||400).json({error:e.message}));mountConversationActions(app,{ah,q,tenantTransaction:tx,bus:()=>{},deliver:async()=>{},createPayment:async()=>{throw Error('Não utilizado')}});
const admin=(req,res,next)=>[4].includes(req.u.id)?next():res.status(403).json({error:'administrador'});app.use((req,res,next)=>{req.u.role=req.u.id===4?'owner':'agent';next()});mountOperations(app,{ah,adm:admin,q,tenantTransaction:tx,bus:()=>{}});mountCRM(app,{ah,adm:admin,q,tenantTransaction:tx,bus:()=>{},deliver:async()=>{}});
process.env.GCAL_CLIENT_ID='test-client';process.env.GCAL_CLIENT_SECRET='test-secret';process.env.PUBLIC_URL='https://nexora.test';mountCalendarPublic(app,{ah,tenantTransaction:tx});const sent=[];mountServiceCalendar(app,{ah,q,tenantTransaction:tx,bus:()=>{},deliver:async(cid,m)=>{sent.push({cid,...m});return {id:sent.length}}});
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
const request=async(path,body={},user=1)=>{const r=await fetch(base+'/api/conversations/1/'+path,{method:'POST',headers:{'content-type':'application/json','x-test-user':String(user)},body:JSON.stringify(body)});return {status:r.status,data:await r.json()}};

const call=async(path,method='GET',body,user=4)=>{const r=await fetch(base+'/api/'+path,{method,headers:{'content-type':'application/json','x-test-user':String(user)},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()}};
try{
 await request('claim');
 const cal=await call('service-calendars','POST',{name:'Equipe',scope:'shared',member_ids:[1,2]});assert.equal(cal.status,200,JSON.stringify(cal));const cid=cal.data.id;
 assert.equal((await call('service-calendars','POST',{name:'Negada',scope:'shared'},1)).status,400);
 const hidden=await call('service-calendars','POST',{name:'Pessoal',scope:'personal'},2);assert.equal(hidden.status,200);
 const visible=await call('service-calendars','GET',undefined,1);assert.equal(visible.data.calendars.some(c=>c.id===hidden.data.id),false);assert.equal(visible.data.calendars.some(c=>Object.hasOwn(c,'refresh_secret')),false);
 const b={request_id:'11111111-1111-4111-8111-111111111111',calendar_id:cid,responsible_id:1,title:'Visita técnica',start:'2026-10-22T14:00:00Z',end:'2026-10-22T14:30:00Z',time_zone:'America/Cuiaba'};
 const created=await call('conversations/1/appointments','POST',b,1);assert.equal(created.status,200,JSON.stringify(created));assert.equal((await call('conversations/1/appointments','POST',b,1)).status,200);assert.equal((await q('select * from service_appointments')).rows.length,1);
 assert.equal((await call('conversations/1/appointments','POST',{...b,request_id:'22222222-2222-4222-8222-222222222222'},1)).status,400);
 assert.equal((await call('conversations/1/appointments','POST',{...b,title:'Alterado'},1)).status,400);
 assert.equal((await call('conversations/1/appointments','POST',{...b,request_id:'33333333-3333-4333-8333-333333333333',calendar_id:hidden.data.id},1)).status,400);
 const id=b.request_id;assert.equal((await call('service-appointments/'+id+'/notify','POST',{},2)).status,403);assert.equal(sent.length,0);
 assert.equal((await call('service-appointments/'+id+'/notify','POST',{},1)).status,200);assert.equal((await call('service-appointments/'+id+'/notify','POST',{},1)).data.already_sent,true);assert.equal(sent.length,1);assert.match(sent[0].body,/10:00/);assert.match(sent[0].body,/Cuiaba/);
 assert.equal((await call('service-calendar/reports','GET',undefined,1)).status,400);const report=await call('service-calendar/reports?from=2026-10-01&to=2026-11-01');assert.equal(report.data[0].total,1);assert.equal(report.data[0].notified,1);
 assert.equal((await call('service-appointments/'+id,'PATCH',{status:'absent',reason:'Não compareceu'},1)).status,200);assert.equal((await q("select count(*)::int n from service_events where type like 'appointment_%'")).rows[0].n,3);
 const ics=calendarICS({...created.data,title:'Teste\nBEGIN:VEVENT, x; y'});assert.match(ics,/SUMMARY:Teste\\nBEGIN:VEVENT\\, x\\; y/);assert.equal(ics.match(/BEGIN:VEVENT/g).length,2);
 assert.equal((await tx(2,query=>query('select * from service_calendars'))).rows.length,0);assert.equal((await tx(2,query=>query('select * from service_appointments'))).rows.length,0);

 const realFetch=globalThis.fetch,googleEvents=new Map();let inserts=0;globalThis.fetch=async(url,options={})=>{const u=String(url);if(u==='https://oauth2.googleapis.com/token')return Response.json({refresh_token:'fake-refresh',access_token:'fake-access'});if(u.includes('www.googleapis.com/calendar/')){if(u.endsWith('/freeBusy'))return Response.json({calendars:{primary:{busy:[]}}});if(options.method==='POST'){const event=JSON.parse(options.body);googleEvents.set(event.id,event);inserts++;return Response.json(event)}const id=u.split('/').pop();return googleEvents.has(id)?Response.json(googleEvents.get(id)):Response.json({}, {status:404})}return realFetch(url,options)};
 try{
 const connected=await call('service-calendars/'+cid+'/google','POST',{});assert.equal(connected.status,200);const state=new URL(connected.data.url).searchParams.get('state');const cb=await fetch(base+'/calendar/google/callback?'+new URLSearchParams({state,code:'fake-code'}),{redirect:'manual'});assert.equal(cb.status,200);const secret=(await q('select refresh_secret from service_calendars where id=$1',[cid])).rows[0].refresh_secret;assert.ok(secret);assert.equal(secret.includes('fake-refresh'),false);
 assert.equal((await fetch(base+'/calendar/google/callback?'+new URLSearchParams({state,code:'fake-code'}),{redirect:'manual'})).status,400);
 const gb={...b,request_id:'44444444-4444-4444-8444-444444444444',start:'2026-10-23T14:00:00Z',end:'2026-10-23T14:30:00Z'};const ga=await call('conversations/1/appointments','POST',gb,1);assert.equal(ga.data.sync_state,'pending');assert.equal((await call('service-appointments/'+gb.request_id+'/notify','POST',{},1)).status,400);
 assert.equal((await call('service-appointments/'+gb.request_id+'/sync','POST',{},1)).status,200);assert.equal((await call('service-appointments/'+gb.request_id+'/sync','POST',{},1)).status,200);assert.equal(inserts,1);assert.equal((await call('service-appointments/'+gb.request_id+'/notify','POST',{},1)).status,200);
 }finally{globalThis.fetch=realFetch}
 console.log('OK: agenda individual/compartilhada, membros, RLS, conflitos, idempotência, confirmação única na conversa, fuso Cuiabá, resultado e relatório administrativo (transporte simulado).');
}finally{server.close();await db.close()}
