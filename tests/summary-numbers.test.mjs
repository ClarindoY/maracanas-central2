import {test} from 'node:test';import assert from 'node:assert/strict';import {validateSummary} from '../server/summary.mjs';import {consolidateParts} from '../server/summary-parts.mjs';
const evaluate=(value,quote)=>validateSummary({fields:[{label:'b1_5',value,evidence:[{documentId:'d',page:1,quote}]}]},[{documentId:'d',page:1,text:quote}]).fields.find(f=>f.label==='b1_5');
test('formatação monetária equivalente e numeração de lista preservam extração',()=>{
 assert.equal(evaluate('1. Valor estimado: R$ 1000,00','Valor estimado: R$ 1.000,00.').value,'1. Valor estimado: R$ 1000,00');
 assert.ok(evaluate('Valor de R$ 1000.50','Valor de R$ 1.000,50.').value);
});
test('número parcial, percentual e data divergentes continuam recusados',()=>{
 assert.equal(evaluate('Valor de R$ 100,00','Valor de R$ 1.000,00.').value,null);
 assert.equal(evaluate('Taxa de 10%','Taxa de 100% sobre o valor.').value,null);
 assert.equal(evaluate('Prazo 12/11/2026','Prazo de entrega 11/12/2026.').value,null);
 const part=validateSummary({fields:[{label:'b1_5',value:'100',evidence:[]}]},[]);assert.match(consolidateParts([part]).fields.find(f=>f.label==='b1_5').note,/referência verificável/);
});
