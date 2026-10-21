export const DNA_FIELDS=[
 ['name','Nome ou referência do perfil',1000,'Ex.: Meu perfil profissional de assessoria em licitações.'],
 ['activity','Quem sou e qual é minha atuação',2000,'Conte sua experiência, área de atuação e o papel que quer ocupar.'],
 ['offer','O que ofereço',1000,'Descreva seus serviços ou produtos.'],
 ['audience','Meu público-alvo',1000,'Quem você quer alcançar? Quais interesses, necessidades e dúvidas conhece?'],
 ['topics','Assuntos sobre os quais quero falar',4000,'Liste os temas e subtemas do perfil. Ex.: preparação para licitações, leitura de editais, documentação, propostas e erros comuns.'],
 ['positioning','Meu posicionamento e diferenciais',2000,'Quais ideias você defende? Como quer ser percebido?'],
 ['goals','Objetivos do perfil',1000,'Ex.: construir autoridade e atrair clientes para assessoria.'],
 ['voice','Tom de voz',1000,'Ex.: direto, acessível e profissional.'],
 ['instructions','Orientações permanentes',4000,'Escreva aqui sua base de orientação para todas as criações. Formato e técnicas serão escolhidos na tela Criar.'],
 ['examples','Exemplos de textos seus',4000,'Exemplos que representem sua forma de se comunicar.'],
 ['limits','Assuntos e expressões a evitar',1000,'Defina limites e informações que não devem ser usadas.'],
];
export function missingDNA(data){return [['name','perfil'],['audience','público-alvo'],['topics','assuntos do perfil']].filter(([key])=>!String(data?.[key]||'').trim()).map(([,label])=>label);}
