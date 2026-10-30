import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openAuth} from '../server/auth.mjs';
import {openMarketing} from '../server/marketing.mjs';
import {openMarketingGoals} from '../server/marketing-goals.mjs';
import {DEFAULT_BRIEF} from '../shared/marketing.mjs';
const content={title:'Tema',blocks:[{heading:'',text:'Conteúdo',visual:''}],caption:'',cta:'',notes:[]};
function fixture(){const auth=openAuth(':memory:');for(const id of ['a','b'])auth.db.prepare('INSERT INTO users(id,name,login,email,password,permissions) VALUES(?,?,?,?,?,?)').run(id,id,id,id+'@test.test','unused','[]');const m=openMarketing(auth,async()=>({parsed:content,model:'mock',usage:{}}));return {auth,m,a:{id:'a'},b:{id:'b'}};}
test('metas persistem por usuário e perfil; publicação é idempotente e usa status real',async()=>{
 const {auth,m,a,b}=fixture();try{
 const other=m.createProfile(a,{label:'Outro perfil'});m.saveGoals(a,{dnaId:other.id,weekly:5,monthly:30});
 assert.deepEqual(m.goals(a,other.id).targets,{weekly:5,monthly:30});assert.deepEqual(m.goals(a).targets,{weekly:3,monthly:20});assert.deepEqual(m.goals(b).targets,{weekly:3,monthly:20});
 assert.throws(()=>m.goals(b,other.id),e=>e.status===404);assert.throws(()=>m.saveGoals(a,{weekly:0,monthly:20}),e=>e.status===400);
 const c=await m.create(a,{...DEFAULT_BRIEF,topic:'Tema',dnaId:other.id});assert.equal(m.goals(a,other.id).weekly.created,1);assert.equal(m.goals(a,other.id).weekly.published,0);
 let published=m.patch(a,c.id,{version:c.version,status:'Publicado'});const date=auth.db.prepare('SELECT published_at FROM marketing_publications WHERE content_id=?').get(c.id).published_at;
 assert.equal(m.goals(a,other.id).weekly.published,1);assert.equal(m.goals(a).weekly.published,0);assert.equal(m.goals(b).weekly.published,0);
 published=m.patch(a,c.id,{version:published.version,status:'Publicado'});assert.equal(m.goals(a,other.id).weekly.published,1);
 assert.equal(auth.db.prepare('SELECT published_at FROM marketing_publications WHERE content_id=?').get(c.id).published_at,date);
 assert.throws(()=>m.patch(b,c.id,{version:published.version,status:'Publicado'}),e=>e.status===404);
 published=m.patch(a,c.id,{version:published.version,status:'Rascunho'});assert.equal(m.goals(a,other.id).weekly.published,0);
 published=m.patch(a,c.id,{version:published.version,status:'Publicado'});assert.equal(m.goals(a,other.id).weekly.published,1);m.remove(a,c.id,published.version);assert.equal(m.goals(a,other.id).weekly.published,0);
 }finally{auth.db.close();}
});
test('metas respeitam Fortaleza, semana de segunda a domingo e mês; não inventam datas antigas',async()=>{
 const {auth,m,a}=fixture();try{
 const dates=['2026-10-31T12:00:00Z','2026-11-01T12:00:00Z','2026-11-02T03:30:00Z'];
 for(const date of dates){const c=await m.create(a,{...DEFAULT_BRIEF,topic:'Tema'});m.patch(a,c.id,{version:c.version,status:'Publicado'});auth.db.prepare('UPDATE marketing_publications SET published_at=? WHERE content_id=?').run(date,c.id);}
 const legacy=await m.create(a,{...DEFAULT_BRIEF,topic:'Legado'});auth.db.prepare("UPDATE marketing_contents SET status='Publicado' WHERE id=?").run(legacy.id);m.patch(a,legacy.id,{version:legacy.version,data:content});
 const tracking=openMarketingGoals({auth,profile:m.profile,now:()=>Date.parse('2026-11-02T02:30:00Z')});const stats=tracking.goals(a);
 assert.equal(stats.today,'2026-11-01');assert.equal(stats.weekStart,'2026-10-26');assert.equal(stats.weekly.published,2);assert.equal(stats.monthly.published,1);assert.equal(stats.monthly.remainingDays,30);assert.equal(stats.streak,2);assert.equal(stats.undated,1);assert.equal(stats.monthly.byFormat.Carrossel,1);
 }finally{auth.db.close();}
});
