# Integração e API — Véxora Suite

## Comece no painel

Abra **Integração e API → Conecte a sua operação**. Não é necessário alterar o Dokploy para cadastrar uma chave ou um destino.

1. Crie uma chave para cada integração (ERP, e-commerce, financeiro ou HubSpot).
2. Escolha as permissões. A chave pertence à empresa e pode acessar seus registros conforme os escopos concedidos; não representa um atendente restrito.
3. Copie a chave, exibida uma única vez, e o endereço da API. No conector, use `Authorization: Bearer SUA_CHAVE`. O banco guarda somente o hash. Revogue pelo painel para interromper acessos.
4. No Make/n8n, conecte os módulos da Véxora aos módulos do sistema de destino. Cada serviço pode exigir sua própria autorização e mapeamento de campos.

Não há sincronização universal automática de todos os ERPs. Os componentes privados abaixo fornecem operações concretas de leitura e consulta; o cenário de integração define o que fazer em cada sistema. Não estão publicados/verificados nos marketplaces.

## API v1

Base mostrada no painel: `https://SEU_DOMINIO/api/v1/SLUG_EMPRESA`.

| Método/caminho | Permissão | Resultado |
| --- | --- | --- |
| GET `/connection` | Chave ativa | Verifica conexão e permissões |
| GET `/contacts?after=0` | `contacts:read` | Até 100 contatos, campos e etiquetas |
| GET `/opportunities?after=0` | `crm:read` | Até 100 oportunidades e IDs de painel/etapa |
| GET `/attendances/ID` | `conversations:read` | Responsável, equipe, canal, status e protocolo |
| GET `/messages/ID` | `conversations:read` | Mensagem de cliente/canal; nunca notas internas |
| POST `/query/ID_CONEXAO` | `external:query` e ID autorizado | Consulta GET na API externa cadastrada |

Para paginar listas, use o último `id` como `after`. Limite: 60 chamadas/minuto por chave/instância do servidor; não é um limitador distribuído global.

Consulta externa: cadastre em **Agentes de IA → Conexões externas** um endpoint GET, seus parâmetros e credenciais. Autorize seu ID na chave. O POST da API v1 recebe apenas os parâmetros declarados. O servidor executa somente o GET cadastrado, com HTTPS público, DNS validado, sem redirecionamento, timeout e limite de resposta. As credenciais do ERP ficam criptografadas na Véxora. POSTs externos com efeitos continuam sob as ações explicitamente configuradas para agentes/flows; esta chave não dispara cobranças nem envia mensagens.

## Webhooks

1. No destino, crie um receptor HTTPS público. Exemplos: **Webhooks → Custom webhook** no Make, **Webhook** ou **Véxora Trigger** no n8n.
2. Na Véxora, clique em **Novo webhook**, cole a URL e selecione os eventos.
3. Guarde o segredo exibido uma vez e valide a assinatura no receptor.
4. Clique **Enviar teste**. Consulte **Últimas 50 entregas** e atualize o status. HTTP 2xx confirma recebimento do destino, não execução de todas as ações do cenário.

Eventos: `attendance.created`, `message.created`, `crm.updated`, `external.query.completed`. O teste usa `connection.test`. As mensagens incluem direção/tipo/IDs; não enviamos corpo de conversa, mídia ou notas internas. Use o ID e uma chave autorizada se precisar consultar conteúdo. CRM informa o painel atualizado; recarregue suas oportunidades para sincronizar. Uma ação pode gerar mais de uma atualização de painel.

Envelope: `{ "id": "UUID", "event": "message.created", "occurred_at": "ISO-8601", "data": { "conversation_id": 15, "message_id": 30, "direction": "in", "kind": "text" } }`.

Headers: `X-Vexora-Event-Id`, `X-Vexora-Timestamp` (segundos Unix), `X-Vexora-Signature`.

Assinatura: `sha256=` + HMAC-SHA256 hexadecimal do texto `TIMESTAMP.ID.CORPO_JSON_EXATO`, usando o segredo. Rejeite timestamps com mais de 5 minutos e compare em tempo constante. Deduplicate por ID antes dos efeitos. O ID permanece igual nas repetições; timestamp/assinatura são renovados.

A fila persiste antes de enviar, tenta até 5 vezes com espera crescente e não segue redirecionamentos ou endereços privados. Se o servidor reiniciar durante uma tentativa, o mesmo evento pode ser reenviado. Após falha final, corrija o receptor e acompanhe novos eventos; o painel não repete falhas antigas indiscriminadamente. Desativar o webhook interrompe novas tentativas, mas uma chamada já iniciada pode terminar.

Mensagens recebidas e criação do atendimento entram na fila na mesma transação do registro. Mensagens de saída e atualizações do CRM enfileiram após a persistência da operação; uma queda nesse intervalo pode exigir reconciliação pela API. Não se promete entrega exatamente uma vez. Logs guardam erros de transporte e metadados, não segredos.

## Componente privado n8n

Fontes em `integrations/n8n`. Inclui credencial, nó **Véxora** (conexão/contatos/oportunidades/consulta externa) e **Véxora Trigger** (eventos assinados).

1. No seu n8n autohospedado, disponibilize a pasta como pacote privado de community node, seguindo o processo oficial de instalação privada. Alternativa de desenvolvimento: na pasta, `npm pack`; instale o `.tgz` na pasta de nós privados do n8n e reinicie o serviço. O pacote não depende de compilação TypeScript.
2. Crie a credencial **Véxora API** com endereço base e chave do painel. Teste a conexão.
3. Adicione **Véxora**, escolha a operação e conecte ao módulo do ERP, financeiro, loja ou HubSpot.
4. Para eventos, adicione **Véxora Trigger**. Copie a URL de produção para a Véxora, escolha os eventos, copie o segredo para **Segredo do webhook** na credencial e ative o workflow. Envie o teste pelo painel. Mantenha a deduplicação de `id` no workflow antes de criar registros ou cobranças.

Instalação privada exige acesso administrativo ao n8n; o painel da Véxora não instala extensões em outro servidor. Em n8n Cloud, use HTTP Request + Webhook enquanto o pacote não estiver publicado/aprovado.

## Componente privado Make

Fontes em `integrations/make`, separadas por aba do editor oficial de Custom Apps.

1. Crie um app privado **Véxora** no Make Apps Editor.
2. Crie conexão básica: cole `connection.parameters.json` em Parameters e `connection.communication.json` em Communication. Cole `base.json` no Base do app.
3. Crie módulos Search **Listar contatos** e **Listar oportunidades**: Communication dos arquivos correspondentes, Parameters de `modules/list.parameters.json`. Configure a interface com os campos retornados pela API (IDs numéricos, nomes/textos). O arquivo `result.interface.json` é um ponto de partida; oportunidades devem expor `title`, `board_id`, `stage_id`, etc.
4. Crie Action **Consultar sistema externo**: arquivos `query.communication.json` e `query.parameters.json`. A saída é o JSON da API autorizada.
5. Para eventos, use o módulo nativo **Webhooks → Custom webhook** no cenário e cadastre a URL na Véxora. Valide a assinatura antes de processar dados sensíveis; se o cenário não permitir HMAC/compare seguro, coloque um receptor verificador à frente.
6. Crie a conexão usando endereço e chave e conecte os módulos aos do HubSpot/ERP/e-commerce. Pagine listas usando o último ID. Não cadastre o segredo em campos públicos.

O app privado precisa ser criado na sua conta Make. Os arquivos não são um blueprint importável de cenário nem um app publicado no catálogo.

## Cobranças no atendimento

Após enviar resumo, Pix ou boleto, o painel financeiro mostra cada mensagem com o estado real: **Enviado ao canal**, **Entregue ao cliente**, **Lido pelo cliente** ou falha. A aceitação do canal não comprova entrega. Os mesmos estados aparecem no histórico da conversa e são atualizados por recibos.

Baileys, WAHA e WhatsApp oficial têm tratamento de recibos. Se Instagram/Messenger ou outro adaptador não informar recibos compatíveis, a Véxora mantém o envio aceito sem inventar entrega/leitura. Um pagamento confirmado pelo Asaas é outro evento, diferente de receber a mensagem de cobrança.

## Referências oficiais

- https://docs.n8n.io/connect/create-nodes/overview.md
- https://docs.n8n.io/connect/create-nodes/build-your-node/reference/http-request-helpers.md
- https://developers.make.com/custom-apps-documentation
- https://developers.make.com/custom-apps-documentation/app-components/connections/basic-connection.md

Validação local: migração/RLS, chave/revogação/escopos, fila/assinatura/repetição e UI com APIs simuladas. A instalação nos ambientes reais de Make/n8n e o envio de cobrança real precisam ser verificados com as contas conectadas; testes locais não enviam mensagens nem criam cobranças reais.
