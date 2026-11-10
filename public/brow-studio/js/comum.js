// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — peças comuns dos módulos (clientes, serviços...).
// Moldura de página, campos, mensagens, rascunho entre etapas e servidor.
// Extraído de clientes.js sem mudar o comportamento.
// ═══════════════════════════════════════════════════════════════════════════
export const API = '/api/brow';
export const $ = (s, el = document) => el.querySelector(s);
export const app = document.getElementById('app');
export const params = new URLSearchParams(location.search);

// ─── utilidades ─────────────────────────────────────────────────────────────
export const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

// ─── rascunho (sessionStorage): só nesta aba; NÃO é registro salvo ─────────
export const chaveRasc = (r) => 'brow:rascunho:' + r;
export function lerRasc(r) { try { return JSON.parse(sessionStorage.getItem(chaveRasc(r)) || 'null'); } catch (e) { return null; } }
export function gravarRasc(r, dados) {
  try { sessionStorage.setItem(chaveRasc(r), JSON.stringify(dados)); return true; }
  catch (e) { return false; }   // memória cheia (foto grande) — quem chama avisa
}
export function apagarRasc(r) { try { sessionStorage.removeItem(chaveRasc(r)); } catch (e) {} }

// ─── servidor ───────────────────────────────────────────────────────────────
export async function api(acao, { id, corpo, query } = {}) {
  const qs = new URLSearchParams({ acao, ...(id ? { id } : {}), ...(query || {}) });
  let resp;
  try {
    resp = await fetch(`${API}?${qs}`, {
      method: corpo ? 'POST' : 'GET',
      headers: corpo ? { 'Content-Type': 'application/json' } : {},
      body: corpo ? JSON.stringify(corpo) : undefined,
      credentials: 'same-origin', cache: 'no-store'
    });
  } catch (e) {
    return { ok: false, erro: 'rede', msg: 'Sem conexão com a internet. Confira a rede e tente novamente.' };
  }
  let j = null;
  try { j = await resp.json(); } catch (e) {}
  if (!j) return { ok: false, erro: 'servidor', msg: 'O servidor não respondeu como esperado. Tente novamente.' };
  return j;
}

// ─── moldura da página ──────────────────────────────────────────────────────
export const SETA = '<span aria-hidden="true">←</span>';
export function etapas(n, total = 5) {
  return `<p class="etapa">Etapa ${n} de ${total}</p><div class="progresso" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<span class="${i + 1 <= n ? 'feito' : ''}"></span>`).join('')}</div>`;
}
export function pagina({ titulo, voltar, voltarTexto = 'Voltar', etapa, etapasTotal = 5, corpo, acoes = '', formulario = false, extra = '' }) {
  document.title = `${titulo} · Brow Studio`;
  const abre = formulario ? '<form class="app-form" novalidate style="display:contents">' : '';
  const fecha = formulario ? '</form>' : '';
  app.innerHTML = `
    <header class="app-topo">
      ${voltar ? `<a class="voltar" href="${esc(voltar)}">${SETA} ${esc(voltarTexto)}</a>` : ''}
      <div class="app-topo-titulo"><h1 id="titulo" tabindex="-1">${esc(titulo)}</h1>${etapa ? etapas(etapa, etapasTotal) : ''}</div>
      ${extra}
    </header>
    ${abre}
    <main class="app-corpo" id="corpo">${corpo}</main>
    ${acoes ? `<footer class="app-acoes">${acoes}</footer>` : ''}
    ${fecha}`;
  return formulario ? $('.app-form') : null;
}
export function campoTexto({ id, rotulo, valor = '', tipo = 'text', opcional, ajuda, attrs = '' }) {
  return `<div class="campo">
    <label for="${id}">${esc(rotulo)}${opcional ? ' <span class="opcional">(opcional)</span>' : ''}</label>
    <input id="${id}" name="${id}" type="${tipo}" value="${esc(valor)}" aria-describedby="${id}-erro${ajuda ? ` ${id}-ajuda` : ''}" ${attrs}>
    ${ajuda ? `<span class="ajuda" id="${id}-ajuda">${esc(ajuda)}</span>` : ''}
    <span class="erro" id="${id}-erro" aria-live="polite"></span>
  </div>`;
}
export function grupoOpcoes({ nome, legenda, opcoes, valor, colunas = 2 }) {
  return `<fieldset class="campo" aria-describedby="${nome}-erro">
    <legend>${esc(legenda)}</legend>
    <div class="opcoes${colunas === 3 ? ' tres' : ''}">
      ${Object.entries(opcoes).map(([v, t]) => `<label class="opcao"><input type="radio" name="${nome}" value="${v}" ${valor === v ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}
    </div>
    <span class="erro" id="${nome}-erro" aria-live="polite"></span>
  </fieldset>`;
}
export function mostrarErros(form, erros) {
  form.querySelectorAll('.erro').forEach(e => { e.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
  let primeiro = null;
  for (const [k, msg] of Object.entries(erros)) {
    const alvo = form.querySelector(`[name="${k}"]`);
    const e = form.querySelector(`#${k}-erro`);
    if (e) e.textContent = msg;
    if (alvo) { alvo.setAttribute('aria-invalid', 'true'); primeiro = primeiro || alvo; }
  }
  if (primeiro) primeiro.focus();
  return !Object.keys(erros).length;
}
export function avisoHTML(msg, tipo = '', extra = '') { return `<div class="aviso-caixa ${tipo}" role="${tipo === 'erro' ? 'alert' : 'status'}">${msg}${extra}</div>`; }
export function focarTitulo() { const t = $('#titulo'); if (t) t.focus({ preventScroll: true }); }
export const ir = (url) => { location.href = url; };
export function blocoResumo(titulo, linhas, corrigir) {
  return `<section class="bloco"><div class="bloco-topo"><h2>${esc(titulo)}</h2>${corrigir ? `<a class="corrigir" href="${corrigir}">Corrigir</a>` : ''}</div>
    <dl class="dados">${linhas.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v ? esc(v) : '<span style="color:#a68b7a">Não informado</span>'}</dd>`).join('')}</dl></section>`;
}
