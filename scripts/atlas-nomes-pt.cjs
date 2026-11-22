// Nomes dos lugares do Atlas na forma da Almeida.
// Para cada lugar que ainda está com o nome em inglês (OpenBible), procura nos próprios versículos do lugar
// a palavra da Almeida que mais se parece com o nome (mesma técnica usada para os personagens).
// Saída: scripts/lugares-pt.json ({ id: nome }) e atualização do campo "nome" de public/nexus/atlas-dados.json
// (o nome original continua em "en"). Nada é inventado: sem palavra parecida no texto, o nome fica como está.
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..');
const arqAtlas = path.join(RAIZ, 'public', 'nexus', 'atlas-dados.json');
const atlas = JSON.parse(fs.readFileSync(arqAtlas, 'utf8'));
const BIB = JSON.parse(fs.readFileSync(path.join(RAIZ, 'public', 'biblia.json'), 'utf8').replace(/^[^\[]*/, ''));
const textoVerso = (k) => { const b = Math.floor(k / 1e6), c = Math.floor((k % 1e6) / 1e3), v = k % 1e3; try { return BIB[b - 1].chapters[c - 1][v - 1] || ''; } catch (_) { return ''; } };
const fon = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '').replace(/ph/g, 'f').replace(/th/g, 't').replace(/sh/g, 's').replace(/ch/g, 'c').replace(/qu/g, 'c').replace(/k/g, 'c').replace(/y/g, 'i').replace(/j/g, 'i').replace(/z/g, 's').replace(/w/g, 'v').replace(/h/g, '').replace(/(.)\1+/g, '$1').replace(/s$/, '');
function lev(a, b) { const m = a.length, n = b.length; const d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
const PALAVRA = /[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõçü]+(?:-[A-ZÁÉÍÓÚÂÊÔÃÕÇ]?[a-záéíóúâêôãõçü]+)*/g;
function nomeNaAlmeida(nome, versos) {
  const alvo = fon(nome); if (alvo.length < 2) return null;
  const cand = new Map();
  for (const k of versos.slice(0, 20)) for (const w of new Set(textoVerso(k).match(PALAVRA) || [])) {
    const f = fon(w); if (!f || f[0] !== alvo[0]) continue; const r = lev(f, alvo) / Math.max(f.length, alvo.length);
    if (r <= 0.34) { const c = cand.get(w) || { w, r, n: 0 }; c.n++; cand.set(w, c); }
  }
  let melhor = null; for (const c of cand.values()) { const sc = c.r - 0.06 * Math.min(4, c.n - 1); if (!melhor || sc < melhor.sc) melhor = { ...c, sc }; }
  return melhor ? melhor.w : null;
}
// formas compostas: a parte genérica é traduzida; o nome próprio vem da Almeida
const FORMAS = [
  [/^City of (.+)$/, 'Cidade de $'], [/^Valley of (.+)$/, 'Vale de $'], [/^(.+) Valley$/, 'Vale de $'], [/^Mount (.+)$/, 'Monte $'], [/^Mountains of (.+)$/, 'Montes de $'],
  [/^Sea of (.+)$/, 'Mar de $'], [/^Brook (.+)$/, 'Ribeiro de $'], [/^Brook of (.+)$/, 'Ribeiro de $'], [/^River (.+)$/, 'Rio $'], [/^(.+) River$/, 'Rio $'], [/^Wilderness of (.+)$/, 'Deserto de $'],
  [/^Pool of (.+)$/, 'Tanque de $'], [/^Gate of (.+)$/, 'Porta de $'], [/^Tower of (.+)$/, 'Torre de $'], [/^Plain of (.+)$/, 'Planície de $'], [/^Land of (.+)$/, 'Terra de $'],
];
const mapa = {}; let feitos = 0, ficaram = 0;
for (const l of atlas.lugares) {
  const base = String(l.en).replace(/ [0-9]+$/, '');
  if (l.nome !== base) continue;   // já tem nome em português (mapa do gerador)
  let pt = null;
  const f = FORMAS.find(([re]) => re.test(base));
  if (f) { const nucleo = base.match(f[0])[1]; const nn = /^[A-Z]/.test(nucleo) ? (nomeNaAlmeida(nucleo, l.versos) || null) : null; if (nn) pt = f[1].replace('$', nn); }
  else if (!/\s/.test(base)) pt = nomeNaAlmeida(base, l.versos);
  else { const partes = base.split('-'); if (partes.length > 1 && !/\s/.test(base)) pt = nomeNaAlmeida(base, l.versos); }
  if (pt && pt !== base) { mapa[l.id] = pt; l.nome = pt; l.nomeOrigem = 'almeida'; feitos++; } else ficaram++;
}
fs.writeFileSync(path.join(__dirname, 'lugares-pt.json'), JSON.stringify(mapa, null, 1));
fs.writeFileSync(arqAtlas, JSON.stringify(atlas));
console.log(JSON.stringify({ derivados: feitos, ficaramComoNaFonte: ficaram, exemplos: Object.entries(mapa).slice(0, 25).map(([id, n]) => atlas.lugares.find((x) => x.id === id).en + ' → ' + n) }, null, 1));
