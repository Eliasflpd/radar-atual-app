// ANIMAIS 3D DE VERDADE no Éden: modelos com esqueleto e animações (andar, parar, comer, deitar, voar),
// que passeiam em curvas pelo chão, param, olham, deitam — vistos de qualquer ângulo.
// Modelos do Sketchfab (licenças na lista CREDITOS), texturas reduzidas por scripts/glb-texturas.py.
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/';
export const CREDITOS = [
  'Elefante africano: "African Elephant" (Sketchfab, CC BY)', 'Tigre: "Tiger" (Sketchfab, CC BY)', 'Leoa: "LIONESS – Realistic 3D Model (demo)" (Sketchfab, CC BY-NC — PROVISÓRIO: só uso não comercial; trocar por modelo CC BY/CC0 antes de abrir o NEXUS ao público ou vender)',
  'Sucuri: "Anaconda attack jungle" (Sketchfab, CC BY)', 'Girafa: "Giraffe+motions" (Sketchfab, CC BY-NC — PROVISÓRIO: só uso não comercial; trocar por modelo CC BY/CC0 antes de abrir o NEXUS ao público ou vender)', 'Arara-vermelha: "Scarlet Macaw" (Sketchfab, CC BY)',
];
// especie: arquivo, altura real (m), quantos, velocidade ao andar (m/s), nomes das animações
const ESPECIES = [
  { id: 'elefante', h: 3.3, q: 3, v: 0.95, andar: 'Loco_WalkSlow', parado: ['Stand_01', 'Stand_02', 'Stand_00'], deitar: 'Lying_01', extra: ['Roar'] },
  { id: 'tigre', h: 1.05, q: 2, v: 0.85, giro: Math.PI / 2, andar: 'Walk', parado: ['Eat', 'Howl'], deitar: 'Idle_Lie Prone' },
  { id: 'leoa', h: 1.0, q: 2, v: 1.6, andar: 'Lioness_WalkFast_F', parado: ['Lioness_Idle', 'Lioness_Breathing'] },
  { id: 'girafa', h: 5.2, q: 3, v: 1.3, andar: 'loopWalk', parado: ['loopIdle01', 'loopEating', 'loopIdle01'] },
  { id: 'sucuri', h: 0.45, q: 2, v: 0.35, andar: 'walk', parado: ['idle'], rio: true, comprimento: 6 },
  { id: 'arara', h: 0.6, q: 8, comprimento: 1.1, voa: true, andar: 'Fly01', parado: ['Fly01'] },
];
const ss = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export async function criarAnimais3D(THREE, cena, { base, altura, naAgua, distRio, rios, rnd, lixo, toque, posicoesPerto }) {
  const [{ GLTFLoader }, SU] = await Promise.all([import(CDN + 'loaders/GLTFLoader.js'), import(CDN + 'utils/SkeletonUtils.js')]);
  const loader = new GLTFLoader();
  const sombraTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
  const sombraMat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: sombraTex, transparent: true, opacity: 0.42, depthWrite: false }); lixo.push(sombraTex, sombraMat);
  const sombraGeo = new THREE.PlaneGeometry(1, 1); sombraGeo.rotateX(-Math.PI / 2); lixo.push(sombraGeo);
  const bichos = [];
  const quantos = (q) => Math.max(1, Math.round(q * (toque ? 0.6 : 1)));
  const lugar = (e, k) => { // onde nasce: perto de quem chega (os primeiros) e espalhados pela mata e campos; a sucuri na margem do rio
    if (e.rio) { const c = rios[Math.floor(rnd() * rios.length)], p = c.getPointAt(0.05 + rnd() * 0.4), tg = c.getTangentAt(0.05), w = c === rios[0] ? 16 : 11, sx = rnd() > 0.5 ? 1 : -1; return [p.x - tg.z * sx * (w + 3), p.z + tg.x * sx * (w + 3)]; }
    if (k === 0 && posicoesPerto && posicoesPerto[e.id]) return posicoesPerto[e.id];
    for (let t = 0; t < 40; t++) { const a = rnd() * 6.283, r = 40 + rnd() * 160, x = Math.cos(a) * r, z = Math.sin(a) * r; if (!naAgua(x, z)) return [x, z]; } return [60, 60]; };

  await Promise.all(ESPECIES.map(async (e) => {
    let gltf; try { gltf = await loader.loadAsync(base + 'animal-' + e.id + '.glb'); } catch (err) { console.warn('animal 3D', e.id, err); return; }
    const modelo = gltf.scene; modelo.updateMatrixWorld(true);
    try { const mats = gltf.parser.json.materials || []; const assoc = gltf.parser.associations; const promessas = [];
      modelo.traverse((o) => { if (!o.isMesh || !o.material || o.material.map) return; const info = assoc.get(o.material); const md = info && mats[info.materials]; const sg = md && md.extensions && md.extensions.KHR_materials_pbrSpecularGlossiness;
        if (sg && sg.diffuseTexture) promessas.push(gltf.parser.getDependency('texture', sg.diffuseTexture.index).then((t) => { t.colorSpace = THREE.SRGBColorSpace; o.material.map = t; o.material.color.setRGB(1, 1, 1); o.material.roughness = 0.85; o.material.metalness = 0; o.material.needsUpdate = true; })); });
      await Promise.all(promessas); } catch (err) { console.warn('material antigo', e.id, err); }
    const caixa = new THREE.Box3().setFromObject(modelo), tam = caixa.getSize(new THREE.Vector3());
    const alturaModelo = e.voa ? Math.max(tam.y, 0.0001) : Math.max(tam.y, 0.0001), esc = (e.comprimento ? e.comprimento / Math.max(tam.x, tam.z) : e.h / alturaModelo);
    const clips = Object.fromEntries(gltf.animations.map((c) => [c.name.split('|').pop(), c]));
    for (let k = 0; k < quantos(e.q); k++) {
      const obj = SU.clone(modelo); obj.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.material) { o.material.side = THREE.FrontSide; } } });
      const raiz = new THREE.Group(); obj.scale.setScalar(esc); obj.position.y = -caixa.min.y * esc; if (e.giro !== undefined) obj.rotation.y = e.giro; else if (!e.voa && tam.x > tam.z * 1.25) obj.rotation.y = -Math.PI / 2; raiz.add(obj); cena.add(raiz);
      const mixer = new THREE.AnimationMixer(obj), acoes = {};
      for (const [nm, c] of Object.entries(clips)) acoes[nm] = mixer.clipAction(c);
      const [x, z] = lugar(e, k); window.__a3dInfo = window.__a3dInfo || {}; window.__a3dInfo[e.id] = [tam.x.toFixed(2), tam.y.toFixed(2), tam.z.toFixed(2)]; const b = { e, raiz, mixer, acoes, x, z, rumo: rnd() * 6.283, estado: 'parado', tempo: 2 + rnd() * 6, alvo: null, atual: null, fase: rnd() * 100, alt: e.voa ? 18 + rnd() * 20 : 0 };
      if (false) { const sh = new THREE.Mesh(sombraGeo, sombraMat); const r = Math.max(tam.x, tam.z) * esc * 0.65; sh.scale.set(r, 1, r); b.sombra = sh; cena.add(sh); }
      bichos.push(b); tocar(b, e.voa ? e.andar : e.parado[0], 0);
    }
  }));
  function tocar(b, nome, fade = 0.5) { const a = b.acoes[nome]; if (!a || b.atual === a) return; a.reset(); a.timeScale = 1; a.setEffectiveWeight(1); a.play(); if (b.atual) a.crossFadeFrom(b.atual, fade, false); b.atual = a; }
  function decidir(b) { const e = b.e, r = rnd();
    if (r < 0.55) { // andar até um ponto próximo
      for (let t = 0; t < 10; t++) { const a = b.rumo + (rnd() - 0.5) * 2.2, d = 12 + rnd() * 30; let x = b.x + Math.sin(a) * d, z = b.z + Math.cos(a) * d; const rr = Math.hypot(x, z); if (rr > 260) { x *= 240 / rr; z *= 240 / rr; } if (e.rio ? distRio(x, z)[0] < 34 && !naAgua(x, z) : !naAgua(x, z)) { b.alvo = { x, z }; b.estado = 'andar'; tocar(b, e.andar); return; } }
    }
    if (e.deitar && r > 0.88) { b.estado = 'deitado'; b.tempo = 12 + rnd() * 18; tocar(b, e.deitar, 1.2); return; }
    b.estado = 'parado'; b.tempo = 4 + rnd() * 9; tocar(b, e.parado[Math.floor(rnd() * e.parado.length)], 0.6); }

  const tmp = new THREE.Vector3();
  return {
    bichos,
    atualizar(dt, t, cam) {
      for (const b of bichos) { const e = b.e; b.mixer.update(dt);
        if (e.voa) { // as araras voam em círculos largos sobre a mata, subindo e descendo devagar
          const R = 40 + (b.fase % 7) * 9, w = 0.12 + (b.fase % 3) * 0.03, a = t * w + b.fase; const cx = Math.cos(b.fase) * 120, cz = Math.sin(b.fase * 1.3) * 120;
          const x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R; b.raiz.position.set(x, altura(x, z) + b.alt + Math.sin(t * 0.4 + b.fase) * 4, z); b.raiz.rotation.y = -a + Math.PI; b.raiz.rotation.z = 0.25; b.x = x; b.z = z; continue; }
        if (b.estado === 'andar' && b.alvo) { const dx = b.alvo.x - b.x, dz = b.alvo.z - b.z, d = Math.hypot(dx, dz);
          if (d < 1.2) { b.alvo = null; decidir(b); }
          else { const alvoR = Math.atan2(dx, dz) + Math.sin(t * 0.35 + b.fase) * 0.35, dr = Math.atan2(Math.sin(alvoR - b.rumo), Math.cos(alvoR - b.rumo)); b.rumo += Math.max(-0.9 * dt, Math.min(0.9 * dt, dr));
            const fv = Math.abs(dr) > 0.8 ? 0.45 : 1; if (b.atual) b.atual.timeScale = fv; const v = e.v * dt * fv; const nx = b.x + Math.sin(b.rumo) * v, nz = b.z + Math.cos(b.rumo) * v; if (naAgua(nx, nz) && !e.rio) { b.alvo = null; decidir(b); } else { b.x = nx; b.z = nz; } } }
        else { b.tempo -= dt; if (b.tempo <= 0) decidir(b); }
        // quem chega perto demais assusta os bichos menores: eles se afastam
        if (cam && !e.rio && e.id !== 'elefante') { const dc = Math.hypot(cam.x - b.x, cam.z - b.z); if (dc < 5 && b.estado !== 'andar') { b.rumo = Math.atan2(b.x - cam.x, b.z - cam.z); b.alvo = { x: b.x + Math.sin(b.rumo) * 18, z: b.z + Math.cos(b.rumo) * 18 }; b.estado = 'andar'; tocar(b, e.andar, 0.3); } }
        const y = altura(b.x, b.z); b.raiz.position.set(b.x, y - 0.05, b.z); b.raiz.rotation.y = b.rumo;
        if (b.sombra) b.sombra.position.set(b.x, y + 0.04, b.z); }
    },
    encontrar(id) { const lst = bichos.filter((b) => b.e.id === id); return lst[0] || null; },
    fazerAndarDeLado(b, cam) { const ax = b.x - cam.x, az = b.z - cam.z, al = Math.hypot(ax, az) || 1; b.alvo = { x: b.x + az / al * 16, z: b.z - ax / al * 16 }; b.estado = 'andar'; tocar(b, b.e.andar, 0.4); },
  };
}
