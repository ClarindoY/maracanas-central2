import React from 'react';

const sections=[
 ['CRIAÇÃO',['Criar']],
 ['INTELIGÊNCIA',['Na pele do cliente']],
 ['CONTEÚDO',['Meus conteúdos']],
 ['ESTRATÉGIA',['Personalização','Seu DNA']],
 ['IDENTIDADE',['Marcas e identidade']],
];

export default function MarketingNavigation({active,expanded,page,onToggle,onSelect}){
 return <div className="marketing-navigation">
 <button type="button" className={'nav marketing-toggle '+(active?'active':'')} aria-expanded={expanded} aria-controls="marketing-subnavigation" onClick={onToggle}>
 <span>Marketing</span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={expanded?'M6 15l6-6 6 6':'M6 9l6 6 6-6'}/></svg>
 </button>
 <nav id="marketing-subnavigation" aria-label="Funções de Marketing" hidden={!expanded}>
 {sections.map(([label,pages])=><div className="marketing-nav-section" key={label}><span className="marketing-nav-label">{label}</span>{pages.map(p=><button type="button" key={p} className="marketing-subnav" aria-current={active&&page===p?'page':undefined} onClick={()=>onSelect(p)}>{p}</button>)}</div>)}
 </nav>
 </div>;
}
