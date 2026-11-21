// Gera os dados da camada 6 (Línguas originais) do Céu Infinito do NEXUS a partir do STEPBible Data (Tyndale House,
// CC BY 4.0 — github.com/STEPBible/STEPBible-Data): TAHOT (hebraico/aramaico palavra por palavra), TAGNT (grego),
// TBESH e TBESG (léxicos breves). Para cada lema (Strong estendido): a palavra, a transliteração, o sentido curto (inglês),
// a definição resumida e TODOS os versículos onde ocorre (versificação inglesa, a mesma da Almeida).
// Uso: node scripts/linguas-gerar.cjs <pasta com f1..f8.txt baixados do STEPBible>
const fs = require('fs'), path = require('path'), readline = require('readline');
const dir = process.argv[2];
const ordemArq = ['f3.txt', 'f6.txt', 'f5.txt', 'f4.txt', 'f2.txt', 'f1.txt'];   // Gn–Dt, Js–Et, Jó–Ct, Is–Ml, Mt–Jo, At–Ap
const livroNum = new Map(); let proxLivro = 1;
const lemas = new Map();   // dStrong -> { n, versos:Set }
function nota(s, k) { let l = lemas.get(s); if (!l) { l = { n: 0, versos: new Set() }; lemas.set(s, l); } l.n++; l.versos.add(k); }
async function lerTexto(arq) {
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(dir, arq), 'utf8'), crlfDelay: Infinity });
  for await (const linha of rl) {
    const m = /^([1-3]?[A-Z][a-z]+)\.(\d+)\.(\d+)[^#]*#\d+/.exec(linha); if (!m) continue;
    if (!livroNum.has(m[1])) livroNum.set(m[1], proxLivro++);
    const k = livroNum.get(m[1]) * 1e6 + (+m[2]) * 1e3 + (+m[3]);
    const c = linha.split('\t');
    if (arq === 'f1.txt' || arq === 'f2.txt') { const s = (c[3] || '').split('=')[0].trim(); if (/^G\d{4}[A-Z]?$/.test(s)) nota(s, k); }
    else { const s = (c[8] || '').trim(); if (/^H\d{4}[A-Z]?$/.test(s)) nota(s, k); }
  }
}
const limpar = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
function lerLexico(arq, lex) {
  for (const linha of fs.readFileSync(path.join(dir, arq), 'utf8').split(/\r?\n/)) {
    const c = linha.split('\t'); if (!/^[HG]\d{4}/.test(c[0] || '')) continue;
    const ds = (c[1] || '').split('=')[0].trim(); if (!/^[HG]\d{4}[A-Z]?$/.test(ds) || lex.has(ds)) continue;
    lex.set(ds, { w: (c[3] || '').trim(), t: (c[4] || '').trim(), m: (c[5] || '').trim(), g: (c[6] || '').trim(), d: limpar(c[7]).slice(0, 220) });
  }
}
// versos em texto compacto: diferenças sucessivas em base 36, separadas por vírgula
const compactar = (ks) => { let ant = 0; return ks.map((k) => { const d = k - ant; ant = k; return d.toString(36); }).join(','); };
(async () => {
  for (const a of ordemArq) await lerTexto(a);
  const lex = new Map(); lerLexico('f8.txt', lex); lerLexico('f7.txt', lex);
  const saida = []; let semLex = 0;
  for (const [s, l] of lemas) {
    const x = lex.get(s) || lex.get(s.replace(/[A-Z]$/, '')) || null; if (!x) semLex++;
    const ks = [...l.versos].sort((a, b) => a - b);
    // âncora: versículo do meio das ocorrências, no livro onde o lema mais aparece (é onde a estrela fica)
    const porLivro = new Map(); for (const k of ks) { const b = Math.floor(k / 1e6); porLivro.set(b, (porLivro.get(b) || 0) + 1); }
    const bM = [...porLivro.entries()].sort((a, b) => b[1] - a[1])[0][0], doLivro = ks.filter((k) => Math.floor(k / 1e6) === bM);
    saida.push({ s, w: x ? x.w : '', t: x ? x.t : '', m: x ? x.m : '', g: x ? x.g : '', d: x ? x.d : '', n: l.n, k: doLivro[Math.floor(doLivro.length / 2)], nv: ks.length, v: compactar(ks) });
  }
  saida.sort((a, b) => b.n - a.n);
  const pasta = path.join(__dirname, '..', 'public', 'nexus', 'camadas'), destino = path.join(pasta, 'linguas.json');
  fs.writeFileSync(destino, JSON.stringify({
    fonte: 'STEPBible Data (Tyndale House, Cambridge), CC BY 4.0 — TAHOT, TAGNT, TBESH, TBESG · github.com/STEPBible/STEPBible-Data',
    aviso: 'Sentidos curtos e definições em inglês, como no léxico da fonte. No Novo Testamento entram as palavras de todas as edições gregas comparadas pela fonte (NA27/28, SBL, TR, Byzantina…); algumas existem só em parte delas.',
    livros: livroNum.size, lemas: saida.map(({ s, w, t, m, g, n, k, nv }) => ({ s, w, t, m, g, n, k, nv })),
  }));
  // detalhes (definição + todos os versículos), na mesma ordem: carregados só depois que a camada abre
  fs.writeFileSync(path.join(pasta, 'linguas-detalhes.json'), JSON.stringify(saida.map(({ d, v }) => [d, v])));
  console.log('livros', livroNum.size, '· lemas', saida.length, '(hebraico/aramaico', saida.filter((x) => x.s[0] === 'H').length, '· grego', saida.filter((x) => x.s[0] === 'G').length, ') · sem léxico', semLex, '· tamanho', (fs.statSync(destino).size / 1e6).toFixed(2), 'MB · detalhes', (fs.statSync(path.join(pasta, 'linguas-detalhes.json')).size / 1e6).toFixed(2), 'MB');
  console.log('top:', saida.slice(0, 8).map((x) => `${x.s} ${x.w} ${x.g} ${x.n}`).join(' | '));
})();
