// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — ÁREA DA CLIENTE: acesso, login e sessão (12/11/2026)
//
// • A cliente só ativa o acesso por um LINK PESSOAL que o salão gera no perfil
//   dela (ca_convite) e manda pelo próprio WhatsApp. O link leva um token
//   aleatório de 32 bytes no "#" do endereço (não vai para logs do servidor);
//   no banco fica só o SHA-256. Vale 7 dias, uma única vez; um link novo
//   invalida o anterior.
// • Login: WhatsApp + PIN de 6 dígitos (scrypt). 5 erros → bloqueio de 15 min;
//   30 erros por IP em 15 min → bloqueio do IP. Mensagens sempre genéricas.
//   Esqueceu o PIN → pede um novo link ao salão.
// • Sessão PRÓPRIA: cookie "brow_cliente" (HttpOnly, SameSite=Strict, Secure em
//   HTTPS), só o hash no banco (brow_cliente_sessoes). Nunca se mistura com a
//   sessão da equipe (cookie "brow_sessao"): ações cl_* só aceitam a sessão da
//   cliente; as demais ações só aceitam a sessão da equipe.
// • A cliente NUNCA recebe anamnese, fotos, técnica, observações internas ou valores.
// • Ações da equipe (com sessão da equipe): ca_estado, ca_convite, ca_desativar.
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');

const COOKIE = 'brow_cliente';
const CONVITE_MS = 7 * 864e5, INATIVO_MS = 30 * 864e5, MAXIMO_MS = 90 * 864e5;
const MAX_CLIENTE = 5, MAX_IP = 30, JANELA_MIN = 15;
const MSG_LINK = 'Este link não vale mais (expirou, já foi usado ou foi substituído). Peça um novo link ao salão.';

async function garantirTabelas(c) {
  await c.query(`create table if not exists brow_cliente_acesso(
    cliente_id text primary key, estab text not null, whatsapp text,
    pin_hash text, ativo boolean not null default false,
    falhas integer not null default 0, bloqueado_ate timestamptz,
    convite_hash text, convite_expira timestamptz, convite_por text, convite_em timestamptz,
    ativado_em timestamptz, ultimo_acesso timestamptz,
    criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_ca_convite on brow_cliente_acesso(convite_hash) where convite_hash is not null`);
  await c.query(`create index if not exists brow_ca_whats on brow_cliente_acesso(estab, whatsapp)`);
  await c.query(`create table if not exists brow_cliente_sessoes(
    token_hash text primary key, estab text not null, cliente_id text not null,
    criado_em timestamptz not null default now(), ultimo_uso timestamptz not null default now(), revogada boolean not null default false)`);
  await c.query(`create index if not exists brow_cs_cli on brow_cliente_sessoes(cliente_id)`);
  await c.query(`create table if not exists brow_cliente_falhas(id bigserial primary key, ip text not null, criado_em timestamptz not null default now())`);
  await c.query(`create index if not exists brow_cf_ip on brow_cliente_falhas(ip, criado_em)`);
}

// ─── utilidades ─────────────────────────────────────────────────────────────
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
function hashPin(pin) { const sal = crypto.randomBytes(16); const h = crypto.scryptSync(pin, sal, 32, { N: 16384, r: 8, p: 1 }); return `scrypt$${sal.toString('hex')}$${h.toString('hex')}`; }
function confere(pin, guardado) {
  const [, salHex, hHex] = String(guardado || '').split('$');
  const sal = Buffer.from(salHex || '00', 'hex'), alvo = Buffer.from(hHex || '', 'hex');
  const h = crypto.scryptSync(String(pin), sal, 32, { N: 16384, r: 8, p: 1 });
  return alvo.length === 32 && crypto.timingSafeEqual(h, alvo);
}
const FALSO = hashPin('000000');
function pinFraco(pin) {
  if (!/^\d{6}$/.test(pin)) return 'O PIN tem 6 números.';
  if (/^(\d)\1{5}$/.test(pin)) return 'Evite números repetidos (ex.: 111111).';
  if ('01234567890'.includes(pin) || '09876543210'.includes(pin)) return 'Evite sequências (ex.: 123456).';
  if (['121212', '112233', '102030', '123123', '696969', '159753'].includes(pin)) return 'Esse PIN é muito comum. Escolha outro.';
  return null;
}
const digitos = (v) => (v == null ? '' : String(v)).replace(/\D/g, '');
function normWhats(v) { let d = digitos(v); if (d.startsWith('55') && d.length >= 12) d = d.slice(2); return d; }
const corpo = (req) => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } } return (b && typeof b === 'object') ? b : {}; };
const erro = (res, st, codigo, msg, extra) => res.status(st).json({ ok: false, erro: codigo, msg, ...(extra || {}) });
const ipDe = (req) => String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || (req.socket && req.socket.remoteAddress) || '?').split(',')[0].trim().slice(0, 64);
const https = (req) => !!process.env.VERCEL || String((req.headers && req.headers['x-forwarded-proto']) || '').includes('https');
function lerCookie(req) {
  const h = (req.headers && req.headers.cookie) || '';
  for (const p of h.split(';')) { const [k, ...v] = p.trim().split('='); if (k === COOKIE) return decodeURIComponent(v.join('=')); }
  return null;
}
function gravarCookie(res, req, token) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token ? encodeURIComponent(token) : ''}; Path=/; HttpOnly; SameSite=Strict${https(req) ? '; Secure' : ''}; Max-Age=${token ? Math.floor(MAXIMO_MS / 1000) : 0}`);
}
async function historico(c, estab, id, acao, det) {
  await c.query(`create table if not exists brow_historico(id bigserial primary key, estab text not null, tipo text not null, ref_id text not null, acao text not null, detalhes jsonb, criado_em timestamptz not null default now())`);
  await c.query(`insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,'cliente_acesso',$2,$3,$4)`, [estab, id, acao, det ? JSON.stringify(det) : null]);
}
const primeiroNome = (n) => String(n || '').trim().split(/\s+/)[0] || '';

// Sessão da cliente → { estab, cliente_id, nome, telefone, token_hash } ou null
async function lerSessao(c, req) {
  const token = lerCookie(req);
  if (!token || !/^[A-Za-z0-9_-]{40,}$/.test(token)) return null;
  await garantirTabelas(c);
  const r = await c.query(`select s.token_hash, s.estab, s.criado_em, s.ultimo_uso, a.cliente_id, cl.nome, cl.telefone
    from brow_cliente_sessoes s join brow_cliente_acesso a on a.cliente_id=s.cliente_id and a.estab=s.estab
    join brow_clientes cl on cl.id=a.cliente_id and cl.estab=a.estab
    where s.token_hash=$1 and not s.revogada and a.ativo and a.pin_hash is not null`, [sha(token)]);
  if (!r.rows.length) return null;
  const s = r.rows[0]; const agora = Date.now();
  if (agora - new Date(s.ultimo_uso).getTime() > INATIVO_MS || agora - new Date(s.criado_em).getTime() > MAXIMO_MS) {
    await c.query('update brow_cliente_sessoes set revogada=true where token_hash=$1', [s.token_hash]); return null;
  }
  if (agora - new Date(s.ultimo_uso).getTime() > 5 * 60e3) {
    await c.query('update brow_cliente_sessoes set ultimo_uso=now() where token_hash=$1', [s.token_hash]);
    await c.query('update brow_cliente_acesso set ultimo_acesso=now() where cliente_id=$1', [s.cliente_id]);
  }
  return { estab: s.estab, cliente_id: s.cliente_id, nome: s.nome, telefone: s.telefone, token_hash: s.token_hash };
}
async function abrirSessao(c, res, req, estab, clienteId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await c.query('insert into brow_cliente_sessoes(token_hash,estab,cliente_id) values($1,$2,$3)', [sha(token), estab, clienteId]);
  await c.query('update brow_cliente_acesso set ultimo_acesso=now() where cliente_id=$1', [clienteId]);
  gravarCookie(res, req, token);
}
const encerrarSessoes = (c, clienteId, exceto) => c.query(`update brow_cliente_sessoes set revogada=true where cliente_id=$1 and not revogada and token_hash <> coalesce($2,'')`, [clienteId, exceto || null]);

// convite válido pelo token (no salão do endereço) → linha ou null
async function conviteValido(c, estab, token) {
  const t = String(token || '');
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(t)) return null;
  const r = await c.query(`select a.*, cl.nome from brow_cliente_acesso a join brow_clientes cl on cl.id=a.cliente_id and cl.estab=a.estab
    where a.convite_hash=$1 and a.estab=$2 and a.convite_expira > now()`, [sha(t), estab]);
  return r.rows[0] || null;
}

// ═══ AÇÕES DA CLIENTE (cl_*): salão pelo endereço (?s=), sessão só da cliente ═══
// agendaCliente(c, estab, req, res, acao): ações de agenda da cliente (brow-agenda.js)
async function acoesCliente(c, req, res, acao, salao, agendaCliente) {
  await garantirTabelas(c);
  const estab = salao.id;
  const b = req.method === 'POST' ? corpo(req) : {};
  const ip = ipDe(req);
  const limiteIp = async () => (await c.query(`select count(*)::int n from brow_cliente_falhas where ip=$1 and criado_em > now() - interval '${JANELA_MIN} minutes'`, [ip])).rows[0].n >= MAX_IP;

  // estado do login neste salão (para a tela de entrar)
  if (acao === 'cl_estado') {
    const s = await lerSessao(c, req);
    res.status(200).json({ ok: true, salao: { slug: salao.slug, nome: salao.nome }, logada: !!s && s.estab === estab }); return;
  }
  // ATIVAÇÃO: conferir o link (sem gastar) e criar o PIN (gasta o link)
  if (req.method === 'POST' && acao === 'cl_convite_ver') {
    if (await limiteIp()) return erro(res, 429, 'bloqueado', `Muitas tentativas neste aparelho. Aguarde ${JANELA_MIN} minutos.`);
    const a = await conviteValido(c, estab, b.token);
    if (!a) { await c.query('insert into brow_cliente_falhas(ip) values($1)', [ip]); return erro(res, 410, 'link_invalido', MSG_LINK); }
    res.status(200).json({ ok: true, nome: primeiroNome(a.nome), salao: { slug: salao.slug, nome: salao.nome }, whatsapp_final: String(a.whatsapp || '').slice(-4) }); return;
  }
  if (req.method === 'POST' && acao === 'cl_ativar') {
    if (await limiteIp()) return erro(res, 429, 'bloqueado', `Muitas tentativas neste aparelho. Aguarde ${JANELA_MIN} minutos.`);
    const pin = String(b.pin || ''); const erros = {};
    const fraco = pinFraco(pin); if (fraco) erros.pin = fraco; else if (pin !== String(b.pin2 || '')) erros.pin2 = 'Os PINs não conferem.';
    await c.query('begin');
    try {
      const t = String(b.token || '');
      const a = /^[A-Za-z0-9_-]{40,64}$/.test(t) ? (await c.query(`select * from brow_cliente_acesso where convite_hash=$1 and estab=$2 and convite_expira > now() for update`, [sha(t), estab])).rows[0] : null;
      if (!a) { await c.query('rollback'); await c.query('insert into brow_cliente_falhas(ip) values($1)', [ip]); return erro(res, 410, 'link_invalido', MSG_LINK); }
      if (Object.keys(erros).length) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Confira os campos.', { erros }); }
      // outra cliente já ativa com o mesmo WhatsApp neste salão: não deixa (o login seria ambíguo)
      const dup = await c.query(`select 1 from brow_cliente_acesso where estab=$1 and whatsapp=$2 and cliente_id<>$3 and ativo and pin_hash is not null`, [estab, a.whatsapp, a.cliente_id]);
      if (dup.rows.length) { await c.query('rollback'); return erro(res, 409, 'whatsapp_em_uso', 'Este WhatsApp já é usado por outra cliente na área da cliente. Fale com o salão.'); }
      await c.query(`update brow_cliente_acesso set pin_hash=$2, ativo=true, falhas=0, bloqueado_ate=null, convite_hash=null, convite_expira=null,
        ativado_em=now(), atualizado_em=now() where cliente_id=$1`, [a.cliente_id, hashPin(pin)]);
      await encerrarSessoes(c, a.cliente_id);
      await historico(c, estab, a.cliente_id, 'acesso_ativado', { ip });
      await abrirSessao(c, res, req, estab, a.cliente_id);
      await c.query('commit');
      res.status(200).json({ ok: true }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }
  if (req.method === 'POST' && acao === 'cl_entrar') {
    const generico = () => erro(res, 401, 'credenciais', 'WhatsApp ou PIN incorretos.');
    if (await limiteIp()) return erro(res, 429, 'bloqueado', `Muitas tentativas neste aparelho. Aguarde ${JANELA_MIN} minutos.`);
    const tel = normWhats(b.whatsapp); const pin = String(b.pin || '');
    const a = tel.length >= 10 ? (await c.query(`select * from brow_cliente_acesso where estab=$1 and whatsapp=$2 and ativo and pin_hash is not null order by ativado_em desc limit 1`, [estab, tel])).rows[0] : null;
    if (!a) { confere(pin, FALSO); await c.query('insert into brow_cliente_falhas(ip) values($1)', [ip]); return generico(); }
    if (a.bloqueado_ate && new Date(a.bloqueado_ate) > new Date()) { confere(pin, FALSO); return erro(res, 429, 'bloqueado', `Acesso bloqueado por tentativas erradas. Tente de novo em ${JANELA_MIN} minutos ou peça um novo link ao salão.`); }
    if (!/^\d{6}$/.test(pin) || !confere(pin, a.pin_hash)) {
      await c.query('insert into brow_cliente_falhas(ip) values($1)', [ip]);
      const falhas = a.falhas + 1;
      await c.query(`update brow_cliente_acesso set falhas=$2, bloqueado_ate=${falhas >= MAX_CLIENTE ? `now() + interval '${JANELA_MIN} minutes'` : 'bloqueado_ate'} where cliente_id=$1`, [a.cliente_id, falhas >= MAX_CLIENTE ? 0 : falhas]);
      if (falhas >= MAX_CLIENTE) await historico(c, estab, a.cliente_id, 'bloqueio_tentativas', { ip });
      return generico();
    }
    await c.query('update brow_cliente_acesso set falhas=0, bloqueado_ate=null where cliente_id=$1', [a.cliente_id]);
    await abrirSessao(c, res, req, estab, a.cliente_id);
    res.status(200).json({ ok: true }); return;
  }

  // ─── daqui em diante: só com a sessão DA CLIENTE, e do MESMO salão ─────────
  const s = await lerSessao(c, req);
  if (!s || s.estab !== estab) return erro(res, 401, 'sem_sessao_cliente', 'Entre com seu WhatsApp e PIN para continuar.');
  if (req.method === 'POST' && acao === 'cl_sair') {
    if (b.todos === true) await encerrarSessoes(c, s.cliente_id);
    else await c.query('update brow_cliente_sessoes set revogada=true where token_hash=$1', [s.token_hash]);
    gravarCookie(res, req, null);
    res.status(200).json({ ok: true }); return;
  }
  if (acao === 'cl_dados') {
    const r = (await c.query('select nome, apelido, telefone, email from brow_clientes where estab=$1 and id=$2', [estab, s.cliente_id])).rows[0];
    res.status(200).json({ ok: true, dados: { nome: r.nome, apelido: r.apelido || null, whatsapp: r.telefone || null, email: r.email || null }, salao: { slug: salao.slug, nome: salao.nome } }); return;
  }
  if (req.method === 'POST' && acao === 'cl_trocar_pin') {
    const a = (await c.query('select * from brow_cliente_acesso where cliente_id=$1', [s.cliente_id])).rows[0];
    const novo = String(b.novo || ''); const erros = {};
    if (!/^\d{6}$/.test(String(b.atual || '')) || !confere(String(b.atual), a.pin_hash)) {
      const falhas = a.falhas + 1;
      await c.query(`update brow_cliente_acesso set falhas=$2, bloqueado_ate=${falhas >= MAX_CLIENTE ? `now() + interval '${JANELA_MIN} minutes'` : 'bloqueado_ate'} where cliente_id=$1`, [a.cliente_id, falhas >= MAX_CLIENTE ? 0 : falhas]);
      if (falhas >= MAX_CLIENTE) { await encerrarSessoes(c, a.cliente_id); gravarCookie(res, req, null); return erro(res, 401, 'sem_sessao_cliente', 'Muitas tentativas erradas. Entre de novo mais tarde.'); }
      erros.atual = 'PIN atual incorreto.';
    }
    const fraco = pinFraco(novo); if (fraco) erros.novo = fraco; else if (novo !== String(b.novo2 || '')) erros.novo2 = 'Os PINs não conferem.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    await c.query('update brow_cliente_acesso set pin_hash=$2, falhas=0, atualizado_em=now() where cliente_id=$1', [a.cliente_id, hashPin(novo)]);
    await encerrarSessoes(c, a.cliente_id, s.token_hash);
    await historico(c, estab, a.cliente_id, 'pin_trocado', null);
    res.status(200).json({ ok: true }); return;
  }
  // agenda da cliente (próximos, histórico, agendar, cancelar, remarcar)
  req.brow_cliente = { id: s.cliente_id, nome: s.nome, telefone: s.telefone };
  req.brow_usuario = null; req.brow_funcao = null; req.brow_salao = salao;
  await agendaCliente(c, estab, req, res, acao);
}

// ═══ AÇÕES DA EQUIPE (ca_*): gerar link, ver situação, desativar ═══
async function acoesEquipe(c, req, res, acao, estab, salao) {
  await garantirTabelas(c);
  const q = req.query || {};
  const b = req.method === 'POST' ? corpo(req) : {};
  const id = String((req.method === 'POST' ? b.cliente_id : q.cliente_id) || '');
  const cl = (await c.query('select id, nome, apelido, telefone from brow_clientes where estab=$1 and id=$2', [estab, id])).rows[0];
  if (!cl) return erro(res, 404, 'nao_encontrado', 'Cliente não encontrada.');
  const lerAcesso = async () => (await c.query('select * from brow_cliente_acesso where cliente_id=$1 and estab=$2', [cl.id, estab])).rows[0] || null;
  const situacao = (a) => {
    if (!a) return { situacao: 'sem_acesso', situacao_nome: 'Sem acesso' };
    const convite = a.convite_hash && new Date(a.convite_expira) > new Date() ? { convite_expira: a.convite_expira } : {};
    if (a.ativo && a.pin_hash) return { situacao: 'ativo', situacao_nome: 'Ativo', ativado_em: a.ativado_em, ultimo_acesso: a.ultimo_acesso, ...convite };
    if (convite.convite_expira) return { situacao: 'convite', situacao_nome: 'Link enviado, ainda não ativado', ...convite };
    if (a.pin_hash) return { situacao: 'desativado', situacao_nome: 'Desativado' };
    return { situacao: 'sem_acesso', situacao_nome: 'Sem acesso (link expirado)' };
  };
  if (acao === 'ca_estado') {
    res.status(200).json({ ok: true, cliente: { id: cl.id, nome: cl.nome, apelido: cl.apelido, telefone: cl.telefone }, ...situacao(await lerAcesso()) }); return;
  }
  if (req.method === 'POST' && acao === 'ca_convite') {
    const tel = normWhats(cl.telefone);
    if (tel.length < 10 || tel.length > 11) return erro(res, 422, 'sem_whatsapp', 'Cadastre o WhatsApp da cliente (em Contato) antes de enviar o acesso.');
    const dup = await c.query(`select 1 from brow_cliente_acesso where estab=$1 and whatsapp=$2 and cliente_id<>$3 and ativo and pin_hash is not null`, [estab, tel, cl.id]);
    if (dup.rows.length) return erro(res, 409, 'whatsapp_em_uso', 'Outra cliente já usa este WhatsApp na área da cliente. Confira o cadastro.');
    const token = crypto.randomBytes(32).toString('base64url');
    await c.query(`insert into brow_cliente_acesso(cliente_id,estab,whatsapp,convite_hash,convite_expira,convite_por,convite_em)
      values($1,$2,$3,$4,now() + interval '7 days',$5,now())
      on conflict(cliente_id) do update set whatsapp=$3, convite_hash=$4, convite_expira=now() + interval '7 days', convite_por=$5, convite_em=now(), atualizado_em=now()`,
      [cl.id, estab, tel, sha(token), req.brow_usuario || null]);
    await historico(c, estab, cl.id, 'link_gerado', { autor: req.brow_usuario || null });
    const link = `/brow-studio/cliente/ativar/?s=${encodeURIComponent(salao.slug)}#c=${token}`;
    const nome = cl.apelido || primeiroNome(cl.nome);
    const mensagem = `Oi, ${nome}! Este é o seu link pessoal para a Área da Cliente do ${salao.nome}. Por ele você vê seus horários, agenda e remarca. Crie seu PIN pelo link (vale 7 dias e só pode ser usado uma vez; não repasse para ninguém): `;
    res.status(201).json({ ok: true, link, mensagem, whatsapp: tel, ...situacao(await lerAcesso()) }); return;
  }
  if (req.method === 'POST' && acao === 'ca_desativar') {
    const a = await lerAcesso();
    if (!a) return erro(res, 409, 'sem_acesso', 'Esta cliente não tem acesso à área da cliente.');
    await c.query('update brow_cliente_acesso set ativo=false, convite_hash=null, convite_expira=null, atualizado_em=now() where cliente_id=$1', [cl.id]);
    await encerrarSessoes(c, cl.id);
    await historico(c, estab, cl.id, 'acesso_desativado', { autor: req.brow_usuario || null });
    res.status(200).json({ ok: true, ...situacao(await lerAcesso()) }); return;
  }
  return erro(res, 400, 'acao', 'Ação desconhecida.');
}

module.exports = { garantirTabelas, lerSessao, acoesCliente, acoesEquipe, _teste: { pinFraco, normWhats } };
