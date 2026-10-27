import React,{useEffect,useRef,useState} from 'react';
export default function MarketingNews({api,profile,busy,dirty,run,onDraft}){
 const [hours,setHours]=useState(24),[result,setResult]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const attempted=useRef(''),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 async function search(){if(busy||loading||dirty)return;setLoading(true);setError('');setResult(null);await run(async()=>{try{const row=await api('/api/marketing/intelligence','POST',{kind:'hot',dnaId:profile.id,hours});if(mounted.current)setResult(row);}catch(e){if(mounted.current)setError(e.message);}});if(mounted.current)setLoading(false);}
 useEffect(()=>{const key=profile.id+':'+profile.version+':'+hours;if(!busy&&!dirty&&profile.data.topics?.trim()&&attempted.current!==key){attempted.current=key;search();}},[hours,profile.id,profile.version,busy,dirty]);
 function draft(item){onDraft({topic:item.title+'\nÂngulo sugerido: '+item.angle,format:'Carrossel',moment:('Fonte consultada: '+item.source.title+' '+item.source.url+' | Publicação: '+item.publishedAt+'\nResumo da notícia: '+item.summary+'\nConfira a matéria original antes de publicar.').slice(0,2000)});}
 const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('/'):new Date(value).toLocaleString('pt-BR',{timeZone:'America/Fortaleza'});
 return <section className="marketing-feature marketing-news" aria-busy={loading}>
 <div className="news-toolbar"><div className="idea-formats" role="group" aria-label="Período das notícias">{[[24,'Últimas 24h'],[48,'Últimas 48h'],[168,'Últimos 7 dias']].map(([value,label])=><button key={value} disabled={busy||loading} aria-pressed={hours===value} onClick={()=>{setResult(null);setError('');setHours(value);}}>{label}</button>)}</div><button disabled={busy||loading||dirty||!profile.data.topics?.trim()} onClick={search}>{loading?'Buscando…':'Atualizar assuntos'}</button></div>
 {dirty&&<p>Salve as alterações da personalização para buscar notícias.</p>}{!profile.data.topics?.trim()&&<p>Preencha os assuntos em Personalização para começar.</p>}
 {loading&&<div role="status" className="news-loading"><span className="news-spinner" aria-hidden="true"/>Procurando acontecimentos e separando o que pode interessar ao seu público…</div>}
 {error&&<p role="alert">{error} Você pode tentar novamente em “Atualizar assuntos”.</p>}
 {result&&<><p className="mk-muted">Consulta realizada em {date(result.data.searchedAt)} · Personalização: {result.input.dna.label} · {hours===168?'7 dias':hours+' horas'}.</p><p className="mk-muted">Potencial estimado pela IA, sem garantia de viralização. Datas extraídas da pesquisa; confira a fonte. Notícias sem data suficiente para confirmar o período são omitidas.</p>
 {!result.data.ideas.length&&<p role="status">Nenhuma notícia com fonte e data suficientes para este período. Tente ampliar para 48 horas ou 7 dias.</p>}
 <div className="news-results">{result.data.ideas.map((item,index)=><article className="mk-card news-card" key={index}><header><h3>{item.title}</h3><span className="news-potential" title="Estimativa editorial da IA">{item.potential}</span></header><p>{item.summary}</p><h4>Por que isso pode viralizar</h4><p>{item.reason}</p><h4>Ângulo sugerido</h4><p className="news-angle">{item.angle}</p><footer>Fonte: {item.source.title} — {date(item.publishedAt)} <a href={item.source.url} target="_blank" rel="noopener noreferrer">Abrir matéria original</a></footer><button className="mk-primary" disabled={busy||dirty} onClick={()=>draft(item)}>Criar conteúdo</button></article>)}</div>
 {result.data.searchSuggestions&&<iframe className="news-search-suggestions" title="Sugestões de pesquisa do Google" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={result.data.searchSuggestions}/>}
 </>}
 </section>;
}
