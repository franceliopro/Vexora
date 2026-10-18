# Nexora — CRM omnichannel com IA (multiempresa isolado)

WhatsApp (**WAHA** + **Baileys**), Instagram e outras redes (**Zernio**), vários atendentes e times por número, agentes de IA (LLM/STT/TTS por agente), RAG, Google Agenda, kanban automático, follow-ups, pagamentos (Asaas / Mercado Pago / Stripe), Meta Ads, catálogo e **segmentos** (barbearia, clínica, advocacia, delivery, escola…).

## Como funciona o isolamento (resumo)
Uma instalação atende **várias empresas** (tenants). Cada linha de cada tabela tem `tenant_id`, e o Postgres aplica **Row Level Security (RLS)**:
- O app conecta com um usuário **sem superpoder** (`nexora_app`, sem `BYPASSRLS`). Cada consulta roda numa transação com `app.tenant` definido; sem isso, o banco devolve **zero linhas** (falha fechada).
- Mesmo que um bug esqueça um filtro, o banco bloqueia: ler, alterar ou gravar dados de outra empresa é impossível, inclusive com `tenant_id` forjado.
- Um gatilho (`fk_guard`) impede apontar para registro de outra empresa (as chaves estrangeiras do Postgres ignoram RLS).
- Tempo real (WebSocket), webhooks (URLs assinadas por HMAC), login e tarefas em segundo plano também são por empresa.
- Testado em Postgres 16 real: usuário da empresa B não vê nem altera dados da A; sem tenant, vê nada.
- Limites honestos: o **superusuário** (pgAdmin com o usuário `nexora`) vê tudo — guarde a senha. Arquivos de mídia usam nome aleatório (não adivinhável), mas não exigem login. E-mail de login é único no sistema todo.

Quer **um servidor por cliente** (modo ilha)? Use `scripts/new-client.sh`. O modo padrão é multiempresa.

---
## Instalar para leigos

Você precisa de: **um servidor** (VPS Linux, Ubuntu 22/24, 2 GB de RAM ou mais) e **um domínio** apontando para o IP dele (ex.: `crm.seudominio.com`).

### Opção A — Dokploy (recomendada: já cuida do HTTPS)
1. Acesse o servidor por SSH e instale o Dokploy: `curl -sSL https://dokploy.com/install.sh | sh`
2. Abra `http://IP-DO-SERVIDOR:3000`, crie sua conta de administrador.
3. **Projects → Create Project** (ex.: "Nexora") → **Create Service → Compose**.
4. Em *Provider* escolha **Git**; em *Repository URL* coloque `https://github.com/franceliopro/nexora`, *Branch* `main`, *Compose Path* `./docker-compose.yml`. (Repositório privado? Use o provedor GitHub do Dokploy ou uma chave/token.)
5. Aba **Environment**: cole o conteúdo do arquivo `.env`. Para gerar senhas fortes, em qualquer terminal: `git clone https://github.com/franceliopro/nexora && cd nexora && ./scripts/setup.sh https://crm.seudominio.com seu@email.com` e copie o `.env` criado. **Anote** o `PLATFORM_KEY` e a senha do pgAdmin.
6. Aba **Domains → Add Domain**: serviço `app`, porta `3000`, host `crm.seudominio.com`, HTTPS ligado (Let's Encrypt). *(O painel do Dokploy usa a porta 3000 do servidor; por isso o Nexora publica a 3100 — não mude para 3000.)*
7. Clique **Deploy** e aguarde a build (alguns minutos).
8. Opcional: adicione outro domínio para o serviço `pgadmin` (porta `80`), ex.: `db.seudominio.com`, **com HTTPS**.
9. Pronto: vá para "Primeiro acesso" abaixo.

*(Os nomes dos botões do Dokploy podem variar um pouco entre versões.)*

### Opção B — Portainer
1. No servidor, instale o Docker (`curl -fsSL https://get.docker.com | sh`) e o Portainer:
   `docker volume create portainer_data && docker run -d -p 9443:9443 --name portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce:lts`
2. Abra `https://IP-DO-SERVIDOR:9443` e crie o administrador. Escolha o ambiente **local**.
3. **Stacks → Add stack** → nome `nexora` → método **Repository** (importante: o pgAdmin precisa de um arquivo do repositório; o editor "Web editor" não serve).
4. *Repository URL* `https://github.com/franceliopro/nexora`, *reference* `refs/heads/main`, *Compose path* `docker-compose.yml`. Repositório privado: ligue *Authentication* e use um token do GitHub.
5. Em **Environment variables → Advanced mode**, cole o seu `.env` (gere com `./scripts/setup.sh`, como no passo 5 do Dokploy). Troque `PUBLIC_URL` pelo endereço de acesso (ex.: `http://IP:3100`).
6. **Deploy the stack**. Acesse `http://IP-DO-SERVIDOR:3100`.
7. O Portainer **não** liga HTTPS sozinho. Para HTTPS use Cloudflare Tunnel, Caddy ou Nginx Proxy Manager na frente do `:3100` — sem HTTPS, senhas trafegam abertas. Se você não quer mexer nisso, prefira a Opção A.

### Primeiro acesso
1. Abra `PUBLIC_URL`. Na primeira vez, crie a conta do dono da empresa "Principal".
2. **Várias empresas**: abra `PUBLIC_URL/platform.html`, informe o `PLATFORM_KEY`, clique em **Criar empresa** (nome, código, dono, segmento). Cada empresa pode ter **domínio próprio** (campo domínio, apontando para o mesmo servidor) ou acessar por `PUBLIC_URL/?t=codigo` uma vez. O login é só e-mail e senha.
3. **Ajustes → Canais**: crie o canal (`waha`: `{"url":"http://waha:3000","key":"<WAHA_KEY>","session":"default"}`; `baileys`: `{}`; `zernio`: `{"key":"…","platform":"instagram"}`), anote o ID, **Conectar / QR**.
4. **Agente IA**: crie o agente, ligue ao ID do canal, configure LLM/STT/TTS e adicione conhecimento.

---
## pgAdmin (interface gráfica do banco)
- Endereço: `http://localhost:5050` **no próprio servidor**, ou use um túnel SSH: `ssh -L 5050:127.0.0.1:5050 usuario@IP` e abra `http://localhost:5050` no seu computador.
- Ou pelo domínio que você criou no Dokploy (passo 8) — sempre com HTTPS.
- Login: `PGADMIN_EMAIL` / `PGADMIN_PASSWORD` do `.env`. O servidor "Nexora (Postgres)" já aparece; a senha do banco é o `POSTGRES_PASSWORD`.
- **Cuidado**: esse usuário enxerga **todas** as empresas e ignora o isolamento. Para ver como uma empresa, conecte como `nexora_app` e rode `select set_config('app.tenant','1',false);`.
- Para deixar o pgAdmin acessível pelo IP (não recomendado sem HTTPS): `PGADMIN_BIND=0.0.0.0`.

## Backup e restauração
**Automático:** o serviço `backup` faz um dump do banco todo dia (7 diários, 4 semanais, 3 mensais) no volume `backups`. Isso cobre só o banco.

**Backup completo em 1 clique:** `PUBLIC_URL/platform.html` → **Baixar backup**. Gera um `.tar.gz` com o banco de todas as empresas, mídia e sessões Baileys.

**Backup completo por terminal** (inclui também sessões do WAHA e o `.env`): na pasta do projeto no servidor, `./scripts/backup.sh` → `backups/nexora-DATA.tar.gz`. *O arquivo contém segredos: guarde-o fora do servidor e protegido.*

**Restaurar em outro servidor:**
1. Instale Docker e `git clone https://github.com/franceliopro/nexora && cd nexora` no servidor novo.
2. Copie o arquivo de backup para ele (`scp nexora-xxxx.tar.gz usuario@IP:`).
3. `./scripts/restore.sh nexora-xxxx.tar.gz` — recria o `.env` (se não existir), restaura banco, mídia e sessões e sobe tudo.
4. Aponte o domínio para o servidor novo e ajuste `PUBLIC_URL` no `.env` se mudou. Se o backup veio do botão do painel, as sessões do WAHA não vêm junto: será preciso ler o QR do WAHA de novo.

**Exportar uma empresa só** (portabilidade/LGPD): **Ajustes → Exportar dados da empresa (JSON)**. É leitura/arquivo; não existe importação de uma empresa avulsa para outra instalação.

---
## Status honesto (v0.2)
- Testei: sintaxe de todo o código e as migrações + RLS + `fk_guard` + funções de login/tenant num Postgres 16 real. **Não testei** o build do Docker, o app rodando ponta a ponta, nem os provedores externos.
- Zernio: endpoints/webhook em `src/drivers/zernio.js` são presumidos — confira na doc. Reações/DM/comentários dependem disso.
- iFood/Keeta/99Food: só webhook genérico de pedidos (URL em Ajustes → Dados e webhooks). Integrações oficiais exigem credenciais de parceiro.
- Mercado Pago: confirmação automática ainda precisa ser mapeada (`payments.js`). Stripe: valide a assinatura do webhook em produção.
- Só Postgres (pgvector). Baileys é não oficial (risco de banimento). Anúncios Meta: cria só a campanha, pausada.
- O botão de backup depende de `pg_dump 16` no container (instalado no Dockerfile; não testei a build).
- Excluir empresa apaga o banco dela, mas não os arquivos de mídia órfãos.
