// Service worker: deixa o app instalável e abre rápido (cache dos arquivos do app).
const VERSAO = 'contrata-v6';
const ARQUIVOS = ['/', '/index.html', '/css/app.css', '/js/app.js', '/js/filtro.js', '/js/curriculo.js', '/js/pix.js', '/js/qrcode.js', '/js/vendor/supabase.js', '/icons/icon.svg', '/manifest.webmanifest', '/img/profissional-hero.webp'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))));
  self.clients.claim();
});
// Rede primeiro (dados sempre atuais); cache só se estiver offline.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html')))
  );
});
