#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════════
   OFICINA — o índice por versículo e as referências cruzadas (fase 1).

     node scripts/oficina-indice.mjs --cruzadas               (carrega o OpenBible no banco 2)
     node scripts/oficina-indice.mjs --tudo                   (refaz o índice de TODAS as fontes, dos dois bancos)
     node scripts/oficina-indice.mjs <fonte> [--capitulos]    (refaz só uma fonte; é o que o indexador chama no subir)

   O QUE FAZ:
   • oficina_refcruz: pares de versículos do OpenBible.info (CC-BY). Lido como DADO, do arquivo baixado em
     D:\RADAR-OFICINA\dados\ (pasta própria). Nada dele é executado.
   • oficina_idx: para cada trecho da biblioteca, as referências que ele COMENTA (seção estruturada: capítulo ou
     versículo de um comentário com cabeçalhos) ou CITA (referência escrita no texto). Guarda só PONTEIROS:
     intervalo (ini, fim), banco, id do trecho e a modalidade. O texto continua só nos bancos da biblioteca.
   • oficina_descobertas: tabela das descobertas das 4 camadas, gravadas pela sessão principal (fora deste script).

   ⚖️ NÃO APAGA NADA DA BIBLIOTECA. Só lê biblioteca_trechos (nos dois bancos) e escreve nas tabelas oficina_*
   do BANCO 2. O banco 1 é o do app no ar: aqui ele só é lido.

   Modalidades (coluna modo): 1 = comenta o versículo; 2 = cita no texto; 3 = comenta o capítulo inteiro.
   ══════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = require(path.join(RAIZ, 'api', '_lib', 'oficina-refs.js'));
const CACHE = process.env.BIBLIOTECA_CACHE || 'D:\\RADAR-BIBLIOTECA';
const DADOS = process.env.OFICINA_DADOS || 'D:\\RADAR-OFICINA\\dados';
const ALIMENTAR = process.env.RADAR_ALIMENTAR || 'D:\\RADAR-ALIMENTAR';

// As fontes fixas que o indexador marca com `capitulos: true` (a seção é capítulo/versículo de cabeçalho).
const CAPITULOS_FIXOS = new Set(['keil', 'duewel', 'edersheim', 'moldenke', 'wood', 'kittel']);

// Quais fontes da pasta de alimentação são por capítulo (fonte.json com "capitulos": true).
function capitulosDaAlimentacao() {
  const out = new Set();
  let nomes = [];
  try { nomes = fs.readdirSync(ALIMENTAR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch (_) { return out; }
  const slug = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  for (const n of nomes) {
    if (n.startsWith('_') || n.startsWith('.')) continue;
    try {
      const cfg = JSON.parse(fs.readFileSync(path.join(ALIMENTAR, n, 'fonte.json'), 'utf8'));
      if (cfg.capitulos) out.add('al-' + slug(cfg.id || n));
    } catch (_) { /* sem fonte.json: não é por capítulo */ }
  }
  return out;
}

// As credenciais saem do arquivo local do indexador — nunca impressas.
function credenciais() {
  const env = {};
  try {
    for (const l of fs.readFileSync(path.join(CACHE, '.env.indexador'), 'utf8').split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch (_) { /* sem arquivo: usa só o ambiente */ }
  return {
    banco1: process.env.RADAR_DB_DATABASE_URL || process.env.RADAR_DB || env.RADAR_DB,
    banco2: process.env.RADAR_DB2_DATABASE_URL || process.env.RADAR_DB2 || env.RADAR_DB2,
  };
}

const conectar = async (cs) => {
  const c = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  // Queda de rede derruba o socket: sem este tratador o processo morre. A nova tentativa fica por conta de quem chama.
  c.on('error', (e) => console.log('  (conexão caiu: ' + String(e.message).slice(0, 80) + ')'));
  await c.connect();
  return c;
};

// Tenta de novo quando a conexão cai (a fonte é refeita inteira, então repetir é seguro).
async function comNovaTentativa(rotulo, fn, tentativas = 4) {
  for (let i = 1; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (i >= tentativas) throw e;
      console.log(`  ${rotulo}: tentativa ${i} falhou (${String(e.message).slice(0, 60)}) — tentando de novo em 20 s`);
      await new Promise((r) => setTimeout(r, 20000));
    }
  }
}

const lerBiblia = () => {
  const arr = JSON.parse(fs.readFileSync(path.join(RAIZ, 'public', 'biblia.json'), 'utf8').replace(/^\uFEFF/, ''));
  const idx = {};
  for (const l of arr) idx[l.abbrev] = l.chapters;
  return idx;
};

// Tabelas da Oficina, no banco 2. Derivadas: podem ser recriadas à vontade (não guardam texto de livro).
async function criarTabelas(c) {
  await c.query(`create table if not exists oficina_fontes(
      id serial primary key, fonte text not null unique)`);
  await c.query(`create table if not exists oficina_idx(
      ini int not null, fim int not null, banco smallint not null, trecho bigint not null,
      fonte_id int not null, modo smallint not null)`);
  await c.query('create unique index if not exists oficina_idx_uq on oficina_idx(banco, trecho, ini, fim)');
  await c.query('create index if not exists oficina_idx_ini on oficina_idx(ini)');
  await c.query('create index if not exists oficina_idx_fonte on oficina_idx(fonte_id)');
  await c.query(`create table if not exists oficina_refcruz(
      de int not null, para_ini int not null, para_fim int not null, votos int not null)`);
  await c.query('create index if not exists oficina_refcruz_de on oficina_refcruz(de, votos desc)');
  await c.query(`create table if not exists oficina_descobertas(
      id serial primary key, livro text not null, cap int not null, v1 int not null, v2 int not null,
      camada text not null, titulo text not null, explica text not null, refs text[] not null default '{}',
      fonte text, origem text not null default 'claude-oficina', criado_em timestamptz not null default now())`);
  await c.query('create index if not exists oficina_descobertas_lc on oficina_descobertas(livro, cap)');
}

// Insere em lotes de multi-VALUES (parâmetros numerados).
async function lote(c, tabela, colunas, linhas, tam = 800) {
  for (let i = 0; i < linhas.length; i += tam) {
    const parte = linhas.slice(i, i + tam);
    const params = [];
    const vals = parte.map((l) => '(' + l.map((x) => { params.push(x); return '$' + params.length; }).join(',') + ')');
    await c.query(`insert into ${tabela}(${colunas.join(',')}) values ${vals.join(',')} on conflict do nothing`, params);
  }
}

const tamanhoMB = async (c) => Math.round(Number((await c.query('select pg_database_size(current_database())/1048576.0 mb')).rows[0].mb) * 10) / 10;

// ─── as referências cruzadas (OpenBible) ─────────────────────────────────────
export async function carregarCruzadas(arquivo = path.join(DADOS, 'cross_references.txt')) {
  const { banco2 } = credenciais();
  if (!banco2) throw new Error('sem RADAR_DB2');
  const bib = lerBiblia();
  const c = await conectar(banco2);
  try {
    await criarTabelas(c);
    const linhas = [];
    let semMapa = 0, fora = 0, cabecalho = true;
    const texto = fs.readFileSync(arquivo, 'utf8');
    for (const l of texto.split(/\r?\n/)) {
      if (cabecalho) { cabecalho = false; continue; }   // "From Verse  To Verse  Votes  # ..."
      if (!l.trim()) continue;
      const p = l.split('\t');
      const de = R.parseOB(p[0]);
      const votos = parseInt(p[2], 10);
      if (!de) { semMapa++; continue; }
      const [inicio, fimTok] = String(p[1] || '').split('-');
      const para = R.parseOB(inicio);
      const paraFim = fimTok ? R.parseOB(fimTok) : para;
      if (!para || !paraFim) { semMapa++; continue; }
      if (!R.existe(bib, de.b, de.c, de.v) || !R.existe(bib, para.b, para.c, para.v) || !R.existe(bib, paraFim.b, paraFim.c, paraFim.v)) { fora++; continue; }
      if (!(votos > 0)) continue;
      linhas.push([R.chave(de.b, de.c, de.v), R.chave(para.b, para.c, para.v), R.chave(paraFim.b, paraFim.c, paraFim.v), votos]);
    }
    await c.query('truncate oficina_refcruz');
    await lote(c, 'oficina_refcruz', ['de', 'para_ini', 'para_fim', 'votos'], linhas);
    const n = (await c.query('select count(*)::int n from oficina_refcruz')).rows[0].n;
    console.log(`cruzadas: ${n} pares gravados · ${semMapa} códigos não reconhecidos · ${fora} versículos fora da Almeida · banco 2 em ${await tamanhoMB(c)} MB`);
    return { gravados: n, semMapa, fora };
  } finally { await c.end(); }
}

// ─── o índice por versículo de UMA fonte (nos dois bancos) ───────────────────
async function refsDoTrecho(t, porCapitulo, bib) {
  const out = [], vistos = new Set();
  const add = (ini, fim, modo) => {
    const k = ini + ':' + fim;
    if (vistos.has(k)) return;
    vistos.add(k); out.push([ini, fim, modo]);
  };
  if (porCapitulo) {
    const d = R.refDaSecao(t.secao, bib);
    if (d && d.modo === 'verso') add(R.chave(d.b, d.cap, d.v1), R.chave(d.b, d.cap, d.v2), 1);
    else if (d) add(R.chave(d.b, d.cap, 1), R.chave(d.b, d.cap, 176), 3);
  }
  for (const r of R.achar(t.texto, bib).slice(0, 60)) add(R.chave(r.b, r.cap, r.v1), R.chave(r.b, r.cap, r.v2), 2);
  return out;
}

export async function reindexarFonte(fonte, { porCapitulo = false } = {}) {
  const { banco1, banco2 } = credenciais();
  if (!banco2) { console.log(`oficina: ${fonte} — sem RADAR_DB2, índice não refeito`); return { pulado: true }; }
  const bib = lerBiblia();
  const c2 = await conectar(banco2);
  const clientes = [];
  try {
    await criarTabelas(c2);
    const fr = await c2.query(`insert into oficina_fontes(fonte) values ($1) on conflict(fonte) do update set fonte = excluded.fonte returning id`, [fonte]);
    const fid = fr.rows[0].id;
    await c2.query('begin');
    await c2.query('delete from oficina_idx where fonte_id = $1', [fid]);
    const bancos = [['banco 1', banco1, 1], ['banco 2', banco2, 2]].filter((b) => b[1]);
    let total = 0, trechos = 0;
    for (const [nome, cs, num] of bancos) {
      const c = num === 2 ? c2 : await conectar(cs);
      if (num === 1) clientes.push(c);
      let ultimo = 0;
      for (;;) {
        const r = await c.query('select id, secao, texto from biblioteca_trechos where fonte = $1 and id > $2 order by id limit 400', [fonte, ultimo]);
        if (!r.rows.length) break;
        const linhas = [];
        for (const t of r.rows) {
          trechos++;
          for (const [ini, fim, modo] of await refsDoTrecho(t, porCapitulo, bib)) linhas.push([ini, fim, num, t.id, fid, modo]);
        }
        ultimo = r.rows[r.rows.length - 1].id;
        await lote(c2, 'oficina_idx', ['ini', 'fim', 'banco', 'trecho', 'fonte_id', 'modo'], linhas);
        total += linhas.length;
      }
      void nome;
    }
    await c2.query('commit');
    console.log(`oficina: ${fonte} — ${trechos} trechos lidos, ${total} ligações a versículos${porCapitulo ? ' (por capítulo)' : ''} · banco 2 em ${await tamanhoMB(c2)} MB`);
    return { trechos, ligacoes: total };
  } catch (e) {
    try { await c2.query('rollback'); } catch (_) { /* já fechou */ }
    throw e;
  } finally {
    for (const c of clientes) { try { await c.end(); } catch (_) { /* já fechou */ } }
    try { await c2.end(); } catch (_) { /* já fechou */ }
  }
}

// ─── principal (só quando chamado direto, não quando o indexador importa) ────
const DIRETO = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (DIRETO) {
  const args = process.argv.slice(2);
  (async () => {
    if (args.includes('--cruzadas')) {
      const i = args.indexOf('--cruzadas');
      const arquivo = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined;
      await carregarCruzadas(arquivo); return;
    }
    const capit = new Set([...CAPITULOS_FIXOS, ...capitulosDaAlimentacao()]);
    let fontes = [];
    if (args.includes('--tudo')) {
      const { banco1, banco2 } = credenciais();
      const ids = new Set();
      for (const cs of [banco1, banco2].filter(Boolean)) {
        const c = await conectar(cs);
        (await c.query('select distinct fonte from biblioteca_trechos')).rows.forEach((r) => ids.add(r.fonte));
        await c.end();
      }
      fontes = [...ids];
    } else {
      fontes = args.filter((a) => !a.startsWith('--'));
    }
    for (const f of fontes) {
      await comNovaTentativa(f, () => reindexarFonte(f, { porCapitulo: capit.has(f) || args.includes('--capitulos') }));
    }
  })().catch((e) => { console.error('✖ oficina:', String(e && e.message || e).slice(0, 200)); process.exitCode = 1; });
}
