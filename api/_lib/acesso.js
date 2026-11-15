// GATE de 30 dias do RADAR.
// GET ?phone=NUM                         -> {status:'ativo'|'expirado'|'novo', dias, ate}
// GET ?token=ADMIN&liberar=NUM&meses=N    -> libera a pessoa por N meses (default 1)
const { Client } = require('pg');
const OWNER = '5599988031747'; // Elias nunca é bloqueado

// 15/11/2026: colunas da estatística de uso (criadas uma vez por instância)
let _colsOk = false;
async function colunasUso(c) {
  if (_colsOk) return;
  await c.query(`alter table radar_cadastros
    add column if not exists ultimo_acesso timestamptz,
    add column if not exists acessos integer default 0,
    add column if not exists cidade text,
    add column if not exists uf text,
    add column if not exists pais text`);
  _colsOk = true;
}
function geo(h) {
  const dec = (v) => { try { return decodeURIComponent(String(v || '')).slice(0, 60); } catch (_) { return String(v || '').slice(0, 60); } };
  return { cidade: dec(h['x-vercel-ip-city']), uf: dec(h['x-vercel-ip-country-region']).slice(0, 10), pais: dec(h['x-vercel-ip-country']).slice(0, 4) };
}
async function registrarAcesso(c, phone, headers) {
  await colunasUso(c);
  const g = geo(headers);
  await c.query(
    `update radar_cadastros
        set ultimo_acesso = now(), acessos = coalesce(acessos, 0) + 1,
            cidade = coalesce(nullif($2, ''), cidade), uf = coalesce(nullif($3, ''), uf), pais = coalesce(nullif($4, ''), pais)
      where regexp_replace(coalesce(whatsapp,''),'\\D','','g') = $1`, [phone, g.cidade, g.uf, g.pais]);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const cs = (process.env.RADAR_DB_DATABASE_URL||process.env.RADAR_DB);
  if (!cs) { res.status(200).json({ ok:false, off:true }); return; }
  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    const q = req.query || {};

    // ADMIN: liberar quem pagou (mandou o comprovante)
    const liberar = (q.liberar || '').replace(/\D/g, '');
    if (liberar) {
      const ADM = process.env.RADAR_ADMIN_TOKEN;
      if (!ADM || q.token !== ADM) { res.status(403).json({ error: 'token' }); return; }
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

    // 15/11/2026 (pedido do Elias: "quem está acessando, nome, telefone e de onde"): cada abertura do app passa
    // por aqui. Guarda o último acesso, quantos acessos e a cidade APROXIMADA que a Vercel tira do IP
    // (x-vercel-ip-*). Sem GPS, sem pedir permissão no celular, sem guardar o IP.
    try { await registrarAcesso(c, phone, req.headers || {}); } catch (_) { /* estatística nunca trava o acesso */ }

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
