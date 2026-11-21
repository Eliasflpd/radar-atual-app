// Gera os dados da camada 8 (Manuscritos e crítica textual) do Céu Infinito do NEXUS a partir do STEPBible Data
// (Tyndale House, CC BY 4.0): no NT, quais palavras existem só em parte das edições gregas comparadas (NA28/NA27,
// SBL, Tyndale, Westcott-Hort, Tregelles, Textus Receptus, Bizantina) e os trechos que o NA28 põe entre colchetes
// duplos; no AT, onde o texto lido (Qere) difere do escrito (Ketiv), onde há palavras restauradas ou vindas da LXX e
// onde outros manuscritos hebraicos diferem do Códice de Leningrado. Uso: node scripts/manuscritos-gerar.cjs <pasta>
const fs = require('fs'), path = require('path'), readline = require('readline');
const dir = process.argv[2];
const ordemArq = ['f3.txt', 'f6.txt', 'f5.txt', 'f4.txt', 'f2.txt', 'f1.txt'];
const livroNum = new Map(); let prox = 1;
const TODAS = ['NA28', 'NA27', 'Tyn', 'SBL', 'WH', 'Treg', 'TR', 'Byz'];
const versos = new Map();   // k -> registro
const reg = (k) => { let r = versos.get(k); if (!r) { r = { k, qk: 0, lxx: 0, rest: 0, ms: 0, semNA: 0, semTR: 0, cd: 0, alt: 0, ex: [] }; versos.set(k, r); } return r; };
const limpar = (t) => String(t || '').replace(/\s+/g, ' ').trim();
async function ler(arq) {
  const nt = arq === 'f1.txt' || arq === 'f2.txt'; let colchete = false;
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(dir, arq), 'utf8'), crlfDelay: Infinity });
  for await (const linha of rl) {
    const m = /^([1-3]?[A-Z][a-z]+)\.(\d+)\.(\d+)[^#]*#\d+=([^\t]*)/.exec(linha); if (!m) continue;
    if (!livroNum.has(m[1])) livroNum.set(m[1], prox++);
    const k = livroNum.get(m[1]) * 1e6 + (+m[2]) * 1e3 + (+m[3]), c = linha.split('\t'), tipo = m[4];
    if (nt) {
      const ed = new Set((c[5] || '').split('+').map((x) => x.trim()).filter(Boolean)), palavra = limpar(c[1]), sentido = limpar(c[2]);
      if (/\[\[/.test(c[1] || '') || /\[\[/.test(c[8] || '')) colchete = true;
      const r = (colchete || ed.size < TODAS.length || /in: /.test(c[6] || '')) ? reg(k) : null;
      if (r) {
        if (colchete) r.cd++;
        if (ed.size && !ed.has('NA28')) { r.semNA++; if (r.ex.length < 6) r.ex.push(`“${palavra}” (${sentido}) só em: ${[...ed].join(', ')}`); }
        else if (ed.size && !ed.has('TR')) { r.semTR++; if (r.ex.length < 6) r.ex.push(`“${palavra}” (${sentido}) ausente no Textus Receptus; presente em: ${[...ed].join(', ')}`); }
        const alts = (c[6] || '').split(/;\s*/).filter((x) => / in: /.test(x)); r.alt += alts.length;
        for (const a of alts) if (r.ex.length < 6) r.ex.push('Leitura alternativa: ' + limpar(a).replace(/\(t=|\(o=|\(T=/g, '(').replace(/ in: /, ' — em: '));
      }
      if (/\]\]/.test(c[1] || '') || /\]\]/.test(c[8] || '')) colchete = false;
    } else {
      let r = null;
      if (/^Q/.test(tipo)) { r = reg(k); r.qk++; const ket = /K= ([^"]*"[^"]*")/.exec(c[6] || ''); if (r.ex.length < 5) r.ex.push(`Lê-se (Qere) “${limpar(c[1])}” (${limpar(c[3])}); está escrito (Ketiv): ${ket ? limpar(ket[1]) : 'outra forma'}`); }
      else if (tipo === 'X') { r = reg(k); r.lxx++; if (r.ex.length < 5) r.ex.push(`“${limpar(c[1])}” (${limpar(c[3])}): palavra que não está no texto hebraico de Leningrado, reconstruída a partir da Septuaginta (BHS/BHK)`); }
      else if (tipo === 'R') { r = reg(k); r.rest++; if (r.ex.length < 5) r.ex.push(`“${limpar(c[1])}” (${limpar(c[3])}): texto restaurado (falta no Códice de Leningrado)`); }
      else if (/^L.*\(/.test(tipo)) { r = reg(k); r.ms++; if (r.ex.length < 5) r.ex.push(`“${limpar(c[1])}” (${limpar(c[3])}): outros manuscritos hebraicos (código ${tipo}) diferem aqui`); }
    }
  }
}
(async () => {
  for (const a of ordemArq) await ler(a);
  const lista = [...versos.values()].map((r) => ({ ...r, peso: r.qk * 2 + r.lxx * 3 + r.rest * 3 + r.ms + r.semNA * 2 + r.semTR * 2 + Math.min(r.cd, 40) * 0.5 + r.alt })).filter((r) => r.peso > 0).sort((a, b) => a.k - b.k);
  const pasta = path.join(__dirname, '..', 'public', 'nexus', 'camadas');
  fs.writeFileSync(path.join(pasta, 'manuscritos.json'), JSON.stringify({
    fonte: 'STEPBible Data (Tyndale House, Cambridge), CC BY 4.0 — TAHOT (Leningrado, Qere/Ketiv, BHS) e TAGNT (NA27/28, SBL, Tyndale, WH, Tregelles, TR, Bizantina)',
    aviso: 'Mostra ONDE as edições e os manuscritos diferem, palavra por palavra. Não diz qual leitura é a original: isso é trabalho de crítica textual, e os estudiosos divergem. As diferenças pequenas (ordem, ortografia) também contam.',
    versos: lista,
  }));
  const t = (f) => lista.reduce((s, r) => s + r[f], 0);
  console.log('versículos com diferença:', lista.length, '| AT: qere/ketiv', t('qk'), '· LXX', t('lxx'), '· restaurado', t('rest'), '· outros mss', t('ms'), '| NT: sem NA28', t('semNA'), '· sem TR', t('semTR'), '· colchetes duplos', t('cd'), '· leituras alternativas', t('alt'));
  console.log('maiores:', lista.slice().sort((a, b) => b.peso - a.peso).slice(0, 10).map((r) => r.k + ':' + r.peso).join(' '));
  console.log('tamanho', (fs.statSync(path.join(pasta, 'manuscritos.json')).size / 1e6).toFixed(2), 'MB');
})();
