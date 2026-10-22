import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=fs.readFileSync('web/index.html','utf8');
const server=fs.readFileSync('src/server.js','utf8');
const realtime=fs.readFileSync('web/realtime.js','utf8');
const core=fs.readFileSync('src/core.js','utf8');
const baileys=fs.readFileSync('src/drivers/baileys.js','utf8');

// Parse inline browser scripts without executing browser-only code.
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([,attrs,body])=>!/\bsrc\s*=/.test(attrs) && body.trim());
assert.ok(scripts.length>0,'Expected inline scripts in the application');
scripts.forEach(([,attrs,body],i)=>new vm.Script(body,{filename:'web/index.html:inline-'+i}));

assert.ok(html.includes('messages?after=' + String.fromCharCode(36) + '{after}'),'The inbox must fetch messages incrementally');
assert.ok(html.includes('syncMessages()},1500)'),'New messages need a fast fallback sync');
assert.ok(html.includes('ld(false)},4000)'),'Conversation list needs a fallback sync');
assert.ok(html.includes("else if(t==='conv'){ld(false).then("),'Conversation events must refresh the open chat');
assert.ok(html.includes('if(!cur){const incoming=cs.filter(c=>Number(c.unread)>0)'),'Unread incoming chats should be opened when no chat is selected');
assert.ok(server.includes("if(after){res.json((await q('select m.*,r.status delivery_status") && server.includes('m.id>$2 order by m.id asc limit 200'),'Server must return only messages after the cursor');
assert.ok(realtime.includes('new WebSocket(options.url())'),'WebSocket real-time transport must remain enabled');
assert.ok(baileys.includes('defer_media:true'),'Baileys media must be persisted before download completes');
assert.ok(baileys.includes('void(async()=>{try{const file=saveMedia(await B.downloadMediaMessage'),'Media download must run asynchronously after the initial inbox event');
assert.ok(core.includes("if(m.defer_media){bus('msg',{conversation_id:saved.cv.id,message:saved.msg});return saved}"),'Deferred media must emit an immediate placeholder event');
assert.ok(core.includes('export async function completeInboundMedia(saved,{file,filename,body=null}={})'),'Downloaded media must update the original message');
console.log('OK: inbox sync, WebSocket, incremental cursor and immediate Baileys media placeholders.');
