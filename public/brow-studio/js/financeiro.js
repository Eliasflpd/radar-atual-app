// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — FINANCEIRO E CAIXA (10/11/2026)
// Registro MANUAL de receitas e despesas: não cobra, não acessa banco, não
// movimenta dinheiro. Cada página tem rota própria. Valores em centavos
// inteiros (nunca float). Rascunho entre etapas: "fn:novo" ou "fn:<id>".
// ═══════════════════════════════════════════════════════════════════════════
import { $, params, esc, uuid, lerRasc, gravarRasc, apagarRasc, api, SETA, pagina, campoTexto, grupoOpcoes,
  mostrarErros, avisoHTML, focarTitulo, ir, blocoResumo } from './comum.js?v=2';

const BASE = '/brow-studio/financeiro/';
const N = BASE + 'novo/';
const TIPOS = { receita: 'Receita', despesa: 'Despesa' };
const CATEGORIAS = { atendimento: 'Atendimento', venda: 'Venda', materiais: 'Materiais', aluguel: 'Aluguel', servicos: 'Serviços', outros: 'Outros' };
const FORMAS = { pix: 'Pix', dinheiro: 'Dinheiro', debito: 'Cartão de débito', credito: 'Cartão de crédito', transferencia: 'Transferência' };
const SITUACOES = { pendente: 'Pendente', parcial: 'Parcial', quitado: 'Quitado', cancelado: 'Cancelado' };
const PERIODOS = { hoje: 'Hoje', semana: '7 dias', mes: 'Este mês', mes_anterior: 'Mês anterior', outro: 'Outro' };
const AG_SIT = { agendado: 'Agendado', confirmado: 'Presença confirmada', chegou: 'Chegou', em_atendimento: 'Em atendimento', concluido: 'Concluído', cancelado: 'Cancelado', falta: 'Faltou' };
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

// ─── dinheiro (centavos inteiros) e datas ───────────────────────────────────
const RE_VALOR = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/;
function centavos(v) {
  let s = String(v == null ? '' : v).trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!s || !RE_VALOR.test(s)) return null;
  s = s.replace(/\./g, '');
  const [i, d = ''] = s.split(',');
  const c = parseInt(i, 10) * 100 + parseInt((d + '00').slice(0, 2), 10);
  return Number.isSafeInteger(c) && c <= 100000000 ? c : null;
}
function reais(c) { c = c | 0; const s = String(Math.abs(c)).padStart(3, '0'); return `${c < 0 ? '− ' : ''}R$ ${s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${s.slice(-2)}`; }
const valorTexto = (c) => reais(c).replace('R$ ', '');
const dataBR = (s) => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '';
const dataCurta = (s) => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '';
const dataHora = (t) => { const d = new Date(t); return isNaN(d) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const seloFin = (s, vencido) => `<span class="selo selo-fin-${s}">${SITUACOES[s]}</span>${vencido ? ' <span class="selo selo-fin-vencido">Vencido</span>' : ''}`;
const recebido = (tipo) => tipo === 'despesa' ? 'pago' : 'recebido';
const situacaoDe = (total, pago) => pago <= 0 ? 'pendente' : pago < total ? 'parcial' : 'quitado';

// ═══════════════════════════ PAINEL ════════════════════════════════════════
async function telaPainel() {
  const msg = recado.tirar();
  const p = PERIODOS[params.get('periodo')] ? params.get('periodo') : (params.get('de') ? 'outro' : 'mes');
  pagina({
    titulo: 'Financeiro e caixa', voltar: '/brow-studio/profissional.html',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      <div class="filtros-chips chips-5" role="radiogroup" aria-label="Período">${Object.entries(PERIODOS).map(([v, t]) => `<label class="opcao opcao-chip"><input type="radio" name="periodo" value="${v}" ${v === p ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
      <p class="etapa" id="periodo-txt" aria-live="polite"></p>
      <div id="resumo">${avisoHTML('Carregando…')}</div>`,
    acoes: `<a class="btn btn-cheio" href="${N}?tipo=receita&novo=1">+ Receita</a><a class="btn btn-cheio" href="${N}?tipo=despesa&novo=1">+ Despesa</a><a class="btn btn-linha" href="${BASE}lancamentos/" aria-label="Ver lançamentos"><span class="txt-largo" aria-hidden="true">Ver lançamentos</span><span class="txt-curto" aria-hidden="true">Lançamentos</span></a>`
  });
  app.querySelector('.app-acoes').classList.add('acoes-tres');
  app.querySelectorAll('[name=periodo]').forEach(i => i.onchange = () => {
    if (i.value === 'outro') return ir(BASE + 'periodo/' + (params.get('de') ? `?de=${params.get('de')}&ate=${params.get('ate')}` : ''));
    history.replaceState(null, '', BASE + '?periodo=' + i.value); carregar(i.value);
  });
  async function carregar(per) {
    const query = per === 'outro' ? { de: params.get('de') || '', ate: params.get('ate') || '' } : { periodo: per };
    const r = await api('fn_resumo', { query });
    if (!r.ok) { $('#resumo').innerHTML = avisoHTML(esc(r.msg), 'erro'); return; }
    $('#periodo-txt').textContent = r.de === r.ate ? `Movimentações de ${dataBR(r.de)}` : `Movimentações de ${dataBR(r.de)} a ${dataBR(r.ate)}`;
    const mv = r.movimentacao_centavos;
    $('#resumo').innerHTML = `<div class="fin-cards">
        <section class="fin-card"><h2>Recebimentos registrados</h2><p class="fin-valor positivo">${reais(r.recebimentos.centavos)}</p><p class="ajuda fin-qtd">${r.recebimentos.quantidade} registro(s)</p></section>
        <section class="fin-card"><h2>Pagamentos registrados</h2><p class="fin-valor negativo">${reais(r.pagamentos.centavos)}</p><p class="ajuda fin-qtd">${r.pagamentos.quantidade} registro(s)</p></section>
        <section class="fin-card fin-card-largo"><h2>Movimentação do período</h2><p class="fin-valor ${mv < 0 ? 'negativo' : 'positivo'}">${reais(mv)}</p>
          <p class="ajuda">Recebimentos − pagamentos efetivos, pela data de cada um. Não é lucro nem saldo bancário.</p></section>
      </div>
      <section class="bloco fin-pendentes"><h2>Pendentes no período</h2><p class="ajuda">Pelo vencimento. Previstos: não entram no resultado acima.</p>
        <dl class="dados"><dt>A receber</dt><dd>${reais(r.pendente_receber.centavos)}${r.pendente_receber.vencidos ? ` · <strong class="txt-vencido">${r.pendente_receber.vencidos} vencido(s)</strong>` : ''}</dd>
        <dt>A pagar</dt><dd>${reais(r.pendente_pagar.centavos)}${r.pendente_pagar.vencidos ? ` · <strong class="txt-vencido">${r.pendente_pagar.vencidos} vencido(s)</strong>` : ''}</dd></dl></section>
      <p class="ajuda nota-fin">Registro manual. Venda no cartão não significa dinheiro disponível no banco.</p>`;
  }
  carregar(p);
  focarTitulo();
}
function telaPeriodo() {
  const form = pagina({
    titulo: 'Outro período', voltar: BASE, voltarTexto: 'Financeiro', formulario: true,
    corpo: `<div class="duas-colunas">${campoTexto({ id: 'de', rotulo: 'De', valor: params.get('de') || '', tipo: 'date' })}${campoTexto({ id: 'ate', rotulo: 'Até', valor: params.get('ate') || '', tipo: 'date' })}</div>
      <p class="ajuda">O resumo conta cada recebimento ou pagamento pela data em que aconteceu.</p>`,
    acoes: `<a class="btn btn-linha" href="${BASE}">Cancelar</a><button type="submit" class="btn btn-cheio">Ver período</button>`
  });
  form.onsubmit = (e) => {
    e.preventDefault(); const er = {};
    if (!form.de.value) er.de = 'Informe o início.';
    if (!form.ate.value) er.ate = 'Informe o fim.'; else if (form.de.value && form.ate.value < form.de.value) er.ate = 'O fim deve ser depois do início.';
    if (!mostrarErros(form, er)) return;
    ir(`${BASE}?de=${form.de.value}&ate=${form.ate.value}`);
  };
  focarTitulo();
}

// ═══════════════════════════ NOVO / EDITAR (3 etapas) ══════════════════════
const lid = () => params.get('id') || '';
const chave = () => lid() ? 'fn:' + lid() : 'fn:novo';
const ler = () => lerRasc(chave());
const guardar = (m) => gravarRasc(chave(), { ...ler(), ...m });
const qs = (semConf) => { const p = new URLSearchParams(); if (lid()) p.set('id', lid()); if (!semConf && params.get('conf') === '1') p.set('conf', '1'); const s = p.toString(); return s ? '?' + s : ''; };
const tituloForm = (d) => lid() ? 'Editar lançamento' : (d && d.tipo === 'despesa' ? 'Nova despesa' : 'Nova receita');
const total = () => lid() ? 2 : 3;
async function hojeServidor() { const r = await api('fn_resumo', { query: { periodo: 'hoje' } }); return r.ok ? r.hoje : new Date().toISOString().slice(0, 10); }

async function prepararRascunho() {
  if (params.get('novo') === '1' && !lid()) {
    apagarRasc('fn:novo');
    const u = new URL(location.href); u.searchParams.delete('novo'); history.replaceState(null, '', u);
  }
  const ag = params.get('agendamento');
  let d = ler();
  if (d && (!ag || d.agendamento_id === ag)) return d;
  const hj = await hojeServidor();
  if (lid()) {
    const r = await api('fn_ver', { id: lid() });
    if (!r.ok) { telaErro('Editar lançamento', r.msg); return null; }
    const l = r.lancamento;
    if (l.cancelado) { telaErro('Editar lançamento', 'Lançamento cancelado não pode ser editado.', `${BASE}ver/?id=${encodeURIComponent(l.id)}`); return null; }
    d = { tipo: l.tipo, descricao: l.descricao, categoria: l.categoria, pessoa_tipo: l.pessoa_tipo || '', pessoa_id: l.pessoa_id || '', pessoa_nome: l.pessoa_nome || '',
      total: valorTexto(l.total_centavos), vencimento: l.vencimento, observacao: l.observacao || '', pago_centavos: l.pago_centavos, agendamento_id: l.agendamento_id || '', hoje: hj };
  } else if (ag) {
    const r = await api('fn_por_agendamento', { query: { id: ag } });
    if (!r.ok) { telaErro('Nova receita', r.msg, `/brow-studio/agenda/atendimento/?id=${encodeURIComponent(ag)}`); return null; }
    if (r.lancamento_id) { telaJaExiste(r.lancamento_id, ag); return null; }
    const a = r.atendimento;
    d = { chave_envio: uuid(), tipo: 'receita', descricao: `${a.servico_nome} — ${a.cliente_nome}`.slice(0, 120), categoria: 'atendimento', pessoa_tipo: 'cliente', pessoa_id: a.cliente_id, pessoa_nome: a.cliente_nome,
      total: valorTexto(a.valor_centavos), vencimento: a.data, observacao: '', agendamento_id: a.id, atendimento: { servico: a.servico_nome, profissional: a.profissional_nome, data: a.data, situacao: a.situacao },
      ini_valor: '0,00', ini_forma: '', ini_data: hj, hoje: hj };
  } else {
    d = { chave_envio: uuid(), tipo: TIPOS[params.get('tipo')] ? params.get('tipo') : 'receita', descricao: '', categoria: '', pessoa_tipo: '', pessoa_id: '', pessoa_nome: '',
      total: '', vencimento: hj, observacao: '', ini_valor: '0,00', ini_forma: '', ini_data: hj, hoje: hj };
  }
  gravarRasc(chave(), d);
  return d;
}
function telaJaExiste(id, ag) {
  pagina({
    titulo: 'Já existe lançamento', voltar: `/brow-studio/agenda/atendimento/documentos/?id=${encodeURIComponent(ag)}`, voltarTexto: 'Atendimento',
    corpo: avisoHTML('Este atendimento já tem uma receita no financeiro. Para não duplicar, abra a existente e registre o recebimento por lá.'),
    acoes: `<a class="btn btn-linha" href="/brow-studio/agenda/atendimento/documentos/?id=${encodeURIComponent(ag)}">${SETA} Voltar</a><a class="btn btn-cheio" href="${BASE}ver/?id=${encodeURIComponent(id)}">Abrir lançamento</a>`
  });
  focarTitulo();
}
function rodape(voltar, prox, cancelar) {
  const conf = params.get('conf') === '1';
  return `${cancelar ? `<a class="btn btn-linha" href="${voltar}" id="cancelar">Cancelar</a>` : `<a class="btn btn-linha" href="${voltar}">${SETA} Voltar</a>`}<button type="submit" class="btn btn-cheio">${conf ? 'Voltar à conferência' : (prox || 'Próximo <span aria-hidden="true">→</span>')}</button>`;
}
const irProx = (dest) => ir(params.get('conf') === '1' ? N + 'conferencia/' + qs(true) : dest);

async function etapaIdentificacao() {
  const d = await prepararRascunho(); if (!d) return;
  const voltaAg = d.agendamento_id && !lid() ? `/brow-studio/agenda/atendimento/documentos/?id=${encodeURIComponent(d.agendamento_id)}` : null;
  const cancelar = lid() ? `${BASE}ver/?id=${encodeURIComponent(lid())}` : (voltaAg || BASE);
  const quem = d.tipo === 'despesa' ? 'Fornecedor / destino' : 'Cliente / origem';
  const form = pagina({
    titulo: tituloForm(d), etapa: 1, etapasTotal: total(), formulario: true, voltar: cancelar, voltarTexto: 'Voltar',
    corpo: `${d.atendimento ? `<p class="etapa vinculo">Atendimento: ${esc(d.atendimento.servico)} · ${esc(d.atendimento.profissional)} · ${dataBR(d.atendimento.data)}</p>` : ''}
      ${d.agendamento_id || (lid() && d.pago_centavos > 0) ? `<input type="hidden" name="tipo" value="${d.tipo}">` : grupoOpcoes({ nome: 'tipo', legenda: 'Tipo', opcoes: TIPOS, valor: d.tipo })}
      ${campoTexto({ id: 'descricao', rotulo: 'Descrição', valor: d.descricao, attrs: 'maxlength="120" autocomplete="off"' })}
      <div class="campo"><label for="categoria">Categoria</label><select id="categoria" name="categoria"><option value="">Escolha…</option>${Object.entries(CATEGORIAS).map(([v, t]) => `<option value="${v}" ${v === d.categoria ? 'selected' : ''}>${t}</option>`).join('')}</select><span class="erro" id="categoria-erro" aria-live="polite"></span></div>
      <div class="campo pessoa-linha"><span class="rotulo-campo" id="quem-rotulo">${quem} <span class="opcional">(opcional)</span></span>
        <div class="pessoa-escolha"><strong>${d.pessoa_nome ? esc(d.pessoa_nome) : '<span class="ajuda">Nenhum</span>'}</strong><a class="btn btn-suave" href="${N}pessoa/${qs()}" id="escolher" aria-describedby="quem-rotulo">${d.pessoa_nome ? 'Trocar' : 'Escolher'}</a></div></div>
      <div class="duas-colunas">${campoTexto({ id: 'total', rotulo: 'Valor total (R$)', valor: d.total, attrs: 'inputmode="decimal" autocomplete="off" placeholder="Ex.: 65,00" maxlength="13"' })}
        ${campoTexto({ id: 'vencimento', rotulo: 'Vencimento', valor: d.vencimento, tipo: 'date' })}</div>
      ${campoTexto({ id: 'observacao', rotulo: 'Observação', valor: d.observacao, opcional: true, attrs: 'maxlength="300" autocomplete="off"' })}<div id="aviso"></div>`,
    acoes: rodape(cancelar, lid() ? 'Conferência <span aria-hidden="true">→</span>' : null, true)
  });
  $('#corpo').classList.add('fin-compacto');
  $('#cancelar').onclick = () => apagarRasc(chave());
  const lerForm = () => ({ tipo: (form.querySelector('[name=tipo]:checked') || form.querySelector('input[type=hidden][name=tipo]') || {}).value || '', descricao: form.descricao.value, categoria: form.categoria.value,
    total: form.total.value, vencimento: form.vencimento.value, observacao: form.observacao.value });
  form.addEventListener('input', () => guardar(lerForm()));
  form.addEventListener('change', (e) => { guardar(lerForm()); if (e.target.name === 'tipo') { $('#quem-rotulo').firstChild.textContent = (e.target.value === 'despesa' ? 'Fornecedor / destino' : 'Cliente / origem') + ' '; $('#titulo').textContent = tituloForm(lerForm()); } });
  form.onsubmit = (ev) => {
    ev.preventDefault(); const v = lerForm(); const er = {};
    if (!v.tipo) er.tipo = 'Escolha Receita ou Despesa.';
    if (v.descricao.trim().length < 2) er.descricao = 'Informe a descrição.';
    if (!v.categoria) er.categoria = 'Escolha a categoria.';
    const t = centavos(v.total);
    if (!t) er.total = 'Informe o valor total, maior que zero. Ex.: 65,00';
    else if (lid() && t < (d.pago_centavos || 0)) er.total = `Já foram registrados ${reais(d.pago_centavos)}. Para reduzir abaixo disso, estorne o registro excedente antes.`;
    else if (!lid() && centavos(d.ini_valor) > t) guardar({ ini_valor: valorTexto(t) });
    if (!v.vencimento) er.vencimento = 'Informe o vencimento.';
    if (!mostrarErros(form, er)) return;
    guardar(v);
    if (lid()) ir(N + 'conferencia/' + qs(true)); else irProx(N + 'pagamento/' + qs());
  };
  focarTitulo();
}

// escolha de cliente (origem) ou contato (destino) já cadastrados
async function telaPessoa() {
  const d = ler(); if (!d) return ir(N + qs());
  const volta = N + qs();
  let de = d.pessoa_tipo === 'contato' || (!d.pessoa_tipo && d.tipo === 'despesa') ? 'contato' : 'cliente';
  pagina({
    titulo: d.tipo === 'despesa' ? 'Fornecedor / destino' : 'Cliente / origem', voltar: volta, voltarTexto: 'Voltar',
    corpo: `<div class="filtros-chips chips-2" role="radiogroup" aria-label="Cadastro"><label class="opcao opcao-chip"><input type="radio" name="de" value="cliente" ${de === 'cliente' ? 'checked' : ''}><span>Clientes</span></label><label class="opcao opcao-chip"><input type="radio" name="de" value="contato" ${de === 'contato' ? 'checked' : ''}><span>Contatos do estúdio</span></label></div>
      <form class="busca" role="search" id="form-busca"><div class="campo"><label for="q">Buscar pelo nome</label><input id="q" type="search" autocomplete="off"></div></form>
      <ul class="lista" id="lista" aria-label="Cadastros"></ul>
      <form id="form-livre" class="linha-livre"><div class="campo"><label for="livre">Sem cadastro: digite o nome</label><input id="livre" maxlength="100" autocomplete="off"></div><button type="submit" class="btn btn-linha">Usar</button></form>
      <span class="erro" id="livre-erro" aria-live="polite"></span>`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar</a>${d.pessoa_nome ? '<button type="button" class="btn btn-linha" id="remover">Remover</button>' : ''}`
  });
  const escolher = (tipo, id, nome) => { guardar({ pessoa_tipo: tipo, pessoa_id: id || '', pessoa_nome: nome || '' }); ir(volta); };
  let vez = 0;
  async function carregar() {
    const minha = ++vez;
    const lim = cabem($('#lista'), 60, 82 + 110);
    const r = await api('fn_pessoas', { query: { de, q: $('#q').value.trim(), limite: lim } });
    if (minha !== vez) return;
    $('#lista').innerHTML = r.ok && r.itens.length ? r.itens.map(x => `<li class="item"><div class="item-info"><div class="item-nome">${esc(x.nome)}</div>${x.extra ? `<div class="item-extra">${esc(x.extra)}</div>` : ''}</div>
        <button type="button" class="btn btn-linha" data-id="${esc(x.id)}" data-nome="${esc(x.nome)}" aria-label="Escolher ${esc(x.nome)}">Escolher</button></li>`).join('')
      : `<li class="vazio vazio-curto"><p>${r.ok ? 'Nenhum cadastro encontrado.' : esc(r.msg)}</p></li>`;
    $('#lista').querySelectorAll('[data-id]').forEach(b => b.onclick = () => escolher(de, b.dataset.id, b.dataset.nome));
  }
  let t; $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(carregar, 300); });
  $('#form-busca').onsubmit = (e) => { e.preventDefault(); carregar(); };
  app.querySelectorAll('[name=de]').forEach(i => i.onchange = () => { de = i.value; carregar(); });
  $('#form-livre').onsubmit = (e) => { e.preventDefault(); const n = $('#livre').value.trim(); if (n.length < 2) { $('#livre-erro').textContent = 'Digite o nome.'; $('#livre').focus(); return; } escolher('livre', '', n); };
  if ($('#remover')) $('#remover').onclick = () => escolher('', '', '');
  carregar();
  focarTitulo();
}

function etapaPagamento() {
  const d = ler(); if (!d || !d.descricao) return ir(N + qs());
  if (lid()) return ir(N + 'conferencia/' + qs(true));
  const t = centavos(d.total) || 0; const verbo = d.tipo === 'despesa' ? 'pago' : 'recebido';
  const form = pagina({
    titulo: tituloForm(d), etapa: 2, etapasTotal: 3, formulario: true, voltar: N + qs(), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Pagamento inicial · total ${reais(t)}</p>
      <div class="linha-livre">${campoTexto({ id: 'ini_valor', rotulo: `Valor já ${verbo} (R$)`, valor: d.ini_valor, attrs: 'inputmode="decimal" autocomplete="off" maxlength="13"' })}
      <button type="button" class="btn btn-suave" id="pendente">Tudo pendente</button></div>
      <p class="ajuda" style="margin-top:-4px">Aceita sinal ou parte do valor. 0,00 = tudo pendente.</p>
      ${grupoOpcoes({ nome: 'ini_forma', legenda: 'Forma', opcoes: FORMAS, valor: d.ini_forma, colunas: 3 })}
      ${campoTexto({ id: 'ini_data', rotulo: `Data em que foi ${verbo}`, valor: d.ini_data, tipo: 'date', attrs: `max="${d.hoje || ''}"` })}
      <p class="ajuda">Cartão é só registro manual: sem operadora, taxas ou número do cartão.</p><div id="aviso"></div>`,
    acoes: rodape(N + qs())
  });
  $('#corpo').classList.add('fin-compacto');
  const lerForm = () => ({ ini_valor: form.ini_valor.value, ini_forma: (form.querySelector('[name=ini_forma]:checked') || {}).value || '', ini_data: form.ini_data.value });
  form.addEventListener('input', () => guardar(lerForm())); form.addEventListener('change', () => guardar(lerForm()));
  $('#pendente').onclick = () => { form.ini_valor.value = '0,00'; form.querySelectorAll('[name=ini_forma]').forEach(i => { i.checked = false; }); guardar(lerForm()); mostrarErros(form, {}); };
  form.onsubmit = (ev) => {
    ev.preventDefault(); const v = lerForm(); const er = {};
    const c = centavos(v.ini_valor || '0');
    if (c === null) er.ini_valor = 'Valor inválido. Ex.: 20,00';
    else if (c > t) er.ini_valor = `Não pode passar do total (${reais(t)}).`;
    else if (c > 0) {
      if (!v.ini_forma) er.ini_forma = 'Escolha a forma.';
      if (!v.ini_data) er.ini_data = 'Informe a data.'; else if (d.hoje && v.ini_data > d.hoje) er.ini_data = 'A data não pode ser futura.';
    }
    if (!mostrarErros(form, er)) return;
    guardar({ ...v, ini_valor: valorTexto(c) }); ir(N + 'conferencia/' + qs(true));
  };
  focarTitulo();
}

async function etapaConferencia() {
  const d = ler(); if (!d || !d.descricao) return ir(N + qs());
  const t = centavos(d.total) || 0;
  const pago = lid() ? (d.pago_centavos || 0) : (centavos(d.ini_valor || '0') || 0);
  const sit = situacaoDe(t, pago); const verbo = recebido(d.tipo);
  const corr = (e) => `${N}${e}${lid() ? `?id=${encodeURIComponent(lid())}&conf=1` : '?conf=1'}`;
  pagina({
    titulo: tituloForm(d), etapa: total(), etapasTotal: total(), voltar: lid() ? N + qs(true) : N + 'pagamento/' + qs(true), voltarTexto: 'Voltar',
    corpo: `<div class="resumo resumo-ct">
        ${blocoResumo('Lançamento', [['Tipo', TIPOS[d.tipo]], ['Descrição', d.descricao], ['Categoria', CATEGORIAS[d.categoria]], [d.tipo === 'despesa' ? 'Destino' : 'Origem', d.pessoa_nome], ['Vencimento', dataBR(d.vencimento)], ['Observação', d.observacao]], corr(''))}
        ${blocoResumo('Valores', [['Total', reais(t)], [`Já ${verbo}`, reais(pago) + (!lid() && pago ? ` · ${FORMAS[d.ini_forma] || ''} em ${dataBR(d.ini_data)}` : '')], ['Saldo pendente', reais(t - pago)], ['Situação', SITUACOES[sit]]], lid() ? corr('') : corr('pagamento/'))}
      </div>${lid() ? '<p class="ajuda">Pagamentos já registrados não mudam aqui: use “Registrar” ou estorne no histórico.</p>' : ''}<div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${lid() ? N + qs(true) : N + 'pagamento/' + qs(true)}">${SETA} Voltar</a><button type="button" class="btn btn-cheio" id="salvar">${lid() ? 'Salvar alterações' : 'Salvar lançamento'}</button>`
  });
  let env = false;
  $('#salvar').onclick = async () => {
    if (env) return; env = true;
    const b = $('#salvar'); b.disabled = true; b.textContent = 'Salvando…';
    const r = await api('fn_salvar', { corpo: { id: lid() || undefined, chave_envio: lid() ? undefined : d.chave_envio, tipo: d.tipo, descricao: d.descricao, categoria: d.categoria,
      pessoa_tipo: d.pessoa_tipo || null, pessoa_id: d.pessoa_id || null, pessoa_nome: d.pessoa_nome || null, total: d.total, vencimento: d.vencimento, observacao: d.observacao,
      agendamento_id: d.agendamento_id || undefined, ini_valor: lid() ? undefined : d.ini_valor, ini_forma: d.ini_forma, ini_data: d.ini_data } });
    if (r.ok) { apagarRasc(chave()); recado.pôr(lid() ? 'Lançamento atualizado.' : 'Lançamento salvo.'); location.replace(`${BASE}ver/?id=${encodeURIComponent(r.id)}`); return; }
    if (r.erro === 'ja_existe' && r.id) { apagarRasc(chave()); return telaJaExiste(r.id, d.agendamento_id); }
    env = false; b.disabled = false; b.textContent = 'Tentar novamente';
    $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível salvar.') + (r.erros ? ' ' + esc(Object.values(r.erros).join(' ')) : '') + '<br><small>Os dados continuam aqui.</small>', 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ LISTA DE LANÇAMENTOS ══════════════════════════
function filtrosAtuais() { const f = {}; for (const k of ['tipo', 'situacao', 'de', 'ate', 'q']) if (params.get(k)) f[k] = params.get(k); return f; }
function textoFiltros(f) {
  const p = [];
  if (f.de || f.ate) p.push(`vencimento ${f.de ? dataCurta(f.de) : '…'} a ${f.ate ? dataCurta(f.ate) : '…'}`);
  if (f.tipo) p.push(f.tipo === 'receita' ? 'receitas' : 'despesas');
  if (f.situacao) p.push(f.situacao === 'vencido' ? 'vencidos' : SITUACOES[f.situacao].toLowerCase());
  return p.length ? p.join(' · ') : 'todos';
}
async function telaLista() {
  const f = filtrosAtuais(); const msg = recado.tirar();
  const qsF = (x) => { const u = new URLSearchParams(x); const s = u.toString(); return s ? '?' + s : ''; };
  pagina({
    titulo: 'Lançamentos', voltar: BASE, voltarTexto: 'Financeiro',
    extra: `<a class="btn btn-cheio btn-topo" href="${N}?novo=1" aria-label="Novo lançamento">+ Novo</a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      <form class="busca" role="search" id="form-busca"><div class="campo"><label for="q">Buscar por descrição, cliente ou fornecedor</label><input id="q" type="search" autocomplete="off" value="${esc(f.q || '')}"></div></form>
      <div class="linha-filtros"><p><strong>Filtros:</strong> <span id="ftxt">${esc(textoFiltros(f))}</span><br><small>Filtra pelo vencimento — o resumo do financeiro usa a data dos pagamentos.</small></p>
        <a class="btn btn-suave" id="filtros" href="${BASE}lancamentos/filtros/${qsF(f)}">Filtros</a></div>
      <div id="estado"></div><ul class="lista" id="lista" aria-label="Lançamentos"></ul>${navPaginas('nav')}`
  });
  let pg = 1, vez = 0, ajuste = 0;
  async function carregar() {
    const minha = ++vez;
    const lim = ajuste || cabem($('#lista'), window.innerHeight <= 760 ? 70 : 78, 52 + 20);
    const termo = $('#q').value.trim();
    const r = await api('fn_listar', { query: { ...f, q: termo, pagina: pg, limite: lim } });
    if (minha !== vez) return;
    if (!r.ok) { $('#estado').innerHTML = avisoHTML(esc(r.msg), 'erro'); $('#lista').innerHTML = ''; return; }
    const nf = { ...f }; termo ? nf.q = termo : delete nf.q; history.replaceState(null, '', BASE + 'lancamentos/' + qsF(nf)); $('#filtros').href = BASE + 'lancamentos/filtros/' + qsF(nf);
    $('#lista').innerHTML = r.total ? r.itens.map(x => `<li class="item fin-item${x.vencido ? ' fin-vencido' : ''}${x.situacao === 'cancelado' ? ' item-inativo' : ''}"><div class="item-info">
        <div class="item-nome"><span class="tipo-${x.tipo}" aria-label="${x.tipo_nome}">${x.tipo === 'receita' ? '↓' : '↑'}</span> ${esc(x.descricao)}</div>
        <div class="item-extra"><strong>${reais(x.total_centavos)}</strong> · vence ${dataCurta(x.vencimento)} · ${x.vencido ? `<strong class="txt-vencido">Vencido · falta ${reais(x.saldo_centavos)}</strong>` : SITUACOES[x.situacao]}${x.pessoa_nome ? ' · ' + esc(x.pessoa_nome) : ''}</div></div>
        <a class="btn btn-linha" href="${BASE}ver/?id=${encodeURIComponent(x.id)}" aria-label="Abrir ${esc(x.descricao)}">Abrir</a></li>`).join('')
      : `<li class="vazio"><span class="avatar grande" aria-hidden="true">✦</span><h2>${termo || Object.keys(f).length ? 'Nenhum lançamento encontrado' : 'Nenhum lançamento'}</h2><p>${termo || Object.keys(f).length ? 'Tente outra busca ou ajuste os filtros.' : 'Use “+ Novo” para registrar uma receita ou despesa.'}</p></li>`;
    ligarNav($('#nav'), { ...r, rotulo: 'lançamentos' }, (n) => { pg = n; carregar(); });
    if (passou() && lim > 2 && r.itens.length >= lim) { ajuste = lim - 1; carregar(); }
  }
  let t; $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { pg = 1; carregar(); }, 300); });
  $('#form-busca').onsubmit = (e) => { e.preventDefault(); pg = 1; carregar(); };
  // a busca digitada vale na hora, mesmo antes de a lista recarregar
  $('#filtros').onclick = () => { const nf = { ...f }; const termo = $('#q').value.trim(); termo ? nf.q = termo : delete nf.q; $('#filtros').href = BASE + 'lancamentos/filtros/' + qsF(nf); };
  carregar(); focarTitulo();
}
function telaFiltros() {
  const f = filtrosAtuais();
  const form = pagina({
    titulo: 'Filtrar lançamentos', voltar: BASE + 'lancamentos/' + location.search, voltarTexto: 'Lançamentos', formulario: true,
    corpo: `${grupoOpcoes({ nome: 'tipo', legenda: 'Tipo', opcoes: { '': 'Todos', receita: 'Receitas', despesa: 'Despesas' }, valor: f.tipo || '', colunas: 3 })}
      ${grupoOpcoes({ nome: 'situacao', legenda: 'Situação', opcoes: { '': 'Todas', pendente: 'Pendente', parcial: 'Parcial', quitado: 'Quitado', cancelado: 'Cancelado', vencido: 'Vencidos' }, valor: f.situacao || '', colunas: 3 })}
      <fieldset class="campo"><legend>Vencimento</legend><div class="duas-colunas">${campoTexto({ id: 'de', rotulo: 'De', valor: f.de || '', tipo: 'date' })}${campoTexto({ id: 'ate', rotulo: 'Até', valor: f.ate || '', tipo: 'date' })}</div>
      <span class="ajuda">Este filtro usa a data de VENCIMENTO. O resumo do financeiro usa a data em que cada valor foi recebido ou pago.</span></fieldset>`,
    acoes: `<a class="btn btn-linha" href="${BASE}lancamentos/${f.q ? '?q=' + encodeURIComponent(f.q) : ''}">Limpar</a><button type="submit" class="btn btn-cheio">Aplicar</button>`
  });
  $('#corpo').classList.add('fin-compacto');
  form.onsubmit = (e) => {
    e.preventDefault();
    if (form.de.value && form.ate.value && form.ate.value < form.de.value) return mostrarErros(form, { ate: 'O fim deve ser depois do início.' });
    const u = new URLSearchParams();
    const tp = (form.querySelector('[name=tipo]:checked') || {}).value, st = (form.querySelector('[name=situacao]:checked') || {}).value;
    if (tp) u.set('tipo', tp); if (st) u.set('situacao', st); if (form.de.value) u.set('de', form.de.value); if (form.ate.value) u.set('ate', form.ate.value); if (f.q) u.set('q', f.q);
    ir(BASE + 'lancamentos/' + (u.toString() ? '?' + u : ''));
  };
  focarTitulo();
}

// ═══════════════════════════ DETALHES ══════════════════════════════════════
async function telaVer() {
  carregando('Lançamento');
  const r = await api('fn_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Lançamento', r.msg, BASE + 'lancamentos/');
  const l = r.lancamento; const q = encodeURIComponent(l.id); const msg = recado.tirar(); const verbo = recebido(l.tipo);
  const at = r.atendimento;
  pagina({
    titulo: l.tipo === 'despesa' ? 'Despesa' : 'Receita', voltar: BASE + 'lancamentos/', voltarTexto: 'Lançamentos',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      <div class="servico-cabeca"><h2>${esc(l.descricao)}</h2><span>${seloFin(l.situacao, l.vencido)}</span></div>
      ${l.vencido ? avisoHTML(`Saldo vencido desde ${dataBR(l.vencimento)}.`, 'erro') : ''}${l.cancelado ? avisoHTML(`Cancelado${l.cancel_motivo ? ': ' + esc(l.cancel_motivo) : ''}. O registro fica guardado.`) : ''}
      <div class="fin-valores"><div><span>Total</span><strong>${reais(l.total_centavos)}</strong></div><div><span>Total ${verbo}</span><strong>${reais(l.pago_centavos)}</strong></div><div><span>Saldo pendente</span><strong class="${l.saldo_centavos ? 'txt-pendente' : ''}">${reais(l.saldo_centavos)}</strong></div></div>
      <div class="resumo">${blocoResumo('Dados', [['Vencimento', dataBR(l.vencimento)], ['Categoria', l.categoria_nome], [l.tipo === 'despesa' ? 'Destino' : 'Origem', l.pessoa_nome],
        ...(l.agendamento_id ? [['Atendimento', `${l.servico_nome || ''} · ${l.profissional_nome || ''}${at ? ` · na agenda: ${AG_SIT[at.situacao] || at.situacao}` : ''}`]] : []),
        ['Observação', l.observacao], ['Autoria', l.criado_por || 'login pendente']])}</div>
      ${l.agendamento_id ? '<p class="ajuda">Situação na agenda e pagamento são independentes.</p>' : ''}
      <nav class="acoes-grade" aria-label="Ações do lançamento">
        ${!l.cancelado && l.saldo_centavos > 0 ? `<a class="btn btn-cheio" href="${BASE}baixa/?id=${q}">${l.tipo === 'despesa' ? 'Registrar pagamento' : 'Registrar recebimento'}</a>` : ''}
        <a class="btn btn-suave" href="${BASE}historico/?id=${q}">Histórico (${l.movimentos_total})</a>
        ${l.cancelado ? '' : `<a class="btn btn-suave" href="${N}?id=${q}" id="editar">Editar</a>`}
        <a class="btn btn-suave" href="${BASE}alteracoes/?id=${q}">Alterações</a>
        ${l.cancelado ? '' : `<a class="btn btn-perigo" href="${BASE}cancelar/?id=${q}">Cancelar lançamento</a>`}
        ${l.agendamento_id ? `<a class="btn btn-suave" href="/brow-studio/agenda/atendimento/?id=${encodeURIComponent(l.agendamento_id)}">Ver atendimento</a>` : ''}
      </nav>`,
    acoes: `<a class="btn btn-linha" href="${BASE}lancamentos/">${SETA} Voltar à lista</a>`
  });
  if ($('#editar')) $('#editar').onclick = () => apagarRasc('fn:' + l.id);
  focarTitulo();
}

// ═══════════════════════════ BAIXA PARCIAL ═════════════════════════════════
async function telaBaixa() {
  carregando('Registrar');
  const r = await api('fn_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Registrar', r.msg, BASE + 'lancamentos/');
  const l = r.lancamento; const volta = `${BASE}ver/?id=${encodeURIComponent(l.id)}`; const verbo = recebido(l.tipo);
  const T = l.tipo === 'despesa' ? 'Registrar pagamento' : 'Registrar recebimento';
  if (l.cancelado || l.saldo_centavos <= 0) return telaErro(T, l.cancelado ? 'Lançamento cancelado.' : 'Este lançamento já está quitado.', volta);
  const ch = 'fn:baixa:' + l.id; const rasc = lerRasc(ch) || { chave_envio: uuid() }; gravarRasc(ch, rasc);
  const form = pagina({
    titulo: T, voltar: volta, voltarTexto: 'Lançamento', formulario: true,
    corpo: `<div class="bloco"><div class="servico-cabeca"><h2>${esc(l.descricao)}</h2>${seloFin(l.situacao, l.vencido)}</div>
        <p class="ajuda">Total ${reais(l.total_centavos)} · já ${verbo} ${reais(l.pago_centavos)} · <strong>saldo ${reais(l.saldo_centavos)}</strong></p></div>
      ${campoTexto({ id: 'valor', rotulo: 'Valor (R$)', valor: rasc.valor || valorTexto(l.saldo_centavos), attrs: 'inputmode="decimal" autocomplete="off" maxlength="13"', ajuda: `Até ${reais(l.saldo_centavos)} (saldo restante).` })}
      ${grupoOpcoes({ nome: 'forma', legenda: 'Forma', opcoes: FORMAS, valor: rasc.forma || '', colunas: 3 })}
      ${campoTexto({ id: 'data', rotulo: `Data em que foi ${verbo}`, valor: rasc.data || r.hoje, tipo: 'date', attrs: `max="${r.hoje}"` })}
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}" id="cancelar">Cancelar</a><button type="submit" class="btn btn-cheio" id="salvar">Registrar</button>`
  });
  const lerForm = () => ({ valor: form.valor.value, forma: (form.querySelector('[name=forma]:checked') || {}).value || '', data: form.data.value });
  form.addEventListener('input', () => gravarRasc(ch, { ...rasc, ...lerForm() })); form.addEventListener('change', () => gravarRasc(ch, { ...rasc, ...lerForm() }));
  $('#cancelar').onclick = () => apagarRasc(ch);
  let env = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (env) return;
    const v = lerForm(); const er = {}; const c = centavos(v.valor);
    if (!c) er.valor = 'Informe um valor maior que zero.'; else if (c > l.saldo_centavos) er.valor = `Passa do saldo pendente (${reais(l.saldo_centavos)}).`;
    if (!v.forma) er.forma = 'Escolha a forma.';
    if (!v.data) er.data = 'Informe a data.'; else if (v.data > r.hoje) er.data = 'A data não pode ser futura.';
    if (!mostrarErros(form, er)) return;
    env = true; const b = $('#salvar'); b.disabled = true; b.textContent = 'Salvando…';
    const rr = await api('fn_baixar', { corpo: { id: l.id, chave_envio: rasc.chave_envio, ...v } });
    if (rr.ok) { apagarRasc(ch); recado.pôr(`${l.tipo === 'despesa' ? 'Pagamento' : 'Recebimento'} de ${reais(c)} registrado.`); location.replace(volta); return; }
    env = false; b.disabled = false; b.textContent = 'Tentar novamente';
    if (rr.erros) mostrarErros(form, rr.erros);
    $('#aviso').innerHTML = avisoHTML(esc(rr.erros ? Object.values(rr.erros).join(' ') : (rr.msg || 'Não foi possível registrar.')) + '<br><small>Os dados continuam aqui.</small>', 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ HISTÓRICO / ESTORNO ═══════════════════════════
async function telaHistorico() {
  const id = params.get('id'); const volta = `${BASE}ver/?id=${encodeURIComponent(id)}`;
  const msg = recado.tirar();
  pagina({
    titulo: 'Histórico de pagamentos', voltar: volta, voltarTexto: 'Lançamento',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<p class="ajuda">Nada é apagado: registros errados são estornados, com motivo.</p><ul class="lista" id="lista" aria-label="Recebimentos e pagamentos"></ul>${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar ao lançamento</a>`
  });
  let pg = 1, ajuste = 0;
  async function carregar() {
    const lim = ajuste || cabem($('#lista'), 74, 82 + 52);
    const r = await api('fn_movimentos', { query: { id, pagina: pg, limite: lim } });
    if (!r.ok) { $('#lista').innerHTML = `<li>${avisoHTML(esc(r.msg), 'erro')}</li>`; return; }
    $('#lista').innerHTML = r.total ? r.itens.map(x => `<li class="item${x.estornado ? ' item-inativo' : ''}"><div class="item-info">
        <div class="item-nome">${x.estornado ? '<s>' : ''}${reais(x.valor_centavos)}${x.estornado ? '</s> · estornado' : ''} · ${esc(x.forma_nome)}</div>
        <div class="item-extra">${dataBR(x.data)}${x.inicial ? ' · inicial' : ''} · ${esc(x.responsavel || 'login pendente')}${x.estornado ? ` · motivo: ${esc(x.estorno_motivo)}` : ''}</div></div>
        ${x.estornado ? '' : `<a class="btn btn-linha" href="${BASE}estorno/?mov=${encodeURIComponent(x.id)}" aria-label="Estornar ${reais(x.valor_centavos)} de ${dataBR(x.data)}">Estornar</a>`}</li>`).join('')
      : '<li class="vazio vazio-curto"><p>Nenhum recebimento ou pagamento registrado.</p></li>';
    ligarNav($('#nav'), { ...r, rotulo: 'registros' }, (n) => { pg = n; carregar(); });
    if (passou() && lim > 2 && r.itens.length >= lim) { ajuste = lim - 1; carregar(); }
  }
  carregar(); focarTitulo();
}
async function telaEstorno() {
  carregando('Estornar registro');
  const r = await api('fn_movimento', { query: { id: params.get('mov') } });
  if (!r.ok) return telaErro('Estornar registro', r.msg, BASE + 'lancamentos/');
  const m = r.movimento; const volta = `${BASE}historico/?id=${encodeURIComponent(m.lancamento_id)}`;
  if (m.estornado) return telaErro('Estornar registro', 'Este registro já foi estornado.', volta);
  const form = pagina({
    titulo: 'Estornar registro?', voltar: volta, voltarTexto: 'Histórico', formulario: true,
    corpo: `<div class="bloco"><div class="servico-cabeca"><h2>${reais(m.valor_centavos)} · ${esc(m.forma_nome)}</h2></div><p class="ajuda">${esc(m.descricao)} · ${dataBR(m.data)}</p></div>
      ${avisoHTML('O registro continua no histórico, marcado como estornado, e o saldo pendente volta a aumentar. <strong>Estornar no sistema não devolve dinheiro</strong> pelo banco, Pix ou cartão.')}
      <div class="campo"><label for="motivo">Motivo</label><textarea id="motivo" name="motivo" maxlength="300" rows="2" class="curta"></textarea><span class="erro" id="motivo-erro" aria-live="polite"></span></div>
      <label class="chave"><input type="checkbox" name="confirmacao"><span><strong>Confirmo o estorno deste registro</strong></span></label><span class="erro" id="confirmacao-erro"></span><div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Cancelar</a><button type="submit" class="btn btn-perigo-cheio" id="estornar">Estornar</button>`
  });
  let env = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (env) return; const er = {};
    if (form.motivo.value.trim().length < 3) er.motivo = 'Informe o motivo.';
    if (!form.confirmacao.checked) er.confirmacao = 'Marque a confirmação.';
    if (!mostrarErros(form, er)) return;
    env = true; $('#estornar').disabled = true;
    const rr = await api('fn_estornar', { corpo: { id: m.id, motivo: form.motivo.value, confirmacao: true } });
    if (rr.ok) { recado.pôr('Registro estornado. Saldo recalculado.'); location.replace(volta); return; }
    env = false; $('#estornar').disabled = false; $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível estornar.'), 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ CANCELAR / ALTERAÇÕES ═════════════════════════
async function telaCancelar() {
  carregando('Cancelar lançamento');
  const r = await api('fn_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Cancelar lançamento', r.msg, BASE + 'lancamentos/');
  const l = r.lancamento; const volta = `${BASE}ver/?id=${encodeURIComponent(l.id)}`;
  if (l.cancelado) return telaErro('Cancelar lançamento', 'Este lançamento já está cancelado.', volta);
  const cab = `<div class="bloco"><div class="servico-cabeca"><h2>${esc(l.descricao)}</h2>${seloFin(l.situacao, l.vencido)}</div><p class="ajuda">${TIPOS[l.tipo]} · ${reais(l.total_centavos)} · vence ${dataBR(l.vencimento)}</p></div>`;
  if (l.movimentos_ativos > 0) {
    pagina({
      titulo: 'Cancelar lançamento', voltar: volta, voltarTexto: 'Lançamento',
      corpo: `${cab}${avisoHTML(`Há <strong>${l.movimentos_ativos} registro(s)</strong> de ${l.tipo === 'despesa' ? 'pagamento' : 'recebimento'} (${reais(l.pago_centavos)}). Estorne cada um no histórico antes de cancelar.`, 'erro')}`,
      acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar</a><a class="btn btn-cheio" href="${BASE}historico/?id=${encodeURIComponent(l.id)}">Abrir histórico</a>`
    });
    return focarTitulo();
  }
  const form = pagina({
    titulo: 'Cancelar lançamento?', voltar: volta, voltarTexto: 'Lançamento', formulario: true,
    corpo: `${cab}${avisoHTML('O lançamento fica guardado como Cancelado (filtro “Cancelado”) e deixa de contar como pendente.')}
      <div class="campo"><label for="motivo">Motivo</label><textarea id="motivo" name="motivo" maxlength="300" rows="2" class="curta"></textarea><span class="erro" id="motivo-erro" aria-live="polite"></span></div>
      <label class="chave"><input type="checkbox" name="confirmacao"><span><strong>Confirmo o cancelamento</strong></span></label><span class="erro" id="confirmacao-erro"></span><div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Voltar</a><button type="submit" class="btn btn-perigo-cheio" id="confirmar">Cancelar lançamento</button>`
  });
  let env = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (env) return; const er = {};
    if (form.motivo.value.trim().length < 3) er.motivo = 'Informe o motivo.';
    if (!form.confirmacao.checked) er.confirmacao = 'Marque a confirmação.';
    if (!mostrarErros(form, er)) return;
    env = true;
    const rr = await api('fn_cancelar', { corpo: { id: l.id, motivo: form.motivo.value, confirmacao: true } });
    if (rr.ok) { recado.pôr('Lançamento cancelado.'); location.replace(volta); return; }
    env = false; $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível cancelar.'), 'erro');
  };
  focarTitulo();
}
const NOMES_CAMPO = { tipo: 'tipo', descricao: 'descrição', categoria: 'categoria', pessoa_nome: 'origem/destino', total_centavos: 'total', vencimento: 'vencimento', observacao: 'observação' };
function descreverAlteracao(x) {
  const d = x.detalhes || {}; const autor = d.autor || 'login pendente';
  if (x.acao === 'criado') return [`Criado · total ${reais(d.total)}`, autor];
  if (x.acao === 'baixa') return [`${d.inicial ? 'Pagamento inicial' : 'Registro'} de ${reais(d.valor)} · ${FORMAS[d.forma] || d.forma} · ${dataBR(d.data)}`, autor];
  if (x.acao === 'estorno') return [`Estorno de ${reais(d.valor)} · motivo: ${d.motivo}`, autor];
  if (x.acao === 'cancelado') return [`Cancelado · motivo: ${d.motivo}`, autor];
  if (x.acao === 'editado') return ['Editado: ' + Object.entries(d.mudancas || {}).filter(([k]) => NOMES_CAMPO[k]).map(([k, v]) => k === 'total_centavos' ? `total ${reais(v.de)} → ${reais(v.para)}` : NOMES_CAMPO[k]).join(', '), autor];
  return [x.acao, autor];
}
async function telaAlteracoes() {
  const id = params.get('id'); const volta = `${BASE}ver/?id=${encodeURIComponent(id)}`;
  pagina({
    titulo: 'Alterações', voltar: volta, voltarTexto: 'Lançamento',
    corpo: `<ul class="lista linha-tempo" id="lista" aria-label="Alterações"></ul>${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar ao lançamento</a>`
  });
  let pg = 1, ajuste = 0;
  async function carregar() {
    const lim = ajuste || cabem($('#lista'), 66, 82 + 52);
    const r = await api('fn_alteracoes', { query: { id, pagina: pg, limite: lim } });
    if (!r.ok) { $('#lista').innerHTML = `<li>${avisoHTML(esc(r.msg), 'erro')}</li>`; return; }
    $('#lista').innerHTML = r.itens.map(x => { const [t, a] = descreverAlteracao(x); return `<li class="evento"><strong>${esc(t)}</strong><small>${esc(dataHora(x.criado_em))} · ${esc(a)}</small></li>`; }).join('') || '<li class="vazio vazio-curto"><p>Sem alterações.</p></li>';
    ligarNav($('#nav'), { ...r, rotulo: 'eventos' }, (n) => { pg = n; carregar(); });
    if (passou() && lim > 2 && r.itens.length >= lim) { ajuste = lim - 1; carregar(); }
  }
  carregar(); focarTitulo();
}

// ─── roteamento ─────────────────────────────────────────────────────────────
const TELAS = { painel: telaPainel, periodo: telaPeriodo, identificacao: etapaIdentificacao, pessoa: telaPessoa, pagamento: etapaPagamento, conferencia: etapaConferencia,
  lista: telaLista, filtros: telaFiltros, ver: telaVer, baixa: telaBaixa, historico: telaHistorico, estorno: telaEstorno, cancelar: telaCancelar, alteracoes: telaAlteracoes };
(async () => {
  const pg = document.body.dataset.pagina;
  if (lid() && ['pessoa', 'conferencia'].includes(pg) && !ler()) { carregando('Lançamento'); if (!(await prepararRascunho())) return; }
  (TELAS[pg] || telaPainel)();
})();
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
