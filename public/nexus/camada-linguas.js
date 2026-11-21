// NEXUS — CAMADA 6 · LÍNGUAS ORIGINAIS. Folha transparente com as 16.559 palavras-raiz (lemas) do hebraico, aramaico e
// grego bíblicos. Cada palavra é uma estrela posta acima do trecho onde ela mais aparece; ao passar o mouse, TODOS os
// versículos onde ela ocorre acendem na Bíblia. Dados: STEPBible Data (Tyndale House, CC BY 4.0), palavra por palavra
// (TAHOT/TAGNT) e léxicos breves (TBESH/TBESG). Sentidos e definições ficam em inglês, como na fonte (e avisados).
function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0; return h / 4294967295; }
const CLASSE = [[/N-Pr|N-PRI|N:N/, 'nome próprio'], [/^[HAG]:N/, 'substantivo'], [/^[HAG]:V/, 'verbo'], [/Adj|^G:A/, 'adjetivo'], [/Adv/, 'advérbio'], [/Prep/, 'preposição'], [/Conj/, 'conjunção'],
  [/^G:T|Art/, 'artigo'], [/Pron|^G:P|^G:R|^G:D|^G:F|^G:Q|^G:K|^G:S|^G:X|^G:C/, 'pronome'], [/Intj|^G:I/, 'interjeição'], [/Prtcl|Part|Neg|^G:PRT/, 'partícula']];
function descreve(l) {
  const m = l.m || '', lingua = l.s[0] === 'G' ? 'grego' : /^A:/.test(m) ? 'aramaico' : 'hebraico';
  const cl = (CLASSE.find(([re]) => re.test(m)) || [null, 'palavra'])[1], gen = /-M\b/.test(m) ? ' masculino' : /-F\b/.test(m) ? ' feminino' : /-N\b/.test(m) ? ' neutro' : '';
  return { lingua, classe: cl + (cl === 'substantivo' || cl === 'nome próprio' ? gen : '') };
}
const conteudo = (l) => /substantivo|verbo|adjetivo/.test(descreve(l).classe);
const semAcento = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.'ʼʾʿ\-\s]/g, '');

export async function criarCamadaLinguas(THREE, ctx) {
  const dados = await (await fetch('/nexus/camadas/linguas.json?v=1')).json();
  const L = dados.lemas;
  let det = null;   // [definição, versos compactados] — chega depois, em segundo plano
  const pDet = fetch('/nexus/camadas/linguas-detalhes.json?v=1').then((r) => r.json()).then((d) => { det = d; }).catch(() => {});
  const versosDe = (i) => { if (!det || !det[i]) return []; let a = 0; return det[i][1].split(',').map((x) => (a += parseInt(x, 36))); };
  // posição: âncora (versículo do meio no livro onde mais aparece), com afastamento para não empilhar
  const usados = new Map();
  L.forEach((l, i) => { l.i = i; const q = ctx.posVerso(l.k); if (!q) { l.x = null; return; }
    const ch = Math.round(q.x / 7) + ':' + Math.round(q.y / 7), n = usados.get(ch) || 0; usados.set(ch, n + 1);
    const a = n * 2.39996 + hash(l.s) * 6.28, r = n ? 6 + 5 * Math.sqrt(n) : 0; l.x = q.x + Math.cos(a) * r; l.y = q.y + Math.sin(a) * r; l.d = descreve(l); });
  const vis = L.filter((l) => l.x != null);
  // grade espacial para achar rápido o que está sob o dedo (são milhares de palavras)
  const CEL = 120, grade = new Map();
  vis.forEach((l) => { const c = Math.floor(l.x / CEL) + ':' + Math.floor(l.y / CEL); (grade.get(c) || grade.set(c, []).get(c)).push(l); });
  const objetos = [];
  const n = vis.length, pos = new Float32Array(n * 3), cor = new Float32Array(n * 3), tam = new Float32Array(n), realce = new Float32Array(n);
  const cH = new THREE.Color('#B5C7F2'), cA = new THREE.Color('#C9B6E4'), cG = new THREE.Color('#9FE0E6');
  vis.forEach((l, i) => { l.vi = i; pos.set([l.x, l.y, 0], i * 3); const c = l.d.lingua === 'grego' ? cG : l.d.lingua === 'aramaico' ? cA : cH; cor.set([c.r, c.g, c.b], i * 3); tam[i] = 0.8 + Math.log2(1 + l.n) * 0.45 * (conteudo(l) ? 1 : 0.6); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cor, 3)); g.setAttribute('tam', new THREE.BufferAttribute(tam, 1));
  g.setAttribute('realce', new THREE.BufferAttribute(realce, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { px: { value: ctx.escala }, tempo: { value: 0 }, opac: { value: 1 } },
    vertexShader: `attribute float tam; attribute float realce; uniform float px; uniform float tempo; varying vec3 c; varying float b;
      void main(){ c = color; float f = fract(sin(dot(position.xy, vec2(5.1, 1.7))) * 2713.9) * 6.28; b = 0.7 + 0.3 * sin(tempo * 1.7 + f) + realce * 1.5;
        vec4 mv = modelViewMatrix * vec4(position, 1.0); float s = tam * (1.0 + realce * 1.4) * 1200.0 / -mv.z; gl_PointSize = clamp(s, 1.2, 26.0) * px; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float opac; varying vec3 c; varying float b; void main(){ vec2 q = gl_PointCoord - 0.5; float d = max(abs(q.x), abs(q.y)) * 0.7 + length(q) * 0.3;
      float a = smoothstep(0.5, 0.0, d) * b; gl_FragColor = opac * vec4(c * a, a); }` });   // forma de losango: as palavras se distinguem das pessoas e dos acontecimentos
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; objetos.push(pts);
  let realcados = [];
  const rotulaveis = vis.filter(conteudo).sort((a, b) => b.n - a.n);
  const nomeL = (l) => `${l.w || l.s} · ${l.g || l.t}`;

  return {
    objetos, lemas: L, aviso: dados.aviso, fonte: dados.fonte, pronto: () => !!det, esperar: () => pDet,
    quadro(t) { mat.uniforms.tempo.value = t / 1000; },
    realcar(lista) { for (const i of realcados) { const l = L[i]; if (l && l.vi != null) realce[l.vi] = 0; } realcados = lista.filter((i) => L[i]); for (const i of realcados) if (L[i].vi != null) realce[L[i].vi] = 1; g.attributes.realce.needsUpdate = true; },
    pegar(x, y, raio) {
      const w = ctx.noPlano(x, y), w2 = ctx.noPlano(x + raio, y); if (!w || !w2) return -1;
      const rw = Math.hypot(w2.x - w.x, w2.y - w.y), cx = Math.floor(w.x / CEL), cy = Math.floor(w.y / CEL), alc = Math.ceil(rw / CEL);
      let m = -1, dm = raio * raio;
      for (let gx = cx - alc; gx <= cx + alc; gx++) for (let gy = cy - alc; gy <= cy + alc; gy++) for (const l of grade.get(gx + ':' + gy) || []) {
        const q = ctx.tela(l.x, l.y); if (!q) continue; const d = (q.x - x) ** 2 + (q.y - y) ** 2 - (conteudo(l) ? 4 : 0); if (d < dm) { dm = d; m = l.i; } }
      return m;
    },
    pos(i) { const l = L[i]; return l && l.x != null ? { x: l.x, y: l.y } : null; },
    versos(i) { return versosDe(i); },
    info(i) { const l = L[i]; return `<b><span dir="auto">${ctx.esc(l.w || l.s)}</span> · ${ctx.esc(l.t)}</b><em>${ctx.esc(l.g || '')} (inglês) · ${l.d.classe} ${l.d.lingua}</em><small>Línguas originais · ${l.s} · ${l.n} ocorrência(s) em ${l.nv} versículo(s)${det ? ' · acesas na Bíblia' : ''} · clique para a ficha</small>`; },
    ficha(i) {
      const l = L[i], esc = ctx.esc, vs = versosDe(i).filter((k) => ctx.textoDe(k));
      const porLivro = new Map(); for (const k of vs) { const b = Math.floor(k / 1e6); porLivro.set(b, (porLivro.get(b) || 0) + 1); }
      const livrosTop = [...porLivro.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      const verso = (k) => `<p><b>${esc(ctx.nomeRef(k))}</b> — “${esc(ctx.textoDe(k))}”</p>`;
      return { titulo: l.w || l.s, rotulo: `Línguas originais · ${l.d.lingua}`, html:
        `<p style="font-size:15px"><b>${esc(l.t)}</b> · ${l.d.classe} · Strong ${esc(l.s)}</p>
        <p>Sentido curto (inglês, da fonte): <b>${esc(l.g || '—')}</b></p>
        ${det && det[i] && det[i][0] ? `<small>${esc(det[i][0])}${det[i][0].length >= 220 ? '…' : ''}</small>` : det ? '' : '<small>carregando a definição e as ocorrências…</small>'}
        <h5>Ocorrências</h5><div>${l.n} vez(es) em ${l.nv} versículo(s)${vs.length < l.nv && det ? ` (${l.nv - vs.length} fora da contagem da Almeida, como títulos de Salmos)` : ''}</div>
        ${livrosTop.length ? `<div class="cu-chips">${livrosTop.map(([b, c]) => `<button type="button" data-busca="${esc(ctx.nomeRef(b * 1e6 + 1001).replace(/ 1:1$/, ''))}">${esc(ctx.nomeRef(b * 1e6 + 1001).replace(/ 1:1$/, ''))} · ${c}</button>`).join('')}</div>` : ''}
        <h5>Onde aparece (Almeida)</h5>${vs.slice(0, 6).map(verso).join('')}${vs.length > 6 ? `<small>e mais ${vs.length - 6}: use “Acender versículos”.</small>` : ''}
        <p><small>⚠️ ${esc(dados.aviso)}</small></p><p><small>Fonte: ${esc(dados.fonte)}</small></p>`, versos: vs };
    },
    rotulos(texto, dist, W, H) {
      const lim = dist > 9000 ? 12 : dist > 4000 ? 24 : dist > 1500 ? 40 : 70; let k = 0;
      for (const i of realcados) { const l = L[i]; const q = l && l.x != null && ctx.tela(l.x, l.y); if (q) texto(nomeL(l), q.x + 9, q.y - 12, '700 14px "Times New Roman", serif', '#FFFFFF', 'rgba(8,14,40,.85)', 1, false); }
      for (const l of rotulaveis) { if (k >= lim) break; const q = ctx.tela(l.x, l.y); if (!q || q.x < 0 || q.x > W || q.y < 0 || q.y > H) continue; if (texto(nomeL(l), q.x + 8, q.y - 9, '600 13px "Times New Roman", serif', l.d.lingua === 'grego' ? '#BFF0F2' : '#D2DCF8', 'rgba(6,10,30,.7)', 1, false)) k++; }
    },
    buscar(q) {   // Strong (h2617, g26), palavra original, transliteração ou sentido em inglês
      if (q.length < 2) return null; const qs = semAcento(q); let m = null;
      const st = /^([hg])0*(\d{1,4})([a-z]?)$/.exec(q.replace(/\s+/g, ''));
      for (const l of vis) {
        let p = 0;
        if (st) { const ls = l.s.toLowerCase().replace(/^([hg])0*/, '$1'), alvo = st[1] + st[2] + st[3]; if (ls === alvo || (!st[3] && ls === alvo + ls.slice(-1) && /[a-z]$/.test(ls))) p = 100; }
        else if (l.w && semAcento(l.w) === qs) p = 100;
        else if (l.t && semAcento(l.t) === qs) p = 100;
        else if (l.g && ctx.norm(l.g) === q) p = 60 + Math.min(30, Math.log2(1 + l.n) * 3);
        if (p && (!m || p > m.pont || (p === m.pont && l.n > L[m.i].n))) m = { i: l.i, pont: p };
      }
      return m;
    },
  };
}
