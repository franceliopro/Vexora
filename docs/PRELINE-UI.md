# Preline UI na Véxora — primeira etapa

## Escopo

Postagens, Calendário e Estúdio IA usam componentes compartilhados em `web/preline-ui.js` e estilos Tailwind compilados em `web/preline-ui.css`. O plugin oficial de abas Preline UI 5.0.0 é distribuído localmente em `web/vendor/preline-tabs.js`, com a licença ao lado. As abas têm papéis e painéis acessíveis, navegação por setas e limpeza ao trocar de seção.

O restante da suíte continua no padrão anterior nesta primeira etapa. O CSS e os efeitos do CRM não foram alterados: cores por etapa, hover de bordas/títulos, brilho ao arrastar e indicador de área receptora permanecem próprios da Véxora. Não há reset global Tailwind/preflight nem inicialização automática de plugins sobre a aplicação inteira. As classes da nova UI são prefixadas/limitadas a `vx-ui` e as cores continuam ligadas à marca da empresa.

## Reprodução dos arquivos

Ferramentas isoladas em `tools/ui`, fora das dependências do servidor:

```sh
npm ci --prefix tools/ui
node tools/ui/build.mjs
```

Versões fixadas: Preline UI 5.0.0, Tailwind CLI 4.3.3 e Forms 0.5.11. O pacote Preline declara Node 22.22.2 para suas ferramentas; o build pode ser executado nesse ambiente. O container da aplicação não precisa instalar essas ferramentas: os assets compilados estão versionados e são servidos localmente. Não há CDN ou compilador Tailwind no navegador.

`tools/ui/input.css` é a fonte dos estilos; não editar o CSS compilado à mão. `build.mjs` copia o plugin oficial sem alterar a lógica dele, encapsulando sua exportação CommonJS para evitar nomes globais genéricos. Licenças preservadas.

## Comportamento preservado

- Upload, escolha das contas, rascunhos, prévia, revisão e agendamento.
- Geração de artes e legendas, biblioteca de referências, grade semanal e conexões criativas.
- Datas/fusos, publicação e confirmação pelos provedores.
- Dados e credenciais existentes; nenhuma migração de banco.

## Verificação

Testes do Estúdio/Postagens em Chromium desktop/mobile com APIs simuladas, incluindo upload, revisão, calendário, grade semanal, geração, contas, abas por teclado e troca de rota. Regressão de Atendimento/CRM cobre hover por etapa, brilho ao arrastar, alinhamento de colunas e navegação integrada. Nenhuma publicação ou cobrança real foi executada.

Documentação consultada: https://preline.co/docs/ e https://preline.co/plugins/tabs.html .
