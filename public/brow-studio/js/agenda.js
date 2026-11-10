// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — AGENDA, AGENDAMENTOS E ENCAIXES (10/11/2026)
// Cada página tem rota própria e diz qual tela é em <body data-pagina="...">.
// Peças comuns em comum.js. Toda regra de horário (disponibilidade, conflito,
// fuso, término antecipado) é decidida no SERVIDOR; aqui só se mostra e envia.
//
// Rascunhos entre etapas (sessionStorage, só nesta aba — não é registro):
//   "ag:novo"        novo agendamento
//   "enc:novo"       novo encaixe
//   "ag:rem:<id>"    remarcação
// ═══════════════════════════════════════════════════════════════════════════
import { $, params, esc, uuid, lerRasc, gravarRasc, apagarRasc, api, SETA, pagina, campoTexto, grupoOpcoes,
  mostrarErros, avisoHTML, focarTitulo, ir, blocoResumo } from './comum.js?v=1';

const BASE = '/brow-studio/agenda/';
const SIT_AG = { agendado: 'Agendado', confirmado: 'Presença confirmada', chegou: 'Chegou', em_atendimento: 'Em atendimento', concluido: 'Concluído', cancelado: 'Cancelado', falta: 'Faltou' };
const SIT_ENC = { aguardando: 'Aguardando', chamado: 'Chamado', em_atendimento: 'Em atendimento', concluido: 'Concluído', cancelado: 'Cancelado', desistiu: 'Desistiu' };
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const ACOES_HIST = { criado: 'Agendamento criado', criado_por_encaixe: 'Criado a partir de encaixe', confirmar: 'Presença confirmada', chegou: 'Chegada registrada',
  iniciar: 'Atendimento iniciado', concluir: 'Atendimento concluído', falta: 'Falta registrada', cancelar: 'Cancelado', remarcado: 'Remarcado',
  whatsapp_corrigido: 'WhatsApp corrigido', efetivado: 'Encaixe efetivado (horário reservado)', desistiu: 'Desistiu',
  atendimento_iniciar: 'Atendimento iniciado', atendimento_concluir: 'Atendimento concluído', atendimento_cancelar: 'Atendimento vinculado cancelado', atendimento_falta: 'Faltou ao atendimento vinculado' };

// ─── formatação ─────────────────────────────────────────────────────────────
const digitos = (v) => String(v || '').replace(/\D/g, '');
function reais(c) { const s = String(Math.max(0, c | 0)).padStart(3, '0'); return `R$ ${s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${s.slice(-2)}`; }
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
function dataCurta(iso) { const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}`; }
function dataLonga(iso) { const d = new Date(iso + 'T12:00:00'); return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`; }
function somaDias(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function fone(v) { const d = digitos(v); if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; return v || ''; }
function mascaraFone(v) {
  const d = digitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
const DDD = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
function foneValido(d) { if (d.length !== 10 && d.length !== 11) return false; if (!DDD.has(d.slice(0, 2))) return false; return d.length === 11 ? d[2] === '9' : /[2-5]/.test(d[2]); }
const seloAg = (s) => `<span class="selo selo-${s}">${esc(SIT_AG[s] || s)}</span>`;
const seloEnc = (s) => `<span class="selo selo-enc-${s}">${esc(SIT_ENC[s] || s)}</span>`;
const qid = () => encodeURIComponent(params.get('id') || '');
const carregando = (titulo) => pagina({ titulo, corpo: avisoHTML('Carregando…') });
function telaErro(titulo, msg, voltar = BASE, voltarTexto = 'Agenda') {
  pagina({ titulo, voltar, voltarTexto, corpo: avisoHTML(esc(msg), 'erro'), acoes: `<a class="btn btn-cheio" href="${voltar}">Voltar</a>` });
  focarTitulo();
}
// recado de uma página para a próxima (ex.: "Atendimento concluído")
const recado = { pôr(m) { try { sessionStorage.setItem('brow:recado', m); } catch (e) {} }, tirar() { try { const m = sessionStorage.getItem('brow:recado'); sessionStorage.removeItem('brow:recado'); return m; } catch (e) { return null; } } };

// ─── paginação que cabe na tela ─────────────────────────────────────────────
function cabem(el, alturaItem, abaixo = 82, min = 2) {
  const topo = el.getBoundingClientRect().top + window.scrollY;
  const livre = window.innerHeight - topo - abaixo;
  return Math.max(min, Math.min(14, Math.floor((livre + 10) / (alturaItem + 10))));
}
function navPaginas(id) {
  return `<nav class="paginacao" id="${id}" aria-label="Páginas" hidden>
    <button type="button" class="btn btn-linha" data-ir="-1" aria-label="Página anterior">${SETA} Anterior</button>
    <span class="pag-info" aria-live="polite"></span>
    <button type="button" class="btn btn-linha" data-ir="1" aria-label="Próxima página">Próxima <span aria-hidden="true">→</span></button></nav>`;
}
function ligarNav(nav, { pagina: p, paginas, total, rotulo }, mudar) {
  nav.hidden = paginas <= 1;
  nav.querySelector('.pag-info').innerHTML = `<strong>${p}</strong> de ${paginas}${rotulo ? `<span class="pag-total"> · ${total} ${rotulo}</span>` : ''}`;
  const [a, z] = nav.querySelectorAll('[data-ir]');
  a.disabled = p <= 1; z.disabled = p >= paginas;
  a.onclick = () => mudar(p - 1); z.onclick = () => mudar(p + 1);
}
// se mesmo assim passou da altura, mostra menos itens (fonte/aparelho diferentes)
function passou() { return document.documentElement.scrollHeight > window.innerHeight + 1; }

// ═══════════════════════════ AGENDA DO DIA ═════════════════════════════════
async function telaDia() {
  const cfgR = await api('ag_config_ver');
  if (!cfgR.ok) return telaErro('Agenda', cfgR.msg || 'Não foi possível abrir a agenda.', '/brow-studio/profissional.html', 'Voltar');
  const profs = cfgR.profissionais.filter(p => p.ativo);
  let data = /^\d{4}-\d{2}-\d{2}$/.test(params.get('data') || '') ? params.get('data') : cfgR.hoje;
  let prof = params.get('prof') || '';
  const msg = recado.tirar();
  const precisaConfig = !cfgR.configurada || !profs.length;
  pagina({
    titulo: 'Agenda', voltar: '/brow-studio/profissional.html',
    extra: precisaConfig ? '' : `<a class="btn btn-cheio btn-topo" href="${BASE}novo/" aria-label="Novo agendamento">+ Novo<span class="so-largo">&nbsp;agendamento</span></a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      ${precisaConfig ? avisoHTML(`Antes de agendar, configure ${!cfgR.configurada ? 'os <strong>horários de funcionamento</strong>' : ''}${!cfgR.configurada && !profs.length ? ' e ' : ''}${!profs.length ? 'as <strong>profissionais</strong>' : ''}.`, '',
        `<div class="linha-acoes"><a class="btn btn-cheio" href="${BASE}configuracoes/">Configurar agenda</a></div>`) : ''}
      <div class="barra-data">
        <button type="button" class="btn btn-linha btn-icone" id="dia-ant" aria-label="Dia anterior">‹</button>
        <div class="campo campo-data"><label for="data" class="sr-only">Data</label><input id="data" type="date" value="${data}"></div>
        <button type="button" class="btn btn-linha btn-icone" id="dia-prox" aria-label="Próximo dia">›</button>
        <button type="button" class="btn btn-suave" id="hoje">Hoje</button>
      </div>
      <p class="linha-dia" id="linha-dia" aria-live="polite"></p>
      <div class="linha-botoes">
        <a class="btn btn-suave" id="ir-encaixes" href="${BASE}encaixes/?data=${data}">Encaixes do dia</a>
        ${profs.length > 1 ? `<div class="campo campo-filtro"><label for="prof" class="sr-only">Profissional</label>
          <select id="prof"><option value="">Todas as profissionais</option>${profs.map(p => `<option value="${esc(p.id)}" ${p.id === prof ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></div>` : ''}
      </div>
      <div id="estado"></div>
      <ul class="lista" id="lista" aria-label="Atendimentos do dia"></ul>
      ${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${BASE}configuracoes/">Configurações</a>`
  });
  let pg = Math.max(parseInt(params.get('p'), 10) || 1, 1), limite = 0, ajuste = 0, vez = 0;
  async function carregar() {
    const minha = ++vez;
    limite = ajuste || cabem($('#lista'), window.innerHeight <= 760 ? 70 : 80, 52 + 74 + 24);
    const r = await api('ag_dia', { query: { data, prof, pagina: pg, limite } });
    if (minha !== vez) return;
    if (!r.ok) { $('#estado').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível carregar a agenda.'), 'erro'); $('#lista').innerHTML = ''; return; }
    pg = r.pagina;
    const u = new URL(location.href); u.searchParams.set('data', data); prof ? u.searchParams.set('prof', prof) : u.searchParams.delete('prof'); pg > 1 ? u.searchParams.set('p', pg) : u.searchParams.delete('p');
    history.replaceState(null, '', u);
    $('#linha-dia').innerHTML = `<strong>${esc(dataLonga(data))}</strong>${data === r.hoje ? ' · hoje' : ''} — ${r.dia.aberto ? `aberto ${r.dia.inicio}–${r.dia.fim}${r.dia.pausas.length ? ` · pausa ${r.dia.pausas.join(', ')}` : ''}` : 'fechado'}`;
    const enc = $('#ir-encaixes'); enc.href = `${BASE}encaixes/?data=${data}`;
    enc.innerHTML = `Encaixes do dia <span class="contagem">${r.aguardando} aguardando</span>`;
    enc.setAttribute('aria-label', `Encaixes do dia: ${r.aguardando} aguardando`);
    $('#lista').innerHTML = r.total ? r.itens.map(a => `
      <li class="item item-ag${['cancelado', 'falta'].includes(a.situacao) ? ' item-inativo' : ''}">
        <div class="hora-bloco"><strong>${a.inicio}</strong><span>${a.fim}</span></div>
        <div class="item-info"><div class="item-nome">${esc(a.cliente_nome)}</div>
          <div class="item-extra"><span class="selo-mini sm-${a.situacao}">${esc(SIT_AG[a.situacao])} · </span>${esc(a.servico_nome)} · ${esc(a.profissional_nome)}</div></div>
        <span class="selo-lado">${seloAg(a.situacao)}</span>
        <a class="btn btn-linha" href="${BASE}atendimento/?id=${encodeURIComponent(a.id)}" aria-label="Abrir atendimento de ${esc(a.cliente_nome)} às ${a.inicio}, ${esc(SIT_AG[a.situacao])}">Abrir</a>
      </li>`).join('')
      : `<li class="vazio"><h2>Nenhum atendimento</h2><p>${r.dia.aberto ? 'Não há agendamentos neste dia.' : 'O estúdio não abre neste dia.'}</p></li>`;
    ligarNav($('#nav'), { ...r, rotulo: 'atendimentos' }, (n) => { pg = n; carregar(); });
    if (passou() && limite > 2 && r.itens.length >= limite) { ajuste = Math.max(2, limite - 1); carregar(); }
  }
  const mudarData = (d) => { data = d; pg = 1; $('#data').value = d; carregar(); };
  $('#data').onchange = (e) => { if (e.target.value) mudarData(e.target.value); };
  $('#dia-ant').onclick = () => mudarData(somaDias(data, -1));
  $('#dia-prox').onclick = () => mudarData(somaDias(data, 1));
  $('#hoje').onclick = () => mudarData(cfgR.hoje);
  const sp = $('#prof'); if (sp) sp.onchange = () => { prof = sp.value; pg = 1; carregar(); };
  carregar();
}

// ═══════════════════════════ ESCOLHER CLIENTE (novo / encaixe) ═════════════
async function etapaCliente({ chave, titulo, etapa, total, voltar, prox, novoRasc, sub }) {
  const d = lerRasc(chave) || novoRasc();
  gravarRasc(chave, d);
  const form = pagina({
    titulo, etapa, etapasTotal: total, formulario: true, voltar, voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(sub || 'Cliente e WhatsApp')}</p>
      <div id="escolhida"></div>
      <div id="busca-area">
        <div class="campo"><label for="q">Buscar cliente por nome ou telefone</label>
          <input id="q" type="search" autocomplete="off" enterkeyhint="search" aria-describedby="cliente_id-erro"></div>
        <span class="erro" id="cliente_id-erro" aria-live="polite"></span>
        <ul class="lista lista-compacta" id="lista" aria-label="Clientes encontradas"></ul>
        ${navPaginas('nav')}
        <p class="ajuda">Não encontrou? <a href="/brow-studio/clientes/nova/">Cadastre a cliente</a> e volte aqui.</p>
      </div>
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${voltar}">Cancelar</a><button type="submit" class="btn btn-cheio">Próximo <span aria-hidden="true">→</span></button>`
  });
  function desenharEscolhida() {
    const r = lerRasc(chave);
    const area = $('#escolhida'), busca = $('#busca-area');
    if (!r.cliente_id) { area.innerHTML = ''; busca.hidden = false; return; }
    busca.hidden = true;
    const mudou = digitos(r.whatsapp) !== digitos(r.telefone_cadastro);
    area.innerHTML = `
      <div class="bloco cliente-escolhida"><div class="bloco-topo"><h2>${esc(r.cliente_nome)}</h2><button type="button" class="btn btn-linha btn-pequeno" id="trocar">Trocar</button></div>
        <p class="ajuda">${r.telefone_cadastro ? `WhatsApp no cadastro: ${esc(fone(r.telefone_cadastro))}` : 'Cadastro sem WhatsApp.'}${r.contato_pref === 'nenhum' ? ' · <strong>prefere não receber contato</strong>' : ''}</p></div>
      ${campoTexto({ id: 'whatsapp', rotulo: 'WhatsApp com DDD', valor: mascaraFone(r.whatsapp || ''), tipo: 'tel', opcional: true, attrs: 'inputmode="tel" autocomplete="off" maxlength="16" placeholder="(11) 98888-7777"' })}
      <label class="chave" id="linha-atualizar" ${mudou && digitos(r.whatsapp) ? '' : 'hidden'}><input type="checkbox" name="atualizar_cadastro" ${r.atualizar_cadastro ? 'checked' : ''}>
        <span><strong>Atualizar também no cadastro da cliente</strong><small>Sem marcar, o número corrigido vale só para este registro.</small></span></label>`;
    $('#trocar').onclick = () => { gravarRasc(chave, { ...lerRasc(chave), cliente_id: null, cliente_nome: null, telefone_cadastro: null, whatsapp: '', atualizar_cadastro: false }); desenharEscolhida(); $('#q').focus(); };
    const w = form.whatsapp;
    w.addEventListener('input', () => {
      w.value = mascaraFone(w.value);
      const at = lerRasc(chave);
      const dif = digitos(w.value) !== digitos(at.telefone_cadastro) && digitos(w.value);
      $('#linha-atualizar').hidden = !dif;
      gravarRasc(chave, { ...at, whatsapp: digitos(w.value), atualizar_cadastro: dif ? form.atualizar_cadastro.checked : false });
    });
    form.atualizar_cadastro.onchange = () => gravarRasc(chave, { ...lerRasc(chave), atualizar_cadastro: form.atualizar_cadastro.checked });
  }
  let termo = '', pg = 1, vez = 0;
  async function buscar() {
    const minha = ++vez;
    const lim = cabem($('#lista'), 62, 52 + 70 + 40, 2);
    const r = await api('listar', { query: { q: termo, pagina: pg, limite: lim } });
    if (minha !== vez) return;
    if (!r.ok) { $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível buscar clientes.'), 'erro'); return; }
    $('#lista').innerHTML = r.total ? r.itens.map(c => `
      <li class="item item-compacto"><div class="item-info"><div class="item-nome">${esc(c.nome)}</div><div class="item-extra">${esc(fone(c.telefone) || 'Sem telefone')}</div></div>
        <button type="button" class="btn btn-linha" data-id="${esc(c.id)}">Escolher</button></li>`).join('')
      : `<li class="vazio vazio-compacto"><p>${termo ? 'Nenhuma cliente encontrada.' : 'Nenhuma cliente cadastrada ainda.'}</p></li>`;
    ligarNav($('#nav'), r, (n) => { pg = n; buscar(); });
    $('#lista').querySelectorAll('[data-id]').forEach(btn => btn.onclick = async () => {
      btn.disabled = true;
      const v = await api('ver', { id: btn.dataset.id });
      if (!v.ok) { $('#aviso').innerHTML = avisoHTML(esc(v.msg || 'Não foi possível abrir a cliente.'), 'erro'); btn.disabled = false; return; }
      gravarRasc(chave, { ...lerRasc(chave), cliente_id: v.cliente.id, cliente_nome: v.cliente.nome, telefone_cadastro: v.cliente.telefone || '',
        whatsapp: v.cliente.telefone || '', contato_pref: v.cliente.contato_pref || '', atualizar_cadastro: false });
      desenharEscolhida();
      $('#cliente_id-erro').textContent = '';
    });
  }
  let espera;
  $('#q').addEventListener('input', (e) => { clearTimeout(espera); espera = setTimeout(() => { termo = e.target.value.trim(); pg = 1; buscar(); }, 300); });
  $('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(espera); termo = e.target.value.trim(); pg = 1; buscar(); } });
  desenharEscolhida();
  if (!lerRasc(chave).cliente_id) buscar();
  form.onsubmit = (e) => {
    e.preventDefault();
    const r = lerRasc(chave);
    if (!r.cliente_id) { $('#cliente_id-erro').textContent = 'Escolha a cliente.'; $('#q').focus(); return; }
    const w = digitos(r.whatsapp);
    if (w && !foneValido(w)) { mostrarErros(form, { whatsapp: 'WhatsApp inválido. Use DDD + número, ex.: (11) 98888-7777.' }); return; }
    ir(prox);
  };
  focarTitulo();
}

// ═══════════════════════════ ESCOLHER PROFISSIONAL E SERVIÇO ═══════════════
async function etapaServico({ chave, titulo, etapa, total, voltar, prox, qualquer, sub }) {
  const d = lerRasc(chave);
  if (!d || !d.cliente_id) return ir(voltar);
  const cfgR = await api('ag_config_ver');
  if (!cfgR.ok) return telaErro(titulo, cfgR.msg);
  const profs = cfgR.profissionais.filter(p => p.ativo);
  const opcoesProf = Object.fromEntries([...(qualquer ? [['', 'Qualquer profissional']] : []), ...profs.map(p => [p.id, p.nome])]);
  const form = pagina({
    titulo, etapa, etapasTotal: total, formulario: true, voltar, voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(sub || 'Profissional e serviço')} · ${esc(d.cliente_nome)}</p>
      ${profs.length ? grupoOpcoes({ nome: 'profissional_id', legenda: 'Profissional', opcoes: opcoesProf, valor: d.profissional_id == null && qualquer ? '' : d.profissional_id, colunas: 3 })
        : avisoHTML(`Nenhuma profissional ativa. <a href="${BASE}configuracoes/profissionais/">Cadastre em Configurações</a>.`, 'erro')}
      <fieldset class="campo" aria-describedby="servico_id-erro"><legend>Serviço <span class="opcional">(somente ativos)</span></legend>
        <div class="campo"><label for="q" class="sr-only">Buscar serviço</label><input id="q" type="search" placeholder="Buscar serviço" autocomplete="off"></div>
        <ul class="lista lista-compacta" id="lista" role="radiogroup" aria-label="Serviços ativos"></ul>
        <span class="erro" id="servico_id-erro" aria-live="polite"></span></fieldset>
      ${navPaginas('nav')}
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${voltar}">${SETA} Voltar</a><button type="submit" class="btn btn-cheio">Próximo <span aria-hidden="true">→</span></button>`
  });
  let termo = '', pg = 1, vez = 0;
  async function listar() {
    const minha = ++vez;
    const lim = cabem($('#lista'), 60, 52 + 70 + 30, 2);
    const r = await api('servicos_listar', { query: { q: termo, pagina: pg, limite: lim, ativos: '1' } });
    if (minha !== vez) return;
    if (!r.ok) { $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível listar os serviços.'), 'erro'); return; }
    const atual = lerRasc(chave).servico_id;
    $('#lista').innerHTML = r.total ? r.itens.map(s => `
      <li><label class="opcao opcao-linha"><input type="radio" name="servico_id" value="${esc(s.id)}" ${s.id === atual ? 'checked' : ''}>
        <span><strong>${esc(s.nome)}</strong><small>${reais(s.valor_centavos)} · ${s.duracao_min} min${s.intervalo_min ? ` + ${s.intervalo_min} min de intervalo` : ''}</small></span></label></li>`).join('')
      : `<li class="vazio vazio-compacto"><p>${termo ? 'Nenhum serviço ativo encontrado.' : 'Nenhum serviço ativo. Cadastre em Serviços e valores.'}</p></li>`;
    $('#lista').querySelectorAll('input').forEach(i => i.onchange = () => {
      const s = r.itens.find(x => x.id === i.value);
      gravarRasc(chave, { ...lerRasc(chave), servico_id: s.id, servico_nome: s.nome, duracao_min: s.duracao_min, intervalo_min: s.intervalo_min, valor_centavos: s.valor_centavos, inicio_min: null });
    });
    ligarNav($('#nav'), r, (n) => { pg = n; listar(); });
  }
  let espera;
  $('#q').addEventListener('input', (e) => { clearTimeout(espera); espera = setTimeout(() => { termo = e.target.value.trim(); pg = 1; listar(); }, 300); });
  $('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
  form.querySelectorAll('[name=profissional_id]').forEach(i => i.onchange = () => {
    gravarRasc(chave, { ...lerRasc(chave), profissional_id: i.value || null, profissional_nome: i.value ? profs.find(p => p.id === i.value).nome : 'Qualquer profissional', inicio_min: null });
  });
  listar();
  form.onsubmit = (e) => {
    e.preventDefault();
    const r = lerRasc(chave); const erros = {};
    const marcado = form.querySelector('[name=profissional_id]:checked');
    if (!marcado) erros.profissional_id = 'Escolha a profissional.';
    else gravarRasc(chave, { ...r, profissional_id: marcado.value || null, profissional_nome: marcado.value ? profs.find(p => p.id === marcado.value).nome : 'Qualquer profissional' });
    if (!lerRasc(chave).servico_id) erros.servico_id = 'Escolha o serviço.';
    if (!mostrarErros(form, erros)) return;
    ir(prox);
  };
  focarTitulo();
}

// ═══════════════════════════ NOVO AGENDAMENTO ══════════════════════════════
const N = BASE + 'novo/';
const novoAg = () => ({ chave_envio: uuid(), cliente_id: null, whatsapp: '', atualizar_cadastro: false, profissional_id: null, servico_id: null, data: null, inicio_min: null, observacoes: '' });

async function etapaData({ chave, titulo, etapa, total, voltar, prox, ehRemarcacao }) {
  const d = lerRasc(chave);
  if (!d || !d.servico_id) return ir(voltar);
  const cfgR = await api('ag_config_ver');
  if (!cfgR.ok) return telaErro(titulo, cfgR.msg);
  const hor = cfgR.config.horarios || {};
  const data = d.data && d.data >= cfgR.hoje ? d.data : cfgR.hoje;
  const form = pagina({
    titulo, etapa, etapasTotal: total, formulario: true, voltar, voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Data · ${esc(d.servico_nome)} com ${esc(d.profissional_nome)}</p>
      ${ehRemarcacao ? avisoHTML(`Atual: <strong>${esc(dataLonga(ehRemarcacao.data))}, ${ehRemarcacao.inicio}</strong>. Ele só é liberado quando o novo horário for salvo.`) : ''}
      ${campoTexto({ id: 'data', rotulo: 'Data do atendimento', valor: data, tipo: 'date', attrs: `min="${cfgR.hoje}"` })}
      <div class="atalhos">${[0, 1, 2, 3, 4, 5, 6].map(n => { const x = somaDias(cfgR.hoje, n); const h = hor[String(new Date(x + 'T12:00:00Z').getUTCDay())]; return `<button type="button" class="btn btn-suave btn-dia" data-d="${x}" ${h && h.aberto ? '' : 'disabled'}><strong>${n === 0 ? 'Hoje' : n === 1 ? 'Amanhã' : DIAS[new Date(x + 'T12:00:00Z').getUTCDay()].slice(0, 3)}</strong><small>${dataCurta(x).slice(0, 5)}</small></button>`; }).join('')}</div>
      <p class="linha-dia" id="info-dia" aria-live="polite"></p>`,
    acoes: `<a class="btn btn-linha" href="${voltar}">${SETA} Voltar</a><button type="submit" class="btn btn-cheio">Ver horários <span aria-hidden="true">→</span></button>`
  });
  const info = () => {
    const v = form.data.value; if (!v) { $('#info-dia').textContent = ''; return; }
    const h = hor[String(new Date(v + 'T12:00:00Z').getUTCDay())];
    $('#info-dia').innerHTML = `<strong>${esc(dataLonga(v))}</strong> — ${h && h.aberto ? `aberto ${h.inicio}–${h.fim}${(h.pausas || []).length ? ` · pausa ${h.pausas.map(p => p.inicio + '–' + p.fim).join(', ')}` : ''}` : 'o estúdio não abre neste dia'}`;
    form.querySelectorAll('.btn-dia').forEach(b => b.classList.toggle('ativo', b.dataset.d === v));
  };
  form.querySelectorAll('.btn-dia').forEach(b => b.onclick = () => { form.data.value = b.dataset.d; info(); gravarRasc(chave, { ...lerRasc(chave), data: b.dataset.d, inicio_min: null }); });
  form.data.onchange = () => { info(); gravarRasc(chave, { ...lerRasc(chave), data: form.data.value, inicio_min: null }); };
  info();
  form.onsubmit = (e) => {
    e.preventDefault();
    const v = form.data.value;
    if (!v) return mostrarErros(form, { data: 'Escolha a data.' });
    if (v < cfgR.hoje) return mostrarErros(form, { data: 'Essa data já passou.' });
    const at = lerRasc(chave);
    gravarRasc(chave, { ...at, data: v, inicio_min: at.data === v ? at.inicio_min : null });
    ir(prox);
  };
  focarTitulo();
}

async function etapaHorario({ chave, titulo, etapa, total, voltar, prox, ignorar }) {
  const d = lerRasc(chave);
  if (!d || !d.data) return ir(voltar);
  carregando(titulo);
  const r = await api('ag_disponibilidade', { query: { data: d.data, servico_id: d.servico_id, profissional_id: d.profissional_id, ...(ignorar ? { ignorar } : {}) } });
  if (!r.ok) return telaErro(titulo, r.msg || 'Não foi possível calcular os horários.', voltar, 'Voltar');
  const form = pagina({
    titulo, etapa, etapasTotal: total, formulario: true, voltar, voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(dataLonga(d.data))} · ${esc(d.servico_nome)} · ${esc(d.profissional_nome)}</p>
      ${r.motivo ? avisoHTML(esc(r.motivo), 'erro') : `<fieldset class="campo" aria-describedby="inicio_min-erro"><legend>Horários livres <span class="opcional">(${r.horarios.length})</span></legend>
        <div class="grade-horarios" id="grade" role="radiogroup"></div><span class="erro" id="inicio_min-erro" aria-live="polite"></span></fieldset>${navPaginas('nav')}`}
      <div class="aviso-caixa" id="resumo" role="status" ${d.inicio_min != null ? '' : 'hidden'}></div>
      ${d.retorno_id && chave === 'ag:novo' ? `<p class="ajuda">${r.motivo ? 'Sem vaga para o retorno neste dia.' : 'Nenhum horário serve?'} <button type="button" class="link-botao" id="ir-encaixe">Colocar na lista de encaixe</button> (não garante horário).</p>` : ''}`,
    acoes: `<a class="btn btn-linha" href="${voltar}">${SETA} Voltar</a><button type="submit" class="btn btn-cheio" ${r.motivo ? 'disabled' : ''}>Próximo <span aria-hidden="true">→</span></button>`
  });
  if ($('#ir-encaixe')) $('#ir-encaixe').onclick = () => {
    const at = lerRasc('ag:novo');
    gravarRasc('enc:novo', { chave_envio: uuid(), cliente_id: at.cliente_id, cliente_nome: at.cliente_nome, whatsapp: at.whatsapp || '', telefone_cadastro: at.telefone_cadastro, atualizar_cadastro: false,
      profissional_id: at.profissional_id, profissional_nome: at.profissional_nome, servico_id: at.servico_id, servico_nome: at.servico_nome, duracao_min: r.duracao_min, intervalo_min: r.intervalo_min,
      data: at.data, chegada_prevista: '', observacoes: at.observacoes || '', retorno_id: at.retorno_id });
    ir(E + 'novo/chegada/');
  };
  const resumo = () => {
    const at = lerRasc(chave); const h = r.horarios.find(x => x.inicio_min === at.inicio_min);
    const el = $('#resumo'); if (!h) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `Início <strong>${h.inicio}</strong> · término previsto <strong>${h.fim}</strong> · intervalo até <strong>${h.reserva_fim}</strong> · valor <strong>${reais(r.valor_centavos)}</strong>`;
  };
  if (!r.motivo) {
    let pg = 1;
    const desenhar = () => {
      const grade = $('#grade');
      const cols = window.innerWidth < 420 ? 3 : 4;
      const linhas = Math.max(2, Math.floor((window.innerHeight - grade.getBoundingClientRect().top - 52 - 70 - 90) / 66));
      const por = cols * linhas;
      const at = lerRasc(chave);
      const idx = r.horarios.findIndex(h => h.inicio_min === at.inicio_min);
      if (idx >= 0 && pg === 1 && !desenhar.feito) pg = Math.floor(idx / por) + 1;
      desenhar.feito = true;
      const paginas = Math.max(1, Math.ceil(r.horarios.length / por));
      pg = Math.min(pg, paginas);
      grade.innerHTML = r.horarios.slice((pg - 1) * por, pg * por).map(h => `
        <label class="opcao opcao-hora"><input type="radio" name="inicio_min" value="${h.inicio_min}" ${h.inicio_min === at.inicio_min ? 'checked' : ''}>
          <span><strong>${h.inicio}</strong><small>até ${h.fim}</small></span></label>`).join('');
      grade.querySelectorAll('input').forEach(i => i.onchange = () => { gravarRasc(chave, { ...lerRasc(chave), inicio_min: +i.value }); resumo(); });
      ligarNav($('#nav'), { pagina: pg, paginas, total: r.horarios.length, rotulo: 'horários' }, (n) => { pg = n; desenhar(); });
    };
    desenhar();
  }
  resumo();
  form.onsubmit = (e) => {
    e.preventDefault();
    const at = lerRasc(chave);
    const h = r.horarios.find(x => x.inicio_min === at.inicio_min);
    if (!h) return mostrarErros(form, { inicio_min: 'Escolha um horário.' });
    gravarRasc(chave, { ...at, inicio: h.inicio, fim: h.fim, reserva_fim: h.reserva_fim, valor_centavos: r.valor_centavos });
    ir(prox);
  };
  focarTitulo();
}

async function novoConferencia() {
  const d = lerRasc('ag:novo');
  if (!d || d.inicio_min == null) return ir(N);
  const form = pagina({
    titulo: 'Conferir agendamento', etapa: 4, etapasTotal: 4, formulario: true, voltar: N + 'horario/', voltarTexto: 'Voltar',
    corpo: `${d.retorno_id ? '<p class="etapa vinculo">Retorno: este horário fica vinculado ao acompanhamento planejado.</p>' : ''}${d.pacote_item_id ? '<p class="etapa vinculo">Sessão de pacote: reserva 1 sessão (só é consumida quando o atendimento for registrado como realizado).</p>' : ''}<div class="resumo">
        ${blocoResumo('Atendimento', [['Cliente', d.cliente_nome], ['WhatsApp', d.whatsapp ? fone(d.whatsapp) + (d.atualizar_cadastro ? ' (atualiza o cadastro)' : (digitos(d.whatsapp) !== digitos(d.telefone_cadastro) ? ' (só neste agendamento)' : '')) : ''],
          ['Serviço', `${d.servico_nome} · ${reais(d.valor_centavos)}`], ['Profissional', d.profissional_nome]], N)}
        ${blocoResumo('Data e horário', [['Data', dataLonga(d.data)], ['Horário', `${d.inicio} às ${d.fim} (término previsto)`], ['Intervalo após', `até ${d.reserva_fim}`]], N + 'data/')}
      </div>
      <div class="campo"><label for="observacoes">Observações <span class="opcional">(opcional)</span></label>
        <textarea id="observacoes" name="observacoes" maxlength="500" rows="2" class="curta">${esc(d.observacoes || '')}</textarea></div>
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${N}horario/">${SETA} Voltar</a><button type="submit" class="btn btn-cheio" id="salvar">Salvar agendamento</button>`
  });
  form.observacoes.oninput = () => gravarRasc('ag:novo', { ...lerRasc('ag:novo'), observacoes: form.observacoes.value });
  let enviando = false;
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (enviando) return;
    enviando = true;
    const b = $('#salvar'); b.disabled = true; b.setAttribute('aria-busy', 'true'); b.textContent = 'Salvando…';
    const at = lerRasc('ag:novo');
    const r = await api('ag_criar', { corpo: { chave_envio: at.chave_envio, cliente_id: at.cliente_id, whatsapp: at.whatsapp || null, atualizar_cadastro: !!at.atualizar_cadastro,
      profissional_id: at.profissional_id, servico_id: at.servico_id, data: at.data, inicio_min: at.inicio_min, observacoes: at.observacoes || '', retorno_id: at.retorno_id || undefined, pacote_item_id: at.pacote_item_id || undefined } });
    if (r.ok && at.pacote_item_id) { apagarRasc('ag:novo'); recado.pôr('Sessão do pacote agendada (reservada, não consumida).'); location.replace(`/brow-studio/orcamentos/pacote/item/?id=${encodeURIComponent(at.pacote_item_id)}`); return; }
    if (r.ok && at.retorno_id) { apagarRasc('ag:novo'); recado.pôr('Retorno agendado.'); location.replace(`/brow-studio/retornos/ver/?id=${encodeURIComponent(at.retorno_id)}`); return; }
    if (r.ok) { apagarRasc('ag:novo'); recado.pôr('Agendamento salvo.'); location.replace(`${BASE}atendimento/?id=${encodeURIComponent(r.id)}`); return; }
    enviando = false; b.disabled = false; b.removeAttribute('aria-busy'); b.textContent = 'Tentar novamente';
    const voltarHorario = r.erro === 'indisponivel' ? `<div class="linha-acoes"><a class="btn btn-linha" href="${N}horario/">Escolher outro horário</a></div>` : '';
    $('#aviso').innerHTML = avisoHTML(`${esc(r.msg || 'Não foi possível salvar.')}${r.erros ? ' ' + esc(Object.values(r.erros).join(' ')) : ''}<br><small>Os dados continuam guardados.</small>`, 'erro', voltarHorario);
  };
  focarTitulo();
}

// ═══════════════════════════ DETALHES DO ATENDIMENTO ═══════════════════════
async function telaAtendimento() {
  carregando('Atendimento');
  const r = await api('ag_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Atendimento', r.msg || 'Não foi possível abrir.');
  const a = r.agendamento; const q = qid();
  const msg = recado.tirar();
  const s = a.situacao;
  const B = (href, txt, cls = 'btn-suave') => `<a class="btn ${cls}" href="${href}">${txt}</a>`;
  const acoes = [];
  if (s === 'agendado') acoes.push(`<button type="button" class="btn btn-suave" data-op="confirmar">Confirmar presença</button>`);
  if (['agendado', 'confirmado'].includes(s)) acoes.push(B(`${BASE}atendimento/registrar/?id=${q}&acao=chegou`, 'Registrar chegada'));
  if (['agendado', 'confirmado', 'chegou'].includes(s)) acoes.push(B(`${BASE}atendimento/registrar/?id=${q}&acao=iniciar`, 'Iniciar atendimento'));
  if (['agendado', 'confirmado', 'chegou', 'em_atendimento'].includes(s)) acoes.push(B(`${BASE}atendimento/registrar/?id=${q}&acao=concluir`, 'Concluir atendimento'));
  if (['agendado', 'confirmado'].includes(s)) acoes.push(B(`${BASE}atendimento/remarcar/?id=${q}`, 'Remarcar'));
  if (['agendado', 'confirmado'].includes(s)) acoes.push(B(`${BASE}atendimento/falta/?id=${q}`, 'Marcar falta'));
  if (['agendado', 'confirmado', 'chegou'].includes(s)) acoes.push(B(`${BASE}atendimento/cancelar/?id=${q}`, 'Cancelar', 'btn-perigo'));
  acoes.push(B(`${BASE}atendimento/documentos/?id=${q}`, 'Documentos e avisos', 'btn-cheio'));
  pagina({
    titulo: 'Atendimento', voltar: `${BASE}?data=${a.data}`, voltarTexto: 'Agenda',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}${r.aviso ? avisoHTML(esc(r.aviso), 'erro') : ''}
      <div class="servico-cabeca"><h2>${esc(a.cliente_nome)}</h2>${seloAg(s)}</div>
      ${a.encaixe_id ? `<p class="ajuda">Atendimento vindo de <a href="${BASE}encaixes/detalhe/?id=${encodeURIComponent(a.encaixe_id)}">encaixe</a>.</p>` : ''}
      <div class="bloco"><dl class="dados">
        <dt>WhatsApp</dt><dd>${a.whatsapp ? esc(fone(a.whatsapp)) : 'Não informado'}</dd>
        <dt>Serviço</dt><dd>${esc(a.servico_nome)} · ${reais(a.valor_centavos)}</dd>
        <dt>Profissional</dt><dd>${esc(a.profissional_nome)}</dd>
        <dt>Data</dt><dd>${esc(dataLonga(a.data))}</dd>
        <dt>Horário</dt><dd>${a.inicio}–${a.fim} · intervalo até ${a.reserva_fim}</dd>
        ${a.chegada ? `<dt>Chegada</dt><dd>${a.chegada}</dd>` : ''}
        ${a.inicio_real || a.fim_real ? `<dt>Horário real</dt><dd>${a.inicio_real || '—'}–${a.fim_real || 'em andamento'}</dd>` : ''}
        ${a.observacoes ? `<dt>Observações</dt><dd>${esc(a.observacoes)}</dd>` : ''}
      </dl></div>
      <div id="aviso"></div>
      <nav class="acoes-grade" aria-label="Ações do atendimento">${acoes.join('')}</nav>
      ${s === 'concluido' ? '<p class="ajuda">Concluir não registra pagamento.</p>' : ''}`,
    acoes: `<a class="btn btn-linha" href="${BASE}?data=${a.data}">${SETA} Voltar à agenda</a>`
  });
  app.querySelectorAll('[data-op]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const rr = await api('ag_acao', { corpo: { id: a.id, acao: b.dataset.op } });
    if (rr.ok) { recado.pôr('Presença confirmada.'); location.reload(); return; }
    b.disabled = false; $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível.'), 'erro');
  });
  focarTitulo();
}
const app = document.getElementById('app');

// Documentos e avisos do atendimento (página própria: WhatsApp, ficha, termo, registro, histórico)
async function telaDocumentos() {
  carregando('Documentos e avisos');
  const r = await api('ag_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Documentos e avisos', r.msg);
  const a = r.agendamento; const q = qid(); const det = `${BASE}atendimento/?id=${q}`;
  pagina({
    titulo: 'Documentos e avisos', voltar: det, voltarTexto: 'Atendimento',
    corpo: `<div class="servico-cabeca"><h2>${esc(a.cliente_nome)}</h2>${seloAg(a.situacao)}</div>
      <p class="etapa">${esc(a.servico_nome)} · ${esc(dataLonga(a.data))}, ${a.inicio}</p>
      <nav class="menu-botoes" aria-label="Documentos e avisos">
        <a class="btn btn-suave" href="${BASE}whatsapp/?tipo=agendamento&id=${q}">WhatsApp e avisos</a>
        <a class="btn btn-suave" href="/brow-studio/anamnese/ficha/?ag=${q}">Ficha de anamnese</a>
        <a class="btn btn-suave" href="/brow-studio/termos/?agendamento=${q}">Termo e autorização</a>
        <a class="btn btn-suave" href="/brow-studio/registros/?agendamento=${q}">Registro do atendimento</a>
        <a class="btn btn-suave" href="/brow-studio/financeiro/novo/?agendamento=${q}&novo=1">Financeiro do atendimento</a>
        <a class="btn btn-suave" href="/brow-studio/estoque/atendimento/?ag=${q}">Materiais usados (estoque)</a>
        <a class="btn btn-suave" href="/brow-studio/retornos/?origem=${q}">Retornos e retoques</a>
        <a class="btn btn-suave" href="${BASE}historico/?tipo=agendamento&id=${q}">Histórico de alterações</a>
      </nav>`,
    acoes: `<a class="btn btn-linha" href="${det}">${SETA} Voltar ao atendimento</a>`
  });
  focarTitulo();
}

// Chegada / início / término reais (página própria)
async function telaRegistrar() {
  const op = params.get('acao');
  const T = { chegou: 'Registrar chegada', iniciar: 'Iniciar atendimento', concluir: 'Concluir atendimento' }[op];
  if (!T) return ir(BASE);
  carregando(T);
  const r = await api('ag_ver', { id: params.get('id') });
  if (!r.ok) return telaErro(T, r.msg);
  const a = r.agendamento; const det = `${BASE}atendimento/?id=${qid()}`;
  const hoje = a.data === r.hoje;
  const padrao = hoje ? r.agora : (op === 'concluir' ? a.fim : a.inicio);
  const precisaInicio = op === 'concluir' && !a.inicio_real;
  const form = pagina({
    titulo: T, voltar: det, voltarTexto: 'Atendimento', formulario: true,
    corpo: `<div class="bloco"><div class="servico-cabeca"><h2>${esc(a.cliente_nome)}</h2>${seloAg(a.situacao)}</div>
        <p class="ajuda">${esc(a.servico_nome)} · previsto ${a.inicio}–${a.fim} · intervalo até ${a.reserva_fim}</p></div>
      <div class="duas-colunas">
        ${precisaInicio ? campoTexto({ id: 'hora_inicio', rotulo: 'Início real', valor: a.inicio, tipo: 'time' }) : ''}
        ${campoTexto({ id: 'hora', rotulo: op === 'chegou' ? 'Horário de chegada' : op === 'iniciar' ? 'Início real' : 'Término real', valor: padrao, tipo: 'time' })}
      </div>
      ${op === 'concluir' ? avisoHTML(`Se terminar antes do previsto, o tempo que sobrar é liberado <strong>depois do intervalo de ${a.intervalo_min} min</strong>. Nenhum horário de outra cliente é alterado. Concluir não registra pagamento.`) : ''}
      ${op === 'iniciar' ? avisoHTML('Se começar atrasado e isso alcançar o próximo atendimento, a página do atendimento vai avisar.') : ''}
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${det}">Cancelar</a><button type="submit" class="btn btn-cheio" id="salvar">${T}</button>`
  });
  let enviando = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (enviando) return;
    if (!form.hora.value) return mostrarErros(form, { hora: 'Informe o horário.' });
    enviando = true; const b = $('#salvar'); b.disabled = true; b.textContent = 'Salvando…';
    const corpo = { id: a.id, acao: op, hora: form.hora.value };
    if (precisaInicio) corpo.hora_inicio = form.hora_inicio.value;
    const rr = await api('ag_acao', { corpo });
    if (rr.ok) { recado.pôr(rr.aviso ? rr.aviso : ({ chegou: 'Chegada registrada.', iniciar: 'Atendimento iniciado.', concluir: 'Atendimento concluído.' }[op])); location.replace(det); return; }
    enviando = false; b.disabled = false; b.textContent = 'Tentar novamente';
    if (rr.erros) mostrarErros(form, rr.erros);
    $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível.'), 'erro');
  };
  focarTitulo();
}

// Confirmação em página própria: cancelar / falta
async function telaConfirmarAg(op) {
  const T = op === 'cancelar' ? 'Cancelar atendimento?' : 'Marcar falta?';
  carregando(T);
  const r = await api('ag_ver', { id: params.get('id') });
  if (!r.ok) return telaErro(T, r.msg);
  const a = r.agendamento; const det = `${BASE}atendimento/?id=${qid()}`;
  const form = pagina({
    titulo: T, voltar: det, voltarTexto: 'Atendimento', formulario: op === 'cancelar',
    corpo: `<div class="bloco"><div class="servico-cabeca"><h2>${esc(a.cliente_nome)}</h2>${seloAg(a.situacao)}</div>
        <p class="ajuda">${esc(a.servico_nome)} · ${esc(dataLonga(a.data))}, ${a.inicio}–${a.fim} · ${esc(a.profissional_nome)}</p></div>
      ${avisoHTML(op === 'cancelar' ? 'O horário será <strong>liberado</strong> na agenda. O registro e o histórico são preservados.' : 'A falta fica registrada no histórico e o horário é liberado.')}
      ${op === 'cancelar' ? `<div class="campo"><label for="motivo">Motivo <span class="opcional">(opcional)</span></label><input id="motivo" name="motivo" maxlength="200" autocomplete="off"></div>` : ''}
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${det}">Voltar</a><button type="${op === 'cancelar' ? 'submit' : 'button'}" class="btn btn-perigo-cheio" id="confirmar">${op === 'cancelar' ? 'Sim, cancelar' : 'Sim, marcar falta'}</button>`
  });
  let enviando = false;
  const enviar = async (e) => {
    if (e) e.preventDefault(); if (enviando) return;
    enviando = true; const b = $('#confirmar'); b.disabled = true; b.textContent = 'Salvando…';
    const rr = await api('ag_acao', { corpo: { id: a.id, acao: op, motivo: form ? form.motivo.value : '' } });
    if (rr.ok) { recado.pôr(op === 'cancelar' ? 'Atendimento cancelado. O horário foi liberado.' : 'Falta registrada.'); location.replace(det); return; }
    enviando = false; b.disabled = false; b.textContent = 'Tentar novamente';
    $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível.'), 'erro');
  };
  if (form) form.onsubmit = enviar; else $('#confirmar').onclick = () => enviar();
  focarTitulo();
}

// Remarcar: data → horário → conferência (mesmas etapas do novo, com o rascunho "ag:rem:<id>")
async function prepararRemarcacao() {
  const id = params.get('id'); const chave = 'ag:rem:' + id;
  let d = lerRasc(chave);
  const r = await api('ag_ver', { id });
  if (!r.ok) return { erro: r.msg };
  const a = r.agendamento;
  if (!['agendado', 'confirmado'].includes(a.situacao)) return { erro: `Um atendimento “${SIT_AG[a.situacao]}” não pode ser remarcado.` };
  if (!d) { d = { cliente_id: a.cliente_id, cliente_nome: a.cliente_nome, servico_id: a.servico_id, servico_nome: a.servico_nome, profissional_id: a.profissional_id, profissional_nome: a.profissional_nome, data: null, inicio_min: null }; gravarRasc(chave, d); }
  return { a, chave };
}
async function telaRemarcar(passo) {
  const q = qid(); const det = `${BASE}atendimento/?id=${q}`; const R = `${BASE}atendimento/remarcar/`;
  carregando('Remarcar');
  const p = await prepararRemarcacao();
  if (p.erro) return telaErro('Remarcar', p.erro, det, 'Atendimento');
  const { a, chave } = p;
  if (passo === 'data') return etapaData({ chave, titulo: 'Remarcar: nova data', etapa: 1, total: 3, voltar: det, prox: `${R}horario/?id=${q}`, ehRemarcacao: a });
  if (passo === 'horario') return etapaHorario({ chave, titulo: 'Remarcar: novo horário', etapa: 2, total: 3, voltar: `${R}?id=${q}`, prox: `${R}conferencia/?id=${q}`, ignorar: a.id });
  const d = lerRasc(chave);
  if (!d || d.inicio_min == null) return ir(`${R}?id=${q}`);
  pagina({
    titulo: 'Conferir remarcação', etapa: 3, etapasTotal: 3, voltar: `${R}horario/?id=${q}`,
    corpo: `<div class="resumo">
        ${blocoResumo('Horário atual (será liberado)', [['Data', dataLonga(a.data)], ['Horário', `${a.inicio}–${a.fim}`], ['Profissional', a.profissional_nome]])}
        ${blocoResumo('Novo horário (será reservado)', [['Data', dataLonga(d.data)], ['Horário', `${d.inicio}–${d.fim}`], ['Fim do intervalo', d.reserva_fim], ['Profissional', d.profissional_nome]], `${R}?id=${q}`)}
      </div>
      ${avisoHTML('A troca é feita numa única operação: se o novo horário não estiver mais livre, nada muda. A presença precisará ser confirmada de novo.')}
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${R}horario/?id=${q}">${SETA} Voltar</a><button type="button" class="btn btn-cheio" id="salvar">Remarcar</button>`
  });
  let enviando = false;
  $('#salvar').onclick = async () => {
    if (enviando) return; enviando = true;
    const b = $('#salvar'); b.disabled = true; b.textContent = 'Salvando…';
    const rr = await api('ag_remarcar', { corpo: { id: a.id, data: d.data, inicio_min: d.inicio_min, profissional_id: d.profissional_id } });
    if (rr.ok) { apagarRasc(chave); recado.pôr('Atendimento remarcado. O horário anterior foi liberado.'); location.replace(det); return; }
    enviando = false; b.disabled = false; b.textContent = 'Tentar novamente';
    $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível remarcar.'), 'erro', rr.erro === 'indisponivel' ? `<div class="linha-acoes"><a class="btn btn-linha" href="${R}horario/?id=${q}">Escolher outro horário</a></div>` : '');
  };
  focarTitulo();
}

// ═══════════════════════════ HISTÓRICO ═════════════════════════════════════
async function telaHistorico() {
  const tipo = params.get('tipo') === 'encaixe' ? 'encaixe' : 'agendamento';
  const volta = tipo === 'encaixe' ? `${BASE}encaixes/detalhe/?id=${qid()}` : `${BASE}atendimento/?id=${qid()}`;
  carregando('Histórico');
  const r = await api(tipo === 'encaixe' ? 'enc_ver' : 'ag_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Histórico', r.msg, volta, 'Voltar');
  const itens = r.historico.slice().reverse();
  const nome = tipo === 'encaixe' ? r.encaixe.cliente_nome : r.agendamento.cliente_nome;
  pagina({
    titulo: 'Histórico', voltar: volta, voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(nome)}</p><ul class="lista linha-tempo" id="lista"></ul>${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar</a>`
  });
  let pg = 1;
  const desenhar = () => {
    const por = cabem($('#lista'), 64, 52 + 70 + 10);
    const paginas = Math.max(1, Math.ceil(itens.length / por)); pg = Math.min(pg, paginas);
    $('#lista').innerHTML = itens.slice((pg - 1) * por, pg * por).map(h => {
      const quando = new Date(h.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const det = h.detalhes ? Object.entries(h.detalhes).filter(([, v]) => v !== null && v !== false && v !== '').map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v === true ? 'sim' : v}`).join(' · ') : '';
      return `<li class="evento"><strong>${esc(ACOES_HIST[h.acao] || h.acao)}</strong><small>${esc(quando)}${det ? ' · ' + esc(det) : ''}</small></li>`;
    }).join('') || '<li class="vazio vazio-compacto"><p>Sem registros.</p></li>';
    ligarNav($('#nav'), { pagina: pg, paginas, total: itens.length, rotulo: 'registros' }, (n) => { pg = n; desenhar(); });
  };
  desenhar();
  focarTitulo();
}

// ═══════════════════════════ WHATSAPP E AVISOS ═════════════════════════════
function modelos(ctx) {
  const n = ctx.nome, s = ctx.servico, d = ctx.data, h = ctx.hora, e = ctx.estudio, p = ctx.prof ? `, com ${ctx.prof}` : '';
  return {
    confirmacao: `Olá, ${n}! Aqui é do ${e}. Seu horário de ${s} está marcado para ${d} às ${h}${p}. Você confirma sua presença?`,
    lembrete: `Olá, ${n}! Lembrete do ${e}: ${s} em ${d} às ${h}${p}. Te esperamos!`,
    remarcacao: `Olá, ${n}! Aqui é do ${e}. Seu atendimento de ${s} foi remarcado para ${d} às ${h}${p}. Qualquer dúvida, é só responder.`,
    cancelamento: `Olá, ${n}. Aqui é do ${e}. Seu atendimento de ${s} de ${d} às ${h} foi cancelado. Se quiser marcar um novo horário, é só responder.`,
    espera: `Olá, ${n}! Aqui é do ${e}. Você está na lista de encaixe para ${s} em ${d}, com chegada prevista às ${h}. É uma espera por vaga: o atendimento e o horário não estão garantidos. Avisaremos se surgir uma oportunidade.`,
    encaixe_cancelado: `Olá, ${n}. Aqui é do ${e}. Seu encaixe para ${s} em ${d} foi cancelado. Se quiser tentar outro dia, é só responder.`
  };
}
const NOMES_MODELO = { confirmacao: 'Confirmação', lembrete: 'Lembrete', remarcacao: 'Remarcação', cancelamento: 'Cancelamento', espera: 'Espera do encaixe', encaixe_cancelado: 'Cancelamento' };
async function telaWhatsapp() {
  const tipo = params.get('tipo') === 'encaixe' ? 'encaixe' : 'agendamento';
  const volta = tipo === 'encaixe' ? `${BASE}encaixes/detalhe/?id=${qid()}` : `${BASE}atendimento/?id=${qid()}`;
  carregando('WhatsApp e avisos');
  const r = await api(tipo === 'encaixe' ? 'enc_ver' : 'ag_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('WhatsApp e avisos', r.msg, volta, 'Voltar');
  const x = tipo === 'encaixe' ? r.encaixe : r.agendamento;
  const cl = r.cliente || {};
  const ctx = { nome: (cl.apelido || x.cliente_nome).split(' ')[0], servico: x.servico_nome, data: dataLonga(x.data).toLowerCase().replace(/^\w/, c => c), hora: tipo === 'encaixe' ? x.chegada_prevista : x.inicio,
    estudio: r.estudio || 'Brow Studio', prof: x.profissional_nome };
  // só os avisos que correspondem ao estado REAL
  let tipos = [];
  if (tipo === 'agendamento') {
    if (['agendado', 'confirmado', 'chegou'].includes(x.situacao)) tipos = x.remarcado ? ['confirmacao', 'lembrete', 'remarcacao'] : ['confirmacao', 'lembrete'];
    if (x.situacao === 'cancelado') tipos = ['cancelamento'];
  } else {
    if (x.situacao === 'aguardando') tipos = ['espera'];
    if (['cancelado', 'desistiu'].includes(x.situacao)) tipos = ['encaixe_cancelado'];
  }
  const M = modelos(ctx);
  const escolhido = tipos.includes(params.get('modelo')) ? params.get('modelo') : tipos[0];
  const pref = cl.contato_pref;
  const form = pagina({
    titulo: 'WhatsApp e avisos', voltar: volta, voltarTexto: 'Voltar', formulario: true,
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(x.cliente_nome)} · ${tipo === 'encaixe' ? 'Encaixe — ' + esc(SIT_ENC[x.situacao]) : esc(SIT_AG[x.situacao])}</p>
      ${!tipos.length ? avisoHTML(`Não há aviso para um ${tipo === 'encaixe' ? 'encaixe' : 'atendimento'} com situação “${esc(tipo === 'encaixe' ? SIT_ENC[x.situacao] : SIT_AG[x.situacao])}”.`) : `
      ${pref === 'nenhum' ? avisoHTML('<strong>Esta cliente prefere não receber contato.</strong> Só abra o WhatsApp se ela pediu este aviso.', 'erro') : pref === 'ligacao' ? avisoHTML('Preferência da cliente: <strong>ligação</strong>.') : pref === 'email' ? avisoHTML('Preferência da cliente: <strong>e-mail</strong>.') : ''}
      ${campoTexto({ id: 'whatsapp', rotulo: 'WhatsApp com DDD', valor: mascaraFone(x.whatsapp || cl.telefone || ''), tipo: 'tel', attrs: 'inputmode="tel" autocomplete="off" maxlength="16"' })}
      ${tipos.length > 1 ? grupoOpcoes({ nome: 'modelo', legenda: 'Mensagem', opcoes: Object.fromEntries(tipos.map(t => [t, NOMES_MODELO[t]])), valor: escolhido, colunas: 3 }) : `<p class="rotulo-simples"><strong>Mensagem:</strong> ${NOMES_MODELO[escolhido]}</p>`}
      <div class="campo"><label for="mensagem">Texto (pode editar)</label><textarea id="mensagem" name="mensagem" maxlength="1000" rows="5" class="curta">${esc(M[escolhido])}</textarea></div>
      ${pref === 'nenhum' ? `<label class="chave"><input type="checkbox" name="autorizado"><span><strong>A cliente pediu este aviso</strong><small>Libera o botão apenas desta vez.</small></span></label>` : ''}
      <p class="ajuda">O envio é feito por você, no WhatsApp. Abrir o aplicativo <strong>não</strong> marca a mensagem como enviada nem confirma presença.</p>`}
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar</a>${tipos.length ? `<button type="submit" class="btn btn-cheio" id="abrir">Abrir WhatsApp</button>` : ''}`
  });
  if (!tipos.length) { focarTitulo(); return; }
  form.whatsapp.addEventListener('input', (e) => { e.target.value = mascaraFone(e.target.value); });
  form.querySelectorAll('[name=modelo]').forEach(i => i.onchange = () => { form.mensagem.value = M[i.value]; });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const tel = digitos(form.whatsapp.value);
    if (!foneValido(tel)) return mostrarErros(form, { whatsapp: 'WhatsApp inválido. Use DDD + número, ex.: (11) 98888-7777.' });
    if (pref === 'nenhum' && !form.autorizado.checked) { $('#aviso').innerHTML = avisoHTML('Marque “A cliente pediu este aviso” para abrir o WhatsApp.', 'erro'); return; }
    if (!form.mensagem.value.trim()) return mostrarErros(form, { mensagem: 'Escreva a mensagem.' });
    // número corrigido aqui: grava no registro (o cadastro só muda na página do agendamento/encaixe, com a opção explícita)
    if (tel !== digitos(x.whatsapp)) {
      const s = await api('ag_whatsapp_salvar', { corpo: { tipo, id: x.id, whatsapp: tel, atualizar_cadastro: false } });
      if (!s.ok) { $('#aviso').innerHTML = avisoHTML(esc(s.msg || 'Não foi possível salvar o número.'), 'erro'); return; }
      x.whatsapp = tel;
    }
    const url = `https://wa.me/55${tel}?text=${encodeURIComponent(form.mensagem.value.trim())}`;
    window.open(url, '_blank', 'noopener');
    $('#aviso').innerHTML = avisoHTML(`WhatsApp aberto para ${esc(fone(tel))}. Confira e envie por lá. Nada foi marcado como enviado${tipo === 'agendamento' && x.situacao === 'agendado' ? ' — quando a cliente responder, use “Confirmar presença” no atendimento' : ''}.`, 'ok',
      `<div class="linha-acoes"><a class="btn btn-linha" href="${esc(url)}" target="_blank" rel="noopener">Abrir de novo</a></div>`);
  };
  focarTitulo();
}

// ═══════════════════════════ ENCAIXES ══════════════════════════════════════
const E = BASE + 'encaixes/';
async function telaEncaixes() {
  const cfgR = await api('ag_config_ver');
  if (!cfgR.ok) return telaErro('Encaixes', cfgR.msg);
  let data = /^\d{4}-\d{2}-\d{2}$/.test(params.get('data') || '') ? params.get('data') : cfgR.hoje;
  const msg = recado.tirar();
  pagina({
    titulo: 'Encaixes do dia', voltar: `${BASE}?data=${data}`, voltarTexto: 'Agenda',
    extra: `<a class="btn btn-cheio btn-topo" href="${E}novo/?data=${data}" id="novo" aria-label="Novo encaixe">+ Novo<span class="so-largo">&nbsp;encaixe</span></a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      <div class="barra-data">
        <button type="button" class="btn btn-linha btn-icone" id="dia-ant" aria-label="Dia anterior">‹</button>
        <div class="campo campo-data"><label for="data" class="sr-only">Data</label><input id="data" type="date" value="${data}"></div>
        <button type="button" class="btn btn-linha btn-icone" id="dia-prox" aria-label="Próximo dia">›</button>
      </div>
      <p class="ajuda">Encaixe é uma <strong>espera por vaga</strong>: a chegada prevista não reserva horário e o atendimento não é garantido.</p>
      <p class="linha-dia" id="linha-dia" aria-live="polite"></p>
      <ul class="lista" id="lista" aria-label="Encaixes"></ul>${navPaginas('nav')}`
  });
  let pg = 1, vez = 0;
  async function carregar() {
    const minha = ++vez;
    const r = await api('enc_listar', { query: { data, pagina: pg, limite: cabem($('#lista'), window.innerHeight <= 760 ? 70 : 80, 52 + 24) } });
    if (minha !== vez) return;
    if (!r.ok) { $('#lista').innerHTML = ''; $('#linha-dia').innerHTML = avisoHTML(esc(r.msg), 'erro'); return; }
    pg = r.pagina;
    const u = new URL(location.href); u.searchParams.set('data', data); history.replaceState(null, '', u);
    $('#novo').href = `${E}novo/?data=${data}`;
    $('#linha-dia').innerHTML = `<strong>${esc(dataLonga(data))}</strong> — ${r.aguardando} aguardando · ${r.total} no total`;
    $('#lista').innerHTML = r.total ? r.itens.map(e => `
      <li class="item item-ag${['cancelado', 'desistiu', 'concluido'].includes(e.situacao) ? ' item-inativo' : ''}">
        <div class="hora-bloco ordem"><strong>${e.ordem}º</strong><span>${e.chegada_prevista}</span></div>
        <div class="item-info"><div class="item-nome">${esc(e.cliente_nome)}</div><div class="item-extra"><span class="selo-mini sm-${e.situacao}">${esc(SIT_ENC[e.situacao])} · </span>${e.chegada_real && e.situacao === 'aguardando' ? `<strong class="ja-chegou">Já chegou ${e.chegada_real}</strong> · ` : ''}${esc(e.servico_nome)} · ${esc(e.profissional_nome || 'Qualquer profissional')}</div></div>
        <span class="selo-lado">${seloEnc(e.situacao)}</span>
        <a class="btn btn-linha" href="${E}detalhe/?id=${encodeURIComponent(e.id)}" aria-label="Abrir encaixe ${e.ordem} de ${esc(e.cliente_nome)}, ${esc(SIT_ENC[e.situacao])}">Abrir</a></li>`).join('')
      : `<li class="vazio"><h2>Nenhum encaixe</h2><p>Ninguém aguardando neste dia.</p></li>`;
    ligarNav($('#nav'), { ...r, rotulo: 'encaixes' }, (n) => { pg = n; carregar(); });
  }
  const mudar = (d) => { data = d; pg = 1; $('#data').value = d; carregar(); };
  $('#data').onchange = (e) => e.target.value && mudar(e.target.value);
  $('#dia-ant').onclick = () => mudar(somaDias(data, -1));
  $('#dia-prox').onclick = () => mudar(somaDias(data, 1));
  carregar();
}
const novoEnc = () => ({ chave_envio: uuid(), cliente_id: null, whatsapp: '', atualizar_cadastro: false, profissional_id: null, servico_id: null, data: params.get('data') || null, chegada_prevista: '', observacoes: '' });

async function encChegada() {
  const d = lerRasc('enc:novo');
  if (!d || !d.servico_id) return ir(E + 'novo/servico/');
  const cfgR = await api('ag_config_ver');
  const hoje = cfgR.ok ? cfgR.hoje : new Date().toISOString().slice(0, 10);
  const form = pagina({
    titulo: 'Novo encaixe', etapa: 2, etapasTotal: 3, formulario: true, voltar: E + 'novo/servico/', voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Data e chegada prevista (2ª parte) · ${esc(d.cliente_nome)}</p>
      <div class="duas-colunas">
        ${campoTexto({ id: 'data', rotulo: 'Data', valor: d.data && d.data >= hoje ? d.data : hoje, tipo: 'date', attrs: `min="${hoje}"` })}
        ${campoTexto({ id: 'chegada_prevista', rotulo: 'Chegada prevista', valor: d.chegada_prevista || (cfgR.ok ? cfgR.agora : ''), tipo: 'time' })}
      </div>
      ${avisoHTML('A chegada prevista <strong>não reserva horário</strong>. Pode coincidir com agendamentos e com outros encaixes.')}
      <div class="campo"><label for="observacoes">Observações <span class="opcional">(opcional)</span></label>
        <textarea id="observacoes" name="observacoes" maxlength="500" rows="2" class="curta">${esc(d.observacoes || '')}</textarea></div>`,
    acoes: `<a class="btn btn-linha" href="${E}novo/servico/">${SETA} Voltar</a><button type="submit" class="btn btn-cheio">Próximo <span aria-hidden="true">→</span></button>`
  });
  const guardar = () => gravarRasc('enc:novo', { ...lerRasc('enc:novo'), data: form.data.value, chegada_prevista: form.chegada_prevista.value, observacoes: form.observacoes.value });
  form.addEventListener('input', guardar); form.addEventListener('change', guardar);
  form.onsubmit = (e) => {
    e.preventDefault();
    const er = {};
    if (!form.data.value) er.data = 'Escolha a data.'; else if (form.data.value < hoje) er.data = 'A data já passou.';
    if (!form.chegada_prevista.value) er.chegada_prevista = 'Informe a chegada prevista.';
    if (!mostrarErros(form, er)) return;
    guardar(); ir(E + 'novo/conferencia/');
  };
  focarTitulo();
}
async function encConferencia() {
  const d = lerRasc('enc:novo');
  if (!d || !d.chegada_prevista) return ir(E + 'novo/');
  pagina({
    titulo: 'Conferir encaixe', etapa: 3, etapasTotal: 3, voltar: E + 'novo/chegada/', voltarTexto: 'Voltar',
    corpo: `${d.retorno_id ? '<p class="etapa vinculo">Retorno: fica como “Aguardando encaixe”, sem horário confirmado.</p>' : ''}<div class="selo-encaixe" role="note"><strong>Encaixe — aguardando disponibilidade</strong><span>O atendimento e o horário não estão garantidos.</span></div>
      <div class="resumo">${blocoResumo('Encaixe', [['Cliente', d.cliente_nome], ['WhatsApp', d.whatsapp ? fone(d.whatsapp) + (d.atualizar_cadastro ? ' (atualiza o cadastro)' : '') : ''],
        ['Serviço', d.servico_nome + ` · ${d.duracao_min} min${d.intervalo_min ? ` + ${d.intervalo_min}` : ''}`], ['Profissional', d.profissional_nome || 'Qualquer profissional'],
        ['Data', dataLonga(d.data)], ['Chegada prevista', d.chegada_prevista], ['Observações', d.observacoes]], E + 'novo/')}</div>
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${E}novo/chegada/">${SETA} Voltar</a><button type="button" class="btn btn-cheio" id="salvar">Registrar encaixe</button>`
  });
  let enviando = false;
  $('#salvar').onclick = async () => {
    if (enviando) return; enviando = true;
    const b = $('#salvar'); b.disabled = true; b.textContent = 'Salvando…';
    const r = await api('enc_criar', { corpo: { chave_envio: d.chave_envio, cliente_id: d.cliente_id, whatsapp: d.whatsapp || null, atualizar_cadastro: !!d.atualizar_cadastro,
      servico_id: d.servico_id, profissional_id: d.profissional_id || null, data: d.data, chegada_prevista: d.chegada_prevista, observacoes: d.observacoes || '', retorno_id: d.retorno_id || undefined } });
    if (r.ok && d.retorno_id) { apagarRasc('enc:novo'); recado.pôr(`Retorno na lista de encaixe (${r.ordem}º). Horário não garantido.`); location.replace(`/brow-studio/retornos/ver/?id=${encodeURIComponent(d.retorno_id)}`); return; }
    if (r.ok) { apagarRasc('enc:novo'); recado.pôr(`Encaixe registrado (${r.ordem}º na lista).`); location.replace(`${E}detalhe/?id=${encodeURIComponent(r.id)}`); return; }
    enviando = false; b.disabled = false; b.textContent = 'Tentar novamente';
    $('#aviso').innerHTML = avisoHTML(`${esc(r.msg || 'Não foi possível registrar.')}${r.erros ? ' ' + esc(Object.values(r.erros).join(' ')) : ''}`, 'erro');
  };
  focarTitulo();
}
async function telaEncaixe() {
  carregando('Encaixe');
  const r = await api('enc_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Encaixe', r.msg, E, 'Encaixes');
  const e = r.encaixe; const q = qid(); const s = e.situacao;
  const msg = recado.tirar();
  const B = (href, txt, cls = 'btn-suave') => `<a class="btn ${cls}" href="${href}">${txt}</a>`;
  const acoes = [];
  if (s === 'aguardando' && !e.chegada_real) acoes.push(`<button type="button" class="btn btn-suave" data-op="chegou">Registrar chegada</button>`);
  if (s === 'aguardando') acoes.push(B(`${E}efetivar/?id=${q}`, 'Ver oportunidades', 'btn-cheio'));
  if (e.agendamento_id) acoes.push(B(`${BASE}atendimento/?id=${encodeURIComponent(e.agendamento_id)}`, 'Abrir atendimento reservado', 'btn-cheio'));
  acoes.push(B(`${BASE}whatsapp/?tipo=encaixe&id=${q}`, 'WhatsApp'));
  if (['aguardando', 'chamado'].includes(s)) { acoes.push(B(`${E}encerrar/?id=${q}&acao=desistiu`, 'Desistiu')); acoes.push(B(`${E}encerrar/?id=${q}&acao=cancelar`, 'Cancelar', 'btn-perigo')); }
  acoes.push(B(`${BASE}historico/?tipo=encaixe&id=${q}`, 'Histórico'));
  pagina({
    titulo: `Encaixe nº ${e.ordem}`, voltar: `${E}?data=${e.data}`, voltarTexto: 'Encaixes',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      ${s === 'aguardando' ? `<div class="selo-encaixe" role="note"><strong>Encaixe — aguardando disponibilidade</strong><span>O atendimento e o horário não estão garantidos.</span></div>` : ''}
      <div class="servico-cabeca"><h2>${esc(e.cliente_nome)}</h2>${seloEnc(s)}</div>
      <div class="bloco"><dl class="dados">
        <dt>WhatsApp</dt><dd>${e.whatsapp ? esc(fone(e.whatsapp)) : 'Não informado'}</dd>
        <dt>Serviço</dt><dd>${esc(e.servico_nome)} · ${e.duracao_min} min${e.intervalo_min ? ` + ${e.intervalo_min}` : ''} · ${reais(e.valor_centavos)}</dd>
        <dt>Profissional</dt><dd>${esc(e.profissional_nome || 'Qualquer profissional')}</dd>
        <dt>Data</dt><dd>${esc(dataLonga(e.data))}</dd>
        <dt>Chegada</dt><dd>prevista ${e.chegada_prevista} <small>(não reserva horário)</small> · ${e.chegada_real ? `<strong class="ja-chegou">chegou ${e.chegada_real}</strong>` : 'ainda não chegou'}</dd>
        ${r.agendamento ? `<dt>Horário reservado</dt><dd>${r.agendamento.inicio}–${r.agendamento.fim} com ${esc(r.agendamento.profissional_nome)} (${esc(SIT_AG[r.agendamento.situacao])})</dd>` : ''}
        ${e.observacoes ? `<dt>Observações</dt><dd>${esc(e.observacoes)}</dd>` : ''}
      </dl></div>
      <div id="aviso"></div>
      <nav class="acoes-grade" aria-label="Ações do encaixe">${acoes.join('')}</nav>`,
    acoes: `<a class="btn btn-linha" href="${E}?data=${e.data}">${SETA} Voltar aos encaixes</a>`
  });
  app.querySelectorAll('[data-op]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const rr = await api('enc_acao', { corpo: { id: e.id, acao: b.dataset.op } });
    if (rr.ok) { recado.pôr('Chegada registrada.'); location.reload(); return; }
    b.disabled = false; $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível.'), 'erro');
  });
  focarTitulo();
}
async function telaEncerrarEnc() {
  const op = params.get('acao') === 'desistiu' ? 'desistiu' : 'cancelar';
  const T = op === 'cancelar' ? 'Cancelar encaixe?' : 'Registrar desistência?';
  carregando(T);
  const r = await api('enc_ver', { id: params.get('id') });
  if (!r.ok) return telaErro(T, r.msg, E, 'Encaixes');
  const e = r.encaixe; const det = `${E}detalhe/?id=${qid()}`;
  const form = pagina({
    titulo: T, voltar: det, voltarTexto: 'Encaixe', formulario: true,
    corpo: `<div class="bloco"><div class="servico-cabeca"><h2>${esc(e.cliente_nome)}</h2>${seloEnc(e.situacao)}</div><p class="ajuda">Encaixe nº ${e.ordem} · ${esc(e.servico_nome)} · ${esc(dataLonga(e.data))}</p></div>
      ${avisoHTML(`O encaixe sai da espera e o histórico é preservado.${e.agendamento_id ? ' <strong>O horário reservado pela efetivação também será liberado.</strong>' : ''}`)}
      <div class="campo"><label for="motivo">Motivo <span class="opcional">(opcional)</span></label><input id="motivo" name="motivo" maxlength="200" autocomplete="off"></div>
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${det}">Voltar</a><button type="submit" class="btn btn-perigo-cheio" id="confirmar">${op === 'cancelar' ? 'Sim, cancelar' : 'Sim, desistiu'}</button>`
  });
  let enviando = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); if (enviando) return; enviando = true;
    const b = $('#confirmar'); b.disabled = true; b.textContent = 'Salvando…';
    const rr = await api('enc_acao', { corpo: { id: e.id, acao: op, motivo: form.motivo.value } });
    if (rr.ok) { recado.pôr(op === 'cancelar' ? 'Encaixe cancelado.' : 'Desistência registrada.'); location.replace(det); return; }
    enviando = false; b.disabled = false; b.textContent = 'Tentar novamente';
    $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível.'), 'erro');
  };
  focarTitulo();
}
// Oportunidades: horários livres agora (por cancelamento, desistência, término antecipado...)
async function telaOportunidades() {
  const det = `${E}detalhe/?id=${qid()}`;
  carregando('Oportunidades');
  let pg = 1, ajuste = 0;
  const primeiro = await api('enc_oportunidades', { id: params.get('id'), query: { pagina: 1, limite: 6 } });
  if (!primeiro.ok) return telaErro('Oportunidades', primeiro.msg, det, 'Encaixe');
  const e = primeiro.encaixe;
  pagina({
    titulo: 'Oportunidades', voltar: det, voltarTexto: 'Encaixe',
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(e.cliente_nome)} · ${esc(e.servico_nome)} (${e.duracao_min} min${e.intervalo_min ? ` + ${e.intervalo_min}` : ''})</p>
      <p class="ajuda">Só aparecem horários com tempo para o serviço <strong>e</strong> o intervalo, sem alcançar o próximo atendimento. Você decide se e quando chamar a cliente.</p>
      <div id="estado"></div><ul class="lista" id="lista" aria-label="Oportunidades"></ul>${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${det}">${SETA} Voltar ao encaixe</a>`
  });
  async function carregar() {
    const lim = ajuste || cabem($('#lista'), window.innerHeight <= 760 ? 70 : 78, 52 + 74);
    const r = await api('enc_oportunidades', { id: params.get('id'), query: { pagina: pg, limite: lim } });
    if (!r.ok) { $('#estado').innerHTML = avisoHTML(esc(r.msg), 'erro'); return; }
    $('#estado').innerHTML = r.motivo ? avisoHTML(esc(r.motivo)) : '';
    $('#lista').innerHTML = r.itens.map(o => `
      <li class="item item-ag"><div class="hora-bloco"><strong>${o.inicio}</strong><span>${o.fim}</span></div>
        <div class="item-info"><div class="item-nome">${esc(o.profissional_nome)}</div><div class="item-extra">até ${o.reserva_fim} c/ intervalo</div></div>
        <a class="btn btn-linha" href="${E}efetivar/conferencia/?id=${qid()}&prof=${encodeURIComponent(o.profissional_id)}&inicio=${o.inicio_min}">Escolher</a></li>`).join('');
    ligarNav($('#nav'), { ...r, rotulo: 'horários' }, (n) => { pg = n; carregar(); });
    if (passou() && r.itens.length > 2 && !ajuste) { ajuste = r.itens.length - 1; carregar(); }
  }
  carregar();
  focarTitulo();
}
async function telaEfetivarConf() {
  const det = `${E}detalhe/?id=${qid()}`;
  const ini = parseInt(params.get('inicio'), 10); const profId = params.get('prof');
  carregando('Efetivar encaixe');
  const r = await api('enc_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Efetivar encaixe', r.msg, E, 'Encaixes');
  const e = r.encaixe;
  const cfgR = await api('ag_config_ver');
  const prof = cfgR.ok ? (cfgR.profissionais.find(p => p.id === profId) || {}).nome : '';
  pagina({
    titulo: 'Efetivar encaixe', voltar: `${E}efetivar/?id=${qid()}`, voltarTexto: 'Oportunidades',
    corpo: `<div class="resumo">${blocoResumo('Reservar este horário', [['Cliente', e.cliente_nome], ['Serviço', e.servico_nome], ['Profissional', prof], ['Data', dataLonga(e.data)],
        ['Início', hhmm(ini)], ['Término previsto', hhmm(ini + e.duracao_min)], ['Fim do intervalo', hhmm(ini + e.duracao_min + e.intervalo_min)], ['Valor', reais(e.valor_centavos)]])}</div>
      ${avisoHTML('Antes de reservar, o sistema confere de novo se o tempo cabe sem prejudicar o próximo atendimento. Se não couber, a cliente continua aguardando.')}
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${E}efetivar/?id=${qid()}">${SETA} Voltar</a><button type="button" class="btn btn-cheio" id="salvar">Reservar e chamar</button>`
  });
  let enviando = false;
  $('#salvar').onclick = async () => {
    if (enviando) return; enviando = true;
    const b = $('#salvar'); b.disabled = true; b.textContent = 'Reservando…';
    const rr = await api('enc_efetivar', { corpo: { id: e.id, profissional_id: profId, inicio_min: ini } });
    if (rr.ok) { recado.pôr('Encaixe efetivado: horário reservado e vinculado ao encaixe.'); location.replace(`${BASE}atendimento/?id=${encodeURIComponent(rr.id)}`); return; }
    enviando = false; b.disabled = false; b.textContent = 'Tentar novamente';
    $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível efetivar.'), 'erro', `<div class="linha-acoes"><a class="btn btn-linha" href="${E}efetivar/?id=${qid()}">Ver outras oportunidades</a><a class="btn btn-linha" href="${det}">Voltar ao encaixe</a></div>`);
  };
  focarTitulo();
}

// ═══════════════════════════ CONFIGURAÇÕES ═════════════════════════════════
const C = BASE + 'configuracoes/';
async function telaConfig() {
  const r = await api('ag_config_ver');
  if (!r.ok) return telaErro('Configurações da agenda', r.msg);
  const h = r.config.horarios || {};
  const abertos = [0, 1, 2, 3, 4, 5, 6].filter(d => h[d] && h[d].aberto).length;
  const msg = recado.tirar();
  pagina({
    titulo: 'Configurações da agenda', voltar: BASE, voltarTexto: 'Agenda',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      <nav class="menu-botoes" aria-label="Configurações">
        <a class="btn btn-suave" href="${C}estudio/">Estúdio e fuso horário <small class="sub-btn">${esc(r.config.nome_estudio)} · ${esc(r.config.fuso.replace('America/', '').replace('_', ' '))}</small></a>
        <a class="btn btn-suave" href="${C}horarios/">Horários e pausas <small class="sub-btn">${abertos ? `${abertos} dia(s) aberto(s)` : 'não configurado'}</small></a>
        <a class="btn btn-suave" href="${C}profissionais/">Profissionais <small class="sub-btn">${r.profissionais.filter(p => p.ativo).length} ativa(s)</small></a>
        <a class="btn btn-suave" href="${C}bloqueios/">Bloqueios de agenda <small class="sub-btn">folgas, cursos, compromissos</small></a>
      </nav>`,
    acoes: `<a class="btn btn-linha" href="${BASE}">${SETA} Voltar à agenda</a>`
  });
  focarTitulo();
}
async function telaCfgEstudio() {
  const r = await api('ag_config_ver');
  if (!r.ok) return telaErro('Estúdio', r.msg, C, 'Configurações');
  const form = pagina({
    titulo: 'Estúdio e fuso', voltar: C, voltarTexto: 'Configurações', formulario: true,
    corpo: `${campoTexto({ id: 'nome_estudio', rotulo: 'Nome do estúdio (aparece nas mensagens)', valor: r.config.nome_estudio, attrs: 'maxlength="60" autocomplete="off"' })}
      <div class="campo"><label for="fuso">Fuso horário do estabelecimento</label><select id="fuso" name="fuso">${r.fusos.map(f => `<option value="${f}" ${f === r.config.fuso ? 'selected' : ''}>${f.replace('America/', '').replace(/_/g, ' ')}</option>`).join('')}</select><span class="erro" id="fuso-erro"></span></div>
      ${grupoOpcoes({ nome: 'passo_min', legenda: 'Grade de horários (minutos)', opcoes: { 5: '5', 10: '10', 15: '15', 20: '20', 30: '30' }, valor: String(r.config.passo_min), colunas: 3 })}
      <p class="ajuda">Agora no estabelecimento: ${r.agora} de ${dataCurta(r.hoje)}.</p><div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${C}">Cancelar</a><button type="submit" class="btn btn-cheio" id="salvar">Salvar</button>`
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const rr = await api('ag_config_salvar', { corpo: { nome_estudio: form.nome_estudio.value, fuso: form.fuso.value, passo_min: (form.querySelector('[name=passo_min]:checked') || {}).value } });
    if (rr.ok) { recado.pôr('Configurações salvas.'); location.replace(C); return; }
    if (rr.erros) mostrarErros(form, rr.erros); $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível salvar.'), 'erro');
  };
  focarTitulo();
}
async function telaCfgHorarios() {
  const r = await api('ag_config_ver');
  if (!r.ok) return telaErro('Horários', r.msg, C, 'Configurações');
  const h = r.config.horarios || {};
  const msg = recado.tirar();
  pagina({
    titulo: 'Horários e pausas', voltar: C, voltarTexto: 'Configurações',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<ul class="lista lista-compacta">${[1, 2, 3, 4, 5, 6, 0].map(d => {
      const x = h[d];
      return `<li class="item item-compacto"><div class="item-info"><div class="item-nome">${DIAS[d]}</div>
        <div class="item-extra">${x && x.aberto ? `${x.inicio}–${x.fim}${(x.pausas || []).length ? ` · pausa ${x.pausas.map(p => p.inicio + '–' + p.fim).join(', ')}` : ''}` : 'Fechado'}</div></div>
        <a class="btn btn-linha" href="${C}horarios/dia/?d=${d}" aria-label="Editar ${DIAS[d]}">Editar</a></li>`; }).join('')}</ul>`,
    acoes: `<a class="btn btn-linha" href="${C}">${SETA} Voltar</a>`
  });
  focarTitulo();
}
async function telaCfgDia() {
  const d = String(params.get('d'));
  if (!/^[0-6]$/.test(d)) return ir(C + 'horarios/');
  const r = await api('ag_config_ver');
  if (!r.ok) return telaErro('Horário', r.msg, C + 'horarios/', 'Horários');
  const x = (r.config.horarios || {})[d] || { aberto: false, inicio: '', fim: '', pausas: [] };
  const p = x.pausas || [];
  const form = pagina({
    titulo: DIAS[d], voltar: C + 'horarios/', voltarTexto: 'Horários', formulario: true,
    corpo: `<label class="chave"><input type="checkbox" name="aberto" ${x.aberto ? 'checked' : ''}><span><strong>Aberto neste dia</strong></span></label>
      <div id="campos-dia">
      <div class="duas-colunas">${campoTexto({ id: 'inicio', rotulo: 'Abre às', valor: x.inicio || '', tipo: 'time' })}${campoTexto({ id: 'fim', rotulo: 'Fecha às', valor: x.fim || '', tipo: 'time' })}</div>
      <fieldset class="campo"><legend>Pausa 1 <span class="opcional">(opcional)</span></legend><div class="duas-colunas">
        ${campoTexto({ id: 'p1i', rotulo: 'Início', valor: (p[0] || {}).inicio || '', tipo: 'time' })}${campoTexto({ id: 'p1f', rotulo: 'Fim', valor: (p[0] || {}).fim || '', tipo: 'time' })}</div><span class="erro" id="pausa1-erro"></span></fieldset>
      <fieldset class="campo"><legend>Pausa 2 <span class="opcional">(opcional)</span></legend><div class="duas-colunas">
        ${campoTexto({ id: 'p2i', rotulo: 'Início', valor: (p[1] || {}).inicio || '', tipo: 'time' })}${campoTexto({ id: 'p2f', rotulo: 'Fim', valor: (p[1] || {}).fim || '', tipo: 'time' })}</div><span class="erro" id="pausa2-erro"></span></fieldset>
      </div><div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${C}horarios/">Cancelar</a><button type="submit" class="btn btn-cheio">Salvar</button>`
  });
  const alternar = () => { $('#campos-dia').hidden = !form.aberto.checked; };
  form.aberto.onchange = alternar; alternar();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const rr = await api('ag_horario_salvar', { corpo: { dia: d, aberto: form.aberto.checked, inicio: form.inicio.value, fim: form.fim.value,
      pausas: [{ inicio: form.p1i.value, fim: form.p1f.value }, { inicio: form.p2i.value, fim: form.p2f.value }] } });
    if (rr.ok) { recado.pôr(`${DIAS[d]} salvo.`); location.replace(C + 'horarios/'); return; }
    if (rr.erros) mostrarErros(form, rr.erros); $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível salvar.'), 'erro');
  };
  focarTitulo();
}
async function telaCfgProfs() {
  const r = await api('ag_config_ver');
  if (!r.ok) return telaErro('Profissionais', r.msg, C, 'Configurações');
  const msg = recado.tirar();
  pagina({
    titulo: 'Profissionais', voltar: C, voltarTexto: 'Configurações',
    extra: `<a class="btn btn-cheio btn-topo" href="${C}profissionais/editar/">+ Nova</a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<ul class="lista lista-compacta" id="lista">${r.profissionais.length ? r.profissionais.map(p => `
      <li class="item item-compacto${p.ativo ? '' : ' item-inativo'}"><div class="item-info"><div class="item-nome">${esc(p.nome)}</div><div class="item-extra">${p.ativo ? 'Ativa' : 'Inativa'}</div></div>
        <a class="btn btn-linha" href="${C}profissionais/editar/?id=${encodeURIComponent(p.id)}">Editar</a></li>`).join('')
      : '<li class="vazio"><h2>Nenhuma profissional</h2><p>Cadastre quem atende para a agenda calcular a disponibilidade de cada uma.</p></li>'}</ul>`,
    acoes: `<a class="btn btn-linha" href="${C}">${SETA} Voltar</a>`
  });
  focarTitulo();
}
async function telaCfgProf() {
  const id = params.get('id');
  const r = await api('ag_config_ver');
  if (!r.ok) return telaErro('Profissional', r.msg, C + 'profissionais/', 'Profissionais');
  const p = id ? r.profissionais.find(x => x.id === id) : null;
  if (id && !p) return telaErro('Profissional', 'Profissional não encontrada.', C + 'profissionais/', 'Profissionais');
  const chave = 'cfg:prof:novo';
  const d = p || lerRasc(chave) || { nome: '', ativo: true, chave_envio: uuid() };
  if (!p) gravarRasc(chave, d);
  const form = pagina({
    titulo: p ? 'Editar profissional' : 'Nova profissional', voltar: C + 'profissionais/', voltarTexto: 'Profissionais', formulario: true,
    corpo: `${campoTexto({ id: 'nome', rotulo: 'Nome', valor: d.nome, attrs: 'maxlength="60" autocomplete="off" autocapitalize="words"' })}
      <label class="chave"><input type="checkbox" name="ativo" ${d.ativo ? 'checked' : ''}><span><strong>Ativa</strong><small>Profissional inativa não aparece para novos agendamentos. Os atendimentos dela continuam guardados.</small></span></label>
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${C}profissionais/">Cancelar</a><button type="submit" class="btn btn-cheio" id="salvar">Salvar</button>`
  });
  let enviando = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (enviando) return;
    if (form.nome.value.trim().length < 2) return mostrarErros(form, { nome: 'Informe o nome.' });
    enviando = true;
    const rr = await api('ag_prof_salvar', { corpo: { id: p ? p.id : undefined, chave_envio: p ? undefined : d.chave_envio, nome: form.nome.value, ativo: form.ativo.checked } });
    if (rr.ok) { apagarRasc(chave); recado.pôr('Profissional salva.'); location.replace(C + 'profissionais/'); return; }
    enviando = false; if (rr.erros) mostrarErros(form, rr.erros); $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível salvar.'), 'erro');
  };
  focarTitulo();
}
async function telaCfgBloqueios() {
  const cfgR = await api('ag_config_ver');
  if (!cfgR.ok) return telaErro('Bloqueios', cfgR.msg, C, 'Configurações');
  let data = params.get('data') || cfgR.hoje;
  const msg = recado.tirar();
  pagina({
    titulo: 'Bloqueios', voltar: C, voltarTexto: 'Configurações',
    extra: `<a class="btn btn-cheio btn-topo" id="novo" href="${C}bloqueios/novo/?data=${data}">+ Novo</a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      <div class="barra-data"><button type="button" class="btn btn-linha btn-icone" id="dia-ant" aria-label="Dia anterior">‹</button>
        <div class="campo campo-data"><label for="data" class="sr-only">Data</label><input id="data" type="date" value="${data}"></div>
        <button type="button" class="btn btn-linha btn-icone" id="dia-prox" aria-label="Próximo dia">›</button></div>
      <div id="aviso"></div><ul class="lista lista-compacta" id="lista"></ul>`,
    acoes: `<a class="btn btn-linha" href="${C}">${SETA} Voltar</a>`
  });
  async function carregar() {
    const r = await api('ag_bloqueios_listar', { query: { data } });
    $('#novo').href = `${C}bloqueios/novo/?data=${data}`;
    if (!r.ok) { $('#aviso').innerHTML = avisoHTML(esc(r.msg), 'erro'); return; }
    $('#lista').innerHTML = r.itens.length ? r.itens.map(b => `<li class="item item-compacto"><div class="item-info"><div class="item-nome">${b.inicio}–${b.fim} · ${esc(b.profissional_nome)}</div><div class="item-extra">${esc(b.motivo || 'Sem motivo')}</div></div>
      <button type="button" class="btn btn-linha" data-id="${esc(b.id)}">Remover</button></li>`).join('') : `<li class="vazio vazio-compacto"><p>Nenhum bloqueio em ${esc(dataLonga(data))}.</p></li>`;
    $('#lista').querySelectorAll('[data-id]').forEach(btn => btn.onclick = async () => { btn.disabled = true; await api('ag_bloqueio_remover', { corpo: { id: btn.dataset.id } }); carregar(); });
  }
  const mudar = (d) => { data = d; $('#data').value = d; carregar(); };
  $('#data').onchange = (e) => e.target.value && mudar(e.target.value);
  $('#dia-ant').onclick = () => mudar(somaDias(data, -1)); $('#dia-prox').onclick = () => mudar(somaDias(data, 1));
  carregar(); focarTitulo();
}
async function telaCfgBloqueioNovo() {
  const r = await api('ag_config_ver');
  if (!r.ok) return telaErro('Novo bloqueio', r.msg, C + 'bloqueios/', 'Bloqueios');
  const profs = r.profissionais.filter(p => p.ativo);
  const chave = uuid();
  const form = pagina({
    titulo: 'Novo bloqueio', voltar: C + 'bloqueios/', voltarTexto: 'Bloqueios', formulario: true,
    corpo: `${profs.length ? grupoOpcoes({ nome: 'profissional_id', legenda: 'Profissional', opcoes: Object.fromEntries(profs.map(p => [p.id, p.nome])), valor: profs.length === 1 ? profs[0].id : '', colunas: 3 }) : avisoHTML('Cadastre uma profissional primeiro.', 'erro')}
      ${campoTexto({ id: 'data', rotulo: 'Data', valor: params.get('data') || r.hoje, tipo: 'date' })}
      <div class="duas-colunas">${campoTexto({ id: 'inicio', rotulo: 'Início', tipo: 'time' })}${campoTexto({ id: 'fim', rotulo: 'Fim', tipo: 'time' })}</div>
      ${campoTexto({ id: 'motivo', rotulo: 'Motivo', opcional: true, attrs: 'maxlength="80" autocomplete="off" placeholder="Ex.: curso, consulta"' })}<div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${C}bloqueios/">Cancelar</a><button type="submit" class="btn btn-cheio" id="salvar">Bloquear</button>`
  });
  let enviando = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (enviando) return; enviando = true;
    const rr = await api('ag_bloqueio_criar', { corpo: { chave_envio: chave, profissional_id: (form.querySelector('[name=profissional_id]:checked') || {}).value, data: form.data.value, inicio: form.inicio.value, fim: form.fim.value, motivo: form.motivo.value } });
    if (rr.ok) { recado.pôr('Bloqueio criado.'); location.replace(`${C}bloqueios/?data=${form.data.value}`); return; }
    enviando = false; if (rr.erros) mostrarErros(form, rr.erros); $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível bloquear.'), 'erro');
  };
  focarTitulo();
}

// ─── roteamento ─────────────────────────────────────────────────────────────
const TELAS = {
  dia: telaDia,
  'novo-cliente': () => etapaCliente({ chave: 'ag:novo', titulo: 'Novo agendamento', etapa: 1, total: 4, voltar: BASE, prox: N + 'servico/', novoRasc: novoAg, sub: 'Cliente e contato (1ª parte)' }),
  'novo-servico': () => etapaServico({ chave: 'ag:novo', titulo: 'Novo agendamento', etapa: 1, total: 4, voltar: N, prox: N + 'data/', sub: 'Profissional e serviço (2ª parte)' }),
  'novo-data': () => etapaData({ chave: 'ag:novo', titulo: 'Novo agendamento', etapa: 2, total: 4, voltar: N + 'servico/', prox: N + 'horario/' }),
  'novo-horario': () => etapaHorario({ chave: 'ag:novo', titulo: 'Novo agendamento', etapa: 3, total: 4, voltar: N + 'data/', prox: N + 'conferencia/' }),
  'novo-conferencia': novoConferencia,
  atendimento: telaAtendimento,
  registrar: telaRegistrar,
  documentos: telaDocumentos,
  cancelar: () => telaConfirmarAg('cancelar'),
  falta: () => telaConfirmarAg('falta'),
  'remarcar-data': () => telaRemarcar('data'),
  'remarcar-horario': () => telaRemarcar('horario'),
  'remarcar-conferencia': () => telaRemarcar('conferencia'),
  historico: telaHistorico,
  whatsapp: telaWhatsapp,
  encaixes: telaEncaixes,
  'enc-cliente': () => etapaCliente({ chave: 'enc:novo', titulo: 'Novo encaixe', etapa: 1, total: 3, voltar: E, prox: E + 'novo/servico/', novoRasc: novoEnc }),
  'enc-servico': () => etapaServico({ chave: 'enc:novo', titulo: 'Novo encaixe', etapa: 2, total: 3, voltar: E + 'novo/', prox: E + 'novo/chegada/', qualquer: true, sub: 'Serviço e profissional (1ª parte)' }),
  'enc-chegada': encChegada,
  'enc-conferencia': encConferencia,
  encaixe: telaEncaixe,
  'enc-encerrar': telaEncerrarEnc,
  oportunidades: telaOportunidades,
  'efetivar-conferencia': telaEfetivarConf,
  config: telaConfig,
  'cfg-estudio': telaCfgEstudio,
  'cfg-horarios': telaCfgHorarios,
  'cfg-dia': telaCfgDia,
  'cfg-profs': telaCfgProfs,
  'cfg-prof': telaCfgProf,
  'cfg-bloqueios': telaCfgBloqueios,
  'cfg-bloqueio-novo': telaCfgBloqueioNovo
};
(TELAS[document.body.dataset.pagina] || telaDia)();
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
