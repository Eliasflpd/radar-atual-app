#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════
// INDEXADOR DA BUSCA POR SIGNIFICADO — roda no PC do Elias, nunca na Vercel.
//
// POR QUE ASSIM: a Vercel é plano Hobby (12 funções serverless, 11 já ocupadas).
// Não dá pra ter banco vetorial nem função nova. Então o índice é PRÉ-CALCULADO
// aqui e vira ARQUIVO ESTÁTICO em public/busca/. No celular do irmão a busca é
// matemática pura em JS (produto escalar) — não depende de servidor nenhum.
// Só a PERGUNTA vira vetor online, por /api/busca-vetor (rota do api/edge.js).
//
// COMO RODAR:
//   node scripts/indexar-busca.mjs mensagens     (24 mensagens, por parágrafo — rápido)
//   node scripts/indexar-busca.mjs biblia        (Bíblia inteira, janelas de 3 versículos)
//   node scripts/indexar-busca.mjs tudo
//
// MODELO: @cf/google/embeddinggemma-300m no Cloudflare Workers AI.
// 768 dims cortadas para 256 e renormalizadas — o EmbeddingGemma é treinado em
// Matryoshka (768/512/256/128), então o corte é previsto pelo modelo, não gambiarra.
//
// POR QUE NÃO O GEMINI (medido hoje, 19/09/2026, não é chute):
//   o free tier do gemini-embedding-2 conta CADA TEXTO como uma requisição e o teto
//   é 100 por minuto por chave (quotaId EmbedContentRequestsPerMinutePerUserPer-
//   ProjectPerModel-FreeTier). Com as 3 chaves do cofre dá 300 textos/min — a Bíblia
//   levaria ~50 min — e, pior, a cota do DIA acabou no meio da indexação e as três
//   chaves pararam de responder. Medido no Cloudflare: 2.588 textos/min, Bíblia
//   inteira em ~6 min. Voyage (chave já na Vercel) está preso em 3 req/min sem cartão.
//   A qualidade foi conferida nas 5 perguntas de prova: o EmbeddingGemma acertou as 5.
//
// PREFIXOS: o EmbeddingGemma exige os prefixos de tarefa dele. Sem isso a qualidade
// cai na hora (testado: 2 das 5 perguntas erravam o alvo).
//   documento -> "title: {titulo} | text: {conteudo}"
//   pergunta  -> "task: search result | query: {pergunta}"
//
// CREDENCIAIS: CF_ACCOUNT_ID e CF_AI_TOKEN no ambiente, ou o cofre D:\APIS-CLAUDE\CHAVES.md.
//
// RETOMA DE ONDE PAROU: grava checkpoint em scripts/.cache-busca/. Se cair a luz,
// é só rodar de novo.
// ══════════════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'public', 'busca');
const CACHE = path.join(RAIZ, 'scripts', '.cache-busca');

const DIMS = 256;          // 768 → 256 (Matryoshka). Mantém a ordem dos resultados e corta 3x o peso.
const LOTE = 96;           // medido: 100 por chamada passa fácil, ~2.600 textos/min
const MODELO = '@cf/google/embeddinggemma-300m';
const LANES = 3;           // 3 chamadas ao mesmo tempo; o Cloudflare aguenta com folga

const CF_ACC = process.env.CF_ACCOUNT_ID || 'fb7827d5932678d1d561998c3d7fda40';
const CF_TOK = (function () {
  if (process.env.CF_AI_TOKEN) return process.env.CF_AI_TOKEN;
  for (const cofre of ['D:/APIS-CLAUDE/CHAVES.md', 'D:\\APIS-CLAUDE\\CHAVES.md']) {
    try {
      const m = fs.readFileSync(cofre, 'utf8').match(/\b(cfut_[A-Za-z0-9]{30,})\b/);
      if (m) return m[1];
    } catch { /* sem cofre neste PC */ }
  }
  return '';
})();
if (!CF_TOK) { console.error('✖ Falta CF_AI_TOKEN (Cloudflare Workers AI).'); process.exit(1); }

// ─── motor de embedding, com paciência ────────────────────────────────────────
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

// Corta 768 → 256 e renormaliza. Renormalizar é obrigatório: depois do corte o
// vetor perde norma, e sem norma 1 o cosseno deixa de ser cosseno.
function cortar(v) {
  let s = 0;
  const w = v.slice(0, DIMS);
  for (const x of w) s += x * x;
  s = Math.sqrt(s) || 1;
  for (let i = 0; i < w.length; i++) w[i] /= s;
  return w;
}

async function embutir(textos) {
  let ultimo = '';
  for (let tent = 0; tent < 10; tent++) {
    try {
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACC}/ai/run/${MODELO}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${CF_TOK}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textos })
      });
      if (r.ok) {
        const j = await r.json();
        const v = j.result?.data || j.result?.response;
        if (!Array.isArray(v) || v.length !== textos.length) throw new Error('resposta fora do formato');
        return v.map(cortar);
      }
      ultimo = `${r.status} ${(await r.text()).slice(0, 140).replace(/\s+/g, ' ')}`;
      if (r.status === 429 || r.status >= 500) { await dorme(4000 * (tent + 1)); continue; }
      throw new Error(`Cloudflare ${ultimo}`);        // 400/403: erro nosso, insistir não resolve
    } catch (err) {
      ultimo = String(err.message || err);
      if (/^Cloudflare 4/.test(ultimo)) throw err;
      await dorme(3000 * (tent + 1));
    }
  }
  throw new Error(`Cloudflare desistiu após 10 tentativas: ${ultimo}`);
}

// ─── quantização int8 ─────────────────────────────────────────────────────────
// Um único fator de escala para o acervo inteiro. Como só interessa a ORDEM dos
// resultados, a constante some no ranking — e cada número vira 1 byte em vez de 4.
function paraInt8(vetores) {
  let pico = 0;
  for (const v of vetores) for (const x of v) { const a = Math.abs(x); if (a > pico) pico = a; }
  const escala = 127 / pico;
  const buf = Buffer.alloc(vetores.length * DIMS);
  let i = 0;
  for (const v of vetores) for (const x of v) {
    let q = Math.round(x * escala);
    buf[i++] = (q > 127 ? 127 : q < -127 ? -127 : q) & 0xff;   // int8 em complemento de dois
  }
  return { buf, escala: pico / 127 };
}

// ─── varredura com checkpoint ─────────────────────────────────────────────────
// Checkpoint é BINÁRIO e só cresce no fim (float32 cru). A Bíblia dá ~15 mil
// vetores: gravar isso em JSON a cada lote fazia o script passar mais tempo
// escrevendo disco do que falando com o Google.
async function varrer(nome, pedacos) {
  fs.mkdirSync(CACHE, { recursive: true });
  const ckpt = path.join(CACHE, `${nome}.f32`);
  const selo = path.join(CACHE, `${nome}.selo.json`);
  const assinatura = { total: pedacos.length, dims: DIMS, modelo: MODELO };
  let prontos = 0;
  try {
    if (JSON.stringify(JSON.parse(fs.readFileSync(selo, 'utf8'))) === JSON.stringify(assinatura)) {
      prontos = Math.floor(fs.statSync(ckpt).size / (DIMS * 4));
      if (prontos) console.log(`  ↻ retomando: ${prontos}/${pedacos.length} já prontos`);
    }
  } catch { prontos = 0; }
  if (!prontos) { fs.writeFileSync(ckpt, Buffer.alloc(0)); fs.writeFileSync(selo, JSON.stringify(assinatura)); }

  // LANES lotes ao mesmo tempo. Só grava quando a rodada inteira volta — assim o
  // arquivo continua estritamente em ordem e a retomada por tamanho segue exata.
  const t0 = Date.now(), inicio = prontos;
  while (prontos < pedacos.length) {
    const rodada = [];
    for (let e = 0; e < LANES; e++) {
      const de = prontos + e * LOTE;
      if (de >= pedacos.length) break;
      rodada.push(embutir(pedacos.slice(de, de + LOTE).map((p) => p.texto)));
    }
    const lotes = await Promise.all(rodada);
    for (const vs of lotes) {
      const buf = Buffer.alloc(vs.length * DIMS * 4);
      vs.forEach((v, i) => v.forEach((x, j) => buf.writeFloatLE(x, (i * DIMS + j) * 4)));
      fs.appendFileSync(ckpt, buf);
      prontos += vs.length;
    }
    const seg = (Date.now() - t0) / 1000;
    const falta = seg / Math.max(1, prontos - inicio) * (pedacos.length - prontos);
    console.log(`  ${nome}: ${prontos}/${pedacos.length} (${((prontos / pedacos.length) * 100).toFixed(1)}%) · faltam ~${Math.round(falta / 60)}min`);
  }
  const cru = fs.readFileSync(ckpt);
  const feitos = [];
  for (let i = 0; i < pedacos.length; i++) {
    const v = new Array(DIMS);
    for (let j = 0; j < DIMS; j++) v[j] = cru.readFloatLE((i * DIMS + j) * 4);
    feitos.push(v);
  }
  return feitos;
}

async function gravar(nome, pedacos, extra = {}) {
  const vetores = await varrer(nome, pedacos);
  const { buf, escala } = paraInt8(vetores);
  fs.mkdirSync(SAIDA, { recursive: true });
  fs.writeFileSync(path.join(SAIDA, `${nome}.vec.bin`), buf);
  const meta = { modelo: MODELO, dims: DIMS, escala, total: pedacos.length, gerado: new Date().toISOString().slice(0, 10), ...extra };
  fs.writeFileSync(path.join(SAIDA, `${nome}.idx.json`), JSON.stringify(meta));
  const mb = (buf.length / 1048576).toFixed(2);
  const kb = (fs.statSync(path.join(SAIDA, `${nome}.idx.json`)).size / 1024).toFixed(1);
  console.log(`  ✔ ${nome}: ${pedacos.length} trechos · vetores ${mb} MB · catálogo ${kb} KB`);
}

// ══ FASE 1 — O ACERVO DO ELIAS (mensagens, por parágrafo) ═════════════════════
function limparHTML(s) {
  return s
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&hellip;/g, '…').replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ').trim();
}

function pedacosMensagens() {
  const dir = path.join(RAIZ, 'public', 'biblioteca', 'mensagens');
  const idx = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

  // o índice das mensagens é o CRM do Elias: título, referência e emoji saem de lá
  const fichas = {};
  for (const m of idx.matchAll(/arquivo\s*:\s*['"]([^'"]+)['"]([\s\S]{0,700}?)desc\s*:/g)) {
    const bloco = m[2];
    const pega = (k) => { const x = bloco.match(new RegExp(k + "\\s*:\\s*['\"]([\\s\\S]*?)['\"]\\s*,")); return x ? x[1] : ''; };
    fichas[m[1]] = { titulo: pega('titulo'), ref: pega('ref'), emoji: pega('emoji') };
  }

  const pedacos = [], docs = [];
  for (const arq of fs.readdirSync(dir).filter((f) => f.endsWith('.html') && f !== 'index.html').sort()) {
    const html = fs.readFileSync(path.join(dir, arq), 'utf8');
    const corpo = html.split(/<\/style>/i).pop();
    const ficha = fichas[arq] || {};
    const titulo = ficha.titulo || limparHTML((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [, arq])[1]);
    const ref = ficha.ref || limparHTML((corpo.match(/<div class="ref"[^>]*>([\s\S]*?)<\/div>/i) || [, ''])[1]);

    const blocos = [...corpo.matchAll(/<(p|div class="grito")[^>]*>([\s\S]*?)<\/(?:p|div)>/gi)]
      .map((m) => limparHTML(m[2])).filter((t) => t.length > 90);

    const d = docs.length;
    docs.push({ a: arq, t: titulo, r: ref, e: ficha.emoji || '📖' });
    for (let i = 0; i < blocos.length; i++) {
      // emenda parágrafo curto no seguinte: trecho de ~2 frases não responde pergunta nenhuma
      let txt = blocos[i];
      if (txt.length < 240 && blocos[i + 1]) { txt += ' ' + blocos[i + 1]; i++; }
      // aqui o título ENTRA (é título de verdade, dá o assunto da mensagem), mas a
      // referência bíblica fica de fora — ver a nota em pedacosBiblia().
      pedacos.push({ texto: `title: ${titulo} | text: ${txt}`, d, p: i, trecho: txt.slice(0, 460) });
    }
  }
  return { pedacos, docs };
}

// ══ FASE 2 — A BÍBLIA (public/biblia.json, texto que o app JÁ tem) ════════════
// Janela de 3 versículos andando de 2 em 2, dentro do capítulo. Metade dos vetores
// de uma indexação versículo a versículo, e responde muito melhor: pergunta de
// gente ("Deus parece estar em silêncio") casa com PASSAGEM, não com frase solta.
function pedacosBiblia() {
  const bib = JSON.parse(fs.readFileSync(path.join(RAIZ, 'public', 'biblia.json'), 'utf8').replace(/^\uFEFF/, ''));
  const livros = bib.map((L) => ({ a: L.abbrev, n: L.name }));
  const pedacos = [];
  bib.forEach((L, li) => {
    L.chapters.forEach((cap, ci) => {
      for (let v = 0; v < cap.length; v += 2) {
        const fim = Math.min(v + 3, cap.length);
        const texto = cap.slice(v, fim).join(' ');
        // "title: none" DE PROPÓSITO. Medido em Gênesis: pôr a referência no título
        // ("title: Gênesis 33:1-3") espalha o cheiro de Jacó por todo o livro e a
        // busca "a escada que Jacó viu" caía em Gênesis 33, 31 e 29. Com "none",
        // Gênesis 28:11 sobe para o primeiro lugar. A referência a gente já tem no
        // catálogo — ela não precisa (nem deve) entrar no vetor.
        pedacos.push({ texto: `title: none | text: ${texto}`, l: li, c: ci, v, f: fim });
        if (fim >= cap.length) break;
      }
    });
  });
  return { pedacos, livros };
}

// ══ comando ═══════════════════════════════════════════════════════════════════
const alvo = (process.argv[2] || 'tudo').toLowerCase();
console.log(`🔎 Indexador da Busca por Significado · ${MODELO} · ${DIMS} dims · int8\n`);

if (alvo === 'mensagens' || alvo === 'tudo') {
  const { pedacos, docs } = pedacosMensagens();
  console.log(`📜 Acervo do Elias: ${docs.length} mensagens → ${pedacos.length} trechos`);
  await gravar('mensagens', pedacos, { docs, itens: pedacos.map((p) => [p.d, p.p, p.trecho]) });
}
if (alvo === 'biblia' || alvo === 'tudo') {
  const { pedacos, livros } = pedacosBiblia();
  console.log(`📖 Bíblia (public/biblia.json): ${pedacos.length} passagens`);
  await gravar('biblia', pedacos, { livros, itens: pedacos.map((p) => [p.l, p.c, p.v, p.f]) });
}
console.log('\n✅ Índice gravado em public/busca/');
