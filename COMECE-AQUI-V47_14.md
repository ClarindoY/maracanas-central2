# REPMAR V47.14 — Roteiro de validação

Atualização sobre a V47.13. Para GitHub, envie o conteúdo de Enviar_ao_GitHub para a raiz do projeto. Não envie node_modules, PDFs de clientes ou credenciais. Preserve o banco e o disco do serviço. Faça backup antes de publicar.

1. Biblioteca documental: selecione a empresa, envie um PDF de teste, confira a confirmação e baixe pelo recibo. Abrir a biblioteca inicia a leitura dos pendentes da empresa em segundo plano. PDFs digitalizados passam por OCR local (até 20 páginas de OCR por documento); pendências ficam para revisão. O servidor continua lendo enquanto o serviço estiver ativo; após um reinício, abrir a biblioteca retoma a fila. Uma leitura não aprova um documento.
2. Central de editais: escolha pesquisa por palavra-chave ou pelos atestados. A busca documental usa um serviço identificado no acervo da empresa e consulta o PNCP. Resultados e anexos precisam ser conferidos no portal.
3. Importar edital: selecione um edital público e seus anexos e use “Importar e resumir com OpenAI”. A ficha e os PDFs são guardados antes da chamada. O resumo indica documento e página. Ao identificar um único número de controle ou link oficial do PNCP, a aplicação consulta esse registro; não associa editais apenas por palavras semelhantes. Retificações e anexos não enviados exigem conferência na fonte.
4. Na ficha, vincule a empresa, use “Avaliar participação” e confira a seleção sugerida da biblioteca. Revise os documentos e clique em “Confirmar documentos da disputa”. Os vínculos ficam na ficha por empresa; não há envio automático ao portal. Certidões da mesma categoria podem ter conteúdo ou abrangência diferentes.
5. Decisões: veja os processos marcados Avaliar ou Participar, comentários e resumo; encerre com justificativa. Dashboard: confira as etapas e os filtros de empresa, responsável e prazo. Registros antigos sem empresa continuam sem vínculo até revisão.

## Validação executada
119 testes passaram, produção compilada, fluxo no Chrome com banco temporário, consulta real ao PNCP (20 resultados na página). PDF e OCR, citações e respostas inválidas têm cobertura na suíte. O fluxo de resumo foi testado com respostas simuladas; a execução local não dispõe de chave OpenAI. Não foi publicado no Render.

## Conferência com OpenAI de verdade
No Shell de homologação do Render, com OPENAI_API_KEY e OPENAI_MODEL configurados, na pasta que contém package.json, execute:
RUN_LIVE_SUMMARY=1 node --test --test-name-pattern="resumo do PDF importado" tests/operations.test.mjs

Esse teste faz chamadas cobradas ao modelo usando apenas um PDF fictício em banco temporário. Verifica objeto, referência à página, quantidade 50, valor unitário R$ 106,42 e total do item R$ 5.321,00. O teste deve terminar com pass 1. Não use o modo de teste ao rodar o serviço. A qualidade do resumo de um edital específico deve ser confirmada nas páginas originais.
