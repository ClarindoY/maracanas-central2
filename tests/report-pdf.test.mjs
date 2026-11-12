import test from 'node:test';
import assert from 'node:assert/strict';
import {reportPDF} from '../server/report-pdf.mjs';
import {SUMMARY_BLOCKS} from '../shared/summary-catalog.mjs';
import {buildProfile,compare} from '../server/document-match.mjs';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';

test('PDF da versão arquivada contém os oito blocos, fonte, página e complemento',async()=>{
 const report={id:7,title:'Diárias de hospedagem',kind:'Resumo',created:'2026-11-10',snapshot:{summary:{fields:[{label:'b3_1',value:'50 diárias',evidence:[{documentId:'1',page:24,quote:'Quantidade de quartos'}]}],documents:[{id:'1',name:'Edital.pdf'}]},official:[],manual:{b3_1:'Conferir o item 1'}}};
 const chunks=[];for await(const chunk of reportPDF(report))chunks.push(chunk);
 const pdf=await getDocument({data:new Uint8Array(Buffer.concat(chunks)),useSystemFonts:true}).promise;
 try{let text='';for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);text+=(await page.getTextContent()).items.map(x=>x.str).join(' ')+' ';}
 for(const block of SUMMARY_BLOCKS)assert.ok(text.includes(block.title),block.title);
 for(const value of ['50 diárias','Edital.pdf','página 24','Conferir o item 1'])assert.ok(text.includes(value));
 }finally{await pdf.destroy();}
});
test('atestado de hotelaria não corresponde a hospedagem de dados',()=>{
 const profile=buildProfile([{id:'1',category:'Atestados',text_content:'Serviços de hotelaria',status:'Validado'}]);
 assert.equal(compare(profile,'hospedagem de dados','','hospedagem').evidence.length,0);
 assert.ok(compare(profile,'hospedagem de pessoas','','hospedagem').evidence.length);
});
