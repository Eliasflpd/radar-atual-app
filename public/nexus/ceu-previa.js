// NEXUS BÍBLICO — PRÉVIA do novo Céu Infinito (19/11/2026). Só abre em desenvolvimento local:
//   http://localhost:<porta>/nexus/?ref=João%201:1&ceu=previa
// A versão publicada (ceu.js v9) continua intacta. Mesma interface de ceu.js: criarCeu(container, estado, acoes).
//
// MODELO: esfera celeste. A câmera fica no centro e você olha ao redor (arrastar gira o olhar, roda e pinça
// estreitam o campo de visão), como no Google Earth Sky. Não há deslocamento em profundidade.
// O céu de fundo é DECORATIVO e gerado aqui mesmo (estrelas, faixa da Via Láctea e nebulosas procedurais):
// nenhuma imagem externa é baixada e nenhum dado do NEXUS sai do aparelho.
// Todo ponto interativo é um nó real do mapa do NEXUS, e toda linha é uma ligação real (estado.graph).
//
// TRÊS MOMENTOS
//   1. Vista distante: só os agrupamentos (regiões do céu), com nome e contagem; sem linhas, sem painel.
//   2. Aproximação: ao dar zoom ou tocar no nome de um agrupamento, as estrelas ganham rótulos conforme há espaço
//      e as ligações internas aparecem bem de leve. O botão "Vista geral" volta ao começo.
//   3. Constelação: passar o mouse (ou tocar) numa estrela acende as ligações reais em sequência e aproxima de
//      leve os pontos ligados. "Abrir detalhes" usa o painel de evidências do NEXUS.
import * as THREE from 'three';

const TIPO_COR = { passagem: '#F4E3B5', obra: '#E2B65C', autor: '#B9C3D3', conceito: '#8FD3CF', verbete: '#A6D9A0', descoberta: '#F0A08C', pessoa: '#D9C2F0', lugar: '#9EC5F2', evento: '#F2C59E' };
const NOME_TIPO = { passagem: 'passagem', obra: 'obra', autor: 'autor', conceito: 'conceito', verbete: 'termo original', descoberta: 'descoberta' };
const PLURAL = { passagem: 'Outras passagens', obra: 'Outras obras', autor: 'Outros autores', conceito: 'Outros conceitos', verbete: 'Outros termos originais', descoberta: 'Outras descobertas' };
const PRIORIDADE = { conceito: 0, passagem: 1, verbete: 2, obra: 3, autor: 4, descoberta: 5 };

// Agrupamentos próprios (propagação de rótulos, determinística) quando o mapa ainda não calculou os grupos de assuntos.
function comunidades(g, ids) {
  const dentro = new Set(ids), rot = new Map(ids.map((id) => [id, id]));
  const ordem = ids.slice().sort((a, b) => hash(a) - hash(b));
  for (let volta = 0; volta < 12; volta++) {
    let mudou = false;
    for (const id of ordem) {
      const cont = new Map();
      g.forEachNeighbor(id, (v) => { if (dentro.has(v)) { const r = rot.get(v); cont.set(r, (cont.get(r) || 0) + 1 + g.degree(v) * 0.01); } });
      let melhor = rot.get(id), mv = -1;
      for (const [r, c] of cont) if (c > mv || (c === mv && r < melhor)) { mv = c; melhor = r; }
      if (melhor !== rot.get(id)) { rot.set(id, melhor); mudou = true; }
    }
    if (!mudou) break;
  }
  const grupos = {};
  for (const [id, r] of rot) (grupos[r] = grupos[r] || []).push(id);
  return Object.values(grupos);
}
const FOV_LONGE = 78, FOV_PERTO = 14;
const R = 100;   // raio da esfera dos pontos do NEXUS (o fundo fica mais longe)

function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0; return h / 4294967295; }
function direcao(lon, lat) { const cl = Math.cos(lat); return new THREE.Vector3(cl * Math.sin(lon), Math.sin(lat), -cl * Math.cos(lon)); }

export function criarCeu(container, estado, acoes) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) { acoes.indisponivel && acoes.indisponivel(); return null; }
  const escala = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(escala);
  renderer.setClearColor('#05070F');
  const canvas = renderer.domElement;
  canvas.className = 'cp-canvas';
  const rot = document.createElement('canvas'); rot.className = 'cp-rotulos';
  const ctx2 = rot.getContext('2d');
  const ui = document.createElement('div'); ui.className = 'cp-ui';
  ui.innerHTML = `<button class="cp-geral" type="button" hidden>⟲ Vista geral</button>
    <div class="cp-dica">Arraste para olhar o céu · role ou faça pinça para aproximar · toque numa estrela</div>
    <div class="cp-cartao" hidden></div>
    <div class="cp-credito">Prévia do Céu Infinito · céu de fundo gerado no aparelho (decorativo) · pontos e ligações: dados do NEXUS</div>`;
  container.append(canvas, rot, ui);
  const estilo = document.createElement('style');
  estilo.textContent = `
    body.ceu-previa.modo-ceu .legenda, body.ceu-previa.modo-ceu .filtros, body.ceu-previa.modo-ceu .rotulos-grupos, body.ceu-previa.modo-ceu .zoom, body.ceu-previa.modo-ceu .ceu-ajuda{display:none!important}
    .ceu{background:#05070F}
    .cp-canvas,.cp-rotulos{position:absolute;inset:0;width:100%;height:100%;display:block}
    .cp-canvas{touch-action:none;cursor:grab}.cp-canvas.arrastando{cursor:grabbing}
    .cp-rotulos{pointer-events:none}
    .cp-ui{position:absolute;inset:0;pointer-events:none;font-family:Inter,system-ui,sans-serif}
    .cp-geral{pointer-events:auto;position:absolute;top:14px;left:14px;border:1px solid rgba(233,220,192,.45);background:rgba(10,16,34,.72);color:#F4E9CF;border-radius:999px;padding:8px 14px;font-size:14px;cursor:pointer;backdrop-filter:blur(6px)}
    .cp-geral:hover{background:rgba(20,40,75,.85)}
    .cp-dica{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);color:rgba(230,226,214,.62);font-size:12.5px;text-align:center;white-space:nowrap;max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis}
    .cp-credito{position:absolute;bottom:4px;right:10px;color:rgba(200,200,210,.35);font-size:10.5px}
    .cp-cartao{pointer-events:auto;position:absolute;top:14px;right:14px;width:min(300px,calc(100% - 28px));background:rgba(251,248,241,.96);color:#1B2333;border-radius:14px;padding:12px 14px;box-shadow:0 12px 30px rgba(0,0,0,.35)}
    .cp-cartao b{display:block;font-family:"Cormorant Garamond",Georgia,serif;font-size:19px;color:#14284B;line-height:1.2}
    .cp-cartao small{color:#5F6672;font-size:12.5px}
    .cp-cartao .cp-bts{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
    .cp-cartao button{border:1px solid #E5DFD2;background:#fff;border-radius:10px;padding:7px 12px;font-size:13.5px;cursor:pointer;color:#14284B}
    .cp-cartao button.cp-abrir{background:#14284B;color:#fff;border-color:#14284B}
    @media (max-width:760px){.cp-cartao{top:auto;bottom:40px;right:12px;left:12px;width:auto}.cp-dica{font-size:11.5px}}`;
  document.head.appendChild(estilo);

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV_LONGE, 1, 0.1, 5000);
  let yaw = 0, pitch = 0.04, fov = FOV_LONGE;          // olhar atual
  let alvo = null;                                       // voo animado { yaw, pitch, fov, t0, de }
  let vYaw = 0, vPitch = 0;                              // inércia

  // ── céu de fundo procedural (decorativo) ─────────────────────────────────
  const fundoPos = [], fundoCor = [], fundoTam = [];
  const corEstrela = [new THREE.Color('#FFFFFF'), new THREE.Color('#CFE0FF'), new THREE.Color('#FFE9C4'), new THREE.Color('#FFD2B0')];
  const plano = new THREE.Vector3(0.35, 0.88, 0.32).normalize();   // eixo da faixa da Via Láctea
  for (let i = 0; i < 9000; i++) {
    let v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    if (v.lengthSq() > 1 || v.lengthSq() < 0.01) { i--; continue; }
    v.normalize();
    if (i % 3 === 0) { const d = v.dot(plano); v.addScaledVector(plano, -d * 0.92).normalize(); }   // adensa a faixa
    v.multiplyScalar(1500);
    fundoPos.push(v.x, v.y, v.z);
    const c = corEstrela[i % 4], br = 0.18 + Math.pow(Math.random(), 4) * 0.6;
    fundoCor.push(c.r * br, c.g * br, c.b * br);
    fundoTam.push((0.5 + Math.pow(Math.random(), 7) * 2.2) * escala);
  }
  const gFundo = new THREE.BufferGeometry();
  gFundo.setAttribute('position', new THREE.Float32BufferAttribute(fundoPos, 3));
  gFundo.setAttribute('color', new THREE.Float32BufferAttribute(fundoCor, 3));
  gFundo.setAttribute('tam', new THREE.Float32BufferAttribute(fundoTam, 1));
  const matFundo = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { zoom: { value: 1 } },
    vertexShader: 'attribute float tam; uniform float zoom; varying vec3 c; void main(){ c = color; gl_PointSize = tam * zoom; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 c; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(c * a, a); }',
  });
  const fundo = new THREE.Points(gFundo, matFundo); fundo.frustumCulled = false; cena.add(fundo);
  // nebulosas: manchas suaves geradas em canvas
  function texturaNebulosa(cor) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    for (let k = 0; k < 7; k++) {
      const x = 128 + (Math.random() - 0.5) * 60, y = 128 + (Math.random() - 0.5) * 60, r = 30 + Math.random() * 45;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, cor + '1c'); gr.addColorStop(1, cor + '00');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    return new THREE.CanvasTexture(c);
  }
  ['#5B6CC9', '#9A5BC9', '#C98A5B', '#4FA3B8', '#6E7FD8'].forEach((cor, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaNebulosa(cor), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
    const d = direcao(i * 1.3 + 0.4, (hash('n' + i) - 0.5) * 0.9).multiplyScalar(1400);
    s.position.copy(d); s.scale.set(700, 700, 1); s.material.opacity = 0.55; cena.add(s);
  });

  // ── estrelas do NEXUS ────────────────────────────────────────────────────
  const matEstrela = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { zoom: { value: 1 } },
    vertexShader: 'attribute float tam; attribute float brilho; uniform float zoom; varying vec3 c; varying float b; void main(){ c = color; b = brilho; gl_PointSize = tam * zoom; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 c; varying float b; void main(){ float d = length(gl_PointCoord - 0.5); float nucleo = smoothstep(0.16, 0.0, d); float halo = smoothstep(0.5, 0.0, d) * 0.55; float a = (nucleo + halo) * b; gl_FragColor = vec4(c * a + vec3(nucleo * b * 0.5), a); }',
  });
  const gEst = new THREE.BufferGeometry();
  const estrelas = new THREE.Points(gEst, matEstrela); estrelas.frustumCulled = false; cena.add(estrelas);
  const matLinha = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float alfa; attribute vec3 cor; varying float a; varying vec3 c; void main(){ a = alfa; c = cor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying float a; varying vec3 c; void main(){ gl_FragColor = vec4(c * a, a); }',
  });
  const gLin = new THREE.BufferGeometry();
  const linhas = new THREE.LineSegments(gLin, matLinha); linhas.frustumCulled = false; cena.add(linhas);

  const texHalo = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const halos = new THREE.Group(); cena.add(halos);
  let nos = [], porId = new Map(), arestas = [], regioes = [], assinatura = '';
  function montar() {
    const g = estado.graph;
    const vis = (id, a) => a.tipo !== 'mais' && (!acoes.visivelNo || acoes.visivelNo(id, a));
    const ids = g.filterNodes((id, a) => vis(id, a));
    // regiões: os grupos de assuntos do NEXUS; quem sobra é reunido por tipo
    const nomeDe = (l) => { const n = l.filter((id) => id !== estado.foco).sort((x, y) => ((PRIORIDADE[g.getNodeAttribute(x, 'tipo')] ?? 9) - (PRIORIDADE[g.getNodeAttribute(y, 'tipo')] ?? 9)) || (g.degree(y) - g.degree(x)))[0] || l[0];
      const t = String(g.getNodeAttribute(n, 'label') || g.getNodeAttribute(n, 'rotulo') || n); return t.length > 26 ? t.slice(0, 25) + '…' : t; };
    let grupos = (estado.grupoInfo || []).map((gr) => ({ nome: gr.nome, ids: gr.ids.filter((id) => ids.includes(id)) })).filter((gr) => gr.ids.length);
    // a passagem em foco liga-se a quase tudo: fica fora do cálculo (senão vira um grupo só) e entra no maior grupo
    const semHub = ids.filter((id) => id !== estado.foco && g.degree(id) < Math.max(12, ids.length * 0.45));
    if (!grupos.length) grupos = comunidades(g, semHub).filter((l) => l.length >= 5).sort((a, b) => b.length - a.length).slice(0, 7).map((l) => ({ nome: nomeDe(l), ids: l }));
    if (estado.foco && ids.includes(estado.foco) && !grupos.some((gr) => gr.ids.includes(estado.foco))) {
      if (grupos.length) { grupos[0].ids.unshift(estado.foco); grupos[0].nome = String(g.getNodeAttribute(estado.foco, 'label') || estado.foco); } else grupos.push({ nome: String(g.getNodeAttribute(estado.foco, 'label') || estado.foco), ids: [estado.foco] });
    }
    const usados = new Set(grupos.flatMap((gr) => gr.ids));
    const resto = {};
    for (const id of ids) if (!usados.has(id)) { const t = g.getNodeAttribute(id, 'tipo') || 'outro'; (resto[t] = resto[t] || []).push(id); }
    for (const [t, l] of Object.entries(resto)) grupos.push({ nome: PLURAL[t] || 'Outros', ids: l });
    // a passagem em foco abre no centro da vista
    const iFoco = grupos.findIndex((gr) => gr.ids.includes(estado.foco));
    if (iFoco > 0) grupos.unshift(...grupos.splice(iFoco, 1));
    // regiões espalhadas por uma faixa larga do céu, com espaço entre elas
    const n = grupos.length;
    const passo = Math.min(0.62, (Math.PI * 1.5) / Math.max(1, n));
    regioes = grupos.map((gr, i) => {
      const lon = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * passo;   // o foco no meio, os outros alternando dos lados
      const lat = (i % 2 ? 0.26 : -0.2) + (hash(gr.nome) - 0.5) * 0.18;
      const raio = 0.07 + Math.sqrt(gr.ids.length) * 0.032;
      return { nome: gr.nome, ids: gr.ids, lon, lat, raio, centro: direcao(lon, lat).multiplyScalar(R) };
    });
    halos.children.slice().forEach((h) => { h.material.dispose(); halos.remove(h); });
    regioes.forEach((rg, i) => {
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo, color: i === 0 ? '#E9C77A' : ['#7F9BE0', '#8FC9C2', '#C49BE0', '#E0A98F', '#9FBF8F', '#D9D19A'][i % 6], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.32 }));
      h.position.copy(rg.centro).multiplyScalar(1.02); const tam = rg.raio * R * 3.4; h.scale.set(tam, tam, 1); halos.add(h);
    });
    // posições: estrutura do mapa 2D (x, y) dentro de cada região
    nos = []; porId = new Map();
    regioes.forEach((rg, ri) => {
      const xs = rg.ids.map((id) => g.getNodeAttribute(id, 'x') || 0), ys = rg.ids.map((id) => g.getNodeAttribute(id, 'y') || 0);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const esc = Math.max(1e-6, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2;
      rg.ids.forEach((id, k) => {
        const a = g.getNodeAttribute(id, 'tipo');
        let dx = ((g.getNodeAttribute(id, 'x') || 0) - cx) / esc, dy = ((g.getNodeAttribute(id, 'y') || 0) - cy) / esc;
        if (rg.ids.length === 1 || !isFinite(dx)) { dx = 0; dy = 0; }
        if (Math.abs(dx) + Math.abs(dy) < 1e-3 && rg.ids.length > 1) { const ang = k * 2.39996, rr = Math.sqrt(k / rg.ids.length); dx = rr * Math.cos(ang); dy = rr * Math.sin(ang); }
        const base = direcao(rg.lon + dx * rg.raio / Math.cos(rg.lat), rg.lat - dy * rg.raio).multiplyScalar(R);
        const grau = g.degree(id);
        nos.push({ id, tipo: a, rotulo: g.getNodeAttribute(id, 'label') || g.getNodeAttribute(id, 'rotulo') || id, regiao: ri, base, pos: base.clone(), grau, foco: id === estado.foco,
          cor: new THREE.Color(TIPO_COR[a] || '#E6E6F0'), tam: (id === estado.foco ? 30 : 11 + Math.min(12, Math.sqrt(grau) * 2.6)) * escala, brilho: 1, alvoBrilho: 1 });
        porId.set(id, nos.length - 1);
      });
    });
    arestas = [];
    g.forEachEdge((k, a, s, t) => {
      if (!porId.has(s) || !porId.has(t) || (acoes.visivelAresta && !acoes.visivelAresta(k))) return;
      const cl = a.dados && a.dados.classe;
      arestas.push({ k, s: porId.get(s), t: porId.get(t), cor: new THREE.Color(cl === 'direta' ? '#F3D9A0' : cl === 'interpretacao' ? '#D9B45A' : cl === 'hipotese' ? '#E59A55' : '#9FB7E8'), alfa: 0, alvoAlfa: 0, prog: 1, inicio: 0 });
    });
    gEst.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nos.length * 3), 3));
    gEst.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nos.flatMap((nn) => [nn.cor.r, nn.cor.g, nn.cor.b])), 3));
    gEst.setAttribute('tam', new THREE.BufferAttribute(new Float32Array(nos.map((nn) => nn.tam)), 1));
    gEst.setAttribute('brilho', new THREE.BufferAttribute(new Float32Array(nos.length), 1));
    gLin.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arestas.length * 6), 3));
    gLin.setAttribute('cor', new THREE.BufferAttribute(new Float32Array(arestas.flatMap((e) => [e.cor.r, e.cor.g, e.cor.b, e.cor.r, e.cor.g, e.cor.b])), 3));
    gLin.setAttribute('alfa', new THREE.BufferAttribute(new Float32Array(arestas.length * 2), 1));
  }

  // ── olhar e voo ──────────────────────────────────────────────────────────
  function aplicarOlhar() {
    pitch = Math.max(-1.35, Math.min(1.35, pitch));
    fov = Math.max(FOV_PERTO, Math.min(FOV_LONGE, fov));
    camera.fov = fov; camera.updateProjectionMatrix();
    camera.quaternion.setFromEuler(new THREE.Euler(pitch, -yaw, 0, 'YXZ'));
    const z = Math.pow(FOV_LONGE / fov, 0.45);
    matEstrela.uniforms.zoom.value = z; matFundo.uniforms.zoom.value = Math.pow(FOV_LONGE / fov, 0.25);
  }
  function voar(y, p, f) {
    let dy = y - yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    alvo = { de: { yaw, pitch, fov }, para: { yaw: yaw + dy, pitch: p, fov: f }, t0: performance.now(), dur: 900 };
  }
  function vistaGeral() {
    const c = 0;
    voar(c, 0.04, FOV_LONGE); soltarConstelacao(); fecharCartao();
  }
  function irParaRegiao(i) {
    const r = regioes[i]; if (!r) return;
    voar(r.lon, r.lat, Math.max(FOV_PERTO + 6, Math.min(46, r.raio * 260)));
  }
  function olharPara(id, f) {
    const n = nos[porId.get(id)]; if (!n) return;
    const v = n.base.clone().normalize();
    voar(Math.atan2(v.x, -v.z), Math.asin(v.y), f || Math.min(fov, 32));
  }

  // ── constelação reativa ──────────────────────────────────────────────────
  let ativa = null;      // índice do nó em destaque
  let fixa = false;      // fixada por toque/clique
  function formarConstelacao(i, fixar) {
    if (ativa === i && (!fixar || fixa)) return;
    ativa = i; fixa = !!fixar;
    const agora = performance.now();
    let ordem = 0;
    const viz = new Set([i]);
    arestas.filter((e) => e.s === i || e.t === i).sort((a, b) => nos[b.s === i ? b.t : b.s].grau - nos[a.s === i ? a.t : a.s].grau).forEach((e) => {
      e.prog = 0; e.inicio = agora + ordem * 70; ordem++; viz.add(e.s === i ? e.t : e.s);
    });
    nos.forEach((n, k) => { n.alvoBrilho = viz.has(k) ? 1.35 : 0.2; });
    const c = nos[i].base;
    nos.forEach((n, k) => { n.alvoPos = viz.has(k) && k !== i ? n.base.clone().lerp(c, 0.12).setLength(R) : n.base; });
  }
  function soltarConstelacao() {
    ativa = null; fixa = false;
    nos.forEach((n) => { n.alvoBrilho = 1; n.alvoPos = n.base; });
  }

  // ── cartão de detalhes (o painel completo é o do NEXUS) ─────────────────
  const cartao = ui.querySelector('.cp-cartao');
  function abrirCartao(i) {
    const n = nos[i];
    const lig = arestas.filter((e) => e.s === i || e.t === i).length;
    cartao.innerHTML = `<small>${NOME_TIPO[n.tipo] || n.tipo || ''} · ${lig} ligação(ões) no céu</small><b>${String(n.rotulo).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</b>
      <div class="cp-bts"><button class="cp-abrir" type="button">Abrir detalhes</button><button class="cp-expandir" type="button">Trazer vizinhos</button><button class="cp-fechar" type="button">Fechar</button></div>`;
    cartao.hidden = false;
    cartao.querySelector('.cp-abrir').onclick = () => { acoes.selecionar(n.id, true); };
    cartao.querySelector('.cp-expandir').onclick = () => { acoes.expandir && acoes.expandir(n.id); };
    cartao.querySelector('.cp-fechar').onclick = () => { fecharCartao(); soltarConstelacao(); };
  }
  function fecharCartao() { cartao.hidden = true; }
  const btGeral = ui.querySelector('.cp-geral');
  btGeral.onclick = vistaGeral;

  // ── projeção e escolha de pontos ─────────────────────────────────────────
  let W = 1, H = 1;
  const tmp = new THREE.Vector3();
  function tela(v) {
    tmp.copy(v).project(camera);
    if (tmp.z > 1) return null;
    return { x: (tmp.x + 1) / 2 * W, y: (1 - tmp.y) / 2 * H };
  }
  function noPerto(x, y, raio) {
    let melhor = -1, dm = raio * raio;
    nos.forEach((n, k) => { const p = tela(n.pos); if (!p) return; const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < dm) { dm = d; melhor = k; } });
    return melhor;
  }
  let caixasRegiao = [];
  function regiaoPerto(x, y) { const c = caixasRegiao.find((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1); return c ? c.i : -1; }

  // ── ponteiro: arrastar, roda, pinça, toque ───────────────────────────────
  const ponteiros = new Map();
  let arrasto = null, pinca = null, moveu = false;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    ponteiros.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    alvo = null; vYaw = vPitch = 0; moveu = false;
    if (ponteiros.size === 1) arrasto = { x: e.offsetX, y: e.offsetY, t: performance.now() };
    if (ponteiros.size === 2) { const [a, b] = [...ponteiros.values()]; pinca = { d: Math.hypot(a.x - b.x, a.y - b.y), fov }; arrasto = null; }
    canvas.classList.add('arrastando');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (ponteiros.has(e.pointerId)) ponteiros.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pinca && ponteiros.size === 2) {
      const [a, b] = [...ponteiros.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      fov = pinca.fov * pinca.d / Math.max(10, d); moveu = true; return;
    }
    if (arrasto) {
      const dx = e.offsetX - arrasto.x, dy = e.offsetY - arrasto.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moveu = true;
      const k = (fov * Math.PI / 180) / H;
      yaw -= dx * k; pitch += dy * k;
      const dt = Math.max(8, performance.now() - arrasto.t);
      vYaw = -dx * k / dt * 16; vPitch = dy * k / dt * 16;
      arrasto = { x: e.offsetX, y: e.offsetY, t: performance.now() };
      return;
    }
    if (e.pointerType === 'mouse' && !fixa) {
      const i = noPerto(e.offsetX, e.offsetY, 16);
      if (i >= 0) { formarConstelacao(i, false); canvas.style.cursor = 'pointer'; }
      else { if (ativa != null) soltarConstelacao(); canvas.style.cursor = regiaoPerto(e.offsetX, e.offsetY) >= 0 ? 'pointer' : ''; }
    }
  });
  const soltar = (e) => {
    ponteiros.delete(e.pointerId);
    if (ponteiros.size < 2) pinca = null;
    if (ponteiros.size === 0) {
      canvas.classList.remove('arrastando');
      if (!moveu) {
        const ri = regiaoPerto(e.offsetX, e.offsetY);
        const i = noPerto(e.offsetX, e.offsetY, e.pointerType === 'touch' ? 26 : 16);
        if (ri >= 0) { irParaRegiao(ri); soltarConstelacao(); fecharCartao(); }
        else if (i >= 0) { formarConstelacao(i, true); abrirCartao(i); }
        else if (fixa) { soltarConstelacao(); fecharCartao(); }
        vYaw = vPitch = 0;
      }
      arrasto = null;
    }
  };
  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', soltar);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); alvo = null; fov *= Math.exp(e.deltaY * 0.0012); }, { passive: false });
  canvas.addEventListener('dblclick', (e) => { const i = noPerto(e.offsetX, e.offsetY, 18); if (i >= 0) olharPara(nos[i].id, Math.max(FOV_PERTO, fov * 0.55)); });

  // ── rótulos (conforme há espaço) ─────────────────────────────────────────
  function desenharRotulos() {
    ctx2.setTransform(escala, 0, 0, escala, 0, 0);
    ctx2.clearRect(0, 0, W, H);
    caixasRegiao = [];
    const perto = (FOV_LONGE - fov) / (FOV_LONGE - FOV_PERTO);   // 0 longe … 1 perto
    const ocupado = [];
    const cabe = (b) => !ocupado.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
    // nomes das regiões (fortes de longe, somem ao aproximar)
    const aRegiao = Math.max(0, Math.min(1, 1.25 - perto * 2.1));
    if (aRegiao > 0.02) regioes.forEach((r, i) => {
      const p = tela(r.centro); if (!p || p.x < -100 || p.x > W + 100 || p.y < -60 || p.y > H + 60) return;
      const y = p.y - r.raio * R * (H / (2 * Math.tan(fov * Math.PI / 360) * R)) - 16;
      ctx2.font = '600 15px "Cormorant Garamond", Georgia, serif';
      const txt = r.nome + '  ·  ' + r.ids.length, w = ctx2.measureText(txt).width;
      ctx2.globalAlpha = aRegiao; ctx2.fillStyle = 'rgba(8,12,28,.55)'; ctx2.fillRect(p.x - w / 2 - 10, y - 12, w + 20, 24);
      ctx2.strokeStyle = 'rgba(233,210,150,.45)'; ctx2.strokeRect(p.x - w / 2 - 10, y - 12, w + 20, 24);
      ctx2.fillStyle = '#F2DFAE'; ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle'; ctx2.fillText(txt, p.x, y);
      const b = { x0: p.x - w / 2 - 10, x1: p.x + w / 2 + 10, y0: y - 12, y1: y + 12, i };
      caixasRegiao.push(b); ocupado.push(b);
    });
    ctx2.globalAlpha = 1;
    // estrelas: destacadas primeiro, depois pelo grau, só onde couber
    const ordem = nos.map((n, k) => k).sort((a, b) => ((nos[b].alvoBrilho > 1 ? 1e6 : 0) + nos[b].grau + (nos[b].foco ? 1e7 : 0)) - ((nos[a].alvoBrilho > 1 ? 1e6 : 0) + nos[a].grau + (nos[a].foco ? 1e7 : 0)));
    const limite = ativa != null ? 40 : Math.round(Math.pow(Math.max(0, perto - 0.12), 1.4) * 140);
    let feitos = 0;
    ctx2.textAlign = 'left'; ctx2.textBaseline = 'middle';
    for (const k of ordem) {
      const n = nos[k];
      const destaque = ativa != null && n.alvoBrilho > 1;
      if (!destaque && (feitos >= limite || (ativa != null))) continue;
      const p = tela(n.pos); if (!p || p.x < 0 || p.x > W || p.y < 0 || p.y > H) continue;
      ctx2.font = (n.foco || k === ativa ? '600 ' : '') + (destaque ? '13px' : '12px') + ' Inter, system-ui, sans-serif';
      const txt = String(n.rotulo).length > 38 ? String(n.rotulo).slice(0, 36) + '…' : String(n.rotulo);
      const w = ctx2.measureText(txt).width, x = p.x + 8, y = p.y;
      const b = { x0: x - 2, x1: x + w + 2, y0: y - 8, y1: y + 8 };
      if (!destaque && !cabe(b)) continue;
      ocupado.push(b); feitos++;
      ctx2.fillStyle = 'rgba(5,7,15,.55)'; ctx2.fillRect(b.x0, b.y0, b.x1 - b.x0, 16);
      ctx2.fillStyle = k === ativa ? '#FFF4D6' : destaque ? '#F4E3B5' : 'rgba(225,228,240,.85)';
      ctx2.fillText(txt, x, y);
    }
    btGeral.hidden = fov > FOV_LONGE - 4 && ativa == null;
  }

  // ── laço de desenho ──────────────────────────────────────────────────────
  let ativo = false, quadro = 0, ultimo = performance.now();
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ajustar() {
    W = container.clientWidth || 1; H = container.clientHeight || 1;
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
    rot.width = W * escala; rot.height = H * escala;
  }
  const obs = new ResizeObserver(() => ativo && ajustar()); obs.observe(container);
  function desenhar(t) {
    if (!ativo) return;
    const dt = Math.min(50, t - ultimo); ultimo = t;
    const ass = estado.graph.order + '|' + estado.graph.size + '|' + (estado.grupoInfo || []).length;
    if (ass !== assinatura) { assinatura = ass; montar(); }
    if (alvo) {
      const q = Math.min(1, (t - alvo.t0) / alvo.dur), e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
      yaw = alvo.de.yaw + (alvo.para.yaw - alvo.de.yaw) * e; pitch = alvo.de.pitch + (alvo.para.pitch - alvo.de.pitch) * e; fov = alvo.de.fov + (alvo.para.fov - alvo.de.fov) * e;
      if (q >= 1) alvo = null;
    } else if (!arrasto && (Math.abs(vYaw) + Math.abs(vPitch) > 1e-5)) {
      yaw += vYaw * dt / 16; pitch += vPitch * dt / 16; vYaw *= 0.93; vPitch *= 0.93;
    }
    aplicarOlhar();
    const perto = (FOV_LONGE - fov) / (FOV_LONGE - FOV_PERTO);
    // estrelas: brilho e aproximação suaves
    const pos = gEst.attributes.position, bri = gEst.attributes.brilho;
    const suave = reduzido ? 1 : 1 - Math.pow(0.001, dt / 1000 * 2.2);
    nos.forEach((n, k) => {
      n.brilho += (n.alvoBrilho - n.brilho) * suave;
      if (n.alvoPos && !reduzido) n.pos.lerp(n.alvoPos, suave * 0.8); else if (n.alvoPos) n.pos.copy(n.alvoPos);
      pos.setXYZ(k, n.pos.x, n.pos.y, n.pos.z); bri.setX(k, n.brilho * (0.8 + 0.2 * perto) + (n.foco ? 0.2 : 0));
    });
    pos.needsUpdate = bri.needsUpdate = true;
    // linhas: escondidas de longe; leves dentro da região ao aproximar; acesas em sequência na constelação
    const lp = gLin.attributes.position, la = gLin.attributes.alfa;
    arestas.forEach((e, k) => {
      const a = nos[e.s], b = nos[e.t];
      let alvoA;
      if (ativa != null) alvoA = (e.s === ativa || e.t === ativa) ? 0.95 : 0.0;
      else alvoA = a.regiao === b.regiao ? Math.max(0, perto - 0.35) * 0.35 : Math.max(0, perto - 0.6) * 0.12;
      e.alfa += (alvoA - e.alfa) * suave;
      if (ativa != null && (e.s === ativa || e.t === ativa)) e.prog = Math.min(1, Math.max(0, (t - e.inicio) / 380));
      else e.prog = 1;
      const de = e.s === ativa ? a.pos : e.t === ativa ? b.pos : a.pos, para = e.s === ativa ? b.pos : e.t === ativa ? a.pos : b.pos;
      const fim = tmp.copy(de).lerp(para, e.prog);
      lp.setXYZ(k * 2, de.x, de.y, de.z); lp.setXYZ(k * 2 + 1, fim.x, fim.y, fim.z);
      const al = e.prog > 0 ? e.alfa : 0; la.setX(k * 2, al); la.setX(k * 2 + 1, al);
    });
    lp.needsUpdate = la.needsUpdate = true;
    renderer.render(cena, camera);
    desenharRotulos();
    quadro = requestAnimationFrame(desenhar);
  }

  let primeiraVez = true;
  return {
    ativar(valor) {
      ativo = valor;
      document.body.classList.toggle('ceu-previa', valor);
      cancelAnimationFrame(quadro);
      if (valor) {
        ajustar(); montar(); assinatura = estado.graph.order + '|' + estado.graph.size + '|' + (estado.grupoInfo || []).length;
        if (primeiraVez) {   // abre de longe, sem painel lateral
          primeiraVez = false;
          const pn = document.getElementById('painel'); if (pn) pn.hidden = true;
          const c = 0;
          yaw = c; pitch = 0.04; fov = FOV_LONGE;
        }
        ultimo = performance.now(); quadro = requestAnimationFrame(desenhar);
      }
    },
    enquadrar() { vistaGeral(); },
    zoom(f) { alvo = null; fov *= f; },
    centralizar(id) { olharPara(id); },
    prever() {},
    descartar() {
      ativo = false; cancelAnimationFrame(quadro); obs.disconnect();
      document.body.classList.remove('ceu-previa');
      cena.traverse((o) => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); });
      renderer.dispose(); canvas.remove(); rot.remove(); ui.remove(); estilo.remove();
    },
    // para os testes da prévia
    _teste: { regioes: () => regioes.map((r) => ({ nome: r.nome, n: r.ids.length })), nos: () => nos.length, linhas: () => arestas.length, fov: () => fov,
      telaDe: (id) => { const n = nos[porId.get(id)]; return n ? tela(n.pos) : null; }, telaRegiao: (i) => tela(regioes[i].centro), ativa: () => (ativa == null ? null : nos[ativa].id),
      irRegiao: (i) => irParaRegiao(i), caixas: () => caixasRegiao, regiaoDoFoco: () => regioes.findIndex((r) => r.ids.includes(estado.foco)),
      acesas: () => arestas.filter((e) => e.alfa > 0.5 && e.prog >= 1).length, cartao: () => !cartao.hidden, maisLigado: () => nos.slice().sort((a, b) => b.grau - a.grau)[0].id },
  };
}
