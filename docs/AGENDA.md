# Agenda no atendimento

Na Central de Atendimento, escolha **Agenda** para ver os compromissos acessíveis. Na ficha do cliente à direita, clique **Agendar**. A ficha aparece aberta no computador e pode ser recolhida; no celular, abra pelo botão da ficha.

## Organização

- **Individual:** pertence ao usuário que cria. Administradores também podem acessar.
- **Compartilhada:** criada por administrador, com participantes definidos na criação. Cada compromisso tem um responsável. A reserva bloqueia o horário daquele responsável em todas as agendas Néxora; outros responsáveis podem atender em paralelo.
- A visibilidade do compromisso também depende da permissão para a conversa vinculada. Compartilhar uma agenda não concede acesso aos atendimentos de colegas.
- O fuso começa com o da empresa (por exemplo America/Cuiaba) e pode ser escolhido no agendamento.

## Google Agenda

No projeto Google Cloud, habilite Calendar API e configure o consentimento OAuth. Crie uma credencial OAuth para aplicação Web. Configure no Docker/Dokploy/Portainer:

```
PUBLIC_URL=https://seu-dominio
GCAL_CLIENT_ID=seu-client-id
GCAL_CLIENT_SECRET=seu-client-secret
JWT_SECRET=segredo-persistente-da-instalacao
```

Cadastre o retorno OAuth exatamente como mostrado em **Agenda → Gerenciar agendas → Como conectar Google e Apple**: `https://seu-dominio/calendar/google/callback`.

Crie a agenda e clique **Conectar Google**. Cada agenda tem autorização própria; uma agenda compartilhada pode apontar para o ID de uma agenda Google compartilhada, desde que a conta autorizadora tenha acesso de edição. Tokens de atualização são guardados criptografados com chave derivada de JWT_SECRET. Preserve essa variável ao atualizar a instalação. Desconectar remove a credencial da Néxora; revogue também o acesso na conta Google, se desejado.

O fluxo consulta a disponibilidade Google e publica os compromissos criados pela Néxora. Cancelamentos exigem sincronização e envio da confirmação de cancelamento pelo painel. Não há importação contínua nem sincronização bidirecional de edições feitas fora da Néxora. A disponibilidade da agenda compartilhada Google considera todos os eventos dela; use agendas Google individuais caso queira disponibilidade independente por pessoa também no Google.

## Apple Calendário

Escolha **Apple Calendário (.ics)** e baixe o compromisso em **Minha agenda → Apple / .ics**. Importe o arquivo no Calendário. A importação é uma cópia e não acompanha alterações ou cancelamentos automaticamente. Também é possível usar uma conta Google no aplicativo Calendário da Apple. Esta versão não implementa escrita direta em iCloud/CalDAV.

## Confirmação na conversa e continuidade

Ao agendar, a opção **Enviar confirmação ao cliente agora** vem marcada. O sistema salva o compromisso antes de sincronizar/enviar. Em caso de falha, ele continua em Minha agenda com o estado real; não crie outro para tentar novamente. Use Sincronizar Google ou Enviar confirmação conforme a pendência. Envios incertos exigem conferir o histórico, evitando repetição automática.

Título, início, término, fuso e responsável aparecem na mensagem ao cliente. Notas privadas nunca entram nessa confirmação. Anotações do atendente ficam na ficha do cliente, com autor e data; eventos de criação, confirmação e resultado ficam na linha do tempo. Quando houver transferência de atendimento, a próxima pessoa autorizada poderá consultar os registros vinculados à conversa.

## Relatório

Administradores podem abrir o relatório em Minha agenda ou nos Relatórios de atendimento. Por período e responsável/agenda: quantidade, situação (agendado, realizado, cancelado, não compareceu), minutos reservados, confirmações enviadas e sincronizações pendentes. Minutos reservados são a duração planejada, não uma medição do tempo efetivamente trabalhado.

## Validação

`npm test` valida contratos e fluxos existentes. `test/calendar-postgres.mjs` usa PostgreSQL/WASM descartável para testar permissões, isolamento entre empresas, conflitos, repetição segura, confirmação, fuso e relatório. `test/attendance-browser.mjs` usa Chromium e APIs simuladas. A autorização real Google e entregas reais nas redes precisam de credenciais e de teste na instalação.

## Guias e arquivos do Google Drive no atendimento

Os guias ficam em **Integração e API → Guias de conexão** e no botão **Passo a passo** das telas de atendimento/agenda. Dentro da conversa, **Ferramentas → Google Drive** abre busca, navegação de pastas e preparo do anexo na mesma tela.

Habilite Google Drive API no projeto OAuth. Cadastre também `https://seu-dominio/google/drive/callback` como retorno autorizado (copie o endereço exibido na janela). O Drive usa `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`; se ausentes, reutiliza `GCAL_CLIENT_ID` e `GCAL_CLIENT_SECRET`. Cada usuário autoriza sua própria conta. O escopo é `drive.readonly`; para publicação ampla, siga a verificação de aplicativo e de escopos exigida pelo Google. Em modo de testes, adicione as contas na lista de usuários de teste do consentimento.

Não há compartilhamento público automático nem alteração de arquivos no Drive. O usuário seleciona, prepara e confirma o envio de uma cópia ao cliente. PDF, imagens, áudio, vídeo e documentos suportados respeitam o limite Néxora de 20 MB e as restrições de download do Google. Documentos/Apresentações Google são exportados em PDF; Planilhas Google, em XLSX. A autorização inicial abre uma janela Google; as buscas e os envios seguintes ficam sobre a conversa.

## Filas, arquivamento e lixeira

Novos, Meus e Outros mostram os totais completos, respeitando busca, inbox e acesso do usuário. Os números não são limitados aos 200 tickets exibidos por consulta. Convites individuais e por equipe também entram em Meus; as categorias podem se sobrepor por causa desses convites.

Finalize a conversa antes de arquivar. No ticket concluído, clique **Arquivar/Organizar**, escolha o destino e informe o motivo. Arquivados e Lixeira têm atalhos por ícones ao lado das filas. Mover para lixeira e restaurar dela é restrito a administradores, com confirmação pelo número do ticket. Nenhuma dessas ações apaga mensagens ou oportunidades do CRM; os movimentos ficam auditados. Restaurar devolve a Concluídos; Reabrir torna o atendimento ativo novamente.
