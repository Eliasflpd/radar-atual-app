// LIVROS PARTICULARES do Elias — ler, dentro do RADAR, um livro comprado que NÃO pode ficar aberto no site.
// Pedido do Elias, 24/10/2026: "quero o livro dentro da minha biblioteca pra eu ler ele" (Edersheim), e depois
// "vamos deixar os livros assim pra abrir com essa senha" (PIN).
// O texto mora só no Postgres (tabela livros_particulares, subida por scripts/livro-particular-subir.mjs a partir
// de D:\LIVROS-MOTOR); nunca entra no repositório (público) nem em public/.
// Abre de dois jeitos:
//   • PIN do Elias: conferido aqui contra o hash salgado da tabela livros_particulares_cfg (a senha NUNCA fica no
//     repo; troca com scripts/livro-particular-pin.mjs). Certo, devolve um `token` que o aparelho guarda — não a senha.
//     Errou 8 vezes numa hora, trava por uma hora (PIN de 4 dígitos sem trava cairia em minutos).
//   • crachá (radar_chave) dos aparelhos dele, sem pedir nada (lista DONOS).
//   POST /api/livro-particular { pin }                          -> { ok, token }
//   POST /api/livro-particular { token|cracha }                 -> { ok, livros:[{livro,titulo,autor,caps}] }
//   POST /api/livro-particular { token|cracha, livro }          -> { ok, titulo, autor, caps:[{ordem,titulo}] }
//   POST /api/livro-particular { token|cracha, livro, cap }     -> { ok, ordem, titulo, texto, total }
const { Client } = require('pg');
const crypto = require('crypto');

const DONOS = [
  'dffef7e95ac42d2db2f45fdff67cb46db7dd0a21b5b77ac9e7eba5fb4973b70f',   // Galaxy A22 do Elias (igual a CRACHAS_CLAUDE em voz.js)
  'ca09a49b07fa94e7533c68352ae8d9f9adeca400ea650f95e2312306b5fb0d28',   // Chrome do PC do Elias (24/10/2026)
];
const MAX_ERROS = 8;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
function liberados() {
  const env = process.env.LIVRO_PARTICULAR_CRACHAS || process.env.VOZ_CLAUDE_CRACHAS || '';
  return DONOS.concat(String(env).split(/[,\s]+/).map((x) => x.trim().toLowerCase()).filter((x) => /^[0-9a-f]{64}$/.test(x)));
}
const tokenDe = (cfg) => crypto.createHmac('sha256', cfg.segredo).update('livros-particulares').digest('hex');
const igual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  b = b || {};

  const cs = (process.env.RADAR_DB_DATABASE_URL || process.env.RADAR_DB);
  if (!cs) { res.status(200).json({ ok: false, err: 'db não configurado' }); return; }
  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    const cfg = (await c.query('select * from livros_particulares_cfg where id=1').catch(() => ({ rows: [] }))).rows[0];

    // ── O PIN ──────────────────────────────────────────────────────────────
    if (b.pin !== undefined) {
      if (!cfg) { res.json({ ok: false, motivo: 'sem-pin' }); return; }
      const travado = cfg.erros >= MAX_ERROS && cfg.erros_desde && (Date.now() - new Date(cfg.erros_desde).getTime()) < 3600e3;
      if (travado) { res.status(429).json({ ok: false, motivo: 'travado' }); return; }
      if (igual(sha(cfg.sal + String(b.pin).trim()), cfg.hash)) {
        await c.query('update livros_particulares_cfg set erros=0, erros_desde=null where id=1');
        res.json({ ok: true, token: tokenDe(cfg) });
      } else {
        const zera = !cfg.erros_desde || (Date.now() - new Date(cfg.erros_desde).getTime()) >= 3600e3;
        await c.query(zera ? 'update livros_particulares_cfg set erros=1, erros_desde=now() where id=1'
                           : 'update livros_particulares_cfg set erros=erros+1 where id=1');
        res.status(403).json({ ok: false, motivo: 'pin' });
      }
      return;
    }

    // ── QUEM PODE LER ──────────────────────────────────────────────────────
    const cracha = String(b.cracha || '');
    const token = String(b.token || '');
    const peloCracha = cracha && liberados().includes(sha(cracha));
    const peloToken = cfg && /^[0-9a-f]{64}$/.test(token) && igual(token, tokenDe(cfg));
    if (!peloCracha && !peloToken) { res.status(403).json({ ok: false, motivo: 'particular' }); return; }

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
