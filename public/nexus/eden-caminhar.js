// O JARDIM DO ÉDEN PARA ANDAR DENTRO: o drone desce do alto e pousa no jardim; depois o usuário anda em primeira pessoa.
// Peças visuais (árvores, animais, aves, borboletas, chão): recortes do ChatGPT a pedido do NEXUS (ilustrativos), em /nexus/eden/.
// O mundo é montado aqui: relevo, rio que sai do Éden e se divide em quatro braços (Gn 2:10), grama que balança ao vento,
// árvores com vento, animais que andam, aves que voam, borboletas, e a presença do Senhor como luz e vento, sem figura (Gn 3:8).
// Controles: PC = WASD/setas para andar (Shift corre), arrastar para olhar; tablet = joystick à esquerda, arrastar para olhar,
// toque duplo no chão para ir até lá.

const VERSOS = {
  chegada: ['Gênesis 2:8', 'Então plantou o Senhor Deus um jardim, da banda do oriente, no Éden; e pôs ali o homem que tinha formado.'],
  arvore: ['Gênesis 2:9', 'E o Senhor Deus fez brotar da terra toda qualidade de árvores agradáveis à vista e boas para comida, bem como a árvore da vida no meio do jardim, e a árvore do conhecimento do bem e do mal.'],
  rio: ['Gênesis 2:10', 'E saía um rio do Éden para regar o jardim; e dali se dividia e se tornava em quatro braços.'],
  animais: ['Gênesis 2:19', 'Da terra formou, pois, o Senhor Deus todos os animais o campo e todas as aves do céu, e os trouxe ao homem, para ver como lhes chamaria; e tudo o que o homem chamou a todo ser vivente, isso foi o seu nome.'],
  presenca: ['Gênesis 3:8', 'E, ouvindo a voz do Senhor Deus, que passeava no jardim à tardinha, esconderam-se o homem e sua mulher da presença do Senhor Deus, entre as árvores do jardim.'],
  bom: ['Gênesis 1:31', 'E viu Deus tudo quanto fizera, e eis que era muito bom. E foi a tarde e a manhã, o dia sexto.'],
};
const NOTAS = {
  presenca: 'O texto diz que o Senhor Deus “passeava no jardim” (3:8). Aqui a presença aparece só como luz e vento, sem figura: o texto não a descreve.',
  rio: 'Os quatro braços são Pisom, Giom, Hidequel (Tigre) e Eufrates (2:11–14). Os dois últimos são conhecidos; os dois primeiros são debatidos.',
  arvore: 'A aparência da árvore da vida é ilustrativa: o texto não a descreve.',
};

export async function abrirJardim(THREE, host, { aoFechar, chegada = true } = {}) {
  const BASES = [(window.NEXUS_MIDIA || '/nexus') + '/eden/', '/nexus/eden/'];
  let pecas = {}, base = BASES[0];
  for (const b of BASES) { try { const r = await fetch(b + 'pecas.json?v=1'); if (r.ok) { pecas = await r.json(); base = b; break; } } catch (_) {} }
  const toque = matchMedia('(pointer: coarse)').matches;

  const raiz = document.createElement('div'); raiz.className = 'ej-raiz';
  raiz.innerHTML = `<style>
    .ej-raiz{position:absolute;inset:0;z-index:36;background:#cfc6a8;pointer-events:auto;opacity:0;transition:opacity 1.4s ease;font-family:Inter,system-ui,sans-serif;color:#fff;overflow:hidden}
    .ej-raiz.on{opacity:1}.ej-raiz canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}
    .ej-cab{position:absolute;left:24px;top:18px;pointer-events:none}.ej-cab h2{margin:0;font:600 38px/1 "Cormorant Garamond",Georgia,serif;text-shadow:0 2px 16px rgba(0,0,0,.7)}.ej-cab p{margin:6px 0 0;font-size:12.5px;letter-spacing:.2em;color:#FFF3D0;text-shadow:0 1px 6px #000}
    .ej-bts{position:absolute;right:20px;top:18px;display:flex;gap:8px}.ej-bts button{border:1px solid rgba(255,255,255,.5);background:rgba(0,0,0,.38);backdrop-filter:blur(8px);color:#fff;border-radius:999px;padding:8px 15px;font:600 12.5px Inter,sans-serif;cursor:pointer}
    .ej-card{position:absolute;left:24px;bottom:84px;width:min(440px,calc(100% - 48px));background:linear-gradient(160deg,rgba(20,33,61,.72),rgba(10,18,40,.55) 45%,rgba(40,28,8,.45));backdrop-filter:blur(12px);border:1px solid rgba(243,211,142,.35);border-radius:14px;padding:13px 16px;box-shadow:0 18px 40px rgba(0,0,0,.35);opacity:0;transform:translateY(8px);transition:all .7s ease;pointer-events:none}
    .ej-card.v{opacity:1;transform:none}.ej-card p{margin:0 0 6px;font:17px/1.5 "Cormorant Garamond",Georgia,serif;color:#FFF8E6}.ej-card cite{font:700 11px Inter,sans-serif;color:#F3D38E;letter-spacing:.08em;text-transform:uppercase}.ej-card small{display:block;margin-top:6px;font:12px/1.45 Inter,sans-serif;color:rgba(255,240,210,.85)}
    .ej-joy{position:absolute;left:28px;bottom:28px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.4);backdrop-filter:blur(6px);touch-action:none;display:${toque ? 'block' : 'none'}}
    .ej-joy b{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:rgba(243,211,142,.85);box-shadow:0 4px 14px rgba(0,0,0,.4)}
    .ej-raiz.voando .ej-joy{opacity:0;pointer-events:none}
    .ej-cred{position:absolute;right:20px;bottom:44px;max-width:420px;text-align:right;font-size:10.5px;color:rgba(255,255,255,.85);text-shadow:0 1px 4px #000}
    .ej-dica{position:absolute;right:20px;bottom:20px;font-size:12px;color:#fff;text-shadow:0 1px 4px #000}
    .ej-mira{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:rgba(255,255,255,.6);pointer-events:none}
  </style><canvas></canvas><div class="ej-mira"></div>
  <div class="ej-cab"><h2>O jardim do Éden</h2><p>GÊNESIS 2:8–15 · ANDAR NO JARDIM</p></div>
  <div class="ej-bts"><button type="button" class="ej-som">🔈 Som</button><button type="button" class="ej-sair">↩ Voltar</button></div>
  <div class="ej-card"></div><div class="ej-joy"><b></b></div>
  <div class="ej-cred">Reconstituição artística: peças geradas pelo ChatGPT a pedido do NEXUS (ilustrativas). O texto bíblico não descreve a aparência do jardim.</div>
  <div class="ej-dica">${toque ? 'Joystick para andar · arraste para olhar · toque duplo no chão para ir até lá' : 'W A S D ou setas para andar · Shift corre · arraste para olhar · duplo clique no chão para ir até lá'}</div>`;
  host.appendChild(raiz);
  const canvas = raiz.querySelector('canvas'), card = raiz.querySelector('.ej-card');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(toque ? 1.5 : 2, devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  const cena = new THREE.Scene(); const NEVOA = new THREE.Color(0xc9d2b6), DENS = 0.0013;
  cena.fog = new THREE.FogExp2(NEVOA, DENS); cena.background = NEVOA;
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 3000);
  const SOL = new THREE.Vector3(-0.55, 0.42, -0.72).normalize();
  cena.add(new THREE.HemisphereLight(0xfff4dc, 0x4f6a2c, 1.25)); const sol = new THREE.DirectionalLight(0xffe2b0, 2.4); sol.position.copy(SOL).multiplyScalar(500); cena.add(sol);
  const carregar = (n) => new THREE.TextureLoader().loadAsync(base + n).then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }).catch(() => null);
  const unif = { t: { value: 0 }, nevoa: { value: NEVOA }, dens: { value: DENS } };
  const lixo = [];

  // CÉU: o 360° das montanhas do Éden ao fundo
  const ceuTex = await new THREE.TextureLoader().loadAsync((window.NEXUS_MIDIA || '/nexus') + '/livros/eden-360-montanhas.jpg').catch(() => null);
  let ceu = null;
  if (ceuTex) { ceuTex.colorSpace = THREE.SRGBColorSpace; const g = new THREE.SphereGeometry(1400, 64, 32); g.scale(-1, 1, 1); ceu = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: ceuTex, fog: false, depthWrite: false })); ceu.renderOrder = -1; cena.add(ceu); lixo.push(ceuTex); }

  // RIOS: um rio vem do norte, passa ao lado da árvore da vida e se divide em quatro braços (Gn 2:10)
  const V = (x, z) => new THREE.Vector3(x, 0, z);
  const FORQ = V(48, 36);
  const rios = [
    [V(-60, -900), V(10, -520), V(-30, -260), V(40, -110), V(30, -20), FORQ],
    [FORQ, V(160, 10), V(330, -90), V(560, -60), V(900, -180)],
    [FORQ, V(130, 150), V(260, 330), V(330, 560), V(520, 900)],
    [FORQ, V(10, 170), V(-90, 330), V(-160, 560), V(-260, 900)],
    [FORQ, V(-60, 90), V(-230, 120), V(-430, 60), V(-900, 140)],
  ].map((p) => new THREE.CatmullRomCurve3(p, false, 'catmullrom', 0.5));
  const amostras = []; rios.forEach((c, i) => { for (let k = 0; k <= 240; k++) { const p = c.getPointAt(k / 240); amostras.push(p.x, p.z, i === 0 ? 9 : 6.5); } });
  function distRio(x, z) { let m = 1e9, w = 8; for (let i = 0; i < amostras.length; i += 3) { const dx = x - amostras[i], dz = z - amostras[i + 1], d = dx * dx + dz * dz; if (d < m) { m = d; w = amostras[i + 2]; } } return [Math.sqrt(m), w]; }

  // RELEVO: colinas suaves no jardim, montanhas ao longe, leito dos rios escavado
  const hBase = (x, z) => { const r = Math.hypot(x, z); return 2.6 * Math.sin(x * 0.013) * Math.cos(z * 0.011) + 1.3 * Math.sin(x * 0.031 + z * 0.027) + 0.5 * Math.sin(x * 0.09 - z * 0.07) + Math.max(0, r - 480) ** 1.25 * 0.022 * (0.6 + 0.4 * Math.sin(Math.atan2(z, x) * 5)); };
  const T = 1800, NS = toque ? 220 : 300;
  const geoT = new THREE.PlaneGeometry(T, T, NS, NS); geoT.rotateX(-Math.PI / 2);
  const pos = geoT.attributes.position, cores = new Float32Array(pos.count * 3), alturas = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); const [d, w] = distRio(x, z); const leito = 1 - THREE.MathUtils.smoothstep(d, w * 0.55, w * 1.6); const h = hBase(x, z) - 2.6 * leito; pos.setY(i, h); alturas[i] = h;
    const mar = THREE.MathUtils.smoothstep(d, w * 1.2, w * 2.4), longe = THREE.MathUtils.smoothstep(Math.hypot(x, z), 420, 700), v = 0.85 + 0.25 * Math.sin(x * 0.05) * Math.cos(z * 0.043);
    cores[i * 3] = (0.78 + 0.22 * (1 - mar)) * v * (1 + longe * 0.15); cores[i * 3 + 1] = (0.92 + 0.0 * mar) * v; cores[i * 3 + 2] = (0.72 + 0.18 * (1 - mar)) * v * (1 - longe * 0.1); }
  geoT.setAttribute('color', new THREE.BufferAttribute(cores, 3)); geoT.computeVertexNormals();
  const chaoTex = await carregar('chao-grama.jpg'); if (chaoTex) { chaoTex.wrapS = chaoTex.wrapT = THREE.RepeatWrapping; chaoTex.repeat.set(T / 9, T / 9); lixo.push(chaoTex); }
  const terreno = new THREE.Mesh(geoT, new THREE.MeshStandardMaterial({ map: chaoTex, color: chaoTex ? 0xffffff : 0x6f8f3a, vertexColors: true, roughness: 0.96 }));
  cena.add(terreno); lixo.push(geoT, terreno.material);
  const passo = T / NS;
  function altura(x, z) { const fx = (x + T / 2) / passo, fz = (z + T / 2) / passo, ix = Math.max(0, Math.min(NS - 1, Math.floor(fx))), iz = Math.max(0, Math.min(NS - 1, Math.floor(fz))), ax = fx - ix, az = fz - iz, n = NS + 1;
    const a = alturas[iz * n + ix], b = alturas[iz * n + ix + 1], c = alturas[(iz + 1) * n + ix], d = alturas[(iz + 1) * n + ix + 1]; return (a * (1 - ax) + b * ax) * (1 - az) + (c * (1 - ax) + d * ax) * az; }

  // ÁGUA CORRENDO: fitas que seguem cada rio, com ondas que andam rio abaixo, brilho do sol e espuma nas margens
  const matAgua = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { ...unif, sol: { value: SOL } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; varying float vD; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float t, dens; uniform vec3 nevoa, sol; varying vec2 vUv; varying vec3 vW; varying float vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){ vec2 p = vec2(vUv.x * 3., vUv.y) ; float corre = t * 1.6;
        float o = n(p * vec2(4., 1.2) - vec2(0., corre)) * .6 + n(p * vec2(9., 3.) - vec2(t*.3, corre * 1.7)) * .4;
        vec3 nn = normalize(vec3((o - .5) * .9, 1., (n(p * vec2(5., 2.) - vec2(0., corre * 1.3)) - .5) * .9));
        vec3 olho = normalize(cameraPosition - vW); float fr = pow(1. - max(dot(olho, nn), 0.), 3.);
        vec3 fundo = mix(vec3(.02,.15,.19), vec3(.05,.34,.38), o);
        vec3 c = mix(fundo, vec3(.40,.60,.70), .12 + .45 * fr);
        float brilho = pow(max(dot(reflect(-sol, nn), olho), 0.), 120.); c += vec3(1., .9, .7) * brilho * 2.2;
        float borda = smoothstep(.22, .0, vUv.x) + smoothstep(.78, 1., vUv.x); float esp = borda * smoothstep(.45, .8, n(p * vec2(8., 4.) - vec2(0., corre * 2.)));
        c = mix(c, vec3(.92), esp * .35);
        float a = smoothstep(0., .08, vUv.x) * smoothstep(1., .92, vUv.x) * .92;
        float f = 1. - exp(-dens * dens * vD * vD); c = mix(c, nevoa, f);
        gl_FragColor = vec4(c, a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
      }` });
  rios.forEach((c, i) => { const N = 400, w = i === 0 ? 9 : 6.5, P = [], U = [], I = []; let s = 0, ant = null;
    for (let k = 0; k <= N; k++) { const u = k / N, p = c.getPointAt(u), tg = c.getTangentAt(u), lado = new THREE.Vector3(-tg.z, 0, tg.x).normalize(); if (ant) s += p.distanceTo(ant); ant = p;
      for (const sx of [-1, 1]) { const q = p.clone().addScaledVector(lado, sx * w); P.push(q.x, hBase(q.x, q.z) * 0 + Math.min(altura(p.x, p.z), altura(q.x, q.z)) + 0.0, q.z); U.push(sx < 0 ? 0 : 1, s / 14); } }
    // a água fica um pouco acima do fundo do leito
    for (let k = 0; k < P.length; k += 3) P[k + 1] = hBase(P[k], P[k + 2]) - 1.25;
    for (let k = 0; k < N; k++) { const a = k * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I);
    const m = new THREE.Mesh(g, matAgua); m.renderOrder = 2; cena.add(m); lixo.push(g); });
  lixo.push(matAgua);
  const naAgua = (x, z) => { const [d, w] = distRio(x, z); return d < w * 1.5; };

  // GRAMA ALTA que balança ao vento em volta de quem anda
  const NG = toque ? 30000 : 60000, RG = 42;
  const lamina = new THREE.PlaneGeometry(0.06, 0.55, 1, 3); lamina.translate(0, 0.275, 0);
  { const p = lamina.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 0.7; p.setX(i, p.getX(i) * (1 - y * 0.85)); } }
  const matGrama = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { ...unif, centro: { value: new THREE.Vector2() }, sol: { value: SOL } },
    vertexShader: `uniform float t; uniform vec2 centro; attribute vec3 iOff; attribute float iRot, iEsc; varying float vY, vD; varying vec3 vC; uniform sampler2D alt;
      void main(){ vec2 rel = mod(iOff.xz - centro + ${RG}.0, ${(RG * 2).toFixed(1)}) - ${RG}.0; vec2 xz = centro + rel; float dist = length(rel);
        float esc = iEsc * smoothstep(${RG}.0, ${(RG * 0.6).toFixed(1)}, dist);
        vec3 p = position * vec3(1., esc, 1.); float c = cos(iRot), s = sin(iRot); p = vec3(c*p.x - s*p.z, p.y, s*p.x + c*p.z);
        float y = position.y / .55; float vento = sin(t * 1.7 + xz.x * .08 + xz.y * .05) * .5 + sin(t * 3.1 + xz.x * .3) * .18;
        p.x += vento * y * y * .32 * esc; p.z += vento * y * y * .12 * esc;
        vY = y; vC = vec3(.16 + iOff.y * .14, .34 + iOff.y * .14, .08);
        vec4 mv = viewMatrix * vec4(p + vec3(xz.x, 0., xz.y), 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float dens; uniform vec3 nevoa; varying float vY, vD; varying vec3 vC;
      void main(){ vec3 c = vC * (.55 + .6 * vY) + vec3(.10,.08,.0) * vY * vY; float f = 1. - exp(-dens * dens * vD * vD); gl_FragColor = vec4(mix(c, nevoa, f), 1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
      }` });
  // a altura do chão de cada lâmina é calculada na CPU e guardada; a lâmina "anda" junto com quem caminha
  const gramaGeo = new THREE.InstancedBufferGeometry(); gramaGeo.index = lamina.index; gramaGeo.attributes.position = lamina.attributes.position; gramaGeo.instanceCount = NG;
  const off = new Float32Array(NG * 3), rot = new Float32Array(NG), esc = new Float32Array(NG);
  for (let i = 0; i < NG; i++) { off[i * 3] = (Math.random() * 2 - 1) * RG; off[i * 3 + 1] = Math.random(); off[i * 3 + 2] = (Math.random() * 2 - 1) * RG; rot[i] = Math.random() * 6.28; esc[i] = 0.5 + Math.random() * 0.9; }
  gramaGeo.setAttribute('iOff', new THREE.InstancedBufferAttribute(off, 3)); gramaGeo.setAttribute('iRot', new THREE.InstancedBufferAttribute(rot, 1)); gramaGeo.setAttribute('iEsc', new THREE.InstancedBufferAttribute(esc, 1));
  // para a lâmina ficar no chão, o shader precisa da altura: usamos uma textura de altura do terreno
  const altH = new Uint16Array(alturas.length); for (let i = 0; i < alturas.length; i++) altH[i] = THREE.DataUtils.toHalfFloat(alturas[i]);
  const altTex = new THREE.DataTexture(altH, NS + 1, NS + 1, THREE.RedFormat, THREE.HalfFloatType); altTex.minFilter = altTex.magFilter = THREE.LinearFilter; altTex.needsUpdate = true;
  matGrama.uniforms.alt = { value: altTex };
  matGrama.vertexShader = matGrama.vertexShader.replace('vec4 mv = viewMatrix * vec4(p + vec3(xz.x, 0., xz.y), 1.);', `vec2 uvA = (xz + ${(T / 2).toFixed(1)}) / ${T.toFixed(1)}; float hA = texture2D(alt, uvA).r; vec4 mv = viewMatrix * vec4(p + vec3(xz.x, hA, xz.y), 1.);`);
  const grama = new THREE.Mesh(gramaGeo, matGrama); grama.frustumCulled = false; cena.add(grama); lixo.push(gramaGeo, matGrama, altTex, lamina);

  // FIGURAS (recortes do ChatGPT) que sempre olham para quem anda, com vento no alto das árvores
  const matFig = (tex, vento) => new THREE.ShaderMaterial({ uniforms: { ...unif, map: { value: tex }, vento: { value: vento } },
    vertexShader: `uniform float t, vento; attribute vec3 iPos; attribute vec2 iTam; attribute float iFase, iVira; varying vec2 vUv; varying float vD;
      void main(){ vUv = vec2(iVira > .5 ? 1. - uv.x : uv.x, uv.y);
        vec3 d3 = normalize(cameraPosition - iPos); vec3 dir = d3; dir.y = 0.; dir = normalize(dir + vec3(1e-4, 0., 0.)); vec3 dirX = vec3(dir.z, 0., -dir.x);
        float k = smoothstep(15., 140., cameraPosition.y - iPos.y) * .85; vec3 upV = normalize(mix(vec3(0., 1., 0.), cross(d3, dirX), k));
        float y = position.y; float sopro = (sin(t * 1.1 + iFase) * .6 + sin(t * 2.3 + iFase * 1.7) * .25) * vento * y * y;
        vec3 w = iPos + dirX * (position.x * iTam.x + sopro * iTam.y * .035) + upV * y * iTam.y;
        vec4 mv = viewMatrix * vec4(w, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; uniform float dens; uniform vec3 nevoa; varying vec2 vUv; varying float vD;
      void main(){ vec4 c = texture2D(map, vUv); if (c.a < .5) discard; float f = 1. - exp(-dens * dens * vD * vD); gl_FragColor = vec4(mix(c.rgb * 1.04, nevoa, f), 1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
      }` });
  const quad = new THREE.PlaneGeometry(1, 1); quad.translate(0, 0.5, 0); lixo.push(quad);
  async function figuras(nome, lista, alturaReal, vento = 0) {
    const pc = pecas[nome]; if (!pc || !lista.length) return null; const tex = await carregar(nome + '.png'); if (!tex) return null; lixo.push(tex);
    const asp = pc.w / pc.h, g = new THREE.InstancedBufferGeometry(); g.index = quad.index; g.attributes.position = quad.attributes.position; g.attributes.uv = quad.attributes.uv; g.instanceCount = lista.length;
    const P = new Float32Array(lista.length * 3), S = new Float32Array(lista.length * 2), F = new Float32Array(lista.length), R = new Float32Array(lista.length);
    lista.forEach((o, i) => { const hR = alturaReal * (o.s || 1); P.set([o.x, altura(o.x, o.z) - 0.15, o.z], i * 3); S.set([hR * asp, hR], i * 2); F[i] = Math.random() * 6.28; R[i] = o.vira ? 1 : 0; });
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute('iTam', new THREE.InstancedBufferAttribute(S, 2)); g.setAttribute('iFase', new THREE.InstancedBufferAttribute(F, 1)); g.setAttribute('iVira', new THREE.InstancedBufferAttribute(R, 1));
    const m = new THREE.Mesh(g, matFig(tex, vento)); m.frustumCulled = false; cena.add(m); lixo.push(g, m.material); return { m, P, R, g };
  }
  // espalha posições evitando a água e o caminho de chegada
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  function espalhar(n, rMin, rMax, folga = 6, evitar = []) { const out = []; let tent = 0;
    while (out.length < n && tent++ < n * 40) { const a = rnd() * 6.283, r = Math.sqrt(rMin * rMin + rnd() * (rMax * rMax - rMin * rMin)), x = Math.cos(a) * r, z = Math.sin(a) * r;
      const [d, w] = distRio(x, z); if (d < w + folga) continue; if (Math.abs(x) < 7 && z > 8 && z < 150) continue; if (evitar.some((e) => Math.hypot(e.x - x, e.z - z) < e.r)) continue; out.push({ x, z, s: 0.75 + rnd() * 0.5, vira: rnd() > 0.5 }); }
    return out; }
  const centroArv = { x: 0, z: 0, r: 26 };
  await Promise.all([
    figuras('arvore-vida', [{ x: 0, z: 0, s: 1 }], 34, 0.5),
    figuras('arvore-fruto-1', espalhar(toque ? 150 : 240, 30, 520, 7, [centroArv]), 15, 1),
    figuras('arvore-fruto-2', espalhar(toque ? 120 : 200, 30, 520, 7, [centroArv]), 12, 1),
    figuras('palmeira', rios.flatMap((c) => Array.from({ length: 26 }, (_, k) => { const u = (k + 0.5) / 26, p = c.getPointAt(u), tg = c.getTangentAt(u), sx = k % 2 ? 1 : -1, d = 14 + rnd() * 10; return { x: p.x - tg.z * sx * d, z: p.z + tg.x * sx * d, s: 0.8 + rnd() * 0.4, vira: rnd() > 0.5 }; })).filter((o) => Math.hypot(o.x, o.z) > 24 && !naAgua(o.x, o.z)), 14, 0.8),
    figuras('arbusto-flores', espalhar(toque ? 260 : 420, 10, 400, 3.5, [centroArv]), 1.6, 0.6),
  ]);

  // ANIMAIS que andam devagar pelo jardim (o leão descansa)
  const especies = [
    { n: 'leao', h: 1.15, q: 3, anda: 0 }, { n: 'cordeiro', h: 0.85, q: 6, anda: 0.5 }, { n: 'cervo', h: 1.75, q: 5, anda: 0.9 },
    { n: 'elefante', h: 3.2, q: 3, anda: 0.6 }, { n: 'girafa', h: 5.2, q: 3, anda: 0.7 }, { n: 'pavao', h: 1.1, q: 4, anda: 0.4 },
  ];
  const bichos = [];
  const PERTO = { leao: [-10, 46], cordeiro: [-6, 44], cervo: [13, 40], elefante: [-26, 22], girafa: [24, 24], pavao: [5, 53] };   // um grupo à vista de quem pousa
  for (const e of especies) { const lista = espalhar(e.q - 1, 22, 150, 5, [{ x: 0, z: 0, r: 18 }]); const pp = PERTO[e.n]; if (pp && !naAgua(pp[0], pp[1])) lista.unshift({ x: pp[0], z: pp[1], s: 1, vira: e.n === 'leao' }); else lista.push(...espalhar(1, 22, 150, 5, [{ x: 0, z: 0, r: 18 }])); const f = await figuras(e.n, lista, e.h, 0); if (!f) continue;
    lista.forEach((o, i) => bichos.push({ f, i, e, x: o.x, z: o.z, alvo: null, espera: rnd() * 6, fase: rnd() * 6 })); }
  function moverBichos(dt) { for (const b of bichos) { if (!b.e.anda) continue;
      if (!b.alvo) { b.espera -= dt; if (b.espera <= 0) { const a = rnd() * 6.283, r = 8 + rnd() * 25; let x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r; const rr = Math.hypot(x, z); if (rr > 200) { x *= 180 / rr; z *= 180 / rr; } if (!naAgua(x, z)) b.alvo = { x, z }; else b.espera = 1; } continue; }
      const dx = b.alvo.x - b.x, dz = b.alvo.z - b.z, d = Math.hypot(dx, dz); if (d < 0.5) { b.alvo = null; b.espera = 3 + rnd() * 8; continue; }
      const v = b.e.anda * dt; b.x += dx / d * v; b.z += dz / d * v;
      // vira a figura conforme o lado para onde anda (em relação a quem olha)
      const dirX = new THREE.Vector3().subVectors(camera.position, new THREE.Vector3(b.x, 0, b.z)); const ladoX = new THREE.Vector3(dirX.z, 0, -dirX.x).normalize(); const vaiDireita = (dx * ladoX.x + dz * ladoX.z) > 0;
      b.f.R[b.i] = vaiDireita === !!b.e.olhaEsq ? 1 : 0; b.f.g.attributes.iVira.needsUpdate = true;
      b.f.P[b.i * 3] = b.x; b.f.P[b.i * 3 + 1] = altura(b.x, b.z) - 0.1 + Math.abs(Math.sin(b.fase += dt * 6)) * 0.04 * b.e.h; b.f.P[b.i * 3 + 2] = b.z; b.f.g.attributes.iPos.needsUpdate = true; } }

  // AVES em voo circular e BORBOLETAS perto das flores: tudo calculado na placa de vídeo
  async function voadores(nome, n, tam, modo) {
    const tex = await carregar(nome + '.png'); if (!tex) return; lixo.push(tex);
    const g = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(1, 1); g.index = q.index; g.attributes.position = q.attributes.position; g.attributes.uv = q.attributes.uv; g.instanceCount = n; lixo.push(q);
    const C = new Float32Array(n * 4); for (let i = 0; i < n; i++) { const a = rnd() * 6.283, r = modo ? 10 + rnd() * 140 : rnd() * 160; C.set([Math.cos(a) * r, modo ? 0 : 18 + rnd() * 45, Math.sin(a) * r, rnd() * 100], i * 4); if (modo) C[i * 4 + 1] = altura(C[i * 4], C[i * 4 + 2]); }
    g.setAttribute('iC', new THREE.InstancedBufferAttribute(C, 4));
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: false, side: THREE.DoubleSide, uniforms: { ...unif, map: { value: tex } },
      vertexShader: `uniform float t; attribute vec4 iC; varying vec2 vUv; varying float vD;
        void main(){ vUv = uv; float f = iC.w; vec3 c;
          ${modo ? `c = iC.xyz + vec3(sin(t*.7+f)*3. + sin(t*1.9+f*2.)*1.2, 1.1 + sin(t*1.3+f)*.6 + sin(t*3.7+f)*.2, cos(t*.6+f*1.3)*3. + cos(t*2.3+f)*1.);` : `float r = 30. + mod(f, 7.) * 9.; float w = .12 + mod(f, 3.) * .03; c = vec3(iC.x + cos(t*w + f) * r, iC.y + sin(t*.4+f)*4., iC.z + sin(t*w + f) * r);`}
          float bate = abs(sin(t * ${modo ? '14.' : '5.'} + f * 3.)); float esc = ${tam.toFixed(2)};
          vec3 dX = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); vec3 dY = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vec3 w = c + dX * position.x * esc * (.25 + .75 * bate) + dY * position.y * esc;
          vec4 mv = viewMatrix * vec4(w, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; uniform float dens; uniform vec3 nevoa; varying vec2 vUv; varying float vD;
        void main(){ vec4 c = texture2D(map, vUv); if (c.a < .5) discard; float f = 1. - exp(-dens * dens * vD * vD); gl_FragColor = vec4(mix(c.rgb, nevoa, f), 1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
        }` }));
    m.frustumCulled = false; cena.add(m); lixo.push(g, m.material);
  }
  await Promise.all([voadores('passaro', toque ? 40 : 70, 1.6, 0), voadores('borboleta', toque ? 90 : 160, 0.22, 1)]);

  // A PRESENÇA: luz dourada e vento que passeiam pelo jardim, sem figura (Gn 3:8)
  const presenca = new THREE.Group(); cena.add(presenca);
  const matColuna = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: unif,
    vertexShader: `varying vec2 vUv; varying float vD; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float t; varying vec2 vUv; varying float vD; void main(){ float a = (1. - vUv.y) * (1. - vUv.y) * (.22 + .08 * sin(t * 1.3 + vUv.x * 25.)) * smoothstep(6., 30., vD); gl_FragColor = vec4(vec3(1., .86, .55) * a, a); }` });
  const coluna = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 6.5, 70, 32, 1, true), matColuna); coluna.position.y = 35; presenca.add(coluna); lixo.push(coluna.geometry, matColuna);
  const NP = 500, pP = new Float32Array(NP * 3); for (let i = 0; i < NP; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 7; pP.set([Math.cos(a) * r, rnd() * 18, Math.sin(a) * r], i * 3); }
  const gP = new THREE.BufferGeometry(); gP.setAttribute('position', new THREE.BufferAttribute(pP, 3));
  const matP = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: unif,
    vertexShader: `uniform float t; varying float vA; void main(){ vec3 p = position; float f = p.x * 3.1 + p.z * 1.7; p.y = mod(p.y + t * (.5 + fract(f) * .6), 18.); p.x += sin(t * .8 + f) * .6; p.z += cos(t * .7 + f) * .6; vA = smoothstep(0., 2., p.y) * smoothstep(18., 11., p.y);
      vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = clamp(260. / -mv.z, 2., 18.); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d) * vA; gl_FragColor = vec4(vec3(1., .88, .58) * a, a); }` });
  presenca.add(new THREE.Points(gP, matP)); lixo.push(gP, matP);
  const brilho = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.3, 'rgba(255,220,150,.45)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); lixo.push(t); return t; })(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  brilho.scale.set(26, 26, 1); brilho.position.y = 6; presenca.add(brilho); lixo.push(brilho.material);
  const caminhoPresenca = new THREE.CatmullRomCurve3([V(70, 60), V(120, -40), V(40, -120), V(-80, -90), V(-120, 20), V(-60, 110), V(30, 120)], true);
  const posPresenca = new THREE.Vector3();

  // CÂMERA e CONTROLES
  let yaw = Math.PI, pitch = -0.05, voando = chegada; const eu = new THREE.Vector3(0, 0, 70); const vel = new THREE.Vector3();
  const teclas = new Set(), joy = { x: 0, y: 0 }; let indo = null, olhar = null, ultimoToque = 0;
  const kd = (e) => { if (e.target.closest && e.target.closest('input,textarea')) return; const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) { teclas.add(k); indo = null; if (voando) pularChegada(); e.preventDefault(); } if (k === 'escape') fechar(); };
  const ku = (e) => teclas.delete(e.key.toLowerCase());
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener('pointerdown', (e) => { if (voando) { pularChegada(); return; } olhar = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} ligarSom();
    const ag = performance.now(); if (ag - ultimoToque < 330) { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const hit = ray.intersectObject(terreno)[0]; if (hit && hit.distance < 400) indo = hit.point.clone(); } ultimoToque = ag; });
  canvas.addEventListener('pointermove', (e) => { if (!olhar || olhar.id !== e.pointerId) return; yaw -= (e.clientX - olhar.x) * 0.0042; pitch = Math.max(-1.2, Math.min(1.2, pitch - (e.clientY - olhar.y) * 0.0036)); olhar.x = e.clientX; olhar.y = e.clientY; });
  const soltar = (e) => { if (olhar && olhar.id === e.pointerId) olhar = null; }; canvas.addEventListener('pointerup', soltar); canvas.addEventListener('pointercancel', soltar);
  const joyEl = raiz.querySelector('.ej-joy'), joyB = joyEl.querySelector('b'); let joyId = null;
  const joyMove = (e) => { const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } joy.x = dx; joy.y = dy; joyB.style.transform = `translate(${dx * 34}px,${dy * 34}px)`; };
  joyEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); joyId = e.pointerId; joyEl.setPointerCapture(e.pointerId); indo = null; ligarSom(); joyMove(e); });
  joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyMove(e); });
  const joyFim = (e) => { if (e.pointerId !== joyId) return; joyId = null; joy.x = joy.y = 0; joyB.style.transform = ''; }; joyEl.addEventListener('pointerup', joyFim); joyEl.addEventListener('pointercancel', joyFim);

  // SOM: água correndo (mais forte perto do rio), vento e cantos de pássaros, tudo sintetizado no navegador
  let audio = null, somLigado = false; const btSom = raiz.querySelector('.ej-som');
  function ligarSom() { if (somLigado || audio === false) return; try { audio = audio || criarAudio(); audio.ctx.resume(); somLigado = true; btSom.textContent = '🔊 Som'; } catch (_) { audio = false; } }
  btSom.onclick = () => { if (!somLigado) ligarSom(); else { somLigado = false; audio && audio.ctx.suspend(); btSom.textContent = '🔈 Som'; } };
  function criarAudio() { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0); let ult = 0; for (let i = 0; i < n; i++) { const b = Math.random() * 2 - 1; ult = (ult + 0.02 * b) / 1.02; d[i] = ult * 3.5; }
    const ruido = () => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
    const agua = ruido(), fA = ctx.createBiquadFilter(); fA.type = 'bandpass'; fA.frequency.value = 900; fA.Q.value = 0.6; const gA = ctx.createGain(); gA.gain.value = 0; agua.connect(fA).connect(gA).connect(ctx.destination);
    const agua2 = ruido(), fA2 = ctx.createBiquadFilter(); fA2.type = 'highpass'; fA2.frequency.value = 2400; const gA2 = ctx.createGain(); gA2.gain.value = 0; agua2.connect(fA2).connect(gA2).connect(ctx.destination);
    const vento = ruido(), fV = ctx.createBiquadFilter(); fV.type = 'lowpass'; fV.frequency.value = 380; const gV = ctx.createGain(); gV.gain.value = 0.18; vento.connect(fV).connect(gV).connect(ctx.destination);
    function piar() { if (!ativo) return; if (somLigado) { const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime, f0 = 2200 + Math.random() * 2200, k = 2 + Math.floor(Math.random() * 4); o.type = 'sine'; g.gain.value = 0; o.connect(g).connect(ctx.destination);
        for (let i = 0; i < k; i++) { const a = t0 + i * 0.13; o.frequency.setValueAtTime(f0, a); o.frequency.exponentialRampToValueAtTime(f0 * (1.25 + Math.random() * 0.4), a + 0.08); g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(0.035, a + 0.02); g.gain.linearRampToValueAtTime(0, a + 0.1); }
        o.start(t0); o.stop(t0 + k * 0.13 + 0.1); }
      setTimeout(piar, 900 + Math.random() * 3800); }
    setTimeout(piar, 1500);
    return { ctx, gA, gA2, gV, fV }; }

  // CARTÕES com o texto bíblico quando se chega perto de cada lugar
  let cartaoAtual = null;
  function cartao(k) { if (cartaoAtual === k) return; cartaoAtual = k; if (!k) { card.classList.remove('v'); return; } const [r, t] = VERSOS[k]; card.classList.remove('v'); setTimeout(() => { card.innerHTML = `<p>“${t}”</p><cite>${r} · Almeida</cite>${NOTAS[k] ? `<small>${NOTAS[k]}</small>` : ''}`; card.classList.add('v'); }, 350); }

  function ajustar() { const w = raiz.clientWidth, h = raiz.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const obs = new ResizeObserver(ajustar); obs.observe(raiz); ajustar();

  // CHEGADA DE DRONE: do alto, sobre o jardim, descendo em curva até pousar na trilha diante da árvore da vida
  const voo = new THREE.CatmullRomCurve3([V(-200, 480).setY(260), V(-90, 330).setY(150), V(40, 220).setY(70), V(30, 150).setY(30), V(0, 72).setY(0)]);
  const DUR = 11000; let t0 = performance.now();
  if (voando) raiz.classList.add('voando');
  function pularChegada() { if (!voando) return; voando = false; raiz.classList.remove('voando'); cartao('chegada'); }
  let ativo = true, antes = performance.now(), passoBob = 0;
  function quadro(agora) { if (!ativo) return; const dt = Math.min(0.05, (agora - antes) / 1000); antes = agora; const t = agora / 1000; unif.t.value = t;
    if (voando) { const q = Math.min(1, (agora - t0) / DUR), e = q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2; const p = voo.getPointAt(e); const hc = altura(p.x, p.z); camera.position.set(p.x, Math.max(hc + 1.7, hc + p.y + 1.7), p.z);
      const olhaPara = new THREE.Vector3(0, 10 * (1 - e) + 6 * e, 0); camera.lookAt(olhaPara); const fw = new THREE.Vector3(); camera.getWorldDirection(fw); yaw = Math.atan2(-fw.x, -fw.z); pitch = Math.asin(fw.y); eu.set(p.x, 0, p.z);
      if (q >= 1) pularChegada(); }
    else {
      // andar
      let fx = 0, fz = 0; if (teclas.has('w') || teclas.has('arrowup')) fz += 1; if (teclas.has('s') || teclas.has('arrowdown')) fz -= 1; if (teclas.has('a')) fx -= 1; if (teclas.has('d')) fx += 1;
      if (teclas.has('arrowleft')) yaw += dt * 1.6; if (teclas.has('arrowright')) yaw -= dt * 1.6;
      fx += joy.x; fz += -joy.y;
      if (indo) { const dx = indo.x - eu.x, dz = indo.z - eu.z, d = Math.hypot(dx, dz); if (d < 1.2) indo = null; else { const alvoYaw = Math.atan2(-dx, -dz); let dy = alvoYaw - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw += dy * Math.min(1, dt * 3); fz = Math.min(1, d / 4); } }
      const corre = teclas.has('shift') ? 2.6 : 1, vMax = 4.2 * corre; const sinY = Math.sin(yaw), cosY = Math.cos(yaw);
      const alvoV = new THREE.Vector3((-sinY * fz + cosY * fx) * vMax, 0, (-cosY * fz - sinY * fx) * vMax); vel.lerp(alvoV, Math.min(1, dt * 6));
      eu.addScaledVector(vel, dt); const r = Math.hypot(eu.x, eu.z); if (r > 620) eu.multiplyScalar(620 / r);
      const vv = vel.length(); passoBob += vv * dt * 1.9; const agua = naAgua(eu.x, eu.z);
      camera.position.set(eu.x, altura(eu.x, eu.z) + (agua ? 1.25 : 1.7) + Math.sin(passoBob * 2) * 0.035 * Math.min(1, vv / 3), eu.z);
      camera.rotation.set(0, 0, 0); camera.rotation.order = 'YXZ'; camera.rotation.y = yaw; camera.rotation.x = pitch;
      // cartões por proximidade
      const dArv = Math.hypot(eu.x, eu.z), dForq = Math.hypot(eu.x - FORQ.x, eu.z - FORQ.z), dPres = Math.hypot(eu.x - posPresenca.x, eu.z - posPresenca.z);
      const perto = bichos.some((b) => Math.hypot(b.x - eu.x, b.z - eu.z) < 9);
      cartao(dPres < 16 ? 'presenca' : dArv < 30 ? 'arvore' : dForq < 26 ? 'rio' : perto ? 'animais' : dArv < 90 ? 'chegada' : r > 300 ? 'bom' : null);
    }
    moverBichos(dt);
    caminhoPresenca.getPointAt(((t / 160) % 1 + 1) % 1, posPresenca); presenca.position.set(posPresenca.x, altura(posPresenca.x, posPresenca.z), posPresenca.z); brilho.material.opacity = 0.75 + 0.25 * Math.sin(t * 1.7);
    matGrama.uniforms.centro.value.set(camera.position.x, camera.position.z); grama.visible = camera.position.y - altura(camera.position.x, camera.position.z) < 25;
    if (ceu) ceu.position.copy(camera.position);
    if (audio && somLigado) { const [d, w] = distRio(camera.position.x, camera.position.z), k = Math.max(0, 1 - Math.max(0, d - w) / 60); audio.gA.gain.setTargetAtTime(0.55 * k * k, audio.ctx.currentTime, 0.3); audio.gA2.gain.setTargetAtTime(0.10 * k * k, audio.ctx.currentTime, 0.3);
      const dP = Math.hypot(camera.position.x - posPresenca.x, camera.position.z - posPresenca.z); audio.gV.gain.setTargetAtTime(0.14 + 0.35 * Math.max(0, 1 - dP / 40) + 0.06 * Math.sin(t * 0.3), audio.ctx.currentTime, 0.5); }
    renderer.render(cena, camera); requestAnimationFrame(quadro); }
  requestAnimationFrame((a) => { raiz.classList.add('on'); t0 = a; antes = a; if (!voando) cartao('chegada'); quadro(a); });

  function fechar() { if (!ativo) return; ativo = false; obs.disconnect(); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); raiz.classList.remove('on'); if (audio) try { audio.ctx.close(); } catch (_) {}
    setTimeout(() => { lixo.forEach((o) => o && o.dispose && o.dispose()); renderer.dispose(); raiz.remove(); }, 1400); if (aoFechar) aoFechar(); }
  raiz.querySelector('.ej-sair').onclick = fechar;
  return { fechar, estado: () => ({ x: eu.x, z: eu.z, yaw, pitch, voando, bichos: bichos.length, onde: bichos.map((b) => [b.e.n, Math.round(b.x), Math.round(b.z)]) }), olhar: (y, p) => { yaw = y; pitch = p; }, irPara: (x, z) => { pularChegada(); eu.set(x, 0, z); } };
}
