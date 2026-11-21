// NEXUS — CAMADA 5 · PERSONAGENS E GENEALOGIAS. Folha transparente: cada pessoa da Bíblia é uma estrela posta acima do
// trecho onde ela mais aparece (o versículo do meio das suas menções, no livro em que é mais citada). Os fios finos são
// as ligações de pai/mãe para filho registradas no texto; ao passar o mouse, a família inteira acende.
// Dados: Theographic Bible Metadata (CC BY-SA 4.0), em camadas/personagens.json; nomes na forma da Almeida.
// Deus e o Espírito Santo não entram como "personagens" desta folha (serão tratados na camada de Teologia).
function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0; return h / 4294967295; }
const FORA = new Set(['God', 'Holy Spirit']);
const anoT = (a) => (a == null ? null : a < 0 ? `${-a} a.C.` : `${a} d.C.`);

export async function criarCamadaPersonagens(THREE, ctx) {
  const dados = await (await fetch('/nexus/camadas/personagens.json?v=1')).json();
  const todas = dados.pessoas.filter((p) => !FORA.has(p.n));
  const porId = new Map(); todas.forEach((p, i) => { p.i = i; p.nome = p.pt || p.n; porId.set(p.id, p); });
  // nome com desambiguação quando há várias pessoas com o mesmo nome (ex.: vários Zacarias)
  const cont = new Map(); todas.forEach((p) => cont.set(p.nome, (cont.get(p.nome) || 0) + 1));
  // posição: versículo do meio das menções, no livro em que a pessoa mais aparece
  const usados = new Map();
  todas.forEach((p) => {
    if (!p.v.length) { p.x = null; return; }
    const porLivro = new Map(); for (const k of p.v) { const b = Math.floor(k / 1e6); porLivro.set(b, (porLivro.get(b) || []).concat(k)); }
    const melhor = [...porLivro.values()].sort((a, b) => b.length - a.length)[0], k = melhor[Math.floor(melhor.length / 2)];
    const q = ctx.posVerso(k); if (!q) { p.x = null; return; }
    p.livro = Math.floor(k / 1e6); p.kc = k;
    const ch = Math.round(q.x / 8) + ':' + Math.round(q.y / 8), n = usados.get(ch) || 0; usados.set(ch, n + 1);
    const a = n * 2.39996 + hash(p.n + p.id) * 6.28, r = n ? 9 + 6 * Math.sqrt(n) : 0;
    p.x = q.x + Math.cos(a) * r; p.y = q.y + Math.sin(a) * r;
    if (cont.get(p.nome) > 1) p.rotulo = `${p.nome} · ${ctx.nomeRef(k).replace(/:\d+$/, '')}`; else p.rotulo = p.nome;
  });
  const vis = todas.filter((p) => p.x != null);
  const objetos = [];
  const n = vis.length, pos = new Float32Array(n * 3), cor = new Float32Array(n * 3), tam = new Float32Array(n), realce = new Float32Array(n);
  const cM = new THREE.Color('#E8A87C'), cF = new THREE.Color('#F0B9C8'), cN = new THREE.Color('#D8CFC0');
  vis.forEach((p, i) => { p.vi = i; pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = 0; const c = p.s === 'f' ? cF : p.s === 'm' ? cM : cN; cor[i * 3] = c.r; cor[i * 3 + 1] = c.g; cor[i * 3 + 2] = c.b; tam[i] = 1.2 + Math.log2(1 + p.qv) * 0.75; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cor, 3)); g.setAttribute('tam', new THREE.BufferAttribute(tam, 1));
  g.setAttribute('realce', new THREE.BufferAttribute(realce, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { px: { value: ctx.escala }, tempo: { value: 0 }, opac: { value: 1 } },
    vertexShader: `attribute float tam; attribute float realce; uniform float px; uniform float tempo; varying vec3 c; varying float b;
      void main(){ c = color; float f = fract(sin(dot(position.xy, vec2(3.17, 9.21))) * 4317.3) * 6.28; b = 0.8 + 0.2 * sin(tempo * 0.9 + f) + realce * 1.3;
        vec4 mv = modelViewMatrix * vec4(position, 1.0); float s = tam * (1.0 + realce) * 1300.0 / -mv.z; gl_PointSize = clamp(s, 1.6, 28.0) * px; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float opac; varying vec3 c; varying float b; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
      float disco = smoothstep(0.5, 0.34, d); float nucleo = smoothstep(0.26, 0.0, d); float a = (disco * 0.45 + nucleo) * b; gl_FragColor = opac * vec4(c * a, a); }` });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; objetos.push(pts);
  // genealogia: pai/mãe -> filho (fios finos; os longos quase somem)
  const seg = [];
  for (const p of vis) for (const fid of p.filhos) { const f = porId.get(fid); if (f && f.x != null) seg.push([p, f]); }
  const lp = new Float32Array(seg.length * 6), la = new Float32Array(seg.length * 2);
  seg.forEach(([a, b], i) => { lp.set([a.x, a.y, -0.5, b.x, b.y, -0.5], i * 6); const len = Math.hypot(b.x - a.x, b.y - a.y), w = Math.max(0.05, 1 - len / 2200); la[i * 2] = w; la[i * 2 + 1] = w * 0.6; });
  const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.BufferAttribute(lp, 3)); gl.setAttribute('peso', new THREE.BufferAttribute(la, 1));
  const matL = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { opac: { value: 1 } },
    vertexShader: 'attribute float peso; varying float w; void main(){ w = peso; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float opac; varying float w; void main(){ float a = 0.22 * w * w; gl_FragColor = opac * vec4(vec3(0.91, 0.66, 0.49) * a, a); }' });
  const arvore = new THREE.LineSegments(gl, matL); arvore.frustumCulled = false; objetos.push(arvore);
  // família acesa (dinâmica)
  const MAXF = 120, gf = new THREE.BufferGeometry();
  gf.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXF * 6), 3).setUsage(THREE.DynamicDrawUsage));
  gf.setAttribute('cor', new THREE.BufferAttribute(new Float32Array(MAXF * 6), 3).setUsage(THREE.DynamicDrawUsage));
  gf.setDrawRange(0, 0);
  const matF = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { opac: { value: 1 }, tempo: { value: 0 } },
    vertexShader: 'attribute vec3 cor; varying vec3 c; void main(){ c = cor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float opac; uniform float tempo; varying vec3 c; void main(){ float a = 0.75 + 0.25 * sin(tempo * 3.0); gl_FragColor = opac * vec4(c * a, a); }' });
  const familia = new THREE.LineSegments(gf, matF); familia.frustumCulled = false; objetos.push(familia);
  const COR_REL = { pai: new THREE.Color('#9FC0FF'), mae: new THREE.Color('#F0B9C8'), filhos: new THREE.Color('#FFE3A3'), conj: new THREE.Color('#F2A0A0'), irm: new THREE.Color('#B9E0A5') };
  let realcados = [];
  const ordemPeso = vis.slice().sort((a, b) => b.qv - a.qv).slice(0, 400);
  const nomeDe = (id) => { const p = porId.get(id); return p ? p.nome : null; };

  return {
    nome: (i) => (todas[i] ? todas[i].rotulo || todas[i].nome : ''),
    total: () => todas.length,
    objetos, pessoas: todas,
    quadro(t) { mat.uniforms.tempo.value = t / 1000; matF.uniforms.tempo.value = t / 1000; },
    porId(id) { const p = porId.get(id); return p ? p.i : -1; },
    realcar(lista) {
      for (const i of realcados) { const p = todas[i]; if (p && p.vi != null) realce[p.vi] = 0; }
      realcados = lista.filter((i) => todas[i]); let k = 0; const pa = gf.attributes.position, pc = gf.attributes.cor;
      for (const i of realcados) { const p = todas[i]; if (p.vi == null) continue; realce[p.vi] = 1;
        for (const rel of ['pai', 'mae', 'filhos', 'conj', 'irm']) for (const id of p[rel]) { const o = porId.get(id); if (!o || o.x == null || k >= MAXF) continue; if (o.vi != null) realce[o.vi] = Math.max(realce[o.vi], 0.6);
          pa.setXYZ(k * 2, p.x, p.y, 0); pa.setXYZ(k * 2 + 1, o.x, o.y, 0); const c = COR_REL[rel]; pc.setXYZ(k * 2, c.r, c.g, c.b); pc.setXYZ(k * 2 + 1, c.r, c.g, c.b); k++; } }
      gf.setDrawRange(0, k * 2); pa.needsUpdate = pc.needsUpdate = true; g.attributes.realce.needsUpdate = true;
    },
    pegar(x, y, raio) { let m = -1, dm = raio * raio, pm = 0; for (const p of vis) { const q = ctx.tela(p.x, p.y); if (!q) continue; const d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < dm || (d < raio * raio && p.qv > pm && d < dm * 1.6)) { dm = Math.min(dm, d); m = p.i; pm = p.qv; } } return m; },
    pos(i) { const p = todas[i]; return p && p.x != null ? { x: p.x, y: p.y } : null; },
    versos(i) { return todas[i] ? todas[i].v : []; },
    info(i) { const p = todas[i]; const datas = p.nasc != null || p.morte != null ? ` · ${anoT(p.nasc) || '?'} – ${anoT(p.morte) || '?'}` : '';
      return `<b>${ctx.esc(p.rotulo || p.nome)}</b><em>${p.qv} versículo(s)${datas}${p.filhos.length ? ' · ' + p.filhos.length + ' filho(s) registrado(s)' : ''}</em><small>Personagens · ${p.pt ? '' : 'nome na forma da fonte · '}clique para a ficha e a família</small>`; },
    ficha(i) {
      const p = todas[i], esc = ctx.esc;
      const chips = (rot, ids) => { const l = ids.map((id) => porId.get(id)).filter(Boolean); return l.length ? `<h5>${rot}</h5><div class="cu-chips">${l.map((o) => `<button type="button" data-camada="personagens" data-item="${o.i}">${esc(o.rotulo || o.nome)}</button>`).join('')}</div>` : ''; };
      const verso = (k) => `<p><b>${esc(ctx.nomeRef(k))}</b> — “${esc(ctx.textoDe(k))}”</p>`;
      return { titulo: p.nome, rotulo: 'Personagens · genealogias', html:
        `<p>${p.s === 'f' ? 'Mulher' : p.s === 'm' ? 'Homem' : 'Personagem'} · citado(a) em <b>${p.qv}</b> versículo(s)${p.nasc != null || p.morte != null ? ` · ${anoT(p.nasc) ? 'nasc. c. ' + anoT(p.nasc) : ''}${p.morte != null ? ' · morte c. ' + anoT(p.morte) : ''}` : ''}</p>
        ${p.pt ? (p.pt !== p.n ? `<small>Nome na fonte: ${esc(p.n)}</small>` : '') : '<small>Nome mantido como na fonte (ainda sem a forma da Almeida no NEXUS).</small>'}
        ${p.tb ? `<small>Também chamado: ${esc(p.tb)}</small>` : ''}
        ${chips('Pai', p.pai)}${chips('Mãe', p.mae)}${chips('Cônjuge(s)', p.conj)}${chips('Filhos', p.filhos)}${chips('Irmãos', p.irm)}
        <h5>Versículos (${p.qv})</h5>${p.v.slice(0, 6).map(verso).join('')}${p.qv > 6 ? `<small>e mais ${p.qv - 6}: use “Acender versículos” para vê-los na Bíblia.</small>` : ''}
        ${p.dic ? `<h5>Dicionário Easton (1897, em inglês, domínio público)</h5><small>${esc(p.dic)}${p.dic.length >= 600 ? '…' : ''}</small>` : ''}
        ${p.amb ? '<p><small>⚠️ A fonte marca este nome como ambíguo: há mais de uma pessoa com ele, e a separação entre elas é interpretação.</small></p>' : ''}
        <p><small>⚠️ ${esc(dados.aviso)}</small></p><p><small>Fonte: ${esc(dados.fonte)}</small></p>`, versos: p.v };
    },
    rotulos(texto, dist, W, H) {
      const lim = dist > 9000 ? 14 : dist > 4000 ? 26 : dist > 1500 ? 44 : 70; let k = 0;
      for (const i of realcados) { const p = todas[i]; if (!p || p.x == null) continue; for (const rel of ['pai', 'mae', 'filhos', 'conj', 'irm']) for (const id of p[rel]) { const o = porId.get(id); if (!o || o.x == null) continue; const q = ctx.tela(o.x, o.y); if (q && q.x > 0 && q.x < W && q.y > 0 && q.y < H) texto(o.rotulo || o.nome, q.x + 8, q.y + 10, '600 12px Inter, system-ui, sans-serif', '#FFF0DA', 'rgba(30,14,6,.78)', 1, false); } }
      for (const p of ordemPeso) { if (k >= lim) break; const q = ctx.tela(p.x, p.y); if (!q || q.x < 0 || q.x > W || q.y < 0 || q.y > H) continue; if (texto(p.rotulo || p.nome, q.x + 9, q.y + 9, (p.qv > 300 ? '700 13px' : '600 12px') + ' "Cormorant Garamond", Georgia, serif', p.s === 'f' ? '#F6CAD6' : '#F2C4A0', 'rgba(20,8,4,.66)', 1, false)) k++; }
    },
    buscar(q) {
      if (q.length < 3) return null; let m = null;
      for (const p of vis) { const a = ctx.norm(p.nome), b = ctx.norm(p.n), base = a.replace(/ \(.*\)$/, ''); const pt = a === q || b === q || base === q ? 100 : (a.startsWith(q) || b.startsWith(q)) ? 40 : 0; if (pt && (!m || pt > m.pont || (pt === m.pont && p.qv > todas[m.i].qv))) m = { i: p.i, pont: pt }; }
      return m;
    },
  };
}
