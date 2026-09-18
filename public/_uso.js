/* ============================================================================
   RADAR — MARCADOR DE USO  (public/_uso.js)
   ----------------------------------------------------------------------------
   O que faz sozinho, em qualquer página onde for incluído:
     1) descobre QUEM está lendo  -> lê o whatsapp do localStorage 'radar_user'
     2) descobre a TELA e o RÓTULO -> pela URL e pelo <h1>/.std-titulo/<title>
     3) conta o TEMPO REAL na tela -> pausa quando a aba perde o foco, soma ao voltar
     4) manda no fechamento       -> navigator.sendBeacon (não segura a página)
     5) descarta visita < 3s      -> bateu e saiu não é uso
     6) offline                   -> guarda em fila no localStorage e manda depois
     7) expõe RadarUso.marcarGostei(true/false) + um selo 👍 discreto

   ⚠️ NUNCA escreve nem apaga a chave 'radar_user'. Só LÊ. É sagrada.
   ⚠️ Falha SEMPRE em silêncio: nada aqui pode travar ou atrasar o app.

   Contrato do servidor:  POST /api/dados?fn=uso
     { user, tela, rotulo, segundos, gostei }     ou   { lote:[ ...mesmos... ] }
   ============================================================================ */
(function () {
  'use strict';
  if (window.RadarUso) return;                 // já carregado, não duplica

  var ENDPOINT = '/api/dados?fn=uso';
  var FILA_KEY = 'radar_uso_fila';             // fila offline (chave PRÓPRIA)
  var MIN_SEG  = 3;                            // menos que isso não é uso
  var MAX_SEG  = 7200;                         // teto do contrato (2h)
  var MAX_FILA = 120;                          // não deixa a fila crescer sem fim
  var MAX_TXT  = 200;

  /* ---------------- utilidades à prova de erro ---------------- */
  function limpo(t) {
    return String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, MAX_TXT);
  }
  function seguro(fn) { try { return fn(); } catch (e) { return undefined; } }

  /* ---------------- 1) QUEM É A PESSOA (só leitura!) ---------------- */
  function quemSou() {
    return seguro(function () {
      var raw = localStorage.getItem('radar_user');       // <- SÓ getItem. Jamais setItem.
      if (!raw) return '';
      var u = JSON.parse(raw);
      if (!u || typeof u !== 'object') return '';
      return String(u.whatsapp || '').replace(/\D/g, '').slice(0, 60);  // mesmo padrão do leitura_progresso
    }) || '';
  }

  /* ---------------- 2) QUAL TELA / QUAL RÓTULO ---------------- */
  var TELAS_OK = ['home','biblia','harpa','mensagem','estudo','curso','concilio',
                  'ebd','quiz','historinhas','manuais','outro'];

  var POR_CAMINHO = [
    [/^\/biblioteca\/mensagens\//,       'mensagem'],
    [/^\/biblioteca\/sermoes\//,         'mensagem'],
    [/^\/biblioteca\/estudo\//,          'estudo'],
    [/^\/biblioteca\/preparador\//,      'estudo'],
    [/^\/biblioteca\/livros\//,          'estudo'],
    [/^\/biblioteca\/concilio\//,        'concilio'],
    [/^\/biblioteca\/curso-teologia\//,  'curso'],
    [/^\/biblioteca\/escola-pregacao\//, 'curso'],
    [/^\/biblioteca\/biblias\//,         'biblia'],
    [/^\/ebd\//,                         'ebd']
  ];

  // telas internas do app-de-uma-página (index.html)
  var POR_SPA = {
    'home':              'home',
    'tela-biblia':       'biblia',
    'tela-plano':        'biblia',
    'tela-devocional':   'biblia',
    'tela-harpa-lista':  'harpa',
    'tela-harpa-hino':   'harpa',
    'tela-louvor':       'harpa',
    'tela-perolas':      'estudo',
    'tela-desafiomateus':'quiz',
    'tela-tetelestai':   'quiz',
    'tela-historinhas':  'historinhas',
    'tela-manuais':      'manuais',
    'tela-manual-leitor':'manuais'
  };
  // telas de bastidor: não são "uso de conteúdo", não registram
  var SPA_IGNORAR = /^(tela-adm|tela-admin|tela-painel-adm|tela-cadastro|tela-otp|tela-enviar)/;

  function telaPeloCaminho() {
    var p = (location.pathname || '/').toLowerCase();
    for (var i = 0; i < POR_CAMINHO.length; i++) {
      if (POR_CAMINHO[i][0].test(p)) return POR_CAMINHO[i][1];
    }
    if (p === '/' || /\/index\.html?$/.test(p) && p.split('/').length <= 2) return 'home';
    return 'outro';
  }

  function telaSpaAtiva() {                     // só existe no index.html
    return seguro(function () {
      var el = document.querySelector('.tela.ativa');
      if (!el) return null;
      return el;
    }) || null;
  }

  function categoriaDoElemento(el) {
    var id = (el && el.id) || '';
    if (!id) return null;
    if (SPA_IGNORAR.test(id)) return null;                  // ignorada de propósito
    if (POR_SPA[id]) return POR_SPA[id];
    if (id.indexOf('tela-ebd') === 0) return 'ebd';
    return 'outro';
  }

  function rotuloDe(el) {
    var t = seguro(function () {
      var raiz = el || document;
      var n = raiz.querySelector('.std-titulo, h1, h2');
      if (n && limpo(n.textContent)) return limpo(n.textContent);
      return '';
    }) || '';
    if (t) return t;
    return limpo((document.title || '').replace(/\s*[—–-]\s*RADAR.*$/i, ''));
  }

  /* ---------------- fila offline ---------------- */
  function lerFila() {
    var f = seguro(function () { return JSON.parse(localStorage.getItem(FILA_KEY) || '[]'); });
    return Array.isArray(f) ? f : [];
  }
  function gravarFila(f) {
    seguro(function () {
      localStorage.setItem(FILA_KEY, JSON.stringify(f.slice(-MAX_FILA)));   // NUNCA toca em radar_user
    });
  }
  function guardar(reg) {
    var f = lerFila(); f.push(reg); gravarFila(f);
  }

  /* ---------------- envio ---------------- */
  function normaliza(reg) {
    var tela = limpo(reg.tela).toLowerCase();
    if (TELAS_OK.indexOf(tela) < 0) tela = 'outro';
    var s = parseInt(reg.segundos, 10); if (!(s > 0)) s = 0;
    if (s > MAX_SEG) s = MAX_SEG;
    var o = { user: limpo(reg.user), tela: tela, rotulo: limpo(reg.rotulo), segundos: s };
    if (reg.gostei === true || reg.gostei === false) o.gostei = reg.gostei;
    return o;
  }

  function enviar(reg, noFechamento) {
    try {
      var r = normaliza(reg);
      if (!r.tela) return false;
      var corpo = JSON.stringify(r);

      if (navigator.onLine === false) { guardar(r); return false; }   // offline: guarda pra depois

      if (noFechamento && navigator.sendBeacon) {
        var ok = seguro(function () {
          return navigator.sendBeacon(ENDPOINT, new Blob([corpo], { type: 'application/json;charset=UTF-8' }));
        });
        if (ok) return true;
        guardar(r);                                   // beacon recusou -> tenta na próxima abertura
        return false;
      }

      if (window.fetch) {
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: corpo,
          keepalive: true
        }).then(function (resp) {
          if (!resp || !resp.ok) guardar(r);
        })['catch'](function () { guardar(r); });
        return true;
      }
      guardar(r);
      return false;
    } catch (e) { seguro(function () { guardar(reg); }); return false; }
  }

  function esvaziarFila() {
    try {
      if (navigator.onLine === false || !window.fetch) return;
      var f = lerFila();
      if (!f.length) return;
      var lote = f.slice(0, MAX_FILA);
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lote: lote })
      }).then(function (resp) {
        if (resp && resp.ok) gravarFila(lerFila().slice(lote.length));   // tira só o que foi
      })['catch'](function () { });
    } catch (e) { }
  }

  /* ---------------- 3) CRONÔMETRO DA TELA ---------------- */
  var seg = null;        // segmento atual { tela, el, ms, desde }

  function agora() { return Date.now(); }

  function abrirSegmento() {
    var el = telaSpaAtiva();
    var tela;
    if (el) {
      tela = categoriaDoElemento(el);
      if (!tela) { seg = null; return; }               // tela de bastidor: não mede
    } else {
      // página normal (não-SPA); se a página TEM .tela mas nenhuma ativa ainda, espera
      if (document.querySelector('.tela')) { seg = null; return; }
      tela = telaPeloCaminho();
    }
    seg = { tela: tela, el: el, ms: 0, desde: document.hidden ? 0 : agora() };
  }

  function pausar() {
    if (seg && seg.desde) { seg.ms += (agora() - seg.desde); seg.desde = 0; }
  }
  function retomar() {
    if (seg && !seg.desde) seg.desde = agora();
  }
  function segundosAcumulados() {
    if (!seg) return 0;
    var ms = seg.ms + (seg.desde ? (agora() - seg.desde) : 0);
    return Math.floor(ms / 1000);
  }
  function zerar() { if (seg) { seg.ms = 0; seg.desde = document.hidden ? 0 : agora(); } }

  function fechar(noFechamento) {
    if (!seg) return;
    pausar();
    var s = Math.floor(seg.ms / 1000);
    if (s >= MIN_SEG) {                                 // 5) menos de 3s = bateu e saiu
      enviar({ user: quemSou(), tela: seg.tela, rotulo: rotuloDe(seg.el), segundos: s }, noFechamento);
    }
    seg.ms = 0; seg.desde = 0;
  }

  /* trocou de tela dentro do index.html? fecha a anterior e começa outra */
  function vigiarSpa() {
    if (!document.querySelector('.tela')) return;       // não é o app-de-uma-página
    var alvo = document.body;
    if (!window.MutationObserver || !alvo) return;
    var ultimo = seg && seg.el ? seg.el.id : '';
    var mo = new MutationObserver(function () {
      var el = telaSpaAtiva();
      var id = el ? el.id : '';
      if (id === ultimo) return;
      ultimo = id;
      fechar(false);
      abrirSegmento();
      atualizarSelo();
    });
    seguro(function () {
      mo.observe(alvo, { subtree: true, attributes: true, attributeFilter: ['class'] });
    });
  }

  /* ---------------- 7) GOSTEI ---------------- */
  var gosteiAtual = null;          // o que a pessoa marcou nesta tela

  function marcarGostei(valor) {
    try {
      var v = (valor === false) ? false : true;
      if (!seg) abrirSegmento();
      var s = segundosAcumulados();
      enviar({
        user: quemSou(),
        tela: seg ? seg.tela : telaPeloCaminho(),
        rotulo: rotuloDe(seg ? seg.el : null),
        segundos: s,
        gostei: v
      }, false);
      zerar();                      // tempo já contabilizado nessa linha; não conta 2x
      gosteiAtual = v;
      atualizarSelo();
      return true;
    } catch (e) { return false; }
  }

  /* selo discreto 👍 — cores do app, ZERO roxo */
  var NAVY = '#0f3d5c', TEAL = '#0f6d78', OURO = '#a9791c', VINHO = '#8a1c1c';
  var seloEl = null;

  function selo(opc) {
    try {
      opc = opc || {};
      if (seloEl && seloEl.parentNode) return seloEl;
      var b = document.createElement('button');
      b.id = 'radar-uso-selo';
      b.type = 'button';
      b.setAttribute('aria-label', 'Marcar que gostei');
      b.innerHTML = '<span style="font-size:15px;line-height:1">👍</span><span id="radar-uso-selo-txt">Gostei</span>';
      b.style.cssText = [
        'position:fixed',
        'right:' + (opc.right || '14px'),
        'bottom:calc(' + (opc.bottom || '16px') + ' + env(safe-area-inset-bottom,0px))',
        'z-index:99990',
        'display:inline-flex', 'align-items:center', 'gap:6px',
        'padding:8px 13px', 'border-radius:999px',
        'border:1px solid ' + OURO + '55',
        'background:' + NAVY, 'color:#fff',
        'font:600 12.5px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
        'box-shadow:0 4px 14px rgba(0,0,0,.28)',
        'cursor:pointer', 'opacity:.88', '-webkit-tap-highlight-color:transparent'
      ].join(';');
      b.addEventListener('click', function () {
        marcarGostei(gosteiAtual === true ? false : true);
      });
      (document.body || document.documentElement).appendChild(b);
      seloEl = b;
      atualizarSelo();
      return b;
    } catch (e) { return null; }
  }

  function atualizarSelo() {
    if (!seloEl) return;
    seguro(function () {
      var txt = seloEl.querySelector('#radar-uso-selo-txt');
      if (gosteiAtual === true) {
        seloEl.style.background = TEAL;
        seloEl.style.borderColor = OURO;
        seloEl.style.opacity = '1';
        if (txt) txt.textContent = 'Gostei!';
      } else {
        seloEl.style.background = NAVY;
        seloEl.style.borderColor = OURO + '55';
        seloEl.style.opacity = '.88';
        if (txt) txt.textContent = 'Gostei';
      }
    });
  }

  /* ---------------- registro manual (a página pode chamar) ---------------- */
  function registrar(tela, rotulo, segundos, gostei) {
    return enviar({ user: quemSou(), tela: tela, rotulo: rotulo, segundos: segundos, gostei: gostei }, false);
  }

  /* ---------------- ligação dos eventos ---------------- */
  function ligar() {
    abrirSegmento();
    vigiarSpa();

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { fechar(true); }          // celular às vezes nem dá pagehide
      else { retomar(); esvaziarFila(); }
    }, false);

    window.addEventListener('pagehide', function () { fechar(true); }, false);
    window.addEventListener('beforeunload', function () { fechar(true); }, false);
    window.addEventListener('online', function () { esvaziarFila(); }, false);

    setTimeout(esvaziarFila, 2500);                   // 6) manda o que ficou de quando estava offline

    // selo automático nas páginas de conteúdo (no app-de-uma-página, a página chama RadarUso.selo())
    var auto = true;
    var sc = document.currentScript || document.querySelector('script[src*="_uso.js"]');
    if (sc && sc.getAttribute('data-selo') === '0') auto = false;
    if (document.querySelector('.tela')) auto = false;          // index.html: só sob demanda
    if (auto) setTimeout(function () { selo(); }, 900);
  }

  window.RadarUso = {
    versao: 1,
    marcarGostei: marcarGostei,
    selo: selo,
    registrar: registrar,
    quemSou: quemSou,
    segundos: segundosAcumulados,
    contexto: function () {
      var el = seg ? seg.el : telaSpaAtiva();
      return { tela: seg ? seg.tela : telaPeloCaminho(), rotulo: rotuloDe(el), user: quemSou() };
    }
  };
  window.marcarGostei = window.marcarGostei || marcarGostei;   // atalho pedido no contrato

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { seguro(ligar); }, false);
  } else {
    seguro(ligar);
  }
})();
