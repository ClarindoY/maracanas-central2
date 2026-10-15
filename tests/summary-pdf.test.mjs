import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderSummaryPDF,summaryEntries} from '../server/summary-pdf.mjs';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
test('PDF conserva texto longo, oito blocos, referências, pendências e separa fonte e complemento',async()=>{
 const detail={id:'Teste',titulo:'Amostra de teste - hospedagem e eventos',version:1,manual:{b1_1:'Complemento confirmado',b4_3:'CUSTO PRIVADO'},summary:{formatVersion:20,generatedAt:new Date().toISOString(),partial:true,documents:[{id:'d',name:'Edital.pdf'}],fields:[{label:'b1_1',value:'Texto extenso de teste. '.repeat(500)+'FIM DA EXTRAÇÃO',evidence:[{documentId:'d',page:3,quote:'Texto extenso de teste. '.repeat(500)+'FIM DA EXTRAÇÃO'}]}]}};
 const bytes=await renderSummaryPDF(detail);assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
 const pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;let text='';for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);text+=(await page.getTextContent()).items.map(x=>x.str).join(' ');}await pdf.destroy();
 assert.match(text,/FIM DA EXTRAÇÃO/);assert.match(text,/Complemento confirmado/);assert.match(text,/página 3/);assert.match(text,/RESUMO PARCIAL/);assert.match(text,/8\. Parecer/);assert.doesNotMatch(text,/CUSTO PRIVADO/);assert.equal(summaryEntries(detail,false)[3].fields.some(f=>f.id==='b4_3'),false);assert.equal(summaryEntries(detail,true)[3].fields.some(f=>f.id==='b4_3'),true);
});
