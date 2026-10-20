import {positiveId} from './product.js';
export function mountGovernanceRemoval(app,{adm,ah,q,tenantTransaction,bus}){
 for(const type of ['users','teams'])app.delete('/api/governance/'+type+'/:id',adm,ah(async(req,res)=>{const id=positiveId(req.params.id);await tenantTransaction(req.u.tid,async query=>{
 const row=(await query(`select * from ${type} where id=$1 for update`,[id])).rows[0];if(!row)throw Error('Cadastro não encontrado');if(String(req.body.confirm||'')!==row.name)throw Error('Digite o nome exato para confirmar');
 if(type==='users'){
 if(id===req.u.id)throw Error('Você não pode excluir seu próprio usuário');if(row.role==='owner')throw Error('O dono da empresa não pode ser excluído. Altere o perfil antes, preservando outro dono ativo.');if(row.deleted_at)return;
 if((await query("select id from conversations where assignee_id=$1 and status='open' limit 1",[id])).rows.length)throw Error('Transfira ou conclua os atendimentos abertos deste usuário antes de excluir');
 await query('update users set active=false,deleted_at=now() where id=$1',[id]);await query('delete from team_members where user_id=$1',[id]);await query('update contacts set portfolio_user_id=null where portfolio_user_id=$1',[id]);
 }else{
 if(row.archived_at)return;
 if((await query("select id from conversations where team_id=$1 and status='open' limit 1",[id])).rows.length)throw Error('Transfira ou conclua os atendimentos abertos deste setor antes de excluir');
 if((await query('select id from channels where team_id=$1 and active limit 1',[id])).rows.length)throw Error('Altere a equipe de entrada das inboxes deste setor antes de excluir');
 if((await query("select id from bots where active and exists(select 1 from jsonb_array_elements(graph->'nodes') n where n->>'type'='transfer' and n->'data'->>'target'='team' and n->'data'->>'team_id'=$1) limit 1",[String(id)])).rows.length)throw Error('Altere o destino deste setor nos bots ativos antes de excluir');
 await query("update teams set archived_at=now(),routing='{}' where id=$1",[id]);await query('delete from team_members where team_id=$1',[id]);
 }
 await query('insert into governance_events(actor_id,entity,entity_id,action,data) values($1,$2,$3,$4,$5)',[req.u.id,type,id,'removed',JSON.stringify({name:row.name,history_preserved:true})]);
 });bus('invalidate',{});res.json({ok:true,history_preserved:true})}));
}
