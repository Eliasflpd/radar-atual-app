// REPASSE DE VÍDEO DO CURSO — GET /api/curso-video?id=<id do arquivo no Drive>
// (rewrite -> /api/edge?fn=curso-video)
//
// POR QUE EXISTE (14/10/2026): o player novo do curso toca o MP4 num <video> nativo (dá pra adiantar,
// retroceder, lembrar o minuto). Mas o Google só entrega o arquivo do Drive se o pedido NÃO vier de outro
// site: o navegador manda "Sec-Fetch-Site: cross-site" ao tocar a partir do radar-atual.vercel.app e o
// Google responde uma página HTML/403 (testado: de curl funciona, do navegador dá "formato inválido").
// Pedido feito por SERVIDOR não leva esse cabeçalho, então o repasse é feito aqui: o celular pede ao RADAR,
// o RADAR busca o trecho no Drive e devolve (com suporte a Range = adiantar/voltar sem baixar tudo).
//
// 🔒 TRAVAS:
//   • só repassa arquivo que esteja na lista de aulas do curso (senão virava proxy aberto do Drive de qualquer um);
//   • cada resposta é limitada a 16 MB: o navegador pede o resto em seguida. Evita transmissão de 300 MB
//     seguida (e desperdício quando a pessoa adianta o vídeo no meio).
//   • só GET/HEAD.
export const config = { runtime: 'edge' };

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS', 'Access-Control-Allow-Headers': 'Range,Content-Type' };
const ORIGEM = 'https://radar-atual.vercel.app';
const ID_OK = /^[A-Za-z0-9_-]{20,70}$/;
const FATIA = 16 * 1024 * 1024;

let LISTA = { t: 0, ids: null };
async function idsDoCurso() {
  if (LISTA.ids && Date.now() - LISTA.t < 10 * 60 * 1000) return LISTA.ids;
  const pin = (typeof process !== 'undefined' && process.env && process.env.CURSO_PIN) || '0607';
  const r = await fetch(ORIGEM + '/api/videos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'curso', senha: pin }),
  });
  const d = await r.json();
  const ids = new Set();
  (d.cursos || []).forEach(c => (c.modulos || []).forEach(m => (m.aulas || []).forEach(a => {
    const g = String(a.url || '').match(/\/d\/([^/?#]+)/);
    if (g) ids.add(g[1]);
  })));
  if (!ids.size) throw new Error('lista de aulas vazia');
  LISTA = { t: Date.now(), ids };
  return ids;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('use GET', { status: 405, headers: CORS });

  const id = new URL(req.url).searchParams.get('id') || '';
  if (!ID_OK.test(id)) return new Response('id inválido', { status: 400, headers: CORS });

  try {
    let ids = await idsDoCurso();
    if (!ids.has(id)) {            // aula nova cadastrada há pouco: relê a lista uma vez
      LISTA.t = 0; ids = await idsDoCurso();
      if (!ids.has(id)) return new Response('arquivo fora do curso', { status: 403, headers: CORS });
    }
  } catch (e) {
    return new Response('não consegui conferir a lista do curso', { status: 503, headers: CORS });
  }

  // ?fmt=txt -> APOSTILAS em Markdown (texto pequeno, sem Range). Mesma trava: só arquivo que é aula do curso.
  // Limite de 2 MB: impede usar esta opção para puxar vídeo inteiro como "texto".
  if (new URL(req.url).searchParams.get('fmt') === 'txt') {
    let tup;
    try {
      tup = await fetch('https://drive.usercontent.google.com/download?id=' + encodeURIComponent(id) + '&export=download&confirm=t', { redirect: 'follow' });
    } catch (e) { return new Response('Drive não respondeu', { status: 502, headers: CORS }); }
    const tl = parseInt(tup.headers.get('content-length') || '0', 10);
    if (tup.status !== 200 || (tl && tl > 2 * 1024 * 1024) || /text\/html/i.test(tup.headers.get('content-type') || '')) {
      return new Response('não foi possível ler o texto (' + tup.status + ')', { status: tup.status === 200 ? 413 : 502, headers: CORS });
    }
    const corpo = await tup.text();
    if (corpo.length > 2 * 1024 * 1024) return new Response('texto grande demais', { status: 413, headers: CORS });
    return new Response(corpo, { status: 200, headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' } });
  }

  // Range pedido pelo navegador -> limitado a 16 MB
  let range = req.headers.get('range') || 'bytes=0-';
  const m = range.match(/^bytes=(\d*)-(\d*)$/);
  if (m) {
    if (m[1] !== '') {
      const ini = parseInt(m[1], 10);
      const fim = m[2] === '' ? ini + FATIA - 1 : Math.min(parseInt(m[2], 10), ini + FATIA - 1);
      range = 'bytes=' + ini + '-' + fim;
    } // "bytes=-500" (cauda do arquivo) passa como veio
  } else { range = 'bytes=0-' + (FATIA - 1); }

  let up;
  try {
    up = await fetch('https://drive.usercontent.google.com/download?id=' + encodeURIComponent(id) + '&export=download&confirm=t', {
      method: req.method, headers: { Range: range }, redirect: 'follow',
    });
  } catch (e) {
    return new Response('Drive não respondeu', { status: 502, headers: CORS });
  }
  const ct = up.headers.get('content-type') || '';
  if (up.status === 416) return new Response(null, { status: 416, headers: { ...CORS, 'Content-Range': up.headers.get('content-range') || '' } });
  if ((up.status !== 206 && up.status !== 200) || !/video|octet-stream/i.test(ct)) {
    return new Response('o Drive recusou o arquivo (' + up.status + ')', { status: 502, headers: CORS });   // cota diária do Drive, arquivo apagado ou sem compartilhamento
  }
  const h = new Headers(CORS);
  h.set('Content-Type', 'video/mp4');
  h.set('Accept-Ranges', 'bytes');
  h.set('Cache-Control', 'private, max-age=3600');
  h.set('X-Content-Type-Options', 'nosniff');
  const cr = up.headers.get('content-range'); if (cr) h.set('Content-Range', cr);
  const cl = up.headers.get('content-length'); if (cl) h.set('Content-Length', cl);
  return new Response(req.method === 'HEAD' ? null : up.body, { status: up.status, headers: h });
}
