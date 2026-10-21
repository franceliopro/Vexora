# Financeiro — gestão da base Asaas e Stripe

## Fonte dos dados e primeiro acesso

Acesse **Financeiro** no menu principal. A Véxora usa a chave já conectada em **Integração e API** e recupera os clientes da conta, suas assinaturas e cobranças. Não é necessário recadastrar cada cliente.

O trabalhador de sincronização inicia automaticamente para contas configuradas. A tela mostra fase, registros processados, ambiente, última execução e erro, se houver. Enquanto a importação estiver em andamento, os indicadores são parciais. **Sincronizar agora** solicita uma nova conciliação, sem criar clientes ou cobranças no provedor.

Asaas e Stripe têm contas, ambientes, cadastros e campos distintos. Dados não são somados entre provedores nem entre moedas. Uma mudança de chave inicia uma área de cache segregada: os dados anteriores não são reutilizados presumindo que a conta é a mesma.

## Abas

- **Visão geral:** faturado, pago, saldo aberto, saldo vencido e taxas de inadimplência; gráficos por competência; análise objetiva e celebrações do dia.
- **Cobranças:** lista paginada, filtros por período de vencimento, situação, cliente/descrição e moeda; consulta atual no provedor, envio manual, fatura e acesso à conversa vinculada.
- **Clientes:** todos os clientes importados, filtros de inadimplência, saldo aberto e vínculo; complemento de nascimento, data de relacionamento e contato da inbox.
- **Assinaturas:** contratos recorrentes recuperados do provedor, ciclo, valor, próximo vencimento e acesso às cobranças daquela assinatura.
- **Produtos e serviços:** catálogo para novas contratações. O Asaas recebe descrição/valor/ciclo na cobrança ou assinatura; não se presume um catálogo universal de produtos na API Asaas. Na Stripe, produtos/preços existentes são importados; itens locais são publicados ao contratar.
- **Automações:** calendário, fuso, inbox, avisos, chatbot/template, aniversários e responsável pelos relatórios.
- **Histórico de avisos:** fila, bloqueios, cancelamentos, aceitação pelo canal e envios sem confirmação. A conversa continua sendo o local de conferir recibos de entrega/leitura.

## Alcance e leitura dos números

A importação inicial/completa recupera todos os clientes e assinaturas, cobranças a partir de aproximadamente14 meses e vencidas antigas sem esse limite. Assim, a tela inicia em6 meses e permite2,3,6 ou12 meses. A importação diária recupera clientes, cobranças recentes/futuras e vencidas; a completa também concilia assinaturas e preços Stripe. Webhooks complementam essa conciliação.

Os gráficos comparam o **saldo atual** de cada mês de vencimento. Não são snapshots históricos do saldo que existia no fechamento de cada mês. Faturado/pago/saldo respeitam os filtros. A taxa principal é saldo atualmente vencido dividido pelo valor das cobranças cujo vencimento já passou; o gráfico mensal usa vencido dividido pelo faturado da competência. Valores futuros não entram no denominador da taxa principal. Cancelados, rascunhos e estornados ficam fora dos totais elegíveis. O mês atual é incompleto.

A análise calcula tendências e recomenda prioridades; não inventa causas nem promete uma análise causal por IA. Registros sem sincronização completa ou sem dados não demonstram ausência de inadimplência. As listas de clientes consideram o histórico recuperado; pagamentos com status desconhecido ficam em revisão/rascunho, não são considerados pagos automaticamente.

## Criar uma contratação

1. Cadastre um produto/serviço no provedor selecionado. Escolha valor, moeda, cobrança única ou recorrente, periodicidade e forma de pagamento disponível.
2. Clique **Nova cobrança**, busque o cliente já cadastrado no provedor, selecione o item e informe o primeiro vencimento.
3. Revise ambiente, valor e periodicidade. Confirme para criar no provedor.
4. A resposta mostra o identificador e a fatura, quando disponível. Criação de cobrança não significa mensagem entregue ao cliente.

No Asaas, cobranças únicas usam `payments` e recorrentes usam `subscriptions`, com `dueDate` ou `nextDueDate` e `cycle`. A fatura permite as formas habilitadas pela conta. Cartão direto exige tokenização específica; o módulo oferece a fatura para o cliente escolher e não coleta cartão no painel.

Na Stripe, o módulo usa Product/Price, fatura com item explicitamente vinculado e finalização para cobrança única; não incorpora itens pendentes de outras contratações. Recorrentes usam assinatura com fatura enviada, data futura como âncora e sem prorrateio inicial. Não se presume cartão salvo nem se debita automaticamente. Novas contratações suportam BRL, USD, EUR, GBP, CAD, AUD, CHF e MXN; outras moedas podem ser consultadas separadamente. Valores variáveis de assinaturas Stripe são apresentados como variáveis quando não podem ser calculados de forma fixa.

Operações guardam uma chave e um registro antes de chamar o provedor. No Asaas, resultados incertos são reconciliados pelo identificador externo e não repetidos cegamente. Na Stripe, etapas usam chaves de idempotência; uma etapa incerta antiga exige revisão. Arquivar um item local impede novas contratações por ele; não cancela contratos existentes no provedor.

## Avisos e cobrança automática

Em **Automações**, confira o fuso (por exemplo, America/Cuiaba), a inbox WhatsApp e o horário. Padrão:

- Conciliação completa nos dias1,5 e15, às05h locais.
- Verificação diária de clientes/cobranças a partir das05h; a fila do dia é gerada somente depois de a sincronização terminar.
- Lembretes em D-5, D-3, D0 e D+3. Dias negativos são antes do vencimento.
- Débitos antigos ainda abertos também podem ser lembrados nos dias da conciliação completa. Se já existe lembrete por vencimento naquele dia, não é criada uma segunda cobrança periódica para a mesma fatura.

Intervalos, limites diários e textos são configuráveis. A automação começa desativada para que o administrador escolha a inbox e confira os destinatários. Avisos perdidos de dias anteriores não são disparados em massa ao retornar; o sistema reavalia a situação e a data atuais.

Na ficha do cliente, vincule o contato correto da inbox e registre a autorização de comunicação. O sistema não presume que um número encontrado no Asaas é suficiente para enviar dados financeiros a qualquer contato. Uma retirada explícita da permissão de comunicação prevalece. Clientes sem vínculo/permissão aparecem como bloqueados, sem envio.

Modos: mensagem com link de fatura, mensagem seguida de chatbot ou template aprovado da API oficial. Fora da janela da API oficial, é necessário template compatível. Bots precisam autorizar origem **Sequências** e a inbox; não interrompem um humano que assumiu a conversa. Recebem `financeiro.invoice_id`, `financeiro.valor`, `financeiro.vencimento` e `financeiro.fatura` para conduzir opções de pagamento.

Variáveis dos textos: `{{nome}}`, `{{valor}}`, `{{vencimento}}`, `{{dias}}`, `{{fatura}}`, `{{empresa}}`. Parâmetros de template também podem usar `{{mensagem}}` para inserir o aviso no formato previamente aprovado pelo canal. O conteúdo enviado é o do template aprovado, não uma mensagem livre disfarçada.

Antes do envio, a cobrança é consultada novamente no provedor; liquidação, cancelamento, mudança de vencimento ou saldo impedem o aviso antigo. Uma confirmação recebida após a última consulta pode coincidir com uma chamada já iniciada no canal — os dois provedores não participam de uma única transação. Envios em andamento não são prometidos como canceláveis.

## Pagamento confirmado

Configure o webhook Asaas/Stripe pelo passo a passo de **Integração e API**. Somente eventos com autenticação/assinatura e ambiente válidos entram na conciliação. Pagamento atualizado cancela avisos pendentes daquela cobrança. A confirmação ao contato usa o histórico de atendimento já existente ou a fila financeira, evitando duplicar a confirmação dos pagamentos já rastreados pelo atendimento.

Histórico: **Enviado ao canal** significa aceitação. **Entregue/lido** só aparece na conversa quando o canal fornece esses recibos. Envio incerto fica para conferência e não é repetido automaticamente. Avisos bloqueados antes de qualquer envio podem ser reavaliados após corrigir a causa.

## Relacionamento, responsável e API externa

Datas de nascimento inexistentes no provedor não são inventadas. Complete na ficha do cliente. Aniversários e aniversários de relacionamento geram mensagens opcionais no fuso da empresa, para contatos vinculados e autorizados.

Configure o contato WhatsApp do responsável pelos relatórios e confirme que conferiu sua autorização. O envio pode ser manual com os filtros atuais ou automático nos dias escolhidos. Não é inferido o telefone do chefe. O resumo contém valores e indicadores; a lista completa filtrada pode ser exportada em CSV com documentos mascarados. Exportações acima de10.000 cobranças pedem filtros mais específicos.

Em **Integração e API**, crie uma chave com `finance:read` para consultar:

`GET /api/v1/SLUG/finance/debtors?provider=asaas&after=0`

A resposta pagina até100 cobranças, com cliente, documento mascarado, saldo, moeda e vencimento. Use `next` como `after`. O endpoint não exige colocar a chave do Asaas em sistemas externos: use a chave restrita da Véxora. Eventos opcionais `finance.overdue` (resumo da conciliação/avisos financeiros) e `finance.updated` (atualização de cobrança) podem ser enviados aos webhooks explicitamente configurados. Nenhum destino externo é presumido pela frase “enviar à API”.

Componentes privados Make/n8n incluem a operação Listar inadimplentes; precisam ser atualizados no ambiente onde estão instalados. Não foram publicados em marketplace.

## Referências e validação

- https://docs.asaas.com/reference/listar-clientes
- https://docs.asaas.com/reference/listar-cobrancas
- https://docs.asaas.com/reference/listar-assinaturas
- https://docs.asaas.com/reference/criar-nova-assinatura
- https://docs.stripe.com/api/invoices/list
- https://docs.stripe.com/api/prices/create
- https://docs.stripe.com/api/invoiceitems/create
- https://docs.stripe.com/api/subscriptions/create
- https://docs.stripe.com/currencies

Testes locais usam PostgreSQL compatível e APIs simuladas: paginação acima de100 clientes, RLS, inadimplência por moeda, bloqueio de produção com chave incompatível, operações idempotentes, mudança para pago durante o despacho, webhooks e telas desktop/mobile. Não comprovam acesso à conta real nem envio real de cobrança. Confirme a primeira importação e os primeiros recibos no painel após o deploy.
