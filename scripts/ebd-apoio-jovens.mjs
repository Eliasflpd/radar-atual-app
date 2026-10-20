// LIVRO DE APOIO DOS JOVENS no RADAR (20/10/2026, pedido do Elias): "Regozijai-vos no Senhor" (CPAD, Jovens,
// 4º tri 2026). Lê os capítulos revisados (D:\RADAR-AUDITORIAS\ebd-voz\jovens\cap-NN.ok.md) e grava, para cada
// lição dos jovens, apoio-NN.md (o globo de voz lê) e apoio-NN.html (a página do app, no MESMO molde visual da
// página de apoio dos adultos: cabeçalho de estilo copiado de adulto4/html/apoio-01.html, referência bíblica
// tocável e hifenização). Uso: node scripts/ebd-apoio-jovens.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEM = process.env.APOIO_JOVENS || 'D:/RADAR-AUDITORIAS/ebd-voz/jovens';
const DEST = path.join(RAIZ, 'public', 'ebd', 'jovem4', 'html');
const modelo = fs.readFileSync(path.join(RAIZ, 'public', 'ebd', 'adulto4', 'html', 'apoio-01.html'), 'utf8');
const HEAD = modelo.slice(0, modelo.indexOf('<body>'));
const SCRIPTS = modelo.slice(modelo.lastIndexOf('<script>', modelo.indexOf('/ebd/hifen.js')));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LIVROS = 'Gn|Êx|Ex|Lv|Nm|Dt|Js|Jz|Rt|Sm|Rs|Cr|Ed|Ne|Et|Jó|Sl|Pv|Ec|Ct|Is|Jr|Lm|Ez|Dn|Os|Jl|Am|Ob|Jn|Mq|Na|Hc|Sf|Ag|Zc|Ml|Mt|Mc|Lc|Jo|At|Rm|Co|Gl|Ef|Fp|Cl|Ts|Tm|Tt|Fm|Hb|Tg|Pe|Jd|Ap';
const REF = new RegExp(`\\b((?:[1-3] ?)?(?:${LIVROS}) \\d{1,3}\\.\\d{1,3}(?:[-–]\\d{1,3})?(?:[,;] ?\\d{1,3}(?:[-–]\\d{1,3})?)*)`, 'g');
function inline(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1<em>$2</em>')
    .replace(/\[\^(\d+)\]/g, '<sup>$1</sup>')
    .replace(REF, (m) => `<span class="bref" data-ref="${m}">${m}</span>`);
}
function paraHtml(md, n, titulo) {
  const L = md.replace(/\r/g, '').split('\n');
  const out = [`<div class="cap">Capítulo ${n}</div>`, `<div class="titulo">${esc(titulo)}</div>`,
    '<div class="data">Livro de Apoio · Jovens · 4º Trimestre 2026</div>'];
  const notas = [];
  for (const l of L) {
    const t = l.trim();
    if (!t || /^# /.test(t)) continue;
    if (/^\[\^\d+\]:/.test(t)) { notas.push(t); continue; }
    if (/^## /.test(t)) {
      const h = t.slice(3).trim();
      out.push(/^(INTRODU|CONCLUS)/i.test(h) ? `<p class="sec-head">${inline(h)}</p>` : `<p class="roman-head">${inline(h)}</p>`);
      continue;
    }
    if (/^### /.test(t)) { out.push(`<p class="subpoint"><strong>${inline(t.slice(4).trim())}</strong></p>`); continue; }
    if (/^> /.test(t)) { out.push(`<p style="font-style:italic;color:#555;border-left:4px solid #c9a14a;padding:6px 12px;text-align:left">${inline(t.slice(2))}</p>`); continue; }
    out.push(`<p>${inline(t)}</p>`);
  }
  if (notas.length) {
    out.push('<p class="sec-head">NOTAS</p>');
    for (const x of notas) out.push(`<p style="font-size:16px;text-align:left">${inline(x.replace(/^\[\^(\d+)\]:\s*/, '$1. '))}</p>`);
  }
  // capa ORIGINAL do livro (1ª página do PDF do Elias; skill capa-original)
  const capa = '<div data-capa="capa-livro-apoio" style="text-align:center;margin:4px 0 14px"><img src="/ebd/jovem4/img/capa-livro-apoio.jpg?v=1" alt="Capa" style="width:46%;max-width:210px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.28)"></div>';
  return HEAD + '<body>\n' + capa + '\n' + out.join('\n') + '\n' + SCRIPTS;
}

let n = 0;
for (let i = 1; i <= 13; i++) {
  const nn = String(i).padStart(2, '0');
  const f = [path.join(ORIGEM, `cap-${nn}.ok.md`), path.join(ORIGEM, `cap-${nn}.md`)].find((x) => fs.existsSync(x));
  if (!f) { console.log('  falta o capítulo', nn); continue; }
  const md = fs.readFileSync(f, 'utf8').replace(/\r/g, '');
  const titulo = ((md.match(/^# Capítulo \d+ — (.+)$/m) || [])[1] || '').trim();
  fs.writeFileSync(path.join(DEST, `apoio-${nn}.md`), md.replace(/^# .*\n+/, ''));
  fs.writeFileSync(path.join(DEST, `apoio-${nn}.html`), paraHtml(md, i, titulo));
  n++;
  if (!f.endsWith('.ok.md')) console.log('  ⚠ cap', nn, 'ainda SEM revisão');
}
console.log(`✔ ${n} capítulos do livro de apoio dos jovens em public/ebd/jovem4/html`);
