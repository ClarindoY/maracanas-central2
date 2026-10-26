import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openAuth} from '../server/auth.mjs';
import {openMarketing} from '../server/marketing.mjs';
import {validatePerspective} from '../server/client-perspective.mjs';
import {DEFAULT_BRIEF} from '../shared/marketing.mjs';

const sample={insights:['Dúvida','Dúvida','Preocupação','Preocupação','Objeção','Objeção'].map((kind,i)=>({kind,question:`Pergunta possível ${i+1}?`,concern:'Pode haver uma dúvida sobre preparação.',approach:'Pode ser útil explicar as etapas.',validation:'Pergunte quais etapas ainda não estão claras.'}))};
const result=data=>({parsed:structuredClone(data),model:'fake',usage:{total_tokens:10}});
const content={title:'Como se preparar',blocks:[{heading:'Primeiro passo',text:'Organize as informações.',visual:''}],caption:'',cta:'Conheça as etapas.',notes:[]};
function fixture(generate=async()=>result(sample)){
 const auth=openAuth(':memory:');for(const id of ['a','b'])auth.db.prepare('INSERT INTO users(id,name,login,email,password,permissions) VALUES(?,?,?,?,?,?)').run(id,id,id,id+'@test.test','unused','[]');
 const m=openMarketing(auth,generate),a={id:'a'},b={id:'b'},subject=m.createFolder(a,{name:'Licitações'}),audience=m.createFolder(a,{name:'Empresários 60+',parent_id:subject.id,context:{age:'60+',income:'Alta renda',needs:'Conhecer os processos'}});return {auth,m,a,b,subject,audience};
}
test('exploração usa contexto privado, histórico recente e mantém snapshot após edição',async()=>{
 const requests=[];const {auth,m,a,b,audience,subject}=fixture(async req=>{requests.push(req);return result(sample);});try{
 await assert.rejects(m.explorePerspective(b,{folderId:audience.id}),e=>e.status===404);
 await assert.rejects(m.explorePerspective(a,{folderId:subject.id}),e=>e.status===400);
 const first=await m.explorePerspective(a,{folderId:audience.id,focus:'Primeiro edital',context:{subject:'injetado'}});
 assert.equal(first.input.context.subject,'Licitações');assert.equal(requests[0].input.context.audience.age,'60+');assert.match(requests[0].instructions,/HIPÓTESES/);
 assert.throws(()=>m.perspectives(b,audience.id),e=>e.status===404);assert.throws(()=>m.perspective(b,first.id),e=>e.status===404);
 m.patchFolder(a,audience.id,{...audience,name:'Outro nome',context:{age:'Outra idade'}});
 await m.explorePerspective(a,{folderId:audience.id});assert.equal(requests[1].input.previousQuestions.length,6);assert.equal(requests[1].input.context.audience.name,'Outro nome');
 assert.equal(m.perspective(a,first.id).input.context.audience.age,'60+');assert.equal(m.perspectives(a,audience.id).length,2);
 }finally{auth.db.close();}
});
test('origem de hipótese é validada no servidor e acompanha o conteúdo sem virar fato',async()=>{
 let request;const {auth,m,a,b,audience}=fixture(async r=>{request=r;return result(r.schema.properties.insights?sample:content);});try{
 const row=await m.explorePerspective(a,{folderId:audience.id});
 const otherSubject=m.createFolder(a,{name:'Viagens'});
 await assert.rejects(m.create(a,{...DEFAULT_BRIEF,topic:'Teste',folderId:otherSubject.id,empathySource:{id:row.id,index:0}}),e=>e.status===400);
 assert.throws(()=>m.perspectiveSource(b,{id:row.id,index:0},audience.id),e=>e.status===404);
 await assert.rejects(m.create(a,{...DEFAULT_BRIEF,topic:'Teste',folderId:audience.id,empathySource:{id:row.id,index:-1}}),e=>e.status===400);
 m.patchFolder(a,audience.id,{...audience,context:{age:'Alterado'}});
 const c=await m.create(a,{...DEFAULT_BRIEF,topic:'Teste',folderId:audience.id,empathySource:{id:row.id,index:0,insight:{question:'Falso'}}});
 assert.equal(c.folder_id,audience.id);assert.equal(c.brief.folderContext.audience.age,'60+');assert.deepEqual(c.brief.empathySource.insight,sample.insights[0]);assert.equal(request.input.brief.empathySource.kind,'Hipótese para validar');assert.match(request.instructions,/nunca como pesquisa, depoimento ou fato confirmado/);
 }finally{auth.db.close();}
});
test('resposta inválida ou falha não cria registro e libera tentativa seguinte',async()=>{
 let calls=0;const {auth,m,a,audience}=fixture(async()=>{if(calls++===0)return result({insights:[]});return result(sample);});try{
 await assert.rejects(m.explorePerspective(a,{folderId:audience.id}),e=>e.status===502);assert.equal(m.perspectives(a,audience.id).length,0);
 await m.explorePerspective(a,{folderId:audience.id});assert.equal(m.perspectives(a,audience.id).length,1);
 assert.throws(()=>validatePerspective({insights:Array(6).fill(sample.insights[0])}),e=>e.status===502);
 assert.throws(()=>validatePerspective({insights:[null,...sample.insights.slice(1)]}),e=>e.status===502);
 assert.throws(()=>validatePerspective({insights:sample.insights.map(i=>({...i,validation:''}))}),e=>e.status===502);
 }finally{auth.db.close();}
});
test('exploração compartilha bloqueio com geração e revalida conta ao terminar',async()=>{
 let finish;const {auth,m,a,audience}=fixture(()=>new Promise(resolve=>{finish=resolve;}));try{
 const pending=m.explorePerspective(a,{folderId:audience.id});await assert.rejects(m.create(a,{...DEFAULT_BRIEF,topic:'Teste'}),e=>e.status===429);
 await assert.rejects(m.explorePerspective(a,{folderId:audience.id}),e=>e.status===429);
 auth.db.prepare('UPDATE users SET active=0 WHERE id=?').run(a.id);finish(result(sample));await assert.rejects(pending,e=>e.status===403);assert.equal(m.perspectives(a,audience.id).length,0);
 }finally{auth.db.close();}
});

test('busca usa público temporário, segmento e porte sem mudar DNA ou pasta; pauta salva é privada',async()=>{
 const enriched={insights:sample.insights.map(i=>({...i,category:'Gestão',situation:'Você pode ter dificuldade ao organizar a equipe.',hook:'Como organizar sua rotina?'}))};
 const {auth,m,a,b,audience}=fixture(async()=>result(enriched));
 try{
 const before=m.profile(a);
 const row=await m.explorePerspective(a,{folderId:audience.id,client:'Donos de restaurantes',segment:'Restaurante',companySize:'Até 10 funcionários'});
 assert.equal(row.input.context.audience.name,'Donos de restaurantes');assert.equal(row.input.context.segment,'Restaurante');assert.equal(row.input.context.companySize,'Até 10 funcionários');
 assert.deepEqual(m.profile(a),before);assert.equal(row.data.insights[0].category,'Gestão');
 assert.deepEqual(m.savePerspectiveIdea(a,{id:row.id,index:0,saved:true}).saved,[0]);
 assert.deepEqual(m.savePerspectiveIdea(a,{id:row.id,index:0,saved:true}).saved,[0]);
 assert.deepEqual(m.perspectives(a,audience.id)[0].saved,[0]);
 assert.throws(()=>m.savePerspectiveIdea(b,{id:row.id,index:0,saved:true}),e=>e.status===404);
 assert.throws(()=>m.savePerspectiveIdea(a,{id:row.id,index:99,saved:true}),e=>e.status===400);
 assert.deepEqual(m.savePerspectiveIdea(a,{id:row.id,index:0,saved:false}).saved,[]);
 await assert.rejects(m.explorePerspective(a,{folderId:audience.id,companySize:'inválido'}),e=>e.status===400);
 }finally{auth.db.close();}
});
