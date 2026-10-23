-- Reversible retirement and stable identity for system-managed department CRM boards.
alter table crm_boards add column if not exists system_key text;
alter table crm_boards add column if not exists archived_at timestamptz;
create unique index if not exists crm_boards_tenant_system_key_uq
  on crm_boards(tenant_id,system_key) where system_key is not null;
create index if not exists crm_boards_tenant_active_idx
  on crm_boards(tenant_id,archived_at);
