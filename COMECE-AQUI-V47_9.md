# REPMAR V47.9 — Criar e perfil global

Pacote completo baseado na V47.8, preservando a base documental V47.6.

## Alterações
- Criar com saudação, cinco cartões de formato, objetivos, estilos, técnicas e metas semanal/mensal, conforme referência visual.
- Seletor único de perfil abaixo de Marketing. O perfil selecionado orienta as abas e fica lembrado neste navegador por usuário.
- Criação, duplicação e renomeação dos perfis ficam em Personalização.
- Removidos os controles de marcas, identidade visual e upload de logo. Dados antigos preservados.
- Assuntos quentes pergunta Carrossel, Tweet ou Roteiro de Reels antes de abrir a criação; preserva contexto e fonte.

## Metas
Metas persistidas por usuário e perfil. Marcar um conteúdo como publicado registra a primeira data de publicação, sem postar nas redes sociais. Repetir a marcação não duplica a contagem. Semana começa segunda-feira; datas seguem America/Fortaleza. Conteúdos antigos publicados sem data registrada não entram nas metas.

## Atualização no Render
Use o conteúdo desta pasta no mesmo serviço, preservando o disco e banco atuais e todas as variáveis de ambiente. Não é necessário trocar a chave OpenAI. Build: npm ci && npm run build. Início: npm start. As tabelas novas de metas são criadas automaticamente, sem apagar os dados existentes. Faça backup do banco antes de atualizar.

## Verificação
105 testes aprovados; compilação de produção aprovada. Conferência local com dados simulados: seletor global, troca de perfil, formulário de Personalização sem marcas/logo e notícia abrindo Reels no perfil correto. Nenhuma chamada paga à API nem publicação no Render nesta entrega. Áudio mantém os formatos suportados atualmente: MP3, WAV e WebM, até 8 MB.
