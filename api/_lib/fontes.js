// FONTES DE PESQUISA (03/11/2026) — o catálogo das obras escondidas que alimentam a pesquisa (Bereia, Oficina, Joeira),
// com a capa de cada uma. Node, via api/dados.js?fn=fontes; a URL pública é /api/fontes.
// POST { acao:'lista'|'capa', fonte?, n?, cracha?, token? }
//
// Só com a porta dos livros particulares (crachá do aparelho ou token do PIN, conferidos por liberado()).
// Nada de texto de livro sai daqui: só a ficha (título, autor, nº de trechos, situação) e a capa.
// As capas de livros comprados moram só no banco 2 (tabela fontes_capas), nunca no repositório público.
// As tabelas são criadas e preenchidas por D:\RADAR-OFICINA\catalogo-fontes.mjs (fora do repo).
const { Client } = require('pg');
const { liberado } = require('./livro-particular.js');

const csDois = () => process.env.RADAR_DB2_DATABASE_URL || process.env.RADAR_DB2;
async function comBanco(fn) {
  const cs = csDois();
  if (!cs) return null;
  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try { await c.connect(); return await fn(c); }
  finally { try { await c.end(); } catch (_) { /* já fechou */ } }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  if (Buffer.isBuffer(b)) { try { b = JSON.parse(b.toString('utf8')); } catch (_) { b = {}; } }
  b = b || {};

  let ok = false;
  try { ok = await liberado(b.cracha, b.token); } catch (_) { ok = false; }
  if (!ok) { res.status(200).json({ ok: false, motivo: 'particular' }); return; }

  try {
    if (b.acao === 'capa') {
      const fonte = String(b.fonte || '').slice(0, 80);
      const n = parseInt(b.n, 10) || 1;
      const r = await comBanco((c) => c.query('select jpg from fontes_capas where fonte = $1 and n = $2', [fonte, n]));
      const linha = r && r.rows[0];
      if (!linha) { res.status(200).json({ ok: false, err: 'sem capa' }); return; }
      res.status(200).json({ ok: true, jpg: linha.jpg.toString('base64') });
      return;
    }
    const r = await comBanco((c) => c.query(
      `select f.fonte, f.titulo, f.autor, f.grupo, f.situacao, f.nota, f.trechos, f.banco, f.ordem,
              coalesce((select count(*)::int from fontes_capas k where k.fonte = f.fonte), 0) capas
         from fontes_catalogo f order by f.ordem, f.autor, f.titulo`));
    res.status(200).json({ ok: true, fontes: r ? r.rows : [] });
  } catch (e) {
    res.status(200).json({ ok: false, err: 'o catálogo não abriu agora' });
  }
};
