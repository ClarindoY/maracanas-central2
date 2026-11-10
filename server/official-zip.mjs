import AdmZip from 'adm-zip';
import {inflateRawSync,crc32} from 'node:zlib';

export function unpackOfficial(bytes,title){
 if(bytes.subarray(0,5).toString()==='%PDF-')return [{title,bytes}];
 if(bytes.readUInt16LE(0)!==0x4b50)return [{title,reason:'Formato não PDF'}];
 const entries=new AdmZip(bytes).getEntries().filter(e=>!e.isDirectory);
 if(entries.length>100)throw Error('ZIP excede 100 arquivos.');
 let total=0;
 return entries.map(entry=>{
  const name=entry.entryName;
  if(!/\.pdf$/i.test(name))return {title:name,reason:'Anexo não PDF'};
  const h=entry.header;
  if(h.size<1||h.size>20*1024*1024||(total+=h.size)>80*1024*1024)throw Error('ZIP excede o limite de leitura.');
  if(h.flags&1||![0,8].includes(h.method))return {title:name,reason:'PDF compactado com método indisponível ou senha'};
  const compressed=entry.getCompressedData();
  const data=h.method===8?inflateRawSync(compressed,{maxOutputLength:h.size}):compressed;
  if(data.length!==h.size||crc32(data)!==h.crc||data.subarray(0,5).toString()!=='%PDF-')return {title:name,reason:'Conteúdo PDF inválido'};
  return {title:name,bytes:data};
 });
}
