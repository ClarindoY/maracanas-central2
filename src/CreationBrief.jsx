import React from 'react';
import BriefAudio from './BriefAudio.jsx';
import {FORMATS,STYLES,TECHNIQUES} from '../shared/marketing.mjs';
const descriptions=['Slides com imagem pronta para publicar','Hook, roteiro, retenção e CTA para gravar','Frase de impacto com imagem pronta','Sequência estratégica com enquetes e oferta','Legenda pronta para a rede que você escolher'];
const goals=['Viralizar','Ganhar seguidores','Construir autoridade','Gerar leads','Vender','Educar','Criar conexão','Quebrar objeções','Fortalecer posicionamento'];
export const creationLabel=format=>({'Carrossel':'Criar carrossel','Roteiro de Reels':'Criar roteiro de reels','Tweet / post curto':'Criar tweet','Stories':'Criar stories','Legenda':'Criar legenda'}[format]||'Criar conteúdo');
export default function CreationBrief({brief,setBrief,profile,busy,dirty,canGenerate,onGenerate,api,run}){
 const toggle=t=>setBrief(b=>({...b,techniques:b.techniques.includes(t)?b.techniques.filter(v=>v!==t):[...b.techniques,t]}));
 return <form className="studio-brief creation-brief" onSubmit={e=>{e.preventDefault();onGenerate();}}>
 <label className="sr-only" htmlFor="mk-topic">Assunto, notícia ou ideia</label><textarea id="mk-topic" rows={3} maxLength={8000} disabled={busy} value={brief.topic} onChange={e=>setBrief(b=>({...b,topic:e.target.value}))} placeholder="Digite um assunto, uma notícia ou uma ideia..."/>
 <BriefAudio key={profile.id} api={api} run={run} busy={busy} dirty={dirty} profileId={profile.id} onText={text=>setBrief(b=>({...b,topic:((b.topic?b.topic+'\n\n':'')+text).slice(0,8000)}))}/>
 <fieldset disabled={busy} className="creation-formats"><legend>Formato</legend><div>{FORMATS.map((format,i)=><button type="button" key={format} aria-pressed={brief.format===format} onClick={()=>setBrief(b=>({...b,format}))}><strong>{format}</strong><span>{descriptions[i]}</span></button>)}</div></fieldset>
 <fieldset disabled={busy} className="creation-chips"><legend>Objetivo deste conteúdo</legend><div>{[...goals,...(goals.includes(brief.objective)?[]:[brief.objective])].map(objective=><button type="button" key={objective} aria-pressed={brief.objective===objective} onClick={()=>setBrief(b=>({...b,objective}))}>{objective}</button>)}</div></fieldset>
 <fieldset disabled={busy} className="creation-chips"><legend>{brief.format==='Carrossel'?'Estilo do carrossel':'Estilo do conteúdo'}</legend><div>{STYLES.map(style=><button type="button" key={style} aria-pressed={brief.style===style} onClick={()=>setBrief(b=>({...b,style}))}>{style}</button>)}</div></fieldset>
 <section className="creation-techniques"><div className="creation-technique-heading"><span>Técnicas de viralização</span><button type="button" disabled={busy||!canGenerate||!brief.techniques.length} onClick={onGenerate}>✧ Aplicar técnicas de viralização</button></div><div className="creation-chips">{TECHNIQUES.map(([name])=><button type="button" key={name} disabled={busy} aria-pressed={brief.techniques.includes(name)} onClick={()=>toggle(name)}>{name}{brief.techniques.includes(name)?' ×':''}</button>)}</div></section>
 {brief.moment&&<details className="creation-context"><summary>Contexto e fonte desta pauta</summary><p>{brief.moment}</p></details>}
 {dirty&&<p role="status">Salve o perfil de personalização antes de criar.</p>}
 <button className="mk-primary mk-generate" disabled={busy||!canGenerate}>{busy?'Criando…':creationLabel(brief.format)} <span aria-hidden="true">→</span></button>
 </form>;
}
