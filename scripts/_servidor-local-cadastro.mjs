// Servidor LOCAL para testar o cadastro de ponta a ponta SEM tocar em nada de verdade.
//  - serve o app (public/) em http://localhost:8767
//  - /api/send-otp e /api/verify-otp rodam o CÓDIGO REAL (api/send-otp.js, api/verify-otp.js)
//  - o Fonnte é SIMULADO: nenhuma mensagem sai; cada envio fica registrado em /__fonnte
//  - /api/cadastros roda o CÓDIGO REAL (api/cadastros.js + chave.js) contra um BANCO FALSO em
//    memória (scripts/_banco-falso.cjs). /__db mostra o que ficou "salvo".
//  Uso: node scripts/_servidor-local-cadastro.mjs        (depois abra http://localhost:8767)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const requireCJS = createRequire(import.meta.url);

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
const { db, instalar } = requireCJS('./_banco-falso.cjs');
instalar();                                           // troca o 'pg' pelo banco falso ANTES de carregar cadastros.js
const cadastrosHandler = requireCJS('../api/cadastros.js');
async function viaCadastros(req, res) {
  const corpo = req.method === 'POST' ? await lerCorpo(req) : '';
  const u = new URL(req.url, 'http://x');
  const r = { code: 200, setHeader() {}, status(c) { this.code = c; return this; },
    json(o) { res.writeHead(this.code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); return this; },
    end() { res.writeHead(this.code); res.end(); return this; } };
  await cadastrosHandler({ method: req.method, body: corpo, headers: req.headers, query: Object.fromEntries(u.searchParams) }, r);
}
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
    // Vídeos do carrossel: este servidor não faz download parcial (Range) e cada vídeo seguraria uma das
    // 6 conexões do navegador por mais de 1 minuto, travando as chamadas da API. Não importam pro teste.
    if (p.startsWith('/videos/')) { res.writeHead(404); return res.end(); }
    if (p === '/api/cadastros') return viaCadastros(req, res);
    if (p === '/__db') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ cadastros: db.cadastros, chaves: db.chaves.map(k => ({ user_key: k.user_key })) })); }
    if (p === '/__fonnte') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(enviosFonnte)); }
    if (p.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"ok":false,"local":true}'); }
    let f = path.join(PUB, p.endsWith('/') ? p + 'index.html' : p);
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(8767, () => console.log('RADAR local de teste em http://localhost:8767 (Fonnte e banco SIMULADOS)'));
