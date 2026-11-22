// MUNDO PARA SOBREVOAR (como o Google Earth): a vista aérea do ChatGPT vira um terreno 3D.
// O relevo sai da própria imagem: água (azul) fica no fundo, campos no meio, rocha e neve no alto; tudo suavizado.
// Arrastar move, roda aproxima onde está o cursor, botão direito (ou dois dedos) inclina e gira, duplo clique voa até o ponto.
// Os pontos dourados descem para um 360° daquele lugar (panorama360.js).

export const MUNDOS = {
  eden: { titulo: 'O jardim do Éden', sub: 'GÊNESIS 2:8–14 · SOBREVOO', mapa: (window.NEXUS_MIDIA || '/nexus') + '/livros/eden-mapa.jpg', altura: 46, andar: true,
    credito: 'Reconstituição artística (imagens do ChatGPT a pedido do NEXUS; ilustrativas). O texto não descreve a aparência do jardim; os rios Tigre e Eufrates são conhecidos, Pisom e Giom são debatidos.',
    pontos: [
      { u: 0.47, v: 0.44, rot: 'A árvore da vida', panorama: 'eden', ref: 'Gênesis 2:9' },
      { u: 0.58, v: 0.49, rot: 'O rio que se divide em quatro', panorama: 'eden-rio', ref: 'Gênesis 2:10' },
      { u: 0.80, v: 0.18, rot: 'As montanhas', panorama: 'eden-montanhas', ref: 'Gênesis 2:10–14' },
      { u: 0.89, v: 0.42, rot: 'A entrada oriental', panorama: 'eden-oriente', ref: 'Gênesis 3:24' },
    ] },
};

export async function abrirMundo(THREE, id, host, { aoFechar } = {}) {
  const Mn = MUNDOS[id]; if (!Mn) return null;
  const raiz = document.createElement('div'); raiz.className = 'mt-raiz';
  raiz.innerHTML = `<style>
    .mt-raiz{position:absolute;inset:0;z-index:34;background:#9fb8cf;pointer-events:auto;opacity:0;transition:opacity 1.2s ease;font-family:Inter,system-ui,sans-serif;color:#fff}
    .mt-raiz.on{opacity:1}.mt-raiz canvas{position:absolute;inset:0;width:100%;height:100%;cursor:grab;touch-action:none}.mt-raiz canvas:active{cursor:grabbing}
    .mt-cab{position:absolute;left:24px;top:18px;pointer-events:none}.mt-cab h2{margin:0;font:600 38px/1 "Cormorant Garamond",Georgia,serif;text-shadow:0 2px 16px rgba(0,0,0,.7)}.mt-cab p{margin:6px 0 0;font-size:12.5px;letter-spacing:.2em;color:#FFF3D0;text-shadow:0 1px 6px #000}
    .mt-sair{position:absolute;right:20px;top:18px;border:1px solid rgba(255,255,255,.5);background:rgba(0,0,0,.4);backdrop-filter:blur(8px);color:#fff;border-radius:999px;padding:8px 15px;font:600 12.5px Inter,sans-serif;cursor:pointer}
    .mt-pt{position:absolute;transform:translate(-50%,-100%);pointer-events:auto;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px}
    .mt-pt span{background:rgba(10,18,36,.8);border:1px solid rgba(243,211,142,.6);padding:4px 10px;border-radius:999px;font:700 12px Inter,sans-serif;white-space:nowrap}
    .mt-pt b{width:16px;height:16px;border-radius:50%;background:#F3D38E;box-shadow:0 0 0 5px rgba(243,211,142,.3),0 0 18px rgba(243,211,142,.9);animation:mtp 2s infinite}
    @keyframes mtp{50%{box-shadow:0 0 0 11px rgba(243,211,142,0),0 0 18px rgba(243,211,142,.9)}}
    .mt-cred{position:absolute;left:24px;bottom:20px;right:330px;font-size:10.5px;color:rgba(255,255,255,.85);text-shadow:0 1px 4px #000}
    .mt-dica{position:absolute;right:20px;bottom:20px;font-size:12px;color:#fff;text-shadow:0 1px 4px #000}
  </style><canvas></canvas><div class="mt-pts"></div>
  <div class="mt-cab"><h2>${Mn.titulo}</h2><p>${Mn.sub}</p></div><button type="button" class="mt-sair">↩ Voltar</button>
  <div class="mt-cred">${Mn.credito}</div><div class="mt-dica">Arraste para mover · roda aproxima · botão direito inclina e gira · toque nos pontos dourados para descer</div>`;
  host.appendChild(raiz);
  const canvas = raiz.querySelector('canvas'), ptsEl = raiz.querySelector('.mt-pts');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const cena = new THREE.Scene(); cena.background = new THREE.Color(0xa9c3d8); cena.fog = new THREE.FogExp2(0xd6e2ea, 0.00016);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 40000);
  cena.add(new THREE.HemisphereLight(0xeaf2ff, 0x5a4a30, 1.1)); const sol = new THREE.DirectionalLight(0xfff0d6, 2.2); sol.position.set(-600, 900, 400); cena.add(sol);
  // carrega o mapa e calcula o relevo a partir das cores
  const img = await new Promise((ok, erro) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = erro; i.src = Mn.mapa; });
  const L = 6000, A = L * img.height / img.width, SX = 400, SY = Math.round(SX * img.height / img.width), ESC_H = 3 * 3;   // 3× maior que antes
  const cv = document.createElement('canvas'); cv.width = SX; cv.height = SY; const g = cv.getContext('2d'); g.drawImage(img, 0, 0, SX, SY); const px = g.getImageData(0, 0, SX, SY).data;
  const alt = new Float32Array(SX * SY);
  for (let i = 0; i < SX * SY; i++) { const r = px[i * 4] / 255, gg = px[i * 4 + 1] / 255, b = px[i * 4 + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), lum = 0.3 * r + 0.59 * gg + 0.11 * b, sat = mx ? (mx - mn) / mx : 0;
    let h = 0.35; if (b > r && b > gg * 0.95 && sat > 0.18) h = 0.0;   // água
    else if (sat < 0.22 && lum > 0.55) h = 0.75 + (lum - 0.55);        // rocha clara e neve
    else if (sat < 0.3) h = 0.55;                                       // rocha
    else h = 0.28 + (1 - lum) * 0.25;                                   // vegetação (copas um pouco acima)
    alt[i] = h; }
  const tmp = new Float32Array(SX * SY);   // suaviza (várias passadas de média) para virar relevo, não ruído
  for (let p = 0; p < 6; p++) { for (let y = 0; y < SY; y++) for (let x = 0; x < SX; x++) { let s = 0, n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < SX && yy < SY) { s += alt[yy * SX + xx]; n++; } } tmp[y * SX + x] = s / n; } alt.set(tmp); }
  const espelho = (i, n) => { const m = ((i % (2 * n)) + 2 * n) % (2 * n); return m < n ? m : 2 * n - 1 - m; };   // índice espelhado (a terra continua sem emenda)
  const altEsp = (x, y) => alt[espelho(y, SY) * SX + espelho(x, SX)] * Mn.altura * ESC_H;
  const NX = SX * 3 - 2, NY = SY * 3 - 2, geo = new THREE.PlaneGeometry(L * 3, A * 3, NX, NY); geo.rotateX(-Math.PI / 2); const pos = geo.attributes.position, uvs = geo.attributes.uv;
  for (let iy = 0; iy <= NY; iy++) for (let ix = 0; ix <= NX; ix++) { const i = iy * (NX + 1) + ix, gx = ix - SX, gy = iy - SY; pos.setY(i, altEsp(gx, gy)); uvs.setXY(i, (ix / NX) * 3 - 1, 1 - ((iy / NY) * 3 - 1)); }
  geo.computeVertexNormals();
  const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping; tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); tex.needsUpdate = true;
  cena.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })));
  const altura = (u, v) => altEsp(Math.round(u * (SX - 1)), Math.round(v * (SY - 1)));
  const mundo = (u, v) => new THREE.Vector3((u - 0.5) * L, altura(u, v), (v - 0.5) * A);
  // câmera tipo Google Earth
  const alvo = new THREE.Vector3(0, 0, 0); let dist = 2600, azim = Math.PI / 2, incl = 0.95, voo = null;
  function posicionar() { incl = Math.max(0.02, Math.min(1.5, incl)); dist = Math.max(8, Math.min(9000, dist)); camera.position.set(alvo.x + dist * Math.cos(incl) * Math.cos(azim), alvo.y + dist * Math.sin(incl), alvo.z + dist * Math.cos(incl) * Math.sin(azim)); camera.lookAt(alvo); }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), chao = new THREE.Plane(new THREE.Vector3(0, 1, 0), -Mn.altura * 3);
  const noChao = (cx, cy) => { const r = canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const p = new THREE.Vector3(); return ray.ray.intersectPlane(chao, p) ? p : null; };
  let arr = null; const ptrs = new Map(); let pinca = null, ultimo = 0;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => { voo = null; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); arr = { x: e.clientX, y: e.clientY, b: e.button, p: noChao(e.clientX, e.clientY) }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinca = { d: Math.hypot(a.x - b.x, a.y - b.y), y: (a.y + b.y) / 2, ang: Math.atan2(b.y - a.y, b.x - a.x) }; }
    const ag = performance.now(); if (ag - ultimo < 320) { const p = noChao(e.clientX, e.clientY); if (p) voar(p, dist * 0.4); } ultimo = ag; });
  canvas.addEventListener('pointermove', (e) => { if (!arr) return; const p0 = ptrs.get(e.pointerId); if (p0) { p0.x = e.clientX; p0.y = e.clientY; }
    if (ptrs.size === 2 && pinca) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), y = (a.y + b.y) / 2, ang = Math.atan2(b.y - a.y, b.x - a.x); dist *= pinca.d / d; incl += (pinca.y - y) * 0.004; azim += ang - pinca.ang; pinca = { d, y, ang }; return; }
    const dx = e.clientX - arr.x, dy = e.clientY - arr.y; arr.x = e.clientX; arr.y = e.clientY;
    if (arr.b === 2 || e.ctrlKey) { azim += dx * 0.006; incl += dy * 0.004; return; }
    const p = noChao(e.clientX, e.clientY); if (arr.p && p) { alvo.x += arr.p.x - p.x; alvo.z += arr.p.z - p.z; alvo.x = Math.max(-L * 1.4, Math.min(L * 1.4, alvo.x)); alvo.z = Math.max(-A * 1.4, Math.min(A * 1.4, alvo.z)); } });
  const solta = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinca = null; if (!ptrs.size) arr = null; };
  canvas.addEventListener('pointerup', solta); canvas.addEventListener('pointercancel', solta);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); voo = null; const p = noChao(e.clientX, e.clientY), f = Math.exp(e.deltaY * 0.0012); if (p && f < 1) { alvo.lerp(new THREE.Vector3(p.x, alvo.y, p.z), 1 - f); } dist *= f; }, { passive: false });
  function voar(p, d) { voo = { de: { a: alvo.clone(), d: dist }, para: { a: new THREE.Vector3(p.x, alvo.y, p.z), d }, t0: performance.now() }; }
  // pontos para descer em 360°
  let p360 = null;
  const pts = Mn.pontos.map((p) => { const d = document.createElement('div'); d.className = 'mt-pt'; d.innerHTML = `<span>${p.rot}</span><b></b>`; d.onclick = async () => { const w = mundo(p.u, p.v); voar(w, 120); setTimeout(async () => { const m = await import('/nexus/panorama360.js?v=6'); if (m.PANORAMAS[p.panorama]) p360 = await m.abrirPanorama(THREE, p.panorama, raiz, { aoFechar: () => { p360 = null; } }); }, 1300); }; ptsEl.appendChild(d); return { p, d, w: mundo(p.u, p.v) }; });
  function ajustar() { const w = raiz.clientWidth, h = raiz.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const obs = new ResizeObserver(ajustar); obs.observe(raiz); ajustar();
  // chegada: de muito alto, descendo e girando até ver o jardim inclinado
  const t0 = performance.now(); let ativo = true; const arv = mundo(Mn.pontos[0].u, Mn.pontos[0].v); dist = 9000; incl = 1.45; alvo.set(arv.x, arv.y, arv.z);
  const DUR = 9000; let pousou = false;
  async function pousar() { if (Mn.andar && !p360) { try { const j = await import('/nexus/eden-caminhar.js?v=7'); p360 = await j.abrirJardim(THREE, raiz, { aoFechar: () => { p360 = null; } }); return; } catch (e) { console.warn('jardim', e); } } const p0 = Mn.pontos[0]; if (!p0 || !p0.panorama) return; const m = await import('/nexus/panorama360.js?v=6'); if (m.PANORAMAS[p0.panorama] && !p360) p360 = await m.abrirPanorama(THREE, p0.panorama, raiz, { aoFechar: () => { p360 = null; } }); }
  function quadro(t) { if (!ativo) return;
    const q = Math.min(1, (t - t0) / DUR); if (q < 1) { const e = 1 - Math.pow(1 - q, 2.6), e2 = q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
      dist = Math.exp(Math.log(9000) + (Math.log(520) - Math.log(9000)) * e); incl = 1.45 + (0.32 - 1.45) * Math.pow(e2, 0.8); azim = Math.PI / 2 + 1.1 * e2;
      alvo.set(arv.x, arv.y + 14 * e2, arv.z); }
    else if (!pousou) { pousou = true; pousar(); }
    else if (voo) { const p = Math.min(1, (t - voo.t0) / 1200), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; alvo.lerpVectors(voo.de.a, voo.para.a, e); dist = Math.exp(Math.log(voo.de.d) + (Math.log(voo.para.d) - Math.log(voo.de.d)) * e); if (p >= 1) voo = null; }
    posicionar(); renderer.render(cena, camera);
    for (const { d, w } of pts) { const v = w.clone().add(new THREE.Vector3(0, 6, 0)).project(camera); const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && !p360; d.style.display = vis ? 'flex' : 'none'; if (vis) { d.style.left = (v.x + 1) / 2 * raiz.clientWidth + 'px'; d.style.top = (1 - v.y) / 2 * raiz.clientHeight + 'px'; } }
    requestAnimationFrame(quadro); }
  requestAnimationFrame((t) => { raiz.classList.add('on'); quadro(t); });
  function fechar() { ativo = false; obs.disconnect(); raiz.classList.remove('on'); setTimeout(() => { renderer.dispose(); tex.dispose(); raiz.remove(); }, 1200); if (aoFechar) aoFechar(); }
  raiz.querySelector('.mt-sair').onclick = fechar;
  return { fechar };
}
