alter table conversations add column if not exists automation_paused boolean not null default false;
alter table conversations add column if not exists automation_mode text not null default 'auto' check(automation_mode in ('auto','human','ai','bot','hybrid'));
alter table conversations add column if not exists automation_epoch integer not null default 0;
alter table bot_runs add column if not exists invoked boolean not null default false;
create table if not exists conversation_team_participants(
 conversation_id integer references conversations on delete cascade,
 team_id integer references teams on delete cascade,
 tenant_id integer not null default nullif(current_setting('app.tenant',true),'')::integer references tenants on delete cascade,
 primary key(conversation_id,team_id));
alter table conversation_team_participants enable row level security;
alter table conversation_team_participants force row level security;
drop policy if exists tenant_iso on conversation_team_participants;
create policy tenant_iso on conversation_team_participants using(tenant_id=nullif(current_setting('app.tenant',true),'')::integer) with check(tenant_id=nullif(current_setting('app.tenant',true),'')::integer);
drop trigger if exists fk_guard on conversation_team_participants;
create trigger fk_guard before insert or update on conversation_team_participants for each row execute function fk_guard('conversations','conversation_id','teams','team_id');
create index if not exists conversation_team_participants_tenant on conversation_team_participants(tenant_id);
create table if not exists conversation_payment_requests(
 id uuid not null,tenant_id integer not null default nullif(current_setting('app.tenant',true),'')::integer references tenants on delete cascade,
 conversation_id integer references conversations on delete cascade,payment_id integer references payments,
 status text not null default 'processing',sent boolean not null default false,created_at timestamptz not null default now(),primary key(tenant_id,id));
alter table conversation_payment_requests enable row level security;
alter table conversation_payment_requests force row level security;
drop policy if exists tenant_iso on conversation_payment_requests;
create policy tenant_iso on conversation_payment_requests using(tenant_id=nullif(current_setting('app.tenant',true),'')::integer) with check(tenant_id=nullif(current_setting('app.tenant',true),'')::integer);
drop trigger if exists fk_guard on conversation_payment_requests;
create trigger fk_guard before insert or update on conversation_payment_requests for each row execute function fk_guard('conversations','conversation_id','payments','payment_id');
