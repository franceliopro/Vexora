# Navegação e anúncios — 21/10/2026

## Navegação principal
- Atendimento: operação da conversa, sem mudança de responsabilidade.
- CRM: Painéis, Contatos, Origem dos leads, Relatórios.
- Automação: Chatbots, Agentes de IA, Campanhas de mensagens, Sequências.
- Marketing: Postagens (inclui Estúdio IA), Anúncios e resultados.
- Financeiro: gestão de recebimentos, clientes e automações financeiras.
- Configurações: Conexões e API, Marca e aparência, Equipe e permissões.

As permissões dos recursos continuam separadas. Um grupo só aparece quando há ao menos um recurso permitido; abrir o grupo não concede acesso às outras abas. Links antigos continuam válidos, inclusive o editor avançado de follow-up. Foto e senha pessoais continuam no menu do avatar. Nenhum dado foi excluído ou migrado para fora de sua empresa.

## Conectar anúncios
Marketing → Anúncios e resultados → Conectar conta.

Cada empresa usa suas contas e credenciais. Todas as chaves são cifradas; a leitura do painel retorna somente nomes das credenciais salvas. O acesso exige administrador e permissão de Marketing. Não são reutilizadas as credenciais da conexão gerenciada de redes sociais nem se expõe seu provedor às empresas.

### Meta
1. Prepare o aplicativo Meta com Marketing API e os acessos à conta de anúncios e à página.
2. Informe o nome e ID da conta (act_...). API padrão: v26.0.
3. Use token com ads_read/ads_management e acesso à conta/página, ou configure ID e segredo do aplicativo para OAuth.
4. Cadastre no aplicativo a URL de retorno mostrada na tela.
5. Salve; em Conexão e autorização, autorize se usar OAuth e clique Testar conexão.

Uma conta Instagram conectada para mensagens ou postagens não concede automaticamente o acesso publicitário. O token pode expirar; teste a conexão e reconecte quando necessário. A revisão do aplicativo/permissões é realizada pela Meta.

### Google Ads
1. No Google Cloud habilite a Google Ads API e crie cliente OAuth Web.
2. Cadastre a URL de retorno mostrada no painel. Ela usa o PUBLIC_URL já configurado da Véxora, com caminho /advertising/google/callback.
3. Obtenha um developer token na Central de API da conta administradora do Google Ads.
4. Informe ID da conta anunciante, client ID, client secret e developer token. Se acessar pela conta administradora, informe login customer ID.
5. Salve, abra Conexão e autorização, clique Autorizar Google e depois Testar conexão.

Developer token e OAuth são autorizações diferentes. O acesso de produção depende da aprovação do developer token e das permissões da conta. O fluxo usa acesso offline para renovar o token sem pedir login a cada consulta. Os campos ficam no painel; não é necessário editar variáveis no Dokploy para cada cliente.

## Criar e revisar
A criação inicial suporta:
- Meta: tráfego para site com imagem, público por país, página Facebook, título e mensagem. Cria campanha, imagem, conjunto, criativo e anúncio pausados. Pode escolher uma imagem já cadastrada em Postagens.
- Google: Pesquisa com orçamento, grupo de anúncios, palavras-chave em correspondência de frase e anúncio responsivo. Mínimo de três títulos e duas descrições, com limites oficiais. Brasil/português são os padrões; IDs geográficos e de idioma podem ser configurados. Estratégia: Maximizar cliques.

A criação Google é validada antes da gravação nativa e usa mutate atômico, sem falhas parciais. A Meta confirma e grava cada etapa. Salvar rascunho não cria anúncio externo. Criar estrutura pausada não inicia consumo de verba. A criação suporta contas BRL, USD e EUR; outras moedas podem ser consultadas, sem conversão presumida. Outros tipos, como Performance Max, Shopping, vídeo ou carrossel de mídia paga, ficam no gerenciador nativo nesta entrega.

As UTMs são opcionais e preservam parâmetros já informados. Para associar a origem a um lead/conversa, o site ou formulário precisa enviar os eventos à Véxora; a presença da UTM isolada não cria uma atribuição automaticamente. Conversões e valores dependem de Pixel/GA4 ou integração equivalente.

## Ativar ou pausar
Ativar exige digitar o nome e revisar o orçamento. Antes de ativar, a Véxora consulta o orçamento atual na plataforma. Se tiver mudado, atualiza o valor local e bloqueia até nova revisão. Orçamentos não confirmados não podem ser ativados. A revisão em uma janela antiga não autoriza um valor novo.

Após ativar e a plataforma aprovar, pode haver consumo de verba. Orçamento diário segue as regras da Meta/Google e não deve ser tratado como teto rígido de gasto por dia. Pausar solicita interrupção na plataforma; não apaga dados. Campanhas importadas com orçamento distribuído em conjuntos não identificados podem precisar de revisão no gerenciador nativo.

## Dashboard
Escolha conta e período e clique Sincronizar métricas. O painel mostra investimento, impressões, cliques, resultados, CTR, CPC, custo por resultado e ROAS quando houver dados de valor. Exibe curvas diárias, resultados por campanha, moeda, fuso, período sincronizado e histórico de ações.

- As moedas não são somadas nem convertidas entre contas.
- Sem importação, aparece ausência de dados; não há números gerados pela IA.
- Meta usa leads ou compras reportadas; Google usa as conversões configuradas. Janelas e definições de atribuição podem diferir.
- Resultado de mídia não é venda no CRM. Receita atribuída exige integração de eventos e configuração correta.
- Não se soma alcance diário para inventar alcance único do período.
- Campanhas históricas com métricas, mesmo não listadas no catálogo atual, permanecem identificadas no relatório.

No mobile, conta/período ficam recolhidos em filtros para dar mais espaço aos indicadores. Os gráficos têm valores por dia acessíveis também em texto.

## Respostas incertas
Operações de escrita sem confirmação não são repetidas automaticamente. A campanha fica em Conferir na plataforma. Erros de campo confirmados antes de criar mantêm o rascunho; na Meta, uma rejeição explícita após etapas já confirmadas preserva a estrutura pausada parcial. Corrija a causa e confira o gerenciador antes de continuar. Não recrie às cegas.

O fluxo antigo /api/ads/... não cria mais campanhas por fora desta revisão. A tabela antiga permanece preservada; sincronizar a conta importa as campanhas nativas para o novo painel.

## Verificação
Testes de PostgreSQL/WASM com RLS: cofre, OAuth de uso único, criação pausada Meta em cinco etapas, Google validado antes da criação, confirmação de orçamento/ativação, criação única, importação, moeda, métricas e falha ambígua. Testes Chromium: seis menus, agrupamento, rascunho, revisão, ativação simulada, conexões, gráficos e mobile; regressões de atendimento e edição de agentes. Nenhum anúncio foi criado e nenhuma verba foi consumida em contas reais durante a validação. A homologação real depende das credenciais e aprovações da empresa.

## Fontes oficiais
- https://developers.facebook.com/docs/marketing-api/reference/v26.0
- https://developers.facebook.com/blog/post/2026/07/29/introducing-graph-api-v26-and-marketing-api-v26/
- https://www.postman.com/meta/facebook-marketing-api/overview
- https://developers.google.com/google-ads/api/docs/campaigns/create-campaigns
- https://developers.google.com/google-ads/api/rest/examples
- https://developers.google.com/google-ads/api/docs/api-policy/developer-token
