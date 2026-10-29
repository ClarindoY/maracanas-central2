# REPMAR V47.5 — Identificador de deploy

Base: V47.4 revisada. Alteração: faixa no topo da tela autenticada com versão, data/hora de compilação (fuso Fortaleza) e hash curto do commit quando disponível no Render.

## Implantação
1. Fazer backup e publicar o código sem sobrescrever banco nem uploads.
2. Configurar o serviço para executar `npm ci && npm run build` antes de iniciar com `npm start` (ou manter o fluxo de build equivalente já existente).
3. Confirmar a faixa `REPMAR · V47.5` após publicar. O horário mostrado é o do BUILD, não necessariamente o horário exato em que o serviço ficou online.
4. Se o horário ou commit não mudar, conferir se um novo build ocorreu e limpar cache do navegador.

Não foram modificadas rotas de documentos, esquema do banco ou credenciais. Testes completos dependem das dependências do projeto.
