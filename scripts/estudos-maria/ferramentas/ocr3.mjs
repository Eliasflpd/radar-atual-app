import { createWorker } from 'tesseract.js';
import fs from 'fs';
const [,, imgDir, outJson] = process.argv;
const worker = await createWorker('por', 1, { cachePath: './tessdata', logger: ()=>{} });
const files = fs.readdirSync(imgDir).filter(f=>f.endsWith('.jpg')).sort();
const pages=[]; const t0=Date.now();
for (const f of files) {
  const { data } = await worker.recognize(`${imgDir}/${f}`, {}, { blocks: true });
  const lines=[];
  for (const b of (data.blocks||[])) for (const par of b.paragraphs) for (const ln of par.lines)
    lines.push({ conf: Math.round(ln.confidence), x0: ln.bbox.x0, y0: ln.bbox.y0, x1: ln.bbox.x1, y1: ln.bbox.y1,
      words: ln.words.map(w=>({t:w.text, c:Math.round(w.confidence)})) });
  pages.push({ file: f, lines });
  console.log(f, lines.length, 'linhas', Math.round((Date.now()-t0)/1000)+'s');
}
await worker.terminate();
fs.writeFileSync(outJson, JSON.stringify(pages));
