alter table field_definitions add column board_id integer references crm_boards;
create trigger fk_guard before insert or update on field_definitions for each row execute function fk_guard('crm_boards','board_id');
create or replace function login_lookup(p_email text) returns table(id int,tenant_id int,name text,pass text,role text) language sql stable security definer set search_path=public,pg_temp as $$
 select u.id,u.tenant_id,u.name,u.pass,u.role from users u join tenants t on t.id=u.tenant_id where u.email=p_email and not u.is_ai and u.active and t.active limit 1 $$;
