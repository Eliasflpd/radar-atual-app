// NEXUS — CAMADA 8 · MANUSCRITOS E CRÍTICA TEXTUAL. Folha transparente: cada versículo em que as edições ou os
// manuscritos diferem ganha um marcador EXATAMENTE acima dele (é a única folha alinhada verso a verso). No NT: palavras
// presentes só em parte das edições gregas (NA28, SBL, Westcott-Hort, Tregelles, Textus Receptus, Bizantina…) e os
// trechos entre colchetes duplos no NA28. No AT: Qere/Ketiv, palavras vindas da Septuaginta, texto restaurado e outros
// manuscritos hebraicos. Dados: STEPBible Data (Tyndale House, CC BY 4.0). Mostra onde há diferença, não qual é a original.
const SIGLAS = { NA28: 'Nestle-Aland 28ª', NA27: 'Nestle-Aland 27ª', SBL: 'SBL Greek NT', Tyn: 'Tyndale House GNT', WH: 'Westcott-Hort (1881)', Treg: 'Tregelles', TR: 'Textus Receptus', Byz: 'Texto Bizantino' };
const CHAVES = ['manuscritos', 'manuscrito', 'critica textual', 'variantes', 'variante', 'ketiv', 'qere', 'textus receptus', 'colchetes'];

export async function criarCamadaManuscritos(THREE, ctx) {
  const dados = await (await fetch('/nexus/camadas/manuscritos.json?v=1')).json();
  const L = dados.versos;
  L.forEach((r, i) => { r.i = i; const q = ctx.posVerso(r.k); if (q) { r.x = q.x; r.y = q.y; } else r.x = null;
    r.at = r.k < 40e6; r.tipo = r.at ? (r.lxx || r.rest ? 'lxx' : r.qk ? 'qk' : 'ms') : (r.cd ? 'cd' : r.semNA >= r.semTR ? 'semNA' : 'semTR'); });
  const vis = L.filter((r) => r.x != null);
  const COR = { qk: '#C9B6E4', lxx: '#E9C27A', ms: '#A9B8E6', cd: '#FFD38A', semNA: '#F0A3B5', semTR: '#9FC7F2' };
  const NOME = { qk: 'Qere/Ketiv (lido × escrito)', lxx: 'texto da Septuaginta ou restaurado', ms: 'outros manuscritos hebraicos', cd: 'entre colchetes duplos no NA28', semNA: 'palavras ausentes no NA28', semTR: 'palavras ausentes no Textus Receptus' };
  const objetos = [], n = vis.length, pos = new Float32Array(n * 3), cor = new Float32Array(n * 3), tam = new Float32Array(n), realce = new Float32Array(n);
  vis.forEach((r, i) => { r.vi = i; pos.set([r.x, r.y, 0], i * 3); const c = new THREE.Color(COR[r.tipo]); cor.set([c.r, c.g, c.b], i * 3); tam[i] = 1.4 + Math.log2(1 + r.peso) * 0.8; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cor, 3)); g.setAttribute('tam', new THREE.BufferAttribute(tam, 1));
  g.setAttribute('realce', new THREE.BufferAttribute(realce, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { px: { value: ctx.escala }, tempo: { value: 0 }, opac: { value: 1 } },
    vertexShader: `attribute float tam; attribute float realce; uniform float px; uniform float tempo; varying vec3 c; varying float b;
      void main(){ c = color; b = 0.8 + 0.2 * sin(tempo * 2.0 + position.x * 0.01) + realce * 1.3; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float s = tam * (1.0 + realce) * 1300.0 / -mv.z; gl_PointSize = clamp(s, 1.6, 26.0) * px; gl_Position = projectionMatrix * mv; }`,
    // forma de "rasura": um X fino dentro de um círculo
    fragmentShader: `uniform float opac; varying vec3 c; varying float b; void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q);
      float x = max(smoothstep(0.07, 0.0, abs(q.x - q.y)), smoothstep(0.07, 0.0, abs(q.x + q.y))) * step(d, 0.42); float aro = smoothstep(0.06, 0.0, abs(d - 0.44));
      float a = (x * 0.9 + aro * 0.7 + smoothstep(0.5, 0.0, d) * 0.15) * b; gl_FragColor = opac * vec4(c * a, a); }` });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; objetos.push(pts);
  const CEL = 120, grade = new Map(); vis.forEach((r) => { const c = Math.floor(r.x / CEL) + ':' + Math.floor(r.y / CEL); (grade.get(c) || grade.set(c, []).get(c)).push(r); });
  let realcados = [];
  const ordemPeso = vis.slice().sort((a, b) => b.peso - a.peso);
  const resumo = (r) => [r.qk && `${r.qk} Qere/Ketiv`, r.lxx && `${r.lxx} da Septuaginta`, r.rest && `${r.rest} restaurada(s)`, r.ms && `${r.ms} em outros manuscritos`, r.semNA && `${r.semNA} ausente(s) no NA28`, r.semTR && `${r.semTR} ausente(s) no TR`, r.cd && 'trecho entre colchetes duplos no NA28', r.alt && `${r.alt} leitura(s) alternativa(s)`].filter(Boolean).join(' · ');

  return {
    nome: (i) => (L[i] ? `${ctx.nomeRef(L[i].k)}: diferenças entre edições` : ''),
    total: () => L.length,
    objetos, versosDif: L,
    quadro(t) { mat.uniforms.tempo.value = t / 1000; },
    realcar(lista) { for (const i of realcados) { const r = L[i]; if (r && r.vi != null) realce[r.vi] = 0; } realcados = lista.filter((i) => L[i]); for (const i of realcados) if (L[i].vi != null) realce[L[i].vi] = 1; g.attributes.realce.needsUpdate = true; },
    pegar(x, y, raio) {
      const w = ctx.noPlano(x, y), w2 = ctx.noPlano(x + raio, y); if (!w || !w2) return -1;
      const rw = Math.hypot(w2.x - w.x, w2.y - w.y), cx = Math.floor(w.x / CEL), cy = Math.floor(w.y / CEL), alc = Math.ceil(rw / CEL); let m = -1, dm = raio * raio;
      for (let gx = cx - alc; gx <= cx + alc; gx++) for (let gy = cy - alc; gy <= cy + alc; gy++) for (const r of grade.get(gx + ':' + gy) || []) { const q = ctx.tela(r.x, r.y); if (!q) continue; const d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < dm) { dm = d; m = r.i; } }
      return m;
    },
    pos(i) { const r = L[i]; return r && r.x != null ? { x: r.x, y: r.y } : null; },
    versos(i) { return L[i] ? [L[i].k] : []; },
    porVerso(k) { return L.findIndex((r) => r.k === k); },
    info(i) { const r = L[i]; return `<b>${ctx.esc(ctx.nomeRef(r.k))}</b><em>${ctx.esc(NOME[r.tipo])}</em><small>Manuscritos · ${ctx.esc(resumo(r))} · clique para ver as diferenças</small>`; },
    ficha(i) {
      const r = L[i], esc = ctx.esc;
      return { titulo: ctx.nomeRef(r.k), rotulo: `Manuscritos · ${r.at ? 'Antigo Testamento (hebraico)' : 'Novo Testamento (grego)'}`, html:
        `<p><i>“${esc(ctx.textoDe(r.k))}”</i> <small>(Almeida)</small></p>
        <h5>O que difere</h5><div>${esc(resumo(r))}</div>
        <h5>Exemplos, palavra por palavra</h5>${r.ex.map((e) => `<p><small>${esc(e)}</small></p>`).join('')}
        ${r.cd ? '<p><small>Os colchetes duplos [[ ]] do Nestle-Aland marcam trechos que os editores consideram acréscimos antigos ao texto, mas mantêm por sua importância (ex.: Mc 16:9-20; Jo 7:53–8:11).</small></p>' : ''}
        ${r.at ? '<p><small>Qere (“o que se lê”) é a correção dos escribas na margem; Ketiv (“o que está escrito”) é o texto da linha. As traduções em geral seguem o Qere.</small></p>' : `<h5>Edições comparadas</h5><small>${Object.entries(SIGLAS).map(([k, v]) => `${k} = ${v}`).join(' · ')}</small>`}
        <p><small>⚠️ ${esc(dados.aviso)}</small></p><p><small>Fonte: ${esc(dados.fonte)}</small></p>`, versos: [r.k] };
    },
    rotulos(texto, dist, W, H) {
      const lim = dist > 9000 ? 10 : dist > 4000 ? 20 : dist > 1500 ? 36 : 60; let k = 0;
      for (const r of ordemPeso) { if (k >= lim) break; const q = ctx.tela(r.x, r.y); if (!q || q.x < 0 || q.x > W || q.y < 0 || q.y > H) continue; if (texto(`✕ ${ctx.nomeRef(r.k)}`, q.x + 9, q.y + 8, '600 12px Inter, system-ui, sans-serif', COR[r.tipo], 'rgba(14,6,20,.72)', 1, false)) k++; }
    },
    buscar(q) { if (CHAVES.includes(q)) return { i: ordemPeso[0].i, pont: 100 }; return null; },
  };
}
