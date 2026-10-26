# Central V27 — atualização para validação

Pacote completo do site. Não é uma demonstração. Não inclui dados, credenciais, node_modules ou páginas temporárias de teste.

## Publicar no serviço existente
1. Faça backup do banco e dos arquivos persistentes.
2. Atualize a raiz do repositório com o conteúdo da pasta Central_V27_Render.
3. Preserve o mesmo serviço Render, disco, banco, usuários e variáveis de ambiente. Não recrie o serviço nem substitua suas chaves pelo arquivo de exemplo.
4. Build: npm ci --include=dev && npm run build
5. Início: npm start
6. Preserve GEMINI_API_KEY e o GEMINI_MODEL já configurado. Assuntos quentes requer que esse modelo/projeto aceite Google Search. A busca pode consumir cota adicional do Google.

## Alterações para validar
- Ideias: Carrossel, Tweet, Reels e Qualquer formato; contexto do DNA; lista de sugestões e Criar conteúdo.
- Na pele do cliente: público temporário preenchido pelo DNA, segmentos pesquisáveis, outro segmento, porte, observações, Encontrar pautas, cards com situação/gancho e Salvar pauta. O salvamento é privado e pode ser desfeito clicando novamente. Explorações ficam no histórico da pasta. Alterar o público dessa busca não altera o DNA.
- Assuntos quentes: consulta online Google Search pelo Gemini, períodos de 24h/48h/7 dias, fontes, datas, potencial estimado e criação a partir da notícia. Busca ao abrir a aba, mudar o período ou atualizar; não há pesquisa contínua em segundo plano. Temas e público do DNA são usados na pesquisa. O Gemini organiza o resultado com a base do DNA.
- Notícias sem fonte retornada pela pesquisa ou sem data suficiente para o período são omitidas. Datas são extraídas pela IA e devem ser conferidas na matéria. Sem horário, um dia só entra se couber integralmente no intervalo. A etiqueta de potencial é estimativa editorial, não métrica de viralização.
- Método PAV: galeria com Carrossel, Tweet e Reels. Exemplos ilustrativos próprios; Reels são cartões estáticos, sem vídeo. Não inclui materiais do curso de referência. A imagem específica da aba Carrossel ainda não foi fornecida, por isso a referência atual é própria.
- Múltiplos DNAs, cores da Central e mesmas funções em PAV/PVC preservados.

## Validação realizada
85 testes aprovados, incluindo isolamento de dados, persistência de pautas, formatos, busca com fontes e filtros temporais. Compilação de produção aprovada. Navegação de Assuntos quentes conferida com dados simulados. Não houve chamada real ao Gemini nem deploy neste ambiente.

## Conferir após deploy
Selecione um DNA completo. Abra Assuntos quentes e aguarde; confira 24h, 48h e 7 dias, links e datas. Crie conteúdo a partir de um resultado. Se houver erro de chave, modelo, permissão ou cota, o site mostrará a falha sem inventar notícias.
Em Na pele do cliente, gere uma busca, salve uma pauta e confira a marcação ao consultar o histórico da pasta. Valide também criação por formato em Ideias e navegação da galeria.

As tabelas adicionais são criadas automaticamente no banco existente. O arquivo ZIP anterior não contém estas alterações.
