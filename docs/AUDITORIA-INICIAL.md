# Auditoria inicial — 19/10/2026

Base inspecionada: main em 03673dbb9830bccea7df5e6bb4cfae1299028849.

## Evidência obtida

O main já contém migração 003, motor/editor de bots, cobrança recorrente, escola e delivery. A conversa anterior descreve um momento anterior ao envio desses módulos. Foram lidos os 43 arquivos do repositório e executado `node test/run.mjs`: TODOS OS TESTES OK. Esse resultado cobre funções puras e simulação de bots; não prova servidor, provedores ou deploy. Não há lockfile nem workflow CI no estado inspecionado.

## Lacunas identificadas por leitura de código

- src/server.js: rotas de mensagens/envio/alteração/convite não aplicam autorização individual de conversa. A listagem scope=team inclui conversas assumidas de colegas.
- src/bus.js: eventos de mensagens são enviados a todos os sockets da mesma empresa, sem escopo individual.
- src/server.js: admins da empresa podem mudar segmento e settings/modules; diverge da concessão exclusiva do master.
- src/media.js e server.js: mídia estática sem autorização. Segredos de provedores em JSON sem criptografia.
- server.js/payments.js: integrações e webhooks requerem validação contra provedores. Não confirmar segurança de pagamentos só pelo HMAC da URL.
- docker-compose.yml usa build local; não há stack Swarm específica.

## Continuidade

1. Atualizar modelo comercial: venda direta, sem revendedores; manter marca por empresa.
2. Renovar UI mantendo rotas e esquema, com teste visual sobre API simulada claramente identificado.
3. Executar servidor com Postgres real, CI e testes de integração; corrigir autorização por conversa e WebSocket, tomada exclusiva e controle de módulos.
4. Segredos, mídia, fila e instalação Swarm; depois ampliar IA e módulos.

Não usar dados reais de clientes para validar o isolamento antes de corrigir as lacunas. Esta auditoria é inicial e não uma certificação de segurança ou paridade funcional.
