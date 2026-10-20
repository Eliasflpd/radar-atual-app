// REVISTA OBREIRO APROVADO nº 115 (CPAD, 4º tri 2026, tema Missões) no RADAR — pedido do Elias, 20/10/2026,
// para acompanhar a lição de adultos. Junta as duas metades revisadas (D:\RADAR-AUDITORIAS\ebd-voz\obreiro-A.md e
// obreiro-B.md) e grava:
//   public/ebd/adulto4/html/obreiro-115.html  → a página de leitura (mesmo molde visual das páginas da EBD)
//   public/ebd/adulto4/voz/obreiro.json       → as seções (título, autor, texto) que o globo de voz lê
// Uso: node scripts/ebd-obreiro.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEM = process.env.OBREIRO_ORIGEM || 'D:/RADAR-AUDITORIAS/ebd-voz';
const md = ['obreiro-A.md', 'obreiro-B.md'].map((f) => fs.readFileSync(path.join(ORIGEM, f), 'utf8').replace(/\r/g, '').trim()).join('\n\n');

// seções = cada "## "
const secoes = [];
let atual = null;
for (const l of md.split('\n')) {
  if (/^## /.test(l)) { atual = { titulo: l.slice(3).trim(), autor: '', texto: '' }; secoes.push(atual); continue; }
  if (!atual) continue;
  if (!atual.autor && /^\*[^*].*\*$/.test(l.trim()) && !atual.texto.trim()) { atual.autor = l.trim().replace(/^\*|\*$/g, ''); continue; }
  atual.texto += l + '\n';
}
for (const s of secoes) s.texto = s.texto.replace(/\n{3,}/g, '\n\n').trim();

const voz = { revista: 'Obreiro Aprovado nº 115 (CPAD), 4º trimestre de 2026', tema: 'Missões — Teologia Bíblica de Missões e a realidade missionária hoje',
  secoes: secoes.map((s, i) => ({ n: i + 1, titulo: s.titulo, autor: s.autor, texto: s.texto })) };
fs.writeFileSync(path.join(RAIZ, 'public', 'ebd', 'adulto4', 'voz', 'obreiro.json'), JSON.stringify(voz));

// página
const modelo = fs.readFileSync(path.join(RAIZ, 'public', 'ebd', 'adulto4', 'html', 'apoio-01.html'), 'utf8');
const HEAD = modelo.slice(0, modelo.indexOf('<body>'));
const SCRIPTS = modelo.slice(modelo.lastIndexOf('<script>', modelo.indexOf('/ebd/hifen.js')));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1<em>$2</em>')
  .replace(/\[\^(\d+)\]/g, '<sup>$1</sup>');
const out = ['<div class="cap">Revista Obreiro Aprovado · nº 115</div>', '<div class="titulo">Missões</div>',
  '<div class="data">CPAD · 4º Trimestre 2026 · para acompanhar a lição de Adultos</div>'];
out.push('<p class="sec-head">NESTA EDIÇÃO</p>');
secoes.forEach((s, i) => out.push(`<p style="text-align:left;margin:0 0 6px"><a href="#s${i + 1}" style="color:#1d3a8a;text-decoration:none;font-weight:700">${i + 1}. ${esc(s.titulo)}</a>${s.autor ? ' <span style="color:#777">— ' + esc(s.autor) + '</span>' : ''}</p>`));
secoes.forEach((s, i) => {
  out.push(`<p class="roman-head" id="s${i + 1}">${esc(s.titulo)}</p>`);
  if (s.autor) out.push(`<p style="text-align:left;color:#7b0000;font-style:italic;margin-top:-4px">${esc(s.autor)}</p>`);
  for (const l of s.texto.split('\n')) {
    const t = l.trim();
    if (!t) continue;
    if (/^### /.test(t)) { out.push(`<p class="subpoint"><strong>${inline(t.slice(4))}</strong></p>`); continue; }
    if (/^> /.test(t)) { out.push(`<p style="font-style:italic;color:#555;border-left:4px solid #c9a14a;padding:6px 12px;text-align:left">${inline(t.slice(2))}</p>`); continue; }
    if (/^\[\^\d+\]:/.test(t)) { out.push(`<p style="font-size:16px;text-align:left">${inline(t.replace(/^\[\^(\d+)\]:\s*/, '$1. '))}</p>`); continue; }
    out.push(`<p>${inline(t.replace(/^[-*] /, '• '))}</p>`);
  }
});
fs.writeFileSync(path.join(RAIZ, 'public', 'ebd', 'adulto4', 'html', 'obreiro-115.html'), HEAD + '<body>\n' + out.join('\n') + '\n' + SCRIPTS);
console.log(`✔ Obreiro Aprovado 115: ${secoes.length} seções →`, secoes.map((s) => s.titulo).join(' | '));
