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
  queda: { livro: 'Gênesis 3', titulo: 'A escolha do homem', nota: 'Cenas ilustrativas. As notas separam o texto bíblico da interpretação.', quadros: [
    { img: 'queda-01-arvore', ref: 'Gênesis 2:16–17', txt: "Ordenou o Senhor Deus ao homem, dizendo: De toda árvore do jardim podes comer livremente; mas da árvore do conhecimento do bem e do mal, dessa não comerás; porque no dia em que dela comeres, certamente morrerás.", ponto: "A ordem e a liberdade", notas: ["“De toda árvore podes comer livremente”: a regra começa pela abundância; a proibição é uma só (2:16–17).", "A ordem foi dada ao homem antes de a mulher ser formada (2:18–22): ele era o portador da palavra recebida."] },
    { img: 'queda-02-serpente', ref: 'Gênesis 3:1', txt: "Ora, a serpente era o mais astuto de todos os animais do campo, que o Senhor Deus tinha feito. E esta disse à mulher: É assim que Deus disse: Não comereis de toda árvore do jardim?", ponto: "A pergunta que distorce", notas: ["A serpente começa com uma pergunta que aumenta a proibição (“de toda árvore?”) e depois nega a consequência (“certamente não morrereis”, 3:4).", "Apocalipse 12:9 e 20:2 identificam “a antiga serpente” com o diabo: leitura do Novo Testamento sobre o texto (interpretação canônica)."] },
    { img: 'queda-03-eva', ref: 'Gênesis 3:6', txt: "Então, vendo a mulher que aquela árvore era boa para se comer, e agradável aos olhos, e árvore desejável para dar entendimento, tomou do seu fruto, comeu, e deu a seu marido, e ele também comeu.", ponto: "Ver, desejar, tomar", notas: ["Três passos no texto: “boa para se comer”, “agradável aos olhos”, “desejável para dar entendimento” (3:6).", "Paralelos que muitos intérpretes apontam: 1 João 2:16 (concupiscência da carne, dos olhos, soberba da vida) e a tentação de Jesus (Mt 4:1–11). São conexões interpretativas, não citações diretas."] },
    { img: 'queda-04-adao', ref: 'Gênesis 3:6, 17', txt: "Então, vendo a mulher que aquela árvore era boa para se comer, e agradável aos olhos, e árvore desejável para dar entendimento, tomou do seu fruto, comeu, e deu a seu marido, e ele também comeu. … E ao homem disse: Porquanto deste ouvidos à voz de tua mulher, e comeste da árvore de que te ordenei dizendo: Não comerás dela; maldita é a terra por tua causa; em fadiga comerás dela todos os dias da tua vida.", ponto: "A escolha do homem", notas: ["No hebraico, 3:6 diz que ela deu “a seu marido, com ela” (עִמָּהּ, ‘immah): ele estava presente. Esta Almeida traduz só “deu a seu marido”; outras versões trazem “que estava com ela”.", "Deus não acusa Adão de comer apenas, mas de ter “dado ouvidos à voz de tua mulher” acima da ordem recebida (3:17): a raiz é a quem ele escolheu ouvir.", "Romanos 5:12 atribui a entrada do pecado “por um homem”: Paulo lê a responsabilidade principal em Adão."] },
    { img: 'queda-05-olhos', ref: 'Gênesis 3:7', txt: "Então foram abertos os olhos de ambos, e conheceram que estavam nus; pelo que coseram folhas de figueira, e fizeram para si aventais.", ponto: "Olhos abertos, vergonha", notas: ["A promessa da serpente (“vossos olhos se abrirão”) se cumpre de forma trágica: o que eles veem é a própria nudez (3:7).", "As folhas de figueira: a primeira tentativa humana de se cobrir por conta própria."] },
    { img: 'queda-06-onde-estas', ref: 'Gênesis 3:8–9', txt: "E, ouvindo a voz do Senhor Deus, que passeava no jardim à tardinha, esconderam-se o homem e sua mulher da presença do Senhor Deus, entre as árvores do jardim. Mas chamou o Senhor Deus ao homem, e perguntou-lhe: Onde estás?", ponto: "“Onde estás?”", notas: ["A primeira pergunta de Deus ao homem caído não é uma acusação: é um chamado (3:9).", "Deus chama “o homem” primeiro, embora a mulher tenha comido antes: o texto o trata como responsável."] },
    { img: 'queda-07-saida', ref: 'Gênesis 3:21, 23–24', txt: "E o Senhor Deus fez túnicas de peles para Adão e sua mulher, e os vestiu. … O Senhor Deus, pois, o lançou fora do jardim do Éden para lavrar a terra, de que fora tomado. E havendo lançado fora o homem, pôs ao oriente do jardim do Éden os querubins, e uma espada flamejante que se volvia por todos os lados, para guardar o caminho da árvore da vida.", ponto: "Graça na saída", notas: ["Antes de saírem, Deus mesmo os veste com túnicas de peles (3:21): cuidado no meio do juízo.", "Os querubins guardam “o caminho da árvore da vida” (3:24); Apocalipse 22:2, 14 mostra o acesso à árvore da vida restaurado."] }
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
    .lc-raiz.estudo .lc-q{right:22%;-webkit-mask-image:linear-gradient(90deg,#000 0%,#000 58%,rgba(0,0,0,.55) 75%,transparent 100%);mask-image:linear-gradient(90deg,#000 0%,#000 58%,rgba(0,0,0,.55) 75%,transparent 100%)}
    .lc-raiz.estudo .lc-fundo{position:absolute;inset:-8%;background-size:cover;background-position:center;filter:blur(38px) brightness(.45) saturate(1.2);transition:background-image 1.5s ease}
    .lc-vin{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 50%,rgba(0,0,0,.65) 100%),linear-gradient(180deg,rgba(0,0,0,.35),transparent 25%,transparent 55%,rgba(0,0,0,.85))}
    .lc-tit{position:absolute;left:0;right:0;top:9%;text-align:center;color:#F3E2B3;font:600 15px Inter,sans-serif;letter-spacing:.5em;text-transform:uppercase;opacity:0;transition:opacity 2s ease 1s}
    .lc-raiz.on .lc-tit{opacity:.85}
    .lc-txt{position:absolute;left:50%;bottom:11%;transform:translateX(-50%);width:min(980px,86%);text-align:center;color:#fff;font:italic 500 clamp(22px,2.6vw,38px)/1.35 "Cormorant Garamond",Georgia,serif;text-shadow:0 2px 24px rgba(0,0,0,.9)}
    .lc-txt span{opacity:0;transition:opacity .9s ease}.lc-txt span.v{opacity:1}
    .lc-ref{position:absolute;left:50%;bottom:6.5%;transform:translateX(-50%);color:#E9C878;font:700 12.5px Inter,sans-serif;letter-spacing:.25em;text-transform:uppercase;opacity:0;transition:opacity 1s ease}
    .lc-ref.v{opacity:.95}
    .lc-pontos{position:absolute;left:50%;bottom:3%;transform:translateX(-50%);display:flex;gap:8px}
    .lc-raiz.estudo .lc-txt{left:auto;right:4%;transform:none;width:min(560px,44%);text-align:right;bottom:12%;font-size:clamp(16px,1.45vw,22px);max-height:30%;overflow:hidden;background:linear-gradient(90deg,transparent,rgba(0,0,0,.35));padding:8px 0 8px 18px;border-radius:10px}.lc-raiz.estudo .lc-ref{left:auto;right:4%;transform:none;bottom:8%}.lc-raiz.estudo .lc-tit{left:auto;right:4%;text-align:right;top:10%}.lc-raiz.estudo .lc-pontos{left:auto;right:4%;transform:none}.lc-raiz.estudo .lc-dica{left:auto;right:22px;top:60px}.lc-nota{position:absolute;left:50%;transform:translateX(-50%);bottom:1.2%;max-width:60%;text-align:center;color:rgba(255,236,190,.65);font:11px/1.4 Inter,sans-serif}
    .lc-notas{position:absolute;right:4%;top:24%;max-height:34%;overflow:auto;width:min(460px,40%);display:flex;flex-direction:column;gap:8px}.lc-notas div{background:rgba(8,14,30,.55);backdrop-filter:blur(10px);border:1px solid rgba(243,211,142,.3);border-radius:12px;padding:9px 12px;color:#F7F3E8;font:13px/1.5 Inter,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.5);opacity:0;transform:translateY(6px);transition:all .6s ease}.lc-notas div.v{opacity:1;transform:none}.lc-ponto{position:absolute;right:4%;top:16%;color:#FFE3A3;font:600 26px 'Cormorant Garamond',Georgia,serif;text-shadow:0 2px 14px #000}
    .lc-raiz.pulpito .lc-notas,.lc-raiz.pulpito .lc-nota,.lc-raiz.pulpito .lc-dica{display:none}.lc-raiz.pulpito .lc-txt{left:50%!important;right:auto!important;transform:translateX(-50%)!important;width:86%!important;text-align:center!important;font-size:clamp(28px,3.4vw,52px)!important}.lc-raiz.pulpito .lc-ref,.lc-raiz.pulpito .lc-tit,.lc-raiz.pulpito .lc-pontos,.lc-raiz.pulpito .lc-ponto{left:50%!important;right:auto!important;transform:translateX(-50%)!important;text-align:center}
    .lc-pulp{position:absolute;right:180px;top:20px;border:1px solid rgba(255,255,255,.4);background:rgba(0,0,0,.35);backdrop-filter:blur(6px);color:#fff;border-radius:999px;padding:8px 15px;font:600 12.5px Inter,sans-serif;cursor:pointer}
    .lc-pontos i{cursor:pointer;width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.3);transition:all .4s}.lc-pontos i.a{background:#F3D38E;width:22px;border-radius:4px}
    .lc-pular{position:absolute;right:22px;top:20px;border:1px solid rgba(255,255,255,.4);background:rgba(0,0,0,.35);backdrop-filter:blur(6px);color:#fff;border-radius:999px;padding:8px 15px;font:600 12.5px Inter,sans-serif;cursor:pointer}
    .lc-dica{position:absolute;left:22px;top:22px;color:rgba(255,255,255,.65);font-size:12px}
    canvas.lc-poeira{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:screen}
  </style>
  <div class="lc-fundo"></div><div class="lc-quadros"></div><canvas class="lc-poeira"></canvas><div class="lc-vin"></div>
  <div class="lc-tit">${C.livro} · ${C.titulo}</div>
  <div class="lc-ponto"></div><div class="lc-notas"></div><div class="lc-txt"></div><div class="lc-ref"></div><div class="lc-pontos">${C.quadros.map(() => '<i></i>').join('')}</div>
  <div class="lc-dica">${estudo ? 'Clique na imagem ou nos pontos para passar' : 'Clique para avançar'}</div>${C.nota ? `<div class="lc-nota">${C.nota}</div>` : ''}${estudo ? '<button type="button" class="lc-pulp">⛶ Modo púlpito</button>' : ''}<button type="button" class="lc-pular">${estudo ? '✕ Sair do mundo' : 'Entrar no livro ›'}</button>`;
  if (estudo) raiz.classList.add('estudo'); host.appendChild(raiz);
  const box = raiz.querySelector('.lc-quadros'), txt = raiz.querySelector('.lc-txt'), ref = raiz.querySelector('.lc-ref'), pts = [...raiz.querySelectorAll('.lc-pontos i')];
  const els = C.quadros.map((q) => { const d = document.createElement('div'); d.className = 'lc-q'; d.style.backgroundImage = `url(/nexus/livros/${q.img}.jpg)`; box.appendChild(d); return d; });
  // pré-carrega
  C.quadros.forEach((q) => { const im = new Image(); im.src = `/nexus/livros/${q.img}.jpg`; });
  let n = -1, t0 = 0, auto = 0, fim = false;
  function mostrar(k) {
    if (k >= C.quadros.length) { terminar(); return; }
    els.forEach((e, i) => e.classList.toggle('vis', i === k)); n = k; t0 = performance.now(); { const f = raiz.querySelector('.lc-fundo'); if (f) f.style.backgroundImage = `url(/nexus/livros/${C.quadros[k].img}.jpg)`; }   // o fundo inteiro leva as cores da cena (desfocado), sem área preta
    pts.forEach((p, i) => p.classList.toggle('a', i === k));
    const q = C.quadros[k]; const pe = raiz.querySelector('.lc-ponto'), ne = raiz.querySelector('.lc-notas');
    pe.textContent = q.ponto ? `${k + 1}. ${q.ponto}` : ''; ne.innerHTML = estudo && q.notas ? q.notas.map((t) => `<div>${t}</div>`).join('') : ''; [...ne.children].forEach((d, i) => setTimeout(() => d.classList.add('v'), 1600 + i * 500));
    if (typeof window.NEXUS_MUNDO_QUADRO === 'function') window.NEXUS_MUNDO_QUADRO(k, C);
    txt.innerHTML = q.txt.split(' ').map((w) => `<span>${w} </span>`).join(''); ref.textContent = q.ref; ref.classList.remove('v');
    [...txt.children].forEach((s, i) => setTimeout(() => s.classList.add('v'), 700 + i * 90));
    setTimeout(() => ref.classList.add('v'), 900 + txt.children.length * 90);
    clearTimeout(auto); if (!estudo) auto = setTimeout(() => mostrar(n + 1), 9500 + txt.children.length * 60);
  }
  function terminar() { if (fim) return; fim = true; clearTimeout(auto); raiz.classList.remove('on'); setTimeout(() => { ativo = false; raiz.remove(); }, 1300); if (aoTerminar) setTimeout(aoTerminar, 300); }
  raiz.addEventListener('click', (e) => { if (e.target.closest('.lc-pulp')) { raiz.classList.toggle('pulpito'); const el = raiz.closest('.palco') || raiz; if (raiz.classList.contains('pulpito')) { el.requestFullscreen && el.requestFullscreen().catch(() => {}); } else if (document.fullscreenElement) document.exitFullscreen(); return; } if (e.target.closest('.lc-pular')) { terminar(); return; } const pi = pts.indexOf(e.target); if (pi >= 0) { mostrar(pi); return; } if (estudo && n >= C.quadros.length - 1) return; mostrar(n + 1); });
  const tecla = (e) => { if (!document.body.contains(raiz)) { window.removeEventListener('keydown', tecla); return; } if (e.key === 'Escape') terminar(); else if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter' || e.key === 'PageDown') { e.preventDefault(); if (n < C.quadros.length - 1) mostrar(n + 1); else if (!estudo) terminar(); } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); if (n > 0) mostrar(n - 1); } };
  window.addEventListener('keydown', tecla);
  // câmera de cinema: aproximação lenta e deriva; poeira de luz flutuando
  const cv = raiz.querySelector('.lc-poeira'), g = cv.getContext('2d'); const part = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.6, v: 0.00004 + Math.random() * 0.00012, a: Math.random() * 6.28 }));
  let ativo = true;
  function quadro(t) {
    if (!ativo) return;
    els.forEach((e, i) => { if (i !== n) return; const s0 = t / 1000; const sc = 1.06 + 0.035 * Math.sin(s0 / 9 + i), dx = 1.6 * Math.sin(s0 / 13 + i * 1.7), dy = 0.9 * Math.cos(s0 / 11 + i * 1.3); e.style.transform = `translate(${dx}%,${dy}%) scale(${sc})`; });   // respira em laço, sem fim
    const w = cv.width = raiz.clientWidth, h = cv.height = raiz.clientHeight; g.clearRect(0, 0, w, h);
    for (const p of part) { p.y -= p.v * 16; p.x += Math.sin(t / 3000 + p.a) * 0.0002; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); } g.globalAlpha = 0.35 + 0.35 * Math.sin(t / 900 + p.a); g.fillStyle = '#FFE9B8'; g.beginPath(); g.arc(p.x * w, p.y * h, p.r, 0, 6.29); g.fill(); }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame((t) => { raiz.classList.add('on'); setTimeout(() => mostrar(0), 600); quadro(t); });
  return { terminar, ir: (k) => mostrar(Math.max(0, Math.min(C.quadros.length - 1, k))), quadro: () => n, total: C.quadros.length };
}
