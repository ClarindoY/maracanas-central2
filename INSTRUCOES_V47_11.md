# REPMAR / Eduarda Rabelo — V47.11 (homologação da Biblioteca Documental)

## Origem da versão

Este pacote foi preparado a partir dos arquivos disponíveis da **V47.10.1 CORRIGIDA**, com integração da gestão de exclusões e lotes existentes nas versões **V47.2/V47.3**. O usuário mostrou uma captura do site publicado identificando **V47.10, build 31/10/2026 00:56:01, commit 156d9da5**. **Não foi possível confirmar que o ZIP V47.10.1 contém todas as alterações do código efetivamente publicado em 31/10/2026.** Compare com o código que está no repositório de produção antes de fazer merge ou deploy; caso tenha divergências, integre apenas as mudanças da biblioteca na base mais atual. NÃO substitua às cegas a produção com este ZIP.

## Alterações entregues (biblioteca)

- Conserva o upload de PDFs de até 20 MB e importação ZIP da base V47.10.1 (até 260 MB, até 2500 entradas, PDFs de até 20 MB, sem ZIPs aninhados).
- Retoma **Remover documento** e **Cancelar lote ZIP** com justificativa obrigatória, permissões e auditoria. Retirada lógica (`status='Removido'`), mantendo os PDFs físicos; gestores podem agir sobre itens revisados, autores apenas sobre os próprios itens pendentes.
- Impede exibir, baixar, revisar, buscar e indexar documentos retirados na lista ativa. O histórico original continua guardado.
- Corrige a verificação de PDFs duplicados para ignorar registros logicamente retirados, mantendo originais no disco para auditoria (a reimportação consome espaço adicional).
- Adiciona **edição administrativa da categoria e validade** confirmada manualmente, com motivo e trilha de alterações. Datas ausentes não são inventadas nem consideradas vencidas.
- Adiciona filtros locais por nome/pasta, categoria e situação; mostra o estado de validade com base no metadado registrado.
- Corrige a consulta de progresso da indexação (alias SQL `indexed` com aspas, pois o nome sem escape causava erro de sintaxe em SQLite).
- Inclui testes automatizados específicos para upload, duplicatas, permissões, lotes, metadados e remoção.

## Arquivos principais alterados

- `server/library.mjs` — segurança, status, metadados, gestão de lotes, migração incremental `expires_at`.
- `server/index.mjs` — APIs `GET /api/library/batches`, `POST /api/library/batches/:uuid/cancel`, `DELETE /api/library/documents/:id`, `PATCH /api/library/documents/:id/metadata`.
- `src/DocumentLibrary.jsx` — gerenciamento e filtros na interface.
- `src/App.jsx`, `src/deploy-info.json`, `scripts/write-deploy-info.mjs` — indicador de versão.
- `tests/library-management.test.mjs` — cenários de regressão.

## Verificações realizadas neste ambiente

- `node --check` dos arquivos `.mjs` editados: **OK**.
- Validação de sintaxe JSX via parser TypeScript: **OK**.
- Fluxo de banco SQLite com imports externos substituídos por *stubs locais*: **OK** para migrações, duplicidade, upload, metadados, permissões, remoção lógica, auditoria, filtros de indexação e cancelamento de lote. **Isso não é equivalente a executar toda a aplicação**.
- `npm ci`, `npm test`, `npm run build`: **NÃO executados com sucesso** porque a instalação de dependências do npm não pôde ser concluída (sem acesso à rede para pacotes não presentes no cache). A compilação e a suíte completa precisam ser executadas antes da publicação.

## Como testar sem alterar os dados de produção

1. Faça snapshot/backup do disco persistente do Render, especialmente banco `ER_AUTH_DB`, pasta `library` ao lado do banco e anexos do funil.
2. Reúna os arquivos-fonte reais do commit publicado, compare com este pacote e faça merge somente das alterações relevantes.
3. Em cópia de homologação com banco e documentos **de teste**, instale Node.js 22.13+, execute `npm ci`, `npm test`, `npm run build`, `npm start`.
4. Teste login, seleção de empresa, upload PDF, ZIP pequeno, classificação, busca, indexação, revisão, edição de validade, remoção, cancelamento de lote e preservação da auditoria. Confira que nenhum documento da outra empresa aparece.
5. Confirme no cabeçalho **V47.11** e verifique que Dashboard, PNCP, funil, editais, marketing e permissões existentes continuam funcionando.
6. Só depois avalie publicar na mesma aplicação Render, mantendo intactos o disco, variáveis e banco. Não sobrescreva os uploads originais.

## Limitações conhecidas

- **Ainda não implementados:** classificação semântica de atestados por OpenAI, cálculos de índices financeiros, OCR dos PDFs digitalizados pela Biblioteca, comparação automatizada documento × edital e recomendação de empresa. Essas são as próximas entregas.
- Importação ZIP ainda é síncrona e pode consumir memória. Para acervos grandes, testar limites do proxy, proteção contra conteúdo malicioso, armazenamento e eventual processamento assíncrono antes de usar documentos sensíveis.
- Remoção lógica **não libera espaço no disco** e não foi criada interface de restauração.
- Mudança de categoria/validade é uma informação declarada pelo revisor; não significa verificação automática nem habilitação jurídica.
- O Render do projeto declara disco de 1 GB, compartilhado com banco, documentos e backups; monitore espaço antes de importar arquivos grandes.
