# Néxora — processo de atendimento e governança

Especificação consolidada em 19/10/2026 a partir da orientação do proprietário e das 12 telas anexadas. É a referência do módulo **Central de Atendimento**, antes do detalhamento de CRM. O estado implementado está separado dos requisitos abaixo. Referência visual de organização; identidade própria da Néxora.

## 1. Jornada única de atendimento

WhatsApp, Instagram e Messenger chegam à mesma central. Cada atendimento mostra a origem, canal/conta, equipe, responsável, estado e executor atual. IA/bot são executores, não redes sociais. Receber mensagem não autoriza envio fora das capacidades/janelas do canal; falhas e restrições devem ficar visíveis ao atendente.

O bot ou IA faz a recepção e triagem segundo a automação configurada. O destino pode ser equipe, atendente ou IA. A transferência preserva contexto e produz evento de histórico. Não criar um painel separado para cada rede: filtros de canal/equipe/responsável organizam o mesmo ambiente.

Um contato em redes diferentes não é automaticamente a mesma pessoa por nome. A unificação deve exigir vínculo confiável ou confirmação autorizada e respeitar histórico/permissões. Histórico unificado não pode revelar mensagens de colegas sem acesso.

### Estados e filas

| Visão | Conteúdo | Regra |
|---|---|---|
| Novos | Atendimento aberto sem responsável humano, aguardando triagem/atendente | Equipes e canais autorizados; indicar se bot/IA ainda está atuando |
| Meus | Atendimentos sob minha responsabilidade e compartilhados comigo | Diferenciar responsável de convidado |
| Outros | Atendimentos assumidos por outras pessoas | Somente quando a governança conceder acesso ao escopo |
| Concluídos | Histórico de ciclos encerrados | Mesmas restrições de acesso; filtro separado da operação aberta |

As abas não são permissões por si só. Ocultar botão não protege o dado: aplicar regras na API, WebSocket, histórico, arquivos, busca, exportações, relatórios, jobs e ferramentas de IA. Alterações de equipe/permissão revogam acesso em tempo real.

Cada atendimento tem um responsável principal humano ou está numa fila. Assumir deve ser atômico: se duas pessoas tentarem, só uma assume. Depois disso, desaparece dos colegas sem convite/supervisão. Triagem ativa deve ser identificada para evitar respostas concorrentes.

## 2. Governança

O master administra empresas e concessões comerciais. Administradores da empresa não viram master nem podem acessar outras empresas. Os três perfis operacionais são:

| Capacidade | Administrador | Atendente | Atendente restrito |
|---|---|---|---|
| Configurar empresa, usuários, equipes e governança | Sim, dentro da empresa | Não por padrão | Não |
| Novos | Todos os autorizados na empresa | Equipes/canais liberados | Filas explicitamente liberadas |
| Meus e convites recebidos | Sim | Sim | Sim |
| Outros | Toda a empresa | Apenas escopo concedido pelo administrador; desativado por padrão | Não; acesso excepcional pela participação explícita na conversa |
| Histórico de colegas | Toda a empresa | Somente escopo autorizado | Não, salvo conversa compartilhada autorizada |
| Contatos | Toda a empresa | Conforme escopo autorizado | Apenas ficha necessária ao atendimento acessível, sem lista geral |
| Indicadores e exportação | Empresa | Somente se concedido, no escopo | Sem visão geral/exportação por padrão |
| Cobrança, transferência e convites | Conforme governança | Permissões específicas | Permissões específicas |

O dono da empresa mantém o controle administrativo. O papel técnico legado `owner` representa esse dono; não é um quarto perfil de atendente nem superadmin da plataforma. Mapear rótulos operacionais sem perder o acesso do responsável existente.

Configurar separadamente: canais; equipes; ver Novos; ver Meus/compartilhados; ver Outros por equipe; assumir; enviar; transferir; convidar; concluir/reabrir; editar ficha; criar etiquetas/campos; criar cobrança; controlar automação; ver relatórios; exportar. Ver uma conversa não concede automaticamente poder de responder, transferir ou cobrar.

Supervisão de suporte deve poder abranger apenas as equipes de suporte selecionadas. Atendente comum não recebe supervisão implicitamente por pertencer à equipe. Convite à equipe inteira compartilha com os membros atuais enquanto o convite estiver vigente; saída da equipe revoga esse caminho de acesso.

### Usuários e equipes

Cadastrar usuários no onboarding master e também no painel da própria empresa. Formulário: nome, email, senha inicial/convite, perfil, equipes, canais e permissões. Configurar status ativo/inativo e revogar sessões quando necessário. Não mostrar hash/senha nas listagens.

Criar e editar equipes e membros pela interface. Neste cliente: Suporte e Financeiro de Ceeb Vision, Link e Rastreabem; Comercial e Administrativo compartilhados. Equipes de empresas diferentes nunca se misturam.

## 3. Fuso horário e marca

Cada empresa escolhe um fuso IANA. Para este cliente, selecionar **Cuiabá — `America/Cuiaba`**. Não fixar uma diferença UTC manual. Não alterar automaticamente empresas existentes ou presumir que todas usam Cuiabá.

A configuração deve orientar saudações, exibição de datas, janela de atendimento, agendamentos e limites de períodos dos relatórios. Persistir instantes em UTC; converter entrada/saída conforme o fuso. Alterar o fuso não reescreve instantes históricos. Compromissos já agendados devem mostrar o efeito da mudança e manter política explícita de reprogramação.

Faixas iniciais: 00:00–05:59 Boa madrugada; 06:00–11:59 Bom dia; 12:00–17:59 Boa tarde; 18:00–23:59 Boa noite. Configuradas por hora local, independentemente do fuso do navegador/servidor. Como evolução, permitir horários/faixas personalizados.

Marca na empresa: nome, cor predominante, fonte, logotipo claro, logotipo escuro e favicon separados. Configuração pela empresa, conforme permissão, ou pelo master. Não implica revenda.

## 4. Responsabilidade, convite e automação

**Atribuir/transferir:** escolher pessoa, equipe ou IA; exibir destino, responsável atual e efeito da mudança antes de confirmar. Para equipe, atendimento volta à fila. O anterior perde acesso operacional, salvo outro poder legítimo. Remover convites anteriores na transferência; novos convites são explícitos. Registrar origem, destino, autor, horário e motivo opcional.

**Convidar:** botão independente. Convidar pessoa ou equipe inteira mantém o responsável principal e permite participação simultânea conforme permissão. Mostrar todos os participantes e quem está digitando; identificar autor de cada resposta. Permitir remover/revogar convite e registrar evento.

**Humano assume:** pausa bot e IA. Não retomar automaticamente por nova mensagem, falha, recarregamento ou reconexão. Só um humano autorizado decide retomar. Mensagens já entregues ao provedor não podem ser recolhidas.

**Híbrido:** humano permanece responsável e escolhe IA/bot como participante da operação. Regras claras de prioridade evitam respostas duplicadas. Estado visível: humano, bot, IA ou híbrido. Ações automáticas obedecem às mesmas permissões/restrições. Transferir para IA e ativar híbrido são ações diferentes.

## 5. Ficha flutuante e histórico do cliente

Clicar no nome abre painel flutuante à direita, expansível/recolhível. No celular, gaveta de tela ampla com retorno claro à conversa. A ficha não pode tirar o contexto do atendimento.

Conteúdo: identificação, telefones/emails, canal, etiquetas, campos personalizados, notas, responsável/equipe, atendimentos anteriores autorizados, passagem por bot/IA/humanos, transferências, convites, conclusões, cobranças, sequências e posição no Kanban. Distinguir informação persistente do contato de evento de um atendimento.

Linha do tempo com autor, data no fuso da empresa, tipo e detalhes autorizados. Exibir somente históricos acessíveis; não resumir por IA conteúdo que o usuário não pode ler.

Criar etiqueta em tempo real com nome/cor e associar sem sair da conversa. Evitar duplicadas por grafia. Campos personalizados: texto, inteiro, decimal, data, data/hora, URL, opção/lista e booleano; grupos, ordem, obrigatoriedade e permissão de edição. Validar no servidor. Não sobrescrever silenciosamente valores de outro atendente.

Notas do contato persistem entre atendimentos e são privadas. Notas internas da conversa ficam vinculadas ao ciclo e nunca são enviadas ao cliente. Confirmação visual clara de destinatário público/interno.

CRM será detalhado na etapa seguinte; aqui ficam definidos os vínculos e eventos necessários, sem construir um segundo cadastro do cliente.

## 6. Mensagens, anexos e voz

Composer com texto, gravação de áudio, envio de áudio existente, fotos, vídeos e documentos. Anexos mostram nome, tamanho, tipo, progresso e erro/reenvio. Validar tipos/tamanhos no servidor e conforme capacidades de cada canal. Arquivo deve passar por autorização de acesso; não basta URL pública imprevisível.

Mostrar autoria humana/automática, horário, status de envio/entrega/leitura quando o provedor informar. Não inventar confirmação. Preservar identificadores externos para deduplicar webhooks.

Voz de IA: módulo STT/TTS contratado/configurado; áudio recebido pode ser transcrito e respondido em áudio, com preferência explícita do cliente por texto respeitada. Conversa por áudio assíncrono não equivale a chamada ao vivo. Chamadas em tempo real ficam com escopo/capacidade de provedor a definir, sem anúncio de disponibilidade nesta entrega.

Modelos e respostas rápidas podem ser selecionados no composer. Mensagens agendadas e sequências usam seus próprios módulos e respeitam pausa/conclusão/consentimento e regras do canal.

## 7. Cobrança durante o atendimento

Bot/IA faz triagem financeira pelo setor/plataforma. Consulta de CPF/CNPJ exige validação e verificação de identidade conforme política da empresa; documento isolado não autoriza expor dívida. Falha ou divergência encaminha ao Financeiro correto.

Pessoa autorizada pode criar cobrança durante a conversa: cliente/documento, plataforma/conta, valor, descrição, vencimento e formas habilitadas. Revisar antes de enviar. Boleto, código, Pix e outros métodos dependem da conta/provedor. Sempre incluir o link da fatura completa junto da opção escolhida.

Usar idempotência e reconciliação; falha ambígua não autoriza criar outra cobrança automaticamente. Guardar vínculo entre atendimento, autor, cliente e ID externo. Registrar criação, envio e confirmação como eventos diferentes. Confirmação de pagamento exige provedor autenticado/reconsultado, não fala do cliente ou retorno da IA. Dados financeiros só para usuários autorizados.

## 8. Conclusão e reabertura

Botão **Concluir atendimento**, separado de transferir/convidar. Solicitar classificação e motivo; categorias iniciais: objetivo atingido, objetivo não atingido, dúvida esclarecida, outro. Motivos configuráveis por empresa (ex.: suporte resolvido, encaminhado ao financeiro, pagamento orientado, venda realizada, cliente sem retorno). Se Outro, exigir descrição. Registrar observação interna, autor, equipe/responsável e horário.

Concluir pausa automação de atendimento, cancela pendências vinculadas ao ciclo e remove o item das filas abertas. Não significa excluir o histórico nem considerar dívida paga/venda ganha. Não mover Kanban ou iniciar campanha sem regra explícita.

Nova mensagem após conclusão inicia um novo ciclo vinculado ao contato, preservando o anterior. Reabrir manualmente exige permissão e motivo e gera evento; métricas não podem apagar a conclusão anterior. Bot de triagem pode atuar no novo ciclo conforme configuração, sem reativar o ciclo pausado pelo humano.

## 9. Relatórios e rastreabilidade

Eventos estruturados: recebido, triagem iniciada/concluída, entrada/saída de fila, atribuído, assumido, convidado/removido, respondido humano/bot/IA, automação pausada/retomada, cobrança criada/enviada, concluído e reaberto. Incluir IDs de empresa/canal/atendimento/contato, ator, executor, equipe, instante UTC e dados mínimos necessários. Preservar quem atuou mesmo após transferência ou alteração de nome/equipe.

Filtros: período local da empresa, canal, equipe, atendente, plataforma, executor, estado e motivo. Relatório geral, por usuário/equipe e resultados; detalhamento até eventos/conversas, respeitando governança.

| Indicador | Definição |
|---|---|
| Novos no período | Ciclos iniciados no intervalo selecionado |
| Pendentes antes/depois | Saldo de ciclos abertos no início/fim; incluir reaberturas/ajustes no detalhamento |
| Concluídos | Eventos de conclusão no período; separar atendimentos únicos de reencerramentos |
| Primeira resposta geral | Tempo desde a primeira entrada do ciclo até a primeira saída pública de qualquer executor |
| Primeira resposta humana | Tempo desde a primeira entrada até a primeira resposta pública humana; não contar notas, bot ou IA |
| Espera humana após triagem | Tempo da entrada na fila humana até a primeira resposta humana |
| Tempo até conclusão | Início do ciclo até conclusão, separado de tempo exclusivamente humano |
| Tempo médio de atendimento humano | Do primeiro aceite humano à conclusão, somente ciclos com aceite; detalhar trechos por responsável/equipe nas transferências |
| Volume por equipe/atendente | Entradas, tomadas, respostas, transferências e conclusões atribuídas ao ator/equipe no momento do evento; não atribuir tudo ao último responsável |
| Motivos de conclusão | Quantidade e proporção por categoria/motivo |
| Gargalos | Fila atual, idade da fila, tempo de espera e transferências repetidas |

Sem resposta/conclusão, apresentar pendente ou sem dado: não computar zero fictício. Exibir tamanho da amostra, médias e, quando disponível, mediana/percentis. Tempo corrido é padrão inicial; horas úteis só com calendário configurado e indicação explícita. Períodos usam início inclusivo/fim exclusivo no fuso escolhido. Exportação não pode contornar restrições.

## 10. Estado real e sequência de implementação

| Área | Estado neste commit |
|---|---|
| Escolha de fuso por empresa | Implementada no cadastro master, gestão master e Personalização; validação IANA no servidor |
| Saudação do bot/IA e hora das mensagens | Passam a usar o fuso da empresa; empresas sem configuração preservam São Paulo |
| Atendimento e roteamento | Inbox/canais e template de oito equipes existentes; APIs reais exigem validação com credenciais |
| Atribuir/convidar pessoa/equipe e pausa/híbrido | Base implementada no commit anterior; remoção individual de convites e eventos estruturados ainda pendentes |
| Governança de três perfis e concessões Novos/Meus/Outros | Especificada aqui; ainda não implementada integralmente. Perfis atuais: owner/admin/agent |
| Usuários e equipes | Cadastro master e CRUD interno existentes; gestão interna guiada e permissões finas pendentes |
| Ficha e notas | Ficha lateral básica e notas internas existentes; gaveta completa, etiquetas/campos tipados e linha do tempo pendentes |
| Conclusão/reabertura por ciclos | Especificadas; ainda pendentes |
| Anexos | Texto/áudio/imagem na base; documentos/vídeos, validação e proteção integral de mídia pendentes |
| Cobrança na conversa | Base Asaas implementada; validação real e reconciliação ainda pendentes |
| Relatórios detalhados | Indicadores básicos existentes; eventos, tempos e relatório descritos aqui ainda pendentes |
| Chamadas ao vivo | Não implementadas |
| Fuso de agenda, cobrança recorrente e relatórios legados | Ainda não uniformizado nesta entrega; integrar nas respectivas etapas |

Ordem: governança aplicada em todos os acessos → ciclos/eventos de atendimento → Novos/Meus/Outros → ficha e anexos protegidos → relatórios → validação ponta a ponta. Depois detalhar CRM. Não apresentar esta especificação como funcionalidades todas concluídas.

### Critérios de aceite prioritários

- Mesmo instante produz saudação correta em Cuiabá e São Paulo; empresa A não altera fuso da B.
- Atendente restrito não lê conversa/mídia/eventos de colega por ID, busca ou WebSocket.
- Duas tomadas simultâneas resultam em um responsável; convite mantém dono e transferência revoga acessos anteriores.
- Tomada humana impede novas ações automáticas; somente retomada explícita reativa o ciclo.
- Histórico da ficha não amplia acesso; nota interna jamais sai no canal público.
- Conclusão exige motivo; nova entrada cria ciclo sem destruir o histórico nem distorcer os tempos.
- Relatórios reproduzem eventos conhecidos, distinguem IA/humano e respeitam fuso/equipe/perfil.
