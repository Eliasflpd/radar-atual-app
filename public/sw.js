const V='radar-v173';               // cache do SHELL — troca a cada versão do app
const PACOTE='radar-pacote-v1';     // pacote que o irmão baixou de propósito — NUNCA apagado ao subir versão

// ═══ O SHELL: sem isto o app não pinta nada. Vai pro cache JÁ na instalação. ═══
// Por que pré-carregar: o service worker NÃO controla a página durante a visita
// em que ele é instalado. Ou seja: quem entrava e saía do ar na mesma visita
// ficava com o cache VAZIO — o app.js e o CSS nunca tinham passado pelo fetch
// do SW. Era esse o buraco: "instalei o app e mesmo assim não abre sem internet".
// URLs SEM ?v= de propósito: o casamento com o ?v=146 da página é feito no
// serviço (ignoreSearch), então subir a versão não deixa o irmão na mão.
const SHELL=[
  '/',
  '/manifest.json',
  '/assets/app.js',
  '/assets/radar.css',
  '/assets/lupa.js',
  '/_uso.js',
  '/icon-192.png',
  '/img/ceadema.png',
  '/icons/biblia.png','/icons/biblioteca.png','/icons/devocional.png',
  '/icons/ebd.png','/icons/igrejas.png','/icons/maratona.png',
  '/icons/perolas.png','/icons/plano.png','/icons/templo.png'
];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(V)
      .then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{}))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>
  e.waitUntil(caches.keys()
    // apaga só as versões velhas do shell. O PACOTE do irmão fica de pé.
    .then(ks=>Promise.all(ks.filter(k=>k!==V && k!==PACOTE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())));

self.addEventListener('message',e=>{
  const d=e.data||{};
  if(d.type==='SKIP_WAITING') self.skipWaiting();
  // a página pergunta quais caches existem (pra saber se o pacote já foi baixado)
  if(d.type==='RADAR_CACHES' && e.ports && e.ports[0]){
    caches.keys().then(ks=>e.ports[0].postMessage({shell:V,pacote:PACOTE,tem:ks}));
  }
});

// ═══ despensa: procura em TODOS os caches (shell + pacote), com e sem ?v= ═══
// O index.html pede /assets/app.js?v=146. A chave do cache inclui a query, então
// o guardado sem ?v= só é encontrado com ignoreSearch. Sem isto, toda vez que a
// versão subisse o app abria em BRANCO offline.
function daDespensa(req){
  return caches.match(req).then(r=>r||caches.match(req,{ignoreSearch:true}));
}

function avisaVersaoNova(url){
  self.clients.matchAll({type:'window'}).then(ls=>{
    ls.forEach(c=>c.postMessage({type:'VERSAO_NOVA',url:url}));
  });
}

// ═══ NUNCA devolver undefined ═══
// respondWith(undefined) estoura TypeError e o navegador cospe a tela de erro
// dele — sem explicação nenhuma. Era o "botão morto" e a "tela branca".
// Daqui pra frente, offline sempre tem resposta com cara de gente.
function paginaOffline(){
  const html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
    +'<meta name="viewport" content="width=device-width,initial-scale=1">'
    +'<title>RADAR — sem internet</title><style>'
    +'body{margin:0;background:#0a0c10;color:#e8eef5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;'
    +'display:flex;align-items:center;justify-content:center;min-height:100vh;padding:22px;box-sizing:border-box}'
    +'.cx{max-width:420px;text-align:center}h1{font-size:21px;margin:0 0 8px}'
    +'p{color:#9fb0bd;line-height:1.55;font-size:15px;margin:0 0 14px}'
    +'ul{text-align:left;color:#9fb0bd;font-size:14.5px;line-height:1.75;padding-left:20px;margin:0 0 18px}'
    +'b{color:#e8eef5}a{display:inline-block;background:#C9A14A;color:#15202b;text-decoration:none;'
    +'padding:13px 22px;border-radius:12px;font-weight:800;font-size:15px}</style></head><body><div class="cx">'
    +'<div style="font-size:46px;margin-bottom:6px">📡</div>'
    +'<h1>Esta página ainda não está guardada</h1>'
    +'<p>Você está <b>sem internet</b> e esta tela ainda não tinha sido aberta neste aparelho.</p>'
    +'<ul><li><b>Funciona agora:</b> a tela inicial e tudo que você já abriu antes.</li>'
    +'<li><b>Funciona agora:</b> Bíblia, Harpa, mensagens e sermões que você já abriu '
    +'uma vez neste aparelho.</li>'
    +'<li><b>Só com internet:</b> Concílio, geradores de mensagem/sermão, busca por significado, vídeos e quiz.</li></ul>'
    +'<a href="/">Voltar ao Início</a></div></body></html>';
  return new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','X-Radar-Offline':'1'}});
}

function respostaSemRede(req){
  const d=req.destination, p=new URL(req.url).pathname;
  if(d==='image') return new Response('',{status:503,statusText:'offline',headers:{'X-Radar-Offline':'1'}});
  if(d==='style' || /\.css$/.test(p)) return new Response('/* offline */',{status:200,headers:{'Content-Type':'text/css','X-Radar-Offline':'1'}});
  if(/\.json$/.test(p)) return jsonOffline('Este conteúdo ainda não foi guardado no aparelho.');
  return new Response('offline',{status:503,statusText:'offline',headers:{'X-Radar-Offline':'1'}});
}

function jsonOffline(msg){
  return new Response(JSON.stringify({ok:false,offline:true,erro:msg}),
    {status:503,headers:{'Content-Type':'application/json; charset=utf-8','X-Radar-Offline':'1'}});
}

// documento (página HTML / iframe de lição) = ABRE NA HORA com o que já está
// guardado e busca a versão nova POR TRÁS (stale-while-revalidate).
//
// ⚠️ O BUG QUE ISTO CONSERTA (21/09/2026) — leia antes de "simplificar":
// Antes daqui saía `daDespensa(req)`, que procura em TODOS os caches, inclusive
// no `radar-pacote-v1`. E o pacote, de propósito, NUNCA é apagado quando a
// versão sobe (são os MB que o irmão baixou com o plano de dados dele).
// Resultado: o pacote guardava uma FOTOGRAFIA da home do dia do download, e era
// ela que aparecia — para sempre. Publicávamos versão nova, o celular baixava
// tudo certinho... e continuava desenhando a home velha. Foi exatamente a queixa
// do Elias ("já atualizei e continua a mesma coisa"): três recargas no A22 e a
// tela sem mudar, com o app novo já no ar e servido pela Vercel.
//
// A REGRA CERTA: para PÁGINA, ler só do cache do SHELL (V) — que é trocado a
// cada versão. O pacote continua valendo, mas só quando a rede cai de verdade.
// Assim a velocidade fica igual e a versão nova chega.
function documento(req){
  return caches.open(V).then(c=>c.match(req,{ignoreSearch:true})).then(guardado=>{
    const rede=fetch(req).then(r=>{
      if(r&&r.ok){
        const clone=r.clone();
        caches.open(V).then(c=>c.put(req,clone)).catch(()=>{});
        if(guardado) avisaVersaoNova(req.url);
      }
      return r;
    }).catch(()=>
      // sem rede: agora sim vale tudo que houver guardado, inclusive o pacote
      guardado||daDespensa(req).then(p=>p||paginaOffline()).catch(()=>paginaOffline())
    );
    return guardado||rede;   // tem guardado do shell? desenha JÁ. Não tem? espera a rede.
  });
}

// Estes NUNCA podem sair do cache: são login, cobrança e a trava dos 30 dias.
// Servir um "expirado" velho offline seria bloquear irmão que já pagou.
// `voz` entra aqui porque devolve TOKEN EFÊMERO da conversa ao vivo: um token de
// ontem servido do cache não conecta em nada e deixa o pastor com a tela morta
// no meio da estrada. Token é sempre da rede ou não é.
const API_NUNCA_GUARDA=/^\/api\/(acesso|verify-otp|send-otp|assinar|cadastros|pix|asaas|voz)/;

function api(req,url){
  const guardavel=!API_NUNCA_GUARDA.test(url.pathname);
  return fetch(req).then(r=>{
    if(r && r.ok && guardavel){
      const clone=r.clone();
      caches.open(V).then(c=>c.put(req,clone)).catch(()=>{});
    }
    return r;
  }).catch(()=>{
    if(!guardavel) return jsonOffline('Sem internet: esta parte precisa do servidor.');
    return caches.match(req).then(guardado=>
      guardado||jsonOffline('Sem internet: esta parte precisa do servidor.'));
  });
}

function recurso(req,guardavel){
  return daDespensa(req).then(guardado=>{
    const rede=fetch(req).then(resp=>{
      // opaque (status 0) é o caso das fontes do Google: dá pra guardar e
      // deixar o app com a cara certa offline.
      if(resp && guardavel && (resp.ok || resp.type==='opaque')){
        const clone=resp.clone();
        caches.open(V).then(c=>c.put(req,clone)).catch(()=>{});
      }
      return resp;
    }).catch(()=>guardado||respostaSemRede(req));
    return guardado||rede;
  });
}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;

  const url=new URL(req.url);
  const mesmaOrigem=(url.origin===self.location.origin);

  // /api/ = servidor. REDE PRIMEIRO (nunca serve resposta de ontem quando há
  // sinal) e, se a rede cair, a última resposta boa que estiver guardada.
  // Se não houver nem isso, JSON dizendo que está offline — quem chama faz
  // r.json() e lê {ok:false, offline:true}. Nada de erro mudo.
  if(mesmaOrigem && url.pathname.indexOf('/api/')===0){
    e.respondWith(api(req,url)); return;
  }

  if(req.mode==='navigate' || req.destination==='document' || req.destination==='iframe'){
    e.respondWith(documento(req)); return;
  }

  const fonteGoogle=/(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  e.respondWith(recurso(req, mesmaOrigem||fonteGoogle));
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
