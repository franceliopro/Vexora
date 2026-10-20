import * as L from '../src/lib.js';import {advance} from '../src/bots/engine.js';
let bad=0;const eq=(a,b,m)=>{if(JSON.stringify(a)!==JSON.stringify(b)){console.log('FAIL',m,'\n  got',JSON.stringify(a),'\n  exp',JSON.stringify(b));bad++}};
// ---- lib
eq(L.maskName('Maria Fernanda López'),'Ma*** Fe****** Ló***','maskName');eq(L.maskDoc('123.456.789-09'),'***.456.789-**','maskCpf');eq(L.maskDoc('12345678000195'),'**.345.678/0001-**','maskCnpj');
eq(L.personType('12345678000195'),'Pessoa Jurídica','pj');eq(L.personType('52998224725'),'Pessoa Física','pf');eq(L.money(1234.5),'R$ 1.234,50','money');
eq([L.validDoc('529.982.247-25'),L.validDoc('52998224724'),L.validDoc('111.111.111-11'),L.validDoc('11.222.333/0001-81'),L.validDoc('11222333000182'),L.validDoc('123')],[true,false,false,true,false,false],'validDoc');
eq(L.dueDate(2026,1,31),'2026-02-28','due1');eq(L.dueDate(2026,12,10),'2027-01-10','due2');eq(L.daysBetween('2026-10-10','2026-10-15'),5,'days');
eq(L.matchOpt(['Dúvidas gerais','Financeiro'],'duvidas'),0,'accent');eq(L.matchOpt(['a','b'],'3'),-1,'oob');
eq(L.evalRules('x = sim\ny > 3','all',{x:'sim',y:5}),true,'rules');eq(L.isPrivateIp('10.1.1.1'),true,'ip');eq(L.isPrivateIp('8.8.8.8'),false,'ip2');
eq(L.textToRules('-10 | Oi {{nome}}\n0: hoje\nlixo'),[{offset:-10,text:'Oi {{nome}}'},{offset:0,text:'hoje'}],'rulesParse');eq(L.rulesToText(L.textToRules('3 | a')),'3 | a','rulesRound');
// ---- cobrança recorrente: 10 dias antes, 5 antes, no dia, 3 depois
const sub={id:1,due_day:15,start_date:'2026-01-01',rules:null};
eq(L.planCharges([sub],new Set(),'2026-10-04').map(x=>x.due),[],'11 dias antes: ainda não cria');
eq(L.planCharges([sub],new Set(),'2026-10-05').map(x=>x.due),['2026-10-15'],'cria 10 dias antes');
eq(L.planCharges([sub],new Set(['1|2026-10-15']),'2026-10-20').map(x=>x.due),[],'não duplica; nov só 10 dias antes');
eq(L.planCharges([sub],new Set(['1|2026-10-15']),'2026-11-05').map(x=>x.due),['2026-11-15'],'próximo mês');
eq(L.planCharges([{...sub,start_date:'2026-12-01'}],new Set(),'2026-10-05').length,0,'respeita start');
eq(L.planCharges([{...sub,due_day:31}],new Set(),'2026-02-20').map(x=>x.due),['2026-02-28'],'fim de mês');
const ch=d=>({id:1,due_date:d,sent:[]});const off=(d,t,sent=[])=>L.planReminders([{...ch(d),sent}],t).map(x=>x.rule.offset);
eq(off('2026-10-15','2026-10-05'),[-10],'10 antes');eq(off('2026-10-15','2026-10-10'),[-5],'5 antes');eq(off('2026-10-15','2026-10-15'),[0],'no dia');eq(off('2026-10-15','2026-10-18'),[3],'3 depois');
eq(off('2026-10-15','2026-10-12'),[],'dia sem regra');eq(off('2026-10-15','2026-10-15',[0]),[],'já enviado');eq(off('2026-10-15','2026-10-06'),[-10],'catch-up 1 dia');eq(off('2026-10-15','2026-10-30'),[],'não persegue p/ sempre');
// ---- engine: simulador de conversa
const mk=(graph,over={})=>{const out=[],st={stage:[],transfer:[]},deps={send:async t=>out.push(t),setStage:async s=>st.stage.push(s),transfer:async d=>st.transfer.push(d),builtins:async()=>({nome:'Ana'}),http:async()=>({ok:true,data:{x:1}}),
 asaasDebts:async()=>({name:'Maria Fernanda López',debts:[{id:'p1',value:150,dueDate:'2020-01-10',status:'OVERDUE',description:'Mensalidade'},{id:'p2',value:99.9,dueDate:'2099-01-10',status:'PENDING'}]}),
 asaasPay:async()=>({bankSlipUrl:'https://b/x.pdf',identificationField:'34191.79001 01043.510047',pixPayload:'00020126PIX',invoiceUrl:'https://i/1'}),
 menu:async()=>({categories:[{id:1,name:'Pizzas',items:[{id:10,name:'Calabresa',price:0,variants:[{name:'Média',price:40},{name:'Grande',price:60}],addons:[{name:'Borda',price:8}]}]},{id:2,name:'Bebidas',items:[{id:11,name:'Coca',price:7,variants:[],addons:[]}]}],zones:[{name:'Centro',fee:6,min_order:30}],pay_methods:['Pix','Dinheiro'],pix_key:'chave@pix'}),
 createOrder:async o=>({number:42,total:68,...o}),...over};
 const run={node:graph.nodes.find(n=>n.type==='start').id,waiting:false,vars:{},tries:0};let done=false;
 return {out,st,run,deps,say:async t=>{const r=await advance({graph,run,text:t,deps});done=r.done;return r},get done(){return done}}};
const G=(nodes,edges)=>({nodes:nodes.map(([id,type,data])=>({id,type,data:data||{}})),edges:edges.map(([from,out,to])=>({from,out,to}))});
{ // setor: start → msg → choice → (o0 IA, o1 asaas→msg, o2 transfer)
 const g=G([['s','start'],['m','message',{text:'Oi {{nome}}!'}],['c','choice',{text:'Como ajudar?',options:['Dúvidas gerais','Financeiro','Suporte']}],['ai','transfer',{target:'ai',agent_id:1}],['a','asaas'],['f','message',{text:'Algo mais?'}],['h','transfer',{target:'queue'}]],
  [['s','next','m'],['m','next','c'],['c','o0','ai'],['c','o1','a'],['a','next','f'],['c','o2','h']]);
 const b=mk(g);let r=await b.say(null);eq([b.out[0],b.out[1].startsWith('Como ajudar?\n\n1. Dúvidas gerais'),r.done],['Oi Ana!',true,false],'engine start');
 await b.say('financeiro');eq(b.out.at(-1).includes('CPF ou CNPJ'),true,'pede doc');
 await b.say('123');eq(b.out.at(-1).includes('inválido'),true,'doc inválido');
 await b.say('529.982.247-25');const sum=b.out.at(-2);eq([sum.includes('Maria Fernanda López'),sum.includes('Pessoa Física'),sum.includes('***.982.247-**'),sum.includes('Vencido'),sum.includes('10/01/2020'),sum.includes('R$ 150,00')],[true,true,true,true,true,true],'nome completo e documento mascarado');
 eq(b.out.at(-1),'Qual débito deseja pagar? Responda com o número.','pergunta débito');
 await b.say('1');eq(b.out.at(-1).includes('3. Pix copia e cola'),true,'formas');
 await b.say('3');eq(b.out.slice(-4,-2),['💳 R$ 150,00 — venc. 10/01/2020\nPix copia e cola (toque e segure para copiar):','00020126PIX'],'pix');
 await b.say('2');eq(b.out.at(-1),'Algo mais?','segue fluxo pós-pagamento (não pagar outro)'); eq(b.run.vars._a,undefined,'limpa estado');
 // boleto/linha digitável
 const b2=mk(g);await b2.say(null);await b2.say('2');await b2.say('52998224725');await b2.say('2');await b2.say('2');eq(b2.out.slice(-4,-2),['💳 R$ 99,90 — venc. 10/01/2099\nLinha digitável:','34191.79001 01043.510047'],'linha digitável');
 const b3=mk(g);await b3.say(null);await b3.say('1');eq(b3.st.transfer,[{target:'ai',agent_id:1}],'transfer IA');eq(b3.done,true,'fim');
 const b4=mk(g);await b4.say(null);await b4.say('xx');await b4.say('yy');eq(b4.out.at(-1).includes('Não entendi'),true,'inválido 1');
 const b5=mk(g,{asaasDebts:async()=>({name:'X',debts:[]})});await b5.say(null);await b5.say('2');await b5.say('52998224725');eq(b5.out.at(-1).includes('Não encontramos débitos'),true,'sem débitos');
 const b6=mk(g,{asaasDebts:async()=>{throw new Error('x')}});await b6.say(null);await b6.say('2');await b6.say('11222333000181');eq(b6.out.at(-1).includes('Não consegui consultar'),true,'erro API');
 const b7=mk(g);await b7.say(null);await b7.say('2');for(const x of ['1','2','3'])await b7.say(x);eq([b7.out.at(-1),b7.done],['Não consegui validar o documento.',true],'3 docs inválidos encerram');
}
{ // pizzaria
 const g=G([['s','start'],['o','order'],['m','message',{text:'Pedido {{pedido}} ok'}]],[['s','next','o'],['o','next','m']]);let created;
 const b=mk(g,{createOrder:async o=>(created=o,{number:42,total:74})});await b.say(null);eq(b.out.at(-1).includes('1. Pizzas\n2. Bebidas'),true,'cardápio');
 await b.say('1');eq(b.out.at(-1).includes('a partir de R$ 40,00'),true,'itens');await b.say('1');eq(b.out.at(-1).includes('1. Média — R$ 40,00'),true,'variantes');
 await b.say('grande');eq(b.out.at(-1).includes('Borda (+R$ 8,00)'),true,'addons');await b.say('1');await b.say('2');eq(b.out.at(-1).includes('Subtotal: R$ 136,00'),true,'subtotal (60+8)*2');
 await b.say('2');await b.say('1');eq(b.out.at(-1).includes('Centro — taxa R$ 6,00'),true,'zonas');await b.say('1');await b.say('Rua A, 10');await b.say('1');
 eq(b.out.at(-1).includes('*Total: R$ 142,00*'),true,'total c/ taxa');await b.say('1');
 eq(created,{kind:'entrega',items:[{item_id:10,variant:'Grande',addons:['Borda'],qty:2}],zone:'Centro',address:'Rua A, 10',payment_method:'Pix'},'payload sem preços do cliente');
 eq(b.out.slice(-2),['🎉 Pedido *#42* confirmado! Total R$ 74,00.\n\nPague via Pix (chave): chave@pix\nAvisaremos quando sair. Obrigado!','Pedido 42 ok'],'confirmação');
 const c=mk(g);await c.say(null);await c.say('1');await c.say('cancelar');eq([c.done,c.out.at(-1).includes('cancelado')],[true,true],'cancelar');
 const d=mk(g);await d.say(null);await d.say('2');await d.say('1');await d.say('3');eq(d.out.at(-1).includes('Subtotal: R$ 21,00'),true,'sem variantes');await d.say('2');await d.say('1');await d.say('1');eq(d.out.at(-1).includes('mínimo para Centro é R$ 30,00'),true,'pedido mínimo');
}
await import('./financial-identity.mjs');
await import('./automation-experience.mjs');
await import('./product.mjs');
await import('./workflow-graph.mjs');
await import('./tracking.mjs');
await import('./realtime.mjs');
await import('./driver-contracts.mjs');
await import('./meta-contracts.mjs');
await import('./baileys-runtime.mjs');
console.log(bad?`${bad} FALHAS`:'TODOS OS TESTES OK');process.exit(bad?1:0);

