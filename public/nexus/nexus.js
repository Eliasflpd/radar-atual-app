// NEXUS BÍBLICO — o mapa inteligente de descoberta (cliente, versão 2). Sigma.js 3 + Graphology + ForceAtlas2 + Louvain.
// Todo dado vem de /api/nexus (api/_lib/nexus.js). Nada aqui inventa nó ou ligação: o mapa só desenha o que o
// servidor devolveu, com a CLASSE da relação e a fonte de cada ligação. O pesquisador controla o mapa
// (arrastar, fixar, ocultar, destacar, expandir); a organização automática nunca desfaz o que ele fixou.
import Graph from 'https://cdn.jsdelivr.net/npm/graphology@0.26.0/+esm';
import Sigma from 'https://cdn.jsdelivr.net/npm/sigma@3.0.2/+esm';
import FA2Layout from 'https://cdn.jsdelivr.net/npm/graphology-layout-forceatlas2@0.10.1/worker/+esm';
import forceAtlas2 from 'https://cdn.jsdelivr.net/npm/graphology-layout-forceatlas2@0.10.1/+esm';
import louvain from 'https://cdn.jsdelivr.net/npm/graphology-communities-louvain@2.0.2/+esm';

// ── vocabulário visual ──────────────────────────────────────────────────────
const TIPOS = {
  passagem:   { nome: 'Passagem',   cor: '#14284B', tam: 9 },
  obra:       { nome: 'Obra',       cor: '#A8843F', tam: 7 },
  autor:      { nome: 'Autor',      cor: '#6B7280', tam: 5 },
  conceito:   { nome: 'Conceito',   cor: '#2F6F73', tam: 8 },
  verbete:    { nome: 'Termo original (léxico)', cor: '#4F7A5A', tam: 6 },
  descoberta: { nome: 'Descoberta', cor: '#8C3B3B', tam: 6 },
  pessoa:     { nome: 'Pessoa', cor: '#7A4E2D', tam: 6 },
  lugar:      { nome: 'Lugar', cor: '#6E8B3D', tam: 6 },
  evento:     { nome: 'Acontecimento', cor: '#B5651D', tam: 6 },
  documento:  { nome: 'Obra/documento citado', cor: '#5E6E8C', tam: 6 },
  instituicao:{ nome: 'Instituição/comunidade', cor: '#8A6D3B', tam: 5 },
  tradicao:   { nome: 'Tradição interpretativa', cor: '#3F6E8C', tam: 6 },
  termo:      { nome: 'Termo grego/hebraico', cor: '#2E7D6E', tam: 5 },
  mais:       { nome: 'Mais elementos', cor: '#B9BEC6', tam: 6 },
};
// MODELO DE EVIDÊNCIAS EM 3 DIMENSÕES. A cor do traço é o ESTADO epistemológico (o quanto a relação está provada);
// natureza e método aparecem como etiquetas e têm filtros próprios. Votos e pesos nunca mudam o estado.
const CLASSES = {   // = estados epistemológicos (o nome CLASSES ficou da V2)
  direta:        { nome: 'Evidência direta',  cor: '#14284B', tam: 2.4, ajuda: 'A própria fonte cita, comenta ou define a passagem; dá para conferir no trecho.' },
  corroboracao:  { nome: 'Corroboração',      cor: '#3D6B9E', tam: 2,   ajuda: 'Três ou mais autores INDEPENDENTES sustentam a mesma associação (a série Cambridge conta como um só).' },
  interpretacao: { nome: 'Interpretação',     cor: '#C9A43F', tam: 1.5, ajuda: 'Leitura de comentaristas ou curadoria (ex.: referências cruzadas do OpenBible). Não é prova textual.' },
  hipotese:      { nome: 'Hipótese',          cor: '#C46A12', tam: 1.6, ajuda: 'Vínculo calculado pelo NEXUS (co-citação, caminho). Precisa ser examinado; não demonstra dependência literária.' },
  inferencia:    { nome: 'Inferência não verificada', cor: '#8C3B3B', tam: 1.3, ajuda: 'Escrita por IA (descobertas da Oficina, explicações). Ainda não verificada por pessoa.' },
};
const NATRELS = { textual: 'Textual', documental: 'Documental', tematica: 'Temática', historica: 'Histórica', lexical: 'Lexical', interpretativa: 'Interpretativa' };
const METODOS = { referencia_cruzada: 'Referência cruzada', citacao_literal: 'Citação literal', co_citacao: 'Co-citação', correspondencia_lexical: 'Correspondência lexical',
  associacao_tematica: 'Associação temática', identificacao_entidade: 'Identificação de entidade', caminho_grafo: 'Caminho de grafo', identificacao_documental: 'Identificação documental', analise_ia: 'Análise por IA' };
const ESTADO_ANTIGO = { textual: 'direta', documental: 'direta', tematica: 'interpretacao', interpretacao: 'interpretacao', hipotese: 'hipotese', inferencia: 'inferencia' };
const AREAS = {
  passagens: 'Passagens bíblicas', autores: 'Autores', pessoas: 'Pessoas (bíblicas e históricas)', lugares: 'Lugares', obras: 'Obras', conceitos: 'Conceitos', idiomas: 'Idiomas originais',
  historia: 'História', arqueologia: 'Arqueologia', patristica: 'Patrística', judaica: 'Tradição judaica', interpretacoes: 'Interpretações teológicas', descobertas: 'Descobertas da Oficina',
};
const CATEGORIA_AREA = { lexico: 'idiomas', patristica: 'patristica', judaica: 'judaica', 'contexto-judaico': 'historia', historia: 'historia', comentario: 'interpretacoes', pregacao: 'interpretacoes' };
const CATEGORIAS = { comentario: 'Comentário', lexico: 'Léxico', patristica: 'Patrística', judaica: 'Fonte judaica', 'contexto-judaico': 'Contexto judaico', historia: 'História', pregacao: 'Pregação' };
const TIPO_LIG = { refcruz: 'referência cruzada', cita: 'cita', 'cita-lxx': 'cita (numeração LXX)', comenta: 'comenta', lexical: 'termo original', 'remissao-lexico': 'remissão de léxico', mencao: 'menciona',
  escreveu: 'escreveu', contem: 'contém', descoberta: 'descoberta', caminho: 'caminho', 'co-citacao': 'co-citação', mais: 'mais' };

// ── aparelho: quantos elementos mostrar sem travar ──────────────────────────
const pequeno = () => window.matchMedia('(max-width: 760px)').matches;
const NUCLEOS = navigator.hardwareConcurrency || 4;
const LIMITE = pequeno() ? 40 : NUCLEOS <= 4 ? 60 : 90;        // por expansão
const TETO = pequeno() ? 220 : NUCLEOS <= 4 ? 350 : 600;         // no mapa inteiro

// ── estado ──────────────────────────────────────────────────────────────────
const S = {
  graph: new Graph({ multi: false, type: 'directed' }),
  renderer: null, layout: null,
  sel: null, selAresta: null, hover: null, arrastando: null, moveu: false,
  foco: null, trilha: [], expandidos: new Set(), notas: {},
  aberto: false, investigacao: null, origemCaminho: null, caminho: null,
  aba: 'geral', grupos: true, grupoInfo: [],
  filtros: { areas: new Set(Object.keys(AREAS)), classes: new Set(Object.keys(CLASSES)), naturezas: new Set(Object.keys(NATRELS)), metodos: new Set(Object.keys(METODOS)), testamento: 'todos', votos: 0, ocultos: false },
  modo: 'mapa', cache: new Map(),
};
window.__nexus = S;   // inspeção nos testes
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ler = (k) => { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } };
const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* sem armazenamento */ } };
let ceu = null, carregandoCeu = false, versaoModo = 0;
const PARAM_CEU = new URLSearchParams(location.search).get('ceu');   // lido no início: a busca troca o endereço depois
const lab = (id) => (S.graph.hasNode(id) ? S.graph.getNodeAttribute(id, 'label') : id);

// ── API (com memória curta no aparelho) ─────────────────────────────────────
async function api(corpo, usarCache) {
  const chave = JSON.stringify(corpo) + '|' + (S.aberto ? 1 : 0);
  if (usarCache) { const c = S.cache.get(chave); if (c && Date.now() - c.t < 600e3) return c.v; }
  const r = await fetch('/api/nexus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
    body: JSON.stringify({ ...corpo, cracha: ler('radar_chave'), token: ler('lp_token') }) });
  const j = await r.json().catch(() => ({ ok: false, err: 'resposta inválida do servidor' }));
  if (j && typeof j.aberto === 'boolean') definirAcesso(j.aberto);
  if (usarCache && j.ok) S.cache.set(chave, { t: Date.now(), v: j });
  return j;
}
let carregando = 0;
function ocupado(on) { carregando = Math.max(0, carregando + (on ? 1 : -1)); $('carregando').hidden = carregando <= 0; }
function definirAcesso(aberto) {
  S.aberto = aberto;
  if (!aberto) tirarExternos();
  const c = $('acesso');
  c.textContent = aberto ? 'Biblioteca aberta' : 'Só público · entrar';
  c.classList.toggle('aberto', aberto);
}
// Remissões de obras externas (nós "x:") só existem com a porta aberta: sem ela, saem do mapa e das investigações restauradas.
// contexto para a barra lateral 'Pergunte ao Claude' (só os nomes; nós de obra externa ficam de fora)
window.NEXUS_CONTEXTO = () => { const no = (id) => (id && S.graph && S.graph.hasNode(id) && !String(id).startsWith('x:') ? { id, rotulo: lab(id) } : null); return { foco: no(S.foco), sel: no(S.sel) }; };
import('/nexus/conversa.js?v=1').then((m) => m.iniciarConversa()).catch(() => {});
import('/nexus/preparar.js?v=2').then((m) => m.iniciarPreparar()).catch(() => {});
window.NEXUS_MIDIA = 'https://pub-4e9e380943cf4c73a98a95e5d5633c95.r2.dev';   // imagens e peças 3D no Cloudflare R2 (entrega rápida e gratuita)
import('/nexus/guia.js?v=23').then((m) => m.iniciarGuia()).catch(() => {});   // guia flutuante: peça e a cena muda
window.NEXUS_ABRIR_CEU = () => abrirCeu();   // a barra Preparar abre o universo para ele trabalhar
function tirarExternos() {
  const g = S.graph; if (!g || !g.order) return;
  const fora = g.filterNodes((id) => String(id).startsWith('x:'));
  if (!fora.length) return;
  fora.forEach((id) => g.dropNode(id));
  if (S.sel && !g.hasNode(S.sel)) S.sel = null;
  S.renderer && S.renderer.refresh();
}
let toastT = null;
function aviso(t, ms) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, ms || 4200); }

// ── classificação e áreas ───────────────────────────────────────────────────
const classeDe = (a) => a.estado || ESTADO_ANTIGO[a.classe] || ({ cita: 'direta', lexical: 'direta', comenta: 'direta', escreveu: 'direta', contem: 'direta', mencao: 'interpretacao', refcruz: 'interpretacao', 'co-citacao': 'hipotese', caminho: 'hipotese', descoberta: 'inferencia' }[a.tipo]) || 'direta';
const natRelDe = (a) => a.natRel || ({ refcruz: 'interpretativa', caminho: 'interpretativa', 'co-citacao': 'interpretativa', lexical: 'lexical', mencao: 'tematica', cita: 'textual' }[a.tipo]) || 'documental';
const metodoDe = (a) => a.metodo || ({ refcruz: 'referencia_cruzada', 'co-citacao': 'co_citacao', caminho: 'caminho_grafo', lexical: 'correspondencia_lexical', mencao: 'associacao_tematica', descoberta: 'analise_ia' }[a.tipo]) || 'identificacao_documental';
function areasDoNo(a) {
  const d = a.dados || {};
  switch (a.tipo) {
    case 'passagem': return ['passagens'];
    case 'autor': return ['autores'];
    case 'conceito': return ['conceitos'];
    case 'verbete': return ['idiomas'];
    case 'descoberta': return ['descobertas'];
    case 'obra': return ['obras', CATEGORIA_AREA[d.categoria] || 'interpretacoes'];
    case 'pessoa': return ['pessoas'];
    case 'lugar': return ['lugares'];
    case 'evento': case 'instituicao': return ['historia'];
    case 'documento': return ['obras'];
    case 'tradicao': return ['interpretacoes'];
    case 'termo': return ['idiomas'];
    default: return [];
  }
}

// ── grafo: mesclar o que o servidor devolveu ───────────────────────────────
// Cada tipo nasce no seu setor em volta de quem o trouxe: passagens de um lado, obras de outro, conceitos e termos
// originais entre eles. O ForceAtlas2 depois ajusta, mas os assuntos já começam agrupados.
const SETOR = { passagem: 0, conceito: 1, verbete: 2, obra: 3, autor: 4, descoberta: 5, mais: 3.5 };
function posicaoPerto(origem, tipo) {
  const g = S.graph;
  if (origem && g.hasNode(origem)) {
    const a = g.getNodeAttributes(origem);
    const ang = (SETOR[tipo] != null ? SETOR[tipo] * Math.PI / 3 : Math.random() * Math.PI * 2) + (Math.random() - 0.5) * 0.9, r = 3 + Math.random() * 4;
    return { x: a.x + Math.cos(ang) * r, y: a.y + Math.sin(ang) * r };
  }
  return { x: Math.random() * 10 - 5, y: Math.random() * 10 - 5 };
}
function corDoNo(n) { return n.tipo === 'passagem' && n.testamento === 'AT' ? '#3D5A80' : (TIPOS[n.tipo] || TIPOS.passagem).cor; }
function mesclar(resp, origem) {
  const g = S.graph;
  for (const n of resp.nos || []) {
    if (!g.hasNode(n.id)) {
      if (g.order >= TETO && n.id !== origem) continue;     // teto do aparelho: o resto fica no "mais N"
      g.addNode(n.id, { ...posicaoPerto(origem, n.tipo), label: n.rotulo, tipo: n.tipo, dados: n, color: corDoNo(n), size: (TIPOS[n.tipo] || TIPOS.passagem).tam });
    } else g.mergeNodeAttributes(n.id, { dados: { ...g.getNodeAttribute(n.id, 'dados'), ...n } });
  }
  for (const a of resp.arestas || []) {
    if (!g.hasNode(a.de) || !g.hasNode(a.para) || a.de === a.para) continue;
    const cl = classeDe(a), c = CLASSES[cl];
    const dados = { ...a, classe: cl, estado: cl, natRel: natRelDe(a), metodo: metodoDe(a) };
    if (g.hasEdge(a.id)) {
      const atual = g.getEdgeAttribute(a.id, 'dados');
      g.setEdgeAttribute(a.id, 'dados', { ...atual, evidencias: (atual.evidencias || []).concat(a.evidencias || []).slice(0, 4) });
      continue;
    }
    if (g.hasEdge(a.de, a.para)) {
      // um traço por par no desenho; as outras relações ficam guardadas e aparecem no painel
      const k = g.edge(a.de, a.para), atual = g.getEdgeAttribute(k, 'dados');
      g.setEdgeAttribute(k, 'extras', (g.getEdgeAttribute(k, 'extras') || []).concat([dados]).slice(0, 6));
      if (Object.keys(CLASSES).indexOf(cl) < Object.keys(CLASSES).indexOf(atual.classe)) g.mergeEdgeAttributes(k, { color: c.cor, size: c.tam });
      continue;
    }
    g.addDirectedEdgeWithKey(a.id, a.de, a.para, { dados, color: c.cor, size: c.tam, type: 'arrow' });
  }
  // "mais N": o que o servidor achou mas não coube agora vira um nó-resumo que expande sob demanda
  if (origem && resp.restantes) {
    for (const [tipo, n] of Object.entries(resp.restantes)) {
      const id = 'mais:' + origem + ':' + tipo;
      if (!n) continue;
      if (!g.hasNode(id)) g.addNode(id, { ...posicaoPerto(origem, 'mais'), label: `+${n} ${(TIPOS[tipo] || {}).nome || tipo}`.toLowerCase(), tipo: 'mais', dados: { tipo: 'mais', alvo: origem, so: tipo, n }, color: TIPOS.mais.cor, size: TIPOS.mais.tam });
      else g.mergeNodeAttributes(id, { label: `+${n} ${(TIPOS[tipo] || {}).nome || tipo}`.toLowerCase(), dados: { tipo: 'mais', alvo: origem, so: tipo, n } });
      if (!g.hasEdge(origem, id)) g.addDirectedEdgeWithKey('mais|' + id, origem, id, { dados: { tipo: 'mais', classe: 'documental', explica: `Mais ${n} elementos encontrados nas fontes. Toque para trazer.` }, color: '#DDD8CC', size: 1, type: 'line' });
    }
  }
  g.forEachNode((id, at) => g.setNodeAttribute(id, 'size', (TIPOS[at.tipo] || TIPOS.passagem).tam + Math.min(8, Math.sqrt(g.degree(id)) * 1.2)));
  rodarLayout();
  montarFiltros();
  atualizarVazio();
  if (S.modo === 'lista') desenharLista();
  if (g.order >= TETO) aviso(`O mapa chegou ao limite deste aparelho (${TETO} elementos). Oculte ou feche ramos para abrir outros.`, 6000);
}
function rodarLayout(ms) {
  if (S.graph.order < 2) return;
  try {
    if (S.layout) S.layout.kill();
    S.layout = new FA2Layout(S.graph, { settings: { ...forceAtlas2.inferSettings(S.graph), slowDown: 6, gravity: 0.5, scalingRatio: 6, barnesHutOptimize: S.graph.order > 150 } });
    S.layout.start();
    setTimeout(() => { try { S.layout && S.layout.stop(); } catch (_) {} calcularGrupos(); }, ms || 2400);
  } catch (_) { calcularGrupos(); }
}

// ── grupos de assuntos (Louvain) com nome na tela ──────────────────────────
function calcularGrupos() {
  const g = S.graph;
  S.grupoInfo = [];
  if (!S.grupos || g.order < 8) { desenharGrupos(); return; }
  let mapa = {};
  try {
    const u = new Graph({ type: 'undirected' });
    g.forEachNode((id, a) => { if (a.tipo !== 'mais' && !a.oculto) u.addNode(id); });
    g.forEachEdge((k, a, s, t) => { if (u.hasNode(s) && u.hasNode(t) && !u.hasEdge(s, t)) u.addEdge(s, t, { weight: 1 }); });
    mapa = louvain(u, { resolution: 1.1 });
  } catch (_) { desenharGrupos(); return; }
  const grupos = {};
  for (const [id, c] of Object.entries(mapa)) (grupos[c] = grupos[c] || []).push(id);
  const prioridade = { conceito: 0, passagem: 1, verbete: 2, obra: 3, autor: 4, descoberta: 5 };
  for (const ids of Object.values(grupos)) {
    if (ids.length < 6) continue;
    const nome = ids.filter((id) => id !== S.foco).sort((x, y) => (prioridade[g.getNodeAttribute(x, 'tipo')] - prioridade[g.getNodeAttribute(y, 'tipo')]) || (g.degree(y) - g.degree(x)))[0];
    const t = nome ? lab(nome) : '';
    S.grupoInfo.push({ ids, nome: t.length > 26 ? t.slice(0, 25) + '…' : t });
  }
  S.grupoInfo = S.grupoInfo.sort((x, y) => y.ids.length - x.ids.length).slice(0, 6);
  desenharGrupos();
}
function desenharGrupos() {
  const el = $('rotulos-grupos');
  if (!S.grupos || S.modo !== 'mapa' || !S.renderer) { el.innerHTML = ''; return; }
  const R = S.renderer;
  el.innerHTML = S.grupoInfo.map((gr) => {
    let x = 0, y = 0, n = 0, minY = Infinity;
    for (const id of gr.ids) {
      if (!S.graph.hasNode(id)) continue;
      const a = S.graph.getNodeAttributes(id); if (a.oculto) continue;
      const v = R.graphToViewport({ x: a.x, y: a.y }); x += v.x; y += v.y; n++; minY = Math.min(minY, v.y);
    }
    if (!n) return '';
    return `<button class="rotulo-grupo" data-grupo="${S.grupoInfo.indexOf(gr)}" style="left:${(x / n).toFixed(0)}px;top:${(minY - 22).toFixed(0)}px" title="Ver os elementos deste grupo">${esc(gr.nome)} · ${n}</button>`;
  }).join('');
}

// ── expandir / focar ───────────────────────────────────────────────────────
async function expandir(id, opcoes) {
  const g = S.graph;
  const n = g.hasNode(id) ? g.getNodeAttributes(id) : null;
  if (n && n.tipo === 'mais') return trazerMais(id);
  ocupado(true);
  try {
    const ctx = g.filterNodes((k, a) => a.tipo === 'passagem').slice(0, 12);
    const j = await api({ acao: 'expandir', id, rotulo: n && n.label, contexto: id.startsWith('o:') ? ctx : undefined, limite: (opcoes && opcoes.limite) || LIMITE, so: opcoes && opcoes.so }, true);
    if (!j.ok) { if (j.motivo === 'particular') pedirPin(); else aviso(j.err || 'Não foi possível expandir.'); return; }
    S.expandidos.add(id);
    const antes = g.order;
    mesclar(j, id);
    const novos = g.order - antes;
    if (!novos && !(j.restantes && Object.keys(j.restantes).length)) aviso('Nenhuma ligação nova nas fontes para este elemento.');
    else aviso(`${novos} elemento(s) novo(s)${j.total ? ` de ${j.total} encontrados nas fontes` : ''}.`, 2500);
  } catch (e) { aviso('Falha de conexão: ' + e.message); } finally { ocupado(false); }
}
async function trazerMais(idMais) {
  const g = S.graph, d = g.getNodeAttribute(idMais, 'dados');
  g.dropNode(idMais);
  await expandir(d.alvo, { so: d.so, limite: Math.min(120, d.n + 5) });
}
async function explorar(texto, inicial = false) {
  const t = String(texto || '').trim();
  if (!t) return;
  ocupado(true);
  try {
    const r = await api({ acao: 'resolver', ref: t }, true);
    if (!r.ok) { aviso(r.err || 'Referência não reconhecida.'); return; }
    S.foco = r.id;
    try { history.replaceState(null, '', '?ref=' + encodeURIComponent(t) + (PARAM_CEU ? '&ceu=' + encodeURIComponent(PARAM_CEU) : '') + (new URLSearchParams(location.search).get('versao') ? '&versao=' + new URLSearchParams(location.search).get('versao') : '')); } catch (_) {}   // atualizar a página mantém a prévia aberta
    if (!S.graph.hasNode(r.id) || !S.expandidos.has(r.id)) await expandir(r.id);
    if (S.graph.hasNode(r.id)) { S.graph.mergeNodeAttributes(r.id, { fixado: true, fixed: true, x: 0, y: 0 }); }
    selecionar(r.id, false, !inicial || (!carregandoCeu && S.modo !== 'ceu'));
    enquadrar(); setTimeout(enquadrar, 2600);
  } finally { ocupado(false); }
}

// ── seleção, trilha ────────────────────────────────────────────────────────
function selecionar(id, centralizar, mostrarPainel = true) {
  if (!S.graph.hasNode(id)) return;
  if (S.graph.getNodeAttribute(id, 'tipo') === 'mais') { trazerMais(id); return; }
  S.sel = id; S.selAresta = null; S.caminho = null; if (S.realce) { S.realce = null; montarLegenda(); }
  if (S.trilha[S.trilha.length - 1] !== id) { S.trilha.push(id); if (S.trilha.length > 40) S.trilha.shift(); }
  desenharTrilha();
  if (S.modo === 'lista') desenharLista(); else if (mostrarPainel) painelNo(id);
  S.renderer?.refresh();
  if (centralizar) centralizarEm(id);
}
function enquadrar() {
  if (S.modo === 'ceu') { ceu.enquadrar(); return; }
  if (!S.renderer) return;
  const lateral = !$('painel').hidden && !pequeno();
  S.renderer.getCamera().animate({ x: lateral ? 0.66 : 0.5, y: 0.5, ratio: lateral ? 1.25 : 1.05, angle: 0 }, { duration: 400 });
}
function centralizarEm(id) {
  if (S.modo === 'ceu') { ceu.centralizar(id); return; }
  const R = S.renderer;
  if (!R || !S.graph.hasNode(id)) return;
  R.refresh();
  const a = S.graph.getNodeAttributes(id);
  const alvo = R.viewportToFramedGraph(R.graphToViewport({ x: a.x, y: a.y }));
  if (!isFinite(alvo.x) || !isFinite(alvo.y)) return;
  R.getCamera().animate({ x: alvo.x, y: alvo.y, ratio: Math.min(Math.max(R.getCamera().ratio, 0.35), 0.9) }, { duration: 450 });
}
function desenharTrilha() {
  const el = $('trilha');
  if (!S.trilha.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<span class="rot">Trilha</span>' + S.trilha.map((id, i) =>
    (i ? '<span class="seta">›</span>' : '') + `<button class="passo${id === S.sel ? ' atual' : ''}" data-id="${esc(id)}">${esc(lab(id))}</button>`).join('');
  el.scrollLeft = el.scrollWidth;
}

// ── painel de inteligência (4 abas) ────────────────────────────────────────
const etiqueta = (cl) => `<span class="nat nat-${esc(cl)}" title="${esc((CLASSES[cl] || {}).ajuda || '')}">${esc((CLASSES[cl] || {}).nome || cl)}</span>`;
const dimensoes = (d) => `${etiqueta(d.classe)}<span class="etq" title="Natureza da relação">${esc(NATRELS[d.natRel] || d.natRel || '')}</span><span class="etq" title="Método de identificação">${esc(METODOS[d.metodo] || d.metodo || '')}</span>${d.independentes ? `<span class="etq" title="Autores independentes (a mesma série ou o mesmo autor contam uma vez)">${d.independentes} autor(es) indep.</span>` : ''}${d.direcao ? `<span class="etq" title="Direção">${esc(d.direcao)}</span>` : ''}`;
function evidenciasHtml(lista, aberto) {
  if (!lista || !lista.length) return '';
  return `<details class="ev"${aberto ? ' open' : ''}><summary>Ver fonte (${lista.length})</summary>${lista.map(evItem).join('')}</details>`;
}
const evItem = (e) => `<div class="ev-item"><b>${esc(e.autor || '')}</b>${e.obra ? ' · ' + esc(e.obra) : ''}${e.secao ? ' · ' + esc(e.secao) : ''}${e.local && e.local.pagina ? ' · p. ' + e.local.pagina : ''}${e.marca ? ' · referência impressa "' + esc(e.marca) + '"' : ''}${e.modo ? ` <span class="etq">${esc(e.modo)}</span>` : ''}${e.trecho ? `<q>${esc(e.trecho)}</q>` : ''}${e.local && e.local.trechoId ? `<div class="nota">Localização: ${esc(e.local.fonte || '')} · trecho ${esc(e.local.trechoId)}</div>` : ''}${e.aviso ? `<div class="aviso">${esc(e.aviso)}</div>` : ''}</div>`;
function ligacoesDe(id) {
  const g = S.graph, out = [];
  g.forEachEdge(id, (k, a, src, dst) => {
    if (g.getNodeAttribute(src === id ? dst : src, 'tipo') === 'mais') return;
    for (const d of [a.dados].concat(a.extras || [])) out.push({ k, a: d, outro: src === id ? dst : src, sentido: src === id ? 'saida' : 'entrada' });
  });
  const ordem = Object.keys(CLASSES);
  return out.sort((x, y) => (ordem.indexOf(x.a.classe) - ordem.indexOf(y.a.classe)) || ((y.a.peso || 0) - (x.a.peso || 0)));
}
function vizinhosPorTipo(id) {
  const t = {};
  S.graph.forEachNeighbor(id, (v, a) => { if (a.tipo !== 'mais') (t[a.tipo] = t[a.tipo] || []).push(v); });
  return t;
}
function cabecalhoNo(id) {
  const g = S.graph, a = g.getNodeAttributes(id), d = a.dados || {};
  const t = TIPOS[a.tipo] || {};
  const controles = [
    `<button class="bt bt-ouro" data-acao="expandir" data-id="${esc(id)}">${S.expandidos.has(id) ? 'Expandir de novo' : 'Expandir conexões'}</button>`,
    a.tipo === 'passagem' ? `<button class="bt" data-acao="descobrir" data-id="${esc(id)}">Descobrir</button><button class="bt" data-acao="entidades" data-id="${esc(id)}">Entidades</button>` : '',
    S.origemCaminho && S.origemCaminho !== id ? `<button class="bt" data-acao="caminho" data-id="${esc(id)}">Caminho desde ${esc(lab(S.origemCaminho))}</button>` : `<button class="bt" data-acao="origem" data-id="${esc(id)}">Origem de caminho</button>`,
  ].join('');
  const extras = S.modo === 'mapa' ? `<div class="controles">
      <button class="bt${a.fixado ? ' ligado' : ''}" data-acao="fixar" data-id="${esc(id)}">${a.fixado ? 'Fixado' : 'Fixar'}</button>
      <button class="bt${a.destaque ? ' ligado' : ''}" data-acao="destacar" data-id="${esc(id)}">${a.destaque ? 'Destacado' : 'Destacar'}</button>
      <button class="bt" data-acao="ocultar" data-id="${esc(id)}">Ocultar</button>
      <button class="bt" data-acao="centralizar" data-id="${esc(id)}">Centralizar</button></div>` : '';
  return `<span class="etq"><span class="amostra" style="background:${a.color}"></span>${esc(t.nome || a.tipo)}${d.testamento ? ' · ' + (d.testamento === 'AT' ? 'Antigo Testamento' : 'Novo Testamento') : ''}${d.categoria ? ' · ' + esc(CATEGORIAS[d.categoria] || d.categoria) : ''}</span>
    <h2>${esc(a.label)}</h2><div class="botoes">${controles}</div>${extras}
    <div class="abas" role="tablist">${[['geral', 'Visão geral'], ['fontes', 'Fontes'], ['conexoes', 'Conexões'], ['notas', 'Notas']].map(([k, n]) => `<button class="aba${S.aba === k ? ' ativa' : ''}" data-aba="${k}" role="tab">${n}</button>`).join('')}</div>`;
}
function abaGeral(id) {
  const g = S.graph, a = g.getNodeAttributes(id), d = a.dados || {};
  const viz = vizinhosPorTipo(id);
  const lista = (tipo, max) => (viz[tipo] || []).slice(0, max || 8).map((v) => `<button class="lig-alvo" data-ir="${esc(v)}">${esc(lab(v))}</button>`).join(' · ');
  let h = '';
  // descrição
  if (d.texto) h += `<div class="verso">${esc(d.texto)}<div class="nota">Almeida (texto do RADAR)</div></div>`;
  if (a.tipo === 'obra') h += `<p>${esc(d.rotulo || a.label)}${d.autor ? ', de <b>' + esc(d.autor) + '</b>' : ''}.${d.grupo ? ' Grupo na biblioteca: ' + esc(d.grupo) + '.' : ''}</p>`;
  if (a.tipo === 'autor') h += `<p>Autor com obras na biblioteca do RADAR.</p>`;
  if (a.tipo === 'conceito') h += `<p>Conceito do dicionário do NEXUS. É reconhecido no texto das fontes pela regra <code>${esc(d.regra || '')}</code>, que fica à vista para conferência.</p>`;
  if (a.tipo === 'verbete') h += `<p>Verbete de ${esc(d.obra || 'léxico')}. Liga a passagem ao termo original (hebraico ou grego).</p>`;
  if (a.tipo === 'descoberta') h += `<div class="verso" style="font-size:15px">${esc(d.explica || '')}</div><p class="nota">Camada: ${esc(d.camada || '')} · fonte declarada: ${esc(d.fonte || '—')} · escrita por IA na Oficina, não verificada por pessoa.</p>`;
  if (d.aviso) h += `<div class="aviso">${esc(d.aviso)}</div>`;
  // contexto histórico: só o que as fontes ligadas dão
  const historicas = (viz.obra || []).filter((v) => ['historia', 'contexto-judaico', 'judaica', 'patristica'].includes((g.getNodeAttribute(v, 'dados') || {}).categoria));
  h += `<h3>Contexto histórico</h3>` + (historicas.length ? `<p>Fontes históricas e de tradição ligadas: ${historicas.map((v) => `<button class="lig-alvo" data-ir="${esc(v)}">${esc(lab(v))}</button>`).join(' · ')}</p>` : '<p class="nota">Nenhuma fonte histórica ligada a este elemento no mapa atual. Expanda ou use Descobrir.</p>');
  // grau de evidência
  const cont = {};
  for (const l of ligacoesDe(id)) cont[l.a.classe] = (cont[l.a.classe] || 0) + 1;
  h += `<h3>Grau de evidência das ligações</h3><div class="grau">${Object.keys(CLASSES).filter((c) => cont[c]).map((c) => `${etiqueta(c)}<span class="etq">${cont[c]}</span>`).join('') || '<span class="nota">Sem ligações ainda.</span>'}</div>`;
  // autores, obras, referências
  const autores = new Set(viz.autor || []);
  (viz.obra || []).forEach((o) => { const au = (g.getNodeAttribute(o, 'dados') || {}).autor; if (au) g.forEachNode((k, at) => { if (at.tipo === 'autor' && at.label === au) autores.add(k); }); });
  if (autores.size) h += `<h3>Autores envolvidos</h3><p>${[...autores].slice(0, 10).map((v) => `<button class="lig-alvo" data-ir="${esc(v)}">${esc(lab(v))}</button>`).join(' · ')}</p>`;
  if (viz.obra) h += `<h3>Obras relacionadas (${viz.obra.length})</h3><p>${lista('obra', 10)}</p>`;
  if (viz.passagem) h += `<h3>Referências bíblicas (${viz.passagem.length})</h3><p>${lista('passagem', 12)}</p>`;
  if (viz.conceito) h += `<h3>Conceitos</h3><p>${lista('conceito', 10)}</p>`;
  if (viz.verbete) h += `<h3>Termos originais</h3><p>${lista('verbete', 8)}</p>`;
  // outras possibilidades
  const sugestoes = [];
  if (!S.expandidos.has(id)) sugestoes.push(`<button class="sugestao" data-acao="expandir" data-id="${esc(id)}">Expandir as conexões de ${esc(a.label)}</button>`);
  if (a.tipo === 'passagem') sugestoes.push(`<button class="sugestao" data-acao="descobrir" data-id="${esc(id)}">Rodar o motor de descoberta nesta passagem</button>`);
  for (const v of [...(viz.conceito || []), ...(viz.verbete || [])].filter((v) => !S.expandidos.has(v)).slice(0, 3)) sugestoes.push(`<button class="sugestao" data-acao="expandir" data-id="${esc(v)}">Seguir "${esc(lab(v))}" em outras passagens</button>`);
  if (S.foco && S.foco !== id) sugestoes.push(`<button class="sugestao" data-acao="caminho-foco" data-id="${esc(id)}">Caminho entre ${esc(lab(S.foco))} e ${esc(a.label)}</button>`);
  if (sugestoes.length) h += `<h3>Outras possibilidades de investigação</h3>${sugestoes.join('')}`;
  return h;
}
function abaFontes(id) {
  const vistos = new Set(), itens = [];
  for (const l of ligacoesDe(id)) for (const e of (l.a.evidencias || [])) {
    const k = (e.ref || '') + '|' + (e.trecho || '').slice(0, 40);
    if (vistos.has(k)) continue; vistos.add(k);
    itens.push({ e, l });
  }
  if (!itens.length) return '<p class="nota">Nenhuma fonte documental carregada para este elemento. As ligações de curadoria (OpenBible) não têm trecho de livro; expanda para trazer as obras.</p>';
  return `<p class="nota">${itens.length} trecho(s) das fontes que sustentam as ligações deste elemento.</p>` + itens.slice(0, 60).map(({ e, l }) =>
    `<div class="lig"><div class="lig-topo">${etiqueta(l.a.classe)}<button class="lig-alvo" data-ir="${esc(l.outro)}">${esc(lab(l.outro))}</button></div>${evItem(e)}</div>`).join('');
}
function abaConexoes(id) {
  const mais = S.graph.filterNeighbors(id, (v, a) => a.tipo === 'mais').map((v) => `<button class="sugestao" data-ir="${esc(v)}">Trazer ${esc(lab(v))} encontrados nas fontes</button>`).join('');
  return mais + abaConexoesLista(id);
}
function abaConexoesLista(id) {
  const ligs = ligacoesDe(id).filter((l) => visivelAresta(l.k));
  if (!ligs.length) return '<p class="nota">Sem ligações visíveis. Toque em "Expandir conexões" ou revise os filtros.</p>';
  return ligs.slice(0, 90).map((l) => `<div class="lig"><div class="lig-topo">${dimensoes(l.a)}<span class="etq">${esc(TIPO_LIG[l.a.tipo] || l.a.tipo)}${l.sentido === 'entrada' ? ' ←' : ' →'}</span><button class="lig-alvo" data-ir="${esc(l.outro)}">${esc(lab(l.outro))}</button></div><p>${esc(l.a.explica || '')}</p>${l.a.credito ? `<p class="nota">${esc(l.a.credito)}</p>` : ''}${evidenciasHtml(l.a.evidencias)}</div>`).join('')
    + (ligs.length > 90 ? `<p class="nota">+${ligs.length - 90} ligações (use os filtros).</p>` : '');
}
function abaNotas(id) {
  return `<p class="nota">Suas anotações sobre "${esc(lab(id))}". Ficam guardadas na investigação quando você salva.</p><textarea class="notas" id="nota-texto" data-id="${esc(id)}" placeholder="Escreva aqui…">${esc(S.notas[id] || '')}</textarea>`;
}
function conteudoAba(id) { return { geral: abaGeral, fontes: abaFontes, conexoes: abaConexoes, notas: abaNotas }[S.aba](id); }
function painelNo(id) {
  $('painel-corpo').innerHTML = cabecalhoNo(id) + `<div id="aba-corpo">${conteudoAba(id)}</div>`;
  $('painel').hidden = false;
}
function painelAresta(k) {
  const g = S.graph, a = g.getEdgeAttribute(k, 'dados'), extras = g.getEdgeAttribute(k, 'extras') || [];
  S.selAresta = k;
  const s = g.source(k), t = g.target(k);
  $('painel-corpo').innerHTML = `<span class="etq">Relação</span><h2>${esc(lab(s))} → ${esc(lab(t))}</h2>` +
    [a].concat(extras).map((d) => `<div class="lig"><div class="lig-topo">${dimensoes(d)}<span class="etq">${esc(TIPO_LIG[d.tipo] || d.tipo)}</span></div><p>${esc(d.explica || '')}</p><p class="nota">${esc((CLASSES[d.classe] || {}).ajuda || '')}</p>${d.credito ? `<p class="nota">${esc(d.credito)}</p>` : ''}${evidenciasHtml(d.evidencias, true)}</div>`).join('') +
    `<div class="botoes"><button class="bt" data-ir="${esc(s)}">Ir para ${esc(lab(s))}</button><button class="bt" data-ir="${esc(t)}">Ir para ${esc(lab(t))}</button></div>`;
  $('painel').hidden = false;
  S.renderer?.refresh();
}

// ── modo trilha (lista; padrão no celular) ──────────────────────────────────
function desenharLista() {
  const el = $('lista');
  if (!S.sel) { el.innerHTML = '<div class="cartao"><p class="nota">Escolha uma passagem para começar.</p></div>'; return; }
  el.innerHTML = `<div class="cartao">${cabecalhoNo(S.sel)}<div id="aba-corpo">${conteudoAba(S.sel)}</div></div>`;
}
function definirModo(m) {
  versaoModo++;
  if (m === 'mapa' && !S.renderer) m = 'lista';
  S.modo = m;
  document.body.classList.toggle('modo-ceu', m === 'ceu');
  $('ceu').hidden = m !== 'ceu';
  $('bt-ceu').setAttribute('aria-pressed', m === 'ceu');
  $('bt-ceu').textContent = m === 'ceu' && S.renderer ? 'Mapa 2D' : 'Céu Infinito';
  ceu?.ativar(m === 'ceu');
  document.body.classList.toggle('modo-lista', m === 'lista');
  $('lista').hidden = m !== 'lista';
  $('mapa').style.visibility = m === 'mapa' ? 'visible' : 'hidden';
  $('bt-modo').textContent = m === 'lista' ? 'Mapa' : 'Trilha';
  $('bt-modo').hidden = m === 'lista' && !S.renderer && !ceu;
  if (m === 'lista') { $('painel').hidden = true; if (S.aba === 'geral' && pequeno()) S.aba = 'conexoes'; desenharLista(); }
  else if (S.sel && m === 'mapa') painelNo(S.sel);
  desenharGrupos();
}

function ceuIndisponivel() {
  if (S.modo === 'ceu') definirModo('mapa');
  ceu?.descartar();
  ceu = null;
  if (!S.renderer) $('bt-modo').hidden = true;
  aviso('Céu Infinito indisponível neste navegador.');
}

async function abrirCeu() {
  if (carregandoCeu || S.modo === 'ceu') return;
  const versao = versaoModo;
  const botao = $('bt-ceu');
  carregandoCeu = botao.disabled = true;
  try {
    if (!ceu) {
      // O CÉU PUBLICADO é o universo navegável (10 camadas + Terra), aprovado pelo Elias em 21/11/2026.
      // O Céu anterior (v9) continua disponível com ?ceu=classico; a prévia esférica antiga só no PC (?ceu=previa).
      const local = /^(localhost|127\.)/.test(location.hostname);
      const arquivo = PARAM_CEU === 'classico' ? '/nexus/ceu.js?v=9'
        : PARAM_CEU === 'previa' && local ? '/nexus/ceu-previa.js?v=1'
        : new URLSearchParams(location.search).get('versao') === 'anterior' ? '/nexus/anterior/ceu-universo.js' : '/nexus/ceu-universo.js?v=260';
      const { criarCeu } = await import(arquivo);
      ceu = criarCeu($('ceu'), S, { visivelNo, visivelAresta, selecionar, expandir, painelAresta, abrirGrupo, indisponivel: ceuIndisponivel });
      window.__ceuPrevia = ceu;   // ganchos de teste (só leitura)
    }
    if (versao === versaoModo) definirModo('ceu');
  } catch (erro) {
    console.warn('Céu Infinito:', erro);
    ceuIndisponivel();
  } finally {
    carregandoCeu = botao.disabled = false;
  }
}

function previaDoControle(elemento) {
  const botao = elemento?.closest('button');
  if (!botao) return null;
  const id = botao.dataset.ir || botao.dataset.id || (botao.id === 'bt-descobrir' ? S.sel || S.foco : null);
  return id && S.graph.hasNode(id) && visivelNo(id) ? id : null;
}

// ── filtros ─────────────────────────────────────────────────────────────────
function visivelNo(id, a) {
  a = a || S.graph.getNodeAttributes(id);
  const f = S.filtros, d = a.dados || {};
  if (a.oculto && !f.ocultos) return false;
  if (id === S.sel || id === S.foco || a.tipo === 'mais') return true;
  if (!areasDoNo(a).every((ar) => f.areas.has(ar))) return false;
  if (a.tipo === 'passagem' && f.testamento !== 'todos' && d.testamento !== f.testamento) return false;
  return true;
}
function visivelAresta(k) {
  const g = S.graph, a = g.getEdgeAttribute(k, 'dados'), f = S.filtros;
  if (a.tipo !== 'mais' && (!f.classes.has(a.classe) || (f.naturezas && !f.naturezas.has(a.natRel)) || (f.metodos && !f.metodos.has(a.metodo)))) return false;
  if (a.tipo === 'refcruz' && f.votos && (a.peso || 0) < f.votos) return false;
  return visivelNo(g.source(k)) && visivelNo(g.target(k));
}
function montarFiltros() {
  const g = S.graph, f = S.filtros;
  const contaArea = (ar) => g.filterNodes((id, a) => areasDoNo(a).includes(ar)).length;
  const ocultos = g.filterNodes((id, a) => a.oculto).length;
  $('filtros-corpo').innerHTML =
    `<input class="busca-mapa" id="busca-mapa" type="search" placeholder="Localizar no mapa…" aria-label="Localizar no mapa">` +
    '<h4>Mostrar</h4>' + Object.entries(AREAS).map(([k, nome]) => {
      const n = contaArea(k);
      return `<label class="${k === 'arqueologia' && !n ? 'desab' : ''}"><input type="checkbox" data-f="areas" value="${k}" ${f.areas.has(k) ? 'checked' : ''}>${esc(nome)} <small style="color:#8A909A">(${n})</small></label>`;
    }).join('') +
    `<p class="nota" style="margin:2px 0 6px">Arqueologia: ainda não há fontes de arqueologia na biblioteca.</p>` +
    '<h4>Estado da evidência</h4>' + Object.entries(CLASSES).map(([k, c]) => `<label title="${esc(c.ajuda)}"><input type="checkbox" data-f="classes" value="${k}" ${f.classes.has(k) ? 'checked' : ''}><span class="amostra linha" style="background:${c.cor}"></span>${esc(c.nome)} <small style="color:#8A909A">(${g.filterEdges((e, a) => a.dados.classe === k).length})</small></label>`).join('') +
    '<h4>Natureza da relação</h4>' + Object.entries(NATRELS).map(([k, n]) => `<label><input type="checkbox" data-f="naturezas" value="${k}" ${f.naturezas.has(k) ? 'checked' : ''}>${esc(n)} <small style="color:#8A909A">(${g.filterEdges((e, a) => a.dados.natRel === k).length})</small></label>`).join('') +
    '<h4>Método de identificação</h4>' + Object.entries(METODOS).map(([k, n]) => `<label><input type="checkbox" data-f="metodos" value="${k}" ${f.metodos.has(k) ? 'checked' : ''}>${esc(n)} <small style="color:#8A909A">(${g.filterEdges((e, a) => a.dados.metodo === k).length})</small></label>`).join('') +
    `<h4>Testamento</h4>${[['todos', 'Todos'], ['AT', 'Antigo'], ['NT', 'Novo']].map(([v, n]) => `<label><input type="radio" name="test" value="${v}" ${f.testamento === v ? 'checked' : ''}> ${n}</label>`).join('')}` +
    `<h4>Referências cruzadas: votos mínimos <b id="votos-v">${f.votos}</b></h4><input type="range" id="votos" min="0" max="300" step="10" value="${f.votos}">` +
    `<h4>Ocultos</h4><label><input type="checkbox" id="ver-ocultos" ${f.ocultos ? 'checked' : ''}> Mostrar elementos ocultados (${ocultos})</label>` +
    `<p class="nota">Limite deste aparelho: ${LIMITE} por expansão, ${TETO} no mapa.</p>`;
}
function aplicarFiltros() {
  S.renderer?.refresh();
  if (S.modo === 'lista') desenharLista(); else if (S.sel && !$('painel').hidden && !S.selAresta) painelNo(S.sel);
  desenharGrupos();
}
function montarLegenda() {
  const ativo = (k, v) => S.realce && S.realce.k === k && S.realce.v === v ? ' ativo' : '';
  $('legenda').innerHTML = Object.entries(TIPOS).filter(([k]) => k !== 'mais').map(([k, tp]) => `<button class="leg${ativo('tipo', k)}" data-realce="tipo:${k}" title="Destacar e listar: ${esc(tp.nome)}"><i class="amostra" style="background:${tp.cor}"></i>${tp.nome}</button>`).join('') +
    Object.entries(CLASSES).map(([k, tp]) => `<button class="leg${ativo('estado', k)}" data-realce="estado:${k}" title="${esc(tp.ajuda)} Toque para destacar e listar."><i class="amostra linha" style="background:${tp.cor}"></i>${tp.nome}</button>`).join('');
}
// Realce pela legenda: o mapa destaca só aquele tipo de elemento (ou aquele estado de evidência) e o painel lista tudo
// o que há dele, cada item levando ao seu lugar no mapa. Tocar de novo desfaz.
function abrirGrupo(i) {
  const gr = S.grupoInfo[i]; if (!gr) return;
  const g = S.graph, ids = gr.ids.filter((id) => g.hasNode(id)).sort((a, b) => g.degree(b) - g.degree(a));
  S.caminho = { nos: new Set(ids), arestas: new Set(g.filterEdges((k, a, s, d) => ids.includes(s) && ids.includes(d))) };
  S.renderer && S.renderer.refresh();
  const html = `<span class="etq">Grupo de assuntos</span><h2>${esc(gr.nome)}</h2><p class="nota">${ids.length} elementos que se ligam mais entre si do que com o resto do mapa (agrupamento automático).</p>` +
    ids.map((id) => `<div class="lig"><div class="lig-topo"><span class="amostra" style="background:${g.getNodeAttribute(id, 'color')}"></span><button class="lig-alvo" data-ir="${esc(id)}">${esc(lab(id))}</button><span class="etq">${esc((TIPOS[g.getNodeAttribute(id, 'tipo')] || {}).nome || '')}</span></div></div>`).join('') +
    '<div class="botoes"><button class="bt" data-acao="limpar-caminho">Tirar o destaque</button></div>';
  if (S.modo === 'lista') $('lista').innerHTML = `<div class="cartao">${html}</div>`;
  else { $('painel-corpo').innerHTML = html; $('painel').hidden = false; }
}
function realcar(k, v) {
  if (S.realce && S.realce.k === k && S.realce.v === v) { S.realce = null; montarLegenda(); S.renderer && S.renderer.refresh(); if (S.sel) painelNo(S.sel); return; }
  S.realce = { k, v }; S.caminho = null;
  montarLegenda(); S.renderer && S.renderer.refresh();
  const g = S.graph;
  let html;
  if (k === 'tipo') {
    const ids = g.filterNodes((id, a) => a.tipo === v && visivelNo(id, a)).sort((a, b) => g.degree(b) - g.degree(a));
    html = `<span class="etq">Legenda · ${esc((TIPOS[v] || {}).nome || v)}</span><h2>${ids.length} no mapa</h2>` +
      (ids.length ? ids.slice(0, 120).map((id) => `<div class="lig"><div class="lig-topo"><span class="amostra" style="background:${g.getNodeAttribute(id, 'color')}"></span><button class="lig-alvo" data-ir="${esc(id)}">${esc(lab(id))}</button><span class="etq">${g.degree(id)} ligação(ões)</span></div></div>`).join('')
        : '<p class="nota">Nenhum elemento deste tipo no mapa agora. Expanda passagens, use Descobrir ou Entidades.</p>');
  } else {
    const ks = g.filterEdges((e, a) => a.dados && a.dados.classe === v && visivelAresta(e));
    html = `<span class="etq">Legenda · ${esc((CLASSES[v] || {}).nome || v)}</span><h2>${ks.length} ligação(ões)</h2><p class="nota">${esc((CLASSES[v] || {}).ajuda || '')}</p>` +
      (ks.length ? ks.slice(0, 120).map((e) => { const s = g.source(e), d = g.target(e), a = g.getEdgeAttribute(e, 'dados');
        return `<div class="lig"><div class="lig-topo"><button class="lig-alvo" data-ir="${esc(s)}">${esc(lab(s))}</button><span class="etq">${esc(TIPO_LIG[a.tipo] || a.tipo)} →</span><button class="lig-alvo" data-ir="${esc(d)}">${esc(lab(d))}</button></div><p>${esc(a.explica || '')}</p>${evidenciasHtml(a.evidencias)}</div>`; }).join('')
        : '<p class="nota">Nenhuma ligação neste estado no mapa agora.</p>');
  }
  html += '<div class="botoes"><button class="bt" data-realce="limpar">Tirar o destaque</button></div>';
  if (S.modo === 'lista') $('lista').innerHTML = `<div class="cartao">${html}</div>`;
  else { $('painel-corpo').innerHTML = html; $('painel').hidden = false; }
}

// ── controle do pesquisador ────────────────────────────────────────────────
function alternar(id, attr) {
  const g = S.graph; if (!g.hasNode(id)) return;
  const v = !g.getNodeAttribute(id, attr);
  g.setNodeAttribute(id, attr, v);
  if (attr === 'fixado') g.setNodeAttribute(id, 'fixed', v);
  if (attr === 'oculto') { S.caminho = null; if (v && S.sel === id) { S.sel = null; $('painel').hidden = true; } montarFiltros(); calcularGrupos(); aviso(`"${lab(id)}" ocultado. Para ver de novo: Filtros › Mostrar elementos ocultados.`); }
  S.renderer?.refresh();
  if (S.sel === id) (S.modo === 'lista' ? desenharLista : painelNo)(id);
}

// ── caminho entre quaisquer dois elementos ─────────────────────────────────
function caminhoLocal(a, b) {
  const g = S.graph, pai = new Map([[a, null]]), fila = [a];
  while (fila.length) {
    const x = fila.shift();
    if (x === b) break;
    g.forEachNeighbor(x, (v, at) => { if (!pai.has(v) && at.tipo !== 'mais' && !at.oculto) { pai.set(v, x); fila.push(v); } });
  }
  if (!pai.has(b)) return null;
  const c = []; for (let k = b; k != null; k = pai.get(k)) c.unshift(k);
  return c;
}
function mostrarCaminho(passos, origemTxt) {
  const g = S.graph, nos = new Set(passos), arestas = new Set();
  for (let i = 1; i < passos.length; i++) { const k = g.edge(passos[i - 1], passos[i]) || g.edge(passos[i], passos[i - 1]); if (k) arestas.add(k); }
  S.caminho = { nos, arestas };
  S.renderer?.refresh();
  const linhas = passos.map((p, i) => {
    let rel = '';
    if (i) { const k = g.edge(passos[i - 1], p) || g.edge(p, passos[i - 1]); const d = k && g.getEdgeAttribute(k, 'dados'); if (d) rel = ` ${etiqueta(d.classe)} <span class="nota">${esc(d.explica || '')}</span>`; }
    return `<li><button class="lig-alvo" data-ir="${esc(p)}">${esc(lab(p))}</button>${rel}</li>`;
  }).join('');
  $('painel-corpo').innerHTML = `<span class="etq">Caminho de conhecimento</span><h2>${esc(lab(passos[0]))} → ${esc(lab(passos[passos.length - 1]))}</h2><p class="nota">${esc(origemTxt)}</p><ol class="caminho-lista">${linhas}</ol>
    <div class="botoes"><button class="bt" data-acao="limpar-caminho">Limpar destaque</button>${origemTxt.includes('mapa atual') ? `<button class="bt bt-ouro" data-acao="caminho-fontes" data-de="${esc(passos[0])}" data-para="${esc(passos[passos.length - 1])}">Procurar caminho nas fontes</button>` : ''}</div>`;
  $('painel').hidden = false;
  if (S.modo === 'lista') { $('lista').innerHTML = `<div class="cartao">${$('painel-corpo').innerHTML}</div>`; $('painel').hidden = true; }
}
async function caminhoEntre(de, para, forcarFontes) {
  if (!forcarFontes) {
    const local = caminhoLocal(de, para);
    if (local && local.length > 1) { mostrarCaminho(local, 'Caminho INDIRETO pelas ligações já abertas no mapa atual. Cada passo tem sua própria evidência; o caminho em si não prova dependência entre as pontas.'); S.origemCaminho = null; return; }
  }
  ocupado(true);
  try {
    const j = await api({ acao: 'caminho', de, para }, true);
    if (!j.ok) { if (j.motivo === 'particular') pedirPin(); else aviso(j.err || 'Falhou.'); return; }
    if (!j.passos.length) { aviso(j.aviso || 'Sem caminho curto nas fontes atuais.'); return; }
    mesclar(j, de);
    S.origemCaminho = null;
    mostrarCaminho(j.passos.filter((p) => S.graph.hasNode(p)), 'Caminho INDIRETO encontrado nas fontes (referências cruzadas e ligações documentadas das pontas). Não demonstra dependência literária direta.');
  } finally { ocupado(false); }
}

// ── entidades (piloto): pessoas, lugares, acontecimentos, obras, tradições e termos nas fontes da passagem ──
async function entidades(id) {
  if (!S.aberto) { pedirPin(); return; }
  ocupado(true);
  try {
    const j = await api({ acao: 'entidades', id }, true);
    if (!j.ok) { if (j.motivo === 'particular') pedirPin(); else aviso(j.err || 'Falhou.'); return; }
    mesclar(j, id);
    const amb = (j.ambiguas || []).slice(0, 12).map((a) => `<div class="ev-item"><b>${esc(a.forma)}</b> pode ser: ${esc(a.opcoes.join(' · '))}<q>${esc(a.contexto)}</q><div class="nota">${esc(a.fonte)} · trecho ${esc(a.trecho)} · posição ${a.pos}</div></div>`).join('');
    const cand = (j.candidatos || []).map((c) => `<span class="etq" title="${esc(c.exemplo)}">${esc(c.forma)} (${c.ocorrencias})</span>`).join(' ');
    const html = `<span class="etq">Entidades (piloto)</span><h2>${esc(lab(id))}</h2>
      <p class="nota">${j.resumo.entidades} entidades e ${j.resumo.mencoes} menções em ${j.resumo.trechos} trechos (${j.resumo.ms} ms). As principais entraram no mapa; cada uma mostra as menções com obra, camada (texto antigo, provável editor, obra moderna) e posição no trecho.</p>
      <h3>Ambíguas (não atribuídas)</h3>${amb || '<p class="nota">Nenhuma.</p>'}
      <h3>Candidatas para revisão (fora do catálogo; não unidas a nada)</h3><p>${cand || '<span class="nota">Nenhuma.</span>'}</p>`;
    if (S.modo === 'lista') $('lista').innerHTML = `<div class="cartao">${html}</div>`;
    else { $('painel-corpo').innerHTML = html; $('painel').hidden = false; }
  } finally { ocupado(false); }
}

// ── motor de descoberta ───────────────────────────────────────────────────
async function descobrir(id) {
  if (!S.aberto) { pedirPin(); return; }
  ocupado(true);
  try {
    const j = await api({ acao: 'descobrir', id }, true);
    if (!j.ok) { if (j.motivo === 'particular') pedirPin(); else aviso(j.err || 'Falhou.'); return; }
    S.ultimaDescoberta = j;
    const blocos = j.blocos.map((b, bi) => `<div class="bloco"><div class="bloco-topo"><h4>${esc(b.titulo)}</h4>${etiqueta(b.estado || ESTADO_ANTIGO[b.classe] || b.classe)}</div><div class="grau"><span class="etq">${esc(NATRELS[b.natRel] || '')}</span><span class="etq">${esc(METODOS[b.metodo] || '')}</span></div><div class="como">${esc(b.como)}</div>${
      b.itens.length ? b.itens.slice(0, 10).map((it, ii) => `<button class="item" data-bloco="${bi}" data-item="${ii}"><b>${esc(it.rotulo)}</b><small>${esc(it.detalhe || '')}</small></button>`).join('') : '<p class="nota">Nada encontrado nas fontes atuais.</p>'
    }</div>`).join('');
    const html = `<span class="etq">Motor de descoberta</span><h2>${esc(j.foco.rotulo)}</h2>
      <p class="nota">Cada resultado vem de uma consulta às fontes do RADAR. Toque num item para trazê-lo ao mapa com a fonte.</p>
      <div class="botoes"><button class="bt bt-ouro" data-acao="explicar" data-id="${esc(id)}">Explicar com IA (cita as fontes)</button></div><div id="explicacao"></div>${blocos}`;
    if (S.modo === 'lista') $('lista').innerHTML = `<div class="cartao">${html}</div>`;
    else { $('painel-corpo').innerHTML = html; $('painel').hidden = false; }
  } finally { ocupado(false); }
}
function trazerItem(bi, ii) {
  const j = S.ultimaDescoberta; if (!j) return;
  const b = j.blocos[bi], it = b.itens[ii], foco = j.foco.id;
  if (!S.graph.hasNode(foco)) mesclar({ nos: [j.foco], arestas: [] });
  if (b.algoritmo === 'caminhos' && it.passos) {
    const rot = it.rotulo.split(' → ');
    mesclar({ nos: it.passos.map((p, i) => ({ id: p, tipo: 'passagem', rotulo: rot[i] || p })),
      arestas: it.passos.slice(1).map((p, i) => ({ id: 'caminho|' + it.passos[i] + '|' + p, de: it.passos[i], para: p, tipo: 'caminho', estado: 'hipotese', natRel: 'interpretativa', metodo: 'caminho_grafo', explica: 'Passo de um caminho INDIRETO por referências cruzadas (OpenBible). Não demonstra dependência literária.' })) }, foco);
    mostrarCaminho(it.passos, 'Caminho INDIRETO calculado pelo motor de descoberta. Mostra por onde as passagens se ligam; não demonstra dependência literária direta.');
    return;
  }
  const pref = it.alvo.split(':')[0];
  const tipo = { p: 'passagem', o: 'obra', c: 'conceito', l: 'verbete', d: 'descoberta' }[pref] || 'passagem';
  const tipoLig = { 'conexoes-pouco-evidentes': 'co-citacao', 'refcruz-relevantes': 'refcruz', 'autores-mesma-passagem': 'comenta', 'citacoes-literais': 'cita', 'apoio-patristico': 'cita', 'temas-recorrentes': 'mencao', 'relacoes-lexicais': 'lexical', 'descobertas-oficina': 'descoberta' }[b.algoritmo] || 'descoberta';
  const de = tipo === 'passagem' ? foco : it.alvo, para = de === foco ? it.alvo : foco;
  mesclar({ nos: [{ id: it.alvo, tipo, rotulo: it.rotulo.replace(/ \(.*\)$/, ''), texto: it.texto || null }],
    arestas: [{ id: tipoLig + '|' + de + '|' + para, de, para, tipo: tipoLig, estado: it.estado || b.estado, natRel: b.natRel, metodo: b.metodo, independentes: it.independentes, peso: 1, explica: `${b.titulo}: ${it.detalhe || ''}`, evidencias: it.evidencias || [] }] }, foco);
  selecionar(it.alvo, true);
}
async function explicar(id) {
  const caixa = $('explicacao'); if (!caixa) return;
  caixa.innerHTML = '<p class="nota">A IA está lendo as fontes…</p>';
  const j = await api({ acao: 'explicar', id, investigacao: S.investigacao && S.investigacao.id }).catch((e) => ({ ok: false, err: e.message }));
  if (!j.ok) { caixa.innerHTML = `<div class="aviso">${esc(j.err || 'A IA não respondeu agora.')}</div>`; return; }
  S.evidExp = j.evidencias || [];
  const html = esc(j.texto).split(/\n\s*\n/).map((p) => '<p>' + p.replace(/\[E(\d+)\]/g, (m, n) => `<button class="marca-ev" data-ev="${n}">E${n}</button>`) + '</p>').join('');
  caixa.innerHTML = `<h3>Interpretação</h3>${etiqueta('inferencia')}<div class="explicacao">${html}</div><p class="nota">Gerado por IA${j.provedor ? ' (' + esc(j.provedor) + (j.modelo ? ' · ' + esc(j.modelo) : '') + ')' : ''} · ${j.reaproveitado ? 'resposta reaproveitada, sem custo' : 'custo US$ ' + Number(j.custo_usd || 0).toFixed(4)}${j.motivo ? ' · ' + esc(j.motivo) : ''} · somente a partir das fontes numeradas; parágrafos sem fonte válida foram descartados (${j.descartados || 0}). Toque em E1, E2… para ver a fonte.</p><div id="ev-aberta"></div>`;
}
function mostrarEvidenciaNumero(n) {
  const e = (S.evidExp || []).find((x) => String(x.n) === String(n)); if (!e) return;
  $('ev-aberta').innerHTML = `<div class="ev-item"><b>E${e.n}</b> ${etiqueta(e.natureza)} · ${esc(e.bloco)} — ${esc(e.item)}<br><b>${esc(e.autor || '')}</b>${e.obra ? ' · ' + esc(e.obra) : ''}${e.secao ? ' · ' + esc(e.secao) : ''}${e.trecho ? `<q>${esc(e.trecho)}</q>` : ''}</div>`;
}

// ── investigações (banco do NEXUS; reserva no aparelho se o banco não responder) ─
function estadoAtual() {
  return { versao: 2, grafo: S.graph.export(), trilha: S.trilha, foco: S.foco, sel: S.sel, expandidos: [...S.expandidos], notas: S.notas,
    filtros: { ...S.filtros, areas: [...S.filtros.areas], classes: [...S.filtros.classes], naturezas: [...S.filtros.naturezas], metodos: [...S.filtros.metodos] } };
}
function restaurar(est) {
  S.graph.clear();
  S.graph.import(est.grafo);
  if (!S.aberto) tirarExternos();
  S.trilha = est.trilha || []; S.foco = est.foco || null; S.expandidos = new Set(est.expandidos || []); S.notas = est.notas || {};
  if (est.filtros && est.filtros.areas) S.filtros = { ...est.filtros, areas: new Set(est.filtros.areas), classes: new Set((est.filtros.classes || []).map((c) => ESTADO_ANTIGO[c] || c)), naturezas: new Set(est.filtros.naturezas || Object.keys(NATRELS)), metodos: new Set(est.filtros.metodos || Object.keys(METODOS)) };
  montarFiltros(); atualizarVazio(); calcularGrupos();
  if (est.sel && S.graph.hasNode(est.sel)) selecionar(est.sel, true); else desenharTrilha();
  enquadrar();
}
const locais = () => { try { return JSON.parse(ler('nexus_investigacoes_local') || '[]'); } catch (_) { return []; } };
function salvarDialogo() {
  if (!S.graph.order) { aviso('O mapa está vazio.'); return; }
  const sug = S.investigacao ? S.investigacao.titulo : (S.foco ? 'Investigação: ' + lab(S.foco) : 'Investigação');
  abrirModal(`<h2>Salvar investigação</h2><p class="nota">Guarda o mapa (com o que você fixou, ocultou e destacou), a trilha, as notas e os filtros. Abra depois em qualquer aparelho com o mesmo PIN.</p><input type="text" id="inv-titulo" maxlength="120" value="${esc(sug)}"><div class="botoes"><button class="bt bt-ouro" id="inv-ok">Salvar</button></div><div id="inv-msg"></div>`);
  $('inv-ok').onclick = async () => {
    const titulo = $('inv-titulo').value.trim() || 'Investigação';
    if (!S.aberto) { pedirPin(); return; }
    const j = await api({ acao: 'salvar', titulo, foco: S.foco, estado: estadoAtual(), investigacao: S.investigacao && S.investigacao.id });
    if (j.ok) { S.investigacao = { id: j.investigacao.id, titulo }; fecharModal(); aviso('Investigação salva no banco do NEXUS.'); return; }
    if (j.motivo === 'sem-banco') {
      const l = locais().filter((x) => x.titulo !== titulo); l.unshift({ id: 'local-' + Date.now(), titulo, foco: S.foco, atualizado_em: new Date().toISOString(), estado: estadoAtual() });
      gravar('nexus_investigacoes_local', JSON.stringify(l.slice(0, 20)));
      $('inv-msg').innerHTML = `<div class="aviso">${esc(j.err)}</div>`;
      return;
    }
    $('inv-msg').innerHTML = `<div class="aviso">${esc(j.err || 'Não salvou.')}</div>`;
  };
}
async function investigacoesDialogo() {
  abrirModal('<h2>Investigações</h2><div id="inv-lista"><p class="nota">Carregando…</p></div>');
  let srv = [], msg = '';
  if (S.aberto) { const j = await api({ acao: 'listar' }); if (j.ok) srv = j.investigacoes; else msg = j.err || ''; }
  else msg = 'Entre com o PIN para ver as investigações salvas no servidor.';
  const loc = locais();
  const linha = (x, local) => `<div class="inv"><button class="abrir" data-inv="${esc(x.id)}" data-local="${local ? 1 : 0}">${esc(x.titulo)}<br><small>${new Date(x.atualizado_em).toLocaleString('pt-BR')}${local ? ' · só neste aparelho' : ''}</small></button><button class="bt" data-apagar="${esc(x.id)}" data-local="${local ? 1 : 0}">Apagar</button></div>`;
  if (S.aberto) {
    const c = await api({ acao: 'ia-consumo', investigacao: S.investigacao && S.investigacao.id });
    if (c.ok) {
      const cfg = c.config || {};
      $('modal-corpo').insertAdjacentHTML('beforeend', `<h3>IA paga (Claude) neste mês</h3><p>US$ ${Number(c.gasto_mes_usd || 0).toFixed(2)} de US$ ${Number(cfg.orcamento_mensal_usd).toFixed(2)} · ${c.chamadas_mes || 0} chamada(s)${S.investigacao ? ` · esta investigação: US$ ${Number(c.gasto_investigacao_usd || 0).toFixed(3)}` : ''}</p>
        <p class="nota">Modelos: leve ${esc(c.modelos.leve)} · padrão ${esc(c.modelos.padrao)} · profundo ${esc(c.modelos.profundo)}. Quando o limite acaba, o NEXUS desce de modelo e por fim usa a IA gratuita do RADAR.${c.banco ? '' : ' O banco do NEXUS não está ligado aqui: o controle de gasto só vale no site.'}</p>
        <label class="nota">Limite por mês (US$) <input type="text" id="ia-orc" value="${esc(cfg.orcamento_mensal_usd)}" style="width:90px"></label>
        <label class="nota">Limite por investigação (US$) <input type="text" id="ia-lim" value="${esc(cfg.limite_investigacao_usd)}" style="width:90px"></label>
        <label class="nota"><input type="checkbox" id="ia-lig" ${cfg.ligado ? 'checked' : ''}> IA paga ligada</label>
        <div class="botoes"><button class="bt" id="ia-salvar">Salvar limites</button></div><div id="ia-msg"></div>`);
      $('ia-salvar').onclick = async () => {
        const r = await api({ acao: 'ia-config', config: { orcamento_mensal_usd: Number(String($('ia-orc').value).replace(',', '.')), limite_investigacao_usd: Number(String($('ia-lim').value).replace(',', '.')), ligado: $('ia-lig').checked } });
        $('ia-msg').innerHTML = `<div class="aviso">${r.ok ? 'Limites salvos.' : esc(r.err || 'Não salvou.')}</div>`;
      };
    }
  }
  if (S.aberto) {
    const ix = await api({ acao: 'indice-patristico' });
    const caixa = `<h3>Índice patrístico</h3><div id="ix-estado"></div><div class="botoes"><button class="bt" id="ix-montar">Montar índice patrístico</button></div>`;
    $('modal-corpo').insertAdjacentHTML('beforeend', caixa);
    const mostrar = (e) => {
      if (!e.ok) { $('ix-estado').innerHTML = `<p class="nota">${esc(e.err || 'indisponível')}</p>`; $('ix-montar').hidden = true; return; }
      const cam = (e.por_camada || []).map((x) => `${x.camada === 'editor_provavel' ? 'provável texto do editor' : 'não classificado'}: ${x.n}`).join(' · ');
      $('ix-estado').innerHTML = `<p class="nota">${e.feito ? 'Pronto' : 'Em montagem'}: ${e.lidos || 0} de ${e.total || '?'} trechos lidos · ${e.refs || 0} citações indexadas${e.fora_canon ? ` · ${e.fora_canon} de livros fora do cânon protestante (não indexados)` : ''}${e.invalidas ? ` · ${e.invalidas} com capítulo/versículo inexistente (descartadas)` : ''}${cam ? ' · ' + cam : ''}. Grava só ponteiros no banco do NEXUS; o texto continua na biblioteca.</p>`;
      $('ix-montar').hidden = !!e.feito;
    };
    mostrar(ix);
    $('ix-montar').onclick = async () => {
      $('ix-montar').disabled = true;
      for (let i = 0; i < 40; i++) {
        const e = await api({ acao: 'indice-patristico', montar: true });
        mostrar(e);
        if (!e.ok || e.feito) break;
      }
      $('ix-montar').disabled = false;
    };
  }
  $('inv-lista').innerHTML = (msg ? `<div class="aviso">${esc(msg)}</div>` : '') + (srv.map((x) => linha(x, false)).join('') + loc.map((x) => linha(x, true)).join('') || '<p class="nota">Nenhuma investigação salva ainda.</p>');
}

// ── PIN (a mesma porta da Oficina e dos livros particulares) ───────────────
function pedirPin() {
  abrirModal(`<h2>Biblioteca particular</h2><p class="nota">Autores, obras, termos originais, conceitos, descobertas e investigações usam os livros da sua biblioteca. Digite o PIN (o mesmo da Oficina).</p><input type="password" id="pin" class="pin" inputmode="numeric" maxlength="8" placeholder="••••" autocomplete="off"><div class="botoes"><button class="bt bt-ouro" id="pin-ok">Entrar</button></div><div id="pin-msg"></div>`);
  setTimeout(() => $('pin') && $('pin').focus(), 50);
  const ir = async () => {
    const v = $('pin').value.trim(); if (!v) return;
    const r = await fetch('/api/livro-particular', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: v }), cache: 'no-store' }).then((x) => x.json()).catch(() => ({}));
    if (r.ok && r.token) {
      gravar('lp_token', r.token); definirAcesso(true); fecharModal(); S.cache.clear();
      const alvo = S.sel || S.foco; if (alvo) { S.expandidos.delete(alvo); await expandir(alvo); selecionar(alvo); }
      return;
    }
    $('pin-msg').innerHTML = `<div class="aviso">${r.motivo === 'travado' ? 'Muitas tentativas. Aguarde uma hora.' : 'PIN não confere.'}</div>`;
  };
  $('pin-ok').onclick = ir;
  $('pin').onkeydown = (e) => { if (e.key === 'Enter') ir(); };
}

// ── utilidades de interface ───────────────────────────────────────────────
function abrirModal(html) { $('modal-corpo').innerHTML = html; $('modal').hidden = false; }
function fecharModal() { $('modal').hidden = true; }
function atualizarVazio() {
  const el = $('vazio');
  if (S.graph.order) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<div><h2>Por onde começar a investigação?</h2><p>Digite uma passagem ou escolha um ponto de partida. Cada ligação mostra a fonte que a sustenta.</p><div class="sugestoes">${['João 1:1', 'Gênesis 1:1', 'Provérbios 8:22', 'Colossenses 1:15'].map((r) => `<button data-ref="${r}">${r}</button>`).join('')}</div></div>`;
}

// ── Sigma ─────────────────────────────────────────────────────────────────
function iniciarSigma() {
  S.renderer = new Sigma(S.graph, $('mapa'), {
    renderEdgeLabels: false, enableEdgeEvents: true, defaultEdgeType: 'arrow', zIndex: true,
    labelFont: 'Inter, system-ui, sans-serif', labelSize: 13, labelWeight: '600', labelColor: { color: '#1B2333' },
    labelRenderedSizeThreshold: 7, labelDensity: 0.6, labelGridCellSize: 110, minCameraRatio: 0.08, maxCameraRatio: 6, allowInvalidContainer: true,
    nodeReducer: (id, a) => {
      const r = { ...a };
      if (!visivelNo(id, a)) { r.hidden = true; return r; }
      if (a.oculto) r.color = '#E5E1D6';
      const cam = S.caminho, foco = S.hover || S.sel, rc = S.realce;
      if (rc && !S.hover) {
        const dentro = rc.k === 'tipo' ? a.tipo === rc.v : S.graph.someEdge(id, (e, ad) => ad.dados && ad.dados.classe === rc.v);
        if (!dentro) { r.color = '#E3DED2'; r.label = ''; r.zIndex = 0; } else { r.zIndex = 2; if (rc.k === 'tipo') r.forceLabel = true; }
        return r;
      }
      if (cam) { if (!cam.nos.has(id)) { r.color = '#E3DED2'; r.label = ''; r.zIndex = 0; } else { r.zIndex = 2; r.forceLabel = true; r.highlighted = true; } }
      else if (foco && foco !== id && !S.graph.areNeighbors(foco, id)) { r.color = '#D9D4C7'; r.label = a.destaque ? a.label : ''; r.zIndex = 0; }
      else r.zIndex = 1;
      if (a.destaque) { r.highlighted = true; r.forceLabel = true; r.size = a.size * 1.35; }
      if (id === S.sel) { r.highlighted = true; r.size = a.size * 1.25; r.zIndex = 3; }
      if (id === S.sel || id === S.hover || id === S.foco) r.forceLabel = true;
      if (a.fixado && id !== S.foco) r.label = (r.label || '') && '📌 ' + r.label;
      return r;
    },
    edgeReducer: (k, a) => {
      const r = { ...a };
      if (!visivelAresta(k)) { r.hidden = true; return r; }
      const cam = S.caminho, foco = S.hover || S.sel, rc = S.realce;
      if (rc && !S.hover) {
        const dentro = rc.k === 'estado' ? a.dados && a.dados.classe === rc.v : S.graph.getNodeAttribute(S.graph.source(k), 'tipo') === rc.v || S.graph.getNodeAttribute(S.graph.target(k), 'tipo') === rc.v;
        if (!dentro) { r.color = '#EEE9DE'; r.size = 0.5; } else if (rc.k === 'estado') r.size = a.size * 2;
        return r;
      }
      if (cam) { if (!cam.arestas.has(k)) { r.color = '#EEE9DE'; r.size = 0.5; } else { r.size = 4; } }
      else if (foco && !S.graph.hasExtremity(k, foco)) { r.color = '#ECE7DB'; r.size = 0.6; }
      if (k === S.selAresta) r.size = a.size * 2.2;
      return r;
    },
  });
  const R = S.renderer;
  R.on('clickNode', ({ node }) => { if (S.moveu) return; selecionar(node, false); });
  R.on('doubleClickNode', (e) => { e.preventSigmaDefault && e.preventSigmaDefault(); selecionar(e.node, false); expandir(e.node); });
  R.on('enterNode', ({ node }) => { S.hover = node; R.refresh(); });
  R.on('leaveNode', () => { S.hover = null; R.refresh(); });
  R.on('clickEdge', ({ edge }) => painelAresta(edge));
  R.on('clickStage', () => { S.selAresta = null; if (S.caminho) { S.caminho = null; } R.refresh(); });
  // arrastar = mover e fixar (a organização automática respeita o que foi fixado)
  R.on('downNode', (e) => { S.arrastando = e.node; S.moveu = false; R.getCamera().disable(); });
  R.getMouseCaptor().on('mousemovebody', (e) => {
    if (!S.arrastando) return;
    const p = R.viewportToGraph(e);
    S.graph.mergeNodeAttributes(S.arrastando, { x: p.x, y: p.y, fixado: true, fixed: true });
    S.moveu = true;
    e.preventSigmaDefault(); e.original.preventDefault(); e.original.stopPropagation();
  });
  const soltar = () => { if (S.arrastando) { R.getCamera().enable(); if (S.moveu) { calcularGrupos(); if (S.sel === S.arrastando) painelNo(S.sel); } setTimeout(() => { S.moveu = false; }, 50); } S.arrastando = null; };
  R.getMouseCaptor().on('mouseup', soltar);
  try {
    R.getTouchCaptor().on('touchmove', (e) => {
      if (!S.arrastando || !e.touches || e.touches.length !== 1) return;
      const p = R.viewportToGraph(e.touches[0]);
      S.graph.mergeNodeAttributes(S.arrastando, { x: p.x, y: p.y, fixado: true, fixed: true });
      S.moveu = true; e.preventSigmaDefault && e.preventSigmaDefault();
    });
    R.getTouchCaptor().on('touchup', soltar);
  } catch (_) { /* sem captor de toque */ }
  R.getCamera().on('updated', () => desenharGrupos());
}

// ── eventos ───────────────────────────────────────────────────────────────
function ligarEventos() {
  $('busca').addEventListener('submit', (e) => { e.preventDefault(); explorar($('ref').value); });
  $('bt-descobrir').onclick = () => { const id = S.sel && S.graph.getNodeAttribute(S.sel, 'tipo') === 'passagem' ? S.sel : S.foco; if (id) descobrir(id); else aviso('Escolha uma passagem primeiro.'); };
  $('bt-salvar').onclick = salvarDialogo;
  $('bt-investigacoes').onclick = investigacoesDialogo;
  $('bt-ceu').onclick = () => {
    S.trocouModo = true;
    if (S.modo === 'ceu') definirModo('mapa');
    else abrirCeu();
  };
  $('bt-modo').onclick = () => {
    S.trocouModo = true;
    if (S.modo !== 'lista') definirModo('lista');
    else if (S.renderer) definirModo('mapa');
    else abrirCeu();
  };
  document.body.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'touch') ceu?.prever(previaDoControle(e.target));
  });
  document.body.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'touch') ceu?.prever(previaDoControle(e.relatedTarget instanceof Element ? e.relatedTarget : null));
  });
  document.body.addEventListener('focusin', (e) => ceu?.prever(previaDoControle(e.target)));
  document.body.addEventListener('focusout', () => ceu?.prever(null));
  $('acesso').onclick = () => { if (!S.aberto) pedirPin(); else investigacoesDialogo(); };
  $('painel-fechar').onclick = () => { $('painel').hidden = true; S.selAresta = null; S.renderer?.refresh(); };
  $('modal-fechar').onclick = fecharModal;
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') fecharModal(); });
  $('filtros-alca').onclick = () => { const f = $('filtros'); f.classList.toggle('aberto'); $('filtros-alca').setAttribute('aria-expanded', f.classList.contains('aberto')); };
  $('z-mais').onclick = () => S.modo === 'ceu' ? ceu.zoom(0.8) : S.renderer?.getCamera().animatedZoom({ duration: 250 });
  $('z-menos').onclick = () => S.modo === 'ceu' ? ceu.zoom(1.25) : S.renderer?.getCamera().animatedUnzoom({ duration: 250 });
  $('z-centro').onclick = enquadrar;
  $('z-grupos').onclick = () => { S.grupos = !S.grupos; $('z-grupos').setAttribute('aria-pressed', S.grupos); calcularGrupos(); };
  $('z-reorganizar').onclick = () => rodarLayout(3000);

  $('filtros-corpo').addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.f) { const s = S.filtros[t.dataset.f]; t.checked ? s.add(t.value) : s.delete(t.value); }
    if (t.name === 'test') S.filtros.testamento = t.value;
    if (t.id === 'ver-ocultos') S.filtros.ocultos = t.checked;
    aplicarFiltros();
  });
  $('filtros-corpo').addEventListener('input', (e) => {
    if (e.target.id === 'votos') { S.filtros.votos = +e.target.value; $('votos-v').textContent = S.filtros.votos; aplicarFiltros(); }
    if (e.target.id === 'busca-mapa') {
      const q = e.target.value.trim().toLowerCase(); if (q.length < 2) return;
      const achado = S.graph.findNode((id, a) => String(a.label || '').toLowerCase().includes(q));
      if (achado) selecionar(achado, true);
    }
  });
  document.body.addEventListener('input', (e) => { if (e.target.id === 'nota-texto') S.notas[e.target.dataset.id] = e.target.value; });

  // delegação: painel, lista, trilha, modal, sugestões
  document.body.addEventListener('click', (e) => {
    const t = e.target.closest('[data-acao],[data-ir],[data-id].passo,[data-bloco],[data-ev],[data-ref],[data-inv],[data-apagar],[data-aba],[data-realce],[data-grupo]');
    if (!t) return;
    if (t.dataset.realce) { if (t.dataset.realce === 'limpar') { S.realce = null; montarLegenda(); S.renderer && S.renderer.refresh(); if (S.sel) painelNo(S.sel); else $('painel').hidden = true; return; } const [k, v] = t.dataset.realce.split(':'); realcar(k, v); return; }
    if (t.dataset.grupo != null) { abrirGrupo(+t.dataset.grupo); return; }
    if (t.dataset.aba) { S.aba = t.dataset.aba; if (S.sel) (S.modo === 'lista' ? desenharLista : painelNo)(S.sel); return; }
    if (t.dataset.ref) { $('ref').value = t.dataset.ref; explorar(t.dataset.ref); return; }
    if (t.classList.contains('passo')) { selecionar(t.dataset.id, true); return; }
    if (t.dataset.ir) { const id = t.dataset.ir; S.caminho = null; if (id.startsWith('mais:')) { if (S.graph.hasNode(id)) trazerMais(id); return; } selecionar(id, true); if (S.modo === 'lista' && !S.expandidos.has(id)) expandir(id); return; }
    if (t.dataset.bloco != null && t.dataset.item != null) { trazerItem(+t.dataset.bloco, +t.dataset.item); return; }
    if (t.dataset.ev) { mostrarEvidenciaNumero(t.dataset.ev); return; }
    if (t.dataset.inv) {
      if (t.dataset.local === '1') { const x = locais().find((k) => k.id === t.dataset.inv); if (x) { restaurar(x.estado); S.investigacao = null; fecharModal(); } return; }
      api({ acao: 'abrir', investigacao: t.dataset.inv }).then((j) => { if (j.ok) { restaurar(j.investigacao.estado); S.investigacao = { id: j.investigacao.id, titulo: j.investigacao.titulo }; fecharModal(); } else aviso(j.err || 'Não abriu.'); });
      return;
    }
    if (t.dataset.apagar) {
      if (!confirm('Apagar esta investigação salva?')) return;
      if (t.dataset.local === '1') { gravar('nexus_investigacoes_local', JSON.stringify(locais().filter((k) => k.id !== t.dataset.apagar))); investigacoesDialogo(); return; }
      api({ acao: 'apagar', investigacao: t.dataset.apagar }).then(() => investigacoesDialogo());
      return;
    }
    const id = t.dataset.id;
    switch (t.dataset.acao) {
      case 'expandir': expandir(id).then(() => selecionar(id)); break;
      case 'descobrir': descobrir(id); break;
      case 'entidades': entidades(id); break;
      case 'explicar': explicar(id); break;
      case 'origem': S.origemCaminho = id; aviso('Origem marcada. Agora escolha outro elemento e toque em "Caminho desde…".'); selecionar(id); break;
      case 'caminho': caminhoEntre(S.origemCaminho, id); break;
      case 'caminho-foco': caminhoEntre(S.foco, id); break;
      case 'caminho-fontes': caminhoEntre(t.dataset.de, t.dataset.para, true); break;
      case 'limpar-caminho': S.caminho = null; S.renderer?.refresh(); if (S.sel) painelNo(S.sel); break;
      case 'centralizar': selecionar(id, true); break;
      case 'fixar': alternar(id, 'fixado'); break;
      case 'destacar': alternar(id, 'destaque'); break;
      case 'ocultar': alternar(id, 'oculto'); break;
    }
  });
  window.addEventListener('resize', () => { if (pequeno() && S.modo === 'mapa' && !S.trocouModo) definirModo('lista'); desenharGrupos(); });
}

// ── início ────────────────────────────────────────────────────────────────
// O aplicativo do RADAR guarda as páginas para abrir rápido e avisa quando chega versão nova. A página do NEXUS
// passa a ouvir esse aviso e se recarrega uma vez, para nunca ficar uma versão atrasada.
try {
  navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type !== 'VERSAO_NOVA' || !/\/nexus\//.test(String(d.url || ''))) return;
    const ultima = +(sessionStorage.getItem('nx_recarregou') || 0);
    if (Date.now() - ultima < 60000) return;
    sessionStorage.setItem('nx_recarregou', String(Date.now()));
    location.reload();
  });
} catch (_) { /* sem service worker */ }
try { iniciarSigma(); } catch (erro) {
  S.renderer = null;
  console.warn('Mapa 2D:', erro);
}
ligarEventos();
montarLegenda();
montarFiltros();
definirAcesso(false);
atualizarVazio();
if (pequeno() || !S.renderer) definirModo('lista');
abrirCeu();
explorar(new URLSearchParams(location.search).get('ref') || 'João 1:1', true);
