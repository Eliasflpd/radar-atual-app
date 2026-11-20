// NEXUS BÍBLICO — CAMADA ATLAS (folha transparente alinhada ao universo; versão de teste, 20/11/2026).
// Mapa em relevo dourado sobre vidro azul, INFINITO (o mundo inteiro, sem bordas), no MESMO sistema de coordenadas
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

  // ATLAS INFINITO: o mar de vidro continua para todos os lados (sem borda) e o mundo inteiro está no mapa,
  // com alta resolução na região bíblica. O graticulado (latitude/longitude) é calculado no próprio shader.
  const matMar = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { tempo: { value: 0 }, opac: { value: 1 }, cam: { value: new THREE.Vector3() }, longe: { value: 1e6 }, ref: { value: new THREE.Vector4(mapa.cx, mapa.cy, mapa.s, COS) }, cen: { value: new THREE.Vector2(lonC, latC) } },
    vertexShader: 'varying vec3 w; void main(){ vec4 p = modelMatrix * vec4(position, 1.0); w = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }',
    fragmentShader: `uniform float opac; uniform float tempo; uniform vec3 cam; uniform float longe; uniform vec4 ref; uniform vec2 cen; varying vec3 w;
      void main(){
        float lon = cen.x + (w.x - ref.x) / (ref.w * ref.z), lat = cen.y + (w.y - ref.y) / ref.z;
        vec3 fundo = mix(vec3(0.04,0.12,0.30), vec3(0.08,0.24,0.50), clamp(0.5 + lat / 140.0, 0.0, 1.0));
        float onda = 0.03 * sin(lon * 3.0 + tempo * 0.5) * sin(lat * 2.6 - tempo * 0.35);
        vec2 gr = abs(fract(vec2(lon, lat) / 5.0) - 0.5); float px = fwidth(lon / 5.0);
        float grade = (1.0 - smoothstep(0.0, px * 1.5, 0.5 - max(gr.x, gr.y))) * 0.2;
        float fade = 1.0 - smoothstep(longe * 0.35, longe * 0.8, distance(w, cam));
        vec3 cor = fundo + vec3(0.95, 0.78, 0.42) * grade + onda;
        gl_FragColor = opac * vec4(cor * 0.85, 0.6 * fade); }` });
  matMar.extensions = { derivatives: true };
  const mar = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matMar); mar.frustumCulled = false; grupo.add(mar);

  // terra em relevo dourado: uma só geometria para o mundo inteiro (rápido), costa e rios em linhas únicas
  const ouro = new THREE.MeshStandardMaterial({ color: '#C49A48', metalness: 0.55, roughness: 0.62, emissive: '#2E2106', emissiveIntensity: 0.3, transparent: true, depthWrite: false });
  const costa = new THREE.LineBasicMaterial({ color: '#FFE3A3', transparent: true, opacity: 0.9, depthWrite: false });
  opacos.push(ouro, costa);
  const formas = dados.terra.map((anel) => new THREE.Shape(anel.map(([lo, la]) => new THREE.Vector2(X(lo), Y(la)))));
  relevo.add(new THREE.Mesh(new THREE.ExtrudeGeometry(formas, { depth: 1, bevelEnabled: false, curveSegments: 1 }), ouro));
  const segmentos = (aneis, z, fechar) => { const v = []; for (const a of aneis) { for (let i = 0; i < a.length - 1; i++) v.push(X(a[i][0]), Y(a[i][1]), z, X(a[i + 1][0]), Y(a[i + 1][1]), z); if (fechar && a.length > 2) { const u = a[a.length - 1], q = a[0]; v.push(X(u[0]), Y(u[1]), z, X(q[0]), Y(q[1]), z); } } const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); return g2; };
  relevo.add(new THREE.LineSegments(segmentos(dados.terra, 1.02, true), costa));
  const lago = new THREE.MeshStandardMaterial({ color: '#2F6FB8', metalness: 0.3, roughness: 0.2, emissive: '#0B2A55', emissiveIntensity: 0.7, transparent: true, depthWrite: false });
  const rio = new THREE.LineBasicMaterial({ color: '#9CCBFF', transparent: true, opacity: 0.9, depthWrite: false });
  opacos.push(lago, rio);
  const mLagos = new THREE.Mesh(new THREE.ShapeGeometry(dados.lagos.map((anel) => new THREE.Shape(anel.map(([lo, la]) => new THREE.Vector2(X(lo), Y(la)))))), lago); mLagos.position.z = 1.04; relevo.add(mLagos);
  relevo.add(new THREE.LineSegments(segmentos(dados.rios.map((r) => r.pts), 1.06, false), rio));

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
    quadro(t, zoom, camPos, longe, alvoXY, tamanho) { matMar.uniforms.tempo.value = t / 1000; matLug.uniforms.tempo.value = t / 1000; matLug.uniforms.zoom.value = zoom;
      if (camPos) { matMar.uniforms.cam.value.copy(camPos); matMar.uniforms.longe.value = longe; mar.position.set(alvoXY.x, alvoXY.y, 0); mar.scale.set(tamanho, tamanho, 1); } },
    caixa: { x0, x1, y0, y1 }, X, Y,
  };
}
