// PANORAMA 360°: a cena (imagem equirretangular do ChatGPT) vira uma esfera em volta do usuário.
// Arrastar olha para todos os lados; roda/pinça aproxima; a câmera gira devagar sozinha até o primeiro toque.
// Pontos de interesse (hotspots) podem ser adicionados depois, em graus (yaw, pitch).

export const PANORAMAS = {
  eden: { titulo: 'O jardim do Éden', sub: 'GÊNESIS 2:8–14', img: (window.NEXUS_MIDIA || '/nexus') + '/livros/eden-360.jpg', credito: 'Reconstituição artística em 360° (imagem gerada pelo ChatGPT a pedido do NEXUS; ilustrativa — o texto bíblico não descreve a aparência do jardim)',
    refs: [['Gênesis 2:8', 'E plantou o Senhor Deus um jardim no Éden, da banda do oriente; e pôs ali o homem que tinha formado.'], ['Gênesis 2:9', 'E o Senhor Deus fez brotar da terra toda a árvore agradável à vista, e boa para comida; e a árvore da vida no meio do jardim, e a árvore da ciência do bem e do mal.'], ['Gênesis 2:10', 'E saía um rio do Éden para regar o jardim; e dali se dividia e se tornava em quatro braços.']],
    pontos: [{ yaw: 0, pitch: -8, rot: 'O rio que se divide em quatro', ref: 'Gênesis 2:10–14', txt: 'Pisom, Giom, Hidequel (Tigre) e Eufrates. Os dois últimos são conhecidos; a identificação dos dois primeiros é debatida.' }, { yaw: -70, pitch: 6, rot: 'A árvore da vida', ref: 'Gênesis 2:9; Apocalipse 22:2', txt: 'No meio do jardim. A figura aqui é ilustrativa: o texto não descreve a árvore.' }] },
  'eden-rio': { titulo: 'Onde o rio se divide', sub: 'GÊNESIS 2:10–14', img: (window.NEXUS_MIDIA || '/nexus') + '/livros/eden-360-rio.jpg', credito: 'Reconstituição artística em 360° (ChatGPT; ilustrativa).', refs: [['Gênesis 2:10', 'E saía um rio do Éden para regar o jardim; e dali se dividia e se tornava em quatro braços.'], ['Gênesis 2:14', 'E o nome do terceiro rio é Hidequel; este é o que vai para o lado oriental da Assíria; e o quarto rio é o Eufrates.']], pontos: [] },
  'eden-montanhas': { titulo: 'Das montanhas, o jardim inteiro', sub: 'GÊNESIS 2:8–14', img: (window.NEXUS_MIDIA || '/nexus') + '/livros/eden-360-montanhas.jpg', credito: 'Reconstituição artística em 360° (ChatGPT; ilustrativa).', refs: [['Gênesis 2:8', 'E plantou o Senhor Deus um jardim no Éden, da banda do oriente; e pôs ali o homem que tinha formado.']], pontos: [] },
  'eden-oriente': { titulo: 'A entrada oriental', sub: 'GÊNESIS 3:24', img: (window.NEXUS_MIDIA || '/nexus') + '/livros/eden-360-oriente.jpg', credito: 'Reconstituição artística em 360° (ChatGPT; ilustrativa); os querubins não são mostrados.', refs: [['Gênesis 3:24', 'E havendo lançado fora o homem, pôs querubins ao oriente do jardim do Éden, e uma espada inflamada que andava ao redor, para guardar o caminho da árvore da vida.']], pontos: [] },
};

export async function abrirPanorama(THREE, id, host, { aoFechar } = {}) {
  const P = PANORAMAS[id]; if (!P) return null;
  const raiz = document.createElement('div'); raiz.className = 'p3-raiz';
  raiz.innerHTML = `<style>
    .p3-raiz{position:absolute;inset:0;z-index:35;background:#000;pointer-events:auto;opacity:0;transition:opacity 1.2s ease;font-family:Inter,system-ui,sans-serif;color:#fff}
    .p3-raiz.on{opacity:1}.p3-raiz canvas{position:absolute;inset:0;width:100%;height:100%;cursor:grab;touch-action:none}.p3-raiz canvas:active{cursor:grabbing}
    .p3-cab{position:absolute;left:24px;top:18px;pointer-events:none}.p3-cab h2{margin:0;font:600 38px/1 "Cormorant Garamond",Georgia,serif;text-shadow:0 2px 16px rgba(0,0,0,.8)}.p3-cab p{margin:6px 0 0;font-size:12.5px;letter-spacing:.2em;color:#F3E2B3}
    .p3-sair{position:absolute;right:20px;top:18px;border:1px solid rgba(255,255,255,.5);background:rgba(0,0,0,.4);backdrop-filter:blur(8px);color:#fff;border-radius:999px;padding:8px 15px;font:600 12.5px Inter,sans-serif;cursor:pointer}
    .p3-pt{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;cursor:pointer;display:flex;align-items:center;gap:8px}
    .p3-pt b{width:18px;height:18px;border-radius:50%;background:rgba(243,211,142,.95);box-shadow:0 0 0 6px rgba(243,211,142,.25),0 0 20px rgba(243,211,142,.8);animation:p3p 2s infinite}
    .p3-pt span{background:rgba(0,0,0,.55);padding:4px 10px;border-radius:999px;font:600 12px Inter,sans-serif;white-space:nowrap}
    @keyframes p3p{50%{box-shadow:0 0 0 12px rgba(243,211,142,0),0 0 20px rgba(243,211,142,.8)}}
    .p3-card{position:absolute;left:24px;bottom:70px;width:min(420px,calc(100% - 48px));background:rgba(252,248,238,.96);color:#1E2A44;border-radius:14px;padding:14px 16px;box-shadow:0 18px 40px rgba(0,0,0,.45)}
    .p3-card[hidden]{display:none}.p3-card h4{margin:0 22px 6px 0;font:700 19px "Cormorant Garamond",Georgia,serif}.p3-card p{margin:0 0 6px;font:15.5px/1.5 "Cormorant Garamond",Georgia,serif}.p3-card cite{font:700 11px Inter,sans-serif;color:#8A6420;letter-spacing:.06em;text-transform:uppercase}.p3-card .x{position:absolute;right:10px;top:8px;border:0;background:none;font-size:18px;cursor:pointer;color:#6B5A3A}
    .p3-cred{position:absolute;left:24px;bottom:22px;right:300px;font-size:10.5px;color:rgba(255,255,255,.7);text-shadow:0 1px 4px #000}
    .p3-dica{position:absolute;right:20px;bottom:22px;font-size:12px;color:rgba(255,255,255,.75);text-shadow:0 1px 4px #000}
  </style><canvas></canvas><div class="p3-pts"></div>
  <div class="p3-cab"><h2>${P.titulo}</h2><p>${P.sub} · 360°</p></div><button type="button" class="p3-sair">↩ Voltar</button>
  <div class="p3-card" hidden></div><div class="p3-cred">${P.credito}</div><div class="p3-dica">Arraste para olhar em volta · roda aproxima · toque nos pontos dourados</div>`;
  host.appendChild(raiz);
  const canvas = raiz.querySelector('canvas'), card = raiz.querySelector('.p3-card'), ptsEl = raiz.querySelector('.p3-pts');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cena = new THREE.Scene(), camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1100);
  const geo = new THREE.SphereGeometry(500, 96, 64); geo.scale(-1, 1, 1);
  const tex = await new THREE.TextureLoader().loadAsync(P.img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const viva = new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, t: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D map; uniform float t; varying vec2 vUv;
      vec3 rgb2hsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x); }
      void main(){ vec2 uv = vUv; vec3 c0 = texture2D(map, uv).rgb; vec3 h = rgb2hsv(c0);
        float baixo = smoothstep(0.62, 0.40, uv.y), alto = smoothstep(0.52, 0.70, uv.y);
        float agua = baixo * smoothstep(0.45, 0.58, h.x) * smoothstep(0.62, 0.50, h.x) * smoothstep(0.12, 0.3, h.y);   // azul-ciano nas partes baixas
        float folha = smoothstep(0.17, 0.25, h.x) * smoothstep(0.45, 0.33, h.x) * smoothstep(0.2, 0.35, h.y);   // verdes
        float ceu = alto * (1. - folha) * smoothstep(0.35, 0.6, h.z);
        vec2 d = vec2(0.);
        d += agua * vec2(sin(uv.y*900. + t*3.2)*0.00045, sin(uv.x*700. - t*4.0)*0.0006);
        d += folha * vec2(sin(t*1.3 + uv.x*25.)*0.00028, cos(t*1.1 + uv.x*30.)*0.0002);
        d += ceu * vec2(sin(t*0.12)*0.0012, 0.);   // o céu oscila devagar (sem acumular deslocamento)
        vec3 c = texture2D(map, uv + d).rgb;
        c += agua * 0.10 * pow(max(0., sin(uv.x*1600. + uv.y*400. - t*5.)), 24.);   // brilho correndo na água
        gl_FragColor = vec4(c, 1.);
#include <colorspace_fragment>
      }` });
  cena.add(new THREE.Mesh(geo, viva));
  let yaw = 0, pitch = 0, fov = 75, auto = true, arr = null, vy = 0;
  const pts = P.pontos.map((p) => { const d = document.createElement('div'); d.className = 'p3-pt'; d.innerHTML = `<b></b><span>${p.rot}</span>`; d.onclick = (e) => { e.stopPropagation(); card.innerHTML = `<button class="x" aria-label="Fechar">×</button><h4>${p.rot}</h4><p>${p.txt}</p><cite>${p.ref}</cite>`; card.hidden = false; card.querySelector('.x').onclick = () => { card.hidden = true; }; }; ptsEl.appendChild(d); return { p, d }; });
  const intro = P.refs[0]; card.innerHTML = `<button class="x" aria-label="Fechar">×</button><h4>${P.titulo}</h4>${P.refs.map(([r, t]) => `<p>“${t}”<br><cite>${r} · Almeida</cite></p>`).join('')}`; card.hidden = false; card.querySelector('.x').onclick = () => { card.hidden = true; };
  canvas.addEventListener('pointerdown', (e) => { auto = false; arr = { x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
  canvas.addEventListener('pointermove', (e) => { if (!arr) return; const k = fov / 75 * 0.12; vy = -(e.clientX - arr.x) * k; yaw += vy; pitch = Math.max(-85, Math.min(85, pitch + (e.clientY - arr.y) * k)); arr = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', () => { arr = null; }); canvas.addEventListener('pointercancel', () => { arr = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); fov = Math.max(30, Math.min(95, fov + e.deltaY * 0.04)); }, { passive: false });
  const v = new THREE.Vector3();
  function ajustar() { const w = raiz.clientWidth, h = raiz.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const obs = new ResizeObserver(ajustar); obs.observe(raiz); ajustar();
  let ativo = true;
  function quadro() { if (!ativo) return;
    if (auto) yaw += 0.03; else if (!arr) { yaw += vy; vy *= 0.92; }
    camera.fov += (fov - camera.fov) * 0.15; camera.updateProjectionMatrix();
    const ph = THREE.MathUtils.degToRad(90 - pitch), th = THREE.MathUtils.degToRad(yaw); camera.lookAt(v.setFromSphericalCoords(1, ph, th));
    viva.uniforms.t.value = performance.now() / 1000; renderer.render(cena, camera);
    for (const { p, d } of pts) { const q = new THREE.Vector3().setFromSphericalCoords(400, THREE.MathUtils.degToRad(90 - p.pitch), THREE.MathUtils.degToRad(p.yaw)); q.project(camera); const vis = q.z < 1 && Math.abs(q.x) < 1.1 && Math.abs(q.y) < 1.1; d.style.display = vis ? 'flex' : 'none'; if (vis) { d.style.left = (q.x + 1) / 2 * raiz.clientWidth + 'px'; d.style.top = (1 - q.y) / 2 * raiz.clientHeight + 'px'; } }
    requestAnimationFrame(quadro); }
  requestAnimationFrame(() => raiz.classList.add('on')); quadro();
  function fechar() { ativo = false; obs.disconnect(); raiz.classList.remove('on'); setTimeout(() => { renderer.dispose(); tex.dispose(); raiz.remove(); }, 1200); if (aoFechar) aoFechar(); }
  raiz.querySelector('.p3-sair').onclick = fechar; const tecla = (e) => { if (e.key === 'Escape') { window.removeEventListener('keydown', tecla); fechar(); } }; window.addEventListener('keydown', tecla);
  return { fechar, estado: () => ({ yaw, pitch, fov }) };
}
