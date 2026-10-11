// Teste do "ENTRA AGORA, CONFIRMA DEPOIS" no servidor (api/cadastros.js), com banco e Fonnte FALSOS.
// Nada sai do computador. Uso:  node scripts/_teste-cadastro-confirma-depois.cjs
const path = require('path');
const { pathToFileURL } = require('url');

process.env.OTP_SECRET = 'segredo-de-teste-local';
process.env.FONNTE_TOKEN = 'token-falso';
process.env.RADAR_DB = 'postgres://falso';

// ── banco falso em memória (compartilhado com o servidor local de teste) ──
const { db, instalar } = require('./_banco-falso.cjs');
instalar();

// ── Fonnte falso: só registra ────────────────────────────────────────────────
let fonnte = [];
const fetchReal = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('api.fonnte.com')) { const b = JSON.parse(init.body); fonnte.push({ target: b.target, message: b.message }); return new Response(JSON.stringify({ status: true }), { status: 200 }); }
  return fetchReal(url, init);
};

const cadastros = require(path.resolve(__dirname, '..', 'api', process.env.CAD_ARQUIVO || 'cadastros.js'));
async function postCadastro(body, headers = {}) {
  const res = { headers: {}, setHeader() {}, status(c) { this.code = c; return this; }, json(o) { this.corpo = o; return this; }, end() { return this; } };
  await cadastros({ method: 'POST', body, headers }, res);
  return res.corpo || {};
}
async function pedeCodigo(phone) {
  const sendOtp = (await import(pathToFileURL(path.resolve(__dirname, '..', 'api', 'send-otp.js')).href)).default;
  fonnte = [];
  const r = await sendOtp(new Request('http://x/api/send-otp', { method: 'POST', body: JSON.stringify({ nome: 'Raquel', phone, intl: true }) }));
  const j = await r.json();
  const codigo = ((fonnte[0] || {}).message || '').match(/\*(\d{6})\*/);
  return { token: j.token, code: codigo && codigo[1] };
}

let falhas = 0;
const confere = (ok, rotulo, extra) => { if (!ok) falhas++; console.log((ok ? '✔ ' : '✘ ') + rotulo + (extra ? '   ' + extra : '')); };
const P = '41791234567';
const nomeDe = tel => (db.cadastros.find(x => x.whatsapp === tel) || {}).nome;

(async () => {
  // 1) cadastro SEM código (número novo): é salvo, mas sem chave e sem mensagem
  fonnte = [];
  let r = await postCadastro({ nome: 'Raquel', cargo: 'Membro', whatsapp: P });
  confere(db.cadastros.length === 1 && nomeDe(P) === 'Raquel', '1) cadastro sem código É SALVO na hora (entra agora)');
  confere(!r.chave && r.precisa_codigo === true, '1) …sem chave do aparelho, e o servidor avisa que falta confirmar', JSON.stringify({ chave: !!r.chave, precisa_codigo: r.precisa_codigo }));
  confere(fonnte.length === 0, '1) …e NENHUMA mensagem de WhatsApp sai (sem spam por número digitado)');
  confere(db.chaves.length === 0, '1) …nenhuma chave de aparelho foi criada');

  // 2) código chega no WhatsApp (simulado) e a pessoa confirma depois
  const { token, code } = await pedeCodigo(P);
  confere(!!token && /^\d{6}$/.test(code || ''), '2) o código foi gerado e "enviado" ao 41791234567', 'código ' + code);
  fonnte = [];
  r = await postCadastro({ nome: 'Raquel Silva', cargo: 'Membro', whatsapp: P, otp_token: token, otp_code: code });
  confere(typeof r.chave === 'string' && r.chave.length > 10 && !r.precisa_codigo, '3) com o código certo a chave do aparelho NASCE');
  confere(fonnte.length === 1 && fonnte[0].target === P && /cadastro/i.test(fonnte[0].message), '3) …e só agora sai a mensagem de boas-vindas', fonnte[0] && fonnte[0].target);
  confere(nomeDe(P) === 'Raquel Silva', '3) …o nome foi atualizado para o confirmado');
  const chaveDela = r.chave;

  // 4) outra pessoa digita o número dela SEM código e tenta trocar o nome
  fonnte = [];
  r = await postCadastro({ nome: 'HACKER', cargo: 'Pastor', whatsapp: P });
  confere(nomeDe(P) === 'Raquel Silva', '4) quem não prova o número NÃO consegue trocar o nome de quem já confirmou', 'nome continua: ' + nomeDe(P));
  confere(!r.chave && fonnte.length === 0, '4) …e não ganha chave nem dispara mensagem');

  // 5) o aparelho dela (com a chave) re-manda o cadastro: atualiza, em silêncio
  fonnte = [];
  r = await postCadastro({ nome: 'Raquel S.', cargo: 'Membro', whatsapp: P }, { 'x-radar-chave': chaveDela });
  confere(nomeDe(P) === 'Raquel S.' && !r.chave && fonnte.length === 0, '5) o aparelho confirmado pode atualizar o próprio cadastro, em silêncio');

  // 6) número com código FALSO: continua salvo, sem chave
  r = await postCadastro({ nome: 'Joao', cargo: 'Membro', whatsapp: '5598988887777', otp_token: 'abc.def', otp_code: '123456' });
  confere(nomeDe('5598988887777') === 'Joao' && !r.chave, '6) código falso: o cadastro é salvo, mas sem chave');

  // 7) usuário antigo (no cadastro, sem chave) re-manda sozinho (auto-cura): atualiza, calado
  db.cadastros.push({ id: 9001, nome: 'Antigo', cargo: 'Membro', whatsapp: '5511999990000' });
  fonnte = [];
  r = await postCadastro({ nome: 'Antigo Atualizado', cargo: 'Membro', whatsapp: '5511999990000' });
  confere(nomeDe('5511999990000') === 'Antigo Atualizado' && fonnte.length === 0, '7) usuário antigo sem chave continua funcionando, calado (sem mensagem em massa)');

  if (db.desconhecidas.length) console.log('\n(consultas que o banco falso não conhecia — conferir:)\n  ' + [...new Set(db.desconhecidas)].join('\n  '));
  console.log('\n' + (falhas ? falhas + ' FALHA(S)' : 'TUDO CERTO'));
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('ERRO NO TESTE:', e); process.exit(2); });
