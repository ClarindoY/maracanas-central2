import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openAuth} from '../server/auth.mjs';
import {openMarketing,marketingRequest,validateBrief,validateImage} from '../server/marketing.mjs';
import {DEFAULT_BRIEF,TECHNIQUES,EMPTY_PROFILE,OBJECTIVES,STYLES} from '../shared/marketing.mjs';
const content={title:'Café especial',blocks:[{heading:'Uma pausa melhor',text:'Descubra o sabor do café da sua região.',visual:'Xícara sobre mesa clara'}],caption:'',cta:'Conheça nossa seleção.',notes:[]};
test('pastas privadas, hierarquia de dois níveis e conflitos de edição',()=>{
 const {auth,m,a,b}=fixture();try{
 const subject=m.createFolder(a,{name:'Licitação'}),other=m.createFolder(a,{name:'Viagens'});
 const audience=m.createFolder(a,{name:'60+, alta renda',parent_id:subject.id,context:{age:'60+',income:'Alta renda',needs:'Entender oportunidades'}});
 assert.equal(m.folders(b).length,0);
 assert.throws(()=>m.createFolder(b,{name:'Intruso',parent_id:subject.id}),e=>e.status===404);
 assert.throws(()=>m.patchFolder(b,audience.id,{...audience,name:'Intruso'}),e=>e.status===404);
 assert.throws(()=>m.createFolder(a,{name:'Terceiro nível',parent_id:audience.id}),e=>e.status===400);
 assert.throws(()=>m.patchFolder(a,subject.id,{...subject,parent_id:other.id}),e=>e.status===400);
 const moved=m.patchFolder(a,audience.id,{...audience,parent_id:other.id,name:'Público sênior'});
 assert.equal(moved.parent_id,other.id);assert.equal(moved.context.age,'60+');
 assert.throws(()=>m.patchFolder(a,audience.id,{...audience,name:'Edição antiga'}),e=>e.status===409);
 assert.throws(()=>m.createFolder(a,{name:'  '}),e=>e.status===400);
 assert.throws(()=>m.createFolder(a,{name:'Público',parent_id:subject.id,context:{needs:'x'.repeat(1001)}}),e=>e.status===400);
 }finally{auth.db.close();}
});
test('geração recebe contexto da pasta e momento; mover não reescreve briefing nem conteúdo',async()=>{
 let sent;const {auth,m,a,b}=fixture(async req=>{sent=req;return {parsed:content,model:'fake',usage:{}};});try{
 const subject=m.createFolder(a,{name:'Licitação'}),audience=m.createFolder(a,{name:'60+, alta renda',parent_id:subject.id,context:{age:'60+',income:'Alta',voice:'Claro e respeitoso'}});
 const c=await m.create(a,{...DEFAULT_BRIEF,topic:'Participar de editais',moment:'Evento na próxima semana',folderId:audience.id,folderContext:{subject:'Não confiar no cliente'}});
 assert.equal(c.folder_id,audience.id);assert.equal(sent.input.brief.folderContext.subject,'Licitação');assert.equal(sent.input.brief.folderContext.audience.age,'60+');assert.equal(sent.input.brief.moment,'Evento na próxima semana');
 m.patchFolder(a,audience.id,{...audience,name:'Novo nome',context:{voice:'Outro tom'}});
 const foreign=m.createFolder(b,{name:'Privado'});
 assert.throws(()=>m.patch(a,c.id,{version:1,folderId:foreign.id}),e=>e.status===404);
 await assert.rejects(m.create(b,{...DEFAULT_BRIEF,topic:'Teste',folderId:audience.id}),e=>e.status===404);
 const moved=m.patch(a,c.id,{version:1,folderId:subject.id});assert.equal(moved.folder_id,subject.id);assert.deepEqual(moved.brief,c.brief);assert.deepEqual(moved.data,c.data);
 const comment=m.comment(a,c.id,{text:'Ajuste o título'});await m.revise(a,c.id,{version:2,commentId:comment.id});assert.equal(sent.input.brief.folderContext.audience.name,'60+, alta renda');
 const removed=m.patch(a,c.id,{version:3,folderId:''});assert.equal(removed.folder_id,null);assert.equal(m.versions(a,c.id).length,4);
 }finally{auth.db.close();}
});
test('migração preserva conteúdo antigo e pode ser executada novamente',()=>{
 const auth=openAuth(':memory:');try{
 auth.db.prepare('INSERT INTO users(id,name,login,email,password,permissions) VALUES(?,?,?,?,?,?)').run('a','a','a','a@test.test','unused','[]');
 auth.db.exec("CREATE TABLE marketing_contents(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),brief TEXT NOT NULL,data TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'Rascunho',favorite INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1,model TEXT NOT NULL,usage TEXT NOT NULL,created TEXT NOT NULL,updated TEXT NOT NULL)");
 auth.db.prepare('INSERT INTO marketing_contents(id,user_id,brief,data,model,usage,created,updated) VALUES(?,?,?,?,?,?,?,?)').run('old','a',JSON.stringify({...DEFAULT_BRIEF,topic:'Antigo'}),JSON.stringify(content),'fake','{}','2026-10-01','2026-10-01');
 openMarketing(auth);const m=openMarketing(auth);const c=m.get({id:'a'},'old');assert.equal(c.folder_id,null);assert.deepEqual(c.data,content);assert.equal(c.version,1);assert.equal(c.brief.topic,'Antigo');
 }finally{auth.db.close();}
});
function fixture(generate=async()=>({parsed:structuredClone(content),model:'fake-test',usage:{total_tokens:10}})){
 const auth=openAuth(':memory:');for(const id of ['a','b'])auth.db.prepare('INSERT INTO users(id,name,login,email,password,permissions) VALUES(?,?,?,?,?,?)').run(id,id,id,id+'@test.test','unused','[]');return {auth,m:openMarketing(auth,generate),a:{id:'a'},b:{id:'b'}};
}
test('tema livre e todas as opções da referência compõem instruções reais',()=>{
 assert.equal(OBJECTIVES.length,9);assert.equal(STYLES.length,8);assert.equal(TECHNIQUES.length,13);
 const brief=validateBrief({...DEFAULT_BRIEF,topic:'Campanha para cafeteria',techniques:TECHNIQUES.map(([name])=>name)});
 const request=marketingRequest(brief,EMPTY_PROFILE);assert.equal(request.input.brief.topic,'Campanha para cafeteria');assert.equal(request.input.selectedTechniques.length,13);assert.ok(request.input.selectedTechniques.every(t=>t.instruction.length>20));assert.match(request.instructions,/QUALQUER tema/);
 assert.throws(()=>validateBrief({...brief,techniques:['injetar chave']}),e=>e.status===400);
});
test('biblioteca privada, versões, conflito de edição e exclusão isolada',async()=>{
 const {auth,m,a,b}=fixture();try{
 const c=await m.create(a,{...DEFAULT_BRIEF,topic:'Cafeteria'});assert.equal(m.list(a).length,1);assert.equal(m.list(b).length,0);assert.throws(()=>m.get(b,c.id),e=>e.status===404);assert.throws(()=>m.remove(b,c.id,1),e=>e.status===404);
 const next=m.patch(a,c.id,{version:1,data:{...content,title:'Outra versão'},favorite:true,status:'Pronto'});assert.equal(next.version,2);assert.equal(m.versions(a,c.id).length,2);assert.equal(m.versions(a,c.id)[1].data.title,content.title);assert.throws(()=>m.patch(a,c.id,{version:1,status:'Publicado'}),e=>e.status===409);assert.throws(()=>m.remove(a,c.id,1),e=>e.status===409);
 m.remove(a,c.id,2);assert.equal(m.list(a).length,0);assert.equal(auth.db.prepare('SELECT count(*) n FROM marketing_versions').get().n,0);
 }finally{auth.db.close();}
});
test('perfil é privado e utilizado na geração; concorrência de perfil não perde dados',async()=>{
 let sent;const {auth,m,a,b}=fixture(async req=>{sent=req;return {parsed:content,model:'fake',usage:{}};});try{
 m.saveProfile(a,{version:0,data:{...EMPTY_PROFILE,audience:'Clientes de uma cafeteria',voice:'Acolhedor'}});assert.equal(m.profile(b).data.audience,'');assert.throws(()=>m.saveProfile(a,{version:0,data:EMPTY_PROFILE}),e=>e.status===409);
 await m.create(a,{...DEFAULT_BRIEF,topic:'Dia do café'});assert.equal(sent.input.profile.voice,'Acolhedor');
 }finally{auth.db.close();}
});
test('falha de IA não cria registro parcial e libera próxima tentativa',async()=>{
 let count=0;const {auth,m,a}=fixture(async()=>{if(!count++)throw Error('offline');return {parsed:content,model:'fake',usage:{}};});try{
 await assert.rejects(m.create(a,{...DEFAULT_BRIEF,topic:'Teste'}),e=>e.status===502);assert.equal(m.list(a).length,0);await m.create(a,{...DEFAULT_BRIEF,topic:'Teste'});assert.equal(m.list(a).length,1);
 }finally{auth.db.close();}
});
test('mesmo usuário não dispara duas gerações simultâneas',async()=>{
 let finish;const {auth,m,a}=fixture(()=>new Promise(r=>{finish=r;}));try{
 const pending=m.create(a,{...DEFAULT_BRIEF,topic:'Teste'});await assert.rejects(m.create(a,{...DEFAULT_BRIEF,topic:'Duplicado'}),e=>e.status===429);finish({parsed:content,model:'fake',usage:{}});await pending;
 }finally{auth.db.close();}
});
test('post curto acima de 280 caracteres é rejeitado sem gravar',async()=>{
 const {auth,m,a}=fixture(async()=>({parsed:{...content,blocks:[{heading:'',text:'x'.repeat(281),visual:''}]},model:'fake',usage:{}}));try{await assert.rejects(m.create(a,{...DEFAULT_BRIEF,format:'Tweet / post curto',topic:'Teste'}),e=>e.status===502);assert.equal(m.list(a).length,0);}finally{auth.db.close();}
});
test('marcas privadas, validação de imagens e identidade persistente por projeto',async()=>{
 let sent;const {auth,m,a,b}=fixture(async r=>{sent=r;return {parsed:content,model:'fake',usage:{}};});try{
 const brand=m.createBrand(a,{name:'Café Aurora',signature:'Uma pausa melhor',logo:''});assert.equal(m.brands(b).length,0);assert.equal(m.brands(a).length,1);
 const appearance={template:'Minimalista',brandId:brand.id,signature:'',photo:''};
 const c=await m.create(a,{...DEFAULT_BRIEF,topic:'Café',appearance});assert.equal(c.data.appearance.brandId,brand.id);assert.equal(sent.input.brand.name,'Café Aurora');assert.equal(sent.input.brand.logo,undefined);
 await assert.rejects(m.create(b,{...DEFAULT_BRIEF,topic:'Café',appearance}),e=>e.status===404);
 assert.throws(()=>validateImage('data:image/svg+xml;base64,PHN2Zz4='),e=>e.status===400);assert.throws(()=>validateImage('data:image/png;base64,YWJjZA=='),e=>e.status===400);
 }finally{auth.db.close();}
});
test('comentário revisa somente o slide selecionado e preserva identidade e histórico',async()=>{
 let count=0,sent;const original={...content,blocks:[...content.blocks,{heading:'Outro slide',text:'Não mudar.',visual:''}]};
 const {auth,m,a,b}=fixture(async r=>{sent=r;return {parsed:count++?{...original,title:'Mudança indevida',blocks:[{heading:'Revisado',text:'Mais curto.',visual:''},{heading:'Alterado indevidamente',text:'Não conservar',visual:''}]}:original,model:'fake',usage:{}};});try{
 const c=await m.create(a,{...DEFAULT_BRIEF,topic:'Café'});const comment=m.comment(a,c.id,{text:'Encurte o primeiro slide'});
 assert.throws(()=>m.comments(b,c.id),e=>e.status===404);await assert.rejects(m.revise(b,c.id,{version:1,commentId:comment.id,blockIndex:0}),e=>e.status===404);
 const next=await m.revise(a,c.id,{version:1,commentId:comment.id,blockIndex:0});assert.equal(next.id,c.id);assert.equal(next.version,2);assert.equal(next.data.title,original.title);assert.deepEqual(next.data.blocks[1],original.blocks[1]);assert.equal(next.data.blocks[0].heading,'Revisado');assert.deepEqual(next.data.appearance,c.data.appearance);assert.equal(m.comments(a,c.id)[0].applied_version,2);assert.equal(m.versions(a,c.id)[1].data.blocks[0].heading,original.blocks[0].heading);assert.equal(sent.input.currentContent.appearance,undefined);
 await assert.rejects(m.revise(a,c.id,{version:2,commentId:comment.id,blockIndex:0}),e=>e.status===409);
 }finally{auth.db.close();}
});
test('falha de revisão preserva o projeto e o comentário para nova tentativa',async()=>{
 let count=0;const {auth,m,a}=fixture(async()=>{if(count++)throw Error('offline');return {parsed:content,model:'fake',usage:{}};});try{
 const c=await m.create(a,{...DEFAULT_BRIEF,topic:'Café'});const comment=m.comment(a,c.id,{text:'Encurte.'});await assert.rejects(m.revise(a,c.id,{version:1,commentId:comment.id}),e=>e.status===502);assert.equal(m.get(a,c.id).version,1);assert.equal(m.comments(a,c.id)[0].text,'Encurte.');assert.equal(m.comments(a,c.id)[0].applied_version,null);
 }finally{auth.db.close();}
});
test('edição durante chamada de revisão não é sobrescrita',async()=>{
 let count=0,finish;const {auth,m,a}=fixture(async()=>{if(count++)return new Promise(r=>{finish=r;});return {parsed:content,model:'fake',usage:{}};});try{
 const c=await m.create(a,{...DEFAULT_BRIEF,topic:'Café'});const comment=m.comment(a,c.id,{text:'Mude o título.'});const pending=m.revise(a,c.id,{version:1,commentId:comment.id});m.patch(a,c.id,{version:1,data:{...c.data,title:'Edição humana'}});finish({parsed:{...content,title:'IA tardia'},model:'fake',usage:{}});await assert.rejects(pending,e=>e.status===409);assert.equal(m.get(a,c.id).data.title,'Edição humana');assert.equal(m.comments(a,c.id)[0].applied_version,null);
 }finally{auth.db.close();}
});
