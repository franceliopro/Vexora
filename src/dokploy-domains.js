/**
 * Provision tenant hostnames in Dokploy's Application router.
 *
 * Configure DOKPLOY_API_URL (base API URL, e.g. https://dokploy.example.com/api),
 * DOKPLOY_API_KEY and DOKPLOY_APPLICATION_ID. Without all three, this is a no-op
 * so existing manual deployments keep working.
 */
const HOST_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function dokployDomainAutomationEnabled() {
  return !!(process.env.DOKPLOY_API_URL && process.env.DOKPLOY_API_KEY && process.env.DOKPLOY_APPLICATION_ID);
}

export async function provisionDokployDomain(host) {
  const normalized = String(host || '').trim().toLowerCase();
  if (!HOST_RE.test(normalized)) throw new Error('Domínio inválido: informe apenas o hostname');
  if (!dokployDomainAutomationEnabled()) {
    return { configured: false, provisioned: false, message: 'Automação Dokploy não configurada; configure a rota manualmente.' };
  }

  const base = process.env.DOKPLOY_API_URL.replace(/\/+$/, '');
  const endpoint = base.endsWith('/api') ? `${base}/domain.create` : `${base}/api/domain.create`;
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.DOKPLOY_API_KEY
      },
      body: JSON.stringify({
        host: normalized,
        path: '/',
        port: 3000,
        https: true,
        certificateType: 'letsencrypt',
        applicationId: process.env.DOKPLOY_APPLICATION_ID
      }),
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    throw new Error(`Não foi possível conectar à API do Dokploy: ${error.message}`);
  }

  const body = await response.text();
  if (!response.ok) {
    // Do not expose credentials or arbitrary response bodies to end users.
    const detail = body.slice(0, 240).replace(/[\r\n\t]+/g, ' ');
    throw new Error(`Dokploy recusou o domínio (HTTP ${response.status})${detail ? `: ${detail}` : ''}. Verifique se ele já existe e se a API key tem permissão.`);
  }
  return { configured: true, provisioned: true, host: normalized };
}
