const CAMB = require('./cambridge-autores-map');
// ═══════════════════════════════════════════════════════════════════════════════
// BIBLIOTECA — GUIA DA PASSAGEM, PALAVRA EXATA e ENDEREÇO DA CITAÇÃO (18/11/2026).
// Módulo auxiliar de api/_lib/biblioteca.js (não é função da Vercel: prefixo _lib).
//   1) lerReferencia("o que dizem de João 4:6") -> {livro, cap, versiculos, ...}
//   2) SQL do Guia: os trechos que falam DAQUELE versículo (seção exata, livro+versículo,
//      citação no texto, ou capítulo), um por autor, com a força do casamento (tier).
//   3) palavrasExatas("funeral de Herodes") -> termos que precisam aparecer LITERALMENTE.
//   4) enderecoDe(item) -> "Josefo, Antiguidades Judaicas" / "Edersheim, ..., livro III, cap. 7".
// ⚖️ Não devolve texto de autor fora do servidor: só metadados e o endereço.
// O endereço nunca inventa capítulo/versículo que o índice não guardou (ex.: Josefo, Keil sem versículo).
// ═══════════════════════════════════════════════════════════════════════════════
const DE = 'áàâãäéèêëíìîïóòôõöúùûüçāēīōūḗṓǵ', PARA = 'aaaaaeeeeiiiiooooouuuucaeioueog';
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// [forma normalizada como aparece na seção, nome de exibição, abreviações (normalizadas)]
const LIVROS = [
  ['genesis', 'Gênesis', ['gn', 'gen', 'genesis']], ['exodo', 'Êxodo', ['ex', 'exo', 'exodo']],
  ['levitico', 'Levítico', ['lv', 'lev', 'levitico']], ['numeros', 'Números', ['nm', 'num', 'numeros']],
  ['deuteronomio', 'Deuteronômio', ['dt', 'deut', 'deuteronomio']], ['josue', 'Josué', ['js', 'jos', 'josue']],
  ['juizes', 'Juízes', ['jz', 'juiz', 'juizes']], ['rute', 'Rute', ['rt', 'rute']],
  ['1 samuel', '1 Samuel', ['1sm', '1sam', '1 samuel']], ['2 samuel', '2 Samuel', ['2sm', '2sam', '2 samuel']],
  ['1 reis', '1 Reis', ['1rs', '1 reis']], ['2 reis', '2 Reis', ['2rs', '2 reis']],
  ['1 cronicas', '1 Crônicas', ['1cr', '1cron', '1 cronicas']], ['2 cronicas', '2 Crônicas', ['2cr', '2cron', '2 cronicas']],
  ['esdras', 'Esdras', ['ed', 'esd', 'esdras']], ['neemias', 'Neemias', ['ne', 'neh', 'neemias']],
  ['ester', 'Ester', ['et', 'est', 'ester']], ['jo', 'Jó', ['job']],
  ['salmos', 'Salmos', ['sl', 'sal', 'salmo', 'salmos']], ['proverbios', 'Provérbios', ['pv', 'prov', 'proverbios']],
  ['eclesiastes', 'Eclesiastes', ['ec', 'ecl', 'eclesiastes']], ['cantares', 'Cantares', ['ct', 'cant', 'cantares']],
  ['isaias', 'Isaías', ['is', 'isa', 'isaias']], ['jeremias', 'Jeremias', ['jr', 'jer', 'jeremias']],
  ['lamentacoes', 'Lamentações', ['lm', 'lam', 'lamentacoes']], ['ezequiel', 'Ezequiel', ['ez', 'eze', 'ezequiel']],
  ['daniel', 'Daniel', ['dn', 'dan', 'daniel']], ['oseias', 'Oseias', ['os', 'oseias']], ['joel', 'Joel', ['jl', 'joel']],
  ['amos', 'Amós', ['am', 'amos']], ['obadias', 'Obadias', ['ob', 'obadias']], ['jonas', 'Jonas', ['jn', 'jonas']],
  ['miqueias', 'Miqueias', ['mq', 'miq', 'miqueias']], ['naum', 'Naum', ['na', 'naum']], ['habacuque', 'Habacuque', ['hc', 'habacuque']],
  ['sofonias', 'Sofonias', ['sf', 'sof', 'sofonias']], ['ageu', 'Ageu', ['ag', 'ageu']], ['zacarias', 'Zacarias', ['zc', 'zac', 'zacarias']],
  ['malaquias', 'Malaquias', ['ml', 'mal', 'malaquias']], ['mateus', 'Mateus', ['mt', 'mat', 'mateus']],
  ['marcos', 'Marcos', ['mc', 'mk', 'mar', 'marcos']], ['lucas', 'Lucas', ['lc', 'luc', 'lucas']],
  ['joao', 'João', ['jo', 'joao']], ['atos', 'Atos', ['at', 'atos']], ['romanos', 'Romanos', ['rm', 'rom', 'romanos']],
  ['1 corintios', '1 Coríntios', ['1co', '1cor', '1 corintios']], ['2 corintios', '2 Coríntios', ['2co', '2cor', '2 corintios']],
  ['galatas', 'Gálatas', ['gl', 'gal', 'galatas']], ['efesios', 'Efésios', ['ef', 'efe', 'efesios']],
  ['filipenses', 'Filipenses', ['fp', 'fil', 'filipenses']], ['colossenses', 'Colossenses', ['cl', 'col', 'colossenses']],
  ['1 tessalonicenses', '1 Tessalonicenses', ['1ts', '1tes', '1 tessalonicenses']], ['2 tessalonicenses', '2 Tessalonicenses', ['2ts', '2tes', '2 tessalonicenses']],
  ['1 timoteo', '1 Timóteo', ['1tm', '1tim', '1 timoteo']], ['2 timoteo', '2 Timóteo', ['2tm', '2tim', '2 timoteo']],
  ['tito', 'Tito', ['tt', 'tito']], ['filemom', 'Filemom', ['fm', 'filemom']], ['hebreus', 'Hebreus', ['hb', 'heb', 'hebreus']],
  ['tiago', 'Tiago', ['tg', 'tiago']], ['1 pedro', '1 Pedro', ['1pe', '1 pedro']], ['2 pedro', '2 Pedro', ['2pe', '2 pedro']],
  ['1 joao', '1 João', ['1jo', '1 joao']], ['2 joao', '2 João', ['2jo', '2 joao']], ['3 joao', '3 João', ['3jo', '3 joao']],
  ['judas', 'Judas', ['jd', 'judas']], ['apocalipse', 'Apocalipse', ['ap', 'apo', 'apocalipse']],
];
const ABREV = new Map();
for (const [canon, exib, abrs] of LIVROS) for (const a of abrs) ABREV.set(a.replace(/\s+/g, ''), canon);

// Lê a referência bíblica da pergunta. Aceita "João 4:6", "Jo 4.6", "Pv 3.5-6", "o que dizem de Gênesis 28:12".
// "Jó 42:2" (com acento) é o livro de Jó; "Jo 4.6" sem acento é João (convenção de citação).
function lerReferencia(pergunta) {
  const orig = String(pergunta || '');
  const n = norm(orig);
  const re = /(?:^|[^a-z0-9])((?:[123]\s?)?[a-z]{2,12}\.?)\s*(\d{1,3})\s*[:.,]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?(?![0-9])/g;
  let m;
  while ((m = re.exec(n))) {
    const tok = m[1].replace(/\./g, '').replace(/\s+/g, '');
    let canon = ABREV.get(tok);
    if (!canon) continue;
    if (canon === 'joao' && /(^|\s)Jó(\s|$|[.:,])/.test(orig)) canon = 'jo';
    const cap = +m[2], v1 = +m[3], v2 = m[4] ? +m[4] : v1;
    if (cap < 1 || cap > 150 || v1 < 1 || v1 > 176) continue;
    const vers = [];
    for (let v = v1; v <= Math.min(v2, v1 + 11); v++) vers.push(v);
    const livro = LIVROS.find((l) => l[0] === canon);
    return { canon, livro: livro[1], cap, vers, rotulo: `${livro[1]} ${cap}:${v1}${v2 !== v1 ? '-' + v2 : ''}` };
  }
  return null;
}

// Palavras que precisam aparecer LITERALMENTE (nomes próprios e termos raros). Comuns de pergunta ficam de fora.
const COMUNS = new Set(('dizem diz fala falam sobre quando entre porque qual quais significa significado palavra palavras texto '
  + 'escritura biblia biblica biblico grega grego hebraica hebraico original versiculo capitulo verso tambem aquele aquela '
  + 'dizer quer tudo cada usado usada termo letra letras explique explica ensina ensinam escreve escreveu comenta compare '
  + 'concordam acham pensam antigo novo testamento igreja pastor pregacao estudo sentido ensino historia historico '
  + 'lugar lugares tempo tempos povo vida jesus deus senhor cristo').split(/\s+/));
function palavrasExatas(pergunta, refe) {
  const orig = String(pergunta || '');
  const out = new Set();
  const toks = orig.match(/[A-Za-zÀ-ÿ]{4,}/g) || [];
  toks.forEach((t, i) => {
    const n = norm(t);
    if (COMUNS.has(n) || n.length < 4) return;
    if (refe && ABREV.has(n)) return;                           // nome de livro bíblico não é palavra de busca
    const cap = /^[A-ZÀ-Ý]/.test(t) && i > 0;                  // nome próprio no meio da frase
    const acento = /[À-ÿ]/.test(t);                            // Heródio, Caifás: palavra acentuada é termo específico
    if (cap || acento || n.length >= 7) out.add(n);
  });
  return [...out].slice(0, 6);
}
// Classes com acento: a busca no TEXTO usa ~* (sem translate, que varria os 125 MB e passava de 9 s). Assim "Heródio"
// casa com "herodio" e "Herodio" sem tocar em cada linha.
const CLASSES = { a: 'aáàâãäā', e: 'eéèêëē', i: 'iíìîïī', o: 'oóòôõöō', u: 'uúùûüū', c: 'cç' };
function acentuar(s) {
  return String(s).split('').map((ch) => (CLASSES[ch] ? '[' + CLASSES[ch] + ']' : ch)).join('');
}// Regex de palavra inteira, com classes de acento (usar com ~* no Postgres).
function regexPalavras(termos) {
  if (!termos.length) return null;
  return '(^|[^a-z])(' + termos.map((t) => acentuar(t.replace(/[^a-z0-9 ]/g, ''))).join('|') + ')($|[^a-z])';
}

// SQL do Guia: devolve linhas com `tier` (1 = verso exato na seção; 2 = livro + verso na seção (ex.: Walvoord "(8.9-10)");
// 3 = o autor CITA o versículo no texto; 4 = capítulo inteiro). Fica por último na ordem de força.
function sqlGuia(refe) {
  const canonRe = refe.canon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const vers = refe.vers.join('|');
  const cap = refe.cap;
  const abrs = LIVROS.find((l) => l[0] === refe.canon)[2].map((a) => a.replace(/[^a-z0-9]/g, '')).filter(Boolean);
  const citRe = `(^|[^a-z])(${abrs.map(acentuar).join('|')})\\.?\\s*${cap}\\s*[:.]\\s*(${vers})($|[^0-9])`;
  const verRe = `(^|[^0-9])${cap}[.:](${vers})($|[^0-9])`;
  const secaoExata = `(^|[^a-z0-9])${canonRe}\\s*${cap}\\s*[:.]\\s*(${vers})($|[^0-9])`;
  const capRe = `(^|[^0-9])${cap}($|[^0-9.:])`;
  const sql = `
    select autor, obra, livro, secao, tipo, texto, peso, aprovado, id, tier from (
      (select autor, obra, livro, secao, tipo, texto, peso, aprovado, id, 1 as tier
         from biblioteca_trechos
        where translate(lower(coalesce(secao,'')), $1, $2) ~ $3
        limit 80)
      union all
      (select autor, obra, livro, secao, tipo, texto, peso, aprovado, id, 2 as tier
         from biblioteca_trechos
        where translate(lower(coalesce(livro,'')), $1, $2) ~ $4
          and translate(lower(coalesce(secao,'')), $1, $2) ~ $5
          and not (translate(lower(coalesce(secao,'')), $1, $2) ~ $3)
        limit 40)
      union all
      (select autor, obra, livro, secao, tipo, texto, peso, aprovado, id, 3 as tier
         from biblioteca_trechos
        where texto ~* $6
        limit 120)
      union all
      (select autor, obra, livro, secao, tipo, texto, peso, aprovado, id, 4 as tier
         from biblioteca_trechos
        where translate(lower(coalesce(livro,'')), $1, $2) ~ $4
          and translate(lower(coalesce(secao,'')), $1, $2) ~ $7
        limit 60)
    ) g`;
  return { sql, params: [DE, PARA, secaoExata, canonRe, verRe, citRe, capRe] };
}

// Endereço citável. Só usa o que o índice guardou: nada de capítulo/parágrafo que não existe no texto.
const CURTO = {
  'Keil & Delitzsch': 'Keil & Delitzsch', 'Flávio Josefo': 'Josefo', 'Alfred Edersheim': 'Edersheim', 'Emil Schürer': 'Schürer',
  'Bruce Waltke': 'Waltke', 'Derek Kidner': 'Kidner', 'Charles Spurgeon': 'Spurgeon', 'Matthew Henry': 'Matthew Henry',
  'Thayer (Léxico Grego do NT)': 'Thayer', 'Kittel (TDNT)': 'Kittel', 'Cambridge Bible for Schools and Colleges': 'Cambridge Bible',
  'Dr. Wagner Cordeiro': 'Dr. Wagner Cordeiro', 'John F. Walvoord': 'Walvoord', 'Richard Chenevix Trench': 'Trench',
  'Harold N. Moldenke & Alma L. Moldenke': 'Moldenke', 'Wesley L. Duewel': 'Duewel', 'Richard J. Foster': 'Foster',
  'Warren Wiersbe': 'Wiersbe', 'William MacDonald': 'MacDonald', 'John Gill': 'Gill', 'John E. Hartley': 'Hartley',
  'Earl C. Wolf': 'Wolf', 'David J. Merkh': 'Merkh', 'Stephen Kaung': 'Kaung', 'A. W. Pink': 'Pink', 'Champlin': 'Champlin',
};
function romano(s) {
  const v = { I: 1, V: 5, X: 10, L: 50, C: 100 }; const u = String(s || '').toUpperCase();
  if (!/^[IVXLC]+$/.test(u)) return s;
  let t = 0; for (let i = 0; i < u.length; i++) { const a = v[u[i]], b = v[u[i + 1]] || 0; t += a < b ? -a : a; }
  return String(t);
}
function enderecoDe(x) {
  const short = CURTO[x.autor] || String(x.autor || '').slice(0, 60);
  // Cambridge: cita o AUTOR do volume ("Kirkpatrick, Salmos (Cambridge)"), casado pelo título do índice.
  if (/^Cambridge/.test(String(x.autor || ''))) {
    const nl = String(x.livro || x.obra || '').toLowerCase().replace(/\(cambridge\)|- pt|p\.?$/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    const hit = CAMB.find((m) => m.k && nl.includes(m.k));
    if (hit) return hit.autor + ', ' + String(x.livro || '').replace(/\s*\(Cambridge\).*$/, '').replace(/^The (Book|Books|Gospel according to St|Epistles?|Epistle) (of |to |the )?/i, '').trim().slice(0, 60) + ' (Cambridge)';
  }  const secao = String(x.secao || '').trim();
  const obra = String(x.obra || '');
  if (x.tipo === 'historico') return `${short}, ${secao}`.slice(0, 140);
  if (/^Antiguidades Judaicas$|^Guerras Judaicas$/.test(secao)) return `Josefo, ${secao} (o índice não guarda capítulo nem parágrafo)`;
  let m = secao.match(/^Livro ([IVXLC]+), cap\. ([IVXLC\d]+)/i);
  if (m) return `${short}, ${/Vida/i.test(obra) ? 'Vida e Tempos de Jesus' : obra.split(' — ')[0]}, livro ${romano(m[1])}, cap. ${romano(m[2])}`.slice(0, 140);
  m = secao.match(/^Apêndice (\d+)/);
  if (m) return `${short}, ${/Vida/i.test(obra) ? 'Vida e Tempos de Jesus' : obra.split(' — ')[0]}, apêndice ${m[1]}`.slice(0, 140);
  m = secao.match(/^§\s*(\d+)/);
  if (m) return `${short}, História do Povo Judeu no Tempo de Jesus Cristo, § ${m[1]}`;
  m = secao.match(/^VOLUME\s+(\d+)/i);
  if (m) return `${short}, História do Povo Judeu no Tempo de Jesus Cristo, vol. ${m[1]}`;
  m = secao.match(/^(G\d{4}) · ([^·]+?) · (.+)$/);
  if (m) return `${short}, verbete ${m[1].replace(/^G0*/, 'G')} (${m[2].trim()})`;
  if (x.tipo === 'verbete') return `${short}, verbete "${secao.split(' — ')[0].split(' / ')[0].slice(0, 60)}"`;
  if (secao && secao.toLowerCase() !== String(x.livro || '').toLowerCase()) return `${short}, ${secao}`.slice(0, 140);
  return `${short}, ${(x.livro || obra).split(' — ')[0]}`.slice(0, 140);
}

module.exports = { norm, DE, PARA, lerReferencia, palavrasExatas, regexPalavras, sqlGuia, enderecoDe, acentuar, LIVROS };





