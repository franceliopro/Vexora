// Zernio: Instagram, Facebook, TikTok, X, LinkedIn... ⚠ Endpoints/payload do webhook ajustáveis em config (não verificados contra a doc oficial).
const B=c=>(c.config.base_url||'https://zernio.com/api/v1').replace(/\/$/,'');
const call=async(c,p,b)=>{const r=await fetch(B(c)+p,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+c.config.key},body:JSON.stringify(b)});if(!r.ok)throw new Error('Zernio '+r.status+' '+await r.text());return r.json().catch(()=>({}))};
export async function send(c,{to,kind,body,replyTo}){
 if(replyTo?.kind==='comment')return (await call(c,`/comments/${replyTo.ext_id}/reply`,{text:body})).id||null;
 return (await call(c,'/messages',{platform:c.config.platform,accountId:c.config.account_id,to,text:body})).id||null}
// Webhook esperado: {event:'message'|'comment', sender:{id,name}, text, id}
export async function parse(c,b){if(!b.sender)return null;return {handle:String(b.sender.id),name:b.sender.name,kind:b.event==='comment'?'comment':'text',body:b.text,ext_id:b.id}}
export const react=(c,id,emoji)=>call(c,'/reactions',{id,emoji});
export const publish=(c,p)=>call(c,'/posts',p);
export const connect=async()=>{};export const qr=async()=>null;
