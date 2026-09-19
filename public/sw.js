const V='radar-v146';
const CACHE=['/','/manifest.json']; // capa.jpg (2MB) fora do precache — não atrasa o 1º load; é cacheada sob demanda

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.all(CACHE.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>
  e.waitUntil(caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())));

// permite ao app mandar trocar o SW velho na hora
self.addEventListener('message',e=>{ if(e.data&&e.data.type==='SKIP_WAITING') self.skipWaiting(); });

// documento (página HTML) = ABRE NA HORA com o que já está guardado e busca a versão
// nova POR TRÁS (stale-while-revalidate). Antes era rede-primeiro com espera de até 5s:
// o app ficava em branco esperando a internet mesmo já estando instalado no celular.
// Primeira visita (sem cache) = rede normal.
function documento(req){
  return caches.match(req).then(guardado=>{
    const rede = fetch(req).then(r=>{
      if(r && r.ok){
        const clone=r.clone();
        caches.open(V).then(c=>c.put(req,clone)).catch(()=>{});
        // avisa a tela aberta que chegou versão nova (ela decide se recarrega sozinha)
        if(guardado){
          self.clients.matchAll({type:'window'}).then(ls=>{
            ls.forEach(c=>c.postMessage({type:'VERSAO_NOVA', url:req.url}));
          });
        }
      }
      return r;
    }).catch(()=>guardado);
    return guardado || rede;   // tem no cache? desenha JÁ. Não tem? espera a rede.
  });
}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'){ return; }
  if(req.mode==='navigate' || req.destination==='document'){ e.respondWith(documento(req)); return; }
  // demais recursos (capas/imagens/slides/js/css/json): serve do cache NA HORA e,
  // ao mesmo tempo, GUARDA o que baixa (stale-while-revalidate) -> depois da 1ª vez com
  // internet, funciona OFFLINE. Guarda só o que é do próprio app (mesma origem).
  const url=new URL(req.url);
  const mesmaOrigem = (url.origin===self.location.origin);
  e.respondWith(
    caches.match(req).then(cache=>{
      const rede=fetch(req).then(resp=>{
        if(resp && resp.ok && mesmaOrigem){
          const clone=resp.clone();
          caches.open(V).then(c=>c.put(req,clone)).catch(()=>{});
        }
        return resp;
      }).catch(()=>cache);
      return cache || rede;
    })
  );
});

// ═══ NOTIFICAÇÃO com o app FECHADO (apita/vibra o celular) ═══
self.addEventListener('push',e=>{
  let d={}; try{ d=e.data?e.data.json():{}; }catch(_){ d={title:'RADAR', body:(e.data&&e.data.text())||''}; }
  const titulo=d.title||'RADAR';
  const opc={
    body:d.body||'',
    icon:d.icon||'/icon-192.png',
    badge:'/icon-192.png',
    vibrate:[200,100,200,100,200],
    tag:d.tag||'radar-aviso',
    renotify:true,
    requireInteraction:true,
    data:{url:d.url||'/'}
  };
  e.waitUntil(self.registration.showNotification(titulo,opc));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'/';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(ls=>{
    for(const c of ls){ if('focus' in c){ c.navigate&&c.navigate(url); return c.focus(); } }
    if(clients.openWindow) return clients.openWindow(url);
  }));
});
