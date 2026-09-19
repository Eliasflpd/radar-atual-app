#!/usr/bin/env node
// PROVA da Busca por Significado — repete, fora do navegador, exatamente a mesma
// conta que a página faz: pergunta -> vetor (RETRIEVAL_QUERY) -> produto escalar
// contra o índice int8 de public/busca/. Serve pra conferir a qualidade sem
// depender de tela. Não vai pro app; é ferramenta de bancada.
//   node scripts/_provar-busca.mjs "medo de morrer"
//   node scripts/_provar-busca.mjs            (roda as 5 perguntas de prova)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'public', 'busca');
const MODELO = '@cf/google/embeddinggemma-300m';
const CF_ACC = process.env.CF_ACCOUNT_ID || 'fb7827d5932678d1d561998c3d7fda40';
const CF_TOK = process.env.CF_AI_TOKEN ||
  (fs.readFileSync('D:/APIS-CLAUDE/CHAVES.md', 'utf8').match(/\b(cfut_[A-Za-z0-9]{30,})\b/) || [])[1] || '';

// mesmíssimo caminho do /api/busca-vetor: prefixo de pergunta, corte em 256, renormaliza
async function vetorPergunta(q) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACC}/ai/run/${MODELO}`, {
    method: 'POST', headers: { Authorization: `Bearer ${CF_TOK}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: [`task: search result | query: ${q}`] })
  });
  if (!r.ok) throw new Error('Cloudflare ' + r.status + ' ' + (await r.text()).slice(0, 120));
  const j = await r.json();
  const v = (j.result?.data || j.result?.response)[0].slice(0, 256);
  let s = 0; for (const x of v) s += x * x; s = Math.sqrt(s) || 1;
  return v.map((x) => x / s);
}

function abrir(nome) {
  const meta = JSON.parse(fs.readFileSync(path.join(SAIDA, `${nome}.idx.json`), 'utf8'));
  const vet = new Int8Array(fs.readFileSync(path.join(SAIDA, `${nome}.vec.bin`)).buffer.slice(0));
  return { meta, vet };
}
function ranquear(ix, q, quantos) {
  const D = ix.meta.dims, N = ix.meta.total, V = ix.vet, out = [];
  for (let i = 0; i < N; i++) {
    let s = 0; const b = i * D;
    for (let j = 0; j < D; j++) s += q[j] * V[b + j];
    out.push({ i, cos: s * (ix.meta.escala || 1) });
  }
  out.sort((a, b) => b.cos - a.cos);
  return out.slice(0, quantos);
}

const PERGUNTAS = process.argv[2] ? [process.argv.slice(2).join(' ')] : [
  'perdoar quem não pediu perdão',
  'medo de morrer',
  'Deus parece estar em silêncio',
  'meu filho se afastou da igreja',
  'a escada que Jacó viu'
];

const ACERVO = fs.existsSync(path.join(SAIDA, 'mensagens.idx.json')) ? abrir('mensagens') : null;
const BIBLIA = fs.existsSync(path.join(SAIDA, 'biblia.idx.json')) ? abrir('biblia') : null;
const BIB = BIBLIA ? JSON.parse(fs.readFileSync(path.join(RAIZ, 'public', 'biblia.json'), 'utf8').replace(/^\uFEFF/, '')) : null;

for (const q of PERGUNTAS) {
  const v = await vetorPergunta(q);
  console.log('\n' + '═'.repeat(78));
  console.log('❓ ' + q);
  console.log('═'.repeat(78));

  if (ACERVO) {
    const t0 = performance.now();
    const brutos = ranquear(ACERVO, v, 40);
    const vistos = new Set(), top = [];
    for (const r of brutos) { const d = ACERVO.meta.itens[r.i][0]; if (vistos.has(d)) continue; vistos.add(d); top.push(r); if (top.length === 3) break; }
    const ms = (performance.now() - t0).toFixed(1);
    console.log(`\n📜 NAS MENSAGENS DO ELIAS  (${ACERVO.meta.total} trechos · ${ms} ms)`);
    top.forEach((r, n) => {
      const it = ACERVO.meta.itens[r.i], d = ACERVO.meta.docs[it[0]];
      console.log(`  ${n + 1}. [${Math.round(r.cos * 100)}%] ${d.t} — ${d.r}`);
      console.log(`     ${it[2].slice(0, 200).replace(/\s+/g, ' ')}…`);
    });
  }
  if (BIBLIA) {
    const t0 = performance.now();
    const brutos = ranquear(BIBLIA, v, 60);
    const caps = new Set(), top = [];
    for (const r of brutos) { const it = BIBLIA.meta.itens[r.i], c = it[0] + '_' + it[1]; if (caps.has(c)) continue; caps.add(c); top.push(r); if (top.length === 3) break; }
    const ms = (performance.now() - t0).toFixed(1);
    console.log(`\n📖 NA BÍBLIA  (${BIBLIA.meta.total} passagens · ${ms} ms)`);
    top.forEach((r, n) => {
      const it = BIBLIA.meta.itens[r.i], L = BIB[it[0]];
      const ref = `${L.name} ${it[1] + 1}:${it[2] + 1}${it[3] > it[2] + 1 ? '-' + it[3] : ''}`;
      console.log(`  ${n + 1}. [${Math.round(r.cos * 100)}%] ${ref}`);
      console.log(`     ${L.chapters[it[1]].slice(it[2], it[3]).join(' ').slice(0, 220)}…`);
    });
  }
}
console.log('');
