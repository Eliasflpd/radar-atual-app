// NEXUS — CAMADA 10 · TRADIÇÃO E HISTÓRIA DA IGREJA. Folha transparente com os artigos e perguntas de credos,
// confissões e catecismos históricos que trazem textos-prova: cada um fica acima do trecho que mais cita e, ao passar
// o mouse, os versículos que aquela tradição usou acendem na Bíblia. A ficha mostra também a linha do tempo de todos
// os documentos (de Inácio de Antioquia às confissões da Reforma). Dados: Creeds.json (textos em domínio público).
function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0; return h / 4294967295; }
const CORES = ['#A9D18E', '#E9C878', '#9FC7F2', '#F2A0A0', '#C9B6E4', '#F2C6A0', '#9FE0C7', '#E6D2A0'];

export async function criarCamadaTradicao(THREE, ctx) {
  const dados = await (await fetch('/nexus/camadas/tradicao.json?v=1')).json();
  const D = dados.documentos, I = dados.itens;
  const comItens = D.map((d, k) => ({ d, k })).filter((x) => x.d.itens);
  const corDoc = new Map(comItens.map((x, j) => [x.k, new THREE.Color(CORES[j % CORES.length])]));
  const usados = new Map();
  I.forEach((t, i) => {
    t.i = i; t.doc = D[t.d];
    const porLivro = new Map(); for (const k of t.v) { const b = Math.floor(k / 1e6); porLivro.set(b, (porLivro.get(b) || []).concat(k)); }
    const melhor = [...porLivro.values()].sort((a, b) => b.length - a.length)[0], k = melhor[Math.floor(melhor.length / 2)];
    const q = ctx.posVerso(k); if (!q) { t.x = null; return; }
    const ch = Math.round(q.x / 20) + ':' + Math.round(q.y / 20), n = usados.get(ch) || 0; usados.set(ch, n + 1);
    const a = n * 2.39996 + hash(t.rot + t.d) * 6.28, r = n ? 14 + 9 * Math.sqrt(n) : 0; t.x = q.x + Math.cos(a) * r; t.y = q.y + Math.sin(a) * r;
    t.nome = `${t.doc.titulo.replace(/ \(\d+\)$/, '')} · ${t.rot}`;
  });
  const vis = I.filter((t) => t.x != null);
  const objetos = [], n = vis.length, pos = new Float32Array(n * 3), cor = new Float32Array(n * 3), tam = new Float32Array(n), realce = new Float32Array(n);
  vis.forEach((t, i) => { t.vi = i; pos.set([t.x, t.y, 0], i * 3); const c = corDoc.get(t.d); cor.set([c.r, c.g, c.b], i * 3); tam[i] = 2 + Math.log2(1 + t.v.length) * 0.8; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cor, 3)); g.setAttribute('tam', new THREE.BufferAttribute(tam, 1));
  g.setAttribute('realce', new THREE.BufferAttribute(realce, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { px: { value: ctx.escala }, tempo: { value: 0 }, opac: { value: 1 } },
    vertexShader: `attribute float tam; attribute float realce; uniform float px; uniform float tempo; varying vec3 c; varying float b;
      void main(){ c = color; float f = fract(sin(dot(position.xy, vec2(2.3, 8.9))) * 3911.1) * 6.28; b = 0.75 + 0.25 * sin(tempo * 1.1 + f) + realce * 1.3;
        vec4 mv = modelViewMatrix * vec4(position, 1.0); float s = tam * (1.0 + realce * 0.8) * 1300.0 / -mv.z; gl_PointSize = clamp(s, 2.0, 30.0) * px; gl_Position = projectionMatrix * mv; }`,
    // forma de cruz grega dentro de um halo (marca dos documentos da Igreja)
    fragmentShader: `uniform float opac; varying vec3 c; varying float b; void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q);
      float cruz = max(step(abs(q.x), 0.07) * step(abs(q.y), 0.36), step(abs(q.y), 0.07) * step(abs(q.x), 0.36)); float halo = smoothstep(0.5, 0.0, d) * 0.3;
      float a = (cruz * 0.95 + halo) * b; gl_FragColor = opac * vec4(c * a, a); }` });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; objetos.push(pts);
  let realcados = [];
  const ordemPeso = vis.slice().sort((a, b) => b.v.length - a.v.length).slice(0, 400);
  const anoT = (a) => (a ? (a < 1000 ? `c. ${a}` : String(a)) : 's/ data');

  return {
    nome: (i) => (I[i] ? I[i].nome : ''),
    total: () => I.length,
    objetos, itens: I, documentos: D,
    quadro(t) { mat.uniforms.tempo.value = t / 1000; },
    realcar(lista) { for (const i of realcados) { const t = I[i]; if (t && t.vi != null) realce[t.vi] = 0; } realcados = lista.filter((i) => I[i]); for (const i of realcados) if (I[i].vi != null) realce[I[i].vi] = 1; g.attributes.realce.needsUpdate = true; },
    pegar(x, y, raio) { let m = -1, dm = raio * raio; for (const t of vis) { const q = ctx.tela(t.x, t.y); if (!q) continue; const d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < dm) { dm = d; m = t.i; } } return m; },
    pos(i) { const t = I[i]; return t && t.x != null ? { x: t.x, y: t.y } : null; },
    versos(i) { return I[i] ? I[i].v : []; },
    info(i) { const t = I[i]; return `<b>${ctx.esc(t.doc.titulo)} · ${ctx.esc(t.rot)}</b><em>${ctx.esc(t.tit || t.txt.slice(0, 90) + '…')}</em><small>Tradição · ${anoT(t.doc.ano)} · ${t.v.length} texto(s)-prova · clique para a ficha</small>`; },
    ficha(i) {
      const t = I[i], esc = ctx.esc, d = t.doc;
      const vizinhos = vis.filter((o) => o.d === t.d && o !== t).sort((a, b) => Math.abs(a.i - t.i) - Math.abs(b.i - t.i)).slice(0, 8).sort((a, b) => a.i - b.i);
      const verso = (k) => `<p><b>${esc(ctx.nomeRef(k))}</b> — “${esc(ctx.textoDe(k))}”</p>`;
      const linha = D.map((o, k) => { const pri = vis.find((x) => x.d === k); return pri ? `<button type="button" data-camada="tradicao" data-item="${pri.i}">${anoT(o.ano)} · ${esc(o.titulo)}</button>` : `<button type="button" disabled title="Sem textos-prova na fonte: ainda não posicionado">${anoT(o.ano)} · ${esc(o.titulo)}</button>`; }).join('');
      return { titulo: `${d.titulo} · ${t.rot}`, rotulo: `Tradição · ${d.tipo === 'Catechism' ? 'catecismo' : d.tipo === 'Confession' ? 'confissão' : d.tipo === 'Creed' ? 'credo' : 'cânones'} de ${anoT(d.ano)}`, html:
        `<p>${d.local ? esc(d.local) + ' · ' : ''}${d.autores.length ? esc(d.autores.join(', ')) + ' · ' : ''}língua original: ${esc(d.lingua || '—')}</p>
        ${t.tit ? `<p><b>${esc(t.tit)}</b></p>` : ''}<small>${esc(t.txt)}${t.txt.length >= 700 ? '…' : ''}</small>
        <h5>Textos-prova citados pelo documento (${t.v.length})</h5>${t.v.slice(0, 6).map(verso).join('')}${t.v.length > 6 ? `<small>e mais ${t.v.length - 6}: use “Acender versículos”.</small>` : ''}
        ${vizinhos.length ? `<h5>No mesmo documento</h5><div class="cu-chips">${vizinhos.map((o) => `<button type="button" data-camada="tradicao" data-item="${o.i}">${esc(o.rot)}</button>`).join('')}</div>` : ''}
        <h5>Linha do tempo dos documentos</h5><div class="cu-chips">${linha}</div>
        <p><small>⚠️ ${esc(dados.aviso)}</small></p><p><small>Fonte: ${esc(dados.fonte)}${d.fonte ? ' · texto: ' + esc(d.fonte) : ''}</small></p>`, versos: t.v };
    },
    rotulos(texto, dist, W, H) {
      const lim = dist > 9000 ? 10 : dist > 4000 ? 24 : dist > 1500 ? 40 : 70; let k = 0;
      for (const t of ordemPeso) { if (k >= lim) break; const q = ctx.tela(t.x, t.y); if (!q || q.x < 0 || q.x > W || q.y < 0 || q.y > H) continue; const c = corDoc.get(t.d);
        if (texto(`✝ ${t.nome}`, q.x + 10, q.y - 10, '600 12px Inter, system-ui, sans-serif', realcados.includes(t.i) ? '#FFFFFF' : '#' + c.getHexString(), 'rgba(6,14,8,.72)', 1, false)) k++; }
    },
    buscar(q) {
      if (q.length < 4) return null;
      const dk = D.findIndex((o) => ctx.norm(o.titulo) === q || ctx.norm(o.en) === q || ctx.norm(o.titulo).startsWith(q));
      if (dk >= 0) { const pri = vis.find((x) => x.d === dk); if (pri) return { i: pri.i, pont: ctx.norm(D[dk].titulo) === q || ctx.norm(D[dk].en) === q ? 100 : 50 }; }
      return null;
    },
  };
}
