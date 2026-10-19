import assert from 'node:assert/strict';
import {localGreeting,trackingGraph,TRACKING_TEAMS} from '../src/tracking-template.js';
import {advance} from '../src/bots/engine.js';
import {automationAllowed,canBotRun} from '../src/conversation-policy.js';
const teams=Object.fromEntries(TRACKING_TEAMS.map(([k],i)=>[k,i+1])),graph=trackingGraph(teams);
for(const [hour,label]of [[0,'Boa madrugada'],[5,'Boa madrugada'],[6,'Bom dia'],[11,'Bom dia'],[12,'Boa tarde'],[17,'Boa tarde'],[18,'Boa noite'],[23,'Boa noite']])assert.equal(localGreeting(new Date(Date.UTC(2026,9,19,hour+3))).saudacao,label);
function scenario(fail=false){const sent=[],transfers=[],run={node:'inicio',vars:{},waiting:false,tries:0};const deps={builtins:async()=>localGreeting(new Date('2026-10-19T15:00:00Z')),send:async t=>sent.push(t),transfer:async d=>transfers.push(d.team_id),asaasDebts:async(doc,opts)=>{assert.equal(opts.verifyPhone,true);assert.ok(opts.platform);if(fail)throw Error('telefone não confirmado');return {name:'Pessoa Teste',debts:[{id:'pay_test',value:20,dueDate:'2026-11-01',status:'PENDING'}]}},asaasPay:async()=>({invoiceUrl:'https://example.com/fatura',bankSlipUrl:'https://example.com/boleto',identificationField:'123',pixPayload:'pix-code'})};return {sent,transfers,run,step:text=>advance({graph,run,text,deps})}}
for(let sector=1;sector<=2;sector++)for(let platform=1;platform<=3;platform++){const s=scenario();await s.step(null);await s.step(String(sector));await s.step(String(platform));if(sector===2)await s.step('2');const key=(sector===1?'suporte_':'financeiro_')+['ceeb_vision','link','rastreabem'][platform-1];assert.deepEqual(s.transfers,[teams[key]])}
for(const [sector,key]of [[3,'comercial'],[4,'administrativo']]){const s=scenario();await s.step(null);await s.step(String(sector));assert.deepEqual(s.transfers,[teams[key]])}
for(let method=1;method<=4;method++){const s=scenario();for(const input of [null,'2','1','1','52998224725',String(method)])await s.step(input);assert.ok(s.sent.includes('Fatura completa: https://example.com/fatura'));assert.equal(s.transfers.length,0)}
const failed=scenario(true);for(const input of [null,'2','3','1','52998224725'])await failed.step(input);assert.deepEqual(failed.transfers,[teams.financeiro_rastreabem]);assert.ok(!failed.sent.some(t=>t.includes('Pessoa Teste')));
assert.equal(automationAllowed({automation_paused:true}),false);assert.equal(canBotRun({automation_mode:'human'}),false);assert.equal(canBotRun({assignee_id:1,automation_mode:'hybrid'}),true);assert.equal(canBotRun({automation_mode:'ai'}),false);
console.log('OK: 8 filas, 4 saudações, 4 meios com fatura, falha financeira e modos humano/híbrido (motor puro).');
const {normalizeTimeZone,companyTimeZone,saveTimeZone}=await import('../src/timezone.js');
assert.equal(normalizeTimeZone('America/Cuiaba'),'America/Cuiaba');assert.throws(()=>normalizeTimeZone('invalid/zone'));assert.throws(()=>normalizeTimeZone(null));
const instant=new Date('2026-10-19T09:30:00Z');assert.equal(localGreeting(instant,'America/Cuiaba').saudacao,'Boa madrugada');assert.equal(localGreeting(instant,'America/Sao_Paulo').saudacao,'Bom dia');
assert.equal(await companyTimeZone(async()=>({rows:[]})),'America/Sao_Paulo');let stored;
assert.deepEqual(await saveTimeZone(async(sql,params)=>{stored=JSON.parse(params[0]);return {rows:[]}},'America/Cuiaba'),{time_zone:'America/Cuiaba'});assert.equal(stored.time_zone,'America/Cuiaba');
assert.equal(await companyTimeZone(async()=>({rows:[{value:{time_zone:'America/Cuiaba'}}]})),'America/Cuiaba');
console.log('OK: escolha/validação de fuso e saudações diferentes no mesmo instante em Cuiabá/São Paulo.');
