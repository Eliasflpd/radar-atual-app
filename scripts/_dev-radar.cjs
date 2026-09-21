/* Servidor LOCAL de teste do RADAR (não vai pro ar, não muda nada em produção).
   Serve /public e roteia /api/* exatamente como o vercel.json faz:
     /api/publicacoes -> api/dados.js?fn=publicacoes   (Node + pg)
     /api/peca        -> api/edge.js?fn=peca           (Edge, Request/Response)
   Uso:  RADAR_DB=... OPENAI_API_KEY=... node scripts/_dev-radar.cjs 8788        */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const RAIZ = path.join(__dirname, '..');
const PUB  = path.join(RAIZ, 'public');
const PORTA = parseInt(process.argv[2] || '8788', 10);

const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.webp':'image/webp', '.woff2':'font/woff2', '.bin':'application/octet-stream' };

const dados = require(path.join(RAIZ, 'api', 'dados.js'));
let edge = null;
const carregarEdge = () => edge || (edge = import(url.pathToFileURL(path.join(RAIZ,'api','edge.js')).href));

function corpo(req) {
  return new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => r(b)); });
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost:' + PORTA);
  const rota = u.pathname;

  // ── API: mesmo mapa de rewrites do vercel.json ─────────────────────────
  const REW = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8')).rewrites || [];
  const achou = REW.find(x => x.source === rota);
  const destino = achou ? achou.destination : '';        // ex.: /api/dados?fn=hist

  if (destino.indexOf('/api/dados') === 0) {
    const raw = await corpo(req);
    req.query = Object.fromEntries(u.searchParams);
    req.query.fn = new URL('http://x' + destino).searchParams.get('fn');
    req.body = raw ? (() => { try { return JSON.parse(raw); } catch (e) { return {}; } })() : {};
    res.status = c => (res.statusCode = c, res);
    res.json = o => { res.setHeader('Content-Type','application/json; charset=utf-8'); res.end(JSON.stringify(o)); };
    return dados(req, res);
  }
  if (destino.indexOf('/api/edge') === 0) {
    const raw = await corpo(req);
    const mod = await carregarEdge();
    const pedido = new Request('http://localhost' + destino, {
      method: req.method, headers: { 'Content-Type': 'application/json' },
      body: (req.method === 'GET' || req.method === 'HEAD') ? undefined : raw
    });
    const r = await mod.default(pedido);
    res.statusCode = r.status;
    r.headers.forEach((v, k) => { try { res.setHeader(k, v); } catch (_) {} });
    if (!r.body) { res.end(await r.text()); return; }
    // sem isto o Nagle do Windows segura cada token ~170ms e o streaming vira lesma
    try { res.socket.setNoDelay(true); res.flushHeaders(); } catch (_) {}
    const lei = r.body.getReader();
    for (;;) { const x = await lei.read(); if (x.done) break; res.write(Buffer.from(x.value)); }
    res.end(); return;
  }

  // ── arquivos ───────────────────────────────────────────────────────────
  let f = path.join(PUB, decodeURIComponent(rota));
  if (rota.endsWith('/')) f = path.join(f, 'index.html');
  if (!f.startsWith(PUB)) { res.statusCode = 403; res.end('nope'); return; }
  fs.readFile(f, (e, d) => {
    if (e) { res.statusCode = 404; res.setHeader('Content-Type','text/plain; charset=utf-8'); res.end('404 ' + rota); return; }
    res.setHeader('Content-Type', MIME[path.extname(f).toLowerCase()] || 'application/octet-stream');
    res.end(d);
  });
}).listen(PORTA, () => console.log('RADAR local em http://localhost:' + PORTA));
