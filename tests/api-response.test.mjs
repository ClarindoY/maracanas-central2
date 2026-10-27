import {test} from 'node:test';import assert from 'node:assert/strict';import {readApiResponse} from '../src/api-response.mjs';
test('HTML da interface não vira erro de sintaxe nem é tratado como dados',async()=>{
 await assert.rejects(readApiResponse(new Response('<!DOCTYPE html>',{headers:{'Content-Type':'text/html'}}),'/api/marketing/profiles'),/página em vez da API/);
 assert.deepEqual(await readApiResponse(new Response('[{"id":"default"}]',{headers:{'Content-Type':'application/json'}}),'/api/marketing/profiles'),[{id:'default'}]);
 await assert.rejects(readApiResponse(new Response('{',{headers:{'Content-Type':'application/json'}}),'/api/x'),/incompletos/);
 await assert.rejects(readApiResponse(new Response('{"error":"Sessão expirada"}',{status:401,headers:{'Content-Type':'application/json'}}),'/api/x'),/Sessão expirada/);
});
