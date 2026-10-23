import React from 'react';
import {DNA_FIELDS,missingDNA} from '../shared/marketing-dna.mjs';
const offers=['Produtos','Serviços','Consultorias','Cursos / infoprodutos','Mentorias','Outros'];
const tones=['Agressivo','Provocativo','Educativo','Sofisticado','Descontraído','Técnico','Inspirador'];
const personal=['name','activity','niche','offerTypes','offer','audience','audienceNeeds','goals','recognition','voice','positioning','topics','avoidTopics','handle'];
const dna=['activity','positivity','voice','audience','offer','goals','positioning','communicationStyle','values','topics','instructions','examples','avoidTopics','forbiddenWords','neverSay','limits'];
const names={name:'Seu nome ou nome do perfil',activity:'Identidade profissional',offer:'Produtos e serviços',goals:'Objetivos comerciais',positioning:'Diferenciais competitivos',topics:'Temas prioritários',limits:'Limites anteriores (preservados)'};
export default function MarketingDNA({profile,dirty,busy,saving,building,onChange,onSave,onCreate,onBuild,personalization=false,message}){
 const missing=missingDNA(profile.data),keys=personalization?personal:dna;
 function choices(key,values){const selected=(profile.data[key]||'').split('\n');return <div className="dna-options">{values.map(v=><button type="button" key={v} disabled={busy} aria-pressed={selected.includes(v)} onClick={()=>onChange(key,(selected.includes(v)?selected.filter(x=>x!==v):[...selected.filter(Boolean),v]).join('\n'))}>{v}</button>)}</div>}
 return <section className="studio-dna dna-reference" aria-label={personalization?'Personalização':'Seu DNA'}>
 <div className="dna-toolbar"><div><h3>{personalization?'Personalização':'Seu DNA'}</h3><p>{personalization?'Responda uma vez. Estas informações serão usadas nas próximas criações.':'Sua identidade permanente. Revise, complete e salve quando quiser.'}</p></div>{!personalization&&<button type="button" disabled={busy} onClick={onBuild}>{building?'Montando com Gemini…':'Montar com IA'}</button>}</div>
 <form className="mk-profile" aria-busy={saving||building} onSubmit={e=>{e.preventDefault();onSave();}}>
 <fieldset disabled={busy} className="dna-fields">
 {keys.map(key=>{const field=DNA_FIELDS.find(f=>f[0]===key);if(!field)return null;const [,label,max,placeholder]=field;return <div className="dna-field" key={key}>
 {key==='avoidTopics'&&!personalization&&<h4>LIMITES</h4>}
 <label htmlFor={'dna-'+key}>{personalization?(key==='activity'?'Qual é sua profissão ou área de atuação?':label):(names[key]||label)}</label>
 {['values','topics','avoidTopics','forbiddenWords','neverSay'].includes(key)&&<small>Um por linha.</small>}
 {key==='offerTypes'?choices(key,offers):<>{key==='voice'&&personalization&&choices(key,tones)}<textarea id={'dna-'+key} rows={personalization&&['name','activity','niche','goals','recognition','handle'].includes(key)?1:3} maxLength={max} value={profile.data[key]||''} placeholder={placeholder} onChange={e=>onChange(key,e.target.value)}/></>}
 </div>})}
 </fieldset>
 <div className="dna-save"><button className="mk-primary" disabled={busy||!dirty}>{saving?'Salvando DNA…':personalization?'Salvar personalização':'Salvar meu DNA'}</button><p role="status" aria-live="polite">{saving?'Aguarde, estamos salvando suas informações.':building?'O Gemini está preparando uma sugestão. Seus campos preenchidos serão preservados.':message|| (dirty?'Alterações ainda não salvas.':profile.version?'Dados salvos · versão '+profile.version:'Preencha e salve sua base.')}</p></div>
 {(saving||building)&&<div className="dna-progress" role="progressbar" aria-label={saving?'Salvando DNA':'Montando DNA'}><span/></div>}
 <p className="mk-muted">Personalização e Seu DNA compartilham a mesma base. Alterações valem para novas criações; projetos anteriores preservam a versão utilizada.</p>
 {!personalization&&<><p className="mk-muted">{missing.length?'Para criar pautas automaticamente, complete: '+missing.join(', ')+'.':'Sua base está pronta para novas pautas.'}</p><button type="button" disabled={busy||dirty||!!missing.length||!profile.version} onClick={onCreate}>Criar com meu DNA</button></>}
 </form></section>;
}
