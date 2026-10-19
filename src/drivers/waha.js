import {saveMedia,readMedia,mediaType} from '../media.js';
const B=c=>c.config.url.replace(/\/$/,''),S=c=>c.config.session||'default';
const H=c=>({'content-type':'application/json','X-Api-Key':c.config.key||''});
const post=async(c,p,b)=>{const r=await fetch(B(c)+p,{method:'POST',headers:H(c),body:JSON.stringify(b)});if(!r.ok)throw new Error('WAHA '+r.status+' '+await r.text());return r.json().catch(()=>({}))};
export async function send(c,{to,kind,body,file,filename}){const chatId=to.includes('@')?to:to+'@c.us',session=S(c);let j;
 if(kind==='audio')j=await post(c,'/api/sendVoice',{session,chatId,convert:true,file:{mimetype:'audio/ogg; codecs=opus',data:readMedia(file).toString('base64')}});
 else if(kind==='image')j=await post(c,'/api/sendImage',{session,chatId,caption:body,file:{mimetype:mediaType(file),data:readMedia(file).toString('base64')}});
 else if(kind==='video'||kind==='file')j=await post(c,kind==='video'?'/api/sendVideo':'/api/sendFile',{session,chatId,caption:body||'',file:{mimetype:mediaType(file),filename:filename||file,data:readMedia(file).toString('base64')}});
 else j=await post(c,'/api/sendText',{session,chatId,text:body});
 return j?.id?._serialized||j?.id||null}
export async function parse(c,b){if(b.event!=='message'||b.payload.fromMe||String(b.payload.from).includes('@g.us'))return null;const p=b.payload;let kind='text',file=null;
 if(p.hasMedia&&p.media?.url){const r=await fetch(B(c)+new URL(p.media.url).pathname,{headers:H(c)});if(r.ok){const mt=p.media.mimetype||'';kind=mt.startsWith('audio')?'audio':mt.startsWith('image')?'image':mt.startsWith('video')?'video':'file';file=saveMedia(Buffer.from(await r.arrayBuffer()),kind==='audio'?'ogg':(mt.split('/')[1]||'bin').split(';')[0])}}
 return {handle:p.from.replace(/@.*/,''),name:p._data?.notifyName,kind,body:p.body||null,file,filename:p.media?.filename||null,ext_id:p.id}}
export async function connect(c,url){const name=S(c),config={...(c.config.session_config||{}),webhooks:[{url,events:['message'],retries:{policy:'linear',delaySeconds:2,attempts:5}}]};try{return await post(c,'/api/sessions',{name,start:true,config})}catch(e){if(!/422|409/.test(e.message))throw e;const r=await fetch(B(c)+'/api/sessions/'+encodeURIComponent(name),{method:'PUT',headers:H(c),body:JSON.stringify({name,config})});if(!r.ok)throw Error('WAHA: não foi possível atualizar a sessão');return post(c,'/api/sessions/'+encodeURIComponent(name)+'/start',{})}}
export async function qr(c){const r=await fetch(B(c)+`/api/${S(c)}/auth/qr`,{headers:{...H(c),accept:'image/png'}});return r.ok?'data:image/png;base64,'+Buffer.from(await r.arrayBuffer()).toString('base64'):null}

