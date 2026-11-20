// NEXUS BÍBLICO — ATLAS COMO GLOBO DA TERRA (camada Atlas; versão de teste, 20/11/2026).
// Um globo 3D (como no Google Earth): terra em relevo dourado sobre oceano de vidro azul, com a atmosfera em volta.
// Gira-se e aproxima-se até os lugares bíblicos; afastando, sai-se para o espaço, onde ficam as galáxias da Bíblia.
// Dados reais (public/nexus/atlas-dados.json, gerado por scripts/atlas-gerar.cjs):
//   lugares, identificações e versículos: OpenBible.info, Bible Geocoding Data (CC BY 4.0);
//   contornos de terra, rios e lagos: Natural Earth 1:10m (domínio público).
const RAD = Math.PI / 180;

export function criarGloboAtlas(THREE, dados, opcoes) {
  const R = opcoes.raio;
  const grupo = new THREE.Group();          // o centro do globo é a origem do grupo
  const opacos = [];
  const n = (lat, lon) => new THREE.Vector3(Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD));
  // eixo do globo: norte apontando para +y do mundo (de pé diante de quem chega do espaço); lon 35°L (Israel) virado para a câmera inicial
  const base = new THREE.Group(); base.rotation.set(-Math.PI / 2, 0, 0); grupo.add(base);
  const giro = new THREE.Group(); giro.rotation.z = -(35 + 90) * RAD; base.add(giro);   // Jerusalém de frente para o espaço (−y)

  // oceano de vidro azul com graticulado (latitude/longitude) calculado no shader
  const matMar = new THREE.ShaderMaterial({ transparent: true, depthWrite: true,
    uniforms: { opac: { value: 1 }, tempo: { value: 0 } },
    vertexShader: 'varying vec3 p; varying vec3 nn; varying vec3 vw; void main(){ p = normalize(position); nn = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vw = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform float opac; uniform float tempo; varying vec3 p; varying vec3 nn; varying vec3 vw;
      void main(){ float lat = asin(clamp(p.z, -1.0, 1.0)) * 57.2958, lon = atan(p.y, p.x) * 57.2958;
        vec3 fundo = mix(vec3(0.03, 0.10, 0.26), vec3(0.08, 0.24, 0.50), 0.5 + 0.5 * dot(nn, vw));
        vec2 g = abs(fract(vec2(lon, lat) / 10.0) - 0.5); float px = fwidth(lat / 10.0) * 1.5;
        float grade = (1.0 - smoothstep(0.0, px, 0.5 - max(g.x, g.y))) * 0.18;
        float borda = pow(1.0 - max(dot(nn, vw), 0.0), 3.0);
        vec3 cor = fundo + vec3(0.95, 0.78, 0.42) * grade + vec3(0.35, 0.55, 0.95) * borda * 0.5;
        gl_FragColor = vec4(cor, (0.78 + 0.2 * borda) * opac); }` });
  matMar.extensions = { derivatives: true };
  giro.add(new THREE.Mesh(new THREE.SphereGeometry(R, 128, 64), matMar));

  // terra: triangulada em lat/lon, subdividida para acompanhar a curvatura, numa só geometria
  const ouro = new THREE.MeshStandardMaterial({ color: '#C9A04C', metalness: 0.5, roughness: 0.6, emissive: '#2E2106', emissiveIntensity: 0.35, transparent: true });
  opacos.push(ouro);
  const pos = [], idx = [];
  const H = 1.0035;
  function addV(lon, lat) { const v = n(lat, lon).multiplyScalar(R * H); pos.push(v.x, v.y, v.z); return pos.length / 3 - 1; }
  function subdividir(a, b, c, nivel) {   // a,b,c = [lon, lat]
    const L = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1]);
    const m = Math.max(L(a, b), L(b, c), L(c, a));
    if (m <= 2.2 || nivel > 6) { idx.push(addV(...a), addV(...b), addV(...c)); return; }
    const ab = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], bc = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2], ca = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2];
    subdividir(a, ab, ca, nivel + 1); subdividir(ab, b, bc, nivel + 1); subdividir(ca, bc, c, nivel + 1); subdividir(ab, bc, ca, nivel + 1);
  }
  function atravessa(a) { for (let i = 1; i < a.length; i++) if (Math.abs(a[i][0] - a[i - 1][0]) > 180) return true; return false; }
  for (const anel of dados.terra) {
    if (atravessa(anel)) continue;   // atravessa o antimeridiano (salto de longitude)
    const contorno = anel.map(([lo, la]) => new THREE.Vector2(lo, la));
    let tris; try { tris = THREE.ShapeUtils.triangulateShape(contorno, []); } catch (_) { continue; }
    for (const [i, j, k] of tris) subdividir(anel[i], anel[j], anel[k], 0);
  }
  const gTerra = new THREE.BufferGeometry(); gTerra.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gTerra.setIndex(idx); gTerra.computeVertexNormals();
  // normais radiais (relevo suave e sem costuras)
  { const nrm = gTerra.attributes.normal, ps = gTerra.attributes.position; const v = new THREE.Vector3(); for (let i = 0; i < ps.count; i++) { v.fromBufferAttribute(ps, i).normalize(); nrm.setXYZ(i, v.x, v.y, v.z); } }
  giro.add(new THREE.Mesh(gTerra, ouro));
  const linhas = (aneis, h, fechar) => { const v = []; for (const a of aneis) { if (atravessa(a)) continue; for (let i = 0; i < a.length - 1; i++) { const p1 = n(a[i][1], a[i][0]).multiplyScalar(R * h), p2 = n(a[i + 1][1], a[i + 1][0]).multiplyScalar(R * h); v.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z); } if (fechar && a.length > 2) { const p1 = n(a[a.length - 1][1], a[a.length - 1][0]).multiplyScalar(R * h), p2 = n(a[0][1], a[0][0]).multiplyScalar(R * h); v.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); return g; };
  const costa = new THREE.LineBasicMaterial({ color: '#FFE3A3', transparent: true, opacity: 0.85 }), rio = new THREE.LineBasicMaterial({ color: '#9CCBFF', transparent: true, opacity: 0.85 });
  opacos.push(costa, rio);
  giro.add(new THREE.LineSegments(linhas(dados.terra, H + 0.0003, true), costa));
  giro.add(new THREE.LineSegments(linhas(dados.rios.map((r) => r.pts), H + 0.0005, false), rio));
  const lago = new THREE.MeshStandardMaterial({ color: '#2F6FB8', metalness: 0.3, roughness: 0.25, emissive: '#0B2A55', emissiveIntensity: 0.7, transparent: true }); opacos.push(lago);
  { const pl = [], il = []; for (const anel of dados.lagos) { let tris; try { tris = THREE.ShapeUtils.triangulateShape(anel.map(([lo, la]) => new THREE.Vector2(lo, la)), []); } catch (_) { continue; } const b0 = pl.length / 3; anel.forEach(([lo, la]) => { const v = n(la, lo).multiplyScalar(R * (H + 0.0004)); pl.push(v.x, v.y, v.z); }); for (const [i, j, k] of tris) il.push(b0 + i, b0 + j, b0 + k); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pl, 3)); g.setIndex(il); g.computeVertexNormals(); giro.add(new THREE.Mesh(g, lago)); }

  // atmosfera (halo azul, como vista do espaço)
  const matAtm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending, uniforms: { opac: { value: 1 } },
    vertexShader: 'varying vec3 nn; varying vec3 vw; void main(){ nn = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vw = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float opac; varying vec3 nn; varying vec3 vw; void main(){ float k = pow(max(0.0, 1.0 - abs(dot(nn, vw)) * 1.15), 2.2); gl_FragColor = vec4(vec3(0.35, 0.6, 1.0) * k * 0.9 * opac, k * opac); }' });
  giro.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 96, 48), matAtm));

  // lugares (pontos dourados; os do outro lado do globo somem)
  const lugares = dados.lugares.map((l, i) => ({ ...l, i, peso: l.versos.length, local: n(l.lat, l.lon).multiplyScalar(R * (H + 0.0012)) }));
  const porVerso = new Map(); for (const l of lugares) for (const k of l.versos) { const a = porVerso.get(k) || []; a.push(l.i); porVerso.set(k, a); }
  const gLug = new THREE.BufferGeometry();
  gLug.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lugares.flatMap((l) => [l.local.x, l.local.y, l.local.z])), 3));
  gLug.setAttribute('tam', new THREE.BufferAttribute(new Float32Array(lugares.map((l) => 3.5 + Math.min(11, Math.log2(1 + l.peso) * 1.6))), 1));
  gLug.setAttribute('brilho', new THREE.BufferAttribute(new Float32Array(lugares.length).fill(0.75), 1).setUsage(THREE.DynamicDrawUsage));
  gLug.setAttribute('incerto', new THREE.BufferAttribute(new Float32Array(lugares.map((l) => (l.conf < 300 ? 1 : 0))), 1));
  const matLug = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { px: { value: Math.min(devicePixelRatio || 1, 2) }, tempo: { value: 0 }, zoom: { value: 1 }, opac: { value: 1 } },
    vertexShader: `attribute float tam; attribute float brilho; attribute float incerto; uniform float px; uniform float tempo; uniform float zoom; varying float b; varying float inc; varying float frente;
      void main(){ b = brilho; inc = incerto; vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 nrm = normalize(normalMatrix * normalize(position)); frente = dot(nrm, normalize(-mv.xyz));
        float pulso = brilho > 1.1 ? 1.0 + 0.25 * sin(tempo * 4.0 + position.x) : 1.0; gl_PointSize = tam * px * zoom * pulso * (brilho > 1.1 ? 1.7 : 1.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float opac; varying float b; varying float inc; varying float frente; void main(){ if (frente < 0.02) discard; float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
      float nucleo = smoothstep(0.24, 0.12, d); float anel = smoothstep(0.5, 0.42, d) * smoothstep(0.3, 0.38, d);
      vec3 cor = b > 1.1 ? vec3(1.0, 0.97, 0.86) : vec3(1.0, 0.82, 0.45);
      float a = inc > 0.5 ? anel * 0.9 : (nucleo + anel * 0.7); gl_FragColor = vec4(cor * min(b, 1.6), a * min(1.0, b) * opac * smoothstep(0.02, 0.15, frente)); }` });
  const pontos = new THREE.Points(gLug, matLug); pontos.frustumCulled = false; pontos.renderOrder = 30; giro.add(pontos);

  // sequência de citação (arcos de círculo máximo, tracejados) — NÃO é rota histórica
  const matRota = new THREE.LineDashedMaterial({ color: '#FFD98A', dashSize: R * 0.006, gapSize: R * 0.004, transparent: true, depthWrite: false }); opacos.push(matRota);
  let rota = null;
  function definirRota(ids) {
    if (rota) { giro.remove(rota); rota.geometry.dispose(); rota = null; }
    if (!ids || ids.length < 2) return;
    const pts = [];
    for (let k = 0; k < ids.length - 1; k++) { const a = lugares[ids[k]].local.clone().normalize(), b = lugares[ids[k + 1]].local.clone().normalize(); const ang = a.angleTo(b), passos = Math.max(2, Math.ceil(ang / (1 * RAD))); for (let s = 0; s <= passos; s++) { const t = s / passos; const v = new THREE.Vector3().copy(a).multiplyScalar(Math.sin((1 - t) * ang)).addScaledVector(b, Math.sin(t * ang)).divideScalar(Math.sin(ang) || 1); pts.push(v.normalize().multiplyScalar(R * (H + 0.002 + 0.01 * Math.sin(t * Math.PI) * Math.min(1, ang * 3)))); } }
    rota = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matRota); rota.computeLineDistances(); rota.renderOrder = 31; giro.add(rota);
  }

  let acesos = new Set();
  function aplicar() { const b = gLug.attributes.brilho; for (let i = 0; i < lugares.length; i++) b.setX(i, acesos.has(i) ? 1.6 : (acesos.size ? 0.32 : 0.75)); b.needsUpdate = true; }
  opacos.forEach((m) => { m.userData.base = m.opacity; });
  const tmp = new THREE.Vector3();

  return {
    grupo, lugares, porVerso, raio: R,
    // posição no mundo de um lugar e se ele está virado para a câmera
    posMundo(l) { return giro.localToWorld(tmp.copy(l.local)).clone(); },
    deFrente(l, camPos) { const w = giro.localToWorld(tmp.copy(l.local)); const c = grupo.getWorldPosition(new THREE.Vector3()); const nrm = w.clone().sub(c).normalize(); return nrm.dot(camPos.clone().sub(w).normalize()) > 0.05; },
    centroMundo() { return grupo.getWorldPosition(new THREE.Vector3()); },
    // direção (no mundo) do ponto lat/lon e o "norte" local nesse ponto
    direcao(lat, lon) { grupo.updateMatrixWorld(true); return n(lat, lon).applyQuaternion(giro.getWorldQuaternion(new THREE.Quaternion())).normalize(); },
    latLonDe(pMundo) { const c = this.centroMundo(); const v = pMundo.clone().sub(c).applyQuaternion(giro.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize(); return { lat: Math.asin(v.z) / RAD, lon: Math.atan2(v.y, v.x) / RAD }; },
    acender(ids) { acesos = new Set(ids); aplicar(); }, acesos: () => acesos, definirRota,
    opacidade(o) { matMar.uniforms.opac.value = o; matLug.uniforms.opac.value = o; matAtm.uniforms.opac.value = o; opacos.forEach((m) => { m.opacity = m.userData.base * o; }); },
    quadro(t, zoom) { matLug.uniforms.tempo.value = t / 1000; matLug.uniforms.zoom.value = zoom; matMar.uniforms.tempo.value = t / 1000; },
    triangulos: () => idx.length / 3,
  };
}
