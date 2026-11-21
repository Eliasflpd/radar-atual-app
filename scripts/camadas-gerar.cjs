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
let NP = {}; try { NP = JSON.parse(fs.readFileSync(path.join(__dirname, 'nomes-pt.json'), 'utf8')); } catch (_) {}
let pt = {}; try { pt = JSON.parse(fs.readFileSync(path.join(__dirname, 'camadas-pt.json'), 'utf8')); } catch (_) {}
// nomes na forma da Almeida (scripts/nomes-pt.json); o que não estiver no mapa fica com o nome da fonte (marcado)
const REL = { family: 'família', jew: 'judeu', tribe: 'tribo', wife: 'mulher', servant: 'servo', prophet: 'profeta', priest: 'sacerdote', son: 'filho', daughter: 'filha', father: 'pai', mother: 'mãe', brother: 'irmão', sister: 'irmã', wife: 'mulher', husband: 'marido', king: 'rei', 'King': 'rei', Son: 'filho', Brother: 'irmão', Mother: 'mãe', Disciple: 'discípulo', line: 'linhagem' };
const PAR = { patriarch: 'patriarca', Levite: 'levita', 'of the Exodus': 'do Êxodo', 'army captain': 'comandante do exército', 'antediluvian patriarch': 'patriarca antediluviano', "Mary's Husband": 'marido de Maria', 'Disciple at Damascus': 'discípulo em Damasco' };
function ptNome(n) {
  if (NP[n]) return NP[n];
  const m = /^(.*?) \((.+)\)$/.exec(n); if (!m) return null;
  const base = NP[m[1]]; if (!base) return null;
  const q = m[2]; let par = PAR[q] || NP[q] || null;
  if (!par) { const r = /^(\w+) (?:of|at) (.+)$/.exec(q); if (r) { const y = NP[r[2]] || r[2].replace(/^the /, ''); par = (REL[r[1]] || REL[r[1].toLowerCase()] || r[1].toLowerCase()) + (q.includes(' at ') ? ' em ' : ' de ') + y; } else if (/^of (.+)$/.test(q)) { const y = q.slice(3); par = 'de ' + (NP[y] || y); } }
  return par ? `${base} (${par})` : base;
}

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
  pn: (f.participants || []).map((id) => pessoa.get(id)).filter(Boolean).map((p) => ptNome(p.fields.displayTitle || p.fields.name) || p.fields.displayTitle || p.fields.name),
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
// nome como está na Almeida: procura, nos versículos da própria pessoa, a palavra que mais se parece com o nome da fonte
let BIB = null; try { BIB = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'biblia.json'), 'utf8').replace(/^[^\[]*/, '')); } catch (_) {}
const textoVerso = (k) => { if (!BIB) return ''; const b = Math.floor(k / 1e6), c = Math.floor((k % 1e6) / 1e3), v = k % 1e3; try { return BIB[b - 1].chapters[c - 1][v - 1] || ''; } catch (_) { return ''; } };
const fon = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '').replace(/ph/g, 'f').replace(/th/g, 't').replace(/sh/g, 's').replace(/ch/g, 'c').replace(/qu/g, 'c').replace(/k/g, 'c').replace(/y/g, 'i').replace(/j/g, 'i').replace(/z/g, 's').replace(/w/g, 'v').replace(/h/g, '').replace(/(.)\1+/g, '$1').replace(/s$/, '');
function lev(a, b) { const m = a.length, n = b.length; const d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
function nomeNaAlmeida(nome, versos) {
  const alvo = fon(String(nome).replace(/ \(.*\)$/, '').split(/[ -]/)[0]); if (alvo.length < 2) return null;
  // a palavra parecida que aparece em MAIS versículos da pessoa ganha (evita pegar outro nome do mesmo versículo)
  const cand = new Map();
  for (const k of versos.slice(0, 12)) for (const w of new Set(textoVerso(k).match(/[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõçü]+(?:-[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõçü]+)?/g) || [])) {
    const f = fon(w); if (!f || f[0] !== alvo[0]) continue; const r = lev(f, alvo) / Math.max(f.length, alvo.length);
    if (r <= 0.34) { const c = cand.get(w) || { w, r, n: 0 }; c.n++; cand.set(w, c); }
  }
  let melhor = null; for (const c of cand.values()) { const sc = c.r - 0.06 * Math.min(4, c.n - 1); if (!melhor || sc < melhor.sc) melhor = { ...c, sc }; }
  return melhor ? melhor.w : null;
}
const GRUPOS = { 'Tribe of Levi': 'Tribo de Levi', 'Tribe of Benjamin': 'Tribo de Benjamim', 'Tribe of Joseph': 'Tribo de José', 'Tribe of Judah': 'Tribo de Judá', 'Genealogy of Jesus': 'Genealogia de Jesus', 'Tribe of Reuben': 'Tribo de Rúben', 'Tribe of Asher': 'Tribo de Aser', 'Tribe of Gad': 'Tribo de Gade', 'Tribe of Dan': 'Tribo de Dã', 'Tribe of Zebulun': 'Tribo de Zebulom', 'Tribe of Naphtali': 'Tribo de Naftali', 'Tribe of Simeon': 'Tribo de Simeão', 'Tribe of Issachar': 'Tribo de Issacar', 'Apostles': 'Apóstolos', 'Apostles (The Eleven)': 'Os Onze', 'Apostles (Post-Ascension)': 'Apóstolos (depois da Ascensão)', 'Line of Cain': 'Linhagem de Caim', 'Nation of Israel': 'Nação de Israel' };
let grupoRec = new Map(); try { for (const g of JSON.parse(fs.readFileSync(path.join(dir, 'peopleGroups.json'), 'utf8'))) grupoRec.set(g.id, GRUPOS[g.fields.groupName] || g.fields.groupName); } catch (_) {}
let lugarRec = new Map(); try { for (const l of JSON.parse(fs.readFileSync(path.join(dir, 'places.json'), 'utf8'))) lugarRec.set(l.id, l.fields.displayTitle || l.fields.kjvName); } catch (_) {}
let doAlmeida = 0;
function trPar(q) { if (PAR[q]) return PAR[q]; if (NP[q]) return NP[q]; if (/^of /.test(q)) return 'de ' + (NP[q.slice(3)] || q.slice(3)); const r = /^(\w+) (?:of|at) (.+)$/.exec(q); if (r) return (REL[r[1]] || REL[r[1].toLowerCase()] || r[1].toLowerCase()) + (q.includes(' at ') ? ' em ' : ' de ') + (NP[r[2]] || r[2].replace(/^the /, '')); return q; }
const pessoas = usados.map((p) => { const f = p.fields, n = f.displayTitle || f.name, vs = chaves(f.verses); let pt = ptNome(n), ptOrigem = pt ? 'mapa' : null;
  if (!pt) { const w = nomeNaAlmeida(n, vs); if (w) { const par = /\((.+)\)$/.exec(n); pt = par ? `${w} (${trPar(par[1])})` : w; ptOrigem = 'almeida'; doAlmeida++; } }
  return {
    id: f.personID, n, pt, po: ptOrigem, s: f.gender === 'Female' ? 'f' : f.gender === 'Male' ? 'm' : null,
    nasc: ano(f.birthYear), morte: ano(f.deathYear), qv: f.verseCount || 0, min: f.minYear ?? null, max: f.maxYear ?? null,
    v: vs, pai: rel(f.father), mae: rel(f.mother), filhos: rel(f.children), conj: rel(f.partners), irm: rel(f.siblings),
    mp: rel(f.halfSiblingsSameFather), mm: rel(f.halfSiblingsSameMother),
    gr: (f.memberOf || []).map((id) => grupoRec.get(id)).filter(Boolean),
    ln: (f.birthPlace || []).map((id) => lugarRec.get(id)).filter(Boolean), lm: (f.deathPlace || []).map((id) => lugarRec.get(id)).filter(Boolean),
    tb: typeof f.alsoCalled === 'string' ? f.alsoCalled : null, amb: !!f.ambiguous,
    dic: f.dictText || f.dictionaryText ? String(f.dictText || f.dictionaryText).replace(/\uFFFD/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2400) : null,
  }; });
fs.writeFileSync(path.join(saida, 'personagens.json'), JSON.stringify({
  fonte: 'Theographic Bible Metadata (Robert Rouse), CC BY-SA 4.0; verbetes do Easton\'s Bible Dictionary (1897, domínio público); nomes na forma da Almeida',
  aviso: 'Genealogias como registradas no texto bíblico, conforme a fonte. Datas de nascimento e morte seguem a cronologia tradicional da fonte, não consenso acadêmico. Quando várias pessoas têm o mesmo nome, a separação entre elas é da fonte e pode ser discutida.',
  pessoas,
}));
console.log('nomes pela Almeida (achados no próprio versículo):', doAlmeida, '· sem forma portuguesa:', pessoas.filter((x) => !x.pt).length);
console.log('tempo:', tempo.length, 'eventos ·', tempo.reduce((s, e) => s + e.v.length, 0), 'versículos ligados');
console.log('personagens:', pessoas.length, 'pessoas ·', pessoas.reduce((s, p) => s + p.filhos.length, 0), 'ligações pai/mãe→filho');
console.log('sem tradução:', tempo.filter((e) => !e.pt).length);
fs.writeFileSync(path.join(dir, 'titulos.txt'), tempo.filter((e) => !e.pt).map((e) => e.t).join('\n'));
