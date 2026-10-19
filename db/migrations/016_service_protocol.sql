alter table conversations add column protocol text;
alter table conversations add column protocol_delivery text not null default 'pending' check(protocol_delivery in ('pending','sending','sent','check_required','not_requested'));
alter table conversations add column protocol_sent_at timestamptz;
alter table conversations add column protocol_attempt_at timestamptz;
update conversations set protocol='NX-'||extract(year from created_at)::int||'-'||tenant_id||'-'||lpad(id::text,greatest(6,length(id::text)),'0'),protocol_delivery='not_requested';
alter table conversations alter column protocol set not null;
create unique index conversation_protocol_unique on conversations(tenant_id,protocol);
create function service_protocol() returns trigger language plpgsql as $$ begin
 if TG_OP='INSERT' then new.protocol:='NX-'||extract(year from coalesce(new.created_at,now()))::int||'-'||new.tenant_id||'-'||lpad(new.id::text,greatest(6,length(new.id::text)),'0');
 elsif new.protocol is distinct from old.protocol then raise exception 'O protocolo do atendimento não pode ser alterado';end if;return new;end $$;
create trigger conversation_protocol before insert or update on conversations for each row execute function service_protocol();
