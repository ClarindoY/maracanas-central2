import {randomUUID,createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync,unlinkSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import AdmZip from 'adm-zip';
import {allowed,fail} from './workspace.mjs';
import {readPDFs} from './pdf-reading.mjs';
import {analyzeIndexedDocument,compareEvidence} from './library-ai.mjs';

const COMPANIES=[{id:'maracanas',name:'Maracanãs Viagens e Turismo LTDA',cnpj:'06133408000118'},{id:'rep',name:'R&P Viagens e Eventos LTDA',cnpj:'19099657000186'}];
const CATEGORIES=['Atestados','Balanços','Certidões','Societários','Licenças','Contratos','Notas fiscais','Declarações','Outros'];
export function openLibrary(auth,dir=resolve(dirname(process.env.ER_AUTH_DB||'data/auth.sqlite'),'library')){
 const db=auth.db;mkdirSync(dir,{recursive:true});
 db.exec(`CREATE TABLE IF NOT EXISTS library_documents(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,category TEXT NOT NULL,name TEXT NOT NULL,size INTEGER NOT NULL,hash TEXT NOT NULL,uploaded_by TEXT NOT NULL REFERENCES users(id),created TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'Pendente',reviewed_by TEXT,reviewed_at TEXT,review_note TEXT NOT NULL DEFAULT '',source_tender_id TEXT,version INTEGER NOT NULL DEFAULT 1,FOREIGN KEY(source_tender_id) REFERENCES tenders(id));
 CREATE TABLE IF NOT EXISTS library_events(id INTEGER PRIMARY KEY AUTOINCREMENT,document_id TEXT NOT NULL REFERENCES library_documents(id),actor TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,time TEXT NOT NULL,detail TEXT NOT NULL DEFAULT '');`);
 const existingColumns=db.prepare('PRAGMA table_info(library_documents)').all().map(x=>x.name);
 if(!existingColumns.includes('source_path'))db.exec("ALTER TABLE library_documents ADD COLUMN source_path TEXT NOT NULL DEFAULT ''");
 if(!existingColumns.includes('batch_id'))db.exec("ALTER TABLE library_documents ADD COLUMN batch_id TEXT");
 if(!existingColumns.includes('expires_at'))db.exec("ALTER TABLE library_documents ADD COLUMN expires_at TEXT");
 db.exec(`CREATE TABLE IF NOT EXISTS library_index(document_id TEXT PRIMARY KEY REFERENCES library_documents(id), indexed_at TEXT NOT NULL, text_content TEXT NOT NULL, pages INTEGER NOT NULL DEFAULT 0, pending_pages INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, error TEXT NOT NULL DEFAULT '');`);
 db.exec(`CREATE TABLE IF NOT EXISTS library_analyses(document_id TEXT PRIMARY KEY REFERENCES library_documents(id), payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pendente', generated_at TEXT NOT NULL, reviewed_by TEXT, reviewed_at TEXT, review_note TEXT NOT NULL DEFAULT '');
 CREATE TABLE IF NOT EXISTS library_analysis_versions(id INTEGER PRIMARY KEY AUTOINCREMENT, document_id TEXT NOT NULL REFERENCES library_documents(id), payload TEXT NOT NULL, status TEXT NOT NULL, saved_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS library_comparisons(id TEXT PRIMARY KEY, company_id TEXT NOT NULL, tender_id TEXT, requirements TEXT NOT NULL, payload TEXT NOT NULL, created TEXT NOT NULL, actor TEXT NOT NULL REFERENCES users(id));
 CREATE INDEX IF NOT EXISTS idx_library_comparisons_company ON library_comparisons(company_id,created);`);
 const permission=(u)=>{if(!allowed(u,'Acessar documentos'))fail(403,'Sem permissão de documentos.');};
 const reviewPermission=(u)=>{if(!u.admin&&!allowed(u,'Administrar equipe'))fail(403,'Validação reservada a administrador ou perfil de gestão.');};
 const company=(id)=>{if(!COMPANIES.some(c=>c.id===id))fail(400,'Empresa inválida.');return id;};
 const event=(id,u,action,detail='')=>db.prepare('INSERT INTO library_events(document_id,actor,action,time,detail) VALUES(?,?,?,?,?)').run(id,u.id,action,new Date().toISOString(),detail);
 function list(u,companyId=''){permission(u);if(companyId)company(companyId);return db.prepare(`SELECT d.*, a.status analysis_status, u.name uploader_name,r.name reviewer_name FROM library_documents d LEFT JOIN library_analyses a ON a.document_id=d.id JOIN users u ON u.id=d.uploaded_by LEFT JOIN users r ON r.id=d.reviewed_by WHERE d.status!='Removido' AND (?='' OR d.company_id=?) ORDER BY d.created DESC LIMIT 3000`).all(companyId,companyId);}
 function upload(u,{companyId,category,name,sourceTenderId=null,sourcePath='',batchId=null},bytes){permission(u);company(companyId);if(!CATEGORIES.includes(category))fail(400,'Categoria inválida.');if(typeof name!=='string'||name.length>240||!name.toLowerCase().endsWith('.pdf')||bytes.subarray(0,5).toString()!=='%PDF-')fail(400,'Envie PDF válido.');if(!bytes.length||bytes.length>20*1024*1024)fail(413,'Limite de 20 MB por PDF.');if(sourceTenderId&&!db.prepare('SELECT id FROM tenders WHERE id=?').get(sourceTenderId))fail(400,'Licitação de origem não existe.');const used=db.prepare('SELECT COALESCE(SUM(size),0) n FROM library_documents').get().n;if(used+bytes.length>Number(process.env.MAX_LIBRARY_BYTES||1024*1024*1024))fail(413,'Limite de armazenamento da biblioteca atingido.');const hash=createHash('sha256').update(bytes).digest('hex');const duplicate=db.prepare("SELECT id FROM library_documents WHERE company_id=? AND hash=? AND status!='Removido'").get(companyId,hash);if(duplicate)fail(409,'Arquivo idêntico já existe nesta empresa: '+duplicate.id);const id=randomUUID(),path=resolve(dir,id+'.pdf');writeFileSync(path,bytes,{flag:'wx',mode:0o600});try{db.exec('BEGIN IMMEDIATE');const now=new Date().toISOString();db.prepare('INSERT INTO library_documents(id,company_id,category,name,size,hash,uploaded_by,created,source_tender_id) VALUES(?,?,?,?,?,?,?,?,?)').run(id,companyId,category,name,bytes.length,hash,u.id,now,sourceTenderId);if(sourcePath||batchId)db.prepare('UPDATE library_documents SET source_path=?,batch_id=? WHERE id=?').run(sourcePath,batchId,id);event(id,u,'Upload',JSON.stringify({status:'Pendente',sourcePath,batchId}));db.exec('COMMIT');return {id,name,hash,status:'Pendente'};}catch(e){db.exec('ROLLBACK');unlinkSync(path);throw e;}}

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
 function review(u,id,{status,note=''}){reviewPermission(u);if(!['Validado','Rejeitado','Pendente'].includes(status)||typeof note!=='string'||note.length>3000)fail(400,'Revisão inválida.');const row=db.prepare('SELECT * FROM library_documents WHERE id=?').get(id);if(!row||row.status==='Removido')fail(404,'Documento não localizado.');if(row.uploaded_by===u.id&&!u.admin)fail(403,'O mesmo colaborador não pode validar o próprio upload.');db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE library_documents SET status=?,reviewed_by=?,reviewed_at=?,review_note=?,version=version+1 WHERE id=?').run(status,u.id,new Date().toISOString(),note,id);event(id,u,'Revisão',JSON.stringify({before:row.status,after:status,note}));db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return db.prepare('SELECT * FROM library_documents WHERE id=?').get(id);}
 function download(u,id){permission(u);const row=db.prepare('SELECT * FROM library_documents WHERE id=?').get(id);if(!row||row.status==='Removido')fail(404,'Documento não disponível.');event(id,u,'Download');return {metadata:row,bytes:readFileSync(resolve(dir,id+'.pdf'))};}
 function history(u,id){permission(u);return db.prepare('SELECT e.*,u.name actor_name FROM library_events e JOIN users u ON u.id=e.actor WHERE e.document_id=? ORDER BY e.id DESC').all(id);}
 function search(u,{companyId,query=''}){permission(u);company(companyId);const q=String(query).trim().slice(0,160);if(q.length<2)return [];const terms=q.toLocaleLowerCase('pt-BR').split(/\s+/).filter(x=>x.length>1).slice(0,8);const rows=db.prepare(`SELECT d.id,d.name,d.category,d.status,d.source_path,i.status indexing_status,i.pages,i.pending_pages,i.text_content FROM library_documents d JOIN library_index i ON i.document_id=d.id WHERE d.company_id=? AND d.status!='Removido' ORDER BY i.indexed_at DESC LIMIT 3000`).all(companyId);return rows.filter(r=>terms.every(t=> (r.text_content+' '+r.name+' '+r.source_path).toLocaleLowerCase('pt-BR').includes(t))).slice(0,100).map(r=>{const lower=r.text_content.toLocaleLowerCase('pt-BR');const at=lower.indexOf(terms[0]);return {id:r.id,name:r.name,category:r.category,status:r.status,source_path:r.source_path,indexing_status:r.indexing_status,pages:r.pages,pending_pages:r.pending_pages,excerpt:r.text_content.slice(Math.max(0,at-100),Math.max(0,at-100)+420)};});}
 function progress(u,companyId){permission(u);company(companyId);return db.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN i.document_id IS NOT NULL THEN 1 ELSE 0 END) AS "indexed",SUM(CASE WHEN i.status='incompleto' THEN 1 ELSE 0 END) incomplete FROM library_documents d LEFT JOIN library_index i ON d.id=i.document_id WHERE company_id=? AND d.status!='Removido'`).get(companyId);}
 async function indexBatch(u,companyId){permission(u);company(companyId);const rows=db.prepare(`SELECT d.id,d.name FROM library_documents d LEFT JOIN library_index i ON d.id=i.document_id WHERE d.company_id=? AND d.status!='Removido' AND i.document_id IS NULL ORDER BY d.created ASC LIMIT 2`).all(companyId);const results=[];for(const doc of rows){try{const parsed=await readPDFs(dir,[doc],{maxOCRPages:0});const content=parsed.pages.map(p=>`[Página ${p.page}] ${p.text}`).join('\n').slice(0,500000);const pending=parsed.report.pendingPages;const status=pending?'incompleto':'indexado';db.prepare('INSERT OR REPLACE INTO library_index(document_id,indexed_at,text_content,pages,pending_pages,status,error) VALUES(?,?,?,?,?,?,?)').run(doc.id,new Date().toISOString(),content,parsed.report.totalPages,pending,status,'');event(doc.id,u,'Indexação',JSON.stringify({pages:parsed.report.totalPages,pending,status}));results.push({id:doc.id,name:doc.name,status,pages:parsed.report.totalPages,pendingPages:pending});}catch(e){db.prepare('INSERT OR REPLACE INTO library_index(document_id,indexed_at,text_content,pages,pending_pages,status,error) VALUES(?,?,?,?,?,?,?)').run(doc.id,new Date().toISOString(),'',0,0,'erro',String(e.message).slice(0,400));event(doc.id,u,'Falha na indexação',String(e.message).slice(0,300));results.push({id:doc.id,name:doc.name,status:'erro',error:String(e.message).slice(0,300)});}}return {results,remaining:progress(u,companyId)};}

 // A retirada e lógica: arquivos físicos, hash e auditoria continuam disponíveis apenas para recuperação administrativa.
 function remove(u,id,{reason=''}={}){
  permission(u);
  const row=db.prepare('SELECT * FROM library_documents WHERE id=?').get(id);
  if(!row||row.status==='Removido')fail(404,'Documento não localizado ou já removido.');
  if(typeof reason!=='string'||reason.trim().length<5||reason.length>1000)fail(400,'Informe um motivo com pelo menos 5 caracteres.');
  const manager=!!u.admin||allowed(u,'Administrar equipe');
  if(!manager&&(row.uploaded_by!==u.id||row.status!=='Pendente'))fail(403,'Somente o autor pode retirar o próprio documento pendente; documentos revisados exigem gestor.');
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare("UPDATE library_documents SET status='Removido',version=version+1 WHERE id=?").run(id);
   event(id,u,'Remoção lógica',JSON.stringify({previousStatus:row.status,reason:reason.trim(),batchId:row.batch_id}));
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  return {ok:true,id};
 }
 function batches(u,companyId){
  permission(u);company(companyId);
  return db.prepare(`SELECT d.batch_id AS batchId,COUNT(*) AS total,MIN(d.created) AS created,u.name AS uploader_name,d.uploaded_by AS uploadedBy,SUM(CASE WHEN d.status='Pendente' THEN 1 ELSE 0 END) AS pendingCount FROM library_documents d JOIN users u ON u.id=d.uploaded_by WHERE d.company_id=? AND d.batch_id IS NOT NULL AND d.status!='Removido' GROUP BY d.batch_id,d.uploaded_by ORDER BY created DESC LIMIT 100`).all(companyId);
 }
 function cancelBatch(u,batchId,{reason=''}={}){
  permission(u);
  if(!/^[a-fA-F0-9-]{36}$/.test(batchId))fail(400,'Lote inválido.');
  if(typeof reason!=='string'||reason.trim().length<5||reason.length>1000)fail(400,'Informe um motivo com pelo menos 5 caracteres.');
  const docs=db.prepare("SELECT * FROM library_documents WHERE batch_id=? AND status!='Removido'").all(batchId);
  if(!docs.length)fail(404,'Lote não encontrado ou já cancelado.');
  const manager=!!u.admin||allowed(u,'Administrar equipe');
  if(!manager&&docs.some(d=>d.uploaded_by!==u.id||d.status!=='Pendente'))fail(403,'Para cancelar este lote é necessária autorização de gestor.');
  db.exec('BEGIN IMMEDIATE');
  try{
   const update=db.prepare("UPDATE library_documents SET status='Removido',version=version+1 WHERE id=?");
   for(const d of docs){update.run(d.id);event(d.id,u,'Cancelamento do lote',JSON.stringify({previousStatus:d.status,reason:reason.trim(),batchId}));}
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  return {ok:true,removed:docs.length,batchId};
 }
 // A validade só é informada por revisão humana. Não presumir vencimento para documentos sem data registrada.
 function updateMetadata(u,id,{category,expiresAt=null,note=''}={}){
  permission(u);reviewPermission(u);
  const row=db.prepare('SELECT * FROM library_documents WHERE id=?').get(id);
  if(!row||row.status==='Removido')fail(404,'Documento não localizado.');
  if(!CATEGORIES.includes(category))fail(400,'Categoria inválida.');
  if(typeof note!=='string'||note.trim().length<5||note.length>1000)fail(400,'Justificativa deve ter entre 5 e 1000 caracteres.');
  if(expiresAt===''||expiresAt==null)expiresAt=null;
  if(expiresAt!==null){
   if(typeof expiresAt!=='string'||!/^(19|20|21)\d{2}-\d{2}-\d{2}$/.test(expiresAt)||Number.isNaN(Date.parse(expiresAt))||new Date(expiresAt).toISOString().slice(0,10)!==expiresAt)fail(400,'Data de validade inválida.');
  }
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare('UPDATE library_documents SET category=?,expires_at=?,version=version+1 WHERE id=?').run(category,expiresAt,id);
   if(row.category!==category)db.prepare("UPDATE library_analyses SET status='Desatualizado' WHERE document_id=?").run(id);
   event(id,u,'Metadados alterados',JSON.stringify({before:{category:row.category,expiresAt:row.expires_at},after:{category,expiresAt},note:note.trim()}));
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  return db.prepare('SELECT * FROM library_documents WHERE id=?').get(id);
 }

 function trash(u,companyId){permission(u);reviewPermission(u);company(companyId);
  return db.prepare("SELECT d.id,d.name,d.category,d.created,d.source_path,d.company_id,d.batch_id,d.hash FROM library_documents d WHERE d.company_id=? AND d.status='Removido' ORDER BY d.created DESC LIMIT 200").all(companyId);
 }
 function restore(u,id,{reason=''}={}){
  permission(u);reviewPermission(u);
  if(typeof reason!=='string'||reason.trim().length<5||reason.length>1000)fail(400,'Informe motivo com pelo menos 5 caracteres.');
  const doc=db.prepare("SELECT * FROM library_documents WHERE id=? AND status='Removido'").get(id);
  if(!doc)fail(404,'Documento não localizado na lixeira.');
  if(db.prepare("SELECT id FROM library_documents WHERE company_id=? AND hash=? AND status!='Removido'").get(doc.company_id,doc.hash))fail(409,'Existe PDF idêntico ativo nesta empresa. Remova o duplicado antes de restaurar.');
  db.exec('BEGIN IMMEDIATE');try{
   db.prepare("UPDATE library_documents SET status='Pendente',reviewed_by=NULL,reviewed_at=NULL,review_note='',version=version+1 WHERE id=?").run(id);
   db.prepare("UPDATE library_analyses SET status='Desatualizado' WHERE document_id=?").run(id);
   event(id,u,'Restauração',JSON.stringify({reason:reason.trim(),previousStatus:'Removido',newStatus:'Pendente'}));
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  return {ok:true,id,status:'Pendente'};
 }
 // Leitura sob demanda: permite OCR de até 20 páginas por documento; não marca páginas
 // ilegíveis como verificadas. Não substitui índice anterior se a leitura falhar.
 let processing=false;
 async function indexOne(u,id,{ocr=true}={}){
  permission(u);if(processing)fail(429,'Outra leitura/análise da biblioteca está em andamento.');
  const row=db.prepare("SELECT * FROM library_documents WHERE id=? AND status!='Removido'").get(id);
  if(!row)fail(404,'Documento não encontrado.');
  processing=true;
  try{
   const parsed=await readPDFs(dir,[row],{maxOCRPages:ocr?20:0,ocrTimeout:60000});
   const content=parsed.pages.map(p=>`[Página ${p.page}] ${p.text}`).join('\n').slice(0,500000);
   const status=parsed.report.pendingPages?'incompleto':'indexado';
   if(!content.trim())fail(409,'Não foi possível extrair texto confiável. Confira o PDF ou envie um arquivo pesquisável.');
   db.exec('BEGIN IMMEDIATE');
   try{
    db.prepare('INSERT OR REPLACE INTO library_index(document_id,indexed_at,text_content,pages,pending_pages,status,error) VALUES(?,?,?,?,?,?,?)').run(id,new Date().toISOString(),content,parsed.report.totalPages,parsed.report.pendingPages,status,'');
    db.prepare("UPDATE library_analyses SET status='Desatualizado' WHERE document_id=?").run(id);
    event(id,u,'Reindexação',JSON.stringify({status,pages:parsed.report.totalPages,native:parsed.report.nativePages,ocr:parsed.report.ocrPages,pending:parsed.report.pendingPages}));
    db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
   return {id,name:row.name,status,pages:parsed.report.totalPages,pendingPages:parsed.report.pendingPages,nativePages:parsed.report.nativePages,ocrPages:parsed.report.ocrPages};
  }finally{processing=false;}
 }
 function getAnalysis(u,id){permission(u);
  const row=db.prepare("SELECT id,company_id,category,status FROM library_documents WHERE id=? AND status!='Removido'").get(id);
  if(!row)fail(404,'Documento não localizado.');
  const a=db.prepare('SELECT * FROM library_analyses WHERE document_id=?').get(id);
  return a?{...row,status:a.status,analysis:JSON.parse(a.payload),generatedAt:a.generated_at,reviewedAt:a.reviewed_at,reviewNote:a.review_note,reviewedBy:a.reviewed_by}:null;
 }
 async function analyze(u,id){permission(u);
  if(!u.admin&&!allowed(u,'Analisar editais')&&!allowed(u,'Administrar equipe'))fail(403,'Sem permissão para executar a análise documental.');
  if(processing)fail(429,'Outra leitura/análise da biblioteca está em andamento.');
  const row=db.prepare("SELECT * FROM library_documents WHERE id=? AND status!='Removido'").get(id);
  if(!row)fail(404,'Documento não encontrado.');
  const idx=db.prepare('SELECT * FROM library_index WHERE document_id=?').get(id);
  if(!idx?.text_content?.trim())fail(409,'Indexe o PDF, inclusive com OCR se necessário, antes de analisar com IA.');
  processing=true;
  try{
   const analysis=await analyzeIndexedDocument(row,idx);
   db.exec('BEGIN IMMEDIATE');try{
    const old=db.prepare('SELECT * FROM library_analyses WHERE document_id=?').get(id);
    if(old)db.prepare('INSERT INTO library_analysis_versions(document_id,payload,status,saved_at) VALUES(?,?,?,?)').run(id,old.payload,old.status,new Date().toISOString());
    db.prepare(`INSERT INTO library_analyses(document_id,payload,status,generated_at,reviewed_by,reviewed_at,review_note)
      VALUES(?,?,?, ?,NULL,NULL,'') ON CONFLICT(document_id) DO UPDATE SET payload=excluded.payload,status=excluded.status,generated_at=excluded.generated_at,reviewed_by=NULL,reviewed_at=NULL,review_note=''`).run(id,JSON.stringify(analysis),'Pendente',analysis.generatedAt);
    event(id,u,'Análise IA',JSON.stringify({mode:analysis.mode,model:analysis.model,evidence:analysis.items.filter(x=>x.evidenceVerified).length,unverified:analysis.items.filter(x=>!x.evidenceVerified).length,pendingPages:analysis.reading.pendingPages}));
    db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
   return getAnalysis(u,id);
  }finally{processing=false;}
 }
 function reviewAnalysis(u,id,{status,note=''}={}){
  permission(u);reviewPermission(u);
  if(!['Revisado','Rejeitado'].includes(status)||typeof note!=='string'||note.trim().length<5||note.length>2000)fail(400,'Informe uma revisão e justificativa de pelo menos 5 caracteres.');
  const document=db.prepare("SELECT id,status FROM library_documents WHERE id=? AND status!='Removido'").get(id);
  if(!document)fail(404,'Documento não localizado.');
  const a=db.prepare('SELECT * FROM library_analyses WHERE document_id=?').get(id);
  if(!a)fail(404,'Análise não encontrada.');
  if(a.status==='Desatualizado')fail(409,'Análise desatualizada. Reprocesse o PDF e revise novamente.');
  db.exec('BEGIN IMMEDIATE');try{
   db.prepare('UPDATE library_analyses SET status=?,reviewed_by=?,reviewed_at=?,review_note=? WHERE document_id=?').run(status,u.id,new Date().toISOString(),note.trim(),id);
   event(id,u,'Revisão de análise IA',JSON.stringify({before:a.status,after:status,note:note.trim()}));
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  return getAnalysis(u,id);
 }
 function report(u,companyId){permission(u);company(companyId);
  const rows=db.prepare(`SELECT d.id,d.name,d.category,d.status,d.expires_at,d.created,i.status indexing_status,i.pending_pages,a.status analysis_status
   FROM library_documents d LEFT JOIN library_index i ON i.document_id=d.id LEFT JOIN library_analyses a ON a.document_id=d.id
   WHERE d.company_id=? AND d.status!='Removido' ORDER BY d.category,d.name`).all(companyId);
  const today=new Date().toISOString().slice(0,10);
  const count=(predicate)=>rows.filter(predicate).length;
  return {companyId,generatedAt:new Date().toISOString(),total:rows.length,categories:Object.fromEntries(CATEGORIES.map(c=>[c,count(r=>r.category===c)])),pending:count(r=>r.status==='Pendente'),validated:count(r=>r.status==='Validado'),rejected:count(r=>r.status==='Rejeitado'),expired:count(r=>r.expires_at&&r.expires_at<today),withoutExpiry:count(r=>!r.expires_at),indexed:count(r=>r.indexing_status==='indexado'),incomplete:count(r=>r.indexing_status==='incompleto'),withoutIndex:count(r=>!r.indexing_status),analysed:count(r=>!!r.analysis_status),aiReviewed:count(r=>r.analysis_status==='Revisado'),documents:rows};
 }
 function listComparisons(u,companyId){permission(u);company(companyId);
  return db.prepare('SELECT id,company_id,tender_id,created,actor,substr(requirements,1,200) requirements_excerpt FROM library_comparisons WHERE company_id=? ORDER BY created DESC LIMIT 50').all(companyId);
 }
 function getComparison(u,id){permission(u);
  const row=db.prepare('SELECT * FROM library_comparisons WHERE id=?').get(id);
  if(!row)fail(404,'Comparação não encontrada.');
  return {id:row.id,...JSON.parse(row.payload)};
 }
 async function compare(u,{companyId,tenderId=null,requirements=''}={}){
  permission(u);company(companyId);
  if(!u.admin&&!allowed(u,'Analisar editais'))fail(403,'Sem permissão de análise de editais.');
  if(processing)fail(429,'Outra leitura/análise da biblioteca está em andamento.');
  if(tenderId!==null){if(typeof tenderId!=='string'||!db.prepare('SELECT id FROM tenders WHERE id=?').get(tenderId))fail(400,'Licitação não encontrada.');}
  const rows=db.prepare(`SELECT d.*,a.payload analysis_payload,a.status analysis_status FROM library_documents d JOIN library_analyses a ON a.document_id=d.id
    WHERE d.company_id=? AND d.status!='Removido' AND a.status!='Desatualizado' AND a.status!='Rejeitado' ORDER BY a.generated_at DESC LIMIT 50`).all(companyId);
  const documents=rows.map(d=>({id:d.id,name:d.name,category:d.category,status:d.status,expires_at:d.expires_at,analysisStatus:d.analysis_status,analysis:JSON.parse(d.analysis_payload)}));
  processing=true;
  try{
   const result=await compareEvidence({companyId,tenderId,requirements,documents});
   const id=randomUUID();
   db.exec('BEGIN IMMEDIATE');try{
    db.prepare('INSERT INTO library_comparisons(id,company_id,tender_id,requirements,payload,created,actor) VALUES(?,?,?,?,?,?,?)').run(id,companyId,tenderId,result.requirements,JSON.stringify(result),result.createdAt,u.id);
    // As comparações guardam instantâneo das evidências, nunca mudam os documentos originais.
    db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
   return {id,...result};
  }finally{processing=false;}
 }

 function matchDocuments(u,id){permission(u);company(id);return db.prepare("SELECT d.id,d.name,d.category,d.status,d.expires_at,i.status indexing_status,i.text_content,CASE WHEN a.status='Revisado' THEN a.payload END reviewed FROM library_documents d LEFT JOIN library_index i ON i.document_id=d.id LEFT JOIN library_analyses a ON a.document_id=d.id WHERE d.company_id=? AND d.category IN ('Atestados','Balanços') AND d.status NOT IN ('Rejeitado','Removido') AND (coalesce(d.expires_at,'')='' OR d.expires_at>=date('now','-3 hours')) ORDER BY d.created DESC").all(id);}
 return {matchDocuments,companies:COMPANIES,categories:CATEGORIES,list,upload,uploadZip,review,download,history,search,progress,indexBatch,indexOne,analyze,getAnalysis,reviewAnalysis,report,compare,listComparisons,getComparison,remove,trash,restore,batches,cancelBatch,updateMetadata};
}
