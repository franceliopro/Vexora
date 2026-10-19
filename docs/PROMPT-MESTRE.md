# NEXORA — Prompt mestre (v2)

> Como usar: abra o Claude Code na raiz do repositório e diga: **"Leia docs/PROMPT-MESTRE.md e execute a Fase N."** Uma fase por vez, cada uma em branch própria, com testes, e só vai para o `main` com tudo verde.

---

## 1. Papel e objetivo

Você é engenheiro(a) sênior full-stack. Sua missão é evoluir o **Nexora** (repositório `franceliopro/Nexora`) para uma plataforma **omnichannel de atendimento + CRM + IA**, **multiempresa**, **white-label**, **modular por segmento** e **auto-hospedada** (Dokploy/Portainer), cobrindo as capacidades dos CRMs de WhatsApp com agentes de IA (referência de mercado: HelenaCRM) **somadas** aos diferenciais do Nexora.

A interface deve ser limpa, rápida e totalmente personalizável (marca, cor, fonte, ícone, domínio). Inspire-se em padrões comuns de CRMs de conversa (caixa de entrada, funil kanban, construtor de fluxos), **sem copiar** marca, textos, ícones ou identidade visual de nenhum concorrente.

## 2. Estado atual (evolua, não refaça)

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
3. **Migrações:** numeradas, idempotentes quando possível, testadas do zero e a partir da versão anterior. **Toda tabela nova com `tenant_id` + RLS forçado + `fk_guard` nas referências.** Um teste automático percorre `pg_class` e falha se alguma tabela de dados estiver sem RLS.
4. **Não quebrar quem já fez deploy:** compatibilidade retroativa, migração automática no boot, `/healthz` e `/readyz`, changelog.
5. **Segredos:** nunca em texto puro no banco nem em log. Criptografia em repouso (AES-256-GCM, chave em env), mascarados na UI.
6. **Entrada externa é hostil:** validar tudo no servidor; preços e totais sempre recalculados no servidor; bloquear SSRF; limitar tamanho e tipo de upload; limitar taxa por IP e por empresa.
7. **UI:** nada de `[object …]`/`undefined`/`null` em tela; erro de JS visível; funcionar em celular; acessível (teclado, contraste); pt-BR por padrão com base de i18n (en, es).
8. **Entregas pequenas e revisáveis:** commits claros, uma fase por branch, README e `docs/` atualizados, dados de demonstração por segmento (seed) para testar visualmente.
9. **Sem alegações falsas:** integrações que não puderam ser verificadas contra a documentação oficial ou sandbox são marcadas como "não verificadas" no código e no README.

## 4. Decisões de arquitetura

- **Banco:** apenas Postgres (RLS é a rede de proteção). MySQL/MariaDB ficam fora.
- **Fila de jobs sem infraestrutura nova:** `pg-boss` (usa o próprio Postgres) para envios com limite de taxa e retentativa, webhooks de saída (padrão outbox), cadências, disparos, indexação de documentos e cobranças.
- **Tempo real:** WebSocket com escopo por empresa; para mais de uma instância, `LISTEN/NOTIFY` do Postgres (Redis opcional).
- **Mídia:** armazenamento local por padrão e S3 compatível (MinIO/S3) opcional; **URLs assinadas e com expiração**.
- **Front:** manter sem build por enquanto, mas **dividir em módulos ES por tela**, com biblioteca de componentes e tokens de design (cores, tipografia, espaçamento) que a marca do cliente sobrescreve. Reavaliar Vite/Preact se o editor de fluxos ou a bandeja pedirem.
- **Extensibilidade:** verticais viram **plugins** (seção 5.13), não código solto no núcleo.
- **Dois modos de implantação:** multiempresa numa stack (padrão) e "ilha" por cliente (script existente).

## 5. Módulos — requisitos e critérios de aceite

### 5.1 Canais
- **WhatsApp API Oficial (Cloud API da Meta):** driver próprio; o cliente informa o próprio token/WABA (entrada manual primeiro; Embedded Signup só com aprovação da Meta); gestão de **modelos (HSM)** com status de aprovação; janela de 24 h (fora dela, só modelo); mensagens interativas (botões, listas); recibos de entrega/leitura; grupos na API oficial quando disponível.
- **WAHA e Baileys** continuam como opções, com aviso de risco (Baileys não é oficial). Assistente guiado **"Conectar WhatsApp"**: escolha do driver, config preenchida, QR que atualiza sozinho, status (conectando, conectado, caiu) e reconexão.
- **Instagram (DM, comentários, respostas a stories) e Messenger/Facebook (DM e comentários):** integração direta com a API oficial da Meta (token por empresa). Zernio fica **opcional**, apenas para publicação em redes.
- **Webchat:** widget embutível por script, com identidade da marca, formulário pré-conversa e continuidade por cookie.
- **Telegram** e **e-mail** (IMAP/SMTP) como canais adicionais; SMS opcional.
- **Aceite:** mensagens de texto, áudio, imagem, vídeo, documento, localização e contato entram e saem; reconexão automática; um contato pode ter conversa em vários canais; idempotência por `ext_id`.

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
- **Áudio:** recebe e envia voz (STT/TTS por agente, vozes configuráveis); regra "áudio gera áudio, texto gera texto".
- **Inteligência automática:** resumo da conversa, sentimento, classificação de intenção, qualificação e pontuação de lead, sugestão de resposta ao atendente.
- **Custos:** painel de uso e custo de IA por empresa, agente e canal; cotas por plano.
- **Aceite:** habilidades têm testes com provedores simulados; o Supervisor tem testes de roteamento com casos reais em pt-BR.

### 5.5 Bots e fluxos (estilo Typebot)
- Manter o editor atual e acrescentar: gatilhos (primeira mensagem, palavra-chave, etiqueta, evento, API), **menus interativos nativos** quando o canal permitir (botões/listas da API oficial), envio de mídia, atraso, horário comercial, **pesquisa**, formulário multi-etapas, bloco de agendamento, bloco de pagamento (link com escolha de Pix, boleto ou cartão e confirmação na conversa), bloco de IA/agente, bloco de habilidade (tag, campo, card, encerrar), variáveis globais e por contato.
- **Teste dentro do editor** (simulador), **versionamento/publicação** de fluxos, duplicação e modelos por segmento, métricas por bloco (entradas, saídas, abandono).
- **Aceite:** cada bloco com teste no simulador; fluxo antigo continua funcionando.

### 5.6 Automações, cadências e disparos
- **Automações por gatilho** (construtor visual): card movido, etiqueta adicionada, campo alterado, mensagem recebida, sem resposta por X tempo, pagamento confirmado/vencido, agendamento criado, data/hora, webhook de entrada. **Ações:** enviar mensagem/modelo, mover, atribuir, etiquetar, criar tarefa, chamar webhook, rodar bot, esperar, condição.
- **Cadências (sequências):** passos com intervalos que respeitam **horário e dias úteis**, modelo aprovado no primeiro contato (API oficial), inscrição manual, por bot, por automação ou por API, **saída automática** quando o contato responde ou cumpre condição, métricas (enviadas, entregues, respostas).
- **Disparos em massa:** público por etiquetas, campos, funil e listas importadas; modelo; agendamento; **limite de ritmo e aquecimento**; escolha de canal e equipe; ação para conversas já abertas; **descadastro e consentimento obrigatórios**; métricas em tempo real; teste A/B.
- **Aceite:** nenhuma mensagem sai fora do horário configurado; opt-out respeitado em 100% dos testes.

### 5.7 CRM
- **Várias esteiras**, etapas com cor e tipo (aberta, ganha, perdida), **motivo de perda**, probabilidade e previsão de receita.
- **Cards (negócios)** separados da conversa e ligados a ela: valor, produtos/itens, responsável, data prevista, campos personalizados, arquivos, histórico.
- **Empresas e contatos** (um para muitos), **tarefas e lembretes** com calendário e notificação, **metas** por pessoa/equipe.
- **Captação:** formulários web, geradores de link e QR de WhatsApp com mensagem pronta e **UTM**, atribuição de **anúncios com clique para WhatsApp (CTWA)**.
- **Relatórios e painéis:** conversão por etapa, tempo em cada etapa, desempenho por atendente/equipe, primeira resposta e tempo de atendimento, IA × humano, CSAT/NPS, receita, motivos de perda, campanhas, custo de IA; exportação CSV/PDF.
- **Aceite:** relatórios conferem com os dados (testes com massa conhecida).

### 5.8 Pagamentos e cobrança
- **Asaas** (link, Pix, boleto, cartão, assinaturas, 2ª via por CPF/CNPJ), **Mercado Pago**, **Stripe**, e Pix direto por PSP (opcional). Webhooks verificados (assinatura/consulta ao provedor), conciliação, **confirmação enviada na própria conversa** e status do pagamento no card.
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
- **API de parceiros** para criar/suspender empresas, ajustar limites e marca (base do white-label).
- **Aceite:** coleção Postman/Bruno e testes de contrato.

### 5.11 SaaS e white-label
- **Planos e limites** por empresa: usuários por canal, canais, mensagens, créditos de IA, armazenamento; trial; suspensão e reativação automáticas.
- **Cobrança das empresas** (Asaas/Stripe) com faturas e inadimplência; **revenda**: parceiro → clientes, preços e pacotes do parceiro, comissão, painel do parceiro, gerente de conta.
- **Domínio próprio por empresa** com certificado automático (integração com o proxy do Dokploy/Traefik ou Caddy), **e-mails e mensagens com a marca**, tela de login personalizada, modo escuro/claro.
- **Onboarding guiado** (assistente de 5 passos: segmento, marca, canal, agente, primeiro bot) e **modelos prontos por segmento** (bots, agentes, automações, funil).
- **Aceite:** criar uma empresa completa pela API de parceiros sem tocar no servidor.

### 5.12 Segurança, LGPD e operação
- Autenticação: senha forte, **2FA (TOTP)**, tokens de acesso curtos com refresh, bloqueio por tentativas, sessões e dispositivos listados/revogáveis; SSO opcional.
- **Log de auditoria** (quem fez o quê, quando, de onde), exportável.
- **LGPD:** consentimento e descadastro, exportação e exclusão de dados por contato, política de retenção configurável, mascaramento de dados em logs.
- Cabeçalhos de segurança (CSP, HSTS), proteção CSRF onde aplicável, validação de upload (tipo real, tamanho, varredura opcional).
- **Observabilidade:** logs estruturados com `tenant_id`/`request_id`, `/healthz` e `/readyz`, métricas Prometheus, painel de fila de jobs, alerta de canal caído.
- **Backup:** manter o atual; adicionar teste automático de restauração e, opcional, PITR.

### 5.13 Verticais como plugins (SDK)
- **Manifesto de plugin:** tabelas (com RLS gerada automaticamente), páginas de UI, blocos de bot, habilidades de IA, rótulos, funil padrão, configurações, permissões. Ligar/desligar por empresa.
- **Migrar** escola/música, delivery e cobrança recorrente para o formato de plugin sem perder dados.
- **Novos plugins (nesta ordem):** barbearia/beleza (agenda por profissional e serviço, comissão, pacotes, fidelidade, confirmação e lembrete), clínica (agenda por profissional/convênio, confirmação, retorno, documentos, cuidados de LGPD para dados de saúde), advocacia (processos, prazos, documentos, honorários), imobiliária (imóveis, visitas, captação), loja (catálogo, variações, estoque, carrinho no WhatsApp, frete, checkout), escola (lembrete automático de aula, reposição, boletim), delivery (KDS de cozinha, mesas por QR, entregadores e rotas, **integrações oficiais iFood/Keeta/99Food conforme credenciais de parceiro**, cardápio público web).
- **Aceite:** um plugin de exemplo documentado, criado em menos de um dia por outro desenvolvedor.

### 5.14 Apps — módulo à parte (`apps/`)
Decisão: **sim, como módulo separado**, com ciclo de lançamento próprio (revisão das lojas, assinatura, certificados), mas em duas etapas.
- **Etapa A — PWA:** instalável, ícone e nome da marca da empresa, **notificações push (Web Push/VAPID)**, contador de não lidas, som, atalhos, cache offline da interface, câmera/microfone/anexos, fila de envio offline.
- **Etapa B — apps nativos (Capacitor):** iOS e Android, push (APNs/FCM), links profundos, biometria. **Pipeline de build white-label por empresa** (nome, ícone, splash, bundle id, cor, domínio) via CI/fastlane; a publicação usa **a conta de desenvolvedor da própria empresa** (recomendado) ou a conta do revendedor (opcional, premium).
- **Telas do app:** bandeja, conversa (texto, áudio, mídia, respostas rápidas), funil, tarefas, agenda, notificações, painel resumido, status de presença.
- **Pré-requisitos no servidor:** tabela de dispositivos, API pública, tokens com refresh, fila de notificações.
- **Aceite:** notificação chega em segundos com o app fechado (testes em aparelho real); build de um app de exemplo gerado pelo pipeline.

### 5.15 Interface e experiência
- Layout: barra lateral escura/clara, bandeja em 3 colunas, funil kanban fluido com arrastar, construtor de fluxos em tela cheia, painéis com cartões e movimento sutil.
- **Marca total:** cor de acento (tons derivados e contraste automáticos), fonte, logo, ícone, favicon, textos e domínio por empresa.
- Estados vazios úteis, carregamento com esqueleto, erros claros, atalhos de teclado, pesquisa global (`Ctrl+K`).
- Desempenho: primeira tela em menos de 2 s em rede 4G; listas paginadas/virtualizadas.

## 6. Plano em fases (uma por branch)

| Fase | Entregas | Depende de |
|---|---|---|
| **0 — Fundação** | CI com Postgres e E2E real do servidor; teste automático de RLS; assistente "Conectar WhatsApp"; segredos criptografados; mídia assinada; fila `pg-boss`; modularização da UI; seed de demonstração; i18n base; logs e `/readyz` | — |
| **1 — Conversas e IA** | Estado e protocolo; etiquetas; campos personalizados; respostas rápidas; horário/saudação/ausência; SLA; habilidades do agente; Supervisor; base de conhecimento por arquivos; playground | 0 |
| **2 — Filas e equipe** | Distribuição, transbordo, carteirização, permissões, painel do supervisor, chat interno, mensagens agendadas, presença | 1 |
| **3 — API e automação** | API pública + chaves + OpenAPI; webhooks de saída; automações por gatilho; cadências; conectores n8n/Make/Pluga; **PWA (Apps etapa A)** | 1, 2 |
| **4 — Canais oficiais e disparos** | Cloud API da Meta + modelos; Instagram/Messenger direto; webchat; Telegram; disparos em massa; CTWA | 3 |
| **5 — CRM avançado** | Várias esteiras; cards separados; empresas; tarefas; metas; formulários, links/QR/UTM; relatórios e painéis | 1 |
| **6 — SaaS e white-label** | Planos e limites; cobrança das empresas; parceiros e revenda; domínio automático; onboarding; API de parceiros | 3 |
| **7 — Apps nativos** | Capacitor iOS/Android; pipeline white-label; push nativo | 3, 6 |
| **8 — Plugins e verticais** | SDK de plugins; migração dos módulos atuais; barbearia/beleza, clínica, advocacia, imobiliária, loja, delivery avançado | 3 |

Em cada fase: entregar **(a)** código, **(b)** migrações testadas, **(c)** testes (unitário, integração, navegador), **(d)** README/`docs/`, **(e)** nota "o que foi e o que não foi verificado", **(f)** dados de demonstração.

## 7. O que foi cortado ou adiado (e por quê)

- **Ser provedor oficial da Meta (BSP) / Embedded Signup completo:** depende de aprovação da Meta. Começa com token informado pelo cliente.
- **Zernio como dependência:** passa a opcional; Instagram e Messenger vão direto pela API oficial.
- **MySQL/MariaDB:** fora; o isolamento por RLS é a decisão central.
- **App nativo por empresa como padrão:** vira opção premium (custo de contas e revisão nas lojas); o padrão é PWA.
- **Paridade total com o Typebot:** manter os blocos úteis ao negócio e a facilidade de uso.
- **Marketplace público de plugins:** só depois do SDK estável.

## 8. O que foi acrescentado além do pedido original

CI com E2E real; teste automático de RLS; fila de jobs com retentativa; criptografia de segredos; mídia assinada; estado e protocolo de conversa; SLA; horário de atendimento; respostas rápidas; chat interno; carteirização; painel do supervisor; Agente Supervisor e playground de IA; guardrails e controle de custo; API pública, webhooks e conectores; cadências e disparos com consentimento; atribuição de anúncios com clique para WhatsApp; planos, limites e revenda; 2FA, auditoria e LGPD; SDK de plugins; PWA e pipeline de apps white-label.

## 9. Antes de começar cada fase

1. Leia o repositório e este documento; liste o que já existe e o que muda.
2. Proponha o esquema de dados e as telas em poucas linhas e siga em frente (só pare para decisões irreversíveis).
3. Trabalhe em branch própria, abra PR com descrição, teste e checklist, e só faça merge com CI verde.
4. Ao terminar, informe objetivamente: o que funciona (com evidência), o que não foi verificado e os próximos passos.
