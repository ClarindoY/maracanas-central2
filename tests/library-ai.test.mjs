import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEvidence,splitIndexedPages,verifyEvidence,parseMoney,amountIsQuoted,financialRatios,analyzeIndexedDocument,compareEvidence} from '../server/library-ai.mjs';

test('páginas e trechos citados têm comparação literal, sem aceitar citação inventada',()=>{
 const pages=splitIndexedPages('[Página 1] Atestado de capacidade técnica 600 diárias.\n[Página 2] Inexecução não consta.');
 assert.equal(pages.length,2);assert.equal(pages[0].page,1);
 const fields=verifyEvidence([
  {key:'diarias',value:'600',page:1,quote:'capacidade técnica 600 diárias',notes:''},
  {key:'diarias',value:'6000',page:1,quote:'6000 diárias comprovadas',notes:''},
  {key:'fantasia',value:'sim',page:3,quote:'Atestado de capacidade',notes:''}
 ],pages);
 assert.equal(fields[0].evidenceVerified,true);
 assert.equal(fields[1].evidenceVerified,false);
 assert.equal(fields[2].evidenceVerified,false);
});
test('conversão de números pt-BR sem considerar texto especulativo',()=>{
 assert.equal(parseMoney('1.234.567,89'),1234567.89);
 assert.equal(parseMoney('R$ 1.020,50'),1020.5);
 assert.equal(parseMoney('1020.50'),1020.5);
 assert.equal(parseMoney('R$ 1,25 milhão'),null);
 assert.equal(parseMoney('-100'),null);
 assert.equal(amountIsQuoted('1200','Ativo circulante: R$ 1.200,00'),true);
 assert.equal(amountIsQuoted('1900','Ativo circulante: R$ 1.200,00'),false);
});
test('índices financeiros são matemáticos e dependem de valores e citações conferidos',()=>{
 const fields=[
  ['ativo_circulante','1000','Ativo Circulante: 1.000,00'],
  ['passivo_circulante','500','Passivo Circulante: 500,00'],
  ['realizavel_longo_prazo','200','Realizável Longo Prazo: 200,00'],
  ['exigivel_longo_prazo','100','Exigível Longo Prazo: 100,00'],
  ['ativo_total','1800','Ativo Total: 1.800,00'],
 ].map(([key,value,quote])=>({key,value,quote,page:1,evidenceVerified:true,notes:''}));
 const result=financialRatios(fields);
 assert.equal(result.ratios.liquidez_corrente.value,2);
 assert.equal(result.ratios.liquidez_geral.value,2);
 assert.equal(result.ratios.solvencia_geral.value,3);
 assert.equal(financialRatios(fields,['Unidade em milhares de reais']).ratios.liquidez_corrente.value,null);
 assert.equal(financialRatios(fields.filter(x=>x.key!=='passivo_circulante')).ratios.liquidez_corrente.value,null);
});
test('análise IA armazena apenas trechos verificáveis e avisa páginas pendentes',async()=>{
 const document={name:'atestado.pdf',company_id:'rep',category:'Atestados'};
 const idx={text_content:'[Página 1] Contratação de serviços de hospedagem em 2024.',status:'incompleto',pending_pages:3,pages:4};
 const generator=async()=>({parsed:{documentType:'atestado',summary:'Hospedagem',issuer:'Orgão X',subject:'Hospedagem',period:'2024',items:[{key:'objeto',value:'hospedagem',page:1,quote:'serviços de hospedagem',notes:''},{key:'quantidade',value:'100',page:1,quote:'100 diárias',notes:''}],warnings:[]},model:'fake',usage:{}});
 const analysis=await analyzeIndexedDocument(document,idx,{generator});
 assert.equal(analysis.items[0].evidenceVerified,true);
 assert.equal(analysis.items[1].evidenceVerified,false);
 assert.ok(analysis.warnings.some(w=>w.includes('Leitura incompleta')));
 assert.equal(analysis.humanApproved,false);
});
test('comparador recusa evidência falsa e mantém ressalva para documento pendente',async()=>{
 const analysis={summary:'Atestado',items:[{key:'objeto',value:'Hospedagem',page:2,quote:'Hospedagem comprovada',evidenceVerified:true}],warnings:[]};
 const documents=[{id:'doc-1',name:'atestado.pdf',status:'Pendente',category:'Atestados',analysisStatus:'Pendente',expires_at:null,analysis}];
 const generator=async()=>({parsed:{overview:'Revisar',requirements:[{requirement:'Hospedagem',status:'Evidência localizada',rationale:'Evidência encontrada',evidence:[{documentId:'doc-1',page:2,quote:'Hospedagem comprovada'}]},{requirement:'100 diárias',status:'Evidência localizada',rationale:'Suposto',evidence:[{documentId:'doc-1',page:2,quote:'100 diárias'}]}],warnings:[]},model:'fake'});
 const result=await compareEvidence({companyId:'rep',requirements:'Hospedagem e pelo menos 100 diárias',documents,generator});
 assert.equal(result.items[0].status,'Revisão necessária');
 assert.equal(result.items[1].status,'Não comprovado');
 assert.equal(result.items[1].evidence.length,0);
});
