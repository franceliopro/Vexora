import {allowed} from '../governance.js';
import {automationAllowed} from '../conversation-policy.js';
import {crmEvent} from '../crm.js';
import {serviceEvent} from '../operations.js';
export const AGENT_ROLES=['assistant','supervisor','sdr','seller','partner','employee','coordinator'];
export async function validateSkills(query,input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||!AGENT_ROLES.includes(input.role||'assistant'))throw Error('Papel de IA inválido');
 if(input.entry&&!['primary','specialist'].includes(input.entry))throw Error('Tipo de entrada inválido');const out={role:input.role||'assistant',entry:input.entry||'primary'};
 for(const [key,table]of [['agent_ids','agents'],['bot_ids','bots'],['board_ids','crm_boards'],['connection_ids','agent_connections']]){
  const values=input[key]||[];if(!Array.isArray(values)||values.length>50)throw Error('Escolha até 50 vínculos por habilidade');
  out[key]=[...new Set(values.map(Number))];for(const id of out[key])if(!Number.isSafeInteger(id)||id<1||!(await query('select id from '+table+' where id=$1',[id])).rows.length)throw Error('Vínculo de habilidade inválido');
 }return out;
}
export async function skillGuard(query,cv){const current=(await query('select * from conversations where id=$1 for update',[cv.id])).rows[0];if(!automationAllowed(current)||current.automation_epoch!==cv.automation_epoch)throw Error('Controle da automação mudou');return current}
export async function createAgentCard(query,cv,ag,a){
 await skillGuard(query,cv);if(!(ag.skills?.board_ids||[]).includes(Number(a.board_id)))throw Error('Painel não autorizado para este agente');
 const board=(await query('select * from crm_boards where id=$1',[a.board_id])).rows[0];if(!board)throw Error('Painel indisponível');
 const existing=(await query("select * from crm_cards where conversation_id=$1 and board_id=$2 and status='open' order by id desc limit 1",[cv.id,board.id])).rows[0];if(existing)return existing;
 const stage=(await query('select * from crm_stages where board_id=$1 and not final and ($2::int is null or id=$2) order by pos,id limit 1',[board.id,a.stage_id?Number(a.stage_id):null])).rows[0];if(!stage)throw Error('Etapa intermediária inválida');
 const ct=(await query('select name,labels from contacts where id=$1',[cv.contact_id])).rows[0],amount=Number(a.amount||0);if(!Number.isFinite(amount)||amount<0||amount>1e12)throw Error('Valor inválido');
 const labels=[...new Set([...(board.labels||[]),...(ct.labels||[])])],card=(await query('insert into crm_cards(board_id,stage_id,contact_id,conversation_id,title,description,amount,owner_id,labels) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',[board.id,stage.id,cv.contact_id,cv.id,String(a.title||ct.name||'Nova oportunidade').slice(0,200),String(a.description||'').slice(0,8000),amount,cv.assignee_id||null,labels])).rows[0];await crmEvent(query,card,null,'created',{source:ag.executor||'ai',agent_id:ag.id});return card;
}
export async function delegateAgent(query,cv,ag,a){
 await skillGuard(query,cv);const id=Number(a.agent_id);if(id===ag.id||!(ag.skills?.agent_ids||[]).includes(id))throw Error('Agente de destino não autorizado');
 const next=(await query('select * from agents where id=$1 and active and $2=any(channel_ids)',[id,cv.channel_id])).rows[0];if(!next)throw Error('Agente não habilitado nesta inbox');
 const current=(await query("update conversations set agent_id=$2,ai_on=true,automation_mode='ai',automation_epoch=automation_epoch+1 where id=$1 returning *",[cv.id,id])).rows[0];await serviceEvent(query,cv.id,null,'ai_delegated',{from_agent:ag.id,to_agent:id,reason:String(a.why||'').slice(0,500)});return {current,next};
}

export async function handoffHuman(query,cv,ag,a){
 await skillGuard(query,cv);let user=null,team=null;
 if(a.team_id){team=(await query('select id from teams where id=$1 and archived_at is null',[Number(a.team_id)])).rows[0];if(!team)throw Error('Equipe indisponível')}
 if(a.user_id){user=(await query("select * from users where id=$1 and active and deleted_at is null and not is_ai",[Number(a.user_id)])).rows[0];if(!user||!allowed(user,'reply')||user.permissions?.mine===false||(user.permissions?.channel_ids?.length&&!user.permissions.channel_ids.includes(cv.channel_id)))throw Error('Atendente indisponível nesta inbox');if(team&&!(await query('select 1 from team_members where team_id=$1 and user_id=$2',[team.id,user.id])).rows.length)throw Error('Atendente não pertence à equipe')}
 await query("update conversations set team_id=$2,assignee_id=$3,routing_managed=false,routing_attempts='{}',routing_assigned_at=null,automation_mode='human',automation_paused=true,ai_on=false,automation_epoch=automation_epoch+1 where id=$1",[cv.id,team?.id||null,user?.id||null]);
 await serviceEvent(query,cv.id,null,'ai_handoff',{agent_id:ag.id,user_id:user?.id||null,team_id:team?.id||null,reason:String(a.why||'').slice(0,500)});
}
