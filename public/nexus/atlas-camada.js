// NEXUS BÍBLICO — CAMADA ATLAS (folha transparente alinhada ao universo; versão de teste, 20/11/2026).
// Mapa em relevo dourado sobre vidro azul, com rolos dourados e rosa dos ventos, no MESMO sistema de coordenadas
// do universo: a camada fica empilhada acima da camada Bíblia e anda junto com a câmera.
// Dados reais (public/nexus/atlas-dados.json, gerado por scripts/atlas-gerar.cjs):
//   lugares, identificações e versículos: OpenBible.info, Bible Geocoding Data (CC BY 4.0);
//   contornos de terra, rios e lagos: Natural Earth (domínio público).
// A identificação moderna de um lugar antigo tem grau de confiança (0–1000); abaixo de 300 aparece como incerta.
const LAT_REF = 31.5;

export function criarCamadaAtlas(THREE, dados, mapa) {
  // mapa: { cx, cy, s } -> centro (mundo) e unidades do mundo por grau de latitude
  const COS = Math.cos(LAT_REF * Math.PI / 180);
  const c = dados.caixa, lonC = (c.lon0 + c.lon1) / 2, latC = (c.lat0 + c.lat1) / 2;
  const X = (lon) => mapa.cx + (lon - lonC) * COS * mapa.s, Y = (lat) => mapa.cy + (lat - latC) * mapa.s;
  const grupo = new THREE.Group(), relevo = new THREE.Group(); grupo.add(relevo);
  const x0 = X(c.lon0), x1 = X(c.lon1), y0 = Y(c.lat0), y1 = Y(c.lat1);
  const opacos = [];   // materiais comuns (opacidade multiplicada pela da camada)

  // mar de vidro azul com graticulado dourado discreto
  const matMar = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { tempo: { value: 0 }, opac: { value: 1 } },
    vertexShader: 'varying vec2 u; void main(){ u = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float opac; varying vec2 u; uniform float tempo;
      void main(){ vec3 fundo = mix(vec3(0.04,0.13,0.32), vec3(0.09,0.27,0.55), u.y * 0.7 + 0.15);
        float onda = 0.035 * sin(u.x * 46.0 + tempo * 0.5) * sin(u.y * 31.0 - tempo * 0.35);
        vec2 g = abs(fract(u * vec2(13.0, 7.0)) - 0.5); float grade = smoothstep(0.486, 0.5, max(g.x, g.y)) * 0.22;
        float borda = smoothstep(0.0, 0.015, min(min(u.x, 1.0 - u.x), min(u.y, 1.0 - u.y)));
        vec3 cor = fundo + vec3(0.95, 0.78, 0.42) * grade + onda;
        gl_FragColor = opac * vec4(cor * 0.85, 0.62 * borda); }` });
  const mar = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), matMar); mar.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); grupo.add(mar);

  // terra em relevo dourado (a espessura acompanha a separação entre as camadas)
  const ouro = new THREE.MeshStandardMaterial({ color: '#C49A48', metalness: 0.55, roughness: 0.62, emissive: '#2E2106', emissiveIntensity: 0.3, transparent: true, depthWrite: false });
  const costa = new THREE.LineBasicMaterial({ color: '#FFE3A3', transparent: true, opacity: 0.9, depthWrite: false });
  opacos.push(ouro, costa);
  for (const anel of dados.terra) {
    const forma = new THREE.Shape(anel.map(([lo, la]) => new THREE.Vector2(X(lo), Y(la))));
    relevo.add(new THREE.Mesh(new THREE.ExtrudeGeometry(forma, { depth: 1, bevelEnabled: false, curveSegments: 1 }), ouro));
    relevo.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(anel.map(([lo, la]) => new THREE.Vector3(X(lo), Y(la), 1.02))), costa));
  }
  const lago = new THREE.MeshStandardMaterial({ color: '#2F6FB8', metalness: 0.3, roughness: 0.2, emissive: '#0B2A55', emissiveIntensity: 0.7, transparent: true, depthWrite: false });
  const rio = new THREE.LineBasicMaterial({ color: '#9CCBFF', transparent: true, opacity: 0.9, depthWrite: false });
  opacos.push(lago, rio);
  for (const anel of dados.lagos) { const m = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(anel.map(([lo, la]) => new THREE.Vector2(X(lo), Y(la))))), lago); m.position.z = 1.04; relevo.add(m); }
  for (const r of dados.rios) relevo.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(r.pts.map(([lo, la]) => new THREE.Vector3(X(lo), Y(la), 1.06))), rio));

  // rolos dourados e rosa dos ventos
  const rolo = new THREE.MeshStandardMaterial({ color: '#D8B25E', metalness: 0.95, roughness: 0.25, transparent: true, depthWrite: false }); opacos.push(rolo);
  const rRolo = mapa.s * 0.55;
  for (const y of [y0 - rRolo * 1.1, y1 + rRolo * 1.1]) {
    const cil = new THREE.Mesh(new THREE.CylinderGeometry(rRolo, rRolo, x1 - x0 + rRolo * 2.6, 32), rolo); cil.rotation.z = Math.PI / 2; cil.position.set((x0 + x1) / 2, y, 0); grupo.add(cil);
    for (const x of [x0 - rRolo * 2, x1 + rRolo * 2]) { const b = new THREE.Mesh(new THREE.SphereGeometry(rRolo * 1.55, 24, 16), rolo); b.position.set(x, y, 0); grupo.add(b); }
  }
  const tc = document.createElement('canvas'); tc.width = tc.height = 256; const g = tc.getContext('2d'); g.translate(128, 128);
  g.strokeStyle = '#FFE3A3'; g.fillStyle = 'rgba(255,227,163,.9)'; g.lineWidth = 2;
  g.beginPath(); g.arc(0, 0, 100, 0, 6.29); g.stroke(); g.beginPath(); g.arc(0, 0, 88, 0, 6.29); g.stroke();
  for (let k = 0; k < 8; k++) { g.save(); g.rotate(k * Math.PI / 4); const L = k % 2 ? 62 : 104; g.beginPath(); g.moveTo(0, -L); g.lineTo(10, 0); g.lineTo(-10, 0); g.closePath(); g.fill(); g.restore(); }
  g.font = '700 26px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', 0, -112); g.fillText('S', 0, 112); g.fillText('L', 112, 0); g.fillText('O', -112, 0);
  const tex = new THREE.CanvasTexture(tc); tex.colorSpace = THREE.SRGBColorSpace;
  const matRosa = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }); opacos.push(matRosa);
  const rosa = new THREE.Mesh(new THREE.PlaneGeometry(mapa.s * 7, mapa.s * 7), matRosa); rosa.position.set(X(-6.5), Y(14), 2); grupo.add(rosa);

  // lugares
  const lugares = dados.lugares.map((l, i) => ({ ...l, i, x: X(l.lon), y: Y(l.lat), peso: l.versos.length }));
  const porVerso = new Map(); for (const l of lugares) for (const k of l.versos) { const a = porVerso.get(k) || []; a.push(l.i); porVerso.set(k, a); }
  const gLug = new THREE.BufferGeometry();
  gLug.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lugares.flatMap((l) => [l.x, l.y, 1.2])), 3));
  gLug.setAttribute('tam', new THREE.BufferAttribute(new Float32Array(lugares.map((l) => 3.5 + Math.min(11, Math.log2(1 + l.peso) * 1.6))), 1));
  gLug.setAttribute('brilho', new THREE.BufferAttribute(new Float32Array(lugares.length).fill(0.75), 1).setUsage(THREE.DynamicDrawUsage));
  gLug.setAttribute('incerto', new THREE.BufferAttribute(new Float32Array(lugares.map((l) => (l.conf < 300 ? 1 : 0))), 1));
  const matLug = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, uniforms: { px: { value: Math.min(devicePixelRatio || 1, 2) }, tempo: { value: 0 }, zoom: { value: 1 }, opac: { value: 1 } },
    vertexShader: `attribute float tam; attribute float brilho; attribute float incerto; uniform float px; uniform float tempo; uniform float zoom; varying float b; varying float inc;
      void main(){ b = brilho; inc = incerto; float pulso = brilho > 1.1 ? 1.0 + 0.25 * sin(tempo * 4.0 + position.x * 0.01) : 1.0; gl_PointSize = tam * px * zoom * pulso * (brilho > 1.1 ? 1.7 : 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float opac; varying float b; varying float inc; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
      float nucleo = smoothstep(0.24, 0.12, d); float anel = smoothstep(0.5, 0.42, d) * smoothstep(0.3, 0.38, d);
      vec3 cor = b > 1.1 ? vec3(1.0, 0.97, 0.86) : vec3(1.0, 0.82, 0.45);
      float a = inc > 0.5 ? anel * 0.9 : (nucleo + anel * 0.7); gl_FragColor = opac * vec4(cor * a * min(b, 1.6), a * min(1.0, b)); }` });
  const pontos = new THREE.Points(gLug, matLug); pontos.frustumCulled = false; grupo.add(pontos);

  // sequência de citação (linha tracejada dourada) — NÃO é rota histórica: só a ordem em que o texto cita os lugares
  const matRota = new THREE.LineDashedMaterial({ color: '#FFD98A', dashSize: mapa.s * 0.5, gapSize: mapa.s * 0.3, transparent: true, depthWrite: false, depthTest: false }); opacos.push(matRota);
  let rota = null;
  function definirRota(ids) {
    if (rota) { grupo.remove(rota); rota.geometry.dispose(); rota = null; }
    if (!ids || ids.length < 2) return;
    rota = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ids.map((i) => new THREE.Vector3(lugares[i].x, lugares[i].y, 1.3))), matRota);
    rota.computeLineDistances(); rota.scale.z = esp; grupo.add(rota);
  }

  let acesos = new Set(), esp = 1;
  function aplicar() { const b = gLug.attributes.brilho; for (let i = 0; i < lugares.length; i++) b.setX(i, acesos.has(i) ? 1.6 : (acesos.size ? 0.32 : 0.75)); b.needsUpdate = true; }
  opacos.forEach((m) => { m.userData.base = m.opacity; });

  return {
    grupo, lugares, porVerso,
    altura: 1.2,   // altura dos lugares sobre a folha (multiplicada pela espessura do relevo)
    acender(ids) { acesos = new Set(ids); aplicar(); },
    acesos: () => acesos,
    definirRota,
    opacidade(o) { matMar.uniforms.opac.value = o; matLug.uniforms.opac.value = o; opacos.forEach((m) => { m.opacity = m.userData.base * o; }); },
    espessura(e) { relevo.scale.z = e; pontos.scale.z = e; if (rota) rota.scale.z = e; esp = e; },
    zLugar: () => 1.2 * esp,
    quadro(t, zoom) { matMar.uniforms.tempo.value = t / 1000; matLug.uniforms.tempo.value = t / 1000; matLug.uniforms.zoom.value = zoom; },
    caixa: { x0, x1, y0, y1 },
  };
}
