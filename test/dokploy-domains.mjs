import assert from 'node:assert/strict';
import { dokployDomainAutomationEnabled, provisionDokployDomain } from '../src/dokploy-domains.js';

const envKeys = ['DOKPLOY_API_URL', 'DOKPLOY_API_KEY', 'DOKPLOY_APPLICATION_ID'];
const savedEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
try {
  for (const key of envKeys) delete process.env[key];
  assert.equal(dokployDomainAutomationEnabled(), false);
  assert.equal((await provisionDokployDomain('cliente.exemplo.com.br')).configured, false);
  await assert.rejects(() => provisionDokployDomain('https://nao-e-host.com'), /Domínio inválido/);

  process.env.DOKPLOY_API_URL = 'https://dokploy.example.com/api';
  process.env.DOKPLOY_API_KEY = 'test-key';
  process.env.DOKPLOY_APPLICATION_ID = 'application-123';
  let createPayload;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('domain.byApplicationId')) return new Response('[]', { status: 200 });
    createPayload = JSON.parse(options.body);
    return new Response('{}', { status: 200 });
  };
  const created = await provisionDokployDomain('Cliente.Exemplo.com.br');
  assert.equal(created.provisioned, true);
  assert.equal(createPayload.host, 'cliente.exemplo.com.br');
  assert.equal(createPayload.port, 3000);
  assert.equal(createPayload.https, true);
  assert.equal(createPayload.certificateType, 'letsencrypt');
  assert.equal(createPayload.applicationId, 'application-123');

  let createCalls = 0;
  globalThis.fetch = async url => {
    if (String(url).includes('domain.byApplicationId')) return new Response(JSON.stringify([{ host: 'cliente.exemplo.com.br' }]), { status: 200 });
    createCalls++;
    return new Response('{}', { status: 200 });
  };
  const existing = await provisionDokployDomain('cliente.exemplo.com.br');
  assert.equal(existing.existing, true);
  assert.equal(createCalls, 0);
  console.log('OK: configuração opcional, validação de hostname, criação HTTPS e idempotência do domínio Dokploy.');
} finally {
  globalThis.fetch = originalFetch;
  for (const key of envKeys) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
}
