# Primeiro cliente: rastreamento veicular

## Cadastro

1. Abra `/platform.html` na instalação e use a `PLATFORM_KEY` do deploy. Esta chave é exclusiva do master e não deve ser entregue ao cliente.
2. Clique em **Nova empresa**, preencha nome, código, responsável, email e senha. Selecione **Rastreamento Veicular · 3 plataformas**. Logotipo claro, escuro e favicon são independentes.
3. Em **Gerenciar**, cadastre atendentes. Em **Equipes e membros**, selecione e salve os membros de cada equipe.
4. Abra o painel da empresa pelo link fornecido e entre com o email/senha criados. Empresa existente pode aplicar o template em **Gerenciar → Templates de atendimento**.

O cliente real não foi cadastrado nesta entrega: nome, responsável e credenciais ainda não foram fornecidos. Não foram criadas contas fictícias.

## Equipes

| Plataforma | Suporte | Financeiro |
|---|---|---|
| Ceeb Vision | Suporte · Ceeb Vision | Financeiro · Ceeb Vision |
| Link | Suporte · Link | Financeiro · Link |
| Rastreabem | Suporte · Rastreabem | Financeiro · Rastreabem |

Comercial e Administrativo são compartilhados: oito equipes ao todo. O template cria IA e bot em rascunho, sem canal/modelo/segredo. Reaplicar não duplica nem sobrescreve configurações. Os nomes são filas; não há integração de localização/bloqueio com essas plataformas.

## Ativação

1. Em **Integração e API**, configure/conecte WhatsApp. Use Administrativo como equipe padrão para conversas sem triagem concluída.
2. Em **Chatbots**, edite o fluxo do template, confira destinos, informe o ID do canal e ative. Selecione **Cuiabá (`America/Cuiaba`)** no cadastro/gestão master ou em **Personalização → Horário da empresa**. A saudação usa esse fuso: madrugada 00–05h, manhã 06–11h, tarde 12–17h, noite 18–23h.
3. Em **Integração e API → Pagamentos**, configure o JSON `pay`. Comece com sandbox e valide com dados de teste antes de produção:

```json
{"asaas":{"key":"PREENCHER_NO_PAINEL","sandbox":true}}
```

Se cada plataforma tiver conta própria, acrescente `asaas.platforms.ceeb_vision`, `asaas.platforms.link` e `asaas.platforms.rastreabem`, cada qual com `key` e `sandbox`. Sem essas entradas, usa a conta padrão.

4. Para recepção por IA, configure LLM, conhecimento e canais do agente criado e ative-o. Desative o bot de entrada desse canal. A IA usa `tracking_triage`; consultas financeiras continuam pelo subfluxo determinístico, mesmo com o bot de entrada desativado.
5. Teste oito rotas, documento, telefone divergente, falha do provedor, pagamentos e tomada/retomada humana.

## Atendimento

**Meu time / fila** mostra filas acessíveis. **Assumir atendimento** define responsável e pausa bot/IA; colegas sem convite perdem acesso. Dono/admin da empresa supervisionam tudo. Ainda não há supervisor restrito apenas a um setor.

**Convidar** adiciona pessoa ou equipe inteira sem mudar o responsável. Convidados compartilham conversa e notas privadas. **Atribuir** muda para pessoa, equipe ou IA e remove convites anteriores. Atribuir a uma equipe devolve à fila até alguém assumir. Atribuir à IA remove o responsável humano.

**Humano / IA / Bot** permite pausar ou retomar explicitamente e escolher híbrido mantendo o humano. A retomada aguarda a próxima mensagem do cliente. No híbrido, um bot em andamento tem prioridade; a IA atua quando o bot não consumir a mensagem. Mensagens já enviadas ao provedor antes da tomada humana não podem ser recolhidas.

## Financeiro

Financeiro → plataforma → pagamento pede CPF/CNPJ válido. Para mostrar débitos abertos/vencidos, exige correspondência do telefone da conversa com `phone`/`mobilePhone` do cadastro Asaas. Divergência ou erro encaminha ao Financeiro correto. Esta verificação não equivale a autenticação forte de identidade. Nome/documento são mascarados.

Boleto completo, linha digitável, Pix copia e cola e fatura dependem da disponibilidade na cobrança. Cada opção inclui o **link da fatura completa**. Não há PDF de fatura gerado/anexado pela Néxora. Sem fatura, encaminha ao Financeiro.

**Criar cobrança**, numa conversa assumida, usa documento, valor, descrição, vencimento e plataforma; cria cobrança real e envia a fatura. O identificador da tentativa impede repetir a criação na mesma tentativa. Falha ambígua exige conferir o Asaas antes de iniciar outra tentativa. Criar cobrança não confirma pagamento. Webhooks legados ainda exigem validação externa de autenticidade e reconciliação.

## Validação e limites

- `npm test`, `node test/tracking.mjs`, `node test/workspaces.mjs`.
- `test/conversation-postgres.mjs`: migrações 001–004, template, RLS entre empresas, tomada, convite individual/equipe, transferência e rollback. Executado em PostgreSQL 18.6/WASM (PGlite 0.5.10 com pgvector). Não certifica PostgreSQL 16 do deploy nem concorrência entre conexões reais. Defina `PGLITE_MODULE` e `PGLITE_VECTOR_MODULE` para módulos instalados fora do app de produção.
- Chromium desktop/mobile com API simulada: navegação, controles, convite de equipe, modos e formulário de cobrança, cadastro/gestão master.
- Asaas/WhatsApp reais, Docker e domínio de produção não exercitados. A migração 004 é aplicada no boot existente; faça backup antes de atualizar produção.
- Acesso revisto: listagem, histórico, envio, ações e WebSockets das conversas. Auditoria geral de mídia estática legada, demais APIs e segredos em repouso permanece pendente.
