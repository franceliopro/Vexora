import {companyTimeZone,saveTimeZone} from '../src/timezone.js';
// Disposable PostgreSQL/WASM check. Requires PGLITE_MODULE and PGLITE_VECTOR_MODULE; no production database is used.
import assert from 'node:assert/strict';import fs from 'node:fs';import express from 'express';
import {mountConversationActions} from '../src/conversation-actions.js';import {conversationFor} from '../src/conversation-policy.js';import {installTemplate} from '../src/product.js';
const {PGlite}=await import(process.env.PGLITE_MODULE),{vector}=await import(process.env.PGLITE_VECTOR_MODULE),db=new PGlite({extensions:{vector}});await db.waitReady;
for(const name of fs.readdirSync('db/migrations').sort())await db.exec(fs.readFileSync('db/migrations/'+name,'utf8'));
await db.exec("create role nexora_app nosuperuser nobypassrls;grant usage on schema public to nexora_app;grant select,insert,update,delete on all tables in schema public to nexora_app;grant usage,select on all sequences in schema public to nexora_app;insert into tenants(id,name,slug) values(1,'A','a'),(2,'B','b');set role nexora_app");
const tx=(tid,fn)=>db.transaction(async t=>{await t.query("select set_config('app.tenant',$1,true)",[String(tid)]);return fn((sql,p)=>t.query(sql,p))}),q=(sql,p)=>tx(1,query=>query(sql,p));
await tx(1,async query=>{await query("insert into users(id,name,role) values(1,'Ana','agent'),(2,'Bia','agent'),(3,'Caio','agent'),(4,'Dono','owner')");await query("insert into channels(id,name,driver) values(1,'Canal A','waha')");await query("insert into contacts(id,name,handle,channel_id) values(1,'Cliente','5511999999999',1)");await installTemplate(query,'rastreamento_veicular',{master:true});await query('insert into team_members(team_id,user_id) values(1,1),(1,2),(2,3)');await query('insert into conversations(id,contact_id,channel_id,team_id) values(1,1,1,1)')});
await tx(2,async query=>{await query("insert into users(id,name,role) values(20,'Outro','agent')");await query("insert into teams(id,name) values(20,'Outra')")});
assert.equal((await q('select * from teams')).rows.length,8);assert.equal((await q('select * from users where id=20')).rows.length,0);
await assert.rejects(()=>q('insert into conversation_team_participants(conversation_id,team_id) values(1,20)'),/referência inválida/);
await tx(1,query=>saveTimeZone(query,'America/Cuiaba'));await tx(2,query=>saveTimeZone(query,'America/Sao_Paulo'));assert.equal(await tx(1,companyTimeZone),'America/Cuiaba');assert.equal(await tx(2,companyTimeZone),'America/Sao_Paulo');
const app=express();app.use(express.json());app.use((req,res,next)=>{req.u={tid:1,id:Number(req.headers['x-test-user']||1),name:'Teste',role:'agent',permissions:{}};next()});const ah=fn=>(req,res)=>Promise.resolve(fn(req,res)).catch(e=>res.status(e.status||400).json({error:e.message}));mountConversationActions(app,{ah,q,tenantTransaction:tx,bus:()=>{},deliver:async()=>{},createPayment:async()=>{throw Error('Não utilizado')}});
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
const request=async(path,body={},user=1)=>{const r=await fetch(base+'/api/conversations/1/'+path,{method:'POST',headers:{'content-type':'application/json','x-test-user':String(user)},body:JSON.stringify(body)});return {status:r.status,data:await r.json()}};
try{
 await conversationFor(q,1,1);await conversationFor(q,1,2);await assert.rejects(()=>conversationFor(q,1,3));
 assert.equal((await request('claim')).status,200);assert.equal((await q('select automation_paused from conversations where id=1')).rows[0].automation_paused,true);await assert.rejects(()=>conversationFor(q,1,2));assert.notEqual((await request('claim',{},2)).status,200);
 assert.equal((await request('invite',{team_id:2})).status,200);await conversationFor(q,1,3);assert.equal((await q('select assignee_id from conversations where id=1')).rows[0].assignee_id,1);
 assert.equal((await request('invite',{user_id:2})).status,200);await conversationFor(q,1,2);
 assert.equal((await request('assign',{type:'team',id:2})).status,200);await assert.rejects(()=>conversationFor(q,1,1));await assert.rejects(()=>conversationFor(q,1,2));await conversationFor(q,1,3);
 assert.equal((await request('claim',{},3)).status,200);await conversationFor(q,1,4);assert.equal((await request('invite',{user_id:20},3)).status,400);
 assert.equal((await request('automation',{mode:'ai'},3)).status,400);assert.equal((await q('select automation_mode from conversations where id=1')).rows[0].automation_mode,'human');
 console.log('OK: migrações, RLS entre empresas, template real, assumir, convite individual/equipe, transferência e rollback em PostgreSQL/WASM.');
}finally{server.closeAllConnections();await new Promise(r=>server.close(r));await db.close()}
