import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openAuth} from '../server/auth.mjs';
import {openMarketing} from '../server/marketing.mjs';
import {DEFAULT_BRIEF,EMPTY_PROFILE} from '../shared/marketing.mjs';
const dna={...EMPTY_PROFILE,name:'Assessoria de licitações',activity:'Ajudo empresas a participar de editais',offer:'Assessoria',audience:'Empresários iniciantes',topics:'Documentação, propostas, leitura de editais',positioning:'Preparação antes da participação',instructions:'Use linguagem clara',goals:'Construir autoridade'};
const content={title:'O primeiro edital',blocks:[{heading:'Gancho',text:'É possível se preparar antes de participar.',visual:''}],caption:'',cta:'Conheça as etapas.',notes:[]};
const response=()=>({parsed:{...content,chosenTopic:'Preparação documental para o primeiro edital'},model:'fake',usage:{}});
function fixture(generate=async()=>response()){
 const auth=openAuth(':memory:');for(const id of ['a','b'])auth.db.prepare('INSERT INTO users(id,name,login,email,password,permissions) VALUES(?,?,?,?,?,?)').run(id,id,id,id+'@test.test','unused','[]');return {auth,m:openMarketing(auth,generate),a:{id:'a'},b:{id:'b'}};
}
test('DNA salvo gera sem assunto, respeita escolhas e usa histórico privado para variar pautas',async()=>{
 const requests=[];const {auth,m,a,b}=fixture(async req=>{requests.push(req);return response();});try{
 m.saveProfile(a,{version:0,data:dna});
 const c=await m.create(a,{...DEFAULT_BRIEF,format:'Roteiro de Reels',style:'Quebra de objeções',dna:{data:{topics:'Ignorar o servidor'}}});
 assert.equal(c.brief.topic,'');assert.equal(c.brief.automaticTopic,true);assert.equal(c.brief.selectedTopic,'Preparação documental para o primeiro edital');assert.equal(c.brief.dna.version,1);
 assert.equal(requests[0].input.profile.topics,dna.topics);assert.equal(requests[0].input.brief.format,'Roteiro de Reels');assert.equal(requests[0].input.brief.style,'Quebra de objeções');assert.ok(requests[0].schema.required.includes('chosenTopic'));assert.match(requests[0].instructions,/comece o primeiro bloco com uma objeção/);
 assert.equal(m.profile(b).data.topics,'');await assert.rejects(m.create(b,DEFAULT_BRIEF),e=>e.status===400);
 await m.create(a,DEFAULT_BRIEF);assert.equal(requests[1].input.recentTopics[0].topic,c.brief.selectedTopic);
 m.saveProfile(b,{version:0,data:{...dna,name:'Outro perfil'}});await m.create(b,DEFAULT_BRIEF);assert.equal(requests[2].input.recentTopics.length,0);
 }finally{auth.db.close();}
});
test('DNA incompleto pede configuração, mas direcionamento manual continua disponível',async()=>{
 const {auth,m,a}=fixture();try{
 m.saveProfile(a,{version:0,data:{name:'Perfil',audience:'Público'}});await assert.rejects(m.create(a,DEFAULT_BRIEF),e=>e.status===400&&/Seu DNA/.test(e.message));
 const c=await m.create(a,{...DEFAULT_BRIEF,topic:'Campanha específica'});assert.equal(c.brief.automaticTopic,false);assert.equal(c.brief.selectedTopic,'Campanha específica');
 assert.equal(m.list(a).length,1);assert.throws(()=>m.saveProfile(a,{version:1,data:{...dna,topics:'x'.repeat(4001)}}),e=>e.status===400);
 }finally{auth.db.close();}
});
test('perfil antigo mantém campos e revisão preserva DNA original após novas edições',async()=>{
 let sent;const {auth,m,a}=fixture(async req=>{sent=req;return response();});try{
 auth.db.prepare('INSERT INTO marketing_profiles VALUES(?,?,?)').run(a.id,JSON.stringify({name:'Perfil antigo',audience:'Clientes antigos',voice:'Formal',examples:'Meu exemplo'}),2);
 assert.equal(m.profile(a).data.topics,'');assert.equal(m.profile(a).data.examples,'Meu exemplo');
 m.saveProfile(a,{version:2,data:{topics:dna.topics,instructions:'Orientação original'}});assert.equal(m.profile(a).data.voice,'Formal');
 const c=await m.create(a,DEFAULT_BRIEF);m.saveProfile(a,{version:3,data:{topics:'Outro assunto',instructions:'Outra orientação'}});
 const comment=m.comment(a,c.id,{text:'Encurte o gancho'});await m.revise(a,c.id,{version:1,commentId:comment.id});
 assert.equal(sent.input.profile.instructions,'Orientação original');assert.equal(sent.input.profile.topics,dna.topics);assert.equal(m.get(a,c.id).brief.dna.version,3);
 const next=await m.create(a,DEFAULT_BRIEF);assert.equal(next.brief.dna.data.topics,'Outro assunto');assert.throws(()=>m.saveProfile(a,{version:3,data:dna}),e=>e.status===409);
 }finally{auth.db.close();}
});
test('resposta automática sem pauta não grava conteúdo parcial e libera nova tentativa',async()=>{
 let attempt=0;const {auth,m,a}=fixture(async()=>attempt++?response():{parsed:content,model:'fake',usage:{}});try{
 m.saveProfile(a,{version:0,data:dna});await assert.rejects(m.create(a,DEFAULT_BRIEF),e=>e.status===502);assert.equal(m.list(a).length,0);
 await m.create(a,DEFAULT_BRIEF);assert.equal(m.list(a).length,1);
 }finally{auth.db.close();}
});
