# REPMAR V47.10.1 — Correção de inicialização no Render

Falha corrigida: `summary-recovery.mjs` não exportava `recoverPending`. O módulo agora exporta `recoverPending`, `pendingFields`, `focusedPages` e `reconcileBlockFields`, preservando a recuperação incremental e a recuperação parcial por blocos.

## Publicação segura
1. Faça backup do banco de dados e dos PDFs já importados.
2. Mantenha as variáveis privadas do serviço e o disco persistente atual. Não substitua o banco de dados.
3. Atualize os arquivos da aplicação no repositório, sem enviar `node_modules`, `.env` ou arquivos `.db`.
4. Execute `npm ci`, `npm test`, `npm run build`, `npm start`.
5. Confirme no topo `V47.10.1` e no Render que o deploy está Live.
6. Teste um resumo já existente e o botão de recuperar apenas campos pendentes.

Esta correção resolve a ausência de export identificada no log. Não implica validação de chamadas reais à OpenAI.
