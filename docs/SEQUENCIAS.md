# Sequências de relacionamento

Acesse **Workflows → Follow-up**. Campanhas são envios pontuais; sequências mantêm um cronograma individual por participante.

1. Clique em **Nova sequência**, informe nome, inbox, equipe das novas respostas e fuso.
2. Adicione etapas. Cada etapa pode conter texto, template aprovado da Meta ou chatbot autorizado para a origem **Sequências**.
3. Defina a espera em segundos, minutos, horas ou dias. Zero inicia imediatamente. Na primeira etapa, a espera parte da inclusão; nas demais, parte da conclusão da anterior.
4. Abra **Horários, cadência e comportamento** para escolher dias, datas sem envio, horários, intervalo mínimo, limite diário e tratamento de conversas ativas. Uma etapa pode ter seu próprio horário.
5. Salve o rascunho e depois ative. **Ativar não inclui contatos nem envia mensagens.**
6. Abra **Participantes e histórico → Incluir contatos**. A inclusão e remoção são manuais, por inbox e com permissão registrada. Repetir a inclusão de um participante ativo não reinicia sua jornada.
7. Pause, retome ou remova cada participante. Finalizar a sequência encerra os próximos envios de todos; não apaga o histórico. Chamadas que já estavam em andamento podem terminar.

Por padrão, uma resposta encerra os próximos passos. Uma resposta dentro de um chatbot continua no fluxo, que deve terminar antes da próxima etapa. O controle humano impede iniciar um bot automaticamente.

Cada participante guarda a versão das etapas no momento da inclusão. Depois de ativar, use **Duplicar** para editar uma nova versão; as pessoas em andamento mantêm sua jornada original.

## Canais e confirmações

A fila de mensagens usa o mesmo mecanismo das campanhas: consentimento, janela de atendimento, cadência por inbox e registro antes do envio. Texto e início de chatbot exigem mensagem recente do cliente (24 horas); para retomar em outro dia no WhatsApp oficial, utilize template aprovado. Não use a cadência como promessa de proteção contra bloqueios.

Um envio sem confirmação de aceitação pausa para revisão, sem repetição automática. **Ver envio da etapa** abre os recibos disponíveis. Uma etapa bloqueada pode ser pulada explicitamente pelo administrador. Bots interrompidos também exigem revisão.

**Fluxos avançados** preserva o editor gráfico de follow-up anterior. Nenhum fluxo ou participante antigo é convertido ou excluído automaticamente.

Testes: `test/journey-policy.mjs`, `test/journeys-postgres.mjs`, `test/journeys-browser.mjs`. Banco PostgreSQL compatível e navegador com APIs simuladas; não atestam entrega real no canal.
