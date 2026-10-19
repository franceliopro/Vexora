alter table conversations add column filing text not null default 'active' check(filing in ('active','archived','deleted'));
alter table conversations add column filed_at timestamptz;
alter table conversations add column filed_by int references users;
alter table conversations add column filing_reason text;
create index conversation_filing on conversations(tenant_id,filing,status,assignee_id);
