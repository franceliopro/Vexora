# Vexora — CRM omnichannel com IA (multiempresa isolado)

WhatsApp (**WAHA** + **Baileys**), Instagram e outras redes (**Zernio**), vários atendentes e times por número, agentes de IA (LLM/STT/TTS por agente), RAG, Google Agenda, kanban automático, follow-ups, pagamentos (Asaas / Mercado Pago / Stripe), Meta Ads, catálogo e **templates opcionais de atendimento**. Dados antigos de escola e delivery são preservados como recursos legados.

## Como funciona o isolamento (resumo)
Uma instalação atende **várias empresas** (tenants). Cada linha de cada tabela tem `tenant_id`, e o Postgres aplica **Row Level Security (RLS)**:
- O app conecta com um usuário **sem superpoder** (`vexora_app`, sem `BYPASSRLS`). Cada consulta roda numa transação com `app.tenant` definido; sem isso, o banco devolve **zero linhas** (falha fechada).
- Mesmo que um bug esqueça um filtro, o banco bloqueia: ler, alterar ou gravar dados de outra empresa é impossível, inclusive com `tenant_id` forjado.
- Um gatilho (`fk_guard`) impede apontar para registro de outra empresa (as chaves estrangeiras do Postgres ignoram RLS).
- Tempo real (WebSocket), webhooks (URLs assinadas por HMAC), login e tarefas em segundo plano também são por empresa.
- Testado em Postgres 16 real: usuário da empresa B não vê nem altera dados da A; sem tenant, vê nada.
- Limites honestos: o **superusuário** (pgAdmin com o usuário `vexora`) vê tudo — guarde a senha. Arquivos de mídia usam nome aleatório (não adivinhável), mas não exigem login. E-mail de login é único no sistema todo.

Quer **um servidor por cliente** (modo ilha)? Use `scripts/new-client.sh`. O modo padrão é multiempresa.

---
## Instalar para leigos

Você precisa de: **um servidor** (VPS Linux, Ubuntu 22/24, 2 GB de RAM ou mais) e **um domínio** apontando para o IP dele (ex.: `crm.seudominio.com`).

### Opção A — Dokploy (recomendada: já cuida do HTTPS)
1. Acesse o servidor por SSH e instale o Dokploy: `curl -sSL https://dokploy.com/install.sh | sh`
2. Abra `http://IP-DO-SERVIDOR:3000`, crie sua conta de administrador.
3. **Projects → Create Project** (ex.: "Vexora") → **Create Service → Compose**.
4. Em *Provider* escolha **Git**; em *Repository URL* coloque `https://github.com/franceliopro/vexora`, *Branch* `main`, *Compose Path* `./docker-compose.yml`. (Repositório privado? Use o provedor GitHub do Dokploy ou uma chave/token.)
5. Aba **Environment**: cole o conteúdo do arquivo `.env`. Para gerar senhas fortes, em qualquer terminal: `git clone https://github.com/franceliopro/vexora && cd vexora && ./scripts/setup.sh https://crm.seudominio.com seu@email.com` e copie o `.env` criado. **Anote** o `PLATFORM_KEY` e a senha do pgAdmin.
6. Aba **Domains → Add Domain**: serviço `app`, porta `3000`, host `crm.seudominio.com`, HTTPS ligado (Let's Encrypt). *(O painel do Dokploy usa a porta 3000 do servidor; por isso o Vexora publica a 3100 — não mude para 3000.)*
7. Clique **Deploy** e aguarde a build (alguns minutos).
8. Opcional: adicione outro domínio para o serviço `pgadmin` (porta `80`), ex.: `db.seudominio.com`, **com HTTPS**.
9. Pronto: vá para "Primeiro acesso" abaixo.

*(Os nomes dos botões do Dokploy podem variar um pouco entre versões.)*

**Automatizar domínios dos clientes:** a integração opcional com a API do Dokploy cria a rota e solicita SSL quando um domínio é salvo no painel master, sem cadastrar cada cliente manualmente. Configure `DOKPLOY_API_URL`, `DOKPLOY_API_KEY` e `DOKPLOY_APPLICATION_ID` na Application da Véxora. Guia completo e limitações: [Domínios e SSL automáticos](docs/DOMINIOS-DOKPLOY.md). O DNS de cada domínio ainda precisa apontar para o servidor.

### Opção B — Portainer
1. No servidor, instale o Docker (`curl -fsSL https://get.docker.com | sh`) e o Portainer:
   `docker volume create portainer_data && docker run -d -p 9443:9443 --name portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce:lts`
2. Abra `https://IP-DO-SERVIDOR:9443` e crie o administrador. Escolha o ambiente **local**.
3. **Stacks → Add stack** → nome `vexora` → método **Repository** (importante: o pgAdmin precisa de um arquivo do repositório; o editor "Web editor" não serve).
4. *Repository URL* `https://github.com/franceliopro/vexora`, *reference* `refs/heads/main`, *Compose path* `docker-compose.yml`. Repositório privado: ligue *Authentication* e use um token do GitHub.
5. Em **Environment variables → Advanced mode**, cole o seu `.env` (gere com `./scripts/setup.sh`, como no passo 5 do Dokploy). Troque `PUBLIC_URL` pelo endereço de acesso (ex.: `http://IP:3100`).
6. **Deploy the stack**. Acesse `http://IP-DO-SERVIDOR:3100`.
7. O Portainer **não** liga HTTPS sozinho. Para HTTPS use Cloudflare Tunnel, Caddy ou Nginx Proxy Manager na frente do `:3100` — sem HTTPS, senhas trafegam abertas. Se você não quer mexer nisso, prefira a Opção A.

### Primeiro acesso
1. Abra `PUBLIC_URL`. Na primeira vez, crie a conta do dono da empresa "Principal".
2. **Várias empresas**: abra `PUBLIC_URL/platform.html`, informe o `PLATFORM_KEY`, clique em **Criar empresa** (nome, código, responsável, template opcional). Cada empresa pode ter **domínio próprio** (campo domínio, apontando para o mesmo servidor) ou acessar por `PUBLIC_URL/?t=codigo` uma vez. O login é só e-mail e senha.
3. **Integração e API → Canais**: crie o canal (`waha`: `{"url":"http://waha:3000","key":"<WAHA_KEY>","session":"default"}`; `baileys`: `{}`; `zernio`: `{"key":"…","platform":"instagram"}`), anote o ID, **Conectar / QR**.
4. **Agentes de IA**: crie o agente, ligue ao ID do canal, configure LLM/STT/TTS e adicione conhecimento.

---
## Organização atual: 11 módulos funcionais

Central de Atendimento · CRM · Inteligência e Rastreamento de Leads · Agentes de IA · Chatbots · Campanhas · Sequências · Mensagens Agendadas · Integração e API · Pagamentos · Personalização para cada Cliente.

Veja [estado de implementação de cada área](docs/ESTRUTURA-PRODUTO.md). Campanhas, tracking e mensagens agendadas têm áreas dedicadas, mas não estão implementados integralmente. Sequências usa as automações anteriores, ainda sem construtor guiado de cadências.

**Gerenciar empresas:** abra `/platform.html` e autentique com a `PLATFORM_KEY`. Cadastre a empresa e seu responsável; depois use **Gerenciar** para atendentes, IA/regras, bots em rascunho, templates e marca. O cliente final não recebe acesso master nem funções de revenda.

**Marca:** logotipo claro, logotipo escuro e favicon são independentes, no painel master ou em Personalização. O favicon não reutiliza automaticamente o logotipo.

**Templates:** substituem a seleção de segmentos. Cria um agente com prompt/tom/regras/proibições e um chatbot inicial, ambos desativados e sem canal. Aplicar não renomeia funil/clientes nem sobrescreve configurações. Revise o modelo e configure LLM/canal antes de ativar.

## Dados legados e funcionalidades anteriores

As funcionalidades abaixo já existiam. A reorganização não apaga seus dados. Os acessos de escola/delivery são preservados em Integração e API quando houver dados. A cobrança recorrente fica em Pagamentos. Elas não são apresentadas como ERPs por segmento.

### Bots (fluxos visuais, tipo Typebot) — menu **Bots (fluxos)**
Editor de blocos: arraste o ponto → de um bloco até a entrada de outro; duplo clique na linha remove. Blocos: mensagem, pedir para escolher (menu numerado), perguntar e guardar (valida CPF/CNPJ, e-mail, número), condição, variável, mover no funil, transferir (fila, atendente, time ou agente de IA), chamar API externa, **consultar cobranças (Asaas)**, **pedido no WhatsApp** e fim. Há modelos prontos (menu por setor, cobrança Asaas, pizzaria). O bot responde antes da IA; ao terminar ou transferir, a IA/atendente assume. Fluxo parado há 12 h é encerrado.
- **Asaas por CPF/CNPJ**: valida o documento (dígitos verificadores), lista débitos com vencimento e situação, mostra **nome e documento mascarados** e o tipo (Pessoa Física/Jurídica), e envia **boleto (link/PDF), linha digitável, Pix copia e cola** ou link de pagamento. Configure a chave em *Ajustes → Integrações* (`pay`: `{"asaas":{"key":"$aact_...","sandbox":true}}`). Limite de 3 consultas por conversa. ⚠ Qualquer pessoa que souber um CPF/CNPJ consegue ver os débitos mascarados e pagar; por isso os dados são mascarados e há limite de consultas.
- A WhatsApp não aceita listas/botões nativos nos drivers WAHA/Baileys deste projeto: os menus são numerados ("1. Financeiro").

### Cobrança recorrente — menu **Cobrança**
Cadastre assinaturas (cliente, valor, dia do vencimento, provedor). Todo dia, no horário configurado (padrão 9h, fuso America/Sao_Paulo), o sistema cria a cobrança do mês (10 dias antes do vencimento), gera o link no provedor e envia os lembretes da **régua**: padrão 10 e 5 dias antes, no dia e 3 dias depois — editável por assinatura ou para toda a empresa (uma linha por regra: `-10 | mensagem`; variáveis `{{nome}} {{valor}} {{vencimento}} {{descricao}} {{link}}`). Pagamento confirmado pelo webhook marca como pago e para os lembretes. O contato precisa ter **canal** definido.

### Escola / música — menu **Escola**
Cursos (com imagem e valor), alunos (pacote de aulas e professor), **gerar aulas semanais** (ex.: toda terça 18h por 12 semanas, pulando conflito de professor), chamada (presente / falta / justificada / cancelada) e **resumo**: ministradas, restantes, faltas, frequência e próxima aula. Ministradas = presenças + faltas; falta justificada e aula cancelada não consomem do pacote.

### Delivery / pizzaria — menu **Delivery**
Painel de pedidos por etapa (novo → preparando → pronto → saiu → entregue), **novo pedido de balcão/mesa/retirada/entrega**, cardápio com categorias, fotos, tamanhos e adicionais, regiões com taxa e pedido mínimo, e **pedido pelo WhatsApp** (bloco "Pedido no WhatsApp"). Preços são sempre recalculados no servidor. O cliente é avisado a cada mudança de status.
- **Impressora térmica (ESC/POS)**: no PC da loja rode `printer-agent/agent.js` (Node 18+, sem dependências) com os dados de *Delivery → Impressora & config* (rede `PRINTER_HOST`, USB Linux `PRINTER_FILE=/dev/usb/lp0` ou compartilhada no Windows). Sem agente, o botão 🖨 imprime pelo navegador.
- Pedidos de iFood/Keeta/99Food: o webhook genérico (*Ajustes → Dados e webhooks*) aceita `items:[{name,qty,total}]`, `total`, `delivery_fee`, `address`, etc.

---
## pgAdmin (interface gráfica do banco)
- Endereço: `http://localhost:5050` **no próprio servidor**, ou use um túnel SSH: `ssh -L 5050:127.0.0.1:5050 usuario@IP` e abra `http://localhost:5050` no seu computador.
- Ou pelo domínio que você criou no Dokploy (passo 8) — sempre com HTTPS.
- Login: `PGADMIN_EMAIL` / `PGADMIN_PASSWORD` do `.env`. O servidor "Vexora (Postgres)" já aparece; a senha do banco é o `POSTGRES_PASSWORD`.
- **Cuidado**: esse usuário enxerga **todas** as empresas e ignora o isolamento. Para ver como uma empresa, conecte como `vexora_app` e rode `select set_config('app.tenant','1',false);`.
- Para deixar o pgAdmin acessível pelo IP (não recomendado sem HTTPS): `PGADMIN_BIND=0.0.0.0`.

## Backup e restauração
**Automático:** o serviço `backup` faz um dump do banco todo dia (7 diários, 4 semanais, 3 mensais) no volume `backups`. Isso cobre só o banco.

**Backup completo em 1 clique:** `PUBLIC_URL/platform.html` → **Baixar backup**. Gera um `.tar.gz` com o banco de todas as empresas, mídia e sessões Baileys.

**Backup completo por terminal** (inclui também sessões do WAHA e o `.env`): na pasta do projeto no servidor, `./scripts/backup.sh` → `backups/vexora-DATA.tar.gz`. *O arquivo contém segredos: guarde-o fora do servidor e protegido.*

**Restaurar em outro servidor:**
1. Instale Docker e `git clone https://github.com/franceliopro/vexora && cd vexora` no servidor novo.
2. Copie o arquivo de backup para ele (`scp vexora-xxxx.tar.gz usuario@IP:`).
3. `./scripts/restore.sh vexora-xxxx.tar.gz` — recria o `.env` (se não existir), restaura banco, mídia e sessões e sobe tudo.
4. Aponte o domínio para o servidor novo e ajuste `PUBLIC_URL` no `.env` se mudou. Se o backup veio do botão do painel, as sessões do WAHA não vêm junto: será preciso ler o QR do WAHA de novo.

**Exportar uma empresa só** (portabilidade/LGPD): **Ajustes → Exportar dados da empresa (JSON)**. É leitura/arquivo; não existe importação de uma empresa avulsa para outra instalação.

---
## Status honesto (v0.3)
- **Testado de verdade**: regras puras e o motor de bots em simulação de conversa (`node test/run.mjs`); migrações, RLS e consultas SQL num Postgres 16 real; todas as telas e o editor de bots num navegador (Chromium) com API simulada.
- **Nunca rodei o servidor Node completo** nem o build do Docker neste ambiente (sem acesso ao npm). O seu deploy no Dokploy é o primeiro teste real: se algo falhar, me envie o log do serviço `app`.
- **Asaas**: contratos de consulta e confirmação revisados na documentação oficial; valide com as credenciais da sua conta no **sandbox** antes de usar em produção. A criação da cobrança não confirma o pagamento; isso depende do webhook autenticado.
- **Zernio**: endpoints/webhook presumidos (`src/drivers/zernio.js`); confira na documentação.
- iFood/Keeta/99Food: só o webhook genérico (integrações oficiais exigem credenciais de parceiro). Mercado Pago: confirmação automática ainda precisa ser mapeada; Stripe: valide a assinatura do webhook.
- Impressão térmica: formato ESC/POS padrão, **não testado em impressora real** (acentos são convertidos para ASCII). Bloco "Chamar API externa" bloqueia endereços internos, mas não protege contra DNS rebinding.
- Sem lembrete automático de aula, sem página pública de cardápio, sem controle de estoque por pedido.
- Só Postgres (pgvector). Baileys é não oficial (risco de banimento). Anúncios Meta: cria só a campanha, pausada.


## Primeiro cliente: rastreamento veicular

Cadastro em `/platform.html` → **Nova empresa** → template **Rastreamento Veicular · 3 plataformas**. Veja [configuração das equipes, Asaas e controles de atendimento](docs/RASTREAMENTO-VEICULAR.md).

Processo de atendimento consolidado a partir das telas: [governança, filas, ficha, conclusão e relatórios](docs/PROCESSO-ATENDIMENTO.md). Fuso por empresa no cadastro/gestão master ou em **Personalização → Horário da empresa**; para este cliente, selecione **Cuiabá**.

## Atendimento e CRM implementados

Veja [entrega, acesso ao QR Code, governança, painéis e configuração de confirmações externas](docs/ENTREGA-ATENDIMENTO-CRM.md). As migrações 005/006 adicionam ciclos, eventos e oportunidades sem apagar as conversas anteriores. Conexões externas ainda exigem configuração e homologação com suas credenciais.

## Continuidade do projeto

Leia [o registro completo de 20/10/2026](docs/CONTINUIDADE-VEXORA-2026-10-20.md) para decisões de produto, arquitetura, recursos entregues, configuração Bot → IA, financeiro, testes e pendências de homologação.
