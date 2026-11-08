import React, {useEffect, useMemo, useState} from 'react';

const formatDate = value => value ? new Date(value).toLocaleString('pt-BR') : '—';
const shortText = value => String(value || '').trim().toLocaleLowerCase('pt-BR');
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,10);

export default function DocumentLibrary({user, api, csrfToken}) {
  const permissions = user?.permissoes || [];
  const can = !!user?.admin || permissions.includes('Acessar documentos');
  const manager = !!user?.admin || permissions.includes('Administrar equipe');
  const [config, setConfig] = useState({companies: [], categories: []});
  const [company, setCompany] = useState('maracanas');
  const [category, setCategory] = useState('Atestados');
  const [docs, setDocs] = useState([]);
  const [batches, setBatches] = useState([]);
  const [indexProgress, setIndexProgress] = useState(null);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState({});
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [filters, setFilters] = useState({name: '', category: '', status: ''});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function refresh(currentCompany=company) {
    const [documents, importBatches, progress] = await Promise.all([
      api('/api/library/documents?company='+encodeURIComponent(currentCompany)),
      api('/api/library/batches?company='+encodeURIComponent(currentCompany)),
      api('/api/library/index-progress?company='+encodeURIComponent(currentCompany)),
    ]);
    setDocs(documents);
    setBatches(importBatches);
    setIndexProgress(progress);
  }
  useEffect(() => {
    if (!can) return;
    api('/api/library/config').then(setConfig).catch(e=>setMessage(e.message));
  }, [can]);
  useEffect(() => {
    if (!can) return;
    setHistory({}); setMatches([]); setReport(null); setFilters({name:'',category:'',status:''});
    refresh(company).catch(e=>setMessage(e.message));
  }, [can, company]);

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
        count++;
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
      const result=await response.json();
      if(!response.ok)throw Error(result.error || 'Erro na importação ZIP.');
      setReport(result); await refresh();
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
    <h2>Biblioteca Documental Inteligente — V47.11</h2>
    <p>Biblioteca privada por empresa. Importação rastreável, indexação textual, revisão humana, gestão de lotes e histórico de alterações. A IA de habilitação e a comparação automática com editais ainda não estão disponíveis nesta etapa.</p>
    <div className="filters">
      <label>Empresa<select value={company} disabled={loading} onChange={e=>setCompany(e.target.value)}>{config.companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Categoria inicial<select value={category} disabled={loading} onChange={e=>setCategory(e.target.value)}>{config.categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
      <label>Enviar PDFs (até 20 MB cada)<input type="file" accept=".pdf,application/pdf" multiple disabled={loading} onChange={e=>{const files=[...e.target.files];e.target.value='';if(files.length)upload(files);}}/></label>
      <label>Importar ZIP de pastas (até 260 MB)<input type="file" accept=".zip,application/zip,application/x-zip-compressed" disabled={loading} onChange={e=>{const file=e.target.files[0];e.target.value='';if(file)uploadZip(file);}}/></label>
    </div>
    <p className="notice">Selecione a empresa correta antes do upload. Pastas do ZIP servem para sugerir categorias; confira-as após a importação. Arquivos que não sejam PDF são ignorados. Não há transferência automática entre empresas.</p>
    <div className="notice">
      <strong>Indexação e busca no conteúdo dos PDFs</strong>
      <p>{indexProgress?`${indexProgress.indexed||0} de ${indexProgress.total||0} PDFs processados · ${indexProgress.incomplete||0} incompletos`: 'Carregando progresso...'}</p>
      <button type="button" disabled={loading||indexProgress && indexProgress.indexed>=indexProgress.total} onClick={indexNow}>Indexar próximos 2 PDFs</button>
      <p style={subtle}>A extração permite pesquisa textual. PDFs digitalizados podem precisar de OCR. Este passo não valida automaticamente documentos.</p>
      <div style={inline}><input aria-label="Pesquisar texto dos PDFs" placeholder="Ex.: hospedagem 300 pessoas" value={query} onChange={e=>setQuery(e.target.value)} style={{flex:1,minWidth:230,padding:9}}/><button type="button" disabled={loading||query.trim().length<2} onClick={searchNow}>Pesquisar conteúdo</button></div>
      {matches.map(m=><div key={m.id} style={{padding:9,borderTop:'1px solid #cfd9e5'}}><b>{m.name}</b> · {m.category} · {m.indexing_status}<p style={{whiteSpace:'pre-wrap',fontSize:12}}>{m.excerpt}</p></div>)}
    </div>
    <details style={{padding:'12px 0'}}>
      <summary><strong>Gerenciar importações ZIP ({batches.length} lote(s) ativo(s))</strong></summary>
      <p style={subtle}>O cancelamento retira os documentos da biblioteca ativa, mas preserva os PDFs e eventos de auditoria.</p>
      {batches.length===0 && <p>Nenhum lote ZIP ativo nesta empresa.</p>}
      {batches.map(b=><div key={b.batchId} style={{padding:'9px 0',borderBottom:'1px solid #e5eaf0',...inline}}><span><b>{b.total} documentos</b> · {b.uploader_name} · {formatDate(b.created)}<br/><small style={subtle}>{b.batchId}</small></span><button type="button" className="secondary" disabled={loading||!(manager||(b.uploadedBy===user.id&&b.pendingCount===b.total))} onClick={()=>cancelBatch(b)}>Cancelar lote</button></div>)}
    </details>
    {report&&<details open><summary>Relatório ZIP: {report.imported} importados · {report.duplicate} duplicados · {report.skipped} ignorados · {report.failed} falhas</summary><div style={{maxHeight:260,overflow:'auto'}}>{report.items.map((x,i)=><p key={i} style={subtle}>{x.status} — {x.path} {x.category&&`(${x.category})`}</p>)}</div></details>}
    {message&&<p role="status" className="notice">{message}</p>}
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
        <div style={{...inline,gap:7}}><a href={`/api/library/documents/${d.id}/file`}>Baixar</a><button type="button" className="secondary" onClick={()=>showHistory(d.id)}>Histórico</button>
          {manager&&<><button type="button" className="secondary" disabled={loading} onClick={()=>editMetadata(d)}>Editar dados</button><button type="button" className="secondary" disabled={loading} onClick={()=>review(d.id,'Validado')}>Validar</button><button type="button" className="secondary" disabled={loading} onClick={()=>review(d.id,'Rejeitado')}>Rejeitar</button></>}
          {(manager||(d.uploaded_by===user.id&&d.status==='Pendente'))&&<button type="button" className="secondary" disabled={loading} onClick={()=>removeDocument(d)}>Remover</button>}
        </div>
      </td>
    </tr>{history[d.id]&&<tr><td colSpan={6}><div className="notice"><b>Histórico do documento</b>{history[d.id].map(x=><p key={x.id} style={subtle}>{formatDate(x.time)} · {x.actor_name} · {x.action} · {x.detail}</p>)}</div></td></tr>}</React.Fragment>)}</tbody></table>
      {!filtered.length&&<p className="notice">Nenhum documento corresponde aos filtros.</p>}
    </div>
    <p className="notice">O status “Validado” representa conferência humana, não habilitação automática. A validade é um metadado informado pela equipe e deve ser conferida no PDF original.</p>
  </section>;
}
