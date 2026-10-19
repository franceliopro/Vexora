# Néxora Suite — Prompt mestre consolidado (v6)
> Atendimento detalhado em [PROCESSO-ATENDIMENTO.md](PROCESSO-ATENDIMENTO.md): governança de três perfis, Novos/Meus/Outros, ficha lateral, conclusão e métricas. O fuso é escolhido por empresa; para o cliente de rastreamento, Cuiabá (`America/Cuiaba`). A tabela de estado do documento distingue implementação de especificação.
> Decisão vigente de 19/10/2026: o produto é organizado nos 11 módulos de `docs/ESTRUTURA-PRODUTO.md`. Segmentos que apenas trocam rótulos/funil foram removidos. Templates opcionais criam IA e bot em rascunho, sem conceder módulos, mudar etapas ou sobrescrever configurações. Esta decisão substitui o planejamento anterior de ERP por segmento. Venda direta às empresas finais, sem revenda.

Modelo comercial corrigido em 19/10/2026: venda direta do proprietário da Néxora às empresas finais, sem revenda.

Consolidado em 19/10/2026 a partir do v2 e dos requisitos originais do proprietário. Repositório de trabalho: `franceliopro/Nexora`. O `nexora2` fica fora deste projeto. Este documento especifica o produto e suas entregas; não certifica funcionalidades implementadas.

> Como usar: abra o Codex ou Claude Code na raiz do repositório e diga: **"Leia docs/PROMPT-MESTRE.md e execute a Fase N."** Uma fase por vez, cada uma em branch própria, com testes, e só vai para o `main` com tudo verde.

---

## 1. Papel e objetivo

Você é engenheiro(a) sênior full-stack. Sua missão é evoluir o **Nexora** (repositório `franceliopro/Nexora`) para uma plataforma **omnichannel de atendimento + CRM + IA**, **multiempresa**, **com marca personalizada por empresa**, **organizada por módulos funcionais** e **auto-hospedada** (Dokploy/Portainer), cobrindo as capacidades dos CRMs de WhatsApp com agentes de IA (referência de mercado: HelenaCRM) **somadas** aos diferenciais do Nexora.

A interface deve ser limpa, rápida e totalmente personalizável (marca, cor, fonte, ícone, domínio). Inspire-se em padrões comuns de CRMs de conversa (caixa de entrada, funil kanban, construtor de fluxos), **sem copiar** marca, textos, ícones ou identidade visual de nenhum concorrente.

## 2. Estado relatado no v2 — verificar no repositório antes de implementar

Os itens abaixo são relatos do documento anterior, não resultados de auditoria. Confirmar cada um por arquivos, migrações e execução no `franceliopro/Nexora`; classificar como existente e testado, existente sem teste, parcial ou ausente. Preservar código e dados existentes. Não reconstruir o sistema por suposição. Verificar a versão de Node e escolher uma LTS suportada compatível durante a auditoria, sem impor atualização sem testes.

- **Stack:** Node 20 (ESM) + Express + `pg` + `ws`; Postgres 16 com pgvector; front em `web/index.html` + `web/modules.js` (JS puro, sem build); Docker Compose (app, db, waha, pgadmin, backup).
- **Multiempresa:** todas as tabelas têm `tenant_id` com **Row Level Security** (`app.tenant`), usuário de banco sem superpoder (`nexora_app`), gatilho `fk_guard` contra referência entre empresas, webhooks assinados por HMAC, painel da plataforma (`/platform.html`), backup/restauração.
- **Canais:** WAHA, Baileys, Zernio (endpoints presumidos, não verificados).
- **Conversas:** bandeja, atribuição humano↔IA, convite de atendente, chat interno privado por conversa, kanban.
- **IA:** vários agentes por canal, LLM/STT/TTS por agente (OpenAI/Anthropic/compatíveis, com fallback), RAG (texto), ações: mover etapa, transferir, convidar, agendar (Google Agenda), preencher ficha.
- **Bots:** editor visual de fluxos; blocos: mensagem, escolha, pergunta/validação, condição, variável, funil, transferir, API, **Asaas por CPF/CNPJ**, **pedido no WhatsApp**.
- **Módulos verticais:** cobrança recorrente com régua, escola/música, delivery (cardápio, pedidos, impressão térmica ESC/POS).
- **Pagamentos:** Asaas, Mercado Pago, Stripe (links).
- **Testes:** `node test/run.mjs` (regras puras e motor de bots) e testes manuais em Chromium. **O servidor Node completo nunca foi executado em CI.**
- **Dívidas conhecidas:** chaves de provedores guardadas em texto puro em `settings`; mídia servida por URL não assinada; UI num arquivo grande; envios sem fila/retentativa; sem estado "encerrada" na conversa.

## 3. Regras de engenharia (inegociáveis)

1. **Nada é dado como pronto sem teste.** Cada entrega inclui testes unitários para lógica pura, teste de integração com Postgres real e teste de navegador (Playwright) para telas novas. Relate o que foi e o que não foi testado, sem exagero.
2. **CI no GitHub Actions** (primeira tarefa): Postgres 16 + pgvector como serviço, `npm ci`, subir o servidor de verdade, rodar migrações do zero, testes e fumaça E2E. Nenhum merge no `main` com CI vermelho.
3. **Migrações:** numeradas, idempotentes quando possível, testadas do zero e a partir da versão anterior. **Toda tabela de dados de empresa com `tenant_id` + RLS forçado + proteção contra referências cruzadas (`fk_guard` ou chave estrangeira composta equivalente).** Um teste automático percorre `pg_class` e falha se alguma tabela de empresa estiver sem RLS. Tabelas globais e internas de bibliotecas têm lista explícita de exceções, justificativa e controles próprios. O papel de aplicação não pode ter `BYPASSRLS` nem ser superusuário; definir contexto por transação, sem vazamento entre conexões do pool.
4. **Não quebrar quem já fez deploy:** compatibilidade retroativa, migração automática no boot, `/healthz` e `/readyz`, changelog.
5. **Segredos:** nunca em texto puro no banco nem em log. Criptografia em repouso (AES-256-GCM, chave em env), mascarados na UI.
6. **Entrada externa é hostil:** validar tudo no servidor; preços e totais sempre recalculados no servidor; bloquear SSRF; limitar tamanho e tipo de upload; limitar taxa por IP e por empresa.
7. **UI:** nada de `[object …]`/`undefined`/`null` em tela; erro de JS visível; funcionar em celular; acessível (teclado, contraste); pt-BR por padrão com base de i18n (en, es).
8. **Entregas pequenas e revisáveis:** commits claros, uma fase por branch, README e `docs/` atualizados, dados de demonstração por cenário (seed) para testar visualmente.
9. **Sem alegações falsas:** integrações que não puderam ser verificadas contra a documentação oficial ou sandbox são marcadas como "não verificadas" no código e no README.

## 4. Decisões de arquitetura

- **Banco:** apenas Postgres (RLS é a rede de proteção). MySQL/MariaDB ficam fora.
- **Fila de jobs sem infraestrutura nova:** `pg-boss` (usa o próprio Postgres) para envios com limite de taxa e retentativa, webhooks de saída (padrão outbox), cadências, disparos, indexação de documentos e cobranças.
- **Tempo real:** WebSocket com escopo por empresa; para mais de uma instância, `LISTEN/NOTIFY` do Postgres (Redis opcional).
- **Mídia:** armazenamento local por padrão e S3 compatível (MinIO/S3) opcional; **URLs assinadas e com expiração**.
- **Front:** manter sem build por enquanto, mas **dividir em módulos ES por tela**, com biblioteca de componentes e tokens de design (cores, tipografia, espaçamento) que a marca do cliente sobrescreve. Reavaliar Vite/Preact se o editor de fluxos ou a bandeja pedirem.
- **Extensibilidade:** templates reutilizáveis configuram IA/bots (seção 5.13); extensões técnicas futuras são isoladas do núcleo.
- **Dois modos de implantação:** multiempresa em uma stack com isolamento lógico por RLS (padrão) e ilha por cliente com stack, banco Postgres, credenciais e armazenamento próprios. O segundo modo atende ao pedido de banco próprio por cliente; não confundir RLS com banco fisicamente separado. Verificar se há script existente antes de reutilizá-lo. Ambos os modos devem ter guia operacional e teste de isolamento.

## 5. Módulos — requisitos e critérios de aceite

### 5.1 Canais
- **WhatsApp API Oficial (Cloud API da Meta):** driver próprio; o cliente informa o próprio token/WABA (entrada manual primeiro; Embedded Signup só com aprovação da Meta); gestão de **modelos (HSM)** com status de aprovação; janela de 24 h (fora dela, só modelo); mensagens interativas (botões, listas); recibos de entrega/leitura; grupos na API oficial quando disponível.
- **WAHA e Baileys** continuam como opções, com aviso de risco (Baileys não é oficial). Assistente guiado **"Conectar WhatsApp"**: escolha do driver, config preenchida, QR que atualiza sozinho, status (conectando, conectado, caiu) e reconexão.
- **Instagram (DM, comentários, respostas a stories) e Messenger/Facebook (DM e comentários):** integração direta com a API oficial da Meta (token por empresa). Zernio será um adaptador opcional para as capacidades comprovadas pela documentação e credenciais disponíveis, inclusive mensagens ou publicação quando suportadas. Não presumir que ele ofereça WhatsApp oficial, DMs ou todos os canais. Manter drivers oficiais diretos como alternativa; capacidades não verificadas ficam desativadas e identificadas na UI.
- **Webchat:** widget embutível por script, com identidade da marca, formulário pré-conversa e continuidade por cookie.
- **Telegram** e **e-mail** (IMAP/SMTP) como canais adicionais; SMS opcional.
- **Aceite:** testar entrada e saída dos tipos de mensagem suportados por cada driver e registrar a matriz de capacidades (texto, áudio, imagem, vídeo, documento, localização e contato); reconexão automática; um contato pode ter conversa em vários canais; idempotência por `ext_id`.

### 5.2 Conversas e atendimento
- **Estado da conversa:** aberta, pendente, encerrada, com **protocolo** numerado, mensagem de encerramento e reabertura automática ao novo contato.
- **Etiquetas** (cor, filtro, uso por automações e IA) e **campos personalizados tipados** (texto, número, data, moeda, seleção, múltipla escolha, sim/não, arquivo) para contato e card.
- **Respostas rápidas** com atalho `/` e variáveis; **horário de atendimento**, mensagem de saudação e de ausência; **SLA** (primeira resposta e resolução, com alertas).
- **Mensagens agendadas** direto da conversa; responder, encaminhar, apagar/editar quando o canal permitir; reações; citação.
- **Chat interno da equipe** (canais e mensagens diretas, menções `@`), além das notas privadas por conversa.
- **Busca e filtros** por contato, canal, equipe, etiqueta, estado, período, palavra; visões salvas; ações em lote.
- **Pesquisa de satisfação** (CSAT/NPS) ao encerrar; transcrição exportável.
- **Contatos:** importação/exportação CSV, mesclagem de duplicados, linha do tempo unificada (mensagens, cards, pagamentos, agendamentos), consentimento e descadastro.
- **Aceite:** inbox com 5 mil conversas continua fluido (paginação/virtualização); todos os filtros testados.

### 5.3 Filas, equipe e supervisão
- **Equipes e filas** por canal e tipo de atendimento; **distribuição** por rodízio, menos ocupado ou por habilidade; limite de conversas simultâneas por atendente; presença (online, ausente, pausa).
- **Transbordo automático** por tempo sem resposta e por regra (palavra, intenção, valor).
- **Carteirização:** contato com responsável fixo; regra "sempre cair com o dono da carteira" e visibilidade por carteira.
- **Papéis e permissões** granulares (ver, assumir, transferir, intervir, exportar, configurar, financeiro), por equipe e por canal.
- **Painel do supervisor em tempo real:** quem espera e há quanto tempo, carga por atendente, conversas ao vivo, **intervir/sussurrar** (mensagem só para o atendente), reatribuir.
- **Aceite:** regras de distribuição e transbordo cobertas por testes determinísticos.

### 5.4 Agentes de IA
- **Habilidades (skills) sem código**, ativáveis por agente: etiquetar, atualizar campos, criar/atualizar card, mover no funil, transferir para equipe/atendente, encerrar com mensagem, agendar (Google Agenda e agenda interna), consultar boleto/2ª via (Asaas), gerar link de pagamento, **chamar API externa** (segredos em cofre), **consultar servidor MCP**, rodar um fluxo de bot, consultar **tabela estruturada** interna (para negócios sem API) e consultar catálogo/estoque.
- **Agente Supervisor (orquestrador):** identifica a intenção de cada mensagem, aplica regras do negócio, ativa o agente certo, monitora a eficácia e transfere entre agentes/fluxos; **vários agentes na mesma conversa** com passagem de contexto.
- **Base de conhecimento:** upload de PDF, DOCX, TXT, CSV, páginas web (URL) e planilhas; fragmentação, embeddings, reindexação, **citação da fonte** na resposta; escopo por agente, empresa ou global.
- **Guardrails:** temas proibidos, mascaramento de dados sensíveis, limite de chamadas de ferramenta por turno, limite de custo por conversa/empresa, palavras que forçam humano, resposta padrão quando o conhecimento não cobre.
- **Playground** de teste com rastro (qual agente, qual habilidade, quais trechos usou) e **conjuntos de avaliação** reexecutáveis; versionamento de prompt com reversão.
- **Áudio:** recebe e envia voz (STT/TTS por agente, vozes configuráveis); regra "áudio gera áudio, texto gera texto", com fallback para texto quando STT/TTS falhar, o canal não suportar voz ou o módulo de voz não estiver habilitado. Explicitar a falha sem inventar transcrição.
- **Inteligência automática:** resumo da conversa, sentimento, classificação de intenção, qualificação e pontuação de lead, sugestão de resposta ao atendente.
- **Custos:** painel de uso e custo de IA por empresa, agente e canal; cotas por plano.
- **Aceite:** habilidades têm testes com provedores simulados; o Supervisor tem testes de roteamento com casos reais em pt-BR.

### 5.5 Bots e fluxos (estilo Typebot)
- Manter o editor atual e acrescentar: gatilhos (primeira mensagem, palavra-chave, etiqueta, evento, API), **menus interativos nativos** quando o canal permitir (botões/listas da API oficial), envio de mídia, atraso, horário comercial, **pesquisa**, formulário multi-etapas, bloco de agendamento, bloco de pagamento (link com escolha de Pix, boleto ou cartão e confirmação na conversa), bloco de IA/agente, bloco de habilidade (tag, campo, card, encerrar), variáveis globais e por contato.
- **Teste dentro do editor** (simulador), **versionamento/publicação** de fluxos, duplicação e templates por cenário, métricas por bloco (entradas, saídas, abandono).
- **Aceite:** cada bloco com teste no simulador; fluxo antigo continua funcionando.

### 5.6 Automações, cadências e disparos
- **Automações por gatilho** (construtor visual): card movido, etiqueta adicionada, campo alterado, mensagem recebida, sem resposta por X tempo, pagamento confirmado/vencido, agendamento criado, data/hora, webhook de entrada. **Ações:** enviar mensagem/modelo, mover, atribuir, etiquetar, criar tarefa, chamar webhook, rodar bot, esperar, condição.
- **Cadências (sequências):** passos com intervalos que respeitam **horário e dias úteis**, modelo aprovado no primeiro contato (API oficial), inscrição manual, por bot, por automação ou por API, **saída automática** quando o contato responde ou cumpre condição, métricas (enviadas, entregues, respostas).
- **Disparos em massa:** público por etiquetas, campos, funil e listas importadas; modelo; agendamento; **limite de ritmo conforme as regras do provedor (sem promessa de evitar bloqueios)**; escolha de canal e equipe; ação para conversas já abertas; **descadastro e consentimento obrigatórios**; métricas em tempo real; teste A/B.
- **Aceite:** nenhuma mensagem sai fora do horário configurado; opt-out respeitado em 100% dos testes.

### 5.7 CRM
- **Várias esteiras**, etapas com cor e tipo (aberta, ganha, perdida), **motivo de perda**, probabilidade e previsão de receita.
- **Cards (negócios)** separados da conversa e ligados a ela: valor, produtos/itens, responsável, data prevista, campos personalizados, arquivos, histórico.
- **Empresas e contatos** (um para muitos), **tarefas e lembretes** com calendário e notificação, **metas** por pessoa/equipe.
- **Captação:** formulários web, geradores de link e QR de WhatsApp com mensagem pronta e **UTM**, atribuição de **anúncios com clique para WhatsApp (CTWA)**.
- **Relatórios e painéis:** conversão por etapa, tempo em cada etapa, desempenho por atendente/equipe, primeira resposta e tempo de atendimento, IA × humano, CSAT/NPS, receita, motivos de perda, campanhas, custo de IA; exportação CSV/PDF.
- **Aceite:** relatórios conferem com os dados (testes com massa conhecida).

### 5.8 Pagamentos e cobrança
- **Asaas e Stripe** são os provedores iniciais; Mercado Pago e Pix direto por PSP ficam para evolução. Implementar link, Pix, boleto, cartão, assinaturas e segunda via somente onde o provedor/conta/região suportar e a documentação ou sandbox comprovar. Não apresentar todos os meios como disponíveis em todo provedor. Webhooks verificados (assinatura/consulta ao provedor), conciliação, **confirmação enviada na própria conversa** e status do pagamento no card.
- **Cobrança recorrente** (já existe): régua configurável, parcelamento, multa/juros, segunda via, renegociação guiada pela IA, inadimplência no funil.
- **Botão "enviar pagamento"** na conversa, com escolha do cliente entre Pix, boleto e cartão.
- **Aceite:** webhook duplicado não duplica baixa; valores e vencimentos testados em casos de fim de mês e virada de ano.

### 5.9 Redes sociais e anúncios
- Publicar e agendar posts, **responder e reagir a comentários e DMs**, regra "comentou a palavra X → resposta pública + DM".
- **Meta Ads dentro do painel:** campanhas, conjuntos, criativos, públicos e orçamentos, status, **insights** por campanha, regras simples (pausar por custo) e vínculo com leads (CTWA).

### 5.10 API, webhooks e integrações
- **API pública REST** com chaves por empresa (escopos), paginação, idempotência, limites de taxa e **documentação OpenAPI**.
- **Webhooks de saída** assinados, com retentativa e painel de entregas: mensagem, conversa, card, pagamento, agendamento, etiqueta.
- **Conectores prontos:** nó/componentes para **n8n**, módulos para **Make** e **Pluga**, exemplos de Zapier via webhook.
- **API administrativa da plataforma**, exclusiva do master e operadores autorizados, para criar/suspender empresas, ajustar limites e marca.
- **Aceite:** coleção Postman/Bruno e testes de contrato.

### 5.11 SaaS de venda direta e personalização
- **Planos e limites** por empresa: usuários por canal, canais, mensagens, créditos de IA, armazenamento; trial; suspensão e reativação automáticas.
- **Venda direta:** o proprietário da Néxora vende planos às empresas finais. Cobrança das empresas (Asaas/Stripe), faturas e inadimplência. Não implementar revendedores, subrevendedores, comissões ou painel de parceiros. Marca própria do cliente não lhe concede direito técnico de revender ou criar outras empresas.
- **Domínio próprio por empresa** com certificado automático (integração com o proxy do Dokploy/Traefik ou Caddy), **e-mails e mensagens com a marca**, tela de login personalizada, modo escuro/claro.
- **Onboarding guiado** (assistente de 5 passos: empresa, marca, canal, agente, primeira conversa ou template opcional) e **templates opcionais de atendimento** (IA e bots em rascunho).
- **Aceite:** criar uma empresa completa pela API administrativa da plataforma sem tocar no servidor.

### 5.12 Segurança, LGPD e operação
- Autenticação: senha forte, **2FA (TOTP)**, tokens de acesso curtos com refresh, bloqueio por tentativas, sessões e dispositivos listados/revogáveis; SSO opcional.
- **Log de auditoria** (quem fez o quê, quando, de onde), exportável.
- **LGPD:** consentimento e descadastro, exportação e exclusão de dados por contato, política de retenção configurável, mascaramento de dados em logs.
- Cabeçalhos de segurança (CSP, HSTS), proteção CSRF onde aplicável, validação de upload (tipo real, tamanho, varredura opcional).
- **Observabilidade:** logs estruturados com `tenant_id`/`request_id`, `/healthz` e `/readyz`, métricas Prometheus, painel de fila de jobs, alerta de canal caído.
- **Backup:** manter o atual; adicionar teste automático de restauração e, opcional, PITR.

### 5.13 Templates opcionais de IA e chatbots
- Modelos iniciais: comercial, recepção de clínica, recepção jurídica, educação, delivery e suporte.
- Cada modelo define instruções, tom, regras, proibições e grafo inicial do chatbot.
- Criar agente e bot desativados, sem credenciais e sem canal, em transação por empresa. Mostrar prévia antes de aplicar. Não modificar registros existentes; repetir a aplicação retorna os registros criados anteriormente.
- Seleção não altera rótulos, etapas, marca, planos ou módulos. Não há segmentação de menus nem transformação em ERP.
- Preservar dados antigos de escola, delivery e cobrança. Rotas existentes são compatibilidade; não oferecer como módulos completos por segmento.
- Novos templates podem ser adicionados por situação de atendimento. APIs de parceiros como iFood/Keeta/99Food não são presumidas por um template.

### 5.14 Apps — módulo à parte (`apps/`)
Decisão: **sim, como módulo separado**, com ciclo de lançamento próprio (revisão das lojas, assinatura, certificados), mas em duas etapas.
- **Etapa A — PWA:** instalável, ícone e nome da marca da empresa, **notificações push (Web Push/VAPID)**, contador de não lidas, som, atalhos, cache offline da interface, câmera/microfone/anexos, fila de envio offline.
- **Etapa B — apps nativos (Capacitor):** iOS e Android, push (APNs/FCM), links profundos, biometria. **Pipeline de build personalizado por empresa** (nome, ícone, splash, bundle id, cor, domínio) via CI/fastlane; a publicação usa **a conta de desenvolvedor da própria empresa** (recomendado) ou a conta do proprietário da Néxora quando adequado às regras das lojas.
- **Telas do app:** bandeja, conversa (texto, áudio, mídia, respostas rápidas), funil, tarefas, agenda, notificações, painel resumido, status de presença.
- **Pré-requisitos no servidor:** tabela de dispositivos, API pública, tokens com refresh, fila de notificações.
- **Aceite:** notificação chega em segundos com o app fechado (testes em aparelho real); build de um app de exemplo gerado pelo pipeline.

### 5.15 Interface e experiência
- Layout: barra lateral escura/clara, bandeja em 3 colunas, funil kanban fluido com arrastar, construtor de fluxos em tela cheia, painéis com cartões e movimento sutil.
- **Marca total:** cor de acento, cores dos componentes, tons derivados e contraste automático, fonte, logos próprios para claro/escuro, ícone, favicon, textos e domínio por empresa. Paleta visual, upload no PC/celular e captura pela câmera quando suportada e autorizada. Prévia e restauração da marca; sanitizar SVG e restringir fontes/CSS para evitar injeção.
- Estados vazios úteis, carregamento com esqueleto, erros claros, atalhos de teclado, pesquisa global (`Ctrl+K`).
- Desempenho: primeira tela em menos de 2 s em rede 4G; listas paginadas/virtualizadas.

## 6. Plano em fases (uma por branch)

| Fase | Entregas | Depende de |
|---|---|---|
| **0 — Fundação e acesso** | CI com Postgres e E2E real do servidor; teste automático de RLS; assistente "Conectar WhatsApp"; segredos criptografados; mídia assinada; fila `pg-boss`; modularização da UI; seed de demonstração; i18n base; logs e `/readyz`; posse atômica e autorização por conversa; concessões de módulos; base de marca personalizada e arquivos isolados; Docker/Dokploy/Swarm | — |
| **1 — Conversas e IA** | Estado e protocolo; etiquetas; campos personalizados; respostas rápidas; horário/saudação/ausência; SLA; habilidades do agente; Supervisor; base de conhecimento por arquivos; playground | 0 |
| **2 — Filas e equipe** | Distribuição, transbordo, carteirização, permissões, painel do supervisor, chat interno, mensagens agendadas, presença | 1 |
| **3 — API e automação** | API pública + chaves + OpenAPI; webhooks de saída; automações por gatilho; cadências; conectores n8n/Make/Pluga; **PWA (Apps etapa A)** | 1, 2 |
| **4 — Canais oficiais e disparos** | Cloud API da Meta + modelos; Instagram/Messenger direto; webchat; Telegram; disparos em massa; CTWA | 3 |
| **5 — CRM avançado** | Várias esteiras; cards separados; empresas; tarefas; metas; formulários, links/QR/UTM; relatórios e painéis | 1 |
| **6 — SaaS e venda direta** | Planos e limites; cobrança das empresas; venda direta aos clientes finais; domínio automático; onboarding; API administrativa da plataforma | 3 |
| **7 — Apps nativos** | Capacitor iOS/Android; pipeline de marca personalizada; push nativo | 3, 6 |
| **8 — Templates e extensões** | Biblioteca de modelos de IA/bots, versionamento de templates e extensões técnicas; preservação de dados legados | 3 |
| **9 — Social e anúncios** | Publicação e interações permitidas; adaptador Zernio validado; Meta Ads, insights e vínculo com leads | 4, 5, 6 |

A autorização, a tomada exclusiva de conversa e o controle de módulos entram na Fase 0; a Fase 2 amplia a distribuição e a supervisão. Voz, bots, webchat, plugins e apps continuam independentes, mesmo quando entregues na mesma fase. Não esperar a Fase 6 para aplicar isolamento e concessões. Pagamentos Asaas/Stripe e Google Agenda entram na Fase 3, com bases de IA na Fase 1; os relatórios financeiros entram na Fase 5. A API administrativa da plataforma da Fase 6 depende da API pública da Fase 3.

Em cada fase: entregar **(a)** código, **(b)** migrações testadas, **(c)** testes (unitário, integração, navegador), **(d)** README/`docs/`, **(e)** nota "o que foi e o que não foi verificado", **(f)** dados de demonstração.

## 7. O que foi cortado ou adiado (e por quê)

- **Ser provedor oficial da Meta (BSP) / Embedded Signup completo:** depende de aprovação da Meta. Começa com token informado pelo cliente.
- **Zernio como dependência obrigatória:** permanece opcional; validar suas capacidades antes de oferecer canais. Instagram e Messenger também têm caminho por integração oficial direta.
- **MySQL/MariaDB:** fora; o isolamento por RLS é a decisão central.
- **App nativo por empresa como padrão:** vira opção premium (custo de contas e revisão nas lojas); o padrão é PWA.
- **Paridade total com o Typebot:** manter os blocos úteis ao negócio e a facilidade de uso.
- **Marketplace público de plugins:** só depois do SDK estável.

## 8. O que foi acrescentado além do pedido original

CI com E2E real; teste automático de RLS; fila de jobs com retentativa; criptografia de segredos; mídia assinada; estado e protocolo de conversa; SLA; horário de atendimento; respostas rápidas; chat interno; carteirização; painel do supervisor; Agente Supervisor e playground de IA; guardrails e controle de custo; API pública, webhooks e conectores; cadências e disparos com consentimento; atribuição de anúncios com clique para WhatsApp; planos e limites de venda direta; 2FA, auditoria e LGPD; SDK de plugins; PWA e pipeline de apps personalizados.

## 9. Antes de começar cada fase

1. Leia o repositório e este documento; liste o que já existe e o que muda.
2. Proponha o esquema de dados e as telas em poucas linhas e siga em frente (só pare para decisões irreversíveis).
3. Trabalhe em branch própria, abra PR com descrição, teste e checklist, e só faça merge com CI verde.
4. Ao terminar, informe objetivamente: o que funciona (com evidência), o que não foi verificado e os próximos passos.


## 10. Regras consolidadas de produto e acesso

### 10.1 Produto inicial e módulos comerciais

O produto inicial é multiatendimento com IA de texto, multiusuário por número, setores, CRM básico integrado e marca por empresa. Todos os módulos compartilham contatos, eventos e permissões; não criar bancos ou cadastros paralelos desconectados dentro da mesma empresa.

| Componente | Regra comercial e técnica |
|---|---|
| Núcleo | Atendimento, contatos, setores, permissões, IA de texto e CRM básico |
| Voz de IA | Módulo separado: STT, TTS, vozes e consumo |
| Bots | Módulo separado: editor visual, motor e simulador |
| Webchat | Módulo separado: widget de site e integração WordPress |
| Templates | Modelos opcionais de configuração de IA e bots; não são segmentos nem concedem recursos comerciais |
| Outros adicionais | Automações avançadas, campanhas, social, anúncios e apps podem ser empacotados por plano |

Criar um registro de módulos e concessões desde a fundação, antes do SDK de verticais. Apenas o master e superadmins explicitamente autorizados concedem, suspendem ou revogam módulos. Plano define o máximo contratável; concessão define o que está efetivamente habilitado. O admin da empresa não concede a si próprio novos módulos. Bloquear também APIs, WebSockets, jobs e ferramentas de IA quando o módulo estiver desabilitado. Não basta esconder o menu. Suspender preserva dados e interrompe novas execuções; cancelamento e exclusão seguem política explícita.

### 10.2 Posse exclusiva, convite e transferência

1. Uma nova conversa entra na fila do setor e aparece simultaneamente aos agentes elegíveis daquele canal/setor. A visibilidade da fila não concede acesso a outras conversas já assumidas.
2. A ação **Assumir** é atômica no servidor e no Postgres. Se dois agentes tentarem, apenas um vence; o outro recebe conflito e atualiza sua tela. Não usar bloqueio apenas no navegador.
3. Após a tomada, a conversa deixa a lista dos demais agentes comuns. Continua visível ao responsável, convidados ativos e supervisores com escopo apropriado. Retirar também acesso por URL direta, anexos, pesquisa, exportação e eventos em tempo real.
4. **Convidar** adiciona um participante com direitos explícitos, sem trocar o responsável. Registrar quem convidou, quando e o que foi permitido. Revogar convite retira o acesso imediatamente, inclusive na sessão já aberta.
5. **Transferir** muda o responsável; o anterior perde o acesso, salvo se mantiver autorização independente de supervisor ou convite explicitamente preservado. Convites não são herdados automaticamente ao trocar de setor: recalcular elegibilidade e revogar os que perderem escopo.
6. Transferência para setor coloca na fila de destino; transferência para pessoa aplica as regras de elegibilidade/disponibilidade configuradas. Falha não pode perder a conversa: usar ramo de fallback e manter o responsável anterior até concluir a operação transacional.
7. IA pode encaminhar para humano/setor; humano pode encaminhar para IA autorizada. Registrar motivo e contexto. Coordenar envios para impedir respostas simultâneas conflitantes entre agentes humanos e IA.
8. Mudanças de posse, convites, acesso, encerramento e transbordo devem gerar auditoria. Revalidar permissões no momento de executar jobs pendentes.

| Papel | Visibilidade padrão | Poder de ativar módulos |
|---|---|---|
| Master da plataforma | Administração global, com entrada em contexto de empresa explícita e auditada | Sim |
| Superadmin delegado | Somente empresas e poderes concedidos pelo master | Apenas com concessão explícita |
| Admin da empresa | Gestão da própria empresa; acesso a conversas depende de permissão própria | Não |
| Supervisor de setor | Conversas dos setores/canais autorizados | Não |
| Agente | Fila elegível, conversas próprias e convites ativos | Não |

Aplicar negação por padrão. RLS de empresa é a primeira barreira; autorização por conversa é uma barreira adicional. O acesso do master deve passar por contexto auditado e credenciais segregadas, sem dar superpoderes ao usuário de banco da aplicação. Histórico unificado de contatos, totais, cards, relatórios e busca também não podem revelar conteúdo de conversas sem permissão.

**Testes de aceite obrigatórios:** corrida entre dois agentes; tentativa de leitura por ID; assinaturas WebSocket; transferência e revogação com tela aberta; líder de suporte tentando acessar financeiro; convite sem troca de dono; ex-responsável após transferência; módulo desabilitado chamado pela API, bot, IA ou job.

### 10.3 Mensagens silenciosas

Separar estruturalmente mensagens ao cliente, notas privadas de conversa e mensagens internas entre usuários. Notas e sussurros nunca entram no driver externo nem em exportações/transcrições do cliente. A UI deve distinguir claramente os modos, destinatários e anexos. Mensagem interna entre colegas não concede acesso à conversa citada. Testar que conteúdo privado jamais chega ao WhatsApp, webchat ou outro canal externo.

### 10.4 IA, voz, contexto e agendamento

Múltiplos agentes e configurações de LLM/STT/TTS por canal, sem limite arbitrário no modelo de dados, sujeitos às cotas contratadas e capacidade operacional. Configurar comportamento, tom, instruções, conhecimento, ferramentas e proibições por agente. Proibições operacionais devem ser aplicadas no servidor, além do prompt. Documentos e mensagens externas não podem ampliar permissões das ferramentas.

Contexto e RAG isolados por empresa e autorização. Conhecimento global só inclui material explicitamente publicado pela plataforma, nunca documentos privados de outro cliente. Após revogação, invalidar caches e não reutilizar contexto restrito. Transferências preservam apenas contexto autorizado. Adaptadores e fallback são configuráveis sem presumir que todo provedor suporte todas as modalidades.

Google Agenda: OAuth e tokens protegidos por empresa/usuário, fusos, disponibilidade, prevenção de duplicação e de conflito, reagendamento e cancelamento. Confirmar disponibilidade no instante da reserva e tratar concorrência. Não anunciar consulta/agendamento como concluído sem confirmação do provedor. Usar agenda interna quando contratada e configurada como alternativa.

### 10.5 Cobrança e verificação de identidade

O bot pode coletar nome, tipo de pessoa, e-mail, telefone e CPF/CNPJ, consultar débitos e oferecer os meios suportados pelo provedor. CPF/CNPJ isolado não prova identidade: validar vínculo/autorização antes de revelar faturas ou dados financeiros. Mascarar documentos nas telas e respostas; minimizar retenção e proteger o valor integral quando necessário.

Asaas/Stripe: listar débitos autorizados, gerar segunda via, disponibilizar Pix copia e cola, linha digitável/boleto e fatura quando suportados. Nunca inventar códigos, valores ou links. Cartão usa checkout seguro do provedor; não coletar dados de cartão no chat. Separar cobrança dos clientes finais da cobrança SaaS das empresas.

Planos recorrentes, cobranças únicas e parcelas avulsas são tipos distintos. Réguas configuráveis pelo dono autorizado, por exemplo D−5, D0 e D+2, com fuso, calendário, cancelamento ao pagar, idempotência e proteção contra duplicação. IA não altera valor/juros ou concede desconto além da política explicitamente autorizada.

## 11. Arquivos, marca e experiência nas telas

### 11.1 Gerenciador de arquivos por empresa

Ao criar empresa, provisionar de forma idempotente o namespace de arquivos e as pastas lógicas `brand`, `produtos`, `documentos`, `midias` e `exportacoes`. Armazenar metadados no Postgres e bytes no armazenamento local ou S3 compatível; usar `tenant_id` imutável no namespace, sem depender de nome ou domínio mutável.

Oferecer upload, organização por pastas, renomear, mover, busca, prévia e exclusão conforme permissão. Controlar quota, tipo real, tamanho, nomes e caminhos; bloquear travessia de diretório e arquivos executáveis. URLs privadas são assinadas e expiram, com autorização ao emitir e servir. Revogação deve invalidar acessos ainda ativos conforme mecanismo implementado. Logos/favicon publicados usam caminho público específico, somente após publicação explícita; documentos privados nunca herdam essa exposição. Backup/restauração incluem arquivos, metadados e chaves necessárias.

### 11.2 Referências visuais fornecidas

As três imagens anexadas foram examinadas como referência de organização, não como assets licenciados para reprodução:

- Kanban claro: cabeçalho compacto, pesquisa/filtros, colunas suaves, cards com responsável, etiquetas, valor, prazo e contagem de mensagens. Incluir ganhos/perdas e indicadores autorizados, sem revelar conversas restritas.
- Editor claro: canvas pontilhado, conexões entre blocos, catálogo lateral de ações, salvar rascunho/publicar, grupos, condições, webhooks e agentes com habilidades visíveis.
- Editor escuro: entradas por canal ou manuais, condições com saídas distintas, mensagens, escolhas e transferências para setor, IA e humano, incluindo ramos de erro, indisponibilidade e timeout.

Implementar identidade original da Néxora, temas claro/escuro, cantos arredondados, sombras discretas e semitransparência com contraste suficiente. Movimento sutil com respeito a redução de movimento. Desktop/tablet: navegação, lista e ficha lateral com expandir/recolher, preferências por usuário. Celular: uma área principal por vez, conversa em destaque e ficha/filtros em painel; ações de toque e alternativa ao arrastar para Kanban e editor. Não depender de hover.

Na inbox, diferenciar **origem do canal** (WhatsApp, Instagram, Messenger, webchat etc.) e **executor atual** (humano, bot, IA): IA não é rede de origem. WordPress recebe widget/plugin leve do módulo webchat, sem uma segunda base de atendimento. Notificações na tela bloqueada devem respeitar privacidade.

### 11.3 Dados legados e tracking

Não criar ERPs por segmento como parte da organização atual. Manter dados antigos de escola, música e delivery, sem renomear clientes ou etapas automaticamente. Cobrança recorrente continua ligada ao módulo Pagamentos.

Tracking de navegação e origem de leads tem escopo explícito no módulo Inteligência e Rastreamento de Leads, com consentimento quando aplicável, retenção e identificação permitida. Não presumir vínculo entre cookie e contato nem anunciar tracking enquanto não implementado.

## 12. Entregáveis de implantação e pacote GitHub

Esta seção exige a produção futura de arquivos e guias executáveis a partir do código auditado. O presente Markdown não é uma aplicação pronta nem prova de implantação.

### 12.1 Arquivos obrigatórios por release

- `Dockerfile`, `.dockerignore`, lockfile e imagem versionada em registry acessível à infraestrutura.
- `compose.yaml` para ambiente local/referência; `deploy/dokploy/compose.yaml` para Dokploy; `deploy/portainer/stack.swarm.yml` específico para Swarm. Não tratar Compose e Swarm como intercambiáveis.
- `.env.example` sem segredos, catálogo de variáveis, geração de segredos e configuração de volumes, redes, portas internas e domínios.
- `docs/DEPLOY-DOKPLOY.md`, `docs/DEPLOY-PORTAINER-SWARM.md`, `docs/BACKUP-RESTORE.md`, `docs/UPGRADE-ROLLBACK.md`, changelog e matriz do que foi validado.
- Scripts de instalação/verificação, seed opcional sem credenciais previsíveis e provisionamento da ilha por cliente.
- ZIP de release contendo o código e os artefatos da fase entregue, sem `.env`, credenciais, sessões de canais, banco de produção, `node_modules` ou arquivos privados. Gerar checksum e identificar commit/tag. Não rotular módulos futuros como concluídos.

### 12.2 Guia passo a passo — Dokploy

O guia deve mostrar: pré-requisitos e versões testadas; DNS e portas; conexão com GitHub; seleção do repositório `franceliopro/Nexora` e branch/tag; criação do serviço Compose; variáveis e segredos; Postgres com pgvector, volumes e redes; domínio/TLS no proxy; migrações; bootstrap seguro do master; conexão de canal; teste entre duas empresas; backup; atualização e recuperação. Verificar a documentação oficial vigente do Dokploy antes de descrever nomes de menus e opções. Não executar implantação real sem destino definido.

### 12.3 Guia passo a passo — Portainer em Swarm

O guia deve mostrar: inicialização e saúde do Swarm; manager/workers; redes overlay; imagem previamente construída e publicada (não depender de build no deploy da stack); autenticação do registry; secrets/configs; volumes persistentes e afinidade de nós; Postgres e sessões dos drivers; proxy/domínio/TLS; criação da stack no Portainer; migrações serializadas; verificações; backup, atualização e rollback.

Declarar política de reinício em `deploy.restart_policy` válida para Swarm e documentar readiness/retries sem depender de ordem de inicialização. Labels e redes do proxy devem corresponder à versão realmente usada. Disco local exige fixação ao nó ou armazenamento compartilhado compatível; multiplicar réplicas não torna Postgres, WAHA ou Baileys automaticamente redundantes. Definir dono de sessão por canal, lease/lock e recuperação para impedir duas instâncias usando a mesma sessão. Não publicar banco, pgAdmin ou endpoints administrativos dos drivers na internet por padrão.

### 12.4 Migrações e operação

Migrações no boot ou job dedicado com lock global e execução única, sem corrida entre réplicas. Aplicação só fica pronta após dependências e esquema compatíveis. Mudanças destrutivas exigem estratégia expandir/migrar/contrair; rollback de imagem não desfaz migração por mágica. Testar restauração de banco, arquivos e sessões compatíveis, incluindo custódia das chaves criptográficas.

**Aceite de infraestrutura:** testar instalação limpa e atualização em Compose e Swarm, recuperação após reinício e restauração em ambiente separado. Registrar versão, comandos, resultados e limitações. Validação de YAML ou build isolado não equivale a implantação validada no Dokploy/Portainer.

## 13. Matriz de rastreabilidade do alinhamento

| Pedido original | Seções / entrega |
|---|---|
| Multiusuário, setores e assumir exclusivamente | 5.2, 5.3, 10.2; base na Fase 0 |
| Convites, transferência, supervisor e mensagem silenciosa | 10.2–10.3; ampliação na Fase 2 |
| IA, proibições, RAG, voz modular e Google Agenda | 5.4, 10.1, 10.4; Fases 1 e 3 |
| Bots visuais e automações integradas | 5.5–5.6, 11.2; Fases 1 e 3, preservando o motor existente |
| Asaas/Stripe, faturas e régua de cobrança | 5.8, 10.5; Fase 3 |
| WhatsApp, redes e Zernio com capacidade verificada | 5.1, 5.9; Fases 0, 4 e 9 |
| Webchat e WordPress como módulo | 5.1, 10.1, 11.2; Fase 4 |
| CRM, carteiras, relatórios e origem/tracking | 5.7, 11.3; Fases 2 e 5 |
| Templates de atendimento em vez de segmentos | 5.13, 11.3; biblioteca opcional |
| Master, concessões e plano por empresa | 10.1–10.2; base na Fase 0 e comercial na Fase 6 |
| Brand, domínio, arquivos e celular | 5.11, 5.15, 11; base na Fase 0, domínio automático na Fase 6 |
| Banco próprio por cliente | 4, 12; modo ilha, sem remover o multiempresa padrão |
| Docker, Dokploy, Swarm e ZIP GitHub | 12; base na Fase 0 e atualização a cada release |

Velocidade significa entregas pequenas, reutilização do código e redução de retrabalho. Não prometer ERP completo, integrações de parceiros, aprovação de lojas ou paridade total em prazo recorde. A primeira entrega demonstrável deve mostrar: canal → fila → tomada exclusiva → conversa com IA de texto → transferência humana → card, com isolamento entre empresas e autorização por conversa testados.
