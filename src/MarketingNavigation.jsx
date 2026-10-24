import React from 'react';
export const MARKETING_SECTIONS=[
 ['', ['Criar','Criar por áudio','Academia de Viralização']],
 ['INTELIGÊNCIA',['Seu público','Assuntos quentes','Na pele do cliente','Ideias']],
 ['CONTEÚDO',['Meus conteúdos']],
 ['ESTRATÉGIA',['Seu DNA','Método PAV']],
 ['CONFIGURAÇÃO',['Personalização','Marcas e identidade']],
];
const paths={
 'Criar':'M16 3l5 5-12 12H4v-5z M13 6l5 5 M3 22h18',
 'Criar por áudio':'M9 4a3 3 0 016 0v8a3 3 0 01-6 0z M5 10v2a7 7 0 0014 0v-2 M12 19v3 M8 22h8',
 'Academia de Viralização':'M2 9l10-6 10 6-10 6z M6 12v6q6 5 12 0v-6 M22 9v8',
 'Seu público':'M12 3v18 M12 5C6-1 2 6 5 9c-5 2-3 8 1 8-1 4 4 6 6 2 M12 5c6-6 10 1 7 4 5 2 3 8-1 8 1 4-4 6-6 2',
 'Assuntos quentes':'M13 2c2 6-5 7-2 12 1-3 4-3 5-6 8 10 1 15-4 15-7 0-11-7-5-13-1 4 2 4 3 3-1-4 4-5 3-11z',
 'Na pele do cliente':'M3 8h18v13H3z M8 8V4h8v4 M8 8v13 M16 8v13',
 'Ideias':'M8 17c0-3-3-3-3-8a7 7 0 0114 0c0 5-3 5-3 8 M8 18h8 M9 22h6',
 'Meus conteúdos':'M5 2h9l5 5v15H5z M14 2v6h5 M8 12h8 M8 16h8',
 'Seu DNA':'M12 2l2 7 7 3-7 2-2 8-2-8-8-2 8-3z',
 'Método PAV':'M12 2a10 10 0 100 20 10 10 0 000-20 M12 6a6 6 0 100 12 6 6 0 000-12 M12 10a2 2 0 100 4 2 2 0 000-4',
 'Personalização':'M4 5h16 M4 12h16 M4 19h16 M9 2v6 M15 9v6 M9 16v6',
 'Marcas e identidade':'M4 3h16v18H4z M8 8h8 M8 12h8 M8 16h4'
};
export default function MarketingNavigation({active,expanded,page,onToggle,onSelect,mode='PAV',onModeChange}){
 return <div className="marketing-navigation">
 <button type="button" className={'nav marketing-toggle '+(active?'active':'')} aria-expanded={expanded} aria-controls="marketing-subnavigation" onClick={onToggle}><span>Marketing</span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={expanded?'M6 15l6-6 6 6':'M6 9l6 6 6-6'}/></svg></button>
 <nav id="marketing-subnavigation" aria-label="Funções de Marketing" hidden={!expanded}>
 <div className="marketing-mode" role="group" aria-label="Espaço de Marketing">{['PAV','PVC'].map(m=><button key={m} type="button" aria-pressed={mode===m} onClick={()=>onModeChange(m)}>{m}</button>)}</div>
 {MARKETING_SECTIONS.map(([label,pages])=><div className="marketing-nav-section" key={label||'creation'}>{label&&<span className="marketing-nav-label">{label}</span>}{pages.map(p=><button type="button" key={p} className="marketing-subnav" aria-current={active&&page===p?'page':undefined} onClick={()=>onSelect(p)}><svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[p]}/></svg><span>{p}</span></button>)}</div>)}
 </nav></div>;
}
