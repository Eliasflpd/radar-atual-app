import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';
const [,, idxArg, outDir, pagesArg, scaleArg] = process.argv;
const dir='D:/MEUS ESTUDOS/MARIA';
const files=fs.readdirSync(dir).filter(f=>f.toLowerCase().endsWith('.pdf')).sort();
const file=dir+'/'+files[+idxArg];
const scale = parseFloat(scaleArg||'1.5');
const data = new Uint8Array(fs.readFileSync(file));
const doc = await getDocument({ data, verbosity: 0 }).promise;
const pages = pagesArg && pagesArg!=='all' ? pagesArg.split(',').map(Number) : Array.from({length:doc.numPages},(_,i)=>i+1);
fs.mkdirSync(outDir,{recursive:true});
for (const p of pages) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  fs.writeFileSync(`${outDir}/p${String(p).padStart(3,'0')}.jpg`, canvas.toBuffer('image/jpeg', 85));
}
console.log('ok', files[+idxArg], pages.length, 'paginas', Math.ceil(doc.getPage ? (await doc.getPage(1)).getViewport({scale}).width : 0)+'px');
