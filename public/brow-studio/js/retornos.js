// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — RETORNOS E RETOQUES (10/11/2026)
// Cada página tem rota própria. Rascunho: "rt:novo" ou "rt:<id>" (edição).
// Planejar não reserva horário: "Agendar retorno" usa o fluxo da Agenda, que
// consulta a disponibilidade real e só então vincula a reserva.
// Nenhum prazo clínico é sugerido; nada é enviado automaticamente.
// ═══════════════════════════════════════════════════════════════════════════
import { $, params, esc, uuid, lerRasc, gravarRasc, apagarRasc, api, SETA, pagina, campoTexto, grupoOpcoes,
  mostrarErros, avisoHTML, focarTitulo, ir, blocoResumo } from './comum.js?v=2';

const BASE = '/brow-studio/retornos/';
const N = BASE + 'novo/';
const AG = '/brow-studio/agenda/';
const TIPOS = { avaliacao: 'Avaliação', manutencao: 'Manutenção', retoque: 'Retoque' };
const COBRANCAS = { a_definir: 'A definir', sem_cobranca: 'Sem cobrança', cobrado: 'Cobrado' };
const SITUACOES = { pendente: 'Pendente', encaixe: 'Aguardando encaixe', agendado: 'Agendado', concluido: 'Concluído', cancelado: 'Cancelado' };
const FILTROS = { todos: 'Todos', pendentes: 'Pendentes', agendados: 'Agendados', concluidos: 'Concluídos', cancelados: 'Cancelados', ultrapassada: 'Data ultrapassada' };
const DDD = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
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

// ─── formatos ───────────────────────────────────────────────────────────────
const dataBR = (s) => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '';
const dataCurta = (s) => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '';
const diaSemana = (s) => DIAS[new Date(s + 'T12:00:00Z').getUTCDay()];
const digitos = (v) => String(v || '').replace(/\D/g, '');
const foneValido = (d) => (d.length === 10 || d.length === 11) && DDD.has(d.slice(0, 2)) && (d.length === 11 ? d[2] === '9' : /[2-5]/.test(d[2]));
function fone(v) { const d = digitos(v); if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; return v || ''; }
const RE_VALOR = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/;
function centavos(v) { let s = String(v || '').trim().replace(/^R\$\s*/i, '').replace(/\s/g, ''); if (!s || !RE_VALOR.test(s)) return null; const [i, d = ''] = s.replace(/\./g, '').split(','); const n = parseInt(i, 10) * 100 + parseInt((d + '00').slice(0, 2), 10); return Number.isSafeInteger(n) && n <= 100000000 ? n : null; }
function reais(c) { const s = String(Math.max(0, c | 0)).padStart(3, '0'); return `R$ ${s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${s.slice(-2)}`; }
const curto = (t) => { const n = window.innerWidth < 600 ? (window.innerHeight < 700 ? 24 : 40) : 140; return t && t.length > n ? t.slice(0, n).trimEnd() + '…' : t; };
const valorTexto = (c) => reais(c).replace('R$ ', '');
const seloSit = (x) => `<span class="selo selo-rt-${x.situacao}">${SITUACOES[x.situacao]}</span>${x.ultrapassada ? ' <span class="selo selo-fin-vencido">Data ultrapassada</span>' : ''}`;
const cobrancaTexto = (x) => x.cobranca === 'cobrado' ? `Cobrado · ${reais(x.valor_centavos)}` : COBRANCAS[x.cobranca];
function horarioTexto(x) {
  if (x.reserva && x.reserva.ativa) return `${dataBR(x.reserva.data)}, ${x.reserva.inicio} às ${x.reserva.fim} · ${x.reserva.profissional}`;
  if (x.reserva && x.reserva.situacao === 'concluido') return `${dataBR(x.reserva.data)}, ${x.reserva.inicio} (concluído na agenda)`;
  if (x.situacao === 'encaixe') return `Lista de encaixe de ${dataBR(x.encaixe.data)} (${x.encaixe.ordem}º) — sem horário garantido`;
  return 'Sem horário reservado';
}

// ═══════════════════════════ LISTA ═════════════════════════════════════════
async function telaLista() {
  const msg = recado.tirar();
  const cliente = params.get('cliente') || '', origem = params.get('origem') || '';
  let filtro = FILTROS[params.get('f')] ? params.get('f') : 'todos';
  const planejar = `${N}?novo=1${origem ? '&origem=' + encodeURIComponent(origem) : ''}${cliente ? '&cliente=' + encodeURIComponent(cliente) : ''}`;
  const voltar = origem ? `${AG}atendimento/documentos/?id=${encodeURIComponent(origem)}` : cliente ? `/brow-studio/clientes/perfil/?id=${encodeURIComponent(cliente)}` : '/brow-studio/profissional.html';
  pagina({
    titulo: 'Retornos e retoques', voltar, voltarTexto: origem ? 'Atendimento' : cliente ? 'Cliente' : 'Voltar',
    extra: `<a class="btn btn-cheio btn-topo" href="${planejar}" aria-label="Planejar retorno">+ Planejar<span class="so-largo">&nbsp;retorno</span></a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      ${cliente || origem ? `<p class="ajuda" id="escopo">${origem ? 'Acompanhamentos deste atendimento' : 'Acompanhamentos desta cliente'} · <a href="${BASE}">ver todos</a></p>` : `<form class="busca" role="search" id="form-busca"><div class="campo"><label for="q">Buscar por cliente</label><input id="q" type="search" autocomplete="off" value="${esc(params.get('q') || '')}"></div></form>`}
      <div class="filtros-chips chips-3" role="radiogroup" aria-label="Filtrar">${Object.entries(FILTROS).map(([v, t]) => `<label class="opcao opcao-chip"><input type="radio" name="f" value="${v}" ${v === filtro ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
      <ul class="lista" id="lista" aria-label="Retornos"></ul>${navPaginas('nav')}`
  });
  const L = listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: window.innerHeight <= 760 ? 76 : 84, abaixo: 72, rotulo: 'retornos',
    buscar: (pg, lim) => api('rt_listar', { query: { q: $('#q') ? $('#q').value.trim() : '', cliente, origem, filtro, pagina: pg, limite: lim } }),
    desenhar: (r) => {
      const u = new URL(location.href); const t = $('#q') ? $('#q').value.trim() : ''; t ? u.searchParams.set('q', t) : u.searchParams.delete('q'); filtro !== 'todos' ? u.searchParams.set('f', filtro) : u.searchParams.delete('f'); history.replaceState(null, '', u);
      return r.total ? r.itens.map(x => `<li class="item"><div class="item-info"><div class="item-nome">${esc(x.cliente_nome)} <small>· ${esc(x.tipo_nome)}</small></div>
          <div class="item-extra item-extra-quebra">${esc(x.origem_servico_nome)} · prevista ${dataCurta(x.data_prevista)} · ${esc(x.profissional_nome || '')} <span class="selos">${seloSit(x)}</span></div></div>
          <a class="btn btn-linha" href="${BASE}ver/?id=${encodeURIComponent(x.id)}" aria-label="Abrir ${esc(x.tipo_nome)} de ${esc(x.cliente_nome)}">Abrir</a></li>`).join('')
        : `<li class="vazio"><span class="avatar grande" aria-hidden="true">✦</span><h2>${t || filtro !== 'todos' ? 'Nenhum retorno encontrado' : 'Nenhum retorno planejado'}</h2><p>${t || filtro !== 'todos' ? 'Tente outra busca ou filtro.' : 'Toque em “Planejar retorno” a partir de um atendimento realizado.'}</p></li>`;
    } });
  if ($('#q')) { let e; $('#q').addEventListener('input', () => { clearTimeout(e); e = setTimeout(L.reiniciar, 300); }); $('#form-busca').onsubmit = (ev) => { ev.preventDefault(); L.reiniciar(); }; }
  app.querySelectorAll('[name=f]').forEach(i => i.onchange = () => { filtro = i.value; L.reiniciar(); });
  L.carregar(); focarTitulo();
}

// ═══════════════════════════ PLANEJAMENTO (4 etapas; edição em 3) ══════════
const rid = () => params.get('id') || '';
const chave = () => rid() ? 'rt:' + rid() : 'rt:novo';
const ler = () => lerRasc(chave());
const guardar = (m) => gravarRasc(chave(), { ...ler(), ...m });
const qs = (semConf) => { const u = new URLSearchParams(); if (rid()) u.set('id', rid()); if (!semConf && params.get('conf') === '1') u.set('conf', '1'); const s = u.toString(); return s ? '?' + s : ''; };
const conf = () => params.get('conf') === '1';
const titulo = () => rid() ? 'Editar retorno' : 'Planejar retorno';
const total = () => rid() ? 3 : 4;
const etapa = (n) => rid() ? n - 1 : n;
function rodape(voltar, prox, cancelar) {
  return `${cancelar ? `<a class="btn btn-linha" href="${voltar}" id="cancelar">Cancelar</a>` : `<a class="btn btn-linha" href="${voltar}">${SETA} Voltar</a>`}<button type="submit" class="btn btn-cheio">${conf() ? 'Voltar à conferência' : (prox || 'Próximo <span aria-hidden="true">→</span>')}</button>`;
}
const irProx = (dest) => ir(conf() ? N + 'conferencia/' + qs(true) : dest);
async function preparar() {
  if (params.get('novo') === '1' && !rid()) {
    apagarRasc('rt:novo');
    const u = new URL(location.href); u.searchParams.delete('novo'); history.replaceState(null, '', u);
  }
  let d = ler(); if (d) return d;
  if (rid()) {
    const r = await api('rt_ver', { id: rid() });
    if (!r.ok) { telaErro(titulo(), r.msg); return null; }
    const x = r.retorno;
    if (['concluido', 'cancelado'].includes(x.situacao)) { telaErro(titulo(), 'Acompanhamento encerrado não pode ser alterado.', `${BASE}ver/?id=${encodeURIComponent(x.id)}`); return null; }
    d = { tipo: x.tipo, origem: { id: x.origem_agendamento_id, cliente_id: x.cliente_id, cliente_nome: x.cliente_nome, servico_nome: x.origem_servico_nome, data: x.origem_data, profissional_nome: x.profissional_nome, telefone_cadastro: r.cliente.telefone },
      data_prevista: x.data_prevista, whatsapp: fone(x.whatsapp || r.cliente.telefone || ''), atualizar_cadastro: false, servico_retorno_id: x.servico_retorno_id || '', servico_retorno_nome: x.servico_retorno_nome || '',
      cobranca: x.cobranca, valor: x.valor_centavos ? valorTexto(x.valor_centavos) : '', politica: x.politica || '', politica_versao: x.politica_versao || '', observacoes: x.observacoes || '', motivo: '' };
  } else d = { chave_envio: uuid(), tipo: '', origem: null, filtro_cliente: params.get('cliente') || '', data_prevista: '', whatsapp: '', atualizar_cadastro: false, servico_retorno_id: '', servico_retorno_nome: '',
    cobranca: 'a_definir', valor: '', politica: '', politica_versao: '', observacoes: '' };
  gravarRasc(chave(), d); return d;
}
async function definirOrigem(id) {
  const r = await api('rt_origens', { query: { id, limite: 1 } });
  if (!r.ok || !r.itens.length) return false;
  const o = r.itens[0];
  const d = ler();
  guardar({ origem: { id: o.id, cliente_id: o.cliente_id, cliente_nome: o.cliente_nome, servico_id: o.servico_id, servico_nome: o.servico_nome, data: o.data, profissional_id: o.profissional_id, profissional_nome: o.profissional_nome, telefone_cadastro: o.telefone_cadastro },
    whatsapp: d.origem && d.origem.id === o.id && d.whatsapp ? d.whatsapp : fone(o.telefone_cadastro || o.whatsapp || ''), data_prevista: d.origem && d.origem.id === o.id ? d.data_prevista : '' });
  return true;
}
async function etapaOrigemTipo() {
  if (rid()) return ir(N + 'data/' + qs());
  let d = await preparar(); if (!d) return;
  if (params.get('origem') && (!d.origem || d.origem.id !== params.get('origem'))) {
    if (!(await definirOrigem(params.get('origem')))) return telaErro('Planejar retorno', 'Este atendimento não está como realizado (concluído) na agenda. Conclua o atendimento antes de planejar o retorno.', `${AG}atendimento/?id=${encodeURIComponent(params.get('origem'))}`);
    d = ler();
  }
  const o = d.origem;
  const form = pagina({
    titulo: titulo(), etapa: 1, etapasTotal: 4, formulario: true, voltar: BASE, voltarTexto: 'Retornos',
    corpo: `<p class="etapa" style="margin-top:-8px">Atendimento original</p>
      ${o ? `<section class="bloco origem"><div class="bloco-topo"><h2>${esc(o.cliente_nome)}</h2><a class="corrigir" href="${N}atendimento/">Trocar</a></div>
          <dl class="dados"><dt>Serviço</dt><dd>${esc(o.servico_nome)}</dd><dt>Data</dt><dd>${dataBR(o.data)}</dd><dt>Profissional</dt><dd>${esc(o.profissional_nome)}</dd></dl></section>`
        : `<div class="pessoa-escolha"><span class="ajuda">Nenhum atendimento escolhido</span><a class="btn btn-suave" href="${N}atendimento/" id="escolher">Escolher atendimento</a></div><span class="erro" id="origem-erro" aria-live="polite"></span>`}
      ${grupoOpcoes({ nome: 'tipo', legenda: 'Tipo de acompanhamento', opcoes: TIPOS, valor: d.tipo, colunas: 3 })}
      <div id="aviso"></div>`,
    acoes: rodape(BASE, null, true)
  });
  $('#corpo').classList.add('fin-compacto');
  $('#cancelar').onclick = () => apagarRasc('rt:novo');
  form.addEventListener('change', () => guardar({ tipo: (form.querySelector('[name=tipo]:checked') || {}).value || '' }));
  form.onsubmit = async (ev) => {
    ev.preventDefault(); const er = {}; const tipo = (form.querySelector('[name=tipo]:checked') || {}).value;
    if (!ler().origem) er.origem = 'Escolha o atendimento original.';
    if (!tipo) er.tipo = 'Escolha o tipo.';
    if (!mostrarErros(form, er)) { if (er.origem && $('#origem-erro')) $('#origem-erro').textContent = er.origem; return; }
    const ab = await api('rt_aberto', { query: { origem: ler().origem.id, tipo } });
    if (ab.ok && ab.id) {
      $('#aviso').innerHTML = avisoHTML(`Já existe <strong>${TIPOS[tipo].toLowerCase()}</strong> aberto para este atendimento. Para não duplicar, abra o existente.`, 'erro', `<div class="linha-acoes"><a class="btn btn-cheio" href="${BASE}ver/?id=${encodeURIComponent(ab.id)}">Abrir acompanhamento</a></div>`);
      return;
    }
    guardar({ tipo }); irProx(N + 'data/');
  };
  focarTitulo();
}
async function telaOrigem() {
  const d = ler(); if (!d) return ir(N);
  pagina({
    titulo: 'Atendimento original', voltar: N, voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Atendimentos realizados (concluídos na agenda)</p>
      ${d.filtro_cliente ? '' : '<form class="busca" role="search" id="form-busca"><div class="campo"><label for="q">Buscar por cliente</label><input id="q" type="search" autocomplete="off"></div></form>'}
      <ul class="lista" id="lista" aria-label="Atendimentos realizados"></ul>${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${N}">${SETA} Voltar</a>`
  });
  const L = listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: 74, abaixo: 82 + 52, rotulo: 'atendimentos',
    buscar: (pg, lim) => api('rt_origens', { query: { q: $('#q') ? $('#q').value.trim() : '', cliente: d.filtro_cliente || '', pagina: pg, limite: lim } }),
    desenhar: (r) => r.total ? r.itens.map(x => `<li class="item"><div class="item-info"><div class="item-nome">${esc(x.cliente_nome)}</div><div class="item-extra">${esc(x.servico_nome)} · ${dataBR(x.data)} · ${esc(x.profissional_nome)}</div></div>
        <button type="button" class="btn btn-linha" data-id="${esc(x.id)}" aria-label="Escolher ${esc(x.servico_nome)} de ${esc(x.cliente_nome)} em ${dataBR(x.data)}">Escolher</button></li>`).join('')
      : '<li class="vazio vazio-curto"><p>Nenhum atendimento realizado encontrado. O retorno parte de um atendimento concluído na agenda.</p></li>' });
  $('#lista').addEventListener('click', async (e) => { const b = e.target.closest('[data-id]'); if (!b) return; b.disabled = true; if (await definirOrigem(b.dataset.id)) ir(N); else b.disabled = false; });
  if ($('#q')) { let t; $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(L.reiniciar, 300); }); $('#form-busca').onsubmit = (e) => { e.preventDefault(); L.reiniciar(); }; }
  L.carregar(); focarTitulo();
}
async function etapaData() {
  const d = await preparar(); if (!d) return;
  if (!d.origem || (!rid() && !d.tipo)) return ir(N);
  const sv = await api('servicos_listar', { query: { ativos: '1', limite: 50 } });
  const servs = sv.ok ? sv.itens : [];
  const cad = d.origem.telefone_cadastro || '';
  const form = pagina({
    titulo: titulo(), etapa: etapa(2), etapasTotal: total(), formulario: true, voltar: rid() ? `${BASE}ver/?id=${encodeURIComponent(rid())}` : N + qs(true), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Data e contato · ${esc(d.origem.cliente_nome)} · ${TIPOS[d.tipo]}</p>
      ${campoTexto({ id: 'data_prevista', rotulo: 'Data prevista do retorno', valor: d.data_prevista, tipo: 'date', attrs: `min="${d.origem.data}"`, ajuda: `Definida pela profissional. A partir de ${dataBR(d.origem.data)} (atendimento original).` })}
      ${campoTexto({ id: 'whatsapp', rotulo: 'WhatsApp com DDD', valor: d.whatsapp, tipo: 'tel', opcional: true, attrs: 'inputmode="tel" autocomplete="off" maxlength="16" placeholder="(11) 98888-7777"' })}
      <label class="marcar" id="caixa-atualizar" ${digitos(d.whatsapp) && digitos(d.whatsapp) !== cad ? '' : 'hidden'}><input type="checkbox" name="atualizar_cadastro" ${d.atualizar_cadastro ? 'checked' : ''}> Atualizar também o cadastro da cliente${cad ? ` (hoje ${esc(fone(cad))})` : ''}</label>
      <div class="campo"><label for="servico_retorno_id">Serviço do retorno <span class="opcional">(opcional; define duração ao agendar)</span></label>
        <select id="servico_retorno_id" name="servico_retorno_id"><option value="">Escolher ao agendar</option>${servs.map(s => `<option value="${esc(s.id)}" ${s.id === d.servico_retorno_id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select></div>
      <p class="ajuda">Planejar <strong>não reserva horário</strong> na agenda. Nenhum prazo é sugerido automaticamente.</p><div id="aviso"></div>`,
    acoes: rodape(rid() ? `${BASE}ver/?id=${encodeURIComponent(rid())}` : N + qs(true), null, !!rid())
  });
  $('#corpo').classList.add('fin-compacto');
  if ($('#cancelar')) $('#cancelar').onclick = () => apagarRasc(chave());
  const lerForm = () => { const sel = form.servico_retorno_id; return { data_prevista: form.data_prevista.value, whatsapp: form.whatsapp.value, atualizar_cadastro: form.atualizar_cadastro.checked, servico_retorno_id: sel.value, servico_retorno_nome: sel.value ? sel.options[sel.selectedIndex].text : '' }; };
  const at = () => { const v = lerForm(); const dg = digitos(v.whatsapp); $('#caixa-atualizar').hidden = !(dg && dg !== cad); if ($('#caixa-atualizar').hidden) { form.atualizar_cadastro.checked = false; v.atualizar_cadastro = false; } guardar(v); };
  form.addEventListener('input', at); form.addEventListener('change', at);
  form.onsubmit = (ev) => {
    ev.preventDefault(); const v = lerForm(); const er = {};
    if (!v.data_prevista) er.data_prevista = 'Informe a data prevista.'; else if (v.data_prevista < d.origem.data) er.data_prevista = 'Não pode ser anterior ao atendimento original.';
    const dg = digitos(v.whatsapp); if (dg && !foneValido(dg)) er.whatsapp = 'WhatsApp inválido. Use DDD + número.';
    if (!mostrarErros(form, er)) return;
    guardar(v); irProx(N + 'valor/' + qs());
  };
  focarTitulo();
}
function etapaValor() {
  const d = ler(); if (!d || !d.data_prevista) return ir(N + 'data/' + qs());
  const form = pagina({
    titulo: titulo(), etapa: etapa(3), etapasTotal: total(), formulario: true, voltar: N + 'data/' + qs(true), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Valor e observações</p>
      ${grupoOpcoes({ nome: 'cobranca', legenda: 'Cobrança', opcoes: COBRANCAS, valor: d.cobranca, colunas: 3 })}
      <div id="caixa-valor" ${d.cobranca === 'cobrado' ? '' : 'hidden'}>${campoTexto({ id: 'valor', rotulo: 'Valor (R$)', valor: d.valor, attrs: 'inputmode="decimal" autocomplete="off" placeholder="Ex.: 150,00" maxlength="13"' })}</div>
      <div class="duas-colunas">${campoTexto({ id: 'politica', rotulo: 'Política comercial aplicada', valor: d.politica, opcional: true, attrs: 'maxlength="200" autocomplete="off"' })}${campoTexto({ id: 'politica_versao', rotulo: 'Versão', valor: d.politica_versao, opcional: true, attrs: 'maxlength="40" autocomplete="off"' })}</div>
      <div class="campo"><label for="observacoes">Observações <span class="opcional">(opcional)</span></label><textarea id="observacoes" name="observacoes" maxlength="1000" rows="2" class="curta">${esc(d.observacoes || '')}</textarea></div>
      <p class="ajuda">Nenhum valor, desconto ou gratuidade é preenchido automaticamente.</p>`,
    acoes: rodape(N + 'data/' + qs(true), 'Conferência <span aria-hidden="true">→</span>')
  });
  $('#corpo').classList.add('fin-compacto');
  const lerForm = () => ({ cobranca: (form.querySelector('[name=cobranca]:checked') || {}).value || '', valor: form.valor.value, politica: form.politica.value, politica_versao: form.politica_versao.value, observacoes: form.observacoes.value });
  const at = () => { const v = lerForm(); $('#caixa-valor').hidden = v.cobranca !== 'cobrado'; guardar(v); };
  form.addEventListener('input', at); form.addEventListener('change', at);
  form.onsubmit = (ev) => {
    ev.preventDefault(); const v = lerForm(); const er = {};
    if (!v.cobranca) er.cobranca = 'Escolha a cobrança.';
    if (v.cobranca === 'cobrado' && !centavos(v.valor)) er.valor = 'Informe um valor maior que zero. Ex.: 150,00';
    if (!mostrarErros(form, er)) return;
    guardar(v); ir(N + 'conferencia/' + qs(true));
  };
  focarTitulo();
}
async function etapaConferencia() {
  const d = ler(); if (!d || !d.data_prevista || !d.cobranca) return ir(N + qs());
  const corr = (e) => `${N}${e}${rid() ? `?id=${encodeURIComponent(rid())}&conf=1` : '?conf=1'}`;
  const o = d.origem; const dg = digitos(d.whatsapp);
  const form = pagina({
    titulo: titulo(), etapa: total(), etapasTotal: total(), formulario: true, voltar: N + 'valor/' + qs(true), voltarTexto: 'Voltar',
    corpo: `<div class="resumo resumo-ct">
        ${blocoResumo('Acompanhamento', [['Cliente', o.cliente_nome], ['Original', `${curto(o.servico_nome)} · ${dataBR(o.data)}`], ['Tipo', `${TIPOS[d.tipo]} · ${o.profissional_nome}`]], rid() ? null : corr(''))}
        ${blocoResumo('Data e contato', [['Data prevista', dataBR(d.data_prevista)], ['WhatsApp', dg ? fone(dg) + (d.atualizar_cadastro ? ' (atualiza cadastro)' : (dg !== (o.telefone_cadastro || '') ? ' (só neste retorno)' : '')) : ''], ['Serviço', d.servico_retorno_nome || 'Escolher ao agendar']], corr('data/'))}
        ${blocoResumo('Valor e observações', [['Cobrança', d.cobranca === 'cobrado' ? `Cobrado · ${reais(centavos(d.valor))}` : COBRANCAS[d.cobranca]], ['Política', d.politica ? curto(d.politica) + (d.politica_versao ? ` (v. ${d.politica_versao})` : '') : ''], ['Observações', curto(d.observacoes)]], corr('valor/'))}
      </div>
      ${rid() ? campoTexto({ id: 'motivo', rotulo: 'Motivo da alteração', valor: d.motivo || '', attrs: 'maxlength="300" autocomplete="off"' }) : '<p class="ajuda so-largo-bloco">Salvar não reserva horário: use “Agendar retorno” nos detalhes.</p>'}
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${N}valor/${qs(true)}">${SETA} Voltar</a><button type="submit" class="btn btn-cheio" id="salvar">${rid() ? 'Salvar alterações' : 'Salvar planejamento'}</button>`
  });
  $('#corpo').classList.add('fin-compacto');
  if (form.motivo) form.motivo.oninput = () => guardar({ motivo: form.motivo.value });
  let env = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); if (env) return;
    if (rid() && form.motivo.value.trim().length < 3) return mostrarErros(form, { motivo: 'Informe o motivo da alteração.' });
    env = true; const b = $('#salvar'); b.disabled = true; b.textContent = 'Salvando…';
    const r = await api('rt_salvar', { corpo: { id: rid() || undefined, chave_envio: rid() ? undefined : d.chave_envio, origem_agendamento_id: o.id, tipo: d.tipo, data_prevista: d.data_prevista,
      whatsapp: d.whatsapp, atualizar_cadastro: !!d.atualizar_cadastro, servico_retorno_id: d.servico_retorno_id || null, cobranca: d.cobranca, valor: d.valor, politica: d.politica, politica_versao: d.politica_versao,
      observacoes: d.observacoes, motivo: rid() ? form.motivo.value : undefined } });
    if (r.ok) { apagarRasc(chave()); recado.pôr(rid() ? 'Retorno atualizado.' : 'Retorno planejado (sem horário reservado).'); location.replace(`${BASE}ver/?id=${encodeURIComponent(r.id)}`); return; }
    env = false; b.disabled = false; b.textContent = 'Tentar novamente';
    const abrir = r.erro === 'ja_existe' && r.id ? `<div class="linha-acoes"><a class="btn btn-cheio" href="${BASE}ver/?id=${encodeURIComponent(r.id)}">Abrir acompanhamento existente</a></div>` : '';
    $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível salvar.') + (r.erros ? ' ' + esc(Object.values(r.erros).join(' ')) : '') + '<br><small>Os dados continuam aqui.</small>', 'erro', abrir);
  };
  focarTitulo();
}

// ═══════════════════════════ DETALHES ══════════════════════════════════════
async function telaVer() {
  carregando('Retorno');
  const r = await api('rt_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Retorno', r.msg);
  const x = r.retorno; const q = encodeURIComponent(x.id); const msg = recado.tirar();
  const aberto = ['pendente', 'encaixe', 'agendado'].includes(x.situacao);
  const ag = x.reserva && x.reserva.ativa;
  const lancAtivo = r.lancamento && !r.lancamento.cancelado;
  const B = (href, t, cls = 'btn-suave', id = '') => `<a class="btn ${cls}" href="${href}"${id ? ` id="${id}"` : ''}>${t}</a>`;
  const acoes = [];
  if (x.situacao === 'pendente') acoes.push(B(`${BASE}agendar/?id=${q}`, 'Agendar retorno', 'btn-cheio'));
  if (x.situacao === 'encaixe') acoes.push(B(`${AG}encaixes/detalhe/?id=${encodeURIComponent(x.encaixe.id)}`, 'Ver encaixe na agenda', 'btn-cheio'));
  if (x.situacao === 'agendado') {
    if (ag) acoes.push(B(`${AG}atendimento/?id=${encodeURIComponent(x.reserva.id)}`, 'Ver horário na agenda'));
    if (ag && ['agendado', 'confirmado'].includes(x.reserva.situacao)) acoes.push(B(`${AG}atendimento/remarcar/?id=${encodeURIComponent(x.reserva.id)}`, 'Remarcar horário'), B(`${AG}atendimento/cancelar/?id=${encodeURIComponent(x.reserva.id)}`, 'Cancelar só o horário'));
    acoes.push(B(`${BASE}concluir/?id=${q}`, 'Registrar realização', 'btn-cheio'));
  }
  if (aberto) acoes.push(B(`${BASE}whatsapp/?id=${q}`, 'WhatsApp'));
  if (x.cobranca === 'cobrado' && x.situacao !== 'cancelado') acoes.push(lancAtivo ? B(`/brow-studio/financeiro/ver/?id=${encodeURIComponent(r.lancamento.id)}`, 'Abrir receita') : B(`${BASE}receita/?id=${q}`, 'Criar receita'));
  if (x.registro_id) acoes.push(B(`/brow-studio/registros/ver/?id=${encodeURIComponent(x.registro_id)}`, 'Registro do retorno'));
  if (aberto) acoes.push(B(`${N}data/?id=${q}`, 'Editar planejamento', 'btn-suave', 'editar'));
  acoes.push(B(`${BASE}historico/?id=${q}`, 'Histórico'));
  acoes.push(B(`${AG}atendimento/?id=${encodeURIComponent(x.origem_agendamento_id)}`, 'Atendimento original'));
  if (aberto) acoes.push(B(`${BASE}cancelar/?id=${q}`, 'Cancelar acompanhamento', 'btn-perigo'));
  const nota = x.situacao === 'pendente' && x.reserva && !x.reserva.ativa ? `O horário de ${dataBR(x.reserva.data)} foi ${x.reserva.situacao === 'falta' ? 'marcado como falta' : 'cancelado'} na agenda. O planejamento continua pendente.`
    : x.situacao === 'agendado' && x.reserva && x.reserva.situacao === 'concluido' ? 'Atendimento concluído na agenda. Registre a realização para concluir o retorno.'
    : x.situacao === 'encaixe' ? 'Na lista de encaixe: o atendimento depende de disponibilidade.' : '';
  pagina({
    titulo: 'Retorno', voltar: BASE, voltarTexto: 'Retornos',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      <div class="servico-cabeca"><h2>${esc(x.cliente_nome)}</h2><span class="selos">${seloSit(x)}</span></div>
      ${x.ultrapassada ? avisoHTML(`Data prevista já passou; continua ${x.situacao === 'encaixe' ? 'no encaixe' : 'pendente'} (nada é cancelado automaticamente).`, 'erro') : ''}
      ${x.situacao === 'cancelado' ? avisoHTML(`Cancelado: ${esc(x.cancel_motivo || '')}. Cancelar não estorna valores automaticamente.`) : ''}
      <div class="resumo resumo-ct">${blocoResumo(`${x.tipo_nome} · prevista ${dataBR(x.data_prevista)}`, [['Original', `${x.origem_servico_nome} · ${dataBR(x.origem_data)} · ${x.profissional_nome}`],
        ['Horário', horarioTexto(x)], ['WhatsApp', fone(x.whatsapp || r.cliente.telefone || '')], ['Cobrança', cobrancaTexto(x)], ...(x.politica ? [['Política', x.politica + (x.politica_versao ? ` (v. ${x.politica_versao})` : '')]] : []), ['Observações', curto(x.observacoes)]])}</div>
      ${nota ? `<p class="ajuda">${esc(nota)}</p>` : ''}
      <nav class="acoes-grade" aria-label="Ações do retorno">${acoes.join('')}</nav>`
  });
  if ($('#editar')) $('#editar').onclick = () => apagarRasc('rt:' + x.id);
  focarTitulo();
}

// ═══════════════════════════ AGENDAR (usa o fluxo da Agenda) ═══════════════
async function telaAgendar() {
  carregando('Agendar retorno');
  const r = await api('rt_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Agendar retorno', r.msg);
  const x = r.retorno; const volta = `${BASE}ver/?id=${encodeURIComponent(x.id)}`;
  if (x.situacao !== 'pendente') return telaErro('Agendar retorno', x.situacao === 'agendado' ? 'Este retorno já tem horário. Use “Remarcar horário”.' : x.situacao === 'encaixe' ? 'Este retorno está na lista de encaixe.' : 'Acompanhamento encerrado.', volta);
  const [cfg, sv] = await Promise.all([api('ag_config_ver'), api('servicos_listar', { query: { ativos: '1', limite: 50 } })]);
  const profs = cfg.ok ? cfg.profissionais.filter(p => p.ativo) : [];
  const servs = sv.ok ? sv.itens : [];
  const form = pagina({
    titulo: 'Agendar retorno', voltar: volta, voltarTexto: 'Retorno', formulario: true,
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(x.cliente_nome)} · ${esc(x.tipo_nome)} · prevista ${dataBR(x.data_prevista)}</p>
      ${grupoOpcoes({ nome: 'profissional_id', legenda: 'Profissional', opcoes: Object.fromEntries(profs.map(p => [p.id, p.nome])), valor: profs.some(p => p.id === x.profissional_id) ? x.profissional_id : '', colunas: 3 })}
      <div class="campo"><label for="servico_id">Serviço do retorno</label><select id="servico_id" name="servico_id"><option value="">Escolha…</option>${servs.map(s => `<option value="${esc(s.id)}" data-dur="${s.duracao_min}" data-int="${s.intervalo_min}" ${s.id === x.servico_retorno_id ? 'selected' : ''}>${esc(s.nome)} · ${s.duracao_min} min${s.intervalo_min ? ' + ' + s.intervalo_min : ''}</option>`).join('')}</select>
        <span class="ajuda">A agenda usa a duração e o intervalo DESTE serviço (não os do atendimento original).</span><span class="erro" id="servico_id-erro" aria-live="polite"></span></div>
      ${avisoHTML('Na próxima tela a Agenda mostra só os horários realmente livres e confere de novo ao salvar. Sem vaga? Dá para colocar na lista de encaixe.')}`,
    acoes: `<a class="btn btn-linha" href="${volta}">Cancelar</a><button type="submit" class="btn btn-cheio">Escolher data e horário <span aria-hidden="true">→</span></button>`
  });
  $('#corpo').classList.add('fin-compacto');
  form.onsubmit = (e) => {
    e.preventDefault(); const er = {};
    const pr = form.querySelector('[name=profissional_id]:checked'); const sel = form.servico_id;
    if (!pr) er.profissional_id = 'Escolha a profissional.';
    if (!sel.value) er.servico_id = 'Escolha o serviço do retorno.';
    if (!mostrarErros(form, er)) return;
    const p = profs.find(z => z.id === pr.value); const s = servs.find(z => z.id === sel.value);
    gravarRasc('ag:novo', { chave_envio: uuid(), cliente_id: x.cliente_id, cliente_nome: x.cliente_nome, whatsapp: digitos(x.whatsapp || r.cliente.telefone || ''), telefone_cadastro: r.cliente.telefone || '', atualizar_cadastro: false,
      profissional_id: p.id, profissional_nome: p.nome, servico_id: s.id, servico_nome: s.nome, data: x.data_prevista >= r.hoje ? x.data_prevista : null, inicio_min: null,
      observacoes: `${x.tipo_nome} do atendimento de ${dataBR(x.origem_data)}`, retorno_id: x.id });
    ir(`${AG}novo/data/`);
  };
  focarTitulo();
}

// ═══════════════════════════ WHATSAPP ══════════════════════════════════════
function modelo(x, estudio) {
  const nome = x.cliente_nome.split(' ')[0]; const tipo = x.tipo_nome.toLowerCase();
  if (x.situacao === 'agendado' && x.reserva && x.reserva.ativa) return `Olá, ${nome}! Aqui é do ${estudio}. Seu ${tipo} está agendado para ${diaSemana(x.reserva.data)}, ${dataCurta(x.reserva.data)}, às ${x.reserva.inicio}, com ${x.reserva.profissional}. Se precisar remarcar, é só avisar.`;
  if (x.situacao === 'encaixe') return `Olá, ${nome}! Aqui é do ${estudio}. Você está na nossa lista de encaixe para o ${tipo} em ${dataCurta(x.encaixe.data)}. O atendimento depende de disponibilidade: avisaremos assim que surgir um horário.`;
  return `Olá, ${nome}! Aqui é do ${estudio}. Está chegando a época do seu ${tipo} (${x.origem_servico_nome}). Vamos combinar um horário? Me diga os dias e horários que ficam melhor para você.`;
}
async function telaWhatsapp() {
  carregando('WhatsApp');
  const r = await api('rt_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('WhatsApp', r.msg);
  const x = r.retorno; const volta = `${BASE}ver/?id=${encodeURIComponent(x.id)}`;
  const pref = r.cliente.contato_pref; const numero = digitos(x.whatsapp || r.cliente.telefone || '');
  const PREF = { ligacao: 'ligação', email: 'e-mail', nenhum: 'não receber contato' };
  const form = pagina({
    titulo: 'WhatsApp', voltar: volta, voltarTexto: 'Retorno', formulario: true,
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(x.cliente_nome)} · ${esc(SITUACOES[x.situacao])}</p>
      ${pref && pref !== 'whatsapp' ? `${avisoHTML(`Preferência de contato da cliente: <strong>${PREF[pref] || pref}</strong>.`, 'erro')}<label class="chave"><input type="checkbox" name="pref_ok"><span><strong>${pref === 'nenhum' ? 'A cliente pediu este contato agora' : 'Mesmo assim, usar o WhatsApp'}</strong></span></label>` : ''}
      ${campoTexto({ id: 'numero', rotulo: 'Número com DDD', valor: fone(numero), tipo: 'tel', attrs: 'inputmode="tel" autocomplete="off" maxlength="16"', ajuda: 'Confira antes de abrir. Para corrigir de vez, use “Editar planejamento”.' })}
      <div class="campo"><label for="mensagem">Mensagem (pode editar)</label><textarea id="mensagem" name="mensagem" maxlength="1000" rows="4" class="curta">${esc(modelo(x, r.estudio))}</textarea></div>
      <p class="ajuda" id="nota" aria-live="polite">Nada é enviado automaticamente. Abrir a conversa não comprova envio, entrega nem confirmação de presença.</p>`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar</a><button type="submit" class="btn btn-cheio" id="abrir">Abrir WhatsApp</button>`
  });
  $('#corpo').classList.add('fin-compacto');
  form.onsubmit = (e) => {
    e.preventDefault(); const er = {};
    const dg = digitos(form.numero.value);
    if (!foneValido(dg)) er.numero = 'Número inválido. Use DDD + número.';
    if (form.pref_ok && !form.pref_ok.checked) { $('#nota').textContent = 'Marque a confirmação sobre a preferência de contato.'; return; }
    if (!form.mensagem.value.trim()) er.mensagem = 'Escreva a mensagem.';
    if (!mostrarErros(form, er)) return;
    window.open(`https://wa.me/55${dg}?text=${encodeURIComponent(form.mensagem.value.trim())}`, '_blank', 'noopener');
    $('#nota').textContent = 'WhatsApp aberto para envio manual. Isso não confirma que a mensagem foi enviada ou lida.';
  };
  focarTitulo();
}

// ═══════════════════════════ CANCELAR / CONCLUIR / RECEITA ═════════════════
async function telaCancelar() {
  carregando('Cancelar acompanhamento');
  const r = await api('rt_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Cancelar acompanhamento', r.msg);
  const x = r.retorno; const volta = `${BASE}ver/?id=${encodeURIComponent(x.id)}`;
  if (!['pendente', 'encaixe', 'agendado'].includes(x.situacao)) return telaErro('Cancelar acompanhamento', 'Este acompanhamento já foi encerrado.', volta);
  const temHorario = (x.reserva && x.reserva.ativa) || x.situacao === 'encaixe';
  const form = pagina({
    titulo: 'Cancelar acompanhamento?', voltar: volta, voltarTexto: 'Retorno', formulario: true,
    corpo: `<div class="bloco"><h2>${esc(x.cliente_nome)} · ${esc(x.tipo_nome)}</h2><p class="ajuda">${esc(horarioTexto(x))}</p></div>
      ${temHorario ? grupoOpcoes({ nome: 'cancelar_horario', legenda: x.situacao === 'encaixe' ? 'E a lista de encaixe?' : 'E o horário reservado na agenda?', opcoes: { sim: x.situacao === 'encaixe' ? 'Tirar da lista de encaixe' : 'Cancelar também o horário', nao: x.situacao === 'encaixe' ? 'Manter na lista' : 'Manter o horário' }, valor: '' }) : ''}
      <div class="campo"><label for="motivo">Motivo</label><input id="motivo" name="motivo" maxlength="300" autocomplete="off"><span class="erro" id="motivo-erro" aria-live="polite"></span></div>
      <label class="chave"><input type="checkbox" name="confirmacao"><span><strong>Confirmo o cancelamento do acompanhamento</strong></span></label><span class="erro" id="confirmacao-erro"></span>
      <p class="ajuda">O registro fica no histórico. Cancelar não estorna valores automaticamente.</p><div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Voltar</a><button type="submit" class="btn btn-perigo-cheio" id="confirmar">Cancelar acompanhamento</button>`
  });
  $('#corpo').classList.add('fin-compacto');
  let env = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (env) return; const er = {};
    const ch = form.querySelector('[name=cancelar_horario]:checked');
    if (temHorario && !ch) er.cancelar_horario = 'Escolha uma opção.';
    if (form.motivo.value.trim().length < 3) er.motivo = 'Informe o motivo.';
    if (!form.confirmacao.checked) er.confirmacao = 'Marque a confirmação.';
    if (!mostrarErros(form, er)) return;
    env = true;
    const rr = await api('rt_cancelar', { corpo: { id: x.id, motivo: form.motivo.value, confirmacao: true, ...(temHorario ? { cancelar_horario: ch.value === 'sim' } : {}) } });
    if (rr.ok) { recado.pôr('Acompanhamento cancelado.'); location.replace(volta); return; }
    env = false; $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível cancelar.'), 'erro');
  };
  focarTitulo();
}
async function telaConcluir() {
  carregando('Registrar realização');
  const r = await api('rt_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Registrar realização', r.msg);
  const x = r.retorno; const volta = `${BASE}ver/?id=${encodeURIComponent(x.id)}`;
  if (['concluido', 'cancelado'].includes(x.situacao)) return telaErro('Registrar realização', 'Este acompanhamento já foi encerrado.', volta);
  const criar = x.reserva && x.reserva.situacao !== 'cancelado' ? `/brow-studio/registros/?agendamento=${encodeURIComponent(x.reserva.id)}` : `/brow-studio/registros/?cliente=${encodeURIComponent(x.cliente_id)}`;
  const form = pagina({
    titulo: 'Registrar realização', voltar: volta, voltarTexto: 'Retorno', formulario: true,
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(x.cliente_nome)} · ${esc(x.tipo_nome)}</p>
      <fieldset class="campo"><legend>Registro do atendimento de retorno</legend><ul class="lista lista-lotes" id="lista" aria-label="Registros"></ul><span class="erro" id="registro_id-erro" aria-live="polite"></span></fieldset>
      ${navPaginas('nav')}
      <p class="ajuda">Não está na lista? <a href="${criar}">Criar o registro do atendimento</a> (técnica, produtos, observações e fotos) e volte aqui.</p>
      <label class="chave"><input type="checkbox" name="confirmacao"><span><strong>Confirmo que o retorno foi realizado</strong></span></label><span class="erro" id="confirmacao-erro"></span>
      <p class="ajuda">Concluir não registra pagamento. O atendimento original continua preservado.</p><div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Voltar</a><button type="submit" class="btn btn-cheio" id="concluir">Concluir retorno</button>`
  });
  $('#corpo').classList.add('fin-compacto');
  listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: 62, abaixo: 82 + 160, rotulo: 'registros',
    buscar: (pg, lim) => api('rt_registros', { query: { id: x.id, pagina: pg, limite: lim } }),
    desenhar: (rr) => rr.total ? rr.itens.map(g => `<li><label class="opcao opcao-lote"><input type="radio" name="registro_id" value="${esc(g.id)}"><span><strong>${esc(g.servico_nome || 'Atendimento')} · ${dataBR(g.data)}</strong><small>${esc(g.profissional_nome || '')} · ${g.situacao === 'finalizado' ? 'finalizado' : 'rascunho'}</small></span></label></li>`).join('')
      : '<li class="vazio vazio-curto"><p>Nenhum registro de atendimento desta cliente (além do original).</p></li>' }).carregar();
  let env = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (env) return; const er = {};
    const g = form.querySelector('[name=registro_id]:checked');
    if (!g) er.registro_id = 'Escolha o registro do atendimento de retorno.';
    if (!form.confirmacao.checked) er.confirmacao = 'Marque a confirmação.';
    if (!mostrarErros(form, er)) { if (er.registro_id) $('#registro_id-erro').textContent = er.registro_id; return; }
    env = true;
    const rr = await api('rt_concluir', { corpo: { id: x.id, registro_id: g.value, confirmacao: true } });
    if (rr.ok) { recado.pôr('Retorno concluído.'); location.replace(volta); return; }
    env = false; $('#aviso').innerHTML = avisoHTML(esc(rr.erros ? Object.values(rr.erros).join(' ') : (rr.msg || 'Não foi possível concluir.')), 'erro');
  };
  focarTitulo();
}
async function telaReceita() {
  carregando('Receita do retorno');
  const r = await api('rt_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Receita do retorno', r.msg);
  const x = r.retorno; const volta = `${BASE}ver/?id=${encodeURIComponent(x.id)}`;
  if (r.lancamento && !r.lancamento.cancelado) return telaErro('Receita do retorno', 'Este retorno já tem receita no financeiro.', volta);
  if (x.cobranca !== 'cobrado') return telaErro('Receita do retorno', x.cobranca === 'sem_cobranca' ? 'Retorno sem cobrança: nenhuma receita é criada.' : 'Cobrança “A definir”: defina o valor em “Editar planejamento” antes.', volta);
  const venc = x.reserva && x.reserva.ativa ? x.reserva.data : r.hoje;
  const form = pagina({
    titulo: 'Criar receita', voltar: volta, voltarTexto: 'Retorno', formulario: true,
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(x.cliente_nome)} · ${esc(x.tipo_nome)} · <strong>${reais(x.valor_centavos)}</strong></p>
      ${campoTexto({ id: 'descricao', rotulo: 'Descrição', valor: `${x.tipo_nome} — ${x.cliente_nome}`, attrs: 'maxlength="120" autocomplete="off"' })}
      ${campoTexto({ id: 'vencimento', rotulo: 'Vencimento', valor: venc, tipo: 'date' })}
      ${avisoHTML('A receita fica <strong>pendente</strong> no financeiro. Nenhum pagamento é registrado aqui. Para mudar o valor, edite o planejamento.')}<div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Cancelar</a><button type="submit" class="btn btn-cheio" id="criar">Criar receita</button>`
  });
  let env = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (env) return; const er = {};
    if (form.descricao.value.trim().length < 2) er.descricao = 'Informe a descrição.';
    if (!form.vencimento.value) er.vencimento = 'Informe o vencimento.';
    if (!mostrarErros(form, er)) return;
    env = true; $('#criar').disabled = true;
    const rr = await api('rt_receita', { corpo: { id: x.id, descricao: form.descricao.value, vencimento: form.vencimento.value } });
    if (rr.ok) { recado.pôr(rr.existente ? 'Já havia receita para este horário: vinculada ao retorno.' : 'Receita criada no financeiro (pendente).'); location.replace(volta); return; }
    env = false; $('#criar').disabled = false;
    $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível criar.'), 'erro', rr.erro === 'ja_existe' && rr.id ? `<div class="linha-acoes"><a class="btn btn-cheio" href="/brow-studio/financeiro/ver/?id=${encodeURIComponent(rr.id)}">Abrir receita</a></div>` : '');
  };
  focarTitulo();
}

// ═══════════════════════════ HISTÓRICO ═════════════════════════════════════
const NOMES = { data_prevista: 'data prevista', whatsapp: 'WhatsApp', servico_retorno_nome: 'serviço do retorno', cobranca: 'cobrança', valor_centavos: 'valor', politica: 'política', politica_versao: 'versão da política', observacoes: 'observações' };
function descrever(h) {
  const d = h.detalhes || {}; const a = d.autor || 'login pendente';
  const T = {
    criado: () => `Planejado: ${TIPOS[d.tipo] || ''}, prevista ${dataBR(d.data_prevista)}${d.atualizou_cadastro ? ' · WhatsApp atualizado no cadastro' : ''}`,
    editado: () => `Alterado (${Object.keys(d.mudancas || {}).map(k => NOMES[k]).filter(Boolean).join(', ') || 'sem mudanças'}) · motivo: ${d.motivo}${d.atualizou_cadastro ? ' · WhatsApp atualizado no cadastro' : ''}`,
    agendado: () => 'Horário reservado na agenda', encaixe: () => 'Colocado na lista de encaixe',
    cancelado: () => `Cancelado · motivo: ${d.motivo}${d.horario_cancelado ? ' · horário/encaixe cancelado na agenda' : d.horario_mantido ? ' · horário mantido na agenda' : ''}`,
    concluido: () => 'Concluído com registro de atendimento', receita_criada: () => `Receita criada (${reais(d.valor)})`, receita_vinculada: () => 'Receita existente vinculada'
  };
  return [(T[h.acao] || (() => h.acao))(), a];
}
async function telaHistorico() {
  const id = params.get('id'); const volta = `${BASE}ver/?id=${encodeURIComponent(id)}`;
  pagina({
    titulo: 'Histórico', voltar: volta, voltarTexto: 'Retorno',
    corpo: `<ul class="lista linha-tempo" id="lista" aria-label="Histórico"></ul>${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar ao retorno</a>`
  });
  listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: 66, abaixo: 82 + 52, rotulo: 'eventos',
    buscar: (pg, lim) => api('rt_historico', { query: { id, pagina: pg, limite: lim } }),
    desenhar: (r) => r.itens.map(h => { const [t, a] = descrever(h); return `<li class="evento"><strong>${esc(t)}</strong><small>${esc(new Date(h.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }))} · ${esc(a)}</small></li>`; }).join('') || '<li class="vazio vazio-curto"><p>Sem eventos.</p></li>' }).carregar();
  focarTitulo();
}

// ─── roteamento ─────────────────────────────────────────────────────────────
const TELAS = { lista: telaLista, novo: etapaOrigemTipo, origem: telaOrigem, data: etapaData, valor: etapaValor, conferencia: etapaConferencia,
  ver: telaVer, agendar: telaAgendar, whatsapp: telaWhatsapp, cancelar: telaCancelar, concluir: telaConcluir, receita: telaReceita, historico: telaHistorico };
(async () => {
  const pg = document.body.dataset.pagina;
  if (rid() && ['valor', 'conferencia'].includes(pg) && !ler()) { carregando('Retorno'); if (!(await preparar())) return; }
  (TELAS[pg] || telaLista)();
})();
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
