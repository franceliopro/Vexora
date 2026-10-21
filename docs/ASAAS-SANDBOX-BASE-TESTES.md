# Base fictícia para homologação Asaas

Acesse **Integração e API → Pagamentos · Asaas → Base de testes · Sandbox**. Exige administrador autenticado e a chave desta empresa configurada com `sandbox: true`. Não aceita produção nem usa a chave do outro ambiente.

A ação **Criar os 20 clientes de teste** executa um cliente por vez e mostra o progresso. Se fechar a janela ou a conexão cair, reabra para consultar/continuar o lote. A Véxora guarda o plano do lote e os passos; não cria outro lote automaticamente nem repete uma escrita sem confirmação.

- 20 clientes com nomes TESTE, CPF sintético válido para validação e e-mail em `example.invalid`, sem número de celular e com notificações Asaas desativadas.
- 10 assinaturas de **Plano mensal de Moto e Utilitário · R$ 69,90** e 10 de **Caminhões, Camionete e Pesados · R$ 79,90**.
- Vencimentos divididos em dias 10, 20 e 30; meses sem dia 30 usam o último dia.
- Início simulado distribuído nos últimos seis meses. Competências anteriores avulsas têm a descrição do plano e referência mensal; a assinatura mensal gera as próximas cobranças a partir do próximo mês. O Asaas cria parcelas de assinaturas gradualmente, não retroativamente em lote.
- Perfis alternados: em dia, uma, duas ou três competências vencidas, conforme o histórico disponível. Competências futuras ficam em aberto e não são marcadas como vencidas.
- Pagamentos são confirmados pelo endpoint exclusivo de Sandbox. Atrasos usam o endpoint exclusivo de forçar vencimento. Nada movimenta dinheiro real.

**Data de cadastro:** a API não oferece retroagir a data real de criação. O cadastro real é de hoje; o início anterior consta como referência simulada e nas competências das cobranças. Datas de confirmação são as da simulação, não pagamentos reais feitos nos meses anteriores.

**Registros existentes:** clientes/cobranças/assinaturas com `externalReference` do lote `vexora-sandbox-demo-v1-client-N` são reaproveitados. Outros cadastros não são alterados em massa: é necessário revisar quais pertencem ao cenário de teste antes de marcar pagamentos existentes. Os planos são descrições/valores das assinaturas, não um catálogo de produtos universal do Asaas.

Documentos dos clientes concluídos aparecem no resumo para testar consulta de CPF no atendimento. Não associe um telefone de pessoa real aos dados fictícios.

Timeout em criação deixa o passo **sem confirmação**. Na próxima tentativa, buscamos o identificador externo; se o Asaas mostrar o registro, reaproveitamos. Se continuar ausente, paramos para revisão, sem presumir que a primeira operação falhou. Não há botão de repetir indiscriminadamente.

Fontes oficiais:
- https://docs.asaas.com/reference/criar-novo-cliente
- https://docs.asaas.com/reference/criar-nova-assinatura
- https://docs.asaas.com/reference/criar-nova-cobranca
- https://docs.asaas.com/reference/confirmar-pagamento
- https://docs.asaas.com/reference/forcar-vencimento

Teste local: `test/sandbox-fixtures.mjs` usa transporte simulado, sem consultar ou alterar a conta Asaas real.

## Pagamentos dos clientes já existentes

Na mesma janela, clique **Revisar pagamentos de clientes existentes → Ver competências**. Cada cobrança em aberto permite **Simular como pago** e, quando já deveria estar vencida, **Simular vencimento**. Escolha algumas competências para pagar e mantenha outras em atraso. O estado só muda na tela após a consulta de confirmação do Asaas. Não desconfirmamos pagamentos já recebidos e não editamos cadastros/valores existentes. A lista de clientes pagina20 por vez; a ficha mostra até100 cobranças mais recentes e avisa quando houver mais.
