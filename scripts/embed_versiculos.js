#!/usr/bin/env node
/**
 * MOTOR DE LIGAÇÕES — gerador de embeddings dos versículos da Bíblia.
 * Lê public/biblia.json, gera vetores (Gemini por padrão; Voyage via env) e
 * grava em versiculo_embeddings (pgvector). IDEMPOTENTE: pula o que já tem vetor.
 *
 * Uso:
 *   RADAR_DB="postgres://..." GEMINI_API_KEY="AIza..." BOOKS="jo" node scripts/embed_versiculos.js
 *
 * Env:
 *   RADAR_DB        connection string do Postgres (obrigatório)
 *   BOOKS           abbrevs separados por vírgula. Ex: "jo" | "jo,sl" | "ALL" (default: jo)
 *   EMB_PROVIDER    "gemini" (default) | "voyage"
 *   GEMINI_API_KEY  chave Gemini (se provider=gemini)
 *   GEMINI_MODEL    default gemini-embedding-001
 *   VOYAGE_API_KEY  chave Voyage (se provider=voyage)  -> escalar Bíblia inteira (200M tokens grátis)
 *   VOYAGE_MODEL    default voyage-3.5
 *   EMB_DIM         dimensão de saída (default 768 — precisa casar com a coluna vector(768))
 *   BATCH           itens por request (default 100)
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const CS = process.env.RADAR_DB;
if (!CS) { console.error('FALTA RADAR_DB'); process.exit(1); }
const PROVIDER = (process.env.EMB_PROVIDER || 'gemini').toLowerCase();
const DIM = parseInt(process.env.EMB_DIM || '768', 10);
const BATCH = parseInt(process.env.BATCH || '100', 10);
const BOOKS = (process.env.BOOKS || 'jo').toLowerCase();
const GKEY = process.env.GEMINI_API_KEY;
const GMODEL = process.env.GEMINI_MODEL || 'gemini-embedding-001';
const VKEY = process.env.VOYAGE_API_KEY;
const VMODEL = process.env.VOYAGE_MODEL || 'voyage-3.5';

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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GMODEL}:batchEmbedContents?key=${GKEY}`;
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

  // idempotência: pula refs que já têm embedding
  const jaR = await c.query('select ref from versiculo_embeddings where embedding is not null');
  const ja = new Set(jaR.rows.map(x => x.ref));
  const pend = alvo.filter(a => !ja.has(a.ref));
  console.log(`Já embutidos: ${ja.size}. Pendentes: ${pend.length}.`);
  if (!pend.length) { console.log('Nada a fazer.'); await c.end(); return; }

  let feito = 0;
  for (let i = 0; i < pend.length; i += BATCH) {
    const lote = pend.slice(i, i + BATCH);
    let vetores;
    for (let tent = 1; ; tent++) {
      try { vetores = await embed(lote.map(x => x.texto)); break; }
      catch (e) {
        if (tent >= 5) throw e;
        const wait = 2000 * tent;
        console.warn(`  retry ${tent} (${String(e).slice(0, 80)}) — esperando ${wait}ms`);
        await sleep(wait);
      }
    }
    // upsert do lote
    for (let k = 0; k < lote.length; k++) {
      const a = lote[k], vec = '[' + vetores[k].join(',') + ']';
      await c.query(
        `insert into versiculo_embeddings (ref,abbrev,livro,cap,ver,texto,modelo,dim,embedding)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9::vector)
         on conflict (ref) do update set texto=excluded.texto, modelo=excluded.modelo,
           dim=excluded.dim, embedding=excluded.embedding`,
        [a.ref, a.abbrev, a.livro, a.cap, a.ver, a.texto, PROVIDER === 'voyage' ? VMODEL : GMODEL, DIM, vec]);
    }
    feito += lote.length;
    console.log(`  ${feito}/${pend.length} (${((feito / pend.length) * 100).toFixed(0)}%)`);
    // Gemini free tier = 100 requests/min (o batch conta cada item). Espera 1 min entre lotes de 100.
    const pace = parseInt(process.env.PACE_MS || (PROVIDER === 'gemini' ? '62000' : '300'), 10);
    if (i + BATCH < pend.length) { console.log(`  aguardando ${pace}ms (quota)...`); await sleep(pace); }
  }

  const tot = await c.query('select count(*) n from versiculo_embeddings where embedding is not null');
  console.log(`OK. Total no banco: ${tot.rows[0].n}`);
  await c.end();
})().catch(e => { console.error('ERRO', e); process.exit(1); });
