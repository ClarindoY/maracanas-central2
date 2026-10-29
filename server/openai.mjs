import {fail} from './workspace.mjs';

// Server-only adapter. Marketing has its own model setting so an old OPENAI_MODEL
// used by another feature cannot silently disable web search.
export function openaiConfig(env=process.env){
 const key=env.OPENAI_API_KEY?.trim();
 if(!key)fail(503,'Configure OPENAI_API_KEY no Environment do Render para usar o Marketing. Use uma chave da conta em que você comprou os créditos.');
 const model=env.MARKETING_OPENAI_MODEL?.trim()||'gpt-5.6-terra';
 const audioModel=env.OPENAI_TRANSCRIPTION_MODEL?.trim()||'gpt-transcribe';
 for(const value of [model,audioModel])if(!/^gpt-[a-zA-Z0-9._-]+$/.test(value))fail(503,'Modelo OpenAI inválido. Informe somente o identificador do modelo no Render.');
 return {key,model,audioModel};
}

async function request(path,body,key,fetcher,model){
 let response;
 try{
  response=await fetcher('https://api.openai.com/v1/'+path,{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(120000),
   headers:{Authorization:'Bearer '+key,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},
   body:body instanceof FormData?body:JSON.stringify(body)
  });
 }catch{fail(502,'Não foi possível conectar à OpenAI ou a resposta excedeu o tempo. Seus registros foram preservados.');}
 let data;
 try{data=await response.json();}catch{fail(502,'A OpenAI retornou uma resposta inválida. Seus registros foram preservados.');}
 if(!response.ok){
  // Never return the provider payload: it may contain submitted private data.
  if(response.status===401||response.status===403)fail(502,'A OpenAI recusou a chave ou as permissões (HTTP '+response.status+'). Confira OPENAI_API_KEY e o acesso ao modelo na conta que recebeu os créditos.');
  if(response.status===404)fail(502,'Modelo OpenAI indisponível (HTTP 404): '+model+'. Confira o acesso desse projeto e a configuração do modelo no Render.');
  if(response.status===429){
   const quota=['insufficient_quota','billing_hard_limit_reached'].includes(data?.error?.code)||data?.error?.type==='insufficient_quota';
   throw Object.assign(new Error(quota?'A OpenAI informou saldo ou limite de gastos insuficiente (HTTP 429). Confira o faturamento do projeto da chave utilizada. Seus registros foram preservados.':'Limite temporário da OpenAI (HTTP 429). Aguarde um minuto antes de tentar novamente. Seus registros foram preservados.'),{status:429,code:quota?'insufficient_quota':'rate_limit'});
  }
  fail(502,response.status>=500?'A OpenAI está temporariamente indisponível. Tente novamente mais tarde; seus registros foram preservados.':'A OpenAI recusou a solicitação (HTTP '+response.status+'). Confira o modelo configurado e sua compatibilidade com esta operação.');
 }
 return data;
}

function sourcesFrom(parts){
 const seen=new Set(),sources=[];
 for(const c of parts.flatMap(p=>p.annotations||[])){
  if(c.type!=='url_citation'||typeof c.url!=='string')continue;
  try{const u=new URL(c.url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||seen.has(u.href))continue;
   seen.add(u.href);sources.push({id:sources.length,title:typeof c.title==='string'?c.title.slice(0,500):u.hostname,url:u.href});
  }catch{ /* Ignore malformed citations, never invent sources. */ }
 }
 return sources;
}

export async function generateStructured({instructions,input,schema,webSearch=false,audioParts=[]},fetcher=fetch,{env=process.env}={}){
 const {key,model,audioModel}=openaiConfig(env);
 if(audioParts.length){
  const audio=audioParts[0]?.inlineData;
  const ext={'audio/mpeg':'mp3','audio/mp3':'mp3','audio/wav':'wav','audio/webm':'webm'}[audio?.mimeType];
  if(audioParts.length!==1||!ext||typeof audio?.data!=='string')fail(400,'Envie um áudio MP3, WAV ou WebM.');
  const bytes=Buffer.from(audio.data,'base64');
  if(!bytes.length||bytes.length>8*1024*1024)fail(400,'Envie um áudio de até 8 MB.');
  const form=new FormData();
  form.set('model',audioModel);form.set('file',new Blob([bytes],{type:audio.mimeType}),'audio.'+ext);
  // The transcription endpoint returns the original language; no second model call.
  const data=await request('audio/transcriptions',form,key,fetcher,audioModel);
  if(typeof data?.text!=='string')fail(502,'A OpenAI não retornou uma transcrição válida.');
  if(!data.text.trim())fail(422,'Não foi possível identificar fala no áudio. Tente uma gravação mais nítida.');
  if(data.text.length>8000)fail(422,'A transcrição ultrapassa 8.000 caracteres. Envie um trecho menor.');
  return {parsed:{transcript:data.text.trim()},model:audioModel,usage:data.usage||{},provider:'openai'};
 }
 if(!webSearch&&!schema)fail(500,'Esquema da criação não configurado.');
 const body={model,store:false,instructions,input:JSON.stringify(input),max_output_tokens:12000,
  ...(model==='gpt-5.6-terra'?{reasoning:{effort:'low'}}:{}),
  ...(webSearch?{tools:[{type:'web_search'}],tool_choice:'required'}:{text:{format:{type:'json_schema',name:'marketing_result',strict:true,schema}}})};
 const data=await request('responses',body,key,fetcher,model);
 if(data?.status!=='completed')fail(502,'A OpenAI não concluiu a resposta. Seus registros foram preservados; tente novamente com um pedido menor.');
 const output=Array.isArray(data.output)?data.output:[];
 const parts=output.filter(o=>o.type==='message'&&o.role==='assistant').flatMap(o=>o.content||[]);
 if(parts.some(p=>p.type==='refusal'))fail(502,'A OpenAI não pôde atender a este pedido. Revise o assunto e tente novamente.');
 const text=parts.filter(p=>p.type==='output_text'&&typeof p.text==='string').map(p=>p.text).join('\n');
 if(!text.trim())fail(502,'A OpenAI retornou uma resposta vazia. Seus registros foram preservados.');
 const result={model:data.model||model,usage:data.usage||{},provider:'openai'};
 if(webSearch){
  const searches=output.filter(o=>o.type==='web_search_call'&&o.status==='completed');
  if(!searches.length)fail(502,'A OpenAI não executou a busca na web. Confira se o modelo configurado permite pesquisa.');
  const queries=searches.flatMap(s=>Array.isArray(s.action?.queries)?s.action.queries:[s.action?.query]).filter(q=>typeof q==='string');
  return {...result,text,searchPerformed:true,sources:sourcesFrom(parts),queries};
 }
 let parsed;try{parsed=JSON.parse(text);}catch{fail(502,'A OpenAI não retornou um conteúdo estruturado válido. Tente novamente.');}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))fail(502,'Formato do conteúdo OpenAI inválido.');
 return {...result,parsed};
}
