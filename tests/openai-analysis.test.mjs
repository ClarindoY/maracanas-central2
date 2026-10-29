import test from 'node:test';
import assert from 'node:assert/strict';
import {generateStructured,openaiConfig} from '../server/openai-analysis.mjs';
test('OpenAI usa chave apenas no header e recebe JSON estruturado',async()=>{
 const key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-secret-not-real';
 try{
  const schema={type:'object',additionalProperties:false,required:['fields'],properties:{fields:{type:'array',items:{type:'string'}}}};
  const result=await generateStructured({instructions:'Extraia dados',input:{docs:[]},schema},async(url,req)=>{
   assert.equal(url,'https://api.openai.com/v1/responses');
   assert.equal(req.headers.Authorization,'Bearer test-secret-not-real');
   assert.equal(req.redirect,'error');
   assert.equal(req.body.includes('test-secret-not-real'),false);
   const body=JSON.parse(req.body);assert.equal(body.store,false);
   assert.equal(body.text.format.type,'json_schema');assert.deepEqual(body.text.format.schema,schema);
   return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({fields:[]})}]}],usage:{input_tokens:12,output_tokens:4,total_tokens:16}})};
  });assert.deepEqual(result.parsed,{fields:[]});assert.equal(result.usage.total_tokens,16);
 }finally{if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('Bloqueia configuração sem chave',()=>{assert.throws(()=>openaiConfig({}),e=>e.status===503);});
