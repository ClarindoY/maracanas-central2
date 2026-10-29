import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateStructured,openaiConfig} from '../server/openai.mjs';
import {searchMarketingNews} from '../server/marketing-news.mjs';

const env={OPENAI_API_KEY:'test-secret-never-print'};
const schema={type:'object',properties:{title:{type:'string'}},required:['title'],additionalProperties:false};
const args={instructions:'Use o perfil informado.',input:{profile:{voice:'Educativo'}},schema};
const response=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>data});
const message=(text,annotations=[])=>({type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text,annotations}]});
const completed=(output)=>({status:'completed',model:'gpt-5.6-terra',output,usage:{input_tokens:12,output_tokens:8,total_tokens:20}});
const run=(request,fetcher)=>generateStructured(request,fetcher,{env});

test('Marketing usa Responses com chave no cabeçalho, schema estrito e armazenamento desativado',async()=>{
 const result=await run(args,async(url,r)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(r.redirect,'error');
  assert.equal(r.headers.Authorization,'Bearer '+env.OPENAI_API_KEY);assert.ok(r.signal);
  const b=JSON.parse(r.body);assert.equal(b.model,'gpt-5.6-terra');assert.equal(b.store,false);
  assert.equal(b.text.format.strict,true);assert.deepEqual(b.text.format.schema,schema);
  assert.deepEqual(JSON.parse(b.input),args.input);assert.equal(b.tools,undefined);
  assert.ok(!r.body.includes(env.OPENAI_API_KEY));
  return response(200,completed([message('{"title":"Texto personalizado"}')]));
 });
 assert.equal(result.parsed.title,'Texto personalizado');assert.equal(result.usage.total_tokens,20);assert.equal(result.provider,'openai');
});
test('configuração exige chave e ignora modelo legado de outro módulo',()=>{
 assert.throws(()=>openaiConfig({}),e=>e.status===503&&/OPENAI_API_KEY/.test(e.message));
 assert.equal(openaiConfig({...env,OPENAI_MODEL:'gpt-4o-mini'}).model,'gpt-5.6-terra');
 assert.throws(()=>openaiConfig({...env,MARKETING_OPENAI_MODEL:'https://other.test'}),e=>e.status===503);
});
test('busca é obrigatória e ampla; somente citações reais e URLs seguras viram fontes',async()=>{
 const result=await run({...args,webSearch:true},async(url,r)=>{
  const b=JSON.parse(r.body);assert.deepEqual(b.tools,[{type:'web_search'}]);assert.equal(b.tool_choice,'required');assert.equal(b.text,undefined);
  return response(200,completed([{type:'web_search_call',status:'completed',action:{type:'search',query:'varejo hoje'}},message('Resultado',[
   {type:'url_citation',url:'https://example.org/noticia',title:'Notícia'},
   {type:'url_citation',url:'https://example.org/noticia',title:'Duplicada'},
   {type:'url_citation',url:'javascript:alert(1)'},{type:'url_citation',url:'https://user:password@example.org'},
   {type:'other',url:'https://example.org/sem-citacao'}
  ])]));
 });
 assert.equal(result.searchPerformed,true);assert.equal(result.sources.length,1);assert.equal(result.sources[0].title,'Notícia');assert.deepEqual(result.queries,['varejo hoje']);
 await assert.rejects(run({...args,webSearch:true},async()=>response(200,completed([message('Pesquisei sem ferramenta')]))),e=>e.status===502);
});
test('busca OpenAI alimenta organização por perfil e filtro de datas sem outra credencial',async()=>{
 const now=Date.parse('2026-10-29T15:00:00Z');let count=0;
 const generate=request=>run(request,async(url,r)=>{
  const b=JSON.parse(r.body);count++;
  if(b.tools){assert.equal(JSON.parse(b.input).audience,'Lojistas');return response(200,completed([
   {type:'web_search_call',status:'completed',action:{type:'search',queries:['varejo']}},
   message('Fato publicado em 29/10/2026 às 10h -03:00.',[{type:'url_citation',url:'https://example.org/hoje',title:'Fonte'}])
  ]));}
  assert.equal(JSON.parse(b.input).dna.data.voice,'Educativo');
  return response(200,completed([message(JSON.stringify({ideas:[{title:'Mudança no varejo',summary:'Fato',angle:'Efeito para lojistas',reason:'Impacto',potential:'Moderado',sourceId:0,publishedAt:'2026-10-29T10:00:00-03:00'}]}))]));
 });
 const out=await searchMarketingNews(generate,{data:{topics:'Varejo',audience:'Lojistas',voice:'Educativo'}},24,now);
 assert.equal(count,2);assert.equal(out.ideas.length,1);assert.equal(out.ideas[0].source.url,'https://example.org/hoje');assert.equal(out.provider,'openai');
});
test('erros de pagamento, acesso e modelo são específicos, sem repetir cobrança ou expor dados',async()=>{
 for(const [status,code,pattern] of [[401,'invalid_api_key',/chave/],[403,'permission_denied',/permissões/],[404,'model_not_found',/modelo|Modelo/],[429,'insufficient_quota',/saldo/],[429,'rate_limit_exceeded',/temporário/],[503,'server_error',/indisponível/]]){
  let calls=0;
  await assert.rejects(run(args,async()=>{calls++;return response(status,{error:{code,message:env.OPENAI_API_KEY}});}),e=>pattern.test(e.message)&&!e.message.includes(env.OPENAI_API_KEY));
  assert.equal(calls,1);
 }
});
test('respostas interrompidas, recusas, HTML e JSON inválido não viram conteúdo',async()=>{
 for(const data of [{status:'incomplete',output:[message('{"title":"parcial"}')]},completed([{type:'message',role:'assistant',content:[{type:'refusal',refusal:'No'}]}]),completed([message('not json')]),completed([message('[]')]),completed([])]){
  await assert.rejects(run(args,async()=>response(200,data)),e=>e.status===502);
 }
 await assert.rejects(run(args,async()=>({ok:true,json:async()=>{throw Error('<!DOCTYPE html>')}})),e=>e.status===502);
 await assert.rejects(run(args,async()=>{throw Error(env.OPENAI_API_KEY)}),e=>e.status===502&&!e.message.includes(env.OPENAI_API_KEY));
});
test('áudio usa multipart no endpoint de transcrição e não envia o perfil',async()=>{
 const result=await run({...args,audioParts:[{inlineData:{mimeType:'audio/mpeg',data:Buffer.from('ID3-test').toString('base64')}}]},async(url,r)=>{
  assert.equal(url,'https://api.openai.com/v1/audio/transcriptions');assert.equal(r.headers['Content-Type'],undefined);
  assert.ok(r.body instanceof FormData);assert.equal(r.body.get('model'),'gpt-transcribe');assert.equal(r.body.get('file').name,'audio.mp3');assert.equal(r.body.get('input'),null);
  return response(200,{text:'Um tema para o meu público.'});
 });
 assert.equal(result.parsed.transcript,'Um tema para o meu público.');assert.equal(result.model,'gpt-transcribe');
});
