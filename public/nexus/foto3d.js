// FOTO → CENA 3D: a foto que o pastor manda no chat vira um lugar em 3D para olhar em volta.
// A profundidade de cada ponto da foto é calculada no próprio aparelho (Depth Anything V2, modelo aberto, via transformers.js),
// sem enviar a foto para fora. Com a profundidade, cada pixel volta para o seu lugar no espaço (como uma câmera de verdade),
// e a câmera passeia devagar, como um drone, revelando a profundidade. Arrastar olha em volta; roda/pinça aproxima.
import * as THREE from 'three';

let estimador = null;
async function profundidade(img) {
  try {
    if (!estimador) {
      const T = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2');
      T.env.allowLocalModels = false;
      estimador = await T.pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', { device: navigator.gpu ? 'webgpu' : 'wasm', dtype: 'fp32' }).catch(() => T.pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small'));
    }
    const out = await estimador(img.src);
    const d = out.depth; // RawImage: width, height, data (0..255, claro = perto)
    return { w: d.width, h: d.height, dados: d.data, canais: d.channels || 1, real: true };
  } catch (e) {
    console.warn('profundidade: usando estimativa simples', e);
    // reserva: céu longe em cima, chão perto embaixo, com o brilho ajudando
    const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * img.height / img.width); const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
    const px = g.getImageData(0, 0, c.width, c.height).data, dados = new Uint8Array(c.width * c.height);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const i = y * c.width + x, l = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 765; dados[i] = Math.max(0, Math.min(255, (Math.pow(y / c.height, 1.4) * 0.85 + (1 - l) * 0.15) * 255)); }
    return { w: c.width, h: c.height, dados, canais: 1, real: false };
  }
}

export async function abrirFoto3D(url, legenda) {
  document.querySelectorAll('.f3-raiz').forEach((e) => e.remove());
  const host = document.querySelector('.cu-ui') || document.body;
  const raiz = document.createElement('div'); raiz.className = 'f3-raiz';
  raiz.innerHTML = `<style>
    .f3-raiz{position:${host === document.body ? 'fixed' : 'absolute'};inset:0;z-index:38;background:#0b1020;opacity:0;transition:opacity 1s ease;font-family:Inter,system-ui,sans-serif;color:#fff}
    .f3-raiz.on{opacity:1}.f3-raiz canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}
    .f3-cab{position:absolute;left:24px;top:18px;pointer-events:none;max-width:60%}.f3-cab h2{margin:0;font:600 34px/1.05 "Cormorant Garamond",Georgia,serif;text-shadow:0 2px 16px rgba(0,0,0,.7)}.f3-cab p{margin:6px 0 0;font-size:12.5px;letter-spacing:.16em;color:#FFF3D0;text-shadow:0 1px 6px #000}
    .f3-sair{position:absolute;right:20px;top:18px;border:1px solid rgba(255,255,255,.5);background:rgba(0,0,0,.4);backdrop-filter:blur(8px);color:#fff;border-radius:999px;padding:8px 15px;font:600 12.5px Inter,sans-serif;cursor:pointer}
    .f3-st{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(10,18,40,.7);border:1px solid rgba(243,211,142,.4);backdrop-filter:blur(10px);padding:12px 18px;border-radius:12px;font-size:14px}
    .f3-st[hidden]{display:none}.f3-dica{position:absolute;right:20px;bottom:18px;font-size:12px;text-shadow:0 1px 4px #000}.f3-cred{position:absolute;left:24px;bottom:18px;font-size:10.5px;color:rgba(255,255,255,.75);text-shadow:0 1px 4px #000;max-width:55%}
  </style><canvas></canvas><div class="f3-cab"><h2>${String(legenda || 'Seu lugar em 3D').replace(/[<>&]/g, '').slice(0, 70) || 'Seu lugar em 3D'}</h2><p>FOTO ENVIADA NO CHAT · 3D</p></div>
  <button type="button" class="f3-sair">↩ Voltar</button><div class="f3-st">Calculando a profundidade da foto…</div>
  <div class="f3-cred">A profundidade é estimada por IA no seu aparelho (Depth Anything V2): é uma reconstrução, não uma medição.</div><div class="f3-dica">Arraste para olhar · roda ou pinça aproxima</div>`;
  host.appendChild(raiz); requestAnimationFrame(() => raiz.classList.add('on'));
  const st = raiz.querySelector('.f3-st'); let ativo = true;
  const fechar = () => { ativo = false; raiz.classList.remove('on'); setTimeout(() => { try { renderer.dispose(); } catch (_) {} raiz.remove(); }, 900); };
  raiz.querySelector('.f3-sair').onclick = fechar;
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
  const D = await profundidade(img); if (!ativo) return;
  st.textContent = D.real ? 'Montando o lugar em 3D…' : 'Montando em 3D (estimativa simples)…';
  const canvas = raiz.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cena = new THREE.Scene(); const asp = img.width / img.height, FOV = 55;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 500);
  // reconstrução: cada ponto da foto volta para a sua distância, como visto pela câmera que tirou a foto
  const NX = 320, NY = Math.round(NX / asp), geo = new THREE.BufferGeometry(), P = new Float32Array((NX + 1) * (NY + 1) * 3), U = new Float32Array((NX + 1) * (NY + 1) * 2), Z = new Float32Array((NX + 1) * (NY + 1));
  let mn = 255, mx = 0; for (let i = 0; i < D.w * D.h; i++) { const v = D.dados[i * D.canais]; if (v < mn) mn = v; if (v > mx) mx = v; }
  const tanY = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  for (let y = 0; y <= NY; y++) for (let x = 0; x <= NX; x++) { const u = x / NX, v = y / NY, i = y * (NX + 1) + x;
    const sx = Math.min(D.w - 1, Math.round(u * (D.w - 1))), sy = Math.min(D.h - 1, Math.round(v * (D.h - 1))); const dn = (D.dados[(sy * D.w + sx) * D.canais] - mn) / Math.max(1, mx - mn);
    const z = 4 / (0.12 + 0.88 * dn); Z[i] = z;   // perto ≈ 4 m, longe ≈ 33 m
    P[i * 3] = (u - 0.5) * 2 * tanY * asp * z; P[i * 3 + 1] = (0.5 - v) * 2 * tanY * z; P[i * 3 + 2] = -z; U[i * 2] = u; U[i * 2 + 1] = 1 - v; }
  const I = [], Itodos = []; for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) { const a = y * (NX + 1) + x, b = a + 1, c = a + NX + 1, d = c + 1;
    const corta = (p, q, r) => { const zs = [Z[p], Z[q], Z[r]]; return Math.max(...zs) / Math.min(...zs) > 1.35; };   // não estica nas bordas entre perto e longe
    Itodos.push(a, c, b, b, c, d); if (!corta(a, c, b)) I.push(a, c, b); if (!corta(b, c, d)) I.push(b, c, d); }
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(U, 2)); geo.setIndex(I);
  const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.needsUpdate = true;
  cena.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex })));
  // atrás das bordas cortadas, a mesma superfície inteira (um pouco mais funda) preenche os vãos com as cores vizinhas
  const geoF = new THREE.BufferGeometry(); const P2 = P.slice(); for (let i = 0; i < P2.length; i += 3) { P2[i] *= 1.03; P2[i + 1] *= 1.03; P2[i + 2] *= 1.03; } geoF.setAttribute('position', new THREE.BufferAttribute(P2, 3)); geoF.setAttribute('uv', new THREE.BufferAttribute(U, 2)); geoF.setIndex(Itodos);
  cena.add(new THREE.Mesh(geoF, new THREE.MeshBasicMaterial({ map: tex, color: 0xd8d8d8 })));
  // fundo: a própria foto, desfocada e escura, lá atrás (cobre os buracos)
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(2 * tanY * asp * 60, 2 * tanY * 60), new THREE.MeshBasicMaterial({ map: tex, color: 0x556070 })); fundo.position.z = -60; cena.add(fundo);
  cena.background = new THREE.Color(0x0b1020);
  // câmera: começa onde a foto foi tirada e passeia devagar (drone); o usuário assume quando toca
  let yaw = 0, pitch = 0, dolly = 0, auto = true, arr = null; const t0 = performance.now();
  canvas.addEventListener('pointerdown', (e) => { auto = false; arr = { x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
  canvas.addEventListener('pointermove', (e) => { if (!arr) return; yaw = Math.max(-0.5, Math.min(0.5, yaw - (e.clientX - arr.x) * 0.003)); pitch = Math.max(-0.3, Math.min(0.3, pitch - (e.clientY - arr.y) * 0.003)); arr = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', () => { arr = null; }); canvas.addEventListener('wheel', (e) => { e.preventDefault(); auto = false; dolly = Math.max(-1, Math.min(3, dolly - e.deltaY * 0.004)); }, { passive: false });
  function ajustar() { const w = raiz.clientWidth, h = raiz.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < asp ? FOV : FOV * (asp / (w / h)) * 0.98; camera.updateProjectionMatrix(); }
  const obs = new ResizeObserver(ajustar); obs.observe(raiz); ajustar(); st.hidden = true;
  (function quadro(agora) { if (!ativo) { obs.disconnect(); return; }
    const t = (agora - t0) / 1000; if (auto) { yaw = Math.sin(t * 0.18) * 0.16; pitch = Math.sin(t * 0.13) * 0.05; dolly = 0.6 + Math.sin(t * 0.1) * 0.6; }
    const ox = Math.sin(yaw) * 1.6, oy = Math.sin(pitch) * 0.8 + 0.15; camera.position.set(ox, oy, -dolly); camera.lookAt(ox * 0.25, oy * 0.3, -12);
    renderer.render(cena, camera); requestAnimationFrame(quadro); })(performance.now());
  return { fechar };
}
window.NEXUS_FOTO3D = (url, legenda) => abrirFoto3D(url, legenda);
