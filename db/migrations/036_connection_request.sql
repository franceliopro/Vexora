alter table agent_connections add column request_headers_secret text;
alter table agent_connections add column header_names jsonb not null default '[]';
alter table agent_connections add column body_template jsonb;
