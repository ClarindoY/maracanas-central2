import {SUMMARY_BLOCKS,EXTERNAL_FIELDS} from '../shared/summary-catalog.mjs';
import {readPDFs} from './pdf-reading.mjs';
import {splitPages} from './summary-parts.mjs';
import {validateSummary} from './summary.mjs';
import {generateStructured,openaiConfig} from './openai-analysis.mjs';
import {allowed,fail} from './workspace.mjs';
import {applyDocumentCoverage} from './summary-coverage.mjs';

const normal=s=>String(s||'').normalize('NFKC').toLocaleLowerCase('pt-BR');
const STOP=new Set(['de','da','do','das','dos','e','em','para','que','com','por','ou','quando','qual','quais','uma','um','na','no','nos','nas','se','ao','à','as','os','sobre','exigidos','edital','documentos','informação']);
export function pendingFields(summary){
 if(!summary||summary.formatVersion!==20)fail(409,'Gere o resumo completo de oito seções antes da busca complementar.');
 return SUMMARY_BLOCKS.flatMap(b=>b.fields.filter(f=>!EXTERNAL_FIELDS.has(f.id)&&!summary.fields?.find(x=>x.label===f.id)?.value).map(f=>({...f,block:b.title})));
}
export function focusedPages(pages,label,max=18){
 const terms=[...new Set(normal(label).replace(/[^\p{L}\p{N} ]/gu,' ').split(/\s+/).filter(t=>t.length>3&&!STOP.has(t)))];
 const scored=pages.map(p=>({p,score:terms.reduce((n,t)=>n+(normal(p.text).includes(t)?1:0),0)})).sort((a,b)=>b.score-a.score);
 // Search broad context if no term matches; absence is NOT proof of no requirement.
 return scored.filter(x=>x.score>0).slice(0,max).map(x=>x.p);
}
export async function recoverPending(work,user,id,{documentIds,fieldIds}={},fetcher=fetch,readingOptions={}){
 if(!allowed(user,'Analisar editais')||!allowed(user,'Acessar documentos'))fail(403,'Sem permissão para analisar documentos.');
 const initial=work.get(id),summary=initial.summary,allPending=pendingFields(summary);
 const requested=fieldIds===undefined?allPending:allPending.filter(f=>Array.isArray(fieldIds)&&fieldIds.includes(f.id));
 if(fieldIds!==undefined&&(!Array.isArray(fieldIds)||fieldIds.length>100||fieldIds.some(x=>!allPending.some(f=>f.id===x))))fail(400,'Só é permitido pesquisar campos pendentes.');
 if(!requested.length)return {detail:work.detail(user,id),searched:0,updated:0,message:'Não há campos pendentes elegíveis.'};
 const docs=work.docs(id);const ids=documentIds||summary.documents?.map(x=>x.id);
 if(!Array.isArray(ids)||!ids.length||ids.length>12||new Set(ids).size!==ids.length)fail(400,'Selecione de 1 a 12 documentos da licitação.');
 const selected=ids.map(k=>{const d=docs.find(x=>x.id===k);if(!d)fail(400,'Documento selecionado não está disponível nesta licitação.');return d;});
 openaiConfig();
 const {pages,report:reading}=await readPDFs(work.dir,selected,readingOptions);
 const report=applyDocumentCoverage(reading,initial,docs,ids);
 if(!pages.length)fail(422,'Nenhuma página legível. As respostas anteriores foram preservadas.');
 const responses=[];let calls=0,usage={};
 for(const block of SUMMARY_BLOCKS){
  const missing=requested.filter(f=>f.block===block.title);if(!missing.length)continue;
  for(const f of missing){
   const nearby=focusedPages(pages,f.label);const chunks=splitPages(nearby.length?nearby:pages.slice(0,6),28000);
   let found=null;
   for(const part of chunks.slice(0,3)){
    const schema={type:'object',additionalProperties:false,required:['fields'],properties:{fields:{type:'array',items:{type:'object',additionalProperties:false,required:['label','value','evidence'],properties:{label:{type:'string',enum:[f.id]},value:{type:['string','null']},evidence:{type:'array',items:{type:'object',additionalProperties:false,required:['documentId','page','quote'],properties:{documentId:{type:'string'},page:{type:'integer'},quote:{type:'string'}}}}}}}}};
    const out=await generateStructured({instructions:'Busca complementar seletiva em edital e anexos. Responda apenas ao campo solicitado. Não modifique outros campos. Use somente trechos literais do material fornecido; cite ID do documento, número da página e citação textual real. Se não encontrar, retorne null e evidence vazio. Não invente números, cláusulas, critérios ou documentos. Verifique tabelas e exceções, se presentes.',input:{field:f,documents:part,coverageComplete:report.coverageComplete},schema},fetcher);
    calls++;for(const [k,v] of Object.entries(out.usage||{}))if(typeof v==='number')usage[k]=(usage[k]||0)+v;
    const valid=validateSummary(out.parsed,part).fields.find(x=>x.label===f.id);
    if(valid?.value){found=valid;break;}
   }
   responses.push({id:f.id,answer:found});
  }
 }
 const now=new Date().toISOString();let updated=0;
 work.transaction(()=>{
  const current=work.get(id);if(current.version!==initial.version)fail(409,'A ficha mudou durante a pesquisa. Nenhuma resposta foi substituída: atualize a tela e tente novamente.');
  const next=structuredClone(current.summary);const history=Array.isArray(next.recoveryHistory)?next.recoveryHistory:[];
  for(const result of responses){const field=next.fields.find(x=>x.label===result.id);if(!field||field.value)continue;
   if(result.answer?.value){Object.assign(field,result.answer);updated++;}else field.note='Não localizado após busca complementar direcionada; confira as páginas originais e documentos ausentes.';
  }
  next.recoveryHistory=[...history,{at:now,by:user.nome,requested:requested.map(x=>x.id),updated,calls,documents:selected.map(x=>({id:x.id,hash:x.hash})),coverageComplete:report.coverageComplete}].slice(-50);
  const {version,creatorId,creatorName,createdAt,updatedAt,...saved}=current;
  work.db.prepare('UPDATE tenders SET data=?,version=version+1,updated=? WHERE id=?').run(JSON.stringify({...saved,summary:next}),now,id);
  work.event(user,'Busca complementar de campos pendentes',id,{searched:requested.length,updated,calls,usage});
 });
 return {detail:work.detail(user,id),searched:requested.length,updated,calls};
}


// Accept only expected unique fields; a missing category is not evidence of absence.
export function reconcileBlockFields(expected,fields){
 const accepted=[];const seen=new Set();
 if(!Array.isArray(fields))return {accepted,missing:[...expected]};
 for(const f of fields){
  if(!f||!expected.includes(f.label)||seen.has(f.label)||!(f.value===null||typeof f.value==='string')||!Array.isArray(f.evidence))continue;
  if(f.evidence.some(e=>!e||typeof e.documentId!=='string'||!Number.isInteger(e.page)||e.page<1||typeof e.quote!=='string'))continue;
  seen.add(f.label);accepted.push({label:f.label,value:f.value,evidence:f.evidence});
 }
 return {accepted,missing:expected.filter(label=>!seen.has(label))};
}
