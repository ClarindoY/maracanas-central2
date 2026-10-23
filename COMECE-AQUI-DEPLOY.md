# Central V27 — múltiplos DNAs — 23/10/2026

Pacote completo do site real. Substitui as entregas anteriores deste chat.

## Atualizar no Render
1. Faça backup do banco e documentos atuais.
2. Extraia e copie o conteúdo de Central_V27_Render para a mesma raiz do repositório que alimenta o serviço existente.
3. Preserve o serviço, o disco persistente, ER_AUTH_DB, GEMINI_API_KEY, GEMINI_MODEL e demais variáveis funcionais.
4. Build: npm ci --include=dev && npm run build
5. Start: npm start
6. Faça deploy do novo commit. Não recrie contas nem execute criar-admin para uma conta existente.

## Novidades
- Seletor Qual DNA deseja usar no Marketing.
- Novo DNA vazio, duplicação e renomeação; limite de 30 por usuário.
- O perfil antigo aparece como Meu DNA original, com os dados e versão preservados. Migração idempotente; a tabela antiga não é apagada.
- Personalização e Seu DNA editam apenas o perfil selecionado.
- Salvar e completar DNA com IA usa o perfil selecionado, preserva campos preenchidos e pede revisão antes de salvar os complementos.
- Criar usa o DNA selecionado no servidor e registra nome, ID, versão e dados no projeto.
- Histórico recente de pautas separado por DNA.
- Revisões preservam o DNA original do projeto.
- Na pele do cliente usa o DNA selecionado e separa o histórico visual; uma hipótese de outro DNA não pode ser usada por engano.
- Alterações não salvas precisam ser salvas antes de trocar de DNA.
- Criar em uma coluna, com objetivos, estilos e técnicas abertos, de acordo com as partes visíveis das referências. Identidade azul-marinho, preto e branco.

## Verificar após publicar
Abra Marketing, confira o DNA original e suas respostas. Duplique, dê outro nome, altere o público e salve. Troque entre os dois e recarregue para confirmar os dados. Gere um conteúdo com cada DNA e confirme o nome/versão registrados no projeto. Confira também a exploração Na pele do cliente.

## Validação
Build de produção aprovado. 73 testes passaram em execução sequencial, incluindo migração em banco reaberto, isolamento por usuário, duplicação, seleção de perfil, histórico e preservação dos projetos. A execução paralela inicial teve timeout na inicialização do servidor de teste de autenticação; a execução sequencial completa passou.
Não houve deploy nem chamada real ao Gemini. A qualidade do resultado e a configuração de API precisam de validação no serviço.

## Limites e escopo
As imagens fornecidas não mostram todas as telas e fluxos da referência. Esta versão não é uma reprodução integral verificada do PAV/PVC. Seu público, Assuntos quentes, Ideias, criação por áudio e academia não foram adicionados nesta entrega; não há pesquisa automática de tendências.
Não há exclusão de DNA nesta versão.
A seleção do DNA vale para a sessão aberta; ao entrar novamente, o perfil original é selecionado e os demais ficam disponíveis na lista.
As alterações locais anteriores de PNCP, resumo e filtros permanecem no pacote completo.
Arquivos de demonstração, banco, documentos privados, chaves, node_modules e dist não estão incluídos.
