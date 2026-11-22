// TEMPLO DE SALOMÃO em 3D, construído só com as medidas do texto bíblico.
// Unidade do modelo: 1 côvado (cerca de 44,5 cm; o côvado real de Ez 40:5 tem cerca de 52 cm).
// Fontes de cada medida: 1 Reis 6–7; 2 Crônicas 3–4; a arca, Êxodo 25:10. Lugar: Monte Moriá (2 Cr 3:1).
// O que o texto não descreve (forma do telhado, cor da pedra, tamanho do pátio) aparece marcado como ilustrativo.
// Orientação: a entrada fica a leste (+x) e o Santo dos Santos a oeste (−x), como no tabernáculo (Êx 26:22; 27:13).

export const TEMPLO = { nome: 'Templo de Salomão', lat: 31.7778, lon: 35.2356, lugar: 'Monte Moriá, Jerusalém', ref: '2 Crônicas 3:1' };

export function abrirTemplo(THREE, host, { aoFechar } = {}) {
  const raiz = document.createElement('div'); raiz.className = 'tp-raiz';
  raiz.innerHTML = `<style>
    .tp-raiz{pointer-events:auto;position:absolute;inset:0;z-index:30;background:linear-gradient(180deg,#5E7FA8 0%,#A9BED3 45%,#E3D9C4 100%);font:13px Inter,system-ui,sans-serif;color:#E9EDF8;overflow:hidden}
    .tp-raiz canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}
    .tp-cab{position:absolute;left:16px;top:12px;right:360px;pointer-events:none}
    .tp-cab h2{margin:0;font:700 28px "Cormorant Garamond",Georgia,serif;color:#14213D;letter-spacing:.02em;text-shadow:0 1px 0 rgba(255,255,255,.5)}
    .tp-cab p{margin:2px 0 0;color:#22324F;font-size:12.5px;font-weight:600}
    .tp-painel{position:absolute;right:12px;top:12px;bottom:12px;width:330px;overflow:auto;background:rgba(5,11,26,.88);border:1px solid rgba(233,200,120,.35);border-radius:14px;padding:12px 14px;backdrop-filter:blur(6px)}
    .tp-painel h3{margin:4px 0 6px;font:700 18px "Cormorant Garamond",Georgia,serif;color:#F2DFAE}
    .tp-painel label{display:flex;align-items:center;gap:8px;padding:5px 2px;cursor:pointer;border-radius:6px}.tp-painel label:hover{background:rgba(201,162,78,.12)}
    .tp-painel input[type=checkbox]{accent-color:#C9A24E;width:16px;height:16px}
    .tp-painel small{color:rgba(210,218,236,.6)}
    .tp-bts{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
    .tp-bts button{border:1px solid rgba(233,200,120,.4);background:rgba(16,26,52,.85);color:#F2DFAE;border-radius:999px;padding:6px 11px;font:600 12px Inter,system-ui,sans-serif;cursor:pointer}
    .tp-bts button.ativo,.tp-bts button:hover{background:#C9A24E;color:#1B1405}
    .tp-ficha{margin-top:10px;border-top:1px solid rgba(233,200,120,.2);padding-top:10px}
    .tp-ficha b{color:#FFE8B0;font-size:14px}.tp-ficha p{margin:6px 0;line-height:1.5}.tp-ficha cite{display:block;color:#E9C878;font-style:normal;font-weight:600;font-size:12px;margin-top:4px}
    .tp-ficha .tp-aviso{color:#F3C98B;font-size:12px}
    .tp-fechar{position:absolute;left:16px;bottom:16px;border:1px solid rgba(233,200,120,.5);background:rgba(5,11,26,.9);color:#F2DFAE;border-radius:999px;padding:9px 16px;font:700 13px Inter,system-ui,sans-serif;cursor:pointer}
    .tp-dica{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);color:#3A2E1A;background:rgba(255,248,232,.7);padding:4px 12px;border-radius:999px;font-size:12px;white-space:nowrap}
    .tp-rot{position:absolute;pointer-events:none;transform:translate(-50%,-100%);background:rgba(5,11,26,.82);border:1px solid rgba(233,200,120,.35);color:#FFE8B0;border-radius:999px;padding:3px 9px;font:600 11.5px Inter,system-ui,sans-serif;white-space:nowrap}
    @media (max-width:900px){.tp-painel{top:auto;height:42%;left:12px;width:auto}.tp-cab{right:16px}.tp-dica{display:none}}
  </style>
  <canvas></canvas>
  <div class="tp-cab"><h2>Templo de Salomão</h2><p>Monte Moriá, Jerusalém (2 Cr 3:1) · 31,778° N, 35,236° L · medidas de 1 Reis 6–7 e 2 Crônicas 3–4 · 1 côvado ≈ 44,5 cm</p></div>
  <div class="tp-painel">
    <h3>Ver por fora e por dentro</h3>
    <div class="tp-bts">
      <button type="button" data-vista="fora" class="ativo">Por fora</button>
      <button type="button" data-vista="corte">Corte (por dentro)</button>
      <button type="button" data-vista="santo">Santo Lugar</button>
      <button type="button" data-vista="santissimo">Santo dos Santos</button>
      <button type="button" data-vista="cima">De cima</button>
    </div>
    <h3>Camadas</h3>
    <div class="tp-camadas"></div>
    <div class="tp-ficha"><b>Clique numa parte do templo</b><p>Cada parte mostra a medida e o versículo de onde ela vem.</p></div>
  </div>
  <button type="button" class="tp-fechar">↩ Voltar ao globo</button>
  <div class="tp-dica">Arraste para girar · roda aproxima · botão direito move · clique numa parte para ver o versículo</div>`;
  host.appendChild(raiz);
  const canvas = raiz.querySelector('canvas'), fichaEl = raiz.querySelector('.tp-ficha');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const cena = new THREE.Scene(); cena.fog = new THREE.Fog(0xc9d2da, 300, 760);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 3000);
  cena.add(new THREE.HemisphereLight(0xdfe8ff, 0x5a4a32, 0.9));
  const sol = new THREE.DirectionalLight(0xfff0d0, 2.1); sol.position.set(90, 160, 70); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.6;
  Object.assign(sol.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 10, far: 500 }); cena.add(sol);
  const luzDentro = new THREE.PointLight(0xffd59a, 0, 90, 1.6); luzDentro.position.set(-5, 14, 0); cena.add(luzDentro);   // a luz dos candelabros (só aparece no corte)

  // ── materiais ──
  const corte = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1000);   // corte longitudinal: tira a metade sul das paredes
  const tetoCorte = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);
  const M = (cor, extra = {}, cortavel = false) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85, metalness: 0, side: THREE.DoubleSide, ...(cortavel ? { clippingPlanes: [corte, tetoCorte], clipShadows: true } : {}), ...extra });
  const pedra = M(0xd9ccb0, {}, true), pedraClara = M(0xe8dcc0), cedro = M(0x8a5a32, { roughness: 0.7 }, true), ouro = M(0xd8b04a, { metalness: 0.85, roughness: 0.28 }, true);
  const ouroObj = M(0xe2bb55, { metalness: 0.9, roughness: 0.25 }), bronze = M(0xa06a35, { metalness: 0.75, roughness: 0.38 }), chao = M(0xb9a882), madeira = M(0x6e4424);
  const telhado = M(0x9a8462, {}, true), veu = M(0x2c3f8f, { roughness: 1 }, true);

  // ── camadas ──
  const camadas = []; const partes = [];
  function camada(id, nome, desc, visivel = true) { const g = new THREE.Group(); g.name = id; g.visible = visivel; cena.add(g); camadas.push({ id, nome, desc, g }); return g; }
  function caixa(g, [w, h, d], [x, y, z], mat, info) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; if (info) { m.userData.info = info; partes.push(m); } g.add(m); return m; }
  const P = (titulo, texto, ref, aviso) => ({ titulo, texto, ref, aviso });

  // medidas internas (1 Rs 6:2, 16–17, 20): casa 60×20×30; Santo Lugar 40×20; Santo dos Santos 20×20×20
  const X_SS0 = -30, X_SS1 = -10, X_SL1 = 30, LARG = 20, ALT = 30, ESP = 3;   // espessura da parede: o texto não dá (ilustrativa)
  // 1. Terreno e pátio
  const gPatio = camada('patio', 'Monte Moriá e pátio interior', 'O lugar e o pátio (1 Rs 6:36)');
  { const t = new THREE.Mesh(new THREE.CylinderGeometry(260, 280, 6, 64), M(0x8c7b5a)); t.position.y = -3.2; t.receiveShadow = true; t.userData.info = P('Monte Moriá', 'Salomão começou a edificar a casa do Senhor em Jerusalém, no monte Moriá.', '2 Crônicas 3:1'); partes.push(t); gPatio.add(t);
    const pl = caixa(gPatio, [190, 1, 120], [10, -0.3, 0], chao, P('Pátio interior', 'Edificou o pátio interior de três ordens de pedras lavradas e de uma ordem de vigas de cedro.', '1 Reis 6:36', 'O texto não dá o tamanho do pátio: as medidas aqui são ilustrativas.'));
    // muro baixo do pátio: 3 fiadas de pedra + 1 de cedro
    const muro = (w, d, x, z) => { caixa(gPatio, [w, 3, d], [x, 1.5, z], pedraClara); caixa(gPatio, [w, 0.8, d], [x, 3.4, z], madeira); };
    muro(190, 1.5, 10, 60); muro(190, 1.5, 10, -60); muro(1.5, 120, -85, 0); muro(1.5, 48, 105, 36); muro(1.5, 48, 105, -36); }
  // 2. Casa: paredes de pedra (cortáveis)
  const gCasa = camada('casa', 'Paredes da casa', 'Pedra lavrada na pedreira, sem ruído de ferramenta (1 Rs 6:7)');
  { const info = P('A casa', 'A casa que o rei Salomão edificou ao Senhor era de sessenta côvados de comprimento, vinte de largura e trinta de altura.', '1 Reis 6:2'),
      infoP = P('Pedras lavradas', 'Edificava-se a casa com pedras preparadas; de maneira que nem martelo, nem machado, nem instrumento algum de ferro se ouviu na casa quando a edificavam.', '1 Reis 6:7');
    caixa(gCasa, [X_SL1 - X_SS0 + ESP * 2, ALT, ESP], [(X_SS0 + X_SL1) / 2, ALT / 2, LARG / 2 + ESP / 2], pedra, info);
    caixa(gCasa, [X_SL1 - X_SS0 + ESP * 2, ALT, ESP], [(X_SS0 + X_SL1) / 2, ALT / 2, -LARG / 2 - ESP / 2], pedra, info);
    caixa(gCasa, [ESP, ALT, LARG], [X_SS0 - ESP / 2, ALT / 2, 0], pedra, infoP);
    // fachada leste com a porta (a porta: 1 Rs 6:33; a largura não é dada)
    caixa(gCasa, [ESP, ALT, 7], [X_SL1 + ESP / 2, ALT / 2, -6.5], pedra, infoP); caixa(gCasa, [ESP, ALT, 7], [X_SL1 + ESP / 2, ALT / 2, 6.5], pedra, infoP); caixa(gCasa, [ESP, ALT - 14, 6], [X_SL1 + ESP / 2, 14 + (ALT - 14) / 2, 0], pedra, infoP);
    // janelas de grades fixas no alto (1 Rs 6:4)
    for (let x = -26; x <= 26; x += 8) for (const z of [LARG / 2 + ESP + 0.05, -LARG / 2 - ESP - 0.05]) caixa(gCasa, [3, 2.2, 0.2], [x, 26.5, z], madeira, P('Janelas', 'E fez à casa janelas de grades fixas.', '1 Reis 6:4'));
    // parede entre o Santo Lugar e o Santo dos Santos (tábuas de cedro, 1 Rs 6:16) e as portas de oliveira (6:31)
    caixa(gCasa, [1.2, 20, 7], [X_SS1, 10, -6.5], cedro, P('Divisória de cedro', 'Edificou vinte côvados de tábuas de cedro, ao lado posterior da casa, desde o soalho até às paredes; e por dentro lhe edificou para o oráculo, para o lugar santíssimo.', '1 Reis 6:16'));
    caixa(gCasa, [1.2, 20, 7], [X_SS1, 10, 6.5], cedro, P('Divisória de cedro', 'Tábuas de cedro desde o soalho até ao teto.', '1 Reis 6:16'));
    caixa(gCasa, [0.6, 20, 6], [X_SS1 + 0.9, 10, 0], veu, P('Véu e portas de oliveira', 'À entrada do oráculo fez portas de madeira de oliveira (1 Rs 6:31). Fez também o véu de azul, púrpura, carmesim e linho fino (2 Cr 3:14).', '1 Reis 6:31; 2 Crônicas 3:14'));
    caixa(gCasa, [1.2, 10, LARG], [X_SS1, 25, 0], pedra, P('Acima do Santo dos Santos', 'O oráculo tinha vinte côvados de altura (1 Rs 6:20), dez a menos que a casa (6:2): o texto não diz o que havia no espaço de cima.', '1 Reis 6:2, 20', 'Espaço superior: interpretação.')); }
  // 3. Revestimento interno: cedro nas paredes, ouro no santuário (cortável)
  const gDentro = camada('revest', 'Cedro e ouro por dentro', 'Paredes forradas de cedro e cobertas de ouro (1 Rs 6:15, 21–22)');
  { const infoC = P('Cedro e ouro', 'Forrou as paredes da casa por dentro com tábuas de cedro… e cobriu a casa toda de ouro.', '1 Reis 6:15, 22');
    caixa(gDentro, [X_SL1 - X_SS1, ALT - 0.4, 0.3], [(X_SS1 + X_SL1) / 2, ALT / 2, LARG / 2 - 0.15], cedro, infoC); caixa(gDentro, [X_SL1 - X_SS1, ALT - 0.4, 0.3], [(X_SS1 + X_SL1) / 2, ALT / 2, -LARG / 2 + 0.15], cedro, infoC);
    const infoO = P('Santo dos Santos coberto de ouro', 'O oráculo tinha vinte côvados de comprimento, vinte de largura e vinte de altura, e o cobriu de ouro puro.', '1 Reis 6:20');
    caixa(gDentro, [20, 20, 0.3], [-20, 10, LARG / 2 - 0.15], ouro, infoO); caixa(gDentro, [20, 20, 0.3], [-20, 10, -LARG / 2 + 0.15], ouro, infoO); caixa(gDentro, [0.3, 20, 20], [X_SS0 + 0.15, 10, 0], ouro, infoO);
    caixa(gDentro, [20, 0.3, 20], [-20, 20, 0], ouro, infoO);
    caixa(gDentro, [60, 0.3, 20], [0, 0.15, 0], M(0xb8935a, {}, true), P('Soalho de cipreste coberto de ouro', 'Cobriu o soalho da casa com tábuas de cipreste… e o soalho da casa cobriu de ouro, por dentro e por fora.', '1 Reis 6:15, 30')); }
  // 4. Câmaras laterais: três andares de 5 côvados, larguras 5, 6, 7 (1 Rs 6:5–6, 10)
  const gCam = camada('camaras', 'Câmaras laterais (3 andares)', '5, 6 e 7 côvados de largura (1 Rs 6:6)');
  { const info = P('Câmaras laterais', 'A câmara de baixo era de cinco côvados de largura, a do meio de seis e a terceira de sete; porque pela parte de fora da casa fez encostos em redor, para que as vigas não entrassem nas paredes.', '1 Reis 6:6');
    [5, 6, 7].forEach((larg, k) => { const y = 2.5 + k * 5, z = LARG / 2 + ESP + larg / 2;
      caixa(gCam, [X_SL1 - X_SS0, 4.6, larg], [(X_SS0 + X_SL1) / 2, y, z], pedra, info); caixa(gCam, [X_SL1 - X_SS0, 4.6, larg], [(X_SS0 + X_SL1) / 2, y, -z], pedra, info);
      caixa(gCam, [larg, 4.6, LARG + ESP * 2 + larg * 2], [X_SS0 - ESP - larg / 2, y, 0], pedra, info); }); }
  // 5. Pórtico (1 Rs 6:3: 20 de largura, 10 de profundidade); altura: 2 Cr 3:4 diz 120 (questão textual)
  const gPort = camada('portico', 'Pórtico', '20 × 10 côvados (1 Rs 6:3)');
  { const info = P('Pórtico', 'O pórtico diante do templo da casa era de vinte côvados de comprimento, segundo a largura da casa, e de dez côvados de largura diante da casa.', '1 Reis 6:3', '2 Crônicas 3:4 dá 120 côvados de altura; algumas versões antigas leem 20. Aqui o pórtico tem a altura da casa (30), o que é uma escolha ilustrativa.');
    caixa(gPort, [10, ALT, ESP], [X_SL1 + ESP + 5, ALT / 2, LARG / 2 + ESP / 2], pedra, info); caixa(gPort, [10, ALT, ESP], [X_SL1 + ESP + 5, ALT / 2, -LARG / 2 - ESP / 2], pedra, info);
    caixa(gPort, [10, 6, LARG + ESP * 2], [X_SL1 + ESP + 5, ALT - 3, 0], pedra, info);
    caixa(gPort, [12, 1.5, LARG + 10], [X_SL1 + ESP + 5, 0.75, 0], pedraClara, P('Degraus da entrada', 'O texto não descreve degraus no templo de Salomão (Ezequiel 40:49 descreve degraus no templo da visão).', 'Ezequiel 40:49', 'Ilustrativo.')); }
  // 6. Telhado: vigas e tábuas de cedro (1 Rs 6:9); a forma não é dada
  const gTeto = camada('telhado', 'Teto de cedro', 'Coberto de vigas e tábuas de cedro (1 Rs 6:9)');
  { const info = P('Teto', 'Assim edificou a casa e a acabou; e cobriu a casa com vigas e tábuas de cedro.', '1 Reis 6:9', 'O texto não diz se o teto era plano; aqui é plano, como era comum na região (ilustrativo).');
    caixa(gTeto, [X_SL1 - X_SS0 + ESP * 2 + 10, 1.2, LARG + ESP * 2], [(X_SS0 + X_SL1) / 2 + 5, ALT + 0.6, 0], telhado, info);
    caixa(gTeto, [X_SL1 - X_SS0 + 14, 0.8, 7.6], [(X_SS0 + X_SL1) / 2, 15.4, LARG / 2 + ESP + 3.8], telhado, info); caixa(gTeto, [X_SL1 - X_SS0 + 14, 0.8, 7.6], [(X_SS0 + X_SL1) / 2, 15.4, -LARG / 2 - ESP - 3.8], telhado, info); }
  // 7. Colunas Jaquim e Boaz (1 Rs 7:15–22): 18 côvados de altura, 12 de circunferência, capitéis de 5
  const gCol = camada('colunas', 'Colunas Jaquim e Boaz', '18 côvados, capitéis de 5 (1 Rs 7:15–16)');
  { const r = 12 / (2 * Math.PI);
    [['Jaquim', 1], ['Boaz', -1]].forEach(([nome, lado]) => { const info = P('Coluna ' + nome, 'Formou duas colunas de bronze; a altura de cada coluna era de dezoito côvados, e um fio de doze côvados cercava cada uma das colunas… Levantou a coluna direita e lhe chamou Jaquim; e levantou a coluna esquerda e lhe chamou Boaz.', '1 Reis 7:15, 21', 'Direita e esquerda vistas de dentro, olhando para o leste: Jaquim ao sul.');
      const z = lado * 7, x = X_SL1 + ESP + 12;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 18, 32), bronze); c.position.set(x, 9, z); c.castShadow = true; c.userData.info = info; partes.push(c); gCol.add(c);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.35, r * 1.05, 5, 32), bronze); cap.position.set(x, 20.5, z); cap.castShadow = true; cap.userData.info = P('Capitel de ' + nome, 'Fez dois capitéis de bronze fundido para pôr sobre as cabeças das colunas; de cinco côvados era a altura de cada capitel… com romãs em duas fileiras.', '1 Reis 7:16, 18'); partes.push(cap); gCol.add(cap);
      for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2, rom = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), bronze); rom.position.set(x + Math.cos(a) * r * 1.38, 19.4, z + Math.sin(a) * r * 1.38); gCol.add(rom); } }); }
  // 8. Mar de fundição (1 Rs 7:23–26, 39) sobre 12 bois, a sudeste
  const gMar = camada('mar', 'Mar de fundição e as dez pias', 'Mar de 10 côvados sobre 12 bois (1 Rs 7:23–25)');
  { const info = P('Mar de fundição', 'Fez o mar de fundição; de dez côvados de uma borda até à outra, redondo, e de cinco côvados de alto; e um fio de trinta côvados o cingia em redor… E estava sobre doze bois; três olhavam para o norte, três para o ocidente, três para o sul e três para o oriente.', '1 Reis 7:23, 25');
    const xm = X_SL1 + 25, zm = 30;   // "ao lado direito da casa, para o oriente, da banda do sul" (1 Rs 7:39)
    const mar = new THREE.Mesh(new THREE.CylinderGeometry(5, 4.2, 5, 48, 1, true), bronze); mar.position.set(xm, 6.5, zm); mar.castShadow = true; mar.userData.info = info; partes.push(mar); gMar.add(mar);
    const agua = new THREE.Mesh(new THREE.CircleGeometry(4.8, 48), new THREE.MeshStandardMaterial({ color: 0x5f8fb8, roughness: 0.15, metalness: 0.2 })); agua.rotation.x = -Math.PI / 2; agua.position.set(xm, 8.6, zm); gMar.add(agua);
    for (let k = 0; k < 12; k++) { const a = Math.floor(k / 3) * Math.PI / 2 + ((k % 3) - 1) * 0.5, boi = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.6, 2.6), bronze); boi.position.set(xm + Math.cos(a) * 3.4, 2, zm + Math.sin(a) * 3.4); boi.rotation.y = -a; boi.castShadow = true; boi.userData.info = P('Os doze bois', 'Estava sobre doze bois… e o mar em cima deles; e as partes posteriores deles estavam para dentro.', '1 Reis 7:25'); partes.push(boi); gMar.add(boi); }
    // dez pias com suportes de 4 × 4 × 3 côvados (1 Rs 7:27, 38–39): cinco ao sul, cinco ao norte
    for (let k = 0; k < 10; k++) { const lado = k < 5 ? 1 : -1, x = X_SS0 + 8 + (k % 5) * 12, z = lado * (LARG / 2 + ESP + 7 + 9);
      const pinfo = P('Pia sobre suporte (uma das dez)', 'Fez também dez suportes de bronze; o comprimento de cada suporte era de quatro côvados, a sua largura de quatro e de três a sua altura… Fez também dez pias de bronze; em cada pia cabiam quarenta batos… E pôs cinco suportes à direita da casa e cinco à esquerda.', '1 Reis 7:27, 38–39');
      caixa(gMar, [4, 3, 4], [x, 1.5, z], bronze, pinfo); const pia = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.4, 1.6, 28), bronze); pia.position.set(x, 3.8, z); pia.castShadow = true; pia.userData.info = pinfo; partes.push(pia); gMar.add(pia); } }
  // 9. Altar de bronze (2 Cr 4:1): 20 × 20 × 10
  const gAltar = camada('altar', 'Altar de bronze', '20 × 20 × 10 côvados (2 Cr 4:1)');
  caixa(gAltar, [20, 10, 20], [X_SL1 + 48, 5, -2], bronze, P('Altar de bronze', 'Também fez um altar de bronze de vinte côvados de comprimento, de vinte côvados de largura e de dez côvados de altura.', '2 Crônicas 4:1', 'A posição exata no pátio não é dada (ilustrativa).'));
  // 10. Santo Lugar: 10 candelabros, 10 mesas, altar do incenso
  const gSanto = camada('santo', 'Santo Lugar: candelabros, mesas e altar do incenso', '1 Rs 7:48–49; 2 Cr 4:7–8');
  { for (let k = 0; k < 10; k++) { const lado = k < 5 ? 1 : -1, x = X_SS1 + 6 + (k % 5) * 6;
      const c = new THREE.Group(); c.position.set(x, 0, lado * 7.2); c.userData.info = P('Candelabro de ouro (um dos dez)', 'Os castiçais de ouro finíssimo, cinco à direita e cinco à esquerda, diante do oráculo.', '1 Reis 7:49', 'A forma de cada candelabro segue Êxodo 25:31–37 (o texto de Reis não a descreve).');
      const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 3.4, 10), ouroObj); haste.position.y = 1.7; c.add(haste);
      for (let b = -3; b <= 3; b++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2 + Math.abs(b) * 0.25, 8), ouroObj); h.position.set(b * 0.38, 3.2, 0); c.add(h); const ch = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd27a })); ch.position.set(b * 0.38, 3.95 + Math.abs(b) * 0.12, 0); c.add(ch); }
      c.traverse((o) => { if (o.isMesh) { o.userData.info = c.userData.info; partes.push(o); } }); gSanto.add(c); }
    for (let k = 0; k < 10; k++) { const lado = k < 5 ? 1 : -1, x = X_SS1 + 6 + (k % 5) * 6 + 3; caixa(gSanto, [2, 1.5, 1], [x, 0.75, lado * 8.6], ouroObj, P('Mesa (uma das dez)', 'Fez também dez mesas, e pô-las no templo, cinco à direita e cinco à esquerda.', '2 Crônicas 4:8', 'Tamanho segundo a mesa do tabernáculo (Êx 25:23: 2 × 1 × 1,5 côvados).')); }
    caixa(gSanto, [1, 2, 1], [X_SS1 + 3, 1, 0], ouroObj, P('Altar do incenso', 'Também cobriu de ouro o altar que estava diante do oráculo… o altar de ouro.', '1 Reis 6:22; 7:48', 'Tamanho segundo o altar do tabernáculo (Êx 30:1–2: 1 × 1 × 2 côvados).')); }
  // 11. Santo dos Santos: dois querubins de 10 côvados e a arca
  const gSS = camada('santissimo', 'Santo dos Santos: querubins e arca', '1 Rs 6:23–28; 8:6–7');
  { for (const z of [-5, 5]) { const q = new THREE.Group(); q.position.set(-20, 0, z); const info = P('Querubim de oliveira coberto de ouro', 'Fez no oráculo dois querubins de madeira de oliveira, cada um da altura de dez côvados… as asas dos querubins se estendiam: a asa de um tocava numa parede e a asa do outro tocava na outra parede; e as suas asas no meio da casa tocavam uma na outra.', '1 Reis 6:23, 27', 'A aparência do querubim não é descrita: a figura é simbólica.');
      const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, 8.5, 16), ouroObj); corpo.position.y = 4.25; q.add(corpo);
      const cab = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), ouroObj); cab.position.y = 9.1; q.add(cab);
      for (const s of [-1, 1]) { const asa = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 5), ouroObj); asa.position.set(0, 8.6, s * 2.5); asa.rotation.x = s * -0.06; q.add(asa); }   // 5 + 5 côvados de asas (1 Rs 6:24)
      q.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.info = info; partes.push(o); } }); gSS.add(q); }
    const arca = caixa(gSS, [2.5, 1.5, 1.5], [-20, 0.75, 0], ouroObj, P('Arca da aliança', 'Os sacerdotes meteram a arca da aliança do Senhor no seu lugar, no oráculo da casa, no lugar santíssimo, debaixo das asas dos querubins.', '1 Reis 8:6', 'Medidas da arca: Êxodo 25:10 (2,5 × 1,5 × 1,5 côvados).')); arca.rotation.y = Math.PI / 2;
    for (const s of [-1, 1]) { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5, 8), ouroObj); v.rotation.z = Math.PI / 2; v.position.set(-20, 1, s * 0.6); v.userData.info = P('Varais da arca', 'E os varais sobressaíam tanto que as suas pontas se viam desde o santuário, diante do oráculo, mas de fora não se viam.', '1 Reis 8:8'); partes.push(v); gSS.add(v); } }

  // ── painel de camadas ──
  const listaEl = raiz.querySelector('.tp-camadas');
  listaEl.innerHTML = camadas.map((c) => `<label><input type="checkbox" data-c="${c.id}" ${c.g.visible ? 'checked' : ''}><span>${c.nome}<br><small>${c.desc}</small></span></label>`).join('');
  listaEl.addEventListener('change', (e) => { const c = camadas.find((x) => x.id === e.target.dataset.c); if (c) c.g.visible = e.target.checked; });

  // ── câmera orbital ──
  const alvo = new THREE.Vector3(5, 8, 0); let raio = 150, azim = 0.75, elev = 0.42, voo = null;
  function posicionar() { camera.position.set(alvo.x + raio * Math.cos(elev) * Math.cos(azim), alvo.y + raio * Math.sin(elev), alvo.z + raio * Math.cos(elev) * Math.sin(azim)); camera.lookAt(alvo); }
  function irPara(a, r, az, el, ms = 1200) { voo = { de: { a: alvo.clone(), r: raio, az: azim, el: elev }, para: { a: a.clone(), r, az, el }, t0: performance.now(), ms }; }
  let corteAlvo = 1000, tetoAlvo = 1000, corteAtual = 1000, tetoAtual = 1000;
  const VISTAS = {
    fora: () => { corteAlvo = 1000; tetoAlvo = 1000; irPara(new THREE.Vector3(5, 8, 0), 150, 0.75, 0.42); },
    corte: () => { corteAlvo = 0; tetoAlvo = 1000; irPara(new THREE.Vector3(0, 8, 0), 105, 1.45, 0.38); },
    santo: () => { corteAlvo = 0; tetoAlvo = 29; irPara(new THREE.Vector3(10, 4, 0), 30, 1.35, 0.32); },
    santissimo: () => { corteAlvo = 0; tetoAlvo = 19.5; irPara(new THREE.Vector3(-20, 5, 0), 26, 1.4, 0.35); },
    cima: () => { corteAlvo = 1000; tetoAlvo = 29; irPara(new THREE.Vector3(10, 0, 0), 190, 1.5707, 1.45); },
  };
  raiz.querySelector('.tp-bts').addEventListener('click', (e) => { const b = e.target.closest('[data-vista]'); if (!b) return; raiz.querySelectorAll('[data-vista]').forEach((x) => x.classList.toggle('ativo', x === b)); VISTAS[b.dataset.vista](); });
  let arr = null, moveu = false;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => { arr = { x: e.clientX, y: e.clientY, b: e.button }; moveu = false; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('pointermove', (e) => { if (!arr) return; const dx = e.clientX - arr.x, dy = e.clientY - arr.y; if (Math.abs(dx) + Math.abs(dy) > 3) moveu = true; arr.x = e.clientX; arr.y = e.clientY; voo = null;
    if (arr.b === 2 || e.shiftKey) { const dir = new THREE.Vector3(); camera.getWorldDirection(dir); const dirX = new THREE.Vector3().crossVectors(dir, camera.up).normalize(); alvo.addScaledVector(dirX, -dx * raio * 0.0016); alvo.y = Math.max(0, alvo.y + dy * raio * 0.0016); }
    else { azim += dx * 0.006; elev = Math.max(0.02, Math.min(1.5, elev + dy * 0.005)); } });
  const solta = (e) => { if (arr && !moveu) escolher(e); arr = null; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', solta); canvas.addEventListener('pointercancel', () => { arr = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); voo = null; raio = Math.max(8, Math.min(420, raio * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function escolher(e) {
    const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const vis = partes.filter((m) => { let o = m; while (o) { if (!o.visible) return false; o = o.parent; } return true; });
    const hits = ray.intersectObjects(vis, false).filter((h) => { const mat = h.object.material; if (!mat.clippingPlanes) return true; return mat.clippingPlanes.every((pl) => pl.distanceToPoint(h.point) >= -0.01); });
    if (!hits.length) return; const inf = hits[0].object.userData.info; if (!inf) return;
    fichaEl.innerHTML = `<b>${inf.titulo}</b><p>“${inf.texto}”</p><cite>${inf.ref} · Almeida</cite>${inf.aviso ? `<p class="tp-aviso">⚠ ${inf.aviso}</p>` : ''}`;
  }
  // ── animação: o templo sobe do chão ──
  const subir = camadas.filter((c) => c.id !== 'patio').map((c) => c.g); subir.forEach((g) => { g.scale.y = 0.001; });
  const t0 = performance.now(); let ativo = true, raf = 0;
  function ajustar() { const w = raiz.clientWidth || 1, h = raiz.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const obs = new ResizeObserver(ajustar); obs.observe(raiz); ajustar();
  raio = 260; elev = 0.9;   // começa do alto, como quem desce do globo
  irPara(new THREE.Vector3(5, 8, 0), 150, 0.75, 0.42, 2600);
  function quadro(t) {
    if (!ativo) return;
    const q = Math.min(1, (t - t0 - 300) / 1800); if (q > 0) subir.forEach((g, k) => { const qq = Math.min(1, Math.max(0, q * 1.4 - k * 0.04)); g.scale.y = Math.max(0.001, 1 - Math.pow(1 - qq, 3)); });
    if (voo) { const p = Math.min(1, (t - voo.t0) / voo.ms), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; alvo.lerpVectors(voo.de.a, voo.para.a, e); raio = voo.de.r + (voo.para.r - voo.de.r) * e; azim = voo.de.az + (voo.para.az - voo.de.az) * e; elev = voo.de.el + (voo.para.el - voo.de.el) * e; if (p >= 1) voo = null; }
    corteAtual += (corteAlvo - corteAtual) * 0.08; tetoAtual += (tetoAlvo - tetoAtual) * 0.08; corte.constant = corteAtual; tetoCorte.constant = tetoAtual;
    luzDentro.intensity = corteAtual < 500 ? 900 : 0;
    posicionar(); renderer.render(cena, camera); raf = requestAnimationFrame(quadro);
  }
  raf = requestAnimationFrame(quadro);
  function fechar() { ativo = false; cancelAnimationFrame(raf); obs.disconnect(); renderer.dispose(); raiz.remove(); if (aoFechar) aoFechar(); }
  raiz.querySelector('.tp-fechar').onclick = fechar;
  const tecla = (e) => { if (e.key === 'Escape') { window.removeEventListener('keydown', tecla); fechar(); } }; window.addEventListener('keydown', tecla);
  return { fechar, vista: (v) => VISTAS[v] && VISTAS[v](), camadas: () => camadas.map((c) => ({ id: c.id, visivel: c.g.visible })), partes: () => partes.length, definir: (id, v) => { const c = camadas.find((x) => x.id === id); if (c) c.g.visible = v; } };
}
