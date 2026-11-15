// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — RELATÓRIOS (10/11/2026)
// Menu → filtros → resumo → detalhes, cada um em página própria. Os filtros
// viajam SÓ na URL (tipo, de, ate, prof): voltar pelo aparelho mantém tudo e
// nada pessoal é guardado no navegador. Totais e detalhes vêm do servidor,
// calculados sobre todos os registros filtrados.
// ═══════════════════════════════════════════════════════════════════════════
import { $, params, esc, api, SETA, pagina, campoTexto, mostrarErros, avisoHTML, focarTitulo, ir } from './comum.js?v=4';

const BASE = '/brow-studio/relatorios/';
const TIPOS = { financeiro: 'Financeiro', atendimentos: 'Atendimentos', servicos: 'Serviços', clientes: 'Clientes' };
const SIT = { agendado: 'Agendados', confirmado: 'Confirmados', chegou: 'Chegou', em_atendimento: 'Em atendimento', concluido: 'Concluídos', cancelado: 'Cancelados', falta: 'Faltas' };
const CAT = { recebimentos: 'Recebimentos', despesas: 'Despesas pagas', a_receber: 'A receber' };
const app = document.getElementById('app');
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
function reais(c) { c = Number(c) || 0; const s = String(Math.abs(c)).padStart(3, '0'); return `${c < 0 ? '− ' : ''}R$ ${s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${s.slice(-2)}`; }
const dataBR = (s) => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '';

// ─── filtros na URL ─────────────────────────────────────────────────────────
const F = () => ({ tipo: params.get('tipo') || '', de: params.get('de') || '', ate: params.get('ate') || '', prof: params.get('prof') || '' });
const qsF = (extra = {}) => { const f = F(); const u = new URLSearchParams(); for (const k of ['tipo', 'de', 'ate', 'prof']) if (f[k]) u.set(k, f[k]); for (const [k, v] of Object.entries(extra)) if (v != null && v !== '') u.set(k, v); return '?' + u.toString(); };
const linhaFiltros = (fl) => `<p class="filtros-aplicados" aria-label="Filtros aplicados"><strong>${esc(fl.tipo)}</strong> · ${dataBR(fl.de)} a ${dataBR(fl.ate)} · Profissional: ${esc(fl.profissional)}</p>`;
const nav3 = (voltar, voltarTexto) => `<a class="btn btn-linha" href="${voltar}">${SETA} ${voltarTexto || 'Voltar'}</a><a class="btn btn-suave" href="${BASE}filtros/${qsF()}">Alterar filtros</a><a class="btn btn-suave" href="${BASE}">Outros relatórios</a>`;
function falha(titulo, r, voltar) {
  const semPermissao = r && r.erro === 'sem_permissao'; const filtro = r && r.erro === 'filtros';
  pagina({ titulo, voltar: voltar || BASE, voltarTexto: 'Voltar',
    corpo: avisoHTML(semPermissao ? esc(r.msg) : filtro ? `Filtros inválidos: ${esc(r.msg)}` : `<strong>Não foi possível carregar o relatório.</strong> ${esc((r && r.msg) || '')}<br><small>Isso não significa que não há registros.</small>`, 'erro'),
    acoes: filtro ? `<a class="btn btn-cheio" href="${BASE}filtros/${qsF()}">Corrigir filtros</a>` : semPermissao ? `<a class="btn btn-cheio" href="${BASE}">Outros relatórios</a>` : `<button type="button" class="btn btn-cheio" id="tentar">Tentar novamente</button><a class="btn btn-linha" href="${BASE}filtros/${qsF()}">Alterar filtros</a>` });
  if ($('#tentar')) $('#tentar').onclick = () => location.reload();
  focarTitulo();
}
const carregando = (t) => pagina({ titulo: t, corpo: avisoHTML('Carregando relatório…') });

// ═══════════════════════════ MENU ══════════════════════════════════════════
async function telaMenu() {
  const ini = await api('rl_inicio');
  const tipos = Object.entries(TIPOS).filter(([k]) => k !== 'financeiro' || (ini.ok && ini.financeiro_permitido));
  pagina({ titulo: 'Relatórios', voltar: '/brow-studio/profissional.html',
    corpo: `<p class="etapa" style="margin-top:-8px">Escolha o relatório. Os números vêm dos registros já salvos; gerar não altera nada.</p>
      <nav class="menu-botoes menu-relatorios" aria-label="Relatórios">${tipos.map(([k, t]) => `<a class="btn btn-suave" href="${BASE}filtros/?tipo=${k}">${t}</a>`).join('')}</nav>` });
  focarTitulo();
}

// ═══════════════════════════ FILTROS ═══════════════════════════════════════
async function telaFiltros() {
  const f = F(); if (!TIPOS[f.tipo]) return ir(BASE);
  carregando('Filtros');
  const r = await api('rl_inicio');
  if (!r.ok) return falha('Filtros', r);
  const form = pagina({ titulo: `Relatório: ${TIPOS[f.tipo]}`, voltar: BASE, voltarTexto: 'Relatórios', formulario: true,
    corpo: `<div class="duas-colunas">${campoTexto({ id: 'de', rotulo: 'Data inicial', valor: f.de || r.padrao.de, tipo: 'date' })}${campoTexto({ id: 'ate', rotulo: 'Data final', valor: f.ate || r.padrao.ate, tipo: 'date' })}</div>
      <div class="campo"><label for="prof">Profissional</label><select id="prof" name="prof"><option value="">Todas</option>${r.profissionais.map(p => `<option value="${esc(p.id)}" ${p.id === f.prof ? 'selected' : ''}>${esc(p.nome)}${p.ativo ? '' : ' (inativa)'}</option>`).join('')}</select>
        ${r.profissionais.length ? '' : '<span class="ajuda">Nenhuma profissional cadastrada na agenda: o relatório usa todos os registros.</span>'}</div>
      <p class="ajuda">Inclui o primeiro e o último dia inteiros (fuso ${esc(r.fuso)}).${f.tipo === 'financeiro' ? ' Ao escolher uma profissional, despesas gerais sem profissional não entram.' : ''}</p>
      ${f.tipo === 'financeiro' && !r.financeiro_permitido ? avisoHTML('Sua função não tem acesso ao relatório financeiro.', 'erro') : ''}`,
    acoes: `<a class="btn btn-linha" href="${BASE}">${SETA} Voltar</a><button type="submit" class="btn btn-cheio">Gerar relatório</button>` });
  form.onsubmit = (e) => {
    e.preventDefault(); const er = {};
    if (!form.de.value) er.de = 'Informe a data inicial.';
    if (!form.ate.value) er.ate = 'Informe a data final.'; else if (form.de.value && form.ate.value < form.de.value) er.ate = 'A data final deve ser igual ou posterior à inicial.';
    if (!mostrarErros(form, er)) return;
    const u = new URLSearchParams({ tipo: f.tipo, de: form.de.value, ate: form.ate.value }); if (form.prof.value) u.set('prof', form.prof.value);
    ir(`${BASE}resumo/?${u}`);
  };
  focarTitulo();
}

// ═══════════════════════════ RESUMO ════════════════════════════════════════
async function telaResumo() {
  const f = F(); if (!TIPOS[f.tipo]) return ir(BASE);
  const T = `Resumo: ${TIPOS[f.tipo]}`;
  carregando(T);
  const r = await api('rl_resumo', { query: { ...f, pagina: 1, limite: 6 } });
  if (!r.ok) return falha(T, r, `${BASE}filtros/${qsF()}`);
  const R = r.resumo; let corpo = '';
  const exportar = `<a class="btn btn-suave" href="${BASE}exportar/${qsF()}">Exportar (PDF ou CSV)</a>`;
  if (f.tipo === 'financeiro') {
    const vazio = !R.recebimentos.quantidade && !R.despesas.quantidade && !R.a_receber.quantidade;
    corpo = `${vazio ? avisoHTML('Nenhum registro financeiro neste período e filtro.') : ''}
      <div class="fin-cards">
        <section class="fin-card"><h2>Recebido no período</h2><p class="fin-valor positivo">${reais(R.recebimentos.centavos)}</p><p class="ajuda fin-qtd">${R.recebimentos.quantidade} movimento(s)</p></section>
        <section class="fin-card"><h2>Despesas pagas</h2><p class="fin-valor negativo">${reais(R.despesas.centavos)}</p><p class="ajuda fin-qtd">${R.despesas.quantidade} movimento(s)</p></section>
        <section class="fin-card"><h2>Resultado das movimentações</h2><p class="fin-valor ${R.resultado_centavos < 0 ? 'negativo' : 'positivo'}">${reais(R.resultado_centavos)}</p><p class="ajuda">Recebido − pago. Não é lucro nem saldo bancário.</p></section>
        <section class="fin-card"><h2>A receber (vencimento no período)</h2><p class="fin-valor">${reais(R.a_receber.centavos)}</p><p class="ajuda fin-qtd">${R.a_receber.quantidade} lançamento(s) com saldo</p></section>
      </div>
      <p class="ajuda">Recebido e pago: pela data efetiva de cada pagamento${R.estornados ? ` (${R.estornados} estorno(s) não entram)` : ''}. A receber: pelo vencimento, com o saldo pendente hoje.${R.despesas_gerais_excluidas != null ? ` <strong>Despesas gerais sem profissional não estão incluídas${R.despesas_gerais_excluidas ? ` (${R.despesas_gerais_excluidas} no período)` : ''}.</strong>` : ''}</p>
      <nav class="acoes-grade" aria-label="Ações"><a class="btn btn-cheio" href="${BASE}categorias/${qsF()}">Ver detalhes</a>${exportar}</nav>`;
  } else if (f.tipo === 'atendimentos') {
    const linhas = Object.entries(R.por_situacao).filter(([k, n]) => n || ['concluido', 'agendado', 'confirmado', 'cancelado', 'falta'].includes(k));
    corpo = `${R.total ? '' : avisoHTML('Nenhum agendamento neste período e filtro.')}
      <a class="btn btn-cheio total-link" href="${BASE}detalhes/${qsF()}"><span>Total de agendamentos</span><strong>${R.total}</strong></a>
      <ul class="lista lista-contagem" aria-label="Por situação">${linhas.map(([k, n]) => `<li><a class="item-contagem" href="${BASE}detalhes/${qsF({ situacao: k })}"><span>${SIT[k]}</span><strong>${n}</strong></a></li>`).join('')}</ul>
      <p class="ajuda">Pela data prevista; cada agendamento uma vez, na situação atual.${R.encaixes_aguardando ? ` ${R.encaixes_aguardando} encaixe(s) aguardando vaga não entram no total.` : ''}</p>
      <nav class="acoes-grade" aria-label="Ações">${exportar}</nav>`;
  } else {
    const servicos = f.tipo === 'servicos';
    corpo = `<div class="fin-valores">${servicos ? `<div><span>Procedimentos realizados</span><strong>${R.execucoes}</strong></div>` : `<div><span>Clientes únicas</span><strong>${R.clientes}</strong></div><div><span>Atendimentos concluídos</span><strong>${R.execucoes}</strong></div>`}</div>
      <p class="ajuda">${servicos ? 'Só atendimentos concluídos (data do atendimento concluído). Toque no serviço para ver os atendimentos.' : 'Clientes pelo cadastro, com visitas concluídas. Toque para ver o histórico.'}</p>
      <ul class="lista" id="lista" aria-label="${servicos ? 'Serviços mais realizados' : 'Clientes atendidas'}"></ul>${navPaginas('nav')}
      <nav class="acoes-grade" aria-label="Ações">${exportar}</nav>`;
  }
  pagina({ titulo: T, voltar: `${BASE}filtros/${qsF()}`, voltarTexto: 'Filtros', corpo: linhaFiltros(r.filtros) + corpo, acoes: nav3(`${BASE}filtros/${qsF()}`, 'Voltar') });
  app.querySelector('.app-acoes').classList.add('acoes-tres');
  if (f.tipo === 'servicos' || f.tipo === 'clientes') {
    let pg = 1, ajuste = 0;
    const desenhar = async (primeira) => {
      const lim = ajuste || cabem($('#lista'), 62, 82 + 60 + 60);
      const rr = primeira && lim === 6 ? r : await api('rl_resumo', { query: { ...f, pagina: pg, limite: lim } });
      if (!rr.ok) { $('#lista').innerHTML = `<li>${avisoHTML('Não foi possível carregar a lista.', 'erro')}</li>`; return; }
      const L = rr.lista;
      $('#lista').innerHTML = L.total ? L.itens.map(x => `<li><a class="item-contagem" href="${BASE}detalhes/${qsF(f.tipo === 'servicos' ? { servico: x.chave } : { cliente: x.chave })}"><span><small>${x.posicao}º</small> ${esc(x.nome)}</span><strong>${x.quantidade}</strong></a></li>`).join('')
        : `<li class="vazio vazio-curto"><p>Nenhum atendimento concluído neste período e filtro.</p></li>`;
      ligarNav($('#nav'), { ...L, rotulo: f.tipo === 'servicos' ? 'serviços' : 'clientes' }, (n) => { pg = n; desenhar(); });
      if (passou() && lim > 2 && L.itens.length >= lim) { ajuste = lim - 1; desenhar(); }
    };
    desenhar(false);
  }
  focarTitulo();
}

// ═══════════════════════════ CATEGORIAS (financeiro) ═══════════════════════
async function telaCategorias() {
  const f = F(); if (f.tipo !== 'financeiro') return ir(BASE);
  carregando('Detalhes financeiros');
  const r = await api('rl_resumo', { query: f });
  if (!r.ok) return falha('Detalhes financeiros', r, `${BASE}resumo/${qsF()}`);
  const R = r.resumo; const vals = { recebimentos: R.recebimentos, despesas: R.despesas, a_receber: R.a_receber };
  pagina({ titulo: 'Detalhes financeiros', voltar: `${BASE}resumo/${qsF()}`, voltarTexto: 'Resumo',
    corpo: `${linhaFiltros(r.filtros)}<ul class="lista lista-contagem" aria-label="Categorias">${Object.entries(CAT).map(([k, t]) => `<li><a class="item-contagem" href="${BASE}detalhes/${qsF({ cat: k })}"><span>${t} <small>(${vals[k].quantidade})</small></span><strong>${reais(vals[k].centavos)}</strong></a></li>`).join('')}</ul>
      <p class="ajuda">Recebimentos e despesas pela data do pagamento; a receber pelo vencimento.</p>`,
    acoes: nav3(`${BASE}resumo/${qsF()}`, 'Resumo') });
  app.querySelector('.app-acoes').classList.add('acoes-tres');
  focarTitulo();
}

// ═══════════════════════════ DETALHES ══════════════════════════════════════
async function telaDetalhes() {
  const f = F(); if (!TIPOS[f.tipo]) return ir(BASE);
  const ext = { cat: params.get('cat'), situacao: params.get('situacao'), servico: params.get('servico'), cliente: params.get('cliente') };
  const voltar = f.tipo === 'financeiro' ? `${BASE}categorias/${qsF()}` : `${BASE}resumo/${qsF()}`;
  const titulo = f.tipo === 'financeiro' ? (CAT[ext.cat] || 'Detalhes') : f.tipo === 'atendimentos' ? (ext.situacao ? SIT[ext.situacao] || 'Atendimentos' : 'Todos os agendamentos') : f.tipo === 'servicos' ? 'Atendimentos do serviço' : 'Histórico da cliente';
  carregando(titulo);
  const r0 = await api('rl_detalhes', { query: { ...f, ...ext, pagina: 1, limite: 1 } });
  if (!r0.ok) return falha(titulo, r0, voltar);
  pagina({ titulo, voltar, voltarTexto: f.tipo === 'financeiro' ? 'Categorias' : 'Resumo',
    corpo: `${linhaFiltros(r0.filtros)}
      <p class="etapa" id="cab">${r0.titulo ? `<strong>${esc(r0.titulo)}</strong> · ` : ''}${r0.total} registro(s)${r0.soma_centavos != null ? ` · total ${reais(r0.soma_centavos)}` : ''}${f.tipo === 'clientes' && ext.cliente ? ` · <a href="/brow-studio/clientes/perfil/?id=${encodeURIComponent(ext.cliente)}">perfil da cliente</a>` : ''}</p>
      <ul class="lista" id="lista" aria-label="${esc(titulo)}"></ul>${navPaginas('nav')}`,
    acoes: nav3(voltar, f.tipo === 'financeiro' ? 'Categorias' : 'Resumo') });
  app.querySelector('.app-acoes').classList.add('acoes-tres');
  let pg = 1, ajuste = 0, vez = 0;
  const linha = (x) => {
    let a, b;
    if (f.tipo === 'financeiro') { a = `${esc(x.descricao)} · <strong>${reais(x.valor_centavos)}</strong>`; b = `${dataBR(x.data)} · ${esc(x.situacao)}${x.pessoa ? ' · ' + esc(x.pessoa) : ''}${x.profissional ? ' · ' + esc(x.profissional) : ''}${x.forma ? ' · ' + esc(x.forma) : ''}`; }
    else if (f.tipo === 'atendimentos') { a = `${esc(x.cliente)} · ${esc(x.situacao)}`; b = `${dataBR(x.data)} ${x.horario} · ${esc(x.servico)} · ${esc(x.profissional)}${x.encaixe ? ' · veio de encaixe' : ''}`; }
    else { a = f.tipo === 'servicos' ? esc(x.cliente) : esc(x.servico); b = `${dataBR(x.data)}${x.horario ? ' ' + x.horario : ''} · ${esc(f.tipo === 'servicos' ? x.servico : x.profissional || '')}${f.tipo === 'servicos' && x.profissional ? ' · ' + esc(x.profissional) : ''}${x.fonte === 'registro' ? ' · registro sem agendamento' : ''}`; }
    return `<li class="item"><div class="item-info"><div class="item-nome">${a}</div><div class="item-extra item-extra-quebra">${b}</div></div><a class="btn btn-linha" href="${x.origem}" aria-label="Abrir registro de origem">Abrir</a></li>`;
  };
  async function carregar() {
    const minha = ++vez; const lim = ajuste || cabem($('#lista'), 72, 82 + 60 + 60);
    const r = await api('rl_detalhes', { query: { ...f, ...ext, pagina: pg, limite: lim } });
    if (minha !== vez) return;
    if (!r.ok) { $('#lista').innerHTML = `<li>${avisoHTML('Não foi possível carregar esta página. Isso não significa que não há registros.', 'erro')}</li>`; return; }
    $('#lista').innerHTML = r.total ? r.itens.map(linha).join('') : '<li class="vazio vazio-curto"><p>Nenhum registro neste período e filtro.</p></li>';
    ligarNav($('#nav'), { ...r, rotulo: 'registros' }, (n) => { pg = n; carregar(); });
    if (passou() && lim > 2 && r.itens.length >= lim) { ajuste = lim - 1; carregar(); }
  }
  carregar(); focarTitulo();
}

// ═══════════════════════════ EXPORTAR ══════════════════════════════════════
async function telaExportar() {
  const f = F(); if (!TIPOS[f.tipo]) return ir(BASE);
  carregando('Exportar relatório');
  const r = await api('rl_resumo', { query: { ...f, limite: 1 } });
  if (!r.ok) return falha('Exportar relatório', r, `${BASE}resumo/${qsF()}`);
  pagina({ titulo: 'Exportar relatório', voltar: `${BASE}resumo/${qsF()}`, voltarTexto: 'Resumo',
    corpo: `${linhaFiltros(r.filtros)}<p class="ajuda">O arquivo inclui todos os registros filtrados (não só a página visível), com estabelecimento, período, profissional, critério e data/hora de geração. Sem dados de saúde ou fotos. Nada é enviado por WhatsApp ou e-mail.</p>
      <nav class="acoes-grade" aria-label="Formatos"><button type="button" class="btn btn-cheio" data-formato="pdf">Baixar PDF</button><button type="button" class="btn btn-cheio" data-formato="csv">Baixar CSV (planilha)</button></nav>
      <div id="aviso" aria-live="polite"></div>`,
    acoes: nav3(`${BASE}resumo/${qsF()}`, 'Resumo') });
  app.querySelector('.app-acoes').classList.add('acoes-tres');
  app.querySelectorAll('[data-formato]').forEach(b => b.onclick = async () => {
    const fmt = b.dataset.formato; b.disabled = true; const t = b.textContent; b.textContent = 'Gerando…'; $('#aviso').innerHTML = '';
    try {
      const resp = await fetch(`/api/brow${qsF({ acao: 'rl_exportar', formato: fmt })}`, { credentials: 'same-origin', cache: 'no-store' });
      const tipo = resp.headers.get('content-type') || '';
      if (!resp.ok || !(fmt === 'pdf' ? tipo.includes('application/pdf') : tipo.includes('text/csv'))) { let m = ''; try { m = (await resp.json()).msg; } catch (e) {} throw new Error(m || 'O servidor não gerou o arquivo.'); }
      const blob = await resp.blob(); if (!blob.size) throw new Error('Arquivo vazio.');
      const disp = resp.headers.get('content-disposition') || ''; const nome = (disp.match(/filename="([^"]+)"/) || [])[1] || `relatorio.${fmt}`;
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
      $('#aviso').innerHTML = avisoHTML(`Arquivo gerado: <strong>${esc(nome)}</strong>.`, 'ok');
    } catch (e) { $('#aviso').innerHTML = avisoHTML(`Não foi possível gerar o arquivo. ${esc(e.message)}`, 'erro'); }
    b.disabled = false; b.textContent = t;
  });
  focarTitulo();
}

const TELAS = { menu: telaMenu, filtros: telaFiltros, resumo: telaResumo, categorias: telaCategorias, detalhes: telaDetalhes, exportar: telaExportar };
(TELAS[document.body.dataset.pagina] || telaMenu)();
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
