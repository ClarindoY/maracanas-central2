# REPMAR V47.10 — Correção de análise por blocos

Base: V47.9. A recuperação seletiva de categorias incompletas ocorre durante a leitura oficial.

## Mudanças
- Validação tolerante a respostas parciais do modelo; preserva campos válidos.
- Até duas tentativas complementares somente para as categorias faltantes.
- Se persistirem faltas, o bloco continua com campos explicitamente pendentes, sem inventar dados.
- Registros de auditoria mostram as categorias que permaneceram incompletas.
- Resumo previamente salvo permanece protegido até finalizar a análise.
- Indicador de deploy V47.10.

## Publicação
1. Faça backup do banco SQLite e dos PDFs de armazenamento, fora do repositório.
2. Teste em homologação: `npm ci`, `npm test`, `npm run build`.
3. Configure `OPENAI_API_KEY` no ambiente privado do backend.
4. Publique o código sem sobrescrever banco ou documentos persistentes.
5. Teste edital anteriormente interrompido no bloco técnico, confirme que não para por categorias incompletas.

## Limitações
Uma falha total da API ainda interrompe a análise; não seria seguro apresentá-la como sucesso. Uma categoria sem suporte recebe status pendente e não gera informação inventada. Não há integração semântica de habilitação nesta versão.
