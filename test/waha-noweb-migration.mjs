import fs from 'node:fs';
import assert from 'node:assert/strict';

const compose=fs.readFileSync('docker-compose.yml','utf8');
const readme=fs.readFileSync('README.md','utf8');
const service=compose.split(/^  waha:\s*$/m)[1]?.split(/^  [a-z][\w-]*:\s*/m)[0]||'';

assert.match(service,/image:\s*devlikeapro\/waha:noweb/,'WAHA deployment must use the NOWEB image');
assert.match(service,/WHATSAPP_DEFAULT_ENGINE:\s*NOWEB/,'New sessions must default to NOWEB');
assert.match(service,/WAHA_NAMESPACE:\s*all/,'WAHA API namespace must preserve access to existing session namespaces');
assert.match(service,/WAHA_SESSION_NAMESPACE:\s*noweb/,'Managed sessions must use the isolated NOWEB namespace');
assert.match(service,/volumes:\s*\[wahadata:\/app\/\.sessions\]/,'Migration must keep the existing WAHA data volume');
assert.doesNotMatch(service,/ports:/,'WAHA must not publish its API port to the host');
assert.match(readme,/WEBJS[\s\S]*NOWEB[\s\S]*QR/i,'Operator docs must explain WEBJS to NOWEB migration and QR pairing');
assert.match(readme,/wahadata/i,'Operator docs must explicitly protect the existing WAHA volume');
console.log('OK: WAHA NOWEB migration configuration, retained volume, and QR migration documentation.');
