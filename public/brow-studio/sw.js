// BROW STUDIO — service worker (escopo /brow-studio/). Torna o app instalável e
// mostra uma página própria sem internet. NUNCA guarda respostas da API
// (/api/...): dados de clientes, saúde e financeiro não ficam no aparelho.
// Guarda só a "casca" (HTML, CSS, JS, ícones e fontes) para abrir rápido.
const VERSAO = 'brow-v8';
const CASCA = ['/brow-studio/offline.html', '/brow-studio/brow.css?v=31', '/brow-studio/img/icones/icone-192.png', '/brow-studio/manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(CASCA)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('brow-') && k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request; const u = new URL(req.url);
  if (req.method !== 'GET') return;
  if (u.origin === location.origin && u.pathname.startsWith('/api/')) return;   // dados: sempre da rede, nunca em cache
  const fonte = u.origin === 'https://fonts.googleapis.com' || u.origin === 'https://fonts.gstatic.com';
  if (u.origin !== location.origin && !fonte) return;
  if (u.origin === location.origin && !u.pathname.startsWith('/brow-studio/')) return;
  if (req.mode === 'navigate') {   // páginas: rede primeiro; sem internet, a cópia guardada ou o aviso
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSAO).then(c => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('/brow-studio/offline.html'))));
    return;
  }
  // CSS/JS/imagens/fontes: usa a cópia e atualiza por trás (os arquivos têm versão na URL)
  e.respondWith(caches.match(req).then(guardado => {
    const rede = fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(VERSAO).then(c => c.put(req, cp)); } return r; }).catch(() => guardado);
    return guardado || rede;
  }));
});
