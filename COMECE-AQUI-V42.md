# V42 — Academia de Viralização

Pacote completo, mantendo as oito abas da V41. Atualize os arquivos do repositório do serviço Render existente. Preserve banco, disco e chaves; faça backup antes de publicar.
Build: npm ci --include=dev && npm run build
Início: npm start

## Academia
- 13 técnicas em cartões numerados, com duas colunas no desktop e uma no celular.
- Estrelas para favoritar, persistência privada por usuário e filtro de favoritas.
- Aplicar essa dica abre Criar com assunto vazio, Reels, Viralizar e técnica selecionada. Não chama a IA automaticamente. O DNA ativo é preservado e técnicas adicionais continuam disponíveis.
- Ver detalhes expande explicação e exemplo ilustrativo próprios da Central. A tela de detalhes da referência não foi fornecida; não se afirma reprodução exata de seu conteúdo.
- Usada Nx conta projetos gerados e ainda salvos com a técnica no DNA selecionado. Abrir/aplicar a dica não incrementa; excluir projetos pode reduzir a contagem. Favoritos são da conta, independentemente do DNA.
- A meta semanal vista na referência ainda não foi implementada. Gravação de áudio também não é parte desta entrega.

## Conferência
15 testes de Academia e Marketing aprovados, cobrindo técnicas, passagem à criação, validação, favoritos privados, persistência e contadores por DNA. Build aprovado. Não houve deploy nem chamada real ao Gemini.

Após publicar, abra Academia, favorite a técnica 01, recarregue e confira a estrela. Abra Ver detalhes. Clique em Aplicar essa dica e confira assunto vazio, Reels, Viralizar e técnica marcada. Gere um conteúdo e volte à Academia para conferir o contador. Teste também outro DNA para conferir a separação dos usos.

Os dados anteriores são preservados; a tabela de favoritos é criada automaticamente. Próxima versão de entrega: V43. package.json conserva a versão técnica legada 0.27.0.
