import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileBlockFields} from '../server/summary-recovery.mjs';
test('keeps valid fields and reports only missing fields',()=>{
 const result=reconcileBlockFields(['a','b','c'],[{label:'a',value:'Dado',evidence:[]},{label:'outside',value:'X',evidence:[]},{label:'b',value:null,evidence:[]}]);
 assert.deepEqual(result.accepted.map(f=>f.label),['a','b']);
 assert.deepEqual(result.missing,['c']);
});
test('rejects malformed evidence and duplicate labels',()=>{
 const result=reconcileBlockFields(['a','b'],[{label:'a',value:'1',evidence:[{documentId:'x',page:0,quote:'x'}]},{label:'b',value:'2',evidence:[]},{label:'b',value:'3',evidence:[]}]);
 assert.deepEqual(result.accepted.map(f=>f.label),['b']);assert.deepEqual(result.missing,['a']);
});
