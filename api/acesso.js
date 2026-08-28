// GATE de 30 dias do RADAR.
// GET ?phone=NUM                         -> {status:'ativo'|'expirado'|'novo', dias, ate}
// GET ?token=ADMIN&liberar=NUM&meses=N    -> libera a pessoa por N meses (default 1)
const { Client } = require('pg');
const OWNER = '5599988031747'; // Elias nunca é bloqueado

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const cs = process.env.RADAR_DB;
  if (!cs) { res.status(200).json({ ok:false, off:true }); return; }
  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    const q = req.query || {};

    // ADMIN: liberar quem pagou (mandou o comprovante)
    const liberar = (q.liberar || '').replace(/\D/g, '');
    if (liberar) {
      const ADM = process.env.RADAR_ADMIN_TOKEN;
      if (ADM && q.token !== ADM) { res.status(403).json({ error: 'token' }); return; }
      const meses = Math.max(1, Math.min(24, parseInt(q.meses || '1', 10) || 1));
      const r = await c.query(
        `update radar_cadastros
            set liberado_ate = greatest(now(), coalesce(liberado_ate, now())) + ($2 || ' months')::interval
          where regexp_replace(coalesce(whatsapp,''),'\\D','','g') = $1
          returning nome, liberado_ate`, [liberar, meses]);
      res.json({ ok: true, liberados: r.rowCount, quem: r.rows[0] || null });
      return;
    }

    // STATUS da pessoa
    const phone = (q.phone || '').replace(/\D/g, '');
    if (!phone) { res.status(400).json({ error: 'sem phone' }); return; }
    if (phone === OWNER) { res.json({ ok:true, status:'ativo', dono:true, dias: 9999 }); return; }

    const r = await c.query(
      `select greatest(trial_inicio + interval '30 days', coalesce(liberado_ate, 'epoch'::timestamptz)) as ate,
              now() as agora
         from radar_cadastros
        where regexp_replace(coalesce(whatsapp,''),'\\D','','g') = $1
        limit 1`, [phone]);
    if (!r.rows[0]) { res.json({ ok:true, status:'novo' }); return; }
    const ate = new Date(r.rows[0].ate).getTime();
    const agora = new Date(r.rows[0].agora).getTime();
    const dias = Math.ceil((ate - agora) / 86400000);
    res.json({ ok:true, status: agora <= ate ? 'ativo' : 'expirado', dias, ate: r.rows[0].ate });
  } catch (e) {
    res.status(200).json({ ok:false, err: String(e && e.message || e).slice(0,140) });
  } finally { try { await c.end(); } catch (_) {} }
};
