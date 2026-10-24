import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openAuth} from '../server/auth.mjs';
import {openMarketing} from '../server/marketing.mjs';
import {validateAudio} from '../server/marketing-intelligence.mjs';
const ideas={ideas:Array.from({length:5},(_,i)=>({title:'Pauta '+i,angle:'Explicar uma dúvida',hook:'Você conhece esta etapa?',format:'Carrossel'}))};
const sample=data=>({parsed:structuredClone(data),model:'fake',usage:{}});
function setup(generate=async()=>sample(ideas)){
 const auth=openAuth(':memory:');for(const id of ['a','b'])auth.db.prepare('INSERT INTO users(id,name,login,email,password,permissions) VALUES(?,?,?,?,?,?)').run(id,id,id,id+'@test.test','unused','[]');
 const m=openMarketing(auth,generate),a={id:'a'},b={id:'b'};
 m.saveProfile(a,{version:0,data:{name:'Perfil',activity:'Assessoria',topics:'Licitações',audience:'Empresas',forbiddenWords:'Vitória garantida'}});
 return {auth,m,a,b};
}
test('ideias usam DNA do servidor, guardam histórico privado e variam apenas dentro do perfil',async()=>{
 const sent=[];const {auth,m,a,b}=setup(async r=>{sent.push(r);return sample(ideas)});
 try{
 const row=await m.exploreIntelligence(a,{kind:'ideas',dna:{data:{topics:'Falso'}}});
 assert.equal(sent[0].input.dna.data.topics,'Licitações');assert.equal(row.input.dna.data.forbiddenWords,'Vitória garantida');
 assert.equal(m.intelligence(a,{kind:'ideas'}).length,1);assert.equal(m.intelligence(b,{kind:'ideas'}).length,0);
 await m.exploreIntelligence(a,{kind:'ideas'});assert.equal(sent[1].input.previousTitles.length,5);
 const copy=m.createProfile(a,{label:'Outro DNA',sourceId:'default'});
 await m.exploreIntelligence(a,{kind:'ideas',dnaId:copy.id});assert.equal(sent[2].input.previousTitles.length,0);
 await assert.rejects(m.exploreIntelligence(b,{kind:'ideas',dnaId:copy.id}),e=>e.status===404);
 assert.throws(()=>m.intelligence(b,{kind:'ideas',dnaId:copy.id}),e=>e.status===404);
 }finally{auth.db.close()}
});
test('assuntos quentes exigem texto, data real e fonte segura, sem navegação implícita',async()=>{
 let sent;const {auth,m,a}=setup(async r=>{sent=r;return sample(ideas)});
 try{
 await assert.rejects(m.exploreIntelligence(a,{kind:'hot'}),e=>e.status===400);
 await assert.rejects(m.exploreIntelligence(a,{kind:'hot',sourceText:'Notícia',sourceDate:'2026-02-31'}),e=>e.status===400);
 await assert.rejects(m.exploreIntelligence(a,{kind:'hot',sourceText:'Notícia',sourceDate:'2026-10-24',sourceUrl:'javascript:alert(1)'}),e=>e.status===400);
 const row=await m.exploreIntelligence(a,{kind:'hot',sourceText:'Contexto fornecido',sourceDate:'2026-10-24',sourceUrl:'https://example.com/noticia'});
 assert.equal(row.input.sourceText,'Contexto fornecido');assert.match(sent.instructions,/URL não foi acessada/);
 }finally{auth.db.close()}
});
test('áudio valida formato e tamanho, é enviado como mídia e só persiste transcrição',async()=>{
 let sent;const {auth,m,a}=setup(async r=>{sent=r;return sample({transcript:'Meu conteúdo falado.'})});
 try{
 const audio=Buffer.from('OggS-audio-teste').toString('base64');
 const row=await m.exploreIntelligence(a,{kind:'audio',mimeType:'audio/ogg',audio});
 assert.equal(sent.audioParts[0].inlineData.data,audio);assert.equal(row.data.transcript,'Meu conteúdo falado.');assert.ok(!JSON.stringify(row).includes(audio));assert.ok(!JSON.stringify(row).includes('audioParts'));
 assert.throws(()=>validateAudio({mimeType:'audio/ogg',audio:Buffer.from('<script>').toString('base64')}),e=>e.status===400);
 assert.throws(()=>validateAudio({mimeType:'audio/ogg',audio:'A'.repeat(11200004)}),e=>e.status===400);
 assert.throws(()=>validateAudio({mimeType:'image/png',audio}),e=>e.status===400);
 }finally{auth.db.close()}
});
test('falha não grava registro parcial e libera nova tentativa',async()=>{
 let call=0;const {auth,m,a}=setup(async()=>++call===1?sample({ideas:[]}):sample(ideas));
 try{await assert.rejects(m.exploreIntelligence(a,{kind:'ideas'}),e=>e.status===502);assert.equal(m.intelligence(a,{kind:'ideas'}).length,0);await m.exploreIntelligence(a,{kind:'ideas'});assert.equal(call,2);}
 finally{auth.db.close()}
});
test('conta revogada durante geração não grava resultado',async()=>{
 let authRef;const {auth,m,a}=setup(async()=>{authRef.db.prepare('UPDATE users SET active=0 WHERE id=?').run('a');return sample(ideas)});authRef=auth;
 try{await assert.rejects(m.exploreIntelligence(a,{kind:'ideas'}),e=>e.status===403);assert.equal(auth.db.prepare('SELECT COUNT(*) n FROM marketing_intelligence').get().n,0);}finally{auth.db.close()}
});
