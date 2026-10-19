# Atendimento e CRM integrados

## Atendimento

- A busca encontra nome, telefone, ticket e palavras das mensagens externas. Filtros por canal, etiqueta, responsável, equipe, leitura e tipo compartilham a mesma consulta dos contadores.
- Atribuir muda o responsável; convidar compartilha a conversa. Os dois botões ficam no cabeçalho. A autorização é validada no servidor.
- A ficha lateral contém etiquetas, campos personalizados, responsável da carteira e anotações para a equipe. As notas não são enviadas ao cliente.
- O seletor de emojis usa Noto Color Emoji quando disponível e os emojis nativos como alternativa. Não inclui GIFs ou figurinhas.

## Filas e distribuição

Em **Integração e API → Filas e distribuição → Configurar filas inteligentes**:

1. Cadastre as equipes e seus membros em Equipe. Na edição de cada inbox, escolha a equipe de entrada. Para uma fila única, use a mesma equipe; para filas separadas, escolha equipes distintas.
2. Selecione fila compartilhada, distribuição sequencial ou equilibrada por quantidade de atendimentos abertos.
3. Configure o transbordo em minutos. Zero desativa. Cada profissional elegível é tentado uma vez. Se ninguém responder, o atendimento retorna à fila e não recomeça um ciclo infinito.
4. Ative a preferência pelo responsável da carteira, definido na ficha do contato. O responsável precisa pertencer à equipe, estar ativo e ter acesso ao canal.
5. O processamento ocorre a cada 30 segundos. “Ativo” significa usuário habilitado; não é detecção de presença online. Resposta humana encerra o transbordo da distribuição. Atribuição manual, IA, bot ativo e modo híbrido são preservados.
6. Quem pode supervisionar outras equipes continua definido na governança. A distribuição não concede poderes de supervisão.

As regras começam desativadas para não mudar operações existentes sem configuração. A triagem de setor ou tipo de atendimento pode encaminhar a conversa pelo bot ou IA já vinculados à inbox.

## CRM

Os cards exibem mensagens não lidas dos atendimentos do contato aos quais o usuário tem acesso. O ícone de conversa abre esses atendimentos. A leitura zera o contador da conversa no modelo atual compartilhado da inbox. A atualização usa eventos, sem recarregar a página. A conversa permite vincular/criar oportunidades e mudar etapas; uma etapa final exige ganho ou perda.

## Pagamentos

Conecte o Asaas pelo assistente em Integração e API. As chaves são específicas de cada empresa e ambiente. A fatura de uma cobrança UNDEFINED oferece os meios habilitados na conta Asaas; o cartão é preenchido no ambiente do provedor.

Cobranças criadas no atendimento e débitos consultados/enviados ficam associados à conversa de origem. Em Cobranças → Pagamentos enviados, consulte o status registrado. Os webhooks autenticados PAYMENT_CONFIRMED/PAYMENT_RECEIVED (Asaas) ou uma sessão efetivamente paga (Stripe) registram uma confirmação interna nessa conversa, uma vez. Criar um link não significa receber o pagamento. Confirmar um pagamento não encerra automaticamente a oportunidade no CRM.

Configure o webhook indicado pelo painel. A cobrança pode ser criada e o link enviado sem ele, mas a confirmação automática depende do webhook. Eventos de estorno e chargeback ainda não alteram esse status; não use a tela como conciliação contábil completa.

## Validação

Testes locais com PostgreSQL/WASM e navegador cobrem isolamento, rotação, carga, carteira, transbordo, filtros, contadores, confirmação idempotente, mensagens não lidas e navegação do atendimento. Testes dos provedores usam transportes simulados. A validação de entrega real e de recebimento financeiro requer as contas e credenciais de Sandbox do operador.

## Protocolo e conexões

Novos atendimentos recebem um protocolo imutável `NX-ANO-EMPRESA-NÚMERO`, sem telefone ou CPF. O recebimento inicial envia esse protocolo ao cliente antes da triagem. O estado de envio é salvo: falhas ou resultado incerto exigem conferência antes do reenvio. Conversas existentes recebem protocolo na migração, mas não disparam mensagens em massa: o atendente pode usar Informar protocolo.

A tela abre em Meus. O filtro é um popover junto à busca, sem modal ou escurecimento. A ficha oferece seleção direta do painel e botões de etapas intermediárias para vincular ou mover o cliente.

O Asaas diferencia chave cadastrada, última validação da API e último webhook recebido. Testar conexão agora consulta a API usando a chave já salva. A API responder não comprova entrega de mensagem nem recebimento de pagamento. Ao trocar conta ou ambiente, o token do webhook muda; atualize-o também no Asaas.

No master, Empresa → Redes sociais gerenciadas mostra a validação da chave central, o vínculo da inbox e a última DM recebida. É necessário vincular o perfil à empresa, ativar o webhook e testar com uma nova mensagem de outro perfil. Histórico antigo no provedor não é importado por essa ativação.
