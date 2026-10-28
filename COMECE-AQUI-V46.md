# V46 — Assuntos quentes

Pacote completo, com todas as alterações da V45. Não publicado no Render.

Correções: reutiliza consultas de até 15 minutos do mesmo usuário, perfil, versão e período. Atualizar assuntos solicita pesquisa nova. O histórico é carregado antes da tentativa e permanece visível se a atualização falhar, com aviso de que não foi atualizado. Após erro 429 do Gemini, impede tentativas de notícia por um minuto no processo do servidor, sem apagar dados. Corrige o cabeçalho dos cartões para evitar interferência do layout global.

Isso não libera cota do Google nem garante que ela renove em um minuto. O print não permite distinguir limite temporário de cota esgotada. Se persistir, o administrador deve conferir os limites e a configuração do projeto associado à chave Gemini. Não alteramos modelo, chave, cobrança nem cota.

Validação: 10 testes relacionados passaram e o build foi aprovado. Busca real do projeto Google e deploy não foram realizados.

Para atualizar o serviço existente: use o conteúdo desta pasta no repositório, mantenha as variáveis de ambiente e o banco/disco persistente. Build: npm ci --include=dev && npm run build. Início: npm start. Não substitua o banco por um vazio.

Validação no site: abrir Assuntos quentes; alternar 24/48 horas; voltar à aba e verificar reaproveitamento; clicar Atualizar assuntos. Em erro, conferir que a consulta anterior continua visível com sua data. Se nunca houve consulta bem-sucedida, não há notícias antigas para mostrar.
