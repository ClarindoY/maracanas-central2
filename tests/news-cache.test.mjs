import {test} from 'node:test';import assert from 'node:assert/strict';import {openAuth} from '../server/auth.mjs';import {openMarketing} from '../server/marketing.mjs';
test('notícias reaproveitam apenas consulta recente do mesmo perfil, versão e período; atualização explícita pesquisa',async()=>{
 const auth=openAuth(':memory:');let calls=0,limited=false;for(const id of ['a','b'])auth.db.prepare('INSERT INTO users(id,name,login,email,password,permissions) VALUES(?,?,?,?,?,?)').run(id,id,id,id+'@test.test','unused','[]');
 const m=openMarketing(auth,async()=>{calls++;if(limited)throw Object.assign(Error('Limite ou cota (HTTP 429)'),{status:502});return {grounding:{webSearchQueries:['consulta'],groundingChunks:[]}};});const a={id:'a'},b={id:'b'};try{
 m.saveProfile(a,{version:0,data:{topics:'Varejo',audience:'Empresas'}});m.saveProfile(b,{version:0,data:{topics:'Varejo',audience:'Empresas'}});
 const first=await m.exploreIntelligence(a,{kind:'hot',hours:24});const cached=await m.exploreIntelligence(a,{kind:'hot',hours:24});assert.equal(calls,1);assert.equal(cached.id,first.id);assert.equal(cached.cached,true);
 await m.exploreIntelligence(b,{kind:'hot',hours:24});assert.equal(calls,2);await m.exploreIntelligence(a,{kind:'hot',hours:48});assert.equal(calls,3);await m.exploreIntelligence(a,{kind:'hot',hours:24,force:true});assert.equal(calls,4);
 const p=m.profile(a);m.saveProfile(a,{...p,data:{...p.data,audience:'Outro público'}});await m.exploreIntelligence(a,{kind:'hot',hours:24});assert.equal(calls,5);
 auth.db.prepare("UPDATE marketing_intelligence SET data=json_set(data,'$.searchedAt',?) WHERE user_id=?").run(new Date(Date.now()-16*60000).toISOString(),a.id);await m.exploreIntelligence(a,{kind:'hot',hours:24});assert.equal(calls,6);
 const count=m.intelligence(a,{kind:'hot'}).length;limited=true;await assert.rejects(m.exploreIntelligence(a,{kind:'hot',hours:24,force:true}),e=>e.status===429&&/Google/.test(e.message));assert.equal(calls,7);await assert.rejects(m.exploreIntelligence(a,{kind:'hot',hours:24,force:true}),e=>e.status===429);assert.equal(calls,7);assert.equal(m.intelligence(a,{kind:'hot'}).length,count);assert.equal((await m.exploreIntelligence(a,{kind:'hot',hours:24})).cached,true);
 }finally{auth.db.close();}
});
