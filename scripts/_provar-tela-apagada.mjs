/* ══════════════════════════════════════════════════════════════════════════════
   A PROVA DA TELA APAGADA — na bancada, com o JS REAL da página.

     node scripts/_provar-tela-apagada.mjs

   POR QUE EXISTE
   O buraco nº 1 do globo era morrer quando a tela do celular apaga — justo o
   uso principal do Elias, que é dirigindo. A prova de verdade é no A22, com a
   tela apagada por 60 segundos. Mas prova de verdade só dá pra fazer com o
   aparelho na mão; esta bancada é o que roda TODA VEZ, de graça, e não deixa
   ninguém quebrar o conserto sem perceber.

   O QUE ELA FAZ
   Arranca o <script> de dentro de public/biblioteca/voz/index.html — o mesmo
   arquivo que vai pro ar, sem cópia e sem mock do nosso código — e roda num
   Android de mentira: AudioContext, WebSocket, wakeLock, mediaSession, <audio>
   e microfone falsos. Aí faz o Android se comportar como se comporta de verdade
   quando a tela apaga:
       · esconde a aba              (visibilitychange -> hidden)
       · suspende os AudioContexts  (o relógio do áudio PARA)
       · derruba o WebSocket        (código 1006, como a operadora faz)
   e conta 60 segundos de relógio DE VERDADE.

   O QUE TEM QUE SER VERDADE NO FIM
     1. o wake lock foi pedido ao ligar, e repedido quando a aba voltou
     2. o áudio de mídia (quase mudo) ficou tocando o tempo todo — é ele que
        impede o Android de congelar a aba
     3. o controle do carro foi armado (play/pause/stop/próxima/anterior)
     4. os contextos de áudio voltaram a rodar sozinhos
     5. a linha reconectou sozinha — e NUNCA houve duas linhas vivas
     6. o aparelho avisou "voltei" por voz, uma vez só
     7. o pause do volante NÃO derruba a linha nem para o áudio de mídia
   ══════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGINA = path.join(RAIZ, 'public', 'biblioteca', 'voz', 'index.html');
const SEGUNDOS_NO_ESCURO = Number(process.env.ESCURO_S || 60);

const html = fs.readFileSync(PAGINA, 'utf8');
const m = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/i.exec(html);
if (!m) { console.error('não achei o <script> da página'); process.exit(1); }
const CODIGO = m[1];

/* ════════ O ANDROID DE MENTIRA ════════════════════════════════════════════ */

const conta = {
  wakePedidos: 0, wakeNegados: 0, wakeSoltos: 0,
  playsMidia: 0, resumesSom: 0, resumesMic: 0,
  wsCriados: 0, wsVivos: 0, wsPicoVivos: 0,
  falas: [], handlers: {}, metadata: null, playbackState: [],
  audioSubiu: 0,
};

class FakeAudioContext {
  constructor(o) {
    this.sampleRate = (o && o.sampleRate) || 48000;
    this.state = 'running';
    this._t0 = Date.now(); this._acc = 0;
    this.destination = { nome: 'alto-falante' };
    this.audioWorklet = undefined;          // força o caminho ScriptProcessor (mais velho, mais testado)
    this._qual = o && o.sampleRate === 16000 ? 'mic' : 'som';
  }
  get currentTime() {
    return this.state === 'running' ? this._acc + (Date.now() - this._t0) / 1000 : this._acc;
  }
  // é isto que o Android faz com a tela apagada: o relógio do áudio CONGELA
  dormir() { if (this.state === 'running') { this._acc = this.currentTime; this.state = 'suspended'; } }
  resume() {
    if (this.state === 'suspended') {
      this._t0 = Date.now(); this.state = 'running';
      if (this._qual === 'mic') conta.resumesMic++; else conta.resumesSom++;
    }
    return Promise.resolve();
  }
  close() { this.state = 'closed'; return Promise.resolve(); }
  createGain() { return { gain: { value: 1, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  createAnalyser() { return { fftSize: 512, smoothingTimeConstant: 0, connect() {}, getByteTimeDomainData(b) { b.fill(128); } }; }
  createBuffer(ch, len, rate) { return { duration: len / rate, getChannelData: () => new Float32Array(len) }; }
  createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {}, onended: null }; }
  createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
  createScriptProcessor() { return { onaudioprocess: null, connect() {}, disconnect() {} }; }
}

const socketsVivos = new Set();
class FakeWebSocket {
  constructor(url) {
    conta.wsCriados++;
    this.url = url; this.readyState = 0; this.binaryType = 'blob';
    this.onopen = this.onmessage = this.onerror = this.onclose = null;
    setTimeout(() => {
      if (this.readyState !== 0) return;
      this.readyState = 1;
      socketsVivos.add(this);
      conta.wsVivos = socketsVivos.size;
      if (socketsVivos.size > conta.wsPicoVivos) conta.wsPicoVivos = socketsVivos.size;
      this.onopen && this.onopen({});
    }, 25);
  }
  send(s) {
    let o = {}; try { o = JSON.parse(s); } catch { /* ignora */ }
    if (o.realtimeInput) conta.audioSubiu++;
    if (o.setup) setTimeout(() => this._diz({ setupComplete: {} }), 20);
  }
  _diz(obj) { this.onmessage && this.onmessage({ data: JSON.stringify(obj) }); }
  _sumir(codigo, motivo) {
    if (this.readyState > 1) return;
    this.readyState = 3;
    socketsVivos.delete(this); conta.wsVivos = socketsVivos.size;
    this.onclose && this.onclose({ code: codigo, reason: motivo });
  }
  close(c, r) { this._sumir(c || 1000, r || ''); }
  derrubarComoAOperadora() { this._sumir(1006, 'rede sumiu'); }
}

function elemento(tag = 'div') {
  const el = {
    tagName: String(tag).toUpperCase(),
    nodeName: String(tag).toUpperCase(),
    style: new Proxy({ cssText: '' }, { get: (t, k) => t[k] ?? '', set: (t, k, v) => (t[k] = v, true) }),
    textContent: '', innerHTML: '', value: '', hidden: false, disabled: false,
    className: '', title: '', src: '', loop: false, preload: '', volume: 1,
    paused: true, offsetHeight: 20, clientHeight: 400, clientWidth: 360,
    width: 300, height: 300, children: [], parentNode: null, _ouvintes: {},
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    appendChild(f) { this.children.push(f); f.parentNode = this; return f; },
    removeChild(f) { this.children = this.children.filter(x => x !== f); return f; },
    remove() { if (this.parentNode) this.parentNode.removeChild(this); },
    insertBefore(f) { return this.appendChild(f); },
    querySelector() { return elemento(); },
    querySelectorAll() { return []; },
    addEventListener(t, f) { (this._ouvintes[t] = this._ouvintes[t] || []).push(f); },
    removeEventListener() {},
    dispara(t, ev) { (this._ouvintes[t] || []).forEach(f => f(ev || {})); },
    setAttribute(k, v) { this[k] = v; }, removeAttribute(k) { delete this[k]; }, getAttribute(k) { return this[k]; },
    getBoundingClientRect() { return { top: 0, bottom: 100, left: 0, right: 360, width: 360, height: 100 }; },
    getContext() { return null; },
    focus() {}, select() {},
    scrollTop: 0, scrollHeight: 0,
    // <audio>
    play() { this.paused = false; conta.playsMidia++; return Promise.resolve(); },
    pause() { this.paused = true; },
    load() {},
  };
  return el;
}

const guardados = {};
function pegar(id) { return (guardados[id] = guardados[id] || elemento()); }

const corpo = elemento('body');
const doc = {
  visibilityState: 'visible',
  get hidden() { return this.visibilityState !== 'visible'; },
  body: corpo,
  documentElement: { clientHeight: 800 },
  _ouvintes: {},
  getElementById: pegar,
  createElement: (t) => elemento(t),
  addEventListener(t, f) { (this._ouvintes[t] = this._ouvintes[t] || []).push(f); },
  removeEventListener() {},
  dispara(t) { (this._ouvintes[t] || []).forEach(f => f({})); },
  execCommand() {},
};

const wakes = [];
const nav = {
  onLine: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-A225M) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
  wakeLock: {
    request() {
      conta.wakePedidos++;
      if (doc.visibilityState !== 'visible') {
        conta.wakeNegados++;
        const e = new Error('hidden'); e.name = 'NotAllowedError';
        return Promise.reject(e);
      }
      const s = {
        released: false, _fn: null,
        addEventListener(_, f) { this._fn = f; },
        release() { if (!this.released) { this.released = true; conta.wakeSoltos++; this._fn && this._fn(); } return Promise.resolve(); },
      };
      wakes.push(s);
      return Promise.resolve(s);
    },
  },
  mediaSession: {
    _metadata: null, _playback: 'none',
    set metadata(v) { this._metadata = v; conta.metadata = v; },
    get metadata() { return this._metadata; },
    set playbackState(v) { this._playback = v; if (conta.playbackState[conta.playbackState.length - 1] !== v) conta.playbackState.push(v); },
    get playbackState() { return this._playback; },
    setActionHandler(n, f) { conta.handlers[n] = f; },
  },
  mediaDevices: {
    ondevicechange: null,
    getUserMedia: () => Promise.resolve({
      getAudioTracks: () => [{ label: 'Microfone do aparelho' }],
      getTracks: () => [{ stop() {} }],
    }),
    enumerateDevices: () => Promise.resolve([]),
  },
  clipboard: { writeText: () => Promise.resolve() },
};

const janela = {
  AudioContext: FakeAudioContext,
  WebSocket: FakeWebSocket,
  MediaMetadata: class { constructor(o) { Object.assign(this, o); } },
  SpeechSynthesisUtterance: class { constructor(t) { this.text = t; this.lang = ''; this.onend = null; this.onerror = null; } },
  speechSynthesis: {
    speak(u) { conta.falas.push({ texto: u.text, lang: u.lang }); setTimeout(() => u.onend && u.onend(), 30); },
    cancel() {},
  },
  requestAnimationFrame() { return 0; },      // sem pintura: aqui a prova é do motor
  cancelAnimationFrame() {},
  localStorage: { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } },
  location: { search: '', href: '', origin: 'https://radar-atual.vercel.app' },
  _ouvintes: {},
  addEventListener(t, f) { (this._ouvintes[t] = this._ouvintes[t] || []).push(f); },
  removeEventListener() {},
  dispara(t) { (this._ouvintes[t] || []).forEach(f => f({})); },
  devicePixelRatio: 2,
  __VOZ_BANCADA: true,
};

function fetchFalso(url, opc) {
  const u = String(url);
  if (u.indexOf('/api/voz') >= 0) {
    const corpoReq = JSON.parse((opc && opc.body) || '{}');
    if (corpoReq.acao === 'token') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, url: 'wss://mentira/live', token: 'abc', modelo: 'models/fake', voz: 'Orus' }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, achou: false, texto: '' }) });
  }
  return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });   // vozes/*.wav
}

const contexto = vm.createContext(Object.assign(janela, {
  window: janela, document: doc, navigator: nav, self: janela,
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  fetch: fetchFalso, Blob, URL: { createObjectURL: () => 'blob:mentira', revokeObjectURL() {} },
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  TextDecoder, Promise, Date, Math, JSON, Object, Array, String, Number, Error,
  Int16Array, Uint8Array, Float32Array, ArrayBuffer, DataView,
}));

/* ════════ O ROTEIRO ═══════════════════════════════════════════════════════ */

const espera = (ms) => new Promise(r => setTimeout(r, ms));
const provas = [];
function prova(nome, ok, detalhe) { provas.push({ nome, ok: !!ok, detalhe: detalhe || '' }); }

(async () => {
  console.log('┌─ A PROVA DA TELA APAGADA ─────────────────────────────────────────┐');
  console.log('│ JS real de public/biblioteca/voz/index.html, num Android de mentira │');
  console.log('└────────────────────────────────────────────────────────────────────┘\n');

  vm.runInContext(CODIGO, contexto, { filename: 'voz/index.html#script' });
  const V = contexto.__VOZ;
  if (!V) { console.error('a alça de bancada (window.__VOZ) não apareceu'); process.exit(1); }
  const S = V.S;

  // ── 1. ele toca no globo ────────────────────────────────────────────────
  console.log('→ o pastor toca no globo e a conversa começa…');
  await V.ligar();
  await espera(300);

  const midia = corpo.children.find(c => c.tagName === 'AUDIO');
  console.log('  conversa ligada        : ' + S.ligado);
  console.log('  wake lock pedido       : ' + conta.wakePedidos + 'x');
  console.log('  áudio de mídia tocando : ' + (midia && !midia.paused));
  console.log('  controle do carro      : ' + Object.keys(conta.handlers).join(', '));
  console.log('  o carro vê a aba como  : ' + nav.mediaSession.playbackState);
  console.log('  contexto de áudio      : ' + S.ctxSom.state + ' / mic ' + S.ctxMic.state);
  console.log('  WebSocket              : readyState ' + (S.ws ? S.ws.readyState : '-'));

  prova('1. wake lock pedido ao ligar', conta.wakePedidos >= 1, conta.wakePedidos + ' pedido(s)');
  prova('2. áudio de mídia tocando em laço', !!midia && midia.paused === false && midia.loop === true);
  prova('3. controle do carro armado (play/pause/stop/faixas)',
    ['play', 'pause', 'stop', 'nexttrack', 'previoustrack'].every(k => typeof conta.handlers[k] === 'function'),
    Object.keys(conta.handlers).length + ' botões tomados do carro');
  prova('4. o carro vê a aba como TOCANDO', nav.mediaSession.playbackState === 'playing');
  prova('5. o carro vê o cartaz do RADAR', !!conta.metadata && conta.metadata.artist === 'RADAR');
  prova('6. linha aberta', !!S.ws && S.ws.readyState === 1);

  const ANTES = {
    som: S.ctxSom.state, mic: S.ctxMic.state, ws: S.ws ? S.ws.readyState : -1,
    midia: midia && !midia.paused ? 'tocando' : 'parada',
    relogioSom: S.ctxSom.currentTime,
  };

  // ── 2. A TELA APAGA ─────────────────────────────────────────────────────
  console.log('\n→ 🌑 A TELA APAGA. O Android faz o que sempre faz:');
  doc.visibilityState = 'hidden';
  doc.dispara('visibilitychange');
  await espera(50);
  // o navegador SOLTA o wake lock sozinho quando a aba esconde — é assim no
  // Chrome de verdade, e é por isso que o pedido tem que ser REPETIDO depois.
  wakes.forEach(w => w.release());
  console.log('   · soltou o wake lock (o navegador faz isso sozinho ao esconder a aba)');
  S.ctxSom.dormir(); S.ctxMic.dormir();
  console.log('   · suspendeu os contextos de áudio (o relógio do som congelou)');
  const wsQueMorreu = S.ws;
  wsQueMorreu.derrubarComoAOperadora();
  console.log('   · derrubou o WebSocket (1006)');
  console.log('   · e agora ficamos ' + SEGUNDOS_NO_ESCURO + ' segundos no escuro. Contando…\n');

  const fotos0 = S.fita.length;
  const t0 = Date.now();
  let piorPicoLinhas = 0;
  const olho = setInterval(() => {
    if (socketsVivos.size > piorPicoLinhas) piorPicoLinhas = socketsVivos.size;
    const s = Math.round((Date.now() - t0) / 1000);
    if (s % 10 === 0 && s > 0) {
      process.stdout.write('   ' + String(s).padStart(2) + 's no escuro · som=' + S.ctxSom.state
        + ' mic=' + S.ctxMic.state + ' ws=' + (S.ws ? S.ws.readyState : '-')
        + ' mídia=' + (midia.paused ? 'PARADA' : 'tocando')
        + ' fotos=' + (S.fita.length - fotos0) + '\n');
    }
  }, 1000);
  await espera(SEGUNDOS_NO_ESCURO * 1000);
  clearInterval(olho);

  const DURANTE = {
    fotos: S.fita.length - fotos0,
    som: S.ctxSom.state, mic: S.ctxMic.state, ws: S.ws ? S.ws.readyState : -1,
    midia: midia.paused ? 'parada' : 'tocando',
    relogioSom: S.ctxSom.currentTime,
  };

  // ── 3. A TELA ACENDE ────────────────────────────────────────────────────
  console.log('\n→ 🔆 A tela acende de novo.');
  doc.visibilityState = 'visible';
  doc.dispara('visibilitychange');
  await espera(800);

  const DEPOIS = {
    som: S.ctxSom.state, mic: S.ctxMic.state, ws: S.ws ? S.ws.readyState : -1,
    midia: midia.paused ? 'parada' : 'tocando',
    relogioSom: S.ctxSom.currentTime,
  };

  console.log('\n┌──────── OS NÚMEROS DOS ' + SEGUNDOS_NO_ESCURO + ' SEGUNDOS ────────┐');
  const linha = (r, o) => '  ' + r.padEnd(24) + String(o.som).padEnd(11) + String(o.mic).padEnd(11)
    + ('ws ' + o.ws).padEnd(7) + String(o.midia || '-').padEnd(9);
  console.log('  ' + 'momento'.padEnd(24) + 'ctx SOM'.padEnd(11) + 'ctx MIC'.padEnd(11) + 'WebSocket'.padEnd(7) + ' mídia');
  console.log(linha('ANTES (tela acesa)', ANTES));
  console.log(linha('DURANTE (no escuro)', DURANTE));
  console.log(linha('DEPOIS (tela acesa)', DEPOIS));
  console.log('\n  fotos tiradas no escuro : ' + DURANTE.fotos + ' (1 por segundo esperado: ' + SEGUNDOS_NO_ESCURO + ')');
  console.log('  o relógio do som andou  : ' + (DEPOIS.relogioSom - ANTES.relogioSom).toFixed(1) + ' s');
  console.log('  contextos religados     : som ' + conta.resumesSom + 'x · mic ' + conta.resumesMic + 'x');
  console.log('  WebSockets criados      : ' + conta.wsCriados + ' · PICO de linhas vivas: ' + conta.wsPicoVivos);
  console.log('  wake lock               : ' + conta.wakePedidos + ' pedidos · ' + conta.wakeNegados + ' negados (aba escondida)');
  console.log('  áudio de mídia retomado : ' + S.retomadasMidia + 'x pelo vigia');
  console.log('  avisos por voz          : ' + JSON.stringify(conta.falas.map(f => f.texto)));

  prova('7. a aba NÃO congelou (a fita continuou correndo)',
    DURANTE.fotos >= SEGUNDOS_NO_ESCURO * 0.8, DURANTE.fotos + '/' + SEGUNDOS_NO_ESCURO + ' fotos');
  prova('8. o áudio de mídia nunca parou', DURANTE.midia === 'tocando' && DEPOIS.midia === 'tocando');
  prova('9. os contextos de áudio voltaram sozinhos, no escuro',
    DURANTE.som === 'running' && DURANTE.mic === 'running');
  prova('10. a linha reconectou sozinha', DEPOIS.ws === 1 && S.ws !== wsQueMorreu);
  prova('11. NUNCA houve duas linhas vivas (voz dupla)', conta.wsPicoVivos <= 1 && S.picoWs <= 1,
    'pico ' + conta.wsPicoVivos);
  prova('12. avisou "voltei" por voz, uma vez só',
    conta.falas.length === 1 && /voltei/i.test(conta.falas[0].texto || '') && conta.falas[0].lang === 'pt-BR',
    conta.falas.length + ' aviso(s)');
  prova('13. wake lock repedido quando a aba voltou', conta.wakePedidos >= 2,
    conta.wakePedidos + ' pedidos no total');

  // ── 4. O CONTROLE DO CARRO ──────────────────────────────────────────────
  console.log('\n→ 🚗 o botão do volante: pausa e play.');
  const wsAntesDaPausa = S.ws;
  const subiuAntes = conta.audioSubiu;
  conta.handlers.pause();
  await espera(60);
  V.mandarAudio(new Float32Array(2048).fill(0.5));   // ele fala durante a pausa
  const pausaOk = S.pausado && S.ws === wsAntesDaPausa && S.ws.readyState === 1 && !midia.paused;
  console.log('   pausado=' + S.pausado + ' · linha ainda de pé=' + (S.ws === wsAntesDaPausa && S.ws.readyState === 1)
    + ' · áudio de mídia=' + (midia.paused ? 'PAROU' : 'segue tocando')
    + ' · subiu áudio pro Google=' + (conta.audioSubiu > subiuAntes));
  prova('14. pausa do volante NÃO derruba a linha', pausaOk);
  prova('15. pausado, nada sobe pro Google', conta.audioSubiu === subiuAntes);
  prova('16. pausado, o áudio de mídia continua (senão a aba congela)', !midia.paused);
  prova('17. o carro vê "pausado"', nav.mediaSession.playbackState === 'paused');

  conta.handlers.play();
  await espera(60);
  console.log('   play do volante -> pausado=' + S.pausado + ' · o carro vê "' + nav.mediaSession.playbackState + '"');
  prova('18. play do volante retoma', !S.pausado && nav.mediaSession.playbackState === 'playing');

  // ── 5. encerrar de verdade ──────────────────────────────────────────────
  V.desligar(true);
  await espera(250);
  prova('19. ao encerrar, solta a sessão de mídia (o carro volta a mandar no que é dele)',
    nav.mediaSession.playbackState === 'none' && midia.paused);
  prova('20. ao encerrar, nenhuma linha fica viva', socketsVivos.size === 0);

  // ── veredito ────────────────────────────────────────────────────────────
  console.log('\n┌──────── VEREDITO ────────┐');
  let ruins = 0;
  for (const p of provas) {
    if (!p.ok) ruins++;
    console.log('  ' + (p.ok ? '✅' : '🛑') + ' ' + p.nome + (p.detalhe ? '   (' + p.detalhe + ')' : ''));
  }
  console.log('');
  console.log(ruins ? ('🛑 FALHOU — ' + ruins + ' de ' + provas.length) : ('✅ PASSOU — ' + provas.length + '/' + provas.length));
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error('\nA BANCADA QUEBROU:', e && e.stack || e); process.exit(1); });
