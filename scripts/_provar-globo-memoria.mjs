/* ══════════════════════════════════════════════════════════════════════════════
   A MEMÓRIA DO GLOBO, PROVADA — sem mock, sem simulação.

     node scripts/_provar-globo-memoria.mjs            (peneira + as 3 conversas)
     node scripts/_provar-globo-memoria.mjs --peneira  (só a peneira, sem rede)

   AS TRÊS PROVAS QUE O ELIAS PEDIU:
     1. conversa → FECHA a página → abre de novo → ele sabe do que falaram
     2. conversa → CORTA ele no meio → pergunta outra coisa → ele volta no assunto
     3. pergunta algo que NUNCA foi falado → ele diz que não lembra, sem inventar

   COMO ISTO NÃO É TEATRO:
   sobe o RADAR inteiro num servidor local — a pasta public/ (biblia.json,
   busca/*), o handler REAL api/_lib/voz.js em /api/voz e o handler REAL
   api/_lib/globo-memoria.js em /api/dados?fn=memoria, batendo no RADAR_DB de
   verdade. "Fechar a página" é FECHAR O WEBSOCKET e pedir um token NOVO: a
   sessão do Google morre junto, e tudo o que sobrar tem que ter vindo da nossa
   tabela. Se a memória não funcionasse, a prova 1 voltaria muda.

   Precisa no ambiente: GEMINI_API_KEYS, RADAR_DB, RADAR_ADMIN_TOKEN.
   ══════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

try {
  const { Agent, setGlobalDispatcher } = await import('undici');
  setGlobalDispatcher(new Agent({ connect: { timeout: 60000 }, headersTimeout: 120000, bodyTimeout: 120000 }));
} catch (_) {}

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAIZ, 'public');
const PROD = process.env.RADAR_PROD || 'https://radar-atual.vercel.app';
const TIPOS = { '.json': 'application/json', '.bin': 'application/octet-stream' };

let passou = 0, falhou = 0;
const ok = (n, c, d) => { if (c) { passou++; console.log('  ✅', n, d ? '— ' + d : ''); } else { falhou++; console.log('  ❌', n, d ? '— ' + d : ''); } };

// ════════════════════════════════════════════════════════════════════════════
// PARTE 1 — A PENEIRA DO SEGREDO (mecânica, sem rede, sem banco)
// O Elias foi explícito: nada de nome de membro, nada de aconselhamento. Isto
// aqui é o que garante — e falhar aqui é falha grave, não "detalhe".
// ════════════════════════════════════════════════════════════════════════════
const { semSegredo, temasDeFerramenta } = await import(pathToFileURL(path.join(RAIZ, 'api', '_lib', 'voz-memoria.js')).href);

console.log('\n▸ A PENEIRA DO SEGREDO — o que NUNCA pode ser guardado');
{
  const barra = (t, porque) => {
    const r = semSegredo(t);
    ok('barra: ' + t.slice(0, 58), !r.ok, r.ok ? '⚠ PASSOU: ' + r.texto : r.motivo || porque);
  };
  const passa = (t, esperado) => {
    const r = semSegredo(t);
    ok('passa: ' + t.slice(0, 58), r.ok && (!esperado || r.texto === esperado), r.ok ? r.texto : 'BLOQUEOU: ' + r.motivo);
  };

  barra('o aconselhamento sobre o casamento da irmã');
  barra('ele me contou em segredo o que aconteceu');
  barra('o telefone dele é (34) 99988-0317');
  barra('mandar pro email pastor.elias@igreja.com.br');
  barra('o dízimo de R$ 2.500 que ele não entregou');
  barra('a dívida do irmão e a briga com a esposa');
  barra('o divórcio dele e a depressão depois disso');
  barra('a fofoca sobre a liderança de louvor');

  passa('a escada de Jacó em Gênesis 28:12', 'a escada de Jacó em Gênesis 28:12');
  passa('o vale da sombra da morte no Salmo 23:4');
  passa('o adultério de Davi em 2 Samuel 11');        // delicado COM âncora = estudo
  passa('o que Waltke diz da palavra sullam');        // autor de obra: fonte se cita
  passa('Daniel 12:4 e o conhecimento se multiplicando');

  // o nome que escapa no meio de um assunto legítimo
  const r1 = semSegredo('o irmão Marcos perguntou sobre a escada de Jacó');
  ok('tira o nome e deixa o assunto', r1.ok && !/Marcos/.test(r1.texto) && /escada/.test(r1.texto), r1.texto);
  const r2 = semSegredo('a Cláudia me procurou sobre Gênesis 28');
  ok('nome próprio solto vira "alguém"', r2.ok && !/Cl[áa]udia/.test(r2.texto), r2.texto);
  const r3 = semSegredo('o pastor Joel falou de Joel 2:28');
  ok('"pastor Joel" cai, mas o LIVRO Joel fica', r3.ok && /Joel 2:28/.test(r3.texto), r3.texto);
}

console.log('\n▸ A MEMÓRIA QUE SE ESCREVE SOZINHA (a partir das ferramentas)');
{
  const t1 = temasDeFerramenta('ler_versiculo', { ref: 'Daniel 12:4' });
  ok('ler_versiculo vira tema', t1.length === 1 && t1[0].tema === 'Daniel 12:4', JSON.stringify(t1));
  const t2 = temasDeFerramenta('buscar_no_acervo', { pergunta: 'a escada de Jacó' });
  ok('buscar_no_acervo vira tema', t2.length === 1 && /escada/.test(t2[0].tema), JSON.stringify(t2));
  const t3 = temasDeFerramenta('o_que_ja_falamos', { assunto: 'qualquer coisa' });
  ok('consultar a memória NÃO vira tema', t3.length === 0);
}

if (process.argv.includes('--peneira')) {
  console.log('\n' + '─'.repeat(60));
  console.log(`✅ ${passou} passaram · ❌ ${falhou} falharam`);
  process.exit(falhou ? 1 : 0);
}

// ════════════════════════════════════════════════════════════════════════════
// PARTE 2 — O RADAR INTEIRO, LOCAL, com o banco de verdade
// ════════════════════════════════════════════════════════════════════════════
const voz = (await import(pathToFileURL(path.join(RAIZ, 'api', '_lib', 'voz.js')).href)).default;
const req = createRequire(import.meta.url);
const biblioteca = req(path.join(RAIZ, 'api', '_lib', 'biblioteca.js'));
const memoria = req(path.join(RAIZ, 'api', '_lib', 'globo-memoria.js'));

function comoExpress(res) {
  return {
    setHeader() {}, statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(o) { res.writeHead(this.statusCode, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); return this; },
    end() { res.end(); return this; },
  };
}

const srv = http.createServer(async (rq, res) => {
  const u = new URL(rq.url, 'http://127.0.0.1');
  const corpo = await new Promise((k) => { let s = ''; rq.on('data', (d) => s += d); rq.on('end', () => k(s)); });

  if (u.pathname === '/api/voz') {
    const r = await voz(new Request('http://127.0.0.1:' + srv.address().port + '/api/voz',
      { method: rq.method, headers: { 'content-type': 'application/json' }, body: corpo || undefined }));
    res.writeHead(r.status, { 'Content-Type': 'application/json' });
    res.end(await r.text());
    return;
  }
  if (u.pathname === '/api/dados') {
    const fn = u.searchParams.get('fn');
    const h = fn === 'memoria' ? memoria : fn === 'biblioteca' ? biblioteca : null;
    if (!h) { res.writeHead(404); res.end('{}'); return; }
    let b = {}; try { b = JSON.parse(corpo || '{}'); } catch (_) {}
    try { await h({ method: rq.method, query: Object.fromEntries(u.searchParams), body: b }, comoExpress(res)); }
    catch (e) { res.writeHead(200); res.end(JSON.stringify({ ok: false, err: String(e.message) })); }
    return;
  }
  if (u.pathname === '/api/estudo-busca') {
    try {
      const r = await fetch(PROD + rq.url, { headers: { accept: 'application/json' } });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(await r.text());
    } catch (e) { res.writeHead(200); res.end(JSON.stringify({ ok: false, err: String(e.message) })); }
    return;
  }
  const alvo = path.join(PUB, u.pathname);
  if (!alvo.startsWith(PUB) || !fs.existsSync(alvo) || fs.statSync(alvo).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(alvo)] || 'text/plain' });
  res.end(fs.readFileSync(alvo));
});
await new Promise((k) => srv.listen(0, '127.0.0.1', k));
const EU = 'http://127.0.0.1:' + srv.address().port;
const pedir = (c) => fetch(EU + '/api/voz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) }).then((r) => r.json());

const DEBUG = process.argv.includes('--debug');

// ─── só chave que ABRE sessão de verdade serve ───────────────────────────────
async function peneirarChaves() {
  const todas = String(process.env.GEMINI_API_KEYS || '').split(/[,\s;]+/).filter(Boolean);
  const boas = [];
  for (const k of todas) {
    process.env.GEMINI_API_KEYS = k;
    let t = null;
    for (let n = 0; n < 3 && !t; n++) { const r = await pedir({ acao: 'token' }).catch(() => null); if (r && r.ok) t = r; }
    if (!t) { console.log('· chave …' + k.slice(-6) + ': não assina token'); continue; }
    const viva = await new Promise((k2) => {
      const ws = new WebSocket(t.url + '?access_token=' + encodeURIComponent(t.token));
      const p = setTimeout(() => { try { ws.close(); } catch {} k2(false); }, 25000);
      ws.onopen = () => ws.send(JSON.stringify({ setup: { model: t.modelo } }));
      ws.onmessage = async (ev) => {
        const s = typeof ev.data === 'string' ? ev.data : Buffer.from(await ev.data.arrayBuffer()).toString('utf8');
        if (s.includes('setupComplete')) { clearTimeout(p); try { ws.close(); } catch {} k2(true); }
      };
      ws.onclose = (e) => { clearTimeout(p); if (e.code !== 1000) console.log('· chave …' + k.slice(-6) + ': ' + e.code + ' ' + (e.reason || '')); k2(false); };
      ws.onerror = () => { clearTimeout(p); k2(false); };
    });
    if (viva) { boas.push(k); console.log('· chave …' + k.slice(-6) + ': ✅ abre sessão'); }
  }
  process.env.GEMINI_API_KEYS = boas.join(',');
  return boas.length;
}

/**
 * Uma rodada de conversa = ABRIR a sessão, perguntar, ouvir, FECHAR.
 * `cortarEm`: se vier número, o pastor fala por cima depois de tantos
 * caracteres de resposta — é assim que se prova o corte de verdade.
 */
function rodada(user, pergunta, opc = {}) {
  return new Promise(async (pronto, falhou) => {
    let t = null, erro = '';
    for (let n = 0; n < 4 && !t; n++) {
      const r = await pedir({ acao: 'token', voz: 'Orus', user }).catch((e) => ({ erro: e.message }));
      if (r && r.ok) t = r; else { erro = (r && r.erro) || 'sem resposta'; await new Promise((s) => setTimeout(s, 1500)); }
    }
    if (!t) return falhou(new Error(erro));

    const ws = new WebSocket(t.url + '?access_token=' + encodeURIComponent(t.token));
    const chamadas = [], falado = [];
    let bytes = 0, encerrou = false, pendentes = 0, cortou = false;
    const fim = () => {
      if (encerrou) return; encerrou = true; try { ws.close(); } catch {}
      pronto({ chamadas, texto: falado.join(''), bytes, lembrando: !!t.lembrando, cortou });
    };
    const prazo = setTimeout(fim, opc.tempoMs || 110000);

    ws.onopen = () => ws.send(JSON.stringify({ setup: { model: t.modelo } }));
    ws.onerror = (e) => { clearTimeout(prazo); falhou(new Error('WS: ' + (e.message || 'erro'))); };
    ws.onclose = () => { clearTimeout(prazo); if (!encerrou) { encerrou = true; pronto({ chamadas, texto: falado.join(''), bytes, lembrando: !!t.lembrando, cortou }); } };

    ws.onmessage = async (ev) => {
      const txt = typeof ev.data === 'string' ? ev.data : Buffer.from(await ev.data.arrayBuffer()).toString('utf8');
      let m; try { m = JSON.parse(txt); } catch { return; }
      if (DEBUG) console.log('   ‹ws› ' + txt.slice(0, 220));

      if (m.setupComplete) {
        ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: pergunta }] }], turnComplete: true } }));
        return;
      }
      // A COSTURA DO index.html: porta única, e agora com `user` junto.
      if (m.toolCall) {
        for (const fc of m.toolCall.functionCalls || []) {
          chamadas.push({ nome: fc.name, args: fc.args });
          pendentes++;
          const r = await pedir({ acao: 'ferramenta', nome: fc.name, args: fc.args || {}, user }).catch(() => null);
          ws.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: fc.id, name: fc.name,
            response: (r && r.resposta) || { erro: 'a consulta falhou agora' } }] } }));
          pendentes--;
        }
        return;
      }
      const sc = m.serverContent;
      if (!sc) return;
      if (sc.outputTranscription && sc.outputTranscription.text) falado.push(sc.outputTranscription.text);
      for (const p of (sc.modelTurn && sc.modelTurn.parts) || []) {
        if (p.inlineData && p.inlineData.data) bytes += Buffer.from(p.inlineData.data, 'base64').length;
        if (p.text) falado.push(p.text);
      }

      // ── O CORTE, de verdade: o pastor fala por cima no meio da frase ──────
      if (opc.cortarEm && !cortou && falado.join('').length >= opc.cortarEm) {
        cortou = true;
        const ateAqui = falado.join('');
        // é ISTO que o front manda quando o Live avisa que foi interrompido
        await pedir({ acao: 'lembrar', user, mestre: ateAqui, cortado: true });
        if (opc.depoisDoCorte) {
          ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: opc.depoisDoCorte }] }], turnComplete: true } }));
        } else { setTimeout(fim, 500); }
        return;
      }
      if (sc.turnComplete && !pendentes && (falado.length || bytes)) setTimeout(fim, 2500);
    };
  });
}

// Guarda o turno como o front guardaria (`fim:true` força o resumo na hora, que
// é o que acontece quando o pastor encerra a conversa).
const guardar = (user, o) => pedir({ acao: 'lembrar', user, ...o });

const mostrar = (titulo, r) => {
  console.log('\n' + '═'.repeat(78));
  console.log(titulo);
  console.log('═'.repeat(78));
  console.log('🔧 ferramentas: ' + (r.chamadas.map((c) => c.nome + ' ' + JSON.stringify(c.args)).join('  ·  ') || '(nenhuma)'));
  console.log('🧠 token assinado COM memória: ' + (r.lembrando ? 'SIM' : 'não'));
  console.log('🎙  ' + r.bytes + ' bytes de áudio · transcrição:\n');
  console.log((r.texto || '(nada)').trim());
};

if (!process.env.SEM_PENEIRA) {
  console.log('\npeneirando as chaves do Gemini…');
  if (!(await peneirarChaves())) { console.log('✖ nenhuma chave abre sessão de voz agora.'); srv.close(); process.exit(1); }
}

const U = 'prova_memoria_' + Date.now().toString(36);
const LIMPO = 'prova_virgem_' + Date.now().toString(36);
console.log('\nchave do pastor de prova: ' + U);

try {
  // ══════════════════════════════════════════════════════════════════════════
  // PROVA 1 — conversa · FECHA a página · abre de novo · ele sabe
  // ══════════════════════════════════════════════════════════════════════════
  const a1 = await rodada(U, 'Me explique Daniel 12:4 e o conhecimento crescendo.');
  mostrar('PROVA 1-A · primeira conversa (o globo ainda não conhece ninguém)', a1);
  ok('a 1ª sessão abriu SEM memória (é a primeira vez)', !a1.lembrando);
  await guardar(U, { eu: 'Me explique Daniel 12:4 e o conhecimento crescendo.', mestre: a1.texto, fim: true });

  console.log('\n… a página FOI FECHADA (websocket encerrado, sessão do Google morta) …\n');
  await new Promise((s) => setTimeout(s, 3000));

  const a2 = await rodada(U, 'Voltei. De onde a gente parou?');
  mostrar('PROVA 1-B · abriu de novo, sessão NOVA do Google', a2);
  ok('o token da 2ª sessão foi assinado COM a memória', a2.lembrando);
  ok('ele sabe do que falaram (Daniel / conhecimento)', /daniel|conhecimento|ci[êe]ncia|selad/i.test(a2.texto), 'buscando "Daniel" na fala dele');
  await guardar(U, { eu: 'Voltei. De onde a gente parou?', mestre: a2.texto, fim: true });

  // ══════════════════════════════════════════════════════════════════════════
  // PROVA 2 — corta ele no meio · pergunta outra coisa · ele consegue voltar
  // ══════════════════════════════════════════════════════════════════════════
  const b1 = await rodada(U, 'Me fala da visão dos quatro animais de Daniel capítulo 7.',
    { cortarEm: 120, depoisDoCorte: 'Peraí, esquece isso. Me explica o Salmo 23:4.' });
  mostrar('PROVA 2-A · cortei ele no meio de Daniel 7 e mudei pro Salmo 23', b1);
  ok('o corte aconteceu mesmo (o front avisou o servidor)', b1.cortou);
  // depois do corte ele ainda respondeu o Salmo 23 — o front guarda esse turno
  // igual guardaria qualquer outro. O PENDENTE continua guardado do lado.
  await guardar(U, { eu: 'Peraí, esquece isso. Me explica o Salmo 23:4.', mestre: b1.texto, fim: true });

  console.log('\n… fechou a página de novo …\n');
  await new Promise((s) => setTimeout(s, 3000));

  const b2 = await rodada(U, 'Você ficou devendo alguma coisa pra mim?');
  mostrar('PROVA 2-B · sessão NOVA: ele sabe que deixou assunto pela metade?', b2);
  ok('ele volta no assunto interrompido (Daniel 7 / animais)',
    /daniel|animais|feras|vis[ãa]o|sete/i.test(b2.texto), 'buscando o assunto cortado na fala dele');

  // ══════════════════════════════════════════════════════════════════════════
  // PROVA 3 — algo que NUNCA foi falado: ele diz que não lembra
  // ══════════════════════════════════════════════════════════════════════════
  const c1 = await rodada(LIMPO, 'O que eu te perguntei semana passada sobre as cidades de refúgio?');
  mostrar('PROVA 3 · pastor NOVO (memória vazia), pergunta sobre conversa que nunca houve', c1);
  ok('ele CHAMOU a memória em vez de fingir', c1.chamadas.some((x) => x.nome === 'o_que_ja_falamos'),
    c1.chamadas.map((x) => x.nome).join(', ') || 'nenhuma');
  ok('ele diz que NÃO lembra / não achou', /n[ãa]o (lembro|tenho|achei|encontrei|consta)|primeira vez|n[ãa]o temos|n[ãa]o falamos|n[ãa]o registr/i.test(c1.texto));
  ok('e NÃO inventa que já falaram', !/voc[êe] (me )?perguntou|na semana passada voc[êe]|conversamos sobre as cidades/i.test(c1.texto));
} finally {
  // não deixa lixo de prova no banco do app
  await pedir({ acao: 'esquecer', user: U }).catch(() => {});
  await pedir({ acao: 'esquecer', user: LIMPO }).catch(() => {});
}

srv.close();
console.log('\n' + '─'.repeat(60));
console.log(`✅ ${passou} passaram · ❌ ${falhou} falharam`);
process.exit(falhou ? 1 : 0);
