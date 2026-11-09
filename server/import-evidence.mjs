import {remoteURL,fetchPNCP} from './pncp.mjs';
export async function publicIdentity(pages,fetcher=fetchPNCP){
 const hits=new Map();
 for(const {text} of pages){for(const m of text.matchAll(/\b(\d{14})-1-(\d{1,8})\/(20\d{2})\b/g))hits.set(m[1]+'/'+m[3]+'/'+Number(m[2]),true);
 for(const m of text.matchAll(/https?:\/\/pncp\.gov\.br\/app\/editais\/(\d{14})\/(20\d{2})\/(\d+)\b/gi))hits.set(m[1]+'/'+m[2]+'/'+Number(m[3]),true);}
 if(hits.size!==1)return null;const [cnpj,year,n]=[...hits.keys()][0].split('/');try{const d=await fetcher(remoteURL('/api/consulta/v1/orgaos/'+cnpj+'/compras/'+year+'/'+n));
 if(String(d.orgaoEntidade?.cnpj)!==cnpj||String(d.anoCompra)!==year||Number(d.sequencialCompra)!==Number(n))return null;
 return {oficial:d,urlPNCP:'https://pncp.gov.br/app/editais/'+cnpj+'/'+year+'/'+n,orgao:d.orgaoEntidade.razaoSocial||'',titulo:d.objetoCompra||'',modalidade:d.modalidadeNome||''};}catch{return null;}
}
export function supportedGlobal(value,evidence){
 if(!value)return true;const txt=value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 const re=/(?:valor (?:total )?global|valor total (?:do edital|da contratacao|estimado da contratacao))\s*[:=–-]?\s*(?:de\s+)?r\$\s*([\d.]+,\d{2})/g;
 for(const m of txt.matchAll(re)){if(!evidence.some(e=>{const q=e.quote.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();return /global|total (?:geral|da contratacao|do edital)/.test(q)&&q.includes(m[1]);}))return false;}
 return true;
}
