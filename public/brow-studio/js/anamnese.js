// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — FICHA DE ANAMNESE (10/11/2026)
// Cada página tem rota própria (<body data-pagina="...">). Peças comuns em comum.js.
//
// Enquanto se navega entre as etapas, as respostas ficam num rascunho da aba
// (sessionStorage "an:novo" ou "an:<id>"). "Salvar rascunho e sair" grava no
// servidor como Rascunho; "Salvar como conferida" exige a confirmação marcada.
// A ficha só REGISTRA o relato: não interpreta, não libera procedimento.
// Modelo de perguntas: padrao_v1 (aprovado). Nada de perguntas extras.
// ═══════════════════════════════════════════════════════════════════════════
import { $, params, esc, uuid, lerRasc, gravarRasc, apagarRasc, api, SETA, pagina, campoTexto, grupoOpcoes,
  mostrarErros, avisoHTML, focarTitulo, ir, blocoResumo } from './comum.js?v=4';

const BASE = '/brow-studio/anamnese/';
const F = BASE + 'ficha/';
const RESP = { sim: 'Sim', nao: 'Não', nao_sabe: 'Não sabe informar' };
const SIT = { rascunho: 'Rascunho', conferida: 'Conferida' };
const PAGINA_DA_ETAPA = { cliente: '', atendimento: 'atendimento/', procedimento: 'procedimento/', alergias: 'alergias/', medicamentos: 'medicamentos/', historico: 'historico/', observacoes: 'observacoes/', conferencia: 'conferencia/' };
const ACOES_HIST = { criada: 'Ficha criada', rascunho_salvo: 'Rascunho salvo', conferida: 'Salva como conferida', criada_a_partir: 'Criada a partir de ficha conferida (respostas copiadas)', nova_ficha_criada: 'Nova ficha criada a partir desta', alterada_apos_conferencia: 'Alterada depois de conferida' };
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const dataCurta = (iso) => { if (!iso) return 'Sem data'; const [a, m, d] = iso.split('-'); return `${d} ${MESES[+m - 1]} ${a}`; };
const reais = (c) => { const s = String(Math.max(0, c | 0)).padStart(3, '0'); return `R$ ${s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${s.slice(-2)}`; };
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const seloSit = (s) => `<span class="selo ${s === 'conferida' ? 'selo-ativo' : 'selo-inativo'}">${SIT[s] || s}</span>`;
const recado = { pôr(m) { try { sessionStorage.setItem('brow:recado', m); } catch (e) {} }, tirar() { try { const m = sessionStorage.getItem('brow:recado'); sessionStorage.removeItem('brow:recado'); return m; } catch (e) { return null; } } };
const carregando = (t) => pagina({ titulo: t, corpo: avisoHTML('Carregando…') });
function telaErro(titulo, msg, voltar = BASE, voltarTexto = 'Fichas') { pagina({ titulo, voltar, voltarTexto, corpo: avisoHTML(esc(msg), 'erro'), acoes: `<a class="btn btn-cheio" href="${voltar}">Voltar</a>` }); focarTitulo(); }

// paginação que cabe na tela
function cabem(el, altura, abaixo = 82, min = 2) { const topo = el.getBoundingClientRect().top + window.scrollY; return Math.max(min, Math.min(14, Math.floor((window.innerHeight - topo - abaixo + 10) / (altura + 10)))); }
function navPaginas(id) {
  return `<nav class="paginacao" id="${id}" aria-label="Páginas" hidden><button type="button" class="btn btn-linha" data-ir="-1" aria-label="Página anterior">${SETA} Anterior</button>
    <span class="pag-info" aria-live="polite"></span><button type="button" class="btn btn-linha" data-ir="1" aria-label="Próxima página">Próxima <span aria-hidden="true">→</span></button></nav>`;
}
function ligarNav(nav, { pagina: p, paginas, total, rotulo }, mudar) {
  nav.hidden = paginas <= 1;
  nav.querySelector('.pag-info').innerHTML = `<strong>${p}</strong> de ${paginas}${rotulo ? `<span class="pag-total"> · ${total} ${rotulo}</span>` : ''}`;
  const [a, z] = nav.querySelectorAll('[data-ir]'); a.disabled = p <= 1; z.disabled = p >= paginas;
  a.onclick = () => mudar(p - 1); z.onclick = () => mudar(p + 1);
}
const passou = () => document.documentElement.scrollHeight > window.innerHeight + 1;

// ─── rascunho da aba ────────────────────────────────────────────────────────
const fichaId = () => params.get('id') || '';
const chaveRasc = () => fichaId() ? 'an:' + fichaId() : 'an:novo';
const qs = (extra = '') => { const p = new URLSearchParams(); if (fichaId()) p.set('id', fichaId()); if (params.get('conf') === '1' && extra !== 'semconf') p.set('conf', '1'); const s = p.toString(); return s ? '?' + s : ''; };
const vazio = () => ({ chave_envio: uuid(), cliente_id: null, cliente_nome: '', agendamento_id: null, agendamento_rotulo: '', servico_id: null, servico_nome: '', profissional_id: null, profissional_nome: '', data: '',
  respostas: { alergias: { resposta: null, detalhe: '' }, medicamentos: { resposta: null, detalhe: '' }, historico: { procedimentos_anteriores: '', pele: '' }, observacoes: '' },
  origem_situacao: null, alterada: false });
const ler = () => lerRasc(chaveRasc());
function guardar(mudancas, alterouRespostas) {
  const d = { ...ler(), ...mudancas };
  if (alterouRespostas) d.alterada = true;
  gravarRasc(chaveRasc(), d);
  return d;
}
function deFicha(f) {
  const r = f.respostas;
  return { id: f.id, cliente_id: f.cliente_id, cliente_nome: f.cliente_nome, agendamento_id: f.agendamento_id, agendamento_rotulo: '',
    servico_id: f.servico_id, servico_nome: f.servico_nome || '', profissional_id: f.profissional_id, profissional_nome: f.profissional_nome || '', data: f.data || '',
    respostas: { alergias: { resposta: r.alergias.resposta, detalhe: r.alergias.detalhe || '' }, medicamentos: { resposta: r.medicamentos.resposta, detalhe: r.medicamentos.detalhe || '' },
      historico: { procedimentos_anteriores: r.historico.procedimentos_anteriores || '', pele: r.historico.pele || '' }, observacoes: r.observacoes || '' },
    origem_situacao: f.situacao, alterada: false, copiada: !!f.copiada };
}
async function salvarNoServidor(etapa, { conferir = false, confirmacao = false } = {}) {
  const d = ler();
  return api('an_salvar', { corpo: { id: fichaId() || undefined, chave_envio: fichaId() ? undefined : d.chave_envio, cliente_id: d.cliente_id, servico_id: d.servico_id || null,
    profissional_id: d.profissional_id || null, data: d.data || null, agendamento_id: d.agendamento_id || null, respostas: d.respostas, etapa_atual: etapa, conferir, confirmacao } });
}
// Botão "Salvar rascunho e sair", presente em todas as etapas.
function ligarRascunho(etapa, antes) {
  const b = $('#rascunho');
  if (!b) return;
  let enviando = false;
  b.onclick = async () => {
    if (enviando) return;
    if (antes) antes();
    if (!ler().cliente_id) { $('#aviso').innerHTML = avisoHTML('Escolha a cliente antes de salvar o rascunho.', 'erro'); return; }
    enviando = true; b.disabled = true; b.textContent = 'Salvando…';
    const r = await salvarNoServidor(etapa);
    if (r.ok) { apagarRasc(chaveRasc()); recado.pôr('Rascunho salvo. Você pode continuar depois de onde parou.'); location.replace(`${BASE}ver/?id=${encodeURIComponent(r.id)}`); return; }
    enviando = false; b.disabled = false; b.textContent = 'Salvar rascunho e sair';
    $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível salvar o rascunho.') + '<br><small>As respostas continuam aqui.</small>', 'erro');
  };
}
const botaoRascunho = '<button type="button" class="btn btn-suave btn-rascunho" id="rascunho">Salvar rascunho e sair</button>';
// Ficha nova criada a partir de uma conferida: as respostas vieram copiadas e só valem depois de nova conferência.
function avisoAlterada(d) { return d.copiada ? avisoHTML('Respostas <strong>copiadas da ficha conferida anterior</strong>. Confira cada uma com a cliente: só valem depois da nova conferência.', 'erro') : ''; }
function rodapeEtapa(voltar, proxTexto) {
  const conf = params.get('conf') === '1';
  return `${botaoRascunho}<a class="btn btn-linha" href="${voltar}">${SETA} Voltar</a><button type="submit" class="btn btn-cheio">${conf ? 'Voltar à conferência' : (proxTexto || 'Próximo <span aria-hidden="true">→</span>')}</button>`;
}
function irProxima(destino) { ir(params.get('conf') === '1' ? F + 'conferencia/' + qs('semconf') : destino); }

// ═══════════════════════════ LISTA ═════════════════════════════════════════
async function telaLista() {
  const cliente = params.get('cliente') || '';
  const rasc = lerRasc('an:novo');
  const msg = recado.tirar();
  let nomeCliente = '';
  if (cliente) { const v = await api('ver', { id: cliente }); if (v.ok) nomeCliente = v.cliente.nome; }
  pagina({
    titulo: 'Fichas de anamnese', voltar: cliente ? `/brow-studio/clientes/perfil/?id=${encodeURIComponent(cliente)}` : '/brow-studio/profissional.html', voltarTexto: cliente ? 'Perfil' : 'Voltar',
    extra: `<a class="btn btn-cheio btn-topo" href="${F}${cliente ? '?cliente=' + encodeURIComponent(cliente) : ''}" id="nova" aria-label="Nova ficha">+ Nova<span class="so-largo">&nbsp;ficha</span></a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      ${rasc && rasc.cliente_id ? avisoHTML(`Ficha em preenchimento, ainda não salva: <strong>${esc(rasc.cliente_nome)}</strong>`, 'compacto',
        `<div class="linha-acoes"><a class="btn btn-cheio" href="${F}">Continuar</a><button type="button" class="btn btn-linha" id="descartar">Descartar</button></div>`) : ''}
      ${cliente ? `<p class="linha-dia">Fichas de <strong>${esc(nomeCliente || 'cliente')}</strong> · <a href="${BASE}">ver todas</a></p>` : `
      <form class="busca" role="search" id="form-busca"><div class="campo"><label for="q">Buscar por cliente</label>
        <input id="q" type="search" autocomplete="off" enterkeyhint="search" value="${esc(params.get('q') || '')}"></div></form>`}
      <div id="estado"></div><ul class="lista" id="lista" aria-label="Fichas de anamnese"></ul>${navPaginas('nav')}`
  });
  const d = $('#descartar'); if (d) d.onclick = () => { apagarRasc('an:novo'); d.closest('.aviso-caixa').remove(); };
  let pg = Math.max(parseInt(params.get('p'), 10) || 1, 1), termo = params.get('q') || '', vez = 0, ajuste = 0;
  async function carregar() {
    const minha = ++vez;
    const lim = ajuste || cabem($('#lista'), window.innerHeight <= 760 ? 70 : 80, 52 + 24);
    const r = await api('an_listar', { query: { q: termo, cliente, pagina: pg, limite: lim } });
    if (minha !== vez) return;
    if (!r.ok) { $('#estado').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível carregar as fichas.'), 'erro'); $('#lista').innerHTML = ''; return; }
    pg = r.pagina;
    const u = new URL(location.href); termo ? u.searchParams.set('q', termo) : u.searchParams.delete('q'); pg > 1 ? u.searchParams.set('p', pg) : u.searchParams.delete('p'); history.replaceState(null, '', u);
    $('#lista').innerHTML = r.total ? r.itens.map(f => `
      <li class="item"><div class="item-info"><div class="item-nome">${esc(f.cliente_nome)}</div>
        <div class="item-extra"><span class="selo-mini sm-${f.situacao === 'conferida' ? 'confirmado' : 'agendado'}">${SIT[f.situacao]} · </span>${esc(f.servico_nome || 'Procedimento não informado')} · ${dataCurta(f.data)}</div></div>
        <span class="selo-lado">${seloSit(f.situacao)}</span>
        <a class="btn btn-linha" href="${BASE}ver/?id=${encodeURIComponent(f.id)}" aria-label="Abrir ficha de ${esc(f.cliente_nome)}, ${SIT[f.situacao]}">Abrir</a></li>`).join('')
      : `<li class="vazio"><span class="avatar grande" aria-hidden="true">✦</span><h2>${termo ? 'Nenhuma ficha encontrada' : 'Nenhuma ficha de anamnese'}</h2>
         <p>${termo ? `Nada para “${esc(termo)}”.` : 'Toque em “Nova ficha” para registrar a primeira.'}</p></li>`;
    ligarNav($('#nav'), { ...r, rotulo: 'fichas' }, (n) => { pg = n; carregar(); });
    if (passou() && lim > 2 && r.itens.length >= lim) { ajuste = lim - 1; carregar(); }
  }
  const q = $('#q');
  if (q) {
    let espera;
    q.addEventListener('input', (e) => { clearTimeout(espera); espera = setTimeout(() => { termo = e.target.value.trim(); pg = 1; carregar(); }, 300); });
    $('#form-busca').onsubmit = (e) => { e.preventDefault(); termo = q.value.trim(); pg = 1; carregar(); };
  }
  carregar();
}

// ═══════════════════════════ ETAPA 1 — CLIENTE ═════════════════════════════
async function etapaCliente() {
  // pontos de entrada: ?ag=<atendimento> (vem da agenda) e ?cliente=<id> (vem do perfil)
  if (!fichaId() && params.get('ag')) {
    carregando('Nova ficha');
    const a = await api('ag_ver', { id: params.get('ag') });
    if (!a.ok) return telaErro('Nova ficha', a.msg || 'Atendimento não encontrado.');
    const x = a.agendamento;
    gravarRasc('an:novo', { ...vazio(), cliente_id: x.cliente_id, cliente_nome: x.cliente_nome, agendamento_id: x.id, agendamento_rotulo: `${dataCurta(x.data)}, ${x.inicio} · ${x.servico_nome}`,
      servico_id: x.servico_id, servico_nome: x.servico_nome, profissional_id: x.profissional_id, profissional_nome: x.profissional_nome, data: x.data });
    return location.replace(F + 'procedimento/');
  }
  if (!fichaId() && params.get('cliente')) {
    const v = await api('ver', { id: params.get('cliente') });
    if (v.ok && (!ler() || ler().cliente_id !== v.cliente.id)) gravarRasc('an:novo', { ...vazio(), cliente_id: v.cliente.id, cliente_nome: v.cliente.nome });
    return location.replace(F);
  }
  if (!ler()) gravarRasc(chaveRasc(), vazio());
  const d = ler();
  const form = pagina({
    titulo: fichaId() ? 'Editar ficha' : 'Nova ficha', etapa: 1, etapasTotal: 5, formulario: true, voltar: fichaId() ? `${BASE}ver/?id=${encodeURIComponent(fichaId())}` : BASE, voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Cliente e procedimento · 1ª parte: cliente</p>
      ${avisoAlterada(d)}<div id="escolhida"></div>
      <div id="busca-area"><div class="campo"><label for="q">Buscar cliente cadastrada</label><input id="q" type="search" autocomplete="off" aria-describedby="cliente_id-erro"></div>
        <span class="erro" id="cliente_id-erro" aria-live="polite"></span>
        <ul class="lista lista-compacta" id="lista" aria-label="Clientes"></ul>${navPaginas('nav')}
        <p class="ajuda">Não encontrou? <a href="/brow-studio/clientes/nova/">Cadastre a cliente</a> e volte aqui.</p></div>
      <div id="aviso"></div>`,
    acoes: `${botaoRascunho}<a class="btn btn-linha" href="${fichaId() ? `${BASE}ver/?id=${encodeURIComponent(fichaId())}` : BASE}">Cancelar</a><button type="submit" class="btn btn-cheio">Próximo <span aria-hidden="true">→</span></button>`
  });
  const desenhar = () => {
    const x = ler();
    if (!x.cliente_id) { $('#escolhida').innerHTML = ''; $('#busca-area').hidden = false; return; }
    $('#busca-area').hidden = true;
    $('#escolhida').innerHTML = `<div class="bloco cliente-escolhida"><div class="bloco-topo"><h2>${esc(x.cliente_nome)}</h2><button type="button" class="btn btn-linha btn-pequeno" id="trocar">Trocar</button></div>
      <p class="ajuda">Cliente da ficha.</p></div>`;
    $('#trocar').onclick = () => { guardar({ cliente_id: null, cliente_nome: '', agendamento_id: null, agendamento_rotulo: '' }, true); desenhar(); buscar(); $('#q').focus(); };
  };
  let termo = '', pg = 1, vez = 0;
  async function buscar() {
    const minha = ++vez;
    const r = await api('listar', { query: { q: termo, pagina: pg, limite: cabem($('#lista'), 62, 52 + 70 + 40) } });
    if (minha !== vez) return;
    if (!r.ok) { $('#aviso').innerHTML = avisoHTML(esc(r.msg), 'erro'); return; }
    $('#lista').innerHTML = r.total ? r.itens.map(c => `<li class="item item-compacto"><div class="item-info"><div class="item-nome">${esc(c.nome)}</div></div>
      <button type="button" class="btn btn-linha" data-id="${esc(c.id)}" data-nome="${esc(c.nome)}">Escolher</button></li>`).join('')
      : `<li class="vazio vazio-compacto"><p>${termo ? 'Nenhuma cliente encontrada.' : 'Nenhuma cliente cadastrada.'}</p></li>`;
    ligarNav($('#nav'), r, (n) => { pg = n; buscar(); });
    $('#lista').querySelectorAll('[data-id]').forEach(b => b.onclick = () => {
      const mudouCliente = ler().cliente_id !== b.dataset.id;
      guardar({ cliente_id: b.dataset.id, cliente_nome: b.dataset.nome, ...(mudouCliente ? { agendamento_id: null, agendamento_rotulo: '' } : {}) }, mudouCliente);
      $('#cliente_id-erro').textContent = ''; desenhar();
    });
  }
  let espera;
  $('#q').addEventListener('input', (e) => { clearTimeout(espera); espera = setTimeout(() => { termo = e.target.value.trim(); pg = 1; buscar(); }, 300); });
  $('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
  desenhar(); if (!d.cliente_id) buscar();
  ligarRascunho('cliente');
  form.onsubmit = (e) => { e.preventDefault(); if (!ler().cliente_id) { $('#cliente_id-erro').textContent = 'Escolha a cliente.'; $('#q').focus(); return; } irProxima(F + 'atendimento/' + qs()); };
  focarTitulo();
}

// ─── 1ª etapa, 2ª parte: vincular atendimento (opcional) ────────────────────
async function etapaAtendimento() {
  const d = ler(); if (!d || !d.cliente_id) return ir(F + qs());
  const form = pagina({
    titulo: fichaId() ? 'Editar ficha' : 'Nova ficha', etapa: 1, etapasTotal: 5, formulario: true, voltar: F + qs(), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Cliente e procedimento · 2ª parte: atendimento (opcional) · ${esc(d.cliente_nome)}</p>
      <p class="ajuda">Vincular a um atendimento da agenda preenche serviço, profissional e data. Não é obrigatório.</p>
      <ul class="lista lista-compacta" id="lista" role="radiogroup" aria-label="Atendimentos da cliente"></ul>${navPaginas('nav')}<div id="aviso"></div>`,
    acoes: rodapeEtapa(F + qs())
  });
  let pg = 1;
  async function listar() {
    const r = await api('an_atendimentos', { query: { cliente: d.cliente_id, pagina: pg, limite: cabem($('#lista'), 60, 52 + 70 + 20) - 1 } });
    if (!r.ok) { $('#aviso').innerHTML = avisoHTML(esc(r.msg), 'erro'); return; }
    const atual = ler().agendamento_id || '';
    $('#lista').innerHTML = `<li><label class="opcao opcao-linha"><input type="radio" name="ag" value="" ${atual ? '' : 'checked'}><span><strong>Não vincular a atendimento</strong><small>Preencher serviço, profissional e data na próxima página.</small></span></label></li>` +
      r.itens.map(a => `<li><label class="opcao opcao-linha"><input type="radio" name="ag" value="${esc(a.id)}" ${a.id === atual ? 'checked' : ''}>
        <span><strong>${dataCurta(a.data)}, ${hhmm(a.inicio_min)} · ${esc(a.servico_nome)}</strong><small>${esc(a.profissional_nome)}</small></span></label></li>`).join('');
    $('#lista').querySelectorAll('input').forEach(i => i.onchange = () => {
      const a = r.itens.find(x => x.id === i.value);
      if (a) guardar({ agendamento_id: a.id, agendamento_rotulo: `${dataCurta(a.data)}, ${hhmm(a.inicio_min)} · ${a.servico_nome}`, servico_id: a.servico_id, servico_nome: a.servico_nome, profissional_id: a.profissional_id, profissional_nome: a.profissional_nome, data: a.data }, true);
      else guardar({ agendamento_id: null, agendamento_rotulo: '' }, true);
    });
    ligarNav($('#nav'), { ...r, rotulo: 'atendimentos' }, (n) => { pg = n; listar(); });
  }
  listar();
  ligarRascunho('atendimento');
  form.onsubmit = (e) => { e.preventDefault(); irProxima(F + 'procedimento/' + qs()); };
  focarTitulo();
}

// ─── 1ª etapa, 3ª parte: serviço, profissional e data ───────────────────────
async function etapaProcedimento() {
  const d = ler(); if (!d || !d.cliente_id) return ir(F + qs());
  const cfg = await api('ag_config_ver');
  const profs = cfg.ok ? cfg.profissionais.filter(p => p.ativo || p.id === d.profissional_id) : [];
  const form = pagina({
    titulo: fichaId() ? 'Editar ficha' : 'Nova ficha', etapa: 1, etapasTotal: 5, formulario: true, voltar: F + 'atendimento/' + qs(), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Cliente e procedimento · 3ª parte · ${esc(d.cliente_nome)}</p>
      ${d.agendamento_id ? avisoHTML(`Vinculada ao atendimento <strong>${esc(d.agendamento_rotulo)}</strong>.`, 'vinculo') : ''}
      ${profs.length ? grupoOpcoes({ nome: 'profissional_id', legenda: 'Profissional responsável', opcoes: Object.fromEntries(profs.map(p => [p.id, p.nome])), valor: d.profissional_id, colunas: 3 })
        : avisoHTML('Nenhuma profissional cadastrada. <a href="/brow-studio/agenda/configuracoes/profissionais/">Cadastre em Configurações da agenda</a>. Sem ela, a ficha pode ser salva só como rascunho.', 'erro')}
      ${campoTexto({ id: 'data', rotulo: 'Data', valor: d.data || (cfg.ok ? cfg.hoje : ''), tipo: 'date' })}
      <fieldset class="campo" aria-describedby="servico_id-erro"><legend>Serviço / procedimento <span class="opcional" id="escolhido" aria-live="polite"></span></legend>
        <ul class="lista lista-compacta" id="lista" role="radiogroup" aria-label="Serviços"></ul><span class="erro" id="servico_id-erro" aria-live="polite"></span></fieldset>
      ${navPaginas('nav')}<div id="aviso"></div>`,
    acoes: rodapeEtapa(F + 'atendimento/' + qs())
  });
  const lerForm = () => ({ profissional_id: (form.querySelector('[name=profissional_id]:checked') || {}).value || ler().profissional_id || null,
    profissional_nome: (profs.find(p => p.id === (form.querySelector('[name=profissional_id]:checked') || {}).value) || {}).nome || ler().profissional_nome, data: form.data.value });
  form.addEventListener('change', (e) => { if (e.target.name !== 'servico_id') guardar(lerForm(), true); });
  let pg = 1;
  async function listar() {
    const r = await api('servicos_listar', { query: { pagina: pg, limite: cabem($('#lista'), 56, 52 + 70 + 40, 1), ativos: '1' } });
    if (!r.ok) { $('#aviso').innerHTML = avisoHTML(esc(r.msg), 'erro'); return; }
    const atual = ler().servico_id;
    const itens = r.itens.slice();
    $('#escolhido').textContent = ler().servico_nome ? `— escolhido: ${ler().servico_nome}` : '';
    $('#lista').innerHTML = (itens.length ? itens.map(s => `<li><label class="opcao opcao-linha"><input type="radio" name="servico_id" value="${esc(s.id)}" ${s.id === atual ? 'checked' : ''}>
        <span><strong>${esc(s.nome)}</strong><small>${esc(s.categoria_nome)} · ${s.duracao_min} min · ${reais(s.valor_centavos)}</small></span></label></li>`).join('') : '<li class="vazio vazio-compacto"><p>Nenhum serviço ativo.</p></li>');
    $('#lista').querySelectorAll('input').forEach(i => i.onchange = () => {
      const s = itens.find(x => x.id === i.value);
      if (s) { guardar({ servico_id: s.id, servico_nome: s.nome }, true); $('#escolhido').textContent = `— escolhido: ${s.nome}`; }
    });
    ligarNav($('#nav'), { ...r, rotulo: 'serviços' }, (n) => { pg = n; listar(); });
  }
  listar();
  ligarRascunho('procedimento', () => guardar(lerForm(), false));
  form.onsubmit = (e) => {
    e.preventDefault();
    guardar(lerForm(), false);
    const x = ler(); const er = {};
    if (!x.servico_id) er.servico_id = 'Escolha o serviço.';
    if (!x.data) er.data = 'Informe a data.';
    if (profs.length && !x.profissional_id) er.profissional_id = 'Escolha a profissional responsável.';
    if (!mostrarErros(form, er)) return;
    irProxima(F + 'alergias/' + qs());
  };
  focarTitulo();
}

// ═══════════════════════════ ETAPAS 2 e 3 — PERGUNTAS ══════════════════════
// Mesma página para alergias e medicamentos (modelo padrao_v1).
const PERGUNTAS = {
  alergias: { n: 2, titulo: 'Alergias relatadas', pergunta: 'A cliente relata alguma alergia?', detalhe: 'Quais alergias ou reações foram relatadas?', ant: 'procedimento/', prox: 'medicamentos/' },
  medicamentos: { n: 3, titulo: 'Medicamentos', pergunta: 'A cliente relata uso de medicamentos?', detalhe: 'Quais medicamentos foram relatados?', ant: 'alergias/', prox: 'historico/',
    nota: 'Registre apenas o relato da cliente. Esta ficha não recomenda suspensão, mudança de dose nem tratamento.' }
};
function etapaPergunta(chave) {
  const cfg = PERGUNTAS[chave];
  const d = ler(); if (!d || !d.cliente_id) return ir(F + qs());
  const r = d.respostas[chave];
  const form = pagina({
    titulo: cfg.titulo, etapa: cfg.n, etapasTotal: 5, formulario: true, voltar: F + cfg.ant + qs(), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(d.cliente_nome)}</p>${avisoAlterada(d)}
      <fieldset class="campo" aria-describedby="${chave}-erro"><legend class="pergunta">${cfg.pergunta}</legend>
        <div class="opcoes tres">${Object.entries(RESP).map(([v, t]) => `<label class="opcao"><input type="radio" name="${chave}" value="${v}" ${r.resposta === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
        <span class="erro" id="${chave}-erro" aria-live="polite"></span></fieldset>
      <div class="campo" id="caixa-detalhe" ${r.resposta === 'sim' ? '' : 'hidden'}>
        <label for="${chave}_detalhe">${cfg.detalhe} <span class="opcional">(obrigatório)</span></label>
        <textarea id="${chave}_detalhe" name="${chave}_detalhe" maxlength="600" rows="4" class="curta" aria-describedby="${chave}_detalhe-erro">${esc(r.detalhe || '')}</textarea>
        <span class="erro" id="${chave}_detalhe-erro" aria-live="polite"></span></div>
      ${cfg.nota ? `<p class="ajuda">${cfg.nota}</p>` : ''}
      <div id="aviso"></div>`,
    acoes: rodapeEtapa(F + cfg.ant + qs())
  });
  const lerForm = () => {
    const resposta = (form.querySelector(`[name=${chave}]:checked`) || {}).value || null;     // sem marcação = não respondida
    return { resposta, detalhe: form[`${chave}_detalhe`].value };
  };
  const atualizar = () => {
    const v = lerForm();
    $('#caixa-detalhe').hidden = v.resposta !== 'sim';
    const atual = ler();
    guardar({ respostas: { ...atual.respostas, [chave]: v } }, true);
  };
  form.addEventListener('change', atualizar);
  form[`${chave}_detalhe`].addEventListener('input', atualizar);
  ligarRascunho(chave);
  form.onsubmit = (e) => {
    e.preventDefault();
    const v = lerForm(); const er = {};
    if (!v.resposta) er[chave] = 'Escolha uma opção (use “Não sabe informar” se for o caso).';
    else if (v.resposta === 'sim' && !v.detalhe.trim()) er[`${chave}_detalhe`] = 'Preencha este campo: a resposta foi Sim.';
    if (!mostrarErros(form, er)) return;
    irProxima(F + cfg.prox + qs());
  };
  focarTitulo();
}

// ═══════════════════════════ ETAPA 4 — HISTÓRICO E OBSERVAÇÕES ═════════════
function etapaHistorico() {
  const d = ler(); if (!d || !d.cliente_id) return ir(F + qs());
  const h = d.respostas.historico;
  const form = pagina({
    titulo: 'Histórico', etapa: 4, etapasTotal: 5, formulario: true, voltar: F + 'medicamentos/' + qs(), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Histórico e observações · 1ª parte · ${esc(d.cliente_nome)}</p>${avisoAlterada(d)}
      <div class="campo"><label for="procedimentos_anteriores">Procedimentos anteriores na região <span class="opcional">(opcional)</span></label>
        <textarea id="procedimentos_anteriores" name="procedimentos_anteriores" maxlength="600" rows="3" class="curta">${esc(h.procedimentos_anteriores || '')}</textarea></div>
      <div class="campo"><label for="pele">Como a cliente descreve a pele na região <span class="opcional">(opcional)</span></label>
        <textarea id="pele" name="pele" maxlength="400" rows="3" class="curta">${esc(h.pele || '')}</textarea></div><div id="aviso"></div>`,
    acoes: rodapeEtapa(F + 'medicamentos/' + qs())
  });
  form.addEventListener('input', () => { const a = ler(); guardar({ respostas: { ...a.respostas, historico: { procedimentos_anteriores: form.procedimentos_anteriores.value, pele: form.pele.value } } }, true); });
  ligarRascunho('historico');
  form.onsubmit = (e) => { e.preventDefault(); irProxima(F + 'observacoes/' + qs()); };
  focarTitulo();
}
function etapaObservacoes() {
  const d = ler(); if (!d || !d.cliente_id) return ir(F + qs());
  const form = pagina({
    titulo: 'Observações', etapa: 4, etapasTotal: 5, formulario: true, voltar: F + 'historico/' + qs(), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Histórico e observações · 2ª parte · ${esc(d.cliente_nome)}</p>${avisoAlterada(d)}
      <div class="campo"><label for="observacoes">Observações da profissional <span class="opcional">(opcional)</span></label>
        <textarea id="observacoes" name="observacoes" maxlength="1000" rows="6">${esc(d.respostas.observacoes || '')}</textarea></div><div id="aviso"></div>`,
    acoes: rodapeEtapa(F + 'historico/' + qs(), 'Conferência <span aria-hidden="true">→</span>')
  });
  form.addEventListener('input', () => { const a = ler(); guardar({ respostas: { ...a.respostas, observacoes: form.observacoes.value } }, true); });
  ligarRascunho('observacoes');
  form.onsubmit = (e) => { e.preventDefault(); ir(F + 'conferencia/' + qs('semconf')); };
  focarTitulo();
}

// ═══════════════════════════ ETAPA 5 — CONFERÊNCIA ═════════════════════════
function pendenciasLocais(d) {
  const p = [];
  if (!d.servico_id || !d.data || !d.profissional_id) p.push(['Cliente e procedimento', '']);
  const a = d.respostas.alergias, m = d.respostas.medicamentos;
  if (!a.resposta || (a.resposta === 'sim' && !a.detalhe.trim())) p.push(['Alergias', 'alergias']);
  if (!m.resposta || (m.resposta === 'sim' && !m.detalhe.trim())) p.push(['Medicamentos', 'medicamentos']);
  return p;
}
const SECOES = [['procedimento', 'Cliente e procedimento'], ['alergias', 'Alergias relatadas'], ['medicamentos', 'Medicamentos'], ['historico', 'Histórico'], ['observacoes', 'Observações']];
function etapaConferencia() {
  const d = ler(); if (!d || !d.cliente_id) return ir(F + qs());
  const pend = pendenciasLocais(d);
  const resumo = (s) => {
    const r = d.respostas;
    if (s === 'procedimento') return `${d.servico_nome || 'sem serviço'} · ${d.data ? dataCurta(d.data) : 'sem data'}`;
    if (s === 'alergias' || s === 'medicamentos') return r[s].resposta ? RESP[r[s].resposta] : 'Não respondida';
    if (s === 'historico') return r.historico.procedimentos_anteriores || r.historico.pele ? 'Preenchido' : 'Em branco';
    return r.observacoes ? 'Preenchidas' : 'Em branco';
  };
  const form = pagina({
    titulo: 'Conferência', etapa: 5, etapasTotal: 5, formulario: true, voltar: F + 'observacoes/' + qs('semconf'), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(d.cliente_nome)} · revise cada seção</p>${avisoAlterada(d)}
      <nav class="menu-botoes" aria-label="Seções da ficha">${SECOES.map(([s, t]) => `<a class="btn btn-suave" href="${F}revisar/${qs('semconf') ? qs('semconf') + '&' : '?'}s=${s}">${t} <small class="sub-btn sub-sempre">${esc(resumo(s))}</small></a>`).join('')}</nav>
      ${pend.length ? avisoHTML(`Falta responder: ${pend.map(([t]) => t).join(', ')}. Pode salvar como rascunho; para “Conferida”, complete.`, 'erro') : ''}
      <label class="chave"><input type="checkbox" name="confirmacao" ${pend.length ? 'disabled' : ''}><span><strong>Respostas conferidas com a cliente</strong>
        <small>Não equivale a assinatura nem a autorização para realizar o procedimento.</small></span></label>
      <span class="erro" id="confirmacao-erro" aria-live="polite"></span><div id="aviso"></div>`,
    acoes: `${botaoRascunho.replace('btn-rascunho', 'btn-rascunho par')}<button type="submit" class="btn btn-cheio" id="salvar" ${pend.length ? 'disabled' : ''}>Salvar como conferida</button>`
  });
  ligarRascunho('conferencia');
  let enviando = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (enviando) return;
    if (!form.confirmacao.checked) return mostrarErros(form, { confirmacao: 'Marque “Respostas conferidas com a cliente” para salvar como conferida.' });
    enviando = true; const b = $('#salvar'); b.disabled = true; b.textContent = 'Salvando…';
    const r = await salvarNoServidor('conferencia', { conferir: true, confirmacao: true });
    if (r.ok) { apagarRasc(chaveRasc()); recado.pôr('Ficha salva como conferida.'); location.replace(`${BASE}ver/?id=${encodeURIComponent(r.id)}`); return; }
    enviando = false; b.disabled = false; b.textContent = 'Tentar novamente';
    $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível salvar.') + '<br><small>As respostas continuam aqui.</small>', 'erro');
  };
  focarTitulo();
}
// Revisar uma seção (página própria) com acesso para corrigir
function linhasSecao(s, d) {
  const r = d.respostas;
  if (s === 'procedimento') return [['Cliente', d.cliente_nome], ['Atendimento vinculado', d.agendamento_id ? (d.agendamento_rotulo || 'Sim') : 'Não'], ['Serviço', d.servico_nome], ['Profissional', d.profissional_nome], ['Data', d.data ? dataCurta(d.data) : '']];
  if (s === 'alergias') return [['Relata alergia?', r.alergias.resposta ? RESP[r.alergias.resposta] : 'Não respondida'], ...(r.alergias.resposta === 'sim' ? [['Alergias/reações', r.alergias.detalhe]] : [])];
  if (s === 'medicamentos') return [['Relata medicamentos?', r.medicamentos.resposta ? RESP[r.medicamentos.resposta] : 'Não respondida'], ...(r.medicamentos.resposta === 'sim' ? [['Medicamentos', r.medicamentos.detalhe]] : [])];
  if (s === 'historico') return [['Procedimentos anteriores', r.historico.procedimentos_anteriores], ['Pele na região', r.historico.pele]];
  return [['Observações', r.observacoes]];
}
function telaRevisar() {
  const d = ler(); if (!d || !d.cliente_id) return ir(F + qs());
  const s = SECOES.some(([k]) => k === params.get('s')) ? params.get('s') : 'procedimento';
  const titulo = SECOES.find(([k]) => k === s)[1];
  const conf = F + 'conferencia/' + qs('semconf');
  const corrigir = F + (s === 'procedimento' ? '' : PAGINA_DA_ETAPA[s]) + (fichaId() ? `?id=${encodeURIComponent(fichaId())}&conf=1` : '?conf=1');
  pagina({
    titulo, voltar: conf, voltarTexto: 'Conferência',
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(d.cliente_nome)}</p><div class="resumo">${blocoResumo(titulo, linhasSecao(s, d), corrigir)}</div>`,
    acoes: `<a class="btn btn-linha" href="${conf}">${SETA} Voltar à conferência</a><a class="btn btn-cheio" href="${corrigir}">Corrigir</a>`
  });
  focarTitulo();
}

// ═══════════════════════════ LER FICHA (paginada por seção) ════════════════
const dataHora = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
async function telaVer() {
  carregando('Ficha de anamnese');
  const r = await api('an_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Ficha de anamnese', r.msg || 'Não foi possível abrir a ficha.');
  const f = r.ficha; const d = deFicha(f);
  const msg = recado.tirar();
  const paginas = [...SECOES, ['situacao', 'Situação e histórico']];
  let p = Math.min(Math.max(parseInt(params.get('p'), 10) || 1, 1), paginas.length);
  const q = encodeURIComponent(f.id);
  // Rascunho: continua de onde parou. Conferida: registro histórico — atualizar = nova ficha vinculada.
  let botao;
  if (f.situacao === 'rascunho') botao = `<button type="button" class="btn btn-cheio" id="continuar">Continuar preenchimento</button>`;
  else if (r.posterior && r.posterior.situacao === 'rascunho') botao = `<a class="btn btn-cheio" href="${BASE}ver/?id=${encodeURIComponent(r.posterior.id)}">Abrir ficha nova (rascunho)</a>`;
  else botao = `<a class="btn btn-cheio" href="${BASE}nova-versao/?id=${q}">Atualizar em nova ficha</a>`;
  const desenhar = () => {
    const [s, t] = paginas[p - 1];
    const corpo = s === 'situacao'
      ? `<div class="bloco"><dl class="dados"><dt>Situação</dt><dd>${SIT[f.situacao]}${f.situacao === 'conferida' ? ' · registro histórico' : ''}</dd>
          <dt>Criada em</dt><dd>${dataHora(f.criado_em)}</dd>
          ${f.conferida_em ? `<dt>Conferida em</dt><dd>${dataHora(f.conferida_em)}</dd>` : ''}
          <dt>Autoria</dt><dd>${f.conferido_por || f.criado_por ? esc(f.conferido_por || f.criado_por) : 'registrada quando o login estiver ativo'}</dd>
          ${r.anterior ? `<dt>Atualiza</dt><dd><a href="${BASE}ver/?id=${encodeURIComponent(r.anterior.id)}">ficha de ${dataCurta(r.anterior.data)}</a></dd>` : ''}
          ${r.posterior ? `<dt>Atualizada por</dt><dd><a href="${BASE}ver/?id=${encodeURIComponent(r.posterior.id)}">ficha de ${dataCurta(r.posterior.data)} (${SIT[r.posterior.situacao]})</a></dd>` : ''}
          ${Object.keys(r.pendencias).length ? `<dt>Falta</dt><dd>${esc(Object.values(r.pendencias).join(' '))}</dd>` : ''}</dl>
          <p class="ajuda" style="margin-top:8px">“Conferida” = respostas revisadas com a cliente. Não é assinatura nem autorização para o procedimento.</p></div>
        <ul class="lista linha-tempo hist-curto">${r.historico.slice(-3).reverse().map(h => `<li class="evento"><strong>${esc(ACOES_HIST[h.acao] || h.acao)}</strong><small>${esc(dataHora(h.criado_em))}</small></li>`).join('')}</ul>`
      : `<div class="resumo">${blocoResumo(t, linhasSecao(s, d))}</div>`;
    pagina({
      titulo: 'Ficha de anamnese', voltar: BASE, voltarTexto: 'Fichas',
      corpo: `${msg && p === 1 ? avisoHTML(esc(msg), 'ok') : ''}
        <div class="servico-cabeca"><h2>${esc(f.cliente_nome)}</h2>${seloSit(f.situacao)}</div>
        <p class="etapa">${esc(f.servico_nome || 'Procedimento não informado')} · ${esc(f.profissional_nome || 'sem profissional')} · ${dataCurta(f.data)} · seção ${p} de ${paginas.length}</p>
        ${f.copiada && f.situacao === 'rascunho' && p === 1 ? avisoAlterada(d) : ''}
        ${corpo}${navPaginas('nav')}`,
      acoes: `<a class="btn btn-linha" href="${BASE}">${SETA} Fichas</a>
        <a class="btn btn-linha" href="/brow-studio/clientes/perfil/?id=${encodeURIComponent(f.cliente_id)}">Perfil<span class="so-largo">&nbsp;da cliente</span></a>${botao}`
    });
    ligarNav($('#nav'), { pagina: p, paginas: paginas.length }, (n) => { p = n; const u = new URL(location.href); u.searchParams.set('p', p); history.replaceState(null, '', u); desenhar(); });
    const c = $('#continuar');
    if (c) c.onclick = () => { gravarRasc('an:' + f.id, d); location.href = `${F}${PAGINA_DA_ETAPA[f.etapa_atual] || ''}?id=${q}`; };
    focarTitulo();
  };
  desenhar();
}

// Nova ficha a partir de uma conferida (página própria de confirmação)
async function telaNovaVersao() {
  carregando('Atualizar ficha');
  const r = await api('an_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Atualizar ficha', r.msg || 'Ficha não encontrada.');
  const f = r.ficha; const volta = `${BASE}ver/?id=${encodeURIComponent(f.id)}`;
  pagina({
    titulo: 'Atualizar ficha', voltar: volta, voltarTexto: 'Ficha',
    corpo: `<div class="bloco"><div class="servico-cabeca"><h2>${esc(f.cliente_nome)}</h2>${seloSit(f.situacao)}</div>
        <p class="ajuda">${esc(f.servico_nome || '')} · ${dataCurta(f.data)}${f.conferida_em ? ` · conferida em ${dataHora(f.conferida_em)}` : ''}</p></div>
      ${avisoHTML('A ficha conferida <strong>continua guardada como está</strong>, como registro histórico. Será criada uma <strong>nova ficha</strong>, ligada a esta, com as respostas copiadas.')}
      ${avisoHTML('As respostas copiadas <strong>não valem como atuais</strong>: confira cada uma com a cliente e salve a nova ficha como conferida.', 'erro')}
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Cancelar</a><button type="button" class="btn btn-cheio" id="criar">Criar nova ficha</button>`
  });
  let enviando = false;
  $('#criar').onclick = async () => {
    if (enviando) return; enviando = true;
    const b = $('#criar'); b.disabled = true; b.textContent = 'Criando…';
    const rr = await api('an_nova_versao', { corpo: { id: f.id } });
    if (!rr.ok) { enviando = false; b.disabled = false; b.textContent = 'Tentar novamente'; $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível criar a nova ficha.'), 'erro'); return; }
    const v = await api('an_ver', { id: rr.id });
    if (v.ok) gravarRasc('an:' + rr.id, deFicha(v.ficha));
    location.replace(`${F}?id=${encodeURIComponent(rr.id)}`);
  };
  focarTitulo();
}

// ─── roteamento ─────────────────────────────────────────────────────────────
const TELAS = {
  lista: telaLista, cliente: etapaCliente, atendimento: etapaAtendimento, procedimento: etapaProcedimento,
  alergias: () => etapaPergunta('alergias'), medicamentos: () => etapaPergunta('medicamentos'),
  historico: etapaHistorico, observacoes: etapaObservacoes, conferencia: etapaConferencia, revisar: telaRevisar, ver: telaVer, 'nova-versao': telaNovaVersao
};
(async () => {
  const pg = document.body.dataset.pagina;
  // etapa aberta direto pelo endereço de uma ficha salva: busca a ficha antes de desenhar
  if (fichaId() && !['lista', 'ver', 'nova-versao'].includes(pg) && !ler()) {
    carregando('Ficha de anamnese');
    const r = await api('an_ver', { id: fichaId() });
    if (!r.ok) return telaErro('Ficha de anamnese', r.msg || 'Não foi possível abrir a ficha.');
    gravarRasc(chaveRasc(), deFicha(r.ficha));
  }
  (TELAS[pg] || telaLista)();
})();
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
