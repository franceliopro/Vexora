create table message_receipts(
 tenant_id int not null default nullif(current_setting('app.tenant',true),'')::int references tenants,
 channel_id int not null references channels,external_id text not null check(length(external_id) between 1 and 512),
 status text not null check(status in ('sent','delivered','read','failed')),rank int not null check(rank between 0 and 3),updated_at timestamptz not null default now(),
 primary key(tenant_id,channel_id,external_id)
);
alter table message_receipts enable row level security;
alter table message_receipts force row level security;
create policy tenant_iso on message_receipts using(tenant_id=nullif(current_setting('app.tenant',true),'')::int) with check(tenant_id=nullif(current_setting('app.tenant',true),'')::int);
create trigger fk_guard before insert or update on message_receipts for each row execute function fk_guard('channels','channel_id');
alter table conversation_payment_requests add column message_ids bigint[] not null default '{}';
