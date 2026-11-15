/* Conecta Libras — app (HTML/CSS/JS puro) */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------- Armazenamento seguro ---------- */
  const KEY = 'conectaLibras.v1';
  const defaults = { seen: [], favs: [], lessonDone: false, storyDone: false, best: 0, bestWords: 0, bestSigns: 0, bestFrases: 0, games: 0, signsSeen: [], vocabSeen: [], frasesSeen: [], prefs: { big: false, contrast: false, motion: false }, lastLetter: 0, splashSeen: false };
  let st;
  try { st = Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { st = Object.assign({}, defaults); }
  st.prefs = Object.assign({}, defaults.prefs, st.prefs);
  if (!Array.isArray(st.signsSeen)) st.signsSeen = [];
  if (!Array.isArray(st.vocabSeen)) st.vocabSeen = [];
  if (!Array.isArray(st.frasesSeen)) st.frasesSeen = [];
  let FRASES = [];
  const frasesReady = fetch('./sinais/frases.json').then((r) => r.json()).then((d) => { FRASES = d.frases; $('#frAviso').textContent = d.aviso; }).catch(() => {});

  /* Vocabulário em vídeo (Signbank da Libras — UFSC) */
  let VOCAB = [];        // temas
  let VOCAB_ALL = [];    // todos os sinais
  let VOCAB_UNIQ = 0;    // vídeos diferentes
  const vSrc = (id) => './sinais/' + id + '.mp4';
  const vPoster = (id) => './sinais/' + id + '.jpg';
  const vocabReady = fetch('./sinais/dados.json').then((r) => r.json()).then((d) => {
    VOCAB = d.temas;
    VOCAB_ALL = VOCAB.flatMap((t) => t.sinais.map((s) => Object.assign({ tema: t.id }, s)));
    VOCAB_UNIQ = new Set(VOCAB_ALL.map((x) => x.id)).size;
  }).catch(() => {});
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  /* ---------- Dados ---------- */
  const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'Ç'];
  const file = (l) => (l === 'Ç' ? 'C-cedilha' : l);
  const src = (l) => './alfabeto/' + file(l) + '.mp4';
  const poster = (l) => './alfabeto/' + file(l) + '.jpg';
  const toLetters = (txt) => [...txt.toUpperCase().replace(/Ç/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'Ç')]
    .filter((c) => LETTERS.includes(c) || c === ' ').join('').replace(/\s+/g, ' ').trim().split('');

  const CONCEPTS = [
    { q: 'O que é a Libras?', a: ['🗣️ Português feito com as mãos', '🤟 Uma língua com gramática própria', '🙌 Gestos improvisados'], ok: 1, why: 'Libras é uma língua completa, com gramática própria.' },
    { q: 'Ao conversar em Libras, para onde olhar?', a: ['✋ Só para as mãos', '🧑 Para a pessoa inteira: mãos, rosto e corpo', '⬇️ Para baixo'], ok: 1, why: 'Rosto e corpo também fazem parte da língua.' },
    { q: 'Para que serve o alfabeto manual?', a: ['🔤 Soletrar nomes e palavras', '🚫 Substituir todos os sinais', '❓ Não serve para nada'], ok: 0, why: 'A datilologia soletra nomes e palavras sem sinal conhecido.' },
    { q: 'Como se faz uma pergunta em Libras?', a: ['🤨 Com o sinal e a expressão do rosto', '🔊 Falando mais alto', '✍️ Só escrevendo'], ok: 0, why: 'A expressão facial marca a pergunta.' }
  ];

  const SIGNS = [
    ['Oi', '👋'], ['Tudo bem?', '😊'], ['Obrigado', '🙏'], ['Por favor', '🤲'], ['Desculpa', '😔'], ['Bom dia', '🌅'],
    ['Boa tarde', '🌤️'], ['Boa noite', '🌙'], ['Prazer em conhecer', '🤝'], ['Sim', '👍'], ['Não', '👎'], ['Amigo', '🧑‍🤝‍🧑'],
    ['Família', '👨‍👩‍👧'], ['Casa', '🏠'], ['Escola', '🏫'], ['Água', '💧'], ['Comer', '🍽️'], ['Eu te amo', '❤️']
  ];

  const WORDS = ['SOL', 'LUA', 'MAR', 'PAZ', 'MEL', 'RUA', 'LUZ', 'CEU', 'CASA', 'AMOR', 'BOLA', 'GATO', 'FLOR', 'VIDA', 'MALA', 'PATO', 'SAPO', 'DADO'];

  const DRIVE = ['1Iqk4nNmxHRDflsAnIaJQY-ALz90Js-gZ', '1oJCLIpv1bOmp2cpSwBpiYErzHx1M8YE7', '1HVlERFqRVTkPzZwuOr_xpEdu0l1yM7hj', '1AeDV65-j3rItJSgLrRIellnAztHpUBbW', '13Qq86YY08yBuU8VVWpN9kwoeuXDDv8qB', '1jW5Yl3U-3QiW_nSectnOgzIYnHq1Hcyk', '1r50y8r7n_F5uiN3LqyAyADpSN2-hKnxa', '1D8dI32c2FROtnPhW6tioEuXwCW0dkSyQ', '1nUYHVpMz9ICF8ydZs4OU-HAdUq4TVq2Q', '1bw-GloAj2vCvHsqOCTLyI4N7grTeug9z', '1UhkAwxwYJdyFz7Yt1Q2PqzfqcGNf2AHU', '1ZaqWPEfp6L4OMQNANj_fKvQoYaamKgZy', '18zqgX95lrgV9lDftdZ8Av66ObgcH4lDR', '1XQMdmdm9qLJPkINkqTLIwp0opIq7x_Mo', '1d1DKKTYbLdU3-hBl8H1crA5ZFEQ1UCEo', '1UFSkdV8cTVlA-6vThPQN67yPpMaRvTC5', '1KdrVSq7QHpCJDDBeBW5pFdpbhI8B2q4_', '1oa9pXr_x0soIWVeQoe3Wm5M45d8KtoWO', '1kJd4s9F3k1v-t7cu6bhgoCefhMyfypCe', '1x43npTj7w3DDB9xBvbfL8bef7pjL1LXI', '1zThzOi4VT2SY7AwXydLp2P47dzFoGDIV', '1KjaIQ8-G_JHCQRkJoXZymDmaewEmrwKO', '1BWJ2qKRhgVq-HSyM0eCBQG8EgfFJOhDE'];

  /* ---------- Avisos rápidos e confete ---------- */
  let toastT;
  function toast(msg, ms) {
    const t = $('#toast');
    clearTimeout(toastT);
    if (!msg) { t.hidden = true; return; }
    t.textContent = msg; t.hidden = false;
    if (ms !== 0) toastT = setTimeout(() => { t.hidden = true; }, ms || 3200);
  }
  function confetti() {
    if (st.prefs.motion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = $('#confetti'), x = c.getContext('2d');
    c.width = innerWidth; c.height = innerHeight; c.style.display = 'block';
    const colors = ['#ffc857', '#25b7a8', '#2878c8', '#e0457b', '#7b4fe0', '#3fd47f'];
    const ps = Array.from({ length: 140 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 14, vy: Math.random() * -14 - 4, r: Math.random() * 6 + 4, c: colors[Math.floor(Math.random() * colors.length)], a: Math.random() * 6, s: Math.random() * 0.3 - 0.15 }));
    const t0 = performance.now();
    (function loop(t) {
      x.clearRect(0, 0, c.width, c.height);
      ps.forEach((p) => { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.a += p.s; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); });
      if (t - t0 < 2600) requestAnimationFrame(loop); else { x.clearRect(0, 0, c.width, c.height); c.style.display = 'none'; }
    })(t0);
  }

  /* ---------- Avatar VLibras (governo federal) ---------- */
  const VL_ROOT = 'https://vlibras.gov.br/app';
  let vlLoad = null;
  function loadVLibras() {
    if (vlLoad) return vlLoad;
    vlLoad = new Promise((resolve, reject) => {
      if (!document.querySelector('[vw]')) {
        document.body.insertAdjacentHTML('beforeend', '<div vw class="enabled"><div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div></div>');
      }
      const s = document.createElement('script');
      s.src = VL_ROOT + '/vlibras-plugin.js';
      s.onload = () => {
        try { new window.VLibras.Widget(VL_ROOT); } catch (e) { reject(e); return; }
        // versões antigas só iniciam no evento "load" da página
        setTimeout(() => { if (!window.VLibrasWidget?.open && !document.querySelector('[vw-access-button] img, #vlibras-button')) window.dispatchEvent(new Event('load')); }, 1200);
        resolve();
      };
      s.onerror = () => { vlLoad = null; reject(new Error('rede')); };
      document.head.appendChild(s);
      setTimeout(() => reject(new Error('tempo')), 20000);
    });
    return vlLoad;
  }
  const vlSay = (text) => {
    const p = window.plugin;
    if (p && typeof p.translate === 'function' && (!p.player || p.player.isLoaded !== false)) { p.translate(text); return true; }
    if (p && p.player && typeof p.player.translate === 'function') { p.player.translate(text); return true; }
    return false;
  };
  async function sayLibras(text) {
    toast('🤟 Abrindo o avatar…', 0);
    try { await loadVLibras(); } catch (e) { toast('Não deu para abrir o avatar agora. Verifique a internet e tente de novo.', 4500); return false; }
    if (vlSay(text)) { toast('🤟 O avatar está sinalizando: “' + text + '”'); return true; }
    if (window.VLibrasWidget && typeof window.VLibrasWidget.open === 'function') window.VLibrasWidget.open();
    else { const b = document.querySelector('[vw-access-button], #vlibras-button'); if (b) b.click(); }
    const t0 = Date.now();
    while (Date.now() - t0 < 40000) {
      await sleep(500);
      if (vlSay(text)) { toast('🤟 O avatar está sinalizando: “' + text + '”'); return true; }
    }
    toast('O avatar demorou para carregar. Toque de novo em alguns segundos.', 4500);
    return false;
  }

  /* ---------- Vídeos em sequência (soletrar) ---------- */
  function playSequence(video, letters, opts) {
    opts = opts || {};
    const job = { stop: false };
    let i = 0;
    video.loop = false;
    video.removeAttribute('poster');
    const next = () => {
      if (job.stop) return;
      if (i >= letters.length) { video.onended = null; video.onerror = null; if (opts.onEnd) opts.onEnd(); return; }
      const l = letters[i];
      if (opts.onLetter) opts.onLetter(i, l);
      if (l === ' ') { i++; setTimeout(next, 450); return; }
      video.src = src(l);
      video.playbackRate = opts.rate || 1;
      video.play().catch(() => { i++; setTimeout(next, 300); });
    };
    video.onended = () => { i++; next(); };
    video.onerror = () => { i++; next(); };
    next();
    return job;
  }

  /* ---------- Preferências ---------- */
  function applyPrefs() {
    const h = document.documentElement;
    h.classList.toggle('big', st.prefs.big);
    h.classList.toggle('contrast', st.prefs.contrast);
    h.classList.toggle('motion', st.prefs.motion);
    $('#optBig').checked = st.prefs.big;
    $('#optContrast').checked = st.prefs.contrast;
    $('#optMotion').checked = st.prefs.motion;
  }
  [['#optBig', 'big'], ['#optContrast', 'contrast'], ['#optMotion', 'motion']].forEach(([id, k]) => {
    $(id).addEventListener('change', (e) => { st.prefs[k] = e.target.checked; save(); applyPrefs(); });
  });

  /* ---------- Abertura ---------- */
  function enterApp() { $('#splash').classList.add('hide'); st.splashSeen = true; save(); }
  $$('.js-start').forEach((b) => b.addEventListener('click', enterApp));
  $('#skip').addEventListener('click', enterApp);
  // O app sempre abre pela capa (só pula se vier de um link direto para uma tela)
  if (location.hash.length > 1 && location.hash !== '#inicio') $('#splash').classList.add('hide');

  /* ---------- Rotas ---------- */
  const PAGES = ['inicio', 'aulas', 'aula', 'atividade', 'vocab', 'frases', 'dicionario', 'sinais', 'alfabeto', 'praticar', 'videos', 'perfil', 'biblioteca', 'downloads', 'avisos'];
  const SIDE_OF = { aula: 'aulas', atividade: 'aulas', avisos: 'inicio' };
  const BOTTOM_OF = { aula: 'aulas', atividade: 'aulas', praticar: 'aulas', sinais: 'aulas', vocab: 'aulas', frases: 'aulas', dicionario: 'biblioteca', alfabeto: 'biblioteca', videos: 'biblioteca', avisos: 'inicio' };
  let scrollToFavs = false;
  function route() {
    let id = (location.hash || '#inicio').slice(1).split('/')[0];
    if (!PAGES.includes(id)) id = 'inicio';
    PAGES.forEach((p) => $('#' + p).classList.toggle('on', p === id));
    document.body.classList.toggle('on-inicio', id === 'inicio');
    $$('.side [data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === (SIDE_OF[id] || id)));
    $$('.bottom [data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === (BOTTOM_OF[id] || id)));
    if (id !== 'aula') stopStory();
    if (id !== 'alfabeto') { stopSpell(); $('#abVideo').pause(); }
    if (id !== 'praticar') stopGame();
    if (id !== 'videos') closeDrive();
    if (id !== 'vocab') closeSign();
    if (id === 'vocab') vocabReady.then(renderVocab);
    if (id !== 'frases') stopFrase();
    if (id === 'frases') frasesReady.then(renderFrases);
    if (id === 'dicionario') vocabReady.then(() => renderDic($('#dicSearch').value));
    if (id === 'avisos') { st.avisosSeen = true; save(); }
    if (id === 'downloads') checkDownloads();
    if (id === 'inicio') renderHome();
    if (id === 'aulas') renderModules();
    if (id === 'aula') startStory(0);
    if (id === 'atividade') { startConcepts(conceptFrom); conceptFrom = 'aula'; }
    if (id === 'sinais') renderSigns();
    if (id === 'alfabeto') showLetter(abIndex);
    if (id === 'praticar') renderPracticeMenu();
    if (id === 'perfil') renderProfile();
    window.scrollTo(0, 0);
    if (id === 'perfil' && scrollToFavs) { scrollToFavs = false; setTimeout(() => $('#favList').scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); }
  }
  $$('[data-favs]').forEach((a) => a.addEventListener('click', () => { scrollToFavs = true; }));
  window.addEventListener('hashchange', route);

  /* ---------- Progresso ---------- */
  function percent() {
    const nv = VOCAB_UNIQ || 311;
    const parts = st.seen.length / LETTERS.length * 0.2 + (st.lessonDone ? 0.2 : 0) + Math.min(st.vocabSeen.length, nv) / nv * 0.35 + Math.min(st.best, 10) / 10 * 0.08 + Math.min(st.bestWords, 6) / 6 * 0.08 + Math.min(st.bestSigns, 8) / 8 * 0.09;
    return Math.round(parts * 100);
  }
  function renderHome() { $('#bellDot').hidden = !!st.avisosSeen; }

  /* ---------- Central de Downloads ---------- */
  let VIDEO_URLS = LETTERS.map((l) => new URL(src(l), location.href).href);
  vocabReady.then(() => { VIDEO_URLS = [...new Set(VIDEO_URLS.concat(VOCAB_ALL.map((s) => new URL(vSrc(s.id), location.href).href)))]; });
  async function checkDownloads() {
    await vocabReady;
    const status = $('#dlStatus'), btn = $('#dlBtn');
    if (!('caches' in window)) { status.textContent = 'Este navegador não permite guardar vídeos.'; btn.disabled = true; return; }
    let n = 0;
    try { const c = await caches.open('conecta-libras-downloads'); for (const u of VIDEO_URLS) if (await c.match(u)) n++; } catch (e) {}
    $('#dlBar').style.width = (n / VIDEO_URLS.length * 100) + '%';
    if (n === VIDEO_URLS.length) { status.textContent = '✔ Todos os ' + VIDEO_URLS.length + ' vídeos estão guardados neste aparelho.'; btn.textContent = '✔ Baixado'; btn.disabled = true; }
    else { status.textContent = n ? n + ' de ' + VIDEO_URLS.length + ' vídeos guardados.' : 'Ainda não baixado.'; btn.disabled = false; btn.textContent = '⬇ Baixar para usar sem internet'; }
  }
  $('#dlBtn').addEventListener('click', async () => {
    const btn = $('#dlBtn'); btn.disabled = true;
    await vocabReady;
    let n = 0, fail = 0;
    const c = await caches.open('conecta-libras-downloads');
    for (const u of VIDEO_URLS) {
      try { if (!(await c.match(u))) { const r = await fetch(u); if (!r.ok) throw 0; await c.put(u, r); } n++; } catch (e) { fail++; }
      $('#dlBar').style.width = ((n + fail) / VIDEO_URLS.length * 100) + '%';
      $('#dlStatus').textContent = 'Baixando… ' + (n + fail) + ' de ' + VIDEO_URLS.length;
    }
    if (fail) $('#dlStatus').textContent = n + ' baixados, ' + fail + ' falharam. Verifique a internet e toque de novo.';
    else confetti();
    checkDownloads();
  });

  function renderModules() {
    const mods = [
      { href: '#aula', icon: '🎬', c: '#25b7a8', t: 'Módulo 01 · Primeiros passos', d: 'Aula animada em 6 cenas + atividade.', s: st.lessonDone ? '✔ Concluído' : '6 cenas', done: st.lessonDone },
      { href: '#alfabeto', icon: '✋', c: '#7b4fe0', t: 'Módulo 02 · Alfabeto manual', d: '27 vídeos (A–Z + Ç) e soletrar o seu nome.', s: st.seen.length + '/27', done: st.seen.length === 27 },
      { href: '#vocab', icon: '🎬', c: '#e0457b', t: 'Módulo 03 · Vocabulário em vídeo', d: (VOCAB_UNIQ || 311) + ' sinais em ' + (VOCAB.length || 23) + ' temas, feitos por pessoas surdas.', s: st.vocabSeen.length + '/' + (VOCAB_UNIQ || 311), done: VOCAB_ALL.length && st.vocabSeen.length >= VOCAB_ALL.length },
      { href: '#videos', icon: '▶️', c: '#2878c8', t: 'Módulo 04 · Aulas da Professora Jocimara', d: '23 gravações (abrem pelo Google Drive da professora).', s: '23 vídeos' },
      { href: '#praticar', icon: '🎯', c: '#1f9d6b', t: 'Praticar', d: '4 jogos com vídeo: sinais, letras e palavras.', s: st.bestSigns ? '🏆 ' + st.bestSigns + '/8' : 'Jogar' },
      { href: '#sinais', icon: '🤟', c: '#7b4fe0', t: 'Extra · Avatar VLibras', d: 'Avatar 3D faz ' + SIGNS.length + ' sinais do dia a dia.', s: st.signsSeen.length + '/' + SIGNS.length },
      { href: '#frases', icon: '💬', c: '#e0a100', t: 'Módulo 05 · Frases em Libras', d: '16 frases do dia a dia, sinal por sinal.', s: st.frasesSeen.length + '/16', done: st.frasesSeen.length >= 16 },
      { href: '#dicionario', icon: '🔎', c: '#2878c8', t: 'Dicionário', d: 'Procure qualquer sinal ou soletre a palavra.', s: 'Buscar' }
    ];
    $('#modules').innerHTML = mods.map((m) => (m.soon ? '<div class="module soon" aria-disabled="true">' : '<a class="module" href="' + m.href + '">') +
      '<span class="qi" style="--c:' + m.c + '">' + m.icon + '</span><div><strong>' + m.t + '</strong><small>' + m.d + '</small></div><span class="state' + (m.done ? ' done' : '') + '">' + m.s + '</span>' + (m.soon ? '</div>' : '</a>')).join('');
  }

  /* ---------- Módulo 01: aula animada (cenas) ---------- */
  const SCENES = [
    { cap: 'Libras é uma língua de verdade, com gramática própria.', libras: 'Libras é uma língua',
      html: '<div class="sc sc1"><i class="ring r1"></i><i class="ring r2"></i><i class="ring r3"></i><img class="sc-logo" src="./img/logo-transp.png" alt=""><b class="sc-word">LIBRAS</b><span class="sc-badge">Reconhecida por lei · 2002</span></div>' },
    { cap: 'Mãos, rosto e corpo falam juntos.', libras: 'Mãos rosto corpo',
      html: '<div class="sc sc2"><svg viewBox="0 0 200 220" class="body"><circle cx="100" cy="52" r="30" class="sk"/><circle cx="90" cy="48" r="3.5" fill="#173b66"/><circle cx="110" cy="48" r="3.5" fill="#173b66"/><path d="M88 63q12 9 24 0" stroke="#173b66" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M55 210q0-95 45-95t45 95z" class="sh"/><path d="M62 140q-24-20-14-52" class="arm"/><path d="M138 140q24-20 14-52" class="arm"/><circle cx="47" cy="82" r="13" class="sk hand hl"/><circle cx="153" cy="82" r="13" class="sk hand hr"/></svg><span class="tag t1">✋ Mãos</span><span class="tag t2">🙂 Rosto</span><span class="tag t3">🧍 Corpo</span><i class="pulse p1"></i><i class="pulse p2"></i><i class="pulse p3"></i></div>' },
    { cap: 'O alfabeto manual soletra nomes. Veja: O + I = OI!', libras: 'Oi', video: 'OI',
      html: '<div class="sc sc3"><div class="sc3-v"><video playsinline muted></video></div><div class="sc3-l"><b>O</b><b>I</b></div></div>' },
    { cap: 'O rosto muda o sentido: a pergunta também aparece no rosto.', libras: 'Você está bem?',
      html: '<div class="sc sc4"><div class="face">🙂</div><div class="bubble">?</div><div class="faces"><span>🙂</span><span>🤨</span><span>😮</span><span>😊</span></div></div>' },
    { cap: 'Sente de frente, mãos livres e olho no olho: os sinais acontecem nesta área.', libras: 'Olhe nos olhos',
      html: '<div class="sc sc6"><svg viewBox="0 0 220 240" class="seat"><rect x="40" y="170" width="140" height="14" rx="6" class="chair"/><rect x="52" y="184" width="10" height="46" class="chair"/><rect x="158" y="184" width="10" height="46" class="chair"/><circle cx="110" cy="52" r="26" class="sk"/><circle cx="101" cy="49" r="3.2" fill="#173b66"/><circle cx="119" cy="49" r="3.2" fill="#173b66"/><path d="M100 62q10 7 20 0" stroke="#173b66" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M70 175q0-80 40-80t40 80z" class="sh"/><path d="M78 120q-18 10-6 34" class="arm"/><path d="M142 120q18 10 6 34" class="arm"/><circle cx="72" cy="150" r="10" class="sk hand hl"/><circle cx="148" cy="150" r="10" class="sk hand hr"/><rect x="44" y="18" width="132" height="150" rx="14" class="zone"/></svg><span class="tag z1">🔲 Área dos sinais</span><span class="tag z2">👀 Olho no olho</span><span class="tag z3">🪑 De frente</span></div>' },
    { cap: 'Aprender Libras é construir pontes com a comunidade surda.', libras: 'Aprender Libras é construir pontes',
      html: '<div class="sc sc5"><span class="p a">🧏‍♀️</span><svg viewBox="0 0 300 120" class="bridge"><path d="M20 100 Q150 -10 280 100" /></svg><span class="p b">🧑</span><span class="heart h1">💛</span><span class="heart h2">💙</span><span class="heart h3">💚</span></div>' }
  ];
  const SCENE_MS = 7000;
  let sIdx = 0, sT0 = 0, sEl = 0, sPaused = false, sRaf = 0, sJob = null, sEnd = false;
  $('#stBars').innerHTML = SCENES.map(() => '<i><b></b></i>').join('') + '<i><b></b></i>';
  function renderScene() {
    if (sJob) { sJob.stop = true; sJob = null; }
    const scene = $('#stScene');
    if (sEnd) {
      scene.innerHTML = '<div class="sc sc-end"><div class="trophy">🏅</div><b>Você assistiu à aula!</b><a class="btn gold big" href="#atividade">🎯 Fazer a atividade</a><button class="btn pale" type="button" id="stAgain">↻ Ver de novo</button></div>';
      $('#stCap').textContent = 'Agora mostre o que aprendeu!';
      $('#stAgain').onclick = () => startStory(0);
      st.storyDone = true; save(); confetti();
    } else {
      const sc = SCENES[sIdx];
      scene.innerHTML = sc.html;
      $('#stCap').textContent = sc.cap;
      if (sc.video) {
        const v = scene.querySelector('video'), ls = scene.querySelectorAll('.sc3-l b');
        const run = () => { sJob = playSequence(v, sc.video.split(''), { onLetter: (i) => ls.forEach((b, j) => b.classList.toggle('on', j === i)), onEnd: () => { ls.forEach((b) => b.classList.add('on')); setTimeout(() => { if (sJob && !sJob.stop) run(); }, 900); } }); };
        run();
      }
    }
    $$('#stBars i').forEach((b, j) => { const done = sEnd || j < sIdx; b.classList.toggle('done', done); b.querySelector('b').style.width = done ? '100%' : '0'; });
    $('#stFwd').textContent = sEnd ? '🎯 Atividade' : (sIdx === SCENES.length - 1 ? 'Concluir ⏭' : 'Próxima ⏭');
    $('#stLibras').disabled = sEnd;
  }
  function tick(t) {
    if (!sPaused && !sEnd) {
      sEl += t - sT0;
      const bar = $$('#stBars i b')[sIdx];
      if (bar) bar.style.width = Math.min(100, sEl / SCENE_MS * 100) + '%';
      if (sEl >= SCENE_MS) { goScene(sIdx + 1); }
    }
    sT0 = t;
    sRaf = requestAnimationFrame(tick);
  }
  function goScene(i) {
    if (i < 0) i = 0;
    sEnd = i >= SCENES.length;
    sIdx = Math.min(i, SCENES.length - 1);
    sEl = 0;
    renderScene();
  }
  function startStory(i) {
    cancelAnimationFrame(sRaf);
    sPaused = false; $('#stPause').textContent = '⏸ Pausar';
    goScene(i);
    sT0 = performance.now();
    sRaf = requestAnimationFrame(tick);
  }
  function stopStory() { cancelAnimationFrame(sRaf); if (sJob) { sJob.stop = true; sJob = null; } }
  const togglePause = (force) => { sPaused = force !== undefined ? force : !sPaused; $('#stPause').textContent = sPaused ? '▶ Continuar' : '⏸ Pausar'; $('#story').classList.toggle('paused', sPaused); };
  $('#stPause').addEventListener('click', () => togglePause());
  $('#stPrev').addEventListener('click', () => goScene(sEnd ? SCENES.length - 1 : sIdx - 1));
  $('#stBack').addEventListener('click', () => goScene(sEnd ? SCENES.length - 1 : sIdx - 1));
  $('#stNext').addEventListener('click', () => { if (!sEnd) goScene(sIdx + 1); });
  $('#stFwd').addEventListener('click', () => { if (sEnd) location.hash = '#atividade'; else goScene(sIdx + 1); });
  $('#stLibras').addEventListener('click', () => { if (sEnd) return; togglePause(true); sayLibras(SCENES[sIdx].libras); });

  /* Atividade de conceitos (usada pela aula e pelo Praticar) */
  let cq = 0, cScore = 0, cFrom = 'aula', conceptFrom = 'aula';
  function startConcepts(from) { cFrom = from || 'aula'; cq = 0; cScore = 0; renderConcept(); }
  function renderConcept() {
    const box = $('#conceptQuiz');
    if (cq >= CONCEPTS.length) {
      const passed = cScore >= 3;
      if (passed && cFrom === 'aula') { st.lessonDone = true; save(); }
      if (passed) confetti();
      box.innerHTML = '<div class="done-box bounce">' + (passed ? '🎉' : '📘') + '</div><h2>' + (passed ? 'Parabéns! Você concluiu o Módulo 01.' : 'Quase lá!') + '</h2><p class="muted">Você acertou ' + cScore + ' de ' + CONCEPTS.length + '.' + (passed ? '' : ' Reveja a aula animada e tente de novo.') + '</p>' +
        '<div class="row" style="flex-wrap:wrap;justify-content:center">' + (passed ? '<a class="btn gold" href="#alfabeto">Próximo: Alfabeto em vídeo →</a>' : '<a class="btn" href="#aula">🎬 Rever a aula</a>') + '<button class="btn pale" type="button" id="cAgain">Refazer</button></div>';
      $('#cAgain').onclick = () => startConcepts(cFrom);
      return;
    }
    const q = CONCEPTS[cq];
    box.innerHTML = '<div class="qdots">' + CONCEPTS.map((_, i) => '<i class="' + (i < cq ? 'd' : i === cq ? 'c' : '') + '"></i>').join('') + '</div><h2 class="pop">' + q.q + '</h2><div class="choices" id="cChoices">' +
      q.a.map((t, i) => '<button type="button" class="pop" style="animation-delay:' + (i * 90) + 'ms" data-i="' + i + '">' + t + '</button>').join('') + '</div><div class="feedback" id="cFb" aria-live="polite"></div><button class="btn" id="cNext" type="button" hidden>Continuar →</button>';
    $$('#cChoices button').forEach((b) => b.addEventListener('click', () => {
      const i = +b.dataset.i, ok = i === q.ok;
      if (ok) cScore++;
      $$('#cChoices button').forEach((x, j) => { x.disabled = true; if (j === q.ok) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong', 'shake');
      const fb = $('#cFb'); fb.textContent = (ok ? '✅ Correto! ' : '❌ Não é essa. ') + q.why; fb.style.color = ok ? 'var(--ok)' : 'var(--bad)';
      $('#cNext').hidden = false; $('#cNext').focus();
    }));
    $('#cNext').addEventListener('click', () => { cq++; renderConcept(); });
  }

  /* ---------- Módulo 03: primeiros sinais (avatar) ---------- */
  function renderSigns() {
    $('#signs').innerHTML = SIGNS.map(([w, e], i) => '<button type="button" class="sign pop' + (st.signsSeen.includes(w) ? ' seen' : '') + '" style="animation-delay:' + (i * 40) + 'ms" data-w="' + w + '"><span class="se">' + e + '</span><b>' + w + '</b><small>🤟 Ver sinal</small></button>').join('');
    $$('#signs .sign').forEach((b) => b.addEventListener('click', async () => {
      $$('#signs .sign').forEach((x) => x.classList.toggle('on', x === b));
      const w = b.dataset.w;
      const ok = await sayLibras(w);
      if (ok && !st.signsSeen.includes(w)) { st.signsSeen.push(w); save(); b.classList.add('seen'); if (st.signsSeen.length === SIGNS.length) confetti(); }
    }));
  }

  /* ---------- Módulo 03: vocabulário em vídeo ---------- */
  let vcTema = null, vcList = [], vcIdx = 0, vcSlowOn = false;
  const vcVideo = $('#vcVideo');
  function renderVocab() {
    if (!VOCAB.length) { $('#vcGrid').innerHTML = '<p class="muted">Não foi possível carregar os vídeos. Verifique a internet.</p>'; return; }
    if (!vcTema) vcTema = VOCAB[0].id;
    $('#vcChips').innerHTML = VOCAB.map((t) => {
      const done = t.sinais.filter((x) => st.vocabSeen.includes(x.id)).length;
      return '<button type="button" class="chip' + (t.id === vcTema ? ' on' : '') + '" data-t="' + t.id + '">' + t.emoji + ' ' + t.titulo + ' <small>' + done + '/' + t.sinais.length + '</small></button>';
    }).join('');
    $$('#vcChips .chip').forEach((b) => b.addEventListener('click', () => { vcTema = b.dataset.t; renderVocab(); }));
    const tema = VOCAB.find((t) => t.id === vcTema);
    vcList = tema.sinais;
    $('#vcGrid').innerHTML = vcList.map((x, i) => '<button type="button" class="vc-card pop' + (st.vocabSeen.includes(x.id) ? ' seen' : '') + '" style="animation-delay:' + Math.min(i * 30, 400) + 'ms" data-i="' + i + '"><span class="vc-thumb"><img src="' + vPoster(x.id) + '" alt="" loading="lazy"><i>▶</i></span><b>' + x.pt + '</b></button>').join('');
    $$('#vcGrid .vc-card').forEach((b) => b.addEventListener('click', () => openSign(+b.dataset.i)));
  }
  function openSign(i) {
    stopVcSpell(); $('#vcSpell').innerHTML = '';
    vcIdx = (i + vcList.length) % vcList.length;
    const x = vcList[vcIdx];
    $('#vcWord').textContent = x.pt;
    $('#vcSub').textContent = (vcIdx + 1) + ' de ' + vcList.length + ' · Signbank da Libras (UFSC)';
    vcVideo.poster = vPoster(x.id); vcVideo.src = vSrc(x.id);
    vcVideo.playbackRate = vcSlowOn ? 0.5 : 1;
    vcVideo.play().catch(() => {});
    $('#vcModal').hidden = false; document.body.classList.add('modal-open');
    if (!st.vocabSeen.includes(x.id)) {
      st.vocabSeen.push(x.id); save();
      const card = $('#vcGrid .vc-card[data-i="' + vcIdx + '"]'); if (card) card.classList.add('seen');
      const tema = VOCAB.find((t) => t.id === vcTema);
      if (tema && tema.sinais.every((s2) => st.vocabSeen.includes(s2.id))) { confetti(); toast('🏆 Tema “' + tema.titulo + '” completo!'); }
    }
  }
  function closeSign() {
    const wasOpen = !$('#vcModal').hidden;
    stopVcSpell(); toggleCam(false);
    $('#vcModal').hidden = true; document.body.classList.remove('modal-open'); vcVideo.pause();
    if (wasOpen && $('#vocab').classList.contains('on')) renderVocab();
  }
  vcVideo.addEventListener('loadeddata', () => { vcVideo.playbackRate = vcSlowOn ? 0.5 : 1; });
  vcVideo.addEventListener('click', () => (vcVideo.paused ? vcVideo.play().catch(() => {}) : vcVideo.pause()));
  $('#vcClose').addEventListener('click', closeSign);
  $('#vcModal').addEventListener('click', (e) => { if (e.target.id === 'vcModal') closeSign(); });
  $('#vcPrev').addEventListener('click', () => openSign(vcIdx - 1));
  $('#vcNext').addEventListener('click', () => openSign(vcIdx + 1));
  $('#vcSlow').addEventListener('click', (e) => { vcSlowOn = !vcSlowOn; vcVideo.playbackRate = vcSlowOn ? 0.5 : 1; e.currentTarget.setAttribute('aria-pressed', vcSlowOn); e.currentTarget.textContent = vcSlowOn ? '🐇 Normal' : '🐢 Devagar'; });
  $('#vcAvatar').addEventListener('click', () => sayLibras(vcList[vcIdx].pt));
  /* Soletrar a palavra e espelho com a câmera (janela do sinal) */
  let vcSpellJob = null, camStream = null;
  function stopVcSpell() {
    if (vcSpellJob) { vcSpellJob.stop = true; vcSpellJob = null; }
    vcVideo.onended = null; vcVideo.onerror = null; vcVideo.loop = true;
    $('#vcSpellBtn').textContent = '✍️ Soletrar';
  }
  $('#vcSpellBtn').addEventListener('click', () => {
    const x = vcList[vcIdx]; if (!x) return;
    if (vcSpellJob) { stopVcSpell(); vcVideo.src = vSrc(x.id); vcVideo.play().catch(() => {}); return; }
    const ls = toLetters(x.pt);
    const box = $('#vcSpell');
    box.innerHTML = ls.map((l) => (l === ' ' ? '<i class="gap"></i>' : '<b>' + l + '</b>')).join('');
    const chips = [...box.children];
    $('#vcSpellBtn').textContent = '⏹ Parar';
    vcSpellJob = playSequence(vcVideo, ls, {
      rate: vcSlowOn ? 0.6 : 1,
      onLetter: (i) => chips.forEach((c, j) => { c.classList.toggle('on', j === i); c.classList.toggle('done', j < i); }),
      onEnd: () => {
        chips.forEach((c) => { c.classList.remove('on'); c.classList.add('done'); });
        vcSpellJob = null; $('#vcSpellBtn').textContent = '↻ Soletrar de novo';
        setTimeout(() => { if (!vcSpellJob && !$('#vcModal').hidden) { vcVideo.loop = true; vcVideo.poster = vPoster(x.id); vcVideo.src = vSrc(x.id); vcVideo.play().catch(() => {}); } }, 900);
      }
    });
  });
  async function toggleCam(force) {
    const on = force !== undefined ? force : !camStream;
    if (!on) {
      if (camStream) camStream.getTracks().forEach((t) => t.stop());
      camStream = null; $('#vcCamBox').hidden = true; $('#vcCam').srcObject = null;
      $('#vcCamBtn').setAttribute('aria-pressed', 'false'); $('#vcCamBtn').textContent = '📷 Espelho';
      $('.modal-box').classList.remove('with-cam');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Este aparelho não permite usar a câmera aqui.'); return; }
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
      $('#vcCam').srcObject = camStream; $('#vcCamBox').hidden = false;
      $('#vcCamBtn').setAttribute('aria-pressed', 'true'); $('#vcCamBtn').textContent = '📷 Fechar espelho';
      $('.modal-box').classList.add('with-cam');
      toast('Imite o sinal olhando para você mesmo. Nada é gravado.');
    } catch (e) { toast('Não foi possível abrir a câmera. Permita o acesso nas configurações do navegador.', 4500); }
  }
  $('#vcCamBtn').addEventListener('click', () => toggleCam());

  document.addEventListener('keydown', (e) => {
    if ($('#vcModal').hidden) return;
    if (e.key === 'Escape') closeSign();
    if (e.key === 'ArrowRight') openSign(vcIdx + 1);
    if (e.key === 'ArrowLeft') openSign(vcIdx - 1);
  });
  let vtx = null;
  vcVideo.addEventListener('touchstart', (e) => { vtx = e.touches[0].clientX; }, { passive: true });
  vcVideo.addEventListener('touchend', (e) => { if (vtx === null) return; const dx = e.changedTouches[0].clientX - vtx; vtx = null; if (dx < -50) openSign(vcIdx + 1); if (dx > 50) openSign(vcIdx - 1); });


  /* ---------- Módulo 05: frases (sinal por sinal) ---------- */
  // Toca uma frase: vídeos de sinais, "apontar" (EU/VOCÊ) e nomes soletrados.
  function playFraseOn(video, pointEl, f, opts) {
    opts = opts || {};
    const job = { stop: false };
    const steps = [];
    f.itens.forEach((it, k) => {
      if (it[0] === 's') toLetters(it[1]).forEach((l) => steps.push({ k, kind: 'l', l }));
      else steps.push({ k, kind: it[0], it });
    });
    let i = 0;
    video.loop = false;
    const rate = () => (opts.slow ? 0.6 : 1);
    const next = () => {
      if (job.stop) return;
      if (pointEl) pointEl.hidden = true;
      if (i >= steps.length) { video.onended = null; video.onerror = null; if (opts.onEnd) opts.onEnd(); return; }
      const st2 = steps[i];
      if (opts.onItem) opts.onItem(st2.k);
      if (st2.kind === 'p') {
        const eu = st2.it[1] === 'eu';
        if (pointEl) {
          pointEl.querySelector('.fr-hand').textContent = eu ? '🙋' : '🫵';
          pointEl.querySelector('b').textContent = eu ? 'EU' : 'VOCÊ';
          pointEl.querySelector('small').textContent = eu ? 'aponte para o seu peito' : 'aponte para a pessoa';
          pointEl.classList.toggle('you', !eu); pointEl.hidden = false;
        }
        i++; setTimeout(next, opts.slow ? 2000 : 1400); return;
      }
      video.src = st2.kind === 'l' ? src(st2.l) : vSrc(st2.it[1]);
      video.removeAttribute('poster');
      video.playbackRate = rate();
      video.play().catch(() => { i++; setTimeout(next, 300); });
    };
    video.onended = () => { i++; next(); };
    video.onerror = () => { i++; next(); };
    next();
    return job;
  }
  let frIdx = 0, frJob = null, frSlowOn = false;
  const frVideo = $('#frVideo');
  function renderFrases() {
    $('#frList').innerHTML = FRASES.map((f, i) => '<button type="button" class="fr-item pop' + (i === frIdx ? ' on' : '') + (st.frasesSeen.includes(i) ? ' seen' : '') + '" style="animation-delay:' + Math.min(i * 30, 400) + 'ms" data-i="' + i + '"><span class="fr-tag">' + f.tema + '</span><b>' + f.pt + '</b><small>' + f.itens.map((it) => (it[0] === 'p' ? (it[1] === 'eu' ? '🙋EU' : '🫵VOCÊ') : it[0] === 's' ? it[1].split('').join('-') : it[2])).join(' ') + (f.q ? ' ?' : '') + '</small></button>').join('');
    $$('#frList .fr-item').forEach((b) => b.addEventListener('click', () => { frIdx = +b.dataset.i; showFrase(true); $('.fr-player').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    showFrase(false);
  }
  function showFrase(play) {
    const f = FRASES[frIdx]; if (!f) return;
    stopFrase();
    $('#frPt').textContent = f.pt;
    $('#frGloss').innerHTML = f.itens.map((it) => '<span>' + (it[0] === 'p' ? (it[1] === 'eu' ? '🙋 EU' : '🫵 VOCÊ') : it[0] === 's' ? '✍️ ' + it[1].split('').join('-') : it[2]) + '</span>').join('') + (f.q ? '<span class="q">🤨 ?</span>' : '');
    $$('#frList .fr-item').forEach((b) => b.classList.toggle('on', +b.dataset.i === frIdx));
    const firstV = f.itens.find((it) => it[0] === 'v');
    if (firstV) frVideo.poster = vPoster(firstV[1]);
    if (play) playFrase();
  }
  function playFrase() {
    const f = FRASES[frIdx]; if (!f) return;
    stopFrase();
    const chips = [...$('#frGloss').children];
    $('#frPlay').textContent = '⏹ Parar';
    frJob = playFraseOn(frVideo, $('#frPoint'), f, {
      slow: frSlowOn,
      onItem: (k) => chips.forEach((c, j) => { c.classList.toggle('on', j === k); c.classList.toggle('done', j < k); }),
      onEnd: () => {
        chips.forEach((c) => { c.classList.remove('on'); c.classList.add('done'); });
        frJob = null; $('#frPlay').textContent = '↻ Ver de novo';
        if (!st.frasesSeen.includes(frIdx)) { st.frasesSeen.push(frIdx); save(); const b = $('#frList .fr-item[data-i="' + frIdx + '"]'); if (b) b.classList.add('seen'); if (st.frasesSeen.length === FRASES.length) confetti(); }
      }
    });
  }
  function stopFrase() { if (frJob) { frJob.stop = true; frJob = null; } frVideo.onended = null; frVideo.pause(); $('#frPoint').hidden = true; $('#frPlay').textContent = '▶ Ver frase'; }
  $('#frPlay').addEventListener('click', () => { if (frJob) stopFrase(); else playFrase(); });
  $('#frSlow').addEventListener('click', (e) => { frSlowOn = !frSlowOn; e.currentTarget.setAttribute('aria-pressed', frSlowOn); e.currentTarget.textContent = frSlowOn ? '🐇 Normal' : '🐢 Devagar'; });
  $('#frAvatar').addEventListener('click', () => { const f = FRASES[frIdx]; if (f) { stopFrase(); sayLibras(f.pt); } });

  /* ---------- Dicionário ---------- */
  const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  function renderDic(q) {
    const k = norm(q);
    const seen = new Set();
    const uniq = VOCAB_ALL.filter((x) => (seen.has(x.id) ? false : seen.add(x.id)));
    const res = k ? uniq.filter((x) => norm(x.pt).includes(k) || norm(x.glosa).includes(k)) : uniq.slice().sort((a, b) => a.pt.localeCompare(b.pt, 'pt-BR'));
    $('#dicGrid').innerHTML = res.slice(0, 120).map((x, i) => '<button type="button" class="vc-card' + (st.vocabSeen.includes(x.id) ? ' seen' : '') + '" data-i="' + i + '"><span class="vc-thumb"><img src="' + vPoster(x.id) + '" alt="" loading="lazy"><i>▶</i></span><b>' + x.pt + '</b></button>').join('');
    $$('#dicGrid .vc-card').forEach((b) => b.addEventListener('click', () => { vcList = res.slice(0, 120); openSign(+b.dataset.i); }));
    const none = k && !res.length;
    $('#dicNone').hidden = !none;
    if (none) { $('#dicWord').textContent = q.trim(); $('#dicSpell').onclick = () => { $('#spellInput').value = q.trim(); setTimeout(startSpellFromDic, 400); }; }
  }
  function startSpellFromDic() { $('#spellBtn').click(); }
  $('#dicSearch').addEventListener('input', (e) => renderDic(e.target.value));
  $('#dicAvatar').addEventListener('click', () => sayLibras($('#dicSearch').value.trim()));

  /* ---------- Módulo 02: alfabeto ---------- */
  let abIndex = Math.min(st.lastLetter || 0, LETTERS.length - 1);
  const abVideo = $('#abVideo');
  const grid = $('#letters');
  LETTERS.forEach((l, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = l; b.setAttribute('aria-label', 'Letra ' + l);
    b.addEventListener('click', () => { stopSpell(); showLetter(i); });
    grid.appendChild(b);
  });
  function paintLetters() {
    [...grid.children].forEach((b, i) => {
      b.classList.toggle('on', i === abIndex);
      b.classList.toggle('seen', st.seen.includes(LETTERS[i]));
      b.classList.toggle('isfav', st.favs.includes(LETTERS[i]));
    });
  }
  let slow = false;
  function showLetter(i) {
    abIndex = i; st.lastLetter = i;
    const l = LETTERS[i];
    $('#abTitle').textContent = 'Letra ' + l;
    $('#abCount').textContent = (i + 1) + ' / ' + LETTERS.length;
    $('#abPrev').disabled = i === 0;
    $('#abNext').disabled = i === LETTERS.length - 1;
    const fav = st.favs.includes(l);
    $('#abFav').textContent = fav ? '♥' : '♡';
    $('#abFav').setAttribute('aria-pressed', fav);
    abVideo.loop = true;
    if (!abVideo.src.endsWith(src(l).slice(1))) { abVideo.poster = poster(l); abVideo.src = src(l); }
    abVideo.playbackRate = slow ? 0.5 : 1;
    if (!st.seen.includes(l)) { st.seen.push(l); if (st.seen.length === LETTERS.length) confetti(); }
    save(); paintLetters();
    abVideo.play().catch(() => {});
  }
  abVideo.addEventListener('loadeddata', () => { abVideo.playbackRate = slow ? 0.5 : 1; });
  $('#abPrev').addEventListener('click', () => { stopSpell(); if (abIndex > 0) showLetter(abIndex - 1); });
  $('#abNext').addEventListener('click', () => { stopSpell(); if (abIndex < LETTERS.length - 1) showLetter(abIndex + 1); });
  $('#abReplay').addEventListener('click', () => { abVideo.currentTime = 0; abVideo.play().catch(() => {}); });
  $('#abSpeed').addEventListener('click', (e) => {
    slow = !slow; abVideo.playbackRate = slow ? 0.5 : 1;
    e.currentTarget.setAttribute('aria-pressed', slow);
    e.currentTarget.textContent = slow ? '🐇 Normal' : '🐢 Devagar';
  });
  abVideo.addEventListener('click', () => (abVideo.paused ? abVideo.play().catch(() => {}) : abVideo.pause()));
  $('#abFav').addEventListener('click', () => {
    const l = LETTERS[abIndex];
    st.favs = st.favs.includes(l) ? st.favs.filter((x) => x !== l) : [...st.favs, l];
    save(); showLetter(abIndex);
  });
  document.addEventListener('keydown', (e) => {
    if (!$('#alfabeto').classList.contains('on') || e.target.matches('input,textarea')) return;
    if (e.key === 'ArrowRight' && abIndex < LETTERS.length - 1) { stopSpell(); showLetter(abIndex + 1); }
    if (e.key === 'ArrowLeft' && abIndex > 0) { stopSpell(); showLetter(abIndex - 1); }
  });
  let tx = null;
  abVideo.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  abVideo.addEventListener('touchend', (e) => {
    if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (dx < -50 && abIndex < LETTERS.length - 1) { stopSpell(); showLetter(abIndex + 1); }
    if (dx > 50 && abIndex > 0) { stopSpell(); showLetter(abIndex - 1); }
  });

  /* Soletrar */
  let spellJob = null;
  function stopSpell() { if (spellJob) { spellJob.stop = true; spellJob = null; abVideo.onended = null; abVideo.onerror = null; abVideo.loop = true; $('#spellBtn').textContent = '▶ Soletrar'; } }
  function startSpell() {
    const ls = toLetters($('#spellInput').value || '');
    if (!ls.length) { toast('Digite um nome ou uma palavra.'); $('#spellInput').focus(); return; }
    stopSpell();
    const strip = $('#spellStrip');
    strip.innerHTML = ls.map((l) => (l === ' ' ? '<i class="gap"></i>' : '<b>' + l + '</b>')).join('');
    const chips = [...strip.children];
    $('#spellBtn').textContent = '⏹ Parar';
    $('#abTitle').textContent = 'Soletrando…';
    $('#abVideo').scrollIntoView({ behavior: 'smooth', block: 'center' });
    spellJob = playSequence(abVideo, ls, {
      rate: slow ? 0.6 : 1,
      onLetter: (i, l) => { chips.forEach((c, j) => { c.classList.toggle('on', j === i); c.classList.toggle('done', j < i); }); if (l !== ' ') { $('#abTitle').textContent = 'Letra ' + l; if (!st.seen.includes(l)) st.seen.push(l); } },
      onEnd: () => { chips.forEach((c) => { c.classList.remove('on'); c.classList.add('done'); }); $('#abTitle').textContent = '✔ ' + ls.join(''); spellJob = null; abVideo.loop = true; $('#spellBtn').textContent = '↻ Soletrar de novo'; save(); paintLetters(); }
    });
  }
  $('#spellBtn').addEventListener('click', () => { if (spellJob) { stopSpell(); showLetter(abIndex); } else startSpell(); });
  $('#spellInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); startSpell(); } });

  /* ---------- Praticar: jogos com vídeo ---------- */
  let mode = 'letras', ROUNDS = 10, gRound = 0, gScore = 0, gAnswer = null, gPool = [], gJob = null;
  const gVideo = $('#gVideo');
  function renderPracticeMenu() {
    stopGame();
    $('#practiceMenu').hidden = false; $('#game').hidden = true;
    $('#bestScore').textContent = st.best ? '🏆 Seu melhor: ' + st.best + ' de 10' : '';
    $('#bestWords').textContent = st.bestWords ? '🏆 Seu melhor: ' + st.bestWords + ' de 6' : '';
    $('#bestSigns').textContent = st.bestSigns ? '🏆 Seu melhor: ' + st.bestSigns + ' de 8' : '';
    $('#bestFrases').textContent = st.bestFrases ? '🏆 Seu melhor: ' + st.bestFrases + ' de 6' : '';
  }
  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.mode === 'conceitos') { conceptFrom = 'praticar'; location.hash = '#atividade'; return; }
    if (b.dataset.mode === 'frases') { frasesReady.then(() => { if (FRASES.length) startGame('frases'); else toast('Não foi possível carregar as frases.'); }); return; }
    if (b.dataset.mode === 'sinais') { vocabReady.then(() => { if (VOCAB_ALL.length) startGame('sinais'); else toast('Não foi possível carregar os vídeos.'); }); return; }
    startGame(b.dataset.mode);
  }));
  function startGame(m) {
    mode = m || mode; ROUNDS = mode === 'palavras' || mode === 'frases' ? 6 : mode === 'sinais' ? 8 : 10;
    gRound = 0; gScore = 0; gPool = shuffle(mode === 'palavras' ? WORDS : mode === 'sinais' ? VOCAB_ALL : mode === 'frases' ? FRASES : LETTERS).slice(0, ROUNDS);
    $('#game').classList.toggle('no-cover', mode === 'sinais' || mode === 'frases');
    $('#game').classList.toggle('frase-mode', mode === 'frases');
    $('#practiceMenu').hidden = true; $('#game').hidden = false;
    $('#gChoices').classList.toggle('word-choice', mode !== 'letras');
    nextRound();
  }
  function stopGame() { if (gJob) { gJob.stop = true; gJob = null; } gVideo.onended = null; gVideo.pause(); }
  function playWord() {
    const ls = gAnswer.split('');
    $('#gReplay').hidden = true;
    $('#gDots').innerHTML = ls.map(() => '<i></i>').join('');
    const dots = [...$('#gDots').children];
    gJob = playSequence(gVideo, ls, { onLetter: (i) => dots.forEach((d, j) => d.classList.toggle('on', j <= i)), onEnd: () => { $('#gReplay').hidden = false; gJob = null; } });
  }
  function nextRound() {
    stopGame();
    if (gRound >= ROUNDS) return endGame();
    gAnswer = gPool[gRound];
    $('#gRound').textContent = (gRound + 1) + ' / ' + ROUNDS;
    $('#gScore').textContent = gScore + ' acerto' + (gScore === 1 ? '' : 's');
    $('#gFeedback').textContent = ''; $('#gNext').hidden = true;
    gVideo.removeAttribute('poster');
    let opts;
    if (mode === 'frases') {
      const f = gAnswer;
      $('#gDots').innerHTML = f.itens.map(() => '<i></i>').join('');
      const play = () => { $('#gReplay').hidden = true; const dots = [...$('#gDots').children]; gJob = playFraseOn(gVideo, $('#gPoint'), f, { onItem: (i) => dots.forEach((d, j) => d.classList.toggle('on', j <= i)), onEnd: () => { $('#gReplay').hidden = false; gJob = null; } }); };
      $('#gReplay').onclick = play; play();
      opts = shuffle([f.pt, ...shuffle(FRASES.filter((y) => y.pt !== f.pt)).slice(0, 3).map((y) => y.pt)]);
      gAnswer = f.pt;
    } else if (mode === 'sinais') {
      const x = gAnswer;
      $('#gDots').innerHTML = ''; $('#gReplay').hidden = true;
      gVideo.loop = true; gVideo.poster = vPoster(x.id); gVideo.src = vSrc(x.id); gVideo.play().catch(() => {});
      const same = VOCAB_ALL.filter((y) => y.tema === x.tema && y.id !== x.id);
      const pool = same.length >= 3 ? same : VOCAB_ALL.filter((y) => y.id !== x.id);
      const others = [...new Set(shuffle(pool).map((y) => y.pt).filter((w) => w !== x.pt))].slice(0, 3);
      opts = shuffle([x.pt, ...others]);
      gAnswer = x.pt;
    } else if (mode === 'palavras') {
      const same = WORDS.filter((w) => w !== gAnswer && w.length === gAnswer.length);
      opts = shuffle([gAnswer, ...shuffle(same.length >= 3 ? same : WORDS.filter((w) => w !== gAnswer)).slice(0, 3)]);
      playWord();
    } else {
      $('#gDots').innerHTML = ''; $('#gReplay').hidden = true;
      gVideo.loop = true; gVideo.src = src(gAnswer); gVideo.play().catch(() => {});
      opts = shuffle([gAnswer, ...shuffle(LETTERS.filter((l) => l !== gAnswer)).slice(0, 3)]);
    }
    $('#gChoices').innerHTML = opts.map((l, i) => '<button type="button" class="pop" style="animation-delay:' + (i * 70) + 'ms" data-l="' + l + '">' + l + '</button>').join('');
    $$('#gChoices button').forEach((b) => b.addEventListener('click', () => answer(b)));
  }
  $('#gReplay').addEventListener('click', () => { if (mode === 'palavras') playWord(); });
  function answer(b) {
    const ok = b.dataset.l === gAnswer;
    if (ok) gScore++;
    $$('#gChoices button').forEach((x) => { x.disabled = true; if (x.dataset.l === gAnswer) x.classList.add('right'); });
    if (!ok) b.classList.add('wrong', 'shake');
    const fb = $('#gFeedback');
    fb.textContent = ok ? '✅ Muito bem! É ' + (mode === 'letras' ? 'a letra ' : mode === 'sinais' ? 'o sinal ' : mode === 'frases' ? 'a frase: ' : 'a palavra ') + gAnswer + '.' : '❌ Era ' + gAnswer + '. Assista de novo e siga em frente.';
    fb.style.color = ok ? 'var(--ok)' : 'var(--bad)';
    $('#gScore').textContent = gScore + ' acerto' + (gScore === 1 ? '' : 's');
    gRound++;
    $('#gNext').textContent = gRound >= ROUNDS ? 'Ver resultado →' : 'Próxima →';
    $('#gNext').hidden = false; $('#gNext').focus();
  }
  function endGame() {
    stopGame();
    st.games++;
    if (mode === 'frases') { if (gScore > st.bestFrases) st.bestFrases = gScore; } else if (mode === 'palavras') { if (gScore > st.bestWords) st.bestWords = gScore; } else if (mode === 'sinais') { if (gScore > st.bestSigns) st.bestSigns = gScore; } else if (gScore > st.best) st.best = gScore;
    save();
    $('#gChoices').innerHTML = ''; $('#gDots').innerHTML = ''; $('#gReplay').hidden = true;
    $('#gRound').textContent = 'Fim';
    const top = gScore >= ROUNDS * 0.8;
    $('#gFeedback').innerHTML = '<span class="bounce" style="font-size:2.6em;display:inline-block">' + (top ? '🏆' : gScore >= ROUNDS / 2 ? '👏' : '💪') + '</span><br>Você acertou ' + gScore + ' de ' + ROUNDS + '!';
    $('#gFeedback').style.color = 'var(--navy2)';
    if (top) confetti();
    $('#gNext').textContent = 'Jogar de novo'; $('#gNext').hidden = false;
    $('#gNext').dataset.again = '1';
  }
  $('#gNext').addEventListener('click', (e) => {
    if (e.currentTarget.dataset.again) { delete e.currentTarget.dataset.again; startGame(); } else nextRound();
  });
  $('#gExit').addEventListener('click', renderPracticeMenu);

  /* ---------- Vídeos da professora ---------- */
  $('#vGrid').innerHTML = DRIVE.map((id, i) => '<button type="button" class="vcard" data-v="' + i + '"><span class="thumb"><img src="https://drive.google.com/thumbnail?id=' + id + '&amp;sz=w480" alt="" loading="lazy" onerror="this.remove()"><span class="play" aria-hidden="true">▶</span></span><strong>Aula ' + String(i + 1).padStart(2, '0') + '</strong><small>Professora Jocimara</small></button>').join('');
  $$('#vGrid .vcard').forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.v, id = DRIVE[i];
    $('#vTitle').textContent = 'Aula ' + String(i + 1).padStart(2, '0');
    $('#vFrame').src = 'https://drive.google.com/file/d/' + id + '/preview';
    $('#vOpen').href = 'https://drive.google.com/file/d/' + id + '/view';
    $('#vPlayer').hidden = false;
    $$('#vGrid .vcard').forEach((x) => x.classList.toggle('on', x === b));
    $('#vPlayer').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  function closeDrive() { $('#vPlayer').hidden = true; $('#vFrame').src = 'about:blank'; $$('#vGrid .vcard').forEach((x) => x.classList.remove('on')); }
  $('#vClose').addEventListener('click', closeDrive);

  /* ---------- Perfil ---------- */
  function renderProfile() {
    $('#stats').innerHTML = [
      [percent() + '%', 'progresso geral'],
      [st.seen.length + '/27', 'letras vistas'],
      [st.vocabSeen.length + '/' + (VOCAB_UNIQ || 311), 'sinais em vídeo vistos'],
      [st.bestSigns + '/8', 'melhor no “Qual é o sinal?”'],
      [st.frasesSeen.length + '/16', 'frases vistas'],
      [st.bestFrases + '/6', 'melhor no “Qual é a frase?”'],
      [st.signsSeen.length + '/' + SIGNS.length, 'sinais com o avatar'],
      [st.lessonDone ? '✔' : '—', 'Módulo 01 concluído'],
      [st.best + '/10', 'melhor no “Qual é a letra?”'],
      [st.bestWords + '/6', 'melhor no “Que palavra é?”']
    ].map(([b, s]) => '<div class="stat"><b>' + b + '</b><span>' + s + '</span></div>').join('');
    $('#favList').innerHTML = st.favs.length
      ? st.favs.map((l) => '<a href="#alfabeto" data-letter="' + l + '" aria-label="Abrir letra ' + l + '">' + l + '</a>').join('')
      : '<p class="muted">Toque no ♡ de uma letra no Alfabeto para guardá-la aqui.</p>';
    $$('#favList a').forEach((a) => a.addEventListener('click', () => { abIndex = LETTERS.indexOf(a.dataset.letter); }));
  }
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Apagar todo o progresso e favoritos deste aparelho?')) return;
    const prefs = st.prefs; st = Object.assign({}, defaults, { prefs, splashSeen: true, seen: [], favs: [], signsSeen: [], vocabSeen: [], frasesSeen: [] }); save(); renderProfile();
  });

  /* ---------- Instalação (PWA) ---------- */
  let deferred = null;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('#installBtn').hidden = false; });
  if (isIOS && !standalone) $('#installBtn').hidden = false;
  $('#installBtn').addEventListener('click', async () => {
    if (deferred) { deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; $('#installBtn').hidden = true; }
    else { location.hash = '#perfil'; setTimeout(() => $('#installHelp').scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }
  });
  window.addEventListener('appinstalled', () => { $('#installBtn').hidden = true; });

  let swDone = false;
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => { if (swDone) return; swDone = true; navigator.serviceWorker.register('./sw.js').catch(() => {}); });
  }

  applyPrefs();
  route();
})();
