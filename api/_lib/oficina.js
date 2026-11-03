// OFICINA — a rota de consulta por versículo (Node, via api/dados.js?fn=oficina; a URL pública é /api/oficina).
// POST { ref, cracha?, token? }  — ref: "Mateus 28:19", "Mt 28:16-20", "Dn 9.27"…
//
// O QUE SAI, POR QUEM PEDE:
//   • sempre (aberto):  o texto da Almeida do versículo e as referências cruzadas mais votadas (OpenBible.info, CC-BY).
//   • só com a porta dos livros particulares (crachá do aparelho ou token do PIN, conferidos por liberado() de
//     api/_lib/livro-particular.js) — "autores": os trechos das obras que COMENTAM ou CITAM o versículo, com autor,
//     obra, seção e um trecho CURTO (≈300 letras, centrado na referência); e "descobertas" das 4 camadas.
//   • RADAR_ADMIN_TOKEN (só servidor-a-servidor, como a Bereia): o mesmo, com o trecho inteiro (até 3.000 letras).
//     Nunca pelo navegador: o token não vai para a tela.
// O texto dos livros comprados mora só no Postgres e só sai daqui no tamanho que a porta permite.
//
// AS TABELAS (banco 2, criadas por scripts/oficina-indice.mjs): oficina_idx (ponteiros para biblioteca_trechos),
// oficina_fontes, oficina_refcruz, oficina_descobertas. O texto é lido nos bancos da biblioteca, pelo id.
const { Client } = require('pg');
const R = require('./oficina-refs.js');
const { liberado } = require('./livro-particular.js');

const CREDITO = 'OpenBible.info, CC-BY (referências cruzadas)';
const MODO_ORDEM = { 1: 0, 3: 1, 2: 2 };

// A Almeida, lida do próprio site (public/ pode não estar no pacote da função). Guardada na memória do processo.
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

const csBiblioteca = () => process.env.RADAR_DB_DATABASE_URL || process.env.RADAR_DB;
const csDois = () => process.env.RADAR_DB2_DATABASE_URL || process.env.RADAR_DB2;
async function comBanco(cs, fn) {
  if (!cs) return null;
  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try { await c.connect(); return await fn(c); }
  finally { try { await c.end(); } catch (_) { /* já fechou */ } }
}

// O rótulo de cada ligação: "este versículo" só quando o trecho aponta para UM versículo; intervalo é "passagem".
function rotuloDoModo(p) {
  const passagem = p.fim - p.ini > 0;
  if (p.modo === 3) return 'comenta este capítulo';
  if (p.modo === 1) return passagem ? 'comenta esta passagem' : 'comenta este versículo';
  return passagem ? 'cita esta passagem' : 'cita este versículo';
}

// O selo de cada fonte (o mesmo critério da Bereia): o que a pregação precisa saber antes de citar.
function selo(x) {
  if (x.tipo === 'historico') return 'jornal antigo: só ilustração, nunca doutrina';
  if (/josefo/i.test(x.autor || '')) return 'historiador judeu do séc. I: diga "segundo Josefo"';
  if (/rashi|midrash|rabbah/i.test((x.autor || '') + ' ' + (x.obra || ''))) return 'TRADIÇÃO JUDAICA, não Escritura: diga de onde vem';
  if (x.aprovado === false) return 'com filtro: só grego e estudo de palavra, nunca ponto disputado';
  return '';
}

// O trecho curto: a frase em volta da referência do versículo, ou o começo do trecho.
function trechoCurto(texto, cap, v1, limite) {
  const t = String(texto || '');
  const m = new RegExp(cap + '\\s*[:.]\\s*' + v1 + '(?!\\d)').exec(t);
  if (m && limite < 3000) {
    const ini = Math.max(0, m.index - Math.floor(limite / 3));
    return (ini > 0 ? '…' : '') + t.slice(ini, ini + limite).trim() + (ini + limite < t.length ? '…' : '');
  }
  if (t.length <= limite) return t;
  return t.slice(0, limite).trim() + '…';
}

function lerRef(b, bib) {
  const ref = String(b.ref || '').trim().slice(0, 80);
  if (!ref) return null;
  const r = R.achar(' ' + ref, bib)[0];
  return r || null;
}

async function cruzadas(ini, fim, bib) {
  try {
    const linhas = await comBanco(csDois(), (c) => c.query(
      `select para_ini, para_fim, votos from oficina_refcruz
        where de between $1 and $2 order by votos desc limit 12`, [ini, fim]).then((r) => r.rows));
    return (linhas || []).map((x) => {
      const a = R.decompor(x.para_ini), z = R.decompor(x.para_fim);
      return {
        rotulo: a.b === z.b && a.c === z.c ? R.nomeRef(a.b, a.c, a.v, z.v) : R.nomeRef(a.b, a.c, a.v) + ' – ' + R.nomeRef(z.b, z.c, z.v),
        b: a.b, livro: R.AB[a.b - 1],
        texto: R.textoIntervalo(bib, x.para_ini, x.para_fim, 6),
        votos: x.votos,
      };
    }).filter((x) => x.texto);
  } catch (_) { return []; }
}

// Os trechos ligados ao versículo (ponteiros) → textos, com autor, obra, seção e selo.
async function autoresDo(ini, fim, acesso, livro, cap, v1, v2) {
  const ponteiros = await comBanco(csDois(), (c) => c.query(
    `select o.ini, o.fim, o.banco, o.trecho, o.modo, f.fonte
       from oficina_idx o join oficina_fontes f on f.id = o.fonte_id
      where o.ini <= $2 and o.fim >= $1 and o.ini >= $1 - 60000
      limit 400`, [ini, fim]).then((r) => r.rows)).catch(() => []);
  if (!ponteiros || !ponteiros.length) return { autores: [], descobertas: await descobertasDe(livro, cap, v1, v2) };
  ponteiros.sort((x, y) => (MODO_ORDEM[x.modo] - MODO_ORDEM[y.modo]));
  const escolhidos = ponteiros.slice(0, 150);
  const ids1 = escolhidos.filter((p) => p.banco === 1).map((p) => p.trecho);
  const ids2 = escolhidos.filter((p) => p.banco === 2).map((p) => p.trecho);
  const cols = 'id, autor, obra, livro, secao, tipo, texto, peso, aprovado';
  const [t1, t2] = await Promise.all([
    ids1.length ? comBanco(csBiblioteca(), (c) => c.query(`select ${cols} from biblioteca_trechos where id = any($1)`, [ids1]).then((r) => r.rows)).catch(() => []) : [],
    ids2.length ? comBanco(csDois(), (c) => c.query(`select ${cols} from biblioteca_trechos where id = any($1)`, [ids2]).then((r) => r.rows)).catch(() => []) : [],
  ]);
  const mapa = new Map();
  for (const x of (t1 || [])) mapa.set('1:' + x.id, x);
  for (const x of (t2 || [])) mapa.set('2:' + x.id, x);
  const limite = acesso === 'servidor' ? 3000 : 300;
  const porAutor = new Map();
  const vistos = new Set();
  for (const p of escolhidos) {
    const x = mapa.get(p.banco + ':' + p.trecho);
    if (!x) continue;                       // o trecho saiu do banco: o ponteiro velho é ignorado
    const chaveT = x.autor + '|' + String(x.texto).slice(0, 60);
    if (vistos.has(chaveT)) continue;
    vistos.add(chaveT);
    const lista = porAutor.get(x.autor) || [];
    if (lista.length >= 2) continue;
    lista.push({
      autor: x.autor, obra: x.obra, secao: x.secao || x.livro || '', tipo: x.tipo, peso: x.peso,
      modo: rotuloDoModo(p), selo: selo(x), peso: x.peso, aprovado: x.aprovado !== false,
      trecho: trechoCurto(x.texto, cap, v1, limite),
    });
    porAutor.set(x.autor, lista);
    if (porAutor.size > 10 && !porAutor.has(x.autor)) break;
  }
  const autores = [...porAutor.values()].flat().slice(0, 24);
  return { autores, descobertas: await descobertasDe(livro, cap, v1, v2) };
}

// As descobertas das 4 camadas que cruzam o versículo (ou o intervalo pedido).
async function descobertasDe(livro, cap, v1, v2) {
  try {
    const linhas = await comBanco(csDois(), (c) => c.query(
      `select camada, titulo, explica, refs, fonte from oficina_descobertas
        where livro = $1 and cap = $2 and v1 <= $4 and v2 >= $3
        order by array_position(array['original','ecos','estrutura','contexto'], camada), id`,
      [livro, cap, v1, v2]).then((r) => r.rows));
    return (linhas || []).map((d) => ({ camada: d.camada, titulo: d.titulo, explica: d.explica, refs: d.refs || [], fonte: d.fonte || '' }));
  } catch (_) { return []; }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  if (Buffer.isBuffer(b)) { try { b = JSON.parse(b.toString('utf8')); } catch (_) { b = {}; } }
  b = b || {};

  const host = req.headers['x-forwarded-host'] || req.headers.host || 'radar-atual.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || (/^(localhost|127\.)/.test(host) ? 'http' : 'https');
  const bib = await carregarBiblia(proto + '://' + host);
  if (!bib) { res.status(200).json({ ok: false, err: 'a Almeida não carregou agora' }); return; }

  const r = lerRef(b, bib);
  if (!r) { res.status(400).json({ ok: false, err: 'referência não reconhecida (ex.: Mateus 28:19 ou Dn 9.27)' }); return; }
  const ini = R.chave(r.b, r.cap, r.v1), fim = R.chave(r.b, r.cap, r.v2);
  const rotulo = R.nomeRef(r.b, r.cap, r.v1, r.v2);

  // A porta: servidor (token da Bereia) ou aparelho/PIN do Elias. Sem nenhum dos dois, a parte dos livros fica fechada.
  const ADM = process.env.RADAR_ADMIN_TOKEN;
  let acesso = 'bloqueado';
  if (ADM && b.token === ADM) acesso = 'servidor';
  else {
    try { if (await liberado(b.cracha, b.token)) acesso = 'leitor'; } catch (_) { acesso = 'bloqueado'; }
  }

  const texto = R.textoIntervalo(bib, ini, fim, 12);
  const cr = await cruzadas(ini, fim, bib);
  const livros = acesso === 'bloqueado' ? null : await autoresDo(ini, fim, acesso, r.ab, r.cap, r.v1, r.v2);

  res.status(200).json({
    ok: true,
    ref: { rotulo, livro: r.ab, cap: r.cap, v1: r.v1, v2: r.v2 },
    texto,
    cruzadas: cr,
    credito: CREDITO,
    acesso,
    autores: livros ? livros.autores : null,
    descobertas: livros ? livros.descobertas : null,
    motivo: acesso === 'bloqueado' ? 'particular' : undefined,
  });
};

module.exports.lerRef = lerRef;
