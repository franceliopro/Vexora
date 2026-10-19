import {automationAllowed} from './conversation-policy.js';
import {q} from './db.js';import {deliver,setStage} from './core.js';import {respond} from './ai/engine.js';
// trigger: {type:'stage',stage_id} | {type:'new'} ; steps: wait{minutes} send{text} move{stage_id} ai{prompt} assign{user_id}
const mk=async(cid,pred)=>{for(const f of (await q('select * from flows where active')).rows)if(pred(f.trigger))await q('insert into jobs(run_at,conversation_id,flow_id) values(now(),$1,$2)',[cid,f.id])};
export const onStage=(cid,sid)=>mk(cid,t=>t.type==='stage'&&+t.stage_id===+sid);
export const onNew=cid=>mk(cid,t=>t.type==='new');
export const cancel=cid=>q('update jobs set done=true where conversation_id=$1 and not done',[cid]); // cliente respondeu → para follow-up
export async function tickFlows(){const js=(await q('select j.*,f.steps from jobs j join flows f on f.id=j.flow_id where not j.done and j.run_at<=now() limit 50')).rows;
for(const j of js){let i=j.step;let wait=null;
try{while(i<j.steps.length){const cv=(await q('select * from conversations where id=$1',[j.conversation_id])).rows[0];if(!automationAllowed(cv))break;const s=j.steps[i++];
if(s.type==='wait'){wait=+s.minutes||1;break}
if(s.type==='send')await deliver(j.conversation_id,{body:s.text,ai:true,epoch:cv.automation_epoch});
if(s.type==='move')await setStage(j.conversation_id,s.stage_id);
if(s.type==='assign')await q("update conversations set assignee_id=$1,ai_on=false,automation_paused=true,automation_mode='human',automation_epoch=automation_epoch+1 where id=$2",[s.user_id,j.conversation_id]);
if(s.type==='ai'){const cv=(await q('select * from conversations where id=$1',[j.conversation_id])).rows[0];const ag=(await q('select * from agents where id=$1',[cv.agent_id])).rows[0]||(await q('select * from agents where active limit 1')).rows[0];if(ag)await respond(cv,ag,s.prompt||'Faça um follow-up gentil.')}}}
catch(e){console.error('flow',e.message)}
if(wait)await q("update jobs set step=$1,run_at=now()+($2||' minutes')::interval where id=$3",[i,wait,j.id]);else await q('update jobs set done=true where id=$1',[j.id])}}

