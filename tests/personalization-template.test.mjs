import {test} from 'node:test';import assert from 'node:assert/strict';import {openAuth} from '../server/auth.mjs';import {openMarketing} from '../server/marketing.mjs';
test('base Eduarda é optativa, privada e não altera outras personalizações',()=>{
 const auth=openAuth(':memory:');for(const id of ['a','b'])auth.db.prepare('INSERT INTO users(id,name,login,email,password,permissions) VALUES(?,?,?,?,?,?)').run(id,id,id,id+'@test.test','unused','[]');const m=openMarketing(auth),a={id:'a'},b={id:'b'};
 try{const original=m.profile(a),edu=m.createProfile(a,{label:'Eduarda / E2',templateId:'eduarda-e2'}),blank=m.createProfile(a,{label:'Outra marca'});
 assert.equal(edu.data.voice,'Educativo\nDescontraído');assert.match(edu.data.instructions,/Não confundir homologação/);assert.ok(!edu.data.avoidTopics.includes('homologação'));assert.equal(blank.data.voice,'');assert.deepEqual(m.profile(a),original);assert.throws(()=>m.profile(b,edu.id),e=>e.status===404);
 const duplicate=m.createProfile(a,{label:'Cópia',sourceId:edu.id});m.saveProfile(a,{...duplicate,data:{...duplicate.data,voice:'Técnico'}});assert.equal(m.profile(a,edu.id).data.voice,'Educativo\nDescontraído');assert.throws(()=>m.createProfile(a,{label:'Inválida',templateId:'outra'}),e=>e.status===400);
 }finally{auth.db.close();}
});
