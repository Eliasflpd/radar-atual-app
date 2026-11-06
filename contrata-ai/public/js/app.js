import { temContato } from './filtro.js';

const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
const DEMO = !!window.CONTRATA_DEMO;

// ---------------------------------------------------------------- utilidades
const $app = document.getElementById('app');
const $nav = document.getElementById('nav');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');
const hora = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const estrelas = (n) => { const r = Math.round(Number(n) || 0); return '★'.repeat(r) + '☆'.repeat(5 - r); };
const iniciais = (nome) => esc((nome || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase());
const TAXA = 0.10;
const ICONES = {
  busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  pedidos: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  admin: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
  entrar: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  cadeado: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  aberto: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/>',
  pessoas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  dinheiro: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/>',
  estrela: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.5"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  enviar: '<path d="M4 12 20 4l-6 16-3-7-7-1Z"/>',
  voltar: '<path d="m15 5-7 7 7 7"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  documento: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 16.5a3.5 3.5 0 0 1 7 0M15 10h3M15 13.5h3"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alerta: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17.2v.3"/>',
};
const ic = (nome, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome] || ''}</svg>`;
const SELO = `<span class="selo" title="Identidade verificada com documento e selfie">${ic('check')}Verificado</span>`;
const notaHTML = (media, qtd) => `<span class="nota-chip">${ic('estrela')}<b>${Number(media || 0).toFixed(1)}</b><span>(${qtd || 0})</span></span>`;
const ATALHOS = ['Pedreiro', 'Eletricista', 'Ajudante geral', 'Diarista / Limpeza', 'Encanador', 'Pintor', 'Designer', 'Técnico em informática'];
const STATUS = { proposta: 'Aguardando pagamento', paga: 'Paga — em andamento', concluida: 'Concluída', cancelada: 'Cancelada' };
const AVISO_CONTATO = 'Não é permitido passar telefone, WhatsApp, e-mail ou redes sociais antes da contratação. '
  + 'Depois do pagamento pelo app o contato é liberado automaticamente. (3 tentativas = conta suspensa)';

let sb, me = null, categorias = [], canais = [];

function toast(msg, tipo = '') {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}
const falha = (e) => toast(e?.message || String(e), 'erro');
const avatar = (p, cls = '') => p?.foto_url
  ? `<img class="avatar ${cls}" src="${esc(p.foto_url)}" alt="">`
  : `<div class="avatar ${cls}">${iniciais(p?.nome)}</div>`;
const nomeCategoria = (id) => { const c = categorias.find((x) => x.id === id); return c ? esc(c.nome) : ''; };
const form = (el) => Object.fromEntries(new FormData(el));

// ---------------------------------------------------------------- fotos
const MAX_FOTOS = 12;
// Reduz a foto no celular antes de enviar (mais rápido e economiza espaço)
async function reduzirImagem(file, max = DEMO ? 900 : 1280, qualidade = DEMO ? 0.72 : 0.82) {
  let img;
  try { img = await createImageBitmap(file); } catch {
    img = await new Promise((ok, falhou) => { const i = new Image(); i.onload = () => ok(i); i.onerror = falhou; i.src = URL.createObjectURL(file); });
  }
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', qualidade));
}
async function subirFoto(file, prefixo, bucket = 'fotos') {
  if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" não é uma imagem.`);
  // documentos precisam de mais resolução para dar para ler
  const blob = bucket === 'documentos' ? await reduzirImagem(file, DEMO ? 1000 : 1800, 0.85) : await reduzirImagem(file);
  const caminho = `${me.id}/${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await sb.storage.from(bucket).upload(caminho, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return { caminho, url: bucket === 'fotos' ? sb.storage.from('fotos').getPublicUrl(caminho).data.publicUrl : '' };
}
// CPF: confere os dígitos verificadores
function cpfValido(cpf) {
  const c = String(cpf || '').replace(/\D/g, '');
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(c[i]) * (t + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(c[t])) return false;
  }
  return true;
}
const formatarCpf = (c) => String(c || '').replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
const galeriaHTML = (fotos, podeApagar) => fotos.map((f, i) => `<figure>
  <button class="foto" data-i="${i}" aria-label="Ampliar foto${f.legenda ? ': ' + esc(f.legenda) : ''}"><img src="${esc(f.url)}" alt="${esc(f.legenda)}" loading="lazy"></button>
  ${f.legenda ? `<figcaption>${esc(f.legenda)}</figcaption>` : ''}
  ${podeApagar ? `<button class="apagar" data-apagar="${f.id}" aria-label="Apagar foto">✕</button>` : ''}</figure>`).join('');
function abrirFoto(fotos, i) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo foto-grande';
  const mostrar = () => {
    const f = fotos[i];
    fundo.innerHTML = `<figure><img src="${esc(f.url)}" alt="${esc(f.legenda)}">${f.legenda ? `<figcaption>${esc(f.legenda)}</figcaption>` : ''}</figure>
      ${fotos.length > 1 ? '<button class="nav-foto ant" data-d="-1" aria-label="Anterior">‹</button><button class="nav-foto prox" data-d="1" aria-label="Próxima">›</button>' : ''}
      <button class="fechar" aria-label="Fechar">✕</button><div class="contador">${i + 1} / ${fotos.length}</div>`;
  };
  fundo.addEventListener('click', (e) => {
    const d = e.target.dataset?.d;
    if (d) { i = (i + Number(d) + fotos.length) % fotos.length; mostrar(); return; }
    if (e.target === fundo || e.target.classList.contains('fechar')) fundo.remove();
  });
  mostrar();
  document.body.appendChild(fundo);
}
async function apagarFoto(id, fotos) {
  const f = fotos.find((x) => String(x.id) === String(id));
  if (!f || !(await confirmar('Apagar esta foto?', 'Apagar'))) return false;
  const { error } = await sb.from('fotos_trabalhos').delete().eq('id', f.id);
  if (error) { falha(error); return false; }
  await sb.storage.from('fotos').remove([f.caminho]);
  toast('Foto apagada.');
  return true;
}

// Confirmação dentro da página (não usa confirm() do navegador)
function confirmar(msg, ok = 'Confirmar') {
  return new Promise((resolve) => {
    const fundo = document.createElement('div');
    fundo.className = 'modal-fundo';
    fundo.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><p>${esc(msg)}</p>
      <div class="acoes"><button class="btn sec" data-r="0">Voltar</button><button class="btn" data-r="1">${esc(ok)}</button></div></div>`;
    fundo.addEventListener('click', (e) => {
      const r = e.target.dataset?.r;
      if (r === undefined && e.target !== fundo) return;
      fundo.remove();
      resolve(r === '1');
    });
    document.body.appendChild(fundo);
    fundo.querySelector('[data-r="1"]').focus();
  });
}

// ---------------------------------------------------------------- início
async function iniciar() {
  if (DEMO) {
    sb = (await import('./demo.js')).criarDemo();
  } else {
    const cfg = await fetch('/api/config').then((r) => r.json()).catch(() => ({}));
    if (!cfg.supabaseUrl) {
      $app.innerHTML = '<div class="card">Configure <b>SUPABASE_URL</b> e <b>SUPABASE_ANON_KEY</b> nas variáveis de ambiente da Vercel.</div>';
      return;
    }
    const { createClient } = await import(SUPABASE_CDN);
    sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }
  const { data: { session } } = await sb.auth.getSession();
  await carregarMe(session);
  const cats = await sb.from('categorias').select('*').order('nome');
  categorias = cats.data || [];
  sb.auth.onAuthStateChange((evento, s) => {
    if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT') setTimeout(async () => { await carregarMe(s); renderNav(); rota(); }, 0);
  });
  renderNav();
  window.addEventListener('hashchange', rota);
  rota();
  if (!DEMO && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

async function carregarMe(session) {
  if (!session) { me = null; return; }
  const { data: p } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  me = p ? { ...p, email: session.user.email } : null;
}

function renderNav() {
  const aba = (href, icone, rotulo, chave) => `<a href="${href}" data-aba="${chave}">${ic(icone)}<span>${rotulo}</span></a>`;
  $nav.innerHTML = (me
    ? aba('#/', 'busca', 'Buscar', '') + aba('#/pedidos', 'pedidos', 'Pedidos', 'pedidos') + aba('#/conversas', 'chat', 'Conversas', 'conversas')
      + aba('#/perfil', 'perfil', 'Perfil', 'perfil') + (me.is_admin ? aba('#/admin', 'admin', 'Admin', 'admin') : '')
    : aba('#/', 'busca', 'Buscar', '') + aba('#/pedidos', 'pedidos', 'Pedidos', 'pedidos') + aba('#/entrar', 'entrar', 'Entrar', 'entrar'));
  const $cta = document.getElementById('topo-acao');
  if ($cta) $cta.innerHTML = me ? `<a class="topo-eu" href="#/perfil" aria-label="Meu perfil">${avatar(me, 'mini')}</a>` : '<a class="btn pequeno" href="#/cadastro">Criar conta</a>';
  marcarAba();
}
function marcarAba() {
  const tela = location.hash.slice(2).split(/[/?]/)[0];
  const atual = { chat: 'conversas', p: '', verificar: 'perfil', cadastro: 'entrar' }[tela] ?? tela;
  $nav.querySelectorAll('a').forEach((a) => a.classList.toggle('ativa', a.dataset.aba === atual));
}

async function rota() {
  canais.forEach((c) => sb.removeChannel(c));
  canais = [];
  const [caminho, qs] = location.hash.slice(1).split('?');
  const [tela, id] = (caminho || '/').split('/').filter(Boolean);
  const params = new URLSearchParams(qs || '');
  marcarAba();
  document.body.dataset.tela = tela || 'inicio';
  if (['conversas', 'chat', 'perfil', 'admin', 'verificar'].includes(tela) && !me) { location.hash = '#/entrar'; return; }
  $app.innerHTML = '<div class="carregando">Carregando…</div>';
  window.scrollTo(0, 0);
  try {
    if (!tela) return await telaInicio();
    if (tela === 'entrar') return telaEntrar();
    if (tela === 'cadastro') return telaCadastro();
    if (tela === 'p') return await telaPrestador(id);
    if (tela === 'conversas') return await telaConversas();
    if (tela === 'chat') return await telaChat(id, params);
    if (tela === 'perfil') return await telaPerfil();
    if (tela === 'admin') return me.is_admin ? await telaAdmin() : (location.hash = '#/');
    if (tela === 'termos') return telaTermos();
    if (tela === 'pedidos') return await telaPedidos();
    if (tela === 'verificar') return await telaVerificar();
    $app.innerHTML = '<div class="card">Página não encontrada.</div>';
  } catch (e) {
    $app.innerHTML = `<div class="card erro">Erro: ${esc(e.message)}</div>`;
  }
}

// ---------------------------------------------------------------- busca
async function telaInicio() {
  const opcoes = categorias.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  const atalhos = ATALHOS.map((n) => categorias.find((c) => c.nome === n)).filter(Boolean);
  $app.innerHTML = `
    <section class="hero">
      <div class="hero-txt">
        ${me ? `<p class="sobre">Olá, ${esc(me.nome.split(' ')[0])}</p><h1>Quem você precisa hoje?</h1>`
          : `<p class="sobre">Profissionais de qualquer área</p><h1>Contrate quem faz.<br>Ofereça o que você sabe fazer.</h1>
             <p class="hero-sub">Do pedreiro ao designer, de pessoas a empresas. Você conversa no app, paga com segurança e só então recebe o contato.</p>`}
      </div>
      <form class="busca" id="busca">
        <label class="campo-busca">${ic('busca')}<input name="q" placeholder="O que você precisa? Ex: reboco, tomada" aria-label="O que você precisa"></label>
        <div class="busca-linha">
          <select name="cat" id="busca-cat" aria-label="Área"><option value="">Todas as áreas</option>${opcoes}</select>
          <label class="campo-busca">${ic('pin')}<input name="cidade" placeholder="Cidade" aria-label="Cidade"></label>
          <button class="btn">Buscar</button>
        </div>
      </form>
      <div class="fita" aria-hidden="true"></div>
    </section>
    <div class="atalhos" id="atalhos">${atalhos.map((c) => `<button type="button" data-cat="${c.id}">${esc(c.nome)}</button>`).join('')}</div>
    ${me ? '' : `<div class="passos-home">
      <div><b>1</b><span>Encontre e converse pelo chat</span></div>
      <div><b>2</b><span>Pague a proposta pelo app</span></div>
      <div><b>3</b><span>O WhatsApp é liberado para os dois</span></div></div>`}
    <div class="secao-tit"><h2 id="tit-res">Profissionais em destaque</h2><a href="#/pedidos">Ver pedidos de empresas</a></div>
    <div class="grade" id="resultados"></div>`;
  document.getElementById('atalhos').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    const ativo = b.classList.toggle('ativo');
    document.querySelectorAll('#atalhos button').forEach((x) => x !== b && x.classList.remove('ativo'));
    document.getElementById('busca-cat').value = ativo ? b.dataset.cat : '';
    buscar(form(document.getElementById('busca'))).catch(falha);
  });
  const buscar = async (f = {}) => {
    let q = sb.from('profiles')
      .select('id,nome,cidade,uf,bio,foto_url,categoria_id,preco_base,verificado,avaliacao_media,avaliacao_qtd')
      .eq('is_prestador', true).eq('suspenso', false)
      .order('verificado', { ascending: false }).order('avaliacao_media', { ascending: false }).limit(60);
    if (f.cat) q = q.eq('categoria_id', f.cat);
    if (f.cidade) q = q.ilike('cidade', `%${f.cidade.trim()}%`);
    if (f.q) { const t = f.q.trim().replace(/[,()%]/g, ' '); q = q.or(`nome.ilike.%${t}%,bio.ilike.%${t}%`); }
    const { data: lista, error } = await q;
    if (error) throw error;
    const ids = lista.map((p) => p.id);
    const { data: fts } = ids.length
      ? await sb.from('fotos_trabalhos').select('user_id,url').in('user_id', ids).order('criado_em', { ascending: false })
      : { data: [] };
    const fotosDe = {};
    (fts || []).forEach((f) => (fotosDe[f.user_id] ||= []).push(f.url));
    const cat = categorias.find((c) => String(c.id) === String(f.cat));
    document.getElementById('tit-res').textContent = cat ? `${cat.nome} · ${lista.length} encontrados` : (f.q || f.cidade ? `${lista.length} encontrados` : 'Profissionais em destaque');
    document.getElementById('resultados').innerHTML = lista.length
      ? lista.map((p) => cardPrestador(p, fotosDe[p.id] || [])).join('')
      : '<div class="card vazio">Nenhum profissional encontrado com esses filtros.</div>';
  };
  document.getElementById('busca').addEventListener('submit', (e) => { e.preventDefault(); buscar(form(e.target)).catch(falha); });
  await buscar();
}

function cardPrestador(p, fotos = []) {
  const cat = nomeCategoria(p.categoria_id);
  return `<a class="prestador" href="#/p/${p.id}">
    <div class="capa ${fotos.length ? '' : 'sem-foto'}">
      ${fotos.length ? `<img src="${esc(fotos[0])}" alt="" loading="lazy">${fotos.length > 1 ? `<span class="qtd-fotos">${ic('camera')}${fotos.length}</span>` : ''}`
        : `<span class="letra">${esc((cat || '?')[0])}</span>`}
    </div>
    <div class="corpo">
      ${avatar(p, 'sobre-capa')}
      <div class="linha-nome"><h3>${esc(p.nome)}</h3>${p.verificado ? `<span class="verif-ic" title="Identidade verificada">${ic('check')}</span>` : ''}</div>
      <div class="cat">${cat}</div>
      <div class="meta">${ic('pin')}${esc(p.cidade)}${p.uf ? ' · ' + esc(p.uf) : ''}</div>
      <div class="rodape-card">${notaHTML(p.avaliacao_media, p.avaliacao_qtd)}
        ${p.preco_base ? `<span class="preco-card"><small>a partir de</small>${brl(p.preco_base)}</span>` : ''}</div>
    </div></a>`;
}

// ---------------------------------------------------------------- autenticação
function telaEntrar() {
  $app.innerHTML = `<form class="card estreito" id="f">
    <h2>Entrar</h2>
    <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
    <label>Senha<input name="senha" type="password" required autocomplete="current-password"></label>
    <button class="btn">Entrar</button>
    <p class="nota">Não tem conta? <a href="#/cadastro">Cadastre-se</a> · <a href="#" id="esqueci">Esqueci a senha</a></p>
  </form>`;
  const f = document.getElementById('f');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = form(f);
    const { error } = await sb.auth.signInWithPassword({ email: v.email, password: v.senha });
    if (error) return toast('E-mail ou senha incorretos.', 'erro');
    location.hash = '#/';
  });
  document.getElementById('esqueci').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = f.email.value;
    if (!email) return toast('Digite seu e-mail primeiro.');
    await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/#/perfil` });
    toast('Se o e-mail existir, enviamos um link para redefinir a senha.');
  });
}

function telaCadastro() {
  $app.innerHTML = `<form class="card estreito" id="f">
    <h2>Criar conta grátis</h2>
    <p class="nota">Uma conta só serve para oferecer <b>e</b> contratar serviços.</p>
    <label>Nome completo<input name="nome" required minlength="3"></label>
    <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
    <label>Senha<input name="senha" type="password" required minlength="6" autocomplete="new-password"></label>
    <label>WhatsApp<input name="whatsapp" inputmode="tel" placeholder="(11) 99999-9999" required>
      <small>${ic('cadeado')}Fica escondido. Só aparece para a outra pessoa depois que a contratação for paga pelo app.</small></label>
    <fieldset><legend>O que você quer fazer?</legend>
      <label class="check"><input type="checkbox" name="contratar" checked> Quero contratar serviços</label>
      <label class="check"><input type="checkbox" name="prestar"> Quero oferecer meus serviços</label>
    </fieldset>
    <label class="check"><input type="checkbox" name="maior" required> Tenho 18 anos ou mais</label>
    <label class="check"><input type="checkbox" name="termos" required> Li e aceito os <a href="#/termos" target="_blank">Termos de Uso e Privacidade</a></label>
    <button class="btn">Criar conta</button>
    <p class="nota">Já tem conta? <a href="#/entrar">Entrar</a></p>
  </form>`;
  const f = document.getElementById('f');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = form(f);
    const zap = v.whatsapp.replace(/\D/g, '');
    if (zap.length < 10 || zap.length > 11) return toast('WhatsApp inválido. Use DDD + número.', 'erro');
    if (!v.contratar && !v.prestar) return toast('Escolha pelo menos uma opção.', 'erro');
    if (temContato(v.nome)) return toast('Use apenas seu nome.', 'erro');
    const { data: r, error } = await sb.auth.signUp({
      email: v.email, password: v.senha,
      options: {
        emailRedirectTo: `${location.origin}/#/perfil`,
        data: { nome: v.nome.trim(), whatsapp: zap, is_prestador: !!v.prestar, is_contratante: !!v.contratar },
      },
    });
    if (error) return falha(error);
    if (!r.session) {
      $app.innerHTML = '<div class="card estreito"><h2>Quase lá! </h2><p>Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar a conta.</p></div>';
      return;
    }
    toast('Conta criada!');
    location.hash = v.prestar ? '#/perfil' : '#/';
  });
}

function telaTermos() {
  $app.innerHTML = `<div class="card texto">
    <h2>Termos de Uso e Privacidade</h2>
    <p><b>Atenção: este é um modelo inicial. Revise com um advogado antes de lançar.</b></p>
    <ol>
      <li>A plataforma conecta prestadores de serviço e contratantes. O cadastro é gratuito para maiores de 18 anos.</li>
      <li>Toda contratação deve ser paga pelo app. A plataforma retém <b>10% do valor</b>, descontados do prestador, e repassa o restante após o contratante confirmar a conclusão do serviço.</li>
      <li>É proibido trocar telefone, WhatsApp, e-mail, redes sociais ou qualquer contato antes do pagamento. Tentativas são bloqueadas e registradas; após 3 tentativas a conta é suspensa.</li>
      <li>Depois do pagamento, o WhatsApp das duas partes é liberado para combinar os detalhes do serviço.</li>
      <li>O prestador é responsável pela qualidade e execução do serviço. As avaliações só podem ser feitas sobre serviços pagos pelo app.</li>
      <li>Dados pessoais (LGPD): coletamos nome, e-mail, WhatsApp, cidade e dados das contratações apenas para operar a plataforma. Você pode pedir a exclusão da conta a qualquer momento.</li>
    </ol></div>`;
}

// ---------------------------------------------------------------- perfil público do prestador
async function telaPrestador(id) {
  const [{ data: p }, { data: fotosRes }, { data: avs }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', id).maybeSingle(),
    sb.from('fotos_trabalhos').select('*').eq('user_id', id).order('criado_em', { ascending: false }),
    sb.from('avaliacoes').select('nota,comentario,criado_em,autor:autor_id(nome)').eq('prestador_id', id).order('criado_em', { ascending: false }).limit(30),
  ]);
  let fotos = fotosRes || [];
  if (!p || !p.is_prestador) { $app.innerHTML = '<div class="card">Profissional não encontrado.</div>'; return; }
  const desde = new Date(p.criado_em).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  $app.innerHTML = `<a class="voltar" href="#/">${ic('voltar')}Voltar</a>
    <section class="perfil-publico">
      <div class="perfil-capa"><div class="fita" aria-hidden="true"></div></div>
      <div class="perfil-cab">
        ${avatar(p, 'grande')}
        <div class="perfil-nome"><h1>${esc(p.nome)}</h1>
          <div class="cat">${nomeCategoria(p.categoria_id)}</div>
          <div class="meta">${ic('pin')}${esc(p.cidade)}${p.uf ? ' · ' + esc(p.uf) : ''}</div></div>
        ${p.verificado ? SELO : ''}
      </div>
      <dl class="fatos">
        <div><dt>Avaliação</dt><dd>${ic('estrela')}${Number(p.avaliacao_media).toFixed(1)}</dd></div>
        <div><dt>Avaliações</dt><dd>${p.avaliacao_qtd}</dd></div>
        <div><dt>Desde</dt><dd>${esc(desde)}</dd></div>
        ${p.preco_base ? `<div><dt>A partir de</dt><dd>${brl(p.preco_base)}</dd></div>` : ''}
      </dl>
      <p class="bio">${esc(p.bio) || '<i>Sem descrição.</i>'}</p>
      <div class="cta-perfil">
        ${p.suspenso ? '<div class="alerta">Este profissional está temporariamente indisponível.</div>'
          : me?.id === p.id ? '<a class="btn sec" href="#/perfil">Editar meu perfil</a>'
          : `<button class="btn grande" id="conversar">${ic('chat')}Conversar e pedir orçamento</button>`}
        <p class="nota">${ic('cadeado')}O WhatsApp é liberado depois que você contratar e pagar pelo app.</p>
      </div>
    </section>
    ${fotos.length ? `<div class="secao-tit"><h2>Trabalhos realizados</h2><span class="meta">${fotos.length} fotos</span></div>
      <div class="galeria" id="galeria-pub">${galeriaHTML(fotos, me?.is_admin)}</div>` : ''}
    <div class="secao-tit"><h2>Avaliações</h2></div>
    ${(avs || []).map((a) => `<div class="card avaliacao"><div class="linha-esp"><b>${esc(a.autor?.nome)}</b><span class="estrelas" aria-label="${a.nota} de 5">${estrelas(a.nota)}</span></div>
      <div class="meta">${data(a.criado_em)}</div>${a.comentario ? `<p>${esc(a.comentario)}</p>` : ''}</div>`).join('') || '<div class="card vazio">Ainda sem avaliações.</div>'}`;
  document.getElementById('galeria-pub')?.addEventListener('click', async (e) => {
    const apagar = e.target.closest('[data-apagar]');
    if (apagar) { if (await apagarFoto(apagar.dataset.apagar, fotos)) rota(); return; }
    const b = e.target.closest('.foto');
    if (b) abrirFoto(fotos, Number(b.dataset.i));
  });
  document.getElementById('conversar')?.addEventListener('click', async () => {
    if (!me) { location.hash = '#/entrar'; return; }
    if (me.suspenso) return toast('Sua conta está suspensa.', 'erro');
    let { data: c } = await sb.from('conversas').select('id').eq('contratante_id', me.id).eq('prestador_id', p.id).maybeSingle();
    if (!c) {
      const r = await sb.from('conversas').insert({ contratante_id: me.id, prestador_id: p.id }).select('id').single();
      if (r.error) return falha(r.error);
      c = r.data;
    }
    location.hash = `#/chat/${c.id}`;
  });
}

// ---------------------------------------------------------------- conversas
async function telaConversas() {
  const { data: lista, error } = await sb.from('conversas')
    .select('id,criado_em,contratante:contratante_id(id,nome,foto_url),prestador:prestador_id(id,nome,foto_url)')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  $app.innerHTML = `<h1 class="tit-pagina">Conversas</h1>${lista.map((c) => {
    const souPrestador = c.prestador.id === me.id;
    const outro = souPrestador ? c.contratante : c.prestador;
    return `<a class="card linha" href="#/chat/${c.id}">${avatar(outro)}<div><b>${esc(outro.nome)}</b>
      <div class="meta">${souPrestador ? 'Cliente interessado no seu serviço' : 'Profissional'} · ${data(c.criado_em)}</div></div></a>`;
  }).join('') || '<div class="card vazio">Nenhuma conversa ainda. <a href="#/">Busque um profissional</a>.</div>'}`;
}

async function telaChat(id, params) {
  const { data: c, error } = await sb.from('conversas')
    .select('id,contratante_id,prestador_id,contratante:contratante_id(id,nome,foto_url,verificado),prestador:prestador_id(id,nome,foto_url,categoria_id,verificado)')
    .eq('id', id).maybeSingle();
  if (error) throw error;
  if (!c) { $app.innerHTML = '<div class="card">Conversa não encontrada.</div>'; return; }
  const souPrestador = c.prestador_id === me.id;
  const outro = souPrestador ? c.contratante : c.prestador;
  if (params.get('pago') === '1') toast('Pagamento enviado! Assim que o Mercado Pago confirmar, o contato é liberado.');
  if (params.get('pago') === '0') toast('O pagamento não foi concluído.', 'erro');

  $app.innerHTML = `<div class="chat">
    <div class="chat-topo"><a class="voltar-ic" href="#/conversas" aria-label="Voltar">${ic('voltar')}</a>${avatar(outro)}<div><b>${esc(outro.nome)}</b> ${outro.verificado ? `<span class="verif-ic" title="Identidade verificada">${ic('check')}</span>` : ''}
      <div class="meta">${souPrestador ? 'Cliente' : nomeCategoria(c.prestador.categoria_id)}</div></div></div>
    <div id="contratos"></div>
    <div class="mensagens" id="msgs"></div>
    ${me.suspenso ? '<div class="alerta">Sua conta está suspensa por tentativas de passar contato. Fale com o suporte.</div>' : `
    <form class="enviar" id="fmsg"><input name="t" placeholder="Escreva sua mensagem…" autocomplete="off" maxlength="2000" required aria-label="Mensagem"><button class="btn redondo" aria-label="Enviar">${ic('enviar')}</button></form>`}
  </div>`;

  let liberado = false;
  const $msgs = document.getElementById('msgs');
  const addMsg = (m) => {
    if (document.getElementById(`m${m.id}`)) return;
    $msgs.insertAdjacentHTML('beforeend', `<div id="m${m.id}" class="msg ${m.autor_id === me.id ? 'minha' : ''} ${m.bloqueada ? 'bloqueada' : ''}">${esc(m.texto)}<span>${hora(m.criado_em)}</span></div>`);
    $msgs.scrollTop = $msgs.scrollHeight;
  };

  const renderContratos = async () => {
    const { data: cts } = await sb.from('contratacoes').select('*').eq('conversa_id', id).order('criado_em');
    const { data: avs } = await sb.from('avaliacoes').select('contratacao_id').in('contratacao_id', (cts || []).map((x) => x.id));
    const avaliadas = new Set((avs || []).map((a) => a.contratacao_id));
    liberado = (cts || []).some((x) => ['paga', 'concluida'].includes(x.status));
    let contato = '';
    if (liberado) {
      const { data: k } = await sb.rpc('ver_contato', { outro: outro.id });
      const z = (k?.[0]?.whatsapp || '').replace(/\D/g, '');
      contato = `<div class="card liberado">${ic('aberto')}<b>Contato liberado.</b> Combine endereço e horário:
        ${z ? `<a class="btn zap" target="_blank" rel="noopener" href="https://wa.me/55${z}">WhatsApp de ${esc(outro.nome.split(' ')[0])}</a>` : ''}
        ${k?.[0]?.email ? `<div class="meta">${esc(k[0].email)}</div>` : ''}</div>`;
    }
    const cards = (cts || []).map((ct) => `<div class="card proposta ${ct.status}">
      <div class="linha-esp"><span class="eyebrow">Proposta</span><span class="status s-${ct.status}">${STATUS[ct.status]}</span></div>
      <p>${esc(ct.descricao)}</p>
      <div class="valor">${brl(ct.valor)}</div>
      ${souPrestador ? `<div class="meta">Taxa do app (10%): ${brl(ct.comissao)} · <b>Você recebe ${brl(ct.valor_prestador)}</b>${ct.repassado_em ? ` · repassado em ${data(ct.repassado_em)}` : ''}</div>` : ''}
      <div class="acoes">
        ${ct.status === 'proposta' && !souPrestador ? `<button class="btn" data-pagar="${ct.id}">Pagar e contratar</button>` : ''}
        ${ct.status === 'proposta' ? `<button class="btn sec" data-cancelar="${ct.id}">Cancelar</button>` : ''}
        ${ct.status === 'paga' && !souPrestador ? `<button class="btn" data-concluir="${ct.id}">Serviço foi feito</button>` : ''}
        ${ct.status === 'paga' && souPrestador ? '<span class="meta">Quando o cliente confirmar a conclusão, seu pagamento é liberado.</span>' : ''}
      </div>
      ${ct.status === 'concluida' && !souPrestador && !avaliadas.has(ct.id) ? `<form class="avaliar" data-avaliar="${ct.id}">
        <b>Avalie o serviço:</b>
        <select name="nota">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${estrelas(n)}</option>`).join('')}</select>
        <input name="comentario" placeholder="Comentário (opcional)" maxlength="500"><button class="btn pequeno">Enviar</button></form>` : ''}
    </div>`).join('');
    const novo = souPrestador && !me.suspenso ? `<details class="card"><summary>${ic('mais')}Enviar proposta de orçamento</summary>
      <form id="fprop">
        <label>Descrição do serviço<textarea name="descricao" required maxlength="1000" placeholder="Ex: reboco de 20m² de parede, material por conta do cliente"></textarea></label>
        <label>Valor total (R$)<input name="valor" type="number" min="10" step="0.01" required></label>
        <div class="meta" id="calc">Taxa do app: 10% · Você recebe: —</div>
        <button class="btn">Enviar proposta</button>
      </form></details>` : '';
    document.getElementById('contratos').innerHTML = contato + cards + novo;
    const fprop = document.getElementById('fprop');
    fprop?.valor.addEventListener('input', () => {
      const v = Number(fprop.valor.value || 0);
      document.getElementById('calc').textContent = `Taxa do app (10%): ${brl(v * TAXA)} · Você recebe: ${brl(v - Math.round(v * TAXA * 100) / 100)}`;
    });
    fprop?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = form(fprop);
      if (temContato(v.descricao)) return toast(AVISO_CONTATO, 'erro');
      const { error: er } = await sb.rpc('enviar_proposta', { conv: id, p_descricao: v.descricao, p_valor: Number(v.valor) });
      if (er) return falha(er);
      toast('Proposta enviada!');
      renderContratos();
    });
  };

  document.getElementById('contratos').addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    try {
      if (b.dataset.pagar) {
        if (DEMO) {
          if (!(await confirmar('DEMONSTRAÇÃO: aqui abriria o checkout do Mercado Pago (Pix ou cartão). Simular pagamento aprovado?', 'Simular pagamento'))) return;
          await sb.demo.pagar(b.dataset.pagar);
          toast('Pagamento aprovado! O WhatsApp dos dois foi liberado.');
          return renderContratos();
        }
        b.disabled = true; b.textContent = 'Abrindo pagamento…';
        const { data: { session } } = await sb.auth.getSession();
        const r = await fetch('/api/pagamento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ contratacao_id: b.dataset.pagar }),
        }).then((x) => x.json());
        if (!r.checkout_url) throw new Error(r.erro || 'Falha no pagamento');
        location.href = r.checkout_url;
      }
      if (b.dataset.cancelar && await confirmar('Cancelar esta proposta?', 'Cancelar proposta')) {
        const { error: er } = await sb.rpc('cancelar_proposta', { cid: b.dataset.cancelar }); if (er) throw er; renderContratos();
      }
      if (b.dataset.concluir && await confirmar('Confirma que o serviço foi realizado? Isso libera o pagamento ao profissional.', 'Sim, foi feito')) {
        const { error: er } = await sb.rpc('concluir_servico', { cid: b.dataset.concluir }); if (er) throw er;
        toast('Obrigado! Agora avalie o profissional.'); renderContratos();
      }
    } catch (er) { falha(er); b.disabled = false; }
  });
  document.getElementById('contratos').addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-avaliar]');
    if (!f) return;
    e.preventDefault();
    const v = form(f);
    const { error: er } = await sb.from('avaliacoes').insert({
      contratacao_id: f.dataset.avaliar, prestador_id: c.prestador_id, autor_id: me.id, nota: Number(v.nota), comentario: v.comentario || '',
    });
    if (er) return falha(er);
    toast('Avaliação enviada. Obrigado!');
    renderContratos();
  });

  const { data: msgs } = await sb.from('mensagens').select('*').eq('conversa_id', id).order('criado_em').limit(500);
  (msgs || []).forEach(addMsg);
  await renderContratos();

  const fmsg = document.getElementById('fmsg');
  fmsg?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = fmsg.t.value.trim();
    if (!texto) return;
    if (!liberado && temContato(texto)) return toast(AVISO_CONTATO, 'erro');
    fmsg.t.value = '';
    const { data: m, error: er } = await sb.from('mensagens').insert({ conversa_id: id, autor_id: me.id, texto }).select().single();
    if (er) return falha(er);
    addMsg(m);
    if (m.bloqueada) { toast(AVISO_CONTATO, 'erro'); await carregarMe((await sb.auth.getSession()).data.session); }
  });

  canais.push(sb.channel(`chat-${id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `conversa_id=eq.${id}` }, (p) => addMsg(p.new))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contratacoes', filter: `conversa_id=eq.${id}` }, () => renderContratos())
    .subscribe());
}

// ---------------------------------------------------------------- meu perfil
async function telaPerfil() {
  const [{ data: priv }, { data: cts }, { data: fotosRes }, { data: verifs }] = await Promise.all([
    sb.from('contatos_privados').select('*').eq('user_id', me.id).maybeSingle(),
    sb.from('contratacoes').select('*,contratante:contratante_id(nome),prestador:prestador_id(nome)')
      .or(`contratante_id.eq.${me.id},prestador_id.eq.${me.id}`).neq('status', 'cancelada').order('criado_em', { ascending: false }),
    sb.from('fotos_trabalhos').select('*').eq('user_id', me.id).order('criado_em', { ascending: false }),
    sb.from('verificacoes').select('status,motivo,criado_em').eq('user_id', me.id).order('criado_em', { ascending: false }).limit(1),
  ]);
  let fotos = fotosRes || [];
  const verif = (verifs || [])[0];
  const cartaoVerificacao = me.verificado
    ? '<div class="card verif ok"><b>✔ Identidade verificada</b><div class="meta">Seu perfil mostra o selo de verificado na busca e no chat.</div></div>'
    : verif?.status === 'pendente'
      ? `<div class="card verif pendente"><b>Verificação em análise</b><div class="meta">Enviada em ${data(verif.criado_em)}. Você recebe o selo assim que for aprovada.</div></div>`
      : `<div class="card verif"><b>Verifique sua identidade</b>
          ${verif?.status === 'rejeitada' ? `<div class="alerta">Sua última verificação não foi aprovada: <b>${esc(verif.motivo || 'sem motivo informado')}</b>. Envie de novo.</div>` : ''}
          <div class="meta">Envie uma foto do documento e uma selfie segurando ele. Perfis verificados ganham o selo ✔ e recebem mais contratações.</div>
          <a class="btn" href="#/verificar">Verificar agora</a></div>`;
  const opcoes = categorias.map((c) => `<option value="${c.id}" ${c.id === me.categoria_id ? 'selected' : ''}>${c.icone} ${esc(c.nome)}</option>`).join('');
  const ganhos = (cts || []).filter((x) => x.prestador_id === me.id && ['paga', 'concluida'].includes(x.status));
  $app.innerHTML = `
    ${me.suspenso ? '<div class="alerta">Conta suspensa por tentativas de passar contato fora do app.</div>'
      : me.avisos ? `<div class="alerta">Você tem ${me.avisos} aviso(s) por tentar passar contato. Com 3, a conta é suspensa.</div>` : ''}
    <div class="linha-esp tit-linha"><h1 class="tit-pagina">Meu perfil</h1><button class="btn sec pequeno" id="sair">${ic('sair')}Sair</button></div>
    ${cartaoVerificacao}
    <form class="card" id="fperfil">
      <h2>Meu perfil público</h2>
      <p class="nota">Isto aparece para todos. <b>Não coloque telefone, WhatsApp, e-mail ou redes sociais</b> — o sistema bloqueia.</p>
      <label>Nome<input name="nome" value="${esc(me.nome)}" required></label>
      <div class="dupla"><label>Cidade<input name="cidade" value="${esc(me.cidade)}"></label>
        <label>UF<input name="uf" value="${esc(me.uf)}" maxlength="2" style="text-transform:uppercase"></label></div>
      <div class="foto-perfil">${avatar(me, 'grande')}
        <label class="btn sec pequeno">${ic('camera')}${me.foto_url ? 'Trocar' : 'Colocar'} foto de perfil<input type="file" id="in-avatar" accept="image/*" hidden></label></div>
      <fieldset><legend>Como você usa o app</legend>
        <label class="check"><input type="checkbox" name="is_contratante" ${me.is_contratante ? 'checked' : ''}> Contrato serviços</label>
        <label class="check"><input type="checkbox" name="is_prestador" ${me.is_prestador ? 'checked' : ''}> Ofereço serviços</label>
      </fieldset>
      <div id="campos-prestador" ${me.is_prestador ? '' : 'hidden'}>
        <label>Minha área<select name="categoria_id"><option value="">Escolha…</option>${opcoes}</select></label>
        <label>Preço a partir de (R$)<input name="preco_base" type="number" min="0" step="0.01" value="${me.preco_base ?? ''}"></label>
        <label>Sobre meu trabalho<textarea name="bio" maxlength="1500" placeholder="Experiência, serviços que faz, região que atende…">${esc(me.bio)}</textarea></label>
      </div>
      <button class="btn">Salvar perfil</button>
    </form>
    ${me.is_prestador ? `<div class="card" id="card-fotos">
      <h2>Fotos dos meus trabalhos</h2>
      <p class="nota">Mostre serviços que você já fez. Perfis com fotos recebem muito mais pedidos. Até ${MAX_FOTOS} fotos.
        Não coloque telefone ou contato escrito nas fotos.</p>
      <div class="galeria" id="galeria-minha">${galeriaHTML(fotos, true)}</div>
      <div class="enviar-fotos" ${fotos.length >= MAX_FOTOS ? 'hidden' : ''}>
        <input id="legenda" maxlength="140" placeholder="Legenda (opcional) — ex: Reboco de fachada, 2 dias">
        <label class="btn">${ic('mais')}Adicionar fotos<input type="file" id="in-fotos" accept="image/*" multiple hidden></label>
      </div>
      <div class="meta" id="up-status">${fotos.length} de ${MAX_FOTOS} fotos</div>
    </div>` : ''}
    <form class="card" id="fpriv">
      <h2>${ic('cadeado')}Dados privados</h2>
      <p class="nota">Só aparecem para a outra parte depois do pagamento. A chave Pix é vista só pela administração, para seu repasse.</p>
      <label>WhatsApp<input name="whatsapp" value="${esc(priv?.whatsapp)}" inputmode="tel"></label>
      ${me.is_prestador ? `<label>Chave Pix para receber<input name="chave_pix" value="${esc(priv?.chave_pix)}"></label>` : ''}
      <button class="btn">Salvar dados privados</button>
    </form>
    ${me.is_prestador ? `<div class="card"><h2>Meus ganhos</h2>
      <div class="numeros">
        <div><span>${brl(ganhos.reduce((s, x) => s + Number(x.valor_prestador), 0))}</span>total a receber/recebido</div>
        <div><span>${brl(ganhos.filter((x) => x.repassado_em).reduce((s, x) => s + Number(x.valor_prestador), 0))}</span>já repassado</div>
        <div><span>${ganhos.length}</span>serviços</div>
      </div></div>` : ''}
    <div class="card"><h2>Minhas contratações</h2>
      ${(cts || []).map((x) => `<a class="linha-esp item" href="#/chat/${x.conversa_id}">
        <span>${x.prestador_id === me.id ? `Para ${esc(x.contratante?.nome)}` : `Com ${esc(x.prestador?.nome)}`} — ${esc(x.descricao.slice(0, 50))}</span>
        <span>${brl(x.valor)} · ${STATUS[x.status]}</span></a>`).join('') || '<p class="vazio">Nenhuma ainda.</p>'}
    </div>`;

  document.getElementById('sair').addEventListener('click', async () => { await sb.auth.signOut(); location.hash = '#/'; });
  const fp = document.getElementById('fperfil');
  fp.is_prestador.addEventListener('change', () => { document.getElementById('campos-prestador').hidden = !fp.is_prestador.checked; });
  fp.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = form(fp);
    if (temContato(v.bio) || temContato(v.nome)) return toast(AVISO_CONTATO, 'erro');
    const { error } = await sb.from('profiles').update({
      nome: v.nome.trim(), cidade: v.cidade.trim(), uf: (v.uf || '').toUpperCase().trim(),
      is_contratante: !!v.is_contratante, is_prestador: !!v.is_prestador,
      categoria_id: v.categoria_id ? Number(v.categoria_id) : null,
      preco_base: v.preco_base ? Number(v.preco_base) : null, bio: (v.bio || '').trim(),
    }).eq('id', me.id);
    if (error) return falha(error);
    await carregarMe((await sb.auth.getSession()).data.session);
    renderNav();
    toast('Perfil salvo!');
  });
  document.getElementById('in-avatar').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      toast('Enviando foto…');
      const { url } = await subirFoto(file, 'perfil');
      const { error } = await sb.from('profiles').update({ foto_url: url }).eq('id', me.id);
      if (error) throw error;
      await carregarMe((await sb.auth.getSession()).data.session);
      toast('Foto de perfil atualizada!');
      rota();
    } catch (er) { falha(er); }
  });

  const $gal = document.getElementById('galeria-minha');
  $gal?.addEventListener('click', async (e) => {
    const apagar = e.target.closest('[data-apagar]');
    if (apagar) { if (await apagarFoto(apagar.dataset.apagar, fotos)) rota(); return; }
    const b = e.target.closest('.foto');
    if (b) abrirFoto(fotos, Number(b.dataset.i));
  });
  document.getElementById('in-fotos')?.addEventListener('change', async (e) => {
    const legenda = document.getElementById('legenda').value.trim();
    if (temContato(legenda)) return toast(AVISO_CONTATO, 'erro');
    const arquivos = [...e.target.files].slice(0, MAX_FOTOS - fotos.length);
    if (e.target.files.length > arquivos.length) toast(`Limite de ${MAX_FOTOS} fotos: só as primeiras ${arquivos.length} serão enviadas.`);
    const $st = document.getElementById('up-status');
    let ok = 0;
    for (const [n, file] of arquivos.entries()) {
      $st.textContent = `Enviando ${n + 1} de ${arquivos.length}…`;
      try {
        const { url, caminho } = await subirFoto(file, 'trabalho');
        const { error } = await sb.from('fotos_trabalhos').insert({ user_id: me.id, url, caminho, legenda });
        if (error) { await sb.storage.from('fotos').remove([caminho]); throw error; }
        ok++;
      } catch (er) { falha(er); break; }
    }
    if (ok) toast(ok === 1 ? 'Foto adicionada!' : `${ok} fotos adicionadas!`);
    rota();
  });

  const fv = document.getElementById('fpriv');
  fv.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = form(fv);
    const upd = { whatsapp: v.whatsapp.replace(/\D/g, '') };
    if ('chave_pix' in v) upd.chave_pix = v.chave_pix.trim();
    const { error } = await sb.from('contatos_privados').update(upd).eq('user_id', me.id);
    if (error) return falha(error);
    toast('Dados privados salvos!');
  });
}

// ---------------------------------------------------------------- verificação de identidade
async function telaVerificar() {
  if (me.verificado) { $app.innerHTML = '<div class="card estreito"><h2>✔ Você já é verificado</h2><a href="#/perfil">Voltar ao perfil</a></div>'; return; }
  const { data: pend } = await sb.from('verificacoes').select('id').eq('user_id', me.id).eq('status', 'pendente').limit(1);
  if (pend?.length) { $app.innerHTML = '<div class="card estreito"><h2>Em análise</h2><p>Sua verificação já foi enviada e está sendo analisada.</p><a href="#/perfil">Voltar ao perfil</a></div>'; return; }
  const passo = (nome, titulo, dica, captura, opcional = false) => `<div class="passo" data-passo="${nome}">
    <div class="previa-box"><img class="previa" id="prev-${nome}" alt="" hidden><span class="vazia">${ic(nome === 'selfie' ? 'camera' : 'documento')}</span></div>
    <div><b>${titulo}</b>${opcional ? ' <span class="meta">(opcional na CNH)</span>' : ''}<small>${dica}</small>
      <label class="btn sec pequeno">Tirar ou escolher foto<input type="file" id="in-${nome}" accept="image/*" capture="${captura}" hidden></label></div></div>`;
  $app.innerHTML = `<form class="card estreito" id="fver">
    <h2>Verificar identidade</h2>
    <p class="nota">Perfis verificados ganham o selo ✔ e passam mais confiança para quem contrata. Seus documentos ficam guardados em área privada e só a administração vê.</p>
    <label for="cpf">CPF<input id="cpf" name="cpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" required autocomplete="off"></label>
    <label for="tipo">Documento com foto<select id="tipo" name="tipo"><option value="CNH">CNH (carteira de motorista)</option><option value="RG">RG (identidade)</option><option value="RNE">RNE / CRNM (estrangeiro)</option></select></label>
    ${passo('frente', '1. Frente do documento', 'Foto nítida, sem reflexo, mostrando os 4 cantos.', 'environment')}
    ${passo('verso', '2. Verso do documento', 'Obrigatório para RG e RNE.', 'environment', true)}
    ${passo('selfie', '3. Selfie segurando o documento', 'Seu rosto e o documento ao lado, bem iluminados, sem óculos escuros ou boné.', 'user')}
    <label class="check"><input type="checkbox" name="lgpd" required> Autorizo o uso destes dados apenas para confirmar minha identidade, conforme a LGPD.</label>
    <button class="btn" id="enviar-verif">Enviar para análise</button>
    <div class="meta" id="verif-status"></div>
  </form>`;
  const f = document.getElementById('fver');
  const arquivos = {};
  f.cpf.addEventListener('input', () => {
    const d = f.cpf.value.replace(/\D/g, '').slice(0, 11);
    f.cpf.value = d.slice(0, 3) + (d.length > 3 ? '.' + d.slice(3, 6) : '') + (d.length > 6 ? '.' + d.slice(6, 9) : '') + (d.length > 9 ? '-' + d.slice(9) : '');
  });
  for (const nome of ['frente', 'verso', 'selfie']) {
    document.getElementById(`in-${nome}`).addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      arquivos[nome] = file;
      const img = document.getElementById(`prev-${nome}`);
      img.src = URL.createObjectURL(file);
      img.hidden = false;
      img.nextElementSibling.hidden = true;
    });
  }
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = form(f);
    const cpf = v.cpf.replace(/\D/g, '');
    if (!cpfValido(cpf)) return toast('CPF inválido. Confira os números.', 'erro');
    if (!arquivos.frente) return toast('Falta a foto da frente do documento.', 'erro');
    if (v.tipo !== 'CNH' && !arquivos.verso) return toast('Para RG e RNE, envie também o verso.', 'erro');
    if (!arquivos.selfie) return toast('Falta a selfie segurando o documento.', 'erro');
    const btn = document.getElementById('enviar-verif');
    const $st = document.getElementById('verif-status');
    btn.disabled = true;
    const enviados = {};
    try {
      for (const nome of ['frente', 'verso', 'selfie']) {
        if (!arquivos[nome]) continue;
        $st.textContent = `Enviando ${nome === 'selfie' ? 'selfie' : nome + ' do documento'}…`;
        enviados[nome] = (await subirFoto(arquivos[nome], `doc-${nome}`, 'documentos')).caminho;
      }
      const { error } = await sb.from('verificacoes').insert({
        user_id: me.id, cpf, tipo_documento: v.tipo, doc_frente: enviados.frente, doc_verso: enviados.verso || null, selfie: enviados.selfie,
      });
      if (error) {
        await sb.storage.from('documentos').remove(Object.values(enviados));
        if (/cpf_unico|CPF já/i.test(error.message)) throw new Error('Este CPF já está ligado a outra conta. Se for engano, fale com o suporte.');
        if (/uma_pendente|em análise/i.test(error.message)) throw new Error('Você já tem uma verificação em análise.');
        throw error;
      }
      $app.innerHTML = '<div class="card estreito"><h2>Enviado!</h2><p>Recebemos seus documentos. Assim que a análise for aprovada, o selo ✔ Verificado aparece no seu perfil.</p><a class="btn" href="#/perfil">Voltar ao perfil</a></div>';
    } catch (er) {
      falha(er);
      btn.disabled = false;
      $st.textContent = '';
    }
  });
}

// ---------------------------------------------------------------- pedidos de empresas e clientes
async function telaPedidos() {
  const opcoes = categorias.map((c) => `<option value="${c.id}">${c.icone} ${esc(c.nome)}</option>`).join('');
  $app.innerHTML = `
    <div class="linha-esp"><h2>Pedidos de serviço</h2>${me && !me.suspenso ? '<button class="btn" id="abrir-novo">Publicar pedido</button>' : ''}</div>
    <p class="nota">Empresas e clientes publicam o que precisam. Profissionais tocam em <b>Tenho interesse</b> e conversam pelo chat do app.</p>
    <form class="card" id="fnovo" hidden>
      <h3>Novo pedido</h3>
      <label for="p-titulo">O que você precisa?<input id="p-titulo" name="titulo" required minlength="5" maxlength="120" placeholder="Ex: 3 ajudantes de obra por 10 dias"></label>
      <div class="dupla2"><label for="p-cat">Área<select id="p-cat" name="categoria_id" required><option value="">Escolha…</option>${opcoes}</select></label>
        <label for="p-vagas">Vagas<input id="p-vagas" name="vagas" type="number" min="1" max="50" value="1" required></label></div>
      <div class="dupla"><label for="p-cidade">Cidade<input id="p-cidade" name="cidade" value="${esc(me?.cidade)}" required></label>
        <label for="p-uf">UF<input id="p-uf" name="uf" value="${esc(me?.uf)}" maxlength="2" required style="text-transform:uppercase"></label></div>
      <label for="p-orc">Orçamento total (R$, opcional)<input id="p-orc" name="orcamento" type="number" min="0" step="0.01"></label>
      <label for="p-desc">Detalhes<textarea id="p-desc" name="descricao" maxlength="1500" placeholder="Datas, horário, local (bairro), o que está incluso…"></textarea></label>
      <p class="nota">${ic('cadeado')}Não coloque telefone ou e-mail: os profissionais falam com você pelo chat do app.</p>
      <div class="acoes"><button class="btn">Publicar</button><button type="button" class="btn sec" id="cancelar-novo">Cancelar</button></div>
    </form>
    <form class="busca tres card" id="filtro">
      <select name="cat" aria-label="Área"><option value="">Todas as áreas</option>${opcoes}</select>
      <input name="cidade" placeholder="Cidade" aria-label="Cidade">
      <button class="btn">Filtrar</button>
    </form>
    <div id="lista-pedidos"></div>`;
  const $novo = document.getElementById('fnovo');
  document.getElementById('abrir-novo')?.addEventListener('click', () => { $novo.hidden = false; $novo.titulo.focus(); });
  document.getElementById('cancelar-novo')?.addEventListener('click', () => { $novo.hidden = true; });
  $novo.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = form($novo);
    if (temContato(v.titulo) || temContato(v.descricao)) return toast(AVISO_CONTATO, 'erro');
    const { error } = await sb.from('pedidos').insert({
      contratante_id: me.id, titulo: v.titulo.trim(), descricao: (v.descricao || '').trim(), categoria_id: Number(v.categoria_id),
      cidade: v.cidade.trim(), uf: v.uf.toUpperCase().trim(), vagas: Number(v.vagas), orcamento: v.orcamento ? Number(v.orcamento) : null,
    });
    if (error) return falha(error);
    toast('Pedido publicado! Os profissionais interessados vão aparecer nas suas Conversas.');
    telaPedidos();
  });
  let filtros = {};
  const carregar = async () => {
    let q = sb.from('pedidos').select('*,contratante:contratante_id(id,nome,foto_url,verificado)').order('criado_em', { ascending: false }).limit(80);
    q = me ? q.or(`status.eq.aberto,contratante_id.eq.${me.id}`) : q.eq('status', 'aberto');
    if (filtros.cat) q = q.eq('categoria_id', filtros.cat);
    if (filtros.cidade) q = q.ilike('cidade', `%${filtros.cidade.trim()}%`);
    const { data: lista, error } = await q;
    if (error) throw error;
    document.getElementById('lista-pedidos').innerHTML = (lista || []).map((x) => {
      const meu = me?.id === x.contratante_id;
      return `<div class="card pedido ${x.status}">
        <div class="linha-esp"><span class="cat">${nomeCategoria(x.categoria_id)}</span>
          <span class="meta">${x.status === 'fechado' ? '<b>Fechado</b> · ' : ''}${data(x.criado_em)}</span></div>
        <h3>${esc(x.titulo)}</h3>
        <div class="meta">${ic('pin')}${esc(x.cidade)}${x.uf ? '/' + esc(x.uf) : ''} · ${ic('pessoas')}${x.vagas} ${x.vagas > 1 ? 'vagas' : 'vaga'}${x.orcamento ? ` · até ${brl(x.orcamento)}` : ''}</div>
        ${x.descricao ? `<p>${esc(x.descricao)}</p>` : ''}
        <div class="linha-esp">
          <div class="quem">${avatar(x.contratante, 'mini')} <span>${esc(x.contratante?.nome)} ${x.contratante?.verificado ? SELO : ''}</span></div>
          ${meu ? (x.status === 'aberto' ? `<button class="btn sec pequeno" data-fechar="${x.id}">Fechar pedido</button>` : '')
            : `<button class="btn pequeno" data-interesse="${x.id}">Tenho interesse</button>`}
        </div></div>`;
    }).join('') || '<div class="card vazio">Nenhum pedido aberto com esses filtros.</div>';
  };
  document.getElementById('filtro').addEventListener('submit', (e) => { e.preventDefault(); filtros = form(e.target); carregar().catch(falha); });
  document.getElementById('lista-pedidos').addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.interesse) {
      if (!me) { location.hash = '#/entrar'; return; }
      if (!me.is_prestador) { toast('Para responder pedidos, marque "Ofereço serviços" no seu Perfil.', 'erro'); return; }
      const { data: conv, error } = await sb.rpc('demonstrar_interesse', { pid: b.dataset.interesse });
      if (error) return falha(error);
      toast('Interesse enviado! Continue a conversa por aqui.');
      location.hash = `#/chat/${conv}`;
    }
    if (b.dataset.fechar && await confirmar('Fechar este pedido? Ele deixa de aparecer para os profissionais.', 'Fechar pedido')) {
      const { error } = await sb.from('pedidos').update({ status: 'fechado' }).eq('id', b.dataset.fechar);
      if (error) return falha(error);
      toast('Pedido fechado.');
      carregar().catch(falha);
    }
  });
  await carregar();
}

// ---------------------------------------------------------------- painel do administrador
async function telaAdmin() {
  const { data: r, error } = await sb.rpc('admin_resumo');
  if (error) throw error;
  $app.innerHTML = `<h2>Painel do administrador</h2>
    <div class="numeros card">
      <div><span>${brl(r.comissao)}</span>sua comissão (10%)</div>
      <div><span>${brl(r.faturado)}</span>movimentado</div>
      <div><span>${brl(r.repasse_pendente)}</span>repasses pendentes</div>
      <div><span>${r.contratacoes}</span>contratações pagas</div>
      <div><span>${r.usuarios}</span>usuários (${r.prestadores} prestadores)</div>
      <div><span>${r.tentativas}</span>tentativas de burla</div>
      <div><span>${r.verificacoes_pendentes}</span>verificações para analisar</div>
      <div><span>${r.pedidos_abertos}</span>pedidos abertos</div>
    </div>
    <div class="abas"><button data-aba="verificacoes" class="ativa">Verificações${r.verificacoes_pendentes ? ` (${r.verificacoes_pendentes})` : ''}</button>
      <button data-aba="repasses">Repasses</button><button data-aba="contratacoes">Contratações</button>
      <button data-aba="burla">Tentativas de burla</button><button data-aba="usuarios">Usuários</button></div>
    <div id="aba"></div>`;
  const abas = { verificacoes: abaVerificacoes, repasses: abaRepasses, contratacoes: abaContratacoes, burla: abaBurla, usuarios: abaUsuarios };
  document.querySelector('.abas').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    document.querySelectorAll('.abas button').forEach((x) => x.classList.toggle('ativa', x === b));
    abas[b.dataset.aba]().catch(falha);
  });
  await abaVerificacoes();
}

const MOTIVOS_REJEICAO = ['Foto do documento ilegível ou cortada', 'Selfie não confere com o documento', 'Rosto ou documento não aparecem na selfie',
  'Documento vencido ou inválido', 'Nome diferente do perfil', 'CPF não confere com o documento'];

async function abaVerificacoes() {
  const $a = document.getElementById('aba');
  const { data: lista, error } = await sb.from('verificacoes').select('*,user:user_id(id,nome,cidade,uf,criado_em,is_prestador)')
    .eq('status', 'pendente').order('criado_em');
  if (error) throw error;
  // links temporários (10 min) para ver as fotos privadas
  const urls = {};
  for (const v of lista || []) {
    for (const campo of ['doc_frente', 'doc_verso', 'selfie']) {
      if (!v[campo]) continue;
      const { data: u } = await sb.storage.from('documentos').createSignedUrl(v[campo], 600);
      urls[v[campo]] = u?.signedUrl || '';
    }
  }
  $a.innerHTML = `<p class="nota">Confira: o rosto da selfie é o mesmo da foto do documento, o nome bate com o perfil, o documento está legível e dentro da validade.</p>
    ${(lista || []).map((v) => {
      const fotos = [['doc_frente', `${v.tipo_documento} · frente`], ['doc_verso', `${v.tipo_documento} · verso`], ['selfie', 'Selfie com documento']]
        .filter(([c]) => v[c]).map(([c, legenda]) => ({ url: urls[v[c]], legenda }));
      return `<div class="card verif-item" data-v="${v.id}">
        <div class="linha-esp"><div><b>${esc(v.user?.nome)}</b> ${v.user?.is_prestador ? '<span class="tag">prestador</span>' : '<span class="tag">contratante</span>'}
          <div class="meta">CPF ${esc(formatarCpf(v.cpf))} · ${esc(v.tipo_documento)} · ${esc(v.user?.cidade)}${v.user?.uf ? '/' + esc(v.user.uf) : ''} · enviado em ${hora(v.criado_em)}</div></div></div>
        <div class="galeria docs">${fotos.map((f, i) => `<figure><button class="foto" data-i="${i}"><img src="${esc(f.url)}" alt="${esc(f.legenda)}"></button><figcaption>${esc(f.legenda)}</figcaption></figure>`).join('')}</div>
        <div class="analisar">
          <button class="btn" data-aprovar="${v.id}">✔ Aprovar</button>
          <select aria-label="Motivo da rejeição" data-motivo="${v.id}">${MOTIVOS_REJEICAO.map((m) => `<option>${esc(m)}</option>`).join('')}</select>
          <button class="btn perigo" data-rejeitar="${v.id}">✕ Rejeitar</button>
        </div></div>`;
    }).join('') || '<div class="card vazio">Nenhuma verificação esperando análise. </div>'}`;
  const fotosDe = Object.fromEntries((lista || []).map((v) => [v.id, [['doc_frente', `${v.tipo_documento} · frente`], ['doc_verso', `${v.tipo_documento} · verso`], ['selfie', 'Selfie com documento']]
    .filter(([c]) => v[c]).map(([c, legenda]) => ({ url: urls[v[c]], legenda }))]));
  $a.onclick = async (e) => {
    const item = e.target.closest('[data-v]');
    const foto = e.target.closest('.foto');
    if (foto && item) return abrirFoto(fotosDe[item.dataset.v], Number(foto.dataset.i));
    const b = e.target.closest('button');
    if (!b || !(b.dataset.aprovar || b.dataset.rejeitar)) return;
    const aprovar = !!b.dataset.aprovar;
    const vid = Number(b.dataset.aprovar || b.dataset.rejeitar);
    const motivo = aprovar ? '' : $a.querySelector(`[data-motivo="${vid}"]`).value;
    if (!(await confirmar(aprovar ? 'Aprovar e dar o selo de verificado?' : `Rejeitar com o motivo: "${motivo}"?`, aprovar ? 'Aprovar' : 'Rejeitar'))) return;
    const { error: er } = await sb.rpc('admin_analisar_verificacao', { vid, aprovar, p_motivo: motivo });
    if (er) return falha(er);
    toast(aprovar ? 'Aprovado! O selo ✔ já aparece no perfil.' : 'Verificação rejeitada. A pessoa verá o motivo no perfil.');
    abaVerificacoes();
  };
}

async function abaRepasses() {
  const { data: lista } = await sb.from('contratacoes').select('*,prestador:prestador_id(id,nome)')
    .eq('status', 'concluida').is('repassado_em', null).order('concluido_em');
  const { data: pix } = await sb.from('contatos_privados').select('user_id,chave_pix,whatsapp').in('user_id', (lista || []).map((x) => x.prestador_id));
  const pixDe = Object.fromEntries((pix || []).map((x) => [x.user_id, x]));
  const $a = document.getElementById('aba');
  $a.innerHTML = `<p class="nota">Serviços concluídos aguardando você enviar o Pix ao prestador (valor já sem os 10%).</p>${(lista || []).map((x) => `
    <div class="card linha-esp"><div><b>${esc(x.prestador.nome)}</b> — ${esc(x.descricao.slice(0, 60))}
      <div class="meta">Concluído em ${data(x.concluido_em)} · Total ${brl(x.valor)} · Sua comissão ${brl(x.comissao)}</div>
      <div class="meta">Pix: <b>${esc(pixDe[x.prestador_id]?.chave_pix) || 'não cadastrada'}</b></div></div>
      <div><div class="valor">${brl(x.valor_prestador)}</div><button class="btn pequeno" data-repasse="${x.id}">Marquei como pago</button></div></div>`).join('')
    || '<div class="card vazio">Nenhum repasse pendente. </div>'}`;
  $a.onclick = async (e) => {
    const id = e.target.dataset?.repasse;
    if (!id || !(await confirmar('Confirma que já enviou o Pix para o prestador?', 'Já enviei'))) return;
    const { error } = await sb.rpc('admin_marcar_repasse', { cid: id });
    if (error) return falha(error);
    toast('Repasse registrado.');
    abaRepasses();
  };
}

async function abaContratacoes() {
  const { data: lista } = await sb.from('contratacoes').select('*,prestador:prestador_id(nome),contratante:contratante_id(nome)')
    .order('criado_em', { ascending: false }).limit(100);
  const $a = document.getElementById('aba');
  $a.onclick = null;
  $a.innerHTML = `<div class="card tabela"><table><tr><th>Data</th><th>Prestador</th><th>Contratante</th><th>Valor</th><th>Comissão</th><th>Status</th></tr>
    ${(lista || []).map((x) => `<tr><td>${data(x.criado_em)}</td><td>${esc(x.prestador.nome)}</td><td>${esc(x.contratante.nome)}</td>
      <td>${brl(x.valor)}</td><td>${brl(x.comissao)}</td><td>${STATUS[x.status]}${x.repassado_em ? ' · repassado' : ''}</td></tr>`).join('')}</table></div>`;
}

async function abaBurla() {
  const { data: lista } = await sb.from('tentativas_burla').select('*,user:user_id(id,nome,avisos,suspenso)').order('criado_em', { ascending: false }).limit(100);
  const $a = document.getElementById('aba');
  $a.onclick = null;
  $a.innerHTML = (lista || []).map((x) => `<div class="card"><b>${esc(x.user?.nome)}</b> ${x.user?.suspenso ? '<span class="tag vermelha">suspenso</span>' : `<span class="tag">${x.user?.avisos} aviso(s)</span>`}
    <div class="meta">${hora(x.criado_em)} · ${esc(x.onde)}</div><code>${esc(x.texto_original)}</code></div>`).join('')
    || '<div class="card vazio">Nenhuma tentativa registrada.</div>';
}

async function abaUsuarios() {
  const $a = document.getElementById('aba');
  $a.innerHTML = '<input id="busca-u" placeholder="Buscar por nome…" class="card"><div id="lista-u"></div>';
  const carregar = async (t = '') => {
    let q = sb.from('profiles').select('*').order('criado_em', { ascending: false }).limit(100);
    if (t) q = q.ilike('nome', `%${t}%`);
    const { data: lista } = await q;
    document.getElementById('lista-u').innerHTML = (lista || []).map((u) => `<div class="card linha-esp">
      <div><b>${esc(u.nome)}</b> ${u.is_admin ? '<span class="tag">admin</span>' : ''} ${u.is_prestador ? '<span class="tag">prestador</span>' : ''} ${u.is_contratante ? '<span class="tag">contratante</span>' : ''}
        <div class="meta">${esc(u.cidade)} · desde ${data(u.criado_em)} · ${u.avisos} aviso(s) ${u.suspenso ? '· <b class="vermelho">SUSPENSO</b>' : ''}</div></div>
      <div class="acoes"><button class="btn pequeno sec" data-u="${u.id}" data-v="${!u.verificado}" data-s="${u.suspenso}">${u.verificado ? 'Remover verificação' : '✔ Verificar'}</button>
        <button class="btn pequeno ${u.suspenso ? '' : 'perigo'}" data-u="${u.id}" data-v="${u.verificado}" data-s="${!u.suspenso}">${u.suspenso ? 'Reativar' : 'Suspender'}</button></div></div>`).join('');
  };
  document.getElementById('busca-u').addEventListener('input', (e) => carregar(e.target.value.trim()));
  $a.onclick = async (e) => {
    const b = e.target.closest('button[data-u]');
    if (!b) return;
    const { error } = await sb.rpc('admin_atualizar_usuario', { uid: b.dataset.u, p_verificado: b.dataset.v === 'true', p_suspenso: b.dataset.s === 'true' });
    if (error) return falha(error);
    carregar(document.getElementById('busca-u').value.trim());
  };
  await carregar();
}

iniciar();
