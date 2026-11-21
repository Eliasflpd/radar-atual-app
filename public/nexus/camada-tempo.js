// NEXUS — CAMADA 4 · TEMPO (cronologia). Folha transparente sobre a Bíblia: cada acontecimento datado é uma estrela
// posta exatamente acima do versículo onde a narrativa dele começa; o "rio do tempo" liga os acontecimentos em ordem
// cronológica, e as épocas aparecem de longe. Dados: Theographic Bible Metadata (CC BY-SA 4.0), em camadas/tempo.json.
// As datas são as da cronologia usada pela fonte (tradicional), mostradas sempre como aproximadas e com aviso.
const ERAS = [   // divisão didática: cada época começa no ano do acontecimento-âncora (o ano vem da própria fonte)
  { nome: 'Origens', ancora: 'Creation of all things', cor: '#9FD3C7' },
  { nome: 'Patriarcas', ancora: 'Birth of Abraham', cor: '#E8C987' },
  { nome: 'Egito e Êxodo', ancora: 'Birth of Moses', cor: '#E9A97A' },
  { nome: 'Conquista e Juízes', ancora: 'Crossing the Jordan into Canaan', cor: '#C9B27A' },
  { nome: 'Reino unido', ancora: 'Reign of Saul', cor: '#F2D28B' },
  { nome: 'Reino dividido', ancora: 'Southern Kingdom (Judah)', cor: '#D9A0A0' },
  { nome: 'Exílio na Babilônia', ancora: 'Babylonian Captivity', cor: '#A9B8E6' },
  { nome: 'Retorno e Segundo Templo', ancora: 'Return from Exile', cor: '#9DC4D9' },
  { nome: 'Vida de Jesus', ancora: 'Espousal of Mary', cor: '#FFE3A3' },
  { nome: 'Igreja apostólica', ancora: 'The Holy Spirit is promised', cor: '#B9E0A5' },
];
export const anoTexto = (a) => (a == null ? 's/ data' : a < 0 ? `c. ${-a} a.C.` : `c. ${a} d.C.`);
const DUR = { D: ['dia', 'dias'], W: ['semana', 'semanas'], M: ['mês', 'meses'], Y: ['ano', 'anos'] };
const durTexto = (d) => { const m = /^(\d+)([DWMY])$/.exec(d || ''); if (!m) return ''; const n = +m[1]; return `${n} ${DUR[m[2]][n === 1 ? 0 : 1]}`; };
function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0; return h / 4294967295; }

export async function criarCamadaTempo(THREE, ctx) {
  const dados = await (await fetch('/nexus/camadas/tempo.json?v=1')).json();
  const ev = dados.eventos;
  // época de cada acontecimento
  // (a lista já vem em ordem cronológica: a época de cada acontecimento é a da última âncora que veio antes dele)
  const idxAncora = ERAS.map((e) => ev.findIndex((q) => q.t === e.ancora));
  ev.forEach((e, i) => { let k = 0; idxAncora.forEach((ia, q) => { if (ia >= 0 && ia <= i) k = q; }); e.era = k; e.i = i; e.nome = e.pt || e.t; });
  // posição: acima do primeiro versículo do acontecimento (com um pequeno afastamento quando vários começam no mesmo verso)
  const usados = new Map();
  ev.forEach((e) => {
    let p = null; for (const k of e.v) { p = ctx.posVerso(k); if (p) break; }
    if (!p) { e.x = null; return; }
    const ch = Math.round(p.x / 6) + ':' + Math.round(p.y / 6), n = usados.get(ch) || 0; usados.set(ch, n + 1);
    const a = n * 2.39996 + hash(e.t) * 6.28, r = n ? 10 + 7 * Math.sqrt(n) : 0;
    e.x = p.x + Math.cos(a) * r; e.y = p.y + Math.sin(a) * r;
  });
  const vis = ev.filter((e) => e.x != null);
  const objetos = [];
  // estrelas dos acontecimentos
  const n = vis.length, pos = new Float32Array(n * 3), cor = new Float32Array(n * 3), tam = new Float32Array(n), fase = new Float32Array(n);
  vis.forEach((e, i) => { pos[i * 3] = e.x; pos[i * 3 + 1] = e.y; pos[i * 3 + 2] = 0; const c = new THREE.Color(ERAS[e.era].cor); cor[i * 3] = c.r; cor[i * 3 + 1] = c.g; cor[i * 3 + 2] = c.b; tam[i] = 2.2 + Math.log2(1 + e.v.length) * 0.9; fase[i] = hash(e.t) * 6.28; e.vi = i; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cor, 3)); g.setAttribute('tam', new THREE.BufferAttribute(tam, 1)); g.setAttribute('fase', new THREE.BufferAttribute(fase, 1));
  const realce = new Float32Array(n); g.setAttribute('realce', new THREE.BufferAttribute(realce, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { px: { value: ctx.escala }, tempo: { value: 0 }, opac: { value: 1 } },
    vertexShader: `attribute float tam; attribute float fase; attribute float realce; uniform float px; uniform float tempo; varying vec3 c; varying float b;
      void main(){ c = color; b = 0.75 + 0.25 * sin(tempo * 1.3 + fase) + realce * 1.2; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float s = tam * (1.0 + realce * 0.8) * 1500.0 / -mv.z; gl_PointSize = clamp(s, 2.5, 30.0) * px; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float opac; varying vec3 c; varying float b; void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q);
      float anel = smoothstep(0.5, 0.42, d) * smoothstep(0.30, 0.38, d); float nucleo = smoothstep(0.2, 0.0, d); float raio = max(0.0, 1.0 - abs(q.x) * 14.0) * smoothstep(0.5, 0.0, abs(q.y)) + max(0.0, 1.0 - abs(q.y) * 14.0) * smoothstep(0.5, 0.0, abs(q.x));
      float a = (anel * 0.8 + nucleo + raio * 0.35) * b; gl_FragColor = opac * vec4(c * a, a); }` });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; objetos.push(pts);
  // rio do tempo: liga os acontecimentos em ordem cronológica, com uma corrente de luz andando do passado para o futuro;
  // saltos longos (a narrativa muda de livro) ficam quase apagados, para não riscar o universo
  const m2 = vis.length - 1, lp = new Float32Array(m2 * 6), lc = new Float32Array(m2 * 6), lo = new Float32Array(m2 * 2), lw = new Float32Array(m2 * 2);
  for (let i = 0; i < m2; i++) { const a = vis[i], b2 = vis[i + 1], len = Math.hypot(b2.x - a.x, b2.y - a.y), w = Math.max(0.06, 1 - len / 1600);
    [a, b2].forEach((e, q) => { const k = i * 2 + q; lp[k * 3] = e.x; lp[k * 3 + 1] = e.y; lp[k * 3 + 2] = -1; const c = new THREE.Color(ERAS[e.era].cor); lc[k * 3] = c.r; lc[k * 3 + 1] = c.g; lc[k * 3 + 2] = c.b; lo[k] = (i + q) / m2; lw[k] = w; }); }
  const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.BufferAttribute(lp, 3)); gl.setAttribute('color', new THREE.BufferAttribute(lc, 3)); gl.setAttribute('ordem', new THREE.BufferAttribute(lo, 1)); gl.setAttribute('peso', new THREE.BufferAttribute(lw, 1));
  const matL = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, uniforms: { tempo: { value: 0 }, opac: { value: 1 } },
    vertexShader: 'attribute float ordem; attribute float peso; varying vec3 c; varying float o; varying float w; void main(){ c = color; o = ordem; w = peso; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float opac; uniform float tempo; varying vec3 c; varying float o; varying float w; void main(){ float onda = pow(0.5 + 0.5 * sin((o * 60.0 - tempo * 0.8) * 6.2831), 6.0); float a = (0.14 + 0.5 * onda) * w * w; gl_FragColor = opac * vec4(c * a, a); }' });
  const rio = new THREE.LineSegments(gl, matL); rio.frustumCulled = false; objetos.push(rio);
  // centro de cada época (para o nome, de longe)
  const centros = ERAS.map((e, k) => { const es = vis.filter((q) => q.era === k); if (!es.length) return null; return { nome: e.nome, cor: e.cor, x: es.reduce((s, q) => s + q.x, 0) / es.length, y: es.reduce((s, q) => s + q.y, 0) / es.length, de: Math.min(...es.map((q) => q.a)), ate: Math.max(...es.map((q) => q.a)), n: es.length }; });
  const ordemPeso = vis.slice().sort((a, b) => b.v.length - a.v.length);
  let realcados = new Set();

  return {
    objetos, eventos: ev, aviso: dados.aviso, fonte: dados.fonte,
    quadro(t) { mat.uniforms.tempo.value = t / 1000; matL.uniforms.tempo.value = t / 1000; },
    realcar(lista) { realcados = new Set(lista); for (let i = 0; i < n; i++) realce[i] = 0; for (const i of realcados) if (ev[i] && ev[i].vi != null) realce[ev[i].vi] = 1; g.attributes.realce.needsUpdate = true; },
    pegar(x, y, raio) { let m = -1, dm = raio * raio; for (const e of vis) { const p = ctx.tela(e.x, e.y); if (!p) continue; const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < dm) { dm = d; m = e.i; } } return m; },
    pos(i) { const e = ev[i]; return e && e.x != null ? { x: e.x, y: e.y } : null; },
    versos(i) { return ev[i] ? ev[i].v : []; },
    info(i) { const e = ev[i]; return `<b>${ctx.esc(e.nome)}</b><em>${anoTexto(e.a)}${e.dur ? ' · ' + durTexto(e.dur) : ''} · ${ERAS[e.era].nome}</em><small>Tempo · ${e.v.length} versículo(s)${e.pn.length ? ' · ' + e.pn.length + ' participante(s)' : ''} · clique para a ficha</small>`; },
    ficha(i) {
      const e = ev[i], esc = ctx.esc;
      const depois = ev.filter((q) => q.ant.includes(i)).slice(0, 6), antes = e.ant.map((k) => ev[k]).filter(Boolean);
      const verso = (k) => `<p><b>${esc(ctx.nomeRef(k))}</b> — “${esc(ctx.textoDe(k))}”</p>`;
      return { titulo: e.nome, rotulo: 'Tempo · cronologia', html:
        `<p><b>${anoTexto(e.a)}</b>${e.dur ? ' · duração: ' + durTexto(e.dur) : ''} · época: ${ERAS[e.era].nome}</p>
        ${e.pt && e.pt !== e.t ? `<small>Título na fonte: ${esc(e.t)}</small>` : ''}
        ${e.pn.length ? `<h5>Quem participa</h5><div class="cu-chips">${e.pn.map((p, k) => `<button type="button" data-camada="personagens" data-id="${e.p[k]}" data-busca="${esc(p)}">${esc(p)}</button>`).join('')}</div>` : ''}
        ${antes.length ? `<h5>Vem depois de</h5><div class="cu-chips">${antes.map((q) => `<button type="button" data-evento="${q.i}">${esc(q.nome)}</button>`).join('')}</div>` : ''}
        ${depois.length ? `<h5>Leva a</h5><div class="cu-chips">${depois.map((q) => `<button type="button" data-evento="${q.i}">${esc(q.nome)}</button>`).join('')}</div>` : ''}
        <h5>Versículos (${e.v.length})</h5>${e.v.slice(0, 6).map(verso).join('')}${e.v.length > 6 ? `<small>e mais ${e.v.length - 6}: use “Acender versículos” para vê-los na Bíblia.</small>` : ''}
        ${e.nota ? `<h5>Nota da fonte (em inglês)</h5><small>${esc(e.nota)}</small>` : ''}
        <p><small>⚠️ ${esc(dados.aviso)}</small></p><p><small>Fonte: ${esc(dados.fonte)}</small></p>`, versos: e.v };
    },
    rotulos(texto, dist, W, H) {
      if (dist > 9000) { centros.forEach((c) => { if (!c) return; const p = ctx.tela(c.x, c.y); if (p) texto(`${c.nome} · ${anoTexto(c.de).replace('c. ', '')} – ${anoTexto(c.ate).replace('c. ', '')}`, p.x, p.y + 26, '600 13px Inter, system-ui, sans-serif', c.cor, 'rgba(2,10,14,.66)', 0.95); }); return; }
      let k = 0; const lim = dist > 4000 ? 16 : dist > 1500 ? 34 : 60;
      for (const e of ordemPeso) { if (k >= lim) break; const p = ctx.tela(e.x, e.y); if (!p || p.x < 0 || p.x > W || p.y < 0 || p.y > H) continue; if (texto(`${e.nome} · ${anoTexto(e.a)}`, p.x + 10, p.y - 10, '600 12px Inter, system-ui, sans-serif', realcados.has(e.i) ? '#FFFFFF' : ERAS[e.era].cor, 'rgba(2,10,14,.7)', 1, false)) k++; }
    },
    buscar(q) {   // q já normalizado (minúsculas, sem acento); devolve { i, pont } (pont 100 = nome exato)
      if (q.length < 3) return null;
      let m = -1, pm = 0;
      for (const e of vis) { const a = ctx.norm(e.nome), b = ctx.norm(e.t); const p = a === q || b === q ? 100 : a.includes(q) || b.includes(q) ? 50 + Math.min(40, e.v.length / 10) : 0; if (p > pm) { pm = p; m = e.i; } }
      return m >= 0 ? { i: m, pont: pm } : null;
    },
  };
}
