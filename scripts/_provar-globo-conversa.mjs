/* ══════════════════════════════════════════════════════════════════════════════
   A CONVERSA DE VERDADE — o globo com as ferramentas novas, de ponta a ponta.

     node scripts/_provar-globo-conversa.mjs            (as 4 perguntas de prova)
     node scripts/_provar-globo-conversa.mjs "pergunta sua"

   O QUE ISTO FAZ, NA ORDEM:
   1. sobe um servidor local que é o RADAR inteiro para efeito de prova: serve a
      pasta public/ (biblia.json, busca/*) e monta o handler REAL api/_lib/voz.js
      em /api/voz. A rota /api/estudo-busca vai para o RADAR no ar, porque o motor
      de ligações vive no Postgres e não no disco do Elias.
   2. pede o token efêmero nesse servidor — token assinado com a instrução de
      sistema NOVA e as CINCO ferramentas declaradas.
   3. abre a sessão de verdade no Gemini Live, manda a pergunta como texto e
      DEIXA o mestre trabalhar: cada functionCall que ele fizer volta pelo
      /api/voz { acao:'ferramenta' } — o mesmo caminho do navegador.
   4. imprime as ferramentas que ele chamou, com os argumentos, e a TRANSCRIÇÃO
      do que ele falou (outputAudioTranscription) — que é a resposta real.

   Não tem mock, não tem "simulação": é a sessão paga-ou-grátis do Google
   respondendo com o nosso prompt e as nossas ferramentas.
   ══════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// A internet do Elias demora até 20s pra FECHAR a conexão com o Google (medido com
// curl). O fetch do node desiste em 10s e o teste falha por rede, não por código.
// Isto só afeta o harness — na Vercel quem fala com o Google é a borda do Google.
try {
  const { Agent, setGlobalDispatcher } = await import('undici');
  setGlobalDispatcher(new Agent({ connect: { timeout: 60000 }, headersTimeout: 120000, bodyTimeout: 120000 }));
} catch (_) { /* sem undici: segue com o padrão */ }

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAIZ, 'public');
const PROD = process.env.RADAR_PROD || 'https://radar-atual.vercel.app';
const TIPOS = { '.json': 'application/json', '.bin': 'application/octet-stream' };

const voz = (await import(pathToFileURL(path.join(RAIZ, 'api', '_lib', 'voz.js')).href)).default;
const { createRequire } = await import('node:module');
const biblioteca = createRequire(import.meta.url)(path.join(RAIZ, 'api', '_lib', 'biblioteca.js'));

const srv = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');

  if (u.pathname === '/api/voz') {
    const corpo = await new Promise((ok) => { let s = ''; req.on('data', (d) => s += d); req.on('end', () => ok(s)); });
    const r = await voz(new Request('http://127.0.0.1:' + srv.address().port + '/api/voz',
      { method: req.method, headers: { 'content-type': 'application/json' }, body: corpo || undefined }));
    res.writeHead(r.status, { 'Content-Type': 'application/json' });
    res.end(await r.text());
    return;
  }
  // A BIBLIOTECA (motor invisível). Roda o handler REAL, api/_lib/biblioteca.js,
  // com o RADAR_DB do ambiente — é pg, e por isso não pode viver no Edge.
  if (u.pathname === '/api/dados' && u.searchParams.get('fn') === 'biblioteca') {
    const corpo = await new Promise((ok) => { let s = ''; req.on('data', (d) => s += d); req.on('end', () => ok(s)); });
    const falso = {
      setHeader() {}, statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(o) { res.writeHead(this.statusCode, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); return this; },
      end() { res.end(); return this; },
    };
    let b = {}; try { b = JSON.parse(corpo || '{}'); } catch (_) {}
    try { await biblioteca({ method: req.method, query: Object.fromEntries(u.searchParams), body: b }, falso); }
    catch (e) { res.writeHead(200); res.end(JSON.stringify({ ok: false, err: String(e.message) })); }
    return;
  }
  if (u.pathname === '/api/estudo-busca') {          // o motor de ligações mora no Postgres
    try {
      const r = await fetch(PROD + req.url, { headers: { accept: 'application/json' } });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(await r.text());
    } catch (e) { res.writeHead(200); res.end(JSON.stringify({ ok: false, err: String(e.message) })); }
    return;
  }
  const alvo = path.join(PUB, u.pathname);
  if (!alvo.startsWith(PUB) || !fs.existsSync(alvo) || fs.statSync(alvo).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(alvo)] || 'text/plain' });
  res.end(fs.readFileSync(alvo));
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const EU = 'http://127.0.0.1:' + srv.address().port;

const pedir = (corpo) => fetch(EU + '/api/voz', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
}).then((r) => r.json());

const DEBUG = process.argv.includes('--debug');

// ─── quais chaves do cofre AINDA abrem sessão de voz ─────────────────────────
// Descobri no teste: uma das chaves devolve token normalmente (HTTP 200) mas a
// sessão morre com 1008 "Your project has been denied access". Token bom e projeto
// bloqueado são coisas diferentes — só o WS descobre. Peneiramos antes de provar,
// senão o resultado do teste vira sorteio.
async function peneirarChaves() {
  const todas = String(process.env.GEMINI_API_KEYS || '').split(/[,\s;]+/).filter(Boolean);
  const boas = [];
  for (const k of todas) {
    process.env.GEMINI_API_KEYS = k;
    let t = null;
    for (let n = 0; n < 3 && !t; n++) { const r = await pedir({ acao: 'token' }).catch(() => null); if (r && r.ok) t = r; }
    if (!t) { console.log('· chave …' + k.slice(-6) + ': não assina token'); continue; }
    const viva = await new Promise((ok) => {
      const ws = new WebSocket(t.url + '?access_token=' + encodeURIComponent(t.token));
      const p = setTimeout(() => { try { ws.close(); } catch {} ok(false); }, 25000);
      ws.onopen = () => ws.send(JSON.stringify({ setup: { model: t.modelo } }));
      ws.onmessage = async (ev) => {
        const s = typeof ev.data === 'string' ? ev.data : Buffer.from(await ev.data.arrayBuffer()).toString('utf8');
        if (s.includes('setupComplete')) { clearTimeout(p); try { ws.close(); } catch {} ok(true); }
      };
      ws.onclose = (e) => { clearTimeout(p); if (e.code !== 1000) console.log('· chave …' + k.slice(-6) + ': ' + e.code + ' ' + (e.reason || '')); ok(false); };
      ws.onerror = () => { clearTimeout(p); ok(false); };
    });
    if (viva) { boas.push(k); console.log('· chave …' + k.slice(-6) + ': ✅ abre sessão'); }
  }
  process.env.GEMINI_API_KEYS = boas.join(',');
  return boas.length;
}

// ─── uma rodada de conversa ──────────────────────────────────────────────────
function rodada(pergunta, tempoMs = 110000) {
  return new Promise(async (pronto, falhou) => {
    let t = null, erro = '';
    for (let n = 0; n < 4 && !t; n++) {
      const r = await pedir({ acao: 'token', voz: 'Orus' }).catch((e) => ({ erro: e.message }));
      if (r && r.ok) t = r; else { erro = (r && r.erro) || 'sem resposta'; await new Promise((s) => setTimeout(s, 1500)); }
    }
    if (!t) return falhou(new Error(erro));

    const ws = new WebSocket(t.url + '?access_token=' + encodeURIComponent(t.token));
    const chamadas = [], falado = [];
    let bytesAudio = 0, encerrou = false, pendentes = 0;
    const fim = () => { if (encerrou) return; encerrou = true; try { ws.close(); } catch {} pronto({ chamadas, texto: falado.join(''), bytesAudio }); };
    const prazo = setTimeout(fim, tempoMs);

    ws.onopen = () => ws.send(JSON.stringify({ setup: { model: t.modelo } }));
    ws.onerror = (e) => { clearTimeout(prazo); falhou(new Error('WS: ' + (e.message || 'erro'))); };
    ws.onclose = (e) => { clearTimeout(prazo); if (!encerrou) { encerrou = true; pronto({ chamadas, texto: falado.join(''), bytesAudio, fechou: e.code + ' ' + (e.reason || '') }); } };

    ws.onmessage = async (ev) => {
      const txt = typeof ev.data === 'string' ? ev.data : Buffer.from(await ev.data.arrayBuffer()).toString('utf8');
      let m; try { m = JSON.parse(txt); } catch { return; }
      if (DEBUG) console.log('   ‹ws› ' + txt.slice(0, 260));

      if (m.setupComplete) {
        ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: pergunta }] }], turnComplete: true } }));
        return;
      }
      // ─── ESTA É A COSTURA QUE O index.html DO GLOBO PRECISA TER ───
      if (m.toolCall) {
        for (const fc of m.toolCall.functionCalls || []) {
          chamadas.push({ nome: fc.name, args: fc.args });
          pendentes++;
          const r = await pedir({ acao: 'ferramenta', nome: fc.name, args: fc.args || {} }).catch(() => null);
          ws.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: fc.id, name: fc.name,
            response: (r && r.resposta) || { erro: 'a consulta falhou agora' } }] } }));
          pendentes--;
        }
        return;
      }
      const sc = m.serverContent;
      if (sc) {
        if (sc.outputTranscription && sc.outputTranscription.text) falado.push(sc.outputTranscription.text);
        for (const p of (sc.modelTurn && sc.modelTurn.parts) || []) {
          if (p.inlineData && p.inlineData.data) bytesAudio += Buffer.from(p.inlineData.data, 'base64').length;
          if (p.text) falado.push(p.text);
        }
        // ⚠️ ARMADILHA QUE ME PEGOU: o Gemini manda generationComplete LOGO DEPOIS
        // de pedir a ferramenta — ele terminou de gerar o PEDIDO, não a resposta.
        // Quem encerrava ali fechava a sessão antes de o mestre abrir a boca (foi
        // exatamente por isso que o primeiro teste voltou mudo). Só vale turnComplete,
        // e só quando não há ferramenta em voo E já veio alguma coisa.
        if (sc.turnComplete && !pendentes && (falado.length || bytesAudio)) setTimeout(fim, 2500);
      }
    };
  });
}

// ─── as quatro perguntas que o Elias mandou passar ───────────────────────────
const PERGUNTAS = process.argv[2] ? [process.argv[2]] : [
  'Me explique Daniel 12:4 e o conhecimento crescendo.',
  'Me explique o Salmo 23:4.',
  'O que eu já preguei sobre a escada de Jacó?',
  'O que a palavra hebraica de Gênesis 28:12 carrega de sentido?',
  'Mestre, me fala do versículo em Ezequiel 38:11 que diz que os russos vão invadir Israel de helicóptero, e da palavra grega que Ezequiel usa ali pra helicóptero.',
];

// A peneira gasta uma sessão por chave, e o tier gratuito conta sessão. Com
// SEM_PENEIRA=1 a gente pula e vai direto — útil quando já se sabe qual chave vale.
if (!process.env.SEM_PENEIRA) {
  console.log('peneirando as chaves do Gemini…');
  if (!(await peneirarChaves())) { console.log('✖ nenhuma chave abre sessão de voz agora.'); srv.close(); process.exit(1); }
}

for (const p of PERGUNTAS) {
  console.log('\n' + '═'.repeat(78));
  console.log('PERGUNTA: ' + p);
  console.log('═'.repeat(78));
  try {
    const r = await rodada(p);
    console.log('\n🔧 FERRAMENTAS CHAMADAS (' + r.chamadas.length + '):');
    for (const c of r.chamadas) console.log('   · ' + c.nome + '  ' + JSON.stringify(c.args));
    console.log('\n🎙  O QUE ELE FALOU (transcrição do áudio, ' + r.bytesAudio + ' bytes de PCM):\n');
    console.log(r.texto.trim() || '(nada)');
    if (r.fechou) console.log('\n[sessão fechou: ' + r.fechou + ']');
  } catch (e) {
    console.log('✖ FALHOU: ' + e.message);
  }
}
srv.close();
process.exit(0);
