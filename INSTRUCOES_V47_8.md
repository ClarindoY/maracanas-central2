# REPMAR V47.8 — Central unificada (primeira entrega)

## Base
Aplicada sobre o ZIP V47.7 OpenAI Marketing enviado pelo usuário. Preserva backend, biblioteca, marketing, autenticação e dados persistidos (o ZIP não leva banco de produção).

## O que mudou
- Menu lateral: unificação visual de "Funil de editais" e "Editais encontrados" em "Central de editais".
- A mesma tela oferece pesquisa PNCP, lista de oportunidades, etapa do funil, prazos e acesso à ficha existente.
- Novo botão "BUSCAR OFERTAS": realiza consultas sequenciais ao mecanismo PNCP existente para hospedagem, organização de eventos, agenciamento de viagens, transporte de passageiros e coffee break. Consulta apenas a primeira página de cada termo, para limitar tempo e carga.
- Triagem inicial com áreas configuráveis, estados "Potencialmente compatível", "Revisar objeto" e "Fora do perfil" e justificativa visível.
- Maracanãs e R&P aparecem como "habilitação pendente" — não há conclusão fictícia de aptidão.
- Indicador superior V47.8.

## O que NÃO está implementado
- Comparação automática de atestados/balanços com os itens de habilitação de cada edital.
- Identificação fundamentada de "quase apta por 1 documento".
- Parecer definitivo de aptidão ou seleção de empresa.
- IA semântica na triagem; a primeira camada é uma regra de correspondência textual que pode gerar falsos positivos e falsos negativos.
- Varredura exaustiva do PNCP (a busca percorre a primeira página de cinco termos).

Essas limitações são deliberadas para não anunciar aptidão sem evidências. Próxima fase: serviço de extração de requisitos por OpenAI, recuperação de evidências indexadas por empresa, classificação requisito a requisito, tarefa de regularização e aprovação humana.

## Testes e deploy
1. Faça backup do banco SQLite e da pasta de documentos persistida no Render. Não faça upload do banco de testes sobre produção.
2. Em um ambiente de homologação, extraia o projeto, configure variáveis privadas como na V47.7 e rode `npm ci`, `npm test`, `npm run build` e `npm start`.
3. Confira topo "V47.8". Abra Central de editais. Confira busca manual e botão de perfil, e abra uma ficha para validar que o funil original funciona.
4. Verifique Marketing e Biblioteca. Se houver erro, restaure o backup e a V47.7.
5. Credenciais OpenAI nunca devem ser adicionadas ao ZIP.

## Validação realizada neste ambiente
- Parse JSX `src/App.jsx` com TypeScript: sem erros sintáticos.
- `node --check server/index.mjs`: sem erros sintáticos.
- Dependências `node_modules` não estavam presentes; por isso o teste integrado, compilação Vite e chamada externa ao PNCP/OpenAI dependem da execução em homologação.
