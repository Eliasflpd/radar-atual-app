// NEXUS BÍBLICO — o mapa de conhecimento (cliente). Sigma.js 3 + Graphology + ForceAtlas2 (em segundo plano).
// Todo dado vem de /api/nexus (api/_lib/nexus.js). Nada aqui inventa nó ou ligação: o mapa só desenha o que o
// servidor devolveu, com a natureza da evidência de cada ligação.
import Graph from 'https://cdn.jsdelivr.net/npm/graphology@0.26.0/+esm';
import Sigma from 'https://cdn.jsdelivr.net/npm/sigma@3.0.2/+esm';
import FA2Layout from 'https://cdn.jsdelivr.net/npm/graphology-layout-forceatlas2@0.10.1/worker/+esm';
import forceAtlas2 from 'https://cdn.jsdelivr.net/npm/graphology-layout-forceatlas2@0.10.1/+esm';

// ── vocabulário visual ──────────────────────────────────────────────────────
const TIPOS = {
  passagem:   { nome: 'Passagem',   cor: '#14284B', tam: 9 },
  obra:       { nome: 'Obra',       cor: '#A8843F', tam: 7 },
  autor:      { nome: 'Autor',      cor: '#6B7280', tam: 5 },
  conceito:   { nome: 'Conceito',   cor: '#2F6F73', tam: 8 },
  verbete:    { nome: 'Verbete (léxico)', cor: '#4F7A5A', tam: 6 },
  descoberta: { nome: 'Descoberta', cor: '#8C3B3B', tam: 6 },
};
const NATUREZAS = {
  documental:     { nome: 'Evidência documental', cor: '#14284B', tam: 2.2 },
  estabelecido:   { nome: 'Dado estabelecido',    cor: '#B9BEC6', tam: 1 },
  interpretacao:  { nome: 'Curadoria / interpretação', cor: '#C9A43F', tam: 1.6 },
  hipotese:       { nome: 'Hipótese (calculada)', cor: '#C46A12', tam: 1.8 },
  inferencia_ia:  { nome: 'Inferência da IA',     cor: '#8C3B3B', tam: 1.4 },
  nao_verificada: { nome: 'Não verificada',       cor: '#D58A99', tam: 1.2 },
};
const CATEGORIAS = { comentario: 'Comentários', lexico: 'Léxicos', patristica: 'Patrística', judaica: 'Fontes judaicas',
  'contexto-judaico': 'Contexto judaico', historia: 'História', pregacao: 'Pregações' };
const TIPO_LIG = { refcruz: 'referência cruzada', cita: 'cita', comenta: 'comenta', lexical: 'relação lexical', mencao: 'menciona',
  escreveu: 'escreveu', contem: 'contém', descoberta: 'descoberta', caminho: 'caminho', 'co-citacao': 'co-citação' };

// ── estado ──────────────────────────────────────────────────────────────────
const S = {
  graph: new Graph({ multi: false, type: 'directed' }),
  renderer: null, layout: null,
  sel: null, selAresta: null, hover: null,
  foco: null, trilha: [], expandidos: new Set(),
  aberto: false, investigacao: null, origemCaminho: null,
  filtros: { tipos: new Set(Object.keys(TIPOS)), naturezas: new Set(Object.keys(NATUREZAS)), categorias: new Set(Object.keys(CATEGORIAS)), testamento: 'todos', votos: 0 },
  modo: 'mapa',
};
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ler = (k) => { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } };
const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* sem armazenamento */ } };
const pequeno = () => window.matchMedia('(max-width: 760px)').matches;

// ── API ─────────────────────────────────────────────────────────────────────
async function api(corpo) {
  const r = await fetch('/api/nexus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
    body: JSON.stringify({ ...corpo, cracha: ler('radar_chave'), token: ler('lp_token') }) });
  const j = await r.json().catch(() => ({ ok: false, err: 'resposta inválida do servidor' }));
  if (j && typeof j.aberto === 'boolean') definirAcesso(j.aberto);
  return j;
}
let carregando = 0;
function ocupado(on) { carregando += on ? 1 : -1; $('carregando').hidden = carregando <= 0; }

function definirAcesso(aberto) {
  S.aberto = aberto;
  const c = $('acesso');
  c.textContent = aberto ? 'Biblioteca aberta' : 'Só público · entrar';
  c.classList.toggle('aberto', aberto);
}

// ── grafo: mesclar o que o servidor devolveu ───────────────────────────────
function posicaoPerto(origem) {
  const g = S.graph;
  if (origem && g.hasNode(origem)) {
    const a = g.getNodeAttributes(origem), ang = Math.random() * Math.PI * 2, r = 1 + Math.random() * 1.5;
    return { x: a.x + Math.cos(ang) * r, y: a.y + Math.sin(ang) * r };
  }
  return { x: Math.random() * 10 - 5, y: Math.random() * 10 - 5 };
}
function mesclar(resp, origem) {
  const g = S.graph;
  for (const n of resp.nos || []) {
    const t = TIPOS[n.tipo] || TIPOS.passagem;
    const attrs = { label: n.rotulo, tipo: n.tipo, dados: n, color: n.tipo === 'passagem' && n.testamento === 'AT' ? '#3D5A80' : t.cor, size: t.tam };
    if (!g.hasNode(n.id)) g.addNode(n.id, { ...posicaoPerto(origem), ...attrs });
    else g.mergeNodeAttributes(n.id, { dados: { ...g.getNodeAttribute(n.id, 'dados'), ...n } });
  }
  for (const a of resp.arestas || []) {
    if (!g.hasNode(a.de) || !g.hasNode(a.para) || a.de === a.para) continue;
    const nat = NATUREZAS[a.natureza] || NATUREZAS.estabelecido;
    if (g.hasEdge(a.id)) {
      const atual = g.getEdgeAttribute(a.id, 'dados');
      g.setEdgeAttribute(a.id, 'dados', { ...atual, evidencias: (atual.evidencias || []).concat(a.evidencias || []).slice(0, 4) });
      continue;
    }
    if (g.hasEdge(a.de, a.para)) continue;    // uma ligação visível por par; as demais aparecem no painel do nó
    g.addDirectedEdgeWithKey(a.id, a.de, a.para, { dados: a, color: nat.cor, size: nat.tam, type: 'arrow' });
  }
  // tamanho por grau (mais ligado = maior), com piso por tipo
  g.forEachNode((id, at) => g.setNodeAttribute(id, 'size', (TIPOS[at.tipo] || TIPOS.passagem).tam + Math.min(8, Math.sqrt(g.degree(id)) * 1.2)));
  rodarLayout();
  montarFiltros();
  atualizarVazio();
  if (S.modo === 'lista') desenharLista();
}
function rodarLayout(ms) {
  if (S.graph.order < 2) return;
  try {
    if (S.layout) S.layout.kill();
    S.layout = new FA2Layout(S.graph, { settings: { ...forceAtlas2.inferSettings(S.graph), slowDown: 6, gravity: 0.6, barnesHutOptimize: S.graph.order > 150 } });
    S.layout.start();
    setTimeout(() => { try { S.layout && S.layout.stop(); } catch (_) {} }, ms || 2200);
  } catch (_) { /* sem worker: fica a posição inicial */ }
}

// ── expandir / focar ───────────────────────────────────────────────────────
async function expandir(id) {
  const n = S.graph.hasNode(id) ? S.graph.getNodeAttributes(id) : null;
  ocupado(true);
  try {
    const ctx = S.graph.filterNodes((k, a) => a.tipo === 'passagem').slice(0, 12);
    const j = await api({ acao: 'expandir', id, rotulo: n && n.label, contexto: ctx });
    if (!j.ok) {
      if (j.motivo === 'particular') pedirPin();
      else aviso(j.err || 'Não foi possível expandir.');
      return;
    }
    S.expandidos.add(id);
    mesclar(j, id);
    if (!j.nos || j.nos.length <= 1) aviso('Nenhuma ligação nova encontrada nas fontes para este elemento.');
  } catch (e) { aviso('Falha de conexão: ' + e.message); } finally { ocupado(false); }
}
async function explorar(texto) {
  const t = String(texto || '').trim();
  if (!t) return;
  ocupado(true);
  try {
    const r = await api({ acao: 'resolver', ref: t });
    if (!r.ok) { aviso(r.err || 'Referência não reconhecida.'); return; }
    S.foco = r.id;
    try { history.replaceState(null, '', '?ref=' + encodeURIComponent(t)); } catch (_) {}
    if (!S.graph.hasNode(r.id) || !S.expandidos.has(r.id)) await expandir(r.id);
    selecionar(r.id, false);
    enquadrar();
    setTimeout(enquadrar, 2500);   // de novo, depois que o layout assenta
  } finally { ocupado(false); }
}

// ── seleção, trilha, painel ────────────────────────────────────────────────
function selecionar(id, centralizar) {
  if (!S.graph.hasNode(id)) return;
  S.sel = id; S.selAresta = null;
  if (S.trilha[S.trilha.length - 1] !== id) { S.trilha.push(id); if (S.trilha.length > 30) S.trilha.shift(); }
  desenharTrilha();
  if (S.modo === 'lista') desenharLista(); else painelNo(id);
  S.renderer && S.renderer.refresh();
  if (centralizar && S.renderer) centralizarEm(id);
}
// Mostra o mapa inteiro; com o painel aberto ao lado, desloca para o mapa não ficar escondido atrás dele.
function enquadrar() {
  if (!S.renderer) return;
  const lateral = !$('painel').hidden && !pequeno();
  S.renderer.getCamera().animate({ x: lateral ? 0.66 : 0.5, y: 0.5, ratio: lateral ? 1.25 : 1.05, angle: 0 }, { duration: 400 });
}
// Leva a câmera até o nó: coordenada do grafo -> tela -> espaço normalizado da câmera (Sigma 3).
function centralizarEm(id) {
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
  el.innerHTML = '<span class="rot">Trilha</span>' + S.trilha.map((id, i) => {
    const a = S.graph.hasNode(id) ? S.graph.getNodeAttributes(id) : null;
    return (i ? '<span class="seta">›</span>' : '') + `<button class="passo${id === S.sel ? ' atual' : ''}" data-id="${esc(id)}">${esc(a ? a.label : id)}</button>`;
  }).join('');
  el.scrollLeft = el.scrollWidth;
}
function etiquetaNat(n) { return `<span class="nat nat-${esc(n)}">${esc((NATUREZAS[n] || {}).nome || n)}</span>`; }
function evidenciasHtml(lista) {
  if (!lista || !lista.length) return '';
  return `<details class="ev"><summary>Ver evidência (${lista.length})</summary>${lista.map((e) => `<div class="ev-item"><b>${esc(e.autor || '')}</b>${e.obra ? ' · ' + esc(e.obra) : ''}${e.secao ? ' · ' + esc(e.secao) : ''}${e.modo ? ` <span class="etq">${esc(e.modo)}</span>` : ''}${e.trecho ? `<q>${esc(e.trecho)}</q>` : ''}</div>`).join('')}</details>`;
}
function ligacoesDe(id) {
  const g = S.graph, out = [];
  g.forEachEdge(id, (k, a, src, dst) => out.push({ k, a: a.dados, outro: src === id ? dst : src, sentido: src === id ? 'saida' : 'entrada' }));
  const ordem = { documental: 0, hipotese: 1, interpretacao: 2, inferencia_ia: 3, nao_verificada: 4, estabelecido: 5 };
  return out.sort((x, y) => (ordem[x.a.natureza] - ordem[y.a.natureza]) || ((y.a.peso || 0) - (x.a.peso || 0)));
}
function cabecalhoNo(id) {
  const a = S.graph.getNodeAttributes(id), d = a.dados || {};
  let h = `<span class="etq"><span class="amostra" style="background:${a.color}"></span>${esc((TIPOS[a.tipo] || {}).nome || a.tipo)}${d.testamento ? ' · ' + d.testamento : ''}${d.categoria ? ' · ' + esc(CATEGORIAS[d.categoria] || d.categoria) : ''}</span><h2>${esc(a.label)}</h2>`;
  if (d.texto) h += `<div class="verso">${esc(d.texto)}<div class="nota">Almeida (biblia.json do RADAR)</div></div>`;
  if (d.autor && a.tipo === 'obra') h += `<div class="nota">Autor: ${esc(d.autor)}${d.grupo ? ' · ' + esc(d.grupo) : ''}</div>`;
  if (a.tipo === 'conceito') h += `<div class="nota">Conceito do dicionário do NEXUS. Regra de busca no texto: <code>${esc(d.regra || '')}</code></div>`;
  if (a.tipo === 'verbete') h += `<div class="nota">Verbete de ${esc(d.obra || '')}</div>`;
  if (a.tipo === 'descoberta') h += `<div class="verso" style="font-size:15px">${esc(d.explica || '')}</div><div class="nota">Camada: ${esc(d.camada || '')} · fonte declarada: ${esc(d.fonte || '—')} · escrita por IA na Oficina</div>`;
  if (d.aviso) h += `<div class="aviso">${esc(d.aviso)}</div>`;
  const botoes = [`<button class="bt bt-ouro" data-acao="expandir" data-id="${esc(id)}">${S.expandidos.has(id) ? 'Expandir de novo' : 'Expandir conexões'}</button>`];
  if (a.tipo === 'passagem') {
    botoes.push(`<button class="bt" data-acao="descobrir" data-id="${esc(id)}">Descobrir</button>`);
    if (S.origemCaminho && S.origemCaminho !== id) botoes.push(`<button class="bt" data-acao="caminho" data-id="${esc(id)}">Caminho desde ${esc(S.graph.hasNode(S.origemCaminho) ? S.graph.getNodeAttribute(S.origemCaminho, 'label') : '')}</button>`);
    else botoes.push(`<button class="bt" data-acao="origem" data-id="${esc(id)}">Marcar como origem de caminho</button>`);
  }
  if (S.modo === 'mapa') botoes.push(`<button class="bt" data-acao="centralizar" data-id="${esc(id)}">Centralizar</button>`);
  return h + `<div class="botoes">${botoes.join('')}</div>`;
}
function listaLigacoesHtml(id) {
  const ligs = ligacoesDe(id).filter((l) => visivelAresta(l.k));
  if (!ligs.length) return '<p class="nota">Ainda sem ligações visíveis. Toque em "Expandir conexões" ou revise os filtros.</p>';
  return ligs.slice(0, 80).map((l) => {
    const o = S.graph.getNodeAttributes(l.outro);
    return `<div class="lig"><div class="lig-topo">${etiquetaNat(l.a.natureza)}<span class="etq">${esc(TIPO_LIG[l.a.tipo] || l.a.tipo)}${l.sentido === 'entrada' ? ' ←' : ' →'}</span><button class="lig-alvo" data-ir="${esc(l.outro)}">${esc(o.label)}</button></div><p>${esc(l.a.explica || '')}</p>${l.a.credito ? `<p class="nota">${esc(l.a.credito)}</p>` : ''}${evidenciasHtml(l.a.evidencias)}</div>`;
  }).join('') + (ligs.length > 80 ? `<p class="nota">+${ligs.length - 80} ligações (use os filtros).</p>` : '');
}
function painelNo(id) {
  $('painel-corpo').innerHTML = cabecalhoNo(id) + `<h3>Ligações documentadas</h3>` + listaLigacoesHtml(id);
  $('painel').hidden = false;
}
function painelAresta(k) {
  const g = S.graph, a = g.getEdgeAttribute(k, 'dados');
  S.selAresta = k;
  const de = g.getNodeAttribute(g.source(k), 'label'), para = g.getNodeAttribute(g.target(k), 'label');
  $('painel-corpo').innerHTML = `<span class="etq">Ligação · ${esc(TIPO_LIG[a.tipo] || a.tipo)}</span><h2>${esc(de)} → ${esc(para)}</h2>${etiquetaNat(a.natureza)}<p>${esc(a.explica || '')}</p>${a.credito ? `<p class="nota">${esc(a.credito)}</p>` : ''}${evidenciasHtml(a.evidencias).replace('<details class="ev">', '<details class="ev" open>')}
    <div class="botoes"><button class="bt" data-ir="${esc(g.source(k))}">Ir para ${esc(de)}</button><button class="bt" data-ir="${esc(g.target(k))}">Ir para ${esc(para)}</button></div>`;
  $('painel').hidden = false;
  S.renderer && S.renderer.refresh();
}

// ── modo trilha (lista; padrão em telas pequenas) ──────────────────────────
function desenharLista() {
  const el = $('lista');
  if (!S.sel) { el.innerHTML = '<div class="cartao"><p class="nota">Escolha uma passagem para começar.</p></div>'; return; }
  const todas = ligacoesDe(S.sel).filter((l) => visivelAresta(l.k));
  // uma linha por elemento ligado (ida e volta da mesma referência viram uma só)
  const porOutro = new Map();
  for (const l of todas) {
    const j = porOutro.get(l.outro);
    if (!j) porOutro.set(l.outro, { ...l, a: { ...l.a } });
    else { j.a.explica = j.a.explica + ' ' + (l.a.explica || ''); j.a.evidencias = (j.a.evidencias || []).concat(l.a.evidencias || []).slice(0, 4); }
  }
  const ligs = [...porOutro.values()];
  const grupos = {};
  for (const l of ligs) { const t = S.graph.getNodeAttribute(l.outro, 'tipo'); (grupos[t] = grupos[t] || []).push(l); }
  el.innerHTML = `<div class="cartao">${cabecalhoNo(S.sel)}</div>` + Object.keys(TIPOS).filter((t) => grupos[t]).map((t) =>
    `<div class="grupo"><h3>${esc(TIPOS[t].nome)} (${grupos[t].length})</h3>${grupos[t].slice(0, 40).map((l) => {
      const o = S.graph.getNodeAttributes(l.outro);
      return `<div class="lig"><div class="lig-topo">${etiquetaNat(l.a.natureza)}<button class="lig-alvo" data-ir="${esc(l.outro)}">${esc(o.label)}</button></div><p>${esc(l.a.explica || '')}</p>${evidenciasHtml(l.a.evidencias)}</div>`;
    }).join('')}</div>`).join('') + (ligs.length ? '' : '<p class="nota">Sem ligações visíveis ainda. Toque em "Expandir conexões".</p>');
}
function definirModo(m) {
  S.modo = m;
  document.body.classList.toggle('modo-lista', m === 'lista');
  $('lista').hidden = m !== 'lista';
  $('mapa').style.visibility = m === 'lista' ? 'hidden' : 'visible';
  $('bt-modo').textContent = m === 'lista' ? 'Mapa' : 'Trilha';
  ['filtros', 'legenda'].forEach((k) => { $(k).style.display = m === 'lista' && k === 'legenda' ? 'none' : ''; });
  if (m === 'lista') { $('painel').hidden = true; desenharLista(); }
  else if (S.sel) painelNo(S.sel);
}

// ── filtros ─────────────────────────────────────────────────────────────────
function visivelNo(id, a) {
  a = a || S.graph.getNodeAttributes(id);
  const f = S.filtros, d = a.dados || {};
  if (id === S.sel || id === S.foco) return true;
  if (!f.tipos.has(a.tipo)) return false;
  if (a.tipo === 'obra' && d.categoria && !f.categorias.has(d.categoria)) return false;
  if (a.tipo === 'passagem' && f.testamento !== 'todos' && d.testamento !== f.testamento) return false;
  return true;
}
function visivelAresta(k) {
  const g = S.graph, a = g.getEdgeAttribute(k, 'dados'), f = S.filtros;
  if (!f.naturezas.has(a.natureza)) return false;
  if (a.tipo === 'refcruz' && f.votos && (a.peso || 0) < f.votos) return false;
  return visivelNo(g.source(k)) && visivelNo(g.target(k));
}
function montarFiltros() {
  const g = S.graph, conta = (fn) => g.filterNodes(fn).length;
  const f = S.filtros;
  const caixa = (grupo, chave, rot, cor, n, linha) => `<label><input type="checkbox" data-f="${grupo}" value="${chave}" ${f[grupo].has(chave) ? 'checked' : ''}><span class="amostra${linha ? ' linha' : ''}" style="background:${cor || '#ccc'}"></span>${esc(rot)}${n != null ? ` <small style="color:#8A909A">(${n})</small>` : ''}</label>`;
  $('filtros-corpo').innerHTML =
    '<h4>Elementos</h4>' + Object.entries(TIPOS).map(([k, t]) => caixa('tipos', k, t.nome, t.cor, conta((id, a) => a.tipo === k))).join('') +
    '<h4>Natureza da evidência</h4>' + Object.entries(NATUREZAS).map(([k, t]) => caixa('naturezas', k, t.nome, t.cor, g.filterEdges((e, a) => a.dados.natureza === k).length, true)).join('') +
    '<h4>Tipo de obra</h4>' + Object.entries(CATEGORIAS).map(([k, t]) => caixa('categorias', k, t, null, conta((id, a) => a.tipo === 'obra' && a.dados && a.dados.categoria === k))).join('') +
    `<h4>Testamento</h4><label><input type="radio" name="test" value="todos" ${f.testamento === 'todos' ? 'checked' : ''}> Todos</label><label><input type="radio" name="test" value="AT" ${f.testamento === 'AT' ? 'checked' : ''}> Antigo Testamento</label><label><input type="radio" name="test" value="NT" ${f.testamento === 'NT' ? 'checked' : ''}> Novo Testamento</label>` +
    `<h4>Referências cruzadas: votos mínimos <b id="votos-v">${f.votos}</b></h4><input type="range" id="votos" min="0" max="300" step="10" value="${f.votos}">`;
}
function aplicarFiltros() {
  S.renderer && S.renderer.refresh();
  if (S.modo === 'lista') desenharLista(); else if (S.sel && !$('painel').hidden && !S.selAresta) painelNo(S.sel);
}
function montarLegenda() {
  $('legenda').innerHTML = Object.values(TIPOS).map((t) => `<span><i class="amostra" style="background:${t.cor}"></i>${t.nome}</span>`).join('') +
    Object.values(NATUREZAS).map((t) => `<span><i class="amostra linha" style="background:${t.cor}"></i>${t.nome}</span>`).join('');
}

// ── motor de descoberta ───────────────────────────────────────────────────
async function descobrir(id) {
  if (!S.aberto) { pedirPin(); return; }
  ocupado(true);
  try {
    const j = await api({ acao: 'descobrir', id });
    if (!j.ok) { if (j.motivo === 'particular') pedirPin(); else aviso(j.err || 'Falhou.'); return; }
    S.ultimaDescoberta = j;
    const blocos = j.blocos.map((b, bi) => `<div class="bloco"><div class="bloco-topo"><h4>${esc(b.titulo)}</h4>${etiquetaNat(b.natureza)}</div><div class="como">${esc(b.como)}</div>${
      b.itens.length ? b.itens.slice(0, 10).map((it, ii) => `<button class="item" data-bloco="${bi}" data-item="${ii}"><b>${esc(it.rotulo)}</b><small>${esc(it.detalhe || '')}</small></button>`).join('') : '<p class="nota">Nada encontrado nas fontes atuais.</p>'
    }</div>`).join('');
    $('painel-corpo').innerHTML = `<span class="etq">Motor de descoberta</span><h2>${esc(j.foco.rotulo)}</h2>
      <p class="nota">Cada resultado vem de uma consulta às fontes do RADAR. Toque num item para trazê-lo ao mapa com a evidência.</p>
      <div class="botoes"><button class="bt bt-ouro" data-acao="explicar" data-id="${esc(id)}">Explicar com IA (cita as evidências)</button></div><div id="explicacao"></div>${blocos}`;
    $('painel').hidden = false;
    if (S.modo === 'lista') { $('painel').hidden = false; }
  } finally { ocupado(false); }
}
function trazerItem(bi, ii) {
  const j = S.ultimaDescoberta; if (!j) return;
  const b = j.blocos[bi], it = b.itens[ii], foco = j.foco.id;
  if (!S.graph.hasNode(foco)) mesclar({ nos: [j.foco], arestas: [] });
  if (b.algoritmo === 'caminhos' && it.passos) {
    const nos = it.passos.map((p, i) => ({ id: p, tipo: 'passagem', rotulo: it.rotulo.split(' → ')[i] || p }));
    const arestas = it.passos.slice(1).map((p, i) => ({ id: 'caminho|' + it.passos[i] + '|' + p, de: it.passos[i], para: p, tipo: 'caminho', natureza: 'interpretacao', explica: 'Passo do caminho por referências cruzadas (OpenBible).' }));
    mesclar({ nos, arestas }, foco);
    selecionar(it.passos[it.passos.length - 1], true);
    return;
  }
  const tipo = it.alvo.startsWith('p:') ? 'passagem' : it.alvo.startsWith('o:') ? 'obra' : it.alvo.startsWith('c:') ? 'conceito' : it.alvo.startsWith('l:') ? 'verbete' : it.alvo.startsWith('d:') ? 'descoberta' : 'passagem';
  const tipoLig = { 'conexoes-pouco-evidentes': 'co-citacao', 'refcruz-relevantes': 'refcruz', 'autores-mesma-passagem': 'comenta', 'citacoes-literais': 'cita', 'temas-recorrentes': 'mencao', 'relacoes-lexicais': 'lexical', 'descobertas-oficina': 'descoberta' }[b.algoritmo] || 'descoberta';
  const de = tipo === 'passagem' && b.algoritmo !== 'descobertas-oficina' ? foco : it.alvo, para = de === foco ? it.alvo : foco;
  mesclar({ nos: [{ id: it.alvo, tipo, rotulo: it.rotulo.replace(/ \(.*\)$/, ''), texto: it.texto || null }],
    arestas: [{ id: tipoLig + '|' + de + '|' + para, de, para, tipo: tipoLig, natureza: it.natureza || b.natureza, peso: 1, explica: `${b.titulo}: ${it.detalhe || ''}`, evidencias: it.evidencias || [] }] }, foco);
  selecionar(it.alvo, true);
}
async function explicar(id) {
  const caixa = $('explicacao'); if (!caixa) return;
  caixa.innerHTML = '<p class="nota">A IA está lendo as evidências…</p>';
  const j = await api({ acao: 'explicar', id }).catch((e) => ({ ok: false, err: e.message }));
  if (!j.ok) { caixa.innerHTML = `<div class="aviso">${esc(j.err || 'A IA não respondeu agora.')}</div>`; return; }
  S.evidExp = j.evidencias || [];
  const html = esc(j.texto).split(/\n\s*\n/).map((p) => '<p>' + p.replace(/\[E(\d+)\]/g, (m, n) => `<button class="marca-ev" data-ev="${n}">E${n}</button>`) + '</p>').join('');
  caixa.innerHTML = `<h3>Interpretação</h3>${etiquetaNat('inferencia_ia')}<div class="explicacao">${html}</div><p class="nota">Gerado por IA${j.provedor ? ' (' + esc(j.provedor) + ')' : ''} somente a partir das evidências numeradas; parágrafos sem evidência válida foram descartados (${j.descartados || 0}).</p><div id="ev-aberta"></div>`;
}
function mostrarEvidenciaNumero(n) {
  const e = (S.evidExp || []).find((x) => String(x.n) === String(n)); if (!e) return;
  $('ev-aberta').innerHTML = `<div class="ev-item"><b>E${e.n}</b> ${etiquetaNat(e.natureza)} · ${esc(e.bloco)} — ${esc(e.item)}<br><b>${esc(e.autor || '')}</b>${e.obra ? ' · ' + esc(e.obra) : ''}${e.secao ? ' · ' + esc(e.secao) : ''}${e.trecho ? `<q>${esc(e.trecho)}</q>` : ''}</div>`;
}

// ── caminho entre passagens ───────────────────────────────────────────────
async function caminho(para) {
  const de = S.origemCaminho; if (!de) return;
  ocupado(true);
  try {
    const j = await api({ acao: 'caminho', de, para });
    if (!j.ok) { aviso(j.err || 'Falhou.'); return; }
    if (!j.passos.length) { aviso(j.aviso || 'Sem caminho curto.'); return; }
    mesclar(j, de);
    S.origemCaminho = null;
    aviso('Caminho: ' + j.passos.map((p) => S.graph.getNodeAttribute(p, 'label')).join(' → '));
    selecionar(para, true);
  } finally { ocupado(false); }
}

// ── investigações (banco do NEXUS; reserva local se o banco não estiver ligado) ─
function estadoAtual() { return { versao: 1, grafo: S.graph.export(), trilha: S.trilha, foco: S.foco, sel: S.sel, expandidos: [...S.expandidos], filtros: { ...S.filtros, tipos: [...S.filtros.tipos], naturezas: [...S.filtros.naturezas], categorias: [...S.filtros.categorias] } }; }
function restaurar(est) {
  S.graph.clear();
  S.graph.import(est.grafo);
  S.trilha = est.trilha || []; S.foco = est.foco || null; S.expandidos = new Set(est.expandidos || []);
  if (est.filtros) S.filtros = { ...est.filtros, tipos: new Set(est.filtros.tipos), naturezas: new Set(est.filtros.naturezas), categorias: new Set(est.filtros.categorias) };
  montarFiltros(); atualizarVazio();
  if (est.sel && S.graph.hasNode(est.sel)) selecionar(est.sel, true); else desenharTrilha();
}
const locais = () => { try { return JSON.parse(ler('nexus_investigacoes_local') || '[]'); } catch (_) { return []; } };
function salvarDialogo() {
  if (!S.graph.order) { aviso('O mapa está vazio.'); return; }
  const sug = S.investigacao ? S.investigacao.titulo : (S.foco && S.graph.hasNode(S.foco) ? 'Investigação: ' + S.graph.getNodeAttribute(S.foco, 'label') : 'Investigação');
  abrirModal(`<h2>Salvar investigação</h2><p class="nota">Salva o mapa, a trilha e os filtros. Abra depois em qualquer aparelho com o mesmo acesso.</p><input type="text" id="inv-titulo" maxlength="120" value="${esc(sug)}"><div class="botoes"><button class="bt bt-ouro" id="inv-ok">Salvar</button></div><div id="inv-msg"></div>`);
  $('inv-ok').onclick = async () => {
    const titulo = $('inv-titulo').value.trim() || 'Investigação';
    if (!S.aberto) { pedirPin(); return; }
    const j = await api({ acao: 'salvar', titulo, foco: S.foco, estado: estadoAtual(), investigacao: S.investigacao && S.investigacao.id });
    if (j.ok) { S.investigacao = { id: j.investigacao.id, titulo }; fecharModal(); aviso('Investigação salva.'); return; }
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
  $('inv-lista').innerHTML = (msg ? `<div class="aviso">${esc(msg)}</div>` : '') + (srv.concat([]).map((x) => linha(x, false)).join('') + loc.map((x) => linha(x, true)).join('') || '<p class="nota">Nenhuma investigação salva ainda.</p>');
}

// ── PIN (a mesma porta da Oficina e dos livros particulares) ───────────────
function pedirPin() {
  abrirModal(`<h2>Biblioteca particular</h2><p class="nota">Autores, obras, verbetes, conceitos, descobertas e investigações usam os livros da sua biblioteca. Digite o PIN (o mesmo da Oficina).</p><input type="password" id="pin" class="pin" inputmode="numeric" maxlength="8" placeholder="••••" autocomplete="off"><div class="botoes"><button class="bt bt-ouro" id="pin-ok">Entrar</button></div><div id="pin-msg"></div>`);
  setTimeout(() => $('pin') && $('pin').focus(), 50);
  const ir = async () => {
    const v = $('pin').value.trim(); if (!v) return;
    const r = await fetch('/api/livro-particular', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: v }), cache: 'no-store' }).then((x) => x.json()).catch(() => ({}));
    if (r.ok && r.token) {
      gravar('lp_token', r.token); definirAcesso(true); fecharModal();
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
let avisoT = null;
function aviso(t) {
  const el = $('vazio');
  if (S.graph.order) { // aviso flutuante
    const c = $('carregando'); c.hidden = false; c.innerHTML = esc(t); clearTimeout(avisoT);
    avisoT = setTimeout(() => { c.innerHTML = '<span></span>Buscando nas fontes…'; c.hidden = carregando <= 0; }, 3800);
  } else { el.hidden = false; el.querySelector('p') && (el.querySelector('p').textContent = t); }
}
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
      const foco = S.hover || S.sel;
      if (foco && foco !== id && !S.graph.areNeighbors(foco, id)) { r.color = '#D9D4C7'; r.label = a.tipo === 'passagem' && !S.hover ? a.label : ''; r.zIndex = 0; }
      else r.zIndex = 1;
      if (id === S.sel) { r.highlighted = true; r.size = a.size * 1.25; r.zIndex = 2; }
      if (id === S.sel || id === S.hover || id === S.foco) r.forceLabel = true;
      return r;
    },
    edgeReducer: (k, a) => {
      const r = { ...a };
      if (!visivelAresta(k)) { r.hidden = true; return r; }
      const foco = S.hover || S.sel;
      if (foco && !S.graph.hasExtremity(k, foco)) { r.color = '#ECE7DB'; r.size = 0.6; }
      if (k === S.selAresta) { r.size = a.size * 2.2; }
      return r;
    },
  });
  const R = S.renderer;
  R.on('clickNode', ({ node }) => selecionar(node, false));
  R.on('doubleClickNode', (e) => { e.preventSigmaDefault && e.preventSigmaDefault(); selecionar(e.node, false); expandir(e.node); });
  R.on('enterNode', ({ node }) => { S.hover = node; R.refresh(); });
  R.on('leaveNode', () => { S.hover = null; R.refresh(); });
  R.on('clickEdge', ({ edge }) => painelAresta(edge));
  R.on('clickStage', () => { S.selAresta = null; R.refresh(); });
}

// ── eventos ───────────────────────────────────────────────────────────────
function ligarEventos() {
  $('busca').addEventListener('submit', (e) => { e.preventDefault(); explorar($('ref').value); });
  $('bt-descobrir').onclick = () => { const id = S.sel && S.graph.getNodeAttribute(S.sel, 'tipo') === 'passagem' ? S.sel : S.foco; if (id) descobrir(id); else aviso('Escolha uma passagem primeiro.'); };
  $('bt-salvar').onclick = salvarDialogo;
  $('bt-investigacoes').onclick = investigacoesDialogo;
  $('bt-modo').onclick = () => definirModo(S.modo === 'lista' ? 'mapa' : 'lista');
  $('acesso').onclick = () => { if (!S.aberto) pedirPin(); else investigacoesDialogo(); };
  $('painel-fechar').onclick = () => { $('painel').hidden = true; S.selAresta = null; S.renderer && S.renderer.refresh(); };
  $('modal-fechar').onclick = fecharModal;
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') fecharModal(); });
  $('filtros-alca').onclick = () => { const f = $('filtros'); f.classList.toggle('aberto'); $('filtros-alca').setAttribute('aria-expanded', f.classList.contains('aberto')); };
  $('z-mais').onclick = () => S.renderer.getCamera().animatedZoom({ duration: 250 });
  $('z-menos').onclick = () => S.renderer.getCamera().animatedUnzoom({ duration: 250 });
  $('z-centro').onclick = enquadrar;

  $('filtros-corpo').addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.f) { const s = S.filtros[t.dataset.f]; t.checked ? s.add(t.value) : s.delete(t.value); }
    if (t.name === 'test') S.filtros.testamento = t.value;
    aplicarFiltros();
  });
  $('filtros-corpo').addEventListener('input', (e) => { if (e.target.id === 'votos') { S.filtros.votos = +e.target.value; $('votos-v').textContent = S.filtros.votos; aplicarFiltros(); } });

  // delegação: painel, lista, trilha, modal, sugestões
  document.body.addEventListener('click', (e) => {
    const t = e.target.closest('[data-acao],[data-ir],[data-id].passo,[data-bloco],[data-ev],[data-ref],[data-inv],[data-apagar]');
    if (!t) return;
    if (t.dataset.ref) { $('ref').value = t.dataset.ref; explorar(t.dataset.ref); return; }
    if (t.classList.contains('passo')) { selecionar(t.dataset.id, true); return; }
    if (t.dataset.ir) { const id = t.dataset.ir; selecionar(id, true); if (S.modo === 'lista' && !S.expandidos.has(id)) expandir(id); return; }
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
      case 'explicar': explicar(id); break;
      case 'origem': S.origemCaminho = id; aviso('Origem marcada. Agora escolha outra passagem e toque em "Caminho desde…".'); selecionar(id); break;
      case 'caminho': caminho(id); break;
      case 'centralizar': selecionar(id, true); break;
    }
  });
  window.addEventListener('resize', () => { if (pequeno() && S.modo === 'mapa' && !S.trocouModo) definirModo('lista'); });
  $('bt-modo').addEventListener('click', () => { S.trocouModo = true; });
}

// ── início ────────────────────────────────────────────────────────────────
window.__nexus = S;   // inspeção nos testes
iniciarSigma();
ligarEventos();
montarLegenda();
montarFiltros();
definirAcesso(false);
atualizarVazio();
if (pequeno()) definirModo('lista');
const pedido = new URLSearchParams(location.search).get('ref');
explorar(pedido || 'João 1:1');
