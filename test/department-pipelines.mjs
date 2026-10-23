import assert from 'node:assert/strict';
import {DEPARTMENT_PRESETS,departmentBoardPreview} from '../src/department-pipelines.js';
assert.deepEqual(Object.keys(DEPARTMENT_PRESETS).sort(),['finance','sales','support']);
assert.deepEqual(DEPARTMENT_PRESETS.support.stages,['Novo chamado','Triagem','Em diagnóstico','Aguardando cliente','Aguardando equipe / terceiro','Em resolução','Conclusão']);
assert.deepEqual(DEPARTMENT_PRESETS.sales.stages,['Novo lead','Qualificação','Diagnóstico','Proposta enviada','Negociação','Contratação pendente','Conclusão']);
assert.ok(DEPARTMENT_PRESETS.finance.fields.some(f=>f.name==='Status do provedor'));
assert.ok(DEPARTMENT_PRESETS.support.fields.some(f=>f.name==='Prioridade'));
assert.ok(DEPARTMENT_PRESETS.sales.fields.some(f=>f.name==='Data de retorno'));
for(const p of Object.values(DEPARTMENT_PRESETS)){
 assert.equal(p.stages.at(-1),'Conclusão',p.name+' must have a final stage');
 assert.ok(p.fields.length>=5,p.name+' must have department-specific fields');
 assert.ok(p.fields.every(f=>['text','integer','decimal','date','datetime','url','boolean','select'].includes(f.kind)),p.name+' has unsupported field kind');
 assert.ok(p.fields.filter(f=>f.kind==='select').every(f=>f.options.length>0),p.name+' select fields need options');
}
const queries=[];
const fake=async(sql,params=[])=>{
 queries.push(sql);
 if(sql.includes('from crm_boards b'))return {rows:[{id:1,name:'Painel antigo',kind:'sales',system_key:null,archived_at:null,cards:3}]};
 if(sql.includes('from teams where archived_at'))return {rows:[{id:2,name:'Comercial',routing:{}}]};
 return {rows:[]};
};
const preview=await departmentBoardPreview(fake);
assert.equal(preview.legacy_active,1);
assert.equal(preview.legacy_cards,3);
assert.equal(preview.standard.length,3);
console.log('OK: presets de Suporte, Comercial e Financeiro, campos por departamento e prévia de arquivamento.');
