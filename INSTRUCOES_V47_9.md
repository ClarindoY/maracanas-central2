# REPMAR V47.9 — Busca complementar seletiva

Base: V47.8.1 (BUSCAR OFERTAS). Marketing e Biblioteca preservados.

## Nova função
Na ficha da licitação, depois de gerar o resumo completo dos PDFs, clique em **Buscar somente dados pendentes**. A API `/api/work/tenders/:id/summary-recovery` recebe POST e processa apenas campos sem valor do resumo vigente. Preserva respostas já confirmadas, evidências e complementos humanos. Registra cada tentativa em `summary.recoveryHistory` e na auditoria.

## Limitações
A seleção de páginas utiliza termos da pergunta; não é uma garantia de localizar todos os trechos. PDFs são relidos para montar o contexto da busca, mas campos já preenchidos não são reenviados à OpenAI. Dados comerciais externos não são pesquisados por este botão. Se o edital receber retificação, use a análise integral com os novos documentos. A indexação persistente para evitar releitura de PDFs é etapa futura. Cada operação exige chave OPENAI_API_KEY no servidor.

## Publicação segura
Faça backup do banco SQLite e dos documentos; publique primeiro em homologação. `npm ci`, `npm test`, `npm run build`, `npm start`. Nenhum arquivo de banco/dados do servidor deve ser substituído. Confira a versão no topo e teste um campo pendente. Não envie `.env` ao GitHub.
