// MÚSICAS (27/10/2026) — o "Spotify" do RADAR. Rota Edge sem banco e sem chave.
//
//   GET /api/disco?c=<caminho do Deezer>   -> repassa a API PÚBLICA do Deezer
//        (api.deezer.com não manda CORS, então o celular não consegue chamar direto).
//        Só os caminhos da LISTA BRANCA abaixo passam — nada de virar proxy aberto.
//   GET /api/disco?yt=<busca>&dur=<seg>&t=<título>
//        -> acha a faixa no YouTube e devolve os ids em ordem de preferência:
//           duração mais perto da original (= a gravação certa), fugindo de
//           playback/karaokê/cover/aula. O app toca no player OFICIAL do YouTube
//           (IFrame) e, se um vídeo não deixar incorporar, pula pro próximo id.
//   GET /api/disco?cd=<cantor>  -> CDs/LPs completos no YouTube (vídeos de 15 min+),
//        pra discos antigos que o Deezer não tem.
//
// Sem chave do YouTube: lê a página pública de resultados (ytInitialData).
// Falha em silêncio (lista vazia) — nunca derruba a tela.
// Mora no /api/edge porque o plano Hobby não cabe função nova (11/12).

const RX_DEEZER = /^(search\/(artist|track|album|playlist)\?q=[^&]{1,120}(&limit=\d{1,3})?|artist\/\d+(\/(albums|top|related|radio)\?limit=\d{1,3})?|album\/\d+(\/tracks\?limit=\d{1,3})?|playlist\/\d+(\/tracks\?limit=\d{1,3})?|chart\/\d+\/(tracks|playlists|artists)\?limit=\d{1,3})$/;

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' };
const json = (obj, cache) => new Response(JSON.stringify(obj), {
  status: 200,
  headers: { ...CORS, 'Cache-Control': cache || 'no-store' },
});

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const semAcento = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const seg = (txt) => {
  // "1:02:03" | "3:41" -> segundos
  const p = String(txt || '').split(':').map((x) => parseInt(x, 10));
  if (p.some((n) => isNaN(n))) return 0;
  return p.reduce((a, n) => a * 60 + n, 0);
};

// O YouTube às vezes devolve uma página sem resultados (pedidos em rajada, aviso de
// cookies…). Por isso tenta de novo de outro jeito antes de desistir.
async function buscaYoutube(q) {
  let r = await buscaYoutube1(q, true);
  if (!r.length) r = await buscaYoutube1(q, false);
  if (!r.length) r = await buscaApiOficial(q);   // reserva: API oficial (com cota)
  return r;
}

// API OFICIAL do YouTube (YOUTUBE_API_KEY na Vercel, restrita ao YouTube Data API v3).
// Só entra quando a página pública vem vazia (os IPs da Vercel às vezes são barrados):
// a cota é ~100 buscas/dia (search = 100 unidades + videos = 1), então o resultado
// fica no cache da Vercel por 1 dia (s-maxage) e o celular guarda por música.
// Pede só vídeos que DEIXAM tocar fora do YouTube (videoEmbeddable=true).
async function buscaApiOficial(q) {
  const chave = (typeof process !== 'undefined' && process.env && process.env.YOUTUBE_API_KEY) || '';
  if (!chave) return [];
  try {
    const u = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=8&regionCode=BR&relevanceLanguage=pt'
      + '&q=' + encodeURIComponent(q) + '&key=' + encodeURIComponent(chave);
    const r = await fetch(u);
    if (!r.ok) return [];
    const j = await r.json();
    const itens = (j.items || []).filter((x) => x.id && x.id.videoId);
    if (!itens.length) return [];
    // a busca não traz a duração: uma chamada barata (1 unidade) traz todas
    const d = await fetch('https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=' + itens.map((x) => x.id.videoId).join(',') + '&key=' + encodeURIComponent(chave));
    const dj = d.ok ? await d.json() : { items: [] };
    const durs = {};
    (dj.items || []).forEach((v) => { durs[v.id] = isoSeg(v.contentDetails && v.contentDetails.duration); });
    return itens.map((x) => ({
      id: x.id.videoId,
      titulo: (x.snippet && x.snippet.title || '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
      canal: (x.snippet && x.snippet.channelTitle) || '',
      dur: durs[x.id.videoId] || 0,
    }));
  } catch (_) { return []; }
}
// "PT1H2M3S" -> segundos
function isoSeg(s) {
  const m = String(s || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
}
async function buscaYoutube1(q, soVideos) {
  // sp=EgIQAQ%3D%3D = só vídeos (sem canais/playlists)
  const r = await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + (soVideos ? '&sp=EgIQAQ%253D%253D' : '') + '&hl=pt-BR&gl=BR', {
    headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9', Cookie: 'CONSENT=YES+1; SOCS=CAI' },
  });
  if (!r.ok) return [];
  const html = await r.text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) return [];
  let dados;
  try { dados = JSON.parse(m[1]); } catch (_) { return []; }
  const out = [];
  JSON.stringify(dados, (k, v) => {
    if (k === 'videoRenderer' && v && v.videoId && out.length < 20) {
      out.push({
        id: v.videoId,
        titulo: (v.title && v.title.runs && v.title.runs[0] && v.title.runs[0].text) || '',
        canal: (v.ownerText && v.ownerText.runs && v.ownerText.runs[0] && v.ownerText.runs[0].text) || '',
        dur: seg(v.lengthText && v.lengthText.simpleText),
      });
    }
    return v;
  });
  return out;
}

export default async function disco(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET,OPTIONS' } });
  const u = new URL(req.url);
  const p = u.searchParams;
  try {
    // ── Deezer ──────────────────────────────────────────────────────────────
    const c = p.get('c');
    if (c != null) {
      if (!RX_DEEZER.test(c)) return json({ ok: false, erro: 'caminho' });
      const r = await fetch('https://api.deezer.com/' + c, { headers: { 'Accept-Language': 'pt-BR' } });
      const d = r.ok ? await r.json() : null;
      if (!d || d.error) return json({ ok: false, erro: 'sem-resposta' }, 'public, s-maxage=300');
      // paradas mudam no dia; o resto (discografia, álbum) quase nunca
      const cache = c.startsWith('chart/') ? 'public, s-maxage=3600, stale-while-revalidate=21600' : 'public, s-maxage=21600, stale-while-revalidate=86400';
      return json({ ok: true, dados: d }, cache);
    }

    // ── achar a faixa no YouTube ───────────────────────────────────────────
    const yt = p.get('yt');
    if (yt != null) {
      const q = String(yt).trim().slice(0, 160);
      if (!q) return json({ ok: false, ids: [] });
      const alvo = parseInt(p.get('dur') || '0', 10) || 0;
      const tit = semAcento(p.get('t') || '');
      const palavras = tit.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
      const querVersao = /playback|instrumental/.test(tit);
      const cands = (await buscaYoutube(q)).slice(0, 8).map((v, i) => {
        const t = semAcento(v.titulo);
        let nota = i * 4;                                   // a ordem do YouTube pesa um pouco
        if (alvo && v.dur) nota += Math.min(120, Math.abs(v.dur - alvo));
        else if (!v.dur) nota += 60;
        if (!querVersao && /playback|karaok|instrumental|cover|aula|tutorial|cifra|reacao|react|como tocar/.test(t)) nota += 200;
        if (palavras.length && !palavras.some((w) => t.includes(w))) nota += 80;
        if (alvo && v.dur > alvo * 3) nota += 150;          // CD completo não é a faixa
        return { ...v, nota };
      }).sort((a, b) => a.nota - b.nota);
      return json({ ok: cands.length > 0, ids: cands.slice(0, 5).map((v) => v.id), melhor: cands[0] || null }, 'public, s-maxage=86400, stale-while-revalidate=604800');
    }

    // ── CDs completos ────────────────────────────────────────────────────────
    const cd = p.get('cd');
    if (cd != null) {
      const nome = String(cd).trim().slice(0, 80);
      if (!nome) return json({ ok: true, itens: [] });
      const itens = (await buscaYoutube(nome + ' cd completo')).filter((v) => v.dur >= 15 * 60).slice(0, 12)
        .map((v) => ({ ...v, thumb: 'https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg' }));
      return json({ ok: true, itens }, 'public, s-maxage=86400, stale-while-revalidate=604800');
    }

    return json({ ok: false, erro: 'pedido' });
  } catch (e) {
    return json({ ok: false, erro: String((e && e.message) || e).slice(0, 120), ids: [], itens: [] });
  }
}
