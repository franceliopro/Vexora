# Conexões de atendimento — Zernio, WhatsApp e Meta

## Estado da entrega

Integração e API agora oferece formulários guiados para Baileys, WAHA, Zernio Inbox e Meta oficial. Cada canal usa o mesmo núcleo de mensagens, bot, IA, governança e histórico. A implantação do código não comprova recebimento/envio com uma conta real.

- Baileys/WAHA: conectores de mensagens e anexos existentes; cadastro guiado e acesso direto ao QR. Exigem teste com um número real.
- Zernio: chave por empresa, descoberta das contas autorizadas, seleção de equipe, criação/atualização de webhook filtrado por accountId, segredo HMAC e canal próprio. O assistente usa REST/fetch, sem SDK adicional. Reativação sequencial reaproveita canal e webhook. Falhas mantêm cadastro recuperável; repetir a ativação reconcilia a URL.
- Meta: WhatsApp Cloud API, Instagram Login, Instagram via Facebook Login e Messenger. Consulta de credenciais, callback e Verify Token, GET challenge, assinatura obrigatória X-Hub-Signature-256, validação do ID receptor e envio de texto. WhatsApp também recebe/envia mídia via upload Graph. Instagram/Messenger recebem anexos com download seguro; anexos de saída ainda não disponíveis nesta conexão direta (use Zernio). Não existe Embedded Signup/Business Login OAuth próprio da Néxora nesta entrega: tokens são obtidos na Meta.
- Ajuda contextual: botão ? em cada área e campos de configuração, disponível por clique, toque e teclado; Escape fecha. Os blocos do bot mostram nome/ID selecionado. IA tem etapas de identidade/canais, comportamento, múltiplos modelos/voz, ações e conhecimento. Canais são escolhidos por nome.

## Implantação no Dokploy ou Portainer

1. Atualize a aplicação com os commits desta entrega. Não altera dependências ou migrações.
2. Defina `PUBLIC_URL=https://seu-dominio` no ambiente. O endereço precisa ser público e acessível pelos provedores. Não use localhost para webhooks.
3. Mantenha `JWT_SECRET` estável: ele assina os endereços de callback. Sua troca exige reconfigurar os callbacks. Preserve os volumes e backups de banco, mídia e sessões.
4. Acesse a empresa correta, com perfil Administrador ou Dono, em **Integração e API**. As chaves são configuradas por empresa, não em arquivos Git. `.env` permanece ignorado.
5. As credenciais de integração atualmente ficam no PostgreSQL, em configurações acessíveis aos administradores; proteja banco e backups. O endpoint resumido do assistente não retorna API key, Access Token ou App Secret.

## Zernio

1. No painel do Zernio, conecte as redes ao perfil da empresa e conclua as autorizações exigidas por cada rede.
2. No painel da empresa na Néxora, abra **Integração e API → Zernio**. Cole a chave e clique **Validar chave / Buscar contas**. Uma chave já salva pode ser reutilizada deixando o campo vazio.
3. Confira o nome/plataforma, escolha a equipe e clique **Ativar atendimento nesta conta**. A Néxora configura `message.received`, filtro `accountIds`, callback HTTPS e segredo de assinatura. Repetir atualiza a assinatura encontrada para a mesma URL.
4. Abra **Chatbots → Editar fluxo → Escolher canais** ou **Agentes de IA → Configurar agente → Identidade e canais**. Escolha o canal recém-criado. Configure o provedor da IA e ative o bot/agente desejado. Evite gatilhos concorrentes de bots no mesmo canal.
5. Envie uma mensagem de um perfil externo. Verifique se entra em Novos, se o bot/IA responde e se Assumir pausa a automação. A resposta Inbox precisa do conversationId recebido pelo webhook; não inicia uma conversa fria arbitrária.
6. Em caso de falha, confira permissões da chave (Accounts/Inbox/Webhooks), validade da conta, logs de entrega no Zernio, alcance público do callback e limites/janelas da plataforma.

As duas primeiras contas conectadas são gratuitas segundo a documentação consultada; X exige condição de cobrança própria. Cada rede expõe capacidades diferentes. Pinterest/YouTube/Threads não devem ser apresentados como DMs universais. TikTok tem restrições de conta Business, região e respostas; Discord DMs outbound não recebe respostas pelo Inbox. O assistente habilita apenas plataformas com Inbox de mensagens documentado; publicar, responder comentários e anúncios não são implementados por este cadastro. Mídias de CDNs não autorizadas são mostradas como indisponíveis para download seguro, sem acessar URLs arbitrárias.

## Meta oficial

A referência enviada corresponde ao caminho via Facebook Login. O assistente também permite Instagram Login, que usa permissões e host próprios e não exige Página vinculada. Não misture o ID/token de um caminho com o outro.

1. Configure o aplicativo e produto na Meta. Obtenha o Access Token, App Secret e ID da conta correspondente: Phone Number ID no WhatsApp, Page ID no Messenger, ID profissional no Instagram.
2. Abra **Integração e API → Meta oficial**, escolha canal/autenticação, preencha as credenciais e equipe e salve. A consulta do ID valida acesso básico, sem provar que todas as permissões de mensagens estão aprovadas.
3. Copie Callback URL e Verify Token para Webhooks do aplicativo e assine `messages`. Instagram/Messenger têm botão de assinatura na conta; WhatsApp exige assinatura do WABA no aplicativo. Configure também o produto na Meta, não apenas a URL.
4. Instagram Login: `instagram_business_manage_messages` e acessos básicos correspondentes; Facebook Login: `instagram_manage_messages` e acessos de Página; Messenger: `pages_messaging`; WhatsApp: `whatsapp_business_messaging`. A administração pode exigir acessos adicionais.
5. Aplicativo em desenvolvimento atende apenas contas autorizadas/testadoras. Clientes externos exigem os acessos/revisão que a Meta determinar. Tokens têm validade/ciclo de renovação próprios; não há renovação OAuth automática nesta entrega.
6. Mensagem enviada por outro perfil é o teste obrigatório. Respeite janelas de atendimento e templates oficiais exigidos para iniciar contato/retomar fora da janela. Esta entrega não cria templates WhatsApp na Meta.

## Fontes consultadas em 19/10/2026

- https://zernio.com/agent-quickstart.md (lido diretamente; o navegador de busca não aceita o content-type text/markdown)
- https://docs.zernio.com/accounts/list-accounts
- https://docs.zernio.com/webhooks
- https://docs.zernio.com/webhooks/get-webhook-settings
- https://docs.zernio.com/webhooks/create-webhook-settings
- https://docs.zernio.com/webhooks/update-webhook-settings
- https://docs.zernio.com/platforms
- https://docs.zernio.com/guides/connecting-accounts
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/messaging-api
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login
- https://developers.facebook.com/documentation/instagram-platform/webhooks.md
- https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint/
- https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages

Meta: acesso direto a algumas páginas retornou 429; os contratos essenciais foram conferidos em resultados indexados da documentação oficial. Versão inicial configurável: v26.0.

## Verificações

- `npm test`: regressões do motor, templates, fusos, reconexão e contratos simulados WAHA/Zernio/Meta.
- `node test/workspaces.mjs`: administração de empresas.
- `test/integrations-postgres.mjs`: PostgreSQL/WASM descartável, RLS, administrador, segredo omitido, conta autorizada e webhook idempotente (provedores simulados).
- `test/service-crm-postgres.mjs`: regressão PostgreSQL/WASM Atendimento/CRM.
- Interface verificada em Chromium com API simulada (desktop/celular); não substitui homologação externa.
- Chave fornecida pelo usuário validada com uma consulta real GET /accounts: autenticação aceita, zero contas conectadas no momento da consulta. Chave não incluída no repositório. Nenhuma mensagem ou publicação foi enviada.
