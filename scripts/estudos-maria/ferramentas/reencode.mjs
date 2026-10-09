import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';
const [,, inDir, outDir, widthArg, qArg] = process.argv;
const W=+widthArg||800, Q=+qArg||72;
fs.mkdirSync(outDir,{recursive:true});
let total=0;
for (const f of fs.readdirSync(inDir).filter(f=>f.endsWith('.jpg')).sort()) {
  const img=await loadImage(inDir+'/'+f);
  const w=Math.min(W,img.width), h=Math.round(img.height*w/img.width);
  const c=createCanvas(w,h); const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,w,h);
  const buf=c.toBuffer('image/jpeg',Q); fs.writeFileSync(outDir+'/'+f,buf); total+=buf.length;
}
console.log(outDir, Math.round(total/1024)+'KB');
