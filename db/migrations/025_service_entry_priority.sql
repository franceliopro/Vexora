alter table team_members add column priority int not null default 0 check(priority between 0 and 1000);
alter table conversations add column unavailable_notification text check(unavailable_notification in ('pending','sending','sent','check_required'));
alter table conversations add column entry_state jsonb not null default '{}';
