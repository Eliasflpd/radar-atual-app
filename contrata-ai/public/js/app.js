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
const STATUS = { proposta: 'Aguardando pagamento', paga: 'Paga — em andamento', concluida: 'Concluída', cancelada: 'Cancelada' };
const AVISO_CONTATO = '🚫 Não é permitido passar telefone, WhatsApp, e-mail ou redes sociais antes da contratação. '
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
const nomeCategoria = (id) => { const c = categorias.find((x) => x.id === id); return c ? `${c.icone} ${esc(c.nome)}` : ''; };
const form = (el) => Object.fromEntries(new FormData(el));

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
      $app.innerHTML = '<div class="card">⚙️ Configure <b>SUPABASE_URL</b> e <b>SUPABASE_ANON_KEY</b> nas variáveis de ambiente da Vercel.</div>';
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
  $nav.innerHTML = me
    ? `<a href="#/">Buscar</a><a href="#/conversas">Conversas</a><a href="#/perfil">Perfil</a>
       ${me.is_admin ? '<a href="#/admin">Admin</a>' : ''}<button class="link" id="sair">Sair</button>`
    : '<a href="#/">Buscar</a><a href="#/entrar">Entrar</a><a class="btn pequeno" href="#/cadastro">Cadastrar</a>';
  document.getElementById('sair')?.addEventListener('click', async () => { await sb.auth.signOut(); location.hash = '#/'; });
}

async function rota() {
  canais.forEach((c) => sb.removeChannel(c));
  canais = [];
  const [caminho, qs] = location.hash.slice(1).split('?');
  const [tela, id] = (caminho || '/').split('/').filter(Boolean);
  const params = new URLSearchParams(qs || '');
  if (['conversas', 'chat', 'perfil', 'admin'].includes(tela) && !me) { location.hash = '#/entrar'; return; }
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
    $app.innerHTML = '<div class="card">Página não encontrada.</div>';
  } catch (e) {
    $app.innerHTML = `<div class="card erro">Erro: ${esc(e.message)}</div>`;
  }
}

// ---------------------------------------------------------------- busca
async function telaInicio() {
  const opcoes = categorias.map((c) => `<option value="${c.id}">${c.icone} ${esc(c.nome)}</option>`).join('');
  $app.innerHTML = `
    ${me ? '' : `<section class="hero">
      <h1>Encontre o profissional certo.<br>Ou ofereça seu serviço.</h1>
      <p>Pedreiros, eletricistas, diaristas, designers, técnicos e muito mais. Pagamento seguro pelo app.</p>
      <div class="acoes"><a class="btn" href="#/cadastro">Cadastre-se grátis</a><a class="btn sec" href="#/entrar">Já tenho conta</a></div>
    </section>`}
    <form class="busca card" id="busca">
      <select name="cat"><option value="">Todas as áreas</option>${opcoes}</select>
      <input name="cidade" placeholder="Cidade">
      <input name="q" placeholder="O que você precisa? (ex: reboco, tomada)">
      <button class="btn">Buscar</button>
    </form>
    <div class="grade" id="resultados"></div>`;
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
    document.getElementById('resultados').innerHTML = lista.length
      ? lista.map(cardPrestador).join('')
      : '<div class="card vazio">Nenhum profissional encontrado com esses filtros.</div>';
  };
  document.getElementById('busca').addEventListener('submit', (e) => { e.preventDefault(); buscar(form(e.target)).catch(falha); });
  await buscar();
}

function cardPrestador(p) {
  return `<a class="card prestador" href="#/p/${p.id}">
    ${avatar(p)}
    <div>
      <h3>${esc(p.nome)} ${p.verificado ? '<span class="selo" title="Documento verificado">✔ Verificado</span>' : ''}</h3>
      <div class="cat">${nomeCategoria(p.categoria_id)}</div>
      <div class="meta">📍 ${esc(p.cidade)}${p.uf ? '/' + esc(p.uf) : ''}</div>
      <div class="meta"><span class="estrelas">${estrelas(p.avaliacao_media)}</span> (${p.avaliacao_qtd})
        ${p.preco_base ? ` · a partir de <b>${brl(p.preco_base)}</b>` : ''}</div>
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
      <small>🔒 Fica escondido. Só aparece para a outra pessoa depois que a contratação for paga pelo app.</small></label>
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
      $app.innerHTML = '<div class="card estreito"><h2>Quase lá! 📧</h2><p>Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar a conta.</p></div>';
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
  const [{ data: p }, { data: avs }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', id).maybeSingle(),
    sb.from('avaliacoes').select('nota,comentario,criado_em,autor:autor_id(nome)').eq('prestador_id', id).order('criado_em', { ascending: false }).limit(30),
  ]);
  if (!p || !p.is_prestador) { $app.innerHTML = '<div class="card">Profissional não encontrado.</div>'; return; }
  $app.innerHTML = `<div class="card perfil-publico">
      ${avatar(p, 'grande')}
      <h2>${esc(p.nome)} ${p.verificado ? '<span class="selo">✔ Verificado</span>' : ''}</h2>
      <div class="cat">${nomeCategoria(p.categoria_id)}</div>
      <div class="meta">📍 ${esc(p.cidade)}${p.uf ? '/' + esc(p.uf) : ''} · membro desde ${data(p.criado_em)}</div>
      <div class="meta"><span class="estrelas">${estrelas(p.avaliacao_media)}</span> ${Number(p.avaliacao_media).toFixed(1)} (${p.avaliacao_qtd} avaliações)</div>
      ${p.preco_base ? `<div class="preco">A partir de ${brl(p.preco_base)}</div>` : ''}
      <p class="bio">${esc(p.bio) || '<i>Sem descrição.</i>'}</p>
      ${p.suspenso ? '<div class="alerta">Este profissional está temporariamente indisponível.</div>'
        : me?.id === p.id ? '<a class="btn sec" href="#/perfil">Editar meu perfil</a>'
        : '<button class="btn" id="conversar">💬 Conversar e pedir orçamento</button>'}
      <p class="nota">🔒 O WhatsApp do profissional é liberado depois que você contratar e pagar pelo app.</p>
    </div>
    <h3>Avaliações</h3>
    ${(avs || []).map((a) => `<div class="card avaliacao"><span class="estrelas">${estrelas(a.nota)}</span>
      <b>${esc(a.autor?.nome)}</b> · ${data(a.criado_em)}<p>${esc(a.comentario)}</p></div>`).join('') || '<div class="card vazio">Ainda sem avaliações.</div>'}`;
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
  $app.innerHTML = `<h2>Conversas</h2>${lista.map((c) => {
    const souPrestador = c.prestador.id === me.id;
    const outro = souPrestador ? c.contratante : c.prestador;
    return `<a class="card linha" href="#/chat/${c.id}">${avatar(outro)}<div><b>${esc(outro.nome)}</b>
      <div class="meta">${souPrestador ? 'Cliente interessado no seu serviço' : 'Profissional'} · ${data(c.criado_em)}</div></div></a>`;
  }).join('') || '<div class="card vazio">Nenhuma conversa ainda. <a href="#/">Busque um profissional</a>.</div>'}`;
}

async function telaChat(id, params) {
  const { data: c, error } = await sb.from('conversas')
    .select('id,contratante_id,prestador_id,contratante:contratante_id(id,nome,foto_url),prestador:prestador_id(id,nome,foto_url,categoria_id)')
    .eq('id', id).maybeSingle();
  if (error) throw error;
  if (!c) { $app.innerHTML = '<div class="card">Conversa não encontrada.</div>'; return; }
  const souPrestador = c.prestador_id === me.id;
  const outro = souPrestador ? c.contratante : c.prestador;
  if (params.get('pago') === '1') toast('Pagamento enviado! Assim que o Mercado Pago confirmar, o contato é liberado.');
  if (params.get('pago') === '0') toast('O pagamento não foi concluído.', 'erro');

  $app.innerHTML = `<div class="chat">
    <div class="chat-topo">${avatar(outro)}<div><b>${esc(outro.nome)}</b>
      <div class="meta">${souPrestador ? 'Cliente' : nomeCategoria(c.prestador.categoria_id)}</div></div></div>
    <div id="contratos"></div>
    <div class="mensagens" id="msgs"></div>
    ${me.suspenso ? '<div class="alerta">Sua conta está suspensa por tentativas de passar contato. Fale com o suporte.</div>' : `
    <form class="enviar" id="fmsg"><input name="t" placeholder="Escreva sua mensagem…" autocomplete="off" maxlength="2000" required><button class="btn">Enviar</button></form>`}
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
      contato = `<div class="card liberado">🔓 <b>Contato liberado</b> — combine endereço e horário:
        ${z ? `<a class="btn zap" target="_blank" rel="noopener" href="https://wa.me/55${z}">WhatsApp de ${esc(outro.nome.split(' ')[0])}</a>` : ''}
        ${k?.[0]?.email ? `<div class="meta">✉️ ${esc(k[0].email)}</div>` : ''}</div>`;
    }
    const cards = (cts || []).map((ct) => `<div class="card proposta ${ct.status}">
      <div class="linha-esp"><b>📝 Proposta</b><span class="status">${STATUS[ct.status]}</span></div>
      <p>${esc(ct.descricao)}</p>
      <div class="valor">${brl(ct.valor)}</div>
      ${souPrestador ? `<div class="meta">Taxa do app (10%): ${brl(ct.comissao)} · <b>Você recebe ${brl(ct.valor_prestador)}</b>${ct.repassado_em ? ` · ✅ repassado em ${data(ct.repassado_em)}` : ''}</div>` : ''}
      <div class="acoes">
        ${ct.status === 'proposta' && !souPrestador ? `<button class="btn" data-pagar="${ct.id}">💳 Pagar e contratar</button>` : ''}
        ${ct.status === 'proposta' ? `<button class="btn sec" data-cancelar="${ct.id}">Cancelar</button>` : ''}
        ${ct.status === 'paga' && !souPrestador ? `<button class="btn" data-concluir="${ct.id}">✅ Serviço foi feito</button>` : ''}
        ${ct.status === 'paga' && souPrestador ? '<span class="meta">Quando o cliente confirmar a conclusão, seu pagamento é liberado.</span>' : ''}
      </div>
      ${ct.status === 'concluida' && !souPrestador && !avaliadas.has(ct.id) ? `<form class="avaliar" data-avaliar="${ct.id}">
        <b>Avalie o serviço:</b>
        <select name="nota">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${estrelas(n)}</option>`).join('')}</select>
        <input name="comentario" placeholder="Comentário (opcional)" maxlength="500"><button class="btn pequeno">Enviar</button></form>` : ''}
    </div>`).join('');
    const novo = souPrestador && !me.suspenso ? `<details class="card"><summary>➕ Enviar proposta de orçamento</summary>
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
  const [{ data: priv }, { data: cts }] = await Promise.all([
    sb.from('contatos_privados').select('*').eq('user_id', me.id).maybeSingle(),
    sb.from('contratacoes').select('*,contratante:contratante_id(nome),prestador:prestador_id(nome)')
      .or(`contratante_id.eq.${me.id},prestador_id.eq.${me.id}`).neq('status', 'cancelada').order('criado_em', { ascending: false }),
  ]);
  const opcoes = categorias.map((c) => `<option value="${c.id}" ${c.id === me.categoria_id ? 'selected' : ''}>${c.icone} ${esc(c.nome)}</option>`).join('');
  const ganhos = (cts || []).filter((x) => x.prestador_id === me.id && ['paga', 'concluida'].includes(x.status));
  $app.innerHTML = `
    ${me.suspenso ? '<div class="alerta">⛔ Conta suspensa por tentativas de passar contato fora do app.</div>'
      : me.avisos ? `<div class="alerta">⚠️ Você tem ${me.avisos} aviso(s) por tentar passar contato. Com 3, a conta é suspensa.</div>` : ''}
    <form class="card" id="fperfil">
      <h2>Meu perfil público</h2>
      <p class="nota">Isto aparece para todos. <b>Não coloque telefone, WhatsApp, e-mail ou redes sociais</b> — o sistema bloqueia.</p>
      <label>Nome<input name="nome" value="${esc(me.nome)}" required></label>
      <div class="dupla"><label>Cidade<input name="cidade" value="${esc(me.cidade)}"></label>
        <label>UF<input name="uf" value="${esc(me.uf)}" maxlength="2" style="text-transform:uppercase"></label></div>
      <label>Foto (link da imagem)<input name="foto_url" value="${esc(me.foto_url)}" placeholder="https://…"></label>
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
    <form class="card" id="fpriv">
      <h2>🔒 Dados privados</h2>
      <p class="nota">Só aparecem para a outra parte depois do pagamento. A chave Pix é vista só pela administração, para seu repasse.</p>
      <label>WhatsApp<input name="whatsapp" value="${esc(priv?.whatsapp)}" inputmode="tel"></label>
      ${me.is_prestador ? `<label>Chave Pix para receber<input name="chave_pix" value="${esc(priv?.chave_pix)}"></label>` : ''}
      <button class="btn">Salvar dados privados</button>
    </form>
    ${me.is_prestador ? `<div class="card"><h2>💰 Meus ganhos</h2>
      <div class="numeros">
        <div><span>${brl(ganhos.reduce((s, x) => s + Number(x.valor_prestador), 0))}</span>total a receber/recebido</div>
        <div><span>${brl(ganhos.filter((x) => x.repassado_em).reduce((s, x) => s + Number(x.valor_prestador), 0))}</span>já repassado</div>
        <div><span>${ganhos.length}</span>serviços</div>
      </div></div>` : ''}
    <div class="card"><h2>Minhas contratações</h2>
      ${(cts || []).map((x) => `<a class="linha-esp item" href="#/chat/${x.conversa_id}">
        <span>${x.prestador_id === me.id ? `🛠️ Para ${esc(x.contratante?.nome)}` : `🧾 Com ${esc(x.prestador?.nome)}`} — ${esc(x.descricao.slice(0, 50))}</span>
        <span>${brl(x.valor)} · ${STATUS[x.status]}</span></a>`).join('') || '<p class="vazio">Nenhuma ainda.</p>'}
    </div>`;

  const fp = document.getElementById('fperfil');
  fp.is_prestador.addEventListener('change', () => { document.getElementById('campos-prestador').hidden = !fp.is_prestador.checked; });
  fp.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = form(fp);
    if (temContato(v.bio) || temContato(v.nome)) return toast(AVISO_CONTATO, 'erro');
    const { error } = await sb.from('profiles').update({
      nome: v.nome.trim(), cidade: v.cidade.trim(), uf: (v.uf || '').toUpperCase().trim(), foto_url: v.foto_url.trim(),
      is_contratante: !!v.is_contratante, is_prestador: !!v.is_prestador,
      categoria_id: v.categoria_id ? Number(v.categoria_id) : null,
      preco_base: v.preco_base ? Number(v.preco_base) : null, bio: (v.bio || '').trim(),
    }).eq('id', me.id);
    if (error) return falha(error);
    await carregarMe((await sb.auth.getSession()).data.session);
    renderNav();
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
    </div>
    <div class="abas"><button data-aba="repasses" class="ativa">Repasses</button><button data-aba="contratacoes">Contratações</button>
      <button data-aba="burla">Tentativas de burla</button><button data-aba="usuarios">Usuários</button></div>
    <div id="aba"></div>`;
  const abas = { repasses: abaRepasses, contratacoes: abaContratacoes, burla: abaBurla, usuarios: abaUsuarios };
  document.querySelector('.abas').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    document.querySelectorAll('.abas button').forEach((x) => x.classList.toggle('ativa', x === b));
    abas[b.dataset.aba]().catch(falha);
  });
  await abaRepasses();
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
      <div class="meta">Pix: <b>${esc(pixDe[x.prestador_id]?.chave_pix) || '⚠️ não cadastrada'}</b></div></div>
      <div><div class="valor">${brl(x.valor_prestador)}</div><button class="btn pequeno" data-repasse="${x.id}">Marquei como pago</button></div></div>`).join('')
    || '<div class="card vazio">Nenhum repasse pendente. 🎉</div>'}`;
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
