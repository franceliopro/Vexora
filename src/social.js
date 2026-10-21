export async function publishPost(id){throw Error('Abra Postagens e revise o conteúdo no novo painel antes de publicar. O fluxo antigo foi substituído para confirmar o resultado real por rede.')}
// Legacy ads endpoints cannot bypass the reviewed advertising workspace.
export async function publishAd(){throw Error('Use Marketing → Anúncios e resultados para revisar e criar a campanha pausada.')}
export async function adInsights(){throw Error('Conecte a conta em Marketing → Anúncios e resultados e sincronize as métricas.')}
