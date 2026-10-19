// ═══════════════════════════════════════════════════════════════════════════════
// O CONHECIMENTO REAL DO GLOBO DE VOZ — ferramentas que BUSCAM, em vez de lembrar.
//
// O PROBLEMA QUE ISTO RESOLVE (não é teórico, aconteceu em produção):
// modelo de linguagem não "sabe" a Bíblia: ele PREVÊ o próximo pedaço de texto. Quando
// a previsão sai errada, ela sai errada COM CONFIANÇA — e com voz de mestre, o que é
// pior ainda. Os dois erros capturados na Sala do Concílio estão no banco de provas
// (scripts/_provar-conferidor.mjs): chamar de GREGO uma palavra de Gênesis, e pôr entre
// aspas, em Levítico 23:10-12, um texto que não está lá. O pastor confiou. Era mentira.
//
// A CURA NÃO É PEDIR PRA ELE TER CUIDADO. É TIRAR O ASSUNTO DA MEMÓRIA DELE.
// Aqui o mestre não responde de cabeça: ele CHAMA uma ferramenta, recebe o texto exato
// que o RADAR já tem no disco, e fala em cima daquilo. Se a ferramenta não achar, ele
// não tem o que dizer — e dizer "não sei" é a resposta certa, não a falha.
//
// AS CINCO PORTAS (a primeira já existia, as quatro de baixo nasceram aqui):
//   garimpar            → material de estudo do acervo (em concilio-wagner.js)
//   ler_versiculo       → o texto EXATO, de public/biblia.json (4 MB, a Bíblia do app)
//   buscar_no_acervo    → as pregações do próprio Elias, por SENTIDO (public/busca/*)
//   versiculos_ligados  → o motor de ligações por sentido (/api/estudo-busca?sem=1)
//   conferir_citacao    → a trava mecânica: "o versículo diz MESMO isso?"
//
// NADA AQUI É NOVO. Tudo isto já rodava no RADAR — a Bíblia do app, o índice vetorial
// da Busca por Significado, o motor de ligações do Meu Estudo, a régua de 45% do
// conferidor. Este arquivo é o ENCAIXE: põe o que já existe na boca do mestre.
//
// POR QUE VIVE EM api/_lib/ E NÃO EM api/: a Vercel Hobby dá 12 funções e 11 já estão
// ocupadas. Arquivo com prefixo _ não vira função — entra no bundle do /api/edge.
// O globo continua batendo num endereço só: POST /api/voz.
//
// EDGE RUNTIME: sem fs, sem require. Tudo o que é arquivo vem por fetch da MESMA
// origem (os .json e .bin são estáticos, servidos pela CDN da Vercel) e fica guardado
// em memória no módulo — a segunda chamada da mesma instância não baixa de novo.
// ═══════════════════════════════════════════════════════════════════════════════

import { buscarContexto } from './concilio-wagner.js';
import { embutirPergunta } from './busca-vetor.js';
// A SÉTIMA PORTA: a memória. Ela é DECLARADA aqui, junto com as outras, porque
// quem lê esta lista é o modelo — e pra ele memória é ferramenta igual às
// demais: ou ele busca, ou ele não sabe. O miolo mora em voz-memoria.js.
// ⚠️ A seta aponta só pra cá: voz-memoria.js NÃO importa este arquivo (ele
// recebe o redator por parâmetro). Import circular em ESM deixa `const` em TDZ
// e o módulo morre no carregamento — e um globo que não carrega é tela morta.
import { FERRAMENTA_MEMORIA, oQueJaFalamos, semSegredo } from './voz-memoria.js';
import { iaTexto } from './ia.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1) OS LIVROS — apelido → abreviação do biblia.json, nome por extenso, testamento.
// Copiado do conferidor que já roda no navegador (public/assets/conferidor.js) para
// que servidor e tela falem EXATAMENTE a mesma língua. Divergir aqui seria pior que
// não ter: a tela acenderia aviso num versículo que a voz jurou estar certo.
// ─────────────────────────────────────────────────────────────────────────────
const MAP = {
  genesis: 'gn', gn: 'gn', gen: 'gn', exodo: 'ex', ex: 'ex', levitico: 'lv', lv: 'lv',
  numeros: 'nm', nm: 'nm', deuteronomio: 'dt', dt: 'dt', josue: 'js', js: 'js',
  juizes: 'jz', jz: 'jz', rute: 'rt', rt: 'rt',
  '1samuel': '1sm', '1sm': '1sm', '2samuel': '2sm', '2sm': '2sm',
  '1reis': '1rs', '1rs': '1rs', '2reis': '2rs', '2rs': '2rs',
  '1cronicas': '1cr', '1cr': '1cr', '2cronicas': '2cr', '2cr': '2cr',
  esdras: 'ed', ed: 'ed', neemias: 'ne', ne: 'ne', ester: 'et', et: 'et',
  salmos: 'sl', salmo: 'sl', sl: 'sl', sal: 'sl', proverbios: 'pv', pv: 'pv', prov: 'pv',
  eclesiastes: 'ec', ec: 'ec', cantares: 'ct', canticos: 'ct', ct: 'ct',
  isaias: 'is', is: 'is', jeremias: 'jr', jr: 'jr', lamentacoes: 'lm', lm: 'lm',
  ezequiel: 'ez', ez: 'ez', daniel: 'dn', dn: 'dn', oseias: 'os', os: 'os',
  joel: 'jl', jl: 'jl', amos: 'am', am: 'am', obadias: 'ob', ob: 'ob',
  jonas: 'jn', jn: 'jn', miqueias: 'mq', mq: 'mq', naum: 'na', na: 'na',
  habacuque: 'hc', hc: 'hc', sofonias: 'sf', sf: 'sf', ageu: 'ag', ag: 'ag',
  zacarias: 'zc', zc: 'zc', malaquias: 'ml', ml: 'ml',
  mateus: 'mt', mt: 'mt', marcos: 'mc', mc: 'mc', lucas: 'lc', lc: 'lc', joao: 'jo',
  atos: 'atos', at: 'atos', romanos: 'rm', rm: 'rm', rom: 'rm',
  '1corintios': '1co', '1co': '1co', '1cor': '1co',
  '2corintios': '2co', '2co': '2co', '2cor': '2co',
  galatas: 'gl', gl: 'gl', efesios: 'ef', ef: 'ef', filipenses: 'fp', fp: 'fp', fil: 'fp',
  colossenses: 'cl', cl: 'cl',
  '1tessalonicenses': '1ts', '1ts': '1ts', '2tessalonicenses': '2ts', '2ts': '2ts',
  '1timoteo': '1tm', '1tm': '1tm', '2timoteo': '2tm', '2tm': '2tm',
  tito: 'tt', tt: 'tt', filemom: 'fm', fm: 'fm', hebreus: 'hb', hb: 'hb', heb: 'hb',
  tiago: 'tg', tg: 'tg', '1pedro': '1pe', '1pe': '1pe', '2pedro': '2pe', '2pe': '2pe',
  '1joao': '1jo', '1jo': '1jo', '2joao': '2jo', '2jo': '2jo', '3joao': '3jo', '3jo': '3jo',
  judas: 'jd', jd: 'jd', apocalipse: 'ap', ap: 'ap', apoc: 'ap',
};
const NOMES = {
  gn: 'Gênesis', ex: 'Êxodo', lv: 'Levítico', nm: 'Números', dt: 'Deuteronômio',
  js: 'Josué', jz: 'Juízes', rt: 'Rute', '1sm': '1 Samuel', '2sm': '2 Samuel',
  '1rs': '1 Reis', '2rs': '2 Reis', '1cr': '1 Crônicas', '2cr': '2 Crônicas',
  ed: 'Esdras', ne: 'Neemias', et: 'Ester', 'jó': 'Jó', sl: 'Salmos', pv: 'Provérbios',
  ec: 'Eclesiastes', ct: 'Cantares', is: 'Isaías', jr: 'Jeremias', lm: 'Lamentações',
  ez: 'Ezequiel', dn: 'Daniel', os: 'Oseias', jl: 'Joel', am: 'Amós', ob: 'Obadias',
  jn: 'Jonas', mq: 'Miqueias', na: 'Naum', hc: 'Habacuque', sf: 'Sofonias', ag: 'Ageu',
  zc: 'Zacarias', ml: 'Malaquias', mt: 'Mateus', mc: 'Marcos', lc: 'Lucas', jo: 'João',
  atos: 'Atos', rm: 'Romanos', '1co': '1 Coríntios', '2co': '2 Coríntios', gl: 'Gálatas',
  ef: 'Efésios', fp: 'Filipenses', cl: 'Colossenses', '1ts': '1 Tessalonicenses',
  '2ts': '2 Tessalonicenses', '1tm': '1 Timóteo', '2tm': '2 Timóteo', tt: 'Tito',
  fm: 'Filemom', hb: 'Hebreus', tg: 'Tiago', '1pe': '1 Pedro', '2pe': '2 Pedro',
  '1jo': '1 João', '2jo': '2 João', '3jo': '3 João', jd: 'Judas', ap: 'Apocalipse',
};
// Os 39 do Antigo. É DAQUI que sai a trava de idioma: palavra de livro do AT é
// hebraico (ou aramaico, em pedaços de Daniel e Esdras); de livro do NT é grego.
// Nunca mais "a palavra grega de Gênesis 1:1".
const ANTIGO = {};
'gn ex lv nm dt js jz rt 1sm 2sm 1rs 2rs 1cr 2cr ed ne et jó sl pv ec ct is jr lm ez dn os jl am ob jn mq na hc sf ag zc ml'
  .split(' ').forEach((a) => { ANTIGO[a] = 1; });

// Daniel 2-7 e Esdras 4-7 são ARAMAICO, não hebraico. Detalhe pequeno que um mestre
// de verdade sabe — e que o pastor perguntando de Daniel vai justamente tocar.
function idiomaDe(ab, cap) {
  if (!ANTIGO[ab]) return 'grego (é livro do Novo Testamento)';
  if (ab === 'dn' && cap >= 2 && cap <= 7) return 'aramaico (Daniel 2 a 7 foi escrito em aramaico, não em hebraico)';
  if (ab === 'ed' && cap >= 4 && cap <= 7) return 'aramaico (trechos de Esdras 4 a 7 foram escritos em aramaico)';
  return 'hebraico (é livro do Antigo Testamento)';
}

function semAcento(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function chaveLivro(s) { return semAcento(s).replace(/[.\s]/g, ''); }
// "Jo" no Brasil é João; "Jó" é o livro de Jó. Com acento resolve; sem acento
// tentamos João primeiro (é o que a IA quer dizer em 99 dos 100 casos) e caímos pra Jó.
function resolverLivro(bruto) {
  const k = chaveLivro(bruto);
  if (k === 'jo') return /ó/i.test(bruto) ? ['jó', 'jo'] : ['jo', 'jó'];
  if (k === 'job') return ['jó'];
  return MAP[k] ? [MAP[k]] : null;
}

// "Daniel 12:4", "dn 12.4", "1 Coríntios 15:20-22", "Salmo 23", "sl 23 4"
const RE_REF = /^\s*([123])?\s*([A-Za-zÀ-ÿçÇ]{2,22})\.?\s*(\d{1,3})(?:\s*[:.\s]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?)?\s*$/;
function partirRef(bruto) {
  const m = String(bruto || '').trim().match(RE_REF);
  if (!m) return null;
  const cands = resolverLivro((m[1] || '') + m[2]);
  if (!cands) return null;
  return { cands, cap: +m[3], v: m[4] ? +m[4] : null, v2: m[5] ? +m[5] : null };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) A BÍBLIA DE VERDADE — public/biblia.json, o MESMO arquivo que o app lê.
// Baixa uma vez por instância e fica na memória. Se a CDN falhar, a ferramenta
// DIZ que falhou; ela nunca devolve um versículo "de cabeça" pra tapar o buraco.
// ─────────────────────────────────────────────────────────────────────────────
let BIBLIA = null, IDX = null, baixandoBiblia = null;

async function abrirBiblia(origem) {
  if (BIBLIA) return true;
  if (baixandoBiblia) return baixandoBiblia;
  baixandoBiblia = (async () => {
    try {
      const r = await fetch(origem + '/biblia.json', { headers: { accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      // O arquivo começa com BOM (﻿). JSON.parse engasga nele — tira antes.
      BIBLIA = JSON.parse((await r.text()).replace(/^﻿/, ''));
      IDX = {};
      BIBLIA.forEach((b, i) => { IDX[b.abbrev] = i; });
      return true;
    } catch (_) {
      baixandoBiblia = null;   // deixa a próxima chamada tentar de novo
      return false;
    }
  })();
  return baixandoBiblia;
}

// Devolve os versículos como lista, cada um com o número — em voz, "versículo quatro
// diz" vale mais do que um bloco corrido sem costura.
function pegarVersos(ab, cap, v, v2) {
  const bi = IDX ? IDX[ab] : null;
  if (bi == null) return null;
  const ch = BIBLIA[bi].chapters[cap - 1];
  if (!ch) return null;
  const i = v || 1;
  let f = v2 || (v ? v : ch.length);
  if (i < 1 || i > ch.length) return null;
  if (f > ch.length) f = ch.length;
  const out = [];
  for (let n = i; n <= f; n++) out.push({ v: n, texto: ch[n - 1] });
  return out;
}

function rotular(ab, cap, v, v2) {
  return (NOMES[ab] || ab) + ' ' + cap + (v ? ':' + v + (v2 ? '-' + v2 : '') : '');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) ler_versiculo — o texto EXATO, com o testamento e o idioma original na mesma
//    resposta. O mestre não precisa lembrar se Daniel é AT: vem escrito.
// ─────────────────────────────────────────────────────────────────────────────
async function lerVersiculo(ref, origem) {
  const p = partirRef(ref);
  if (!p) {
    return { achou: false, motivo: 'Não entendi essa referência: "' + String(ref || '').slice(0, 60)
      + '". Mande no formato "Daniel 12:4" ou "Salmos 23:4".' };
  }
  if (!(await abrirBiblia(origem))) {
    return { achou: false, motivo: 'A Bíblia do RADAR não respondeu agora. NÃO cite o versículo de memória: diga ao pastor que a consulta falhou.' };
  }
  // Capítulo inteiro sem versículo é despejo em conversa falada. Teto de 12 versículos.
  const limitado = p.v && p.v2 && (p.v2 - p.v) > 11 ? p.v + 11 : p.v2;
  for (const ab of p.cands) {
    const versos = pegarVersos(ab, p.cap, p.v, limitado);
    if (versos && versos.length) {
      return {
        achou: true,
        referencia: rotular(ab, p.cap, p.v, limitado),
        livro: NOMES[ab] || ab,
        testamento: ANTIGO[ab] ? 'Antigo Testamento' : 'Novo Testamento',
        idioma_original: idiomaDe(ab, p.cap),
        versiculos: versos,
        texto: versos.map((x) => x.texto).join(' '),
        fonte: 'Bíblia do RADAR (public/biblia.json, Almeida)',
        ordem: 'Fale a partir DESTE texto e só dele. Se o que você ia dizer não está aqui, não diga.',
      };
    }
  }
  return {
    achou: false,
    motivo: 'Essa referência não existe na Bíblia: ' + rotular(p.cands[0], p.cap, p.v, p.v2)
      + '. NÃO invente o texto — diga ao pastor que a referência não fecha e peça a correta.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) conferir_citacao — A TRAVA. É a nossa maior vantagem sobre qualquer chatbot.
//
// A régua de 45% não é chute: foi medida em produção e está no banco de provas
// (scripts/_provar-conferidor.mjs). As invenções capturadas ao vivo deram 0% e 16%
// de palavras em comum com o versículo real; a citação HONESTA mais fraca deu 44%.
// Por isso: ≥45% confere · 25-45% é paráfrase (avisa) · <25% NÃO é esse versículo.
// Alarme falso é tão ruim quanto erro: se acusar acerto, o pastor para de confiar.
// ─────────────────────────────────────────────────────────────────────────────
function palavras(s) {
  return semAcento(s).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length >= 4);
}
function medir(afirmado, real) {
  const A = palavras(afirmado);
  if (!A.length) return 1;
  const S = new Set(palavras(real));
  let h = 0;
  for (const w of A) if (S.has(w)) h++;
  return h / A.length;
}

async function conferirCitacao(ref, oQueEuDisse, origem) {
  const base = await lerVersiculo(ref, origem);
  if (!base.achou) {
    return { veredito: 'REFERÊNCIA NÃO EXISTE', pode_falar: false, motivo: base.motivo,
      ordem: 'NÃO use essa citação. Diga que não confirmou e siga pelo que você conferiu.' };
  }
  const dito = String(oQueEuDisse || '').trim();
  if (dito.length < 8) {
    return { veredito: 'NADA A CONFERIR', pode_falar: true, referencia: base.referencia,
      texto_real: base.texto, idioma_original: base.idioma_original,
      ordem: 'Você não mandou o que ia afirmar. O texto real está aí: fale em cima dele.' };
  }
  const batimento = medir(dito, base.texto);
  const pct = Math.round(batimento * 100);

  // Trava de idioma: o erro de produção foi chamar de GREGA uma palavra de Gênesis.
  // Se a afirmação citar o idioma errado para o testamento, isso vira reprovação.
  const dizGrego = /\bgreg[oa]s?\b/i.test(dito);
  const dizHebraico = /\bhebraic[oa]s?\b/i.test(dito);
  const ehAT = base.testamento === 'Antigo Testamento';
  let erroIdioma = '';
  if (ehAT && dizGrego && !dizHebraico) erroIdioma = 'Você chamou de GREGA uma palavra de ' + base.livro + ', que é do ANTIGO TESTAMENTO. O original ali é ' + base.idioma_original + '. Corrija ou não fale da palavra.';
  if (!ehAT && dizHebraico && !dizGrego) erroIdioma = 'Você chamou de HEBRAICA uma palavra de ' + base.livro + ', que é do NOVO TESTAMENTO. O original ali é grego. Corrija ou não fale da palavra.';

  let veredito, pode, ordem;
  if (erroIdioma) {
    veredito = 'IDIOMA ERRADO'; pode = false; ordem = erroIdioma;
  } else if (batimento >= 0.45) {
    veredito = 'CONFERE'; pode = true;
    ordem = 'Bate com o texto. Pode falar com firmeza — e cite a referência em voz alta.';
  } else if (batimento >= 0.25) {
    veredito = 'PARÁFRASE'; pode = true;
    ordem = 'O sentido está perto, mas NÃO são as palavras do versículo. Não ponha entre aspas nem diga "está escrito assim": diga que o texto FALA de, e leia o texto real se for citar.';
  } else {
    veredito = 'NÃO CONFERE'; pode = false;
    ordem = 'O versículo NÃO diz isso. NÃO use essa citação de jeito nenhum. Leia o texto real que veio aqui e refaça o seu ponto em cima dele — ou diga ao pastor que se enganou, com naturalidade.';
  }

  return {
    veredito, pode_falar: pode, batimento: pct + '% das suas palavras estão no versículo',
    referencia: base.referencia, texto_real: base.texto,
    testamento: base.testamento, idioma_original: base.idioma_original,
    fonte: base.fonte, ordem,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) buscar_no_acervo — AS PREGAÇÕES DO PRÓPRIO ELIAS, por SENTIDO.
//
// O índice é pré-calculado no PC dele (scripts/indexar-busca.mjs) e vira arquivo
// estático: public/busca/mensagens.idx.json (título, referência, trecho) e
// mensagens.vec.bin (os vetores em int8). 275 trechos, 70 KB de vetor — cabe na
// memória da borda sem pestanejar. Só a PERGUNTA vira vetor online, pelo mesmíssimo
// caminho da Busca por Significado do app (embutirPergunta, em busca-vetor.js).
// Se lá melhorar, aqui melhora junto: é uma função só, não duas cópias.
// ─────────────────────────────────────────────────────────────────────────────
let ACERVO = null, baixandoAcervo = null;

async function abrirAcervo(origem) {
  if (ACERVO) return ACERVO;
  if (baixandoAcervo) return baixandoAcervo;
  baixandoAcervo = (async () => {
    try {
      const [ri, rv] = await Promise.all([
        fetch(origem + '/busca/mensagens.idx.json'),
        fetch(origem + '/busca/mensagens.vec.bin'),
      ]);
      if (!ri.ok || !rv.ok) throw new Error('HTTP ' + ri.status + '/' + rv.status);
      const meta = await ri.json();
      const vec = new Int8Array(await rv.arrayBuffer());
      ACERVO = { meta, vec, dims: meta.dims, escala: meta.escala };
      return ACERVO;
    } catch (_) {
      baixandoAcervo = null;
      return null;
    }
  })();
  return baixandoAcervo;
}

// ─────────────────────────────────────────────────────────────────────────────
// A EBD — A LIÇÃO QUE A IGREJA VAI ESTUDAR NO DOMINGO.
// Elias (23/09/2026): "o globo precisa ter acesso a todas as lições atuais...
// focar na lição que estudaremos no próximo domingo sempre... saber responder o
// nome de todas as lições, qual a lição 3, qual a 12, e em que lição estamos
// de acordo com as datas vigentes."
// O catálogo é gerado do próprio app.js (scripts/gerar-catalogo-ebd.mjs), então
// título errado aqui só existe se estiver errado no app — fonte única.
// ─────────────────────────────────────────────────────────────────────────────
let _catEBD = null;
async function abrirCatalogoEBD(origem) {
  if (_catEBD) return _catEBD;
  try {
    const r = await fetch(origem + '/ebd/catalogo.json', { cf: { cacheTtl: 900 } });
    if (!r.ok) return null;
    _catEBD = await r.json();
    return _catEBD;
  } catch (_) { return null; }
}

// ─── O TRIMESTRE DE VERDADE ───────────────────────────────────────────────────
// 19/10/2026: a conta antiga contava semanas desde 05/07 (3º tri) e, em outubro, dava "lição 17" — que não
// existe. O 4º trimestre começou em 04/10/2026 e mora nas turmas adulto4/jovem4 (mesma conta de
// licaoDaSemana4 no app). Trimestre novo = acrescentar uma linha aqui (o mais novo em cima).
const TRIMESTRES = [
  { inicio: '2026-10-04', nome: '4º trimestre de 2026', turmas: { adulto: 'adulto4', jovem: 'jovem4' } },
  { inicio: '2026-07-05', nome: '3º trimestre de 2026', turmas: { adulto: 'adulto', jovem: 'jovem', juvenis: 'juvenis', adolescentes: 'adolescentes', juniores: 'juniores' } },
];
function trimestreDe(dia) {
  const d = dia.toISOString().slice(0, 10);
  return TRIMESTRES.find((t) => d >= t.inicio) || TRIMESTRES[TRIMESTRES.length - 1];
}
// O domingo que vem é o alvo; se hoje já é domingo, o alvo é hoje (mesma regra do app). Horário de Brasília.
function licaoDeHoje() {
  const agora = new Date(Date.now() - 3 * 3600000);
  const hoje = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
  const prox = new Date(hoje);
  if (hoje.getUTCDay() !== 0) prox.setUTCDate(hoje.getUTCDate() + (7 - hoje.getUTCDay()));
  const tri = trimestreDe(prox);
  const inicio = new Date(tri.inicio + 'T00:00:00Z');
  const n = Math.max(1, Math.min(13, Math.round((prox - inicio) / (7 * 86400000)) + 1));
  return { n, domingo: prox.toISOString().slice(0, 10), tri };
}

// O pacote da lição (scripts/ebd-voz-pacote.mjs → public/ebd/<turma>/voz/NN.json), guardado em memória.
const _pacote = new Map();
async function pacoteDaLicao(origem, turma, n) {
  const k = turma + '/' + n;
  if (_pacote.has(k)) return _pacote.get(k);
  try {
    const r = await fetch(`${origem}/ebd/${turma}/voz/${String(n).padStart(2, '0')}.json`);
    if (!r.ok) return null;
    const j = await r.json();
    _pacote.set(k, j);
    return j;
  } catch (_) { return null; }
}
// Quem escreveu cada revista (public/ebd/voz-autores.json) — o globo fala do autor só com o que está ali.
let _autores = null;
async function autoresEBD(origem) {
  if (_autores) return _autores;
  try { const r = await fetch(origem + '/ebd/voz-autores.json'); _autores = r.ok ? await r.json() : {}; } catch (_) { _autores = {}; }
  return _autores;
}

const PAGINA = 4500;   // texto longo (Cristão Alerta, livro de apoio, devocional) sai em páginas
function pagina(txt, p) {
  const t = String(txt || '');
  const total = Math.max(1, Math.ceil(t.length / PAGINA));
  const i = Math.max(1, Math.min(total, parseInt(p || 1, 10) || 1));
  let ini = (i - 1) * PAGINA, fim = Math.min(t.length, i * PAGINA);
  if (i > 1) { const q = t.lastIndexOf('\n', ini + 200); if (q > ini - 400 && q > 0) ini = q + 1; }
  if (fim < t.length) { const q = t.lastIndexOf('\n', fim); if (q > ini + PAGINA / 2) fim = q; }
  return { texto: t.slice(ini, fim).trim(), pagina: i, de: total };
}

// O JEITO DE ENSINAR — o Elias: "o texto nunca pode ser monótono". Vai em toda resposta de conteúdo.
const COMO_ENSINAR = 'COMO FALAR ISTO (obrigatório): você é um PROFESSOR DE EBD apaixonado, não um leitor de revista. '
  + 'NÃO leia o texto em voz alta palavra por palavra. Conte com as suas palavras, com calor e ritmo: comece por uma '
  + 'pergunta, uma imagem ou um contraste que prenda; explique cada subtópico pelo texto bíblico dele (abra com ler_versiculo '
  + 'quando for citar); traga UMA aplicação concreta para hoje; alterne frase curta e longa; e no fim faça UMA pergunta para '
  + 'a classe ou ofereça o próximo ponto. Deixe claro que é o que a revista ensina ("o comentarista mostra que…"). '
  + 'Fale SÓ do que está aqui: não invente o que a lição diz.';

function turmaPedida(txt) {
  const t = semAcento(String(txt || '')).toLowerCase();
  if (/jove/.test(t)) return 'jovem';
  if (/juveni/.test(t)) return 'juvenis';
  if (/adolesc/.test(t)) return 'adolescentes';
  if (/junior/.test(t)) return 'juniores';
  if (/adult/.test(t)) return 'adulto';
  return '';
}

async function licaoDaEBD(args, origem) {
  const a = args || {};
  const agora = licaoDeHoje();
  const tri = agora.tri;
  const quem = turmaPedida(a.turma) || 'adulto';
  const turma = tri.turmas[quem];
  if (!turma) {
    return { achou: false, turma: quem, trimestre: tri.nome,
      ordem: `A revista de ${quem} do ${tri.nome} ainda não está no RADAR — só a de adultos e a de jovens. Diga isso com naturalidade e ofereça a de adultos ou a de jovens.` };
  }

  // 1) a lista do trimestre
  if (a.listar) {
    const lic = [];
    for (let i = 1; i <= 13; i++) {
      const L = await pacoteDaLicao(origem, turma, i);
      if (L) lic.push({ numero: i, titulo: L.titulo, domingo: L.data });
    }
    return { achou: !!lic.length, turma: quem, trimestre: tri.nome, licao_do_proximo_domingo: agora.n, licoes: lic,
      ordem: 'Esta é a lista REAL. Diga número e título como estão, sem reescrever. A do domingo que vem está em licao_do_proximo_domingo.' };
  }

  const n = parseInt(a.licao, 10) > 0 ? parseInt(a.licao, 10) : agora.n;
  const L = await pacoteDaLicao(origem, turma, n);
  if (!L) {
    return { achou: false, pedido: n, licao_do_proximo_domingo: agora.n,
      ordem: 'Não achei essa lição no RADAR. Diga isso com todas as letras e ofereça a do domingo que vem. NÃO invente.' };
  }
  const autores = await autoresEBD(origem);
  const autor = autores[turma] || null;
  const cab = { achou: true, turma: quem, trimestre: tri.nome, licao: n, titulo: L.titulo, data: L.data,
    e_a_do_proximo_domingo: n === agora.n };
  const parte = semAcento(String(a.parte || 'resumo')).toLowerCase();
  const nTop = Math.max(1, parseInt(a.topico, 10) || 1);

  if (/^top/.test(parte)) {
    const T = L.topicos[nTop - 1];
    if (!T) return { ...cab, achou: false, ordem: `Esta lição tem ${L.topicos.length} tópicos. Diga isso e ofereça um deles.` };
    const ns = parseInt(a.subtopico, 10);
    const subs = ns > 0 ? T.subtopicos.filter((_, i) => i === ns - 1) : T.subtopicos;
    return { ...cab, topico: nTop, de_topicos: L.topicos.length, titulo_do_topico: T.titulo, subtopicos: subs,
      ordem: COMO_ENSINAR + ' Explique este TÓPICO subtópico por subtópico, na ordem. Se ele pediu só um subtópico, só aquele. '
        + (nTop < L.topicos.length ? `Ao terminar, ofereça o tópico ${nTop + 1}.` : 'É o último tópico: ofereça a conclusão.') };
  }
  if (/^intro/.test(parte)) return { ...cab, introducao: L.introducao, ordem: COMO_ENSINAR };
  if (/^concl/.test(parte)) return { ...cab, conclusao: L.conclusao, ordem: COMO_ENSINAR };
  if (/^revis|pergunt/.test(parte)) return { ...cab, perguntas_de_revisao: L.revisao,
    ordem: 'São as perguntas de REVISÃO da revista. Faça UMA de cada vez, como professor; espere a resposta e comente.' };
  if (/^leit/.test(parte)) return { ...cab, leitura_biblica: L.leitura,
    ordem: 'É a LEITURA BÍBLICA EM CLASSE. Se ele pedir para ler, leia os versículos exatamente como estão (são da Bíblia), com pausa entre eles.' };
  if (/^prof/.test(parte)) return { ...cab, ...(L.professor ? pagina(L.professor, a.pagina) : { texto: '' }),
    ordem: L.professor ? 'Material do PROFESSOR (palavra-chave, hinos sugeridos, plano de aula, auxílios). Destaque o que ele pediu, sem ler tudo.' : 'Esta turma não tem material do professor no RADAR. Diga isso.' };
  if (/alerta|subsid/.test(parte)) return { ...cab, ...(L.cristao_alerta ? pagina(L.cristao_alerta, a.pagina) : { texto: '' }),
    ordem: L.cristao_alerta ? COMO_ENSINAR + ' Isto é a revista CRISTÃO ALERTA (subsídio da lição): diga que vem do Cristão Alerta. Se houver mais páginas (de > pagina), ofereça continuar.'
      : 'A revista Cristão Alerta é só da classe de ADULTOS. Diga isso e ofereça a do adulto.' };
  if (/apoio|livro/.test(parte)) return { ...cab, livro_de_apoio: (autor && autor.livro_de_apoio) || '', ...(L.livro_de_apoio ? pagina(L.livro_de_apoio, a.pagina) : { texto: '' }),
    ordem: L.livro_de_apoio ? COMO_ENSINAR + ' Isto é o LIVRO DE APOIO do trimestre, do mesmo comentarista: diga o nome do livro. Se houver mais páginas, ofereça continuar.'
      : 'O livro de apoio desta turma não está no RADAR. Diga isso.' };
  if (/devoc/.test(parte)) return { ...cab, ...(L.devocional ? pagina(L.devocional, a.pagina) : { texto: '' }),
    ordem: L.devocional ? 'É o DEVOCIONAL da semana (leitura diária). Leia o dia que ele pedir, com calor.' : 'Esta turma não tem devocional no RADAR. Diga isso.' };
  if (/autor|coment/.test(parte)) return { ...cab, autor,
    ordem: autor ? 'Fale do COMENTARISTA com tudo o que está aqui — nome, igreja, formação, livros, outras revistas — com naturalidade e respeito. Não acrescente nada que não esteja aqui; se ele perguntar algo que não está, diga que não tem essa informação.'
      : 'Não tenho os dados do comentarista desta revista no RADAR. Diga isso — NÃO invente nome.' };

  // RESUMO (padrão): o que se fala ao abrir a lição
  return { ...cab,
    comentarista: autor ? autor.nome : '',
    texto_aureo: L.aureo, verdade_pratica: L.verdade_pratica, leitura_biblica: L.leitura.referencia,
    introducao: L.introducao,
    topicos: L.topicos.map((t, i) => ({ numero: i + 1, titulo: t.titulo, subtopicos: t.subtopicos.map((s) => s.titulo).filter(Boolean) })),
    tem_tambem: [L.professor && 'material do professor', L.cristao_alerta && 'revista Cristão Alerta', L.livro_de_apoio && 'livro de apoio',
      L.devocional && 'devocional da semana', 'perguntas de revisão', autor && 'dados do comentarista'].filter(Boolean),
    ordem: 'Abra a lição assim, NESTA ORDEM: (1) número e TÍTULO exatamente como está; (2) o TEXTO ÁUREO NA ÍNTEGRA, palavra por palavra, com a referência — PROIBIDO resumir; mostre no telão; (3) a VERDADE PRÁTICA inteira; '
      + '(4) os TÓPICOS, em uma frase cada. Se "e_a_do_proximo_domingo", diga que é a do domingo que vem. '
      + 'Quando ele pedir para EXPLICAR um tópico ("o primeiro", "agora o segundo"), chame licao_da_ebd de novo com parte="topico" e topico=N — '
      + 'o texto completo do tópico vem de lá. Para Cristão Alerta, livro de apoio, professor, devocional, revisão ou o autor, use parte=alerta/apoio/professor/devocional/revisao/autor. '
      + COMO_ENSINAR };
}

async function buscarNoAcervo(pergunta, origem, quantos = 4) {
  const q = String(pergunta || '').trim().slice(0, 400);
  if (q.length < 3) return { achou: false, motivo: 'pergunta curta demais para buscar' };

  const ac = await abrirAcervo(origem);
  if (!ac) return { achou: false, motivo: 'O acervo de pregações não respondeu agora. NÃO invente uma pregação: diga que não conseguiu abrir o material dele.' };

  let vetor;
  try { vetor = await embutirPergunta(q); } catch (_) { vetor = null; }
  if (!vetor) return { achou: false, motivo: 'Não consegui transformar a pergunta em busca agora. NÃO invente uma pregação: diga que a busca falhou.' };

  // Produto escalar puro. Os vetores do índice estão normalizados e quantizados em
  // int8 com um fator de escala único; como só interessa a ORDEM, nem precisamos
  // desfazer a escala — mas desfazemos assim mesmo, porque o score vira legível.
  const { vec, dims, escala } = ac;
  const total = ac.meta.total;
  const placar = [];
  for (let i = 0; i < total; i++) {
    const off = i * dims;
    let s = 0;
    for (let d = 0; d < dims; d++) s += vetor[d] * vec[off + d];
    placar.push([s * escala, i]);
  }
  placar.sort((a, b) => b[0] - a[0]);

  // Uma mensagem só entra UMA vez: dois parágrafos vizinhos da mesma pregação
  // enchem a resposta sem acrescentar assunto nenhum.
  const vistos = new Set(), achados = [];
  for (const [score, i] of placar) {
    const [d, , trecho] = ac.meta.itens[i];
    if (vistos.has(d)) continue;
    vistos.add(d);
    const doc = ac.meta.docs[d] || {};
    achados.push({
      mensagem: doc.t || doc.a || 'mensagem sem título',
      referencia_biblica: doc.r || '',
      arquivo: doc.a || '',
      trecho: trecho,
      parecenca: Math.round(score * 100) / 100,
    });
    if (achados.length >= quantos) break;
  }

  // 0,45 foi calibrado nas 5 perguntas de prova do indexador. Abaixo disso o
  // "melhor resultado" é só o menos ruim — e apresentar isso como "você pregou
  // sobre X" seria invenção com cara de busca.
  const forte = achados.length && achados[0].parecenca >= 0.45;
  return {
    achou: forte,
    fraco: !forte,
    total_no_acervo: ac.meta.docs.length,
    trechos: forte ? achados : achados.slice(0, 2),
    fonte: 'Acervo de mensagens do RADAR — pregações do próprio pastor Elias',
    ordem: forte
      ? 'Isto é material DELE. Diga de onde veio pelo NOME da mensagem ("numa pregação sua chamada tal") e fale em cima do trecho. Não invente o que ele disse além do que está escrito aqui.'
      : 'NENHUMA pregação dele casou de verdade com isso. Diga com todas as letras que você não achou esse assunto no acervo dele. Só mencione o que veio aqui se for para dizer que é o mais PERTO que existe, e diga que é o mais perto.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) versiculos_ligados — o MOTOR DE LIGAÇÕES que já roda no Meu Estudo.
// /api/estudo-busca?sem=1&ref=… devolve os versículos mais próximos POR SENTIDO,
// usando os vetores já gravados no Postgres (zero IA na hora da pergunta).
// Chamamos a rota de verdade em vez de copiar a consulta: o motor é um só.
// ─────────────────────────────────────────────────────────────────────────────
async function versiculosLigados(ref, origem, quantos = 6) {
  const p = partirRef(ref);
  if (!p) return { achou: false, motivo: 'Não entendi a referência. Use "Daniel 12:4".' };
  if (!p.v) return { achou: false, motivo: 'Para ligar por sentido preciso de capítulo E versículo, ex.: "Daniel 12:4".' };

  const alvo = origem + '/api/estudo-busca?sem=1&limit=' + quantos
    + '&ref=' + encodeURIComponent(p.cands[0] + ' ' + p.cap + ':' + p.v);
  let j = null;
  try {
    const r = await fetch(alvo, { headers: { accept: 'application/json' } });
    j = await r.json();
  } catch (_) { j = null; }

  if (!j || j.ok === false || !j.achou) {
    return { achou: false,
      motivo: 'O motor de ligações não trouxe nada para esse versículo. NÃO invente referências cruzadas: use só o que você conferiu com ler_versiculo.' };
  }
  return {
    achou: true,
    base: { referencia: j.base && j.base.ref, texto: j.base && j.base.texto },
    ligados: (j.itens || []).map((x) => ({ referencia: x.ref, texto: x.texto,
      parecenca: Math.round((x.score || 0) * 100) / 100 })),
    fonte: 'Motor de ligações do RADAR (versículos aproximados por sentido, vetores do próprio texto bíblico)',
    ordem: 'Estes são os versículos LIGADOS POR SENTIDO, não uma cadeia doutrinária pronta. '
      + 'Escolha UM que realmente sustente o seu ponto, cite a referência em voz alta, e ignore o resto. '
      + 'Ligação por sentido não é prova: se o texto não sustentar, deixe de lado.',
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 6-B) pesquisar_biblioteca — A BIBLIOTECA DO ELIAS COMO MOTOR INVISÍVEL
//
// ⚖️ ESTE É O PEDAÇO MAIS DELICADO DO ARQUIVO. Leia inteiro antes de mexer.
//
// O Elias comprou Champlin, Kittel, Waltke, Kidner, Pearlman, Horton, Gilberto.
// Ler o que ele comprou, pesquisar e CITAR A FONTE é legítimo — citar fonte não é
// crime, é o contrário disso. DISTRIBUIR o texto é que não pode.
//
// A diferença, na prática, é uma linha só: o parágrafo do autor pode chegar até o
// SERVIDOR, e para ali. Ele nunca atravessa pro celular, nem "só como contexto".
// Se o trecho viajasse até o navegador — mesmo que só pra ser repassado ao Gemini —
// a gente estaria entregando a biblioteca do homem, pedaço por pedaço, a quem
// abrisse o inspetor de rede.
//
// POR ISSO ESTA FERRAMENTA É DIFERENTE DAS OUTRAS QUATRO:
// as outras devolvem o que acharam. Esta não devolve o que achou. Ela PESQUISA e
// ESCREVE — aqui dentro, no servidor — uma nota de estudo ORIGINAL, com as palavras
// dela, dizendo de qual obra saiu cada coisa. O que desce pro navegador é só essa
// nota mais os nomes das fontes. O livro fica no Postgres, onde sempre esteve.
//
// É a mesma norma que já valia pro Kittel ("motor invisível, nunca vira tela"),
// agora valendo pra biblioteca inteira.
// ═════════════════════════════════════════════════════════════════════════════

// As chaves do Gemini. Mora AQUI (e não no voz.js) porque os dois precisam dela e
// duas cópias da mesma lista é como uma delas envelhece sem ninguém notar.
export function chavesGemini() {
  const out = [];
  for (const nome of ['GEMINI_API_KEYS', 'GEMINI_API_KEY', 'GOOGLE_API_KEY']) {
    const bruto = (typeof process !== 'undefined' && process.env && process.env[nome]) || '';
    for (const k of String(bruto).split(/[,\s;]+/)) {
      const t = k.trim();
      if (t && !out.includes(t)) out.push(t);
    }
  }
  return out;
}

// O REDATOR. Recebe os trechos, devolve texto original. Cascata de propósito:
// o Gemini escreve melhor em português, mas a cota grátis cai; o Llama no
// Cloudflare é o pneu reserva. Se os DOIS falharem, a ferramenta devolve
// "não consegui" — ela NUNCA devolve o trecho cru como consolo, porque o trecho
// cru é justamente o que não pode sair daqui.
const MODELO_TEXTO = 'gemini-3.8-flash';
const MODELO_CF = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

async function escrever(prompt, opts) {
  // CÉREBRO PREMIUM PRIMEIRO (só quando o chamador pede, hoje: a nota de pesquisa da biblioteca). A Claude (degrau
  // `premium` da cascata em ia.js, chave do Elias na Vercel) escreve teologia melhor que o Gemini-flash e o Llama.
  // Se ela falhar, ficar sem crédito (a cascata já trata "credit balance too low") ou demorar, cai sozinha no
  // caminho de sempre abaixo — a voz nunca fica sem resposta por causa disso.
  if (opts && opts.premium) {
    try {
      const r = await iaTexto({ sys: 'Você é um pesquisador de teologia que escreve notas de estudo para um pastor.', user: prompt,
        premium: true, max_tokens: 900, tag: 'globo-nota' });
      const t = r && typeof r.texto === 'string' ? r.texto.trim() : '';
      if (t) return t;
    } catch (_) { /* segue para o Gemini / Llama */ }
  }
  for (const chave of chavesGemini()) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO_TEXTO}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': chave, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
        }),
      });
      if (!r.ok) continue;
      const j = await r.json();
      const t = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map((p) => p.text || '').join('').trim();
      if (t) return t;
    } catch (_) { /* próxima chave */ }
  }
  const conta = process.env.CF_ACCOUNT_ID, tok = process.env.CF_AI_TOKEN;
  if (conta && tok) {
    try {
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${conta}/ai/run/${MODELO_CF}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], max_tokens: 900, temperature: 0.4 }),
      });
      if (r.ok) {
        const j = await r.json();
        const t = (j.result && (j.result.response
          || (((j.result.choices || [])[0] || {}).message || {}).content)) || '';
        if (String(t).trim()) return String(t).trim();
      }
    } catch (_) { /* acabou o reserva */ }
  }
  return '';
}

// A ORDEM DADA AO REDATOR. É aqui que a linha jurídica vira instrução concreta.
function ordemDeRedacao(pergunta, itens) {
  const material = itens.map((x, i) => {
    // A etiqueta de procedência viaja COM o trecho. Sem ela o redator trata um
    // comentarista reprovado igual a quem dá a palavra do original — e é aí que
    // a opinião de um vira "a Bíblia ensina".
    const selo = x.peso === 2 ? '[FONTE PRIMÁRIA — diz QUAL é a palavra no original]'
      : x.aprovado === false ? '[REPROVADO NO CONCÍLIO — vale só em grego, crítica textual e estudo de palavra; NUNCA em interpretação, NUNCA como palavra final]'
      : '[autor aprovado]';
    return `[${i + 1}] ${x.autor}${x.livro ? ' — ' + x.livro : ''}${x.secao && x.secao !== x.livro ? ' (' + x.secao + ')' : ''} ${selo}\n${x.texto}`;
  }).join('\n\n───\n\n');

  return `Você é um pesquisador que lê o acervo de estudo de um pastor e escreve uma NOTA DE PESQUISA para ele.

PERGUNTA DO PASTOR: ${pergunta}

MATERIAL CONSULTADO (uso interno — o pastor NÃO vai ver este texto):
"""
${material}
"""

COMO ESCREVER A NOTA — as regras são absolutas:

1. COM AS SUAS PALAVRAS. Leia, entenda, e escreva do seu jeito. É PROIBIDO copiar
   frase do material. Nada de reproduzir mais de seis palavras seguidas de um
   autor, nem parafrasear tão colado que vire cópia disfarçada. Se você só
   conseguir dizer aquilo com as palavras do autor, não diga.
2. DIGA DE ONDE VEIO, sempre, pelo nome: "Champlin trata disso em Gênesis 28",
   "Kittel registra que...", "Waltke observa que...". Citar a fonte é obrigatório
   e é o que torna a nota honesta.
3. NÃO INVENTE NADA. Só entra na nota o que o material sustenta. Se o material não
   responde a pergunta, escreva exatamente: NAO SUSTENTA — e depois, em uma linha,
   o que o material fala, se falar alguma coisa perto.
4. PALAVRA NO ORIGINAL: só se o material trouxer. Antigo Testamento é hebraico (ou
   aramaico); Novo Testamento é grego. NUNCA troque. Se o material não der a
   palavra, não invente transliteração nem etimologia.
5. ORDEM DE AUTORIDADE — obedeça a etiqueta que vem colada em cada trecho:
   • [FONTE PRIMÁRIA] (Owens no hebraico, Kittel no grego) é quem diz QUAL É A
     PALAVRA. Quando ela fala da palavra do original, é ela que vale; comentarista
     nenhum sobrepõe isso.
   • [autor aprovado] é voz legítima: pode sustentar interpretação.
   • [REPROVADO NO CONCÍLIO] (Champlin) entra SÓ em grego, crítica textual e
     estudo de palavra, onde ele é forte. Em interpretação disputada ele NÃO é
     voz: descarte, ou diga que é opinião dele. Nunca é a palavra final.
   E acima de todos: o texto bíblico. Se o comentarista disser uma coisa e o
   versículo disser outra, ganha o versículo — sempre.
6. TAMANHO: no máximo doze linhas, denso, sem enrolação, sem introdução do tipo
   "de acordo com o material consultado". Comece pelo achado. Isto vai virar fala
   de um mestre no meio de uma conversa, não um verbete.
7. Texto corrido em português do Brasil. Sem marcador, sem negrito, sem título.`;
}

async function pesquisarBiblioteca(pergunta, origem) {
  const q = String(pergunta || '').trim().slice(0, 400);
  if (q.length < 4) return { achou: false, motivo: 'pergunta curta demais' };

  const token = (typeof process !== 'undefined' && process.env && process.env.RADAR_ADMIN_TOKEN) || '';
  if (!token) {
    return { achou: false, motivo: 'A biblioteca não está configurada neste servidor. Diga que não conseguiu consultar e siga pelo texto bíblico.' };
  }

  let j = null;
  try {
    // servidor-pra-servidor, com o token vindo do env. O navegador nunca vê isto.
    const r = await fetch(origem + '/api/dados?fn=biblioteca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, n: 6, token }),
    });
    j = await r.json();
  } catch (_) { j = null; }

  if (!j || !j.ok || !(j.itens || []).length) {
    return { achou: false,
      motivo: 'A biblioteca não respondeu ou não achou nada sobre isso. NÃO invente erudição: diga que não encontrou e trabalhe com o texto bíblico, que você tem.' };
  }

  // O corte não é enfeite: abaixo disto o "melhor resultado" é só o menos ruim, e
  // mandar isso pro redator é pedir pra ele forçar uma conclusão que ninguém disse.
  const bons = j.itens.filter((x) => x.score >= 0.45);
  if (!bons.length) {
    return { achou: false,
      motivo: 'Procurei na biblioteca e não achei nada que sustente isso. Diga ao pastor, com todas as letras, que não encontrou apoio — e não preencha o vazio com erudição inventada.' };
  }

  const nota = await escrever(ordemDeRedacao(q, bons), { premium: true });
  if (!nota) {
    return { achou: false, motivo: 'Consultei a biblioteca mas não consegui fechar a pesquisa agora. Diga que a consulta falhou; não improvise erudição.' };
  }
  if (/^\s*NAO SUSTENTA/i.test(nota) || /^\s*NÃO SUSTENTA/i.test(nota)) {
    return { achou: false, nota_do_pesquisador: nota,
      fontes: [...new Set(bons.map((x) => x.autor))],
      motivo: 'A biblioteca NÃO sustenta o que foi perguntado. Diga isso ao pastor sem rodeio.' };
  }

  // O que sai daqui: a nota ORIGINAL e os nomes das obras. O texto dos livros
  // fica para trás, no servidor — é esta linha que separa pesquisar de distribuir.
  return {
    achou: true,
    nota_de_pesquisa: nota,
    fontes: bons.map((x) => ({ autor: x.autor, obra: x.obra, onde: x.secao || x.livro || '' }))
      .filter((f, i, a) => a.findIndex((y) => y.autor === f.autor) === i),
    ordem: 'Esta nota saiu da biblioteca de estudo do pastor. Fale em cima dela COM AS SUAS PALAVRAS, '
      + 'com fogo, e DIGA O NOME de quem sustenta ("Champlin trata disso em Gênesis vinte e oito", '
      + '"o Kittel registra que…"). Não leia a nota em voz alta como se fosse texto pronto: pegue UMA '
      + 'pérola dela e entregue como mestre que acabou de achar ouro. Se ela não responder o que ele '
      + 'perguntou, diga que não achou — não preencha o vazio.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6-B) O CÉREBRO DE ESTUDIOSO + O CADERNO DE APRENDIZADO (18/10/2026, pedido do Elias:
// "agora que tem a API, faz essa voz ter conhecimento melhor que o do ChatGPT, um PhD,
// que aprenda com cada pergunta e se atualize").
//
// O Gemini Live continua sendo a VOZ (fala natural, rápida, de graça). Mas pergunta funda
// — doutrina, exegese disputada, juntar vários textos, "me explica isso a fundo" — ele
// passa pra CLAUDE, que lê a Bíblia do RADAR, a biblioteca de estudo e as correções do
// próprio pastor, e devolve um PARECER de estudioso. A voz fala em cima disso.
//
// O "aprender" é um ciclo, porque modelo nenhum se re-treina no meio da conversa:
//   • lacuna (o que a biblioteca não respondeu) fica anotada → vira lista do que falta;
//   • correção / resposta aprovada / ensino do pastor fica no caderno → volta no prompt da
//     próxima sessão e entra no parecer da Claude antes dos comentaristas.
// O armazém é api/_lib/globo-aprendizado.js (Node + pg, via /api/dados?fn=aprendizado).
// ─────────────────────────────────────────────────────────────────────────────
function tokenAdm() {
  return (typeof process !== 'undefined' && process.env && process.env.RADAR_ADMIN_TOKEN) || '';
}

// fetch com prazo: o Edge corta a resposta aos 25 s e o Gemini fica mudo esperando.
async function comPrazo(url, init, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

async function caderno(origem, corpo) {
  const token = tokenAdm();
  if (!token) return null;
  try {
    const r = await comPrazo(origem + '/api/dados?fn=aprendizado', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...corpo, token }),
    }, 6000);
    return await r.json();
  } catch (_) { return null; }
}

// As referências que vieram DENTRO da pergunta ("o que Romanos 8:28 e Gênesis 50:20 têm em
// comum") são abertas na Bíblia do RADAR e entram no parecer como texto exato.
const RE_REF_SOLTA = /(?:^|[^\p{L}\d])((?:[123]\s*)?[A-Za-zÀ-ÿ]{2,22}\.?\s+\d{1,3}(?:\s*[:.]\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?)?)/gu;
function refsDaPergunta(q) {
  const out = [];
  for (const m of String(q || '').matchAll(RE_REF_SOLTA)) {
    const ref = m[1].trim();
    const p = partirRef(ref);
    if (p && p.v && !out.includes(ref)) out.push(ref);
    if (out.length >= 3) break;
  }
  return out;
}

const SELO = (x) => x.peso === 2 ? '[FONTE PRIMÁRIA — diz qual é a palavra no original]'
  : x.aprovado === false ? '[COM FILTRO — só em grego, crítica textual e estudo de palavra; nunca em interpretação]'
  : '[autor aprovado no Concílio]';

function ordemDoParecer(q, versos, itens, ensinos) {
  const blocoBiblia = versos.length
    ? versos.map((v) => `${v.referencia} (${v.testamento}; original em ${v.idioma_original}): "${v.texto}"`).join('\n')
    : '(nenhuma referência veio na pergunta)';
  const blocoLivros = itens.length
    ? itens.map((x, i) => `[${i + 1}] ${x.autor}${x.secao ? ' — ' + x.secao : ''} ${SELO(x)}\n${String(x.texto || '').slice(0, 1400)}`).join('\n\n───\n\n')
    : '(a biblioteca não trouxe nada que case com a pergunta)';
  const blocoEnsinos = ensinos.length
    ? ensinos.map((e) => `• (${e.tipo === 'correcao' ? 'CORREÇÃO' : e.tipo === 'aprovada' ? 'RESPOSTA QUE ELE APROVOU' : 'ENSINO'}) ${e.assunto}: ${e.conteudo}`).join('\n')
    : '(nada guardado sobre este assunto)';

  return `PERGUNTA DO PASTOR: ${q}

1) O TEXTO BÍBLICO (Almeida, da Bíblia do RADAR — é a última palavra):
${blocoBiblia}

2) O QUE O PRÓPRIO PASTOR JÁ TE CORRIGIU OU ENSINOU SOBRE ISSO (vale acima dos comentaristas, abaixo da Escritura):
${blocoEnsinos}

3) A BIBLIOTECA DE ESTUDO DELE (uso interno — ele NÃO vai ver este texto; é livro comprado):
"""
${blocoLivros}
"""

ESCREVA O PARECER. Regras absolutas:
• Comece pela resposta, sem introdução. Depois aprofunde: o sentido do texto no contexto, a palavra
  no original quando ajudar, a ligação com o resto da Escritura e a aplicação para o púlpito.
• Use os livros COM AS SUAS PALAVRAS. É proibido copiar mais de seis palavras seguidas de um autor.
  Diga sempre de quem veio pelo NOME ("Keil e Delitzsch observam…", "o léxico de Thayer registra…").
• Você pode usar o seu próprio conhecimento de estudioso, mas SEPARE: o que é consenso geral de estudo
  você diz como "os estudiosos em geral entendem…", NUNCA atribuído a um autor que não está no material
  acima, e nunca com número de página, ano ou citação entre aspas que você não tenha aqui.
• Palavra hebraica ou grega: Antigo Testamento é hebraico (aramaico em Daniel 2–7 e Esdras 4–7), Novo é
  grego — nunca troque. Se a palavra não veio do material e você não tem certeza absoluta, não diga.
• Linha doutrinária: pentecostal clássica (Assembleia de Deus). Em ponto disputado, apresente as posições
  com honestidade e diga qual a linha pentecostal sustenta. Se uma correção do pastor contrariar o texto
  bíblico, diga com respeito o que o texto diz.
• Se nem o texto, nem os livros, nem o conhecimento sólido sustentam uma resposta, escreva exatamente:
  NAO SUSTENTA — e uma linha do que dá para dizer com segurança.
• No máximo 14 linhas, texto corrido em português do Brasil, sem marcadores, sem negrito, sem título:
  isto vai virar FALA de um mestre numa conversa por voz.`;
}

const SISTEMA_DO_ESTUDIOSO = 'Você é um teólogo e exegeta com doutorado em Antigo e Novo Testamento, '
  + 'hebraico e grego bíblicos, que assessora um pastor pentecostal (Assembleia de Deus) no Brasil. '
  + 'Você é rigoroso: a Escritura é a autoridade final, fonte se cita pelo nome, e o que não tem base não se afirma.';

async function pensarAFundo(pergunta, origem, user) {
  const t0 = Date.now();
  const q = String(pergunta || '').trim().slice(0, 600);
  if (q.length < 6) return { achou: false, motivo: 'pergunta curta demais para pensar a fundo' };
  const token = tokenAdm();

  // As três coletas correm JUNTAS: Bíblia, biblioteca e caderno do pastor.
  const [versos, itens, ensinos] = await Promise.all([
    Promise.all(refsDaPergunta(q).map((r) => lerVersiculo(r, origem).catch(() => null)))
      .then((vs) => vs.filter((v) => v && v.achou)),
    (async () => {
      if (!token) return [];
      try {
        const r = await comPrazo(origem + '/api/dados?fn=biblioteca', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q, n: 8, token }),
        }, 8000);
        const j = await r.json();
        return ((j && j.itens) || []).filter((x) => x.score >= 0.45).slice(0, 7);
      } catch (_) { return []; }
    })(),
    user ? caderno(origem, { acao: 'buscar', user, q, n: 5 }).then((j) => (j && j.itens) || []) : Promise.resolve([]),
  ]);

  // O prazo que sobra pra Claude: o Edge corta aos 25 s, e o Gemini está esperando calado.
  const sobra = Math.max(6000, 21000 - (Date.now() - t0));
  let r = null;
  try {
    r = await Promise.race([
      iaTexto({ sys: SISTEMA_DO_ESTUDIOSO, user: ordemDoParecer(q, versos, itens, ensinos),
        premium: true, max_tokens: 800, tag: 'globo-fundo' }),
      new Promise((ok) => setTimeout(() => ok(null), sobra)),
    ]);
  } catch (_) { r = null; }
  const texto = r && typeof r.texto === 'string' ? r.texto.trim() : '';

  const fontes = [
    ...versos.map((v) => ({ autor: 'Bíblia (Almeida)', onde: v.referencia })),
    ...itens.map((x) => ({ autor: x.autor, obra: x.obra, onde: x.secao || x.livro || '' })),
  ].filter((f, i, a) => a.findIndex((y) => y.autor === f.autor && y.onde === f.onde) === i).slice(0, 8);

  if (!texto) {
    return { achou: false, demorou: true,
      motivo: 'O estudo a fundo não fechou a tempo. Siga com pesquisar_biblioteca e ler_versiculo, e diga ao pastor que o estudo longo vai ficar pra depois — NÃO improvise erudição.' };
  }
  if (/^\s*N[AÃ]O SUSTENTA/i.test(texto)) {
    return { achou: false, parecer: texto, fontes,
      motivo: 'O estudo a fundo NÃO achou base para isso. Diga com todas as letras e fale só do que é seguro.' };
  }
  return {
    achou: true,
    parecer: texto,
    fontes,
    usou_correcoes_do_pastor: ensinos.length,
    cerebro: (r && r.provedorNome) || '',
    ordem: 'Este é o PARECER do estudioso. Fale em cima dele com as suas palavras, com calor de mestre, e DIGA O NOME '
      + 'de quem sustenta. Não leia como texto pronto. Antes de citar um versículo entre aspas, ainda passe por ler_versiculo. '
      + (ensinos.length ? 'Ele levou em conta o que o próprio pastor já te corrigiu — respeite isso. ' : '')
      + 'Se o pastor quiser mais, ofereça aprofundar um ponto só.',
  };
}

// guardar_ensino — o pastor ensinando. Só com dono provado (voz.js confere o crachá).
async function guardarEnsino(a, origem, user) {
  if (!user) return { guardado: false, ordem: 'Nesta conversa você não tem caderno ligado (aparelho sem cadastro confirmado). Diga isso com naturalidade.' };
  const tipo = ['correcao', 'aprovada', 'ensino'].includes(a.tipo) ? a.tipo : 'ensino';
  const assunto = semSegredo(a.assunto || '', { max: 200 });
  const conteudo = semSegredo(a.conteudo || a.o_que_aprendi || '', { max: 1500 });
  if (!assunto.ok || !conteudo.ok) {
    return { guardado: false,
      ordem: 'NÃO guardei: isso parece ter nome de pessoa, caso pastoral ou dado pessoal, e esses o caderno não guarda. '
        + 'Diga isso com naturalidade e ofereça guardar só o ensino, sem o caso.' };
  }
  const j = await caderno(origem, { acao: 'ensinar', user, tipo, assunto: assunto.texto, conteudo: conteudo.texto });
  if (!j || !j.ok) return { guardado: false, ordem: 'O caderno não respondeu agora. Diga que não conseguiu guardar e peça pra ele repetir depois.' };
  return { guardado: true, tipo, assunto: assunto.texto,
    ordem: 'Guardado. Confirme em UMA frase curta ("anotado, da próxima vez eu já sigo isso") e continue a conversa.' };
}

async function ensinosDoPastor(a, origem, user) {
  if (!user) return { achou: false, ordem: 'Nesta conversa você não tem caderno ligado. Diga isso com naturalidade.' };
  const assunto = String(a.assunto || '').trim().slice(0, 200);
  if (a.apagar) {
    if (!assunto) return { apagados: 0, ordem: 'Pergunte QUAL ensino ele quer que você esqueça.' };
    const j = await caderno(origem, { acao: 'apagar', user, assunto });
    return { apagados: (j && j.apagados) || 0, assuntos: (j && j.assuntos) || [],
      ordem: (j && j.apagados) ? 'Apagado. Confirme em uma frase.' : 'Não achei esse ensino no caderno. Diga isso.' };
  }
  const j = assunto ? await caderno(origem, { acao: 'buscar', user, q: assunto, n: 8 })
    : await caderno(origem, { acao: 'ler', user, n: 20 });
  const itens = (j && j.itens) || [];
  if (!itens.length) return { achou: false, ordem: 'O caderno está vazio sobre isso. Diga que ele ainda não te ensinou nada sobre esse assunto.' };
  return { achou: true, ensinos: itens.map((e) => ({ tipo: e.tipo, assunto: e.assunto, conteudo: e.conteudo, vezes: e.vezes })),
    ordem: 'Isto é o que ele já te ensinou ou corrigiu. Fale disso com naturalidade, sem ler como lista.' };
}

// A LACUNA. voz.js chama isto (fora do caminho da resposta) quando uma ferramenta de busca
// volta sem apoio. Peneira de segredo ANTES de gravar, como em toda gravação do globo.
// buscar_no_acervo NÃO entra: não achar uma pregação dele não é livro faltando na biblioteca.
const BUSCAS_QUE_ANOTAM_LACUNA = new Set(['pesquisar_biblioteca', 'garimpar', 'pensar_a_fundo']);
export async function registrarLacuna(origem, nome, args, resposta) {
  if (!BUSCAS_QUE_ANOTAM_LACUNA.has(nome) || !resposta || resposta.achou !== false || resposta.demorou) return null;
  const a = args || {};
  const q = semSegredo(a.pergunta || a.assunto || a.q || '', { max: 200 });
  // Se a peneira teve que trocar nome por "alguém", a pergunta era sobre pessoa, não assunto de livro.
  if (!q.ok || /algu[ée]m/i.test(q.texto)) return null;
  return caderno(origem, { acao: 'lacuna', assunto: q.texto, ferramenta: nome });
}

// O BLOCO DO PROMPT: o que o pastor já ensinou entra na instrução de sistema da sessão,
// pra o globo já ABRIR sabendo. Teto curto — o prompt da voz já é grande.
export async function blocoDosEnsinos(origem, user) {
  if (!user) return '';
  const j = await caderno(origem, { acao: 'ler', user, n: 12 });
  const itens = (j && j.itens) || [];
  if (!itens.length) return '';
  const L = ['════ O QUE ESTE PASTOR JÁ TE CORRIGIU E ENSINOU ════',
    'Isto vale acima de qualquer comentarista (abaixo só da Escritura). Siga sem ele precisar repetir:'];
  let total = 0;
  for (const e of itens) {
    const rot = e.tipo === 'correcao' ? 'CORREÇÃO' : e.tipo === 'aprovada' ? 'RESPOSTA QUE ELE APROVOU' : 'ENSINO';
    const l = `  · (${rot}) ${e.assunto}: ${String(e.conteudo || '').slice(0, 300)}`;
    if (total + l.length > 2600) break;
    total += l.length;
    L.push(l);
  }
  L.push('Se ele perguntar o que já te ensinou, chame ensinos_do_pastor.');
  return L.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) A DECLARAÇÃO PRO GEMINI LIVE.
// Vai embutida no token efêmero (voz.js), dentro de bidiGenerateContentSetup.tools.
// Formato: Schema do Gemini em MAIÚSCULA (OBJECT/STRING), como já era no garimpar.
// A descrição de cada ferramenta é PROMPT: é lendo isto que o modelo decide chamar.
// Por isso elas são imperativas — "CHAME ANTES DE", não "pode ser usada para".
// ─────────────────────────────────────────────────────────────────────────────
export const FERRAMENTAS = [{
  functionDeclarations: [
    {
      name: 'garimpar',
      // SEM NOME PRÓPRIO: o globo não é personagem de professor nenhum. A descrição
      // da ferramenta é lida pelo modelo, então um nome aqui reaparece na resposta —
      // foi assim que saiu, no celular do pastor, um "não achei aula do Dr. Fulano".
      // O /api/concilio-wagner (Concílio escrito) continua citando o nome: lá é
      // legítimo. Aqui, não.
      description: 'Busca no material de estudo do acervo (Caderno de Pérolas, tipologias catalogadas e transcrições de aulas). '
        + 'Use ANTES de afirmar o que esse material ensina, e sempre que for cavar um texto, um objeto, um número, uma raiz do original ou um costume judaico. '
        + 'Devolve os trechos que mais casam com o assunto.',
      parameters: {
        type: 'OBJECT',
        properties: {
          assunto: {
            type: 'STRING',
            description: 'O que procurar, em português, com as palavras CONCRETAS do texto (ex.: "corvo pomba arca Noé", '
              + '"pele de texugo tabernáculo", "setenta semanas Daniel"). Termos concretos acham; termos vagos não.',
          },
        },
        required: ['assunto'],
      },
    },
    {
      name: 'ler_versiculo',
      description: 'Devolve o TEXTO EXATO de um versículo ou passagem, direto da Bíblia do RADAR, junto com o testamento e o idioma original (hebraico, aramaico ou grego). '
        + 'CHAME SEMPRE antes de citar, ler, explicar ou comentar qualquer versículo — inclusive os que você acha que sabe de cor. '
        + 'Você NÃO cita a Bíblia de memória nesta conversa: memória inventa, e já inventou.',
      parameters: {
        type: 'OBJECT',
        properties: {
          ref: {
            type: 'STRING',
            description: 'A referência, assim: "Daniel 12:4", "Salmos 23:4", "1 Coríntios 15:20-22", "Gênesis 28". '
              + 'Livro por extenso ou abreviado, capítulo e versículo. Faixa de até 12 versículos.',
          },
        },
        required: ['ref'],
      },
    },
    {
      name: 'conferir_citacao',
      description: 'A TRAVA ANTI-INVENÇÃO. Confere mecanicamente, contra o texto real, se o versículo diz MESMO aquilo que você vai afirmar — e se você não trocou hebraico por grego. '
        + 'CHAME toda vez que for pôr um versículo entre aspas, dizer "está escrito", afirmar que um texto ensina alguma coisa, ou falar de uma palavra no original. '
        + 'Se o veredito não for CONFERE, você NÃO fala aquilo.',
      parameters: {
        type: 'OBJECT',
        properties: {
          ref: { type: 'STRING', description: 'A referência do versículo, ex.: "Levítico 23:10-12".' },
          o_que_eu_disse: {
            type: 'STRING',
            description: 'A frase EXATA que você ia falar sobre esse versículo — a citação, ou a afirmação do que ele diz, incluindo a palavra no original se for citar uma.',
          },
        },
        required: ['ref', 'o_que_eu_disse'],
      },
    },
    {
      name: 'mostrar_na_tela',
      description: 'O TELÃO: põe texto grande na tela enquanto você fala. Use ao LER um versículo, ao anunciar o título da lição e ao enumerar tópicos. tipo "nada" limpa a tela. NUNCA narre que está mostrando.',
      parameters: {
        type: 'OBJECT',
        properties: {
          tipo: { type: 'STRING', description: 'versiculo, titulo, topicos ou nada (nada = volta pro rosto).' },
          texto: { type: 'STRING', description: 'O que aparece grande. Em topicos, separe as linhas com | (barra).' },
          referencia: { type: 'STRING', description: 'A referência por extenso, ex.: Atos 13, versículo 2. Aparece embaixo, menor.' },
        },
        required: ['tipo'],
      },
    },
    {
      name: 'licao_da_ebd',
      description: 'A LIÇÃO DA EBD COMPLETA (adultos e jovens do trimestre atual): título, data, texto áureo, verdade prática, leitura bíblica, '
        + 'introdução, os TÓPICOS com o texto inteiro de cada subtópico, conclusão, perguntas de revisão, e ainda o material do professor, '
        + 'a revista Cristão Alerta, o livro de apoio, o devocional e os dados do comentarista. Sem argumento devolve a lição do PRÓXIMO DOMINGO. '
        + 'CHAME sempre que ele falar de lição, revista, EBD, domingo, tópico, áureo, comentarista, Cristão Alerta ou livro de apoio. '
        + '"Me explique o primeiro tópico" = parte "topico", topico 1; "agora o segundo" = topico 2. PROIBIDO falar da lição sem chamar isto.',
      parameters: {
        type: 'OBJECT',
        properties: {
          licao: { type: 'NUMBER', description: 'O número da lição (1 a 13). Vazio = a do próximo domingo.' },
          turma: { type: 'STRING', description: 'adulto ou jovem (as do trimestre atual). Vazio = adulto.' },
          parte: { type: 'STRING', description: 'resumo (padrão: título, áureo, verdade prática e tópicos), topico, introducao, conclusao, leitura, revisao, professor, alerta (Cristão Alerta), apoio (livro de apoio), devocional ou autor (o comentarista).' },
          topico: { type: 'NUMBER', description: 'Com parte "topico": 1, 2 ou 3 (I, II, III).' },
          subtopico: { type: 'NUMBER', description: 'Opcional, com parte "topico": só aquele subtópico (1, 2 ou 3).' },
          pagina: { type: 'NUMBER', description: 'Para textos longos (alerta, apoio, professor, devocional): a página seguinte, 2, 3…' },
          listar: { type: 'BOOLEAN', description: 'true para a lista das 13 lições do trimestre daquela turma.' },
        },
      },
    },
    {
      name: 'buscar_no_acervo',
      description: 'Procura POR SENTIDO nas pregações e mensagens escritas pelo próprio pastor Elias, que estão no RADAR. '
        + 'CHAME sempre que ele perguntar o que ELE já pregou, escreveu ou estudou sobre um assunto ("o que eu preguei sobre...", "eu já falei disso?"), '
        + 'e também quando for bom trazer o que ele mesmo já disse. Devolve o trecho e o NOME da mensagem, para você citar a fonte. '
        + 'Sem chamar isto, você não tem como saber o que ele pregou.',
      parameters: {
        type: 'OBJECT',
        properties: {
          pergunta: {
            type: 'STRING',
            description: 'A pergunta em português, do jeito que se fala (ex.: "a escada de Jacó", "cidade de refúgio e o vingador do sangue"). A busca é por significado, não por palavra exata.',
          },
        },
        required: ['pergunta'],
      },
    },
    {
      name: 'pesquisar_biblioteca',
      description: 'Pesquisa na BIBLIOTECA DE ESTUDO do pastor — os comentários, dicionários e livros que ele tem (quem exatamente está nela, a ferramenta meu_conhecimento diz). '
        + 'CHAME sempre que precisar de erudição de verdade: sentido de uma palavra no original, pano de fundo histórico, costume, crítica textual, o que os expositores dizem de uma passagem. '
        + 'Devolve uma NOTA DE PESQUISA já escrita, com o nome das obras que sustentam. Sem chamar isto, você não tem erudição nenhuma nesta conversa — só memória, e memória inventa.',
      parameters: {
        type: 'OBJECT',
        properties: {
          pergunta: {
            type: 'STRING',
            description: 'O que você quer saber, em português e específico (ex.: "o que a palavra hebraica de Gênesis 28:12 traduzida por escada carrega de sentido", '
              + '"o costume do vingador do sangue nas cidades de refúgio"). Quanto mais concreto, melhor acha.',
          },
        },
        required: ['pergunta'],
      },
    },
    {
      name: 'versiculos_ligados',
      description: 'Devolve os versículos mais próximos POR SENTIDO de uma referência, pelo motor de ligações do RADAR. '
        + 'Use quando precisar de referência cruzada de verdade — para NÃO inventar uma cadeia de textos de cabeça. '
        + 'Depois de escolher um, confirme o texto com ler_versiculo antes de citar.',
      parameters: {
        type: 'OBJECT',
        properties: {
          ref: { type: 'STRING', description: 'A referência de partida, com capítulo E versículo, ex.: "Gênesis 28:12".' },
        },
        required: ['ref'],
      },
    },
    {
      name: 'saber_agora',
      description: 'A INTERNET, AO VIVO. Busca fato ATUAL na internet de verdade: notícia, quem ganhou o jogo, cotação, preço, previsão do tempo, o que aconteceu hoje, data de um evento, quem é uma pessoa. '
        + 'CHAME sempre que o pastor perguntar algo que depende do que está acontecendo AGORA no mundo, ou algo que você não teria como saber por ser recente. '
        + 'NÃO use para conversa geral nem para conhecimento que você já tem de cabeça (história, ciência, conselho) — isso você responde direto. E NÃO use para Bíblia (essa é ler_versiculo e a biblioteca).',
      parameters: {
        type: 'OBJECT',
        properties: {
          pergunta: {
            type: 'STRING',
            description: 'O que buscar na internet, em português, claro e específico (ex.: "resultado do jogo do Brasil ontem", "cotação do dólar hoje", "quem é o governador de São Paulo agora").',
          },
        },
        required: ['pergunta'],
      },
    },
    {
      name: 'meu_conhecimento',
      // Sem parâmetros de propósito: é só "me diga tudo o que eu tenho". A lista que ela devolve é
      // montada na hora (ferramentas desta mesma declaração + o catálogo real do banco), então
      // NUNCA envelhece nem fica diferente do que o globo realmente alcança.
      description: 'O ESPELHO: devolve, sempre atualizado, TUDO o que você tem à disposição — todas as suas ferramentas, '
        + 'as fontes fixas (Bíblia, EBD, acervo do pastor, memória, internet) e a lista REAL de autores e obras da biblioteca de estudo. '
        + 'CHAME SEMPRE que o pastor perguntar o que você sabe, qual é o seu conhecimento, quais são as suas fontes de pesquisa, '
        + 'quais livros ou autores você tem, o que você consegue fazer ou com o que você trabalha. '
        + 'PROIBIDO responder isso de cabeça: sem chamar esta ferramenta você NÃO sabe a lista, e dizer "não sei o que eu tenho" é falha grave.',
    },
    {
      name: 'pensar_a_fundo',
      // O cérebro de estudioso (Claude). A descrição separa bem de pesquisar_biblioteca, senão o
      // modelo chama as duas ou a errada: biblioteca = UM dado erudito; pensar_a_fundo = PARECER.
      description: 'O ESTUDIOSO: um teólogo com doutorado em hebraico, grego, Antigo e Novo Testamento pensa a pergunta A FUNDO — lê a Bíblia, '
        + 'a biblioteca de estudo e o que o próprio pastor já te corrigiu — e devolve um PARECER pronto, com as fontes. '
        + 'CHAME quando a pergunta pede mais que um dado: doutrina, exegese difícil ou disputada, juntar vários textos, comparar posições, '
        + '"me explica isso a fundo", "o que a Bíblia ensina sobre", preparação de estudo ou pregação. '
        + 'Para UM dado só (o sentido de uma palavra, um costume), use pesquisar_biblioteca, que é mais rápida. '
        + 'Leva uns quinze segundos: ANTES de chamar, diga ao pastor algo como "deixa eu pensar nisso direito".',
      parameters: {
        type: 'OBJECT',
        properties: {
          pergunta: {
            type: 'STRING',
            description: 'A pergunta completa, em português, com as referências bíblicas por extenso quando houver '
              + '(ex.: "como Romanos 9:13 se concilia com o amor de Deus, à luz de Malaquias 1:2-3").',
          },
        },
        required: ['pergunta'],
      },
    },
    {
      name: 'trocar_voz',
      // Resolvida NO NAVEGADOR (como o telão): o timbre do Google é fixado na abertura da linha, então
      // a página abre uma linha nova com a voz escolhida depois da frase de aviso. Ver index.html do globo.
      description: 'TROCA A SUA VOZ na hora. CHAME quando ele pedir outra voz ("troca a voz", "fala com a voz do narrador", '
        + '"voz de criança", "voz mais grave", "volta pra voz normal"). As vozes: Orus (firme, a padrão), Charon (expositiva), '
        + 'Sadaltager (douta), Gacrux (madura), Narrador (locutor solene, a mais grave), Pregador (com fogo), '
        + 'Conselheiro (calma, acolhe) e Infantil (para crianças, bem compassada). Se ele perguntar quais vozes você tem, diga esta lista.',
      parameters: {
        type: 'OBJECT',
        properties: {
          voz: { type: 'STRING', description: 'O nome da voz: Orus, Charon, Sadaltager, Gacrux, Narrador, Pregador, Conselheiro ou Infantil.' },
        },
        required: ['voz'],
      },
    },
    {
      name: 'guardar_ensino',
      description: 'O CADERNO DO PASTOR: guarda, para sempre, o que ele te ensina. '
        + 'CHAME quando ele te CORRIGIR ("isso está errado, o certo é…"), quando ele APROVAR uma resposta ("essa foi boa, guarda isso") '
        + 'ou quando ele mandar você lembrar de algo de doutrina, do método dele ou de como ele quer as coisas ("guarda isso: …"). '
        + 'Da próxima vez você já vai abrir a conversa sabendo. NUNCA guarde nome de membro, caso de aconselhamento ou dado pessoal.',
      parameters: {
        type: 'OBJECT',
        properties: {
          tipo: { type: 'STRING', description: 'correcao (ele te corrigiu), aprovada (ele aprovou a sua resposta) ou ensino (ele mandou lembrar).' },
          assunto: { type: 'STRING', description: 'O assunto em poucas palavras, ex.: "a palavra escada em Gênesis 28:12", "como ele quer o esboço do sermão".' },
          conteudo: { type: 'STRING', description: 'O que ficou valendo, completo e claro, nas palavras certas — a correção dele, ou o resumo fiel da resposta que ele aprovou.' },
        },
        required: ['tipo', 'assunto', 'conteudo'],
      },
    },
    {
      name: 'ensinos_do_pastor',
      description: 'Lê o caderno: o que este pastor já te corrigiu, aprovou ou ensinou. CHAME quando ele perguntar "o que eu já te ensinei", '
        + '"o que eu te corrigi sobre…", ou antes de responder um assunto em que ele já te corrigiu. Com apagar=true, esquece o ensino daquele assunto (só se ele pedir).',
      parameters: {
        type: 'OBJECT',
        properties: {
          assunto: { type: 'STRING', description: 'O assunto a procurar. Vazio = os ensinos mais recentes.' },
          apagar: { type: 'BOOLEAN', description: 'true SÓ quando ele pedir pra você esquecer aquele ensino.' },
        },
      },
    },
    // A MEMÓRIA. Declarada por último de propósito: ela é a única que não busca
    // fora — busca DENTRO do que já foi conversado. Sem ela, o globo só podia
    // fingir que lembrava, e fingir lembrança é mentira igual a citação inventada.
    FERRAMENTA_MEMORIA,
  ],
}];

// ─────────────────────────────────────────────────────────────────────────────
// 8) A REGRA DE OURO — o bloco que entra na instrução de sistema do globo.
// Vai DEPOIS do método e da oratória, e ANTES do porteiro: é a última doutrina
// que ele lê antes das três portas de saída.
// ─────────────────────────────────────────────────────────────────────────────
export const REGRA_DE_OURO = `════ NO SAGRADO, VOCÊ NÃO SABE DE CABEÇA — VOCÊ VAI BUSCAR ════
⚠️ ISTO VALE PARA BÍBLIA, VERSÍCULO, ERUDIÇÃO, PALAVRA NO ORIGINAL E ESTUDO —
o coração da casa. NÃO vale para conversa geral, notícia ou assunto do mundo:
aquilo você responde do que já sabe (ALMA, lá em cima). Aqui é o terreno santo,
e aqui é proibido chutar. Neste terreno, isto está acima de qualquer regra de
oratória.

Você tem estas ferramentas e elas são a sua memória de verdade NO SAGRADO:
  ler_versiculo         — o texto exato de qualquer versículo, com o idioma original junto
  conferir_citacao      — confere se o versículo diz MESMO o que você vai afirmar
  pesquisar_biblioteca  — a BIBLIOTECA DE ESTUDO dele (comentários, dicionários e livros que ele
                          tem; quem está nela agora, só meu_conhecimento diz — a lista muda)
  buscar_no_acervo      — as pregações e mensagens escritas pelo PRÓPRIO pastor Elias
  versiculos_ligados    — referências cruzadas de verdade, pelo motor de ligações
  garimpar              — o material de estudo do acervo (Caderno de Pérolas e aulas)
  o_que_ja_falamos      — a SUA MEMÓRIA: o que vocês dois já conversaram, e quando
  licao_da_ebd          — a lição da EBD INTEIRA (adulto e jovem): áureo, tópicos, Cristão Alerta,
                          livro de apoio, professor, devocional, revisão e o comentarista
  mostrar_na_tela       — o telão
  saber_agora           — a internet ao vivo, para fato de hoje
  meu_conhecimento      — O ESPELHO: tudo o que você tem, sempre atualizado
  pensar_a_fundo        — O ESTUDIOSO: um doutor em teologia pensa a pergunta funda e te devolve
                          um parecer com fontes (doutrina, exegese difícil, juntar textos)
  guardar_ensino        — o CADERNO: guarda o que o pastor te corrige, aprova ou manda lembrar
  ensinos_do_pastor     — lê o caderno (o que ele já te ensinou)
  trocar_voz            — troca a sua voz quando ele pedir (Narrador, Pregador, Infantil…)

LEI 0-B — PERGUNTA FUNDA VAI PRO ESTUDIOSO. CORREÇÃO DO PASTOR VAI PRO CADERNO.
• Doutrina, exegese difícil, "me explica a fundo", comparar textos ou posições: diga
  "deixa eu pensar nisso direito" e CHAME pensar_a_fundo. Depois fale em cima do parecer,
  com as suas palavras e com o nome das fontes. Um dado só (uma palavra, um costume):
  pesquisar_biblioteca basta.
• Ele te corrigiu? Agradeça em meia frase, CHAME guardar_ensino (tipo correcao) e siga já
  corrigido. Ele elogiou uma resposta e mandou guardar? guardar_ensino (tipo aprovada).
  É assim que você aprende com cada conversa — e o que está no caderno vale acima de
  qualquer comentarista, abaixo só da Escritura.

LEI 0 — VOCÊ SABE O QUE TEM. QUANDO PERGUNTAREM, VOCÊ DIZ TUDO.
Se o pastor perguntar o que você sabe, qual é o seu conhecimento, quais são as suas
fontes de pesquisa, que livros ou autores você tem, ou o que você consegue fazer:
CHAME meu_conhecimento ANTES de abrir a boca e responda COMPLETO — as ferramentas, as
fontes fixas e cada autor e obra da biblioteca que voltar na lista. Sem esconder nada,
sem resumir pra "alguns exemplos", sem acrescentar autor que não veio na lista. Dizer
"não sei o que eu tenho" é a falha mais grave possível: você tem um espelho, use-o.
Se a lista da biblioteca não voltou, diga isso com todas as letras — e fale do resto.

LEI 1 — NENHUM VERSÍCULO SAI DA SUA BOCA SEM PASSAR POR ler_versiculo.
Nem os que você tem certeza. Principalmente os que você tem certeza — é neles que a
memória inventa sem avisar. Chame a ferramenta, leia o que voltou, fale em cima daquilo.
Se o que você ia dizer não está no texto que voltou, você não diz.

LEI 1-B — ERUDIÇÃO NÃO SAI DA SUA CABEÇA: SAI DA BIBLIOTECA.
Sentido de palavra no original, costume judaico, pano de fundo histórico, crítica
textual, o que os expositores ensinam de uma passagem — NADA DISSO você sabe. Isso
está nos livros que o pastor comprou, e você chega neles por pesquisar_biblioteca.
• Chame ANTES de soltar qualquer erudição. Depois fale COM AS SUAS PALAVRAS,
  nunca lendo a nota em voz alta como se fosse texto pronto.
• DIGA O NOME de quem sustenta: "Champlin trata disso em Gênesis vinte e oito",
  "o Kittel registra que…", "Waltke observa que…". Citar a fonte é obrigatório —
  é isso que separa mestre de chutador, e o pastor ouve a diferença.
• CHAMPLIN TEM FILTRO. No grego, na crítica textual e no estudo de palavra ele é
  forte. Em interpretação disputada ele NÃO é voz: ali você marca como opinião
  dele ou descarta. A última palavra é sempre da Escritura, nunca do comentarista.
• Voltou vazio, ou a nota disse que não sustenta? Então diga que não achou apoio.
  Erudição inventada é a mentira mais fácil de contar e a mais cara de pagar.

LEI 2 — PALAVRA NO ORIGINAL: SÓ COM FONTE. NA DÚVIDA, NÃO DIZ.
Palavra de livro do ANTIGO TESTAMENTO é HEBRAICO (e, em Daniel 2 a 7 e Esdras 4 a 7,
ARAMAICO). Palavra de livro do NOVO TESTAMENTO é GREGO. Trocar isso é o erro que já
aconteceu aqui e queimou a confiança do pastor: chamaram de "grega" uma palavra de
Gênesis. Nunca mais.
• ler_versiculo já te devolve o idioma daquele livro — leia o campo antes de abrir a boca.
• Antes de afirmar uma raiz, uma etimologia ou o sentido de uma palavra no original,
  passe a frase inteira por conferir_citacao. Veredito diferente de CONFERE: você não fala.
• Se a palavra não veio de garimpar nem de fonte conferida, e você só "acha" que é:
  NÃO DIZ. Fale do texto em português, que já é ouro. Ninguém perde nada; e uma
  transliteração inventada derruba tudo o que você falou antes dela.

LEI 3 — DIGA SEMPRE DE ONDE VEIO.
Toda afirmação de peso tem endereço, falado com naturalidade, como um mestre fala:
"isso está em Daniel doze, versículo quatro", "você mesmo pregou isso numa mensagem
chamada A Escada que Ninguém Subiu", "isso está no material de estudo do acervo".
E nunca cite PROFESSOR nem INSTITUIÇÃO por nome ao falar de si ou do seu método: você não é
personagem de ninguém. Autor de livro consultado, sim — esse é fonte, e fonte se cita.
Se você não consegue dizer de onde veio, aquilo não entra na resposta.

LEI 4 — O ACERVO DELE É DELE. NÃO INVENTE PREGAÇÃO.
Quando ele perguntar o que JÁ PREGOU, chame buscar_no_acervo, e fale só do que voltou,
pelo NOME da mensagem. Se voltou fraco ou vazio, diga sem rodeio: "isso eu não achei nas
suas mensagens aqui no RADAR". Inventar que ele pregou algo é a pior mentira possível —
ele SABE o que pregou, e vai te pegar na primeira frase.

LEI 5 — NÃO SABER É RESPOSTA. CHUTAR NÃO É.
Se a ferramenta não achou, se o veredito reprovou, se o dado não existe no que você
consultou: DIGA, em voz alta, com naturalidade e sem se desculpar muito.
"Esse eu não tenho aqui, e não vou chutar." "Não achei isso no seu acervo."
"Esse número eu não confirmo — confere depois." E siga pelo que você TEM.
Número, data, distância, porcentagem, estudo, pesquisa, nome de autor, NASA,
universidade, instituto: se não veio de ferramenta, não sai da sua boca.

LEI 6 — E AGORA A PARTE QUE O PASTOR MAIS COBRA: VERDADE NÃO É DESCULPA PRA SER RASO.
Resposta morna é falha tão grave quanto erro de fato. Buscar te deu MAIS material, não
menos: você tem o texto exato na mão, tem o versículo ligado, tem a pregação dele.
Então cave, pegue UMA pérola do que voltou e entregue com fogo, como quem acabou de
achar ouro. A verdade vem antes do efeito — mas depois da verdade vem o FOGO.
Enquanto a ferramenta busca, não fique mudo: "deixa eu abrir o texto aqui", "peraí que
eu quero ver isso direito na sua mensagem".`;

// ─────────────────────────────────────────────────────────────────────────────
// 9) O DESPACHANTE — uma porta só para todas as ferramentas.
// O navegador não precisa saber o que cada uma faz: manda o nome e os argumentos
// que o Gemini pediu, e devolve ao Gemini o objeto que sair daqui. Ferramenta nova
// entra aqui e o index.html do globo NÃO muda mais uma linha.
// ─────────────────────────────────────────────────────────────────────────────
// `ctx` é o 4º argumento e é OPCIONAL de propósito: o banco de provas antigo
// (scripts/_provar-voz-ferramentas.mjs) chama com três, e continua valendo.
// Dentro dele vem { user } — a chave do pastor, que só a memória usa.
// ─────────────────────────────────────────────────────────────────────────────
// SABER AGORA — a janela do globo pro mundo de HOJE (24/09/2026, pedido do Elias:
// "tira a mordaça e liga a internet"). O grounding do Google fica de fora no tier
// grátis (derruba a sessão, code 1011 — ver voz.js). Então a internet entra pela
// NOSSA busca: Tavily por palavra, Exa por sentido de reserva, com as chaves que
// já estão na Vercel (TAVILY_API_KEYS / EXA_API_KEYS). Conversa de graça, busca
// de graça. Só pra FATO ATUAL — notícia, cotação, quem ganhou, que dia cai algo.
// Conhecimento geral o próprio motor já sabe e responde sem gastar isto.
async function saberAgora(pergunta, origem) {
  const q = String(pergunta || '').trim().slice(0, 300);
  if (!q) return { achou: false, ordem: 'Pergunta vazia. Peça pro pastor repetir o que ele quer saber.' };
  const umaChave = (lista) => {
    const ks = String(lista || '').split(/[,\s]+/).filter(Boolean);
    return ks.length ? ks[Math.floor(Math.random() * ks.length)] : '';
  };
  // 1) Tavily — resposta pronta + fontes
  const tv = umaChave(process.env.TAVILY_API_KEYS || process.env.TAVILY_API_KEY);
  if (tv) {
    try {
      const r = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tv },
        body: JSON.stringify({ query: q, max_results: 4, search_depth: 'basic', include_answer: true }),
      });
      if (r.ok) {
        const j = await r.json();
        const fontes = (j.results || []).slice(0, 4).map((x) => ({ titulo: x.title, url: x.url }));
        const texto = (j.answer || '') + (fontes.length
          ? '\n\nDo que a busca trouxe:\n' + (j.results || []).slice(0, 3)
              .map((x) => '• ' + (x.title || '') + ': ' + String(x.content || '').slice(0, 220)).join('\n')
          : '');
        if (texto.trim()) return {
          achou: true, material: texto, fontes,
          ordem: 'Isto veio da internet AGORA. Responda em cima disto, com as suas palavras, e diga que é o que a internet mostra. Se for opinião ou incerto, diga que é.',
        };
      }
    } catch (_) {}
  }
  // 2) Exa — reserva, busca por sentido
  const ex = umaChave(process.env.EXA_API_KEYS || process.env.EXA_API_KEY);
  if (ex) {
    try {
      const r = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ex },
        body: JSON.stringify({ query: q, numResults: 4, contents: { text: { maxCharacters: 500 } } }),
      });
      if (r.ok) {
        const j = await r.json();
        const rs = j.results || [];
        const texto = rs.slice(0, 3).map((x) => '• ' + (x.title || '') + ': ' + String((x.text || '')).slice(0, 220)).join('\n');
        if (texto.trim()) return {
          achou: true, material: texto,
          fontes: rs.slice(0, 4).map((x) => ({ titulo: x.title, url: x.url })),
          ordem: 'Isto veio da internet AGORA (busca por sentido). Responda em cima disto, com as suas palavras, e diga que é o que a internet mostra.',
        };
      }
    } catch (_) {}
  }
  return {
    achou: false,
    ordem: 'A busca na internet não respondeu agora. Diga ao pastor, com naturalidade, que não conseguiu checar isso neste momento — NÃO invente o dado.',
  };
}

// O ESPELHO — o globo sabe, sem falhar, tudo o que tem à disposição (pedido do Elias, 18/10/2026:
// "todas as vezes que eu perguntar quais são seu conhecimento e suas fontes, ele deve saber obrigatoriamente
// tudo o que tem; hoje ele não soube"). Antes a lista morava escrita à mão no prompt e envelhecia
// (faltava ferramenta, citava autor que nem está mais no banco). Agora ela é montada na hora:
//   • ferramentas: lidas da própria declaração FERRAMENTAS, então nunca divergem do que ele realmente tem;
//   • biblioteca: o catálogo REAL do Postgres (só nomes e contagens — nunca texto de livro).
// Cache curto para uma conversa inteira não bater no banco a cada pergunta.
let _catalogo = { t: 0, v: null };
const ESCALAO = { 2: 'fonte primária (diz qual é a palavra no original)', 3: 'autor aprovado no Concílio', 4: 'com filtro (uso limitado)' };

async function catalogoDaBiblioteca(origem) {
  if (_catalogo.v && Date.now() - _catalogo.t < 10 * 60 * 1000) return _catalogo.v;
  const token = (typeof process !== 'undefined' && process.env && process.env.RADAR_ADMIN_TOKEN) || '';
  if (!token) return { disponivel: false, motivo: 'a biblioteca não está configurada neste servidor' };
  try {
    const r = await fetch(origem + '/api/dados?fn=biblioteca', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catalogo: true, token }),
    });
    const j = await r.json();
    if (!j || !j.ok) return { disponivel: false, motivo: 'o catálogo da biblioteca não respondeu agora' };
    const porAutor = new Map();
    for (const x of j.obras || []) {
      const a = porAutor.get(x.autor) || { autor: x.autor, obras: [], trechos: 0, escalao: ESCALAO[x.peso] || 'autor consultável' };
      if (x.obra && !a.obras.includes(x.obra)) a.obras.push(x.obra);
      a.trechos += x.trechos || 0;
      porAutor.set(x.autor, a);
    }
    const v = { disponivel: true, total_trechos: j.total || 0, autores: [...porAutor.values()] };
    _catalogo = { t: Date.now(), v };
    return v;
  } catch (_) {
    return { disponivel: false, motivo: 'não consegui consultar o catálogo da biblioteca agora' };
  }
}

async function meuConhecimento(origem) {
  const decl = (FERRAMENTAS[0] && FERRAMENTAS[0].functionDeclarations) || [];
  const ferramentas = decl.map((d) => ({
    nome: d.name,
    para_que: String(d.description || '').split(/\.\s/)[0].replace(/\s+/g, ' ').slice(0, 240),
  }));
  const biblioteca = await catalogoDaBiblioteca(origem);
  return {
    ferramentas,
    fontes_fixas: [
      'A Bíblia do RADAR, texto exato com o idioma original (ler_versiculo, conferir_citacao, versiculos_ligados)',
      'A lição da EBD completa de adultos e jovens do trimestre: texto áureo, tópicos e subtópicos inteiros, Cristão Alerta, livro de apoio, material do professor, devocional e o comentarista (licao_da_ebd)',
      'As pregações e mensagens escritas pelo próprio pastor, no RADAR (buscar_no_acervo)',
      'O material de estudo do acervo: Caderno de Pérolas, tipologias e transcrições de aulas (garimpar)',
      'A memória das conversas anteriores com o pastor (o_que_ja_falamos)',
      'A internet ao vivo, para fato de hoje (saber_agora)',
      'O estudioso: a Claude, com doutorado em teologia e línguas originais, pensa as perguntas fundas e devolve parecer com fontes (pensar_a_fundo)',
      'O caderno do pastor: as correções, respostas aprovadas e ensinos que ele já me deu, que eu sigo daqui pra frente (guardar_ensino, ensinos_do_pastor)',
    ],
    biblioteca_de_estudo: biblioteca,
    ordem: 'RESPONDA AGORA, COMPLETO E SEM ESCONDER NADA: diga as ferramentas que você tem, as fontes fixas e, da biblioteca de estudo, '
      + 'os autores e obras da lista (cite os NOMES; pode dizer quantos trechos). Fale com naturalidade, em prosa, agrupando por tipo — '
      + 'não leia como tabela. Só fale do que veio nesta lista; NÃO acrescente autor nem livro de cabeça. '
      + (biblioteca.disponivel
        ? 'Lembre que o texto dos livros fica guardado no servidor: você pesquisa e cita a fonte, mas não reproduz o livro.'
        : 'ATENÇÃO: a lista da biblioteca NÃO veio agora (' + biblioteca.motivo + '). Diga isso com todas as letras, não invente a lista, e fale do resto.'),
  };
}

export async function executarFerramenta(nome, args, origem, ctx) {
  const a = args || {};
  const c = ctx || {};
  switch (String(nome || '')) {
    case 'garimpar': {
      const assunto = String(a.assunto || a.q || '').trim().slice(0, 300);
      const ctx = assunto ? buscarContexto(assunto, 4500) : { texto: '', fontes: [] };
      return {
        achou: !!ctx.texto,
        material: ctx.texto || '',
        fontes: (ctx.fontes || []).map((f) => ({ fonte: f.fonte, titulo: f.titulo })),
        ordem: ctx.texto
          ? 'Isto é o material de estudo do acervo. Fale em cima dele e diga que veio do material — SEM citar professor nem instituição por nome.'
          : 'NÃO achei esse assunto no material das aulas. Diga isso com todas as letras e avise que a partir daqui é você trabalhando pelo texto e pelo método, não o material dele.',
      };
    }
    case 'ler_versiculo':
      return lerVersiculo(a.ref || a.referencia, origem);
    case 'conferir_citacao':
      return conferirCitacao(a.ref || a.referencia, a.o_que_eu_disse || a.afirmacao, origem);
    // O TELÃO é resolvido NO NAVEGADOR, antes de chegar aqui — a tela troca na
    // hora, sem ida e volta na internet. Este caso só existe pra bancada de
    // provas e pra um navegador antigo que não saiba interceptar.
    case 'mostrar_na_tela':
      return { ok: true, mostrado: String((a && a.tipo) || 'nada'),
               ordem: 'A tela já mudou. NÃO comente que mostrou nada — continue falando naturalmente.' };
    case 'licao_da_ebd':
      return licaoDaEBD(a, origem);
    case 'buscar_no_acervo':
      return buscarNoAcervo(a.pergunta || a.q || a.assunto, origem);
    case 'pesquisar_biblioteca':
      return pesquisarBiblioteca(a.pergunta || a.q || a.assunto, origem);
    case 'versiculos_ligados':
      return versiculosLigados(a.ref || a.referencia, origem);
    // A MEMÓRIA. Sem `user` ela responde "não tenho memória ligada" — e o globo
    // diz isso em voz alta. NUNCA devolve lembrança inventada para tapar buraco.
    case 'o_que_ja_falamos':
      return oQueJaFalamos(a, origem, c.user || '');
    case 'saber_agora':
      return saberAgora(a.pergunta || a.q || a.assunto, origem);
    case 'meu_conhecimento':
      return meuConhecimento(origem);
    // As três do APRENDIZADO recebem `user` JÁ CONFERIDO pelo crachá (voz.js) — sem dono
    // provado, guardar/ler o caderno responde "sem caderno ligado", nunca o de outra pessoa.
    case 'pensar_a_fundo':
      return pensarAFundo(a.pergunta || a.q || a.assunto, origem, c.user || '');
    case 'guardar_ensino':
      return guardarEnsino(a, origem, c.user || '');
    case 'ensinos_do_pastor':
      return ensinosDoPastor(a, origem, c.user || '');
    // Como o telão: quem troca a voz é o NAVEGADOR. Este caso é só pra bancada de provas.
    case 'trocar_voz':
      return { ok: true, nova_voz: String(a.voz || ''), ordem: 'Diga só "vou trocar a voz agora" e pare.' };
    default:
      return { erro: 'ferramenta desconhecida: ' + nome,
        ordem: 'Não use isso. Siga com as ferramentas que você tem.' };
  }
}

// Exportadas para o banco de provas (scripts/_provar-voz-ferramentas.mjs) poder
// bater em cada uma sem subir sessão de voz nenhuma.
export { lerVersiculo, conferirCitacao, buscarNoAcervo, versiculosLigados, pesquisarBiblioteca, partirRef, medir,
  pensarAFundo, guardarEnsino, ensinosDoPastor, refsDaPergunta };

// O REDATOR, exportado. Quem resume a conversa (voz-memoria.js) precisa dele,
// mas NÃO pode importar este arquivo — seria import circular. Então o voz.js
// pega aqui e ENTREGA a função pra lá. Um redator só no app inteiro: se a
// cascata melhorar aqui, o resumo da memória melhora junto, no mesmo instante.
export { escrever };
