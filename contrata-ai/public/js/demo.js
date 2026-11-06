// MODO DEMONSTRAÇÃO — imita o Supabase dentro do navegador, com dados de exemplo.
// Aplica as mesmas regras do banco real (supabase/schema.sql): contato oculto até
// o pagamento, filtro anti-contato, 3 avisos = suspensão, comissão de 10%.
import { temContato } from './filtro.js';

const CHAVE = 'contrata-demo-v1';
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now());
const agora = (minAtras = 0) => new Date(Date.now() - minAtras * 60000).toISOString();
const r2 = (n) => Math.round(n * 100) / 100;

const CATEGORIAS = [
  ['Pedreiro', '🧱'], ['Eletricista', '💡'], ['Encanador', '🚰'], ['Pintor', '🎨'], ['Diarista / Limpeza', '🧹'],
  ['Jardineiro', '🌿'], ['Marceneiro', '🪚'], ['Serralheiro', '⚙️'], ['Mecânico', '🔧'], ['Técnico em informática', '💻'],
  ['Designer', '✏️'], ['Programador', '👨‍💻'], ['Fotógrafo', '📷'], ['Professor particular', '📚'], ['Cabeleireiro / Beleza', '💇'],
  ['Cozinheiro / Buffet', '🍳'], ['Motorista / Frete', '🚚'], ['Contador', '📊'], ['Advogado', '⚖️'], ['Cuidador / Babá', '🤝'], ['Outros', '🛠️'],
].map(([nome, icone], i) => ({ id: i + 1, nome, icone }));

export const PERFIS_DEMO = {
  cliente: 'u-cliente', prestador: 'u-pedro', admin: 'u-admin',
};

function perfil(id, nome, extra = {}) {
  return {
    id, nome, cidade: '', uf: '', bio: '', foto_url: '', categoria_id: null, preco_base: null,
    is_prestador: false, is_contratante: true, is_admin: false, verificado: false, suspenso: false, avisos: 0,
    avaliacao_media: 0, avaliacao_qtd: 0, criado_em: agora(60 * 24 * 90), ...extra,
  };
}

function semente() {
  const P = (id, nome, cat, cidade, uf, bio, preco, media, qtd, verificado = false) =>
    perfil(id, nome, { categoria_id: cat, cidade, uf, bio, preco_base: preco, is_prestador: true, is_contratante: false, avaliacao_media: media, avaliacao_qtd: qtd, verificado });
  const profiles = [
    perfil('u-admin', 'Você (Administrador)', { is_admin: true, cidade: 'São Paulo', uf: 'SP' }),
    perfil('u-cliente', 'Mariana Souza', { cidade: 'São Paulo', uf: 'SP' }),
    perfil('u-empresa', 'Construtora Alfa Ltda', { cidade: 'São Paulo', uf: 'SP' }),
    P('u-pedro', 'Pedro Almeida', 1, 'São Paulo', 'SP', 'Pedreiro há 15 anos. Reboco, contrapiso, assentamento de piso e porcelanato, pequenas reformas. Atendo zona sul e centro.', 180, 4.8, 23, true),
    P('u-ana', 'Ana Lúcia Ferreira', 5, 'Campinas', 'SP', 'Diarista com experiência em residências e escritórios. Limpeza pesada pós-obra também.', 150, 4.9, 41, true),
    P('u-joao', 'João Batista Silva', 2, 'Rio de Janeiro', 'RJ', 'Eletricista NR10. Instalação de tomadas, chuveiro, quadro de distribuição e iluminação.', 120, 4.6, 17),
    P('u-rafa', 'Rafaela Costa', 3, 'São Paulo', 'SP', 'Encanadora. Vazamentos, troca de registros, desentupimento e instalação de aquecedor.', 130, 4.7, 12, true),
    P('u-lucas', 'Lucas Moreira', 11, 'Belo Horizonte', 'MG', 'Designer gráfico: logotipo, identidade visual, cardápios e posts para redes sociais.', 350, 5.0, 8),
    P('u-carla', 'Carla Mendes', 4, 'Curitiba', 'PR', 'Pintura residencial e comercial, textura, grafiato e massa corrida.', 200, 4.5, 9),
    P('u-bruno', 'Bruno Santos', 17, 'São Paulo', 'SP', 'Fretes e pequenas mudanças com Fiorino. Ajudante incluso.', 160, 4.4, 30),
    P('u-sofia', 'Sofia Ribeiro', 14, 'Salvador', 'BA', 'Professora de matemática e física. Reforço escolar e preparatório para o ENEM.', 80, 4.9, 15, true),
  ];
  const contatos_privados = profiles.map((p, i) => ({
    user_id: p.id, whatsapp: `11 9${String(8000 + i * 137).padStart(4, '0')}-${String(1000 + i * 71).slice(0, 4)}`,
    email: `${p.nome.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@exemplo.com`, chave_pix: p.is_prestador ? `${p.nome.split(' ')[0].toLowerCase()}@pix.exemplo` : '',
  }));
  const conversas = [
    { id: 'c-1', contratante_id: 'u-cliente', prestador_id: 'u-pedro', criado_em: agora(180) },
    { id: 'c-2', contratante_id: 'u-empresa', prestador_id: 'u-pedro', criado_em: agora(60 * 24 * 10) },
  ];
  let mid = 1;
  const M = (conv, autor, texto, min, bloqueada = false) => ({ id: mid++, conversa_id: conv, autor_id: autor, texto, bloqueada, criado_em: agora(min) });
  const mensagens = [
    M('c-1', 'u-cliente', 'Olá Pedro! Preciso rebocar uma parede de uns 20m² no meu apartamento. Você faz?', 175),
    M('c-1', 'u-pedro', 'Faço sim, Mariana! O material fica por sua conta ou incluo no orçamento?', 170),
    M('c-1', 'u-cliente', 'Pode ser por minha conta. Quando você poderia começar?', 165),
    M('c-1', 'u-pedro', '🚫 Mensagem bloqueada: não é permitido passar contato antes da contratação. Após o pagamento pelo app, o WhatsApp é liberado automaticamente.', 160, true),
    M('c-1', 'u-pedro', 'Desculpe! Posso começar na segunda. Vou te mandar a proposta aqui pelo app.', 158),
    M('c-2', 'u-empresa', 'Pedro, precisamos de contrapiso em 3 salas comerciais.', 60 * 24 * 10),
    M('c-2', 'u-pedro', 'Combinado, segue a proposta.', 60 * 24 * 10 - 5),
  ];
  const ct = (id, conv, contratante, prestador, descricao, valor, status, extra = {}) => ({
    id, conversa_id: conv, contratante_id: contratante, prestador_id: prestador, descricao, valor, taxa_comissao: 0.1,
    status, mp_payment_id: null, pago_em: null, concluido_em: null, repassado_em: null, criado_em: agora(150), ...extra,
  });
  const contratacoes = [
    ct('k-1', 'c-1', 'u-cliente', 'u-pedro', 'Reboco de parede de 20m² (material por conta da cliente). 2 dias de serviço.', 1500, 'proposta'),
    ct('k-2', 'c-2', 'u-empresa', 'u-pedro', 'Contrapiso em 3 salas comerciais (60m²).', 4200, 'concluida',
      { pago_em: agora(60 * 24 * 9), concluido_em: agora(60 * 24 * 2), criado_em: agora(60 * 24 * 10) }),
  ];
  const avaliacoes = [
    { contratacao_id: 'k-2', prestador_id: 'u-pedro', autor_id: 'u-empresa', nota: 5, comentario: 'Serviço caprichado e entregue no prazo.', criado_em: agora(60 * 24 * 2) },
  ];
  const tentativas_burla = [
    { id: 1, user_id: 'u-pedro', conversa_id: 'c-1', onde: 'chat', texto_original: 'me chama no zap que a gente combina melhor', criado_em: agora(160) },
  ];
  profiles.find((p) => p.id === 'u-pedro').avisos = 1;
  return {
    users: profiles.map((p) => ({ id: p.id, email: contatos_privados.find((c) => c.user_id === p.id).email, senha: 'demo123' })),
    categorias: CATEGORIAS, profiles, contatos_privados, conversas, mensagens, contratacoes, avaliacoes, tentativas_burla,
    seq: { mensagens: mid, tentativas_burla: 2 }, sessao: 'u-cliente',
  };
}

// ------------------------------------------------------------------ armazenamento
function carregar() {
  try { const s = localStorage.getItem(CHAVE); if (s) return JSON.parse(s); } catch { /* sem storage */ }
  return semente();
}
let db = carregar();
const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { /* sem storage */ } };

// ------------------------------------------------------------------ regras (como no banco)
const uid = () => db.sessao;
const eu = () => db.profiles.find((p) => p.id === uid());
const isAdmin = () => !!eu()?.is_admin;
const conversa = (id) => db.conversas.find((c) => c.id === id);
const participa = (convId) => { const c = conversa(convId); return c && [c.contratante_id, c.prestador_id].includes(uid()); };
const liberado = (a, b) => db.contratacoes.some((x) => ['paga', 'concluida'].includes(x.status)
  && ((x.contratante_id === a && x.prestador_id === b) || (x.contratante_id === b && x.prestador_id === a)));
const comCalculados = (x) => ({ ...x, comissao: r2(x.valor * x.taxa_comissao), valor_prestador: r2(x.valor - r2(x.valor * x.taxa_comissao)) });

const VISIVEL = {
  contatos_privados: (r) => r.user_id === uid() || isAdmin(),
  conversas: (r) => [r.contratante_id, r.prestador_id].includes(uid()) || isAdmin(),
  mensagens: (r) => participa(r.conversa_id) || isAdmin(),
  contratacoes: (r) => [r.contratante_id, r.prestador_id].includes(uid()) || isAdmin(),
  tentativas_burla: () => isAdmin(),
};
const EDITAVEL = {
  profiles: ['nome', 'cidade', 'uf', 'bio', 'foto_url', 'categoria_id', 'preco_base', 'is_prestador', 'is_contratante'],
  contatos_privados: ['whatsapp', 'chave_pix'],
};

function registrarBurla(user, conv, onde, texto) {
  db.tentativas_burla.push({ id: db.seq.tentativas_burla++, user_id: user, conversa_id: conv, onde, texto_original: texto, criado_em: agora() });
  const p = db.profiles.find((x) => x.id === user);
  p.avisos += 1;
  if (p.avisos >= 3) p.suspenso = true;
}

const erro = (message) => ({ data: null, error: { message } });

// ------------------------------------------------------------------ tempo real (mesmo navegador)
let ouvintes = [];
function emitir(table, event, row) {
  for (const o of ouvintes) {
    if (o.table !== table || (o.event !== '*' && o.event !== event)) continue;
    if (o.filter) { const [col, val] = o.filter.split('=eq.'); if (String(row[col]) !== val) continue; }
    setTimeout(() => o.cb({ new: row }), 0);
  }
}

// ------------------------------------------------------------------ select com "embeds"
function partesSelect(sel) {
  const out = []; let nivel = 0, atual = '';
  for (const ch of sel) {
    if (ch === '(') nivel++;
    if (ch === ')') nivel--;
    if (ch === ',' && nivel === 0) { out.push(atual.trim()); atual = ''; } else atual += ch;
  }
  if (atual.trim()) out.push(atual.trim());
  return out;
}
function projetar(row, sel) {
  const partes = partesSelect(sel || '*');
  const out = {};
  for (const p of partes) {
    const m = /^(\w+):(\w+)\((.*)\)$/.exec(p);
    if (m) {
      const ref = db.profiles.find((x) => x.id === row[m[2]]);
      out[m[1]] = ref ? projetar(ref, m[3]) : null;
    } else if (p === '*') Object.assign(out, row);
    else out[p] = row[p];
  }
  return out;
}
const likeRe = (p) => new RegExp('^' + String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i');
const linhas = (t) => (t === 'contratacoes' ? db.contratacoes.map(comCalculados) : db[t]);

class Consulta {
  constructor(tabela) { Object.assign(this, { t: tabela, f: [], op: 'select', sel: '*', ord: [], lim: null, um: null, dados: null }); }
  select(s = '*') { this.sel = s; return this; }
  eq(c, v) { this.f.push((r) => String(r[c]) === String(v)); return this; }
  neq(c, v) { this.f.push((r) => String(r[c]) !== String(v)); return this; }
  is(c, v) { this.f.push((r) => (r[c] ?? null) === v); return this; }
  in(c, arr) { const s = new Set((arr || []).map(String)); this.f.push((r) => s.has(String(r[c]))); return this; }
  ilike(c, p) { const re = likeRe(p); this.f.push((r) => re.test(r[c] || '')); return this; }
  or(expr) {
    const conds = expr.split(',').map((p) => { const [c, op, ...v] = p.split('.'); const val = v.join('.');
      return (r) => (op === 'ilike' ? likeRe(val).test(r[c] || '') : String(r[c]) === val); });
    this.f.push((r) => conds.some((fn) => fn(r))); return this;
  }
  order(c, { ascending = true } = {}) { this.ord.push([c, ascending]); return this; }
  limit(n) { this.lim = n; return this; }
  maybeSingle() { this.um = 'talvez'; return this; }
  single() { this.um = 'um'; return this; }
  insert(d) { this.op = 'insert'; this.dados = d; return this; }
  update(d) { this.op = 'update'; this.dados = d; return this; }
  then(ok, falhou) { return Promise.resolve().then(() => this.executar()).then(ok, falhou); }

  filtrar() {
    const vis = VISIVEL[this.t] || (() => true);
    let rs = linhas(this.t).filter((r) => vis(r) && this.f.every((fn) => fn(r)));
    for (const [c, asc] of [...this.ord].reverse()) {
      rs = [...rs].sort((a, b) => { const x = a[c], y = b[c]; const d = typeof x === 'boolean' || typeof x === 'number' ? Number(x) - Number(y) : String(x ?? '').localeCompare(String(y ?? '')); return asc ? d : -d; });
    }
    return this.lim ? rs.slice(0, this.lim) : rs;
  }
  responder(rs) {
    const data = rs.map((r) => projetar(r, this.sel));
    if (this.um === 'um') return data.length === 1 ? { data: data[0], error: null } : erro('Registro não encontrado.');
    if (this.um === 'talvez') return { data: data[0] ?? null, error: null };
    return { data, error: null };
  }
  executar() {
    if (!uid() && this.op !== 'select') return erro('Faça login.');
    if (this.op === 'select') return this.responder(this.filtrar());
    if (this.op === 'update') return this.atualizar();
    return this.inserir();
  }
  atualizar() {
    const cols = EDITAVEL[this.t];
    if (!cols) return erro(`permission denied for table ${this.t}`);
    const proibidas = Object.keys(this.dados).filter((k) => !cols.includes(k));
    if (proibidas.length) return erro(`permission denied for table ${this.t}`);
    const chave = this.t === 'profiles' ? 'id' : 'user_id';
    const alvo = this.filtrar().filter((r) => r[chave] === uid());
    if (this.t === 'profiles' && (temContato(this.dados.bio) || temContato(this.dados.nome))) {
      return erro('Não é permitido colocar contato (telefone, WhatsApp, e-mail, redes) no perfil público.');
    }
    for (const r of alvo) Object.assign(db[this.t].find((x) => x[chave] === r[chave]), this.dados);
    salvar();
    return { data: null, error: null };
  }
  inserir() {
    const d = { ...this.dados };
    const me = eu();
    if (this.t === 'conversas') {
      const prest = db.profiles.find((p) => p.id === d.prestador_id);
      if (d.contratante_id !== uid() || me.suspenso || !prest?.is_prestador || prest.suspenso || d.prestador_id === uid()) {
        return erro('new row violates row-level security policy for table "conversas"');
      }
      if (db.conversas.some((c) => c.contratante_id === d.contratante_id && c.prestador_id === d.prestador_id)) return erro('Conversa já existe.');
      Object.assign(d, { id: uuid(), criado_em: agora() });
      db.conversas.push(d);
    } else if (this.t === 'mensagens') {
      if (d.autor_id !== uid() || me.suspenso || !participa(d.conversa_id)) {
        return erro(me.suspenso ? 'Sua conta está suspensa.' : 'new row violates row-level security policy for table "mensagens"');
      }
      const c = conversa(d.conversa_id);
      Object.assign(d, { id: db.seq.mensagens++, bloqueada: false, criado_em: agora() });
      if (!liberado(c.contratante_id, c.prestador_id) && temContato(d.texto)) {
        registrarBurla(d.autor_id, d.conversa_id, 'chat', d.texto);
        d.texto = '🚫 Mensagem bloqueada: não é permitido passar contato antes da contratação. Após o pagamento pelo app, o WhatsApp é liberado automaticamente.';
        d.bloqueada = true;
      }
      db.mensagens.push(d);
      emitir('mensagens', 'INSERT', d);
    } else if (this.t === 'avaliacoes') {
      const k = db.contratacoes.find((x) => x.id === d.contratacao_id);
      if (d.autor_id !== uid() || !k || k.contratante_id !== uid() || k.status !== 'concluida') return erro('Só é possível avaliar serviço concluído.');
      if (db.avaliacoes.some((a) => a.contratacao_id === d.contratacao_id)) return erro('Você já avaliou este serviço.');
      d.criado_em = agora();
      db.avaliacoes.push(d);
      const p = db.profiles.find((x) => x.id === d.prestador_id);
      const notas = db.avaliacoes.filter((a) => a.prestador_id === p.id).map((a) => a.nota);
      // mantém o histórico de exemplo na média
      const baseQtd = p.avaliacao_qtd, baseMedia = Number(p.avaliacao_media);
      p.avaliacao_qtd = baseQtd + 1;
      p.avaliacao_media = r2((baseMedia * baseQtd + d.nota) / p.avaliacao_qtd);
      void notas;
    } else {
      return erro(`permission denied for table ${this.t}`);
    }
    salvar();
    return this.responder([d]);
  }
}

// ------------------------------------------------------------------ funções (RPC)
const RPC = {
  enviar_proposta({ conv, p_descricao, p_valor }) {
    const c = conversa(conv);
    if (c?.prestador_id !== uid()) throw new Error('Só o prestador pode enviar proposta.');
    if (eu().suspenso) throw new Error('Conta suspensa.');
    if (temContato(p_descricao)) throw new Error('Não é permitido colocar contato na proposta.');
    if (!(p_valor >= 10)) throw new Error('O valor mínimo é R$ 10,00.');
    const k = { id: uuid(), conversa_id: conv, contratante_id: c.contratante_id, prestador_id: c.prestador_id, descricao: p_descricao,
      valor: r2(p_valor), taxa_comissao: 0.1, status: 'proposta', mp_payment_id: null, pago_em: null, concluido_em: null, repassado_em: null, criado_em: agora() };
    db.contratacoes.push(k);
    emitir('contratacoes', 'INSERT', k);
    return k.id;
  },
  concluir_servico({ cid }) {
    const k = db.contratacoes.find((x) => x.id === cid && x.contratante_id === uid() && x.status === 'paga');
    if (!k) throw new Error('Contratação não encontrada ou ainda não paga.');
    Object.assign(k, { status: 'concluida', concluido_em: agora() });
  },
  cancelar_proposta({ cid }) {
    const k = db.contratacoes.find((x) => x.id === cid && x.status === 'proposta' && [x.contratante_id, x.prestador_id].includes(uid()));
    if (!k) throw new Error('Só dá para cancelar proposta ainda não paga.');
    k.status = 'cancelada';
  },
  ver_contato({ outro }) {
    if (!(liberado(uid(), outro) || isAdmin())) throw new Error('Contato liberado só após o pagamento pelo app.');
    const c = db.contatos_privados.find((x) => x.user_id === outro);
    return c ? [{ whatsapp: c.whatsapp, email: c.email }] : [];
  },
  admin_atualizar_usuario({ uid: alvo, p_verificado, p_suspenso }) {
    if (!isAdmin()) throw new Error('Apenas administrador.');
    const p = db.profiles.find((x) => x.id === alvo);
    if (p.suspenso && !p_suspenso) p.avisos = 0;
    Object.assign(p, { verificado: p_verificado, suspenso: p_suspenso });
  },
  admin_marcar_repasse({ cid }) {
    if (!isAdmin()) throw new Error('Apenas administrador.');
    const k = db.contratacoes.find((x) => x.id === cid && x.status === 'concluida' && !x.repassado_em);
    if (k) k.repassado_em = agora();
  },
  admin_resumo() {
    if (!isAdmin()) throw new Error('Apenas administrador.');
    const pagas = db.contratacoes.map(comCalculados).filter((x) => ['paga', 'concluida'].includes(x.status));
    const soma = (arr, c) => r2(arr.reduce((s, x) => s + Number(x[c]), 0));
    return {
      usuarios: db.profiles.length, prestadores: db.profiles.filter((p) => p.is_prestador).length,
      contratantes: db.profiles.filter((p) => p.is_contratante).length, contratacoes: pagas.length,
      faturado: soma(pagas, 'valor'), comissao: soma(pagas, 'comissao'),
      repasse_pendente: soma(pagas.filter((x) => x.status === 'concluida' && !x.repassado_em), 'valor_prestador'),
      tentativas: db.tentativas_burla.length,
    };
  },
};

// ------------------------------------------------------------------ cliente falso
export function criarDemo() {
  let aoMudar = () => {};
  const sessao = () => {
    const u = db.users.find((x) => x.id === uid());
    return u ? { user: { id: u.id, email: u.email }, access_token: 'demo' } : null;
  };
  const trocar = (id) => { db.sessao = id; salvar(); aoMudar(id ? 'SIGNED_IN' : 'SIGNED_OUT', sessao()); };

  const sb = {
    from: (t) => new Consulta(t),
    async rpc(nome, args) {
      try { const data = RPC[nome](args || {}); salvar(); return { data, error: null }; } catch (e) { return erro(e.message); }
    },
    auth: {
      async getSession() { return { data: { session: sessao() } }; },
      onAuthStateChange(cb) { aoMudar = cb; return { data: { subscription: { unsubscribe() {} } } }; },
      async signInWithPassword({ email }) {
        const u = db.users.find((x) => x.email.toLowerCase() === String(email).toLowerCase());
        if (!u) return erro('Credenciais inválidas');
        trocar(u.id); return { data: { session: sessao() }, error: null };
      },
      async signUp({ email, options }) {
        if (db.users.some((x) => x.email.toLowerCase() === email.toLowerCase())) return erro('Este e-mail já está cadastrado.');
        const m = options?.data || {};
        const id = uuid();
        db.users.push({ id, email, senha: '' });
        db.profiles.push(perfil(id, m.nome || '', { is_prestador: !!m.is_prestador, is_contratante: m.is_contratante !== false, criado_em: agora() }));
        db.contatos_privados.push({ user_id: id, whatsapp: m.whatsapp || '', email, chave_pix: '' });
        trocar(id);
        return { data: { session: sessao() }, error: null };
      },
      async signOut() { trocar(null); return { error: null }; },
      async resetPasswordForEmail() { return { error: null }; },
    },
    channel() {
      const ch = { regs: [], on(_tipo, opts, cb) { ch.regs.push({ ...opts, cb }); return ch; }, subscribe() { ouvintes.push(...ch.regs); return ch; } };
      return ch;
    },
    removeChannel(ch) { ouvintes = ouvintes.filter((o) => !ch.regs.includes(o)); },
    demo: {
      async pagar(cid) {
        const k = db.contratacoes.find((x) => x.id === cid);
        if (!k || k.contratante_id !== uid() || k.status !== 'proposta') throw new Error('Esta proposta não está aguardando pagamento.');
        Object.assign(k, { status: 'paga', mp_payment_id: 'DEMO-' + Date.now(), pago_em: agora() });
        salvar();
      },
      entrarComo: (id) => trocar(id),
      resetar() { db = semente(); salvar(); location.hash = '#/'; location.reload(); },
    },
  };
  montarBarra(sb);
  return sb;
}

function montarBarra(sb) {
  document.body.classList.add('demo');
  const barra = document.createElement('div');
  barra.className = 'demo-barra';
  const papeis = [['cliente', 'Mariana (cliente)', '#/conversas'], ['prestador', 'Pedro (pedreiro)', '#/conversas'], ['admin', 'Você (admin)', '#/admin']];
  const desenhar = () => {
    barra.innerHTML = `<b>Demonstração · entrar como:</b>${papeis.map(([k, rot]) =>
      `<button data-p="${k}" class="${db.sessao === PERFIS_DEMO[k] ? 'ativo' : ''}">${rot}</button>`).join('')}<button data-reset="1">Recomeçar</button>`;
  };
  barra.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.reset) return sb.demo.resetar();
    const [, , destino] = papeis.find(([k]) => k === b.dataset.p);
    sb.demo.entrarComo(PERFIS_DEMO[b.dataset.p]);
    location.hash = destino;
    desenhar();
  });
  desenhar();
  window.addEventListener('hashchange', desenhar);
  document.body.appendChild(barra);
}
