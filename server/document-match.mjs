const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const catalog=[
 ['hospedagem','hospedagem','hotelaria','hoteleiro','diárias em hotel'],['passagens aéreas','passagens aéreas','bilhetes aéreos','bilhetes de passagem aérea'],['agenciamento de viagens','agenciamento de viagens','agência de viagens','agenciamento de passagens'],['eventos','eventos','organização de eventos','produção de eventos'],['transporte de passageiros','transporte de passageiros','transporte rodoviário de pessoas','fretamento'],['locação de veículos','locação de veículos','aluguel de veículos'],['alimentação','alimentação','refeições','buffet','coffee break'],['sonorização','sonorização','equipamentos de som'],['montagem de estruturas','montagem de estruturas','montagem de estandes'],['limpeza','limpeza','higienização'],['engenharia','engenharia'],['software','software','desenvolvimento de sistemas'],['manutenção predial','manutenção predial']
];
function excerpt(text,pos){const page=[...text.slice(0,pos+1).matchAll(/\[Página (\d+)\]/g)].pop()?.[1];return (page?'Pág. '+page+' · ':'')+text.slice(Math.max(0,pos-48),pos+140).replace(/\s+/g,' ').trim();}
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const where=(text,term)=>{const match=new RegExp('(?:^|[^a-z0-9])('+esc(fold(term))+')(?=$|[^a-z0-9])').exec(fold(term)==='hospedagem'?fold(text).replace(/\bhospedagem\s+(?:(?:em|de|do|da)\s+)?(?:sistemas?|sites?|dados|software|plataformas?|nuvem|aplicacoes|servidores?\s+(?:virtuais|dedicados))\b/g,m=>' '.repeat(m.length)):fold(text));return match?match.index+match[0].length-match[1].length:-1;};
const ratios=[['Liquidez corrente','liquidez corrente|lc'],['Liquidez geral','liquidez geral|lg'],['Solvência geral','solvencia geral|sg']];
const op='(superior ou igual a|maior ou igual a|igual ou superior a|no mínimo de|mínimo de|superior a|maior que|>=|≥|>)';
function indices(text,requirement){
 let out=[];for(const [name,pattern] of ratios){const expr='\\b(?:'+pattern+')\\b(?:\\s*\\((?:lc|lg|sg)\\))?\\s*[:=–-]?\\s*'+(requirement?fold(op)+'\\s*':'')+'(\\d{1,3}(?:[,.]\\d{1,5})?)(?![\\d]|[,.]\\d|\\s*%)';
 for(const m of fold(text).matchAll(new RegExp(expr,'g'))){const value=Number(m[requirement?2:1].replace(',','.'));out.push({name,value,strict:requirement&&['superior a','maior que','>'].includes(m[1]),quote:excerpt(text,m.index)});if(out.length>=24)return out;}}
 return out;
}
export function buildProfile(rows){
 const docs=rows.filter(d=>d.status!=='Rejeitado'&&d.text_content?.trim()&&d.indexing_status!=='erro');
 const cert=docs.filter(d=>d.category==='Atestados');const balances=docs.filter(d=>d.category==='Balanços');
 const terms=catalog.filter(group=>cert.some(d=>group.slice(1).some(t=>where(d.text_content,t)>=0))).map(g=>g[0]);
 // Use bounded service phrases as suggestions for activities outside the catalog.
 for(const d of cert){for(const m of d.text_content.matchAll(/(?:serviços? de|fornecimento de|execução de|locação de)\s+([\p{L}][\p{L} -]{3,68})/giu)){const phrase=m[1].split(/[,.;:\n]|\s+(?:para|conforme|pelo|pela|prestados|realizados|com|junto)\s+/i)[0].trim();if(phrase.length>=4&&phrase.split(/\s+/).length<=5&&!terms.some(t=>fold(t)===fold(phrase))&&terms.length<24)terms.push(phrase);}}
 return {cert,balances,terms,unread:rows.filter(d=>d.status!=='Rejeitado'&&(!d.text_content?.trim()||d.indexing_status!=='indexado')).length};
}
function reviewedValues(d){
 if(!d.reviewed)return [];const f=JSON.parse(d.reviewed).financial;if(!f)return [];return Object.entries(f.ratios||{}).flatMap(([k,v])=>{const name={liquidez_corrente:'Liquidez corrente',liquidez_geral:'Liquidez geral',solvencia_geral:'Solvência geral'}[k];if(!name||!Number.isFinite(v.value))return [];return [{name,value:v.value,quote:'Cálculo da análise revisada: '+v.fields.map(key=>{const s=f.values[key]?.source;return s?'pág. '+s.page+' · '+s.quote:'';}).join('; ')}];});}
export function compare(profile,object,clauses='',extra=''){
 const groups=catalog.filter(g=>g.slice(1).some(t=>where(object,t)>=0));if(extra&&where(object,extra)>=0)groups.push([extra,extra]);
 const evidence=[];for(const d of profile.cert){for(const group of groups){const pos=group.slice(1).map(t=>where(d.text_content,t)).find(i=>i>=0);if(pos!==undefined&&!evidence.some(e=>e.id===d.id&&e.term===group[0]))evidence.push({id:d.id,name:d.name,status:d.status,term:group[0],quote:excerpt(d.text_content,pos)});}}
 const demands=indices(clauses,true);const finance=profile.balances.map(d=>({id:d.id,name:d.name,status:d.status,values:[...indices(d.text_content,false),...reviewedValues(d)].map(v=>({...v,checks:demands.filter(x=>x.name===v.name).map(x=>({...x,meets:x.strict?v.value>x.value:v.value>=x.value}))}))}));
 const comparison=demands.map(d=>{const values=finance.flatMap(f=>f.values.filter(v=>v.name===d.name));if(!values.length)return 'pendente';const results=values.map(v=>d.strict?v.value>d.value:v.value>=d.value);return results.every(Boolean)?'alcança':results.every(x=>!x)?'abaixo':'divergente';});
 const financialStatus=comparison.includes('abaixo')?'Índice abaixo de limite identificado':comparison.length&&comparison.every(x=>x==='alcança')?'Índices comparados alcançam os limites identificados':'Conferência financeira pendente';
 return {evidence:evidence.slice(0,16),finance,demands,financialStatus};
}
export function lookupTerm(profile,term){return typeof term==='string'&&/^[\p{L}][\p{L} -]{2,69}$/u.test(term)&& (profile.terms.includes(term)||profile.cert.some(d=>where(d.text_content,term)>=0));}
