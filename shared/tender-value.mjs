export function tenderValue(t){
 const d=t.oficial||{};
 if(t.fonte==='PNCP')return d.orcamentoSigilosoCodigo===1&&typeof d.valorTotalEstimado==='number'&&Number.isFinite(d.valorTotalEstimado)&&d.valorTotalEstimado>0?d.valorTotalEstimado:null;
 return null;
}
export function valueRangeError(filters){
 const has=v=>v!==''&&v!==undefined&&v!==null;
 for(const k of ['minValue','maxValue'])if(has(filters[k])&&(!Number.isFinite(Number(filters[k]))||Number(filters[k])<0))return 'Informe valores válidos, iguais ou maiores que zero.';
 if(has(filters.minValue)&&has(filters.maxValue)&&Number(filters.minValue)>Number(filters.maxValue))return 'O valor mínimo não pode ser maior que o máximo.';
 return '';
}
export function matchesValue(t,filters){
 if(valueRangeError(filters))return false;
 const has=v=>v!==''&&v!==undefined&&v!==null;
 if(!has(filters.minValue)&&!has(filters.maxValue))return true;
 const value=tenderValue(t);return value!==null&&(!has(filters.minValue)||value>=Number(filters.minValue))&&(!has(filters.maxValue)||value<=Number(filters.maxValue));
}
