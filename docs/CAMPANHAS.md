# Campanhas — operação

Abra **Campanhas → Nova campanha**. O cadastro tem quatro etapas:

1. **Canal e equipe:** escolha a inbox de envio e a equipe que receberá novos atendimentos. Conversas com responsável já definido não são transferidas pela campanha.
2. **Público:** selecione contatos da inbox ou todos os contatos de um filtro (nome/etiqueta). O limite desta versão é 10 mil contatos por campanha. A autorização é registrada em Registrar permissão / descadastro, com origem da autorização. Um telefone cadastrado não equivale a permissão.
3. **Mensagem:** texto com variáveis de contato ou template aprovado. Mensagens livres exigem última mensagem recebida há menos de 24 horas; a regra conservadora se aplica também aos canais por sessão. Templates fora da janela estão disponíveis no WhatsApp oficial direto: informe o WABA uma vez, busque os modelos aprovados e preencha seus parâmetros. São listados os primeiros 100 modelos, sem mídia, cabeçalho variável ou botão dinâmico nesta entrega.
4. **Programação:** data/hora no fuso escolhido, prazo, intervalo (mínimo 5 segundos), limite diário de tentativas por inbox, dias/horários, exceções e política para conversas ativas. O padrão é não enviar a conversas ativas. O calendário pode ter vários intervalos via API; a tela edita um intervalo por dia e preserva intervalos adicionais existentes se não forem alterados.

Salvar cria um rascunho. **Revisar e ativar** mostra contatos elegíveis e motivos de exclusão. Só a confirmação ativa a fila. O público fica congelado, e consentimento, janela do canal, conversa ativa e estado da inbox são verificados novamente antes do envio. Não há importação de números arbitrários para outra rede nem tentativa automática de descobrir identidades.

## Acompanhamento
- **Contatos:** todos os contatos incluídos no público congelado.
- **Enviadas:** canal retornou identificação do envio.
- **Entregues / Lidas:** recibos reais, cumulativos; leitura também conta entrega. Disponíveis nos adaptadores de Baileys, WAHA e WhatsApp Meta direto. Nos demais aparece “—”, nunca uma confirmação inventada.
- **Interagiram:** mensagem recebida no mesmo canal em até sete dias após a tentativa de envio confirmada, atribuída somente à campanha mais recente. É uma regra de atribuição, não prova causal de conversão.
- **Não enviadas:** exclusões por regra, prazo ou descadastro, com motivo por contato.

Abra **Ver resultados**, clique no indicador para filtrar contatos e use Carregar mais contatos / Histórico anterior para consultar todos os registros. A conversa de origem fica disponível ao lado do contato. Atualizações da campanha e dos recibos chegam por eventos, sem recarregar a página.

**Pausar** impede novas tentativas; uma chamada já iniciada pode terminar. **Cancelar** encerra os pendentes. Timeout, falha ou ausência de ID do provedor deixam o item em conferência e pausam a campanha. Confira conversa/canal antes de autorizar nova tentativa; a fila não repete chamadas ambíguas sozinha. O intervalo é compartilhado entre campanhas da mesma inbox. Responder SAIR, PARAR, STOP ou CANCELAR CAMPANHAS registra descadastro e impede os próximos disparos.

## Regras e limites
Nenhuma cadência garante ausência de bloqueios. Baileys/WAHA são conexões por sessão, não API Oficial, e não devem ser apresentados como solução oficial para escala. Instagram/Messenger não recebem disparos frios fora da janela de mensagens desta implementação. As restrições de conta, qualidade, preços e permissões do fornecedor continuam valendo. Publicações em redes e acionamentos legados de chatbot são operações separadas; o atalho para chatbot foi preservado.

Referências consultadas em 21/10/2026:
- https://business.whatsapp.com/policy — consentimento, descadastro e templates fora da janela.
- https://www.twilio.com/docs/messaging/features/message-scheduling — programação de mensagens.
- https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks — distinguir envio, entrega e leitura.
- https://docs.zernio.com/messages/send-inbox-message — contrato de mensagens e limitações por plataforma.
- https://www.helenacrm.com/ — integração entre canais, atendimento e CRM; as imagens fornecidas orientaram a organização dos formulários.

A fila é persistida e isolada por empresa (RLS), com ledger anterior a efeitos externos, controle de cadência por inbox, histórico e snapshots. Não foram feitos envios reais nesta implementação: testes usam banco descartável, transporte e APIs simulados.
