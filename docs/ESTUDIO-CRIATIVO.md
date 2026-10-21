# Estúdio criativo da Véxora

## Onde entrar
Postagens → ✦ Estúdio IA. Publicações e Calendário continuam disponíveis para revisão, resultados e cancelamento dos agendamentos.

## Preparação pelo painel
1. Em Conexões criativas escolha um agente ativo com chave/modelo de texto. Ele será usado somente para elaborar pesquisa, título, legenda e direção de arte.
2. A marca, cor e fonte cadastradas na empresa são incorporadas automaticamente, assim como seu logotipo quando armazenado como imagem incorporada. Complete a identidade: paleta HEX, público, tom, diferenciais e CTA. Adicione um arquivo do logotipo à biblioteca para usá-lo como referência visual.
3. Imagem: chave OpenRouter e modelo visual, inicialmente `google/gemini-2.5-flash-image`. A chave do agente OpenRouter pode ser reutilizada. Um LLM de texto isolado não gera arte.
4. Pesquisa atual: chave Tavily. Sem ela, desmarque a pesquisa e use o assunto/referências fornecidos. O sistema não inventa resultados de busca.
5. Vídeos: chave xAI e modelo `grok-imagine-video-1.5`. Se o agente escolhido já usa Grok, sua chave pode ser reutilizada. A renderização é assíncrona.
6. Conecte as redes contratadas em Integrações; elas aparecerão como destinos. A infraestrutura de publicação permanece oculta para a empresa.

As chaves ficam cifradas e não retornam na leitura da configuração. Todos os itens pertencem à empresa autenticada. Não é necessário recorrer ao Dokploy para preencher estas chaves.

## Biblioteca de inspiração
Até 20 referências por empresa: arraste imagens PNG/JPEG/WebP de até 3 MB, ou informe links públicos de sites, posts e perfis. Escreva o que deseja aproveitar: hierarquia, paleta, enquadramento, iluminação. As imagens são armazenadas para uso posterior; até cinco referências visuais são passadas ao modelo em cada arte, priorizando as selecionadas pelo usuário.

Links são consultados com bloqueio a endereços privados. Perfis privados e páginas que exigem login ou bloqueiam a leitura não são acessíveis por essa pesquisa; a interface identifica referências não consultadas. Para esses casos, envie a imagem no painel. A ferramenta cria composições próprias; não reproduz automaticamente um criativo de terceiros.

## Criar a partir de um prompt
Em Criar com IA informe assunto, objetivo e público, escolha redes, referências e formato:
- Flyer: uma imagem vertical 4:5.
- Carrossel: três artes com gancho, desenvolvimento e chamada para ação.
- Vídeo: roteiro e vídeo vertical 9:16 de cinco segundos.

Título, legenda e textos da arte são elaborados em PT-BR. A pesquisa traduz consultas para inglês e alterna chinês, coreano, russo ou alemão entre os trabalhos, além de uma consulta para referências públicas do Instagram. Utiliza fontes indexadas, não uma cópia integral de todos os sites ou perfis. Links, resumos e imagens de inspiração encontrados ficam registrados no trabalho.

A geração usa APIs pagas configuradas na empresa. Não há promessa de conversão ou alcance. Reserve alguns minutos antes do horário de publicação; se o horário passar durante a geração, o conteúdo fica como rascunho para revisão.

## Grade semanal
Configure até três horários por dia e o formato de cada um. Exemplo: segunda 09h carrossel, quarta 12h flyer, quinta 18h vídeo. O fuso é configurável, inclusive America/Cuiaba.

A grade ativa prepara os próximos sete dias. Cada horário gera um trabalho único. Os temas variam a partir do briefing, das fontes e dos títulos recentes. A fila realiza pesquisa → texto → arte(s) → publicação. Nenhuma atualização completa da página é necessária; Atualizar resultados mostra os novos estados.

Sem marcar autorização automática, o resultado fica em Publicações como rascunho para editar/revisar. Marcando a autorização, o sistema envia a publicação ou o agendamento às contas selecionadas após completar a geração. A confirmação real de cada rede continua na aba Publicações.

Pausar a grade impede novas criações e cancela trabalhos ainda na fila. Uma geração em andamento pode terminar a chamada já iniciada. Agendamentos que já foram confirmados precisam ser cancelados em Publicações.

## Falhas e continuidade
Uma geração interrompida fica para conferência; não é repetida automaticamente. Vídeo com identificador confirmado é acompanhado por consultas, sem criar outro vídeo. Envio sem confirmação fica em Conferir resultado; não se repete uma postagem incerta. Alteração ou desativação do usuário responsável impede novos envios automáticos da fila.

## Validação desta entrega
Testes com PostgreSQL/WASM e APIs simuladas cobrem isolamento por empresa, carrossel, vídeo, agenda/fuso, publicação única, resposta ambígua e chaves ocultas. Interface verificada em desktop e mobile. Não foram consumidos créditos nem publicadas postagens reais durante os testes. A geração e publicação reais dependem de saldo/permissões nos provedores e contas configurados.

## Documentação consultada
- https://galilai.com.br/ — referência de experiência de criação, identidade e publicação.
- https://openrouter.ai/docs/guides/overview/multimodal/image-generation — API nativa de imagens e referências.
- https://docs.x.ai/developers/model-capabilities/video/generation — geração e acompanhamento de vídeo.
- https://docs.tavily.com/documentation/api-reference/endpoint/search — pesquisa pública.
- https://docs.zernio.com/guides/media-uploads — upload e agendamento; janela de até sete dias para as mídias temporárias.
