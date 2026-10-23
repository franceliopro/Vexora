import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tickAttendancePolicy} from '../src/attendance-management.js';

let transactions=0,broadcasts=0;
const result=await tickAttendancePolicy({
 q:async()=>({rows:[{value:{release_mode:'after_idle',idle_minutes:30}}]}),
 tenantTransaction:async()=>{transactions++;return []},
 bus:()=>{broadcasts++}
});
assert.equal(result,0,'idle time must not release an assigned conversation');
assert.equal(transactions,0,'idle policy must not mutate conversation ownership');
assert.equal(broadcasts,0,'idle policy must not emit repeated release events');

const idleRuntime=fs.readFileSync(new URL('../src/bot-idle.js',import.meta.url),'utf8');
assert.doesNotMatch(idleRuntime,/assignee_id=null/,'bot idle recovery must preserve the human assignee');
assert.doesNotMatch(idleRuntime,/delete from participants where conversation_id/,'bot idle recovery must preserve participants');
assert.doesNotMatch(idleRuntime,/delete from conversation_team_participants where conversation_id/,'bot idle recovery must preserve team participants');
assert.match(idleRuntime,/responsável e equipe preservados/,'the idle note must explain that ownership remains');

const inbox=fs.readFileSync(new URL('../web/attendance.js',import.meta.url),'utf8');
assert.match(inbox,/Defina quando destacar atendimentos parados/,'the UI must describe idle as an alert, not a release');
assert.doesNotMatch(inbox,/policyMode/,'queue settings must not offer automatic reassignment as an idle option');
const server=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
assert.match(server,/as idle_overdue/,'the API must expose the overdue flag');
assert.doesNotMatch(server,/release_mode[^\n]{0,120}as idle_overdue/,'legacy release settings must not suppress overdue alerts');
assert.match(inbox,/c\.idle_overdue&&h\('span',\{class:'badge'/,'overdue conversations must be visibly flagged');
console.log('OK: inatividade preserva responsável/equipe, não libera para Novos e sinaliza atraso na caixa de entrada.');
