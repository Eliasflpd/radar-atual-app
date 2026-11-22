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
  trombetas: { livro: 'Apocalipse 8–11', titulo: 'As sete trombetas', nota: 'Quadros simbólicos do que o texto descreve. Há várias leituras do Apocalipse (futurista, histórica, preterista, idealista); a imagem não escolhe nenhuma.', quadros: [
    { img: 'trombetas-00-trono', ref: 'Apocalipse 8:1–2', txt: "Quando abriu o sétimo selo, fez-se silêncio no céu, quase por meia hora. E vi os sete anjos que estavam em pé diante de Deus, e lhes foram dadas sete trombetas." },
    { img: 'trombetas-00-altar', ref: 'Apocalipse 8:3–5', txt: "Veio outro anjo, e pôs-se junto ao altar, tendo um incensário de ouro; e foi-lhe dado muito incenso, para que o oferecesse com as orações de todos os santos sobre o altar de ouro que está diante do trono. E da mão do anjo subiu diante de Deus a fumaça do incenso com as orações dos santos. Depois do anjo tomou o incensário, encheu-o do fogo do altar e o lançou sobre a terra; e houve trovões, vozes, relâmpagos e terremoto." },
    { img: 'trombetas-01', ref: 'Apocalipse 8:7 · 1ª trombeta', txt: "O primeiro anjo tocou a sua trombeta, e houve saraiva e fogo misturado com sangue, que foram lançados na terra; e foi queimada a terça parte da terra, a terça parte das árvores, e toda a erva verde." },
    { img: 'trombetas-02', ref: 'Apocalipse 8:8–9 · 2ª trombeta', txt: "O segundo anjo tocou a sua trombeta, e foi lançado no mar como que um grande monte ardendo em fogo, e tornou-se em sangue a terça parte do mar. E morreu a terça parte das criaturas viventes que havia no mar, e foi destruída a terça parte dos navios." },
    { img: 'trombetas-03', ref: 'Apocalipse 8:10–11 · 3ª trombeta', txt: "O terceiro anjo tocou a sua trombeta, e caiu do céu uma grande estrela, ardendo como uma tocha, e caiu sobre a terça parte dos rios, e sobre as fontes das águas. O nome da estrela era Absinto; e a terça parte das águas tornou-se em absinto, e muitos homens morreram das águas, porque se tornaram amargas." },
    { img: 'trombetas-04', ref: 'Apocalipse 8:12 · 4ª trombeta', txt: "O quarto anjo tocou a sua trombeta, e foi ferida a terça parte do sol, a terça parte da lua, e a terça parte das estrelas; para que a terça parte deles se escurecesse, e a terça parte do dia não brilhante, e semelhantemente a da noite." },
    { img: 'trombetas-05', ref: 'Apocalipse 9:1–3 · 5ª trombeta', txt: "O quinto anjo tocou a sua trombeta, e vi uma estrela que do céu caíra sobre a terra; e foi-lhe dada a chave do poço do abismo. E abriu o poço do abismo, e subiu fumaça do poço, como fumaça de uma grande fornalha; e com a fumaça do poço escureceram-se o sol e o ar. Da fumaça saíram gafanhotos sobre a terra; e foi-lhes dado poder, como o que têm os escorpiões da terra." },
    { img: 'trombetas-06', ref: 'Apocalipse 9:13–16 · 6ª trombeta', txt: "O sexto anjo tocou a sua trombeta; e ouvi uma voz que vinha das quatro pontas do altar de ouro que estava diante de Deus, a qual dizia ao sexto anjo, que tinha a trombeta: Solta os quatro anjos que se acham presos junto do grande rio Eufrates. E foram soltos os quatro anjos que haviam sido preparados para aquela hora e dia e mês e ano, a fim de matarem a terça parte dos homens. O número dos exércitos dos cavaleiros era de duas miríades de miríades; pois ouvi o número deles." },
    { img: 'trombetas-07', ref: 'Apocalipse 11:15 · 7ª trombeta', txt: "E tocou o sétimo anjo a sua trombeta, e houve no céu grandes vozes, que diziam: O reino do mundo passou a ser de nosso Senhor e do seu Cristo, e ele reinará pelos séculos dos séculos." }
  ] },
};

export function tocarCinema(num, host, { aoTerminar, estudo = false } = {}) {
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
    .lc-raiz.estudo .lc-txt{left:auto;right:4%;transform:none;width:min(620px,52%);text-align:right;bottom:13%;font-size:clamp(19px,1.9vw,28px)}.lc-raiz.estudo .lc-ref{left:auto;right:4%;transform:none;bottom:8%}.lc-raiz.estudo .lc-tit{left:auto;right:4%;text-align:right}.lc-raiz.estudo .lc-pontos{left:auto;right:4%;transform:none}.lc-raiz.estudo .lc-dica{left:auto;right:22px;top:60px}.lc-nota{position:absolute;right:4%;top:15%;max-width:420px;text-align:right;color:rgba(255,236,190,.75);font:12px/1.5 Inter,sans-serif}
    .lc-pontos i{cursor:pointer;width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.3);transition:all .4s}.lc-pontos i.a{background:#F3D38E;width:22px;border-radius:4px}
    .lc-pular{position:absolute;right:22px;top:20px;border:1px solid rgba(255,255,255,.4);background:rgba(0,0,0,.35);backdrop-filter:blur(6px);color:#fff;border-radius:999px;padding:8px 15px;font:600 12.5px Inter,sans-serif;cursor:pointer}
    .lc-dica{position:absolute;left:22px;top:22px;color:rgba(255,255,255,.65);font-size:12px}
    canvas.lc-poeira{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:screen}
  </style>
  <div class="lc-quadros"></div><canvas class="lc-poeira"></canvas><div class="lc-vin"></div>
  <div class="lc-tit">${C.livro} · ${C.titulo}</div>
  <div class="lc-txt"></div><div class="lc-ref"></div><div class="lc-pontos">${C.quadros.map(() => '<i></i>').join('')}</div>
  <div class="lc-dica">${estudo ? 'Clique na imagem ou nos pontos para passar' : 'Clique para avançar'}</div>${C.nota ? `<div class="lc-nota">${C.nota}</div>` : ''}<button type="button" class="lc-pular">${estudo ? '✕ Sair do mundo' : 'Entrar no livro ›'}</button>`;
  if (estudo) raiz.classList.add('estudo'); host.appendChild(raiz);
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
    clearTimeout(auto); if (!estudo) auto = setTimeout(() => mostrar(n + 1), 9500 + txt.children.length * 60);
  }
  function terminar() { if (fim) return; fim = true; clearTimeout(auto); raiz.classList.remove('on'); setTimeout(() => { ativo = false; raiz.remove(); }, 1300); if (aoTerminar) setTimeout(aoTerminar, 300); }
  raiz.addEventListener('click', (e) => { if (e.target.closest('.lc-pular')) { terminar(); return; } const pi = pts.indexOf(e.target); if (pi >= 0) { mostrar(pi); return; } if (estudo && n >= C.quadros.length - 1) return; mostrar(n + 1); });
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
  return { terminar, ir: (k) => mostrar(Math.max(0, Math.min(C.quadros.length - 1, k))), quadro: () => n, total: C.quadros.length };
}
