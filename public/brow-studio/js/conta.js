// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — ENTRAR, PRIMEIRA CONTA, MINHA CONTA E EQUIPE (10/11/2026)
// Login por nome + PIN de 6 dígitos. A sessão fica num cookie HttpOnly
// (o JavaScript não lê o token). Nada de PIN é guardado no navegador.
// ═══════════════════════════════════════════════════════════════════════════
import { $, params, esc, api, SETA, pagina, campoTexto, grupoOpcoes, mostrarErros, avisoHTML, focarTitulo, ir, lerRasc, gravarRasc, apagarRasc, uuid } from './comum.js?v=4';

const app = document.getElementById('app');
const MENU = '/brow-studio/profissional.html';
const voltaSegura = () => { const v = params.get('volta') || ''; return /^\/brow-studio\/[\w\-/.?=&%]*$/.test(v) && !v.startsWith('/brow-studio/entrar') ? v : MENU; };
const recado = { pôr(m) { try { sessionStorage.setItem('brow:recado', m); } catch (e) {} }, tirar() { try { const m = sessionStorage.getItem('brow:recado'); sessionStorage.removeItem('brow:recado'); return m; } catch (e) { return null; } } };
// PIN de entrar: campo de senha comum (o aparelho pode lembrar).
const campoPin = (id, rotulo, ajuda) => campoTexto({ id, rotulo, tipo: 'password', ajuda, attrs: 'inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="current-password" enterkeyhint="go"' });
// PIN NOVO (criar/repetir): o iPhone trata 2 campos de senha seguidos como "senha forte"
// e apaga o 2º campo. Aqui é texto numérico com os dígitos escondidos por CSS.
const campoPinNovo = (id, rotulo, ajuda) => campoTexto({ id, rotulo, tipo: 'text', ajuda, attrs: 'class="pin-oculto" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-1p-ignore data-lpignore="true"' });
const FUNCOES = { dona: 'Dona (vê tudo, inclusive financeiro)', profissional: 'Profissional (atendimento, sem financeiro)' };

// ═══════════════════════════ ENTRAR ════════════════════════════════════════
const lerSalao = () => { try { return localStorage.getItem('brow:salao') || ''; } catch (e) { return ''; } };
const gravarSalao = (sl) => { try { if (sl) localStorage.setItem('brow:salao', sl); } catch (e) {} };
const comSalao = (url, sl) => { if (!sl) return url; const u = new URL(url, location.origin); u.searchParams.set('s', sl); return u.pathname + u.search; };
async function telaEntrar() {
  // salão: do endereço (?s=) ou o último usado neste aparelho; sem nenhum, pergunta
  if (!params.get('s')) {
    const ult = lerSalao(); if (ult) return location.replace(comSalao(location.pathname + location.search, ult));
    // já logada (salão original) ou instalação nova do salão original: segue sem perguntar
    const e0 = await api('au_estado');
    if (e0.ok && e0.logado) { gravarSalao(e0.salao.slug); return ir(voltaSegura()); }
    if (e0.ok && !e0.tem_contas && e0.primeira_disponivel) return ir('/brow-studio/entrar/primeira/');
    return telaQualSalao();
  }
  pagina({ titulo: 'Entrar', corpo: avisoHTML('Carregando…') });
  const e = await api('au_estado');
  if (!e.ok && e.erro === 'salao_inexistente') { try { localStorage.removeItem('brow:salao'); } catch (x) {} return telaQualSalao(e.msg); }
  const sl = e.ok && e.salao ? e.salao.slug : params.get('s');
  if (e.ok && e.logado) { gravarSalao(sl); return ir(voltaSegura()); }
  if (e.ok && !e.tem_contas && e.primeira_disponivel) return ir(comSalao('/brow-studio/entrar/primeira/', sl));
  const msg = recado.tirar();
  const form = pagina({ titulo: 'Entrar', voltar: '/brow-studio/', voltarTexto: 'Capa', formulario: true,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}${!e.ok ? avisoHTML(esc(e.msg || 'Não foi possível falar com o servidor.'), 'erro') : ''}
      ${e.ok && e.salao ? `<p class="etapa salao-linha" style="margin-top:-8px">Salão: <strong>${esc(e.salao.nome)}</strong> · <a href="/brow-studio/entrar/?trocar=1" id="trocar">trocar de salão</a></p>` : ''}
      ${campoTexto({ id: 'nome', rotulo: 'Seu nome', attrs: 'autocomplete="username" autocorrect="off" spellcheck="false" autocapitalize="words" maxlength="60"' })}
      ${campoPin('pin', 'PIN (6 números)')}
      <div id="aviso" aria-live="polite"></div>
      <p class="ajuda">Esqueceu o PIN? Peça à dona do salão para redefinir.${sl === 'rychelma' ? ` <a href="${comSalao('/brow-studio/entrar/recuperar/', sl)}">Sou a dona e não consigo entrar</a>` : ''}</p>`,
    acoes: `<button type="submit" class="btn btn-cheio" id="entrar">Entrar</button>` });
  if ($('#trocar')) $('#trocar').onclick = () => { try { localStorage.removeItem('brow:salao'); } catch (x) {} };
  form.nome.focus();
  let env = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); if (env) return; const er = {};
    if (form.nome.value.trim().length < 2) er.nome = 'Informe seu nome.';
    if (!/^\d{6}$/.test(form.pin.value)) er.pin = 'O PIN tem 6 números.';
    if (!mostrarErros(form, er)) return;
    env = true; $('#entrar').disabled = true; $('#entrar').textContent = 'Entrando…';
    const r = await api('au_entrar', { corpo: { nome: form.nome.value, pin: form.pin.value } });
    if (r.ok) { gravarSalao(sl); location.replace(voltaSegura()); return; }
    env = false; $('#entrar').disabled = false; $('#entrar').textContent = 'Entrar'; form.pin.value = ''; form.pin.focus();
    $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível entrar.'), 'erro');
  };
}
// sem salão conhecido: pede o endereço do salão (ex.: o que vem depois de ?s= no link)
function telaQualSalao(aviso) {
  const form = pagina({ titulo: 'Entrar', voltar: '/brow-studio/', voltarTexto: 'Capa', formulario: true,
    corpo: `${aviso ? avisoHTML(esc(aviso), 'erro') : ''}
      ${campoTexto({ id: 'slug', rotulo: 'Endereço do seu salão', attrs: 'autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" maxlength="40"', ajuda: 'É o nome curto do salão, sem espaços (a dona recebe ao criar o salão).' })}
      <div id="aviso" aria-live="polite"></div>
      <p class="ajuda">Ainda não tem salão no Brow Studio? <a href="/brow-studio/criar-salao/">Criar meu salão</a></p>`,
    acoes: `<button type="submit" class="btn btn-cheio" id="continuar">Continuar</button>` });
  form.slug.focus();
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const v = form.slug.value.trim().toLowerCase().replace(/^.*[?&]s=/, '').replace(/[^a-z0-9-]/g, '');
    if (v.length < 3) return mostrarErros(form, { slug: 'Informe o endereço do salão.' });
    const r = await api('sl_ver', { query: { s: v } });
    if (!r.ok) return mostrarErros(form, { slug: r.msg || 'Salão não encontrado.' });
    location.replace(comSalao(location.pathname + location.search.replace(/[?&]trocar=1/, ''), r.salao.slug));
  };
  focarTitulo();
}
async function telaPrimeira() {
  pagina({ titulo: 'Primeira configuração', corpo: avisoHTML('Carregando…') });
  const e = await api('au_estado');
  if (e.ok && (e.tem_contas || !e.primeira_disponivel)) return ir(comSalao('/brow-studio/entrar/', params.get('s')));
  const form = pagina({ titulo: 'Primeira configuração', voltar: '/brow-studio/', voltarTexto: 'Capa', formulario: true,
    corpo: `<p class="etapa" style="margin-top:-8px">Criar a conta da dona do estúdio</p>
      ${e.ok && !e.codigo_configurado ? avisoHTML('Falta configurar o código inicial no servidor (variável <strong>BROW_CODIGO_INICIAL</strong> na Vercel).', 'erro') : ''}
      ${campoTexto({ id: 'codigo', rotulo: 'Código inicial', attrs: 'autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" maxlength="200"', ajuda: 'O código de primeiro acesso que você recebeu.' })}
      ${campoTexto({ id: 'nome', rotulo: 'Seu nome', attrs: 'autocomplete="username" autocorrect="off" spellcheck="false" autocapitalize="words" maxlength="60"', ajuda: 'É o nome que você vai digitar para entrar.' })}
      <div class="duas-colunas">${campoPinNovo('pin', 'Crie um PIN')}${campoPinNovo('pin2', 'Repita o PIN')}</div>
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

// Recuperação da dona com o código de primeiro acesso (uso único)
function telaRecuperar() {
  const form = pagina({ titulo: 'Recuperar acesso', voltar: '/brow-studio/entrar/', voltarTexto: 'Entrar', formulario: true,
    corpo: `<p class="etapa" style="margin-top:-8px">Só para a dona, com o código de primeiro acesso. Funciona uma única vez.</p>
      ${campoTexto({ id: 'codigo', rotulo: 'Código de primeiro acesso', attrs: 'autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" maxlength="200"' })}
      ${campoTexto({ id: 'nome', rotulo: 'Seu nome para entrar', attrs: 'autocomplete="username" autocorrect="off" spellcheck="false" autocapitalize="words" maxlength="60"' })}
      <div class="duas-colunas">${campoPinNovo('pin', 'Novo PIN')}${campoPinNovo('pin2', 'Repita o PIN')}</div>
      <div id="aviso" aria-live="polite"></div>`,
    acoes: `<a class="btn btn-linha" href="/brow-studio/entrar/">Cancelar</a><button type="submit" class="btn btn-cheio" id="salvar">Recuperar acesso</button>` });
  $('#corpo').classList.add('fin-compacto');
  let env = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); if (env) return; const er = {};
    if (!form.codigo.value.trim()) er.codigo = 'Informe o código.';
    if (form.nome.value.trim().length < 2) er.nome = 'Informe seu nome.';
    if (!/^\d{6}$/.test(form.pin.value)) er.pin = 'O PIN tem 6 números.'; else if (form.pin.value !== form.pin2.value) er.pin2 = 'Os PINs não conferem.';
    if (!mostrarErros(form, er)) return;
    env = true; $('#salvar').disabled = true;
    const r = await api('au_recuperar', { corpo: { codigo: form.codigo.value, nome: form.nome.value, pin: form.pin.value, pin2: form.pin2.value } });
    if (r.ok) { recado.pôr(`Acesso recuperado. Bem-vinda, ${r.usuario.nome}!`); location.replace(MENU); return; }
    env = false; $('#salvar').disabled = false; if (r.erros) mostrarErros(form, r.erros);
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
      <nav class="acoes-grade" aria-label="Conta">${r.teste_local ? '' : '<a class="btn btn-suave" href="/brow-studio/conta/pin/">Trocar meu PIN</a>'}${u.funcao === 'dona' ? '<a class="btn btn-suave" href="/brow-studio/equipe/">Equipe e acessos</a><a class="btn btn-suave" href="/brow-studio/agenda/configuracoes/salao/">Meu salão</a>' : ''}
        <button type="button" class="btn btn-cheio" id="sair">Sair</button><button type="button" class="btn btn-linha" id="sair-todos">Sair de todos os aparelhos</button></nav><div id="aviso"></div>` });
  const sair = async (todos) => { const rr = await api('au_sair', { corpo: { todos } }); if (rr.ok) { recado.pôr(todos ? 'Você saiu de todos os aparelhos.' : 'Você saiu.'); location.replace('/brow-studio/entrar/'); } else $('#aviso').innerHTML = avisoHTML(esc(rr.msg), 'erro'); };
  $('#sair').onclick = () => sair(false); $('#sair-todos').onclick = () => sair(true);
  focarTitulo();
}
async function telaTrocarPin() {
  const form = pagina({ titulo: 'Trocar meu PIN', voltar: '/brow-studio/conta/', voltarTexto: 'Minha conta', formulario: true,
    corpo: `${campoPin('atual', 'PIN atual')}<div class="duas-colunas">${campoPinNovo('novo', 'Novo PIN')}${campoPinNovo('novo2', 'Repita o novo PIN')}</div>
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
        : `<div class="duas-colunas">${campoPinNovo('pin', 'PIN inicial')}${campoPinNovo('pin2', 'Repita o PIN')}</div><p class="ajuda">Combine o PIN pessoalmente; a pessoa pode trocar depois em “Minha conta”.</p>`}
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
    corpo: `<div class="bloco"><h2>${esc(p.nome)}</h2><p class="ajuda">${esc(p.funcao_nome)}</p></div><div class="duas-colunas">${campoPinNovo('pin', 'Novo PIN')}${campoPinNovo('pin2', 'Repita o PIN')}</div>
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
  if (r.salao && r.salao.slug) gravarSalao(r.salao.slug);
  const caixa = document.getElementById('sessao');
  if (caixa) caixa.innerHTML = `${msg ? `<span class="aviso-caixa ok">${esc(msg)}</span>` : ''}<span>Olá, <strong>${esc(u.nome)}</strong> · ${esc(u.funcao_nome)}${r.salao ? ` · <span class="salao-nome">${esc(r.salao.nome)}</span>` : ''}</span> <a href="/brow-studio/conta/">Minha conta</a>`;
  if (u.funcao !== 'dona') document.querySelectorAll('[data-so-dona]').forEach(a => a.remove());
  // pedidos do agendamento online ainda não confirmados
  const pend = await api('ag_online_pendentes');
  if (pend.ok && pend.pendentes && caixa) caixa.insertAdjacentHTML('afterend', `<p class="aviso-online"><a href="/brow-studio/agenda/">${pend.pendentes} pedido(s) online para confirmar</a></p>`);
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

// ═══════════════════════════ CRIAR MEU SALÃO (público, em etapas) ══════════
// Rascunho na aba (sem PIN). Etapas: 1 nome do salão · 2 endereço · 3 você, PIN e conferência.
const RC = 'criar-salao', CS = '/brow-studio/criar-salao/';
const sugerirSlug = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30).replace(/-+$/, '');
async function telaCriarSalao() {
  const d = lerRasc(RC) || {}; const e = Number(params.get('e')) || 1;
  if (e > 1 && !d.nome_salao) return ir(CS);
  if (e > 2 && !d.slug) return ir(CS + '?e=2');
  if (e === 1) {
    const form = pagina({ titulo: 'Criar meu salão', voltar: '/brow-studio/', voltarTexto: 'Capa', etapa: 1, etapasTotal: 3, formulario: true,
      corpo: `<p class="ajuda">Grátis. Os dados do seu salão ficam separados dos outros salões.</p>
        ${campoTexto({ id: 'nome_salao', rotulo: 'Nome do salão', valor: d.nome_salao || '', attrs: 'autocomplete="organization" autocorrect="off" spellcheck="false" maxlength="80"' })}
        <p class="ajuda">Já tem salão? <a href="/brow-studio/entrar/">Entrar</a></p>`,
      acoes: `<button type="submit" class="btn btn-cheio">Continuar</button>` });
    form.nome_salao.focus();
    form.onsubmit = (ev) => { ev.preventDefault(); const v = form.nome_salao.value.replace(/\s+/g, ' ').trim();
      if (v.length < 3) return mostrarErros(form, { nome_salao: 'Informe o nome do salão.' });
      if (v !== d.nome_salao) d.slug = ''; d.nome_salao = v; gravarRasc(RC, d); ir(CS + '?e=2'); };
    return focarTitulo();
  }
  if (e === 2) {
    const form = pagina({ titulo: 'Endereço do salão', voltar: CS, voltarTexto: 'Voltar', etapa: 2, etapasTotal: 3, formulario: true,
      corpo: `${campoTexto({ id: 'slug', rotulo: 'Endereço (nome curto, sem espaços)', valor: d.slug || sugerirSlug(d.nome_salao), attrs: 'autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" maxlength="30"', ajuda: 'Letras minúsculas, números e hífen. É usado nos links de entrar e de agendar.' })}
        <p class="ajuda link-quebra">Link de agendamento: <strong id="previa"></strong></p>
        <div id="verif" aria-live="polite"></div>`,
      acoes: `<a class="btn btn-linha" href="${CS}">Voltar</a><button type="submit" class="btn btn-cheio" id="continuar">Continuar</button>` });
    let ultimo = null, tempo = null;
    const verificar = async () => {
      const v = sugerirSlug(form.slug.value); $('#previa').textContent = `${location.origin}/brow-studio/agendar/?s=${v}`;
      const r = await api('sl_verificar', { query: { slug: v } }); ultimo = r;
      if (sugerirSlug(form.slug.value) !== v) return r;
      $('#verif').innerHTML = !r.ok ? avisoHTML(esc(r.msg || 'Não foi possível verificar.'), 'erro') : r.disponivel ? avisoHTML(`Disponível: <strong>${esc(r.slug)}</strong>`, 'ok') : avisoHTML(esc(r.motivo), 'erro');
      return r;
    };
    form.slug.oninput = () => { clearTimeout(tempo); ultimo = null; tempo = setTimeout(verificar, 350); };
    verificar(); form.slug.focus();
    form.onsubmit = async (ev) => { ev.preventDefault(); const r = ultimo && ultimo.slug === sugerirSlug(form.slug.value) ? ultimo : await verificar();
      if (!r.ok) return; if (!r.disponivel) return mostrarErros(form, { slug: r.motivo });
      d.slug = r.slug; gravarRasc(RC, d); ir(CS + '?e=3'); };
    return focarTitulo();
  }
  const form = pagina({ titulo: 'Sua conta de dona', voltar: CS + '?e=2', voltarTexto: 'Voltar', etapa: 3, etapasTotal: 3, formulario: true,
    corpo: `<div class="campo"><span class="rotulo-campo">Conferência</span><p>Salão: <strong>${esc(d.nome_salao)}</strong><br>Endereço: <strong>${esc(d.slug)}</strong> <a href="${CS}?e=2">alterar</a></p></div>
      ${campoTexto({ id: 'nome', rotulo: 'Seu nome', valor: d.nome || '', attrs: 'autocomplete="name" autocorrect="off" spellcheck="false" autocapitalize="words" maxlength="60"', ajuda: 'É o nome que você vai digitar para entrar.' })}
      <div class="duas-colunas">${campoPinNovo('pin', 'Crie um PIN (6 números)')}${campoPinNovo('pin2', 'Repita o PIN')}</div>
      <p class="ajuda">Evite datas de nascimento, 123456 ou números repetidos. Guarde o PIN: não há recuperação por e-mail.</p>
      <div class="isca" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"><label for="site">Site</label><input id="site" name="site" tabindex="-1" autocomplete="off"></div>
      <label class="chave"><input type="checkbox" name="aceite"><span>Li e aceito os <a href="/brow-studio/termos/" target="_blank" rel="noopener">termos</a> e a <a href="/brow-studio/privacidade.html" target="_blank" rel="noopener">privacidade</a></span></label><span class="erro" id="aceite-erro"></span>
      <div id="aviso" aria-live="polite"></div>`,
    acoes: `<a class="btn btn-linha" href="${CS}?e=2">Voltar</a><button type="submit" class="btn btn-cheio" id="criar">Criar salão</button>` });
  $('#corpo').classList.add('fin-compacto');
  form.nome.oninput = () => { d.nome = form.nome.value; gravarRasc(RC, d); };
  if (!d.chave_envio) { d.chave_envio = uuid(); gravarRasc(RC, d); }
  let env = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); if (env) return; const er = {};
    if (form.nome.value.trim().length < 2) er.nome = 'Informe seu nome.';
    if (!/^\d{6}$/.test(form.pin.value)) er.pin = 'O PIN tem 6 números.'; else if (form.pin.value !== form.pin2.value) er.pin2 = 'Os PINs não conferem.';
    if (!form.aceite.checked) er.aceite = 'É preciso aceitar para continuar.';
    if (!mostrarErros(form, er)) return;
    env = true; $('#criar').disabled = true; $('#criar').textContent = 'Criando…';
    const r = await api('sl_criar', { corpo: { nome_salao: d.nome_salao, slug: d.slug, nome: form.nome.value, pin: form.pin.value, pin2: form.pin2.value, aceite: true, site: form.site.value, chave_envio: d.chave_envio } });
    if (r.ok && r.repetido) { apagarRasc(RC); gravarSalao(r.salao.slug); location.replace(comSalao('/brow-studio/entrar/', r.salao.slug)); return; }
    if (r.ok) { apagarRasc(RC); gravarSalao(r.salao.slug); recado.pôr(`Salão criado. Bem-vinda, ${r.usuario.nome}!`); location.replace(MENU); return; }
    env = false; $('#criar').disabled = false; $('#criar').textContent = 'Criar salão';
    if (r.erros && r.erros.slug) { d.slug = ''; gravarRasc(RC, d); }
    if (r.erros) mostrarErros(form, r.erros);
    $('#aviso').innerHTML = avisoHTML(esc(r.erros ? Object.values(r.erros).join(' ') : (r.msg || 'Não foi possível criar o salão.')), 'erro');
    if (r.erros && r.erros.slug) $('#aviso').insertAdjacentHTML('beforeend', `<p><a href="${CS}?e=2">Escolher outro endereço</a></p>`);
  };
  focarTitulo();
}

// ═══════════════════════════ MEU SALÃO (só a dona) ═════════════════════════
async function telaMeuSalao() {
  const V = '/brow-studio/agenda/configuracoes/';
  const r = await api('au_eu'); if (!r.ok) return;
  if (r.usuario.funcao !== 'dona') return pagina({ titulo: 'Meu salão', voltar: V, voltarTexto: 'Configurações', corpo: avisoHTML('Somente a dona vê esta página.', 'erro') });
  const sl = r.salao || {}; const o = location.origin;
  const lEntrar = `${o}/brow-studio/entrar/?s=${sl.slug}`, lAgendar = `${o}/brow-studio/agendar/?s=${sl.slug}`;
  const linha = (rot, v, aj) => `<div class="campo"><span class="rotulo-campo">${rot}</span><div class="pessoa-escolha"><strong class="link-quebra">${esc(v)}</strong><button type="button" class="btn btn-suave" data-copiar="${esc(v)}">Copiar</button></div>${aj ? `<span class="ajuda">${aj}</span>` : ''}</div>`;
  pagina({ titulo: 'Meu salão', voltar: V, voltarTexto: 'Configurações',
    corpo: `<div class="campo"><span class="rotulo-campo">Nome</span><p><strong>${esc(sl.nome || '')}</strong></p></div>
      <div class="campo"><span class="rotulo-campo">Endereço</span><p><strong>${esc(sl.slug || '')}</strong></p></div>
      ${linha('Link para a equipe entrar', lEntrar, 'Envie para as profissionais do salão.')}
      ${linha('Link de agendamento para as clientes', lAgendar, 'Ligue o agendamento online em Configurações → Agendamento online.')}` });
  gravarSalao(sl.slug);
  app.querySelectorAll('[data-copiar]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copiar); b.textContent = 'Copiado'; } catch (e) { b.textContent = 'Copie manualmente'; } setTimeout(() => { b.textContent = 'Copiar'; }, 2000); });
  focarTitulo();
}

const TELAS = { entrar: telaEntrar, primeira: telaPrimeira, recuperar: telaRecuperar, conta: telaConta, 'trocar-pin': telaTrocarPin, equipe: telaEquipe, pessoa: telaPessoa, 'redefinir-pin': telaRedefinirPin, menu, 'criar-salao': telaCriarSalao, 'meu-salao': telaMeuSalao };
(TELAS[document.body.dataset.pagina] || telaEntrar)();
