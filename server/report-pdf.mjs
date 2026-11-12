import PDFDocument from 'pdfkit';
import {SUMMARY_BLOCKS} from '../shared/summary-catalog.mjs';

export function reportPDF(report){
 const {summary,research,official=[],manual={}}=report.snapshot;
 const doc=new PDFDocument({size:'A4',margins:{top:48,bottom:48,left:48,right:48},info:{Title:report.title,Subject:report.kind}});
 const text=(value,size=10,bold=false)=>{if(value===null||value===undefined||value==='')return;doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size).fillColor(bold?'#112749':'#273345').text(String(value),{lineGap:2});doc.moveDown(0.35);};
 const link=(title,url)=>{text(title,9);if(/^https?:\/\//i.test(url||'')){doc.font('Helvetica').fontSize(9).fillColor('#154c80').text(url,{link:url,underline:true});doc.moveDown(0.4);}};
 text(report.kind,12,true);text(report.title,19,true);text('Registro '+report.id+' · '+new Date(report.created).toLocaleString('pt-BR',{timeZone:'America/Fortaleza'}));
 if(summary?.partial||research?.partial)text('Relatório parcial. Há informações pendentes de conferência.');
 if(report.snapshot.urlPNCP)link('Edital no PNCP',report.snapshot.urlPNCP);
 for(const [index,block] of SUMMARY_BLOCKS.entries()){
  if(index)doc.addPage();text((index+1)+'. '+block.title,15,true);
  const section=research?.sections?.find(s=>s.id===block.id);
  if(section){text(section.finding);for(const key of section.references||[]){const ref=research.references?.[key];if(ref)link(ref.title,ref.url);}}
  for(const field of block.fields){
   const value=summary?.fields?.find(f=>f.label===field.id),portal=official.find(f=>f.id===field.id);
   if(!summary&&!portal?.value&&!manual[field.id])continue;
   text(field.label,11,true);if(portal?.value)text('PNCP · '+portal.value);
   text(value?.value||value?.note||'Sem informação registrada nesta versão.');
   for(const e of value?.evidence||[]){const file=summary?.documents?.find(d=>d.id===e.documentId);text((file?.name||'Documento')+' · página '+e.page+' · '+e.quote,9);}
   if(manual[field.id])text('Complemento da equipe · '+manual[field.id]);
  }
  if(!section&&!summary&&!block.fields.some(f=>manual[f.id]||official.some(p=>p.id===f.id&&p.value)))text('Sem informação registrada nesta versão.');
 }
 const legacy=summary?.fields?.filter(f=>!SUMMARY_BLOCKS.some(b=>b.fields.some(x=>x.id===f.label)))||[];
 if(legacy.length){doc.addPage();text('Campos do relatório original',15,true);for(const f of legacy){text(f.label,11,true);text(f.value||f.note);}}
 doc.end();return doc;
}
