// ═══════════════════════════════════════════════════════════════════════════════
// PERGUNTE À LIÇÃO — api/_lib/pergunte.js   (URL: POST /api/pergunte → /api/edge?fn=pergunte)
//
// O aluno digita uma dúvida na lição da EBD e recebe:
//   1. uma resposta curta (2 a 4 frases), ESCRITA AQUI com palavras originais, a partir da própria
//      lição e do ensino do Dr. Wagner (trechos que ficam SÓ no servidor);
//   2. o VÍDEO do Dr. Wagner aberto no segundo em que ele explica aquilo (título, data e segundo).
//
// LEIS DESTE ARQUIVO (mesmas da Biblioteca — leia api/_lib/biblioteca.js):
//   • o texto do Dr. Wagner (transcrições) NUNCA desce para o celular: a resposta JSON traz só a
//     resposta original, id do vídeo, segundo, título e data;
//   • a resposta é conferida: se repetir 9 palavras seguidas de um trecho do autor, é descartada;
//   • a tabela de segundos (api/_lib/pergunte-tempos.js) guarda só chave → segundos, sem texto;
//   • a busca no ensino do Dr. Wagner passa pela rota interna de sempre (/api/dados?fn=biblioteca,
//     com RADAR_ADMIN_TOKEN, servidor-a-servidor). Nada de banco aqui: a rota é Edge (sem pg).
//
// PROTEÇÃO CONTRA ABUSO (cada pergunta gasta IA e busca): pergunta com teto de 300 caracteres,
// lição validada, limite por IP (8 perguntas a cada 10 min, por instância), cache de 6 h para a
// mesma pergunta na mesma lição. Nada disso é registrado com o texto da pergunta.
// ═══════════════════════════════════════════════════════════════════════════════
import { iaTexto } from './ia.js';
import TEMPOS from './pergunte-tempos.js';

const TURMA = /^(adulto|jovem)[1-9]$/;
const WAGNER = 'Dr. Wagner Cordeiro';
const CANAL = 'Pregações do canal (YouTube)';
const MAX_PERGUNTA = 300;
const JANELA_MS = 10 * 60 * 1000, MAX_POR_JANELA = 8;
const CACHE_MS = 6 * 3600 * 1000;

const usos = new Map();   // ip -> [timestamps]
const cache = new Map();  // chave -> { t, corpo }

const JSON_HDR = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const resp = (corpo, status = 200) => new Response(JSON.stringify(corpo), { status, headers: JSON_HDR });

// Mesma função do offline (pergunte-licao/exportar-trechos.mjs): FNV-1a 32 bits dos 200 primeiros caracteres.
export function chaveDoTrecho(texto) {
  const s = String(texto).slice(0, 200); let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
const frasesDo = (t) => String(t).split(/(?<=[.!?…])\s+/);
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const palavrasSeq = (s) => semAcento(s).match(/[a-z0-9]+/g) || [];
const PARADAS = new Set(['porque', 'como', 'qual', 'quais', 'quando', 'onde', 'sobre', 'entre', 'deus', 'senhor', 'para',
  'pelo', 'pela', 'uma', 'umas', 'uns', 'isso', 'esse', 'essa', 'aquele', 'aquela', 'muito', 'mais', 'tambem', 'quem',
  'seria', 'fazer', 'ser', 'estar', 'foi', 'sao', 'licao', 'texto', 'dizer', 'falar', 'explica', 'explique', 'minha', 'meu']);
const conteudo = (s) => [...new Set((semAcento(s).match(/[a-z]{4,}/g) || []).filter((w) => !PARADAS.has(w)))];

function podeAgora(ip) {
  const agora = Date.now();
  const lista = (usos.get(ip) || []).filter((t) => agora - t < JANELA_MS);
  if (lista.length >= MAX_POR_JANELA) { usos.set(ip, lista); return false; }
  lista.push(agora); usos.set(ip, lista);
  if (usos.size > 5000) usos.clear();
  return true;
}

// Ensino do Dr. Wagner para a pergunta: pelo mesmo motor da Biblioteca (busca por sentido + Joeira).
async function ensinoDoWagner(origem, pergunta) {
  const tk = process.env.RADAR_ADMIN_TOKEN || '';
  if (!tk) return [];
  try {
    const r = await fetch(origem + '/api/dados?fn=biblioteca', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: pergunta.slice(0, 300), n: 8, autor: WAGNER, token: tk }),
      signal: AbortSignal.timeout(12000),
    });
    const d = await r.json();
    return ((d && d.ok && d.itens) || []).filter((x) => x && x.texto && x.autor === WAGNER);
  } catch (_) { return []; }
}

// A lição (revista) vem do próprio site: é público. Monta o contexto pelos blocos mais ligados à dúvida.
function contextoDaLicao(L, pergunta) {
  const chaves = new Set(conteudo(pergunta));
  const blocos = [];
  const pontua = (txt) => conteudo(txt).reduce((s, w) => s + (chaves.has(w) ? 1 : 0), 0);
  if (L.introducao) blocos.push({ p: 0, t: L.introducao });
  for (const t of L.topicos || []) for (const s of t.subtopicos || []) {
    const t2 = (s.titulo ? s.titulo + '. ' : '') + (s.texto || '');
    blocos.push({ p: pontua(t2), t: t2 });
  }
  if (L.conclusao) blocos.push({ p: 0, t: L.conclusao });
  blocos.sort((a, b) => b.p - a.p);
  const out = []; let tam = 0;
  for (const b of blocos) { if (tam + b.t.length > 3800) continue; out.push(b.t); tam += b.t.length; }
  return out.join('\n');
}

const SYS = `Você ajuda um aluno da Escola Dominical de uma igreja Assembleia de Deus (linha pentecostal clássica) a entender a lição desta semana.
Responda à dúvida do aluno em 2 a 4 frases curtas, em português do Brasil, com palavras SUAS.
- Baseie a resposta na LIÇÃO. Se a lição não tratar do assunto, responda mesmo assim, com cuidado e sem inventar, a partir da Bíblia e dos TRECHOS DE REFERÊNCIA, e diga numa frase que a lição desta semana trata de outro ponto. Nunca mande o aluno procurar outro estudo.
- Os TRECHOS DE REFERÊNCIA são do ensino do Dr. Wagner Cordeiro: use só o SENTIDO. NUNCA copie frases deles; escreva com outras palavras.
- Não cite livro, comentarista ou versículo que não esteja na lição. Não comece com "Igreja,". Sem títulos, listas, aspas ou negrito.
- Doutrina: a Escritura como autoridade; Deus soberano e o ser humano responsável diante dele; nada fora da linha pentecostal clássica.
- Devolva SOMENTE o texto da resposta.`;

function sobrepoe(resposta, fontes) {
  const r = palavrasSeq(resposta), set = new Set();
  for (let i = 0; i + 9 <= r.length; i++) set.add(r.slice(i, i + 9).join(' '));
  for (const f of fontes) {
    const w = palavrasSeq(f);
    for (let i = 0; i + 9 <= w.length; i++) if (set.has(w.slice(i, i + 9).join(' '))) return true;
  }
  return false;
}

// O momento do vídeo: a frase do trecho que mais casa com a dúvida (e com a resposta). Só entra quem tem segundo.
function escolherMomentos(itens, pergunta, resposta) {
  const qQ = new Set(conteudo(pergunta)), qR = new Set(conteudo(resposta));
  const achados = [];
  itens.forEach((x, ordem) => {
    const linha = TEMPOS.t[chaveDoTrecho(x.texto)];
    if (!linha) return;
    const [vi, segs] = linha;
    const v = TEMPOS.v[vi];
    if (!v) return;
    const fr = frasesDo(x.texto);
    let melhor = -1, k0 = 0;
    fr.forEach((f, k) => {
      // frase curta ("Soberano.") não serve de momento: o alinhamento dela não é confiável
      if (palavrasSeq(f).length < 6) return;
      const ws = new Set(conteudo(f));
      let s = 0;
      for (const w of qQ) if (ws.has(w)) s += 2;
      for (const w of qR) if (ws.has(w)) s += 1;
      if (s > melhor) { melhor = s; k0 = k; }
    });
    const inicio = segs.length === fr.length ? segs[k0] : segs[0];
    achados.push({ ordem, score: melhor, id: v[0], data: v[1], titulo: v[2], inicio });
  });
  achados.sort((a, b) => (b.score - a.score) || (a.ordem - b.ordem));
  const vistos = new Set(), out = [];
  for (const a of achados) {
    if (vistos.has(a.id)) continue;
    vistos.add(a.id);
    const [y, m, d] = a.data.split('-');
    out.push({ id: a.id, inicio: a.inicio, titulo: a.titulo, data: `${d}/${m}/${y}` });
    if (out.length >= 2) break;
  }
  return out;
}

function limpar(txt) {
  let s = String(txt || '').replace(/\*\*/g, '').replace(/[‐‑]/g, '-').replace(/^["“”'\s]+|["“”'\s]+$/g, '').trim();
  if (s.length > 900) {
    const corte = s.slice(0, 900), ponto = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('! '), corte.lastIndexOf('? '));
    s = ponto > 300 ? corte.slice(0, ponto + 1) : corte;
  }
  return s;
}

export default async function pergunte(req) {
  if (req.method !== 'POST') return resp({ ok: false, erro: 'use POST' }, 405);
  let b;
  try { b = await req.json(); } catch (_) { return resp({ ok: false, erro: 'pedido inválido' }, 400); }
  const turma = String((b && b.turma) || ''), n = parseInt((b && b.n) || '', 10);
  const pergunta = String((b && b.pergunta) || '').replace(/\s+/g, ' ').trim();
  if (!TURMA.test(turma) || !(n >= 1 && n <= 26)) return resp({ ok: false, erro: 'lição inválida' }, 400);
  if (pergunta.length < 5 || pergunta.length > MAX_PERGUNTA) return resp({ ok: false, erro: `escreva entre 5 e ${MAX_PERGUNTA} caracteres` }, 400);

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'anon';
  const chave = turma + '|' + n + '|' + semAcento(pergunta).replace(/[^a-z0-9]+/g, ' ').trim();
  const achei = cache.get(chave);
  if (achei && Date.now() - achei.t < CACHE_MS) return resp(achei.corpo);
  if (!podeAgora(ip)) return resp({ ok: false, erro: 'Você já fez muitas perguntas nos últimos minutos. Tente de novo daqui a pouco.' }, 429);

  const origem = new URL(req.url).origin;
  const nn = String(n).padStart(2, '0');
  let L = null;
  try {
    const r = await fetch(`${origem}/ebd/${turma}/voz/${nn}.json`);
    if (r.ok) L = await r.json();
  } catch (_) { L = null; }
  if (!L) return resp({ ok: false, erro: 'não encontrei esta lição' }, 404);

  const itens = await ensinoDoWagner(origem, pergunta);
  const trechos = itens.slice(0, 4).map((x) => x.texto.slice(0, 1200));
  const user = `LIÇÃO "${L.titulo || ''}":\n${contextoDaLicao(L, pergunta)}\n\nTRECHOS DE REFERÊNCIA (não copiar):\n${trechos.map((t, i) => `[${i + 1}] ${t}`).join('\n\n') || '(nenhum)'}\n\nDÚVIDA DO ALUNO: ${pergunta}`;

  let resposta = '';
  try {
    for (let t = 0; t < 2; t++) {
      const r = await iaTexto({ sys: SYS, user, temperature: t ? 0.5 : 0.3, max_tokens: 500, tag: 'pergunte-licao' });
      resposta = limpar(r.texto);
      if (resposta && !sobrepoe(resposta, trechos)) break;
      resposta = '';
    }
  } catch (_) { resposta = ''; }
  if (!resposta) return resp({ ok: false, erro: 'Não consegui responder agora. Tente de novo em instantes.' }, 503);

  const videos = escolherMomentos(itens, pergunta, resposta);
  const corpo = { ok: true, licao: { turma, n }, resposta, videos, comEnsino: itens.length > 0 };
  cache.set(chave, { t: Date.now(), corpo });
  if (cache.size > 400) cache.clear();
  return resp(corpo);
}
