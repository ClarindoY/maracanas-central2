import React from 'react';
import {DNA_FIELDS,missingDNA} from '../shared/marketing-dna.mjs';

export default function MarketingDNA({profile,dirty,busy,onChange,onSave,onCreate}){
 const missing=missingDNA(profile.data);
 return <section className="studio-dna" aria-label="Seu DNA">
 <div className="mk-card studio-dna-intro"><span className="mk-eyebrow">SUA BASE PERMANENTE</span><h3>Explique uma vez. Crie a partir daqui.</h3><p>Salve quem você é, para quem fala e quais assuntos fazem parte do seu perfil. Depois, escolha apenas como apresentar o conteúdo.</p><p>Exemplo: em Criar, selecione Roteiro de Reels e Quebra de objeções. O Gemini escolhe uma pauta dentro dos seus assuntos e escreve o roteiro para seu público.</p><p role="status">{dirty?'Alterações ainda não salvas.':profile.version?'DNA salvo · versão '+profile.version:'Seu DNA ainda não foi salvo.'}</p>{missing.length>0&&<p>Para escolher pautas automaticamente, preencha: {missing.join(', ')}.</p>}<button disabled={busy||dirty||!!missing.length||!profile.version} onClick={onCreate}>Criar com meu DNA</button></div>
 <form className="mk-card mk-profile" onSubmit={e=>{e.preventDefault();onSave();}}>
 {DNA_FIELDS.map(([key,label,max,placeholder])=><label key={key}>{label}{['name','audience','topics'].includes(key)&&<small> Base para criação automática</small>}<textarea disabled={busy} rows={['topics','instructions','examples'].includes(key)?4:2} maxLength={max} value={profile.data[key]||''} placeholder={placeholder} onChange={e=>onChange(key,e.target.value)}/></label>)}
 <button className="mk-primary" disabled={busy||!dirty}>Salvar meu DNA</button><p className="mk-muted">Você pode salvar e completar depois. Seu DNA é privado por usuário e será reutilizado nas próximas criações. Editá-lo não reescreve os projetos existentes.</p>
 </form></section>;
}
