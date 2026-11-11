// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — ORÇAMENTOS, PROPOSTAS, COMBOS E CONTROLE DE SESSÕES (10/11/2026)
// Cada página tem rota própria. O editor (etapas) serve à PROPOSTA ("or:p:*")
// e ao MODELO de combo ("or:m:*"). Valores em centavos inteiros.
// Aprovar cria o pacote; sessões só são consumidas ao registrar atendimento
// realizado. Nada é pago, reservado ou enviado automaticamente.
// ═══════════════════════════════════════════════════════════════════════════
import { $, params, esc, uuid, lerRasc, gravarRasc, apagarRasc, api, SETA, pagina, campoTexto, grupoOpcoes,
  mostrarErros, avisoHTML, focarTitulo, ir, blocoResumo } from './comum.js?v=3';

const BASE = '/brow-studio/orcamentos/';
const AG = '/brow-studio/agenda/';
const SIT = { rascunho: 'Rascunho', emitida: 'Proposta emitida', aprovada: 'Aprovada', recusada: 'Recusada', cancelada: 'Cancelada' };
const FILTROS = { todas: 'Todas', rascunho: 'Rascunho', emitida: 'Emitida', aprovada: 'Aprovada', recusada: 'Recusada', cancelada: 'Cancelada', vencidas: 'Validade vencida' };
const RETOQUES = { incluidos: 'Retoques incluídos', nao_incluidos: 'Retoques não incluídos', nao_informado: 'Não informar' };
const app = document.getElementById('app');
const recado = { pôr(m) { try { sessionStorage.setItem('brow:recado', m); } catch (e) {} }, tirar() { try { const m = sessionStorage.getItem('brow:recado'); sessionStorage.removeItem('brow:recado'); return m; } catch (e) { return null; } } };
const carregando = (t) => pagina({ titulo: t, corpo: avisoHTML('Carregando…') });
function telaErro(titulo, msg, volta = BASE) { pagina({ titulo, voltar: volta, voltarTexto: 'Voltar', corpo: avisoHTML(esc(msg || 'Não foi possível carregar.'), 'erro'), acoes: `<a class="btn btn-cheio" href="${volta}">Voltar</a>` }); focarTitulo(); }
const passou = () => document.documentElement.scrollHeight > window.innerHeight + 1;
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
function listaPaginada({ el, nav, altura, abaixo, buscar, desenhar, rotulo }) {
  let pg = 1, ajuste = 0, vez = 0;
  async function carregar() {
    const minha = ++vez;
    const lim = ajuste || cabem(el, altura, abaixo);
    const r = await buscar(pg, lim);
    if (minha !== vez) return;
    if (!r.ok) { el.innerHTML = `<li>${avisoHTML(esc(r.msg), 'erro')}</li>`; return; }
    el.innerHTML = desenhar(r);
    ligarNav(nav, { ...r, rotulo }, (n) => { pg = n; carregar(); });
    if (passou() && lim > 2 && r.itens.length >= lim) { ajuste = lim - 1; carregar(); }
  }
  return { carregar, reiniciar() { pg = 1; ajuste = 0; carregar(); } };
}
// paginação local (itens da proposta/modelo)
function paginarLocal({ el, nav, itens, altura, abaixo, desenhar, rotulo }) {
  let pg = 1;
  const d = () => { const por = cabem(el, altura, abaixo, 2); const paginas = Math.max(1, Math.ceil(itens.length / por)); pg = Math.min(pg, paginas);
    el.innerHTML = itens.length ? itens.slice((pg - 1) * por, pg * por).map((x, k) => desenhar(x, (pg - 1) * por + k)).join('') : '<li class="vazio vazio-curto"><p>Nenhum serviço adicionado.</p></li>';
    ligarNav(nav, { pagina: pg, paginas, total: itens.length, rotulo }, (n) => { pg = n; d(); }); };
  d();
}

// ─── dinheiro e datas ───────────────────────────────────────────────────────
const RE_VALOR = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/;
function centavos(v) { let s = String(v == null ? '' : v).trim().replace(/^R\$\s*/i, '').replace(/\s/g, ''); if (!s || !RE_VALOR.test(s)) return null; const [i, d = ''] = s.replace(/\./g, '').split(','); const n = parseInt(i, 10) * 100 + parseInt((d + '00').slice(0, 2), 10); return Number.isSafeInteger(n) && n <= 100000000 ? n : null; }
function reais(c) { c = c | 0; const s = String(Math.abs(c)).padStart(3, '0'); return `${c < 0 ? '− ' : ''}R$ ${s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${s.slice(-2)}`; }
const valorTexto = (c) => reais(c).replace('R$ ', '');
const dataBR = (s) => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '';
const digitos = (v) => String(v || '').replace(/\D/g, '');
function fone(v) { const d = digitos(v); if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; return v || ''; }
const sessoes = (n) => `${n} ${n === 1 ? 'sessão' : 'sessões'}`;
const subtotal = (itens) => (itens || []).reduce((s, i) => s + i.quantidade * i.preco_centavos, 0);
const linhaItem = (i) => `${esc(i.servico_nome)} · ${sessoes(i.quantidade)} × ${reais(i.preco_centavos)} = <strong>${reais(i.quantidade * i.preco_centavos)}</strong>`;
const seloP = (p) => `<span class="selo selo-or-${p.situacao}">${SIT[p.situacao]}</span>${p.vencida ? ' <span class="selo selo-fin-vencido">Validade vencida</span>' : ''}`;
const curto = (t, n) => { n = n || (window.innerWidth < 600 ? 40 : 140); return t && t.length > n ? t.slice(0, n).trimEnd() + '…' : t; };

// ═══════════════════════════ INÍCIO: PROPOSTAS ═════════════════════════════
async function telaInicio() {
  const msg = recado.tirar(); const cliente = params.get('cliente') || '';
  let filtro = FILTROS[params.get('f')] ? params.get('f') : 'todas';
  pagina({
    titulo: 'Propostas e combos', voltar: cliente ? `/brow-studio/clientes/perfil/?id=${encodeURIComponent(cliente)}` : '/brow-studio/profissional.html', voltarTexto: cliente ? 'Cliente' : 'Voltar',
    extra: `<a class="btn btn-cheio btn-topo" href="${BASE}nova/?novo=1${cliente ? '&cliente=' + encodeURIComponent(cliente) : ''}" aria-label="Nova proposta">+ Nova<span class="so-largo">&nbsp;proposta</span></a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      <nav class="linha-acoes acessos-or" aria-label="Acessos"><a class="btn btn-suave" href="${BASE}modelos/">Modelos de combos</a><a class="btn btn-suave" href="${BASE}pacotes/${cliente ? '?cliente=' + encodeURIComponent(cliente) : ''}">Pacotes das clientes</a></nav>
      ${cliente ? `<p class="ajuda">Propostas desta cliente · <a href="${BASE}">ver todas</a></p>` : '<form class="busca" role="search" id="form-busca"><div class="campo"><label for="q">Buscar por cliente ou título</label><input id="q" type="search" autocomplete="off"></div></form>'}
      <div class="filtros-chips chips-4" role="radiogroup" aria-label="Situação">${Object.entries(FILTROS).map(([v, t]) => `<label class="opcao opcao-chip"><input type="radio" name="f" value="${v}" ${v === filtro ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
      <ul class="lista" id="lista" aria-label="Propostas"></ul>${navPaginas('nav')}`
  });
  const L = listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: window.innerHeight <= 760 ? 74 : 82, abaixo: 72, rotulo: 'propostas',
    buscar: (pg, lim) => api('or_listar', { query: { q: $('#q') ? $('#q').value.trim() : '', filtro, cliente, pagina: pg, limite: lim } }),
    desenhar: (r) => r.total ? r.itens.map(p => `<li class="item"><div class="item-info"><div class="item-nome">${esc(p.titulo)}${p.aditivo ? ' <small>· aditivo</small>' : ''}</div>
        <div class="item-extra item-extra-quebra">${esc(p.cliente_nome)} · <strong>${reais(p.total_centavos)}</strong> <span class="selos">${seloP(p)}</span></div></div>
        <a class="btn btn-linha" href="${BASE}proposta/?id=${encodeURIComponent(p.id)}" aria-label="Abrir ${esc(p.titulo)} de ${esc(p.cliente_nome)}">Abrir</a></li>`).join('')
      : `<li class="vazio"><span class="avatar grande" aria-hidden="true">✦</span><h2>${filtro !== 'todas' || ($('#q') && $('#q').value) ? 'Nenhuma proposta encontrada' : 'Nenhuma proposta ainda'}</h2><p>Toque em “Nova proposta” ou use um modelo de combo.</p></li>` });
  if ($('#q')) { let e; $('#q').addEventListener('input', () => { clearTimeout(e); e = setTimeout(L.reiniciar, 300); }); $('#form-busca').onsubmit = (ev) => { ev.preventDefault(); L.reiniciar(); }; }
  app.querySelectorAll('[name=f]').forEach(i => i.onchange = () => { filtro = i.value; L.reiniciar(); });
  L.carregar(); focarTitulo();
}

// ═══════════════════════════ EDITOR (proposta | modelo) ════════════════════
const MODO = document.body.dataset.pagina.startsWith('m-') ? 'm' : 'p';
const EP = MODO === 'm' ? BASE + 'modelo/novo/' : BASE + 'nova/';   // base das etapas
const eid = () => params.get('id') || '';
const chave = () => `or:${MODO}:${eid() || 'novo'}`;
const ler = () => lerRasc(chave());
const guardar = (m) => gravarRasc(chave(), { ...ler(), ...m });
const qs = (semConf, extra = {}) => { const u = new URLSearchParams(); if (eid()) u.set('id', eid()); if (!semConf && params.get('conf') === '1') u.set('conf', '1'); for (const [k, v] of Object.entries(extra)) u.set(k, v); const s = u.toString(); return s ? '?' + s : ''; };
const conf = () => params.get('conf') === '1';
const TOTAL = 4;
const tituloEd = () => MODO === 'm' ? (eid() ? 'Editar modelo' : 'Novo modelo de combo') : (eid() ? 'Revisar proposta' : (ler() && ler().pacote_alvo_id ? 'Aditivo do pacote' : 'Nova proposta'));
const sair = () => MODO === 'm' ? (eid() ? `${BASE}modelo/?id=${encodeURIComponent(eid())}` : BASE + 'modelos/') : (eid() ? `${BASE}proposta/?id=${encodeURIComponent(eid())}` : BASE);
function rodape(voltar, prox, cancelar) {
  return `${cancelar ? `<a class="btn btn-linha" href="${voltar}" id="cancelar">Cancelar</a>` : `<a class="btn btn-linha" href="${voltar}">${SETA} Voltar</a>`}<button type="submit" class="btn btn-cheio">${conf() ? 'Voltar à conferência' : (prox || 'Próximo <span aria-hidden="true">→</span>')}</button>`;
}
const irProx = (dest) => ir(conf() ? EP + 'conferencia/' + qs(true) : dest);
async function preparar() {
  if (params.get('novo') === '1' && !eid()) { apagarRasc(`or:${MODO}:novo`); const u = new URL(location.href); u.searchParams.delete('novo'); history.replaceState(null, '', u); }
  let d = ler(); if (d) return d;
  const cf = await api('ag_config_ver'); const hj = cf.ok ? cf.hoje : new Date().toISOString().slice(0, 10);
  const mais = (s, n) => { const x = new Date(s + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  if (MODO === 'm') {
    if (eid()) { const r = await api('or_modelo_ver', { id: eid() }); if (!r.ok) { telaErro(tituloEd(), r.msg); return null; } const m = r.modelo;
      d = { nome: m.nome, itens: m.itens, desconto: valorTexto(m.desconto_centavos), retoques: m.retoques || '', inclui: m.inclui || '', condicoes: m.condicoes || '' }; }
    else d = { chave_envio: uuid(), nome: '', itens: [], desconto: '0,00', retoques: '', inclui: '', condicoes: '' };
  } else if (eid()) {
    const r = await api('or_ver', { id: eid() }); if (!r.ok) { telaErro(tituloEd(), r.msg); return null; } const p = r.proposta;
    if (!['rascunho', 'emitida'].includes(p.situacao)) { telaErro(tituloEd(), p.situacao === 'aprovada' ? 'Proposta aprovada não é alterada: crie um aditivo no pacote.' : 'Proposta encerrada não pode ser alterada.', sair()); return null; }
    d = { titulo: p.titulo, cliente_id: p.cliente_id, cliente_nome: p.cliente_nome, whatsapp: fone(p.whatsapp || ''), telefone_cadastro: r.cliente.telefone || '', profissional_id: p.profissional_id || '', itens: p.itens,
      desconto: valorTexto(p.desconto_centavos), validade: p.validade < hj ? '' : p.validade, prazo_uso: p.prazo_uso || '', retoques: p.retoques, inclui: p.inclui || '', condicoes: p.condicoes || '', observacoes: p.observacoes || '', hoje: hj, situacao: p.situacao, versao: p.versao, pacote_alvo_id: p.pacote_alvo_id };
  } else {
    d = { chave_envio: uuid(), titulo: '', cliente_id: '', cliente_nome: '', whatsapp: '', telefone_cadastro: '', profissional_id: '', itens: [], desconto: '0,00', validade: mais(hj, 7), prazo_uso: '', retoques: '', inclui: '', condicoes: '', observacoes: '', hoje: hj, modelo_id: '', pacote_alvo_id: '' };
    if (params.get('modelo')) {
      const r = await api('or_modelo_ver', { id: params.get('modelo') });
      if (r.ok) { const m = r.modelo; Object.assign(d, { titulo: m.nome, itens: m.itens, desconto: valorTexto(m.desconto_centavos), retoques: m.retoques || '', inclui: m.inclui || '', condicoes: m.condicoes || '', modelo_id: m.id, modelo_nome: m.nome }); }
    }
    if (params.get('aditivo')) {
      const r = await api('or_pacote_ver', { id: params.get('aditivo') });
      if (!r.ok || r.pacote.situacao !== 'ativo') { telaErro('Aditivo', 'Pacote não encontrado ou encerrado.'); return null; }
      const cl = await api('ver', { id: r.pacote.cliente_id });
      Object.assign(d, { pacote_alvo_id: r.pacote.id, pacote_titulo: r.pacote.titulo, titulo: `Aditivo — ${r.pacote.titulo}`.slice(0, 120), cliente_id: r.pacote.cliente_id, cliente_nome: r.pacote.cliente_nome,
        telefone_cadastro: cl.ok ? cl.cliente.telefone || '' : '', whatsapp: cl.ok ? fone(cl.cliente.telefone || '') : '' });
    }
    if (params.get('cliente') && !d.cliente_id) { const cl = await api('ver', { id: params.get('cliente') }); if (cl.ok) Object.assign(d, { cliente_id: cl.cliente.id, cliente_nome: cl.cliente.nome, telefone_cadastro: cl.cliente.telefone || '', whatsapp: fone(cl.cliente.telefone || '') }); }
  }
  gravarRasc(chave(), d); return d;
}

// ETAPA 1 — identificação
async function etapaIdent() {
  const d = await preparar(); if (!d) return;
  if (MODO === 'm') {
    const form = pagina({
      titulo: tituloEd(), etapa: 1, etapasTotal: TOTAL, formulario: true, voltar: sair(), voltarTexto: 'Voltar',
      corpo: `<p class="etapa" style="margin-top:-8px">Identificação do modelo</p>${campoTexto({ id: 'nome', rotulo: 'Nome do modelo', valor: d.nome, attrs: 'maxlength="100" autocomplete="off"' })}
        <p class="ajuda">Modelo é só um ponto de partida comercial: não pertence a nenhuma cliente e alterá-lo não muda propostas já emitidas.</p>`,
      acoes: rodape(sair(), null, true)
    });
    $('#cancelar').onclick = () => apagarRasc(chave());
    form.addEventListener('input', () => guardar({ nome: form.nome.value }));
    form.onsubmit = (e) => { e.preventDefault(); if (!mostrarErros(form, form.nome.value.trim().length < 2 ? { nome: 'Informe o nome.' } : {})) return; guardar({ nome: form.nome.value }); irProx(EP + 'itens/' + qs()); };
    return focarTitulo();
  }
  const cf = await api('ag_config_ver'); const profs = cf.ok ? cf.profissionais.filter(p => p.ativo) : [];
  const fixa = !!d.pacote_alvo_id || !!eid();
  const form = pagina({
    titulo: tituloEd(), etapa: 1, etapasTotal: TOTAL, formulario: true, voltar: sair(), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Identificação${d.modelo_nome ? ` · do modelo “${esc(d.modelo_nome)}”` : ''}${d.pacote_alvo_id ? ' · aditivo (não altera o acordo original)' : ''}${eid() ? ` · versão ${d.versao} → ${d.versao + 1}` : ''}</p>
      ${campoTexto({ id: 'titulo_prop', rotulo: 'Título da proposta', valor: d.titulo, attrs: 'maxlength="120" autocomplete="off"' })}
      <div class="campo pessoa-linha"><span class="rotulo-campo" id="cli-rot">Cliente</span>
        <div class="pessoa-escolha"><strong>${d.cliente_nome ? esc(d.cliente_nome) : '<span class="ajuda">Nenhuma</span>'}</strong>${fixa ? '' : `<a class="btn btn-suave" href="${EP}cliente/${qs()}" id="escolher" aria-describedby="cli-rot">${d.cliente_nome ? 'Trocar' : 'Escolher'}</a>`}</div><span class="erro" id="cliente-erro" aria-live="polite"></span></div>
      <div class="duas-colunas">${campoTexto({ id: 'whatsapp', rotulo: 'WhatsApp (confira)', valor: d.whatsapp, tipo: 'tel', opcional: true, attrs: 'inputmode="tel" autocomplete="off" maxlength="16"' })}
        <div class="campo"><label for="profissional_id">Profissional responsável</label><select id="profissional_id" name="profissional_id"><option value="">Não definida</option>${profs.map(p => `<option value="${esc(p.id)}" ${p.id === d.profissional_id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></div></div>
      <p class="ajuda">Data de criação: ${dataBR(d.hoje)} (automática). O WhatsApp aqui vale só para esta proposta.</p>`,
    acoes: rodape(sair(), null, true)
  });
  $('#corpo').classList.add('fin-compacto');
  $('#cancelar').onclick = () => apagarRasc(chave());
  const lerF = () => ({ titulo: form.titulo_prop.value, whatsapp: form.whatsapp.value, profissional_id: form.profissional_id.value });
  form.addEventListener('input', () => guardar(lerF())); form.addEventListener('change', () => guardar(lerF()));
  form.onsubmit = (e) => {
    e.preventDefault(); const v = lerF(); const er = {};
    if (v.titulo.trim().length < 2) er.titulo_prop = 'Informe o título.';
    const dg = digitos(v.whatsapp); if (dg && !(dg.length === 10 || dg.length === 11)) er.whatsapp = 'WhatsApp inválido (DDD + número).';
    const okCampos = mostrarErros(form, er);
    if (!ler().cliente_id) { $('#cliente-erro').textContent = 'Escolha a cliente do cadastro.'; return; }
    if (!okCampos) return;
    guardar(v); irProx(EP + 'itens/' + qs());
  };
  focarTitulo();
}
async function telaCliente() {
  const d = ler(); if (!d) return ir(EP);
  pagina({
    titulo: 'Escolher cliente', voltar: EP + qs(), voltarTexto: 'Voltar',
    corpo: `<form class="busca" role="search" id="form-busca"><div class="campo"><label for="q">Buscar por nome ou telefone</label><input id="q" type="search" autocomplete="off"></div></form>
      <ul class="lista" id="lista" aria-label="Clientes"></ul>${navPaginas('nav')}<p class="ajuda">Não encontrou? <a href="/brow-studio/clientes/nova/">Cadastre a cliente</a> e volte.</p>`,
    acoes: `<a class="btn btn-linha" href="${EP}${qs()}">${SETA} Voltar</a>`
  });
  const L = listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: 70, abaixo: 82 + 90, rotulo: 'clientes',
    buscar: (pg, lim) => api('listar', { query: { q: $('#q').value.trim(), pagina: pg, limite: lim } }).then(r => r.ok ? { ...r, paginas: Math.max(1, Math.ceil(r.total / r.limite)) } : r),
    desenhar: (r) => r.total ? r.itens.map(x => `<li class="item"><div class="item-info"><div class="item-nome">${esc(x.nome)}</div><div class="item-extra">${esc(fone(x.telefone || ''))}</div></div>
        <button type="button" class="btn btn-linha" data-id="${esc(x.id)}" data-nome="${esc(x.nome)}" data-tel="${esc(x.telefone || '')}" aria-label="Escolher ${esc(x.nome)}">Escolher</button></li>`).join('') : '<li class="vazio vazio-curto"><p>Nenhuma cliente encontrada.</p></li>' });
  $('#lista').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (!b) return; guardar({ cliente_id: b.dataset.id, cliente_nome: b.dataset.nome, telefone_cadastro: b.dataset.tel, whatsapp: fone(b.dataset.tel) }); ir(EP + qs()); });
  let t; $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(L.reiniciar, 300); }); $('#form-busca').onsubmit = (e) => { e.preventDefault(); L.reiniciar(); };
  L.carregar(); focarTitulo();
}

// ETAPA 2 — serviços e sessões
function etapaItens() {
  const d = ler(); if (!d || (MODO === 'p' ? !d.titulo : !d.nome)) return ir(EP + qs());
  const form = pagina({
    titulo: tituloEd(), etapa: 2, etapasTotal: TOTAL, formulario: true, voltar: EP + qs(true), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Serviços e sessões · subtotal <strong id="sub">${reais(subtotal(d.itens))}</strong></p>
      <a class="btn btn-suave" href="${EP}servico/${qs()}" id="adicionar">+ Adicionar serviço</a>
      <ul class="lista" id="lista" aria-label="Itens"></ul>${navPaginas('nav')}<span class="erro" id="itens-erro" aria-live="polite"></span>`,
    acoes: rodape(EP + qs(true))
  });
  paginarLocal({ el: $('#lista'), nav: $('#nav'), itens: d.itens, altura: 72, abaixo: 82 + 52, rotulo: 'itens',
    desenhar: (i, k) => `<li class="item"><div class="item-info"><div class="item-nome">${esc(i.servico_nome)}</div><div class="item-extra">${sessoes(i.quantidade)} × ${reais(i.preco_centavos)} = <strong>${reais(i.quantidade * i.preco_centavos)}</strong></div></div>
      <a class="btn btn-linha" href="${EP}item/${qs(false, { i: k })}" aria-label="Editar ${esc(i.servico_nome)}">Editar</a></li>` });
  form.onsubmit = (e) => { e.preventDefault(); if (!ler().itens.length) { $('#itens-erro').textContent = 'Adicione pelo menos um serviço.'; return; } irProx(EP + 'condicoes/' + qs()); };
  focarTitulo();
}
async function telaServico() {
  const d = ler(); if (!d) return ir(EP + qs());
  pagina({
    titulo: 'Adicionar serviço', voltar: EP + 'itens/' + qs(), voltarTexto: 'Voltar',
    corpo: `<form class="busca" role="search" id="form-busca"><div class="campo"><label for="q">Buscar serviço ativo</label><input id="q" type="search" autocomplete="off"></div></form>
      <ul class="lista" id="lista" aria-label="Serviços ativos"></ul>${navPaginas('nav')}<div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${EP}itens/${qs()}">${SETA} Voltar</a>`
  });
  const L = listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: 70, abaixo: 82 + 52, rotulo: 'serviços',
    buscar: (pg, lim) => api('servicos_listar', { query: { ativos: '1', q: $('#q').value.trim(), pagina: pg, limite: lim } }),
    desenhar: (r) => r.total ? r.itens.map(s => `<li class="item"><div class="item-info"><div class="item-nome">${esc(s.nome)}</div><div class="item-extra">Preço atual ${reais(s.valor_centavos)}</div></div>
        <button type="button" class="btn btn-linha" data-id="${esc(s.id)}" data-nome="${esc(s.nome)}" data-preco="${s.valor_centavos}" aria-label="Escolher ${esc(s.nome)}">Escolher</button></li>`).join('') : '<li class="vazio vazio-curto"><p>Nenhum serviço ativo encontrado.</p></li>' });
  $('#lista').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]'); if (!b) return;
    const at = ler(); const k = at.itens.findIndex(i => i.servico_id === b.dataset.id);
    if (k >= 0) { $('#aviso').innerHTML = avisoHTML(`<strong>${esc(b.dataset.nome)}</strong> já está na lista. Para mudar sessões ou preço, ajuste o item existente.`, 'erro', `<div class="linha-acoes"><a class="btn btn-cheio" href="${EP}item/${qs(false, { i: k })}">Ajustar item existente</a></div>`); return; }
    guardar({ item_novo: { servico_id: b.dataset.id, servico_nome: b.dataset.nome, quantidade: 1, preco_centavos: +b.dataset.preco, preco_catalogo: +b.dataset.preco } });
    ir(EP + 'item/' + qs(false, { i: 'novo' }));
  });
  let t; $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(L.reiniciar, 300); }); $('#form-busca').onsubmit = (e) => { e.preventDefault(); L.reiniciar(); };
  L.carregar(); focarTitulo();
}
function telaItem() {
  const d = ler(); if (!d) return ir(EP + qs());
  const novo = params.get('i') === 'novo'; const k = novo ? -1 : parseInt(params.get('i'), 10);
  const it = novo ? d.item_novo : d.itens[k];
  if (!it) return ir(EP + 'itens/' + qs());
  const volta = EP + 'itens/' + qs();
  const form = pagina({
    titulo: novo ? 'Novo item' : 'Editar item', voltar: volta, voltarTexto: 'Itens', formulario: true,
    corpo: `<div class="bloco"><h2>${esc(it.servico_nome)}</h2>${it.preco_catalogo != null ? `<p class="ajuda">Preço atual do catálogo: ${reais(it.preco_catalogo)} (sugestão).</p>` : ''}</div>
      <div class="duas-colunas">${campoTexto({ id: 'quantidade', rotulo: 'Sessões', valor: it.quantidade, tipo: 'number', attrs: 'min="1" max="999" step="1" inputmode="numeric"' })}
        ${campoTexto({ id: 'preco', rotulo: 'Preço por sessão (R$)', valor: valorTexto(it.preco_centavos), attrs: 'inputmode="decimal" autocomplete="off" maxlength="13"' })}</div>
      <p class="aviso-caixa" id="sub" role="status"></p>
      <p class="ajuda">O nome, as sessões e o preço ficam guardados na ${MODO === 'm' ? 'proposta criada a partir do modelo' : 'proposta'}, mesmo que o catálogo mude depois.</p>`,
    acoes: `<a class="btn btn-linha" href="${volta}" id="cancelar">${novo ? 'Cancelar' : SETA + ' Voltar'}</a>${novo ? '' : '<button type="button" class="btn btn-perigo" id="remover">Remover</button>'}<button type="submit" class="btn btn-cheio">${novo ? 'Adicionar' : 'Salvar item'}</button>`
  });
  const at = () => { const q = parseInt(form.quantidade.value, 10), p = centavos(form.preco.value); $('#sub').innerHTML = q > 0 && p != null ? `${sessoes(q)} × ${reais(p)} = <strong>${reais(q * p)}</strong>` : 'Informe sessões e preço.'; };
  form.addEventListener('input', at); at();
  if (novo) $('#cancelar').onclick = () => guardar({ item_novo: null });
  if ($('#remover')) $('#remover').onclick = () => { const its = ler().itens.slice(); its.splice(k, 1); guardar({ itens: its }); ir(volta); };
  form.onsubmit = (e) => {
    e.preventDefault(); const er = {};
    const qv = form.quantidade.value.trim(); const q = /^\d+$/.test(qv) ? parseInt(qv, 10) : NaN; const p = centavos(form.preco.value);
    if (!(q >= 1 && q <= 999)) er.quantidade = 'Número inteiro maior que zero.';
    if (p === null) er.preco = 'Preço inválido. Ex.: 40,00';
    if (!mostrarErros(form, er)) return;
    const its = ler().itens.slice(); const item = { ...it, quantidade: q, preco_centavos: p };
    if (novo) its.push(item); else its[k] = item;
    guardar({ itens: its, item_novo: null }); ir(volta);
  };
  focarTitulo();
}

// ETAPA 3 — condições e prazos (1ª parte: valores e prazos · 2ª: o que inclui)
function etapaCondicoes() {
  const d = ler(); if (!d || !d.itens || !d.itens.length) return ir(EP + 'itens/' + qs());
  const sub = subtotal(d.itens);
  const form = pagina({
    titulo: tituloEd(), etapa: 3, etapasTotal: TOTAL, formulario: true, voltar: EP + 'itens/' + qs(true), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Condições e prazos (1ª parte)</p>
      ${campoTexto({ id: 'desconto', rotulo: 'Desconto total (R$)', valor: d.desconto, attrs: 'inputmode="decimal" autocomplete="off" maxlength="13"', ajuda: 'Comece em 0,00. Não pode passar do subtotal.' })}
      <div class="fin-valores"><div><span>Subtotal</span><strong>${reais(sub)}</strong></div><div><span>Desconto</span><strong id="v-desc"></strong></div><div><span>Valor final</span><strong id="v-total"></strong></div></div>
      ${MODO === 'p' ? `<div class="duas-colunas">${campoTexto({ id: 'validade', rotulo: 'Validade da proposta', valor: d.validade, tipo: 'date', attrs: `min="${d.hoje}"`, ajuda: 'Prazo para a cliente aprovar.' })}
        ${campoTexto({ id: 'prazo_uso', rotulo: 'Prazo de utilização', valor: d.prazo_uso, tipo: 'date', opcional: true, ajuda: 'Até quando usar as sessões.' })}</div>` : ''}`,
    acoes: rodape(EP + 'itens/' + qs(true))
  });
  $('#corpo').classList.add('fin-compacto');
  const at = () => { const c = centavos(form.desconto.value || '0'); $('#v-desc').textContent = c == null ? '—' : reais(c); $('#v-total').textContent = c == null || c > sub ? '—' : reais(sub - c);
    guardar({ desconto: form.desconto.value, ...(MODO === 'p' ? { validade: form.validade.value, prazo_uso: form.prazo_uso.value } : {}) }); };
  form.addEventListener('input', at); form.addEventListener('change', at); at();
  form.onsubmit = (e) => {
    e.preventDefault(); const er = {}; const c = centavos(form.desconto.value || '0');
    if (c === null) er.desconto = 'Valor inválido (0 ou mais, ex.: 20,00).'; else if (c > sub) er.desconto = `Não pode passar do subtotal (${reais(sub)}).`;
    if (MODO === 'p') {
      if (!form.validade.value) er.validade = 'Informe a validade.'; else if (form.validade.value < d.hoje) er.validade = 'A validade não pode estar no passado.';
      if (form.prazo_uso.value && form.validade.value && form.prazo_uso.value < form.validade.value) er.prazo_uso = 'Deve ser depois da validade da proposta.';
    }
    if (!mostrarErros(form, er)) return;
    irProx(EP + 'inclusao/' + qs());
  };
  focarTitulo();
}
function etapaInclusao() {
  const d = ler(); if (!d || !d.itens || !d.itens.length) return ir(EP + 'itens/' + qs());
  const form = pagina({
    titulo: tituloEd(), etapa: 3, etapasTotal: TOTAL, formulario: true, voltar: EP + 'condicoes/' + qs(true), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Condições e prazos (2ª parte)</p>
      ${grupoOpcoes({ nome: 'retoques', legenda: 'Retoques fazem parte do pacote?', opcoes: RETOQUES, valor: d.retoques, colunas: 3 })}
      ${campoTexto({ id: 'inclui', rotulo: 'O que está incluído', valor: d.inclui, opcional: true, attrs: 'maxlength="800" autocomplete="off" placeholder="Ex.: as sessões listadas acima"' })}
      <div class="campo"><label for="condicoes">Condições comerciais <span class="opcional">(opcional)</span></label><textarea id="condicoes" name="condicoes" maxlength="1500" rows="2" class="curta">${esc(d.condicoes || '')}</textarea></div>
      ${MODO === 'p' ? campoTexto({ id: 'observacoes', rotulo: 'Observações', valor: d.observacoes, opcional: true, attrs: 'maxlength="1000" autocomplete="off"' }) : ''}
      <p class="ajuda">Nenhuma sessão extra, intervalo ou gratuidade é acrescentado automaticamente.</p>`,
    acoes: rodape(EP + 'condicoes/' + qs(true), 'Conferência <span aria-hidden="true">→</span>')
  });
  $('#corpo').classList.add('fin-compacto');
  const lerF = () => ({ retoques: (form.querySelector('[name=retoques]:checked') || {}).value || '', inclui: form.inclui.value, condicoes: form.condicoes.value, ...(MODO === 'p' ? { observacoes: form.observacoes.value } : {}) });
  form.addEventListener('input', () => guardar(lerF())); form.addEventListener('change', () => guardar(lerF()));
  form.onsubmit = (e) => { e.preventDefault(); const v = lerF(); if (MODO === 'p' && !mostrarErros(form, v.retoques ? {} : { retoques: 'Informe se retoques fazem parte do pacote.' })) return; guardar(v); ir(EP + 'conferencia/' + qs(true)); };
  focarTitulo();
}
// ETAPA 4 — conferência
async function etapaConferencia() {
  const d = ler(); if (!d || !d.itens || !d.itens.length) return ir(EP + qs());
  const sub = subtotal(d.itens), desc = centavos(d.desconto || '0') || 0;
  const corr = (e) => `${EP}${e}${qs(true, { conf: '1' })}`;
  const nIt = window.innerWidth < 600 ? 2 : 3;
  const its = d.itens.slice(0, nIt).map((i, k) => [`Item ${k + 1}`, `${i.servico_nome} · ${sessoes(i.quantidade)} × ${reais(i.preco_centavos)} = ${reais(i.quantidade * i.preco_centavos)}`]);
  if (d.itens.length > nIt) its.push(['…', `e mais ${d.itens.length - nIt} item(ns) — total de ${d.itens.length}`]);
  const secoes = [
    blocoResumo(MODO === 'm' ? 'Modelo' : 'Identificação', MODO === 'm' ? [['Nome', d.nome]] : [['Título', d.titulo], ['Cliente', d.cliente_nome], ['WhatsApp', fone(d.whatsapp)]], corr('')),
    blocoResumo('Serviços e sessões', its, corr('itens/')),
    blocoResumo('Valores e prazos', [['Subtotal / desconto', `${reais(sub)} − ${reais(desc)}`], ['Valor final', reais(sub - desc)], ...(MODO === 'p' ? [['Validade da proposta', dataBR(d.validade)], ['Prazo de utilização', d.prazo_uso ? dataBR(d.prazo_uso) : 'Sem prazo definido']] : [])], corr('condicoes/')),
    blocoResumo('Inclusão e condições', [['Retoques', RETOQUES[d.retoques] || 'Não informado'], ['Incluído', curto(d.inclui)], ['Condições', curto(d.condicoes)]], corr('inclusao/'))];
  pagina({
    titulo: tituloEd(), etapa: 4, etapasTotal: TOTAL, voltar: EP + 'inclusao/' + qs(true), voltarTexto: 'Voltar',
    corpo: `<div class="resumo resumo-ct" id="secoes"></div>${navPaginas('nav')}<div id="aviso"></div>`,
    acoes: MODO === 'm' ? `<a class="btn btn-linha" href="${EP}inclusao/${qs(true)}">${SETA} Voltar</a><button type="button" class="btn btn-cheio" data-salvar="0">Salvar modelo</button>`
      : `<a class="btn btn-linha" href="${EP}inclusao/${qs(true)}">${SETA} Voltar</a>${eid() && d.situacao === 'emitida' ? '' : '<button type="button" class="btn btn-suave" data-salvar="0">Salvar rascunho</button>'}<button type="button" class="btn btn-cheio" data-salvar="1">${eid() && d.situacao === 'emitida' ? 'Salvar revisão' : 'Salvar e emitir'}</button>`
  });
  // mostra todas as seções se couberem; senão pagina (4 → 2 → 1 por tela), sem cortar conteúdo
  let por = 4, pg = 1;
  const desenhar = () => { const paginas = Math.ceil(secoes.length / por); pg = Math.min(pg, paginas); $('#secoes').innerHTML = secoes.slice((pg - 1) * por, pg * por).join('');
    ligarNav($('#nav'), { pagina: pg, paginas, total: secoes.length, rotulo: 'seções' }, (n) => { pg = n; desenhar(); }); };
  desenhar();
  while (passou() && por > 1) { por = por === 4 ? 2 : 1; pg = 1; desenhar(); }
  let env = false;
  app.querySelectorAll('[data-salvar]').forEach(b => b.onclick = async () => {
    if (env) return; env = true; app.querySelectorAll('[data-salvar]').forEach(x => { x.disabled = true; }); const txtOrig = b.textContent; b.textContent = 'Salvando…';
    const itens = d.itens.map(({ servico_id, servico_nome, quantidade, preco_centavos }) => ({ servico_id, servico_nome, quantidade, preco_centavos }));
    const r = MODO === 'm'
      ? await api('or_modelo_salvar', { corpo: { id: eid() || undefined, chave_envio: eid() ? undefined : d.chave_envio, nome: d.nome, itens, desconto: d.desconto, retoques: d.retoques || null, inclui: d.inclui, condicoes: d.condicoes } })
      : await api('or_salvar', { corpo: { id: eid() || undefined, chave_envio: eid() ? undefined : d.chave_envio, titulo: d.titulo, cliente_id: d.cliente_id, whatsapp: d.whatsapp, profissional_id: d.profissional_id || null, itens, desconto: d.desconto,
          validade: d.validade, prazo_uso: d.prazo_uso || null, retoques: d.retoques, inclui: d.inclui, condicoes: d.condicoes, observacoes: d.observacoes, modelo_id: d.modelo_id || undefined, pacote_alvo_id: d.pacote_alvo_id || undefined, emitir: b.dataset.salvar === '1' } });
    if (r.ok) { apagarRasc(chave()); recado.pôr(MODO === 'm' ? 'Modelo salvo.' : (b.dataset.salvar === '1' ? (eid() ? 'Revisão salva (nova versão).' : 'Proposta salva e emitida. Nada foi cobrado nem reservado.') : 'Rascunho salvo.')); location.replace(MODO === 'm' ? `${BASE}modelo/?id=${encodeURIComponent(r.id)}` : `${BASE}proposta/?id=${encodeURIComponent(r.id)}`); return; }
    env = false; app.querySelectorAll('[data-salvar]').forEach(x => { x.disabled = false; }); b.textContent = txtOrig;
    $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível salvar.') + (r.erros ? ' ' + esc(Object.values(r.erros).join(' ')) : '') + '<br><small>Os dados continuam aqui.</small>', 'erro');
  });
  focarTitulo();
}

// ═══════════════════════════ PROPOSTA: DETALHES E AÇÕES ════════════════════
async function telaProposta() {
  carregando('Proposta');
  const r = await api('or_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Proposta', r.msg);
  const p = r.proposta; const q = encodeURIComponent(p.id); const msg = recado.tirar();
  const B = (h, t, c = 'btn-suave', extra = '') => `<a class="btn ${c}" href="${h}" ${extra}>${t}</a>`;
  const a = [];
  if (p.situacao === 'rascunho') a.push(`<button type="button" class="btn btn-cheio" id="emitir" ${p.vencida ? 'disabled' : ''}>Emitir proposta</button>`);
  if (p.situacao === 'emitida') a.push(p.vencida ? B(`${BASE}nova/?id=${q}`, 'Revisar validade', 'btn-cheio', 'id="editar"') : B(`${BASE}aprovar/?id=${q}`, 'Registrar aprovação', 'btn-cheio'), B(`${BASE}recusar/?id=${q}`, 'Registrar recusa'));
  if (p.situacao === 'aprovada' && p.pacote_id) a.push(B(`${BASE}pacote/?id=${encodeURIComponent(p.pacote_id)}`, 'Ver pacote', 'btn-cheio'));
  if (p.situacao === 'aprovada' && p.total_centavos > 0) a.push(r.lancamento && !r.lancamento.cancelado ? B(`/brow-studio/financeiro/ver/?id=${encodeURIComponent(r.lancamento.id)}`, 'Abrir receita') : B(`${BASE}receita/?id=${q}`, 'Receita no financeiro'));
  if (['rascunho', 'emitida'].includes(p.situacao) && !(p.situacao === 'emitida' && p.vencida)) a.push(B(`${BASE}nova/?id=${q}`, p.situacao === 'emitida' ? 'Revisar proposta' : 'Editar', 'btn-suave', 'id="editar"'));
  a.push(B(`${BASE}proposta/itens/?id=${q}`, `Itens (${p.itens.length})`), B(`${BASE}whatsapp/?id=${q}`, 'WhatsApp'), B(`/api/brow?acao=or_pdf&id=${q}`, 'PDF', 'btn-suave', 'download'), B(`${BASE}historico/?id=${q}`, 'Histórico'));
  if (['rascunho', 'emitida'].includes(p.situacao)) a.push(B(`${BASE}cancelar/?id=${q}`, 'Cancelar', 'btn-perigo'));
  pagina({
    titulo: p.pacote_alvo_id ? 'Aditivo' : 'Proposta', voltar: BASE, voltarTexto: 'Propostas',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      <div class="servico-cabeca"><h2>${esc(p.titulo)}</h2><span class="selos">${seloP(p)}</span></div>
      ${p.vencida ? `<div class="so-largo-bloco">${avisoHTML(`Validade vencida em ${dataBR(p.validade)}: revise antes de ${p.situacao === 'rascunho' ? 'emitir' : 'aprovar'}.`, 'erro')}</div>` : ''}
      <div class="fin-valores"><div><span>Subtotal</span><strong>${reais(p.subtotal_centavos)}</strong></div><div><span>Desconto</span><strong>${reais(p.desconto_centavos)}</strong></div><div><span>Total</span><strong>${reais(p.total_centavos)}</strong></div></div>
      <div class="resumo resumo-ct">${blocoResumo(`Versão ${p.versao} · criada em ${dataBR(p.criada_em)}`, [['Cliente', p.cliente_name || p.cliente_nome], ['Profissional', p.profissional_nome], ['Validade / prazo de uso', `${dataBR(p.validade)} / ${p.prazo_uso ? dataBR(p.prazo_uso) : 'sem prazo'}`],
        ...(p.situacao === 'aprovada' ? [['Aprovação', `${p.aprovacao_ref} · ${p.aprovada_por || 'login pendente'}`]] : []), ...(p.recusa_motivo ? [['Recusa', p.recusa_motivo]] : []), ...(p.cancel_motivo ? [['Cancelamento', p.cancel_motivo]] : [])])}</div>
      <div id="aviso"></div>
      <nav class="acoes-grade" aria-label="Ações da proposta">${a.join('')}</nav>`
  });
  if ($('#editar')) $('#editar').onclick = () => apagarRasc('or:p:' + p.id);
  if ($('#emitir')) $('#emitir').onclick = async () => { const b = $('#emitir'); b.disabled = true; const rr = await api('or_emitir', { corpo: { id: p.id } }); if (rr.ok) { recado.pôr('Proposta emitida. Isso não é cobrança nem reserva.'); location.reload(); return; } b.disabled = false; $('#aviso').innerHTML = avisoHTML(esc(rr.msg), 'erro'); };
  focarTitulo();
}
async function telaPropostaItens() {
  const r = await api('or_ver', { id: params.get('id') }); if (!r.ok) return telaErro('Itens', r.msg);
  const p = r.proposta; const volta = `${BASE}proposta/?id=${encodeURIComponent(p.id)}`;
  pagina({ titulo: 'Itens da proposta', voltar: volta, voltarTexto: 'Proposta', corpo: `<p class="etapa" style="margin-top:-8px">${esc(p.titulo)} · versão ${p.versao}</p><ul class="lista" id="lista" aria-label="Itens"></ul>${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar</a>` });
  paginarLocal({ el: $('#lista'), nav: $('#nav'), itens: p.itens, altura: 66, abaixo: 82 + 52, rotulo: 'itens', desenhar: (i) => `<li class="item"><div class="item-info"><div class="item-nome">${esc(i.servico_nome)}</div><div class="item-extra">${sessoes(i.quantidade)} × ${reais(i.preco_centavos)} = <strong>${reais(i.quantidade * i.preco_centavos)}</strong></div></div></li>` });
  focarTitulo();
}
function formConfirmar({ titulo, volta, cab, aviso, campos, botao, perigo, enviar }) {
  const form = pagina({ titulo, voltar: volta, voltarTexto: 'Voltar', formulario: true,
    corpo: `${cab}${aviso ? avisoHTML(aviso) : ''}${campos}<label class="chave"><input type="checkbox" name="confirmacao"><span><strong>Confirmo</strong></span></label><span class="erro" id="confirmacao-erro"></span><div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Voltar</a><button type="submit" class="btn ${perigo ? 'btn-perigo-cheio' : 'btn-cheio'}" id="confirmar">${botao}</button>` });
  $('#corpo').classList.add('fin-compacto');
  let env = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (env) return;
    const er = {}; const mot = form.querySelector('[name=motivo],[name=referencia]');
    if (mot && mot.value.trim().length < 3) er[mot.name] = mot.name === 'referencia' ? 'Informe como a cliente aprovou.' : 'Informe o motivo.';
    if (!form.confirmacao.checked) er.confirmacao = 'Marque a confirmação.';
    if (form.justificativa && form.justificativa.closest('.campo') && !form.justificativa.closest('[hidden]') && form.justificativa.value.trim().length < 3) er.justificativa = 'Informe a justificativa.';
    if (!mostrarErros(form, er)) return;
    env = true; $('#confirmar').disabled = true;
    const rr = await enviar(form);
    if (rr && rr.ok) return;
    env = false; $('#confirmar').disabled = false;
    if (rr && rr.erros) mostrarErros(form, rr.erros);
    $('#aviso').innerHTML = avisoHTML(esc(rr ? (rr.erros ? Object.values(rr.erros).join(' ') : rr.msg) : 'Erro.'), 'erro');
  };
  focarTitulo();
}
async function telaAcaoProposta(tipo) {
  const T = { aprovar: 'Registrar aprovação', recusar: 'Registrar recusa', cancelar: 'Cancelar proposta' }[tipo];
  carregando(T);
  const r = await api('or_ver', { id: params.get('id') }); if (!r.ok) return telaErro(T, r.msg);
  const p = r.proposta; const volta = `${BASE}proposta/?id=${encodeURIComponent(p.id)}`;
  if (tipo === 'aprovar' && p.vencida) return telaErro(T, 'A validade da proposta passou: revise-a antes de aprovar.', volta);
  if (tipo !== 'cancelar' && p.situacao !== 'emitida') return telaErro(T, 'Só proposta emitida pode ter aprovação ou recusa registrada.', volta);
  formConfirmar({ titulo: T, volta, perigo: tipo !== 'aprovar',
    cab: `<div class="bloco"><h2>${esc(p.titulo)}</h2><p class="ajuda">${esc(p.cliente_nome)} · ${reais(p.total_centavos)} · versão ${p.versao} · validade ${dataBR(p.validade)}</p></div>`,
    aviso: tipo === 'aprovar' ? `Cria ${p.pacote_alvo_id ? 'o acréscimo no pacote existente' : 'um pacote para a cliente'} com as sessões desta versão. <strong>Não registra pagamento, não reserva horários e não consome sessões.</strong>` : tipo === 'recusar' ? 'A proposta fica guardada como recusada.' : 'A proposta fica guardada como cancelada.',
    campos: tipo === 'aprovar' ? campoTexto({ id: 'referencia', rotulo: 'Referência da aprovação', attrs: 'maxlength="200" autocomplete="off" placeholder="Ex.: aprovou pelo WhatsApp em 10/11"' }) : campoTexto({ id: 'motivo', rotulo: 'Motivo', attrs: 'maxlength="300" autocomplete="off"' }),
    botao: T,
    enviar: async (f) => {
      const rr = await api(`or_${tipo}`, { corpo: { id: p.id, confirmacao: true, ...(tipo === 'aprovar' ? { referencia: f.referencia.value } : { motivo: f.motivo.value }) } });
      if (rr.ok) { recado.pôr(tipo === 'aprovar' ? 'Aprovação registrada. Pacote criado (sem pagamento nem reservas).' : tipo === 'recusar' ? 'Recusa registrada.' : 'Proposta cancelada.'); location.replace(tipo === 'aprovar' && rr.pacote_id ? `${BASE}pacote/?id=${encodeURIComponent(rr.pacote_id)}` : volta); }
      return rr;
    } });
}
async function telaWhatsapp() {
  carregando('WhatsApp');
  const r = await api('or_ver', { id: params.get('id') }); if (!r.ok) return telaErro('WhatsApp', r.msg);
  const p = r.proposta; const volta = `${BASE}proposta/?id=${encodeURIComponent(p.id)}`;
  const pref = r.cliente.contato_pref; const PREF = { ligacao: 'ligação', email: 'e-mail', nenhum: 'não receber contato' };
  const form = pagina({ titulo: 'Proposta no WhatsApp', voltar: volta, voltarTexto: 'Proposta', formulario: true,
    corpo: `${pref && pref !== 'whatsapp' ? `${avisoHTML(`Preferência de contato da cliente: <strong>${PREF[pref] || pref}</strong>.`, 'erro')}<label class="chave"><input type="checkbox" name="pref_ok"><span><strong>Mesmo assim, usar o WhatsApp</strong></span></label>` : ''}
      ${campoTexto({ id: 'numero', rotulo: 'Número com DDD', valor: fone(p.whatsapp || r.cliente.telefone || ''), tipo: 'tel', attrs: 'inputmode="tel" autocomplete="off" maxlength="16"' })}
      <div class="campo"><label for="mensagem">Mensagem (revise antes de abrir)</label><textarea id="mensagem" name="mensagem" maxlength="3000" rows="8" class="msg-proposta">${esc(r.texto)}</textarea></div>
      <p class="ajuda" id="nota" aria-live="polite">Nada é enviado automaticamente. Abrir o WhatsApp não significa proposta enviada, aprovada ou paga.</p>`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar</a><button type="submit" class="btn btn-cheio" id="abrir">Abrir WhatsApp</button>` });
  $('#corpo').classList.add('fin-compacto');
  form.onsubmit = (e) => {
    e.preventDefault(); const dg = digitos(form.numero.value);
    if (!(dg.length === 10 || dg.length === 11)) return mostrarErros(form, { numero: 'Número inválido (DDD + número).' });
    if (form.pref_ok && !form.pref_ok.checked) { $('#nota').textContent = 'Marque a confirmação sobre a preferência de contato.'; return; }
    window.open(`https://wa.me/55${dg}?text=${encodeURIComponent(form.mensagem.value.trim())}`, '_blank', 'noopener');
    $('#nota').textContent = 'WhatsApp aberto para envio manual. Isso não registra envio nem aprovação.';
  };
  focarTitulo();
}
const NOMES_H = { criada: 'Proposta criada', revisada: 'Revisada (nova versão)', emitida: 'Emitida', aprovada: 'Aprovada', recusada: 'Recusada', cancelada: 'Cancelada', pdf_gerado: 'PDF gerado', receita_criada: 'Receita criada no financeiro', receita_vinculada: 'Receita existente vinculada',
  criado: 'Pacote criado', reserva: 'Sessão reservada na agenda', sessao: 'Sessão registrada', sessao_estornada: 'Sessão estornada', encerrado: 'Pacote encerrado', aditivo_criado: 'Aditivo criado', aditivo_aprovado: 'Aditivo aprovado', receita: 'Receita vinculada', editado: 'Editado', arquivado: 'Arquivado', desarquivado: 'Desarquivado' };
function descreverH(h) {
  const d = h.detalhes || {}; const ex = [];
  if (d.versao) ex.push(`v${d.versao}`); if (d.referencia) ex.push(d.referencia); if (d.motivo) ex.push('motivo: ' + d.motivo); if (d.item) ex.push(d.item); if (d.data) ex.push(dataBR(d.data));
  if (d.total_para != null) ex.push(`${reais(d.total_de)} → ${reais(d.total_para)}`); else if (d.total != null) ex.push(reais(d.total));
  if (d.excecao_prazo) ex.push('exceção de prazo: ' + d.justificativa); if (d.precos_alterados && d.precos_alterados.length) ex.push(`preço diferente do catálogo em ${d.precos_alterados.length} item(ns)`);
  return [`${NOMES_H[h.acao] || h.acao}${ex.length ? ' · ' + ex.join(' · ') : ''}`, d.autor || 'login pendente'];
}
async function telaHistorico() {
  const tipo = params.get('tipo') || 'proposta'; const id = params.get('id');
  const volta = tipo === 'pacote' ? `${BASE}pacote/?id=${encodeURIComponent(id)}` : tipo === 'modelo' ? `${BASE}modelo/?id=${encodeURIComponent(id)}` : `${BASE}proposta/?id=${encodeURIComponent(id)}`;
  pagina({ titulo: 'Histórico', voltar: volta, voltarTexto: 'Voltar', corpo: `<ul class="lista linha-tempo" id="lista" aria-label="Histórico"></ul>${navPaginas('nav')}`, acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar</a>` });
  listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: 66, abaixo: 82 + 52, rotulo: 'eventos', buscar: (pg, lim) => api('or_historico', { query: { id, tipo, pagina: pg, limite: lim } }),
    desenhar: (r) => r.itens.map(h => { const [t, a] = descreverH(h); return `<li class="evento"><strong>${esc(t)}</strong><small>${esc(new Date(h.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }))} · ${esc(a)}</small></li>`; }).join('') || '<li class="vazio vazio-curto"><p>Sem eventos.</p></li>' }).carregar();
  focarTitulo();
}
async function telaReceita() {
  carregando('Receita');
  const r = await api('or_ver', { id: params.get('id') }); if (!r.ok) return telaErro('Receita', r.msg);
  const p = r.proposta; const volta = p.pacote_id ? `${BASE}pacote/financeiro/?id=${encodeURIComponent(p.pacote_id)}` : `${BASE}proposta/?id=${encodeURIComponent(p.id)}`;
  if (p.situacao !== 'aprovada') return telaErro('Receita', 'A receita é criada depois da aprovação.', volta);
  if (r.lancamento && !r.lancamento.cancelado) return telaErro('Receita', 'Esta proposta já tem receita no financeiro.', volta);
  const ex = await api('or_receitas_cliente', { id: p.id });
  const exist = ex.ok ? ex.itens : [];
  const form = pagina({ titulo: 'Receita do pacote', voltar: volta, voltarTexto: 'Voltar', formulario: true,
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(p.titulo)} · <strong>${reais(p.total_centavos)}</strong></p>
      ${exist.length ? `<fieldset class="campo"><legend>Já existe receita desta cliente? (ex.: sinal)</legend><div class="lista-lotes">${exist.map(l => `<label class="opcao opcao-lote"><input type="radio" name="origem" value="${esc(l.id)}"><span><strong>${esc(l.descricao)}</strong><small>${reais(l.total_centavos)} · pago ${reais(l.pago)} · vence ${dataBR(l.vencimento)}</small></span></label>`).join('')}
        <label class="opcao opcao-lote"><input type="radio" name="origem" value="nova" checked><span><strong>Criar nova receita</strong><small>Valor do pacote: ${reais(p.total_centavos)}</small></span></label></div></fieldset>` : '<input type="hidden" name="origem" value="nova">'}
      <div id="caixa-nova"><div class="duas-colunas">${campoTexto({ id: 'descricao', rotulo: 'Descrição', valor: `${p.pacote_alvo_id ? 'Aditivo' : 'Pacote'} — ${p.titulo}`.slice(0, 120), attrs: 'maxlength="120" autocomplete="off"' })}${campoTexto({ id: 'vencimento', rotulo: 'Vencimento', valor: r.hoje, tipo: 'date' })}</div></div>
      ${avisoHTML('Uma receita por proposta. Fica pendente até o pagamento ser registrado no financeiro; as sessões do pacote não são cobradas de novo.')}<div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Cancelar</a><button type="submit" class="btn btn-cheio" id="criar">Confirmar</button>` });
  $('#corpo').classList.add('fin-compacto');
  const origem = () => (form.querySelector('[name=origem]:checked') || form.querySelector('input[type=hidden][name=origem]')).value;
  form.addEventListener('change', () => { $('#caixa-nova').hidden = origem() !== 'nova'; });
  let env = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (env) return; const o = origem();
    if (o === 'nova') { const er = {}; if (form.descricao.value.trim().length < 2) er.descricao = 'Informe a descrição.'; if (!form.vencimento.value) er.vencimento = 'Informe o vencimento.'; if (!mostrarErros(form, er)) return; }
    env = true; $('#criar').disabled = true;
    const rr = await api('or_receita', { corpo: { id: p.id, ...(o === 'nova' ? { descricao: form.descricao.value, vencimento: form.vencimento.value } : { lancamento_existente_id: o }) } });
    if (rr.ok) { recado.pôr(o === 'nova' ? 'Receita criada (pendente).' : 'Receita existente vinculada (pagamentos aproveitados).'); location.replace(volta); return; }
    env = false; $('#criar').disabled = false;
    $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível.'), 'erro', rr.erro === 'ja_existe' && rr.id ? `<div class="linha-acoes"><a class="btn btn-cheio" href="/brow-studio/financeiro/ver/?id=${encodeURIComponent(rr.id)}">Abrir receita</a></div>` : '');
  };
  focarTitulo();
}

// ═══════════════════════════ MODELOS ═══════════════════════════════════════
async function telaModelos() {
  const msg = recado.tirar(); let arq = '0';
  pagina({ titulo: 'Modelos de combos', voltar: BASE, voltarTexto: 'Propostas',
    extra: `<a class="btn btn-cheio btn-topo" href="${BASE}modelo/novo/?novo=1" aria-label="Novo modelo">+ Novo<span class="so-largo">&nbsp;modelo</span></a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<p class="ajuda">Modelos são pontos de partida comerciais; não pertencem a nenhuma cliente.</p>
      <div class="filtros-chips chips-2" role="radiogroup" aria-label="Modelos"><label class="opcao opcao-chip"><input type="radio" name="arq" value="0" checked><span>Ativos</span></label><label class="opcao opcao-chip"><input type="radio" name="arq" value="1"><span>Arquivados</span></label></div>
      <ul class="lista" id="lista" aria-label="Modelos"></ul>${navPaginas('nav')}` });
  const L = listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: 74, abaixo: 72, rotulo: 'modelos', buscar: (pg, lim) => api('or_modelos', { query: { arquivados: arq, pagina: pg, limite: lim } }),
    desenhar: (r) => r.total ? r.itens.map(m => `<li class="item"><div class="item-info"><div class="item-nome">${esc(m.nome)}</div><div class="item-extra">${m.itens} serviço(s) · ${reais(m.subtotal_centavos - m.desconto_centavos)}</div></div>
      <a class="btn btn-linha" href="${BASE}modelo/?id=${encodeURIComponent(m.id)}" aria-label="Abrir ${esc(m.nome)}">Abrir</a></li>`).join('') : `<li class="vazio"><span class="avatar grande" aria-hidden="true">✦</span><h2>${arq === '1' ? 'Nenhum modelo arquivado' : 'Nenhum modelo'}</h2><p>Crie combos reutilizáveis para agilizar propostas.</p></li>` });
  app.querySelectorAll('[name=arq]').forEach(i => i.onchange = () => { arq = i.value; L.reiniciar(); });
  L.carregar(); focarTitulo();
}
async function telaModelo() {
  carregando('Modelo');
  const r = await api('or_modelo_ver', { id: params.get('id') }); if (!r.ok) return telaErro('Modelo', r.msg, BASE + 'modelos/');
  const m = r.modelo; const q = encodeURIComponent(m.id); const msg = recado.tirar();
  pagina({ titulo: 'Modelo de combo', voltar: BASE + 'modelos/', voltarTexto: 'Modelos',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<div class="servico-cabeca"><h2>${esc(m.nome)}</h2>${m.arquivado ? '<span class="selo selo-or-cancelada">Arquivado</span>' : ''}</div>
      <div class="fin-valores"><div><span>Subtotal</span><strong>${reais(m.subtotal_centavos)}</strong></div><div><span>Desconto</span><strong>${reais(m.desconto_centavos)}</strong></div><div><span>Valor final</span><strong>${reais(m.subtotal_centavos - m.desconto_centavos)}</strong></div></div>
      <ul class="lista" id="lista" aria-label="Itens"></ul>${navPaginas('nav')}
      <nav class="acoes-grade" aria-label="Ações do modelo">${m.arquivado ? '' : `<a class="btn btn-cheio" href="${BASE}nova/?novo=1&modelo=${q}">Usar em nova proposta</a><a class="btn btn-suave" href="${BASE}modelo/novo/?id=${q}" id="editar">Editar modelo</a>`}
        <button type="button" class="btn btn-suave" id="arquivar">${m.arquivado ? 'Desarquivar' : 'Arquivar'}</button><a class="btn btn-suave" href="${BASE}historico/?tipo=modelo&id=${q}">Histórico</a></nav><div id="aviso"></div>` });
  paginarLocal({ el: $('#lista'), nav: $('#nav'), itens: m.itens, altura: 64, abaixo: 82 + 140, rotulo: 'itens', desenhar: (i) => `<li class="item"><div class="item-info"><div class="item-nome">${esc(i.servico_nome)}</div><div class="item-extra">${sessoes(i.quantidade)} × ${reais(i.preco_centavos)}</div></div></li>` });
  if ($('#editar')) $('#editar').onclick = () => apagarRasc('or:m:' + m.id);
  $('#arquivar').onclick = async () => { const rr = await api('or_modelo_arquivar', { corpo: { id: m.id, valor: !m.arquivado } }); if (rr.ok) { recado.pôr(m.arquivado ? 'Modelo desarquivado.' : 'Modelo arquivado (propostas existentes não mudam).'); location.reload(); } else $('#aviso').innerHTML = avisoHTML(esc(rr.msg), 'erro'); };
  focarTitulo();
}

// ═══════════════════════════ PACOTES ═══════════════════════════════════════
async function telaPacotes() {
  const cliente = params.get('cliente') || ''; let filtro = 'ativos';
  pagina({ titulo: 'Pacotes das clientes', voltar: BASE, voltarTexto: 'Propostas',
    corpo: `${cliente ? '' : '<form class="busca" role="search" id="form-busca"><div class="campo"><label for="q">Buscar por cliente ou título</label><input id="q" type="search" autocomplete="off"></div></form>'}
      <div class="filtros-chips chips-4" role="radiogroup" aria-label="Pacotes">${Object.entries({ ativos: 'Ativos', prazo: 'Prazo vencido', encerrados: 'Encerrados', todos: 'Todos' }).map(([v, t]) => `<label class="opcao opcao-chip"><input type="radio" name="f" value="${v}" ${v === filtro ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
      <ul class="lista" id="lista" aria-label="Pacotes"></ul>${navPaginas('nav')}` });
  const L = listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: 78, abaixo: 72, rotulo: 'pacotes', buscar: (pg, lim) => api('or_pacotes', { query: { q: $('#q') ? $('#q').value.trim() : '', filtro, cliente, pagina: pg, limite: lim } }),
    desenhar: (r) => r.total ? r.itens.map(p => `<li class="item"><div class="item-info"><div class="item-nome">${esc(p.cliente_nome)} <small>· ${esc(p.titulo)}</small></div>
      <div class="item-extra item-extra-quebra">${p.disponivel} de ${p.sessoes} sessões disponíveis · ${p.realizadas} realizada(s) <span class="selos">${p.situacao === 'encerrado' ? '<span class="selo-est neutro">Encerrado</span>' : ''}${p.prazo_ultrapassado ? '<span class="selo-est perigo">Prazo vencido</span>' : ''}</span></div></div>
      <a class="btn btn-linha" href="${BASE}pacote/?id=${encodeURIComponent(p.id)}" aria-label="Abrir pacote de ${esc(p.cliente_nome)}">Abrir</a></li>`).join('') : '<li class="vazio vazio-curto"><p>Nenhum pacote. Pacotes nascem da aprovação de uma proposta.</p></li>' });
  if ($('#q')) { let e; $('#q').addEventListener('input', () => { clearTimeout(e); e = setTimeout(L.reiniciar, 300); }); $('#form-busca').onsubmit = (ev) => { ev.preventDefault(); L.reiniciar(); }; }
  app.querySelectorAll('[name=f]').forEach(i => i.onchange = () => { filtro = i.value; L.reiniciar(); });
  L.carregar(); focarTitulo();
}
async function telaPacote() {
  carregando('Pacote');
  const r = await api('or_pacote_ver', { id: params.get('id') }); if (!r.ok) return telaErro('Pacote', r.msg, BASE + 'pacotes/');
  const p = r.pacote, f = p.financeiro; const q = encodeURIComponent(p.id); const msg = recado.tirar();
  pagina({ titulo: 'Pacote', voltar: BASE + 'pacotes/', voltarTexto: 'Pacotes',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<div class="servico-cabeca"><h2>${esc(p.cliente_nome)}</h2><span class="selos">${p.situacao === 'encerrado' ? '<span class="selo selo-or-cancelada">Encerrado</span>' : '<span class="selo selo-or-aprovada">Ativo</span>'}${p.prazo_ultrapassado ? ' <span class="selo selo-fin-vencido">Prazo vencido</span>' : ''}</span></div>
      <p class="etapa">${esc(p.titulo)} · prazo de utilização: ${p.prazo_uso ? dataBR(p.prazo_uso) : 'sem prazo'}</p>
      ${p.prazo_ultrapassado ? avisoHTML('Prazo de utilização vencido. O histórico continua e nada é cobrado automaticamente; uso fora do prazo exige justificativa.', 'erro') : ''}
      ${f ? `<div class="fin-valores fin-4"><div><span>Valor contratado</span><strong>${reais(f.contratado_centavos)}</strong></div><div><span>Total pago</span><strong>${reais(f.pago_centavos)}</strong></div><div><span>Saldo financeiro</span><strong class="${f.saldo_centavos > 0 ? 'txt-pendente' : ''}">${reais(f.saldo_centavos)}</strong></div><div><span>Saldo de sessões</span><strong>${p.disponivel} de ${p.sessoes}</strong></div></div>` : `<div class="fin-valores"><div><span>Saldo de sessões</span><strong>${p.disponivel} de ${p.sessoes}</strong></div></div>`}
      <ul class="lista" id="lista" aria-label="Serviços do pacote"></ul>${navPaginas('nav')}
      <nav class="acoes-grade" aria-label="Ações do pacote">${f ? `<a class="btn btn-suave" href="${BASE}pacote/financeiro/?id=${q}">Financeiro</a>` : ''}<a class="btn btn-suave" href="${BASE}pacote/usos/?pacote=${q}">Histórico de utilização</a>
        ${p.situacao === 'ativo' ? `<a class="btn btn-suave" href="${BASE}nova/?novo=1&aditivo=${q}">Criar aditivo</a>` : ''}<a class="btn btn-suave" href="${BASE}proposta/?id=${encodeURIComponent(p.proposta_id)}">Proposta de origem</a>
        <a class="btn btn-suave" href="${BASE}historico/?tipo=pacote&id=${q}">Alterações</a>${p.situacao === 'ativo' ? `<a class="btn btn-perigo" href="${BASE}pacote/encerrar/?id=${q}">Encerrar pacote</a>` : ''}</nav>` });
  paginarLocal({ el: $('#lista'), nav: $('#nav'), itens: p.itens, altura: 74, abaixo: 82 + 170, rotulo: 'serviços',
    desenhar: (i) => `<li class="item"><div class="item-info"><div class="item-nome">${esc(i.servico_nome)}</div><div class="item-extra item-extra-quebra">${i.quantidade} contratadas · ${i.realizadas} realizadas · ${i.reservadas} reservadas · <strong>${i.disponivel} disponíveis</strong></div></div>
      <a class="btn btn-linha" href="${BASE}pacote/item/?id=${encodeURIComponent(i.id)}" aria-label="Abrir ${esc(i.servico_nome)}">Abrir</a></li>` });
  focarTitulo();
}
async function telaPacoteFinanceiro() {
  const r = await api('or_pacote_ver', { id: params.get('id') }); if (!r.ok) return telaErro('Financeiro do pacote', r.msg);
  const p = r.pacote, f = p.financeiro; const volta = `${BASE}pacote/?id=${encodeURIComponent(p.id)}`; const msg = recado.tirar();
  if (!f) return telaErro('Financeiro do pacote', 'O financeiro é exclusivo da dona do estúdio.', volta);
  pagina({ titulo: 'Financeiro do pacote', voltar: volta, voltarTexto: 'Pacote',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<div class="fin-valores"><div><span>Contratado</span><strong>${reais(f.contratado_centavos)}</strong></div><div><span>Pago</span><strong>${reais(f.pago_centavos)}</strong></div><div><span>Saldo financeiro</span><strong>${reais(f.saldo_centavos)}</strong></div></div>
      <p class="ajuda">O saldo financeiro não depende das sessões restantes. Uma receita por proposta (original e aditivos).</p>
      <ul class="lista" aria-label="Propostas do pacote">${f.propostas.map(x => `<li class="item"><div class="item-info"><div class="item-nome">${esc(x.titulo)}${x.aditivo ? ' <small>· aditivo</small>' : ''}</div><div class="item-extra">${reais(x.total_centavos)} · ${x.lancamento ? `receita: pago ${reais(x.lancamento.pago)} de ${reais(x.lancamento.total_centavos)}` : x.total_centavos ? 'sem receita no financeiro' : 'total zero'}</div></div>
        ${x.lancamento ? `<a class="btn btn-linha" href="/brow-studio/financeiro/ver/?id=${encodeURIComponent(x.lancamento.id)}">Abrir</a>` : x.total_centavos ? `<a class="btn btn-linha" href="${BASE}receita/?id=${encodeURIComponent(x.id)}">Receita</a>` : ''}</li>`).join('')}</ul>
      <p class="ajuda">Serviço extra (fora do pacote)? Cobre à parte em <a href="/brow-studio/financeiro/novo/?tipo=receita&novo=1">Financeiro</a>. Encerrar pacote ou estornar sessão não devolve dinheiro.</p>`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar ao pacote</a>` });
  focarTitulo();
}
async function telaItemPacote() {
  carregando('Serviço do pacote');
  const r = await api('or_item_ver', { id: params.get('id') }); if (!r.ok) return telaErro('Serviço do pacote', r.msg, BASE + 'pacotes/');
  const i = r.item, p = r.pacote; const q = encodeURIComponent(i.id); const msg = recado.tirar(); const ativo = p.situacao === 'ativo';
  pagina({ titulo: i.servico_nome, voltar: `${BASE}pacote/?id=${encodeURIComponent(p.id)}`, voltarTexto: 'Pacote',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<p class="etapa" style="margin-top:-8px">${esc(p.cliente_nome)} · ${esc(p.titulo)}${p.prazo_uso ? ` · prazo ${dataBR(p.prazo_uso)}` : ''}</p>
      <div class="fin-valores fin-4"><div><span>Contratadas</span><strong>${i.quantidade}</strong></div><div><span>Realizadas</span><strong>${i.realizadas}</strong></div><div><span>Reservadas</span><strong>${i.reservadas}</strong></div><div><span>Disponíveis</span><strong>${i.disponivel}</strong></div></div>
      <p class="ajuda">Reservadas = horários na agenda (ou concluídos aguardando registro). Só o registro de atendimento realizado consome sessão.</p>
      ${r.reservas.length ? `<section class="bloco"><h2>Reservas na agenda</h2><ul class="lista-simples">${r.reservas.map(a => `<li><a href="${AG}atendimento/?id=${encodeURIComponent(a.id)}">${dataBR(a.data)} ${a.inicio} · ${esc(a.profissional_nome)}</a>${a.situacao === 'concluido' ? ' · concluído: registre a sessão' : ''}</li>`).join('')}</ul></section>` : ''}
      <nav class="acoes-grade" aria-label="Ações">${ativo && i.disponivel > 0 ? `<a class="btn btn-cheio" href="${BASE}pacote/agendar/?item=${q}">Agendar sessão</a>` : ''}${ativo ? `<a class="btn btn-cheio" href="${BASE}pacote/sessao/?item=${q}&novo=1">Registrar sessão realizada</a>` : ''}
        <a class="btn btn-suave" href="${BASE}pacote/usos/?item=${q}">Histórico de utilização</a></nav>` });
  focarTitulo();
}
async function telaAgendarSessao() {
  carregando('Agendar sessão');
  const r = await api('or_item_ver', { id: params.get('item') }); if (!r.ok) return telaErro('Agendar sessão', r.msg);
  const i = r.item, p = r.pacote; const volta = `${BASE}pacote/item/?id=${encodeURIComponent(i.id)}`;
  if (p.situacao !== 'ativo' || i.disponivel <= 0) return telaErro('Agendar sessão', p.situacao !== 'ativo' ? 'Pacote encerrado.' : 'Sem sessões disponíveis neste serviço (contando as reservadas).', volta);
  const [cf, cl] = await Promise.all([api('ag_config_ver'), api('ver', { id: p.cliente_id })]);
  const profs = cf.ok ? cf.profissionais.filter(x => x.ativo) : [];
  const form = pagina({ titulo: 'Agendar sessão', voltar: volta, voltarTexto: 'Serviço', formulario: true,
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(p.cliente_nome)} · ${esc(i.servico_nome)} · ${i.disponivel} disponível(is)</p>
      ${grupoOpcoes({ nome: 'profissional_id', legenda: 'Profissional', opcoes: Object.fromEntries(profs.map(x => [x.id, x.nome])), valor: profs.some(x => x.id === p.profissional_id) ? p.profissional_id : '', colunas: 3 })}
      ${avisoHTML('A Agenda mostra só horários livres e confere o saldo do pacote ao salvar. Agendar reserva a sessão, mas não a consome.')}`,
    acoes: `<a class="btn btn-linha" href="${volta}">Cancelar</a><button type="submit" class="btn btn-cheio">Escolher data e horário <span aria-hidden="true">→</span></button>` });
  form.onsubmit = (e) => {
    e.preventDefault(); const pr = form.querySelector('[name=profissional_id]:checked');
    if (!mostrarErros(form, pr ? {} : { profissional_id: 'Escolha a profissional.' })) return;
    const pf = profs.find(x => x.id === pr.value);
    gravarRasc('ag:novo', { chave_envio: uuid(), cliente_id: p.cliente_id, cliente_nome: p.cliente_nome, whatsapp: cl.ok ? digitos(cl.cliente.telefone) : '', telefone_cadastro: cl.ok ? cl.cliente.telefone || '' : '', atualizar_cadastro: false,
      profissional_id: pf.id, profissional_nome: pf.nome, servico_id: i.servico_id, servico_nome: i.servico_nome, data: null, inicio_min: null, observacoes: `Sessão do pacote: ${p.titulo}`, pacote_item_id: i.id });
    ir(`${AG}novo/data/`);
  };
  focarTitulo();
}
async function telaSessao() {
  carregando('Registrar sessão');
  const r = await api('or_item_ver', { id: params.get('item') }); if (!r.ok) return telaErro('Registrar sessão', r.msg);
  const i = r.item, p = r.pacote; const volta = `${BASE}pacote/item/?id=${encodeURIComponent(i.id)}`;
  if (p.situacao !== 'ativo') return telaErro('Registrar sessão', 'Pacote encerrado.', volta);
  const ch = 'or:sessao:' + i.id; if (params.get('novo') === '1' || !lerRasc(ch)) gravarRasc(ch, { chave: uuid() });
  const form = pagina({ titulo: 'Registrar sessão realizada', voltar: volta, voltarTexto: 'Serviço', formulario: true,
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(p.cliente_nome)} · ${esc(i.servico_nome)} · ${i.realizadas} de ${i.quantidade} realizadas</p>
      <fieldset class="campo"><legend>Atendimento realizado (concluído na agenda)</legend><ul class="lista lista-lotes" id="lista" aria-label="Atendimentos"></ul><span class="erro" id="agendamento_id-erro" aria-live="polite"></span></fieldset>${navPaginas('nav')}
      <div class="campo" id="caixa-just" hidden><label for="justificativa">Justificativa da exceção de prazo</label><input id="justificativa" name="justificativa" maxlength="300" autocomplete="off"><span class="erro" id="justificativa-erro" aria-live="polite"></span></div>
      <label class="chave"><input type="checkbox" name="confirmacao"><span><strong>Confirmo: consumir 1 sessão</strong></span></label><span class="erro" id="confirmacao-erro"></span>
      <p class="ajuda">Agendamento, falta, aprovação ou pagamento não consomem sessão.</p><div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Voltar</a><button type="submit" class="btn btn-cheio" id="confirmar">Registrar sessão</button>` });
  $('#corpo').classList.add('fin-compacto');
  listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: 62, abaixo: 82 + 150, rotulo: 'atendimentos', buscar: (pg, lim) => api('or_candidatos', { query: { item: i.id, pagina: pg, limite: lim } }),
    desenhar: (x) => x.total ? x.itens.map(a => `<li><label class="opcao opcao-lote"><input type="radio" name="agendamento_id" value="${esc(a.id)}" data-data="${a.data}"><span><strong>${dataBR(a.data)} · ${esc(a.profissional_nome)}</strong><small>${esc(a.servico_nome)}${a.reservado ? ' · reservado por este pacote' : ''}${p.prazo_uso && a.data > p.prazo_uso ? ' · após o prazo' : ''}</small></span></label></li>`).join('')
      : '<li class="vazio vazio-curto"><p>Nenhum atendimento realizado deste serviço para a cliente. Conclua o atendimento na agenda primeiro.</p></li>' }).carregar();
  form.addEventListener('change', (e) => { if (e.target.name === 'agendamento_id') $('#caixa-just').hidden = !(p.prazo_uso && e.target.dataset.data > p.prazo_uso); });
  let env = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (env) return; const er = {};
    const a = form.querySelector('[name=agendamento_id]:checked');
    if (!a) er.agendamento_id = 'Escolha o atendimento.';
    if (!$('#caixa-just').hidden && form.justificativa.value.trim().length < 3) er.justificativa = 'Informe a justificativa.';
    if (!form.confirmacao.checked) er.confirmacao = 'Marque a confirmação.';
    if (!mostrarErros(form, er)) { if (er.agendamento_id) $('#agendamento_id-erro').textContent = er.agendamento_id; return; }
    env = true; $('#confirmar').disabled = true;
    const rr = await api('or_sessao', { corpo: { chave_envio: lerRasc(ch).chave, item_id: i.id, agendamento_id: a.value, justificativa: form.justificativa.value } });
    if (rr.ok) { apagarRasc(ch); recado.pôr('Sessão registrada.'); location.replace(volta); return; }
    env = false; $('#confirmar').disabled = false;
    if (rr.erros) mostrarErros(form, rr.erros);
    $('#aviso').innerHTML = avisoHTML(esc(rr.erros ? Object.values(rr.erros).join(' ') : rr.msg), 'erro');
  };
  focarTitulo();
}
async function telaUsos() {
  const item = params.get('item'), pac = params.get('pacote');
  let volta = BASE + 'pacotes/';
  if (item) volta = `${BASE}pacote/item/?id=${encodeURIComponent(item)}`; else if (pac) volta = `${BASE}pacote/?id=${encodeURIComponent(pac)}`;
  const msg = recado.tirar();
  pagina({ titulo: 'Histórico de utilização', voltar: volta, voltarTexto: 'Voltar', corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<p class="ajuda">Nada é apagado: correções são estornos com motivo.</p><ul class="lista" id="lista" aria-label="Sessões"></ul>${navPaginas('nav')}`, acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar</a>` });
  listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: 74, abaixo: 82 + 52, rotulo: 'sessões', buscar: (pg, lim) => api('or_usos', { query: { ...(item ? { item } : { pacote: pac }), pagina: pg, limite: lim } }),
    desenhar: (r) => r.total ? r.itens.map(u => `<li class="item${u.estornado ? ' item-inativo' : ''}"><div class="item-info"><div class="item-nome">${esc(u.servico_nome)} · ${dataBR(u.data)}${u.estornado ? ' · estornada' : ''}</div>
      <div class="item-extra">${esc(u.profissional_nome || '')} · ${esc(u.responsavel || 'login pendente')}${u.excecao_prazo ? ' · exceção de prazo' : ''}${u.estornado ? ' · ' + esc(u.estorno_motivo) : ''}</div></div>
      <a class="btn btn-linha" href="${BASE}pacote/uso/?id=${encodeURIComponent(u.id)}" aria-label="Abrir sessão de ${dataBR(u.data)}">Abrir</a></li>`).join('') : '<li class="vazio vazio-curto"><p>Nenhuma sessão registrada.</p></li>' }).carregar();
  focarTitulo();
}
async function telaUso() {
  carregando('Sessão');
  const r = await api('or_uso_ver', { id: params.get('id') }); if (!r.ok) return telaErro('Sessão', r.msg, BASE + 'pacotes/');
  const u = r.uso; const msg = recado.tirar();
  pagina({ titulo: 'Sessão registrada', voltar: `${BASE}pacote/usos/?item=${encodeURIComponent(u.item_id)}`, voltarTexto: 'Histórico',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}${u.estornado ? avisoHTML(`Estornada: ${esc(u.estorno_motivo)} (${esc(u.estornado_por || 'login pendente')}). O registro original continua no histórico.`) : ''}
      <div class="resumo">${blocoResumo(u.servico_nome, [['Cliente', u.cliente_nome], ['Pacote', u.titulo], ['Data efetiva', dataBR(u.data)], ['Profissional', u.profissional_nome], ['Registrado por', u.responsavel || 'login pendente'], ...(u.excecao_prazo ? [['Exceção de prazo', u.justificativa]] : [])])}</div>
      <nav class="acoes-grade" aria-label="Ações"><a class="btn btn-suave" href="${AG}atendimento/?id=${encodeURIComponent(u.agendamento_id)}">Atendimento</a>${u.estornado ? '' : `<a class="btn btn-perigo" href="${BASE}pacote/estorno/?id=${encodeURIComponent(u.id)}">Estornar</a>`}</nav>` });
  focarTitulo();
}
async function telaEstorno() {
  carregando('Estornar sessão');
  const r = await api('or_uso_ver', { id: params.get('id') }); if (!r.ok) return telaErro('Estornar sessão', r.msg);
  const u = r.uso; const volta = `${BASE}pacote/uso/?id=${encodeURIComponent(u.id)}`;
  if (u.estornado) return telaErro('Estornar sessão', 'Esta sessão já foi estornada.', volta);
  formConfirmar({ titulo: 'Estornar sessão?', volta, perigo: true, cab: `<div class="bloco"><h2>${esc(u.servico_nome)} · ${dataBR(u.data)}</h2><p class="ajuda">${esc(u.cliente_nome)} · ${esc(u.titulo)}</p></div>`,
    aviso: 'A sessão volta ao saldo; o registro original fica no histórico, marcado como estornado. <strong>Não devolve dinheiro.</strong>', campos: campoTexto({ id: 'motivo', rotulo: 'Motivo', attrs: 'maxlength="300" autocomplete="off"' }), botao: 'Estornar',
    enviar: async (f) => { const rr = await api('or_estornar', { corpo: { id: u.id, motivo: f.motivo.value, confirmacao: true } }); if (rr.ok) { recado.pôr('Sessão estornada. Saldo recomposto.'); location.replace(volta); } return rr; } });
}
async function telaEncerrar() {
  carregando('Encerrar pacote');
  const r = await api('or_pacote_ver', { id: params.get('id') }); if (!r.ok) return telaErro('Encerrar pacote', r.msg);
  const p = r.pacote; const volta = `${BASE}pacote/?id=${encodeURIComponent(p.id)}`;
  if (p.situacao !== 'ativo') return telaErro('Encerrar pacote', 'Pacote já encerrado.', volta);
  formConfirmar({ titulo: 'Encerrar pacote?', volta, perigo: true, cab: `<div class="bloco"><h2>${esc(p.cliente_nome)}</h2><p class="ajuda">${esc(p.titulo)} · ${p.disponivel} sessão(ões) disponível(is) · ${p.reservadas} reservada(s)</p></div>`,
    aviso: 'O pacote deixa de aceitar reservas e registros; o histórico fica guardado. Reservas já feitas continuam na agenda (trate-as por lá). <strong>Não devolve dinheiro.</strong>', campos: campoTexto({ id: 'motivo', rotulo: 'Motivo', attrs: 'maxlength="300" autocomplete="off"' }), botao: 'Encerrar pacote',
    enviar: async (f) => { const rr = await api('or_encerrar', { corpo: { id: p.id, motivo: f.motivo.value, confirmacao: true } }); if (rr.ok) { recado.pôr('Pacote encerrado.'); location.replace(volta); } return rr; } });
}

// ─── roteamento ─────────────────────────────────────────────────────────────
const TELAS = { inicio: telaInicio,
  'p-ident': etapaIdent, 'p-cliente': telaCliente, 'p-itens': etapaItens, 'p-servico': telaServico, 'p-item': telaItem, 'p-condicoes': etapaCondicoes, 'p-inclusao': etapaInclusao, 'p-conferencia': etapaConferencia,
  'm-ident': etapaIdent, 'm-itens': etapaItens, 'm-servico': telaServico, 'm-item': telaItem, 'm-condicoes': etapaCondicoes, 'm-inclusao': etapaInclusao, 'm-conferencia': etapaConferencia,
  proposta: telaProposta, 'proposta-itens': telaPropostaItens, aprovar: () => telaAcaoProposta('aprovar'), recusar: () => telaAcaoProposta('recusar'), cancelar: () => telaAcaoProposta('cancelar'),
  whatsapp: telaWhatsapp, historico: telaHistorico, receita: telaReceita, modelos: telaModelos, modelo: telaModelo,
  pacotes: telaPacotes, pacote: telaPacote, 'pacote-financeiro': telaPacoteFinanceiro, item: telaItemPacote, 'agendar-sessao': telaAgendarSessao, sessao: telaSessao, usos: telaUsos, uso: telaUso, estorno: telaEstorno, encerrar: telaEncerrar };
(async () => {
  const pg = document.body.dataset.pagina;
  if (eid() && /-(itens|servico|item|condicoes|inclusao|conferencia)$/.test(pg) && !ler()) { carregando('Carregando'); if (!(await preparar())) return; }
  (TELAS[pg] || telaInicio)();
})();
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
