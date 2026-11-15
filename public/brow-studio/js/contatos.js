// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — CONTATOS DO ESTÚDIO (10/11/2026)
// Fornecedores, parceiros, profissionais e outros (clientes ficam no cadastro
// de clientes). Cada página tem rota própria. Rascunho entre etapas na aba:
// "ct:novo" ou "ct:<id>". Telefones: mesma normalização do servidor (com 55).
// Nada é enviado ou discado automaticamente: só abre o app do aparelho.
// ═══════════════════════════════════════════════════════════════════════════
import { $, params, esc, uuid, lerRasc, gravarRasc, apagarRasc, api, SETA, pagina, campoTexto, grupoOpcoes,
  mostrarErros, avisoHTML, focarTitulo, ir, blocoResumo } from './comum.js?v=4';

const BASE = '/brow-studio/contatos/';
const F = BASE + 'form/';
const CATEGORIAS = { fornecedor: 'Fornecedor', parceiro: 'Parceiro', profissional: 'Profissional', outro: 'Outro' };
const FILTROS = { todos: 'Todos', favoritos: 'Favoritos', fornecedor: 'Fornecedor', parceiro: 'Parceiro', profissional: 'Profissional', outro: 'Outro', arquivados: 'Arquivados' };
const DDD = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
const recado = { pôr(m) { try { sessionStorage.setItem('brow:recado', m); } catch (e) {} }, tirar() { try { const m = sessionStorage.getItem('brow:recado'); sessionStorage.removeItem('brow:recado'); return m; } catch (e) { return null; } } };
const carregando = (t) => pagina({ titulo: t, corpo: avisoHTML('Carregando…') });
function telaErro(titulo, msg) { pagina({ titulo, voltar: BASE, voltarTexto: 'Contatos', corpo: avisoHTML(esc(msg), 'erro'), acoes: `<a class="btn btn-cheio" href="${BASE}">Voltar</a>` }); focarTitulo(); }
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

// ─── telefones (mesma regra do servidor) ────────────────────────────────────
const brValido = (d) => (d.length === 10 || d.length === 11) && DDD.has(d.slice(0, 2)) && (d.length === 11 ? d[2] === '9' : /[2-5]/.test(d[2]));
function normalizar(v) {
  const bruto = String(v || '').trim();
  if (!bruto) return { ok: true, numero: null };
  if (/[^\d\s()+.\-]/.test(bruto)) return { ok: false };
  const mais = bruto.startsWith('+') || bruto.startsWith('00');
  let d = bruto.replace(/\D/g, ''); if (bruto.startsWith('00')) d = d.slice(2);
  if (!mais && brValido(d)) return { ok: true, numero: '55' + d };
  if (d.startsWith('55') && brValido(d.slice(2))) return { ok: true, numero: d };
  if (mais && !d.startsWith('55') && d.length >= 8 && d.length <= 15) return { ok: true, numero: d };
  return { ok: false };
}
function exibir(n) {
  if (!n) return '';
  if (n.startsWith('55') && brValido(n.slice(2))) { const d = n.slice(2); return d.length === 11 ? `+55 (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `+55 (${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; }
  return '+' + n;
}

// ─── rascunho ───────────────────────────────────────────────────────────────
const cid = () => params.get('id') || '';
const chave = () => cid() ? 'ct:' + cid() : 'ct:novo';
const qs = (semConf) => { const p = new URLSearchParams(); if (cid()) p.set('id', cid()); if (!semConf && params.get('conf') === '1') p.set('conf', '1'); const s = p.toString(); return s ? '?' + s : ''; };
const vazio = () => ({ chave_envio: uuid(), nome: '', categoria: '', empresa: '', profissional_id: '', telefone: '', whatsapp: '', email: '', observacoes: '' });
const ler = () => lerRasc(chave());
const guardar = (m) => gravarRasc(chave(), { ...ler(), ...m });
const irProx = (dest) => ir(params.get('conf') === '1' ? F + 'conferencia/' + qs(true) : dest);
function rodape(voltar, proxTexto, cancelar) {
  const conf = params.get('conf') === '1';
  return `${cancelar ? `<a class="btn btn-linha" href="${voltar}" id="cancelar">Cancelar</a>` : `<a class="btn btn-linha" href="${voltar}">${SETA} Voltar</a>`}<button type="submit" class="btn btn-cheio">${conf ? 'Voltar à conferência' : (proxTexto || 'Próximo <span aria-hidden="true">→</span>')}</button>`;
}
const tituloForm = () => cid() ? 'Editar contato' : 'Novo contato';

// ═══════════════════════════ LISTA ═════════════════════════════════════════
async function telaLista() {
  const msg = recado.tirar();
  let filtro = FILTROS[params.get('f')] ? params.get('f') : 'todos';
  pagina({
    titulo: 'Contatos do estúdio', voltar: '/brow-studio/profissional.html',
    extra: `<a class="btn btn-cheio btn-topo" href="${F}" aria-label="Novo contato">+ Novo<span class="so-largo">&nbsp;contato</span></a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      <form class="busca" role="search" id="form-busca"><div class="campo"><label for="q">Buscar por nome, empresa, telefone ou WhatsApp</label><input id="q" type="search" autocomplete="off" value="${esc(params.get('q') || '')}"></div></form>
      <div class="filtros-chips" role="radiogroup" aria-label="Filtrar contatos">${Object.entries(FILTROS).map(([v, t]) => `<label class="opcao opcao-chip"><input type="radio" name="f" value="${v}" ${v === filtro ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
      <div id="estado"></div><ul class="lista" id="lista" aria-label="Contatos"></ul>${navPaginas('nav')}`,
    acoes: ''
  });
  let pg = 1, vez = 0, ajuste = 0;
  async function carregar() {
    const minha = ++vez;
    const lim = ajuste || cabem($('#lista'), window.innerHeight <= 760 ? 70 : 80, 52 + 20);
    const termo = $('#q').value.trim();
    const r = await api('ct_listar', { query: { q: termo, filtro, pagina: pg, limite: lim } });
    if (minha !== vez) return;
    if (!r.ok) { $('#estado').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível carregar.'), 'erro'); $('#lista').innerHTML = ''; return; }
    const u = new URL(location.href); termo ? u.searchParams.set('q', termo) : u.searchParams.delete('q'); filtro !== 'todos' ? u.searchParams.set('f', filtro) : u.searchParams.delete('f'); history.replaceState(null, '', u);
    $('#lista').innerHTML = r.total ? r.itens.map(x => `<li class="item${x.arquivado ? ' item-inativo' : ''}"><div class="item-info"><div class="item-nome">${x.favorito ? '<span class="estrela" aria-label="Favorito">★</span> ' : ''}${esc(x.nome)}</div>
        <div class="item-extra">${esc(x.categoria_nome)}${x.empresa ? ' · ' + esc(x.empresa) : ''}${x.arquivado ? ' · arquivado' : ''}</div></div>
        <a class="btn btn-linha" href="${BASE}ver/?id=${encodeURIComponent(x.id)}" aria-label="Abrir ${esc(x.nome)}">Abrir</a></li>`).join('')
      : `<li class="vazio"><span class="avatar grande" aria-hidden="true">✦</span><h2>${termo || filtro !== 'todos' ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}</h2><p>${termo || filtro !== 'todos' ? 'Tente outra busca ou filtro.' : 'Toque em “Novo contato” para cadastrar fornecedores, parceiros e outros contatos.'}</p></li>`;
    ligarNav($('#nav'), { ...r, rotulo: 'contatos' }, (n) => { pg = n; carregar(); });
    if (passou() && lim > 2 && r.itens.length >= lim) { ajuste = lim - 1; carregar(); }
  }
  let e; $('#q').addEventListener('input', () => { clearTimeout(e); e = setTimeout(() => { pg = 1; carregar(); }, 300); });
  $('#form-busca').onsubmit = (ev) => { ev.preventDefault(); pg = 1; carregar(); };
  app.querySelectorAll('[name=f]').forEach(i => i.onchange = () => { filtro = i.value; pg = 1; ajuste = 0; carregar(); });
  carregar();
}
const app = document.getElementById('app');

// ═══════════════════════════ FORMULÁRIO EM ETAPAS ══════════════════════════
async function prepararRascunho() {
  if (ler()) return true;
  if (!cid()) { gravarRasc(chave(), vazio()); return true; }
  const r = await api('ct_ver', { id: cid() });
  if (!r.ok) { telaErro(tituloForm(), r.msg || 'Contato não encontrado.'); return false; }
  const x = r.contato;
  gravarRasc(chave(), { nome: x.nome, categoria: x.categoria, empresa: x.empresa || '', profissional_id: x.profissional_id || '', telefone: x.telefone ? exibir(x.telefone) : '', whatsapp: x.whatsapp ? exibir(x.whatsapp) : '', email: x.email || '', observacoes: x.observacoes || '' });
  return true;
}
async function etapaIdentificacao() {
  if (!(await prepararRascunho())) return;
  const d = ler();
  const cfg = await api('ag_config_ver');
  const profs = cfg.ok ? cfg.profissionais : [];
  const cancelar = cid() ? `${BASE}ver/?id=${encodeURIComponent(cid())}` : BASE;
  const form = pagina({
    titulo: tituloForm(), etapa: 1, etapasTotal: 4, formulario: true, voltar: cancelar, voltarTexto: cid() ? 'Contato' : 'Contatos',
    corpo: `<p class="etapa" style="margin-top:-8px">Identificação</p>
      ${campoTexto({ id: 'nome', rotulo: 'Nome', valor: d.nome, attrs: 'maxlength="100" autocomplete="off" autocapitalize="words"' })}
      ${grupoOpcoes({ nome: 'categoria', legenda: 'Categoria', opcoes: CATEGORIAS, valor: d.categoria })}
      ${campoTexto({ id: 'empresa', rotulo: 'Empresa', valor: d.empresa, opcional: true, attrs: 'maxlength="100" autocomplete="off"' })}
      <div class="campo" id="caixa-prof" ${d.categoria === 'profissional' ? '' : 'hidden'}><label for="profissional_id">Profissional da agenda <span class="opcional">(opcional, evita cadastro duplicado)</span></label>
        <select id="profissional_id" name="profissional_id"><option value="">Não vincular</option>${profs.map(p => `<option value="${esc(p.id)}" ${p.id === d.profissional_id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>
        <span class="ajuda">Cadastrar como Profissional não cria acesso ao sistema.</span></div><div id="aviso"></div>`,
    acoes: rodape(cancelar, null, true)
  });
  $('#cancelar').onclick = () => apagarRasc(chave());
  const lerForm = () => ({ nome: form.nome.value, categoria: (form.querySelector('[name=categoria]:checked') || {}).value || '', empresa: form.empresa.value, profissional_id: form.profissional_id.value });
  const atualizar = () => { const v = lerForm(); $('#caixa-prof').hidden = v.categoria !== 'profissional'; guardar(v); };
  form.addEventListener('input', atualizar); form.addEventListener('change', (e) => {
    atualizar();
    // vincular a uma profissional da agenda preenche o nome (sem copiar mais nada)
    if (e.target.name === 'profissional_id' && e.target.value && !form.nome.value.trim()) { const p = profs.find(x => x.id === e.target.value); if (p) { form.nome.value = p.nome; atualizar(); } }
  });
  form.onsubmit = (ev) => {
    ev.preventDefault(); const v = lerForm(); const er = {};
    if (v.nome.trim().length < 2) er.nome = 'Informe o nome.';
    if (!v.categoria) er.categoria = 'Escolha a categoria.';
    if (!mostrarErros(form, er)) return;
    guardar(v); irProx(F + 'telefones/' + qs());
  };
  focarTitulo();
}
function etapaTelefones() {
  const d = ler(); if (!d || !d.nome) return ir(F + qs());
  const form = pagina({
    titulo: tituloForm(), etapa: 2, etapasTotal: 4, formulario: true, voltar: F + qs(), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Telefone e WhatsApp · ${esc(d.nome)}</p>
      ${campoTexto({ id: 'telefone', rotulo: 'Telefone com DDD', valor: d.telefone, tipo: 'tel', opcional: true, attrs: 'inputmode="tel" autocomplete="off" maxlength="22" placeholder="(11) 3456-7890"' })}
      <button type="button" class="btn btn-suave" id="copiar">Usar o telefone também no WhatsApp</button>
      ${campoTexto({ id: 'whatsapp', rotulo: 'WhatsApp com DDD', valor: d.whatsapp, tipo: 'tel', opcional: true, attrs: 'inputmode="tel" autocomplete="off" maxlength="22" placeholder="(11) 98888-7777"', ajuda: 'Pode ser diferente do telefone. Número de fora do Brasil: comece com + e o código do país.' })}<div id="aviso"></div>`,
    acoes: rodape(F + qs())
  });
  const lerForm = () => ({ telefone: form.telefone.value, whatsapp: form.whatsapp.value });
  form.addEventListener('input', () => guardar(lerForm()));
  $('#copiar').onclick = () => {
    if (!form.telefone.value.trim()) return mostrarErros(form, { telefone: 'Preencha o telefone primeiro.' });
    form.whatsapp.value = form.telefone.value; guardar(lerForm()); form.whatsapp.focus();
  };
  form.onsubmit = (ev) => {
    ev.preventDefault(); const v = lerForm(); const er = {};
    if (!normalizar(v.telefone).ok) er.telefone = 'Telefone inválido. Use DDD + número, ex.: (11) 3456-7890.';
    if (!normalizar(v.whatsapp).ok) er.whatsapp = 'WhatsApp inválido. Use DDD + número, ex.: (11) 98888-7777.';
    if (!mostrarErros(form, er)) return;
    guardar(v); irProx(F + 'email/' + qs());
  };
  focarTitulo();
}
function etapaEmail() {
  const d = ler(); if (!d || !d.nome) return ir(F + qs());
  const form = pagina({
    titulo: tituloForm(), etapa: 3, etapasTotal: 4, formulario: true, voltar: F + 'telefones/' + qs(), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">E-mail e observações · ${esc(d.nome)}</p>
      ${campoTexto({ id: 'email', rotulo: 'E-mail', valor: d.email, tipo: 'email', opcional: true, attrs: 'inputmode="email" autocomplete="off" autocapitalize="none" maxlength="160"' })}
      <div class="campo"><label for="observacoes">Observações <span class="opcional">(opcional)</span></label><textarea id="observacoes" name="observacoes" maxlength="1000" rows="5" class="curta">${esc(d.observacoes || '')}</textarea></div><div id="aviso"></div>`,
    acoes: rodape(F + 'telefones/' + qs(), 'Conferência <span aria-hidden="true">→</span>')
  });
  const lerForm = () => ({ email: form.email.value.trim(), observacoes: form.observacoes.value });
  form.addEventListener('input', () => guardar(lerForm()));
  form.onsubmit = (ev) => {
    ev.preventDefault(); const v = lerForm();
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) return mostrarErros(form, { email: 'E-mail inválido. Ex.: nome@empresa.com' });
    guardar(v); ir(F + 'conferencia/' + qs(true));
  };
  focarTitulo();
}
async function etapaConferencia() {
  const d = ler(); if (!d || !d.nome) return ir(F + qs());
  const t = normalizar(d.telefone), w = normalizar(d.whatsapp);
  const dup = await api('ct_duplicados', { query: { telefone: d.telefone, whatsapp: d.whatsapp, excluir: cid() } });
  const lim = window.innerWidth < 600 ? (window.innerHeight < 700 ? 22 : 40) : 120;
  const corr = (etapa) => `${F}${etapa}${cid() ? `?id=${encodeURIComponent(cid())}&conf=1` : '?conf=1'}`;
  pagina({
    titulo: tituloForm(), etapa: 4, etapasTotal: 4, voltar: F + 'email/' + qs(true), voltarTexto: 'Voltar',
    corpo: `<p class="etapa so-largo-bloco" style="margin-top:-8px">Conferência</p>
      <div class="resumo resumo-ct">
        ${blocoResumo('Identificação', [['Nome', d.nome], ['Categoria', CATEGORIAS[d.categoria]], ['Empresa', d.empresa]], corr(''))}
        ${blocoResumo('Telefones', t.numero && t.numero === w.numero ? [[window.innerWidth < 600 ? 'Tel. e WhatsApp' : 'Telefone e WhatsApp', exibir(t.numero)]] : [['Telefone', t.numero ? exibir(t.numero) : ''], ['WhatsApp', w.numero ? exibir(w.numero) : '']], corr('telefones/'))}
        ${blocoResumo('E-mail e observações', [['E-mail', d.email], ['Observações', d.observacoes ? (d.observacoes.length > lim ? d.observacoes.slice(0, lim) + '…' : d.observacoes) : '']], corr('email/'))}
      </div>
      ${dup.ok && dup.itens.length ? avisoHTML(`Mesmo número já cadastrado: ${dup.itens.map(x => `<a href="${BASE}ver/?id=${encodeURIComponent(x.id)}">${esc(x.nome)}</a>`).join(', ')}. Abra o existente ou salve mesmo assim.`, 'erro aviso-dup') : ''}
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${F}email/${qs(true)}">${SETA} Voltar</a><button type="button" class="btn btn-cheio" id="salvar">Salvar contato</button>`
  });
  let env = false;
  $('#salvar').onclick = async () => {
    if (env) return; env = true;
    const b = $('#salvar'); b.disabled = true; b.textContent = 'Salvando…';
    const r = await api('ct_salvar', { corpo: { id: cid() || undefined, chave_envio: cid() ? undefined : d.chave_envio, nome: d.nome, categoria: d.categoria, empresa: d.empresa, profissional_id: d.profissional_id || null,
      telefone: d.telefone, whatsapp: d.whatsapp, email: d.email, observacoes: d.observacoes } });
    if (r.ok) { apagarRasc(chave()); recado.pôr(cid() ? 'Contato atualizado.' : 'Contato salvo.'); location.replace(`${BASE}ver/?id=${encodeURIComponent(r.id)}`); return; }
    env = false; b.disabled = false; b.textContent = 'Tentar novamente';
    $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível salvar.') + (r.erros ? ' ' + esc(Object.values(r.erros).join(' ')) : '') + '<br><small>Os dados continuam aqui.</small>', 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ DETALHES ══════════════════════════════════════
async function telaVer() {
  carregando('Contato');
  const r = await api('ct_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Contato', r.msg || 'Contato não encontrado.');
  const x = r.contato; const q = encodeURIComponent(x.id);
  const msg = recado.tirar();
  pagina({
    titulo: 'Contato', voltar: BASE, voltarTexto: 'Contatos',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}${x.arquivado ? avisoHTML('Contato arquivado (não aparece na lista principal).') : ''}
      <div class="servico-cabeca"><h2>${x.favorito ? '<span class="estrela" aria-label="Favorito">★</span> ' : ''}${esc(x.nome)}</h2><span class="selo selo-agendado">${esc(x.categoria_nome)}</span></div>
      <div class="resumo">${blocoResumo('Dados', [['Empresa', x.empresa], ...(x.profissional_nome ? [['Profissional da agenda', x.profissional_nome]] : []), ['Telefone', exibir(x.telefone)], ['WhatsApp', exibir(x.whatsapp)], ['E-mail', x.email], ['Observações', x.observacoes]])}</div>
      <div id="aviso"></div>
      <nav class="acoes-grade" aria-label="Ações do contato">
        <a class="btn btn-cheio" href="${BASE}contato/?id=${q}">Entrar em contato</a>
        <button type="button" class="btn btn-suave" id="favorito" aria-pressed="${x.favorito}">${x.favorito ? 'Remover dos favoritos' : 'Favoritar'}</button>
        <a class="btn btn-suave" href="${F}?id=${q}" id="editar">Editar</a>
        <a class="btn btn-suave" href="${BASE}arquivar/?id=${q}">${x.arquivado ? 'Desarquivar' : 'Arquivar'}</a>
        <a class="btn btn-perigo" href="${BASE}excluir/?id=${q}">Excluir</a>
      </nav>`,
    acoes: `<a class="btn btn-linha" href="${BASE}">${SETA} Voltar à lista</a>`
  });
  $('#editar').onclick = () => apagarRasc('ct:' + x.id);
  $('#favorito').onclick = async () => {
    const b = $('#favorito'); b.disabled = true;
    const rr = await api('ct_favorito', { corpo: { id: x.id, valor: !x.favorito } });
    if (rr.ok) { recado.pôr(x.favorito ? 'Removido dos favoritos.' : 'Adicionado aos favoritos.'); location.reload(); return; }
    b.disabled = false; $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível.'), 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ ENTRAR EM CONTATO ═════════════════════════════
async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true; }
  catch (e) { const t = document.createElement('textarea'); t.value = texto; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (_) {} t.remove(); return ok; }
}
async function telaContato() {
  carregando('Entrar em contato');
  const r = await api('ct_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Entrar em contato', r.msg);
  const x = r.contato; const volta = `${BASE}ver/?id=${encodeURIComponent(x.id)}`;
  const linha = (tipo, titulo, valor, extra) => valor
    ? `<section class="bloco canal"><div class="bloco-topo"><h2>${titulo}</h2></div><p class="destinatario">Destinatário: <strong>${esc(valor)}</strong></p>${extra || ''}
        <div class="linha-acoes"><button type="button" class="btn btn-cheio" data-abrir="${tipo}">${tipo === 'whatsapp' ? 'Abrir WhatsApp' : tipo === 'ligar' ? 'Ligar' : 'Abrir e-mail'}</button><button type="button" class="btn btn-linha" data-copiar="${esc(valor)}">Copiar</button></div><p class="ajuda" id="nota-${tipo}" aria-live="polite"></p></section>`
    : `<section class="bloco canal inativo"><div class="bloco-topo"><h2>${titulo}</h2></div><p class="ajuda">Não cadastrado. <a href="${F}${tipo === 'email' ? 'email/' : 'telefones/'}?id=${encodeURIComponent(x.id)}">Adicionar</a></p></section>`;
  pagina({
    titulo: 'Entrar em contato', voltar: volta, voltarTexto: 'Contato',
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(x.nome)} · ${esc(x.categoria_nome)}</p>
      ${linha('whatsapp', 'WhatsApp', exibir(x.whatsapp), `<div class="campo"><label for="msg">Mensagem <span class="opcional">(opcional, pode editar)</span></label><textarea id="msg" maxlength="1000" rows="2" class="curta"></textarea></div>`)}
      ${linha('ligar', 'Ligar', exibir(x.telefone))}
      ${linha('email', 'E-mail', x.email)}
      <p class="ajuda nota-canal">Nada é enviado nem discado sozinho: você conclui no app do aparelho.</p>`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar ao contato</a>`
  });
  app.querySelectorAll('[data-copiar]').forEach(b => b.onclick = async () => { const ok = await copiar(b.dataset.copiar); b.textContent = ok ? 'Copiado' : 'Não foi possível copiar'; setTimeout(() => { b.textContent = 'Copiar'; }, 2000); });
  app.querySelectorAll('[data-abrir]').forEach(b => b.onclick = () => {
    const tipo = b.dataset.abrir;
    const url = tipo === 'whatsapp' ? `https://wa.me/${x.whatsapp}${$('#msg').value.trim() ? '?text=' + encodeURIComponent($('#msg').value.trim()) : ''}`
      : tipo === 'ligar' ? `tel:+${x.telefone}` : `mailto:${x.email}`;
    const nota = $(`#nota-${tipo}`);
    let saiu = false;
    const marcar = () => { saiu = true; };
    window.addEventListener('blur', marcar, { once: true }); document.addEventListener('visibilitychange', marcar, { once: true });
    if (tipo === 'whatsapp') window.open(url, '_blank', 'noopener'); else location.href = url;
    nota.textContent = 'Aplicativo solicitado. Abrir não significa que a mensagem foi enviada ou que o contato foi feito.';
    // se o aparelho não tem app compatível, a página continua em primeiro plano: oferece copiar
    if (tipo !== 'whatsapp') setTimeout(() => { if (!saiu && !document.hidden) nota.textContent = `Parece que este aparelho não tem aplicativo de ${tipo === 'ligar' ? 'telefone' : 'e-mail'}. Use “Copiar” e cole onde precisar.`; }, 1500);
  });
  focarTitulo();
}

// ═══════════════════════════ ARQUIVAR / EXCLUIR ════════════════════════════
async function telaArquivar() {
  carregando('Arquivar contato');
  const r = await api('ct_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Arquivar', r.msg);
  const x = r.contato; const volta = `${BASE}ver/?id=${encodeURIComponent(x.id)}`; const arquivar = !x.arquivado;
  pagina({
    titulo: arquivar ? 'Arquivar contato?' : 'Desarquivar contato?', voltar: volta, voltarTexto: 'Contato',
    corpo: `<div class="bloco"><div class="servico-cabeca"><h2>${esc(x.nome)}</h2><span class="selo selo-agendado">${esc(x.categoria_nome)}</span></div></div>
      ${avisoHTML(arquivar ? 'O contato sai da lista principal, mas fica guardado (filtro “Arquivados”). Nada é apagado.' : 'O contato volta para a lista principal.')}<div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Cancelar</a><button type="button" class="btn btn-cheio" id="confirmar">${arquivar ? 'Sim, arquivar' : 'Sim, desarquivar'}</button>`
  });
  $('#confirmar').onclick = async () => {
    const rr = await api('ct_arquivar', { corpo: { id: x.id, valor: arquivar } });
    if (rr.ok) { recado.pôr(arquivar ? 'Contato arquivado.' : 'Contato desarquivado.'); location.replace(volta); return; }
    $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível.'), 'erro');
  };
  focarTitulo();
}
async function telaExcluir() {
  carregando('Excluir contato');
  const r = await api('ct_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Excluir', r.msg);
  const x = r.contato; const volta = `${BASE}ver/?id=${encodeURIComponent(x.id)}`;
  const form = pagina({
    titulo: 'Excluir contato?', voltar: volta, voltarTexto: 'Contato', formulario: true,
    corpo: `<div class="bloco"><div class="servico-cabeca"><h2>${esc(x.nome)}</h2><span class="selo selo-agendado">${esc(x.categoria_nome)}</span></div>
        <p class="ajuda">${esc([x.empresa, exibir(x.telefone), exibir(x.whatsapp)].filter(Boolean).join(' · '))}</p></div>
      ${x.profissional_id ? avisoHTML(`Este contato está vinculado à profissional <strong>${esc(x.profissional_nome || '')}</strong> da agenda. Excluir apaga só o contato: a profissional e os atendimentos continuam. <strong>Recomendado: arquivar.</strong>`, 'erro', `<div class="linha-acoes"><a class="btn btn-cheio" href="${BASE}arquivar/?id=${encodeURIComponent(x.id)}">Arquivar em vez de excluir</a></div>`)
        : avisoHTML('A exclusão é definitiva e apaga só este contato. Clientes, profissionais e registros de outros módulos não são afetados.')}
      <label class="chave"><input type="checkbox" name="confirmacao"><span><strong>Confirmo a exclusão deste contato</strong></span></label><span class="erro" id="confirmacao-erro"></span><div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Cancelar</a><button type="submit" class="btn btn-perigo-cheio" id="excluir">Excluir</button>`
  });
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    if (!form.confirmacao.checked) return mostrarErros(form, { confirmacao: 'Marque a confirmação.' });
    const rr = await api('ct_excluir', { corpo: { id: x.id, confirmacao: true } });
    if (rr.ok) { recado.pôr('Contato excluído.'); location.replace(BASE); return; }
    $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível excluir.'), 'erro');
  };
  focarTitulo();
}

// ─── roteamento ─────────────────────────────────────────────────────────────
const TELAS = { lista: telaLista, identificacao: etapaIdentificacao, telefones: etapaTelefones, email: etapaEmail, conferencia: etapaConferencia,
  ver: telaVer, contato: telaContato, arquivar: telaArquivar, excluir: telaExcluir };
(async () => {
  const pg = document.body.dataset.pagina;
  if (cid() && ['telefones', 'email', 'conferencia'].includes(pg) && !ler()) { carregando('Contato'); if (!(await prepararRascunho())) return; }
  (TELAS[pg] || telaLista)();
})();
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
