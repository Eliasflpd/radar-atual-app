/* ══════════════════════════════════════════════════════════════════════════════
   A TRAVA POR PESSOA, PROVADA — sem mock, sem simulação.

     node --env-file=scripts/.env-trava scripts/_provar-trava-pessoa.mjs

   O QUE ESTA PROVA RESPONDE, EM UMA FRASE:
   "a chave de uma pessoa abre os dados de outra?"  →  e a resposta tem que ser
   NÃO, escrita por um servidor de verdade batendo num banco de verdade.

   O BURACO QUE ISTO FECHA (achado em 22/09/2026):
   as rotas por pessoa do RADAR não pediam NADA. Bastava saber o WhatsApp de
   alguém — coisa que está no cartaz de qualquer igreja — pra ler o caderno de
   pregações da pessoa (fn=pregado), pra ler os assuntos que ela conversou com
   o globo de voz, e até pra APAGAR a memória dela.

   COMO ISTO NÃO É TEATRO:
   sobe os handlers REAIS num servidor local — api/dados.js (com fn=pregado,
   fn=chave e fn=memoria), api/cadastros.js e o api/_lib/voz.js do Edge — todos
   batendo no RADAR_DB de verdade. Nenhum é substituído por imitação. Se a trava
   não existisse, a PROVA 3 devolveria o caderno alheio e esta prova falharia.

   Precisa no ambiente: RADAR_DB.
   (RADAR_ADMIN_TOKEN pode ser QUALQUER valor aqui: ele só precisa bater entre
   as duas pontas locais. Em produção quem manda é o da Vercel. Se não vier
   nenhum, esta prova inventa um só pra ela mesma.)

   ⚠️ COMO PEGAR O RADAR_DB — a pegadinha que já custou tempo e fica escrita:
   `vercel env pull --environment=production` baixa os NOMES e devolve os
   VALORES VAZIOS. O que funciona é o ambiente de DESENVOLVIMENTO:
       npx vercel env pull scripts/.env-trava --yes
   `scripts/.env-*` está no .gitignore — nunca vai pro repositório.

   ⚠️ LIMPA O QUE SUJOU: os personagens são sorteados a cada rodada e todas as
   linhas que esta prova criar são apagadas no fim. O banco está em 1.074 MB de
   1.100 MB de freio — prova que deixa lixo aqui é prova que custa caro.
   ══════════════════════════════════════════════════════════════════════════════ */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import pg from 'pg';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ─── o placar ────────────────────────────────────────────────────────────────
let passou = 0, falhou = 0;
const ok = (n, c, d) => {
  if (c) { passou++; console.log('  ✅', n, d ? '— ' + d : ''); }
  else   { falhou++; console.log('  ❌', n, d ? '— ' + d : ''); }
};
const titulo = (t) => console.log('\n▸ ' + t);

// ─── o ambiente ──────────────────────────────────────────────────────────────
if (!process.env.RADAR_DB) {
  console.error('\n❌ Falta RADAR_DB no ambiente.\n' +
    '   npx vercel env pull scripts/.env-trava --yes\n' +
    '   node --env-file=scripts/.env-trava scripts/_provar-trava-pessoa.mjs\n');
  process.exit(1);
}
if (!process.env.RADAR_ADMIN_TOKEN) process.env.RADAR_ADMIN_TOKEN = 'prova-local-' + Math.random().toString(36).slice(2);
const ADM = process.env.RADAR_ADMIN_TOKEN;

// ─── os personagens (sorteados, pra duas rodadas nunca se atropelarem) ───────
const sufixo = String(Date.now()).slice(-6) + Math.floor(Math.random() * 90 + 10);
const PASTOR_A  = '5599' + sufixo;        // telefone
const PASTOR_B  = '5588' + sufixo;        // telefone — o "ladrão" da prova
const PASTOR_D  = '5577' + sufixo;        // telefone, do tempo em que não havia trava
const PASTOR_E  = '5566' + sufixo;        // telefone, pra provar a parede da tolerância
// Aparelho sem cadastro, EXATAMENTE no formato que o app sorteia
// (public/_pregado.js: 'aparelho-' + base36).
const APARELHO_C = 'aparelho-' + Math.random().toString(36).slice(2, 10);
// O MESMO caso, mas com o id degenerado em só dígitos — é o que acontece quando
// o sorteio em base36 cai em 8 números seguidos. O `chaveDe` do RADAR (que é
// bem mais velho que esta trava) transforma isso em "12345678" e o id fica com
// cara de telefone sem ser. Está aqui porque a primeira versão da trava
// quebrava justamente neste caso, e prova que não volta a quebrar.
const APARELHO_F = 'aparelho-' + String(Date.now()).slice(-8);
const TODOS = [PASTOR_A, PASTOR_B, PASTOR_D, PASTOR_E, APARELHO_C,
               APARELHO_F, APARELHO_F.replace(/\D/g, '')];

// ════════════════════════════════════════════════════════════════════════════
// O RADAR, LOCAL, com os handlers REAIS
// ════════════════════════════════════════════════════════════════════════════
const req = createRequire(import.meta.url);
const dados     = req(path.join(RAIZ, 'api', 'dados.js'));
const cadastros = req(path.join(RAIZ, 'api', 'cadastros.js'));
const voz = (await import(pathToFileURL(path.join(RAIZ, 'api', '_lib', 'voz.js')).href)).default;

// A Vercel entrega ao handler Node um `req` com query, body JÁ PARSEADO e
// headers. O adaptador reproduz os três — principalmente os HEADERS, que é por
// onde o crachá viaja de verdade. Adaptador que esquece header faria a prova
// passar por um caminho que não é o que roda em produção.
function comoExpress(res) {
  return {
    _h: {},
    setHeader(k, v) { this._h[k] = v; return this; },
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(o) { res.writeHead(this.statusCode, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); return this; },
    end() { res.end(); return this; },
  };
}

const srv = http.createServer(async (rq, res) => {
  const u = new URL(rq.url, 'http://127.0.0.1');
  const corpo = await new Promise((k) => { let s = ''; rq.on('data', (d) => s += d); rq.on('end', () => k(s)); });

  if (u.pathname === '/api/voz') {
    const h = { 'content-type': 'application/json' };
    if (rq.headers['x-radar-chave']) h['x-radar-chave'] = rq.headers['x-radar-chave'];
    const r = await voz(new Request(EU + '/api/voz',
      { method: rq.method, headers: h, body: corpo || undefined }));
    res.writeHead(r.status, { 'Content-Type': 'application/json' });
    res.end(await r.text());
    return;
  }
  const h = (u.pathname === '/api/dados') ? dados
          : (u.pathname === '/api/cadastros') ? cadastros : null;
  if (!h) { res.writeHead(404); res.end('{}'); return; }
  let b = {}; try { b = JSON.parse(corpo || '{}'); } catch (_) {}
  try {
    await h({ method: rq.method, query: Object.fromEntries(u.searchParams), body: b, headers: rq.headers },
            comoExpress(res));
  } catch (e) {
    res.writeHead(200); res.end(JSON.stringify({ ok: false, err: String(e.message) }));
  }
});
await new Promise((k) => srv.listen(0, '127.0.0.1', k));
const EU = 'http://127.0.0.1:' + srv.address().port;

// ─── os jeitos de bater na porta, do jeito que o app bate ───────────────────
const cab = (chave) => {
  const h = { 'Content-Type': 'application/json' };
  if (chave) h['x-radar-chave'] = chave;
  return h;
};
const lerCaderno  = (user, chave) =>
  fetch(EU + '/api/dados?fn=pregado&user=' + encodeURIComponent(user), { headers: cab(chave) }).then((r) => r.json());
const gravarPrega = (user, chave, titulo) =>
  fetch(EU + '/api/dados?fn=pregado', { method: 'POST', headers: cab(chave),
    body: JSON.stringify({ user, titulo, ref: 'Gênesis 28:12', tema: 'a escada de Jacó' }) }).then((r) => r.json());
const apagarPrega = (user, chave, id) =>
  fetch(EU + '/api/dados?fn=pregado', { method: 'POST', headers: cab(chave),
    body: JSON.stringify({ acao: 'apagar', user, id }) }).then((r) => r.json());
const emitirPara  = (user) =>
  fetch(EU + '/api/dados?fn=chave', { method: 'POST', headers: cab(),
    body: JSON.stringify({ acao: 'emitir', user, token: ADM }) }).then((r) => r.json());
const naVoz = (corpo, chave) =>
  fetch(EU + '/api/voz', { method: 'POST', headers: cab(chave), body: JSON.stringify(corpo) }).then((r) => r.json());
const semearMemoria = (user, tema) =>
  fetch(EU + '/api/dados?fn=memoria', { method: 'POST', headers: cab(),
    body: JSON.stringify({ acao: 'temas', user, token: ADM, itens: [{ tema, pergunta: '', ref: 'Gênesis 28:12' }] }) }).then((r) => r.json());

// Põe alguém no cadastro SEM crachá nenhum: é exatamente o estado em que está
// toda a base hoje, no minuto anterior a esta trava entrar no ar. Vai direto no
// banco de propósito — passar pelo POST /api/cadastros já emitiria o crachá, e
// aí não haveria o que provar.
async function semearCadastroAntigo(user, nome) {
  const c = new pg.Client({ connectionString: process.env.RADAR_DB, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try { await c.query('insert into radar_cadastros(nome,cargo,whatsapp) values($1,$2,$3)', [nome, 'Pastor', user]); }
  finally { await c.end(); }
}

// ════════════════════════════════════════════════════════════════════════════
try {
  console.log('\n══ A TRAVA POR PESSOA — prova contra o banco de verdade ══');
  console.log('   pastor A .....', PASTOR_A);
  console.log('   pastor B .....', PASTOR_B, '(o que vai tentar entrar)');
  console.log('   aparelho C ...', APARELHO_C);

  // ── 1. cada um ganha o seu crachá ──────────────────────────────────────────
  titulo('1) OS CRACHÁS NASCEM');
  const kA = (await emitirPara(PASTOR_A)).chave;
  const kB = (await emitirPara(PASTOR_B)).chave;
  ok('crachá do pastor A saiu', /^rk_[A-Za-z0-9_-]{20,}$/.test(kA || ''), (kA || '').slice(0, 12) + '…');
  ok('crachá do pastor B saiu', /^rk_[A-Za-z0-9_-]{20,}$/.test(kB || ''), (kB || '').slice(0, 12) + '…');
  ok('os dois crachás são diferentes', kA !== kB);

  // ── 2. com o crachá certo, a porta abre ────────────────────────────────────
  titulo('2) COM O CRACHÁ CERTO, TUDO FUNCIONA COMO ANTES');
  const gA = await gravarPrega(PASTOR_A, kA, 'A escada de Jacó — pastor A');
  ok('A grava a pregação dele', !!(gA && gA.salvo && gA.item && gA.item.id), 'id ' + (gA.item && gA.item.id));
  const idA = gA.item && gA.item.id;
  const vA = await lerCaderno(PASTOR_A, kA);
  ok('A lê o caderno dele e a pregação está lá', (vA.itens || []).some((x) => x.id === idA), vA.total + ' item(ns)');
  await gravarPrega(PASTOR_B, kB, 'Outra coisa — pastor B');

  // ── 3. A PROVA QUE O ELIAS PEDIU ───────────────────────────────────────────
  titulo('3) ⚔️  A CHAVE DE UM **NÃO** ABRE OS DADOS DO OUTRO');
  const roubo = await lerCaderno(PASTOR_A, kB);
  ok('B, com o crachá DELE, não lê o caderno de A',
     (roubo.itens || []).length === 0 && roubo.precisa_chave === true,
     'motivo: ' + roubo.motivo);
  ok('e o motivo é exatamente "crachá de outro dono"', roubo.motivo === 'chave_de_outro', roubo.motivo);
  ok('nada do caderno de A vazou na resposta',
     !JSON.stringify(roubo).includes('escada de Jacó'));

  const semNada = await lerCaderno(PASTOR_A, '');
  ok('sem crachá nenhum também não lê (era ASSIM que vazava antes)',
     (semNada.itens || []).length === 0 && semNada.precisa_chave === true, 'motivo: ' + semNada.motivo);

  const inventada = await lerCaderno(PASTOR_A, 'rk_' + 'z'.repeat(43));
  ok('crachá inventado não abre', (inventada.itens || []).length === 0 && inventada.precisa_chave === true,
     'motivo: ' + inventada.motivo);

  // ── 4. não lê E NÃO DESTRÓI ────────────────────────────────────────────────
  titulo('4) O INTRUSO TAMBÉM NÃO APAGA NADA');
  const tentaApagar = await apagarPrega(PASTOR_A, kB, idA);
  ok('B não consegue apagar a pregação de A', !tentaApagar.apagado, 'motivo: ' + tentaApagar.motivo);
  const aindaLa = await lerCaderno(PASTOR_A, kA);
  ok('a pregação de A continua inteira', (aindaLa.itens || []).some((x) => x.id === idA));

  // ── 5. a memória do globo, pela porta do Edge ──────────────────────────────
  titulo('5) A MEMÓRIA DO GLOBO (/api/voz) OBEDECE À MESMA TRAVA');
  await semearMemoria(PASTOR_A, 'a escada de Jacó em Gênesis 28');

  const memDoDono = await naVoz({ acao: 'ferramenta', nome: 'o_que_ja_falamos', args: {}, user: PASTOR_A }, kA);
  ok('A, com o crachá dele, vê a própria memória', !!(memDoDono.resposta && memDoDono.resposta.lembro));

  const memRoubada = await naVoz({ acao: 'ferramenta', nome: 'o_que_ja_falamos', args: {}, user: PASTOR_A }, kB);
  ok('B, com o crachá DELE, não vê a memória de A',
     !(memRoubada.resposta && memRoubada.resposta.lembro));
  ok('e nenhum assunto de A vazou no texto da resposta',
     !JSON.stringify(memRoubada).toLowerCase().includes('escada'));

  const gravarRoubado = await naVoz({ acao: 'lembrar', user: PASTOR_A, sessao: 'prova',
                                      eu: 'texto plantado pelo intruso', mestre: 'resposta plantada' }, kB);
  ok('B não consegue escrever na memória de A', gravarRoubado.guardado === false);

  const esquecerRoubado = await naVoz({ acao: 'esquecer', user: PASTOR_A }, kB);
  ok('B não consegue APAGAR a memória de A', esquecerRoubado.recusado === true && !esquecerRoubado.apagados);
  const memAindaLa = await naVoz({ acao: 'ferramenta', nome: 'o_que_ja_falamos', args: {}, user: PASTOR_A }, kA);
  ok('a memória de A continua lá depois da tentativa', !!(memAindaLa.resposta && memAindaLa.resposta.lembro));

  // o caminho do sendBeacon: sem cabeçalho, crachá dentro do corpo
  const peloCorpo = await naVoz({ acao: 'lembrar', user: PASTOR_A, chave: kA, sessao: 'prova', eu: 'oi', mestre: 'oi' }, '');
  ok('o crachá no CORPO funciona (é o caminho do sendBeacon)', peloCorpo.guardado === true);

  // ── 6. quem já usava o app não pode ser quebrado ───────────────────────────
  titulo('6) O PERÍODO DE TOLERÂNCIA — quem já usava NÃO é quebrado');
  await semearCadastroAntigo(PASTOR_D, 'Pastor Antigo D');
  const velho = await lerCaderno(PASTOR_D, '');
  ok('pastor sem crachá nenhum ainda passa', velho.precisa_chave !== true, 'itens: ' + (velho.itens || []).length);
  ok('e vem o pedido pro app se curar sozinho (renove)', velho.renove === true);

  // ── 7. o aparelho sem cadastro se adota sozinho ────────────────────────────
  titulo('7) APARELHO SEM CADASTRO GANHA CRACHÁ SOZINHO (e depois tranca)');
  const c1 = await lerCaderno(APARELHO_C, '');
  const kC = c1.chave_nova;
  ok('o aparelho recebeu um crachá na primeira visita', /^rk_/.test(kC || ''), (kC || '').slice(0, 12) + '…');
  const c2 = await lerCaderno(APARELHO_C, '');
  ok('a partir daí, SEM o crachá não entra mais', c2.precisa_chave === true, 'motivo: ' + c2.motivo);
  const c3 = await lerCaderno(APARELHO_C, kC);
  ok('e COM o crachá entra normalmente', c3.precisa_chave !== true);
  const c4 = await lerCaderno(APARELHO_C, kA);
  ok('o crachá do pastor A não abre o aparelho C', c4.motivo === 'chave_de_outro');

  const f1 = await lerCaderno(APARELHO_F, '');
  ok('aparelho com id que virou só dígitos TAMBÉM é adotado (não vira refém)',
     /^rk_/.test(f1.chave_nova || ''), 'id ' + APARELHO_F + ' → ' + APARELHO_F.replace(/\D/g, ''));

  // ── 8. a parede no fim da tolerância ───────────────────────────────────────
  titulo('8) A PAREDE — quando a tolerância acaba, telefone sem crachá não entra');
  const antes = process.env.RADAR_CHAVE_ATE;
  await semearCadastroAntigo(PASTOR_E, 'Pastor Antigo E');
  process.env.RADAR_CHAVE_ATE = '2020-01-01';          // tolerância vencida
  const depoisDaParede = await lerCaderno(PASTOR_E, '');
  ok('telefone sem crachá é recusado depois da parede',
     depoisDaParede.precisa_chave === true && depoisDaParede.motivo === 'tolerancia_encerrada',
     'motivo: ' + depoisDaParede.motivo);
  ok('e mesmo assim a resposta NÃO é erro — o app não trava',
     depoisDaParede.ok === true && Array.isArray(depoisDaParede.itens));
  if (antes === undefined) delete process.env.RADAR_CHAVE_ATE; else process.env.RADAR_CHAVE_ATE = antes;

  // ── 9. a chave não pode vazar por onde o telefone já vaza ──────────────────
  titulo('9) O CRACHÁ NÃO DESCE POR NENHUM GET');
  const porTelefone = await fetch(EU + '/api/cadastros?phone=' + PASTOR_A).then((r) => r.text());
  ok('/api/cadastros?phone= não devolve crachá nenhum', !porTelefone.includes('rk_'),
     porTelefone.slice(0, 70));

  // ── 10. o banco guarda hash, não o segredo ─────────────────────────────────
  titulo('10) NO BANCO SÓ EXISTE O HASH — se ele vazar, ninguém entra com o que vazou');
  {
    const c = new pg.Client({ connectionString: process.env.RADAR_DB, ssl: { rejectUnauthorized: false } });
    await c.connect();
    const r = await c.query('select chave_hash from radar_chaves where user_key=$1', [PASTOR_A]);
    ok('a chave em texto NÃO está no banco', !r.rows.some((x) => String(x.chave_hash).includes('rk_')));
    ok('o que está guardado é um SHA-256 (64 hex)', r.rows.every((x) => /^[a-f0-9]{64}$/.test(x.chave_hash)),
       (r.rows[0] && r.rows[0].chave_hash || '').slice(0, 16) + '…');
    await c.end();
  }
} catch (e) {
  falhou++;
  console.log('\n💥 a prova morreu no meio:', e && e.stack || e);
} finally {
  // ── LIMPEZA: nada do que esta prova criou pode ficar no banco ──────────────
  try {
    const c = new pg.Client({ connectionString: process.env.RADAR_DB, ssl: { rejectUnauthorized: false } });
    await c.connect();
    let n = 0;
    for (const t of ['radar_chaves', 'radar_pregacoes', 'globo_memoria']) {
      try { const r = await c.query(`delete from ${t} where user_key = any($1)`, [TODOS]); n += r.rowCount || 0; } catch (_) {}
      try { const r = await c.query(`delete from ${t} where chave = any($1)`, [TODOS]); n += r.rowCount || 0; } catch (_) {}
    }
    // os cadastros de mentira que a prova plantou pra fingir ser gente antiga
    try {
      const r = await c.query(
        `delete from radar_cadastros
          where regexp_replace(coalesce(whatsapp,''),'\D','','g') = any($1)`, [TODOS]);
      n += r.rowCount || 0;
    } catch (_) {}
    await c.end();
    console.log('\n🧹 limpeza: ' + n + ' linha(s) de teste apagada(s) do banco.');
  } catch (e) { console.log('\n⚠️  não consegui limpar o banco: ' + (e && e.message)); }
  try { srv.close(); } catch (_) {}
}

console.log('\n══════════════════════════════════════════════');
console.log('   ' + passou + ' passaram · ' + falhou + ' falharam');
console.log('══════════════════════════════════════════════\n');
process.exit(falhou ? 1 : 0);
