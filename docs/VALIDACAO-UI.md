# Renovação visual — 19/10/2026

Escopo: cabeçalho, inbox, CRM e editor de bots; nenhuma migração ou alteração de contrato da API nesta entrega. Inspirado nos padrões das imagens fornecidas, com identidade e ícones próprios.

## Verificado

- `node test/run.mjs`: passou.
- Sintaxe dos scripts do HTML e de web/modules.js: passou.
- Chromium headless com API HTTP simulada e dados fictícios: inbox, abertura de conversa, alternância de nota interna, seis cards do CRM, filtro por nome, tema escuro persistente após recarga, abertura/fechamento da ficha e retorno à lista em viewport 390×844.
- Editor: abertura de grafo com dois blocos, conexão renderizada e recolhimento do catálogo lateral.
- Capturas inspecionadas internamente: desktop 1440×950 e celular 390×844.
- Nenhum erro JavaScript de página durante o cenário. Dados de demonstração não foram incluídos no app de produção.

## Limites

Não validado nesta entrega: servidor completo com Postgres, Docker build, domínio do cliente, envio real por provedor, impressora física ou aparelhos reais. Os testes de UI não provam autorização nem isolamento. As lacunas de segurança registradas em AUDITORIA-INICIAL.md permanecem pendentes. O editor preserva o mecanismo de arrastar por mouse; edição completa por toque e acessibilidade do grafo ainda precisam de trabalho específico.

## Uso

Acesse Atendimentos, CRM ou Fluxos. A lua no cabeçalho alterna o tema, salvo neste navegador. No atendimento, o botão de ficha abre/recolhe o painel do contato; no celular, a seta retorna à lista. A nota interna abre em área separada pelo botão ao lado da ficha. No CRM, o seletor de etapa em cada card é uma alternativa ao arrastar. Clique no card para abrir sua conversa.
