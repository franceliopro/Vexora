create table google_drive_connections(tenant_id int not null default nullif(current_setting('app.tenant',true),'')::int references tenants,user_id int not null references users,refresh_secret text,oauth_nonce text,oauth_expires timestamptz,connected_at timestamptz,primary key(tenant_id,user_id));
alter table google_drive_connections enable row level security;alter table google_drive_connections force row level security;
create policy tenant_iso on google_drive_connections using(tenant_id=nullif(current_setting('app.tenant',true),'')::int) with check(tenant_id=nullif(current_setting('app.tenant',true),'')::int);
create trigger fk_guard before insert or update on google_drive_connections for each row execute function fk_guard('users','user_id');
