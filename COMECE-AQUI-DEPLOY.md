# Atualização do site da Eduarda — 23/10/2026

Este é o código completo da aplicação Central V27 para atualizar o serviço existente no Render. Não é a demonstração local de licitações.

## Publicar
1. Faça uma cópia de segurança do banco e dos documentos do serviço antes da atualização.
2. Extraia o ZIP e copie o CONTEÚDO de Central_V27_Render para a raiz do mesmo repositório que já alimenta o Render. Atualize src, server, shared, tests e os arquivos de configuração juntos.
3. Mantenha o serviço, disco persistente e as variáveis de ambiente atuais. Não substitua o banco, não crie outro serviço e não execute criar-admin para uma conta existente.
4. Build: npm ci --include=dev && npm run build
5. Start: npm start
6. A pasta raiz do serviço deve ser aquela que contém package.json.
7. Publique o commit no mesmo repositório; aguarde o deploy automático ou solicite deploy do commit mais recente no serviço existente.
8. Após o deploy, abra Marketing → Personalização e Seu DNA. Recarregue a página se o novo menu não aparecer.

## Incluído nesta versão
- Personalização no menu Marketing, com perguntas de perfil, público, objetivos, diferenciais, temas e opções de oferta e comunicação.
- Seu DNA em formulário vertical com identidade profissional, positividade, tom, estilo, valores, objetivos e limites.
- Assuntos a evitar, palavras proibidas e coisas que você nunca diria.
- Dados anteriores preservados; os dois formulários compartilham uma base por usuário.
- Montar com IA usa a integração Gemini do servidor e preenche somente campos vazios. A sugestão deve ser revisada e salva pelo usuário.
- Aviso Salvando DNA, barra de espera indeterminada, confirmação e mensagens de erro.
- Criações novas usam a base salva; revisões preservam o DNA registrado no projeto.
- Inclui também as alterações locais anteriores de busca/PNCP, resumo e filtro de valor mínimo/máximo. Esse filtro atua no acervo carregado.

## Validação
69 testes aprovados e build de produção aprovado. Testes da IA usam respostas simuladas. Não foi feita chamada real ao Gemini nem deploy nesta entrega.
No serviço publicado, confirme: salvar personalização, recarregar e verificar os dados; montar DNA com Gemini, revisar e salvar; gerar conteúdo; conferir um edital e seu resumo.
Preserve GEMINI_API_KEY e GEMINI_MODEL atualmente funcionais. A montagem usa a API existente e depende da chave, do modelo e da cota disponíveis.

## Limites
Permanece um DNA por usuário. Vários DNAs selecionáveis por marca não foram implementados.
O layout exato da tela Criar ainda aguarda a imagem correspondente; a criação funcional atual foi preservada.
As restrições editoriais são enviadas ao Gemini e requerem revisão humana do resultado; não são garantia automática de cumprimento.
O pacote não contém chaves, banco de dados, documentos de usuários, node_modules, dist ou as páginas de demonstração. O Render gera dist no build.

## Complemento desta entrega

Na Personalização, clique em Salvar e completar DNA com IA. O sistema salva primeiro as respostas, pede ao Gemini complementos para campos vazios e abre Seu DNA para revisão. Clique em Salvar meu DNA depois de revisar. Campos pessoais sem base suficiente podem continuar vazios; não é obrigatório preencher todos. Se a IA falhar, as respostas continuam salvas e pode-se tentar Montar com IA em Seu DNA. A opção de salvar apenas a personalização continua disponível.

Esta atualização resolve a etapa faltante de completar os campos extras, conforme esclarecimento do usuário. Não foi identificado desaparecimento das respostas salvas. Mensagens antigas de sucesso são removidas ao editar. Testes de IA simulados; nenhuma chamada real ou deploy realizado.
