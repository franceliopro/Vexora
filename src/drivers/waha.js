import {saveMedia,readMedia} from '../media.js';
const B=c=>c.config.url.replace(/\/$/,''),S=c=>c.config.session||'default';
const H=c=>({'content-type':'application/json','X-Api-Key':c.config.key||''});
const post=async(c,p,b)=>{const r=await fetch(B(c)+p,{method:'POST',headers:H(c),body:JSON.stringify(b)});if(!r.ok)throw new Error('WAHA '+r.status+' '+await r.text());return r.json().catch(()=>({}))};
export async function send(c,{to,kind,body,file}){const chatId=to.includes('@')?to:to+'@c.us',session=S(c);let j;
 if(kind==='audio')j=await post(c,'/api/sendVoice',{session,chatId,convert:true,file:{mimetype:'audio/ogg; codecs=opus',data:readMedia(file).toString('base64')}});
 else if(kind==='image')j=await post(c,'/api/sendImage',{session,chatId,caption:body,file:{mimetype:'image/jpeg',data:readMedia(file).toString('base64')}});
 else j=await post(c,'/api/sendText',{session,chatId,text:body});
 return j?.id?._serialized||j?.id||null}
export async function parse(c,b){if(b.event!=='message'||b.payload.fromMe||String(b.payload.from).includes('@g.us'))return null;const p=b.payload;let kind='text',file=null;
 if(p.hasMedia&&p.media?.url){const r=await fetch(B(c)+new URL(p.media.url).pathname,{headers:H(c)});if(r.ok){const mt=p.media.mimetype||'';kind=mt.startsWith('audio')?'audio':mt.startsWith('image')?'image':'text';file=saveMedia(Buffer.from(await r.arrayBuffer()),kind==='audio'?'ogg':(mt.split('/')[1]||'bin').split(';')[0])}}
 return {handle:p.from.replace(/@.*/,''),name:p._data?.notifyName,kind,body:p.body||null,file,ext_id:p.id}}
export const connect=async(c,pub)=>post(c,'/api/sessions',{name:S(c),start:true,config:{webhooks:[{url:`${pub}/webhook/waha/${c.id}`,events:['message']}]}}).catch(e=>String(e.message).includes('422')?0:Promise.reject(e));
export async function qr(c){const r=await fetch(B(c)+`/api/${S(c)}/auth/qr`,{headers:{...H(c),accept:'image/png'}});return r.ok?'data:image/png;base64,'+Buffer.from(await r.arrayBuffer()).toString('base64'):null}
