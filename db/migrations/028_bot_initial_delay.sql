alter table conversations add column bot_entry_status text check(bot_entry_status in ('pending','started','cancelled','check_required'));
alter table conversations add column bot_entry_due_at timestamptz;
alter table conversations add column bot_entry_bot_id int references bots;
alter table conversations add column bot_entry_message_id bigint references messages;
alter table conversations add column bot_entry_epoch int;
create index bot_entry_queue on conversations(tenant_id,bot_entry_due_at) where bot_entry_status='pending';
create function cancel_pending_bot_start() returns trigger language plpgsql as $$
begin
 if old.bot_entry_status='pending' and new.bot_entry_status='pending' and (new.status='closed' or new.automation_paused or new.automation_mode='human' or new.automation_epoch is distinct from old.bot_entry_epoch) then new.bot_entry_status='cancelled'; end if;
 return new;
end $$;
create trigger cancel_pending_bot_start before update on conversations for each row execute function cancel_pending_bot_start();
