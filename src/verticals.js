import {q} from './db.js';
// Ativar um vertical transforma o CRM: rótulos + etapas do funil. kind: open|won|lost
export const VERT={
geral:{mods:['billing'],contact:'Cliente',appt:'Agendamento',item:'Produto',stages:['Novo','Em conversa','Interessado','Cliente:won','Perdido:lost']},
barbearia:{mods:['billing'],contact:'Cliente',appt:'Horário',item:'Serviço',stages:['Novo','Agendado','Atendido:won','Fidelizado:won','Faltou:lost']},
clinica:{mods:['billing'],contact:'Paciente',appt:'Consulta',item:'Procedimento',stages:['Novo','Triagem','Consulta agendada','Em tratamento','Alta:won','Perdido:lost']},
advocacia:{mods:['billing'],contact:'Cliente',appt:'Reunião',item:'Serviço jurídico',stages:['Consulta','Proposta','Contratado:won','Em andamento','Encerrado:won','Perdido:lost']},
delivery:{mods:['delivery','billing'],contact:'Cliente',appt:'Reserva',item:'Cardápio',stages:['Novo','Pedido feito','Preparando','Saiu p/ entrega','Entregue:won','Cancelado:lost']},
escola:{mods:['school','billing'],contact:'Aluno',appt:'Aula',item:'Curso',stages:['Lead','Aula experimental','Matriculado:won','Ativo:won','Inadimplente','Evadido:lost']},
musica:{mods:['school','billing'],contact:'Aluno',appt:'Aula',item:'Instrumento/Plano',stages:['Lead','Aula experimental','Matriculado:won','Ativo:won','Trancou:lost']},
loja:{mods:['billing'],contact:'Cliente',appt:'Retirada',item:'Produto',stages:['Novo','Carrinho','Pago:won','Enviado:won','Pós-venda','Perdido:lost']},
beleza:{mods:['billing'],contact:'Cliente',appt:'Horário',item:'Serviço',stages:['Novo','Agendado','Atendido:won','Fidelizado:won','Perdido:lost']}};
export async function applyVertical(name){const v=VERT[name];if(!v)throw new Error('vertical inválido');
const st=v.stages.map(s=>s.split(':'));const ex=(await q('select id from stages order by pos')).rows;
for(let i=0;i<st.length;i++){const [n,k]=st[i];if(ex[i])await q('update stages set name=$1,pos=$2,kind=$3 where id=$4',[n,i,k||'open',ex[i].id]);else await q('insert into stages(name,pos,kind) values($1,$2,$3)',[n,i,k||'open'])}
const fb=ex.length>st.length?ex[0].id:null;
for(const e of ex.slice(st.length)){await q('update conversations set stage_id=$1 where stage_id=$2',[ex[0].id,e.id]);await q('delete from stages where id=$1',[e.id])}
await q("insert into settings(key,value) values('vertical',$1) on conflict(tenant_id,key) do update set value=$1",[JSON.stringify(name)])}
