// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — LOGIN, SESSÕES E EQUIPE (10/11/2026)
// Login por NOME + PIN de 6 dígitos (decisão da dona). Funções: dona | profissional.
//
// • PIN guardado com scrypt + sal individual (nunca em texto). PINs óbvios
//   (000000, 123456…) são recusados.
// • Tentativas erradas: 5 por pessoa → bloqueio de 15 min; 30 por IP em 15 min
//   → bloqueio do IP. Resposta sempre genérica ("nome ou PIN incorretos").
// • Sessão: token aleatório de 32 bytes em cookie HttpOnly + SameSite=Strict
//   (+ Secure em HTTPS). No banco só fica o SHA-256 do token. Expira após 7
//   dias sem uso (máx. 30 dias). Sair, trocar/redefinir PIN ou desativar a
//   pessoa encerra as sessões.
// • Primeira conta (dona): só com o código secreto da variável de ambiente
//   BROW_CODIGO_INICIAL e só enquanto não existir nenhuma conta.
// • Ações públicas: au_estado, au_entrar, au_primeira. As demais exigem sessão;
//   eq_* (equipe) exige função "dona".
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');

const COOKIE = 'brow_sessao';
// Código de PRIMEIRO ACESSO (pedido da dona, que não consegue configurar a Vercel):
// aqui fica só o SHA-256 do código; o código foi entregue a ela fora do repositório.
// Vale apenas enquanto não existir nenhuma conta. BROW_CODIGO_INICIAL, se
// configurado na Vercel, também continua valendo.
const CODIGO_INICIAL_HASH = '4c68f34dd1229d5b8e5a4561a84b32c29e71bfa1999e45d6767a5e32276639fc';
const FUNCOES = { dona: 'Dona', profissional: 'Profissional' };
const INATIVO_MS = 7 * 864e5, MAXIMO_MS = 30 * 864e5;
const MAX_USUARIO = 5, MAX_IP = 30, JANELA_MIN = 15;

async function garantirTabelas(c) {
  await c.query(`create table if not exists brow_usuarios(
    id text primary key, estab text not null, nome text not null, nome_chave text not null,
    funcao text not null check (funcao in ('dona','profissional')), profissional_id text,
    pin_hash text not null, ativo boolean not null default true,
    falhas integer not null default 0, bloqueado_ate timestamptz, criado_por text,
    criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now())`);
  await c.query(`create unique index if not exists brow_usu_nome on brow_usuarios(estab, nome_chave)`);
  await c.query(`create table if not exists brow_sessoes(
    token_hash text primary key, estab text not null, usuario_id text not null,
    criado_em timestamptz not null default now(), ultimo_uso timestamptz not null default now(), revogada boolean not null default false)`);
  await c.query(`create index if not exists brow_ses_usu on brow_sessoes(usuario_id)`);
  await c.query(`create table if not exists brow_login_falhas(id bigserial primary key, ip text not null, criado_em timestamptz not null default now())`);
  await c.query(`create index if not exists brow_lf_ip on brow_login_falhas(ip, criado_em)`);
}

// ─── utilidades ─────────────────────────────────────────────────────────────
const chaveNome = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const limparNome = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 60);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const normCodigo = (v) => String(v || '').normalize('NFKC').replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\s+/g, '').toUpperCase();
function hashPin(pin) { const sal = crypto.randomBytes(16); const h = crypto.scryptSync(pin, sal, 32, { N: 16384, r: 8, p: 1 }); return `scrypt$${sal.toString('hex')}$${h.toString('hex')}`; }
function confere(pin, guardado) {
  const [, salHex, hHex] = String(guardado || '').split('$');
  const sal = Buffer.from(salHex || '00', 'hex'), alvo = Buffer.from(hHex || '', 'hex');
  const h = crypto.scryptSync(String(pin), sal, 32, { N: 16384, r: 8, p: 1 });
  return alvo.length === 32 && crypto.timingSafeEqual(h, alvo);
}
const FALSO = hashPin('000000');   // para igualar o tempo quando o nome não existe
function pinFraco(pin) {
  if (!/^\d{6}$/.test(pin)) return 'O PIN tem 6 números.';
  if (/^(\d)\1{5}$/.test(pin)) return 'Evite números repetidos (ex.: 111111).';
  const asc = '01234567890', desc = '09876543210';
  if (asc.includes(pin) || desc.includes(pin)) return 'Evite sequências (ex.: 123456).';
  if (['121212', '112233', '102030', '123123', '696969', '159753'].includes(pin)) return 'Esse PIN é muito comum. Escolha outro.';
  return null;
}
const corpo = (req) => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } } return (b && typeof b === 'object') ? b : {}; };
const erro = (res, st, codigo, msg, extra) => res.status(st).json({ ok: false, erro: codigo, msg, ...(extra || {}) });
const ipDe = (req) => String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || (req.socket && req.socket.remoteAddress) || '?').split(',')[0].trim().slice(0, 64);
function lerCookie(req) {
  const h = (req.headers && req.headers.cookie) || '';
  for (const p of h.split(';')) { const [k, ...v] = p.trim().split('='); if (k === COOKIE) return decodeURIComponent(v.join('=')); }
  return null;
}
const https = (req) => !!process.env.VERCEL || String((req.headers && req.headers['x-forwarded-proto']) || '').includes('https');
function gravarCookie(res, req, token) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token ? encodeURIComponent(token) : ''}; Path=/; HttpOnly; SameSite=Strict${https(req) ? '; Secure' : ''}; Max-Age=${token ? Math.floor(MAXIMO_MS / 1000) : 0}`);
}
const publico = (u) => ({ id: u.id, nome: u.nome, funcao: u.funcao, funcao_nome: FUNCOES[u.funcao], profissional_id: u.profissional_id || null });

// Sessão da requisição → { estab, usuario } ou null (atualiza o "último uso" no máximo a cada 5 min)
async function lerSessao(c, req) {
  const token = lerCookie(req);
  if (!token || !/^[A-Za-z0-9_-]{40,}$/.test(token)) return null;
  await garantirTabelas(c);
  const r = await c.query(`select s.token_hash, s.estab, s.criado_em, s.ultimo_uso, u.* from brow_sessoes s join brow_usuarios u on u.id=s.usuario_id
    where s.token_hash=$1 and not s.revogada and u.ativo`, [sha(token)]);
  if (!r.rows.length) return null;
  const s = r.rows[0]; const agora = Date.now();
  if (agora - new Date(s.ultimo_uso).getTime() > INATIVO_MS || agora - new Date(s.criado_em).getTime() > MAXIMO_MS) {
    await c.query('update brow_sessoes set revogada=true where token_hash=$1', [s.token_hash]); return null;
  }
  if (agora - new Date(s.ultimo_uso).getTime() > 5 * 60e3) await c.query('update brow_sessoes set ultimo_uso=now() where token_hash=$1', [s.token_hash]);
  return { estab: s.estab, usuario: publico(s), token_hash: s.token_hash };
}
async function abrirSessao(c, res, req, u) {
  const token = crypto.randomBytes(32).toString('base64url');
  await c.query('insert into brow_sessoes(token_hash,estab,usuario_id) values($1,$2,$3)', [sha(token), u.estab, u.id]);
  gravarCookie(res, req, token);
}
const encerrarSessoes = (c, usuarioId, exceto) => c.query('update brow_sessoes set revogada=true where usuario_id=$1 and not revogada and token_hash <> coalesce($2,\'\')', [usuarioId, exceto || null]);
async function historico(c, estab, id, acao, det) {
  await c.query(`create table if not exists brow_historico(id bigserial primary key, estab text not null, tipo text not null, ref_id text not null, acao text not null, detalhes jsonb, criado_em timestamptz not null default now())`);
  await c.query(`insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,'usuario',$2,$3,$4)`, [estab, id, acao, det ? JSON.stringify(det) : null]);
}

// ─── ações públicas e da própria conta ──────────────────────────────────────
async function publicas(c, req, res, acao, estabPadrao, salao) {
  await garantirTabelas(c);
  const ehPrincipal = estabPadrao === 'principal';
  const infoSalao = salao ? { slug: salao.slug, nome: salao.nome } : null;
  const total = (await c.query('select count(*)::int n from brow_usuarios where estab=$1', [estabPadrao])).rows[0].n;
  if (acao === 'au_estado') {
    const s = await lerSessao(c, req);
    const logadoAqui = !!s && s.estab === estabPadrao;
    res.status(200).json({ ok: true, salao: infoSalao, tem_contas: total > 0, primeira_disponivel: ehPrincipal && total === 0, codigo_configurado: true, logado: logadoAqui, usuario: logadoAqui ? s.usuario : null }); return true;
  }
  if (req.method === 'POST' && acao === 'au_primeira') {
    const b = corpo(req); const erros = {};
    if (!ehPrincipal) return erro(res, 403, 'indisponivel', 'Este salão já foi criado. Entre com seu nome e PIN.'), true;
    if (total > 0) return erro(res, 409, 'ja_configurado', 'A primeira conta já foi criada. Entre com seu nome e PIN.'), true;
    const cod = process.env.BROW_CODIGO_INICIAL || '';
    const digitado = normCodigo(b.codigo);
    const dado = Buffer.from(String(b.codigo || '').trim()), certo = Buffer.from(cod);
    const igualEnv = !!cod && dado.length === certo.length && crypto.timingSafeEqual(dado, certo);
    const igualHash = crypto.timingSafeEqual(Buffer.from(sha(digitado), 'hex'), Buffer.from(CODIGO_INICIAL_HASH, 'hex'));
    const igual = igualEnv || igualHash;
    const ip = ipDe(req);
    const nIp = (await c.query(`select count(*)::int n from brow_login_falhas where ip=$1 and criado_em > now() - interval '${JANELA_MIN} minutes'`, [ip])).rows[0].n;
    if (nIp >= MAX_IP) return erro(res, 429, 'bloqueado', `Muitas tentativas. Aguarde ${JANELA_MIN} minutos.`), true;
    if (!igual) { await c.query('insert into brow_login_falhas(ip) values($1)', [ip]); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { codigo: 'Código inicial incorreto.' } }), true; }
    const nome = limparNome(b.nome); if (nome.length < 2) erros.nome = 'Informe seu nome.';
    const pin = String(b.pin || ''); const fraco = pinFraco(pin); if (fraco) erros.pin = fraco; else if (pin !== String(b.pin2 || '')) erros.pin2 = 'Os PINs não conferem.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros }), true;
    await c.query('begin');
    try {
      await c.query('select pg_advisory_xact_lock(hashtext($1))', ['brow-primeira|' + estabPadrao]);
      const t2 = (await c.query('select count(*)::int n from brow_usuarios where estab=$1', [estabPadrao])).rows[0].n;
      if (t2 > 0) { await c.query('rollback'); return erro(res, 409, 'ja_configurado', 'A primeira conta já foi criada.'), true; }
      const u = { id: crypto.randomUUID(), estab: estabPadrao, nome, funcao: 'dona' };
      await c.query('insert into brow_usuarios(id,estab,nome,nome_chave,funcao,pin_hash,criado_por) values($1,$2,$3,$4,$5,$6,$7)', [u.id, u.estab, nome, chaveNome(nome), 'dona', hashPin(pin), 'primeira configuração']);
      await historico(c, estabPadrao, u.id, 'criada', { autor: 'primeira configuração', funcao: 'dona' });
      await abrirSessao(c, res, req, u);
      await c.query('commit');
      res.status(201).json({ ok: true, usuario: publico(u) }); return true;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }
  // RECUPERAÇÃO DA DONA com o código de primeiro acesso (pedido da dona, que não conseguiu
  // entrar depois de criar a conta). Uso ÚNICO e só enquanto existir uma única conta
  // (a dona, sem equipe cadastrada). Redefine nome e PIN e encerra as sessões antigas.
  if (req.method === 'POST' && acao === 'au_recuperar') {
    if (!ehPrincipal) return erro(res, 409, 'indisponivel', 'A recuperação com código não está disponível para este salão. Peça a uma dona cadastrada para redefinir seu PIN.'), true;
    const b = corpo(req); const erros = {}; const ip = ipDe(req);
    const nIp = (await c.query(`select count(*)::int n from brow_login_falhas where ip=$1 and criado_em > now() - interval '${JANELA_MIN} minutes'`, [ip])).rows[0].n;
    if (nIp >= MAX_IP) return erro(res, 429, 'bloqueado', `Muitas tentativas. Aguarde ${JANELA_MIN} minutos.`), true;
    const digitado = normCodigo(b.codigo);
    const igual = crypto.timingSafeEqual(Buffer.from(sha(digitado), 'hex'), Buffer.from(CODIGO_INICIAL_HASH, 'hex'));
    if (!igual) { await c.query('insert into brow_login_falhas(ip) values($1)', [ip]); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { codigo: 'Código incorreto.' } }), true; }
    const nome = limparNome(b.nome); if (nome.length < 2) erros.nome = 'Informe seu nome.';
    const pin = String(b.pin || ''); const fraco = pinFraco(pin); if (fraco) erros.pin = fraco; else if (pin !== String(b.pin2 || '')) erros.pin2 = 'Os PINs não conferem.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros }), true;
    await c.query('begin');
    try {
      await c.query('select pg_advisory_xact_lock(hashtext($1))', ['brow-primeira|' + estabPadrao]);
      await c.query(`create table if not exists brow_historico(id bigserial primary key, estab text not null, tipo text not null, ref_id text not null, acao text not null, detalhes jsonb, criado_em timestamptz not null default now())`);
      const usado = (await c.query(`select 1 from brow_historico where estab=$1 and tipo='usuario' and acao='recuperado_com_codigo' limit 1`, [estabPadrao])).rows.length;
      const us = (await c.query('select * from brow_usuarios where estab=$1', [estabPadrao])).rows;
      if (usado || us.length !== 1 || us[0].funcao !== 'dona') { await c.query('rollback'); return erro(res, 409, 'indisponivel', 'A recuperação com o código não está mais disponível. Peça a uma dona cadastrada para redefinir seu PIN.'), true; }
      const u = us[0];
      await c.query('update brow_usuarios set nome=$2, nome_chave=$3, pin_hash=$4, ativo=true, falhas=0, bloqueado_ate=null, atualizado_em=now() where id=$1', [u.id, nome, chaveNome(nome), hashPin(pin)]);
      await encerrarSessoes(c, u.id);
      await historico(c, estabPadrao, u.id, 'recuperado_com_codigo', { nome_anterior: u.nome, nome_novo: nome, ip });
      await abrirSessao(c, res, req, { ...u, nome });
      await c.query('commit');
      res.status(200).json({ ok: true, usuario: publico({ ...u, nome }) }); return true;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  }
  if (req.method === 'POST' && acao === 'au_entrar') {
    const b = corpo(req); const ip = ipDe(req);
    const generico = () => erro(res, 401, 'credenciais', 'Nome ou PIN incorretos.');
    const nIp = (await c.query(`select count(*)::int n from brow_login_falhas where ip=$1 and criado_em > now() - interval '${JANELA_MIN} minutes'`, [ip])).rows[0].n;
    if (nIp >= MAX_IP) return erro(res, 429, 'bloqueado', `Muitas tentativas neste aparelho. Aguarde ${JANELA_MIN} minutos.`), true;
    const u = (await c.query('select * from brow_usuarios where estab=$1 and nome_chave=$2', [estabPadrao, chaveNome(b.nome)])).rows[0];
    const pin = String(b.pin || '');
    if (!u || !u.ativo) { confere(pin, FALSO); await c.query('insert into brow_login_falhas(ip) values($1)', [ip]); return generico(), true; }
    if (u.bloqueado_ate && new Date(u.bloqueado_ate) > new Date()) { confere(pin, FALSO); return erro(res, 429, 'bloqueado', `Acesso bloqueado por tentativas erradas. Tente de novo em ${JANELA_MIN} minutos ou peça à dona para redefinir o PIN.`), true; }
    if (!/^\d{6}$/.test(pin) || !confere(pin, u.pin_hash)) {
      await c.query('insert into brow_login_falhas(ip) values($1)', [ip]);
      const falhas = u.falhas + 1;
      await c.query(`update brow_usuarios set falhas=$2, bloqueado_ate=${falhas >= MAX_USUARIO ? `now() + interval '${JANELA_MIN} minutes'` : 'bloqueado_ate'} where id=$1`, [u.id, falhas >= MAX_USUARIO ? 0 : falhas]);
      if (falhas >= MAX_USUARIO) await historico(c, u.estab, u.id, 'bloqueio_tentativas', { ip });
      return generico(), true;
    }
    await c.query('update brow_usuarios set falhas=0, bloqueado_ate=null where id=$1', [u.id]);
    await abrirSessao(c, res, req, u);
    res.status(200).json({ ok: true, usuario: publico(u) }); return true;
  }
  return false;
}

// ─── ações com sessão (conta própria e equipe) ──────────────────────────────
async function comSessao(c, req, res, acao, sessao) {
  await garantirTabelas(c);
  const eu = sessao.usuario; const estab = sessao.estab;
  if (acao === 'au_eu') { const sl = await require('./brow-saloes.js').porId(c, estab); res.status(200).json({ ok: true, usuario: eu, salao: sl ? { slug: sl.slug, nome: sl.nome, principal: sl.id === 'principal' } : null }); return true; }
  if (req.method === 'POST' && acao === 'au_sair') {
    const b = corpo(req);
    if (b.todos === true) await encerrarSessoes(c, eu.id); else await c.query('update brow_sessoes set revogada=true where token_hash=$1', [sessao.token_hash]);
    gravarCookie(res, req, null); res.status(200).json({ ok: true }); return true;
  }
  if (req.method === 'POST' && acao === 'au_trocar_pin') {
    const b = corpo(req); const erros = {};
    const u = (await c.query('select * from brow_usuarios where id=$1', [eu.id])).rows[0];
    if (!confere(String(b.atual || ''), u.pin_hash)) erros.atual = 'PIN atual incorreto.';
    const fraco = pinFraco(String(b.novo || '')); if (fraco) erros.novo = fraco; else if (String(b.novo) !== String(b.novo2 || '')) erros.novo2 = 'Os PINs não conferem.'; else if (String(b.novo) === String(b.atual)) erros.novo = 'Escolha um PIN diferente do atual.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros }), true;
    await c.query('update brow_usuarios set pin_hash=$2, atualizado_em=now() where id=$1', [eu.id, hashPin(String(b.novo))]);
    await encerrarSessoes(c, eu.id, sessao.token_hash);
    await historico(c, estab, eu.id, 'pin_trocado', { autor: eu.nome });
    res.status(200).json({ ok: true }); return true;
  }
  if (!acao.startsWith('eq_')) return false;
  if (eu.funcao !== 'dona') return erro(res, 403, 'sem_permissao', 'Só a dona gerencia a equipe.'), true;
  const donasAtivas = async (exceto) => (await c.query(`select count(*)::int n from brow_usuarios where estab=$1 and funcao='dona' and ativo and id <> coalesce($2,'')`, [estab, exceto || null])).rows[0].n;
  if (acao === 'eq_listar') {
    const r = await c.query(`select u.id, u.nome, u.funcao, u.ativo, u.profissional_id, p.nome profissional_nome, (u.bloqueado_ate > now()) bloqueado,
        (select max(s.ultimo_uso) from brow_sessoes s where s.usuario_id=u.id) ultimo_acesso
      from brow_usuarios u left join brow_profissionais p on p.id=u.profissional_id and p.estab=u.estab where u.estab=$1 order by u.ativo desc, lower(u.nome)`, [estab]).catch(async () =>
      c.query(`select u.id, u.nome, u.funcao, u.ativo, u.profissional_id, null profissional_nome, (u.bloqueado_ate > now()) bloqueado, null ultimo_acesso from brow_usuarios u where u.estab=$1 order by u.ativo desc, lower(u.nome)`, [estab]));
    res.status(200).json({ ok: true, eu: eu.id, itens: r.rows.map(x => ({ ...x, funcao_nome: FUNCOES[x.funcao] })) }); return true;
  }
  if (req.method === 'POST' && acao === 'eq_salvar') {
    const b = corpo(req); const erros = {};
    const nome = limparNome(b.nome); if (nome.length < 2) erros.nome = 'Informe o nome.';
    if (!FUNCOES[b.funcao]) erros.funcao = 'Escolha a função.';
    let prof = null; if (b.profissional_id) { prof = (await c.query('select id from brow_profissionais where estab=$1 and id=$2', [estab, String(b.profissional_id)]).catch(() => ({ rows: [] }))).rows[0]; if (!prof) erros.profissional_id = 'Profissional da agenda não encontrada.'; }
    const ativo = b.ativo !== false;
    if (!b.id) { const fraco = pinFraco(String(b.pin || '')); if (fraco) erros.pin = fraco; else if (String(b.pin) !== String(b.pin2 || '')) erros.pin2 = 'Os PINs não conferem.'; }
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros }), true;
    const dup = (await c.query('select id from brow_usuarios where estab=$1 and nome_chave=$2 and id <> coalesce($3,\'\')', [estab, chaveNome(nome), b.id || null])).rows[0];
    if (dup) return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { nome: 'Já existe alguém com esse nome. Use um nome diferente (ex.: com sobrenome).' } }), true;
    if (b.id) {
      const a = (await c.query('select * from brow_usuarios where estab=$1 and id=$2', [estab, String(b.id)])).rows[0];
      if (!a) return erro(res, 404, 'nao_encontrado', 'Pessoa não encontrada.'), true;
      if (a.funcao === 'dona' && a.ativo && (b.funcao !== 'dona' || !ativo) && await donasAtivas(a.id) === 0) return erro(res, 409, 'ultima_dona', 'É preciso manter pelo menos uma dona ativa.'), true;
      await c.query('update brow_usuarios set nome=$3, nome_chave=$4, funcao=$5, profissional_id=$6, ativo=$7, atualizado_em=now() where estab=$1 and id=$2', [estab, a.id, nome, chaveNome(nome), b.funcao, prof ? prof.id : null, ativo]);
      if (!ativo || a.funcao !== b.funcao) await encerrarSessoes(c, a.id, a.id === eu.id ? sessao.token_hash : null);
      await historico(c, estab, a.id, 'editada', { autor: eu.nome, funcao_de: a.funcao, funcao_para: b.funcao, ativo });
      res.status(200).json({ ok: true, id: a.id }); return true;
    }
    const id = crypto.randomUUID();
    await c.query('insert into brow_usuarios(id,estab,nome,nome_chave,funcao,profissional_id,pin_hash,criado_por) values($1,$2,$3,$4,$5,$6,$7,$8)', [id, estab, nome, chaveNome(nome), b.funcao, prof ? prof.id : null, hashPin(String(b.pin)), eu.nome]);
    await historico(c, estab, id, 'criada', { autor: eu.nome, funcao: b.funcao });
    res.status(201).json({ ok: true, id }); return true;
  }
  if (req.method === 'POST' && acao === 'eq_pin') {
    const b = corpo(req); const erros = {};
    const fraco = pinFraco(String(b.pin || '')); if (fraco) erros.pin = fraco; else if (String(b.pin) !== String(b.pin2 || '')) erros.pin2 = 'Os PINs não conferem.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros }), true;
    const r = await c.query('update brow_usuarios set pin_hash=$3, falhas=0, bloqueado_ate=null, atualizado_em=now() where estab=$1 and id=$2 returning id', [estab, String(b.id || ''), hashPin(String(b.pin))]);
    if (!r.rows.length) return erro(res, 404, 'nao_encontrado', 'Pessoa não encontrada.'), true;
    await encerrarSessoes(c, r.rows[0].id, r.rows[0].id === eu.id ? sessao.token_hash : null);
    await historico(c, estab, r.rows[0].id, 'pin_redefinido', { autor: eu.nome });
    res.status(200).json({ ok: true }); return true;
  }
  return erro(res, 400, 'acao', 'Ação desconhecida.'), true;
}

// cria a dona de um salão novo e já abre a sessão (usado pelo cadastro de salões, dentro da transação dele)
async function criarDona(c, res, req, estab, nome, pin) {
  const u = { id: crypto.randomUUID(), estab, nome: limparNome(nome), funcao: 'dona' };
  await c.query('insert into brow_usuarios(id,estab,nome,nome_chave,funcao,pin_hash,criado_por) values($1,$2,$3,$4,$5,$6,$7)', [u.id, estab, u.nome, chaveNome(u.nome), 'dona', hashPin(pin), 'cadastro do salão']);
  await historico(c, estab, u.id, 'criada', { autor: 'cadastro do salão', funcao: 'dona' });
  await abrirSessao(c, res, req, u);
  return publico(u);
}
module.exports = { garantirTabelas, lerSessao, publicas, comSessao, criarDona, FUNCOES, _teste: { pinFraco, hashPin, confere, chaveNome } };
