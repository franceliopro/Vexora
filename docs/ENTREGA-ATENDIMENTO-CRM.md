# Atendimento e CRM — entrega e retomada

## Acesso rápido

- **Empresa:** `/platform.html` → Nova empresa → template de Rastreamento Veicular; depois cadastrar usuários e membros das equipes. O cliente real não foi cadastrado sem seus dados.
- **Governança:** menu da conta → Governança · usuários e equipes; também atalho Equipe no atendimento. Administrador, Atendente e Atendente restrito; dono técnico preservado como `owner`.
- **Relatórios de atendimento:** menu da conta ou atalho Relatórios no atendimento. Somente administradores/dono.
- **QR Code:** Integração e API → Conectar WhatsApp por QR Code → **Exibir QR Code · nome do canal**. No celular: WhatsApp → Configurações → Dispositivos conectados → Conectar dispositivo. A câmera do WhatsApp deve ler o QR mostrado no painel.
- **CRM:** criar um painel, selecionar equipes/gestores, etapas e inatividade. Cada card é uma oportunidade independente, vinculada ao contato e opcionalmente à conversa.
- **Fuso:** Personalização → Horário da empresa; para o cliente de rastreamento, selecionar `America/Cuiaba`.

## Atendimento implementado

Novos, Meus, Outros e Concluídos seguem escopos do banco. Outros depende de concessão por equipe e não dá participação automática: supervisão precisa de convite para responder, editar ficha ou cobrar. Regras de canal também são aplicadas. Usuário desativado deixa de autenticar; papel/permissões são relidos nas requisições.

Assumir define responsável e pausa automação. Atribuir muda responsável/fila/IA e revoga convites anteriores. Convidar pessoa ou equipe mantém o responsável. Convites podem ser removidos. Humano, IA, bot e híbrido são controles explícitos.

Concluir exige categoria e motivo, pausa robôs e cancela jobs do ciclo. Reabrir exige motivo e mantém auditoria. Nova entrada depois de concluído cria outro atendimento para o contato. Recepção é serializada por canal/identidade e IDs externos deduplicam entradas.

Nome do cliente abre ficha lateral: etiquetas, campos tipados, anotações, histórico e atendimentos acessíveis. Histórico não concede acesso a conversas de terceiros. Notas internas não saem para o cliente.

Composer oferece texto, áudio, imagens, vídeo e documentos. Upload permitido até 20 MB, sujeito aos limites do provedor. Arquivos passam por escopo de conversa/empresa e links assinados curtos; documentos são baixados como anexos. Isso não equivale a antivírus de documentos. Há paginação das mensagens anteriores a partir das 500 mais recentes.

Relatórios administrativos mostram volume, estado, responsável/equipe/canal, primeira resposta humana, tempo entre primeiro aceite e conclusão, motivo e eventos por ator/equipe. Datas do período usam o fuso da empresa. São métricas de tempo corrido; não há calendário de horas úteis ou cálculo de esforço ativo. Reaberturas manuais ficam nos eventos; os resumos de ciclos usam os campos atuais do atendimento.

## CRM implementado

- Painéis de Vendas/Gestão por equipes, com gestores específicos e visibilidade individual ou da equipe. Atendente restrito exige liberação do painel.
- Etapas com cor, ordem e opção Final; arrastar e soltar no desktop, alça de movimento por toque e alternativa pelo seletor de etapas no card.
- Cards com título, descrição, valor, responsável, vencimento, etiquetas, campos do painel, anotações e histórico. Atalhos CRM ↔ conversa e lista dos atendimentos acessíveis do contato.
- Kanban de abertos, Lista de abertos/ganhos/perdas/arquivados, Agenda por vencimento e Relatório administrativo.
- Ganho/perda obrigatórios para fechar; perda exige motivo. Etapa Final não encerra silenciosamente. Card sai do Kanban e pode reabrir na etapa anterior.
- Motivos de perda iniciais editáveis/removíveis das opções futuras; histórico preserva o texto anterior. Inatividade configurável em dias, verificada pelo job periódico, encerra como perda com motivo Inatividade. Edição, nota ou mensagem vinculada reinicia o relógio.
- Duplicação copia configuração, etapas, motivos, etiquetas e definições de campos do painel, sem clientes/cards.
- Comemoração visual e sonora configurável. Cada pessoa habilita áudio em Conta → Som de comemoração; navegador precisa permitir áudio. Usuários com acesso ao painel, mas sem acesso ao card, recebem celebração sem nome/ID da oportunidade. Respeita redução de movimento.
- Exclusão de etapa exige destino dos cards (mover, arquivar ou excluir) e confirmação externa. Exclusão de card oferece destino antes da confirmação. Exclusão lógica mantém trilha de auditoria; não é purga definitiva de dados. Auditoria em Configurar painel → Ver auditoria do painel.
- Busca por texto/ID, responsável, etapa, situação, etiqueta, vencimento e valor exato de campo. CSV de cards para administradores; dados atualmente filtrados, com proteção de fórmulas na exportação.
- Relatório: ganhos/perdas/abertos, valores, ticket, conversão dos encerrados, ciclo médio, motivos, passagem por etapas, tempo de etapa, metas/ganhos mensais e conversão por responsável. Permissão administrativa no servidor. Painel individual não impede o administrador autorizado de supervisionar.
- IA pode mover cards vinculados à conversa se a ferramenta `crm_move` for explicitamente incluída em suas permissões. Só etapas intermediárias; encerramento automatizado por IA não é autorizado nesta entrega. Bots podem integrar as APIs administrativas conforme autenticação; não foi criado um bloco visual específico de CRM.

## Configuração das integrações

WAHA: cadastre canal `waha` com URL interna, chave e sessão; Baileys: canal `baileys`. Cada número/empresa deve ter sessão e credenciais adequadas; não reutilizar a mesma sessão entre empresas. Conforme a edição do WAHA, múltiplas sessões podem exigir licença. A conexão atualiza o webhook da sessão existente, preservando opções fornecidas em `session_config`.

Zernio: o adaptador Inbox usa `config.key`, `account_id`, `platform` e `webhook_secret`. Cadastre o webhook indicado pela Néxora no Zernio e assine com o mesmo segredo. Verifica assinatura HMAC e conta antes de consumir o evento. A resposta usa o ID externo da conversa recebida, não tenta inferi-lo do telefone. Há contrato de texto e multipart/anexos; formatos e janelas dependem de cada rede. Contas devem estar conectadas/autorizadas no provedor; a Néxora não executa OAuth do Zernio nesta entrega. `mode: legacy` preserva o adaptador antigo de texto quando necessário, ainda exigindo assinatura. Não foi validado com credenciais reais.

Asaas e modelos de IA continuam exigindo suas chaves, contas e modelos. Criar cobrança não confirma pagamento; webhooks financeiros legados ainda precisam de homologação/reconciliação com o provedor. Não foi feita cobrança real nesta entrega.

### Confirmação externa de exclusão

Configure no deploy:

```
NOTIFICATION_WEBHOOK_URL=https://seu-relay-de-notificacoes/exclusao
NOTIFICATION_WEBHOOK_SECRET=segredo-exclusivo-do-relay
```

O relay é uma integração sua (por exemplo n8n) que envia o código pelo provedor de email, WhatsApp ou SMS. O app faz POST JSON com `id`, `channel`, `to`, `code`, `expires_in`, `action` e `board`. Header `x-nexora-signature`: HMAC-SHA256 hexadecimal do corpo bruto com `NOTIFICATION_WEBHOOK_SECRET`. O relay deve verificar a assinatura, não registrar o código em logs expostos e responder 2xx somente após aceitar o envio no provedor. Falha/timeout bloqueia a exclusão; ausência de integração também bloqueia. O código não volta ao navegador na solicitação, expira em dez minutos, permite até cinco tentativas e uso único.

Email vai ao email do usuário autenticado. WhatsApp/SMS são destinos definidos pelo administrador em Integração e API → Confirmações externas:

```json
{"destinations":{"123":{"whatsapp":"+5565999999999","sms":"+5565999999999"}}}
```

`123` é ID do usuário. Troque os exemplos pelos destinos verificados. Nenhuma mensagem de confirmação foi enviada a uma pessoa durante os testes; o relay foi simulado.

## Validação e limites

- `npm test`: motor de bot, templates, saudações e fuso.
- `node test/realtime.mjs`: falhas repetidas de WebSocket, espera progressiva, ausência de recarregamento, heartbeat e sessão expirada.
- `node test/driver-contracts.mjs`: contratos simulados de texto/documento WAHA/Zernio, assinatura e filtro de conta, multipart e leitura segura de arquivos. Sem conexão externa real.
- `node test/workspaces.mjs`: contrato HTTP master com banco simulado.
- `test/service-crm-postgres.mjs`: PostgreSQL/WASM descartável com migrações, RLS, equipes, convites, tomada, transferência, ganho/perda obrigatório, versão concorrente, reabertura, inatividade, cópia sem clientes e com campos, confirmação externa simulada, uso único e auditoria.
- A suíte de banco requer `PGLITE_MODULE` e `PGLITE_VECTOR_MODULE` apontando para instalações de PGlite 0.5.10 e pgvector 0.0.11. Não aponta para o banco de produção.
- Chromium desktop/celular: fluxo persistido em PostgreSQL/WASM, movimento, ganho fora do Kanban, Lista, relatório, nota, histórico, conclusão, governança, instrução de QR e ausência de overflow no celular. Exercitado antes da publicação; provedores ficaram simulados.
- Não homologado: build Docker/Swarm, PostgreSQL 16 como serviço, concorrência entre réplicas reais, sessões WhatsApp, credenciais Zernio/Asaas/LLM, entrega real de email/SMS, OAuth e chamadas de voz em tempo real. Voz aqui é áudio assíncrono, STT/TTS conforme módulo existente.
- Mídia antiga configurada como URL pública de logo precisa migrar para o cadastro de marca independente, porque mídias de atendimento agora exigem autorização.
- A seleção de fuso cobre saudações, mensagens, vencimentos do CRM e períodos de relatórios. Agenda Google/cobranças legadas não foram integralmente uniformizadas.
- Conversas de identidades diferentes em redes diferentes não são unificadas automaticamente por nome. Funil legado e conversas anteriores são preservados; não são convertidos automaticamente em cards novos.

## Correção de atualização contínua

A versão anterior chamava `location.reload()` quatro segundos após qualquer fechamento de WebSocket. Corrigido: reconexão em segundo plano com espera progressiva, aviso discreto, interrupção por sessão expirada e preservação de rascunho/foco. A causa de uma conexão cair no servidor/proxy requer seus logs; remover o F5 não prova que a conexão do deploy está saudável.

## Próxima etapa

O proprietário retornou e definiu **Agentes de IA** como próximo assunto. Inteligência e Rastreamento de Leads permanece para depois. Aguardar suas instruções específicas de agentes; não avançar automaticamente para tracking.
