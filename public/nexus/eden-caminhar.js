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
  for (const b of BASES) { try { const r = await fetch(b + 'pecas.json', { cache: 'no-cache' }); if (r.ok) { pecas = await r.json(); base = b; break; } } catch (_) {} }
  const toque = matchMedia('(pointer: coarse)').matches;
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

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
  <div class="ej-bts"><button type="button" class="ej-modo">👁 Primeira pessoa</button><button type="button" class="ej-som">🔈 Som</button><button type="button" class="ej-sair">↩ Voltar</button></div>
  <div class="ej-card"></div><div class="ej-joy"><b></b></div>
  <div class="ej-cred">Reconstituição artística: peças geradas pelo ChatGPT a pedido do NEXUS (ilustrativas). O texto bíblico não descreve a aparência do jardim.</div>
  <div class="ej-dica">${toque ? 'Joystick para andar · arraste para olhar · toque duplo no chão para ir até lá' : 'W A S D ou setas para andar · Shift corre · arraste para olhar · duplo clique no chão para ir até lá'}</div>`;
  host.appendChild(raiz);
  const canvas = raiz.querySelector('canvas'), card = raiz.querySelector('.ej-card');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(toque ? 1.5 : 2, devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  const cena = new THREE.Scene(); const NEVOA = new THREE.Color(0xc4cfa8), DENS = 0.0019;
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
  if (ceuTex) { ceuTex.colorSpace = THREE.SRGBColorSpace; const g = new THREE.SphereGeometry(1400, 64, 32); g.scale(-1, 1, 1); ceu = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: ceuTex, color: new THREE.Color(1.25, 1.2, 1.1), fog: false, depthWrite: false })); ceu.renderOrder = -1; cena.add(ceu); lixo.push(ceuTex); }

  // RIOS: um rio vem do norte, passa ao lado da árvore da vida e se divide em quatro braços (Gn 2:10)
  const V = (x, z) => new THREE.Vector3(x, 0, z);
  const TD = { x: -0.6, z: -0.8 }, TP = { x: 0.8, z: -0.6 };   // direção da trilha (do centro para fora) e o lado
  const T2W = (lado, s) => ({ x: TD.x * s + TP.x * lado, z: TD.z * s + TP.z * lado }); const W2T = (x, z) => ({ s: x * TD.x + z * TD.z, lado: x * TP.x + z * TP.z });
  const VT = (lado, s, y = 0) => { const w = T2W(lado, s); return new THREE.Vector3(w.x, y, w.z); };
  const FORQ = V(48, 36);
  const rios = [
    [V(-60, -900), V(10, -520), V(-30, -260), V(40, -110), V(30, -20), FORQ],
    [FORQ, V(160, 10), V(330, -90), V(560, -60), V(900, -180)],
    [FORQ, V(130, 150), V(260, 330), V(330, 560), V(520, 900)],
    [FORQ, V(10, 170), V(-90, 330), V(-160, 560), V(-260, 900)],
    [FORQ, V(-60, 90), V(-230, 120), V(-430, 60), V(-900, 140)],
  ].map((p) => new THREE.CatmullRomCurve3(p, false, 'catmullrom', 0.5));
  const amostras = []; rios.forEach((c, i) => { for (let k = 0; k <= 240; k++) { const p = c.getPointAt(k / 240); amostras.push(p.x, p.z, i === 0 ? 16 : 11); } });
  function distRio(x, z) { let m = 1e9, w = 8; for (let i = 0; i < amostras.length; i += 3) { const dx = x - amostras[i], dz = z - amostras[i + 1], d = dx * dx + dz * dz; if (d < m) { m = d; w = amostras[i + 2]; } } return [Math.sqrt(m), w]; }

  // RELEVO: colinas suaves no jardim, montanhas ao longe, leito dos rios escavado
  const hBase = (x, z) => { const r = Math.hypot(x, z); return 2.6 * Math.sin(x * 0.013) * Math.cos(z * 0.011) + 1.3 * Math.sin(x * 0.031 + z * 0.027) + 0.5 * Math.sin(x * 0.09 - z * 0.07) + Math.max(0, r - 480) ** 1.25 * 0.022 * (0.6 + 0.4 * Math.sin(Math.atan2(z, x) * 5)); };
  const T = 1800, NS = toque ? 240 : 340;
  const geoT = new THREE.PlaneGeometry(T, T, NS, NS); geoT.rotateX(-Math.PI / 2);
  const pos = geoT.attributes.position, cores = new Float32Array(pos.count * 3), alturas = new Float32Array(pos.count), relRio = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); const [d, w] = distRio(x, z); relRio[i] = d / w; const leito = (1 - THREE.MathUtils.smoothstep(d, w * 0.95, w * 1.45)) * 1.5 + 6.2 * Math.pow(Math.max(0, 1 - d / w), 1.15); const h = hBase(x, z) - leito; pos.setY(i, h); alturas[i] = h;
    const mar = THREE.MathUtils.smoothstep(d, w * 1.2, w * 2.4), longe = THREE.MathUtils.smoothstep(Math.hypot(x, z), 420, 700), v = 0.85 + 0.25 * Math.sin(x * 0.05) * Math.cos(z * 0.043);
    cores[i * 3] = (0.78 + 0.22 * (1 - mar)) * v * (1 + longe * 0.15); cores[i * 3 + 1] = (0.92 + 0.0 * mar) * v; cores[i * 3 + 2] = (0.72 + 0.18 * (1 - mar)) * v * (1 - longe * 0.1);
    const banco = 1 - THREE.MathUtils.smoothstep(d, w * 1.0, w * 1.35); if (banco > 0) { cores[i * 3] = cores[i * 3] * (1 - banco) + 0.85 * banco; cores[i * 3 + 1] = cores[i * 3 + 1] * (1 - banco) + 0.72 * banco; cores[i * 3 + 2] = cores[i * 3 + 2] * (1 - banco) + 0.55 * banco; } }
  geoT.setAttribute('color', new THREE.BufferAttribute(cores, 3)); geoT.computeVertexNormals();
  const chaoTex = await carregar('chao-grama.jpg'); if (chaoTex) { chaoTex.wrapS = chaoTex.wrapT = THREE.RepeatWrapping; chaoTex.repeat.set(T / 9, T / 9); lixo.push(chaoTex); }
  const terreno = new THREE.Mesh(geoT, new THREE.MeshStandardMaterial({ map: chaoTex, color: chaoTex ? 0xffffff : 0x6f8f3a, vertexColors: true, roughness: 0.96 }));
  cena.add(terreno); lixo.push(geoT, terreno.material);
  const passo = T / NS;
  function altura(x, z) { const fx = (x + T / 2) / passo, fz = (z + T / 2) / passo, ix = Math.max(0, Math.min(NS - 1, Math.floor(fx))), iz = Math.max(0, Math.min(NS - 1, Math.floor(fz))), ax = fx - ix, az = fz - iz, n = NS + 1;
    const a = alturas[iz * n + ix], b = alturas[iz * n + ix + 1], c = alturas[(iz + 1) * n + ix], d = alturas[(iz + 1) * n + ix + 1]; return (a * (1 - ax) + b * ax) * (1 - az) + (c * (1 - ax) + d * ax) * az; }

  // O RIO: largo, fundo e com correnteza forte. Raso e transparente nas margens (vê-se a areia e as pedras do fundo),
  // escuro como esmeralda no meio (a profundidade engole a luz), ondas que descem com a corrente, linhas de espuma,
  // reflexo real das árvores e do céu (espelho calculado a cada quadro) e água branca batendo nas pedras.
  const PEDRAS = []; rios.forEach((c, i) => { const w = i === 0 ? 16 : 11; for (let k = 0; k < (i === 0 ? 14 : 7); k++) { const u = 0.04 + rnd() * 0.55, p = c.getPointAt(u), tg = c.getTangentAt(u), lado = (rnd() * 2 - 1) * w * 0.85; const x = p.x - tg.z * lado, z = p.z + tg.x * lado; if (Math.hypot(x, z) < 24) continue; PEDRAS.push({ x, z, r: 0.8 + rnd() * 2.2 }); } });
  const NPED = Math.min(48, PEDRAS.length), pedU = Array.from({ length: 48 }, (_, i) => i < NPED ? new THREE.Vector3(PEDRAS[i].x, PEDRAS[i].z, PEDRAS[i].r) : new THREE.Vector3(1e5, 1e5, 0));
  const reflRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
  const reflCam = new THREE.PerspectiveCamera(); const texMat = new THREE.Matrix4();
  const matAgua = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { ...unif, sol: { value: SOL }, refl: { value: reflRT.texture }, texMat: { value: texMat }, pedras: { value: pedU } },
    vertexShader: `uniform float t; uniform mat4 texMat; attribute vec3 tg; attribute float prof; varying vec2 vUv; varying vec3 vW, vTg; varying float vD, vProf; varying vec4 vRef;
      void main(){ vUv = uv; vTg = tg; vProf = prof; vec3 p = position; float meio = smoothstep(.0, 1.2, prof); float rap = smoothstep(.25, .85, .5 + .5 * sin(uv.y * .013) * sin(uv.y * .029 + 1.)); meio *= 1. + 1.8 * rap;
        p.y += meio * (sin(uv.y * .55 - t * 2.4 + uv.x * 2.) * .16 + sin(uv.y * 1.3 - t * 3.6 + uv.x * 5.) * .07 + sin(uv.y * .21 - t * 1.3) * .1);
        vec4 w = modelMatrix * vec4(p, 1.); vW = w.xyz; vRef = texMat * w; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float t, dens; uniform vec3 nevoa, sol, pedras[48]; uniform sampler2D refl; varying vec2 vUv; varying vec3 vW, vTg; varying float vD, vProf; varying vec4 vRef;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * n(p); p = p * 2.03 + 11.7; a *= .5; } return s; }
      float onda(vec2 q){ vec2 w = vec2(fbm(q * .15 + t * .05), fbm(q * .15 - 3.1)) * 4.; q += w; return fbm(q * vec2(.7, .3) - vec2(0., t * 1.9)) * .55 + fbm(q * vec2(2.1, 1.1) - vec2(t * .3, t * 3.1)) * .3 + fbm(q * vec2(5., 3.) - vec2(0., t * 4.5)) * .15; }
      void main(){
        vec3 tg = normalize(vTg), lado = normalize(cross(vec3(0., 1., 0.), tg));
        vec2 q = vec2((vUv.x - .5) * 30., vUv.y);   // coordenadas da corrente (atravessando, ao longo)
        float e = .35, h0 = onda(q), hx = onda(q + vec2(e, 0.)), hz = onda(q + vec2(0., e));
        float rap = smoothstep(.25, .85, .5 + .5 * sin(vUv.y * .013) * sin(vUv.y * .029 + 1.)); float forca = (.55 + .9 * smoothstep(.0, 2.5, vProf)) * (1. + 1.4 * rap);
        vec3 nl = normalize(vec3(-(hx - h0) / e * forca, 1., -(hz - h0) / e * forca));
        vec3 nn = normalize(lado * nl.x + vec3(0., 1., 0.) * nl.y + tg * nl.z);
        vec3 olho = normalize(cameraPosition - vW); float cosv = max(dot(olho, nn), 0.); float F = .02 + .98 * pow(1. - cosv, 5.);
        // o fundo visto através da água (areia e seixos), engolido pela profundidade
        vec2 fp = vW.xz * .45 + nn.xz * (.6 + vProf * .25); float sx = fbm(fp * 1.3), seixo = smoothstep(.55, .7, n(fp * 3.1));
        vec3 leito = mix(vec3(.46, .38, .26), vec3(.25, .23, .18), seixo) * (.7 + .5 * sx); float cau = pow(1. - abs(sin(fbm(fp * 1.7 + vec2(t * .25, -t * .4)) * 11.)), 7.); leito += vec3(1., .95, .75) * cau * .9 * exp(-vProf * 1.1) * max(dot(nn, sol), 0.);
        float caminho = vProf / max(cosv, .25); vec3 absorve = exp(-caminho * vec3(.62, .22, .30));
        vec3 profundo = vec3(.004, .035, .028);
        vec3 corpo = leito * absorve * 1.1 + profundo * (1. - absorve) + vec3(.006, .045, .028) * (1. - absorve.g) * (.6 + .5 * h0);
        // reflexo das árvores e do céu
        vec4 rr = vRef; rr.xy += nn.xz * 1.6 * rr.w * .06; vec3 ref = texture2DProj(refl, rr).rgb * vec3(.34, .46, .38);
        vec3 c = mix(corpo, ref, clamp(F * .85 + .03, 0., .75));
        float crista = smoothstep(.58, .82, h0); c += vec3(.012, .1, .065) * crista * (1. - absorve.g) * (1. + rap);
        float bri = pow(max(dot(reflect(-sol, nn), olho), 0.), 300.) * 9. + pow(max(dot(reflect(-sol, nn), olho), 0.), 24.) * .22; c += vec3(1., .88, .62) * bri;
        // espuma: nas margens rasas, em linhas que a corrente arrasta e nas pedras
        float linhas = smoothstep(.66, .82, fbm(q * vec2(1.6, .12) - vec2(0., t * 2.2))) * smoothstep(.4, 2., vProf) * .75 + smoothstep(.72, .9, h0) * .5;
        float margem = smoothstep(.35, .05, vProf) * smoothstep(.35, .7, fbm(q * vec2(3., 1.) - vec2(0., t * 1.5)));
        float pedra = 0.;
        for (int i = 0; i < 48; i++) { vec2 rel = vW.xz - pedras[i].xy; float r = pedras[i].z; if (r <= 0.) continue; float dd = length(rel); if (dd > r * 9.) continue;
          float ao = dot(rel, tg.xz), at = dot(rel, lado.xz); float anel = smoothstep(r * 1.6, r * .95, dd); float esteira = exp(-abs(at) / (r * .7)) * smoothstep(-r, 0., ao) * exp(-max(ao, 0.) / (r * 4.));
          pedra += (anel + esteira * .8) * smoothstep(.3, .65, fbm(q * vec2(4., 1.6) - vec2(0., t * 4.))); }
        float branca = rap * smoothstep(.5, .72, h0 + .25 * fbm(q * vec2(3., 1.2) - vec2(0., t * 5.))) * smoothstep(.5, 2., vProf);
        float esp = clamp(linhas + margem + pedra + branca * 1.2, 0., 1.); c = mix(c, vec3(.95, .97, .96) * (.75 + .3 * max(dot(nn, sol), 0.)), esp * .85);
        float a = smoothstep(0., .12, vProf) * smoothstep(0., .04, min(vUv.x, 1. - vUv.x)); a = max(a, esp * smoothstep(0., .05, vProf));
        float f = 1. - exp(-dens * dens * vD * vD); c = mix(c, nevoa, f);
        gl_FragColor = vec4(c, a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
      }` });
  const aguas = [];
  rios.forEach((c, i) => { const N = 700, M = 14, w = i === 0 ? 16 : 11, P = [], U = [], TG = [], PR = [], I = []; let s = 0, ant = null;
    for (let k = 0; k <= N; k++) { const u = k / N, p = c.getPointAt(u), tg = c.getTangentAt(u), lado = new THREE.Vector3(-tg.z, 0, tg.x).normalize(); if (ant) s += p.distanceTo(ant); ant = p;
      for (let j = 0; j <= M; j++) { const a = j / M, q = p.clone().addScaledVector(lado, (a * 2 - 1) * w * 1.08), y = hBase(q.x, q.z) - 1.0; P.push(q.x, y, q.z); U.push(a, s); TG.push(tg.x, 0, tg.z); PR.push(Math.max(0, y - altura(q.x, q.z))); } }
    for (let k = 0; k < N; k++) for (let j = 0; j < M; j++) { const a = k * (M + 1) + j, b = a + M + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('tg', new THREE.Float32BufferAttribute(TG, 3)); g.setAttribute('prof', new THREE.Float32BufferAttribute(PR, 1)); g.setIndex(I);
    const m = new THREE.Mesh(g, matAgua); m.renderOrder = 2; cena.add(m); aguas.push(m); lixo.push(g); });
  lixo.push(matAgua, reflRT);
  // A MARGEM: faixa de areia molhada e cascalho dos dois lados de cada braço do rio, escurecida junto à água,
  // com a espuma que avança e recua na beira; por cima, seixos e pedras meio enterrados
  const matMargem = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8, uniforms: { ...unif, sol: { value: SOL } },
    vertexShader: `attribute float m, ls; varying float vM, vS, vD; varying vec3 vW; void main(){ vM = m; vS = ls; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float t, dens; uniform vec3 nevoa, sol; varying float vM, vS, vD; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * n(p); p = p * 2.07 + 5.3; a *= .5; } return s; }
      vec3 cel(vec2 p){ vec2 i = floor(p), f = fract(p); float m1 = 9., id = 0.; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y), o = .2 + .6 * vec2(h(i + g), h(i + g + 17.)); vec2 dv = (g + o - f) * vec2(1., 1.25); float d = length(dv); if (d < m1) { m1 = d; id = h(i + g + 3.1); } } return vec3(m1, id, 0.); }
      void main(){ vec2 p = vW.xz;
        vec3 c1 = cel(p * 3.2), c2 = cel(p * 9.);
        float dsx = smoothstep(.3, .62, fbm(p * .3 + 3.)) * (1. - smoothstep(.7, 1., vM)) * .85;
        float r1 = .2 + .25 * c1.y, s1 = step(1. - dsx, fract(c1.y * 7.31)) * smoothstep(r1, r1 - .07, c1.x);
        float r2 = .15 + .2 * c2.y, s2 = step(1. - dsx * .7, fract(c2.y * 5.17)) * smoothstep(r2, r2 - .06, c2.x);
        vec3 areia = mix(vec3(.36, .31, .23), vec3(.27, .24, .19), fbm(p * .9)) * (.9 + .2 * n(p * 40.));
        vec3 pedra1 = mix(vec3(.30, .29, .26), vec3(.50, .46, .38), fract(c1.y * 13.7)) * (.8 + .4 * (1. - c1.x / max(r1, .01)));
        vec3 pedra2 = mix(vec3(.26, .24, .21), vec3(.44, .40, .33), fract(c2.y * 11.3)) * (.8 + .3 * (1. - c2.x / max(r2, .01)));
        vec3 c = mix(mix(areia, pedra2, s2), pedra1, s1); c *= mix(1., .75, smoothstep(r1 + .02, r1 - .02, c1.x) * (1. - s1) * dsx);
        // molhado junto à água: mais escuro, mais saturado, com brilho do sol
        float linha = .48 + .035 * sin(t * .9 + vS * .21) + .02 * sin(t * 1.7 + vS * .57);
        float molhado = smoothstep(linha + .22, linha - .02, vM);
        c = mix(c, c * vec3(.45, .47, .44), molhado);
        vec3 olho = normalize(cameraPosition - vW); float bri = pow(max(dot(reflect(-sol, vec3(0., 1., 0.)), olho), 0.), 40.) * molhado * .6; c += vec3(1., .9, .7) * bri;
        // espuma que avança e recua
        float esp = smoothstep(.035, .0, abs(vM - linha + .01)) * smoothstep(.35, .65, fbm(vec2(vS * .6, vM * 9.) - vec2(t * .4, 0.)));
        esp += smoothstep(.07, .0, abs(vM - linha + .05)) * .35 * smoothstep(.5, .75, fbm(vec2(vS * 1.2, t * .3)));
        c = mix(c, vec3(.92, .94, .93), clamp(esp, 0., 1.) * .8);
        float a = smoothstep(.0, .14, vM) * smoothstep(.95, .45 + .35 * fbm(p * .5), vM);
        float f = 1. - exp(-dens * dens * vD * vD); gl_FragColor = vec4(mix(c, nevoa, f), a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
      }` });
  rios.forEach((c, i) => { const w = i === 0 ? 16 : 11, N = 700, M = 6;
    for (const lado of [-1, 1]) { const P = [], MM = [], LS = [], I = []; let s = 0, ant = null;
      for (let k = 0; k <= N; k++) { const u = k / N, p = c.getPointAt(u), tg = c.getTangentAt(u), ld = new THREE.Vector3(-tg.z, 0, tg.x).normalize(); if (ant) s += p.distanceTo(ant); ant = p;
        for (let j = 0; j <= M; j++) { const m = j / M, off = w * (0.85 + m * 0.55), q = p.clone().addScaledVector(ld, lado * off); P.push(q.x, Math.max(altura(q.x, q.z), hBase(q.x, q.z) - 1.05) + 0.2, q.z); MM.push(m); LS.push(s); } }
      for (let k = 0; k < N; k++) for (let j = 0; j < M; j++) { const a = k * (M + 1) + j, b = a + M + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('m', new THREE.Float32BufferAttribute(MM, 1)); g.setAttribute('ls', new THREE.Float32BufferAttribute(LS, 1)); g.setIndex(I);
      const ms = new THREE.Mesh(g, matMargem); ms.renderOrder = 1; cena.add(ms); lixo.push(g); } });
  lixo.push(matMargem);
  { const gq = new THREE.IcosahedronGeometry(1, 2), pq = gq.attributes.position; for (let i = 0; i < pq.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pq, i), k = 1 + 0.18 * Math.sin(v.x * 4.1 + v.z * 3.3) * Math.cos(v.y * 3.7); pq.setXYZ(i, v.x * k * 1.3, v.y * k * 0.55, v.z * k); } gq.computeVertexNormals();
    const NQ = toque ? 260 : 520, mq = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), iq = new THREE.InstancedMesh(gq, mq, NQ), mt = new THREE.Matrix4(), qq = new THREE.Quaternion(); let k = 0;
    for (let tent = 0; k < NQ && tent < NQ * 6; tent++) { const ci = Math.floor(rnd() * rios.length), c = rios[ci], w = ci === 0 ? 16 : 11, u = rnd() * 0.75, p = c.getPointAt(u), tg = c.getTangentAt(u), sx = rnd() > 0.5 ? 1 : -1, d = w * (0.98 + rnd() * 0.4), x = p.x - tg.z * sx * d, z = p.z + tg.x * sx * d;
      if (Math.hypot(x, z) < 22) continue; const sc = 0.18 + Math.pow(rnd(), 2.5) * 0.9; qq.setFromEuler(new THREE.Euler(rnd() * 0.5, rnd() * 6.28, rnd() * 0.5)); mt.compose(new THREE.Vector3(x, Math.max(altura(x, z), hBase(x, z) - 1.15) - sc * 0.15, z), qq, new THREE.Vector3(sc, sc, sc)); iq.setMatrixAt(k, mt); iq.setColorAt(k, new THREE.Color().setHSL(0.09 + rnd() * 0.06, 0.1 + rnd() * 0.12, 0.3 + rnd() * 0.2)); k++; }
    iq.count = k; cena.add(iq); lixo.push(gq, mq); }
  // pedras grandes no rio (a água bate nelas e faz espuma)
  { const gp = new THREE.IcosahedronGeometry(1, 3), pp = gp.attributes.position; for (let i = 0; i < pp.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pp, i); const k = 1 + 0.22 * Math.sin(v.x * 3.1 + v.y * 2.3) * Math.cos(v.z * 2.7) + 0.08 * Math.sin(v.x * 9 + v.z * 7); pp.setXYZ(i, v.x * k * 1.25, v.y * k * 0.75, v.z * k); } gp.computeVertexNormals();
    const mp = new THREE.MeshStandardMaterial({ color: 0x6b6a5e, roughness: 0.92, metalness: 0 }); const ip = new THREE.InstancedMesh(gp, mp, NPED), mt = new THREE.Matrix4(), qq = new THREE.Quaternion();
    for (let i = 0; i < NPED; i++) { const pd = PEDRAS[i]; qq.setFromEuler(new THREE.Euler(rnd() * 0.4, rnd() * 6.28, rnd() * 0.4)); mt.compose(new THREE.Vector3(pd.x, hBase(pd.x, pd.z) - 1.0 - pd.r * 0.15, pd.z), qq, new THREE.Vector3(pd.r, pd.r * (0.7 + rnd() * 0.5), pd.r)); ip.setMatrixAt(i, mt); ip.setColorAt(i, new THREE.Color().setHSL(0.1 + rnd() * 0.08, 0.12 + rnd() * 0.1, 0.32 + rnd() * 0.12)); }
    cena.add(ip); lixo.push(gp, mp); }
  const naAgua = (x, z) => { const [d, w] = distRio(x, z); return d < w * 1.15; };
  const fundura = (x, z) => hBase(x, z) - 1.0 - altura(x, z);
  // espelho: a cena vista de baixo da superfície, para o reflexo
  function refletir() { const Y0 = hBase(camera.position.x, camera.position.z) - 1.0; if (camera.position.y - Y0 > 260) return;
    const rot = new THREE.Matrix4().extractRotation(camera.matrixWorld), cpos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
    const alvoV = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).add(cpos), upV = new THREE.Vector3(0, 1, 0).applyMatrix4(rot); upV.y = -upV.y;
    reflCam.position.set(cpos.x, 2 * Y0 - cpos.y, cpos.z); reflCam.up.copy(upV); reflCam.lookAt(alvoV.x, 2 * Y0 - alvoV.y, alvoV.z); reflCam.updateMatrixWorld(); reflCam.projectionMatrix.copy(camera.projectionMatrix);
    const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -Y0).applyMatrix4(reflCam.matrixWorldInverse); const cp = new THREE.Vector4(plano.normal.x, plano.normal.y, plano.normal.z, plano.constant);
    const pe = reflCam.projectionMatrix.elements, qv = new THREE.Vector4((Math.sign(cp.x) + pe[8]) / pe[0], (Math.sign(cp.y) + pe[9]) / pe[5], -1, (1 + pe[10]) / pe[14]);
    cp.multiplyScalar(2 / cp.dot(qv)); pe[2] = cp.x; pe[6] = cp.y; pe[10] = cp.z + 1 - 0.003; pe[14] = cp.w; reflCam.projectionMatrixInverse.copy(reflCam.projectionMatrix).invert();
    texMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(reflCam.projectionMatrix).multiply(reflCam.matrixWorldInverse);
    const ocultos = [...aguas, grama, polen, feixes].filter((o) => o && o.visible); ocultos.forEach((o) => { o.visible = false; });
    const pc = new THREE.Vector3().setFromMatrixPosition(reflCam.matrixWorld); if (ceu) ceu.position.copy(pc); solDisco.position.copy(pc).addScaledVector(SOL, 1300);
    renderer.setRenderTarget(reflRT); renderer.render(cena, reflCam); ocultos.forEach((o) => { o.visible = true; });
    if (ceu) ceu.position.copy(camera.position); solDisco.position.copy(camera.position).addScaledVector(SOL, 1300); }

  // GRAMA ALTA que balança ao vento em volta de quem anda
  const NG = toque ? 70000 : 150000, RG = 30;
  // lâmina fina, afinando até a ponta, em 5 gomos (para poder curvar)
  const lamina = new THREE.PlaneGeometry(0.035, 1, 1, 5); lamina.translate(0, 0.5, 0);
  { const p = lamina.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - Math.pow(y, 1.6) * 0.96)); } }
  const matGrama = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { ...unif, centro: { value: new THREE.Vector2() }, sol: { value: SOL } },
    vertexShader: `uniform float t; uniform vec2 centro; attribute vec3 iOff; attribute float iRot, iEsc; varying float vY, vD, vFl, vX, vTr; varying vec3 vC, vFc; uniform sampler2D alt; uniform vec3 sol;
      void main(){ vec2 rel = mod(iOff.xz - centro + ${RG}.0, ${(RG * 2).toFixed(1)}) - ${RG}.0; vec2 xz = centro + rel; float dist = length(rel);
        float esc = iEsc * smoothstep(${RG}.0, ${(RG * 0.55).toFixed(1)}, dist); float ts = dot(xz, vec2(-.6, -.8)), tl = dot(xz, vec2(.8, -.6)); if (ts > 12. && ts < 170.) esc *= smoothstep(.55, 1.25, abs(tl - 2.5 * sin(ts / 13.)));
        float r2 = fract(iRot * 7.13), r3 = fract(iEsc * 13.7 + iOff.y * 3.1);
        float y = position.y; float altL = esc * (.18 + .42 * r3 * r3 + .12 * iOff.y);   // alturas variadas: muitas baixas, algumas altas
        // curva natural da lâmina (cai para um lado) e vento que vem em ondas pelo campo
        float curva = (.25 + .5 * r2) * y * y; vec3 p = vec3(position.x * (.7 + .6 * r3), y * altL, curva * altL * .9);
        float c = cos(iRot), s = sin(iRot); p = vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
        float onda = sin(t * 1.3 - xz.x * .11 - xz.y * .07) * .5 + .5; float vento = (onda * .7 + sin(t * 3.7 + xz.x * .9 + xz.y * .6) * .12) * y * y * altL;
        p.x += vento * .55; p.z += vento * .25; p.y -= vento * vento * .6;
        vY = y; vX = position.x / .035 + .5;
        vec3 verde = mix(vec3(.10, .24, .05), vec3(.20, .36, .07), iOff.y), amarelo = vec3(.42, .45, .14), seco = vec3(.40, .34, .17);
        vC = mix(verde, amarelo, r2 * r2 * .4); vC = mix(vC, seco, step(.93, r3) * .7);
        vFl = step(.965, iOff.y) * step(.82, y); vFc = iOff.y > .99 ? vec3(1.2, 1.15, 1.05) : iOff.y > .978 ? vec3(1.3, .95, .2) : vec3(1.1, .3, .45);
        vTr = pow(max(dot(normalize(vec3(xz.x, cameraPosition.y - 1.2, xz.y) - cameraPosition), sol), 0.), 3.);
        vec4 mv = viewMatrix * vec4(p + vec3(xz.x, 0., xz.y), 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float dens; uniform vec3 nevoa, sol; varying float vY, vD, vFl, vX, vTr; varying vec3 vC, vFc;
      void main(){ float base = smoothstep(.0, .55, vY);   // sombra na base, onde a luz não chega
        float meio = 1. - abs(vX * 2. - 1.); vec3 c = vC * (.28 + .9 * base) * (.8 + .3 * meio);
        c += vec3(.10, .16, .02) * pow(vY, 3.) * .5;   // ponta mais clara, a luz atravessa
        c += vec3(.10, .18, .03) * vTr * vY;
        c = mix(c, vFc, vFl); float f = 1. - exp(-dens * dens * vD * vD); gl_FragColor = vec4(mix(c, nevoa, f), 1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
      }` });
  // a altura do chão de cada lâmina é calculada na CPU e guardada; a lâmina "anda" junto com quem caminha
  const gramaGeo = new THREE.InstancedBufferGeometry(); gramaGeo.index = lamina.index; gramaGeo.attributes.position = lamina.attributes.position; gramaGeo.instanceCount = NG;
  const off = new Float32Array(NG * 3), rot = new Float32Array(NG), esc = new Float32Array(NG);
  for (let i = 0; i < NG; i++) { off[i * 3] = (Math.random() * 2 - 1) * RG; off[i * 3 + 1] = Math.random(); off[i * 3 + 2] = (Math.random() * 2 - 1) * RG; rot[i] = Math.random() * 6.28; esc[i] = 0.6 + Math.random() * 0.8; }
  gramaGeo.setAttribute('iOff', new THREE.InstancedBufferAttribute(off, 3)); gramaGeo.setAttribute('iRot', new THREE.InstancedBufferAttribute(rot, 1)); gramaGeo.setAttribute('iEsc', new THREE.InstancedBufferAttribute(esc, 1));
  // para a lâmina ficar no chão, o shader precisa da altura: usamos uma textura de altura do terreno
  const altH = new Uint16Array(alturas.length * 2); for (let i = 0; i < alturas.length; i++) { altH[i * 2] = THREE.DataUtils.toHalfFloat(alturas[i]); altH[i * 2 + 1] = THREE.DataUtils.toHalfFloat(Math.min(8, relRio[i])); }
  const altTex = new THREE.DataTexture(altH, NS + 1, NS + 1, THREE.RGFormat, THREE.HalfFloatType); altTex.minFilter = altTex.magFilter = THREE.LinearFilter; altTex.needsUpdate = true;
  matGrama.uniforms.alt = { value: altTex };
  matGrama.vertexShader = matGrama.vertexShader.replace('vec4 mv = viewMatrix * vec4(p + vec3(xz.x, 0., xz.y), 1.);', `vec2 uvA = (xz + ${(T / 2).toFixed(1)}) / ${T.toFixed(1)}; vec2 tA = texture2D(alt, uvA).rg; float hA = tA.r; p.y *= smoothstep(1.3, 1.75, tA.g); vec4 mv = viewMatrix * vec4(p + vec3(xz.x, hA, xz.y), 1.);`);
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
  const obst = [];   // troncos: o explorador não atravessa
  async function figuras(nome, lista, alturaReal, vento = 0) {
    const pc = pecas[nome]; if (!pc || !lista.length) return null; const tex = await carregar(nome + '.png'); if (!tex) return null; lixo.push(tex);
    const asp = pc.w / pc.h, g = new THREE.InstancedBufferGeometry(); g.index = quad.index; g.attributes.position = quad.attributes.position; g.attributes.uv = quad.attributes.uv; g.instanceCount = lista.length;
    const P = new Float32Array(lista.length * 3), S = new Float32Array(lista.length * 2), F = new Float32Array(lista.length), R = new Float32Array(lista.length);
    lista.forEach((o, i) => { const hR = alturaReal * (o.s || 1); P.set([o.x, altura(o.x, o.z) - 0.15 + (o.y || 0), o.z], i * 3); S.set([hR * asp, hR], i * 2); F[i] = Math.random() * 6.28; R[i] = o.vira ? 1 : 0; });
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute('iTam', new THREE.InstancedBufferAttribute(S, 2)); g.setAttribute('iFase', new THREE.InstancedBufferAttribute(F, 1)); g.setAttribute('iVira', new THREE.InstancedBufferAttribute(R, 1));
    if (/arvore|palmeira/.test(nome)) lista.forEach((o) => obst.push({ x: o.x, z: o.z, r: 0.35 + alturaReal * (o.s || 1) * 0.045 }));
    const m = new THREE.Mesh(g, matFig(tex, vento)); m.frustumCulled = false; cena.add(m); lixo.push(g, m.material); return { m, P, R, g };
  }
  // espalha posições evitando a água e o caminho de chegada
  function espalhar(n, rMin, rMax, folga = 6, evitar = []) { const out = []; let tent = 0;
    while (out.length < n && tent++ < n * 40) { const a = rnd() * 6.283, r = Math.sqrt(rMin * rMin + rnd() * (rMax * rMax - rMin * rMin)), x = Math.cos(a) * r, z = Math.sin(a) * r;
      const [d, w] = distRio(x, z); if (d < w + folga) continue; { const tt = W2T(x, z); if (Math.abs(tt.lado - 2.5 * Math.sin(tt.s / 13)) < 7 && tt.s > 8 && tt.s < 172) continue; } if (evitar.some((e) => Math.hypot(e.x - x, e.z - z) < e.r)) continue; out.push({ x, z, s: 0.75 + rnd() * 0.5, vira: rnd() > 0.5 }); }
    return out; }
  const centroArv = { x: 0, z: 0, r: 26 };
  await Promise.all([
    figuras('arvore-vida', [{ x: 0, z: 0, s: 1 }], 34, 0.5),
    figuras('arvore-fruto-1', espalhar(toque ? 150 : 240, 30, 520, 7, [centroArv]), 15, 1),
    figuras('arvore-fruto-2', espalhar(toque ? 120 : 200, 30, 520, 7, [centroArv]), 12, 1),
    figuras('palmeira', rios.flatMap((c) => Array.from({ length: 26 }, (_, k) => { const u = (k + 0.5) / 26, p = c.getPointAt(u), tg = c.getTangentAt(u), sx = k % 2 ? 1 : -1, d = (c === rios[0] ? 16 : 11) + 6 + rnd() * 10; return { x: p.x - tg.z * sx * d, z: p.z + tg.x * sx * d, s: 0.8 + rnd() * 0.4, vira: rnd() > 0.5 }; })).filter((o) => Math.hypot(o.x, o.z) > 24 && !naAgua(o.x, o.z)), 14, 0.8),
    figuras('arbusto-flores', espalhar(toque ? 260 : 420, 10, 400, 3.5, [centroArv]), 1.6, 0.6),
    // A MATA FECHADA, em camadas: gigantes que furam a copa, árvores altas, palmeiras, bambus, samambaias e folhagens no chão
    figuras('mata-sumauma', espalhar(toque ? 40 : 70, 45, 560, 12, [centroArv]), 46, 0.35),
    figuras('mata-arvore-alta', espalhar(toque ? 200 : 340, 28, 560, 8, [centroArv]), 26, 0.6),
    figuras('mata-palmeira-acai', espalhar(toque ? 160 : 260, 18, 450, 5, [centroArv]), 13, 0.9),
    figuras('mata-bambu', rios.flatMap((c) => Array.from({ length: 22 }, (_, k) => { const u = (k + rnd()) / 22, p = c.getPointAt(u), tg = c.getTangentAt(u), sx = rnd() > 0.5 ? 1 : -1, d = (c === rios[0] ? 16 : 11) + 4 + rnd() * 8; return { x: p.x - tg.z * sx * d, z: p.z + tg.x * sx * d, s: 0.8 + rnd() * 0.5, vira: rnd() > 0.5 }; })).filter((o) => Math.hypot(o.x, o.z) > 26 && !naAgua(o.x, o.z) && !(Math.abs(o.x) < 7 && o.z > 8 && o.z < 150)), 11, 0.9),
    figuras('mata-samambaia', espalhar(toque ? 320 : 560, 12, 320, 3, [centroArv]), 5, 0.8),
    figuras('mata-folhagem', espalhar(toque ? 600 : 1000, 6, 260, 2.2, [centroArv]), 2.3, 0.7),
    figuras('mata-heliconia', espalhar(toque ? 300 : 520, 6, 260, 2.2, [centroArv]), 2.1, 0.7),
    figuras('mata-arbusto', espalhar(toque ? 400 : 700, 5, 300, 2, [centroArv]), 1.4, 0.6),
  ]);

  // TRILHA de terra batida que leva até a árvore da vida
  const trilhaX = (z) => 2.5 * Math.sin(z / 13);
  { const P = [], U = [], I = []; let k = 0; for (let z = 170; z >= 12; z -= 0.8) { const x = trilhaX(z); for (const sx of [-1, 1]) { const w = T2W(x + sx * 0.95, z); P.push(w.x, altura(w.x, w.z) + 0.05, w.z); U.push(sx < 0 ? 0 : 1, z / 3); } if (k) { const a = (k - 1) * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } k++; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I);
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, uniforms: unif,
      vertexShader: `varying vec2 vUv; varying float vD; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float dens; uniform vec3 nevoa; varying vec2 vUv; varying float vD; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){ vec2 p = vec2(vUv.x * 2., vUv.y * 3.); float k = n(p * 3.) * .5 + n(p * 9.) * .3 + n(p * 27.) * .2; vec3 c = mix(vec3(.30, .22, .14), vec3(.52, .41, .28), k); c *= .85 + .3 * step(.78, n(p * 14.));
          float a = smoothstep(0., .28 + .15 * n(p * 4.), vUv.x) * smoothstep(1., .72 - .15 * n(p * 4. + 7.), vUv.x); float f = 1. - exp(-dens * dens * vD * vD); gl_FragColor = vec4(mix(c, nevoa, f), a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
        }` });
    const tr = new THREE.Mesh(g, m); tr.renderOrder = 1; cena.add(tr); lixo.push(g, m); }
  // árvores frutíferas grandes dos dois lados da trilha, emoldurando o caminho
  const moldura = []; for (let z = 30; z < 165; z += 13) { const x = trilhaX(z); for (const sx of [-1, 1]) { const w = T2W(x + sx * (6 + rnd() * 3), z + rnd() * 6), xx = w.x, zz = w.z; if (!naAgua(xx, zz)) moldura.push({ x: xx, z: zz, s: 0.9 + rnd() * 0.35, vira: rnd() > 0.5 }); } }
  await Promise.all([figuras('arvore-fruto-1', moldura.filter((_, i) => i % 2 === 0), 15, 1), figuras('arvore-fruto-2', moldura.filter((_, i) => i % 2 === 1), 12, 1)]);
  // FLORES em camadas: à beira da trilha (perto e grandes), nas margens do rio e espalhadas; árvores floridas, romãzeiras e videiras
  const beiraTrilha = (n, a0, a1) => Array.from({ length: n }, () => { const z = 14 + rnd() * 155, sx = rnd() > 0.5 ? 1 : -1, w = T2W(trilhaX(z) + sx * (a0 + rnd() * (a1 - a0)), z); return { x: w.x, z: w.z, s: 0.7 + rnd() * 0.6, vira: rnd() > 0.5 }; }).filter((o) => !naAgua(o.x, o.z));
  const beiraRio = (n) => Array.from({ length: n }, () => { const ci = Math.floor(rnd() * rios.length), c = rios[ci], w = ci === 0 ? 16 : 11, u = rnd() * 0.7, p = c.getPointAt(u), tg = c.getTangentAt(u), sx = rnd() > 0.5 ? 1 : -1, d = w * (1.42 + rnd() * 0.5); return { x: p.x - tg.z * sx * d, z: p.z + tg.x * sx * d, s: 0.7 + rnd() * 0.6, vira: rnd() > 0.5 }; }).filter((o) => Math.hypot(o.x, o.z) > 24);
  const flores = [['flor-lirios', 1.1, 1], ['flor-hibisco', 1.7, 0.4], ['flor-roxa', 1.0, 1], ['flor-ave-paraiso', 1.5, 0.7], ['flor-rosa', 0.8, 1.2]];
  await Promise.all([
    ...flores.map(([nm, h, q]) => figuras(nm, [...beiraTrilha(Math.round((toque ? 40 : 70) * q), 1.25, 4.5), ...beiraRio(Math.round((toque ? 50 : 90) * q)), ...espalhar(Math.round((toque ? 40 : 80) * q), 8, 220, 2, [centroArv])], h, 0.5)),
    figuras('arvore-florida', espalhar(toque ? 30 : 55, 25, 420, 6, [centroArv]), 11, 0.8),
    figuras('romazeira', [...beiraTrilha(toque ? 8 : 14, 5, 9), ...espalhar(toque ? 15 : 30, 20, 300, 4, [centroArv])], 5.5, 0.7),
    figuras('videira', [...beiraTrilha(toque ? 8 : 14, 4.5, 8), ...espalhar(toque ? 12 : 24, 20, 260, 4, [centroArv])], 4.2, 0.5),
  ]);
  // FEIXES DE SOL atravessando a copa (raios de luz no ar úmido), sempre em volta de quem anda
  const NF = toque ? 18 : 30, gF = new THREE.InstancedBufferGeometry(), qF = new THREE.PlaneGeometry(1, 1); qF.translate(0, 0.5, 0); gF.index = qF.index; gF.attributes.position = qF.attributes.position; gF.attributes.uv = qF.attributes.uv; gF.instanceCount = NF;
  const iF = new Float32Array(NF * 4); for (let i = 0; i < NF; i++) iF.set([(rnd() * 2 - 1) * 45, (rnd() * 2 - 1) * 45, 1.5 + rnd() * 3.5, rnd() * 100], i * 4); gF.setAttribute('iF', new THREE.InstancedBufferAttribute(iF, 4));
  const matF = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { ...unif, sol: { value: SOL }, centro: { value: new THREE.Vector3() } },
    vertexShader: `uniform vec3 sol, centro; uniform float t; attribute vec4 iF; varying vec2 vUv; varying float vA;
      void main(){ vUv = uv; vec3 base = vec3(mod(iF.x - centro.x + 45., 90.) - 45. + centro.x, centro.y - 1., mod(iF.y - centro.z + 45., 90.) - 45. + centro.z);
        vec3 ax = normalize(sol); vec3 vd = normalize(cameraPosition - base); vec3 lado = normalize(cross(ax, vd)); float L = 38.;
        vec3 w = base + ax * position.y * L + lado * position.x * iF.z; vec4 mv = viewMatrix * vec4(w, 1.); float d = -mv.z;
        vA = smoothstep(3., 14., d) * smoothstep(80., 40., d) * (.6 + .4 * sin(t * .35 + iF.w)); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec2 vUv; varying float vA; void main(){ float x = 1. - abs(vUv.x * 2. - 1.); float a = x * x * smoothstep(0., .25, vUv.y) * smoothstep(1., .45, vUv.y) * vA * .11; gl_FragColor = vec4(vec3(1.6, 1.3, .8) * a, a); }` });
  const feixes = new THREE.Mesh(gF, matF); feixes.frustumCulled = false; cena.add(feixes); lixo.push(gF, qF, matF);

  // ANIMAIS que andam devagar pelo jardim (o leão descansa)
  const especies = [
    { n: 'leao', h: 1.15, q: 3, anda: 0 }, { n: 'cordeiro', h: 0.85, q: 6, anda: 0.5 }, { n: 'cervo', h: 1.75, q: 5, anda: 0.9 },
    { n: 'elefante', h: 3.2, q: 3, anda: 0.6 }, { n: 'girafa', h: 5.2, q: 3, anda: 0.7 }, { n: 'pavao', h: 1.1, q: 4, anda: 0.4 },
    { n: 'onca', h: 0.95, q: 3, anda: 0.8 }, { n: 'anta', h: 1.1, q: 3, anda: 0.5 }, { n: 'capivara', h: 0.62, q: 10, anda: 0.35, rio: true },
  ];
  const bichos = [];
  const PERTO = { leao: [-10, 46], cordeiro: [-6, 44], cervo: [13, 40], elefante: [-26, 22], girafa: [24, 24], pavao: [5, 53], onca: [-16, 58], anta: [18, 60] };   // um grupo à vista de quem pousa
  const margem = (n) => rios.flatMap((c) => Array.from({ length: n }, () => { const u = 0.05 + rnd() * 0.5, p = c.getPointAt(u), tg = c.getTangentAt(u), sx = rnd() > 0.5 ? 1 : -1, d = (c === rios[0] ? 16 : 11) + 2 + rnd() * 4; return { x: p.x - tg.z * sx * d, z: p.z + tg.x * sx * d, s: 0.85 + rnd() * 0.3 }; })).filter((o) => !naAgua(o.x, o.z) && Math.hypot(o.x, o.z) < 190);
  for (const e of especies) { const lista = e.rio ? margem(3).slice(0, e.q - 1) : espalhar(e.q - 1, 22, 150, 5, [{ x: 0, z: 0, r: 18 }]); const pp0 = PERTO[e.n], pw = pp0 ? T2W(pp0[0], pp0[1]) : null, pp = pw ? [pw.x, pw.z] : null; if (pp && !naAgua(pp[0], pp[1])) lista.unshift({ x: pp[0], z: pp[1], s: 1, vira: e.n === 'leao' }); else lista.push(...espalhar(1, 22, 150, 5, [{ x: 0, z: 0, r: 18 }])); const f = await figuras(e.n, lista, e.h, 0); if (!f) continue;
    lista.forEach((o, i) => bichos.push({ f, i, e, x: o.x, z: o.z, alvo: null, espera: rnd() * 6, fase: rnd() * 6 })); }
  function moverBichos(dt) { for (const b of bichos) { if (!b.e.anda) continue;
      if (!b.alvo) { b.espera -= dt; if (b.espera <= 0) { const a = rnd() * 6.283, r = b.e.rio ? 3 + rnd() * 6 : 8 + rnd() * 25; let x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r; if (b.e.rio && distRio(x, z)[0] > 18) { b.espera = 2; continue; } const rr = Math.hypot(x, z); if (rr > 200) { x *= 180 / rr; z *= 180 / rr; } if (!naAgua(x, z)) b.alvo = { x, z }; else b.espera = 1; } continue; }
      const dx = b.alvo.x - b.x, dz = b.alvo.z - b.z, d = Math.hypot(dx, dz); if (d < 0.5) { b.alvo = null; b.espera = 3 + rnd() * 8; continue; }
      const v = b.e.anda * dt; b.x += dx / d * v; b.z += dz / d * v;
      // vira a figura conforme o lado para onde anda (em relação a quem olha)
      const dirX = new THREE.Vector3().subVectors(camera.position, new THREE.Vector3(b.x, 0, b.z)); const ladoX = new THREE.Vector3(dirX.z, 0, -dirX.x).normalize(); const vaiDireita = (dx * ladoX.x + dz * ladoX.z) > 0;
      b.f.R[b.i] = vaiDireita === !!b.e.olhaEsq ? 1 : 0; b.f.g.attributes.iVira.needsUpdate = true;
      b.f.P[b.i * 3] = b.x; b.f.P[b.i * 3 + 1] = altura(b.x, b.z) - 0.1 + Math.sin(b.fase += dt * b.e.anda * 2.6) * 0.006 * b.e.h; b.f.P[b.i * 3 + 2] = b.z; b.f.g.attributes.iPos.needsUpdate = true; } }

  // AVES em voo circular e BORBOLETAS perto das flores: tudo calculado na placa de vídeo
  async function voadores(nome, n, tam, modo) {
    const tex = await carregar(nome + '.png'); if (!tex) return; lixo.push(tex);
    const g = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(1, 1); g.index = q.index; g.attributes.position = q.attributes.position; g.attributes.uv = q.attributes.uv; g.instanceCount = n; lixo.push(q);
    const C = new Float32Array(n * 4); const bandos = Array.from({ length: 8 }, () => [(rnd() * 2 - 1) * 120, 14 + rnd() * 22, (rnd() * 2 - 1) * 120, rnd() * 100]);
    for (let i = 0; i < n; i++) { if (modo === 2) { const b = bandos[i % 8]; C.set([b[0] + (rnd() - 0.5) * 8, b[1] + (rnd() - 0.5) * 4, b[2] + (rnd() - 0.5) * 8, b[3] + rnd() * 0.25], i * 4); continue; } const a = rnd() * 6.283, r = modo ? 10 + rnd() * 140 : rnd() * 160; C.set([Math.cos(a) * r, modo ? 0 : 18 + rnd() * 45, Math.sin(a) * r, rnd() * 100], i * 4); if (modo) C[i * 4 + 1] = altura(C[i * 4], C[i * 4 + 2]); }
    g.setAttribute('iC', new THREE.InstancedBufferAttribute(C, 4));
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: false, side: THREE.DoubleSide, uniforms: { ...unif, map: { value: tex } },
      vertexShader: `uniform float t; attribute vec4 iC; varying vec2 vUv; varying float vD;
        void main(){ vUv = uv; float f = iC.w; vec3 c; vec3 vel = vec3(0.);
          ${modo === 2 ? `float fb = floor(f); float r = 40. + mod(fb, 5.) * 12.; float wv = .16 + mod(fb, 3.) * .03; float ang = t * wv + f; c = vec3(iC.x + cos(ang) * r, iC.y + sin(t * .5 + fb) * 3., iC.z + sin(ang) * r); vel = vec3(-sin(ang), 0., cos(ang));` : modo ? `c = iC.xyz + vec3(sin(t*.7+f)*3. + sin(t*1.9+f*2.)*1.2, 1.1 + sin(t*1.3+f)*.6 + sin(t*3.7+f)*.2, cos(t*.6+f*1.3)*3. + cos(t*2.3+f)*1.);` : `float r = 30. + mod(f, 7.) * 9.; float wv = .12 + mod(f, 3.) * .03; c = vec3(iC.x + cos(t*wv + f) * r, iC.y + sin(t*.4+f)*4., iC.z + sin(t*wv + f) * r);`}
          float bate = abs(sin(t * ${modo === 1 ? '14.' : modo === 2 ? '7.' : '5.'} + f * 3.)); float esc = ${tam.toFixed(2)};
          vec3 dX = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); vec3 dY = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          ${modo === 2 ? `if (dot(vel, dX) < 0.) vUv.x = 1. - vUv.x; vec3 w = c + dX * position.x * esc + dY * position.y * esc * (.55 + .45 * bate);` : `vec3 w = c + dX * position.x * esc * (.25 + .75 * bate) + dY * position.y * esc;`}
          vec4 mv = viewMatrix * vec4(w, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; uniform float dens; uniform vec3 nevoa; varying vec2 vUv; varying float vD;
        void main(){ vec4 c = texture2D(map, vUv); if (c.a < .5) discard; float f = 1. - exp(-dens * dens * vD * vD); gl_FragColor = vec4(mix(c.rgb, nevoa, f), 1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
        }` }));
    m.frustumCulled = false; cena.add(m); lixo.push(g, m.material);
  }
  await Promise.all([voadores('passaro', toque ? 24 : 40, 1.6, 0), voadores('borboleta', toque ? 90 : 160, 0.22, 1), voadores('arara-vermelha', toque ? 24 : 40, 1.3, 2), voadores('arara-azul', toque ? 24 : 40, 1.3, 2)]);

  // NAS ÁRVORES: tucanos, macacos e preguiças nos galhos
  const nosGalhos = (n, yMin, yMax) => espalhar(n, 14, 140, 4, [centroArv]).map((o) => ({ ...o, y: yMin + rnd() * (yMax - yMin) }));
  await Promise.all([figuras('tucano', nosGalhos(toque ? 14 : 24, 3, 9), 0.75, 0.2), figuras('macaco', nosGalhos(toque ? 10 : 18, 2, 7), 0.7, 0.2), figuras('preguica', nosGalhos(toque ? 6 : 10, 4, 10), 1.3, 0.3)]);

  // VITÓRIAS-RÉGIAS nas margens mansas do rio
  const vrTex = await carregar('vitoria-regia.png');
  if (vrTex) { lixo.push(vrTex); const NV = toque ? 120 : 220, gv = new THREE.PlaneGeometry(1, 1); gv.rotateX(-Math.PI / 2); const mv = new THREE.MeshLambertMaterial({ map: vrTex, alphaTest: 0.5, transparent: false });
    const im = new THREE.InstancedMesh(gv, mv, NV), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Vector3(); let k = 0;
    for (let tent = 0; k < NV && tent < NV * 30; tent++) { const c = rios[Math.floor(rnd() * rios.length)], u = rnd() * 0.6, p = c.getPointAt(u), tg = c.getTangentAt(u), w = c === rios[0] ? 16 : 11, sx = rnd() > 0.5 ? 1 : -1, d = w * (0.75 + rnd() * 0.25);
      const x = p.x - tg.z * sx * d, z = p.z + tg.x * sx * d; if (Math.hypot(x, z) < 20) continue; const sc = 1.4 + rnd() * 1.4; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28); mt.compose(e.set(x, hBase(x, z) - 0.96, z), q, new THREE.Vector3(sc, 1, sc)); im.setMatrixAt(k++, mt); }
    im.count = k; im.renderOrder = 3; cena.add(im); lixo.push(gv, mv); }

  // CACHOEIRAS nas encostas ao redor do jardim, com a água descendo
  if (pecas.cachoeira) { const f = await figuras('cachoeira', Array.from({ length: 7 }, (_, i) => { const a = i / 7 * 6.283 + 0.4, rr = 470 + rnd() * 60; return { x: Math.cos(a) * rr, z: Math.sin(a) * rr, s: 0.8 + rnd() * 0.4 }; }), 70, 0);
    if (f) { const tx = f.m.material.uniforms.map.value; tx.wrapT = THREE.RepeatWrapping; tx.needsUpdate = true; f.m.material.fragmentShader = f.m.material.fragmentShader.replace('vec4 c = texture2D(map, vUv);', 'vec4 c = texture2D(map, vUv); float lum = dot(c.rgb, vec3(.33)); float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); float ag = smoothstep(.62, .8, lum) * smoothstep(.22, .08, sat); vec3 c2 = texture2D(map, vec2(vUv.x, fract(vUv.y + t * .35))).rgb; c.rgb = mix(c.rgb, max(c.rgb, c2) * 1.05, ag * .7);').replace('uniform sampler2D map;', 'uniform sampler2D map; uniform float t;'); f.m.material.needsUpdate = true; } }

  // PÓLEN dourado flutuando no ar à volta de quem anda (aparece nos feixes de luz)
  const NPo = toque ? 1500 : 3000, pPo = new Float32Array(NPo * 3); for (let i = 0; i < NPo; i++) pPo.set([(rnd() * 2 - 1) * 40, rnd() * 14, (rnd() * 2 - 1) * 40], i * 3);
  const gPo = new THREE.BufferGeometry(); gPo.setAttribute('position', new THREE.BufferAttribute(pPo, 3));
  const matPo = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { ...unif, centro: { value: new THREE.Vector3() } },
    vertexShader: `uniform float t; uniform vec3 centro; varying float vA; void main(){ vec3 p = position; float f = p.x * 1.7 + p.z * 2.3;
      p.x += sin(t * .23 + f) * 2.; p.z += cos(t * .19 + f * 1.3) * 2.; p.y = mod(p.y + t * .15 * (.5 + fract(f)), 14.);
      vec3 w = vec3(mod(p.x - centro.x + 40., 80.) - 40. + centro.x, centro.y + p.y - 2., mod(p.z - centro.z + 40., 80.) - 40. + centro.z);
      vec4 mv = viewMatrix * vec4(w, 1.); float d = -mv.z; vA = smoothstep(40., 8., d) * (.5 + .5 * sin(t * 2. + f * 9.)); gl_PointSize = clamp(90. / d, 1., 6.); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d) * vA; gl_FragColor = vec4(vec3(1.6, 1.3, .7) * a, a); }` });
  const polen = new THREE.Points(gPo, matPo); polen.frustumCulled = false; cena.add(polen); lixo.push(gPo, matPo);
  // sombras macias sob as copas
  { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    const ts = new THREE.CanvasTexture(c), gs = new THREE.PlaneGeometry(1, 1); gs.rotateX(-Math.PI / 2); const ms = new THREE.MeshBasicMaterial({ map: ts, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, fog: true });
    const ims = new THREE.InstancedMesh(gs, ms, obst.length), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3();
    obst.forEach((o, i) => { const sc = Math.max(3, o.r * 9); mt.compose(v.set(o.x + SOL.x * -sc * 0.25, altura(o.x, o.z) + 0.06, o.z + SOL.z * -sc * 0.25), q, new THREE.Vector3(sc, 1, sc)); ims.setMatrixAt(i, mt); });
    ims.renderOrder = 1; cena.add(ims); lixo.push(ts, gs, ms); }
  // o sol (forte, para nascerem os feixes de luz entre as copas)
  const solDisco = new THREE.Mesh(new THREE.SphereGeometry(28, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 7.2, 4.5), fog: false })); cena.add(solDisco); lixo.push(solDisco.geometry, solDisco.material);

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

  // O EXPLORADOR (terceira pessoa): imagem do ChatGPT -> malha 3D (Hunyuan3D-2); a roupa é projetada das fotos de frente e de costas,
  // e o passo (pernas e braços) é feito no próprio desenho da malha
  let avatar = null, matAv = null, modo = 'primeira', rumo = Math.atan2(0.6, 0.8), fasePasso = 0;
  try {
    const resp = (pecas.explorador && new URLSearchParams(location.search).has('explorador')) ? await fetch(base + 'explorador.malha?v=1') : null;
    if (resp && resp.ok) {
      const buf = await resp.arrayBuffer(), [nv, ni] = new Uint32Array(buf, 0, 2);
      const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, 8, nv * 3), 3)); gm.setIndex(new THREE.BufferAttribute(new Uint32Array(buf, 8 + nv * 12, ni), 1)); gm.computeVertexNormals(); lixo.push(gm);
      const modelo = new THREE.Group(); modelo.add(new THREE.Mesh(gm)); modelo.updateMatrixWorld(true);
      const cx = new THREE.Box3().setFromObject(modelo), tam = cx.getSize(new THREE.Vector3());
      const [tf, tc] = await Promise.all([carregar('explorador-frente.png'), carregar('explorador-costas.png')]); lixo.push(tf, tc);
      matAv = new THREE.ShaderMaterial({ uniforms: { ...unif, fr: { value: tf }, co: { value: tc }, bmin: { value: cx.min }, bmax: { value: cx.max }, fase: { value: 0 }, amp: { value: 0 }, sol: { value: SOL }, frenteZ: { value: pecas.explorador.frenteZ ?? 1 } },
        vertexShader: `uniform vec3 bmin, bmax; uniform float fase, amp; varying vec2 vUv; varying vec3 vN, vON; varying float vD;
          void main(){ vec3 p = position; vec3 tam = bmax - bmin; float hy = (p.y - bmin.y) / tam.y; float ux = (p.x - bmin.x) / tam.x; vUv = vec2(ux, hy); vON = normal;
            float lado = sign(ux - .5); float perna = smoothstep(.48, .02, hy) * smoothstep(.0, .06, abs(ux - .5));
            p.z += sin(fase) * lado * perna * amp * tam.y * .16; p.y += max(0., sin(fase * 2.)) * amp * tam.y * .012;
            float braco = smoothstep(.45, .58, hy) * smoothstep(.82, .7, hy) * smoothstep(.2, .32, abs(ux - .5)); p.z -= sin(fase) * lado * braco * amp * tam.y * .08;
            vN = normalize(mat3(modelMatrix) * normal); vec4 mv = modelViewMatrix * vec4(p, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform sampler2D fr, co; uniform vec3 sol, nevoa; uniform float dens, frenteZ; varying vec2 vUv; varying vec3 vN, vON; varying float vD;
          void main(){ vec4 a = texture2D(fr, vUv), b = texture2D(co, vec2(1. - vUv.x, vUv.y)); vec3 manto = vec3(.42,.33,.22);
            vec3 ca = mix(manto, a.rgb, step(.5, a.a)), cb = mix(manto, b.rgb, step(.5, b.a)); float k = smoothstep(-.25, .25, vON.z * frenteZ);
            vec3 c = mix(cb, ca, k) * (.62 + .55 * max(dot(normalize(vN), sol), 0.)); float f = 1. - exp(-dens * dens * vD * vD); gl_FragColor = vec4(mix(c, nevoa, f), 1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
          }` });
      modelo.traverse((o) => { if (o.isMesh) { o.material = matAv; if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals(); o.frustumCulled = false; } });
      const esc = 1.75 / tam.y; const piv = new THREE.Group(); modelo.scale.multiplyScalar(esc); modelo.position.set(-(cx.min.x + tam.x / 2) * esc, -cx.min.y * esc, -(cx.min.z + tam.z / 2) * esc); piv.add(modelo);
      avatar = piv; cena.add(avatar); lixo.push(matAv);
    }
  } catch (e) { console.warn('explorador', e); avatar = null; }
  if (!avatar) modo = 'primeira'; else modo = 'terceira';
  const btModo = raiz.querySelector('.ej-modo'); btModo.style.display = avatar ? '' : 'none';
  btModo.onclick = () => { modo = modo === 'terceira' ? 'primeira' : 'terceira'; btModo.textContent = modo === 'terceira' ? '👁 Primeira pessoa' : '🎥 Terceira pessoa'; if (modo === 'terceira') pitch = -0.12; camIni = false; };
  const camPos = new THREE.Vector3(), olhoAlvo = new THREE.Vector3(); let camIni = false;

  // CÂMERA e CONTROLES
  let yaw = Math.atan2(-0.6, -0.8), pitch = -0.05, voando = chegada; const eu = VT(2.5 * Math.sin(70 / 13), 70); const vel = new THREE.Vector3();
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
    const agua = ruido(), fA = ctx.createBiquadFilter(); fA.type = 'bandpass'; fA.frequency.value = 650; fA.Q.value = 0.5; const gA = ctx.createGain(); gA.gain.value = 0; agua.connect(fA).connect(gA).connect(ctx.destination);
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

  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: toque ? 0 : 4, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const posCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), posCena = new THREE.Scene();
  const matPos = new THREE.ShaderMaterial({ toneMapped: false, depthTest: false, depthWrite: false, uniforms: { cena: { value: rt.texture }, solTela: { value: new THREE.Vector2(0.5, 0.8) }, solVis: { value: 0 }, asp: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform sampler2D cena; uniform vec2 solTela; uniform float solVis, asp; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
      void main(){ vec3 c = texture(cena, vUv).rgb;
        vec3 b = textureLod(cena, vUv, 3.).rgb * .45 + textureLod(cena, vUv, 5.).rgb * .35 + textureLod(cena, vUv, 7.).rgb * .3; c += max(b - .85, 0.) * .55;
        vec2 d = (solTela - vUv) / 48.; vec2 uv = vUv; float dec = 1.; vec3 gr = vec3(0.);
        for (int i = 0; i < 48; i++) { uv += d; vec3 sm = textureLod(cena, clamp(uv, 0., 1.), 2.).rgb; float l = max(dot(sm, vec3(.3, .59, .11)) - 1.15, 0.); gr += min(sm * l, vec3(4.)) * dec; dec *= .965; }
        c += gr * .022 * solVis * vec3(1., .86, .62);
        c *= 1.12; c = aces(c);
        float lum = dot(c, vec3(.299, .587, .114)); c = mix(vec3(lum), c, 1.12); c = mix(c, c * vec3(1.05, 1.0, .9), smoothstep(.4, 1., lum)); c = mix(c, c * vec3(.92, 1.0, 1.05), smoothstep(.45, 0., lum));
        vec2 q = vUv - .5; q.x *= asp; c *= 1. - .32 * smoothstep(.35, .95, length(q));
        gl_FragColor = vec4(pow(c, vec3(1. / 2.2)), 1.); }` });
  posCena.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), matPos)); lixo.push(rt, matPos);
  function ajustar() { const w = raiz.clientWidth, h = raiz.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); const pr = renderer.getPixelRatio(); rt.setSize(Math.max(4, Math.floor(w * pr)), Math.max(4, Math.floor(h * pr))); reflRT.setSize(Math.max(4, Math.floor(w * pr / 2)), Math.max(4, Math.floor(h * pr / 2))); matPos.uniforms.asp.value = w / Math.max(1, h); }
  const obs = new ResizeObserver(ajustar); obs.observe(raiz); ajustar();

  // CHEGADA DE DRONE: do alto, sobre o jardim, descendo em curva até pousar na trilha diante da árvore da vida
  const voo = new THREE.CatmullRomCurve3([VT(-200, 480, 260), VT(-90, 330, 150), VT(40, 220, 70), VT(20, 150, 30), VT(0, 72, 0)]);
  if (avatar) { const a = 2.5 * Math.sin(70 / 13); voo.points[voo.points.length - 1].copy(VT(a + 0.8, 73.5, 2.0)); voo.points[voo.points.length - 2].copy(VT(14, 140, 30)); voo.updateArcLengths(); }
  const DUR = 11000; let t0 = performance.now();
  if (voando) raiz.classList.add('voando');
  function pularChegada() { if (!voando) return; voando = false; raiz.classList.remove('voando'); cartao('chegada'); }
  let ativo = true, antes = performance.now(), passoBob = 0;
  function quadro(agora) { if (!ativo) return; const dt = Math.min(0.05, (agora - antes) / 1000); antes = agora; const t = agora / 1000; unif.t.value = t;
    if (voando) { const q = Math.min(1, (agora - t0) / DUR), e = q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2; const p = voo.getPointAt(e); const hc = altura(p.x, p.z); camera.position.set(p.x, Math.max(hc + 1.7, hc + p.y + 1.7), p.z);
      const olhaPara = new THREE.Vector3(0, 10 * (1 - e) + 6 * e, 0); camera.lookAt(olhaPara); const fw = new THREE.Vector3(); camera.getWorldDirection(fw); yaw = Math.atan2(-fw.x, -fw.z); pitch = Math.asin(fw.y); if (modo === 'primeira' || !avatar) eu.set(p.x, 0, p.z); else { eu.copy(VT(2.5 * Math.sin(70 / 13), 70)); rumo = Math.atan2(0.6, 0.8); } camPos.copy(camera.position); camIni = true;
      if (q >= 1) pularChegada(); }
    else {
      // andar
      let fx = 0, fz = 0; if (teclas.has('w') || teclas.has('arrowup')) fz += 1; if (teclas.has('s') || teclas.has('arrowdown')) fz -= 1; if (teclas.has('a')) fx -= 1; if (teclas.has('d')) fx += 1;
      if (teclas.has('arrowleft')) yaw += dt * 1.6; if (teclas.has('arrowright')) yaw -= dt * 1.6;
      fx += joy.x; fz += -joy.y;
      if (indo && !(modo === 'terceira' && avatar)) { const dx = indo.x - eu.x, dz = indo.z - eu.z, d = Math.hypot(dx, dz); if (d < 1.2) indo = null; else { const alvoYaw = Math.atan2(-dx, -dz); let dy = alvoYaw - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw += dy * Math.min(1, dt * 3); fz = Math.min(1, d / 4); } }
      const terceira = modo === 'terceira' && avatar;
      if (terceira && indo) { const dx = indo.x - eu.x, dz = indo.z - eu.z, d = Math.hypot(dx, dz); if (d < 1.2) indo = null; else { const sY = Math.sin(yaw), cY = Math.cos(yaw), ff = Math.min(1, d / 4) / d; fz = (-sY * dx - cY * dz) * ff; fx = (cY * dx - sY * dz) * ff; } }
      const corre = teclas.has('shift') ? 2.6 : 1, vMax = (terceira ? 3.4 : 4.2) * corre; const sinY = Math.sin(yaw), cosY = Math.cos(yaw);
      const alvoV = new THREE.Vector3((-sinY * fz + cosY * fx) * vMax, 0, (-cosY * fz - sinY * fx) * vMax); vel.lerp(alvoV, Math.min(1, dt * 6));
      const ex = eu.x, ez = eu.z; eu.addScaledVector(vel, dt); { const f1 = fundura(eu.x, eu.z); if (f1 > 1.1 && f1 > fundura(ex, ez)) { eu.x = ex; eu.z = ez; vel.multiplyScalar(0.2); } }
      // não atravessa troncos nem animais
      for (const o of obst) { const dx = eu.x - o.x, dz = eu.z - o.z, d = Math.hypot(dx, dz), m = o.r + 0.35; if (d < m && d > 1e-4) { eu.x = o.x + dx / d * m; eu.z = o.z + dz / d * m; } }
      for (const b of bichos) { const dx = eu.x - b.x, dz = eu.z - b.z, d = Math.hypot(dx, dz), m = 0.3 + b.e.h * 0.45; if (d < m && d > 1e-4) { eu.x = b.x + dx / d * m; eu.z = b.z + dz / d * m; } }
      const r = Math.hypot(eu.x, eu.z); if (r > 620) eu.multiplyScalar(620 / r);
      const vv = vel.length(); passoBob += vv * dt * 1.9; const agua = naAgua(eu.x, eu.z), hc = altura(eu.x, eu.z);
      if (terceira) {
        if (vv > 0.3) { const alvo = Math.atan2(vel.x, vel.z); let d = alvo - rumo; d = Math.atan2(Math.sin(d), Math.cos(d)); rumo += d * Math.min(1, dt * 9); }
        fasePasso += vv * dt * 2.3; matAv.uniforms.fase.value = fasePasso; matAv.uniforms.amp.value += (Math.min(1.1, vv / 3.4) - matAv.uniforms.amp.value) * Math.min(1, dt * 8);
        avatar.visible = true; avatar.position.set(eu.x, hc - 0.02, eu.z); avatar.rotation.y = rumo + (pecas.explorador.giro || 0);
        // câmera atrás do ombro, com atraso suave
        const p2 = Math.max(-0.15, Math.min(1.1, -pitch + 0.22)), D = 2.6, dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), dirX = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        const des = new THREE.Vector3(eu.x + dir.x * Math.cos(p2) * D + dirX.x * 0.85, hc + 1.5 + Math.sin(p2) * D, eu.z + dir.z * Math.cos(p2) * D + dirX.z * 0.85);
        des.y = Math.max(des.y, altura(des.x, des.z) + 0.5);
        if (!camIni) { camPos.copy(des); camIni = true; } camPos.lerp(des, 1 - Math.exp(-dt * 7)); camera.position.copy(camPos);
        olhoAlvo.set(eu.x - dir.x * 4 + dirX.x * 0.85, hc + 1.4, eu.z - dir.z * 4 + dirX.z * 0.85); camera.lookAt(olhoAlvo);
      } else {
        if (avatar) avatar.visible = false;
        camera.position.set(eu.x, Math.max(hc, hBase(eu.x, eu.z) - 1.0 - 0.6) + 1.7 + Math.sin(passoBob * 2) * 0.035 * Math.min(1, vv / 3), eu.z);
        camera.rotation.set(0, 0, 0); camera.rotation.order = 'YXZ'; camera.rotation.y = yaw; camera.rotation.x = pitch;
      }
      // cartões por proximidade
      const dArv = Math.hypot(eu.x, eu.z), dForq = Math.hypot(eu.x - FORQ.x, eu.z - FORQ.z), dPres = Math.hypot(eu.x - posPresenca.x, eu.z - posPresenca.z);
      const perto = bichos.some((b) => Math.hypot(b.x - eu.x, b.z - eu.z) < 9);
      cartao(dPres < 16 ? 'presenca' : dArv < 30 ? 'arvore' : dForq < 26 ? 'rio' : perto ? 'animais' : dArv < 90 ? 'chegada' : r > 300 ? 'bom' : null);
    }
    moverBichos(dt);
    caminhoPresenca.getPointAt(((t / 160) % 1 + 1) % 1, posPresenca); presenca.position.set(posPresenca.x, altura(posPresenca.x, posPresenca.z), posPresenca.z); brilho.material.opacity = 0.75 + 0.25 * Math.sin(t * 1.7);
    if (voando) matGrama.uniforms.centro.value.set(camera.position.x, camera.position.z); else matGrama.uniforms.centro.value.set(eu.x, eu.z); grama.visible = camera.position.y - altura(camera.position.x, camera.position.z) < 25;
    if (avatar && voando) { avatar.visible = modo === 'terceira'; avatar.position.set(eu.x, altura(eu.x, eu.z), eu.z); avatar.rotation.y = rumo + (pecas.explorador.giro || 0); }
    if (ceu) ceu.position.copy(camera.position);
    if (audio && somLigado) { const [d, w] = distRio(camera.position.x, camera.position.z), k = Math.max(0, 1 - Math.max(0, d - w) / 60); audio.gA.gain.setTargetAtTime(0.95 * k * k, audio.ctx.currentTime, 0.3); audio.gA2.gain.setTargetAtTime(0.10 * k * k, audio.ctx.currentTime, 0.3);
      const dP = Math.hypot(camera.position.x - posPresenca.x, camera.position.z - posPresenca.z); audio.gV.gain.setTargetAtTime(0.14 + 0.35 * Math.max(0, 1 - dP / 40) + 0.06 * Math.sin(t * 0.3), audio.ctx.currentTime, 0.5); }
    solDisco.position.copy(camera.position).addScaledVector(SOL, 1300); matF.uniforms.centro.value.set(voando ? camera.position.x : eu.x, altura(eu.x, eu.z), voando ? camera.position.z : eu.z); feixes.visible = polen.visible; matPo.uniforms.centro.value.set(voando ? camera.position.x : eu.x, altura(eu.x, eu.z), voando ? camera.position.z : eu.z); polen.visible = !voando || camera.position.y - altura(camera.position.x, camera.position.z) < 30;
    const sp = solDisco.position.clone().project(camera), fw = new THREE.Vector3(); camera.getWorldDirection(fw); matPos.uniforms.solTela.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5); matPos.uniforms.solVis.value = Math.max(0, fw.dot(SOL)) ** 1.5 * (sp.z < 1 ? 1 : 0);
    camera.updateMatrixWorld(); refletir(); renderer.setRenderTarget(rt); renderer.render(cena, camera); renderer.setRenderTarget(null); renderer.render(posCena, posCam); requestAnimationFrame(quadro); }
  requestAnimationFrame((a) => { raiz.classList.add('on'); t0 = a; antes = a; if (!voando) cartao('chegada'); quadro(a); });

  function fechar() { if (!ativo) return; ativo = false; obs.disconnect(); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); raiz.classList.remove('on'); if (audio) try { audio.ctx.close(); } catch (_) {}
    setTimeout(() => { lixo.forEach((o) => o && o.dispose && o.dispose()); renderer.dispose(); raiz.remove(); }, 1400); if (aoFechar) aoFechar(); }
  raiz.querySelector('.ej-sair').onclick = fechar;
  return { cena, fechar, estado: () => ({ x: eu.x, z: eu.z, yaw, pitch, voando, bichos: bichos.length, onde: bichos.map((b) => [b.e.n, Math.round(b.x), Math.round(b.z)]) }), olhar: (y, p) => { yaw = y; pitch = p; }, irPara: (x, z) => { pularChegada(); eu.set(x, 0, z); } };
}
