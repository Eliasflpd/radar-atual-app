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
  const ESF = !!cfg.esfera; const NX = ESF ? 768 : 640, NY = ESF ? 384 : Math.round(NX / aspecto), geo = new THREE.PlaneGeometry(1, 1, NX, NY);
  const tg = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  if (!ESF) { const uvA = geo.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * 1.4 - 0.2, uvA.getY(i) * 1.4 - 0.2); }   // a malha passa um pouco da borda da foto (a borda se estende), para nunca aparecer o vazio
  const ajustaFov = () => { const a = W() / H(); camera.fov = ESF ? (a > 1 ? 68 : 80) : THREE.MathUtils.radToDeg(2 * Math.atan(0.9 * Math.min(tg, tg * aspecto / a))); camera.aspect = a; camera.updateProjectionMatrix(); }; ajustaFov();
  const agua = (cfg.agua || []).flat(), queda = cfg.queda || [0, 0, 0, 0];
  const poli = new Float32Array(32); agua.forEach((n, i) => { if (i < 32) poli[i] = n; });
  const unif = { t: { value: 0 }, foto: { value: tFoto }, prof: { value: tProf }, tg: { value: tg }, asp: { value: aspecto }, perto: { value: cfg.perto || 1.6 }, longe: { value: cfg.longe || 70 },
    poli: { value: poli }, np: { value: Math.min(16, agua.length / 2) }, queda: { value: new THREE.Vector4(...queda) }, vento: { value: 1 },
    sol: { value: new THREE.Vector2(...(cfg.sol || [-1, -1])) }, fluxo: { value: new THREE.Vector2(...(cfg.fluxo || [0, 0.25])) } };   // 360: sol (u,v na foto) para os brilhos na água; fluxo da correnteza no plano da água
  const comum = `uniform float t, tg, asp, perto, longe, np, vento; uniform sampler2D foto, prof; uniform float poli[32]; uniform vec4 queda; uniform vec2 sol, fluxo;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p){ float s = 0., a = .5; for (int k = 0; k < 4; k++) { s += a * n(p); p *= 2.03; a *= .5; } return s; }
    float dentro(vec2 q){ bool c = false; int N = int(np); for (int i = 0; i < 16; i++) { if (i >= N) break; int j = i == 0 ? N - 1 : i - 1; vec2 a = vec2(poli[i * 2], poli[i * 2 + 1]), b = vec2(poli[j * 2], poli[j * 2 + 1]);
      if (((a.y > q.y) != (b.y > q.y)) && (q.x < (b.x - a.x) * (q.y - a.y) / (b.y - a.y) + a.x)) c = !c; } return c ? 1. : 0.; }
    float dist(float d){ return 1. / (d * (1. / perto - 1. / longe) + 1. / longe); }`;
  const mat = new THREE.ShaderMaterial({ uniforms: unif, side: THREE.DoubleSide, defines: { ...(ESF ? { ESFERA: 1 } : {}), ...(cfg.aguaCor ? { AGUACOR: 1 } : {}) },
    vertexShader: comum + `
      varying vec2 vUv; varying float vD;
      void main(){ vUv = uv; vec2 im = vec2(uv.x, 1. - uv.y); float d = texture2D(prof, uv).r;
        #ifdef ESFERA
        { float w = smoothstep(.04, 0., min(uv.x, 1. - uv.x)); d = mix(d, .5 * (texture2D(prof, vec2(.002, uv.y)).r + texture2D(prof, vec2(.998, uv.y)).r), w); }
        #endif
        float z = dist(d);
        vec2 nd = uv * 2. - 1.; vec3 p = vec3(nd.x * tg * asp * z, nd.y * tg * z, -z);
        #ifdef ESFERA
        { float lon = (uv.x - .5) * 6.2831853, lat = (uv.y - .5) * 3.1415927; p = vec3(sin(lon) * cos(lat), sin(lat), -cos(lon) * cos(lat)) * z; }
        #endif
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
        #ifdef AGUACOR
        { float lu = dot(c, vec3(.3, .59, .11)); a *= max(smoothstep(.42, .62, lu), smoothstep(.0, .07, c.b - c.g)); }   // só onde a cor é de água (branca ou azulada), não nas pedras de musgo
        #endif
        // ÁGUA REAL (360 e clareira): ondas no plano da água, a foto refrata e o reflexo se alonga na vertical.
        // A ÚNICA deriva é F = fluxo*t: o padrão anda no sentido de -fluxo (nada de desvio fixo, nada de onda que viaja sozinha)
        #ifdef ESFERA
        bool na = a > .01 && im.y > .502;
        float beta = (im.y - .5) * 3.1415927, D = 1.6 / tan(beta), lon = (im.x - .5) * 6.2831853;
        vec2 P = vec2(sin(lon), cos(lon)) * D;
        #else
        float zz = dist(texture2D(prof, uv).r), D = zz;
        bool na = a > .01;
        vec2 P = vec2((uv.x * 2. - 1.) * tg * asp * zz, zz);   // plano da água pela própria profundidade: x lateral, zz para frente
        #endif
        if (na) {
          vec2 F = fluxo * t;
          float lod = exp(-D / 26.), e = .03 + D * .004;
          #define ONDA(Q) (fbm((Q) * 1.7 + F) * .55 + fbm((Q) * 4.3 + F * 1.6) * .3 * lod + sin(dot((Q) + F, vec2(.83, .55)) * 5.) * .08 * lod)
          float h0 = ONDA(P); vec2 g = vec2(ONDA(P + vec2(e, 0.)) - h0, ONDA(P + vec2(0., e)) - h0) / e;
          #ifdef ESFERA
          float pt = 1. / (1. + D * .35), am = a * smoothstep(.502, .53, im.y);
          vec2 off = vec2(g.x * .003, g.y * .0105) * pt * am;   // o reflexo estica e treme mais na vertical, como na água de verdade
          #else
          float pt = 1. / (1. + zz * .03), am = a;
          vec2 off = vec2(g.x * .004, g.y * .004) * pt * am;
          #endif
          vec3 cw = texture2D(foto, uv + off).rgb + texture2D(foto, uv + off * 1.9).rgb; cw *= .5;
          cw *= 1. + clamp(g.y * .10 * pt, -.12, .14);   // as faces das ondas viradas para o céu clareiam, as outras escurecem
          if (sol.x >= 0.) { float dl = abs(fract(im.x - sol.x + .5) - .5) * 6.2831853;
            float coluna = exp(-dl * dl / (.004 + .05 * (im.y - .5)));   // a faixa de brilho embaixo do sol, mais larga perto
            float brilho = pow(clamp(n(P * 9. + F * 2.) * n(P * 13. + F * 2.) * 1.9, 0., 1.), 7.);
            cw += vec3(1., .93, .78) * brilho * coluna * 2.4 * am; cw += vec3(1., .9, .7) * coluna * .05 * am; }
          c = mix(c, cw, am); }
        // a CACHOEIRA: a própria foto escorre (amostra deslocada para cima, com o tempo), acelerando de cima para baixo.
        // Só a parte branca (água) se mexe; a borda de cima fica parada; embaixo a espuma borbulha; a névoa sobe da base.
        if (im.x > queda.x && im.x < queda.z && im.y > queda.y && im.y < queda.w) { vec2 qq = vec2((im.x - queda.x) / (queda.z - queda.x), (im.y - queda.y) / (queda.w - queda.y));
          float lum = dot(c, vec3(.3, .59, .11)); float agua = smoothstep(.45, .7, lum);
          float mov = smoothstep(0., .25, qq.y);                          // borda de cima parada
          float vel = .5 + 2.4 * qq.y;                                    // mais rápido embaixo
          float fase = fract(t * .35 * vel), fase2 = fract(fase + .5);   // dois ciclos defasados, misturados sem salto
          float wA = 1. - abs(2. * fase - 1.), wB = 1. - wA;
          float A = .05 * (queda.w - queda.y);                            // quanto a amostra sobe no ciclo
          float ond = (n(vec2(qq.x * 9., qq.y * 3. - t * vel)) - .5) * .02 * mov;   // irregularidade na largura dos fios
          vec3 sA = texture2D(foto, uv + vec2(ond, fase * A * mov)).rgb, sB = texture2D(foto, uv + vec2(ond, fase2 * A * mov)).rgb;
          vec3 wat = mix(sB, sA, wA);
          float fi = n(vec2(qq.x * 140. + 2. * n(vec2(qq.x * 9., qq.y * 3. - t * vel)), qq.y * 5. - t * vel * 3.));   // fios finos irregulares
          wat *= .9 + .2 * fi;
          c = mix(c, wat, agua * .9);
          float fm = smoothstep(.72, 1., qq.y);                           // espuma embaixo, borbulhando
          float bol = n(vec2(qq.x * 60., qq.y * 20. - t * 4.)) * n(vec2(qq.x * 25., qq.y * 10. - t * 2.5));
          c += vec3(1., .98, .95) * smoothstep(.4, .85, bol) * fm * agua * .5; }
        // spray: névoa branca subindo da base, para além do fim da queda
        if (im.x > queda.x && im.x < queda.z && im.y >= queda.w && im.y < queda.w + .06) {
          float bx = (im.x - queda.x) / (queda.z - queda.x), by = (im.y - queda.w) / .06;
          float sp = fbm(vec2(bx * 5. + t * .15, by * 3. - t * .9));   // névoa em nuvem (sem fios verticais), bordas todas suaves
          float borda = smoothstep(0., .3, bx) * smoothstep(1., .7, bx) * smoothstep(0., .25, by) * smoothstep(1., .45, by);
          c = mix(c, vec3(.94, .96, .98), smoothstep(.35, .8, sp) * borda * .32); }
        gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }` });
  const malha = new THREE.Mesh(geo, mat); malha.frustumCulled = false; cena.add(malha);
  // posição 3D de um ponto (u,v da imagem, v de cima para baixo) a uma profundidade relativa d
  const prof8 = await (async () => { const c = document.createElement('canvas'), img = tProf.image; c.width = 256; c.height = Math.round(256 / aspecto); const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height); return { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data }; })();
  const dAt = (u, v) => prof8.d[(Math.min(prof8.h - 1, Math.floor(v * prof8.h)) * prof8.w + Math.min(prof8.w - 1, Math.floor(u * prof8.w))) * 4] / 255;
  const dist = (d) => 1 / (d * (1 / unif.perto.value - 1 / unif.longe.value) + 1 / unif.longe.value);
  const ponto = (u, v, z) => { z = z || dist(dAt(u, v)); if (ESF) { const lon = (u - 0.5) * Math.PI * 2, lat = (0.5 - v) * Math.PI; return new THREE.Vector3(Math.sin(lon) * Math.cos(lat) * z, Math.sin(lat) * z, -Math.cos(lon) * Math.cos(lat) * z); } return new THREE.Vector3((u * 2 - 1) * tg * aspecto * z, (1 - v * 2) * tg * z, -z); };
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
  const Y0 = ESF && cfg.olhar != null ? -(cfg.olhar - 0.5) * Math.PI * 2 : 0;   // no 360, cfg.olhar (u da foto) diz para onde a câmera olha ao chegar
  let yaw = Y0, pitch = 0, alvoYaw = Y0, alvoPitch = 0, px = 0, pz = 0, vx = 0, vz = 0; const teclas = {}; const LIM = cfg.passo || 1.2;
  const el = renderer.domElement; let arr = null;
  el.addEventListener('pointerdown', (e) => { arr = [e.clientX, e.clientY, alvoYaw, alvoPitch]; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; });
  el.addEventListener('pointermove', (e) => { if (!arr) return; alvoYaw = ESF ? arr[2] - (e.clientX - arr[0]) * 0.003 : THREE.MathUtils.clamp(arr[2] - (e.clientX - arr[0]) * 0.0025, -0.16, 0.16); alvoPitch = THREE.MathUtils.clamp(arr[3] - (e.clientY - arr[1]) * 0.0022, ESF ? -0.9 : -0.08, ESF ? 0.9 : 0.08); });
  const solta = () => { arr = null; el.style.cursor = 'grab'; }; el.addEventListener('pointerup', solta); el.addEventListener('pointercancel', solta);
  const kd = (e) => { teclas[e.key.toLowerCase()] = e.type === 'keydown'; }; addEventListener('keydown', kd); addEventListener('keyup', kd);
  const redim = () => { renderer.setSize(W(), H()); ajustaFov(); }; addEventListener('resize', redim);
  const saidas = (cfg.saidas || []).map((sd) => { const b = document.createElement('button'); b.className = 'fv-saida'; b.innerHTML = '<span>➜</span>' + sd.rotulo;
    b.style.cssText = 'position:absolute;z-index:3;transform:translate(-50%,-50%);padding:9px 16px 9px 12px;border-radius:22px;border:1px solid rgba(255,255,255,.55);background:rgba(10,20,14,.38);color:#fff;font:600 14px system-ui;letter-spacing:.02em;cursor:pointer;backdrop-filter:blur(6px);display:flex;gap:8px;align-items:center;transition:opacity .4s;white-space:nowrap';
    host.appendChild(b); const alvo = ponto(sd.u, sd.v, sd.z); b.onclick = (e) => { e.stopPropagation(); if (saindo) return; const d = alvo.clone(); d.y = 0; const dist = d.length() || 1; d.normalize(); saindo = { t: 0, ir: sd.ir, dir: d, passo: Math.min(dist * 0.28, 1.3), base: new THREE.Vector3(px, 0, pz) }; if (ESF) alvoYaw = yaw + Math.atan2(Math.sin(Math.atan2(-d.x, -d.z) - yaw), Math.cos(Math.atan2(-d.x, -d.z) - yaw)); saidas.forEach((x) => { x.b.style.opacity = '0'; }); }; return { b, alvo }; });
  const veu = document.createElement('div'); veu.style.cssText = 'position:absolute;inset:0;z-index:4;pointer-events:none;background:#f4f1e6;opacity:0'; host.appendChild(veu);
  let saindo = null; const V3 = new THREE.Vector3();
  let ativo = true, t0 = performance.now(), ult = t0;
  (function laco(agora) { if (!ativo) return; requestAnimationFrame(laco); agora = agora || performance.now(); const dt = Math.min(0.05, (agora - ult) / 1000); ult = agora; unif.t.value = (agora - t0) / 1000;
    const fr = (teclas.w || teclas.arrowup ? 1 : 0) - (teclas.s || teclas.arrowdown ? 1 : 0), ld = (teclas.d ? 1 : 0) - (teclas.a ? 1 : 0); const gira = (teclas.arrowright ? 1 : 0) - (teclas.arrowleft ? 1 : 0);
    alvoYaw = ESF ? alvoYaw - gira * dt * 0.9 : THREE.MathUtils.clamp(alvoYaw - gira * dt * 0.5, -0.16, 0.16);
    vx += ((Math.cos(yaw) * ld - Math.sin(yaw) * fr) * 0.7 - vx) * Math.min(1, dt * 4); vz += ((-Math.sin(yaw) * ld - Math.cos(yaw) * fr) * 0.7 - vz) * Math.min(1, dt * 4);
    px = THREE.MathUtils.clamp(px + vx * dt, -LIM * 0.3, LIM * 0.3); pz = THREE.MathUtils.clamp(pz + vz * dt, -LIM * 0.7, LIM * 0.15);
    yaw += (alvoYaw - yaw) * Math.min(1, dt * 5); pitch += (alvoPitch - pitch) * Math.min(1, dt * 5);
    const resp = unif.t.value; camera.position.set(px + Math.sin(resp * 0.23) * 0.06, Math.sin(resp * 0.31) * 0.04, pz); camera.rotation.set(pitch, yaw + Math.sin(resp * 0.11) * 0.012, 0, 'YXZ');
    if (saindo) { saindo.t += dt; const k = Math.min(1, saindo.t / 1.6), m = Math.max(0, (k - 0.25) / 0.75), e = m * m * (3 - 2 * m); camera.position.copy(saindo.base).addScaledVector(saindo.dir, saindo.passo * e); camera.position.y += Math.sin(unif.t.value * 0.31) * 0.04; veu.style.opacity = String(Math.max(0, (k - 0.4) / 0.6)); if (k >= 1 && !saindo.feito) { saindo.feito = true; cfg.aoSair && cfg.aoSair(saindo.ir); } }
    saidas.forEach(({ b, alvo }) => { V3.copy(alvo).project(camera); const vis = V3.z < 1 && Math.abs(V3.x) < 0.95 && Math.abs(V3.y) < 0.9; b.style.display = vis ? 'flex' : 'none'; if (vis) { b.style.left = ((V3.x * 0.5 + 0.5) * W()) + 'px'; b.style.top = ((-V3.y * 0.5 + 0.5) * H()) + 'px'; } });
    renderer.render(cena, camera); })();
  // chegada: o véu claro some devagar
  if (cfg.chegando) { veu.style.opacity = '1'; requestAnimationFrame(() => { veu.style.transition = 'opacity 1.1s'; veu.style.opacity = '0'; setTimeout(() => { veu.style.transition = ''; }, 1200); }); }
  return { fechar() { ativo = false; saidas.forEach((x) => x.b.remove()); veu.remove(); removeEventListener('keydown', kd); removeEventListener('keyup', kd); removeEventListener('resize', redim); lixo.forEach((o) => o.dispose && o.dispose()); renderer.dispose(); el.remove(); }, camera, unif };
}
