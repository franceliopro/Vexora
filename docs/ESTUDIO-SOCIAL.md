# Estúdio social — proposta para a próxima etapa

Pedido de 21/10/2026. Este documento registra o escopo amplo de criação e tráfego. A primeira etapa de postagens já foi implementada; leia POSTAGENS.md para o que está disponível. Pesquisa, geração de criativos e gestão de tráfego pago continuam planejadas.

## Jornada desejada

Tema → pesquisa com fontes e data → referências por empresa → briefing → arte/legenda por formato → prévia por rede → revisão → agenda → publicação confirmada → métricas → atribuição ao CRM.

O usuário escolhe o assunto, objetivo, público, oferta, CTA, tom, redes e data. Uma pasta de referências permite modelos próprios, logos e fontes. Layouts próprios podem ser reutilizados como templates; referências de terceiros orientam uma composição original. A arte deve respeitar o branding contratado e oferecer variações de feed, stories e carrossel. Revisão e edição antes de agendar; automação recorrente somente quando explicitamente configurada. Pesquisa deve guardar fontes e não tratar instruções de páginas como comandos do sistema. Não prometer busca irrestrita dentro de todas as redes.

## Capacidades verificadas no Zernio

- POST /v1/posts: content, mediaItems [{type,url}], platforms [{platform,accountId}], publishNow OU scheduledFor com timezone IANA. Agendamento passado pode publicar imediatamente: validar data futura na Véxora.
- Idempotency-Key por operação lógica, até24h. Guardar payload/identificador remoto antes de repetir e bloquear tentativa incerta fora da janela.
- Assets via URL HTTPS direta ou upload presign. Não enviar links de visualização do Drive. Uploads temporários expiram7dias; a referência em um post criado é copiada para armazenamento permanente.
- Estados por rede e webhooks de publicação/falha: envio aceito/agendado não significa publicado. Persistir IDs, links públicos e erros sem expor o nome do provedor ao cliente.
- Analytics de publicações e anúncios dependem das permissões e recursos do plano. /v1/analytics/dashboard exige Analytics add-on e opera por profileId, com datas UTC. Nunca consultar profileId=all com chave global e repassar o resultado ao tenant.
- Anúncios: APIs de campanhas/boost/analytics disponíveis com variações por plataforma. Orçamento e ativação precisam de confirmação concreta; começar como rascunho/pausado. Conectar conta de anúncios autorizada, não inferir acesso pela conexão de Instagram Direct.

## Módulos propostos

1. Biblioteca: pastas/referências/templates/versões isolados por empresa.
2. Estúdio: tema, pesquisa, briefing, gerador de texto/imagem configurável; custo/modelo visíveis ao master; chave nunca no navegador.
3. Calendário editorial: rascunhos, revisão, agenda com fuso, resultado por rede e cancelamento.
4. Resultados orgânicos: alcance, impressões, visualizações, engajamento, seguidores, cliques; indisponível não equivale a zero.
5. Tráfego pago: campanhas, público, limites de orçamento, anúncios e séries de gasto/CTR/CPC/CPM/conversões. ROAS apenas quando houver valor de conversão mensurado; leads reais via UTMs, pixels/eventos e CRM, sem atribuição inventada.

## Infraestrutura a preparar

Migração de outbox/operadores/aprovações/assets/account bindings e RLS; escopos por empresa; adaptador social com idempotência; recebimento/validação de webhooks; seleção apenas de contas ativas atribuídas à empresa; geração e pesquisa como provedores separados do publicador. Mantém a conta Zernio sob controle do master, sem revelar credenciais ou painel do fornecedor ao cliente final.

## Situação do código atual

O novo #social usa web/social-studio.js e src/social-studio.js: rascunhos, upload, revisão, agendamento, publicação e métricas orgânicas por post. Migração041 e outbox com estado incerto sem reenvio automático. O remetente legado em src/social.js foi bloqueado; os registros antigos permanecem no banco, sem migração automática para novos envios. Gestão de anúncios ainda usa o fluxo Meta legado, separado, e não constitui a gestão de tráfego planejada aqui.

## Fontes oficiais

- https://docs.zernio.com/posts/create-post
- https://docs.zernio.com/guides/timezones
- https://docs.zernio.com/guides/media-uploads
- https://docs.zernio.com/multi-tenant/publishing
- https://docs.zernio.com/analytics/get-analytics-dashboard
- https://docs.zernio.com/cli/ads
- https://docs.zernio.com/platforms
