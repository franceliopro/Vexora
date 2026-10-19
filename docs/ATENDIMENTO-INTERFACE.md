# Atendimento e gestão das inboxes

Entrega para a referência visual enviada em 19/10/2026 (imagens 174636 e 174939).

## Atendimento

A lista mostra ticket, contato, inbox/conta de origem, horário, prévia com tipo de mensagem, responsável e equipe. Em concluídos, exibe quem concluiu, obtido do histórico auditado. A busca aceita o número do ticket, inclusive o formato #000015. A consulta continua protegida pelas permissões e RLS da empresa.

A conversa tem cabeçalho compacto, informações do ticket e conclusão. A gestão do ticket fica no painel lateral recolhível: responsável, atribuição, convite, modo de automação, cobrança, ficha e histórico. O compositor tem ícones SVG para CRM, anexos, emoji, nota interna, microfone e envio. Notas internas são identificadas e separadas da mensagem ao cliente. Shift+Enter cria nova linha; Enter envia. O atendimento precisa ser assumido para responder.

A nova view está em web/attendance.js, carregada após os utilitários e antes da organização das áreas. A view antiga permanece no arquivo-base por compatibilidade, mas não é a view usada pela navegação.

## Estabilidade da interface

O transporte WebSocket não recarrega a página. Eventos de mensagem acrescentam nós ao histórico sem recriar o compositor ou os players existentes. Rascunho, foco e cursor são preservados. Falha no envio mantém o texto para nova tentativa. Trocar de conversa preserva rascunhos separados de texto e nota interna enquanto a view estiver aberta; não há garantia de persistência desses rascunhos após fechar/recarregar a página.

A consulta de estado das inboxes continua a cada 20 segundos em segundo plano, somente com a página visível. Views só são notificadas se houver mudança relevante; um timestamp técnico de conexão não provoca reconstrução da lista. A listagem de atendimentos é atualizada por eventos, com comparação de dados e agrupamento das notificações próximas. A atualização não deve interromper digitação ou reprodução de áudio.

O autodeploy pode reiniciar a conexão com o servidor. O cliente tenta reconectar sem F5. Esta entrega não verificou a configuração do proxy/WebSocket da instalação real; problemas externos de rede podem continuar gerando aviso de reconexão. Atualize a página uma vez após o deploy para carregar a nova interface.

## Integrações

A primeira seção de gestão mostra cards de cada inbox com nome, provedor, conta/@/telefone, sessão, estado e última entrada. Ações: adicionar inbox, editar nome/equipe/estado, testar conversa, abrir atendimento, conectar/QR, callback Meta e excluir da operação. O cadastro guiado dos provedores permanece na mesma área.

Excluir exige digitar o nome exato, desabilita a entrada e pausa automações, execuções de bots e tarefas do canal. Histórico, contatos, mensagens e CRM permanecem. Não exclui a conta no provedor. Webhooks válidos de canal pausado são reconhecidos sem processar mensagens, evitando tentativas de entrega em loop. A sessão Baileys no processo é encerrada sem revogar suas credenciais. O envio normal é bloqueado enquanto a inbox estiver desabilitada.

Use Mostrar inboxes removidas para restaurar uma conexão. Restaurar não retoma automaticamente os fluxos antigos pausados; escolha a automação dentro do atendimento quando necessário.

## Verificações

- npm test: motores, fusos, contratos de provedores, reconexão e runtime Baileys simulado.
- test/integrations-postgres.mjs: PostgreSQL/WASM, edição/remoção/restauração, pausa da automação, histórico preservado, isolamento de equipe, SQL real do ticket, responsável, conclusão, tipo de mensagem e busca por ticket.
- test/service-crm-postgres.mjs: regressão de atendimento, governança, confirmação externa, CRM, etapas finais, cópia e isolamento.
- test/attendance-browser.mjs: Chromium desktop/celular; recebimento de mensagens sucessivas, identidade do compositor/player preservada, foco/cursor/rascunho, falha de envio, ausência de F5 e gestão de inboxes com APIs simuladas.
- test/inboxes-browser.mjs: identificação de várias contas na mesma rede, renomear e teste guiado com APIs simuladas.

As mensagens reais foram confirmadas como recebidas pelo usuário. Estes testes não constituem homologação de todas as ações com as contas de produção.
