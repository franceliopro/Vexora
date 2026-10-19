# Atendimento integrado

## Lista de conversas

O cabeçalho mantém Novos, Meus e Outros, o ícone de concluídos e o menu de três pontos para Arquivados, Lixeira e Todos em aberto. A interrogação explica cada fila. O filtro junto à busca oferece inbox, equipe, responsável, tipo da última mensagem e ordenação. A lista e os totais usam os mesmos filtros e permissões.

## Ações sem trocar de tela

- **Kanban da conversa:** selecione o painel, crie uma oportunidade vinculada, altere a etapa ou finalize em ganho/perda. Cards de outros atendimentos do mesmo contato são identificados pelo ticket. Administradores também podem criar painéis ali.
- **Agenda:** crie uma agenda, consulte compromissos e agende para o cliente. A confirmação inclui título, data, horário e fuso na mesma conversa.
- **Cobranças:** confirme a identidade do titular e consulte CPF/CNPJ. O documento aparece mascarado; o resumo mostra total em aberto e total vencido. Envie o resumo com as opções, depois a forma que o cliente escolher. Pix, linha digitável, boleto e fatura dependem da disponibilidade da cobrança no Asaas. A fatura completa acompanha o envio sem duplicação quando já foi a opção escolhida. Novas cobranças Asaas ou Checkout Stripe também podem ser criadas na conversa.
- **Mensagem interna:** o botão da equipe abre uma caixa abaixo do campo de mensagem. Tem rascunho separado e histórico privado; nunca envia conteúdo ao cliente.
- **Emojis:** catálogo Unicode 17 com categorias, pesquisa, tons de pele e bandeiras. Usa os desenhos do dispositivo, sem copiar os recursos gráficos do WhatsApp.

## Asaas e Stripe

Em **Cobranças → Configurar provedores** (administradores), siga as etapas e valide a chave. Asaas começa com Sandbox; Stripe, com Teste. Produção exige escolha e confirmação explícitas. Chaves de testes e produção não são intercambiáveis. Depois de salvar, reabra a configuração e copie o webhook e os dados de autenticação para o provedor.

A consulta Asaas permite escolher cobranças pendentes ou vencidas. O envio reconsulta a situação antes de encaminhar o meio de pagamento. Tentativas de criação/envio têm identificadores para reduzir duplicação; falhas ambíguas exigem conferir o provedor e o histórico antes de uma nova operação. Não há baixa simulada apresentada como pagamento real. O Checkout Stripe oferece os meios habilitados na conta; não é apresentado como equivalente aos meios de boleto/Pix do Asaas.

## Lembretes da agenda

Informe minutos antes do compromisso, por exemplo `1440, 60`, ou deixe vazio. O servidor verifica lembretes a cada 30 segundos; o envio pode ocorrer após esse intervalo e depende da rede. O horário deve ser futuro. Tempos que já passaram não são criados.

Os lembretes são mensagens de texto explicitamente autorizadas, sem reativar IA/bot. Respeitam conta do atendente, participação na conversa, inbox ativa, agendamento em aberto e sincronização externa. Se o atendimento for encerrado, o usuário perder acesso ou a inbox for pausada, ficam bloqueados. Em Agenda → Lembretes, confira os estados e reconfigure quando necessário. Não há repetição automática de um envio incerto.

## Redes fornecidas pela Néxora

O provedor Zernio é uma integração interna do proprietário da Néxora. Não aparece na tela da empresa nem pode ser configurado pelo administrador da empresa.

No painel **Master → Gerenciar empresa → Redes sociais gerenciadas**, o proprietário valida a chave central, escolhe o perfil/rede e clica **Vincular e ativar nesta empresa**. O cadastro do webhook é feito para aquela inbox. A chave fica criptografada em configuração global, fora dos dados de configuração devolvidos à empresa. Contas já vinculadas a outra empresa são recusadas, evitando a importação geral de todas as contas da assinatura para cada cliente.

Se existir exatamente uma chave antiga salva, ela pode ser recuperada para o cofre central. Quando houver mais de uma chave antiga diferente, o master deve validar explicitamente a chave correta. `ZERNIO_API_KEY` no servidor também pode fornecer a chave central. Preserve JWT_SECRET, usado na criptografia.

A empresa vê somente a rede (Instagram, Messenger etc.), o perfil conectado, estado e atendimento. Não recebe a chave central, webhooks internos ou configuração do fornecedor nos endpoints de administração/exportação. WhatsApp Baileys, WAHA e oficiais continuam identificados e podem ser implantados conforme a contratação. Custos do provedor são administrados pelo proprietário, fora da interface da empresa.

## Validação

Os testes usam provedores simulados e PostgreSQL/WASM descartável. Para validar na instalação real, o master precisa vincular/ativar a conta da empresa e receber uma mensagem externa. Asaas/Stripe precisam das chaves do ambiente escolhido. Testes automatizados não confirmam entrega real ao cliente nem substituem o teste autenticado na instalação.
