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
  seta: '<path d="m9 5 7 7-7 7"/>',
  inicio: '<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9Z"/>',
  galeria: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  tijolo: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 9.7v4.6M9 14.3V19"/>',
  raio: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  gota: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
  rolo: '<rect x="3" y="3" width="15" height="6" rx="1.5"/><path d="M18 6h2v5h-8v3"/><rect x="10.5" y="14" width="3" height="7" rx="1"/>',
  vassoura: '<path d="M15 3 10.5 12M6 12h9l2 9H4l2-9ZM8.5 16v5M12.5 16v5"/>',
  folha: '<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15ZM5 19l7-7"/>',
  martelo: '<path d="m13 6 3-3 5 5-3 3-5-5ZM13 6l-9.5 9.5a2 2 0 0 0 3 3L16 9"/>',
  chama: '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-3-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-4 5-4 8a6 6 0 0 0 6 6Z"/>',
  chave: '<path d="M14.5 3.5a5 5 0 0 0-4.7 6.7L3 17v4h4l6.8-6.8a5 5 0 1 0 .7-10.7Z"/>',
  computador: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  caneta: '<path d="m4 20 1-5L16 4l4 4L9 19l-5 1ZM14 6l4 4"/>',
  codigo: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
  livro: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5ZM4 19a2 2 0 0 1 2-2h13"/>',
  tesoura: '<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5 20 19M8.5 15.5 20 5"/>',
  panela: '<path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-5ZM2 10h2M20 10h2M9.5 7c0-1.2 1-1.3 1-2.5M14 7c0-1.2 1-1.3 1-2.5"/>',
  caminhao: '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  calculadora: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  balanca: '<path d="M12 4v16M7 20h10M5 7h14M5 7l-3 6a3 3 0 0 0 6 0L5 7ZM19 7l-3 6a3 3 0 0 0 6 0l-3-6Z"/>',
  coracao: '<path d="M12 20s-8-4.5-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.5 12 20 12 20Z"/>',
  caixa: '<path d="M3 7l9-4 9 4v10l-9 4-9-4V7ZM3 7l9 4 9-4M12 11v10"/>',
  grade: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
};
// ícone de cada área
const ICONE_CAT = {
  'Pedreiro': 'tijolo', 'Eletricista': 'raio', 'Encanador': 'gota', 'Pintor': 'rolo', 'Diarista / Limpeza': 'vassoura',
  'Jardineiro': 'folha', 'Marceneiro': 'martelo', 'Serralheiro': 'chama', 'Mecânico': 'chave', 'Técnico em informática': 'computador',
  'Designer': 'caneta', 'Programador': 'codigo', 'Fotógrafo': 'camera', 'Professor particular': 'livro', 'Cabeleireiro / Beleza': 'tesoura',
  'Cozinheiro / Buffet': 'panela', 'Motorista / Frete': 'caminhao', 'Contador': 'calculadora', 'Advogado': 'balanca',
  'Cuidador / Babá': 'coracao', 'Ajudante geral': 'caixa', 'Outros': 'grade',
};
const ORDEM_CAT = ['Pedreiro', 'Eletricista', 'Diarista / Limpeza', 'Encanador', 'Pintor', 'Ajudante geral', 'Jardineiro', 'Técnico em informática'];
const categoriasOrdenadas = () => [...categorias].sort((a, b) => {
  const ia = ORDEM_CAT.indexOf(a.nome), ib = ORDEM_CAT.indexOf(b.nome);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.nome.localeCompare(b.nome);
});
const nomeCurto = (n) => n.split(' / ')[0].replace('Técnico em informática', 'Informática').replace('Professor particular', 'Professor');
const tileCategoria = (c, tag = 'a', extra = '') => `<${tag} class="cat-tile" ${tag === 'a' ? `href="#/categoria/${c.id}"` : `type="button" data-cat="${c.id}"`} ${extra}>
  <span class="cat-ic">${ic(ICONE_CAT[c.nome] || 'grade')}</span><span class="cat-nome">${esc(nomeCurto(c.nome))}</span></${tag}>`;
const ic = (nome, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome] || ''}</svg>`;
const LOGO = '<svg class="logo" viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="128"/><path d="M136 270l84 84 156-180" fill="none" stroke-width="60" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SELO = `<span class="selo" title="Identidade verificada com documento e selfie">${ic('check')}Verificado</span>`;
const notaHTML = (media, qtd) => `<span class="nota-chip">${ic('estrela')}<b>${Number(media || 0).toFixed(1)}</b><span>(${qtd || 0})</span></span>`;

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
async function reduzirImagem(file, max = DEMO ? 900 : 1280, qualidade = DEMO ? 0.72 : 0.82, quadrado = false) {
  let img;
  try { img = await createImageBitmap(file); } catch {
    img = await new Promise((ok, falhou) => { const i = new Image(); i.onload = () => ok(i); i.onerror = falhou; i.src = URL.createObjectURL(file); });
  }
  const c = document.createElement('canvas');
  if (quadrado) {
    // foto de perfil: corta o centro em quadrado
    const lado = Math.min(img.width, img.height);
    c.width = c.height = Math.min(max, lado);
    c.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, c.width, c.height);
  } else {
    const k = Math.min(1, max / Math.max(img.width, img.height));
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  }
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', qualidade));
}
async function subirFoto(file, prefixo, bucket = 'fotos') {
  if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" não é uma imagem.`);
  // documentos precisam de mais resolução para dar para ler
  const blob = bucket === 'documentos' ? await reduzirImagem(file, DEMO ? 1000 : 1800, 0.85)
    : prefixo === 'perfil' ? await reduzirImagem(file, DEMO ? 480 : 720, 0.82, true) : await reduzirImagem(file);
  const caminho = `${me.id}/${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await sb.storage.from(bucket).upload(caminho, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return { caminho, url: bucket === 'fotos' ? sb.storage.from('fotos').getPublicUrl(caminho).data.publicUrl : '' };
}
// Botões de foto de perfil: selfie (câmera frontal) ou galeria
const botoesSelfie = (prefixo) => `<div class="botoes-foto">
  <label class="btn pequeno">${ic('camera')}Tirar selfie<input type="file" id="${prefixo}-selfie" accept="image/*" capture="user" hidden></label>
  <label class="btn sec pequeno">Escolher da galeria<input type="file" id="${prefixo}-galeria" accept="image/*" hidden></label></div>`;
function aoEscolherFoto(prefixo, cb) {
  for (const id of [`${prefixo}-selfie`, `${prefixo}-galeria`]) {
    document.getElementById(id)?.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) cb(f); e.target.value = ''; });
  }
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
  $nav.innerHTML = aba('#/', 'inicio', 'Início', 'inicio') + aba('#/pedidos', 'pedidos', 'Pedidos', 'pedidos')
    + (me ? aba('#/conversas', 'chat', 'Mensagens', 'conversas') + aba('#/conta', 'perfil', 'Conta', 'conta')
      : aba('#/entrar', 'entrar', 'Entrar', 'entrar'));
  marcarAba();
}
function marcarAba() {
  const tela = location.hash.slice(2).split(/[/?]/)[0] || 'inicio';
  const atual = { chat: 'conversas', verificar: 'conta', admin: 'conta', cadastro: 'entrar', categoria: 'inicio', busca: 'inicio', p: 'inicio' }[tela] ?? tela;
  $nav.querySelectorAll('a').forEach((a) => a.classList.toggle('ativa', a.dataset.aba === atual));
}

// Topo: nas telas internas mostra seta de voltar + título
const TITULOS = {
  pedidos: 'Pedidos', 'pedidos/novo': 'Publicar pedido', conversas: 'Mensagens', chat: 'Conversa', conta: 'Minha conta',
  'conta/dados': 'Meus dados', 'conta/foto': 'Foto de perfil', 'conta/fotos': 'Fotos dos trabalhos', 'conta/servicos': 'Serviços e ganhos',
  verificar: 'Verificar identidade', admin: 'Administração', p: 'Profissional', categoria: 'Profissionais', busca: 'Resultados',
  entrar: 'Entrar', cadastro: 'Criar conta', termos: 'Termos de uso',
};
const PRINCIPAIS = ['inicio', 'pedidos', 'conversas', 'conta', 'bemvindo'];
function topo(tela, chave) {
  const interna = !PRINCIPAIS.includes(chave);
  document.body.classList.toggle('interna', interna);
  document.getElementById('topo-titulo').textContent = tela === 'inicio' || tela === 'bemvindo' ? '' : (TITULOS[chave] || TITULOS[tela] || '');
}
function tituloTopo(t) { document.getElementById('topo-titulo').textContent = t; }
document.getElementById('topo-voltar').addEventListener('click', (e) => {
  e.preventDefault();
  if (history.length > 1) history.back(); else location.hash = '#/';
});

async function rota() {
  canais.forEach((c) => sb.removeChannel(c));
  canais = [];
  const [caminho, qs] = location.hash.slice(1).split('?');
  let [tela, id] = (caminho || '/').split('/').filter(Boolean);
  tela = tela || 'inicio';
  if (tela === 'perfil') { location.hash = '#/conta'; return; }
  const params = new URLSearchParams(qs || '');
  const chave = id && ['conta', 'pedidos'].includes(tela) ? `${tela}/${id}` : tela;
  marcarAba();
  topo(tela, chave);
  document.body.dataset.tela = tela;
  if (['conversas', 'chat', 'conta', 'admin', 'verificar'].includes(tela) && !me) { location.hash = '#/entrar'; return; }
  if (chave === 'pedidos/novo' && !me) { location.hash = '#/entrar'; return; }
  if (tela === 'inicio' && !me && !jaOlhou()) { location.hash = '#/bemvindo'; return; }
  $app.innerHTML = '<div class="carregando">Carregando…</div>';
  window.scrollTo(0, 0);
  try {
    if (tela === 'inicio') return await telaInicio();
    if (tela === 'bemvindo') return telaBoasVindas();
    if (tela === 'categoria') return await telaLista({ cat: id });
    if (tela === 'busca') return await telaLista({ q: params.get('q') || '' });
    if (tela === 'entrar') return telaEntrar();
    if (tela === 'cadastro') return telaCadastro(params);
    if (tela === 'p') return await telaPrestador(id);
    if (tela === 'conversas') return await telaConversas();
    if (tela === 'chat') return await telaChat(id, params);
    if (chave === 'conta') return await telaConta();
    if (chave === 'conta/dados') return await telaContaDados();
    if (chave === 'conta/foto') return telaContaFoto();
    if (chave === 'conta/fotos') return await telaContaFotos();
    if (chave === 'conta/servicos') return await telaContaServicos();
    if (tela === 'admin') return me.is_admin ? await telaAdmin() : (location.hash = '#/');
    if (tela === 'termos') return telaTermos();
    if (chave === 'pedidos/novo') return telaNovoPedido();
    if (tela === 'pedidos') return await telaPedidos(params);
    if (tela === 'verificar') return await telaVerificar();
    $app.innerHTML = '<div class="card">Página não encontrada.</div>';
  } catch (e) {
    $app.innerHTML = `<div class="card erro">Erro: ${esc(e.message)}</div>`;
  }
}

// "Só quero dar uma olhada" — não mostra mais as boas-vindas nesta visita
const jaOlhou = () => { try { return sessionStorage.getItem('contrata-olhou') === '1'; } catch { return true; } };
const marcarOlhou = () => { try { sessionStorage.setItem('contrata-olhou', '1'); } catch { /* sem storage */ } };

// ---------------------------------------------------------------- boas-vindas
function telaBoasVindas() {
  $app.innerHTML = `<section class="boas-vindas">
    <div class="bv-marca">${LOGO}<span>Contrata <em>Aí</em></span></div>
    <h1>Contrate quem faz.<br>Trabalhe no que você sabe.</h1>
    <p class="bv-sub">Pedreiro, diarista, eletricista, designer e muito mais, para pessoas e empresas. Você conversa no app, paga com segurança e só então recebe o contato.</p>
    <div class="bv-opcoes">
      <a class="opcao-grande" href="#/cadastro?tipo=contratar"><span class="op-ic">${ic('busca')}</span>
        <span><b>Quero contratar</b><small>Encontre profissionais para o seu serviço</small></span>${ic('seta')}</a>
      <a class="opcao-grande" href="#/cadastro?tipo=trabalhar"><span class="op-ic">${ic('pedidos')}</span>
        <span><b>Quero trabalhar</b><small>Ofereça seus serviços e receba pedidos</small></span>${ic('seta')}</a>
    </div>
    <a class="btn sec largo" href="#/entrar">Já tenho conta</a>
    <a class="link-simples" href="#/" id="so-olhar">Só quero dar uma olhada</a>
  </section>`;
  document.getElementById('so-olhar').addEventListener('click', marcarOlhou);
}

// ---------------------------------------------------------------- início
async function telaInicio() {
  const cats = categoriasOrdenadas();
  $app.innerHTML = `
    <div class="ola">${me ? `<p>Olá, ${esc(me.nome.split(' ')[0])}</p>` : ''}<h1>Do que você precisa hoje?</h1></div>
    <form class="busca-pilula" id="fb" role="search">${ic('busca')}<input name="q" placeholder="Buscar serviço ou profissional" aria-label="Buscar serviço ou profissional"><button class="btn pequeno">Buscar</button></form>
    <div class="secao-tit"><h2>Categorias</h2><button type="button" class="link" id="ver-todas">Ver todas</button></div>
    <div class="cat-grade" id="cats">${cats.map((c, i) => tileCategoria(c, 'a', i >= 8 ? 'data-extra hidden' : '')).join('')}</div>
    ${me?.is_prestador
      ? `<a class="banner" href="#/pedidos">${ic('pedidos')}<span><b>Pedidos de empresas e clientes</b><small>Veja quem está precisando do seu serviço</small></span>${ic('seta')}</a>`
      : `<a class="banner" href="#/pedidos/novo">${ic('pedidos')}<span><b>Precisa de vários profissionais?</b><small>Publique um pedido e receba interessados</small></span>${ic('seta')}</a>`}
    <div class="secao-tit"><h2>Bem avaliados</h2></div>
    <div class="grade" id="resultados"></div>`;
  document.getElementById('fb').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = form(e.target).q.trim();
    if (q) location.hash = `#/busca?q=${encodeURIComponent(q)}`;
  });
  document.getElementById('ver-todas').addEventListener('click', (e) => {
    const mostrar = e.target.textContent === 'Ver todas';
    document.querySelectorAll('#cats [data-extra]').forEach((t) => { t.hidden = !mostrar; });
    e.target.textContent = mostrar ? 'Ver menos' : 'Ver todas';
  });
  await listarPrestadores({}, 6);
}

// Lista de profissionais por área ou por busca
async function telaLista({ cat, q }) {
  const c = categorias.find((x) => String(x.id) === String(cat));
  if (c) tituloTopo(nomeCurto(c.nome));
  $app.innerHTML = `
    <form class="busca-pilula" id="fb" role="search">${ic('busca')}<input name="q" value="${esc(q || '')}" placeholder="${c ? `Buscar entre ${esc(nomeCurto(c.nome).toLowerCase())}s` : 'Buscar serviço ou profissional'}" aria-label="Buscar"></form>
    <label class="filtro-cidade">${ic('pin')}<input id="f-cidade" placeholder="Filtrar por cidade" aria-label="Filtrar por cidade"></label>
    <p class="meta qtd" id="qtd"></p>
    <div class="grade" id="resultados"></div>`;
  const filtros = () => ({ cat: c?.id, q: document.querySelector('#fb input').value.trim(), cidade: document.getElementById('f-cidade').value.trim() });
  document.getElementById('fb').addEventListener('submit', (e) => { e.preventDefault(); listarPrestadores(filtros()).catch(falha); });
  let espera;
  document.getElementById('f-cidade').addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(() => listarPrestadores(filtros()).catch(falha), 300); });
  await listarPrestadores({ cat: c?.id, q });
}

async function listarPrestadores(f = {}, limite = 60) {
  let q = sb.from('profiles')
    .select('id,nome,cidade,uf,bio,foto_url,categoria_id,preco_base,verificado,avaliacao_media,avaliacao_qtd')
    .eq('is_prestador', true).eq('suspenso', false)
    .order('verificado', { ascending: false }).order('avaliacao_media', { ascending: false }).limit(limite);
  if (f.cat) q = q.eq('categoria_id', f.cat);
  if (f.cidade) q = q.ilike('cidade', `%${f.cidade}%`);
  if (f.q) { const t = f.q.replace(/[,()%]/g, ' '); q = q.or(`nome.ilike.%${t}%,bio.ilike.%${t}%`); }
  const { data: lista, error } = await q;
  if (error) throw error;
  const ids = lista.map((p) => p.id);
  const { data: fts } = ids.length
    ? await sb.from('fotos_trabalhos').select('user_id,url').in('user_id', ids).order('criado_em', { ascending: false })
    : { data: [] };
  const fotosDe = {};
  (fts || []).forEach((x) => (fotosDe[x.user_id] ||= []).push(x.url));
  const $qtd = document.getElementById('qtd');
  if ($qtd) $qtd.textContent = lista.length === 1 ? '1 profissional encontrado' : `${lista.length} profissionais encontrados`;
  document.getElementById('resultados').innerHTML = lista.length
    ? lista.map((p) => cardPrestador(p, fotosDe[p.id] || [])).join('')
    : '<div class="card vazio">Nenhum profissional encontrado. Tente outra cidade ou outra palavra.</div>';
}

function cardPrestador(p, fotos = []) {
  const cat = nomeCategoria(p.categoria_id);
  return `<a class="prestador" href="#/p/${p.id}">
    <div class="capa ${fotos.length || p.foto_url ? '' : 'sem-foto'}">
      ${fotos.length ? `<img src="${esc(fotos[0])}" alt="" loading="lazy">${fotos.length > 1 ? `<span class="qtd-fotos">${ic('camera')}${fotos.length}</span>` : ''}`
        : p.foto_url ? `<img class="capa-rosto" src="${esc(p.foto_url)}" alt="" loading="lazy">`
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
    await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/#/conta` });
    toast('Se o e-mail existir, enviamos um link para redefinir a senha.');
  });
}

function telaCadastro(params) {
  const tipoInicial = params.get('tipo');
  const est = { passo: tipoInicial ? 1 : 0, tipo: tipoInicial || '', nome: '', email: '', senha: '', whatsapp: '', foto: null, fotoUrl: '', cat: '', cidade: '', uf: '', preco: '' };
  const passos = () => ['tipo', 'dados', 'foto', ...(est.tipo === 'contratar' ? [] : ['area']), 'fim'];
  const voltar = () => { est.passo = Math.max(0, est.passo - 1); desenhar(); };
  const avancar = () => { est.passo += 1; desenhar(); window.scrollTo(0, 0); };

  function desenhar() {
    const lista = passos();
    const atual = lista[est.passo];
    const barra = `<div class="progresso" role="progressbar" aria-valuemin="1" aria-valuemax="${lista.length}" aria-valuenow="${est.passo + 1}">
      ${lista.map((_, i) => `<span class="${i <= est.passo ? 'feito' : ''}"></span>`).join('')}</div>
      <p class="passo-num">Passo ${est.passo + 1} de ${lista.length}</p>`;
    let corpo = '';
    if (atual === 'tipo') {
      corpo = `<h1>Como você quer usar o app?</h1><p class="nota">Você pode mudar depois, na sua conta.</p>
        <div class="bv-opcoes">
          ${[['contratar', 'busca', 'Quero contratar', 'Encontrar profissionais para um serviço'],
            ['trabalhar', 'pedidos', 'Quero trabalhar', 'Oferecer meus serviços e receber pedidos'],
            ['ambos', 'pessoas', 'Os dois', 'Contratar e também oferecer serviços']].map(([v, i, t, d]) =>
            `<button type="button" class="opcao-grande ${est.tipo === v ? 'marcada' : ''}" data-tipo="${v}"><span class="op-ic">${ic(i)}</span><span><b>${t}</b><small>${d}</small></span>${ic('seta')}</button>`).join('')}
        </div>`;
    } else if (atual === 'dados') {
      corpo = `<h1>Seus dados</h1><p class="nota">Leva menos de um minuto.</p>
        <form id="fpasso" class="form-passo">
          <label>Nome completo<input name="nome" value="${esc(est.nome)}" required minlength="3" autocomplete="name"></label>
          <label>E-mail<input name="email" type="email" value="${esc(est.email)}" required autocomplete="email"></label>
          <label>Senha<input name="senha" type="password" value="${esc(est.senha)}" required minlength="6" autocomplete="new-password"><small>Pelo menos 6 caracteres.</small></label>
          <label>WhatsApp<input name="whatsapp" value="${esc(est.whatsapp)}" inputmode="tel" placeholder="(11) 99999-9999" required>
            <small>${ic('cadeado')}Fica escondido. Só aparece para a outra pessoa depois que a contratação for paga pelo app.</small></label>
          <button class="btn largo">Continuar</button>
        </form>`;
    } else if (atual === 'foto') {
      corpo = `<h1>Sua foto de perfil</h1><p class="nota">Rosto de frente e bem iluminado. Perfis com foto passam mais confiança e recebem mais contatos.</p>
        <div class="selfie-area">
          <div class="previa-redonda grande" id="cad-previa">${est.fotoUrl ? `<img src="${est.fotoUrl}" alt="Sua foto">` : ic('perfil')}</div>
          ${botoesSelfie('cad')}
        </div>
        <button class="btn largo" id="foto-ok" ${est.foto ? '' : 'hidden'}>Continuar</button>
        <button class="link-simples" id="foto-pular" ${est.foto ? 'hidden' : ''}>Pular por agora</button>`;
    } else if (atual === 'area') {
      corpo = `<h1>Qual é o seu trabalho?</h1><p class="nota">Escolha a área principal. Você aparece nas buscas dessa área.</p>
        <div class="cat-grade escolher" id="cad-cats">${categoriasOrdenadas().map((c) => tileCategoria(c, 'button', String(c.id) === String(est.cat) ? 'aria-pressed="true"' : 'aria-pressed="false"')).join('')}</div>
        <form id="fpasso" class="form-passo">
          <div class="dupla"><label>Cidade onde atende<input name="cidade" value="${esc(est.cidade)}" required></label>
            <label>UF<input name="uf" value="${esc(est.uf)}" maxlength="2" required style="text-transform:uppercase"></label></div>
          <label>Preço a partir de (R$, opcional)<input name="preco" type="number" min="0" step="1" value="${esc(est.preco)}"><small>Ex.: valor da diária ou de uma visita.</small></label>
          <button class="btn largo">Continuar</button>
        </form>`;
    } else {
      const papel = { contratar: 'Vai contratar serviços', trabalhar: 'Vai oferecer serviços', ambos: 'Vai contratar e oferecer serviços' }[est.tipo];
      const cat = categorias.find((c) => String(c.id) === String(est.cat));
      corpo = `<h1>Tudo certo?</h1>
        <div class="resumo">
          <div class="previa-redonda">${est.fotoUrl ? `<img src="${est.fotoUrl}" alt="">` : ic('perfil')}</div>
          <div><b>${esc(est.nome)}</b><small>${papel}${cat ? ` · ${esc(cat.nome)} em ${esc(est.cidade)}` : ''}</small></div>
        </div>
        <form id="fpasso" class="form-passo">
          <label class="check"><input type="checkbox" required> Tenho 18 anos ou mais</label>
          <label class="check"><input type="checkbox" required> Li e aceito os <a href="#/termos" target="_blank">Termos de Uso e Privacidade</a></label>
          <button class="btn largo" id="criar">Criar minha conta</button>
        </form>`;
    }
    $app.innerHTML = `<section class="cadastro">${barra}${corpo}
      ${est.passo > (tipoInicial ? 1 : 0) ? '<button type="button" class="link-simples" id="passo-voltar">Voltar ao passo anterior</button>' : ''}
      ${est.passo === 0 || (tipoInicial && est.passo === 1) ? '<p class="nota centro">Já tem conta? <a href="#/entrar">Entrar</a></p>' : ''}</section>`;
    document.getElementById('passo-voltar')?.addEventListener('click', voltar);

    if (atual === 'tipo') {
      $app.querySelectorAll('[data-tipo]').forEach((b) => b.addEventListener('click', () => { est.tipo = b.dataset.tipo; avancar(); }));
    }
    if (atual === 'dados') {
      document.getElementById('fpasso').addEventListener('submit', (e) => {
        e.preventDefault();
        const v = form(e.target);
        const zap = v.whatsapp.replace(/\D/g, '');
        if (zap.length < 10 || zap.length > 11) return toast('WhatsApp inválido. Use DDD + número.', 'erro');
        if (temContato(v.nome)) return toast('Use apenas seu nome.', 'erro');
        Object.assign(est, { nome: v.nome.trim(), email: v.email.trim(), senha: v.senha, whatsapp: zap });
        avancar();
      });
    }
    if (atual === 'foto') {
      aoEscolherFoto('cad', (file) => {
        if (!file.type.startsWith('image/')) return toast('Escolha uma imagem.', 'erro');
        est.foto = file;
        est.fotoUrl = URL.createObjectURL(file);
        document.getElementById('cad-previa').innerHTML = `<img src="${est.fotoUrl}" alt="Sua foto">`;
        document.getElementById('foto-ok').hidden = false;
        document.getElementById('foto-pular').hidden = true;
      });
      document.getElementById('foto-ok').addEventListener('click', avancar);
      document.getElementById('foto-pular').addEventListener('click', avancar);
    }
    if (atual === 'area') {
      document.getElementById('cad-cats').addEventListener('click', (e) => {
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        est.cat = b.dataset.cat;
        document.querySelectorAll('#cad-cats [data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      });
      document.getElementById('fpasso').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!est.cat) return toast('Escolha a sua área tocando em um dos quadros.', 'erro');
        const v = form(e.target);
        Object.assign(est, { cidade: v.cidade.trim(), uf: v.uf.toUpperCase().trim(), preco: v.preco });
        avancar();
      });
    }
    if (atual === 'fim') {
      document.getElementById('fpasso').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('criar');
        btn.disabled = true; btn.textContent = 'Criando sua conta…';
        const prestar = est.tipo !== 'contratar';
        const { data: r, error } = await sb.auth.signUp({
          email: est.email, password: est.senha,
          options: {
            emailRedirectTo: `${location.origin}/#/conta`,
            data: { nome: est.nome, whatsapp: est.whatsapp, is_prestador: prestar, is_contratante: est.tipo !== 'trabalhar' },
          },
        });
        if (error) { btn.disabled = false; btn.textContent = 'Criar minha conta'; return falha(error); }
        if (!r.session) {
          $app.innerHTML = '<section class="cadastro"><h1>Quase lá!</h1><p>Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar a conta. Depois é só entrar e colocar sua foto em Conta.</p></section>';
          return;
        }
        await carregarMe(r.session);
        try {
          const extra = {};
          if (est.foto) extra.foto_url = (await subirFoto(est.foto, 'perfil')).url;
          if (prestar) Object.assign(extra, { categoria_id: Number(est.cat) || null, cidade: est.cidade, uf: est.uf, preco_base: est.preco ? Number(est.preco) : null });
          if (Object.keys(extra).length) {
            const { error: er } = await sb.from('profiles').update(extra).eq('id', me.id);
            if (er) throw er;
            await carregarMe(r.session);
          }
        } catch (er) { falha(er); }
        renderNav();
        toast(prestar ? 'Conta criada! Agora mostre fotos dos seus trabalhos.' : 'Conta criada! Bem-vindo(a).');
        location.hash = prestar ? '#/conta/fotos' : '#/';
      });
    }
  }
  desenhar();
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
  tituloTopo(p.nome.split(' ')[0]);
  const podeConversar = !p.suspenso && me?.id !== p.id;
  $app.innerHTML = `<section class="perfil-publico">
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
          : me?.id === p.id ? '<a class="btn sec" href="#/conta">Editar meu perfil</a>'
          : `<button class="btn grande" data-conversar>${ic('chat')}Conversar e pedir orçamento</button>`}
        <p class="nota">${ic('cadeado')}O WhatsApp é liberado depois que você contratar e pagar pelo app.</p>
      </div>
    </section>
    ${fotos.length ? `<div class="secao-tit"><h2>Trabalhos realizados</h2><span class="meta">${fotos.length} fotos</span></div>
      <div class="galeria" id="galeria-pub">${galeriaHTML(fotos, me?.is_admin)}</div>` : ''}
    <div class="secao-tit"><h2>Avaliações</h2></div>
    ${(avs || []).map((a) => `<div class="card avaliacao"><div class="linha-esp"><b>${esc(a.autor?.nome)}</b><span class="estrelas" aria-label="${a.nota} de 5">${estrelas(a.nota)}</span></div>
      <div class="meta">${data(a.criado_em)}</div>${a.comentario ? `<p>${esc(a.comentario)}</p>` : ''}</div>`).join('') || '<div class="card vazio">Ainda sem avaliações.</div>'}
    ${podeConversar ? `<div class="barra-cta"><div>${p.preco_base ? `<small>a partir de</small><b>${brl(p.preco_base)}</b>` : `<b>${esc(p.nome.split(' ')[0])}</b><small>${nomeCategoria(p.categoria_id)}</small>`}</div>
      <button class="btn" data-conversar>${ic('chat')}Pedir orçamento</button></div>` : ''}`;
  document.getElementById('galeria-pub')?.addEventListener('click', async (e) => {
    const apagar = e.target.closest('[data-apagar]');
    if (apagar) { if (await apagarFoto(apagar.dataset.apagar, fotos)) rota(); return; }
    const b = e.target.closest('.foto');
    if (b) abrirFoto(fotos, Number(b.dataset.i));
  });
  $app.querySelectorAll('[data-conversar]').forEach((b) => b.addEventListener('click', async () => {
    if (!me) { location.hash = '#/entrar'; return; }
    if (me.suspenso) return toast('Sua conta está suspensa.', 'erro');
    let { data: c } = await sb.from('conversas').select('id').eq('contratante_id', me.id).eq('prestador_id', p.id).maybeSingle();
    if (!c) {
      const r = await sb.from('conversas').insert({ contratante_id: me.id, prestador_id: p.id }).select('id').single();
      if (r.error) return falha(r.error);
      c = r.data;
    }
    location.hash = `#/chat/${c.id}`;
  }));
}

// ---------------------------------------------------------------- conversas
async function telaConversas() {
  const { data: lista, error } = await sb.from('conversas')
    .select('id,criado_em,contratante:contratante_id(id,nome,foto_url),prestador:prestador_id(id,nome,foto_url)')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  $app.innerHTML = `${lista.map((c) => {
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
  tituloTopo(outro.nome.split(' ')[0]);
  if (params.get('pago') === '1') toast('Pagamento enviado! Assim que o Mercado Pago confirmar, o contato é liberado.');
  if (params.get('pago') === '0') toast('O pagamento não foi concluído.', 'erro');

  $app.innerHTML = `<div class="chat">
    <div class="chat-topo">${avatar(outro)}<div><b>${esc(outro.nome)}</b> ${outro.verificado ? `<span class="verif-ic" title="Identidade verificada">${ic('check')}</span>` : ''}
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

// ---------------------------------------------------------------- minha conta (menu)
const recarregarMe = async () => carregarMe((await sb.auth.getSession()).data.session);
const itemMenu = (href, icone, titulo, sub = '', extra = '') => `<a class="menu-item" href="${href}" ${extra}><span class="mi-ic">${ic(icone)}</span>
  <span class="mi-txt"><b>${titulo}</b>${sub ? `<small>${sub}</small>` : ''}</span>${ic('seta', 'mi-seta')}</a>`;

async function telaConta() {
  const [{ data: verifs }, { count: nFotos }] = await Promise.all([
    sb.from('verificacoes').select('status,motivo').eq('user_id', me.id).order('criado_em', { ascending: false }).limit(1),
    me.is_prestador ? sb.from('fotos_trabalhos').select('id', { count: 'exact', head: true }).eq('user_id', me.id) : Promise.resolve({ count: 0 }),
  ]);
  const verif = (verifs || [])[0];
  const stVerif = me.verificado ? 'Verificada' : verif?.status === 'pendente' ? 'Em análise' : verif?.status === 'rejeitada' ? 'Não aprovada — envie de novo' : 'Ganhe o selo de verificado';
  const papel = [me.is_contratante && 'Contrata serviços', me.is_prestador && (nomeCategoria(me.categoria_id) || 'Oferece serviços')].filter(Boolean).join(' · ');
  $app.innerHTML = `
    ${me.suspenso ? '<div class="alerta">Conta suspensa por tentativas de passar contato fora do app.</div>'
      : me.avisos ? `<div class="alerta">Você tem ${me.avisos} aviso(s) por tentar passar contato. Com 3, a conta é suspensa.</div>` : ''}
    <div class="conta-topo">
      <a href="#/conta/foto" class="conta-foto" aria-label="Trocar foto">${avatar(me, 'grande')}<span class="conta-cam">${ic('camera')}</span></a>
      <div><h1>${esc(me.nome)}</h1><p class="meta">${esc(papel)}</p>${me.verificado ? SELO : ''}</div>
    </div>
    ${me.is_prestador ? `<a class="banner claro" href="#/p/${me.id}">${ic('perfil')}<span><b>Ver meu perfil público</b><small>Como os clientes veem você</small></span>${ic('seta')}</a>` : ''}
    <nav class="menu-conta" aria-label="Opções da conta">
      ${itemMenu('#/conta/dados', 'perfil', 'Meus dados', me.is_prestador ? 'Nome, cidade, área, preço, WhatsApp e Pix' : 'Nome, cidade e WhatsApp')}
      ${itemMenu('#/conta/foto', 'camera', 'Foto de perfil', me.foto_url ? 'Trocar foto' : 'Tire uma selfie')}
      ${me.is_prestador ? itemMenu('#/conta/fotos', 'galeria', 'Fotos dos trabalhos', `${nFotos || 0} de ${MAX_FOTOS} fotos`) : ''}
      ${itemMenu('#/verificar', 'documento', 'Verificar identidade', stVerif)}
      ${itemMenu('#/conta/servicos', 'dinheiro', me.is_prestador ? 'Serviços e ganhos' : 'Minhas contratações', me.is_prestador ? 'Contratações e repasses' : 'Histórico e pagamentos')}
      ${itemMenu('#/pedidos?ver=meus', 'pedidos', 'Meus pedidos publicados')}
    </nav>
    ${me.is_admin ? `<nav class="menu-conta">${itemMenu('#/admin', 'admin', 'Painel do administrador', 'Comissões, verificações, repasses e usuários')}</nav>` : ''}
    <nav class="menu-conta">${itemMenu('#/termos', 'documento', 'Termos de uso e privacidade')}</nav>
    <button class="btn sec largo" id="sair">${ic('sair')}Sair da conta</button>`;
  document.getElementById('sair').addEventListener('click', async () => { await sb.auth.signOut(); location.hash = '#/'; });
}

async function telaContaDados() {
  const { data: priv } = await sb.from('contatos_privados').select('*').eq('user_id', me.id).maybeSingle();
  const opcoes = categoriasOrdenadas().map((c) => `<option value="${c.id}" ${c.id === me.categoria_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('');
  $app.innerHTML = `
    <form class="card" id="fperfil">
      <h2>Perfil público</h2>
      <p class="nota">Aparece para todos. Não coloque telefone, WhatsApp, e-mail ou redes sociais: o sistema bloqueia.</p>
      <label>Nome<input name="nome" value="${esc(me.nome)}" required></label>
      <div class="dupla"><label>Cidade<input name="cidade" value="${esc(me.cidade)}"></label>
        <label>UF<input name="uf" value="${esc(me.uf)}" maxlength="2" style="text-transform:uppercase"></label></div>
      <fieldset><legend>Como você usa o app</legend>
        <label class="check"><input type="checkbox" name="is_contratante" ${me.is_contratante ? 'checked' : ''}> Contrato serviços</label>
        <label class="check"><input type="checkbox" name="is_prestador" ${me.is_prestador ? 'checked' : ''}> Ofereço serviços</label>
      </fieldset>
      <div id="campos-prestador" ${me.is_prestador ? '' : 'hidden'}>
        <label>Minha área<select name="categoria_id"><option value="">Escolha…</option>${opcoes}</select></label>
        <label>Preço a partir de (R$)<input name="preco_base" type="number" min="0" step="0.01" value="${me.preco_base ?? ''}"></label>
        <label>Sobre meu trabalho<textarea name="bio" maxlength="1500" placeholder="Experiência, serviços que faz, região que atende…">${esc(me.bio)}</textarea></label>
      </div>
      <button class="btn largo">Salvar perfil</button>
    </form>
    <form class="card" id="fpriv">
      <h2>${ic('cadeado')}Dados privados</h2>
      <p class="nota">O WhatsApp só aparece para a outra parte depois do pagamento. A chave Pix é vista só pela administração, para o seu repasse.</p>
      <label>WhatsApp<input name="whatsapp" value="${esc(priv?.whatsapp)}" inputmode="tel"></label>
      ${me.is_prestador ? `<label>Chave Pix para receber<input name="chave_pix" value="${esc(priv?.chave_pix)}"></label>` : ''}
      <button class="btn sec largo">Salvar dados privados</button>
    </form>`;
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
    await recarregarMe();
    toast('Perfil salvo!');
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

function telaContaFoto() {
  $app.innerHTML = `<section class="cadastro">
    <h1>${me.foto_url ? 'Trocar foto de perfil' : 'Coloque sua foto'}</h1>
    <p class="nota">Rosto de frente e bem iluminado, sem óculos escuros. A foto aparece no seu perfil, nas conversas e nos cartões da busca.</p>
    <div class="selfie-area"><div class="previa-redonda grande" id="perf-previa">${me.foto_url ? `<img src="${esc(me.foto_url)}" alt="Sua foto">` : ic('perfil')}</div>
      ${botoesSelfie('perf')}<p class="meta" id="perf-status"></p></div>
  </section>`;
  aoEscolherFoto('perf', async (file) => {
    const $st = document.getElementById('perf-status');
    try {
      $st.textContent = 'Enviando foto…';
      document.getElementById('perf-previa').innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Sua foto">`;
      const { url } = await subirFoto(file, 'perfil');
      const { error } = await sb.from('profiles').update({ foto_url: url }).eq('id', me.id);
      if (error) throw error;
      await recarregarMe();
      $st.textContent = '';
      toast('Foto de perfil atualizada!');
    } catch (er) { $st.textContent = ''; falha(er); }
  });
}

async function telaContaFotos() {
  const { data: fotosRes } = await sb.from('fotos_trabalhos').select('*').eq('user_id', me.id).order('criado_em', { ascending: false });
  const fotos = fotosRes || [];
  $app.innerHTML = `
    <p class="nota">Mostre serviços que você já fez: perfis com fotos recebem muito mais pedidos. A primeira foto vira a capa do seu cartão. Não coloque telefone ou contato escrito nas fotos.</p>
    <div class="enviar-fotos card" ${fotos.length >= MAX_FOTOS ? 'hidden' : ''}>
      <input id="legenda" maxlength="140" placeholder="Legenda (opcional). Ex: Reboco de fachada, 2 dias" aria-label="Legenda">
      <div class="botoes-foto">
        <label class="btn">${ic('camera')}Tirar foto<input type="file" id="in-fotos-cam" accept="image/*" capture="environment" hidden></label>
        <label class="btn sec">${ic('galeria')}Da galeria<input type="file" id="in-fotos" accept="image/*" multiple hidden></label>
      </div>
      <p class="meta" id="up-status">${fotos.length} de ${MAX_FOTOS} fotos</p>
    </div>
    <div class="galeria" id="galeria-minha">${galeriaHTML(fotos, true) || '<p class="vazio">Nenhuma foto ainda.</p>'}</div>`;
  document.getElementById('galeria-minha').addEventListener('click', async (e) => {
    const apagar = e.target.closest('[data-apagar]');
    if (apagar) { if (await apagarFoto(apagar.dataset.apagar, fotos)) rota(); return; }
    const b = e.target.closest('.foto');
    if (b) abrirFoto(fotos, Number(b.dataset.i));
  });
  const enviar = async (e) => {
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
  };
  document.getElementById('in-fotos').addEventListener('change', enviar);
  document.getElementById('in-fotos-cam').addEventListener('change', enviar);
}

async function telaContaServicos() {
  const { data: cts } = await sb.from('contratacoes').select('*,contratante:contratante_id(nome),prestador:prestador_id(nome)')
    .or(`contratante_id.eq.${me.id},prestador_id.eq.${me.id}`).neq('status', 'cancelada').order('criado_em', { ascending: false });
  const ganhos = (cts || []).filter((x) => x.prestador_id === me.id && ['paga', 'concluida'].includes(x.status));
  $app.innerHTML = `
    ${me.is_prestador ? `<div class="card"><h2>Meus ganhos</h2>
      <div class="numeros">
        <div><span>${brl(ganhos.reduce((s2, x) => s2 + Number(x.valor_prestador), 0))}</span>a receber e recebido</div>
        <div><span>${brl(ganhos.filter((x) => x.repassado_em).reduce((s2, x) => s2 + Number(x.valor_prestador), 0))}</span>já caiu no seu Pix</div>
        <div><span>${ganhos.length}</span>serviços pagos</div>
      </div><p class="nota">O app desconta 10% de cada serviço. O valor é enviado por Pix depois que o cliente confirma que o serviço foi feito.</p></div>` : ''}
    <div class="card"><h2>Contratações</h2>
      ${(cts || []).map((x) => `<a class="item" href="#/chat/${x.conversa_id}">
        <span class="item-txt"><b>${x.prestador_id === me.id ? `Para ${esc(x.contratante?.nome)}` : `Com ${esc(x.prestador?.nome)}`}</b><small>${esc(x.descricao.slice(0, 60))}</small></span>
        <span class="item-val"><b>${brl(x.valor)}</b><small class="status s-${x.status}">${STATUS[x.status]}</small></span></a>`).join('') || '<p class="vazio">Nenhuma contratação ainda.</p>'}
    </div>`;
}

// ---------------------------------------------------------------- verificação de identidade
async function telaVerificar() {
  if (me.verificado) { $app.innerHTML = '<div class="card estreito"><h2>✔ Você já é verificado</h2><a href="#/conta">Voltar ao perfil</a></div>'; return; }
  const { data: pend } = await sb.from('verificacoes').select('id').eq('user_id', me.id).eq('status', 'pendente').limit(1);
  if (pend?.length) { $app.innerHTML = '<div class="card estreito"><h2>Em análise</h2><p>Sua verificação já foi enviada e está sendo analisada.</p><a href="#/conta">Voltar ao perfil</a></div>'; return; }
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
      $app.innerHTML = '<div class="card estreito"><h2>Enviado!</h2><p>Recebemos seus documentos. Assim que a análise for aprovada, o selo ✔ Verificado aparece no seu perfil.</p><a class="btn" href="#/conta">Voltar ao perfil</a></div>';
    } catch (er) {
      falha(er);
      btn.disabled = false;
      $st.textContent = '';
    }
  });
}

// ---------------------------------------------------------------- pedidos de empresas e clientes
async function telaPedidos(params) {
  const meus = !!me && params.get('ver') === 'meus';
  const opcoes = categoriasOrdenadas().map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  $app.innerHTML = `
    ${me ? `<div class="segmentado"><a href="#/pedidos" class="${meus ? '' : 'ativo'}">Pedidos abertos</a><a href="#/pedidos?ver=meus" class="${meus ? 'ativo' : ''}">Meus pedidos</a></div>` : ''}
    ${meus ? '' : `<p class="nota">Empresas e clientes publicam o que precisam. Toque em <b>Tenho interesse</b> para conversar pelo app.</p>
    <div class="filtros-pedido">
      <select id="f-cat" aria-label="Área"><option value="">Todas as áreas</option>${opcoes}</select>
      <label class="filtro-cidade">${ic('pin')}<input id="f-cidade" placeholder="Cidade" aria-label="Cidade"></label>
    </div>`}
    <div id="lista-pedidos"></div>
    ${me && !me.suspenso ? `<a class="fab" href="#/pedidos/novo">${ic('mais')}Publicar pedido</a>` : ''}`;
  const carregar = async () => {
    let q = sb.from('pedidos').select('*,contratante:contratante_id(id,nome,foto_url,verificado)').order('criado_em', { ascending: false }).limit(80);
    if (meus) q = q.eq('contratante_id', me.id);
    else {
      q = q.eq('status', 'aberto');
      const cat = document.getElementById('f-cat').value;
      const cidade = document.getElementById('f-cidade').value.trim();
      if (cat) q = q.eq('categoria_id', cat);
      if (cidade) q = q.ilike('cidade', `%${cidade}%`);
    }
    const { data: lista, error } = await q;
    if (error) throw error;
    document.getElementById('lista-pedidos').innerHTML = (lista || []).map((x) => {
      const meu = me?.id === x.contratante_id;
      const cat = categorias.find((c) => c.id === x.categoria_id);
      return `<div class="card pedido ${x.status}">
        <div class="pedido-topo"><span class="cat-mini">${ic(ICONE_CAT[cat?.nome] || 'grade')}${esc(cat ? nomeCurto(cat.nome) : '')}</span>
          <span class="meta">${x.status === 'fechado' ? '<b>Fechado</b> · ' : ''}${data(x.criado_em)}</span></div>
        <h3>${esc(x.titulo)}</h3>
        <div class="meta">${ic('pin')}${esc(x.cidade)}${x.uf ? ' · ' + esc(x.uf) : ''} · ${ic('pessoas')}${x.vagas} ${x.vagas > 1 ? 'vagas' : 'vaga'}${x.orcamento ? ` · até ${brl(x.orcamento)}` : ''}</div>
        ${x.descricao ? `<p>${esc(x.descricao)}</p>` : ''}
        <div class="pedido-rodape">
          <div class="quem">${avatar(x.contratante, 'mini')}<span>${esc(x.contratante?.nome)}</span>${x.contratante?.verificado ? `<span class="verif-ic" title="Verificado">${ic('check')}</span>` : ''}</div>
          ${meu ? (x.status === 'aberto' ? `<button class="btn sec pequeno" data-fechar="${x.id}">Fechar pedido</button>` : '')
            : `<button class="btn pequeno" data-interesse="${x.id}">Tenho interesse</button>`}
        </div></div>`;
    }).join('') || `<div class="card vazio">${meus ? 'Você ainda não publicou pedidos.' : 'Nenhum pedido aberto com esses filtros.'}</div>`;
  };
  if (!meus) {
    document.getElementById('f-cat').addEventListener('change', () => carregar().catch(falha));
    let espera;
    document.getElementById('f-cidade').addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(() => carregar().catch(falha), 300); });
  }
  document.getElementById('lista-pedidos').addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.interesse) {
      if (!me) { location.hash = '#/entrar'; return; }
      if (!me.is_prestador) { toast('Para responder pedidos, marque "Ofereço serviços" em Conta > Meus dados.', 'erro'); return; }
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

function telaNovoPedido() {
  if (me.suspenso) { $app.innerHTML = '<div class="alerta">Conta suspensa.</div>'; return; }
  let cat = '';
  $app.innerHTML = `<section class="cadastro">
    <h1>O que você precisa?</h1>
    <p class="nota">Os profissionais da área veem seu pedido e respondem pelo chat do app.</p>
    <form id="fnovo" class="form-passo">
      <label>Título do pedido<input name="titulo" required minlength="5" maxlength="120" placeholder="Ex: 3 ajudantes de obra por 10 dias"></label>
      <p class="rotulo">Área</p>
      <div class="cat-grade escolher compacta" id="novo-cats">${categoriasOrdenadas().map((c) => tileCategoria(c, 'button', 'aria-pressed="false"')).join('')}</div>
      <div class="dupla"><label>Cidade<input name="cidade" value="${esc(me.cidade)}" required></label>
        <label>UF<input name="uf" value="${esc(me.uf)}" maxlength="2" required style="text-transform:uppercase"></label></div>
      <div class="dupla igual"><label>Vagas<input name="vagas" type="number" min="1" max="50" value="1" required></label>
        <label>Orçamento total (R$)<input name="orcamento" type="number" min="0" step="1" placeholder="Opcional"></label></div>
      <label>Detalhes<textarea name="descricao" maxlength="1500" placeholder="Datas, horário, bairro, o que está incluso…"></textarea></label>
      <p class="nota">${ic('cadeado')}Não coloque telefone ou e-mail: os profissionais falam com você pelo chat.</p>
      <button class="btn largo">Publicar pedido</button>
    </form></section>`;
  document.getElementById('novo-cats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    cat = b.dataset.cat;
    document.querySelectorAll('#novo-cats [data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  });
  const f = document.getElementById('fnovo');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = form(f);
    if (!cat) return toast('Escolha a área do pedido.', 'erro');
    if (temContato(v.titulo) || temContato(v.descricao)) return toast(AVISO_CONTATO, 'erro');
    const { error } = await sb.from('pedidos').insert({
      contratante_id: me.id, titulo: v.titulo.trim(), descricao: (v.descricao || '').trim(), categoria_id: Number(cat),
      cidade: v.cidade.trim(), uf: v.uf.toUpperCase().trim(), vagas: Number(v.vagas), orcamento: v.orcamento ? Number(v.orcamento) : null,
    });
    if (error) return falha(error);
    toast('Pedido publicado! Os interessados vão aparecer em Mensagens.');
    location.hash = '#/pedidos?ver=meus';
  });
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
