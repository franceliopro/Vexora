create table service_tasks(
 id bigserial primary key,tenant_id int not null default nullif(current_setting('app.tenant',true),'')::int references tenants,
 conversation_id int not null references conversations,title text not null check(length(title) between 1 and 200),description text not null default '',
 assignee_id int references users,created_by int not null references users,priority text not null default 'normal' check(priority in ('normal','high')),
 status text not null default 'pending' check(status in ('pending','in_progress','done','cancelled')),due_at timestamptz,completed_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),version int not null default 1
);
create index service_tasks_conversation on service_tasks(tenant_id,conversation_id,status);
create index service_tasks_due on service_tasks(tenant_id,assignee_id,due_at) where status in ('pending','in_progress');
alter table service_tasks enable row level security;alter table service_tasks force row level security;
create policy tenant_iso on service_tasks using(tenant_id=nullif(current_setting('app.tenant',true),'')::int) with check(tenant_id=nullif(current_setting('app.tenant',true),'')::int);
create trigger fk_guard before insert or update on service_tasks for each row execute function fk_guard('conversations','conversation_id','users','assignee_id','users','created_by');
create table service_reviews(
 conversation_id int primary key references conversations,tenant_id int not null default nullif(current_setting('app.tenant',true),'')::int references tenants,
 reviewer_id int not null references users,clarity int not null check(clarity between 1 and 5),cordiality int not null check(cordiality between 1 and 5),resolution int not null check(resolution between 1 and 5),
 comment text not null check(length(comment) between 1 and 2000),updated_at timestamptz not null default now(),version int not null default 1
);
alter table service_reviews enable row level security;alter table service_reviews force row level security;
create policy tenant_iso on service_reviews using(tenant_id=nullif(current_setting('app.tenant',true),'')::int) with check(tenant_id=nullif(current_setting('app.tenant',true),'')::int);
create trigger fk_guard before insert or update on service_reviews for each row execute function fk_guard('conversations','conversation_id','users','reviewer_id');
