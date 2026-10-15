import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groundedField,reportQuality,reportingField} from '../shared/report-quality.mjs';
import {validateSummary} from '../server/summary.mjs';
test('síntese de sanções sem suporte é substituída pelo trecho, sem acrescentar penalidades',()=>{
 const quote='Multa moratória de 1% ao dia, até 30 dias.';
 const out=validateSummary({fields:[{label:'b5_6',value:'Advertência e impedimento de licitar, com multa de 1% por até 30 dias.',evidence:[{documentId:'d',page:1,quote}]}]},[{documentId:'d',page:1,text:quote}]);
 assert.equal(out.fields.find(f=>f.label==='b5_6').value,quote);
 assert.equal(groundedField({value:'Conclusão sem fonte',evidence:[]}).value,null);
});
test('hospedagem SaaS recebe alerta, sem classificar hotéis ou completar habilitação; vigência usa referência cruzada',()=>{
 const detail={titulo:'Licenciamento de plataforma integrada em nuvem SaaS com hospedagem',summary:{fields:[{label:'b2_1',value:null},{label:'b5_1',value:null},{label:'b6_8',value:'Prazo',evidence:[{documentId:'d',page:2,quote:'O contrato terá vigência de 12 meses contados da assinatura.'}]}]}};
 assert.equal(reportQuality(detail).technology,true);assert.ok(reportQuality(detail).notices.some(n=>/Habilitação incompleta/.test(n)));assert.match(reportingField(detail,'b5_1').value,/12 meses/);assert.equal(detail.summary.fields[1].value,null);
});
