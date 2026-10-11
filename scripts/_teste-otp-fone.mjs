// Teste do envio do código por WhatsApp (api/send-otp.js) SEM mandar mensagem nenhuma:
// o fetch do Fonnte é simulado e só registra para qual número ele seria chamado.
// Uso: node scripts/_teste-otp-fone.mjs
import { pathToFileURL } from 'node:url';
import path from 'node:path';

process.env.OTP_SECRET = 'segredo-de-teste-local';
process.env.FONNTE_TOKEN = 'token-de-teste';
const mod = await import(pathToFileURL(path.resolve('api/send-otp.js')).href);
const handler = mod.default;

let respostaFonnte = { status: true, detail: 'success! message in queue' }, httpFonnte = 200, chamadas = [];
globalThis.fetch = async (url, init) => {
  chamadas.push({ url, target: JSON.parse(init.body).target });
  return new Response(JSON.stringify(respostaFonnte), { status: httpFonnte, headers: { 'Content-Type': 'application/json' } });
};

async function envia(phone, extra = {}) {
  chamadas = [];
  const req = new Request('http://x/api/send-otp', { method: 'POST', body: JSON.stringify({ nome: 'Teste', phone, ...extra }) });
  const r = await handler(req);
  const j = await r.json();
  return { http: r.status, ok: !!j.ok, erro: j.error, alvo: chamadas[0] && chamadas[0].target };
}

const casos = [
  ['Brasil celular com DDD       (98) 98888-7777', '(98) 98888-7777', {}, '5598988887777'],
  ['Brasil fixo com DDD          (98) 3221-5954 ', '(98) 3221-5954', {}, '559832215954'],
  ['Brasil já com 55             55 98 98888-7777', '5598988887777', {}, '5598988887777'],
  ['SUÍÇA +41 79 123 45 67 (o caso da cliente)', '41791234567', {}, '41791234567'],
  ['SUÍÇA com aviso intl:true', '41791234567', { intl: true }, '41791234567'],
  ['EUA +1 305 867 5309 (11 dígitos)', '13058675309', {}, '13058675309'],
  ['Angola +244 923 000 000', '244923000000', {}, '244923000000'],
  ['Portugal +351 912 345 678', '351912345678', {}, '351912345678'],
  ['Brasil com intl:true NÃO ganha 55', '98988887777', { intl: true }, '98988887777'],
];
let falhas = 0;
for (const [nome, phone, extra, esperado] of casos) {
  const r = await envia(phone, extra); const ok = r.ok && r.alvo === esperado; if (!ok) falhas++;
  console.log((ok ? '✔' : '✘') + ' ' + nome.padEnd(46) + ' → ' + r.alvo + (ok ? '' : '   ESPERADO ' + esperado));
}

// Fonnte recusa (status:false) → o app tem que ser AVISADO
respostaFonnte = { status: false, reason: 'device disconnected' };
let r = await envia('98988887777'); const recusou = !r.ok && r.http === 502 && /entregar/.test(r.erro || '');
console.log((recusou ? '✔' : '✘') + ' Fonnte status:false → erro ao usuário (http ' + r.http + '): ' + r.erro); if (!recusou) falhas++;
// Fonnte HTTP 500
respostaFonnte = { detail: 'erro' }; httpFonnte = 500; r = await envia('98988887777'); const http500 = !r.ok && r.http === 502;
console.log((http500 ? '✔' : '✘') + ' Fonnte HTTP 500 → erro ao usuário (http ' + r.http + ')'); if (!http500) falhas++;
// Formato desconhecido mas HTTP 200 → continua valendo como enviado
respostaFonnte = { qualquer: 'coisa' }; httpFonnte = 200; r = await envia('98988887777'); const desconhecido = r.ok;
console.log((desconhecido ? '✔' : '✘') + ' Fonnte resposta de formato desconhecido (200) → segue como enviado'); if (!desconhecido) falhas++;
// número inválido
r = await envia('123'); const inval = r.http === 400; console.log((inval ? '✔' : '✘') + ' número curto demais → 400'); if (!inval) falhas++;

console.log('\n' + (falhas ? falhas + ' FALHA(S)' : 'TUDO CERTO'));
process.exit(falhas ? 1 : 0);
