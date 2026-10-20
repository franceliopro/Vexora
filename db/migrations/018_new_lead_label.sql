-- Label only newly created contacts, including API/import/inbox entry paths.
create function tag_new_lead() returns trigger language plpgsql as $$
declare label_id int;
begin
 insert into labels(tenant_id,name,color,active) values(new.tenant_id,'Novo Lead','#3984ed',true)
 on conflict(tenant_id,name) do update set active=true returning id into label_id;
 new.labels:=coalesce(new.labels,'{}'::int[]);
 if not label_id=any(new.labels) then new.labels:=array_append(new.labels,label_id);end if;
 return new;
end $$;
create trigger contact_new_lead before insert on contacts for each row execute function tag_new_lead();
