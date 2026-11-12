// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — PROMOÇÕES (12/11/2026)
// Equipe: lista (dona), ver, criar/editar em etapas (título → valores e datas →
// cartaz → conferência), ativar/desativar, cartaz grande, plano de pagamento do
// atendimento (sinal → saldo no dia → retoque) e "usar promoção" num horário.
// Público: página do cartaz (/brow-studio/promocao/?s=&id=) com "Quero essa
// promoção". Rascunho do formulário só nesta aba ("pm:novo" ou "pm:<id>").
// ═══════════════════════════════════════════════════════════════════════════
import { $, params, esc, uuid, lerRasc, gravarRasc, apagarRasc, api, SETA, pagina, campoTexto, grupoOpcoes,
  mostrarErros, avisoHTML, focarTitulo, ir } from './comum.js?v=4';
import { reais, resumoValores, textoRetoque } from './promo-card.js?v=1';

const BASE = '/brow-studio/promocoes/';
const F = BASE + 'form/';
const AT = '/brow-studio/agenda/atendimento/';
const recado = { pôr(m) { try { sessionStorage.setItem('brow:recado', m); } catch (e) {} }, tirar() { try { const m = sessionStorage.getItem('brow:recado'); sessionStorage.removeItem('brow:recado'); return m; } catch (e) { return null; } } };
const carregando = (t) => pagina({ titulo: t, corpo: avisoHTML('Carregando…') });
function telaErro(titulo, msg, voltar = BASE, voltarTexto = 'Promoções') { pagina({ titulo, voltar, voltarTexto, corpo: avisoHTML(esc(msg || 'Algo deu errado.'), 'erro'), acoes: `<a class="btn btn-cheio" href="${voltar}">Voltar</a>` }); focarTitulo(); }
const dataBr = (iso) => iso ? iso.split('-').reverse().join('/') : '';
const SELO = { ativa: 'selo-ativo', agendada: 'selo-inativo', encerrada: 'selo-inativo', desativada: 'selo-inativo' };
function cabem(el, altura, abaixo = 82) { const topo = el.getBoundingClientRect().top + window.scrollY; return Math.max(2, Math.floor((window.innerHeight - topo - abaixo + 10) / (altura + 10))); }
function paginar(el, nav, itens, altura, abaixo, desenhar, rotulo) {
  let pg = 1;
  const d = () => {
    const por = cabem(el, altura, abaixo); const paginas = Math.max(1, Math.ceil(itens.length / por)); pg = Math.min(pg, paginas);
    el.innerHTML = itens.slice((pg - 1) * por, pg * por).map(desenhar).join('');
    nav.hidden = paginas <= 1;
    nav.innerHTML = `<button type="button" class="btn btn-linha" data-ir="-1" ${pg <= 1 ? 'disabled' : ''}>${SETA} Anterior</button><span class="pag-info"><strong>${pg}</strong> de ${paginas}<span class="pag-total"> · ${itens.length} ${rotulo}</span></span><button type="button" class="btn btn-linha" data-ir="1" ${pg >= paginas ? 'disabled' : ''}>Próxima <span aria-hidden="true">→</span></button>`;
    nav.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => { pg += +b.dataset.ir; d(); });
  };
  d();
}
// cartaz ocupa só o espaço que sobra na tela (nunca cria rolagem)
function ajustarCartaz(img, folga = 12) {
  if (!img) return;
  const f = () => {
    const rodape = document.querySelector('.app-acoes'); const hr = rodape ? rodape.getBoundingClientRect().height : 0;
    const extra = img.closest('[data-depois]') ? +img.closest('[data-depois]').dataset.depois : 0;
    let alt = Math.max(110, Math.floor(window.innerHeight - (img.getBoundingClientRect().top + window.scrollY) - hr - folga - extra));
    img.style.maxHeight = alt + 'px';
    // o que ainda passar da tela (margens, espaçamentos) sai do cartaz
    for (let k = 0; k < 3; k++) {
      const sobra = document.documentElement.scrollHeight - window.innerHeight;
      if (sobra <= 0 || alt <= 110) break;
      alt = Math.max(110, alt - sobra - 1); img.style.maxHeight = alt + 'px';
    }
  };
  if (img.complete) f(); else img.addEventListener('load', f, { once: true });
  f(); window.addEventListener('resize', f);
}

// ═══════════════════════════ LISTA (dona) ══════════════════════════════════
async function telaLista() {
  carregando('Promoções');
  const r = await api('pm_listar');
  if (!r.ok) return telaErro('Promoções', r.msg, '/brow-studio/profissional.html', 'Menu');
  const msg = recado.tirar();
  const s = r.semente;
  pagina({
    titulo: 'Promoções', voltar: '/brow-studio/profissional.html', voltarTexto: 'Menu',
    extra: `<a class="btn btn-cheio btn-topo" href="${F}" id="nova">+ Nova<span class="so-largo">&nbsp;promoção</span></a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      ${r.semente_disponivel ? avisoHTML(`<strong>Promoção do cartaz:</strong> ${esc(s.titulo)} — ${reais(s.preco_centavos)} (sinal ${reais(s.sinal_centavos)} + ${reais(s.preco_centavos - s.sinal_centavos)} no dia), retoque ${reais(s.retoque_centavos)} em até ${s.retoque_dias} dias.`, 'compacto',
        `<div class="linha-acoes"><button type="button" class="btn btn-cheio" id="semente">Cadastrar promoção do cartaz</button></div>`) : ''}
      <div id="aviso" aria-live="polite"></div>
      ${r.itens.length ? '<ul class="lista" id="lista" aria-label="Promoções"></ul><nav class="paginacao" id="nav" hidden></nav>' : '<p class="ajuda" id="vazio">Nenhuma promoção cadastrada. Toque em “+ Nova”.</p>'}`
  });
  if (r.itens.length) paginar($('#lista'), $('#nav'), r.itens, 84, 82 + 60, (p) => `<li class="item"><div class="item-info"><div class="item-nome">${esc(p.titulo)}</div>
      <div class="item-extra"><span class="selo ${SELO[p.situacao]}">${esc(p.situacao_nome)}</span> ${esc(p.servico_nome)} · ${reais(p.preco_centavos)}${p.fim ? ' · até ' + dataBr(p.fim) : ''}</div></div>
      <a class="btn btn-suave" href="${BASE}ver/?id=${encodeURIComponent(p.id)}">Abrir</a></li>`, 'promoções');
  const sb = $('#semente');
  if (sb) sb.onclick = async () => {
    sb.disabled = true; sb.textContent = 'Cadastrando…';
    const rr = await api('pm_semente', { corpo: {} });
    if (rr.ok) { recado.pôr('Promoção do cartaz cadastrada e no ar.'); location.href = `${BASE}ver/?id=${encodeURIComponent(rr.id)}`; return; }
    sb.disabled = false; sb.textContent = 'Cadastrar promoção do cartaz';
    $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível cadastrar.'), 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ VER ═══════════════════════════════════════════
async function telaVer() {
  carregando('Promoção');
  const id = params.get('id') || '';
  const [r, eu] = await Promise.all([api('pm_ver', { id }), api('au_eu')]);
  const dona = eu && eu.ok && eu.usuario && eu.usuario.funcao === 'dona';
  const voltar = dona ? BASE : '/brow-studio/profissional.html';
  if (!r.ok) return telaErro('Promoção', r.msg, voltar, dona ? 'Promoções' : 'Menu');
  const p = r.promocao; const msg = recado.tirar();
  const cartaz = p.imagem_url ? `<a href="${BASE}cartaz/?id=${encodeURIComponent(p.id)}" class="promo-cartaz" aria-label="Ver o cartaz grande"><img id="cartaz" src="${esc(p.imagem_url)}" alt="Cartaz da promoção ${esc(p.titulo)}" style="width:clamp(96px,30vw,300px)"></a>` : '';
  pagina({
    titulo: 'Promoção', voltar, voltarTexto: dona ? 'Promoções' : 'Menu',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<div id="aviso" aria-live="polite"></div>
      <div class="promo-lado">${cartaz}
        <div class="promo-texto"><div class="servico-cabeca"><h2>${esc(p.titulo)}</h2><span class="selo ${SELO[p.situacao]}">${esc(p.situacao_nome)}</span></div>
        <dl class="dados" style="margin-top:8px">
          <dt>Serviço</dt><dd>${esc(p.servico_nome)}</dd>
          <dt>Preço total</dt><dd>${reais(p.preco_centavos)}</dd>
          ${p.sinal_centavos > 0 ? `<dt>Sinal</dt><dd>${reais(p.sinal_centavos)}</dd><dt>No dia</dt><dd>${reais(p.saldo_centavos)}</dd>` : ''}
          ${p.retoque_centavos > 0 ? `<dt>Retoque</dt><dd>${reais(p.retoque_centavos)} · até ${p.retoque_dias} dias</dd>` : ''}
          <dt>Período</dt><dd>${p.inicio ? 'De ' + dataBr(p.inicio) : 'Já valendo'}${p.fim ? ' até ' + dataBr(p.fim) : ' · sem data de fim'}</dd>
          <dt>Horários</dt><dd>${r.agendamentos} com esta promoção</dd>
        </dl></div></div>`,
    acoes: dona
      ? `<a class="btn btn-linha" href="${F}?id=${encodeURIComponent(p.id)}">Editar</a><button type="button" class="btn ${p.ativa ? 'btn-perigo' : 'btn-suave'}" id="ativar">${p.ativa ? 'Desativar' : 'Ativar'}</button>`
      : `<a class="btn btn-linha" href="${voltar}">${SETA} Menu</a>${p.imagem_url ? `<a class="btn btn-cheio" href="${BASE}cartaz/?id=${encodeURIComponent(p.id)}">Ver cartaz</a>` : ''}`
  });
  ajustarCartaz($('#cartaz'));
  const b = $('#ativar');
  if (b) b.onclick = async () => {
    b.disabled = true;
    const rr = await api('pm_ativar', { corpo: { id: p.id, ativa: !p.ativa } });
    if (rr.ok) { recado.pôr(p.ativa ? 'Promoção desativada: saiu do ar.' : 'Promoção ativada.'); location.reload(); return; }
    b.disabled = false; $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível.'), 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ CARTAZ GRANDE (equipe) ════════════════════════
async function telaCartaz() {
  carregando('Cartaz');
  const id = params.get('id') || '';
  const r = await api('pm_ver', { id });
  const voltar = `${BASE}ver/?id=${encodeURIComponent(id)}`;
  if (!r.ok) return telaErro('Cartaz', r.msg);
  const p = r.promocao;
  pagina({ titulo: p.titulo, voltar, voltarTexto: 'Promoção',
    corpo: p.imagem_url ? `<div class="promo-cartaz"><img id="cartaz" src="${esc(p.imagem_url)}" alt="Cartaz da promoção ${esc(p.titulo)}"></div>` : '<div class="promo-cartaz"><p class="sem-cartaz">Esta promoção não tem cartaz.</p></div>',
    acoes: `<a class="btn btn-linha" href="${voltar}">${SETA} Voltar</a>${r.link_publico ? `<button type="button" class="btn btn-cheio" id="copiar">Copiar link para clientes</button>` : ''}` });
  ajustarCartaz($('#cartaz'));
  const cp = $('#copiar');
  if (cp) cp.onclick = async () => {
    const url = location.origin + r.link_publico;
    try { await navigator.clipboard.writeText(url); cp.textContent = 'Link copiado'; } catch (e) { cp.textContent = url; }
  };
  focarTitulo();
}

// ═══════════════════════════ FORMULÁRIO (dona) ═════════════════════════════
const pid = () => params.get('id') || '';
const chave = () => pid() ? 'pm:' + pid() : 'pm:novo';
const qsId = () => pid() ? '?id=' + encodeURIComponent(pid()) : '';
const ler = () => lerRasc(chave());
const guardar = (m) => gravarRasc(chave(), { ...(ler() || {}), ...m });
const tituloForm = () => pid() ? 'Editar promoção' : 'Nova promoção';
const centavosTxt = (c) => c == null || c === '' ? '' : (c / 100).toFixed(2).replace('.', ',');
let SERVICOS = null;
async function servicos() {
  if (SERVICOS) return SERVICOS;
  const r = await api('pm_listar'); SERVICOS = r.ok ? r.servicos : []; return SERVICOS;
}
// rascunho pronto (novo ou carregado da promoção salva)
async function rascunho() {
  let d = ler();
  if (d) return d;
  if (!pid()) { d = { chave_envio: uuid(), titulo: '', descricao: '', servico_id: '', preco: '', sinal: '', retoque: '', retoque_dias: '', inicio: '', fim: '' }; gravarRasc(chave(), d); return d; }
  const r = await api('pm_ver', { id: pid() });
  if (!r.ok) return null;
  const p = r.promocao;
  d = { id: p.id, titulo: p.titulo, descricao: p.descricao || '', servico_id: p.servico_id, servico_nome: p.servico_nome, preco: centavosTxt(p.preco_centavos), sinal: centavosTxt(p.sinal_centavos),
    retoque: centavosTxt(p.retoque_centavos), retoque_dias: p.retoque_dias ? String(p.retoque_dias) : '', inicio: p.inicio || '', fim: p.fim || '', imagem_atual: p.imagem_url || null };
  gravarRasc(chave(), d); return d;
}
const RE_VALOR = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/;
const paraCent = (v) => { const s = String(v || '').trim().replace(/^R\$\s*/i, '').replace(/\s/g, ''); if (!s || !RE_VALOR.test(s)) return null; const [i, dd = ''] = s.replace(/\./g, '').split(','); return parseInt(i, 10) * 100 + parseInt((dd + '00').slice(0, 2), 10); };
const rodape = (voltar, prox = 'Próximo <span aria-hidden="true">→</span>') => `<a class="btn btn-linha" href="${voltar}">${SETA} Voltar</a><button type="submit" class="btn btn-cheio">${params.get('conf') === '1' ? 'Voltar à conferência' : prox}</button>`;
const proximo = (dest) => ir(params.get('conf') === '1' ? F + 'conferencia/' + qsId() : dest);

async function telaForm1() {
  carregando(tituloForm());
  const [d, sv] = await Promise.all([rascunho(), servicos()]);
  if (!d) return telaErro(tituloForm(), 'Promoção não encontrada.');
  const voltar = pid() ? `${BASE}ver/${qsId()}` : BASE;
  const form = pagina({ titulo: tituloForm(), etapa: 1, etapasTotal: 4, formulario: true, voltar, voltarTexto: pid() ? 'Promoção' : 'Promoções',
    corpo: `${campoTexto({ id: 'promo_titulo', rotulo: 'Título da promoção', valor: d.titulo, attrs: 'maxlength="80" autocomplete="off" placeholder="Ex.: Black Friday de final de ano"' })}
      <div class="campo"><label for="servico_id">Serviço da promoção</label><select id="servico_id" name="servico_id" aria-describedby="servico_id-erro"><option value="">Escolha o serviço</option>
        ${sv.map(s => `<option value="${esc(s.id)}" ${s.id === d.servico_id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}
        ${d.servico_id && !sv.some(s => s.id === d.servico_id) ? `<option value="${esc(d.servico_id)}" selected>${esc(d.servico_nome || 'Serviço atual')}</option>` : ''}</select><span class="erro" id="servico_id-erro" aria-live="polite"></span></div>
      ${campoTexto({ id: 'descricao', rotulo: 'Descrição curta', valor: d.descricao, opcional: true, attrs: 'maxlength="400" autocomplete="off" placeholder="Ex.: Técnica Shadow. Pagamento em 3 etapas."' })}`,
    acoes: `<a class="btn btn-linha" href="${voltar}">Cancelar</a><button type="submit" class="btn btn-cheio">${params.get('conf') === '1' ? 'Voltar à conferência' : 'Próximo <span aria-hidden="true">→</span>'}</button>` });
  form.onsubmit = (e) => {
    e.preventDefault(); const er = {};
    const titulo = form.promo_titulo.value.trim(), servico_id = form.servico_id.value;
    if (titulo.length < 3) er.promo_titulo = 'Informe o título da promoção.';
    if (!servico_id) er.servico_id = 'Escolha o serviço da promoção.';
    if (!mostrarErros(form, er)) return;
    const s = sv.find(x => x.id === servico_id);
    guardar({ titulo, servico_id, servico_nome: s ? s.nome : d.servico_nome, descricao: form.descricao.value.trim() });
    proximo(F + 'valores/' + qsId());
  };
  focarTitulo();
}

async function telaForm2() {
  const d = ler(); if (!d || !d.servico_id) return ir(F + qsId());
  const form = pagina({ titulo: tituloForm(), etapa: 2, etapasTotal: 4, formulario: true, voltar: F + qsId(), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(d.servico_nome || '')}</p>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px">
      ${campoTexto({ id: 'preco', rotulo: 'Preço total (R$)', valor: d.preco, attrs: 'inputmode="decimal" autocomplete="off" placeholder="290,00"' })}
      ${campoTexto({ id: 'sinal', rotulo: 'Sinal (R$)', valor: d.sinal, opcional: true, attrs: 'inputmode="decimal" autocomplete="off" placeholder="50,00"' })}
      ${campoTexto({ id: 'retoque', rotulo: 'Retoque (R$)', valor: d.retoque, opcional: true, attrs: 'inputmode="decimal" autocomplete="off" placeholder="80,00"' })}
      ${campoTexto({ id: 'retoque_dias', rotulo: 'Retoque em até (dias)', valor: d.retoque_dias, opcional: true, attrs: 'inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" placeholder="40"' })}
      ${campoTexto({ id: 'inicio', rotulo: 'Começa em', valor: d.inicio, tipo: 'date', opcional: true })}
      ${campoTexto({ id: 'fim', rotulo: 'Termina em', valor: d.fim, tipo: 'date', opcional: true })}
      </div><p class="ajuda" id="saldo" aria-live="polite"></p>`,
    acoes: rodape(F + qsId()) });
  const mostrarSaldo = () => { const p = paraCent(form.preco.value), s = paraCent(form.sinal.value) || 0; $('#saldo').textContent = p ? (s ? `No dia: ${reais(p - s)}. ` : '') + (form.fim.value ? '' : 'Sem data de fim: fica no ar até você desativar.') : ''; };
  form.addEventListener('input', mostrarSaldo); mostrarSaldo();
  form.onsubmit = (e) => {
    e.preventDefault(); const er = {};
    const p = paraCent(form.preco.value), s = form.sinal.value.trim() ? paraCent(form.sinal.value) : 0, rt = form.retoque.value.trim() ? paraCent(form.retoque.value) : 0;
    const dias = form.retoque_dias.value.trim();
    if (!p) er.preco = 'Informe o preço total. Ex.: 290,00';
    if (s == null) er.sinal = 'Valor inválido. Ex.: 50,00'; else if (p && s > p) er.sinal = 'O sinal não pode passar do preço.';
    if (rt == null) er.retoque = 'Valor inválido. Ex.: 80,00';
    if (dias && !/^\d{1,3}$/.test(dias)) er.retoque_dias = 'Só números.'; else if (rt > 0 && !(+dias > 0)) er.retoque_dias = 'Em até quantos dias?';
    if (form.inicio.value && form.fim.value && form.fim.value < form.inicio.value) er.fim = 'O fim não pode ser antes do início.';
    if (!mostrarErros(form, er)) return;
    guardar({ preco: form.preco.value.trim(), sinal: form.sinal.value.trim(), retoque: form.retoque.value.trim(), retoque_dias: dias, inicio: form.inicio.value, fim: form.fim.value });
    proximo(F + 'cartaz/' + qsId());
  };
  focarTitulo();
}

// Comprime o cartaz no aparelho (até 900 × 1400 px, JPEG) antes de enviar.
async function comprimir(arquivo) {
  if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) throw new Error('tipo');
  if (arquivo.size > 20 * 1024 * 1024) throw new Error('grande');
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise((ok, nao) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => nao(new Error('ler')); i.src = url; });
    const esc_ = Math.min(1, 900 / img.naturalWidth, 1400 / img.naturalHeight);
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * esc_); c.height = Math.round(img.naturalHeight * esc_);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    for (const qual of [0.82, 0.72, 0.6]) { const d = c.toDataURL('image/jpeg', qual); if (d.length * 0.75 < 850 * 1024) return d; }
    throw new Error('grande');
  } finally { URL.revokeObjectURL(url); }
}
const ERRO_IMG = { tipo: 'Escolha uma imagem JPG, PNG ou WEBP.', grande: 'Imagem grande demais. Escolha uma imagem menor.', ler: 'Não foi possível abrir essa imagem. Tente outra (HEIC não é aceito).' };
function telaForm3() {
  const d = ler(); if (!d || !d.preco) return ir(F + 'valores/' + qsId());
  const atual = d.imagem || (d.remover_imagem ? null : d.imagem_atual);
  const form = pagina({ titulo: tituloForm(), etapa: 3, etapasTotal: 4, formulario: true, voltar: F + 'valores/' + qsId(), voltarTexto: 'Voltar',
    corpo: `<p class="etapa" style="margin-top:-8px">Cartaz da promoção <span class="opcional">(opcional)</span></p>
      <div class="promo-cartaz" data-depois="130">${atual ? `<img id="cartaz" src="${esc(atual)}" alt="Prévia do cartaz">` : '<p class="sem-cartaz">Nenhum cartaz escolhido.</p>'}</div>
      <div class="linha-acoes" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
        <label class="btn btn-suave" style="flex:1 1 160px;cursor:pointer">${atual ? 'Trocar cartaz' : 'Escolher cartaz'}<input type="file" id="arquivo" accept="image/jpeg,image/png,image/webp" class="sr-only"></label>
        ${atual ? '<button type="button" class="btn btn-linha" id="remover" style="flex:1 1 120px">Remover cartaz</button>' : ''}</div>
      <span class="erro" id="imagem-erro" aria-live="polite"></span><p class="ajuda">O cartaz é público: aparece para as clientes enquanto a promoção estiver no ar.</p>`,
    acoes: rodape(F + 'valores/' + qsId()) });
  ajustarCartaz($('#cartaz'));
  $('#arquivo').onchange = async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    $('#imagem-erro').textContent = 'Preparando a imagem…';
    try { const dataUrl = await comprimir(f); guardar({ imagem: dataUrl, remover_imagem: false }); telaForm3(); }
    catch (er) { $('#imagem-erro').textContent = ERRO_IMG[er.message] || ERRO_IMG.ler; }
  };
  const rm = $('#remover'); if (rm) rm.onclick = () => { guardar({ imagem: null, remover_imagem: !!d.imagem_atual }); telaForm3(); };
  form.onsubmit = (e) => { e.preventDefault(); ir(F + 'conferencia/' + qsId()); };
  focarTitulo();
}

function telaConferencia() {
  const d = ler(); if (!d || !d.preco) return ir(F + qsId());
  const p = paraCent(d.preco), s = paraCent(d.sinal) || 0, rt = paraCent(d.retoque) || 0;
  const img = d.imagem || (d.remover_imagem ? null : d.imagem_atual);
  const corr = (u) => `<a class="corrigir" href="${u}${qsId() ? qsId() + '&' : '?'}conf=1">Corrigir</a>`;
  pagina({ titulo: 'Confira a promoção', etapa: 4, etapasTotal: 4, voltar: F + 'cartaz/' + qsId(), voltarTexto: 'Voltar',
    corpo: `<div class="resumo"><section class="bloco"><div class="bloco-topo"><h2>${esc(d.titulo)}</h2>${corr(F)}</div><dl class="dados">
        <dt>Serviço</dt><dd>${esc(d.servico_nome || '')}</dd>${d.descricao ? `<dt>Descrição</dt><dd>${esc(d.descricao)}</dd>` : ''}</dl></section>
      <section class="bloco"><div class="bloco-topo"><h2>Valores e período</h2>${corr(F + 'valores/')}</div><dl class="dados">
        <dt>Preço total</dt><dd>${reais(p)}</dd>${s ? `<dt>Sinal</dt><dd>${reais(s)} · no dia ${reais(p - s)}</dd>` : ''}
        ${rt ? `<dt>Retoque</dt><dd>${reais(rt)} · até ${esc(d.retoque_dias)} dias</dd>` : ''}
        <dt>Período</dt><dd>${d.inicio ? 'De ' + dataBr(d.inicio) : 'A partir de hoje'}${d.fim ? ' até ' + dataBr(d.fim) : ' · sem data de fim'}</dd></dl></section>
      <section class="bloco"><div class="bloco-topo"><h2>Cartaz</h2>${corr(F + 'cartaz/')}</div><p>${img ? 'Cartaz escolhido.' : 'Sem cartaz.'}</p></section></div>
      <div id="aviso" aria-live="polite"></div>`,
    acoes: `<a class="btn btn-linha" href="${F}cartaz/${qsId()}">${SETA} Voltar</a><button type="button" class="btn btn-cheio" id="salvar">Salvar promoção</button>` });
  let env = false;
  $('#salvar').onclick = async () => {
    if (env) return; env = true; const b = $('#salvar'); b.disabled = true; b.textContent = 'Salvando…';
    const corpo = { titulo: d.titulo, descricao: d.descricao, servico_id: d.servico_id, preco: d.preco, sinal: d.sinal, retoque: d.retoque, retoque_dias: d.retoque_dias, inicio: d.inicio, fim: d.fim };
    if (d.id) corpo.id = d.id; else corpo.chave_envio = d.chave_envio;
    if (d.imagem) corpo.imagem = d.imagem; else if (d.remover_imagem) corpo.remover_imagem = true;
    const r = await api('pm_salvar', { corpo });
    if (r.ok) { apagarRasc(chave()); recado.pôr(d.id ? 'Promoção atualizada.' : 'Promoção cadastrada e no ar.'); location.replace(`${BASE}ver/?id=${encodeURIComponent(r.id)}`); return; }
    env = false; b.disabled = false; b.textContent = 'Tentar de novo';
    $('#aviso').innerHTML = avisoHTML(esc(r.erros ? Object.values(r.erros).join(' ') : r.msg || 'Não foi possível salvar.'), 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ PLANO DE PAGAMENTO (atendimento) ══════════════
async function telaPlano() {
  carregando('Promoção do atendimento');
  const id = params.get('id') || ''; const det = `${AT}?id=${encodeURIComponent(id)}`;
  const r = await api('pm_plano', { query: { agendamento_id: id } });
  if (!r.ok) return telaErro('Promoção do atendimento', r.msg, det, 'Atendimento');
  const msg = recado.tirar(); const e = r.etapas; const p = r.promocao; const a = r.atendimento;
  const linha = (n, titulo, sub, feita, acao) => `<li class="promo-etapa${feita ? ' feita' : ''}"><span class="num" aria-hidden="true">${feita ? '✓' : n}</span><div class="txt"><strong>${titulo}</strong><small>${sub}</small></div>${acao}</li>`;
  const btnReceber = (et) => r.pode_receber ? `<a class="btn btn-cheio" href="${AT}promocao/receber/?id=${encodeURIComponent(id)}&etapa=${et}">Registrar</a>` : '<span class="ok">A dona registra</span>';
  let ret;
  if (e.retoque.retorno && e.retoque.retorno.situacao !== 'cancelado') ret = `<a class="btn btn-suave" href="/brow-studio/retornos/ver/?id=${encodeURIComponent(e.retoque.retorno.id)}">Ver retoque</a>`;
  else if (e.retoque.pode) ret = `<button type="button" class="btn btn-cheio" id="retoque">Planejar</button>`;
  else ret = '';
  const subRet = e.retoque.retorno && e.retoque.retorno.situacao !== 'cancelado'
    ? `${reais(e.retoque.valor_centavos)} · fazer até ${dataBr(e.retoque.retorno.data_limite)}${e.retoque.retorno.situacao === 'concluido' ? ' · concluído' : ''}`
    : `${reais(e.retoque.valor_centavos)} em até ${e.retoque.dias} dias${e.retoque.aguardando_conclusao ? ' · depois do procedimento' : e.retoque.data_limite ? ' · até ' + dataBr(e.retoque.data_limite) : ''}`;
  pagina({ titulo: 'Promoção do atendimento', voltar: det, voltarTexto: 'Atendimento',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<div id="aviso" aria-live="polite"></div>
      <div class="servico-cabeca"><h2>${esc(a.cliente_nome)}</h2></div>
      <p class="promo-resumo"><strong>${esc(p.titulo)}</strong> · ${esc(a.servico_nome)} · ${dataBr(a.data)}<br>Pago: <strong>${reais(r.pago_centavos)}</strong> de ${reais(p.preco_centavos)}${r.falta_centavos ? ` · falta ${reais(r.falta_centavos)}` : ' · quitado'}</p>
      <ol class="promo-etapas">
        ${p.sinal_centavos > 0 ? linha(1, 'Sinal de agendamento', `${reais(e.sinal.valor_centavos)} · garante a vaga`, e.sinal.recebido, e.sinal.recebido ? '<span class="ok">Recebido</span>' : (e.sinal.pode ? btnReceber('sinal') : '')) : ''}
        ${linha(p.sinal_centavos > 0 ? 2 : 1, 'No dia do procedimento', `${reais(e.saldo.valor_centavos)}${p.sinal_centavos > 0 ? ' (já com o sinal descontado)' : ''}`, e.saldo.recebido, e.saldo.recebido ? '<span class="ok">Recebido</span>' : (e.saldo.pode ? btnReceber('saldo') : ''))}
        ${p.retoque_centavos > 0 ? linha(p.sinal_centavos > 0 ? 3 : 2, 'Retoque', subRet, !!(e.retoque.retorno && e.retoque.retorno.situacao === 'concluido'), ret) : ''}
      </ol>
      <p class="ajuda">Nada é cobrado automaticamente: registre cada pagamento quando receber. O retoque é cobrado à parte, no módulo Retornos.</p>`,
    acoes: `<a class="btn btn-linha" href="${det}">${SETA} Atendimento</a>${r.lancamento_id && r.pode_receber ? `<a class="btn btn-suave" href="/brow-studio/financeiro/ver/?id=${encodeURIComponent(r.lancamento_id)}">Ver no Financeiro</a>` : ''}` });
  const rb = $('#retoque');
  if (rb) rb.onclick = async () => {
    rb.disabled = true;
    const rr = await api('pm_retoque', { corpo: { agendamento_id: id } });
    if (rr.ok) { recado.pôr(`Retoque planejado: fazer até ${dataBr(rr.data_limite)}.`); location.reload(); return; }
    rb.disabled = false; $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível.'), 'erro');
  };
  focarTitulo();
}

async function telaReceber() {
  carregando('Registrar pagamento');
  const id = params.get('id') || ''; const etapa = params.get('etapa') === 'sinal' ? 'sinal' : 'saldo';
  const plano = `${AT}promocao/?id=${encodeURIComponent(id)}`;
  const r = await api('pm_plano', { query: { agendamento_id: id } });
  if (!r.ok) return telaErro('Registrar pagamento', r.msg, plano, 'Promoção');
  const e = r.etapas[etapa];
  if (e.recebido || !e.pode) { recado.pôr(etapa === 'sinal' ? 'O sinal já foi recebido.' : 'Este atendimento já está quitado.'); return ir(plano); }
  const valor = etapa === 'sinal' ? r.promocao.sinal_centavos - r.pago_centavos : r.promocao.preco_centavos - r.pago_centavos;
  const chave = 'pm:receber:' + id + ':' + etapa;
  const ck = lerRasc(chave) || { chave_envio: uuid() }; gravarRasc(chave, ck);
  const form = pagina({ titulo: etapa === 'sinal' ? 'Receber sinal' : 'Receber no dia', voltar: plano, voltarTexto: 'Promoção', formulario: true,
    corpo: `<p class="promo-resumo">${esc(r.atendimento.cliente_nome)} · ${esc(r.promocao.titulo)}</p>
      <div class="bloco"><dl class="dados"><dt>Valor</dt><dd><strong>${reais(valor)}</strong></dd><dt>Data</dt><dd>Hoje</dd></dl></div>
      ${grupoOpcoes({ nome: 'forma', legenda: 'Forma de pagamento', opcoes: r.formas, valor: '' })}
      <div id="aviso" aria-live="polite"></div>`,
    acoes: `<a class="btn btn-linha" href="${plano}">Cancelar</a><button type="submit" class="btn btn-cheio" id="registrar">Registrar ${reais(valor)}</button>` });
  let env = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); if (env) return;
    const f = form.querySelector('[name=forma]:checked');
    if (!mostrarErros(form, f ? {} : { forma: 'Escolha a forma de pagamento.' })) return;
    env = true; const b = $('#registrar'); b.disabled = true; b.textContent = 'Registrando…';
    const rr = await api('pm_receber', { corpo: { agendamento_id: id, etapa, forma: f.value, chave_envio: ck.chave_envio } });
    if (rr.ok) { apagarRasc(chave); recado.pôr(rr.repetido ? (rr.msg || 'Já estava registrado.') : `${etapa === 'sinal' ? 'Sinal' : 'Pagamento'} de ${reais(rr.valor_centavos)} registrado.`); location.replace(plano); return; }
    env = false; b.disabled = false; b.textContent = 'Tentar de novo';
    $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível registrar.'), 'erro');
  };
  focarTitulo();
}

async function telaUsar() {
  carregando('Usar promoção');
  const id = params.get('id') || ''; const det = `${AT}?id=${encodeURIComponent(id)}`;
  const r = await api('pm_disponiveis', { query: { agendamento_id: id } });
  if (!r.ok) return telaErro('Usar promoção', r.msg, det, 'Atendimento');
  const form = pagina({ titulo: 'Usar promoção', voltar: det, voltarTexto: 'Atendimento', formulario: true,
    corpo: r.itens.length ? `<fieldset class="campo"><legend>Promoções deste serviço</legend><div class="opcoes" style="grid-template-columns:1fr">
        ${r.itens.map((p, i) => `<label class="opcao opcao-lote"><input type="radio" name="promo" value="${esc(p.id)}" ${i === 0 ? 'checked' : ''}><span><strong>${esc(p.titulo)}</strong><small>${esc(resumoValores(p))}${p.retoque_centavos ? ' · ' + esc(textoRetoque(p)) : ''}</small></span></label>`).join('')}
      </div></fieldset><p class="ajuda">O valor do atendimento passa a ser o da promoção.</p><div id="aviso" aria-live="polite"></div>`
      : '<p class="ajuda">Nenhuma promoção no ar para este serviço (ou o horário já tem promoção).</p>',
    acoes: `<a class="btn btn-linha" href="${det}">${SETA} Voltar</a>${r.itens.length ? '<button type="submit" class="btn btn-cheio" id="usar">Usar promoção</button>' : ''}` });
  let env = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); if (env || !r.itens.length) return;
    const v = form.querySelector('[name=promo]:checked'); if (!v) return;
    env = true; $('#usar').disabled = true;
    const rr = await api('pm_aplicar', { corpo: { agendamento_id: id, promocao_id: v.value } });
    if (rr.ok) { recado.pôr('Promoção aplicada ao atendimento.'); location.replace(`${AT}promocao/?id=${encodeURIComponent(id)}`); return; }
    env = false; $('#usar').disabled = false; $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível.'), 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ PÚBLICO: cartaz + "Quero essa promoção" ═══════
async function telaPublica() {
  pagina({ titulo: 'Promoção', corpo: avisoHTML('Carregando…') });
  const s = params.get('s') || ''; const id = params.get('id') || ''; const de = params.get('de');
  const r = await api('pp_ver', { query: { id } });
  const sq = s ? 's=' + encodeURIComponent(s) : '';
  const voltar = de === 'cliente' ? `/brow-studio/cliente/inicio/${sq ? '?' + sq : ''}` : `/brow-studio/agendar/${sq ? '?' + sq : ''}`;
  if (!r.ok) { pagina({ titulo: 'Promoção', voltar, corpo: avisoHTML(esc(r.msg || 'Esta promoção não está mais disponível.'), 'erro'), acoes: `<a class="btn btn-cheio" href="${voltar}">Voltar</a>` }); focarTitulo(); return; }
  const p = r.promocao;
  let quero;
  const qp = (sq ? sq + '&' : '') + 'promo=' + encodeURIComponent(p.id);
  if (de === 'cliente') quero = `<a class="btn btn-cheio" href="/brow-studio/cliente/agendar/?${qp}" id="quero">Quero essa promoção</a>`;
  else if (r.agendamento_online) quero = `<a class="btn btn-cheio" href="/brow-studio/agendar/?${qp}" id="quero">Quero essa promoção</a>`;
  else if (r.whatsapp_estudio) quero = `<a class="btn btn-cheio" id="quero" target="_blank" rel="noopener" href="https://wa.me/55${esc(String(r.whatsapp_estudio).replace(/\D/g, ''))}?text=${encodeURIComponent(`Olá! Quero a promoção “${p.titulo}” (${p.servico_nome}).`)}">Quero pelo WhatsApp</a>`;
  else quero = '';
  pagina({ titulo: p.titulo, voltar, voltarTexto: 'Voltar',
    corpo: `<p class="promo-resumo" style="margin-top:-6px">${esc(p.servico_nome)} · ${esc(resumoValores(p))}${p.retoque_centavos ? '<br>' + esc(textoRetoque(p)) : ''}${p.fim ? ` · Até ${dataBr(p.fim)}.` : ''}</p>
      ${p.imagem_url ? `<div class="promo-cartaz"><img id="cartaz" src="${esc(p.imagem_url)}" alt="Cartaz da promoção ${esc(p.titulo)}"></div>` : (p.descricao ? `<p>${esc(p.descricao)}</p>` : '')}`,
    acoes: `<a class="btn btn-linha" href="${voltar}">${SETA} Voltar</a>${quero}` });
  ajustarCartaz($('#cartaz'));
  focarTitulo();
}

const TELAS = { 'pm-lista': telaLista, 'pm-ver': telaVer, 'pm-cartaz': telaCartaz, 'pm-form': telaForm1, 'pm-valores': telaForm2, 'pm-arte': telaForm3, 'pm-conf': telaConferencia,
  'pm-plano': telaPlano, 'pm-receber': telaReceber, 'pm-usar': telaUsar, 'pp-ver': telaPublica };
(TELAS[document.body.dataset.pagina] || telaLista)();
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
