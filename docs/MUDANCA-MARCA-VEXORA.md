# Véxora Suite — mudança de marca

A marca passa a ser Véxora; identificadores técnicos e repositório usam Vexora/vexora. O código, nomes de arquivos, textos, cabeçalhos novos de integração, exportações, backups e ícone foram atualizados.

## Ordem no ambiente existente

1. Faça e confira um backup do banco e dos volumes de mídia/sessões. Preserve os segredos atuais.
2. Publique este commit no repositório existente. O deploy mantém os nomes físicos antigos do banco se as novas variáveis não estiverem definidas. Não copie o `.env.example` sobre o ambiente existente.
3. No GitHub: Settings → General → Repository name → `Vexora` → Rename. Essa operação exige administração e não está disponível no conector desta sessão. O histórico e os commits permanecem no mesmo repositório. Referência: https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository
4. No Dokploy, edite a aplicação existente: atualize o repositório para `franceliopro/Vexora`, mantendo `main`. Preserve o identificador técnico do projeto/stack e os volumes já montados. Alterar só o nome de apresentação é suficiente para a marca. Confirme o autodeploy após salvar. Não exclua/recrie a aplicação.
5. Adicione o novo domínio, configure DNS/TLS, atualize `PUBLIC_URL` e o domínio da empresa no painel da plataforma, quando houver domínio personalizado. Mantenha o antigo durante a transição se necessário.
6. Atualize URLs externas de webhook de Asaas/Stripe/redes e URLs autorizadas de OAuth Google/Meta que usavam o domínio anterior. Chaves existentes não mudam automaticamente. A troca do GitHub não troca essas URLs.
7. Entre no novo endereço: o navegador tem armazenamento por origem, portanto será necessário entrar novamente e configurar preferências locais (sons/fundos). Autorize notificações na nova origem.

## Banco e volumes

- A migração 034 atualiza nomes de marca em empresas, `settings.brand.name` e textos de agentes/bots; os modelos, chaves, históricos de mensagens e documentos dos clientes são preservados.
- O usuário interno `nexora_app` é renomeado para `vexora_app` na inicialização, mantendo permissões e propriedade. O processo de migração ainda usa a conexão administrativa existente.
- Instalações novas: `POSTGRES_USER=vexora` e `POSTGRES_DB=vexora` no `.env` gerado. Instalações existentes: se as variáveis não existem, o Compose conserva temporariamente os nomes físicos antigos para não interromper o acesso aos dados.
- O banco físico em produção ainda NÃO foi renomeado nesta sessão. Trocar `POSTGRES_DB`/`POSTGRES_USER` não renomeia um banco já inicializado. A troca física exige manutenção com backup, parada de app/backup/pgAdmin e revisão das conexões. Ela deve ser feita antes de ajustar essas duas variáveis no ambiente antigo. Não apague o volume para forçar inicialização.
- Volumes não são renomeados pelo código. Se for necessário mudar seu nome técnico, copie/restaure para novos volumes em manutenção e confira os dados antes de trocar os mounts. O nome de marca da interface não depende deles.
- O arquivo pgAdmin passa a sugerir `vexora` para novas instalações. Em instalações antigas, mantenha/edite o cadastro da conexão para os nomes físicos efetivos até a manutenção.

## Compatibilidade deliberada

As únicas referências operacionais ao nome antigo servem à migração: reconhecimento do papel antigo do banco, valores padrão de conexão do Compose para instalações existentes, migração 034 e aceitação temporária dos cabeçalhos assinados `x-nexora-*`. Integrações novas exibem `x-vexora-*`. Remover esses caminhos antes da transição quebraria conexões existentes.

Não houve alteração do domínio real, da configuração Dokploy ou do nome remoto do repositório por esta sessão. Os links no código já apontam para o nome futuro.

## Protocolos VX-
A migração 035 altera somente o prefixo dos protocolos existentes de NX- para VX-, mantendo ano, empresa e número. Novos atendimentos usam VX-. A busca de atendimentos aceita o protocolo antigo e o novo. Mensagens já enviadas permanecem no histórico; a mudança não dispara reenvio automático.
