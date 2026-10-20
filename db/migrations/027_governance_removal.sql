alter table users add column deleted_at timestamptz;
alter table teams add column archived_at timestamptz;
create table governance_events(id bigserial primary key,tenant_id int not null default nullif(current_setting('app.tenant',true),'')::int references tenants,actor_id int not null references users,entity text not null,entity_id int not null,action text not null,data jsonb not null default '{}',created_at timestamptz not null default now());
alter table governance_events enable row level security;
alter table governance_events force row level security;
create policy tenant_iso on governance_events using(tenant_id=nullif(current_setting('app.tenant',true),'')::int) with check(tenant_id=nullif(current_setting('app.tenant',true),'')::int);
create trigger fk_guard before insert or update on governance_events for each row execute function fk_guard('users','actor_id');
-- Retired records remain valid historical references, but cannot receive new work.
create function operational_team_guard() returns trigger language plpgsql as $$
begin
 if new.team_id is not null and (tg_op='INSERT' or new.team_id is distinct from old.team_id or (tg_table_name='channels' and (to_jsonb(new)->>'active')::boolean)) and exists(select 1 from teams where id=new.team_id and archived_at is not null) then raise exception 'Setor excluído: escolha outro setor'; end if;
 if tg_table_name='conversations' and (tg_op='INSERT' or (to_jsonb(new)->>'assignee_id') is distinct from (to_jsonb(old)->>'assignee_id')) and exists(select 1 from users where id=(to_jsonb(new)->>'assignee_id')::int and deleted_at is not null) then raise exception 'Usuário excluído: escolha outro responsável'; end if;
 if tg_table_name='team_members' and exists(select 1 from users where id=(to_jsonb(new)->>'user_id')::int and deleted_at is not null) then raise exception 'Usuário excluído: escolha outro integrante'; end if;
 return new;
end $$;
create trigger operational_team_guard before insert or update on conversations for each row execute function operational_team_guard();
create trigger operational_team_guard before insert or update on channels for each row execute function operational_team_guard();
create trigger operational_team_guard before insert or update on team_members for each row execute function operational_team_guard();
