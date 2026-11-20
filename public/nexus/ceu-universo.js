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
//
// CAMADAS (20/11/2026): folhas transparentes empilhadas no MESMO sistema de coordenadas, vistas em perspectiva:
//   1. Universo (céu, Via Láctea, regiões do cânon) · 2. Bíblia (galáxias, versículos, ligações) · 3. Atlas (mapa).
// Cada camada tem liga/desliga, opacidade e identidade própria; a busca de um assunto acende as três ao mesmo tempo,
// com fios de luz entre as camadas (lugar no Atlas -> versículos na Bíblia). Para criar uma camada nova, acrescente
// uma entrada em CAMADAS (a ordem é a altura) e ponha seus objetos no grupo dela.
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
      <button data-cu="camadas" title="Camadas: ligar, desligar e transparência" aria-label="Camadas" class="cu-bt-atlas ativo">◫</button>
    </div>
    <div class="cu-nivel"></div>
    <div class="cu-dica">Arraste para navegar · roda para aproximar · passe o mouse nas estrelas · duplo clique aproxima</div>
    <div class="cu-dica-toque">Um dedo navega · dois dedos aproximam · toque seleciona · toque longo abre a investigação</div>
    <div class="cu-info" hidden></div>
    <div class="cu-lugar" hidden></div>
    <form class="cu-busca" autocomplete="off"><input type="search" placeholder="Pesquisar assunto: livro, lugar ou seção (ex.: Êxodo, Jerusalém)" aria-label="Pesquisar assunto nas camadas" enterkeyhint="search"><button type="submit">Buscar</button></form>
    <div class="cu-camadas"></div>
    <div class="cu-relogio"><div class="cu-hora"></div><div class="cu-tempo-bts"><button type="button" data-tempo="-60">−1h</button><button type="button" data-tempo="agora">Agora</button><button type="button" data-tempo="60">+1h</button><button type="button" data-tempo="local" title="Usar a localização deste aparelho">📍</button></div><input type="range" min="-720" max="720" value="0" step="10" data-tempo="barra" aria-label="Avançar ou voltar no tempo"></div>
    <div class="cu-invest" hidden></div>
    <div class="cu-cartao" hidden></div>
    <div class="cu-credito">Céu real ao vivo: estrelas HYG v4.1 (CC BY-SA 4.0) · Via Láctea ESO/S. Brunier (CC BY 4.0) · Lua, Sol e planetas: astronomy-engine (MIT) · versículos da Almeida · ligações OpenBible (CC BY) e NEXUS</div>`;
  container.append(canvas, rot, ui);
  const estilo = document.createElement('style');
  estilo.textContent = `
    body.ceu-universo.modo-ceu .legenda, body.ceu-universo.modo-ceu .filtros, body.ceu-universo.modo-ceu .rotulos-grupos, body.ceu-universo.modo-ceu .zoom, body.ceu-universo.modo-ceu .ceu-ajuda, body.ceu-universo.modo-ceu .vazio{display:none!important}
    .ceu{background:#03050B}
    .cu-canvas,.cu-rotulos{position:absolute;inset:0;width:100%;height:100%;display:block}
    .cu-canvas{touch-action:none;cursor:grab}.cu-canvas.arrastando{cursor:grabbing}
    .cu-rotulos{pointer-events:none}
    .cu-ui{position:absolute;inset:0;pointer-events:none;font-family:Inter,system-ui,sans-serif;color:#E9E4D6}
    .cu-controles{pointer-events:auto;position:absolute;left:14px;bottom:44px;display:flex;flex-direction:column;gap:6px}
    .cu-controles button{width:38px;height:38px;border-radius:12px;border:1px solid rgba(233,210,150,.28);background:rgba(8,14,30,.72);color:#F1E6C8;font-size:17px;cursor:pointer;backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center}
    .cu-controles .cu-bt-atlas.ativo{background:rgba(201,162,78,.35);border-color:#E9C878}
    .cu-lugar{pointer-events:auto;position:absolute;left:50%;top:12px;transform:translateX(-50%);background:rgba(3,8,22,.88);border:1px solid rgba(233,200,120,.55);border-radius:999px;padding:6px 8px 6px 14px;color:#FFE3A3;font:600 13px Inter,system-ui,sans-serif;display:flex;gap:10px;align-items:center;white-space:nowrap}
    .cu-lugar button{border:0;background:rgba(201,162,78,.25);color:#FFE3A3;border-radius:999px;width:24px;height:24px;cursor:pointer}
    .cu-busca{pointer-events:auto;position:absolute;left:50%;top:10px;transform:translateX(-50%);display:flex;gap:6px;width:min(520px,calc(100% - 300px))}
    .cu-busca input{flex:1;min-width:0;background:rgba(3,8,22,.82);border:1px solid rgba(233,200,120,.45);border-radius:999px;color:#F4EEDC;padding:8px 14px;font:14px Inter,system-ui,sans-serif;outline:none}
    .cu-busca input::placeholder{color:rgba(220,226,240,.6)}
    .cu-busca button{border:1px solid rgba(233,200,120,.6);background:rgba(201,162,78,.28);color:#FFE3A3;border-radius:999px;padding:0 14px;font:600 13px Inter,system-ui,sans-serif;cursor:pointer}
    .cu-camadas{pointer-events:auto;position:absolute;right:12px;top:10px;width:236px;max-height:calc(100% - 60px);overflow:auto;background:rgba(3,8,22,.84);border:1px solid rgba(233,200,120,.35);border-radius:14px;padding:10px 12px;font:12.5px Inter,system-ui,sans-serif;color:#E9EDF8;backdrop-filter:blur(6px)}
    .cu-camadas[hidden]{display:none}
    .cu-camadas h4{margin:0 0 6px;font:700 15px "Cormorant Garamond",Georgia,serif;color:#FFE3A3;letter-spacing:.04em}
    .cu-camada{display:grid;grid-template-columns:18px 1fr;gap:2px 8px;align-items:center;margin:6px 0}
    .cu-camada label{display:flex;align-items:center;gap:7px;cursor:pointer;font-weight:600}
    .cu-camada i{width:10px;height:10px;border-radius:50%;display:inline-block}
    .cu-camada input[type=range],.cu-sep input{grid-column:2;width:100%;accent-color:#E9C878}
    .cu-relogio{pointer-events:auto;position:absolute;right:12px;bottom:26px;width:236px;background:rgba(3,8,22,.84);border:1px solid rgba(233,200,120,.35);border-radius:14px;padding:8px 12px;color:#E9EDF8;font:12px Inter,system-ui,sans-serif}
    .cu-hora{font-weight:600;color:#FFE3A3;line-height:1.4}.cu-hora small{display:block;font-weight:400;color:rgba(210,220,240,.8)}
    .cu-tempo-bts{display:flex;gap:5px;margin:6px 0 4px}.cu-tempo-bts button{flex:1;border:1px solid rgba(233,200,120,.4);background:rgba(201,162,78,.16);color:#FFE3A3;border-radius:8px;padding:4px 0;cursor:pointer;font-size:12px}
    .cu-relogio input{width:100%;accent-color:#E9C878}
    @media (max-width:760px){.cu-relogio{right:8px;bottom:22px;width:200px}}
    .cu-reservada{opacity:.5}.cu-reservada small{grid-column:2;color:rgba(200,210,230,.7);font-size:11px}
    .cu-sep{margin-top:8px;border-top:1px solid rgba(233,200,120,.2);padding-top:6px}
    .cu-invest{pointer-events:auto;position:absolute;left:62px;top:54px;width:min(340px,calc(100% - 80px));max-height:calc(100% - 110px);overflow:auto;background:rgba(3,8,22,.9);border:1px solid rgba(233,200,120,.45);border-radius:14px;padding:12px 14px;color:#EEF1FA;font:13px/1.5 Inter,system-ui,sans-serif}
    .cu-invest h3{margin:0;font:700 22px "Cormorant Garamond",Georgia,serif;color:#FFE3A3}
    .cu-invest h5{margin:10px 0 4px;font:700 11px Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#9FB7E8}
    .cu-invest .cu-chips{display:flex;flex-wrap:wrap;gap:5px}
    .cu-invest .cu-chips button{border:1px solid rgba(233,200,120,.4);background:rgba(201,162,78,.14);color:#FFE8B0;border-radius:999px;padding:3px 9px;font-size:12px;cursor:pointer}
    .cu-invest small{color:rgba(200,212,236,.8)}
    .cu-invest .cu-fechar-inv{float:right;border:0;background:none;color:#FFE3A3;font-size:18px;cursor:pointer}
    @media (max-width:1100px){.cu-busca{left:62px;right:262px;width:auto;transform:none}.cu-nivel{top:52px}.cu-invest{top:92px}}
    @media (max-width:760px){.cu-busca{width:calc(100% - 70px);left:auto;right:8px;transform:none}.cu-camadas{top:52px;right:8px}.cu-invest{left:8px;top:52px;width:calc(100% - 16px);max-height:45%}}
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
  // ── CAMADAS: folhas transparentes empilhadas (a ordem é a altura). Nova camada = nova entrada aqui. ──────────
  const CAMADAS = [
    { id: 'universo', nome: 'Universo', cor: '#7EA6E6', grupo: new THREE.Group(), visivel: true, opacidade: 1, z: 0, animada: true },
    { id: 'biblia', nome: 'Bíblia', cor: '#F2D28B', grupo: new THREE.Group(), visivel: true, opacidade: 1, z: 0, animada: true },
    { id: 'atlas', nome: 'Atlas', cor: '#E9C878', grupo: new THREE.Group(), visivel: true, opacidade: 0.28, z: 0, propria: true },
  ];
  // camadas 4 a 10: reservadas no motor (nome, cor e altura); o conteúdo de cada uma será construído depois, uma por vez
  [['tempo', 'Tempo · cronologia', '#9FD3C7'], ['personagens', 'Personagens · genealogias', '#E8A87C'], ['linguas', 'Línguas originais', '#B5C7F2'],
   ['historia', 'História e cultura', '#D9B98C'], ['manuscritos', 'Manuscritos · crítica textual', '#C9B6E4'], ['teologia', 'Teologia · doutrinas', '#F2C6A0'],
   ['tradicao', 'Tradição · história da Igreja', '#A9D18E']].forEach(([id, nome, cor]) => CAMADAS.push({ id, nome, cor, grupo: new THREE.Group(), visivel: false, opacidade: 0.8, z: 0, reservada: true }));
  // MOTOR DE CAMADAS — feito para 10 ou mais folhas sem pesar:
  //   • registrarCamada({ id, nome, cor, criar(ctx) }) acrescenta uma folha; criar() só roda quando a folha é ligada
  //     pela primeira vez (carga sob demanda) e devolve os objetos que vão no grupo dela;
  //   • folha desligada não é desenhada nem percorrida (custo zero);
  //   • a opacidade só é reaplicada quando muda (exceto nas folhas animadas);
  //   • animação pesada roda na placa de vídeo (shaders), não no processador;
  //   • orçamento de quadro: se o aparelho passar de ~22 ms por quadro, a resolução interna baixa sozinha, e volta
  //     quando sobra folga.
  function registrarCamada(def) {
    const c = { visivel: false, opacidade: 0.8, z: 0, cor: '#C8D2E6', ...def, grupo: new THREE.Group(), criada: !def.criar };
    CAMADAS.push(c); c.grupo.renderOrder = (CAMADAS.length - 1) * 10; cena.add(c.grupo); c.grupo.visible = false;
    if (typeof montarPainel === 'function') montarPainel();
    return c;
  }
  async function garantirCriada(c) {
    if (c.criada || c.criando) return; c.criando = true;
    try { const objs = await c.criar({ THREE, secoes, livros, vIdx, vBase }); (Array.isArray(objs) ? objs : [objs]).forEach((o) => o && c.grupo.add(o)); c._sujo = true; }
    finally { c.criada = true; c.criando = false; precisaOpac = true; }
  }
  let precisaOpac = true;
  const camada = (id) => CAMADAS.find((c) => c.id === id);
  CAMADAS.forEach((c, i) => { c.grupo.renderOrder = i * 10; cena.add(c.grupo); });
  const GU = camada('universo').grupo, GB = camada('biblia').grupo, GA = camada('atlas').grupo;
  let separacao = 1, espaco = 0, zB = 0, zA = 0;
  cena.add(new THREE.AmbientLight('#8796bf', 0.65));
  const luzSol = new THREE.DirectionalLight('#FFE7B8', 1.7); luzSol.position.set(-0.4, 0.6, 1); cena.add(luzSol);
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 200000);
  const alvo = new THREE.Vector3(0, 0, 0);
  let dist = 22000, incl = 0.62;                     // inclinação (botão direito) em radianos
  let voo = null, inercia = new THREE.Vector2();
  const historico = [];
  function posicionar() {
    dist = Math.max(DIST_MIN, Math.min(DIST_MAX, dist));
    incl = Math.max(0, Math.min(1.15, incl));
    camera.position.set(alvo.x, alvo.y - Math.sin(incl) * dist, alvo.z + Math.cos(incl) * dist);
    camera.up.set(0, 1, 0);
    camera.lookAt(alvo);
    camera.near = Math.max(0.5, dist * 0.01); camera.far = dist * 20 + 40000;
    camera.updateProjectionMatrix();
  }
  const ray = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), ndc = new THREE.Vector2();
  function noPlano(x, y, z = zB) { plano.constant = -z; ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera); const p = new THREE.Vector3(); return ray.ray.intersectPlane(plano, p) ? p : null; }
  function zoomEm(x, y, fator) {
    inercia.set(0, 0);
    // cursor sobre o globo: aproxima em direção ao ponto da Terra sob o cursor (ele fica parado na tela)
    if (typeof raioNoGlobo === 'function' && atlasC && !modoTerra) { const hit = raioNoGlobo(x, y); if (hit) {
      // a câmera anda em linha reta na direção do ponto (mesma orientação): o ponto fica cravado sob o cursor
      const camPos = camera.position.clone(), novoPos = hit.clone().add(camPos.sub(hit).multiplyScalar(fator));
      const ci = Math.cos(incl), d2 = (novoPos.z - zB) / Math.max(ci, 0.05);
      if (d2 < DIST_MIN || d2 > DIST_MAX) return;
      dist = d2; alvo.x = novoPos.x; alvo.y = novoPos.y + Math.sin(incl) * dist; posicionar(); return;
    } }
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
  let vSec = null, vPos = null, vCor = null, vTam = null, vBri = null, vIdx = new Map(), vChave = [];
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
    vPos = new Float32Array(total * 3); vCor = new Float32Array(total * 3); vTam = new Float32Array(total); vBri = new Float32Array(total); vSec = new Float32Array(total);
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
          vTam[j] = 1.4 + hash(j * 7) * 1.4; vBri[j] = 0.55 + hash(j * 3) * 0.35; vSec[j] = secoes.indexOf(lv.sec);
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
    gVers.setAttribute('sec', new THREE.BufferAttribute(vSec, 1));
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
        sp.scale.set(t, t, 1); sp.material.rotation = a; sp.userData.secao = i; nebulosas.add(sp);
      }
    });
    precisaOpac = true;
    montarAtlas();
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
  [[fraco ? 3500 : 8000, 0.35, 14000, -1200], [fraco ? 2200 : 5000, 0.6, 9000, -400], [fraco ? 900 : 2000, 0.85, 6000, -120]].forEach(([n, fator, T, z], ci) => {
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
      uniforms: { cam: { value: new THREE.Vector2() }, T: { value: T }, fator: { value: fator }, px: { value: escala }, tempo: { value: 0 }, deriva: { value: new THREE.Vector2(ci === 2 ? 9 : 3 + ci * 2, ci === 2 ? -4 : -1.2) } },
      vertexShader: `attribute float tam; uniform vec2 cam; uniform float T; uniform float fator; uniform float px; uniform float tempo; uniform vec2 deriva; varying vec3 c; varying float tw;
        void main(){ c = color; vec3 q = position; vec2 o = cam * fator - deriva * tempo; q.xy = cam + mod(q.xy - o, T) - T * 0.5;
          float fase = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
          float vel = 0.6 + fract(fase * 7.13) * 2.2;
          tw = 0.55 + 0.45 * sin(tempo * vel + fase) * sin(tempo * vel * 0.37 + fase * 1.7);
          gl_PointSize = tam * px * (0.85 + 0.3 * tw); gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0); }`,
      fragmentShader: 'uniform float opac; varying vec3 c; varying float tw; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * (0.45 + 0.55 * tw); gl_FragColor = opac * vec4(c * a, a); }' });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; fundoCamadas.push(m);   // céu desenhado: substituído pelo céu real
  });
  const nebulosas = new THREE.Group(), galaxias = new THREE.Group(), viaLactea = new THREE.Group(); GU.add(nebulosas); GB.add(galaxias);

  // ── O CÉU REAL E AO VIVO (fundo da camada Universo): módulo ceu-real.js, numa cena própria desenhada antes ───
  let ceuR = null;
  import('/nexus/ceu-real.js?v=6').then((m) => { ceuR = m.criarCeuReal(THREE, { escala }); atualizarRelogio(); }).catch((e) => console.warn('céu real indisponível', e));
  renderer.autoClear = false;
  // estrela cadente (decorativa): um risco de luz de vez em quando
  const gCad = new THREE.BufferGeometry();
  gCad.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3).setUsage(THREE.DynamicDrawUsage));
  gCad.setAttribute('alfa', new THREE.BufferAttribute(new Float32Array([0, 0]), 1).setUsage(THREE.DynamicDrawUsage));
  const cadente = new THREE.LineSegments(gCad, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float alfa; varying float a; void main(){ a = alfa; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float opac; varying float a; void main(){ gl_FragColor = opac * vec4(vec3(1.0, 0.96, 0.85) * a, a); }' }));
  cadente.frustumCulled = false; GU.add(cadente);
  let cad = null, proxCad = performance.now() + 4000;
  function montarViaLactea() {
    const x0 = Math.min(...secoes.map((q) => q.cx)) - 9000, x1 = Math.max(...secoes.map((q) => q.cx)) + 9000;
    const y0 = Math.min(...secoes.map((q) => q.cy)) - 9000, y1 = Math.max(...secoes.map((q) => q.cy)) + 9000;
    const ax = x0, ay = y1, bx = x1, by = y0, comp = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax);
    const n = fraco ? 9000 : 22000, pos = new Float32Array(n * 3), cor = new Float32Array(n * 3), tam = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = Math.random(), g = (Math.random() + Math.random() + Math.random() - 1.5) * 2600 * (0.6 + 0.4 * Math.sin(t * 9));
      const x = ax + (bx - ax) * t - Math.sin(ang) * g, y = ay + (by - ay) * t + Math.cos(ang) * g;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = -260;
      const quente = Math.random() < 0.35, br = 0.12 + Math.pow(Math.random(), 3) * 0.5;
      cor[i * 3] = (quente ? 1 : 0.82) * br; cor[i * 3 + 1] = (quente ? 0.9 : 0.88) * br; cor[i * 3 + 2] = (quente ? 0.75 : 1) * br;
      tam[i] = 0.7 + Math.pow(Math.random(), 6) * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cor, 3)); g.setAttribute('tam', new THREE.BufferAttribute(tam, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, uniforms: { px: { value: escala }, tempo: { value: 0 } },
      vertexShader: 'attribute float tam; uniform float px; uniform float tempo; varying vec3 c; varying float tw; void main(){ c = color; float f = fract(sin(dot(position.xy, vec2(7.13, 3.71))) * 9137.5) * 6.28; tw = 0.6 + 0.4 * sin(tempo * (1.0 + fract(f) * 2.0) + f); gl_PointSize = tam * px; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float opac; varying vec3 c; varying float tw; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * tw; gl_FragColor = opac * vec4(c * a, a); }' });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; viaLactea.add(pts); matVia = m;
    for (let k = 0; k < 16; k++) {   // a névoa clara da faixa
      const t = (k + 0.5) / 16, sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNebulosa[k % 3], color: k % 3 ? '#BFD0F5' : '#F2E2C2', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.2 }));
      sp.position.set(ax + (bx - ax) * t, ay + (by - ay) * t, -300); sp.scale.set(comp / 7, comp / 18, 1); sp.material.rotation = ang + (hash('v' + k) - 0.5) * 0.3; viaLactea.add(sp);
    }
  }
  let matVia = null;

  // ── versículos (as estrelas reais) ─────────────────────────────────────────────
  const gVers = new THREE.BufferGeometry();
  let vBase = null, vBriBase = null;
  const matVers = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { px: { value: escala }, k: { value: 1 }, tempo: { value: 0 }, revela: { value: new Array(10).fill(0) }, longeR: { value: 1 } },
    vertexShader: `attribute float tam; attribute float brilho; attribute float sec; uniform float px; uniform float k; uniform float tempo; uniform float revela[10]; uniform float longeR; varying vec3 c; varying float b;
      void main(){ c = color; float rv = 1.0; for (int i = 0; i < 10; i++) { if (float(i) == sec) rv = revela[i]; }
        float fase = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
        float tw = 0.8 + 0.2 * sin(tempo * (0.8 + fract(fase * 3.7) * 2.4) + fase);
        b = brilho * (brilho > 1.1 ? 1.0 : tw) * mix(1.0, rv, brilho > 1.1 ? 0.0 : longeR);
        vec4 mv = modelViewMatrix * vec4(position, 1.0); float s = tam * k * 900.0 / -mv.z; gl_PointSize = clamp(s, 0.9, 26.0) * px * (0.65 + 0.35 * b); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform float opac; varying vec3 c; varying float b; void main(){ float d = length(gl_PointCoord - 0.5); float nucleo = smoothstep(0.18, 0.0, d); float halo = smoothstep(0.5, 0.0, d) * 0.5; float a = (nucleo + halo) * b; gl_FragColor = opac * vec4(c * a + vec3(nucleo * b * 0.35), a); }' });
  const versos = new THREE.Points(gVers, matVers); versos.frustumCulled = false; GB.add(versos);

  // ── constelação: linhas que acendem em sequência + partículas correndo por elas ─────────────
  const MAX_LIN = 64;
  const gLin = new THREE.BufferGeometry();
  gLin.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_LIN * 6), 3).setUsage(THREE.DynamicDrawUsage));
  gLin.setAttribute('alfa', new THREE.BufferAttribute(new Float32Array(MAX_LIN * 2), 1).setUsage(THREE.DynamicDrawUsage));
  gLin.setAttribute('cor', new THREE.BufferAttribute(new Float32Array(MAX_LIN * 6), 3).setUsage(THREE.DynamicDrawUsage));
  const linhas = new THREE.LineSegments(gLin, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float alfa; attribute vec3 cor; varying float a; varying vec3 c; void main(){ a = alfa; c = cor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float opac; varying float a; varying vec3 c; void main(){ gl_FragColor = opac * vec4(c * a, a); }' }));
  linhas.frustumCulled = false; GB.add(linhas);
  const MAX_PART = fraco ? 160 : 420;
  const gPart = new THREE.BufferGeometry();
  gPart.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_PART * 3), 3).setUsage(THREE.DynamicDrawUsage));
  gPart.setAttribute('alfa', new THREE.BufferAttribute(new Float32Array(MAX_PART), 1).setUsage(THREE.DynamicDrawUsage));
  const particulas = new THREE.Points(gPart, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { px: { value: escala } },
    vertexShader: 'attribute float alfa; uniform float px; varying float a; void main(){ a = alfa; gl_PointSize = 3.2 * px; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float opac; varying float a; void main(){ float d = length(gl_PointCoord - 0.5); float k = smoothstep(0.5, 0.0, d); gl_FragColor = opac * vec4(vec3(1.0, 0.9, 0.65) * k * a, k * a); }' }));
  particulas.frustumCulled = false; GB.add(particulas);
  // satélites: elementos do NEXUS (obras, autores, conceitos, termos) em volta das passagens abertas
  const gSat = new THREE.BufferGeometry();
  const satelites = new THREE.Points(gSat, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, uniforms: { px: { value: escala } },
    vertexShader: 'attribute float alfa; uniform float px; varying vec3 c; varying float a; void main(){ c = color; a = alfa; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = clamp(5200.0 / -mv.z, 3.0, 22.0) * px; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float opac; varying vec3 c; varying float a; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float anel = smoothstep(0.5, 0.36, d) * smoothstep(0.2, 0.3, d); float nucleo = smoothstep(0.22, 0.0, d); gl_FragColor = opac * vec4(c * (anel + nucleo) * a, (anel + nucleo) * a); }' }));
  satelites.frustumCulled = false; GB.add(satelites);

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
    lugaresDoVerso(k);
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

  // ── REVELAÇÃO DAS REGIÕES: de longe só o nome da região; ao passar o mouse (ou tocar) no nome, os livros surgem ──
  const revela = new Array(10).fill(0); let secRevelada = null, revelaAte = 0, caixasRegiao = [];
  const longeR = () => Math.max(0, Math.min(1, (dist - 6000) / 3000));   // 0 perto (tudo aparece) … 1 longe (só o revelado)
  function revelar(i, ms = 1600) { if (i == null || i < 0) return; secRevelada = i; revelaAte = performance.now() + ms; }
  function regiaoNoPonto(x, y) { const c = caixasRegiao.find((b) => x >= b.x0 - 6 && x <= b.x1 + 6 && y >= b.y0 - 6 && y <= b.y1 + 6); return c ? c.i : -1; }
  const livroOculto = (lv) => lv && longeR() > 0.5 && revela[secoes.indexOf(lv.sec)] < 0.3;

  // ── projeção, escolha e informação ───────────────────────────────────────────
  let W = 1, H = 1;
  const tmp = new THREE.Vector3();
  function tela(x, y, z = zB) { tmp.set(x, y, z).project(camera); if (tmp.z > 1 || tmp.z < -1) return null; return { x: (tmp.x + 1) / 2 * W, y: (1 - tmp.y) / 2 * H }; }
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
  function satPerto(px, py, raio) { let m = -1, dm = raio * raio; sats.forEach((s, i) => { const p = tela(s.x, s.y, zB + 1); if (!p) return; const d = (p.x - px) ** 2 + (p.y - py) ** 2; if (d < dm) { dm = d; m = i; } }); return m; }
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
      if (modoTerra) { posicionarTerra(); const pt = raioNoGlobo(e.offsetX, e.offsetY); modoTerra.agarrado = pt ? atlasC.latLonDe(pt) : null; modoTerra.vel = { lat: 0, lon: 0 }; modoTerra.ancora = null; modoTerra.cursor = null; modoTerra.ancoraPinca = false; }
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
      if (pincaTerra(alvoD / (pinca.ultimo || pinca.dist))) { pinca.ultimo = alvoD; moveu = true; return; }
      zoomEm(pinca.cx, pinca.cy, alvoD / dist); moveu = true; return;
    }
    if (arrasto) {
      const dx = e.offsetX - arrasto.x, dy = e.offsetY - arrasto.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) { moveu = true; clearTimeout(toqueLongo); }
      if (modoTerra) { arrastarTerra(e.offsetX, e.offsetY); arrasto = { x: e.offsetX, y: e.offsetY, t: performance.now() }; return; }
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
      const li = lugarPerto(x, y, 10);
      if (li >= 0) { const l = atlasC.lugares[li]; const conf = l.conf >= 700 ? 'identificação segura' : l.conf >= 300 ? 'identificação provável' : 'identificação incerta'; canvas.style.cursor = 'pointer'; info.innerHTML = `<b>${esc(l.nome)}</b>${l.identificacao && l.identificacao !== l.nome ? `<em>hoje: ${esc(l.identificacao)}</em>` : ''}<small>Atlas · ${l.peso} versículo(s) · ${conf} (${l.conf}/1000) · OpenBible.info · clique para acender os versículos</small>`; info.hidden = false; info.style.left = Math.min(W - 310, x + 16) + 'px'; info.style.top = Math.min(H - 80, y + 14) + 'px'; if (!lugarAtivo && livroAtivo == null) { atlasC.acender([li]); fios = l.versos.slice(0, 80).map((k) => ({ l: li, j: vIdx.get(k) })).filter((f) => f.j != null); } return; }
      const bV = !modoTerra && camada('biblia').visivel && camada('biblia').opacidade > 0.1;   // só pega o que está visível
      const s = bV && dist < 1800 ? satPerto(x, y, 12) : -1;
      if (s >= 0) { canvas.style.cursor = 'pointer'; info.innerHTML = `<b>${esc(sats[s].rotulo)}</b><small>${esc(NOME_TIPO[sats[s].tipo] || sats[s].tipo)} · ligado a ${esc(nomeRef(sats[s].k))} · clique para ver as evidências</small>`; info.hidden = false; info.style.left = Math.min(W - 310, x + 16) + 'px'; info.style.top = Math.min(H - 80, y + 14) + 'px'; return; }
      const j = bV && dist < 5200 ? versoPerto(x, y, 12) : -1;
      if (j >= 0) { sobreLivro = null; formar(vChave[j]); canvas.style.cursor = 'pointer'; mostrarInfo(); return; }
      if (constel && !constel.soltoEm) soltar();
      const riH = regiaoNoPonto(x, y);
      if (riH >= 0) { revelar(riH, 2200); canvas.style.cursor = 'pointer'; sobreLivro = null; info.hidden = true; return; }
      let lv = bV && dist >= 1200 ? livroPerto(x, y) : null;
      if (livroOculto(lv)) lv = null; else if (lv && longeR() > 0.5) revelar(secoes.indexOf(lv.sec), 1500);
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
    if (duplo && modoTerra) { posicionarTerra(); modoTerra.ancora = latLonNaTela(x, y); modoTerra.cursor = { x, y }; modoTerra.altAlvo = modoTerra.altAlvo * 0.35; return; }
    if (duplo) { clearTimeout(cartaoT); const w = noPlano(x, y); if (w) { lembrarVista(); voo = { de: { x: alvo.x, y: alvo.y, d: dist }, para: { x: w.x, y: w.y, d: Math.max(DIST_MIN, dist * 0.35) }, t0: agora, dur: 700 }; } return; }
    const li = lugarPerto(x, y, tipo === 'touch' ? 20 : 11);
    if (li >= 0) { escolherLugar(atlasC.lugares[li], !modoTerra); return; }
    if (modoTerra) return;
    if (atlasC && camada('atlas').visivel && camada('atlas').opacidade > 0.2) { const pt = raioNoGlobo(x, y); if (pt) { entrarTerra(pt); modoTerra.alt = Math.min(modoTerra.alt, RAIO_GLOBO * 1.2); return; } }
    const bV = !modoTerra && camada('biblia').visivel && camada('biblia').opacidade > 0.1;
    const s = bV && dist < 1800 ? satPerto(x, y, tipo === 'touch' ? 22 : 12) : -1;
    if (s >= 0) { acoes.selecionar(sats[s].id, false, true); return; }
    const j = bV && dist < 5200 ? versoPerto(x, y, tipo === 'touch' ? 24 : 12) : -1;
    if (j >= 0) { formar(vChave[j]); clearTimeout(cartaoT); const kk = vChave[j]; if (tipo === 'touch') cartaoT = setTimeout(() => abrirCartao(kk), 330); else abrirCartao(kk); return; }
    const riC = regiaoNoPonto(x, y);
    if (riC >= 0) { if (tipo === 'touch' && (secRevelada !== riC || revela[riC] < 0.6)) { revelar(riC, 5000); return; } voar(secoes[riC].cx, secoes[riC].cy, secoes[riC].raio * 3.4); return; }
    let lv = bV ? livroPerto(x, y) : null; if (livroOculto(lv)) lv = null;
    if (lv && dist > 1500) { voar(lv.cx, lv.cy, lv.raio * 4.2); return; }
    const sec = camada('universo').visivel ? secoes.find((s2) => { const p = tela(s2.cx, s2.cy, 0); return p && Math.hypot(p.x - x, p.y - y) < 40; }) : null;
    if (sec) { voar(sec.cx, sec.cy, sec.raio * 3.4); return; }
    if (ceuR && camada('universo').visivel) { const f = ceuR.tocar(x, y, W, H, tipo === 'touch' ? 24 : 14); if (f) { mostrarFichaCeu(f); return; } }
    if (tipo === 'touch' && constel) soltar();
  }
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault(); voo = null; interagiu = true;
    if (modoTerra) { if (!transicao) { posicionarTerra(); modoTerra.ancora = latLonNaTela(e.offsetX, e.offsetY); } modoTerra.cursor = { x: e.offsetX, y: e.offsetY }; modoTerra.altAlvo = Math.min(RAIO_GLOBO * 3.6, Math.max(1.5, modoTerra.altAlvo * Math.exp(e.deltaY * 0.0014))); return; }
    if (e.deltaY < 0 && atlasC && camada('atlas').visivel) { const pt = raioNoGlobo(e.offsetX, e.offsetY); if (pt && camera.position.distanceTo(atlasC.centroMundo()) < RAIO_GLOBO * 3.2) { entrarTerra(pt); modoTerra.cursor = { x: e.offsetX, y: e.offsetY }; modoTerra.altAlvo *= Math.exp(e.deltaY * 0.0014); return; } }
    zoomEm(e.offsetX, e.offsetY, Math.exp(e.deltaY * 0.0016)); }, { passive: false });
  // pinça no modo terra: aproxima do chão
  const pincaTerra = (fator) => { if (modoTerra) { modoTerra.cursor = pinca ? { x: pinca.cx, y: pinca.cy } : null; if (modoTerra.cursor && !modoTerra.ancoraPinca) { posicionarTerra(); modoTerra.ancora = latLonNaTela(modoTerra.cursor.x, modoTerra.cursor.y); modoTerra.ancoraPinca = true; } modoTerra.altAlvo = Math.min(RAIO_GLOBO * 3.6, Math.max(1.5, modoTerra.altAlvo * fator)); return true; } return false; };
  ui.querySelector('.cu-controles').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cu]'); if (!b) return;
    const o = b.dataset.cu;
    if (o === 'mais') voar(alvo.x, alvo.y, dist * 0.5);
    else if (o === 'menos') voar(alvo.x, alvo.y, dist * 2);
    else if (o === 'geral') vistaGeral();
    else if (o === 'centro') centralizar(selecionado ? 'p:' + selecionado + '-' + selecionado : (estado.sel || estado.foco));
    else if (o === 'voltar') { const v = historico.pop(); if (v) { voo = { de: { x: alvo.x, y: alvo.y, d: dist }, para: { x: v.x, y: v.y, d: v.d }, t0: performance.now(), dur: 900 }; incl = v.i; } }
    else if (o === 'camadas') { painelCamadas.hidden = !painelCamadas.hidden; b.classList.toggle('ativo', !painelCamadas.hidden); }
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
  function mostrarFichaCeu(f) {
    invest.innerHTML = `<button class="cu-fechar-inv" type="button" aria-label="Fechar">×</button><small>Céu real · camada Universo</small><h3>${esc(f.titulo)}</h3>${f.html}${f.alvo ? '<div class="cu-chips" style="margin-top:8px"><button type="button" class="cu-apontar">🔭 Aproximar no telescópio</button><button type="button" class="cu-soltar">Voltar ao céu a olho nu</button></div>' : ''}`;
    invest.hidden = false; invest.querySelector('.cu-fechar-inv').onclick = () => { invest.hidden = true; };
    const ap = invest.querySelector('.cu-apontar'); if (ap) ap.onclick = () => { if (ceuR.apontar(f.alvo)) voar(alvo.x, alvo.y, Math.min(dist, 260)); };
    const so = invest.querySelector('.cu-soltar'); if (so) so.onclick = () => { ceuR.soltarMira(); vistaGeral(); };
  }
  // ── MODO TERRA ───────────────────────────────────────────────────────────────
  let modoTerra = null;   // { lat, lon, alt }
  function raioNoGlobo(x, y) {   // ponto do globo sob o cursor (ou null)
    if (!atlasC || !camada('atlas').visivel) return null;
    ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera);
    const esf = new THREE.Sphere(atlasC.centroMundo(), RAIO_GLOBO * 1.0036); const pt = new THREE.Vector3();   // altura do chão (terra em relevo), não do nível do mar
    return ray.ray.intersectSphere(esf, pt) ? pt : null;
  }
  let transicao = null;   // { pos, quat, t0 } — mistura suave entre o modo espaço e o modo Terra
  function guardarTransicao() { transicao = { pos: camera.position.clone(), quat: camera.quaternion.clone(), t0: performance.now() }; }
  function entrarTerra(ptMundo) {
    guardarTransicao();
    const c = atlasC.centroMundo(), sub = atlasC.latLonDe(camera.position.clone());   // começa olhando o ponto logo abaixo da câmera
    const alt = Math.max(20, camera.position.distanceTo(c) - RAIO_GLOBO);
    modoTerra = { lat: sub.lat, lon: sub.lon, alt, altAlvo: alt, cursor: null, vel: { lat: 0, lon: 0 }, ancora: ptMundo ? atlasC.latLonDe(ptMundo) : null };   // o ponto da Terra que estava sob o cursor
    voo = null; inercia.set(0, 0); interagiu = true;
  }
  function sairTerra() {
    if (!modoTerra) return; guardarTransicao();
    const c = atlasC.centroMundo(); modoTerra = null;
    alvo.set(c.x, c.y, zB); dist = Math.min(DIST_MAX, Math.max(RAIO_GLOBO * 3.6, camera.position.distanceTo(c))); incl = Math.min(incl, 0.5); posicionar();
  }
  function latLonNaTela(x, y) { const pt = raioNoGlobo(x, y); return pt ? atlasC.latLonDe(pt) : null; }
  const difLon = (a, b) => { let d = a - b; while (d > 180) d -= 360; while (d < -180) d += 360; return d; };
  // gira o centro da vista pela mesma rotação que leva o ponto 'de' até o ponto 'para' (exato na esfera)
  const vLL = (ll) => { const la = ll.lat * Math.PI / 180, lo = ll.lon * Math.PI / 180; return new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)); };
  function girarCentro(de, para) {   // o ponto que está sob o cursor ('de') volta para onde estava ('para')
    const m = modoTerra, r = new THREE.Quaternion().setFromUnitVectors(vLL(de), vLL(para));
    const cn = vLL(m).applyQuaternion(r);
    m.lat = Math.asin(Math.max(-1, Math.min(1, cn.z))) * 180 / Math.PI; m.lon = Math.atan2(cn.y, cn.x) * 180 / Math.PI;
  }
  function arrastarTerra(x, y) {
    const m = modoTerra, ag = m.agarrado;
    if (ag) { posicionarTerra(); const q = latLonNaTela(x, y); if (q) { const l0 = m.lat, n0 = m.lon; girarCentro(q, ag); m.vel = { lat: m.lat - l0, lon: difLon(m.lon, n0) }; posicionarTerra(); return; } }
    const k = Math.max(m.alt, 2) / RAIO_GLOBO * 57.3 * 0.0021 * (900 / Math.max(H, 300)), dx = x - arrasto.x, dy = y - arrasto.y;
    m.lat += dy * k; m.lon -= dx * k / Math.max(0.2, Math.cos(m.lat * Math.PI / 180));
  }
  // a cada quadro: aproximação suave mantendo o ponto do cursor no lugar; inércia do arrasto; saída para o espaço
  function animarTerra() {
    const m = modoTerra;
    if (Math.abs(m.altAlvo - m.alt) > m.alt * 0.002) {
      posicionarTerra();   // mede com a câmera exata deste quadro (antes e depois)
      const antes = m.cursor ? (m.ancora || latLonNaTela(m.cursor.x, m.cursor.y)) : null;
      m.alt += (m.altAlvo - m.alt) * 0.2; posicionarTerra();
      if (antes) for (let it = 0; it < 3; it++) { const depois = latLonNaTela(m.cursor.x, m.cursor.y); if (!depois) break; girarCentro(depois, antes); posicionarTerra(); }   // 3 passos: o ponto do cursor fica cravado
    }
    if (!arrasto && m.vel && (Math.abs(m.vel.lat) + Math.abs(m.vel.lon) > 1e-5)) { m.lat += m.vel.lat; m.lon += m.vel.lon; m.vel.lat *= 0.9; m.vel.lon *= 0.9; }
    if (m.altAlvo > RAIO_GLOBO * 3.3 && m.alt > RAIO_GLOBO * 3.1) { sairTerra(); return false; }
    return true;
  }
  function posicionarTerra() {
    const m = modoTerra; m.lat = Math.max(-85, Math.min(85, m.lat)); m.lon = ((m.lon + 540) % 360) - 180;
    m.alt = Math.max(1.5, m.alt);
    const c = atlasC.centroMundo(), d = atlasC.direcao(m.lat, m.lon), dn = atlasC.direcao(Math.min(89.9, m.lat + 0.5), m.lon);
    const norte = dn.sub(d.clone().multiplyScalar(dn.dot(d))).normalize();
    const sup = c.clone().addScaledVector(d, RAIO_GLOBO * 1.0035);
    // perto do chão a câmera inclina um pouco (como olhar o horizonte); longe, olha de cima
    const inc = Math.max(0, Math.min(0.75, (Math.log10(RAIO_GLOBO * 0.15) - Math.log10(Math.max(m.alt, 1))) * 0.42));   // longe: de cima; perto do chão: olhando o horizonte
    const pos = sup.clone().addScaledVector(d, m.alt * Math.cos(inc)).addScaledVector(norte, -m.alt * Math.sin(inc));
    camera.position.copy(pos); camera.up.copy(norte.clone().multiplyScalar(Math.cos(inc)).addScaledVector(d, Math.sin(inc))); camera.lookAt(sup);
    camera.near = Math.max(0.05, m.alt * 0.01); camera.far = camera.position.distanceTo(c) * 6 + 80000; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);   // a medida sob o cursor usa a câmera deste instante
  }
  function vistaGeral() { if (modoTerra) sairTerra(); if (!secoes.length) return; const c = caixaGeral(); voar(c.x, c.y, c.d); incl = 0; }
  function centralizar(id) {
    const q = lerId(id);
    if (q && vIdx.has(q.ini)) { const j = vIdx.get(q.ini); voar(vBase[j * 3], vBase[j * 3 + 1], Math.min(dist, 260)); return; }
    const s = sats.find((x) => x.id === id); if (s) voar(s.x, s.y, Math.min(dist, 140));
  }

  // ── CAMADA ATLAS + composição de assuntos nas três camadas ──────────────────────────────
  let atlasC = null, lugarAtivo = null, realceLugar = new Set(), realceLivro = new Set(), livroAtivo = null, secAtiva = null, fios = [];
  const chipLugar = ui.querySelector('.cu-lugar'), invest = ui.querySelector('.cu-invest');
  async function montarAtlas() {
    try {
      const d = await (await fetch('/nexus/atlas-dados.json')).json();
      const { criarGloboAtlas } = await import('/nexus/atlas-globo.js?v=3');
      const x0 = Math.min(...secoes.map((q) => q.cx - q.raio)), x1 = Math.max(...secoes.map((q) => q.cx + q.raio));
      const y0 = Math.min(...secoes.map((q) => q.cy - q.raio)), y1 = Math.max(...secoes.map((q) => q.cy + q.raio));
      RAIO_GLOBO = Math.round((y1 - y0) * 0.22);
      atlasC = criarGloboAtlas(THREE, d, { raio: RAIO_GLOBO });
      atlasC.grupo.position.set((x0 + x1) / 2, (y0 + y1) / 2, RAIO_GLOBO * 1.15);   // a Terra no meio do universo, acima das galáxias
      GA.add(atlasC.grupo); precisaOpac = true;
    } catch (e) { console.warn('Atlas indisponível:', e); }
  }
  let RAIO_GLOBO = 2000;
  // posição na tela de um lugar do globo (null se estiver do outro lado)
  const lugarPos = (l) => atlasC.posMundo(l);
  function telaLugarV(l) { if (!atlasC.deFrente(l, camera.position)) return null; const w = lugarPos(l); tmp.copy(w).project(camera); if (tmp.z > 1) return null; return { x: (tmp.x + 1) / 2 * W, y: (1 - tmp.y) / 2 * H }; }
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  function limparComposicao() {
    lugarAtivo = null; realceLugar = new Set(); realceLivro = new Set(); livroAtivo = null; secAtiva = null; fios = [];
    chipLugar.hidden = true; invest.hidden = true;
    if (atlasC) { atlasC.acender([]); atlasC.definirRota(null); }
  }
  function enquadrarXY(xs, ys, inclinar) {
    const ext = Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * (W / H), 400);
    if (inclinar != null) incl = inclinar;
    voar((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2 - ext * 0.08, Math.min(DIST_MAX, ext / (2 * Math.tan(camera.fov * Math.PI / 360) * (W / H)) * 1.3));
  }
  // lugar escolhido (no Atlas ou na busca) -> versículos acesos na camada Bíblia, com fios de luz entre as camadas
  function escolherLugar(l, enquadrar = true) {
    limparComposicao();
    if (!l) return;
    lugarAtivo = l;
    for (const k of l.versos) { const j = vIdx.get(k); if (j != null) realceLugar.add(j); }
    if (atlasC) atlasC.acender([l.i]);
    const js = [...realceLugar], passo = Math.max(1, Math.floor(js.length / 140));
    fios = js.filter((_, i) => i % passo === 0).map((j) => ({ l: l.i, j }));
    const livrosLugar = new Set(l.versos.map((k) => decompor(k).b));
    chipLugar.innerHTML = `📍 ${esc(l.nome)} · ${realceLugar.size} versículo(s) acesos em ${livrosLugar.size} livro(s) <button type="button" aria-label="Apagar">×</button>`;
    chipLugar.hidden = false;
    chipLugar.querySelector('button').onclick = () => limparComposicao();
    if (enquadrar && js.length) { const c = atlasC.centroMundo(); enquadrarXY(js.map((j) => vBase[j * 3]).concat([c.x]), js.map((j) => vBase[j * 3 + 1]).concat([c.y])); }
  }
  // versículo sob o mouse -> lugares citados acendem no Atlas
  function lugaresDoVerso(k) {
    if (!atlasC || livroAtivo != null || lugarAtivo) return;
    const ids = atlasC.porVerso.get(k) || [];
    atlasC.acender(ids);
    const j = vIdx.get(k); fios = ids.map((i) => ({ l: i, j }));
  }
  // ASSUNTO = LIVRO: as três camadas se reúnem (região no Universo, livro na Bíblia, lugares e sequência no Atlas)
  function comporLivro(i) {
    limparComposicao();
    const lv = livros[i]; if (!lv) return;
    livroAtivo = i; secAtiva = SECOES.findIndex((q) => i >= q.de && i <= q.ate);
    const ini = vIdx.get(chave(lv.num, 1, 1));
    for (let j = ini; j < ini + lv.versos; j++) realceLivro.add(j);
    const cont = new Map();
    if (atlasC) for (let j = ini; j < ini + lv.versos; j++) for (const li of atlasC.porVerso.get(vChave[j]) || []) { const c = cont.get(li) || { n: 0, j }; c.n++; cont.set(li, c); }
    const ordem = [...cont.entries()].sort((a, b) => b[1].n - a[1].n);
    if (atlasC) {
      atlasC.acender(ordem.map(([li]) => li));
      const seq = [...cont.entries()].filter(([li]) => atlasC.lugares[li].conf >= 300).sort((a, b) => a[1].j - b[1].j).slice(0, 32).map(([li]) => li);
      atlasC.definirRota(seq);
      fios = ordem.slice(0, 60).map(([li, c]) => ({ l: li, j: c.j }));
    }
    const caps = new Map(); for (const [li, c] of cont) { const cc = decompor(vChave[c.j]).c; caps.set(cc, (caps.get(cc) || 0) + 1); }
    const capsTop = [...caps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    invest.innerHTML = `<button class="cu-fechar-inv" type="button" aria-label="Fechar">×</button><small>Investigação nas três camadas</small><h3>${esc(lv.nome)}</h3>
      <h5>Universo</h5><div>Região: <b>${esc(lv.sec.nome)}</b></div>
      <h5>Bíblia</h5><div>${lv.caps} capítulos · ${lv.versos} versículos acesos</div>
      <div class="cu-chips">${capsTop.map(([cc, n]) => `<button type="button" data-cap="${cc}">${esc(lv.abbrev.toUpperCase())} ${cc} · ${n} lugar(es)</button>`).join('')}</div>
      <h5>Atlas</h5><div>${cont.size} lugar(es) citado(s) no livro</div>
      <div class="cu-chips">${ordem.slice(0, 14).map(([li, c]) => `<button type="button" data-lugar="${li}">${esc(atlasC.lugares[li].nome)} · ${c.n}</button>`).join('')}</div>
      <p><small>A linha tracejada no Atlas liga os lugares na ordem em que o texto os cita pela primeira vez: não é a rota histórica.</small></p>
      <h5>Ainda não disponível</h5><small>Personagens e acontecimentos por versículo ainda não existem como dado no NEXUS.</small>
      <p><small>Fontes: Almeida (texto), OpenBible.info (lugares, CC BY 4.0), Natural Earth (mapa).</small></p>`;
    invest.hidden = false;
    invest.querySelector('.cu-fechar-inv').onclick = () => limparComposicao();
    invest.querySelectorAll('[data-lugar]').forEach((b) => { b.onclick = () => { const l = atlasC.lugares[+b.dataset.lugar]; escolherLugar(l); }; });
    invest.querySelectorAll('[data-cap]').forEach((b) => { b.onclick = () => { const c = lv.capPos[+b.dataset.cap - 1]; if (c) voar(c.x, c.y, 200); }; });
    // enquadra o livro e os lugares juntos, em perspectiva, com as folhas afastadas
    const pts = ordem.slice(0, 20).map(([li]) => atlasC.lugares[li]);
    separacao = Math.max(separacao, 1.6); sincronizarPainel();
    { const c = atlasC.centroMundo(); enquadrarXY([lv.cx - lv.raio, lv.cx + lv.raio, c.x - RAIO_GLOBO, c.x + RAIO_GLOBO], [lv.cy - lv.raio, lv.cy + lv.raio, c.y - RAIO_GLOBO, c.y + RAIO_GLOBO], 0.78); }
  }
  function comporSecao(si) {
    limparComposicao(); secAtiva = si; const q = secoes[si];
    for (let i = q.de; i <= q.ate; i++) { const lv = livros[i], ini = vIdx.get(chave(lv.num, 1, 1)); for (let j = ini; j < ini + lv.versos; j++) realceLivro.add(j); }
    voar(q.cx, q.cy, q.raio * 3.4);
  }
  function buscar(texto) {
    const q = norm(texto); if (!q) return false;
    const iL = livros.findIndex((lv) => norm(lv.nome) === q || norm(lv.abbrev) === q);
    const iL2 = iL >= 0 ? iL : livros.findIndex((lv) => q.length >= 3 && norm(lv.nome).startsWith(q));
    if (iL2 >= 0) { comporLivro(iL2); return true; }
    if (atlasC) { const cand = atlasC.lugares.filter((l) => norm(l.nome) === q || norm(l.en) === q).sort((a, b) => b.peso - a.peso); if (cand.length) { escolherLugar(cand[0]); return true; } }
    const si = SECOES.findIndex((x) => norm(x.nome).includes(q));
    if (si >= 0) { comporSecao(si); return true; }
    chipLugar.innerHTML = `Não encontrei “${esc(texto)}” nas camadas (livro, lugar ou seção). <button type="button" aria-label="Fechar">×</button>`; chipLugar.hidden = false;
    chipLugar.querySelector('button').onclick = () => { chipLugar.hidden = true; };
    return false;
  }
  const relogio = ui.querySelector('.cu-relogio');
  function atualizarRelogio() {
    if (!ceuR) return; const e = ceuR.estado(), d = new Date(Date.now() + e.desloc);
    const fmt = d.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    const lua = e.luaFracao ? `Lua ${Math.round(e.luaFracao * 100)}% iluminada${e.luaAlt > 0 ? '' : ' (abaixo do horizonte)'}` : '';
    const dia = e.solAlt > 0 ? ' · é dia: o céu azul apaga as estrelas (arraste a barra para a noite)' : e.solAlt > -18 ? ' · crepúsculo' : '';
    relogio.querySelector('.cu-hora').innerHTML = `${e.desloc ? '🕒 ' : '🔴 Ao vivo · '}${fmt} · ${esc(e.local)}<small>${lua}${dia}</small>`;
  }
  relogio.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tempo]'); if (!b || !ceuR) return;
    const v = b.dataset.tempo; let ms = ceuR.desloc();
    if (v === 'agora') ms = 0;
    else if (v === 'local') { if (navigator.geolocation) navigator.geolocation.getCurrentPosition((p) => { ceuR.local(p.coords.latitude, p.coords.longitude, 'sua localização'); atualizarRelogio(); }, () => {}, { maximumAge: 600000, timeout: 8000 }); return; }
    else ms += (+v) * 60000;
    relogio.querySelector('[data-tempo="barra"]').value = Math.round(ms / 60000); ceuR.tempo(ms); atualizarRelogio();
  });
  relogio.querySelector('[data-tempo="barra"]').addEventListener('input', (e) => { if (ceuR) { ceuR.tempo((+e.target.value) * 60000); atualizarRelogio(); } });
  setInterval(atualizarRelogio, 20000);
  ui.querySelector('.cu-busca').addEventListener('submit', (e) => { e.preventDefault(); buscar(e.target.querySelector('input').value); interagiu = true; });
  // lugar sob o ponteiro (camada Atlas, por cima)
  function lugarPerto(px, py, raio) {
    if (!atlasC || !camada('atlas').visivel || camada('atlas').opacidade < 0.08) return -1;
    let m = -1, dm = raio * raio;
    // vários lugares juntos (de longe): fica o mais citado entre os que estão sob o ponteiro
    let pm = Infinity; const pesoConta = !modoTerra || modoTerra.alt > RAIO_GLOBO * 0.15; for (const l of atlasC.lugares) { const p = telaLugarV(l); if (!p) continue; const d = (p.x - px) ** 2 + (p.y - py) ** 2; const sc = pesoConta ? d / (1 + Math.log2(1 + l.peso)) : (d + 4) * (1 + 2 / (1 + Math.log2(1 + l.peso))); if (d < dm && sc < pm) { pm = sc; m = l.i; } }
    return m;
  }
  // painel das camadas (gerado a partir de CAMADAS: uma camada nova aparece aqui sozinha)
  const painelCamadas = ui.querySelector('.cu-camadas');
  function montarPainel() {
    painelCamadas.innerHTML = '<h4>Camadas</h4>' + CAMADAS.slice().reverse().map((c) => c.reservada ? `<div class="cu-camada cu-reservada" title="Camada reservada: será construída em seguida"><input type="checkbox" disabled aria-label="${esc(c.nome)} (em construção)"><label><i style="background:${c.cor}"></i>${esc(c.nome)}</label><small>em construção</small></div>` : `<div class="cu-camada"><input type="checkbox" data-vis="${c.id}" ${c.visivel ? 'checked' : ''} aria-label="Mostrar ${esc(c.nome)}"><label><i style="background:${c.cor}"></i>${esc(c.nome)}</label><input type="range" min="0" max="100" value="${Math.round(c.opacidade * 100)}" data-op="${c.id}" aria-label="Opacidade de ${esc(c.nome)}"></div>`).join('') +
      `<div class="cu-sep">Separação das folhas<input type="range" min="0" max="300" value="${Math.round(separacao * 100)}" data-sep="1" aria-label="Separação entre as camadas"></div>`;
  }
  function sincronizarPainel() { const r = painelCamadas.querySelector('[data-sep]'); if (r) r.value = Math.round(separacao * 100); }
  painelCamadas.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.vis) camada(t.dataset.vis).visivel = t.checked;
    if (t.dataset.op) camada(t.dataset.op).opacidade = +t.value / 100;
    if (t.dataset.sep) separacao = +t.value / 100;
  });
  montarPainel();
  if (matchMedia('(max-width: 760px)').matches) painelCamadas.hidden = true;
  // fios de luz entre as camadas (lugar no Atlas -> versículo na Bíblia)
  const MAX_FIOS = 160;
  const gFio = new THREE.BufferGeometry();
  gFio.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_FIOS * 6), 3).setUsage(THREE.DynamicDrawUsage));
  gFio.setAttribute('alfa', new THREE.BufferAttribute(new Float32Array(MAX_FIOS * 2), 1).setUsage(THREE.DynamicDrawUsage));
  const fiosObj = new THREE.LineSegments(gFio, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: { tempo: { value: 0 } },
    vertexShader: 'attribute float alfa; varying float a; varying float h; void main(){ a = alfa; h = position.z; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying float a; varying float h; void main(){ gl_FragColor = vec4(vec3(1.0, 0.86, 0.5) * a, a); }' }));
  fiosObj.frustumCulled = false; fiosObj.renderOrder = 25; cena.add(fiosObj);
  function atualizarFios(t) {
    const pa = gFio.attributes.position, al = gFio.attributes.alfa; let n = 0;
    const mostrar = atlasC && camada('atlas').visivel && camada('biblia').visivel;
    if (mostrar) {
      for (const f of fios) {
        if (n >= MAX_FIOS) break; const l = atlasC.lugares[f.l]; if (!l || f.j == null) continue;
        const w = lugarPos(l); pa.setXYZ(n * 2, w.x, w.y, w.z); pa.setXYZ(n * 2 + 1, vPos[f.j * 3], vPos[f.j * 3 + 1], zB);
        const a = 0.5 * Math.min(camada('atlas').opacidade + 0.3, 1) * (0.75 + 0.25 * Math.sin(t / 300 + n));
        al.setX(n * 2, a); al.setX(n * 2 + 1, a * 0.55); n++;
      }
    }
    for (let i = n; i < MAX_FIOS; i++) { al.setX(i * 2, 0); al.setX(i * 2 + 1, 0); }
    pa.needsUpdate = al.needsUpdate = true;
  }
  // aplica visibilidade, altura e opacidade de cada camada (chamado a cada quadro)
  function aplicarCamadas() {
    espaco = 1800 * separacao;   // altura fixa entre as folhas (o globo e as galáxias não andam quando se dá zoom)
    CAMADAS.forEach((c, i) => {
      c.z = i * espaco; c.grupo.position.z = c.z;
      const vis = c.visivel && c.opacidade > 0.01;
      const criada = !c.criar || c.criada;
      if (vis && !criada) garantirCriada(c);
      c.grupo.visible = vis && criada;
    });
    zB = camada('biblia').z; zA = camada('atlas').z;
    for (const c of CAMADAS) {
      if (!c.grupo.visible) continue;                                     // desligada: custo zero
      if (c.propria) { if (c.id === 'atlas' && atlasC) atlasC.opacidade(c.opacidade); continue; }
      if (!c.animada && !c._sujo && c._op === c.opacidade) continue;       // nada mudou
      c._op = c.opacidade; c._sujo = false;
      c.grupo.traverse((o) => { const m = o.material; if (!m) return; if (m.isShaderMaterial) { if (!m.uniforms.opac) m.uniforms.opac = { value: 1 }; m.uniforms.opac.value = c.opacidade; } else { if (m.userData.base == null) m.userData.base = m.opacity; m.transparent = true; m.opacity = m.userData.base * c.opacidade; } });
    }
    if (precisaOpac) { precisaOpac = false; cena.traverse((o) => { const m = o.material; if (m && m.isShaderMaterial && !m.uniforms.opac) m.uniforms.opac = { value: 1 }; }); }
  }
  // orçamento de quadro: resolução interna adaptativa
  let somaMs = 0, nQ = 0, resAtual = escala;
  function orcamento(dt) {
    somaMs += dt; nQ++;
    if (nQ < 90) return;
    const media = somaMs / nQ; somaMs = 0; nQ = 0;
    if (media > 22 && resAtual > 1) { resAtual = Math.max(1, resAtual - 0.25); renderer.setPixelRatio(resAtual); ajustar(); }
    else if (media < 14 && resAtual < escala) { resAtual = Math.min(escala, resAtual + 0.25); renderer.setPixelRatio(resAtual); ajustar(); }
  }

  // ── rótulos em camadas (conforme o zoom e o espaço) ─────────────────────────────
  const nivelEl = ui.querySelector('.cu-nivel');
  function rotulos(t) {
    g2.setTransform(escala, 0, 0, escala, 0, 0); g2.clearRect(0, 0, W, H);
    const ocup = [];
    const cabe = (b) => !ocup.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
    // LEITURA: de bem perto, o capítulo inteiro aparece num painel (a Bíblia toda pode ser lida no universo); os rótulos desviam dele
    const vU = !modoTerra && camada('universo').visivel && camada('universo').opacidade > 0.1, vB = !modoTerra && camada('biblia').visivel && camada('biblia').opacidade > 0.1;   // perto da Terra, só a Terra fala   // rótulos seguem a camada
    const caixaLeitura = vB ? leitura(t) : null; if (caixaLeitura) ocup.push(caixaLeitura);
    const texto = (txt, x, y, fonte, cor, fundo, alfa = 1, centro = true) => {
      g2.font = fonte; const w = g2.measureText(txt).width; const x0 = centro ? x - w / 2 : x;
      const tam = parseFloat(fonte.split('px')[0].split(' ').pop()) || 12, alt = tam + 9;
      const b = { x0: x0 - 7, x1: x0 + w + 7, y0: y - alt / 2, y1: y + alt / 2 }; if (!cabe(b)) return false; ocup.push(b);
      g2.globalAlpha = alfa;
      g2.fillStyle = fundo || 'rgba(2,5,14,.62)'; g2.beginPath(); if (g2.roundRect) g2.roundRect(b.x0, b.y0, b.x1 - b.x0, alt, alt / 2); else g2.rect(b.x0, b.y0, b.x1 - b.x0, alt); g2.fill();
      g2.textAlign = 'left'; g2.textBaseline = 'middle';
      g2.lineWidth = 3; g2.strokeStyle = 'rgba(0,0,0,.85)'; g2.lineJoin = 'round'; g2.strokeText(txt, x0, y);
      g2.fillStyle = cor; g2.fillText(txt, x0, y); g2.globalAlpha = 1; return b;
    };
    // destaques primeiro: a constelação ativa
    if (constel && vB) {
      const fade = constel.soltoEm ? Math.max(0, 1 - (t - constel.soltoEm) / 2600) : 1;
      const p0 = tela(vPos[constel.idx * 3], vPos[constel.idx * 3 + 1]);
      if (p0) texto(nomeRef(constel.origem), p0.x + 10, p0.y - 12, '700 14px Inter, system-ui, sans-serif', '#FFF6DC', 'rgba(2,5,14,.78)', fade, false);
      constel.alvos.forEach((a) => { if (t < a.inicio + 300) return; const p = tela(vPos[a.idx * 3], vPos[a.idx * 3 + 1]); if (p && p.x > 0 && p.x < W && p.y > 0 && p.y < H) texto(nomeRef(a.k), p.x + 8, p.y, '600 13px Inter, system-ui, sans-serif', '#FFE8B0', null, fade, false); });
    }
    if (vB && realceLugar.size && dist < 6000) { let nL = 0; for (const j of realceLugar) { if (nL >= 28) break; const p = tela(vPos[j * 3], vPos[j * 3 + 1]); if (p && p.x > 0 && p.x < W && p.y > 0 && p.y < H && texto(nomeRef(vChave[j]), p.x + 8, p.y, '600 12.5px Inter, system-ui, sans-serif', '#FFE8B0', 'rgba(40,28,6,.75)', 1, false)) nL++; } }
    if (atlasC && camada('atlas').visivel && camada('atlas').opacidade > 0.15) {
      const aces = atlasC.acesos();
      const fontL = '700 13px "Cormorant Garamond", Georgia, serif';
      let nA = 0; for (const li of aces) { if (nA >= 26) break; const l = atlasC.lugares[li]; const p = telaLugarV(l); if (p && p.x > 0 && p.x < W && p.y > 0 && p.y < H && texto(l.nome, p.x + 8, p.y, fontL, '#FFF0C8', 'rgba(40,28,6,.8)', 1, false)) nA++; }
      if (!aces.size && (modoTerra || dist < 16000)) { if (!ordemLug) ordemLug = atlasC.lugares.slice().sort((a, b) => b.peso - a.peso); let nB = 0; const lim = modoTerra ? Math.round(10 + 3 * RAIO_GLOBO / Math.max(modoTerra.alt, 1)) : Math.round(8 + 60000 / dist); for (const l of ordemLug) { if (nB >= Math.min(lim, 40)) break; const p = telaLugarV(l); if (p && p.x > 0 && p.x < W && p.y > 0 && p.y < H && texto(l.nome, p.x + 7, p.y, '600 12px "Cormorant Garamond", Georgia, serif', '#FFE3A3', 'rgba(20,14,2,.6)', 0.9 * Math.min(1, camada('atlas').opacidade + 0.2), false)) nB++; } }
    }
    // satélites (com PIN) quando perto
    const kAtivo = constel && !constel.soltoEm ? constel.origem : selecionado;
    let nSat = 0;
    if (vB && dist < 900) sats.forEach((s) => { if (nSat >= 36 || (s.k !== kAtivo && dist > 260)) return; const p = tela(s.x, s.y, zB + 1); if (p && p.x > 0 && p.x < W && p.y > 0 && p.y < H) { nSat++; const r = String(s.rotulo); texto(r.length > 30 ? r.slice(0, 28) + '…' : r, p.x + 9, p.y, '600 12.5px Inter, system-ui, sans-serif', '#DDF7F3', null, 1, false); } });
    if (vU && ceuR) ceuR.rotulos((txt, x, y, forte) => { if (x > 0 && x < W && y > 0 && y < H) texto(txt, x, y, forte ? '600 12.5px Inter, system-ui, sans-serif' : '500 11.5px Inter, system-ui, sans-serif', forte ? '#FFF6DC' : 'rgba(235,238,248,.85)', 'rgba(2,5,14,.55)', 0.95, false); }, W, H);
    let nivel;
    if (dist > 9000) {   // REGIÕES
      nivel = 'Universo · regiões do cânon';
      const a = Math.min(1, (dist - 9000) / 4000) * 0.55 + 0.25;
      caixasRegiao = [];
      if (vU) secoes.forEach((s, si) => { const p = tela(s.cx, s.cy - s.raio * 0.95, 0); if (!p) return; const bx = texto(s.nome.toUpperCase(), p.x, p.y, '700 19px "Cormorant Garamond", Georgia, serif', secRevelada === si ? '#FFF4D0' : '#FFE8B0', secRevelada === si ? 'rgba(60,44,10,.75)' : 'rgba(2,5,14,.55)', secRevelada === si ? 1 : a); if (bx) caixasRegiao.push({ ...bx, i: si }); });
      if (vB) livros.forEach((lv) => { const rv = revela[secoes.indexOf(lv.sec)]; if (rv < 0.25) return; const p = tela(lv.cx, lv.cy); if (p) texto(lv.nome, p.x, p.y + 4, '600 12.5px Inter, system-ui, sans-serif', '#F7F2E0', 'rgba(2,5,14,.6)', Math.min(1, (rv - 0.25) / 0.6)); });
    } else if (dist > 2200) {   // GALÁXIAS (livros)
      nivel = 'Galáxias · livros';
      if (vB) livros.forEach((lv) => { const p = tela(lv.cx, lv.cy - lv.raio * 1.05); if (p && p.x > -80 && p.x < W + 80 && p.y > -30 && p.y < H + 30) texto(lv.nome, p.x, p.y, '700 17px "Cormorant Garamond", Georgia, serif', '#FFE8B0', 'rgba(2,5,14,.7)', 1); });
      if (vU) secoes.forEach((s) => { const p = tela(s.cx, s.cy - s.raio * 1.05, 0); if (p) texto(s.nome.toUpperCase(), p.x, p.y, '700 14px "Cormorant Garamond", Georgia, serif', '#E9D6A6', 'rgba(2,5,14,.5)', 0.9); });
    } else if (dist > 520) {   // CONSTELAÇÕES (capítulos)
      nivel = 'Constelações · capítulos';
      let n = 0;
      for (const lv of livros) {
        if (!vB || Math.hypot(lv.cx - alvo.x, lv.cy - alvo.y) > dist * 1.6 + lv.raio) continue;
        const p = tela(lv.cx, lv.cy - lv.raio * 1.05); if (p) texto(lv.nome, p.x, p.y, '700 17px "Cormorant Garamond", Georgia, serif', '#FFE8B0', 'rgba(2,5,14,.7)', 1);
        for (const c of lv.capPos) { if (n > 90) break; const q = tela(c.x, c.y); if (q && q.x > 0 && q.x < W && q.y > 0 && q.y < H && texto(lv.abbrev.toUpperCase() + ' ' + c.c, q.x, q.y - 16, '600 12.5px Inter, system-ui, sans-serif', '#FFFFFF', null, 1)) n++; }
      }
    } else {   // ESTRELAS (versículos)
      nivel = 'Estrelas · versículos';
      let n = 0;
      for (const lv of livros) {
        if (!vB || Math.hypot(lv.cx - alvo.x, lv.cy - alvo.y) > dist * 2 + lv.raio) continue;
        const inicio = vIdx.get(chave(lv.num, 1, 1));
        for (let j = inicio; j < inicio + lv.versos && n < 70; j++) {
          const p = tela(vPos[j * 3], vPos[j * 3 + 1]); if (!p || p.x < 0 || p.x > W || p.y < 0 || p.y > H) continue;
          const d = decompor(vChave[j]); const tv = dist < 300 ? textoDe(vChave[j]) : '';
          const rotuloV = `${lv.abbrev.toUpperCase()} ${d.c}:${d.v}` + (tv ? '  ' + (tv.length > 46 ? tv.slice(0, 44) + '…' : tv) : '');
          if (texto(rotuloV, p.x + 8, p.y, '600 12.5px Inter, system-ui, sans-serif', '#FFFFFF', null, 1, false)) n++;
        }
      }
    }
    // a passagem em foco: farol discreto
    const qf = lerId(estado.foco);
    if (vB && qf && vIdx.has(qf.ini)) {
      const j = vIdx.get(qf.ini), p = tela(vPos[j * 3], vPos[j * 3 + 1]);
      if (p) { const pulso = 9 + Math.sin(t / 380) * 3; g2.strokeStyle = 'rgba(242,214,140,.75)'; g2.lineWidth = 1.2; g2.beginPath(); g2.arc(p.x, p.y, pulso, 0, 6.29); g2.stroke(); if (dist > 520) texto(nomeRef(qf.ini), p.x + 14, p.y - 10, '700 13px Inter, system-ui, sans-serif', '#FFE8B0', 'rgba(2,5,14,.78)', 1, false); }
    }
    if (modoTerra) nivel = 'Terra · ' + (modoTerra.alt > RAIO_GLOBO * 0.6 ? 'o globo' : modoTerra.alt > RAIO_GLOBO * 0.05 ? 'regiões' : 'cidades e lugares');
    if (nivelEl.textContent !== nivel) nivelEl.textContent = nivel;
  }

  // ── leitura do capítulo (perto) ───────────────────────────────────────────────
  function quebrar(txt, largura) { const out = []; let linha = ''; for (const p of String(txt).split(' ')) { const t2 = linha ? linha + ' ' + p : p; if (g2.measureText(t2).width > largura && linha) { out.push(linha); linha = p; } else linha = t2; } if (linha) out.push(linha); return out; }
  function leitura(t) {
    if (dist > 230 || !BIB) { leituraCap = null; return null; }
    let melhor = null, dm = Infinity;
    for (const lv of livros) { if (Math.hypot(lv.cx - alvo.x, lv.cy - alvo.y) > lv.raio + dist * 2) continue; for (const c of lv.capPos) { const d = Math.hypot(c.x - alvo.x, c.y - alvo.y); if (d < dm) { dm = d; melhor = { lv, c }; } } }
    if (!melhor || dm > 80 + dist) { leituraCap = null; return null; }
    const { lv, c } = melhor; leituraCap = { b: lv.num, c: c.c };
    const versos = BIB[lv.i].chapters[c.c - 1];
    const larg = Math.min(380, W * 0.36), x0 = W - larg - 18 - (painelCamadas.hidden ? 0 : 252), y0 = 46, maxY = H - 50;
    const kDest = constel && !constel.soltoEm ? constel.origem : selecionado;
    const dDest = kDest ? decompor(kDest) : null;
    const noCap = dDest && dDest.b === lv.num && dDest.c === c.c;
    let inicio = noCap ? Math.max(0, dDest.v - 4) : 0;
    g2.save();
    g2.fillStyle = 'rgba(3,6,16,.97)'; g2.strokeStyle = 'rgba(233,210,150,.35)'; g2.lineWidth = 1;
    g2.beginPath(); if (g2.roundRect) g2.roundRect(x0 - 14, y0 - 12, larg + 28, maxY - y0 + 24, 14); else g2.rect(x0 - 14, y0 - 12, larg + 28, maxY - y0 + 24); g2.fill(); g2.stroke();
    g2.textAlign = 'left'; g2.textBaseline = 'top';
    g2.font = '700 20px "Cormorant Garamond", Georgia, serif'; g2.fillStyle = '#FFE8B0'; g2.fillText(lv.nome + ' ' + c.c, x0, y0);
    g2.font = '12px Inter, system-ui, sans-serif'; g2.fillStyle = 'rgba(210,218,236,.85)'; g2.fillText(versos.length + ' versículos · Almeida · passe o mouse nas estrelas', x0, y0 + 26);
    let y = y0 + 50;
    for (let v = inicio; v < versos.length && y < maxY - 18; v++) {
      const dest = noCap && dDest.v === v + 1;
      g2.font = (dest ? '600 ' : '') + '15px "Cormorant Garamond", Georgia, serif';
      const linhas = quebrar(versos[v], larg - 26);
      if (dest) { g2.fillStyle = 'rgba(233,200,120,.18)'; g2.fillRect(x0 - 6, y - 3, larg + 12, linhas.length * 19 + 6); }
      g2.font = '700 11px Inter, system-ui, sans-serif'; g2.fillStyle = dest ? '#FFE8B0' : '#9FB7E8'; g2.fillText(String(v + 1), x0, y + 3);
      g2.font = (dest ? '600 ' : '') + '15px "Cormorant Garamond", Georgia, serif'; g2.fillStyle = dest ? '#FFF6DC' : '#EEF1FA';
      for (const l of linhas) { if (y > maxY - 18) break; g2.fillText(l, x0 + 24, y); y += 19; }
      y += 5;
    }
    g2.restore();
    return { x0: x0 - 14, x1: x0 + larg + 14, y0: y0 - 12, y1: maxY + 12 };
  }
  let leituraCap = null, ordemLug = null;

  // ── laço ─────────────────────────────────────────────────────────────────────
  let ativo = false, quadro = 0, ultimo = performance.now(), pronto = false;
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ajustar() { W = container.clientWidth || 1; H = container.clientHeight || 1; renderer.setSize(W, H, false); camera.aspect = W / H; posicionar(); rot.width = W * escala; rot.height = H * escala; }
  const obs = new ResizeObserver(() => ativo && ajustar()); obs.observe(container);
  const corOuro = new THREE.Color('#F3D38E'), corAzul = new THREE.Color('#9FC0FF');
  function quadroDesenho(t) {
    if (!ativo) return;
    const dtReal = t - ultimo, dt = Math.min(50, dtReal); ultimo = t; orcamento(dtReal);
    if (voo) {
      const q = Math.min(1, (t - voo.t0) / voo.dur), e = q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
      alvo.x = voo.de.x + (voo.para.x - voo.de.x) * e; alvo.y = voo.de.y + (voo.para.y - voo.de.y) * e;
      dist = Math.exp(Math.log(voo.de.d) + (Math.log(voo.para.d) - Math.log(voo.de.d)) * e); posicionar();
      if (q >= 1) voo = null;
    } else if (!arrasto && inercia.lengthSq() > 1e-4) { alvo.x += inercia.x * dt / 16; alvo.y += inercia.y * dt / 16; inercia.multiplyScalar(0.92); posicionar(); }
    aplicarCamadas(); if (modoTerra && atlasC) { if (animarTerra()) posicionarTerra(); } else { alvo.z = zB; posicionar(); }
    if (transicao) { const q = Math.min(1, (performance.now() - transicao.t0) / 650), e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2; if (q >= 1) transicao = null; else { camera.position.lerpVectors(transicao.pos, camera.position.clone(), e); camera.quaternion.slerpQuaternions(transicao.quat, camera.quaternion.clone(), e); camera.updateMatrixWorld(); } }
    if (ceuR) ceuR.quadro(camera, t, alvo, modoTerra ? 26000 : dist, camada('universo').opacidade, camada('universo').visivel);
    if (atlasC) atlasC.quadro(t, modoTerra ? Math.max(0.8, Math.min(2.4, Math.pow(RAIO_GLOBO / Math.max(modoTerra.alt, 1), 0.3))) : Math.max(0.6, Math.min(2.0, Math.pow(9000 / dist, 0.3))));
    const seg = reduzido ? 0 : t / 1000;
    fundoCamadas.forEach((m) => { m.uniforms.cam.value.set(alvo.x, alvo.y); m.uniforms.tempo.value = seg; });
    matVers.uniforms.k.value = 1; matVers.uniforms.tempo.value = seg; if (matVia) matVia.uniforms.tempo.value = seg;
    if (!reduzido) {
      galaxias.children.forEach((sp, i) => { sp.material.rotation += dt * 0.000035 * (i % 2 ? 1 : -1) * (1 + (i % 5) * 0.2); });
      viaLactea.children.forEach((sp, i) => { if (sp.isSprite) sp.material.userData.base = 0.16 + 0.06 * Math.sin(seg * 0.3 + i); });
      // estrela cadente de vez em quando, dentro da vista
      if (!cad && t > proxCad) { const w = dist * 0.8, a = -0.6 - Math.random() * 0.5; cad = { x: alvo.x + (Math.random() - 0.3) * w, y: alvo.y + (Math.random() * 0.6) * w, dx: Math.cos(a) * dist * 0.5, dy: Math.sin(a) * dist * 0.5, t0: t }; }
      const ca = gCad.attributes.position, cl = gCad.attributes.alfa;
      if (cad) { const q = (t - cad.t0) / 900; if (q >= 1) { cad = null; proxCad = t + 6000 + Math.random() * 9000; cl.setX(0, 0); cl.setX(1, 0); } else { const hx = cad.x + cad.dx * q, hy = cad.y + cad.dy * q; ca.setXYZ(0, hx - cad.dx * 0.25, hy - cad.dy * 0.25, -50); ca.setXYZ(1, hx, hy, -50); cl.setX(0, 0); cl.setX(1, Math.sin(q * Math.PI) * 0.9); } ca.needsUpdate = cl.needsUpdate = true; }
    }
    // galáxias e nebulosas: fortes de longe, somem perto
    const longe = Math.min(1, Math.max(0, (dist - 900) / 6000));
    const resp = reduzido ? 1 : 1;
    if (secRevelada != null && performance.now() > revelaAte) secRevelada = null;
    for (let i = 0; i < 10; i++) revela[i] += ((secRevelada === i ? 1 : 0) - revela[i]) * Math.min(1, dt / 180);
    matVers.uniforms.longeR.value = longeR(); for (let i = 0; i < 10; i++) matVers.uniforms.revela.value[i] = revela[i];
    galaxias.children.forEach((sp, i) => { const lv = livros[i]; const rvL = revela[secoes.indexOf(lv.sec)], fatR = 1 - longeR() * (1 - rvL); const esc2 = lv.raio * 2.9 * (0.35 + 0.65 * fatR); sp.scale.set(esc2, esc2, 1); sp.visible = fatR > 0.02;
      const foco = sobreLivro === lv ? 0.55 : 0; const pulso = reduzido ? 0 : 0.06 * Math.sin(t / 1000 * 0.8 + i * 1.7); const bb = sp.material.userData.base ?? 0.5; sp.material.userData.base = (bb + ((0.12 + 0.5 * longe + foco + pulso + (livroAtivo === i ? 0.6 : 0)) - bb) * 0.12); sp.material.opacity = sp.material.userData.base * fatR * camada('biblia').opacidade; });
    nebulosas.children.forEach((sp, i) => { sp.material.userData.base = (0.025 + 0.06 * longe) * (reduzido ? 1 : 0.8 + 0.2 * Math.sin(t / 1000 * 0.25 + i * 0.9)) * (secAtiva != null && sp.userData.secao === secAtiva ? 3.2 : 1); });
    if (pronto) {
      // constelação: estrelas ligadas brilham e se aproximam um pouco; linhas acendem em sequência
      const lp = gLin.attributes.position, la = gLin.attributes.alfa, lc = gLin.attributes.cor;
      const pp = gPart.attributes.position, pa = gPart.attributes.alfa;
      const bri = gVers.attributes.brilho, pos = gVers.attributes.position;
      if (tocados.size) { for (const j of tocados) { vBri[j] = vBriBase[j]; vPos[j * 3] = vBase[j * 3]; vPos[j * 3 + 1] = vBase[j * 3 + 1]; } tocados.clear(); }
      if (realceLugar.size) { const pul = 1.7 + 0.25 * Math.sin(t / 260); for (const j of realceLugar) { vBri[j] = pul; tocados.add(j); } }
      if (realceLivro.size) { const pul = 1.35 + 0.12 * Math.sin(t / 400); for (const j of realceLivro) { vBri[j] = pul; tocados.add(j); } }
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
      if (ass !== assinatura) { assinatura = ass; montarSatelites(); precisaOpac = true; }
      if (sats.length) { const sa = gSat.attributes.alfa; const perto = Math.min(1, Math.max(0, (1800 - dist) / 1300)); const kA = constel && !constel.soltoEm ? constel.origem : selecionado; sats.forEach((s, i) => sa.setX(i, perto * (s.k === kA ? 1 : 0.45))); sa.needsUpdate = true; }
    }
    atualizarFios(t);
    renderer.clear();
    if (ceuR) renderer.render(ceuR.cena, ceuR.camera);   // 1º o céu real (fundo da camada Universo)
    renderer.clearDepth();
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
      irPara: (x, y, d) => { voo = null; interagiu = true; alvo.set(x, y, 0); dist = d; posicionar(); },
      constelacao: () => (constel ? { origem: constel.origem, alvos: constel.alvos.length, acesas: constel.alvos.filter((a) => performance.now() > a.inicio + 420).length, solta: !!constel.soltoEm } : null),
      cartao: () => !cartao.hidden, satelites: () => sats.length, versos: () => vChave.length, livros: () => livros.length,
      leitura: () => leituraCap, atlas: () => atlasC, lugar: () => (lugarAtivo ? { nome: lugarAtivo.nome, acesos: realceLugar.size } : null),
      camadas: () => CAMADAS.map((c) => ({ id: c.id, visivel: c.visivel, opacidade: c.opacidade, z: c.z })), definirCamada: (id, vis, op) => { const c = camada(id); if (vis != null) c.visivel = vis; if (op != null) c.opacidade = op; montarPainel(); },
      camadasTeste: (n) => { for (let k = 0; k < n; k++) registrarCamada({ id: 'teste' + k, nome: 'Teste ' + (k + 1), cor: '#8FA9D9', visivel: true, opacidade: 0.5, criar: ({ secoes: sx }) => {
          const x0 = Math.min(...sx.map((q) => q.cx - q.raio)), x1 = Math.max(...sx.map((q) => q.cx + q.raio)), y0 = Math.min(...sx.map((q) => q.cy - q.raio)), y1 = Math.max(...sx.map((q) => q.cy + q.raio));
          const N = 30000, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = x0 + Math.random() * (x1 - x0); pos[i * 3 + 1] = y0 + Math.random() * (y1 - y0); }
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: new THREE.Color().setHSL(0.6 - k * 0.04, 0.5, 0.7), size: 2, sizeAttenuation: false, transparent: true, opacity: 0.6, depthWrite: false }));
          const pl = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), new THREE.MeshBasicMaterial({ color: '#1C3466', transparent: true, opacity: 0.08, depthWrite: false })); pl.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
          return [pl, pts]; } }); montarPainel(); return CAMADAS.length; },
      fpsMedio: () => new Promise((r) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n / 2)); })(); }),
      resolucao: () => resAtual, ceu: () => (ceuR ? ceuR.estado() : null), tempo: (min) => { ceuR && ceuR.tempo(min * 60000); atualizarRelogio(); }, tocarCeu: (x, y) => (ceuR ? ceuR.tocar(x, y, W, H, 14) : null), telaCeu: (nome) => (ceuR ? ceuR.telaDe(nome, W, H) : null), debugCeu: (n) => ceuR && ceuR._debug(n), apontarCeu: (nome) => { if (ceuR && ceuR.apontar(nome)) voar(alvo.x, alvo.y, 260); },
      separar: (v) => { separacao = v; sincronizarPainel(); }, buscar: (q) => buscar(q), incline: (v) => { incl = v; posicionar(); },
      composicao: () => ({ livro: livroAtivo != null ? livros[livroAtivo].nome : null, secao: secAtiva != null ? SECOES[secAtiva].nome : null, versosAcesos: realceLivro.size || realceLugar.size, lugaresAcesos: atlasC ? atlasC.acesos().size : 0, fios: fios.length }),
      telaLugar: (nome) => { if (!atlasC) return null; const l = atlasC.lugares.filter((x) => x.nome === nome).sort((a, b) => b.peso - a.peso)[0]; return l ? telaLugarV(l) : null; },
      terra: () => (modoTerra ? { lat: +modoTerra.lat.toFixed(2), lon: +modoTerra.lon.toFixed(2), alt: Math.round(modoTerra.alt) } : null), irTerra: (lat, lon, alt) => { if (!atlasC) return false; modoTerra = { lat, lon, alt, altAlvo: alt, cursor: null, vel: { lat: 0, lon: 0 } }; return true; }, sairTerra: () => sairTerra(), raioGlobo: () => RAIO_GLOBO, telaGlobo: () => { if (!atlasC) return null; const c = atlasC.centroMundo(); tmp.copy(c).project(camera); return { x: (tmp.x + 1) / 2 * W, y: (1 - tmp.y) / 2 * H }; },
      revelacao: () => ({ sec: secRevelada, valores: revela.map((v) => +v.toFixed(2)), longe: +longeR().toFixed(2) }), caixasRegiao: () => caixasRegiao,
      telaLivro: (n) => { const lv = livros[n - 1]; return lv ? tela(lv.cx, lv.cy) : null; }, incl: () => incl,
    },
  };
}
