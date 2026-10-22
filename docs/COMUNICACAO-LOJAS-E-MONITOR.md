# Comunicação, lojas e monitoramento — entrega e continuidade

## Onde configurar

Em Configurações, use as abas **Avisos e comunicação**, **E-mail · IMAP/SMTP**, **Chat para sites** e **Lojas virtuais**. Somente administradores devem configurar credenciais. As contas e registros ficam isolados por empresa.

### E-mail: IMAP recebe, SMTP envia

1. Abra E-mail · IMAP/SMTP e crie uma conta, escolhendo nome da inbox e equipe responsável.
2. Informe endereço, servidor IMAP com TLS (porta 993), usuário e senha de aplicativo quando exigida pelo provedor.
3. Informe servidor SMTP, porta 465 (TLS) ou 587/2525 (STARTTLS), remetente e credenciais.
4. Salve e teste a conexão. Use Buscar mensagens para conferir a importação.
5. Por padrão, somente novas mensagens são importadas; a opção de importar as 20 recentes é explícita.

As mensagens chegam ao Atendimento. As respostas usam SMTP e preservam referências de e-mail quando disponíveis. Mensagens automáticas/listas não acionam bot/IA. Anexos têm limites de tamanho. Nenhuma mensagem é marcada como lida no servidor IMAP. Campo de senha vazio ao editar preserva a senha existente.

O provedor pode exigir senha de aplicativo ou bloquear autenticação por senha. Esta entrega não implementa OAuth de Gmail/Microsoft. Verificar conexão não envia mensagem. Aceitação pelo SMTP não comprova entrega nem leitura; erros ficam visíveis.

### Avisos e créditos

Configure SMTP e destinatários em Avisos e comunicação. Escolha e-mail, WhatsApp ou SMS e confirme os destinos. WhatsApp requer inbox ativa compatível; SMS depende de número habilitado pela administração da plataforma. Testes de envio são ações explícitas.

Chaves OpenRouter dos agentes ativos são descobertas periodicamente; o saldo é consultado a cada 15 minutos. A consulta de saldo da conta pode exigir chave de gerenciamento; quando indisponível, usa-se o limite da chave se fornecido. Saldo desconhecido não é apresentado como zero. Outros serviços podem ser acompanhados com saldo manual. Alertas abrem uma vez por episódio e são rearmados após recuperação. Falha de consulta também gera aviso. Entregas incertas não são repetidas automaticamente.

### Chat para sites e WordPress

Crie um chat, informe os domínios HTTPS exatos permitidos e escolha a equipe. Copie o script gerado para seu site. O chat cria uma inbox e usa o mesmo pipeline de atendimento, bot e IA.

No WordPress, instale a pasta `wordpress/vexora-chat` como plugin (ou compacte essa pasta em ZIP), ative e configure em Configurações → Véxora Chat: URL pública da Véxora e chave pública do widget. A chave do widget não é uma credencial administrativa. Notas internas não aparecem ao visitante. Nesta versão, o visitante envia texto; mídias enviadas pelo atendimento são exibidas pelo widget.

## WooCommerce e Shopify

Em Lojas virtuais, conecte a loja e siga as orientações da tela. WooCommerce usa URL HTTPS e chaves REST de leitura. Shopify usa domínio myshopify.com e credencial de aplicativo autorizado, com permissões para produtos, clientes e pedidos. O acesso a dados protegidos e históricos pode depender da autorização concedida ao aplicativo.

A sincronização é paginada e explícita, com produtos, clientes e pedidos armazenados no cache local. Esta entrega é de leitura: não altera estoque, preços, pedidos ou cobranças na loja. Vincule o cliente/pedido ao contato da Véxora; os dados vinculados ficam disponíveis na ferramenta de loja dentro da conversa. Novos pedidos podem precisar de vinculação posterior.

Copie a URL de webhook e configure eventos e segredo na loja. As assinaturas são verificadas e eventos repetidos são deduplicados. Os webhooks não são cadastrados automaticamente na loja.

## Platform

Abra Monitor da plataforma para ver PostgreSQL, conexões, latência, tamanho do banco, migrações aplicadas/pendentes, processo, memória, CPU e disco. O monitor é somente leitura e não executa migrações. A atualização opcional altera apenas métricas, sem recarregar o painel.

Redis só é consultado se REDIS_URL estiver configurada. O painel distingue serviço configurado de uso efetivo: esta entrega não migra filas/cache da aplicação para Redis. Métricas do contêiner e do host são identificadas separadamente.

Em Telefonia e créditos, o master atribui números e configura a conta central. A empresa não recebe chave nem identificação do provedor. SMS e chamadas dependem de habilitação, disponibilidade de rota e cobrança do serviço. As chamadas implementadas são uma ponte para o telefone do atendente, não um discador WebRTC no navegador. Há estimativa e confirmação explícita antes de iniciar a chamada.

## Implantação e validação

O rebuild Docker instala nodemailer, imapflow e mailparser. As migrações 047, 048 e 049 são aplicadas pelo mecanismo existente. Preserve JWT_SECRET e demais segredos existentes para manter acesso às credenciais cifradas. Confira PUBLIC_URL com HTTPS e o volume de mídia persistente. Não é necessário criar configurações SMTP por empresa no Dokploy: elas ficam no painel.

Foram exercitados contratos de provedores, políticas, isolamento de empresas, sessões e histórico privado do widget, alertas, importação IMAP e respostas SMTP com provedores simulados. Não foram enviados e-mails/SMS, iniciadas chamadas, efetuados gastos nem alteradas lojas reais. A validação ponta a ponta em produção depende das credenciais e autorizações do cliente.

Scripts adicionais: test/commerce-monitor.mjs, test/communications-site-postgres.mjs (PGlite + pgvector), test/new-workspaces-browser.mjs (Playwright). Os dois últimos usam dependências de QA externas indicadas por variáveis no próprio teste.

## Pesquisa e limites

A documentação nativa de Zernio oferece SMS e chamadas PSTN; a implementação utiliza essas APIs sob gestão do master. AstraCalls foi investigado como alternativa autohospedada para chamadas WhatsApp, mas não foi instalado. Referências: https://docs.zernio.com/platforms/sms/sending , https://docs.zernio.com/platforms/voice/outbound , https://github.com/AstraOnlineWeb/AstraCalls , https://nodemailer.com/smtp , https://imapflow.com/docs/ .

Pendências para próxima etapa: validar contas reais e o domínio do site de teste; OAuth de e-mail quando necessário; ampliação de automações de lojas. PWA permanece para etapa futura conforme combinado.
