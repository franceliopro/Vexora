# Botões, Pix e confirmação de pagamento

Pesquisa e implementação: 20/10/2026.

## Resultado da pesquisa

O Postman é um catálogo de contratos e exemplos. A existência de um endpoint não demonstra entrega real no aplicativo WhatsApp nem compatibilidade com a biblioteca instalada.

| Fonte | O que foi encontrado | Decisão para a Néxora |
| --- | --- | --- |
| Postman, API WhatsApp Baileys Lib / Cachesistemas | Rota `/message/templateButtons?key=...` de um servidor que encapsula Baileys. Não é um método da biblioteca que usamos diretamente. | Não tratar a rota como capacidade nativa do pacote `@whiskeysockets/baileys` 6.7.x. |
| Postman, coleção WAHA 2024.11 | Endpoint `/api/sendButtons`. | Conferir documentação atual antes de habilitar. |
| Documentação atual WAHA | Exemplo de reply, URL, ligação e copy (`copyCode`), mas seção marcada como depreciada e botões sem funcionamento no momento. Recomenda texto ou enquetes como alternativa. | Não habilitar como padrão e não anunciar botão de copiar como garantido. |
| Repositório oficial WhiskeySockets/Baileys | Histórico de problemas com botões/listas e alterações frequentes de protocolo. Há exemplos em forks e APIs terceiras, que não comprovam funcionamento no pacote atual. | Manter números e texto; uma experiência com native flow precisará de teste real isolado por versão, engine e dispositivo. Nenhum fork foi instalado. |
| Meta oficial e inboxes gerenciadas | Contratos de escolhas já implementados na entrega anterior. | Reutilizar para IA, com fallback numerado nos limites já documentados. |

### Fontes

- https://www.postman.com/cachesistemas/api-whatsapp-baileys-lib/request/ag6th8s/send-template-buttons
- https://www.postman.com/devlikeapro/waha/request/bpuupnm/send-buttons-interactive-message
- https://waha.devlike.pro/docs/how-to/send-messages/#send-buttons
- https://github.com/WhiskeySockets/Baileys/issues/56
- https://github.com/WhiskeySockets/Baileys/blob/master/src/Utils/messages.ts
- https://docs.zernio.com/messages/send-inbox-message.mdx
- https://docs.asaas.com/docs/payment-events
- https://docs.stripe.com/checkout/fulfillment

## Escolhas na IA

A IA recebe instrução para propor opções curtas. O JSON admite `options`, uma lista de textos, além de `reply`. O servidor valida quantidade, comprimento, linhas e duplicidades antes de montar botões. O histórico conserva as opções numeradas para que respostas como 1 e 2 tenham contexto. A escolha do próximo passo continua sendo da IA; um bot é o recurso indicado quando a ramificação precisa ser estritamente determinística.

Perguntas com opções são enviadas em texto para permitir toque mesmo se a entrada veio em áudio. Perguntas abertas continuam usando TTS quando configurado. Controle humano e verificação de epoch continuam preservados.

## Pix Copia e Cola

No envio financeiro humano, o código Pix ou a linha digitável agora ocupa uma mensagem exclusiva, sem rótulo junto ao conteúdo. A explicação vem antes; a fatura completa vem depois. O bot já envia o Pix isolado. Isso permite copiar o conteúdo pelo próprio aplicativo. Não é equivalente a um botão nativo de cópia, que permanece indisponível por padrão no Baileys/WAHA.

## Automação interna padrão

1. Cobranças criadas pela Néxora ou enviadas/consultadas na conversa são vinculadas ao atendimento. Consultas do bot/IA passam a registrar os débitos no controle de pagamentos; nenhuma confirmação é inventada pela IA.
2. O webhook deve ser configurado no provedor, com endereço e segredo da empresa. Asaas: `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED`. Stripe Checkout: `checkout.session.completed` e `checkout.session.async_payment_succeeded`, com `payment_status=paid`.
3. Depois da validação de autenticação e ambiente, uma transação marca o pagamento como pago, registra nota interna/evento e agenda a confirmação ao cliente.
4. A fila é verificada a cada 30 segundos. O aviso informa confirmação, valor, referência e agradecimento; sandbox/test traz indicação explícita de teste.
5. Uma cobrança é confirmada uma vez, mesmo que eventos sejam repetidos ou cheguem confirmado e recebido em sequência. `CONFIRMED` do Asaas não significa saldo disponível; a mensagem não promete disponibilidade de saldo.
6. Estado do envio: na fila, enviando, enviado, bloqueado ou conferir envio. Inbox pausada e atendimento arquivado/excluído bloqueiam a tentativa. Atendimento concluído pode receber o aviso sem reabrir o ticket nem retomar bot/IA.
7. Em caso de timeout ou erro ambíguo, não há repetição automática. Um administrador confere o histórico e o provedor antes de reprogramar, com registro de auditoria. Envios interrompidos ficam para conferência após 5 minutos.

### Onde acompanhar

**Pagamentos → Confirmações automáticas**, ou **Integração e API → Confirmações automáticas**.

A ação é independente de o atendimento estar com humano, bot ou IA. O aviso transacional não altera atribuição, modo de automação nem situação do CRM.

### Limites práticos

- O provedor precisa enviar webhooks válidos. Só colocar a chave de API não habilita eventos.
- Mensagens continuam sujeitas à conexão e às regras/janelas do canal. Envio fora da janela oficial pode precisar de template aprovado; essa entrega sinaliza a falha para conferência, sem criar template automaticamente.
- Uma cobrança externa sem vínculo a contato/conversa não permite escolher com segurança a quem avisar. Não há busca por CPF, telefone ou nome para adivinhar o destinatário.
- Pagamentos já liquidados antes desta atualização não geram avisos retroativos.
- No instante entre envio externo e gravação local, não existe garantia universal de exatamente uma entrega. O estado de conferência evita reenvio cego.
- A entrega foi validada com testes locais e provedores simulados; depende de aceite real com credenciais após deploy.
