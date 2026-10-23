# Central V27 — Marketing com pastas por assunto e público

## Pastas — atualização de 18/10/2026

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

## Recursos preservados

- Identidade azul-marinho, preto e branco aplicada à navegação e aos elementos principais da Central.
- Estúdio Marketing com prévia central, Visualizar/Editar, navegação por slides e ampliação.
- Três modelos reais de exportação: Editorial, Impacto e Minimalista.
- Cadastro de até 30 marcas por usuário, com nome, logo e assinatura. PNG, JPEG e WebP são aceitos e reduzidos no navegador. Há um atalho para cadastrar o logo Maracanãs já presente na aplicação.
- Escolha de marca por projeto. Ela fica salva no projeto e no histórico. As marcas cadastradas não são modificadas automaticamente por outras criações.
- Foto de apoio opcional enviada pelo usuário, aplicada aos slides do projeto. Não é geração de fotografia por IA.
- Comentários persistentes no projeto e ação Aplicar com Gemini, no slide selecionado ou no projeto inteiro.
- Revisões no mesmo projeto, com novas versões. No ajuste de um slide, o servidor preserva os demais slides. Conflitos de edição impedem sobrescrita silenciosa.

## Como atualizar o serviço existente no Render

1. Faça backup do banco e dos documentos atuais.
2. Extraia este ZIP e atualize o código do projeto conectado ao seu serviço, usando o conteúdo da pasta Central_V27_Marketing_Pastas_Render.
3. Preserve as variáveis, a chave GEMINI_API_KEY, o GEMINI_MODEL que já funciona, o disco persistente e o caminho ER_AUTH_DB. Não habilite DEMO_MODE nem substitua dados de produção por dados locais.
4. Build: npm ci --include=dev && npm run build. Start: npm start. Mantenha a pasta que contém package.json como raiz da aplicação.
5. Faça o deploy pelo fluxo habitual. As tabelas novas e a coluna de pasta são criadas automaticamente, sem apagar as de licitações ou os conteúdos anteriores.

Esta atualização altera o servidor e o banco além da interface: não basta substituir os dois arquivos da versão de prévia. O pacote contém o projeto completo. Se você fez mudanças próprias após a última entrega, integre os arquivos abaixo à sua base atual.

Nesta atualização de pastas: novo src/MarketingFolders.jsx; alterados src/MarketingStudio.jsx, src/marketing-studio.css, server/marketing.mjs, server/index.mjs e tests/marketing.test.mjs.
Não é necessário alterar render.yaml, variáveis de ambiente, package.json, dependências ou configurações do banco para adicionar as pastas.
O componente antigo src/Marketing.jsx fica no pacote como referência, mas a aplicação usa MarketingStudio.jsx.

## Testar as pastas

1. Marketing → Meus conteúdos → Novo assunto: Licitação.
2. Novo público: 60+, alta renda. Preencha as orientações e salve.
3. Criar nesta pasta: confirme o público, descreva o conteúdo e o contexto do momento, escolha formato/objetivo e gere.
4. Volte à biblioteca: a criação deve estar na pasta escolhida.
5. Mova um conteúdo de Sem pasta, filtre por assunto/público e busque pelo título.
6. Use Editar público / mover pasta para renomear ou mudar o assunto de um público, mantendo seus conteúdos.

## Testar os demais recursos

1. Entre em Marketing → Marcas e identidade. Use Usar logo Maracanãs ou envie outro logo, preencha o nome e clique em Cadastrar marca.
2. Crie um projeto de tema livre escolhendo a marca. Confira a prévia e alterne entre Editorial, Impacto e Minimalista.
3. Em Personalizar arte, ajuste a assinatura e, opcionalmente, envie uma foto. Salve a edição. Baixe um slide para conferir que a imagem corresponde à prévia.
4. Abra Meus conteúdos e reabra o projeto. A marca, composição e imagens devem permanecer.
5. Escreva um pedido, por exemplo: Encurte o título, mantendo o restante. Clique em Salvar comentário.
6. Selecione Somente o slide atual ou Projeto inteiro. Salve edições manuais pendentes e clique em Aplicar com Gemini no comentário.
7. Abra o Histórico de versões para conferir ou carregar a versão anterior. Carregar uma versão não apaga o histórico: salve para restaurá-la como uma nova versão.

## Limites e cuidados de uso

- As bibliotecas, marcas e comentários são privados por usuário, sem compartilhamento automático com a equipe.
- Logos são cadastrados como novas marcas; não há edição/exclusão de marca nesta entrega. Isso evita modificar a identidade de projetos antigos sem querer.
- Comentários salvos não consomem Gemini. Gerar conteúdo e Aplicar com Gemini usam a cota existente.
- O ajuste por comentário trabalha com textos. Para trocar logo, modelo ou foto, use os controles visuais e salve.
- Os modelos são composições próprias implementadas a partir do conceito visual aprovado. A fotografia do mockup não é distribuída como asset: use imagens suas ou autorizadas.
- A foto de apoio é única por projeto. A exportação é feita por slide. Não há postagem automática em redes sociais.
- Áudio, radar de notícias, academia e métricas sociais continuam fora desta versão.

## Verificações

47 testes automatizados passaram na verificação final, incluindo isolamento de marcas, preservação dos demais slides, histórico, falhas de IA e edições concorrentes. A geração/revisão nos testes usa respostas simuladas, sem consumir créditos. O resultado real do Gemini depende do modelo, chave e cota do seu Render e deve ser validado após o deploy.

Este ZIP não contém banco, arquivos de teste de usuário, credenciais, node_modules ou build local. Nenhum deploy foi feito por aqui.
