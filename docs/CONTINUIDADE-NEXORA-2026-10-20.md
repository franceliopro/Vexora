# Néxora Suite — registro de continuidade

Atualizado em 20/10/2026. Documento técnico e de produto para retomar o trabalho sem depender do histórico do chat. Leia também `docs/PROMPT-MESTRE.md`, `docs/PROCESSO-ATENDIMENTO.md`, `docs/ATENDIMENTO-CRM-OPERACAO.md`, `docs/INTEGRACOES-GUIADAS.md` e `docs/RASTREAMENTO-VEICULAR.md`. Havendo divergência, confronte os requisitos abaixo com o código e com o comportamento real. Este registro não substitui uma homologação em produção.

## 1. Projeto, publicação e decisões de negócio

- Repositório correto: https://github.com/franceliopro/Nexora. Não usar Nexora2.
- Aplicação informada pelo usuário: https://nexora.effe.site/. Painel master: `/platform.html`. Atendimento: `/#inbox`; integrações: `/#integrations`; CRM: `/#pipeline`.
- O usuário autorizou commits incrementais em `main`; seu Dokploy/Aiodeploy acompanha as alterações. Commit publicado não comprova que o novo contêiner está saudável.
- Nesta sessão, a pasta local `Nexora` não possui checkout Git. A publicação foi feita pela API do GitHub: ler HEAD, criar árvore baseada na árvore atual, criar commit filho e atualizar a referência com `expected_sha`. Nunca sobrescrever mudanças concorrentes.
- A Néxora é vendida ao cliente final: empresas, clínicas, escritórios etc. Não é plataforma de revenda para os clientes. Personalização de marca/domínio por empresa não concede poder de revenda.
- O dono da plataforma é master; somente ele e poderes equivalentes ativam módulos e fazem a gestão central de redes sociais. Administrador de uma empresa não é superadministrador da plataforma.
- O provedor social gerenciado não deve aparecer para a empresa contratante. A conta central e o custo são administrados pelo dono da Néxora. O cliente vê Instagram, Messenger e suas inboxes, sem a marca Zernio ou sua chave.
- Cada empresa usa suas próprias credenciais financeiras e suas próprias autorizações Google. Não colocar segredos em código, documentação, capturas ou respostas de API ao navegador.

### Organização do produto

Os onze pontos são uma sequência de organização e implantação, não onze produtos independentes ou telas de segmentos:

1. Central de Atendimento
2. CRM
3. Inteligência e Rastreamento de Leads
4. Agentes de IA
5. Chatbots
6. Campanhas
7. Sequências
8. Mensagens Agendadas
9. Integração e API
10. Pagamentos
11. Personalização para cada Cliente

Prioridade: estabilizar atendimento e CRM, validar conversas reais e financeiro, depois aprofundar bots/IA e inteligência de leads. Segmentos viraram templates de configuração. Não entregar telas vazias de segmentos como se fossem ERPs completos.

## 2. Requisitos e preferências do usuário

Interface em português, simples, fluida, limpa, responsiva, utilizável no celular, com cantos arredondados, cores sutis, claro/escuro e identidade própria. HelenaCRM é referência funcional, sem copiar sua marca. As imagens enviadas são referências; as duas últimas mostram colunas arredondadas e uma coluna destacada ao receber um card.

Logo da empresa no topo com acesso ao atendimento. Logotipo claro, logotipo escuro e favicon são arquivos distintos. Rodapé Néxora Suite by EFFE. Marca, fontes e cor por empresa. Ajuda contextual deve explicar o que é, para que serve e como usar cada recurso, sem despejar termos técnicos no atendimento.

Na fila: Meus selecionado ao abrir; Novos/Meus/Outros com contagens; concluídos como ícone; arquivados/lixeira/todos em lista nos três pontos. Filtro junto à busca, em lista flutuante leve, não modal grande. Não repor botões de Agenda/Inboxes/Passo a passo na barra lateral da fila.

Conversa: protocolo, origem reconhecível, responsável, etiquetas visíveis; atribuir e convidar perto de concluir. Ficha do cliente à direita aberta por padrão, recolhível, com etiquetas, campos e nota pessoal. Compositor estável durante novas mensagens. Agenda, arquivos, cobranças, CRM e respostas rápidas acessíveis sem perder a conversa. Detalhes internos de driver/IDs não devem poluir a ficha.

## 3. Arquitetura real e isolamento

Node ESM, Express, PostgreSQL, WebSocket e JavaScript/CSS no navegador; não há build de frontend. Docker inicia `src/server.js`. Dependências principais em `package.json`. `web/index.html` é a casca; scripts posteriores substituem partes antigas de interface. Antes de editar uma função, buscar a última definição carregada, especialmente `conversationCRM` em `web/conversation-inline.js` e as views em `web/organization.js`.

O banco atual é PostgreSQL compartilhado com `tenant_id`, RLS e contexto AsyncLocalStorage, não um banco físico separado por empresa. A ideia original de banco independente por cliente não foi entregue. Não prometer MySQL/MariaDB ou isolamento físico de bancos sem implementar um provisionador específico.

- `src/db.js`: pools administrativo e da aplicação; `q` aplica contexto de empresa/ator; `tenantTransaction` mantém operação atômica. Tabelas de provedores centrais são revogadas para a role da aplicação.
- `src/ctx.js`: contexto, assinaturas de URLs e endereço público.
- `src/server.js`: APIs, autenticação, estáticos, callbacks, migrações, WebSocket e tarefas periódicas.
- `src/conversation-policy.js`: visibilidade e controle das conversas.
- `src/governance.js`: permissões operacionais e normalização de papéis.
- `src/conversation-actions.js`: assumir, atribuir, convidar e modos de automação.
- `src/core.js`: recepção, deduplicação, contato/conversa, bot/IA e entrega de mensagens.

Agentes não devem acessar conversas de colegas sem convite, participação de equipe autorizada ou supervisão explícita. Atribuir troca a responsabilidade; convidar compartilha sem remover o responsável. Assumir pausa automações e incrementa `automation_epoch`, usado para recusar respostas atrasadas. Não remover essas verificações para facilitar um teste.

## 4. Atendimento implementado

Filas, filtros e contagens com regras compartilhadas; busca por contato, mensagem e protocolo; governança; convite individual/equipe; transferência; conversa humana, bot, IA e híbrida; mensagens e anexos; notas internas; respostas rápidas; ficha/histórico/etiquetas/campos; agenda e Drive no fluxo; cobranças; conclusão com resultado e motivo; relatórios de atendimento.

`web/attendance.js` mantém compositor, foco, cursor, rascunhos e gravação estáveis nas atualizações. Não substituir toda a tela a cada evento. Reconexão WebSocket usa espera progressiva. Testes simulados não mostraram F5 periódico; um loop real exige analisar logs de contêiner, sessão e rede.

`src/service-routing.js`: filas compartilhadas/sequenciais/equilibradas, carteira e transbordo. O ciclo é de 30 segundos; considera usuários ativos elegíveis, não presença online precisa. Não rouba uma atribuição humana manual. Evita repetir indefinidamente os mesmos agentes; ao esgotar possibilidades deixa a conversa na fila. Equipes privadas/escopos dependem de governança e participação correta.

### Protocolo

`src/service-protocol.js` e migração 016: número próprio no formato NX-ANO-EMPRESA-ID, imutável, visível e copiável; tentativa de aviso ao cliente na primeira entrada. Estados de entrega distinguem pendente, enviando, enviado e necessidade de conferência. Não repetir cegamente após falha ambígua. Conversas antigas recebem número sem disparo em massa.

### Identificação de bot/IA e origem

Ícones coloridos da rede no atendimento e nas inboxes: WhatsApp verde, Instagram em gradiente, Messenger azul, Telegram e X. Bot e IA são indicadores separados da origem da mensagem. Um bot não deve ser apresentado como uma rede.

A migração 017 adiciona `messages.executor` para distinguir novas mensagens de bot, IA, sistema e humano. Historicamente `ai=true` também marcava mensagens de bot/protocolo, então o rótulo anterior “Agente IA” não comprovava o executor. Não inventar uma classificação retroativa: mensagens antigas sem executor ficam como “Automação”.

## 5. CRM implementado e ajustes atuais

`src/crm.js` e `web/crm.js`: painéis, etapas personalizadas, drag and drop, alternativa por toque, Kanban/Lista/Agenda/Relatório, etiquetas, campos, responsável, busca avançada, oportunidades vinculadas a contato e conversa, histórico/notas, contagem de mensagens não lidas e acesso às conversas respeitando permissões.

Conclusão exige ganho/perda; perda tem motivo administrável. Cards concluídos saem do Kanban e permanecem em outras visões. Reabertura recupera etapa anterior. Inatividade configurável gera perda com motivo próprio. Duplicar copia configuração sem clientes. Exclusões têm destino, confirmação externa e auditoria. Relatórios administrativos incluem resultados, valores, conversão, ciclos, etapas e motivos. Há versionamento otimista para evitar sobrescrita simultânea e comemoração visual/sonora configurável.

Correções de 20/10:

- Lista de cards traz também etiquetas do contato; o Kanban une etiquetas do contato e da oportunidade sem duplicar. Filtro de etiqueta considera ambas.
- Painéis vêm em ordem de criação decrescente por ID; abertura direta do CRM seleciona o mais recente acessível.
- “Kanban da conversa” abre o painel vinculado à conversa, priorizando oportunidade aberta daquela conversa. Sem vínculo, oferece criação/integração; múltiplas oportunidades continuam acessíveis no gerenciador.
- Cards ganham foto/iniciais, título na cor da marca ao passar o mouse/foco, colunas arredondadas e destaque de fundo/brilho na coluna que recebe o arraste. Respeita preferência por menos movimento.

O CRM não deve concluir uma venda só porque uma cobrança foi enviada. Fechamento de atendimento e ganho/perda de oportunidade continuam conceitos diferentes.

## 6. Inboxes e conexões

`src/integrations.js`, `src/managed-social.js`, `web/integrations.js`, `web/inboxes.js` e painel master. Inboxes têm nome, conta/sessão, conexão consultada e última mensagem recebida. Conectado não prova recepção de webhook nem envio de resposta: essas etapas precisam ser verificadas separadamente.

Baileys mantém sessão em volume persistente, QR, conta e estado; WAHA usa serviço externo; Meta oficial usa credenciais/permissões e webhook; Zernio utiliza conta central criptografada, reserva de conta por empresa e ativação no master. O perfil Instagram informado pelo usuário é @franceliopro, mas o estado atual dessa conta não foi consultado com acesso autenticado nesta etapa.

Exclusão de inbox é remoção operacional com preservação de histórico; confirmação pelo nome, opção copiar, restauração e testes de API existem. Não apagar mensagens/conversas para “corrigir” uma inbox. Não conectar a mesma sessão Baileys simultaneamente em várias réplicas.

A rota de vínculos de inbox existia em `src/inbox-routing.js`, mas não estava montada no servidor. Foi montada nesta etapa. Em Integrações, administradores têm **Bot, IA e CRM**: bot de entrada, IA de fallback, painéis vinculados e criação automática de oportunidade. Isso torna a configuração acessível e mantém as verificações de empresa e recursos ativos. Fluxos existentes nos vínculos são preservados.

### Fotos dos contatos

`src/contact-profile.js`: valida URL HTTPS sem credenciais e guarda URL/data de consulta por 24 horas. Não baixa URLs arbitrárias no servidor. O navegador usa imagem com fallback de iniciais e sem envio de referrer. Campos ficam em `contacts.data.avatar_url` e `avatar_checked_at`.

Baileys usa `profilePictureUrl`; WAHA usa API de foto de contato; Meta Instagram/Messenger consulta `profile_pic`. A API oficial WhatsApp não é tratada como fonte universal de foto de consumidores. Dados recebidos de redes gerenciadas podem trazer imagem; o adaptador também tenta metadados de participante da conversa. A documentação pública de conversa Zernio não garante um campo de avatar para todos os canais: imagem ausente/permissão negada/URL expirada é limitação real, não deve bloquear a conversa. Homologar com cada inbox; não afirmar cobertura completa sem ver resposta real. Fotos aparecem na lista, cabeçalho, ficha e cards quando disponíveis.

## 7. Financeiro e o problema do CPF como telefone

O usuário relatou que Instagram e WhatsApp já consumiram Asaas em seus testes. Isso é relato de produção, não execução autenticada do agente nesta sessão. Foi identificado um caminho incorreto: o identificador de rede do contato era disponibilizado ao bot como telefone. Também havia possibilidade de a IA responder sem uma consulta executada.

`src/financial-identity.js` agora diferencia documento, telefone real de WhatsApp e ID social. A IA recebe regra contra inventar telefone/cobrança/resultado; um filtro impede ecoar o CPF como número de ligação. Sem o histórico exato não é possível provar como a resposta estranha original foi gerada.

**CPF isolado não comprova identidade.** Na consulta automatizada com verificação telefônica, WhatsApp precisa corresponder ao cadastro Asaas. Instagram/Messenger não fornecem automaticamente telefone verificado: encaminhar para conferência humana na mesma conversa, sem sugerir ligação para um número derivado de documento/ID. O atendente pode confirmar identidade e usar o botão Cobranças. Falta implementar OTP ou vínculo comprovado para divulgação financeira autônoma nesses canais. Não remover a proteção para fazer uma demonstração parecer funcionar.

`src/payments.js`: clientes por CPF/CNPJ, débitos pendentes/vencidos, configuração por plataforma, links/linha digitável/Pix/fatura. `src/financial.js`: configuração/status/validação, consulta confirmada por operador, token temporário limitado à empresa/usuário/conversa, resumo e envio idempotente, criação de cobrança e Stripe Checkout. `src/financial-provider.js`: requisições, mensagens e autenticação de webhook. `src/payment-status.js`: confirmação vinculada à origem, ambiente e pagamento, sem duplicar eventos.

`src/debt-presentation.js`: apresentação determinística, nome completo sem máscara conforme pedido, tipo de pessoa, documento mascarado, valor/vencimento/status e descrição separados por blocos, total. Mensagens extensas são divididas para não exceder limites usuais. Fluxo do bot permite selecionar débito e meio, e inclui fatura completa, sem duplicá-la quando já foi escolhida. Fatura não disponível exige encaminhamento; nunca inventar URL/código.

Asaas tem Sandbox/Produção explícitos, teste de credencial com feedback e dados do webhook na tela. Cada empresa configura sua chave. Sandbox não quita dívida real. Stripe usa chave e webhook de teste/produção; Stripe Connect OAuth não foi implementado. Não há contabilidade completa de estornos/chargebacks.

## 8. Bot primeiro, IA como alternativa e encerramento

Em **Integrações → inbox → Bot, IA e CRM**, escolher bot de entrada e IA. Ativar os recursos e configurar modelos/credenciais antes de testar. O bot precisa estar ativo e aplicável ao canal. A IA precisa estar ativa e selecionada ou habilitada nesse canal.

No editor do bot, bloco **Pedir para escolher → Texto fora das opções ou áudio → Transferir para IA com o histórico**:

- opção reconhecida (número ou texto de opção) continua no bot;
- texto fora das opções ou áudio transfere à IA se houver agente elegível;
- leitura de áudio precisa de STT configurado na IA;
- CPF, seleção de débito e meio de pagamento continuam determinísticos no fluxo financeiro; não são entregues ao modelo só por serem números;
- sem IA elegível, o fluxo conserva sua validação/repetição;
- execução transferida deixa de ficar ativa; próximas mensagens continuam na IA, sem bot responder junto;
- humano que assumir pausa tudo; não retomar automaticamente.

Novos templates de rastreamento incluem fallback nas escolhas. **Templates já instalados são preservados**: editar seus blocos existentes para habilitar o recurso, não reinstalar apagando configurações. Templates de produto são criados em rascunho/inativos; não significam operação já autorizada na conta real.

Novo bloco **Concluir atendimento** define despedida, motivo e resultado. Na IA, a ação `close` deve estar explicitamente na lista de ações permitidas. A instrução limita encerramento a resolução/solicitação do cliente; não encerra por mera emissão de cobrança. `src/automation-close.js` usa transação, bloqueio de linha e epoch, recusa conversa humana/atribuída, encerra execuções/tarefas e registra evento de conclusão com executor. Não marca CRM como ganho automaticamente. Nós antigos “Fim” continuam apenas terminando o fluxo, salvo configuração explícita; trocar pelo novo bloco quando o objetivo for concluir o atendimento.

## 9. Template de rastreamento veicular

Ceeb Vision, Link e Rastreabem. Cada uma tem Suporte e Financeiro; Comercial e Administrativo são gerais: oito equipes. São nomes de filas, não integrações reais de telemetria com essas plataformas.

Triagem: saudação conforme fuso da empresa → setor → plataforma para Suporte/Financeiro → pagamento/atendente → documento/consulta/meios/fatura ou equipe exata. IA também pode fazer triagem e invocar fluxo financeiro seguro. Configurar fuso **America/Cuiaba** para o cliente citado, não inferir pelo servidor. Suporte humano pausa automação e mantém contexto.

## 10. Agenda, Drive e relatórios

Master configura uma vez aplicativo OAuth Google, credenciais e callbacks; a empresa/usuário autoriza no painel. `src/google-oauth-config.js` mantém credenciais centrais criptografadas e fallback de ambiente. Configuração inicial no Google Cloud ainda é necessária; autorização não elimina registro do aplicativo e publicação/verificação exigidas pelo Google.

Agendas pessoais ou compartilhadas, responsáveis, conflitos, agendamento e confirmação na conversa, lembretes configurados explicitamente. Integração atual publica eventos/consulta disponibilidade, não sincroniza toda a agenda externa em duas vias. Apple oferece arquivo ICS, não integração CalDAV/OAuth completa. Drive por usuário, leitura de arquivos/pastas e preparação de anexos com limite de 20 MB, sem dar acesso ao Drive de outra pessoa.

Relatórios incluem primeira resposta, tempos de atendimento/ciclo, volumes e resultados por equipe/agente, motivos; permissões administrativas. Confirmar com dados reais se os indicadores atendem a operação. Lembretes não devem disparar repetidamente ou por inbox pausada.

## 11. Incidente de implantação e prevenção

Houve erro 404 causado por processo Node que não subia: `ERR_MODULE_NOT_FOUND` em `src/inbox-routing.js`, importado por `src/core.js`. O arquivo existia localmente, mas não havia sido publicado. Commit corretivo **35c6d1e414ee297ac4a8886f7fd0d3a83ccdd4e8** adicionou o módulo e verificação de imports no teste/build Docker. Reconhecido como falha de entrega, não problema do usuário.

`npm test` e Dockerfile executam `scripts/check-imports.mjs`. Ao publicar via API, incluir TODOS os novos módulos, migrações, testes e assets. Validar árvore proposta, não apenas pasta local. Checar logs do novo contêiner antes de declarar produção recuperada. Manter `JWT_SECRET`, `PUBLIC_URL`, credenciais e volumes persistentes; trocar JWT_SECRET pode invalidar autorizações/segredos criptografados. Não resetar banco nem remover volumes para corrigir um build.

Implantação e backup estão no README, docker-compose e scripts. Revisar diferenças entre Docker Compose e Swarm antes de aplicar; não presumir que uma instalação Portainer existente foi validada. A sessão atual não teve acesso ao Dokploy nem prova de saúde externa após cada commit.

## 12. Validação executada nesta etapa

1. `npm test`: imports e contratos puros/simulados, documento/telefone, fallback bot/IA, apresentação financeira, encerramento, avatars/cache, templates, fuso, reconexão, drivers e assinatura/isolamento.
2. `test/service-crm-postgres.mjs`: todas as migrações em PostgreSQL/WASM, RLS, governança, assumir/convidar/atribuir, CRM, encerramento/reabertura/inatividade, auditoria, confirmação externa simulada; acrescentado fechamento automático auditado e bloqueio após intervenção humana; ordem de painéis decrescente.
3. `test/financial-reminders-postgres.mjs`: financeiro, idempotência e lembretes com provedores simulados.
4. `test/attendance-browser.mjs`: Chromium desktop/celular com APIs simuladas, fila/filtro, ausência de F5, rascunho/foco/compositor, inboxes, etiquetas do contato no card, origem colorida, avatar de fixture e coluna receptora no arraste.
5. Entrada real `src/server.js` iniciada localmente com pool de banco adaptado para PostgreSQL/WASM: `/` e `/platform.html` retornaram 200. Isso valida carregamento e migrações locais, não o contêiner de produção nem login real.

Para repetir, instalar ferramentas de teste fora das dependências de produção e informar os caminhos:

```sh
npm test
PGLITE_MODULE=/caminho/pglite/dist/index.js PGLITE_VECTOR_MODULE=/caminho/pglite-pgvector/dist/index.js node test/service-crm-postgres.mjs
PGLITE_MODULE=/caminho/pglite/dist/index.js PGLITE_VECTOR_MODULE=/caminho/pglite-pgvector/dist/index.js node test/financial-reminders-postgres.mjs
PLAYWRIGHT_MODULE=/caminho/playwright/index.mjs CHROMIUM_EXECUTABLE=/caminho/chromium node test/attendance-browser.mjs
```

Capturas e runtimes em `/tmp` são transitórios. O código/testes/documentação publicados no repositório são a referência durável. Nunca substituir a homologação com redes reais por mocks e chamar de integração aprovada.

## 13. Próximas validações e pendências

- Confirmar build/saúde do deploy e migração 017; testar usuário real, não apenas página estática.
- Master: confirmar inbox Instagram da empresa, webhook ativo e última entrada; enviar uma DM externa, responder e conferir entrega. Repetir WhatsApp. Usuário relatou sucesso Asaas em ambos, mas precisa homologar novo fluxo Bot → IA e seu modo/configuração.
- Configurar fallback nos blocos do bot já instalado, IA elegível e STT para áudio; escolher o bot/IA na inbox. Testar 1/2/3 sem resposta duplicada, texto fora das opções, áudio, assumir humano durante processamento e encerramento.
- Testar foto real por provider; investigar payload/escopos quando Zernio não entregar imagem. Não obter fotos raspando perfis privados.
- Asaas Sandbox: CPF válido de titular confirmado, nome completo e documento mascarado, vários débitos/vencidos, descrição/valores, quatro meios com fatura, pagamento confirmado por webhook e erro de chave/ambiente. Instagram autônomo precisa de identidade verificável/OTP antes de divulgar débitos.
- Homologar vínculos de inbox/painel e criação automática com RLS, etiquetas e avisos de não lidas.
- Checar OAuth Google real, callbacks, renovação, agendas e Drive com contas de empresas diferentes.
- Depois avançar inteligência/rastreamento de leads, bot e IA. Campanhas/ERP/e-commerce/Meta Ads/setores verticais completos não devem ser considerados prontos por haver menus ou estruturas iniciais.
- Limitações adicionais: presença online precisa, sincronização externa de agenda em duas vias, Apple nativo, app personalizado nativo, sticker/GIF completo e bancos físicos por empresa continuam fora do que foi comprovado.

## 14. Fontes consultadas para a implementação atual

- https://docs.zernio.com/webhooks/inbox
- https://docs.zernio.com/messages/get-inbox-conversation
- https://waha.devlike.pro/docs/how-to/contacts/
- https://developers.facebook.com/documentation/business-messaging/instagram-messaging/features/user-profile
- https://developers.facebook.com/documentation/business-messaging/messenger-platform/identity/user-profile
- API `profilePictureUrl` conferida também no pacote Baileys instalado.

## 15. Prompt curto de retomada

> Trabalhe em franceliopro/Nexora, nunca Nexora2. Leia este documento e o código atual. Priorize atendimento/CRM e homologação real antes de ampliar módulos. O dono autoriza commits incrementais em main com autodeploy; preserve alterações concorrentes. Não exponha o provedor social central aos clientes. Atribuir e convidar são ações diferentes; humano pausa bot/IA. CPF não é telefone nem comprovação de identidade. Não repita segredos do chat. Inspecione HEAD e todos os imports/migrações antes de publicar. Informe com precisão o que passou em teste simulado e o que foi validado ao vivo. Não apague banco, histórico ou sessões para contornar problemas. Continue a partir das pendências, sem reconstruir a aplicação do zero.

## 16. Atualização posterior: mobile, Novo Lead e Workflows

O usuário testou no celular e aprovou a base, pedindo microfone visível, mais aparência de aplicativo, etiquetas automáticas e organização dos fluxos. Entrega posterior ao commit `b2f343b`:

- Microfone saiu da barra secundária para um botão próprio junto à mensagem. Controles maiores, texto legível, textarea de 16px no celular para evitar zoom automático e espaçamento com safe area.
- Áudio agora passa por gravar → parar → ouvir → enviar/cancelar. Relógio, erro de permissão e preservação da prévia na falha de envio. Não envia automaticamente ao parar. Captura respeita o MIME suportado e o informado pelo MediaRecorder, incluindo MP4 em vez de forçar WebM. O servidor existente usa ffmpeg para normalizar áudio. Teste de navegador usou captura simulada MP4; não foi homologado em iPhone/Android físicos.
- Migração 018: trigger de contato aplica a etiqueta “Novo Lead” automaticamente, reaproveitando a etiqueta da empresa. Contatos antigos não são marcados em massa. Não retagear simplesmente porque um atendimento antigo foi reaberto. A regra cobre inbox, importação e API de criação de contato.
- Navegação consolida Chatbots, Sequências e Agendadas em **Workflows**, com abas Conversação, Follow-up, Agendadas e Redes sociais. A organização conceitual dos onze pontos permanece; os hashes antigos continuam acessíveis. Não confundir a consolidação visual com a existência de um único motor de grafos: conversação/cobrança usa bot; cadência usa flows/jobs.
- Follow-up tem editor guiado de blocos de espera, mensagem, instrução à IA, etapa de atendimento e atribuição. Sem JSON obrigatório. Esperas suportam segundos, minutos, horas e dias; `wait{minutes}` antigo continua compatível. Etapa aqui é a etapa legada do atendimento, não um gatilho de etapa de `crm_stages`.
- Migração 019: jobs têm lease e epoch. Scheduler separado verifica execuções aproximadamente a cada segundo; não garante tempo real, e filas lentas podem atrasar. Cursor é persistido antes de efeitos externos para não repetir envio ambíguo. Lease de dois minutos reduz execução concorrente. Resposta do cliente, conversa fechada ou controle humano cancela/interrompe a cadência. Não prometer entrega exatamente uma vez em falhas de rede/processo.
- Integrações → Bot, IA e CRM agora permite selecionar também as sequências ativas aplicáveis à inbox. Configurações não são retroativas para atendimentos existentes.
- Paleta de bot agrupada por Conversação, Cobrança e pedidos, Regras e conclusão, Integrações; contém atalho à área de follow-up. Não há bloco de espera persistida dentro de `bot_runs` nesta entrega.
- **Agendadas pontuais permanece em preparação**; agenda e lembretes existentes são recursos distintos e seguem disponíveis.
- **Gatilhos públicos de redes sociais permanecem em preparação**, explicitamente indicados na aba. Não foram implementados blocos executáveis de comentário/hashtag/Stories/like/dislike. APIs não oferecem ações universais; comentários e Stories exigem assinaturas/permissões e filtros de conta próprios. Não ativar assinaturas de webhook indiscriminadamente nem simular disponibilidade de ações inexistentes.
- PWA instalável não foi entregue. O microfone deve funcionar no navegador seguro sem PWA; instalação nativa/PWA é etapa independente e não pré-requisito para o áudio.

Validação adicional: `test/workflows-postgres.mjs` em PostgreSQL/WASM verifica etiqueta sem duplicidade, isolamento, unidades de tempo, retomada, cancelamento, duas execuções concorrentes e pausa humana. Teste de interface inclui botão de áudio em viewport 390px, escolha MP4 simulada, prévia, descartar, enviar e negar permissão. Entrada do servidor/migrações também é validada localmente. Próximos testes reais: gravar no Android/iPhone com permissão de microfone, confirmar conversão ffmpeg e ouvir a mensagem entregue no WhatsApp/Instagram. Documento acompanha o mesmo repositório, sem segredos.

Fontes adicionais: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static ; https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia ; https://docs.zernio.com/platforms/ .

Teste adicional de codec: áudio AAC/MP4 sintético convertido com os mesmos parâmetros do servidor; ffprobe confirmou Opus, 48 kHz, mono. Isso não comprova entrega em rede real. Gravações têm limite de cinco minutos.

## 17. Acabamento de etiquetas e Kanban

Referência visual enviada em 20/10: colunas contínuas com cabeçalho discreto, ponto colorido, contador circular e rodapé com subtotal alinhado. Mantida a estrutura Néxora, com fotos, etiquetas, ações e integração à conversa. Etiquetas `.nx-tag` passam a compartilhar o acabamento das etiquetas do atendimento: borda suave, fundo leve, texto legível e ponto da própria cor. Cards também têm um ponto da etapa e avatar circular. Hover/foco da borda e do título e destaque da coluna receptora usam `--stage`, não a cor global da marca. A área de cards rola dentro da coluna; cabeçalho e rodapé permanecem no conjunto. Validar em desktop/celular e claro/escuro, sem alterações de banco ou das regras do CRM.


## 18. Editor compartilhado de automações e ajustes do CRM (20/10)

- Leads era uma página informativa, sem captura ou rastreamento próprio: saiu do menu. A rota antiga redireciona para Contatos. A etiqueta Novo Lead e a etapa dos painéis permanecem; não houve exclusão de dados.
- Workflows agrupa Chatbots, Follow-up e Agendadas. Chatbot conduz a conversa; follow-up executa ações ao longo do tempo. Compartilham o novo `web/flow-editor.js`: blocos compactos, inspector lateral, conexões, arraste de blocos, arraste do cenário pelo botão esquerdo/central, zoom pela roda e botões, minimapa, organização e desfazer/refazer do grafo.
- Follow-ups antigos continuam no motor linear. Ao abrir e salvar no editor, seus passos são convertidos em grafo. Novos grafos começam em rascunho. Os vínculos da inbox continuam limitando a execução.
- Migração 020 adiciona grafo, cursor, variáveis, limite de passos, snapshot por execução e política de resposta aos jobs. Resposta pode cancelar ou continuar pelas saídas respondeu/não respondeu. Assumir por humano sempre interrompe: não reativar automaticamente.
- Blocos de follow-up: mensagem, espera em segundos/minutos/horas/dias, aguardar resposta com timeout, verificar resposta, condição, variável, ciclo limitado, etiqueta, nota privada, nome/email do contato, etapa do atendimento, atribuição humana e resposta da IA configurada na conversa.
- Bots recebem blocos etiqueta, nota, atualização de contato e ciclo limitado; gatilho de palavra-chave/hashtag em mensagens permite qualquer/todas e intervalo por contato. Opções numeradas existentes continuam funcionando.
- Ciclos entre 1 e 20 repetições; validação rejeita laço sem espera/pergunta/ciclo. Workflow encerra após 500 passos totais, e o bot interrompe após 200 passos em uma chamada com nota interna. Não usar ciclos para mensagens repetitivas sem intervalo.
- Cursor é salvo antes de ações externas para evitar reenvio cego depois de falha. Isso favorece ausência de duplicação; não promete entrega exatamente uma vez. Verificar provedor e histórico se houver falha ambígua.
- Comentários públicos, Stories, likes e demais gatilhos sociais ainda NÃO iniciam esse motor. A interface informa essa limitação. Menus numerados não são botões nativos universais. Nenhum teste fez envio a provedores reais.
- Migração 021 permite painel `support`. Formulário oferece Suporte técnico com Novo chamado → Triagem → Em diagnóstico → Aguardando cliente → Em resolução → Conclusão. Aplicar modelo pede confirmação e só altera etapas ainda não salvas; painéis existentes preservam seu fluxo.
- “Chave” renomeada para “Prefixo dos cards”, com explicação e exemplo SUP-123; não é credencial. Etiquetas padrão no formulário usam as cores/ícones do produto.
- Janela do card com fechar circular e resultados ganho/perda arredondados. Histórico e seleção de etiquetas têm rolagem interna; ações Salvar/Cancelar permanecem no rodapé. Configurações também limitam listas longas.
- Verificação: npm test (inclui motor puro de grafos); PostgreSQL/WASM com todas as migrações, snapshot, retomada, ramo de resposta e bloqueio de mutação após humano assumir; teste Chromium com APIs simuladas para arraste/zoom, edição/salvamento de grafo, suporte, cores e histórico longo. Validar integrações reais separadamente.


## 19. Espaço do editor e assinatura
- Workflows agora tem título, Conversação e Follow-up na mesma linha; removidas as abas informativas Redes sociais e Agendadas. As rotas antigas abrem Conversação. Agenda e lembretes do atendimento não mudaram.
- Cabeçalho, barra de ferramentas e localização compactados para liberar altura do cenário, com adaptação ao celular.
- Assinatura néxora SUITE by EFFE alinhada pela linha de base; ícone alinhado à base do grupo.
- Início explica gatilhos e canais. Mensagens/palavras-chave funcionam nos canais conectados. Reações, comentários e outros eventos públicos ainda dependem de implementação específica; esta alteração não os ativa.


## 20. Atendimento, menções e conhecimento dos agentes
- Respostas rápidas usam ícone próprio de raio; chat interno mantém nota. Editor inclui emojis e variáveis nome, primeiro_nome, atendente, empresa, protocolo e saudacao; substituição ocorre ao inserir como rascunho para revisão antes de envio.
- Chat interno inline sugere agentes humanos ativos e equipes com @. Seleção gera destinatários estruturados. Menções não concedem acesso: convidar pessoa/equipe antes se faltar permissão. Todos com acesso continuam podendo ler as notas internas. Tabela internal_mentions persiste destinatários e leitura; indicador @ no rodapé mostra pendências do usuário, atualizado a cada 15s.
- Logo do rodapé centralizado verticalmente; textos continuam na mesma linha de base.
- Ações da IA: habilitar/desabilitar predefinidas, criar/excluir ações de mensagem própria com instrução de uso. Não executam código nem geram integrações arbitrárias. Novas predefinidas labels, show_menu, show_products consultam etiquetas/cardápio/catálogo da empresa; somente ferramentas autorizadas executam.
- Base aceita vários arquivos e URLs, sem limite fixo de quantidade na interface. Limites por base: 10 MB e 1 milhão de caracteres; PDF escaneado sem texto requer OCR prévio. Tipos PDF, DOC, DOCX, TXT, MD, CSV, JSON, HTML e RTF. Importações sequenciais com confirmação/erro; falhas preservam pendentes e agente já criado para retentativa sem duplicar cadastro. Bases persistidas podem ser excluídas com seus trechos.
- Migração 022 adiciona custom_actions, knowledge_sources, docs.source_id e internal_mentions, com RLS e referências isoladas por empresa. Docker instala poppler-utils, antiword, unzip e unrtf para extração. Rebuild da imagem é necessário, feito pelo deploy normal; não exige credenciais no Dokploy.
- Busca de URLs usa DNS validado e endereço fixado por conexão, bloqueio de IPs privados e validação em cada redirecionamento, limite de tamanho/tempo. Não executa JavaScript da página.
- RAG mantém fallback textual sem embeddings. Chunking agora também preserva documentos longos sem quebras de linha. OCR, transcrição de vídeos e crawl automático do site não estão implementados.
- Testes: npm test; migrações e governança PostgreSQL/WASM, importação/exclusão com extrator de persistência simulado, RLS, menções sem acesso bloqueadas e leitura por destinatário; extração real PDF/DOCX com ferramentas locais; navegador com APIs simuladas para múltiplos arquivos/URLs, ações, menções, emojis e variáveis. Sem envio real a clientes/provedores.


## 21. Provedores de texto dos agentes
- Seleção explícita de OpenAI (GPT), Google Gemini, Anthropic (Claude) e API compatível com OpenAI. Credenciais e modelos permanecem por agente/empresa; fallback entre modelos preservado.
- Gemini usa endpoint oficial de compatibilidade OpenAI (`generativelanguage.googleapis.com/v1beta/openai/chat/completions`), com chave da Gemini API. URL padrão preenchida pelo servidor; nome do modelo informado conforme disponibilidade da conta, sem hardcode de modelos.
- Painel orienta geração de chave e separação entre assinatura de chat e cobrança/cotas de API. Não há login por assinatura do ChatGPT ou Gemini, importação de sessão/cookies ou reaproveitamento de cota do aplicativo. Créditos elegíveis Google dependem da conta/faturamento do provedor.
- STT/TTS continuam com provedores OpenAI/compatíveis; a nova opção Gemini é para texto. Modelos compatíveis precisam oferecer chat/completions.
- Referências oficiais consultadas: https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform ; https://ai.google.dev/gemini-api/docs/google-ai-plans ; https://ai.google.dev/gemini-api/docs/openai .


## 22. Mobile compacto, OpenRouter e reconexão silenciosa
- Mudanças de layout restritas a max-width:700px. Desktop preservado. Navegação mobile em faixa única de 52px com ícones e rolagem; cabeçalho de atendimento compacto, etiquetas em linha rolável, ações menores. Composer em uma linha com +, texto, microfone e envio; + abre grade de ferramentas sobre a conversa. Rodapé mobile de 29px.
- OpenRouter disponível em LLM, STT e TTS. Base automática https://openrouter.ai/api/v1. Modelo inicial sugerido qwen/qwen3.5-flash-02-23; STT openai/gpt-4o-transcribe; TTS x-ai/grok-voice-tts-1.0, voz eve. Uma chave OpenRouter em cada configuração. xAI/Grok direto disponível para LLM; STT/TTS xAI direto têm contrato distinto e não foram habilitados como OpenAI genérico.
- Catálogo público consultado em 20/10: o exemplo antigo OpenAI TTS da documentação não apareceu no catálogo speech atual; por isso a sugestão usa Grok TTS listado no catálogo e sua voz válida. Modelos são configuráveis e disponibilidade pode mudar. Nenhuma chamada paga realizada.
- OpenRouter STT usa multipart compatível; TTS usa MP3 (endpoint não aceita Opus). Arquivo salva extensão correta. OpenAI direto mantém Opus. Testes contratuais simulados para as três modalidades.
- Aviso flutuante repetitivo de reconexão removido. Estado de sincronização fica consultável ao abrir Inboxes. Reconexão segue silenciosa, com espera crescente que só reinicia após 30 segundos estáveis; reconciliação da tela só ocorre após 3s de conexão estável, evitando pulsos em conexões que abrem e caem imediatamente. Recebimento de mensagens continua em tempo real; isso não é reload da aplicação.
- Verificação: npm test, testes de flapping sem reload e Chromium desktop/mobile com medidas nav<=54px, cabeçalho<=150px e composer<=80px; microfone e ferramentas acessíveis. Não validado com chaves reais nem inspeção do proxy da produção.


## 23. Bot primeiro, limiar de texto livre e triagem PF/PJ
- Bloco choice aceita número válido ou texto exato normalizado da opção; remove correspondência parcial ambígua. Texto inválido com até 3 caracteres (inclusive 3) repete a pergunta e TODAS as opções. Não transfere por quantidade de erros. Mensagens maiores que 3 caracteres e áudio só acionam IA quando aiFallback=on.
- Antes do fallback, valida IA ativa com modelo LLM/chave; áudio também exige STT configurado. Sem configuração disponível, permanece no menu e registra uma nota privada uma vez por execução. Prioriza IA da conversa/inbox e depois IA habilitada no canal. Nova conversa em modo automático já executa bot antes da IA; modo IA explicitamente escolhido pelo humano continua sendo respeitado.
- Primeira mensagem de áudio também pode iniciar bot de entrada (primeira mensagem), apresentando as opções. Campos de documento, pagamento e pedidos continuam determinísticos, sem limiar genérico de texto.
- Template com opções numeradas para setor, plataforma, tipo de pessoa e financeiro. Comercial PF informa +5566999776407; PJ +5566996968893; Administrativo +5566999776407. Envia número e link wa.me e mantém encaminhamento à equipe interna configurada. Não envia mensagem a esses números, não transfere a sessão entre WhatsApps e não deduz usuário interno pelo telefone. A IA recebe a mesma instrução e exige person_type pf/pj no tracking_triage comercial.
- Menus nativos de botões ainda não implementados; números e texto exato têm comportamento consistente entre conectores. Não confundir menus renderizados no editor com botões entregues pela API.
- Migração 023 atualiza templates instalados reconhecidos (setor e comercial transfer), preservando nós próprios, credenciais, ativação, canais e execuções. Guarda grafo/prompt anteriores em settings template:rastreamento_veicular:before-v2; se estrutura tiver sido substituída por completo, preserva e não tenta reconstruir. Novos templates já usam a nova estrutura.
- Gestão: Integrações → inbox → Bot, IA e CRM: selecionar Bot de entrada e IA para texto livre/áudio. Em conversa já iniciada: Escolher humano, IA ou bot → Chatbot, selecionar bot e agente de apoio. Humano assumir continua pausando tudo; não reativar sem decisão explícita.
- PWA Android/iOS e desenho de novas telas mobile adiados conforme orientação; nenhuma mudança de domínio nesta etapa.
- Verificações: npm test cobre limites 1/2/3/4 caracteres, texto exato, áudio, falta de LLM/STT, repetição após múltiplos erros, saudações/financeiro e PF/PJ/Admin. PostgreSQL/WASM verifica upgrade com backup idempotente e preservação de personalizações e credenciais. Sem atendimento real enviado.

## 24. Carregamento de templates e novo bot
- Corrigido `ask()` genérico: `dialog.append` recebia um array de campos como texto, em vez de elementos. Agora espalha os campos e associa labels/IDs. Isso impedia usar corretamente o formulário Novo bot.
- Novo bot inclui Rastreamento Veicular · 3 plataformas na seleção de modelos e cria uma cópia independente em rascunho com grafo atual (inclui PF/PJ). Reutiliza agente e equipes do template da empresa, sem sobrescrever o bot instalado, canais ou credenciais. Primeira criação instala o template e usa o bot resultante; chamadas seguintes geram novos bots. Transação + trava do template evitam corrida de instalação.
- API POST /templates/:id/bots para criar cópia; POST /templates/:id/apply agora inclui objeto bot no retorno. Ambas restritas a administradores e ao tenant.
- Usar template renderiza lista como elementos, mostra carregamento/erros e abre diretamente o editor do bot instalado na área Workflows. Reaplicar não duplica agente nem equipes. Se o bot original foi excluído, orienta criar nova cópia em vez de falhar silenciosamente.
- Testes: npm test; PostgreSQL/WASM para cópias distintas com agente reutilizado; Chromium com APIs simuladas exercitando Novo bot → Rastreamento → editor e Usar template → fluxo instalado.


## 25. Entrada do bot e indicadores de processamento
- Bot com gatilho first pode iniciar em ticket automático ainda aberto sem nenhuma execução anterior de bot. Antes, dependia de fresh (ticket recém-criado), deixando tickets anteriores à ativação sem bot. Não reinicia bot já concluído ou pausado; modo humano/IA explícito permanece respeitado.
- Seleção explícita Bot de entrada da inbox prevalece sobre a lista genérica channel_ids do bot. Inbox configurada com Sem bot continua sem bot. Bot deve estar ativo; novos templates permanecem rascunhos até ativação pelo administrador.
- Tela Bot, IA e CRM informa bot ativo, rascunho ou ausência de seleção. Não há acesso ao banco de produção nesta verificação; validar o vínculo do canal real e eventual atendimento já assumido pelo humano.
- Baileys e WAHA implementam presence typing/recording/paused. IA mostra digitando durante processamento e gravando enquanto sintetiza TTS; bot mostra digitando durante execução. Sem atrasos artificiais. Falhas de presença não impedem resposta e estado é limpo no finally ou ao detectar mudança de epoch/pausa humana. Canais sem suporte seguem sem indicador. Não há promessa de fazer cliente acreditar que é atendido por pessoa.
- Botões do bot: evolução planejada com representação comum de opções, IDs estáveis de resposta e adaptação por capacidade do canal; usar reply buttons/listas/quick replies oficiais conforme canal e limite, mantendo menu numerado de fallback. Esta etapa não envia botões nativos ainda. A escolha deve virar a mesma opção determinística, sem passar para IA ao receber clique válido.
- Testes: npm test com seleção por inbox, primeira entrada, presença typing→recording→paused, canal sem suporte e pausa humana simulados. Sem conexão real aos provedores e sem atendimento externo de teste.

- Protocolo: bot e IA passam a conferir o envio do protocolo antes de responder, inclusive tickets antigos not_requested quando a automação foi autorizada. Mantém a reserva de envio única; sent não repete, check_required não é reenviado às cegas. Variável {{protocolo}} disponível no bot e número no contexto da IA, sem geração paralela de IDs.

## 26. Presets econômicos de IA e botões de escolha

- Ao criar/adicionar modelo e trocar provedor, o formulário preenche modelo, endereço e voz; todos editáveis. Abrir configurações preserva valores existentes. Trocar provedor limpa a chave para evitar envio de segredo ao provedor errado.
- Texto: OpenRouter/Qwen, Groq GPT-OSS 20B, xAI Grok 4.3 sem raciocínio, OpenAI GPT-4.1 mini, Gemini 2.5 Flash Lite, Qwen Flash direto, Claude Haiku 4.5 e compatível. ChatGPT/Gemini do consumidor não equivalem a créditos de API.
- Transcrição: Groq Whisper Large V3 Turbo; OpenAI/OpenRouter GPT-4o mini transcribe. Sem LLM de raciocínio para transcrever. Voz: OpenRouter Grok Voice/eve; OpenAI mini TTS/alloy; ElevenLabs Flash v2.5; Microsoft Azure Speech/Francisca. Azure exige endereço da região do recurso; ElevenLabs permite alterar ID da voz conforme acesso da conta.
- Adapters reais Groq/Qwen compatíveis, ElevenLabs TTS e Azure SSML escapado. Sugestões não garantem disponibilidade/cota nem falha zero. Configurações instaladas não são sobrescritas no banco.
- Instruções iniciais de agentes em português; regra global pede ortografia/concordância corretas sem modificar documentos/nomes/URLs por suposição.
- Escolhas do bot enviam opções estruturadas ao driver, mantendo texto numerado no histórico. Meta oficial WhatsApp: até 3 botões curtos ou lista até 10 opções; Instagram/Messenger: quick replies com limites. Inboxes gerenciadas via Zernio: até 3 botões postback, título até 20 caracteres, texto até 640. Menus maiores nessa integração usam números. Baileys/WAHA preservam números. Não há tentativa automática de reenvio após erro ambíguo.
- Respostas interativas nx:N viram número para o motor determinístico. IDs não conferem permissões; valem como resposta numérica na etapa corrente. Webhooks continuam assinados e isolados por conta. Pausa humana/epoch preservados.
- Fontes consultadas: docs.zernio.com/messages/send-inbox-message.mdx; docs.x.ai/developers/migration/may-15-retirement; console.groq.com/docs/speech-to-text; ai.google.dev/gemini-api/docs/models; elevenlabs.io/docs; learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech.
- Validação local: npm test, contratos simulados de adapters/botões/retorno/fallback e navegador Chromium desktop/mobile. Teste real de APIs, botões e cobrança pendente após deploy, com credenciais do cliente. Nenhum envio real efetuado nesta alteração.

## 27. Escolhas pela IA e confirmação ao cliente

- Pesquisa detalhada e procedimento: `docs/BOTOES-PIX-E-CONFIRMACAO-PAGAMENTOS.md`. Postman consultado e comparado com documentação atual: WAHA sendButtons está depreciado; Baileys não recebeu fork/alteração experimental. Nenhuma promessa de botão Pix universal.
- `src/ai/choices.js` valida opções geradas pela IA e monta histórico numerado + escolhas estruturadas para drivers existentes. Em escolha, prioriza texto clicável; perguntas abertas continuam com voz. IA usa histórico para números; não é ramificação determinística de bot.
- Pix/linha digitável do atendimento humano agora são enviados como conteúdo isolado, com orientação anterior e fatura posterior.
- Migração `024_payment_notifications.sql` adiciona fila de confirmação nos pagamentos existentes sem reativar pagamentos antigos. `settlePayment` agenda na mesma transação da baixa; webhook continua autenticado/isolado por tenant e ambiente.
- `src/payment-notifications.js` envia a cada 30s via scheduler: CAS pending→sending antes do efeito, sent após gravação, blocked para canal/filing, check_required para erro ambíguo ou interrupção >5min. Mensagem transacional não retoma automação nem reabre atendimento. Valores/protocolo não são inventados por IA.
- Consultas Asaas de bot/IA registram vínculo dos débitos à conversa; vínculos existentes são preservados; vínculos nulos podem ser preenchidos somente se o contato coincide. Cobranças externas desconhecidas não geram mensagens por adivinhação.
- `/api/financial/notifications` e `/:id/retry` administrativos; tela em Pagamentos e Integrações com estados, orientações de webhook e reenvio explícito auditado após conferir não recebimento.
- Testes: unitários/contratos, PGlite com migrações/RLS, evento duplicado, Stripe unpaid, ambiente incorreto, envio uma vez, inbox pausada, falha ambígua sem replay; teste navegador desktop/mobile. Sem teste real de canais/chaves nesta entrega.

## 28. Administração visível, prioridade e entrada sem duplicidade

- Link **Administração** no topo e no menu do avatar: `#governance`. Gerência global de empresas permanece no avatar → Gerenciar empresas (`/platform.html`, autenticação da plataforma).
- Governança agora se chama Administração · pessoas e equipes. Equipe/setor usa um único conceito. Perfil exibido como Agente de atendimento ou Agente com acesso restrito; papéis técnicos existentes preservados. Criar/editar usuário permite marcar suas equipes; criar/editar equipe permite selecionar membros e prioridade (1 primeiro, 2 segundo, 0 sem preferência).
- Nova distribuição `priority`; exige pelo menos 1 minuto de transbordo. Ordem por prioridade, depois rotação; carteira não sobrepõe prioridade explícita. Assumir ou responder encerra a oferta automática; todos elegíveis tentados gera um aviso configurável e fica na fila sem repetir. Modal Distribuição acessível na Administração e em Integrações. Scheduler a cada 30s, logo há tolerância de até um ciclo no prazo. Agente ativo não equivale a presença online.
- Migração `025_service_entry_priority.sql`: prioridade de membros, estado de indisponibilidade e estado de identificação na conversa.
- Processamento de inbound serializado por conversa com advisory lock de sessão em pool dedicado de até 4 conexões (`withConversationLock`), evitando esgotar o pool de consultas durante chamadas externas. IA aguardada dentro desse processamento. Persistência de mensagens mantém lock próprio e deduplicação por ext_id.
- Bot ignora como resposta mensagens cujo horário de chegada preceda o último menu concluído; não libera para IA em erro. Primeiro gatilho inicia o grafo, não vira resposta livre para IA. Após ticket fechado cria outro ticket em auto, sem responsável/convidados/estado antigo; cooldown anterior não bloqueia entrada fresca. Histórico e CRM preservados.
- Pré-atendimento de bot/IA confirma nome detectado ou pergunta nome preferido, salva `contacts.data.preferred_name` separado do nome legal e usa em contexto da IA e variáveis do bot. Identificação aguarda resposta por texto; áudio nesse passo pede nome por texto. Respostas recebidas antes da pergunta são ignoradas pela automação, permanecendo no histórico. Perguntas respeitam epoch/pausa humana.
- Cadastros Asaas previamente vinculados por consulta com verificação de telefone são revalidados pela API a cada nova entrada. Mostra nome completo, documento/e-mail mascarados e opções Sim, é este mesmo / Outro cadastro. Selecionar outro não autoriza acesso ao cadastro anterior. Listagem oficial Asaas não documenta filtro de telefone; não foi inventado parâmetro nem feita varredura completa de todos os clientes. Um telefone novo sem vínculo segue fluxo normal. A confirmação é conveniência, não autenticação para expor débitos; regras de CPF/telefone continuam em vigor.
- Opções com números keycap (1️⃣, 2️⃣); entrada aceita número comum ou emoji, inclusive nas escolhas do bot/financeiro. IA continua interpretando contexto; bot mantém ramificação determinística.
- Testes: suíte unitária/contratos, identificação (nome/outro cadastro/rajada), PGlite prioridade 1→2→indisponível e sem repetição, RLS, testes anteriores de pagamentos; Chromium para navegação e edição de prioridade. Aceite real e corrida entre réplicas ainda precisam ser observados em produção.

## 29. Identidade do usuário, imagens e controles globais

- Migração `026_user_identity.sql`: conhecido por, foto, assinatura em texto/imagem e identificador de apresentação por ticket.
- Administração → criar/configurar usuário: Nome legal e Conhecido por separados; equipes escolhidas perto do início; integrantes aparecem como etiquetas nas equipes da coluna direita. Vínculos continuam editáveis pelos dois caminhos.
- Foto e assinatura ficam em seção recolhível. Arquivo local, Drive pessoal conectado e câmera via getUserMedia (HTTPS/permissão). Câmera é encerrada ao capturar, fechar ou cancelar; sem permissão oferece arquivo local. PNG/JPEG/WebP até 8 MB na entrada; foto recortada 256², assinatura com proporção preservada em 560×192 (prévia até 280×96), limite persistido 400k caracteres por imagem. Sem SVG ou URL arbitrária nos campos persistidos.
- Endpoint `/api/google/drive/profile-image` administrativo, credencial OAuth do usuário atual, verifica formato/tamanho/download permitido e limita streaming. Não envia imagem ao cliente ao escolher arquivo. Câmera e autorização real do Google ainda precisam de aceite no dispositivo.
- Assumir envia apresentação do agente com Conhecido por e equipe do atendimento, além de assinatura configurada; imagem só nos drivers com envio de imagem disponível. Mesma pessoa repetir Assumir não duplica apresentação. Outra pessoa assumir atualiza apresentação e mensagens seguintes. No WhatsApp externo não há alteração do cabeçalho nativo do aplicativo: identificação vai no conteúdo/caption.
- Envio manual pelo composer adiciona identificação e assinatura textual. Notas internas não recebem prefixo. Cobranças/Pix/linhas digitáveis enviados pelas ferramentas financeiras preservam conteúdo puro para cópia. Identificação do responsável na lista/detalhe usa conhecido por quando disponível; avatar próprio usa foto.
- `ui-controls.js` comum à plataforma/tenant adiciona mostrar/ocultar a todos os campos password presentes e futuros (inclui tokens), sem persistir estado de revelação. Fecha menus e dialogs por clique fora; alterações em formulários geram confirmação de descarte. Popovers nativos preservam seu comportamento. Drawer flutuante também fecha por clique fora; painel fixo do contato permanece como configurado.
- Testes: contratos de identificação/validação, cadastro real via API em PGlite e vínculos refletidos em Governança, migrações/RLS e fluxos anteriores; Chromium mostra/oculta senha, fecha fora e redimensiona fotos/assinatura. Sem envio real a redes nesta alteração.

## 30. Rascunho de IA em qualquer aba

- Todas as cinco abas do agente têm Salvar rascunho desta aba. Salva todos os campos preenchidos, preserva a janela aberta e permite continuar depois; não depende de chave, modelo ou canal já configurados. Nome vazio recebe Novo agente de IA.
- Rascunho mantém o agente desativado (inclusive se antes estava ativo), com aviso explícito na tela. Para voltar ao atendimento é necessário escolher Ativo e salvar com requisitos completos. Rascunhos na lista mostram as pendências obrigatórias ou Pronto para ativar.
- `src/ai/setup.js` também impede ativação incompleta no servidor, na criação e atualização. Nome, canal e todos os modelos de texto cadastrados com chave/modelo são obrigatórios para ativar. STT/TTS continuam opcionais.
- Cada salvamento reaproveita o mesmo ID, sem duplicar agente. Documentos/URLs são importados pela fila existente, que remove somente itens confirmados; se a base falhar após salvar configuração, informa Dados do agente salvos / Base pendente e mantém os itens restantes para tentar depois.
- Trocar agente humano continua usando nome conhecido e equipe atuais: apresentação na assunção e prefixo nas próximas mensagens manuais; não altera mensagens históricas nem cabeçalho nativo dos aplicativos externos.
- Testes: criação parcial sem chave/canal, manutenção do diálogo e reaproveitamento via PUT no navegador, validação de ativação incompleta e suíte anterior. Deploy e envio real continuam sujeitos a teste com as contas conectadas.

## 31. Organização do cadastro de usuários

- Foto e assinatura imediatamente depois de Perfil.
- Equipes/setores do usuário, Equipes em Outros e Canais permitidos em três molduras lado a lado no PC, com legendas e explicações independentes. No celular, uma moldura por linha. Listas longas têm rolagem interna; vínculos e permissões preservados.
- Verificação de sintaxe e regressão no navegador desktop/mobile.

## 32. Editar e excluir usuários e setores

- Administração mostra Editar usuário / Editar setor e Excluir. E-mail do usuário também pode ser alterado, com validação e unicidade do banco.
- Confirmação por nome exato antes da exclusão. Exclusão operacional preserva registros históricos e autoria: usuário recebe deleted_at e active=false; setor recebe archived_at e sai dos seletores. Membros removidos; carteira do usuário liberada. Logs próprios em governance_events com RLS/ator/entidade/nome e data.
- Não permite excluir próprio usuário ou perfil dono. Usuários com atendimentos abertos precisam transferir/concluir antes. Setores com atendimento aberto, inbox ativa ou bot ativo apontando para eles precisam ajustar esses vínculos antes. A interface mostra a causa do bloqueio.
- Migração 027 também impede, no banco, novas atribuições a setores/usuários excluídos. Referências históricas permanecem válidas. Transferências humanas e de bot validam destino; distribuição e templates não selecionam setores excluídos. API genérica não faz exclusão física desses cadastros.
- Testes: exclusão administrativa real via API/PGlite, confirmação incorreta, perfil sem acesso, proteção de próprio dono, vínculo a inbox, autoria preservada, membros removidos e auditoria isolada por tenant; regressão de CRM/filas/navegador.

## 33. Espera inicial do bot e identificação mais discreta

- Workflow de conversação → bloco Início → Espera inicial do bot + Unidade. Padrão efetivo de 5 segundos inclusive para bots antigos sem configuração. Zero permite iniciar sem espera. Unidades segundos/minutos/horas/dias/meses, valores inteiros; meses seguem calendário UTC com ajuste para último dia válido, não 30 dias fixos. Limite de 10 anos (120 meses).
- Configuração em trigger.initialDelay; API valida valor/unidade. Migração 028 persiste prazo, bot, primeira mensagem e epoch na conversa. Contagem parte da chegada da primeira mensagem; outras mensagens não reiniciam prazo. Protocolo e identificação inicial do bot aguardam o prazo; eventos de interface/CRM continuam imediatos.
- Scheduler de 1s retoma pendências após reinício, usando o mesmo lock de conversa e CAS pending→started. A IA não atua enquanto o bot está aguardando. Confere canal, bot ativo, vínculos e epoch antes de executar. Depois do primeiro envio, não aplica nova espera a cada menu ou confirmação de nome.
- Trigger de banco cancela espera ao concluir, pausar, assumir ou mudar epoch/modo de controle. Acionamento humano explícito de bot/fluxo não usa a espera de primeira mensagem. Falha depois de iniciada não gera reenvio cego; check_required se o processamento lançar erro. Aceite real em réplicas/reinícios continua pendente.
- Nome do agente em negrito nas mensagens WhatsApp, com setor em texto normal: *Raiane* · Suporte Rastreabem. Formatação por canal; outras redes recebem texto simples. Tamanho de fonte dos aplicativos externos não é controlado pela Néxora.
- Testes de unidades/calendário/rajada/execução única, migrações e cancelamento por assunção em PGlite, campo padrão e salvamento de meses no navegador; suíte anterior preservada.
