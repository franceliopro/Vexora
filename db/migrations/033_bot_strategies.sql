alter table bot_runs add column graph_snapshot jsonb;
create table bot_api_keys(tenant_id int not null default nullif(current_setting('app.tenant',true),'')::int references tenants,bot_id int not null references bots on delete cascade,secret text not null,primary key(tenant_id,bot_id));
create table bot_invocations(id bigserial primary key,tenant_id int not null default nullif(current_setting('app.tenant',true),'')::int references tenants,bot_id int not null references bots,conversation_id int not null references conversations,request_key text not null,source text not null check(source in ('manual','api','campaign','sequence','ai')),actor_id int references users,expected_epoch int not null,mode text not null default 'bot' check(mode in ('bot','hybrid')),vars jsonb not null default '{}',status text not null default 'pending' check(status in ('pending','check_required','started','cancelled')),detail text,created_at timestamptz not null default now(),processed_at timestamptz,unique(tenant_id,request_key));
do $$ declare r record;begin
for r in select * from (values('bot_api_keys','bots,bot_id'),('bot_invocations','bots,bot_id,conversations,conversation_id,users,actor_id')) v(t,a) loop
 execute format('alter table %I enable row level security',r.t);execute format('alter table %I force row level security',r.t);
 execute format($f$create policy tenant_iso on %I using(tenant_id=nullif(current_setting('app.tenant',true),'')::int) with check(tenant_id=nullif(current_setting('app.tenant',true),'')::int)$f$,r.t);
 execute format('create trigger fk_guard before insert or update on %I for each row execute function fk_guard(%s)',r.t,(select string_agg(quote_literal(x),',') from unnest(string_to_array(r.a,',')) x));
end loop;end $$;
create index bot_invocations_pending on bot_invocations(tenant_id,created_at) where status='pending';
