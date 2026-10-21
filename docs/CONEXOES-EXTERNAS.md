# Conexões externas dos agentes

Em Agentes de IA → Conexões para habilidades da IA → Conectar sistema:

1. Informe nome, finalidade e endpoint HTTPS público. Escolha GET para consulta ou POST para ação.
2. Autenticação: use o campo Bearer se o fornecedor pedir `Authorization: Bearer ...`. Para outro esquema, preencha Headers personalizados com objeto JSON, por exemplo `{"x-api-key":"sua-chave"}`. Não use Authorization personalizado e Bearer juntos.
3. Liste parâmetros permitidos, um por linha: `documento | CPF ou CNPJ confirmado`. O agente só pode enviar parâmetros cadastrados.
4. GET envia parâmetros na URL, sem body. POST sem modelo envia os parâmetros como objeto JSON. Para outro formato use Body JSON, por exemplo `{"cliente":{"documento":"{{documento}}"},"origem":"atendimento"}`. Cada variável do modelo deve existir na lista. Se estiver ausente na execução, a chamada é interrompida antes do envio.
5. Salve, selecione essa conexão nas habilidades do agente e habilite Consultar ou acionar API. O histórico confirma somente execuções reais; salvar não envia uma requisição de teste.

Headers ficam criptografados e seus valores nunca voltam na listagem. Ao editar, o campo vazio mantém os headers; preencher substitui o conjunto; marque a opção de remoção para limpar. O body é uma configuração administrativa, não um cofre de senhas: guarde credenciais em Bearer ou headers. O body está limitado a JSON de até 16 KB e oito níveis. Respostas devem ser JSON, até 64 KB; timeout de oito segundos, sem redirecionamento ou destinos privados. Uma execução sem confirmação exige conferência humana antes de repetir.
