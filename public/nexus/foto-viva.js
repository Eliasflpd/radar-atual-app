// FOTO VIVA: uma imagem fotorrealista vira um lugar com volume. Cada pixel volta para a sua distância (mapa de profundidade
// calculado antes, Depth Anything V2), a câmera se mexe um pouco (andar curto, olhar em volta) e por cima ficam vivos:
// a água que corre (riacho e cachoeira), a névoa, os feixes de luz, as folhas que balançam e o pó que brilha no sol.
// cfg: { foto, prof, perto, longe, fov, agua: [[u,v]...] (polígono do riacho, v de cima para baixo), queda: [u0,v0,u1,v1],
//        feixes: [[u,v,ang,larg]...], nevoa: [[u,v,raio]...] }
export async function abrirFotoViva(THREE, host, cfg) {
  const W = () => host.clientWidth || innerWidth, H = () => host.clientHeight || innerHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(W(), H());
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab'; host.appendChild(renderer.domElement);
  const cena = new THREE.Scene(), carregador = new THREE.TextureLoader();
  const [tFoto, tProf] = await Promise.all([cfg.foto, cfg.prof].map((u) => carregador.loadAsync(u)));
  tFoto.colorSpace = THREE.SRGBColorSpace; tFoto.anisotropy = 8; tFoto.wrapS = tFoto.wrapT = tProf.wrapS = tProf.wrapT = THREE.MirroredRepeatWrapping; tFoto.minFilter = THREE.LinearMipmapLinearFilter;
  const aspecto = tFoto.image.width / tFoto.image.height, fov = cfg.fov || 52;
  const camera = new THREE.PerspectiveCamera(fov, W() / H(), 0.05, 2000);
  // a malha: uma grade que cobre a imagem; o vértice vai para a distância que a profundidade manda, no raio da câmera original
  const NX = 640, NY = Math.round(NX / aspecto), geo = new THREE.PlaneGeometry(1, 1, NX, NY);
  const tg = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  { const uvA = geo.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * 1.4 - 0.2, uvA.getY(i) * 1.4 - 0.2); }   // a malha passa um pouco da borda da foto (a borda se estende), para nunca aparecer o vazio
  const ajustaFov = () => { const a = W() / H(); camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(0.9 * Math.min(tg, tg * aspecto / a))); camera.aspect = a; camera.updateProjectionMatrix(); }; ajustaFov();
  const agua = (cfg.agua || []).flat(), queda = cfg.queda || [0, 0, 0, 0];
  const poli = new Float32Array(32); agua.forEach((n, i) => { if (i < 32) poli[i] = n; });
  const unif = { t: { value: 0 }, foto: { value: tFoto }, prof: { value: tProf }, tg: { value: tg }, asp: { value: aspecto }, perto: { value: cfg.perto || 1.6 }, longe: { value: cfg.longe || 70 },
    poli: { value: poli }, np: { value: Math.min(16, agua.length / 2) }, queda: { value: new THREE.Vector4(...queda) }, vento: { value: 1 } };
  const comum = `uniform float t, tg, asp, perto, longe, np, vento; uniform sampler2D foto, prof; uniform float poli[32]; uniform vec4 queda;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p){ float s = 0., a = .5; for (int k = 0; k < 4; k++) { s += a * n(p); p *= 2.03; a *= .5; } return s; }
    float dentro(vec2 q){ bool c = false; int N = int(np); for (int i = 0; i < 16; i++) { if (i >= N) break; int j = i == 0 ? N - 1 : i - 1; vec2 a = vec2(poli[i * 2], poli[i * 2 + 1]), b = vec2(poli[j * 2], poli[j * 2 + 1]);
      if (((a.y > q.y) != (b.y > q.y)) && (q.x < (b.x - a.x) * (q.y - a.y) / (b.y - a.y) + a.x)) c = !c; } return c ? 1. : 0.; }
    float dist(float d){ return 1. / (d * (1. / perto - 1. / longe) + 1. / longe); }`;
  const mat = new THREE.ShaderMaterial({ uniforms: unif, side: THREE.DoubleSide,
    vertexShader: comum + `
      varying vec2 vUv; varying float vD;
      void main(){ vUv = uv; vec2 im = vec2(uv.x, 1. - uv.y); float d = texture2D(prof, uv).r; float z = dist(d);
        vec2 nd = uv * 2. - 1.; vec3 p = vec3(nd.x * tg * asp * z, nd.y * tg * z, -z);
        // folhas perto da câmera (em cima e nos cantos) balançam com o vento
        float folha = smoothstep(.35, .7, d) * (smoothstep(.5, .0, im.y) + smoothstep(.75, 1., im.y) * .6);
        float bal = (fbm(vec2(uv.x * 3. + t * .35, uv.y * 3.)) - .5) * folha * vento;
        p.x += bal * .06 * z * .1; p.y += bal * .03 * z * .1;
        vD = z; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`,
    fragmentShader: comum + `
      varying vec2 vUv; varying float vD;
      void main(){ vec2 uv = vUv; vec2 im = vec2(uv.x, 1. - uv.y);
        // o RIACHO: a imagem é amostrada com um deslocamento que corre em direção a quem olha, com brilho móvel
        float a = (dentro(im) * 2. + dentro(im + vec2(.012, 0.)) + dentro(im - vec2(.012, 0.)) + dentro(im + vec2(0., .012)) + dentro(im - vec2(0., .012))) / 6.;   // borda suave
        vec3 c = texture2D(foto, uv).rgb;
        if (a > .01) { float perspectiva = mix(4., 22., smoothstep(.95, .55, im.y));
          vec2 q = vec2(im.x * 30., im.y * perspectiva - t * 1.6);
          vec2 off = vec2(fbm(q) - .5, fbm(q + 7.3) - .5) * vec2(.006, .010) * smoothstep(.55, .9, im.y + .2) * a;
          vec3 cw = texture2D(foto, uv + off).rgb; float br = pow(fbm(q * vec2(.6, 1.4) + 3.), 4.) * 1.4; cw += vec3(.95, .97, 1.) * br * .22; c = mix(c, cw, a); }
        // a CACHOEIRA: a água desce (faixas que escorrem) e espuma embaixo
        if (im.x > queda.x && im.x < queda.z && im.y > queda.y && im.y < queda.w) { vec2 qq = vec2((im.x - queda.x) / (queda.z - queda.x), (im.y - queda.y) / (queda.w - queda.y));
          float lum = dot(c, vec3(.3, .59, .11)); float agua = smoothstep(.45, .7, lum);
          float fio = n(vec2(qq.x * 40., qq.y * 6. - t * 4.5)) * .6 + n(vec2(qq.x * 90., qq.y * 14. - t * 7.)) * .4;
          c = mix(c, c * .75 + vec3(.95) * fio * .45, agua * .85); c += vec3(1.) * smoothstep(.8, 1., qq.y) * fio * .15 * agua; }
        gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }` });
  const malha = new THREE.Mesh(geo, mat); malha.frustumCulled = false; cena.add(malha);
  // posição 3D de um ponto (u,v da imagem, v de cima para baixo) a uma profundidade relativa d
  const prof8 = await (async () => { const c = document.createElement('canvas'), img = tProf.image; c.width = 256; c.height = Math.round(256 / aspecto); const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height); return { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data }; })();
  const dAt = (u, v) => prof8.d[(Math.min(prof8.h - 1, Math.floor(v * prof8.h)) * prof8.w + Math.min(prof8.w - 1, Math.floor(u * prof8.w))) * 4] / 255;
  const dist = (d) => 1 / (d * (1 / unif.perto.value - 1 / unif.longe.value) + 1 / unif.longe.value);
  const ponto = (u, v, z) => { z = z || dist(dAt(u, v)); return new THREE.Vector3((u * 2 - 1) * tg * aspecto * z, (1 - v * 2) * tg * z, -z); };
  // FEIXES DE LUZ: faixas aditivas inclinadas que descem da copa, respirando devagar
  const lixo = [geo, mat, tFoto, tProf];
  const gF = new THREE.PlaneGeometry(1, 1); gF.translate(0, -0.5, 0); lixo.push(gF);
  const mF = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { t: unif.t, s: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float t, s; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ float x = abs(vUv.x - .5) * 2.; float faixa = n(vec2(vUv.x * 7. + s * 9., t * .08)); float a = (1. - x) * (1. - x) * smoothstep(0., .5, vUv.y) * smoothstep(1., .85, vUv.y) * (.35 + .65 * faixa);
        a *= .16 + .06 * sin(t * .5 + s * 11.); gl_FragColor = vec4(vec3(1., .93, .74) * a, a); }` });
  (cfg.feixes || []).forEach(([u, v, ang, larg, compr, zf], i) => { const p = ponto(u, v, zf || 14), m = mF.clone(); m.uniforms = { t: unif.t, s: { value: i * 0.37 } }; const f = new THREE.Mesh(gF, m);
    f.position.copy(p); f.rotation.z = ang; f.scale.set(larg * p.length() * 0.06, (compr || 1) * p.length() * 0.7, 1); f.lookAt(0, p.y, 0); f.rotateZ(ang); f.renderOrder = 2; cena.add(f); lixo.push(m); });
  // NÉVOA: véus que derivam devagar (na queda e entre as árvores do fundo)
  const mN = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { t: unif.t, s: { value: 0 }, op: { value: 0.3 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float t, s, op; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ vec2 c = vUv - .5; float r = length(c * vec2(1., 2.2)); float v = n(vUv * vec2(3., 2.) + vec2(t * .05 + s, t * .02)) * .6 + n(vUv * vec2(7., 4.) - vec2(t * .08, 0.) + s) * .4;
        float a = smoothstep(.5, .1, r) * smoothstep(.3, .75, v) * op; gl_FragColor = vec4(vec3(.93, .95, .92) * a, a); }` });
  const gN = new THREE.PlaneGeometry(1, 1); lixo.push(gN);
  (cfg.nevoa || []).forEach(([u, v, raio, op], i) => { const p = ponto(u, v), m = mN.clone(); m.uniforms = { t: unif.t, s: { value: i * 3.1 }, op: { value: op || 0.3 } }; const nv = new THREE.Mesh(gN, m);
    nv.position.copy(p).multiplyScalar(0.97); const L = raio * p.length() * 1.2; nv.scale.set(L, L * 0.45, 1); nv.lookAt(0, 0, 0); nv.renderOrder = 3; cena.add(nv); lixo.push(m); });
  // PÓ NO SOL: partículas que flutuam e piscam dentro dos feixes
  const NP = 500, pp = new Float32Array(NP * 3), ps = new Float32Array(NP); const fx = cfg.feixes || [];
  for (let i = 0; i < NP; i++) { const f = fx[i % Math.max(1, fx.length)] || [0.5, 0.5, 0, 1]; const z = 2 + Math.random() * 14; const q = ponto(f[0] + (Math.random() - 0.5) * 0.12, f[1] + Math.random() * 0.5, z); pp.set([q.x, q.y, q.z], i * 3); ps[i] = Math.random() * 6.28; }
  const gP = new THREE.BufferGeometry(); gP.setAttribute('position', new THREE.BufferAttribute(pp, 3)); gP.setAttribute('fase', new THREE.BufferAttribute(ps, 1));
  const mP = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: unif.t, px: { value: renderer.getPixelRatio() } },
    vertexShader: 'uniform float t, px; attribute float fase; varying float vA; void main(){ vec3 p = position; p.x += sin(t * .2 + fase) * .3; p.y += sin(t * .13 + fase * 2.) * .25; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = 2.6 * px * (6. / -mv.z); vA = .35 + .35 * sin(t * 1.3 + fase * 5.); }',
    fragmentShader: 'varying float vA; void main(){ float r = length(gl_PointCoord - .5); if (r > .5) discard; gl_FragColor = vec4(vec3(1., .95, .8) * vA * smoothstep(.5, 0., r), 1.); }' });
  const pts = new THREE.Points(gP, mP); pts.frustumCulled = false; cena.add(pts); lixo.push(gP, mP);
  // CÂMERA: olhar em volta (arrastar) e dar uns passos (WASD/setas, ou o dedo); um balanço leve de respiração
  let yaw = 0, pitch = 0, alvoYaw = 0, alvoPitch = 0, px = 0, pz = 0, vx = 0, vz = 0; const teclas = {}; const LIM = cfg.passo || 1.2;
  const el = renderer.domElement; let arr = null;
  el.addEventListener('pointerdown', (e) => { arr = [e.clientX, e.clientY, alvoYaw, alvoPitch]; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; });
  el.addEventListener('pointermove', (e) => { if (!arr) return; alvoYaw = THREE.MathUtils.clamp(arr[2] - (e.clientX - arr[0]) * 0.0025, -0.16, 0.16); alvoPitch = THREE.MathUtils.clamp(arr[3] - (e.clientY - arr[1]) * 0.0022, -0.08, 0.08); });
  const solta = () => { arr = null; el.style.cursor = 'grab'; }; el.addEventListener('pointerup', solta); el.addEventListener('pointercancel', solta);
  const kd = (e) => { teclas[e.key.toLowerCase()] = e.type === 'keydown'; }; addEventListener('keydown', kd); addEventListener('keyup', kd);
  const redim = () => { renderer.setSize(W(), H()); ajustaFov(); }; addEventListener('resize', redim);
  let ativo = true, t0 = performance.now(), ult = t0;
  (function laco(agora) { if (!ativo) return; requestAnimationFrame(laco); agora = agora || performance.now(); const dt = Math.min(0.05, (agora - ult) / 1000); ult = agora; unif.t.value = (agora - t0) / 1000;
    const fr = (teclas.w || teclas.arrowup ? 1 : 0) - (teclas.s || teclas.arrowdown ? 1 : 0), ld = (teclas.d ? 1 : 0) - (teclas.a ? 1 : 0); const gira = (teclas.arrowright ? 1 : 0) - (teclas.arrowleft ? 1 : 0);
    alvoYaw = THREE.MathUtils.clamp(alvoYaw - gira * dt * 0.5, -0.16, 0.16);
    vx += ((Math.cos(yaw) * ld - Math.sin(yaw) * fr) * 0.7 - vx) * Math.min(1, dt * 4); vz += ((-Math.sin(yaw) * ld - Math.cos(yaw) * fr) * 0.7 - vz) * Math.min(1, dt * 4);
    px = THREE.MathUtils.clamp(px + vx * dt, -LIM * 0.3, LIM * 0.3); pz = THREE.MathUtils.clamp(pz + vz * dt, -LIM * 0.7, LIM * 0.15);
    yaw += (alvoYaw - yaw) * Math.min(1, dt * 5); pitch += (alvoPitch - pitch) * Math.min(1, dt * 5);
    const resp = unif.t.value; camera.position.set(px + Math.sin(resp * 0.23) * 0.06, Math.sin(resp * 0.31) * 0.04, pz); camera.rotation.set(pitch, yaw + Math.sin(resp * 0.11) * 0.012, 0, 'YXZ');
    renderer.render(cena, camera); })();
  return { fechar() { ativo = false; removeEventListener('keydown', kd); removeEventListener('keyup', kd); removeEventListener('resize', redim); lixo.forEach((o) => o.dispose && o.dispose()); renderer.dispose(); el.remove(); }, camera, unif };
}
