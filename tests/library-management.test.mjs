import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import AdmZip from 'adm-zip';
import {openAuth,permissions} from '../server/auth.mjs';
import {openWorkspace} from '../server/workspace.mjs';
import {openLibrary} from '../server/library.mjs';

function setup(){
 const base=mkdtempSync(join(tmpdir(),'library-v4711-'));
 const auth=openAuth(join(base,'auth.sqlite'));
 for (const [id,rights,isAdmin] of [['owner',['Acessar documentos'],0],['other',['Acessar documentos'],0],['manager',permissions,1]]) {
  auth.db.prepare('INSERT INTO users(id,name,login,email,password,admin,permissions) VALUES(?,?,?,?,?,?,?)').run(id,id,id,id+'@test.test','unused',isAdmin,JSON.stringify(rights));
 }
 openWorkspace(auth,join(base,'work'));
 const lib=openLibrary(auth,join(base,'library'));
 const owner={id:'owner',permissoes:['Acessar documentos'],admin:false};
 const other={id:'other',permissoes:['Acessar documentos'],admin:false};
 const manager={id:'manager',permissoes:permissions,admin:true};
 return {base,auth,lib,owner,other,manager,close(){auth.db.close();rmSync(base,{recursive:true,force:true});}};
}
const pdf=Buffer.from('%PDF-1.4\n% Doc de teste\n');

test('V47.11: upload, dupla verificação, remoção lógica, download bloqueado e auditoria',()=>{
 const ctx=setup();
 try{
  const {lib,owner,other,manager,auth}=ctx;
  const first=lib.upload(owner,{companyId:'rep',category:'Atestados',name:'atestado.pdf'},pdf);
  assert.equal(lib.list(owner,'rep').length,1);
  assert.throws(()=>lib.upload(owner,{companyId:'rep',category:'Atestados',name:'copia.pdf'},pdf),e=>e.status===409);
  assert.throws(()=>lib.remove(other,first.id,{reason:'Documento incorreto'}),e=>e.status===403);
  assert.throws(()=>lib.remove(owner,first.id,{reason:'abc'}),e=>e.status===400);
  lib.review(manager,first.id,{status:'Validado',note:'Conferido'});
  assert.throws(()=>lib.remove(owner,first.id,{reason:'Arquivo duplicado'}),e=>e.status===403);
  lib.remove(manager,first.id,{reason:'Arquivo incorreto'});
  assert.equal(lib.list(owner,'rep').length,0);
  assert.throws(()=>lib.download(owner,first.id),e=>e.status===404);
  assert.throws(()=>lib.review(manager,first.id,{status:'Validado'}),e=>e.status===404);
  assert.ok(readFileSync(join(ctx.base,'library',first.id+'.pdf')).length);
  assert.equal(lib.history(owner,first.id).at(0).action,'Remoção lógica');
  const replacement=lib.upload(owner,{companyId:'rep',category:'Atestados',name:'atestado-novo.pdf'},pdf);
  assert.notEqual(replacement.id,first.id);
  assert.equal(auth.db.prepare("SELECT count(*) n FROM library_documents WHERE status='Removido'").get().n,1);
 }finally{ctx.close();}
});

test('V47.11: importação ZIP preserva subpastas e cancelamento respeita perfis',()=>{
 const ctx=setup();
 try{
  const {lib,owner,other,manager}=ctx;
  const zip=new AdmZip();
  zip.addFile('ATESTADOS REP/2024/capacidade.pdf',pdf);
  zip.addFile('OUTROS/observacoes.txt',Buffer.from('texto'));
  const result=lib.uploadZip(owner,{companyId:'rep',category:'Outros',name:'documentos.zip'},zip.toBuffer());
  assert.equal(result.imported,1);assert.equal(result.skipped,1);
  assert.equal(lib.list(owner,'rep')[0].source_path,'ATESTADOS REP/2024/capacidade.pdf');
  assert.equal(lib.list(owner,'rep')[0].category,'Atestados');
  assert.equal(lib.batches(owner,'rep').length,1);
  assert.throws(()=>lib.cancelBatch(other,result.batchId,{reason:'Envio indevido'}),e=>e.status===403);
  lib.review(manager,result.items.find(x=>x.documentId).documentId,{status:'Validado',note:'OK'});
  assert.throws(()=>lib.cancelBatch(owner,result.batchId,{reason:'Envio indevido'}),e=>e.status===403);
  assert.equal(lib.cancelBatch(manager,result.batchId,{reason:'Envio indevido'}).removed,1);
  assert.equal(lib.batches(manager,'rep').length,0);
  assert.equal(lib.list(manager,'rep').length,0);
 }finally{ctx.close();}
});

test('V47.11: categoria/validade são auditadas e data não é inventada',()=>{
 const ctx=setup();
 try{
  const {lib,owner,manager}=ctx;
  const d=lib.upload(owner,{companyId:'maracanas',category:'Outros',name:'documento.pdf'},pdf);
  assert.equal(lib.list(owner,'maracanas')[0].expires_at,null);
  assert.throws(()=>lib.updateMetadata(owner,d.id,{category:'Certidões',expiresAt:'2026-12-12',note:'Conferência do PDF'}),e=>e.status===403);
  assert.throws(()=>lib.updateMetadata(manager,d.id,{category:'Certidões',expiresAt:'2026-02-31',note:'Conferência do PDF'}),e=>e.status===400);
  lib.updateMetadata(manager,d.id,{category:'Certidões',expiresAt:'2027-01-01',note:'Conferência do PDF'});
  const updated=lib.list(manager,'maracanas')[0];
  assert.equal(updated.category,'Certidões'); assert.equal(updated.expires_at,'2027-01-01');
  assert.equal(lib.history(owner,d.id)[0].action,'Metadados alterados');
  lib.remove(manager,d.id,{reason:'Erro de cadastro'});
  assert.throws(()=>lib.updateMetadata(manager,d.id,{category:'Outros',note:'Erro de cadastro'}),e=>e.status===404);
 }finally{ctx.close();}
});
