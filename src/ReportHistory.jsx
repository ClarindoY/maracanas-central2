import React,{useEffect,useState} from 'react';
import {SUMMARY_BLOCKS} from '../shared/summary-catalog.mjs';

function SavedReport({report}){
 const {summary,research,official,manual}=report.snapshot;
 const docs=summary?.documents||[];
 return <article className="notice"><h3>{report.title}</h3><a className="secondary" href={'/api/work/reports/'+report.id+'/pdf'} download>Baixar PDF dos oito blocos</a><p>{report.kind} · {new Date(report.created).toLocaleString('pt-BR')}</p>
 {summary?.partial&&<p>Leitura documental parcial.</p>}
 {research?.partial&&<p>Pesquisa parcial.</p>}
 {research?.sections?.map(row=><section key={row.id}><h4>{row.title}</h4><p style={{whiteSpace:'pre-wrap'}}>{row.finding}</p>{row.references.map(key=>{const ref=research.references[key];return ref&&<p key={key}>{ref.url?<a href={ref.url} target="_blank" rel="noreferrer">{ref.title}</a>:ref.title}</p>;})}</section>)}
 {summary&&SUMMARY_BLOCKS.map(b=><details key={b.id}><summary>{b.title}</summary>{b.fields.map(f=>{const field=summary.fields?.find(x=>x.label===f.id);const portal=official.find(x=>x.id===f.id);return <section key={f.id}><h4>{f.label}</h4>{portal?.value&&<p style={{whiteSpace:'pre-wrap'}}>PNCP · {portal.value}</p>}<p style={{whiteSpace:'pre-wrap'}}>{field?.value||field?.note||'Sem informação registrada nesta versão.'}</p>{field?.evidence?.map((e,i)=><blockquote key={i}>{docs.find(d=>d.id===e.documentId)?.name} · página {e.page}<br/>{e.quote}</blockquote>)}{manual[f.id]&&<p>Complemento da equipe · {manual[f.id]}</p>}</section>;})}</details>)}
 {summary?.fields?.filter(f=>!SUMMARY_BLOCKS.some(b=>b.fields.some(x=>x.id===f.label))).map(f=><section key={f.label}><h4>{f.label}</h4><p style={{whiteSpace:'pre-wrap'}}>{f.value||f.note}</p></section>)}</article>;
}
export default function ReportHistory({api,revision}){
 const [page,setPage]=useState(1),[list,setList]=useState(null),[selected,select]=useState(null),[report,setReport]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setError('');setReport(null);setList(null);
 const request=selected?api('/api/work/reports/'+selected):api('/api/work/reports?page='+page);
 request.then(value=>{if(active)(selected?setReport:setList)(value);}).catch(e=>{if(active)setError(e.message);});
 return ()=>{active=false;};},[api,revision,page,selected,retry]);
 return <section className="platform-info"><h2>Histórico de relatórios</h2>{selected&&<button className="secondary" onClick={()=>select(null)}>Voltar ao histórico</button>}
 {error?<p role="alert">{error} <button onClick={()=>setRetry(v=>v+1)}>Tentar novamente</button></p>:report?<SavedReport report={report}/>:list?<>{list.rows.length===0&&<p>Nenhum relatório salvo.</p>}{list.rows.map(row=><article className="notice" key={row.id}><b>{row.title}</b><p>{row.kind} · {new Date(row.created).toLocaleString('pt-BR')} · Registro {row.id}</p><button className="secondary" onClick={()=>select(row.id)}>Abrir relatório</button></article>)}{page>1&&<button onClick={()=>setPage(page-1)}>Anterior</button>}{list.more&&<button onClick={()=>setPage(page+1)}>Próxima página</button>}</>:<p role="status">Carregando histórico…</p>}</section>;
}
