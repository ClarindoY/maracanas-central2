# Central V41 — menu reduzido para validação

Pacote completo para atualizar o serviço existente. Preserve banco, disco, usuários e variáveis de ambiente. Faça backup antes de publicar. Substitua os arquivos do repositório pelo conteúdo de Central_V41_Render, mantendo as chaves reais somente no Render.

Build: npm ci --include=dev && npm run build
Início: npm start

## Menu desta versão
CRIAR: Academia de Viralização.
INTELIGÊNCIA: Seu público; Assuntos quentes; Na pele do cliente; Ideias.
CONTEÚDO: Meus conteúdos.
ESTRATÉGIA: Seu DNA; Personalização.

Marketing abre na Academia. Criar é uma tela interna, acessada pelos botões Aplicar/Praticar e Criar conteúdo, não uma aba extra. Não há seletor PAV/PVC no menu. Cadastro de marcas fica em Personalização.

## Escopo e pendências
Esta entrega reduz e organiza a navegação. Mantém as funcionalidades da V40 e não afirma concluir a reprodução da Academia: ela ainda apresenta as seis lições existentes. A biblioteca de 13 técnicas, favoritos, detalhes, contagem de uso e meta semanal da referência aguardam a validação do fluxo pelo usuário. A variação editorial das ideias e os resultados reais do Gemini também serão validados aba por aba.

As correções anteriores de texto puro, objetivos, polarização e ângulos estão incluídas. Textos antigos não são reescritos automaticamente. Assuntos quentes consulta Google Search pelo Gemini ao abrir, trocar período ou atualizar; depende de chave/modelo/cota. Não há monitoramento contínuo.

## Verificação
Oito abas conferidas na configuração do menu e compilação de produção aprovada. Esta entrega não foi publicada no Render e não realizou chamadas reais ao Gemini. Dados, credenciais, dependências instaladas e páginas temporárias de teste não estão no ZIP.

Versão de entrega: V41. package.json conserva a versão técnica legada 0.27.0. V40 preservada; próxima entrega com alterações será V42.
