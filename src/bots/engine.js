import {prettyNumber,optionNumber} from '../service-entry.js';
// Motor de fluxos (tipo Typebot). Puro: recebe o grafo, o estado da execução e "deps" (efeitos). Testável sem banco.
import {debtSummary,financialChunks} from '../debt-presentation.js';
import {matchOpt,evalRules,tpl,maskName,maskDoc,personType,money,fdate,digits,validDoc,norm} from '../lib.js';
const lst=(a,f)=>a.map((x,i)=>`${prettyNumber(i+1)} ${f(x)}`).join('\n');
const nextOf=(g,id,out='next')=>(g.edges||[]).find(e=>e.from===id&&e.out===out)?.to;
const CANCEL=t=>/^\s*cancelar\s*$/i.test(t||'');

export async function advance({graph,run,text,deps}){
 const N=Object.fromEntries((graph.nodes||[]).map(n=>[n.id,n]));let input=text,guard=0;
 while(guard++<200){
  const n=N[run.node];if(!n)return {done:true};
  const ctx={...(await deps.builtins()),...run.vars};
  const r=run.waiting?await onInput(n,input,run,deps,ctx):await onEnter(n,run,deps,ctx);
  if(r.stay){run.waiting=true;return {done:false}}
  if(r.end)return {done:true};
  run.waiting=false;run.tries=0;input=null;
  const nx=nextOf(graph,n.id,r.out||'next');if(!nx)return {done:true};run.node=nx}
 return {done:true,stopped:'Limite de passos do ciclo atingido'}}

async function onEnter(n,run,deps,ctx){const d=n.data||{},V=run.vars;
 switch(n.type){
  case 'start':return {};
  case 'message':await deps.send(tpl(d.text,ctx));return {};
  case 'choice':{const o=d.options||[];await deps.send(`${tpl(d.text,ctx)}\n\n${lst(o,x=>x)}`,{text:tpl(d.text,ctx),options:o});return {stay:1}}
  case 'input':await deps.send(tpl(d.text,ctx));return {stay:1};
  case 'condition':return {out:evalRules(d.rules,d.mode,ctx)?'yes':'no'};
  case 'set':if(!/^[a-zA-Z]\w{0,60}$/.test(d.k||''))throw Error('Variável inválida');V[d.k]=tpl(d.v,ctx);return {};
  case 'tag':case 'contact':await deps.contactAction(n.type,{...d,value:tpl(d.value,ctx)});return {};
  case 'note':await deps.note(tpl(d.text,ctx));return {};
  case 'cycle':{const key='_cycle_'+n.id,count=Number(V[key]||0),limit=Math.max(1,Math.min(20,Number(d.limit)||1));if(count<limit){V[key]=count+1;return {out:'repeat'}}return {out:'done'}};
  case 'stage':if(d.stage)await deps.setStage(d.stage);return {};
  case 'transfer':if(d.text)await deps.send(tpl(d.text,ctx));await deps.transfer(d);return {};
  case 'http':{const r=await deps.http(d,ctx);if(d.var)V[d.var]=r.ok?r.data:null;return {out:r.ok?'ok':'error'}}
  case 'asaas':return asaas(n,run,deps,null,true);
  case 'order':return order(run,deps,null,true);
  case 'close':await deps.close({reason:d.reason||'Fluxo de atendimento concluído',outcome:d.outcome||'resolved',text:d.text});return {end:1};
  case 'end':if(d.close)await deps.close({reason:d.reason||'Fluxo concluído',outcome:'resolved'});return {end:1};
  default:return {}}}

async function onInput(n,input,run,deps,ctx){const d=n.data||{},V=run.vars,t=String(input??'').trim();
 switch(n.type){
  case 'choice':{const o=d.options||[],i=choiceOption(o,String(optionNumber(t)??t));if(i>=0)return {out:'o'+i};
   run.tries++;await deps.send(`Opção inválida. ${tpl(d.text,ctx)}\n\n${lst(o,x=>x)}\n\nResponda com o número da opção.`,{text:'Opção inválida. '+tpl(d.text,ctx),options:o});return {stay:1}}
  case 'input':{let ok=!!t,val=t;if(d.validate==='doc'){ok=validDoc(t);val=digits(t)}else if(d.validate==='email')ok=/^\S+@\S+\.\S+$/.test(t);else if(d.validate==='number'){ok=t!==''&&!isNaN(+t.replace(',','.'));val=t.replace(',','.')}
   if(ok){V[d.var||'resposta']=val;return {}}if(++run.tries>=3)return {out:'invalid'};await deps.send(d.error||'Valor inválido, tente novamente.');return {stay:1}}
  case 'asaas':return asaas(n,run,deps,t,false);
  case 'order':return order(run,deps,t,false)}
 return {}}

// ---------- Cobranças Asaas: CPF/CNPJ → débitos (dados mascarados) → escolher débito → escolher forma de pagar
const METHODS=['Boleto completo (link/PDF)','Código do boleto (linha digitável)','Pix copia e cola','Fatura completa (cartão e outros, conforme cobrança)'];
const stTxt=(x,today)=>x.status==='OVERDUE'||String(x.dueDate)<today?'⚠️ vencido':'em aberto';
async function asaas(n,run,deps,t,enter){const d=n.data||{},V=run.vars,A=V._a??={step:'doc',tries:0};
 const today=new Date().toISOString().slice(0,10);
 const lookup=async doc=>{let r;try{r=await deps.asaasDebts(doc,{platform:d.platform||V.plataforma,verifyPhone:!!d.verifyPhone})}catch(e){await deps.send('Não consegui consultar agora. Tente novamente em instantes ou fale com um atendente.');return {out:'error'}}
  A.doc=doc;if(d.var)V[d.var]=digits(doc);
  if(!r.debts.length){await deps.send(`Não encontramos débitos em aberto para ${personType(doc)} ${maskDoc(doc)}. ✅`);return {out:'none'}}
  A.debts=r.debts;A.name=r.name;
  const tot=r.debts.reduce((a,x)=>a+ +x.value,0);
  for(const chunk of financialChunks(debtSummary(r,doc,today)))await deps.send(chunk);
  if(r.debts.length===1){A.sel=0;return askMethod()}
  A.step='pick';await deps.send('Qual débito deseja pagar? Responda com o número.');return {stay:1}};
 const askMethod=async()=>{A.step='method';await deps.send(`Como prefere pagar?\n\n${lst(METHODS,x=>x)}`);return {stay:1}};
 if(enter){const pre=d.docVar&&V[d.docVar];if(pre&&validDoc(pre))return lookup(digits(pre));A.step='doc';await deps.send(d.text||'Para consultar, informe o *CPF ou CNPJ* (somente números).');return {stay:1}}
 if(CANCEL(t))return {out:'none'};
 if(A.step==='doc'){if(!validDoc(t)){if(++run.tries>=3){await deps.send('Não consegui validar o documento.');return {out:'error'}}await deps.send('CPF/CNPJ inválido. Digite somente os números.');return {stay:1}}
  if((A.lookups=(A.lookups||0)+1)>3){await deps.send('Limite de consultas atingido. Fale com um atendente.');return {out:'error'}}return lookup(digits(t))}
 if(A.step==='pick'){const i=matchOpt(A.debts.map(x=>String(x.value)),t);if(i<0){await deps.send('Responda com o número do débito.');return {stay:1}}A.sel=i;return askMethod()}
 if(A.step==='method'){const i=matchOpt(METHODS,t);if(i<0){await deps.send(`Escolha uma opção:\n\n${lst(METHODS,x=>x)}`);return {stay:1}}
  const deb=A.debts[A.sel];let info;try{info=await deps.asaasPay(deb.id,{platform:d.platform||V.plataforma})}catch{await deps.send('Não consegui gerar o pagamento agora. Fale com um atendente.');return {out:'error'}}
  const head=`💳 ${money(deb.value)} — venc. ${fdate(deb.dueDate)}`;
  if(i===0){await deps.send(`${head}\nBoleto: ${info.bankSlipUrl||info.invoiceUrl||'indisponível'}`)}
  else if(i===1){if(info.identificationField){await deps.send(`${head}\nLinha digitável:`);await deps.send(info.identificationField)}else await deps.send(`${head}\nCódigo indisponível. Boleto: ${info.bankSlipUrl||info.invoiceUrl||''}`)}
  else if(i===2){if(info.pixPayload){await deps.send(`${head}\nPix copia e cola (toque e segure para copiar):`);await deps.send(info.pixPayload)}else await deps.send(`${head}\nPix indisponível para esta cobrança. Link: ${info.invoiceUrl||''}`)}
  else if(!info.invoiceUrl)await deps.send(`${head}\nFatura indisponível. Fale com o financeiro.`);
  if(info.invoiceUrl)await deps.send('Fatura completa: '+info.invoiceUrl);else{await deps.send('A fatura completa não foi disponibilizada pelo provedor. Vou encaminhar ao financeiro.');if(d.alwaysInvoice)return {out:'error'}}
  if(A.debts.length>1){A.step='more';await deps.send('Deseja pagar outro débito?\n1. Sim\n2. Não');return {stay:1}}
  delete V._a;return {}}
 if(A.step==='more'){const i=matchOpt(['sim','nao'],t);if(i===0){A.step='pick';await deps.send(`Qual débito?\n\n${lst(A.debts,x=>`${money(x.value)} — venc. ${fdate(x.dueDate)}`)}`);return {stay:1}}delete V._a;return {}}
 return {}}

// ---------- Pedido pelo WhatsApp (cardápio numerado): categoria → item → tamanho → adicionais → qtd → entrega/retirada → endereço → pagamento → confirma
async function order(run,deps,t,enter){const V=run.vars,M=await deps.menu(),cats=M.categories.filter(c=>c.items.length);
 let O=V._o;const say=x=>deps.send(x),stay={stay:1};
 const showCats=async()=>{O.step='cat';await say(`🍽️ *Cardápio*\n\n${lst(cats,c=>c.name)}\n\nDigite o número da categoria (ou *cancelar*).`);return stay};
 const price=i=>i.variants?.length?'a partir de '+money(Math.min(...i.variants.map(v=>+v.price))):money(i.price);
 const sub=()=>O.cart.reduce((a,i)=>a+i.total,0);
 if(enter){if(!cats.length){await say('Cardápio indisponível no momento.');return {out:'error'}}O=V._o={step:'cat',cart:[]};return showCats()}
 if(!O)return {out:'error'};
 if(CANCEL(t)){delete V._o;await say('Pedido cancelado. Quando quiser, é só chamar! 🙂');return {out:'cancel'}}
 const bad=async(m)=>{await say(m||'Não entendi. Responda com o número da opção.');return stay};
 const toQty=async()=>{O.step='qty';await say(`Quantas unidades de *${O.cur.name}${O.cur.variant?' ('+O.cur.variant+')':''}*?`);return stay};
 const afterVariant=async()=>{const it=O.cur.src;if(it.addons?.length){O.step='addons';await say(`Quer adicionar algo?\n\n${lst(it.addons,a=>`${a.name} (+${money(a.price)})`)}\n\nDigite os números separados por vírgula, ou *0* para nenhum.`);return stay}return toQty()};
 switch(O.step){
  case 'cat':{const i=matchOpt(cats.map(c=>c.name),t);if(i<0)return bad();O.catIdx=i;O.step='item';const its=cats[i].items;await say(`*${cats[i].name}*\n\n${lst(its,x=>`${x.name} — ${price(x)}${x.description?'\n   '+String(x.description).slice(0,70):''}`)}\n\nEscolha pelo número.`);return stay}
  case 'item':{const its=cats[O.catIdx].items,i=matchOpt(its.map(x=>x.name),t);if(i<0)return bad();const it=its[i];O.cur={item_id:it.id,name:it.name,variant:null,addons:[],src:{addons:it.addons||[],variants:it.variants||[],price:it.price}};
   if(it.variants?.length){O.step='variant';await say(`Qual tamanho/opção?\n\n${lst(it.variants,v=>`${v.name} — ${money(v.price)}`)}`);return stay}return afterVariant()}
  case 'variant':{const vs=O.cur.src.variants,i=matchOpt(vs.map(v=>v.name),t);if(i<0)return bad();O.cur.variant=vs[i].name;return afterVariant()}
  case 'addons':{const ad=O.cur.src.addons;if(t!=='0'){const ix=[...new Set(t.split(/[,\s]+/).map(x=>parseInt(x)-1))];if(!ix.length||ix.some(k=>!(k>=0&&k<ad.length)))return bad('Digite os números dos adicionais (ex: 1,2) ou 0 para nenhum.');O.cur.addons=ix.map(k=>ad[k].name)}return toQty()}
  case 'qty':{const q=parseInt(t);if(!(q>=1&&q<=50))return bad('Digite a quantidade (1 a 50).');const c=O.cur,vs=c.src.variants,unit=vs.length?+vs.find(v=>v.name===c.variant).price:+c.src.price,ad=c.addons.reduce((a,n)=>a+ +(c.src.addons.find(x=>x.name===n)?.price||0),0);
   O.cart.push({item_id:c.item_id,name:c.name,variant:c.variant,addons:c.addons,qty:q,total:(unit+ad)*q});delete O.cur;O.step='more';
   await say(`✅ Adicionado! Subtotal: ${money(sub())}\n\n1. Adicionar mais itens\n2. Finalizar pedido`);return stay}
  case 'more':{const i=matchOpt(['mais','finalizar'],t);if(i===0)return showCats();if(i<0)return bad();O.step='kind';await say('Como quer receber?\n\n1. Entrega\n2. Retirada no balcão');return stay}
  case 'kind':{const i=matchOpt(['entrega','retirada'],t);if(i<0)return bad();O.kind=i===0?'entrega':'retirada';
   if(O.kind==='entrega'&&M.zones.length){O.step='zone';await say(`Qual o seu bairro/região?\n\n${lst(M.zones,z=>`${z.name} — taxa ${money(z.fee)}${+z.min_order?` (mín. ${money(z.min_order)})`:''}`)}`);return stay}
   if(O.kind==='entrega'){O.step='address';await say('Digite o endereço completo (rua, número, complemento).');return stay}return payStep()}
  case 'zone':{const i=matchOpt(M.zones.map(z=>z.name),t);if(i<0)return bad();const z=M.zones[i];if(sub()<+z.min_order){O.step='more';await say(`O pedido mínimo para ${z.name} é ${money(z.min_order)}. Seu subtotal: ${money(sub())}.\n\n1. Adicionar mais itens\n2. Finalizar pedido`);return stay}
   O.zone=z.name;O.fee=+z.fee;O.step='address';await say('Digite o endereço completo (rua, número, complemento).');return stay}
  case 'address':{if(t.length<6)return bad('Endereço muito curto. Digite rua, número e complemento.');O.address=t;return payStep()}
  case 'pay':{const pm=M.pay_methods,i=matchOpt(pm,t);if(i<0)return bad();O.pay=pm[i];O.step='confirm';
   const fee=O.fee||0;await say(`*Resumo do pedido*\n\n${O.cart.map(c=>`${c.qty}x ${c.name}${c.variant?' ('+c.variant+')':''}${c.addons.length?' + '+c.addons.join(', '):''} — ${money(c.total)}`).join('\n')}\n\nSubtotal: ${money(sub())}${fee?`\nEntrega: ${money(fee)}`:''}\n*Total: ${money(sub()+fee)}*\n${O.kind==='entrega'?`Endereço: ${O.address}\n`:'Retirada no balcão\n'}Pagamento: ${O.pay}\n\n1. Confirmar\n2. Cancelar`);return stay}
  case 'confirm':{const i=matchOpt(['confirmar','cancelar'],t);if(i<0)return bad();if(i===1){delete V._o;await say('Pedido cancelado. 🙂');return {out:'cancel'}}
   let o;try{o=await deps.createOrder({kind:O.kind,items:O.cart.map(c=>({item_id:c.item_id,variant:c.variant,addons:c.addons,qty:c.qty})),zone:O.zone,address:O.address,payment_method:O.pay})}
   catch(e){await say('Não consegui registrar: '+e.message);return {out:'error'}}
   V.pedido=o.number;delete V._o;await say(`🎉 Pedido *#${o.number}* confirmado! Total ${money(o.total)}.${/pix/i.test(O.pay)&&M.pix_key?`\n\nPague via Pix (chave): ${M.pix_key}`:''}\nAvisaremos quando sair. Obrigado!`);return {}}}
 return {out:'error'};
 async function payStep(){O.step='pay';await say(`Forma de pagamento?\n\n${lst(M.pay_methods,x=>x)}`);return stay}}


// Only choice blocks opt into AI; input, CPF and payment selection remain deterministic.
export function choiceOption(options,text){const t=norm(String(text||'').replace('🔟','10').replace(/\uFE0F|\u20E3/g,'').trim());if(/^\d{1,2}$/.test(t)){const i=Number(t)-1;return i>=0&&i<options.length?i:-1}return options.findIndex(o=>norm(o)===t)}
export function shouldUseAI(node,msg){if(node?.type!=='choice'||node.data?.aiFallback!=='on')return false;if(msg.kind==='audio')return true;const text=String(msg.body||'').trim();return [...text].length>3&&choiceOption(node.data.options||[],text)<0}

export const fallbackReady=(agent,msg)=>!!agent&&[].concat(agent.llm||[]).some(c=>c?.key&&c.model)&&(msg.kind!=='audio'||[].concat(agent.stt||[]).some(c=>c?.key&&c.model));
