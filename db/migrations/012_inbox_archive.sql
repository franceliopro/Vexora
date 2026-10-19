alter table channels add column archived_at timestamptz;
update channels set archived_at=now() where coalesce((config->>'inbox_archived')::boolean,false);
create index channels_archive on channels(tenant_id,archived_at);
