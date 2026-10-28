# Central V45 — Marketing

Pacote completo para atualizar o serviço existente no Render. Não foi publicado automaticamente.

## Mudanças
- Personalização com as dez perguntas na ordem da referência, tipos de oferta e tons selecionáveis, temas lado a lado e Salvar. Orientações adicionais e marcas ficam recolhidas para preservar os campos anteriores.
- Perfis independentes: seleção, criação, cópia e renomeação. O nome legado padrão aparece como Meu perfil original. O botão público Eduarda/E2 foi retirado; os perfis existentes não são apagados.
- Cérebro do público com 18 categorias expansíveis e filtros de situações. Atualizar mapa/Encontrar novas dores pesquisam os últimos sete dias via Gemini + Google Search, consideram o perfil selecionado e guardam fontes e data. Não há coleta contínua em segundo plano. Pensamentos são hipóteses editoriais, não entrevistas. Sem fontes suficientes, não inventa resultados atuais.
- Na pele do cliente: situações por segmento, salvar pauta e escolher Carrossel, Tweet ou Roteiro de Reels no cartão antes de abrir a criação. O briefing leva situação, gancho sugerido e motivo de relevância; mantém a origem e o perfil.
- Criação em uma coluna antes do resultado, objetivo/polarização/ângulo, áudio para transcrição e opções complementares recolhidas. Rótulos internos não devem aparecer na arte.

## Instalação
Use o conteúdo de Central_V45_Render no repositório do serviço existente. Mantenha o disco e as variáveis de ambiente atuais, especialmente ER_AUTH_DB e a configuração Gemini. Build: npm ci --include=dev && npm run build. Início: npm start. O render.yaml acompanha o pacote. Não substitua o banco existente por um banco vazio.

## Validação e limites
93 testes automatizados passaram; build aprovado. Testes adicionais das alterações finais passaram. Telas conferidas em navegador com dados de teste. Gemini/Google Search reais e gravação de microfone não foram exercitados nesta preparação. As buscas exigem chave, cota e modelo compatível no serviço publicado. Áudio: MP3, WAV, OGG ou WebM até 8 MB; gravação até dez minutos, sujeita ao limite de tamanho e suporte do navegador.

A disposição foi adaptada aos prints com nossas cores; igualdade visual pixel a pixel e responsividade completa ainda precisam da validação no site publicado. Explorar abre o motivo e a fonte da hipótese. Os ícones de aprovação/descarte da referência não foram adicionados porque sua função ainda não foi validada. Ver exemplo mostra uma orientação ilustrativa própria; não copia os materiais da referência.

Dados preservados: contratos internos e tabelas legados mantêm nomes técnicos de DNA para compatibilidade. Isso não cria uma segunda base: todas as novas criações consultam o perfil selecionado. Projetos antigos preservam sua base histórica.

## Roteiro de validação
1. Abrir Personalização, verificar os dados existentes, salvar e recarregar.
2. Criar um segundo perfil; conferir independência de público e linguagem.
3. Em Seu público, atualizar mapa, abrir categorias, filtrar situações e consultar fontes.
4. Em Na pele do cliente, escolher segmento/porte, encontrar pautas, salvar uma e escolher Tweet em Criar post sobre isso.
5. Conferir o briefing, gerar conteúdo e verificar ausência de Gancho/Desenvolvimento como rótulos finais.
