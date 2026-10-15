const norm=s=>String(s||'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
export function groundedField(field){
 if(!field?.value)return field;
 const evidence=field.evidence||[];
 if(!evidence.length)return {...field,value:null,note:'Informação sem referência documental. Necessita conferência no original.'};
 const supported=evidence.some(e=>norm(e.quote).includes(norm(field.value)));
 return supported?field:{...field,value:evidence.map(e=>e.quote).join('\n\n'),note:'Exibidos trechos citados, em lugar da síntese livre. Confira contexto, exceções e completude no original.'};
}
export function reportQuality(detail){
 const fields=detail.summary?.fields||[];const get=id=>fields.find(f=>f.label===id);
 const object=detail.oficial?.objetoCompra||detail.titulo||'';
 const technology=/\bsaas\b|licenciamento.{0,60}(plataforma|software)|hospedagem.{0,30}(web|site|servidor)/i.test(object);
 const notices=[];
 if(technology)notices.push('Atenção ao enquadramento: o objeto indica software/infraestrutura digital. “Hospedagem” não comprova serviço de hotelaria. Confirme a compatibilidade comercial antes de preparar a participação.');
 const missing=fields.filter(f=>/^b2_/.test(f.label)&&!f.value).length;
 if(missing)notices.push('Habilitação incompleta no resumo: '+missing+' categorias sem extração confirmada. Páginas lidas não significam checklist completo. Confira aviso, edital e anexos antes de participar.');
 if(!get('b5_1')?.value&&get('b6_8')?.evidence?.some(e=>/vig[eê]ncia|implanta[çc][aã]o|ordem de in[ií]cio/i.test(e.quote)))notices.push('Prazo encontrado em outra seção: confira as referências cruzadas em Vigência. Não foi concluída a equivalência entre assinatura, aceite operacional e ordem de início.');
 const portal=detail.officialCollection?.fields?.find(f=>f.id==='b4_1')?.value;
 if(portal&&get('b4_1')?.value)notices.push('Itens do portal e dos documentos são fontes distintas. Compare unidade, quantidade, valor mensal e valor global; um contrato com quantidade 1 pode abranger várias mensalidades. Diferenças não foram conciliadas automaticamente.');
 if(get('b7_4')?.evidence?.some(e=>/x{3,}/i.test(e.quote)))notices.push('Campos em branco ou “xxxxx” em minuta são campos a preencher na contratação. Isoladamente, não comprovam irregularidade nem necessidade de esclarecimento oficial.');
 const reformulated=fields.filter(f=>f.value&&groundedField(f)?.value!==f.value).length;
 if(reformulated)notices.push(reformulated+' categorias usam trechos citados para evitar apresentar a síntese livre como informação comprovada. A pertinência e a completude exigem revisão humana.');
 return {technology,notices};
}
export function reportingField(detail,id){
 let field=detail.summary?.fields?.find(f=>f.label===id);
 if(id==='b5_1'&&!field?.value){const evidence=(detail.summary?.fields?.find(f=>f.label==='b6_8')?.evidence||[]).filter(e=>/vig[eê]ncia|implanta[çc][aã]o|ordem de in[ií]cio/i.test(e.quote));if(evidence.length)field={label:id,value:evidence.map(e=>e.quote).join('\n\n'),evidence,note:'Referência cruzada do cronograma; confira o marco de início em cada documento.'};}
 return groundedField(field);
}
