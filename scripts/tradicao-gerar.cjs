// Gera os dados da camada 10 (Tradição e história da Igreja) do Céu Infinito do NEXUS a partir de credos, confissões
// e catecismos históricos (textos em domínio público) na coleção estruturada Creeds.json (github.com/NonlinearFruit/Creeds.json).
// Cada artigo/pergunta que traz textos-prova vira um item ligado aos versículos que o próprio documento cita.
// Uso: node scripts/tradicao-gerar.cjs <pasta com os .json dos credos> <pasta do Theographic com verses.json>
const fs = require('fs'), path = require('path');
const [dirC, dirT] = process.argv.slice(2);
const verses = JSON.parse(fs.readFileSync(path.join(dirT, 'verses.json'), 'utf8'));
const osis = new Map(); for (const v of verses) osis.set(v.fields.osisRef, +v.fields.verseID);
const ordem = new Map(verses.map((v, i) => [+v.fields.verseID, i])), lista = verses.map((v) => +v.fields.verseID);
function refs(r) {   // "Rom.1.19-Rom.1.20" ou "Ps.19.1" -> chaves
  const [a, b] = String(r).split('-'); const ka = osis.get(a); if (!ka) return [];
  if (!b) return [ka]; const kb = osis.get(b.includes('.') ? b : a.replace(/\d+$/, b)); if (!kb) return [ka];
  const ia = ordem.get(ka), ib = ordem.get(kb); return ia != null && ib != null && ib >= ia && ib - ia < 60 ? lista.slice(ia, ib + 1) : [ka];
}
const PT = { "Apostles' Creed": 'Credo Apostólico', 'Athanasian Creed': 'Credo Atanasiano', 'Belgic Confession': 'Confissão Belga', 'Canons of Dort': 'Cânones de Dort', 'Chalcedonian Definition': 'Definição de Calcedônia',
  'Consensus Tigurinus': 'Consenso de Zurique', 'Council of Orange': 'Concílio de Orange', 'First Confession of Basel': 'Primeira Confissão de Basileia', 'First Helvetic Confession': 'Primeira Confissão Helvética', 'French Confession of Faith': 'Confissão de Fé Francesa',
  "Gregory's Declaration of Faith": 'Declaração de Fé de Gregório Taumaturgo', 'Heidelberg Catechism': 'Catecismo de Heidelberg', "Ignatius' Creed": 'Credo de Inácio de Antioquia', "Irenaeus' Rule of Faith": 'Regra de Fé de Irineu', '1689 London Baptist Confession': 'Confissão Batista de Londres (1689)',
  'Nicene Creed': 'Credo Niceno-Constantinopolitano', 'Savoy Declaration of Faith': 'Declaração de Savoy', 'Scots Confession': 'Confissão Escocesa', 'Second Helvetic Confession': 'Segunda Confissão Helvética', 'Ten Theses of Berne': 'Dez Teses de Berna',
  "Tertullian's Rule of Faith": 'Regra de Fé de Tertuliano', 'Tetrapolitan Confession': 'Confissão Tetrapolitana', 'Waldensian Confession': 'Confissão Valdense', 'Westminster Confession of Faith': 'Confissão de Fé de Westminster', 'Westminster Shorter Catechism': 'Breve Catecismo de Westminster', 'Westminster Larger Catechism': 'Catecismo Maior de Westminster', '1695 Baptist Catechism': 'Catecismo Batista de 1695', "Keach's Catechism": 'Catecismo de Keach', 'Puritan Catechism': 'Catecismo Puritano (Spurgeon)', 'Catechism for Young Children': 'Catecismo para Crianças', 'Abstract of Principles': 'Resumo de Princípios', "Zwingli's 67 Articles": '67 Artigos de Zuínglio' };
const docs = [], itens = [];
for (const f of fs.readdirSync(dirC).filter((x) => x.endsWith('.json'))) {
  const d = JSON.parse(fs.readFileSync(path.join(dirC, f), 'utf8')), m = d.Metadata;
  const ano = parseInt(String(m.Year).replace(/\D+/g, ''), 10) || null;
  const doc = { titulo: PT[m.Title] || m.Title, en: m.Title, ano, tipo: m.CreedFormat, local: m.Location || null, autores: m.Authors || [], lingua: m.OriginalLanguage || null, fonte: m.SourceUrl || null, itens: 0, historia: m.OriginStory || '' };
  const di = docs.push(doc) - 1;
  (function andar(o, rotulo) {
    if (Array.isArray(o)) { o.forEach((x) => andar(x, rotulo)); return; }
    if (!o || typeof o !== 'object') return;
    const r = [o.Chapter && 'cap. ' + o.Chapter, o.Article && 'art. ' + o.Article, o.Section && '§' + o.Section, o.Number && 'P' + o.Number].filter(Boolean).join(' ');
    const rot = [rotulo, r].filter(Boolean).join(' ');
    if (Array.isArray(o.Proofs) && o.Proofs.length) {
      const vs = [...new Set(o.Proofs.flatMap((p) => (p.References || []).flatMap(refs)))].sort((a, b) => a - b);
      if (vs.length) { itens.push({ d: di, rot: rot || doc.titulo, tit: o.Title || o.Question || null, txt: String(o.Content || o.Answer || '').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 700), v: vs }); doc.itens++; }
    }
    for (const [k, v] of Object.entries(o)) if (k !== 'Proofs' && typeof v === 'object') andar(v, k === 'Sections' || k === 'Articles' ? rot : rotulo);
  })(d.Data, '');
}
const ordemDocs = docs.map((d, i) => i).sort((a, b) => (docs[a].ano || 0) - (docs[b].ano || 0)), novo = new Map(ordemDocs.map((i, k) => [i, k]));
itens.forEach((x) => { x.d = novo.get(x.d); });
const destino = path.join(__dirname, '..', 'public', 'nexus', 'camadas', 'tradicao.json');
fs.writeFileSync(destino, JSON.stringify({
  fonte: 'Credos, confissões e catecismos históricos (textos em domínio público), na coleção estruturada Creeds.json (github.com/NonlinearFruit/Creeds.json)',
  aviso: 'Os textos-prova foram escolhidos pelos próprios autores de cada documento (ou por seus editores): mostram como aquela tradição lia a Bíblia, não um consenso. Esta coleção é sobretudo reformada/protestante; ainda faltam documentos católicos, ortodoxos e luteranos. Texto dos documentos em inglês (tradução histórica); nomes traduzidos pelo NEXUS.',
  documentos: ordemDocs.map((i) => docs[i]), itens,
}));
console.log('documentos', docs.length, '· com textos-prova', docs.filter((d) => d.itens).length, '· itens', itens.length, '· versículos ligados', itens.reduce((s, x) => s + x.v.length, 0), '· tamanho', (fs.statSync(destino).size / 1e6).toFixed(2), 'MB');
console.log(ordemDocs.map((i) => docs[i]).filter((d) => d.itens).map((d) => `${d.titulo} (${d.ano}): ${d.itens}`).join(' | '));
