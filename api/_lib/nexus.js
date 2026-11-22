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
//   conversar { mensagens:[{papel,texto}], contexto? } -> { texto }  barra lateral 'Pergunte ao Claude' (com a porta)
//   preparar { tipo, tema, publico?, duracao?, obs?, dossie } -> { texto }  barra 'Preparar' (sermão/pregação/mensagem/estudo; com a porta)
//   ponteiros-obra { modo: migrar|simular|gravar|reverter|estado, lote? , lote_id? }  (administrativo, com a porta)
//             ponteiros de obras externas (só localizadores; ver api/_lib/nexus-ponteiros.js)
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
const IA = require('./nexus-ia.js');
const ENT = require('./nexus-entidades.js');
const PONT = require('./nexus-ponteiros.js');

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
    temNexus() { return !!csN(); },
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

function localDe(x, chave) {
  const pag = /\bp\.\s?(\d{1,4})/.exec(String(x.secao || ''));
  return { fonte: x.fonte, pagina: pag ? +pag[1] : null, trechoId: chave || null };
}
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
function classeDe(a) {   // compatibilidade com a V2 (cor/filtro antigos)
  return a.classe || ({ cita: 'textual', lexical: 'textual', comenta: 'documental', escreveu: 'documental', contem: 'documental', mencao: 'tematica', refcruz: 'interpretacao', 'co-citacao': 'hipotese', caminho: 'hipotese', descoberta: 'inferencia' }[a.tipo]) || 'documental';
}

// ── MODELO DE EVIDÊNCIAS EM 3 DIMENSÕES (diretriz do arquiteto, 19/11/2026) ───────────────────
// Uma relação NÃO tem uma "classe" só. Ela tem:
//   natRel  — NATUREZA da relação: textual · documental · tematica · historica · lexical · interpretativa
//   estado  — ESTADO epistemológico: direta · corroboracao · interpretacao · hipotese · inferencia
//   metodo  — MÉTODO de identificação: referencia_cruzada · citacao_literal · co_citacao · correspondencia_lexical ·
//             associacao_tematica · caminho_grafo · identificacao_documental · analise_ia
// Quantidade de fontes ≠ independência: contam-se AUTORES independentes (a série Cambridge vale 1; o mesmo autor
// em duas obras vale 1). Pontuação algorítmica (votos, pesos) nunca promove o estado epistemológico.
const HISTORICAS = new Set(['historia', 'contexto-judaico', 'judaica']);
function familiaDe(e) {
  const f = String(e.fonte || ''), au = String(e.autor || '').trim().toLowerCase();
  if (f === 'al-cambridge' || /cambridge/.test(au)) return 'serie:cambridge';
  return au || ('fonte:' + f);
}
function classificar(a, independentes) {
  const t = a.tipo;
  const metodo = a.metodo || ({ refcruz: 'referencia_cruzada', 'co-citacao': 'co_citacao', caminho: 'caminho_grafo', lexical: 'correspondencia_lexical', mencao: 'associacao_tematica', descoberta: 'analise_ia' }[t]) || 'identificacao_documental';
  let natRel = a.natRel;
  if (!natRel) {
    if (t === 'refcruz' || t === 'caminho' || t === 'co-citacao') natRel = 'interpretativa';
    else if (t === 'lexical') natRel = 'lexical';
    else if (t === 'mencao') natRel = 'tematica';
    else if (t === 'descoberta') natRel = ({ original: 'lexical', ecos: 'textual', estrutura: 'textual', contexto: 'historica' })[a.camada] || 'interpretativa';
    else if ((t === 'cita' || t === 'comenta') && HISTORICAS.has(a.catObra)) natRel = 'historica';
    else if (t === 'cita' || t === 'cita-lxx') natRel = 'textual';
    else natRel = 'documental';
  }
  let estado = a.estado;
  if (!estado) {
    if (t === 'refcruz') estado = 'interpretacao';
    else if (t === 'caminho' || t === 'co-citacao') estado = 'hipotese';
    else if (t === 'descoberta') estado = 'inferencia';
    else if (t === 'mencao') estado = independentes >= 3 ? 'corroboracao' : 'interpretacao';
    else estado = 'direta';
  }
  return { natRel, estado, metodo };
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
        for (const f of (a.familias || []).concat((a.evidencias || []).map(familiaDe))) ja._fam.add(f);
        ja.peso = (ja.peso || 1) + (a.peso || 1);
        if (a.evidencias) ja.evidencias = (ja.evidencias || []).concat(a.evidencias).slice(0, 4);
        return id;
      }
      arestas.set(id, { id, ...a, classe: classeDe(a), _fam: new Set((a.familias || []).concat((a.evidencias || []).map(familiaDe))) });
      return id;
    },
    saida() {
      return { nos: [...nos.values()], arestas: [...arestas.values()].map(({ _fam, familias, ...a }) => {
        const independentes = a.semGrau ? 0 : (_fam ? _fam.size : 0);   // remissão de léxico não conta como autor independente
        return { ...a, ...classificar(a, independentes), independentes, direcao: a.tipo === 'refcruz' ? 'dirigida (curadoria)' : (a.tipo === 'caminho' || a.tipo === 'co-citacao') ? 'não dirigida' : 'dirigida' };
      }) };
    },
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

// Citação patrística: as edições da Paulus escrevem "Jo 1,1" (vírgula). A Oficina só lê "Jo 1:1"/"Jo 1.1", por isso
// a patrística e Eusébio têm 0 ponteiros lá. Aqui a busca é feita na hora, só nessas obras, e conferida em JS
// (para "Jo 1,1" não casar com "1Jo 1,1"). Salmos: as edições patrísticas costumam seguir a numeração da LXX/Vulgata.
const PAULUS = { gn: 'Gn', ex: 'Ex', lv: 'Lv', nm: 'Nm', dt: 'Dt', js: 'Js', jz: 'Jz', rt: 'Rt', '1sm': '1 ?Sm', '2sm': '2 ?Sm', '1rs': '1 ?Rs', '2rs': '2 ?Rs',
  '1cr': '1 ?Cr', '2cr': '2 ?Cr', ed: 'Esd', ne: 'Ne', et: 'Est', 'jó': 'Jó', sl: 'Sl', pv: 'Pr|Pv', ec: 'Ecl?', ct: 'Ct', is: 'Is', jr: 'Jr', lm: 'Lm',
  ez: 'Ez', dn: 'Dn', os: 'Os', jl: 'Jl', am: 'Am', ob: 'Ab|Ob', jn: 'Jn', mq: 'Mq', na: 'Na', hc: 'Hab|Hc', sf: 'Sf', ag: 'Ag', zc: 'Zc', ml: 'Ml',
  mt: 'Mt', mc: 'Mc', lc: 'Lc', jo: 'Jo', atos: 'At', rm: 'Rm', '1co': '1 ?Cor?', '2co': '2 ?Cor?', gl: 'Gl', ef: 'Ef', fp: 'Fl|Fp', cl: 'Cl',
  '1ts': '1 ?Ts', '2ts': '2 ?Ts', '1tm': '1 ?Tm', '2tm': '2 ?Tm', tt: 'Tt', fm: 'Fm', hb: 'Hb', tg: 'Tg', '1pe': '1 ?Pd|1 ?Pe', '2pe': '2 ?Pd|2 ?Pe',
  '1jo': '1 ?Jo', '2jo': '2 ?Jo', '3jo': '3 ?Jo', jd: 'Jd', ap: 'Ap' };
const FONTES_PATRISTICAS = "(fonte like 'pat-%' or fonte = 'eusebio-historia')";
// Os volumes da patrística são EDIÇÕES MODERNAS: trazem introdução, notas e comentários do editor junto com o texto
// do Padre. Até a indexação separar as duas camadas, toda evidência desses volumes leva aviso; quando o trecho tem
// sinais claros de aparato editorial (nota numerada, data "d.C.", estudioso moderno, título de introdução), o aviso
// diz que provavelmente é o editor, e não o Padre.
const SINAIS_EDITOR = /\[\d{1,3}\]|\bd\.\s?C\.|\bIntrodu[çc][ãa]o\b|\bApresenta[çc][ãa]o\b|\bNotas?\b|\bcf\.\s|\bDodd\b|\bHarnack\b|\bQuasten\b|\bséc(ulo)?\.?\s?[IVX]+\b/;
function avisoPatristico(x) {
  const t = String(x.texto || '') + ' ' + String(x.secao || '');
  return SINAIS_EDITOR.test(t)
    ? 'Provável texto do EDITOR moderno (introdução/notas), não do próprio autor antigo. Conferir no livro antes de atribuir.'
    : 'Edição moderna: o trecho pode conter texto do editor junto com o do autor antigo. Conferir no livro antes de atribuir.';
}
// Salmos: a numeração da LXX/Vulgata é um a menos que a hebraica em Sl 10–113 e 117–146 (hebraico).
function salmoLXX(cap) { return (cap >= 11 && cap <= 113) || (cap >= 117 && cap <= 146) ? cap - 1 : null; }

async function citacoesPatristicas(db, ini, excluir) {
  const a = R.decompor(ini), ab = R.AB[a.b - 1], abr = PAULUS[ab];
  if (!abr) return { achados: [] };
  const lxxCap = ab === 'sl' ? salmoLXX(a.c) : null;
  const avisoSl = ab === 'sl' ? `Salmos: as edições patrísticas costumam usar a numeração da LXX/Vulgata${lxxCap ? ` (Sl ${a.c} hebraico = Sl ${lxxCap} LXX)` : ''}. Citações achadas pela numeração LXX ficam como hipótese.` : '';
  // 1) o índice do NEXUS (montado uma vez; ponteiros com camada autor/editor)
  if (await indicePronto(db)) {
    const refs = await db.q('n', `select banco, trecho, marca, pagina, camada, salmo_num, salmo_base, salmo_nota,
          case when salmo_num = 'lxx' then (ini_lxx <= $1 and fim_lxx >= $1)
               when salmo_num = 'hebraica' then (ini <= $1 and fim >= $1)
               else (ini <= $1 and fim >= $1) end as confirmado,
          (coalesce(salmo_num,'') not in ('lxx','hebraica') and ini_lxx <= $1 and fim_lxx >= $1 and not (ini <= $1 and fim >= $1)) as por_lxx
        from nexus_refs where ((ini <= $1 and fim >= $1) and coalesce(salmo_num,'') <> 'lxx') or (ini_lxx <= $1 and fim_lxx >= $1 and coalesce(salmo_num,'') <> 'hebraica') limit 80`, [ini]).catch(() => null);
    if (refs) {
      const ids = [...new Set(refs.map((r) => r.trecho))];
      const textos = ids.length ? await db.q(2, 'select id, fonte, autor, obra, secao, tipo, texto from biblioteca_trechos where id = any($1)', [ids]).catch(() => []) : [];
      const porId = new Map(textos.map((x) => [x.id, x]));
      const achados = [], vistos = new Set();
      for (const r of refs) {
        const x = porId.get(r.trecho), chave = '2:' + r.trecho;
        if (!x || vistos.has(chave) || (excluir && excluir.has(chave))) continue;
        vistos.add(chave);
        const re = new RegExp(r.marca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s?'));
        achados.push({ ...x, chave, marca: r.marca, re, lxx: !!r.por_lxx, camada: r.camada, salmo: r.salmo_num ? { num: r.salmo_num, base: r.salmo_base, nota: r.salmo_nota } : null,
          avisoEd: r.camada === 'editor_provavel' ? 'Provável texto do EDITOR moderno (introdução/notas), não do próprio autor antigo. Conferir no livro antes de atribuir.' : 'Edição moderna: o trecho pode conter texto do editor junto com o do autor antigo. Conferir no livro antes de atribuir.' });
      }
      return { achados, aviso: avisoSl, pelo: 'indice' };
    }
  }
  // 2) reserva: busca ao vivo
  const caps = [{ cap: a.c, lxx: false }];
  const lxx = ab === 'sl' ? salmoLXX(a.c) : null;
  if (lxx) caps.push({ cap: lxx, lxx: true });
  const achados = [], vistos = new Set();
  for (const { cap, lxx: ehLxx } of caps) {
    const pg = `(^|[^0-9A-Za-zÀ-ÿ])(${abr}) ?${cap}, ?${a.v}([^0-9]|$)`;
    const re = new RegExp(`(?<![0-9]\\s?)(?<![0-9A-Za-zÀ-ÿ])(?:${abr}) ?${cap}, ?${a.v}(?![0-9])`);
    const linhas = await db.q(2, `select id, fonte, autor, obra, secao, tipo, texto from biblioteca_trechos where ${FONTES_PATRISTICAS} and texto ~ $1 limit 60`, [pg]).catch(() => []);
    for (const x of linhas) {
      const chave = '2:' + x.id;
      if ((excluir && excluir.has(chave)) || vistos.has(chave)) continue;
      const m = re.exec(String(x.texto || ''));
      if (!m) continue;                       // "1Jo 1,1" não vale como "Jo 1,1"
      vistos.add(chave);
      achados.push({ ...x, chave, marca: m[0].trim(), re, lxx: ehLxx, avisoEd: avisoPatristico(x) });
    }
  }
  return { achados, aviso: avisoSl, pelo: 'ao-vivo' };
}

// ═══ ÍNDICE PATRÍSTICO (banco do NEXUS; autorizado pelo Elias em 19/11/2026) ═══════════════════
// Só PONTEIROS: banco, trecho, versículo(s) como escrito, conversão LXX→hebraico nos Salmos, marca encontrada,
// página e camada. O texto continua só nos bancos da biblioteca (lido, nunca copiado).
// Camada: 'editor_provavel' quando o trecho tem sinais de aparato editorial; senão 'nao_classificado'.
// Nenhum trecho é marcado como "do autor antigo" automaticamente: isso exige conferência.
const TOKENS_LIVRO = { gn: 'gn', ex: 'ex', lv: 'lv', nm: 'nm', dt: 'dt', js: 'js', jz: 'jz', rt: 'rt', '1sm': '1sm', '2sm': '2sm', '1rs': '1rs', '2rs': '2rs',
  '1cr': '1cr', '2cr': '2cr', esd: 'ed', ne: 'ne', est: 'et', 'jó': 'jó', sl: 'sl', pr: 'pv', pv: 'pv', ecl: 'ec', ec: 'ec', ct: 'ct', is: 'is', jr: 'jr',
  lm: 'lm', ez: 'ez', dn: 'dn', os: 'os', jl: 'jl', am: 'am', ab: 'ob', ob: 'ob', jn: 'jn', mq: 'mq', na: 'na', hab: 'hc', hc: 'hc', sf: 'sf', ag: 'ag',
  zc: 'zc', ml: 'ml', mt: 'mt', mc: 'mc', lc: 'lc', jo: 'jo', at: 'atos', rm: 'rm', '1cor': '1co', '1co': '1co', '2cor': '2co', '2co': '2co', gl: 'gl',
  ef: 'ef', fl: 'fp', fp: 'fp', cl: 'cl', '1ts': '1ts', '2ts': '2ts', '1tm': '1tm', '2tm': '2tm', tt: 'tt', fm: 'fm', hb: 'hb', tg: 'tg',
  '1pd': '1pe', '1pe': '1pe', '2pd': '2pe', '2pe': '2pe', '1jo': '1jo', '2jo': '2jo', '3jo': '3jo', jd: 'jd', ap: 'ap' };
const DEUTERO = new Set(['tb', 'jt', '1mc', '2mc', 'sb', 'eclo', 'br']);
const RE_REF_PAT = /(?<![0-9A-Za-zÀ-ÿ])([123] ?)?([A-ZÁÉÍÓÚ][a-záéíóú]{0,3})\.? ?(\d{1,3}), ?(\d{1,3})(?:\s?[-–]\s?(\d{1,3}))?(?![0-9])/g;
let INDICE_OK = false;
async function tabelasIndice(db) {
  if (!db.temNexus()) return false;
  await db.q('n', `create table if not exists nexus_refs (
      id bigserial primary key, banco smallint not null, trecho bigint not null, fonte text not null, autor text,
      ini int not null, fim int not null, ini_lxx int, fim_lxx int, marca text not null, pagina int,
      camada text not null default 'nao_classificado', salmo_num text, salmo_base text, salmo_nota text, criado_em timestamptz not null default now(),
      unique (banco, trecho, ini, fim, marca))`);
  await db.q('n', `alter table nexus_refs add column if not exists salmo_num text`);
  await db.q('n', `alter table nexus_refs add column if not exists salmo_base text`);
  await db.q('n', `alter table nexus_refs add column if not exists salmo_nota text`);
  await db.q('n', 'create index if not exists nexus_refs_ini on nexus_refs (ini)');
  await db.q('n', 'create index if not exists nexus_refs_lxx on nexus_refs (ini_lxx)');
  await db.q('n', `create table if not exists nexus_indice_estado (nome text primary key, ultimo_id bigint not null default 0, lidos int not null default 0,
      refs int not null default 0, fora_canon int not null default 0, invalidas int not null default 0, total int, feito boolean not null default false, atualizado_em timestamptz not null default now())`);
  await db.q('n', `alter table nexus_indice_estado add column if not exists versao int not null default 1`);
  await db.q('n', `create table if not exists nexus_edicoes (fonte text primary key, numeracao_salmos text not null, decididas int not null, lxx int not null, hebraica int not null, metodo text not null, atualizado_em timestamptz not null default now())`);
  return true;
}
async function indicePronto(db) {
  if (INDICE_OK) return true;
  if (!db.temNexus()) return false;
  const e = (await db.q('n', `select feito from nexus_indice_estado where nome = 'patristica'`).catch(() => []))[0];
  if (e && e.feito) INDICE_OK = true;
  return INDICE_OK;
}
// NUMERAÇÃO DOS SALMOS DECIDIDA PELO CONTEXTO (ciclo 3). Para cada "Sl c,v" compara as palavras em volta da citação
// com o texto da Almeida do Salmo como escrito (numeração hebraica) e do Salmo convertido da LXX/Vulgata (c+1, com
// tolerância de 1 versículo pelo título). Só decide com folga de 2 palavras; senão fica "indefinida". Depois, cada obra
// recebe um perfil (≥ 80% de decisões iguais, mínimo 10) que vale para as indefinidas, marcado como "perfil da obra".
const VERSAO_INDICE = 2;
const sem = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const PARADAS_SL = new Set('para pois porque como quando entao assim sobre entre pelos pelas este esta isto esse essa isso aquele aquela todos todas tudo nada mais menos muito muita seus suas teus tuas meus minhas nosso nossa vosso vossa seja sejam sera serao estar sido tendo dele dela deles delas nele nela onde qual quais quem cujo cuja ainda tambem mesmo mesma outro outra outros outras sempre senhor deus'.split(' '));
const palavrasDe = (t) => new Set((sem(t).match(/[a-z]{4,}/g) || []).filter((w) => !PARADAS_SL.has(w)));
function lxxParaHebraico(c) { return (c >= 10 && c <= 112) || (c >= 116 && c <= 145) ? c + 1 : null; }
function decidirSalmo(bib, texto, pos, c, v) {
  const ctx = palavrasDe(texto.slice(Math.max(0, pos - 260), pos + 40));
  const nota = (cc, vv) => { const t = bib.sl && bib.sl[cc - 1] && bib.sl[cc - 1][vv - 1]; if (!t) return -1; let n = 0; for (const w of palavrasDe(t)) if (ctx.has(w)) n++; return n; };
  const h = nota(c, v);
  const hc = lxxParaHebraico(c);
  const l = hc ? Math.max(nota(hc, v), nota(hc, v - 1)) : -1;
  const lv = hc ? (nota(hc, v) >= nota(hc, v - 1) ? v : v - 1) : null;
  if (l >= 2 && l >= h + 2) return { num: 'lxx', cap: hc, vers: lv, nota: `contexto: ${l} palavras do Sl ${hc}:${lv} (Almeida) contra ${Math.max(h, 0)} do Sl ${c}:${v}` };
  if (h >= 2 && h >= l + 2) return { num: 'hebraica', cap: c, vers: v, nota: `contexto: ${h} palavras do Sl ${c}:${v} (Almeida) contra ${Math.max(l, 0)} da conversão LXX` };
  return { num: 'indefinida', cap: c, vers: v, nota: 'contexto insuficiente para decidir a numeração' };
}

function extrairRefsPatristicas(texto, bib) {
  const out = [];
  let fora = 0, invalidas = 0;
  RE_REF_PAT.lastIndex = 0;
  for (let m; (m = RE_REF_PAT.exec(texto));) {
    const tok = ((m[1] || '').replace(/\s/g, '') + m[2]).toLowerCase();
    if (DEUTERO.has(tok)) { fora++; continue; }
    const ab = TOKENS_LIVRO[tok];
    if (!ab) continue;                                   // não é abreviação de livro (ex.: "Art 3,2")
    const b = R.IDX_AB[ab], c = +m[3], v1 = +m[4], v2 = m[5] ? +m[5] : v1;
    if (!R.existe(bib, b, c, v1)) {
      // Salmo que só existe na numeração hebraica convertida? então guarda pela LXX
      const lx = ab === 'sl' && (c >= 10 && c <= 145) ? c + 1 : null;
      if (!(lx && R.existe(bib, b, lx, v1))) { invalidas++; continue; }
    }
    const fimV = v2 >= v1 && R.existe(bib, b, c, v2) ? v2 : v1;
    let iniL = null, fimL = null, sl = null;
    if (ab === 'sl') {
      const h = lxxParaHebraico(c);
      if (h && R.existe(bib, b, h, v1)) { iniL = R.chave(b, h, v1); fimL = R.chave(b, h, R.existe(bib, b, h, fimV) ? fimV : v1); }
      sl = decidirSalmo(bib, texto, m.index, c, v1);
      if (sl.num === 'lxx' && sl.vers !== v1 && R.existe(bib, b, sl.cap, sl.vers)) { iniL = R.chave(b, sl.cap, sl.vers); fimL = iniL; }
    }
    out.push({ ini: R.chave(b, c, v1), fim: R.chave(b, c, fimV), iniL, fimL, marca: m[0].trim(), sl });
  }
  return { refs: out, fora, invalidas };
}
async function indexarPatristica(db, bib, lote) {
  if (!(await tabelasIndice(db))) return { ok: false, err: 'banco do NEXUS não ligado' };
  let est = (await db.q('n', `select * from nexus_indice_estado where nome = 'patristica'`))[0];
  if (!est) {
    const tot = (await db.q(2, `select count(*)::int n from biblioteca_trechos where ${FONTES_PATRISTICAS}`))[0].n;
    await db.q('n', `insert into nexus_indice_estado (nome, total) values ('patristica', $1) on conflict do nothing`, [tot]);
    est = (await db.q('n', `select * from nexus_indice_estado where nome = 'patristica'`))[0];
  }
  if ((est.versao || 1) < VERSAO_INDICE) {
    // índice de versão antiga: refaz do zero (são dados derivados do próprio NEXUS; a biblioteca não é tocada)
    await db.q('n', 'delete from nexus_refs');
    await db.q('n', `update nexus_indice_estado set ultimo_id = 0, lidos = 0, refs = 0, fora_canon = 0, invalidas = 0, feito = false, versao = $1, atualizado_em = now() where nome = 'patristica'`, [VERSAO_INDICE]);
    INDICE_OK = false;
    est = (await db.q('n', `select * from nexus_indice_estado where nome = 'patristica'`))[0];
  }
  if (est.feito) return { ok: true, ...est };
  const linhas = await db.q(2, `select id, fonte, autor, secao, texto from biblioteca_trechos where ${FONTES_PATRISTICAS} and id > $1 order by id limit $2`, [est.ultimo_id, lote]);
  let refs = 0, fora = 0, invalidas = 0;
  const valores = [];
  for (const x of linhas) {
    const r = extrairRefsPatristicas(String(x.texto || ''), bib);
    fora += r.fora; invalidas += r.invalidas;
    const pag = /\bp\.\s?(\d{1,4})/.exec(String(x.secao || ''));
    const camada = SINAIS_EDITOR.test(String(x.texto || '') + ' ' + String(x.secao || '')) ? 'editor_provavel' : 'nao_classificado';
    for (const f of r.refs) { valores.push([2, x.id, x.fonte, x.autor, f.ini, f.fim, f.iniL, f.fimL, f.marca.slice(0, 40), pag ? +pag[1] : null, camada, f.sl ? f.sl.num : null, f.sl && f.sl.num !== 'indefinida' ? 'contexto' : null, f.sl ? f.sl.nota : null]); refs++; }
  }
  for (let i = 0; i < valores.length; i += 400) {
    const parte = valores.slice(i, i + 400);
    const ph = parte.map((_, k) => '(' + Array.from({ length: 14 }, (_, j) => '$' + (k * 14 + j + 1)).join(',') + ')').join(',');
    await db.q('n', `insert into nexus_refs (banco, trecho, fonte, autor, ini, fim, ini_lxx, fim_lxx, marca, pagina, camada, salmo_num, salmo_base, salmo_nota) values ${ph} on conflict do nothing`, parte.flat());
  }
  const ultimo = linhas.length ? linhas[linhas.length - 1].id : est.ultimo_id;
  const feito = linhas.length < lote;
  await db.q('n', `update nexus_indice_estado set ultimo_id = $1, lidos = lidos + $2, refs = refs + $3, fora_canon = fora_canon + $4, invalidas = invalidas + $5, feito = $6, atualizado_em = now() where nome = 'patristica'`,
    [ultimo, linhas.length, refs, fora, invalidas, feito]);
  if (feito) {
    // perfil de numeração dos Salmos por obra (só onde a evidência é forte) e aplicação às indefinidas
    const perf = await db.q('n', `select fonte, sum((salmo_num='lxx')::int)::int lxx, sum((salmo_num='hebraica')::int)::int heb from nexus_refs where salmo_num in ('lxx','hebraica') group by 1`);
    for (const f of perf) {
      const tot = f.lxx + f.heb;
      const num = tot >= 10 && f.lxx / tot >= 0.8 ? 'lxx' : tot >= 10 && f.heb / tot >= 0.8 ? 'hebraica' : 'mista_ou_incerta';
      await db.q('n', `insert into nexus_edicoes (fonte, numeracao_salmos, decididas, lxx, hebraica, metodo) values ($1,$2,$3,$4,$5,'contexto das citações (palavras do versículo)')
        on conflict (fonte) do update set numeracao_salmos = excluded.numeracao_salmos, decididas = excluded.decididas, lxx = excluded.lxx, hebraica = excluded.hebraica, atualizado_em = now()`, [f.fonte, num, tot, f.lxx, f.heb]);
      if (num === 'lxx' || num === 'hebraica') await db.q('n', `update nexus_refs set salmo_num = $2, salmo_base = 'perfil_da_obra', salmo_nota = $3 where fonte = $1 and salmo_num = 'indefinida'`, [f.fonte, num, `perfil da obra: ${num === 'lxx' ? f.lxx : f.heb} de ${tot} citações decididas pelo contexto usam a numeração ${num === 'lxx' ? 'LXX/Vulgata' : 'hebraica'}`]);
    }
    INDICE_OK = true;
  }
  return { ok: true, ...(await db.q('n', `select * from nexus_indice_estado where nome = 'patristica'`))[0] };
}

// ═══ ENTIDADES (piloto do ciclo 3): extração NA HORA sobre os trechos ligados a uma passagem; nada é gravado ═══
const TIPO_ENT = { pessoa_biblica: 'pessoa', pessoa_historica: 'pessoa', autor_antigo: 'pessoa', autor_moderno: 'pessoa', lugar: 'lugar', evento: 'evento',
  documento: 'documento', instituicao: 'instituicao', tradicao: 'tradicao', termo_original: 'termo' };
const NOME_CAT = { pessoa_biblica: 'pessoa bíblica', pessoa_historica: 'pessoa histórica', autor_antigo: 'autor antigo', autor_moderno: 'autor moderno', lugar: 'lugar',
  evento: 'acontecimento', documento: 'obra/documento', instituicao: 'instituição/comunidade', tradicao: 'tradição interpretativa', termo_original: 'termo original', conceito: 'conceito' };
async function entidadesDaPassagem(db, ini, fim, bib) {
  const cat = await catalogo(db);
  const ponteiros = await ponteirosDe(db, ini, fim, 400);
  const textos = await trechosPorPonteiros(db, ponteiros.slice(0, 220));
  const vistos = new Set([...textos.keys()]);
  const pat = await citacoesPatristicas(db, ini, vistos);
  const lit = await citacoesLiterais(db, bib, ini, vistos);
  const trechos = [...textos.entries()].map(([chave, x]) => ({ ...x, chave }))
    .concat(pat.achados.map((x) => ({ ...x })), lit.achados.map((x) => ({ ...x })))
    .filter((x, i, a) => a.findIndex((y) => y.chave === x.chave) === i)
    .map((x) => ({ chave: x.chave, fonte: x.fonte, autor: x.autor, obra: obraNo(x.fonte, cat, x).rotulo, secao: x.secao, texto: x.texto, camadaFonte: /^pat-|eusebio/.test(x.fonte) ? 'antiga' : 'moderna' }));
  const t0 = Date.now();
  const r = ENT.extrair(trechos, CONCEITOS);
  const g = grafo();
  const foco = g.no(passagemNo(ini, fim, bib));
  const escolhidas = r.entidades.filter((e) => e.categoria !== 'termo_original').slice(0, 24)
    .concat(r.entidades.filter((e) => e.categoria === 'termo_original' && e.trechos >= 2).slice(0, 8));
  const idNo = (e) => (e.categoria === 'conceito' ? 'c:' + e.id.slice(9) : 'e:' + e.id);
  for (const e of escolhidas) {
    const men = r.mencoes.filter((m) => m.entidade === e.id);
    const fam = new Set(men.map((m) => familiaDe({ fonte: m.fonte, autor: (trechos.find((t) => t.chave === m.trecho) || {}).autor })));
    const nid = g.no(e.categoria === 'conceito' ? conceitoNo(CONCEITOS.find((c) => 'conceito:' + c.id === e.id) || { id: e.id.slice(9), rotulo: e.nome, re: '' })
      : { id: idNo(e), tipo: TIPO_ENT[e.categoria] || 'pessoa', rotulo: e.nome, categoria: e.categoria, catNome: NOME_CAT[e.categoria], variantes: e.variantes, camadas: e.camadas,
          confianca: Math.max(...men.map((m) => m.confianca)) });
    const evid = men.slice(0, 3).map((m) => ({ autor: (trechos.find((t) => t.chave === m.trecho) || {}).autor || '', obra: m.obra, secao: m.secao, modo: `menciona "${m.forma}" · ${m.camada.replace('_', ' ')} · ${m.metodo}`, trecho: m.contexto, fonte: m.fonte, local: { fonte: m.fonte, trechoId: m.trecho, posicao: m.pos } }));
    g.aresta({ de: nid, para: foco, tipo: 'mencao', natRel: e.categoria === 'conceito' ? 'tematica' : ['lugar', 'evento', 'instituicao', 'pessoa_historica'].includes(e.categoria) ? 'historica' : e.categoria === 'termo_original' ? 'lexical' : 'documental',
      estado: fam.size >= 3 ? 'corroboracao' : 'interpretacao', metodo: e.categoria === 'conceito' ? 'associacao_tematica' : 'identificacao_entidade', peso: e.mencoes, familias: [...fam],
      explica: `${NOME_CAT[e.categoria] || ''} "${e.nome}" aparece ${e.mencoes} vez(es) em ${e.trechos} trecho(s) de ${e.fontes.length} obra(s) que tratam desta passagem (formas: ${e.variantes.slice(0, 4).join(', ')}). Camadas: ${Object.entries(e.camadas).map(([k, v]) => k.replace('_', ' ') + ' ' + v).join(', ')}.`, evidencias: evid });
  }
  const noIds = new Map(escolhidas.map((e) => [e.id, idNo(e)]));
  for (const rel of r.relacoes) {
    if (!noIds.has(rel.de) || !noIds.has(rel.para)) continue;
    g.aresta({ de: noIds.get(rel.de), para: noIds.get(rel.para), tipo: 'co-citacao', natRel: 'interpretativa', estado: 'hipotese', metodo: 'co_citacao', peso: rel.trechos,
      explica: `Aparecem juntos em ${rel.trechos} trecho(s) sobre a passagem. Co-ocorrência não prova relação: é hipótese a examinar.` });
  }
  return { ...g.saida(), ambiguas: r.ambiguas.slice(0, 30), candidatos: r.candidatos, resumo: { trechos: trechos.length, entidades: r.entidades.length, mencoes: r.mencoes.length, ms: Date.now() - t0 } };
}

// ═══ EXTRAÇÃO EM MASSA DE ENTIDADES (última etapa; autorizada após validar o piloto) ═══════════════════
// Grava SÓ no banco do NEXUS: entidades, nomes, menções (banco + trecho + posição; o texto não é copiado), ambíguas e
// candidatas. Lotes por id, com progresso em nexus_lotes_estado: se cair, continua de onde parou. Chave única nas
// menções impede duplicidade. VERSAO_ENT muda quando o extrator muda: aí as menções antigas são refeitas.
const VERSAO_ENT = 1;
async function tabelasEntidades(db) {
  if (!db.temNexus()) return false;
  await db.q('n', `create table if not exists nexus_entidades (id text primary key, nome text not null, categoria text not null, status text not null default 'catalogo',
      mencoes int not null default 0, criado_em timestamptz not null default now())`);
  await db.q('n', `create table if not exists nexus_nomes (entidade text not null, forma text not null, primary key (entidade, forma))`);
  await db.q('n', `create table if not exists nexus_mencoes (id bigserial primary key, entidade text not null, banco smallint not null, trecho bigint not null, pos int not null,
      forma text not null, metodo text not null, confianca real not null, camada text not null, versao int not null, unique (entidade, banco, trecho, pos))`);
  await db.q('n', 'create index if not exists nexus_mencoes_ent on nexus_mencoes (entidade)');
  await db.q('n', 'create index if not exists nexus_mencoes_trecho on nexus_mencoes (banco, trecho)');
  await db.q('n', `create table if not exists nexus_ambiguas (id bigserial primary key, forma text not null, opcoes text[] not null, banco smallint not null, trecho bigint not null, pos int not null,
      decisao text, unique (banco, trecho, pos))`);
  await db.q('n', `create table if not exists nexus_candidatas (forma text primary key, ocorrencias int not null default 0, trechos int not null default 0, exemplo text, status text not null default 'pendente')`);
  await db.q('n', `create table if not exists nexus_lotes_estado (nome text primary key, banco smallint not null default 1, ultimo_id bigint not null default 0, lidos int not null default 0,
      mencoes int not null default 0, ambiguas int not null default 0, versao int not null, feito boolean not null default false, iniciado_em timestamptz not null default now(), atualizado_em timestamptz not null default now())`);
  return true;
}
async function backupNexus(db) {
  if (!db.temNexus()) return { ok: false, err: 'banco do NEXUS não ligado' };
  const sufixo = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const tabelas = (await db.q('n', `select table_name from information_schema.tables where table_schema = 'public' and table_name like 'nexus_%'`)).map((r) => r.table_name);
  const feitas = [];
  for (const t of tabelas) {
    const nome = `bkp_${sufixo}_${t}`.slice(0, 60);
    await db.q('n', `create table if not exists ${nome} as table ${t}`);
    const n = (await db.q('n', `select count(*)::int n from ${nome}`))[0].n;
    feitas.push({ tabela: t, copia: nome, linhas: n });
  }
  return { ok: true, backup: feitas };
}
async function extrairEmMassa(db, lote) {
  if (!(await tabelasEntidades(db))) return { ok: false, err: 'banco do NEXUS não ligado' };
  let est = (await db.q('n', `select * from nexus_lotes_estado where nome = 'entidades'`))[0];
  if (!est) { await db.q('n', `insert into nexus_lotes_estado (nome, versao) values ('entidades', $1) on conflict do nothing`, [VERSAO_ENT]); est = (await db.q('n', `select * from nexus_lotes_estado where nome = 'entidades'`))[0]; }
  if (est.versao < VERSAO_ENT) {
    await db.q('n', 'delete from nexus_mencoes where versao < $1', [VERSAO_ENT]);
    await db.q('n', `update nexus_lotes_estado set banco = 1, ultimo_id = 0, lidos = 0, mencoes = 0, ambiguas = 0, feito = false, versao = $1 where nome = 'entidades'`, [VERSAO_ENT]);
    est = (await db.q('n', `select * from nexus_lotes_estado where nome = 'entidades'`))[0];
  }
  if (est.feito) return { ok: true, ...est };
  const cat = await catalogo(db);
  const linhas = await db.q(est.banco, `select id, fonte, autor, obra, secao, texto from biblioteca_trechos where id > $1 order by id limit $2`, [est.ultimo_id, lote]);
  const trechos = linhas.map((x) => ({ chave: est.banco + ':' + x.id, fonte: x.fonte, autor: x.autor, obra: obraNo(x.fonte, cat, x).rotulo, secao: x.secao, texto: x.texto,
    camadaFonte: /^pat-|eusebio/.test(x.fonte) ? 'antiga' : 'moderna' }));
  const r = ENT.extrair(trechos, CONCEITOS, { todosCandidatos: true });
  const lotear = async (linhasIns, colunas, sql) => {
    for (let i = 0; i < linhasIns.length; i += 400) {
      const parte = linhasIns.slice(i, i + 400);
      const ph = parte.map((_, k) => '(' + colunas.map((_, j) => '$' + (k * colunas.length + j + 1)).join(',') + ')').join(',');
      await db.q('n', sql.replace('%V', ph), parte.flat());
    }
  };
  await lotear(r.entidades.map((e) => [e.id, String(e.nome).slice(0, 200), e.categoria, e.categoria === 'termo_original' ? 'termo' : e.categoria === 'conceito' ? 'conceito' : 'catalogo', e.mencoes]),
    [1, 2, 3, 4, 5], `insert into nexus_entidades (id, nome, categoria, status, mencoes) values %V on conflict (id) do update set mencoes = nexus_entidades.mencoes + excluded.mencoes`);
  const nomes = []; for (const e of r.entidades) for (const v of e.variantes) nomes.push([e.id, String(v).slice(0, 120)]);
  await lotear(nomes, [1, 2], `insert into nexus_nomes (entidade, forma) values %V on conflict do nothing`);
  await lotear(r.mencoes.map((m) => { const [bn, id] = m.trecho.split(':'); return [m.entidade, +bn, +id, m.pos, String(m.forma).slice(0, 120), m.metodo, m.confianca, m.camada, VERSAO_ENT]; }),
    [1, 2, 3, 4, 5, 6, 7, 8, 9], `insert into nexus_mencoes (entidade, banco, trecho, pos, forma, metodo, confianca, camada, versao) values %V on conflict do nothing`);
  await lotear(r.ambiguas.map((a) => { const [bn, id] = a.trecho.split(':'); return [a.forma, a.opcoes, +bn, +id, a.pos]; }),
    [1, 2, 3, 4, 5], `insert into nexus_ambiguas (forma, opcoes, banco, trecho, pos) values %V on conflict do nothing`);
  const cand = new Map(); for (const c of r.candidatosTodos || []) cand.set(c.forma, c);
  await lotear([...cand.values()].map((c) => [String(c.forma).slice(0, 80), c.ocorrencias, c.trechos, String(c.exemplo || '').slice(0, 200)]),
    [1, 2, 3, 4], `insert into nexus_candidatas (forma, ocorrencias, trechos, exemplo) values %V on conflict (forma) do update set ocorrencias = nexus_candidatas.ocorrencias + excluded.ocorrencias, trechos = nexus_candidatas.trechos + excluded.trechos`);
  const ultimo = linhas.length ? linhas[linhas.length - 1].id : est.ultimo_id;
  let banco = est.banco, ultimoId = ultimo, feito = false;
  if (linhas.length < lote) { if (est.banco === 1) { banco = 2; ultimoId = 0; } else feito = true; }
  await db.q('n', `update nexus_lotes_estado set banco = $1, ultimo_id = $2, lidos = lidos + $3, mencoes = mencoes + $4, ambiguas = ambiguas + $5, feito = $6, atualizado_em = now() where nome = 'entidades'`,
    [banco, ultimoId, linhas.length, r.mencoes.length, r.ambiguas.length, feito]);
  // regra validada no piloto: forma grega/hebraica que aparece uma vez só (e não é Strong) fica marcada como rara,
  // sem apagar nada — continua consultável, mas não entra nas listas principais
  if (feito) await db.q('n', `update nexus_entidades set status = 'termo_raro' where status = 'termo' and mencoes < 2 and id not like 'strong:%'`);
  return { ok: true, ...(await db.q('n', `select * from nexus_lotes_estado where nome = 'entidades'`))[0], lote: linhas.length };
}
// Validação por amostragem: relê o trecho e confere se, na posição gravada, está exatamente a forma gravada.
async function validarEntidades(db, n) {
  if (!(await tabelasEntidades(db))) return { ok: false, err: 'banco do NEXUS não ligado' };
  const amostra = await db.q('n', `select m.entidade, e.nome, e.categoria, m.banco, m.trecho, m.pos, m.forma, m.camada, m.metodo from nexus_mencoes m join nexus_entidades e on e.id = m.entidade
      where m.entidade not like 'termo:%' order by random() limit $1`, [n]);
  let ok = 0; const falhas = [], exemplos = [];
  for (const bn of [1, 2]) {
    const ids = amostra.filter((m) => m.banco === bn).map((m) => m.trecho);
    if (!ids.length) continue;
    const textos = new Map((await db.q(bn, 'select id, texto from biblioteca_trechos where id = any($1)', [ids])).map((x) => [String(x.id), x.texto]));
    for (const m of amostra.filter((x) => x.banco === bn)) {
      const t = textos.get(String(m.trecho)) || '';
      const confere = t.slice(m.pos, m.pos + m.forma.length) === m.forma;
      if (confere) ok++; else if (falhas.length < 10) falhas.push(m);
      if (exemplos.length < 25) exemplos.push({ entidade: m.nome, categoria: m.categoria, camada: m.camada, metodo: m.metodo, contexto: t.slice(Math.max(0, m.pos - 90), m.pos + 90).replace(/\s+/g, ' ') });
    }
  }
  const tot = await db.q('n', `select (select count(*)::int from nexus_entidades) entidades, (select count(*)::int from nexus_mencoes) mencoes, (select count(*)::int from nexus_ambiguas) ambiguas,
      (select count(*)::int from nexus_candidatas where ocorrencias >= 3) candidatas, (select pg_size_pretty(pg_database_size(current_database()))) tamanho`);
  const porCat = await db.q('n', `select categoria, count(*)::int n, sum(mencoes)::int mencoes from nexus_entidades group by 1 order by 3 desc`);
  return { ok: true, amostra: amostra.length, posicao_confere: ok, falhas, exemplos, totais: tot[0], por_categoria: porCat };
}

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

  // 1b) remissões de léxico de obras externas (só localizadores: obra, edição, página, referência; nunca texto)
  for (const p of await PONT.ponteirosDaPassagem(db, ini, fim, 40)) {
    const rot = passagemNo(p.ini, p.fim, bib).rotulo;
    g.no(PONT.noPagina(p));
    g.aresta(PONT.arestaRemissao(p, foco, rot));
  }

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
      trecho: trechoCurto(x.texto, alvo, LIM_TRECHO), ref: p.banco + ':' + p.trecho, fonte: p.fonte, local: localDe(x, p.banco + ':' + p.trecho) };

    if (ob.categoria === 'lexico' && verbeteValido(x.secao)) {
      // o verbete do léxico vira nó próprio: relação lexical documentada
      const lid = g.no({ id: 'l:' + p.fonte + ':' + String(x.secao).slice(0, 80), tipo: 'verbete', rotulo: String(x.secao).slice(0, 60), obra: ob.rotulo, fonte: p.fonte });
      g.aresta({ de: lid, para: foco, tipo: 'lexical', natureza: 'documental', peso: 1,
        explica: `O verbete "${String(x.secao).slice(0, 60)}" de ${ob.rotulo} ${modoRotulo(p.modo, passagem)}.`, evidencias: [ev] });
      g.no(ob);
      g.aresta({ de: g.no(ob), para: lid, tipo: 'contem', natureza: 'estabelecido', peso: 1, explica: `Verbete de ${ob.rotulo}.` });
    } else {
      const oid = g.no(ob);
      g.aresta({ de: oid, para: foco, tipo: p.modo === 2 ? 'cita' : 'comenta', natureza: 'documental', peso: 1, catObra: ob.categoria,
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
      const acc = conceitosAchados.get(c.id) || { trechos: 0, obras: new Set(), fam: new Set(), evid: [] };
      acc.trechos++; acc.obras.add(ob.rotulo); acc.fam.add(familiaDe(x));
      if (acc.evid.length < 3) acc.evid.push({ ...ev, trecho: trechoCurto(x.texto, RE_CONC[c.id], LIM_TRECHO) });
      conceitosAchados.set(c.id, acc);
    }
  }
  // citações literais da frase do versículo (obras sem ponteiros: patrística, Eusébio…)
  const jaVistos = new Set(escolhidos.map((p) => p.banco + ':' + p.trecho));
  const pat = await citacoesPatristicas(db, ini, jaVistos);
  for (const x of pat.achados) {
    jaVistos.add(x.chave);
    const ob = obraNo(x.fonte, cat, x);
    const oid = g.no(ob);
    const ev = { autor: x.autor, obra: ob.rotulo, secao: x.secao || '', modo: 'cita “' + x.marca + '”', trecho: trechoCurto(x.texto, x.re, LIM_TRECHO), ref: x.chave, fonte: x.fonte, local: localDe(x, x.chave), aviso: x.avisoEd };
    g.aresta({ de: oid, para: foco, tipo: x.lxx ? 'cita-lxx' : 'cita', natureza: 'documental', metodo: 'identificacao_documental', catObra: ob.categoria, peso: 1,
      estado: x.lxx ? 'hipotese' : undefined, natRel: x.lxx ? 'textual' : undefined,
      explica: `${ob.rotulo} cita "${x.marca}" (forma de citar das edições patrísticas).${x.salmo && x.salmo.num !== 'indefinida' ? ` Numeração do Salmo: ${x.salmo.num === 'lxx' ? 'LXX/Vulgata' : 'hebraica'} (${x.salmo.nota}).` : ''}${x.lxx ? ' Achado pela numeração da LXX/Vulgata: correspondência provável, não confirmada.' : ''} ${x.avisoEd}`, evidencias: [ev] });
    if (ob.autor) g.aresta({ de: g.no({ id: idAutor(ob.autor), tipo: 'autor', rotulo: ob.autor }), para: oid, tipo: 'escreveu', natureza: 'estabelecido', peso: 1, explica: 'Autoria registrada no catálogo da biblioteca.' });
    for (const c of CONCEITOS) {
      if (!RE_CONC[c.id].test(String(x.texto || ''))) continue;
      const acc = conceitosAchados.get(c.id) || { trechos: 0, obras: new Set(), fam: new Set(), evid: [] };
      acc.trechos++; acc.obras.add(ob.rotulo); acc.fam.add(familiaDe(x));
      if (acc.evid.length < 3) acc.evid.push({ ...ev, trecho: trechoCurto(x.texto, RE_CONC[c.id], LIM_TRECHO) });
      conceitosAchados.set(c.id, acc);
    }
  }
  const lit = await citacoesLiterais(db, bib, ini, jaVistos);
  for (const x of lit.achados) {
    const ob = obraNo(x.fonte, cat, x);
    const oid = g.no(ob);
    const ev = { autor: x.autor, obra: ob.rotulo, secao: x.secao || x.livro || '', modo: 'cita literalmente', trecho: trechoCurto(x.texto, reFrase(lit.frase), LIM_TRECHO), ref: x.chave, fonte: x.fonte, local: localDe(x, x.chave), aviso: /^pat-|eusebio/.test(x.fonte) ? avisoPatristico(x) : undefined };
    g.aresta({ de: oid, para: foco, tipo: 'cita', natureza: 'documental', metodo: 'citacao_literal', catObra: ob.categoria, peso: 1,
      explica: `${ob.rotulo} cita literalmente a frase "${lit.frase}".`, evidencias: [ev] });
    if (ob.autor) g.aresta({ de: g.no({ id: idAutor(ob.autor), tipo: 'autor', rotulo: ob.autor }), para: oid, tipo: 'escreveu', natureza: 'estabelecido', peso: 1, explica: 'Autoria registrada no catálogo da biblioteca.' });
    for (const c of CONCEITOS) {
      if (!RE_CONC[c.id].test(String(x.texto || ''))) continue;
      const acc = conceitosAchados.get(c.id) || { trechos: 0, obras: new Set(), fam: new Set(), evid: [] };
      acc.trechos++; acc.obras.add(ob.rotulo); acc.fam.add(familiaDe(x));
      if (acc.evid.length < 3) acc.evid.push({ ...ev, trecho: trechoCurto(x.texto, RE_CONC[c.id], LIM_TRECHO) });
      conceitosAchados.set(c.id, acc);
    }
  }
  for (const [cid, acc] of conceitosAchados) {
    const c = CONCEITOS.find((k) => k.id === cid);
    const id = g.no(conceitoNo(c));
    g.aresta({ de: id, para: foco, tipo: 'mencao', natureza: 'documental', peso: acc.trechos, familias: [...acc.fam],
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

// Página de obra externa: as remissões que ela faz (só com a porta; ver nexus-ponteiros.js).
async function expandirPaginaExterna(db, g, id, bib) {
  const m = /^x:([a-z0-9-]+):(\d+)$/.exec(id);
  if (!m) return;
  const linhas = await PONT.ponteirosDaPagina(db, m[1], +m[2]);
  if (!linhas.length) return;
  g.no(PONT.noPagina(linhas[0]));
  for (const p of linhas) {
    const pn = passagemNo(p.ini, p.fim, bib);
    g.no(pn);
    g.aresta(PONT.arestaRemissao(p, pn.id, pn.rotulo));
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

  // 2a) Apoio patrístico: citações no formato das edições patrísticas ("Jo 1,1")
  const pat = await citacoesPatristicas(db, ini, new Set(chavesFoco));
  const patPorFonte = new Map();
  for (const x of pat.achados) {
    const e = patPorFonte.get(x.fonte) || { n: 0, ev: [] };
    e.n++;
    if (e.ev.length < 2) e.ev.push({ autor: x.autor, obra: obraNo(x.fonte, cat, x).rotulo, secao: x.secao || '', modo: 'cita “' + x.marca + '”' + (x.lxx ? ' (numeração LXX)' : ''), trecho: trechoCurto(x.texto, x.re, LIM_TRECHO), fonte: x.fonte, local: localDe(x, x.chave), aviso: x.avisoEd });
    patPorFonte.set(x.fonte, e);
    textos.set(x.chave, x); chavesFoco.push(x.chave);
  }
  blocos.push({ algoritmo: 'apoio-patristico', classe: 'textual', natRel: 'textual', estado: 'direta', metodo: 'identificacao_documental', titulo: 'Apoio patrístico (citações explícitas)', natureza: 'documental',
    como: `Referências escritas no formato das edições patrísticas (ex.: "Jo 1,1"), procuradas nas obras da patrística e em Eusébio e conferidas uma a uma.${pat.aviso ? ' ' + pat.aviso : ''}`,
    itens: [...patPorFonte.entries()].sort((a, b) => b[1].n - a[1].n).map(([f, e]) => { const ob = obraNo(f, cat, null); return { alvo: 'o:' + f, rotulo: ob.rotulo, detalhe: `${ob.autor ? ob.autor + ' · ' : ''}${e.n} citação(ões) explícita(s)`, evidencias: e.ev }; }) });

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
      const e = temas.get(c.id) || { obras: new Set(), fam: new Set(), n: 0, ev: [] };
      e.obras.add(obraNo(p.fonte, cat, x).rotulo); e.fam.add(familiaDe(x)); e.n++;
      if (e.ev.length < 3) e.ev.push({ autor: x.autor, obra: obraNo(p.fonte, cat, x).rotulo, secao: x.secao || '', modo: 'menciona', trecho: trechoCurto(x.texto, RE_CONC[c.id], LIM_TRECHO) });
      temas.set(c.id, e);
    }
  }
  const temasOrd = [...temas.entries()].sort((a, b) => (b[1].obras.size - a[1].obras.size) || (b[1].n - a[1].n));
  blocos.push({ algoritmo: 'temas-recorrentes', classe: 'tematica', titulo: 'Temas recorrentes em diferentes obras', natureza: 'documental',
    como: 'Conceitos do dicionário do NEXUS encontrados no texto dos trechos que tratam da passagem, contados por obra distinta.',
    itens: temasOrd.map(([cid, e]) => { const c = CONCEITOS.find((k) => k.id === cid); return { alvo: 'c:' + cid, rotulo: c.rotulo, estado: e.fam.size >= 3 ? 'corroboracao' : 'interpretacao', independentes: e.fam.size, detalhe: `${e.obras.size} obra(s), ${e.fam.size} autor(es) independente(s) · ${e.n} trecho(s): ${[...e.obras].slice(0, 3).join('; ')}`, evidencias: e.ev }; }) });

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
    como: 'Caminhos INDIRETOS: busca em largura nos dois sentidos sobre as referências cruzadas (até 3 níveis, 25 melhores por passagem). Mostram por onde as passagens se ligam na curadoria; não demonstram dependência literária direta.', itens: caminhos });

  // descobertas já registradas na Oficina
  const a = R.decompor(ini), z = R.decompor(fim);
  const desc = await descobertasQueCruzam(db, R.AB[a.b - 1], a.c, a.v, a.c === z.c ? z.v : 176);
  blocos.push({ algoritmo: 'descobertas-oficina', classe: 'inferencia', titulo: 'Descobertas já registradas na Oficina', natureza: 'inferencia_ia',
    como: 'Tabela oficina_descobertas (4 camadas). Escritas por IA; a fonte declarada vai junto. "conferir" = não verificada.',
    itens: desc.map((d) => ({ alvo: 'd:' + d.id, rotulo: d.titulo, detalhe: `camada ${d.camada} · fonte: ${d.fonte || '—'}`, natureza: naturezaDescoberta(d), evidencias: [{ autor: 'Oficina do RADAR', obra: 'descoberta', secao: d.fonte || '', modo: d.camada, trecho: String(d.explica || '').slice(0, LIM_TRECHO) }] })) });

  const DIM = {
    'refcruz-relevantes': ['interpretativa', 'interpretacao', 'referencia_cruzada'],
    'autores-mesma-passagem': ['documental', 'direta', 'identificacao_documental'],
    'apoio-patristico': ['textual', 'direta', 'identificacao_documental'],
    'citacoes-literais': ['textual', 'direta', 'citacao_literal'],
    'temas-recorrentes': ['tematica', 'interpretacao', 'associacao_tematica'],
    'relacoes-lexicais': ['lexical', 'direta', 'correspondencia_lexical'],
    'conexoes-pouco-evidentes': ['interpretativa', 'hipotese', 'co_citacao'],
    'caminhos': ['interpretativa', 'hipotese', 'caminho_grafo'],
    'descobertas-oficina': ['interpretativa', 'inferencia', 'analise_ia'],
  };
  for (const b of blocos) { const d = DIM[b.algoritmo]; if (d) { b.natRel = d[0]; b.estado = d[1]; b.metodo = d[2]; } }
  return { foco, blocos };
}

// ═══ EXPLICAR (a IA interpreta, citando as evidências por número) ══════════════════════════
async function explicar(db, ini, fim, bib, quem) {
  const r = await descobrir(db, ini, fim, bib);
  const evid = [];
  for (const b of r.blocos) {
    for (const it of b.itens.slice(0, 5)) {
      for (const e of (it.evidencias || []).filter((x) => !x.externa).slice(0, 1)) {   // obras externas nunca vão para a IA
        if (evid.length >= 24) break;
        evid.push({ n: evid.length + 1, bloco: b.titulo, natureza: b.classe || it.natureza || b.natureza, item: it.rotulo, detalhe: it.detalhe,
          autor: e.autor, obra: e.obra, secao: e.secao, trecho: String(e.trecho || '').slice(0, 260) });
      }
    }
  }
  if (!evid.length) return { texto: 'Não há evidências suficientes na biblioteca para esta passagem.', evidencias: [] };
  const sys = 'Você é o NEXUS BÍBLICO conversando com um pastor estudioso, como um professor experiente e caloroso que ama a Palavra. Escreva em português do Brasil, em prosa narrativa e fluida, com calor humano e reverência, como quem conduz uma descoberta junto com ele (pode começar mostrando o que chama atenção na passagem); nada de ficha técnica, tópicos, títulos ou jargão de sistema (não fale em "bloco", "algoritmo", "evidência E3 indica"). REGRAS INEGOCIÁVEIS: (1) use SOMENTE as evidências fornecidas; não acrescente fatos, autores, datas ou citações de memória; (2) toda frase com afirmação termina com a marca da evidência entre colchetes, por exemplo [E3] ou [E2][E7]; (3) deixe claro, com naturalidade, o grau de certeza conforme o campo entre parênteses: o que o texto ou a obra diz diretamente, o que os comentaristas interpretam, o que é curadoria de referências, o que é hipótese a examinar e o que é inferência ainda não verificada; (4) co-citação e caminho são hipóteses, nunca fatos; (5) se algo não tem evidência suficiente, diga isso com honestidade; (6) de 3 a 5 parágrafos.';
  const user = `Passagem: ${r.foco.rotulo} — "${r.foco.texto || ''}"\n\nEVIDÊNCIAS:\n` + evid.map((e) =>
    `[E${e.n}] (${e.natureza}) ${e.bloco} — ${e.item}${e.detalhe ? ' (' + e.detalhe + ')' : ''}. Fonte: ${e.autor || ''}, ${e.obra || ''}${e.secao ? ', ' + e.secao : ''}. Trecho: "${e.trecho}"`).join('\n');
  // A IA passa pela camada do NEXUS (modelo por tarefa, orçamento, registro de custo, reaproveitamento).
  const rr = await IA.executar(db, { tarefa: 'explicar', sys, user, dono: quem && quem.dono, investigacao: quem && quem.investigacao });
  // Conferência: só ficam marcas que existem; parágrafo sem nenhuma marca válida é descartado.
  const validos = new Set(evid.map((e) => 'E' + e.n));
  const paragrafos = String(rr.texto || '').split(/\n\s*\n/).map((p) => p.replace(/\[(E\d+)\]/g, (m, k) => (validos.has(k) ? m : ''))).filter((p) => /\[E\d+\]/.test(p));
  const descartados = String(rr.texto || '').split(/\n\s*\n/).filter((p) => p.trim()).length - paragrafos.length;
  return { texto: paragrafos.join('\n\n') || 'A IA não conseguiu produzir uma explicação ancorada nas evidências. Veja os blocos do motor de descoberta.',
    evidencias: evid, descartados, modelo: rr.modelo || '', provedor: rr.provedor || '', nivel: rr.nivel, custo_usd: rr.custo || 0, reaproveitado: !!rr.reaproveitado, motivo: rr.motivo || '' };
}

// ═══ BARRA LATERAL 'PERGUNTE AO CLAUDE' ═══
const SYS_PREPARAR = "Você é o Claude dentro do NEXUS BÍBLICO, ajudando um pastor pentecostal brasileiro a preparar um sermão, uma pregação, uma mensagem devocional ou um estudo bíblico. Escreva em português do Brasil, com calor pastoral e clareza, pronto para ser usado no púlpito ou na sala de aula. ESTRUTURA: título; texto base (com a referência); para sermão e pregação: introdução, 3 ou 4 pontos com explicação do texto, ilustração e aplicação, conclusão e apelo; para mensagem: texto curto e direto (5 a 8 parágrafos) com uma aplicação prática; para estudo: objetivo, contexto, exposição em tópicos, perguntas para discussão e aplicação. Ajuste o tamanho à duração pedida. Use títulos curtos em linhas próprias (sem markdown pesado; pode usar '-' para listas). BASE OBRIGATÓRIA: construa o texto sobre o DOSSIÊ que o universo do NEXUS montou (versículos centrais, acontecimentos, personagens, palavras no original, temas, doutrinas, confissões, lugares, notas de crítica textual) e cite as referências bíblicas exatamente como aparecem no dossiê. Quando usar algo das camadas, diga de qual veio (ex.: 'no original grego, ἀγάπη...'; 'a Confissão de Westminster cita...'). RIGOR INEGOCIÁVEL: não invente versículos, citações, autores, datas, estatísticas nem histórias apresentadas como fatos; ilustrações que você criar devem ser apresentadas como sugestão ('imagine...', 'por exemplo...'); separe o que o texto bíblico diz do que é interpretação de uma tradição; se o dossiê for fraco para o tema, diga isso no início e use só o que for seguro; datas antigas da cronologia são tradicionais, não consenso. Termine com uma linha 'Base no NEXUS:' listando as camadas que você usou.";
const SYS_CONVERSA = "VOCÊ COMANDA O UNIVERSO DO NEXUS: quando o pastor quiser ver, ir, entrar, andar, sentir ou ter um vislumbre de um lugar ou cena, escreva sua resposta e coloque no fim, exatamente uma vez, a marca [[CENA:x]], em que x é um destes: eden (jardim do Éden em 3D para andar), queda (Gênesis 3, a escolha do homem), trombetas (Apocalipse 8–11), criacao (Gênesis 1), templo-herodes, templo-salomao, getsemani, golgota, lazaro (Betânia), nazare, cafarnaum, magdala, mar-galileia. A marca abre a cena na hora; nunca invente outra marca e não use a marca quando ele só fizer uma pergunta. Você é o Claude dentro do NEXUS BÍBLICO, conversando com um pastor estudioso como um professor experiente, caloroso e paciente. Escreva em português do Brasil, em prosa natural e acolhedora, no tom de um bate-papo de verdade, contínuo: respostas curtas e diretas para perguntas simples; respostas completas e bem organizadas (com títulos curtos com #, listas e negrito quando ajudarem) para estudos, esboços e discussões; converse como um colega erudito que pensa junto, traz ângulos que ele talvez não viu, discorda com respeito quando há motivo e, quando fizer sentido, termina com uma pergunta que aprofunda a conversa. Você ajuda de dois jeitos: (1) explicando como usar o NEXUS; (2) ajudando nos estudos bíblicos (roteiros, perguntas para meditar, contexto, línguas originais, caminhos de investigação). COMO O NEXUS FUNCIONA: a busca no alto abre uma passagem (ex.: João 1:1); tocar num ponto mostra o painel com as ligações e as fontes; tocar de novo ou usar Expandir traz os vizinhos; a legenda embaixo é clicável e destaca um tipo de elemento ou um estado de evidência; os nomes dos grupos de assuntos abrem a lista dos membros; o botão Céu Infinito alterna entre o mapa 2D e o céu 3D; Descobrir roda os algoritmos do motor (referências cruzadas, citações literais, apoio patrístico, temas, relações lexicais, descobertas da Oficina); Explicar pede à IA um texto ancorado nas evidências numeradas [E1], [E2]; Entidades mostra pessoas, lugares e conceitos citados nas obras; Caminho liga dois elementos; a Trilha guarda o percurso; Salvar e Investigações guardam o mapa no banco do NEXUS; Filtros escondem estados, naturezas e métodos; o acesso à biblioteca é pelo PIN. Estados da evidência: direta (a fonte cita ou define), corroboração (3+ autores independentes), interpretação (comentaristas, curadoria), hipótese (vínculo calculado) e inferência (texto de IA). RIGOR INEGOCIÁVEL: nunca invente citações, páginas, autores ou referências bibliográficas; separe com clareza o que é texto bíblico, o que é consenso acadêmico, o que é interpretação de uma tradição e o que é hipótese; quando não souber ou houver controvérsia, diga com honestidade; lembre que esta conversa NÃO consulta a biblioteca do NEXUS e que, para evidências conferíveis, ele deve usar Descobrir e Explicar.";

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
  // ESTRUTURA PARA IMAGENS (ainda sem imagens): toda imagem precisa de autoria, procedência, licença e identificação.
  // Ilustração, reconstrução e imagem gerada por IA NUNCA contam como evidência (a regra está no próprio banco).
  await db.q('n', `create table if not exists nexus_imagens (
      id bigserial primary key,
      titulo text not null,
      tipo text not null check (tipo in ('fotografia','manuscrito','artefato','mapa_historico','lugar','reconstrucao','ilustracao','documento')),
      url text not null,
      autoria text not null,
      procedencia text not null,
      licenca text not null,
      data_origem text,
      contexto_historico text,
      identificacao text,
      gerada_por_ia boolean not null default false,
      conta_como_evidencia boolean not null default false,
      ligada_a text[] not null default '{}',
      criado_em timestamptz not null default now(),
      check (not conta_como_evidencia or (tipo not in ('reconstrucao','ilustracao') and not gerada_por_ia)))`);
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
        else if (id.startsWith('x:')) await expandirPaginaExterna(db, g, id, bib);
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
        else if (id.startsWith('x:')) await expandirPaginaExterna(db, g, id, bib);
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
        if (i) g.aresta({ de: idP(c[i - 1], c[i - 1]), para: idP(c[i], c[i]), tipo: 'caminho', natureza: 'interpretacao', classe: 'interpretacao', peso: 1, explica: 'Passo de um caminho INDIRETO: referência cruzada OpenBible (em qualquer sentido). Um caminho não demonstra dependência literária entre as pontas.', credito: CREDITO_OB });
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
      const chaveD = 'descobrir|' + b.id;
      const r = acao === 'descobrir' ? (lembrar(chaveD) || guardar(chaveD, await descobrir(db, p.ini, p.fim, bib)))
        : await explicar(db, p.ini, p.fim, bib, { dono: donoDe(b), investigacao: b.investigacao || null });
      res.json({ ok: true, ...r });
      return;
    }
    if (acao === 'backup') { res.json(await backupNexus(db)); return; }
    if (acao === 'extrair-entidades') { res.json(await extrairEmMassa(db, Math.min(1500, Math.max(200, +b.lote || 800)))); return; }
    if (acao === 'validar-entidades') { res.json(await validarEntidades(db, Math.min(200, Math.max(10, +b.amostra || 60)))); return; }
    if (acao === 'entidades') {
      const bib = await carregarBiblia(proto + '://' + host);
      const p = lerPassagemId(b.id);
      if (!p) { res.json({ ok: false, err: 'escolha uma passagem' }); return; }
      const chaveE = 'entidades|' + b.id;
      res.json({ ok: true, ...(lembrar(chaveE) || guardar(chaveE, await entidadesDaPassagem(db, p.ini, p.fim, bib))) });
      return;
    }
    if (acao === 'indice-patristico') {
      const bib = await carregarBiblia(proto + '://' + host);
      if (!bib) { res.json({ ok: false, err: 'a Almeida não carregou agora' }); return; }
      if (b.montar) { res.json(await indexarPatristica(db, bib, 1200)); return; }
      if (!(await tabelasIndice(db).catch(() => false))) { res.json({ ok: false, err: 'banco do NEXUS não ligado' }); return; }
      const e = (await db.q('n', `select * from nexus_indice_estado where nome = 'patristica'`))[0];
      const porCamada = await db.q('n', `select camada, count(*)::int n from nexus_refs group by 1`).catch(() => []);
      res.json({ ok: true, ...(e || { lidos: 0, refs: 0, feito: false }), por_camada: porCamada });
      return;
    }
    if (acao === 'ponteiros-obra') {   // administrativo: simular (só leitura), gravar, reverter ou ver o estado de um lote
      const modo = String(b.modo || 'simular');
      if (!db.temNexus()) { res.json({ ok: false, err: 'banco do NEXUS não ligado' }); return; }
      if (modo === 'estado') { res.json(await PONT.estado(db, b.lote_id || null)); return; }
      if (modo === 'migrar') { res.json(await PONT.migrar(db)); return; }
      if (modo === 'reverter') { res.json(await PONT.reverter(db, b.lote_id)); MEMORIA.clear(); return; }
      const bib = await carregarBiblia(proto + '://' + host);
      if (!bib) { res.json({ ok: false, err: 'a Almeida não carregou agora' }); return; }
      if (modo === 'simular') { res.json(await PONT.simular(db, b.lote, bib)); return; }
      if (modo === 'gravar') { res.json(await PONT.gravar(db, b.lote, bib)); MEMORIA.clear(); return; }
      res.json({ ok: false, err: 'modo desconhecido' });
      return;
    }
    if (acao === 'segunda-opiniao') {   // a mesma conversa respondida pelo GPT aberto da OpenAI (gpt-oss-120b) no Groq: grátis, sem tocar no orçamento do Claude
      const NL = String.fromCharCode(10);
      const msgs = (Array.isArray(b.mensagens) ? b.mensagens : []).slice(-10).map((m) => ({ papel: m && m.papel === 'eu' ? 'eu' : 'claude', texto: String((m && m.texto) || '').slice(0, 6000) })).filter((m) => m.texto.trim());
      if (!msgs.length) { res.json({ ok: false, err: 'nada para responder' }); return; }
      const ctx = b.contexto || {}; const cena = String(ctx.cena || '').replace(/[\r\n]+/g, ' ').slice(0, 240);
      const user = (cena ? '[O pastor está dentro desta cena do NEXUS: ' + cena + '.]' + NL : '') + msgs.map((m) => (m.papel === 'eu' ? 'PASTOR: ' : 'CLAUDE: ') + m.texto).join(NL + NL) + NL + NL +
        'Você é a SEGUNDA OPINIÃO. Responda à última pergunta do pastor do seu jeito, com independência: concorde, discorde ou acrescente ao que o Claude disse, sempre com honestidade e rigor.' + NL + 'RESPOSTA:';
      const chaves = String(process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '').split(/[\s,;]+/).filter(Boolean);
      if (!chaves.length) { res.json({ ok: false, err: 'A segunda opinião gratuita precisa da chave do Groq no RADAR.' }); return; }
      let texto = '', erro = '';
      for (const k of chaves.sort(() => Math.random() - 0.5)) {
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'openai/gpt-oss-120b', reasoning_effort: 'low', max_tokens: 1600, temperature: 0.4, messages: [{ role: 'system', content: SYS_CONVERSA }, { role: 'user', content: user }] }) });
          const j = await r.json().catch(() => ({}));
          texto = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '').trim();
          if (texto) break; erro = (j.error && j.error.message) || ('HTTP ' + r.status);
        } catch (e) { erro = String(e && e.message || e); }
      }
      res.json(texto ? { ok: true, texto, modelo: 'GPT-OSS 120B (OpenAI, modelo aberto) via Groq', custo_usd: 0 } : { ok: false, err: 'O GPT não respondeu agora (' + erro.slice(0, 80) + ').' });
      return;
    }
    if (acao === 'conversar') {   // barra lateral: dúvidas de uso e ajuda nos estudos (não consulta a biblioteca)
      const NL = String.fromCharCode(10);
      const msgs = (Array.isArray(b.mensagens) ? b.mensagens : []).slice(-10).map((m) => ({ papel: m && m.papel === 'eu' ? 'eu' : 'claude', texto: String((m && m.texto) || '').slice(0, 6000) })).filter((m) => m.texto.trim());
      if (!msgs.length || msgs[msgs.length - 1].papel !== 'eu') { res.json({ ok: false, err: 'escreva uma pergunta' }); return; }
      const ctx = b.contexto || {};
      const nome = (x) => (/^x:/.test(String((x && x.id) || '')) ? '' : String((x && x.rotulo) || '').slice(0, 80));   // obras externas nunca vão para a IA
      const foco = nome(ctx.foco), sel = nome(ctx.sel), cena = String(ctx.cena || '').replace(/[\r\n]+/g, ' ').slice(0, 240);
      const user = (cena ? '[O pastor está agora dentro desta cena do NEXUS: ' + cena + '. Converse sobre o que ele vê quando fizer sentido, separando o texto bíblico da reconstituição artística.]' + NL : '') + (foco || sel ? '[Na tela agora' + (foco ? ': passagem em foco ' + foco : '') + (sel ? '; elemento selecionado ' + sel : '') + ']' + NL + NL : '') +
        msgs.map((m) => (m.papel === 'eu' ? 'PASTOR: ' : 'CLAUDE: ') + m.texto).join(NL + NL) + NL + NL + 'CLAUDE:';
      const TIPOS_IMG = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const anexos = (Array.isArray(b.anexos) ? b.anexos : []).slice(0, 6).filter((a) => a && typeof a.dados === 'string' && /^[A-Za-z0-9+/=]+$/.test(a.dados.slice(0, 200)) && a.dados.length < 4.6e6)
        .map((a) => a.tipo === 'pdf' ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: a.dados } } : { type: 'image', source: { type: 'base64', media_type: TIPOS_IMG.includes(a.mime) ? a.mime : 'image/jpeg', data: a.dados } });
      const rr = await IA.executar(db, { tarefa: 'conversar', sys: SYS_CONVERSA + (anexos.length ? ' O PASTOR ANEXOU ' + anexos.length + ' ARQUIVO(S) NESTA MENSAGEM (fotos, quadros de um vídeo ou PDF): olhe com atenção, descreva o que realmente aparece, identifique o lugar ou o assunto só quando houver base visual clara (diga o grau de certeza) e faça a ligação bíblica quando existir, sem inventar. Se for foto de um lugar, ela também está virando uma cena 3D na tela dele.' : ''), user, dono: donoDe(b), investigacao: null, anexos });
      res.json({ ok: !!rr.texto, texto: String(rr.texto || '').trim() || 'Não consegui responder agora.', modelo: rr.modelo || '', custo_usd: rr.custo || 0, reaproveitado: !!rr.reaproveitado, motivo: rr.motivo || '' });
      return;
    }
    if (acao === 'preparar') {   // barra 'Preparar': sermão, pregação, mensagem ou estudo a partir do dossiê que o universo montou
      const NL = String.fromCharCode(10), corta = (t, n) => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, n);
      const TIPOS = { sermao: 'sermão', pregacao: 'pregação', mensagem: 'mensagem (devocional curta)', estudo: 'estudo bíblico' };
      const tipo = TIPOS[b.tipo] ? b.tipo : 'mensagem';
      const tema = corta(b.tema, 160); if (!tema) { res.json({ ok: false, err: 'escreva o tema ou a passagem' }); return; }
      const d = b.dossie && typeof b.dossie === 'object' ? b.dossie : {};
      const versos = (Array.isArray(d.versos) ? d.versos : []).slice(0, 24).map((v) => `- ${corta(v.ref, 40)}: "${corta(v.texto, 400)}"`);
      const camadas = (Array.isArray(d.camadas) ? d.camadas : []).slice(0, 10).map((c) => `- ${corta(c.camada, 40)}: ${(Array.isArray(c.itens) ? c.itens : []).slice(0, 8).map((x) => corta(x, 90)).join('; ')}`);
      const lugares = (Array.isArray(d.lugares) ? d.lugares : []).slice(0, 8).map((x) => corta(x, 40));
      const user = `PEDIDO: ${TIPOS[tipo]} sobre "${tema}".` + NL + `Público: ${corta(b.publico, 80) || 'igreja local'}. Duração: ${corta(b.duracao, 30) || 'livre'}.` + (b.obs ? NL + 'Observações do pastor: ' + corta(b.obs, 500) : '') + NL + NL +
        'DOSSIÊ MONTADO PELO UNIVERSO DO NEXUS (dados das camadas, cada um com fonte conferível no NEXUS):' + NL +
        (versos.length ? 'Versículos centrais (Almeida):' + NL + versos.join(NL) + NL : 'Nenhum versículo foi achado no universo para este tema.' + NL) +
        (camadas.length ? 'O que as camadas trazem:' + NL + camadas.join(NL) + NL : '') + (lugares.length ? 'Lugares (Atlas): ' + lugares.join(', ') + NL : '') +
        (Array.isArray(d.origem) ? 'Como o tema foi achado: ' + d.origem.slice(0, 6).map((x) => corta(x, 80)).join('; ') + NL : '');
      const rr = await IA.executar(db, { tarefa: 'preparar', sys: SYS_PREPARAR, user, dono: donoDe(b), investigacao: null });
      res.json({ ok: !!rr.texto, texto: String(rr.texto || '').trim() || 'Não consegui preparar agora.', modelo: rr.modelo || '', custo_usd: rr.custo || 0, reaproveitado: !!rr.reaproveitado, motivo: rr.motivo || '' });
      return;
    }
    if (acao === 'ia-consumo') { res.json({ ok: true, ...(await IA.consumo(db, b.investigacao || null)) }); return; }
    if (acao === 'ia-config') { res.json(await IA.salvarConfig(db, b.config || {})); return; }
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
module.exports._teste = { extrairRefsPatristicas, SINAIS_EDITOR, decidirSalmo, tabelasIndice };
