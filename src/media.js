import fs from 'fs';import path from 'path';import crypto from 'crypto';
export const MEDIA=process.env.MEDIA_DIR||'./data/media';fs.mkdirSync(MEDIA,{recursive:true});
export const saveMedia=(buf,ext)=>{ext=String(ext||'bin').toLowerCase();if(!/^[a-z0-9]{1,10}$/.test(ext))ext='bin';const f=crypto.randomUUID()+'.'+ext;fs.writeFileSync(path.join(MEDIA,f),buf);return f};
export const readMedia=f=>{if(!/^[\w-]+\.[a-z0-9]+$/i.test(f))throw Error('Arquivo inválido');return fs.readFileSync(path.join(MEDIA,f))};
export const mediaType=f=>({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',ogg:'audio/ogg',mp3:'audio/mpeg',wav:'audio/wav',mp4:'video/mp4',webm:'video/webm',pdf:'application/pdf',txt:'text/plain',csv:'text/csv',zip:'application/zip',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}[String(f).split('.').pop()]||'application/octet-stream');

