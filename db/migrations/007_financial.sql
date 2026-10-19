alter table payments add column environment text check(environment in ('sandbox','production','test','live'));
create unique index payments_external_environment on payments(tenant_id,provider,ext_id,environment) where environment is not null;
create table financial_sends(id uuid not null,tenant_id int not null default nullif(current_setting('app.tenant',true),'')::int references tenants,conversation_id int not null references conversations,actor_id int not null references users,fingerprint text not null,status text not null default 'sending' check(status in ('sending','sent','check_required')),result jsonb not null default '{}',created_at timestamptz not null default now(),primary key(tenant_id,id));
alter table financial_sends enable row level security;
alter table financial_sends force row level security;
create policy tenant_iso on financial_sends using(tenant_id=nullif(current_setting('app.tenant',true),'')::int) with check(tenant_id=nullif(current_setting('app.tenant',true),'')::int);
create trigger fk_guard before insert or update on financial_sends for each row execute function fk_guard('conversations','conversation_id','users','actor_id');
