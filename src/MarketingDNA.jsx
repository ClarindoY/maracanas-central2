import React from 'react';
import {DNA_FIELDS} from '../shared/marketing-dna.mjs';
const offers=['Produtos','Serviços','Consultorias','Cursos / infoprodutos','Mentorias','Outros'];
const tones=['Agressivo','Provocativo','Educativo','Sofisticado','Descontraído','Técnico','Inspirador'];
export default function MarketingDNA({profile,dirty,busy,saving,onChange,onSave,message}){
 function field(key,label,rows=0){return <label className="personalization-field" key={key} htmlFor={'personalization-'+key}>{label}{rows?<textarea id={'personalization-'+key} rows={rows} maxLength={DNA_FIELDS.find(f=>f[0]===key)?.[2]||1000} value={profile.data[key]||''} onChange={e=>onChange(key,e.target.value)}/>:<input id={'personalization-'+key} maxLength={DNA_FIELDS.find(f=>f[0]===key)?.[2]||1000} value={profile.data[key]||''} onChange={e=>onChange(key,e.target.value)}/>}</label>}
 function choices(key,values){const selected=(profile.data[key]||'').split('\n');return <div className="dna-options">{values.map(v=><button type="button" key={v} aria-pressed={selected.includes(v)} onClick={()=>onChange(key,(selected.includes(v)?selected.filter(x=>x!==v):[...selected.filter(Boolean),v]).join('\n'))}>{v}</button>)}</div>}
 return <section className="personalization-reference"><p>Estas respostas são usadas em todo o conteúdo do perfil selecionado. Você pode mudar quando quiser.</p><form onSubmit={e=>{e.preventDefault();onSave();}}><fieldset disabled={busy}>
 {field('name','Seu nome')}{field('activity','1. Qual é sua profissão ou área de atuação?')}{field('niche','2. Qual é o seu nicho ou especialidade?')}
 <div className="personalization-field"><span>3. O que você vende?</span>{choices('offerTypes',offers)}<input aria-label="Descreva o que você vende" maxLength={1000} value={profile.data.offer||''} onChange={e=>onChange('offer',e.target.value)}/></div>
 {field('audience','4. Quem é seu público-alvo?')}{field('audienceNeeds','5. Quais são os principais problemas e desejos desse público?',3)}{field('goals','6. Qual é seu principal objetivo nas redes sociais?')}{field('recognition','7. Como você deseja ser reconhecido?')}
 <div className="personalization-field"><span>8. Qual é seu tom de comunicação?</span>{choices('voice',tones)}{(profile.data.voice||'').split('\n').filter(v=>v&&!tones.includes(v)).map(v=><small key={v}>{v}</small>)}</div>
 {field('positioning','9. Quais são seus diferenciais?',3)}<div className="personalization-topics">{field('topics','10. Temas que deseja abordar',4)}{field('avoidTopics','Temas que prefere evitar',4)}</div>{field('handle','Seu @ (opcional)')}
 <button className="mk-primary" disabled={!dirty}>{saving?'Salvando…':'Salvar'}</button>
 <details className="personalization-extra"><summary>Orientações adicionais do perfil</summary>{['voice','communicationStyle','instructions','examples','values','positivity','forbiddenWords','neverSay','limits'].map(key=>field(key,DNA_FIELDS.find(f=>f[0]===key)?.[1]||key,3))}<button disabled={!dirty}>Salvar</button></details>
 </fieldset><p role="status">{message||(dirty?'Alterações ainda não salvas.':'')}</p></form></section>;
}
