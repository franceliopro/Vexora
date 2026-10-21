# Continuidade e templates — 21/10/2026

## Regras aplicadas
- Rastreabem: consulta pela mesma base Asaas para todas as plataformas. CPF/CNPJ válido permite consulta também por representante; telefone do solicitante não precisa coincidir. Documento permanece mascarado.
- Bot primeiro: opções válidas continuam no fluxo. Texto inválido com até três caracteres repete a pergunta. Texto livre maior passa à IA nos blocos com alternativa de IA habilitada.
- Áudio durante o fluxo passa à IA e pausa a execução do bot. Requer agente ativo autorizado na inbox, LLM e STT configurados. TTS permite responder em voz. Falha de transcrição solicita texto; falha de voz usa texto e registra nota interna. Não há retomada automática do bot.
- Comercial distingue Pessoa Física e Jurídica e tenta vender na conversa. Encaminha ao humano quando solicitado ou sem condições de resolver. Sem agente configurado, usa a equipe comercial e os contatos de contingência.
- Bot e IA usam o protocolo real do atendimento; nunca inventam números.

## Configuração
Governança → Continuidade · humano e IA: padrão de 120 segundos sem aceite humano para oferecer ajuda da IA; 300 segundos de inatividade para retornar à fila. Valores globais ou por equipe. A conversa devolvida permanece humana, sem nova tomada automática. Agente precisa estar ativo e autorizado no canal. Aceitar a conversa interrompe a continuidade automática.

Governança → usuário/equipe: áreas permitidas, bloqueadas ou herdadas. Atendentes começam com Atendimento e CRM. Abrir uma área não concede automaticamente poderes administrativos. Visibilidade de Outros pode abranger equipe própria, equipes selecionadas ou todas, conforme permissão.

Agentes de IA → configurações: Usar prompt do cargo permite pré-visualizar e aplicar instruções de Assistente, Supervisor, SDR, Vendedor, Parceiro, Funcionário ou Coordenador. Aplicação substitui somente o texto do editor, após escolha explícita; salvar efetiva a mudança. Complete catálogo, preços, condições e regras da empresa.

## Painéis por departamento
Governança → Painéis por departamento vincula um painel existente à equipe. Criar o painel no CRM permite escolher Comercial, Suporte ou Financeiro. O vínculo cria um card por conversa/painel, sem recriar automaticamente um card já concluído.

- Comercial: Novo lead → Qualificação → Diagnóstico/proposta → Negociação → Contratação pendente → Conclusão. Oportunidade quando há interesse comercial.
- Suporte: Novo chamado → Triagem → Diagnóstico → Aguardando cliente/terceiro → Resolução → Conclusão. Ticket sempre; Kanban opcional para casos com etapas.
- Financeiro: Nova solicitação → Conferência → Análise → Negociação → Aguardando pagamento → Conciliação → Conclusão. Painel não substitui o status confirmado pelo Asaas/Stripe.

Referências: https://knowledge.hubspot.com/object-settings/set-up-and-customize-pipelines ; https://support.zendesk.com/hc/en-us/articles/8263915942938-About-the-ticket-lifecycle-and-ticket-statuses ; https://docs.asaas.com/docs/webhook-para-cobrancas

## Atualização e preservação
Migração 042 mantém IDs, chaves, canais e ativação. Guarda snapshot dos grafos e textos em settings `template:rules:before-042`. Atualiza a antiga verificação de telefone e os blocos comerciais padrão reconhecíveis, preserva nós personalizados e acrescenta o contrato operacional ao agente instalado do template Rastreabem. Não sobrescreve seu prompt. Migração 043 habilita painel financeiro.

Base para o manual: falta receber a capa antes da diagramação final. Testes automatizados usam dados sintéticos e APIs simuladas; a implantação ainda exige testar voz e consulta em cada inbox real.
