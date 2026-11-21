// NEXUS — CAMADAS DE TEMAS (7 · História e cultura · 9 · Teologia). Mesma mecânica para as duas folhas: cada tema é
// um astro posto acima do trecho onde o seu verbete mais cita a Bíblia; ao passar o mouse, os versículos citados
// acendem. Dados: Easton's Bible Dictionary (1897, domínio público), edição estruturada do Theographic (CC BY-SA 4.0).
// Títulos traduzidos e temas escolhidos pelo NEXUS (scripts/temas-pt.json); texto do verbete em inglês, com aviso.
function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0; return h / 4294967295; }

export async function criarCamadaTemas(THREE, ctx, op) {
  const dados = await (await fetch(op.arquivo)).json();
  const itens = dados.itens;
  const grupos = [...new Set(itens.map((x) => x.grupo))];
  const usados = new Map();
  itens.forEach((t, i) => {
    t.i = i; t.nome = t.pt;
    const porLivro = new Map(); for (const k of t.v) { const b = Math.floor(k / 1e6); porLivro.set(b, (porLivro.get(b) || []).concat(k)); }
    const melhor = [...porLivro.values()].sort((a, b) => b.length - a.length)[0]; const k = melhor[Math.floor(melhor.length / 2)];
    const q = ctx.posVerso(k); if (!q) { t.x = null; return; }
    const ch = Math.round(q.x / 30) + ':' + Math.round(q.y / 30), n = usados.get(ch) || 0; usados.set(ch, n + 1);
    const a = n * 2.39996 + hash(t.en) * 6.28, r = n ? 24 + 14 * Math.sqrt(n) : 0; t.x = q.x + Math.cos(a) * r; t.y = q.y + Math.sin(a) * r;
    t.livros = porLivro.size;
  });
  const vis = itens.filter((t) => t.x != null);
  const objetos = [];
  const n = vis.length, pos = new Float32Array(n * 3), cor = new Float32Array(n * 3), tam = new Float32Array(n), realce = new Float32Array(n);
  const corG = new Map(grupos.map((g, k) => [g, new THREE.Color(op.cores[k % op.cores.length])]));
  vis.forEach((t, i) => { t.vi = i; pos.set([t.x, t.y, 0], i * 3); const c = corG.get(t.grupo); cor.set([c.r, c.g, c.b], i * 3); tam[i] = 3 + Math.log2(1 + t.v.length) * 1.1; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cor, 3)); g.setAttribute('tam', new THREE.BufferAttribute(tam, 1));
  g.setAttribute('realce', new THREE.BufferAttribute(realce, 1).setUsage(THREE.DynamicDrawUsage));
  // forma: História = astro com anel (como um planeta); Teologia = estrela de oito pontas
  const forma = op.forma === 'estrela'
    ? 'float ang = atan(q.y, q.x); float raios = pow(abs(cos(ang * 4.0)), 8.0); float a = (smoothstep(0.5, 0.0, d) * (0.35 + 0.65 * raios) + smoothstep(0.16, 0.0, d)) * b;'
    : 'float anel = smoothstep(0.06, 0.0, abs(d - 0.38)) * 0.9; float nucleo = smoothstep(0.24, 0.0, d); float halo = smoothstep(0.5, 0.0, d) * 0.25; float a = (anel + nucleo + halo) * b;';
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { px: { value: ctx.escala }, tempo: { value: 0 }, opac: { value: 1 } },
    vertexShader: `attribute float tam; attribute float realce; uniform float px; uniform float tempo; varying vec3 c; varying float b;
      void main(){ c = color; float f = fract(sin(dot(position.xy, vec2(7.7, 3.3))) * 1931.7) * 6.28; b = 0.75 + 0.25 * sin(tempo * 0.7 + f) + realce * 1.2;
        vec4 mv = modelViewMatrix * vec4(position, 1.0); float s = tam * (1.0 + realce * 0.7) * 1400.0 / -mv.z; gl_PointSize = clamp(s, 3.0, 40.0) * px; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float opac; varying vec3 c; varying float b; void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q); ${forma} gl_FragColor = opac * vec4(c * a, a); }` });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; objetos.push(pts);
  let realcados = [];
  const ordemPeso = vis.slice().sort((a, b) => b.v.length - a.v.length);

  return {
    objetos, itens,
    quadro(t) { mat.uniforms.tempo.value = t / 1000; },
    realcar(lista) { for (const i of realcados) { const t = itens[i]; if (t && t.vi != null) realce[t.vi] = 0; } realcados = lista.filter((i) => itens[i]); for (const i of realcados) if (itens[i].vi != null) realce[itens[i].vi] = 1; g.attributes.realce.needsUpdate = true; },
    pegar(x, y, raio) { let m = -1, dm = (raio + 4) * (raio + 4); for (const t of vis) { const q = ctx.tela(t.x, t.y); if (!q) continue; const d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < dm) { dm = d; m = t.i; } } return m; },
    pos(i) { const t = itens[i]; return t && t.x != null ? { x: t.x, y: t.y } : null; },
    versos(i) { return itens[i] ? itens[i].v : []; },
    info(i) { const t = itens[i]; return `<b>${ctx.esc(t.nome)}</b><em>${ctx.esc(t.grupo)} · ${t.v.length} versículo(s) em ${t.livros} livro(s)</em><small>${op.rotulo} · ${t.txt ? 'verbete do Easton (1897)' : t.fonteVersos || ''} · clique para a ficha</small>`; },
    ficha(i) {
      const t = itens[i], esc = ctx.esc;
      const porLivro = new Map(); for (const k of t.v) { const b = Math.floor(k / 1e6); porLivro.set(b, (porLivro.get(b) || 0) + 1); }
      const livrosTop = [...porLivro.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      const nomeLivro = (b) => ctx.nomeRef(b * 1e6 + 1001).replace(/ 1:1$/, '');
      const outros = vis.filter((o) => o.grupo === t.grupo && o !== t).sort((a, b) => b.v.length - a.v.length).slice(0, 8);
      const verso = (k) => `<p><b>${esc(ctx.nomeRef(k))}</b> — “${esc(ctx.textoDe(k))}”</p>`;
      return { titulo: t.nome, rotulo: `${op.rotulo} · ${t.grupo}`, html:
        `<p>${t.v.length} versículo(s) citados${t.txt ? ' pelo verbete' : ''}, em ${t.livros} livro(s)</p>
        ${t.en !== t.pt ? `<small>Verbete na fonte: ${esc(t.en)}</small>` : ''}
        ${livrosTop.length ? `<div class="cu-chips">${livrosTop.map(([b, c]) => `<button type="button" data-busca="${esc(nomeLivro(b))}">${esc(nomeLivro(b))} · ${c}</button>`).join('')}</div>` : ''}
        ${t.txt ? `<h5>Verbete (Easton, 1897, em inglês)</h5><small>${esc(t.txt)}${t.txt.length >= 1100 ? '…' : ''}</small>` : ''}
        <h5>Versículos</h5>${t.v.slice(0, 6).map(verso).join('')}${t.v.length > 6 ? `<small>e mais ${t.v.length - 6}: use “Acender versículos”.</small>` : ''}
        ${outros.length ? `<h5>Outros temas em “${esc(t.grupo)}”</h5><div class="cu-chips">${outros.map((o) => `<button type="button" data-camada="${op.id}" data-item="${o.i}">${esc(o.nome)}</button>`).join('')}</div>` : ''}
        <p><small>⚠️ ${esc(dados.aviso)}</small></p><p><small>Fonte: ${esc(t.fonteVersos ? t.fonteVersos + ' · CC BY-SA 4.0' : dados.fonte)}</small></p>`, versos: t.v };
    },
    rotulos(texto, dist, W, H) {
      const lim = dist > 9000 ? 16 : dist > 4000 ? 34 : 80; let k = 0;
      for (const t of ordemPeso) { if (k >= lim) break; const q = ctx.tela(t.x, t.y); if (!q || q.x < 0 || q.x > W || q.y < 0 || q.y > H) continue; const c = corG.get(t.grupo);
        if (texto(t.nome, q.x + 11, q.y + 11, (t.v.length > 40 ? '700 14px' : '600 12.5px') + ' "Cormorant Garamond", Georgia, serif', realcados.includes(t.i) ? '#FFFFFF' : '#' + c.getHexString(), 'rgba(10,8,4,.7)', 1, false)) k++; }
    },
    buscar(q) {
      if (q.length < 3) return null; let m = null;
      for (const t of vis) { const a = ctx.norm(t.pt), b = ctx.norm(t.en); const p = a === q || b === q ? 100 : a.startsWith(q) ? 45 : 0; if (p && (!m || p > m.pont || (p === m.pont && t.v.length > itens[m.i].v.length))) m = { i: t.i, pont: p }; }
      return m;
    },
  };
}
