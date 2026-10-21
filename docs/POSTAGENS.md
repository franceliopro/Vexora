# Publicações sociais na Véxora

Entrega inicial: criação, revisão, upload, publicação imediata, agendamento e resultado por rede. Não inclui criação automática de artes por tema, pesquisa editorial, campanhas pagas ou gestão de orçamento. Esses itens continuam no plano do Estúdio de Conteúdo em ESTUDIO-SOCIAL.md.

## Como usar

1. O master configura as contas sociais da empresa. A tela Postagens mostra apenas canais ativos atribuídos à própria empresa; a chave do fornecedor permanece no servidor.
2. Abra **Postagens → Nova publicação**. Informe um título interno, a legenda e as contas que receberão a publicação.
3. Selecione as fotos ou vídeos no computador/celular. Até10 arquivos por post e20 MB por arquivo na Véxora; a rede pode impor outras restrições de proporção, quantidade, duração e formato. Esta entrega usa o formato padrão de publicação do provedor; não há controles específicos de Stories/Reels/carrossel por rede.
4. Escolha publicar após revisão ou agendar. Selecione o fuso correto, por exemplo America/Cuiaba, e data/hora. A conversão para UTC é explícita. Agendamentos passados são rejeitados para evitar publicação imediata acidental.
5. **Salvar rascunho** somente salva. Abra **Revisar publicação/agendamento**, confira o conteúdo e todas as contas e confirme o envio.
6. Acompanhe os estados: rascunho, encaminhando, agendado, publicando, publicado, parcial, falhou, conferir resultado ou cancelado. Um agendamento não é mostrado como publicado.
7. **Conferir resultado** consulta o registro remoto e os links públicos por rede. A reconciliação de estados roda periodicamente no servidor (até3 registros por empresa por ciclo, leitura, sem repetir publicações). O painel não dá F5.
8. Em **Resultados**, consulte métricas orgânicas do post: impressões, alcance, visualizações, cliques e gráficos de curtidas/comentários/compartilhamentos/salvamentos quando fornecidos pela rede e liberados na conexão. Métrica ausente não vira zero. Não representa atribuição de vendas nem ROAS.

## Agenda e cancelamento

O calendário é uma visão cronológica dos registros carregados. A lista carrega50 por página e permite buscar/sortear por situação; use Carregar anteriores para os demais. Busca e filtro atuam nos registros carregados. O fuso aparece no cartão e na revisão. O agendamento efetivo é mantido pelo fornecedor, portanto não exige manter o navegador aberto.

Rascunhos podem ser editados com controle de versão. Depois de encaminhar, o conteúdo fica imutável nesta entrega. Para cancelar, confirme o cancelamento de um rascunho ou agendamento. Antes de cancelar remotamente, o estado é consultado de novo. Um envio já iniciado pela rede pode ser concluído apesar do cancelamento. A função não remove posts publicados; não confundir cancelar o agendamento com excluir uma postagem pública.

## Arquivos e segurança de envio

Uploads usam presign e PUT pelo servidor. A mídia temporária expira após7dias: salve e confirme o post dentro desse prazo. O fornecedor copia a mídia referenciada por um post encaminhado para armazenamento durável, inclusive quando o agendamento é futuro. A prévia é ilustrativa; confirme o resultado na própria rede.

A operação registra uma UUID Idempotency-Key no servidor, muda para encaminhando antes da chamada e guarda ID/resultado remoto. Clique repetido não publica novamente. Em timeout/retorno sem confirmação, o estado fica Conferir resultado; não há reenvio automático que possa duplicar o conteúdo. A administração deve conferir o registro remoto antes de liberar uma nova tentativa. Interrupções de envio pendentes acima de5min são marcadas para revisão.

A migração041 adiciona social_publications com RLS. Contas são validadas por empresa e inbox ativa. Métricas filtram os identificadores das contas autorizadas; não usamos um dashboard global com a chave central para retornar dados de outras empresas.

O CRUD social antigo permanece no banco. O endpoint de publicação legado foi bloqueado para não marcar publicado com payload desatualizado. Registros antigos não são migrados automaticamente para novos envios.

## Implantação e validação

Deploy normal do repositório; migração041 aplica automaticamente no startup. As conexões existentes são reutilizadas. Nenhuma nova variável no Dokploy é necessária se o provedor já estiver configurado pelo master. Analytics pode exigir liberação adicional da conta/plano; mensagens de falta de permissão aparecem na tela.

Testes usam PostgreSQL compatível com RLS, APIs simuladas e Chromium desktop/mobile. Validam revisão, fuso de Cuiabá, contas de outra empresa, idempotência, falha ambígua, rascunho e resultados/métricas. Nenhuma postagem pública foi enviada durante os testes. A primeira publicação real deve ser um conteúdo escolhido e revisado pelo usuário.

Fontes oficiais:
- https://docs.zernio.com/posts/create-post
- https://docs.zernio.com/posts/get-post
- https://docs.zernio.com/posts/delete-post
- https://docs.zernio.com/guides/media-uploads
- https://docs.zernio.com/analytics/get-analytics
