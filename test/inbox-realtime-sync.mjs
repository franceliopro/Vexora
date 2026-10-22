import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=fs.readFileSync('web/index.html','utf8');
const server=fs.readFileSync('src/server.js','utf8');
const realtime=fs.readFileSync('web/realtime.js','utf8');

// Parse all inline browser scripts without executing browser-only code.
const scripts=[...html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script>/gi)]
  .filter(([,attrs,body])=>! /\\bsrc\\s*=/.test(attrs) && body.trim());
assert.ok(scripts.length>0,'Expected inline scripts in the application');
scripts.forEach(([,attrs,body],i)=>new vm.Script(body,{filename:'web/index.html:inline-'+i}));

assert.match(html,/messages\\?after=\\$\\{after\\}/,'The inbox must fetch messages incrementally');
assert.match(html,/setInterval\\(\\(\\)=>\\{if\\(!frame\\.isConnected\\)/,'Inbox sync timers must stop after leaving the inbox');
assert.match(html,/syncMessages\\(\\),1500\\)/,'New messages need a fast fallback sync');
assert.match(html,/ld\\(false\\),4000\\)/,'Conversation list needs a fallback sync');
assert.match(html,/if\\(t===\x27conv\x27\\)\\{ld\\(false\\)\\.then/,'Conversation events must refresh the open chat');
assert.match(html,/if\\(!cur\\)\\{const incoming=cs\\.filter\\(c=>Number\\(c\\.unread\\)>0\\)/,'Unread incoming chats should be opened when no chat is selected');
assert.match(server,/if\\(after\\)\\{res\\.json\\(\\(await q\\([\\s\\S]*?m\\.id>\\$2 order by m\\.id asc limit 200/,'Server must return only messages after the cursor');
assert.match(realtime,/new WebSocket\\(options\\.url\\(\\)\\)/,'WebSocket real-time transport must remain enabled');
console.log('OK: inline JavaScript syntax, WebSocket events, incremental message cursor, fast fallback sync and automatic unread selection.');
