import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {openAuth,permissions} from '../server/auth.mjs';import {openWorkspace} from '../server/workspace.mjs';import {openLibrary} from '../server/library.mjs';
import {documentRadar} from '../server/document-radar.mjs';import {compare,buildProfile} from '../server/document-match.mjs';
import {pdf} from './fixtures/document-pdf.mjs';
test('PDFs por empresa → pesquisa PNCP → conferência de edital e indisponibilidade',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'radar-'));const auth=openAuth(join(dir,'base.sqlite')),work=openWorkspace(auth,join(dir,'docs')),lib=openLibrary(auth,join(dir,'lib'));
 const u={id:'tester',nome:'Teste',admin:true,permissoes:permissions};
 try{auth.db.prepare('INSERT INTO users(id,name,login,email,password,permissions) VALUES(?,?,?,?,?,?)').run(u.id,u.nome,'teste','teste@local','unused','[]');
 const upload=(companyId,category,name,text)=>lib.upload(u,{companyId,category,name},pdf(text));
 const a=upload('rep','Atestados','Atestado.pdf','Atestamos a prestacao de servicos de hospedagem e hotelaria.');upload('rep','Balanços','Balanco.pdf','Balanco do exercicio 2025: Liquidez corrente: 1,25.');upload('maracanas','Atestados','Outro.pdf','Fornecimento de software de contabilidade no exercicio.');
 await lib.indexBatch(u,'rep');await lib.indexBatch(u,'maracanas');
 let offline=false;const x={orgao_cnpj:'12345678000199',ano:'2026',numero_sequencial:'8',description:'Servicos de hospedagem',informacao_complementar:'Liquidez corrente superior a 1,25.'};
 const radar=documentRadar({library:lib,work,remote:async url=>{assert.equal(url.searchParams.get('q'),'hospedagem');if(offline)throw Error();return {items:[x,x,{...x,numero_sequencial:'9',description:'Computadores'}],total:3};}});
 const args={action:'search',companyId:'rep',term:'hospedagem'};const result=await radar(u,args);assert.equal(result.items.length,1);assert.equal(result.items[0].evidence[0].id,a.id);assert.equal(result.items[0].finance[0].values[0].checks[0].meets,false);
 await assert.rejects(radar(u,{...args,companyId:'maracanas'}),e=>e.status===400);await assert.rejects(radar({...u,admin:false,permissoes:['Buscar editais']},args),e=>e.status===403);
 const t=work.create(u,{titulo:x.description,fonte:'PNCP'});const d=await radar(u,{action:'detail',companyId:'rep',tenderId:t.id});assert.equal(d.read,0);assert.equal(d.demands.length,0);
 offline=true;assert.equal((await radar(u,args)).cached,true);auth.db.prepare("UPDATE library_documents SET status='Removido' WHERE id=?").run(a.id);await assert.rejects(radar(u,args),e=>e.status===400);
 }finally{auth.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('índices revisados com evidência e limites inclusivos',()=>{
 const reviewed=JSON.stringify({financial:{ratios:{liquidez_corrente:{value:1,fields:['ativo_circulante']}},values:{ativo_circulante:{source:{page:2,quote:'Ativo circulante 10.000'}}}}});
 const p=buildProfile([{id:'b',name:'Balanço',category:'Balanços',status:'Validado',indexing_status:'indexado',text_content:'Dados do balanço.',reviewed}]);
 const v=compare(p,'','LC >= 1.').finance[0].values[0];assert.equal(v.checks[0].meets,true);assert.match(v.quote,/pág. 2/);assert.equal(compare(p,'','LC >= 10%').demands.length,0);
});
