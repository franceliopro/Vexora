# Atendimento, perfil e busca — 21/10/2026

## Retorno do bot por inatividade
Administração → Governança → Bot · retorno por inatividade.

Padrão: habilitado, 30 minutos. Configure segundos, minutos, horas ou dias (mínimo de 10 segundos, máximo de 30 dias), ou desative. A contagem considera a última mensagem enviada/recebida e o aceite humano; notas internas não renovam o prazo. Vale para atendimento assumido ou ainda aguardando, desde que exista um bot de atendimento ativo e elegível para a inbox.

Ao vencer o prazo, libera o responsável, encerra convites, pausa as execuções antigas e rearma a entrada do bot. Não envia menu espontaneamente. Na próxima mensagem, a triagem começa novamente, respeitando a espera inicial e a identificação configuradas. O histórico e o protocolo do ticket aberto permanecem; não registra ganho, perda ou resolução por suposição. O humano pode assumir novamente, interrompendo a automação. Uma nota interna registra a liberação.

Esta regra permite voltar ao bot mesmo depois da devolução da IA à fila humana. É diferente da Continuidade humano e IA: aquela oferece IA quando ninguém aceita e devolve à fila por inatividade; esta rearma a triagem após o intervalo configurado para a conversa.

## Fundos e legibilidade
Na conversa → Personalizar fundo da conversa. Os balões recebidos/enviados usam tons do fundo escolhido: menta clara com resposta verde escura e letra clara; oceano com tons azuis; lavanda com tons roxos. Links ficam sublinhados. Notas internas mantêm identificação amarela própria. A preferência é pessoal, por empresa e navegador, sem alterar o conteúdo enviado ao cliente.

## Sua foto e senha
Clique no avatar no canto superior direito:
- Meu perfil · foto e assinatura: foto do dispositivo, Google Drive autorizado ou câmera, nome conhecido e assinatura. Salvar meu perfil confirma a mudança.
- Alterar minha senha: senha atual, nova senha e confirmação. Mínimo de oito caracteres; bcrypt limita a 72 bytes. Os olhos dos campos permitem conferir a digitação.

Os parceiros usam o mesmo caminho, sem precisar ser administradores. Os endpoints só alteram o usuário autenticado; um ID informado no corpo não permite editar outra pessoa. Administradores continuam com a gestão de usuários pela Governança.

## Busca financeira
Financeiro → Busca global: nome com/sem acentos, placa com/sem hífen, CPF/CNPJ completo, telefone, e-mail, descrição e identificadores. Considera também os campos personalizados e dados do contato vinculado. Os filtros de período, status, conta, moeda e empresa continuam valendo. Clientes e Assinaturas também têm busca ampliada.

Documentos continuam mascarados na tela. A importação cria um índice HMAC para pesquisa exata do CPF/CNPJ completo. Depois do deploy, use Sincronizar agora para atualizar esse índice nos clientes que já estavam importados. A placa precisa existir na descrição da cobrança/serviço ou no cadastro/campo personalizado do contato vinculado; não é inventada nem recuperada de plataformas de rastreamento não integradas.

## Exemplos nas seções
O botão Exemplos de uso explica uma aplicação prática de cada seção. Inteligência de Leads registra origem e intenção (quando os eventos estão integrados); CRM acompanha o andamento; Campanhas fazem envios pontuais; Sequências acompanham jornadas ao longo do tempo; Workflows executam decisões e ações.

Para reduzir a navegação, avaliar agrupar Campanhas e Sequências sob Automação e manter agendamentos pontuais no contexto da conversa. Não removido: essas ferramentas têm finalidades distintas e registros existentes que devem ser preservados.

## Validação
Suíte geral, testes de PostgreSQL/WASM com RLS, retorno do bot, pesquisa por placa/CPF/acentos e alteração do próprio perfil/senha. APIs externas e transporte de mensagens simulados. Interface verificada separadamente em Chromium.
