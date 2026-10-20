import {automationAllowed} from './conversation-policy.js';
import {entryBot} from './bots/entry.js';
const normalize=x=>String(x||'').trim().toLocaleLowerCase('pt-BR');
export const optionNumber=x=>{if(String(x||'').trim()==='🔟')return 10;const v=String(x||'').replace(/\uFE0F|\u20E3/g,'').trim();return /^\d{1,2}$/.test(v)?Number(v):null};
export const prettyNumber=n=>n>=1&&n<=9?n+'️⃣':n===10?'🔟':String(n)+'.';
export function cleanPreferredName(value){const v=String(value||'').trim().replace(/\s+/g,' ');if(/^(sim|nao|ola|oi|bom dia|boa tarde|boa noite|menu|ajuda|cancelar)$/i.test(v.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))return null;return v.length>=2&&v.length<=80&&/[\p{L}]/u.test(v)&&!/[\d<>\r\n]/.test(v)?v:null}
// Runs under the conversation processing lock. It never hands the opening trigger to an LLM.
export async function serviceEntry({q,cv,msg,fresh,channel,contact,send,knownCustomer}){
 if(!automationAllowed(cv))return {used:false};let state=cv.entry_state||{};
 if(!state.step){if(!fresh)return {used:false};const bots=(await q('select * from bots where active order by id')).rows,bot=entryBot(bots,channel.config?.routing,cv.channel_id,msg,true);if(!bot&&!cv.ai_on)return {used:false};state={step:'start'}}
 if(state.step==='done')return {used:false};if(['sending','check_required'].includes(state.step))return {used:true};
 if(state.sent_at&&msg.at&&new Date(msg.at)<=new Date(state.sent_at))return {used:true};
 const save=async s=>{state=s;await q('update conversations set entry_state=$2 where id=$1',[cv.id,JSON.stringify(s)])};
 const ask=async(step,body,options)=>{await save({...state,step:'sending'});try{await send(body,options?{text:body,options}:undefined);await save({...state,step,sent_at:new Date().toISOString()})}catch{await save({...state,step:'check_required'})}return {used:true}};
 const askName=async()=>{const candidate=cleanPreferredName(contact.data?.preferred_name||contact.name);state.candidate=candidate;return candidate?ask('name_confirm','Identifiquei você como '+candidate+'. Posso chamar você assim?',['Sim, pode','Outro nome']):ask('name_input','Como você prefere ser chamado(a)?')};
 if(state.step==='start'){let identity;try{identity=await knownCustomer?.()}catch{}if(identity){state.identity=identity;await save({...state,step:'sending'});try{await send('Encontramos este telefone associado a um cadastro.')}catch{await save({...state,step:'check_required'});return {used:true}}return ask('customer_confirm','Nome: '+identity.name+'\nDocumento: '+identity.document+'\nE-mail: '+identity.email+'\n\nO atendimento é sobre este cadastro?',['Sim, é este mesmo','Outro cadastro'])}return askName()}
 const answer=normalize(msg.body),number=optionNumber(msg.body);
 if(state.step==='customer_confirm'){if(number===1||answer==='sim, é este mesmo'||answer==='sim'){await q("update contacts set data=coalesce(data,'{}'::jsonb)||$2 where id=$1",[cv.contact_id,JSON.stringify({selected_financial_customer:state.identity.customer_id})]);contact.name=state.identity.name;return askName()}if(number===2||answer==='outro cadastro'){await q("update contacts set data=coalesce(data,'{}'::jsonb)-'selected_financial_customer' where id=$1",[cv.contact_id]);delete state.identity;return askName()}return ask('customer_confirm','O atendimento é sobre o cadastro apresentado?',['Sim, é este mesmo','Outro cadastro'])}
 if(state.step==='name_confirm'){if(number===1||['sim','sim, pode','pode'].includes(answer))return finish(state.candidate);if(number===2||answer==='outro nome')return ask('name_input','Claro! Como você prefere ser chamado(a)?');const name=cleanPreferredName(msg.body);if(name)return finish(name);return ask('name_confirm','Posso chamar você de '+state.candidate+'?',['Sim, pode','Outro nome'])}
 if(state.step==='name_input'){const name=cleanPreferredName(msg.body);if(name)return finish(name);return ask('name_input','Envie por texto o nome pelo qual prefere ser chamado(a).')}
 return {used:true};
 async function finish(name){await q("update contacts set data=coalesce(data,'{}'::jsonb)||$2 where id=$1",[cv.contact_id,JSON.stringify({preferred_name:name,novo_nome:name})]);await save({step:'done',preferred_name:name});return {used:false,start:true}}
}
