-- Historical ai=true includes bot and protocol messages; do not guess their executor.
alter table messages add column executor text check(executor in ('bot','ai','system','human'));
