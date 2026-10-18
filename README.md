# Nexora — CRM omnichannel com IA, modular por segmento

WhatsApp (**WAHA** + **Baileys**), Instagram e outras redes (**Zernio**), vários atendentes/times por número, agentes de IA (LLM/STT/TTS por agente), RAG, Google Agenda, Pipeline kanban automático, follow-ups, pagamentos (Asaas/Mercado Pago/Stripe), Meta Ads, catálogo/pedidos e **verticais** (barbearia, clínica, advocacia, delivery, escola, música, loja, beleza) que renomeiam cliente→paciente/aluno e o funil.

## Subir (Dokploy / Portainer / local)
```bash
cp .env.example .env   # edite segredos e PUBLIC_URL
docker compose up -d --build   # app + Postgres(pgvector) + WAHA
```
Abra `http://localhost:3000` → crie o dono. **Um cliente = uma stack = um banco próprio** (estilo WordPress):
`./scripts/new-client.sh barbearia-joao 3101 https://crm.joao.com`

## Primeiros passos
1. **Ajustes → Canais**: crie `waha` (`{"url":"http://waha:3000","key":"<WAHA_KEY>","session":"default"}`), `baileys` (`{}`) ou `zernio` (`{"key":"…","platform":"instagram"}`) → informe o ID → *Conectar / QR*.
2. **Ajustes → Integrações**: `pay`, `meta`, `embed` (embeddings para RAG; sem isso usa busca por palavra).
3. **Agente IA**: crie o agente, vincule IDs de canais, configure LLM/STT/TTS (qualquer API compatível OpenAI ou Anthropic; `llm` aceita lista JSON = fallback entre provedores) e adicione conhecimento.
4. **Ajustes → Segmento**: escolha o vertical.

## Como funciona
- Texto→texto; **áudio→transcreve (STT)→responde em áudio (TTS)**.
- A IA age por ações: mover etapa, transferir (handoff), convidar atendente, agendar (checa conflito no banco e no Google Agenda), preencher ficha.
- Humano ↔ IA ↔ humano: atribuir, devolver à IA, convidar outro atendente; **chat interno privado** na própria tela (painel inferior).
- Automações: gatilho por etapa/novo contato; passos `wait/send/ai/move/assign`; cliente respondeu ⇒ follow-up cancela. Pagamento confirmado ⇒ card vai para etapa "ganho".
- Pedidos externos (iFood/Keeta/99Food via parceiro ou n8n): `POST /webhook/order/{origem}`.
- White-label: nome, cor (tons derivados e contraste automáticos), fonte e logo em Ajustes → Marca.

## Status honesto (MVP v0.1 — não testado em produção)
- Zernio: endpoints/webhook em `src/drivers/zernio.js` seguem formato presumido — **confira na doc da Zernio**. Reações/DM/comentários dependem disso.
- iFood/Keeta/99Food exigem credenciais de parceiro; aqui há só o webhook genérico de pedidos.
- Mercado Pago: confirmação de pagamento precisa ser mapeada (comentado em `payments.js`). Stripe: valide assinatura do webhook antes de produção.
- Só Postgres (pgvector). MySQL/MariaDB não suportados.
- Baileys é API não oficial: risco de banimento. Use WAHA/oficial para volume.
- Anúncios Meta: cria campanha pausada; conjuntos/criativos ainda manuais.
- Segurança: troque `JWT_SECRET`, ponha HTTPS (proxy do Dokploy) e proteja `/webhook/*` com segredo na URL em produção.
