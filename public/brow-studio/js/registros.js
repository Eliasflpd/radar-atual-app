// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — REGISTRO DE ATENDIMENTOS E FOTOS (10/11/2026)
// Cada página tem rota própria (<body data-pagina="...">). Peças comuns em comum.js.
// Rascunho entre etapas: sessionStorage "rg:novo" ou "rg:<id>" (só nesta aba;
// não é armazenamento definitivo). "Salvar rascunho" grava no servidor: primeiro
// o texto, depois cada foto separadamente (falha numa foto não perde o resto).
// ═══════════════════════════════════════════════════════════════════════════
import { $, params, esc, uuid, lerRasc, gravarRasc, apagarRasc, api, SETA, pagina, campoTexto, grupoOpcoes,
  mostrarErros, avisoHTML, focarTitulo, ir, blocoResumo } from './comum.js?v=3';

const BASE = '/brow-studio/registros/';
const R = BASE + 'reg/';
const TIPOS = { antes: 'Antes', depois: 'Depois' };
const PAG_ETAPA = { cliente: '', atendimento: 'atendimento/', procedimento: 'procedimento/', tecnica: 'tecnica/', produtos: 'produtos/', fotos: 'fotos/', observacoes: 'observacoes/', conferencia: 'conferencia/' };
const HIST = { criado: 'Registro iniciado', rascunho_salvo: 'Rascunho salvo', finalizado: 'Finalizado', foto_salva: 'Foto salva', foto_removida: 'Foto removida', retificado: 'Retificação registrada', complementado: 'Complemento registrado' };
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const dataCurta = (iso) => { if (!iso) return 'Sem data'; const [a, m, d] = iso.split('-'); return `${d} ${MESES[+m - 1]} ${a}`; };
const dataHora = (t) => t ? new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const recado = { pôr(m) { try { sessionStorage.setItem('brow:recado', m); } catch (e) {} }, tirar() { try { const m = sessionStorage.getItem('brow:recado'); sessionStorage.removeItem('brow:recado'); return m; } catch (e) { return null; } } };
const carregando = (t) => pagina({ titulo: t, corpo: avisoHTML('Carregando…') });
function telaErro(titulo, msg, voltar = BASE, vt = 'Atendimentos') { pagina({ titulo, voltar, voltarTexto: vt, corpo: avisoHTML(esc(msg), 'erro'), acoes: `<a class="btn btn-cheio" href="${voltar}">Voltar</a>` }); focarTitulo(); }
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
const seloSit = (s) => `<span class="selo ${s === 'finalizado' ? 'selo-ativo' : 'selo-agendado'}">${s === 'finalizado' ? 'Finalizado' : 'Rascunho'}</span>`;

// ─── situação da autorização de divulgação (módulo Termos) ──────────────────
async function avisoDivulgacao(clienteId) {
  const s = await api('tm_imagem_cliente', { query: { cliente: clienteId } });
  if (!s || !s.ok) return avisoHTML('Não foi possível consultar a autorização de divulgação. Trate as fotos como <strong>uso interno</strong>.', 'erro');
  const CAN = { instagram: 'Instagram do estúdio', portfolio: 'portfólio do estúdio' };
  if (s.situacao === 'autoriza') return avisoHTML(`Divulgação autorizada em termo: <strong>${(s.canais || []).map(c => CAN[c]).join(' e ')}</strong>. Nada é publicado automaticamente.`, 'ok');
  if (s.situacao === 'retirada') return avisoHTML('<strong>Autorização de divulgação retirada.</strong> Fotos somente para uso interno.', 'erro');
  if (s.situacao === 'nao_autoriza') return avisoHTML('<strong>Divulgação não autorizada.</strong> Fotos somente para uso interno.', 'erro');
  return avisoHTML('<strong>Sem autorização de divulgação registrada.</strong> Fotos somente para uso interno.', 'erro');
}

// ─── rascunho ───────────────────────────────────────────────────────────────
const docId = () => params.get('id') || '';
const chave = () => docId() ? 'rg:' + docId() : 'rg:novo';
const qs = (semConf) => { const p = new URLSearchParams(); if (docId()) p.set('id', docId()); if (!semConf && params.get('conf') === '1') p.set('conf', '1'); const s = p.toString(); return s ? '?' + s : ''; };
const vazio = () => ({ id: null, chave_envio: uuid(), cliente_id: null, cliente_nome: '', agendamento_id: null, agendamento_rotulo: '', servico_id: null, servico_nome: '', profissional_id: null, profissional_nome: '', data: '',
  tecnica: '', produtos: [], observacoes: '', fotos: { antes: null, depois: null }, foto_pendente: null });
const ler = () => lerRasc(chave());
function guardar(m) { const d = { ...ler(), ...m }; if (!gravarRasc(chave(), d)) { const a = $('#aviso'); if (a) a.innerHTML = avisoHTML('O aparelho ficou sem espaço para guardar o rascunho (as fotos ocupam muito). Salve o rascunho no servidor.', 'erro'); return false; } return true; }
function deRegistro(g, fotos) {
  return { ...vazio(), id: g.id, chave_envio: null, cliente_id: g.cliente_id, cliente_nome: g.cliente_nome, agendamento_id: g.agendamento_id, servico_id: g.servico_id, servico_nome: g.servico_nome || '',
    profissional_id: g.profissional_id, profissional_nome: g.profissional_nome || '', data: g.data || '', tecnica: g.tecnica || '', produtos: g.produtos || [], observacoes: g.observacoes || '', fotos };
}
async function carregarFotosServidor(id, meta) {
  const fotos = { antes: null, depois: null };
  for (const m of meta || []) {
    const f = await api('rg_foto', { query: { id, tipo: m.tipo } });
    if (f.ok) fotos[m.tipo] = { estado: 'servidor', dataUrl: f.foto, w: f.largura, h: f.altura };
  }
  return fotos;
}
// Grava no servidor: texto primeiro, depois cada foto. Devolve as falhas de foto.
async function sincronizar(etapa, finalizar) {
  let d = ler();
  const corpoBase = { cliente_id: d.cliente_id, servico_id: d.servico_id, profissional_id: d.profissional_id, data: d.data || null, agendamento_id: d.agendamento_id || null,
    tecnica: d.tecnica, observacoes: d.observacoes, produtos: d.produtos, etapa_atual: etapa };
  const r = await api('rg_salvar', { corpo: { ...corpoBase, id: d.id || undefined, chave_envio: d.id ? undefined : d.chave_envio, finalizar: false } });
  if (!r.ok) return { ok: false, r };
  guardar({ id: r.id }); d = ler();
  const falhas = [];
  for (const tipo of ['antes', 'depois']) {
    const f = d.fotos[tipo];
    if (f && f.estado === 'nova') {
      const s = await api('rg_foto_salvar', { corpo: { id: r.id, tipo, imagem: f.dataUrl } });
      if (s.ok) { const at = ler(); at.fotos[tipo] = { ...f, estado: 'servidor' }; guardar({ fotos: at.fotos }); }
      else falhas.push({ tipo, msg: s.msg || 'falha no envio' });
    } else if (f && f.estado === 'removida') {
      const s = await api('rg_foto_remover', { corpo: { id: r.id, tipo } });
      if (s.ok) { const at = ler(); at.fotos[tipo] = null; guardar({ fotos: at.fotos }); }
      else falhas.push({ tipo, msg: s.msg || 'falha ao remover' });
    }
  }
  if (finalizar && !falhas.length) {
    const f = await api('rg_salvar', { corpo: { ...corpoBase, id: r.id, finalizar: true } });
    if (!f.ok) return { ok: false, r: f, id: r.id };
  }
  return { ok: true, id: r.id, falhas };
}
const botaoRascunho = '<button type="button" class="btn btn-suave btn-rascunho" id="rascunho">Salvar rascunho e sair</button>';
function ligarRascunho(etapa, antes) {
  const b = $('#rascunho'); if (!b) return;
  let env = false;
  b.onclick = async () => {
    if (env) return; if (antes) antes();
    if (!ler().cliente_id) { $('#aviso').innerHTML = avisoHTML('Escolha a cliente antes de salvar.', 'erro'); return; }
    env = true; b.disabled = true; b.textContent = 'Salvando…';
    const s = await sincronizar(etapa, false);
    env = false; b.disabled = false; b.textContent = 'Salvar rascunho e sair';
    if (!s.ok) { $('#aviso').innerHTML = avisoHTML(esc(s.r.msg || 'Não foi possível salvar.') + (s.r.erro === 'duplicado' && s.r.id ? ` <a href="${BASE}ver/?id=${encodeURIComponent(s.r.id)}">Abrir o registro existente</a>.` : '') + '<br><small>Os dados continuam aqui.</small>', 'erro'); return; }
    if (s.falhas.length) { $('#aviso').innerHTML = avisoHTML(`Registro salvo, mas a foto <strong>${s.falhas.map(f => TIPOS[f.tipo]).join(' e ')}</strong> não foi enviada (${esc(s.falhas[0].msg)}). Ela continua neste aparelho: tente de novo.`, 'erro'); return; }
    apagarRasc(chave()); apagarRasc('rg:' + s.id); recado.pôr('Rascunho salvo. Você pode continuar depois de onde parou.');
    location.replace(`${BASE}ver/?id=${encodeURIComponent(s.id)}`);
  };
}
function rodape(voltar, proxTexto) {
  const conf = params.get('conf') === '1';
  return `${botaoRascunho}<a class="btn btn-linha" href="${voltar}">${SETA} Voltar</a><button type="submit" class="btn btn-cheio" id="prox">${conf ? 'Voltar à conferência' : (proxTexto || 'Próximo <span aria-hidden="true">→</span>')}</button>`;
}
const irProx = (dest) => ir(params.get('conf') === '1' ? R + 'conferencia/' + qs(true) : dest);
const titulo = () => docId() ? 'Registro (continuação)' : 'Registrar atendimento';
const etapaHTML = (t) => `<p class="etapa" style="margin-top:-8px">${t}</p>`;

// ═══════════════════════════ HISTÓRICO (lista) ═════════════════════════════
async function telaLista() {
  const cliente = params.get('cliente') || '', agendamento = params.get('agendamento') || '';
  const msg = recado.tirar(); const rasc = lerRasc('rg:novo');
  let nome = '';
  if (cliente) { const v = await api('ver', { id: cliente }); if (v.ok) nome = v.cliente.nome; }
  const sv = await api('servicos_listar', { query: { limite: 50 } });
  const novo = `${R}${agendamento ? '?ag=' + encodeURIComponent(agendamento) : cliente ? '?cliente=' + encodeURIComponent(cliente) : ''}`;
  pagina({
    titulo: 'Atendimentos realizados', voltar: cliente ? `/brow-studio/clientes/perfil/?id=${encodeURIComponent(cliente)}` : agendamento ? `/brow-studio/agenda/atendimento/?id=${encodeURIComponent(agendamento)}` : '/brow-studio/profissional.html',
    voltarTexto: cliente ? 'Perfil' : agendamento ? 'Atendimento' : 'Voltar',
    extra: `<a class="btn btn-cheio btn-topo" href="${novo}" aria-label="Registrar atendimento">+ Registrar<span class="so-largo">&nbsp;atendimento</span></a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      ${rasc && rasc.cliente_id ? avisoHTML(`Registro em preenchimento, ainda não salvo: <strong>${esc(rasc.cliente_nome)}</strong>`, 'compacto', `<div class="linha-acoes"><a class="btn btn-cheio" href="${R}">Continuar</a><button type="button" class="btn btn-linha" id="descartar">Descartar</button></div>`) : ''}
      ${cliente ? `<p class="linha-dia">Atendimentos de <strong>${esc(nome || 'cliente')}</strong> · <a href="${BASE}">ver todos</a></p>` : agendamento ? `<p class="linha-dia">Registro deste atendimento · <a href="${BASE}">ver todos</a></p>` : `
      <form class="busca filtros" role="search" id="form-busca">
        <div class="campo"><label for="q">Buscar por cliente</label><input id="q" type="search" autocomplete="off" value="${esc(params.get('q') || '')}"></div>
        <div class="campo campo-curto"><label for="fdata">Data</label><input id="fdata" type="date" value="${esc(params.get('data') || '')}"></div>
        <div class="campo campo-curto"><label for="fservico">Serviço</label><select id="fservico"><option value="">Todos</option>${(sv.ok ? sv.itens : []).map(s => `<option value="${esc(s.id)}" ${s.id === params.get('servico') ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select></div>
      </form>`}
      <div id="estado"></div><ul class="lista" id="lista" aria-label="Atendimentos registrados"></ul>${navPaginas('nav')}`
  });
  const dd = $('#descartar'); if (dd) dd.onclick = () => { apagarRasc('rg:novo'); dd.closest('.aviso-caixa').remove(); };
  let pg = 1, vez = 0, ajuste = 0;
  async function carregar() {
    const minha = ++vez;
    const lim = ajuste || cabem($('#lista'), window.innerHeight <= 760 ? 72 : 82, 52 + 24);
    const qq = $('#q') ? { q: $('#q').value.trim(), data: $('#fdata').value, servico: $('#fservico').value } : {};
    const r = await api('rg_listar', { query: { ...qq, cliente, agendamento, pagina: pg, limite: lim } });
    if (minha !== vez) return;
    if (!r.ok) { $('#estado').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível carregar.'), 'erro'); $('#lista').innerHTML = ''; return; }
    $('#lista').innerHTML = r.total ? r.itens.map(g => `<li class="item"><div class="item-info"><div class="item-nome">${esc(g.cliente_nome)}</div>
        <div class="item-extra"><span class="selo-mini">${g.situacao === 'finalizado' ? 'Finalizado' : 'Rascunho'} · </span>${esc(g.servico_nome || 'Procedimento não informado')} · ${esc(g.profissional_nome || 'sem profissional')} · ${dataCurta(g.data)}${g.fotos ? ` · ${g.fotos} foto${g.fotos > 1 ? 's' : ''}` : ''}</div></div>
        <span class="selo-lado">${seloSit(g.situacao)}</span><a class="btn btn-linha" href="${BASE}ver/?id=${encodeURIComponent(g.id)}" aria-label="Abrir registro de ${esc(g.cliente_nome)}">Abrir</a></li>`).join('')
      : `<li class="vazio"><span class="avatar grande" aria-hidden="true">✦</span><h2>Nenhum atendimento registrado</h2><p>${agendamento ? 'Este atendimento ainda não tem registro.' : 'Toque em “Registrar atendimento” para começar.'}</p></li>`;
    ligarNav($('#nav'), { ...r, rotulo: 'registros' }, (n) => { pg = n; carregar(); });
    if (passou() && lim > 2 && r.itens.length >= lim) { ajuste = lim - 1; carregar(); }
  }
  if ($('#q')) {
    let e; $('#q').addEventListener('input', () => { clearTimeout(e); e = setTimeout(() => { pg = 1; carregar(); }, 300); });
    $('#fdata').onchange = () => { pg = 1; carregar(); }; $('#fservico').onchange = () => { pg = 1; carregar(); };
    $('#form-busca').onsubmit = (ev) => { ev.preventDefault(); pg = 1; carregar(); };
  }
  carregar();
}

// ═══════════════════════════ ETAPA 1 — CLIENTE E ATENDIMENTO ═══════════════
async function etapaCliente() {
  if (!docId() && params.get('ag')) {
    carregando('Registrar atendimento');
    const ja = await api('rg_por_agendamento', { query: { agendamento: params.get('ag') } });
    if (ja.ok && ja.registro) { recado.pôr('Este atendimento já tem registro: abrimos o existente em vez de criar outro.'); return location.replace(`${BASE}ver/?id=${encodeURIComponent(ja.registro.id)}`); }
    const a = await api('ag_ver', { id: params.get('ag') });
    if (!a.ok) return telaErro('Registrar atendimento', a.msg || 'Atendimento não encontrado.');
    const x = a.agendamento;
    gravarRasc('rg:novo', { ...vazio(), cliente_id: x.cliente_id, cliente_nome: x.cliente_nome, agendamento_id: x.id, agendamento_rotulo: `${dataCurta(x.data)}, ${x.inicio} · ${x.servico_nome}`,
      servico_id: x.servico_id, servico_nome: x.servico_nome, profissional_id: x.profissional_id, profissional_nome: x.profissional_nome, data: x.data });
    return location.replace(R + 'procedimento/');
  }
  if (!docId() && params.get('cliente')) {
    const v = await api('ver', { id: params.get('cliente') });
    if (v.ok && (!ler() || ler().cliente_id !== v.cliente.id)) gravarRasc('rg:novo', { ...vazio(), cliente_id: v.cliente.id, cliente_nome: v.cliente.nome });
    return location.replace(R);
  }
  if (!ler()) gravarRasc(chave(), vazio());
  const form = pagina({
    titulo: titulo(), etapa: 1, etapasTotal: 5, formulario: true, voltar: BASE, voltarTexto: 'Atendimentos',
    corpo: `${etapaHTML('Cliente e atendimento · 1ª parte: cliente')}<div id="escolhida"></div>
      <div id="busca-area"><div class="campo"><label for="q">Buscar cliente cadastrada</label><input id="q" type="search" autocomplete="off" aria-describedby="cliente_id-erro"></div>
        <span class="erro" id="cliente_id-erro" aria-live="polite"></span><ul class="lista lista-compacta" id="lista"></ul>${navPaginas('nav')}</div><div id="aviso"></div>`,
    acoes: `${botaoRascunho}<a class="btn btn-linha" href="${BASE}">Cancelar</a><button type="submit" class="btn btn-cheio">Próximo <span aria-hidden="true">→</span></button>`
  });
  const desenhar = () => {
    const x = ler();
    if (!x.cliente_id) { $('#escolhida').innerHTML = ''; $('#busca-area').hidden = false; return; }
    $('#busca-area').hidden = true;
    $('#escolhida').innerHTML = `<div class="bloco cliente-escolhida"><div class="bloco-topo"><h2>${esc(x.cliente_nome)}</h2><button type="button" class="btn btn-linha btn-pequeno" id="trocar">Trocar</button></div><p class="ajuda">Dados vindos do cadastro.</p></div>`;
    $('#trocar').onclick = () => { guardar({ cliente_id: null, cliente_nome: '', agendamento_id: null, agendamento_rotulo: '' }); desenhar(); buscar(); };
  };
  let termo = '', pg = 1, vez = 0;
  async function buscar() {
    const minha = ++vez;
    const r = await api('listar', { query: { q: termo, pagina: pg, limite: cabem($('#lista'), 62, 52 + 70 + 20) } });
    if (minha !== vez || !r.ok) return;
    $('#lista').innerHTML = r.total ? r.itens.map(c => `<li class="item item-compacto"><div class="item-info"><div class="item-nome">${esc(c.nome)}</div></div><button type="button" class="btn btn-linha" data-id="${esc(c.id)}" data-nome="${esc(c.nome)}">Escolher</button></li>`).join('')
      : `<li class="vazio vazio-compacto"><p>${termo ? 'Nenhuma cliente encontrada.' : 'Nenhuma cliente cadastrada.'}</p></li>`;
    ligarNav($('#nav'), r, (n) => { pg = n; buscar(); });
    $('#lista').querySelectorAll('[data-id]').forEach(b => b.onclick = () => { guardar({ cliente_id: b.dataset.id, cliente_nome: b.dataset.nome, agendamento_id: null, agendamento_rotulo: '' }); desenhar(); });
  }
  let e; $('#q').addEventListener('input', (ev) => { clearTimeout(e); e = setTimeout(() => { termo = ev.target.value.trim(); pg = 1; buscar(); }, 300); });
  $('#q').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ev.preventDefault(); });
  desenhar(); if (!ler().cliente_id) buscar();
  ligarRascunho('cliente');
  form.onsubmit = (ev) => { ev.preventDefault(); if (!ler().cliente_id) { $('#cliente_id-erro').textContent = 'Escolha a cliente.'; return; } irProx(R + 'atendimento/' + qs()); };
  focarTitulo();
}
async function etapaAtendimento() {
  const d = ler(); if (!d || !d.cliente_id) return ir(R + qs());
  const form = pagina({
    titulo: titulo(), etapa: 1, etapasTotal: 5, formulario: true, voltar: R + qs(), voltarTexto: 'Voltar',
    corpo: `${etapaHTML(`Cliente e atendimento · 2ª parte: agenda (opcional) · ${esc(d.cliente_nome)}`)}
      <ul class="lista lista-compacta" id="lista" role="radiogroup" aria-label="Atendimentos da agenda"></ul>${navPaginas('nav')}<div id="aviso"></div>`,
    acoes: rodape(R + qs())
  });
  let pg = 1;
  async function listar() {
    const r = await api('an_atendimentos', { query: { cliente: d.cliente_id, pagina: pg, limite: cabem($('#lista'), 60, 52 + 70 + 20) - 1 } });
    if (!r.ok) return;
    const atual = ler().agendamento_id || '';
    $('#lista').innerHTML = `<li><label class="opcao opcao-linha"><input type="radio" name="ag" value="" ${atual ? '' : 'checked'}><span><strong>Sem agendamento</strong><small>Registrar um atendimento que não está na agenda.</small></span></label></li>` +
      r.itens.map(a => `<li><label class="opcao opcao-linha"><input type="radio" name="ag" value="${esc(a.id)}" ${a.id === atual ? 'checked' : ''}><span><strong>${dataCurta(a.data)}, ${hhmm(a.inicio_min)} · ${esc(a.servico_nome)}</strong><small>${esc(a.profissional_nome)}</small></span></label></li>`).join('');
    $('#lista').querySelectorAll('input').forEach(i => i.onchange = async () => {
      $('#aviso').innerHTML = '';
      const a = r.itens.find(x => x.id === i.value);
      if (!a) { guardar({ agendamento_id: null, agendamento_rotulo: '' }); return; }
      // um registro por atendimento: se já existe, oferece abrir em vez de duplicar
      const ja = await api('rg_por_agendamento', { query: { agendamento: a.id } });
      if (ja.ok && ja.registro && ja.registro.id !== ler().id) {
        i.checked = false; form.querySelector('input[name=ag][value=""]').checked = !ler().agendamento_id;
        $('#aviso').innerHTML = avisoHTML('Este atendimento <strong>já tem registro</strong>. Abra o existente em vez de criar outro.', 'erro', `<div class="linha-acoes"><a class="btn btn-cheio" href="${BASE}ver/?id=${encodeURIComponent(ja.registro.id)}">Abrir registro existente</a></div>`);
        return;
      }
      guardar({ agendamento_id: a.id, agendamento_rotulo: `${dataCurta(a.data)}, ${hhmm(a.inicio_min)} · ${a.servico_nome}`, servico_id: a.servico_id, servico_nome: a.servico_nome, profissional_id: a.profissional_id, profissional_nome: a.profissional_nome, data: a.data });
    });
    ligarNav($('#nav'), { ...r, rotulo: 'atendimentos' }, (n) => { pg = n; listar(); });
  }
  listar(); ligarRascunho('atendimento');
  form.onsubmit = (ev) => { ev.preventDefault(); irProx(R + 'procedimento/' + qs()); };
  focarTitulo();
}
async function etapaProcedimento() {
  const d = ler(); if (!d || !d.cliente_id) return ir(R + qs());
  const cfg = await api('ag_config_ver');
  const profs = cfg.ok ? cfg.profissionais.filter(p => p.ativo || p.id === d.profissional_id) : [];
  const form = pagina({
    titulo: titulo(), etapa: 1, etapasTotal: 5, formulario: true, voltar: R + 'atendimento/' + qs(), voltarTexto: 'Voltar',
    corpo: `${etapaHTML(`Cliente e atendimento · 3ª parte · ${esc(d.cliente_nome)}`)}
      ${d.agendamento_id ? avisoHTML(`Vinculado ao atendimento <strong>${esc(d.agendamento_rotulo || '')}</strong>.`, 'vinculo') : ''}
      ${profs.length ? grupoOpcoes({ nome: 'profissional_id', legenda: 'Profissional responsável', opcoes: Object.fromEntries(profs.map(p => [p.id, p.nome])), valor: d.profissional_id, colunas: 3 }) : avisoHTML('Cadastre uma profissional em Configurações da agenda.', 'erro')}
      ${campoTexto({ id: 'data', rotulo: 'Data', valor: d.data || (cfg.ok ? cfg.hoje : ''), tipo: 'date' })}
      <fieldset class="campo" aria-describedby="servico_id-erro"><legend>Serviço <span class="opcional" id="escolhido" aria-live="polite">${d.servico_nome ? '— escolhido: ' + esc(d.servico_nome) : ''}</span></legend>
        <ul class="lista lista-compacta" id="lista" role="radiogroup" aria-label="Serviços"></ul><span class="erro" id="servico_id-erro"></span></fieldset>${navPaginas('nav')}
      <p class="ajuda documentos">Documentos da cliente (consulta, sem copiar): <a href="/brow-studio/anamnese/?cliente=${encodeURIComponent(d.cliente_id)}">fichas de anamnese</a> · <a href="/brow-studio/termos/?cliente=${encodeURIComponent(d.cliente_id)}">termos</a></p><div id="aviso"></div>`,
    acoes: rodape(R + 'atendimento/' + qs())
  });
  const lerForm = () => { const p = form.querySelector('[name=profissional_id]:checked'); return { profissional_id: p ? p.value : ler().profissional_id, profissional_nome: p ? profs.find(x => x.id === p.value).nome : ler().profissional_nome, data: form.data.value }; };
  form.addEventListener('change', (ev) => { if (ev.target.name !== 'servico_id') guardar(lerForm()); });
  let pg = 1;
  async function listar() {
    const r = await api('servicos_listar', { query: { pagina: pg, limite: cabem($('#lista'), 56, 52 + 70 + 70, 1), ativos: '1' } });
    if (!r.ok) return;
    const atual = ler().servico_id;
    $('#lista').innerHTML = r.itens.map(s => `<li><label class="opcao opcao-linha"><input type="radio" name="servico_id" value="${esc(s.id)}" ${s.id === atual ? 'checked' : ''}><span><strong>${esc(s.nome)}</strong><small>${esc(s.categoria_nome)}</small></span></label></li>`).join('') || '<li class="vazio vazio-compacto"><p>Nenhum serviço ativo.</p></li>';
    $('#lista').querySelectorAll('input').forEach(i => i.onchange = () => { const s = r.itens.find(x => x.id === i.value); guardar({ servico_id: s.id, servico_nome: s.nome }); $('#escolhido').textContent = '— escolhido: ' + s.nome; });
    ligarNav($('#nav'), { ...r, rotulo: 'serviços' }, (n) => { pg = n; listar(); });
  }
  listar(); ligarRascunho('procedimento', () => guardar(lerForm()));
  form.onsubmit = (ev) => {
    ev.preventDefault(); guardar(lerForm()); const x = ler(); const er = {};
    if (!x.servico_id) er.servico_id = 'Escolha o serviço.';
    if (!x.data) er.data = 'Informe a data.';
    if (profs.length && !x.profissional_id) er.profissional_id = 'Escolha a profissional responsável.';
    if (!mostrarErros(form, er)) return;
    irProx(R + 'tecnica/' + qs());
  };
  focarTitulo();
}

// ═══════════════════════════ ETAPA 2 — TÉCNICA E PRODUTOS ══════════════════
function etapaTecnica() {
  const d = ler(); if (!d || !d.cliente_id) return ir(R + qs());
  const form = pagina({
    titulo: 'Técnica', etapa: 2, etapasTotal: 5, formulario: true, voltar: R + 'procedimento/' + qs(), voltarTexto: 'Voltar',
    corpo: `${etapaHTML(`Técnica e produtos · 1ª parte · ${esc(d.cliente_nome)}`)}
      <div class="campo"><label for="tecnica">Técnica utilizada <span class="opcional">(obrigatória para finalizar)</span></label>
        <textarea id="tecnica" name="tecnica" maxlength="600" rows="5" class="curta" aria-describedby="tecnica-erro">${esc(d.tecnica || '')}</textarea><span class="erro" id="tecnica-erro"></span></div>
      <p class="ajuda">Registre o que foi feito, com suas palavras. O app não sugere nem preenche informações técnicas.</p><div id="aviso"></div>`,
    acoes: rodape(R + 'procedimento/' + qs())
  });
  form.tecnica.addEventListener('input', () => guardar({ tecnica: form.tecnica.value }));
  ligarRascunho('tecnica');
  form.onsubmit = (ev) => { ev.preventDefault(); guardar({ tecnica: form.tecnica.value }); irProx(R + 'produtos/' + qs()); };
  focarTitulo();
}
function etapaProdutos() {
  const d = ler(); if (!d || !d.cliente_id) return ir(R + qs());
  const form = pagina({
    titulo: 'Produtos', etapa: 2, etapasTotal: 5, formulario: true, voltar: R + 'tecnica/' + qs(), voltarTexto: 'Voltar',
    extra: `<a class="btn btn-cheio btn-topo" href="${R}produto/${qs(true)}" id="add">+ Produto</a>`,
    corpo: `${etapaHTML(`Técnica e produtos · 2ª parte (opcional) · ${esc(d.cliente_nome)}`)}<ul class="lista" id="lista" aria-label="Produtos usados"></ul>${navPaginas('nav')}<div id="aviso"></div>`,
    acoes: rodape(R + 'tecnica/' + qs())
  });
  const comId = (i) => `${R}produto/${docId() ? `?id=${encodeURIComponent(docId())}&i=${i}` : `?i=${i}`}`;
  let pg = 1;
  const desenhar = () => {
    const itens = ler().produtos || [];
    const por = cabem($('#lista'), 78, 52 + 70 + 80);
    const paginas = Math.max(1, Math.ceil(itens.length / por)); pg = Math.min(pg, paginas);
    $('#lista').innerHTML = itens.length ? itens.slice((pg - 1) * por, pg * por).map((p, k) => {
      const i = (pg - 1) * por + k;
      return `<li class="item"><div class="item-info"><div class="item-nome">${esc(p.produto || p.marca || 'Produto')}</div>
        <div class="item-extra">${esc([p.marca, p.cor ? 'cor ' + p.cor : '', p.lote ? 'lote ' + p.lote : '', p.validade ? 'val. ' + dataCurta(p.validade) : ''].filter(Boolean).join(' · ') || 'sem detalhes')}</div></div>
        <a class="btn btn-linha" href="${comId(i)}" aria-label="Editar ${esc(p.produto || 'produto')}">Editar</a></li>`; }).join('')
      : '<li class="vazio vazio-compacto"><p>Nenhum produto registrado. Toque em “+ Produto” para adicionar (opcional).</p></li>';
    ligarNav($('#nav'), { pagina: pg, paginas, total: itens.length, rotulo: 'produtos' }, (n) => { pg = n; desenhar(); });
  };
  desenhar(); ligarRascunho('produtos');
  form.onsubmit = (ev) => { ev.preventDefault(); irProx(R + 'fotos/' + qs()); };
  focarTitulo();
}
// produto: página de produto/marca/cor e página própria para lote/validade
function etapaProduto(parte) {
  const d = ler(); if (!d || !d.cliente_id) return ir(R + qs());
  const i = params.get('i') != null ? parseInt(params.get('i'), 10) : -1;
  const lista = d.produtos || [];
  // item em edição fica num rascunho próprio até "Salvar produto"
  let item = lerRasc(chave() + ':item');
  if (!item || item.indice !== i) { item = { indice: i, ...(i >= 0 && lista[i] ? lista[i] : { id: uuid(), produto: '', marca: '', cor: '', lote: '', validade: '' }) }; gravarRasc(chave() + ':item', item); }
  const base = `${docId() ? `?id=${encodeURIComponent(docId())}&` : '?'}${i >= 0 ? `i=${i}` : ''}`;
  const voltarLista = R + 'produtos/' + qs(true);
  const gi = (m) => gravarRasc(chave() + ':item', { ...lerRasc(chave() + ':item'), ...m });
  if (parte === 1) {
    const form = pagina({
      titulo: i >= 0 ? 'Editar produto' : 'Adicionar produto', voltar: voltarLista, voltarTexto: 'Produtos', formulario: true,
      corpo: `${etapaHTML('Produto (1 de 2) · todos os campos são opcionais')}
        ${campoTexto({ id: 'produto', rotulo: 'Produto', valor: item.produto, opcional: true, attrs: 'maxlength="80" autocomplete="off"' })}
        ${campoTexto({ id: 'marca', rotulo: 'Marca', valor: item.marca, opcional: true, attrs: 'maxlength="60" autocomplete="off"' })}
        ${campoTexto({ id: 'cor', rotulo: 'Cor ou tonalidade', valor: item.cor, opcional: true, attrs: 'maxlength="60" autocomplete="off"' })}<div id="aviso"></div>`,
      acoes: `${i >= 0 ? '<button type="button" class="btn btn-perigo" id="remover">Remover</button>' : ''}<a class="btn btn-linha" href="${voltarLista}" id="cancelar">Cancelar</a><button type="submit" class="btn btn-cheio">Lote e validade <span aria-hidden="true">→</span></button>`
    });
    form.addEventListener('input', () => gi({ produto: form.produto.value, marca: form.marca.value, cor: form.cor.value }));
    $('#cancelar').onclick = () => apagarRasc(chave() + ':item');
    const rm = $('#remover');
    if (rm) rm.onclick = () => { const l = (ler().produtos || []).slice(); l.splice(i, 1); guardar({ produtos: l }); apagarRasc(chave() + ':item'); ir(voltarLista); };
    form.onsubmit = (ev) => { ev.preventDefault(); gi({ produto: form.produto.value, marca: form.marca.value, cor: form.cor.value }); ir(`${R}produto/lote/${base}`); };
  } else {
    const form = pagina({
      titulo: 'Lote e validade', voltar: `${R}produto/${base}`, voltarTexto: 'Voltar', formulario: true,
      corpo: `${etapaHTML(`Produto (2 de 2) · ${esc(item.produto || item.marca || 'sem nome')}`)}
        ${campoTexto({ id: 'lote', rotulo: 'Lote', valor: item.lote, opcional: true, attrs: 'maxlength="40" autocomplete="off"' })}
        ${campoTexto({ id: 'validade', rotulo: 'Validade', valor: item.validade, tipo: 'date', opcional: true })}<div id="aviso"></div>`,
      acoes: `<a class="btn btn-linha" href="${R}produto/${base}">${SETA} Voltar</a><button type="submit" class="btn btn-cheio">Salvar produto</button>`
    });
    form.addEventListener('input', () => gi({ lote: form.lote.value, validade: form.validade.value }));
    form.onsubmit = (ev) => {
      ev.preventDefault();
      const it = { ...lerRasc(chave() + ':item'), lote: form.lote.value, validade: form.validade.value };
      if (!(it.produto || it.marca || it.cor || it.lote)) { $('#aviso').innerHTML = avisoHTML('Preencha ao menos um campo do produto (ou cancele).', 'erro'); return; }
      const l = (ler().produtos || []).slice(); const { indice, ...limpo } = it;
      if (indice >= 0) l[indice] = limpo; else l.push(limpo);
      if (l.length > 20) { $('#aviso').innerHTML = avisoHTML('Limite de 20 produtos por registro.', 'erro'); return; }
      guardar({ produtos: l }); apagarRasc(chave() + ':item'); ir(voltarLista);
    };
  }
  focarTitulo();
}

// ═══════════════════════════ ETAPA 3 — FOTOS ═══════════════════════════════
const LADO = 1600;
function carregarImagem(src) { return new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('ler')); i.src = src; }); }
// Reduz SEM cortar e SEM filtros: só redimensiona mantendo a proporção.
function otimizar(fonte, larg, alt) {
  const k = Math.min(1, LADO / Math.max(larg, alt));
  const c = document.createElement('canvas'); c.width = Math.round(larg * k); c.height = Math.round(alt * k);
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(fonte, 0, 0, c.width, c.height);
  let q = 0.88, url = c.toDataURL('image/jpeg', q);
  while (url.length > 1.9e6 && q > 0.6) { q -= 0.08; url = c.toDataURL('image/jpeg', q); }   // mantém dentro do limite do servidor
  return { dataUrl: url, w: c.width, h: c.height };
}
async function arquivoParaFoto(arq) {
  if (!arq) throw new Error('nada');
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(arq.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(arq.name || '')) throw new Error('tipo');
  if (arq.size > 25 * 1024 * 1024) throw new Error('grande');
  const url = URL.createObjectURL(arq);
  try { const img = await carregarImagem(url); return otimizar(img, img.naturalWidth, img.naturalHeight); }
  catch (e) { throw new Error('ler'); }
  finally { URL.revokeObjectURL(url); }
}
const MSG_ARQ = { tipo: 'Formato incompatível. Escolha uma foto JPG, PNG ou WEBP.', grande: 'A imagem tem mais de 25 MB. Escolha outra.', ler: 'Não foi possível abrir essa imagem (arquivo corrompido ou formato que este navegador não lê, como HEIC). Tente outra foto.' };
async function etapaFotos() {
  const d = ler(); if (!d || !d.cliente_id) return ir(R + qs());
  const aviso = await avisoDivulgacao(d.cliente_id);
  const cartao = (tipo) => {
    const f = d.fotos[tipo]; const tem = f && f.estado !== 'removida';
    return `<div class="foto-cartao"><h2>${TIPOS[tipo]}</h2>
      <div class="foto-quadro">${tem ? `<img src="${esc(f.dataUrl)}" alt="Foto ${TIPOS[tipo]}">` : '<span>Sem foto</span>'}</div>
      ${tem && f.estado === 'nova' ? '<small class="ajuda">Ainda não enviada</small>' : ''}
      <a class="btn btn-suave" href="${R}foto/?tipo=${tipo}${docId() ? '&id=' + encodeURIComponent(docId()) : ''}">${tem ? 'Trocar ou remover' : 'Adicionar foto'}</a></div>`;
  };
  const form = pagina({
    titulo: 'Fotos', etapa: 3, etapasTotal: 5, formulario: true, voltar: R + 'produtos/' + qs(), voltarTexto: 'Voltar',
    corpo: `${etapaHTML(`Antes e depois (opcionais) · ${esc(d.cliente_nome)}`)}${aviso}
      <div class="fotos-par">${cartao('antes')}${cartao('depois')}</div><div id="aviso"></div>`,
    acoes: rodape(R + 'produtos/' + qs())
  });
  ligarRascunho('fotos');
  form.onsubmit = (ev) => { ev.preventDefault(); irProx(R + 'observacoes/' + qs()); };
  focarTitulo();
}
async function etapaFoto() {
  const tipo = params.get('tipo') === 'depois' ? 'depois' : 'antes';
  const d = ler(); if (!d || !d.cliente_id) return ir(R + qs());
  const volta = R + 'fotos/' + qs(true);
  const pend = d.foto_pendente && d.foto_pendente.tipo === tipo ? d.foto_pendente : null;
  const atual = d.fotos[tipo] && d.fotos[tipo].estado !== 'removida' ? d.fotos[tipo] : null;
  const mostrar = pend ? (pend.remover ? null : pend) : atual;
  const aviso = await avisoDivulgacao(d.cliente_id);
  pagina({
    titulo: `Foto ${TIPOS[tipo]}`, voltar: volta, voltarTexto: 'Fotos',
    corpo: `${aviso}<div class="foto-area">
        <div class="foto-quadro foto-grande" id="previa">${mostrar ? `<img src="${esc(mostrar.dataUrl)}" alt="Prévia da foto ${TIPOS[tipo]}">` : '<span>Nenhuma foto</span>'}</div>
        <div id="aviso" style="width:100%"></div>
        <div class="foto-botoes duas">
          <label class="btn btn-suave" for="galeria" style="cursor:pointer">Escolher da galeria</label><input id="galeria" type="file" accept="image/*" class="sr-only">
          <a class="btn btn-suave" href="${R}foto/camera/?tipo=${tipo}${docId() ? '&id=' + encodeURIComponent(docId()) : ''}">Tirar foto com a câmera</a>
          ${mostrar ? '<button type="button" class="btn btn-perigo" id="remover">Remover foto</button>' : ''}
        </div></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}" id="cancelar">Cancelar</a><button type="button" class="btn btn-cheio" id="usar" ${pend ? '' : 'disabled'}>${pend && pend.remover ? 'Confirmar remoção' : 'Usar esta foto'}</button>`
  });
  const guardarPend = (p) => guardar({ foto_pendente: p });
  $('#galeria').onchange = async (e) => {
    const arq = e.target.files && e.target.files[0]; e.target.value = ''; if (!arq) return;
    $('#aviso').innerHTML = avisoHTML('Preparando a foto…');
    try { const f = await arquivoParaFoto(arq); if (guardarPend({ tipo, ...f })) location.replace(location.href); }
    catch (err) { $('#aviso').innerHTML = avisoHTML(MSG_ARQ[err.message] || MSG_ARQ.ler, 'erro'); }
  };
  const rm = $('#remover'); if (rm) rm.onclick = () => { if (guardarPend({ tipo, remover: true })) location.replace(location.href); };
  $('#cancelar').onclick = () => guardar({ foto_pendente: null });
  $('#usar').onclick = () => {
    const x = ler(); const p = x.foto_pendente; if (!p) return;
    const fotos = { ...x.fotos };
    if (p.remover) fotos[tipo] = fotos[tipo] && fotos[tipo].estado === 'servidor' ? { estado: 'removida' } : null;
    else fotos[tipo] = { estado: 'nova', dataUrl: p.dataUrl, w: p.w, h: p.h };
    if (guardar({ fotos, foto_pendente: null })) ir(volta);
  };
  focarTitulo();
}
async function etapaCamera() {
  const tipo = params.get('tipo') === 'depois' ? 'depois' : 'antes';
  const urlFoto = `${R}foto/?tipo=${tipo}${docId() ? '&id=' + encodeURIComponent(docId()) : ''}`;
  if (!ler()) return ir(R);
  pagina({
    titulo: `Câmera · ${TIPOS[tipo]}`, voltar: urlFoto, voltarTexto: 'Voltar',
    corpo: `<div id="aviso"></div><video class="camera-video" id="video" playsinline muted autoplay aria-label="Imagem da câmera"></video>
      <label class="btn btn-suave" for="nativa" id="alternativa" hidden style="cursor:pointer">Abrir a câmera do aparelho</label><input id="nativa" type="file" accept="image/*" capture="environment" class="sr-only">`,
    acoes: `<button type="button" class="btn btn-linha" id="trocar" hidden>Trocar câmera</button><button type="button" class="btn btn-cheio" id="clicar" disabled>Fotografar</button>`
  });
  const video = $('#video'), aviso = $('#aviso'); let stream = null, frente = false;
  const parar = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
  window.addEventListener('pagehide', parar);
  const usar = (f) => { parar(); if (guardar({ foto_pendente: { tipo, ...f } })) location.replace(urlFoto); };
  const alternativa = (msg) => { aviso.innerHTML = avisoHTML(msg, 'erro'); video.hidden = true; $('#clicar').hidden = true; $('#trocar').hidden = true; $('#alternativa').hidden = false; };
  $('#nativa').onchange = async (e) => { const arq = e.target.files && e.target.files[0]; e.target.value = ''; if (!arq) return; try { usar(await arquivoParaFoto(arq)); } catch (err) { aviso.innerHTML = avisoHTML(MSG_ARQ[err.message] || MSG_ARQ.ler, 'erro'); } };
  async function ligar() {
    parar(); $('#clicar').disabled = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: frente ? 'user' : 'environment', width: { ideal: 1920 }, height: { ideal: 1920 } }, audio: false });
      video.srcObject = stream; video.classList.toggle('espelho', frente); await video.play().catch(() => {});
      $('#clicar').disabled = false;
      const cams = (await navigator.mediaDevices.enumerateDevices()).filter(x => x.kind === 'videoinput'); $('#trocar').hidden = cams.length < 2; aviso.innerHTML = '';
    } catch (err) {
      const n = err && err.name;
      if (n === 'NotAllowedError' || n === 'SecurityError') alternativa('A permissão da câmera foi negada. Libere a câmera no cadeado ao lado do endereço do site ou use a opção abaixo.');
      else if (n === 'NotFoundError' || n === 'OverconstrainedError') alternativa('Nenhuma câmera foi encontrada neste aparelho. Escolha uma foto da galeria.');
      else if (n === 'NotReadableError') alternativa('A câmera está em uso por outro aplicativo. Feche-o ou use a opção abaixo.');
      else if (n === 'NotSupportedError') alternativa('Este navegador não permite usar a câmera aqui. Use a opção abaixo ou a galeria.');
      else alternativa('Não foi possível abrir a câmera. Use a opção abaixo ou a galeria.');
    }
  }
  if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) alternativa('A câmera não está disponível neste navegador. Use a câmera do aparelho pela opção abaixo ou a galeria.');
  else ligar();
  $('#trocar').onclick = () => { frente = !frente; ligar(); };
  $('#clicar').onclick = () => {
    if (!video.videoWidth) return;
    const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
    const g = c.getContext('2d'); g.drawImage(video, 0, 0);   // sem espelhar a foto salva: o resultado real
    usar(otimizar(c, c.width, c.height));
  };
  focarTitulo();
}

// ═══════════════════════════ ETAPA 4 — OBSERVAÇÕES ═════════════════════════
function etapaObservacoes() {
  const d = ler(); if (!d || !d.cliente_id) return ir(R + qs());
  const form = pagina({
    titulo: 'Observações', etapa: 4, etapasTotal: 5, formulario: true, voltar: R + 'fotos/' + qs(), voltarTexto: 'Voltar',
    corpo: `${etapaHTML(esc(d.cliente_nome))}<div class="campo"><label for="observacoes">Detalhes do atendimento, intercorrências relatadas e observações <span class="opcional">(opcional)</span></label>
      <textarea id="observacoes" name="observacoes" maxlength="2000" rows="7">${esc(d.observacoes || '')}</textarea></div>
      <p class="ajuda">Registro livre da profissional. O app não interpreta, não diagnostica nem prescreve.</p><div id="aviso"></div>`,
    acoes: rodape(R + 'fotos/' + qs(), 'Conferência <span aria-hidden="true">→</span>')
  });
  form.observacoes.addEventListener('input', () => guardar({ observacoes: form.observacoes.value }));
  ligarRascunho('observacoes');
  form.onsubmit = (ev) => { ev.preventDefault(); ir(R + 'conferencia/' + qs(true)); };
  focarTitulo();
}

// ═══════════════════════════ ETAPA 5 — CONFERÊNCIA ═════════════════════════
const SECOES = [['procedimento', 'Cliente e atendimento'], ['tecnica', 'Técnica e produtos'], ['fotos', 'Fotos'], ['observacoes', 'Observações']];
function resumoSecao(s, d) {
  if (s === 'procedimento') return `${d.servico_nome || 'sem serviço'} · ${d.data ? dataCurta(d.data) : 'sem data'}`;
  if (s === 'tecnica') return `${d.tecnica ? 'técnica preenchida' : 'sem técnica'} · ${(d.produtos || []).length} produto(s)`;
  if (s === 'fotos') { const n = ['antes', 'depois'].filter(t => d.fotos[t] && d.fotos[t].estado !== 'removida').length; return n ? `${n} foto(s)` : 'sem fotos'; }
  return d.observacoes ? 'preenchidas' : 'em branco';
}
function etapaConferencia() {
  const d = ler(); if (!d || !d.cliente_id) return ir(R + qs());
  const falta = [!d.servico_id && 'serviço', !d.data && 'data', !d.profissional_id && 'profissional', !(d.tecnica || '').trim() && 'técnica'].filter(Boolean);
  pagina({
    titulo: 'Conferência', etapa: 5, etapasTotal: 5, voltar: R + 'observacoes/' + qs(true), voltarTexto: 'Voltar',
    corpo: `${etapaHTML(`${esc(d.cliente_nome)} · revise cada parte`)}
      <nav class="menu-botoes" aria-label="Partes do registro">${SECOES.map(([s, t]) => `<a class="btn btn-suave" href="${R}revisar/${qs(true) ? qs(true) + '&' : '?'}s=${s}">${t} <small class="sub-btn sub-sempre">${esc(resumoSecao(s, d))}</small></a>`).join('')}</nav>
      ${falta.length ? avisoHTML(`Para finalizar, falta: <strong>${falta.join(', ')}</strong>. Você pode salvar como rascunho.`, 'erro') : avisoHTML('Finalizar não lança pagamento nem conclui o atendimento na agenda.')}
      <div id="aviso"></div>`,
    acoes: `${botaoRascunho.replace('btn-rascunho', 'btn-rascunho par')}<button type="button" class="btn btn-cheio" id="finalizar" ${falta.length ? 'disabled' : ''}>Finalizar registro</button>`
  });
  ligarRascunho('conferencia');
  let env = false;
  $('#finalizar').onclick = async () => {
    if (env) return; env = true;
    const b = $('#finalizar'); b.disabled = true; b.textContent = 'Finalizando…';
    const s = await sincronizar('conferencia', true);
    env = false; b.disabled = false; b.textContent = 'Tentar novamente';
    if (!s.ok) { $('#aviso').innerHTML = avisoHTML(esc(s.r.msg || 'Não foi possível finalizar.') + (s.r.erro === 'duplicado' && s.r.id ? ` <a href="${BASE}ver/?id=${encodeURIComponent(s.r.id)}">Abrir o registro existente</a>.` : '') + '<br><small>Os dados continuam aqui.</small>', 'erro'); return; }
    if (s.falhas.length) { $('#aviso').innerHTML = avisoHTML(`O texto foi salvo como rascunho, mas a foto <strong>${s.falhas.map(f => TIPOS[f.tipo]).join(' e ')}</strong> não foi enviada (${esc(s.falhas[0].msg)}). Nada foi perdido: tente de novo para finalizar.`, 'erro'); return; }
    apagarRasc(chave()); apagarRasc('rg:' + s.id); recado.pôr('Registro finalizado.'); location.replace(`${BASE}ver/?id=${encodeURIComponent(s.id)}`);
  };
  focarTitulo();
}
function telaRevisar() {
  const d = ler(); if (!d || !d.cliente_id) return ir(R + qs());
  const s = SECOES.some(([k]) => k === params.get('s')) ? params.get('s') : 'procedimento';
  const t = SECOES.find(([k]) => k === s)[1];
  const conf = R + 'conferencia/' + qs(true);
  const corr = R + PAG_ETAPA[s] + (docId() ? `?id=${encodeURIComponent(docId())}&conf=1` : '?conf=1');
  let corpo = '';
  if (s === 'procedimento') corpo = blocoResumo(t, [['Cliente', d.cliente_nome], ['Atendimento da agenda', d.agendamento_id ? (d.agendamento_rotulo || 'vinculado') : 'sem agendamento'], ['Serviço', d.servico_nome], ['Profissional', d.profissional_nome], ['Data', d.data ? dataCurta(d.data) : '']], corr);
  if (s === 'tecnica') corpo = blocoResumo(t, [['Técnica', d.tecnica], ['Produtos', (d.produtos || []).map(p => [p.produto, p.marca, p.cor].filter(Boolean).join(' / ')).join('; ')]], corr);
  if (s === 'fotos') corpo = `<section class="bloco"><div class="bloco-topo"><h2>Fotos</h2><a class="corrigir" href="${corr}">Corrigir</a></div><div class="fotos-par">${['antes', 'depois'].map(x => { const f = d.fotos[x]; const tem = f && f.estado !== 'removida'; return `<div class="foto-cartao"><h2>${TIPOS[x]}</h2><div class="foto-quadro">${tem ? `<img src="${esc(f.dataUrl)}" alt="Foto ${TIPOS[x]}">` : '<span>Sem foto</span>'}</div></div>`; }).join('')}</div></section>`;
  if (s === 'observacoes') corpo = blocoResumo(t, [['Observações', d.observacoes]], corr);
  pagina({ titulo: t, voltar: conf, voltarTexto: 'Conferência', corpo: `<div class="resumo">${corpo}</div>`,
    acoes: `<a class="btn btn-linha" href="${conf}">${SETA} Voltar à conferência</a><a class="btn btn-cheio" href="${corr}">Corrigir</a>` });
  focarTitulo();
}

// ═══════════════════════════ CONSULTA ══════════════════════════════════════
async function telaVer() {
  carregando('Registro de atendimento');
  const r = await api('rg_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Registro', r.msg || 'Não foi possível abrir.');
  const g = r.registro; const q = encodeURIComponent(g.id); const fin = g.situacao === 'finalizado';
  const msg = recado.tirar();
  const prods = g.produtos || [];
  const secoes = ['ident', 'tecnica', ...(prods.length > 2 ? Array.from({ length: Math.ceil(prods.length / 3) }, (_, k) => 'produtos' + k) : []), 'fotos', 'obs', 'retif'];
  let p = Math.min(Math.max(parseInt(params.get('p'), 10) || 1, 1), secoes.length);
  const temFoto = (t) => r.fotos.some(f => f.tipo === t);
  const conteudo = async (s) => {
    if (s === 'ident') return blocoResumo('Identificação', [['Cliente', g.cliente_nome], ['Serviço', g.servico_nome], ['Responsável', g.profissional_nome], ['Data', g.data ? dataCurta(g.data) : ''],
      ['Agenda', g.agendamento_id ? 'vinculado' : 'sem agendamento'], ['Situação', fin ? `Finalizado ${dataHora(g.finalizado_em)}` : 'Rascunho'], ['Autoria', g.finalizado_por || g.criado_por || 'login pendente']]) +
      `<p class="ajuda documentos">Documentos: <a href="/brow-studio/anamnese/?cliente=${encodeURIComponent(g.cliente_id)}">fichas de anamnese</a> · <a href="/brow-studio/termos/?cliente=${encodeURIComponent(g.cliente_id)}">termos</a>${g.agendamento_id ? ` · <a href="/brow-studio/agenda/atendimento/?id=${encodeURIComponent(g.agendamento_id)}">atendimento na agenda</a>` : ''} · <a href="/brow-studio/estoque/atendimento/?rg=${q}">materiais do estoque</a></p>`;
    if (s === 'tecnica') return blocoResumo('Técnica e produtos', [['Técnica', g.tecnica], ...(prods.length <= 2 ? prods.map((x, i) => [`Produto ${i + 1}`, [x.produto, x.marca, x.cor && 'cor ' + x.cor, x.lote && 'lote ' + x.lote, x.validade && 'val. ' + dataCurta(x.validade)].filter(Boolean).join(' · ')]) : [['Produtos', `${prods.length} (nas próximas seções)`]])]);
    if (s.startsWith('produtos')) { const k = +s.slice(8); return blocoResumo(`Produtos (${k * 3 + 1}–${Math.min(prods.length, k * 3 + 3)} de ${prods.length})`, prods.slice(k * 3, k * 3 + 3).flatMap((x, i) => [[`Produto ${k * 3 + i + 1}`, [x.produto, x.marca].filter(Boolean).join(' · ')], ['Cor · lote · validade', [x.cor, x.lote, x.validade && dataCurta(x.validade)].filter(Boolean).join(' · ')]])); }
    if (s === 'fotos') return `${await avisoDivulgacao(g.cliente_id)}<nav class="menu-botoes" aria-label="Fotos">
      ${temFoto('antes') ? `<a class="btn btn-suave" href="${BASE}ver/foto/?id=${q}&tipo=antes">Ver foto Antes</a>` : '<span class="btn btn-suave" aria-disabled="true">Sem foto Antes</span>'}
      ${temFoto('depois') ? `<a class="btn btn-suave" href="${BASE}ver/foto/?id=${q}&tipo=depois">Ver foto Depois</a>` : '<span class="btn btn-suave" aria-disabled="true">Sem foto Depois</span>'}
      ${temFoto('antes') && temFoto('depois') ? `<a class="btn btn-suave" href="${BASE}ver/foto/?id=${q}&tipo=comparar">Comparar Antes e Depois</a>` : ''}</nav>`;
    if (s === 'obs') return blocoResumo('Observações', [['Observações', g.observacoes]]);
    return `<section class="bloco"><div class="bloco-topo"><h2>Retificações e complementos</h2></div>${r.retificacoes.length ? `<ul class="lista linha-tempo">${r.retificacoes.slice(-3).reverse().map(x => `<li class="evento"><strong>${x.tipo === 'retificacao' ? 'Retificação' : 'Complemento'} · ${esc(dataHora(x.criado_em))}</strong><small>Motivo: ${esc(x.motivo)} · ${esc(x.autor || 'autoria: login pendente')}</small><span>${esc(x.texto)}</span></li>`).join('')}</ul>${r.retificacoes.length > 3 ? `<p class="ajuda">${r.retificacoes.length} no total (as 3 mais recentes acima).</p>` : ''}` : '<p class="ajuda">Nenhuma. O registro original é mantido como foi finalizado.</p>'}</section>`;
  };
  const acoes = fin ? `<a class="btn btn-cheio" href="${BASE}retificar/?id=${q}">Retificar ou complementar</a>` : `<button type="button" class="btn btn-cheio" id="continuar">Continuar preenchimento</button>`;
  const desenhar = async () => {
    pagina({
      titulo: 'Registro de atendimento', voltar: BASE, voltarTexto: 'Atendimentos',
      corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<div class="servico-cabeca"><h2>${esc(g.cliente_nome)}</h2>${seloSit(g.situacao)}</div>
        <p class="etapa">${esc(g.servico_nome || '')} · ${esc(g.profissional_nome || '')} · ${dataCurta(g.data)} · seção ${p} de ${secoes.length}</p>
        <div class="resumo" id="sec">${await conteudo(secoes[p - 1])}</div>${navPaginas('nav')}`,
      acoes: `<a class="btn btn-linha" href="${BASE}">${SETA} Atendimentos</a>${acoes}`
    });
    ligarNav($('#nav'), { pagina: p, paginas: secoes.length }, (n) => { p = n; const u = new URL(location.href); u.searchParams.set('p', p); history.replaceState(null, '', u); desenhar(); });
    const c = $('#continuar');
    if (c) c.onclick = async () => { c.disabled = true; c.textContent = 'Abrindo…'; const fotos = await carregarFotosServidor(g.id, r.fotos); if (!gravarRasc('rg:' + g.id, deRegistro(g, fotos))) { c.disabled = false; return; } location.href = `${R}${PAG_ETAPA[g.etapa_atual] || ''}?id=${q}`; };
    focarTitulo();
  };
  desenhar();
}
async function telaVerFoto() {
  const id = params.get('id'); const modo = ['antes', 'depois', 'comparar'].includes(params.get('tipo')) ? params.get('tipo') : 'antes';
  const volta = `${BASE}ver/?id=${encodeURIComponent(id)}&p=`;
  carregando('Fotos');
  const r = await api('rg_ver', { id });
  if (!r.ok) return telaErro('Fotos', r.msg);
  const g = r.registro;
  const secFotos = 2 + ((g.produtos || []).length > 2 ? Math.ceil(g.produtos.length / 3) : 0) + 1;
  const fotos = {};
  for (const t of ['antes', 'depois']) { if (r.fotos.some(f => f.tipo === t)) { const f = await api('rg_foto', { query: { id, tipo: t } }); if (f.ok) fotos[t] = f; } }
  const aviso = await avisoDivulgacao(g.cliente_id);
  const fig = (t) => fotos[t] ? `<figure class="foto-comparar"><img src="${fotos[t].foto}" alt="Foto ${TIPOS[t]} — ${esc(g.cliente_nome)}, ${dataCurta(g.data)}" style="aspect-ratio:${fotos[t].largura}/${fotos[t].altura}"><figcaption><strong>${TIPOS[t]}</strong> · ${dataCurta(g.data)}</figcaption></figure>` : `<figure class="foto-comparar vazia"><span>Sem foto ${TIPOS[t]}</span></figure>`;
  let mostrando = modo === 'depois' ? 'depois' : 'antes';
  const lado = () => window.matchMedia('(orientation: landscape) and (min-width: 900px)').matches;
  const desenhar = () => {
    const comparar = modo === 'comparar';
    pagina({
      titulo: comparar ? 'Comparar Antes e Depois' : `Foto ${TIPOS[modo]}`, voltar: volta + secFotos, voltarTexto: 'Registro',
      corpo: `<p class="etapa">${esc(g.cliente_nome)} · ${esc(g.servico_nome || '')} · ${esc(g.profissional_nome || '')}</p>${aviso}
        ${comparar ? (lado() ? `<div class="comparar-lado">${fig('antes')}${fig('depois')}</div>`
          : `<div class="alternar" role="group" aria-label="Escolher foto"><button type="button" class="btn ${mostrando === 'antes' ? 'btn-cheio' : 'btn-linha'}" data-v="antes" aria-pressed="${mostrando === 'antes'}">Antes</button><button type="button" class="btn ${mostrando === 'depois' ? 'btn-cheio' : 'btn-linha'}" data-v="depois" aria-pressed="${mostrando === 'depois'}">Depois</button></div>${fig(mostrando)}`) : fig(modo)}`,
      acoes: `<a class="btn btn-linha" href="${volta + secFotos}">${SETA} Voltar ao registro</a>`
    });
    app.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { mostrando = b.dataset.v; desenhar(); const x = app.querySelector(`[data-v="${mostrando}"]`); if (x) x.focus(); });
    focarTitulo();
  };
  desenhar();
  let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(desenhar, 200); });
}
const app = document.getElementById('app');
async function telaRetificar() {
  carregando('Retificar ou complementar');
  const r = await api('rg_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Retificar', r.msg);
  const g = r.registro; const volta = `${BASE}ver/?id=${encodeURIComponent(g.id)}`;
  const chaveEnvio = uuid();
  const form = pagina({
    titulo: 'Retificar ou complementar', voltar: volta, voltarTexto: 'Registro', formulario: true,
    corpo: `${etapaHTML(`${esc(g.cliente_nome)} · finalizado em ${dataHora(g.finalizado_em)}`)}
      ${grupoOpcoes({ nome: 'tipo', legenda: 'Tipo', opcoes: { retificacao: 'Retificação (corrige)', complemento: 'Complemento (acrescenta)' }, valor: '' })}
      ${campoTexto({ id: 'motivo', rotulo: 'Motivo', attrs: 'maxlength="300" autocomplete="off"' })}
      <div class="campo"><label for="texto">Texto da retificação ou complemento</label><textarea id="texto" name="texto" maxlength="2000" rows="4" class="curta" aria-describedby="texto-erro"></textarea><span class="erro" id="texto-erro"></span></div>
      <p class="ajuda">O registro original não é alterado: isto fica anexado, com data e autoria.</p><div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Cancelar</a><button type="submit" class="btn btn-cheio" id="salvar">Registrar</button>`
  });
  let env = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); if (env) return;
    const v = { tipo: (form.querySelector('[name=tipo]:checked') || {}).value, motivo: form.motivo.value.trim(), texto: form.texto.value.trim() };
    const er = {}; if (!v.tipo) er.tipo = 'Escolha o tipo.'; if (!v.motivo) er.motivo = 'Informe o motivo.'; if (!v.texto) er.texto = 'Escreva o texto.';
    if (!mostrarErros(form, er)) return;
    env = true; const rr = await api('rg_retificar', { corpo: { id: g.id, chave_envio: chaveEnvio, ...v } });
    if (rr.ok) { recado.pôr(v.tipo === 'retificacao' ? 'Retificação registrada.' : 'Complemento registrado.'); location.replace(volta + '&p=99'); return; }
    env = false; if (rr.erros) mostrarErros(form, rr.erros); $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível registrar.'), 'erro');
  };
  focarTitulo();
}

// ─── roteamento ─────────────────────────────────────────────────────────────
const TELAS = {
  lista: telaLista, cliente: etapaCliente, atendimento: etapaAtendimento, procedimento: etapaProcedimento, tecnica: etapaTecnica, produtos: etapaProdutos,
  produto: () => etapaProduto(1), 'produto-lote': () => etapaProduto(2), fotos: etapaFotos, foto: etapaFoto, camera: etapaCamera,
  observacoes: etapaObservacoes, conferencia: etapaConferencia, revisar: telaRevisar, ver: telaVer, 'ver-foto': telaVerFoto, retificar: telaRetificar
};
(async () => {
  const pg = document.body.dataset.pagina;
  const etapas = ['cliente', 'atendimento', 'procedimento', 'tecnica', 'produtos', 'produto', 'produto-lote', 'fotos', 'foto', 'camera', 'observacoes', 'conferencia', 'revisar'];
  if (docId() && etapas.includes(pg) && !ler()) {
    carregando('Registro');
    const r = await api('rg_ver', { id: docId() });
    if (!r.ok) return telaErro('Registro', r.msg);
    if (r.registro.situacao === 'finalizado') return location.replace(`${BASE}ver/?id=${encodeURIComponent(docId())}`);
    gravarRasc(chave(), deRegistro(r.registro, await carregarFotosServidor(docId(), r.fotos)));
  }
  (TELAS[pg] || telaLista)();
})();
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
