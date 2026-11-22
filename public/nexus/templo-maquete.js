// TEMPLO DE SALOMÃO — maquete 3D (girar, aproximar, entrar), feita a partir do projeto e das imagens de referência
// pedidos ao ChatGPT (NEXUS-BIBLICO/templo-chatgpt/projeto.md) e das medidas do texto bíblico.
// Unidade: 1 côvado (convenção de 0,45 m). Eixos (do projeto): X+ leste, Y+ para cima, Z+ sul. Origem: centro do piso da casa.
// Texto bíblico: 1 Reis 6–8; 2 Crônicas 3–4 (Moriá: 2 Cr 3:1). O que o texto não descreve é marcado como interpretação.

export const TEMPLO = { nome: 'Templo de Salomão', lat: 31.7778, lon: 35.2356, lugar: 'Monte Moriá, Jerusalém', ref: '2 Crônicas 3:1' };
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
  <div class="tp-cab"><h2>Templo de Salomão</h2><p>MONTE MORIÁ · JERUSALÉM · 2 CRÔNICAS 3:1 · MAQUETE PELAS MEDIDAS DE 1 REIS 6–7</p></div>
  <button type="button" class="tp-sair">↩ Voltar ao globo</button>
  <div class="tp-barra">
    <button type="button" data-v="entrada" class="ativo">Entrada</button><button type="button" data-v="fora">Por fora</button><button type="button" data-v="corte">Por dentro (corte)</button>
    <button type="button" data-v="santo">Santo Lugar</button><button type="button" data-v="santissimo">Santo dos Santos</button><button type="button" data-v="cima">De cima</button><button type="button" data-v="camadas">Camadas</button>
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
  const camera = new THREE.PerspectiveCamera(38, 1, 0.3, 9000);
  const dirSol = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 14), THREE.MathUtils.degToRad(108));   // sol baixo a leste-sudeste: ilumina a fachada (apresentação)
  const fazCeu = () => { const s = new Sky(); s.scale.setScalar(8000); const u = s.material.uniforms; u.turbidity.value = 3.2; u.rayleigh.value = 2.2; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.86; u.sunPosition.value.copy(dirSol); return s; };
  cena.add(fazCeu());
  const pmrem = new THREE.PMREMGenerator(renderer); const cenaCeu = new THREE.Scene(); cenaCeu.add(fazCeu());
  cena.environment = pmrem.fromScene(cenaCeu, 0.02).texture; cena.environmentIntensity = 0.45;
  cena.fog = new THREE.FogExp2(0xd7dbd8, 0.00055);
  const sol = new THREE.DirectionalLight(0xffcf94, 3.6); sol.position.copy(dirSol).multiplyScalar(400); sol.castShadow = true; sol.shadow.mapSize.set(4096, 4096);
  Object.assign(sol.shadow.camera, { left: -130, right: 130, top: 130, bottom: -130, near: 50, far: 900 }); sol.shadow.bias = -0.00025; sol.shadow.normalBias = 0.35; sol.shadow.radius = 3; cena.add(sol); cena.add(sol.target);
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

  // medidas (côvados). Piso da casa sobre um pódio de 3 (interpretação: degraus, cf. Ez 40:49)
  const Y0 = 3, ESP = 2, L = 20, ALT = 30;
  // ═════ TERRENO: o alto do Moriá e as colinas de Jerusalém ═════
  const gT = G('terreno');
  const n2 = (x, z) => Math.sin(x * 0.004) * Math.cos(z * 0.0035) * 40 + Math.sin(x * 0.011 + 1.3) * Math.sin(z * 0.009) * 18 + Math.sin((x + z) * 0.02) * 5;
  const altT = (x, z) => { const r = Math.hypot(x - 30, z); if (r < 150) return -0.2; if (r < 420) { const q = (r - 150) / 270; return -0.2 - q * q * 70; } const q = Math.min(1, (r - 420) / 700); return -70 + q * 120 + n2(x, z) * (0.4 + q); };
  { const geo = new THREE.PlaneGeometry(5200, 5200, 220, 220); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, altT(p.getX(i), p.getZ(i))); geo.computeVertexNormals();
    const t = new THREE.Mesh(geo, M.terra); t.receiveShadow = true; t.userData.info = I('Monte Moriá', 'Começou Salomão a edificar a casa do Senhor em Jerusalém, no monte Moriá, onde o Senhor aparecera a Davi, seu pai.', '2 Crônicas 3:1', 'O relevo ao redor é uma aproximação visual, não um levantamento topográfico.'); pecas.push(t); gT.add(t);
    const oG = new THREE.IcosahedronGeometry(1, 1), tG = new THREE.CylinderGeometry(0.25, 0.4, 3, 6), cG = new THREE.ConeGeometry(1, 1, 8);
    const nO = 260, nC = 90, oliv = new THREE.InstancedMesh(oG, M.oliva, nO), tron = new THREE.InstancedMesh(tG, M.tronco, nO), cip = new THREE.InstancedMesh(cG, M.cipreste, nC);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < nO; i++) { const a = rnd() * 6.28, r = 120 + rnd() * 900, x = 30 + Math.cos(a) * r, z = Math.sin(a) * r; if (x > -60 && x < 120 && Math.abs(z) < 70) { oliv.setMatrixAt(i, zero); tron.setMatrixAt(i, zero); continue; } const y = altT(x, z), s = 2.4 + rnd() * 2.2;
      m4.compose(new THREE.Vector3(x, y + 3 + s * 0.6, z), q4, s4.set(s * 1.2, s * 0.8, s * 1.2)); oliv.setMatrixAt(i, m4); m4.compose(new THREE.Vector3(x, y + 1.5, z), q4, s4.set(1, 1, 1)); tron.setMatrixAt(i, m4); }
    for (let i = 0; i < nC; i++) { const a = rnd() * 6.28, r = 140 + rnd() * 700, x = 30 + Math.cos(a) * r, z = Math.sin(a) * r; const y = altT(x, z), s = 2 + rnd(); m4.compose(new THREE.Vector3(x, y + s * 5, z), q4, s4.set(s, s * 10, s)); cip.setMatrixAt(i, m4); }
    [oliv, tron, cip].forEach((im) => { im.castShadow = true; im.receiveShadow = true; gT.add(im); }); }

  // ═════ PÁTIO INTERIOR (1 Rs 6:36): 3 fiadas de pedra lavrada + 1 de vigas de cedro ═════
  const gP = G('patio');
  { const info = I('Pátio interior', 'Edificou o pátio interior de três ordens de pedras lavradas e de uma ordem de vigas de cedro.', '1 Reis 6:36', 'O tamanho do pátio não é dado: aqui X −45 a 105 e Z −55 a 55 (provisório, do projeto).');
    caixa(gP, [150, 0.6, 110], [30, -0.3, 0], M.laje, info, 16);
    const muro = (w, d, x, z) => { caixa(gP, [w, 3.3, d], [x, 1.65, z], M.pedraF, info, 10); caixa(gP, [w + 0.3, 0.9, d + 0.3], [x, 3.75, z], M.cedroF, info, 8); };
    muro(150, 2, 30, 55); muro(150, 2, 30, -55); muro(2, 110, -45, 0); muro(2, 40, 105, 35); muro(2, 40, 105, -35); }

  // ═════ CASA ═════
  const gC = G('casa'), gJan = G('janelas'), gTel = G('telhado');
  const iCasa = I('A casa do Senhor', 'A casa que o rei Salomão edificou ao Senhor era de sessenta côvados de comprimento, de vinte côvados de largura e de trinta côvados de altura.', '1 Reis 6:2', 'Medidas internas; a espessura das paredes (2 côvados) é hipótese do projeto.');
  const iPedra = I('Pedras lavradas', 'Edificava-se a casa com pedras preparadas; de maneira que nem martelo, nem machado, nem instrumento algum de ferro se ouviu na casa quando a edificavam.', '1 Reis 6:7');
  { const iPod = I('Pódio e degraus', 'O texto não descreve pódio nem degraus no templo de Salomão; Ezequiel 40:49 fala de degraus no templo da visão.', 'Ezequiel 40:49', 'Interpretação do projeto.');
    caixa(gC, [94, Y0, 46], [3, Y0 / 2, 0], M.pedra, iPod, 10);
    for (let k = 0; k < 6; k++) { const h = Y0 - k * 0.5; caixa(gC, [1.3, h, 22], [50.6 + k * 1.3, h / 2, 0], M.pedra, iPod, 10); }
    const Xa = -30 - ESP, Xb = 30;
    caixa(gC, [Xb - Xa, ALT, ESP], [(Xa + Xb) / 2, Y0 + ALT / 2, L / 2 + ESP / 2], M.pedra, iCasa); caixa(gC, [Xb - Xa, ALT, ESP], [(Xa + Xb) / 2, Y0 + ALT / 2, -L / 2 - ESP / 2], M.pedra, iCasa);
    caixa(gC, [ESP, ALT, L + ESP * 2], [Xa + ESP / 2, Y0 + ALT / 2, 0], M.pedra, iPedra);
    caixa(gC, [ESP, ALT, 5], [Xb + ESP / 2, Y0 + ALT / 2, -L / 2 + 2.5], M.pedra, iPedra); caixa(gC, [ESP, ALT, 5], [Xb + ESP / 2, Y0 + ALT / 2, L / 2 - 2.5], M.pedra, iPedra); caixa(gC, [ESP, ALT - 16, 10], [Xb + ESP / 2, Y0 + 16 + (ALT - 16) / 2, 0], M.pedra, iPedra);
    caixa(gC, [ESP + 0.4, 1, 11], [Xb + ESP / 2, Y0 + 16.4, 0], M.cedro, I('Umbral de oliveira', 'Assim também fez à porta do templo ombreiras de madeira de oliveira, da quarta parte da parede.', '1 Reis 6:33'));
    const iPorta = I('Portas de cipreste', 'E eram as duas portas de madeira de cipreste; e as duas folhas de uma porta eram dobradiças… e as entalhou de querubins, de palmas e de flores abertas, e as cobriu de ouro.', '1 Reis 6:34–35');
    for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(Xb + ESP, Y0, s * 5); piv.rotation.y = s * 1.15; caixa(piv, [0.35, 16, 5], [0, 8, -s * 2.5], M.porta, iPorta, 16); gC.add(piv); }
    const iJan = I('Janelas de grades fixas', 'E fez à casa janelas de grades fixas.', '1 Reis 6:4', 'Quantidade e formato: hipótese; a tradução de 6:4 é discutida.');
    for (let x = -26; x <= 26; x += 6) for (const s of [-1, 1]) { const z = s * (L / 2 + ESP + 0.02); caixa(gJan, [1.6, 4.2, 0.3], [x, Y0 + 22.5, z], M.escuro, iJan); for (let b = -1; b <= 1; b++) caixa(gJan, [0.12, 4.2, 0.35], [x + b * 0.45, Y0 + 22.5, z + s * 0.05], M.cedro, iJan); caixa(gJan, [2.4, 0.35, 0.8], [x, Y0 + 20.2, z + s * 0.3], M.pedra, iJan); }
    const iTeto = I('Cobertura de cedro', 'Assim, pois, edificou a casa e a acabou; e cobriu a casa com vigas e tábuas de cedro.', '1 Reis 6:9', 'Laje quase plana de terra sobre vigas, com parapeito: hipótese levantina do projeto (o texto não descreve).');
    caixa(gTel, [Xb - Xa + 12, 1, L + ESP * 2 + 2], [(Xa + Xb) / 2 + 6, Y0 + ALT + 0.5, 0], M.telhado, iTeto);
    for (let x = Xa; x <= Xb + 10; x += 2.2) for (const s of [-1, 1]) caixa(gTel, [0.9, 0.9, 2.2], [x, Y0 + ALT - 0.6, s * (L / 2 + ESP + 0.7)], M.cedro, iTeto, 6);
    for (const s of [-1, 1]) caixa(gTel, [Xb - Xa + 12, 1.6, 0.6], [(Xa + Xb) / 2 + 6, Y0 + ALT + 1.8, s * (L / 2 + ESP + 1)], M.pedra, iTeto);
    caixa(gTel, [0.6, 1.6, L + ESP * 2 + 2], [Xa - 0.3, Y0 + ALT + 1.8, 0], M.pedra, iTeto);
  }
  // ═════ PÓRTICO 20 × 10 (1 Rs 6:3) ═════
  const gPo = G('portico');
  { const iPo = I('Pórtico', 'E o pórtico diante do templo da casa era de vinte côvados de comprimento, segundo a largura da casa, e de dez côvados de largura diante da casa.', '1 Reis 6:3', '2 Crônicas 3:4 dá 120 côvados de altura (problema textual); aqui o pórtico tem a altura da casa.');
    for (const s of [-1, 1]) caixa(gPo, [10, ALT, ESP], [37, Y0 + ALT / 2, s * (L / 2 + ESP / 2)], M.pedra, iPo);
    caixa(gPo, [12.4, 4, L + ESP * 2 + 0.4], [37.2, Y0 + ALT - 2, 0], M.pedra, iPo);
    for (let z = -11.5; z <= 11.5; z += 2.3) caixa(gPo, [1.2, 0.9, 0.9], [43.7, Y0 + ALT - 3.2, z], M.cedro, iPo, 6);
    caixa(gPo, [0.5, 2.6, L + ESP * 2], [43.6, Y0 + ALT - 5.6, 0], M.friso, I('Friso de lírios (interpretação)', 'Os motivos de lírio aparecem no texto (1 Rs 7:19, 22); a faixa decorada da fachada é interpretação do projeto.', '1 Reis 7:22', 'Interpretação.'));
    const fr = gPo.children[gPo.children.length - 1]; const uv = fr.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0 + (i % 2) * 3, uv.getY(i)); uv.needsUpdate = true; }
  // ═════ CÂMARAS LATERAIS: 3 andares de 5 côvados; larguras 5, 6, 7 (1 Rs 6:5–6, 10) ═════
  const gCa = G('camaras');
  { const iCa = I('Câmaras laterais', 'A câmara de baixo era de cinco côvados de largura, e a do meio de seis côvados de largura, e a terceira de sete côvados de largura; porque pela parte de fora da casa em redor fez encostos, para que as vigas não entrassem nas paredes da casa.', '1 Reis 6:6', 'Espessuras de piso, recuos externos e divisões internas: parâmetros do projeto.');
    const ext = 9; [0, 1, 2].forEach((k) => { const y = Y0 + k * 5, recuo = k * 0.8, w = ext - recuo, z = L / 2 + ESP + w / 2;
      for (const s of [-1, 1]) { caixa(gCa, [62, 5, w], [-1, y + 2.5, s * z], M.pedra, iCa); caixa(gCa, [62.4, 0.45, w + 0.7], [-1, y + 5.1, s * (z + 0.35)], M.pedra, iCa, 8);
        for (let x = -24; x <= 24; x += 12) caixa(gCa, [0.6, 1.4, 0.3], [x, y + 2.8, s * (z + w / 2 + 0.02)], M.escuro, iCa); }
      caixa(gCa, [w, 5, L + ESP * 2 + (ext - recuo) * 2], [-30 - ESP - w / 2, y + 2.5, 0], M.pedra, iCa); caixa(gCa, [w + 0.7, 0.45, L + ESP * 2 + (ext - recuo) * 2 + 0.7], [-30 - ESP - w / 2 - 0.35, y + 5.1, 0], M.pedra, iCa, 8); }); }
  // ═════ INTERIOR: cedro com flores e palmas, ouro, piso de cipreste dourado ═════
  const gR = G('revestimento');
  { const iCed = I('Cedro, flores e palmas', 'Assim forrou as paredes da casa por dentro com tábuas de cedro… E o cedro da casa por dentro era lavrado de botões e flores abertas.', '1 Reis 6:15, 18');
    for (const s of [-1, 1]) caixa(gR, [40, ALT - 0.4, 0.25], [10, Y0 + ALT / 2, s * (L / 2 - 0.13)], M.painel, iCed, 11);
    caixa(gR, [40, 0.3, L], [10, Y0 + 0.15, 0], M.pisoOuro, I('Soalho de cipreste coberto de ouro', 'E cobriu o soalho da casa com tábuas de cipreste… Também cobriu de ouro o soalho da casa, por dentro e por fora.', '1 Reis 6:15, 30'), 8);
    for (let x = -9; x <= 29; x += 3.2) caixa(gR, [0.9, 1.2, L], [x, Y0 + ALT - 0.7, 0], M.cedro, I('Vigas de cedro do teto', 'E cobriu a casa com vigas e tábuas de cedro.', '1 Reis 6:9'), 6);
    const iOuro = I('Santo dos Santos coberto de ouro', 'E o oráculo no interior era de vinte côvados de comprimento, e de vinte côvados de largura, e de vinte côvados de altura; e o cobriu de ouro puro.', '1 Reis 6:20');
    for (const s of [-1, 1]) caixa(gR, [20, 20, 0.25], [-20, Y0 + 10, s * (L / 2 - 0.13)], M.painelOuro, iOuro, 10);
    caixa(gR, [0.25, 20, 20], [-30 + 0.13, Y0 + 10, 0], M.painelOuro, iOuro, 10); caixa(gR, [20, 0.3, 20], [-20, Y0 + 0.15, 0], M.pisoOuro, iOuro, 8);
    caixa(gR, [20, 0.6, 20], [-20, Y0 + 20.3, 0], M.ouroC, iOuro, 6);
    caixa(gR, [0.6, 10, 20], [-10, Y0 + 25, 0], M.pedra, I('Acima do Santo dos Santos', 'O oráculo tinha vinte côvados de altura (1 Rs 6:20) e a casa trinta (6:2). O espaço de cima é indeterminado: fica fechado.', '1 Reis 6:2, 20', 'Interpretação: não se inventa um pavimento.'));
    const iDiv = I('Portas de oliveira do oráculo', 'E à entrada do oráculo fez portas de madeira de oliveira… e as entalhou de querubins, de palmas e de flores abertas, e as cobriu de ouro.', '1 Reis 6:31–32');
    caixa(gR, [0.5, 20, 7], [-10, Y0 + 10, -6.5], M.painel, iDiv, 9); caixa(gR, [0.5, 20, 7], [-10, Y0 + 10, 6.5], M.painel, iDiv, 9);
    const veuG = new THREE.PlaneGeometry(6, 19, 30, 4); const vp = veuG.attributes.position; for (let i = 0; i < vp.count; i++) vp.setZ(i, Math.sin(vp.getX(i) * 3.4) * 0.18); veuG.computeVertexNormals();
    malha(gR, veuG, M.veu, [-9.6, Y0 + 9.6, 0], I('O véu', 'Fez também o véu de azul, e púrpura, e carmesim, e linho fino; e pôs sobre ele querubins.', '2 Crônicas 3:14', 'Sua relação exata com as portas é interpretação.'), [0, Math.PI / 2, 0]); }
  // ═════ SANTO LUGAR: 10 candelabros, 10 mesas, altar do incenso ═════
  const gS = G('santo');
  { const iCand = I('Candelabro de ouro (um dos dez)', 'E os castiçais de ouro finíssimo, cinco à direita e cinco à esquerda, diante do oráculo.', '1 Reis 7:49', 'A forma segue Êxodo 25:31–37 (interpretação).');
    function candelabro() { const c = new THREE.Group(); c.add(new THREE.Mesh(torno([[0, 0], [0.55, 0], [0.5, 0.18], [0.16, 0.35], [0.1, 2.2], [0.14, 2.3], [0, 2.32]], 20), M.ouro));
      const copo = () => new THREE.Mesh(torno([[0, 0], [0.11, 0.05], [0.13, 0.17], [0, 0.18]], 12), M.ouro);
      for (const r of [0.35, 0.7, 1.05]) { const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.055, 8, 24, Math.PI), M.ouro); arc.rotation.z = Math.PI; arc.position.y = 2.25; c.add(arc); for (const s of [-1, 1]) { const cp = copo(); cp.position.set(s * r, 2.25, 0); c.add(cp); const ch = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M.chama); ch.position.set(s * r, 2.5, 0); c.add(ch); } }
      const cp = copo(); cp.position.y = 2.32; c.add(cp); const ch = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M.chama); ch.position.y = 2.57; c.add(ch); return c; }
    const iMesa = I('Mesa (uma das dez)', 'Também fez dez mesas, e pô-las no templo, cinco à direita e cinco à esquerda.', '2 Crônicas 4:8', 'Formato segundo a mesa do tabernáculo (Êx 25:23); os pães da proposição: 1 Rs 7:48.');
    function mesa() { const m = new THREE.Group(); const top = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 1), M.ouro); top.position.y = 1.5; m.add(top);
      for (const [a, b] of [[-0.9, -0.42], [0.9, -0.42], [-0.9, 0.42], [0.9, 0.42]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 8), M.ouro); p.position.set(a, 0.75, b); m.add(p); }
      for (let k = 0; k < 12; k++) { const pao = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 6), M.pao); pao.scale.set(1, 0.45, 0.8); pao.position.set(-0.75 + (k % 6) * 0.3, 1.62 + Math.floor(k / 6) * 0.08, Math.floor(k / 6) ? 0.18 : -0.18); m.add(pao); } return m; }
    for (let k = 0; k < 5; k++) for (const s of [-1, 1]) { const x = -5 + k * 7.5; const c = candelabro(); c.position.set(x, Y0 + 0.3, s * 7.4); c.scale.setScalar(1.25); marcar(c, iCand); gS.add(c); const m = mesa(); m.position.set(x + 3.6, Y0 + 0.3, s * 7.6); marcar(m, iMesa); gS.add(m); }
    const al = new THREE.Group(); const corpoAl = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), M.ouro); corpoAl.position.y = 1; al.add(corpoAl);
    for (const [a, b] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 8), M.ouro); h.position.set(a, 2.15, b); al.add(h); }
    al.position.set(-7.5, Y0 + 0.3, 0); marcar(al, I('Altar do incenso', 'Também cobriu de ouro o altar que estava diante do oráculo.', '1 Reis 6:22; 7:48', 'Medidas segundo Êxodo 30:1–2 (interpretação).')); gS.add(al);
    const luzS = new THREE.PointLight(0xffc27a, 0, 60, 1.4); luzS.position.set(10, Y0 + 8, 0); gS.add(luzS); gS.userData.luz = luzS; }
  // ═════ SANTO DOS SANTOS: querubins e arca ═════
  const gQ = G('santissimo');
  { const iQ = I('Querubim de oliveira coberto de ouro', 'Fez no oráculo dois querubins de madeira de oliveira, cada um da altura de dez côvados… e estendiam os querubins as asas, de maneira que a asa de um tocava numa parede, e a asa do outro querubim tocava na outra parede; e as suas asas no meio da casa tocavam uma na outra.', '1 Reis 6:23, 27', 'A anatomia e a atitude dos querubins são hipotéticas; a figura segue a imagem de referência, sem impor um tipo como certeza.');
    const forma = new THREE.Shape(); forma.moveTo(0, -0.5); forma.bezierCurveTo(1.0, 0.8, 3.2, 1.7, 5, 1.4); for (let k = 0; k < 8; k++) { const x = 5 - k * 0.62; forma.quadraticCurveTo(x - 0.1, 0.2 - k * 0.12, x - 0.62, 0.7 - k * 0.12 - 0.9); } forma.lineTo(0, -0.5);
    const asaG = new THREE.ExtrudeGeometry(forma, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, steps: 1 });
    for (const zc of [-5, 5]) { const q = new THREE.Group(); q.position.set(-20, Y0 + 0.3, zc);
      q.add(new THREE.Mesh(torno([[0, 0], [1.4, 0], [1.4, 0.7], [1.05, 0.9], [1.15, 4.2], [1.0, 6.3], [0.75, 7.2], [0.5, 7.6], [0.0, 7.7]], 28), M.ouro));
      const cab = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 18), M.ouro); cab.position.y = 8.4; cab.scale.set(0.9, 1.05, 0.9); q.add(cab);
      for (const s of [-1, 1]) { const asa = new THREE.Mesh(asaG, M.ouro); asa.position.set(0, 7.9, 0); asa.rotation.set(0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0.08); q.add(asa); }   // cada asa 5 côvados: uma toca a parede, a outra a do outro querubim
      marcar(q, iQ); gQ.add(q); }
    const iArca = I('Arca da aliança', 'E trouxeram os sacerdotes a arca da aliança do Senhor ao seu lugar, ao oráculo da casa, ao lugar santíssimo, até debaixo das asas dos querubins.', '1 Reis 8:6', 'Medidas da arca: Êxodo 25:10 (2,5 × 1,5 × 1,5 côvados). Os pequenos querubins da tampa (Êx 25:18–20) são distintos dos grandes.');
    const arca = new THREE.Group(); const corpo = new THREE.Mesh(uvCaixa(new THREE.BoxGeometry(1.5, 1.5, 2.5), 1.5, 1.5, 2.5, 1.6), M.painelOuroF); corpo.position.y = 0.75; arca.add(corpo);
    const tampa = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.16, 2.62), M.ouro); tampa.position.y = 1.58; arca.add(tampa);
    for (const s of [-1, 1]) { const pq = new THREE.Group(); pq.add(new THREE.Mesh(torno([[0, 0], [0.18, 0], [0.16, 0.4], [0.1, 0.55], [0, 0.6]], 14), M.ouro)); const a1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.75), M.ouro); a1.position.set(0, 0.55, -s * 0.3); a1.rotation.x = s * 0.6; pq.add(a1); pq.position.set(0, 1.66, s * 0.95); arca.add(pq); }
    for (const s of [-1, 1]) { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.6, 10), M.ouro); v.position.set(s * 0.82, 0.55, 0); v.rotation.x = Math.PI / 2; arca.add(v); }
    arca.position.set(-20, Y0 + 0.3, 0); marcar(arca, iArca); gQ.add(arca);
    const luzQ = new THREE.PointLight(0xffb45a, 0, 34, 1.6); luzQ.position.set(-14, Y0 + 10, 0); gQ.add(luzQ); gQ.userData.luz = luzQ; }
  // ═════ COLUNAS JAQUIM (sul) e BOAZ (norte) — 1 Rs 7:15–22 ═════
  const gCo = G('colunas');
  { const r = 12 / (2 * Math.PI);
    for (const [nome, s] of [['Jaquim', 1], ['Boaz', -1]]) { const c = new THREE.Group(); c.position.set(44.6, Y0, s * 7.2);
      const ped = new THREE.Mesh(uvCaixa(new THREE.BoxGeometry(5.4, 2, 5.4), 5.4, 2, 5.4, 8), M.pedraF); ped.position.y = 1; c.add(ped);
      c.add(new THREE.Mesh(torno([[0, 2], [r * 1.25, 2], [r * 1.25, 2.6], [r * 1.05, 3.1], [r, 3.3], [r, 18.6], [r * 1.07, 19], [r * 1.07, 19.6], [0, 19.6]], 48), M.bronze));
      for (const y of [3.6, 18.2]) { const anel = new THREE.Mesh(new THREE.TorusGeometry(r * 1.03, 0.16, 8, 48), M.bronze); anel.rotation.x = Math.PI / 2; anel.position.y = y; c.add(anel); }
      c.add(new THREE.Mesh(torno([[0, 19.6], [r * 1.1, 19.6], [r * 1.45, 20.6], [r * 1.5, 21.6], [r * 1.35, 22.2], [r * 1.7, 23.4], [r * 1.95, 24.4], [r * 1.9, 24.6], [0, 24.6]], 48), M.bronze));
      for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; const pet = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.3, 0.7), M.bronze); pet.position.set(Math.cos(a) * r * 1.72, 23.5, Math.sin(a) * r * 1.72); pet.rotation.y = -a; pet.rotateOnWorldAxis(new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)), -0.32); c.add(pet); }
      const aba = new THREE.Mesh(new THREE.CylinderGeometry(r * 2.05, r * 2.0, 0.5, 48), M.bronze); aba.position.y = 24.85; c.add(aba);
      for (const [y, rr, off] of [[20.4, 1.47, 0], [21.5, 1.53, 0.5]]) for (let k = 0; k < 30; k++) { const a = (k + off) / 30 * Math.PI * 2, rom = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), M.bronze); rom.position.set(Math.cos(a) * r * rr, y, Math.sin(a) * r * rr); c.add(rom); }
      for (let k = 0; k < 7; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(r * (1.46 + k * 0.012), 0.05, 6, 48), M.bronze); t.rotation.x = Math.PI / 2; t.position.y = 20 + k * 0.28; c.add(t); }
      marcar(c, I('Coluna ' + nome, 'Formou duas colunas de bronze; a altura de cada coluna era de dezoito côvados, e um fio de doze côvados cercava cada uma das colunas… Depois levantou as colunas no pórtico do templo; e levantou a coluna direita, e chamou o seu nome Jaquim; e levantou a coluna esquerda, e chamou o seu nome Boaz.', '1 Reis 7:15, 21', 'Capitel de 5 côvados com redes, correntes, romãs e lírio (7:16–22); o desenho exato é interpretação. Jaquim ao sul, conforme o projeto.')); gCo.add(c); } }
  // ═════ PÁTIO: mar de fundição, dez pias, altar de bronze ═════
  const gM = G('mar'), gPi = G('pias'), gA = G('altar');
  { const iMar = I('Mar de fundição', 'Fez mais o mar de fundição, de dez côvados de uma borda até a outra borda, redondo ao redor, e de cinco côvados de alto; e um cordão de trinta côvados o cingia em redor… e a sua borda era como a borda de um copo, como flor de lírios.', '1 Reis 7:23, 26', 'Posição: "ao lado direito da casa, para o oriente, da banda do sul" (1 Rs 7:39).');
    const xm = 70, zm = 32; const mar = new THREE.Group(); mar.position.set(xm, 0, zm);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 9, 0.8, 48), M.pedraF); base.position.y = 0.4; mar.add(base);
    const bacia = new THREE.Mesh(torno([[0, 0.5], [3.2, 0.1], [4.4, 1.2], [4.9, 3.0], [5.0, 4.6], [5.35, 5.0], [5.2, 5.05], [4.75, 4.6], [4.6, 3.0], [4.1, 1.4], [0, 0.9]], 64), M.bronze); bacia.position.y = 3.3; bacia.material = M.bronze; mar.add(bacia);
    for (const [y, rr] of [[5.0, 4.62], [6.3, 4.9]]) for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2, b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), M.bronze); b.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); mar.add(b); }
    const agua = new THREE.Mesh(new THREE.CircleGeometry(4.65, 64), M.agua); agua.rotation.x = -Math.PI / 2; agua.position.y = 7.9; mar.add(agua);
    marcar(mar, iMar); gM.add(mar);
    const iBoi = I('Os doze bois', 'E firmava-se sobre doze bois, três que olhavam para o norte, e três que olhavam para o ocidente, e três que olhavam para o sul, e três que olhavam para o oriente; e o mar em cima deles, e todas as suas partes posteriores para o lado de dentro.', '1 Reis 7:25', 'O tamanho dos bois é hipótese.');
    function boi() { const b = new THREE.Group(); const corpo = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), M.bronze); corpo.scale.set(1.55, 0.95, 0.85); corpo.position.y = 2.1; b.add(corpo);
      const pesc = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.1, 12), M.bronze); pesc.position.set(1.5, 2.45, 0); pesc.rotation.z = -1.0; b.add(pesc);
      const cab = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), M.bronze); cab.scale.set(1.3, 0.85, 0.8); cab.position.set(2.15, 2.6, 0); b.add(cab);
      for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.7, 8), M.bronze); ch.position.set(2.0, 3.1, s * 0.4); ch.rotation.x = s * 0.9; b.add(ch); }
      for (const [a, c] of [[1, 0.45], [1, -0.45], [-1, 0.45], [-1, -0.45]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 1.6, 8), M.bronze); p.position.set(a * 0.95, 1.2, c); b.add(p); } return b; }
    for (let k = 0; k < 12; k++) { const lado = Math.floor(k / 3), a = lado * Math.PI / 2 + ((k % 3) - 1) * 0.42, bo = boi(); bo.position.set(xm + Math.cos(a) * 2.6, 0.8, zm + Math.sin(a) * 2.6); bo.rotation.y = -a; marcar(bo, iBoi); gM.add(bo); }
    const iPia = I('Pia sobre suporte (uma das dez)', 'Fez também dez suportes de bronze; o comprimento de cada suporte era de quatro côvados, e de quatro côvados a sua largura, e de três côvados a sua altura… E cada suporte tinha quatro rodas de bronze… Fez também dez pias de bronze; em cada pia cabiam quarenta batos.', '1 Reis 7:27, 30, 38', 'Cinco ao norte e cinco ao sul (7:39); o espaçamento é escolha do projeto.');
    function pia() { const p = new THREE.Group(); const cx = new THREE.Mesh(uvCaixa(new THREE.BoxGeometry(4, 2.2, 4), 4, 2.2, 4, 4), M.bronze); cx.position.y = 2.1; p.add(cx);
      for (const [a, c] of [[1.6, 2.05], [-1.6, 2.05], [1.6, -2.05], [-1.6, -2.05]]) { const rr = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.25, 20), M.bronze); rr.rotation.x = Math.PI / 2; rr.position.set(a, 0.75, c); p.add(rr); }
      for (const a of [-1, 1]) { const ei = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.3, 8), M.bronze); ei.rotation.x = Math.PI / 2; ei.position.set(a * 1.6, 0.75, 0); p.add(ei); }
      const bac = new THREE.Mesh(torno([[0, 0.4], [1.2, 0.1], [1.9, 0.7], [2.1, 1.5], [2.25, 1.65], [1.95, 1.55], [1.75, 0.8], [0, 0.6]], 40), M.bronze); bac.position.y = 3.2; p.add(bac);
      const ag = new THREE.Mesh(new THREE.CircleGeometry(1.85, 32), M.agua); ag.rotation.x = -Math.PI / 2; ag.position.y = 4.6; p.add(ag); return p; }
    for (let k = 0; k < 10; k++) { const s = k < 5 ? 1 : -1, x = -24 + (k % 5) * 12; const p = pia(); p.position.set(x, 0, s * 38); marcar(p, iPia); gPi.add(p); }
    const iAl = I('Altar de bronze', 'Também fez um altar de bronze de vinte côvados de comprimento, e de vinte côvados de largura, e de dez côvados de altura.', '2 Crônicas 4:1', 'Posição no eixo leste e a rampa (sem degraus, cf. Êx 20:26) são interpretação.');
    const alt = new THREE.Group(); alt.position.set(86, 0, 0);
    const pe = new THREE.Mesh(uvCaixa(new THREE.BoxGeometry(22, 1.2, 22), 22, 1.2, 22, 8), M.pedraF); pe.position.y = 0.6; alt.add(pe);
    const corpoA = new THREE.Mesh(uvCaixa(new THREE.BoxGeometry(20, 9, 20), 20, 9, 20, 5), M.bronze); corpoA.position.y = 5.7; alt.add(corpoA);
    const aba = new THREE.Mesh(new THREE.BoxGeometry(21, 0.6, 21), M.bronze); aba.position.y = 10.4; alt.add(aba);
    for (const [a, c] of [[9.6, 9.6], [-9.6, 9.6], [9.6, -9.6], [-9.6, -9.6]]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.8, 4), M.bronze); h.position.set(a, 11.5, c); h.rotation.y = Math.PI / 4; alt.add(h); }
    const brasa = new THREE.Mesh(new THREE.BoxGeometry(17, 0.5, 17), new THREE.MeshStandardMaterial({ color: 0x241812, emissive: 0x5a1e06, emissiveIntensity: 0.35, roughness: 1 })); brasa.scale.set(0.8, 1, 0.8); brasa.position.y = 10.75; alt.add(brasa);
    const rampa = new THREE.Mesh(uvCaixa(new THREE.BoxGeometry(8, 1, 27), 8, 1, 27, 8), M.pedraF); rampa.position.set(0, 5.3, 22.5); rampa.rotation.x = 0.39; alt.add(rampa);
    marcar(alt, iAl); gA.add(alt); }

  const luzesDentro = [gS.userData.luz, gQ.userData.luz];
  // ── painel de camadas ──
  const ROT = { terreno: 'Monte Moriá e colinas', patio: 'Pátio interior', casa: 'Paredes e pódio', janelas: 'Janelas de grades', telhado: 'Cobertura e cornija', portico: 'Pórtico', camaras: 'Câmaras laterais (3 andares)', revestimento: 'Cedro e ouro por dentro', santo: 'Santo Lugar', santissimo: 'Santo dos Santos', colunas: 'Colunas Jaquim e Boaz', mar: 'Mar de fundição', pias: 'Dez pias', altar: 'Altar de bronze' };
  raiz.querySelector('.tp-cam-l').innerHTML = Object.keys(ROT).map((id) => `<label><input type="checkbox" data-g="${id}" checked>${ROT[id]}</label>`).join('');
  raiz.querySelector('.tp-cam-l').addEventListener('change', (e) => { const g = grupos[e.target.dataset.g]; if (g) g.visible = e.target.checked; });

  // ── câmera de maquete: girar com inércia, aproximar, mover, duplo clique centraliza ──
  const alvo = new THREE.Vector3(30, 14, 0); let raio = 95, azim = 0.25, elev = 0.08; const vel = { az: 0, el: 0 };
  let voo = null, corteA = 1e4, tetoA = 1e4, corteV = 1e4, tetoV = 1e4, dentro = 0, zoomPend = 0;
  function posicionar() { elev = Math.max(-0.05, Math.min(1.52, elev)); camera.position.set(alvo.x + raio * Math.cos(elev) * Math.cos(azim), alvo.y + raio * Math.sin(elev), alvo.z + raio * Math.cos(elev) * Math.sin(azim)); camera.lookAt(alvo); }
  const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  function irPara(a, r, az, el, ms = 1600) { let daz = az - azim; while (daz > Math.PI) daz -= Math.PI * 2; while (daz < -Math.PI) daz += Math.PI * 2; voo = { de: { a: alvo.clone(), r: raio, az: azim, el: elev }, para: { a: a.clone(), r, az: azim + daz, el }, t0: performance.now(), ms }; }
  const VISTAS = {
    entrada: () => { corteA = 1e4; tetoA = 1e4; dentro = 0; irPara(new THREE.Vector3(28, 15, 0), 74, -0.46, 0.13); },
    fora: () => { corteA = 1e4; tetoA = 1e4; dentro = 0; irPara(new THREE.Vector3(18, 10, 0), 170, 0.9, 0.36); },
    corte: () => { corteA = 0; tetoA = 1e4; dentro = 1; irPara(new THREE.Vector3(8, 12, 0), 120, 1.5, 0.2); },
    santo: () => { corteA = 0; tetoA = Y0 + 29.5; dentro = 1; irPara(new THREE.Vector3(10, Y0 + 5, 0), 26, 1.32, 0.18); },
    santissimo: () => { corteA = 0; tetoA = Y0 + 20; dentro = 1; irPara(new THREE.Vector3(-20, Y0 + 6, 0), 21, 1.25, 0.2); },
    cima: () => { corteA = 1e4; tetoA = Y0 + 29.5; dentro = 1; irPara(new THREE.Vector3(20, 0, 0), 230, Math.PI / 2, 1.45); },
  };
  raiz.querySelector('.tp-barra').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; if (b.dataset.v === 'camadas') { const c = raiz.querySelector('.tp-cam'); c.hidden = !c.hidden; b.classList.toggle('ativo', !c.hidden); return; }
    raiz.querySelectorAll('.tp-barra [data-v]:not([data-v=camadas])').forEach((x) => x.classList.toggle('ativo', x === b)); VISTAS[b.dataset.v](); });
  let arr = null, moveu = false; const ptrs = new Map(); let pinca = null;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); arr = { x: e.clientX, y: e.clientY, b: e.button, t: performance.now() }; moveu = false; voo = null; if (chegada.t0) { chegada.t0 = 0; raiz.classList.add('pousou'); } try { canvas.setPointerCapture(e.pointerId); } catch (_) {} if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinca = Math.hypot(a.x - b.x, a.y - b.y); } });
  canvas.addEventListener('pointermove', (e) => { if (!arr) return; const p0 = ptrs.get(e.pointerId); if (p0) { p0.x = e.clientX; p0.y = e.clientY; }
    if (ptrs.size === 2 && pinca) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); raio = Math.max(3, Math.min(900, raio * pinca / d)); pinca = d; moveu = true; return; }
    const dx = e.clientX - arr.x, dy = e.clientY - arr.y; if (Math.abs(dx) + Math.abs(dy) > 3) moveu = true; arr.x = e.clientX; arr.y = e.clientY;
    if (arr.b === 2 || e.shiftKey) { const dir = new THREE.Vector3(); camera.getWorldDirection(dir); const lado = new THREE.Vector3().crossVectors(dir, camera.up).normalize(), frente = new THREE.Vector3(dir.x, 0, dir.z).normalize(); const k = raio * 0.0018; alvo.addScaledVector(lado, -dx * k).addScaledVector(frente, dy * k); }
    else { vel.az = dx * 0.0055; vel.el = dy * 0.0042; azim += vel.az; elev += vel.el; } });
  const solta = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinca = null; if (!ptrs.size) { if (arr && !moveu && performance.now() - arr.t < 400) clicar(e); arr = null; } };
  canvas.addEventListener('pointerup', solta); canvas.addEventListener('pointercancel', solta);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); voo = null; if (chegada.t0) { chegada.t0 = 0; raiz.classList.add('pousou'); } zoomPend += Math.max(-0.8, Math.min(0.8, e.deltaY * 0.0011)); }, { passive: false });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let ultimoClique = 0;
  function acertar(e) { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const vis = pecas.filter((m) => { let o = m; while (o) { if (!o.visible) return false; o = o.parent; } return true; });
    return ray.intersectObjects(vis, false).find((h) => { const m = h.object.material; return !m.clippingPlanes || m.clippingPlanes.every((pl) => pl.distanceToPoint(h.point) >= -0.01); }); }
  function clicar(e) { const h = acertar(e); const agora = performance.now();
    if (agora - ultimoClique < 320 && h) { irPara(h.point, Math.max(6, raio * 0.45), azim, elev, 900); ultimoClique = 0; return; } ultimoClique = agora;
    if (!h || !h.object.userData.info) return; const f = h.object.userData.info;
    ficha.innerHTML = `<button type="button" class="x" aria-label="Fechar">×</button><h4>${f.titulo}</h4><p>“${f.texto}”</p><cite>${f.ref} · Almeida</cite>${f.aviso ? `<div class="av">⚠ ${f.aviso}</div>` : ''}`; ficha.hidden = false; ficha.querySelector('.x').onclick = () => { ficha.hidden = true; }; }

  // ── CHEGADA DE CINEMA: vem do céu como um drone e para de frente para a entrada (leste) ──
  const chegada = { t0: performance.now() + 300, ms: 7800, de: { a: new THREE.Vector3(0, 0, 0), r: 1500, az: 2.6, el: 1.3 }, para: { a: new THREE.Vector3(28, 15, 0), r: 74, az: -0.46, el: 0.13 } };
  raio = chegada.de.r; azim = chegada.de.az; elev = chegada.de.el; alvo.copy(chegada.de.a); posicionar();
  requestAnimationFrame(() => raiz.classList.add('on'));
  let ativo = true, raf = 0, ultimo = performance.now();
  function ajustar() { const w = raiz.clientWidth || 1, h = raiz.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const obs = new ResizeObserver(ajustar); obs.observe(raiz); ajustar();
  function quadro(t) {
    if (!ativo) return; const dt = Math.min(50, t - ultimo); ultimo = t;
    if (chegada.t0) { const p = Math.max(0, Math.min(1, (t - chegada.t0) / chegada.ms)), e = 1 - Math.pow(1 - p, 3.2), eA = ease(p);   // desce rápido e freia suave, como drone
      const C = chegada.de, D = chegada.para; raio = Math.exp(Math.log(C.r) + (Math.log(D.r) - Math.log(C.r)) * e); azim = C.az + (D.az - C.az) * eA; elev = C.el + (D.el - C.el) * Math.pow(e, 1.25); alvo.lerpVectors(C.a, D.a, eA); alvo.y += Math.sin(p * Math.PI) * 5;
      if (p >= 1) { chegada.t0 = 0; raiz.classList.add('pousou'); } }
    else if (voo) { const p = Math.min(1, (t - voo.t0) / voo.ms), e = ease(p); alvo.lerpVectors(voo.de.a, voo.para.a, e); raio = Math.exp(Math.log(voo.de.r) + (Math.log(voo.para.r) - Math.log(voo.de.r)) * e); azim = voo.de.az + (voo.para.az - voo.de.az) * e; elev = voo.de.el + (voo.para.el - voo.de.el) * e; if (p >= 1) voo = null; }
    else if (!arr) { azim += vel.az; elev += vel.el; vel.az *= 0.9; vel.el *= 0.9; }
    if (Math.abs(zoomPend) > 0.001) { const pa = zoomPend * Math.min(1, dt / 90); raio = Math.max(3, Math.min(900, raio * Math.exp(pa))); zoomPend -= pa; }
    corteV += (corteA - corteV) * 0.07; tetoV += (tetoA - tetoV) * 0.07; corte.constant = corteV; teto.constant = tetoV;
    luzesDentro.forEach((l, k) => { l.intensity += ((dentro ? (k ? 420 : 900) : (k ? 0 : 380)) - l.intensity) * 0.08; });
    posicionar(); sol.target.position.set(20, 0, 0); renderer.render(cena, camera); raf = requestAnimationFrame(quadro);
  }
  raf = requestAnimationFrame(quadro);
  function fechar() { ativo = false; cancelAnimationFrame(raf); obs.disconnect(); window.removeEventListener('keydown', tecla); raiz.classList.remove('on'); setTimeout(() => { renderer.dispose(); pmrem.dispose(); raiz.remove(); }, 500); if (aoFechar) aoFechar(); }
  raiz.querySelector('.tp-sair').onclick = fechar;
  function tecla(e) { if (e.key === 'Escape') fechar(); }
  window.addEventListener('keydown', tecla);
  return { fechar, vista: (v) => { chegada.t0 = 0; raiz.classList.add('pousou'); if (VISTAS[v]) VISTAS[v](); }, pousou: () => raiz.classList.contains('pousou'), camadas: () => Object.keys(grupos).map((id) => ({ id, visivel: grupos[id].visible })), partes: () => pecas.length };
}
