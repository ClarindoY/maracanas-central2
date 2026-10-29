import {randomUUID,createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync,unlinkSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import AdmZip from 'adm-zip';
import {allowed,fail} from './workspace.mjs';

const COMPANIES=[{id:'maracanas',name:'Maracanãs Viagens e Turismo LTDA',cnpj:'06133408000118'},{id:'rep',name:'R&P Viagens e Eventos LTDA',cnpj:'19099657000186'}];
const CATEGORIES=['Atestados','Balanços','Certidões','Societários','Licenças','Contratos','Notas fiscais','Declarações','Outros'];
export function openLibrary(auth,dir=resolve(dirname(process.env.ER_AUTH_DB||'data/auth.sqlite'),'library')){
 const db=auth.db;mkdirSync(dir,{recursive:true});
 db.exec(`CREATE TABLE IF NOT EXISTS library_documents(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,category TEXT NOT NULL,name TEXT NOT NULL,size INTEGER NOT NULL,hash TEXT NOT NULL,uploaded_by TEXT NOT NULL REFERENCES users(id),created TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'Pendente',reviewed_by TEXT,reviewed_at TEXT,review_note TEXT NOT NULL DEFAULT '',source_tender_id TEXT,version INTEGER NOT NULL DEFAULT 1,FOREIGN KEY(source_tender_id) REFERENCES tenders(id));
 CREATE TABLE IF NOT EXISTS library_events(id INTEGER PRIMARY KEY AUTOINCREMENT,document_id TEXT NOT NULL REFERENCES library_documents(id),actor TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,time TEXT NOT NULL,detail TEXT NOT NULL DEFAULT '');`);
 const existingColumns=db.prepare('PRAGMA table_info(library_documents)').all().map(x=>x.name);
 if(!existingColumns.includes('source_path'))db.exec("ALTER TABLE library_documents ADD COLUMN source_path TEXT NOT NULL DEFAULT ''");
 if(!existingColumns.includes('batch_id'))db.exec("ALTER TABLE library_documents ADD COLUMN batch_id TEXT");
 const permission=(u)=>{if(!allowed(u,'Acessar documentos'))fail(403,'Sem permissão de documentos.');};
 const reviewPermission=(u)=>{if(!u.admin&&!allowed(u,'Administrar equipe'))fail(403,'Validação reservada a administrador ou perfil de gestão.');};
 const company=(id)=>{if(!COMPANIES.some(c=>c.id===id))fail(400,'Empresa inválida.');return id;};
 const event=(id,u,action,detail='')=>db.prepare('INSERT INTO library_events(document_id,actor,action,time,detail) VALUES(?,?,?,?,?)').run(id,u.id,action,new Date().toISOString(),detail);
 function list(u,companyId=''){permission(u);if(companyId)company(companyId);return db.prepare(`SELECT d.*,u.name uploader_name,r.name reviewer_name FROM library_documents d JOIN users u ON u.id=d.uploaded_by LEFT JOIN users r ON r.id=d.reviewed_by WHERE (?='' OR company_id=?) ORDER BY d.created DESC LIMIT 3000`).all(companyId,companyId);}
 function upload(u,{companyId,category,name,sourceTenderId=null,sourcePath='',batchId=null},bytes){permission(u);company(companyId);if(!CATEGORIES.includes(category))fail(400,'Categoria inválida.');if(typeof name!=='string'||name.length>240||!name.toLowerCase().endsWith('.pdf')||bytes.subarray(0,5).toString()!=='%PDF-')fail(400,'Envie PDF válido.');if(!bytes.length||bytes.length>20*1024*1024)fail(413,'Limite de 20 MB por PDF.');if(sourceTenderId&&!db.prepare('SELECT id FROM tenders WHERE id=?').get(sourceTenderId))fail(400,'Licitação de origem não existe.');const used=db.prepare('SELECT COALESCE(SUM(size),0) n FROM library_documents').get().n;if(used+bytes.length>Number(process.env.MAX_LIBRARY_BYTES||1024*1024*1024))fail(413,'Limite de armazenamento da biblioteca atingido.');const hash=createHash('sha256').update(bytes).digest('hex');const duplicate=db.prepare('SELECT id FROM library_documents WHERE company_id=? AND hash=?').get(companyId,hash);if(duplicate)fail(409,'Arquivo idêntico já existe nesta empresa: '+duplicate.id);const id=randomUUID(),path=resolve(dir,id+'.pdf');writeFileSync(path,bytes,{flag:'wx',mode:0o600});try{db.exec('BEGIN IMMEDIATE');const now=new Date().toISOString();db.prepare('INSERT INTO library_documents(id,company_id,category,name,size,hash,uploaded_by,created,source_tender_id) VALUES(?,?,?,?,?,?,?,?,?)').run(id,companyId,category,name,bytes.length,hash,u.id,now,sourceTenderId);if(sourcePath||batchId)db.prepare('UPDATE library_documents SET source_path=?,batch_id=? WHERE id=?').run(sourcePath,batchId,id);event(id,u,'Upload',JSON.stringify({status:'Pendente',sourcePath,batchId}));db.exec('COMMIT');return {id,name,hash,status:'Pendente'};}catch(e){db.exec('ROLLBACK');unlinkSync(path);throw e;}}

 function uploadZip(u,{companyId,category,name},bytes){
  permission(u);company(companyId);
  if(!CATEGORIES.includes(category))fail(400,'Categoria inválida.');
  if(!name.toLowerCase().endsWith('.zip')||bytes.length<4||bytes.subarray(0,2).toString()!=='PK')fail(400,'Arquivo ZIP inválido.');
  const maxZip=Number(process.env.MAX_LIBRARY_ZIP_BYTES||260*1024*1024);
  if(bytes.length>maxZip)fail(413,'ZIP excede o limite configurado.');
  let zip;try{zip=new AdmZip(bytes);}catch{fail(400,'ZIP inválido ou corrompido.');}
  const entries=zip.getEntries();if(entries.length>2500)fail(413,'ZIP com mais de 2500 entradas.');
  const results={batchId:randomUUID(),total:0,imported:0,duplicate:0,skipped:0,failed:0,items:[]};
  let totalExpanded=0;
  for(const entry of entries){
   const path=String(entry.entryName||'').replace(/\\/g,'/');
   if(entry.isDirectory)continue;
   results.total++;
   const rejected=path.startsWith('/')||path.split('/').includes('..')||path.includes('\0')||path.length>1000;
   if(rejected){results.skipped++;results.items.push({path,status:'Ignorado: caminho inválido'});continue;}
   if(!path.toLowerCase().endsWith('.pdf')){results.skipped++;results.items.push({path,status:'Ignorado: não PDF'});continue;}
   const rawSize=entry.header.size;
   if(rawSize>20*1024*1024||rawSize<=0){results.failed++;results.items.push({path,status:'PDF maior que 20 MB ou vazio'});continue;}
   totalExpanded+=rawSize;
   if(totalExpanded>1024*1024*1024)fail(413,'Volume descompactado acima de 1 GB.');
   if(entry.header.compressedSize>0&&rawSize/entry.header.compressedSize>150){results.failed++;results.items.push({path,status:'Compressão excessiva'});continue;}
   try{
    const content=entry.getData();
    if(content.length!==rawSize||content.subarray(0,5).toString()!=='%PDF-')throw Error('Conteúdo não é PDF válido');
    const basename=path.split('/').pop();
    const folder=path.toLowerCase();
    const inferred=folder.includes('balan')||folder.includes('contab')?'Balanços':folder.includes('atest')?'Atestados':folder.includes('certid')?'Certidões':folder.includes('contrat')?'Contratos':folder.includes('nota fiscal')||folder.includes('nf-')?'Notas fiscais':folder.includes('declar')?'Declarações':folder.includes('licen')?'Licenças':category;
    const doc=upload(u,{companyId,category:inferred,name:basename,sourcePath:path,batchId:results.batchId},content);
    results.imported++;results.items.push({path,status:'Importado',documentId:doc.id,category:inferred});
   }catch(err){const msg=String(err.message||'Erro');if(msg.includes('Arquivo idêntico')){results.duplicate++;results.items.push({path,status:'Duplicado'});}else{results.failed++;results.items.push({path,status:'Falha: '+msg.slice(0,140)});}}
  }
  return results;
 }
 function review(u,id,{status,note=''}){reviewPermission(u);if(!['Validado','Rejeitado','Pendente'].includes(status)||typeof note!=='string'||note.length>3000)fail(400,'Revisão inválida.');const row=db.prepare('SELECT * FROM library_documents WHERE id=?').get(id);if(!row)fail(404,'Documento não localizado.');if(row.uploaded_by===u.id&&!u.admin)fail(403,'O mesmo colaborador não pode validar o próprio upload.');db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE library_documents SET status=?,reviewed_by=?,reviewed_at=?,review_note=?,version=version+1 WHERE id=?').run(status,u.id,new Date().toISOString(),note,id);event(id,u,'Revisão',JSON.stringify({before:row.status,after:status,note}));db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return db.prepare('SELECT * FROM library_documents WHERE id=?').get(id);}
 function download(u,id){permission(u);const row=db.prepare('SELECT * FROM library_documents WHERE id=?').get(id);if(!row)fail(404,'Documento não localizado.');event(id,u,'Download');return {metadata:row,bytes:readFileSync(resolve(dir,id+'.pdf'))};}
 function history(u,id){permission(u);return db.prepare('SELECT e.*,u.name actor_name FROM library_events e JOIN users u ON u.id=e.actor WHERE e.document_id=? ORDER BY e.id DESC').all(id);}
 return {companies:COMPANIES,categories:CATEGORIES,list,upload,uploadZip,review,download,history};
}
