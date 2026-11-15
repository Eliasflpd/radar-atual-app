// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — SALÕES (MULTIEMPRESA) (11/11/2026)
// Cada salão é um "estab". Todos os dados já são filtrados por estab; o salão
// da pessoa logada vem da SESSÃO. Nas ações públicas (entrar, agendamento
// online), o salão vem do ENDEREÇO (?s=slug), resolvido aqui no servidor —
// nunca um id de estab enviado pelo navegador.
// • 'principal' = salão da Rychelma (slug 'rychelma'); sem ?s, os links antigos
//   continuam caindo nele.
// • Criar salão: público, com campo isca, chave_envio e limites por IP (3/dia)
//   e global (100/dia). Cria salão + dona + sessão de uma vez.
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');

const PRINCIPAL = 'principal';
const RESERVADOS = new Set(['entrar', 'agendar', 'admin', 'api', 'brow', 'brow-studio', 's', 'criar-salao', 'criar', 'salao', 'conta', 'equipe', 'login', 'sair', 'novo', 'nova',
  'principal', 'suporte', 'ajuda', 'privacidade', 'termos', 'www', 'app', 'radar', 'teste', 'root', 'sistema', 'vercel']);
const MAX_IP_DIA = 3, MAX_GLOBAL_DIA = 100;

async function garantirTabela(c) {
  await c.query(`create table if not exists brow_estabs(
    id text primary key, slug text not null, nome text not null, ativo boolean not null default true,
    criado_em timestamptz not null default now(), criado_por_ip text, origem text, chave_envio text)`);
  await c.query(`create unique index if not exists brow_estabs_slug on brow_estabs(slug)`);
  await c.query(`create unique index if not exists brow_estabs_envio on brow_estabs(chave_envio) where chave_envio is not null`);
  await c.query(`insert into brow_estabs(id,slug,nome,origem) values($1,'rychelma','Rychelma Micro Designer','original') on conflict do nothing`, [PRINCIPAL]);
}
const limparSlug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
function slugInvalido(s) {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/.test(s)) return 'Use de 3 a 30 letras minúsculas, números ou hífen (sem acento nem espaço).';
  if (/--/.test(s)) return 'Não use dois hífens seguidos.';
  if (RESERVADOS.has(s)) return 'Esse endereço é reservado. Escolha outro.';
  return null;
}
// slug → estab (ou null). Sem slug → principal (links antigos).
async function resolver(c, slug) {
  await garantirTabela(c);
  const s = String(slug || '').trim().toLowerCase();
  if (!s) return (await c.query('select id, slug, nome, ativo from brow_estabs where id=$1', [PRINCIPAL])).rows[0];
  const r = await c.query('select id, slug, nome, ativo from brow_estabs where slug=$1', [s]);
  return r.rows[0] && r.rows[0].ativo ? r.rows[0] : null;
}
async function porId(c, id) { await garantirTabela(c); return (await c.query('select id, slug, nome from brow_estabs where id=$1', [id])).rows[0] || null; }

const corpo = (req) => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } } return (b && typeof b === 'object') ? b : {}; };
const erro = (res, st, codigo, msg, extra) => res.status(st).json({ ok: false, erro: codigo, msg, ...(extra || {}) });
const ipDe = (req) => String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || (req.socket && req.socket.remoteAddress) || '?').split(',')[0].trim().slice(0, 64);

// ações públicas sl_*: verificar endereço, ver salão e criar salão
async function publicas(c, req, res, acao, auth, garantirOutras) {
  await garantirTabela(c);
  const q = req.query || {};
  if (acao === 'sl_verificar') {
    const s = limparSlug(q.slug); const inval = slugInvalido(s);
    if (inval) { res.status(200).json({ ok: true, slug: s, disponivel: false, motivo: inval }); return; }
    const ja = (await c.query('select 1 from brow_estabs where slug=$1', [s])).rows.length;
    res.status(200).json({ ok: true, slug: s, disponivel: !ja, motivo: ja ? 'Esse endereço já está em uso. Escolha outro.' : null }); return;
  }
  if (acao === 'sl_ver') {
    const e = await resolver(c, q.s);
    if (!e) return erro(res, 404, 'salao_inexistente', 'Salão não encontrado. Confira o endereço.');
    res.status(200).json({ ok: true, salao: { slug: e.slug, nome: e.nome } }); return;
  }
  if (req.method === 'POST' && acao === 'sl_criar') {
    const b = corpo(req); const erros = {}; const ip = ipDe(req);
    if (String(b.site || '').trim()) return erro(res, 422, 'validacao', 'Não foi possível criar o salão.');   // campo isca
    const chave = String(b.chave_envio || '').slice(0, 64); if (!chave) return erro(res, 400, 'chave_envio', 'Pedido incompleto.');
    const ja = (await c.query('select id, slug from brow_estabs where chave_envio=$1', [chave])).rows[0];
    if (ja) { res.status(200).json({ ok: true, repetido: true, salao: { slug: ja.slug } }); return; }
    const nomeSalao = String(b.nome_salao || '').replace(/\s+/g, ' ').trim().slice(0, 80); if (nomeSalao.length < 3) erros.nome_salao = 'Informe o nome do salão.';
    const slug = limparSlug(b.slug); const inval = slugInvalido(slug); if (inval) erros.slug = inval;
    const nome = String(b.nome || '').replace(/\s+/g, ' ').trim().slice(0, 60); if (nome.length < 2) erros.nome = 'Informe seu nome.';
    const pin = String(b.pin || ''); const fraco = auth._teste.pinFraco(pin); if (fraco) erros.pin = fraco; else if (pin !== String(b.pin2 || '')) erros.pin2 = 'Os PINs não conferem.';
    if (b.aceite !== true) erros.aceite = 'É preciso aceitar para continuar.';
    if (Object.keys(erros).length) return erro(res, 422, 'validacao', 'Confira os campos.', { erros });
    await garantirOutras(c); await auth.garantirTabelas(c);
    await c.query('begin');
    try {
      await c.query('select pg_advisory_xact_lock(hashtext($1))', ['brow-criar-salao']);
      const nIp = (await c.query(`select count(*)::int n from brow_estabs where criado_por_ip=$1 and criado_em > now() - interval '1 day'`, [ip])).rows[0].n;
      if (nIp >= MAX_IP_DIA) { await c.query('rollback'); return erro(res, 429, 'limite', `Limite de ${MAX_IP_DIA} salões por dia neste aparelho/rede. Tente amanhã.`); }
      const nG = (await c.query(`select count(*)::int n from brow_estabs where criado_em > now() - interval '1 day' and origem='cadastro'`)).rows[0].n;
      if (nG >= MAX_GLOBAL_DIA) { await c.query('rollback'); return erro(res, 429, 'limite', 'Muitos salões novos hoje. Tente novamente amanhã.'); }
      if ((await c.query('select 1 from brow_estabs where slug=$1', [slug])).rows.length) { await c.query('rollback'); return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { slug: 'Esse endereço já está em uso. Escolha outro.' } }); }
      const id = 'e_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
      await c.query('insert into brow_estabs(id,slug,nome,criado_por_ip,origem,chave_envio) values($1,$2,$3,$4,$5,$6)', [id, slug, nomeSalao, ip, 'cadastro', chave]);
      await c.query(`insert into brow_config(estab,nome_estudio) values($1,$2) on conflict (estab) do update set nome_estudio=excluded.nome_estudio`, [id, nomeSalao]);
      const u = await auth.criarDona(c, res, req, id, nome, pin);
      await c.query(`insert into brow_historico(estab,tipo,ref_id,acao,detalhes) values($1,'salao',$1,'criado',$2)`, [id, JSON.stringify({ slug, nome: nomeSalao, dona: nome })]);
      await c.query('commit');
      res.status(201).json({ ok: true, salao: { slug, nome: nomeSalao }, usuario: u }); return;
    } catch (e) { await c.query('rollback').catch(() => {}); if (e.code === '23505') return erro(res, 422, 'validacao', 'Confira os campos.', { erros: { slug: 'Esse endereço já está em uso. Escolha outro.' } }); throw e; }
  }
  return erro(res, 400, 'acao', 'Ação desconhecida.');
}

module.exports = { garantirTabela, resolver, porId, publicas, PRINCIPAL, _teste: { limparSlug, slugInvalido } };
