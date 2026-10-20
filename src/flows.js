import {automationAllowed} from './conversation-policy.js';import {waitSeconds} from './workflow-time.js';
import {q} from './db.js';import {deliver,setStage} from './core.js';import {respond} from './ai/engine.js';
const mk=async(cid,pred)=>{const current=(await q('select c.automation_epoch,ch.config from channels ch join conversations c on c.channel_id=ch.id where c.id=$1',[cid])).rows[0],routing=current?.config?.routing;for(const f of (await q('select * from flows where active')).rows)if((!routing?.enabled||(routing.flow_ids||[]).includes(f.id))&&pred(f.trigger))await q('insert into jobs(run_at,conversation_id,flow_id,automation_epoch) values(now(),$1,$2,$3)',[cid,f.id,current.automation_epoch])};
export const onStage=(cid,sid)=>mk(cid,t=>t.type==='stage'&&+t.stage_id===+sid);
export const onNew=cid=>mk(cid,t=>t.type==='new');
export const cancel=cid=>q('update jobs set done=true where conversation_id=$1 and not done',[cid]);
export async function tickFlows({query=q,send=deliver,move=setStage,answer=respond}={}){const q=query,deliver=send,setStage=move,respond=answer;const js=(await q("update jobs j set locked_until=now()+interval '2 minutes' from flows f where j.flow_id=f.id and j.id in(select id from jobs where not done and run_at<=now() and (locked_until is null or locked_until<now()) order by run_at,id limit 50 for update skip locked) returning j.*,f.steps,f.active")).rows;
 for(const j of js){let i=j.step,wait=null;try{while(j.active&&i<j.steps.length){const cv=(await q('select * from conversations where id=$1',[j.conversation_id])).rows[0];if(!automationAllowed(cv)||cv.automation_epoch!==j.automation_epoch||!(await q('select id from jobs where id=$1 and not done',[j.id])).rows.length)break;const s=j.steps[i++];
 // Persist the cursor before an external side effect. Ambiguous sends are never blindly replayed.
 await q('update jobs set step=$2 where id=$1 and not done',[j.id,i]);
 if(s.type==='wait'){wait=waitSeconds(s);break}
 if(s.type==='send')await deliver(j.conversation_id,{body:s.text,ai:true,epoch:cv.automation_epoch,executor:'bot'});
 if(s.type==='move')await setStage(j.conversation_id,s.stage_id);
 if(s.type==='assign')await q("update conversations set routing_managed=false,routing_attempts='{}',routing_assigned_at=null,assignee_id=$1,ai_on=false,automation_paused=true,automation_mode='human',automation_epoch=automation_epoch+1 where id=$2 and automation_epoch=$3",[s.user_id,j.conversation_id,cv.automation_epoch]);
 if(s.type==='ai'){const ag=(await q('select * from agents where id=$1 and active',[cv.agent_id])).rows[0];if(ag)await respond(cv,ag,s.prompt||'Faça um follow-up gentil.')}}}catch(e){console.error('workflow',j.id,e.message)}
 if(wait)await q("update jobs set step=$1,run_at=now()+($2::double precision*interval '1 second'),locked_until=null where id=$3 and not done",[i,wait,j.id]);else await q('update jobs set done=true,locked_until=null where id=$1',[j.id]);}}
