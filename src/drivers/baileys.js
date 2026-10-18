import QR from 'qrcode';import {saveMedia,readMedia} from '../media.js';import {bus} from '../bus.js';
const socks={},qrs={};
export async function start(ch,onMsg){const B=await import('@whiskeysockets/baileys');const mk=B.default.default||B.default;
 const {state,saveCreds}=await B.useMultiFileAuthState(`${process.env.MEDIA_DIR?.replace(/media$/,'')||'./data/'}baileys/${ch.id}`);
 const sock=mk({auth:state,printQRInTerminal:false});socks[ch.id]=sock;
 sock.ev.on('creds.update',saveCreds);
 sock.ev.on('connection.update',async u=>{if(u.qr){qrs[ch.id]=await QR.toDataURL(u.qr);bus('qr',{channel:ch.id})}
  if(u.connection==='open'){delete qrs[ch.id];bus('qr',{channel:ch.id,ok:true})}
  if(u.connection==='close'&&u.lastDisconnect?.error?.output?.statusCode!==401)setTimeout(()=>start(ch,onMsg),3000)});
 sock.ev.on('messages.upsert',async({messages})=>{for(const m of messages){if(m.key.fromMe||!m.message||m.key.remoteJid.endsWith('@g.us')||m.key.remoteJid==='status@broadcast')continue;
  const x=m.message;let kind='text',file=null,body=x.conversation||x.extendedTextMessage?.text||x.imageMessage?.caption||null;
  try{if(x.audioMessage){kind='audio';file=saveMedia(await B.downloadMediaMessage(m,'buffer',{}),'ogg')}else if(x.imageMessage){kind='image';file=saveMedia(await B.downloadMediaMessage(m,'buffer',{}),'jpg')}}catch(e){console.error('media',e.message)}
  if(!body&&!file)continue;onMsg(ch.id,{handle:m.key.remoteJid.replace(/@.*/,''),name:m.pushName,kind,body,file,ext_id:m.key.id})}})}
export async function send(ch,{to,kind,body,file}){const s=socks[ch.id];if(!s)throw new Error('Baileys desconectado');const jid=to.includes('@')?to:to+'@s.whatsapp.net';
 const r=kind==='audio'?await s.sendMessage(jid,{audio:readMedia(file),mimetype:'audio/ogg; codecs=opus',ptt:true}):kind==='image'?await s.sendMessage(jid,{image:readMedia(file),caption:body}):await s.sendMessage(jid,{text:body});return r?.key?.id}
export const qr=async ch=>qrs[ch.id]||null;
export const connect=async(ch)=>{if(!socks[ch.id])await start(ch,(await import('../core.js')).inbound)};
