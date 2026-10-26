import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openAuth} from '../server/auth.mjs';
import {openMarketing} from '../server/marketing.mjs';
import {ACADEMY_TIPS,academyBrief} from '../shared/marketing-academy.mjs';
import {validateBrief} from '../server/marketing.mjs';
test('13 técnicas abrem briefing vazio, Reels, Viralizar e técnica correspondente',()=>{
 assert.equal(ACADEMY_TIPS.length,13);
 for(const tip of ACADEMY_TIPS){const brief=validateBrief(academyBrief(tip.id));assert.equal(brief.topic,'');assert.equal(brief.format,'Roteiro de Reels');assert.equal(brief.objective,'Viralizar');assert.deepEqual(brief.techniques,[tip.title]);}
 assert.throws(()=>academyBrief('99'));
});
test('favoritos persistem por usuário e contador usa projetos do DNA sem contar abertura',async()=>{
 const auth=openAuth(':memory:');for(const id of ['a','b'])auth.db.prepare('INSERT INTO users(id,name,login,email,password,permissions) VALUES(?,?,?,?,?,?)').run(id,id,id,id+'@test.test','unused','[]');
 const m=openMarketing(auth,async()=>({parsed:{title:'Teste',blocks:[{heading:'',text:'Conteúdo de teste',visual:''}],caption:'',cta:'',notes:[]},model:'fake',usage:{}})),a={id:'a'},b={id:'b'};
 try{
 assert.equal(m.academy(a).length,13);assert.equal(m.academy(a)[0].uses,0);
 m.saveAcademyFavorite(a,{id:'01',favorite:true});assert.equal(m.academy(a)[0].favorite,true);assert.equal(m.academy(b)[0].favorite,false);
 const reopened=openMarketing(auth);assert.equal(reopened.academy(a)[0].favorite,true);
 const dna=m.createProfile(a,{label:'Outro'});assert.throws(()=>m.saveAcademyFavorite(b,{id:'01',favorite:true,dnaId:dna.id}),e=>e.status===404);
 await m.create(a,{...academyBrief('01'),topic:'Uma decisão sobre acabamento'});
 assert.equal(m.academy(a)[0].uses,1);assert.equal(m.academy(a,dna.id)[0].uses,0);assert.equal(m.academy(b)[0].uses,0);
 m.saveAcademyFavorite(a,{id:'01',favorite:false});assert.equal(m.academy(a)[0].favorite,false);
 assert.throws(()=>m.saveAcademyFavorite(a,{id:'99',favorite:true}),e=>e.status===400);
 }finally{auth.db.close();}
});
