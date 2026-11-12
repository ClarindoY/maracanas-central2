import React,{useEffect,useRef,useState} from 'react';
import {Evidence} from './DocumentRadar.jsx';

export default function CompanySearch({api,company,onAdd}){
 const [profile,setProfile]=useState(null),[queue,setQueue]=useState([]),[found,setFound]=useState([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[started,setStarted]=useState(false);
 const alive=useRef(false);
 const post=(action,args={})=>api('/api/library/radar','POST',{companyId:company,action,...args});
 useEffect(()=>{let current=true;alive.current=true;post('profile').then(p=>{if(current){setProfile(p);setQueue(p.terms.map(term=>({term,page:1})));}}).catch(e=>{if(current)setMessage(e.message);});return()=>{current=false;alive.current=false;};},[company]);
 async function search(){
  setBusy(true);setStarted(true);const rest=queue.slice(4),retry=[],warnings=[];
  for(const task of queue.slice(0,4)){
   if(!alive.current)return;
   setMessage('Consultando '+task.term+' · página '+task.page);
   try{
    const r=await post('search',task);
    if(!alive.current)return;
    setFound(prev=>{const merged=new Map(prev.map(x=>[x.url,x]));for(const item of r.items){const old=merged.get(item.url);if(!old||item.evidence.length>old.evidence.length)merged.set(item.url,item);}return [...merged.values()].sort((a,b)=>b.evidence.length-a.evidence.length);});
    if(r.page*20<r.total)rest.push({...task,page:task.page+1});
    if(r.cached)warnings.push(task.term+' · consulta salva de '+new Date(r.at).toLocaleString('pt-BR'));
   }catch(e){retry.push(task);warnings.push(task.term+' · '+e.message);}
  }
  if(alive.current){setQueue([...rest,...retry]);setMessage(warnings.join(' | ')||'Consulta concluída.');setBusy(false);}
 }
 return <section className="doc-radar"><h3>Editais compatíveis com a empresa</h3>
 {profile&&<><p>{profile.certificates} atestado(s) com texto · {profile.balances} balanço(s) com texto · {profile.unread} documento(s) com leitura pendente ou parcial.</p>{profile.terms.length?<p>Serviços identificados: {profile.terms.join(', ')}.</p>:<p>Confira a categoria e a leitura dos atestados desta empresa na Biblioteca documental.</p>}</>}
 <button className="primary" disabled={!queue.length||busy} onClick={search}>{busy?'Pesquisando…':started?'Continuar busca':'Buscar editais compatíveis'}</button>{message&&<p role="status">{message}</p>}
 {started&&<p>{found.length} edital(is) com evidência nos atestados. {queue.length&&!busy?queue.length+' consulta(s) disponíveis para continuar.':''}</p>}
 {found.map(x=><article className="notice" key={x.url}><h4>{x.title} · {x.orgao}</h4><p>{x.description}</p><p>{x.financialStatus}</p><details><summary>Conferir compatibilidade e pendências</summary><Evidence r={x}/></details><a href={x.url} target="_blank" rel="noreferrer">Abrir no PNCP</a> <button className="secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await onAdd(x);}catch(e){setMessage(e.message);}finally{if(alive.current)setBusy(false);}}}>Pesquisar este edital</button></article>)}</section>;
}
