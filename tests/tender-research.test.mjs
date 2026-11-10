import test from 'node:test';
import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';
import {unpackOfficial} from '../server/official-zip.mjs';
import {researchTender} from '../server/tender-research.mjs';
import {SUMMARY_BLOCKS} from '../shared/summary-catalog.mjs';

test('ZIP PNCP identifica PDF em pasta, mantém anexo pendente e rejeita PDF inválido',()=>{
 const zip=new AdmZip();
 zip.addFile('pasta/edital.pdf',Buffer.from('%PDF-1.4 exemplo'));
 zip.addFile('itens.xlsx',Buffer.from('planilha'));
 zip.addFile('falso.pdf',Buffer.from('corrompido'));
 const parts=unpackOfficial(zip.toBuffer(),'arquivo oficial');
 assert.equal(parts.find(p=>p.bytes)?.title,'pasta/edital.pdf');
 assert.equal(parts.filter(p=>p.reason).length,2);
});
test('síntese confronta fontes do mesmo edital e rejeita referência inventada',async()=>{
 process.env.OPENAI_API_KEY='teste';
 const t={urlPNCP:'https://pncp.gov.br/app/editais/13809405000117/2025/36',oficial:{processo:'088/2025',valorTotalHomologado:125570},summary:{documents:[{id:'doc',name:'Edital'}],fields:[{label:'b3_1',value:'50 diárias',evidence:[{documentId:'doc',page:24}]}]},officialCollection:{fields:[{id:'b4_1',value:'10 diárias'}]}};
 const search=async({input})=>{assert.equal(input.processo,'088/2025');assert.ok(!('documentos' in input));return {text:'Contrato de R$ 62.785,00',model:'teste',sources:[{url:'https://www.in.gov.br/exemplo',title:'Extrato'}]};};
 const write=async({input})=>{assert.equal(input.homologado,125570);assert.equal(input.documentos[0].valor,'50 diárias');assert.equal(input.dadosPNCP[0].value,'10 diárias');return {parsed:{sections:SUMMARY_BLOCKS.map(b=>({id:b.id,finding:'Conclusão para teste',references:['PNCP','doc-p24','W1']}))}};};
 const report=await researchTender(t,{search,write});assert.equal(report.sections.length,8);assert.equal(report.references['doc-p24'].title,'Edital · página 24');
 await assert.rejects(()=>researchTender(t,{search,write:async args=>{const r=await write(args);r.parsed.sections[0].references=['inventada'];return r;}}),/referência/);
});
