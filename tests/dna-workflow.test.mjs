import {test} from 'node:test';
import assert from 'node:assert/strict';
import {completeDNA} from '../shared/dna-workflow.mjs';
test('completar DNA salva primeiro, usa versão confirmada e devolve sugestão para revisão',async()=>{
 const saved={version:4,data:{activity:'Assessoria',voice:'Direto',communicationStyle:''}};
 const calls=[];let confirmed;
 const result=await completeDNA(async(url,method,body)=>{calls.push({url,method,body});return calls.length===1?saved:{...saved,data:{...saved.data,communicationStyle:'Frases curtas'}};},{version:3,data:saved.data},p=>{confirmed=p;});
 assert.equal(confirmed,saved);assert.equal(calls[1].body.version,4);assert.equal(result.changed,true);assert.equal(result.profile.data.voice,'Direto');assert.equal(calls.length,2);
});
test('erro ao salvar não aciona Gemini',async()=>{
 let calls=0;await assert.rejects(completeDNA(async()=>{calls++;throw Error('Conflito');},{version:0,data:{}}),/Conflito/);assert.equal(calls,1);
});
test('falha da IA preserva confirmação de salvamento e permite nova tentativa',async()=>{
 const saved={version:1,data:{activity:'Assessoria'}};let calls=0,confirmed;
 await assert.rejects(completeDNA(async()=>{if(++calls===1)return saved;throw Error('Cota indisponível');},{version:0,data:saved.data},p=>{confirmed=p;}),/Personalização salva.*Cota indisponível/);
 assert.equal(confirmed,saved);
});
test('sem complementos não sinaliza sugestões inexistentes',async()=>{
 const saved={version:1,data:{activity:'Assessoria'}};
 const result=await completeDNA(async()=>saved,saved);assert.equal(result.changed,false);
});
