export function archiveReport(db,tender,kind,date){
 const research=kind==='Pesquisa do edital'?tender.research:null;
 const summary=research&&research.summaryAt!==tender.summary?.generatedAt?null:tender.summary;
 const snapshot={summary:summary||null,research,official:tender.officialCollection?.fields||[],
  manual:tender.manual||{},source:tender.fonte,urlPNCP:tender.urlPNCP};
 db.prepare('INSERT INTO report_history(tender,title,kind,created,snapshot) VALUES(?,?,?,?,?)')
  .run(tender.id,tender.titulo||'Edital',kind,date,JSON.stringify(snapshot));
}

export function initializeReportHistory(work){
 const {db}=work;
 work.transaction(()=>{
  if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='report_history'").get())return;
  db.exec('CREATE TABLE report_history(id INTEGER PRIMARY KEY,tender TEXT NOT NULL,title TEXT NOT NULL,kind TEXT NOT NULL,created TEXT NOT NULL,snapshot TEXT NOT NULL); CREATE INDEX report_history_date ON report_history(created DESC,id DESC)');
  for(const row of db.prepare("SELECT id,data,updated FROM tenders WHERE json_type(data,'$.summary')='object' OR json_type(data,'$.research')='object'").iterate()){
   const tender={...JSON.parse(row.data),id:row.id};
   if(tender.summary)archiveReport(db,tender,'Resumo do edital',tender.summary.generatedAt||row.updated);
   if(tender.research)archiveReport(db,tender,'Pesquisa do edital',tender.research.consultedAt||row.updated);
  }
 });
 db.exec('CREATE INDEX IF NOT EXISTS report_history_by_tender ON report_history(tender,created DESC,id DESC)');
}

export function listReports(db,page){
 const size=25,offset=(page-1)*size;
 const rows=db.prepare('SELECT id,title,kind,created FROM report_history ORDER BY created DESC,id DESC LIMIT ? OFFSET ?').all(size+1,offset);
 return {rows:rows.slice(0,size),more:rows.length>size};
}
export function readReport(db,id){
 const row=db.prepare('SELECT id,title,kind,created,snapshot FROM report_history WHERE id=?').get(id);
 if(!row)return null;
 return {...row,snapshot:JSON.parse(row.snapshot)};
}
