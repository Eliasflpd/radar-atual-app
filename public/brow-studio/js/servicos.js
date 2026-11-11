// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — módulo SERVIÇOS E VALORES (10/11/2026)
// Mesma estrutura do cadastro de clientes: cada página tem rota própria e diz
// qual tela é em <body data-pagina="...">. Peças comuns em comum.js.
//
// Rascunho entre etapas em sessionStorage ("servico:novo" ou
// "servico:editar:<id>"). Não é registro: o serviço só existe depois que o
// servidor responde que salvou.
//
// DINHEIRO: o campo é texto ("80,50") e vai assim para o servidor, que guarda
// em centavos inteiros. Aqui a conta também é feita em centavos (inteiros).
// ═══════════════════════════════════════════════════════════════════════════
import { $, params, esc, uuid, lerRasc, gravarRasc, apagarRasc, api, SETA, pagina, campoTexto, grupoOpcoes,
  mostrarErros, avisoHTML, focarTitulo, ir, blocoResumo } from './comum.js?v=2';

const BASE = '/brow-studio/servicos/';
const CATEGORIAS = { design: 'Design', henna: 'Henna/tintura', lamination: 'Brow lamination', micro: 'Micropigmentação', retoque: 'Retoque', outro: 'Outro' };
const SITUACOES = { ativo: 'Ativo', inativo: 'Inativo' };

// ─── dinheiro e tempo ───────────────────────────────────────────────────────
const RE_VALOR = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/;
function textoParaCentavos(v) {
  let s = String(v == null ? '' : v).trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!s || !RE_VALOR.test(s)) return null;
  s = s.replace(/\./g, '');
  const [inteiro, dec = ''] = s.split(',');
  const c = parseInt(inteiro, 10) * 100 + parseInt((dec + '00').slice(0, 2), 10);
  return Number.isSafeInteger(c) && c <= 100000000 ? c : null;
}
function reais(centavos) {
  const s = String(Math.max(0, centavos | 0)).padStart(3, '0');
  const inteiro = s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${inteiro},${s.slice(-2)}`;
}
const centavosParaTexto = (c) => reais(c).replace('R$ ', '');
function tempo(min) {
  min = min | 0;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), r = min % 60;
  return r ? `${h} h ${String(r).padStart(2, '0')} min` : `${h} h`;
}
const curto = (t, n = 90) => !t ? '' : (t.length > n ? t.slice(0, n).trimEnd() + '…' : t);
const inteiroEntre = (v, a, b) => { const s = String(v == null ? '' : v).trim(); if (!/^\d+$/.test(s)) return null; const n = parseInt(s, 10); return n >= a && n <= b ? n : null; };

// ─── validações (mesmas regras do servidor) ─────────────────────────────────
function errosSobre(d) {
  const e = {};
  const nome = (d.nome || '').trim();
  if (nome.length < 2) e.nome = 'Informe o nome do serviço.';
  else if (nome.length > 80) e.nome = 'O nome pode ter no máximo 80 caracteres.';
  if (!CATEGORIAS[d.categoria]) e.categoria = 'Escolha a categoria.';
  if ((d.descricao || '').length > 220) e.descricao = 'A descrição pode ter no máximo 220 caracteres.';
  return e;
}
function errosTempo(d) {
  const e = {};
  if (inteiroEntre(d.duracao_min, 5, 480) === null) e.duracao_min = 'Informe a duração em minutos inteiros, de 5 a 480.';
  if (inteiroEntre(d.intervalo_min === '' ? '0' : d.intervalo_min, 0, 120) === null) e.intervalo_min = 'O intervalo deve ser de 0 a 120 minutos inteiros.';
  if (textoParaCentavos(d.valor) === null) e.valor = 'Informe o valor em reais, com até duas casas: ex. 80 ou 80,50.';
  if (d.situacao !== 'ativo' && d.situacao !== 'inativo') e.situacao = 'Escolha a situação.';
  return e;
}

// ─── rascunho ───────────────────────────────────────────────────────────────
// modo "novo" ou "editar"; para editar, o rascunho nasce do que está salvo.
function chaveDe(modo, id) { return modo === 'novo' ? 'servico:novo' : 'servico:editar:' + id; }
function rascNovo() {
  let r = lerRasc('servico:novo');
  if (!r) { r = { chave_envio: uuid(), nome: '', categoria: '', descricao: '', duracao_min: '', intervalo_min: '0', valor: '', situacao: 'ativo' }; gravarRasc('servico:novo', r); }
  return r;
}
async function rascEditar(id) {
  let r = lerRasc('servico:editar:' + id);
  if (r) return { ok: true, r };
  const resp = await api('servico_ver', { id });
  if (!resp.ok) return resp;
  const s = resp.servico;
  r = { id, nome: s.nome, categoria: s.categoria, descricao: s.descricao || '', duracao_min: String(s.duracao_min),
    intervalo_min: String(s.intervalo_min), valor: centavosParaTexto(s.valor_centavos), situacao: s.ativo ? 'ativo' : 'inativo' };
  gravarRasc('servico:editar:' + id, r);
  return { ok: true, r };
}

// ─── telas auxiliares ───────────────────────────────────────────────────────
function telaErro(titulo, msg, voltar = BASE, voltarTexto = 'Serviços') {
  pagina({ titulo, voltar, voltarTexto, corpo: avisoHTML(esc(msg), 'erro'),
    acoes: `<a class="btn btn-cheio" href="${voltar}">${voltarTexto === 'Serviços' ? 'Voltar à lista' : esc(voltarTexto)}</a>` });
  focarTitulo();
}
const carregando = (titulo) => pagina({ titulo, corpo: avisoHTML('Carregando…') });
const selo = (ativo) => `<span class="selo ${ativo ? 'selo-ativo' : 'selo-inativo'}">${ativo ? 'Ativo' : 'Inativo'}</span>`;

// ═══════════════════════════ PÁGINAS ═══════════════════════════════════════

// ─── 1. LISTA ───────────────────────────────────────────────────────────────
async function telaLista() {
  const rasc = lerRasc('servico:novo');
  const temRasc = rasc && (rasc.nome || rasc.valor || rasc.duracao_min);
  pagina({
    titulo: 'Serviços e valores', voltar: '/brow-studio/profissional.html',
    extra: `<a class="btn btn-cheio btn-topo" href="${BASE}novo/" aria-label="Novo serviço">+ Novo<span class="so-largo">&nbsp;serviço</span></a>`,
    corpo: `
      ${temRasc ? avisoHTML(`Serviço em andamento${rasc.nome ? `: <strong>${esc(rasc.nome)}</strong>` : ''} (não salvo).`, 'compacto',
        `<div class="linha-acoes"><a class="btn btn-cheio" href="${BASE}novo/">Continuar</a><button type="button" class="btn btn-linha" id="descartar">Descartar</button></div>`) : ''}
      <div id="estado"></div>
      <form class="busca" role="search" id="form-busca">
        <div class="campo"><label for="q">Buscar por nome ou categoria</label>
          <input id="q" name="q" type="search" autocomplete="off" enterkeyhint="search" value="${esc(params.get('q') || '')}"></div>
      </form>
      <ul class="lista" id="lista" aria-label="Serviços cadastrados"></ul>
      <nav class="paginacao" id="paginacao" aria-label="Páginas da lista" hidden>
        <button type="button" class="btn btn-linha" id="ant" aria-label="Página anterior">${SETA} Anterior</button>
        <span class="pag-info" id="pag-info" aria-live="polite"></span>
        <button type="button" class="btn btn-linha" id="prox" aria-label="Próxima página">Próxima <span aria-hidden="true">→</span></button>
      </nav>`
  });
  const d = $('#descartar');
  if (d) d.onclick = () => { apagarRasc('servico:novo'); d.closest('.aviso-caixa').remove(); };

  let pg = Math.max(parseInt(params.get('p'), 10) || 1, 1);
  let termo = params.get('q') || '';
  let limite = 0, ajuste = 0, vez = 0;
  function calcularLimite() {
    const lista = $('#lista');
    const topo = lista.getBoundingClientRect().top + window.scrollY;
    const livre = window.innerHeight - topo - 52 - 30;
    const alt = window.innerHeight <= 760 ? 76 : 88;
    return Math.max(2, Math.min(12, Math.floor((livre + 10) / (alt + 10))));
  }
  async function carregar() {
    const minha = ++vez;
    limite = ajuste || calcularLimite();
    const r = await api('servicos_listar', { query: { q: termo, pagina: pg, limite } });
    if (minha !== vez) return;
    const lista = $('#lista'), nav = $('#paginacao'), estado = $('#estado');
    estado.innerHTML = '';
    if (!r.ok) {
      lista.innerHTML = ''; nav.hidden = true;
      estado.innerHTML = avisoHTML(esc(r.msg || 'Não foi possível carregar os serviços.'), 'erro',
        r.erro === 'login_pendente' ? '' : '<div class="linha-acoes"><button type="button" class="btn btn-linha" id="tentar">Tentar novamente</button></div>');
      const t = $('#tentar'); if (t) t.onclick = carregar;
      return;
    }
    pg = r.pagina;
    const url = new URL(location.href);
    termo ? url.searchParams.set('q', termo) : url.searchParams.delete('q');
    pg > 1 ? url.searchParams.set('p', pg) : url.searchParams.delete('p');
    history.replaceState(null, '', url);
    if (!r.total) {
      nav.hidden = true;
      lista.innerHTML = termo
        ? `<li class="vazio"><h2>Nenhum serviço encontrado</h2><p>Nada com “${esc(termo)}”. Busque pelo nome ou pela categoria.</p></li>`
        : `<li class="vazio"><span class="avatar grande" aria-hidden="true">✦</span><h2>Nenhum serviço cadastrado</h2><p>Toque em “Novo serviço” para cadastrar o primeiro, com duração e valor.</p>
            <button type="button" class="btn btn-suave" id="importar-tabela">Importar tabela de valores do estúdio (7 serviços)</button><p class="ajuda" id="importar-aviso" aria-live="polite"></p></li>`;
      const bt = document.getElementById('importar-tabela');
      if (bt) bt.onclick = async () => {
        bt.disabled = true; bt.textContent = 'Importando…';
        const ri = await api('servico_importar_tabela', { corpo: {} });
        if (ri.ok) { location.reload(); return; }
        bt.disabled = false; bt.textContent = 'Importar tabela de valores do estúdio (7 serviços)';
        document.getElementById('importar-aviso').textContent = ri.msg || 'Não foi possível importar.';
      };
      return;
    }
    lista.innerHTML = r.itens.map(s => `
      <li class="item${s.ativo ? '' : ' item-inativo'}">
        <div class="item-info">
          <div class="item-nome">${esc(s.nome)}</div>
          <div class="item-extra"><span class="selo-mini ${s.ativo ? 'ativo' : 'inativo'}">${s.ativo ? 'Ativo' : 'Inativo'} · </span><strong class="preco">${reais(s.valor_centavos)}</strong> · ${tempo(s.duracao_min)} · ${esc(s.categoria_nome)}</div>
        </div>
        <span class="selo-lado">${selo(s.ativo)}</span>
        <a class="btn btn-linha" href="${BASE}detalhes/?id=${encodeURIComponent(s.id)}" aria-label="Abrir ${esc(s.nome)}">Abrir</a>
      </li>`).join('');
    nav.hidden = r.paginas <= 1;
    $('#pag-info').innerHTML = `<strong>${r.pagina}</strong> de ${r.paginas}<span class="pag-total"> · ${r.total} serviços</span>`;
    $('#pag-info').setAttribute('aria-label', `Página ${r.pagina} de ${r.paginas}, ${r.total} serviços`);
    $('#ant').disabled = r.pagina <= 1;
    $('#prox').disabled = r.pagina >= r.paginas;
    if (document.documentElement.scrollHeight > window.innerHeight + 1 && limite > 2 && r.itens.length >= limite) {
      ajuste = Math.max(2, limite - Math.ceil((document.documentElement.scrollHeight - window.innerHeight) / ($('.item').offsetHeight + 10)));
      const primeiro = (pg - 1) * limite; pg = Math.floor(primeiro / ajuste) + 1;
      carregar();
    }
  }
  $('#ant').onclick = () => { pg--; carregar(); };
  $('#prox').onclick = () => { pg++; carregar(); };
  let espera;
  $('#q').addEventListener('input', (e) => { clearTimeout(espera); espera = setTimeout(() => { termo = e.target.value.trim(); pg = 1; carregar(); }, 300); });
  $('#form-busca').onsubmit = (e) => { e.preventDefault(); clearTimeout(espera); termo = $('#q').value.trim(); pg = 1; carregar(); };
  let redim;
  window.addEventListener('resize', () => {
    clearTimeout(redim);
    redim = setTimeout(() => { ajuste = 0; const novo = calcularLimite(); if (novo !== limite) { const p1 = (pg - 1) * limite; pg = Math.floor(p1 / novo) + 1; carregar(); } }, 250);
  });
  carregar();
}

// ─── formulários das etapas (servem para novo e editar) ─────────────────────
function contador(id, max, valor) { return `<span class="ajuda contador" id="${id}-cont" aria-live="polite">${(valor || '').length}/${max}</span>`; }
function formSobre(d) {
  return `
    <div class="campo">
      <label for="nome">Nome do serviço</label>
      <input id="nome" name="nome" type="text" value="${esc(d.nome)}" maxlength="80" autocomplete="off" autocapitalize="sentences" aria-describedby="nome-erro nome-cont" required>
      <div class="linha-ajuda"><span class="erro" id="nome-erro" aria-live="polite"></span>${contador('nome', 80, d.nome)}</div>
    </div>
    ${grupoOpcoes({ nome: 'categoria', legenda: 'Categoria', opcoes: CATEGORIAS, valor: d.categoria, colunas: 3 })}
    <div class="campo">
      <label for="descricao">Descrição <span class="opcional">(opcional)</span></label>
      <textarea id="descricao" name="descricao" maxlength="220" rows="3" class="curta" aria-describedby="descricao-erro descricao-cont">${esc(d.descricao)}</textarea>
      <div class="linha-ajuda"><span class="erro" id="descricao-erro" aria-live="polite"></span>${contador('descricao', 220, d.descricao)}</div>
    </div>`;
}
const lerSobre = (f) => ({ nome: f.nome.value.replace(/\s+/g, ' ').trim(), categoria: (f.querySelector('[name=categoria]:checked') || {}).value || '', descricao: f.descricao.value.trim() });
function ligarContadores(f) {
  [['nome', 80], ['descricao', 220]].forEach(([id, max]) => {
    const el = f[id]; if (!el) return;
    el.addEventListener('input', () => { $(`#${id}-cont`).textContent = `${el.value.length}/${max}`; });
  });
}

function formTempo(d) {
  return `
    <div class="duas-colunas">
      ${campoTexto({ id: 'duracao_min', rotulo: 'Duração (min)', valor: d.duracao_min, attrs: 'inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" placeholder="Ex.: 60"', ajuda: 'De 5 a 480' })}
      ${campoTexto({ id: 'intervalo_min', rotulo: 'Intervalo após (min)', valor: d.intervalo_min, attrs: 'inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off"', ajuda: 'De 0 a 120' })}
    </div>
    <div class="aviso-caixa" id="reservado" role="status"></div>
    ${campoTexto({ id: 'valor', rotulo: 'Valor (R$)', valor: d.valor, attrs: 'inputmode="decimal" autocomplete="off" placeholder="Ex.: 80,00" maxlength="13"', ajuda: 'Use vírgula para os centavos. Pode ser 0.' })}
    ${grupoOpcoes({ nome: 'situacao', legenda: 'Situação', opcoes: SITUACOES, valor: d.situacao })}`;
}
const lerTempo = (f) => ({ duracao_min: f.duracao_min.value.trim(), intervalo_min: f.intervalo_min.value.trim(), valor: f.valor.value.trim(), situacao: (f.querySelector('[name=situacao]:checked') || {}).value || '' });
function ligarTempo(f) {
  const atualizar = () => {
    const dur = inteiroEntre(f.duracao_min.value, 5, 480);
    const int = inteiroEntre(f.intervalo_min.value === '' ? '0' : f.intervalo_min.value, 0, 120);
    const c = textoParaCentavos(f.valor.value);
    const linhaValor = c !== null ? ` Valor: <strong>${reais(c)}</strong>.` : '';
    $('#reservado').innerHTML = dur !== null && int !== null
      ? `Tempo reservado na futura agenda: <strong>${tempo(dur + int)}</strong> (duração + intervalo).${linhaValor}`
      : `O tempo reservado na futura agenda será a duração mais o intervalo.${linhaValor}`;
  };
  ['duracao_min', 'intervalo_min'].forEach(k => f[k].addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3); atualizar(); }));
  f.valor.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/[^\d.,]/g, ''); atualizar(); });
  atualizar();
}

// ─── 2 e 3. ETAPAS (novo e editar) ──────────────────────────────────────────
const ETAPAS = {
  sobre: { n: 1, titulo: 'Sobre o serviço', form: formSobre, ler: lerSobre, erros: errosSobre, ligar: ligarContadores, ant: null, prox: 'tempo/' },
  tempo: { n: 2, titulo: 'Tempo e valor', form: formTempo, ler: lerTempo, erros: errosTempo, ligar: ligarTempo, ant: '', prox: 'conferencia/' }
};
async function telaEtapa(modo, etapa) {
  const cfg = ETAPAS[etapa];
  const id = params.get('id');
  const qs = modo === 'editar' ? `?id=${encodeURIComponent(id)}` : '';
  const raiz = BASE + (modo === 'novo' ? 'novo/' : 'editar/');
  const detalhes = `${BASE}detalhes/?id=${encodeURIComponent(id)}`;
  const chave = chaveDe(modo, id);
  let d;
  if (modo === 'novo') d = rascNovo();
  else {
    carregando(cfg.titulo);
    const r = await rascEditar(id);
    if (!r.ok) return telaErro(cfg.titulo, r.msg || 'Não foi possível abrir o serviço.');
    d = r.r;
  }
  const daConf = params.get('conf') === '1';
  const cancelar = modo === 'novo' ? BASE : detalhes;
  const form = pagina({
    titulo: modo === 'novo' ? (etapa === 'sobre' ? 'Novo serviço' : cfg.titulo) : 'Editar serviço',
    etapa: cfg.n, etapasTotal: 3, formulario: true,
    voltar: cfg.ant === null ? cancelar : raiz + cfg.ant + qs, voltarTexto: cfg.ant === null ? (modo === 'novo' ? 'Serviços' : 'Detalhes') : 'Voltar',
    corpo: ((modo === 'novo' && etapa === 'sobre') || modo === 'editar' ? `<p class="etapa" style="margin-top:-8px">${cfg.titulo}</p>` : '') + cfg.form(d) + '<div id="aviso"></div>',
    acoes: `${cfg.ant === null
      ? `<a class="btn btn-linha" href="${cancelar}" id="cancelar">Cancelar</a>`
      : `<a class="btn btn-linha" href="${raiz + cfg.ant + qs}">${SETA} Voltar</a>`}
      <button type="submit" class="btn btn-cheio">${daConf ? 'Voltar à conferência' : 'Próximo <span aria-hidden="true">→</span>'}</button>`
  });
  cfg.ligar(form);
  const guardar = () => { if (!gravarRasc(chave, { ...lerRasc(chave), ...cfg.ler(form) })) $('#aviso').innerHTML = avisoHTML('O aparelho está sem espaço para guardar o rascunho.', 'erro'); };
  form.addEventListener('input', guardar);
  form.addEventListener('change', guardar);
  // Cancelar na edição descarta o rascunho; no novo, ele fica guardado (a lista oferece continuar/descartar)
  const c = $('#cancelar'); if (c && modo === 'editar') c.onclick = () => apagarRasc(chave);
  form.onsubmit = (e) => {
    e.preventDefault();
    const dados = cfg.ler(form);
    if (!mostrarErros(form, cfg.erros(dados))) return;
    gravarRasc(chave, { ...lerRasc(chave), ...dados });
    ir(raiz + (daConf ? 'conferencia/' : cfg.prox) + qs);
  };
  focarTitulo();
}

// ─── 4. CONFERÊNCIA (novo e editar) ─────────────────────────────────────────
async function telaConferencia(modo) {
  const id = params.get('id');
  const qs = modo === 'editar' ? `?id=${encodeURIComponent(id)}` : '';
  const raiz = BASE + (modo === 'novo' ? 'novo/' : 'editar/');
  const chave = chaveDe(modo, id);
  const d = lerRasc(chave);
  if (!d) { ir(raiz + qs); return; }
  const eS = errosSobre(d), eT = errosTempo(d);
  const pend = Object.keys(eS).length || Object.keys(eT).length;
  const dur = inteiroEntre(d.duracao_min, 5, 480), int = inteiroEntre(d.intervalo_min || '0', 0, 120);
  const c = textoParaCentavos(d.valor);
  const corr = (etapa) => `${raiz}${etapa}${qs ? qs + '&' : '?'}conf=1`;
  pagina({
    titulo: modo === 'novo' ? 'Conferência' : 'Conferir alterações', etapa: 3, etapasTotal: 3, voltar: raiz + 'tempo/' + qs,
    corpo: `<div class="resumo">
        ${blocoResumo('Sobre o serviço', [['Nome', d.nome], ['Categoria', CATEGORIAS[d.categoria]], ['Descrição', curto(d.descricao)]], corr(''))}
        ${blocoResumo('Tempo e valor', [['Duração', dur !== null ? tempo(dur) : ''], ['Intervalo após', int !== null ? (int ? tempo(int) : 'Sem intervalo') : ''],
          ['Tempo total reservado', dur !== null && int !== null ? tempo(dur + int) : ''], ['Valor', c !== null ? reais(c) : ''], ['Situação', SITUACOES[d.situacao]]], corr('tempo/'))}
      </div>
      <div id="aviso">${pend ? avisoHTML(`Antes de salvar, corrija: ${[Object.keys(eS).length ? `<a href="${corr('')}">sobre o serviço</a>` : '', Object.keys(eT).length ? `<a href="${corr('tempo/')}">tempo e valor</a>` : ''].filter(Boolean).join(' e ')}.`, 'erro') : ''}</div>`,
    acoes: `<a class="btn btn-linha" href="${raiz}tempo/${qs}">${SETA} Voltar</a>
      <button type="button" class="btn btn-cheio" id="salvar" ${pend ? 'disabled' : ''}>${modo === 'novo' ? 'Salvar serviço' : 'Salvar alterações'}</button>`
  });
  const botao = $('#salvar');
  let enviando = false;
  botao.onclick = async () => {
    if (enviando) return;                 // toque repetido não envia de novo
    enviando = true;
    botao.disabled = true; botao.setAttribute('aria-busy', 'true'); botao.textContent = 'Salvando…';
    $('#aviso').innerHTML = '';
    const campos = { nome: d.nome, categoria: d.categoria, descricao: d.descricao || null, duracao_min: d.duracao_min,
      intervalo_min: d.intervalo_min || '0', valor: d.valor, ativo: d.situacao === 'ativo' };
    const r = modo === 'novo'
      ? await api('servico_criar', { corpo: { chave_envio: d.chave_envio, ...campos } })   // chave_envio: o servidor nunca grava duas vezes
      : await api('servico_atualizar', { id, corpo: campos });
    if (r.ok) {
      apagarRasc(chave);
      location.replace(`${BASE}detalhes/?id=${encodeURIComponent(modo === 'novo' ? r.id : id)}&ok=${modo === 'novo' ? 'salvo' : 'editado'}`);
      return;
    }
    enviando = false;
    botao.disabled = false; botao.removeAttribute('aria-busy'); botao.textContent = 'Tentar novamente';
    let msg = esc(r.msg || 'Não foi possível salvar.');
    if (r.erro === 'validacao' && r.erros) msg = 'Há dados para corrigir: ' + esc(Object.values(r.erros).join(' '));
    $('#aviso').innerHTML = avisoHTML(`${msg}<br><small>Os dados preenchidos continuam guardados.</small>`, 'erro');
  };
  focarTitulo();
}

// ─── 5. DETALHES ────────────────────────────────────────────────────────────
const MSG_OK = { salvo: 'Serviço salvo com sucesso.', editado: 'Alterações salvas.', desativado: 'Serviço desativado. O cadastro foi preservado.', ativado: 'Serviço ativado.' };
async function telaDetalhes() {
  const id = params.get('id'); const q = encodeURIComponent(id);
  carregando('Detalhes do serviço');
  const r = await api('servico_ver', { id });
  if (!r.ok) return telaErro('Detalhes do serviço', r.msg || 'Não foi possível abrir o serviço.');
  const s = r.servico;
  const ok = MSG_OK[params.get('ok')];
  pagina({
    titulo: 'Detalhes do serviço', voltar: BASE, voltarTexto: 'Serviços',
    corpo: `${ok ? avisoHTML(ok, 'ok') : ''}
      <div class="servico-cabeca"><h2>${esc(s.nome)}</h2>${selo(s.ativo)}</div>
      <p class="preco-grande">${reais(s.valor_centavos)}</p>
      <div class="resumo">
        ${blocoResumo('Informações', [['Categoria', s.categoria_nome], ['Descrição', s.descricao], ['Duração', tempo(s.duracao_min)],
          ['Intervalo após', s.intervalo_min ? tempo(s.intervalo_min) : 'Sem intervalo'], ['Tempo total reservado', tempo(s.reservado_min)], ['Situação', s.ativo ? 'Ativo' : 'Inativo']])}
      </div>
      ${s.ativo ? '' : avisoHTML('Serviço inativo: não poderá ser escolhido em novos agendamentos quando a agenda existir.')}`,
    acoes: `<a class="btn btn-linha" href="${BASE}" aria-label="Voltar à lista">${SETA} Voltar<span class="so-largo">&nbsp;à lista</span></a>
      <a class="btn ${s.ativo ? 'btn-perigo' : 'btn-linha'}" href="${BASE}situacao/?id=${q}">${s.ativo ? 'Desativar' : 'Ativar'}</a>
      <a class="btn btn-cheio" href="${BASE}editar/?id=${q}" id="editar">Editar serviço</a>`
  });
  // editar sempre parte do que está salvo agora
  $('#editar').onclick = () => apagarRasc('servico:editar:' + id);
  if (ok) { const u = new URL(location.href); u.searchParams.delete('ok'); history.replaceState(null, '', u); }
  focarTitulo();
}

// ─── CONFIRMAÇÃO DE SITUAÇÃO (página própria) ───────────────────────────────
async function telaSituacao() {
  const id = params.get('id'); const q = encodeURIComponent(id);
  const detalhes = `${BASE}detalhes/?id=${q}`;
  carregando('Alterar situação');
  const r = await api('servico_ver', { id });
  if (!r.ok) return telaErro('Alterar situação', r.msg || 'Não foi possível abrir o serviço.');
  const s = r.servico;
  const desativar = s.ativo;
  pagina({
    titulo: desativar ? 'Desativar serviço?' : 'Ativar serviço?', voltar: detalhes, voltarTexto: 'Detalhes',
    corpo: `<div class="bloco"><div class="servico-cabeca"><h2>${esc(s.nome)}</h2>${selo(s.ativo)}</div>
        <p style="margin-top:6px;color:#8a6a58">${reais(s.valor_centavos)} · ${tempo(s.duracao_min)} · ${esc(s.categoria_nome)}</p></div>
      ${desativar
        ? avisoHTML('Ao desativar, o serviço <strong>não poderá ser escolhido em novos agendamentos</strong> quando a agenda existir. O cadastro e o histórico <strong>são preservados</strong>, e você pode ativá-lo de novo quando quiser.')
        : avisoHTML('Ao ativar, o serviço volta a poder ser escolhido em novos agendamentos quando a agenda existir.')}
      <div id="aviso"></div>`,
    acoes: `<a class="btn btn-linha" href="${detalhes}">Cancelar</a>
      <button type="button" class="btn ${desativar ? 'btn-perigo-cheio' : 'btn-cheio'}" id="confirmar">${desativar ? 'Sim, desativar' : 'Sim, ativar'}</button>`
  });
  let enviando = false;
  $('#confirmar').onclick = async () => {
    if (enviando) return;
    enviando = true;
    const b = $('#confirmar'); b.disabled = true; b.setAttribute('aria-busy', 'true'); b.textContent = 'Salvando…';
    const resp = await api('servico_atualizar', { id, corpo: { ativo: !desativar } });
    if (resp.ok) { location.replace(`${detalhes}&ok=${desativar ? 'desativado' : 'ativado'}`); return; }
    enviando = false; b.disabled = false; b.removeAttribute('aria-busy'); b.textContent = 'Tentar novamente';
    $('#aviso').innerHTML = avisoHTML(esc(resp.msg || 'Não foi possível alterar a situação.'), 'erro');
  };
  focarTitulo();
}

// ─── roteamento ─────────────────────────────────────────────────────────────
const TELAS = {
  lista: telaLista,
  'novo-sobre': () => telaEtapa('novo', 'sobre'),
  'novo-tempo': () => telaEtapa('novo', 'tempo'),
  'novo-conferencia': () => telaConferencia('novo'),
  'editar-sobre': () => telaEtapa('editar', 'sobre'),
  'editar-tempo': () => telaEtapa('editar', 'tempo'),
  'editar-conferencia': () => telaConferencia('editar'),
  detalhes: telaDetalhes,
  situacao: telaSituacao
};
(TELAS[document.body.dataset.pagina] || telaLista)();
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
