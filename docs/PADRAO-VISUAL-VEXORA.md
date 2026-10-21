# Padrão visual Véxora

Atualização: 21/10/2026. Referência interna: Central de Atendimento.

A suíte usa uma camada compartilhada em `web/design-system.css`, carregada depois dos estilos dos módulos em `index.html` e `platform.html`. O objetivo é manter a personalidade existente, com densidade e componentes previsíveis, sem migrar a aplicação para outro framework.

## Medidas comuns

- Menu principal: 58 px no desktop e 52 px no celular.
- Margem lateral: 18 px no desktop e 12 px no celular.
- Botões normais: altura mínima de 36 px e raio de 14 px.
- Ações secundárias pequenas: altura mínima de 30 px e raio de 11 px.
- Campos: altura mínima de 36 px e raio de 12 px; áreas de texto continuam expansíveis.
- Cards: raio de 16 a 18 px, bordas suaves e sombras discretas.
- Abas internas: altura independente do menu principal, rolagem horizontal quando necessário.

Os textos dos botões permanecem em uma linha. O grupo de ações pode quebrar de linha, mas não deve dividir a largura igualmente entre botões com textos diferentes. Evitar a regra global `.row > * { flex: 1 }` nos grupos de ações; manter essa regra apenas onde ela representa campos/formulários.

## Cores e interação

Usar `--ac`, `--ac-s`, `--card`, `--surface`, `--ln`, `--tx` e `--mu`. A marca continua configurável por empresa, inclusive no tema escuro. Seleção e hover usam a cor de destaque; foco de teclado permanece visível. Preservar as cores semânticas de etapas, pagamentos e etiquetas.

A conversa mantém sua própria geometria de mensagens, compositor e ferramentas; o menu principal segue o padrão compartilhado. Os formulários e modais usam os controles comuns, preservando os tamanhos específicos dos botões de fechar e das ferramentas de conversação.

## Ajustes de fluxo

- CRM: uma linha de controles em telas a partir de 1250 px; distribuição em linhas menores nas demais. Exportação e criação de painel usam ícones com nome acessível no celular. Kanban ganha área útil com cabeçalhos e rodapés compactos.
- Chatbots: ação Novo bot sem quebra de texto, filtros compactos, ações agrupadas e cards com o mesmo acabamento.
- Anúncios: arquivo de estilos corrigido (continha conteúdo JavaScript em vez de CSS); indicadores em grade, gráficos com altura explícita e tabelas responsivas.
- Marketing: abas Publicações / Calendário / Estúdio IA não herdam altura/largura do menu principal; aba ativa informa `aria-pressed`.
- Financeiro: navegação interna compacta, filtros e cabeçalho com os mesmos recuos.
- Governança, relatórios e administração de empresas: botões, campos, cards e cabeçalhos compartilham a mesma escala.

## Validação

Testes Chromium com APIs simuladas: Atendimento/CRM/Chatbots/Governança, Marketing/Anúncios, Financeiro, Campanhas, Sequências, administração e editor de agentes. Incluem desktop, celular, teclado, preservação de dados, ausência de sobreposição nos cabeçalhos auditados e limites de rolagem da página. Capturas de tela inspecionadas em claro e escuro. Nenhuma operação real de cobrança, postagem ou anúncio foi executada.

Referência de direção visual consultada: https://tailgrids.com/blog/tailwind-plus-alternatives . Nenhuma dependência Tailwind ou biblioteca adicional foi instalada.
