// OFICINA — o motor de referências bíblicas (CJS, sem dependências). Mora em api/_lib/ e é usado por
// api/_lib/oficina.js (rota Node, via api/dados.js) e por scripts/oficina-indice.mjs (createRequire).
//
// NÃO É O CONCÍLIO. O concilio.js tem o seu acharReferencias; este é uma variante da Oficina, com duas
// proteções a mais (abreviação curta com minúscula não conta; versículo colado a outro número não conta) e
// com a validação contra o texto da Almeida (capítulo e versículo têm que existir). Nada do Concílio muda.
//
// AS CHAVES: a abreviação de cada livro é a MESMA chave de public/biblia.json (gn, ex, … jó, … 1sm, … ap).
// O acharReferencias do concilio devolve essas mesmas chaves em `.abbrev` (textoDoVersiculo usa caps[r.abbrev]).
//
// A CHAVE NUMÉRICA DO VERSÍCULO: livro*1.000.000 + capítulo*1.000 + versículo. Dá para comparar intervalos com
// inteiros (ini <= k <= fim) e cabe em int4. Capítulo inteiro: de chave(b,c,1) a chave(b,c,176).

// [abreviação da Almeida, nome em português, código do OpenBible.info]
const LIVROS = [
  ['gn', 'Gênesis', 'Gen'], ['ex', 'Êxodo', 'Exod'], ['lv', 'Levítico', 'Lev'], ['nm', 'Números', 'Num'],
  ['dt', 'Deuteronômio', 'Deut'], ['js', 'Josué', 'Josh'], ['jz', 'Juízes', 'Judg'], ['rt', 'Rute', 'Ruth'],
  ['1sm', '1 Samuel', '1Sam'], ['2sm', '2 Samuel', '2Sam'], ['1rs', '1 Reis', '1Kgs'], ['2rs', '2 Reis', '2Kgs'],
  ['1cr', '1 Crônicas', '1Chr'], ['2cr', '2 Crônicas', '2Chr'], ['ed', 'Esdras', 'Ezra'], ['ne', 'Neemias', 'Neh'],
  ['et', 'Ester', 'Esth'], ['jó', 'Jó', 'Job'], ['sl', 'Salmos', 'Ps'], ['pv', 'Provérbios', 'Prov'],
  ['ec', 'Eclesiastes', 'Eccl'], ['ct', 'Cânticos', 'Song'], ['is', 'Isaías', 'Isa'], ['jr', 'Jeremias', 'Jer'],
  ['lm', 'Lamentações', 'Lam'], ['ez', 'Ezequiel', 'Ezek'], ['dn', 'Daniel', 'Dan'], ['os', 'Oséias', 'Hos'],
  ['jl', 'Joel', 'Joel'], ['am', 'Amós', 'Amos'], ['ob', 'Obadias', 'Obad'], ['jn', 'Jonas', 'Jonah'],
  ['mq', 'Miquéias', 'Mic'], ['na', 'Naum', 'Nah'], ['hc', 'Habacuque', 'Hab'], ['sf', 'Sofonias', 'Zeph'],
  ['ag', 'Ageu', 'Hag'], ['zc', 'Zacarias', 'Zech'], ['ml', 'Malaquias', 'Mal'], ['mt', 'Mateus', 'Matt'],
  ['mc', 'Marcos', 'Mark'], ['lc', 'Lucas', 'Luke'], ['jo', 'João', 'John'], ['atos', 'Atos', 'Acts'],
  ['rm', 'Romanos', 'Rom'], ['1co', '1 Coríntios', '1Cor'], ['2co', '2 Coríntios', '2Cor'], ['gl', 'Gálatas', 'Gal'],
  ['ef', 'Efésios', 'Eph'], ['fp', 'Filipenses', 'Phil'], ['cl', 'Colossenses', 'Col'],
  ['1ts', '1 Tessalonicenses', '1Thess'], ['2ts', '2 Tessalonicenses', '2Thess'], ['1tm', '1 Timóteo', '1Tim'],
  ['2tm', '2 Timóteo', '2Tim'], ['tt', 'Tito', 'Titus'], ['fm', 'Filemom', 'Phlm'], ['hb', 'Hebreus', 'Heb'],
  ['tg', 'Tiago', 'Jas'], ['1pe', '1 Pedro', '1Pet'], ['2pe', '2 Pedro', '2Pet'], ['1jo', '1 João', '1John'],
  ['2jo', '2 João', '2John'], ['3jo', '3 João', '3John'], ['jd', 'Judas', 'Jude'], ['ap', 'Apocalipse', 'Rev'],
];
const AB = LIVROS.map((l) => l[0]);
const IDX_AB = Object.fromEntries(AB.map((a, i) => [a, i + 1]));
const OB = Object.fromEntries(LIVROS.map((l, i) => [l[2], i + 1]));
const NOME = Object.fromEntries(LIVROS.map((l) => [l[0], l[1]]));

// Abreviações e nomes (sem acento, minúsculas) → chave da Almeida. Mesma lista de nomes do concilio.
const ABREV = {
  genesis: 'gn', gn: 'gn', gen: 'gn', exodo: 'ex', ex: 'ex', levitico: 'lv', lv: 'lv', lev: 'lv',
  numeros: 'nm', nm: 'nm', num: 'nm', deuteronomio: 'dt', dt: 'dt', deut: 'dt', josue: 'js', js: 'js',
  juizes: 'jz', jz: 'jz', rute: 'rt', rt: 'rt', '1samuel': '1sm', '1sm': '1sm', '1sam': '1sm',
  '2samuel': '2sm', '2sm': '2sm', '2sam': '2sm', '1reis': '1rs', '1rs': '1rs', '2reis': '2rs', '2rs': '2rs',
  '1cronicas': '1cr', '1cr': '1cr', '2cronicas': '2cr', '2cr': '2cr', esdras: 'ed', ed: 'ed', esd: 'ed',
  neemias: 'ne', ne: 'ne', ester: 'et', et: 'et', job: 'jó', 'jó': 'jó', jo: 'jo', salmos: 'sl', salmo: 'sl', sl: 'sl', sal: 'sl',
  proverbios: 'pv', pv: 'pv', prov: 'pv', eclesiastes: 'ec', ec: 'ec', ecl: 'ec', cantares: 'ct',
  canticos: 'ct', cantico: 'ct', ct: 'ct', isaias: 'is', is: 'is', isa: 'is', jeremias: 'jr', jr: 'jr',
  jer: 'jr', lamentacoes: 'lm', lm: 'lm', ezequiel: 'ez', ez: 'ez', daniel: 'dn', dn: 'dn', dan: 'dn',
  oseias: 'os', os: 'os', joel: 'jl', jl: 'jl', amos: 'am', am: 'am', obadias: 'ob', ob: 'ob',
  jonas: 'jn', jn: 'jn', miqueias: 'mq', mq: 'mq', naum: 'na', na: 'na', habacuque: 'hc', hc: 'hc',
  sofonias: 'sf', sf: 'sf', ageu: 'ag', ag: 'ag', zacarias: 'zc', zc: 'zc', malaquias: 'ml', ml: 'ml',
  mateus: 'mt', mt: 'mt', mat: 'mt', marcos: 'mc', mc: 'mc', lucas: 'lc', lc: 'lc', luc: 'lc',
  joao: 'jo', atos: 'atos', at: 'atos', romanos: 'rm', rm: 'rm', rom: 'rm',
  '1corintios': '1co', '1co': '1co', '1cor': '1co', '2corintios': '2co', '2co': '2co', '2cor': '2co',
  galatas: 'gl', gl: 'gl', efesios: 'ef', ef: 'ef', filipenses: 'fp', fp: 'fp', colossenses: 'cl', cl: 'cl',
  '1tessalonicenses': '1ts', '1ts': '1ts', '2tessalonicenses': '2ts', '2ts': '2ts',
  '1timoteo': '1tm', '1tm': '1tm', '2timoteo': '2tm', '2tm': '2tm', tito: 'tt', tt: 'tt',
  filemom: 'fm', fm: 'fm', hebreus: 'hb', hb: 'hb', tiago: 'tg', tg: 'tg',
  '1pedro': '1pe', '1pe': '1pe', '2pedro': '2pe', '2pe': '2pe', '1joao': '1jo', '1jo': '1jo',
  '2joao': '2jo', '2jo': '2jo', '3joao': '3jo', '3jo': '3jo', judas: 'jd', jd: 'jd',
  apocalipse: 'ap', ap: 'ap', apoc: 'ap',
};

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const chave = (b, c, v) => b * 1000000 + c * 1000 + v;
const decompor = (k) => ({ b: Math.floor(k / 1000000), c: Math.floor(k / 1000) % 1000, v: k % 1000 });
const nomeRef = (b, c, v1, v2) => `${NOME[AB[b - 1]]} ${c}${v1 ? ':' + v1 : ''}${v2 && v2 !== v1 ? '-' + v2 : ''}`;

// Existe mesmo na Almeida? (capítulo e versículo). Sem o texto carregado, nada existe — de propósito.
function existe(bib, b, c, v) {
  const caps = bib && bib[AB[b - 1]];
  return !!(caps && caps[c - 1] && caps[c - 1][v - 1] !== undefined);
}

function chaveLivro(num, palavra) {
  const p = semAcento(palavra).toLowerCase().replace(/[^a-z]/g, '');
  if (p === 'jo') return /ó/i.test(palavra) ? 'jó' : 'jo';
  return (num ? String(num).replace(/[^123]/g, '') : '') + p;
}

const TRACO = '[-‐-―−]';
const PREFIXO = '(?:([123])\\s*[ªº°]?\\s*|(I{1,3})\\s*\\.?\\s+)?';
const RE_SRC = '(?:^|[^\\wÀ-ÿ])' + PREFIXO + '([A-Za-zÀ-ÿ]{2,16})\\.?\\s*(\\d{1,3})\\s*[:.]\\s*(\\d{1,3})(?!\\d)'
  + '(?:\\s*(?:' + TRACO + '|a)\\s*(\\d{1,3})(?!\\d))?';

// Toda referência "Livro cap:vers" (ou "cap.vers", ou "cap:v1-v2") do texto, validada contra a Almeida.
// Abreviação de 3 letras ou menos em minúscula ("os 2.500", "am 3.4") NÃO conta.
function achar(texto, bib) {
  const out = [];
  const t = String(texto || '');
  const re = new RegExp(RE_SRC, 'g');
  for (let m; (m = re.exec(t));) {
    const w = m[3];
    if (w.length <= 3 && /^[a-zà-ÿ]/.test(w)) continue;
    const romano = { i: 1, ii: 2, iii: 3 }[String(m[2] || '').toLowerCase()];
    const ab = ABREV[chaveLivro(romano || m[1], w)];
    const b = IDX_AB[ab];
    if (!b) continue;
    const cap = +m[4], v1 = +m[5];
    let v2 = m[6] ? +m[6] : v1;
    if (cap < 1 || v1 < 1) continue;
    if (bib) {
      if (!existe(bib, b, cap, v1)) continue;
      if (v2 !== v1 && (v2 < v1 || !existe(bib, b, cap, v2))) v2 = v1;
    }
    out.push({ b, ab, cap, v1, v2, bruto: m[0].replace(/^[^\wÀ-ÿ]+/, '').trim() });
  }
  return out;
}

// A seção de um trecho ("Gênesis 40:14" ou "Gênesis 40") → versículo ou capítulo inteiro. null se não for referência.
function refDaSecao(secao, bib) {
  const s = String(secao || '').trim();
  const v = achar(s, bib)[0];
  if (v) return { modo: 'verso', b: v.b, cap: v.cap, v1: v.v1, v2: v.v2 };
  const m = s.match(/^(.+?)\s*(\d{1,3})\s*$/);
  if (!m) return null;
  let p = semAcento(m[1]).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (p === 'jo' && /ó/i.test(m[1])) p = 'jó';
  const b = IDX_AB[ABREV[p]];
  if (!b) return null;
  const cap = +m[2];
  if (!existe(bib, b, cap, 1)) return null;
  return { modo: 'capitulo', b, cap };
}

// Código do OpenBible ("Prov.8.22") → { b, c, v }. null se não reconhecer.
function parseOB(tok) {
  const m = String(tok || '').trim().match(/^(\d?[A-Za-z]+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  const b = OB[m[1]];
  return b ? { b, c: +m[2], v: +m[3] } : null;
}

// Texto da Almeida de um intervalo de chaves (pode cruzar capítulos). Corta em `max` versículos.
function textoIntervalo(bib, ini, fim, max = 8) {
  const a = decompor(ini), z = decompor(fim);
  const partes = [];
  let b = a.b, c = a.c, v = a.v;
  for (let n = 0; n < 400 && partes.length < max; n++) {
    if (chave(b, c, v) > fim) break;
    if (!existe(bib, b, c, v)) {
      if (!existe(bib, b, c + 1, 1)) break;
      c += 1; v = 1; continue;
    }
    partes.push(bib[AB[b - 1]][c - 1][v - 1]);
    v += 1;
    if (v > 176) break;
  }
  if (!partes.length) return null;
  const fora = chave(z.b, z.c, z.v) - chave(b, c, v) > 0 && partes.length >= max;
  return partes.join(' ') + (fora ? ' …' : '');
}

module.exports = {
  LIVROS, AB, IDX_AB, NOME, ABREV, OB,
  semAcento, chave, decompor, nomeRef, existe, achar, refDaSecao, parseOB, textoIntervalo,
};
