// Keep non-phone WhatsApp IDs intact so replies reach the same remote chat.
export function incomingIdentity(m){const remote=m.key?.remoteJid;if(!remote||m.key.fromMe||!m.message||remote==='status@broadcast'||/@(g\.us|broadcast|newsletter)$/.test(remote))return null;const jid=m.key.remoteJidAlt?.endsWith('@s.whatsapp.net')?m.key.remoteJidAlt:remote;return jid.endsWith('@s.whatsapp.net')?jid.replace(/@.*/, ''):jid;}
export function messageContent(m){let x=m||{};for(let i=0;i<5;i++){const nested=x.ephemeralMessage?.message||x.viewOnceMessage?.message||x.viewOnceMessageV2?.message||x.documentWithCaptionMessage?.message;if(!nested)break;x=nested}return x;}

// Baileys 6 exposes senderPn; newer versions also use remoteJidAlt.
// Only WhatsApp transport metadata can establish this binding, never message text.
export function incomingPhone(m){const remote=m.key?.remoteJid;if(!incomingIdentity(m)||!/@(lid|s\.whatsapp\.net)$/.test(remote))return '';for(const value of [m.key?.remoteJidAlt,m.key?.senderPn,remote]){const match=String(value||'').match(/^(\d{10,15})(?::\d+)?@s\.whatsapp\.net$/);if(match)return match[1]}return ''}
export function incomingAliases(m){const remote=m.key?.remoteJid,phone=incomingPhone(m);return [...new Set([incomingIdentity(m),remote?.endsWith('@s.whatsapp.net')?remote.replace(/(?::\d+)?@.*/,''):remote,phone].filter(Boolean))]}
