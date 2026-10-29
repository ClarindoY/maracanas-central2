// Accept only expected unique fields; a missing category is not evidence of absence.
export function reconcileBlockFields(expected,fields){
 const accepted=[];const seen=new Set();
 if(!Array.isArray(fields))return {accepted,missing:[...expected]};
 for(const f of fields){
  if(!f||!expected.includes(f.label)||seen.has(f.label)||!(f.value===null||typeof f.value==='string')||!Array.isArray(f.evidence))continue;
  if(f.evidence.some(e=>!e||typeof e.documentId!=='string'||!Number.isInteger(e.page)||e.page<1||typeof e.quote!=='string'))continue;
  seen.add(f.label);accepted.push({label:f.label,value:f.value,evidence:f.evidence});
 }
 return {accepted,missing:expected.filter(label=>!seen.has(label))};
}
