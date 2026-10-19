# Atualização de pastas — Central V27

Este pacote atualiza a versão Estúdio Marketing entregue anteriormente.

1. Faça backup do banco e dos documentos atuais antes de atualizar.
2. Copie as pastas src, server e tests deste pacote para a raiz do seu projeto atual, substituindo somente os arquivos correspondentes. Não exclua os demais arquivos dessas pastas.
3. Preserve o serviço atual do Render, seu disco, ER_AUTH_DB, GEMINI_API_KEY, GEMINI_MODEL e demais variáveis. Este pacote não contém nem altera essas configurações.
4. Atualize o código pelo fluxo de deploy que você já usa. Build: npm ci --include=dev && npm run build. Start: npm start.
5. Ao iniciar, a aplicação acrescenta as estruturas de pastas ao banco existente. Conteúdos anteriores ficam em Sem pasta; nenhuma tabela é apagada.

Não crie outro serviço ou banco para esta atualização. Se o seu código recebeu outras modificações além da configuração de chaves após a última entrega, compare esses seis arquivos antes de substituí-los.



- Meus conteúdos agora organiza Assunto → Público. Limite de 200 pastas privadas por usuário.
- Cada público tem faixa etária, renda, interesses, necessidades/objetivos e tom de comunicação.
- Crie assuntos e públicos, renomeie pastas e mova públicos entre assuntos.
- Criar nesta pasta inicia um novo projeto com o contexto salvo. O campo Contexto do momento guarda a ocasião de cada criação.
- O servidor busca o contexto da pasta do usuário e envia ao Gemini. O briefing registra uma cópia desse contexto; revisões preservam a intenção original.
- Mover conteúdo para muda a organização sem reescrever seu texto ou seu briefing. Não há exclusão de pastas nesta versão.
- Conteúdos anteriores aparecem em Sem pasta. É possível movê-los para assunto ou público.
- Busca por título, tema e caminho da pasta; filtros por pasta, favoritos e intervalo de datas de criação. A biblioteca continua exibindo até 500 projetos recentes.
- Selecione um assunto para ver também os conteúdos de seus públicos.
- O contexto é informado pelo usuário: esta entrega não inclui pesquisa automática de tendências.



Validação: 47 testes passaram e build concluído. Cadastro de assunto/público, contexto automático, movimentação e busca foram conferidos no navegador com dados locais. Geração testada com resposta de IA simulada, sem consumir sua chave. Nenhuma publicação no Render foi realizada.
