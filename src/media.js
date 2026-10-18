import fs from 'fs';import path from 'path';import crypto from 'crypto';
export const MEDIA=process.env.MEDIA_DIR||'./data/media';fs.mkdirSync(MEDIA,{recursive:true});
export const saveMedia=(buf,ext)=>{const f=crypto.randomUUID()+'.'+ext;fs.writeFileSync(path.join(MEDIA,f),buf);return f};
export const readMedia=f=>fs.readFileSync(path.join(MEDIA,f));
