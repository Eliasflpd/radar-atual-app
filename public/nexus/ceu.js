import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js';

function profundidade(id) {
  let hash = 0;
  for (const letra of id) hash = (Math.imul(hash, 31) + letra.codePointAt(0)) >>> 0;
  return (hash % 4093 / 4093 - 0.5) * 13;
}

function camada(atributos, criarObjeto) {
  let capacidade = 0;
  const objeto = criarObjeto(new THREE.BufferGeometry());
  objeto.frustumCulled = false;
  return {
    objeto,
    preparar(total) {
      if (total > capacidade || !objeto.geometry.hasAttribute('position')) {
        capacidade = Math.max(total, capacidade * 2, 16);
        objeto.geometry.dispose();
        objeto.geometry = new THREE.BufferGeometry();
        for (const [nome, tamanho] of Object.entries(atributos)) {
          objeto.geometry.setAttribute(nome, new THREE.BufferAttribute(new Float32Array(capacidade * tamanho), tamanho).setUsage(THREE.DynamicDrawUsage));
        }
      }
      objeto.geometry.setDrawRange(0, total);
      return objeto.geometry.attributes;
    },
    atualizar() {
      for (const atributo of Object.values(objeto.geometry.attributes)) atributo.needsUpdate = true;
    },
  };
}

export function criarCeu(container, estado, acoes) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  const canvas = renderer.domElement;
  const rotulos = document.createElement('canvas');
  rotulos.className = 'ceu-rotulos';
  rotulos.setAttribute('aria-hidden', 'true');
  const texto = rotulos.getContext('2d');
  container.append(canvas, rotulos);

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 8000);
  camera.position.set(0, -16, 48);
  const controles = new OrbitControls(camera, canvas);
  controles.minDistance = 2;
  controles.maxDistance = 2600;
  controles.enableDamping = true;
  controles.touches.ONE = THREE.TOUCH.ROTATE;
  controles.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  const movimentoReduzido = matchMedia('(prefers-reduced-motion: reduce)');
  const escala = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(escala);

  // Pontos de fundo decorativos, sem rótulos, seleção ou ligações.
  const fundo = new THREE.BufferGeometry();
  const estrelas = [];
  for (let i = 0; i < 1600; i++) {
    const z = 2 * (i + 0.5) / 1600 - 1;
    const angulo = i * 2.399963;
    const raio = Math.sqrt(1 - z * z);
    estrelas.push(3600 * raio * Math.cos(angulo), 3600 * raio * Math.sin(angulo), 3600 * z);
  }
  fundo.setAttribute('position', new THREE.Float32BufferAttribute(estrelas, 3));
  const firmamento = new THREE.Points(fundo, new THREE.PointsMaterial({
    color: '#8d9bd2', size: escala, sizeAttenuation: false, transparent: true, opacity: 0.5, depthWrite: false,
  }));
  firmamento.frustumCulled = false;
  cena.add(firmamento);

  const material = new THREE.ShaderMaterial({
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float diametro;
      varying vec3 luz;
      void main() {
        luz = color;
        gl_PointSize = diametro;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 luz;
      void main() {
        float r = length(gl_PointCoord - vec2(0.5)) * 2.0;
        float halo = (1.0 - smoothstep(0.05, 1.0, r)) * exp(-3.0 * r);
        float nucleo = 1.0 - smoothstep(0.06, 0.30, r);
        gl_FragColor = vec4(mix(luz, vec3(1.0), nucleo * 0.75), min(1.0, halo + nucleo));
        #include <colorspace_fragment>
      }`,
  });
  const pontos = camada({ position: 3, color: 3, diametro: 1 }, (g) => new THREE.Points(g, material));
  const linhas = camada({ position: 3, color: 3 }, (g) => new THREE.LineSegments(g, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.82, depthWrite: false,
  })));
  cena.add(linhas.objeto, pontos.objeto);

  const cor = new THREE.Color();
  const claro = new THREE.Color('#c3d5ff');
  const escuro = new THREE.Color('#161c37');
  const projecao = new THREE.Vector3();
  const direcao = new THREE.Vector3(0.13, -0.31, 1).normalize();
  const nos = new Map();
  const arestas = [];
  const ligados = new Set();
  const centro = new THREE.Vector3();
  let largura = 1, altura = 1, quadro = 0, ultimoTempo = 0;
  let ativo = false, encaixar = true, hover = null, previa = null, inicio = null, toque = null;

  function ajustarTamanho() {
    largura = Math.max(1, container.clientWidth);
    altura = Math.max(1, container.clientHeight);
    renderer.setSize(largura, altura, false);
    rotulos.width = Math.round(largura * escala);
    rotulos.height = Math.round(altura * escala);
    texto.setTransform(escala, 0, 0, escala, 0, 0);
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(ajustarTamanho);
  observer.observe(container);

  function enquadrar() {
    const caixa = new THREE.Box3();
    for (const no of nos.values()) caixa.expandByPoint(no.base);
    caixa.getCenter(centro);
    const raio = Math.max(8, caixa.getSize(projecao).length() / 2);
    const angulo = THREE.MathUtils.degToRad(camera.fov / 2);
    const distancia = THREE.MathUtils.clamp(raio / Math.sin(Math.min(angulo, Math.atan(Math.tan(angulo) * camera.aspect))) * 1.06, 16, 2600);
    controles.target.copy(centro);
    camera.position.copy(centro).addScaledVector(direcao, distancia);
    controles.update();
  }

  function zoom(fator) {
    const distancia = camera.position.distanceTo(controles.target);
    const alvo = THREE.MathUtils.clamp(distancia * fator, controles.minDistance, controles.maxDistance);
    camera.position.sub(controles.target).multiplyScalar(alvo / distancia).add(controles.target);
    controles.update();
  }

  function legenda(rotulo, x, y, destaque) {
    if (x < 0 || x > largura || y < 0 || y > altura) return;
    texto.font = destaque ? '600 13px Inter, sans-serif' : '500 11px Inter, sans-serif';
    const w = Math.min(190, texto.measureText(rotulo).width);
    texto.fillStyle = 'rgba(5, 9, 24, .88)';
    texto.fillRect(x - w / 2 - 6, y - 9, w + 12, 18);
    texto.fillStyle = destaque ? '#fff2cb' : '#dae4fc';
    texto.textAlign = 'center';
    texto.textBaseline = 'middle';
    texto.fillText(rotulo, x, y, 190);
    return { x0: x - w / 2 - 6, y0: y - 9, x1: x + w / 2 + 6, y1: y + 9 };
  }

  const caixasGrupo = [];
  function desenhar(tempo) {
    if (!ativo) return;
    quadro = requestAnimationFrame(desenhar);
    const dt = Math.min(50, tempo - ultimoTempo);
    ultimoTempo = tempo;
    const { graph, sel, foco, caminho, grupos, grupoInfo, selAresta } = estado;
    const alvo = previa || hover || sel || foco;
    const rc = estado.realce;
    const noRealce = (id, a) => (rc.k === 'tipo' ? a.tipo === rc.v : graph.someEdge(id, (e, ad) => ad.dados && ad.dados.classe === rc.v));
    const ancora = alvo && graph.hasNode(alvo) ? graph.getNodeAttributes(alvo) : null;
    ligados.clear();
    arestas.length = 0;
    graph.forEachEdge((id, a, de, para) => {
      if (!acoes.visivelAresta(id)) return;
      const incidente = de === alvo || para === alvo;
      if (incidente && a.dados.tipo !== 'mais') ligados.add(de === alvo ? para : de);
      const noRc = rc && (rc.k === 'estado' ? a.dados && a.dados.classe === rc.v : graph.getNodeAttribute(de, 'tipo') === rc.v || graph.getNodeAttribute(para, 'tipo') === rc.v);
      arestas.push({ id, a, de, para, forte: id === selAresta || (rc ? noRc : caminho ? caminho.arestas.has(id) : incidente) });
    });
    const mostrar = pontos.preparar(graph.order);
    const suavidade = movimentoReduzido.matches || encaixar ? 1 : 1 - Math.exp(-dt / 130);

    let i = 0;
    graph.forEachNode((id, a) => {
      if (!acoes.visivelNo(id, a)) return;
      let no = nos.get(id);
      if (!no) {
        no = { base: new THREE.Vector3(), pos: new THREE.Vector3(a.x, a.y, profundidade(id)) };
        nos.set(id, no);
      }
      no.base.set(a.x, a.y, profundidade(id));
      projecao.copy(no.base);
      if (!movimentoReduzido.matches && !a.fixado && ancora && ligados.has(id) && !caminho) {
        centro.set(ancora.x, ancora.y, profundidade(alvo));
        projecao.lerp(centro, 0.28);
      }
      no.pos.lerp(projecao, suavidade);
      const destaque = id === alvo || id === sel || a.destaque;
      const proximo = rc ? noRealce(id, a) : caminho ? caminho.nos.has(id) : ligados.has(id);
      no.rotulo = a.label;
      no.destaque = destaque;
      no.mostrarRotulo = destaque || proximo || id === foco || a.tipo === 'mais';
      cor.set(a.color || '#a7bddf').lerp(claro, 0.43);
      if (destaque) cor.set('#ffdaa0');
      else if (!proximo && (alvo || rc)) cor.lerp(escuro, 0.47);
      mostrar.position.setXYZ(i, no.pos.x, no.pos.y, no.pos.z);
      mostrar.color.setXYZ(i, cor.r, cor.g, cor.b);
      mostrar.diametro.setX(i++, Math.min(46, a.size * (destaque ? 3 : 2.15)) * escala);
    });
    for (const id of nos.keys()) if (!graph.hasNode(id) || !acoes.visivelNo(id)) nos.delete(id);
    pontos.objeto.geometry.setDrawRange(0, i);
    pontos.atualizar();

    const tracos = linhas.preparar(arestas.length * 2);
    i = 0;
    for (const { a, de, para, forte } of arestas) {
      cor.set(a.color || '#8296bf').lerp(forte ? claro : escuro, forte ? 0.38 : 0.92);
      for (const id of [de, para]) {
        const { x, y, z } = nos.get(id).pos;
        tracos.position.setXYZ(i, x, y, z);
        tracos.color.setXYZ(i++, cor.r, cor.g, cor.b);
      }
    }
    linhas.atualizar();
    if (encaixar && nos.size) { enquadrar(); encaixar = false; }
    controles.enableDamping = !movimentoReduzido.matches;
    controles.update();
    renderer.render(cena, camera);

    texto.clearRect(0, 0, largura, altura);
    const ocupados = new Set();
    const ordenar = [...nos.values()].sort((a, b) => Number(b.destaque) - Number(a.destaque));
    for (const no of ordenar) {
      projecao.copy(no.pos).project(camera);
      no.x = (projecao.x + 1) * largura / 2;
      no.y = (1 - projecao.y) * altura / 2;
      no.z = projecao.z;
      const celula = Math.floor(no.x / 120) + ':' + Math.floor(no.y / 28);
      if (no.z >= -1 && no.z <= 1 && no.mostrarRotulo && (no.destaque || !ocupados.has(celula))) {
        legenda(no.rotulo, no.x, no.y - 17, no.destaque);
        ocupados.add(celula);
      }
    }
    caixasGrupo.length = 0;
    if (grupos) for (const grupo of grupoInfo) {
      const membros = grupo.ids.map((id) => nos.get(id)).filter((n) => n && n.z >= -1 && n.z <= 1);
      if (membros.length < 2) continue;
      const x = membros.reduce((soma, n) => soma + n.x, 0) / membros.length;
      const y = Math.min(...membros.map((n) => n.y)) - 38;
      const caixa = legenda(grupo.nome + ' · ' + membros.length, x, y, false);
      if (caixa) caixasGrupo.push({ ...caixa, indice: grupoInfo.indexOf(grupo) });
    }
  }

  function ponto(e) {
    const caixa = canvas.getBoundingClientRect();
    return { x: e.clientX - caixa.left, y: e.clientY - caixa.top };
  }

  function acharNo(p, limite) {
    let id = null;
    for (const [chave, no] of nos) {
      if (no.z < -1 || no.z > 1) continue;
      const distancia = Math.hypot(p.x - no.x, p.y - no.y);
      if (distancia < limite) { id = chave; limite = distancia; }
    }
    return id;
  }

  function acharAresta(p) {
    let achada = null, limite = 7;
    for (const { id, de, para } of arestas) {
      const a = nos.get(de), b = nos.get(para);
      if (a.z < -1 || a.z > 1 || b.z < -1 || b.z > 1) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = THREE.MathUtils.clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      const distancia = Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
      if (distancia < limite) { achada = id; limite = distancia; }
    }
    return achada;
  }

  canvas.addEventListener('pointerdown', (e) => {
    inicio = e.isPrimary && e.button === 0 ? { ...ponto(e), id: e.pointerId } : null;
    hover = null;
  }, { capture: true });
  canvas.addEventListener('pointermove', (e) => {
    const p = ponto(e);
    if (inicio && Math.hypot(p.x - inicio.x, p.y - inicio.y) > 6) inicio = null;
    if (e.pointerType !== 'touch' && !e.buttons) {
      hover = acharNo(p, 13);
      canvas.style.cursor = hover ? 'pointer' : '';
    }
  });
  canvas.addEventListener('pointerleave', () => { hover = null; });
  canvas.addEventListener('pointercancel', () => { inicio = null; });
  canvas.addEventListener('pointerup', (e) => {
    if (inicio?.id !== e.pointerId) return;
    inicio = null;
    const p = ponto(e);
    const grupoTocado = caixasGrupo.find((c) => p.x >= c.x0 && p.x <= c.x1 && p.y >= c.y0 && p.y <= c.y1);
    if (grupoTocado && acoes.abrirGrupo) { acoes.abrirGrupo(grupoTocado.indice); return; }
    const id = acharNo(p, e.pointerType === 'touch' ? 20 : 14);
    if (id && estado.graph.hasNode(id) && acoes.visivelNo(id)) {
      const duplo = e.pointerType === 'mouse' && toque?.id === id && performance.now() - toque.tempo < 350;
      toque = { id, tempo: performance.now() };
      if (duplo && estado.graph.getNodeAttribute(id, 'tipo') !== 'mais') acoes.expandir(id);
      else acoes.selecionar(id, false);
      return;
    }
    toque = null;
    const aresta = acharAresta(p);
    if (aresta && estado.graph.hasEdge(aresta) && acoes.visivelAresta(aresta)) acoes.painelAresta(aresta);
    else { estado.selAresta = null; estado.caminho = null; }
  });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); acoes.indisponivel(); });

  return {
    ativar(valor) {
      ativo = valor;
      cancelAnimationFrame(quadro);
      hover = previa = inicio = toque = null;
      if (ativo) {
        ajustarTamanho();
        ultimoTempo = performance.now();
        quadro = requestAnimationFrame(desenhar);
      }
    },
    enquadrar() { encaixar = true; },
    zoom,
    centralizar(id) {
      const no = nos.get(id);
      if (!no) return;
      camera.position.add(no.pos).sub(controles.target);
      controles.target.copy(no.pos);
      controles.update();
    },
    prever(id) { previa = id; },
    descartar() {
      ativo = false;
      cancelAnimationFrame(quadro);
      observer.disconnect();
      controles.dispose();
      cena.traverse((objeto) => { objeto.geometry?.dispose(); objeto.material?.dispose(); });
      renderer.dispose();
      canvas.remove();
      rotulos.remove();
    },
  };
}
