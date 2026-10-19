create table platform_provider_settings(key text primary key,value jsonb not null);
create table managed_social_accounts(account_id text primary key,tenant_id int not null references tenants on delete cascade,created_at timestamptz not null default now());
insert into managed_social_accounts(account_id,tenant_id) select distinct on (config->>'account_id') config->>'account_id',tenant_id from channels where driver='zernio' and config->>'account_id' is not null order by config->>'account_id',id;
revoke all on platform_provider_settings,managed_social_accounts from public;
