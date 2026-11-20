// NEXUS BÍBLICO — CÉU INFINITO como UNIVERSO NAVEGÁVEL (versão de teste, 20/11/2026).
// Abre só em desenvolvimento local:  http://localhost:<porta>/nexus/?ref=João%201:1&ceu=universo
// A versão publicada (ceu.js v9) continua intacta. Mesma interface de ceu.js: criarCeu(container, estado, acoes).
//
// O UNIVERSO É UM MAPA (não é esfera nem grafo em raios). A câmera desliza sobre um plano infinito, com camadas de
// estrelas de fundo em profundidade (paralaxe). Cada estrela do NEXUS tem ENDEREÇO REAL:
//   • os 31.106 versículos da Almeida (biblia.json), cada um num ponto fixo;
//   • cada LIVRO é uma galáxia em espiral (capítulos ao longo dos braços, versículos em volta);
//   • as grandes REGIÕES são as seções do cânon (Lei, Históricos, Poéticos e Sabedoria, Profetas, Evangelhos,
//     Atos, Cartas de Paulo, Cartas Gerais, Apocalipse).
// LIGAÇÕES REAIS: ao passar o mouse num versículo, as referências cruzadas do OpenBible (público) acendem em
// sequência; ao abrir a investigação, os elementos do NEXUS (obras, autores, conceitos, termos — com PIN) entram
// como satélites da passagem, e o painel de evidências do NEXUS abre. Nada é inventado para preencher o espaço:
// nebulosas e estrelas de fundo são decorativas e geradas no aparelho, sem imagem externa.
import * as THREE from 'three';

const SECOES = [
  { nome: 'Lei · Pentateuco', de: 0, ate: 4, cor: '#7EA6E6' },
  { nome: 'Livros Históricos', de: 5, ate: 16, cor: '#9DB8D9' },
  { nome: 'Poéticos e Sabedoria', de: 17, ate: 21, cor: '#E8C987' },
  { nome: 'Profetas Maiores', de: 22, ate: 26, cor: '#6FA3C8' },
  { nome: 'Profetas Menores', de: 27, ate: 38, cor: '#86B4C9' },
  { nome: 'Evangelhos', de: 39, ate: 42, cor: '#F2D28B' },
  { nome: 'Atos dos Apóstolos', de: 43, ate: 43, cor: '#D9C08A' },
  { nome: 'Cartas de Paulo', de: 44, ate: 56, cor: '#A9C4EE' },
  { nome: 'Cartas Gerais', de: 57, ate: 64, cor: '#B9CCE6' },
  { nome: 'Apocalipse', de: 65, ate: 65, cor: '#E9B87A' },
];
const NOME_TIPO = { passagem: 'Passagem', obra: 'Obra', autor: 'Autor', conceito: 'Conceito', verbete: 'Termo original', descoberta: 'Descoberta' };
const COR_TIPO = { obra: '#E2B65C', autor: '#C9D3E3', conceito: '#8FD3CF', verbete: '#A6D9A0', descoberta: '#F0A08C' };
const DIST_MIN = 26, DIST_MAX = 30000;

function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0; return h / 4294967295; }
const chave = (b, c, v) => b * 1e6 + c * 1e3 + v;
const decompor = (k) => ({ b: Math.floor(k / 1e6), c: Math.floor((k % 1e6) / 1e3), v: k % 1e3 });
const lerId = (id) => { const m = /^p:(\d+)-(\d+)$/.exec(String(id || '')); return m ? { ini: +m[1], fim: +m[2] } : null; };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ler = (k) => { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } };

export function criarCeu(container, estado, acoes) {
  const fraco = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  const renderer = new THREE.WebGLRenderer({ antialias: !fraco, powerPreference: 'high-performance' });
  if (!renderer.getContext()) { acoes.indisponivel && acoes.indisponivel(); return null; }
  const escala = Math.min(devicePixelRatio || 1, fraco ? 1.5 : 2);
  renderer.setPixelRatio(escala);
  renderer.setClearColor('#03050B');
  const canvas = renderer.domElement; canvas.className = 'cu-canvas';
  const rot = document.createElement('canvas'); rot.className = 'cu-rotulos';
  const g2 = rot.getContext('2d');
  const ui = document.createElement('div'); ui.className = 'cu-ui';
  ui.innerHTML = `
    <div class="cu-controles" role="toolbar" aria-label="Navegação do universo">
      <button data-cu="mais" title="Aproximar" aria-label="Aproximar">+</button>
      <button data-cu="menos" title="Afastar" aria-label="Afastar">−</button>
      <button data-cu="geral" title="Visão geral do universo" aria-label="Visão geral">⌂</button>
      <button data-cu="centro" title="Centralizar na seleção" aria-label="Centralizar">◎</button>
      <button data-cu="voltar" title="Voltar à vista anterior" aria-label="Voltar">↶</button>
      <button data-cu="tela" title="Tela cheia" aria-label="Tela cheia">⛶</button>
    </div>
    <div class="cu-nivel"></div>
    <div class="cu-dica">Arraste para navegar · roda para aproximar · passe o mouse nas estrelas · duplo clique aproxima</div>
    <div class="cu-dica-toque">Um dedo navega · dois dedos aproximam · toque seleciona · toque longo abre a investigação</div>
    <div class="cu-info" hidden></div>
    <div class="cu-cartao" hidden></div>
    <div class="cu-credito">Universo de teste · estrelas = versículos da Almeida · ligações: OpenBible (CC-BY) e NEXUS · fundo decorativo gerado no aparelho</div>`;
  container.append(canvas, rot, ui);
  const estilo = document.createElement('style');
  estilo.textContent = `
    body.ceu-universo.modo-ceu .legenda, body.ceu-universo.modo-ceu .filtros, body.ceu-universo.modo-ceu .rotulos-grupos, body.ceu-universo.modo-ceu .zoom, body.ceu-universo.modo-ceu .ceu-ajuda{display:none!important}
    .ceu{background:#03050B}
    .cu-canvas,.cu-rotulos{position:absolute;inset:0;width:100%;height:100%;display:block}
    .cu-canvas{touch-action:none;cursor:grab}.cu-canvas.arrastando{cursor:grabbing}
    .cu-rotulos{pointer-events:none}
    .cu-ui{position:absolute;inset:0;pointer-events:none;font-family:Inter,system-ui,sans-serif;color:#E9E4D6}
    .cu-controles{pointer-events:auto;position:absolute;left:14px;bottom:44px;display:flex;flex-direction:column;gap:6px}
    .cu-controles button{width:38px;height:38px;border-radius:12px;border:1px solid rgba(233,210,150,.28);background:rgba(8,14,30,.72);color:#F1E6C8;font-size:17px;cursor:pointer;backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center}
    .cu-controles button:hover{background:rgba(24,44,84,.88);border-color:rgba(233,210,150,.6)}
    .cu-nivel{position:absolute;left:14px;top:12px;font-family:"Cormorant Garamond",Georgia,serif;font-size:15px;letter-spacing:.06em;color:rgba(242,223,174,.8);text-transform:uppercase}
    .cu-dica,.cu-dica-toque{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);color:rgba(220,222,232,.55);font-size:12px;white-space:nowrap;max-width:calc(100% - 90px);overflow:hidden;text-overflow:ellipsis}
    .cu-dica-toque{display:none}
    @media (pointer:coarse){.cu-dica{display:none}.cu-dica-toque{display:block}}
    .cu-credito{position:absolute;bottom:2px;left:10px;color:rgba(200,205,220,.32);font-size:10px}
    .cu-info{position:absolute;max-width:300px;background:rgba(6,11,26,.86);border:1px solid rgba(233,210,150,.3);border-radius:10px;padding:8px 11px;font-size:12.5px;line-height:1.45;backdrop-filter:blur(6px);pointer-events:none}
    .cu-info b{color:#F4E3B5;font-weight:600}.cu-info em{display:block;color:rgba(225,228,240,.8);font-style:normal;margin-top:3px}
    .cu-info small{display:block;color:rgba(180,195,225,.75);margin-top:4px}
    .cu-cartao{pointer-events:auto;position:absolute;left:14px;top:40px;width:min(330px,calc(100% - 80px));background:rgba(251,248,241,.97);color:#1B2333;border-radius:14px;padding:12px 14px;box-shadow:0 14px 36px rgba(0,0,0,.45)}
    .cu-cartao small{color:#5F6672;font-size:12px}.cu-cartao b{display:block;font-family:"Cormorant Garamond",Georgia,serif;font-size:21px;color:#14284B;line-height:1.2;margin:2px 0}
    .cu-cartao q{display:block;font-family:"Cormorant Garamond",Georgia,serif;font-size:16px;color:#24406E;margin:6px 0}
    .cu-cartao .cu-bts{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
    .cu-cartao button{border:1px solid #E5DFD2;background:#fff;border-radius:10px;padding:7px 11px;font-size:13px;cursor:pointer;color:#14284B}
    .cu-cartao button.cu-abrir{background:#14284B;color:#fff;border-color:#14284B}
    @media (max-width:760px){.cu-cartao{top:auto;bottom:40px;left:10px;right:58px;width:auto}.cu-controles{bottom:auto;top:40px;left:8px}}`;
  document.head.appendChild(estilo);

  // ── câmera: plano infinito, zoom em direção ao cursor, inclinação opcional ──────────────────
  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 200000);
  const alvo = new THREE.Vector3(0, 0, 0);
  let dist = 22000, incl = 0;                     // inclinação (botão direito) em radianos
  let voo = null, inercia = new THREE.Vector2();
  const historico = [];
  function posicionar() {
    dist = Math.max(DIST_MIN, Math.min(DIST_MAX, dist));
    incl = Math.max(0, Math.min(0.9, incl));
    camera.position.set(alvo.x, alvo.y - Math.sin(incl) * dist, Math.cos(incl) * dist);
    camera.up.set(0, 1, 0);
    camera.lookAt(alvo);
    camera.near = Math.max(0.5, dist * 0.01); camera.far = dist * 20 + 40000;
    camera.updateProjectionMatrix();
  }
  const ray = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), ndc = new THREE.Vector2();
  function noPlano(x, y) { ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera); const p = new THREE.Vector3(); return ray.ray.intersectPlane(plano, p) ? p : null; }
  function zoomEm(x, y, fator) {
    inercia.set(0, 0);
    const antes = noPlano(x, y);
    dist *= fator; posicionar();
    const depois = noPlano(x, y);
    if (antes && depois) { alvo.x += antes.x - depois.x; alvo.y += antes.y - depois.y; posicionar(); }
  }
  function lembrarVista() { historico.push({ x: alvo.x, y: alvo.y, d: dist, i: incl }); if (historico.length > 30) historico.shift(); }
  function voar(x, y, d, guardar = true) {
    if (guardar) lembrarVista();
    inercia.set(0, 0);
    voo = { de: { x: alvo.x, y: alvo.y, d: dist }, para: { x, y, d: Math.max(DIST_MIN, Math.min(DIST_MAX, d)) }, t0: performance.now(), dur: 1100 };
  }

  // ── o endereço de cada versículo ─────────────────────────────────────────────
  let BIB = null;                       // [{abbrev,name,chapters}]
  let vPos = null, vCor = null, vTam = null, vBri = null, vIdx = new Map(), vChave = [];
  let livros = [], secoes = [];
  function montarUniverso(bib) {
    BIB = bib;
    const versos = bib.map((l) => l.chapters.reduce((s, c) => s + c.length, 0));
    // seções ao longo de um grande arco (AT à esquerda, NT à direita), com espaço escuro entre elas
    let acum = 0; const totalSec = SECOES.map((s) => { let n = 0; for (let i = s.de; i <= s.ate; i++) n += versos[i]; return n; });
    const larguras = totalSec.map((n) => 900 + Math.sqrt(n) * 26);
    const totalL = larguras.reduce((a, b) => a + b, 0) + (SECOES.length - 1) * 1500;
    let x = -totalL / 2;
    secoes = SECOES.map((s, i) => {
      const w = larguras[i]; const cx = x + w / 2; x += w + 1500;
      const cy = Math.sin((cx / totalL) * Math.PI * 1.6) * 3600 + (i % 2 ? 900 : -700);
      return { ...s, cx, cy, raio: w / 2, versos: totalSec[i], cor3: new THREE.Color(s.cor) };
    });
    // livros: galáxias dentro da seção (filotaxia)
    livros = [];
    secoes.forEach((s) => {
      const n = s.ate - s.de + 1;
      for (let i = s.de; i <= s.ate; i++) {
        const k = i - s.de;
        const ang = k * 2.39996 + hash(bib[i].abbrev) * 0.6, rr = n === 1 ? 0 : s.raio * 0.78 * Math.sqrt((k + 0.6) / n);
        const rb = 60 + Math.sqrt(versos[i]) * 7.5;
        livros.push({ i, num: i + 1, nome: bib[i].name, abbrev: bib[i].abbrev, sec: s, cx: s.cx + Math.cos(ang) * rr, cy: s.cy + Math.sin(ang) * rr * 0.72, raio: rb, versos: versos[i], caps: bib[i].chapters.length, rotacao: hash(bib[i].name) * Math.PI * 2 });
      }
    });
    // versículos: espiral de dois braços por livro (capítulos ao longo dos braços)
    const total = versos.reduce((a, b) => a + b, 0);
    vPos = new Float32Array(total * 3); vCor = new Float32Array(total * 3); vTam = new Float32Array(total); vBri = new Float32Array(total);
    let j = 0;
    const branco = new THREE.Color('#FFFFFF');
    livros.forEach((lv) => {
      const caps = bib[lv.i].chapters, nc = caps.length;
      lv.capPos = [];
      caps.forEach((vs, ci) => {
        const t = nc === 1 ? 0.5 : ci / (nc - 1);
        const braco = ci % 2, ang = lv.rotacao + t * Math.PI * 2.6 + braco * Math.PI;
        const r = lv.raio * (0.12 + 0.88 * t);
        const pcx = lv.cx + Math.cos(ang) * r, pcy = lv.cy + Math.sin(ang) * r;
        const espalho = 5 + Math.sqrt(vs.length) * 2.2;
        lv.capPos.push({ x: pcx, y: pcy, c: ci + 1, n: vs.length });
        vs.forEach((_, vi) => {
          const a2 = vi * 2.39996 + hash(lv.abbrev + ci) * 6.28, r2 = espalho * Math.sqrt((vi + 0.5) / vs.length);
          vPos[j * 3] = pcx + Math.cos(a2) * r2; vPos[j * 3 + 1] = pcy + Math.sin(a2) * r2; vPos[j * 3 + 2] = 0;
          const c = lv.sec.cor3.clone().lerp(branco, 0.35 + hash(j) * 0.4);
          vCor[j * 3] = c.r; vCor[j * 3 + 1] = c.g; vCor[j * 3 + 2] = c.b;
          vTam[j] = 1.4 + hash(j * 7) * 1.4; vBri[j] = 0.55 + hash(j * 3) * 0.35;
          const k = chave(lv.num, ci + 1, vi + 1);
          vIdx.set(k, j); vChave.push(k);
          j++;
        });
      });
    });
    gVers.setAttribute('position', new THREE.BufferAttribute(vPos, 3).setUsage(THREE.DynamicDrawUsage));
    gVers.setAttribute('color', new THREE.BufferAttribute(vCor, 3));
    gVers.setAttribute('tam', new THREE.BufferAttribute(vTam, 1));
    gVers.setAttribute('brilho', new THREE.BufferAttribute(vBri, 1).setUsage(THREE.DynamicDrawUsage));
    vBase = vPos.slice(); vBriBase = vBri.slice();
    // galáxias (brilho de cada livro) e nebulosas das seções — decorativas, sobre posições reais
    livros.forEach((lv) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGalaxia, color: lv.sec.cor3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
      sp.position.set(lv.cx, lv.cy, -2); sp.scale.set(lv.raio * 2.9, lv.raio * 2.9, 1); sp.material.rotation = lv.rotacao;
      galaxias.add(sp); lv.sprite = sp;
    });
    secoes.forEach((s, i) => {
      for (let k = 0; k < 5; k++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNebulosa[k % texNebulosa.length], color: s.cor3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.16 }));
        const a = hash(s.nome + k) * 6.28, r = s.raio * 0.55 * hash(s.nome + 'r' + k);
        sp.position.set(s.cx + Math.cos(a) * r, s.cy + Math.sin(a) * r * 0.7, -40); const t = s.raio * (1.5 + hash(s.nome + 't' + k));
        sp.scale.set(t, t, 1); sp.material.rotation = a; nebulosas.add(sp);
      }
    });
    pronto = true;
    restaurarVista();
  }

  // ── texturas procedurais ──────────────────────────────────────────────────────
  function textura(desenho, n = 256) { const c = document.createElement('canvas'); c.width = c.height = n; desenho(c.getContext('2d'), n); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  const texGalaxia = textura((g, n) => {
    const h = n / 2;
    let gr = g.createRadialGradient(h, h, 0, h, h, h); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.12, 'rgba(255,255,255,.22)'); gr.addColorStop(0.5, 'rgba(255,255,255,.05)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, n, n);
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 900; k++) { const t = Math.random(), braco = k % 2, a = t * Math.PI * 2.6 + braco * Math.PI, r = h * (0.08 + 0.8 * t) + (Math.random() - 0.5) * 14; g.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.08})`; g.beginPath(); g.arc(h + Math.cos(a) * r, h + Math.sin(a) * r * 0.82, 1 + Math.random() * 3.2, 0, 6.29); g.fill(); }
  });
  const texNebulosa = [0, 1, 2].map((s) => textura((g, n) => {
    const h = n / 2;
    for (let k = 0; k < 14; k++) { const x = h + (Math.random() - 0.5) * n * 0.5, y = h + (Math.random() - 0.5) * n * 0.5, r = n * (0.08 + Math.random() * 0.2); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill(); }
  }));
  const texPonto = textura((g, n) => { const h = n / 2; const gr = g.createRadialGradient(h, h, 0, h, h, h); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); }, 64);

  // ── camadas de fundo infinitas (paralaxe) ──────────────────────────────────────
  const fundoCamadas = [];
  [[fraco ? 1800 : 3500, 0.35, 14000, -1200], [fraco ? 1400 : 2600, 0.6, 9000, -400], [fraco ? 800 : 1500, 0.85, 6000, -120]].forEach(([n, fator, T, z], ci) => {
    const p = new Float32Array(n * 3), c = new Float32Array(n * 3), t = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      p[i * 3] = Math.random() * T; p[i * 3 + 1] = Math.random() * T; p[i * 3 + 2] = z;
      const azul = Math.random() < 0.6, br = 0.25 + Math.pow(Math.random(), 3) * 0.75;
      c[i * 3] = (azul ? 0.78 : 1) * br; c[i * 3 + 1] = (azul ? 0.86 : 0.93) * br; c[i * 3 + 2] = (azul ? 1 : 0.8) * br;
      t[i] = (0.6 + Math.pow(Math.random(), 5) * 2.4) * (ci === 2 ? 1.3 : 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setAttribute('tam', new THREE.BufferAttribute(t, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { cam: { value: new THREE.Vector2() }, T: { value: T }, fator: { value: fator }, px: { value: escala } },
      vertexShader: `attribute float tam; uniform vec2 cam; uniform float T; uniform float fator; uniform float px; varying vec3 c;
        void main(){ c = color; vec3 q = position; vec2 o = cam * fator; q.xy = cam + mod(q.xy - o, T) - T * 0.5; gl_PointSize = tam * px; gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0); }`,
      fragmentShader: 'varying vec3 c; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(c * a, a); }' });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; cena.add(pts); fundoCamadas.push(m);
  });
  const nebulosas = new THREE.Group(), galaxias = new THREE.Group(); cena.add(nebulosas, galaxias);

  // ── versículos (as estrelas reais) ─────────────────────────────────────────────
  const gVers = new THREE.BufferGeometry();
  let vBase = null, vBriBase = null;
  const matVers = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { px: { value: escala }, k: { value: 1 } },
    vertexShader: `attribute float tam; attribute float brilho; uniform float px; uniform float k; varying vec3 c; varying float b;
      void main(){ c = color; b = brilho; vec4 mv = modelViewMatrix * vec4(position, 1.0); float s = tam * k * 900.0 / -mv.z; gl_PointSize = clamp(s, 0.9, 26.0) * px * (0.65 + 0.35 * brilho); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'varying vec3 c; varying float b; void main(){ float d = length(gl_PointCoord - 0.5); float nucleo = smoothstep(0.18, 0.0, d); float halo = smoothstep(0.5, 0.0, d) * 0.5; float a = (nucleo + halo) * b; gl_FragColor = vec4(c * a + vec3(nucleo * b * 0.35), a); }' });
  const versos = new THREE.Points(gVers, matVers); versos.frustumCulled = false; cena.add(versos);

  // ── constelação: linhas que acendem em sequência + partículas correndo por elas ─────────────
  const MAX_LIN = 64;
  const gLin = new THREE.BufferGeometry();
  gLin.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_LIN * 6), 3).setUsage(THREE.DynamicDrawUsage));
  gLin.setAttribute('alfa', new THREE.BufferAttribute(new Float32Array(MAX_LIN * 2), 1).setUsage(THREE.DynamicDrawUsage));
  gLin.setAttribute('cor', new THREE.BufferAttribute(new Float32Array(MAX_LIN * 6), 3).setUsage(THREE.DynamicDrawUsage));
  const linhas = new THREE.LineSegments(gLin, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float alfa; attribute vec3 cor; varying float a; varying vec3 c; void main(){ a = alfa; c = cor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying float a; varying vec3 c; void main(){ gl_FragColor = vec4(c * a, a); }' }));
  linhas.frustumCulled = false; cena.add(linhas);
  const MAX_PART = fraco ? 160 : 420;
  const gPart = new THREE.BufferGeometry();
  gPart.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_PART * 3), 3).setUsage(THREE.DynamicDrawUsage));
  gPart.setAttribute('alfa', new THREE.BufferAttribute(new Float32Array(MAX_PART), 1).setUsage(THREE.DynamicDrawUsage));
  const particulas = new THREE.Points(gPart, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { px: { value: escala } },
    vertexShader: 'attribute float alfa; uniform float px; varying float a; void main(){ a = alfa; gl_PointSize = 3.2 * px; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying float a; void main(){ float d = length(gl_PointCoord - 0.5); float k = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vec3(1.0, 0.9, 0.65) * k * a, k * a); }' }));
  particulas.frustumCulled = false; cena.add(particulas);
  // satélites: elementos do NEXUS (obras, autores, conceitos, termos) em volta das passagens abertas
  const gSat = new THREE.BufferGeometry();
  const satelites = new THREE.Points(gSat, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, uniforms: { px: { value: escala } },
    vertexShader: 'attribute float alfa; uniform float px; varying vec3 c; varying float a; void main(){ c = color; a = alfa; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = clamp(5200.0 / -mv.z, 3.0, 22.0) * px; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec3 c; varying float a; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float anel = smoothstep(0.5, 0.36, d) * smoothstep(0.2, 0.3, d); float nucleo = smoothstep(0.22, 0.0, d); gl_FragColor = vec4(c * (anel + nucleo) * a, (anel + nucleo) * a); }' }));
  satelites.frustumCulled = false; cena.add(satelites);

  let constel = null;      // { origem, idx, alvos:[{idx, k, peso}], t0, soltoEm }
  const cacheRefs = new Map();
  async function refsDe(k) {
    if (cacheRefs.has(k)) return cacheRefs.get(k);
    const p = (async () => {
      try {   // público: referências cruzadas do OpenBible (sem crachá, rápido)
        const r = await fetch('/api/nexus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'expandir', id: 'p:' + k + '-' + k }) });
        const j = await r.json();
        if (!j.ok) return [];
        const vistos = new Set(), out = [];
        for (const a of j.arestas || []) {
          if (a.tipo !== 'refcruz') continue;
          const outro = a.de === 'p:' + k + '-' + k ? a.para : a.de, q = lerId(outro);
          if (!q || vistos.has(q.ini)) continue; vistos.add(q.ini);
          out.push({ k: q.ini, fim: q.fim, peso: a.peso || 1, estado: a.estado || 'interpretacao' });
        }
        return out.sort((a, b) => b.peso - a.peso).slice(0, 28);
      } catch (_) { return []; }
    })();
    cacheRefs.set(k, p);
    return p;
  }
  async function formar(k) {
    if (constel && constel.origem === k && !constel.soltoEm) return;
    const idx = vIdx.get(k); if (idx == null) return;
    const marca = Symbol();
    constel = { origem: k, idx, alvos: [], t0: performance.now(), marca, soltoEm: 0 };
    const refs = await refsDe(k);
    if (!constel || constel.marca !== marca) return;
    const agora = performance.now();
    constel.alvos = refs.map((r, i) => ({ idx: vIdx.get(r.k), k: r.k, peso: r.peso, inicio: agora + i * 75 })).filter((a) => a.idx != null).slice(0, MAX_LIN);
    // satélites do NEXUS ligados a esta passagem também entram na constelação
    mostrarInfo();
  }
  function soltar() { if (constel && !constel.soltoEm) constel.soltoEm = performance.now(); }

  // ── satélites a partir do grafo do NEXUS ───────────────────────────────────────
  let sats = [], assinatura = '';
  function montarSatelites() {
    const g = estado.graph; sats = [];
    const ancora = new Map();
    g.forEachNode((id, a) => {
      if (a.tipo === 'passagem' || a.tipo === 'mais' || String(id).startsWith('x:') && !g.hasNode(id)) return;
      let melhor = null, grauM = -1;
      g.forEachNeighbor(id, (v, av) => { const q = lerId(v); if (q && vIdx.has(q.ini) && g.degree(v) > grauM) { grauM = g.degree(v); melhor = q.ini; } });
      if (melhor == null) return;
      const lista = ancora.get(melhor) || []; lista.push(id); ancora.set(melhor, lista);
    });
    for (const [k, ids] of ancora) {
      const j = vIdx.get(k), bx = vBase[j * 3], by = vBase[j * 3 + 1];
      ids.forEach((id, i) => {
        const anel = Math.floor(i / 10), a = (i % 10) / 10 * Math.PI * 2 + anel * 0.5 + hash(id) * 0.2, r = 26 + anel * 20;
        const tipo = g.getNodeAttribute(id, 'tipo');
        sats.push({ id, k, x: bx + Math.cos(a) * r, y: by + Math.sin(a) * r, tipo, rotulo: g.getNodeAttribute(id, 'label') || id, cor: new THREE.Color(COR_TIPO[tipo] || '#DDE3EE') });
      });
    }
    gSat.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sats.flatMap((s) => [s.x, s.y, 1])), 3));
    gSat.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sats.flatMap((s) => [s.cor.r, s.cor.g, s.cor.b])), 3));
    gSat.setAttribute('alfa', new THREE.BufferAttribute(new Float32Array(sats.length), 1).setUsage(THREE.DynamicDrawUsage));
  }

  // ── projeção, escolha e informação ───────────────────────────────────────────
  let W = 1, H = 1;
  const tmp = new THREE.Vector3();
  function tela(x, y, z = 0) { tmp.set(x, y, z).project(camera); if (tmp.z > 1 || tmp.z < -1) return null; return { x: (tmp.x + 1) / 2 * W, y: (1 - tmp.y) / 2 * H }; }
  function versoPerto(px, py, raio) {
    if (!pronto) return -1;
    const w = noPlano(px, py); if (!w) return -1;
    const mundoPx = dist * Math.tan(camera.fov * Math.PI / 360) * 2 / H;   // unidades por pixel
    const r = raio * mundoPx;
    // só os livros próximos ao ponto (rápido)
    let melhor = -1, dm = Infinity;
    for (const lv of livros) {
      if (Math.hypot(lv.cx - w.x, lv.cy - w.y) > lv.raio * 1.2 + r) continue;
      const inicio = vIdx.get(chave(lv.num, 1, 1)), fimI = inicio + lv.versos;
      for (let j = inicio; j < fimI; j++) { const d = (vPos[j * 3] - w.x) ** 2 + (vPos[j * 3 + 1] - w.y) ** 2; if (d < dm) { dm = d; melhor = j; } }
    }
    return dm <= r * r ? melhor : -1;
  }
  function livroPerto(px, py) { const w = noPlano(px, py); if (!w) return null; let m = null, dm = Infinity; for (const lv of livros) { const d = Math.hypot(lv.cx - w.x, lv.cy - w.y); if (d < lv.raio * 1.15 && d < dm) { dm = d; m = lv; } } return m; }
  function satPerto(px, py, raio) { let m = -1, dm = raio * raio; sats.forEach((s, i) => { const p = tela(s.x, s.y, 1); if (!p) return; const d = (p.x - px) ** 2 + (p.y - py) ** 2; if (d < dm) { dm = d; m = i; } }); return m; }
  const nomeRef = (k) => { const d = decompor(k); return BIB ? `${BIB[d.b - 1].name} ${d.c}:${d.v}` : String(k); };
  const textoDe = (k) => { const d = decompor(k); try { return BIB[d.b - 1].chapters[d.c - 1][d.v - 1] || ''; } catch (_) { return ''; } };
  const info = ui.querySelector('.cu-info');
  let mouse = { x: -1, y: -1 }, sobreLivro = null;
  function mostrarInfo() {
    if (constel && !constel.soltoEm) {
      const k = constel.origem, t = textoDe(k);
      info.innerHTML = `<b>${esc(nomeRef(k))}</b><em>“${esc(t.length > 140 ? t.slice(0, 138) + '…' : t)}”</em><small>${constel.alvos.length ? constel.alvos.length + ' referência(s) cruzada(s) acesas · OpenBible (interpretação)' : 'buscando ligações…'} · clique para investigar</small>`;
    } else if (sobreLivro) {
      info.innerHTML = `<b>${esc(sobreLivro.nome)}</b><em>${sobreLivro.caps} capítulo(s) · ${sobreLivro.versos} versículos</em><small>${esc(sobreLivro.sec.nome)} · clique para entrar na galáxia</small>`;
    } else { info.hidden = true; return; }
    info.hidden = false;
    const x = Math.min(W - 310, mouse.x + 16), y = Math.min(H - 90, mouse.y + 14);
    info.style.left = Math.max(8, x) + 'px'; info.style.top = Math.max(8, y) + 'px';
  }
  // cartão de seleção (o painel completo é o do NEXUS)
  const cartao = ui.querySelector('.cu-cartao');
  let selecionado = null;
  function abrirCartao(k) {
    selecionado = k;
    const t = textoDe(k), d = decompor(k);
    cartao.innerHTML = `<small>Passagem · ${esc(livros[d.b - 1].sec.nome)}</small><b>${esc(nomeRef(k))}</b><q>${esc(t)}</q>
      <div class="cu-bts"><button class="cu-abrir" type="button">Abrir investigação</button><button class="cu-aprox" type="button">Aproximar</button><button class="cu-fechar" type="button">Fechar</button></div>`;
    cartao.hidden = false;
    cartao.querySelector('.cu-abrir').onclick = () => investigar(k);
    cartao.querySelector('.cu-aprox').onclick = () => { const j = vIdx.get(k); voar(vBase[j * 3], vBase[j * 3 + 1], 160); };
    cartao.querySelector('.cu-fechar').onclick = () => { cartao.hidden = true; selecionado = null; soltar(); };
  }
  async function investigar(k) {
    const id = 'p:' + k + '-' + k;
    if (!estado.graph.hasNode(id) || !(estado.expandidos && estado.expandidos.has(id))) await acoes.expandir(id);
    if (estado.graph.hasNode(id)) acoes.selecionar(id, false, true);
    cartao.hidden = true;
  }

  // ── entrada: mouse, roda, toque ──────────────────────────────────────────────
  const ponteiros = new Map();
  let interagiu = false;
  let arrasto = null, pinca = null, moveu = false, toqueLongo = 0, ultimoToque = 0, botaoDireito = false;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    ponteiros.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    voo = null; inercia.set(0, 0); moveu = false; botaoDireito = e.button === 2; interagiu = true;
    if (ponteiros.size === 1) {
      arrasto = { x: e.offsetX, y: e.offsetY, t: performance.now() };
      if (e.pointerType === 'touch') { clearTimeout(toqueLongo); toqueLongo = setTimeout(() => { if (!moveu) { const j = versoPerto(e.offsetX, e.offsetY, 26); if (j >= 0) { formar(vChave[j]); investigar(vChave[j]); } } }, 600); }
    }
    if (ponteiros.size === 2) { const [a, b] = [...ponteiros.values()]; pinca = { d: Math.hypot(a.x - b.x, a.y - b.y), dist, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; arrasto = null; clearTimeout(toqueLongo); }
    canvas.classList.add('arrastando');
  });
  canvas.addEventListener('pointermove', (e) => {
    mouse = { x: e.offsetX, y: e.offsetY };
    if (ponteiros.has(e.pointerId)) ponteiros.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pinca && ponteiros.size === 2) {
      const [a, b] = [...ponteiros.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      const alvoD = pinca.dist * pinca.d / Math.max(10, d);
      zoomEm(pinca.cx, pinca.cy, alvoD / dist); moveu = true; return;
    }
    if (arrasto) {
      const dx = e.offsetX - arrasto.x, dy = e.offsetY - arrasto.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) { moveu = true; clearTimeout(toqueLongo); }
      if (botaoDireito) { incl += dy * 0.004; posicionar(); }
      else {
        const a0 = noPlano(arrasto.x, arrasto.y), a1 = noPlano(e.offsetX, e.offsetY);
        if (a0 && a1) { alvo.x -= a1.x - a0.x; alvo.y -= a1.y - a0.y; posicionar(); const dt = Math.max(8, performance.now() - arrasto.t); inercia.set(-(a1.x - a0.x) / dt * 16, -(a1.y - a0.y) / dt * 16); }
      }
      arrasto = { x: e.offsetX, y: e.offsetY, t: performance.now() };
      return;
    }
    if (e.pointerType === 'mouse') pairar(e.offsetX, e.offsetY);
  });
  let pairarT = 0;
  function pairar(x, y) {
    clearTimeout(pairarT);
    pairarT = setTimeout(() => {
      const s = dist < 1800 ? satPerto(x, y, 12) : -1;
      if (s >= 0) { canvas.style.cursor = 'pointer'; info.innerHTML = `<b>${esc(sats[s].rotulo)}</b><small>${esc(NOME_TIPO[sats[s].tipo] || sats[s].tipo)} · ligado a ${esc(nomeRef(sats[s].k))} · clique para ver as evidências</small>`; info.hidden = false; info.style.left = Math.min(W - 310, x + 16) + 'px'; info.style.top = Math.min(H - 80, y + 14) + 'px'; return; }
      const j = dist < 5200 ? versoPerto(x, y, 12) : -1;
      if (j >= 0) { sobreLivro = null; formar(vChave[j]); canvas.style.cursor = 'pointer'; mostrarInfo(); return; }
      if (constel && !constel.soltoEm) soltar();
      const lv = dist >= 1200 ? livroPerto(x, y) : null;
      sobreLivro = lv; canvas.style.cursor = lv ? 'pointer' : '';
      mostrarInfo();
    }, 40);
  }
  const fim = (e) => {
    ponteiros.delete(e.pointerId);
    if (ponteiros.size < 2) pinca = null;
    if (ponteiros.size === 0) {
      canvas.classList.remove('arrastando'); clearTimeout(toqueLongo);
      if (!moveu && !botaoDireito) clique(e.offsetX, e.offsetY, e.pointerType);
      arrasto = null;
    }
  };
  canvas.addEventListener('pointerup', fim);
  canvas.addEventListener('pointercancel', fim);
  canvas.addEventListener('pointerleave', () => { if (!ponteiros.size) { soltar(); sobreLivro = null; info.hidden = true; } });
  let cartaoT = 0;   // no toque, o cartão espera um instante (um segundo toque vira zoom)
  function clique(x, y, tipo) {
    const agora = performance.now(), duplo = agora - ultimoToque < 320; ultimoToque = agora;
    if (duplo) { clearTimeout(cartaoT); const w = noPlano(x, y); if (w) { lembrarVista(); voo = { de: { x: alvo.x, y: alvo.y, d: dist }, para: { x: w.x, y: w.y, d: Math.max(DIST_MIN, dist * 0.35) }, t0: agora, dur: 700 }; } return; }
    const s = dist < 1800 ? satPerto(x, y, tipo === 'touch' ? 22 : 12) : -1;
    if (s >= 0) { acoes.selecionar(sats[s].id, false, true); return; }
    const j = dist < 5200 ? versoPerto(x, y, tipo === 'touch' ? 24 : 12) : -1;
    if (j >= 0) { formar(vChave[j]); clearTimeout(cartaoT); const kk = vChave[j]; if (tipo === 'touch') cartaoT = setTimeout(() => abrirCartao(kk), 330); else abrirCartao(kk); return; }
    const lv = livroPerto(x, y);
    if (lv && dist > 1500) { voar(lv.cx, lv.cy, lv.raio * 4.2); return; }
    const sec = secoes.find((s2) => { const p = tela(s2.cx, s2.cy); return p && Math.hypot(p.x - x, p.y - y) < 60; });
    if (sec) { voar(sec.cx, sec.cy, sec.raio * 3.4); return; }
    if (tipo === 'touch' && constel) soltar();
  }
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); voo = null; interagiu = true; zoomEm(e.offsetX, e.offsetY, Math.exp(e.deltaY * 0.0016)); }, { passive: false });
  ui.querySelector('.cu-controles').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cu]'); if (!b) return;
    const o = b.dataset.cu;
    if (o === 'mais') voar(alvo.x, alvo.y, dist * 0.5);
    else if (o === 'menos') voar(alvo.x, alvo.y, dist * 2);
    else if (o === 'geral') vistaGeral();
    else if (o === 'centro') centralizar(selecionado ? 'p:' + selecionado + '-' + selecionado : (estado.sel || estado.foco));
    else if (o === 'voltar') { const v = historico.pop(); if (v) { voo = { de: { x: alvo.x, y: alvo.y, d: dist }, para: { x: v.x, y: v.y, d: v.d }, t0: performance.now(), dur: 900 }; incl = v.i; } }
    else if (o === 'tela') { const el = container.closest('.palco') || container; if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen && el.requestFullscreen().catch(() => {}); }
  });
  // distância que mostra todas as regiões na tela (com folga)
  function caixaGeral() {
    const x0 = Math.min(...secoes.map((s) => s.cx - s.raio)), x1 = Math.max(...secoes.map((s) => s.cx + s.raio));
    const y0 = Math.min(...secoes.map((s) => s.cy - s.raio)), y1 = Math.max(...secoes.map((s) => s.cy + s.raio));
    const t = Math.tan(camera.fov * Math.PI / 360), aspecto = W / H;
    const d = Math.max((y1 - y0) / 2 / t, (x1 - x0) / 2 / (t * aspecto)) * 1.12;
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, d: Math.min(DIST_MAX, d) };
  }
  function vistaGeral() { if (!secoes.length) return; const c = caixaGeral(); voar(c.x, c.y, c.d); incl = 0; }
  function centralizar(id) {
    const q = lerId(id);
    if (q && vIdx.has(q.ini)) { const j = vIdx.get(q.ini); voar(vBase[j * 3], vBase[j * 3 + 1], Math.min(dist, 260)); return; }
    const s = sats.find((x) => x.id === id); if (s) voar(s.x, s.y, Math.min(dist, 140));
  }

  // ── rótulos em camadas (conforme o zoom e o espaço) ─────────────────────────────
  const nivelEl = ui.querySelector('.cu-nivel');
  function rotulos(t) {
    g2.setTransform(escala, 0, 0, escala, 0, 0); g2.clearRect(0, 0, W, H);
    const ocup = [];
    const cabe = (b) => !ocup.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
    const texto = (txt, x, y, fonte, cor, fundo, alfa = 1, centro = true) => {
      g2.font = fonte; const w = g2.measureText(txt).width; const x0 = centro ? x - w / 2 : x;
      const b = { x0: x0 - 6, x1: x0 + w + 6, y0: y - 10, y1: y + 10 }; if (!cabe(b)) return false; ocup.push(b);
      g2.globalAlpha = alfa; if (fundo) { g2.fillStyle = fundo; g2.fillRect(b.x0, b.y0, b.x1 - b.x0, 20); }
      g2.fillStyle = cor; g2.textAlign = 'left'; g2.textBaseline = 'middle'; g2.fillText(txt, x0, y); g2.globalAlpha = 1; return true;
    };
    // destaques primeiro: a constelação ativa
    if (constel) {
      const fade = constel.soltoEm ? Math.max(0, 1 - (t - constel.soltoEm) / 2600) : 1;
      const p0 = tela(vPos[constel.idx * 3], vPos[constel.idx * 3 + 1]);
      if (p0) texto(nomeRef(constel.origem), p0.x + 10, p0.y - 12, '600 13px Inter, system-ui, sans-serif', '#FFF2CF', 'rgba(4,8,20,.6)', fade, false);
      constel.alvos.forEach((a) => { if (t < a.inicio + 300) return; const p = tela(vPos[a.idx * 3], vPos[a.idx * 3 + 1]); if (p && p.x > 0 && p.x < W && p.y > 0 && p.y < H) texto(nomeRef(a.k), p.x + 8, p.y, '12px Inter, system-ui, sans-serif', '#F4E3B5', 'rgba(4,8,20,.55)', fade * 0.95, false); });
    }
    // satélites (com PIN) quando perto
    const kAtivo = constel && !constel.soltoEm ? constel.origem : selecionado;
    let nSat = 0;
    if (dist < 900) sats.forEach((s) => { if (nSat >= 36 || (s.k !== kAtivo && dist > 260)) return; const p = tela(s.x, s.y, 1); if (p && p.x > 0 && p.x < W && p.y > 0 && p.y < H) { nSat++; const r = String(s.rotulo); texto(r.length > 30 ? r.slice(0, 28) + '…' : r, p.x + 9, p.y, '11.5px Inter, system-ui, sans-serif', '#CFE7E4', 'rgba(4,8,20,.5)', 0.9, false); } });
    let nivel;
    if (dist > 9000) {   // REGIÕES
      nivel = 'Universo · regiões do cânon';
      const a = Math.min(1, (dist - 9000) / 4000) * 0.85 + 0.15;
      secoes.forEach((s) => { const p = tela(s.cx, s.cy - s.raio * 0.95); if (p) texto(s.nome.toUpperCase(), p.x, p.y, '600 15px "Cormorant Garamond", Georgia, serif', '#F2DFAE', null, a); });
      if (dist < 16000) livros.forEach((lv) => { const p = tela(lv.cx, lv.cy); if (p) texto(lv.nome, p.x, p.y + 4, '11px Inter, system-ui, sans-serif', 'rgba(220,228,245,.7)', null, Math.min(1, (16000 - dist) / 5000)); });
    } else if (dist > 2200) {   // GALÁXIAS (livros)
      nivel = 'Galáxias · livros';
      livros.forEach((lv) => { const p = tela(lv.cx, lv.cy - lv.raio * 1.05); if (p && p.x > -80 && p.x < W + 80 && p.y > -30 && p.y < H + 30) texto(lv.nome, p.x, p.y, '600 14px "Cormorant Garamond", Georgia, serif', '#F2DFAE', 'rgba(4,8,20,.45)', 1); });
      secoes.forEach((s) => { const p = tela(s.cx, s.cy - s.raio * 1.05); if (p) texto(s.nome.toUpperCase(), p.x, p.y, '600 12px "Cormorant Garamond", Georgia, serif', 'rgba(242,223,174,.55)', null, 1); });
    } else if (dist > 520) {   // CONSTELAÇÕES (capítulos)
      nivel = 'Constelações · capítulos';
      let n = 0;
      for (const lv of livros) {
        if (Math.hypot(lv.cx - alvo.x, lv.cy - alvo.y) > dist * 1.6 + lv.raio) continue;
        const p = tela(lv.cx, lv.cy - lv.raio * 1.05); if (p) texto(lv.nome, p.x, p.y, '600 14px "Cormorant Garamond", Georgia, serif', 'rgba(242,223,174,.75)', null, 1);
        for (const c of lv.capPos) { if (n > 90) break; const q = tela(c.x, c.y); if (q && q.x > 0 && q.x < W && q.y > 0 && q.y < H && texto(lv.abbrev.toUpperCase() + ' ' + c.c, q.x, q.y - 16, '11.5px Inter, system-ui, sans-serif', 'rgba(225,230,245,.82)', 'rgba(4,8,20,.4)', 1)) n++; }
      }
    } else {   // ESTRELAS (versículos)
      nivel = 'Estrelas · versículos';
      let n = 0;
      for (const lv of livros) {
        if (Math.hypot(lv.cx - alvo.x, lv.cy - alvo.y) > dist * 2 + lv.raio) continue;
        const inicio = vIdx.get(chave(lv.num, 1, 1));
        for (let j = inicio; j < inicio + lv.versos && n < 70; j++) {
          const p = tela(vPos[j * 3], vPos[j * 3 + 1]); if (!p || p.x < 0 || p.x > W || p.y < 0 || p.y > H) continue;
          const d = decompor(vChave[j]); if (texto(`${lv.abbrev.toUpperCase()} ${d.c}:${d.v}`, p.x + 7, p.y, '11px Inter, system-ui, sans-serif', 'rgba(230,234,246,.78)', null, 1, false)) n++;
        }
      }
    }
    // a passagem em foco: farol discreto
    const qf = lerId(estado.foco);
    if (qf && vIdx.has(qf.ini)) {
      const j = vIdx.get(qf.ini), p = tela(vPos[j * 3], vPos[j * 3 + 1]);
      if (p) { const pulso = 9 + Math.sin(t / 380) * 3; g2.strokeStyle = 'rgba(242,214,140,.75)'; g2.lineWidth = 1.2; g2.beginPath(); g2.arc(p.x, p.y, pulso, 0, 6.29); g2.stroke(); if (dist > 520) texto(nomeRef(qf.ini), p.x + 14, p.y - 10, '600 12px Inter, system-ui, sans-serif', '#F7E4B0', 'rgba(4,8,20,.6)', 1, false); }
    }
    if (nivelEl.textContent !== nivel) nivelEl.textContent = nivel;
  }

  // ── laço ─────────────────────────────────────────────────────────────────────
  let ativo = false, quadro = 0, ultimo = performance.now(), pronto = false;
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ajustar() { W = container.clientWidth || 1; H = container.clientHeight || 1; renderer.setSize(W, H, false); camera.aspect = W / H; posicionar(); rot.width = W * escala; rot.height = H * escala; }
  const obs = new ResizeObserver(() => ativo && ajustar()); obs.observe(container);
  const corOuro = new THREE.Color('#F3D38E'), corAzul = new THREE.Color('#9FC0FF');
  function quadroDesenho(t) {
    if (!ativo) return;
    const dt = Math.min(50, t - ultimo); ultimo = t;
    if (voo) {
      const q = Math.min(1, (t - voo.t0) / voo.dur), e = q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
      alvo.x = voo.de.x + (voo.para.x - voo.de.x) * e; alvo.y = voo.de.y + (voo.para.y - voo.de.y) * e;
      dist = Math.exp(Math.log(voo.de.d) + (Math.log(voo.para.d) - Math.log(voo.de.d)) * e); posicionar();
      if (q >= 1) voo = null;
    } else if (!arrasto && inercia.lengthSq() > 1e-4) { alvo.x += inercia.x * dt / 16; alvo.y += inercia.y * dt / 16; inercia.multiplyScalar(0.92); posicionar(); }
    fundoCamadas.forEach((m) => m.uniforms.cam.value.set(alvo.x, alvo.y));
    matVers.uniforms.k.value = 1;
    // galáxias e nebulosas: fortes de longe, somem perto
    const longe = Math.min(1, Math.max(0, (dist - 900) / 6000));
    galaxias.children.forEach((sp, i) => { const lv = livros[i]; const foco = sobreLivro === lv ? 0.55 : 0; sp.material.opacity += ((0.12 + 0.5 * longe + foco) - sp.material.opacity) * 0.12; });
    nebulosas.children.forEach((sp) => { sp.material.opacity = 0.05 + 0.13 * longe; });
    if (pronto) {
      // constelação: estrelas ligadas brilham e se aproximam um pouco; linhas acendem em sequência
      const lp = gLin.attributes.position, la = gLin.attributes.alfa, lc = gLin.attributes.cor;
      const pp = gPart.attributes.position, pa = gPart.attributes.alfa;
      const bri = gVers.attributes.brilho, pos = gVers.attributes.position;
      if (tocados.size) { for (const j of tocados) { vBri[j] = vBriBase[j]; vPos[j * 3] = vBase[j * 3]; vPos[j * 3 + 1] = vBase[j * 3 + 1]; } tocados.clear(); }
      let nl = 0, np = 0;
      if (constel) {
        const fade = constel.soltoEm ? Math.max(0, 1 - (t - constel.soltoEm) / 2600) : 1;
        if (fade <= 0) constel = null;
        else {
          const o = constel.idx, ox = vBase[o * 3], oy = vBase[o * 3 + 1];
          vBri[o] = 2.2; tocados.add(o);
          const forma = Math.min(1, (t - constel.t0) / 900);
          for (const a of constel.alvos) {
            const prog = Math.min(1, Math.max(0, (t - a.inicio) / 420));
            if (prog <= 0) continue;
            const j = a.idx, bx = vBase[j * 3], by = vBase[j * 3 + 1];
            const dd = Math.hypot(bx - ox, by - oy) || 1, puxa = reduzido ? 0 : Math.min(0.08 * dd, 60) * forma * fade;
            vPos[j * 3] = bx + (ox - bx) / dd * puxa; vPos[j * 3 + 1] = by + (oy - by) / dd * puxa; vBri[j] = 1.2 + 0.8 * fade; tocados.add(j);
            if (nl < MAX_LIN) {
              const ex = ox + (vPos[j * 3] - ox) * prog, ey = oy + (vPos[j * 3 + 1] - oy) * prog;
              lp.setXYZ(nl * 2, ox, oy, 0.5); lp.setXYZ(nl * 2 + 1, ex, ey, 0.5);
              const al = (0.35 + 0.45 * Math.min(1, a.peso / 40)) * fade; la.setX(nl * 2, al); la.setX(nl * 2 + 1, al * 0.7);
              const c = corOuro.clone().lerp(corAzul, Math.min(1, dd / 9000)); lc.setXYZ(nl * 2, c.r, c.g, c.b); lc.setXYZ(nl * 2 + 1, c.r, c.g, c.b);
              nl++;
              if (prog >= 1 && !reduzido) for (let q = 0; q < 3 && np < MAX_PART; q++) { const f = ((t / 1600) + q / 3 + hash(j) ) % 1; pp.setXYZ(np, ox + (vPos[j * 3] - ox) * f, oy + (vPos[j * 3 + 1] - oy) * f, 0.6); pa.setX(np, Math.sin(f * Math.PI) * fade); np++; }
            }
          }
        }
      }
      // galáxia sob o cursor: partículas vindo em direção ao centro
      if (sobreLivro && !reduzido) { const lv = sobreLivro; for (let q = 0; q < 40 && np < MAX_PART; q++) { const f = ((t / 2400) + q / 40) % 1, a = q * 2.39996 + lv.rotacao, r = lv.raio * 1.5 * (1 - f); pp.setXYZ(np, lv.cx + Math.cos(a) * r, lv.cy + Math.sin(a) * r * 0.85, 0.6); pa.setX(np, Math.sin(f * Math.PI) * 0.8); np++; } }
      for (let i = nl; i < MAX_LIN; i++) { la.setX(i * 2, 0); la.setX(i * 2 + 1, 0); }
      for (let i = np; i < MAX_PART; i++) pa.setX(i, 0);
      lp.needsUpdate = la.needsUpdate = lc.needsUpdate = pp.needsUpdate = pa.needsUpdate = true;
      bri.needsUpdate = pos.needsUpdate = true;
      // satélites aparecem quando perto (e brilham na constelação da sua passagem)
      const ass = estado.graph.order + '|' + estado.graph.size;
      if (ass !== assinatura) { assinatura = ass; montarSatelites(); }
      if (sats.length) { const sa = gSat.attributes.alfa; const perto = Math.min(1, Math.max(0, (1800 - dist) / 1300)); const kA = constel && !constel.soltoEm ? constel.origem : selecionado; sats.forEach((s, i) => sa.setX(i, perto * (s.k === kA ? 1 : 0.45))); sa.needsUpdate = true; }
    }
    renderer.render(cena, camera);
    rotulos(t);
    if (constel || sobreLivro) mostrarInfo();
    if (pronto && t - salvoEm > 1500) { salvoEm = t; try { sessionStorage.setItem('nexus_universo_vista', JSON.stringify({ x: alvo.x, y: alvo.y, d: dist, i: incl })); } catch (_) {} }
    quadro = requestAnimationFrame(quadroDesenho);
  }
  const tocados = new Set();
  let salvoEm = 0;
  function restaurarVista() {
    try { const v = JSON.parse(sessionStorage.getItem('nexus_universo_vista') || 'null'); if (v && isFinite(v.x)) { alvo.set(v.x, v.y, 0); dist = v.d; incl = v.i || 0; posicionar(); return; } } catch (_) {}
    const c = caixaGeral(); alvo.set(c.x, c.y, 0); dist = c.d; posicionar();
    const qf = lerId(estado.foco); if (qf && vIdx.has(qf.ini)) refsDe(qf.ini);   // a constelação da passagem em foco já fica pronta
  }

  // a Almeida do próprio site (a mesma que o NEXUS usa)
  fetch('/biblia.json').then((r) => r.text()).then((t) => montarUniverso(JSON.parse(t.replace(/^[^\[]*/, '')))).catch(() => acoes.indisponivel && acoes.indisponivel());

  let primeira = true;
  return {
    ativar(valor) {
      ativo = valor;
      document.body.classList.toggle('ceu-universo', valor);
      cancelAnimationFrame(quadro);
      if (valor) {
        ajustar();
        if (primeira) { primeira = false; const pn = document.getElementById('painel'); if (pn) pn.hidden = true; }
        ultimo = performance.now(); quadro = requestAnimationFrame(quadroDesenho);
      }
    },
    enquadrar() { if (!interagiu) vistaGeral(); },   // o NEXUS pede enquadrar ao carregar; não tira a vista de quem já está navegando
    zoom(f) { voar(alvo.x, alvo.y, dist * f); },
    centralizar(id) { centralizar(id); },
    prever() {},
    descartar() {
      ativo = false; cancelAnimationFrame(quadro); obs.disconnect(); document.body.classList.remove('ceu-universo');
      cena.traverse((o) => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); });
      renderer.dispose(); canvas.remove(); rot.remove(); ui.remove(); estilo.remove();
    },
    _teste: {
      pronto: () => pronto, dist: () => dist, alvo: () => ({ x: alvo.x, y: alvo.y }), nivel: () => nivelEl.textContent,
      telaVerso: (k) => { const j = vIdx.get(k); return j == null ? null : tela(vPos[j * 3], vPos[j * 3 + 1]); },
      mundoVerso: (k) => { const j = vIdx.get(k); return j == null ? null : { x: vBase[j * 3], y: vBase[j * 3 + 1] }; },
      irPara: (x, y, d) => { voo = null; alvo.set(x, y, 0); dist = d; posicionar(); },
      constelacao: () => (constel ? { origem: constel.origem, alvos: constel.alvos.length, acesas: constel.alvos.filter((a) => performance.now() > a.inicio + 420).length, solta: !!constel.soltoEm } : null),
      cartao: () => !cartao.hidden, satelites: () => sats.length, versos: () => vChave.length, livros: () => livros.length,
      telaLivro: (n) => { const lv = livros[n - 1]; return lv ? tela(lv.cx, lv.cy) : null; }, incl: () => incl,
    },
  };
}
