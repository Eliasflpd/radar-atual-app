/* ═══════════════════════════════════════════════════════════════════════════
   MÚSICAS do RADAR (27/10/2026) — o "Spotify/Deezer" do RADAR, igual ao do
   WorshipOS, adaptado ao celular.
   • Busca de QUALQUER cantor (Deezer, via /api/disco — o Deezer não manda CORS).
   • Toca a música inteira no player OFICIAL do YouTube (IFrame), sempre visível
     (mini no canto; grande no "Tocando agora"). A faixa certa é escolhida no
     servidor pela duração mais perto da original. Sem download (é web).
   • Biblioteca da pessoa (curtidas, playlists, pastas, cantores seguidos,
     tocadas recentemente) no celular (localStorage) + nuvem (/api/dados?fn=musicas,
     com o crachá do aparelho, igual ao caderno de pregações).
   • Dois visuais: Spotify (escuro/verde) e Deezer (claro/roxo).
   • Botão voltar do Android: cada página/janela daqui ganha uma entrada no
     histórico com {musNav:1}; o aoVoltar() do app ignora essas (não são radarNav)
     e este arquivo trata. Janelas daqui NÃO usam a classe .open (senão o
     fecharJanelaAberta() do app pegaria antes).
   Tudo falha em silêncio: sem internet a tela abre com o que já está no celular.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var API = '/api/disco';
  var LS_BIB = 'radar_mus_biblio', LS_TEMA = 'radar_mus_tema', LS_REC = 'radar_mus_recentes', LS_VOL = 'radar_mus_vol', LS_SUAVE = 'radar_mus_suave';
  var GOSPEL = 186; // "Música Religiosa" no Deezer

  var ESTILOS = [
    { id: 'adoracao', nome: 'Louvor e Adoração', c: ['Gabriela Rocha', 'Fernandinho', 'Isaías Saad', 'Fernanda Brum', 'Aline Barros', 'Anderson Freire', 'Preto no Branco', 'Julliany Souza', 'Casa Worship', 'Isadora Pompeo', 'Davi Sacer', 'Ministério Zoe', 'Nívea Soares', 'Morada', 'Eli Soares', 'Thalles Roberto', 'Diante do Trono'] },
    { id: 'pentecostal', nome: 'Pentecostal', c: ['Mattos Nascimento', 'Cassiane', 'Elaine de Jesus', 'Damares', 'Shirley Carvalhaes', 'Rose Nascimento', 'Lauriete', 'Sarah Farias', 'Kailane Frauches', 'Cristina Mel', 'Marcos Antônio', 'Voz da Verdade', 'Bruna Karla', 'Jozyanne', 'Banda Som e Louvor'] },
    { id: 'antigas', nome: 'Antigas e Hinos', c: ['Canarinhos de Cristo', 'Feliciano Amaral', 'Luiz de Carvalho', 'Ozéias de Paula', 'Mara Lima', 'Grupo Logos', 'Rebanhão', 'Novo Som', 'Elizeu Gomes'] },
    { id: 'infantil', nome: 'Infantil', c: ['3 Palavrinhas', 'Crianças Diante do Trono', 'Aline Barros', 'Cristina Mel', 'Turminha do Tio Cris'] }
  ];

  // ───────────────────────── utilidades ─────────────────────────
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function seguro(f, d) { try { return f(); } catch (e) { return d; } }
  function norm(s) { return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function mesmo(a, b) { return norm(a) === norm(b); }
  function tempo(s) { s = Math.max(0, Math.floor(s || 0)); var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); }
  function total(s) { return s >= 3600 ? Math.floor(s / 3600) + ' h ' + Math.round((s % 3600) / 60) + ' min' : Math.max(1, Math.round(s / 60)) + ' min'; }
  function qtd(n, um, varios) { n = n || 0; return n + ' ' + (n === 1 ? (um || 'música') : (varios || 'músicas')); }
  function fas(n) { return n ? Number(n).toLocaleString('pt-BR') + (n === 1 ? ' fã' : ' fãs') : ''; }
  function ano(d) { return d ? String(d).slice(0, 4) : ''; }
  function tipoDisco(t) { return t === 'single' ? 'Single' : t === 'ep' ? 'EP' : t === 'compile' ? 'Coletânea' : 'Álbum'; }
  function saudacao() { var h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
  function novoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ícones (traço)
  var IC = {
    casa: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
    lupa: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
    livros: 'M4 19V5M9 19V5M14 19l-3-14M19 19 16 5',
    play: 'M7 4v16l13-8z', pausa: 'M7 4h4v16H7zM14 4h4v16h-4z',
    prox: 'M5 4v16l11-8zM18 4v16', ant: 'M19 4v16L8 12zM6 4v16',
    aleat: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
    rep: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
    cor: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
    mais: 'M12 5v14M5 12h14', pontos: 'M5 12h.01M12 12h.01M19 12h.01',
    esq: 'M15 18l-6-6 6-6', dir: 'M9 18l6-6-6-6', baixo: 'M6 9l6 6 6-6',
    fila: 'M3 6h13M3 12h13M3 18h9M17 15l4 3-4 3z', letra: 'M4 6h16M4 12h10M4 18h7',
    pasta: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    lixo: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14', editar: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
    radio: 'M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM8 7l8-4M8 12h4M8 16h4',
    ok: 'M20 6 9 17l-5-5', x: 'M18 6 6 18M6 6l12 12', relogio: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
    sol: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    lua: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z', estrela: 'M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.8 5.8 21.1l1.4-7L2 9.3l7-.8z',
    nota: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    sair: 'M10 17l-5-5 5-5M5 12h12', onda: 'M2 12h2l2-6 3 12 3-9 2 6 2-3h6', parar: 'M6 6h12v12H6z'
  };
  function ic(n, t, cheio) { return '<svg width="' + (t || 18) + '" height="' + (t || 18) + '" viewBox="0 0 24 24" fill="' + (cheio ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + IC[n] + '"/></svg>'; }
  function capa(src, cls, redondo, icone) {
    return '<div class="' + cls + (redondo ? ' redondo' : '') + '">' + (src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : ic(icone || 'nota', 22)) + '</div>';
  }

  // ───────────────────────── registro dos itens da tela ─────────────────────────
  // cada clique leva um id curto (data-r) que aponta pro objeto (faixa, lista…)
  var REG = {}, regN = 0;
  function reg(o) { var k = 'r' + (++regN); REG[k] = o; return k; }

  // ───────────────────────── biblioteca (celular + nuvem) ─────────────────────────
  var bib = { curtidas: [], playlists: [], pastas: [], historico: [], seguidos: [], _t: 0 };
  function lerBib() {
    var d = seguro(function () { return JSON.parse(localStorage.getItem(LS_BIB) || 'null'); }, null);
    if (d && typeof d === 'object') aplicarBib(d);
  }
  function aplicarBib(d) {
    ['curtidas', 'playlists', 'pastas', 'historico', 'seguidos'].forEach(function (k) { bib[k] = Array.isArray(d[k]) ? d[k] : []; });
    bib._t = Number(d._t) || 0;
  }
  function usuario() { return seguro(function () { var u = JSON.parse(localStorage.getItem('radar_user') || 'null'); return u && u.whatsapp ? String(u.whatsapp).replace(/\D/g, '').slice(0, 60) : ''; }, ''); }
  function cabecalhos() {
    var h = { 'Content-Type': 'application/json' };
    var k = seguro(function () { return typeof window.radarChave === 'function' ? window.radarChave() : localStorage.getItem('radar_chave'); }, '');
    if (k) h['x-radar-chave'] = k;
    return h;
  }
  function selo(d) {
    if (!d) return;
    if (d.chave_nova) seguro(function () { if (typeof window.radarGuardarChave === 'function') window.radarGuardarChave(d.chave_nova); else localStorage.setItem('radar_chave', String(d.chave_nova)); });
    if (d.renove) seguro(function () { if (typeof window.radarRenovarChave === 'function') window.radarRenovarChave(); });
  }
  var timerNuvem = 0;
  function salvarBib() {
    bib._t = Date.now();
    seguro(function () { localStorage.setItem(LS_BIB, JSON.stringify(bib)); });
    clearTimeout(timerNuvem);
    timerNuvem = setTimeout(function () {
      var u = usuario(); if (!u) return;
      fetch('/api/dados?fn=musicas', { method: 'POST', headers: cabecalhos(), body: JSON.stringify({ user: u, dados: bib }) })
        .then(function (r) { return r.json(); }).then(selo).catch(function () {});
    }, 1200);
  }
  var nuvemLida = false;
  function lerNuvem() {
    if (nuvemLida) return; nuvemLida = true;
    var u = usuario(); if (!u) return;
    fetch('/api/dados?fn=musicas&user=' + encodeURIComponent(u), { cache: 'no-store', headers: cabecalhos() })
      .then(function (r) { return r.json(); }).then(function (d) {
        selo(d);
        if (d && d.dados && Number(d.dados._t || 0) > bib._t) { aplicarBib(d.dados); seguro(function () { localStorage.setItem(LS_BIB, JSON.stringify(bib)); }); render(); }
        else if (bib._t && (!d || !d.dados)) salvarBib(); // primeira vez: sobe o que o celular já tem
      }).catch(function () {});
  }
  function curtido(k) { return bib.curtidas.some(function (x) { return x.k === k; }); }
  function limpa(f) { return { k: f.k, titulo: f.titulo, artista: f.artista, artistaId: f.artistaId, album: f.album, albumId: f.albumId, capa: f.capa, dur: f.dur, ytIds: f.ytIds, preview: f.preview }; }
  function alternarCurtida(f) {
    if (curtido(f.k)) { bib.curtidas = bib.curtidas.filter(function (x) { return x.k !== f.k; }); aviso('Removida das curtidas'); }
    else { bib.curtidas.unshift(limpa(f)); aviso('Salva nas Músicas curtidas'); }
    salvarBib(); render(); barra();
  }
  function seguindo(id) { return bib.seguidos.some(function (a) { return a.id === id; }); }
  function alternarSeguir(a) {
    if (seguindo(a.id)) bib.seguidos = bib.seguidos.filter(function (x) { return x.id !== a.id; });
    else bib.seguidos.push({ id: a.id, name: a.name, picture_medium: a.picture_medium, picture_xl: a.picture_xl, nb_fan: a.nb_fan });
    salvarBib(); render();
  }
  function recentes() { return seguro(function () { return JSON.parse(localStorage.getItem(LS_REC) || '[]'); }, []); }
  function lembrar(a) {
    var l = [{ id: a.id, name: a.name, picture_medium: a.picture_medium, picture_xl: a.picture_xl, nb_fan: a.nb_fan }].concat(recentes().filter(function (x) { return x.id !== a.id; })).slice(0, 12);
    seguro(function () { localStorage.setItem(LS_REC, JSON.stringify(l)); });
  }

  // ───────────────────────── dados da internet (com cache) ─────────────────────────
  var cache = {}, pedindo = {};
  function pega(url, chave) {
    if (cache.hasOwnProperty(chave)) return cache[chave];
    if (!pedindo[chave]) {
      pedindo[chave] = 1;
      fetch(url).then(function (r) { return r.json(); }).then(function (j) { cache[chave] = j; }, function () { cache[chave] = null; })
        .then(function () { delete pedindo[chave]; render(); });
    }
    return undefined; // carregando
  }
  function dz(caminho) { var j = pega(API + '?c=' + encodeURIComponent(caminho), 'dz:' + caminho); return j === undefined ? undefined : (j && j.ok ? j.dados : null); }
  function lista(v) { return v === undefined ? undefined : (v && v.data) || []; }
  var D = {
    artistas: function (q) { return lista(dz('search/artist?q=' + q + '&limit=20')); },
    faixas: function (q) { return lista(dz('search/track?q=' + q + '&limit=25')); },
    albuns: function (q) { return lista(dz('search/album?q=' + q + '&limit=20')); },
    playlists: function (q) { return lista(dz('search/playlist?q=' + q + '&limit=20')); },
    artista: function (id) { return dz('artist/' + id); },
    top: function (id) { return lista(dz('artist/' + id + '/top?limit=10')); },
    discos: function (id) {
      var l = lista(dz('artist/' + id + '/albums?limit=200')); if (!l) return l;
      var vistos = {};
      return l.slice().sort(function (a, b) { return String(b.release_date || '').localeCompare(String(a.release_date || '')); })
        .filter(function (a) { var k = a.title.toLowerCase() + '|' + a.record_type; if (vistos[k]) return false; vistos[k] = 1; return true; });
    },
    parecidos: function (id) { return lista(dz('artist/' + id + '/related?limit=12')); },
    radio: function (id) { return lista(dz('artist/' + id + '/radio?limit=40')); },
    album: function (id) { return dz('album/' + id); },
    faixasAlbum: function (id) { return lista(dz('album/' + id + '/tracks?limit=200')); },
    playlist: function (id) { return dz('playlist/' + id); },
    faixasPlaylist: function (id) { return lista(dz('playlist/' + id + '/tracks?limit=200')); },
    topGospel: function () { return lista(dz('chart/' + GOSPEL + '/tracks?limit=50')); },
    playlistsGospel: function () { return lista(dz('chart/' + GOSPEL + '/playlists?limit=20')); },
    cds: function (nome) { var j = pega(API + '?cd=' + encodeURIComponent(nome), 'cd:' + nome); return j === undefined ? undefined : (j && j.itens) || []; }
  };
  /** cantor pelo nome: o de nome igual (ou contido); nunca abre OUTRO cantor */
  function cantorPeloNome(nome) {
    var s = bib.seguidos.concat(recentes()).filter(function (a) { return mesmo(a.name, nome); })[0];
    if (s) return s;
    var l = D.artistas(nome); if (l === undefined) return undefined;
    var n = norm(nome);
    var iguais = l.filter(function (a) { return mesmo(a.name, nome); });
    var pool = iguais.length ? iguais : l.filter(function (a) { var x = norm(a.name); return x.length > 3 && (x.indexOf(n) >= 0 || n.indexOf(x) >= 0); });
    return pool.sort(function (a, b) { return (b.nb_fan || 0) - (a.nb_fan || 0); })[0] || null;
  }
  function fz(f, al) {
    var a = al || f.album || {};
    return { k: 'dz:' + f.id, titulo: f.title, artista: f.artist && f.artist.name, artistaId: f.artist && f.artist.id, album: a.title, albumId: a.id, capa: a.cover_medium, capaG: a.cover_xl, dur: f.duration, preview: f.preview || '' };
  }
  function fyt(v, nome) { return { k: 'yt:' + v.id, titulo: v.titulo, artista: nome, capa: v.thumb, dur: v.dur, ytIds: [v.id] }; }

  // ───────────────────────── letras (Harpa Cristã do próprio RADAR) ─────────────────────────
  var harpa = null, harpaPedida = false;
  function letraDe(titulo) {
    if (!titulo) return null;
    if (!harpa) {
      if (!harpaPedida) { harpaPedida = true; fetch('/harpa.json').then(function (r) { return r.json(); }).then(function (l) { harpa = {}; (l || []).forEach(function (h) { var k = norm(h.t); if (k && !harpa[k]) harpa[k] = h; }); render(); renderAgora(); }).catch(function () { harpa = {}; }); }
      return undefined;
    }
    var k = norm(String(titulo).replace(/\((ao vivo|live|playback|acustico|acústico|remix|vers[aã]o[^)]*)\)/gi, '').replace(/\s+-\s+.*$/, ''));
    return harpa[k] || null;
  }

  // ───────────────────────── o TOCADOR (YouTube IFrame, oficial) ─────────────────────────
  var P = { fila: [], i: -1, atual: null, tocando: false, carregando: false, falhou: false, t: 0, dur: 0, aleatorio: false, repetir: 'nao',
    vol: Number(seguro(function () { return localStorage.getItem(LS_VOL); }, '')) || 90, suave: seguro(function () { return localStorage.getItem(LS_SUAVE) !== '0'; }, true) };
  var yt = null, ytPronto = false, ytFila = [], idsTentados = [], fadeT = 0, pollT = 0;
  function carregarYT(cb) {
    if (window.YT && window.YT.Player) { cb(); return; }
    ytFila.push(cb);
    if (ytFila.length > 1) return;
    var antes = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (typeof antes === 'function') seguro(antes); var l = ytFila.slice(); ytFila = []; l.forEach(function (f) { seguro(f); }); };
    var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; document.head.appendChild(s);
  }
  function garantirPlayer(cb) {
    if (yt && ytPronto) { cb(); return; }
    carregarYT(function () {
      if (yt) { if (ytPronto) cb(); else ytFila.push(cb); return; }
      yt = new window.YT.Player('mus-yt-alvo', {
        width: '100%', height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, controls: 1, origin: location.origin },
        events: {
          onReady: function () { ytPronto = true; yt.setVolume(P.vol); var l = ytFila.slice(); ytFila = []; cb(); l.forEach(function (f) { seguro(f); }); },
          onStateChange: aoMudarEstado,
          onError: aoErro
        }
      });
    });
  }
  function aoMudarEstado(e) {
    var Y = window.YT.PlayerState;
    if (e.data === Y.PLAYING) {
      P.tocando = true; P.carregando = false; P.falhou = false; clearTimeout(tToque);
      seguro(function () { document.getElementById('mus-ytbox').classList.remove('precisa-toque'); });
      if (P.suave && yt.getCurrentTime() < 1.5) fadeVol(0, P.vol, 1200); else seguro(function () { yt.setVolume(P.vol); });
      poll(true);
    } else if (e.data === Y.PAUSED) { P.tocando = false; poll(false); }
    else if (e.data === Y.ENDED) { P.tocando = false; poll(false); if (P.repetir === 'uma') { yt.seekTo(0); yt.playVideo(); } else proxima(true); }
    else if (e.data === Y.BUFFERING) { P.carregando = true; }
    barra(); renderAgora(); render();
  }
  var diag = [];   // diagnóstico: últimos erros do player (window.radarMusicasDiag())
  window.radarMusicasDiag = function () { return { erros: diag.slice(-10), atual: P.atual && P.atual.titulo, ids: P.atual && P.atual.ytIds, tentados: idsTentados.slice() }; };
  function aoErro(e) {
    // vídeo não deixa incorporar / sumiu: tenta o próximo candidato; acabou -> próxima música
    diag.push({ t: Date.now(), codigo: e && e.data, id: idsTentados[idsTentados.length - 1] });
    var f = P.atual; if (!f) return;
    var prox = (f.ytIds || []).filter(function (id) { return idsTentados.indexOf(id) < 0; })[0];
    if (prox) { idsTentados.push(prox); yt.loadVideoById(prox); return; }
    P.falhou = true; P.carregando = false; P.tocando = false; barra(); render();
    aviso('Não consegui tocar “' + f.titulo + '” — indo pra próxima');
    setTimeout(function () { if (P.atual === f) proxima(true); }, 1500);
  }
  function poll(liga) {
    clearInterval(pollT);
    if (!liga) return;
    pollT = setInterval(function () {
      if (!yt || !ytPronto) return;
      P.t = seguro(function () { return yt.getCurrentTime(); }, 0) || 0;
      P.dur = seguro(function () { return yt.getDuration(); }, 0) || (P.atual && P.atual.dur) || 0;
      // saída suave nos últimos 3 s
      if (P.suave && P.dur > 20 && P.dur - P.t < 3) seguro(function () { yt.setVolume(Math.max(0, Math.round(P.vol * (P.dur - P.t) / 3))); });
      barraTempo();
    }, 500);
  }
  function fadeVol(de, para, ms, fim) {
    clearInterval(fadeT); var t0 = Date.now();
    fadeT = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / ms);
      seguro(function () { yt.setVolume(Math.round(de + (para - de) * k)); });
      if (k >= 1) { clearInterval(fadeT); if (fim) fim(); }
    }, 60);
  }
  var achando = {};
  function achar(f, cb, tentativa) {
    if (f.ytIds && f.ytIds.length) { cb(f.ytIds); return; }
    // o mesmo pedido já está a caminho (ex.: a próxima já sendo preparada): espera ele
    if (achando[f.k] && !tentativa) { achando[f.k].push(cb); return; }
    if (!tentativa) achando[f.k] = [cb];
    var q = (f.artista ? f.artista + ' ' : '') + f.titulo;
    var fim = function (ids) {
      if (!ids.length && !tentativa) { setTimeout(function () { achar(f, function () {}, 1); }, 900); return; } // 2ª tentativa
      var l = achando[f.k] || []; delete achando[f.k];
      l.forEach(function (c) { seguro(function () { c(ids); }); });
    };
    fetch(API + '?yt=' + encodeURIComponent(q) + '&dur=' + (f.dur || 0) + '&t=' + encodeURIComponent(f.titulo) + (tentativa ? '&n=2' : ''))
      .then(function (r) { return r.json(); }).then(function (j) { var ids = (j && j.ids) || []; if (ids.length) f.ytIds = ids; fim(ids); }, function () { fim([]); });
  }
  function tocarLista(lst, i) {
    if (!lst || !lst.length) return;
    P.fila = lst.slice(); tocarIndice(i == null ? (P.aleatorio ? Math.floor(Math.random() * lst.length) : 0) : i);
  }
  // ── PLANO B: prévia de 30 s do Deezer num <audio> comum, quando o YouTube não achou
  // a música (ex.: o YouTube barrou o servidor). Melhor tocar 30 s avisando do que nada.
  var aud = null;
  function previa() {
    if (!aud) {
      aud = new Audio();
      aud.addEventListener('playing', function () { P.tocando = true; P.carregando = false; barra(); renderAgora(); });
      aud.addEventListener('pause', function () { P.tocando = false; barra(); renderAgora(); });
      aud.addEventListener('timeupdate', function () { P.t = aud.currentTime || 0; P.dur = aud.duration || 30; barraTempo(); });
      aud.addEventListener('ended', function () { P.tocando = false; if (P.repetir === 'uma') { aud.currentTime = 0; aud.play(); } else proxima(true); });
    }
    return aud;
  }
  function pararPrevia() { if (aud) seguro(function () { aud.pause(); aud.removeAttribute('src'); aud.load(); }); P.emPrevia = false; }
  function tocarPrevia(f) {
    P.emPrevia = true; P.falhou = false;
    if (yt && ytPronto) seguro(function () { yt.stopVideo(); });
    var a = previa(); a.src = f.preview; a.volume = P.vol / 100;
    a.play().catch(function () { P.carregando = false; barra(); });
    aviso('Tocando a prévia de 30 s (o vídeo completo não respondeu agora)');
    barra(); renderAgora();
  }

  // Android: o Chrome pode exigir um toque NO PRÓPRIO vídeo pra começar (o toque na
  // lista "vence" enquanto o app acha o vídeo). Se em ~3 s não começou, avisa em cima dele.
  var tToque = 0;
  function vigiarInicio(f) {
    clearTimeout(tToque);
    tToque = setTimeout(function () {
      if (P.atual !== f || P.tocando || P.emPrevia || P.falhou) return;
      var est = seguro(function () { return yt.getPlayerState(); }, -1);
      if (est === -1 || est === 5 || est === 2) {
        var b = document.getElementById('mus-ytbox'); if (b) b.classList.add('precisa-toque');
        P.carregando = false; barra();
        aviso('Toque no vídeo para começar');
      }
    }, 3200);
  }
  function tocarIndice(i) {
    var f = P.fila[i]; if (!f) return;
    pararPrevia();
    P.i = i; P.atual = f; P.carregando = true; P.falhou = false; P.t = 0; P.dur = f.dur || 0; idsTentados = [];
    pausarOutros();
    abrirMini();
    historico(f);
    barra(); render(); renderAgora(); midia(f);
    achar(f, function (ids) {
      if (P.atual !== f) return;
      if (!ids.length) { if (f.preview) tocarPrevia(f); else aoErro(); return; }
      idsTentados = [ids[0]];
      garantirPlayer(function () { if (P.atual !== f) return; seguro(function () { yt.setVolume(P.suave ? 0 : P.vol); }); yt.loadVideoById(ids[0]); vigiarInicio(f); });
    });
    // já vai achando a próxima
    var prox = P.fila[i + 1]; if (prox && !prox.ytIds) achar(prox, function () {});
  }
  function alternar() {
    if (!P.atual) { if (P.fila.length) tocarIndice(0); return; }
    if (P.emPrevia && aud) { if (aud.paused) aud.play().catch(function () {}); else aud.pause(); return; }
    if (!yt || !ytPronto) return;
    if (P.tocando) yt.pauseVideo(); else yt.playVideo();
  }
  function proxima(fim) {
    if (!P.fila.length) return;
    var j;
    if (P.aleatorio && P.fila.length > 1) { do { j = Math.floor(Math.random() * P.fila.length); } while (j === P.i); }
    else { j = P.i + 1; if (j >= P.fila.length) { if (fim && P.repetir !== 'todas') { P.tocando = false; barra(); return; } j = 0; } }
    tocarIndice(j);
  }
  function anterior() {
    if (P.emPrevia && aud && P.t > 3) { aud.currentTime = 0; return; }
    if (!P.emPrevia && yt && ytPronto && P.t > 3) { yt.seekTo(0, true); return; }
    if (!P.fila.length) return;
    tocarIndice((P.i - 1 + P.fila.length) % P.fila.length);
  }
  function parar() { clearInterval(fadeT); clearTimeout(tToque); pararPrevia(); poll(false); if (yt && ytPronto) seguro(function () { yt.stopVideo(); }); P.atual = null; P.tocando = false; P.i = -1; fecharMini(); barra(); render(); renderAgora(); }
  function pararSuave() { if (!yt || !P.tocando) { parar(); return; } fadeVol(P.vol, 0, 3000, function () { parar(); seguro(function () { yt.setVolume(P.vol); }); }); aviso('Parando devagar…'); }
  function irPara(s) { if (P.emPrevia && aud) aud.currentTime = s; else if (yt && ytPronto) yt.seekTo(s, true); P.t = s; barraTempo(); }
  function volume(v) { P.vol = Math.max(0, Math.min(100, v)); seguro(function () { localStorage.setItem(LS_VOL, P.vol); }); if (yt && ytPronto) yt.setVolume(P.vol); if (aud) aud.volume = P.vol / 100; }
  function tocarEmSeguida(f) { if (!P.atual) { tocarLista([f], 0); return; } P.fila.splice(P.i + 1, 0, f); aviso('Vai tocar em seguida'); }
  function addFila(f) { if (!P.atual) { tocarLista([f], 0); return; } P.fila.push(f); aviso('Adicionada à fila'); }
  function historico(f) { bib.historico = [limpa(f)].concat(bib.historico.filter(function (x) { return x.k !== f.k; })).slice(0, 30); salvarBib(); }
  /** outros vídeos do RADAR (notícias, carrossel) param a música e vice-versa */
  function pausarOutros() {
    seguro(function () { var o = document.getElementById('yt-ov'); if (typeof window._closeYT === 'function' && o && o.style.display !== 'none') window._closeYT(); });
    seguro(function () { document.querySelectorAll('video').forEach(function (v) { if (!v.paused) v.pause(); }); });
  }
  /** controles na tela de bloqueio / fone (quando o navegador aceita) */
  function midia(f) {
    if (!('mediaSession' in navigator)) return;
    seguro(function () {
      navigator.mediaSession.metadata = new window.MediaMetadata({ title: f.titulo, artist: f.artista || '', album: f.album || '', artwork: f.capa ? [{ src: f.capaG || f.capa, sizes: '500x500' }] : [] });
      navigator.mediaSession.setActionHandler('play', alternar);
      navigator.mediaSession.setActionHandler('pause', alternar);
      navigator.mediaSession.setActionHandler('nexttrack', function () { proxima(); });
      navigator.mediaSession.setActionHandler('previoustrack', anterior);
    });
  }

  // ───────────────────────── navegação + botão voltar ─────────────────────────
  var pilha = [{ v: 'inicio' }], pos = 0, janelas = []; // janelas: menu, diálogo, tocando agora, fila
  var termo = '', aba = 'tudo', estiloSel = 'adoracao', filtroBib = 'tudo';
  function rota() { return pilha[pos]; }
  function ir(r) { pilha = pilha.slice(0, pos + 1); pilha.push(r); pos++; seguro(function () { history.pushState({ musNav: 1 }, ''); }); render(true); }
  function voltar() { seguro(function () { history.back(); }); }
  function abrirJanela(nome) { janelas.push(nome); seguro(function () { history.pushState({ musNav: 1, j: nome }, ''); }); }
  function fecharJanela() { voltar(); }
  window.addEventListener('popstate', function (e) {
    var tela = document.getElementById('tela-musicas');
    if (!tela || !tela.classList.contains('ativa')) { if (janelas.length || pos) { janelas = []; pilha = [{ v: 'inicio' }]; pos = 0; } return; }
    var st = e.state;
    if (saindo) { saindo = false; irInicioRadar(); return; }
    if (janelas.length) { var j = janelas.pop(); fecharJanelaUI(j); return; }
    if (st && st.radarNav) { if (pos) { pos = 0; render(true); } return; } // voltou à entrada da tela: Início
    if (pos > 0) { pos--; render(true); }
  });
  // Sair = igual aos botões ‹ do RADAR: primeiro tira do histórico os passos internos
  // daqui (páginas/janelas), depois vai pro início pelo caminho oficial (irHome) — o
  // controle do botão voltar do app (aoVoltar/registrar) se alinha sozinho com isso.
  var saindo = false;
  function irInicioRadar() { if (typeof window.irHome === 'function') window.irHome(); else { seguro(function () { document.getElementById('tela-musicas').classList.remove('ativa'); document.getElementById('home').classList.add('ativa'); }); } }
  function sairDaTela() {
    var n = pos + janelas.length; janelas = []; pilha = [{ v: 'inicio' }]; pos = 0;
    fecharJanelaUI('agora'); fecharJanelaUI('menu'); fecharJanelaUI('dlg'); fecharJanelaUI('fila');
    if (n > 0) { saindo = true; seguro(function () { history.go(-n); }); setTimeout(function () { if (saindo) { saindo = false; irInicioRadar(); } }, 800); }
    else irInicioRadar();
  }

  // ───────────────────────── montagem da tela ─────────────────────────
  var montado = false, raiz, main;
  function tema() { return seguro(function () { return localStorage.getItem(LS_TEMA); }, '') === 'spotify' ? 'spotify' : 'deezer'; }
  function montar() {
    if (montado) return;
    raiz = document.getElementById('mus-app'); if (!raiz) return;
    montado = true;
    raiz.innerHTML =
      '<aside class="mus-lado" id="mus-lado"></aside>' +
      '<div class="mus-corpo">' +
        '<header class="mus-topo" id="mus-topo"></header>' +
        '<main class="mus-main" id="mus-main"></main>' +
      '</div>' +
      '<div class="mus-ytbox" id="mus-ytbox"><div id="mus-yt-alvo"></div><button class="mus-ytx" data-a="agora" aria-label="Abrir tocando agora">' + ic('dir', 16) + '</button></div>' +
      '<div class="mus-barra" id="mus-barra"></div>' +
      '<nav class="mus-nav" id="mus-nav"></nav>' +
      '<div class="mus-agora" id="mus-agora"></div>' +
      '<div class="mus-fundo" id="mus-fundo" data-a="fecharjanela"></div>' +
      '<div class="mus-sheet" id="mus-sheet"></div>' +
      '<div class="mus-dlg" id="mus-dlg"></div>' +
      '<div class="mus-aviso" id="mus-aviso"></div>';
    main = document.getElementById('mus-main');
    raiz.addEventListener('click', clique);
    raiz.addEventListener('input', digitou);
    raiz.addEventListener('change', mudou);
    main.addEventListener('scroll', function () { var t = document.getElementById('mus-topo'); if (t) t.classList.toggle('solido', main.scrollTop > 40); }, { passive: true });
  }
  function aplicarTema() { if (raiz) raiz.setAttribute('data-tema', tema()); }

  // ───────────────────────── render ─────────────────────────
  function render(topo) {
    if (!montado) return;
    REG = {}; regN = 0;
    aplicarTema();
    var r = rota();
    renderTopo(r, topo); renderLado(r); renderNav(r);
    var html = '';
    try {
      if (r.v === 'inicio') html = vInicio();
      else if (r.v === 'busca') html = vBusca();
      else if (r.v === 'biblioteca') html = vBiblioteca();
      else if (r.v === 'artista') html = vArtista(r.id);
      else if (r.v === 'cantor') html = vCantor(r.nome);
      else if (r.v === 'album') html = vAlbum(r.id);
      else if (r.v === 'dzplaylist') html = vPlaylistDz(r.id);
      else if (r.v === 'minha') html = vMinha(r.id);
      else if (r.v === 'pasta') html = vPasta(r.id);
      else if (r.v === 'curtidas') html = vCurtidas();
      else if (r.v === 'escolher') html = vEscolher();
      else if (r.v === 'top') html = vTop();
    } catch (e) { html = '<div class="mus-pad"><p class="mus-sub">Algo deu errado nesta tela. Volte e tente de novo.</p></div>'; }
    main.innerHTML = html;
    if (topo) main.scrollTop = 0;
    pintarVideo();
  }
  function renderTopo(r, entrou) {
    var t = document.getElementById('mus-topo');
    var buscando = r.v === 'busca';
    var modo = (buscando ? 'busca' : 'pill') + (pos > 0 ? ':v' : ':s') + ':' + tema();
    // não redesenha o topo à toa: se o campo de busca já está lá, ele NÃO pode perder o
    // foco/teclado quando os resultados chegam no meio da digitação
    if (!entrou && t.getAttribute('data-modo') === modo) return;
    t.setAttribute('data-modo', modo);
    t.innerHTML =
      '<button class="mus-seta" data-a="' + (pos > 0 ? 'voltar' : 'sair') + '" aria-label="Voltar">' + ic('esq', 20) + '</button>' +
      (buscando
        ? '<label class="mus-busca campo">' + ic('lupa', 18) + '<input id="mus-q" value="' + esc(termo) + '" placeholder="Cantor, música, álbum…" autocomplete="off" spellcheck="false" enterkeyhint="search"></label>'
        : '<button class="mus-busca" data-a="irbusca">' + ic('lupa', 18) + '<span>O que você quer ouvir?</span></button>') +
      '<div class="mus-visual"><button data-a="tema" data-v="spotify" class="' + (tema() === 'spotify' ? 'on' : '') + '" aria-label="Visual Spotify">' + ic('lua', 14) + '<span>Spotify</span></button><button data-a="tema" data-v="deezer" class="' + (tema() === 'deezer' ? 'on' : '') + '" aria-label="Visual Deezer">' + ic('sol', 14) + '<span>Deezer</span></button></div>';
    // ao ENTRAR na busca: foco no campo com o texto anterior selecionado (é só digitar por cima)
    if (buscando && entrou) { var q = document.getElementById('mus-q'); if (q) setTimeout(function () { seguro(function () { q.focus(); q.select(); }); }, 60); }
  }
  function renderNav(r) {
    var n = document.getElementById('mus-nav');
    var on = function (v) { return r.v === v || (v === 'biblioteca' && /^(minha|pasta|curtidas|cantor)$/.test(r.v)) ? ' on' : ''; };
    n.innerHTML =
      '<button class="' + on('inicio') + '" data-a="nav" data-v="inicio">' + ic('casa', 22) + '<span>Início</span></button>' +
      '<button class="' + on('busca') + '" data-a="nav" data-v="busca">' + ic('lupa', 22) + '<span>Buscar</span></button>' +
      '<button class="' + on('biblioteca') + '" data-a="nav" data-v="biblioteca">' + ic('livros', 22) + '<span>Biblioteca</span></button>';
  }
  function cantoresMeus() {
    var l = bib.seguidos.slice();
    recentes().forEach(function (a) { if (!l.some(function (x) { return x.id === a.id; })) l.push(a); });
    return l;
  }
  function itemBib(r, a, v, img, titulo, sub, redondo, extra) {
    var on = r.v === v.v && (v.id == null || r.id === v.id) && (v.nome == null || r.nome === v.nome);
    return '<button class="mus-bibit' + (on ? ' on' : '') + '" data-a="ir" data-r="' + reg(v) + '"' + (extra || '') + '>' + img + '<span><b>' + esc(titulo) + '</b><small>' + esc(sub) + '</small></span></button>';
  }
  function listaBib(r) {
    var h = '';
    if (filtroBib !== 'artistas') {
      h += itemBib(r, 0, { v: 'curtidas' }, '<div class="mus-bibcapa curtidas">' + ic('cor', 18, true) + '</div>', 'Músicas curtidas', 'Playlist · ' + qtd(bib.curtidas.length));
      bib.pastas.forEach(function (pa) {
        var dentro = bib.playlists.filter(function (p) { return p.pasta === pa.id; });
        h += itemBib(r, 0, { v: 'pasta', id: pa.id }, '<div class="mus-bibcapa pastaic">' + ic('pasta', 20) + '</div>', pa.nome, 'Pasta · ' + qtd(dentro.length, 'playlist', 'playlists'));
      });
      bib.playlists.filter(function (p) { return !p.pasta || !bib.pastas.some(function (pa) { return pa.id === p.pasta; }); }).forEach(function (p) {
        var c = (p.itens.filter(function (i) { return i.capa; })[0] || {}).capa;
        h += itemBib(r, 0, { v: 'minha', id: p.id }, capa(c, 'mus-bibcapa'), p.nome, 'Playlist · ' + qtd(p.itens.length));
      });
    }
    if (filtroBib !== 'playlists') cantoresMeus().forEach(function (a) {
      h += itemBib(r, 0, { v: 'artista', id: a.id }, capa(a.picture_medium, 'mus-bibcapa', true), a.name, seguindo(a.id) ? 'Artista · seguindo' : 'Artista');
    });
    return h;
  }
  function renderLado(r) {
    var l = document.getElementById('mus-lado');
    l.innerHTML =
      '<nav class="mus-caixa">' +
        '<button class="mus-sair" data-a="sair">' + ic('sair', 18) + ' Voltar ao RADAR</button>' +
        '<button class="mus-ladonav' + (r.v === 'inicio' ? ' on' : '') + '" data-a="nav" data-v="inicio">' + ic('casa', 22) + ' Início</button>' +
        '<button class="mus-ladonav' + (r.v === 'busca' ? ' on' : '') + '" data-a="nav" data-v="busca">' + ic('lupa', 22) + ' Buscar</button>' +
      '</nav>' +
      '<div class="mus-caixa mus-bib">' +
        '<div class="mus-bibtit">' + ic('livros', 20) + ' Sua biblioteca<span class="mus-gap"></span><button class="mus-ic" data-a="criar" aria-label="Criar">' + ic('mais', 18) + '</button></div>' +
        '<div class="mus-chips">' + chipBib('playlists', 'Playlists') + chipBib('artistas', 'Artistas') + '</div>' +
        '<div class="mus-biblista">' + listaBib(r) + '</div>' +
      '</div>';
  }
  function chipBib(k, t) { return '<button class="mus-chip' + (filtroBib === k ? ' on' : '') + '" data-a="filtrobib" data-v="' + k + '">' + t + '</button>'; }

  // ── pedaços ──
  function carregando(t) { return '<div class="mus-carr">' + ic('onda', 18) + ' ' + esc(t || 'Carregando…') + '</div>'; }
  function hero(o) {
    return '<header class="mus-hero' + (o.curtidas ? ' curtidas' : '') + '">' +
      (o.curtidas ? '<div class="mus-heroimg curtidas">' + ic('cor', 72, true) + '</div>' : o.pasta ? '<div class="mus-heroimg pastaic">' + ic('pasta', 72) + '</div>' : capa(o.capa, 'mus-heroimg', o.redondo, 'nota')) +
      '<div class="mus-herotxt"><span class="mus-tipo">' + esc(o.tipo) + '</span><h1 class="mus-titulo' + (String(o.titulo).length > 24 ? ' longo' : '') + '"' + (o.editar ? ' data-a="' + o.editar + '" data-r="' + o.r + '" title="Toque para renomear"' : '') + '>' + esc(o.titulo) + '</h1><span class="mus-meta">' + (o.sub || '') + '</span></div></header>';
  }
  function acoes(lst, extra) {
    var aqui = P.atual && lst.some(function (f) { return f.k === P.atual.k; });
    return '<div class="mus-acoes"><button class="mus-grande" data-a="tocarlista" data-r="' + reg(lst) + '" ' + (lst.length ? '' : 'disabled') + ' aria-label="Tocar">' + ic(aqui && P.tocando ? 'pausa' : 'play', 26, true) + '</button>' +
      '<button class="mus-ic' + (P.aleatorio ? ' on' : '') + '" data-a="aleatorio" aria-label="Aleatório">' + ic('aleat', 24) + '</button>' + (extra || '') + '</div>';
  }
  function linhas(lst, o) {
    o = o || {};
    var rl = reg(lst);
    return '<div class="mus-tab">' + lst.map(function (f, i) {
      var ativo = P.atual && P.atual.k === f.k;
      var sub = ativo && P.carregando ? 'achando no YouTube…' : ativo && P.falhou ? 'não consegui tocar esta' : esc(f.artista || '');
      var rf = reg(f);
      return '<div class="mus-lin' + (ativo ? ' on' : '') + '" data-a="tocar" data-r="' + rl + '" data-i="' + i + '">' +
        '<span class="mus-n">' + (ativo && P.tocando ? '<span class="mus-eq"><i></i><i></i><i></i></span>' : (o.num ? o.num(f, i) : i + 1)) + '</span>' +
        (o.semCapa ? '' : capa(f.capa, 'mus-thumb')) +
        '<span class="mus-ttx"><span class="mus-nome">' + esc(f.titulo) + '</span><span class="mus-art">' + sub + '</span></span>' +
        (o.semAlbum || !f.album ? '' : '<span class="mus-alb">' + esc(f.album) + '</span>') +
        '<button class="mus-cor' + (curtido(f.k) ? ' on' : '') + '" data-a="curtir" data-r="' + rf + '" aria-label="Curtir">' + ic('cor', 18, curtido(f.k)) + '</button>' +
        '<span class="mus-d">' + (f.dur ? tempo(f.dur) : '') + '</span>' +
        '<button class="mus-pts" data-a="menu" data-r="' + rf + '"' + (o.playlist ? ' data-pl="' + esc(o.playlist) + '"' : '') + ' aria-label="Mais opções">' + ic('pontos', 22) + '</button>' +
      '</div>';
    }).join('') + '</div>';
  }
  function secao(titulo, corpo, verTudo, sub) {
    return '<section class="mus-secao"><div class="mus-sectit"><h2>' + esc(titulo) + '</h2>' + (verTudo ? '<button class="mus-vertudo" ' + verTudo + '>Mostrar tudo</button>' : '') + '</div>' + (sub ? '<p class="mus-sub">' + esc(sub) + '</p>' : '') + corpo + '</section>';
  }
  function card(img, titulo, sub, acao, redondo, play) {
    return '<div class="mus-card" ' + acao + ' role="button" tabindex="0"><div class="mus-cardimgw">' + capa(img, 'mus-cardimg', redondo) + (play ? '<button class="mus-cardplay" ' + play + ' aria-label="Tocar">' + ic('play', 20, true) + '</button>' : '') + '</div><b>' + esc(titulo) + '</b><small>' + esc(sub || '') + '</small></div>';
  }
  function cards(html, artistas, linha) { return '<div class="mus-cards' + (artistas ? ' artistas' : '') + (linha ? ' linha' : '') + '">' + html + '</div>'; }
  function cardArtista(a) { return card(a.picture_medium, a.name, fas(a.nb_fan) || 'Artista', 'data-a="ir" data-r="' + reg({ v: 'artista', id: a.id }) + '"', true); }
  function cardAlbum(a, sub) { return card(a.cover_medium, a.title, sub || [ano(a.release_date), (a.artist && a.artist.name) || tipoDisco(a.record_type)].filter(Boolean).join(' · '), 'data-a="ir" data-r="' + reg({ v: 'album', id: a.id }) + '"'); }
  function cardPlaylist(p) { return card(p.picture_medium, p.title, (p.nb_tracks ? qtd(p.nb_tracks) : '') + (p.user && p.user.name ? ' · ' + p.user.name : ''), 'data-a="ir" data-r="' + reg({ v: 'dzplaylist', id: p.id }) + '"'); }

  // ───────────────────────── as telas ─────────────────────────
  function vInicio() {
    var top = D.topGospel(), pls = D.playlistsGospel();
    var meus = cantoresMeus();
    var atalhos = [{ n: 'Músicas curtidas', curt: 1, r: { v: 'curtidas' } }]
      .concat(bib.playlists.slice(0, 3).map(function (p) { return { n: p.nome, img: (p.itens.filter(function (i) { return i.capa; })[0] || {}).capa, r: { v: 'minha', id: p.id } }; }))
      .concat((pls || []).slice(0, 6).map(function (p) { return { n: p.title, img: p.picture_medium, r: { v: 'dzplaylist', id: p.id } }; })).slice(0, 8);
    var h = '<div class="mus-inicio"><h1 class="mus-saud">' + saudacao() + '</h1><div class="mus-atalhos">' +
      atalhos.map(function (a) { return '<button class="mus-atalho" data-a="ir" data-r="' + reg(a.r) + '">' + (a.curt ? '<div class="mus-atimg curtidas">' + ic('cor', 22, true) + '</div>' : capa(a.img, 'mus-atimg')) + '<b>' + esc(a.n) + '</b></button>'; }).join('') + '</div>';
    if (bib.historico.length) {
      var rec = bib.historico.slice(0, 12), rr = reg(rec);
      h += secao('Tocadas recentemente', cards(rec.map(function (f, i) { var a = 'data-a="tocar" data-r="' + rr + '" data-i="' + i + '"'; return card(f.capa, f.titulo, f.artista, a, false, a); }).join(''), false, true));
    }
    if (!meus.length) {
      h += '<section class="mus-secao mus-convite"><h2>Escolha seus cantores</h2><p class="mus-sub">Marque os cantores que você mais ouve — eles aparecem aqui e na sua biblioteca.</p><button class="mus-grandetxt" data-a="ir" data-r="' + reg({ v: 'escolher' }) + '">Escolher cantores</button></section>';
    } else {
      h += '<section class="mus-secao"><div class="mus-sectit"><h2>Seus artistas</h2><button class="mus-vertudo" data-a="ir" data-r="' + reg({ v: 'escolher' }) + '">Escolher mais</button></div>' + cards(meus.slice(0, 12).map(cardArtista).join(''), true, true) + '</section>';
      // Pra ir direto pros seus favoritos: as mais tocadas dos 4 primeiros
      var fav = [], listas = meus.slice(0, 4).map(function (a) { return D.top(a.id) || []; });
      for (var k = 0; k < 4; k++) listas.forEach(function (l) { if (l[k]) fav.push(fz(l[k])); });
      fav = fav.slice(0, 9);
      if (fav.length) {
        var rf = reg(fav);
        h += secao('Pra ir direto pros seus favoritos', '<div class="mus-blocos">' + fav.map(function (f, i) {
          var ativo = P.atual && P.atual.k === f.k;
          return '<div class="mus-bloco' + (ativo ? ' on' : '') + '" data-a="tocar" data-r="' + rf + '" data-i="' + i + '">' + capa(f.capa, 'mus-thumb g') + '<span class="mus-ttx"><span class="mus-nome">' + esc(f.titulo) + '</span><span class="mus-art">por ' + esc(f.artista) + '</span></span><button class="mus-cor' + (curtido(f.k) ? ' on' : '') + '" data-a="curtir" data-r="' + reg(f) + '" aria-label="Curtir">' + ic('cor', 18, curtido(f.k)) + '</button></div>';
        }).join('') + '</div>', null, 'As mais tocadas dos cantores que você segue.');
      }
    }
    h += secao('Top Gospel do Brasil', top === undefined ? carregando() : !top.length ? '<p class="mus-sub">Sem internet agora.</p>' : linhas(top.slice(0, 5).map(function (f) { return fz(f); })), 'data-a="ir" data-r="' + reg({ v: 'top' }) + '"');
    var pop = [];
    ESTILOS[0].c.slice(0, 6).concat(ESTILOS[1].c.slice(0, 6)).forEach(function (n) { var a = cantorPeloNome(n); if (a) pop.push(a); });
    if (pop.length) h += secao('Artistas populares', cards(pop.map(cardArtista).join(''), true, true), 'data-a="ir" data-r="' + reg({ v: 'escolher' }) + '"');
    if (pls && pls.length) h += secao('Paradas e playlists gospel', cards(pls.map(cardPlaylist).join(''), false, true));
    return h + '</div>';
  }

  function vBusca() {
    var q = termo.trim();
    if (q.length < 2) {
      var rec = recentes(), pls = D.playlistsGospel();
      return '<div class="mus-pad"><h2 class="mus-h2">Busque qualquer cantor, música ou álbum</h2><p class="mus-sub">Os CDs, LPs e louvores aparecem prontos pra tocar e curtir.</p>' +
        '<button class="mus-pill" data-a="ir" data-r="' + reg({ v: 'escolher' }) + '">' + ic('estrela', 16) + ' Escolher meus cantores</button>' +
        (rec.length ? secao('Abertos recentemente', cards(rec.map(cardArtista).join(''), true)) : '') +
        (pls && pls.length ? secao('Navegar: playlists gospel', cards(pls.map(cardPlaylist).join(''))) : '') + '</div>';
    }
    var abas = [['tudo', 'Tudo'], ['artistas', 'Artistas'], ['musicas', 'Músicas'], ['albuns', 'Álbuns'], ['playlists', 'Playlists']];
    var h = '<div class="mus-pad"><div class="mus-chips rolagem">' + abas.map(function (a) { return '<button class="mus-chip' + (aba === a[0] ? ' on' : '') + '" data-a="aba" data-v="' + a[0] + '">' + a[1] + '</button>'; }).join('') + '</div>';
    var art = D.artistas(q);
    var artOrd = art && art.slice().sort(function (a, b) { return (b.nb_fan || 0) - (a.nb_fan || 0); });
    if (aba === 'tudo') {
      var fx = D.faixas(q), alb = D.albuns(q), pls2 = D.playlists(q), top = artOrd && artOrd[0];
      // Melhor resultado: o cantor, se a busca for nome de cantor; senão, a 1ª MÚSICA (ex.: "eu vou orar")
      var cantorBate = top && (norm(top.name).indexOf(norm(q)) >= 0 || norm(q).indexOf(norm(top.name)) >= 0);
      var fx0 = fx && fx[0] ? fz(fx[0]) : null;
      var melhor;
      if (art === undefined || (!cantorBate && fx === undefined)) melhor = carregando('Buscando…');
      else if (cantorBate || (top && !fx0)) melhor = '<button class="mus-top" data-a="ir" data-r="' + reg({ v: 'artista', id: top.id }) + '">' + capa(top.picture_medium, 'mus-topimg', true) + '<b>' + esc(top.name) + '</b><span class="mus-tag">Artista</span>' + (top.nb_fan ? '<small>' + fas(top.nb_fan) + '</small>' : '') + '</button>';
      else if (fx0) melhor = '<div class="mus-top" data-a="tocar" data-r="' + reg([fx0]) + '" data-i="0" role="button">' + capa(fx0.capa, 'mus-topimg') + '<b>' + esc(fx0.titulo) + '</b><span class="mus-tag">Música</span><small>' + esc(fx0.artista || '') + '</small><span class="mus-cardplay sempre">' + ic('play', 20, true) + '</span></div>';
      else melhor = '<p class="mus-sub">Nada encontrado com esse nome.</p>';
      h += '<div class="mus-tudo">' + secao('Melhor resultado', melhor) +
        secao('Músicas', fx === undefined ? carregando() : linhas(fx.slice(0, 4).map(function (f) { return fz(f); }), { semAlbum: true })) + '</div>';
      if (artOrd && artOrd.length > 1) h += secao('Artistas', cards(artOrd.slice(1, 9).map(cardArtista).join(''), true, true));
      if (alb && alb.length) h += secao('Álbuns', cards(alb.slice(0, 10).map(function (a) { return cardAlbum(a); }).join(''), false, true));
      if (pls2 && pls2.length) h += secao('Playlists', cards(pls2.slice(0, 10).map(cardPlaylist).join(''), false, true));
    } else if (aba === 'artistas') h += art === undefined ? carregando() : cards((artOrd || []).map(cardArtista).join(''), true);
    else if (aba === 'musicas') { var f2 = D.faixas(q); h += f2 === undefined ? carregando() : linhas(f2.map(function (f) { return fz(f); })); }
    else if (aba === 'albuns') { var a2 = D.albuns(q); h += a2 === undefined ? carregando() : cards(a2.map(function (a) { return cardAlbum(a); }).join('')); }
    else if (aba === 'playlists') { var p2 = D.playlists(q); h += p2 === undefined ? carregando() : cards(p2.map(cardPlaylist).join('')); }
    return h + '</div>';
  }

  function vBiblioteca() {
    return '<div class="mus-pad"><div class="mus-bibtit grande">Sua biblioteca<span class="mus-gap"></span><button class="mus-ic" data-a="criar" aria-label="Criar">' + ic('mais', 24) + '</button></div>' +
      '<div class="mus-chips">' + chipBib('playlists', 'Playlists') + chipBib('artistas', 'Artistas') + '</div>' +
      '<div class="mus-biblista larga">' + listaBib(rota()) + '</div>' +
      '<button class="mus-pill" data-a="ir" data-r="' + reg({ v: 'escolher' }) + '">' + ic('estrela', 16) + ' Escolher cantores</button></div>';
  }

  function vCantor(nome) {
    var a = cantorPeloNome(nome);
    if (a === undefined) return '<div class="mus-pad">' + carregando() + '</div>';
    if (!a) return '<div class="mus-pad"><p class="mus-sub">Não achei “' + esc(nome) + '”.</p></div>';
    return vArtista(a.id);
  }

  var querRadio = 0;
  function vArtista(id) {
    var a = D.artista(id), top = D.top(id), discos = D.discos(id), rel = D.parecidos(id);
    if (a === undefined) return '<div class="mus-pad">' + carregando() + '</div>';
    if (!a) return '<div class="mus-pad"><p class="mus-sub">Não consegui abrir este cantor (sem internet?).</p></div>';
    lembrar(a);
    var cds = D.cds(a.name);
    var pop = (top || []).map(function (f) { return fz(f); });
    var segue = seguindo(a.id);
    if (querRadio === id) {
      var rad = D.radio(id);
      if (rad !== undefined) { querRadio = 0; if (rad.length) { setTimeout(function () { tocarLista(rad.map(function (f) { return fz(f); }), 0); aviso('Rádio de ' + a.name + ': músicas parecidas, sem parar'); }, 0); } else aviso('Sem rádio pra este cantor'); }
    }
    var mostra = rota().mais ? pop : pop.slice(0, 5);
    var abaD = rota().aba || 'album';
    var filt = (discos || []).filter(function (d) { return abaD === 'todos' || (abaD === 'album' ? d.record_type === 'album' || d.record_type === 'compile' : d.record_type === 'single' || d.record_type === 'ep'); });
    var h = '<header class="mus-arthero" style="background-image:url(&quot;' + esc(a.picture_xl) + '&quot;)"><div class="mus-arttxt"><span class="mus-tipo">Artista</span><h1 class="mus-titulo art' + (a.name.length > 20 ? ' longo' : '') + '">' + esc(a.name) + '</h1><span class="mus-meta">' + fas(a.nb_fan) + (a.nb_album ? ' · ' + a.nb_album + ' lançamentos' : '') + '</span></div></header>';
    h += acoes(pop, '<button class="mus-pill' + (segue ? ' on' : '') + '" data-a="seguir" data-r="' + reg(a) + '">' + (segue ? 'Seguindo' : 'Seguir') + '</button>' +
      '<button class="mus-pill" data-a="radio" data-v="' + a.id + '">' + (querRadio === id ? 'Montando…' : ic('radio', 16) + ' Rádio') + '</button>');
    h += '<div class="mus-pad sem-topo">';
    h += secao('Populares', top === undefined ? carregando() : !pop.length ? '<p class="mus-sub">Sem músicas populares.</p>' : linhas(mostra) + (pop.length > 5 ? '<button class="mus-vermais" data-a="mais">' + (rota().mais ? 'Mostrar menos' : 'Ver mais') + '</button>' : ''));
    h += secao('Discografia', '<div class="mus-chips">' + [['album', 'Álbuns'], ['single', 'Singles e EPs'], ['todos', 'Todos']].map(function (x) { return '<button class="mus-chip' + (abaD === x[0] ? ' on' : '') + '" data-a="abadisco" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (discos === undefined ? carregando() : !filt.length ? '<p class="mus-sub">Nada aqui.</p>' : cards(filt.map(function (d) { return cardAlbum(d, ano(d.release_date) + ' · ' + tipoDisco(d.record_type)); }).join(''))));
    if (cds && cds.length) {
      var lcd = cds.map(function (v) { return fyt(v, a.name); }), rcd = reg(lcd);
      h += secao('CDs e LPs completos no YouTube', '<div class="mus-cards largo">' + cds.map(function (v, i) {
        var t = 'data-a="tocar" data-r="' + rcd + '" data-i="' + i + '"';
        return '<div class="mus-card yt" ' + t + ' role="button"><div class="mus-ytimg"><img src="' + esc(v.thumb) + '" alt="" loading="lazy"><span>' + tempo(v.dur) + '</span><span class="mus-cardplay sempre">' + ic('play', 20, true) + '</span></div><b>' + esc(v.titulo) + '</b><small>' + esc(v.canal) + '</small></div>';
      }).join('') + '</div>', null, 'Discos inteiros (bom pros LPs antigos que não estão na lista acima).');
    }
    if (rel && rel.length) h += secao('Fãs também curtem', cards(rel.map(cardArtista).join(''), true, true));
    return h + '</div>';
  }

  function vAlbum(id) {
    var a = D.album(id), fx = D.faixasAlbum(id);
    if (a === undefined) return '<div class="mus-pad">' + carregando() + '</div>';
    if (!a) return '<div class="mus-pad"><p class="mus-sub">Não consegui abrir este disco (sem internet?).</p></div>';
    var lst = (fx || []).map(function (f) { return fz(f, a); });
    var tot = lst.reduce(function (s, f) { return s + (f.dur || 0); }, 0);
    var h = hero({ capa: a.cover_xl, tipo: tipoDisco(a.record_type), titulo: a.title, sub: (a.artist ? '<button class="mus-link" data-a="ir" data-r="' + reg({ v: 'artista', id: a.artist.id }) + '"><b>' + esc(a.artist.name) + '</b></button> · ' : '') + ano(a.release_date) + ' · ' + qtd(lst.length || a.nb_tracks) + (tot ? ', ' + total(tot) : '') });
    h += acoes(lst, lst.length ? '<button class="mus-pill" data-a="salvarlista" data-r="' + reg({ nome: a.title, itens: lst }) + '">' + ic('mais', 16) + ' Salvar na biblioteca</button>' : '');
    h += fx === undefined ? carregando() : linhas(lst, { semCapa: true, semAlbum: true, num: function (f, i) { return (fx[i] && fx[i].track_position) || i + 1; } });
    return h;
  }

  function vPlaylistDz(id) {
    var p = D.playlist(id), fx = D.faixasPlaylist(id);
    if (p === undefined) return '<div class="mus-pad">' + carregando() + '</div>';
    if (!p) return '<div class="mus-pad"><p class="mus-sub">Não consegui abrir esta playlist (sem internet?).</p></div>';
    var lst = (fx || []).map(function (f) { return fz(f); });
    var tot = lst.reduce(function (s, f) { return s + (f.dur || 0); }, 0);
    var h = hero({ capa: p.picture_xl, tipo: 'Playlist', titulo: p.title, sub: (p.description ? '<span class="mus-desc">' + esc(p.description) + '</span><br>' : '') + '<b>' + esc((p.user && p.user.name) || 'Deezer') + '</b> · ' + qtd(lst.length || p.nb_tracks) + (tot ? ', cerca de ' + total(tot) : '') });
    h += acoes(lst, lst.length ? '<button class="mus-pill" data-a="salvarlista" data-r="' + reg({ nome: p.title, itens: lst }) + '">' + ic('mais', 16) + ' Salvar na biblioteca</button>' : '');
    return h + (fx === undefined ? carregando() : linhas(lst));
  }

  function vTop() {
    var top = D.topGospel(), lst = (top || []).map(function (f) { return fz(f); });
    return hero({ capa: top && top[0] && top[0].album && top[0].album.cover_xl, tipo: 'Parada', titulo: 'Top Gospel do Brasil', sub: '<b>Deezer</b> · as mais tocadas agora · ' + qtd(lst.length) }) + acoes(lst) + (top === undefined ? carregando() : linhas(lst));
  }

  function vCurtidas() {
    var lst = bib.curtidas;
    return hero({ curtidas: 1, tipo: 'Playlist', titulo: 'Músicas curtidas', sub: '<b>Você</b> · ' + qtd(lst.length) }) + acoes(lst) +
      (lst.length ? linhas(lst) : '<div class="mus-vazio"><b>As músicas que você curtir aparecem aqui.</b><span>Toque no coração de qualquer música.</span></div>');
  }

  function vMinha(id) {
    var p = bib.playlists.filter(function (x) { return x.id === id; })[0];
    if (!p) return '<div class="mus-pad"><p class="mus-sub">Esta playlist foi apagada.</p></div>';
    var tot = p.itens.reduce(function (s, f) { return s + (f.dur || 0); }, 0), rp = reg(p);
    return hero({ capa: (p.itens.filter(function (i) { return i.capa; })[0] || {}).capa, tipo: 'Playlist', titulo: p.nome, editar: 'renomearpl', r: rp, sub: '<b>Você</b> · ' + qtd(p.itens.length) + (tot ? ', cerca de ' + total(tot) : '') }) +
      acoes(p.itens, '<button class="mus-ic" data-a="menupl" data-r="' + rp + '" aria-label="Opções da playlist">' + ic('pontos', 26) + '</button>') +
      (p.itens.length ? linhas(p.itens, { playlist: p.id }) : '<div class="mus-vazio"><b>Playlist vazia.</b><span>Em qualquer música, toque em ⋯ → Adicionar à playlist.</span><button class="mus-pill" data-a="nav" data-v="busca">Buscar músicas</button></div>');
  }

  function vPasta(id) {
    var pa = bib.pastas.filter(function (x) { return x.id === id; })[0];
    if (!pa) return '<div class="mus-pad"><p class="mus-sub">Esta pasta foi apagada.</p></div>';
    var dentro = bib.playlists.filter(function (p) { return p.pasta === id; }), rp = reg(pa);
    return hero({ pasta: 1, tipo: 'Pasta', titulo: pa.nome, editar: 'renomearpasta', r: rp, sub: qtd(dentro.length, 'playlist', 'playlists') }) +
      '<div class="mus-acoes"><button class="mus-pill" data-a="novaplaylist" data-v="' + esc(id) + '">' + ic('mais', 16) + ' Nova playlist aqui</button><button class="mus-pill" data-a="renomearpasta" data-r="' + rp + '">' + ic('editar', 16) + ' Renomear</button><button class="mus-pill perigo" data-a="apagarpasta" data-r="' + rp + '">' + ic('lixo', 16) + ' Apagar pasta</button></div>' +
      '<div class="mus-pad sem-topo">' + (dentro.length ? cards(dentro.map(function (p) { return card((p.itens.filter(function (i) { return i.capa; })[0] || {}).capa, p.nome, 'Playlist · ' + qtd(p.itens.length), 'data-a="ir" data-r="' + reg({ v: 'minha', id: p.id }) + '"'); }).join('')) : '<p class="mus-sub">Pasta vazia. Crie uma playlist aqui ou mova uma (⋯ da playlist → Mover para a pasta).</p>') + '</div>';
  }

  function vEscolher() {
    var q = termoEsc.trim();
    var est = ESTILOS.filter(function (e) { return e.id === estiloSel; })[0];
    var nomes = estiloSel === 'todos' ? ESTILOS.reduce(function (l, e) { return l.concat(e.c); }, []) : (est ? est.c : []);
    nomes = nomes.filter(function (n, i) { return nomes.indexOf(n) === i; });
    var busca = q.length >= 2 ? D.artistas(q) : null;
    var lst = busca ? (busca || []).slice(0, 20) : nomes.map(function (n) { return cantorPeloNome(n); });
    var n = bib.seguidos.length;
    return '<div class="mus-escolher"><h1 class="mus-esctit">Escolha seus cantores</h1><p class="mus-sub">Toque na foto pra seguir. Eles aparecem no Início e na sua biblioteca.</p>' +
      '<label class="mus-escbusca">' + ic('lupa', 18) + '<input id="mus-qesc" value="' + esc(termoEsc) + '" placeholder="Buscar cantor" autocomplete="off" spellcheck="false"></label>' +
      (busca ? '' : '<div class="mus-chips rolagem">' + [{ id: 'todos', nome: 'Todos' }].concat(ESTILOS).map(function (e) { return '<button class="mus-chip' + (estiloSel === e.id ? ' on' : '') + '" data-a="estilo" data-v="' + e.id + '">' + esc(e.nome) + '</button>'; }).join('') + '</div>') +
      (busca === undefined ? carregando('Buscando…') : '<div class="mus-cards artistas escolher">' + lst.map(function (a) {
        if (a === undefined) return '<div class="mus-card esqueleto"><div class="mus-cardimg redondo"></div><b>&nbsp;</b></div>';
        if (!a) return '';
        var on = seguindo(a.id);
        return '<button class="mus-card mus-escit' + (on ? ' on' : '') + '" data-a="seguir" data-r="' + reg(a) + '"><div class="mus-cardimgw">' + capa(a.picture_medium, 'mus-cardimg', true) + (on ? '<span class="mus-escok">' + ic('ok', 30) + '</span>' : '') + '</div><b>' + esc(a.name) + '</b></button>';
      }).join('') + '</div>') +
      '<div class="mus-escpe"><div class="mus-escprog"><span style="width:' + Math.min(100, n * 10) + '%"></span></div><span class="mus-escn">' + qtd(n, 'cantor', 'cantores') + '</span><button class="mus-grandetxt" data-a="nav" data-v="inicio"' + (n ? '' : ' disabled') + '>Pronto ' + ic('dir', 18) + '</button></div></div>';
  }
  var termoEsc = '';

  // ───────────────────────── barra, mini vídeo, tocando agora ─────────────────────────
  function barra() {
    if (!montado) return;
    var b = document.getElementById('mus-barra'), f = P.atual;
    raiz.classList.toggle('tem-musica', !!f);
    if (!f) { b.innerHTML = ''; return; }
    var sub = P.carregando ? 'carregando…' : P.falhou ? 'não consegui tocar esta' : P.emPrevia ? 'prévia de 30 s · ' + (f.artista || '') : (f.artista || '');
    b.innerHTML =
      '<div class="mus-bagora" data-a="agora">' + capa(f.capa, 'mus-bcapa') + '<span class="mus-ttx"><span class="mus-nome">' + esc(f.titulo) + '</span><span class="mus-art">' + esc(sub) + '</span></span></div>' +
      '<button class="mus-cor' + (curtido(f.k) ? ' on' : '') + '" data-a="curtir" data-r="' + reg(f) + '" aria-label="Curtir">' + ic('cor', 20, curtido(f.k)) + '</button>' +
      '<div class="mus-bctl">' +
        '<button class="mus-ic so-larga' + (P.aleatorio ? ' on' : '') + '" data-a="aleatorio" aria-label="Aleatório">' + ic('aleat', 18) + '</button>' +
        '<button class="mus-ic so-larga" data-a="anterior" aria-label="Anterior">' + ic('ant', 20, true) + '</button>' +
        '<button class="mus-play" data-a="alternar" aria-label="' + (P.tocando ? 'Pausar' : 'Tocar') + '">' + ic(P.tocando ? 'pausa' : 'play', 20, true) + '</button>' +
        '<button class="mus-ic" data-a="proxima" aria-label="Próxima">' + ic('prox', 20, true) + '</button>' +
        '<button class="mus-ic so-larga' + (P.repetir !== 'nao' ? ' on' : '') + '" data-a="repetir" aria-label="Repetir">' + ic('rep', 18) + (P.repetir === 'uma' ? '<em>1</em>' : '') + '</button>' +
      '</div>' +
      '<div class="mus-bdir so-larga"><button class="mus-pararsuave" data-a="pararsuave">Parar suave</button><button class="mus-ic' + (P.suave ? ' on' : '') + '" data-a="suave" aria-label="Transição suave">' + ic('onda', 18) + '</button><button class="mus-ic" data-a="fila" aria-label="Fila">' + ic('fila', 18) + '</button><input type="range" min="0" max="100" value="' + P.vol + '" data-a="vol" aria-label="Volume" style="--pct:' + P.vol + '%"></div>' +
      '<div class="mus-bprog"><span id="mus-bprog" style="width:' + (P.dur ? (P.t / P.dur) * 100 : 0) + '%"></span></div>';
  }
  function barraTempo() {
    var s = document.getElementById('mus-bprog'); if (s) s.style.width = (P.dur ? (P.t / P.dur) * 100 : 0) + '%';
    var r = document.getElementById('mus-agprog'); if (r && document.activeElement !== r) { r.max = Math.max(1, Math.floor(P.dur)); r.value = Math.floor(P.t); r.style.setProperty('--pct', (P.dur ? (P.t / P.dur) * 100 : 0) + '%'); }
    var a = document.getElementById('mus-agt'); if (a) a.textContent = tempo(P.t);
    var d = document.getElementById('mus-agd'); if (d) d.textContent = tempo(P.dur);
  }
  function abrirMini() { var b = document.getElementById('mus-ytbox'); if (b) b.classList.add('ligado'); }
  function fecharMini() { var b = document.getElementById('mus-ytbox'); if (b) b.classList.remove('ligado', 'grande'); }
  // grande na aba Vídeo do 'Tocando agora'; no canto (sempre visível) nas abas Letra/Fila e fora dela
  function pintarVideo() { var b = document.getElementById('mus-ytbox'); if (!b) return; b.classList.toggle('grande', agoraAberto && abaAgora === 'video'); b.classList.toggle('canto', agoraAberto && abaAgora !== 'video'); }
  var agoraAberto = false, abaAgora = 'video';
  function abrirAgora() { if (!P.atual) return; agoraAberto = true; abrirJanela('agora'); document.getElementById('mus-agora').classList.add('aberto'); renderAgora(); pintarVideo(); }
  function renderAgora() {
    if (!montado || !agoraAberto) return;
    var el = document.getElementById('mus-agora'), f = P.atual;
    if (!f) { el.innerHTML = ''; return; }
    var letra = letraDe(f.titulo);
    var corpo;
    if (abaAgora === 'letra') {
      corpo = '<div class="mus-agletra">' + (letra === undefined ? carregando() : letra ? (letra.e || []).map(function (e, i) { return '<p class="mus-estrofe">' + esc(e).replace(/\s*\n\s*/g, '<br>') + '</p>' + (i === 0 && letra.c ? '<p class="mus-estrofe coro">' + esc(letra.c).replace(/\s*\n\s*/g, '<br>') + '</p>' : ''); }).join('') : '<p class="mus-sub">A letra aparece aqui quando a música é um hino da Harpa Cristã.</p>') + '</div>';
    } else if (abaAgora === 'fila') {
      var prox = P.fila.slice(P.i + 1, P.i + 60), rf = reg(P.fila);
      corpo = '<div class="mus-agfila"><h4>Tocando agora</h4>' + filaItem(f, P.i, rf, true) + (prox.length ? '<h4>A seguir</h4>' + prox.map(function (x, j) { return filaItem(x, P.i + 1 + j, rf); }).join('') : '<p class="mus-sub">Nada na fila depois desta.</p>') + '</div>';
    } else corpo = '<div class="mus-agvideo-lugar"></div>';
    el.style.setProperty('--fundo', f.capaG || f.capa ? 'url("' + (f.capaG || f.capa) + '")' : 'none');
    el.innerHTML =
      '<div class="mus-agtopo"><button class="mus-ic" data-a="fecharjanela" aria-label="Fechar">' + ic('baixo', 26) + '</button><span>Tocando agora</span><button class="mus-ic" data-a="menu" data-r="' + reg(f) + '" aria-label="Mais opções">' + ic('pontos', 24) + '</button></div>' +
      '<div class="mus-agabas"><button class="' + (abaAgora === 'video' ? 'on' : '') + '" data-a="abaagora" data-v="video">Vídeo</button><button class="' + (abaAgora === 'letra' ? 'on' : '') + '" data-a="abaagora" data-v="letra">Letra</button><button class="' + (abaAgora === 'fila' ? 'on' : '') + '" data-a="abaagora" data-v="fila">Fila</button></div>' +
      '<div class="mus-agcorpo">' + corpo + '</div>' +
      '<div class="mus-aginfo"><span class="mus-ttx"><span class="mus-nome g">' + esc(f.titulo) + '</span><button class="mus-link mus-art" data-a="ir" data-r="' + reg(f.artistaId ? { v: 'artista', id: f.artistaId } : { v: 'cantor', nome: f.artista || '' }) + '">' + esc(P.carregando ? 'carregando…' : f.artista || '') + '</button></span><button class="mus-cor' + (curtido(f.k) ? ' on' : '') + '" data-a="curtir" data-r="' + reg(f) + '" aria-label="Curtir">' + ic('cor', 26, curtido(f.k)) + '</button></div>' +
      '<div class="mus-agprogw"><input id="mus-agprog" type="range" min="0" max="' + Math.max(1, Math.floor(P.dur)) + '" value="' + Math.floor(P.t) + '" data-a="seek" style="--pct:' + (P.dur ? (P.t / P.dur) * 100 : 0) + '%" aria-label="Posição"><div class="mus-agtempos"><span id="mus-agt">' + tempo(P.t) + '</span><span id="mus-agd">' + tempo(P.dur) + '</span></div></div>' +
      '<div class="mus-agctl"><button class="mus-ic' + (P.aleatorio ? ' on' : '') + '" data-a="aleatorio" aria-label="Aleatório">' + ic('aleat', 24) + '</button><button class="mus-ic" data-a="anterior" aria-label="Anterior">' + ic('ant', 30, true) + '</button><button class="mus-play g" data-a="alternar" aria-label="' + (P.tocando ? 'Pausar' : 'Tocar') + '">' + ic(P.tocando ? 'pausa' : 'play', 30, true) + '</button><button class="mus-ic" data-a="proxima" aria-label="Próxima">' + ic('prox', 30, true) + '</button><button class="mus-ic' + (P.repetir !== 'nao' ? ' on' : '') + '" data-a="repetir" aria-label="Repetir">' + ic('rep', 24) + (P.repetir === 'uma' ? '<em>1</em>' : '') + '</button></div>' +
      '<div class="mus-agbaixo"><button class="mus-pararsuave" data-a="pararsuave">' + ic('parar', 14) + ' Parar suave</button><button class="mus-pill' + (P.suave ? ' on' : '') + '" data-a="suave">' + ic('onda', 16) + ' Transição suave</button></div>';
  }
  function filaItem(f, idx, rf, atual) {
    return '<div class="mus-filait' + (atual ? ' on' : '') + '" data-a="' + (atual ? '' : 'tocar') + '" data-r="' + rf + '" data-i="' + idx + '">' + capa(f.capa, 'mus-thumb') + '<span class="mus-ttx"><span class="mus-nome">' + esc(f.titulo) + '</span><span class="mus-art">' + esc(f.artista || '') + '</span></span>' + (atual ? '' : '<button class="mus-pts" data-a="tirarfila" data-v="' + idx + '" aria-label="Tirar da fila">' + ic('x', 16) + '</button>') + '</div>';
  }
  function fecharJanelaUI(j) {
    if (j === 'agora') { agoraAberto = false; var a = document.getElementById('mus-agora'); if (a) a.classList.remove('aberto'); pintarVideo(); }
    if (j === 'menu' || j === 'fila') { var s = document.getElementById('mus-sheet'); if (s) { s.classList.remove('aberto'); s.innerHTML = ''; } }
    if (j === 'dlg') { var d = document.getElementById('mus-dlg'); if (d) { d.classList.remove('aberto'); d.innerHTML = ''; } dlgAcao = null; }
    var fu = document.getElementById('mus-fundo');
    if (fu) fu.classList.toggle('aberto', janelas.some(function (x) { return x === 'menu' || x === 'dlg' || x === 'fila'; }));
  }

  // ── menu (folha de baixo) ──
  function abrirMenu(f, plId) {
    var s = document.getElementById('mus-sheet');
    var on = curtido(f.k);
    var plsUsr = bib.playlists;
    s.innerHTML = '<div class="mus-shtopo">' + capa(f.capa, 'mus-thumb') + '<span class="mus-ttx"><span class="mus-nome">' + esc(f.titulo) + '</span><span class="mus-art">' + esc(f.artista || '') + '</span></span></div>' +
      opc('tocaragora', 'play', 'Tocar', f) + opc('emseguida', 'fila', 'Tocar em seguida', f) + opc('addfila', 'fila', 'Adicionar à fila', f) +
      opc('curtir', 'cor', on ? 'Remover das curtidas' : 'Salvar nas Músicas curtidas', f, on) +
      '<div class="mus-shsep">Adicionar à playlist</div>' + opc('novapl', 'mais', 'Nova playlist…', f) +
      plsUsr.map(function (p) { return '<button class="mus-opc" data-a="addpl" data-r="' + reg({ f: f, p: p.id }) + '">' + ic('nota', 18) + ' ' + esc(p.nome) + '</button>'; }).join('') +
      (plId ? '<div class="mus-shsep"></div><button class="mus-opc perigo" data-a="tirarpl" data-r="' + reg({ f: f, p: plId }) + '">' + ic('lixo', 18) + ' Remover desta playlist</button>' : '') +
      '<div class="mus-shsep"></div>' +
      (f.artista ? '<button class="mus-opc" data-a="ir" data-r="' + reg(f.artistaId ? { v: 'artista', id: f.artistaId } : { v: 'cantor', nome: f.artista }) + '">' + ic('estrela', 18) + ' Ir para o artista</button>' : '') +
      (f.albumId ? '<button class="mus-opc" data-a="ir" data-r="' + reg({ v: 'album', id: f.albumId }) + '">' + ic('nota', 18) + ' Ir para o álbum</button>' : '') +
      '<button class="mus-opc fechar" data-a="fecharjanela">Fechar</button>';
    s.classList.add('aberto'); document.getElementById('mus-fundo').classList.add('aberto');
    abrirJanela('menu');
  }
  function opc(a, icone, txt, f, cheio) { return '<button class="mus-opc" data-a="' + a + '" data-r="' + reg(f) + '">' + ic(icone, 18, cheio) + ' ' + esc(txt) + '</button>'; }
  function abrirMenuPlaylist(p) {
    var s = document.getElementById('mus-sheet');
    s.innerHTML = '<div class="mus-shtopo"><span class="mus-ttx"><span class="mus-nome">' + esc(p.nome) + '</span><span class="mus-art">Playlist · ' + qtd(p.itens.length) + '</span></span></div>' +
      '<button class="mus-opc" data-a="renomearpl" data-r="' + reg(p) + '">' + ic('editar', 18) + ' Renomear</button>' +
      '<div class="mus-shsep">Mover para a pasta</div>' +
      '<button class="mus-opc" data-a="moverpl" data-r="' + reg({ p: p.id, pasta: null }) + '">' + (!p.pasta ? '✓ ' : '') + 'Fora das pastas</button>' +
      bib.pastas.map(function (pa) { return '<button class="mus-opc" data-a="moverpl" data-r="' + reg({ p: p.id, pasta: pa.id }) + '">' + ic('pasta', 18) + ' ' + (p.pasta === pa.id ? '✓ ' : '') + esc(pa.nome) + '</button>'; }).join('') +
      '<div class="mus-shsep"></div><button class="mus-opc perigo" data-a="apagarpl" data-r="' + reg(p) + '">' + ic('lixo', 18) + ' Apagar playlist</button>' +
      '<button class="mus-opc fechar" data-a="fecharjanela">Fechar</button>';
    s.classList.add('aberto'); document.getElementById('mus-fundo').classList.add('aberto');
    abrirJanela('menu');
  }
  function abrirCriar() {
    var s = document.getElementById('mus-sheet');
    s.innerHTML = '<div class="mus-shtopo"><span class="mus-ttx"><span class="mus-nome">Criar</span></span></div>' +
      '<button class="mus-opc" data-a="novaplaylist">' + ic('nota', 18) + ' Playlist</button>' +
      '<button class="mus-opc" data-a="novapasta">' + ic('pasta', 18) + ' Pasta</button>' +
      '<button class="mus-opc" data-a="ir" data-r="' + reg({ v: 'escolher' }) + '">' + ic('estrela', 18) + ' Escolher cantores</button>' +
      '<button class="mus-opc fechar" data-a="fecharjanela">Fechar</button>';
    s.classList.add('aberto'); document.getElementById('mus-fundo').classList.add('aberto');
    abrirJanela('menu');
  }

  // ── diálogo (nome / confirmação) ──
  var dlgAcao = null;
  function dialogo(o) {
    var d = document.getElementById('mus-dlg');
    dlgAcao = o;
    d.innerHTML = '<div class="mus-dlgcx" role="dialog"><h3>' + esc(o.titulo) + '</h3>' + (o.texto ? '<p>' + esc(o.texto) + '</p>' : '') +
      (o.nome != null ? '<input id="mus-dlgin" value="' + esc(o.nome) + '" maxlength="80" autocomplete="off">' : '') +
      '<div class="mus-dlgbts"><button class="mus-dlgnao" data-a="fecharjanela">Cancelar</button><button class="mus-dlgsim' + (o.perigo ? ' perigo' : '') + '" data-a="dlgok">' + esc(o.ok || 'OK') + '</button></div></div>';
    d.classList.add('aberto'); document.getElementById('mus-fundo').classList.add('aberto');
    abrirJanela('dlg');
    setTimeout(function () { var i = document.getElementById('mus-dlgin'); if (i) { i.focus(); i.select(); } }, 80);
  }
  function confirmarDlg() {
    var o = dlgAcao; if (!o) return;
    var v = o.nome != null ? (document.getElementById('mus-dlgin') || {}).value || '' : '';
    fecharJanela();
    setTimeout(function () { o.fn(String(v).trim()); }, 30);
  }

  // ── criar/editar biblioteca ──
  function novaPlaylist(pasta, comFaixa) {
    dialogo({ titulo: 'Nova playlist', nome: 'Minha playlist nº ' + (bib.playlists.length + 1), ok: 'Criar', fn: function (v) {
      var id = novoId();
      bib.playlists.push({ id: id, nome: v || 'Nova playlist', pasta: pasta || null, itens: comFaixa ? [limpa(comFaixa)] : [], criada: Date.now() });
      salvarBib();
      if (comFaixa) { aviso('Adicionada em “' + (v || 'Nova playlist') + '”'); render(); } else ir({ v: 'minha', id: id });
    } });
  }
  function salvarComoPlaylist(nome, itens) {
    var id = novoId();
    bib.playlists.push({ id: id, nome: nome, pasta: null, itens: itens.map(limpa), criada: Date.now() });
    salvarBib(); aviso('Salva na sua biblioteca'); ir({ v: 'minha', id: id });
  }

  // ───────────────────────── cliques ─────────────────────────
  function clique(e) {
    var el = e.target.closest('[data-a]'); if (!el || !raiz.contains(el)) return;
    var a = el.getAttribute('data-a'); if (!a) return;
    var v = el.getAttribute('data-v'), r = REG[el.getAttribute('data-r')], i = parseInt(el.getAttribute('data-i') || '0', 10);
    if (el.tagName === 'INPUT') return;
    e.stopPropagation();
    switch (a) {
      case 'sair': sairDaTela(); break;
      case 'voltar': voltar(); break;
      case 'irbusca': ir({ v: 'busca' }); break;
      case 'nav': if (rota().v !== v) { if (v === 'inicio') { pilha = [{ v: 'inicio' }].concat(pilha.slice(1, pos + 1)); } ir({ v: v }); } break;
      case 'ir': if (janelas.length) { var alvo = r; fecharTodasJanelas(function () { ir(alvo); }); } else ir(r); break;
      case 'tema': seguro(function () { localStorage.setItem(LS_TEMA, v); }); render(); break;
      case 'filtrobib': filtroBib = filtroBib === v ? 'tudo' : v; render(); break;
      case 'aba': aba = v; render(); break;
      case 'abadisco': rota().aba = v; render(); break;
      case 'mais': rota().mais = !rota().mais; render(); break;
      case 'estilo': estiloSel = v; render(); break;
      case 'tocar': if (r && r[i]) { if (P.atual && P.atual.k === r[i].k && P.fila === r) alternar(); else if (P.atual && P.atual.k === r[i].k) alternar(); else tocarLista(r, i); } break;
      case 'tocarlista': if (r && r.length) { if (P.atual && r.some(function (f) { return f.k === P.atual.k; })) alternar(); else tocarLista(r); } break;
      case 'alternar': alternar(); break;
      case 'proxima': proxima(); break;
      case 'anterior': anterior(); break;
      case 'aleatorio': P.aleatorio = !P.aleatorio; barra(); render(); renderAgora(); break;
      case 'repetir': P.repetir = P.repetir === 'nao' ? 'todas' : P.repetir === 'todas' ? 'uma' : 'nao'; barra(); renderAgora(); aviso(P.repetir === 'uma' ? 'Repetir esta música' : P.repetir === 'todas' ? 'Repetir a lista' : 'Sem repetir'); break;
      case 'suave': P.suave = !P.suave; seguro(function () { localStorage.setItem(LS_SUAVE, P.suave ? '1' : '0'); }); barra(); renderAgora(); aviso(P.suave ? 'Transição suave ligada' : 'Transição suave desligada'); break;
      case 'pararsuave': pararSuave(); if (agoraAberto) fecharJanela(); break;
      case 'agora': abrirAgora(); break;
      case 'abaagora': abaAgora = v; renderAgora(); pintarVideo(); break;
      case 'fila': abaAgora = 'fila'; abrirAgora(); break;
      case 'tirarfila': var ix = parseInt(v, 10); if (ix > P.i) { P.fila.splice(ix, 1); renderAgora(); } break;
      case 'curtir': if (r) alternarCurtida(r); renderAgora(); break;
      case 'seguir': if (r) { var era = seguindo(r.id); alternarSeguir(r); aviso(era ? 'Deixou de seguir ' + r.name : 'Seguindo ' + r.name); } break;
      case 'radio': querRadio = parseInt(v, 10); render(); break;
      case 'menu': if (r) abrirMenu(r, el.getAttribute('data-pl')); break;
      case 'menupl': if (r) abrirMenuPlaylist(r); break;
      case 'criar': abrirCriar(); break;
      case 'fecharjanela': fecharJanela(); break;
      case 'tocaragora': fecharJanela(); tocarLista([r], 0); break;
      case 'emseguida': fecharJanela(); tocarEmSeguida(r); break;
      case 'addfila': fecharJanela(); addFila(r); break;
      case 'novapl': fecharJanela(); setTimeout(function () { novaPlaylist(null, r); }, 60); break;
      case 'addpl': fecharJanela(); (function () { var p = bib.playlists.filter(function (x) { return x.id === r.p; })[0]; if (!p) return; if (p.itens.some(function (x) { return x.k === r.f.k; })) { aviso('Já estava em “' + p.nome + '”'); return; } p.itens.push(limpa(r.f)); salvarBib(); aviso('Adicionada em “' + p.nome + '”'); render(); })(); break;
      case 'tirarpl': fecharJanela(); (function () { var p = bib.playlists.filter(function (x) { return x.id === r.p; })[0]; if (!p) return; p.itens = p.itens.filter(function (x) { return x.k !== r.f.k; }); salvarBib(); aviso('Removida desta playlist'); render(); })(); break;
      case 'novaplaylist': if (janelas.length) { fecharJanela(); setTimeout(function () { novaPlaylist(v || null); }, 60); } else novaPlaylist(v || null); break;
      case 'novapasta': fecharJanela(); setTimeout(function () { dialogo({ titulo: 'Nova pasta', nome: 'Nova pasta', ok: 'Criar', fn: function (n) { var id = novoId(); bib.pastas.push({ id: id, nome: n || 'Nova pasta' }); salvarBib(); ir({ v: 'pasta', id: id }); } }); }, 60); break;
      case 'renomearpl': if (janelas.length) fecharJanela(); setTimeout(function () { dialogo({ titulo: 'Renomear playlist', nome: r.nome, ok: 'Salvar', fn: function (n) { if (n) { r.nome = n; salvarBib(); render(); } } }); }, janelas.length ? 60 : 0); break;
      case 'renomearpasta': dialogo({ titulo: 'Renomear pasta', nome: r.nome, ok: 'Salvar', fn: function (n) { if (n) { r.nome = n; salvarBib(); render(); } } }); break;
      case 'moverpl': fecharJanela(); (function () { var p = bib.playlists.filter(function (x) { return x.id === r.p; })[0]; if (p) { p.pasta = r.pasta; salvarBib(); aviso(r.pasta ? 'Movida para a pasta' : 'Tirada da pasta'); render(); } })(); break;
      case 'apagarpl': fecharJanela(); setTimeout(function () { dialogo({ titulo: 'Apagar a playlist?', texto: '“' + r.nome + '” some da sua biblioteca.', ok: 'Apagar', perigo: 1, fn: function () { bib.playlists = bib.playlists.filter(function (x) { return x.id !== r.id; }); salvarBib(); aviso('Playlist apagada'); voltar(); } }); }, 60); break;
      case 'apagarpasta': dialogo({ titulo: 'Apagar a pasta?', texto: 'Só a pasta “' + r.nome + '” some — as playlists dela continuam na biblioteca.', ok: 'Apagar', perigo: 1, fn: function () { bib.pastas = bib.pastas.filter(function (x) { return x.id !== r.id; }); bib.playlists.forEach(function (p) { if (p.pasta === r.id) p.pasta = null; }); salvarBib(); aviso('Pasta apagada'); voltar(); } }); break;
      case 'salvarlista': if (r) salvarComoPlaylist(r.nome, r.itens); break;
      case 'dlgok': confirmarDlg(); break;
    }
  }
  function fecharTodasJanelas(depois) {
    var n = janelas.length; if (!n) { depois(); return; }
    janelas.slice().forEach(fecharJanelaUI); janelas = [];
    fecharJanelaUI('agora'); fecharJanelaUI('menu'); fecharJanelaUI('dlg');
    // tira as entradas das janelas do histórico sem mudar de página
    var conta = n, ouv = function () { conta--; if (conta <= 0) { window.removeEventListener('popstate', ouv); depois(); } };
    window.addEventListener('popstate', ouv);
    seguro(function () { history.go(-n); });
    setTimeout(function () { if (conta > 0) { window.removeEventListener('popstate', ouv); depois(); } }, 600);
  }
  var tBusca = 0, tEsc = 0;
  function digitou(e) {
    var t = e.target;
    if (t.id === 'mus-q') { clearTimeout(tBusca); tBusca = setTimeout(function () { termo = t.value; aba = aba || 'tudo'; var foco = document.activeElement === t; renderSoMain(); if (foco) seguro(function () { t.focus(); }); }, 350); }
    else if (t.id === 'mus-qesc') { clearTimeout(tEsc); var pos0 = t.selectionStart; tEsc = setTimeout(function () { termoEsc = t.value; render(); var n = document.getElementById('mus-qesc'); if (n) { n.focus(); seguro(function () { n.setSelectionRange(pos0, pos0); }); } }, 400); }
    else if (t.getAttribute('data-a') === 'vol') { volume(+t.value); t.style.setProperty('--pct', t.value + '%'); }
    else if (t.getAttribute('data-a') === 'seek') { t.style.setProperty('--pct', (t.value / Math.max(1, t.max)) * 100 + '%'); }
  }
  function mudou(e) { var t = e.target; if (t.getAttribute('data-a') === 'seek') irPara(+t.value); }
  /** na busca, só a área de resultados muda — o campo de texto não perde o foco */
  function renderSoMain() {
    if (!montado) return;
    REG = {}; regN = 0;
    main.innerHTML = rota().v === 'busca' ? vBusca() : '';
    renderLado(rota()); renderNav(rota()); barra();
  }

  // ── aviso rápido ──
  var tAviso = 0;
  function aviso(t) {
    var a = document.getElementById('mus-aviso'); if (!a) return;
    a.textContent = t; a.classList.add('aberto');
    clearTimeout(tAviso); tAviso = setTimeout(function () { a.classList.remove('aberto'); }, 2400);
  }

  // ───────────────────────── entrada pública ─────────────────────────
  window.abrirMusicas = function () {
    lerBib(); montar(); lerNuvem();
    if (typeof window.ocultarTodas === 'function') window.ocultarTodas();
    var t = document.getElementById('tela-musicas'); if (t) t.classList.add('ativa');
    seguro(function () { window.scrollTo(0, 0); });
    pilha = [{ v: 'inicio' }]; pos = 0; janelas = [];
    render(true); barra();
  };
  // Saiu da tela de músicas (botão ‹ ou voltar do celular) -> a música PAUSA. O player do
  // YouTube só pode tocar visível, e fora daqui ele ficaria escondido e sem controle.
  // Ao voltar pra tela, é só tocar no play da barra que continua de onde parou.
  (function () {
    function observar() {
      var t = document.getElementById('tela-musicas'); if (!t) return;
      new MutationObserver(function () {
        if (!t.classList.contains('ativa') && P.tocando) { if (P.emPrevia && aud) aud.pause(); else if (yt && ytPronto) seguro(function () { yt.pauseVideo(); }); }
      }).observe(t, { attributes: true, attributeFilter: ['class'] });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observar); else observar();
  })();
  // outros players do RADAR pausam a música
  window.radarPausarMusica = function () { if (aud && !aud.paused) aud.pause(); if (yt && ytPronto && P.tocando) seguro(function () { yt.pauseVideo(); }); };
})();
