-- Isolamento por empresa: RLS em TODAS as tabelas de dados + guarda de chaves estrangeiras entre empresas.
do $$ declare t text; begin
 foreach t in array array['users','teams','team_members','channels','contacts','stages','agents','conversations','participants','messages','docs','appointments','flows','jobs','payments','catalog','posts','ads','settings','orders'] loop
  execute format('create index if not exists %I on %I(tenant_id)','ix_'||t||'_tenant',t);
  execute format('alter table %I enable row level security',t);
  execute format('alter table %I force row level security',t);
  execute format('drop policy if exists tenant_iso on %I',t);
  execute format($f$create policy tenant_iso on %I using (tenant_id = nullif(current_setting('app.tenant',true),'')::int) with check (tenant_id = nullif(current_setting('app.tenant',true),'')::int)$f$,t);
 end loop; end $$;

-- FKs do Postgres ignoram RLS; este gatilho (roda como o usuário do app) impede apontar para linha de outra empresa.
create or replace function fk_guard() returns trigger language plpgsql as $$
declare i int:=0; ok bool; v text;
begin
 while i < TG_NARGS loop
  v:=to_jsonb(NEW)->>TG_ARGV[i+1];
  if v is not null then
   execute format('select exists(select 1 from %I where id=$1::int)',TG_ARGV[i]) into ok using v;
   if not ok then raise exception 'referência inválida: %.%',TG_ARGV[i],TG_ARGV[i+1] using errcode='23503'; end if;
  end if; i:=i+2;
 end loop; return NEW; end $$;
do $$ declare r record; begin
 for r in select * from (values
  ('conversations','contacts,contact_id,channels,channel_id,stages,stage_id,users,assignee_id,agents,agent_id,teams,team_id'),
  ('contacts','channels,channel_id'),('channels','teams,team_id'),('messages','conversations,conversation_id'),
  ('participants','conversations,conversation_id,users,user_id'),('team_members','teams,team_id,users,user_id'),
  ('docs','agents,agent_id'),('appointments','contacts,contact_id'),('jobs','conversations,conversation_id,flows,flow_id'),
  ('payments','contacts,contact_id'),('posts','channels,channel_id'),('orders','contacts,contact_id')) v(t,a) loop
  execute format('drop trigger if exists fk_guard on %I',r.t);
  execute format('create trigger fk_guard before insert or update on %I for each row execute function fk_guard(%s)',r.t,(select string_agg(quote_literal(x),',') from unnest(string_to_array(r.a,',')) x));
 end loop; end $$;

-- Funções SECURITY DEFINER: únicas formas de olhar "entre empresas", e só o mínimo necessário.
create or replace function resolve_tenant(p_host text,p_slug text) returns int language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(
  (select id from tenants where active and coalesce(p_slug,'')<>'' and slug=p_slug),
  (select id from tenants where active and domain is not null and domain=p_host),
  (select case when count(*)=1 then min(id) end from tenants where active)) $$;
create or replace function login_lookup(p_email text) returns table(id int,tenant_id int,name text,pass text,role text) language sql stable security definer set search_path=public,pg_temp as $$
 select u.id,u.tenant_id,u.name,u.pass,u.role from users u join tenants t on t.id=u.tenant_id where u.email=p_email and not u.is_ai and t.active limit 1 $$;
create or replace function channel_tenant(p_id int) returns int language sql stable security definer set search_path=public,pg_temp as $$
 select tenant_id from channels where id=p_id and active $$;
revoke execute on function resolve_tenant(text,text),login_lookup(text),channel_tenant(int) from public;
