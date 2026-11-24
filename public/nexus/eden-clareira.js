// A CLAREIRA DO RIACHO (Éden): o riacho estreito e calmo que desce de uma pequena queda na encosta, pedras cobertas de musgo
// nas margens, samambaias, arbustos, raízes e um tronco caído — modelos 3D reais do Poly Haven (CC0, fotogrametria).
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/';
export const CREDITOS = ['Pedras com musgo, rocha, samambaia, arbusto e tronco: Poly Haven (CC0) — rock_moss_set_01/02, boulder_01, fern_02, shrub_02, dead_tree_trunk_02'];

export async function criarClareira(THREE, cena, { base, altura, rio, largura, carregar, lixo, toque, rnd, unif, distRio }) {
  const { GLTFLoader } = await import(CDN + 'loaders/GLTFLoader.js'); const loader = new GLTFLoader();
  const pega = async (n) => { try { return (await loader.loadAsync(base + n)).scene; } catch (e) { console.warn('clareira', n, e); return null; } };
  const [pedras1, pedras2, rocha, samambaia, arbusto, tronco] = await Promise.all(['ph-rock_moss_set_01.glb', 'ph-rock_moss_set_02.glb', 'ph-boulder_01.glb', 'ph-fern_02.glb', 'ph-shrub_02.glb', 'ph-dead_tree_trunk_02.glb'].map(pega));
  // cada peça do modelo vira um "carimbo" que se repete muitas vezes (InstancedMesh): leve até no tablet
  const carimbos = (cenaModelo) => { const lst = []; if (!cenaModelo) return lst; cenaModelo.updateMatrixWorld(true); cenaModelo.traverse((o) => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); g.computeBoundingBox(); const bb = g.boundingBox; g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2); g.computeBoundingBox(); lst.push({ g, m: o.material }); } }); return lst; };
  if (rocha) rocha.traverse((o) => { if (o.isMesh && o.material) o.material.color.setHex(0xc4cbb4); });   // a rocha grande, mais úmida e esverdeada como as da mata
  const C = { pedra: [...carimbos(pedras1), ...carimbos(pedras2)], rocha: carimbos(rocha), samambaia: carimbos(samambaia), arbusto: carimbos(arbusto), tronco: carimbos(tronco) };
  const colocar = (lista, pontos, alvoTam, giroLivre = true) => { if (!lista.length || !pontos.length) return; const porPeca = lista.map(() => []); pontos.forEach((p, i) => porPeca[i % lista.length].push(p));
    lista.forEach(({ g, m }, k) => { const pts = porPeca[k]; if (!pts.length) return; const tam = g.boundingBox.getSize(new THREE.Vector3()); const base = Math.max(tam.x, tam.y, tam.z) || 1;
      const im = new THREE.InstancedMesh(g, m, pts.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
      pts.forEach((p, i) => { const e = (p.tam || alvoTam) / base * (0.75 + rnd() * 0.5); Q.setFromAxisAngle(Y, giroLivre ? rnd() * 6.283 : (p.giro || 0)); S.set(e, e, e); P.set(p.x, altura(p.x, p.z) - (p.enterra || 0.12) * e * tam.y, p.z); M.compose(P, Q, S); im.setMatrixAt(i, M); });
      im.frustumCulled = false; cena.add(im); lixo.push(im); }); };
  // pontos ao longo das margens do riacho
  const margens = (n, afast0, afast1, u0 = 0.02, u1 = 0.95) => Array.from({ length: n }, () => { const u = u0 + rnd() * (u1 - u0), p = rio.getPointAt(u), tg = rio.getTangentAt(u), sx = rnd() > 0.5 ? 1 : -1, d = largura * (afast0 + rnd() * (afast1 - afast0)); return { x: p.x - tg.z * sx * d, z: p.z + tg.x * sx * d, u }; });
  const T = toque ? 0.6 : 1; window.__clrInfo = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, v.length + ':' + v.map((c) => c.g.boundingBox.getSize(new THREE.Vector3()).toArray().map((n) => n.toFixed(2)).join('x')).join(',')]));
  colocar(C.pedra, [...margens(Math.round(70 * T), 0.85, 1.6), ...margens(Math.round(16 * T), -0.4, 0.4, 0.05, 0.9).map((p) => ({ ...p, tam: 0.7, enterra: 0.45 }))], 1.6);   // pedras na beira e algumas dentro d'água
  colocar(C.rocha, margens(Math.round(8 * T), 1.6, 3.2, 0.1, 0.8), 3.4);
  colocar(C.samambaia, [...margens(Math.round(140 * T), 1.3, 4.5), ...margens(Math.round(50 * T), 4, 9)], 1.5);
  colocar(C.arbusto, margens(Math.round(40 * T), 2.5, 8), 2.2);
  colocar(C.tronco, margens(2, 2.2, 3.5, 0.3, 0.6), 9);
  // a pequena queda onde o riacho nasce: a foto da cascata na rocha com mata, presa na encosta, com a água descendo por cima
  const p0 = rio.getPointAt(0), t0 = rio.getTangentAt(0), fachada = await carregar('cachoeira-real.png');
  if (fachada) { const L = 13, H = 20.8, g = new THREE.PlaneGeometry(L, H), m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: fachada, alphaTest: 0.5, color: 0xf2f2ec, side: THREE.DoubleSide }));
    const px = p0.x - t0.x * 4, pz = p0.z - t0.z * 4; m.position.set(px, altura(p0.x, p0.z) - 1.2 + H / 2, pz); m.rotation.y = Math.atan2(t0.x, t0.z); cena.add(m); lixo.push(g, m.material);
    // a água que desce (faixa animada estreita por cima da queda da foto)
    const ga = new THREE.PlaneGeometry(2.2, H * 0.82, 1, 24); const ma = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { t: unif.t },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `uniform float t; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){ vec2 q = vec2(vUv.x * 14., vUv.y * 6. + t * 3.2); float v = n(q * vec2(1., .3)) * .6 + n(q * vec2(3., 1.)) * .4; float bord = smoothstep(0., .25, vUv.x) * smoothstep(1., .75, vUv.x); float a = smoothstep(.45, .8, v) * bord * .55; gl_FragColor = vec4(vec3(.95, .98, 1.) * a, a); }` });
    const fa = new THREE.Mesh(ga, ma); fa.position.set(px + t0.x * 0.25, altura(p0.x, p0.z) - 1.2 + H * 0.41 + 0.5, pz + t0.z * 0.25); fa.rotation.y = m.rotation.y; fa.renderOrder = 3; cena.add(fa); lixo.push(ga, ma); }
  // FEIXES DE LUZ atravessando a copa (faixas inclinadas, suaves, que tremem devagar) e NÉVOA rasteira sobre a água
  const gf = new THREE.PlaneGeometry(1, 1, 1, 1); gf.translate(0, -0.5, 0);
  const mf = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { t: unif.t },
    vertexShader: 'varying vec2 vUv; varying float vS; attribute float semente; void main(){ vUv = uv; vS = semente; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float t; varying vec2 vUv; varying float vS; void main(){ float x = abs(vUv.x - .5) * 2.; float a = (1. - x * x) * smoothstep(0., .35, vUv.y) * smoothstep(1., .7, vUv.y); a *= .22 + .08 * sin(t * .4 + vS * 6.); gl_FragColor = vec4(vec3(1., .95, .78) * a, a); }' });
  const NF = toque ? 8 : 14, feixes = new THREE.InstancedMesh(gf, mf, NF), sem = new Float32Array(NF), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E3 = new THREE.Euler();
  for (let i = 0; i < NF; i++) { const u = 0.08 + rnd() * 0.6, p = rio.getPointAt(u), tg = rio.getTangentAt(u), lado = (rnd() * 2 - 1) * 9, x = p.x - tg.z * lado, z = p.z + tg.x * lado;
    E3.set(0.38, 0.6 + rnd() * 0.2, 0.12); Q.setFromEuler(E3); M.compose(new THREE.Vector3(x, altura(x, z) + 30, z), Q, new THREE.Vector3(1.6 + rnd() * 2.6, 34, 1)); feixes.setMatrixAt(i, M); sem[i] = rnd(); }
  gf.setAttribute('semente', new THREE.InstancedBufferAttribute(sem, 1)); feixes.frustumCulled = false; feixes.renderOrder = 4; cena.add(feixes); lixo.push(gf, mf);
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const cx = cv.getContext('2d'), gr = cx.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
  const tn = new THREE.CanvasTexture(cv); lixo.push(tn);
  for (let i = 0; i < (toque ? 10 : 18); i++) { const u = 0.03 + rnd() * 0.8, p = rio.getPointAt(u); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tn, transparent: true, depthWrite: false, opacity: 0.16 + rnd() * 0.1, color: 0xeef3ee, fog: true }));
    sp.position.set(p.x + (rnd() - 0.5) * 4, altura(p.x, p.z) + 0.6 + rnd() * 1.2, p.z + (rnd() - 0.5) * 4); sp.scale.set(9 + rnd() * 6, 2.6 + rnd() * 1.5, 1); cena.add(sp); lixo.push(sp.material); }
  const meio = rio.getPointAt(0.34), tm = rio.getTangentAt(0.34);
  return { origem: [p0.x, p0.z], vista: [meio.x - tm.z * 5.5 + tm.x * 3, meio.z + tm.x * 5.5 + tm.z * 3], olhar: [p0.x, p0.z] };
}
