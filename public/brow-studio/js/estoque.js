// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — ESTOQUE E MATERIAIS (10/11/2026)
// Cada página tem rota própria. Quantidades em milésimos inteiros (mesma regra
// do servidor). Rascunhos: "es:prod:novo" | "es:prod:<id>" | "es:mov".
// Nada é baixado automaticamente; entrada de estoque não é pagamento.
// ═══════════════════════════════════════════════════════════════════════════
import { $, params, esc, uuid, lerRasc, gravarRasc, apagarRasc, api, SETA, pagina, campoTexto, grupoOpcoes,
  mostrarErros, avisoHTML, focarTitulo, ir, blocoResumo } from './comum.js?v=2';

const BASE = '/brow-studio/estoque/';
const P = BASE + 'produto/';
const M = BASE + 'mov/';
const UNIDADES = { unidade: 'Unidade', frasco: 'Frasco', g: 'g', ml: 'ml' };
const FILTROS = { todos: 'Todos', baixo: 'Estoque baixo', vencidos: 'Vencidos', a_vencer: 'A vencer', arquivados: 'Arquivados' };
const TIPOS_MOV = { entrada: 'Entrada', consumo: 'Consumo', descarte: 'Descarte/perda', ajuste: 'Ajuste' };
const TIPOS_NOME = { saldo_inicial: 'Saldo inicial', entrada: 'Entrada', consumo: 'Consumo em atendimento', descarte: 'Descarte/perda', ajuste: 'Ajuste de inventário', estorno: 'Estorno' };
const ALERTAS = { baixo: ['Estoque baixo', 'alerta'], sem_saldo: ['Sem saldo', 'neutro'], sem_disponivel: ['Nada disponível', 'alerta'], vencido: ['Lote vencido', 'perigo'], a_vencer: ['A vencer', 'alerta'], sem_validade: ['Validade não informada', 'neutro'], bloqueado: ['Lote bloqueado', 'neutro'] };
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
// lista paginada genérica (cabe na tela, autoajuste se passar)
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

// ─── quantidades (milésimos inteiros) e datas ───────────────────────────────
const inteira = (u) => u === 'unidade' || u === 'frasco';
function qtdMil(v, u) {
  const s = String(v == null ? '' : v).trim().replace(/\s/g, '');
  if (!s) return null;
  const re = inteira(u) ? /^(\d{1,3}(\.\d{3})+|\d+)$/ : /^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,3})?$/;
  if (!re.test(s)) return null;
  const [i, d = ''] = s.replace(/\./g, '').split(',');
  const n = parseInt(i, 10) * 1000 + parseInt((d + '000').slice(0, 3), 10);
  return Number.isSafeInteger(n) && n <= 1e12 ? n : null;
}
function milTexto(n, u) {
  n = Number(n) || 0; const neg = n < 0; n = Math.abs(n);
  const i = Math.floor(n / 1000), d = String(n % 1000).padStart(3, '0').replace(/0+$/, '');
  const num = `${neg ? '−' : ''}${String(i).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${d ? ',' + d : ''}`;
  if (u === 'unidade') return `${num} un.`;
  if (u === 'frasco') return `${num} ${i === 1 && !d ? 'frasco' : 'frascos'}`;
  return `${num} ${u}`;
}
const dataBR = (s) => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '';
const erroQtd = (u) => inteira(u) ? 'Use números inteiros.' : 'Até 3 casas decimais, com vírgula.';
const selosAlerta = (al) => (al || []).map(a => ALERTAS[a] ? `<span class="selo-est ${ALERTAS[a][1]}">${ALERTAS[a][0]}</span>` : '').join('');
const descLote = (l) => `${l.identificacao ? 'Lote ' + esc(l.identificacao) : 'Sem lote'} · ${l.validade ? 'val. ' + dataBR(l.validade) : 'sem validade informada'}`;
const selosLote = (l) => `${l.sugerido ? '<span class="selo-est ok">Sugerido: vence primeiro</span>' : ''}${l.vencido ? '<span class="selo-est perigo">Vencido</span>' : ''}${l.a_vencer ? '<span class="selo-est alerta">A vencer</span>' : ''}${l.bloqueado ? '<span class="selo-est neutro">Bloqueado</span>' : ''}${l.sem_validade ? '<span class="selo-est neutro">Validade não informada</span>' : ''}`;
function rodape(voltar, prox, cancelar, conf) {
  return `${cancelar ? `<a class="btn btn-linha" href="${voltar}" id="cancelar">Cancelar</a>` : `<a class="btn btn-linha" href="${voltar}">${SETA} Voltar</a>`}<button type="submit" class="btn btn-cheio">${conf ? 'Voltar à conferência' : (prox || 'Próximo <span aria-hidden="true">→</span>')}</button>`;
}

// ═══════════════════════════ LISTA ═════════════════════════════════════════
async function telaLista() {
  const msg = recado.tirar();
  let filtro = FILTROS[params.get('f')] ? params.get('f') : 'todos';
  pagina({
    titulo: 'Estoque e materiais', voltar: '/brow-studio/profissional.html',
    extra: `<a class="btn btn-cheio btn-topo" href="${P}?novo=1" aria-label="Novo produto">+ Novo<span class="so-largo">&nbsp;produto</span></a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      <form class="busca" role="search" id="form-busca"><div class="campo"><label for="q">Buscar por nome ou marca</label><input id="q" type="search" autocomplete="off" value="${esc(params.get('q') || '')}"></div></form>
      <div class="filtros-chips chips-5" role="radiogroup" aria-label="Filtrar produtos">${Object.entries(FILTROS).map(([v, t]) => `<label class="opcao opcao-chip"><input type="radio" name="f" value="${v}" ${v === filtro ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
      <p class="ajuda" id="cfg"></p>
      <ul class="lista" id="lista" aria-label="Produtos"></ul>${navPaginas('nav')}`
  });
  const L = listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: window.innerHeight <= 760 ? 74 : 82, abaixo: 72, rotulo: 'produtos',
    buscar: (pg, lim) => api('es_listar', { query: { q: $('#q').value.trim(), filtro, pagina: pg, limite: lim } }),
    desenhar: (r) => {
      $('#cfg').innerHTML = `Alerta de validade: ${r.dias_alerta} dias · <a href="${BASE}config/">alterar</a>`;
      const u = new URL(location.href); const t = $('#q').value.trim(); t ? u.searchParams.set('q', t) : u.searchParams.delete('q'); filtro !== 'todos' ? u.searchParams.set('f', filtro) : u.searchParams.delete('f'); history.replaceState(null, '', u);
      return r.total ? r.itens.map(x => `<li class="item${x.arquivado ? ' item-inativo' : ''}"><div class="item-info"><div class="item-nome">${esc(x.nome)}${x.marca ? ` <small>· ${esc(x.marca)}</small>` : ''}</div>
          <div class="item-extra item-extra-quebra">Físico ${esc(x.fisica)} · disponível ${esc(x.disponivel)} <span class="selos">${selosAlerta(x.alertas)}</span></div></div>
          <a class="btn btn-linha" href="${BASE}ver/?id=${encodeURIComponent(x.id)}" aria-label="Abrir ${esc(x.nome)}">Abrir</a></li>`).join('')
        : `<li class="vazio"><span class="avatar grande" aria-hidden="true">✦</span><h2>${t || filtro !== 'todos' ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}</h2><p>${t || filtro !== 'todos' ? 'Tente outra busca ou filtro.' : 'Toque em “Novo produto” para cadastrar materiais e controlar lotes e validades.'}</p></li>`;
    } });
  let e; $('#q').addEventListener('input', () => { clearTimeout(e); e = setTimeout(L.reiniciar, 300); });
  $('#form-busca').onsubmit = (ev) => { ev.preventDefault(); L.reiniciar(); };
  app.querySelectorAll('[name=f]').forEach(i => i.onchange = () => { filtro = i.value; L.reiniciar(); });
  L.carregar(); focarTitulo();
}
async function telaConfig() {
  carregando('Alerta de validade');
  const r = await api('es_config_ver');
  const form = pagina({
    titulo: 'Alerta de validade', voltar: BASE, voltarTexto: 'Estoque', formulario: true,
    corpo: `${campoTexto({ id: 'dias_alerta', rotulo: 'Avisar lotes que vencem em até (dias)', valor: r.ok ? r.dias_alerta : 30, tipo: 'number', attrs: 'min="1" max="365" inputmode="numeric"' })}
      <p class="ajuda">Os alertas usam a data de hoje no fuso do estúdio. Lote sem validade informada aparece com aviso próprio.</p><div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${BASE}">Cancelar</a><button type="submit" class="btn btn-cheio">Salvar</button>`
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const rr = await api('es_config_salvar', { corpo: { dias_alerta: form.dias_alerta.value } });
    if (rr.ok) { recado.pôr('Alerta de validade atualizado.'); location.replace(BASE); return; }
    mostrarErros(form, rr.erros || {}); if (!rr.erros) $('#aviso').innerHTML = avisoHTML(esc(rr.msg), 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ PRODUTO (3 etapas; edição em 2) ═══════════════
const pid = () => params.get('id') || '';
const chP = () => pid() ? 'es:prod:' + pid() : 'es:prod:novo';
const lerP = () => lerRasc(chP());
const guardarP = (m) => gravarRasc(chP(), { ...lerP(), ...m });
const qsP = (semConf) => { const u = new URLSearchParams(); if (pid()) u.set('id', pid()); if (!semConf && params.get('conf') === '1') u.set('conf', '1'); const s = u.toString(); return s ? '?' + s : ''; };
const conf = () => params.get('conf') === '1';
const etapasP = () => pid() ? 2 : 3;
async function prepararProduto() {
  if (params.get('novo') === '1' && !pid()) { apagarRasc('es:prod:novo'); const u = new URL(location.href); u.searchParams.delete('novo'); history.replaceState(null, '', u); }
  let d = lerP(); if (d) return d;
  const cf = await api('es_config_ver'); const hj = cf.ok ? cf.hoje : '';
  if (pid()) {
    const r = await api('es_ver', { id: pid() });
    if (!r.ok) { telaErro('Editar produto', r.msg); return null; }
    const p = r.produto;
    d = { nome: p.nome, marca: p.marca || '', unidade: p.unidade, minimo: milTexto(p.minimo_mil, 'g').replace(' g', ''), movimentos: p.movimentos_total, hoje: hj };
  } else d = { chave_envio: uuid(), nome: '', marca: '', unidade: '', minimo: '0', lote: { quantidade: '0', identificacao: '', sem_lote: false, validade: '', sem_validade: false, fornecedor_id: '', fornecedor_nome: '' }, hoje: hj };
  gravarRasc(chP(), d); return d;
}
async function etapaProduto() {
  const d = await prepararProduto(); if (!d) return;
  const cancelar = pid() ? `${BASE}ver/?id=${encodeURIComponent(pid())}` : BASE;
  const travada = pid() && d.movimentos > 0;
  const form = pagina({
    titulo: pid() ? 'Editar produto' : 'Novo produto', etapa: 1, etapasTotal: etapasP(), formulario: true, voltar: cancelar, voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Identificação</p>
      ${campoTexto({ id: 'nome', rotulo: 'Nome', valor: d.nome, attrs: 'maxlength="100" autocomplete="off"' })}
      ${campoTexto({ id: 'marca', rotulo: 'Marca', valor: d.marca, opcional: true, attrs: 'maxlength="80" autocomplete="off"' })}
      ${travada ? `<div class="campo"><span class="rotulo-campo">Unidade de controle</span><p class="valor-fixo">${UNIDADES[d.unidade]}</p><input type="hidden" name="unidade" value="${d.unidade}"><span class="ajuda">Já há movimentações: a unidade não muda sem um processo de conversão.</span></div>`
        : `<div class="filtros-chips" role="radiogroup" aria-labelledby="un-rot"><span class="rotulo-campo chips-rotulo" id="un-rot">Unidade de controle</span>${Object.entries(UNIDADES).map(([v, t]) => `<label class="opcao opcao-chip"><input type="radio" name="unidade" value="${v}" ${v === d.unidade ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div><span class="erro" id="unidade-erro" aria-live="polite"></span>`}
      ${campoTexto({ id: 'minimo', rotulo: 'Estoque mínimo', valor: d.minimo, attrs: 'inputmode="decimal" autocomplete="off" maxlength="16"', ajuda: 'Avisa quando o disponível chegar a este valor. 0 = sem mínimo.' })}
      ${pid() ? '<p class="ajuda">O saldo não muda por aqui: use “Registrar entrada ou saída”.</p>' : ''}<div id="aviso"></div>`,
    acoes: rodape(cancelar, pid() ? 'Conferência <span aria-hidden="true">→</span>' : null, true, conf())
  });
  $('#corpo').classList.add('fin-compacto');
  $('#cancelar').onclick = () => apagarRasc(chP());
  const lerForm = () => ({ nome: form.nome.value, marca: form.marca.value, unidade: (form.querySelector('[name=unidade]:checked') || form.querySelector('input[type=hidden][name=unidade]') || {}).value || '', minimo: form.minimo.value });
  form.addEventListener('input', () => guardarP(lerForm())); form.addEventListener('change', () => guardarP(lerForm()));
  form.onsubmit = (ev) => {
    ev.preventDefault(); const v = lerForm(); const er = {};
    if (v.nome.trim().length < 2) er.nome = 'Informe o nome.';
    if (!v.unidade) er.unidade = 'Escolha a unidade de controle.';
    else if (qtdMil(v.minimo, v.unidade) === null) er.minimo = 'Informe 0 ou mais. ' + erroQtd(v.unidade);
    if (!pid() && v.unidade && d.lote && qtdMil(d.lote.quantidade, v.unidade) === null) guardarP({ lote: { ...d.lote, quantidade: '0' } });
    if (!mostrarErros(form, er)) return;
    guardarP(v);
    ir(pid() || conf() ? P + 'conferencia/' + qsP(true) : P + 'lote/');
  };
  focarTitulo();
}
function etapaLoteInicial() {
  const d = lerP(); if (!d || !d.nome || pid()) return ir(P + qsP());
  const l = d.lote;
  const form = pagina({
    titulo: 'Novo produto', etapa: 2, etapasTotal: 3, formulario: true, voltar: P + qsP(true), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Lote inicial · ${esc(d.nome)}</p>
      ${campoTexto({ id: 'quantidade', rotulo: `Quantidade inicial (${UNIDADES[d.unidade]})`, valor: l.quantidade, attrs: 'inputmode="decimal" autocomplete="off" maxlength="16"', ajuda: 'Comece em 0 se ainda não tem o produto. ' + erroQtd(d.unidade) })}
      ${camposLote(l)}<div id="aviso"></div>`,
    acoes: rodape(P + qsP(true), null, false, conf())
  });
  $('#corpo').classList.add('fin-compacto');
  ligarCamposLote(form, (v) => guardarP({ lote: { ...lerP().lote, ...v } }), 'prod');
  form.addEventListener('input', () => guardarP({ lote: { ...lerP().lote, quantidade: form.quantidade.value } }));
  form.onsubmit = (ev) => {
    ev.preventDefault(); const v = { ...lerP().lote, quantidade: form.quantidade.value, ...lerCamposLote(form) }; const er = {};
    const qi = qtdMil(v.quantidade || '0', d.unidade);
    if (qi === null) er.quantidade = 'Quantidade inválida. ' + erroQtd(d.unidade);
    else if (qi > 0) Object.assign(er, validarLote(v));
    if (!mostrarErros(form, er)) return;
    guardarP({ lote: v }); ir(P + 'conferencia/');
  };
  focarTitulo();
}
// campos compartilhados de lote (lote inicial e novo lote na entrada)
function camposLote(l, alvo = 'prod') {
  return `<div class="duas-colunas campos-lote">
      <div class="campo"><label for="identificacao">Identificação do lote</label><input id="identificacao" name="identificacao" maxlength="60" autocomplete="off" value="${esc(l.identificacao || '')}" ${l.sem_lote ? 'disabled' : ''}>
        <label class="marcar"><input type="checkbox" name="sem_lote" ${l.sem_lote ? 'checked' : ''}> Sem lote</label><span class="erro" id="identificacao-erro" aria-live="polite"></span></div>
      <div class="campo"><label for="validade">Validade</label><input id="validade" name="validade" type="date" value="${esc(l.validade || '')}" ${l.sem_validade ? 'disabled' : ''}>
        <label class="marcar"><input type="checkbox" name="sem_validade" ${l.sem_validade ? 'checked' : ''}> Sem validade informada</label><span class="erro" id="validade-erro" aria-live="polite"></span></div></div>
    <div class="campo pessoa-linha"><span class="rotulo-campo" id="forn-rot">Fornecedor <span class="opcional">(opcional, dos Contatos)</span></span>
      <div class="pessoa-escolha"><strong>${l.fornecedor_nome ? esc(l.fornecedor_nome) : '<span class="ajuda">Nenhum</span>'}</strong><a class="btn btn-suave" href="${BASE}fornecedor/?alvo=${alvo}${pid() ? '&id=' + encodeURIComponent(pid()) : ''}" aria-describedby="forn-rot">${l.fornecedor_nome ? 'Trocar' : 'Escolher'}</a></div></div>`;
}
const lerCamposLote = (form) => ({ identificacao: form.identificacao.value.trim(), sem_lote: form.sem_lote.checked, validade: form.validade.value, sem_validade: form.sem_validade.checked });
function ligarCamposLote(form, salvar) {
  const at = () => { form.identificacao.disabled = form.sem_lote.checked; form.validade.disabled = form.sem_validade.checked; salvar(lerCamposLote(form)); };
  form.addEventListener('change', at); form.addEventListener('input', at);
}
function validarLote(v) {
  const er = {};
  if (!v.sem_lote && !v.identificacao) er.identificacao = 'Informe o lote ou marque “Sem lote”.';
  if (!v.sem_validade && !v.validade) er.validade = 'Informe a validade ou marque “Sem validade informada”.';
  return er;
}
async function etapaProdutoConferencia() {
  const d = lerP(); if (!d || !d.nome) return ir(P + qsP());
  const l = d.lote || {}; const qi = pid() ? 0 : (qtdMil(l.quantidade || '0', d.unidade) || 0);
  const vencido = qi > 0 && !l.sem_validade && l.validade && d.hoje && l.validade < d.hoje;
  const corr = (e) => `${P}${e}${pid() ? `?id=${encodeURIComponent(pid())}&conf=1` : '?conf=1'}`;
  pagina({
    titulo: pid() ? 'Editar produto' : 'Novo produto', etapa: etapasP(), etapasTotal: etapasP(), voltar: pid() ? P + qsP(true) : P + 'lote/', voltarTexto: 'Voltar',
    corpo: `<div class="resumo resumo-ct">
        ${blocoResumo('Produto', [['Nome', d.nome], ['Marca', d.marca], ['Unidade', UNIDADES[d.unidade]], ['Estoque mínimo', milTexto(qtdMil(d.minimo, d.unidade) || 0, d.unidade)]], corr(''))}
        ${pid() ? '' : blocoResumo('Lote inicial', qi > 0 ? [['Quantidade', milTexto(qi, d.unidade)], ['Lote', l.sem_lote ? 'Sem lote' : l.identificacao], ['Validade', l.sem_validade ? 'Sem validade informada' : dataBR(l.validade)], ['Fornecedor', l.fornecedor_nome]] : [['Quantidade', 'Zero (nenhum lote criado)']], corr('lote/'))}
      </div>
      ${vencido ? `${avisoHTML('Este lote já está <strong>vencido</strong>: entra como indisponível e não poderá ser usado em atendimento.', 'erro')}<label class="chave"><input type="checkbox" id="confirmar_vencido"><span><strong>Confirmo a entrada como indisponível</strong></span></label>` : ''}
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${pid() ? P + qsP(true) : P + 'lote/'}">${SETA} Voltar</a><button type="button" class="btn btn-cheio" id="salvar">${pid() ? 'Salvar alterações' : 'Salvar produto'}</button>`
  });
  let env = false;
  $('#salvar').onclick = async () => {
    if (env) return;
    if (vencido && !$('#confirmar_vencido').checked) { $('#aviso').innerHTML = avisoHTML('Marque a confirmação do lote vencido.', 'erro'); return; }
    env = true; const b = $('#salvar'); b.disabled = true; b.textContent = 'Salvando…';
    const r = await api('es_produto_salvar', { corpo: { id: pid() || undefined, chave_envio: pid() ? undefined : d.chave_envio, nome: d.nome, marca: d.marca, unidade: d.unidade, minimo: d.minimo,
      lote: pid() ? undefined : { ...l, confirmar_vencido: vencido ? true : undefined } } });
    if (r.ok) { apagarRasc(chP()); recado.pôr(pid() ? 'Produto atualizado.' : 'Produto salvo.'); location.replace(`${BASE}ver/?id=${encodeURIComponent(r.id)}`); return; }
    env = false; b.disabled = false; b.textContent = 'Tentar novamente';
    $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível salvar.') + (r.erros ? ' ' + esc(Object.values(r.erros).join(' ')) : '') + '<br><small>Os dados continuam aqui.</small>', 'erro');
  };
  focarTitulo();
}

// fornecedor (Contatos do estúdio) para lote inicial ou novo lote
async function telaFornecedor() {
  const alvo = params.get('alvo') === 'mov' ? 'mov' : 'prod';
  const ch = alvo === 'mov' ? 'es:mov' : chP();
  const d = lerRasc(ch); const volta = alvo === 'mov' ? M + 'novo-lote/' : P + 'lote/';
  if (!d) return ir(alvo === 'mov' ? BASE : P);
  const campo = alvo === 'mov' ? 'novo_lote' : 'lote';
  pagina({
    titulo: 'Fornecedor', voltar: volta, voltarTexto: 'Voltar',
    corpo: `<form class="busca" role="search" id="form-busca"><div class="campo"><label for="q">Buscar nos Contatos do estúdio</label><input id="q" type="search" autocomplete="off"></div></form>
      <ul class="lista" id="lista" aria-label="Contatos"></ul><p class="ajuda">Fornecedor novo? Cadastre em <a href="/brow-studio/contatos/form/?novo=1">Contatos do estúdio</a>.</p>`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar</a>${d[campo] && d[campo].fornecedor_nome ? '<button type="button" class="btn btn-linha" id="remover">Remover</button>' : ''}`
  });
  const escolher = (id, nome) => { const x = lerRasc(ch); gravarRasc(ch, { ...x, [campo]: { ...x[campo], fornecedor_id: id, fornecedor_nome: nome } }); ir(volta); };
  let vez = 0;
  async function carregar() {
    const minha = ++vez;
    const r = await api('es_fornecedores', { query: { q: $('#q').value.trim(), limite: cabem($('#lista'), 60, 82 + 40) } });
    if (minha !== vez) return;
    $('#lista').innerHTML = r.ok && r.itens.length ? r.itens.map(x => `<li class="item"><div class="item-info"><div class="item-nome">${esc(x.nome)}</div><div class="item-extra">${esc(x.empresa || x.categoria)}</div></div>
      <button type="button" class="btn btn-linha" data-id="${esc(x.id)}" data-nome="${esc(x.nome)}" aria-label="Escolher ${esc(x.nome)}">Escolher</button></li>`).join('') : `<li class="vazio vazio-curto"><p>${r.ok ? 'Nenhum contato encontrado.' : esc(r.msg)}</p></li>`;
    $('#lista').querySelectorAll('[data-id]').forEach(b => b.onclick = () => escolher(b.dataset.id, b.dataset.nome));
  }
  let t; $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(carregar, 300); });
  $('#form-busca').onsubmit = (e) => { e.preventDefault(); carregar(); };
  if ($('#remover')) $('#remover').onclick = () => escolher('', '');
  carregar(); focarTitulo();
}

// ═══════════════════════════ DETALHES DO PRODUTO ═══════════════════════════
async function telaVer() {
  carregando('Produto');
  const r = await api('es_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Produto', r.msg);
  const p = r.produto; const q = encodeURIComponent(p.id); const msg = recado.tirar();
  pagina({
    titulo: 'Produto', voltar: BASE, voltarTexto: 'Estoque',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}${p.arquivado ? avisoHTML('Produto arquivado: não aparece na lista principal e não recebe movimentações.') : ''}
      <div class="servico-cabeca"><h2>${esc(p.nome)}</h2><span class="selo selo-agendado">${esc(p.unidade_nome)}</span></div>
      <p class="etapa">${p.marca ? esc(p.marca) + ' · ' : ''}mínimo ${esc(p.minimo)}</p>
      <div class="fin-valores"><div><span>Físico</span><strong>${esc(p.fisica)}</strong></div><div><span>Disponível</span><strong>${esc(p.disponivel)}</strong></div><div><span>Indisponível</span><strong class="${p.indisponivel_mil ? 'txt-vencido' : ''}">${esc(p.indisponivel)}</strong></div></div>
      ${p.alertas.length ? `<div class="selos selos-grandes">${selosAlerta(p.alertas)}</div>` : '<p class="ajuda">Sem alertas.</p>'}
      <p class="ajuda">Indisponível = lotes vencidos ou bloqueados (não entram no disponível).</p>
      <nav class="acoes-grade" aria-label="Ações do produto">
        ${p.arquivado ? '' : `<a class="btn btn-cheio" href="${M}?produto=${q}&novo=1">Registrar entrada ou saída</a>`}
        <a class="btn btn-suave" href="${BASE}lotes/?id=${q}">Lotes e validades (${p.lotes_com_saldo})</a>
        <a class="btn btn-suave" href="${BASE}historico/?id=${q}">Histórico de movimentações</a>
        <a class="btn btn-suave" href="${P}?id=${q}" id="editar">Editar dados do produto</a>
        <a class="btn btn-suave" href="${BASE}arquivar/?id=${q}">${p.arquivado ? 'Desarquivar' : (p.movimentos_total ? 'Arquivar' : 'Arquivar ou excluir')}</a>
      </nav>`,
    acoes: `<a class="btn btn-linha" href="${BASE}">${SETA} Voltar à lista</a>`
  });
  $('#editar').onclick = () => apagarRasc('es:prod:' + p.id);
  focarTitulo();
}

// ═══════════════════════════ LOTES ═════════════════════════════════════════
async function telaLotes() {
  const id = params.get('id'); const volta = `${BASE}ver/?id=${encodeURIComponent(id)}`;
  const r0 = await api('es_ver', { id }); if (!r0.ok) return telaErro('Lotes e validades', r0.msg);
  const p = r0.produto;
  pagina({
    titulo: 'Lotes e validades', voltar: volta, voltarTexto: 'Produto',
    extra: p.arquivado ? '' : `<a class="btn btn-cheio btn-topo" href="${M}?produto=${encodeURIComponent(id)}&tipo=entrada&novolote=1&novo=1" aria-label="Novo lote">+ Novo<span class="so-largo">&nbsp;lote</span></a>`,
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(p.nome)} · alerta: vence em até ${r0.dias_alerta} dias</p>
      <div class="filtros-chips chips-2" role="radiogroup" aria-label="Lotes"><label class="opcao opcao-chip"><input type="radio" name="ls" value="1" checked><span>Com saldo</span></label><label class="opcao opcao-chip"><input type="radio" name="ls" value="0"><span>Todos</span></label></div>
      <ul class="lista" id="lista" aria-label="Lotes"></ul>${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar ao produto</a>`
  });
  let com = '1';
  const L = listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: 84, abaixo: 82 + 52, rotulo: 'lotes',
    buscar: (pg, lim) => api('es_lotes', { query: { produto: id, com_saldo: com, pagina: pg, limite: lim } }),
    desenhar: (r) => r.total ? r.itens.map(l => `<li class="item"><div class="item-info"><div class="item-nome">${descLote(l)}</div>
        <div class="item-extra item-extra-quebra">Saldo <strong>${esc(l.saldo)}</strong>${l.fornecedor_nome ? ' · ' + esc(l.fornecedor_nome) : ''} <span class="selos">${selosLote(l)}</span></div></div>
        <a class="btn btn-linha" href="${BASE}lote/?id=${encodeURIComponent(l.id)}" aria-label="Abrir ${l.identificacao ? 'lote ' + esc(l.identificacao) : 'lote sem identificação'}">Abrir</a></li>`).join('')
      : `<li class="vazio vazio-curto"><p>${com === '1' ? 'Nenhum lote com saldo.' : 'Nenhum lote cadastrado.'} Use “+ Novo lote” para registrar uma entrada.</p></li>` });
  app.querySelectorAll('[name=ls]').forEach(i => i.onchange = () => { com = i.value; L.reiniciar(); });
  L.carregar(); focarTitulo();
}
async function telaLote() {
  carregando('Lote');
  const r = await api('es_lote_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Lote', r.msg);
  const l = r.lote, p = r.produto; const msg = recado.tirar();
  pagina({
    titulo: 'Lote', voltar: `${BASE}lotes/?id=${encodeURIComponent(p.id)}`, voltarTexto: 'Lotes',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<div class="servico-cabeca"><h2>${l.identificacao ? 'Lote ' + esc(l.identificacao) : 'Sem lote'}</h2><span class="selos">${selosLote(l)}</span></div>
      <div class="resumo">${blocoResumo(p.nome, [['Saldo', l.saldo], ['Validade', l.validade ? dataBR(l.validade) : 'Sem validade informada'], ['Fornecedor', l.fornecedor_nome], ['Disponível para uso', l.disponivel ? 'Sim' : 'Não'], ...(l.bloqueado ? [['Motivo do bloqueio', l.bloqueio_motivo]] : [])])}</div>
      ${l.vencido && l.saldo_mil > 0 ? avisoHTML('Lote vencido: não pode ser usado em atendimento. Pode ser descartado (descarte/perda).', 'erro') : ''}
      <nav class="acoes-grade" aria-label="Ações do lote">
        ${p.arquivado ? '' : `<a class="btn btn-cheio" href="${M}?produto=${encodeURIComponent(p.id)}&lote=${encodeURIComponent(l.id)}&novo=1">Registrar movimentação</a>`}
        <a class="btn btn-suave" href="${BASE}historico/?id=${encodeURIComponent(p.id)}&lote=${encodeURIComponent(l.id)}">Histórico do lote</a>
        <a class="btn btn-suave" href="${BASE}bloquear/?id=${encodeURIComponent(l.id)}">${l.bloqueado ? 'Desbloquear' : 'Bloquear lote'}</a>
      </nav>`,
    acoes: `<a class="btn btn-linha" href="${BASE}lotes/?id=${encodeURIComponent(p.id)}">${SETA} Voltar aos lotes</a>`
  });
  focarTitulo();
}
async function telaBloquear() {
  carregando('Bloquear lote');
  const r = await api('es_lote_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Bloquear lote', r.msg);
  const l = r.lote; const volta = `${BASE}lote/?id=${encodeURIComponent(l.id)}`; const bloquear = !l.bloqueado;
  const form = pagina({
    titulo: bloquear ? 'Bloquear lote?' : 'Desbloquear lote?', voltar: volta, voltarTexto: 'Lote', formulario: true,
    corpo: `<div class="bloco"><h2>${esc(r.produto.nome)}</h2><p class="ajuda">${descLote(l)} · saldo ${esc(l.saldo)}</p></div>
      ${avisoHTML(bloquear ? 'Lote bloqueado continua no estoque físico, mas sai do disponível e não pode ser usado em atendimento.' : 'O lote volta a contar como disponível (se não estiver vencido).')}
      ${bloquear ? '<div class="campo"><label for="motivo">Motivo</label><input id="motivo" name="motivo" maxlength="200" autocomplete="off"><span class="erro" id="motivo-erro" aria-live="polite"></span></div>' : ''}<div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Cancelar</a><button type="submit" class="btn btn-cheio" id="confirmar">${bloquear ? 'Sim, bloquear' : 'Sim, desbloquear'}</button>`
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (bloquear && form.motivo.value.trim().length < 3) return mostrarErros(form, { motivo: 'Informe o motivo.' });
    const rr = await api('es_lote_bloquear', { corpo: { id: l.id, valor: bloquear, motivo: bloquear ? form.motivo.value : null } });
    if (rr.ok) { recado.pôr(bloquear ? 'Lote bloqueado.' : 'Lote desbloqueado.'); location.replace(volta); return; }
    $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível.'), 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ MOVIMENTAÇÃO ══════════════════════════════════
// mov/ (tipo + lote) → [mov/novo-lote/] → mov/dados/ → mov/conferencia/
const lerM = () => lerRasc('es:mov');
const guardarM = (m) => gravarRasc('es:mov', { ...lerM(), ...m });
const vinculo = (d) => d.agendamento_id || d.registro_id;
const voltaVinculo = (d) => `${BASE}atendimento/?${d.agendamento_id ? 'ag=' + encodeURIComponent(d.agendamento_id) : ''}${d.registro_id ? (d.agendamento_id ? '&' : '') + 'rg=' + encodeURIComponent(d.registro_id) : ''}`;
async function novoMov() {
  const cf = await api('es_config_ver');
  return { chave_envio: uuid(), produto_id: '', tipo: '', lote_id: '', novo_lote: null, quantidade: '', contado: '', data: cf.ok ? cf.hoje : '', motivo: '', hoje: cf.ok ? cf.hoje : '',
    agendamento_id: params.get('ag') || '', registro_id: params.get('rg') || '' };
}
async function telaMovProduto() {
  if (params.get('novo') === '1') { gravarRasc('es:mov', await novoMov()); const u = new URL(location.href); u.searchParams.delete('novo'); history.replaceState(null, '', u); }
  const d = lerM(); if (!d) return ir(BASE);
  const volta = vinculo(d) ? voltaVinculo(d) : BASE;
  pagina({
    titulo: 'Material usado', voltar: volta, voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Escolha o produto consumido no atendimento</p>
      <form class="busca" role="search" id="form-busca"><div class="campo"><label for="q">Buscar por nome ou marca</label><input id="q" type="search" autocomplete="off"></div></form>
      <ul class="lista" id="lista" aria-label="Produtos"></ul>${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar</a>`
  });
  const L = listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: 74, abaixo: 82 + 52, rotulo: 'produtos',
    buscar: (pg, lim) => api('es_listar', { query: { q: $('#q').value.trim(), pagina: pg, limite: lim } }),
    desenhar: (r) => r.total ? r.itens.map(x => `<li class="item"><div class="item-info"><div class="item-nome">${esc(x.nome)}${x.marca ? ` <small>· ${esc(x.marca)}</small>` : ''}</div><div class="item-extra">Disponível ${esc(x.disponivel)}</div></div>
        <a class="btn btn-linha" href="${M}?produto=${encodeURIComponent(x.id)}&tipo=consumo" aria-label="Escolher ${esc(x.nome)}">Escolher</a></li>`).join('') : '<li class="vazio vazio-curto"><p>Nenhum produto encontrado.</p></li>' });
  let t; $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(L.reiniciar, 300); });
  $('#form-busca').onsubmit = (e) => { e.preventDefault(); L.reiniciar(); };
  L.carregar(); focarTitulo();
}
async function telaMov() {
  if (params.get('novo') === '1') {
    gravarRasc('es:mov', await novoMov());
    const u = new URL(location.href); u.searchParams.delete('novo'); history.replaceState(null, '', u);
  }
  let d = lerM(); if (!d) { gravarRasc('es:mov', await novoMov()); d = lerM(); }
  const prod = params.get('produto') || d.produto_id;
  if (!prod) return ir(BASE);
  const r0 = await api('es_ver', { id: prod }); if (!r0.ok) return telaErro('Movimentação', r0.msg);
  const p = r0.produto;
  if (p.arquivado) return telaErro('Movimentação', 'Produto arquivado: desarquive para movimentar.', `${BASE}ver/?id=${encodeURIComponent(p.id)}`);
  if (d.produto_id !== p.id) d = { ...d, produto_id: p.id, lote_id: '', novo_lote: null };
  d = { ...d, produto_nome: p.nome, unidade: p.unidade };
  if (params.get('tipo') && TIPOS_MOV[params.get('tipo')]) d.tipo = params.get('tipo');
  if (params.get('lote')) d.lote_id = params.get('lote');
  if (vinculo(d)) d.tipo = 'consumo';
  gravarRasc('es:mov', d);
  if (params.get('novolote') === '1') return ir(M + 'novo-lote/');
  const volta = vinculo(d) ? voltaVinculo(d) : `${BASE}ver/?id=${encodeURIComponent(p.id)}`;
  const form = pagina({
    titulo: vinculo(d) ? 'Material usado' : 'Entrada ou saída', etapa: 1, etapasTotal: 3, formulario: true, voltar: volta, voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(p.nome)} · disponível ${esc(p.disponivel)}</p>
      ${vinculo(d) ? '<p class="etapa vinculo">Consumo vinculado ao atendimento</p><input type="hidden" name="tipo" value="consumo">'
        : `<div class="filtros-chips" role="radiogroup" aria-label="Tipo de movimentação">${Object.entries(TIPOS_MOV).map(([v, t]) => `<label class="opcao opcao-chip"><input type="radio" name="tipo" value="${v}" ${v === d.tipo ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div><span class="erro" id="tipo-erro" aria-live="polite"></span>`}
      <fieldset class="campo"><legend>Lote</legend><ul class="lista lista-lotes" id="lista" aria-label="Lotes"></ul><span class="erro" id="lote-erro" aria-live="polite"></span></fieldset>
      ${navPaginas('nav')}<div id="novo-lote-caixa"></div>`,
    acoes: rodape(volta, null, true)
  });
  $('#corpo').classList.add('fin-compacto');
  $('#cancelar').onclick = () => apagarRasc('es:mov');
  const tipoAtual = () => (form.querySelector('[name=tipo]:checked') || form.querySelector('input[type=hidden][name=tipo]') || {}).value || '';
  const L = listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: 66, abaixo: 82 + 60 + 70, rotulo: 'lotes',
    buscar: (pg, lim) => api('es_lotes', { query: { produto: p.id, com_saldo: tipoAtual() === 'entrada' ? '0' : '1', pagina: pg, limite: lim } }),
    desenhar: (r) => {
      const t = tipoAtual();
      $('#novo-lote-caixa').innerHTML = t === 'entrada' ? `<a class="btn btn-suave" href="${M}novo-lote/" id="novo-lote">+ Cadastrar novo lote</a>` : '';
      if (!r.total) return `<li class="vazio vazio-curto"><p>${t === 'entrada' ? 'Nenhum lote ainda: cadastre um novo lote.' : 'Nenhum lote com saldo.'}</p></li>`;
      return r.itens.map(l => {
        const bloq = t === 'consumo' && (l.vencido || l.bloqueado);
        const motivo = bloq ? (l.vencido ? ' — vencido: só descarte' : ' — bloqueado') : '';
        return `<li><label class="opcao opcao-lote${bloq ? ' desativada' : ''}"><input type="radio" name="lote_id" value="${esc(l.id)}" ${l.id === d.lote_id && !bloq ? 'checked' : ''} ${bloq ? 'disabled' : ''} data-desc="${esc(descLote(l).replace(/<[^>]+>/g, ''))}" data-saldo="${l.saldo_mil}" data-vencido="${l.vencido ? 1 : 0}">
          <span><strong>${descLote(l)}</strong><small>Saldo ${esc(l.saldo)}${motivo} ${selosLote(l)}</small></span></label></li>`;
      }).join('');
    } });
  form.addEventListener('change', (e) => {
    if (e.target.name === 'tipo') { guardarM({ tipo: e.target.value, lote_id: '', novo_lote: null }); L.reiniciar(); }
    if (e.target.name === 'lote_id') guardarM({ lote_id: e.target.value, novo_lote: null, lote_desc: e.target.dataset.desc, saldo_lote_mil: +e.target.dataset.saldo, lote_vencido: e.target.dataset.vencido === '1' });
  });
  form.onsubmit = (ev) => {
    ev.preventDefault(); const er = {};
    const t = tipoAtual(); const sel = form.querySelector('[name=lote_id]:checked');
    if (!t) er.tipo = 'Escolha o tipo.';
    if (!sel) er.lote = t === 'entrada' ? 'Escolha um lote ou cadastre um novo.' : 'Escolha o lote.';
    if (!mostrarErros(form, er)) { if (er.lote) $('#lote-erro').textContent = er.lote; return; }
    guardarM({ tipo: t, lote_id: sel.value, novo_lote: null, lote_desc: sel.dataset.desc, saldo_lote_mil: +sel.dataset.saldo, lote_vencido: sel.dataset.vencido === '1' });
    ir(M + 'dados/');
  };
  L.carregar(); focarTitulo();
}
async function telaMovNovoLote() {
  const d = lerM(); if (!d || !d.produto_id) return ir(BASE);
  const nl = d.novo_lote || { identificacao: '', sem_lote: false, validade: '', sem_validade: false, fornecedor_id: '', fornecedor_nome: '' };
  if (!d.novo_lote) guardarM({ novo_lote: nl, tipo: 'entrada' });
  const volta = `${M}?produto=${encodeURIComponent(d.produto_id)}`;
  const form = pagina({
    titulo: 'Novo lote', etapa: 1, etapasTotal: 3, formulario: true, voltar: volta, voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Entrada · ${esc(d.produto_nome)}</p>${camposLote(nl, 'mov')}<div id="aviso"></div>`,
    acoes: rodape(volta)
  });
  $('#corpo').classList.add('fin-compacto');
  ligarCamposLote(form, (v) => guardarM({ novo_lote: { ...lerM().novo_lote, ...v, confirmar_ident: false } }));
  let confirmouRepetido = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); const v = { ...lerM().novo_lote, ...lerCamposLote(form) };
    if (!mostrarErros(form, validarLote(v))) return;
    if (v.identificacao && !v.sem_lote && !confirmouRepetido) {
      const r = await api('es_lote_ident', { query: { produto: d.produto_id, ident: v.identificacao } });
      if (r.ok && r.itens.length) {
        const ex = r.itens[0];
        $('#aviso').innerHTML = avisoHTML(`Já existe o lote <strong>${esc(ex.identificacao)}</strong> neste produto (${ex.validade ? 'val. ' + dataBR(ex.validade) : 'sem validade informada'}). Lotes não são juntados automaticamente.`, 'erro',
          `<div class="linha-acoes"><button type="button" class="btn btn-cheio" id="usar-existente">Usar o lote existente</button><button type="button" class="btn btn-linha" id="outro-lote">É outro lote</button></div>`);
        $('#usar-existente').onclick = () => { guardarM({ novo_lote: null, lote_id: ex.id, lote_desc: (ex.identificacao ? 'Lote ' + ex.identificacao : 'Sem lote'), saldo_lote_mil: ex.saldo_mil, lote_vencido: ex.vencido }); ir(M + 'dados/'); };
        $('#outro-lote').onclick = () => { confirmouRepetido = true; guardarM({ novo_lote: { ...v, confirmar_ident: true } }); ir(M + 'dados/'); };
        return;
      }
    }
    guardarM({ novo_lote: { ...v, confirmar_ident: confirmouRepetido }, lote_id: '', lote_vencido: !v.sem_validade && v.validade && d.hoje && v.validade < d.hoje, saldo_lote_mil: 0,
      lote_desc: `${v.sem_lote ? 'Sem lote' : 'Lote ' + v.identificacao} · ${v.sem_validade ? 'sem validade informada' : 'val. ' + dataBR(v.validade)} (novo)` });
    ir(M + 'dados/');
  };
  focarTitulo();
}
function telaMovDados() {
  const d = lerM(); if (!d || !d.produto_id || !d.tipo || (!d.lote_id && !d.novo_lote)) return ir(d && d.produto_id ? `${M}?produto=${encodeURIComponent(d.produto_id)}` : BASE);
  const aj = d.tipo === 'ajuste'; const u = d.unidade;
  const volta = d.novo_lote ? M + 'novo-lote/' : `${M}?produto=${encodeURIComponent(d.produto_id)}`;
  const form = pagina({
    titulo: TIPOS_NOME[d.tipo], etapa: 2, etapasTotal: 3, formulario: true, voltar: volta, voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(d.produto_nome)} · ${esc(d.lote_desc || '')}</p>
      ${aj ? `<p class="ajuda">Saldo no sistema: <strong>${milTexto(d.saldo_lote_mil, u)}</strong></p>${campoTexto({ id: 'contado', rotulo: `Saldo contado (${UNIDADES[u]})`, valor: d.contado, attrs: 'inputmode="decimal" autocomplete="off" maxlength="16"', ajuda: erroQtd(u) })}`
        : campoTexto({ id: 'quantidade', rotulo: `Quantidade (${UNIDADES[u]})`, valor: d.quantidade, attrs: 'inputmode="decimal" autocomplete="off" maxlength="16"', ajuda: (d.tipo === 'entrada' ? '' : `Saldo do lote: ${milTexto(d.saldo_lote_mil, u)}. `) + erroQtd(u) })}
      ${campoTexto({ id: 'data', rotulo: 'Data', valor: d.data, tipo: 'date', attrs: `max="${d.hoje || ''}"` })}
      ${campoTexto({ id: 'motivo', rotulo: aj ? 'Justificativa' : (d.tipo === 'descarte' ? 'Motivo' : 'Observação'), valor: d.motivo, opcional: !aj && d.tipo !== 'descarte', attrs: 'maxlength="300" autocomplete="off"' })}
      ${aj ? '<p class="ajuda">Ajuste de inventário: registra saldo anterior, contado e diferença. Função restrita quando o login existir.</p>' : ''}<div id="aviso"></div>`,
    acoes: rodape(volta)
  });
  $('#corpo').classList.add('fin-compacto');
  const lerForm = () => ({ [aj ? 'contado' : 'quantidade']: form[aj ? 'contado' : 'quantidade'].value, data: form.data.value, motivo: form.motivo.value });
  form.addEventListener('input', () => guardarM(lerForm()));
  form.onsubmit = (ev) => {
    ev.preventDefault(); const v = lerForm(); const er = {};
    if (aj) { const c = qtdMil(v.contado, u); if (c === null) er.contado = 'Informe o saldo contado. ' + erroQtd(u); else if (c === d.saldo_lote_mil) er.contado = 'Igual ao saldo do sistema: não há ajuste a fazer.'; }
    else { const q = qtdMil(v.quantidade, u); if (!q) er.quantidade = 'Informe uma quantidade maior que zero. ' + erroQtd(u); else if (d.tipo !== 'entrada' && q > d.saldo_lote_mil) er.quantidade = `Passa do saldo do lote (${milTexto(d.saldo_lote_mil, u)}).`; }
    if (!v.data) er.data = 'Informe a data.'; else if (d.hoje && v.data > d.hoje) er.data = 'A data não pode ser futura.';
    if ((aj || d.tipo === 'descarte') && v.motivo.trim().length < 3) er.motivo = aj ? 'Informe a justificativa.' : 'Informe o motivo.';
    if (!mostrarErros(form, er)) return;
    guardarM(v); ir(M + 'conferencia/');
  };
  focarTitulo();
}
async function telaMovConferencia() {
  const d = lerM(); if (!d || !d.produto_id || !d.tipo) return ir(BASE);
  const u = d.unidade; const aj = d.tipo === 'ajuste';
  const q = aj ? null : qtdMil(d.quantidade, u); const c = aj ? qtdMil(d.contado, u) : null;
  const depois = aj ? c : (d.tipo === 'entrada' ? d.saldo_lote_mil + q : d.saldo_lote_mil - q);
  const vencidoEntrada = d.tipo === 'entrada' && d.lote_vencido;
  pagina({
    titulo: 'Conferência', etapa: 3, etapasTotal: 3, voltar: M + 'dados/', voltarTexto: 'Voltar',
    corpo: `<div class="resumo resumo-ct">${blocoResumo(TIPOS_NOME[d.tipo], [['Produto', d.produto_nome], ['Lote', d.lote_desc], ...(aj ? [['Saldo anterior', milTexto(d.saldo_lote_mil, u)], ['Saldo contado', milTexto(c, u)], ['Diferença', milTexto(c - d.saldo_lote_mil, u)]]
        : [['Quantidade', milTexto(q, u)], ['Saldo do lote depois', milTexto(depois, u)]]), ['Data', dataBR(d.data)], [aj ? 'Justificativa' : 'Motivo', d.motivo], ...(vinculo(d) ? [['Atendimento', 'vinculado']] : [])], M + 'dados/')}</div>
      ${vencidoEntrada ? `${avisoHTML('Lote <strong>vencido</strong>: a entrada fica indisponível para uso.', 'erro')}<label class="chave"><input type="checkbox" id="confirmar_vencido"><span><strong>Confirmo a entrada como indisponível</strong></span></label>` : ''}
      ${d.tipo === 'entrada' ? '<p class="ajuda">Entrada de estoque não registra pagamento ao fornecedor.</p>' : ''}${d.tipo === 'consumo' || d.tipo === 'descarte' ? '<p class="ajuda">Não cria despesa no financeiro.</p>' : ''}
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${M}dados/">${SETA} Voltar</a><button type="button" class="btn btn-cheio" id="salvar">Registrar</button>`
  });
  let env = false;
  $('#salvar').onclick = async () => {
    if (env) return;
    if (vencidoEntrada && !$('#confirmar_vencido').checked) { $('#aviso').innerHTML = avisoHTML('Marque a confirmação do lote vencido.', 'erro'); return; }
    env = true; const b = $('#salvar'); b.disabled = true; b.textContent = 'Salvando…';
    const r = await api('es_mov_salvar', { corpo: { chave_envio: d.chave_envio, tipo: d.tipo, produto_id: d.produto_id, lote_id: d.lote_id || undefined, novo_lote: d.novo_lote || undefined,
      quantidade: d.quantidade, contado: d.contado, data: d.data, motivo: d.motivo, agendamento_id: d.agendamento_id || undefined, registro_id: d.registro_id || undefined, confirmar_vencido: vencidoEntrada ? true : undefined } });
    if (r.ok) {
      apagarRasc('es:mov'); recado.pôr(`Movimentação registrada: ${TIPOS_NOME[d.tipo].toLowerCase()}.`);
      location.replace(vinculo(d) ? voltaVinculo(d) : `${BASE}ver/?id=${encodeURIComponent(d.produto_id)}`); return;
    }
    env = false; b.disabled = false; b.textContent = 'Tentar novamente';
    if (r.erro === 'lote_existe') { $('#aviso').innerHTML = avisoHTML('Já existe lote com essa identificação. Volte e escolha “Usar o lote existente” ou “É outro lote”.', 'erro', `<div class="linha-acoes"><a class="btn btn-cheio" href="${M}novo-lote/">Rever o lote</a></div>`); guardarM({ novo_lote: { ...d.novo_lote, confirmar_ident: false } }); return; }
    $('#aviso').innerHTML = avisoHTML(esc(r.erros ? Object.values(r.erros).join(' ') : (r.msg || 'Não foi possível registrar.')) + '<br><small>Os dados continuam aqui. O saldo foi conferido de novo no servidor.</small>', 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ HISTÓRICO / CORREÇÕES ═════════════════════════
const linhaMov = (x, comProduto) => `<li class="item${x.estornado ? ' item-inativo' : ''}"><div class="item-info">
    <div class="item-nome">${esc(x.tipo_nome)} · <span class="${x.qtd_mil < 0 ? 'tipo-despesa' : 'tipo-receita'}">${x.qtd_mil > 0 ? '+' : ''}${esc(x.quantidade)}</span>${x.estornado ? ' · estornado' : ''}</div>
    <div class="item-extra">${comProduto ? esc(x.produto_nome) + ' · ' : ''}${x.lote_ident ? 'lote ' + esc(x.lote_ident) : 'sem lote'} · ${dataBR(x.data)} · ${esc(x.responsavel || 'login pendente')}${x.motivo ? ' · ' + esc(x.motivo) : ''}</div></div>
    <a class="btn btn-linha" href="${BASE}movimento/?id=${encodeURIComponent(x.id)}" aria-label="Abrir ${esc(x.tipo_nome)} de ${dataBR(x.data)}">Abrir</a></li>`;
async function telaHistorico() {
  const id = params.get('id'), lote = params.get('lote'); const volta = lote ? `${BASE}lote/?id=${encodeURIComponent(lote)}` : `${BASE}ver/?id=${encodeURIComponent(id)}`;
  const msg = recado.tirar();
  pagina({
    titulo: lote ? 'Histórico do lote' : 'Histórico', voltar: volta, voltarTexto: lote ? 'Lote' : 'Produto',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<p class="ajuda">Nada é apagado: correções são estornos ou ajustes vinculados.</p><ul class="lista" id="lista" aria-label="Movimentações"></ul>${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar</a>`
  });
  listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: 74, abaixo: 82 + 52, rotulo: 'movimentações',
    buscar: (pg, lim) => api('es_movimentos', { query: { produto: id, ...(lote ? { lote } : {}), pagina: pg, limite: lim } }),
    desenhar: (r) => r.total ? r.itens.map(x => linhaMov(x)).join('') : '<li class="vazio vazio-curto"><p>Nenhuma movimentação.</p></li>' }).carregar();
  focarTitulo();
}
async function telaMovimento() {
  carregando('Movimentação');
  const r = await api('es_mov_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Movimentação', r.msg);
  const m = r.movimento; const msg = recado.tirar(); const q = encodeURIComponent(m.id);
  const ent = ['entrada', 'saldo_inicial'].includes(m.tipo);
  const despAtiva = m.despesa && !m.despesa.cancelado;
  pagina({
    titulo: m.tipo_nome, voltar: `${BASE}historico/?id=${encodeURIComponent(m.produto_id)}`, voltarTexto: 'Histórico',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}${m.estornado ? avisoHTML('Esta movimentação foi estornada (continua no histórico).') : ''}
      <div class="resumo">${blocoResumo(m.produto_nome, [['Quantidade', `${m.qtd_mil > 0 ? '+' : ''}${m.quantidade}`], ['Lote', `${m.lote_ident || 'Sem lote'} · ${m.lote_validade ? 'val. ' + dataBR(m.lote_validade) : 'sem validade informada'}`],
        ['Saldo do lote', `${m.saldo_antes} → ${m.saldo_depois}`], ...(m.contado ? [['Saldo contado', m.contado]] : []), ['Data', dataBR(m.data)], ['Responsável', m.responsavel || 'login pendente'], ['Motivo', m.motivo],
        ...(m.cliente_nome ? [['Atendimento', m.cliente_nome]] : [])])}</div>
      <nav class="acoes-grade" aria-label="Ações">
        ${m.tipo !== 'estorno' && !m.estornado ? `<a class="btn btn-suave" href="${BASE}estorno/?mov=${q}">Estornar</a>` : ''}
        ${m.estorno_id ? `<a class="btn btn-suave" href="${BASE}movimento/?id=${encodeURIComponent(m.estorno_id)}">Ver estorno</a>` : ''}
        ${m.estorno_de ? `<a class="btn btn-suave" href="${BASE}movimento/?id=${encodeURIComponent(m.estorno_de)}">Ver original</a>` : ''}
        ${ent && !m.estornado && !despAtiva ? `<a class="btn btn-suave" href="${BASE}despesa/?mov=${q}">Criar despesa desta entrada</a>` : ''}
        ${despAtiva ? `<a class="btn btn-suave" href="/brow-studio/financeiro/ver/?id=${encodeURIComponent(m.despesa.id)}">Abrir despesa</a>` : ''}
        ${m.agendamento_id ? `<a class="btn btn-suave" href="${BASE}atendimento/?ag=${encodeURIComponent(m.agendamento_id)}">Materiais do atendimento</a>` : ''}
      </nav>${ent ? '<p class="ajuda">Entrada de estoque não significa pagamento ao fornecedor.</p>' : ''}`,
    acoes: `<a class="btn btn-linha" href="${BASE}historico/?id=${encodeURIComponent(m.produto_id)}">${SETA} Voltar ao histórico</a>`
  });
  focarTitulo();
}
async function telaEstorno() {
  carregando('Estornar');
  const r = await api('es_mov_ver', { id: params.get('mov') });
  if (!r.ok) return telaErro('Estornar', r.msg);
  const m = r.movimento; const volta = `${BASE}movimento/?id=${encodeURIComponent(m.id)}`;
  if (m.estornado || m.tipo === 'estorno') return telaErro('Estornar', m.estornado ? 'Esta movimentação já foi estornada.' : 'Um estorno não pode ser estornado.', volta);
  const form = pagina({
    titulo: 'Estornar registro?', voltar: volta, voltarTexto: 'Movimentação', formulario: true,
    corpo: `<div class="bloco"><h2>${esc(m.tipo_nome)} · ${m.qtd_mil > 0 ? '+' : ''}${esc(m.quantidade)}</h2><p class="ajuda">${esc(m.produto_nome)} · ${m.lote_ident ? 'lote ' + esc(m.lote_ident) : 'sem lote'} · ${dataBR(m.data)} · saldo atual do lote ${esc(m.saldo_lote)}</p></div>
      ${avisoHTML(`Cria um estorno vinculado (${m.qtd_mil > 0 ? '−' : '+'}${esc(m.quantidade.replace('−', ''))}). A original continua no histórico.${m.despesa && !m.despesa.cancelado ? ' <strong>Há despesa vinculada no financeiro</strong>: trate-a por lá, se for o caso.' : ''}`)}
      <div class="campo"><label for="motivo">Justificativa</label><textarea id="motivo" name="motivo" maxlength="300" rows="2" class="curta"></textarea><span class="erro" id="motivo-erro" aria-live="polite"></span></div>
      <label class="chave"><input type="checkbox" name="confirmacao"><span><strong>Confirmo o estorno</strong></span></label><span class="erro" id="confirmacao-erro"></span><div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Cancelar</a><button type="submit" class="btn btn-perigo-cheio" id="estornar">Estornar</button>`
  });
  let env = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (env) return; const er = {};
    if (form.motivo.value.trim().length < 3) er.motivo = 'Informe a justificativa.';
    if (!form.confirmacao.checked) er.confirmacao = 'Marque a confirmação.';
    if (!mostrarErros(form, er)) return;
    env = true; $('#estornar').disabled = true;
    const rr = await api('es_estornar', { corpo: { id: m.id, motivo: form.motivo.value, confirmacao: true } });
    if (rr.ok) { recado.pôr('Estorno registrado. Saldo recalculado.'); location.replace(volta); return; }
    env = false; $('#estornar').disabled = false; $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível estornar.'), 'erro');
  };
  focarTitulo();
}
async function telaDespesa() {
  carregando('Criar despesa');
  const r = await api('es_mov_ver', { id: params.get('mov') });
  if (!r.ok) return telaErro('Criar despesa', r.msg);
  const m = r.movimento; const volta = `${BASE}movimento/?id=${encodeURIComponent(m.id)}`;
  if (m.despesa && !m.despesa.cancelado) return telaErro('Criar despesa', 'Esta entrada já tem despesa no financeiro.', volta);
  const ch = 'es:desp:' + m.id; const rasc = lerRasc(ch) || { chave: uuid() }; gravarRasc(ch, rasc);
  const form = pagina({
    titulo: 'Criar despesa', voltar: volta, voltarTexto: 'Movimentação', formulario: true,
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(m.produto_nome)} · ${esc(m.quantidade)} · ${dataBR(m.data)}</p>
      ${campoTexto({ id: 'descricao', rotulo: 'Descrição', valor: rasc.descricao || `Compra: ${m.produto_nome}`, attrs: 'maxlength="120" autocomplete="off"' })}
      <div class="duas-colunas">${campoTexto({ id: 'valor', rotulo: 'Valor (R$)', valor: rasc.valor || '', attrs: 'inputmode="decimal" autocomplete="off" placeholder="Ex.: 89,90" maxlength="13"' })}${campoTexto({ id: 'vencimento', rotulo: 'Vencimento', valor: rasc.vencimento || r.hoje, tipo: 'date' })}</div>
      ${avisoHTML('A despesa fica <strong>pendente</strong> no financeiro. Nada é pago nem comprado por aqui; registre o pagamento no financeiro quando acontecer.')}<div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Cancelar</a><button type="submit" class="btn btn-cheio" id="criar">Criar despesa</button>`
  });
  form.addEventListener('input', () => gravarRasc(ch, { ...rasc, descricao: form.descricao.value, valor: form.valor.value, vencimento: form.vencimento.value }));
  let env = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (env) return; const er = {};
    if (form.descricao.value.trim().length < 2) er.descricao = 'Informe a descrição.';
    if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(form.valor.value.trim()) || /^0+(,0*)?$/.test(form.valor.value.trim())) er.valor = 'Informe o valor, maior que zero.';
    if (!form.vencimento.value) er.vencimento = 'Informe o vencimento.';
    if (!mostrarErros(form, er)) return;
    env = true; $('#criar').disabled = true;
    const rr = await api('es_despesa_criar', { corpo: { movimento_id: m.id, descricao: form.descricao.value, valor: form.valor.value, vencimento: form.vencimento.value } });
    if (rr.ok) { apagarRasc(ch); recado.pôr('Despesa criada no financeiro (pendente).'); location.replace(volta); return; }
    env = false; $('#criar').disabled = false;
    $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível criar.'), 'erro', rr.erro === 'ja_existe' && rr.id ? `<div class="linha-acoes"><a class="btn btn-cheio" href="/brow-studio/financeiro/ver/?id=${encodeURIComponent(rr.id)}">Abrir despesa existente</a></div>` : '');
  };
  focarTitulo();
}
async function telaArquivar() {
  carregando('Arquivar produto');
  const r = await api('es_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Arquivar produto', r.msg);
  const p = r.produto; const volta = `${BASE}ver/?id=${encodeURIComponent(p.id)}`; const arquivar = !p.arquivado; const podeExcluir = !p.movimentos_total;
  pagina({
    titulo: arquivar ? (podeExcluir ? 'Arquivar ou excluir?' : 'Arquivar produto?') : 'Desarquivar produto?', voltar: volta, voltarTexto: 'Produto',
    corpo: `<div class="bloco"><h2>${esc(p.nome)}</h2><p class="ajuda">Físico ${esc(p.fisica)} · ${p.movimentos_total} movimentação(ões)</p></div>
      ${arquivar ? avisoHTML(podeExcluir ? 'Sem histórico: pode ser excluído de vez. Arquivar apenas esconde.' : 'Produto com histórico não é excluído: arquivar esconde da lista e mantém histórico, vínculos com atendimentos e fornecedores.') : avisoHTML('O produto volta para a lista e pode ser movimentado.')}
      ${arquivar && podeExcluir ? '<label class="chave"><input type="checkbox" id="conf-excluir"><span><strong>Quero excluir definitivamente</strong></span></label>' : ''}<div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Cancelar</a>${arquivar && podeExcluir ? '<button type="button" class="btn btn-perigo" id="excluir">Excluir</button>' : ''}<button type="button" class="btn btn-cheio" id="confirmar">${arquivar ? 'Arquivar' : 'Desarquivar'}</button>`
  });
  $('#confirmar').onclick = async () => {
    const rr = await api('es_arquivar', { corpo: { id: p.id, valor: arquivar } });
    if (rr.ok) { recado.pôr(arquivar ? 'Produto arquivado.' : 'Produto desarquivado.'); location.replace(volta); return; }
    $('#aviso').innerHTML = avisoHTML(esc(rr.msg), 'erro');
  };
  if ($('#excluir')) $('#excluir').onclick = async () => {
    if (!$('#conf-excluir').checked) { $('#aviso').innerHTML = avisoHTML('Marque a confirmação para excluir.', 'erro'); return; }
    const rr = await api('es_excluir', { corpo: { id: p.id, confirmacao: true } });
    if (rr.ok) { recado.pôr('Produto excluído.'); location.replace(BASE); return; }
    $('#aviso').innerHTML = avisoHTML(esc(rr.msg), 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ MATERIAIS DO ATENDIMENTO ══════════════════════
async function telaAtendimento() {
  const ag = params.get('ag') || '', rg = params.get('rg') || '';
  carregando('Materiais do atendimento');
  const r = await api('es_atendimento', { query: { agendamento: ag, registro: rg } });
  if (!r.ok) return telaErro('Materiais do atendimento', r.msg, '/brow-studio/agenda/');
  const a = r.agendamento || r.registro; const agId = ag || (r.registro && r.registro.agendamento_id) || '';
  const volta = ag ? `/brow-studio/agenda/atendimento/documentos/?id=${encodeURIComponent(ag)}` : `/brow-studio/registros/ver/?id=${encodeURIComponent(rg)}`;
  const msg = recado.tirar();
  const qAdd = `${agId ? 'ag=' + encodeURIComponent(agId) : ''}${rg ? (agId ? '&' : '') + 'rg=' + encodeURIComponent(rg) : ''}`;
  pagina({
    titulo: 'Materiais do atendimento', voltar: volta, voltarTexto: 'Atendimento',
    extra: `<a class="btn btn-cheio btn-topo" href="${M}produto/?${qAdd}&novo=1" aria-label="Adicionar material usado">+ Material</a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<p class="etapa" style="margin-top:-8px">${esc(a.cliente_nome)} · ${esc(a.servico_nome || '')} · ${dataBR(a.data)}</p>
      <p class="ajuda">Nada é baixado automaticamente: cada material adicionado gera uma única saída. Para corrigir, abra e estorne.</p>
      <ul class="lista" id="lista" aria-label="Materiais usados"></ul>${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar ao atendimento</a>`
  });
  listaPaginada({ el: $('#lista'), nav: $('#nav'), altura: 74, abaixo: 82 + 52, rotulo: 'registros',
    buscar: (pg, lim) => api('es_movimentos', { query: { ...(agId ? { agendamento: agId } : {}), ...(rg ? { registro: rg } : {}), pagina: pg, limite: lim } }),
    desenhar: (x) => x.total ? x.itens.map(i => linhaMov({ ...i, tipo_nome: i.estornado ? 'Consumo' : 'Consumo' }, true)).join('') : '<li class="vazio vazio-curto"><p>Nenhum material registrado para este atendimento.</p></li>' }).carregar();
  focarTitulo();
}

// ─── roteamento ─────────────────────────────────────────────────────────────
const TELAS = { lista: telaLista, config: telaConfig, produto: etapaProduto, loteinicial: etapaLoteInicial, prodconf: etapaProdutoConferencia, fornecedor: telaFornecedor,
  ver: telaVer, lotes: telaLotes, lote: telaLote, bloquear: telaBloquear, movproduto: telaMovProduto, mov: telaMov, movnovolote: telaMovNovoLote, movdados: telaMovDados, movconf: telaMovConferencia,
  historico: telaHistorico, movimento: telaMovimento, estorno: telaEstorno, despesa: telaDespesa, arquivar: telaArquivar, atendimento: telaAtendimento };
(async () => {
  const pg = document.body.dataset.pagina;
  if (pid() && pg === 'prodconf' && !lerP()) { carregando('Produto'); if (!(await prepararProduto())) return; }
  (TELAS[pg] || telaLista)();
})();
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
