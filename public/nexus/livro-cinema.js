// LIVRO EM CINEMA: ao entrar num livro, o universo se transforma no tema do livro.
// Sequência de quadros de cinema (imagens do ChatGPT, julgadas antes de entrar), um por clique,
// com o versículo da Almeida. No fim, o universo volta e a câmera pousa no livro.

export const CINEMA = {
  1: { livro: 'Gênesis', titulo: 'No princípio', quadros: [
    { img: 'genesis-01-trevas', ref: 'Gênesis 1:2', txt: 'E a terra era sem forma e vazia; e havia trevas sobre a face do abismo; e o Espírito de Deus se movia sobre a face das águas.' },
    { img: 'genesis-02-luz', ref: 'Gênesis 1:3', txt: 'E disse Deus: Haja luz; e houve luz.' },
    { img: 'genesis-03-firmamento', ref: 'Gênesis 1:6', txt: 'E disse Deus: Haja uma expansão no meio das águas, e haja separação entre águas e águas.' },
    { img: 'genesis-04-terra', ref: 'Gênesis 1:9, 11', txt: 'Ajuntem-se as águas debaixo dos céus num lugar, e apareça a porção seca… Produza a terra erva verde.' },
    { img: 'genesis-05-luzeiros', ref: 'Gênesis 1:16', txt: 'E fez Deus os dois grandes luminares: o luminar maior para governar o dia, e o luminar menor para governar a noite; e fez as estrelas.' },
    { img: 'genesis-06-vida', ref: 'Gênesis 1:20', txt: 'Produzam as águas abundantemente répteis de alma vivente; e voem as aves sobre a face da expansão dos céus.' },
    { img: 'genesis-07-eden', ref: 'Gênesis 2:8', txt: 'E plantou o Senhor Deus um jardim no Éden, da banda do oriente; e pôs ali o homem que tinha formado.' },
  ] },
};

export function tocarCinema(num, host, { aoTerminar } = {}) {
  const C = CINEMA[num]; if (!C) { if (aoTerminar) aoTerminar(); return null; }
  const raiz = document.createElement('div'); raiz.className = 'lc-raiz';
  raiz.innerHTML = `<style>
    .lc-raiz{position:absolute;inset:0;z-index:40;background:#000;overflow:hidden;pointer-events:auto;cursor:pointer;opacity:0;transition:opacity 1.2s ease;font-family:Inter,system-ui,sans-serif}
    .lc-raiz.on{opacity:1}
    .lc-q{position:absolute;inset:-6%;background-size:cover;background-position:center;opacity:0;transition:opacity 1.8s ease;will-change:transform,opacity}
    .lc-q.vis{opacity:1}
    .lc-vin{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 50%,rgba(0,0,0,.65) 100%),linear-gradient(180deg,rgba(0,0,0,.35),transparent 25%,transparent 55%,rgba(0,0,0,.85))}
    .lc-tit{position:absolute;left:0;right:0;top:9%;text-align:center;color:#F3E2B3;font:600 15px Inter,sans-serif;letter-spacing:.5em;text-transform:uppercase;opacity:0;transition:opacity 2s ease 1s}
    .lc-raiz.on .lc-tit{opacity:.85}
    .lc-txt{position:absolute;left:50%;bottom:11%;transform:translateX(-50%);width:min(980px,86%);text-align:center;color:#fff;font:italic 500 clamp(22px,2.6vw,38px)/1.35 "Cormorant Garamond",Georgia,serif;text-shadow:0 2px 24px rgba(0,0,0,.9)}
    .lc-txt span{opacity:0;transition:opacity .9s ease}.lc-txt span.v{opacity:1}
    .lc-ref{position:absolute;left:50%;bottom:6.5%;transform:translateX(-50%);color:#E9C878;font:700 12.5px Inter,sans-serif;letter-spacing:.25em;text-transform:uppercase;opacity:0;transition:opacity 1s ease}
    .lc-ref.v{opacity:.95}
    .lc-pontos{position:absolute;left:50%;bottom:3%;transform:translateX(-50%);display:flex;gap:8px}
    .lc-pontos i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.3);transition:all .4s}.lc-pontos i.a{background:#F3D38E;width:22px;border-radius:4px}
    .lc-pular{position:absolute;right:22px;top:20px;border:1px solid rgba(255,255,255,.4);background:rgba(0,0,0,.35);backdrop-filter:blur(6px);color:#fff;border-radius:999px;padding:8px 15px;font:600 12.5px Inter,sans-serif;cursor:pointer}
    .lc-dica{position:absolute;left:22px;top:22px;color:rgba(255,255,255,.65);font-size:12px}
    canvas.lc-poeira{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:screen}
  </style>
  <div class="lc-quadros"></div><canvas class="lc-poeira"></canvas><div class="lc-vin"></div>
  <div class="lc-tit">${C.livro} · ${C.titulo}</div>
  <div class="lc-txt"></div><div class="lc-ref"></div><div class="lc-pontos">${C.quadros.map(() => '<i></i>').join('')}</div>
  <div class="lc-dica">Clique para avançar</div><button type="button" class="lc-pular">Entrar no livro ›</button>`;
  host.appendChild(raiz);
  const box = raiz.querySelector('.lc-quadros'), txt = raiz.querySelector('.lc-txt'), ref = raiz.querySelector('.lc-ref'), pts = [...raiz.querySelectorAll('.lc-pontos i')];
  const els = C.quadros.map((q) => { const d = document.createElement('div'); d.className = 'lc-q'; d.style.backgroundImage = `url(/nexus/livros/${q.img}.jpg)`; box.appendChild(d); return d; });
  // pré-carrega
  C.quadros.forEach((q) => { const im = new Image(); im.src = `/nexus/livros/${q.img}.jpg`; });
  let n = -1, t0 = 0, auto = 0, fim = false;
  function mostrar(k) {
    if (k >= C.quadros.length) { terminar(); return; }
    els.forEach((e, i) => e.classList.toggle('vis', i === k)); n = k; t0 = performance.now();
    pts.forEach((p, i) => p.classList.toggle('a', i === k));
    const q = C.quadros[k]; txt.innerHTML = q.txt.split(' ').map((w) => `<span>${w} </span>`).join(''); ref.textContent = q.ref; ref.classList.remove('v');
    [...txt.children].forEach((s, i) => setTimeout(() => s.classList.add('v'), 700 + i * 90));
    setTimeout(() => ref.classList.add('v'), 900 + txt.children.length * 90);
    clearTimeout(auto); auto = setTimeout(() => mostrar(n + 1), 9500 + txt.children.length * 60);
  }
  function terminar() { if (fim) return; fim = true; clearTimeout(auto); raiz.classList.remove('on'); setTimeout(() => { ativo = false; raiz.remove(); }, 1300); if (aoTerminar) setTimeout(aoTerminar, 300); }
  raiz.addEventListener('click', (e) => { if (e.target.closest('.lc-pular')) { terminar(); return; } mostrar(n + 1); });
  const tecla = (e) => { if (!document.body.contains(raiz)) { window.removeEventListener('keydown', tecla); return; } if (e.key === 'Escape') terminar(); else if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); mostrar(n + 1); } };
  window.addEventListener('keydown', tecla);
  // câmera de cinema: aproximação lenta e deriva; poeira de luz flutuando
  const cv = raiz.querySelector('.lc-poeira'), g = cv.getContext('2d'); const part = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.6, v: 0.00004 + Math.random() * 0.00012, a: Math.random() * 6.28 }));
  let ativo = true;
  function quadro(t) {
    if (!ativo) return;
    els.forEach((e, i) => { const dt = i === n ? (t - t0) / 1000 : 0; const s = 1.0 + Math.min(0.09, dt * 0.008), dx = Math.sin(i * 1.7) * dt * 0.25, dy = Math.cos(i * 1.3) * dt * 0.12; if (i === n) e.style.transform = `translate(${dx}%,${dy}%) scale(${s})`; });
    const w = cv.width = raiz.clientWidth, h = cv.height = raiz.clientHeight; g.clearRect(0, 0, w, h);
    for (const p of part) { p.y -= p.v * 16; p.x += Math.sin(t / 3000 + p.a) * 0.0002; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); } g.globalAlpha = 0.35 + 0.35 * Math.sin(t / 900 + p.a); g.fillStyle = '#FFE9B8'; g.beginPath(); g.arc(p.x * w, p.y * h, p.r, 0, 6.29); g.fill(); }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame((t) => { raiz.classList.add('on'); setTimeout(() => mostrar(0), 600); quadro(t); });
  return { terminar, quadro: () => n };
}
