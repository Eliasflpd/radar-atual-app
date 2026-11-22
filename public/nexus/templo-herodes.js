// TEMPLO DE HERODES (segundo templo, o templo do tempo de Jesus) — maquete 3D cinematográfica.
// Feita a partir do projeto e das imagens pedidos ao ChatGPT (NEXUS-BIBLICO/templo-herodes-chatgpt/projeto.md).
// Medidas: Mishná, tratado Middot; Flávio Josefo, Guerra dos Judeus 5.184–247 e Antiguidades 15.380–425. Onde divergem, as duas versões são citadas.
// Unidade: 1 côvado (convenção de 0,45 m). Eixos: X+ leste, Y+ cima, Z+ sul; origem na face interna leste do Santo Lugar.
export const TEMPLO = { nome: 'Templo de Herodes', lat: 31.7778, lon: 35.2356, lugar: 'Monte do Templo, Jerusalém', ref: 'Josefo, Guerra 5.184–247; Mishná, Middot' };
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/';

export async function abrirTemplo(THREE, host, { aoFechar } = {}) {
  const { Sky } = await import(CDN + 'objects/Sky.js');
  const raiz = document.createElement('div'); raiz.className = 'tp-raiz';
  raiz.innerHTML = `<style>
    .tp-raiz{pointer-events:auto;position:absolute;inset:0;z-index:30;background:#cfdde6;overflow:hidden;font:13px Inter,system-ui,sans-serif;color:#14213D;opacity:0;transition:opacity .9s ease}
    .tp-raiz.on{opacity:1}
    .tp-raiz canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}
    .tp-raiz canvas:active{cursor:grabbing}
    .tp-cab{position:absolute;left:22px;top:18px;pointer-events:none;opacity:0;transform:translateY(-6px);transition:all 1s ease 1.2s}
    .tp-raiz.pousou .tp-cab{opacity:1;transform:none}
    .tp-cab h2{margin:0;font:600 34px/1.05 "Cormorant Garamond",Georgia,serif;color:#fff;letter-spacing:.01em;text-shadow:0 2px 14px rgba(10,16,30,.55)}
    .tp-cab p{margin:5px 0 0;color:rgba(255,255,255,.92);font-size:12.5px;letter-spacing:.04em;text-shadow:0 1px 8px rgba(10,16,30,.7)}
    .tp-barra{position:absolute;left:50%;bottom:18px;transform:translate(-50%,10px);display:flex;gap:4px;padding:5px;background:rgba(10,18,36,.72);backdrop-filter:blur(10px);border:1px solid rgba(233,200,120,.28);border-radius:999px;opacity:0;transition:all .8s ease 1.4s}
    .tp-raiz.pousou .tp-barra{opacity:1;transform:translate(-50%,0)}
    .tp-barra button{border:0;background:transparent;color:#EDE3C8;border-radius:999px;padding:8px 13px;font:600 12.5px Inter,system-ui,sans-serif;cursor:pointer;white-space:nowrap}
    .tp-barra button:hover{background:rgba(233,200,120,.16)}.tp-barra button.ativo{background:#C9A24E;color:#1B1405}
    .tp-sair{position:absolute;right:18px;top:16px;border:1px solid rgba(255,255,255,.5);background:rgba(10,18,36,.55);backdrop-filter:blur(8px);color:#fff;border-radius:999px;padding:8px 15px;font:600 12.5px Inter,system-ui,sans-serif;cursor:pointer}
    .tp-ficha{position:absolute;left:22px;bottom:84px;width:min(380px,calc(100% - 44px));background:rgba(252,248,238,.96);border:1px solid rgba(201,162,78,.5);border-radius:14px;padding:14px 16px;box-shadow:0 18px 40px rgba(10,16,30,.35);color:#1E2A44}
    .tp-ficha[hidden]{display:none}
    .tp-ficha h4{margin:0 22px 6px 0;font:700 19px "Cormorant Garamond",Georgia,serif;color:#14213D}
    .tp-ficha p{margin:0 0 6px;font:15px/1.55 "Cormorant Garamond",Georgia,serif}
    .tp-ficha cite{display:block;font:700 11.5px Inter,system-ui,sans-serif;color:#8A6420;letter-spacing:.04em;text-transform:uppercase}
    .tp-ficha .av{margin-top:8px;font:12px/1.45 Inter,system-ui,sans-serif;color:#7A4E14;background:rgba(201,162,78,.14);border-radius:8px;padding:6px 8px}
    .tp-ficha .x{position:absolute;right:10px;top:8px;border:0;background:none;font-size:18px;color:#6B5A3A;cursor:pointer}
    .tp-cam{position:absolute;right:18px;top:60px;width:270px;max-height:calc(100% - 150px);overflow:auto;background:rgba(252,248,238,.96);border:1px solid rgba(201,162,78,.5);border-radius:14px;padding:10px 12px;box-shadow:0 18px 40px rgba(10,16,30,.3)}
    .tp-cam[hidden]{display:none}.tp-cam h5{margin:2px 0 6px;font:700 16px "Cormorant Garamond",Georgia,serif}
    .tp-cam label{display:flex;gap:8px;align-items:center;padding:4px 2px;cursor:pointer;font-size:12.5px}.tp-cam input{accent-color:#A8742A}
    .tp-dica{position:absolute;right:18px;top:58px;color:rgba(255,255,255,.85);font-size:11.5px;text-shadow:0 1px 6px rgba(0,0,0,.6);opacity:0;transition:opacity 1s ease 2s}
    .tp-raiz.pousou .tp-dica{opacity:1}
    @media (max-width:1700px){.tp-dica{display:none}}
    @media (max-width:900px){.tp-barra{left:12px;right:12px;transform:none;overflow-x:auto}.tp-raiz.pousou .tp-barra{transform:none}.tp-ficha{bottom:76px}}
  </style>
  <canvas></canvas>
  <div class="tp-cab"><h2>Templo de Herodes</h2><p>O TEMPLO DO TEMPO DE JESUS · JERUSALÉM, SÉCULO I · MEDIDAS DA MISHNÁ (MIDDOT) E DE JOSEFO</p></div>
  <button type="button" class="tp-sair">↩ Voltar ao globo</button>
  <div class="tp-barra">
    <button type="button" data-v="entrada" class="ativo">Escada de Nicanor</button><button type="button" data-v="esplanada">Esplanada</button><button type="button" data-v="fora">Santuário</button><button type="button" data-v="corte">Por dentro (corte)</button>
    <button type="button" data-v="santo">Santo Lugar</button><button type="button" data-v="cima">De cima</button><button type="button" data-v="camadas">Camadas</button>
  </div>
  <div class="tp-cam" hidden><h5>Camadas da maquete</h5><div class="tp-cam-l"></div></div>
  <div class="tp-ficha" hidden></div>
  <div class="tp-dica">Arraste para girar · roda aproxima · botão direito move · duplo clique centraliza · clique numa peça para ver o versículo</div>`;
  host.appendChild(raiz);
  const canvas = raiz.querySelector('canvas'), ficha = raiz.querySelector('.tp-ficha');

  // ── renderização: tons de cinema, sombras suaves, céu físico ──
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.75;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 26000);
  const dirSol = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 11), THREE.MathUtils.degToRad(96));   // sol baixo a leste-sudeste: ilumina a fachada (apresentação)
  const fazCeu = () => { const s = new Sky(); s.scale.setScalar(20000); const u = s.material.uniforms; u.turbidity.value = 3.2; u.rayleigh.value = 2.2; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.86; u.sunPosition.value.copy(dirSol); return s; };
  cena.add(fazCeu());
  const pmrem = new THREE.PMREMGenerator(renderer); const cenaCeu = new THREE.Scene(); cenaCeu.add(fazCeu());
  cena.environment = pmrem.fromScene(cenaCeu, 0.02).texture; cena.environmentIntensity = 0.45;
  cena.fog = new THREE.FogExp2(0xe0d2bc, 0.00019);
  const sol = new THREE.DirectionalLight(0xffcf94, 3.6); sol.position.copy(dirSol).multiplyScalar(1400); sol.castShadow = true; sol.shadow.mapSize.set(4096, 4096);
  Object.assign(sol.shadow.camera, { left: -300, right: 300, top: 300, bottom: -300, near: 200, far: 3200 }); sol.shadow.bias = -0.00025; sol.shadow.normalBias = 0.35; sol.shadow.radius = 3; cena.add(sol); cena.add(sol.target);
  cena.add(new THREE.HemisphereLight(0xe8dcc8, 0x8a6a42, 0.5));

  // ── texturas procedurais (pedra, madeira, bronze, ouro, friso) ──
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  function tex(w, h, desenhar, rep = 1, cor = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); desenhar(g, w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (cor) t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(rep, rep); return t; }
  const ruido = (g, w, h, n, a, cores) => { for (let i = 0; i < n; i++) { g.fillStyle = cores[Math.floor(rnd() * cores.length)]; g.globalAlpha = a * rnd(); g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2.5, 1 + rnd() * 2.5); } g.globalAlpha = 1; };
  function blocos(g, w, h, base, junta, alt, minL, maxL, varia) {
    g.fillStyle = junta; g.fillRect(0, 0, w, h);
    for (let y = 0, lin = 0; y < h; y += alt, lin++) { let x = -(lin % 2) * minL * 0.6; while (x < w) { const l = minL + rnd() * (maxL - minL); const v = (rnd() - 0.5) * varia;
      const c = base.map((q) => Math.max(0, Math.min(255, q + v + (rnd() - 0.5) * 6)));
      g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; g.fillRect(x + 2, y + 2, l - 4, alt - 4);
      const gr = g.createLinearGradient(0, y, 0, y + alt); gr.addColorStop(0, 'rgba(255,255,255,.10)'); gr.addColorStop(1, 'rgba(0,0,0,.10)'); g.fillStyle = gr; g.fillRect(x + 2, y + 2, l - 4, alt - 4);
      x += l; } }
  }
  const tPedra = tex(1024, 1024, (g, w, h) => { blocos(g, w, h, [216, 203, 177], '#a89878', 85, 130, 260, 26); ruido(g, w, h, 26000, 0.35, ['#8f7f62', '#f1e7d2', '#b9a988']); });
  const tPedraB = tex(1024, 1024, (g, w, h) => { blocos(g, w, h, [150, 150, 150], '#303030', 85, 130, 260, 30); ruido(g, w, h, 30000, 0.5, ['#444', '#ddd']); }, 1, false);
  const tLaje = tex(1024, 1024, (g, w, h) => { blocos(g, w, h, [198, 184, 155], '#93836a', 170, 150, 320, 22); ruido(g, w, h, 30000, 0.3, ['#857558', '#e6dcc6']); });
  const tCedro = tex(512, 512, (g, w, h) => { g.fillStyle = '#684A32'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.strokeStyle = rnd() < 0.5 ? 'rgba(40,24,12,.35)' : 'rgba(140,100,66,.25)'; g.lineWidth = 0.6 + rnd() * 1.8; g.beginPath(); const y0 = rnd() * h; g.moveTo(0, y0); for (let x = 0; x <= w; x += 32) g.lineTo(x, y0 + Math.sin(x / 70 + i) * 4); g.stroke(); } for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(20,10,4,.45)'; g.fillRect(x, 0, 2, h); } });
  const tPainel = tex(512, 512, (g, w, h) => {   // cedro com flores abertas e palmeiras em ouro (1 Rs 6:18, 29)
    g.drawImage(tCedro.image, 0, 0); g.strokeStyle = 'rgba(214,176,86,.9)'; g.fillStyle = 'rgba(214,176,86,.85)'; g.lineWidth = 3;
    const flor = (x, y, r) => { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.42, r * 0.18, a, 0, 6.29); g.fill(); } g.beginPath(); g.arc(x, y, r * 0.22, 0, 6.29); g.fillStyle = 'rgba(160,120,40,.95)'; g.fill(); g.fillStyle = 'rgba(214,176,86,.85)'; };
    const palm = (x, y, hh) => { g.lineWidth = 6; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - hh); g.stroke(); g.lineWidth = 3; for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(x, y - hh); g.quadraticCurveTo(x + k * 18, y - hh - 30, x + k * 30, y - hh + 10 + Math.abs(k) * 6); g.stroke(); } };
    palm(w / 2, h * 0.86, h * 0.5); flor(w * 0.18, h * 0.3, 34); flor(w * 0.82, h * 0.3, 34); flor(w * 0.18, h * 0.7, 26); flor(w * 0.82, h * 0.7, 26);
    g.strokeStyle = 'rgba(214,176,86,.8)'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); });
  const tOuro = tex(512, 512, (g, w, h) => { g.fillStyle = '#C9A55A'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) for (let x = (y / 32 % 2) * 16; x < w; x += 32) { g.fillStyle = `rgba(${120 + rnd() * 60},${90 + rnd() * 50},30,${0.12 + rnd() * 0.14})`; g.fillRect(x, y, 31, 31); } ruido(g, w, h, 9000, 0.25, ['#fff2c4', '#7a5a20']); });
  const tPainelOuro = tex(512, 512, (g, w, h) => { g.drawImage(tOuro.image, 0, 0); g.strokeStyle = 'rgba(120,84,24,.65)'; g.lineWidth = 4; g.strokeRect(14, 14, w - 28, h - 28);
    g.lineWidth = 5; const x = w / 2, y = h * 0.88, hh = h * 0.52; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - hh); g.stroke(); for (let k = -5; k <= 5; k++) { g.beginPath(); g.moveTo(x, y - hh); g.quadraticCurveTo(x + k * 16, y - hh - 34, x + k * 30, y - hh + 14 + Math.abs(k) * 5); g.stroke(); }
    for (const [fx, fy] of [[0.18, 0.4], [0.82, 0.4], [0.18, 0.72], [0.82, 0.72]]) for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.beginPath(); g.ellipse(fx * w + Math.cos(a) * 16, fy * h + Math.sin(a) * 16, 13, 5, a, 0, 6.29); g.stroke(); } });
  const tBronze = tex(512, 512, (g, w, h) => { g.fillStyle = '#7A5E42'; g.fillRect(0, 0, w, h); ruido(g, w, h, 30000, 0.5, ['#4f3b28', '#a98058', '#5f7a62', '#8b6a48']); for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(80,120,96,.12)'; g.beginPath(); g.arc(rnd() * w, rnd() * h, 8 + rnd() * 30, 0, 6.29); g.fill(); } });
  const tFriso = tex(1024, 128, (g, w, h) => { g.fillStyle = '#3d2e1f'; g.fillRect(0, 0, w, h); g.fillStyle = '#5a4430'; g.fillRect(0, 8, w, h - 16);
    for (let x = 32; x < w; x += 64) { g.fillStyle = '#D4AE55'; g.beginPath(); g.moveTo(x, 104); for (let k = -3; k <= 3; k++) { const a = -Math.PI / 2 + k * 0.33; g.quadraticCurveTo(x + Math.cos(a) * 30, 64 + Math.sin(a) * 50, x + Math.cos(a) * 22, 64 + Math.sin(a) * 40); g.lineTo(x, 100); } g.fill(); g.beginPath(); g.arc(x, 104, 6, 0, 6.29); g.fill(); }
    g.fillStyle = '#C9A24E'; g.fillRect(0, 4, w, 5); g.fillRect(0, h - 9, w, 5); });
  const tPorta = tex(512, 1024, (g, w, h) => { g.drawImage(tCedro.image, 0, 0, w, h / 2); g.drawImage(tCedro.image, 0, h / 2, w, h / 2); g.fillStyle = 'rgba(30,18,8,.35)'; for (let x = 0; x < w; x += 85) g.fillRect(x, 0, 3, h);
    for (let y = 60; y < h; y += 110) for (let x = 40; x < w; x += 85) { g.fillStyle = '#C9A24E'; g.beginPath(); g.arc(x, y, 7, 0, 6.29); g.fill(); g.fillStyle = 'rgba(255,240,190,.6)'; g.beginPath(); g.arc(x - 2, y - 2, 2.5, 0, 6.29); g.fill(); }
    g.strokeStyle = '#C9A24E'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28); });
  const tVeu = tex(512, 512, (g, w, h) => { const cs = ['#304B76', '#694460', '#923F45', '#2b4470', '#5f3c58']; for (let x = 0; x < w; x += 24) { g.fillStyle = cs[(x / 24) % cs.length]; g.fillRect(x, 0, 24, h); } ruido(g, w, h, 20000, 0.25, ['#000', '#fff']);
    g.strokeStyle = 'rgba(214,176,86,.7)'; g.lineWidth = 3; for (let y = 120; y < h; y += 240) for (let x = 90; x < w; x += 180) { g.beginPath(); g.ellipse(x, y, 40, 16, 0, 0, 6.29); g.stroke(); g.beginPath(); g.moveTo(x - 40, y); g.quadraticCurveTo(x - 70, y - 40, x - 90, y - 10); g.moveTo(x + 40, y); g.quadraticCurveTo(x + 70, y - 40, x + 90, y - 10); g.stroke(); } });
  const tTerra = tex(1024, 1024, (g, w, h) => { g.fillStyle = '#A99773'; g.fillRect(0, 0, w, h); ruido(g, w, h, 90000, 0.5, ['#8a7a58', '#c2b28c', '#7d7a52', '#9b8a64', '#6f6b47']); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${80 + rnd() * 30},${90 + rnd() * 30},${50 + rnd() * 20},.35)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 9, 0, 6.29); g.fill(); } }, 40);

  // ── materiais ──
  const corte = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e4), teto = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e4);
  const CL = { clippingPlanes: [corte, teto], clipShadows: true };
  const mat = (o, cortavel) => new THREE.MeshStandardMaterial({ ...o, ...(cortavel ? CL : {}) });
  const M = {
    pedra: mat({ map: tPedra, bumpMap: tPedraB, bumpScale: 1.6, roughness: 0.9, color: 0xf6dfb6 }, true), pedraF: mat({ map: tPedra, bumpMap: tPedraB, bumpScale: 1.6, roughness: 0.9, color: 0xf6dfb6 }),
    laje: mat({ map: tLaje, roughness: 0.95, color: 0xead2a6 }), cedro: mat({ map: tCedro, roughness: 0.7 }, true), cedroF: mat({ map: tCedro, roughness: 0.7 }),
    painel: mat({ map: tPainel, roughness: 0.6, metalness: 0.15 }, true), painelOuro: mat({ map: tPainelOuro, roughness: 0.32, metalness: 0.85, color: 0xffe0a0 }, true),
    painelOuroF: mat({ map: tPainelOuro, roughness: 0.32, metalness: 0.85, color: 0xffe0a0 }),
    ouro: mat({ map: tOuro, roughness: 0.3, metalness: 1, color: 0xffd98a }), ouroC: mat({ map: tOuro, roughness: 0.3, metalness: 1, color: 0xffd98a }, true),
    pisoOuro: mat({ map: tOuro, roughness: 0.42, metalness: 0.85, color: 0xd9b26a }, true),
    bronze: mat({ map: tBronze, roughness: 0.5, metalness: 0.8, color: 0xa88a5e }), friso: mat({ map: tFriso, roughness: 0.5, metalness: 0.4 }, true),
    porta: mat({ map: tPorta, roughness: 0.55, metalness: 0.2 }), veu: mat({ map: tVeu, roughness: 0.95, side: THREE.DoubleSide }, true),
    escuro: mat({ color: 0x1a120b, roughness: 1 }, true), terra: mat({ map: tTerra, roughness: 1, color: 0xe2cfa8 }), telhado: mat({ color: 0x9C8B70, roughness: 1 }, true),
    oliva: new THREE.MeshStandardMaterial({ color: 0x6f7a52, roughness: 0.95 }), cipreste: new THREE.MeshStandardMaterial({ color: 0x2f4127, roughness: 0.95 }), tronco: new THREE.MeshStandardMaterial({ color: 0x5b4a36, roughness: 1 }),
    chama: new THREE.MeshBasicMaterial({ color: 0xffc46a }), agua: new THREE.MeshStandardMaterial({ color: 0x5c7f88, roughness: 0.08, metalness: 0.3 }), pao: new THREE.MeshStandardMaterial({ color: 0xc8955a, roughness: 0.9 }),
  };

  // ── utilidades de modelagem ──
  const grupos = {}; const pecas = [];
  const G = (id) => { const g = new THREE.Group(); g.name = id; cena.add(g); grupos[id] = g; return g; };
  const I = (titulo, texto, ref, aviso) => ({ titulo, texto, ref, aviso });
  function uvCaixa(geo, w, h, d, esc) {   // textura em escala do mundo (sem esticar)
    const uv = geo.attributes.uv, spans = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * spans[f][0] / esc, uv.getY(i) * spans[f][1] / esc); }
    uv.needsUpdate = true; return geo;
  }
  function caixa(g, [w, h, d], [x, y, z], m, info, esc = 20) { const geo = uvCaixa(new THREE.BoxGeometry(w, h, d), w, h, d, esc); const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = me.receiveShadow = true; if (info) { me.userData.info = info; pecas.push(me); } g.add(me); return me; }
  function malha(g, geo, m, pos, info, rot) { const me = new THREE.Mesh(geo, m); me.position.set(...pos); if (rot) me.rotation.set(...rot); me.castShadow = me.receiveShadow = true; if (info) { me.userData.info = info; pecas.push(me); } g.add(me); return me; }
  const torno = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const marcar = (obj, info) => obj.traverse((o) => { if (o.isMesh) { o.userData.info = info; o.castShadow = o.receiveShadow = true; pecas.push(o); } });

  // ═══════════ TEMPLO DE HERODES — coordenadas do projeto (NEXUS-BIBLICO/templo-herodes-chatgpt/projeto.md), já com o +1 em X ═══════════
  // Origem: face interna leste do Santo Lugar. Átrio interior Y=-2, átrio das mulheres Y=-10, esplanada Y=-18. Fontes: Mishná Middot; Josefo.
  const refs = {};
  const MD = (x) => 'Mishná, Middot ' + x, JG = (x) => 'Josefo, Guerra dos Judeus ' + x, JA = (x) => 'Josefo, Antiguidades ' + x;
  const Me = { ...M, ouroF: mat({ map: tPainelOuro, roughness: 0.34, metalness: 0.92, color: 0xffd98c }), telha: mat({ color: 0x9a4a32, roughness: 0.85 }), branco: mat({ map: tPedra, bumpMap: tPedraB, bumpScale: 1.2, roughness: 0.75, color: 0xfff4e0 }, true), brancoF: mat({ map: tPedra, bumpMap: tPedraB, bumpScale: 1.2, roughness: 0.75, color: 0xfff4e0 }), casaCidade: mat({ map: tPedra, roughness: 0.95, color: 0xe6cfa6 }), pessoa: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }) };
  const YE = -18, YM = -10, YI = -2;
  // ═════ TERRENO: o Monte Moriá, os vales do Cedrom e do Tiropeão, o Monte das Oliveiras ═════
  const gT = G('terreno');
  const altT = (x, z) => { const dentro = x > -360 && x < 340 && z > -425 && z < 672; if (dentro) return YE - 1;
    const dx = Math.max(-360 - x, 0, x - 340), dz = Math.max(-425 - z, 0, z - 672), d = Math.hypot(dx, dz);
    let y = YE - 1 - Math.min(70, d * 0.55);   // os muros de arrimo descem até o fundo dos vales
    if (x > 340) y += Math.max(0, (x - 700) * 0.22) * (1 - Math.min(1, Math.abs(z - 120) / 2600));   // Monte das Oliveiras a leste
    if (x < -360) y += Math.max(0, (-360 - x - 250) * 0.06);   // cidade alta a oeste
    return y + Math.sin(x * 0.006) * Math.cos(z * 0.005) * 8; };
  { const geo = new THREE.PlaneGeometry(9000, 9000, 260, 260); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, altT(p.getX(i), p.getZ(i) + 120)); geo.translate(0, 0, 120); geo.computeVertexNormals();
    const t = new THREE.Mesh(geo, M.terra); t.receiveShadow = true; t.userData.info = I('Monte Moriá e os vales', 'O terreno ao redor é uma aproximação visual: o vale do Cedrom a leste, o Tiropeão a oeste e o Monte das Oliveiras ao fundo.', 'Josefo, Guerra 5.136–141 (a cidade e os vales)', 'Relevo ilustrativo, não levantamento topográfico.'); pecas.push(t); gT.add(t);
    // a cidade de Jerusalém ao redor (casas de teto plano) e oliveiras no Monte das Oliveiras
    const nC = 1400, casas = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), Me.casaCidade, nC); const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < nC; i++) { const x = -1500 + rnd() * 1850, z = -900 + rnd() * 2200; if (x > -400 && z > -470 && z < 720) { casas.setMatrixAt(i, zero); continue; } const w = 14 + rnd() * 26, d = 14 + rnd() * 26, h = 10 + rnd() * 16; m4.compose(new THREE.Vector3(x, altT(x, z) + h / 2 - 2, z), q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (rnd() - 0.5) * 0.3), s4.set(w, h, d)); casas.setMatrixAt(i, m4); }
    casas.castShadow = casas.receiveShadow = true; gT.add(casas);
    const nO = 500, oliv = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), M.oliva, nO); for (let i = 0; i < nO; i++) { const x = 500 + rnd() * 1800, z = -900 + rnd() * 2100, s = 5 + rnd() * 5; m4.compose(new THREE.Vector3(x, altT(x, z) + s * 0.7, z), q4.identity(), s4.set(s * 1.2, s * 0.8, s * 1.2)); oliv.setMatrixAt(i, m4); }
    oliv.castShadow = true; gT.add(oliv);
    const nP = 140, cip = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 8), M.cipreste, nP); for (let i = 0; i < nP; i++) { const a = rnd() * 6.28, r = 760 + rnd() * 900, x = Math.cos(a) * r, z = 120 + Math.sin(a) * r, s = 3 + rnd() * 2; m4.compose(new THREE.Vector3(x, altT(x, z) + s * 6, z), q4.identity(), s4.set(s, s * 12, s)); cip.setMatrixAt(i, m4); } cip.castShadow = true; gT.add(cip); }
  // ═════ ESPLANADA HERODIANA: plataforma e muros de arrimo ═════
  const gE = G('esplanada');
  { const iE = I('A esplanada de Herodes', 'Herodes cercou o monte com muros e duplicou a área do recinto; a esplanada tinha cerca de 480 por 300 metros.', JG('5.184–192') + '; ' + JA('15.391–402'), 'Contorno idealizado em retângulo; o real é irregular. Medida métrica: aproximação moderna.');
    caixa(gE, [667, 1.2, 1067], [-11, YE - 0.6, 123.5], M.laje, iE, 22);
    const muro = (w, d, x, z) => caixa(gE, [w, 70, d], [x, YE - 35, z], M.pedraF, I('Muros de arrimo', 'Os muros de pedra enorme seguravam a plataforma sobre os vales; o Muro Ocidental é parte deles.', JA('15.398–400'), 'Altura ilustrativa.'), 14);
    muro(667, 8, -11, -410); muro(667, 8, -11, 657); muro(8, 1067, -344, 123.5); muro(8, 1067, 323, 123.5);
    // Arco de Robinson (sudoeste) e escadaria
    const iR = I('Arco de Robinson', 'Uma escadaria monumental sobre arcos levava da cidade baixa ao Pórtico Real; restos do arco existem no Muro Ocidental.', 'Arqueologia do Muro Ocidental (o arco não é nomeado por Josefo)', 'Posição, vão e passarela: interpretação ligada ao vestígio arqueológico.');
    caixa(gE, [24, 6, 30], [-362, YE - 3, 590], M.pedraF, iR, 10); caixa(gE, [24, 40, 8], [-362, YE - 26, 576], M.pedraF, iR, 10); caixa(gE, [24, 40, 8], [-362, YE - 26, 604], M.pedraF, iR, 10);
    for (let k = 0; k < 10; k++) caixa(gE, [24, 4, 9], [-362 - k * 0, YE - 6 - k * 4, 540 - k * 9], M.pedraF, iR, 10);
    // portas de Hulda ao sul
    for (const x of [-120, 60]) { caixa(gE, [30, 14, 2], [x, YE - 7, 662], M.escuro, I('Portas de Hulda', 'As portas de Hulda, no sul, serviam de entrada e saída do povo.', MD('1:3'), 'Localização e perfil provisórios.')); }
    for (let k = 0; k < 16; k++) caixa(gE, [260, 1.4, 4], [-30, YE - 22 + k * 1.4 - 1.4 * 16 + 20, 668 + (16 - k) * 4], M.pedraF, I('Escadaria do sul', 'Escadaria larga diante das portas de Hulda; restos dela foram escavados.', 'Arqueologia do Ofel', 'Dimensões ilustrativas.'), 10); }
  // ═════ PÓRTICO REAL (sul) e colunatas ═════
  const gPR = G('portico_real');
  { const iPR = I('Pórtico Real', 'O pórtico real tinha quatro fileiras de colunas, formando três naves; a do meio era mais alta. Era uma das obras mais notáveis sob o sol.', JA('15.411–416'), 'Número e passo das colunas: parâmetros de trabalho do projeto.');
    const colG = new THREE.CylinderGeometry(1.25, 1.4, 18, 14), n = 4 * 70, col = new THREE.InstancedMesh(colG, Me.brancoF, n); const m4 = new THREE.Matrix4(); let i = 0;
    for (const z of [606, 620, 637, 651]) for (let k = 0; k < 70; k++) { const x = -326 + k * 9.1; const alt = z === 620 || z === 637 ? 1.55 : 1; m4.compose(new THREE.Vector3(x, YE + 9 * alt, z), new THREE.Quaternion(), new THREE.Vector3(1, alt, 1)); col.setMatrixAt(i++, m4); }
    col.castShadow = col.receiveShadow = true; col.userData.info = iPR; pecas.push(col); gPR.add(col);
    caixa(gPR, [640, 2, 18], [-11, YE + 19, 645], Me.brancoF, iPR, 14); caixa(gPR, [640, 2, 18], [-11, YE + 19, 612], Me.brancoF, iPR, 14); caixa(gPR, [640, 2, 18], [-11, YE + 28.5, 628.5], Me.brancoF, iPR, 14);
    for (const [z, y, r] of [[645, YE + 20, 0.18], [612, YE + 20, -0.18], [628.5, YE + 29.5, 0]]) { const tel = caixa(gPR, [642, 1.2, r ? 20 : 20], [-11, y + 2, z], Me.telha, iPR, 8); tel.rotation.x = r; }
    caixa(gPR, [640, 30, 3], [-11, YE + 15, 656], M.pedraF, iPR, 14);
    // colunatas a oeste, norte e leste (corredor de 20, colunas de 12) — Guerra 5.190–192
    const iCo = I('Colunatas do recinto', 'Pórticos duplos rodeavam o recinto, com colunas de mármore branco e teto de cedro.', JG('5.190–192'), 'Corredor esquemático de 20 côvados; colunas de 12.');
    const cG = new THREE.CylinderGeometry(0.9, 1, 12, 10), nCo = 340, co = new THREE.InstancedMesh(cG, Me.brancoF, nCo); let j = 0;
    const lado = (x0, z0, x1, z1, passo) => { const L = Math.hypot(x1 - x0, z1 - z0), n2 = Math.floor(L / passo); for (let k = 0; k <= n2 && j < nCo; k++) { const t = k / n2; m4.makeTranslation(x0 + (x1 - x0) * t, YE + 6, z0 + (z1 - z0) * t); co.setMatrixAt(j++, m4); } };
    lado(-324, -390, -324, 590, 9); lado(-324, -390, 303, -390, 9); lado(303, -390, 303, 590, 9);
    co.castShadow = true; co.userData.info = iCo; pecas.push(co); gPR.add(co);
    caixa(gPR, [22, 1.5, 1000], [-333, YE + 12.7, 100], Me.telha, iCo, 8); caixa(gPR, [630, 1.5, 22], [-11, YE + 12.7, -399], Me.telha, iCo, 8); caixa(gPR, [22, 1.5, 1000], [312, YE + 12.7, 100], Me.telha, iCo, 8); }
  // ═════ FORTALEZA ANTÔNIA (noroeste) ═════
  const gAn = G('antonia');
  { const iA = I('Fortaleza Antônia', 'A Antônia ficava no ângulo dos pórticos do norte e do oeste, sobre uma rocha; tinha quatro torres, e a do sudeste era a mais alta.', JG('5.238–247'), 'Planta e dimensões: hipótese do projeto.');
    caixa(gAn, [90, 40, 80], [-309, YE + 20, -385 - 50], M.pedraF, iA, 14);
    for (const [dx, dz, h] of [[-45, -40, 60], [45, -40, 60], [-45, 40, 60], [45, 40, 80]]) caixa(gAn, [16, h, 16], [-309 + dx, YE + h / 2, -435 + dz], M.pedraF, iA, 12); }
  // ═════ SOREG: a balaustrada com avisos aos gentios ═════
  const gSo = G('soreg');
  { const iS = I('Soreg (balaustrada)', 'Uma balaustrada de pedra de três côvados cercava o recinto sagrado; nela havia placas, em grego e latim, proibindo a entrada de estrangeiros.', JG('5.193–194') + '; ' + MD('2:3'), 'Middot dá 10 palmos de altura; Josefo, 3 côvados. Aqui: 3 côvados.');
    const sx0 = -119, sx1 = 256, sz = 85; caixa(gSo, [sx1 - sx0, 3, 0.8], [(sx0 + sx1) / 2, YE + 1.5, sz], Me.brancoF, iS, 8); caixa(gSo, [sx1 - sx0, 3, 0.8], [(sx0 + sx1) / 2, YE + 1.5, -sz], Me.brancoF, iS, 8); caixa(gSo, [0.8, 3, 2 * sz], [sx0, YE + 1.5, 0], Me.brancoF, iS, 8); caixa(gSo, [0.8, 3, 60], [sx1, YE + 1.5, 55], Me.brancoF, iS, 8); caixa(gSo, [0.8, 3, 60], [sx1, YE + 1.5, -55], Me.brancoF, iS, 8);
    // pódio dos átrios e os degraus depois do soreg (12 em Middot, 14 em Josefo)
    caixa(gSo, [330, 8, 135], [71.5, YM - 4, 0], M.pedraF, I('Pódio dos átrios', 'Depois da balaustrada, degraus subiam ao recinto dos átrios (12 em Middot 2:3; 14 em Josefo, Guerra 5.195).', MD('2:3'), 'As duas contagens são mostradas no texto, não somadas.'), 14);
    for (let k = 0; k < 12; k++) caixa(gSo, [6, (k + 1) * 0.67, 30], [236 + 6 * 0 + (12 - k) * 1.6, YE + (k + 1) * 0.335, 0], M.pedraF, null, 10); }
  // ═════ ÁTRIO DAS MULHERES (135 × 135) e a ESCADA SEMICIRCULAR de 15 degraus até a porta de Nicanor ═════
  const gMu = G('mulheres');
  { const iMu = I('Átrio das mulheres', 'O átrio das mulheres tinha cento e trinta e cinco côvados de comprimento por cento e trinta e cinco de largura, com quatro câmaras nos quatro cantos, de quarenta côvados cada.', MD('2:5'), 'Portas e detalhes: interpretação.');
    caixa(gMu, [135, 0.6, 135], [165.5, YM - 0.3, 0], M.laje, iMu, 18);
    const parede = (w, d, x, z) => caixa(gMu, [w, 26, d], [x, YM + 13, z], M.pedraF, iMu, 14);
    parede(135, 4, 165.5, 69.5); parede(135, 4, 165.5, -69.5); parede(4, 50, 235, 44); parede(4, 50, 235, -44);
    for (const [cx, cz] of [[118, -47.5], [213, -47.5], [118, 47.5], [213, 47.5]]) { const c = caixa(gMu, [40, 14, 40], [cx, YM + 7, cz], M.pedraF, I('Câmara de canto (uma das quatro)', 'Câmara dos nazireus, da lenha, dos leprosos e do óleo: as quatro câmaras dos cantos do átrio das mulheres.', MD('2:5'), 'Altura e acabamento: interpretação.'), 14); }
    caixa(gMu, [26, 30, 8], [235, YM + 15, 0], M.pedraF, iMu, 12); caixa(gMu, [27, 6, 9], [235, YM + 31, 0], Me.brancoF, iMu, 12);   // porta oriental (Formosa?)
    // 15 degraus em semicírculo (Middot 2:5) subindo do átrio das mulheres (Y=-10) ao átrio de Israel (Y=-2)
    const iEs = I('Os quinze degraus', 'Quinze degraus subiam do átrio das mulheres ao átrio de Israel, correspondendo aos quinze cânticos dos degraus dos Salmos; não eram retos, mas redondos, como meia eira.', MD('2:5'), 'O raio de cada degrau é interpretação; o número e a forma são da fonte.');
    for (let k = 0; k < 15; k++) { const r = 21 - k * 1, h = (k + 1) * (8 / 15); const g = new THREE.CylinderGeometry(r, r, h, 64, 1, false, 0, Math.PI); const d = new THREE.Mesh(g, M.pedraF); d.position.set(98, YM + h / 2, 0); d.rotation.y = Math.PI / 2; d.castShadow = d.receiveShadow = true; d.userData.info = iEs; pecas.push(d); gMu.add(d); }
    // muro e porta de Nicanor (bronze de Corinto)
    const iN = I('Porta de Nicanor', 'A porta oriental do átrio de Israel era a de Nicanor; suas portas eram de bronze de Corinto, e brilhavam como ouro.', MD('1:4; 2:3, 6') + '; ' + JG('5.201'), 'Josefo (Guerra 5.201–204) diz que esta porta era bem maior que as outras: 50 côvados de altura e portas de 40. Aqui o vão tem 20 × 34 (interpretação entre as duas fontes).');
    for (const sg of [-1, 1]) { caixa(gMu, [6, 26, 50], [98, YI + 13, sg * 45], M.pedraF, iN, 14); caixa(gMu, [9, 48, 10], [98, YI + 24, sg * 15], M.pedraF, iN, 14); caixa(gMu, [10, 2, 11], [98, YI + 49, sg * 15], Me.brancoF, iN, 10); }
    caixa(gMu, [8, 14, 20], [98, YI + 41, 0], M.pedraF, iN, 14); caixa(gMu, [10, 2, 32], [98, YI + 48.5, 0], Me.brancoF, iN, 10);
    for (const sg of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(98 + 4, YI, sg * 10); piv.rotation.y = sg * 1.25; caixa(piv, [0.6, 34, 10], [0, 17, -sg * 5], M.bronze, iN, 8); gMu.add(piv); } }
  // ═════ ÁTRIO INTERIOR (Israel e sacerdotes), ALTAR e rampa ═════
  const gIn = G('atrio');
  { const iIn = I('Átrio de Israel e dos sacerdotes', 'O átrio inteiro tinha cento e oitenta e sete côvados de comprimento por cento e trinta e cinco de largura; o átrio de Israel tinha onze côvados, e o dos sacerdotes também onze.', MD('2:6; 5:1'), 'Posição global e níveis: esquemáticos.');
    caixa(gIn, [187, 0.6, 135], [3.5, YI - 0.3, 0], M.laje, iIn, 18);
    const par = (w, d, x, z) => caixa(gIn, [w, 30, d], [x, YI + 15, z], M.pedraF, iIn, 14); par(187, 4, 3.5, 69.5); par(187, 4, 3.5, -69.5); par(4, 135, -91, 0);
    for (let x = -70; x <= 80; x += 30) for (const s of [-1, 1]) caixa(gIn, [10, 36, 8], [x, YI + 18, s * 69.5], M.pedraF, I('Portas do átrio', 'O átrio tinha portas ao norte e ao sul, com câmaras sobre elas.', MD('1:4–5; 2:6'), 'Posição e número aqui: esquemáticos.'), 12);
    caixa(gIn, [0.4, 0.4, 135], [87, YI + 0.2, 0], Me.brancoF, null, 8);   // linha entre Israel e sacerdotes
    // altar: 32 × 32 na base, em degraus, com chifres, e rampa ao sul (Middot 3:1–3)
    const iAl = I('Altar dos holocaustos', 'O altar tinha trinta e dois côvados por trinta e dois na base; subia em degraus de um, cinco e três côvados, e tinha chifres nos cantos. A rampa ficava ao sul.', MD('3:1–3'), 'Josefo (Guerra 5.225) dá 50 × 50 e 15 de altura: variante não combinada aqui. Sem degraus, só rampa (Middot 3:3).');
    const xa = 60; caixa(gIn, [32, 1, 32], [xa, YI + 0.5, 0], Me.brancoF, iAl, 10); caixa(gIn, [30, 5, 30], [xa, YI + 3.5, 0], Me.brancoF, iAl, 10); caixa(gIn, [28, 3, 28], [xa, YI + 7.5, 0], Me.brancoF, iAl, 10); caixa(gIn, [24, 0.6, 24], [xa, YI + 9.3, 0], mat({ color: 0x2a1a12, emissive: 0x5a1e06, emissiveIntensity: 0.4, roughness: 1 }), iAl);
    for (const [dx, dz] of [[13, 13], [-13, 13], [13, -13], [-13, -13]]) caixa(gIn, [1.2, 1.4, 1.2], [xa + dx, YI + 9.7, dz], Me.brancoF, iAl, 4);
    const rp = caixa(gIn, [16, 1.2, 33], [xa, YI + 4.6, 31], Me.brancoF, iAl, 10); rp.rotation.x = 0.27;
    // doze degraus do átrio dos sacerdotes ao pórtico (Middot 3:6)
    for (let k = 0; k < 12; k++) caixa(gIn, [1.6, YI * -1 + 0.5 + (12 - k) * 0, 100], [22 + 1.6 * k + 0.8, YI + (12 - k) * 0.17, 0], M.pedraF, I('Os doze degraus do pórtico', 'Entre o pórtico e o altar havia vinte e dois côvados, e doze degraus.', MD('3:6'), 'Altura de cada degrau: interpretação.'), 10); }
  // ═════ O SANTUÁRIO: fachada de 100 × 100, corpo de 70, Santo Lugar 40 × 20, Santo dos Santos 20 × 20 (Middot 4:6–7) ═════
  const gSa = G('santuario'); const gOu = G('ouro'); const gCam = G('camaras');
  { const iFa = I('Fachada do santuário', 'A casa tinha cem côvados de comprimento, cem de largura e cem de altura; atrás, era estreita, e na frente larga, como um leão.', MD('4:6–7'), 'Josefo (Guerra 5.207) descreve o corpo posterior 40 côvados mais estreito (60 em vez de 70).');
    const iOuro = I('Ouro na fachada', 'A fachada era toda coberta de placas de ouro pesado; ao nascer do sol refletia um brilho de fogo, e de longe parecia um monte de neve, pois onde não havia ouro a pedra era branquíssima.', JG('5.222–223'), 'A distribuição exata das placas é interpretação.');
    // parede frontal do pórtico X=17..22, Z=-50..50, Y=0..100, com o vão de 20 × 40 (Middot 3:7)
    caixa(gSa, [5, 100, 40], [19.5, 50, -30], Me.branco, iFa, 16); caixa(gSa, [5, 100, 40], [19.5, 50, 30], Me.branco, iFa, 16); caixa(gSa, [5, 60, 20], [19.5, 70, 0], Me.branco, iFa, 16);
    caixa(gOu, [0.4, 92, 36], [22.2, 50, -31], Me.ouroF, iOuro, 10); caixa(gOu, [0.4, 92, 36], [22.2, 50, 31], Me.ouroF, iOuro, 10); caixa(gOu, [0.4, 52, 22], [22.2, 70, 0], Me.ouroF, iOuro, 10);
    for (const z of [-48, -12, 12, 48]) caixa(gSa, [3, 96, 4], [23.2, 48, z], Me.brancoF, iFa, 10);   // pilastras brancas entre as placas
    caixa(gSa, [7, 4, 104], [21, 98, 0], Me.brancoF, iFa, 12);   // cornija
    // pontas no teto (Guerra 5.224: pontas de ouro afiadas para as aves não pousarem)
    const iPo = I('Pontas no teto', 'No alto havia pontas de ouro afiadas, para que nenhuma ave pousasse e sujasse o telhado.', JG('5.224'), 'A cor dourada das pontas é proposta visual.');
    const pg = new THREE.ConeGeometry(0.5, 2.6, 6); const npt = 140, pts = new THREE.InstancedMesh(pg, Me.ouroF, npt); const m4 = new THREE.Matrix4(); let ip = 0;
    for (let z = -50; z <= 50 && ip < npt; z += 2.5) { m4.makeTranslation(23.5, 101.3, z); pts.setMatrixAt(ip++, m4); }
    for (let x = -77; x <= 22 && ip < npt; x += 3) for (const z of [-35, 35]) if (ip < npt) { m4.makeTranslation(x, 101.3, z); pts.setMatrixAt(ip++, m4); }
    pts.count = ip; pts.userData.info = iPo; pecas.push(pts); gOu.add(pts);
    // pórtico interno (X=6..17) e laterais da fachada
    caixa(gSa, [11, 100, 15], [11.5, 50, 42.5], Me.branco, iFa, 16); caixa(gSa, [11, 100, 15], [11.5, 50, -42.5], Me.branco, iFa, 16);
    caixa(gSa, [11, 4, 70], [11.5, 98, 0], Me.branco, iFa, 16);
    // parede oriental do corpo X=0..6 com a porta 10 × 20 (Middot 4:1)
    caixa(gSa, [6, 100, 30], [3, 50, -20], Me.branco, iFa, 16); caixa(gSa, [6, 100, 30], [3, 50, 20], Me.branco, iFa, 16); caixa(gSa, [6, 80, 10], [3, 60, 0], Me.branco, iFa, 16);
    // a videira de ouro sobre a porta (Middot 3:8; Guerra 5.210)
    const iVi = I('A videira de ouro', 'Uma videira de ouro estava sobre a entrada do santuário, apoiada em vigas; quem oferecia uma folha, uma uva ou um cacho, trazia e pendurava nela.', MD('3:8') + '; ' + JG('5.210'), 'Desenho dos ramos: interpretação.');
    const vinha = new THREE.Group(); for (let k = 0; k < 9; k++) { const a = k / 8 * Math.PI; const pts2 = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, Math.sin(a) * 6 + 2, Math.cos(a) * 8), new THREE.Vector3(0, Math.sin(a) * 9 + 3, Math.cos(a) * 12)]; const tb = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), 16, 0.28, 6), Me.ouroF); vinha.add(tb);
      for (let u = 0; u < 3; u++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 6), Me.ouroF); c.scale.set(1, 1.4, 1); c.position.copy(pts2[2]).add(new THREE.Vector3(0, -1.2 - u * 0.6, (u - 1) * 0.6)); vinha.add(c); } }
    vinha.position.set(6.6, 21, 0); marcar(vinha, iVi); gOu.add(vinha);
    // o véu babilônico na entrada (Guerra 5.212–214)
    const veuG = new THREE.PlaneGeometry(10, 20, 30, 4); const vp = veuG.attributes.position; for (let i = 0; i < vp.count; i++) vp.setZ(i, Math.sin(vp.getX(i) * 2.2) * 0.25); veuG.computeVertexNormals();
    malha(gSa, veuG, M.veu, [6.4, 10, 0], I('O véu babilônico', 'Diante das portas pendia um véu babilônico bordado de azul, linho fino, escarlate e púrpura, de maravilhosa textura: uma imagem do universo.', JG('5.212–214'), 'É outro véu, diferente das duas cortinas do Santo dos Santos.'), [0, Math.PI / 2, 0]);
    // corpo: paredes norte e sul (Z=±30..35), oeste, Santo Lugar e Santo dos Santos
    for (const s of [-1, 1]) { caixa(gSa, [84, 100, 5], [-36, 50, s * 32.5], Me.branco, iFa, 16); caixa(gSa, [84, 60, 6], [-36, 70, s * 13], Me.branco, iFa, 16); }
    caixa(gSa, [5, 100, 70], [-75.5, 50, 0], Me.branco, iFa, 16); caixa(gSa, [6, 100, 70], [-64, 50, 0], Me.branco, iFa, 16);
    caixa(gSa, [84, 4, 70], [-36, 98, 0], Me.branco, iFa, 16);   // teto alto
    // câmaras laterais em três andares (Middot 4:3–4; Guerra 5.220–221)
    const iCm = I('Câmaras laterais', 'Ao redor da casa havia trinta e oito câmaras, em três andares; quinze ao norte, quinze ao sul e oito a oeste.', MD('4:3–4') + '; ' + JG('5.220–221'), 'Divisões internas: esquemáticas.');
    for (const s of [-1, 1]) for (const y of [0, 10, 20]) { caixa(gCam, [67, 0.8, 14], [-33.5, y + 10, s * 23], M.cedro, iCm, 8); for (let x = -66; x <= -1; x += 4.4) caixa(gCam, [0.6, 10, 14], [x, y + 5, s * 23], M.pedra, iCm, 8); }
    for (const s of [-1, 1]) caixa(gCam, [67, 30, 0.6], [-33.5, 15, s * 16.3], M.pedra, iCm, 10);
    // Santo Lugar 40 × 20 × 40, revestido; teto do Santo Lugar a 40
    const iSL = I('Santo Lugar', 'O Santo Lugar tinha quarenta côvados de comprimento e vinte de largura.', MD('4:7'), 'Altura interior de 40 em Middot 4:6; Josefo (Guerra 5.215) dá 60.');
    for (const s of [-1, 1]) caixa(gSa, [40, 40, 0.3], [-20, 20, s * 9.85], M.painelOuro, iSL, 10);
    caixa(gSa, [61, 0.3, 20], [-30.5, 0.15, 0], M.pisoOuro, iSL, 8); caixa(gSa, [40, 0.8, 20], [-20, 40.4, 0], M.cedro, iSL, 8);
    caixa(gSa, [1, 40, 20], [-40.5, 20, 0], M.painelOuro, I('Divisória', 'Entre o Santo Lugar e o Santo dos Santos havia um côvado de espaço.', MD('4:7'), 'Representada como faixa com as duas cortinas.'), 10);
    // Santo dos Santos 20 × 20, VAZIO (Guerra 5.219)
    const iSS = I('Santo dos Santos (vazio)', 'Nele não havia absolutamente nada; era inacessível, inviolável e invisível a todos, e chamava-se o Santo dos Santos.', JG('5.219') + '; ' + MD('4:7'), 'A arca não existia mais no segundo templo.');
    for (const s of [-1, 1]) caixa(gSa, [20, 40, 0.3], [-51, 20, s * 9.85], M.painelOuro, iSS, 10); caixa(gSa, [0.3, 40, 20], [-60.9, 20, 0], M.painelOuro, iSS, 10);
    caixa(gSa, [20, 0.6, 20], [-51, 0.3, 0], mat({ color: 0x8a7a62, roughness: 0.95 }), I('A pedra da fundação', 'Depois que a arca foi levada, havia ali uma pedra, desde os primeiros profetas, chamada pedra da fundação, de três dedos de altura.', 'Mishná, Yoma 5:2'), 6); }
  // ═════ DENTRO: menorá, mesa dos pães, altar do incenso e as duas cortinas ═════
  const gMo = G('mobiliario');
  { const iMe = I('O candelabro (menorá)', 'O candelabro, a mesa e o altar do incenso estavam no Santo Lugar; as sete lâmpadas do candelabro representavam os sete planetas.', JG('5.216–217'), 'Posição: interpretação do projeto (ao sul).');
    const me = new THREE.Group(); me.add(new THREE.Mesh(torno([[0, 0], [1.1, 0], [1.0, 0.4], [0.3, 0.8], [0.18, 5.0], [0.25, 5.2], [0, 5.25]], 20), Me.ouroF));
    for (const r of [0.8, 1.6, 2.4]) { const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.13, 8, 28, Math.PI), Me.ouroF); arc.rotation.z = Math.PI; arc.position.y = 5.1; me.add(arc); for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), M.chama); ch.position.set(s * r, 5.5, 0); me.add(ch); } }
    const ch0 = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), M.chama); ch0.position.y = 5.5; me.add(ch0);
    me.position.set(-22, 0.3, 6); me.rotation.y = Math.PI / 2; marcar(me, iMe); gMo.add(me);
    const iMs = I('A mesa dos pães', 'A mesa ficava ao norte, com os doze pães da proposição.', JG('5.217') + '; ' + MD('—'), 'Posição: interpretação do projeto.');
    const ms = new THREE.Group(); const tp = new THREE.Mesh(new THREE.BoxGeometry(2, 0.15, 1), Me.ouroF); tp.position.y = 1.5; ms.add(tp); for (const [a, b] of [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 8), Me.ouroF); p.position.set(a, 0.75, b); ms.add(p); }
    for (let k = 0; k < 12; k++) { const pao = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.8), M.pao); pao.position.set(-0.45 + (k % 2) * 0.9, 1.62 + Math.floor(k / 2) * 0.11, 0); ms.add(pao); }
    ms.position.set(-22, 0.3, -6); ms.scale.setScalar(1.8); marcar(ms, iMs); gMo.add(ms);
    const al = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), Me.ouroF); al.position.set(-36, 1.3, 0); al.scale.setScalar(1.5); al.userData.info = I('O altar do incenso', 'Entre o candelabro e a mesa estava o altar do incenso, com treze especiarias tiradas do mar e da terra.', JG('5.218')); pecas.push(al); gMo.add(al);
    const iCt = I('As duas cortinas', 'No Dia da Expiação, o sumo sacerdote passava entre as duas cortinas que separavam o Santo Lugar do Santo dos Santos.', 'Mishná, Yoma 5:1', 'Josefo (Guerra 5.219) fala de um véu; Middot 4:7, de um côvado de separação.');
    for (const x of [-40.2, -40.8]) { const g2 = new THREE.PlaneGeometry(20, 39, 40, 4); const p2 = g2.attributes.position; for (let i = 0; i < p2.count; i++) p2.setZ(i, Math.sin(p2.getX(i) * 1.8 + x) * 0.12); g2.computeVertexNormals(); malha(gMo, g2, M.veu, [x, 19.6, 0], iCt, [0, Math.PI / 2, 0]); }
    const luzS = new THREE.PointLight(0xffc27a, 0, 80, 1.4); luzS.position.set(-20, 14, 0); gMo.add(luzS); gMo.userData.luz = luzS; }
  // ═════ PESSOAS: escala humana (4 côvados) ═════
  const gPe = G('pessoas');
  { // figuras humanas (manto até os pés + cabeça com véu/turbante), cerca de 4 côvados de altura: dão a escala do templo
    const n = 520, manto = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.75, 3.1, 10), Me.pessoa, n), cab = new THREE.InstancedMesh(new THREE.SphereGeometry(0.36, 12, 10), Me.pessoa, n);
    const cores = [0xe9e0cf, 0xcdb894, 0x8a6a4a, 0x6b7f9a, 0x9b5a44, 0xf2ece0, 0xb8a27a], pele = [0xc99a72, 0xb07e58, 0xd8ad86], cc = new THREE.Color(), m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { let x, z, y; const q = rnd(); if (q < 0.35) { x = 105 + rnd() * 125; z = -60 + rnd() * 120; y = YM; } else if (q < 0.5) { x = 74 + rnd() * 22; z = -60 + rnd() * 120; y = YI; } else { x = -320 + rnd() * 620; z = -380 + rnd() * 960; y = YE; if (x > -125 && x < 262 && Math.abs(z) < 90) x += 420; }
      const esc = 0.9 + rnd() * 0.2; m4.compose(new THREE.Vector3(x, y + 1.55 * esc, z), new THREE.Quaternion(), new THREE.Vector3(esc, esc, esc)); manto.setMatrixAt(i, m4); manto.setColorAt(i, cc.setHex(cores[Math.floor(rnd() * cores.length)]));
      m4.compose(new THREE.Vector3(x, y + 3.45 * esc, z), new THREE.Quaternion(), new THREE.Vector3(esc, esc * 1.1, esc)); cab.setMatrixAt(i, m4); cab.setColorAt(i, cc.setHex(rnd() < 0.6 ? cores[Math.floor(rnd() * cores.length)] : pele[Math.floor(rnd() * pele.length)])); }
    const info = I('Pessoas (escala humana)', 'Figuras de cerca de quatro côvados (1,8 m) mostram o tamanho real do templo: a fachada tinha cem côvados, mais de vinte vezes a altura de uma pessoa.', MD('4:6'), 'Figuras ilustrativas; roupas e cores são interpretação.');
    [manto, cab].forEach((m) => { m.castShadow = true; m.userData.info = info; pecas.push(m); gPe.add(m); }); }
  // ── painel de camadas ──
  const ROT = { terreno: 'Monte, vales e a cidade', esplanada: 'Esplanada e muros', portico_real: 'Pórtico Real e colunatas', antonia: 'Fortaleza Antônia', soreg: 'Soreg (balaustrada)', mulheres: 'Átrio das mulheres e os 15 degraus', atrio: 'Átrio de Israel, sacerdotes e altar', santuario: 'Santuário (paredes)', ouro: 'Ouro, pontas e videira', camaras: 'Câmaras laterais', mobiliario: 'Menorá, mesa, incenso e cortinas', pessoas: 'Pessoas (escala humana)' };
  raiz.querySelector('.tp-cam-l').innerHTML = Object.keys(ROT).map((id) => `<label><input type="checkbox" data-g="${id}" checked>${ROT[id]}</label>`).join('');
  raiz.querySelector('.tp-cam-l').addEventListener('change', (e) => { const g = grupos[e.target.dataset.g]; if (g) g.visible = e.target.checked; });

  // ── câmera de maquete: girar com inércia, aproximar, mover, duplo clique centraliza ──
  const luzesDentro = [gMo.userData.luz];
  const alvo = new THREE.Vector3(30, 14, 0); let raio = 95, azim = 0.25, elev = 0.08; const vel = { az: 0, el: 0 };
  let voo = null, corteA = 1e4, tetoA = 1e4, corteV = 1e4, tetoV = 1e4, dentro = 0, zoomPend = 0;
  function posicionar() { elev = Math.max(-0.3, Math.min(1.52, elev)); camera.position.set(alvo.x + raio * Math.cos(elev) * Math.cos(azim), alvo.y + raio * Math.sin(elev), alvo.z + raio * Math.cos(elev) * Math.sin(azim)); camera.lookAt(alvo); }
  const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  function irPara(a, r, az, el, ms = 1600) { let daz = az - azim; while (daz > Math.PI) daz -= Math.PI * 2; while (daz < -Math.PI) daz += Math.PI * 2; voo = { de: { a: alvo.clone(), r: raio, az: azim, el: elev }, para: { a: a.clone(), r, az: azim + daz, el }, t0: performance.now(), ms }; }
  const abrirCorte = (sim) => { for (const id of ['atrio', 'mulheres', 'soreg', 'camaras']) if (grupos[id]) grupos[id].visible = !sim; const cb = raiz.querySelectorAll('.tp-cam-l input'); cb.forEach((c) => { if (['atrio', 'mulheres', 'soreg', 'camaras'].includes(c.dataset.g)) c.checked = !sim; }); };   // no corte, os átrios saem da frente
  const VISTAS = {
    entrada: () => { abrirCorte(false); corteA = 1e4; tetoA = 1e4; dentro = 0; irPara(new THREE.Vector3(60, 18, 0), 92, 0, -0.23, 2000); },
    esplanada: () => { abrirCorte(false); corteA = 1e4; tetoA = 1e4; dentro = 0; irPara(new THREE.Vector3(1, 0, 81), 1200, 2.25, 0.38, 2400); },
    fora: () => { abrirCorte(false); corteA = 1e4; tetoA = 1e4; dentro = 0; irPara(new THREE.Vector3(0, 40, 0), 280, 0.7, 0.32, 2000); },
    corte: () => { abrirCorte(true); corteA = 0; tetoA = 1e4; dentro = 1; irPara(new THREE.Vector3(-25, 25, 0), 170, Math.PI / 2, 0.12, 2000); },
    santo: () => { abrirCorte(true); corteA = 0; tetoA = 41; dentro = 1; irPara(new THREE.Vector3(-22, 9, 0), 48, 1.35, 0.22, 2000); },
    cima: () => { abrirCorte(false); corteA = 1e4; tetoA = 1e4; dentro = 0; irPara(new THREE.Vector3(40, 0, 110), 1500, Math.PI / 2, 1.45, 2400); },
  };
  raiz.querySelector('.tp-barra').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; if (b.dataset.v === 'camadas') { const c = raiz.querySelector('.tp-cam'); c.hidden = !c.hidden; b.classList.toggle('ativo', !c.hidden); return; }
    raiz.querySelectorAll('.tp-barra [data-v]:not([data-v=camadas])').forEach((x) => x.classList.toggle('ativo', x === b)); VISTAS[b.dataset.v](); });
  let arr = null, moveu = false; const ptrs = new Map(); let pinca = null;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); arr = { x: e.clientX, y: e.clientY, b: e.button, t: performance.now() }; moveu = false; voo = null; if (chegada.t0) fimChegada(); try { canvas.setPointerCapture(e.pointerId); } catch (_) {} if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinca = Math.hypot(a.x - b.x, a.y - b.y); } });
  canvas.addEventListener('pointermove', (e) => { if (!arr) return; const p0 = ptrs.get(e.pointerId); if (p0) { p0.x = e.clientX; p0.y = e.clientY; }
    if (ptrs.size === 2 && pinca) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); raio = Math.max(3, Math.min(3200, raio * pinca / d)); pinca = d; moveu = true; return; }
    const dx = e.clientX - arr.x, dy = e.clientY - arr.y; if (Math.abs(dx) + Math.abs(dy) > 3) moveu = true; arr.x = e.clientX; arr.y = e.clientY;
    if (arr.b === 2 || e.shiftKey) { const dir = new THREE.Vector3(); camera.getWorldDirection(dir); const lado = new THREE.Vector3().crossVectors(dir, camera.up).normalize(), frente = new THREE.Vector3(dir.x, 0, dir.z).normalize(); const k = raio * 0.0018; alvo.addScaledVector(lado, -dx * k).addScaledVector(frente, dy * k); }
    else { vel.az = dx * 0.0055; vel.el = dy * 0.0042; azim += vel.az; elev += vel.el; } });
  const solta = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinca = null; if (!ptrs.size) { if (arr && !moveu && performance.now() - arr.t < 400) clicar(e); arr = null; } };
  canvas.addEventListener('pointerup', solta); canvas.addEventListener('pointercancel', solta);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); voo = null; if (chegada.t0) fimChegada(); zoomPend += Math.max(-0.8, Math.min(0.8, e.deltaY * 0.0011)); }, { passive: false });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let ultimoClique = 0;
  function acertar(e) { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const vis = pecas.filter((m) => { let o = m; while (o) { if (!o.visible) return false; o = o.parent; } return true; });
    return ray.intersectObjects(vis, false).find((h) => { const m = h.object.material; return !m.clippingPlanes || m.clippingPlanes.every((pl) => pl.distanceToPoint(h.point) >= -0.01); }); }
  function clicar(e) { const h = acertar(e); const agora = performance.now();
    if (agora - ultimoClique < 320 && h) { irPara(h.point, Math.max(6, raio * 0.45), azim, elev, 900); ultimoClique = 0; return; } ultimoClique = agora;
    if (!h || !h.object.userData.info) return; const f = h.object.userData.info;
    ficha.innerHTML = `<button type="button" class="x" aria-label="Fechar">×</button><h4>${f.titulo}</h4><p>“${f.texto}”</p><cite>${f.ref} · Almeida</cite>${f.aviso ? `<div class="av">⚠ ${f.aviso}</div>` : ''}`; ficha.hidden = false; ficha.querySelector('.x').onclick = () => { ficha.hidden = true; }; }

  // ── CHEGADA DE CINEMA (projeto do ChatGPT): do céu pelo leste, sobre o Monte das Oliveiras e a porta oriental, parando no átrio das mulheres diante da escada ──
  const V3 = (a) => new THREE.Vector3(...a);
  const trilha = new THREE.CatmullRomCurve3([[1201, 850, 180], [801, 350, 80], [401, 110, 10], [215, 18, 3], [150, -3, 0]].map(V3), false, 'centripetal');
  const mira = new THREE.CatmullRomCurve3([[1, 0, 0], [21, 30, 0], [40, 36, 0], [60, 18, 0], [60, 18, 0]].map(V3), false, 'centripetal');
  const chegada = { t0: performance.now() + 300, ms: 17000, de: {}, para: {} };
  const fimChegada = () => { const p = trilha.getPoint(1), m = mira.getPoint(1), d = p.clone().sub(m); alvo.copy(m); raio = d.length(); azim = Math.atan2(d.z, d.x); elev = Math.asin(d.y / raio); chegada.t0 = 0; raiz.classList.add('pousou'); };
  camera.position.copy(trilha.getPoint(0)); camera.lookAt(mira.getPoint(0));
  requestAnimationFrame(() => raiz.classList.add('on'));
  let ativo = true, raf = 0, ultimo = performance.now();
  function ajustar() { const w = raiz.clientWidth || 1, h = raiz.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const obs = new ResizeObserver(ajustar); obs.observe(raiz); ajustar();
  function quadro(t) {
    if (!ativo) return; const dt = Math.min(50, t - ultimo); ultimo = t;
    if (chegada.t0) { const p = Math.max(0, Math.min(1, (t - chegada.t0) / chegada.ms)), e = ease(p);
      camera.position.copy(trilha.getPoint(e)); camera.lookAt(mira.getPoint(Math.min(1, e * 1.05)));
      luzesDentro.forEach((l) => { l.intensity = 380; });
      if (p >= 1) fimChegada(); else { renderer.render(cena, camera); raf = requestAnimationFrame(quadro); return; } }
    else if (voo) { const p = Math.min(1, (t - voo.t0) / voo.ms), e = ease(p); alvo.lerpVectors(voo.de.a, voo.para.a, e); raio = Math.exp(Math.log(voo.de.r) + (Math.log(voo.para.r) - Math.log(voo.de.r)) * e); azim = voo.de.az + (voo.para.az - voo.de.az) * e; elev = voo.de.el + (voo.para.el - voo.de.el) * e; if (p >= 1) voo = null; }
    else if (!arr) { azim += vel.az; elev += vel.el; vel.az *= 0.9; vel.el *= 0.9; }
    if (Math.abs(zoomPend) > 0.001) { const pa = zoomPend * Math.min(1, dt / 90); raio = Math.max(3, Math.min(3200, raio * Math.exp(pa))); zoomPend -= pa; }
    corteV += (corteA - corteV) * 0.07; tetoV += (tetoA - tetoV) * 0.07; corte.constant = corteV; teto.constant = tetoV;
    luzesDentro.forEach((l, k) => { l.intensity += ((dentro ? 650 : 380) - l.intensity) * 0.08; });
    posicionar(); sol.target.position.set(20, 0, 0); renderer.render(cena, camera); raf = requestAnimationFrame(quadro);
  }
  raf = requestAnimationFrame(quadro);
  function fechar() { ativo = false; cancelAnimationFrame(raf); obs.disconnect(); window.removeEventListener('keydown', tecla); raiz.classList.remove('on'); setTimeout(() => { renderer.dispose(); pmrem.dispose(); raiz.remove(); }, 500); if (aoFechar) aoFechar(); }
  raiz.querySelector('.tp-sair').onclick = fechar;
  function tecla(e) { if (e.key === 'Escape') fechar(); }
  window.addEventListener('keydown', tecla);
  return { fechar, vista: (v) => { if (chegada.t0) fimChegada(); if (VISTAS[v]) VISTAS[v](); }, pousou: () => raiz.classList.contains('pousou'), camadas: () => Object.keys(grupos).map((id) => ({ id, visivel: grupos[id].visible })), partes: () => pecas.length };
}
