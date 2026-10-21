# Véxora: agentes, habilidades e origem dos leads

## Atendimento
No ícone ◐ da barra da conversa, escolha um dos dez fundos. É uma preferência por empresa e usuário no navegador, não um fundo enviado ao cliente.
Alt+H mostra ou recolhe a ficha e a gestão do ticket. O botão no cabeçalho continua disponível.

## Configuração do agente
1. Abra **Agentes de IA → Criar agente / Configurar agente**.
2. Em **Identidade e canais**, escolha as inboxes em que poderá atuar.
3. Em **Papel e vínculos**, escolha Assistente virtual, Supervisor, SDR, Parceiro comercial, Funcionário ou Coordenador.
4. Marque os especialistas, fluxos, painéis e conexões que este agente poderá usar.
5. Em **Ações permitidas**, aplique o conjunto sugerido para o papel e ajuste as permissões. Um vínculo sozinho não concede a habilidade correspondente.
6. Configure comportamento, modelos/chaves e conhecimento; salve em rascunho ou ative.
7. Nas configurações da inbox, escolha o agente de entrada ou o agente para texto livre/áudio após o bot.

O papel orienta a operação; permissões e vínculos limitam as ações reais.
O supervisor encaminha a um especialista ativo na mesma inbox, com histórico preservado.
Há limite de dois encaminhamentos/consultas na mesma resposta para impedir ciclos.
O histórico registra habilidades executadas e falhas. APIs sem confirmação não são repetidas automaticamente.

Habilidades novas: criar oportunidade vinculada à conversa, qualificar lead com justificativa e pontuação, criar/aplicar etiqueta, acionar fluxo autorizado, delegar à IA e consultar/executar API cadastrada.
A criação de oportunidade reaproveita um card aberto no mesmo painel. Não conclui um card como ganho/perda por suposição.
O encerramento de atendimento continua usando a habilidade Concluir, com motivo e resultado.
O humano assumir continua pausando a automação.

### Sem setores
Não é necessário criar equipes. As conversas sem equipe entram na fila geral para usuários com acesso ao canal e permissão de Novos. Ao assumir, a conversa passa ao responsável.
Atendente restrito continua precisando de permissão explícita para a fila. Transferências diretas para usuário funcionam sem equipe.
A distribuição por prioridade/transbordo continua sendo uma configuração de equipe, quando a empresa quiser utilizá-la.

## Conexões externas
Na página dos agentes, use **Conexões para habilidades da IA → Conectar sistema**.
Cadastre um endpoint público HTTPS, GET ou POST, com resposta JSON; opcionalmente chave Bearer. Informe os parâmetros permitidos e descreva quando pode usar.
A chave é protegida no servidor usando o cofre já existente da aplicação. Não troque JWT_SECRET sem tratar as credenciais armazenadas.
Depois autorize a conexão no agente e marque a habilidade Consultar ou acionar API.

A IA não escolhe URLs, cabeçalhos ou métodos arbitrários. Endereços privados e redirecionamentos são bloqueados; DNS é validado e fixado na conexão; prazo de oito segundos e resposta de até 64 KB.
O estado cadastrado não significa conexão testada. A lista de últimas execuções mostra Concluída ou Sem confirmação. Nesta última situação confira o sistema externo antes de repetir.
POST deve ser configurado apenas para uma ação que o administrador realmente autorize a IA a executar. Não há descoberta automática de APIs ou conexão MCP genérica nesta entrega.

## Inteligência de leads
Abra **Inteligência de leads → Conectar formulário ou ferramenta**.
Escolha nome e inbox. Associe os nomes das respostas recebidas aos campos personalizados do contato.
A tela fornece endereço e chave exibida uma única vez, mais instruções. A chave pode ser rotacionada; a anterior deixa de funcionar.

O servidor da ferramenta envia POST JSON para:
`/hooks/leads/TENANT_ID/SOURCE_ID`

Cabeçalhos:
- `x-vexora-timestamp`: Unix em segundos.
- `x-vexora-signature`: `sha256=` + HMAC SHA256 hexadecimal de `timestamp + "." + corpo JSON exato`, usando a chave exibida.
- `Content-Type: application/json`.

A assinatura vale por cinco minutos. Nunca coloque a chave em JavaScript público.
Exemplo de corpo:
```json
{
  "type": "form",
  "external_id": "form-0001",
  "handle": "IDENTIFICADOR_EXATO_NA_INBOX",
  "name": "Nome do contato",
  "campaign": "Orçamento de frota",
  "page": "https://empresa.com/contato",
  "fields": {"modelo_veiculo": "Caminhonete"}
}
```

Tipos: form, click e referral. external_id único por evento/fonte impede duplicação.
O contato é associado pelo handle exato e pela inbox configurada. Não há conversão de identificador do Instagram em telefone.
O evento pode criar o contato antes da primeira conversa; não envia mensagens ou dispara automação por si só.
Cliques anônimos não são associados a pessoas por suposição. Não há rastreador de navegação anônima instalado automaticamente em sites.
A query string e o fragmento da página são removidos para evitar registrar tokens ou dados pessoais acidentais.

Referências de anúncios/links que chegam junto de mensagens Meta ou no metadata.referral do serviço social gerenciado também são registradas automaticamente. A disponibilidade depende do payload recebido.
Eventos avulsos referral.received sem mensagem ainda não são consumidos automaticamente.

Na ficha do atendimento, abra **Origem e contexto do lead**: primeira origem, última interação, qualificação e eventos com respostas.
A visão administrativa mostra as origens acumuladas e os últimos 200 eventos.
Os campos mapeados usam as mesmas definições/tipos já existentes no CRM, bot e IA.
Variáveis novas: `{{lead.origem}}`, `{{lead.campanha}}`, `{{lead.pagina}}`, `{{lead.qualificacao}}`, `{{lead.pontuacao}}`.
Estas variáveis passam pelo catálogo compartilhado e podem ser usadas nos fluxos, IA e respostas rápidas.

## Validação pendente no ambiente
A migração 032 é aplicada pelo mecanismo existente no próximo início.
Foram verificadas sintaxe e funções isoladas. Os testes Node, PostgreSQL/PGlite e navegador estão preparados, mas não foram executados nesta entrega: o ambiente de execução estava indisponível.
Depois do deploy, validar criação/salvamento de agente, transferência sem equipes, fluxo real, API de teste, formulário assinado e um evento de origem real.
As imagens anexadas estavam indisponíveis; a implementação parte das descrições do usuário e documentação pública, preservando o layout existente.
