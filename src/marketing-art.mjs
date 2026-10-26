export function publicSlideCopy(block){
 const internal=/^(gancho|desenvolvimento|retenção|encerramento|abertura|cta|chamada para ação)\s*[:.!—-]?$/i;
 const raw=String(block.heading||'').trim();const heading=internal.test(raw)?'':raw;
 const body=String(block.text||'').trim().replace(/^(gancho|desenvolvimento|retenção|encerramento|abertura|cta|chamada para ação)\s*(?::\s*|\r?\n+)/i,'').trim();
 return heading&&heading!==body?heading+'\n\n'+body:body||heading;
}
export function loadImage(src){return new Promise((resolve,reject)=>{if(!src)return resolve(null);const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Não foi possível abrir a imagem. Escolha outro arquivo.'));image.src=src;});}
export async function prepareImage(file,kind='logo'){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Escolha um PNG, JPEG ou WebP.');
 if(file.size>8*1024*1024)throw Error('Use uma imagem de até 8 MB.');
 const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Falha ao ler imagem.'));reader.readAsDataURL(file);});
 const img=await loadImage(url);if(img.width*img.height>40000000)throw Error('Imagem muito grande. Use uma versão menor.');
 let side=kind==='logo'?640:1200;
 while(side>=160){const scale=Math.min(1,side/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL(kind==='logo'?'image/png':'image/jpeg',.82);if(data.length<=175000)return data;side=Math.floor(side*.75);}
 throw Error('A imagem não pôde ser reduzida. Escolha um arquivo mais simples.');
}
function wrap(ctx,text,width){return String(text).split('\n').flatMap(paragraph=>{const lines=[];let line='';for(const word of paragraph.split(/\s+/)){if(ctx.measureText(word).width>width){if(line)lines.push(line);line='';for(const char of word){if(ctx.measureText(line+char).width>width){lines.push(line);line='';}line+=char;}}else if(ctx.measureText(line+' '+word).width>width&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}return [...lines,line];});}
function contain(ctx,img,x,y,w,h){const s=Math.min(w/img.width,h/img.height);ctx.drawImage(img,x+(w-img.width*s)/2,y+(h-img.height*s)/2,img.width*s,img.height*s);}
function cover(ctx,img,x,y,w,h){const s=Math.max(w/img.width,h/img.height);ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,x+(w-img.width*s)/2,y+(h-img.height*s)/2,img.width*s,img.height*s);ctx.restore();}
export async function renderArt(block,index,total,appearance,brand){
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');
 if(appearance.template==='Texto puro'){
  ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,1080,1350);
  const copy=publicSlideCopy(block);
  let size=88,lines,height;
  while(size>=40){ctx.font=`900 ${size}px Arial`;lines=wrap(ctx,copy,888);height=lines.length*size*1.12;if(height<=730)break;size-=2;}
  if(height>730)throw Error('Texto longo para o modelo Texto puro. Encurte o slide para manter letras grandes e espaço em branco.');
  ctx.fillStyle='#000000';ctx.textAlign='left';ctx.textBaseline='top';
  let y=(1350-height)/2;for(const line of lines){ctx.fillText(line,96,y);y+=size*1.12;}
  return canvas;
 }
 const [logo,photo]=await Promise.all([loadImage(brand?.logo),loadImage(appearance.photo)]);
 const dark=appearance.template==='Impacto',editorial=appearance.template==='Editorial';const navy='#0B1730',ink=dark?'#FFFFFF':navy;
 ctx.fillStyle=dark?navy:'#FFFFFF';ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle=ink;ctx.font='600 22px Arial';ctx.fillText((brand?.name||'ESTÚDIO DE CRIAÇÃO').toUpperCase().slice(0,48),72,90);ctx.font='400 22px Arial';ctx.textAlign='right';ctx.fillText(String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0'),1008,90);ctx.textAlign='left';
 const maxHeight=photo?535:930;let size=46,titleLines,textLines,height;
 while(size>=24){ctx.font=`${editorial?'normal':'700'} ${size+30}px ${editorial?'Georgia':'Arial'}`;titleLines=wrap(ctx,block.heading,936);ctx.font=`400 ${size}px Arial`;textLines=wrap(ctx,block.text,936);height=titleLines.length*(size+40)+textLines.length*(size+16)+44;if(height<=maxHeight)break;size-=2;}
 if(height>maxHeight)throw Error('Texto demais para esta arte. Encurte o slide ou remova a foto para ganhar espaço.');
 let y=200;ctx.font=`${editorial?'normal':'700'} ${size+30}px ${editorial?'Georgia':'Arial'}`;for(const line of titleLines){ctx.fillText(line,72,y);y+=size+40;}y+=36;ctx.font=`400 ${size}px Arial`;for(const line of textLines){ctx.fillText(line,72,y);y+=size+16;}
 if(photo)cover(ctx,photo,editorial?0:72,770,editorial?1080:936,400);
 if(editorial&&!photo){ctx.strokeStyle='#d9dee7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(72,1130);ctx.lineTo(1008,1130);ctx.stroke();}
 if(logo){ctx.fillStyle='#FFFFFF';ctx.fillRect(64,1200,270,100);contain(ctx,logo,76,1212,246,76);}
 ctx.fillStyle=ink;ctx.font='400 22px Arial';ctx.textAlign=logo?'right':'left';ctx.fillText((appearance.signature||brand?.signature||'').slice(0,75),logo?1008:72,1265,logo?640:936);
 return canvas;
}
export async function artBlob(block,index,total,appearance,brand){const canvas=await renderArt(block,index,total,appearance,brand);return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Falha ao exportar imagem.')),'image/png'));}
