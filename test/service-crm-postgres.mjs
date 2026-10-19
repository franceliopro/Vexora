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

 const call=async(path,method='GET',body,user=4)=>{const r=await fetch(base+'/api'+path,{method,headers:{'content-type':'application/json','x-test-user':String(user)},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}};
 const created=await call('/crm/boards','POST',{name:'Comercial',code:'COM',visibility:'individual',team_ids:[1],celebrate:true,sound:true,inactivity_days:30,stages:[{name:'Novo Lead'},{name:'Proposta enviada'},{name:'Conclusão',final:true}]});assert.equal(created.status,200,JSON.stringify(created.data));const bid=created.data.id;
 const board=await call('/crm/boards/'+bid);assert.equal(board.data.stages.length,3);const first=board.data.stages[0],middle=board.data.stages[1],final=board.data.stages[2];
 const result=await call('/crm/cards','POST',{board_id:bid,stage_id:first.id,title:'Negociação',conversation_id:1,amount:250});assert.equal(result.status,200,JSON.stringify(result.data));let card=result.data;
 assert.equal((await call('/crm/cards/'+card.id,'PATCH',{stage_id:final.id,version:card.version})).status,400);
 const moved=await call('/crm/cards/'+card.id,'PATCH',{stage_id:middle.id,version:card.version});assert.equal(moved.status,200);card=moved.data;
 assert.equal((await call('/crm/cards/'+card.id,'PATCH',{title:'Conflito',version:1})).status,409);
 const win=await call('/crm/cards/'+card.id,'PATCH',{status:'won',stage_id:final.id,version:card.version});assert.equal(win.status,200);assert.equal(win.data.previous_stage_id,middle.id);assert.equal((await call('/crm/boards/'+bid+'/cards')).data.length,0);
 assert.equal((await call('/crm/boards/'+bid+'/cards?status=won,lost,open,archived')).data.length,1);
 const reopened=await call('/crm/cards/'+card.id,'PATCH',{status:'open',version:win.data.version});assert.equal(reopened.data.stage_id,middle.id);card=reopened.data;
 assert.equal((await call('/crm/cards/'+card.id,'PATCH',{status:'lost'})).status,400);
 const reason=board.data.reasons.find(r=>r.name==='Preço / condições');const lost=await call('/crm/cards/'+card.id,'PATCH',{status:'lost',reason_id:reason.id});assert.equal(lost.data.loss_reason,reason.name);
 await call('/crm/cards/'+card.id,'PATCH',{status:'open'});await q("update crm_cards set activity_at=now()-interval '31 days' where id=$1",[card.id]);assert.equal(await tx(1,expireCards),1);assert.equal((await q('select loss_reason from crm_cards where id=$1',[card.id])).rows[0].loss_reason,'Inatividade');
 const copied=await call('/crm/boards/'+bid+'/duplicate','POST',{name:'Comercial cópia'});assert.equal(copied.status,200);assert.equal((await call('/crm/boards/'+copied.data.id+'/cards?status=open,won,lost,archived')).data.length,0);assert.equal((await call('/crm/boards/'+copied.data.id)).data.stages.length,3);
 assert.equal((await call('/crm/boards/'+bid+'/report','GET',undefined,1)).status,403);const report=await call('/crm/boards/'+bid+'/report');assert.equal(report.status,200,JSON.stringify(report.data));assert.equal(report.data.summary.lost,1);
 await tx(2,async query=>{await query("insert into crm_boards(id,name,code,created_by) values(99,'Outra','OT',20)")});assert.equal((await call('/crm/boards/99')).status,404);
 assert.throws(()=>validFields([{id:1,kind:'integer',active:true}],{'1':'abc'}));assert.equal((await call('/conversations/1/close','POST',{reason:'Resolvido',category:'success'})).status,200);assert.equal((await q('select status from conversations where id=1')).rows[0].status,'closed');assert.equal((await call('/conversations/1/reopen','POST',{reason:'Retorno'})).status,200);
 assert.equal((await call('/crm/confirmations','POST',{action:{type:'delete_card',id:card.id},channel:'email'})).status,400);
 console.log('OK: CRM em PostgreSQL/WASM: painéis, cópia sem clientes, encerramento obrigatório, conflito, reabertura, inatividade, acesso administrativo e ciclos.');
 console.log('OK: migrações, RLS entre empresas, template real, assumir, convite individual/equipe, transferência e rollback em PostgreSQL/WASM.');
}finally{server.closeAllConnections();await new Promise(r=>server.close(r));await db.close()}
