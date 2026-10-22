# Domínios e SSL automáticos no Dokploy

A Véxora pode cadastrar a rota e solicitar HTTPS ao Dokploy automaticamente quando o domínio de um tenant é salvo no painel master. O Dokploy continua responsável por Traefik e pelo certificado; a aplicação não tenta emitir certificados por conta própria.

## Configuração única (Dokploy Application)

1. No Dokploy, abra a **Application** que executa a Véxora e gere uma API key nas configurações da conta.
2. Copie o ID da Application (não é o ID do projeto).
3. Na Application da Véxora, adicione estas variáveis de ambiente e redeploy/reinicie:
   - `DOKPLOY_API_URL=https://SEU-DOKPLOY/api` (sem barra final; use a URL real do painel)
   - `DOKPLOY_API_KEY=...` (segredo; não coloque no frontend, no Git ou no banco)
   - `DOKPLOY_APPLICATION_ID=...`
4. Garanta que as portas 80 e 443 do servidor estejam acessíveis pela internet e que o domínio do Dokploy consiga ser acessado pela aplicação.
5. No DNS de cada hostname, crie um registro A para o IP público do servidor (e confira se não há um AAAA apontando para outro lugar).

O endpoint oficial usado é `domain.create`, com a Application ID, porta interna `3000`, HTTPS ligado e o resolvedor Let's Encrypt. A integração consulta os domínios existentes primeiro para evitar duplicação. Se a API estiver indisponível ou recusar o domínio, o salvamento do campo domínio falha em vez de gravar uma configuração incompleta. O endpoint de reprovisionamento permite corrigir tenants que já tinham domínio salvo.

## Usar no painel master

- Para novos tenants, informe o domínio no formulário se esse campo estiver disponível.
- Para tenants existentes, salve o domínio em **Gerenciar empresas → domínio**. Com a integração configurada, a rota será criada sem abrir a tela Domains para cada cliente.
- Para revalidar um domínio já salvo, o backend expõe `POST /platform/tenants/:id/domain/provision`, autenticado pela `PLATFORM_KEY`.

## Limites importantes

- **DNS não é criado pela Véxora.** O dono do domínio precisa apontá-lo para o servidor. Para domínios próprios, isso normalmente exige um registro A ou CNAME, conforme a configuração DNS do cliente.
- Let's Encrypt precisa conseguir validar o hostname. Um certificado não pode ser emitido se o DNS apontar para outro lugar, as portas necessárias estiverem bloqueadas ou o domínio não estiver validável.
- Cada domínio próprio exige uma rota e um certificado para aquele hostname. A integração automatiza a criação da rota/certificado no Dokploy, mas não pode obter controle sobre o DNS de terceiros.
- Para muitos subdomínios sob um domínio controlado pela Véxora, um wildcard pode reduzir a emissão de certificados por hostname, mas exige uma configuração de DNS-01 no Traefik e um provedor DNS compatível. Não configure `*.dominio` com Let's Encrypt HTTP-01: certificados wildcard exigem DNS-01.
- Use uma API key do Dokploy com acesso mínimo possível e mantenha-a apenas como variável de ambiente no servidor. Se a API key for rotacionada, atualize a variável e reinicie a Application.

## Diagnóstico

- `404 page not found` gerado pelo Traefik normalmente indica que não há uma rota que corresponda ao hostname.
- Erro de certificado pode indicar que o certificado ainda está sendo emitido ou que o hostname não foi validado.
- Confirme que o hostname aparece em Domains/Traefik da Application, que a porta é **3000 interna**, e confira os logs do Dokploy/Traefik após salvar.
