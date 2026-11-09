import React, {useEffect, useMemo, useState} from 'react';

const formatDate = value => value ? new Date(value).toLocaleString('pt-BR') : '—';
const shortText = value => String(value || '').trim().toLocaleLowerCase('pt-BR');
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,10);

import DocumentRadar from './DocumentRadar.jsx';
export default function DocumentLibrary({user, api, csrfToken, company, setCompany, onAdd}) {
  const permissions = user?.permissoes || [];
  const can = !!user?.admin || permissions.includes('Acessar documentos');
  const manager = !!user?.admin || permissions.includes('Administrar equipe');
  const canAnalyze = manager || permissions.includes('Analisar editais');
  const [config, setConfig] = useState({companies: [], categories: []});
  const [revision,bump]=useState(0);
  const [category, setCategory] = useState('Atestados');
  const [docs, setDocs] = useState([]);
  const [receipt,setReceipt]=useState(null);
  const [batches, setBatches] = useState([]);
  const [trashItems,setTrashItems] = useState([]);
  const [indexProgress, setIndexProgress] = useState(null);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState({});
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [filters, setFilters] = useState({name: '', category: '', status: ''});
  const [analysisMap,setAnalysisMap] = useState({});
  const [libraryReport,setLibraryReport] = useState(null);
  const [requirements,setRequirements] = useState('');
  const [selectedTender,setSelectedTender] = useState('');
  const [tenders,setTenders] = useState([]);
  const [comparison,setComparison] = useState(null);
  const [comparisonHistory,setComparisonHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function refresh(currentCompany=company) {
    const [documents, importBatches, progress, summary, pastComparisons,removed] = await Promise.all([
      api('/api/library/documents?company='+encodeURIComponent(currentCompany)),
      api('/api/library/batches?company='+encodeURIComponent(currentCompany)),
      api('/api/library/index-progress?company='+encodeURIComponent(currentCompany)),
      api('/api/library/report?company='+encodeURIComponent(currentCompany)),
      api('/api/library/comparisons?company='+encodeURIComponent(currentCompany)),
      manager?api('/api/library/trash?company='+encodeURIComponent(currentCompany)):Promise.resolve([]),
    ]);
    setDocs(documents);
    setBatches(importBatches);
    setIndexProgress(progress);
    setLibraryReport(summary);
    setComparisonHistory(pastComparisons);
    setTrashItems(removed);bump(x=>x+1);
  }
  useEffect(() => {
    if (!can) return;
    api('/api/library/config').then(setConfig).catch(e=>setMessage(e.message));
    api('/api/work/tenders').then(setTenders).catch(()=>{});
  }, [can]);
  useEffect(() => {
    if (!can) return;
    setHistory({}); setMatches([]); setReport(null); setComparison(null);setSelectedTender('');setAnalysisMap({});setFilters({name:'',category:'',status:''});
    api('/api/library/prepare','POST',{company}).catch(e=>setMessage(e.message));
    refresh(company).catch(e=>setMessage(e.message));
  }, [can, company]);

  useEffect(()=>{if(!can||!indexProgress?.total)return;let live=true;const tick=setInterval(async()=>{try{const p=await api('/api/library/index-progress?company='+company);if(live&&(p.indexed!==indexProgress.indexed||p.incomplete!==indexProgress.incomplete||p.failures?.length!==indexProgress.failures?.length)){setIndexProgress(p);bump(x=>x+1);}}catch{}},5000);return()=>{live=false;clearInterval(tick)};},[company,can,indexProgress]);
  async function upload(files) {
    setLoading(true);setMessage('');
    let count=0;
    try {
      for (const file of files) {
        const response = await fetch('/api/library/documents', {
          method: 'POST', credentials:'same-origin',
          headers: {'Content-Type':'application/pdf','X-CSRF-Token':csrfToken(), 'X-File-Name':encodeURIComponent(file.name), 'X-Company-Id':company,'X-Category':encodeURIComponent(category)},
          body:file
        });
        const result = await response.json();
        if (!response.ok) throw Error(result.error || 'Falha no upload.');
        setReceipt({id:result.id,name:file.name});count++;
      }
      await refresh(); setMessage(`${count} PDF(s) cadastrado(s) como pendente(s) de validação.`);
    } catch(e) { await refresh().catch(()=>{}); setMessage(`${count} enviado(s). Erro: ${e.message}`); }
    finally {setLoading(false);}
  }
  async function uploadZip(file) {
    setLoading(true);setReport(null);setMessage('Importando ZIP. Não feche esta tela.');
    try {
      const response = await fetch('/api/library/import-zip', {
        method:'POST', credentials:'same-origin',
        headers:{'Content-Type':'application/zip','X-CSRF-Token':csrfToken(), 'X-File-Name':encodeURIComponent(file.name), 'X-Company-Id':company,'X-Category':encodeURIComponent(category)},
        body:file
      });
      const result=await response.json().catch(()=>null);
      if(!response.ok||!result)throw Error(result?.error || ('Não foi possível confirmar a importação (HTTP '+response.status+'). Confira o histórico antes de reenviar.'));
      setReport(result); const first=result.items?.find(x=>x.documentId);if(first)setReceipt({id:first.documentId,name:first.path.split('/').pop()});await refresh();
      setMessage(`Lote ${result.batchId}: ${result.imported} importados, ${result.duplicate} duplicados, ${result.skipped} ignorados, ${result.failed} falhas.`);
    }catch(e){setMessage(e.message);}finally{setLoading(false);}
  }
  async function indexNow(){
    setLoading(true);setMessage('Indexando até dois PDFs...');
    try{const result=await api('/api/library/index-batch','POST',{companyId:company});await refresh();setMessage('Resultado: '+(result.results.length ? result.results.map(x=>`${x.name} (${x.status})`).join('; ') : 'nenhum documento novo aguardando indexação')+'.');}
    catch(e){setMessage(e.message);}finally{setLoading(false);}
  }
  async function searchNow(){
    setLoading(true);
    try{const result=await api('/api/library/search?company='+encodeURIComponent(company)+'&q='+encodeURIComponent(query));setMatches(result);setMessage(`${result.length} resultado(s) na biblioteca indexada.`);}
    catch(e){setMessage(e.message);}finally{setLoading(false);}
  }
  async function review(id,status){
    const note=window.prompt('Justificativa da revisão (obrigatória para rejeição):','');
    if(note===null || status==='Rejeitado' && !note.trim())return;
    try{await api(`/api/library/documents/${id}/review`,'POST',{status,note});await refresh();setMessage('Revisão registrada com login e data.');}
    catch(e){setMessage(e.message);}
  }
  async function showHistory(id){
    try{if(history[id]){setHistory(prev=>({...prev,[id]:null}));return;}const rows=await api(`/api/library/documents/${id}/history`);setHistory(prev=>({...prev,[id]:rows}));}
    catch(e){setMessage(e.message);}
  }
  async function removeDocument(d){
    if(!window.confirm(`Remover "${d.name}" da biblioteca ativa? O PDF e a auditoria permanecerão armazenados.`))return;
    const reason=window.prompt('Informe o motivo da remoção (mínimo 5 caracteres):','');
    if(reason===null)return;
    try{await api(`/api/library/documents/${d.id}`,'DELETE',{reason});await refresh();setMessage('Documento removido logicamente; arquivo físico e auditoria preservados.');}
    catch(e){setMessage(e.message);}
  }
  async function cancelBatch(b){
    if(!window.confirm(`Cancelar o lote de ${b.total} documentos ativos? Documentos já validados só podem ser retirados por gestores.`))return;
    const reason=window.prompt('Motivo do cancelamento do lote (mínimo 5 caracteres):','');
    if(reason===null)return;
    try{const result=await api(`/api/library/batches/${b.batchId}/cancel`,'POST',{reason});await refresh();setMessage(`Lote cancelado: ${result.removed} documento(s) retirado(s) da lista ativa.`);}
    catch(e){setMessage(e.message);}
  }
  async function editMetadata(d){
    const nextCategory=window.prompt('Categoria do documento (digite uma das opções: '+config.categories.join(', ')+'):',d.category);
    if(nextCategory===null)return;
    const expiresAt=window.prompt('Validade (AAAA-MM-DD) ou deixe vazio se não houver data confirmada:',d.expires_at||'');
    if(expiresAt===null)return;
    const note=window.prompt('Justificativa da alteração (mínimo 5 caracteres):','');
    if(note===null)return;
    try{await api(`/api/library/documents/${d.id}/metadata`,'PATCH',{category:nextCategory.trim(),expiresAt:expiresAt.trim(),note});await refresh();setMessage('Metadados atualizados e alteração registrada na auditoria.');}
    catch(e){setMessage(e.message);}
  }

  async function restoreDocument(d){
    if(!window.confirm(`Restaurar o documento "${d.name}" como Pendente? Uma nova validação será necessária.`))return;
    const reason=window.prompt('Motivo da restauração (mínimo 5 caracteres):','');if(reason===null)return;
    try{await api(`/api/library/documents/${d.id}/restore`,'POST',{reason});await refresh();setMessage('Documento restaurado para pendência; confira sua análise antes de validar.');}
    catch(e){setMessage(e.message);}
  }
  async function indexSingle(d){
    setLoading(true);setMessage(`Lendo ${d.name} (OCR quando necessário)...`);
    try{const result=await api(`/api/library/documents/${d.id}/index`,'POST',{ocr:true});await refresh();setAnalysisMap(a=>({...a,[d.id]:null}));setMessage(`Leitura: ${result.pages} páginas, ${result.ocrPages} com OCR, ${result.pendingPages} pendentes. ${result.status==='incompleto'?'Confira o PDF.':''}`);}
    catch(e){setMessage('Leitura falhou: '+e.message);}finally{setLoading(false);}
  }
  async function displayAnalysis(d){
    if(analysisMap[d.id]){setAnalysisMap(a=>({...a,[d.id]:null}));return;}
    try{const data=await api(`/api/library/documents/${d.id}/analysis`);setAnalysisMap(a=>({...a,[d.id]:data||{status:'Sem análise'}}));}
    catch(e){setMessage(e.message);}
  }
  async function analyzeOne(d){
    setLoading(true);setMessage(`Analisando ${d.name} com a OpenAI...`);
    try{const result=await api(`/api/library/documents/${d.id}/analysis`,'POST',{});setAnalysisMap(a=>({...a,[d.id]:result}));await refresh();setMessage('Análise IA gerada. Confira as páginas, os valores e as citações antes de revisar.');}
    catch(e){setMessage('Análise não concluída: '+e.message);}finally{setLoading(false);}
  }
  async function decideAnalysis(d,status){
    const note=window.prompt('Justificativa da revisão humana (mínimo 5 caracteres):','');if(note===null)return;
    try{const result=await api(`/api/library/documents/${d.id}/analysis-review`,'POST',{status,note});setAnalysisMap(a=>({...a,[d.id]:result}));await refresh();setMessage('Revisão da análise registrada. Não implica habilitação da empresa.');}
    catch(e){setMessage(e.message);}
  }
  async function compareNow(){
    setLoading(true);setMessage('Comparando os requisitos com os documentos analisados...');
    try{const result=await api('/api/library/comparisons','POST',{companyId:company,tenderId:selectedTender||null,requirements});setComparison(result);await refresh();setMessage('Relatório comparativo gerado. Resultado sujeito a verificação humana.');}
    catch(e){setMessage('Comparação não concluída: '+e.message);}finally{setLoading(false);}
  }
  async function openComparison(id){try{setComparison(await api('/api/library/comparisons/'+id));}catch(e){setMessage(e.message);}}
  function exportCsv(){
    if(!libraryReport)return;
    const headers=['Documento','Categoria','Validação','Validade','Indexação','Análise IA','Páginas pendentes'];
    const escape=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const rows=[headers,...libraryReport.documents.map(d=>[d.name,d.category,d.status,d.expires_at,d.indexing_status,d.analysis_status,d.pending_pages])];
    const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(escape).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`biblioteca-${company}-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  }
  const formatIndex = n => n===null||n===undefined ? 'Não calculável' : Number(n).toLocaleString('pt-BR',{maximumFractionDigits:4});
  function analysisDetails(d,record){
    if(!record)return null;
    const a=record.analysis;
    if(!a)return <div className="notice">Sem análise. Faça a leitura/OCR, depois execute a análise com IA.</div>;
    return <div className="notice" style={{margin:10}}>
      <strong>Análise documental: {record.status}</strong><p>{a.summary||'Sem resumo.'}</p>
      <p style={subtle}>Modelo: {a.model||'—'} · {a.reading?.pages??'—'} páginas · pendentes: {a.reading?.pendingPages??'—'} · tipo: {a.mode||'geral'}</p>
      <p><b>Emissor:</b> {a.issuer||'Não identificado'} · <b>Objeto:</b> {a.subject||'Não identificado'} · <b>Período:</b> {a.period||'Não identificado'}</p>
      <strong>Evidências extraídas</strong>
      <div style={{maxHeight:320,overflowY:'auto'}}>{!a.items?.length&&<p>Nenhum trecho verificável foi identificado.</p>}{a.items?.map((item,i)=><p key={i} style={{borderBottom:'1px solid #d7e0ea',paddingBottom:5}}><b>{item.key}:</b> {item.value} · Página {item.page??'—'} · <span style={{color:item.evidenceVerified?'#087f5b':'#b42318'}}>{item.evidenceVerified?'Trecho localizado':'Citação NÃO confirmada'}</span><br/><small>“{item.quote}”</small></p>)}</div>
      {a.financial&&<div><strong>Índices financeiros preliminares (não significam habilitação)</strong><p>Liquidez corrente: {formatIndex(a.financial.ratios?.liquidez_corrente?.value)} · Liquidez geral: {formatIndex(a.financial.ratios?.liquidez_geral?.value)} · Solvência geral: {formatIndex(a.financial.ratios?.solvencia_geral?.value)}</p><p style={subtle}>{a.financial.notice}</p></div>}
      {a.warnings?.length>0&&<div><b>Pontos de atenção:</b>{a.warnings.map((w,i)=><p key={i} style={{color:'#9b2c2c',fontSize:12}}>• {w}</p>)}</div>}
      {record.reviewNote&&<p>Revisão: {record.reviewNote} ({formatDate(record.reviewedAt)})</p>}
      {manager&&record.status!=='Desatualizado'&&<div style={inline}><button type="button" className="secondary" onClick={()=>decideAnalysis(d,'Revisado')}>Registrar conferência humana</button><button type="button" className="secondary" onClick={()=>decideAnalysis(d,'Rejeitado')}>Rejeitar análise</button></div>}
    </div>;
  }

  const filtered=useMemo(()=>docs.filter(d=>{
    if(filters.category && filters.category!==d.category)return false;
    if(filters.status && filters.status!==d.status)return false;
    if(filters.name && !shortText(`${d.name} ${d.source_path||''}`).includes(shortText(filters.name)))return false;
    return true;
  }),[docs,filters]);
  const expired=d=>Boolean(d.expires_at && d.expires_at<today());
  if(!can)return <div className="notice">Sem permissão para acessar documentos.</div>;
  const subtle={fontSize:12,color:'#556987'};
  const inline={display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'};
  return <section className="platform-info">
    <h2>Biblioteca Documental Inteligente</h2>
    <p>Biblioteca privada por empresa com PDFs, ZIP, indexação e OCR, extração assistida pela OpenAI, índices preliminares e comparação orientada a evidências. Nenhum resultado substitui a conferência humana ou declara habilitação legal.</p>
    <div className="filters">
      <label>Empresa<select value={company} disabled={loading} onChange={e=>setCompany(e.target.value)}>{config.companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Categoria inicial<select value={category} disabled={loading} onChange={e=>setCategory(e.target.value)}>{config.categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
      <label>Enviar PDFs (até 20 MB cada)<input type="file" accept=".pdf,application/pdf" multiple disabled={loading} onChange={e=>{const files=[...e.target.files];e.target.value='';if(files.length)upload(files);}}/></label>
      <label>Importar ZIP de pastas (até 260 MB)<input type="file" accept=".zip,application/zip,application/x-zip-compressed" disabled={loading} onChange={e=>{const file=e.target.files[0];e.target.value='';if(file)uploadZip(file);}}/></label>
    </div>
    {message&&<p role="status" className="notice">{message}</p>}
    {receipt&&<p>Salvo nesta empresa: <a href={'/api/library/documents/'+receipt.id+'/file'}>{receipt.name} — baixar para conferir</a></p>}
    <p className="notice">Selecione a empresa correta antes do upload. Pastas do ZIP servem para sugerir categorias; confira-as após a importação. Arquivos que não sejam PDF são ignorados. Não há transferência automática entre empresas.</p>
    <div className="notice">
      <strong>Indexação e busca no conteúdo dos PDFs</strong>
      {(user.admin||permissions.includes('Buscar editais'))&&<DocumentRadar key={company+revision} company={company} api={api} onAdd={onAdd}/>}
      {indexProgress?.failures?.map(x=><p key={x.id}>PDF guardado, leitura pendente: {x.name} · {x.reason}. Use a releitura individual para tentar novamente.</p>)}
      <p>{indexProgress?`${indexProgress.indexed||0} de ${indexProgress.total||0} PDFs processados · ${indexProgress.incomplete||0} incompletos`: 'Carregando progresso...'}</p>
      <button type="button" disabled={loading||indexProgress && indexProgress.indexed>=indexProgress.total} onClick={()=>api('/api/library/prepare','POST',{company}).then(()=>setMessage('Leitura em andamento no servidor.')).catch(e=>setMessage(e.message))}>Processar documentos pendentes</button>
      <p style={subtle}>A extração permite pesquisa textual. PDFs digitalizados podem precisar de OCR. Este passo não valida automaticamente documentos.</p>
      <div style={inline}><input aria-label="Pesquisar texto dos PDFs" placeholder="Ex.: hospedagem 300 pessoas" value={query} onChange={e=>setQuery(e.target.value)} style={{flex:1,minWidth:230,padding:9}}/><button type="button" disabled={loading||query.trim().length<2} onClick={searchNow}>Pesquisar conteúdo</button></div>
      {matches.map(m=><div key={m.id} style={{padding:9,borderTop:'1px solid #cfd9e5'}}><b>{m.name}</b> · {m.category} · {m.indexing_status}<p style={{whiteSpace:'pre-wrap',fontSize:12}}>{m.excerpt}</p></div>)}
    </div>
    <div className="notice" style={{margin:'12px 0'}}>
      <h3>Visão geral documental — {config.companies.find(c=>c.id===company)?.name||company}</h3>
      {libraryReport?<><p><b>{libraryReport.total}</b> documentos ativos · {libraryReport.validated} validados · {libraryReport.pending} pendentes · {libraryReport.rejected} rejeitados · {libraryReport.expired} com validade vencida · {libraryReport.withoutExpiry} sem validade informada</p>
        <p><b>{libraryReport.indexed}</b> integralmente indexados · {libraryReport.incomplete} incompletos · {libraryReport.analysed} analisados com IA · {libraryReport.aiReviewed} análises revisadas</p>
        <button type="button" onClick={exportCsv}>Exportar inventário CSV</button></>:<p>Carregando indicadores...</p>}
    </div>
    <details style={{padding:'12px 0',border:'1px solid #d7e0ea',borderRadius:8,margin:'12px 0'}}>
      <summary><strong>Comparador documental de habilitação — preparar análise para o Funil</strong></summary>
      <p style={subtle}>Apenas dados da empresa selecionada. Primeiro analise os documentos com IA e revise-os. Cole os requisitos do edital; a IA só poderá citar evidências existentes. O resultado não aprova participação.</p>
      <label style={{display:'block',margin:10}}>Licitação relacionada (opcional)<select value={selectedTender} onChange={e=>setSelectedTender(e.target.value)}><option value="">Sem vínculo com licitação</option>{tenders.map(t=><option key={t.id} value={t.id}>{t.titulo||t.id}</option>)}</select></label>
      <textarea style={{width:'100%',minHeight:125,padding:10,boxSizing:'border-box'}} value={requirements} onChange={e=>setRequirements(e.target.value)} placeholder="Cole aqui os requisitos técnicos, documentais ou econômico-financeiros do edital (mín. 15 caracteres, máx. 12 mil)." maxLength={12000}/>
      <button type="button" disabled={loading||!canAnalyze||requirements.trim().length<15} onClick={compareNow}>Comparar requisitos com a biblioteca</button>
      {comparisonHistory.length>0&&<details style={{margin:10}}><summary>Comparações anteriores ({comparisonHistory.length})</summary>{comparisonHistory.map(c=><p key={c.id}><button type="button" className="secondary" onClick={()=>openComparison(c.id)}>{formatDate(c.created)} — {c.requirements_excerpt}</button></p>)}</details>}
      {comparison&&<div className="notice"><strong>Comparação — {comparison.companyId} · {formatDate(comparison.createdAt)}</strong><p>{comparison.overview}</p><p style={subtle}>Não constitui parecer jurídico ou decisão de habilitação. Não comprovação significa ausência de evidência verificada nas análises disponíveis.</p>
        {(comparison.items||[]).map((r,i)=><div key={i} style={{borderTop:'1px solid #bac5d3',padding:'9px 0'}}><b>{r.requirement}</b> · <strong>{r.status}</strong><p>{r.rationale}</p>{r.evidence?.map((e,j)=><p key={j} style={subtle}>Documento: <a href={`/api/library/documents/${e.documentId}/file`} target="_blank" rel="noreferrer">{e.documentId}</a>, página {e.page} — “{e.quote}”</p>)}</div>)}
        {comparison.warnings?.map((w,i)=><p key={i} style={{color:'#9b2c2c'}}>{w}</p>)}</div>}
    </details>
    <details style={{padding:'12px 0'}}>
      <summary><strong>Gerenciar importações ZIP ({batches.length} lote(s) ativo(s))</strong></summary>
      <p style={subtle}>O cancelamento retira os documentos da biblioteca ativa, mas preserva os PDFs e eventos de auditoria.</p>
      {batches.length===0 && <p>Nenhum lote ZIP ativo nesta empresa.</p>}
      {batches.map(b=><div key={b.batchId} style={{padding:'9px 0',borderBottom:'1px solid #e5eaf0',...inline}}><span><b>{b.total} documentos</b> · {b.uploader_name} · {formatDate(b.created)}<br/><small style={subtle}>{b.batchId}</small></span><button type="button" className="secondary" disabled={loading||!(manager||(b.uploadedBy===user.id&&b.pendingCount===b.total))} onClick={()=>cancelBatch(b)}>Cancelar lote</button></div>)}
    </details>
    {manager&&<details style={{padding:'12px 0'}}><summary><strong>Lixeira documental ({trashItems.length} exibidos)</strong></summary><p style={subtle}>Restauração auditada: apenas gestores. O documento retorna como Pendente, sem revalidar análises antigas.</p>{trashItems.map(d=><div key={d.id} style={{...inline,padding:7,borderBottom:'1px solid #dce4ee'}}><span>{d.name} ({d.category})</span><button type="button" className="secondary" disabled={loading} onClick={()=>restoreDocument(d)}>Restaurar</button></div>)}{!trashItems.length&&<p>Nenhum documento removido nesta empresa.</p>}</details>}
    {report&&<details open><summary>Relatório ZIP: {report.imported} importados · {report.duplicate} duplicados · {report.skipped} ignorados · {report.failed} falhas</summary><div style={{maxHeight:260,overflow:'auto'}}>{report.items.map((x,i)=><p key={i} style={subtle}>{x.status} — {x.path} {x.category&&`(${x.category})`}</p>)}</div></details>}
    
    <div style={{...inline,justifyContent:'space-between',margin:'14px 0'}}><strong>{filtered.length} de {docs.length} documentos ativos</strong><div style={inline}>
      <input aria-label="Filtrar por nome" placeholder="Nome ou pasta" value={filters.name} onChange={e=>setFilters(f=>({...f,name:e.target.value}))} style={{padding:9,minWidth:180}}/>
      <select aria-label="Filtrar categoria" value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))}><option value="">Todas as categorias</option>{config.categories.map(c=><option key={c}>{c}</option>)}</select>
      <select aria-label="Filtrar situação" value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}><option value="">Todas as situações</option>{['Pendente','Validado','Rejeitado'].map(c=><option key={c}>{c}</option>)}</select>
    </div></div>
    <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{['Documento / pasta','Categoria','Revisão','Validade informada','Enviado por / data','Ações'].map(h=><th key={h} style={{padding:10,textAlign:'left',borderBottom:'1px solid #d7e0ea'}}>{h}</th>)}</tr></thead><tbody>{filtered.map(d=><React.Fragment key={d.id}><tr>
      <td style={{padding:10,borderBottom:'1px solid #e5ebf3'}}><b>{d.name}</b>{d.source_path&&<small style={{display:'block',color:'#64748b',maxWidth:260,overflowWrap:'anywhere'}}>{d.source_path}</small>}</td>
      <td style={{padding:10,borderBottom:'1px solid #e5ebf3'}}>{d.category}</td><td style={{padding:10,borderBottom:'1px solid #e5ebf3'}}>{d.status}</td>
      <td style={{padding:10,borderBottom:'1px solid #e5ebf3'}}>{d.expires_at||'Não informada'}{expired(d)&&<strong style={{display:'block',color:'#b42318'}}>Vencido</strong>}</td>
      <td style={{padding:10,borderBottom:'1px solid #e5ebf3'}}>{d.uploader_name}<br/><small>{formatDate(d.created)}</small></td>
      <td style={{padding:10,borderBottom:'1px solid #e5ebf3',minWidth:300}}>
        <div style={{...inline,gap:7}}><button type="button" className="secondary" disabled={loading} onClick={()=>indexSingle(d)}>Ler / OCR</button><button type="button" className="secondary" onClick={()=>displayAnalysis(d)}>Ver análise</button>{canAnalyze&&<button type="button" className="secondary" disabled={loading} onClick={()=>analyzeOne(d)}>Analisar com IA</button>}<a href={`/api/library/documents/${d.id}/file`}>Baixar</a><button type="button" className="secondary" onClick={()=>showHistory(d.id)}>Histórico</button>
          {manager&&<><button type="button" className="secondary" disabled={loading} onClick={()=>editMetadata(d)}>Editar dados</button><button type="button" className="secondary" disabled={loading} onClick={()=>review(d.id,'Validado')}>Validar</button><button type="button" className="secondary" disabled={loading} onClick={()=>review(d.id,'Rejeitado')}>Rejeitar</button></>}
          {(manager||(d.uploaded_by===user.id&&d.status==='Pendente'))&&<button type="button" className="secondary" disabled={loading} onClick={()=>removeDocument(d)}>Remover</button>}
        </div>
      </td>
    </tr>{analysisMap[d.id]&&<tr><td colSpan={6}>{analysisDetails(d,analysisMap[d.id])}</td></tr>}{history[d.id]&&<tr><td colSpan={6}><div className="notice"><b>Histórico do documento</b>{history[d.id].map(x=><p key={x.id} style={subtle}>{formatDate(x.time)} · {x.actor_name} · {x.action} · {x.detail}</p>)}</div></td></tr>}</React.Fragment>)}</tbody></table>
      {!filtered.length&&<p className="notice">Nenhum documento corresponde aos filtros.</p>}
    </div>
    <p className="notice">O status “Validado” representa conferência humana, não habilitação automática. A validade é um metadado informado pela equipe e deve ser conferida no PDF original.</p>
  </section>;
}
