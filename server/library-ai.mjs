// Biblioteca Documental: análise orientada a evidências. Nunca concede habilitação legal.
import {fail} from './workspace.mjs';
import {generateStructured} from './openai-analysis.mjs';

const FINANCIAL_FIELDS = Object.freeze(['ativo_circulante','passivo_circulante','realizavel_longo_prazo','exigivel_longo_prazo','ativo_total','patrimonio_liquido','exercicio']);
export const FINANCIAL_LABELS={ativo_circulante:'Ativo circulante',passivo_circulante:'Passivo circulante',realizavel_longo_prazo:'Realizável a longo prazo',exigivel_longo_prazo:'Exigível a longo prazo',ativo_total:'Ativo total',patrimonio_liquido:'Patrimônio líquido',exercicio:'Exercício'};
const EVIDENCE_SCHEMA={type:'object',additionalProperties:false,required:['key','value','page','quote','notes'],properties:{key:{type:'string'},value:{type:'string'},page:{type:'integer'},quote:{type:'string'},notes:{type:'string'}}};
const ANALYSIS_SCHEMA={type:'object',additionalProperties:false,required:['documentType','summary','issuer','subject','period','items','warnings'],properties:{documentType:{type:'string'},summary:{type:'string'},issuer:{type:'string'},subject:{type:'string'},period:{type:'string'},items:{type:'array',items:EVIDENCE_SCHEMA},warnings:{type:'array',items:{type:'string'}}}};
const COMPARISON_SCHEMA={type:'object',additionalProperties:false,required:['overview','requirements','warnings'],properties:{overview:{type:'string'},requirements:{type:'array',items:{type:'object',additionalProperties:false,required:['requirement','status','rationale','evidence'],properties:{requirement:{type:'string'},status:{type:'string',enum:['Evidência localizada','Revisão necessária','Não comprovado']},rationale:{type:'string'},evidence:{type:'array',items:{type:'object',additionalProperties:false,required:['documentId','page','quote'],properties:{documentId:{type:'string'},page:{type:'integer'},quote:{type:'string'}}}}}}},warnings:{type:'array',items:{type:'string'}}}};

export function normalizeEvidence(s){return String(s??'').normalize('NFKC').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();}
export function splitIndexedPages(text){const rows=[];for(const chunk of String(text||'').split(/(?=\[Página \d+\])/)){const m=chunk.match(/^\[Página (\d+)\]\s*/);if(m)rows.push({page:Number(m[1]),text:chunk.slice(m[0].length)});}return rows;}
function truncate(str,max){return String(str||'').slice(0,max);}
export function verifyEvidence(items,pages,{maxItems=75}={}){
 const map=new Map(pages.map(p=>[p.page,normalizeEvidence(p.text)]));
 return (Array.isArray(items)?items:[]).slice(0,maxItems).map(item=>{
  const page=Number(item.page), quote=truncate(item.quote,500), value=truncate(item.value,300);
  const found=Number.isInteger(page)&&map.has(page)&&normalizeEvidence(quote).length>=8&&map.get(page).includes(normalizeEvidence(quote));
  return {key:truncate(item.key,100),value,page:Number.isInteger(page)?page:null,quote,notes:truncate(item.notes,500),evidenceVerified:found};
 });
}

// Converte somente valores monetários sem unidades multiplicativas ambíguas.
// Ex: 1.234.567,89 | 1234567.89 | 1 234 567,89. Para 'milhares' exige revisão humana.
export function parseMoney(value){
 if(typeof value==='number')return Number.isFinite(value)&&value>=0?value:null;
 let str=String(value||'').replace(/R\$|BRL/gi,'').trim();
 if(!str||!/^[-+]?\s*[\d.,\s]+$/.test(str))return null;
 str=str.replace(/\s/g,'');if(str[0]==='-'||str[0]==='+')return null;
 if(str.includes(',')&&str.includes('.')){
  if(str.lastIndexOf(',')>str.lastIndexOf('.'))str=str.replace(/\./g,'').replace(',','.');
  else str=str.replace(/,/g,'');
 }else if(str.includes(',')){
  if(str.split(',').length>2)str=str.replace(/,/g,'');
  else str=/,\d{1,2}$/.test(str)?str.replace(',','.'):str.replace(/,/g,'');
 }else if((str.match(/\./g)||[]).length>1)str=str.replace(/\./g,'');
 else if(/^\d{1,3}\.\d{3}$/.test(str))str=str.replace('.','');
 if(!/^\d+(\.\d+)?$/.test(str))return null;const n=Number(str);return Number.isFinite(n)&&n>=0&&n<=1e15?n:null;
}
// Uma citação pode ser verdadeira, mas o número do item ter sido fabricado.
// Só números efetivamente encontrados na citação poderão gerar índices.
export function amountIsQuoted(value,quote){
 const expected=parseMoney(value);if(expected===null)return false;
 const candidates=String(quote||'').match(/\d[\d.,\s]{0,25}\d|\d/g)||[];
 return candidates.some(raw=>{const n=parseMoney(raw);return n!==null&&Math.abs(n-expected)<0.005;});
}
function financialRecord(items,key){const candidate=items.find(i=>i.key===key&&i.evidenceVerified&&amountIsQuoted(i.value,i.quote)&&!/milhar|milhõ|milh[aã]o/i.test(i.notes));return candidate?{value:parseMoney(candidate.value),source:{page:candidate.page,quote:candidate.quote}}:null;}
export function financialRatios(items,warnings=[]){
 const f=Object.fromEntries(FINANCIAL_FIELDS.map(k=>[k,financialRecord(items,k)]));
 const uncertainUnit=warnings.some(w=>/milhar|milhõ|milh[aã]o|unidade monetária|escala/i.test(w));
 const p=k=>f[k]?.value??null;
 const ratio=(numerator,denominator,fields)=>({value:denominator!=null&&denominator>0&&numerator!=null?Math.round(numerator/denominator*10000)/10000:null,fields,requiresHumanReview:true});
 const lc=ratio(!uncertainUnit?p('ativo_circulante'):null,p('passivo_circulante'),['ativo_circulante','passivo_circulante']);
 const lg=ratio(!uncertainUnit&&p('ativo_circulante')!=null&&p('realizavel_longo_prazo')!=null?p('ativo_circulante')+p('realizavel_longo_prazo'):null,p('passivo_circulante')!=null&&p('exigivel_longo_prazo')!=null?p('passivo_circulante')+p('exigivel_longo_prazo'):null,['ativo_circulante','realizavel_longo_prazo','passivo_circulante','exigivel_longo_prazo']);
 const sg=ratio(uncertainUnit?null:p('ativo_total'),p('passivo_circulante')!=null&&p('exigivel_longo_prazo')!=null?p('passivo_circulante')+p('exigivel_longo_prazo'):null,['ativo_total','passivo_circulante','exigivel_longo_prazo']);
 return {values:f,ratios:{liquidez_corrente:lc,liquidez_geral:lg,solvencia_geral:sg},notice:'Índices preliminares. Confira unidade monetária, período, consolidação e páginas antes de utilizá-los na habilitação.'};
}

export async function analyzeIndexedDocument(row,index,{generator=generateStructured}={}){
 if(!index||!String(index.text_content||'').trim())fail(409,'O PDF não possui texto indexado. Execute a leitura/OCR primeiro.');
 const all=splitIndexedPages(index.text_content);
 const pages=all.map(p=>({page:p.page,text:p.text.slice(0,7000)}));
 let budget=65000,usable=[];
 for(const p of pages){if(budget<=0)break;const text=p.text.slice(0,budget);usable.push({page:p.page,text});budget-=text.length;}
 if(!usable.length)fail(409,'Não há páginas legíveis para análise.');
 const mode=row.category==='Balanços'?'balanco':row.category==='Atestados'?'atestado':'geral';
 const instructions=`Você extrai campos de PDFs empresariais em português. Responda SOMENTE com evidências LITERAIS presentes nas páginas fornecidas. Nunca presuma fatos, capacidades, valores ou validades. Em cada item, quote deve ser trecho EXATO copiado de UMA página identificada e page precisa ser o número dessa página. Não use fatos de outros documentos. Campos não encontrados ficam ausentes. Atestados: procure objeto, contratante, prestador, execução, período, volumes, quantitativos e comprovações. Balanços: use SOMENTE as chaves: ${FINANCIAL_FIELDS.join(', ')} para itens contábeis e associe exercício; valores precisam corresponder literalmente à página citada; identifique quando unidades estiverem em milhares, balanços consolidados ou página com OCR duvidoso. Qualquer incerteza vai em warnings. Não declare habilitação ou validade jurídica.`;
 const input={mode,document:{name:row.name,category:row.category,companyId:row.company_id},reading:{indexStatus:index.status,pendingPages:index.pending_pages,reportedPages:index.pages,submittedPages:usable.length,totalIndexedPages:all.length},pages:usable};
 const r=await generator({instructions,input,schema:ANALYSIS_SCHEMA});
 const raw=r.parsed||{};
 const items=verifyEvidence(raw.items||[],usable);
 const warnings=(Array.isArray(raw.warnings)?raw.warnings:[]).slice(0,35).map(x=>truncate(x,450));
 if(usable.length<all.length)warnings.push('Somente parte do texto foi submetida à IA por limite de caracteres.');
 if(index.status!=='indexado'||index.pending_pages)warnings.push('Leitura incompleta: existem páginas pendentes, digitalizadas ou de baixa confiança.');
 if(items.some(i=>!i.evidenceVerified))warnings.push('Algumas citações geradas pela IA não foram localizadas literalmente nas páginas; elas NÃO são consideradas comprovadas.');
 return {mode,documentType:truncate(raw.documentType,100),summary:truncate(raw.summary,4000),issuer:truncate(raw.issuer,300),subject:truncate(raw.subject,500),period:truncate(raw.period,150),items,warnings,reading:{status:index.status,pages:index.pages,pendingPages:index.pending_pages,submittedPages:usable.length,indexedPages:all.length},financial:mode==='balanco'?financialRatios(items,warnings):null,model:r.model,usage:r.usage||{},generatedAt:new Date().toISOString(),humanApproved:false};
}

export async function compareEvidence({companyId,requirements,tenderId=null,documents,generator=generateStructured}){
 const reqText=String(requirements||'').trim();if(reqText.length<15||reqText.length>12000)fail(400,'Informe requisitos de habilitação entre 15 e 12.000 caracteres.');
 if(!documents.length)fail(409,'Não existem análises documentais nesta empresa.');
 const selected=documents.slice(0,60).map(d=>({documentId:d.id,name:d.name,category:d.category,status:d.status,expiresAt:d.expires_at||null,analysisStatus:d.analysisStatus,summary:String(d.analysis?.summary||'').slice(0,1200),warnings:d.analysis?.warnings||[],readingIncomplete:!!(d.analysis?.reading?.pendingPages||d.analysis?.reading?.status!=='indexado'),evidence:(d.analysis?.items||[]).filter(i=>i.evidenceVerified).slice(0,30).map(i=>({key:i.key,value:i.value,page:i.page,quote:i.quote}))}));
 const r=await generator({instructions:'Compare requisitos de habilitação de uma licitação com evidências documentais fornecidas. NUNCA declare uma empresa habilitada. Status permitido: Evidência localizada, Revisão necessária, Não comprovado. Nunca presuma. Cite APENAS documentoId, página e trecho idênticos à lista fornecida. Documento vencido, rejeitado, não validado ou análise pendente exige revisão humana. A ausência de evidência não significa que o requisito legal seja inaplicável. Limite a 35 requisitos.',input:{companyId,tenderId,requirements:reqText,documents:selected},schema:COMPARISON_SCHEMA});
 const validEvidence=new Map(selected.flatMap(d=>d.evidence.map(e=>[`${d.documentId}:${e.page}:${normalizeEvidence(e.quote)}`,d])));
 const rows=(r.parsed?.requirements||[]).slice(0,35).map(item=>{
  const evidences=(Array.isArray(item.evidence)?item.evidence:[]).slice(0,12).map(e=>({documentId:String(e.documentId||''),page:Number(e.page),quote:String(e.quote||'')})).filter(e=>validEvidence.has(`${e.documentId}:${e.page}:${normalizeEvidence(e.quote)}`));
  const needsReview=evidences.some(e=>{const d=validEvidence.get(`${e.documentId}:${e.page}:${normalizeEvidence(e.quote)}`);return d.status!=='Validado'||d.analysisStatus!=='Revisado'||d.readingIncomplete||(d.expiresAt&&d.expiresAt<new Date().toISOString().slice(0,10));});
  return {requirement:truncate(item.requirement,1500),status:!evidences.length?'Não comprovado':needsReview?'Revisão necessária':item.status==='Não comprovado'?'Revisão necessária':item.status,rationale:truncate(item.rationale,1500),evidence:evidences};
 });
 return {companyId,tenderId,requirements:reqText,overview:truncate(r.parsed?.overview,3000),items:rows,warnings:(r.parsed?.warnings||[]).slice(0,25).map(w=>truncate(w,400)),createdAt:new Date().toISOString(),model:r.model,reviewStatus:'Pendente de conferência humana',legalConclusion:null};
}
