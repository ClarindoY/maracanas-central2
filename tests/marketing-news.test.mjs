import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterNews,searchMarketingNews} from '../server/marketing-news.mjs';
const now=Date.parse('2026-10-25T15:00:00Z');
const sources=[{id:0,title:'Fonte',url:'https://example.org/noticia'}];
const item={title:'Notícia de teste',summary:'Resumo',angle:'Uma abordagem',reason:'Relevância ao público',potential:'Alto',sourceId:0,publishedAt:'2026-10-25T10:00:00-03:00'};
test('notícias rejeitam fontes desconhecidas, datas futuras, antigas e data sem hora na borda',()=>{
 const items=[item,{...item,sourceId:99},{...item,publishedAt:'2026-10-26T13:00:00Z'},{...item,publishedAt:'2026-10-23T13:00:00Z'},{...item,publishedAt:'2026-10-25'},{...item,publishedAt:'2026-02-31'},{...item,publishedAt:'ontem'}];
 assert.equal(filterNews(items.slice(0,6),sources,now-86400000,now).length,1);
 assert.equal(filterNews([items[6]],sources,now-86400000,now).length,0);
 assert.equal(filterNews([{...item,publishedAt:'2026-10-24'}],sources,now-48*3600000,now).length,1);
});
test('busca usa web primeiro, organiza fontes e preserva sugestões do Google',async()=>{
 const calls=[];const dna={data:{topics:'Licitações',audience:'Empresas',name:'Nome privado'}};
 const result=await searchMarketingNews(async r=>{calls.push(r);return r.googleSearch?{text:'Notícia publicada em 25/10/2026 às 13h UTC.',grounding:{webSearchQueries:['licitações recentes'],groundingChunks:[{web:{uri:sources[0].url,title:'Fonte'}}],searchEntryPoint:{renderedContent:'<p>Google</p>'}}}:{parsed:{ideas:[item]}};},dna,24,now);
 assert.equal(calls[0].googleSearch,true);assert.equal(calls[0].input.topics,'Licitações');assert.equal(calls[0].input.name,undefined);assert.equal(result.ideas.length,1);assert.equal(result.ideas[0].source.url,sources[0].url);assert.equal(result.searchSuggestions,'<p>Google</p>');
});
test('ausência de pesquisa gera erro, ausência de fonte gera vazio e não inventa notícias',async()=>{
 const dna={data:{topics:'Tema',audience:'Público'}};
 await assert.rejects(searchMarketingNews(async()=>({text:'Suposição',grounding:{}}),dna,24,now),e=>e.status===502);
 const result=await searchMarketingNews(async()=>({grounding:{webSearchQueries:['tema'],groundingChunks:[]}}),dna,48,now);assert.deepEqual(result.ideas,[]);
 await assert.rejects(searchMarketingNews(async()=>{throw Error('Não chamar')},dna,72,now),e=>e.status===400);
});
