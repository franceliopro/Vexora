# Néxora — estrutura do produto

Decisão de 19/10/2026. Venda direta do proprietário da Néxora às empresas finais. Personalização de marca não é revenda.

| Módulo | Escopo e estado desta entrega |
|---|---|
| 1. Central de Atendimento | Inbox e controle por conversa existentes. Processo completo e governança de três perfis especificados em PROCESSO-ATENDIMENTO.md; implementação fina ainda pendente. |
| 2. CRM | Kanban e dados das conversas existentes. CRM avançado permanece no backlog. |
| 3. Inteligência e Rastreamento de Leads | Acesso a contatos e indicadores existentes. Tracking/UTM/atribuição ainda não implementados. |
| 4. Agentes de IA | Configuração existente; templates acrescentam instruções, tom, regras e proibições em rascunho. |
| 5. Chatbots | Editor existente; criação manual ou por template, sempre desativado até configurar. |
| 6. Campanhas | Área dedicada em preparação. Publicações/anúncios existentes continuam acessíveis; isso não equivale a campanha WhatsApp. |
| 7. Sequências | Acesso às automações existentes; construtor guiado de cadências e calendário ainda pendente. |
| 8. Mensagens Agendadas | Área dedicada em preparação; ainda não executa agendamentos pontuais. |
| 9. Integração e API | Canais, configurações e webhooks existentes; API pública/OpenAPI ainda pendentes. |
| 10. Pagamentos | Provedores e cobrança recorrente existentes, com validação externa ainda pendente. |
| 11. Personalização para cada Cliente | Nome, cor, fonte, logo claro, logo escuro e favicon independentes. |

## Como interpretar os 11 pontos

Os 11 pontos representam a sequência de organização e evolução do produto. Não exigem uma tela independente para cada ponto. Os fluxos e as telas serão definidos a partir das explicações e referências do proprietário. A navegação mantém os acessos existentes em uma faixa única, com rolagem e controles quando faltar espaço, sem o agrupamento “Mais módulos”. Não ampliar o CRM antes de receber sua especificação. A referência visual deve preservar estrutura, proporções e comportamento solicitados, com marca, tipografia, cores e acabamento próprios da Néxora.

## Empresas e acesso master

Abrir `/platform.html` na instalação e usar a chave PLATFORM_KEY existente. A chave fica na memória da página; não é gravada em localStorage. O atalho Gerenciar empresas fica no menu de conta dos administradores; o atalho não concede o acesso master.

O painel cadastra empresa, domínio, responsável inicial e template opcional. Em Gerenciar, permite cadastrar atendentes, criar IA em rascunho, editar instruções/tom/regras/proibições, criar chatbot em branco e aplicar templates. Modelos e canais do agente e o grafo completo do bot são configurados no painel da empresa, com login próprio; não há impersonação silenciosa.

Não há painel de revendedor, comissão ou criação de subempresas por clientes.

## Templates substituem segmentos

Os modelos são configurações opcionais: comercial, clínica (recepção administrativa), advocacia (recepção), educação, delivery e suporte. Criam um agente e um fluxo inicial em transação; ambos desativados, sem canal e sem API key. Cada template tem tom, prompt, regras e proibições. Revisar e preencher o conhecimento da empresa antes de ativar.

A aplicação não sobrescreve registros nem renomeia etapas/clientes. Aplicar novamente o mesmo modelo retorna os IDs originais. Se o usuário apagar um desses registros, o template não será recriado automaticamente por cima de mudanças; manutenção da instalação fica explícita.

O seletor de segmentos e os seletores de módulos por segmento foram retirados da UI. A rota antiga de troca de vertical retorna 410. Dados legados de escola/delivery e configurações antigas são preservados, com caminhos de compatibilidade. Novas empresas recebem funil genérico.

## Marca

Logotipo claro, logotipo escuro e favicon são três campos independentes. Sem favicon cadastrado, gerar ícone com a inicial da marca, sem reutilizar o logo. No modo escuro, usar logo escuro se cadastrado; caso contrário, usar o claro. Upload de PNG/JPEG/WebP/ICO até 1 MB por arquivo; SVG não é aceito. URLs HTTPS e caminhos locais de mídia continuam compatíveis.

## Validação

- `node test/run.mjs`: testes existentes e testes puros de produto/templates.
- `node test/workspaces.mjs`: contrato HTTP do painel master com transação de banco simulada.
- Chromium: navegação dos 11 módulos, remoção de segmentos, separação de assets, templates, cadastro/gestão master e viewport mobile, com API simulada.
- Não validado: transações e migrações em Postgres real, build Docker, domínio de produção ou APIs externas. Sem migração destrutiva nesta entrega.

## Atendimento e fuso (atualização)

[Processo de atendimento](PROCESSO-ATENDIMENTO.md) é a referência detalhada antes de avançar ao CRM. O fuso da empresa pode ser escolhido no cadastro/gestão master e em Personalização. Bot/IA e hora das mensagens usam essa configuração; integrações de agenda/relatórios/regras legadas ainda exigem uniformização. Para o cliente de rastreamento, escolher `America/Cuiaba`.
