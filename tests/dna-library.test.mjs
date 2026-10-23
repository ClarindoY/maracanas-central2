import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openAuth} from '../server/auth.mjs';
import {openMarketing} from '../server/marketing.mjs';
import {DEFAULT_BRIEF} from '../shared/marketing.mjs';
const base={name:'Eduarda',activity:'Assessoria',audience:'Empresários',topics:'Preparação de propostas',voice:'Educativo'};
const reply={parsed:{title:'Pauta',chosenTopic:'Preparação documental',blocks:[{heading:'',text:'Organize os documentos.',visual:''}],caption:'',cta:'',notes:[]},model:'fake',usage:{}};
function setup(generate=async()=>structuredClone(reply)){
 const auth=openAuth(':memory:');for(const id of ['a','b'])auth.db.prepare('INSERT INTO users(id,name,login,email,password,permissions) VALUES(?,?,?,?,?,?)').run(id,id,id,id+'@test.test','unused','[]');
 return {auth,m:openMarketing(auth,generate),a:{id:'a'},b:{id:'b'}};
}
test('migração preserva perfil original após reabrir banco e não duplica',()=>{
 const dir=mkdtempSync(join(tmpdir(),'central-dna-'));let auth;
 try{auth=openAuth(join(dir,'auth.sqlite'));auth.db.prepare('INSERT INTO users(id,name,login,email,password,permissions) VALUES(?,?,?,?,?,?)').run('a','a','a','a@test.test','unused','[]');
 auth.db.exec('CREATE TABLE marketing_profiles(user_id TEXT PRIMARY KEY,data TEXT NOT NULL,version INTEGER NOT NULL)');
 auth.db.prepare('INSERT INTO marketing_profiles VALUES(?,?,?)').run('a',JSON.stringify(base),7);
 let m=openMarketing(auth);assert.equal(m.profiles({id:'a'})[0].version,7);
 m.saveProfile({id:'a'},{id:'default',version:7,data:{voice:'Direto'},label:'Meu principal'});
 auth.db.close();auth=openAuth(join(dir,'auth.sqlite'));m=openMarketing(auth);
 assert.equal(m.profiles({id:'a'}).length,1);assert.equal(m.profile({id:'a'}).data.voice,'Direto');assert.equal(m.profile({id:'a'}).version,8);assert.equal(m.profile({id:'a'}).label,'Meu principal');
 }finally{auth?.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('criação e duplicação isolam dados, versões e proprietários',()=>{
 const {auth,m,a,b}=setup();try{m.saveProfile(a,{version:0,data:base});
 const copy=m.createProfile(a,{label:'Comercial',sourceId:'default'}),blank=m.createProfile(a,{label:'Outra marca'});
 assert.equal(copy.data.voice,'Educativo');assert.equal(blank.data.topics,'');
 m.saveProfile(a,{...copy,data:{voice:'Provocativo'}});assert.equal(m.profile(a).data.voice,'Educativo');
 assert.throws(()=>m.saveProfile(a,copy),e=>e.status===409);
 assert.throws(()=>m.profile(b,copy.id),e=>e.status===404);assert.throws(()=>m.createProfile(b,{label:'Invasão',sourceId:copy.id}),e=>e.status===404);
 assert.equal(m.profiles(b).length,1);assert.throws(()=>m.saveProfile(b,copy),e=>e.status===404);
 }finally{auth.db.close();}
});
test('geração usa DNA escolhido, histórico separado e revisão mantém snapshot',async()=>{
 const calls=[];const {auth,m,a,b}=setup(async r=>{calls.push(r);return structuredClone(reply);});
 try{m.saveProfile(a,{version:0,data:base});await m.create(a,DEFAULT_BRIEF);
 const copy=m.createProfile(a,{label:'Novo público',sourceId:'default'});
 m.saveProfile(a,{...copy,data:{audience:'Público experiente'}});
 const item=await m.create(a,{...DEFAULT_BRIEF,dnaId:copy.id});
 assert.equal(item.brief.dna.id,copy.id);assert.equal(calls[1].input.profile.audience,'Público experiente');assert.equal(calls[1].input.recentTopics.length,0);
 m.saveProfile(a,{...m.profile(a,copy.id),data:{voice:'Outra voz'}});
 const comment=m.comment(a,item.id,{text:'Ajuste curto'});await m.revise(a,item.id,{version:1,commentId:comment.id});
 assert.equal(calls[2].input.profile.voice,'Educativo');
 await assert.rejects(m.create(b,{...DEFAULT_BRIEF,dnaId:copy.id}),e=>e.status===404);
 }finally{auth.db.close();}
});
test('Na pele do cliente usa DNA selecionado e bloqueia mistura ao criar conteúdo',async()=>{
 const insights=['Dúvida','Dúvida','Preocupação','Preocupação','Objeção','Objeção'].map((kind,i)=>({kind,question:'Pergunta '+i,concern:'Hipótese',approach:'Abordagem',validation:'Validar'}));
 const calls=[];const {auth,m,a}=setup(async r=>{calls.push(r);return {parsed:{insights},model:'fake',usage:{}}});
 try{m.saveProfile(a,{version:0,data:base});const copy=m.createProfile(a,{label:'Comercial',sourceId:'default'});
 const subject=m.createFolder(a,{name:'Assunto'}),audience=m.createFolder(a,{name:'Público',parent_id:subject.id});
 const row=await m.explorePerspective(a,{folderId:audience.id,dnaId:copy.id});
 assert.equal(row.input.dna.id,copy.id);
 await m.explorePerspective(a,{folderId:audience.id,dnaId:'default'});assert.equal(calls[1].input.previousQuestions.length,0);
 await assert.rejects(m.create(a,{...DEFAULT_BRIEF,folderId:audience.id,dnaId:'default',empathySource:{id:row.id,index:0}}),e=>e.status===400);
 }finally{auth.db.close();}
});
