import PDFDocument from 'pdfkit';
import {fileURLToPath} from 'node:url';
import {SUMMARY_BLOCKS,EXTERNAL_FIELDS} from '../shared/summary-catalog.mjs';
import {officialFields} from '../shared/official-fields.mjs';
const privateFields=new Set(['b4_3','b4_4','b4_5','b4_6','b4_7','b5_9']);
const date=value=>value?new Date(value).toLocaleString('pt-BR',{timeZone:'America/Fortaleza'}):'Não informado';
export function summaryEntries(detail,financialAllowed){
 const portal=detail.officialCollection?.fields||(detail.fonte==='PNCP'?officialFields(detail.oficial||{},[],detail.coletadoEm||detail.createdAt):[]);
 return SUMMARY_BLOCKS.map(block=>({...block,fields:block.fields.filter(f=>financialAllowed||!privateFields.has(f.id)).map(f=>({...f,portal:portal.find(p=>p.id===f.id),extracted:detail.summary?.formatVersion===20?detail.summary.fields?.find(x=>x.label===f.id):null,manual:detail.manual?.[f.id]}))}));
}
export async function renderSummaryPDF(detail,{financialAllowed=false,actor='Equipe',team=[]}={}){
 const doc=new PDFDocument({size:'A4',margins:{top:52,bottom:72,left:48,right:48},bufferPages:true,info:{Title:'Resumo do edital - '+detail.titulo,Author:'Central de Licitações'}});
 doc.registerFont('Report',fileURLToPath(new URL('./fonts/Regular.ttf',import.meta.url)));doc.registerFont('Report-Bold',fileURLToPath(new URL('./fonts/Bold.ttf',import.meta.url)));
 const chunks=[];const complete=new Promise((resolve,reject)=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
 const width=499;
 const text=(value,size=10,color='#26364a',bold=false)=>{doc.font(bold?'Report-Bold':'Report').fontSize(size).fillColor(color).text(String(value??''),{width,lineGap:3});doc.moveDown(.45);};
 const room=n=>{if(doc.y+n>doc.page.height-85)doc.addPage();};
 text('CENTRAL DE LICITAÇÕES',10,'#153a64',true);text('Resumo do edital',25,'#0c2442',true);text(detail.titulo||'Licitação sem título',13,'#0c2442',true);
 text('Processo / identificação: '+(detail.id||'Não informado'));text('Órgão: '+(detail.orgao||'Não informado'));text('Fonte: '+(detail.fonte||'Não informada'));
 text('Análise: '+date(detail.summary?.generatedAt)+' | Exportação: '+date(new Date().toISOString()));text('Exportado por: '+actor+' | Revisão da ficha: '+detail.version);
 text('Este relatório reúne dados salvos. Extração documental, dados do portal e complementos da equipe são identificados separadamente. Não substitui o edital nem a conferência oficial.',10);
 const report=detail.summary?.readingReport;
 text(!detail.summary?'SEM RESUMO GERADO - conteúdo documental ainda não analisado.':detail.summary.partial||report?.complete===false?'RESUMO PARCIAL - existem páginas pendentes.':'RESUMO GERADO - informações sujeitas à revisão da equipe.',11,'#8a4800',true);
 if(report)text('Cobertura: '+report.nativePages+' páginas com texto; '+report.ocrPages+' com OCR; '+report.blankPages+' em branco; '+report.pendingPages+' pendentes. OCR pode interpretar números e tabelas incorretamente.');
 if(detail.readingReport?.generatedAt&&report?.generatedAt!==detail.readingReport.generatedAt)text('Existe uma tentativa de leitura mais recente. Este PDF usa o resumo anterior preservado e a cobertura correspondente.',10,'#8a4800');
 text('A ausência de informação não significa dispensa de exigência. Não foram criados dados para preencher lacunas.');
 if(!financialAllowed)text('Versão com restrições de acesso: custos, margens e avaliações financeiras privadas foram omitidos.');
 for(const [i,block] of summaryEntries(detail,financialAllowed).entries()){
  doc.addPage();text((i+1)+'. '+block.title,18,'#0c2442',true);
  for(const f of block.fields){room(90);text(f.label,11,'#153a64',true);
   if(f.portal?.value){text('FONTE OFICIAL / PORTAL',8,'#46617c',true);text(f.portal.value);text((f.portal.key||'Campo oficial')+' | Consulta: '+date(f.portal.consultedAt),8);}
   text('DOCUMENTOS ANALISADOS',8,'#46617c',true);text(f.extracted?.value||f.extracted?.note||(EXTERNAL_FIELDS.has(f.id)?'Depende de dados da empresa ou confirmação externa.':detail.summary?'Não localizado no resumo disponível.':'Ainda não analisado.'));
   for(const e of f.extracted?.evidence||[]){const name=detail.summary?.documents?.find(d=>d.id===e.documentId)?.name||'Documento não identificado';text(name+' | página '+e.page,8,'#46617c',true);text('“'+e.quote+'”',9);}
   if(f.manual){text('COMPLEMENTO SALVO PELA EQUIPE',8,'#46617c',true);text(f.manual);}
   doc.moveDown(.5);
  }
 }
 if(detail.analysis?.tasks?.length||detail.analysis?.review?.conclusion){doc.addPage();text('Revisão e providências da equipe',18,'#0c2442',true);const r=detail.analysis.review||{};for(const [key,label] of [['technical','Técnica'],['documentary','Documental'],['operational','Operacional'],...(financialAllowed?[['financial','Financeira']]:[])])text(label+': '+(r[key]||'Não avaliada'));text('Conclusão registrada: '+(r.conclusion||'Sem parecer final'));if(financialAllowed&&r.reason)text('Justificativa: '+r.reason);for(const t of detail.analysis.tasks||[]){room(65);text(t.text,11,'#153a64',true);text('Responsável: '+(team.find(u=>u.id===t.owner)?.nome||'Não atribuído')+' | Prazo: '+(t.due||'Não definido')+' | Situação: '+t.status);}}
 if(detail.summary?.documents?.length){doc.addPage();text('Documentos utilizados',18,'#0c2442',true);for(const d of detail.summary.documents){text(d.name||d.id,11,'#153a64',true);if(d.hash)text('SHA-256: '+d.hash,8);}}
 if(detail.summary&&detail.summary.formatVersion!==20){doc.addPage();text('Resumo anterior preservado',18,'#0c2442',true);for(const f of detail.summary.fields||[]){room(70);text(f.label,11,'#153a64',true);text(f.value||f.note||'Não informado');}}
 const range=doc.bufferedPageRange();for(let i=0;i<range.count;i++){doc.switchToPage(i);const y=doc.y;const bottom=doc.page.margins.bottom;doc.page.margins.bottom=0;doc.font('Report').fontSize(8).fillColor('#64748b').text('Central de Licitações | '+(i+1)+' / '+range.count,48,doc.page.height-36,{width,align:'right',lineBreak:false});doc.page.margins.bottom=bottom;doc.y=y;}
 doc.end();return complete;
}
