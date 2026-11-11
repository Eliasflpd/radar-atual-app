// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — AGENDAMENTO ONLINE (página pública, sem login)
// A cliente escolhe serviço → profissional → dia → horário livre → seus dados →
// confere → envia. O servidor revalida tudo (horário livre, 2 h de antecedência,
// até 30 dias, limite por telefone/IP). Rascunho só nesta aba ("pub:ag").
// ═══════════════════════════════════════════════════════════════════════════
import { $, esc, uuid, lerRasc, gravarRasc, apagarRasc, api, SETA, pagina, campoTexto, mostrarErros, avisoHTML, focarTitulo, ir } from './comum.js?v=4';

const BASE = '/brow-studio/agendar/';
// salão do link (?s=slug): guardado só nesta aba para as próximas etapas; sem ?s na 1ª página = salão original
try { if (location.pathname === BASE) { const sl = new URLSearchParams(location.search).get('s'); if (sl) sessionStorage.setItem('brow:pub_s', sl); else sessionStorage.removeItem('brow:pub_s'); } } catch (e) {}
const app = document.getElementById('app');
const CH = 'pub:ag';
const ler = () => lerRasc(CH);
const guardar = (m) => gravarRasc(CH, { ...(ler() || {}), ...m });
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const dataLonga = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };
const reais = (c) => { const s = String(Math.max(0, c | 0)).padStart(3, '0'); return `R$ ${s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${s.slice(-2)}`; };
const tempo = (m) => m < 60 ? `${m} min` : (m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`);
const digitos = (v) => String(v || '').replace(/\D/g, '');
const TOTAL = 5;
const passou = () => document.documentElement.scrollHeight > window.innerHeight + 1;
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
let INFO = null;
async function info() {
  if (INFO) return INFO;
  const r = await api('pub_info');
  if (!r.ok) {
    pagina({ titulo: 'Agendar horário', corpo: avisoHTML(esc(r.msg || 'Agendamento online indisponível no momento.'), 'erro') });
    focarTitulo(); return null;
  }
  INFO = r; return r;
}
const cab = (r, sub) => `<p class="etapa" style="margin-top:-8px">${esc(r.estudio)}${sub ? ' · ' + esc(sub) : ''}</p>`;

// 1 — serviço
async function telaServico() {
  const r = await info(); if (!r) return;
  const d = ler() || { chave_envio: uuid() }; if (!d.chave_envio) d.chave_envio = uuid(); gravarRasc(CH, d);
  const form = pagina({ titulo: 'Agendar horário', etapa: 1, etapasTotal: TOTAL, formulario: true,
    corpo: `${cab(r, 'escolha o serviço')}<fieldset class="campo"><legend class="sr-only">Serviço</legend><ul class="lista lista-lotes" id="lista"></ul><span class="erro" id="servico-erro" aria-live="polite"></span></fieldset><nav class="paginacao" id="nav" hidden></nav>`,
    acoes: `<button type="submit" class="btn btn-cheio">Próximo <span aria-hidden="true">→</span></button>` });
  if (!r.servicos.length) { $('#lista').innerHTML = '<li class="vazio vazio-curto"><p>Nenhum serviço disponível no momento.</p></li>'; }
  else paginar($('#lista'), $('#nav'), r.servicos, 62, 82 + 60, (s) => `<li><label class="opcao opcao-lote"><input type="radio" name="servico" value="${esc(s.id)}" ${s.id === d.servico_id ? 'checked' : ''}><span><strong>${esc(s.nome)}</strong><small>${tempo(s.duracao_min)} · ${reais(s.valor_centavos)}${s.descricao ? ' · ' + esc(s.descricao) : ''}</small></span></label></li>`, 'serviços');
  form.onsubmit = (e) => {
    e.preventDefault(); const v = form.querySelector('[name=servico]:checked');
    if (!v) { $('#servico-erro').textContent = 'Escolha um serviço.'; return; }
    const s = r.servicos.find(x => x.id === v.value);
    guardar({ servico_id: s.id, servico_nome: s.nome, duracao_min: s.duracao_min, valor_centavos: s.valor_centavos, inicio_min: null });
    ir(r.profissionais.length > 1 ? BASE + 'profissional/' : BASE + 'dia/');
  };
  focarTitulo();
}
// 2 — profissional
async function telaProfissional() {
  const r = await info(); if (!r) return; const d = ler(); if (!d || !d.servico_id) return ir(BASE);
  const opcoes = [{ id: '', nome: 'Qualquer profissional' }, ...r.profissionais];
  const form = pagina({ titulo: 'Agendar horário', etapa: 2, etapasTotal: TOTAL, formulario: true, voltar: BASE, voltarTexto: 'Voltar',
    corpo: `${cab(r, d.servico_nome)}<fieldset class="campo"><legend>Com quem?</legend><div class="opcoes">${opcoes.map(p => `<label class="opcao"><input type="radio" name="prof" value="${esc(p.id)}" ${(d.prof_escolha || '') === p.id ? 'checked' : ''}><span>${esc(p.nome)}</span></label>`).join('')}</div></fieldset>`,
    acoes: `<a class="btn btn-linha" href="${BASE}">${SETA} Voltar</a><button type="submit" class="btn btn-cheio">Próximo <span aria-hidden="true">→</span></button>` });
  form.onsubmit = (e) => { e.preventDefault(); const v = form.querySelector('[name=prof]:checked'); guardar({ prof_escolha: v ? v.value : '', inicio_min: null }); ir(BASE + 'dia/'); };
  focarTitulo();
}
// 3 — dia
async function telaDia() {
  const r = await info(); if (!r) return; const d = ler(); if (!d || !d.servico_id) return ir(BASE);
  const voltar = r.profissionais.length > 1 ? BASE + 'profissional/' : BASE;
  const form = pagina({ titulo: 'Agendar horário', etapa: 3, etapasTotal: TOTAL, formulario: true, voltar, voltarTexto: 'Voltar',
    corpo: `${cab(r, d.servico_nome)}<fieldset class="campo"><legend>Escolha o dia</legend><div class="grade-horarios grade-dias" id="lista"></div><span class="erro" id="dia-erro" aria-live="polite"></span></fieldset><nav class="paginacao" id="nav" hidden></nav>`,
    acoes: `<a class="btn btn-linha" href="${voltar}">${SETA} Voltar</a><button type="submit" class="btn btn-cheio">Ver horários <span aria-hidden="true">→</span></button>` });
  if (!r.dias.length) $('#lista').innerHTML = '<p class="ajuda">Nenhum dia disponível nos próximos 30 dias.</p>';
  else paginar($('#lista'), $('#nav'), r.dias, 66, 82 + 60, (x) => { const dt = new Date(x + 'T12:00:00Z'); return `<label class="opcao opcao-hora"><input type="radio" name="dia" value="${x}" ${x === d.data ? 'checked' : ''}><span><strong>${x === r.hoje ? 'Hoje' : DIAS[dt.getUTCDay()].slice(0, 3)}</strong><small>${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}</small></span></label>`; }, 'dias');
  form.onsubmit = (e) => { e.preventDefault(); const v = form.querySelector('[name=dia]:checked'); if (!v) { $('#dia-erro').textContent = 'Escolha um dia.'; return; } guardar({ data: v.value, inicio_min: null }); ir(BASE + 'horario/'); };
  focarTitulo();
}
// 4 — horário
async function telaHorario() {
  const r = await info(); if (!r) return; const d = ler(); if (!d || !d.data) return ir(BASE + 'dia/');
  pagina({ titulo: 'Agendar horário', corpo: avisoHTML('Procurando horários livres…') });
  const h = await api('pub_horarios', { query: { servico_id: d.servico_id, profissional_id: d.prof_escolha || '', data: d.data } });
  const form = pagina({ titulo: 'Agendar horário', etapa: 4, etapasTotal: TOTAL, formulario: true, voltar: BASE + 'dia/', voltarTexto: 'Voltar',
    corpo: `${cab(r, `${d.servico_nome} · ${dataLonga(d.data)}`)}${!h.ok ? avisoHTML(esc(h.msg), 'erro') : h.motivo ? avisoHTML(esc(h.motivo), 'erro') : '<fieldset class="campo"><legend>Horários livres</legend><div class="grade-horarios" id="lista"></div><span class="erro" id="hora-erro" aria-live="polite"></span></fieldset><nav class="paginacao" id="nav" hidden></nav>'}`,
    acoes: `<a class="btn btn-linha" href="${BASE}dia/">${SETA} Outro dia</a><button type="submit" class="btn btn-cheio" ${!h.ok || h.motivo ? 'disabled' : ''}>Próximo <span aria-hidden="true">→</span></button>` });
  if (h.ok && !h.motivo) paginar($('#lista'), $('#nav'), h.horarios, 66, 82 + 60, (x) => `<label class="opcao opcao-hora"><input type="radio" name="hora" value="${x.inicio_min}" data-prof="${esc(x.profissional_id)}" data-profn="${esc(x.profissional_nome)}" data-ini="${x.inicio}" data-fim="${x.fim}" ${x.inicio_min === d.inicio_min ? 'checked' : ''}><span><strong>${x.inicio}</strong><small>até ${x.fim}</small></span></label>`, 'horários');
  form.onsubmit = (e) => {
    e.preventDefault(); const v = form.querySelector('[name=hora]:checked');
    if (!v) { $('#hora-erro').textContent = 'Escolha um horário.'; return; }
    guardar({ inicio_min: +v.value, inicio: v.dataset.ini, fim: v.dataset.fim, profissional_id: v.dataset.prof, profissional_nome: v.dataset.profn }); ir(BASE + 'dados/');
  };
  focarTitulo();
}
// 5 — dados da cliente
async function telaDados() {
  const r = await info(); if (!r) return; const d = ler(); if (!d || d.inicio_min == null) return ir(BASE + 'horario/');
  const form = pagina({ titulo: 'Seus dados', etapa: 5, etapasTotal: TOTAL, formulario: true, voltar: BASE + 'horario/', voltarTexto: 'Voltar',
    corpo: `${cab(r, `${dataLonga(d.data)}, ${d.inicio}`)}
      ${campoTexto({ id: 'nome', rotulo: 'Seu nome', valor: d.nome || '', attrs: 'autocomplete="name" autocapitalize="words" autocorrect="off" spellcheck="false" maxlength="80"' })}
      ${campoTexto({ id: 'whatsapp', rotulo: 'WhatsApp com DDD', valor: d.whatsapp || '', tipo: 'tel', attrs: 'autocomplete="tel" inputmode="tel" maxlength="20" placeholder="(11) 98888-7777"' })}
      ${campoTexto({ id: 'observacoes', rotulo: 'Observação', valor: d.observacoes || '', opcional: true, attrs: 'maxlength="300" autocomplete="off"' })}
      <div class="isca" aria-hidden="true"><label>Não preencha<input name="site" tabindex="-1" autocomplete="off"></label></div>
      <p class="ajuda">Seus dados são usados só para o agendamento.</p>`,
    acoes: `<a class="btn btn-linha" href="${BASE}horario/">${SETA} Voltar</a><button type="submit" class="btn btn-cheio">Conferir <span aria-hidden="true">→</span></button>` });
  const lerF = () => ({ nome: form.nome.value, whatsapp: form.whatsapp.value, observacoes: form.observacoes.value, site: form.site.value });
  form.addEventListener('input', () => guardar(lerF()));
  form.onsubmit = (e) => {
    e.preventDefault(); const v = lerF(); const er = {}; let t = digitos(v.whatsapp); if (t.startsWith('55') && t.length >= 12) t = t.slice(2);
    if (v.nome.trim().length < 2) er.nome = 'Informe seu nome.';
    if (!(t.length === 10 || t.length === 11)) er.whatsapp = 'Informe o WhatsApp com DDD.';
    if (!mostrarErros(form, er)) return;
    guardar(v); ir(BASE + 'conferencia/');
  };
  focarTitulo();
}
// conferência
async function telaConferencia() {
  const r = await info(); if (!r) return; const d = ler(); if (!d || !d.nome) return ir(BASE + 'dados/');
  pagina({ titulo: 'Confira seu pedido', voltar: BASE + 'dados/', voltarTexto: 'Voltar',
    corpo: `<div class="resumo"><section class="bloco"><dl class="dados">
        <dt>Serviço</dt><dd>${esc(d.servico_nome)} · ${tempo(d.duracao_min)} · ${reais(d.valor_centavos)}</dd>
        <dt>Dia</dt><dd>${esc(dataLonga(d.data))}</dd><dt>Horário</dt><dd>${esc(d.inicio)} às ${esc(d.fim)}</dd>
        <dt>Profissional</dt><dd>${esc(d.profissional_nome)}</dd><dt>Nome</dt><dd>${esc(d.nome)}</dd><dt>WhatsApp</dt><dd>${esc(d.whatsapp)}</dd>
        ${d.observacoes ? `<dt>Observação</dt><dd>${esc(d.observacoes)}</dd>` : ''}</dl></section></div>
      <p class="ajuda">O estúdio confirma o horário com você pelo WhatsApp.</p><div id="aviso" aria-live="polite"></div>`,
    acoes: `<a class="btn btn-linha" href="${BASE}dados/">${SETA} Corrigir</a><button type="button" class="btn btn-cheio" id="enviar">Enviar pedido</button>` });
  let env = false;
  $('#enviar').onclick = async () => {
    if (env) return; env = true; const b = $('#enviar'); b.disabled = true; b.textContent = 'Enviando…';
    const rr = await api('pub_agendar', { corpo: { chave_envio: d.chave_envio, servico_id: d.servico_id, profissional_id: d.profissional_id, data: d.data, inicio_min: d.inicio_min, nome: d.nome, whatsapp: d.whatsapp, observacoes: d.observacoes, site: d.site || '' } });
    if (rr.ok) { gravarRasc('pub:feito', { ...rr, nome: d.nome }); apagarRasc(CH); location.replace(BASE + 'enviado/'); return; }
    env = false; b.disabled = false; b.textContent = 'Tentar de novo';
    const outro = rr.erro === 'indisponivel' ? `<div class="linha-acoes"><a class="btn btn-cheio" href="${BASE}horario/">Escolher outro horário</a></div>` : '';
    $('#aviso').innerHTML = avisoHTML(esc(rr.erros ? Object.values(rr.erros).join(' ') : rr.msg || 'Não foi possível enviar.'), 'erro', outro);
  };
  focarTitulo();
}
// enviado
function telaEnviado() {
  const f = lerRasc('pub:feito'); if (!f) return ir(BASE);
  const msg = `Olá! Acabei de agendar pelo link: ${f.servico}, ${dataLonga(f.data)} às ${f.inicio}. Nome: ${f.nome}.`;
  pagina({ titulo: 'Pedido enviado', corpo: `${avisoHTML(`Seu horário foi reservado: <strong>${esc(f.servico)}</strong>, ${esc(dataLonga(f.data))} às <strong>${esc(f.inicio)}</strong>, com ${esc(f.profissional)}.`, 'ok')}
      <p class="ajuda">O estúdio vai confirmar com você pelo WhatsApp. Se precisar mudar, fale com o estúdio.</p>`,
    acoes: `${f.whatsapp_estudio ? `<a class="btn btn-cheio" href="https://wa.me/55${esc(f.whatsapp_estudio)}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Avisar o estúdio no WhatsApp</a>` : ''}<a class="btn btn-linha" href="${BASE}" id="novo">Fazer outro agendamento</a>` });
  $('#novo').onclick = () => apagarRasc('pub:feito');
  focarTitulo();
}

const TELAS = { servico: telaServico, profissional: telaProfissional, dia: telaDia, horario: telaHorario, dados: telaDados, conferencia: telaConferencia, enviado: telaEnviado };
(TELAS[document.body.dataset.pagina] || telaServico)();
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
