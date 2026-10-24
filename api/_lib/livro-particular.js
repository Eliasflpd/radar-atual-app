// LIVROS PARTICULARES do Elias — ler, dentro do RADAR, um livro comprado que NÃO pode ficar aberto no site.
// Pedido do Elias, 24/10/2026: "quero o livro dentro da minha biblioteca pra eu ler ele" (Edersheim).
// O texto mora só no Postgres (tabela livros_particulares, subida por scripts/livro-particular-subir.mjs a partir
// de D:\LIVROS-MOTOR); nunca entra no repositório (público) nem em public/. Só abre para o aparelho do dono: o
// crachá (radar_chave) tem de bater com um hash da lista abaixo — a mesma lista do modo Claude.
//   POST /api/livro-particular { cracha }                 -> { ok, livros:[{livro,titulo,autor,caps}] }
//   POST /api/livro-particular { cracha, livro }          -> { ok, titulo, autor, caps:[{ordem,titulo}] }
//   POST /api/livro-particular { cracha, livro, cap }     -> { ok, ordem, titulo, texto, total }
const { Client } = require('pg');
const crypto = require('crypto');

const DONOS = [
  'dffef7e95ac42d2db2f45fdff67cb46db7dd0a21b5b77ac9e7eba5fb4973b70f',   // Galaxy A22 do Elias (igual a CRACHAS_CLAUDE em voz.js)
];
function liberados() {
  const env = process.env.LIVRO_PARTICULAR_CRACHAS || process.env.VOZ_CLAUDE_CRACHAS || '';
  return DONOS.concat(String(env).split(/[,\s]+/).map((x) => x.trim().toLowerCase()).filter((x) => /^[0-9a-f]{64}$/.test(x)));
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  b = b || {};
  const cracha = String(b.cracha || '');
  const hash = cracha ? crypto.createHash('sha256').update(cracha).digest('hex') : '';
  if (!hash || !liberados().includes(hash)) { res.status(403).json({ ok: false, motivo: 'particular' }); return; }

  const cs = (process.env.RADAR_DB_DATABASE_URL || process.env.RADAR_DB);
  if (!cs) { res.status(200).json({ ok: false, err: 'db não configurado' }); return; }
  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    const livro = String(b.livro || '');
    if (!livro) {
      const r = await c.query(`select livro, max(livro_titulo) titulo, max(autor) autor, count(*)::int caps
                                 from livros_particulares group by livro order by 2`);
      res.json({ ok: true, livros: r.rows });
      return;
    }
    if (b.cap === undefined || b.cap === null || b.cap === '') {
      const r = await c.query('select ordem, titulo, livro_titulo, autor from livros_particulares where livro=$1 order by ordem', [livro]);
      if (!r.rows[0]) { res.json({ ok: false, err: 'livro não encontrado' }); return; }
      res.json({ ok: true, titulo: r.rows[0].livro_titulo, autor: r.rows[0].autor, caps: r.rows.map((x) => ({ ordem: x.ordem, titulo: x.titulo })) });
      return;
    }
    const cap = parseInt(b.cap, 10) || 0;
    const r = await c.query(`select ordem, titulo, texto, (select count(*)::int from livros_particulares where livro=$1) total
                               from livros_particulares where livro=$1 and ordem=$2`, [livro, cap]);
    if (!r.rows[0]) { res.json({ ok: false, err: 'capítulo não encontrado' }); return; }
    res.json({ ok: true, ...r.rows[0] });
  } catch (e) {
    res.status(200).json({ ok: false, err: String(e && e.message || e).slice(0, 140) });
  } finally { try { await c.end(); } catch (_) {} }
};
