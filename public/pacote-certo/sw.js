// Guarda o aplicativo no aparelho para abrir sem internet.
// Ao publicar mudanças, troque o número da versão do cache para forçar a atualização.
const CACHE = 'pacote-certo-v7';
const ARQUIVOS = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'icon.svg',
  'config.js',
  'js/app.js',
  'js/modelo.js',
  'js/db.js',
  'js/ocr.js',
  'js/fotos.js',
  'js/icones.js',
  'js/demo.js',
  'js/cidade.js',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((chave) => chave !== CACHE).map((chave) => caches.delete(chave))))
      .then(() => self.clients.claim()),
  );
});

// Rede primeiro, para receber atualizações; sem rede, usa a cópia guardada.
self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  evento.respondWith(
    fetch(request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copia));
        return resposta;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((salvo) => salvo || caches.match('index.html'))),
  );
});
