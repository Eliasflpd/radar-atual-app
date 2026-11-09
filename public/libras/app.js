/* Conecta Libras — app (HTML/CSS/JS puro) */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  /* ---------- Armazenamento seguro ---------- */
  const KEY = 'conectaLibras.v1';
  const defaults = { seen: [], favs: [], lessonDone: false, best: 0, games: 0, prefs: { big: false, contrast: false, motion: false }, lastLetter: 0, splashSeen: false };
  let st;
  try { st = Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { st = Object.assign({}, defaults); }
  st.prefs = Object.assign({}, defaults.prefs, st.prefs);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  /* ---------- Dados ---------- */
  const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'Ç'];
  const file = (l) => (l === 'Ç' ? 'C-cedilha' : l);
  const src = (l) => './alfabeto/' + file(l) + '.mp4';
  const poster = (l) => './alfabeto/' + file(l) + '.jpg';

  const LESSON = [
    { title: 'Libras é uma língua', emoji: '🤟', visual: 'Uma língua visual-espacial', desc: 'A comunicação acontece visualmente e utiliza mãos, corpo, expressões e espaço.', text: 'A Língua Brasileira de Sinais é uma língua visual-espacial, com estrutura e gramática próprias. Ela é utilizada por comunidades surdas no Brasil e é reconhecida por lei (Lei nº 10.436/2002).', key: 'Lembre-se: Libras não é português representado por gestos. É uma língua, com organização linguística própria.' },
    { title: 'A comunicação vai além das mãos', emoji: '👀', visual: 'Mãos, corpo e expressões', desc: 'Os elementos visuais precisam ser observados em conjunto.', text: 'Na Libras, a configuração e o movimento das mãos, a orientação, a localização no espaço e as expressões não manuais (rosto e corpo) contribuem para construir significados.', key: 'Observe a pessoa sinalizante por inteiro: expressões faciais e corporais também têm função linguística.' },
    { title: 'Aprender com respeito', emoji: '🤝', visual: 'Língua, identidade e respeito', desc: 'Aprender Libras também envolve reconhecer a comunidade surda.', text: 'As pessoas surdas têm experiências e identidades diversas. Aprender Libras é valorizar a comunicação acessível, a cultura surda e o direito de participação de todas as pessoas.', key: 'Evite generalizações. Valorize pessoas surdas e profissionais qualificados como referências na aprendizagem.' }
  ];

  const CONCEPTS = [
    { q: 'Qual alternativa descreve corretamente a Libras?', a: ['É português traduzido palavra por palavra com as mãos.', 'É uma língua visual-espacial com gramática própria.', 'É um conjunto de gestos improvisados.'], ok: 1, why: 'Libras tem estrutura e gramática próprias.' },
    { q: 'Ao conversar em Libras, para onde devo olhar?', a: ['Só para as mãos.', 'Para a pessoa por inteiro: mãos, rosto e corpo.', 'Para baixo, por respeito.'], ok: 1, why: 'Expressões faciais e corporais fazem parte da língua.' },
    { q: 'Qual é uma boa forma de aprender um sinal?', a: ['Confiar em qualquer imagem da internet.', 'Inventar quando não souber.', 'Aprender com demonstrações contextualizadas e pessoas fluentes.'], ok: 2, why: 'Sinais precisam de contexto e validação.' },
    { q: 'Para que serve o alfabeto manual (datilologia)?', a: ['Soletrar nomes próprios e palavras sem sinal conhecido.', 'Substituir todos os sinais da Libras.', 'Nada, ele não é usado.'], ok: 0, why: 'A datilologia complementa os sinais, não os substitui.' }
  ];

  const DRIVE = ['1Iqk4nNmxHRDflsAnIaJQY-ALz90Js-gZ', '1oJCLIpv1bOmp2cpSwBpiYErzHx1M8YE7', '1HVlERFqRVTkPzZwuOr_xpEdu0l1yM7hj', '1AeDV65-j3rItJSgLrRIellnAztHpUBbW', '13Qq86YY08yBuU8VVWpN9kwoeuXDDv8qB', '1jW5Yl3U-3QiW_nSectnOgzIYnHq1Hcyk', '1r50y8r7n_F5uiN3LqyAyADpSN2-hKnxa', '1D8dI32c2FROtnPhW6tioEuXwCW0dkSyQ', '1nUYHVpMz9ICF8ydZs4OU-HAdUq4TVq2Q', '1bw-GloAj2vCvHsqOCTLyI4N7grTeug9z', '1UhkAwxwYJdyFz7Yt1Q2PqzfqcGNf2AHU', '1ZaqWPEfp6L4OMQNANj_fKvQoYaamKgZy', '18zqgX95lrgV9lDftdZ8Av66ObgcH4lDR', '1XQMdmdm9qLJPkINkqTLIwp0opIq7x_Mo', '1d1DKKTYbLdU3-hBl8H1crA5ZFEQ1UCEo', '1UFSkdV8cTVlA-6vThPQN67yPpMaRvTC5', '1KdrVSq7QHpCJDDBeBW5pFdpbhI8B2q4_', '1oa9pXr_x0soIWVeQoe3Wm5M45d8KtoWO', '1kJd4s9F3k1v-t7cu6bhgoCefhMyfypCe', '1x43npTj7w3DDB9xBvbfL8bef7pjL1LXI', '1zThzOi4VT2SY7AwXydLp2P47dzFoGDIV', '1KjaIQ8-G_JHCQRkJoXZymDmaewEmrwKO', '1BWJ2qKRhgVq-HSyM0eCBQG8EgfFJOhDE'];

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
  const PAGES = ['inicio', 'aulas', 'aula', 'atividade', 'alfabeto', 'praticar', 'videos', 'perfil'];
  const NAV_OF = { aula: 'aulas', atividade: 'aulas', videos: 'videos' };
  function route() {
    let id = (location.hash || '#inicio').slice(1).split('/')[0];
    if (!PAGES.includes(id)) id = 'inicio';
    PAGES.forEach((p) => $('#' + p).classList.toggle('on', p === id));
    const nav = NAV_OF[id] || id;
    $$('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === (nav === 'videos' && a.closest('.bottom') ? 'aulas' : nav)));
    if (id !== 'alfabeto') $('#abVideo').pause();
    if (id !== 'praticar') stopGame();
    if (id !== 'videos') closeDrive();
    if (id === 'inicio') renderHome();
    if (id === 'aulas') renderModules();
    if (id === 'aula') renderLesson();
    if (id === 'atividade') { startConcepts(conceptFrom); conceptFrom = 'aula'; }
    if (id === 'alfabeto') showLetter(abIndex);
    if (id === 'praticar') renderPracticeMenu();
    if (id === 'perfil') renderProfile();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* ---------- Progresso ---------- */
  function percent() {
    const parts = st.seen.length / LETTERS.length * 0.5 + (st.lessonDone ? 0.3 : 0) + Math.min(st.best, 10) / 10 * 0.2;
    return Math.round(parts * 100);
  }

  function renderHome() {
    const p = percent();
    $('#ringFg').style.strokeDasharray = p + ' 100';
    $('#ringTxt').textContent = p + '%';
    let html;
    if (!st.lessonDone) html = '<div><strong>Comece pela Aula 01</strong><p>Três conteúdos curtos e uma atividade.</p></div><a class="btn gold" href="#aula">Começar a aula →</a>';
    else if (st.seen.length < LETTERS.length) html = '<div><strong>Continue no alfabeto manual</strong><p>' + st.seen.length + ' de 27 letras vistas.</p></div><a class="btn" href="#alfabeto">Continuar →</a>';
    else html = '<div><strong>Hora de praticar!</strong><p>Melhor resultado: ' + st.best + ' de 10.</p></div><a class="btn" href="#praticar">Praticar →</a>';
    $('#continueBox').innerHTML = html;
  }

  function renderModules() {
    const mods = [
      { href: '#aula', icon: '🌱', c: '#25b7a8', t: 'Módulo 01 · Primeiros passos', d: 'O que é Libras, comunicação visual e respeito.', s: st.lessonDone ? 'Concluído' : '3 conteúdos', done: st.lessonDone },
      { href: '#alfabeto', icon: '✋', c: '#7b4fe0', t: 'Módulo 02 · Alfabeto manual', d: '27 vídeos: A–Z + Ç.', s: st.seen.length + '/27', done: st.seen.length === 27 },
      { href: '#videos', icon: '▶️', c: '#2878c8', t: 'Aulas da Professora Jocimara', d: '23 gravações em vídeo.', s: '23 vídeos' },
      { href: '#praticar', icon: '🎯', c: '#1f9d6b', t: 'Praticar', d: 'Reconheça letras e revise conceitos.', s: st.best ? 'Melhor: ' + st.best + '/10' : 'Novo' },
      { icon: '📚', c: '#e0a100', t: 'Módulo 03 · Vocabulário', d: 'Família, escola, números e sentimentos.', s: 'Em breve', soon: true },
      { icon: '💬', c: '#e0457b', t: 'Módulo 04 · Frases e diálogos', d: 'Situações do dia a dia.', s: 'Em breve', soon: true }
    ];
    $('#modules').innerHTML = mods.map((m) => (m.soon ? '<div class="module soon" aria-disabled="true">' : '<a class="module" href="' + m.href + '">') +
      '<span class="qi" style="--c:' + m.c + '">' + m.icon + '</span><div><strong>' + m.t + '</strong><small>' + m.d + '</small></div><span class="state' + (m.done ? ' done' : '') + '">' + m.s + '</span>' + (m.soon ? '</div>' : '</a>')).join('');
  }

  /* ---------- Aula 01 ---------- */
  let ls = 0;
  function renderLesson() {
    const d = LESSON[ls];
    $('#lsTitle').textContent = d.title;
    $('#lsEmoji').textContent = d.emoji;
    $('#lsVisual').textContent = d.visual;
    $('#lsDesc').textContent = d.desc;
    $('#lsText').textContent = d.text;
    $('#lsKey').textContent = d.key;
    $('#lsStep').textContent = 'CONTEÚDO ' + (ls + 1) + ' DE ' + LESSON.length;
    $('#lsBar').style.width = ((ls + 1) / LESSON.length * 100) + '%';
    $('#lsPrev').disabled = ls === 0;
    $('#lsNext').textContent = ls === LESSON.length - 1 ? 'Ir para a atividade →' : 'Próximo →';
  }
  $('#lsPrev').addEventListener('click', () => { if (ls > 0) { ls--; renderLesson(); } });
  $('#lsNext').addEventListener('click', () => { if (ls < LESSON.length - 1) { ls++; renderLesson(); } else { ls = 0; location.hash = '#atividade'; } });

  /* Atividade de conceitos (usada pela aula e pelo Praticar) */
  let cq = 0, cScore = 0, cFrom = 'aula', conceptFrom = 'aula';
  function startConcepts(from) { cFrom = from || 'aula'; cq = 0; cScore = 0; renderConcept(); }
  function renderConcept() {
    const box = $('#conceptQuiz');
    if (cq >= CONCEPTS.length) {
      const passed = cScore >= 3;
      if (passed && cFrom === 'aula') { st.lessonDone = true; save(); }
      box.innerHTML = '<div class="done-box">' + (passed ? '🎉' : '📘') + '</div><h2>' + (passed ? 'Parabéns! Você concluiu a Aula 01.' : 'Quase lá!') + '</h2><p class="muted">Você acertou ' + cScore + ' de ' + CONCEPTS.length + '. ' + (passed ? 'Esta conclusão registra a realização da aula; não é certificado de proficiência.' : 'Revise o conteúdo e tente de novo.') + '</p>' +
        '<div class="row" style="flex-wrap:wrap;justify-content:center">' + (passed ? '<a class="btn gold" href="#alfabeto">Próximo: Alfabeto manual →</a>' : '<a class="btn" href="#aula">Revisar a aula</a>') + '<button class="btn pale" type="button" id="cAgain">Refazer</button></div>';
      $('#cAgain').onclick = () => startConcepts(cFrom);
      return;
    }
    const q = CONCEPTS[cq];
    box.innerHTML = '<span class="pill">Pergunta ' + (cq + 1) + ' de ' + CONCEPTS.length + '</span><h2>' + q.q + '</h2><div class="choices" id="cChoices">' +
      q.a.map((t, i) => '<button type="button" data-i="' + i + '">' + t + '</button>').join('') + '</div><div class="feedback" id="cFb" aria-live="polite"></div><button class="btn" id="cNext" type="button" hidden>Continuar →</button>';
    $$('#cChoices button').forEach((b) => b.addEventListener('click', () => {
      const i = +b.dataset.i, ok = i === q.ok;
      if (ok) cScore++;
      $$('#cChoices button').forEach((x, j) => { x.disabled = true; if (j === q.ok) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      const fb = $('#cFb'); fb.textContent = (ok ? 'Correto! ' : 'Não é essa. ') + q.why; fb.style.color = ok ? 'var(--ok)' : 'var(--bad)';
      $('#cNext').hidden = false; $('#cNext').focus();
    }));
    $('#cNext').addEventListener('click', () => { cq++; renderConcept(); });
  }

  /* ---------- Alfabeto ---------- */
  let abIndex = Math.min(st.lastLetter || 0, LETTERS.length - 1);
  const abVideo = $('#abVideo');
  const grid = $('#letters');
  LETTERS.forEach((l, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = l; b.setAttribute('aria-label', 'Letra ' + l);
    b.addEventListener('click', () => showLetter(i, true));
    grid.appendChild(b);
  });
  function paintLetters() {
    [...grid.children].forEach((b, i) => {
      b.classList.toggle('on', i === abIndex);
      b.classList.toggle('seen', st.seen.includes(LETTERS[i]));
      b.classList.toggle('isfav', st.favs.includes(LETTERS[i]));
    });
  }
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
    if (!abVideo.src.endsWith(src(l).slice(1))) { abVideo.poster = poster(l); abVideo.src = src(l); }
    abVideo.playbackRate = slow ? 0.5 : 1;
    if (!st.seen.includes(l)) st.seen.push(l);
    save(); paintLetters();
    abVideo.play().catch(() => {});
  }
  let slow = false;
  abVideo.addEventListener('loadeddata', () => { abVideo.playbackRate = slow ? 0.5 : 1; });
  $('#abPrev').addEventListener('click', () => abIndex > 0 && showLetter(abIndex - 1));
  $('#abNext').addEventListener('click', () => abIndex < LETTERS.length - 1 && showLetter(abIndex + 1));
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
    if (e.key === 'ArrowRight' && abIndex < LETTERS.length - 1) showLetter(abIndex + 1);
    if (e.key === 'ArrowLeft' && abIndex > 0) showLetter(abIndex - 1);
  });
  /* deslizar no vídeo (celular) */
  let tx = null;
  abVideo.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  abVideo.addEventListener('touchend', (e) => {
    if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (dx < -50 && abIndex < LETTERS.length - 1) showLetter(abIndex + 1);
    if (dx > 50 && abIndex > 0) showLetter(abIndex - 1);
  });

  /* ---------- Praticar: Qual é a letra? ---------- */
  const ROUNDS = 10;
  let gRound = 0, gScore = 0, gAnswer = null, gPool = [];
  const gVideo = $('#gVideo');
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function renderPracticeMenu() {
    $('#practiceMenu').hidden = false; $('#game').hidden = true;
    $('#bestScore').textContent = st.best ? 'Seu melhor: ' + st.best + ' de ' + ROUNDS : '';
  }
  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.mode === 'conceitos') { conceptFrom = 'praticar'; location.hash = '#atividade'; return; }
    startGame();
  }));
  function startGame() {
    gRound = 0; gScore = 0; gPool = shuffle(LETTERS).slice(0, ROUNDS);
    $('#practiceMenu').hidden = true; $('#game').hidden = false;
    nextRound();
  }
  function stopGame() { gVideo.pause(); }
  function nextRound() {
    if (gRound >= ROUNDS) return endGame();
    gAnswer = gPool[gRound];
    $('#gRound').textContent = (gRound + 1) + ' / ' + ROUNDS;
    $('#gScore').textContent = gScore + ' acerto' + (gScore === 1 ? '' : 's');
    $('#gFeedback').textContent = ''; $('#gNext').hidden = true;
    gVideo.removeAttribute('poster');
    gVideo.src = src(gAnswer); gVideo.play().catch(() => {});
    const opts = shuffle([gAnswer, ...shuffle(LETTERS.filter((l) => l !== gAnswer)).slice(0, 3)]);
    $('#gChoices').innerHTML = opts.map((l) => '<button type="button" data-l="' + l + '">' + l + '</button>').join('');
    $$('#gChoices button').forEach((b) => b.addEventListener('click', () => answer(b)));
  }
  function answer(b) {
    const ok = b.dataset.l === gAnswer;
    if (ok) gScore++;
    $$('#gChoices button').forEach((x) => { x.disabled = true; if (x.dataset.l === gAnswer) x.classList.add('right'); });
    if (!ok) b.classList.add('wrong');
    const fb = $('#gFeedback');
    fb.textContent = ok ? 'Muito bem! É a letra ' + gAnswer + '.' : 'Era a letra ' + gAnswer + '. Assista de novo e siga em frente.';
    fb.style.color = ok ? 'var(--ok)' : 'var(--bad)';
    $('#gScore').textContent = gScore + ' acerto' + (gScore === 1 ? '' : 's');
    gRound++;
    $('#gNext').textContent = gRound >= ROUNDS ? 'Ver resultado →' : 'Próxima →';
    $('#gNext').hidden = false; $('#gNext').focus();
  }
  function endGame() {
    gVideo.pause();
    st.games++; if (gScore > st.best) st.best = gScore; save();
    $('#gChoices').innerHTML = '';
    $('#gRound').textContent = 'Fim';
    $('#gFeedback').innerHTML = '<span style="font-size:2.4em">' + (gScore >= 8 ? '🏆' : gScore >= 5 ? '👏' : '💪') + '</span><br>Você acertou ' + gScore + ' de ' + ROUNDS + '!';
    $('#gFeedback').style.color = 'var(--navy2)';
    $('#gNext').textContent = 'Jogar de novo'; $('#gNext').hidden = false;
    $('#gNext').dataset.again = '1';
  }
  $('#gNext').addEventListener('click', (e) => {
    if (e.currentTarget.dataset.again) { delete e.currentTarget.dataset.again; startGame(); } else nextRound();
  });
  $('#gExit').addEventListener('click', () => { stopGame(); renderPracticeMenu(); });

  /* ---------- Vídeos da professora ---------- */
  $('#vGrid').innerHTML = DRIVE.map((id, i) => '<button type="button" class="vcard" data-v="' + i + '"><span class="thumb">▶</span><strong>Aula ' + String(i + 1).padStart(2, '0') + '</strong><small>Professora Jocimara</small></button>').join('');
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
      [st.lessonDone ? '✔' : '—', 'Aula 01 concluída'],
      [st.best + '/10', 'melhor no “Qual é a letra?”']
    ].map(([b, s]) => '<div class="stat"><b>' + b + '</b><span>' + s + '</span></div>').join('');
    $('#favList').innerHTML = st.favs.length
      ? st.favs.map((l) => '<a href="#alfabeto" data-letter="' + l + '" aria-label="Abrir letra ' + l + '">' + l + '</a>').join('')
      : '<p class="muted">Toque no ♡ de uma letra no Alfabeto para guardá-la aqui.</p>';
    $$('#favList a').forEach((a) => a.addEventListener('click', () => { abIndex = LETTERS.indexOf(a.dataset.letter); }));
  }
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Apagar todo o progresso e favoritos deste aparelho?')) return;
    const prefs = st.prefs; st = Object.assign({}, defaults, { prefs, splashSeen: true, seen: [], favs: [] }); save(); renderProfile();
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

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  applyPrefs();
  route();
})();
