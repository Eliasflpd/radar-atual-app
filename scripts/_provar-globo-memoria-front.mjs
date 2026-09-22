/* ══════════════════════════════════════════════════════════════════════════════
   A COSTURA DO GLOBO COM A MEMÓRIA — provada na bancada, com o JS REAL da página.

     node scripts/_provar-globo-memoria-front.mjs

   POR QUE EXISTE (e por que não basta provar o servidor)
   O servidor pode estar perfeito e a memória continuar morta: basta o navegador
   não mandar a chave do pastor, ou não avisar que foi cortado, ou continuar
   mandando toda ferramenta pro garimpo velho. Foi assim que as cinco ferramentas
   novas ficaram voltando vazias por um dia inteiro — o servidor certo, o front
   falando a língua antiga.

   O QUE ESTA BANCADA FAZ
   Arranca o <script> de dentro de public/biblioteca/voz/index.html — o MESMO
   arquivo que vai pro ar, sem cópia e sem mock do nosso código — roda num
   navegador de mentira e grava TUDO o que a página manda pro /api/voz. Depois
   empurra mensagens do Gemini (transcrição, corte, fim de turno) pela porta real
   e confere o que a página fez com elas.

   O QUE TEM QUE SER VERDADE NO FIM
     1. a página descobre quem é o pastor e manda a chave em TODA requisição
     2. ferramenta vai pela PORTA ÚNICA (acao:'ferramenta'), não pelo garimpo velho
     3. o que ele falou e o que o mestre respondeu viram um 'lembrar' por turno
     4. cortar o mestre manda 'cortado:true' com o que ele estava dizendo
     5. encerrar manda 'fim:true' (é o que faz o resumo sair na hora)
     6. fechar a aba no braço manda pelo sendBeacon, que sobrevive à página
   ══════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGINA = path.join(RAIZ, 'public', 'biblioteca', 'voz', 'index.html');
const html = fs.readFileSync(PAGINA, 'utf8');
const m = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/i.exec(html);
if (!m) { console.error('não achei o <script> da página'); process.exit(1); }
const CODIGO = m[1];

/* ════════ O NAVEGADOR DE MENTIRA — o mínimo pra página acordar ════════════ */
const enviados = [];        // tudo o que a página mandou pro /api/voz
const beacons = [];         // o que ela mandou por sendBeacon (aba fechando)

class FakeAudioContext {
  constructor(o) {
    this.sampleRate = (o && o.sampleRate) || 48000;
    this.state = 'running'; this.destination = {}; this.audioWorklet = undefined;
    this._t0 = Date.now();
  }
  get currentTime() { return (Date.now() - this._t0) / 1000; }
  createGain() { return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  createAnalyser() { return { fftSize: 256, frequencyBinCount: 128, smoothingTimeConstant: 0, connect() {}, disconnect() {}, getByteTimeDomainData() {}, getByteFrequencyData() {} }; }
  createBuffer(c, n, r) { return { length: n, sampleRate: r, getChannelData: () => new Float32Array(n) }; }
  createBufferSource() { return { buffer: null, onended: null, connect() {}, disconnect() {}, start() {}, stop() {} }; }
  createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
  createScriptProcessor() { return { onaudioprocess: null, connect() {}, disconnect() {} }; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

let ultimoWS = null;
class FakeWebSocket {
  constructor(url) {
    this.url = url; this.readyState = 0; this.binaryType = '';
    this.onopen = this.onmessage = this.onerror = this.onclose = null;
    ultimoWS = this;
    setTimeout(() => { this.readyState = 1; this.onopen && this.onopen(); }, 5);
  }
  send() {}
  close() { this.readyState = 3; this.onclose && this.onclose({ code: 1000, reason: '' }); }
}

function elemento(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(), children: [], style: {}, dataset: {},
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, v) { v ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    _ouv: {}, textContent: '', innerHTML: '', hidden: false, value: '', disabled: false,
    width: 300, height: 300,
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); },
    remove() {}, setAttribute() {}, removeAttribute() {}, focus() {}, select() {}, scrollTo() {},
    addEventListener(t, f) { (this._ouv[t] = this._ouv[t] || []).push(f); },
    removeEventListener() {},
    dispara(t, ev) { (this._ouv[t] || []).forEach((f) => f(ev || {})); },
    querySelector() { return elemento('div'); },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { top: 0, bottom: 10, left: 0, right: 10, width: 10, height: 10 }; },
    getContext() { return { canvas: { width: 300, height: 300 }, save() {}, restore() {}, clearRect() {},
      beginPath() {}, arc() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, closePath() {},
      createRadialGradient() { return { addColorStop() {} }; }, createLinearGradient() { return { addColorStop() {} }; },
      setTransform() {}, translate() {}, rotate() {}, scale() {}, fillText() {}, measureText() { return { width: 10 }; },
      ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {}, rect() {}, clip() {} }; },
    play() { return Promise.resolve(); }, pause() {}, load() {},
    get paused() { return false; },
  };
  return el;
}

const porId = {};
const doc = {
  body: elemento('body'), documentElement: elemento('html'),
  createElement: (t) => elemento(t),
  getElementById: (id) => (porId[id] = porId[id] || elemento('div')),
  querySelector: () => elemento('div'), querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
  visibilityState: 'visible', hidden: false,
  execCommand() { return true; },
};

const nav = {
  userAgent: 'bancada', maxTouchPoints: 5,
  wakeLock: { request: () => Promise.resolve({ released: false, addEventListener() {}, release() { return Promise.resolve(); } }) },
  mediaSession: { metadata: null, playbackState: 'none', setActionHandler() {} },
  mediaDevices: {
    getUserMedia: () => Promise.resolve({ getAudioTracks: () => [{ label: 'mic' }], getTracks: () => [{ stop() {} }] }),
    enumerateDevices: () => Promise.resolve([]),
  },
  clipboard: { writeText: () => Promise.resolve() },
  onLine: true,
  // ESTE é o ponto da prova 6: a aba fechando manda por aqui, não por fetch.
  sendBeacon(url, blob) { beacons.push({ url: String(url), corpo: blob && blob.__texto }); return true; },
};

function fetchFalso(url, opc) {
  const u = String(url);
  if (u.indexOf('/api/voz') >= 0) {
    const corpo = JSON.parse((opc && opc.body) || '{}');
    enviados.push(corpo);
    if (corpo.acao === 'token') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({
        ok: true, url: 'wss://mentira/live', token: 'abc', modelo: 'models/fake', voz: 'Orus',
        lembrando: true }) });
    }
    if (corpo.acao === 'ferramenta') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, nome: corpo.nome,
        resposta: { lembro: false, ordem: 'diga que não lembra' } }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
  }
  return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
}

class FakeBlob {
  constructor(partes, o) { this.__texto = (partes || []).join(''); this.type = (o && o.type) || ''; }
}

const janela = {
  AudioContext: FakeAudioContext, WebSocket: FakeWebSocket,
  MediaMetadata: class { constructor(o) { Object.assign(this, o); } },
  SpeechSynthesisUtterance: class { constructor(t) { this.text = t; this.onend = null; } },
  speechSynthesis: { speak(u) { setTimeout(() => u.onend && u.onend(), 5); }, cancel() {} },
  requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
  localStorage: { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } },
  location: { search: '', href: '', origin: 'https://radar-atual.vercel.app' },
  _ouv: {},
  addEventListener(t, f) { (this._ouv[t] = this._ouv[t] || []).push(f); },
  removeEventListener() {},
  dispara(t) { (this._ouv[t] || []).forEach((f) => f({})); },
  devicePixelRatio: 2, __VOZ_BANCADA: true, innerWidth: 400, innerHeight: 800,
};

// O PASTOR JÁ CADASTRADO: é do 'radar_user' que sai a chave da memória, a MESMA
// do resto do RADAR. Se a página parar de ler daqui, a prova 1 cai.
janela.localStorage.setItem('radar_user', JSON.stringify({ whatsapp: '(34) 99988-0317', nome: 'pastor' }));

const contexto = vm.createContext(Object.assign(janela, {
  window: janela, document: doc, navigator: nav, self: janela,
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  fetch: fetchFalso, Blob: FakeBlob,
  URL: { createObjectURL: () => 'blob:mentira', revokeObjectURL() {} },
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  TextDecoder, Promise, Date, Math, JSON, Object, Array, String, Number, Error,
  Int16Array, Uint8Array, Float32Array, ArrayBuffer, DataView, Set, Map,
}));

/* ════════ O ROTEIRO ═══════════════════════════════════════════════════════ */
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let passou = 0, falhou = 0;
const ok = (n, c, d) => { if (c) { passou++; console.log('  ✅', n, d ? '— ' + d : ''); } else { falhou++; console.log('  ❌', n, d ? '— ' + d : ''); } };
const lembrares = () => enviados.filter((x) => x.acao === 'lembrar');

console.log('┌─ A COSTURA DO GLOBO COM A MEMÓRIA ────────────────────────────────┐');
console.log('│ JS real de public/biblioteca/voz/index.html, num navegador falso   │');
console.log('└───────────────────────────────────────────────────────────────────┘\n');

vm.runInContext(CODIGO, contexto, { filename: 'voz/index.html#script' });
const V = contexto.__VOZ;
if (!V) { console.error('a alça de bancada (window.__VOZ) não apareceu'); process.exit(1); }
const S = V.S;

await V.ligar();
await espera(120);

const ws = S.ws, g = S.geracao;
const mandar = (o) => V.tratar(JSON.stringify(o), g, ws);

console.log('▸ 1. a chave do pastor viaja em tudo');
{
  const tok = enviados.filter((x) => x.acao === 'token');
  ok('a página pediu o token', tok.length > 0);
  ok('e mandou a chave junto (o whatsapp, só dígitos)', tok.length > 0 && tok[0].user === '34999880317', tok[0] && tok[0].user);
  ok('o servidor disse que assinou COM memória, e a página anotou', S.lembrando === true);
}

console.log('\n▸ 2. ferramenta vai pela PORTA ÚNICA, não pelo garimpo velho');
{
  mandar({ toolCall: { functionCalls: [{ id: 'f1', name: 'o_que_ja_falamos', args: { assunto: 'escada de Jacó' } }] } });
  await espera(60);
  const f = enviados.filter((x) => x.acao === 'ferramenta');
  const velho = enviados.filter((x) => x.acao === 'garimpo');
  ok('foi por acao:"ferramenta"', f.length === 1, f[0] && (f[0].nome + ' ' + JSON.stringify(f[0].args)));
  ok('NÃO foi pelo garimpo velho (era isso que devolvia vazio)', velho.length === 0);
  ok('com a chave do pastor junto', f.length === 1 && f[0].user === '34999880317');
  ok('e a tela mostra o rótulo daquela ferramenta', S.rotuloFerr === '🧠 Lembrando', S.rotuloFerr);
}

console.log('\n▸ 3. o turno acabou: vira memória');
{
  const antes = lembrares().length;
  mandar({ serverContent: { inputTranscription: { text: 'Me explique Daniel 12:4.' } } });
  mandar({ serverContent: { outputTranscription: { text: 'O livro estava selado até o tempo do fim.' } } });
  mandar({ serverContent: { turnComplete: true } });
  await espera(60);
  const l = lembrares();
  ok('mandou UM lembrar no fim do turno', l.length === antes + 1, l.length - antes + ' chamada(s)');
  const u = l[l.length - 1] || {};
  ok('com o que o PASTOR falou', /Daniel 12:4/.test(u.eu || ''), u.eu);
  ok('e com o que o MESTRE respondeu', /selado/.test(u.mestre || ''), u.mestre);
  ok('e com a chave do pastor', u.user === '34999880317');
  ok('não sobrou nada pendurado pro próximo turno', S.memEu === '' && S.memMestre === '');
}

console.log('\n▸ 4. ele CORTA o mestre no meio — o assunto fica pela metade');
{
  const antes = lembrares().length;
  mandar({ serverContent: { outputTranscription: { text: 'Os quatro animais sobem do Mar Grande, e o vento' } } });
  mandar({ serverContent: { interrupted: true } });
  await espera(60);
  const l = lembrares();
  ok('mandou um lembrar na hora do corte', l.length === antes + 1);
  const u = l[l.length - 1] || {};
  ok('marcado como CORTADO', u.cortado === true);
  ok('com o que ele estava dizendo quando foi cortado', /Mar Grande/.test(u.mestre || ''), u.mestre);
}

console.log('\n▸ 5. encerrou a conversa: o resumo sai na hora (fim:true)');
{
  const antes = lembrares().length;
  await V.desligar(true);
  await espera(60);
  const l = lembrares();
  ok('mandou o último lembrar ao encerrar', l.length === antes + 1);
  ok('com fim:true — é isto que manda o servidor resumir JÁ', (l[l.length - 1] || {}).fim === true);
}

console.log('\n▸ 6. fechou a aba no braço (fetch morre; sendBeacon sobrevive)');
{
  S.memMestre = 'eu ia mostrar o selo de Daniel doze';
  janela.dispara('pagehide');
  await espera(30);
  ok('mandou por sendBeacon', beacons.length === 1, beacons[0] && beacons[0].url);
  const c = beacons.length ? JSON.parse(beacons[0].corpo) : {};
  ok('com a chave, o texto e fim:true', c.user === '34999880317' && c.fim === true && /selo de Daniel/.test(c.mestre || ''));
}

console.log('\n' + '─'.repeat(64));
console.log(`✅ ${passou} passaram · ❌ ${falhou} falharam`);
process.exit(falhou ? 1 : 0);
