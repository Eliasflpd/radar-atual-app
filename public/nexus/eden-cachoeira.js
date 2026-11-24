// A CACHOEIRA DO ÉDEN e a CAVERNA atrás da queda: um paredão de pedra com musgo, a água despencando num poço,
// névoa subindo e uma gruta para entrar e explorar (salão no fundo com abertura no teto e um lago interno).
// A queda fica NO RIO principal: ele desce do planalto ao norte, despenca no poço e segue para o jardim.
// Coordenadas locais: P = centro do poço; 'u' entra no paredão (rio acima, direção P.dx/P.dz), 'v' é o lado.
// Texturas de rocha: Poly Haven (CC0) — mossy_rock (paredão) e rock_face_03 (gruta).

const ss = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const RP = 23, RL = 27, ALT = 38, ARCO = 1.3;   // raio do poço, raio do paredão, altura do paredão, meia-abertura do arco (rad)
const CAMINHO = [[RL - 1, 0], [35, 2], [42, 10], [48, 24], [52, 40], [55, 54]];   // a galeria, da boca até o salão (desvia de lado, para não passar debaixo do leito do rio)
const SALAO = [58, 68], RSAL = 15, HSAL = 11;
const loc = (P, x, z) => { const dx = x - P.x, dz = z - P.z; return [dx * P.dx + dz * P.dz, dx * P.dz - dz * P.dx]; };
const mundo = (P, u, v) => [P.x + P.dx * u + P.dz * v, P.z + P.dz * u - P.dx * v];
const larg = (s) => 4.6 + 2.2 * ss(s, 0.15, 0.9);   // a galeria se alarga para dentro

export function relevoCachoeira(hNat, P) {
  const hP = hNat(P.x, P.z);
  const h = (x, z) => { const [u, v] = loc(P, x, z), r = Math.hypot(u, v), a = Math.atan2(v, u); let y = hNat(x, z);
    // o planalto acima do paredão: rio acima, todo o terreno fica no alto (o rio corre lá em cima e despenca aqui)
    const perto = ss(r, RL + 6, RL + 14) * ss(ARCO + 0.12 - Math.abs(a), 0, 0.25), longe = ss(u, RL + 10, RL + 70) * ss(760 - Math.abs(v), 0, 320);
    const w = Math.max(perto, longe); if (w > 0) y = y + (Math.max(y, hP + ALT + 2 * Math.sin(x * 0.05) * Math.cos(z * 0.04)) - y) * w;
    // a laje de pedra em volta do poço e o poço fundo
    if (r < RL + 6) { const k = ss(RL + 6, RL - 2, r) ; y = y + (hP - y) * Math.max(k, r < RP + 1 ? 1 : 0); }
    if (r < RP) y = hP - 5.5 * (1 - (r / RP) ** 2);
    // a terra não entra na galeria: logo atrás do paredão (debaixo da borda de rocha) ela desce abaixo do chão da gruta
    if (u > RL - 2 && r < RL + 18) { const [d, s0] = distCaminho(u, v); if (d < larg(s0) + 8) y = Math.min(y, hP - 1.5); }
    return y; };
  return { h, hP };
}

// onde não pode nascer árvore nem planta: o poço, a laje e o caminho da caverna (por dentro do paredão)
export function fora(P, x, z) { const [u, v] = loc(P, x, z); if (Math.hypot(u, v) < 44) return false; if (u > RL - 4) { const [d, s0] = distCaminho(u, v); if (d < larg(s0) + 9 || Math.hypot(u - SALAO[0], v - SALAO[1]) < RSAL + 10) return false; } return true; }
const lin = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
function distCaminho(u, v) { let best = 1e9, sAcc = 0, sBest = 0, tot = 0; const L = []; for (let i = 0; i < CAMINHO.length - 1; i++) { const l = Math.hypot(CAMINHO[i + 1][0] - CAMINHO[i][0], CAMINHO[i + 1][1] - CAMINHO[i][1]); L.push(l); tot += l; }
  for (let i = 0; i < CAMINHO.length - 1; i++) { const [ax, ay] = CAMINHO[i], [bx, by] = CAMINHO[i + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy; let t = ((u - ax) * dx + (v - ay) * dy) / L2; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(u - ax - dx * t, v - ay - dy * t); if (d < best) { best = d; sBest = (sAcc + L[i] * t) / tot; } sAcc += L[i]; }
  return [best, sBest]; }

export async function criarCachoeira(THREE, cena, { P, hP, carregar, lixo, unif, SOL, toque }) {
  const W = (u, v) => mundo(P, u, v);   // local -> mundo
  const tex = async (n, rep) => { const t = await carregar(n); if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (rep) t.repeat.set(rep, rep); lixo.push(t); } return t; };
  const pbr = async (nome) => { const [m, n, r] = await Promise.all([tex(nome + '-Diffuse.jpg'), tex(nome + '-nor_gl.jpg'), tex(nome + '-Rough.jpg')]); if (n) n.colorSpace = THREE.NoColorSpace; if (r) r.colorSpace = THREE.NoColorSpace; return { m, n, r }; };
  const [RM, RC] = await Promise.all([pbr('rocha-musgo'), pbr('rocha-caverna')]);
  const fbm = (x, y) => Math.sin(x * 1.7 + Math.sin(y * 0.9)) * 0.5 + Math.sin(x * 3.1 - y * 1.3) * 0.3 + Math.sin(x * 6.7 + y * 2.9) * 0.2;

  // 1. O PAREDÃO: arco de rocha com musgo, do fundo do poço até o planalto, com a boca da caverna atrás da queda
  { const NA = 110, NY = 58, y0 = hP - 7, y1 = hP + ALT + 2.5, P3 = [], UV = [], I = [], idx = [];
    const NC = 8, NYT = NY + NC;
    for (let j = 0; j <= NYT; j++) for (let i = 0; i <= NA; i++) { const a = -ARCO + (2 * ARCO) * i / NA; let y, rr;
      if (j <= NY) { y = y0 + (y1 - y0) * j / NY; rr = RL + 0.6 + 1.4 * (0.5 + 0.5 * fbm(a * 9, y * 0.25)) + 0.8 * fbm(a * 23, y * 0.7) - 1.2 * Math.exp(-((y - (hP + ALT - 4)) ** 2) / 8); }
      else { const f = (j - NY) / NC; y = y1 + 0.6 * Math.sin(f * 3) * (1 - f); rr = RL + 3 + f * 20 + 1.5 * fbm(a * 11, f * 4); }
      const [x, z] = W(rr * Math.cos(a), rr * Math.sin(a)); idx.push(P3.length / 3); P3.push(x, y, z); UV.push(a * RL / 7, j <= NY ? y / 7 : (y1 + rr - RL) / 7); }
    for (let j = 0; j < NYT; j++) for (let i = 0; i < NA; i++) { const a = -ARCO + (2 * ARCO) * (i + 0.5) / NA, y = j < NY ? y0 + (y1 - y0) * (j + 0.5) / NY : 1e9;
      if (Math.abs(a * RL) < 4.4 && y < hP + 7.6 && y > hP - 1) continue;   // a boca da caverna
      const k = j * (NA + 1) + i; I.push(k, k + 1, k + NA + 1, k + 1, k + NA + 2, k + NA + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: RM.m, normalMap: RM.n, roughnessMap: RM.r, color: 0xd8dccb, side: THREE.DoubleSide, roughness: 0.95 })); cena.add(m); lixo.push(g, m.material); }

  // 2. A CAVERNA: galeria que entra no paredão e um salão alto no fundo, por dentro (rocha molhada; escurece para dentro)
  const chao = hP + 0.25;
  { const P3 = [], UV = [], C = [], I = []; const NR = 26; const pts = []; for (let s = 0; s <= 1.0001; s += 1 / 70) { const tot = CAMINHO.length - 1, f = s * tot, i = Math.min(tot - 1, Math.floor(f)); pts.push([...lin(CAMINHO[i], CAMINHO[i + 1], f - i), s]); }
    pts.forEach(([u, v, s], k) => { const nx = k < pts.length - 1 ? pts[k + 1][0] - u : u - pts[k - 1][0], ny = k < pts.length - 1 ? pts[k + 1][1] - v : v - pts[k - 1][1], ln = Math.hypot(nx, ny), lx = -ny / ln, ly = nx / ln; const wv = larg(s), hv = 4.3 + 3 * ss(s, 0.1, 0.9), escuro = 1 - 0.72 * ss(s, 0.05, 0.75);
      for (let j = 0; j <= NR; j++) { const th = (j / NR) * Math.PI * 2, ru = 1 + 0.18 * fbm(s * 40 + j, j * 0.7); let lat = Math.cos(th) * wv * ru, up = Math.sin(th) * hv * ru + hv * 0.55; if (up < 0) up = 0.0 + 0.15 * fbm(j, s * 30);
        const [x, z] = W(u + lx * lat, v + ly * lat); P3.push(x, chao + up - 0.2, z); UV.push(j / NR * 4, s * 20); C.push(escuro, escuro * 0.98, escuro * 0.95); } });
    for (let k = 0; k < pts.length - 1; k++) for (let j = 0; j < NR; j++) { const a = k * (NR + 1) + j, b = a + NR + 1; I.push(a, a + 1, b, a + 1, b + 1, b); }
    // o salão: um domo achatado, com a abertura no teto
    const base = P3.length / 3, NS = 34, NT = 16; for (let i = 0; i <= NT; i++) for (let j = 0; j <= NS; j++) { const ph = (i / NT) * Math.PI * 0.5 + Math.PI * 0.5 * 0, th = (j / NS) * Math.PI * 2, ru = 1 + 0.14 * fbm(j * 0.9, i * 1.3);
      const rh = Math.cos(ph) * RSAL * ru, up = Math.sin(ph) * HSAL * ru; const [x, z] = W(SALAO[0] + Math.cos(th) * rh, SALAO[1] + Math.sin(th) * rh); const luz = 0.35 + 0.5 * ss(up, HSAL * 0.4, HSAL); P3.push(x, chao + up - 0.2, z); UV.push(j / NS * 8, i / NT * 3); C.push(luz, luz, luz * 0.97); }
    for (let i = 0; i < NT; i++) for (let j = 0; j < NS; j++) { if (i >= NT - 3) continue; const a = base + i * (NS + 1) + j, b = a + NS + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }   // as 3 últimas fileiras ficam abertas: é a abertura no teto
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: RC.m, normalMap: RC.n, roughnessMap: RC.r, vertexColors: true, color: 0xb9b4aa, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.05 })); cena.add(m); lixo.push(g, m.material);
    // chão de pedra molhada da galeria
    const gc = new THREE.BufferGeometry(), F = [], FU = [], FI = []; pts.forEach(([u, v, s], k) => { const nx = k < pts.length - 1 ? pts[k + 1][0] - u : u - pts[k - 1][0], ny = k < pts.length - 1 ? pts[k + 1][1] - v : v - pts[k - 1][1], ln = Math.hypot(nx, ny), lx = -ny / ln, ly = nx / ln, wv = larg(s);
      for (const sd of [-1, 1]) { const [x, z] = W(u + lx * wv * sd, v + ly * wv * sd); F.push(x, chao - 0.05, z); FU.push(sd * 2, s * 25); } if (k) { const a = (k - 1) * 2; FI.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
    gc.setAttribute('position', new THREE.Float32BufferAttribute(F, 3)); gc.setAttribute('uv', new THREE.Float32BufferAttribute(FU, 2)); gc.setIndex(FI); gc.computeVertexNormals();
    const mc = new THREE.Mesh(gc, new THREE.MeshStandardMaterial({ map: RC.m, normalMap: RC.n, color: 0x6e6a62, roughness: 0.25, metalness: 0.1, side: THREE.DoubleSide })); cena.add(mc); lixo.push(gc, mc.material);
    // o chão do salão e o lago interno
    { const [x, z] = W(SALAO[0], SALAO[1]); const gf = new THREE.CircleGeometry(RSAL * 1.05, 40); gf.rotateX(-Math.PI / 2); const mf = new THREE.Mesh(gf, mc.material); mf.position.set(x, chao - 0.06, z); cena.add(mf); lixo.push(gf);
      const gl = new THREE.CircleGeometry(5.5, 32); gl.rotateX(-Math.PI / 2); const ml = new THREE.Mesh(gl, new THREE.MeshStandardMaterial({ color: 0x0d3a3c, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.92 })); ml.position.set(x + 3, chao + 0.02, z); cena.add(ml); lixo.push(gl, ml.material);
      // a luz do céu entrando pela abertura: facho e um ponto de luz
      const fg = new THREE.CylinderGeometry(3.2, 5.5, HSAL + 2, 24, 1, true); const fm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: unif,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
        fragmentShader: 'uniform float t; varying vec2 vUv; void main(){ float a = (.08 + .05 * sin(vUv.x * 40. + t * .7)) * smoothstep(0., .5, vUv.y); gl_FragColor = vec4(vec3(1., .95, .8) * a, a); }' });
      const facho = new THREE.Mesh(fg, fm); facho.position.set(x + 3, chao + (HSAL + 2) / 2, z); cena.add(facho); lixo.push(fg, fm);
      const lp = new THREE.PointLight(0xfff1d6, 60, 40, 1.6); lp.position.set(x + 3, chao + HSAL - 1, z); cena.add(lp);
      const lb = new THREE.PointLight(0x9fd7c8, 18, 30, 1.8); const [bx, bz] = W(RL + 3, 0); lb.position.set(bx, chao + 3, bz); cena.add(lb);   // a luz esverdeada que atravessa a cortina de água
    }
    // estalactites
    { const ge = new THREE.ConeGeometry(0.25, 1, 6); ge.rotateX(Math.PI); ge.translate(0, -0.5, 0); const me = new THREE.MeshStandardMaterial({ color: 0x8c857a, roughness: 0.4 }); lixo.push(ge, me); const n = toque ? 60 : 120, im = new THREE.InstancedMesh(ge, me, n), M = new THREE.Matrix4();
      for (let i = 0; i < n; i++) { const s = Math.random(); let u, v, y; if (i < n * 0.6) { const tot = CAMINHO.length - 1, f = (0.25 + s * 0.75) * tot, k = Math.min(tot - 1, Math.floor(f)); [u, v] = lin(CAMINHO[k], CAMINHO[k + 1], f - k); v += (Math.random() - 0.5) * 4; y = chao + 4 + 3 * ss(s, 0.1, 0.9); } else { const a = Math.random() * 6.28, r = Math.random() * RSAL * 0.75; u = SALAO[0] + Math.cos(a) * r; v = SALAO[1] + Math.sin(a) * r; y = chao + HSAL * (0.95 - 0.5 * (r / RSAL) ** 2); }
        if (Math.hypot(u - SALAO[0] - 3, v - SALAO[1]) < 6) continue; const [x, z] = W(u, v), L = 0.6 + Math.random() * 2.2; M.makeScale(1 + Math.random(), L, 1 + Math.random()); M.setPosition(x, y, z); im.setMatrixAt(i, M); }
      im.frustumCulled = false; cena.add(im); lixo.push(im); }
  }

  // 2b. A FACHADA REALISTA: a cachoeira na rocha coberta de mata (recorte em foto), presa no paredão de frente para o rio
  const LF = 40, HF = 64, fachadaTex = await tex('cachoeira-real.png'); let comFachada = false;
  if (fachadaTex) { fachadaTex.wrapS = fachadaTex.wrapT = THREE.ClampToEdgeWrapping; const g = new THREE.PlaneGeometry(LF, HF); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: fachadaTex, alphaTest: 0.5, color: 0xf2f2ec, side: THREE.DoubleSide }));   // a foto já tem a luz certa: sem iluminação por cima
    const [fx, fz] = W(RL - 3.2, 0); m.position.set(fx, hP - 1.5 + HF / 2, fz); m.rotation.y = Math.atan2(-P.dx, -P.dz); m.renderOrder = 1; cena.add(m); lixo.push(g, m.material); comFachada = true; }
  // 3. A ÁGUA: a queda (cortina que desce rápida), o poço verde-esmeralda com espuma e a névoa que sobe
  const RQ = comFachada ? RL - 3.6 : RP + 0.2, MQ = comFachada ? 0.13 : 0.62, topo = comFachada ? hP - 1.5 + HF * 0.86 : hP + ALT, baseQ = hP - 0.55;
  { const NA = 60, NY = 60, P3 = [], UV = [], I = [];
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NA; i++) { const a = -MQ + 2 * MQ * i / NA, f = j / NY, y = topo + 0.6 - (topo + 0.6 - baseQ) * f, rr = comFachada ? RQ - 0.2 - f * 0.6 : RQ + (RL - RQ - 0.6) * Math.exp(-f * 9) + 0.3 * Math.sin(a * 30 + f * 4);
      const [x, z] = W(rr * Math.cos(a), rr * Math.sin(a)); P3.push(x, y, z); UV.push(i / NA, f); }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NA; i++) { const k = j * (NA + 1) + i; I.push(k, k + 1, k + NA + 1, k + 1, k + NA + 2, k + NA + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { ...unif, sol: { value: SOL } },
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float t; uniform vec3 nevoa; uniform float dens; varying vec2 vUv; varying vec3 vW;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * n(p); p = p * 2.07 + 7.3; a *= .5; } return s; }
        void main(){ float y = vUv.y; vec2 q = vec2(vUv.x * 46., y * 5. - t * 2.6 * (1. + y * 1.6));
          float fios = fbm(q * vec2(1., .35)) * .6 + fbm(q * vec2(3., 1.) + 3.1) * .4; float bord = smoothstep(0., .08, vUv.x) * smoothstep(1., .92, vUv.x);
          float a = clamp(.35 + fios * .85, 0., 1.) * bord * (.75 + .25 * smoothstep(0., .1, y)); float branco = smoothstep(.45, .8, fios) * (.5 + y * .7);
          vec3 c = mix(vec3(.62, .78, .76), vec3(.97, .99, 1.), branco); c *= .9 + .2 * sin(vUv.x * 80. + t);
          float f = 1. - exp(-dens * dens * length(vW - cameraPosition) * length(vW - cameraPosition)); gl_FragColor = vec4(mix(c, nevoa, f), a * ${comFachada ? '.55' : '.92'});
#include <tonemapping_fragment>
#include <colorspace_fragment>
        }` }));
    m.renderOrder = 3; cena.add(m); lixo.push(g, m.material); }
  // o poço
  { const g = new THREE.CircleGeometry(RP + 0.6, 64); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { ...unif, sol: { value: SOL }, centroQ: { value: new THREE.Vector2(...W(RQ, 0)) } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float t, dens; uniform vec3 nevoa, sol; uniform vec2 centroQ; varying vec3 vW;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * n(p); p = p * 2.07 + 7.3; a *= .5; } return s; }
        void main(){ vec2 d = vW.xz - centroQ; float r = length(d); vec2 dir = d / max(r, .001);
          float on = fbm(vW.xz * .35 - dir * t * 1.4) * .6 + fbm(vW.xz * 1.3 + vec2(t * .3, -t * .2)) * .4; vec3 nn = normalize(vec3((on - .5) * .9, 1., (fbm(vW.xz * .35 + 5.) - .5) * .9));
          vec3 olho = normalize(cameraPosition - vW); float F = .02 + .98 * pow(1. - max(dot(olho, nn), 0.), 5.);
          vec3 fundo = mix(vec3(.02, .16, .13), vec3(.0, .05, .05), smoothstep(4., 18., length(vW.xz - centroQ + dir * 0.)));
          vec3 ceu = vec3(.55, .66, .62); vec3 c = mix(fundo, ceu, F * .7); c += vec3(1., .9, .7) * pow(max(dot(reflect(-sol, nn), olho), 0.), 120.) * 3.;
          float esp = smoothstep(9., 1., r) * smoothstep(.35, .75, fbm(vec2(r * 1.2 - t * 2.2, atan(d.y, d.x) * 6.))) + smoothstep(.62, .85, on) * .25 * smoothstep(16., 4., r);
          c = mix(c, vec3(.94, .97, .96), clamp(esp, 0., 1.) * .85); float f = 1. - exp(-dens * dens * length(vW - cameraPosition) * length(vW - cameraPosition)); gl_FragColor = vec4(mix(c, nevoa, f), .93);
#include <tonemapping_fragment>
#include <colorspace_fragment>
        }` }));
    m.position.set(P.x, hP - 0.55, P.z); m.renderOrder = 2; cena.add(m); lixo.push(g, m.material); }
  // a névoa da queda
  const NN = toque ? 260 : 520; let nevoaQ;
  { const pos = new Float32Array(NN * 3), sem = new Float32Array(NN); for (let i = 0; i < NN; i++) { const a = (Math.random() * 2 - 1) * MQ * 1.3, rr = RQ - Math.random() * 7; const [x, z] = W(rr * Math.cos(a), rr * Math.sin(a)); pos.set([x, baseQ, z], i * 3); sem[i] = Math.random() * 100; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('sem', new THREE.BufferAttribute(sem, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { ...unif, px: { value: (toque ? 1.5 : 2) * 90 } },
      vertexShader: 'uniform float t, px; attribute float sem; varying float vA; void main(){ float c = fract(t * .07 + sem * .013); vec3 p = position + vec3(sin(sem + t * .3) * 3. * c, c * 22., cos(sem * 1.7 + t * .25) * 3. * c); vA = (1. - c) * smoothstep(0., .08, c); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = px * (1. + c * 2.5) / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d) * vA * .16; gl_FragColor = vec4(vec3(.95, .97, .98) * a, a); }', blending: THREE.AdditiveBlending });
    nevoaQ = new THREE.Points(g, m); nevoaQ.frustumCulled = false; nevoaQ.renderOrder = 4; cena.add(nevoaQ); lixo.push(g, m); }

  // ANDAR NA CAVERNA: dentro dela o chão é o da gruta (e não o planalto lá em cima); entra-se pela boca, atrás da queda
  const local = (x, z) => loc(P, x, z);
  const naGaleria = (x, z, folga = 0) => { const [u, v] = local(x, z); if (Math.hypot(u - SALAO[0], v - SALAO[1]) < RSAL - 1.2 + folga) return true; const [d, s] = distCaminho(u, v); return u > RL - 1.5 && d < larg(s) - 0.9 + folga; };
  let dentro = false;
  return {
    P, hP, chao, centro: W(RQ - 9, 0), boca: W(RL + 2, 0), salao: W(SALAO[0], SALAO[1]), frente: W(-26, 16),
    get dentro() { return dentro; },
    entrar() { dentro = true; },
    // corrige a posição de quem anda: entra/sai pela boca, não atravessa a rocha
    andar(eu, antes) { const [u1, v1] = local(eu.x, eu.z), r1 = Math.hypot(u1, v1), a1 = Math.atan2(v1, u1);
      if (!dentro) { if (r1 > RL - 1.3 && Math.abs(a1) < ARCO + 0.06 && r1 < RL + 8) { if (Math.abs(v1) < 3.6 && u1 > 0) dentro = true; else { eu.x = antes.x; eu.z = antes.z; return; } } else return; }
      if (u1 < RL - 1.6) { dentro = false; return; }   // saiu pela boca
      if (!naGaleria(eu.x, eu.z)) { eu.x = antes.x; eu.z = antes.z; } },
    altura: (h) => (dentro ? chao : h),
    distQueda: (x, z) => Math.hypot(x - W(RQ, 0)[0], z - W(RQ, 0)[1]),
  };
}
