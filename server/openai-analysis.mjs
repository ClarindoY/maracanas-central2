import {setTimeout as pause} from 'node:timers/promises';
import {fail} from './workspace.mjs';

// Motor de análise dos EDITAIS. Outros módulos que usam o Gemini
// permanecem inalterados nesta versão de migração gradual.
export function openaiConfig(env=process.env){
 const key=env.OPENAI_API_KEY?.trim();
 if(!key)fail(503,'Configure OPENAI_API_KEY no servidor para habilitar a análise de editais.');
 const model=(env.OPENAI_MODEL||'gpt-4.1-mini').trim();
 if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,100}$/.test(model))fail(400,'OPENAI_MODEL inválido. Informe apenas o identificador do modelo.');
 return {key,model};
}
export async function generateStructured({instructions,input,schema,onWaiting=()=>{}},fetcher=fetch,{sleep=pause,maxRetries=2}={}){
 const {key,model}=openaiConfig();
 for(let attempt=0;attempt<=maxRetries;attempt++){
  let response;
  try{
   response=await fetcher('https://api.openai.com/v1/responses',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(120000),
    headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({model,store:false,instructions,input:JSON.stringify(input),
     max_output_tokens:12000,text:{format:{type:'json_schema',name:'edital_fields',strict:true,schema}}})
   });
  }catch{fail(502,'Não foi possível conectar à OpenAI ou o tempo de resposta foi excedido. Dados anteriores preservados.');}
  let data;try{data=await response.json();}catch{fail(502,'A OpenAI retornou resposta inválida. Dados anteriores preservados.');}
  if(!response.ok){
   if((response.status===429||response.status>=500)&&attempt<maxRetries){onWaiting('OpenAI temporariamente indisponível ou limitada: tentando novamente');await sleep(1500*(attempt+1));continue;}
   if(response.status===401||response.status===403)fail(502,'Chave ou permissões da OpenAI inválidas. Confira OPENAI_API_KEY no servidor.');
   if(response.status===429)fail(429,'Limite de solicitações ou créditos da API OpenAI indisponíveis. Consulte o painel de uso e faturamento.');
   fail(502,'Erro da API OpenAI (HTTP '+response.status+'): '+String(data.error?.message||'Confira modelo e configuração.').slice(0,220));
  }
  if(data.status&&data.status!=='completed')fail(502,'A OpenAI não concluiu a análise. Status: '+data.status);
  const parts=(data.output||[]).flatMap(x=>x.type==='message'?(x.content||[]):[]);
  if(parts.some(x=>x.type==='refusal'))fail(502,'A OpenAI recusou a análise solicitada.');
  const raw=parts.filter(x=>x.type==='output_text').map(x=>x.text||'').join('')||data.output_text||'';
  let parsed;try{parsed=JSON.parse(raw);}catch{fail(502,'A OpenAI não retornou JSON válido. Análise anterior preservada.');}
  if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')fail(502,'Formato de resposta inesperado.');
  return {parsed,model,usage:{input_tokens:data.usage?.input_tokens||0,output_tokens:data.usage?.output_tokens||0,total_tokens:data.usage?.total_tokens||0}};
 }
}
