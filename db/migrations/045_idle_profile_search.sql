alter table conversations add column bot_restart_pending boolean not null default false;
alter table conversations add column bot_rearmed_at timestamptz;
alter table fin_customers add column document_token text;
create index fin_document_lookup on fin_customers(account_id,document_token) where document_token is not null;
create or replace function continuity_transition() returns trigger language plpgsql as $$ begin
 if new.status='closed' then new.handoff_state=null;new.handoff_since=null;new.human_accepted_at=null;new.fallback_started_at=null;new.bot_restart_pending=false;
 elsif new.human_accepted_at is distinct from old.human_accepted_at and new.human_accepted_at is not null then new.handoff_state='accepted';new.bot_restart_pending=false;
 elsif new.automation_mode='human' and (old.automation_mode is distinct from 'human' or old.team_id is distinct from new.team_id or old.assignee_id is distinct from new.assignee_id) then
 new.handoff_state=case when new.handoff_state='check_required' then 'check_required' when old.handoff_state in ('ai_active','human_final','offering','check_required') then 'human_final' else 'waiting' end;
 new.handoff_since=case when old.automation_mode='human' then coalesce(old.handoff_since,now()) else now() end;new.human_accepted_at=null;new.bot_restart_pending=false;
 end if;if new.status='closed' or new.automation_mode in ('human','bot') then new.ai_service_role=null;end if;return new;end $$;
