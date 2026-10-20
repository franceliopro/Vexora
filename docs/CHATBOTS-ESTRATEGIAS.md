# Chatbots de atendimento e automação — Néxora

## Onde configurar

Abra **Workflows → Conversação**. Os filtros Todos, Atendimento e Automação organizam os fluxos sem duplicar motores ou dados. Em cada card, **Estratégia e horários** configura a finalidade, os horários e as origens autorizadas; **Editar fluxo** abre os blocos. A configuração também aparece no bloco Início.

- **Atendimento:** participa da entrada de mensagens conforme inbox, primeira mensagem/palavra-chave e espera inicial. Os fluxos anteriores mantêm esse comportamento por padrão.
- **Automação:** só começa por um acionamento autorizado, sem concorrer com o bot de entrada.
- **Acionamentos:** histórico das últimas 50 solicitações externas: Na fila, Iniciado, Cancelado ou Conferir histórico. Iniciado significa que o fluxo começou; não significa atendimento resolvido ou pagamento confirmado.

Os agentes de IA continuam em **Agentes de IA**, agora com quatro seções: Perfil, Comportamento, Conhecimento e Configurações. Os controles existentes foram reorganizados; nenhum agente foi substituído. O estado Ativo/Rascunho não muda apenas por salvar uma seção.

## Dentro e fora do expediente

Em **Horários**, habilite o calendário da empresa, escolha intervalos por dia e datas sem atendimento. O fuso vem de **Personalização**, incluindo America/Cuiaba.

Sem habilitar o calendário, a empresa é considerada aberta em qualquer horário. Dias sem intervalos ficam fechados quando o calendário estiver habilitado. Divida um turno noturno entre dois dias: até 24:00 no primeiro e a partir de 00:00 no seguinte. Há até seis intervalos por dia.

Cada bot pode iniciar sempre, somente dentro ou somente fora do horário. Essa restrição afeta o início: um bot já conversando não é interrompido porque o relógio mudou.

Em **Integrações → inbox → Bot, IA e CRM**, escolha o bot de entrada e, opcionalmente, outro bot para fora do expediente. São aceitos bots de atendimento ativos. Sem alternativa, continua valendo a regra do bot de entrada.

Se a espera inicial atravessar o fechamento do expediente, a seleção de entrada é reavaliada antes de iniciar. Uma conversa só recebe um fluxo de entrada.

Para ramificar dentro do próprio fluxo, use a condição `horario_atendimento = aberto` ou `horario_atendimento = fechado`. A variável `{{horario_atendimento}}` também está no catálogo compartilhado com IA e respostas rápidas.

## Pelo atendente, dentro da conversa

Use o ícone **Iniciar chatbot**, **Alt+B** ou o atalho **@@chatbot**. A janela é uma ferramenta lateral sem bloquear o compositor.

Escolha o fluxo e o modo:

- **Eu continuo atendendo junto com o bot:** mantém o responsável em modo híbrido.
- **Entregar o atendimento ao bot:** libera o controle ao fluxo.

Se já houver bot ativo, a substituição precisa ser marcada explicitamente. A solicitação entra na fila; use **Conferir início** para ver o estado e acompanhe as mensagens no histórico. Uma mudança de controle antes do início pode cancelar a solicitação. Ao terminar um fluxo manual, o controle retorna ao atendimento humano; para concluir o ticket, use o bloco Concluir atendimento.

## Por uma sequência

Em **Workflows → Follow-up**, adicione **Iniciar chatbot** e escolha o destino. A sequência pode esperar segundos, minutos, horas ou dias antes desse bloco. Ao acionar o bot, a sequência termina e o chatbot assume a interação.

Autorize a origem Sequências na estratégia do bot. A pausa humana é respeitada; um follow-up não retoma uma automação pausada por conta própria.

## Por campanhas

Abra **Campanhas → Campanhas com chatbot**, ou **Usar em campanha** no card do bot. Escolha até 100 atendimentos abertos entre os carregados na lista. A resposta informa quais entraram na fila e quais foram bloqueados, com motivo.

Esta modalidade executa estratégias em conversas existentes. Não cria um disparo frio para uma lista de telefones nem substitui a necessidade de modelos/permissões exigidos pelos canais. Autorize Campanhas na estratégia do bot.

## Por API externa

Em Estratégia, autorize API externa e abra **API externa → configurar**. Gere a chave, copie o endereço e configure a ferramenta externa no servidor. A chave só é exibida ao gerar; substituí-la invalida a anterior.

Envie POST JSON para `/hooks/bots/TENANT_ID/BOT_ID`:

```json
{
  "external_id": "evento-unico-0001",
  "conversation_id": 123,
  "variables": {"assunto": "Atualização cadastral"}
}
```

Cabeçalhos:

- `Content-Type: application/json`
- `x-nexora-timestamp`: Unix em segundos.
- `x-nexora-signature`: `sha256=` seguido do HMAC SHA256 hexadecimal de `timestamp + "." + corpo JSON exato`, usando a chave.

A assinatura aceita uma janela de cinco minutos. Guarde a chave no servidor da ferramenta, nunca em JavaScript público. `external_id` deve identificar o evento, repetido nas tentativas do mesmo evento. HTTP 202 confirma o registro na fila, não o envio ao cliente.

É necessário um ticket aberto/ativo na empresa e uma inbox ativa permitida pelo bot. A API não toma o controle de um humano. Campos de identidade e protocolo são reservados; as variáveis opcionais são valores simples, até 50 chaves e 16 KB.

## Dados, ações e integrações

- **Perguntar e guardar:** coleta uma resposta; em Salvar também na ficha, escolha nome, e-mail ou um campo personalizado. A variável continua disponível no mesmo fluxo.
- **Atualizar contato:** altera campos confirmados utilizando valores/variáveis coletados.
- **Aplicar etiqueta, Nota interna, Transferir e Concluir:** compartilham o contexto do atendimento.
- **Criar oportunidade no CRM:** cria/reaproveita um card aberto da conversa no painel escolhido e guarda o ID na variável indicada (padrão `card_id`).
- **Mover oportunidade no CRM:** usa a variável do ID e uma etapa intermediária do mesmo painel. Ganho/perda final continua exigindo o processo explícito do CRM.
- **Integração cadastrada:** selecione uma conexão definida em Agentes de IA → Conexões. Reutiliza o mesmo cofre, endpoint, método e parâmetros autorizados, com chave protegida e histórico de execução. Informe parâmetros JSON (os valores aceitam variáveis), uma variável para o resultado e conecte Sucesso/Erro.
- **Chamar API externa:** envia GET/POST para endpoint público HTTPS, com resposta JSON. O DNS é validado e fixado, sem redirecionamento; resposta de até 64 KB e prazo de oito segundos. Use saídas Sucesso/Erro e uma variável para o resultado. Para autenticação Bearer, prefira o bloco Integração cadastrada; não exponha chaves em mensagens.

## Continuidade e segurança operacional

Acionamentos ficam em `bot_invocations`, isolados por empresa. A fila usa chave idempotente e versão do controle (`automation_epoch`). Duas solicitações concorrentes não iniciam dois bots na mesma conversa: a segunda fica cancelada se o estado mudou.

O worker registra a tentativa antes de produzir efeitos, executa sob o bloqueio da conversa e usa uma cópia do grafo. Em falha ambígua, não repete o envio automaticamente; fica como Conferir histórico. Uma edição no fluxo não muda a cópia já iniciada por este mecanismo.

IA também usa a fila ao acionar um chatbot autorizado. Quando o fluxo termina normalmente, pode devolver o controle ao agente de IA que o chamou. Transferências explícitas para humano permanecem prioritárias.

## Verificação

Foram executados testes gerais Node, PostgreSQL descartável/PGlite com todas as migrações, HMAC, duplicidade, concorrência, modo híbrido, pausa humana, separação entre empresas e testes Chromium de desktop/mobile com APIs simuladas. A entrega não enviou mensagens reais a clientes nem utilizou credenciais reais de provedores.
