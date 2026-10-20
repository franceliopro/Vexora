alter table jobs add column locked_until timestamptz,add column automation_epoch int;
update jobs j set automation_epoch=c.automation_epoch from conversations c where c.id=j.conversation_id and not j.done;
create index jobs_due_open on jobs(run_at) where not done;
