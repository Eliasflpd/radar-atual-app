// EBD Adultos 4º tri 2026 — aplica a PALETA ORIGINAL da revista (Lições Bíblicas – Professor) nas 13 lições.
//   node scripts/ebd4-paleta.mjs          aplica (idempotente; faz backup em D:\BACKUP antes)
//   node scripts/ebd4-paleta.mjs --desfazer   tira o bloco de cores e volta ao visual anterior
// Só acrescenta um bloco de CSS no fim do <style> de cada licao-NN.html (e uma classe na faixa
// "LEITURA BÍBLICA EM CLASSE"); o texto das lições não é tocado.
// Cores medidas na revista: azul-marinho #0c2055 (título, faixas), azul #1458ad, vinho #962030 (faixa da
// leitura bíblica), creme #f9f5da (fundo da leitura bíblica).
import fs from 'fs';
import path from 'path';

const DIR = path.resolve(import.meta.dirname, '../public/ebd/adulto4/html');
const MARCA_INI = '/*paleta-original-2026-10-11*/';
const MARCA_FIM = '/*fim-paleta-original*/';
const CSS = `${MARCA_INI}
.titulo{color:#0c2055}
.data{color:#5b6b92}
.box-aureo{background:#f6f8fd;border:1.5px solid #0c2055;color:#0c2055}
.box-aureo .lbl{color:#fff;background:#0c2055;border-bottom:none}
.box-pratica{background:#f6f8fd;border:1.5px solid #1458ad;color:#0c2055}
.box-pratica .lbl{color:#fff;background:#1458ad;border-bottom:none}
.sec-head{color:#fff;background:#0c2055;border-top:none;border-radius:6px;padding:9px 10px;letter-spacing:2px}
.sec-head strong{color:#fff}
.sec-head.sec-leitura{background:#962030;margin-bottom:0;border-radius:6px 6px 0 0}
.bible-ref{background:#f9f5da;color:#0c2055;margin:0;padding:10px 12px 2px}
.bible-passage{background:#f9f5da;padding:2px 12px 10px;border-radius:0 0 8px 8px}
.verso-num{color:#962030}
.roman-head{color:#0c2055;background:#e8effa;border-left-color:#1458ad}
.subpoint strong:first-child{color:#0c2055}
.lbl-inline{color:#962030}
.bref{color:#1458ad}
${MARCA_FIM}`;

const desfazer = process.argv.includes('--desfazer');
const arqs = fs.readdirSync(DIR).filter(f => /^licao-\d\d\.html$/.test(f)).sort();
if (!desfazer) {
  const bk = 'D:/BACKUP/ebd-adulto4-licoes-antes-da-paleta-2026-10-11';
  if (!fs.existsSync(bk)) { fs.mkdirSync(bk, { recursive: true }); for (const f of arqs) fs.copyFileSync(path.join(DIR, f), path.join(bk, f)); console.log('backup em ' + bk); }
}
let mudou = 0;
for (const f of arqs) {
  const p = path.join(DIR, f); let h = fs.readFileSync(p, 'utf8'); const antes = h;
  h = h.replace(new RegExp(MARCA_INI.replace(/[*/]/g, '\\$&') + '[\\s\\S]*?' + MARCA_FIM.replace(/[*/]/g, '\\$&')), '');
  h = h.replace(' sec-leitura">', '">');
  if (!desfazer) {
    h = h.replace('</style>', CSS + '</style>');
    h = h.replace('<p class="sec-head"><strong>LEITURA BÍBLICA EM CLASSE</strong></p>', '<p class="sec-head sec-leitura"><strong>LEITURA BÍBLICA EM CLASSE</strong></p>');
  }
  if (h !== antes) { fs.writeFileSync(p, h, 'utf8'); mudou++; }
}
console.log((desfazer ? 'desfeito em ' : 'paleta aplicada em ') + mudou + ' de ' + arqs.length + ' lições');
