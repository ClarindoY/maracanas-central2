# V44 — múltiplas personalizações

Atualização completa do serviço existente. Preserve banco, disco, usuários e chaves. Faça backup antes de publicar. Copie o conteúdo de Central_V44_Render para a raiz do repositório.
Build: npm ci --include=dev && npm run build
Start: npm start

## Alterações
A aba Seu DNA foi retirada. Personalização reúne perfil/oferta, público/objetivos, voz/conteúdo e limites. O menu agora tem sete abas nos quatro grupos. Criar continua como tela interna.
Personalizações podem ser criadas, duplicadas, selecionadas e renomeadas. Os registros existentes são preservados, inclusive seus nomes e projetos antigos. As tabelas e campos internos continuam compatíveis com os registros DNA anteriores; não há exclusão ou recriação do banco.

## Eduarda / E2
Use o botão + Usar base Eduarda/E2, confirme o nome e clique Criar personalização. Isso cria uma nova base privada para a sua conta, sem sobrescrever as existentes. A base usa os dados enviados, tom educativo/descontraído, orientações práticas e estratégicas, temas e limites da cliente. Revise antes de usar. O campo público reproduz somente a parte legível fornecida, sem inventar a continuação cortada da imagem.
Homologação e assinatura de contrato são tratadas como conceitos que não devem ser confundidos, não como assuntos proibidos. Os outros perfis não recebem as instruções da Eduarda automaticamente.

## Validação
Nove testes aprovados: preservação, duplicação, isolamento entre contas/perfis, geração e revisão com a base escolhida, complementação por IA e criação da base Eduarda. Build aprovado. Não houve deploy ou chamada real ao Gemini. A qualidade editorial precisa ser validada com novos conteúdos gerados no serviço.

O problema externo de resposta HTML ao abrir Marketing continua dependendo do link publicado para diagnóstico; a V43 incluiu tratamento de falha e layout corrigido, preservados aqui.
Próxima entrega: V45. V43 e versões anteriores preservadas.
