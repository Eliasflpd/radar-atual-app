const V='radar-v1';
const CACHE=['/','/manifest.json','/capa.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(CACHE))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
