-- Preserve custom content and IDs. Scope changes to companies where this template is already installed.
do $$ declare r record; begin
 for r in select tenant_id,value from settings where key='template:rastreamento_veicular' loop
  insert into settings(tenant_id,key,value) select r.tenant_id,'template:rastreabem:before-identity',jsonb_build_object('agent_name',a.name,'prompt',a.prompt,'bot_name',b.name,'graph',b.graph) from agents a join bots b on b.tenant_id=a.tenant_id where a.tenant_id=r.tenant_id and a.id=(r.value->>'agent_id')::int and b.id=(r.value->>'bot_id')::int on conflict do nothing;
  update agents set name=case when name='Rastreamento Veicular · 3 plataformas' then 'Rastreabem — Rastreamento de veículos' else name end,
   prompt=E'Atendimento exclusivo da Rastreabem — Rastreamento de veículos. As plataformas são divisões comerciais, com uma única base Asaas da empresa.\n\n'||replace(coalesce(prompt,''),'Você recebe clientes de uma empresa de rastreamento veicular.','Você atende exclusivamente a Rastreabem — Rastreamento de veículos.')
   where tenant_id=r.tenant_id and id=(r.value->>'agent_id')::int and coalesce(prompt,'') not like 'Atendimento exclusivo da Rastreabem%';
  update bots set name='Rastreabem — Rastreamento de veículos' where tenant_id=r.tenant_id and name='Rastreamento Veicular · 3 plataformas';
  update bots b set graph=jsonb_set(b.graph,'{nodes}',(select jsonb_agg(case when n->>'id'='boas_vindas' and n#>>'{data,text}'='{{saudacao}}! Seja bem-vindo(a) à nossa central de atendimento.' then jsonb_set(n,'{data,text}',to_jsonb('{{saudacao}}! Seja bem-vindo(a) à Rastreabem — Rastreamento de veículos.'::text)) else n end order by ord) from jsonb_array_elements(b.graph->'nodes') with ordinality a(n,ord))) where b.tenant_id=r.tenant_id and (b.id=(r.value->>'bot_id')::int or exists(select 1 from jsonb_array_elements(b.graph->'nodes') n where n->>'id'='financeiro_plataforma')) and b.graph->'nodes' is not null and jsonb_array_length(b.graph->'nodes')>0;
 end loop;
end $$;
