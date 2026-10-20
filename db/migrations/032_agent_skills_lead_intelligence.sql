alter table agents add column skills jsonb not null default '{"role":"assistant","agent_ids":[],"bot_ids":[],"board_ids":[],"connection_ids":[]}';
create table agent_connections(id serial primary key,tenant_id int not null default nullif(current_setting('app.tenant',true),'')::int references tenants,name text not null,description text not null default '',url text not null,method text not null check(method in ('GET','POST')),parameters jsonb not null default '[]',secret text,active boolean not null default true,created_at timestamptz not null default now());
create table agent_tool_runs(id bigserial primary key,tenant_id int not null default nullif(current_setting('app.tenant',true),'')::int references tenants,conversation_id int not null references conversations,connection_id int not null references agent_connections,run_key text not null,status text not null default 'check_required',result jsonb,at timestamptz not null default now(),unique(tenant_id,run_key));
create table lead_sources(id serial primary key,tenant_id int not null default nullif(current_setting('app.tenant',true),'')::int references tenants,name text not null,channel_id int not null references channels,secret text not null,field_map jsonb not null default '{}',active boolean not null default true,created_at timestamptz not null default now());
create table lead_events(id bigserial primary key,tenant_id int not null default nullif(current_setting('app.tenant',true),'')::int references tenants,source_id int references lead_sources,contact_id int references contacts,conversation_id int references conversations,external_id text,type text not null check(type in ('form','click','referral')),source text not null,campaign text not null default '',page text not null default '',data jsonb not null default '{}',at timestamptz not null default now(),unique(tenant_id,source_id,external_id));
do $$ declare r record;begin
 for r in select * from (values('agent_connections',''),('agent_tool_runs','conversations,conversation_id,agent_connections,connection_id'),('lead_sources','channels,channel_id'),('lead_events','lead_sources,source_id,contacts,contact_id,conversations,conversation_id')) v(t,a) loop
 execute format('alter table %I enable row level security',r.t);
 execute format('alter table %I force row level security',r.t);
 execute format($f$create policy tenant_iso on %I using(tenant_id=nullif(current_setting('app.tenant',true),'')::int) with check(tenant_id=nullif(current_setting('app.tenant',true),'')::int)$f$,r.t);
 if r.a<>'' then execute format('create trigger fk_guard before insert or update on %I for each row execute function fk_guard(%s)',r.t,(select string_agg(quote_literal(x),',') from unnest(string_to_array(r.a,',')) x));end if;
 end loop;end $$;
create index lead_contact_history on lead_events(tenant_id,contact_id,at desc);

create unique index lead_native_event_once on lead_events(tenant_id,external_id) where source_id is null and external_id is not null;
