import {automationAllowed} from './conversation-policy.js';
// Guarded by a row lock and epoch: a late bot/AI cannot close human-owned work.
export async function closeAutomated(query,cv,{reason='Atendimento automatizado concluído',outcome='resolved',executor='bot'}={}){
 if(!['resolved','question','other'].includes(outcome))throw Error('Resultado automático inválido');
 const current=(await query('select * from conversations where id=$1 for update',[cv.id])).rows[0];
 if(!automationAllowed(current)||current.automation_epoch!==cv.automation_epoch||current.assignee_id)return false;
 const category=outcome==='resolved'?'success':outcome;
 await query("update conversations set status='closed',closed_at=now(),close_reason=$2,close_category=$3,close_outcome=$4,ai_on=false,automation_paused=true,automation_mode='human',automation_epoch=automation_epoch+1 where id=$1",[cv.id,String(reason).slice(0,500),category,outcome]);
 await query("update bot_runs set status='concluido' where conversation_id=$1 and status='active'",[cv.id]);await query('update jobs set done=true where conversation_id=$1 and not done',[cv.id]);
 await query("insert into service_events(conversation_id,team_id,type,data) select id,team_id,'closed',$2 from conversations where id=$1",[cv.id,JSON.stringify({reason:String(reason).slice(0,500),category,outcome,executor,automatic:true})]);return true;
}
