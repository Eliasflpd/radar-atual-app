// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — ENTRAR, PRIMEIRA CONTA, MINHA CONTA E EQUIPE (10/11/2026)
// Login por nome + PIN de 6 dígitos. A sessão fica num cookie HttpOnly
// (o JavaScript não lê o token). Nada de PIN é guardado no navegador.
// ═══════════════════════════════════════════════════════════════════════════
import { $, params, esc, api, SETA, pagina, campoTexto, grupoOpcoes, mostrarErros, avisoHTML, focarTitulo, ir } from './comum.js?v=3';

const app = document.getElementById('app');
const MENU = '/brow-studio/profissional.html';
const voltaSegura = () => { const v = params.get('volta') || ''; return /^\/brow-studio\/[\w\-/.?=&%]*$/.test(v) && !v.startsWith('/brow-studio/entrar') ? v : MENU; };
const recado = { pôr(m) { try { sessionStorage.setItem('brow:recado', m); } catch (e) {} }, tirar() { try { const m = sessionStorage.getItem('brow:recado'); sessionStorage.removeItem('brow:recado'); return m; } catch (e) { return null; } } };
const campoPin = (id, rotulo, ajuda) => campoTexto({ id, rotulo, tipo: 'password', ajuda, attrs: 'inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" enterkeyhint="go"' });
const FUNCOES = { dona: 'Dona (vê tudo, inclusive financeiro)', profissional: 'Profissional (atendimento, sem financeiro)' };

// ═══════════════════════════ ENTRAR ════════════════════════════════════════
async function telaEntrar() {
  pagina({ titulo: 'Entrar', corpo: avisoHTML('Carregando…') });
  const e = await api('au_estado');
  if (e.ok && e.logado) return ir(voltaSegura());
  if (e.ok && !e.tem_contas) return ir('/brow-studio/entrar/primeira/');
  const msg = recado.tirar();
  const form = pagina({ titulo: 'Entrar', voltar: '/brow-studio/', voltarTexto: 'Capa', formulario: true,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}${!e.ok ? avisoHTML(esc(e.msg || 'Não foi possível falar com o servidor.'), 'erro') : ''}
      ${campoTexto({ id: 'nome', rotulo: 'Seu nome', attrs: 'autocomplete="username" autocapitalize="words" maxlength="60"' })}
      ${campoPin('pin', 'PIN (6 números)')}
      <div id="aviso" aria-live="polite"></div>
      <p class="ajuda">Esqueceu o PIN? Peça à dona do estúdio para redefinir.</p>`,
    acoes: `<button type="submit" class="btn btn-cheio" id="entrar">Entrar</button>` });
  form.nome.focus();
  let env = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); if (env) return; const er = {};
    if (form.nome.value.trim().length < 2) er.nome = 'Informe seu nome.';
    if (!/^\d{6}$/.test(form.pin.value)) er.pin = 'O PIN tem 6 números.';
    if (!mostrarErros(form, er)) return;
    env = true; $('#entrar').disabled = true; $('#entrar').textContent = 'Entrando…';
    const r = await api('au_entrar', { corpo: { nome: form.nome.value, pin: form.pin.value } });
    if (r.ok) { location.replace(voltaSegura()); return; }
    env = false; $('#entrar').disabled = false; $('#entrar').textContent = 'Entrar'; form.pin.value = ''; form.pin.focus();
    $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível entrar.'), 'erro');
  };
}
async function telaPrimeira() {
  pagina({ titulo: 'Primeira configuração', corpo: avisoHTML('Carregando…') });
  const e = await api('au_estado');
  if (e.ok && e.tem_contas) return ir('/brow-studio/entrar/');
  const form = pagina({ titulo: 'Primeira configuração', voltar: '/brow-studio/', voltarTexto: 'Capa', formulario: true,
    corpo: `<p class="etapa" style="margin-top:-8px">Criar a conta da dona do estúdio</p>
      ${e.ok && !e.codigo_configurado ? avisoHTML('Falta configurar o código inicial no servidor (variável <strong>BROW_CODIGO_INICIAL</strong> na Vercel).', 'erro') : ''}
      ${campoTexto({ id: 'codigo', rotulo: 'Código inicial', tipo: 'password', attrs: 'autocomplete="off" maxlength="200"', ajuda: 'O código secreto configurado na Vercel.' })}
      ${campoTexto({ id: 'nome', rotulo: 'Seu nome', attrs: 'autocomplete="username" autocapitalize="words" maxlength="60"', ajuda: 'É o nome que você vai digitar para entrar.' })}
      <div class="duas-colunas">${campoPin('pin', 'Crie um PIN')}${campoPin('pin2', 'Repita o PIN')}</div>
      <p class="ajuda">Evite datas de nascimento, 123456 ou números repetidos.</p><div id="aviso" aria-live="polite"></div>`,
    acoes: `<button type="submit" class="btn btn-cheio" id="criar">Criar conta da dona</button>` });
  $('#corpo').classList.add('fin-compacto');
  let env = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); if (env) return; const er = {};
    if (!form.codigo.value) er.codigo = 'Informe o código inicial.';
    if (form.nome.value.trim().length < 2) er.nome = 'Informe seu nome.';
    if (!/^\d{6}$/.test(form.pin.value)) er.pin = 'O PIN tem 6 números.'; else if (form.pin.value !== form.pin2.value) er.pin2 = 'Os PINs não conferem.';
    if (!mostrarErros(form, er)) return;
    env = true; $('#criar').disabled = true;
    const r = await api('au_primeira', { corpo: { codigo: form.codigo.value, nome: form.nome.value, pin: form.pin.value, pin2: form.pin2.value } });
    if (r.ok) { recado.pôr(`Conta criada. Bem-vinda, ${r.usuario.nome}!`); location.replace(MENU); return; }
    env = false; $('#criar').disabled = false;
    if (r.erros) mostrarErros(form, r.erros);
    $('#aviso').innerHTML = avisoHTML(esc(r.erros ? Object.values(r.erros).join(' ') : r.msg), 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ MINHA CONTA ═══════════════════════════════════
async function telaConta() {
  const r = await api('au_eu'); if (!r.ok) return pagina({ titulo: 'Minha conta', voltar: MENU, corpo: avisoHTML(esc(r.msg), 'erro') });
  const u = r.usuario; const msg = recado.tirar();
  pagina({ titulo: 'Minha conta', voltar: MENU, voltarTexto: 'Menu',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<div class="bloco"><h2>${esc(u.nome)}</h2><p class="ajuda">${esc(u.funcao_nome)}</p></div>
      <nav class="acoes-grade" aria-label="Conta">${r.teste_local ? '' : '<a class="btn btn-suave" href="/brow-studio/conta/pin/">Trocar meu PIN</a>'}${u.funcao === 'dona' ? '<a class="btn btn-suave" href="/brow-studio/equipe/">Equipe e acessos</a>' : ''}
        <button type="button" class="btn btn-cheio" id="sair">Sair</button><button type="button" class="btn btn-linha" id="sair-todos">Sair de todos os aparelhos</button></nav><div id="aviso"></div>` });
  const sair = async (todos) => { const rr = await api('au_sair', { corpo: { todos } }); if (rr.ok) { recado.pôr(todos ? 'Você saiu de todos os aparelhos.' : 'Você saiu.'); location.replace('/brow-studio/entrar/'); } else $('#aviso').innerHTML = avisoHTML(esc(rr.msg), 'erro'); };
  $('#sair').onclick = () => sair(false); $('#sair-todos').onclick = () => sair(true);
  focarTitulo();
}
async function telaTrocarPin() {
  const form = pagina({ titulo: 'Trocar meu PIN', voltar: '/brow-studio/conta/', voltarTexto: 'Minha conta', formulario: true,
    corpo: `${campoPin('atual', 'PIN atual')}<div class="duas-colunas">${campoPin('novo', 'Novo PIN')}${campoPin('novo2', 'Repita o novo PIN')}</div>
      <p class="ajuda">Os outros aparelhos conectados serão desconectados.</p><div id="aviso" aria-live="polite"></div>`,
    acoes: `<a class="btn btn-linha" href="/brow-studio/conta/">Cancelar</a><button type="submit" class="btn btn-cheio" id="salvar">Salvar PIN</button>` });
  let env = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); if (env) return; const er = {};
    if (!/^\d{6}$/.test(form.atual.value)) er.atual = 'O PIN tem 6 números.';
    if (!/^\d{6}$/.test(form.novo.value)) er.novo = 'O PIN tem 6 números.'; else if (form.novo.value !== form.novo2.value) er.novo2 = 'Os PINs não conferem.';
    if (!mostrarErros(form, er)) return;
    env = true; $('#salvar').disabled = true;
    const r = await api('au_trocar_pin', { corpo: { atual: form.atual.value, novo: form.novo.value, novo2: form.novo2.value } });
    if (r.ok) { recado.pôr('PIN trocado.'); location.replace('/brow-studio/conta/'); return; }
    env = false; $('#salvar').disabled = false; if (r.erros) mostrarErros(form, r.erros);
    $('#aviso').innerHTML = avisoHTML(esc(r.erros ? Object.values(r.erros).join(' ') : r.msg), 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ EQUIPE (dona) ═════════════════════════════════
async function telaEquipe() {
  const r = await api('eq_listar'); const msg = recado.tirar();
  if (!r.ok) return pagina({ titulo: 'Equipe e acessos', voltar: '/brow-studio/conta/', voltarTexto: 'Conta', corpo: avisoHTML(esc(r.msg), 'erro') });
  pagina({ titulo: 'Equipe e acessos', voltar: '/brow-studio/conta/', voltarTexto: 'Conta',
    extra: '<a class="btn btn-cheio btn-topo" href="/brow-studio/equipe/pessoa/" aria-label="Nova pessoa">+ Nova<span class="so-largo">&nbsp;pessoa</span></a>',
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<p class="ajuda">Cada pessoa entra com o próprio nome e PIN. A autoria dos registros fica no nome de quem fez.</p>
      <ul class="lista" aria-label="Equipe">${r.itens.map(x => `<li class="item${x.ativo ? '' : ' item-inativo'}"><div class="item-info"><div class="item-nome">${esc(x.nome)}${x.id === r.eu ? ' <small>· você</small>' : ''}</div>
        <div class="item-extra">${esc(x.funcao_nome)}${x.profissional_nome ? ' · agenda: ' + esc(x.profissional_nome) : ''}${x.ativo ? '' : ' · desativada'}${x.bloqueado ? ' · bloqueada por tentativas' : ''}</div></div>
        <a class="btn btn-linha" href="/brow-studio/equipe/pessoa/?id=${encodeURIComponent(x.id)}" aria-label="Abrir ${esc(x.nome)}">Abrir</a></li>`).join('')}</ul>` });
  focarTitulo();
}
async function telaPessoa() {
  const id = params.get('id');
  const [lst, cfg] = await Promise.all([api('eq_listar'), api('ag_config_ver')]);
  if (!lst.ok) return pagina({ titulo: 'Pessoa', voltar: '/brow-studio/equipe/', corpo: avisoHTML(esc(lst.msg), 'erro') });
  const p = id ? lst.itens.find(x => x.id === id) : null;
  if (id && !p) return pagina({ titulo: 'Pessoa', voltar: '/brow-studio/equipe/', corpo: avisoHTML('Pessoa não encontrada.', 'erro') });
  const profs = cfg.ok ? cfg.profissionais : [];
  const form = pagina({ titulo: p ? 'Editar acesso' : 'Nova pessoa', voltar: '/brow-studio/equipe/', voltarTexto: 'Equipe', formulario: true,
    corpo: `${campoTexto({ id: 'nome', rotulo: 'Nome para entrar', valor: p ? p.nome : '', attrs: 'maxlength="60" autocapitalize="words" autocomplete="off"' })}
      ${grupoOpcoes({ nome: 'funcao', legenda: 'Função', opcoes: FUNCOES, valor: p ? p.funcao : '' })}
      <div class="campo"><label for="profissional_id">Profissional da agenda <span class="opcional">(opcional)</span></label><select id="profissional_id" name="profissional_id"><option value="">Não vincular</option>${profs.map(x => `<option value="${esc(x.id)}" ${p && p.profissional_id === x.id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></div>
      ${p ? `<label class="chave"><input type="checkbox" name="ativo" ${p.ativo ? 'checked' : ''}><span><strong>Acesso ativo</strong><small>Desativar desconecta e impede de entrar (os registros dela continuam).</small></span></label>`
        : `<div class="duas-colunas">${campoPin('pin', 'PIN inicial')}${campoPin('pin2', 'Repita o PIN')}</div><p class="ajuda">Combine o PIN pessoalmente; a pessoa pode trocar depois em “Minha conta”.</p>`}
      <div id="aviso" aria-live="polite"></div>`,
    acoes: `<a class="btn btn-linha" href="/brow-studio/equipe/">Cancelar</a>${p ? `<a class="btn btn-suave" href="/brow-studio/equipe/pin/?id=${encodeURIComponent(p.id)}">Redefinir PIN</a>` : ''}<button type="submit" class="btn btn-cheio" id="salvar">Salvar</button>` });
  $('#corpo').classList.add('fin-compacto');
  let env = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); if (env) return; const er = {};
    const funcao = (form.querySelector('[name=funcao]:checked') || {}).value;
    if (form.nome.value.trim().length < 2) er.nome = 'Informe o nome.';
    if (!funcao) er.funcao = 'Escolha a função.';
    if (!p) { if (!/^\d{6}$/.test(form.pin.value)) er.pin = 'O PIN tem 6 números.'; else if (form.pin.value !== form.pin2.value) er.pin2 = 'Os PINs não conferem.'; }
    if (!mostrarErros(form, er)) return;
    env = true; $('#salvar').disabled = true;
    const r = await api('eq_salvar', { corpo: { id: p ? p.id : undefined, nome: form.nome.value, funcao, profissional_id: form.profissional_id.value || null, ativo: p ? form.ativo.checked : true, pin: p ? undefined : form.pin.value, pin2: p ? undefined : form.pin2.value } });
    if (r.ok) { recado.pôr(p ? 'Acesso atualizado.' : 'Pessoa cadastrada.'); location.replace('/brow-studio/equipe/'); return; }
    env = false; $('#salvar').disabled = false; if (r.erros) mostrarErros(form, r.erros);
    $('#aviso').innerHTML = avisoHTML(esc(r.erros ? Object.values(r.erros).join(' ') : r.msg), 'erro');
  };
  focarTitulo();
}
async function telaRedefinirPin() {
  const id = params.get('id'); const lst = await api('eq_listar');
  const p = lst.ok ? lst.itens.find(x => x.id === id) : null;
  if (!p) return pagina({ titulo: 'Redefinir PIN', voltar: '/brow-studio/equipe/', corpo: avisoHTML(esc(lst.msg || 'Pessoa não encontrada.'), 'erro') });
  const form = pagina({ titulo: 'Redefinir PIN', voltar: `/brow-studio/equipe/pessoa/?id=${encodeURIComponent(id)}`, voltarTexto: 'Voltar', formulario: true,
    corpo: `<div class="bloco"><h2>${esc(p.nome)}</h2><p class="ajuda">${esc(p.funcao_nome)}</p></div><div class="duas-colunas">${campoPin('pin', 'Novo PIN')}${campoPin('pin2', 'Repita o PIN')}</div>
      <p class="ajuda">Desbloqueia o acesso e desconecta os aparelhos dela. Combine o novo PIN pessoalmente.</p><div id="aviso" aria-live="polite"></div>`,
    acoes: `<a class="btn btn-linha" href="/brow-studio/equipe/pessoa/?id=${encodeURIComponent(id)}">Cancelar</a><button type="submit" class="btn btn-cheio" id="salvar">Redefinir</button>` });
  let env = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); if (env) return; const er = {};
    if (!/^\d{6}$/.test(form.pin.value)) er.pin = 'O PIN tem 6 números.'; else if (form.pin.value !== form.pin2.value) er.pin2 = 'Os PINs não conferem.';
    if (!mostrarErros(form, er)) return;
    env = true; $('#salvar').disabled = true;
    const r = await api('eq_pin', { corpo: { id, pin: form.pin.value, pin2: form.pin2.value } });
    if (r.ok) { recado.pôr(`PIN de ${p.nome} redefinido.`); location.replace('/brow-studio/equipe/'); return; }
    env = false; $('#salvar').disabled = false; if (r.erros) mostrarErros(form, r.erros);
    $('#aviso').innerHTML = avisoHTML(esc(r.erros ? Object.values(r.erros).join(' ') : r.msg), 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ MENU DA PROFISSIONAL ══════════════════════════
// (profissional.html) exige sessão, mostra quem está logada e esconde o que é só da dona
async function menu() {
  const r = await api('au_eu');   // sem sessão → api() leva para /entrar
  if (!r.ok) return;
  const u = r.usuario; const msg = recado.tirar();
  const caixa = document.getElementById('sessao');
  if (caixa) caixa.innerHTML = `${msg ? `<span class="aviso-caixa ok">${esc(msg)}</span>` : ''}<span>Olá, <strong>${esc(u.nome)}</strong> · ${esc(u.funcao_nome)}</span> <a href="/brow-studio/conta/">Minha conta</a>`;
  if (u.funcao !== 'dona') document.querySelectorAll('[data-so-dona]').forEach(a => a.remove());
}

// ─── botão "Instalar no tablet" (Android/Chrome) e instrução para iPad/iPhone ──
let pedidoInstalacao = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedidoInstalacao = e; mostrarInstalar(); });
window.addEventListener('appinstalled', () => { const c = document.getElementById('instalar'); if (c) c.innerHTML = '<span class="ajuda">App instalado. Abra pelo ícone “Brow Studio”.</span>'; });
function mostrarInstalar() {
  const c = document.getElementById('instalar'); if (!c) return;
  const instalado = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (instalado) { c.innerHTML = ''; return; }
  if (pedidoInstalacao) {
    c.innerHTML = '<button type="button" class="btn btn-suave" id="btn-instalar">Instalar no tablet</button>';
    document.getElementById('btn-instalar').onclick = async () => { pedidoInstalacao.prompt(); const r = await pedidoInstalacao.userChoice; pedidoInstalacao = null; if (r.outcome !== 'accepted') mostrarInstalar(); else c.innerHTML = '<span class="ajuda">Instalando…</span>'; };
    return;
  }
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  c.innerHTML = ios ? '<span class="ajuda">Para instalar: toque em <strong>Compartilhar</strong> (quadrado com seta) e depois em <strong>Adicionar à Tela de Início</strong>.</span>'
    : '<span class="ajuda">Para instalar: no menu do navegador (⋮), toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</span>';
}
if (document.body.dataset.pagina === 'menu') window.addEventListener('load', () => setTimeout(mostrarInstalar, 1200));

const TELAS = { entrar: telaEntrar, primeira: telaPrimeira, conta: telaConta, 'trocar-pin': telaTrocarPin, equipe: telaEquipe, pessoa: telaPessoa, 'redefinir-pin': telaRedefinirPin, menu };
(TELAS[document.body.dataset.pagina] || telaEntrar)();
