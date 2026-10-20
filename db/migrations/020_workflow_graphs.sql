alter table flows add column graph jsonb;
alter table jobs add column graph_snapshot jsonb,add column node text,add column vars jsonb not null default '{}',add column hops int not null default 0,add column stop_on_reply boolean not null default true,add column started_at timestamptz not null default now();
