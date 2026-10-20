import {maskDoc,personType,money,fdate} from './lib.js';
export function debtSummary(result,doc,today=new Date().toISOString().slice(0,10)){
 const debts=result.debts||[],name=String(result.name||'Cliente').replace(/[\r\n*]/g,' ').trim();
 const heading=`Encontrei ${debts.length} ${debts.length===1?'débito':'débitos'} para *${name}* (${personType(doc)}).\nDocumento: ${maskDoc(doc)}`;
 if(!debts.length)return `Nenhum débito em aberto para *${name}* (${personType(doc)}).\nDocumento: ${maskDoc(doc)} ✅`;
 return heading+'\n\n'+debts.map((x,i)=>`${i+1}. ${money(x.value)} — venc. ${fdate(x.dueDate)}\n${x.status==='OVERDUE'||String(x.dueDate)<today?'⚠️ Vencido':'Em aberto'}${x.description?'\n'+String(x.description).replace(/[\r\n]+/g,' ').slice(0,180):''}`).join('\n\n──────────\n\n')+'\n\nTotal em aberto: '+money(debts.reduce((s,x)=>s+Number(x.value),0));
}
export function financialChunks(text,max=1800){const out=[];let part='';for(const paragraph of String(text).split('\n\n')){if(part&&part.length+paragraph.length+2>max){out.push(part);part=''}for(let start=0;start<paragraph.length;start+=max){const piece=paragraph.slice(start,start+max);if(part&&part.length+piece.length+2>max){out.push(part);part=''}part+=(part?'\n\n':'')+piece}}if(part)out.push(part);return out}
