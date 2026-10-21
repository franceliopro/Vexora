// Fixed SQL fragments; all user values remain parameters. Permissions come from current database state.
export function accessPredicate(alias='c',user='$2'){return `exists(select 1 from users au where au.id=${user} and au.active and (au.role in ('owner','admin') or (
 (coalesce(au.permissions->'channel_ids','[]')='[]'::jsonb or au.permissions->'channel_ids' @> to_jsonb(${alias}.channel_id)) and (
 (${alias}.assignee_id=${user} and coalesce((au.permissions->>'mine')::boolean,true)) or
 exists(select 1 from participants ap where ap.conversation_id=${alias}.id and ap.user_id=${user}) or
 exists(select 1 from conversation_team_participants atp join team_members atm on atm.team_id=atp.team_id where atp.conversation_id=${alias}.id and atm.user_id=${user}) or
 (${alias}.assignee_id is null and ${alias}.status='open' and coalesce((au.permissions->>'new')::boolean,au.role='agent') and (${alias}.team_id is null or exists(select 1 from team_members am where am.team_id=${alias}.team_id and am.user_id=${user}))) or
 (au.role='agent' and coalesce((au.permissions->>'others')::boolean,false) and (au.permissions->>'others_scope'='all' or au.permissions->>'others_scope'='own' and exists(select 1 from team_members scope_tm where scope_tm.user_id=${user} and scope_tm.team_id=${alias}.team_id) or coalesce(au.permissions->>'others_scope','selected')='selected' and au.permissions->'others_team_ids' @> to_jsonb(${alias}.team_id)))
 ))))`}
export function controlPredicate(alias='c',user='$2'){return `(exists(select 1 from users au where au.id=${user} and au.active and au.role in ('owner','admin')) or (${alias}.assignee_id=${user} and ${accessPredicate(alias,user)}))`}
export async function conversationFor(query,id,user,{control=false,lock=false}={}){const r=(await query(`select c.* from conversations c where c.id=$1 and ${control?controlPredicate():accessPredicate()} ${lock?'for update of c':''}`,[id,user])).rows[0];if(!r){const e=Error('Conversa não encontrada ou sem permissão');e.status=403;throw e}return r}
export const automationAllowed=c=>!!c&&c.status!=='closed'&&!c.automation_paused&&c.automation_mode!=='human';
export const canBotRun=c=>automationAllowed(c)&&c.automation_mode!=='ai'&&(!c.assignee_id||c.automation_mode==='hybrid'||c.automation_mode==='bot');
