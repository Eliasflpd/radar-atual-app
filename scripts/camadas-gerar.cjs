// Gera os dados das camadas 4 (Tempo) e 5 (Personagens) do Céu Infinito do NEXUS a partir do
// Theographic Bible Metadata (Robert Rouse, CC BY-SA 4.0 — https://github.com/robertrouse/theographic-bible-metadata).
// Uso: node scripts/camadas-gerar.cjs <pasta com events.json, people.json, verses.json>
// Saída: public/nexus/camadas/tempo.json e public/nexus/camadas/personagens.json
// Nada é inventado: só se copiam campos da fonte; títulos dos acontecimentos ganham tradução em camadas-pt.json.
const fs = require('fs'), path = require('path');
const dir = process.argv[2]; if (!dir) { console.error('informe a pasta da fonte'); process.exit(1); }
const ler = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const verses = ler('verses.json'), events = ler('events.json'), people = ler('people.json');
const saida = path.join(__dirname, '..', 'public', 'nexus', 'camadas'); fs.mkdirSync(saida, { recursive: true });
let pt = {}; try { pt = JSON.parse(fs.readFileSync(path.join(__dirname, 'camadas-pt.json'), 'utf8')); } catch (_) {}

const chaveVerso = new Map(); for (const v of verses) chaveVerso.set(v.id, +v.fields.verseID);   // "01001001" -> 1001001 (livro*1e6+cap*1e3+vers)
const pessoa = new Map(); for (const p of people) pessoa.set(p.id, p);
const evento = new Map(); for (const e of events) evento.set(e.id, e);
const ano = (s) => (s == null || s === '' ? null : Math.round(+s));
const chaves = (ids) => [...new Set((ids || []).map((i) => chaveVerso.get(i)).filter(Boolean))].sort((a, b) => a - b);

// ── CAMADA 4 · TEMPO ─────────────────────────────────────────────
const idxEv = new Map();
const evs = events.map((e) => e.fields).filter((f) => f.startDate != null && f.verses && f.verses.length)
  .sort((a, b) => (a.sortKey ?? +a.startDate) - (b.sortKey ?? +b.startDate));
evs.forEach((f, i) => idxEv.set(f.eventID, i));
const tempo = evs.map((f) => ({
  t: f.title, pt: pt[f.title] || null, a: ano(f.startDate), dur: f.duration || null,
  v: chaves(f.verses),
  p: (f.participants || []).map((id) => pessoa.get(id)).filter(Boolean).map((p) => p.fields.personID),
  pn: (f.participants || []).map((id) => pessoa.get(id)).filter(Boolean).map((p) => p.fields.displayTitle || p.fields.name),
  ant: (f.predecessor || []).map((id) => evento.get(id)).filter(Boolean).map((e) => idxEv.get(e.fields.eventID)).filter((x) => x != null),
  nota: f.notes ? String(f.notes).trim() : null,
}));
fs.writeFileSync(path.join(saida, 'tempo.json'), JSON.stringify({
  fonte: 'Theographic Bible Metadata (Robert Rouse), CC BY-SA 4.0 — github.com/robertrouse/theographic-bible-metadata',
  aviso: 'Datas da cronologia usada pela fonte (tradicional/conservadora; a criação em 4003 a.C. segue Ussher). Antes de ~1000 a.C. os estudiosos divergem muito; as datas não são consenso acadêmico.',
  eventos: tempo,
}));

// ── CAMADA 5 · PERSONAGENS ───────────────────────────────────────
const usados = people.filter((p) => p.fields.isProperName !== false && (p.fields.verseCount || 0) >= 1);
const ids = new Map(usados.map((p) => [p.id, p.fields.personID]));
const rel = (lista) => (Array.isArray(lista) ? lista : []).map((id) => ids.get(id)).filter((x) => x != null);
const pessoas = usados.map((p) => { const f = p.fields; return {
  id: f.personID, n: f.displayTitle || f.name, s: f.gender === 'Female' ? 'f' : f.gender === 'Male' ? 'm' : null,
  nasc: ano(f.birthYear), morte: ano(f.deathYear), qv: f.verseCount || 0,
  v: chaves(f.verses).slice(0, 400), pai: rel(f.father), mae: rel(f.mother), filhos: rel(f.children), conj: rel(f.partners), irm: rel(f.siblings),
  tb: typeof f.alsoCalled === "string" ? f.alsoCalled : null, amb: !!f.ambiguous,
  dic: f.dictText || f.dictionaryText ? String(f.dictText || f.dictionaryText).replace(/�/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600) : null,
}; });
fs.writeFileSync(path.join(saida, 'personagens.json'), JSON.stringify({
  fonte: 'Theographic Bible Metadata (Robert Rouse), CC BY-SA 4.0; resumo do Easton\'s Bible Dictionary (1897, domínio público)',
  aviso: 'Genealogias como registradas no texto bíblico, conforme a fonte. Datas de nascimento e morte seguem a cronologia tradicional da fonte, não consenso acadêmico.',
  pessoas,
}));
console.log('tempo:', tempo.length, 'eventos ·', tempo.reduce((s, e) => s + e.v.length, 0), 'versículos ligados');
console.log('personagens:', pessoas.length, 'pessoas ·', pessoas.reduce((s, p) => s + p.filhos.length, 0), 'ligações pai/mãe→filho');
console.log('sem tradução:', tempo.filter((e) => !e.pt).length);
fs.writeFileSync(path.join(dir, 'titulos.txt'), tempo.filter((e) => !e.pt).map((e) => e.t).join('\n'));
