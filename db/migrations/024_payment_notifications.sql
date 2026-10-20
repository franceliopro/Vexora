-- Existing paid payments are not replayed on upgrade.
alter table payments add column notification_status text check(notification_status in ('pending','sending','sent','blocked','check_required'));
alter table payments add column notification_body text;
alter table payments add column notification_detail text;
alter table payments add column notification_at timestamptz;
create index payment_notification_queue on payments(tenant_id,id) where notification_status='pending';
