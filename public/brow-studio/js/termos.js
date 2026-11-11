// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — TERMOS E AUTORIZAÇÕES (10/11/2026)
// Cada página tem rota própria (<body data-pagina="...">). Peças comuns em comum.js.
// Rascunho entre etapas: sessionStorage "tm:novo" ou "tm:<id>" (só nesta aba).
// O servidor decide o que vale: texto de DEMONSTRAÇÃO não finaliza, e a
// assinatura só vale para o conjunto exato de escolhas (assinatura_ref).
// ═══════════════════════════════════════════════════════════════════════════
import { $, params, esc, uuid, lerRasc, gravarRasc, apagarRasc, api, SETA, pagina, campoTexto, grupoOpcoes,
  mostrarErros, avisoHTML, focarTitulo, ir, blocoResumo } from './comum.js?v=2';

const BASE = '/brow-studio/termos/';
const D = BASE + 'doc/';
const DECISAO = { prosseguir: 'Deseja prosseguir', nao_prosseguir: 'Não deseja prosseguir' };
const DEC_IMG = { autoriza: 'Autoriza a divulgação', nao_autoriza: 'Não autoriza a divulgação' };
const CANAIS = { instagram: 'Instagram do estúdio', portfolio: 'Portfólio do estúdio' };
const MODAL = { desenhada: 'Assinatura desenhada', aceite_identificado: 'Aceite identificado (sem desenho)', recusa_sem_assinatura: 'Registrar recusa sem assinatura' };
const PAG_ETAPA = { cliente: '', atendimento: 'atendimento/', procedimento: 'procedimento/', leitura: 'leitura/', decisao: 'decisao/', imagem: 'imagem/', 'imagem-escolha': 'imagem/escolha/', assinatura: 'assinatura/', conferencia: 'conferencia/' };
const HIST = { criado: 'Documento iniciado', pendente_salvo: 'Salvo como pendente', finalizado: 'Finalizado', criado_como_correcao: 'Criado como correção (nova versão)', correcao_iniciada: 'Correção iniciada em nova versão', imagem_retirada: 'Autorização de imagem retirada', pdf_gerado: 'Cópia em PDF gerada' };
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const dataCurta = (iso) => { if (!iso) return 'Sem data'; const [a, m, d] = iso.split('-'); return `${d} ${MESES[+m - 1]} ${a}`; };
const dataHora = (t) => t ? new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const recado = { pôr(m) { try { sessionStorage.setItem('brow:recado', m); } catch (e) {} }, tirar() { try { const m = sessionStorage.getItem('brow:recado'); sessionStorage.removeItem('brow:recado'); return m; } catch (e) { return null; } } };
const carregando = (t) => pagina({ titulo: t, corpo: avisoHTML('Carregando…') });
function telaErro(titulo, msg, voltar = BASE, vt = 'Termos') { pagina({ titulo, voltar, voltarTexto: vt, corpo: avisoHTML(esc(msg), 'erro'), acoes: `<a class="btn btn-cheio" href="${voltar}">Voltar</a>` }); focarTitulo(); }
function cabem(el, altura, abaixo = 82, min = 2) { const topo = el.getBoundingClientRect().top + window.scrollY; return Math.max(min, Math.min(14, Math.floor((window.innerHeight - topo - abaixo + 10) / (altura + 10)))); }
function navPaginas(id, rotuloAnt = 'Anterior', rotuloProx = 'Próxima') {
  return `<nav class="paginacao" id="${id}" aria-label="Páginas" hidden><button type="button" class="btn btn-linha" data-ir="-1" aria-label="Página anterior">${SETA} ${rotuloAnt}</button>
    <span class="pag-info" aria-live="polite"></span><button type="button" class="btn btn-linha" data-ir="1" aria-label="Próxima página">${rotuloProx} <span aria-hidden="true">→</span></button></nav>`;
}
function ligarNav(nav, { pagina: p, paginas, total, rotulo }, mudar) {
  nav.hidden = paginas <= 1;
  nav.querySelector('.pag-info').innerHTML = `<strong>${p}</strong> de ${paginas}${rotulo ? `<span class="pag-total"> · ${total} ${rotulo}</span>` : ''}`;
  const [a, z] = nav.querySelectorAll('[data-ir]'); a.disabled = p <= 1; z.disabled = p >= paginas;
  a.onclick = () => mudar(p - 1); z.onclick = () => mudar(p + 1);
}
const passou = () => document.documentElement.scrollHeight > window.innerHeight + 1;
const seloSit = (t) => { const n = t.situacao_nome || (t.situacao === 'pendente' ? 'Pendente' : t.decisao === 'prosseguir' ? 'Aceito' : 'Recusado'); const cls = n === 'Aceito' ? 'selo-ativo' : n === 'Recusado' ? 'selo-cancelado' : 'selo-agendado'; return `<span class="selo ${cls}">${n}</span>`; };

// Divide um texto longo em páginas que cabem na tela (por parágrafos; parágrafo grande é quebrado por frases/palavras).
function paginarTexto(texto, caracteres) {
  const pags = []; let atual = '';
  const blocos = String(texto || '').split(/\n\s*\n/).flatMap(par => {
    if (par.length <= caracteres) return [par];
    const out = []; let b = '';
    for (const fr of par.split(/(?<=[.;:!?])\s+/)) {
      if ((b + ' ' + fr).length > caracteres && b) { out.push(b); b = fr; }
      else b = b ? b + ' ' + fr : fr;
      while (b.length > caracteres) { const i = b.lastIndexOf(' ', caracteres); out.push(b.slice(0, i > 0 ? i : caracteres)); b = b.slice(i > 0 ? i + 1 : caracteres); }
    }
    if (b) out.push(b);
    return out;
  });
  for (const bl of blocos) {
    if ((atual + '\n\n' + bl).length > caracteres && atual) { pags.push(atual); atual = bl; }
    else atual = atual ? atual + '\n\n' + bl : bl;
  }
  if (atual) pags.push(atual);
  return pags.length ? pags : [''];
}
function caracteresPorPagina(el, reservaAbaixo) {
  const topo = el.getBoundingClientRect().top + window.scrollY;
  const alt = Math.max(160, window.innerHeight - topo - reservaAbaixo);
  const fs = parseFloat(getComputedStyle(el).fontSize) || 18;
  const linhas = Math.floor(alt / (fs * 1.6));
  const porLinha = Math.floor(el.clientWidth / (fs * 0.55));
  return Math.max(200, Math.floor(linhas * porLinha * 0.82));
}
// Pagina o texto e confere na tela: se a página mais longa passar da altura, diminui o tamanho e pagina de novo.
function encaixarTexto(el, texto, reserva, desenhar) {
  let limite = caracteresPorPagina(el, reserva), pags;
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    pags = paginarTexto(texto, limite);
    const maior = pags.reduce((a, b) => (b.length > a.length ? b : a), '');
    el.innerHTML = paragrafos(maior);
    const nav = document.querySelector('#nav'); if (nav) nav.hidden = pags.length <= 1;
    if (document.documentElement.scrollHeight <= window.innerHeight + 1 || limite <= 220) break;
    limite = Math.floor(limite * 0.85);
  }
  desenhar(pags);
  return pags;
}
const paragrafos = (t) => esc(t).split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

// ─── rascunho ───────────────────────────────────────────────────────────────
const docId = () => params.get('id') || '';
const chave = () => docId() ? 'tm:' + docId() : 'tm:novo';
const qs = (semConf) => { const p = new URLSearchParams(); if (docId()) p.set('id', docId()); if (!semConf && params.get('conf') === '1') p.set('conf', '1'); const s = p.toString(); return s ? '?' + s : ''; };
const vazio = () => ({ chave_envio: uuid(), cliente_id: null, cliente_nome: '', agendamento_id: null, agendamento_rotulo: '', servico_id: null, servico_nome: '', profissional_id: null, profissional_nome: '', data: '',
  texto_proc: null, texto_img: null, leu_proc: false, leu_img: false, decisao: null, imagem_decisao: null, imagem_canais: [], imagem_finalidade: '',
  assinante_nome: '', modalidade: null, assinatura: null, assinatura_apagada: null, nome_confirmado: '', assinatura_ref: null });
const ler = () => lerRasc(chave());
const guardar = (m) => { const d = { ...ler(), ...m }; gravarRasc(chave(), d); return d; };
function deTermo(t) {
  return { ...vazio(), chave_envio: null, cliente_id: t.cliente_id, cliente_nome: t.cliente_nome, agendamento_id: t.agendamento_id, servico_id: t.servico_id, servico_nome: t.servico_nome || '',
    profissional_id: t.profissional_id, profissional_nome: t.profissional_nome || '', data: t.data || '', decisao: t.decisao, imagem_decisao: t.imagem_decisao,
    imagem_canais: t.imagem_canais || [], imagem_finalidade: t.imagem_finalidade || '', assinante_nome: t.assinante_nome || '', modalidade: t.modalidade };
}
// mesmo texto canônico do servidor (api/_lib/brow-termos.js → textoAssinado)
function textoAssinado(d) {
  const canais = [...new Set((d.imagem_canais || []).filter(x => CANAIS[x]))].sort();
  return JSON.stringify([d.texto_proc ? d.texto_proc.id : '', d.texto_proc ? d.texto_proc.versao : '', d.decisao || '', d.texto_img ? d.texto_img.id : '', d.texto_img ? d.texto_img.versao : '',
    d.imagem_decisao || '', d.imagem_decisao === 'autoriza' ? canais : [], d.imagem_decisao === 'autoriza' ? (d.imagem_finalidade || '').trim() : '', (d.assinante_nome || '').trim(), d.modalidade || '']);
}
async function sha256(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function assinaturaValida(d) { return !!d.assinatura_ref && d.assinatura_ref === await sha256(textoAssinado(d)); }
async function salvar(etapa, finalizar) {
  const d = ler();
  let jpeg = null;
  if (finalizar && d.modalidade === 'desenhada' && d.assinatura) jpeg = await paraJpeg(d.assinatura);
  return api('tm_salvar', { corpo: { id: docId() || undefined, chave_envio: docId() ? undefined : d.chave_envio, cliente_id: d.cliente_id, servico_id: d.servico_id, profissional_id: d.profissional_id,
    data: d.data || null, agendamento_id: d.agendamento_id || null, texto_proc_id: d.leu_proc && d.texto_proc ? d.texto_proc.id : null, texto_img_id: d.leu_img && d.texto_img ? d.texto_img.id : null,
    decisao: d.decisao, imagem_decisao: d.imagem_decisao, imagem_canais: d.imagem_canais, imagem_finalidade: d.imagem_finalidade, assinante_nome: d.assinante_nome, modalidade: d.modalidade,
    nome_confirmado: d.nome_confirmado, assinatura: jpeg, assinatura_ref: d.assinatura_ref, etapa_atual: etapa, finalizar: !!finalizar } });
}
function paraJpeg(png) {
  return new Promise((ok) => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(i, 0, 0); ok(c.toDataURL('image/jpeg', 0.85)); }; i.onerror = () => ok(null); i.src = png; });
}
const botaoPendente = '<button type="button" class="btn btn-suave btn-rascunho" id="pendente">Salvar pendente e sair</button>';
function ligarPendente(etapa, antes) {
  const b = $('#pendente'); if (!b) return;
  let env = false;
  b.onclick = async () => {
    if (env) return; if (antes) antes();
    if (!ler().cliente_id) { $('#aviso').innerHTML = avisoHTML('Escolha a cliente antes de salvar.', 'erro'); return; }
    env = true; b.disabled = true; b.textContent = 'Salvando…';
    const r = await salvar(etapa, false);
    if (r.ok) { apagarRasc(chave()); recado.pôr('Documento salvo como pendente. Você pode continuar depois.'); location.replace(`${BASE}ver/?id=${encodeURIComponent(r.id)}`); return; }
    env = false; b.disabled = false; b.textContent = 'Salvar pendente e sair';
    $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível salvar.') + '<br><small>Os dados continuam aqui.</small>', 'erro');
  };
}
function rodape(voltar, proxTexto) {
  const conf = params.get('conf') === '1';
  return `${botaoPendente}<a class="btn btn-linha" href="${voltar}">${SETA} Voltar</a><button type="submit" class="btn btn-cheio" id="prox">${conf ? 'Voltar à conferência' : (proxTexto || 'Próximo <span aria-hidden="true">→</span>')}</button>`;
}
const irProx = (dest) => ir(params.get('conf') === '1' ? D + 'conferencia/' + qs(true) : dest);
const titulo = () => docId() ? 'Termo (continuação)' : 'Novo termo';
const etapaHTML = (t) => `<p class="etapa" style="margin-top:-8px">${t}</p>`;
const avisoDemo = (d) => (d.texto_proc && d.texto_proc.demo) || (d.texto_img && d.texto_img.demo)
  ? avisoHTML('<strong>DEMONSTRAÇÃO:</strong> não há texto aprovado cadastrado. Este documento serve para treino e <strong>não pode ser finalizado</strong>.', 'erro') : '';

// ═══════════════════════════ LISTA ═════════════════════════════════════════
async function telaLista() {
  const cliente = params.get('cliente') || '', agendamento = params.get('agendamento') || '';
  const msg = recado.tirar();
  const rasc = lerRasc('tm:novo');
  let nome = '';
  if (cliente) { const v = await api('ver', { id: cliente }); if (v.ok) nome = v.cliente.nome; }
  const novoHref = `${D}${agendamento ? '?ag=' + encodeURIComponent(agendamento) : cliente ? '?cliente=' + encodeURIComponent(cliente) : ''}`;
  pagina({
    titulo: 'Termos e autorizações', voltar: cliente ? `/brow-studio/clientes/perfil/?id=${encodeURIComponent(cliente)}` : agendamento ? `/brow-studio/agenda/atendimento/?id=${encodeURIComponent(agendamento)}` : '/brow-studio/profissional.html',
    voltarTexto: cliente ? 'Perfil' : agendamento ? 'Atendimento' : 'Voltar',
    extra: `<a class="btn btn-cheio btn-topo" href="${novoHref}" aria-label="Novo termo">+ Novo<span class="so-largo">&nbsp;termo</span></a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}
      ${rasc && rasc.cliente_id ? avisoHTML(`Termo em preenchimento, ainda não salvo: <strong>${esc(rasc.cliente_nome)}</strong>`, 'compacto', `<div class="linha-acoes"><a class="btn btn-cheio" href="${D}">Continuar</a><button type="button" class="btn btn-linha" id="descartar">Descartar</button></div>`) : ''}
      ${cliente ? `<p class="linha-dia">Documentos de <strong>${esc(nome || 'cliente')}</strong> · <a href="${BASE}">ver todos</a></p>` : agendamento ? `<p class="linha-dia">Documentos deste atendimento · <a href="${BASE}">ver todos</a></p>` :
        `<form class="busca" role="search" id="form-busca"><div class="campo"><label for="q">Buscar por cliente</label><input id="q" type="search" autocomplete="off" value="${esc(params.get('q') || '')}"></div></form>`}
      <div id="estado"></div><ul class="lista" id="lista" aria-label="Documentos"></ul>${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${BASE}textos/">Textos dos termos</a>`
  });
  const dd = $('#descartar'); if (dd) dd.onclick = () => { apagarRasc('tm:novo'); dd.closest('.aviso-caixa').remove(); };
  let pg = 1, termo = params.get('q') || '', vez = 0, ajuste = 0;
  async function carregar() {
    const minha = ++vez;
    const lim = ajuste || cabem($('#lista'), window.innerHeight <= 760 ? 72 : 82, 52 + 74 + 20);
    const r = await api('tm_listar', { query: { q: termo, cliente, agendamento, pagina: pg, limite: lim } });
    if (minha !== vez) return;
    if (!r.ok) { $('#estado').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível carregar.'), 'erro'); $('#lista').innerHTML = ''; return; }
    $('#lista').innerHTML = r.total ? r.itens.map(t => `
      <li class="item"><div class="item-info"><div class="item-nome">${esc(t.cliente_nome)}</div>
        <div class="item-extra"><span class="selo-mini">${t.situacao_nome} · </span>${esc(t.servico_nome || 'Procedimento não informado')} · ${dataCurta(t.data)}${t.situacao === 'finalizado' ? ` · <span class="${t.imagem_retirada_em ? 'img-retirada' : ''}">${esc(t.imagem_nome)}</span>` : ''}</div></div>
        <span class="selo-lado">${seloSit(t)}</span>
        <a class="btn btn-linha" href="${BASE}ver/?id=${encodeURIComponent(t.id)}" aria-label="Abrir documento de ${esc(t.cliente_nome)}, ${t.situacao_nome}">Abrir</a></li>`).join('')
      : `<li class="vazio"><span class="avatar grande" aria-hidden="true">✦</span><h2>${termo ? 'Nenhum documento encontrado' : 'Nenhum termo registrado'}</h2><p>${termo ? '' : 'Toque em “Novo termo” para começar.'}</p></li>`;
    ligarNav($('#nav'), { ...r, rotulo: 'documentos' }, (n) => { pg = n; carregar(); });
    if (passou() && lim > 2 && r.itens.length >= lim) { ajuste = lim - 1; carregar(); }
  }
  const q = $('#q');
  if (q) { let e; q.addEventListener('input', (ev) => { clearTimeout(e); e = setTimeout(() => { termo = ev.target.value.trim(); pg = 1; carregar(); }, 300); }); $('#form-busca').onsubmit = (ev) => { ev.preventDefault(); termo = q.value.trim(); pg = 1; carregar(); }; }
  carregar();
}

// ═══════════════════════════ 1. CLIENTE E PROCEDIMENTO ═════════════════════
async function etapaCliente() {
  if (!docId() && params.get('ag')) {
    carregando('Novo termo');
    const a = await api('ag_ver', { id: params.get('ag') });
    if (!a.ok) return telaErro('Novo termo', a.msg || 'Atendimento não encontrado.');
    const x = a.agendamento;
    gravarRasc('tm:novo', { ...vazio(), cliente_id: x.cliente_id, cliente_nome: x.cliente_nome, assinante_nome: x.cliente_nome, agendamento_id: x.id, agendamento_rotulo: `${dataCurta(x.data)}, ${x.inicio} · ${x.servico_nome}`,
      servico_id: x.servico_id, servico_nome: x.servico_nome, profissional_id: x.profissional_id, profissional_nome: x.profissional_nome, data: x.data });
    return location.replace(D + 'procedimento/');
  }
  if (!docId() && params.get('cliente')) {
    const v = await api('ver', { id: params.get('cliente') });
    if (v.ok && (!ler() || ler().cliente_id !== v.cliente.id)) gravarRasc('tm:novo', { ...vazio(), cliente_id: v.cliente.id, cliente_nome: v.cliente.nome, assinante_nome: v.cliente.nome });
    return location.replace(D);
  }
  if (!ler()) gravarRasc(chave(), vazio());
  const form = pagina({
    titulo: titulo(), etapa: 1, etapasTotal: 6, formulario: true, voltar: BASE, voltarTexto: 'Termos',
    corpo: `${etapaHTML('Cliente e procedimento · 1ª parte: cliente')}<div id="escolhida"></div>
      <div id="busca-area"><div class="campo"><label for="q">Buscar cliente cadastrada</label><input id="q" type="search" autocomplete="off" aria-describedby="cliente_id-erro"></div>
        <span class="erro" id="cliente_id-erro" aria-live="polite"></span><ul class="lista lista-compacta" id="lista"></ul>${navPaginas('nav')}</div><div id="aviso"></div>`,
    acoes: `${botaoPendente}<a class="btn btn-linha" href="${BASE}">Cancelar</a><button type="submit" class="btn btn-cheio">Próximo <span aria-hidden="true">→</span></button>`
  });
  const desenhar = () => {
    const x = ler();
    if (!x.cliente_id) { $('#escolhida').innerHTML = ''; $('#busca-area').hidden = false; return; }
    $('#busca-area').hidden = true;
    $('#escolhida').innerHTML = `<div class="bloco cliente-escolhida"><div class="bloco-topo"><h2>${esc(x.cliente_nome)}</h2><button type="button" class="btn btn-linha btn-pequeno" id="trocar">Trocar</button></div><p class="ajuda">Dados vindos do cadastro (nada é duplicado).</p></div>`;
    $('#trocar').onclick = () => { guardar({ cliente_id: null, cliente_nome: '', assinante_nome: '', agendamento_id: null, agendamento_rotulo: '', assinatura_ref: null }); desenhar(); buscar(); };
  };
  let termo = '', pg = 1, vez = 0;
  async function buscar() {
    const minha = ++vez;
    const r = await api('listar', { query: { q: termo, pagina: pg, limite: cabem($('#lista'), 62, 52 + 70 + 20) } });
    if (minha !== vez || !r.ok) return;
    $('#lista').innerHTML = r.total ? r.itens.map(c => `<li class="item item-compacto"><div class="item-info"><div class="item-nome">${esc(c.nome)}</div></div><button type="button" class="btn btn-linha" data-id="${esc(c.id)}" data-nome="${esc(c.nome)}">Escolher</button></li>`).join('')
      : `<li class="vazio vazio-compacto"><p>${termo ? 'Nenhuma cliente encontrada.' : 'Nenhuma cliente cadastrada.'}</p></li>`;
    ligarNav($('#nav'), r, (n) => { pg = n; buscar(); });
    $('#lista').querySelectorAll('[data-id]').forEach(b => b.onclick = () => { guardar({ cliente_id: b.dataset.id, cliente_nome: b.dataset.nome, assinante_nome: b.dataset.nome, agendamento_id: null, agendamento_rotulo: '', assinatura_ref: null }); desenhar(); });
  }
  let e; $('#q').addEventListener('input', (ev) => { clearTimeout(e); e = setTimeout(() => { termo = ev.target.value.trim(); pg = 1; buscar(); }, 300); });
  $('#q').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ev.preventDefault(); });
  desenhar(); if (!ler().cliente_id) buscar();
  ligarPendente('cliente');
  form.onsubmit = (ev) => { ev.preventDefault(); if (!ler().cliente_id) { $('#cliente_id-erro').textContent = 'Escolha a cliente.'; return; } irProx(D + 'atendimento/' + qs()); };
  focarTitulo();
}
async function etapaAtendimento() {
  const d = ler(); if (!d || !d.cliente_id) return ir(D + qs());
  const form = pagina({
    titulo: titulo(), etapa: 1, etapasTotal: 6, formulario: true, voltar: D + qs(), voltarTexto: 'Voltar',
    corpo: `${etapaHTML(`Cliente e procedimento · 2ª parte: atendimento (opcional) · ${esc(d.cliente_nome)}`)}
      <ul class="lista lista-compacta" id="lista" role="radiogroup" aria-label="Atendimentos"></ul>${navPaginas('nav')}<div id="aviso"></div>`,
    acoes: rodape(D + qs())
  });
  let pg = 1;
  async function listar() {
    const r = await api('an_atendimentos', { query: { cliente: d.cliente_id, pagina: pg, limite: cabem($('#lista'), 60, 52 + 70 + 20) - 1 } });
    if (!r.ok) return;
    const atual = ler().agendamento_id || '';
    $('#lista').innerHTML = `<li><label class="opcao opcao-linha"><input type="radio" name="ag" value="" ${atual ? '' : 'checked'}><span><strong>Não vincular a atendimento</strong><small>Informar procedimento, profissional e data na próxima página.</small></span></label></li>` +
      r.itens.map(a => `<li><label class="opcao opcao-linha"><input type="radio" name="ag" value="${esc(a.id)}" ${a.id === atual ? 'checked' : ''}><span><strong>${dataCurta(a.data)}, ${hhmm(a.inicio_min)} · ${esc(a.servico_nome)}</strong><small>${esc(a.profissional_nome)}</small></span></label></li>`).join('');
    $('#lista').querySelectorAll('input').forEach(i => i.onchange = () => {
      const a = r.itens.find(x => x.id === i.value);
      guardar(a ? { agendamento_id: a.id, agendamento_rotulo: `${dataCurta(a.data)}, ${hhmm(a.inicio_min)} · ${a.servico_nome}`, servico_id: a.servico_id, servico_nome: a.servico_nome, profissional_id: a.profissional_id, profissional_nome: a.profissional_nome, data: a.data, leu_proc: ler().servico_id === a.servico_id && ler().leu_proc }
        : { agendamento_id: null, agendamento_rotulo: '' });
    });
    ligarNav($('#nav'), { ...r, rotulo: 'atendimentos' }, (n) => { pg = n; listar(); });
  }
  listar(); ligarPendente('atendimento');
  form.onsubmit = (ev) => { ev.preventDefault(); irProx(D + 'procedimento/' + qs()); };
  focarTitulo();
}
async function etapaProcedimento() {
  const d = ler(); if (!d || !d.cliente_id) return ir(D + qs());
  const cfg = await api('ag_config_ver');
  const profs = cfg.ok ? cfg.profissionais.filter(p => p.ativo || p.id === d.profissional_id) : [];
  const form = pagina({
    titulo: titulo(), etapa: 1, etapasTotal: 6, formulario: true, voltar: D + 'atendimento/' + qs(), voltarTexto: 'Voltar',
    corpo: `${etapaHTML(`Cliente e procedimento · 3ª parte · ${esc(d.cliente_nome)}`)}
      ${d.agendamento_id ? avisoHTML(`Vinculado ao atendimento <strong>${esc(d.agendamento_rotulo || '')}</strong>.`, 'vinculo') : ''}
      ${profs.length ? grupoOpcoes({ nome: 'profissional_id', legenda: 'Profissional', opcoes: Object.fromEntries(profs.map(p => [p.id, p.nome])), valor: d.profissional_id, colunas: 3 }) : avisoHTML('Cadastre uma profissional em Configurações da agenda.', 'erro')}
      ${campoTexto({ id: 'data', rotulo: 'Data', valor: d.data || (cfg.ok ? cfg.hoje : ''), tipo: 'date' })}
      <fieldset class="campo" aria-describedby="servico_id-erro"><legend>Procedimento <span class="opcional" id="escolhido" aria-live="polite">${d.servico_nome ? '— escolhido: ' + esc(d.servico_nome) : ''}</span></legend>
        <ul class="lista lista-compacta" id="lista" role="radiogroup" aria-label="Serviços"></ul><span class="erro" id="servico_id-erro"></span></fieldset>${navPaginas('nav')}<div id="aviso"></div>`,
    acoes: rodape(D + 'atendimento/' + qs())
  });
  const lerForm = () => { const p = form.querySelector('[name=profissional_id]:checked'); return { profissional_id: p ? p.value : ler().profissional_id, profissional_nome: p ? profs.find(x => x.id === p.value).nome : ler().profissional_nome, data: form.data.value }; };
  form.addEventListener('change', (ev) => { if (ev.target.name !== 'servico_id') guardar(lerForm()); });
  let pg = 1;
  async function listar() {
    const r = await api('servicos_listar', { query: { pagina: pg, limite: cabem($('#lista'), 56, 52 + 70 + 40, 1), ativos: '1' } });
    if (!r.ok) return;
    const atual = ler().servico_id;
    $('#lista').innerHTML = r.itens.map(s => `<li><label class="opcao opcao-linha"><input type="radio" name="servico_id" value="${esc(s.id)}" ${s.id === atual ? 'checked' : ''}><span><strong>${esc(s.nome)}</strong><small>${esc(s.categoria_nome)}</small></span></label></li>`).join('') || '<li class="vazio vazio-compacto"><p>Nenhum serviço ativo.</p></li>';
    $('#lista').querySelectorAll('input').forEach(i => i.onchange = () => { const s = r.itens.find(x => x.id === i.value); guardar({ servico_id: s.id, servico_nome: s.nome, texto_proc: null, leu_proc: false, assinatura_ref: null }); $('#escolhido').textContent = '— escolhido: ' + s.nome; });
    ligarNav($('#nav'), { ...r, rotulo: 'serviços' }, (n) => { pg = n; listar(); });
  }
  listar(); ligarPendente('procedimento', () => guardar(lerForm()));
  form.onsubmit = (ev) => {
    ev.preventDefault(); guardar(lerForm()); const x = ler(); const er = {};
    if (!x.servico_id) er.servico_id = 'Escolha o procedimento.';
    if (!x.data) er.data = 'Informe a data.';
    if (profs.length && !x.profissional_id) er.profissional_id = 'Escolha a profissional.';
    if (!mostrarErros(form, er)) return;
    irProx(D + 'leitura/' + qs());
  };
  focarTitulo();
}

// ═══════════════════════════ 2. LEITURA DO TERMO / 4. TEXTO DA IMAGEM ══════
async function etapaLeitura(tipo) {
  const d = ler(); if (!d || !d.servico_id) return ir(D + 'procedimento/' + qs());
  carregando(tipo === 'proc' ? 'Leitura do termo' : 'Autorização de imagem');
  const r = await api('tm_textos_vigentes', { query: { servico_id: d.servico_id } });
  if (!r.ok) return telaErro('Leitura', r.msg);
  const texto = tipo === 'proc' ? r.procedimento : r.imagem;
  const campo = tipo === 'proc' ? 'texto_proc' : 'texto_img';
  const leu = tipo === 'proc' ? 'leu_proc' : 'leu_img';
  // texto diferente do lido antes (nova versão aprovada): precisa ler de novo
  if (!d[campo] || d[campo].id !== texto.id) guardar({ [campo]: texto, [leu]: false });
  const voltar = tipo === 'proc' ? D + 'procedimento/' + qs() : D + 'decisao/' + qs();
  const prox = tipo === 'proc' ? D + 'decisao/' + qs() : D + 'imagem/escolha/' + qs();
  const form = pagina({
    titulo: tipo === 'proc' ? 'Leitura do termo' : 'Autorização de imagem', etapa: tipo === 'proc' ? 2 : 4, etapasTotal: 6, formulario: true, voltar, voltarTexto: 'Voltar',
    corpo: `${texto.demo ? avisoHTML('<strong>DEMONSTRAÇÃO</strong> — não é texto aprovado; este documento não poderá ser finalizado.', 'erro') : ''}
      <div class="doc-cabeca"><h2>${esc(texto.titulo)}</h2><span class="selo selo-agendado">${texto.demo ? 'Demonstração' : 'Versão ' + texto.versao}</span></div>
      <article class="doc-texto" id="texto" tabindex="0" aria-live="polite"></article>${navPaginas('nav', 'Anterior', 'Continuar lendo')}<div id="aviso"></div>`,
    acoes: rodape(voltar, 'Próximo <span aria-hidden="true">→</span>')
  });
  const el = $('#texto');
  let pags = [];
  let p = 1;
  const desenhar = () => {
    el.innerHTML = paragrafos(pags[p - 1]);
    ligarNav($('#nav'), { pagina: p, paginas: pags.length }, (n) => { p = n; desenhar(); el.focus(); });
    if (p === pags.length) guardar({ [leu]: true });
    $('#prox').disabled = !ler()[leu];
    $('#prox').title = ler()[leu] ? '' : 'Leia até a última página para continuar';
  };
  encaixarTexto(el, texto.conteudo, 52 + 70 + 110, (x) => { pags = x; desenhar(); });
  ligarPendente(tipo === 'proc' ? 'leitura' : 'imagem');
  form.onsubmit = (ev) => { ev.preventDefault(); if (!ler()[leu]) { $('#aviso').innerHTML = avisoHTML('Leia até a última página para continuar.', 'erro'); return; } irProx(prox); };
  focarTitulo();
}

// ═══════════════════════════ 3. DECISÃO SOBRE O PROCEDIMENTO ═══════════════
function etapaDecisao() {
  const d = ler(); if (!d || !d.leu_proc) return ir(D + 'leitura/' + qs());
  const form = pagina({
    titulo: 'Decisão sobre o procedimento', etapa: 3, etapasTotal: 6, formulario: true, voltar: D + 'leitura/' + qs(), voltarTexto: 'Voltar',
    corpo: `${etapaHTML(`${esc(d.cliente_nome)} · ${esc(d.servico_nome)}`)}${avisoDemo(d)}
      <fieldset class="campo" aria-describedby="decisao-erro"><legend class="pergunta">Depois de ler o termo, a cliente:</legend>
        <div class="opcoes">${Object.entries(DECISAO).map(([v, t]) => `<label class="opcao"><input type="radio" name="decisao" value="${v}" ${d.decisao === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
        <span class="erro" id="decisao-erro" aria-live="polite"></span></fieldset>
      <p class="ajuda">Registra a decisão da cliente. <strong>Não é</strong> avaliação profissional de aptidão para o procedimento.</p><div id="aviso"></div>`,
    acoes: rodape(D + 'leitura/' + qs())
  });
  form.addEventListener('change', () => { const v = (form.querySelector('[name=decisao]:checked') || {}).value || null; const at = ler(); guardar({ decisao: v, modalidade: v === 'prosseguir' && at.modalidade === 'recusa_sem_assinatura' ? null : at.modalidade }); });
  ligarPendente('decisao');
  form.onsubmit = (ev) => { ev.preventDefault(); if (!ler().decisao) return mostrarErros(form, { decisao: 'Escolha uma opção.' }); irProx(D + 'imagem/' + qs()); };
  focarTitulo();
}

// ═══════════════════════════ 4. AUTORIZAÇÃO DE IMAGEM (escolha) ════════════
function etapaImagemEscolha() {
  const d = ler(); if (!d || !d.leu_img) return ir(D + 'imagem/' + qs());
  const fin = d.imagem_finalidade || (d.texto_img && d.texto_img.finalidade) || '';
  const form = pagina({
    titulo: 'Divulgação de imagens', etapa: 4, etapasTotal: 6, formulario: true, voltar: D + 'imagem/' + qs(), voltarTexto: 'Voltar',
    corpo: `${etapaHTML(`Separado do aceite do procedimento · ${esc(d.cliente_nome)}`)}
      <fieldset class="campo" aria-describedby="imagem_decisao-erro"><legend class="pergunta">Sobre divulgar imagens do resultado, a cliente:</legend>
        <div class="opcoes">${Object.entries(DEC_IMG).map(([v, t]) => `<label class="opcao"><input type="radio" name="imagem_decisao" value="${v}" ${d.imagem_decisao === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
        <span class="erro" id="imagem_decisao-erro" aria-live="polite"></span></fieldset>
      <div id="caixa-autoriza" ${d.imagem_decisao === 'autoriza' ? '' : 'hidden'}>
        <fieldset class="campo" aria-describedby="imagem_canais-erro"><legend>Canais autorizados</legend>
          <div class="opcoes">${Object.entries(CANAIS).map(([v, t]) => `<label class="chave chave-canal"><input type="checkbox" name="canal" value="${v}" ${(d.imagem_canais || []).includes(v) ? 'checked' : ''}><span><strong>${t}</strong></span></label>`).join('')}</div>
          <span class="erro" id="imagem_canais-erro" aria-live="polite"></span></fieldset>
        ${campoTexto({ id: 'imagem_finalidade', rotulo: 'Finalidade', valor: fin, attrs: 'maxlength="300" autocomplete="off"' })}
      </div>
      <p class="ajuda">Não autorizar não impede o procedimento. Nada é publicado automaticamente; a foto do cadastro não é autorização.</p><div id="aviso"></div>`,
    acoes: rodape(D + 'imagem/' + qs())
  });
  const lerForm = () => ({ imagem_decisao: (form.querySelector('[name=imagem_decisao]:checked') || {}).value || null,
    imagem_canais: [...form.querySelectorAll('[name=canal]:checked')].map(i => i.value), imagem_finalidade: form.imagem_finalidade.value });
  const atualizar = () => { const v = lerForm(); $('#caixa-autoriza').hidden = v.imagem_decisao !== 'autoriza'; guardar(v); };
  form.addEventListener('change', atualizar); form.imagem_finalidade.addEventListener('input', atualizar);
  ligarPendente('imagem-escolha', atualizar);
  form.onsubmit = (ev) => {
    ev.preventDefault(); const v = lerForm(); const er = {};
    if (!v.imagem_decisao) er.imagem_decisao = 'Escolha uma opção.';
    if (v.imagem_decisao === 'autoriza' && !v.imagem_canais.length) er.imagem_canais = 'Escolha ao menos um canal (ou ambos).';
    if (v.imagem_decisao === 'autoriza' && !v.imagem_finalidade.trim()) er.imagem_finalidade = 'Informe a finalidade.';
    if (!mostrarErros(form, er)) return;
    guardar(v); irProx(D + 'assinatura/' + qs());
  };
  focarTitulo();
}

// ═══════════════════════════ 5. ASSINATURA ═════════════════════════════════
function etapaAssinatura() {
  const d = ler(); if (!d || !d.decisao || !d.imagem_decisao) return ir(D + 'imagem/escolha/' + qs());
  const modos = d.decisao === 'nao_prosseguir' ? MODAL : { desenhada: MODAL.desenhada, aceite_identificado: MODAL.aceite_identificado };
  const form = pagina({
    titulo: 'Assinatura', etapa: 5, etapasTotal: 6, formulario: true, voltar: D + 'imagem/escolha/' + qs(), voltarTexto: 'Voltar',
    corpo: `${etapaHTML(`${DECISAO[d.decisao]} · ${DEC_IMG[d.imagem_decisao]}`)}
      ${campoTexto({ id: 'assinante_nome', rotulo: 'Nome de quem assina', valor: d.assinante_nome || d.cliente_nome, attrs: 'maxlength="120" autocomplete="off" autocapitalize="words"' })}
      ${grupoOpcoes({ nome: 'modalidade', legenda: 'Forma de registro', opcoes: modos, valor: d.modalidade, colunas: d.decisao === 'nao_prosseguir' ? 3 : 2 })}
      <div id="area-desenho" ${d.modalidade === 'desenhada' ? '' : 'hidden'}>
        <div class="assinatura-caixa"><canvas id="tela" aria-label="Área de assinatura: desenhe com o dedo, a caneta ou o mouse" role="img"></canvas><span class="assinatura-linha" aria-hidden="true">Assine acima da linha</span></div>
        <div class="linha-acoes"><button type="button" class="btn btn-linha" id="limpar">Limpar</button><button type="button" class="btn btn-linha" id="refazer" title="Recupera o desenho apagado">Refazer</button></div>
        <span class="erro" id="assinatura-erro" aria-live="polite"></span>
      </div>
      <div id="area-aceite" ${d.modalidade === 'aceite_identificado' ? '' : 'hidden'}>
        ${campoTexto({ id: 'nome_confirmado', rotulo: 'Para confirmar o aceite, digite o nome acima', valor: d.nome_confirmado, attrs: 'maxlength="120" autocomplete="off"', ajuda: 'Alternativa acessível, registrada como aceite identificado — diferente da assinatura desenhada.' })}
      </div>
      <div id="area-recusa" ${d.modalidade === 'recusa_sem_assinatura' ? '' : 'hidden'}>${avisoHTML('A recusa será registrada sem exigir assinatura de aceite.')}</div>
      <p class="ajuda">Assinatura desenhada na tela. Não é assinatura certificada nem GOV.BR.</p><div id="aviso"></div>`,
    acoes: rodape(D + 'imagem/escolha/' + qs())
  });
  // ─── área de desenho ───
  const tela = $('#tela'); const g = tela.getContext('2d');
  let desenhando = false, ult = null, tem = !!d.assinatura;
  const ajustar = () => {
    const r = tela.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (!r.width) return;
    tela.width = Math.round(r.width * dpr); tela.height = Math.round(r.height * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#3b1d0f';
    const salvo = ler().assinatura;
    if (salvo) { const i = new Image(); i.onload = () => g.drawImage(i, 0, 0, r.width, r.height); i.src = salvo; }
  };
  const ponto = (e) => { const r = tela.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  tela.addEventListener('pointerdown', (e) => { desenhando = true; ult = ponto(e); tela.setPointerCapture(e.pointerId); g.beginPath(); g.arc(ult.x, ult.y, 1.2, 0, Math.PI * 2); g.fillStyle = '#3b1d0f'; g.fill(); e.preventDefault(); });
  tela.addEventListener('pointermove', (e) => { if (!desenhando) return; const p = ponto(e); g.beginPath(); g.moveTo(ult.x, ult.y); g.lineTo(p.x, p.y); g.stroke(); ult = p; tem = true; e.preventDefault(); });
  const fim = () => { if (!desenhando) return; desenhando = false; guardar({ assinatura: tela.toDataURL('image/png'), assinatura_ref: null }); $('#assinatura-erro').textContent = ''; };
  tela.addEventListener('pointerup', fim); tela.addEventListener('pointercancel', fim); tela.addEventListener('pointerleave', fim);
  $('#limpar').onclick = () => { const at = ler(); g.clearRect(0, 0, tela.width, tela.height); tem = false; guardar({ assinatura: null, assinatura_apagada: at.assinatura || at.assinatura_apagada, assinatura_ref: null }); };
  $('#refazer').onclick = () => { const at = ler(); if (!at.assinatura_apagada) return; guardar({ assinatura: at.assinatura_apagada, assinatura_ref: null }); tem = true; ajustar(); };
  const mostrarModo = () => {
    const m = (form.querySelector('[name=modalidade]:checked') || {}).value;
    $('#area-desenho').hidden = m !== 'desenhada'; $('#area-aceite').hidden = m !== 'aceite_identificado'; $('#area-recusa').hidden = m !== 'recusa_sem_assinatura';
    if (m === 'desenhada') requestAnimationFrame(ajustar);
  };
  form.addEventListener('change', (e) => { if (e.target.name === 'modalidade') { guardar({ modalidade: e.target.value, assinatura_ref: null }); mostrarModo(); } });
  form.assinante_nome.addEventListener('input', () => guardar({ assinante_nome: form.assinante_nome.value, assinatura_ref: null }));
  form.nome_confirmado.addEventListener('input', () => guardar({ nome_confirmado: form.nome_confirmado.value, assinatura_ref: null }));
  window.addEventListener('resize', () => { if (!$('#area-desenho').hidden) ajustar(); });
  mostrarModo();
  ligarPendente('assinatura');
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const x = ler(); const er = {};
    if ((x.assinante_nome || '').trim().length < 3) er.assinante_nome = 'Informe o nome de quem assina.';
    if (!x.modalidade) er.modalidade = 'Escolha a forma de registro.';
    if (x.modalidade === 'desenhada' && (!x.assinatura || !tem)) er.assinatura = 'Faça a assinatura na área indicada.';
    if (x.modalidade === 'aceite_identificado' && (x.nome_confirmado || '').trim().toLowerCase() !== (x.assinante_nome || '').trim().toLowerCase()) er.nome_confirmado = 'Digite o nome exatamente como informado acima.';
    if (!mostrarErros(form, er)) { if (er.assinatura) $('#assinatura-erro').textContent = er.assinatura; return; }
    // a assinatura passa a valer para ESTE conjunto de escolhas
    guardar({ assinatura_ref: await sha256(textoAssinado(x)) });
    ir(D + 'conferencia/' + qs(true));
  };
  focarTitulo();
}

// ═══════════════════════════ 6. CONFERÊNCIA (2 páginas) ════════════════════
async function etapaConferencia(parte) {
  const d = ler(); if (!d || !d.cliente_id) return ir(D + qs());
  const valida = await assinaturaValida(d);
  const demo = (d.texto_proc && d.texto_proc.demo) || (d.texto_img && d.texto_img.demo);
  const rev = (etapa) => `${D}${PAG_ETAPA[etapa]}${docId() ? `?id=${encodeURIComponent(docId())}&conf=1` : '?conf=1'}`;
  const anam = parte === 1 ? await api('an_listar', { query: { cliente: d.cliente_id, limite: 1 } }) : null;
  if (parte === 1) {
    pagina({
      titulo: 'Conferência', etapa: 6, etapasTotal: 6, formulario: true, voltar: D + 'assinatura/' + qs(true), voltarTexto: 'Voltar',
      corpo: `${etapaHTML('Parte 1 de 2 · revise antes de finalizar')}${avisoDemo(d)}
        <div class="resumo">
          ${blocoResumo('Identificação', [['Cliente', d.cliente_nome], ['Procedimento', d.servico_nome], ['Profissional', d.profissional_nome], ['Data', d.data ? dataCurta(d.data) : '']], rev('procedimento'))}
          ${blocoResumo('Termo e decisão', [['Texto', d.texto_proc ? `${d.texto_proc.titulo} (${d.texto_proc.demo ? 'demonstração' : 'versão ' + d.texto_proc.versao})` : ''], ['Decisão', DECISAO[d.decisao]]], rev('decisao'))}
        </div>
        ${anam && anam.ok && anam.itens[0] ? `<p class="ajuda">Ficha de anamnese mais recente: ${anam.itens[0].situacao === 'conferida' ? 'conferida' : 'rascunho'} · ${dataCurta(anam.itens[0].data)} (apenas consulta; não decide nada).</p>` : ''}`,
      acoes: `${botaoPendente}<a class="btn btn-linha" href="${D}assinatura/${qs(true)}">${SETA} Voltar</a><a class="btn btn-cheio" href="${D}conferencia/final/${qs(true)}">Próximo <span aria-hidden="true">→</span></a>`
    });
    $('#corpo').insertAdjacentHTML('beforeend', '<div id="aviso"></div>');
    ligarPendente('conferencia'); focarTitulo(); return;
  }
  const canais = (d.imagem_canais || []).map(c => CANAIS[c]).join(', ');
  pagina({
    titulo: 'Conferência', etapa: 6, etapasTotal: 6, voltar: D + 'conferencia/' + qs(true), voltarTexto: 'Voltar',
    corpo: `${etapaHTML('Parte 2 de 2')}
      <div class="resumo">
        ${blocoResumo('Divulgação de imagem', [['Texto', d.texto_img ? `${d.texto_img.titulo} (${d.texto_img.demo ? 'demonstração' : 'versão ' + d.texto_img.versao})` : ''], ['Decisão', DEC_IMG[d.imagem_decisao]], ...(d.imagem_decisao === 'autoriza' ? [['Canais', canais], ['Finalidade', d.imagem_finalidade]] : [])], rev('imagem-escolha'))}
        <section class="bloco"><div class="bloco-topo"><h2>Assinatura / aceite</h2><a class="corrigir" href="${rev('assinatura')}">Revisar</a></div>
          <dl class="dados"><dt>Nome</dt><dd>${esc(d.assinante_nome)}</dd><dt>Forma</dt><dd>${esc(MODAL[d.modalidade] || '')}</dd></dl>
          ${d.modalidade === 'desenhada' && d.assinatura ? `<img class="assinatura-mini" src="${d.assinatura}" alt="Assinatura desenhada">` : ''}</section>
      </div>
      ${!valida ? avisoHTML(`As escolhas mudaram depois da assinatura/aceite (ou ela ainda não foi feita). <a href="${rev('assinatura')}">Assine ou confirme de novo</a>.`, 'erro') : ''}
      ${demo ? avisoHTML('<strong>DEMONSTRAÇÃO:</strong> não pode ser finalizado como documento real.', 'erro') : ''}
      <div id="aviso"></div>`,
    acoes: `${botaoPendente.replace('btn-rascunho', 'btn-rascunho par')}<button type="button" class="btn btn-cheio" id="finalizar" ${!valida || demo ? 'disabled' : ''}>Finalizar documento</button>`
  });
  ligarPendente('conferencia');
  let env = false;
  $('#finalizar').onclick = async () => {
    if (env) return; env = true;
    const b = $('#finalizar'); b.disabled = true; b.textContent = 'Finalizando…';
    const r = await salvar('conferencia', true);
    if (r.ok) { apagarRasc(chave()); recado.pôr('Documento finalizado.'); location.replace(`${BASE}ver/?id=${encodeURIComponent(r.id)}`); return; }
    env = false; b.disabled = false; b.textContent = 'Tentar novamente';
    $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível finalizar.') + '<br><small>Os dados continuam aqui.</small>', 'erro');
  };
  focarTitulo();
}

// ═══════════════════════════ CONSULTA DO DOCUMENTO ═════════════════════════
async function telaVer() {
  carregando('Documento');
  const r = await api('tm_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Documento', r.msg || 'Não foi possível abrir.');
  const t = r.termo; const q = encodeURIComponent(t.id);
  const msg = recado.tirar();
  const fin = t.situacao === 'finalizado';
  const secoes = fin ? ['ident', 'termo', 'imagem', 'assinatura', 'historico'] : ['ident', 'historico'];
  let p = Math.min(Math.max(parseInt(params.get('p'), 10) || 1, 1), secoes.length);
  const canais = (t.imagem_canais || []).map(c => CANAIS[c]).join(', ');
  const conteudo = (s) => {
    if (s === 'ident') return blocoResumo('Identificação', [['Cliente', t.cliente_nome], ['Procedimento', t.servico_nome], ['Profissional', t.profissional_nome], ['Data', t.data ? dataCurta(t.data) : ''],
      ['Situação', t.situacao_nome], ['Versão do documento', String(t.versao) + (t.anterior_id ? ' (correção)' : '')], ...(fin ? [['Finalizado em', dataHora(t.finalizado_em)]] : [])]);
    if (s === 'termo') return blocoResumo('Termo do procedimento', [['Texto', `${t.texto_proc_titulo} (versão ${t.texto_proc_versao})`], ['Decisão', DECISAO[t.decisao]]]) +
      `<a class="btn btn-suave" href="${BASE}ver/texto/?id=${q}&t=proc">Ler o texto apresentado</a>`;
    if (s === 'imagem') return blocoResumo('Divulgação de imagem', [['Texto', `${t.texto_img_titulo} (versão ${t.texto_img_versao})`], ['Decisão original', DEC_IMG[t.imagem_decisao]], ...(t.imagem_decisao === 'autoriza' ? [['Canais', canais], ['Finalidade', t.imagem_finalidade]] : []),
      ['Situação atual', t.imagem_nome + (t.imagem_retirada_em ? ` em ${dataHora(t.imagem_retirada_em)}` : '')]]) +
      `<a class="btn btn-suave" href="${BASE}ver/texto/?id=${q}&t=img">Ler o texto apresentado</a>`;
    if (s === 'assinatura') return `<section class="bloco"><div class="bloco-topo"><h2>Assinatura / aceite</h2></div><dl class="dados"><dt>Nome</dt><dd>${esc(t.assinante_nome)}</dd><dt>Forma</dt><dd>${esc(r.modalidades[t.modalidade] || '')}</dd><dt>Registrado em</dt><dd>${dataHora(t.assinado_em)}</dd><dt>Autoria</dt><dd>${esc(t.finalizado_por || 'registrada quando o login estiver ativo')}</dd></dl>
      ${t.assinatura ? `<img class="assinatura-mini" src="${t.assinatura}" alt="Assinatura desenhada">` : ''}<p class="ajuda">Não é assinatura certificada nem GOV.BR.</p></section>`;
    return `<ul class="lista linha-tempo hist-curto">${r.historico.slice(-4).reverse().map(h => `<li class="evento"><strong>${esc(HIST[h.acao] || h.acao)}</strong><small>${esc(dataHora(h.criado_em))}</small></li>`).join('')}</ul>
      ${r.posterior ? `<p class="ajuda">Corrigido pela <a href="${BASE}ver/?id=${encodeURIComponent(r.posterior.id)}">versão seguinte</a> (${r.posterior.situacao === 'finalizado' ? 'finalizada' : 'pendente'}).</p>` : ''}
      ${t.anterior_id ? `<p class="ajuda">Corrige a <a href="${BASE}ver/?id=${encodeURIComponent(t.anterior_id)}">versão anterior</a>.</p>` : ''}`;
  };
  const acoes = [];
  if (!fin) acoes.push(`<button type="button" class="btn btn-cheio" id="continuar">Continuar preenchimento</button>`);
  if (fin) acoes.push(`<button type="button" class="btn btn-cheio" id="pdf">Baixar PDF</button>`);
  if (fin && t.imagem_decisao === 'autoriza' && !t.imagem_retirada_em) acoes.push(`<a class="btn btn-linha" href="${BASE}retirar/?id=${q}">Retirar autorização de imagem</a>`);
  if (fin && !(r.posterior && r.posterior.situacao === 'pendente')) acoes.push(`<a class="btn btn-linha" href="${BASE}corrigir/?id=${q}">Corrigir (nova versão)</a>`);
  const desenhar = () => {
    pagina({
      titulo: 'Documento', voltar: BASE, voltarTexto: 'Termos',
      corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<div class="servico-cabeca"><h2>${esc(t.cliente_nome)}</h2>${seloSit(t)}</div>
        <p class="etapa">${esc(t.servico_nome || '')} · ${dataCurta(t.data)} · seção ${p} de ${secoes.length}</p>
        <div class="resumo">${conteudo(secoes[p - 1])}</div>${navPaginas('nav')}<div id="aviso"></div>
        <nav class="acoes-grade" aria-label="Ações do documento">${acoes.join('')}</nav>`,
      acoes: `<a class="btn btn-linha" href="${BASE}">${SETA} Termos</a>`
    });
    ligarNav($('#nav'), { pagina: p, paginas: secoes.length }, (n) => { p = n; desenhar(); });
    const c = $('#continuar'); if (c) c.onclick = () => { gravarRasc('tm:' + t.id, deTermo(t)); location.href = `${D}${PAG_ETAPA[t.etapa_atual] || ''}?id=${q}`; };
    const b = $('#pdf');
    if (b) b.onclick = async () => {
      b.disabled = true; b.textContent = 'Gerando…';
      try {
        const resp = await fetch(`/api/brow?acao=tm_pdf&id=${q}`, { credentials: 'same-origin', cache: 'no-store' });
        if (!resp.ok || !/pdf/.test(resp.headers.get('content-type') || '')) throw new Error();
        const blob = await resp.blob(); const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `termo-v${t.versao}.pdf`; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        $('#aviso').innerHTML = avisoHTML('PDF gerado a partir do registro salvo. Ele fica no seu aparelho; nada foi enviado ou compartilhado.', 'ok');
      } catch (e) { $('#aviso').innerHTML = avisoHTML('Não foi possível gerar o PDF agora.', 'erro'); }
      b.disabled = false; b.textContent = 'Baixar PDF';
    };
    focarTitulo();
  };
  desenhar();
}
async function telaVerTexto() {
  carregando('Texto apresentado');
  const r = await api('tm_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Texto', r.msg);
  const t = r.termo; const proc = params.get('t') !== 'img';
  const volta = `${BASE}ver/?id=${encodeURIComponent(t.id)}&p=${proc ? 2 : 3}`;
  pagina({
    titulo: proc ? 'Termo apresentado' : 'Autorização apresentada', voltar: volta, voltarTexto: 'Documento',
    corpo: `<div class="doc-cabeca"><h2>${esc(proc ? t.texto_proc_titulo : t.texto_img_titulo)}</h2><span class="selo selo-agendado">Versão ${proc ? t.texto_proc_versao : t.texto_img_versao}</span></div>
      <p class="ajuda">Cópia exata do texto mostrado à cliente.</p><article class="doc-texto" id="texto" tabindex="0"></article>${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${volta}">${SETA} Voltar ao documento</a>`
  });
  const el = $('#texto'); let pags = []; let p = 1;
  const des = () => { el.innerHTML = paragrafos(pags[p - 1]); ligarNav($('#nav'), { pagina: p, paginas: pags.length }, (n) => { p = n; des(); }); };
  encaixarTexto(el, proc ? t.texto_proc_conteudo : t.texto_img_conteudo, 52 + 70 + 30, (x2) => { pags = x2; des(); }); focarTitulo();
}
async function telaRetirar() {
  carregando('Retirar autorização');
  const r = await api('tm_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Retirar autorização', r.msg);
  const t = r.termo; const volta = `${BASE}ver/?id=${encodeURIComponent(t.id)}`;
  const form = pagina({
    titulo: 'Retirar autorização de imagem', voltar: volta, voltarTexto: 'Documento', formulario: true,
    corpo: `<div class="bloco"><div class="servico-cabeca"><h2>${esc(t.cliente_nome)}</h2>${seloSit(t)}</div><p class="ajuda">Autorizou em ${dataHora(t.finalizado_em)}: ${esc((t.imagem_canais || []).map(c => CANAIS[c]).join(', '))}</p></div>
      ${avisoHTML('A retirada fica registrada com data e responsável; a decisão original é preservada e o <strong>aceite do procedimento não muda</strong>. O app não remove publicações já feitas em outros lugares: isso precisa ser feito manualmente.', 'erro')}
      ${campoTexto({ id: 'motivo', rotulo: 'Motivo', opcional: true, attrs: 'maxlength="300" autocomplete="off"' })}
      <label class="chave"><input type="checkbox" name="confirmacao"><span><strong>Confirmo a retirada da autorização de divulgação</strong></span></label><span class="erro" id="confirmacao-erro"></span><div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Cancelar</a><button type="submit" class="btn btn-perigo-cheio" id="confirmar">Registrar retirada</button>`
  });
  let env = false;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); if (env) return;
    if (!form.confirmacao.checked) return mostrarErros(form, { confirmacao: 'Marque a confirmação.' });
    env = true; const rr = await api('tm_retirar_imagem', { corpo: { id: t.id, motivo: form.motivo.value, confirmacao: true } });
    if (rr.ok) { recado.pôr('Retirada da autorização registrada.'); location.replace(volta + '&p=3'); return; }
    env = false; $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível registrar.'), 'erro');
  };
  focarTitulo();
}
async function telaCorrigir() {
  carregando('Corrigir documento');
  const r = await api('tm_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Corrigir', r.msg);
  const t = r.termo; const volta = `${BASE}ver/?id=${encodeURIComponent(t.id)}`;
  pagina({
    titulo: 'Corrigir documento', voltar: volta, voltarTexto: 'Documento',
    corpo: `<div class="bloco"><div class="servico-cabeca"><h2>${esc(t.cliente_nome)}</h2>${seloSit(t)}</div><p class="ajuda">${esc(t.servico_nome || '')} · versão ${t.versao}</p></div>
      ${avisoHTML('O documento finalizado <strong>não é alterado</strong>. Será criada uma <strong>nova versão</strong>, ligada a este, que precisa ser lida, decidida e assinada de novo.')}<div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${volta}">Cancelar</a><button type="button" class="btn btn-cheio" id="criar">Criar nova versão</button>`
  });
  let env = false;
  $('#criar').onclick = async () => {
    if (env) return; env = true;
    const rr = await api('tm_nova_versao', { corpo: { id: t.id } });
    if (!rr.ok) { env = false; $('#aviso').innerHTML = avisoHTML(esc(rr.msg || 'Não foi possível.'), 'erro'); return; }
    const v = await api('tm_ver', { id: rr.id }); if (v.ok) gravarRasc('tm:' + rr.id, deTermo(v.termo));
    location.replace(`${D}leitura/?id=${encodeURIComponent(rr.id)}`);
  };
  focarTitulo();
}

// ═══════════════════════════ TEXTOS DOS TERMOS ═════════════════════════════
const TX = BASE + 'textos/';
async function telaTextos() {
  const msg = recado.tirar();
  pagina({
    titulo: 'Textos dos termos', voltar: BASE, voltarTexto: 'Termos',
    extra: `<a class="btn btn-cheio btn-topo" href="${TX}novo/">+ Novo<span class="so-largo">&nbsp;texto</span></a>`,
    corpo: `${msg ? avisoHTML(esc(msg), 'ok') : ''}<p class="ajuda">Cadastre aqui os textos <strong>aprovados</strong> pelo estabelecimento. Cada mudança cria uma nova versão; as anteriores ficam guardadas.</p>
      <ul class="lista" id="lista"></ul>${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${BASE}">${SETA} Termos</a>`
  });
  let pg = 1;
  async function carregar() {
    const r = await api('tm_textos_listar', { query: { pagina: pg, limite: cabem($('#lista'), 76, 52 + 74) } });
    if (!r.ok) return;
    $('#lista').innerHTML = r.total ? r.itens.map(x => `<li class="item${x.situacao === 'vigente' ? '' : ' item-inativo'}"><div class="item-info"><div class="item-nome">${esc(x.titulo)}</div>
      <div class="item-extra">${x.tipo === 'imagem' ? 'Autorização de imagem' : 'Termo · ' + esc(x.servico_nome || 'todos os procedimentos')} · versão ${x.versao} · ${x.situacao === 'vigente' ? 'em uso' : 'substituído'}</div></div>
      <a class="btn btn-linha" href="${TX}ver/?id=${encodeURIComponent(x.id)}">Abrir</a></li>`).join('')
      : '<li class="vazio"><h2>Nenhum texto aprovado</h2><p>Enquanto não houver, os termos usam texto de DEMONSTRAÇÃO e não podem ser finalizados.</p></li>';
    ligarNav($('#nav'), { ...r, rotulo: 'textos' }, (n) => { pg = n; carregar(); });
  }
  carregar(); focarTitulo();
}
async function telaTextoVer() {
  carregando('Texto');
  const r = await api('tm_texto_ver', { id: params.get('id') });
  if (!r.ok) return telaErro('Texto', r.msg, TX, 'Textos');
  const x = r.texto;
  pagina({
    titulo: 'Texto do termo', voltar: TX, voltarTexto: 'Textos',
    corpo: `<div class="doc-cabeca"><h2>${esc(x.titulo)}</h2><span class="selo selo-agendado">Versão ${x.versao}</span></div>
      <p class="etapa">${x.tipo === 'imagem' ? 'Autorização de imagem' : 'Termo · ' + esc(x.servico_nome || 'todos os procedimentos')} · ${x.situacao === 'vigente' ? 'em uso' : 'substituído'}${x.finalidade ? ' · finalidade: ' + esc(x.finalidade) : ''}</p>
      <article class="doc-texto" id="texto" tabindex="0"></article>${navPaginas('nav')}`,
    acoes: `<a class="btn btn-linha" href="${TX}">${SETA} Textos</a><a class="btn btn-cheio" href="${TX}novo/?base=${encodeURIComponent(x.id)}">Nova versão</a>`
  });
  const el = $('#texto'); let pags = []; let p = 1;
  const des = () => { el.innerHTML = paragrafos(pags[p - 1]); ligarNav($('#nav'), { pagina: p, paginas: pags.length }, (n) => { p = n; des(); }); };
  encaixarTexto(el, x.conteudo, 52 + 70 + 30, (x2) => { pags = x2; des(); }); focarTitulo();
}
async function textoNovo(passo) {
  const K = 'tt:novo';
  if (passo === 1 && params.get('base') && !(lerRasc(K) || {}).base_id) {
    const r = await api('tm_texto_ver', { id: params.get('base') });
    if (r.ok) gravarRasc(K, { chave_envio: uuid(), base_id: r.texto.id, tipo: r.texto.tipo, servico_id: r.texto.servico_id || '', titulo: r.texto.titulo, conteudo: r.texto.conteudo, finalidade: r.texto.finalidade || '' });
  }
  const d = lerRasc(K) || { chave_envio: uuid(), tipo: '', servico_id: '', titulo: '', conteudo: '', finalidade: '' };
  gravarRasc(K, d);
  const g = (m) => gravarRasc(K, { ...lerRasc(K), ...m });
  if (passo === 1) {
    const sv = await api('servicos_listar', { query: { limite: 50, ativos: '1' } });
    const form = pagina({
      titulo: d.base_id ? 'Nova versão do texto' : 'Novo texto', etapa: 1, etapasTotal: 3, formulario: true, voltar: TX, voltarTexto: 'Textos',
      corpo: `${grupoOpcoes({ nome: 'tipo', legenda: 'Tipo de texto', opcoes: { procedimento: 'Termo do procedimento', imagem: 'Autorização de imagem' }, valor: d.tipo })}
        <div class="campo" id="caixa-servico" ${d.tipo === 'imagem' ? 'hidden' : ''}><label for="servico_id">Procedimento <span class="opcional">(vazio = vale para todos)</span></label>
          <select id="servico_id" name="servico_id"><option value="">Todos os procedimentos</option>${(sv.ok ? sv.itens : []).map(s => `<option value="${esc(s.id)}" ${s.id === d.servico_id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select></div>
        ${campoTexto({ id: 'titulo_texto', rotulo: 'Título', valor: d.titulo, attrs: 'maxlength="120" autocomplete="off"' })}
        <div id="caixa-fin" ${d.tipo === 'imagem' ? '' : 'hidden'}>${campoTexto({ id: 'finalidade', rotulo: 'Finalidade da divulgação', valor: d.finalidade, attrs: 'maxlength="300" autocomplete="off"' })}</div>`,
      acoes: `<a class="btn btn-linha" href="${TX}" id="cancelar">Cancelar</a><button type="submit" class="btn btn-cheio">Próximo <span aria-hidden="true">→</span></button>`
    });
    $('#cancelar').onclick = () => apagarRasc(K);
    const ler2 = () => ({ tipo: (form.querySelector('[name=tipo]:checked') || {}).value || '', servico_id: form.servico_id.value, titulo: form.titulo_texto.value, finalidade: form.finalidade.value });
    form.addEventListener('input', () => { const v = ler2(); g(v); $('#caixa-servico').hidden = v.tipo === 'imagem'; $('#caixa-fin').hidden = v.tipo !== 'imagem'; });
    form.addEventListener('change', () => { const v = ler2(); g(v); $('#caixa-servico').hidden = v.tipo === 'imagem'; $('#caixa-fin').hidden = v.tipo !== 'imagem'; });
    form.onsubmit = (e) => { e.preventDefault(); const v = ler2(); const er = {}; if (!v.tipo) er.tipo = 'Escolha o tipo.'; if (v.titulo.trim().length < 3) er.titulo_texto = 'Informe o título.'; if (v.tipo === 'imagem' && !v.finalidade.trim()) er.finalidade = 'Informe a finalidade.'; if (!mostrarErros(form, er)) return; g(v); ir(TX + 'novo/conteudo/'); };
  } else if (passo === 2) {
    if (!d.tipo) return ir(TX + 'novo/');
    const form = pagina({
      titulo: 'Texto aprovado', etapa: 2, etapasTotal: 3, formulario: true, voltar: TX + 'novo/', voltarTexto: 'Voltar',
      corpo: `<div class="campo"><label for="conteudo">Cole o texto aprovado pelo estabelecimento</label><textarea id="conteudo" name="conteudo" maxlength="20000" class="texto-longo-campo" aria-describedby="conteudo-erro">${esc(d.conteudo)}</textarea>
        <span class="ajuda">Separe parágrafos com uma linha em branco. Textos longos aparecem paginados para a cliente.</span><span class="erro" id="conteudo-erro"></span></div>`,
      acoes: `<a class="btn btn-linha" href="${TX}novo/">${SETA} Voltar</a><button type="submit" class="btn btn-cheio">Próximo <span aria-hidden="true">→</span></button>`
    });
    form.conteudo.addEventListener('input', () => g({ conteudo: form.conteudo.value }));
    form.onsubmit = (e) => { e.preventDefault(); if (form.conteudo.value.trim().length < 20) return mostrarErros(form, { conteudo: 'Cole o texto completo (mínimo de 20 caracteres).' }); g({ conteudo: form.conteudo.value }); ir(TX + 'novo/conferencia/'); };
  } else {
    if (!d.conteudo) return ir(TX + 'novo/conteudo/');
    const form = pagina({
      titulo: 'Conferir texto', etapa: 3, etapasTotal: 3, formulario: true, voltar: TX + 'novo/conteudo/', voltarTexto: 'Voltar',
      corpo: `${blocoResumo('Texto', [['Tipo', d.tipo === 'imagem' ? 'Autorização de imagem' : 'Termo do procedimento'], ['Título', d.titulo], ['Tamanho', `${d.conteudo.length} caracteres`], ...(d.tipo === 'imagem' ? [['Finalidade', d.finalidade]] : [])], TX + 'novo/')}
        <label class="chave"><input type="checkbox" name="aprovado"><span><strong>Este texto foi aprovado pelo estabelecimento</strong><small>Ele passa a ser a versão em uso; a anterior fica guardada como substituída.</small></span></label><span class="erro" id="aprovado-erro"></span><div id="aviso"></div>`,
      acoes: `<a class="btn btn-linha" href="${TX}novo/conteudo/">${SETA} Voltar</a><button type="submit" class="btn btn-cheio" id="salvar">Salvar nova versão</button>`
    });
    let env = false;
    form.onsubmit = async (e) => {
      e.preventDefault(); if (env) return;
      if (!form.aprovado.checked) return mostrarErros(form, { aprovado: 'Confirme a aprovação do texto.' });
      env = true; const r = await api('tm_texto_salvar', { corpo: { ...d, servico_id: d.tipo === 'imagem' ? null : (d.servico_id || null), aprovado: true } });
      if (r.ok) { apagarRasc(K); recado.pôr(`Texto salvo (versão ${r.versao}).`); location.replace(TX); return; }
      env = false; $('#aviso').innerHTML = avisoHTML(esc(r.msg || 'Não foi possível salvar.') + (r.erros ? ' ' + esc(Object.values(r.erros).join(' ')) : ''), 'erro');
    };
  }
  focarTitulo();
}

// ─── roteamento ─────────────────────────────────────────────────────────────
const TELAS = {
  lista: telaLista, cliente: etapaCliente, atendimento: etapaAtendimento, procedimento: etapaProcedimento,
  leitura: () => etapaLeitura('proc'), decisao: etapaDecisao, imagem: () => etapaLeitura('img'), 'imagem-escolha': etapaImagemEscolha,
  assinatura: etapaAssinatura, conferencia: () => etapaConferencia(1), 'conferencia-final': () => etapaConferencia(2),
  ver: telaVer, 'ver-texto': telaVerTexto, retirar: telaRetirar, corrigir: telaCorrigir,
  textos: telaTextos, 'texto-ver': telaTextoVer, 'texto-novo': () => textoNovo(1), 'texto-conteudo': () => textoNovo(2), 'texto-conferencia': () => textoNovo(3)
};
(async () => {
  const pg = document.body.dataset.pagina;
  const etapas = ['cliente', 'atendimento', 'procedimento', 'leitura', 'decisao', 'imagem', 'imagem-escolha', 'assinatura', 'conferencia', 'conferencia-final'];
  if (docId() && etapas.includes(pg) && !ler()) {
    carregando('Termo');
    const r = await api('tm_ver', { id: docId() });
    if (!r.ok) return telaErro('Termo', r.msg);
    if (r.termo.situacao === 'finalizado') return location.replace(`${BASE}ver/?id=${encodeURIComponent(docId())}`);
    gravarRasc(chave(), deTermo(r.termo));
  }
  (TELAS[pg] || telaLista)();
})();
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
