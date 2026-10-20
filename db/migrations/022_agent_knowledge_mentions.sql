alter table agents add column custom_actions jsonb not null default '[]';
create table knowledge_sources(id serial primary key,tenant_id int not null default nullif(current_setting('app.tenant',true),'')::int references tenants,agent_id int not null references agents on delete cascade,title text not null,kind text not null,origin text,created_at timestamptz default now());
alter table docs add column source_id int references knowledge_sources on delete cascade;
create table internal_mentions(id bigserial primary key,tenant_id int not null default nullif(current_setting('app.tenant',true),'')::int references tenants,message_id bigint not null references messages on delete cascade,conversation_id int not null references conversations on delete cascade,user_id int not null references users,team_id int references teams,created_at timestamptz default now(),read_at timestamptz,unique(message_id,user_id));
alter table knowledge_sources enable row level security;
create policy tenant on knowledge_sources using(tenant_id=nullif(current_setting('app.tenant',true),'')::int) with check(tenant_id=nullif(current_setting('app.tenant',true),'')::int);
alter table internal_mentions enable row level security;
create policy tenant on internal_mentions using(tenant_id=nullif(current_setting('app.tenant',true),'')::int) with check(tenant_id=nullif(current_setting('app.tenant',true),'')::int);
create trigger fk_guard before insert or update on knowledge_sources for each row execute function fk_guard('agents','agent_id');
create trigger knowledge_source_guard before insert or update on docs for each row execute function fk_guard('knowledge_sources','source_id');
create trigger fk_guard before insert or update on internal_mentions for each row execute function fk_guard('messages','message_id','conversations','conversation_id','users','user_id','teams','team_id');
-- Preserve existing text bases in the new source manager.
insert into knowledge_sources(tenant_id,agent_id,title,kind,origin)
select distinct tenant_id,agent_id,coalesce(title,'Conhecimento'),'texto','Importação anterior' from docs where agent_id is not null and source_id is null;
update docs d set source_id=s.id from knowledge_sources s where d.source_id is null and d.tenant_id=s.tenant_id and d.agent_id=s.agent_id and coalesce(d.title,'Conhecimento')=s.title and s.origin='Importação anterior';
