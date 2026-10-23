import assert from 'node:assert/strict';
import { mountSocialCreative } from '../src/social-creative.js';

const routes = new Map();
const app = {
  get(path, ...handlers) { routes.set('GET ' + path, handlers.at(-1)); },
  put(path, ...handlers) { routes.set('PUT ' + path, handlers.at(-1)); },
  post(path, ...handlers) { routes.set('POST ' + path, handlers.at(-1)); },
  delete(path, ...handlers) { routes.set('DELETE ' + path, handlers.at(-1)); },
};
let nextQuery;
const calls = [];
const q = async (sql, params) => {
  calls.push({ sql, params });
  return nextQuery(sql, params);
};
const pass = fn => fn;
mountSocialCreative(app, { q, adm: (_req, _res, next) => next(), ah: pass });
const remove = routes.get('DELETE /api/social-studio/creative/jobs/:id');
assert.equal(typeof remove, 'function', 'registra a rota de exclusão');

const response = () => {
  const value = {};
  return { value, json(data) { value.data = data; } };
};

// Um item ainda na fila deve ser cancelado e ocultado do histórico.
calls.length = 0;
nextQuery = async sql => {
  assert.match(sql, /deleted_at\s*=\s*now\(\)/);
  assert.match(sql, /status\s*=\s*case when status='queued' then 'cancelled'/);
  assert.match(sql, /status not in \('running','video_pending'\)/);
  return { rows: [{ id: 7, status: 'cancelled', publication_id: null }] };
};
let res = response();
await remove({ params: { id: '7' } }, res);
assert.deepEqual(res.value.data, { ok: true, publication_id: null });
assert.equal(calls.length, 1);

// Se já existe publicação, o vínculo é informado e não há DELETE na publicação.
nextQuery = async sql => {
  assert.match(sql, /update creative_jobs/);
  assert.doesNotMatch(sql, /delete\s+from\s+social_publications/i);
  return { rows: [{ id: 8, status: 'ready', publication_id: 91 }] };
};
res = response();
await remove({ params: { id: '8' } }, res);
assert.deepEqual(res.value.data, { ok: true, publication_id: 91 });

// Não permite excluir enquanto a criação está em execução.
nextQuery = async sql => sql.startsWith('update creative_jobs')
  ? { rows: [] }
  : { rows: [{ status: 'running', deleted_at: null }] };
await assert.rejects(
  remove({ params: { id: '9' } }, response()),
  /está em andamento/i,
);

// Não permite excluir item inexistente ou já oculto.
nextQuery = async () => ({ rows: [] });
await assert.rejects(
  remove({ params: { id: '10' } }, response()),
  /Criação não encontrada/i,
);

// Valida o identificador antes de acessar o banco.
let queried = false;
nextQuery = async () => { queried = true; return { rows: [] }; };
await assert.rejects(
  remove({ params: { id: '1.5' } }, response()),
  /Criação inválida/i,
);
assert.equal(queried, false);

console.log('OK: exclusão individual, cancelamento da fila, preservação de publicações e bloqueio de itens em andamento.');
