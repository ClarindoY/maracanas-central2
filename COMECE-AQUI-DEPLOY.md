# Central V27 — Marketing PAV/PVC

Pacote completo do aplicativo para atualizar o serviço existente no Render.

## Atualização
1. Faça backup do banco e dos arquivos persistentes do serviço atual.
2. Copie o conteúdo de Central_V27_Render para a raiz do repositório usado pelo serviço, atualizando os arquivos correspondentes.
3. Mantenha o mesmo serviço, disco persistente, banco, usuários e variáveis de ambiente. Não substitua suas chaves pelo arquivo de exemplo. Preserve GEMINI_API_KEY e o GEMINI_MODEL que já funciona no seu serviço.
4. Build: npm ci --include=dev && npm run build
5. Início: npm start
6. Após o deploy, entre com sua conta existente e valide os passos abaixo. Não é necessário recriar administradores.

## Alterações
- Lateral em azul-marinho, preto e branco, com ícones, grupos e seletor PAV/PVC.
- As duas abas oferecem as mesmas funções e compartilham os dados; não são contas ou acervos separados.
- Criar, Criar por áudio, Academia de Viralização, Seu público, Assuntos quentes, Na pele do cliente, Ideias, Meus conteúdos, Seu DNA e Método PAV.
- Personalização e Marcas e identidade preservadas em Configuração.
- Múltiplos DNAs privados por usuário: selecionar, criar, duplicar e renomear. As novas ferramentas usam o DNA escolhido.
- Seu público edita a base do DNA. Ideias gera cinco propostas por solicitação, com histórico por DNA e opção de levar à criação.
- Assuntos quentes trabalha com notícias fornecidas pelo usuário, incluindo data e fonte quando disponível. Não pesquisa a internet nem verifica automaticamente tendências.
- Criar por áudio aceita arquivo MP3, WAV, OGG ou WebM de até 8 MB. Não grava pelo microfone. Envia o áudio ao Gemini; guarda a transcrição, não o arquivo original. Transcrição limitada a 8.000 caracteres.
- Academia e Método têm orientações próprias da Central, sem reproduzir aulas ou materiais proprietários do site de referência.
- Tabelas adicionais são criadas automaticamente, mantendo os registros existentes.

## Validação antes da entrega
- Suíte completa: 78 testes aprovados.
- Teste adicional de transporte de áudio ao Gemini aprovado; arquivo Gemini reexecutado com quatro testes aprovados.
- Build de produção aprovado.
- Conferência visual interna do menu, troca PAV/PVC, público, ideias e áudio.
- Não houve deploy nem chamada real ao Gemini nesta validação. O funcionamento com áudio depende do suporte e da disponibilidade do modelo configurado.

## Conferência após publicar
- Selecione um DNA, edite o público, salve e recarregue para conferir persistência.
- Alterne PAV/PVC e confirme que o menu oferece as mesmas funções.
- Gere ideias e leve uma delas à tela Criar.
- Forneça uma notícia com data em Assuntos quentes e gere abordagens.
- Envie um áudio curto, revise a transcrição e use-a na criação.
- Confira que outra conta não vê os DNAs ou históricos privados da primeira.

O pacote não inclui bancos de dados, chaves reais, node_modules, compilados ou páginas temporárias de demonstração. As telas foram implementadas a partir das referências disponíveis; não há acesso ao código ou às áreas não fornecidas do site de referência.
