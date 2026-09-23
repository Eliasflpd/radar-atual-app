#!/usr/bin/env node
/**
 * MOTOR DE LIGAÇÕES — gerador de embeddings dos versículos da Bíblia.
 * Lê public/biblia.json, gera vetores (Gemini por padrão; Voyage via env) e
 * grava em versiculo_embeddings (pgvector).
 *
 * IDEMPOTENTE POR MODELO: pula o versículo que já tem vetor DAQUELE MESMO modelo. Se o
 * modelo mudar, ele regera tudo sozinho — porque vetor de um modelo não conversa com
 * consulta de outro (mesma dimensão NÃO quer dizer mesmo espaço vetorial).
 *
 * Uso:
 *   RADAR_DB="postgres://..." GEMINI_API_KEY="AIza..." BOOKS="jo" node scripts/embed_versiculos.js
 *
 * Reindexar a Bíblia inteira no Voyage (é o que a busca do RADAR usa):
 *   RADAR_DB="postgres://..." VOYAGE_API_KEY="pa-..." EMB_PROVIDER=voyage BOOKS=ALL \
 *     node scripts/embed_versiculos.js
 *   (com provider=voyage os defaults já viram dim 1024 e tabela versiculo_emb_voyage)
 *
 * Env:
 *   RADAR_DB        connection string do Postgres (obrigatório)
 *   BOOKS           abbrevs separados por vírgula. Ex: "jo" | "jo,sl" | "ALL" (default: jo)
 *   EMB_PROVIDER    "gemini" (default) | "voyage"
 *   GEMINI_API_KEY  chave Gemini (se provider=gemini)
 *   GEMINI_MODEL    default gemini-embedding-001
 *   VOYAGE_API_KEY  chave Voyage (se provider=voyage)  -> Bíblia inteira cabe folgado nos
 *                   200M tokens grátis (31.104 versículos ≈ 1,1M tokens)
 *   VOYAGE_MODEL    default voyage-4-lite (1024 dims nativo, dentro da cota grátis).
 *                   Os voyage-3.x saíram do free tier em 26/08/2026 — não usar.
 *   EMB_DIM         dimensão de saída (precisa casar com a coluna vector(N) da tabela)
 *                   default: 1024 no voyage, 768 no gemini
 *   EMB_TABLE       default: versiculo_emb_voyage no voyage, versiculo_embeddings no gemini
 *   BATCH           itens por request (default 100)
 *   REEMBUTIR       "1" regera tudo, mesmo o que já está no modelo alvo
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const CS = process.env.RADAR_DB;
if (!CS) { console.error('FALTA RADAR_DB'); process.exit(1); }
const PROVIDER = (process.env.EMB_PROVIDER || 'gemini').toLowerCase();
const VOY = PROVIDER === 'voyage';
// defaults por provedor: o Voyage escreve na vector(1024) de versiculo_emb_voyage, o
// Gemini na vector(768) de versiculo_embeddings. Errar isso só dá erro de SQL no final.
const DIM = parseInt(process.env.EMB_DIM || (VOY ? '1024' : '768'), 10);
const BATCH = parseInt(process.env.BATCH || '100', 10);
const TABLE = (process.env.EMB_TABLE || (VOY ? 'versiculo_emb_voyage' : 'versiculo_embeddings')).replace(/[^a-z0-9_]/gi, '');
const BOOKS = (process.env.BOOKS || 'jo').toLowerCase();
const REEMBUTIR = process.env.REEMBUTIR === '1';
// REVEZAMENTO DE CHAVES (23/09/2026) — medido na mão contra a API do Google:
// o teto do free tier é `EmbedContentRequestsPerMinutePerUserPerProjectPerModel = 100`,
// e um lote de 100 textos conta como 100 pedidos, NÃO como um. Ou seja: 100
// versículos por minuto por chave. A Bíblia inteira com uma chave só leva umas
// 5 horas; com as 3 chaves revezando, cai pra menos de 2. O limite é POR PROJETO,
// então revezar só ajuda se as chaves forem de projetos diferentes — que é o caso.
// Aceita GEMINI_API_KEYS com vírgula, ou a GEMINI_API_KEY de sempre.
const GKEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '')
  .split(/[,\s]+/).filter(Boolean);
let gAtual = 0;
const GKEY = GKEYS[0];
const proximaChave = () => { gAtual = (gAtual + 1) % GKEYS.length; return GKEYS[gAtual]; };
const GMODEL = process.env.GEMINI_MODEL || 'gemini-embedding-001';
const VKEY = process.env.VOYAGE_API_KEY;
// Ver nota no cabeçalho: voyage-3.x perdeu a cota grátis em 26/08/2026.
const VMODEL = process.env.VOYAGE_MODEL || 'voyage-4-lite';
const MODELO = VOY ? VMODEL : GMODEL;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// nomes canônicos (minúsculo, com acento) — batem com o padrão do estudo_trechos
const NOME = { gn:'gênesis', ex:'êxodo', lv:'levítico', nm:'números', dt:'deuteronômio',
  js:'josué', jz:'juízes', rt:'rute', '1sm':'1 samuel', '2sm':'2 samuel', '1rs':'1 reis',
  '2rs':'2 reis', '1cr':'1 crônicas', '2cr':'2 crônicas', ed:'esdras', ne:'neemias', et:'ester',
  'jó':'jó', sl:'salmos', pv:'provérbios', ec:'eclesiastes', ct:'cânticos', is:'isaías',
  jr:'jeremias', lm:'lamentações', ez:'ezequiel', dn:'daniel', os:'oséias', jl:'joel', am:'amós',
  ob:'obadias', jn:'jonas', mq:'miquéias', na:'naum', hc:'habacuque', sf:'sofonias', ag:'ageu',
  zc:'zacarias', ml:'malaquias', mt:'mateus', mc:'marcos', lc:'lucas', jo:'joão', atos:'atos',
  rm:'romanos', '1co':'1 coríntios', '2co':'2 coríntios', gl:'gálatas', ef:'efésios',
  fp:'filipenses', cl:'colossenses', '1ts':'1 tessalonicenses', '2ts':'2 tessalonicenses',
  '1tm':'1 timóteo', '2tm':'2 timóteo', tt:'tito', fm:'filemom', hb:'hebreus', tg:'tiago',
  '1pe':'1 pedro', '2pe':'2 pedro', '1jo':'1 joão', '2jo':'2 joão', '3jo':'3 joão', jd:'judas',
  ap:'apocalipse' };

// ---- provedores de embedding ----
async function embedGemini(texts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GMODEL}:batchEmbedContents?key=${GKEYS[gAtual]}`;
  const body = { requests: texts.map(t => ({ model: `models/${GMODEL}`, content: { parts: [{ text: t }] }, outputDimensionality: DIM })) };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('gemini ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  return j.embeddings.map(e => e.values);
}
async function embedVoyage(texts) {
  const r = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + VKEY },
    body: JSON.stringify({ model: VMODEL, input: texts, output_dimension: DIM, input_type: 'document' })
  });
  if (!r.ok) throw new Error('voyage ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  return j.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
}
const embed = PROVIDER === 'voyage' ? embedVoyage : embedGemini;

(async () => {
  if (PROVIDER === 'gemini' && !GKEY) { console.error('FALTA GEMINI_API_KEY'); process.exit(1); }
  if (PROVIDER === 'voyage' && !VKEY) { console.error('FALTA VOYAGE_API_KEY'); process.exit(1); }

  const bib = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'biblia.json'), 'utf8').replace(/^﻿/, ''));
  const wantAll = BOOKS === 'all';
  const wantSet = new Set(BOOKS.split(',').map(s => s.trim()));

  // monta a lista de versículos alvo
  const alvo = [];
  for (const liv of bib) {
    if (!wantAll && !wantSet.has(liv.abbrev)) continue;
    liv.chapters.forEach((cap, ci) => cap.forEach((txt, vi) => {
      alvo.push({ ref: `${liv.abbrev} ${ci + 1}:${vi + 1}`, abbrev: liv.abbrev,
        livro: NOME[liv.abbrev] || liv.name || liv.abbrev, cap: ci + 1, ver: vi + 1, texto: txt });
    }));
  }
  console.log(`Alvo: ${alvo.length} versículos (livros: ${wantAll ? 'TODOS' : [...wantSet].join(',')})`);

  const c = new Client({ connectionString: CS, ssl: { rejectUnauthorized: false } });
  await c.connect();

  console.log(`Tabela destino: ${TABLE} · modelo: ${MODELO} · dim: ${DIM}`);
  // O que já está gravado, por modelo — pra a troca de modelo ficar à vista.
  const inv = await c.query(
    `select modelo, dim, count(*)::int n from ${TABLE} where embedding is not null
      group by modelo, dim order by n desc`);
  inv.rows.forEach(r => console.log(`  no banco: ${r.n} com ${r.modelo} (${r.dim} dims)`));

  // Idempotência POR MODELO: só pula o que já está no modelo/dim alvo. Vetor de outro
  // modelo não serve — a consulta é feita no espaço do modelo atual.
  const jaR = await c.query(
    `select ref from ${TABLE} where embedding is not null and modelo=$1 and dim=$2`, [MODELO, DIM]);
  const ja = new Set(jaR.rows.map(x => x.ref));
  const pend = REEMBUTIR ? alvo : alvo.filter(a => !ja.has(a.ref));
  console.log(`Já em ${MODELO}: ${ja.size}. Pendentes: ${pend.length}.${REEMBUTIR ? ' (REEMBUTIR=1: regerando tudo)' : ''}`);
  if (!pend.length) { console.log('Nada a fazer.'); await c.end(); return; }

  let feito = 0;
  for (let i = 0; i < pend.length; i += BATCH) {
    const lote = pend.slice(i, i + BATCH);
    let vetores;
    for (let tent = 1; ; tent++) {
      try { vetores = await embed(lote.map(x => x.texto)); break; }
      catch (e) {
        const msg = String(e);
        const is429 = /\b429\b|rate limit/i.test(msg);
        if (tent >= (is429 ? 40 : 5)) throw e;
        // Bateu no teto: antes de DORMIR, tenta a próxima chave. O limite é por
        // projeto, então a chave seguinte costuma estar com o minuto zerado — e a
        // fila anda em vez de parar. Só quando todas já passaram é que espera o
        // minuto virar (o Google manda retryDelay de ~36s; 40s cobre com folga).
        if (is429 && !VOY && GKEYS.length > 1) {
          const antes = gAtual; proximaChave();
          if (gAtual !== antes && tent % GKEYS.length !== 0) {
            console.warn(`  teto da chave ${antes + 1} — passando pra chave ${gAtual + 1}`);
            continue;
          }
        }
        // 429 (trial Voyage = ~3 RPM/10K TPM): espera longa e crescente
        const wait = is429 ? Math.min(25000 + 5000 * tent, 60000) : 2000 * tent;
        console.warn(`  retry ${tent} (${msg.slice(0, 80)}) — esperando ${wait}ms`);
        await sleep(wait);
      }
    }
    // upsert do lote
    for (let k = 0; k < lote.length; k++) {
      const a = lote[k], vec = '[' + vetores[k].join(',') + ']';
      await c.query(
        `insert into ${TABLE} (ref,abbrev,livro,cap,ver,texto,modelo,dim,embedding)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9::vector)
         on conflict (ref) do update set texto=excluded.texto, modelo=excluded.modelo,
           dim=excluded.dim, embedding=excluded.embedding`,
        [a.ref, a.abbrev, a.livro, a.cap, a.ver, a.texto, MODELO, DIM, vec]);
    }
    feito += lote.length;
    console.log(`  ${feito}/${pend.length} (${((feito / pend.length) * 100).toFixed(0)}%)`);
    // Gemini free tier = 100 requests/min (o batch conta cada item). Espera 1 min entre lotes de 100.
    // ⚠️ MEDIDO em 23/09/2026, contra a API: o teto é
    // `EmbedContentRequestsPerMinutePerUserPerProjectPerModel-FreeTier = 100`, e NÃO
    // existe teto diário (conferido com um pedido sozinho depois da queda: HTTP 200).
    // Este PACE_MS estava certo — a primeira indexação morreu com 925 de 31.104 porque
    // EU estava testando a mesma chave por fora, ao mesmo tempo, e roubando a cota dele.
    // LIÇÃO: enquanto esta fila estiver rodando, não bater na mesma chave por fora.
    const pace = parseInt(process.env.PACE_MS || (PROVIDER === 'gemini' ? '62000' : '300'), 10);
    if (i + BATCH < pend.length) { console.log(`  aguardando ${pace}ms (quota)...`); await sleep(pace); }
  }

  const tot = await c.query(`select count(*) n from ${TABLE} where embedding is not null`);
  console.log(`OK. Total no banco: ${tot.rows[0].n}`);
  await c.end();
})().catch(e => { console.error('ERRO', e); process.exit(1); });
