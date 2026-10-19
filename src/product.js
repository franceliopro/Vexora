import {TRACKING_TEMPLATE,trackingGraph,ensureTrackingTeams} from './tracking-template.js';
// Product definitions and validation shared by company provisioning and templates.
export const PRODUCT_MODULES = [
 ['inbox','Central de Atendimento'],['pipeline','CRM'],['leads','Inteligência e Rastreamento de Leads'],
 ['agent','Agentes de IA'],['bots','Chatbots'],['campaigns','Campanhas'],['sequences','Sequências'],
 ['scheduled','Mensagens Agendadas'],['integrations','Integração e API'],['pay','Pagamentos'],['personalization','Personalização para cada Cliente']
];
const GUARD='Não invente preços, disponibilidade, pagamentos ou ações concluídas. Não revele dados de outros contatos. Encaminhe ao humano quando não houver informação ou autorização. Não solicite senhas nem dados de cartão.';
export const TEMPLATES = [
 {id:'comercial',name:'Vendas e qualificação',description:'Entender a necessidade e encaminhar o lead para a equipe comercial.',tone:'Cordial, objetivo e consultivo.',prompt:'Você atende interessados na empresa. Identifique necessidade, contexto e melhor próximo passo. Faça uma pergunta por vez. Use apenas o conhecimento cadastrado.',rules:'Colete nome e necessidade; peça consentimento antes de registrar dados adicionais. Encaminhe ao comercial para proposta e negociação.',greeting:'Olá! Como podemos ajudar você a encontrar a solução ideal?'},
 {id:'clinica',name:'Recepção de clínica',description:'Atendimento administrativo e encaminhamento para agendamento.',tone:'Acolhedor, discreto e claro.',prompt:'Você é assistente administrativo da clínica. Informe apenas serviços, horários e políticas cadastrados. Ajude com dúvidas administrativas e encaminhe para agendamento.',rules:'Não faça diagnóstico, prescrição ou triagem clínica. Evite coletar dados de saúde no chat. Para urgência declarada, oriente a procurar atendimento de emergência local e encaminhe ao humano.',greeting:'Olá! Seja bem-vindo(a). Você deseja informações ou ajuda com um agendamento?'},
 {id:'advocacia',name:'Recepção jurídica',description:'Coleta inicial mínima e encaminhamento para um profissional.',tone:'Profissional, respeitoso e reservado.',prompt:'Você é assistente de recepção do escritório. Identifique de forma geral o assunto e o melhor contato, sem prestar aconselhamento jurídico.',rules:'Não prometa resultados, não calcule prazos processuais nem forneça parecer jurídico. Não peça documentos sensíveis no primeiro contato; encaminhe para o advogado.',greeting:'Olá! Em qual assunto nosso escritório pode ajudar?'},
 {id:'educacao',name:'Cursos e aulas',description:'Informações sobre cursos e interesse em matrícula.',tone:'Didático, paciente e acolhedor.',prompt:'Você apresenta os cursos e aulas da instituição usando somente o catálogo e as políticas cadastradas.',rules:'Identifique curso de interesse e disponibilidade. Não confirme vaga ou matrícula sem consultar a fonte autorizada. Encaminhe condições comerciais para um humano.',greeting:'Olá! Que curso ou aula você gostaria de conhecer?'},
 {id:'delivery',name:'Atendimento de delivery',description:'Informações de cardápio e encaminhamento de pedidos.',tone:'Ágil, simpático e direto.',prompt:'Você auxilia clientes com o cardápio, entrega e pedidos usando somente as informações cadastradas.',rules:'Não invente preços, ingredientes, restrições alimentares, prazos ou estoque. Não confirme pedido/pagamento sem confirmação do sistema. Encaminhe ao atendente quando necessário.',greeting:'Olá! Você quer conhecer o cardápio ou falar sobre um pedido?'},
 {id:'suporte',name:'Suporte ao cliente',description:'Entender a solicitação e encaminhar ao setor responsável.',tone:'Calmo, prestativo e objetivo.',prompt:'Você recebe solicitações de suporte, consulta a base de conhecimento e ajuda com procedimentos aprovados.',rules:'Peça contexto mínimo. Nunca solicite senha. Não execute ação destrutiva. Encaminhe ao humano quando a base não cobrir o problema.',greeting:'Olá! Conte como podemos ajudar você hoje.'}
].map(t=>({...t,forbidden:GUARD}));
TEMPLATES.push(TRACKING_TEMPLATE);
export function templateSpec(id){const t=TEMPLATES.find(t=>t.id===id);if(!t)throw new Error('Template inválido');return t}
export function templateGraph(t,agentId){return {nodes:[
 {id:'inicio',type:'start',x:40,y:80,data:{}},
 {id:'saudacao',type:'message',x:330,y:80,data:{text:t.greeting}},
 {id:'agente',type:'transfer',x:620,y:80,data:{target:'ai',agent_id:agentId}}
 ],edges:[{from:'inicio',out:'next',to:'saudacao'},{from:'saudacao',out:'next',to:'agente'}]}}
export function text(value,label,max=10000){if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(label+' inválido');return value.trim()}
export function positiveId(v){const n=Number(v);if(!Number.isSafeInteger(n)||n<=0)throw new Error('ID inválido');return n}
function image(value,label){if(value===''||value==null)return '';if(typeof value!=='string'||value.length>1500000)throw new Error(label+' inválido (máximo 1 MB)');
 if(/^\/media\/[a-zA-Z0-9_.-]+$/.test(value))return value;
 if(value.startsWith('https://')){const u=new URL(value);if(u.username||u.password)throw new Error(label+' inválido');return value}
 const m=value.match(/^data:image\/(png|jpeg|webp|x-icon|vnd.microsoft.icon);base64,([A-Za-z0-9+/]+={0,2})$/);if(!m)throw new Error(label+': use PNG, JPEG, WebP ou ICO');const b=Buffer.from(m[2],'base64');if(b.length>1024*1024)throw new Error(label+': máximo 1 MB');
 const ok=m[1]==='png'?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):m[1]==='jpeg'?b[0]===255&&b[1]===216:m[1]==='webp'?b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP':b.subarray(0,4).equals(Buffer.from([0,0,1,0]));if(!ok)throw new Error(label+': formato inválido');return value}
export function normalizeBrand(b={}){if(!b||typeof b!=='object'||Array.isArray(b))throw new Error('Marca inválida');const out={};
 if('name'in b)out.name=text(b.name,'Nome',100);
 if('color'in b){if(typeof b.color!=='string'||!/^#[\da-f]{6}$/i.test(b.color))throw new Error('Cor inválida');out.color=b.color}
 if('font'in b){if(typeof b.font!=='string'||!/^[-\p{L}\p{N} ]{1,60}$/u.test(b.font))throw new Error('Fonte inválida');out.font=b.font}
 for(const [key,label]of [['logo','Logotipo claro'],['logo_dark','Logotipo escuro'],['favicon','Favicon']])if(key in b)out[key]=image(b[key],label);
 return out}
// Caller must provide a tenant-scoped transaction. Existing configuration is never overwritten.
export async function installTemplate(query,id){const t=templateSpec(id);await query("select pg_advisory_xact_lock(hashtext(current_setting('app.tenant') || ':template:' || $1))",[id]);
 const key='template:'+id;const previous=(await query('select value from settings where key=$1',[key])).rows[0];if(previous)return {...previous.value,existing:true};
 const teams=id==='rastreamento_veicular'?await ensureTrackingTeams(query):null;
 const agent=(await query('insert into agents(name,prompt,tone,rules,forbidden,active,channel_ids) values($1,$2,$3,$4,$5,false,$6) returning id',[t.name,t.prompt,t.tone,t.rules,t.forbidden,[]])).rows[0];
 const bot=(await query('insert into bots(name,graph,trigger,active,channel_ids) values($1,$2,$3,false,$4) returning id',[t.name,JSON.stringify(teams?trackingGraph(teams):templateGraph(t,agent.id)),JSON.stringify({type:'first'}),[]])).rows[0];
 if(teams)await query("update agents set tools=$2 where id=$1",[agent.id,['handoff','move_stage','tracking_triage']]);
 const value={template:id,agent_id:agent.id,bot_id:bot.id,...(teams?{teams,time_zone:'America/Sao_Paulo'}:{})};await query('insert into settings(key,value) values($1,$2)',[key,JSON.stringify(value)]);return {...value,existing:false}}
