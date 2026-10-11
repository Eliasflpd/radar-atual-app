// Servidor LOCAL para testar o cadastro de ponta a ponta SEM tocar em nada de verdade.
//  - serve o app (public/) em http://localhost:8767
//  - /api/send-otp e /api/verify-otp rodam o CÓDIGO REAL (api/send-otp.js, api/verify-otp.js)
//  - o Fonnte é SIMULADO: nenhuma mensagem sai; cada envio fica registrado em /__fonnte
//  - /api/cadastros é SIMULADO (não existe banco aqui): devolve ok e um crachá de mentira
//  Uso: node scripts/_servidor-local-cadastro.mjs        (depois abra http://localhost:8767)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAIZ, 'public');
process.env.OTP_SECRET = 'segredo-so-para-teste-local';
process.env.FONNTE_TOKEN = 'token-falso-nada-sai-daqui';

const enviosFonnte = [];
const fetchReal = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('api.fonnte.com')) {
    const b = JSON.parse(init.body);
    enviosFonnte.push({ quando: new Date().toISOString(), target: b.target, message: b.message });
    return new Response(JSON.stringify({ status: true, detail: 'SIMULADO: nada foi enviado', target: [b.target] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return fetchReal(url, init);
};
const sendOtp = (await import(pathToFileURL(path.join(RAIZ, 'api', 'send-otp.js')).href)).default;
const verifyOtp = (await import(pathToFileURL(path.join(RAIZ, 'api', 'verify-otp.js')).href)).default;

const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const lerCorpo = req => new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => r(b)); });
async function viaHandler(h, req, res) {
  const corpo = req.method === 'POST' ? await lerCorpo(req) : undefined;
  const r = await h(new Request('http://localhost' + req.url, { method: req.method, headers: { 'content-type': 'application/json' }, body: corpo }));
  res.writeHead(r.status, { 'Content-Type': 'application/json' }); res.end(await r.text());
}
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const p = decodeURIComponent(u.pathname);
  try {
    if (p === '/api/send-otp') return viaHandler(sendOtp, req, res);
    if (p === '/api/verify-otp') return viaHandler(verifyOtp, req, res);
    if (p === '/api/cadastros') { await lerCorpo(req); res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(req.method === 'POST' ? { ok: true, chave: 'chave-de-mentira-local' } : { ok: true, cadastro: null })); }
    if (p === '/__fonnte') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(enviosFonnte)); }
    if (p.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"ok":false,"local":true}'); }
    let f = path.join(PUB, p.endsWith('/') ? p + 'index.html' : p);
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(8767, () => console.log('RADAR local de teste em http://localhost:8767 (Fonnte e banco SIMULADOS)'));
