// Gera os dados das camadas 7 (História e cultura) e 9 (Teologia) do Céu Infinito do NEXUS a partir do
// Easton's Bible Dictionary (M. G. Easton, 1897 — domínio público), na edição estruturada do Theographic (CC BY-SA 4.0).
// Os temas e os títulos em português vêm de scripts/temas-pt.json (curadoria); os versículos são os que o próprio
// dicionário cita no verbete. Uso: node scripts/temas-gerar.cjs <pasta do Theographic com easton.json, verses.json, people.json>
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const ler = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const easton = ler('easton.json').map((x) => x.fields), verses = ler('verses.json'), people = ler('people.json');
const osis = new Map(); for (const v of verses) osis.set(v.fields.osisRef, +v.fields.verseID);
const recVerso = new Map(); for (const v of verses) recVerso.set(v.id, +v.fields.verseID);
const temas = JSON.parse(fs.readFileSync(path.join(__dirname, 'temas-pt.json'), 'utf8'));
const porRotulo = new Map(); for (const e of easton) { const l = (porRotulo.get(e.termLabel) || []); l.push(e); porRotulo.set(e.termLabel, l); }
const refsDe = (t) => [...String(t || '').matchAll(/\]\(\/[a-z0-9]+#([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)(?:-(\d+))?/g)].flatMap((m) => {
  const ks = []; const ini = osis.get(`${m[1]}.${m[2]}.${m[3]}`); if (!ini) return ks; ks.push(ini);
  if (m[4]) for (let v = +m[3] + 1; v <= +m[4] && v < +m[3] + 40; v++) { const k = osis.get(`${m[1]}.${m[2]}.${v}`); if (k) ks.push(k); }
  return ks; });
const textoLimpo = (t) => String(t || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, ' ').replace(/[*_#]+/g, '').replace(/\s+/g, ' ').trim();
function gerar(chave, extras) {
  const itens = [], faltam = [];
  for (const [grupo, mapa] of Object.entries(temas[chave])) for (const [en, pt] of Object.entries(mapa)) {
    const es = porRotulo.get(en); if (!es) { faltam.push(en); continue; }
    const vs = [...new Set(es.flatMap((e) => refsDe(e.dictText)))].sort((a, b) => a - b);
    if (!vs.length) { faltam.push(en + ' (sem versículos)'); continue; }
    const texto = es.map((e) => textoLimpo(e.dictText)).join(' — ').slice(0, 1100);
    itens.push({ en, pt, grupo, v: vs, txt: texto, ent: es.length });
  }
  for (const x of extras || []) itens.push(x);
  return { itens, faltam };
}
// Deus e o Espírito Santo (camada de Teologia): versículos onde o texto os menciona, segundo o Theographic
const extrasTeo = ['God', 'Holy Spirit'].map((nome) => { const p = people.find((q) => q.fields.name === nome || q.fields.displayTitle === nome); if (!p) return null;
  const vs = [...new Set((p.fields.verses || []).map((id) => recVerso.get(id)).filter(Boolean))].sort((a, b) => a - b);
  return { en: nome, pt: nome === 'God' ? 'Deus' : 'Espírito Santo', grupo: 'Deus e Cristo', v: vs, txt: '', ent: 0, fonteVersos: 'Theographic (menções no texto)' }; }).filter(Boolean);
const saida = path.join(__dirname, '..', 'public', 'nexus', 'camadas');
const comum = { fonte: "Easton's Bible Dictionary (M. G. Easton, 1897; domínio público), edição estruturada do Theographic Bible Metadata (CC BY-SA 4.0)" };
const h = gerar('historia');
fs.writeFileSync(path.join(saida, 'historia.json'), JSON.stringify({ ...comum, aviso: 'Verbetes de um dicionário de 1897: a arqueologia e a história avançaram muito desde então; use como ponto de partida, não como palavra final. Texto do verbete em inglês; títulos traduzidos pelo NEXUS.', itens: h.itens }));
const t = gerar('teologia', extrasTeo);
fs.writeFileSync(path.join(saida, 'teologia.json'), JSON.stringify({ ...comum, aviso: 'Os verbetes doutrinários do Easton refletem a teologia protestante reformada do séc. XIX: são uma interpretação, não um consenso de todas as tradições. Os versículos citados são os que o autor escolheu. Texto em inglês; títulos traduzidos pelo NEXUS.', itens: t.itens }));
console.log('história:', h.itens.length, 'temas ·', h.itens.reduce((s, x) => s + x.v.length, 0), 'versículos · faltaram:', h.faltam.join(', '));
console.log('teologia:', t.itens.length, 'temas ·', t.itens.reduce((s, x) => s + x.v.length, 0), 'versículos · faltaram:', t.faltam.join(', '));
