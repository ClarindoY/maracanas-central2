import {test} from 'node:test';import assert from 'node:assert/strict';
import {matchesTender} from '../shared/tender-filters.mjs';import {valueRangeError,tenderValue} from '../shared/tender-value.mjs';
const tender=v=>({fonte:'PNCP',oficial:{orcamentoSigilosoCodigo:1,valorTotalEstimado:v}});
test('faixa inclusiva, sem limite, sigilo e valores ausentes',()=>{
 for(const n of [1000,1500,2000])assert.equal(matchesTender(tender(n),{minValue:'1000',maxValue:'2000'}),true);
 for(const n of [999,2001,0])assert.equal(matchesTender(tender(n),{minValue:'1000',maxValue:'2000'}),false);
 assert.equal(matchesTender(tender(100),{maxValue:'100'}),true);assert.equal(matchesTender(tender(3000),{minValue:'1000'}),true);
 assert.equal(matchesTender({fonte:'PNCP',oficial:{orcamentoSigilosoCodigo:3,valorTotalEstimado:1000}},{minValue:'0'}),false);
 assert.equal(tenderValue({fonte:'PNCP',valor:'R$ 1.000,00'}),null);assert.equal(matchesTender({},{}),true);
 assert.match(valueRangeError({minValue:'2000',maxValue:'1000'}),/mínimo/);assert.ok(valueRangeError({minValue:'abc'}));assert.ok(valueRangeError({minValue:'-1'}));
});
