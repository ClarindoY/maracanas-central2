import React,{useState} from 'react';
export default function DNASelector({profiles,profile,busy,dirty,onSelect,onCreate,onLabel}){
 const [mode,setMode]=useState(''),[label,setLabel]=useState('');
 async function create(e){e.preventDefault();if(await onCreate(label,mode==='duplicate')){setMode('');setLabel('');}}
 return <section className="dna-selector" aria-label="Biblioteca de DNAs">
 <div className="dna-selector-row"><label htmlFor="active-dna">Qual DNA deseja usar?<select id="active-dna" disabled={busy||dirty} value={profile.id||'default'} onChange={e=>onSelect(e.target.value)}>{profiles.map(p=><option key={p.id} value={p.id}>{p.id===profile.id?profile.label:p.label}</option>)}</select></label><button disabled={busy||dirty} onClick={()=>{setMode('new');setLabel('');}}>+ Novo DNA</button><button disabled={busy||dirty} onClick={()=>{setMode('duplicate');setLabel((profile.label||'Meu DNA')+' — cópia');}}>Duplicar DNA</button></div>
 {dirty&&<p role="status">Salve as alterações deste DNA antes de trocar, criar ou duplicar.</p>}
 <details><summary>Renomear DNA selecionado</summary><label>Nome na biblioteca<input disabled={busy} maxLength={100} value={profile.label||''} onChange={e=>onLabel(e.target.value)}/></label><small>Salve em Personalização ou Seu DNA para confirmar o novo nome.</small></details>
 {mode&&<form onSubmit={create} className="dna-library-form"><label>{mode==='duplicate'?'Nome da cópia':'Nome do novo DNA'}<input autoFocus required maxLength={100} disabled={busy} value={label} onChange={e=>setLabel(e.target.value)}/></label><button className="mk-primary" disabled={busy||!label.trim()}>{busy?'Aguarde…':mode==='duplicate'?'Criar cópia':'Criar DNA'}</button><button type="button" disabled={busy} onClick={()=>setMode('')}>Cancelar</button></form>}
 </section>
}
