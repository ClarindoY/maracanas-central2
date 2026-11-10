import {unpackOfficial} from './official-zip.mjs';
import {researchTender} from './tender-research.mjs';
import {setProgress} from './progress.mjs';
import {officialFields} from '../shared/official-fields.mjs';
export {officialFields} from '../shared/official-fields.mjs';
import {pncpRequest} from './pncp-network.mjs';
import {createHash} from 'node:crypto';
import {allowed,fail} from './workspace.mjs';
export function pncpIdentity(t){
 let url;try{url=new URL(t.urlPNCP);}catch{fail(400,'Link PNCP inválido.');}
 const m=url.origin==='https://pncp.gov.br'&&!url.username&&!url.password&&url.pathname.match(/^\/app\/editais\/(\d{14})\/(\d{4})\/(\d+)\/?$/);
 if(!m)fail(400,'Esta fonte ainda não tem coleta automática de documentos.');return {cnpj:m[1],year:m[2],sequence:m[3]};
}
export async function boundedFetch(url,json,fetcher=fetch){
 // Destino fixo PNCP; redirecionamentos externos nunca são seguidos.
 return pncpRequest(url,async r=>{if(json&&r.status===204)return [];if(!r.body)throw Error('PNCP retornou resposta vazia.');const chunks=[];let size=0;
 for await(const c of r.body){size+=c.length;if(size>(json?5:20)*1024*1024)throw Error('Arquivo ou resposta excede limite.');chunks.push(c);}
 const bytes=Buffer.concat(chunks);if(json){if(r.status===204)return [];return JSON.parse(bytes.toString());}return bytes;},{fetcher,timeout:35000});
}
export async function collectOfficial(work,user,id,fetcher=fetch,{allowPartial=false}={}){
 setProgress(work,id,{status:'processando',phase:'collecting',label:'Consultando dados oficiais no PNCP',completed:0,total:null,document:null,part:null});
 const t=work.get(id),key=pncpIdentity(t),base=`https://pncp.gov.br/api/pncp/v1/orgaos/${key.cnpj}/compras/${key.year}/${key.sequence}`;
 const d=await boundedFetch(`https://pncp.gov.br/api/consulta/v1/orgaos/${key.cnpj}/compras/${key.year}/${key.sequence}`,true,fetcher);
 if(String(d.orgaoEntidade?.cnpj)!==key.cnpj||String(d.anoCompra)!==key.year||String(d.sequencialCompra)!==key.sequence)throw Error('Identificação oficial não corresponde à ficha.');
 const at=new Date().toISOString(),warnings=[],items=[];
 try{for(let p=1;p<=51;p++){const page=await boundedFetch(base+'/itens?pagina='+p+'&tamanhoPagina=20',true,fetcher);if(!Array.isArray(page))throw Error('Itens inválidos.');if(p===51&&page.length){warnings.push('Mais de 1.000 itens: tabela limitada; confira a fonte.');break;}items.push(...page);if(page.length<20)break;}}catch(e){warnings.push('Itens incompletos: '+e.message);}
 const awards=[];
 if(Number(d.valorTotalHomologado)>0){
  for(const item of items.slice(0,30)){
   if(!Number.isSafeInteger(item.numeroItem))continue;
   try{
    const rows=await boundedFetch(base+'/itens/'+item.numeroItem+'/resultados',true,fetcher);
    for(const r of Array.isArray(rows)?rows:[])awards.push({item:item.numeroItem,quantidade:r.quantidadeHomologada,unitario:r.valorUnitarioHomologado,total:r.valorTotalHomologado,data:r.dataResultado,fornecedor:r.nomeRazaoSocialFornecedor,situacao:r.situacaoCompraItemResultadoNome});
   }catch(e){warnings.push('Resultados por item incompletos: '+e.message);break;}
  }
  if(items.length>30)warnings.push('Resultados individuais consultados para os primeiros 30 itens.');
 }
 const raw=await boundedFetch(base+'/arquivos',true,fetcher),files=Array.isArray(raw)?raw:raw.documentos;if(!Array.isArray(files)||files.length>100)throw Error('Lista de documentos inválida ou maior que 100 arquivos.');
 const docs=[],manifest=[];
 for(const [fileIndex,f] of files.entries()){setProgress(work,id,{status:'processando',phase:'collecting',label:'Baixando documentos oficiais',completed:fileIndex,total:files.length,unit:'arquivos',document:String(f.titulo||'Documento')});const sequence=f.sequencialDocumento;if(!Number.isSafeInteger(sequence)||sequence<1){warnings.push('Documento com identificador inválido.');manifest.push({title:String(f.titulo||'Documento'),status:'Identificador inválido'});continue;}
 const url=base+'/arquivos/'+sequence;const record={sequence,title:String(f.titulo||f.tipoDocumentoNome||'Documento').slice(0,180),type:f.tipoDocumentoNome||'',url,publication:f.dataPublicacaoPncp||null};
 try{const bytes=await boundedFetch(url,false,fetcher);const members=unpackOfficial(bytes,record.title);
 if(!members.length)throw Error('Arquivo ZIP vazio.');
 for(const member of members){
  const part={...record,title:member.title};
  if(member.reason){part.status=member.reason;warnings.push(part.title+': '+part.status);}
  else{
   const hash=createHash('sha256').update(member.bytes).digest('hex');
   let doc=work.docs(id).find(x=>x.hash===hash);
   if(!doc)doc=work.upload(user,id,member.title.replace(/[^\p{L}\p{N} ._-]/gu,'_').replace(/\.pdf$/i,'').slice(0,140)+'.pdf',member.bytes);
   Object.assign(part,{documentId:doc.id,hash,status:'PDF salvo'});
   if(!docs.includes(doc.id))docs.push(doc.id);
  }
  manifest.push(part);
 }
 }catch(e){record.status='Falhou: '+e.message;warnings.push(record.title+': '+e.message);manifest.push(record);}
 }
 setProgress(work,id,{completed:files.length,total:files.length});
 const knownSecret=items.length&&items.every(i=>typeof i.orcamentoSigiloso==='boolean');const itemSecrecy=knownSecret?(items.some(i=>i.orcamentoSigiloso)?'Há item sigiloso':'Sem item sigiloso publicado'):null;
 const collection={awards,itemSecrecy,consultedAt:at,fields:officialFields(d,items,at),manifest,warnings,itemsComplete:!warnings.some(w=>w.includes('itens')||w.includes('Itens')),documentIds:docs};
 saveInternal(work,user,id,{oficial:d,officialCollection:collection},'Documentos oficiais coletados',{files:manifest,warnings});
 if(!docs.length&&!allowPartial)throw Error('Nenhum PDF oficial pôde ser obtido. Veja as pendências da coleta.');
 if(docs.length>12)throw Error('Mais de 12 PDFs oficiais: análise automática bloqueada para não omitir documentos.');return collection;
}
export function saveInternal(work,user,id,changes,action,details={}){
 work.transaction(()=>{const row=work.get(id);const {version,creatorId,creatorName,createdAt,updatedAt,...saved}=row;work.db.prepare('UPDATE tenders SET data=?,version=version+1,updated=? WHERE id=?').run(JSON.stringify({...saved,...changes}),new Date().toISOString(),id);work.event(user,action,id,details);});
}
export function createOfficialQueue(work,summarize){
 work.db.exec(`CREATE TABLE IF NOT EXISTS official_jobs(tender_id TEXT PRIMARY KEY,status TEXT NOT NULL,actor TEXT NOT NULL,updated TEXT NOT NULL,error TEXT NOT NULL); UPDATE official_jobs SET status='interrompida',error='Servidor reiniciado; solicite novamente.' WHERE status IN ('fila','processando');`);
 const queue=[];let running=false;
 const status=id=>work.db.prepare('SELECT * FROM official_jobs WHERE tender_id=?').get(id)||null;
 async function drain(){if(running)return;running=true;try{while(queue.length){const {id,user}=queue.shift();work.db.prepare("UPDATE official_jobs SET status='processando',updated=? WHERE tender_id=?").run(new Date().toISOString(),id);try{const account=work.db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(user.id);if(!account)throw Error('Colaborador inativo.');user.admin=!!account.admin;user.permissoes=JSON.parse(account.permissions);if(!allowed(user,'Analisar editais')||!allowed(user,'Acessar documentos'))throw Error('Permissões revogadas antes do processamento.');const c=await collectOfficial(work,user,id,fetch,{allowPartial:true});if(!process.env.OPENAI_API_KEY?.trim())throw Error('Dados e PDFs salvos. Configure OPENAI_API_KEY para gerar a análise pela OpenAI.');if(c.documentIds.length){
  await summarize(user,id,c.documentIds);
 }else{
  const month=new Date().toISOString().slice(0,7)+'%';
  const count=work.db.prepare("SELECT COUNT(*) n FROM activity WHERE action='Análise IA iniciada' AND time LIKE ?").get(month).n;
  if(count>=Number(process.env.AI_MONTHLY_LIMIT||100))throw Error('Limite mensal de análises atingido.');
  work.event(user,'Análise IA iniciada',id,{provider:'OpenAI',scope:'Pesquisa pública sem PDF disponível'});
 }
 setProgress(work,id,{status:'processando',phase:'research',label:'Pesquisando publicações oficiais e confrontando as fontes'});
 const row=work.get(id);const research=await researchTender(c.documentIds.length?row:{...row,summary:null});research.summaryAt=row.summary?.generatedAt;research.partial=!c.documentIds.length||row.summary?.partial||!c.itemsComplete||c.warnings.length>0;
 if(work.get(id).summary?.generatedAt!==research.summaryAt)throw Error('A extração mudou durante a pesquisa. Pesquise novamente.');
 saveInternal(work,user,id,{research},'Pesquisa do edital concluída',{model:research.model,webModel:research.searchModel});setProgress(work,id,{status:'concluída',phase:'done',label:'Pesquisa e parecer disponíveis'});work.db.prepare("UPDATE official_jobs SET status='concluída',error='',updated=? WHERE tender_id=?").run(new Date().toISOString(),id);}catch(e){setProgress(work,id,{status:'falhou'});work.db.prepare("UPDATE official_jobs SET status='falhou',error=?,updated=? WHERE tender_id=?").run(e.message,new Date().toISOString(),id);work.event(user,'Análise oficial falhou',id,{error:e.message});}}}finally{running=false;}}
 return {status,start(user,id){if(!allowed(user,'Analisar editais')||!allowed(user,'Acessar documentos'))fail(403,'Coleta e análise exigem permissões de análise e documentos.');pncpIdentity(work.get(id));const existing=status(id);if(existing&&['fila','processando'].includes(existing.status))return existing;if(queue.length>=20)fail(429,'Fila cheia; tente mais tarde.');work.db.prepare('INSERT OR REPLACE INTO official_jobs VALUES(?,?,?,?,?)').run(id,'fila',user.id,new Date().toISOString(),'');work.event(user,'Análise oficial solicitada',id);setProgress(work,id,{status:'fila',phase:'queued',label:'Na fila de processamento',completed:0,total:null,document:null,part:null},{reset:true});queue.push({id,user});setImmediate(drain);return status(id);}};
}
