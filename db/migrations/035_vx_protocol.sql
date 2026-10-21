-- Exclusive table lock and transactional migration: only the prefix changes.
lock table conversations in access exclusive mode;
alter table conversations disable trigger conversation_protocol;
update conversations set protocol='VX-'||substring(protocol from 4) where protocol like 'NX-%';
alter table conversations enable trigger conversation_protocol;
create or replace function service_protocol() returns trigger language plpgsql as $$ begin
 if TG_OP='INSERT' then new.protocol:='VX-'||extract(year from coalesce(new.created_at,now()))::int||'-'||new.tenant_id||'-'||lpad(new.id::text,greatest(6,length(new.id::text)),'0');
 elsif new.protocol is distinct from old.protocol then raise exception 'O protocolo do atendimento não pode ser alterado';end if;return new;end $$;
-- Historical sent messages stay immutable. Queue search accepts the old prefix.
