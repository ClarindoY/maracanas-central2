# Central V27 — Na pele do cliente + Texto puro

Atualização de 19/10/2026 para a versão Estúdio Marketing. Inclui também as pastas por assunto/público entregues anteriormente.

## Instalar no projeto existente

1. Faça backup do banco e documentos atuais.
2. Copie src, shared, server e tests deste pacote para a raiz do projeto atual, substituindo os arquivos correspondentes. Não exclua os demais arquivos dessas pastas.
3. Mantenha o mesmo serviço, disco, ER_AUTH_DB, GEMINI_API_KEY, GEMINI_MODEL e demais variáveis no Render. Não é necessário trocar chaves ou criar outro serviço.
4. Publique pelo fluxo que já utiliza. Build: npm ci --include=dev && npm run build. Start: npm start.
5. A nova tabela de explorações e as estruturas de pastas são criadas automaticamente, sem apagar os dados existentes.

O pacote é uma atualização, não um projeto independente: use na versão Estúdio Marketing da Central V27. Se alterou o código desses arquivos desde a última entrega, integre as mudanças à sua versão atual. Não há banco, credenciais ou configurações do Render neste ZIP.

## Na pele do cliente

- Em Meus conteúdos, cadastre um assunto e um público dentro dele, com suas orientações.
- Abra Na pele do cliente e selecione o assunto/público.
- Opcionalmente escreva o que deseja entender agora.
- Explorar este público usa o Gemini configurado para produzir seis hipóteses: duas dúvidas, duas preocupações e duas objeções.
- Cada hipótese inclui pergunta do cliente, preocupação possível, abordagem de conteúdo e uma forma de validar com clientes reais.
- São hipóteses, não pesquisas nem depoimentos. Não há busca de notícias.
- As explorações são privadas por usuário e salvas automaticamente por público. A tela exibe as 50 mais recentes, sem apagar as anteriores. O prompt considera as perguntas das cinco últimas explorações para variar ângulos; não há garantia de eliminar toda repetição semântica.
- Criar conteúdo desta hipótese preenche o criador, mantém a pasta e leva o contexto original como hipótese. Escolha o formato e clique em Gerar conteúdo.
- Gerar novas hipóteses e gerar conteúdo são chamadas separadas à API do Gemini. Consultar o histórico e carregar uma hipótese no criador não usam a API.

## Arte branca sem enfeites

- Texto puro é o modelo padrão de novas criações.
- Exportação PNG em 1080 x 1350, fundo branco e texto preto grande em negrito, alinhado à esquerda e centralizado verticalmente.
- Sem logo, assinatura, foto, moldura, linhas ou contador de slides na imagem exportada. A marca pode continuar orientando o texto, sem aparecer na arte.
- O Gemini recebe orientação de texto curto por slide para carrossel/stories. Textos excessivamente longos mostram uma mensagem para encurtar, em vez de cortar silenciosamente.
- Projetos com modelo já salvo mantêm a composição anterior. Para mudar, selecione Texto puro e salve. Os outros modelos continuam disponíveis.
- Prévia e download usam o mesmo desenho. A interface da Central mantém sua identidade azul-marinho.

## Validação

52 testes passaram e a compilação foi concluída. A conferência visual usou dados demonstrativos locais; o fluxo de hipótese para criação e a exportação branca foram verificados no navegador. Os testes de Gemini usam resposta simulada; valide a geração real com sua chave no Render. Nenhum deploy foi feito nesta entrega.
