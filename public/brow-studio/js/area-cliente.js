// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — ÁREA DA CLIENTE (páginas da própria cliente)
// Ativar acesso pelo link pessoal → entrar com WhatsApp + PIN → próximos horários,
// histórico (data + serviço), agendar, cancelar/remarcar no prazo do salão,
// meus dados, trocar PIN, sair. Sessão própria (cookie brow_cliente), separada
// da equipe. O servidor revalida tudo; aqui nada fica guardado além do salão.
// ═══════════════════════════════════════════════════════════════════════════
import { $, esc, uuid, SETA, pagina, campoTexto, mostrarErros, avisoHTML, focarTitulo } from './comum.js?v=4';
import { cssPromo, cartaoPromo, resumoValores, textoRetoque } from './promo-card.js?v=1';

const API = '/api/brow';
const BASE = '/brow-studio/cliente/';
const app = document.getElementById('app');
const qs = new URLSearchParams(location.search);
// salão: do endereço (?s=) ou o último usado neste aparelho (só o endereço do salão)
const CHAVE_SALAO = 'brow:cliente_salao';
let SALAO = qs.get('s') || '';
try { if (SALAO) localStorage.setItem(CHAVE_SALAO, SALAO); else SALAO = localStorage.getItem(CHAVE_SALAO) || ''; } catch (e) {}
const L = (p, extra) => { const u = new URLSearchParams(extra || {}); if (SALAO) u.set('s', SALAO); const t = u.toString(); return BASE + p + (t ? '?' + t : ''); };
const ir = (u) => { location.href = u; };

async function capi(acao, { corpo, query } = {}) {
  const p = new URLSearchParams({ acao, ...(query || {}) }); if (SALAO) p.set('s', SALAO);
  let resp;
  try {
    resp = await fetch(`${API}?${p}`, { method: corpo ? 'POST' : 'GET', headers: corpo ? { 'Content-Type': 'application/json' } : {},
      body: corpo ? JSON.stringify(corpo) : undefined, credentials: 'same-origin', cache: 'no-store' });
  } catch (e) { return { ok: false, erro: 'rede', msg: 'Sem conexão com a internet. Confira a rede e tente novamente.' }; }
  let j = null; try { j = await resp.json(); } catch (e) {}
  if (resp.status === 401 && j && j.erro === 'sem_sessao_cliente') {
    location.href = L('entrar/', { volta: location.pathname + location.search }); return new Promise(() => {});
  }
  return j || { ok: false, erro: 'servidor', msg: 'O servidor não respondeu como esperado. Tente novamente.' };
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const dataLonga = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };
const dataCurta = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`; };
const tempo = (m) => m < 60 ? `${m} min` : (m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`);
const fone = (t) => { const d = String(t || '').replace(/\D/g, ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d; };
const waLink = (tel, msg) => `https://wa.me/55${String(tel).replace(/\D/g, '')}${msg ? '?text=' + encodeURIComponent(msg) : ''}`;
const campoPin = (id, rotulo) => campoTexto({ id, rotulo, tipo: 'password', attrs: 'inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="current-password" enterkeyhint="go"' });
// PIN novo: texto com dígitos escondidos (o iPhone apaga o 2º campo de senha seguido)
const campoPinNovo = (id, rotulo) => campoTexto({ id, rotulo, tipo: 'text', attrs: 'class="pin-oculto" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-1p-ignore data-lpignore="true"' });
const recado = { pôr(m) { try { sessionStorage.setItem('brow:cl_recado', m); } catch (e) {} }, tirar() { try { const m = sessionStorage.getItem('brow:cl_recado'); sessionStorage.removeItem('brow:cl_recado'); return m; } catch (e) { return null; } } };
const voltaSegura = () => { const v = qs.get('volta') || ''; return /^\/brow-studio\/cliente\/[\w\-/.?=&%]*$/.test(v) && !v.includes('/entrar') && !v.includes('/ativar') ? v : L('inicio/'); };
function telaErro(titulo, msg, voltar) {
  pagina({ titulo, voltar: voltar || L('inicio/'), voltarTexto: 'Voltar', corpo: avisoHTML(esc(msg || 'Algo deu errado.'), 'erro'), acoes: `<a class="btn btn-cheio" href="${voltar || L('inicio/')}">Voltar</a>` });
  focarTitulo();
}
// lista paginada que cabe na tela (sem rolagem)
function cabem(el, altura, abaixo = 82) { const topo = el.getBoundingClientRect().top + window.scrollY; return Math.max(2, Math.floor((window.innerHeight - topo - abaixo + 10) / (altura + 10))); }
function paginar(el, nav, itens, altura, abaixo, desenhar, rotulo, porLinha = 1) {
  let pg = 1;
  const d = () => {
    const por = cabem(el, altura, abaixo) * porLinha; const paginas = Math.max(1, Math.ceil(itens.length / por)); pg = Math.min(pg, paginas);
    el.innerHTML = itens.slice((pg - 1) * por, pg * por).map(desenhar).join('');
    nav.hidden = paginas <= 1;
    nav.innerHTML = `<button type="button" class="btn btn-linha" data-ir="-1" ${pg <= 1 ? 'disabled' : ''}>${SETA} Anterior</button><span class="pag-info"><strong>${pg}</strong> de ${paginas}<span class="pag-total"> · ${itens.length} ${rotulo}</span></span><button type="button" class="btn btn-linha" data-ir="1" ${pg >= paginas ? 'disabled' : ''}>Próxima <span aria-hidden="true">→</span></button>`;
    nav.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => { pg += +b.dataset.ir; d(); });
  };
  d();
}
const colunasHora = () => (window.innerWidth <= 420 ? 3 : 4);

// ═══════════════════════════ ATIVAR (link pessoal) ═════════════════════════
async function telaAtivar() {
  // o token vem depois do "#" (não vai para o servidor no carregamento da página) e sai do endereço logo em seguida
  const m = /(?:^#|&)c=([A-Za-z0-9_-]{40,64})/.exec(location.hash || '');
  let token = m ? m[1] : '';
  try { if (token) sessionStorage.setItem('brow:cl_convite', token); else token = sessionStorage.getItem('brow:cl_convite') || ''; } catch (e) {}
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  pagina({ titulo: 'Ativar meu acesso', corpo: avisoHTML('Conferindo o link…') });
  if (!token) return telaLinkRuim('Este endereço está incompleto. Abra de novo o link que o salão mandou no WhatsApp, ou peça um novo link ao salão.');
  const r = await capi('cl_convite_ver', { corpo: { token } });
  if (!r.ok) return telaLinkRuim(r.msg);
  const form = pagina({ titulo: 'Ativar meu acesso', formulario: true,
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(r.salao.nome)}</p>
      ${avisoHTML(`Olá${r.nome ? ', <strong>' + esc(r.nome) + '</strong>' : ''}! Crie um PIN de 6 números. Depois é só entrar com seu WhatsApp (final ${esc(r.whatsapp_final)}) e este PIN.`)}
      <div class="duas-colunas">${campoPinNovo('pin', 'Crie seu PIN')}${campoPinNovo('pin2', 'Repita o PIN')}</div>
      <p class="ajuda">Evite datas de nascimento, 123456 ou números repetidos. Não conte seu PIN a ninguém.</p><div id="aviso" aria-live="polite"></div>`,
    acoes: `<button type="submit" class="btn btn-cheio" id="ativar">Ativar e entrar</button>` });
  let env = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (env) return; const er = {};
    if (!/^\d{6}$/.test(form.pin.value)) er.pin = 'O PIN tem 6 números.'; else if (form.pin.value !== form.pin2.value) er.pin2 = 'Os PINs não conferem.';
    if (!mostrarErros(form, er)) return;
    env = true; $('#ativar').disabled = true;
    const rr = await capi('cl_ativar', { corpo: { token, pin: form.pin.value, pin2: form.pin2.value } });
    if (rr.ok) { try { sessionStorage.removeItem('brow:cl_convite'); } catch (x) {} recado.pôr('Acesso ativado. Bem-vinda!'); location.replace(L('inicio/')); return; }
    env = false; $('#ativar').disabled = false;
    if (rr.erro === 'link_invalido') { try { sessionStorage.removeItem('brow:cl_convite'); } catch (x) {} return telaLinkRuim(rr.msg); }
    if (rr.erros) mostrarErros(form, rr.erros);
    $('#aviso').innerHTML = avisoHTML(esc(rr.erros ? Object.values(rr.erros).join(' ') : rr.msg), 'erro');
  };
  form.pin.focus();
  focarTitulo();
}
function telaLinkRuim(msg) {
  pagina({ titulo: 'Link inválido', corpo: `${avisoHTML(esc(msg), 'erro')}<p class="ajuda">O link pessoal vale 7 dias e só pode ser usado uma vez. Se já ativou, entre com seu WhatsApp e PIN.</p>`,
    acoes: `<a class="btn btn-cheio" href="${L('entrar/')}">Já tenho acesso: entrar</a>` });
  focarTitulo();
}

// ═══════════════════════════ ENTRAR ════════════════════════════════════════
async function telaEntrar() {
  const e = await capi('cl_estado');
  if (!e.ok) return telaErro('Área da cliente', e.msg, '/brow-studio/');
  if (e.logada) return location.replace(voltaSegura());
  const form = pagina({ titulo: 'Área da cliente', voltar: '/brow-studio/', voltarTexto: 'Início', formulario: true,
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(e.salao.nome)}</p>
      ${campoTexto({ id: 'whatsapp', rotulo: 'Seu WhatsApp com DDD', tipo: 'tel', attrs: 'autocomplete="tel" inputmode="tel" maxlength="20" placeholder="(11) 98888-7777"' })}
      ${campoPin('pin', 'PIN (6 números)')}
      <p class="ajuda">Ainda não tem acesso ou esqueceu o PIN? Peça ao salão um novo link pessoal pelo WhatsApp.</p><div id="aviso" aria-live="polite"></div>`,
    acoes: `<button type="submit" class="btn btn-cheio" id="entrar">Entrar</button>` });
  let env = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); if (env) return; const er = {};
    const t = form.whatsapp.value.replace(/\D/g, '');
    if (t.length < 10) er.whatsapp = 'Informe o WhatsApp com DDD.';
    if (!/^\d{6}$/.test(form.pin.value)) er.pin = 'O PIN tem 6 números.';
    if (!mostrarErros(form, er)) return;
    env = true; $('#entrar').disabled = true;
    const r = await capi('cl_entrar', { corpo: { whatsapp: form.whatsapp.value, pin: form.pin.value } });
    if (r.ok) { location.replace(voltaSegura()); return; }
    env = false; $('#entrar').disabled = false; form.pin.value = '';
    $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível entrar.'), 'erro');
    form.pin.focus();
  };
  form.whatsapp.focus();
  focarTitulo();
}

// ═══════════════════════════ INÍCIO ════════════════════════════════════════
const linhaHorario = (a) => `<li><a class="item item-link" href="${L('horario/', { id: a.id })}"><div class="item-info"><div class="item-nome">${esc(dataLonga(a.data))}, ${esc(a.inicio)}</div>
  <div class="item-extra">${esc(a.servico)} · ${esc(a.profissional)} · ${esc(a.situacao_nome)}</div></div><span aria-hidden="true">›</span></a></li>`;
// promoções no ar do salão (públicas): cartão na tela inicial
async function promosNoAr() { const r = await capi('pp_lista'); return r && r.ok ? r.itens : []; }
const linkPromo = (p) => `/brow-studio/promocao/?${SALAO ? 's=' + encodeURIComponent(SALAO) + '&' : ''}id=${encodeURIComponent(p.id)}&de=cliente`;
async function telaInicio() {
  cssPromo();
  const [r, pr] = await Promise.all([capi('cl_inicio'), promosNoAr()]);
  if (!r.ok) return telaErro('Área da cliente', r.msg, L('entrar/'));
  const msg = recado.tirar();
  pagina({ titulo: `Olá, ${r.nome.split(' ')[0]}`,
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(r.salao ? r.salao.nome : r.estudio)}</p>${msg ? avisoHTML(esc(msg), 'ok') : ''}${pr[0] ? cartaoPromo(pr[0], { href: linkPromo(pr[0]) }) : ''}
      <h2 class="cl-sub">Próximos horários</h2>
      ${r.proximos.length ? '<ul class="lista lista-compacta" id="lista"></ul><nav class="paginacao" id="nav" hidden></nav>' : '<p class="ajuda" id="lista-vazia">Você não tem horários marcados.</p>'}
      <nav class="acoes-grade" aria-label="Área da cliente">
        ${r.pode_agendar ? `<a class="btn btn-suave" href="${L('agendar/')}">Agendar horário</a>` : (r.whatsapp_estudio ? `<a class="btn btn-suave" href="${waLink(r.whatsapp_estudio, 'Olá! Quero agendar um horário.')}" target="_blank" rel="noopener">Agendar pelo WhatsApp</a>` : '')}
        <a class="btn btn-suave" href="${L('historico/')}">Meu histórico</a>
        <a class="btn btn-suave" href="${L('dados/')}">Meus dados</a>
        <button type="button" class="btn btn-linha" id="sair">Sair</button>
      </nav>`
  });
  if (r.proximos.length) paginar($('#lista'), $('#nav'), r.proximos, 64, 82 + 60 + 130, linhaHorario, 'horários');
  $('#sair').onclick = async () => { $('#sair').disabled = true; await capi('cl_sair', { corpo: {} }); location.replace(L('entrar/')); };
  focarTitulo();
}

// ═══════════════════════════ HORÁRIO (cancelar / remarcar) ═════════════════
async function telaHorario() {
  const id = qs.get('id') || '';
  const r = await capi('cl_ver', { query: { id } });
  if (!r.ok) return telaErro('Meu horário', r.msg);
  const a = r.item;
  const regra = `Cancelar ou remarcar por aqui: ${r.prazo_texto} do horário.`;
  pagina({ titulo: 'Meu horário', voltar: L('inicio/'), voltarTexto: 'Início',
    corpo: `<div class="resumo"><section class="bloco"><dl class="dados">
        <dt>Serviço</dt><dd>${esc(a.servico)}</dd><dt>Dia</dt><dd>${esc(dataLonga(a.data))}</dd>
        <dt>Horário</dt><dd>${esc(a.inicio)} às ${esc(a.fim)}</dd><dt>Profissional</dt><dd>${esc(a.profissional)}</dd><dt>Situação</dt><dd>${esc(a.situacao_nome)}</dd></dl></section></div>
      <p class="ajuda">${esc(regra)}</p>
      ${a.pode_alterar ? '' : avisoHTML(esc(['agendado', 'confirmado'].includes(a.situacao) ? 'O prazo para cancelar ou remarcar por aqui já passou. Fale com o salão pelo WhatsApp.' : 'Este atendimento já começou.'))}
      <div id="aviso" aria-live="polite"></div>`,
    acoes: `<a class="btn btn-linha" href="${L('inicio/')}">${SETA} Voltar</a>${a.pode_alterar ? `<button type="button" class="btn btn-linha" id="cancelar">Cancelar horário</button>${r.pode_remarcar_online ? `<a class="btn btn-cheio" id="remarcar" href="${L('remarcar/', { id: a.id })}">Remarcar</a>` : ''}`
      : (r.whatsapp_estudio ? `<a class="btn btn-cheio" href="${waLink(r.whatsapp_estudio, `Olá! Sobre meu horário de ${dataLonga(a.data)} às ${a.inicio} (${a.servico}).`)}" target="_blank" rel="noopener">Falar com o salão</a>` : '')}` });
  const bc = $('#cancelar');
  if (bc) bc.onclick = () => telaConfirmaCancelar(a);
  focarTitulo();
}
function telaConfirmaCancelar(a) {
  pagina({ titulo: 'Cancelar horário', voltar: L('horario/', { id: a.id }), voltarTexto: 'Voltar',
    corpo: `${avisoHTML(`Cancelar <strong>${esc(a.servico)}</strong>, ${esc(dataLonga(a.data))} às <strong>${esc(a.inicio)}</strong>?`)}
      <p class="ajuda">O horário fica livre para outra cliente. Se quiser, você pode agendar de novo depois.</p><div id="aviso" aria-live="polite"></div>`,
    acoes: `<a class="btn btn-linha" href="${L('horario/', { id: a.id })}">Não, manter</a><button type="button" class="btn btn-cheio" id="confirmar">Sim, cancelar</button>` });
  let env = false;
  $('#confirmar').onclick = async () => {
    if (env) return; env = true; $('#confirmar').disabled = true;
    const r = await capi('cl_cancelar', { corpo: { id: a.id } });
    if (r.ok) { recado.pôr('Horário cancelado.'); location.replace(L('inicio/')); return; }
    env = false; $('#confirmar').disabled = false; $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível cancelar.'), 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ ESCOLHER DIA E HORÁRIO (remarcar e agendar) ═══
// passos na mesma página: dia → horário → conferir
function escolherDia({ titulo, sub, dias, hoje, escolhido, voltar, voltarTexto, aoEscolher, etapa, total }) {
  const form = pagina({ titulo, formulario: true, etapa, etapasTotal: total,
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(sub)}</p><fieldset class="campo"><legend>Escolha o dia</legend><div class="grade-horarios grade-dias" id="lista"></div><span class="erro" id="dia-erro" aria-live="polite"></span></fieldset><nav class="paginacao" id="nav" hidden></nav>`,
    acoes: `<button type="button" class="btn btn-linha" id="voltar">${SETA} ${esc(voltarTexto)}</button><button type="submit" class="btn btn-cheio">Ver horários <span aria-hidden="true">→</span></button>` });
  if (!dias.length) $('#lista').innerHTML = '<p class="ajuda">Nenhum dia disponível nos próximos 30 dias.</p>';
  else paginar($('#lista'), $('#nav'), dias, 66, 82 + 60, (x) => { const dt = new Date(x + 'T12:00:00Z'); return `<label class="opcao opcao-hora"><input type="radio" name="dia" value="${x}" ${x === escolhido ? 'checked' : ''}><span><strong>${x === hoje ? 'Hoje' : DIAS[dt.getUTCDay()].slice(0, 3)}</strong><small>${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}</small></span></label>`; }, 'dias', colunasHora());
  $('#voltar').onclick = voltar;
  form.onsubmit = (e) => { e.preventDefault(); const v = form.querySelector('[name=dia]:checked'); if (!v) { $('#dia-erro').textContent = 'Escolha um dia.'; return; } aoEscolher(v.value); };
  focarTitulo();
}
async function escolherHorario({ titulo, sub, buscar, voltar, aoEscolher, etapa, total }) {
  pagina({ titulo, corpo: avisoHTML('Procurando horários livres…') });
  const h = await buscar();
  const form = pagina({ titulo, formulario: true, etapa, etapasTotal: total,
    corpo: `<p class="etapa" style="margin-top:-8px">${esc(sub)}</p>${!h.ok ? avisoHTML(esc(h.msg), 'erro') : h.motivo ? avisoHTML(esc(h.motivo), 'erro') : '<fieldset class="campo"><legend>Horários livres</legend><div class="grade-horarios" id="lista"></div><span class="erro" id="hora-erro" aria-live="polite"></span></fieldset><nav class="paginacao" id="nav" hidden></nav>'}`,
    acoes: `<button type="button" class="btn btn-linha" id="voltar">${SETA} Outro dia</button><button type="submit" class="btn btn-cheio" ${!h.ok || h.motivo ? 'disabled' : ''}>Próximo <span aria-hidden="true">→</span></button>` });
  if (h.ok && !h.motivo) paginar($('#lista'), $('#nav'), h.horarios, 66, 82 + 60, (x) => `<label class="opcao opcao-hora"><input type="radio" name="hora" value="${x.inicio_min}" data-prof="${esc(x.profissional_id)}" data-profn="${esc(x.profissional_nome)}" data-ini="${x.inicio}" data-fim="${x.fim}"><span><strong>${x.inicio}</strong><small>até ${x.fim}</small></span></label>`, 'horários', colunasHora());
  $('#voltar').onclick = voltar;
  form.onsubmit = (e) => {
    e.preventDefault(); const v = form.querySelector('[name=hora]:checked');
    if (!v) { $('#hora-erro').textContent = 'Escolha um horário.'; return; }
    aoEscolher({ inicio_min: +v.value, inicio: v.dataset.ini, fim: v.dataset.fim, profissional_id: v.dataset.prof, profissional_nome: v.dataset.profn });
  };
  focarTitulo();
}

// ═══════════════════════════ REMARCAR ══════════════════════════════════════
async function telaRemarcar() {
  const id = qs.get('id') || '';
  const r = await capi('cl_remarcar_horarios', { query: { id } });
  if (!r.ok) return telaErro('Remarcar', r.msg, L('horario/', { id }));
  const a = r.item; const st = {};
  const sub = `${a.servico} · hoje: ${dataLonga(a.data)}, ${a.inicio}`;
  const passoDia = () => escolherDia({ titulo: 'Remarcar', sub, dias: r.dias, hoje: null, escolhido: st.data, etapa: 1, total: 3, voltarTexto: 'Voltar',
    voltar: () => ir(L('horario/', { id })), aoEscolher: (d) => { st.data = d; passoHora(); } });
  const passoHora = () => escolherHorario({ titulo: 'Remarcar', sub: `${a.servico} · ${dataLonga(st.data)}`, etapa: 2, total: 3,
    buscar: () => capi('cl_remarcar_horarios', { query: { id, data: st.data } }), voltar: passoDia, aoEscolher: (h) => { Object.assign(st, h); passoConf(); } });
  const passoConf = () => {
    pagina({ titulo: 'Confirmar remarcação', etapa: 3, etapasTotal: 3,
      corpo: `<div class="resumo"><section class="bloco"><dl class="dados">
          <dt>Serviço</dt><dd>${esc(a.servico)}</dd><dt>Antes</dt><dd>${esc(dataLonga(a.data))}, ${esc(a.inicio)}</dd>
          <dt>Novo dia</dt><dd>${esc(dataLonga(st.data))}</dd><dt>Novo horário</dt><dd>${esc(st.inicio)} às ${esc(st.fim)}</dd><dt>Profissional</dt><dd>${esc(st.profissional_nome)}</dd></dl></section></div>
        <p class="ajuda">O horário antigo fica livre. O salão confirma o novo com você.</p><div id="aviso" aria-live="polite"></div>`,
      acoes: `<button type="button" class="btn btn-linha" id="voltar">${SETA} Voltar</button><button type="button" class="btn btn-cheio" id="confirmar">Remarcar</button>` });
    $('#voltar').onclick = passoHora;
    let env = false;
    $('#confirmar').onclick = async () => {
      if (env) return; env = true; $('#confirmar').disabled = true;
      const rr = await capi('cl_remarcar', { corpo: { id, data: st.data, inicio_min: st.inicio_min, profissional_id: st.profissional_id } });
      if (rr.ok) { recado.pôr(`Horário remarcado para ${dataLonga(st.data)} às ${st.inicio}.`); location.replace(L('inicio/')); return; }
      env = false; $('#confirmar').disabled = false;
      $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível remarcar.'), 'erro');
    };
    focarTitulo();
  };
  passoDia();
}

// ═══════════════════════════ AGENDAR ═══════════════════════════════════════
async function telaAgendar() {
  const [r, pr] = await Promise.all([capi('cl_agendar_info'), qs.get('promo') ? promosNoAr() : Promise.resolve([])]);
  if (!r.ok) return telaErro('Agendar horário', r.msg);
  const st = { chave_envio: uuid() };
  // "Quero essa promoção": serviço já escolhido pela promoção
  const promo = pr.find(x => x.id === qs.get('promo'));
  const svPromo = promo && r.servicos.find(x => x.id === promo.servico_id);
  if (svPromo) Object.assign(st, { servico_id: svPromo.id, servico_nome: svPromo.nome, promocao_id: promo.id, promo_titulo: promo.titulo, promo_resumo: resumoValores(promo), promo_retoque: textoRetoque(promo) });
  const temProf = r.profissionais.length > 1;
  const TOTAL = temProf ? 5 : 4;
  const passoServico = () => {
    const form = pagina({ titulo: 'Agendar horário', etapa: 1, etapasTotal: TOTAL, formulario: true,
      corpo: `<fieldset class="campo"><legend>Escolha o serviço</legend><ul class="lista lista-lotes" id="lista"></ul><span class="erro" id="servico-erro" aria-live="polite"></span></fieldset><nav class="paginacao" id="nav" hidden></nav>`,
      acoes: `<a class="btn btn-linha" href="${L('inicio/')}">${SETA} Início</a><button type="submit" class="btn btn-cheio">Próximo <span aria-hidden="true">→</span></button>` });
    if (!r.servicos.length) $('#lista').innerHTML = '<li class="vazio vazio-curto"><p>Nenhum serviço disponível no momento.</p></li>';
    else paginar($('#lista'), $('#nav'), r.servicos, 62, 82 + 60, (s) => `<li><label class="opcao opcao-lote"><input type="radio" name="servico" value="${esc(s.id)}" ${s.id === st.servico_id ? 'checked' : ''}><span><strong>${esc(s.nome)}</strong><small>${tempo(s.duracao_min)}${s.descricao ? ' · ' + esc(s.descricao) : ''}</small></span></label></li>`, 'serviços');
    form.onsubmit = (e) => {
      e.preventDefault(); const v = form.querySelector('[name=servico]:checked');
      if (!v) { $('#servico-erro').textContent = 'Escolha um serviço.'; return; }
      const s = r.servicos.find(x => x.id === v.value); st.servico_id = s.id; st.servico_nome = s.nome; st.promocao_id = null;
      temProf ? passoProf() : passoDia();
    };
    focarTitulo();
  };
  const passoProf = () => {
    const opcoes = [{ id: '', nome: 'Qualquer profissional' }, ...r.profissionais];
    const form = pagina({ titulo: 'Agendar horário', etapa: 2, etapasTotal: TOTAL, formulario: true,
      corpo: `<p class="etapa" style="margin-top:-8px">${esc(st.servico_nome)}</p><fieldset class="campo"><legend>Com quem?</legend><div class="opcoes">${opcoes.map(p => `<label class="opcao"><input type="radio" name="prof" value="${esc(p.id)}" ${(st.prof_escolha || '') === p.id ? 'checked' : ''}><span>${esc(p.nome)}</span></label>`).join('')}</div></fieldset>`,
      acoes: `<button type="button" class="btn btn-linha" id="voltar">${SETA} Voltar</button><button type="submit" class="btn btn-cheio">Próximo <span aria-hidden="true">→</span></button>` });
    $('#voltar').onclick = passoServico;
    form.onsubmit = (e) => { e.preventDefault(); const v = form.querySelector('[name=prof]:checked'); st.prof_escolha = v ? v.value : ''; passoDia(); };
    focarTitulo();
  };
  const passoDia = () => escolherDia({ titulo: 'Agendar horário', sub: st.servico_nome, dias: r.dias, hoje: r.hoje, escolhido: st.data, etapa: temProf ? 3 : 2, total: TOTAL,
    voltarTexto: 'Voltar', voltar: temProf ? passoProf : passoServico, aoEscolher: (d) => { st.data = d; passoHora(); } });
  const passoHora = () => escolherHorario({ titulo: 'Agendar horário', sub: `${st.servico_nome} · ${dataLonga(st.data)}`, etapa: temProf ? 4 : 3, total: TOTAL,
    buscar: () => capi('cl_agendar_horarios', { query: { servico_id: st.servico_id, profissional_id: st.prof_escolha || '', data: st.data } }), voltar: passoDia,
    aoEscolher: (h) => { Object.assign(st, h); passoConf(); } });
  const passoConf = () => {
    pagina({ titulo: 'Confira seu horário', etapa: TOTAL, etapasTotal: TOTAL,
      corpo: `<div class="resumo"><section class="bloco"><dl class="dados">
          <dt>Serviço</dt><dd>${esc(st.servico_nome)}</dd>${st.promocao_id ? `<dt>Promoção</dt><dd>${esc(st.promo_titulo)} · ${esc(st.promo_resumo)}${st.promo_retoque ? '<br>' + esc(st.promo_retoque) : ''}</dd>` : ''}<dt>Dia</dt><dd>${esc(dataLonga(st.data))}</dd>
          <dt>Horário</dt><dd>${esc(st.inicio)} às ${esc(st.fim)}</dd><dt>Profissional</dt><dd>${esc(st.profissional_nome)}</dd></dl></section></div>
        <p class="ajuda">O salão confirma o horário com você pelo WhatsApp.</p><div id="aviso" aria-live="polite"></div>`,
      acoes: `<button type="button" class="btn btn-linha" id="voltar">${SETA} Voltar</button><button type="button" class="btn btn-cheio" id="confirmar">Agendar</button>` });
    $('#voltar').onclick = passoHora;
    let env = false;
    $('#confirmar').onclick = async () => {
      if (env) return; env = true; $('#confirmar').disabled = true;
      const rr = await capi('cl_agendar', { corpo: { chave_envio: st.chave_envio, servico_id: st.servico_id, profissional_id: st.profissional_id, data: st.data, inicio_min: st.inicio_min, ...(st.promocao_id ? { promocao_id: st.promocao_id } : {}) } });
      if (rr.ok) { recado.pôr(`Horário agendado: ${st.servico_nome}${st.promocao_id ? ` (promoção ${st.promo_titulo})` : ''}, ${dataLonga(st.data)} às ${st.inicio}. O salão vai confirmar com você.`); location.replace(L('inicio/')); return; }
      env = false; $('#confirmar').disabled = false;
      const outro = rr.erro === 'indisponivel' ? '<div class="linha-acoes"><button type="button" class="btn btn-cheio" id="outro">Escolher outro horário</button></div>' : '';
      $('#aviso').innerHTML = avisoHTML(esc(rr.erros ? Object.values(rr.erros).join(' ') : rr.msg || 'Não foi possível agendar.'), 'erro', outro);
      const b = $('#outro'); if (b) b.onclick = passoHora;
    };
    focarTitulo();
  };
  if (st.promocao_id) temProf ? passoProf() : passoDia(); else passoServico();
}

// ═══════════════════════════ HISTÓRICO ═════════════════════════════════════
async function telaHistorico() {
  const r = await capi('cl_historico');
  if (!r.ok) return telaErro('Meu histórico', r.msg);
  pagina({ titulo: 'Meu histórico', voltar: L('inicio/'), voltarTexto: 'Início',
    corpo: r.itens.length ? '<ul class="lista lista-compacta" id="lista"></ul><nav class="paginacao" id="nav" hidden></nav>' : '<div class="vazio"><h2>Nada por aqui ainda</h2><p>Os atendimentos realizados vão aparecer aqui.</p></div>',
    acoes: `<a class="btn btn-linha" href="${L('inicio/')}">${SETA} Voltar</a>` });
  if (r.itens.length) paginar($('#lista'), $('#nav'), r.itens, 58, 82 + 60, (x) => `<li class="item item-curto"><div class="item-info"><div class="item-nome">${esc(dataCurta(x.data))}</div><div class="item-extra">${esc(x.servico)}</div></div></li>`, 'atendimentos');
  focarTitulo();
}

// ═══════════════════════════ MEUS DADOS / PIN / SAIR ═══════════════════════
async function telaDados() {
  const r = await capi('cl_dados');
  if (!r.ok) return telaErro('Meus dados', r.msg);
  const d = r.dados; const msg = recado.tirar();
  pagina({ titulo: 'Meus dados', voltar: L('inicio/'), voltarTexto: 'Início',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<div class="resumo"><section class="bloco"><dl class="dados">
        <dt>Nome</dt><dd>${esc(d.nome)}</dd>${d.apelido ? `<dt>Como prefere ser chamada</dt><dd>${esc(d.apelido)}</dd>` : ''}
        <dt>WhatsApp</dt><dd>${d.whatsapp ? esc(fone(d.whatsapp)) : 'Não informado'}</dd>${d.email ? `<dt>E-mail</dt><dd>${esc(d.email)}</dd>` : ''}</dl></section></div>
      <p class="ajuda">Para corrigir algum dado, fale com o salão.</p>
      <nav class="acoes-grade" aria-label="Conta"><a class="btn btn-suave" href="${L('pin/')}">Trocar meu PIN</a><button type="button" class="btn btn-linha" id="sair-todos">Sair de todos os aparelhos</button></nav>
      <div id="aviso" aria-live="polite"></div>`,
    acoes: `<a class="btn btn-linha" href="${L('inicio/')}">${SETA} Voltar</a><button type="button" class="btn btn-cheio" id="sair">Sair</button>` });
  $('#sair').onclick = async () => { $('#sair').disabled = true; await capi('cl_sair', { corpo: {} }); location.replace(L('entrar/')); };
  $('#sair-todos').onclick = async () => { $('#sair-todos').disabled = true; await capi('cl_sair', { corpo: { todos: true } }); location.replace(L('entrar/')); };
  focarTitulo();
}
async function telaPin() {
  const form = pagina({ titulo: 'Trocar meu PIN', voltar: L('dados/'), voltarTexto: 'Meus dados', formulario: true,
    corpo: `${campoPin('atual', 'PIN atual')}<div class="duas-colunas">${campoPinNovo('novo', 'Novo PIN')}${campoPinNovo('novo2', 'Repita o novo PIN')}</div>
      <p class="ajuda">Os outros aparelhos conectados saem da sua conta.</p><div id="aviso" aria-live="polite"></div>`,
    acoes: `<a class="btn btn-linha" href="${L('dados/')}">Cancelar</a><button type="submit" class="btn btn-cheio" id="salvar">Salvar</button>` });
  let env = false;
  form.onsubmit = async (e) => {
    e.preventDefault(); if (env) return; const er = {};
    if (!/^\d{6}$/.test(form.atual.value)) er.atual = 'O PIN tem 6 números.';
    if (!/^\d{6}$/.test(form.novo.value)) er.novo = 'O PIN tem 6 números.'; else if (form.novo.value !== form.novo2.value) er.novo2 = 'Os PINs não conferem.';
    if (!mostrarErros(form, er)) return;
    env = true; $('#salvar').disabled = true;
    const r = await capi('cl_trocar_pin', { corpo: { atual: form.atual.value, novo: form.novo.value, novo2: form.novo2.value } });
    if (r.ok) { recado.pôr('PIN trocado.'); location.replace(L('dados/')); return; }
    env = false; $('#salvar').disabled = false;
    if (r.erros) mostrarErros(form, r.erros);
    $('#aviso').innerHTML = avisoHTML(esc(r.erros ? Object.values(r.erros).join(' ') : r.msg), 'erro');
  };
  form.atual.focus();
  focarTitulo();
}

const TELAS = { 'cl-ativar': telaAtivar, 'cl-entrar': telaEntrar, 'cl-inicio': telaInicio, 'cl-horario': telaHorario, 'cl-remarcar': telaRemarcar,
  'cl-agendar': telaAgendar, 'cl-historico': telaHistorico, 'cl-dados': telaDados, 'cl-pin': telaPin };
(TELAS[document.body.dataset.pagina] || telaEntrar)();
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
