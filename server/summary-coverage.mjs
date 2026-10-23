export function applyDocumentCoverage(report,tender,docs,selectedIds){
 const selected=new Set(selectedIds),pending=[];
 for(const doc of docs)if(!selected.has(doc.id))pending.push({name:doc.name,reason:'PDF anexado não selecionado nesta análise.'});
 for(const file of tender.officialCollection?.manifest||[])if(!file.documentId)pending.push({name:file.title||'Documento oficial',reason:file.status||'Documento oficial não obtido.'});
 return {...report,documentPending:pending,coverageComplete:report.complete&&pending.length===0};
}
