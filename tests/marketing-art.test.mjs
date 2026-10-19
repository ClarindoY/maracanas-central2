import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {renderArt} from '../src/marketing-art.mjs';
import {DEFAULT_APPEARANCE} from '../shared/marketing.mjs';

test('Texto puro usa só branco e preto, ignora imagens e não desenha cabeçalho ou rodapé',async()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>createCanvas(1080,1350)};
 try{
 assert.equal(DEFAULT_APPEARANCE.template,'Texto puro');
 const canvas=await renderArt({heading:'',text:'Uma nova oportunidade começa com uma boa preparação.'},0,4,{...DEFAULT_APPEARANCE,photo:'imagem-inexistente',signature:'Não desenhar'},{name:'Não desenhar',logo:'logo-inexistente'});
 const ctx=canvas.getContext('2d'),pixels=ctx.getImageData(0,0,1080,1350).data;let dark=0;
 for(let y=0;y<1350;y++)for(let x=0;x<1080;x++){const offset=(y*1080+x)*4,r=pixels[offset],g=pixels[offset+1],b=pixels[offset+2];assert.equal(r,g);assert.equal(g,b);if(y<200||y>1150)assert.equal(r,255);if(r<50)dark++;}
 assert.ok(dark>1000);assert.equal(canvas.width,1080);assert.equal(canvas.height,1350);
 await assert.rejects(renderArt({heading:'',text:'Texto longo '.repeat(2000)},0,1,DEFAULT_APPEARANCE),/Texto longo/);
 }finally{globalThis.document=old;}
});
