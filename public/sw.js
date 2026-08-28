const V='radar-v120';
const CACHE=['/','/manifest.json','/capa.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.all(CACHE.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>
  e.waitUntil(caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())));

// permite ao app mandar trocar o SW velho na hora
self.addEventListener('message',e=>{ if(e.data&&e.data.type==='SKIP_WAITING') self.skipWaiting(); });

// documento (página HTML) = SEMPRE tenta a rede primeiro; cache só se a rede falhar (offline)
function documento(req){
  return new Promise(resolve=>{
    let resolvido=false;
    const cair=()=>caches.match(req).then(r=>{ if(!resolvido){ resolvido=true; resolve(r||fetch(req)); } });
    const t=setTimeout(cair, 5000); // internet ruim: até 5s esperando o fresco, senão mostra o que tem
    fetch(req).then(r=>{
      resolvido=true; clearTimeout(t);
      const clone=r.clone(); caches.open(V).then(c=>c.put(req,clone));
      resolve(r);
    }).catch(()=>{ clearTimeout(t); cair(); });
  });
}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'){ return; }
  if(req.mode==='navigate' || req.destination==='document'){ e.respondWith(documento(req)); return; }
  // demais recursos: cache primeiro (rápido), com busca na rede se faltar
  e.respondWith(caches.match(req).then(r=>r||fetch(req)));
});
