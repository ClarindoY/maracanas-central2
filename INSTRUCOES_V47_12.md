# Central REPMAR — V47.12: Biblioteca Documental (entrega para HOMOLOGAÇÃO)

## De onde partiu

Base de código: **V47.11** (derivada do ZIP `REPMAR_V47_10_1_CORRIGIDA.zip`).
A captura do Render mostrava **V47.10, commit 156d9da5, compilação 31/10/2026**. Não foi feita comparação com o repositório exato atualmente publicado. **Não publicar esse ZIP diretamente em produção sem comparar/mesclar o código atual.**

## Funcionalidades desenvolvidas

1. Mantidos: PDF individual e ZIP, separação por REP/Maracanãs, metadados, hash contra duplicidade, permissões, downloads, auditoria, categorização, revisão de documentos, busca textual, indexação incremental, remoção lógica e cancelamento de lotes.
2. **Lixeira + restauração**: gestor pode localizar e restaurar documentos retirados. A restauração exige justificativa e devolve o documento a `Pendente` e a análise a `Desatualizado`; todos os eventos permanecem auditáveis.
3. **Leitura específica de cada PDF com OCR em português**: botão `Ler / OCR`, que usa o leitor já incluído no projeto (`pdfjs-dist`, Tesseract) com limite de 20 páginas de OCR por solicitação. Páginas não lidas continuam identificadas como pendentes. Não se declara análise completa se houver páginas pendentes.
4. **Análise documental OpenAI por PDF**: após indexar, clicar `Analisar com IA`. A IA estrutura informações para atestados, balanços e outros, com nome, emissor, objeto, período, lista de campos e **citação literal com página**. A API confere se a citação realmente existe no texto da página. Trechos inventados são marcados `Citação NÃO confirmada` e não entram como prova.
5. **Índices financeiros preliminares** para balanços: liquidez corrente = AC/PC; liquidez geral = (AC+RLP)/(PC+ELP); solvência geral = AT/(PC+ELP). Só se calcula com valores não negativos, citação documental reconhecida e denominador >0. Alertas de unidade monetária ambígua impedem cálculos. Valores devem ser conferidos pela equipe antes de usar em licitação; a fórmula exigida depende do edital.
6. **Revisão humana da análise IA**: cada análise começa Pendente. Gestor pode registrar conferência (`Revisado`) ou rejeição, com justificativa e auditoria; gerar nova análise arquiva a versão anterior e zera a revisão. Alterar categoria/reindexar torna a análise anterior desatualizada.
7. **Comparador por empresa / edital**: colar os requisitos do edital (15–12.000 caracteres) e opcionalmente escolher licitação cadastrada no Funil. A IA compara APENAS com as evidências estruturadas existentes na empresa escolhida, verifica o vínculo literal `documentId / página / quote` e marca `Evidência localizada`, `Revisão necessária` ou `Não comprovado`. Documentos ou análises não revisados, vencidos ou com leitura incompleta exigem revisão humana. Os relatórios ficam salvos, com data e vínculo opcional à licitação; não modificam a decisão no Funil.
8. **Inventário / relatório CSV por empresa** com quantidade de documentos, categorias, status, validades informadas, índice e análises revisadas.

## Segurança e limites — IMPORTANTES

- A IA **não valida legalmente** um balanço, atestado ou a habilitação; a equipe responde pela conferência. Indicadores podem exigir regras específicas do edital, auditoria contábil e verificação da versão do documento.
- Chave OpenAI SOMENTE na variável `OPENAI_API_KEY` do Render. A análise documental usa `OPENAI_MODEL` (`gpt-4.1-mini` como padrão da base); o Marketing usa uma variável separada. Nunca colocar chaves em JS/HTML públicos.
- O leitor OCR tem limite de 20 páginas por análise. Documentos digitalizados maiores poderão permanecer incompletos, sem falsa afirmação de cobertura integral.
- A importação ZIP original permanece síncrona e carrega o ZIP em memória. **Não envie diretamente o acervo ATESTADOS MRN.zip de ~239 MiB numa instância Render de pouca RAM.** Divida em ZIPs menores de 45 MiB com o script `scripts/dividir_acervo_zip.py` em computador local. O script mantém caminhos de subpastas e importa só PDFs.
- **Atenção ao backup:** a rotina `server/backups.mjs` atual salva banco de dados e anexos de licitações, mas **não copia o diretório privado `library/`**. Portanto não é backup completo da Biblioteca. Antes de usar documentos reais, configure backup externo do banco **e** dos PDFs no disco do Render, com restauração testada. Não confie apenas na cópia horária existente. A configuração do Render usa disco de 1 GiB; avalie capacidade, crescimento e retenção de arquivos removidos (remoção lógica não libera espaço).
- Importações existentes e banco são preservados por migrações aditivas (`library_analyses`, `library_analysis_versions`, `library_comparisons`); nada é apagado de propósito.
- O comparador **não extrai automaticamente requisitos de um PDF PNCP**: estes devem ser inseridos por pessoa responsável. O vínculo opcional com o Funil registra apenas a ID da licitação; envio automático do parecer para o Funil e aprovação da participação são etapas separadas.
- Os quatro acervos reais da REP e Maracanãs **NÃO acompanham** este ZIP, **NÃO foram enviados à produção** e **NÃO foram processados com IA** nesta entrega. A importação deve ser validada no ambiente controlado.

## Homologar antes de publicar

1. Fazer backup externamente do `ER_AUTH_DB`, da pasta `documents/` do Funil e de **toda a pasta `library/`**.
2. Comparar o código da V47.12 com o commit **atual do repositório de produção**, aplicar merge das alterações da Biblioteca para não sobrescrever ajustes recentes do PNCP, Funil, Marketing etc.
3. Usar uma cópia isolada com SQLite/arquivos fictícios. Node.js >=22.13: `npm ci --include=dev`, `npm test`, `npm run build` e `npm start`. O deploy no Render exige todos esses comandos e não deve usar o ambiente de testes conectado à produção.
4. Testar: login; mudança de empresa; upload PDF e ZIP pequeno; duplicados; indexação e OCR; busca textual; IA com chave de testes; números e citações; revisão; edição de categoria/validade; comparador; relatório CSV; remoção; lixeira/restauração; auditoria; limite de espaço e permissões; ausência de acesso entre perfis sem autorização.
5. Só então dividir/importar os acervos reais (sempre com **empresa correta**): `ATESTADO REP.zip`, `BALANCOS_REP.zip` → REP; `ATESTADOS MRN.zip`, `BALANCOS_MRN.zip` → Maracanãs. Evitar reimportar arquivos já existentes. Avaliar disco disponível antes e depois.
6. Fazer backup após homologação e validar um teste de restauração.

## Testes executados nesta entrega

- `node --check` nos módulos `.mjs` alterados: OK.
- Parser TypeScript no `src/DocumentLibrary.jsx` e `src/App.jsx`: OK.
- Testes unitários puros em `tests/library-ai.test.mjs` e adaptador OpenAI `tests/openai-analysis.test.mjs`: 7 aprovados.
- 4 testes de operações SQLite (upload, duplicatas, lote ZIP, exclusão, validade, restauração, análise e comparador) aprovados **com substituições locais de dependências de PDF/ZIP e respostas simuladas da IA**, sem arquivos reais.
- Script de divisão do ZIP testado sobre `BALANCOS_REP.zip` original (6 PDFs); ZIP gerado íntegro.
- **NÃO foi executado `npm ci`, `npm test` completo ou `npm run build`**: pacote npm `zlibjs` não estava em cache e a instalação via rede expirou. OCR/Tesseract reais e API OpenAI com credenciais de produção não foram exercitados. Esse é o bloqueio de homologação.

**Resultado:** código de funcionalidades entregue para validação, **não significa que a biblioteca esteja homologada/publicada**. A aceitação final depende dos testes acima.
