// PUBLICAÇÕES DO RADAR — mensagens e estudos que nascem de um estudo com o Concílio.
// URL pública: /api/publicacoes   (rewrite -> /api/dados?fn=publicacoes)
//
// POR QUE AQUI E NÃO NO edge.js:
// gravar/listar é BANCO. O RADAR fala com o Postgres (Supabase) pelo driver `pg`, que é
// Node — não roda no Edge Runtime. Então este handler entra no roteador Node que já existe
// (api/dados.js), exatamente como hist/igrejas/acesso. Continua sendo ZERO função nova:
// o limite de 12 Serverless Functions do plano Hobby não é tocado.
// Quem gera o texto com IA é o /api/peca (Edge, no edge.js). Aqui só entra o que já veio pronto.
//
// GET  /api/publicacoes?tipo=mensagem        -> { ok, total, itens:[...] }  (sem o corpo, lista leve)
// GET  /api/publicacoes?slug=xxx             -> { ok, item:{...corpo_html} } (a peça inteira)
// POST /api/publicacoes {token,tipo,titulo,...} -> { ok, slug, url }
// GET  /api/publicacoes?token=ADM&del=slug   -> apaga (só o Elias)

const { Client } = require('pg');

const TIPOS = { mensagem: 1, estudo: 1 };
const PASTA = { mensagem: '/biblioteca/mensagens/', estudo: '/biblioteca/estudo/' };

async function ensure(c) {
  await c.query(`create table if not exists radar_publicacoes(
    id             serial primary key,
    tipo           text not null check (tipo in ('mensagem','estudo')),
    titulo         text not null,
    slug           text not null unique,
    referencia     text default '',
    emoji          text default '',
    resumo         text default '',
    corpo_html     text not null,
    corpo_texto    text default '',
    expositor_id   text default '',
    expositor_nome text default '',
    status         text not null default 'publicado' check (status in ('rascunho','publicado')),
    criado_em      timestamptz not null default now()
  )`);
  await c.query('create index if not exists idx_pub_tipo_data on radar_publicacoes(tipo, criado_em desc)');
}

// slug limpo, sem acento, sem símbolo — vira parte da URL
function slugificar(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'publicacao';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const cs = process.env.RADAR_DB;
  // Sem banco a lista simplesmente vem vazia: as páginas continuam mostrando
  // as publicações estáticas antigas em vez de quebrar na cara do pastor.
  if (!cs) {
    if (req.method === 'POST') { res.status(503).json({ ok: false, erro: 'Banco não configurado (RADAR_DB).' }); return; }
    res.status(200).json({ ok: true, off: true, total: 0, itens: [] });
    return;
  }

  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    await ensure(c);
    const ADM = process.env.RADAR_ADMIN_TOKEN || 'radar-elias-2026';
    const q = req.query || {};

    // ───────── GRAVAR ─────────
    if (req.method === 'POST') {
      let b = req.body;
      if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
      b = b || {};
      if ((b.token || '') !== ADM) { res.status(401).json({ ok: false, erro: 'não autorizado' }); return; }

      const tipo = String(b.tipo || '').trim();
      if (!TIPOS[tipo]) { res.status(400).json({ ok: false, erro: 'tipo tem que ser mensagem ou estudo' }); return; }
      const titulo = String(b.titulo || '').trim().slice(0, 160);
      const corpo_html = String(b.corpo_html || '').trim();
      if (!titulo) { res.status(400).json({ ok: false, erro: 'sem título' }); return; }
      if (!corpo_html) { res.status(400).json({ ok: false, erro: 'sem corpo' }); return; }

      // slug único: se já existe, vai -2, -3…
      const base = slugificar(b.slug || titulo);
      let slug = base;
      for (let i = 2; i < 60; i++) {
        const ja = await c.query('select 1 from radar_publicacoes where slug=$1', [slug]);
        if (!ja.rowCount) break;
        slug = base + '-' + i;
      }

      const status = b.status === 'rascunho' ? 'rascunho' : 'publicado';
      const r = await c.query(
        `insert into radar_publicacoes
           (tipo,titulo,slug,referencia,emoji,resumo,corpo_html,corpo_texto,expositor_id,expositor_nome,status)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         returning id, slug, criado_em`,
        [tipo, titulo, slug,
         String(b.referencia || '').slice(0, 160),
         String(b.emoji || '').slice(0, 8),
         String(b.resumo || '').slice(0, 900),
         corpo_html,
         String(b.corpo_texto || '').slice(0, 60000),
         String(b.expositor_id || '').slice(0, 80),
         String(b.expositor_nome || '').slice(0, 120),
         status]
      );
      const row = r.rows[0];
      res.status(200).json({
        ok: true, id: row.id, slug: row.slug, tipo: tipo, status: status,
        criado_em: row.criado_em,
        url: '/biblioteca/publicacao.html?s=' + encodeURIComponent(row.slug),
        lista: PASTA[tipo]
      });
      return;
    }

    // ───────── APAGAR (só o Elias) ─────────
    if (q.del) {
      if ((q.token || '') !== ADM) { res.status(401).json({ ok: false, erro: 'não autorizado' }); return; }
      const d = await c.query('delete from radar_publicacoes where slug=$1', [String(q.del)]);
      res.status(200).json({ ok: true, apagados: d.rowCount });
      return;
    }

    // ───────── ABRIR UMA PEÇA ─────────
    if (q.slug) {
      const r = await c.query(
        `select id,tipo,titulo,slug,referencia,emoji,resumo,corpo_html,corpo_texto,
                expositor_id,expositor_nome,status,criado_em
           from radar_publicacoes where slug=$1 limit 1`, [String(q.slug)]);
      if (!r.rowCount) { res.status(404).json({ ok: false, erro: 'publicação não encontrada' }); return; }
      res.status(200).json({ ok: true, item: r.rows[0] });
      return;
    }

    // ───────── LISTAR (lista leve, sem o corpo) ─────────
    const tipo = String(q.tipo || '').trim();
    const params = [];
    let where = "where status='publicado'";
    if (TIPOS[tipo]) { params.push(tipo); where += ' and tipo=$1'; }
    const r = await c.query(
      `select id,tipo,titulo,slug,referencia,emoji,resumo,expositor_id,expositor_nome,criado_em
         from radar_publicacoes ${where} order by criado_em desc limit 300`, params);
    res.status(200).json({ ok: true, total: r.rowCount, itens: r.rows });
  } catch (e) {
    // erro de banco nunca pode derrubar a página: lista vazia e segue o baile
    if (req.method === 'POST') { res.status(500).json({ ok: false, erro: String((e && e.message) || e).slice(0, 200) }); return; }
    res.status(200).json({ ok: true, off: true, total: 0, itens: [], erro: String((e && e.message) || e).slice(0, 160) });
  } finally { try { await c.end(); } catch (_) {} }
};
