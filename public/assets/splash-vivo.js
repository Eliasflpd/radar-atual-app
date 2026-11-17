/* Capa de abertura viva (17/11/2026, pedido do Elias: "pega esse globo e coloca ele animado, que ele aja de acordo").
   A arte continua a mesma (capa-2026-10.jpg, 800x1423). Por cima dela, nas medidas exatas da arte:
   - o feixe do radar varrendo o globo (centro 400,345; raio 175);
   - ondas saindo do centro do radar;
   - pontos de luz que acendem quando o feixe passa;
   - o radar do logo (centro 177,755; raio 98) girando junto.
   Tudo em CSS, sem imagem nova. Quem pede "menos movimento" no celular vê a capa parada. */
(function(){
  var splash = document.getElementById('splash');
  if(!splash) return;
  var img = splash.querySelector('img');
  if(!img) return;
  var W0 = 800, H0 = 1423;

  var css = ''
  // a home nova (radar.css: #home{display:flex}) fica sempre ligada e cobria a capa; enquanto a capa está ativa, ela vem por cima
  + '#splash.ativa{z-index:60}'
  + '#sv-palco{position:absolute;left:0;top:0;width:'+W0+'px;height:'+H0+'px;transform-origin:0 0;z-index:2;pointer-events:none}'
  + '#sv-palco *{position:absolute;pointer-events:none}'
  + '.sv-feixe{border-radius:50%;mix-blend-mode:screen;'
  +   'background:conic-gradient(from 0deg,rgba(255,196,70,0) 0deg,rgba(255,196,70,0) 260deg,rgba(255,200,80,.03) 285deg,rgba(255,200,80,.08) 310deg,rgba(255,205,90,.16) 330deg,rgba(255,212,105,.27) 345deg,rgba(255,222,130,.42) 354deg,rgba(255,240,190,.95) 359.3deg,rgba(255,240,190,0) 360deg);-webkit-mask:radial-gradient(circle closest-side,#000 82%,transparent 100%);mask:radial-gradient(circle closest-side,#000 82%,transparent 100%);'
  +   'animation:sv-gira 2s linear infinite}'
  + '.sv-onda{border-radius:50%;border:2px solid rgba(255,206,96,.75);box-shadow:0 0 14px rgba(255,200,80,.45);opacity:0;animation:sv-onda 2.2s ease-out infinite}'
  + '.sv-ponto{width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#ffe39a;box-shadow:0 0 10px 4px rgba(255,205,90,.9);opacity:0;animation:sv-pisca 2s linear infinite}'
  + '.sv-brilho{border-radius:50%;mix-blend-mode:screen;background:radial-gradient(circle,rgba(255,215,120,.22) 0%,rgba(255,215,120,0) 70%);animation:sv-respira 2.2s ease-in-out infinite}'
  + '.sv-logo{border-radius:50%;mix-blend-mode:screen;'
  +   'background:conic-gradient(from 0deg,rgba(255,196,70,0) 0deg,rgba(255,196,70,0) 280deg,rgba(255,205,90,.08) 320deg,rgba(255,215,110,.25) 348deg,rgba(255,240,180,.9) 359.3deg,rgba(255,240,180,0) 360deg);-webkit-mask:radial-gradient(circle closest-side,#000 80%,transparent 100%);mask:radial-gradient(circle closest-side,#000 80%,transparent 100%);'
  +   'animation:sv-gira 2s linear infinite}'
  + '@keyframes sv-gira{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'
  + '@keyframes sv-onda{0%{transform:scale(.15);opacity:.9}80%{opacity:.15}100%{transform:scale(1);opacity:0}}'
  + '@keyframes sv-pisca{0%,100%{opacity:0;transform:scale(.6)}6%{opacity:1;transform:scale(1.4)}30%{opacity:.25;transform:scale(1)}}'
  + '@keyframes sv-respira{0%,100%{opacity:.5;transform:scale(.96)}50%{opacity:1;transform:scale(1.04)}}'
  + '@media (prefers-reduced-motion:reduce){#sv-palco{display:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var palco = document.createElement('div'); palco.id = 'sv-palco';
  function bola(cls, cx, cy, r, extra){
    var d = document.createElement('div'); d.className = cls;
    d.style.left = (cx - r) + 'px'; d.style.top = (cy - r) + 'px';
    d.style.width = d.style.height = (2 * r) + 'px';
    if(extra) d.setAttribute('style', d.getAttribute('style') + ';' + extra);
    palco.appendChild(d); return d;
  }
  // brilho que respira atrás do globo e o feixe
  bola('sv-brilho', 400, 345, 230);
  // o feixe começa onde a arte já tem a linha dourada (para cima e à direita) e segue girando
  bola('sv-feixe', 400, 345, 176, 'animation-delay:-0.23s');
  // ondas do radar
  bola('sv-onda', 400, 345, 260);
  bola('sv-onda', 400, 345, 260, 'animation-delay:-0.73s');
  bola('sv-onda', 400, 345, 260, 'animation-delay:-1.46s');
  // pontos que acendem quando o feixe passa (o atraso acompanha o ângulo de cada ponto)
  [[455,300],[372,262],[318,330],[430,410],[350,440],[500,360],[392,350]].forEach(function(p){
    var ang = Math.atan2(p[0] - 400, -(p[1] - 345)) * 180 / Math.PI; if(ang < 0) ang += 360;
    var atraso = ((ang / 360) * 2 - 0.23 + 4) % 2;   // mesmo período e mesma fase do feixe
    var d = document.createElement('div'); d.className = 'sv-ponto';
    d.style.left = p[0] + 'px'; d.style.top = p[1] + 'px'; d.style.animationDelay = (-(2 - atraso)) + 's';
    palco.appendChild(d);
  });
  // o radar do logo
  bola('sv-logo', 177, 755, 97, 'animation-delay:-0.3s');
  bola('sv-onda', 177, 755, 120, 'animation-delay:-0.4s;border-width:1.5px');

  // 17/11/2026: capa com dois caminhos — a arte fica dentro de .sv-arte (cortada embaixo, largura da caixa);
  // sem ela, vale o encaixe antigo (arte inteira com object-fit:contain).
  var arte = splash.querySelector('.sv-arte');
  (arte || splash).appendChild(palco);

  // encaixa o palco exatamente sobre a arte
  function encaixar(){
    if(arte){
      var w = arte.clientWidth; if(!w) return;
      palco.style.transform = 'scale(' + (w / W0) + ')';
      return;
    }
    var W = splash.clientWidth, H = splash.clientHeight;
    if(!W || !H) return;
    var s = Math.min(W / W0, H / H0);
    var ox = (W - W0 * s) / 2, oy = (H - H0 * s) / 2;
    palco.style.transform = 'translate(' + ox + 'px,' + oy + 'px) scale(' + s + ')';
  }
  encaixar();
  window.addEventListener('resize', encaixar);
  if(img && !img.complete){ img.addEventListener('load', encaixar); }
})();
