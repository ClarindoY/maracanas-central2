// Compare whole numeric tokens; never accept 100 merely because a quote has 1000.
export function numericTokens(text,{stripList=false}={}){
 const source=stripList?String(text).replace(/^\s*\d+[.)]\s+/gm,''):String(text);
 return (source.match(/\d+(?:[.,/:-]\d+)*(?:\s*%)?/g)||[]).map(raw=>{
 const token=raw.replace(/\s/g,'');
 if(/[/:\-]/.test(token))return token;
 const percent=token.endsWith('%')?'%':'',n=token.replace(/%$/,'');
 let normalized=n;
 if(n.includes(',')&&/^\d{1,3}(?:\.\d{3})*,\d+$|^\d+,\d+$/.test(n))normalized=n.replaceAll('.','').replace(',','.');
 else if(/^\d{1,3}(?:\.\d{3})+$/.test(n))normalized=n.replaceAll('.','');
 if(!/^\d+(?:\.\d+)?$/.test(normalized))return token;
 const [whole,fraction='']=normalized.split('.');const tail=fraction.replace(/0+$/,'');return whole.replace(/^0+(?=\d)/,'')+(tail?'.'+tail:'')+percent;
 });
}
export function numbersSupported(value,evidence){
 const supported=new Set(evidence.flatMap(e=>numericTokens(e.quote)));
 return numericTokens(value,{stripList:true}).every(n=>supported.has(n));
}
