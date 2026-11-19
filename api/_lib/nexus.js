// NEXUS BÍBLICO — o motor do mapa de conhecimento (19/11/2026, primeiro módulo).
// Rota: POST /api/nexus  (via api/dados.js?fn=nexus; nenhuma função nova, por causa do plano Hobby).
//
// O QUE ELE FAZ: monta, NA HORA, um pedaço do grafo de conhecimento a partir do que o RADAR já tem.
// Não copia nada: os 135 mil trechos (biblioteca_trechos, bancos 1 e 2), as 341 mil referências cruzadas
// (oficina_refcruz) e as 637 descobertas (oficina_descobertas) são só LIDOS. O banco próprio do NEXUS
// (NEXUS_DATABASE_URL) guarda apenas o que é novo: as investigações salvas.
//
// AÇÕES  (corpo JSON: { acao, cracha?, token?, ... })
//   expandir  { id, contexto? }   -> { nos, arestas }        vizinhança de um nó (passagem, obra, autor, conceito, verbete, descoberta)
//   caminho   { de, para }        -> { nos, arestas, passos } caminho mais curto entre duas passagens (referências cruzadas)
//   descobrir { id }              -> { blocos }               os 6 algoritmos do motor de descoberta para uma passagem
//   explicar  { id }              -> { texto, evidencias }    a IA explica o resultado de `descobrir`, citando [E1], [E2]…
//   salvar    { titulo, estado, investigacao? } / listar / abrir { investigacao } / apagar { investigacao }
//
// A PORTA (a mesma da Oficina): sem crachá do aparelho ou token do PIN, só sai o que é público —
// texto da Almeida e referências cruzadas do OpenBible (CC-BY). Autores, obras, verbetes, conceitos,
// descobertas, explicação e investigações exigem a porta, e o trecho de livro sai CURTO (≤ 300 letras).
//
// A NATUREZA DE CADA LIGAÇÃO (regra do projeto: nunca apresentar hipótese como fato):
//   documental     — a obra cita/comenta textualmente; o conceito aparece no texto do trecho
//   estabelecido   — dado bibliográfico (quem escreveu a obra)
//   interpretacao  — referência cruzada da curadoria comunitária do OpenBible (com votos)
//   hipotese       — vínculo calculado pelo NEXUS a partir de dados documentados (co-citação)
//   inferencia_ia  — descoberta escrita por IA na Oficina, com a fonte que ela declarou
//   nao_verificada — descoberta cuja fonte está marcada "conferir"
const { Client } = require('pg');
const crypto = require('crypto');
const R = require('./oficina-refs.js');
const { liberado } = require('./livro-particular.js');

const CREDITO_OB = 'OpenBible.info, CC-BY (referências cruzadas)';
const LIM_TRECHO = 300;

// ── conexões ────────────────────────────────────────────────────────────────
const cs1 = () => process.env.RADAR_DB_DATABASE_URL || process.env.RADAR_DB;
const cs2 = () => process.env.RADAR_DB2_DATABASE_URL || process.env.RADAR_DB2;
const csN = () => process.env.NEXUS_DATABASE_URL || process.env.NEXUS_POSTGRES_URL || process.env.NEXUS_DATABASE_URL_UNPOOLED || '';

// Uma conexão por banco por requisição, aberta só quando precisa. Os bancos do RADAR são abertos em
// modo SOMENTE LEITURA: nada do NEXUS consegue escrever neles, nem por engano.
function bancos() {
  const abertos = {};
  async function abrir(qual) {
    if (abertos[qual]) return abertos[qual];
    const cs = qual === 1 ? cs1() : qual === 2 ? cs2() : csN();
    if (!cs) return null;
    abertos[qual] = (async () => {
      const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
      await c.connect();
      if (qual !== 'n') await c.query('SET default_transaction_read_only = on');
      return c;
    })();
    return abertos[qual];
  }
  return {
    async q(qual, sql, args) {
      const c = await abrir(qual);
      if (!c) return [];
      return (await c.query(sql, args)).rows;
    },
    async fechar() {
      for (const p of Object.values(abertos)) { try { (await p).end(); } catch (_) { /* já fechou */ } }
    },
  };
}

// ── a Almeida (do próprio site) ───────────────────────────────────────────────
let BIBLIA = null, BIBLIA_P = null;
function carregarBiblia(origem) {
  if (BIBLIA) return Promise.resolve(BIBLIA);
  if (BIBLIA_P) return BIBLIA_P;
  BIBLIA_P = (async () => {
    try {
      const r = await fetch(origem + '/biblia.json', { signal: AbortSignal.timeout(8000) });
      if (!r.ok) return null;
      const arr = JSON.parse((await r.text()).replace(/^﻿/, ''));
      if (!Array.isArray(arr) || arr.length < 60) return null;
      const idx = {};
      for (const l of arr) idx[l.abbrev] = l.chapters;
      BIBLIA = idx;
      return BIBLIA;
    } catch (_) { return null; } finally { BIBLIA_P = null; }
  })();
  return BIBLIA_P;
}

// ── catálogo das obras (fontes_catalogo, banco 2), guardado na memória do processo ────────────
let CATALOGO = null, CATALOGO_EM = 0;
async function catalogo(db) {
  if (CATALOGO && Date.now() - CATALOGO_EM < 600e3) return CATALOGO;
  const linhas = await db.q(2, 'select fonte, titulo, autor, grupo from fontes_catalogo').catch(() => []);
  const m = {};
  for (const x of linhas) m[x.fonte] = x;
  CATALOGO = m; CATALOGO_EM = Date.now();
  return m;
}
const LEXICOS = new Set(['thayer', 'kittel', 'al-trench', 'owens', 'al-owens']);
function categoriaDe(fonte, cat, x) {
  if (LEXICOS.has(fonte)) return 'lexico';
  if (/^pat-|eusebio/.test(fonte)) return 'patristica';
  if (/rashi|rabbah|midrash|josefo/i.test(fonte + ' ' + ((cat && cat.autor) || (x && x.autor) || ''))) return 'judaica';
  if (/edersheim|schurer/i.test(fonte)) return 'contexto-judaico';
  if (/mensageiro/.test(fonte) || (x && x.tipo === 'historico')) return 'historia';
  if (/wagner|pregac/.test(fonte) || (x && x.tipo === 'pregacao')) return 'pregacao';
  return 'comentario';
}
function obraNo(fonte, cat, x) {
  const c = cat[fonte];
  return {
    id: 'o:' + fonte, tipo: 'obra',
    rotulo: (c && c.titulo) || (x && x.obra) || fonte,
    autor: (c && c.autor) || (x && x.autor) || '',
    categoria: categoriaDe(fonte, c, x),
    grupo: (c && c.grupo) || '',
  };
}
const idAutor = (nome) => 'a:' + String(nome || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 80);

// ── conceitos: dicionário curado. A regra de busca vai junto na evidência (transparência). ─────
const CONCEITOS = [
  { id: 'logos', rotulo: 'Logos (o Verbo)', re: 'λόγος|λόγον|λόγου|λόγῳ|\\b[Ll]ogos\\b|\\bVerbo\\b' },
  { id: 'sabedoria', rotulo: 'Sabedoria', re: '[Ss]abedoria|σοφία|σοφίας|\\b[Ss]ophia\\b|[Cc]hokmah|[Hh]okmah|ḥokmâ' },
  { id: 'filon', rotulo: 'Fílon de Alexandria', re: 'F[íi]lon|\\bPhilo\\b|Filo de Alexandria|Filo Judeu|Fílon Judeu' },
  { id: 'memra', rotulo: 'Memra (Targum)', re: '\\b[Mm]emra\\b|[Mm]eimr[aá]' },
  { id: 'targum', rotulo: 'Targum', re: '[Tt]argum' },
  { id: 'principio', rotulo: 'No princípio (Gênesis 1)', re: '[Nn]o princípio|ἐν ἀρχῇ|[Bb]ereshit|[Bb]er[eê][sš][iî]t' },
  { id: 'preexistencia', rotulo: 'Preexistência de Cristo', re: '[Pp]reexist|[Pp]ré-exist' },
  { id: 'encarnacao', rotulo: 'Encarnação', re: '[Ee]ncarna[çc][ãa]o|[Ee]ncarnad[oa]|[Ee]ncarnou' },
  { id: 'divindade', rotulo: 'Divindade de Cristo', re: '[Dd]ivindade de (Cristo|Jesus)|[Dd]eidade de (Cristo|Jesus)|θεὸς ἦν' },
  { id: 'criacao-palavra', rotulo: 'Criação pela Palavra', re: '[Cc]ria[çc][ãa]o pela [Pp]alavra|[Pp]alavra criadora|[Dd]isse Deus' },
  { id: 'shekinah', rotulo: 'Shekinah / tabernáculo', re: '[Ss]hek(h)?inah|[Ss]equin[aá]|σκηνόω|ἐσκήνωσεν|tabern[aá]cul' },
  { id: 'trindade', rotulo: 'Trindade', re: '[Tt]rindade|[Tt]rinit[aá]ri' },
  { id: 'gnosticismo', rotulo: 'Gnosticismo', re: '[Gg]n[óo]stic' },
];
const RE_CONC = Object.fromEntries(CONCEITOS.map((c) => [c.id, new RegExp(c.re)]));
const conceitoNo = (c) => ({ id: 'c:' + c.id, tipo: 'conceito', rotulo: c.rotulo, regra: c.re });

// ── passagens ────────────────────────────────────────────────────────────────
function passagemNo(ini, fim, bib) {
  const a = R.decompor(ini), z = R.decompor(fim);
  const rotulo = a.b === z.b && a.c === z.c ? R.nomeRef(a.b, a.c, a.v, z.v) : R.nomeRef(a.b, a.c, a.v) + ' – ' + R.nomeRef(z.b, z.c, z.v);
  return {
    id: 'p:' + ini + '-' + fim, tipo: 'passagem', rotulo,
    testamento: a.b <= 39 ? 'AT' : 'NT', livro: R.AB[a.b - 1],
    texto: bib ? R.textoIntervalo(bib, ini, fim, 4) : null,
  };
}
function lerPassagemId(id) {
  const m = /^p:(\d{7,9})-(\d{7,9})$/.exec(String(id || ''));
  if (!m) return null;
  const ini = +m[1], fim = +m[2];
  if (fim < ini || fim - ini > 200000) return null;
  return { ini, fim };
}
// Normaliza uma passagem para o nível de versículo do destino (as referências do OpenBible às vezes são intervalos).
const idP = (ini, fim) => 'p:' + ini + '-' + (fim || ini);

function trechoCurto(texto, alvo, limite) {
  const t = String(texto || '').replace(/\s+/g, ' ');
  if (!alvo) return t.length <= limite ? t : t.slice(0, limite).trim() + '…';
  const m = alvo.exec(t);
  if (!m) return t.length <= limite ? t : t.slice(0, limite).trim() + '…';
  const ini = Math.max(0, m.index - Math.floor(limite / 3));
  return (ini > 0 ? '…' : '') + t.slice(ini, ini + limite).trim() + (ini + limite < t.length ? '…' : '');
}
function alvoVersiculo(ini) {
  const a = R.decompor(ini);
  return new RegExp('(?:^|\\D)' + a.c + '\\s*[:.]\\s*' + a.v + '(?!\\d)');
}
const modoRotulo = (modo, passagem) => modo === 3 ? 'comenta o capítulo' : modo === 1 ? (passagem ? 'comenta a passagem' : 'comenta o versículo') : (passagem ? 'cita a passagem' : 'cita o versículo');

// ── as 6 CLASSES de relação (pedido do Elias, 19/11/2026) ─────────────────────────
//   textual       — o texto da obra cita a passagem (referência escrita, citação literal, verbete que cita)
//   documental    — a obra comenta a passagem numa seção dedicada; autoria registrada
//   tematica      — o conceito aparece no texto que trata da passagem
//   interpretacao — referência cruzada da curadoria OpenBible (interpretação com votos)
//   hipotese      — vínculo calculado pelo NEXUS (co-citação, caminho)
//   inferencia    — descoberta escrita por IA, ainda não verificada por pessoa
function classeDe(a) {
  if (a.classe) return a.classe;
  if (a.tipo === 'cita' || a.tipo === 'lexical') return 'textual';
  if (a.tipo === 'comenta' || a.tipo === 'escreveu' || a.tipo === 'contem') return 'documental';
  if (a.tipo === 'mencao') return 'tematica';
  if (a.tipo === 'refcruz') return 'interpretacao';
  if (a.tipo === 'co-citacao' || a.tipo === 'caminho') return 'hipotese';
  if (a.tipo === 'descoberta') return 'inferencia';
  return 'documental';
}

// ── memória de respostas (por processo; 10 minutos) ──────────────────────────────
const MEMORIA = new Map();
function lembrar(chave) { const x = MEMORIA.get(chave); if (x && Date.now() - x.t < 600e3) return x.v; MEMORIA.delete(chave); return null; }
function guardar(chave, v) { MEMORIA.set(chave, { t: Date.now(), v }); if (MEMORIA.size > 150) MEMORIA.delete(MEMORIA.keys().next().value); return v; }

// Corta a vizinhança para o aparelho não receber mais elementos do que consegue mostrar bem.
// Fica o foco e os mais ligados (soma dos pesos); o resto vira contagem por tipo ("mais N").
function aparar(saida, foco, limite, so) {
  let nos = saida.nos, arestas = saida.arestas;
  if (so) { nos = nos.filter((n) => n.id === foco || n.tipo === so); }
  const ids = new Set(nos.map((n) => n.id));
  arestas = arestas.filter((a) => ids.has(a.de) && ids.has(a.para));
  if (!limite || nos.length <= limite) return { nos, arestas, restantes: {} };
  const nota = new Map();
  for (const a of arestas) {
    const p = Math.log2(2 + (a.peso || 1)) * (a.de === foco || a.para === foco ? 2 : 1);
    nota.set(a.de, (nota.get(a.de) || 0) + p); nota.set(a.para, (nota.get(a.para) || 0) + p);
  }
  const ordem = nos.filter((n) => n.id !== foco).sort((x, y) => (nota.get(y.id) || 0) - (nota.get(x.id) || 0));
  const ficam = new Set([foco, ...ordem.slice(0, limite - 1).map((n) => n.id)]);
  const restantes = {};
  for (const n of ordem.slice(limite - 1)) restantes[n.tipo] = (restantes[n.tipo] || 0) + 1;
  return { nos: nos.filter((n) => ficam.has(n.id)), arestas: arestas.filter((a) => ficam.has(a.de) && ficam.has(a.para)), restantes };
}

// ── acumulador de grafo (nós e arestas sem repetição) ──────────────────────────
function grafo() {
  const nos = new Map(), arestas = new Map();
  return {
    no(n) { if (!nos.has(n.id)) nos.set(n.id, n); else Object.assign(nos.get(n.id), Object.fromEntries(Object.entries(n).filter(([, v]) => v != null))); return n.id; },
    aresta(a) {
      const id = a.tipo + '|' + a.de + '|' + a.para;
      const ja = arestas.get(id);
      if (ja) {
        ja.peso = (ja.peso || 1) + (a.peso || 1);
        if (a.evidencias) ja.evidencias = (ja.evidencias || []).concat(a.evidencias).slice(0, 4);
        return id;
      }
      arestas.set(id, { id, ...a, classe: classeDe(a) });
      return id;
    },
    saida() { return { nos: [...nos.values()], arestas: [...arestas.values()] }; },
  };
}

// ── leituras reaproveitadas (as mesmas tabelas da Oficina) ─────────────────────────────────
async function cruzadasDe(db, ini, fim, limite) {
  const saida = await db.q(2, `select de, para_ini, para_fim, votos from oficina_refcruz
     where de between $1 and $2 order by votos desc limit $3`, [ini, fim, limite]).catch(() => []);
  const entrada = await db.q(2, `select de, para_ini, para_fim, votos from oficina_refcruz
     where para_ini <= $2 and para_fim >= $1 order by votos desc limit $3`, [ini, fim, Math.ceil(limite / 2)]).catch(() => []);
  return { saida, entrada };
}
async function ponteirosDe(db, ini, fim, limite) {
  return db.q(2, `select o.ini, o.fim, o.banco, o.trecho, o.modo, f.fonte
      from oficina_idx o join oficina_fontes f on f.id = o.fonte_id
     where o.ini <= $2 and o.fim >= $1 and o.ini >= $1 - 60000 limit $3`, [ini, fim, limite || 400]).catch(() => []);
}
async function trechosPorPonteiros(db, ponteiros) {
  const ids1 = [...new Set(ponteiros.filter((p) => p.banco === 1).map((p) => p.trecho))];
  const ids2 = [...new Set(ponteiros.filter((p) => p.banco === 2).map((p) => p.trecho))];
  const cols = 'id, fonte, autor, obra, livro, secao, tipo, texto, peso, aprovado';
  const [t1, t2] = await Promise.all([
    ids1.length ? db.q(1, `select ${cols} from biblioteca_trechos where id = any($1)`, [ids1]).catch(() => []) : [],
    ids2.length ? db.q(2, `select ${cols} from biblioteca_trechos where id = any($1)`, [ids2]).catch(() => []) : [],
  ]);
  const m = new Map();
  for (const x of t1) m.set('1:' + x.id, x);
  for (const x of t2) m.set('2:' + x.id, x);
  return m;
}
// As outras passagens citadas/comentadas nos MESMOS trechos (base da co-citação e da vizinhança lexical).
async function outrasRefsDosTrechos(db, chaves) {
  if (!chaves.length) return [];
  const bancosArr = chaves.map((k) => +k.split(':')[0]);
  const trechosArr = chaves.map((k) => +k.split(':')[1]);
  return db.q(2, `select o.banco, o.trecho, o.ini, o.fim, o.modo, f.fonte
      from oficina_idx o join oficina_fontes f on f.id = o.fonte_id
      join unnest($1::int[], $2::bigint[]) as u(banco, trecho) on u.banco = o.banco and u.trecho = o.trecho`,
  [bancosArr, trechosArr]).catch(() => []);
}
async function descobertasQueCruzam(db, livro, cap, v1, v2) {
  return db.q(2, `select id, camada, titulo, explica, refs, fonte, origem from oficina_descobertas
     where livro = $1 and cap = $2 and v1 <= $4 and v2 >= $3
     order by array_position(array['original','ecos','estrutura','contexto'], camada), id`, [livro, cap, v1, v2]).catch(() => []);
}
function naturezaDescoberta(d) {
  const f = String(d.fonte || '').trim().toLowerCase();
  if (!f || f === 'conferir') return 'nao_verificada';
  return 'inferencia_ia';
}
function refsDaDescoberta(d, bib) {
  const out = [];
  for (const s of (d.refs || [])) {
    const r = R.achar(' ' + s, bib)[0];
    if (r) out.push([R.chave(r.b, r.cap, r.v1), R.chave(r.b, r.cap, r.v2)]);
  }
  return out;
}

// Citação LITERAL: a frase de abertura do versículo (texto da Almeida) procurada palavra por palavra no texto dos
// trechos. Cobre as obras que a Oficina ainda não indexou (patrística, Eusébio, Josefo têm 0 ponteiros hoje).
function fraseDoVersiculo(bib, ini) {
  const t = R.textoIntervalo(bib, ini, ini, 1) || '';
  const palavras = t.replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  for (let n = 5; n <= 7; n++) {
    const f = palavras.slice(0, n).join(' ');
    if (f.length >= 20) return f;
  }
  return null;
}
async function citacoesLiterais(db, bib, ini, excluir) {
  const frase = fraseDoVersiculo(bib, ini);
  if (!frase) return { frase: null, achados: [] };
  const padrao = '%' + frase.replace(/[\\%_]/g, (m) => '\\' + m) + '%';
  const cols = 'id, fonte, autor, obra, secao, tipo, texto';
  const [l1, l2] = await Promise.all([
    db.q(1, `select ${cols} from biblioteca_trechos where texto ilike $1 limit 40`, [padrao]).catch(() => []),
    db.q(2, `select ${cols} from biblioteca_trechos where texto ilike $1 limit 40`, [padrao]).catch(() => []),
  ]);
  const achados = l1.map((x) => ({ ...x, chave: '1:' + x.id })).concat(l2.map((x) => ({ ...x, chave: '2:' + x.id })))
    .filter((x) => !(excluir && excluir.has(x.chave)));
  return { frase, achados };
}
const reFrase = (frase) => new RegExp(frase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'i');
// Seção que é só nome de arquivo ("Trench - Sinônimos … - PT 1:23") não é verbete.
const verbeteValido = (secao) => secao && !/ - PT\b|\.md$|^\s*\d+\s*$/.test(String(secao));

// ═══ EXPANDIR ═══════════════════════════════════════════════════════════════
async function expandirPassagem(db, g, ini, fim, bib, aberto) {
  const foco = g.no(passagemNo(ini, fim, bib));
  const passagem = fim > ini;

  // 1) referências cruzadas (público)
  const { saida, entrada } = await cruzadasDe(db, ini, fim, 14);
  for (const x of saida) {
    const id = g.no(passagemNo(x.para_ini, x.para_fim, bib));
    if (id === foco) continue;
    g.aresta({ de: foco, para: id, tipo: 'refcruz', natureza: 'interpretacao', peso: x.votos,
      explica: `Referência cruzada da curadoria comunitária OpenBible (${x.votos} votos).`, credito: CREDITO_OB });
  }
  for (const x of entrada) {
    const id = g.no(passagemNo(x.de, x.de, bib));
    if (id === foco) continue;
    g.aresta({ de: id, para: foco, tipo: 'refcruz', natureza: 'interpretacao', peso: x.votos,
      explica: `Referência cruzada da curadoria comunitária OpenBible (${x.votos} votos), no sentido inverso.`, credito: CREDITO_OB });
  }
  if (!aberto) return;

  // 2) obras, autores, verbetes e conceitos ligados por ponteiros da Oficina
  const cat = await catalogo(db);
  const ponteiros = await ponteirosDe(db, ini, fim, 400);
  ponteiros.sort((a, b) => ({ 1: 0, 3: 1, 2: 2 }[a.modo] - { 1: 0, 3: 1, 2: 2 }[b.modo]));
  const escolhidos = ponteiros.slice(0, 160);
  const textos = await trechosPorPonteiros(db, escolhidos);
  const alvo = alvoVersiculo(ini);
  const conceitosAchados = new Map();    // id -> { trechos, obras:Set, evid:[] }

  for (const p of escolhidos) {
    const x = textos.get(p.banco + ':' + p.trecho);
    if (!x) continue;
    const ob = obraNo(p.fonte, cat, x);
    const ev = { autor: x.autor, obra: ob.rotulo, secao: x.secao || x.livro || '', modo: modoRotulo(p.modo, passagem),
      trecho: trechoCurto(x.texto, alvo, LIM_TRECHO), ref: p.banco + ':' + p.trecho };

    if (ob.categoria === 'lexico' && verbeteValido(x.secao)) {
      // o verbete do léxico vira nó próprio: relação lexical documentada
      const lid = g.no({ id: 'l:' + p.fonte + ':' + String(x.secao).slice(0, 80), tipo: 'verbete', rotulo: String(x.secao).slice(0, 60), obra: ob.rotulo, fonte: p.fonte });
      g.aresta({ de: lid, para: foco, tipo: 'lexical', natureza: 'documental', peso: 1,
        explica: `O verbete "${String(x.secao).slice(0, 60)}" de ${ob.rotulo} ${modoRotulo(p.modo, passagem)}.`, evidencias: [ev] });
      g.no(ob);
      g.aresta({ de: g.no(ob), para: lid, tipo: 'contem', natureza: 'estabelecido', peso: 1, explica: `Verbete de ${ob.rotulo}.` });
    } else {
      const oid = g.no(ob);
      g.aresta({ de: oid, para: foco, tipo: p.modo === 2 ? 'cita' : 'comenta', natureza: 'documental', peso: 1,
        explica: `${ob.rotulo} ${modoRotulo(p.modo, passagem)}.`, evidencias: [ev] });
      if (ob.autor) {
        const aid = g.no({ id: idAutor(ob.autor), tipo: 'autor', rotulo: ob.autor });
        g.aresta({ de: aid, para: oid, tipo: 'escreveu', natureza: 'estabelecido', peso: 1, explica: `Autoria registrada no catálogo da biblioteca.` });
      }
    }
    // conceitos mencionados no MESMO trecho que trata da passagem
    for (const c of CONCEITOS) {
      const m = RE_CONC[c.id].exec(String(x.texto || ''));
      if (!m) continue;
      const acc = conceitosAchados.get(c.id) || { trechos: 0, obras: new Set(), evid: [] };
      acc.trechos++; acc.obras.add(ob.rotulo);
      if (acc.evid.length < 3) acc.evid.push({ ...ev, trecho: trechoCurto(x.texto, RE_CONC[c.id], LIM_TRECHO) });
      conceitosAchados.set(c.id, acc);
    }
  }
  // citações literais da frase do versículo (obras sem ponteiros: patrística, Eusébio…)
  const jaVistos = new Set(escolhidos.map((p) => p.banco + ':' + p.trecho));
  const lit = await citacoesLiterais(db, bib, ini, jaVistos);
  for (const x of lit.achados) {
    const ob = obraNo(x.fonte, cat, x);
    const oid = g.no(ob);
    const ev = { autor: x.autor, obra: ob.rotulo, secao: x.secao || x.livro || '', modo: 'cita literalmente', trecho: trechoCurto(x.texto, reFrase(lit.frase), LIM_TRECHO), ref: x.chave };
    g.aresta({ de: oid, para: foco, tipo: 'cita', natureza: 'documental', peso: 1,
      explica: `${ob.rotulo} cita literalmente a frase "${lit.frase}".`, evidencias: [ev] });
    if (ob.autor) g.aresta({ de: g.no({ id: idAutor(ob.autor), tipo: 'autor', rotulo: ob.autor }), para: oid, tipo: 'escreveu', natureza: 'estabelecido', peso: 1, explica: 'Autoria registrada no catálogo da biblioteca.' });
    for (const c of CONCEITOS) {
      if (!RE_CONC[c.id].test(String(x.texto || ''))) continue;
      const acc = conceitosAchados.get(c.id) || { trechos: 0, obras: new Set(), evid: [] };
      acc.trechos++; acc.obras.add(ob.rotulo);
      if (acc.evid.length < 3) acc.evid.push({ ...ev, trecho: trechoCurto(x.texto, RE_CONC[c.id], LIM_TRECHO) });
      conceitosAchados.set(c.id, acc);
    }
  }
  for (const [cid, acc] of conceitosAchados) {
    const c = CONCEITOS.find((k) => k.id === cid);
    const id = g.no(conceitoNo(c));
    g.aresta({ de: id, para: foco, tipo: 'mencao', natureza: 'documental', peso: acc.trechos,
      explica: `"${c.rotulo}" aparece em ${acc.trechos} trecho(s) de ${acc.obras.size} obra(s) que tratam desta passagem: ${[...acc.obras].slice(0, 4).join('; ')}.`,
      evidencias: acc.evid });
  }

  // 3) descobertas da Oficina que cruzam a passagem
  const a = R.decompor(ini), z = R.decompor(fim);
  const desc = await descobertasQueCruzam(db, R.AB[a.b - 1], a.c, a.v, a.c === z.c ? z.v : 176);
  for (const d of desc.slice(0, 10)) {
    const did = g.no({ id: 'd:' + d.id, tipo: 'descoberta', rotulo: d.titulo, camada: d.camada, fonte: d.fonte, explica: d.explica });
    const nat = naturezaDescoberta(d);
    const evd = [{ autor: 'Oficina do RADAR', obra: `descoberta (camada ${d.camada})`, secao: d.fonte ? 'fonte declarada: ' + d.fonte : '', modo: 'descoberta', trecho: String(d.explica || '').slice(0, LIM_TRECHO) }];
    g.aresta({ de: did, para: foco, tipo: 'descoberta', natureza: nat, peso: 1,
      explica: nat === 'nao_verificada' ? 'Descoberta da Oficina com fonte marcada "conferir": não verificada.' : `Descoberta da Oficina escrita por IA; fonte declarada: ${d.fonte}.`, evidencias: evd });
    for (const [i2, f2] of refsDaDescoberta(d, bib)) {
      if (i2 <= fim && f2 >= ini) continue;
      const pid = g.no(passagemNo(i2, f2, bib));
      g.aresta({ de: did, para: pid, tipo: 'descoberta', natureza: nat, peso: 1, explica: 'Passagem citada pela descoberta.', evidencias: evd });
    }
  }
}

async function expandirObra(db, g, fonte, contexto, bib) {
  const cat = await catalogo(db);
  const ob = obraNo(fonte, cat, null);
  const oid = g.no(ob);
  if (ob.autor) g.aresta({ de: g.no({ id: idAutor(ob.autor), tipo: 'autor', rotulo: ob.autor }), para: oid, tipo: 'escreveu', natureza: 'estabelecido', peso: 1, explica: 'Autoria registrada no catálogo da biblioteca.' });
  // As passagens que ESTA obra cita junto com as passagens já abertas no mapa (co-citação dentro da obra).
  const fid = (await db.q(2, 'select id from oficina_fontes where fonte = $1', [fonte]).catch(() => []))[0];
  if (!fid) return;
  const ctx = (contexto || []).map(lerPassagemId).filter(Boolean).slice(0, 12);
  let chaves = [];
  for (const c of ctx) {
    const ps = await db.q(2, `select banco, trecho from oficina_idx where fonte_id = $3 and ini <= $2 and fim >= $1 and ini >= $1 - 60000 limit 60`, [c.ini, c.fim, fid.id]).catch(() => []);
    chaves.push(...ps.map((p) => p.banco + ':' + p.trecho));
  }
  chaves = [...new Set(chaves)].slice(0, 80);
  if (!chaves.length) {
    // sem contexto: as passagens que a obra comenta (modo 1/3) com mais trechos
    let top = await db.q(2, `select ini, fim, count(*) n from oficina_idx where fonte_id = $1 and modo in (1,3)
      group by ini, fim order by n desc limit 10`, [fid.id]).catch(() => []);
    if (!top.length) top = await db.q(2, `select ini, fim, count(*) n from oficina_idx where fonte_id = $1
      group by ini, fim order by n desc limit 10`, [fid.id]).catch(() => []);
    if (!top.length) {
      g.no({ id: oid, aviso: 'A Oficina ainda não indexou as referências desta obra; ela aparece no mapa por citação literal ou por conceito.' });
      return;
    }
    for (const t of top) {
      const pid = g.no(passagemNo(t.ini, t.fim, bib));
      g.aresta({ de: oid, para: pid, tipo: 'comenta', natureza: 'documental', peso: +t.n, explica: `${ob.rotulo} dedica ${t.n} trecho(s) a esta passagem.` });
    }
    return;
  }
  const outras = await outrasRefsDosTrechos(db, chaves);
  const ctxSet = ctx.map((c) => [c.ini, c.fim]);
  const conta = new Map();
  for (const o of outras) {
    if (ctxSet.some(([i, f]) => o.ini <= f && o.fim >= i)) continue;
    const k = idP(o.ini, o.fim);
    conta.set(k, (conta.get(k) || 0) + 1);
  }
  const top = [...conta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [k, n] of top) {
    const p = lerPassagemId(k);
    const pid = g.no(passagemNo(p.ini, p.fim, bib));
    g.aresta({ de: oid, para: pid, tipo: 'cita', natureza: 'documental', peso: n,
      explica: `${ob.rotulo} cita esta passagem em ${n} dos trechos onde trata das passagens abertas no mapa.` });
  }
}

async function expandirAutor(db, g, nome) {
  const cat = await catalogo(db);
  const real = Object.values(cat).find((c) => idAutor(c.autor) === idAutor(nome));
  const aid = g.no({ id: idAutor(nome), tipo: 'autor', rotulo: real ? real.autor : nome });
  for (const [fonte, c] of Object.entries(cat)) {
    if (idAutor(c.autor) !== aid) continue;
    const oid = g.no(obraNo(fonte, cat, null));
    g.aresta({ de: aid, para: oid, tipo: 'escreveu', natureza: 'estabelecido', peso: 1, explica: 'Autoria registrada no catálogo da biblioteca.' });
  }
}

// Conceito: procura o termo no texto dos trechos (bancos 1 e 2), e segue os ponteiros até as passagens.
function reParaPostgres(re) { return re.replace(/\\b/g, '\\y'); }
async function expandirConceito(db, g, cid, bib) {
  const c = CONCEITOS.find((k) => k.id === cid);
  if (!c) return;
  const nid = g.no(conceitoNo(c));
  const cat = await catalogo(db);
  const rePg = reParaPostgres(c.re);
  const [l1, l2] = await Promise.all([
    db.q(1, 'select id, fonte from biblioteca_trechos where texto ~ $1 limit 250', [rePg]).catch(() => []),
    db.q(2, 'select id, fonte from biblioteca_trechos where texto ~ $1 limit 250', [rePg]).catch(() => []),
  ]);
  const chaves = l1.map((x) => '1:' + x.id).concat(l2.map((x) => '2:' + x.id));
  // obras que mais mencionam (na amostra)
  const porObra = new Map();
  for (const x of l1.concat(l2)) porObra.set(x.fonte, (porObra.get(x.fonte) || 0) + 1);
  for (const [fonte, n] of [...porObra.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    const oid = g.no(obraNo(fonte, cat, null));
    g.aresta({ de: nid, para: oid, tipo: 'mencao', natureza: 'documental', peso: n,
      explica: `"${c.rotulo}" aparece em ${n} trecho(s) desta obra (amostra de até 500 trechos; regra: ${c.re}).` });
  }
  // passagens tratadas nesses trechos
  const outras = await outrasRefsDosTrechos(db, chaves.slice(0, 500));
  const conta = new Map();
  for (const o of outras) {
    const k = idP(o.ini, o.fim);
    const e = conta.get(k) || { n: 0, fontes: new Set() };
    e.n++; e.fontes.add(o.fonte); conta.set(k, e);
  }
  const top = [...conta.entries()].sort((a, b) => (b[1].fontes.size - a[1].fontes.size) || (b[1].n - a[1].n)).slice(0, 10);
  for (const [k, e] of top) {
    const p = lerPassagemId(k);
    const pid = g.no(passagemNo(p.ini, p.fim, bib));
    g.aresta({ de: nid, para: pid, tipo: 'mencao', natureza: 'documental', peso: e.n,
      explica: `"${c.rotulo}" aparece em ${e.n} trecho(s), de ${e.fontes.size} obra(s), que tratam desta passagem.` });
  }
}

// Verbete: as outras passagens que o MESMO verbete do léxico cita (vizinhança lexical).
async function expandirVerbete(db, g, fonte, secao, bib) {
  const cat = await catalogo(db);
  const ob = obraNo(fonte, cat, null);
  const lid = g.no({ id: 'l:' + fonte + ':' + secao, tipo: 'verbete', rotulo: secao.slice(0, 60), obra: ob.rotulo, fonte });
  g.aresta({ de: g.no(ob), para: lid, tipo: 'contem', natureza: 'estabelecido', peso: 1, explica: `Verbete de ${ob.rotulo}.` });
  const [l1, l2] = await Promise.all([
    db.q(1, 'select id from biblioteca_trechos where fonte = $1 and secao = $2 limit 40', [fonte, secao]).catch(() => []),
    db.q(2, 'select id from biblioteca_trechos where fonte = $1 and secao = $2 limit 40', [fonte, secao]).catch(() => []),
  ]);
  const chaves = l1.map((x) => '1:' + x.id).concat(l2.map((x) => '2:' + x.id));
  const outras = await outrasRefsDosTrechos(db, chaves);
  const conta = new Map();
  for (const o of outras) conta.set(idP(o.ini, o.fim), (conta.get(idP(o.ini, o.fim)) || 0) + 1);
  for (const [k, n] of [...conta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)) {
    const p = lerPassagemId(k);
    const pid = g.no(passagemNo(p.ini, p.fim, bib));
    g.aresta({ de: lid, para: pid, tipo: 'lexical', natureza: 'documental', peso: n, explica: `O verbete "${secao.slice(0, 60)}" de ${ob.rotulo} cita esta passagem.` });
  }
}

async function expandirDescoberta(db, g, id, bib) {
  const d = (await db.q(2, 'select id, livro, cap, v1, v2, camada, titulo, explica, refs, fonte from oficina_descobertas where id = $1', [id]).catch(() => []))[0];
  if (!d) return;
  const did = g.no({ id: 'd:' + d.id, tipo: 'descoberta', rotulo: d.titulo, camada: d.camada, fonte: d.fonte, explica: d.explica });
  const nat = naturezaDescoberta(d);
  const b = R.IDX_AB[d.livro];
  if (b) g.aresta({ de: did, para: g.no(passagemNo(R.chave(b, d.cap, d.v1), R.chave(b, d.cap, d.v2), bib)), tipo: 'descoberta', natureza: nat, peso: 1, explica: 'Passagem de origem da descoberta.' });
  for (const [i2, f2] of refsDaDescoberta(d, bib)) g.aresta({ de: did, para: g.no(passagemNo(i2, f2, bib)), tipo: 'descoberta', natureza: nat, peso: 1, explica: 'Passagem citada pela descoberta.' });
}

// ═══ CAMINHO (busca em largura bidirecional sobre as referências cruzadas) ═════════════════════
async function vizinhosRefcruz(db, chaves) {
  if (!chaves.length) return [];
  return db.q(2, `select de, para_ini as para, votos from (
      select de, para_ini, votos, row_number() over (partition by de order by votos desc) rn
        from oficina_refcruz where de = any($1::int[])) t where rn <= 25
    union all
    select de as para, para_ini as de, votos from (
      select de, para_ini, votos, row_number() over (partition by para_ini order by votos desc) rn
        from oficina_refcruz where para_ini = any($1::int[])) t2 where rn <= 25`, [chaves]).catch(() => []);
}
// `de` e `para` podem ser uma passagem (número) ou um CONJUNTO de passagens (as que um conceito, verbete ou obra
// documenta): a busca parte de todas ao mesmo tempo e para no primeiro encontro.
async function caminho(db, de, para) {
  const A = [].concat(de), B = [].concat(para);
  const comum = A.find((k) => B.includes(k));
  if (comum != null) return [comum];
  const paiA = new Map(A.map((k) => [k, null])), paiB = new Map(B.map((k) => [k, null]));
  let fronteiraA = [...A], fronteiraB = [...B];
  for (let nivel = 0; nivel < 3; nivel++) {
    // expande o lado menor
    const ladoA = fronteiraA.length <= fronteiraB.length;
    const fronteira = ladoA ? fronteiraA : fronteiraB;
    const pais = ladoA ? paiA : paiB, outros = ladoA ? paiB : paiA;
    const viz = await vizinhosRefcruz(db, fronteira.slice(0, 400));
    const nova = [];
    for (const v of viz) {
      if (pais.has(v.para)) continue;
      pais.set(v.para, { de: v.de, votos: v.votos });
      if (outros.has(v.para)) {
        const ida = [], volta = [];
        for (let k = v.para; k != null; k = paiA.get(k) && paiA.get(k).de) ida.unshift(k);
        for (let k = paiB.get(v.para) && paiB.get(v.para).de; k != null; k = paiB.get(k) && paiB.get(k).de) volta.push(k);
        return ida.concat(volta);
      }
      nova.push(v.para);
    }
    if (ladoA) fronteiraA = nova; else fronteiraB = nova;
    if (!nova.length) break;
  }
  return null;
}

// ═══ DESCOBRIR (os 6 algoritmos) ═══════════════════════════════════════════════════════════
async function descobrir(db, ini, fim, bib) {
  const cat = await catalogo(db);
  const foco = passagemNo(ini, fim, bib);
  const blocos = [];
  const { saida, entrada } = await cruzadasDe(db, ini, fim, 40);
  const entradaSet = new Set(entrada.map((x) => x.de));

  // ponteiros e trechos da passagem
  const ponteiros = await ponteirosDe(db, ini, fim, 500);
  const textos = await trechosPorPonteiros(db, ponteiros.slice(0, 220));
  const chavesFoco = [...new Set(ponteiros.map((p) => p.banco + ':' + p.trecho))];
  const outras = await outrasRefsDosTrechos(db, chavesFoco.slice(0, 400));
  const coPorPassagem = new Map();   // passagem -> { trechos:Set, fontes:Set }
  for (const o of outras) {
    if (o.ini <= fim && o.fim >= ini) continue;
    // normaliza para o versículo inicial (agrupa intervalos que começam no mesmo verso)
    const k = o.ini;
    const e = coPorPassagem.get(k) || { trechos: new Set(), fontes: new Set(), fim: o.fim };
    e.trechos.add(o.banco + ':' + o.trecho); e.fontes.add(o.fonte); coPorPassagem.set(k, e);
  }

  // 1) Referências cruzadas relevantes: votos + reciprocidade + apoio na biblioteca
  const rel = saida.map((x) => {
    const reciproca = entradaSet.has(x.para_ini);
    const apoio = coPorPassagem.get(x.para_ini);
    const nApoio = apoio ? apoio.fontes.size : 0;
    const nota = x.votos * (reciproca ? 1.3 : 1) + nApoio * 25;
    return { x, reciproca, nApoio, nota };
  }).sort((a, b) => b.nota - a.nota).slice(0, 8);
  blocos.push({ algoritmo: 'refcruz-relevantes', classe: 'interpretacao', titulo: 'Referências cruzadas mais relevantes', natureza: 'interpretacao',
    como: 'Votos do OpenBible, com bônus quando a ligação existe nos dois sentidos e quando obras da biblioteca citam as duas passagens no mesmo trecho.',
    itens: rel.map((r) => ({ alvo: idP(r.x.para_ini, r.x.para_fim), rotulo: passagemNo(r.x.para_ini, r.x.para_fim, bib).rotulo,
      detalhe: `${r.x.votos} votos${r.reciproca ? ' · recíproca' : ''}${r.nApoio ? ` · ${r.nApoio} obra(s) citam as duas juntas` : ''}`,
      texto: R.textoIntervalo(bib, r.x.para_ini, r.x.para_fim, 2), evidencias: [{ autor: 'OpenBible.info', obra: 'referências cruzadas (CC-BY)', secao: '', modo: 'curadoria', trecho: `${r.x.votos} votos` }] })) });

  // 2) Autores que comentam a mesma passagem
  const porFonte = new Map();
  for (const p of ponteiros) {
    const e = porFonte.get(p.fonte) || { n: 0, modos: new Set(), ev: [] };
    e.n++; e.modos.add(p.modo);
    const x = textos.get(p.banco + ':' + p.trecho);
    if (x && e.ev.length < 2) e.ev.push({ autor: x.autor, obra: obraNo(p.fonte, cat, x).rotulo, secao: x.secao || '', modo: modoRotulo(p.modo, fim > ini), trecho: trechoCurto(x.texto, alvoVersiculo(ini), LIM_TRECHO) });
    porFonte.set(p.fonte, e);
  }
  const autores = [...porFonte.entries()].filter(([f]) => !LEXICOS.has(f)).sort((a, b) => b[1].n - a[1].n).slice(0, 12);
  blocos.push({ algoritmo: 'autores-mesma-passagem', classe: 'documental', titulo: 'Obras e autores que tratam desta passagem', natureza: 'documental',
    como: 'Ponteiros da Oficina (trecho → versículo): quem comenta (seção dedicada) ou cita no texto.',
    itens: autores.map(([f, e]) => { const ob = obraNo(f, cat, null); return { alvo: 'o:' + f, rotulo: ob.rotulo, detalhe: `${ob.autor ? ob.autor + ' · ' : ''}${e.n} trecho(s) · ${[...e.modos].map((m) => m === 2 ? 'cita' : 'comenta').filter((v, i, a) => a.indexOf(v) === i).join(' e ')} · ${ob.categoria}`, evidencias: e.ev }; }) });

  // 2b) Citações literais (obras que a Oficina ainda não indexou: patrística, Eusébio…)
  const lit = await citacoesLiterais(db, bib, ini, new Set(chavesFoco));
  const litPorFonte = new Map();
  for (const x of lit.achados) {
    const e = litPorFonte.get(x.fonte) || { n: 0, ev: [] };
    e.n++;
    if (e.ev.length < 2) e.ev.push({ autor: x.autor, obra: obraNo(x.fonte, cat, x).rotulo, secao: x.secao || '', modo: 'cita literalmente', trecho: trechoCurto(x.texto, reFrase(lit.frase), LIM_TRECHO) });
    litPorFonte.set(x.fonte, e);
    textos.set(x.chave, x);
  }
  blocos.push({ algoritmo: 'citacoes-literais', classe: 'textual', titulo: 'Citações literais do versículo', natureza: 'documental',
    como: lit.frase ? `A frase "${lit.frase}" (Almeida) procurada palavra por palavra no texto de todos os trechos. Alcança obras que a Oficina ainda não indexou.` : 'Versículo curto demais para busca literal segura.',
    itens: [...litPorFonte.entries()].sort((a, b) => b[1].n - a[1].n).map(([f, e]) => { const ob = obraNo(f, cat, null); return { alvo: 'o:' + f, rotulo: ob.rotulo, detalhe: `${ob.autor ? ob.autor + ' · ' : ''}${e.n} citação(ões) literal(is) · ${ob.categoria}`, evidencias: e.ev }; }) });

  // 3) Temas recorrentes em diferentes obras (conceitos do dicionário nos trechos da passagem)
  const temas = new Map();
  const fontesTexto = ponteiros.map((p) => ({ chave: p.banco + ':' + p.trecho, fonte: p.fonte })).concat(lit.achados.map((x) => ({ chave: x.chave, fonte: x.fonte })));
  const temaVisto = new Set();
  for (const p of fontesTexto) {
    if (temaVisto.has(p.chave)) continue;
    temaVisto.add(p.chave);
    const x = textos.get(p.chave);
    if (!x) continue;
    for (const c of CONCEITOS) {
      if (!RE_CONC[c.id].test(String(x.texto || ''))) continue;
      const e = temas.get(c.id) || { obras: new Set(), n: 0, ev: [] };
      e.obras.add(obraNo(p.fonte, cat, x).rotulo); e.n++;
      if (e.ev.length < 3) e.ev.push({ autor: x.autor, obra: obraNo(p.fonte, cat, x).rotulo, secao: x.secao || '', modo: 'menciona', trecho: trechoCurto(x.texto, RE_CONC[c.id], LIM_TRECHO) });
      temas.set(c.id, e);
    }
  }
  const temasOrd = [...temas.entries()].sort((a, b) => (b[1].obras.size - a[1].obras.size) || (b[1].n - a[1].n));
  blocos.push({ algoritmo: 'temas-recorrentes', classe: 'tematica', titulo: 'Temas recorrentes em diferentes obras', natureza: 'documental',
    como: 'Conceitos do dicionário do NEXUS encontrados no texto dos trechos que tratam da passagem, contados por obra distinta.',
    itens: temasOrd.map(([cid, e]) => { const c = CONCEITOS.find((k) => k.id === cid); return { alvo: 'c:' + cid, rotulo: c.rotulo, detalhe: `${e.obras.size} obra(s) · ${e.n} trecho(s): ${[...e.obras].slice(0, 3).join('; ')}`, evidencias: e.ev }; }) });

  // 4) Relações lexicais: verbetes que citam a passagem e as passagens irmãs (citadas pelo mesmo verbete)
  const verb = new Map();
  for (const p of ponteiros) {
    if (!LEXICOS.has(p.fonte)) continue;
    const x = textos.get(p.banco + ':' + p.trecho);
    if (!x || !verbeteValido(x.secao)) continue;
    const k = p.fonte + ':' + x.secao;
    const e = verb.get(k) || { fonte: p.fonte, secao: x.secao, chaves: new Set(), ev: [] };
    e.chaves.add(p.banco + ':' + p.trecho);
    if (e.ev.length < 1) e.ev.push({ autor: x.autor, obra: obraNo(p.fonte, cat, x).rotulo, secao: x.secao, modo: modoRotulo(p.modo, fim > ini), trecho: trechoCurto(x.texto, alvoVersiculo(ini), LIM_TRECHO) });
    verb.set(k, e);
  }
  const lexItens = [];
  const ordemLex = { thayer: 0, kittel: 1, 'al-trench': 2 };
  for (const e of [...verb.values()].sort((a, b) => (ordemLex[a.fonte] ?? 3) - (ordemLex[b.fonte] ?? 3)).slice(0, 12)) {
    const irmas = new Map();
    for (const o of outras) {
      if (!e.chaves.has(o.banco + ':' + o.trecho) || (o.ini <= fim && o.fim >= ini)) continue;
      irmas.set(o.ini, (irmas.get(o.ini) || 0) + 1);
    }
    const lista = [...irmas.keys()].slice(0, 5).map((k) => passagemNo(k, k, null).rotulo);
    lexItens.push({ alvo: 'l:' + e.fonte + ':' + e.secao, rotulo: `${String(e.secao).slice(0, 50)} (${obraNo(e.fonte, cat, null).rotulo})`,
      detalhe: lista.length ? 'o mesmo verbete cita também: ' + lista.join(', ') : 'verbete que cita a passagem', evidencias: e.ev });
  }
  blocos.push({ algoritmo: 'relacoes-lexicais', classe: 'textual', titulo: 'Relações lexicais (léxicos e dicionários)', natureza: 'documental',
    como: 'Verbetes de Thayer, Kittel e Trench que citam a passagem, e as outras passagens citadas pelo mesmo verbete.', itens: lexItens });

  // 5) Conexões pouco evidentes, mas documentadas: co-citadas em ≥ 2 obras e AUSENTES das referências cruzadas
  const refSet = new Set(saida.map((x) => x.para_ini).concat(entrada.map((x) => x.de)));
  const ocultas = [...coPorPassagem.entries()].filter(([k, e]) => !refSet.has(k) && e.fontes.size >= 2)
    .sort((a, b) => (b[1].fontes.size - a[1].fontes.size) || (b[1].trechos.size - a[1].trechos.size)).slice(0, 10);
  const ocultasItens = [];
  for (const [k, e] of ocultas) {
    const ev = [];
    for (const ch of e.trechos) {
      const x = textos.get(ch);
      if (x && ev.length < 2) ev.push({ autor: x.autor, obra: obraNo(x.fonte, cat, x).rotulo, secao: x.secao || '', modo: 'cita as duas no mesmo trecho', trecho: trechoCurto(x.texto, alvoVersiculo(k), LIM_TRECHO) });
    }
    ocultasItens.push({ alvo: idP(k, k), rotulo: passagemNo(k, k, bib).rotulo, detalhe: `citadas juntas em ${e.trechos.size} trecho(s) de ${e.fontes.size} obra(s); não consta nas referências cruzadas`, texto: R.textoIntervalo(bib, k, k, 1), evidencias: ev });
  }
  blocos.push({ algoritmo: 'conexoes-pouco-evidentes', classe: 'hipotese', titulo: 'Conexões pouco evidentes, mas documentadas', natureza: 'hipotese',
    como: 'Passagens citadas no MESMO trecho que esta, por pelo menos 2 obras diferentes, e que NÃO estão nas referências cruzadas. O vínculo é documental; o sentido dele é hipótese a examinar.', itens: ocultasItens });

  // 6) Caminhos: da passagem até as que aparecem nas descobertas ou nas conexões ocultas, por referências cruzadas
  const caminhos = [];
  for (const it of ocultasItens.slice(0, 3)) {
    const alvoK = lerPassagemId(it.alvo).ini;
    const c = await caminho(db, ini, alvoK);
    if (c && c.length > 2) caminhos.push({ alvo: it.alvo, rotulo: c.map((k) => passagemNo(k, k, null).rotulo).join(' → '), detalhe: `${c.length - 1} passo(s) por referências cruzadas`, passos: c.map((k) => idP(k, k)) });
  }
  blocos.push({ algoritmo: 'caminhos', classe: 'hipotese', titulo: 'Caminhos entre passagens', natureza: 'interpretacao',
    como: 'Busca em largura nos dois sentidos sobre as referências cruzadas (até 3 níveis, 25 melhores por passagem), ligando o foco às conexões pouco evidentes.', itens: caminhos });

  // descobertas já registradas na Oficina
  const a = R.decompor(ini), z = R.decompor(fim);
  const desc = await descobertasQueCruzam(db, R.AB[a.b - 1], a.c, a.v, a.c === z.c ? z.v : 176);
  blocos.push({ algoritmo: 'descobertas-oficina', classe: 'inferencia', titulo: 'Descobertas já registradas na Oficina', natureza: 'inferencia_ia',
    como: 'Tabela oficina_descobertas (4 camadas). Escritas por IA; a fonte declarada vai junto. "conferir" = não verificada.',
    itens: desc.map((d) => ({ alvo: 'd:' + d.id, rotulo: d.titulo, detalhe: `camada ${d.camada} · fonte: ${d.fonte || '—'}`, natureza: naturezaDescoberta(d), evidencias: [{ autor: 'Oficina do RADAR', obra: 'descoberta', secao: d.fonte || '', modo: d.camada, trecho: String(d.explica || '').slice(0, LIM_TRECHO) }] })) });

  return { foco, blocos };
}

// ═══ EXPLICAR (a IA interpreta, citando as evidências por número) ══════════════════════════
async function explicar(db, ini, fim, bib) {
  const r = await descobrir(db, ini, fim, bib);
  const evid = [];
  for (const b of r.blocos) {
    for (const it of b.itens.slice(0, 5)) {
      for (const e of (it.evidencias || []).slice(0, 1)) {
        if (evid.length >= 24) break;
        evid.push({ n: evid.length + 1, bloco: b.titulo, natureza: b.classe || it.natureza || b.natureza, item: it.rotulo, detalhe: it.detalhe,
          autor: e.autor, obra: e.obra, secao: e.secao, trecho: String(e.trecho || '').slice(0, 260) });
      }
    }
  }
  if (!evid.length) return { texto: 'Não há evidências suficientes na biblioteca para esta passagem.', evidencias: [] };
  const sys = 'Você é o motor de descoberta do NEXUS BÍBLICO. Explique em português do Brasil, para um pesquisador, o que as evidências abaixo mostram sobre a passagem. REGRAS INEGOCIÁVEIS: (1) use SOMENTE as evidências fornecidas; não acrescente fatos, autores, datas ou citações de memória; (2) toda frase com afirmação deve terminar com a marca da evidência entre colchetes, por exemplo [E3] ou [E2][E7]; (3) diga a classe da relação conforme o campo entre parênteses: textual (citação comprovada no texto), documental (comentário dedicado), temática, interpretação (curadoria OpenBible), hipótese (cálculo do sistema) ou inferência (IA, não verificada); (4) trate co-citação como hipótese a examinar, nunca como fato; (5) se algo não tem evidência suficiente, diga isso; (6) no máximo 5 parágrafos curtos, sem títulos, sem listas.';
  const user = `Passagem: ${r.foco.rotulo} — "${r.foco.texto || ''}"\n\nEVIDÊNCIAS:\n` + evid.map((e) =>
    `[E${e.n}] (${e.natureza}) ${e.bloco} — ${e.item}${e.detalhe ? ' (' + e.detalhe + ')' : ''}. Fonte: ${e.autor || ''}, ${e.obra || ''}${e.secao ? ', ' + e.secao : ''}. Trecho: "${e.trecho}"`).join('\n');
  const { iaTexto } = await import('./ia.js');
  const rr = await iaTexto({ sys, user, temperature: 0.2, max_tokens: 1100, tag: 'nexus' });
  // Conferência: só ficam marcas que existem; parágrafo sem nenhuma marca válida é descartado.
  const validos = new Set(evid.map((e) => 'E' + e.n));
  const paragrafos = String(rr.texto || '').split(/\n\s*\n/).map((p) => p.replace(/\[(E\d+)\]/g, (m, k) => (validos.has(k) ? m : ''))).filter((p) => /\[E\d+\]/.test(p));
  const descartados = String(rr.texto || '').split(/\n\s*\n/).filter((p) => p.trim()).length - paragrafos.length;
  return { texto: paragrafos.join('\n\n') || 'A IA não conseguiu produzir uma explicação ancorada nas evidências. Veja os blocos do motor de descoberta.',
    evidencias: evid, descartados, modelo: rr.modelo || '', provedor: rr.provedorNome || rr.provedor || '' };
}

// ═══ INVESTIGAÇÕES SALVAS (banco próprio do NEXUS) ═══════════════════════════════════════
let TABELA_OK = false;
async function garantirTabela(db) {
  if (TABELA_OK) return true;
  if (!csN()) return false;
  await db.q('n', `create table if not exists nexus_investigacoes (
      id bigserial primary key,
      dono text not null,
      titulo text not null,
      foco text,
      estado jsonb not null,
      criado_em timestamptz not null default now(),
      atualizado_em timestamptz not null default now())`);
  await db.q('n', 'create index if not exists nexus_investigacoes_dono on nexus_investigacoes (dono, atualizado_em desc)');
  TABELA_OK = true;
  return true;
}
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
function donoDe(b) {
  // Quem entrou pelo PIN é a mesma pessoa em qualquer aparelho (a investigação acompanha); crachá é por aparelho.
  if (/^[0-9a-f]{64}$/.test(String(b.token || ''))) return 'pin:' + sha('nexus|' + b.token).slice(0, 24);
  return 'cr:' + sha('nexus|' + b.cracha).slice(0, 24);
}

// ═══ ROTA ═════════════════════════════════════════════════════════════════════════════
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  if (Buffer.isBuffer(b)) { try { b = JSON.parse(b.toString('utf8')); } catch (_) { b = {}; } }
  b = b || {};
  const acao = String(b.acao || '');

  let aberto = false;
  try { aberto = await liberado(b.cracha, b.token); } catch (_) { aberto = false; }

  const host = req.headers['x-forwarded-host'] || req.headers.host || 'radar-atual.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || (/^(localhost|127\.)/.test(host) ? 'http' : 'https');
  const db = bancos();
  try {
    if (acao === 'resolver') {            // texto livre ("João 1:1", "Jo 1.1-3") -> id de passagem
      const bib = await carregarBiblia(proto + '://' + host);
      const r = bib && R.achar(' ' + String(b.ref || '').slice(0, 80), bib)[0];
      if (!r) { res.json({ ok: false, err: 'referência não reconhecida (ex.: João 1:1)' }); return; }
      res.json({ ok: true, id: idP(R.chave(r.b, r.cap, r.v1), R.chave(r.b, r.cap, r.v2)), aberto });
      return;
    }
    if (acao === 'expandir') {
      const bib = await carregarBiblia(proto + '://' + host);
      const id = String(b.id || '');
      const p = lerPassagemId(id);
      if (!p && !aberto) { res.json({ ok: false, motivo: 'particular', err: 'Esta parte do mapa usa os livros da biblioteca: entre com o PIN.' }); return; }
      const ctx = id.startsWith('o:') && Array.isArray(b.contexto) ? b.contexto.slice(0, 12) : [];
      const chave = ['expandir', id, aberto ? 1 : 0, ctx.join(',')].join('|');
      let saida = lembrar(chave);
      if (!saida) {
        const g = grafo();
        if (p) await expandirPassagem(db, g, p.ini, p.fim, bib, aberto);
        else if (id.startsWith('o:')) await expandirObra(db, g, id.slice(2), ctx, bib);
        else if (id.startsWith('a:')) await expandirAutor(db, g, String(b.rotulo || id.slice(2)));
        else if (id.startsWith('c:')) await expandirConceito(db, g, id.slice(2), bib);
        else if (id.startsWith('l:')) { const [, fonte, ...resto] = id.split(':'); await expandirVerbete(db, g, fonte, resto.join(':'), bib); }
        else if (id.startsWith('d:')) await expandirDescoberta(db, g, +id.slice(2), bib);
        else { res.json({ ok: false, err: 'nó desconhecido' }); return; }
        saida = guardar(chave, g.saida());
      }
      const limite = Math.max(10, Math.min(400, +b.limite || 0)) || 0;
      const cortado = aparar(saida, id, b.limite ? limite : 0, b.so ? String(b.so) : '');
      res.json({ ok: true, aberto, ...cortado, total: saida.nos.length, credito: CREDITO_OB });
      return;
    }
    if (acao === 'caminho') {
      // Caminho entre QUAISQUER dois elementos: cada ponta vira o conjunto de passagens que ela documenta
      // (conceito -> passagens onde aparece; obra -> passagens que comenta; verbete -> passagens que cita).
      const bib = await carregarBiblia(proto + '://' + host);
      const deId = String(b.de || ''), paraId = String(b.para || '');
      if ((!lerPassagemId(deId) || !lerPassagemId(paraId)) && !aberto) { res.json({ ok: false, motivo: 'particular', err: 'Caminhos com conceitos, obras e verbetes usam a biblioteca: entre com o PIN.' }); return; }
      const ponta = async (id) => {
        const p = lerPassagemId(id);
        if (p) return { chaves: [p.ini], ligacoes: new Map() };
        const g = grafo();
        if (id.startsWith('c:')) await expandirConceito(db, g, id.slice(2), bib);
        else if (id.startsWith('o:')) await expandirObra(db, g, id.slice(2), [], bib);
        else if (id.startsWith('l:')) { const [, fonte, ...resto] = id.split(':'); await expandirVerbete(db, g, fonte, resto.join(':'), bib); }
        else if (id.startsWith('d:')) await expandirDescoberta(db, g, +id.slice(2), bib);
        const s = g.saida();
        const ligacoes = new Map();
        for (const a of s.arestas) {
          const outro = a.de === id ? a.para : a.para === id ? a.de : null;
          const pp = outro && lerPassagemId(outro);
          if (pp && !ligacoes.has(pp.ini)) ligacoes.set(pp.ini, a);
        }
        return { chaves: [...ligacoes.keys()].slice(0, 12), ligacoes };
      };
      const [A, Z] = await Promise.all([ponta(deId), ponta(paraId)]);
      if (!A.chaves.length || !Z.chaves.length) { res.json({ ok: true, passos: [], nos: [], arestas: [], aviso: 'Uma das pontas não tem passagens documentadas para começar o caminho.' }); return; }
      const c = await caminho(db, A.chaves, Z.chaves);
      if (!c) { res.json({ ok: true, passos: [], nos: [], arestas: [], aviso: 'Nenhum caminho curto (até 4 passos) pelas fontes atuais.' }); return; }
      const g = grafo();
      for (let i = 0; i < c.length; i++) {
        g.no(passagemNo(c[i], c[i], bib));
        if (i) g.aresta({ de: idP(c[i - 1], c[i - 1]), para: idP(c[i], c[i]), tipo: 'caminho', natureza: 'interpretacao', classe: 'interpretacao', peso: 1, explica: 'Passo do caminho: referência cruzada OpenBible (em qualquer sentido).', credito: CREDITO_OB });
      }
      const passos = c.map((k) => idP(k, k));
      const pontaAresta = (id, k, ida, lig) => {
        if (lerPassagemId(id)) return;
        const a = lig.get(k);
        g.aresta({ de: ida ? id : idP(k, k), para: ida ? idP(k, k) : id, tipo: a ? a.tipo : 'mencao', natureza: a ? a.natureza : 'documental', classe: a ? a.classe : 'tematica', peso: 1,
          explica: (a && a.explica) || 'Ligação documentada da ponta do caminho.', evidencias: a && a.evidencias });
      };
      pontaAresta(deId, c[0], true, A.ligacoes);
      pontaAresta(paraId, c[c.length - 1], false, Z.ligacoes);
      res.json({ ok: true, passos: [lerPassagemId(deId) ? null : deId, ...passos, lerPassagemId(paraId) ? null : paraId].filter(Boolean), ...g.saida() });
      return;
    }
    if (!aberto) { res.json({ ok: false, motivo: 'particular', err: 'Entre com o PIN para usar esta parte do NEXUS.' }); return; }
    if (acao === 'descobrir' || acao === 'explicar') {
      const bib = await carregarBiblia(proto + '://' + host);
      const p = lerPassagemId(b.id);
      if (!p) { res.json({ ok: false, err: 'escolha uma passagem' }); return; }
      const chaveD = acao + '|' + b.id;
      const r = lembrar(chaveD) || guardar(chaveD, acao === 'descobrir' ? await descobrir(db, p.ini, p.fim, bib) : await explicar(db, p.ini, p.fim, bib));
      res.json({ ok: true, ...r });
      return;
    }
    if (['salvar', 'listar', 'abrir', 'apagar'].includes(acao)) {
      if (!(await garantirTabela(db).catch(() => false))) { res.json({ ok: false, motivo: 'sem-banco', err: 'O banco do NEXUS ainda não está ligado; a investigação fica salva só neste aparelho.' }); return; }
      const dono = donoDe(b);
      if (acao === 'listar') {
        const linhas = await db.q('n', 'select id, titulo, foco, atualizado_em from nexus_investigacoes where dono = $1 order by atualizado_em desc limit 50', [dono]);
        res.json({ ok: true, investigacoes: linhas });
      } else if (acao === 'abrir') {
        const l = (await db.q('n', 'select id, titulo, foco, estado, atualizado_em from nexus_investigacoes where dono = $1 and id = $2', [dono, +b.investigacao || 0]))[0];
        res.json(l ? { ok: true, investigacao: l } : { ok: false, err: 'não encontrada' });
      } else if (acao === 'apagar') {
        await db.q('n', 'delete from nexus_investigacoes where dono = $1 and id = $2', [dono, +b.investigacao || 0]);
        res.json({ ok: true });
      } else {
        const estado = b.estado && typeof b.estado === 'object' ? b.estado : null;
        const json = JSON.stringify(estado || {});
        if (!estado || json.length > 300000) { res.json({ ok: false, err: 'investigação vazia ou grande demais' }); return; }
        const titulo = String(b.titulo || 'Investigação').slice(0, 120);
        const foco = String(b.foco || '').slice(0, 40);
        let linha;
        if (+b.investigacao) linha = (await db.q('n', 'update nexus_investigacoes set titulo=$3, foco=$4, estado=$5, atualizado_em=now() where dono=$1 and id=$2 returning id, atualizado_em', [dono, +b.investigacao, titulo, foco, json]))[0];
        if (!linha) linha = (await db.q('n', 'insert into nexus_investigacoes (dono, titulo, foco, estado) values ($1,$2,$3,$4) returning id, atualizado_em', [dono, titulo, foco, json]))[0];
        res.json({ ok: true, investigacao: linha });
      }
      return;
    }
    res.status(400).json({ ok: false, err: 'ação desconhecida' });
  } catch (e) {
    res.status(200).json({ ok: false, err: String((e && e.message) || e).slice(0, 160) });
  } finally {
    await db.fechar();
  }
};

module.exports.CONCEITOS = CONCEITOS;
