import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [core, financial, inbox] = await Promise.all([
  readFile(new URL('../src/core.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/financial.js', import.meta.url), 'utf8'),
  readFile(new URL('../web/index.html', import.meta.url), 'utf8'),
]);

// Financial receipts are internal messages and must never be sent to the customer.
assert.match(core, /if\(kind==='note'\|\|kind==='financial_receipt'\)dir='int'/);
assert.match(core, /!\['note','financial_receipt'\]\.includes\(kind\)&&!cv\.channel_active/);
assert.match(core, /!\['note','financial_receipt'\]\.includes\(kind\)\)await queueIntegrationEvent/);

// Every customer-facing manual financial send gets a visible internal receipt.
assert.match(financial, /REGISTRO FINANCEIRO · DÉBITOS ENVIADOS/);
assert.match(financial, /REGISTRO FINANCEIRO · COBRANÇA ENVIADA/);
assert.match(financial, /REGISTRO FINANCEIRO · LINK DE COBRANÇA ENVIADO/);
assert.match(financial, /debts_summary_sent/);
assert.match(financial, /charge_receipt_logged/);

// The agent timeline shows receipt markers, while ordinary private notes stay in the private panel.
assert.match(inbox, /x\.dir!=='int'\|\|x\.kind==='financial_receipt'/);
assert.match(inbox, /x\.dir==='int'&&x\.kind!=='financial_receipt'/);
assert.match(inbox, /💳 Sistema financeiro · /);
assert.match(inbox, /\.m\.financial-receipt\{/);

console.log('OK: ações financeiras registram comprovantes internos visíveis na linha do tempo do atendente.');
