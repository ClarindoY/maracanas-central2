# V43 — correção de layout da Academia e diagnóstico de carregamento

Atualize o repositório do serviço completo Render. Preserve banco, disco, usuários e chaves. Faça backup antes da atualização.
Build: npm ci --include=dev && npm run build
Start: npm start
Não use somente um Static Site ou vite preview como serviço de produção: as rotas /api precisam do servidor Node.

Corrigido conflito dos cartões com o cabeçalho global (altura fixa, fundo e espaçamento). Cartões agora usam seu próprio bloco de título, com altura automática.
Respostas HTML em chamadas de dados agora geram uma mensagem explicativa com a rota, em vez do erro Unexpected token. O Marketing exibe falha de carregamento e Tentar novamente, sem oferecer um seletor DNA vazio. No preview local, /api é encaminhado à porta 3001, que precisa estar com o servidor ativo.

Importante: ainda não foi informado o endereço publicado onde ocorreu a falha. Esta versão não confirma nem corrige uma configuração externa desconhecida do Render/proxy. É necessário verificar se o endereço atende frontend e backend da mesma versão. As rotas de DNA e Academia existem no pacote.

Validação: três testes de leitura de resposta/Academia passaram, e o build foi aprovado. Não houve deploy nem chamadas reais ao Gemini. V42 preservada; próxima versão V44.
