-- Brand-owned text only. Historical messages, customer documents and secrets stay intact.
create function pg_temp.vexora_brand_text(t text) returns text language sql immutable as $$
 select replace(replace(replace(replace(replace(replace(t,'nexora','vexora'),'Nexora','Vexora'),'NEXORA','VEXORA'),'néxora','véxora'),'Néxora','Véxora'),'NÉXORA','VÉXORA')
$$;
update settings set value=jsonb_set(value,'{name}',to_jsonb(pg_temp.vexora_brand_text(value->>'name'))) where key='brand' and value->>'name' ~* 'n[eé]xora';
update tenants set name=pg_temp.vexora_brand_text(name) where name ~* 'n[eé]xora';
update agents set name=pg_temp.vexora_brand_text(name),prompt=pg_temp.vexora_brand_text(prompt),tone=pg_temp.vexora_brand_text(tone),rules=pg_temp.vexora_brand_text(rules),forbidden=pg_temp.vexora_brand_text(forbidden) where concat_ws(' ',name,prompt,tone,rules,forbidden) ~* 'n[eé]xora';
update bots set name=pg_temp.vexora_brand_text(name) where name ~* 'n[eé]xora';
-- Domain mappings are changed in the platform UI only after DNS/TLS is ready.
