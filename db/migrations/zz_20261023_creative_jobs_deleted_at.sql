-- Keep a reversible record of dismissed creative-history cards.
-- Existing publications and their media remain untouched.
alter table creative_jobs
  add column if not exists deleted_at timestamptz;

create index if not exists creative_jobs_tenant_visible_idx
  on creative_jobs (tenant_id, id desc)
  where deleted_at is null;
