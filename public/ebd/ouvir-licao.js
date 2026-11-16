/* OUVIR A LIÇÃO (16/11/2026) — a lição da semana como programa de rádio (Paulo e Ana conversam, ~9 min).
 * Lê turma e número pelo endereço (/ebd/<turma>/html/licao-NN.html) e só aparece se existir
 * /ebd/<turma>/audio/licao-NN.mp3. Lembra onde a pessoa parou (no aparelho) e mostra os controles
 * na tela de bloqueio do celular (Media Session), para ouvir no ônibus ou no carro. Sem dependências. */
(function () {
  var m = /\/ebd\/([a-z]+\d)\/html\/licao-(\d+)\.html/.exec(location.pathname);
  if (!m) return;
  var TURMA = m[1], N = parseInt(m[2], 10), NN = (N < 10 ? '0' : '') + N;
  var SRC = '/ebd/' + TURMA + '/audio/licao-' + NN + '.mp3?v=1';
  var CHAVE = 'ouvir.' + TURMA + '.' + NN;

  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); var mi = Math.floor(s / 60), se = s % 60; return mi + ':' + (se < 10 ? '0' : '') + se; }
  function guarda(v) { try { localStorage.setItem(CHAVE, String(v)); } catch (_) { } }
  function lido() { try { return parseFloat(localStorage.getItem(CHAVE)) || 0; } catch (_) { return 0; } }

  fetch(SRC, { method: 'HEAD' }).then(function (r) { if (r.ok) monta(); }).catch(function () { });

  function monta() {
    var css = document.createElement('style');
    css.textContent =
      '#ol-box{box-sizing:border-box;max-width:720px;margin:14px auto 18px;padding:14px 14px 12px;border-radius:16px;background:linear-gradient(135deg,#0f3d7a,#1458ad);color:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 6px 18px rgba(20,88,173,.28)}' +
      '#ol-box .ol-top{display:flex;align-items:center;gap:14px}' +
      '#ol-box .ol-play{flex:0 0 58px;width:58px;height:58px;border-radius:50%;border:0;background:#fff;color:#0f3d7a;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.25)}' +
      '#ol-box .ol-play svg{width:26px;height:26px}' +
      '#ol-box .ol-tit{font-weight:800;font-size:18px;line-height:1.15}' +
      '#ol-box .ol-sub{font-size:14px;opacity:.85;margin-top:3px}' +
      '#ol-box .ol-ondas{display:flex;gap:3px;align-items:flex-end;height:18px;margin-left:auto;flex:0 0 auto}' +
      '#ol-box .ol-ondas i{display:block;width:4px;height:5px;border-radius:2px;background:#ffd76a}' +
      '#ol-box.tocando .ol-ondas i{animation:olonda 1s ease-in-out infinite}' +
      '#ol-box .ol-ondas i:nth-child(2){animation-delay:.15s}#ol-box .ol-ondas i:nth-child(3){animation-delay:.3s}#ol-box .ol-ondas i:nth-child(4){animation-delay:.45s}' +
      '@keyframes olonda{0%,100%{height:5px}50%{height:18px}}' +
      '#ol-box .ol-barra{position:relative;height:28px;margin:10px 0 0;cursor:pointer;touch-action:none}' +
      '#ol-box .ol-trilho{position:absolute;left:0;right:0;top:12px;height:5px;border-radius:3px;background:rgba(255,255,255,.3)}' +
      '#ol-box .ol-feito{position:absolute;left:0;top:12px;height:5px;border-radius:3px;background:#ffd76a;width:0}' +
      '#ol-box .ol-pino{position:absolute;top:6px;width:17px;height:17px;margin-left:-8px;border-radius:50%;background:#fff;left:0;box-shadow:0 1px 4px rgba(0,0,0,.35)}' +
      '#ol-box .ol-baixo{display:flex;align-items:center;gap:8px;font-size:14px}' +
      '#ol-box .ol-baixo .ol-t{font-variant-numeric:tabular-nums;opacity:.9}' +
      '#ol-box .ol-baixo .esp{flex:1}' +
      '#ol-box .ol-bt{height:34px;min-width:44px;padding:0 10px;border-radius:17px;border:1.5px solid rgba(255,255,255,.55);background:transparent;color:#fff;font-weight:700;font-size:14px;cursor:pointer}' +
      '@media (prefers-reduced-motion:reduce){#ol-box.tocando .ol-ondas i{animation:none;height:12px}}';
    document.head.appendChild(css);

    var PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
    var PAUSA = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4.2" height="14" rx="1.2"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"/></svg>';

    var box = document.createElement('div'); box.id = 'ol-box';
    box.innerHTML = '<div class="ol-top"><button class="ol-play" aria-label="Ouvir a lição">' + PLAY + '</button>' +
      '<div><div class="ol-tit">Ouvir a lição</div><div class="ol-sub">Paulo e Ana conversam sobre a lição</div></div>' +
      '<div class="ol-ondas" aria-hidden="true"><i></i><i></i><i></i><i></i></div></div>' +
      '<div class="ol-barra" role="slider" aria-label="Posição do áudio" tabindex="0"><div class="ol-trilho"></div><div class="ol-feito"></div><div class="ol-pino"></div></div>' +
      '<div class="ol-baixo"><span class="ol-t">0:00</span><span class="esp"></span>' +
      '<button class="ol-bt ol-volta" aria-label="Voltar 15 segundos">−15s</button>' +
      '<button class="ol-bt ol-vel" aria-label="Velocidade">1x</button>' +
      '<span class="ol-t ol-dur"></span></div>';

    var data = document.querySelector('p.data'), titulo = document.querySelector('p.titulo');
    var ponto = data || titulo;
    if (ponto && ponto.parentNode) ponto.parentNode.insertBefore(box, ponto.nextSibling); else document.body.insertBefore(box, document.body.firstChild);

    var a = new Audio(); a.preload = 'none'; a.src = SRC;
    var bt = box.querySelector('.ol-play'), feito = box.querySelector('.ol-feito'), pino = box.querySelector('.ol-pino');
    var tAtual = box.querySelector('.ol-t'), tDur = box.querySelector('.ol-dur'), barra = box.querySelector('.ol-barra');
    var vels = [1, 1.25, 1.5, 0.85], iv = 0, inicio = lido();

    function pinta() {
      var d = a.duration || 0, p = d ? Math.min(1, a.currentTime / d) : 0;
      feito.style.width = (p * 100) + '%'; pino.style.left = (p * 100) + '%';
      tAtual.textContent = fmt(a.currentTime); if (d) tDur.textContent = fmt(d);
    }
    bt.onclick = function () {
      if (a.paused) {
        if (inicio && !a.currentTime) { a.addEventListener('loadedmetadata', function f() { a.removeEventListener('loadedmetadata', f); if (inicio < a.duration - 5) a.currentTime = inicio; }); }
        a.play().catch(function () { });
      } else a.pause();
    };
    a.onplay = function () { bt.innerHTML = PAUSA; box.classList.add('tocando'); };
    a.onpause = function () { bt.innerHTML = PLAY; box.classList.remove('tocando'); guarda(a.currentTime); };
    a.onended = function () { guarda(0); };
    var ultimo = 0;
    a.ontimeupdate = function () { pinta(); if (Math.abs(a.currentTime - ultimo) > 5) { ultimo = a.currentTime; guarda(a.currentTime); } };
    a.onloadedmetadata = pinta;
    box.querySelector('.ol-volta').onclick = function () { a.currentTime = Math.max(0, a.currentTime - 15); };
    box.querySelector('.ol-vel').onclick = function () { iv = (iv + 1) % vels.length; a.playbackRate = vels[iv]; this.textContent = String(vels[iv]).replace('.', ',') + 'x'; };
    function vaiPara(ev) {
      var r = barra.getBoundingClientRect(), x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
      if (!a.duration) { bt.onclick(); return; }
      a.currentTime = Math.max(0, Math.min(1, x / r.width)) * a.duration; pinta();
    }
    barra.addEventListener('pointerdown', vaiPara);
    barra.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') a.currentTime += 10; if (e.key === 'ArrowLeft') a.currentTime -= 10; });
    if (inicio > 5) tAtual.textContent = 'parou em ' + fmt(inicio);

    if ('mediaSession' in navigator) {
      var tit = (titulo && titulo.textContent || 'Lição ' + N).replace(/\s+/g, ' ').trim();
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: tit, artist: 'RADAR · Escola Dominical', album: 'Ouvir a lição',
          artwork: [{ src: '/ebd/' + TURMA + '/img/abertura-' + NN + '.jpg?v=1', sizes: '512x512', type: 'image/jpeg' }] });
        navigator.mediaSession.setActionHandler('play', function () { a.play(); });
        navigator.mediaSession.setActionHandler('pause', function () { a.pause(); });
        navigator.mediaSession.setActionHandler('seekbackward', function () { a.currentTime = Math.max(0, a.currentTime - 15); });
        navigator.mediaSession.setActionHandler('seekforward', function () { a.currentTime += 15; });
      } catch (_) { }
    }
  }
})();
