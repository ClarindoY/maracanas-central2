# REPMAR V47.7 — Marketing com OpenAI

Base desta entrega: a pasta REPMAR_V47_6_Indexacao_Documental enviada pelo usuário em 29/10/2026. A pasta original em Downloads não foi alterada. Esta versão substitui a tentativa anterior de preparar uma V47 sobre a base antiga; aquela tentativa não foi empacotada nem publicada.

## Configurar no Render

1. Atualize o repositório do serviço existente com o conteúdo completo desta pasta. Preserve o disco, o banco e os uploads existentes. Faça o backup habitual antes da publicação.
2. Em Environment do mesmo serviço, adicione OPENAI_API_KEY com a chave criada na conta/projeto que recebeu os créditos. Cole o segredo somente no Render, não no código nem no chat.
3. Adicione MARKETING_OPENAI_MODEL com o valor gpt-5.6-terra.
4. Adicione OPENAI_TRANSCRIPTION_MODEL com o valor gpt-transcribe.
5. Salve e publique. Build: npm ci --include=dev && npm run build. Start: npm start.
6. Confira a faixa REPMAR · V47.7 e a data da nova compilação.

OPENAI_MODEL continua controlando a análise de editais que já existia na sua base. MARKETING_OPENAI_MODEL controla o Marketing separadamente. A chave OPENAI_API_KEY é compartilhada pelos dois módulos. Não apague configurações de banco, disco ou outros serviços. Não use prefixo VITE_ na chave.

Os modelos são configuráveis. A documentação pública confirma as capacidades; o acesso efetivo da sua conta só será confirmado na primeira chamada real. Não há troca silenciosa para outro provedor ou modelo.

## O que mudou

- Criação, revisão, sugestões para personalização, ideias e Na pele do cliente usam a OpenAI.
- Assuntos quentes e Cérebro do público usam busca web da OpenAI. A pesquisa é ampla, sem lista fixa de sites. O sistema exige execução da ferramenta e aproveita as fontes citadas.
- Mantidos filtros de 24h, 48h e 7 dias, datas e links das matérias, perfis privados e histórico. Notícias sem fonte ou data suficiente não são inventadas.
- Mantido cache de 15 minutos por usuário, perfil, versão e período. Atualizar assuntos força nova pesquisa. Consultas históricas podem continuar mostrando fontes da pesquisa antiga.
- Mensagens distinguem chave/permissões, modelo indisponível, saldo/limite de gastos insuficiente e limite temporário. Falhas preservam os registros anteriores. Chamadas não são repetidas automaticamente para evitar tentativas pagas duplicadas.
- Áudio é transcrito pela OpenAI em uma chamada própria. Nesta integração: MP3, WAV e WebM, até 8 MB. OGG não é oferecido porque não está na lista de formatos da documentação consultada. Gravação no navegador requer suporte a WebM; nos demais, envie um arquivo suportado.
- Indexação e pesquisa textual da Biblioteca, análise de editais, identificação do deploy e arquivos da V47.6 foram mantidos. Os testes antigos de editais foram atualizados para simular OpenAI, que a própria base já usava.

## Validar após publicar

1. Selecione um perfil em Personalização e confira público, temas e voz.
2. Em Ideias, gere pautas e confira se respeitam esse perfil.
3. Em Assuntos quentes, clique Atualizar assuntos uma vez. Confira os links, a data de consulta e o período de publicação. Se não houver notícias válidas em 24h, teste 7 dias.
4. Crie um conteúdo a partir de uma pauta e confira texto, formato e ausência de rótulos internos na arte.
5. Atualize o Cérebro do público. Os pensamentos continuam sendo hipóteses editoriais fundamentadas em sinais recentes, não entrevistas reais.
6. Troque de perfil e confirme que público e linguagem acompanham a escolha.
7. Confira o consumo no painel Usage da conta OpenAI.

A busca web e os tokens usam créditos da API. Uma atualização pode fazer a busca e uma segunda chamada para organizar as notícias; o Cérebro acrescenta uma chamada para montar o mapa. A cobrança não é um preço fixo por clique. Pagar créditos não comprova que o modelo está disponível nem que a integração já funciona na conta.

## Verificação desta entrega

103 testes passaram. Compilação de produção aprovada. Testes da API usam respostas simuladas, sem consumo de créditos. Nenhuma chave real foi fornecida ou incluída. Deploy e chamadas reais à sua conta não foram realizados.

Referências consultadas em 29/10/2026:
- https://developers.openai.com/api/docs/models/gpt-5.6-terra
- https://developers.openai.com/api/docs/guides/tools-web-search
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/speech-to-text

Os arquivos de instruções de versões anteriores foram mantidos como histórico; para esta entrega, siga este documento.
