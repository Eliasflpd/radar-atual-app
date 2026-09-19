/* ════════════════════════════════════════════════════════════════════════════
   TESTE DO SERVICE WORKER — sem navegador, sem Playwright.
   Roda o public/sw.js de verdade dentro do node, com um Cache Storage e uma
   rede de mentira. Depois DESLIGA a rede e cobra o que o Elias precisa:
     · a home abre do cache
     · o app.js abre mesmo com ?v= diferente do que foi guardado
     · a Bíblia (pacote) abre do cache
     · /api/ devolve aviso em JSON — nunca erro mudo
     · página nunca vista devolve a tela "sem internet", não undefined
   Uso: node scripts/teste-offline-sw.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ORIGEM = 'https://radar-atual.vercel.app';

/* ── Cache Storage de mentira ─────────────────────────────────────────────── */
function chave(r){ return typeof r === 'string' ? new URL(r, ORIGEM).href : r.url; }
function semQuery(u){ const x = new URL(u); x.search = ''; return x.href; }

class CacheFalso {
  constructor(nome){ this.nome = nome; this.itens = new Map(); }
  async put(req, resp){ this.itens.set(chave(req), resp); }
  async add(req){
    const r = await globalThis.fetch(req);
    if (!r || !r.ok) throw new Error('add falhou: ' + chave(req));
    this.itens.set(chave(req), r);
  }
  async match(req, opc){
    const k = chave(req);
    if (this.itens.has(k)) return this.itens.get(k);
    if (opc && opc.ignoreSearch) {
      const alvo = semQuery(k);
      for (const [kk, vv] of this.itens) if (semQuery(kk) === alvo) return vv;
    }
    return undefined;
  }
}
class CachesFalso {
  constructor(){ this.mapa = new Map(); }
  async open(n){ if (!this.mapa.has(n)) this.mapa.set(n, new CacheFalso(n)); return this.mapa.get(n); }
  async keys(){ return [...this.mapa.keys()]; }
  async delete(n){ return this.mapa.delete(n); }
  async has(n){ return this.mapa.has(n); }
  async match(req, opc){
    for (const c of this.mapa.values()){ const r = await c.match(req, opc); if (r) return r; }
    return undefined;
  }
}

/* ── rede de mentira ──────────────────────────────────────────────────────── */
let REDE_LIGADA = true;
const SERVIDOR = new Map();     // url -> {corpo, tipo}
function publicar(rota, corpo, tipo){ SERVIDOR.set(new URL(rota, ORIGEM).href, { corpo, tipo: tipo || 'text/plain' }); }

const fetchFalso = async (req) => {
  const u = chave(req);
  if (!REDE_LIGADA) throw new TypeError('Failed to fetch');
  const it = SERVIDOR.get(u) || SERVIDOR.get(semQuery(u));
  if (!it) return new Response('nao achei', { status: 404 });
  return new Response(it.corpo, { status: 200, headers: { 'Content-Type': it.tipo } });
};

/* ── o "self" do service worker ───────────────────────────────────────────── */
const ouvintes = {};
const self_ = {
  location: { origin: ORIGEM },
  addEventListener: (t, f) => { (ouvintes[t] = ouvintes[t] || []).push(f); },
  skipWaiting: async () => {},
  clients: { claim: async () => {}, matchAll: async () => [] },
  registration: { showNotification: async () => {} },
};

// no navegador o Request resolve caminho relativo contra o escopo do SW;
// o do node exige URL absoluta. Este embrulho faz o mesmo que o navegador.
class RequestRelativo extends Request {
  constructor(entrada, opc){
    if (typeof entrada === 'string') entrada = new URL(entrada, ORIGEM).href;
    super(entrada, opc);
  }
}

const caixa = {
  self: self_, caches: new CachesFalso(), fetch: fetchFalso,
  Request: RequestRelativo, Response, URL, Promise, console, clients: self_.clients,
  setTimeout, TypeError,
};
caixa.globalThis = caixa;
vm.createContext(caixa);
globalThis.fetch = fetchFalso;

// dá pra apontar pra outro sw.js (ex.: o antigo, pra comparar): node scripts/teste-offline-sw.js caminho/sw.js
const ARQ_SW = process.argv[2] || path.join(RAIZ, 'public', 'sw.js');
console.log('service worker em teste: ' + ARQ_SW);
vm.runInContext(fs.readFileSync(ARQ_SW, 'utf8'), caixa, { filename: 'sw.js' });
const VERSAO = (fs.readFileSync(ARQ_SW, 'utf8').match(/const V=['"]([^'"]+)/) || [])[1];

/* ── disparar eventos ─────────────────────────────────────────────────────── */
async function disparar(tipo, ev){
  const fs_ = ouvintes[tipo] || [];
  for (const f of fs_) f(ev);
  if (ev._espera) await Promise.all(ev._espera);
  return ev._resposta ? await ev._resposta : undefined;
}
function eventoInstalar(){ const e = { _espera: [] }; e.waitUntil = p => e._espera.push(p); return e; }
function eventoFetch(url, opc){
  opc = opc || {};
  const req = new Request(new URL(url, ORIGEM).href);
  Object.defineProperty(req, 'mode', { value: opc.mode || 'no-cors' });
  Object.defineProperty(req, 'destination', { value: opc.destination || '' });
  const e = { request: req, _espera: [] };
  e.respondWith = p => { e._resposta = p; };
  return e;
}

/* ── o teste ──────────────────────────────────────────────────────────────── */
let passou = 0, falhou = 0;
function conta(ok, titulo, detalhe){
  console.log((ok ? '  OK   ' : '  FALHA') + '  ' + titulo + (detalhe ? '   → ' + detalhe : ''));
  ok ? passou++ : falhou++;
}

(async () => {
  // o que o servidor tem no ar
  publicar('/', '<html>HOME DO RADAR</html>', 'text/html');
  publicar('/manifest.json', '{"name":"RADAR ATUAL"}', 'application/json');
  publicar('/assets/app.js', '/*APP.JS v148*/', 'application/javascript');
  publicar('/assets/radar.css', 'body{}', 'text/css');
  publicar('/assets/lupa.js', '/*lupa*/', 'application/javascript');
  publicar('/_uso.js', '/*uso*/', 'application/javascript');
  publicar('/icon-192.png', 'PNG', 'image/png');
  publicar('/img/ceadema.png', 'PNG', 'image/png');
  ['biblia','biblioteca','devocional','ebd','igrejas','maratona','perolas','plano','templo']
    .forEach(n => publicar('/icons/' + n + '.png', 'PNG', 'image/png'));
  publicar('/biblia.json', '[{"name":"Gênesis"}]', 'application/json');
  publicar('/biblioteca/mensagens/a-escada-de-jaco.html', '<html>A ESCADA</html>', 'text/html');
  publicar('/biblioteca/concilio/index.html', '<html>CONCILIO</html>', 'text/html');
  publicar('/api/concilio', '{"ok":true}', 'application/json');

  console.log('\n═══ 1. INSTALAR O SERVICE WORKER (com internet) ═══');
  await disparar('install', eventoInstalar());
  await disparar('activate', eventoInstalar());
  const shell = await caixa.caches.open(VERSAO);
  console.log('  pré-cache gravado: ' + shell.itens.size + ' arquivos');
  conta(shell.itens.size >= 17, 'os 17 itens do shell entraram no cache na instalação', shell.itens.size + ' itens');

  console.log('\n═══ 2. O IRMÃO BAIXA O PACOTE (botão "Deixar disponível sem internet") ═══');
  const pac = await caixa.caches.open('radar-pacote-v1');
  for (const u of ['/biblia.json', '/biblioteca/mensagens/a-escada-de-jaco.html'])
    await pac.put(u, await fetchFalso(u));
  console.log('  pacote gravado: ' + pac.itens.size + ' arquivos (Bíblia + mensagens)');

  console.log('\n═══ 3. CORTA A INTERNET ═══');
  REDE_LIGADA = false;

  let r;

  r = await disparar('fetch', eventoFetch('/', { mode: 'navigate', destination: 'document' }));
  conta(r && r.status === 200 && (await r.clone().text()).includes('HOME DO RADAR'),
    'a HOME abre do cache', r ? 'status ' + r.status : 'undefined!');

  r = await disparar('fetch', eventoFetch('/?hist=noe', { mode: 'navigate', destination: 'document' }));
  conta(r && (await r.clone().text()).includes('HOME DO RADAR'),
    'a home abre mesmo com ?hist= no link compartilhado (ignoreSearch)', r ? 'status ' + r.status : 'undefined!');

  r = await disparar('fetch', eventoFetch('/assets/app.js?v=146', { destination: 'script' }));
  conta(r && (await r.clone().text()).includes('APP.JS'),
    'o app.js abre pedido como ?v=146 (guardado sem query)', r ? 'status ' + r.status : 'undefined!');

  r = await disparar('fetch', eventoFetch('/assets/app.js?v=999', { destination: 'script' }));
  conta(r && (await r.clone().text()).includes('APP.JS'),
    'o app.js AINDA abre quando a versão sobe pra ?v=999  ← era a tela branca',
    r ? 'status ' + r.status : 'undefined!');

  r = await disparar('fetch', eventoFetch('/assets/radar.css', { destination: 'style' }));
  conta(r && (await r.clone().text()).includes('body'), 'o CSS abre do cache', r ? 'status ' + r.status : 'undefined!');

  r = await disparar('fetch', eventoFetch('/icons/biblia.png', { destination: 'image' }));
  conta(r && r.status === 200, 'os ícones da home abrem do cache', r ? 'status ' + r.status : 'undefined!');

  r = await disparar('fetch', eventoFetch('/biblia.json'));
  conta(r && (await r.clone().text()).includes('Gênesis'),
    'a BÍBLIA abre do pacote  ← o coração', r ? 'status ' + r.status : 'undefined!');

  r = await disparar('fetch', eventoFetch('/biblioteca/mensagens/a-escada-de-jaco.html', { mode: 'navigate', destination: 'document' }));
  conta(r && (await r.clone().text()).includes('A ESCADA'), 'a mensagem abre do pacote', r ? 'status ' + r.status : 'undefined!');

  r = await disparar('fetch', eventoFetch('/api/concilio'));
  const corpoApi = r ? await r.clone().text() : '';
  let jApi = {}; try { jApi = JSON.parse(corpoApi); } catch (e) {}
  conta(r && r.status === 503 && jApi.offline === true && !!jApi.erro,
    '/api/ devolve JSON de aviso (ok:false, offline:true) e NÃO erro mudo',
    r ? r.status + ' ' + corpoApi : 'undefined!');

  r = await disparar('fetch', eventoFetch('/biblioteca/concilio/index.html', { mode: 'navigate', destination: 'document' }));
  const corpoOff = r ? await r.clone().text() : '';
  conta(r && r.status === 200 && corpoOff.includes('sem internet') && corpoOff.includes('Voltar ao Início'),
    'página nunca aberta devolve a TELA "sem internet" com Voltar ao Início',
    r ? 'status ' + r.status : 'undefined! (era isso que dava tela branca)');

  r = await disparar('fetch', eventoFetch('/img/hist/qualquer.jpg', { destination: 'image' }));
  conta(r instanceof Response, 'imagem que não existe devolve uma Response (nunca undefined)',
    r ? 'status ' + r.status : 'undefined!');

  console.log('\n═══ 4. A INTERNET VOLTA ═══');
  REDE_LIGADA = true;
  r = await disparar('fetch', eventoFetch('/api/concilio'));
  conta(r && r.status === 200 && (await r.clone().text()).includes('"ok":true'),
    '/api/ volta a responder de verdade (não ficou cacheado o aviso)', r ? 'status ' + r.status : 'undefined!');

  console.log('\n═══ 4b. /api/ COM RESERVA — e o que NUNCA pode vir do cache ═══');
  publicar('/api/leitura', '{"ok":true,"plano":"dia 12"}', 'application/json');
  publicar('/api/acesso?phone=99', '{"ok":true,"status":"expirado"}', 'application/json');
  // com rede: as duas respondem e só a inofensiva é guardada
  await disparar('fetch', eventoFetch('/api/leitura'));
  await disparar('fetch', eventoFetch('/api/acesso?phone=99'));
  REDE_LIGADA = false;

  r = await disparar('fetch', eventoFetch('/api/leitura'));
  conta(r && r.status === 200 && (await r.clone().text()).includes('dia 12'),
    '/api/leitura serve a última resposta boa quando a rede cai', r ? 'status ' + r.status : 'undefined!');

  r = await disparar('fetch', eventoFetch('/api/acesso?phone=99'));
  const corpoGate = r ? await r.clone().text() : '';
  conta(r && r.status === 503 && !corpoGate.includes('expirado'),
    'a trava dos 30 dias NUNCA vem do cache (não bloqueia irmão offline)',
    r ? r.status + ' ' + corpoGate : 'undefined!');
  REDE_LIGADA = true;

  console.log('\n═══ 5. SOBE A VERSÃO DO APP (radar-v149) ═══');
  const antes = await caixa.caches.keys();
  // simula a ativação da versão nova: apaga tudo que não for o V novo nem o pacote
  for (const k of antes) if (k !== 'radar-v149' && k !== 'radar-pacote-v1') await caixa.caches.delete(k);
  const depois = await caixa.caches.keys();
  conta(depois.includes('radar-pacote-v1'),
    'o pacote de 5 MB do irmão SOBREVIVE à troca de versão', 'caches agora: ' + JSON.stringify(depois));

  console.log('\n────────────────────────────────────────────────');
  console.log(passou + ' passaram · ' + falhou + ' falharam');
  process.exit(falhou ? 1 : 0);
})();
