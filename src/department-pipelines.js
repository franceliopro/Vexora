const colors=['#8273e8','#4c9bd8','#e5b85a','#b080dc','#47b493','#d88b63','#64748b'];
export const DEPARTMENT_PRESETS={
 sales:{name:'Comercial',kind:'sales',code:'COM',teamAliases:['comercial','vendas'],stages:['Novo lead','Qualificação','Diagnóstico','Proposta enviada','Negociação','Contratação pendente','Conclusão'],description:'Oportunidades comerciais. Um contato que já é cliente não volta a ser Novo Lead só por abrir uma conversa.',reasons:['Sem interesse','Preço / condições','Sem retorno','Concorrência','Sem adequação'],fields:[
  {name:'Origem do lead',kind:'select',options:['WhatsApp','Site','Indicação','Campanha','Carteira existente','Outro']},
  {name:'Produto / interesse',kind:'text',options:[]},{name:'Necessidade confirmada',kind:'text',options:[]},
  {name:'Valor estimado',kind:'decimal',options:[]},{name:'Próxima ação',kind:'text',options:[]},
  {name:'Data de retorno',kind:'date',options:[]},{name:'Motivo de perda',kind:'select',options:['Sem interesse','Preço / condições','Sem retorno','Concorrência','Sem adequação']}
 ]},
 support:{name:'Suporte',kind:'support',code:'SUP',teamAliases:['suporte','atendimento técnico','suporte técnico'],stages:['Novo chamado','Triagem','Em diagnóstico','Aguardando cliente','Aguardando equipe / terceiro','Em resolução','Conclusão'],description:'Chamados e resolução. Aguardar cliente é diferente de aguardar a equipe ou um terceiro. O histórico fica vinculado ao contato único.',reasons:['Resolvido','Orientação fornecida','Duplicado','Sem retorno','Encaminhado'],fields:[
  {name:'Categoria do chamado',kind:'select',options:['Dúvida','Falha técnica','Solicitação','Reclamação','Acesso','Outro']},
  {name:'Prioridade',kind:'select',options:['Baixa','Normal','Alta','Crítica']},
  {name:'Protocolo externo',kind:'text',options:[]},{name:'Impacto',kind:'select',options:['Uma pessoa','Várias pessoas','Operação parada']},
  {name:'Serviço / produto',kind:'text',options:[]},{name:'Prazo / SLA',kind:'datetime',options:[]},
  {name:'Motivo da espera',kind:'select',options:['Aguardando cliente','Aguardando equipe','Aguardando terceiro','Aguardando sistema']},
  {name:'Resumo da resolução',kind:'text',options:[]}
 ]},
 finance:{name:'Financeiro',kind:'finance',code:'FIN',teamAliases:['financeiro','finance','cobrança','cobranca'],stages:['Nova solicitação','Conferência cadastral','Análise','Aguardando cliente','Aguardando pagamento / retorno externo','Conciliação','Conclusão'],description:'Solicitações financeiras e acompanhamento de pendências. O status de pagamento só muda após confirmação do provedor financeiro, nunca ao mover o cartão.',reasons:['Resolvido','Pagamento confirmado pelo provedor','Orientação fornecida','Cancelado com autorização','Sem retorno'],fields:[
  {name:'Tipo de solicitação',kind:'select',options:['Segunda via','Dúvida de cobrança','Contestação','Negociação','Comprovante','Reembolso','Outro']},
  {name:'Referência da cobrança',kind:'text',options:[]},{name:'Vencimento',kind:'date',options:[]},
  {name:'Valor da cobrança',kind:'decimal',options:[]},
  {name:'Status do provedor',kind:'select',options:['Não consultado','Pendente','Vencido','Recebido','Confirmado','Cancelado','Em análise']},
  {name:'Próxima ação financeira',kind:'text',options:[]}
 ]}
};
const STANDARD_KEYS=Object.keys(DEPARTMENT_PRESETS);
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
async function departmentTeams(query,preset){
 const teams=(await query('select id,name,routing from teams where archived_at is null order by id')).rows;
 const exact=teams.find(t=>preset.teamAliases.some(a=>norm(t.name)===norm(a)));
 const matched=exact?[exact]:teams.filter(t=>preset.teamAliases.some(a=>norm(t.name).startsWith(norm(a)+' ')||norm(t.name).startsWith(norm(a)+'·')||norm(t.name).startsWith(norm(a)+'-')));
 if(matched.length)return matched;
 return [(await query('insert into teams(name) values($1) returning id,name,routing',[preset.name])).rows[0]];
}
async function ensureFields(query,board,preset){
 for(const field of preset.fields){
  const existing=(await query("select id from field_definitions where board_id=$1 and scope='opportunity' and name=$2 order by id limit 1",[board.id,field.name])).rows[0];
  if(existing)await query('update field_definitions set kind=$2,options=$3,active=true where id=$1',[existing.id,field.kind,JSON.stringify(field.options)]);
  else await query("insert into field_definitions(name,kind,scope,options,board_id) values($1,$2,'opportunity',$3,$4)",[field.name,field.kind,JSON.stringify(field.options),board.id]);
 }
}
async function ensureReasons(query,board,preset){
 for(const name of preset.reasons)if(!(await query('select id from crm_loss_reasons where board_id=$1 and name=$2',[board.id,name])).rows.length)await query('insert into crm_loss_reasons(board_id,name,system) values($1,$2,$3)',[board.id,name,false]);
}
async function provisionBoard(query,actor,key,preset,teams){
 const teamIds=teams.map(t=>t.id);
 let board=(await query('select * from crm_boards where system_key=$1 for update',[key])).rows[0];
 if(!board){
  board=(await query("insert into crm_boards(name,code,description,kind,visibility,team_ids,manager_ids,allow_restricted,inactivity_days,celebrate,sound,labels,fields,created_by,system_key) values($1,$2,$3,$4,'team',$5,$6,false,null,false,false,'{}','[]',$7,$8) returning *",[preset.name,preset.code,preset.description,preset.kind,teamIds,[actor.id],actor.id,key])).rows[0];
  for(const [pos,name] of preset.stages.entries())await query('insert into crm_stages(board_id,name,color,pos,final) values($1,$2,$3,$4,$5)',[board.id,name,colors[pos%colors.length],pos,pos===preset.stages.length-1]);
 }else{
  board=(await query("update crm_boards set name=$2,code=$3,description=$4,kind=$5,visibility='team',team_ids=$6,manager_ids=case when cardinality(manager_ids)=0 then $7 else manager_ids end,archived_at=null where id=$1 returning *",[board.id,preset.name,preset.code,preset.description,preset.kind,teamIds,[actor.id]])).rows[0];
  if(!(await query('select id from crm_stages where board_id=$1 limit 1',[board.id])).rows.length)for(const [pos,name] of preset.stages.entries())await query('insert into crm_stages(board_id,name,color,pos,final) values($1,$2,$3,$4,$5)',[board.id,name,colors[pos%colors.length],pos,pos===preset.stages.length-1]);
 }
 await ensureFields(query,board,preset);await ensureReasons(query,board,preset);
 for(const team of teams)await query("update teams set routing=coalesce(routing,'{}'::jsonb)||jsonb_build_object('department_board_id',$2::int,'department_key',$3) where id=$1",[team.id,board.id,key]);
 return {id:board.id,key,name:board.name,team_ids:teamIds,team_name:teams.map(t=>t.name).join(', '),stages:preset.stages.length,fields:preset.fields.length};
}
export async function departmentBoardPreview(query){
 const boards=(await query("select b.id,b.name,b.kind,b.system_key,b.archived_at,(select count(*)::int from crm_cards c where c.board_id=b.id) cards from crm_boards b order by b.id")).rows;
 const teams=(await query("select id,name,routing from teams where archived_at is null order by name")).rows;
 return {standard:STANDARD_KEYS.map(key=>({key,name:DEPARTMENT_PRESETS[key].name,stages:DEPARTMENT_PRESETS[key].stages,fields:DEPARTMENT_PRESETS[key].fields.map(f=>({name:f.name,kind:f.kind}))})),boards,teams,legacy_active:boards.filter(b=>!b.archived_at&&!STANDARD_KEYS.includes(b.system_key)).length,legacy_cards:boards.filter(b=>!b.archived_at&&!STANDARD_KEYS.includes(b.system_key)).reduce((n,b)=>n+Number(b.cards||0),0)};
}
export function mountDepartmentPipelines(app,{q,adm,ah,tenantTransaction,bus}){
 app.get('/api/attendance/department-boards',adm,ah(async(req,res)=>res.json({teams:(await q('select id,name,routing from teams where archived_at is null order by name')).rows,boards:(await q('select id,name,kind,team_ids,system_key,archived_at from crm_boards order by id desc')).rows,presets:DEPARTMENT_PRESETS})));
 app.get('/api/attendance/department-boards/preview',adm,ah(async(req,res)=>res.json(await departmentBoardPreview(q))));
 app.post('/api/attendance/department-boards/setup',adm,ah(async(req,res)=>{
  if(req.body?.confirm!=='CONFIGURAR_PAINÉIS_PADRÃO')throw Object.assign(Error('Confirme a configuração dos painéis padrão.'),{status:400});
  const result=await tenantTransaction(req.u.tid,async query=>{
   const provisioned={};
   for(const key of STANDARD_KEYS){const preset=DEPARTMENT_PRESETS[key],teams=await departmentTeams(query,preset);provisioned[key]=await provisionBoard(query,req.u,key,preset,teams)}
   let archived=0;
   if(req.body.archive_existing===true){
    const r=await query("update crm_boards set archived_at=now() where archived_at is null and (system_key is null or system_key<>all($1::text[])) returning id",[STANDARD_KEYS]);
    archived=r.rowCount;
   }
   return {ok:true,boards:Object.values(provisioned),archived_legacy_boards:archived};
  });
  bus?.('crm',{department_setup:true});bus?.('invalidate',{});
  res.json(result);
 }));
 app.post('/api/attendance/department-boards/archived/:id/restore',adm,ah(async(req,res)=>{
  const result=await tenantTransaction(req.u.tid,async query=>{
   const b=(await query('update crm_boards set archived_at=null where id=$1 and archived_at is not null returning id,name',[Number(req.params.id)])).rows[0];
   if(!b)throw Error('Painel arquivado não encontrado');return b;
  });bus?.('crm',{board_id:result.id});res.json({ok:true,...result});
 }));
}
