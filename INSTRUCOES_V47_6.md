# V47.6 — Pesquisa documental

Base: V47.5. Faça backup de `data/`, banco SQLite e pasta `library/` antes do deploy. Não substitua o banco existente.

1. Instale dependências: `npm ci`.
2. Execute `npm test` e `npm run build`.
3. Reinicie o backend.
4. Na Biblioteca, escolha a empresa e clique em **Indexar próximos 2 PDFs** repetidamente.
5. Pesquise palavras presentes no conteúdo.

**Limitações:** esta entrega realiza extração textual de PDF e pesquisa por palavras; não é uma análise semântica OpenAI de atestados e balanços. PDFs digitalizados sem texto serão marcados como incompletos e precisarão de OCR posterior. Os índices financeiros ainda não são calculados. Documentos permanecem com status de validação humana. Não houve reimportação e não foi criada função de cancelamento de lotes.
