alter table conversations add column close_outcome text check(close_outcome in ('won','lost','resolved','question','other'));
create table quick_replies(id serial primary key,tenant_id int not null default nullif(current_setting('app.tenant',true),'')::int references tenants,owner_id int not null references users,visibility text not null check(visibility in ('personal','company')),shortcut text not null,title text not null,body text not null,active bool not null default true,updated_at timestamptz not null default now());
create unique index quick_replies_company on quick_replies(tenant_id,shortcut) where visibility='company' and active;
create unique index quick_replies_personal on quick_replies(tenant_id,owner_id,shortcut) where visibility='personal' and active;
alter table quick_replies enable row level security;
alter table quick_replies force row level security;
create policy tenant_iso on quick_replies using(tenant_id=nullif(current_setting('app.tenant',true),'')::int) with check(tenant_id=nullif(current_setting('app.tenant',true),'')::int);
create trigger fk_guard before insert or update on quick_replies for each row execute function fk_guard('users','owner_id');
