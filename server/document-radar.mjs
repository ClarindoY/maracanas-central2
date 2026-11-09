import {buildProfile,lookupTerm,compare} from './document-match.mjs';
import {allowed,fail} from './workspace.mjs';
import {remoteURL,fetchPNCP} from './pncp.mjs';
import {readPDFs} from './pdf-reading.mjs';
export function documentRadar({library,work,remote=fetchPNCP}){
 const db=work.db;db.exec('CREATE TABLE IF NOT EXISTS radar_pages(query TEXT NOT NULL,page INTEGER NOT NULL,at TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(query,page))');
 let active=0;
 return async (user,{companyId,term='',page=1,action='profile',tenderId})=>{
 if(!allowed(user,'Buscar editais'))fail(403,'Sem permissão para buscar editais.');
 const p=buildProfile(library.matchDocuments(user,companyId));
 const info={terms:p.terms,certificates:p.cert.length,balances:p.balances.length,unread:p.unread};
 if(action==='profile')return info;
 if(active>=3)fail(429,'Há consultas em andamento. Tente novamente em instantes.');
 active++;try{
 if(action==='detail'){
 const t=work.get(tenderId);if(t.fonte!=='PNCP')fail(400,'Esta conferência exige um edital do PNCP.');
 const ids=new Set(t.officialCollection?.documentIds||[]);const all=work.docs(t.id).filter(d=>ids.has(d.id));let clauses=String(t.oficial?.informacaoComplementar||''),read=0,partial=false;
 if(all.length){if(!allowed(user,'Analisar editais'))fail(403,'Sem permissão para analisar os anexos.');
 const parsed=await readPDFs(work.dir,all.slice(0,12),{maxOCRPages:0});clauses+='\n'+parsed.pages.map(x=>x.name+' [Página '+x.page+'] '+x.text).join('\n');read=parsed.pages.length;partial=Boolean(parsed.report.pendingPages||all.length>12||t.officialCollection?.warnings?.length);}
 return {...info,...compare(p,t.oficial?.objetoCompra||t.titulo,clauses,lookupTerm(p,t.palavraBusca)?t.palavraBusca:''),read,partial};
 }
 if(action!=='search'||!Number.isSafeInteger(page)||page<1||page>10000||!lookupTerm(p,term))fail(400,'Escolha um serviço identificado no texto de um atestado da empresa.');
 const k=term.trim().toLocaleLowerCase('pt-BR');let result,cached=false,at=new Date().toISOString();try{result=await remote(remoteURL('/api/search/?q='+encodeURIComponent(term)+'&pagina='+page));}catch{const previous=db.prepare('SELECT at,data FROM radar_pages WHERE query=? AND page=?').get(k,page);if(!previous||Date.now()-Date.parse(previous.at)>86400000)fail(502,'O PNCP não respondeu. Tente novamente; os editais do funil foram preservados.');result=JSON.parse(previous.data);at=previous.at;cached=true;}
 if(!Array.isArray(result?.items))fail(502,'O PNCP retornou uma resposta inesperada.');
 if(!cached){db.prepare('INSERT OR REPLACE INTO radar_pages VALUES(?,?,?,?)').run(k,page,at,JSON.stringify(result));db.exec('DELETE FROM radar_pages WHERE rowid NOT IN (SELECT rowid FROM radar_pages ORDER BY at DESC LIMIT 100)');}
 const seen=new Set(),items=[];for(const x of result.items){const key=x.orgao_cnpj+'/'+x.ano+'/'+x.numero_sequencial;if(!/^\d{14}\/\d{4}\/\d+$/.test(key)||seen.has(key))continue;seen.add(key);
 const end=x.data_encerramento_proposta||x.data_fim_recebimento_propostas;if(end){const ms=Date.parse(/(?:Z|[+-]\d\d:\d\d)$/i.test(end)?end:end+'-03:00');if(ms<=Date.now())continue;}
 const match=compare(p,x.description||'',x.informacao_complementar||'',term);if(!match.evidence.length)continue;
 items.push({orgao_cnpj:x.orgao_cnpj,ano:x.ano,numero_sequencial:x.numero_sequencial,searchTerm:term,title:x.title,description:x.description,orgao:x.orgao_nome,url:'https://pncp.gov.br/app/editais/'+key,...match});}
 const rank=s=>s.startsWith('Índices')?2:s.startsWith('Índice abaixo')?0:1;
 items.sort((a,b)=>rank(b.financialStatus)-rank(a.financialStatus)||new Set(b.evidence.map(e=>e.term)).size-new Set(a.evidence.map(e=>e.term)).size);
 return {...info,page,total:Number(result.total)||0,items,checked:result.items.length,at,cached};
 }finally{active--;}
 };
}
