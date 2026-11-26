// O ÉDEN DE VERDADE: árvores, plantas, flores e pedras em 3D de fotogrametria (Poly Haven / ambientCG, CC0),
// no lugar dos recortes desenhados. Técnica de jogo: cada árvore tem três versões —
//   perto  (até ~25 m): o modelo 3D cheio de folhas, com sombra e vento;
//   médio  (até ~70 m): o mesmo modelo, raleado (menos folhas, maiores);
//   longe  (além disso): um "impostor" — a árvore fotografada de 36 ângulos e iluminada na hora pelo sol do jardim.
// Plantas baixas e flores só existem perto de quem anda (somem devagar na distância, onde a grama e a névoa cobrem).
// O chão é pintado com 6 texturas de foto (grama, grama com terra, musgo da mata, cascalho, lama com folhas, rocha).
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/';
export const CREDITOS = ['Árvores, plantas, flores e pedras: Poly Haven (CC0) — island_tree_01/02/03, tree_small_02, jacaranda_tree, fern_02, searsia_lucida, pachira_aquatica_01, calathea_orbifolia_01, anthurium_botany_01, flower_gazania, flower_heliophila, periwinkle_plant, dandelion_01, shrub_03, weed_plant_02, nettle_plant, grass_medium_01/02, boulder_01, rock_moss_set_02, coast_rocks_01; chão: Poly Haven e ambientCG (CC0)'];

// altura real do modelo (m) e onde o vento começa a mexer (fração da altura)
const ARV = { arv1: { h: 5.0 }, arv2: { h: 3.4 }, arv3: { h: 2.6 }, arv4: { h: 4.6 }, jac: { h: 19.4 } };
const ss = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export async function criarEdenReal(THREE, cena, { base, altura, unif, toque, lixo, SOL, rnd, obst, renderer }) {
  // LUZ DO AMBIENTE: um céu simples (azul em cima, verde-terra embaixo, brilho do sol) vira mapa de luz para todo material de foto
  if (renderer) { const ceu = new THREE.Scene(), g = new THREE.SphereGeometry(10, 32, 16); const m = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { sol: { value: SOL } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'uniform vec3 sol; varying vec3 vD; void main(){ vec3 d = normalize(vD); vec3 c = mix(vec3(.30, .30, .22), vec3(.55, .70, .95), smoothstep(-.2, .5, d.y)); c = mix(vec3(.16, .17, .10), c, smoothstep(-.35, .02, d.y)); c += vec3(2.2, 1.9, 1.4) * pow(max(dot(d, sol), 0.), 24.); gl_FragColor = vec4(c, 1.); }' });
    ceu.add(new THREE.Mesh(g, m)); const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromScene(ceu, 0.02); cena.environment = rt.texture; cena.environmentIntensity = 0.55; pm.dispose(); g.dispose(); m.dispose(); lixo.push(rt); }
  const { GLTFLoader } = await import(CDN + 'loaders/GLTFLoader.js'); const BGU = await import(CDN + 'utils/BufferGeometryUtils.js');
  const loader = new GLTFLoader();
  const pega = (n) => loader.loadAsync(base + n).then((g) => g.scene).catch((e) => { console.warn('eden-real', n, e); return null; });
  const tex = (n, srgb = true) => new THREE.TextureLoader().loadAsync(base + n).then((t) => { t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 4; lixo.push(t); return t; }).catch(() => null);
  const DP = toque ? 14 : 24, DM = toque ? 48 : 72;   // limites perto / médio (m) para uma árvore de 12 m; as grandes mudam mais longe

  // vento nas folhas e galhos (o mesmo para todas as malhas de planta)
  const vento = (m, forca, folha) => { m.onBeforeCompile = (sh) => { sh.uniforms.uT = unif.t;
    sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ipV = vec3(instanceMatrix[3]);
      #else
        vec3 ipV = vec3(0.);
      #endif
      float hV = max(transformed.y, 0.); float kV = hV * hV * ${forca.toFixed(4)};
      float onV = sin(uT * 1.1 + ipV.x * .05 + ipV.z * .04) * .6 + sin(uT * 2.3 + ipV.x * .17) * .25;
      transformed.x += onV * kV; transformed.z += onV * kV * .45;
      ${folha ? 'transformed += normal * sin(uT * 7. + position.x * 23. + position.z * 17. + ipV.x) * .012 * min(hV, 1.);' : ''}`); };
    m.customProgramCacheKey = () => 'vento' + forca + folha; };
  const padrao = (m) => { if (!m.isMeshPhysicalMaterial) return m; const n = new THREE.MeshStandardMaterial(); for (const k of ['name', 'map', 'normalMap', 'normalScale', 'roughnessMap', 'metalnessMap', 'aoMap', 'roughness', 'metalness', 'alphaTest', 'side', 'transparent', 'vertexColors']) if (m[k] !== undefined) n[k] = m[k]; n.color.copy(m.color); n.alphaMode = m.alphaMode; m.dispose(); return n; };   // mais leve e sem os efeitos de vidro/verniz que não servem a folha
  const ajustar = (m0, forca) => { const m = padrao(m0); const folha = /leaves|leaf|twig|petal|flower|fern|grass|plant|weed|nettle|shrub|calathea|anthurium|gazania|heliophila|periwinkle|dandelion/i.test(m.name || '');
    if (m.transparent || m.alphaMode === 'BLEND') { m.transparent = false; m.depthWrite = true; }
    if (folha) { m.side = THREE.DoubleSide; if (m.map && m.alphaTest === 0 && /fern|grass|plant|weed|nettle|shrub|calathea|anthurium|gazania|heliophila|periwinkle|dandelion/i.test(m.name || '')) m.alphaTest = 0.5; m.shadowSide = THREE.DoubleSide; }
    m.envMapIntensity = 0.6; vento(m, forca, folha); return m; };
  // junta as partes de um modelo numa geometria só (grupos por material) — uma InstancedMesh por versão
  const fundir = (obj, forca) => { const gs = [], ms = []; obj.updateMatrixWorld(true); obj.traverse((o) => { if (!o.isMesh) return; const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.attributes.normal) g.computeVertexNormals(); gs.push(g); ms.push(ajustar(o.material, forca)); });
    if (!gs.length) return null; const g = gs.length > 1 ? BGU.mergeGeometries(gs, true) : gs[0]; if (gs.length === 1) { g.clearGroups(); g.addGroup(0, g.index ? g.index.count : g.attributes.position.count, 0); } g.computeBoundingBox(); lixo.push(g, ...ms); return { g, ms }; };
  // um modelo com várias variantes lado a lado (Poly Haven costuma trazer assim): cada filho vira uma variante, centrada no chão
  const variantes = (obj, forca) => { if (!obj) return []; obj.updateMatrixWorld(true); const out = [];
    for (const ch of obj.children) { const f = fundir(ch, forca); if (!f) continue; const bb = f.g.boundingBox, c = bb.getCenter(new THREE.Vector3()); f.g.translate(-c.x, -bb.min.y, -c.z); f.g.computeBoundingBox(); f.alt = bb.max.y - bb.min.y; f.lar = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z); out.push(f); }
    return out; };

  // ---------- ÁRVORES (perto / médio / impostor) ----------
  const especies = {};
  const matImp = (cor, nor, info) => new THREE.ShaderMaterial({ uniforms: { ...unif, cor: { value: cor }, nor: { value: nor }, sol: { value: SOL }, C: { value: new THREE.Vector3(...info.c) }, R: { value: info.R }, DM: { value: DM } },
    vertexShader: `uniform vec3 C; uniform float R, DM; attribute vec4 iP; attribute vec2 iE; varying vec2 vUv0, vUv1; varying float vK, vD, vA, vYaw; varying vec3 vVd;
      const float AZ = ${info.AZ}.; const float NE = ${info.EL.length}.;
      void main(){ float esc = iE.x, yaw = iE.y; vec3 cW = iP.xyz + vec3(0., C.y * esc, 0.); float cy = cos(yaw), sy = sin(yaw);
        vec3 cOff = vec3(cy * C.x + sy * C.z, 0., -sy * C.x + cy * C.z) * esc; cW += cOff;
        vec3 v = cameraPosition - cW; float d = length(v); vec3 vd = v / d; vD = d;
        // limite de troca: árvores grandes viram impostor mais longe
        float lim = DM * clamp(iP.w / 12., .8, 2.4); vA = smoothstep(lim - 6., lim, d);
        // direção da câmera no espaço do modelo (desfaz o giro da árvore)
        vec3 vl = vec3(cy * vd.x - sy * vd.z, vd.y, sy * vd.x + cy * vd.z); vVd = vd; vYaw = yaw;
        float az = atan(vl.x, vl.z); if (az < 0.) az += 6.28318; float fa = az / 6.28318 * AZ; float i0 = floor(fa); vK = fa - i0; float i1 = mod(i0 + 1., AZ); i0 = mod(i0, AZ);
        float el = degrees(asin(clamp(vl.y, -1., 1.))); float j = ${info.EL.length === 3 ? `el < ${(info.EL[0] + info.EL[1]) / 2}. ? 0. : el < ${(info.EL[1] + info.EL[2]) / 2}. ? 1. : 2.` : '0.'};
        float row = NE - 1. - j;
        vUv0 = vec2((i0 + uv.x) / AZ, (row + uv.y) / NE); vUv1 = vec2((i1 + uv.x) / AZ, (row + uv.y) / NE);
        vec3 lado = normalize(cross(vec3(0., 1., 0.), vd)); vec3 cima = cross(vd, lado);
        vec3 w = cW + (lado * (position.x * 2.) + cima * (position.y * 2.)) * R * esc;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
    fragmentShader: `uniform sampler2D cor, nor; uniform vec3 sol, nevoa, luz; uniform float dens, t; varying vec2 vUv0, vUv1; varying float vK, vD, vA, vYaw; varying vec3 vVd;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec4 c0 = texture2D(cor, vUv0), c1 = texture2D(cor, vUv1); vec4 c = mix(c0, c1, vK);
        float lim = h(gl_FragCoord.xy); if (c.a < .5 || vA < lim) discard;
        vec3 n = mix(texture2D(nor, vUv0).xyz, texture2D(nor, vUv1).xyz, vK) * 2. - 1.; float cy = cos(vYaw), sy = sin(vYaw); n = normalize(vec3(cy * n.x + sy * n.z, n.y, -sy * n.x + cy * n.z));
        float dif = max(dot(n, sol), 0.), tras = pow(max(dot(-vVd, sol), 0.), 4.) * .35;
        vec3 amb = mix(vec3(.34, .34, .25), vec3(.66, .74, .84), n.y * .5 + .5) * 1.0;
        vec3 col = c.rgb * (amb + vec3(1.35, 1.18, .95) * (dif * 1.25 + tras)) * luz;
        float f = 1. - exp(-dens * dens * vD * vD); gl_FragColor = vec4(mix(col, nevoa, f), 1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
      }` });
  async function carregarArvore(id) { if (especies[id]) return especies[id];
    // primeiro só a versão média e o impostor (leves); a versão "perto" (pesada) vem depois, por trás, e só no computador
    const [perto, medio, info, cor, nor] = await Promise.all([null, pega(id + '-medio.glb'), fetch(base + id + '-imp.json').then((r) => r.json()).catch(() => null), tex(id + '-imp-cor.webp'), tex(id + '-imp-nor.webp', false)]);
    const fv = 0.0035 * 5 / ARV[id].h, M = medio && fundir(medio, fv), P = perto ? fundir(perto, fv) : M;
    const e = { id, h: ARV[id].h, P, M, info, cor, nor, lista: [] };
    especies[id] = e; return e; }
  // planta árvores: lista de {x,z,s}, alturaAlvo em metros
  let parado = false;
  async function arvores(id, lista, alturaAlvo) { if (!lista.length || parado) return; const e = await carregarArvore(id); if (parado || !e.P || !e.info) return;
    for (const o of lista) { const h = alturaAlvo * (o.s || 1), esc = h / e.h, y = altura(o.x, o.z) - 0.1 * esc; e.lista.push({ x: o.x, y, z: o.z, esc, yaw: rnd() * 6.283, h }); obst.push({ x: o.x, z: o.z, r: 0.25 + 0.06 * h }); } }
  function montarArvores() { if (parado) return; for (const e of Object.values(especies)) { if (!e.lista.length || e.imp) continue; const n = e.lista.length;
      // impostor: um quadro por árvore, todos de uma vez (a troca para o 3D é decidida no próprio shader)
      const q = new THREE.PlaneGeometry(1, 1); const g = new THREE.InstancedBufferGeometry(); g.index = q.index; g.attributes.position = q.attributes.position; g.attributes.uv = q.attributes.uv; g.instanceCount = n;
      const P = new Float32Array(n * 4), E = new Float32Array(n * 2); e.lista.forEach((o, i) => { P.set([o.x, o.y, o.z, o.h], i * 4); E.set([o.esc, o.yaw], i * 2); });
      g.setAttribute('iP', new THREE.InstancedBufferAttribute(P, 4)); g.setAttribute('iE', new THREE.InstancedBufferAttribute(E, 2));
      const m = new THREE.Mesh(g, matImp(e.cor, e.nor, e.info)); m.frustumCulled = false; cena.add(m); lixo.push(q, g, m.material); e.imp = m;
      // 3D perto e médio: só as instâncias da vez (escolhidas a cada passo de quem anda)
      const cap = (f) => Math.min(n, f);
      e.imP = new THREE.InstancedMesh(e.P.g, e.P.ms, cap(toque ? 10 : 40)); e.imM = e.M ? new THREE.InstancedMesh(e.M.g, e.M.ms, cap(toque ? 90 : 320)) : null;
      for (const im of [e.imP, e.imM]) if (im) { im.count = 0; im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true; cena.add(im); }
      // grade para achar depressa as árvores em volta
      e.grade = new Map(); e.lista.forEach((o, i) => { const k = Math.floor(o.x / 50) * 4096 + Math.floor(o.z / 50); if (!e.grade.has(k)) e.grade.set(k, []); e.grade.get(k).push(i); }); } }

  // ---------- PLANTAS, FLORES E PEDRAS (só perto) ----------
  const conjuntos = [];
  // lista: [{x,z,s}] fixa, ou { dens: plantas por m², peso: (x,z) => 0..1 } para mata fechada gerada em volta de quem anda (sem limite de quantidade)
  async function plantas(arquivo, lista, alturaAlvo, { raio = 60, vento: fv = 0.06, sombra = false, giro = true, enterra = 0.05, deitada = false } = {}) { const proc = !Array.isArray(lista); if (!proc && !lista.length) return;
    if (parado) return; const obj = await pega(arquivo); if (parado) return; const vs = variantes(obj, fv); if (!vs.length) return;
    const c = { nome: arquivo, vs, raio: raio * (toque ? 0.7 : 1), lista: [], ims: [] };
    const por = (o, v) => { const alvo = alturaAlvo * (o.s || 1), esc = deitada ? alvo / Math.max(vs[v].lar, 0.05) : alvo / Math.max(vs[v].alt, vs[v].lar * 0.5, 0.05); return { x: o.x, z: o.z, y: altura(o.x, o.z) - enterra * esc * vs[v].alt, esc, yaw: giro ? o.yaw : (o.giro || 0), v }; };
    if (proc) { let hn = 0; for (const ch of arquivo) hn = (hn * 31 + ch.charCodeAt(0)) | 0; const feitas = new Set(), n = lista.dens * 1600 * (toque ? 0.6 : 1);
      c.gerar = (gx, gz) => { const k = gx * 4096 + gz; if (feitas.has(k)) return; feitas.add(k); let a = (gx * 73856093) ^ (gz * 19349663) ^ hn;
        const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        const l = []; for (let i = 0; i < n; i++) { const x = (gx + r()) * 40, z = (gz + r()) * 40, w = lista.peso(x, z), u = r(), s = 0.7 + 0.6 * r(), yaw = r() * 6.283, v = Math.floor(r() * vs.length); if (u > w) continue;
          l.push(c.lista.length); c.lista.push(por({ x, z, s, yaw }, v)); } c.grade.set(k, l); };
      const cap = Math.min(toque ? 2500 : 6000, Math.ceil(lista.dens * (toque ? 0.6 : 1) * Math.PI * c.raio * c.raio / vs.length) + 20);
      c.ims = vs.map((v) => { const im = new THREE.InstancedMesh(v.g, v.ms, cap); im.count = 0; im.frustumCulled = false; im.castShadow = sombra; im.receiveShadow = sombra; cena.add(im); return im; });
      c.grade = new Map(); conjuntos.push(c); ult = null; return; }
    for (const o of lista) { const v = Math.floor(rnd() * vs.length), alvo = alturaAlvo * (o.s || 1), esc = deitada ? alvo / Math.max(vs[v].lar, 0.05) : alvo / Math.max(vs[v].alt, vs[v].lar * 0.5, 0.05);   // planta rasteira (larga e baixa) não vira gigante
      c.lista.push({ x: o.x, z: o.z, y: altura(o.x, o.z) - enterra * esc * vs[v].alt, esc, yaw: giro ? rnd() * 6.283 : (o.giro || 0), v }); }
    c.ims = vs.map((v, k) => { const cnt = c.lista.filter((o) => o.v === k).length; const im = new THREE.InstancedMesh(v.g, v.ms, Math.max(1, Math.min(cnt, toque ? 700 : 1600))); im.count = 0; im.frustumCulled = false; im.castShadow = sombra; im.receiveShadow = sombra; cena.add(im); return im; });
    c.grade = new Map(); c.lista.forEach((o, i) => { const k = Math.floor(o.x / 40) * 4096 + Math.floor(o.z / 40); if (!c.grade.has(k)) c.grade.set(k, []); c.grade.get(k).push(i); });
    conjuntos.push(c); ult = null; }

  // ---------- ATUALIZAR: escolhe quem aparece em 3D, a cada ~meio metro andado ----------
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Pv = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0); let ult = null, ultT = 0;
  function atualizar(pos, agora) { if (ult && Math.hypot(pos.x - ult.x, pos.z - ult.z) < 0.6 && Math.abs(pos.y - ult.y) < 2 && agora - ultT < 1.5) return; ult = { x: pos.x, y: pos.y, z: pos.z }; ultT = agora;
    const alto = pos.y - altura(pos.x, pos.z) > 40;   // do alto (drone) fica tudo impostor; plantas baixas somem
    for (const e of Object.values(especies)) { if (!e.imP) continue; let np = 0, nm = 0; const capP = e.imP.instanceMatrix.count, capM = e.imM ? e.imM.instanceMatrix.count : 0;
      // mais perto primeiro: se a mata for densa demais para o 3D, o limite desta espécie encolhe e o impostor cobre o resto, sem buracos
      let lim = DM; if (!alto) { const R = DM * 2.4, cx = Math.floor(pos.x / 50), cz = Math.floor(pos.z / 50), rr = Math.ceil(R / 50), cand = [];
        for (let a = -rr; a <= rr; a++) for (let b = -rr; b <= rr; b++) { const l = e.grade.get((cx + a) * 4096 + cz + b); if (!l) continue;
          for (const i of l) { const o = e.lista[i], d = Math.hypot(o.x - pos.x, o.y + o.h * 0.5 - pos.y, o.z - pos.z), k = Math.min(2.4, Math.max(0.8, o.h / 12)); if (d < DM * k) cand.push([d / k, i]); } }
        if (cand.length > capP + capM) { cand.sort((u, v) => u[0] - v[0]); lim = Math.max(DP + 6, cand[capP + capM][0]); cand.length = capP + capM; }
        for (const [dn, i] of cand) { if (dn >= lim) continue; const o = e.lista[i]; Q.setFromAxisAngle(Y, o.yaw); S.setScalar(o.esc); M4.compose(Pv.set(o.x, o.y, o.z), Q, S);
          if (dn < DP && np < capP) e.imP.setMatrixAt(np++, M4); else if (nm < capM) e.imM.setMatrixAt(nm++, M4); else if (np < capP) e.imP.setMatrixAt(np++, M4); } }
      if (e.imp) e.imp.material.uniforms.DM.value = lim;
      e.imP.count = np; e.imP.instanceMatrix.needsUpdate = true; if (e.imM) { e.imM.count = nm; e.imM.instanceMatrix.needsUpdate = true; } }
    for (const c of conjuntos) { const cont = c.ims.map(() => 0);
      if (!alto) { const R = c.raio, cx = Math.floor(pos.x / 40), cz = Math.floor(pos.z / 40), rr = Math.ceil(R / 40);
        for (let a = -rr; a <= rr; a++) for (let b = -rr; b <= rr; b++) { if (c.gerar) c.gerar(cx + a, cz + b); const l = c.grade.get((cx + a) * 4096 + cz + b); if (!l) continue;
          for (const i of l) { const o = c.lista[i], d = Math.hypot(o.x - pos.x, o.z - pos.z); if (d > R) continue; const im = c.ims[o.v]; if (cont[o.v] >= im.instanceMatrix.count) continue;
            const k = ss(d, R, R * 0.8); Q.setFromAxisAngle(Y, o.yaw); S.setScalar(o.esc * k); M4.compose(Pv.set(o.x, o.y, o.z), Q, S); im.setMatrixAt(cont[o.v]++, M4); } } }
      c.ims.forEach((im, k) => { im.count = cont[k]; im.instanceMatrix.needsUpdate = true; }); } }

  // ---------- CHÃO: 6 texturas de foto misturadas pelo tipo de lugar ----------
  async function chao(terreno, pesoA, pesoB) {
    const S = toque ? 512 : 1024, suf = toque ? '-512' : '';
    const ler = (n) => new Promise((ok) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { const c = document.createElement('canvas'); c.width = S; c.height = S * 6; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, S, S * 6); ok(x.getImageData(0, 0, S, S * 6).data); }; im.onerror = () => ok(null); im.src = base + n; });
    const [dc, dn] = await Promise.all([ler('chao-cor' + suf + '.jpg'), ler('chao-nor' + suf + '.jpg')]); if (!dc || !dn) return false;
    const arr = (d, srgb) => { const t = new THREE.DataArrayTexture(new Uint8Array(d.buffer), S, S, 6); t.format = THREE.RGBAFormat; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true; lixo.push(t); return t; };
    const tC = arr(dc, true), tN = arr(dn, false);
    terreno.geometry.setAttribute('pesoA', new THREE.BufferAttribute(pesoA, 4)); terreno.geometry.setAttribute('pesoB', new THREE.BufferAttribute(pesoB, 2));
    const m = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, envMapIntensity: 1.6 }); m.onBeforeCompile = (sh) => { sh.uniforms.tC = { value: tC }; sh.uniforms.tN = { value: tN };
      sh.vertexShader = 'attribute vec4 pesoA; attribute vec2 pesoB; varying vec4 vPA; varying vec2 vPB; varying vec3 vWp; varying vec3 vNw;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vPA = pesoA; vPB = pesoB; vWp = (modelMatrix * vec4(transformed, 1.)).xyz; vNw = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = 'precision highp sampler2DArray; uniform sampler2DArray tC, tN; varying vec4 vPA; varying vec2 vPB; varying vec3 vWp; varying vec3 vNw;\n' +
        `float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float nn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y); }
        vec3 gCor; vec3 gNor; float gW;
        void camada(float w, float L, float esc){ if (w < .004) return; vec2 uv = vWp.xz / esc; vec2 uv2 = vec2(uv.y, -uv.x) * .37 + 13.1; float mx = smoothstep(.3, .7, nn(vWp.xz * .045 + L * 3.1));
          vec3 c = mix(texture(tC, vec3(uv, L)).rgb, texture(tC, vec3(uv2, L)).rgb, mx * .5); vec3 n = texture(tN, vec3(uv, L)).xyz * 2. - 1.;
          float a = w * (.6 + .8 * dot(c, vec3(.33)));   // mistura pela altura do relevo da foto: pedras e torrões aparecem por cima
          gCor += c * a; gNor += n * a; gW += a; }
        ` + sh.fragmentShader.replace('#include <map_fragment>', `gCor = vec3(0.); gNor = vec3(0.); gW = 0.;
          camada(vPA.x, 0., 2.6); camada(vPA.y, 1., 3.2); camada(vPA.z, 2., 3.6); camada(vPA.w, 3., 3.0); camada(vPB.x, 4., 3.0); camada(vPB.y, 5., 7.);
          vec3 corC = gCor / max(gW, 1e-4); float var = .82 + .36 * nn(vWp.xz * .013) * nn(vWp.xz * .051 + 4.); diffuseColor.rgb *= corC * var; vec3 norC = gNor / max(gW, 1e-4);`)
          .replace('#include <normal_fragment_maps>', `{ vec3 nW = normalize(vNw + vec3(norC.x, 0., -norC.y) * 1.1); normal = normalize((viewMatrix * vec4(nW, 0.)).xyz); }`)
          .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness - .15 * vPB.x;'); };
    m.customProgramCacheKey = () => 'chaoReal'; terreno.material.dispose(); terreno.material = m; terreno.receiveShadow = true; lixo.push(m); return true; }

  // CIPÓS pendurados das copas (geometria própria, uma malha só para todos)
  function cipos(maxR = 700, max = toque ? 1200 : 3200) { if (parado) return; const P = [], C = [], I = []; let n = 0;
    const lista = Object.values(especies).filter((e) => e.id !== 'arv3').flatMap((e) => e.lista).filter((o) => Math.hypot(o.x, o.z) < maxR && o.h > 8);
    for (const o of lista) { if (n >= max) break; if (rnd() > 0.45) continue; const k = 1 + Math.floor(rnd() * 3);
      for (let j = 0; j < k && n < max; j++, n++) { const a = rnd() * 6.283, r0 = o.h * (0.12 + rnd() * 0.15), y0 = o.y + o.h * (0.62 + rnd() * 0.25), x0 = o.x + Math.cos(a) * r0, z0 = o.z + Math.sin(a) * r0;
        const solto = rnd() < 0.55, a2 = a + (rnd() - 0.5) * 1.2, r1 = r0 + (solto ? rnd() * 1.5 : o.h * (0.15 + rnd() * 0.3)), x1 = o.x + Math.cos(a2) * r1, z1 = o.z + Math.sin(a2) * r1;
        const y1 = solto ? y0 - o.h * (0.25 + rnd() * 0.45) : altura(x1, z1) - 0.2, sag = solto ? 0 : o.h * (0.05 + rnd() * 0.1), esp = 0.025 + rnd() * 0.035, cor = [0.10 + rnd() * 0.05, 0.11 + rnd() * 0.06, 0.05];
        const SEG = 10, base = P.length / 3;
        for (let s2 = 0; s2 <= SEG; s2++) { const t = s2 / SEG, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = y0 + (y1 - y0) * t - sag * 4 * t * (1 - t) + Math.sin(t * 9 + a) * 0.08;
          for (let q = 0; q < 3; q++) { const ang = q * 2.094; P.push(x + Math.cos(ang) * esp, y, z + Math.sin(ang) * esp); const f = 0.8 + 0.4 * ((q + s2) % 2); C.push(cor[0] * f, cor[1] * f, cor[2] * f); } }
        for (let s2 = 0; s2 < SEG; s2++) for (let q = 0; q < 3; q++) { const a1 = base + s2 * 3 + q, b1 = base + s2 * 3 + (q + 1) % 3, c1 = a1 + 3, d1 = b1 + 3; I.push(a1, c1, b1, b1, c1, d1); } } }
    if (!n) return; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide })); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; cena.add(m); lixo.push(g, m.material); return n; }

  // a versão "perto" de cada árvore, carregada por último (uma de cada vez, para não disputar a rede com o resto)
  async function subirPerto() { if (toque) return; for (const e of Object.values(especies)) { if (parado) return; if (!e.imP || e.perto) continue;
      const obj = await pega(e.id + '-perto.glb'); if (parado || !obj) continue; const P = fundir(obj, 0.0035 * 5 / e.h); if (!P) continue;
      const im = new THREE.InstancedMesh(P.g, P.ms, Math.min(e.lista.length, 40)); im.count = 0; im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true;
      cena.remove(e.imP); e.imP.dispose(); e.imP = im; e.perto = true; cena.add(im); ult = null; } }
  return { arvores, plantas, montarArvores, atualizar, chao, especies, conjuntos, subirPerto, cipos, refrescar: () => { ult = null; }, parar: () => { parado = true; } };
}
