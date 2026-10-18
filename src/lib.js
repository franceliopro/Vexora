// Funções puras (sem banco) — fáceis de testar.
export const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
export const digits=s=>String(s??'').replace(/\D/g,'');
export const tpl=(t,v)=>String(t??'').replace(/\{\{\s*([\w.]+)\s*\}\}/g,(_,k)=>{const x=k.split('.').reduce((a,c)=>a?.[c],v);return x==null?'':typeof x==='object'?JSON.stringify(x):x});
export const money=n=>'R$ '+Number(n||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
export const fdate=d=>String(d).slice(0,10).split('-').reverse().join('/');
export const personType=d=>digits(d).length===14?'Pessoa Jurídica':'Pessoa Física';
export const maskName=n=>String(n||'').trim().split(/\s+/).map(w=>w.length<=2?w:w.slice(0,2)+'*'.repeat(w.length-2)).join(' ');
export const maskDoc=x=>{const d=digits(x);return d.length===14?`**.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-**`:`***.${d.slice(3,6)}.${d.slice(6,9)}-**`};
// escolha por número ("2") ou texto ("financeiro"); devolve índice ou -1
export const matchOpt=(opts,text)=>{const t=norm(text);if(!t)return -1;if(/^\d{1,2}$/.test(t)){const i=+t-1;return i>=0&&i<opts.length?i:-1}
 let i=opts.findIndex(o=>norm(o)===t);if(i<0&&t.length>=3)i=opts.findIndex(o=>norm(o).includes(t));return i};
// regras de condição, uma por linha: "variavel = valor" | != | ~ (contém) | > | < | vazio | preenchido
export const parseRules=s=>String(s||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const m=l.match(/^(\S+)\s+(=|!=|~|>|<|vazio|preenchido)\s*(.*)$/i);return m?{k:m[1],op:m[2].toLowerCase(),v:m[3].trim()}:null}).filter(Boolean);
export function evalRules(text,mode,vars){const R=parseRules(text);if(!R.length)return true;
 const ok=r=>{const a=String(vars[r.k]??'');switch(r.op){case '=':return norm(a)===norm(r.v);case '!=':return norm(a)!==norm(r.v);case '~':return norm(a).includes(norm(r.v));case '>':return +a>+r.v;case '<':return +a<+r.v;case 'vazio':return !a;case 'preenchido':return !!a}return false};
 return mode==='any'?R.some(ok):R.every(ok)}
export const getPath=(o,p)=>String(p).split('.').reduce((a,c)=>a?.[c],o);
export function dueDate(y,m0,day){const d0=new Date(Date.UTC(y,m0,1));y=d0.getUTCFullYear();m0=d0.getUTCMonth();const last=new Date(Date.UTC(y,m0+1,0)).getUTCDate();return `${y}-${String(m0+1).padStart(2,'0')}-${String(Math.min(+day||1,last)).padStart(2,'0')}`}
export const daysBetween=(a,b)=>{const p=s=>{const [y,m,d]=String(s).slice(0,10).split('-').map(Number);return Date.UTC(y,m-1,d)};return Math.round((p(b)-p(a))/864e5)};
export const isPrivateIp=ip=>/^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(ip)||/^(::1|::|fc|fd|fe80)/i.test(ip)||/^::ffff:(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/i.test(ip);
export const DEFAULT_RULES=[
 {offset:-10,text:'Olá {{nome}}! 😊 Lembrete: {{descricao}} de {{valor}} vence em {{vencimento}}.\nPague por aqui: {{link}}'},
 {offset:-5,text:'Oi {{nome}}, faltam 5 dias para o vencimento ({{vencimento}}) de {{valor}}.\n{{link}}'},
 {offset:0,text:'Olá {{nome}}, hoje vence {{descricao}} ({{valor}}).\n{{link}}'},
 {offset:3,text:'Oi {{nome}}, não identificamos o pagamento de {{valor}} (venc. {{vencimento}}). Se já pagou, desconsidere. Link: {{link}}'}];
// ---- cupom (térmica 80mm = 48 colunas; 58mm = 32)
const asc=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\x20-\x7e]/g,'?');
const row=(l,r,cols)=>{l=asc(l);r=asc(r);const sp=Math.max(cols-r.length,1);return (l.length>sp-1?l.slice(0,sp-1):l).padEnd(sp)+r};
export function ticketLines(o,st={},cols=48){const L=[],P=(s,x={})=>L.push({s:asc(s),...x}),hr=()=>P('-'.repeat(cols)),D=new Date(o.created_at||Date.now());
 P(st.name||'PEDIDO',{a:'c',b:1,big:1});P(`#${o.number}  ${o.kind==='entrega'?'ENTREGA':o.kind==='retirada'?'RETIRADA':o.table_no?'MESA '+o.table_no:'BALCAO'}`,{a:'c',b:1});P(D.toLocaleString('pt-BR'),{a:'c'});hr();
 if(o.customer_name)P('Cliente: '+o.customer_name);if(o.customer_phone)P('Tel: '+o.customer_phone);
 if(o.kind==='entrega'){if(o.zone)P('Bairro: '+o.zone);if(o.address)P('End: '+o.address)}
 hr();for(const i of o.items||[]){P(row(`${i.qty}x ${i.name}${i.variant?' ('+i.variant+')':''}`,money(i.total),cols),{b:1});for(const a of i.addons||[])P('   + '+a.name)}
 hr();P(row('Subtotal',money(o.subtotal),cols));if(+o.delivery_fee)P(row('Entrega',money(o.delivery_fee),cols));P(row('TOTAL',money(o.total),cols),{b:1});
 P('Pagto: '+(o.payment_method||'-')+(o.paid?' (PAGO)':''));if(o.notes)P('Obs: '+o.notes);hr();P(st.footer||'Obrigado!',{a:'c'});return L}
export const renderText=(L,cols=48)=>L.map(x=>x.a==='c'?x.s.padStart(Math.floor((cols+x.s.length)/2)):x.s).join('\n');
export function renderEsc(L){let b='\x1b@';for(const x of L)b+=`\x1ba${x.a==='c'?1:0}\x1bE${x.b?1:0}\x1d!${x.big?'\x11':'\x00'}${x.s}\n`;return Buffer.from(b+'\x1ba\x00\x1bE\x00\x1d!\x00\n\n\n\x1dVB\x00','latin1').toString('base64')}
