import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=fs.readFileSync('web/index.html','utf8');
const server=fs.readFileSync('src/server.js','utf8');
const realtime=fs.readFileSync('web/realtime.js','utf8');
const core=fs.readFileSync('src/core.js','utf8');
const db=fs.readFileSync('src/db.js','utf8');
const baileys=fs.readFileSync('src/drivers/baileys.js','utf8');
const attendance=fs.readFileSync('web/attendance.js','utf8');
const integrations=fs.readFileSync('web/integrations.js','utf8');
const waha=fs.readFileSync('src/drivers/waha.js','utf8');
const policy=fs.readFileSync('src/attendance-management.js','utf8');
const bus=fs.readFileSync('src/bus.js','utf8');

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
assert.ok(core.includes('inboundAutomationLimit=Math.max(1,Math.min(32,Number(process.env.INBOUND_AUTOMATION_CONCURRENCY)||8))'),'Inbound automation must use a bounded worker count');
assert.ok(core.includes('inboundTenantOrder')&&core.includes('if(m.defer_automation){bus(\'msg\''),'Messages must be persisted and published before queued AI work');
assert.ok(baileys.includes('defer_automation:true'),'Baileys text messages must not wait for AI automation to finish');
assert.ok(db.includes('PROCESSING_LOCK_POOL_SIZE'),'Conversation lock pool size must be configurable for deployment scale');
assert.ok(baileys.includes("sock.ev.on('presence.update'"),'Baileys presence events must be listened to');
assert.ok(bus.includes("type==='presence'"),'Presence events must be scoped to the conversation');
assert.ok(server.includes("app.post('/api/conversations/:id/presence'"),'Agents need a secure endpoint to signal typing and recording');
assert.ok(server.includes('const driver=D[info?.driver];if(driver?.presence)'),'Outgoing presence must use the selected connector');
assert.ok(integrations.includes("['baileys','Baileys · sessão gerenciada pela Véxora']")&&integrations.includes("['waha','WAHA · conectar a um servidor WAHA']"),'The administrator must choose the WhatsApp engine in the inbox setup');
assert.ok(integrations.toLowerCase().includes('qr aparecerá na véxora')&&integrations.includes('não instala nem hospeda o motor WAHA'),'The WAHA QR setup must explain its service requirement');
assert.ok(integrations.includes('setInterval(async()=>{if(!m.isConnected){clearInterval(statusTimer);return}try{await refreshStatuses()}catch{}},15000)'),'Connection status should refresh automatically without a page reload');
assert.ok(integrations.includes('deixe em branco para usar a WAHA_KEY configurada no Dokploy'),'Managed WAHA should not require copying the same key into every inbox');
assert.ok(waha.includes('chave API inválida ou ausente'),'WAHA 401 should have a clear diagnostic');
assert.ok(waha.includes('async function resolveRecipient(c,to)')&&waha.includes('/lids/'),'WAHA must resolve LID recipients to phone-number chat IDs before sending when a mapping exists');
assert.ok(waha.includes('j.engine?.engine'),'WAHA status must expose the actual session engine for diagnosis');
assert.ok(core.includes('Array.isArray(m.identity_aliases)?[...new Set([m.handle,...m.identity_aliases].filter(Boolean))]'),'Inbound WAHA LID aliases must match existing contacts');
assert.ok(waha.includes('export async function presence('),'WAHA connector must expose outbound presence when supported');
assert.ok(attendance.includes('Cliente digitando…')&&attendance.includes('Cliente gravando áudio…'),'Inbox must show customer presence states');
assert.ok(attendance.includes("signalPresence('typing')")&&attendance.includes("signalPresence('recording')"),'Agent typing and recording should be signalled to the customer');
assert.ok(policy.includes("DEFAULT_ATTENDANCE_POLICY={release_mode:'after_idle'")&&policy.includes('export async function tickAttendancePolicy(){return 0}'),'Idle defaults to overdue alerts rather than automatic queue release');
assert.ok(!policy.includes('assignee_id=null')&&server.includes('as idle_overdue')&&server.includes("c.last_at>now()-interval '5 minutes'")&&server.includes('idle_overdue desc'),'Recent activity moves a conversation to the top while overdue items remain prioritized afterward');
console.log('OK: inbox sync, media placeholders, customer/agent presence, and idle overdue alerts without queue release.');
