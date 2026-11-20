// NEXUS BÍBLICO — O CÉU REAL E AO VIVO (fundo da camada Universo; versão de teste, 20/11/2026).
// Visto como o olho humano vê: brilhos naturais, cores suaves, o limite de visibilidade de um céu escuro e, de dia,
// o céu azul que apaga as estrelas. Ao aproximar o mapa, o céu também aproxima (como num binóculo/telescópio) e
// aparecem estrelas mais fracas. Tudo o que aparece pode ser tocado e mostra a sua ficha.
// Fontes:
//   • estrelas: HYG Database v4.1 (astronexus, CC BY-SA 4.0) — 28.495 estrelas até magnitude 7,6, com distância,
//     nome, designação de Bayer/Flamsteed e constelação;
//   • Via Láctea: panorama do céu inteiro ESO/S. Brunier (CC BY 4.0), em coordenadas galácticas;
//   • Lua (fase), Sol e planetas: astronomy-engine (MIT), calculados para a hora escolhida;
//   • menções bíblicas: texto da Almeida do próprio NEXUS; as identificações antigas (Kesil = Órion, Kimah = Plêiades…)
//     são TRADICIONAIS e aparecem como tal.
const CONST_PT = { And: 'Andrômeda', Ant: 'Máquina Pneumática', Aps: 'Ave do Paraíso', Aqr: 'Aquário', Aql: 'Águia', Ara: 'Altar', Ari: 'Áries', Aur: 'Cocheiro', Boo: 'Boieiro', Cae: 'Buril', Cam: 'Girafa', Cnc: 'Câncer', CVn: 'Cães de Caça', CMa: 'Cão Maior', CMi: 'Cão Menor', Cap: 'Capricórnio', Car: 'Quilha', Cas: 'Cassiopeia', Cen: 'Centauro', Cep: 'Cefeu', Cet: 'Baleia', Cha: 'Camaleão', Cir: 'Compasso', Col: 'Pomba', Com: 'Cabeleira de Berenice', CrA: 'Coroa Austral', CrB: 'Coroa Boreal', Crv: 'Corvo', Crt: 'Taça', Cru: 'Cruzeiro do Sul', Cyg: 'Cisne', Del: 'Golfinho', Dor: 'Dourado', Dra: 'Dragão', Equ: 'Cavalo Menor', Eri: 'Erídano', For: 'Fornalha', Gem: 'Gêmeos', Gru: 'Grou', Her: 'Hércules', Hor: 'Relógio', Hya: 'Hidra', Hyi: 'Hidra Macho', Ind: 'Índio', Lac: 'Lagarto', Leo: 'Leão', LMi: 'Leão Menor', Lep: 'Lebre', Lib: 'Libra', Lup: 'Lobo', Lyn: 'Lince', Lyr: 'Lira', Men: 'Mesa', Mic: 'Microscópio', Mon: 'Unicórnio', Mus: 'Mosca', Nor: 'Esquadro', Oct: 'Oitante', Oph: 'Serpentário', Ori: 'Órion', Pav: 'Pavão', Peg: 'Pégaso', Per: 'Perseu', Phe: 'Fênix', Pic: 'Pintor', Psc: 'Peixes', PsA: 'Peixe Austral', Pup: 'Popa', Pyx: 'Bússola', Ret: 'Retículo', Sge: 'Flecha', Sgr: 'Sagitário', Sco: 'Escorpião', Scl: 'Escultor', Sct: 'Escudo', Ser: 'Serpente', Sex: 'Sextante', Tau: 'Touro', Tel: 'Telescópio', Tri: 'Triângulo', TrA: 'Triângulo Austral', Tuc: 'Tucano', UMa: 'Ursa Maior', UMi: 'Ursa Menor', Vel: 'Vela', Vir: 'Virgem', Vol: 'Peixe Voador', Vul: 'Raposa' };
const GREGO = { Alp: 'α', Bet: 'β', Gam: 'γ', Del: 'δ', Eps: 'ε', Zet: 'ζ', Eta: 'η', The: 'θ', Iot: 'ι', Kap: 'κ', Lam: 'λ', Mu: 'μ', Nu: 'ν', Xi: 'ξ', Omi: 'ο', Pi: 'π', Rho: 'ρ', Sig: 'σ', Tau: 'τ', Ups: 'υ', Phi: 'φ', Chi: 'χ', Psi: 'ψ', Ome: 'ω' };
const PLEIADES = new Set(['Alcíone', 'Alcyone', 'Atlas', 'Electra', 'Maia', 'Merope', 'Taygeta', 'Pleione', 'Celaeno', 'Sterope', 'Asterope']);
// menções bíblicas (texto da Almeida); a identificação astronômica antiga é tradicional, não consenso
const BIBLIA = {
  orion: { titulo: 'Órion na Bíblia', nota: 'O hebraico diz Kesil; a identificação com Órion é tradicional (versões antigas e a maioria dos estudiosos).', refs: [[18, 9, 9], [18, 38, 31], [30, 5, 8]] },
  pleiades: { titulo: 'Plêiades na Bíblia', nota: 'O hebraico diz Kimah; a identificação com as Plêiades é tradicional.', refs: [[18, 9, 9], [18, 38, 31], [30, 5, 8]] },
  ursa: { titulo: 'A "ursa" de Jó', nota: 'O hebraico diz ‘Ash/‘Ayish; a identificação é incerta (Ursa Maior, Arcturo ou as Híades são propostas).', refs: [[18, 9, 9], [18, 38, 32]] },
  venus: { titulo: 'A "estrela da manhã"', nota: '"Estrela da manhã/da alva" é o nome tradicional de Vênus visto antes do amanhecer; nos textos o uso é figurado.', refs: [[23, 14, 12], [61, 1, 19], [66, 22, 16]] },
  saturno: { titulo: 'Quium e Renfã', nota: 'Muitos estudiosos identificam Quium (Kaiwan) com Saturno; é interpretação acadêmica, não consenso.', refs: [[30, 5, 26], [44, 7, 43]] },
  luminares: { titulo: 'Os luminares', nota: '', refs: [[1, 1, 16], [5, 4, 19]] },
  estrelas: { titulo: 'As estrelas', nota: '', refs: [[19, 147, 4], [1, 1, 16]] },
};

export function criarCeuReal(THREE, opcoes) {
  const escala = opcoes.escala || 1;
  const OBS = { lat: -3.73, lon: -38.52, nome: 'Fortaleza' };
  let desloc = 0;   // ms em relação a agora
  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 10);
  const eq = new THREE.Group(); eq.matrixAutoUpdate = false; cena.add(eq);   // filhos em coordenadas equatoriais (raio 1)
  const vEq = (ra, de) => new THREE.Vector3(Math.cos(de) * Math.cos(ra), Math.cos(de) * Math.sin(ra), Math.sin(de));
  const Rgal = new THREE.Matrix3().set(-0.0548755604, -0.8734370902, -0.4838350155, 0.4941094279, -0.4448296300, 0.7469822445, -0.8676661490, -0.1980763734, 0.4559837762);
  const zen = new THREE.Vector3(0, 0, 1), dirSol = new THREE.Vector3(1, 0, 0), dirLua = new THREE.Vector3(1, 0, 0);
  let solAlt = -30, luaAlt = -30, luaFracao = 0, BIB = null;
  const lstHoras = (ms) => { const d = ms / 86400000 + 2440587.5 - 2451545.0; const g = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24; return ((g + OBS.lon / 15) % 24 + 24) % 24; };
  function orientar(ms) {
    const Z = vEq(lstHoras(ms) * 15 * Math.PI / 180, OBS.lat * Math.PI / 180); zen.copy(Z);
    const P = new THREE.Vector3(0, 0, 1), N = P.clone().sub(Z.clone().multiplyScalar(P.dot(Z))).normalize();
    const O = new THREE.Vector3().crossVectors(P, Z).normalize().negate();
    eq.matrix.set(O.x, O.y, O.z, 0, N.x, N.y, N.z, 0, -Z.x, -Z.y, -Z.z, 0, 0, 0, 0, 1); eq.matrixWorldNeedsUpdate = true;
  }
  const U = { zen: { value: zen }, sol: { value: dirSol }, lua: { value: dirLua }, solAlt: { value: -0.5 }, luaBrilho: { value: 0 }, opac: { value: 1 }, tempo: { value: 0 }, lupa: { value: 1 }, limite: { value: 6.3 }, pan: { value: new THREE.Vector2() } };

  // cúpula: Via Láctea + atmosfera (dia, crepúsculo, brilho da Lua, horizonte)
  const tex = new THREE.TextureLoader().load('/nexus/via-lactea-eso.jpg'); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping;
  const matCupula = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: { mapa: { value: tex }, e2g: { value: Rgal }, ...U },
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D mapa; uniform mat3 e2g; uniform vec3 zen; uniform vec3 sol; uniform vec3 lua; uniform float solAlt; uniform float luaBrilho; uniform float opac; varying vec3 d;
      void main(){ vec3 e = normalize(d); vec3 g = normalize(e2g * e); float l = atan(g.y, g.x); float b = asin(clamp(g.z, -1.0, 1.0));
        vec3 via = pow(texture2D(mapa, vec2(fract(0.5 - l / 6.2831853), 0.5 + b / 3.1415927)).rgb, vec3(1.08)) * 1.05;
        float alt = dot(e, zen); float acima = smoothstep(-0.05, 0.03, alt);
        float dia = smoothstep(-0.31, 0.05, solAlt);            // de noite (-18°) a dia claro
        float crep = smoothstep(-0.31, -0.02, solAlt) * (1.0 - smoothstep(-0.02, 0.18, solAlt));
        float horiz = pow(1.0 - clamp(alt, 0.0, 1.0), 4.0);
        float paraSol = max(dot(e, sol), 0.0);
        vec3 ceuDia = mix(vec3(0.33, 0.55, 0.85), vec3(0.62, 0.76, 0.92), horiz) + vec3(1.0, 0.95, 0.85) * pow(paraSol, 24.0) * 0.6;
        vec3 ceuCrep = mix(vec3(0.05, 0.08, 0.20), vec3(0.95, 0.52, 0.25), horiz * (0.4 + 0.6 * pow(paraSol, 2.0)));
        float luaGlow = luaBrilho * (0.10 * pow(max(dot(e, lua), 0.0), 18.0) + 0.035);
        vec3 noite = via * (1.0 - 0.7 * dia) * (1.0 - min(luaBrilho * 0.55, 0.5)) + vec3(0.025, 0.03, 0.05) * horiz + vec3(0.55, 0.6, 0.7) * luaGlow;
        vec3 cor = mix(noite, ceuCrep, crep * 0.85); cor = mix(cor, ceuDia, smoothstep(-0.05, 0.12, solAlt));
        cor *= mix(0.25, 1.0, acima);
        gl_FragColor = vec4(cor * opac, 1.0); }` });
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 36), matCupula); cupula.frustumCulled = false; eq.add(cupula);

  // estrelas (HYG): tamanho e brilho pela magnitude; cor pelo índice B-V, suave como a olho nu; profundidade pela distância
  let estrelas = [], gE = null;
  const matE = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { px: { value: escala }, ...U },
    vertexShader: `attribute float mag; attribute float dist; uniform float px; uniform float tempo; uniform vec3 zen; uniform float solAlt; uniform float luaBrilho; uniform float lupa; uniform float limite; uniform vec2 pan; varying vec3 c; varying float b;
      void main(){ c = color; vec3 p = position;
        float lim = limite - luaBrilho * 1.2 - smoothstep(-0.31, 0.0, solAlt) * 5.0;
        float vis = clamp((lim - mag) / 0.7 + 0.15, 0.0, 1.0);
        float f = fract(sin(dot(p.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
        float alt = dot(normalize(p), zen); float acima = smoothstep(-0.05, 0.03, alt);
        float cint = 0.9 + 0.1 * sin(tempo * (1.3 + fract(f) * 2.6) + f) * (1.0 - alt * 0.6);   // cintila mais perto do horizonte
        b = vis * clamp(pow(10.0, -0.4 * (mag - 1.0)) * 1.4 + 0.18, 0.0, 1.0) * cint * mix(0.2, 1.0, acima);
        if (dist > 0.0) p += vec3(pan, 0.0) * (0.0000007 / max(dist, 1.3));       // estrelas próximas se deslocam mais (paralaxe)
        float tam = clamp(5.4 - 0.72 * mag, 1.1, 9.0) * (0.85 + 0.15 * lupa);
        gl_PointSize = vis > 0.0 ? tam * px : 0.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform float opac; varying vec3 c; varying float b; void main(){ if (b <= 0.002) discard; float d = length(gl_PointCoord - 0.5); float nucleo = smoothstep(0.2, 0.0, d); float halo = smoothstep(0.5, 0.06, d) * 0.3; float a = (nucleo + halo) * b; gl_FragColor = vec4(c * a * opac, a * opac); }` });
  function corBV(ci) {   // B-V -> temperatura -> cor; misturada ao branco (o olho percebe pouca cor nas estrelas)
    const t = 4600 * (1 / (0.92 * ci + 1.7) + 1 / (0.92 * ci + 0.62)) / 100; let r, g, b;
    if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; } else { r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.12 * Math.pow(t - 60, -0.0755); b = 255; }
    const cl = (x) => Math.max(0, Math.min(255, x)) / 255; return [0.5 * cl(r) + 0.5, 0.5 * cl(g) + 0.5, 0.5 * cl(b) + 0.5];
  }
  fetch('/nexus/estrelas-hyg.json').then((r) => r.json()).then((dd) => {
    estrelas = dd.estrelas; const n = estrelas.length;
    const pos = new Float32Array(n * 3), cor = new Float32Array(n * 3), mag = new Float32Array(n), dist = new Float32Array(n);
    estrelas.forEach((s, i) => { const v = vEq(s[0] * Math.PI / 180, s[1] * Math.PI / 180).multiplyScalar(0.98); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; const c = corBV(s[3]); cor.set(c, i * 3); mag[i] = s[2]; dist[i] = s[4]; });
    gE = new THREE.BufferGeometry();
    gE.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gE.setAttribute('color', new THREE.BufferAttribute(cor, 3)); gE.setAttribute('mag', new THREE.BufferAttribute(mag, 1)); gE.setAttribute('dist', new THREE.BufferAttribute(dist, 1));
    const pts = new THREE.Points(gE, matE); pts.frustumCulled = false; eq.add(pts);
  }).catch(() => {});
  fetch('/biblia.json').then((r) => r.text()).then((t) => { BIB = JSON.parse(t.replace(/^[^\[]*/, '')); }).catch(() => {});

  // Lua, Sol e planetas
  let A = null; const astros = [];
  const NOMES = { Sun: 'Sol', Moon: 'Lua', Mercury: 'Mercúrio', Venus: 'Vênus', Mars: 'Marte', Jupiter: 'Júpiter', Saturn: 'Saturno' };
  function texPonto(cor) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, cor); gr.addColorStop(0.18, cor); gr.addColorStop(0.45, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  function texLua(fr, cres) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = 50, h = 64;
    const gr = g.createRadialGradient(h, h, r * 0.9, h, h, r * 1.3); gr.addColorStop(0, 'rgba(255,250,235,.25)'); gr.addColorStop(1, 'rgba(255,250,235,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(30,34,48,.85)'; g.beginPath(); g.arc(h, h, r, 0, 6.29); g.fill();
    g.save(); g.beginPath(); g.arc(h, h, r, 0, 6.29); g.clip(); g.fillStyle = '#EFEADB'; const k = 1 - 2 * fr;
    g.beginPath(); if (cres) { g.arc(h, h, r, -Math.PI / 2, Math.PI / 2); g.ellipse(h, h, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k > 0); } else { g.arc(h, h, r, Math.PI / 2, -Math.PI / 2); g.ellipse(h, h, Math.abs(k) * r, r, 0, -Math.PI / 2, Math.PI / 2, k > 0); }
    g.fill(); g.restore(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  import('https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/esm/astronomy.js').then((m) => {
    A = m;
    for (const corpo of ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
      const cor = corpo === 'Sun' ? '#FFF4D6' : corpo === 'Mars' ? '#FFC7A8' : corpo === 'Jupiter' ? '#FFF1DC' : corpo === 'Saturn' ? '#F5E6C4' : '#FFFFFF';
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: corpo === 'Moon' ? texLua(0.5, true) : texPonto(cor), transparent: true, depthWrite: false, depthTest: false, blending: corpo === 'Moon' ? THREE.NormalBlending : THREE.AdditiveBlending, sizeAttenuation: false }));
      const tam = corpo === 'Moon' ? 0.07 : corpo === 'Sun' ? 0.06 : corpo === 'Venus' ? 0.028 : corpo === 'Jupiter' ? 0.024 : 0.018; sp.scale.set(tam, tam, 1); sp.frustumCulled = false; eq.add(sp);
      astros.push({ corpo, nome: NOMES[corpo], sp, alt: -90, info: {} });
    }
    atualizarAstros();
  }).catch(() => {});
  function atualizarAstros() {
    if (!A) return; const data = new Date(Date.now() + desloc), obs = new A.Observer(OBS.lat, OBS.lon, 0);
    for (const a of astros) {
      try {
        const e = A.Equator(a.corpo, data, obs, true, true), v = vEq(e.ra * 15 * Math.PI / 180, e.dec * Math.PI / 180);
        a.sp.position.copy(v.clone().multiplyScalar(0.97)); const hz = A.Horizon(data, obs, e.ra, e.dec, 'normal'); a.alt = hz.altitude;
        a.info = { ra: e.ra, dec: e.dec, distUA: e.dist, constelacao: (A.Constellation(e.ra, e.dec) || {}).name, alt: hz.altitude, az: hz.azimuth };
        if (a.corpo !== 'Sun' && a.corpo !== 'Moon') { try { a.info.mag = A.Illumination(a.corpo, data).mag; } catch (_) {} }
        if (a.corpo === 'Moon') { const il = A.Illumination('Moon', data), ang = A.MoonPhase(data); a.info.fracao = il.phase_fraction; a.info.mag = il.mag; if (Math.abs((a.fr || -1) - il.phase_fraction) > 0.01) { a.sp.material.map && a.sp.material.map.dispose(); a.sp.material.map = texLua(il.phase_fraction, ang < 180); a.sp.material.needsUpdate = true; a.fr = il.phase_fraction; } luaAlt = hz.altitude; luaFracao = il.phase_fraction; dirLua.copy(v); }
        if (a.corpo === 'Sun') { solAlt = hz.altitude; dirSol.copy(v); }
        a.sp.material.opacity = a.alt > -1 ? (a.corpo === 'Sun' ? 1 : Math.max(0.15, 1 - Math.max(0, (solAlt + 6) / 12) * (a.corpo === 'Moon' ? 0.5 : 0.95))) : 0.25;
      } catch (_) { /* corpo indisponível */ }
    }
    U.solAlt.value = Math.sin(solAlt * Math.PI / 180); U.luaBrilho.value = luaAlt > 0 ? luaFracao * Math.min(1, luaAlt / 15 + 0.3) : 0;
  }

  // ── fichas (tudo o que aparece mostra informação) ─────────────────────────────────────
  const nomeRef = (n, c, v) => BIB ? `${BIB[n - 1].name} ${c}:${v}` : `${n}:${c}:${v}`;
  const textoRef = (n, c, v) => { try { return BIB[n - 1].chapters[c - 1][v - 1]; } catch (_) { return ''; } };
  function blocoBiblia(chave) {
    const m = BIBLIA[chave]; if (!m) return '';
    return `<h5>${m.titulo}</h5>${m.refs.map(([n, c, v]) => `<p><b>${nomeRef(n, c, v)}</b> — “${textoRef(n, c, v)}”</p>`).join('')}${m.nota ? `<small>${m.nota}</small>` : ''}`;
  }
  const anosLuz = (pc) => (pc > 0 ? `${(pc * 3.2616).toLocaleString('pt-BR', { maximumFractionDigits: pc < 10 ? 1 : 0 })} anos-luz` : 'distância desconhecida');
  function fichaEstrela(i) {
    const s = estrelas[i]; const [ra, de, mag, ci, dist, nome, bayer, flam, con, hip, esp] = s;
    const cpt = CONST_PT[con] || con;
    const desig = bayer ? `${GREGO[bayer.replace(/[-0-9]/g, '')] || bayer} ${con}` : flam ? `${flam} ${con}` : hip ? `HIP ${hip}` : '';
    const vista = mag <= 6.3 ? 'visível a olho nu num céu escuro' : 'visível com binóculo';
    let bib = '';
    if (con === 'Ori') bib = blocoBiblia('orion'); else if (PLEIADES.has(nome)) bib = blocoBiblia('pleiades'); else if (con === 'UMa' || nome === 'Arcturo') bib = blocoBiblia('ursa'); else if (mag < 1.6) bib = blocoBiblia('estrelas');
    return { titulo: nome || desig || 'Estrela', html: `<small>Estrela${esp ? ' · tipo espectral ' + esp : ''}${nome && desig ? ' · ' + desig : ''}</small><p>Constelação: <b>${cpt}</b><br>Brilho aparente: magnitude ${mag.toFixed(2)} (${vista})<br>Distância: ${anosLuz(dist)}</p>${bib}<small>Fonte: HYG Database v4.1 (CC BY-SA 4.0)</small>` };
  }
  function fichaAstro(a) {
    const i = a.info, cpt = CONST_PT[i.constelacao] || i.constelacao || '';
    const tipo = a.corpo === 'Sun' ? 'Estrela (o Sol)' : a.corpo === 'Moon' ? 'Satélite natural da Terra' : 'Planeta';
    const distTxt = a.corpo === 'Moon' ? `${Math.round(i.distUA * 149597870.7).toLocaleString('pt-BR')} km` : `${i.distUA.toFixed(2)} UA (${Math.round(i.distUA * 149.6).toLocaleString('pt-BR')} milhões de km)`;
    const bib = a.corpo === 'Venus' ? blocoBiblia('venus') : a.corpo === 'Saturn' ? blocoBiblia('saturno') : (a.corpo === 'Sun' || a.corpo === 'Moon') ? blocoBiblia('luminares') : '';
    return { titulo: a.nome, html: `<small>${tipo}${a.corpo === 'Moon' && i.fracao != null ? ` · ${Math.round(i.fracao * 100)}% iluminada` : ''}</small><p>Agora em: <b>${cpt}</b> · ${i.alt > 0 ? `${Math.round(i.alt)}° acima do horizonte` : 'abaixo do horizonte'}<br>${i.mag != null ? `Brilho: magnitude ${i.mag.toFixed(1)}<br>` : ''}Distância: ${distTxt}</p>${bib}<small>Posição calculada para ${new Date(Date.now() + desloc).toLocaleString('pt-BR')} em ${OBS.nome} (astronomy-engine)</small>` };
  }
  const tmp = new THREE.Vector3();
  function tocar(x, y, W, H, raio) {
    let melhor = null, dm = raio * raio;
    for (const a of astros) { if (a.alt < -1) continue; a.sp.getWorldPosition(tmp).project(camera); if (tmp.z > 1) continue; const px = (tmp.x + 1) / 2 * W, py = (1 - tmp.y) / 2 * H, d = (px - x) ** 2 + (py - y) ** 2; if (d < dm * 2) { dm = d / 2; melhor = { tipo: 'astro', a }; } }
    if (gE) {
      const lim = U.limite.value - U.luaBrilho.value * 1.2 - (U.solAlt.value > -0.31 ? 5 : 0), m = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(eq.matrixWorld), p = gE.attributes.position.array;
      for (let i = 0; i < estrelas.length; i++) {
        const mag = estrelas[i][2]; if (mag > lim) break;   // ordenadas pelo brilho
        tmp.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]).applyMatrix4(m); if (tmp.z > 1) continue;
        const px = (tmp.x + 1) / 2 * W, py = (1 - tmp.y) / 2 * H, d = (px - x) ** 2 + (py - y) ** 2;
        const peso = d * (1 + Math.max(0, mag - 2) * 0.15);   // estrelas brilhantes ganham na disputa
        if (peso < dm) { dm = peso; melhor = { tipo: 'estrela', i }; }
      }
    }
    if (!melhor) return null;
    return melhor.tipo === 'astro' ? fichaAstro(melhor.a) : fichaEstrela(melhor.i);
  }
  function rotulos(desenhar, W, H) {   // planetas, Lua e as estrelas com nome mais brilhantes
    for (const a of astros) { if (a.alt < -1 || (a.corpo === 'Sun' && solAlt < -1)) continue; a.sp.getWorldPosition(tmp).project(camera); if (tmp.z > 1) continue; desenhar(a.nome + (a.corpo === 'Moon' && a.info.fracao != null ? ' ' + Math.round(a.info.fracao * 100) + '%' : ''), (tmp.x + 1) / 2 * W + 12, (1 - tmp.y) / 2 * H, true); }
    if (!gE || U.solAlt.value > -0.1) return;
    const m = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(eq.matrixWorld), p = gE.attributes.position.array;
    let n = 0; for (let i = 0; i < estrelas.length && n < 14; i++) { const s = estrelas[i]; if (s[2] > 1.6) break; if (!s[5]) continue; tmp.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]); if (tmp.dot(zen) < 0.02) continue; tmp.applyMatrix4(m); if (tmp.z > 1) continue; const px = (tmp.x + 1) / 2 * W, py = (1 - tmp.y) / 2 * H; if (px > 0 && px < W && py > 0 && py < H) { desenhar(s[5], px + 8, py, false); n++; } }
  }

  let ultAstros = 0;
  return {
    cena, camera, OBS,
    quadro(cam, t, alvo, dist, opac, visivel) {
      camera.quaternion.copy(cam.quaternion); camera.aspect = cam.aspect;
      const lupa = Math.max(1, Math.min(8, Math.pow(26000 / Math.max(dist, 30), 0.42)));   // aproximar o mapa aproxima o céu
      camera.fov = cam.fov / lupa; camera.updateProjectionMatrix();
      U.lupa.value = lupa; U.limite.value = 6.3 + Math.log2(lupa) * 0.9; U.tempo.value = t / 1000; U.opac.value = visivel ? opac : 0;
      U.pan.value.set(alvo.x, alvo.y);
      orientar(Date.now() + desloc);
      const rot = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-alvo.y * 0.000018, alvo.x * 0.000018, 0));
      eq.matrix.premultiply(rot); eq.matrixWorldNeedsUpdate = true;
      if (t - ultAstros > 2000) { ultAstros = t; atualizarAstros(); }
    },
    tocar, rotulos,
    tempo(ms) { desloc = ms; atualizarAstros(); }, desloc: () => desloc,
    local(lat, lon, nome) { OBS.lat = lat; OBS.lon = lon; OBS.nome = nome; atualizarAstros(); },
    telaDe(nome, W, H) {   // posição na tela de uma estrela com nome ou de um astro (para testes)
      const a = astros.find((x) => x.nome === nome); if (a) { a.sp.getWorldPosition(tmp).project(camera); return tmp.z > 1 ? null : { x: (tmp.x + 1) / 2 * W, y: (1 - tmp.y) / 2 * H }; }
      const i = estrelas.findIndex((x) => x[5] === nome); if (i < 0 || !gE) return null; const p = gE.attributes.position.array;
      tmp.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]).applyMatrix4(eq.matrixWorld).project(camera); return tmp.z > 1 ? null : { x: (tmp.x + 1) / 2 * W, y: (1 - tmp.y) / 2 * H };
    },
    estado: () => ({ solAlt, luaAlt, luaFracao, desloc, estrelas: estrelas.length, local: OBS.nome }),
  };
}
