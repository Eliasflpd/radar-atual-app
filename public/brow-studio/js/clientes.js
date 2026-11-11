// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — módulo CLIENTES (10/11/2026)
// Cada página tem rota própria (pasta com index.html) e diz qual tela é em
// <body data-pagina="...">. Este arquivo desenha a tela certa.
//
// RASCUNHO: o que a profissional digita entre uma etapa e outra fica em
// sessionStorage (só nesta aba, some ao fechar). NÃO é cadastro: a cliente só
// existe depois que o servidor responde "salvo". Nada de dado fictício.
// ═══════════════════════════════════════════════════════════════════════════
const BASE = '/brow-studio/clientes/';
import { $, app, params, esc, uuid, lerRasc, gravarRasc, apagarRasc, api, SETA, pagina, campoTexto, grupoOpcoes,
  mostrarErros, avisoHTML, focarTitulo, ir, blocoResumo } from './comum.js?v=3';
const digitos = (v) => String(v || '').replace(/\D/g, '');
function iniciais(nome) {
  const p = String(nome || '').trim().split(/\s+/).filter(x => !/^(d[aeo]s?|e)$/i.test(x));
  if (!p.length) return '?';
  return ((p[0][0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
function formatarTelefone(v) {
  const d = digitos(v);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v || '';
}
function mascaraTelefone(v) {
  const d = digitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function formatarData(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

const DDD = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
const valida = {
  telefone(d) {
    if (d.length !== 10 && d.length !== 11) return false;
    if (!DDD.has(d.slice(0, 2))) return false;
    return d.length === 11 ? d[2] === '9' : /[2-5]/.test(d[2]);
  },
  email: (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 160,
  data(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T12:00:00');
    return !isNaN(d) && d.getFullYear() >= 1900 && d <= new Date();
  }
};
const CONTATOS = { whatsapp: 'WhatsApp', ligacao: 'Ligação', email: 'E-mail', nenhum: 'Não deseja contato' };
const ORIGENS = { instagram: 'Instagram', indicacao: 'Indicação', google: 'Google', ja_cliente: 'Já era cliente', outro: 'Outro', nao_informado: 'Não informado', online: 'Agendamento online', lancamento: 'Lançamento em lote' };

// ─── rascunho (sessionStorage) ──────────────────────────────────────────────
// chave "nova" = cadastro novo; "editar:<id>" = edição de uma cliente salva.
function rascNova() {
  let r = lerRasc('nova');
  if (!r) { r = { chave_envio: uuid(), lembretes: false, novidades: false }; gravarRasc('nova', r); }
  return r;
}


function avatarHTML(nome, foto, grande) {
  return `<span class="avatar${grande ? ' grande' : ''}" aria-hidden="true">${foto ? `<img src="${esc(foto)}" alt="">` : esc(iniciais(nome))}</span>`;
}

// ─── validações por etapa (mesmas regras do servidor) ───────────────────────
function errosDados(d) {
  const e = {};
  if (!d.nome || d.nome.trim().length < 2) e.nome = 'Informe o nome completo da cliente.';
  if (d.nascimento && !valida.data(d.nascimento)) e.nascimento = 'Data inválida. Confira dia, mês e ano.';
  return e;
}
function errosContato(d) {
  const e = {};
  const t = digitos(d.telefone);
  if (t && !valida.telefone(t)) e.telefone = 'Telefone inválido. Use DDD + número, ex.: (11) 98888-7777.';
  if (d.email && !valida.email(d.email.trim())) e.email = 'E-mail inválido. Ex.: nome@email.com';
  if ((d.contato_pref === 'whatsapp' || d.contato_pref === 'ligacao') && !t) e.contato_pref = 'Para esse contato, preencha o telefone.';
  if (d.contato_pref === 'email' && !d.email) e.contato_pref = 'Para esse contato, preencha o e-mail.';
  return e;
}

// ═══════════════════════════ PÁGINAS ═══════════════════════════════════════

// ─── 1. LISTA ───────────────────────────────────────────────────────────────
async function telaLista() {
  const rasc = lerRasc('nova');
  const temRasc = rasc && (rasc.nome || rasc.telefone || rasc.email || rasc.foto);
  pagina({
    titulo: 'Clientes', voltar: '/brow-studio/profissional.html',
    extra: `<a class="btn btn-cheio btn-topo" href="${BASE}nova/" aria-label="Nova cliente">+ Nova<span class="so-largo">&nbsp;cliente</span></a>`,
    corpo: `
      ${temRasc ? avisoHTML(`Cadastro em andamento${rasc.nome ? `: <strong>${esc(rasc.nome)}</strong>` : ''} (não salvo).`, 'compacto',
        `<div class="linha-acoes"><a class="btn btn-cheio" href="${BASE}nova/">Continuar</a><button type="button" class="btn btn-linha" id="descartar">Descartar</button></div>`) : ''}
      <div id="estado"></div>
      <form class="busca" role="search" id="form-busca">
        <div class="campo"><label for="q">Buscar por nome ou telefone</label>
          <input id="q" name="q" type="search" autocomplete="off" enterkeyhint="search" value="${esc(params.get('q') || '')}"></div>
      </form>
      <ul class="lista" id="lista" aria-label="Clientes cadastradas"></ul>
      <nav class="paginacao" id="paginacao" aria-label="Páginas da lista" hidden>
        <button type="button" class="btn btn-linha" id="ant" aria-label="Página anterior">${SETA} Anterior</button>
        <span class="pag-info" id="pag-info" aria-live="polite"></span>
        <button type="button" class="btn btn-linha" id="prox" aria-label="Próxima página">Próxima <span aria-hidden="true">→</span></button>
      </nav>`
  });
  const d = $('#descartar');
  if (d) d.onclick = () => { apagarRasc('nova'); d.closest('.aviso-caixa').remove(); };

  let pg = Math.max(parseInt(params.get('p'), 10) || 1, 1);
  let termo = params.get('q') || '';
  let limite = 0, carregando = 0, ajusteLimite = 0;

  // quantas clientes cabem: mede o espaço livre da lista na tela atual
  function calcularLimite() {
    const lista = $('#lista');
    const topo = lista.getBoundingClientRect().top + window.scrollY;
    const livre = window.innerHeight - topo - 52 /*paginação*/ - 30 /*respiro*/;
    const alturaItem = window.innerHeight <= 760 ? 72 : 84;
    return Math.max(2, Math.min(12, Math.floor((livre + 10) / (alturaItem + 10))));
  }
  async function carregar() {
    const minha = ++carregando;
    limite = ajusteLimite || calcularLimite();
    const r = await api('listar', { query: { q: termo, pagina: pg, limite } });
    if (minha !== carregando) return;
    const lista = $('#lista'), nav = $('#paginacao'), estado = $('#estado');
    estado.innerHTML = '';
    if (!r.ok) {
      lista.innerHTML = '';
      nav.hidden = true;
      estado.innerHTML = avisoHTML(esc(r.msg || 'Não foi possível carregar as clientes.'), 'erro',
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
        ? `<li class="vazio"><h2>Nenhuma cliente encontrada</h2><p>Nada com “${esc(termo)}”. Confira a grafia ou busque pelo telefone.</p></li>`
        : `<li class="vazio">${avatarHTML('', null, true).replace('?', '✦')}<h2>Nenhuma cliente cadastrada</h2><p>Toque em “Nova cliente” para fazer o primeiro cadastro.</p></li>`;
      return;
    }
    lista.innerHTML = r.itens.map(c => `
      <li class="item">
        ${avatarHTML(c.nome, c.mini)}
        <div class="item-info"><div class="item-nome">${esc(c.nome)}</div>
          <div class="item-extra">${esc([c.apelido ? `“${c.apelido}”` : '', formatarTelefone(c.telefone)].filter(Boolean).join(' · ') || 'Sem telefone')}</div></div>
        <a class="btn btn-linha" href="${BASE}perfil/?id=${encodeURIComponent(c.id)}" aria-label="Ver perfil de ${esc(c.nome)}">Ver perfil</a>
      </li>`).join('');
    nav.hidden = r.paginas <= 1;
    $('#pag-info').innerHTML = `<strong>${r.pagina}</strong> de ${r.paginas}<span class="pag-total"> · ${r.total} clientes</span>`;
    $('#pag-info').setAttribute('aria-label', `Página ${r.pagina} de ${r.paginas}, ${r.total} clientes`);
    $('#ant').disabled = r.pagina <= 1;
    $('#prox').disabled = r.pagina >= r.paginas;
    // Conferência com a tela já desenhada: se passou da altura, mostra uma cliente a menos por página
    // (o tamanho real dos itens depende da fonte e do aparelho).
    if (document.documentElement.scrollHeight > window.innerHeight + 1 && limite > 2 && r.itens.length >= limite) {
      ajusteLimite = Math.max(2, limite - Math.ceil((document.documentElement.scrollHeight - window.innerHeight) / ($('.item').offsetHeight + 10)));
      const primeiro = (pg - 1) * limite; pg = Math.floor(primeiro / ajusteLimite) + 1;
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
    redim = setTimeout(() => {
      // mantém a primeira cliente visível ao mudar o tamanho da página
      ajusteLimite = 0;
      const novo = calcularLimite();
      if (novo !== limite) { const primeiro = (pg - 1) * limite; pg = Math.floor(primeiro / novo) + 1; carregar(); }
    }, 250);
  });
  carregar();
}

// ─── formulários de etapa (servem para "nova" e para "editar") ──────────────
function formDados(d) {
  return `
    ${campoTexto({ id: 'nome', rotulo: 'Nome completo', valor: d.nome, attrs: 'autocomplete="off" autocapitalize="words" required maxlength="120"' })}
    ${campoTexto({ id: 'apelido', rotulo: 'Como prefere ser chamada', valor: d.apelido, opcional: true, attrs: 'autocomplete="off" autocapitalize="words" maxlength="60"' })}
    ${campoTexto({ id: 'nascimento', rotulo: 'Data de nascimento', valor: d.nascimento, tipo: 'date', opcional: true, attrs: `max="${new Date().toISOString().slice(0, 10)}" min="1900-01-01"` })}
    <div class="foto-linha" style="display:flex;align-items:center;gap:14px">
      ${avatarHTML(d.nome, d.foto)}
      <a class="btn btn-suave" style="flex:1" id="ir-foto" href="#">${d.foto ? 'Trocar foto da cliente' : 'Adicionar foto da cliente'}</a>
    </div>`;
}
const lerDados = (f) => ({ nome: f.nome.value.replace(/\s+/g, ' ').trim(), apelido: f.apelido.value.trim(), nascimento: f.nascimento.value });

function formContato(d) {
  return `
    ${campoTexto({ id: 'telefone', rotulo: 'Telefone / WhatsApp com DDD', valor: mascaraTelefone(d.telefone || ''), tipo: 'tel', opcional: true, attrs: 'inputmode="tel" autocomplete="off" placeholder="(11) 98888-7777" maxlength="16"' })}
    ${campoTexto({ id: 'email', rotulo: 'E-mail', valor: d.email, tipo: 'email', opcional: true, attrs: 'inputmode="email" autocomplete="off" autocapitalize="none" maxlength="160"' })}
    ${grupoOpcoes({ nome: 'contato_pref', legenda: 'Contato preferido', opcoes: CONTATOS, valor: d.contato_pref })}`;
}
const lerContato = (f) => ({ telefone: digitos(f.telefone.value), email: f.email.value.trim().toLowerCase(), contato_pref: (f.querySelector('[name=contato_pref]:checked') || {}).value || '' });
function ligarMascara(f) { f.telefone.addEventListener('input', (e) => { e.target.value = mascaraTelefone(e.target.value); }); }

function formPreferencias(d) {
  return `
    ${grupoOpcoes({ nome: 'origem', legenda: 'Como conheceu o estúdio', opcoes: ORIGENS, valor: d.origem, colunas: 3 })}
    <label class="chave"><input type="checkbox" name="lembretes" ${d.lembretes ? 'checked' : ''}>
      <span><strong>Receber lembretes de agendamento</strong><small>Registra a preferência. O envio automático virá num módulo futuro.</small></span></label>
    <label class="chave"><input type="checkbox" name="novidades" ${d.novidades ? 'checked' : ''}>
      <span><strong>Receber novidades e promoções</strong><small>Opção separada dos lembretes. Pode ser mudada depois.</small></span></label>`;
}
const lerPreferencias = (f) => ({ origem: (f.querySelector('[name=origem]:checked') || {}).value || '', lembretes: f.lembretes.checked, novidades: f.novidades.checked });

function formObservacoes(d) {
  return `<div class="campo">
      <label for="observacoes">Preferências de atendimento e observações <span class="opcional">(opcional)</span></label>
      <textarea id="observacoes" name="observacoes" maxlength="2000" aria-describedby="observacoes-ajuda observacoes-erro">${esc(d.observacoes || '')}</textarea>
      <span class="ajuda" id="observacoes-ajuda">Ex.: prefere horários pela manhã, gosta de sobrancelha mais natural. A anamnese terá um módulo próprio.</span>
      <span class="erro" id="observacoes-erro"></span>
    </div>`;
}
const lerObservacoes = (f) => ({ observacoes: f.observacoes.value.trim() });

// ─── 2 a 6. NOVA CLIENTE (etapas) ───────────────────────────────────────────
const ETAPAS_NOVA = {
  'nova-dados': { n: 1, titulo: 'Nova cliente', sub: 'Dados pessoais', form: formDados, ler: lerDados, erros: errosDados, voltar: null, prox: 'contato/' },
  'nova-contato': { n: 2, titulo: 'Contato', form: formContato, ler: lerContato, erros: errosContato, voltar: '', prox: 'preferencias/' },
  'nova-preferencias': { n: 3, titulo: 'Preferências', form: formPreferencias, ler: lerPreferencias, erros: () => ({}), voltar: 'contato/', prox: 'observacoes/' },
  'nova-observacoes': { n: 4, titulo: 'Observações', form: formObservacoes, ler: lerObservacoes, erros: () => ({}), voltar: 'preferencias/', prox: 'conferencia/' }
};
function telaEtapaNova(nome) {
  const cfg = ETAPAS_NOVA[nome];
  const d = rascNova();
  const daConf = params.get('conf') === '1';
  const urlNova = BASE + 'nova/';
  const form = pagina({
    titulo: cfg.titulo, etapa: cfg.n, formulario: true,
    voltar: cfg.voltar === null ? BASE : urlNova + cfg.voltar, voltarTexto: cfg.voltar === null ? 'Clientes' : 'Voltar',
    corpo: (cfg.sub ? `<p class="etapa" style="margin-top:-8px">${esc(cfg.sub)}</p>` : '') + cfg.form(d) + '<div id="aviso"></div>',
    acoes: `${cfg.voltar === null
      ? `<a class="btn btn-linha" href="${BASE}">Cancelar</a>`
      : `<a class="btn btn-linha" href="${urlNova + cfg.voltar}">${SETA} Voltar</a>`}
      <button type="submit" class="btn btn-cheio">${daConf ? 'Voltar à conferência' : 'Próximo <span aria-hidden="true">→</span>'}</button>`
  });
  if (nome === 'nova-contato') ligarMascara(form);
  // guarda o que foi digitado a cada mudança (voltar/avançar não perde nada)
  const salvarParcial = () => { const atual = { ...rascNova(), ...cfg.ler(form) }; if (!gravarRasc('nova', atual)) $('#aviso').innerHTML = avisoHTML('O aparelho está sem espaço para guardar o rascunho.', 'erro'); };
  form.addEventListener('input', salvarParcial);
  form.addEventListener('change', salvarParcial);
  const foto = $('#ir-foto');
  if (foto) foto.onclick = (e) => { e.preventDefault(); salvarParcial(); ir(`${BASE}foto/?r=nova&volta=${encodeURIComponent(urlNova + (daConf ? '?conf=1' : ''))}`); };
  form.onsubmit = (e) => {
    e.preventDefault();
    const dados = cfg.ler(form);
    if (!mostrarErros(form, cfg.erros(dados))) return;
    gravarRasc('nova', { ...rascNova(), ...dados });
    ir(daConf ? urlNova + 'conferencia/' : urlNova + cfg.prox);
  };
  // texto da cancelação: Cancelar leva à lista e o rascunho continua lá (com opção de descartar)
  focarTitulo();
}

// ─── 7. CONFERÊNCIA (duas páginas curtas) ───────────────────────────────────
function telaConferencia(parte) {
  const d = lerRasc('nova');
  const N = BASE + 'nova/';
  if (!d) { ir(N); return; }
  const faltaNome = Object.keys(errosDados(d)).length > 0;
  const faltaContato = Object.keys(errosContato(d)).length > 0;
  if (parte === 1) {
    pagina({
      titulo: 'Conferência', etapa: 5, voltar: N + 'observacoes/',
      corpo: `<p class="etapa" style="margin-top:-8px">Parte 1 de 2 · confira antes de salvar</p>
        ${faltaNome || faltaContato ? avisoHTML('Há dados para corrigir antes de salvar.', 'erro') : ''}
        <div class="resumo">
          <section class="bloco"><div class="bloco-topo"><h2>Dados pessoais</h2><a class="corrigir" href="${N}?conf=1">Corrigir</a></div>
            <div style="display:flex;gap:14px;align-items:center">${avatarHTML(d.nome, d.foto)}
              <dl class="dados" style="flex:1"><dt>Nome</dt><dd>${esc(d.nome || '—')}</dd>
                <dt>Prefere ser chamada</dt><dd>${esc(d.apelido || 'Não informado')}</dd>
                <dt>Nascimento</dt><dd>${esc(d.nascimento ? formatarData(d.nascimento) : 'Não informado')}</dd>
                <dt>Foto</dt><dd>${d.foto ? 'Foto adicionada' : 'Sem foto'}</dd></dl></div></section>
          ${blocoResumo('Contato', [['Telefone', formatarTelefone(d.telefone)], ['E-mail', d.email], ['Contato preferido', CONTATOS[d.contato_pref]]], N + 'contato/?conf=1')}
        </div>`,
      acoes: `<a class="btn btn-linha" href="${N}observacoes/">${SETA} Voltar</a><a class="btn btn-cheio" href="${N}conferencia/final/">Próximo <span aria-hidden="true">→</span></a>`
    });
    focarTitulo();
    return;
  }
  pagina({
    titulo: 'Conferência', etapa: 5, voltar: N + 'conferencia/',
    corpo: `<p class="etapa" style="margin-top:-8px">Parte 2 de 2 · confira antes de salvar</p>
      <div class="resumo">
        ${blocoResumo('Preferências', [['Como conheceu', ORIGENS[d.origem]], ['Lembretes de agendamento', d.lembretes ? 'Sim' : 'Não'], ['Novidades e promoções', d.novidades ? 'Sim' : 'Não']], N + 'preferencias/?conf=1')}
        ${blocoResumo('Observações', [['Anotações', d.observacoes ? (d.observacoes.length > 180 ? d.observacoes.slice(0, 180) + '…' : d.observacoes) : '']], N + 'observacoes/?conf=1')}
      </div>
      <div id="aviso">${faltaNome || faltaContato ? avisoHTML(`Antes de salvar, corrija: ${[faltaNome ? `<a href="${N}?conf=1">dados pessoais</a>` : '', faltaContato ? `<a href="${N}contato/?conf=1">contato</a>` : ''].filter(Boolean).join(' e ')}.`, 'erro') : ''}</div>`,
    acoes: `<a class="btn btn-linha" href="${N}conferencia/">${SETA} Voltar</a><button type="button" class="btn btn-cheio" id="salvar" ${faltaNome || faltaContato ? 'disabled' : ''}>Salvar cadastro</button>`
  });
  const botao = $('#salvar');
  let enviando = false;
  botao.onclick = async () => {
    if (enviando) return;              // toque repetido não envia de novo
    enviando = true;
    botao.disabled = true; botao.setAttribute('aria-busy', 'true'); botao.textContent = 'Salvando…';
    $('#aviso').innerHTML = '';
    const r = await api('criar', { corpo: { ...d } });   // leva a chave_envio: o servidor nunca grava duas vezes
    if (r.ok && r.id) {
      apagarRasc('nova');
      location.replace(`${BASE}perfil/?id=${encodeURIComponent(r.id)}&salvo=1`);
      return;
    }
    enviando = false;
    botao.disabled = false; botao.removeAttribute('aria-busy'); botao.textContent = 'Tentar novamente';
    let msg = esc(r.msg || 'Não foi possível salvar.');
    if (r.erro === 'validacao' && r.erros) msg = 'O cadastro tem dados para corrigir: ' + esc(Object.values(r.erros).join(' '));
    $('#aviso').innerHTML = avisoHTML(`${msg}<br><small>Os dados preenchidos continuam guardados nesta tela.</small>`, 'erro');
  };
  focarTitulo();
}

// ─── 3. FOTO (página própria, serve para nova e edição) ─────────────────────
const LADO_FOTO = 720, LADO_MINI = 160;
function carregarImagem(src) {
  return new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('imagem')); i.src = src; });
}
// Gera a foto (até 720 px) e a miniatura quadrada (160 px) em JPEG.
function comprimir(fonte, larg, alt) {
  const esc1 = Math.min(1, LADO_FOTO / Math.max(larg, alt));
  const c = document.createElement('canvas');
  c.width = Math.round(larg * esc1); c.height = Math.round(alt * esc1);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(fonte, 0, 0, c.width, c.height);
  const lado = Math.min(larg, alt);
  const m = document.createElement('canvas'); m.width = m.height = LADO_MINI;
  const gm = m.getContext('2d');
  gm.drawImage(fonte, (larg - lado) / 2, (alt - lado) / 2, lado, lado, 0, 0, LADO_MINI, LADO_MINI);
  return { foto: c.toDataURL('image/jpeg', 0.82), foto_mini: m.toDataURL('image/jpeg', 0.8) };
}
async function arquivoParaFoto(arq) {
  if (!arq) throw new Error('nada');
  if (!/^image\/(jpeg|png|webp|heic|heif|gif)$/i.test(arq.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(arq.name || '')) throw new Error('tipo');
  if (arq.size > 25 * 1024 * 1024) throw new Error('grande');
  const url = URL.createObjectURL(arq);
  try {
    const img = await carregarImagem(url).catch(() => { throw new Error('ler'); });
    return comprimir(img, img.naturalWidth, img.naturalHeight);
  } finally { URL.revokeObjectURL(url); }
}
const MSG_ARQ = {
  tipo: 'Esse arquivo não é uma imagem. Escolha uma foto JPG, PNG ou WEBP.',
  grande: 'A imagem é grande demais (mais de 25 MB). Escolha outra.',
  ler: 'Não foi possível abrir essa imagem. Ela pode estar corrompida ou num formato que este navegador não lê (como HEIC). Tente outra foto.'
};
function contextoFoto() {
  const r = params.get('r') || 'nova';
  const volta = params.get('volta') || (r === 'nova' ? BASE + 'nova/' : BASE);
  const seguro = /^\/brow-studio\//.test(volta) ? volta : BASE;
  return { r, volta: seguro };
}
function telaFoto() {
  const { r, volta } = contextoFoto();
  const d = lerRasc(r);
  if (!d) { ir(volta); return; }
  // "pendente" = escolhida aqui mas ainda não confirmada
  const pend = d.foto_pendente !== undefined ? d.foto_pendente : (d.foto ? { foto: d.foto, foto_mini: d.foto_mini } : null);
  const atual = pend && pend.foto;
  pagina({
    titulo: 'Foto da cliente', voltar: volta, voltarTexto: 'Voltar',
    corpo: `<div class="foto-area">
        <div class="foto-previa" id="previa">${atual ? `<img src="${esc(atual)}" alt="Prévia da foto escolhida">` : '<span>Nenhuma foto<br>escolhida</span>'}</div>
        <div id="aviso" style="width:100%"></div>
        <div class="foto-botoes">
          <label class="btn btn-suave" for="galeria" style="cursor:pointer">${atual ? 'Trocar pela galeria' : 'Escolher da galeria'}</label>
          <input id="galeria" type="file" accept="image/*" class="sr-only">
          <a class="btn btn-suave" href="${BASE}foto/camera/?r=${encodeURIComponent(r)}&volta=${encodeURIComponent(volta)}">Tirar foto com a câmera</a>
          ${atual ? '<button type="button" class="btn btn-perigo" id="remover">Remover foto</button>' : ''}
        </div>
      </div>`,
    acoes: `<a class="btn btn-linha" href="${volta}" id="sem">${atual ? 'Cancelar' : 'Continuar sem foto'}</a>
      <button type="button" class="btn btn-cheio" id="confirmar">${atual ? 'Usar esta foto' : 'Confirmar sem foto'}</button>`
  });
  const guardarPendente = (p) => {
    const novo = { ...lerRasc(r), foto_pendente: p };
    if (!gravarRasc(r, novo)) { $('#aviso').innerHTML = avisoHTML('Sem espaço no aparelho para guardar a foto. Tente outra imagem.', 'erro'); return false; }
    return true;
  };
  $('#galeria').onchange = async (e) => {
    const arq = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!arq) return;
    $('#aviso').innerHTML = avisoHTML('Preparando a foto…');
    try {
      const p = await arquivoParaFoto(arq);
      if (guardarPendente(p)) location.replace(location.href);   // redesenha com a prévia
    } catch (err) {
      $('#aviso').innerHTML = avisoHTML(MSG_ARQ[err.message] || MSG_ARQ.ler, 'erro');
    }
  };
  const rem = $('#remover');
  if (rem) rem.onclick = () => { if (guardarPendente(null)) location.replace(location.href); };
  // Cancelar/Continuar sem foto: descarta só a escolha pendente, nunca os campos
  $('#sem').onclick = (e) => {
    e.preventDefault();
    const dd = lerRasc(r) || {};
    if (!atual) { dd.foto = null; dd.foto_mini = null; dd.foto_alterada = dd.foto_alterada || !!d.foto; }
    delete dd.foto_pendente; gravarRasc(r, dd); ir(volta);
  };
  $('#confirmar').onclick = () => {
    const dd = lerRasc(r) || {};
    const antes = dd.foto || null;
    dd.foto = pend ? pend.foto : null; dd.foto_mini = pend ? pend.foto_mini : null;
    if (dd.foto !== antes) dd.foto_alterada = true;
    delete dd.foto_pendente;
    if (!gravarRasc(r, dd)) { $('#aviso').innerHTML = avisoHTML('Sem espaço no aparelho para guardar a foto.', 'erro'); return; }
    ir(volta);
  };
  focarTitulo();
}

// ─── CÂMERA (página própria) ────────────────────────────────────────────────
async function telaCamera() {
  const { r, volta } = contextoFoto();
  const urlFoto = `${BASE}foto/?r=${encodeURIComponent(r)}&volta=${encodeURIComponent(volta)}`;
  if (!lerRasc(r)) { ir(volta); return; }
  pagina({
    titulo: 'Tirar foto', voltar: urlFoto,
    corpo: `<div id="aviso"></div>
      <video class="camera-video" id="video" playsinline muted autoplay aria-label="Imagem da câmera"></video>
      <label class="btn btn-suave" for="nativa" id="alternativa" hidden style="cursor:pointer">Abrir a câmera do aparelho</label>
      <input id="nativa" type="file" accept="image/*" capture="environment" class="sr-only">`,
    acoes: `<button type="button" class="btn btn-linha" id="trocar" hidden>Trocar câmera</button>
      <button type="button" class="btn btn-cheio" id="clicar" disabled>Fotografar</button>`
  });
  const video = $('#video'), aviso = $('#aviso');
  let stream = null, frente = false;
  const parar = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
  window.addEventListener('pagehide', parar);
  const usar = (p) => { const dd = { ...lerRasc(r), foto_pendente: p }; parar(); if (gravarRasc(r, dd)) location.replace(urlFoto); else aviso.innerHTML = avisoHTML('Sem espaço no aparelho para guardar a foto.', 'erro'); };
  const alternativa = (msg) => {
    aviso.innerHTML = avisoHTML(msg, 'erro');
    video.hidden = true; $('#clicar').hidden = true; $('#trocar').hidden = true; $('#alternativa').hidden = false;
  };
  $('#nativa').onchange = async (e) => {
    const arq = e.target.files && e.target.files[0]; e.target.value = '';
    if (!arq) return;
    try { usar(await arquivoParaFoto(arq)); } catch (err) { aviso.innerHTML = avisoHTML(MSG_ARQ[err.message] || MSG_ARQ.ler, 'erro'); }
  };
  async function ligar() {
    parar();
    $('#clicar').disabled = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: frente ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      video.srcObject = stream;
      video.classList.toggle('espelho', frente);
      await video.play().catch(() => {});
      $('#clicar').disabled = false;
      const cams = (await navigator.mediaDevices.enumerateDevices()).filter(x => x.kind === 'videoinput');
      $('#trocar').hidden = cams.length < 2;
      aviso.innerHTML = '';
    } catch (err) {
      const n = err && err.name;
      if (n === 'NotAllowedError' || n === 'SecurityError') alternativa('A permissão da câmera foi negada. Para liberar, toque no cadeado ao lado do endereço do site e permita a câmera — ou use a opção abaixo.');
      else if (n === 'NotFoundError' || n === 'OverconstrainedError') alternativa('Nenhuma câmera foi encontrada neste aparelho. Você pode escolher uma foto da galeria.');
      else if (n === 'NotSupportedError') alternativa('Este navegador não permite usar a câmera aqui. Use a câmera do aparelho pela opção abaixo ou escolha da galeria.');
      else if (n === 'NotReadableError') alternativa('A câmera está sendo usada por outro aplicativo. Feche-o e tente de novo, ou use a opção abaixo.');
      else alternativa('Não foi possível abrir a câmera. Tente a opção abaixo ou escolha da galeria.');
    }
  }
  if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alternativa('A câmera não está disponível neste navegador. Use a câmera do aparelho pela opção abaixo ou escolha uma foto da galeria.');
  } else ligar();
  $('#trocar').onclick = () => { frente = !frente; ligar(); };
  $('#clicar').onclick = () => {
    if (!video.videoWidth) return;
    const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
    const g = c.getContext('2d');
    if (frente) { g.translate(c.width, 0); g.scale(-1, 1); }
    g.drawImage(video, 0, 0);
    usar(comprimir(c, c.width, c.height));
  };
  focarTitulo();
}

// ─── 8. PERFIL ──────────────────────────────────────────────────────────────
async function carregarCliente(id) {
  if (!id) return { ok: false, msg: 'Cliente não informada.' };
  return api('ver', { id });
}
function telaErro(titulo, msg, voltar = BASE, voltarTexto = 'Clientes') {
  pagina({ titulo, voltar, voltarTexto, corpo: avisoHTML(esc(msg), 'erro'), acoes: `<a class="btn btn-cheio" href="${voltar}">${esc(voltarTexto === 'Clientes' ? 'Voltar à lista' : voltarTexto)}</a>` });
  focarTitulo();
}
function carregandoTela(titulo) { pagina({ titulo, corpo: avisoHTML('Carregando…') }); }

async function telaPerfil() {
  const id = params.get('id');
  carregandoTela('Perfil da cliente');
  const r = await carregarCliente(id);
  if (!r.ok) return telaErro('Perfil da cliente', r.msg || 'Não foi possível abrir o perfil.');
  const c = r.cliente;
  const q = encodeURIComponent(id);
  pagina({
    titulo: 'Perfil da cliente', voltar: BASE, voltarTexto: 'Clientes',
    corpo: `${params.get('salvo') ? avisoHTML('Cadastro salvo com sucesso.', 'ok') : ''}
      <div class="perfil-cabeca">${avatarHTML(c.nome, c.foto, true)}
        <h2>${esc(c.nome)}</h2>${c.apelido ? `<p>Prefere ser chamada de “${esc(c.apelido)}”</p>` : ''}<p class="status-imagem" id="status-imagem" aria-live="polite"></p></div>
      <nav class="menu-botoes grade-2" aria-label="Informações da cliente">
        <a class="btn btn-suave" href="${BASE}perfil/dados/?id=${q}">Dados pessoais</a>
        <a class="btn btn-suave" href="${BASE}perfil/contato/?id=${q}">Contato</a>
        <a class="btn btn-suave" href="${BASE}perfil/preferencias/?id=${q}">Preferências e observações</a>
        <a class="btn btn-suave" href="/brow-studio/anamnese/?cliente=${q}">Fichas de anamnese</a>
        <a class="btn btn-suave" href="/brow-studio/termos/?cliente=${q}">Termos e autorizações</a>
        <a class="btn btn-suave" href="/brow-studio/registros/?cliente=${q}">Atendimentos realizados</a>
        <a class="btn btn-suave" href="/brow-studio/retornos/?cliente=${q}">Retornos e retoques</a>
        <a class="btn btn-suave" href="/brow-studio/orcamentos/?cliente=${q}">Propostas e pacotes</a>
      </nav>`,
    acoes: `<a class="btn btn-linha" href="${BASE}">${SETA} Voltar à lista</a><a class="btn btn-cheio" href="${BASE}editar/?id=${q}">Editar cadastro</a>`
  });
  if (params.get('salvo')) { const u = new URL(location.href); u.searchParams.delete('salvo'); history.replaceState(null, '', u); }
  // situação ATUAL da autorização de divulgação de imagem (a foto do cadastro não é autorização)
  api('tm_imagem_cliente', { query: { cliente: id } }).then(s => {
    if (!s || !s.ok) return;
    const CAN = { instagram: 'Instagram', portfolio: 'portfólio' };
    const txt = s.situacao === 'autoriza' ? `Divulgação de imagem: autorizada (${(s.canais || []).map(x => CAN[x]).join(' e ')})` : s.situacao === 'nao_autoriza' ? 'Divulgação de imagem: não autorizada'
      : s.situacao === 'retirada' ? 'Divulgação de imagem: autorização retirada' : 'Divulgação de imagem: sem autorização registrada';
    const el = $('#status-imagem'); if (el) { el.textContent = txt; el.className = 'status-imagem ' + (s.situacao === 'autoriza' ? 'ok' : 'nao'); }
  });
  focarTitulo();
}
async function telaPerfilParte(parte) {
  const id = params.get('id'); const q = encodeURIComponent(id);
  const T = { dados: 'Dados pessoais', contato: 'Contato', preferencias: 'Preferências e observações' }[parte];
  carregandoTela(T);
  const r = await carregarCliente(id);
  if (!r.ok) return telaErro(T, r.msg || 'Não foi possível abrir.', `${BASE}perfil/?id=${q}`, 'Perfil');
  const c = r.cliente;
  let corpo = '', editar = '';
  if (parte === 'dados') {
    corpo = `<div style="display:flex;gap:14px;align-items:center">${avatarHTML(c.nome, c.foto)}<strong style="font-size:20px;color:var(--marrom-escuro)">${esc(c.nome)}</strong></div>` +
      blocoResumo('Dados pessoais', [['Nome completo', c.nome], ['Prefere ser chamada', c.apelido], ['Nascimento', c.nascimento ? formatarData(c.nascimento) : ''], ['Foto', c.foto ? 'Com foto' : 'Sem foto']]);
    editar = `${BASE}editar/dados/?id=${q}`;
  } else if (parte === 'contato') {
    corpo = blocoResumo('Contato', [['Telefone', formatarTelefone(c.telefone)], ['E-mail', c.email], ['Contato preferido', CONTATOS[c.contato_pref]]]);
    editar = `${BASE}editar/contato/?id=${q}`;
  } else {
    corpo = blocoResumo('Preferências', [['Como conheceu', ORIGENS[c.origem]], ['Lembretes de agendamento', c.lembretes ? 'Sim' : 'Não'], ['Novidades e promoções', c.novidades ? 'Sim' : 'Não']], `${BASE}editar/preferencias/?id=${q}`)
      + blocoResumo('Observações', [['Anotações', c.observacoes]], `${BASE}editar/observacoes/?id=${q}`);
  }
  pagina({
    titulo: T, voltar: `${BASE}perfil/?id=${q}`, voltarTexto: 'Perfil',
    corpo: `<div class="resumo">${corpo}</div>`,
    acoes: `<a class="btn btn-linha" href="${BASE}perfil/?id=${q}">${SETA} Voltar ao perfil</a>${editar ? `<a class="btn btn-cheio" href="${editar}">Editar</a>` : ''}`
  });
  focarTitulo();
}

// ─── EDIÇÃO ─────────────────────────────────────────────────────────────────
function telaEditarMenu() {
  const id = params.get('id'); const q = encodeURIComponent(id);
  pagina({
    titulo: 'Editar cadastro', voltar: `${BASE}perfil/?id=${q}`, voltarTexto: 'Perfil',
    corpo: `<p>O que você quer alterar?</p>
      <nav class="menu-botoes" aria-label="Partes do cadastro">
        <a class="btn btn-suave" href="${BASE}editar/dados/?id=${q}">Dados pessoais e foto</a>
        <a class="btn btn-suave" href="${BASE}editar/contato/?id=${q}">Contato</a>
        <a class="btn btn-suave" href="${BASE}editar/preferencias/?id=${q}">Preferências</a>
        <a class="btn btn-suave" href="${BASE}editar/observacoes/?id=${q}">Observações</a>
      </nav>`,
    acoes: `<a class="btn btn-linha" href="${BASE}perfil/?id=${q}">${SETA} Voltar ao perfil</a>`
  });
  focarTitulo();
}
const EDICOES = {
  dados: { titulo: 'Editar dados pessoais', form: formDados, ler: lerDados, erros: errosDados, campos: ['nome', 'apelido', 'nascimento'] },
  contato: { titulo: 'Editar contato', form: formContato, ler: lerContato, erros: errosContato, campos: ['telefone', 'email', 'contato_pref'] },
  preferencias: { titulo: 'Editar preferências', form: formPreferencias, ler: lerPreferencias, erros: () => ({}), campos: ['origem', 'lembretes', 'novidades'] },
  observacoes: { titulo: 'Editar observações', form: formObservacoes, ler: lerObservacoes, erros: () => ({}), campos: ['observacoes'] }
};
async function telaEditar(parte) {
  const cfg = EDICOES[parte];
  const id = params.get('id'); const q = encodeURIComponent(id);
  const R = 'editar:' + id;
  const perfil = `${BASE}perfil/?id=${q}`;
  let d = lerRasc(R);
  if (!d) {                                   // primeira vez: traz o que está salvo
    carregandoTela(cfg.titulo);
    const r = await carregarCliente(id);
    if (!r.ok) return telaErro(cfg.titulo, r.msg || 'Não foi possível abrir.', perfil, 'Perfil');
    const c = r.cliente;
    d = { ...c, contato_pref: c.contato_pref || '', origem: c.origem || '', foto_mini: null };
    if (!gravarRasc(R, d)) { d.foto = c.foto; }
  }
  const form = pagina({
    titulo: cfg.titulo, voltar: perfil, voltarTexto: 'Perfil', formulario: true,
    corpo: cfg.form(d) + (parte === 'dados' && d.foto_alterada ? avisoHTML(d.foto ? 'Foto nova escolhida — será gravada ao salvar.' : 'A foto será removida ao salvar.') : '') + '<div id="aviso"></div>',
    acoes: `<a class="btn btn-linha" href="${perfil}" id="cancelar">Cancelar</a><button type="submit" class="btn btn-cheio" id="salvar">Salvar alterações</button>`
  });
  if (parte === 'contato') ligarMascara(form);
  const guardar = () => gravarRasc(R, { ...lerRasc(R), ...cfg.ler(form) });
  form.addEventListener('input', guardar); form.addEventListener('change', guardar);
  $('#cancelar').onclick = () => apagarRasc(R);
  const foto = $('#ir-foto');
  if (foto) foto.onclick = (e) => { e.preventDefault(); guardar(); ir(`${BASE}foto/?r=${encodeURIComponent(R)}&volta=${encodeURIComponent(`${BASE}editar/dados/?id=${q}`)}`); };
  let enviando = false;
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (enviando) return;
    const dados = cfg.ler(form);
    if (!mostrarErros(form, cfg.erros(dados))) return;
    const atual = { ...lerRasc(R), ...dados };
    const corpo = {};
    cfg.campos.forEach(k => { corpo[k] = atual[k] === '' ? null : atual[k]; });
    if (parte === 'dados' && atual.foto_alterada) { corpo.foto = atual.foto || null; if (atual.foto) corpo.foto_mini = atual.foto_mini; }
    enviando = true;
    const b = $('#salvar'); b.disabled = true; b.setAttribute('aria-busy', 'true'); b.textContent = 'Salvando…';
    const r = await api('atualizar', { id, corpo });
    if (r.ok) { apagarRasc(R); location.replace(perfil + '&salvo=1'); return; }
    enviando = false; b.disabled = false; b.removeAttribute('aria-busy'); b.textContent = 'Tentar novamente';
    if (r.erro === 'validacao' && r.erros) { mostrarErros(form, r.erros); }
    $('#aviso').innerHTML = avisoHTML(`${esc(r.erro === 'validacao' ? 'Confira os campos destacados.' : (r.msg || 'Não foi possível salvar.'))}<br><small>O que você digitou continua aqui.</small>`, 'erro');
  };
  focarTitulo();
}

// ─── roteamento ─────────────────────────────────────────────────────────────
const TELAS = {
  lista: telaLista,
  'nova-dados': () => telaEtapaNova('nova-dados'),
  'nova-contato': () => telaEtapaNova('nova-contato'),
  'nova-preferencias': () => telaEtapaNova('nova-preferencias'),
  'nova-observacoes': () => telaEtapaNova('nova-observacoes'),
  'nova-conferencia': () => telaConferencia(1),
  'nova-conferencia-final': () => telaConferencia(2),
  foto: telaFoto,
  camera: telaCamera,
  perfil: telaPerfil,
  'perfil-dados': () => telaPerfilParte('dados'),
  'perfil-contato': () => telaPerfilParte('contato'),
  'perfil-preferencias': () => telaPerfilParte('preferencias'),
  editar: telaEditarMenu,
  'editar-dados': () => telaEditar('dados'),
  'editar-contato': () => telaEditar('contato'),
  'editar-preferencias': () => telaEditar('preferencias'),
  'editar-observacoes': () => telaEditar('observacoes')
};
(TELAS[document.body.dataset.pagina] || telaLista)();
// Ao voltar pelo botão do navegador (cache de página), redesenha com o rascunho atual
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
