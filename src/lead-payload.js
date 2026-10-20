import crypto from 'node:crypto';
const clean=(v,max=200)=>String(v??'').trim().slice(0,max);
export function leadPayload(b){
 if(!b||!['form','click','referral'].includes(b.type)||!clean(b.external_id)||!clean(b.handle)||/[\r\n]/.test(b.handle))throw Error('Informe type, external_id e handle do contato na inbox configurada');
 if(b.fields&&(typeof b.fields!=='object'||Array.isArray(b.fields)||Object.keys(b.fields).length>50))throw Error('Campos inválidos');
 if(JSON.stringify(b.fields||{}).length>16000)throw Error('Respostas muito extensas');
 let page='';if(b.page){const u=new URL(b.page);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('Página inválida');u.search='';u.hash='';page=u.href.slice(0,1000)}
 return {type:b.type,external_id:clean(b.external_id),handle:clean(b.handle,250),name:clean(b.name,120),campaign:clean(b.campaign),page,fields:b.fields||{}};
}
export function verifyLeadSignature(secret,raw,timestamp,signature,now=Date.now()){
 const t=Number(timestamp);if(!Number.isSafeInteger(t)||Math.abs(now-t*1000)>300000||!/^sha256=[a-f0-9]{64}$/i.test(String(signature||'')))return false;
 const wanted='sha256='+crypto.createHmac('sha256',secret).update(String(timestamp)+'.').update(raw).digest('hex');return crypto.timingSafeEqual(Buffer.from(wanted),Buffer.from(signature.toLowerCase()));
}
