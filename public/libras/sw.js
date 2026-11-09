/* Conecta Libras — funciona sem internet depois da primeira visita */
const CACHE = 'conecta-libras-v4';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').concat('C-cedilha');
const SHELL = ['./', './index.html', './app.css?v=4', './app.js?v=4', './manifest.webmanifest',
  './img/capa.jpg', './img/capa-foto.jpg', './img/banner.jpg', './img/logo-transp.png', './icons/icon-192.png', './icons/icon-180.png']
  .concat(LETTERS.map((l) => './alfabeto/' + l + '.jpg'));
const VIDEOS = LETTERS.map((l) => './alfabeto/' + l + '.mp4');

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await c.addAll(SHELL);
    // vídeos em segundo plano: se algum falhar, o app continua
    await Promise.all(VIDEOS.map((u) => c.add(u).catch(() => {})));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('conecta-libras-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Safari (iPhone/iPad) pede vídeos em pedaços (Range); respondemos 206 a partir do cache.
async function rangeResponse(req, res) {
  const range = req.headers.get('range');
  if (!range) return res;
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start = m && m[1] ? +m[1] : 0;
  let end = m && m[2] ? +m[2] : buf.byteLength - 1;
  if (m && !m[1] && m[2]) { start = buf.byteLength - +m[2]; end = buf.byteLength - 1; }
  end = Math.min(end, buf.byteLength - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': 'video/mp4', 'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' }
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  if (url.pathname.endsWith('.mp4')) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      let res = await c.match(url.origin + url.pathname);
      if (!res) {
        try {
          const full = await fetch(url.href);
          if (full.ok) { c.put(url.href, full.clone()); res = full; }
          else return full;
        } catch (err) { return fetch(req); }
      }
      return rangeResponse(req, res);
    })());
    return;
  }

  // Páginas: rede primeiro (para pegar atualizações), cache se estiver sem internet
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { caches.open(CACHE).then((c) => c.put('./', r.clone())); return r; })
      .catch(() => caches.match('./')));
    return;
  }

  // Demais arquivos: cache primeiro
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
    return r;
  })));
});
