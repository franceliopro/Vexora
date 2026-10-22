# Ligações WhatsApp, SMS e piloto comercial

## O que esta entrega conecta

- Atendimento → Ferramentas → Ligar pelo WhatsApp: chamada de voz do atendente com microfone do navegador e áudio via WebRTC.
- Automação → Ligações e SMS: campanhas com texto SMS ou ligação que reproduz áudio gravado, fila por contato, horários e início programado.
- Editor de chatbot: bloco Ligação WhatsApp ou SMS, com saídas **ok** e **error**. Informe o ID da campanha liberada para automações.
- Editor de follow-up avançado: o mesmo bloco inscreve o contato na fila. O horário da campanha continua valendo.
- Autorizações por contato/canal, histórico auditado de concessão/revogação e sessão de chamadas exclusiva por empresa.
- Registro de início/fim da ligação no ticket; histórico de resultados das campanhas na área de automação.

A telefonia PSTN anterior é separada: ela liga para telefones comuns. A nova integração usa AstraCalls para tocar dentro do WhatsApp. Não altera as sessões Baileys/WAHA nem migra as mensagens existentes.

## Implantação do serviço de chamadas

Esta integração requer um serviço adicional. Não foi instalado no servidor por esta entrega; não há acesso administrativo ao Dokploy nesta sessão.

1. Crie um projeto separado no Dokploy usando `deploy/whatsapp-calls.compose.yml`. Para Portainer Swarm, use `deploy/whatsapp-calls.swarm.yml`, ajuste a rede externa e labels do Traefik existentes e fixe ambos os serviços no nó que mantém o volume.
2. Defina CALLS_DB_PASSWORD (senha forte, compatível com URL PostgreSQL), ASTRA_CALLS_API_KEY (segredo aleatório longo), ASTRA_CALLS_URL (origem HTTPS, por exemplo https://calls.seudominio.com), CALLS_PUBLIC_IP (IP público real ou auto).
3. Configure domínio HTTPS no serviço calls, porta HTTP interna 8080. Não exponha PostgreSQL à internet. Preserve o volume calls-db; ele contém as sessões pareadas.
4. Libere a porta de mídia 50000 UDP/TCP no servidor. Teste NAT/firewall. O caminho de mídia desta integração usa WebRTC; não implementa o fallback PCM/WebSocket do AstraCalls. Redes restritas podem exigir ajustes de infraestrutura.
5. A imagem de referência é astraonline/astracalls:v1.1.2. Confirme sua disponibilidade, versão e funcionamento com áudio no seu ambiente. O serviço inclui o codec; uma compilação apenas de sinalização pode tocar sem transportar áudio.
6. No painel próprio de chamadas, crie uma sessão e pareie um número piloto em WhatsApp → Aparelhos conectados. Copie o identificador da sessão. Proteja o painel e a chave administrativa; não compartilhe a chave com os clientes.
7. No serviço **da Véxora**, configure ASTRA_CALLS_URL e ASTRA_CALLS_API_KEY com os mesmos valores e refaça o deploy. O Compose principal já repassa essas variáveis quando usadas.
8. No Platform → Ligações WhatsApp, escolha a empresa, identifique a sessão e habilite. Uma sessão ativa não pode ser atribuída a duas empresas.
9. Em Automação → Ligações e SMS → Autorizações, registre a autorização real do contato para ligação. Vá ao ticket sob seu controle e use Ferramentas → Ligar pelo WhatsApp. Autorize o microfone.
10. Faça uma chamada piloto e valide áudio nos dois sentidos, duração, encerramento e histórico antes de liberar campanhas.

AstraCalls é um componente externo sob AGPL-3.0. Preserve avisos e cumpra os termos aplicáveis ao disponibilizar ou modificar o componente. Fonte e licença: https://github.com/AstraOnlineWeb/AstraCalls . A Véxora consome sua API; não incorpora o código do serviço nesta entrega.

## Campanhas e automações

1. Para SMS, primeiro habilite um número no serviço gerenciado e atribua-o à empresa em Platform → Telefonia e créditos. Nenhum número é comprado automaticamente.
2. Registre autorização por canal em Automação → Ligações e SMS. Um aceite de mensagem não é automaticamente autorização de ligação.
3. Crie uma campanha, escolha canal, conteúdo, contatos autorizados, fuso, data inicial, horário diário e intervalo. A interface inicial usa dias úteis. A API aceita seleção de dias 0..6. Horários respeitam o fuso escolhido; a data inicial do formulário é convertida do fuso do dispositivo.
4. SMS aceita {{nome}}, {{primeiro_nome}} e {{telefone}}. Para ligação, informe URL HTTPS pública de áudio MP3/WAV; o arquivo precisa ser acessível ao serviço. A primeira versão não sintetiza nem personaliza o áudio por destinatário.
5. Salve o rascunho e revise antes de confirmar o início. Ligações são despachadas individualmente, com intervalo mínimo de 60 segundos e reprodução limitada a 120 segundos. O provedor controla sua capacidade simultânea.
6. Para bots/follow-ups, marque Permitir que bots e follow-ups adicionem contatos autorizados e mantenha a campanha ativa. Use seu ID no bloco. Cada contato entra uma vez por campanha; uma nova jornada exige uma nova campanha.
7. Revogação é conferida novamente antes do disparo, inclusive descadastro registrado em campanhas de mensagens. Recebimento de respostas SMS e confirmação de entrega SMS não estão conectados nesta versão. Um identificador de Instagram/Messenger não é convertido em telefone: preencha telefone real na ficha.
8. Pausar/cancelar impede novos despachos; uma chamada já iniciada pode continuar. Falha com resultado incerto vira Conferência necessária, sem repetição automática.

SMS aceito pelo provedor não significa entregue/lido. A integração de campanhas ainda não recebe confirmação de entrega SMS. Ligações acompanham estados de toque, atendimento, reprodução, não atendimento e falha por consulta ao serviço. O histórico do provedor pode se perder se ele reiniciar; a Véxora preserva o que já registrou. Reinício após aceitação e antes de persistir o resultado requer conferência manual.

Esta entrega não implementa chamadas recebidas no painel, telefonia oficial Meta, voz conversacional de IA ao vivo, gravação automática, nem detecção de interesse pelo áudio da ligação. Não ative campanha real antes do teste piloto.

## Modelo comercial para rastreadores

Em Agentes de IA → editar agente → instruções, use **Modelo: rastreadores PF e frotas**. O prompt é pré-visualizado e somente substitui o conteúdo do editor após confirmação; só é persistido ao salvar o agente. Não modifica automaticamente agentes existentes. Escolha o cargo Vendedor online e complete preços, produtos, instalação, condições e restrições reais.

Recomendação inicial: um vendedor de IA principal por inbox e bot para triagem/menu. Use especialistas adicionais apenas quando houver uma responsabilidade distinta e uma passagem testada. Vários agentes não compensam uma base incompleta.

### Jornada pessoa física

Novo lead → Em qualificação → Solução definida → Proposta enviada → Aguardando decisão → Instalação/contratação. Colete quantidade/tipo de veículo, região, necessidade e prazo. Apresente apenas oferta aprovada, valor inicial, recorrência, instalação e condições. Não interprete os produtos de sandbox do Asaas como tabela comercial.

### Jornada frotas

Colete quantidade por tipo de veículo, operação/região, necessidade, solução atual, prazo e responsável. Entregue ao vendedor um resumo e proposta preliminar baseada em condições autorizadas. Desconto, integração não documentada e negociação especial passam ao humano. Não force a frota a contratar um plano de consumidor.

### Suporte e financeiro

Suporte: fila própria, sintoma, identificação mínima, procedimento aprovado, tentativas e resultado; encaminhe riscos e casos sem solução. Não crie um lead comercial em todo chamado de suporte. Não permita comandos perigosos de bloqueio de veículo por um prompt genérico.

Financeiro: consultar base correta do Asaas, apresentar débitos de forma clara e mascarada, oferecer cobrança, confirmar apenas por retorno real do provedor e interromper lembretes de parcelas pagas. O índice de inadimplência deve ser medido; redução não pode ser prometida antes do piloto.

### Critérios de aprovação do piloto

- Texto e áudio: cliente interrompe bot, a IA recebe contexto e responde coerentemente; humano assume e interrompe automação; conclusão permite nova triagem.
- PF: preço/condições reais, proposta, instalação com horário confirmado e CRM atualizado.
- PJ/frota: qualificação útil e passagem ao único vendedor com resumo, sem perguntas repetidas.
- Objeção e falta de dados: nenhuma invenção; encaminhamento com pendência explícita.
- Financeiro: CPF/CNPJ encontrado no ambiente correto, fatura válida, pagamento confirmado e lembrete cancelado.
- Follow-up: horário e autorização respeitados, sem duplicidade e com parada após resposta/recusa.
- Ligação: áudio bidirecional e encerramento; campanha de áudio com resultado observado; SMS aceito exibido como aceito.
- Comparar 2–4 semanas com a linha de base: tempo de primeira resposta, leads qualificados, propostas, conversões, motivos de perda, pendências de suporte, resolução, valores vencidos/recebidos e custo por operação. Comparar volumes equivalentes e não atribuir toda mudança à IA.

Os testes locais usam banco e provedores simulados. Aprovação comercial depende de testes reais e de revisão das respostas pelo responsável. A suíte fornece os componentes; não representa uma garantia de vendas ou redução de inadimplência sem configuração e validação operacional.
