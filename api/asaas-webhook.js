// Webhook do Asaas — quando o PIX é confirmado, libera o assinante por 1 mês.
const { Client } = require('pg');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(200).json({ ok:true }); return; }
  // segurança opcional: se ASAAS_WEBHOOK_TOKEN estiver setado, exige o header
  const tk = process.env.ASAAS_WEBHOOK_TOKEN;
  if (tk && req.headers['asaas-access-token'] !== tk) { res.status(401).json({ error:'token' }); return; }

  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } } b = b || {};
  const evento = b.event || '';
  const pay = b.payment || {};
  const phone = (pay.externalReference || '').replace(/\D/g, '');
  const pagou = evento === 'PAYMENT_RECEIVED' || evento === 'PAYMENT_CONFIRMED';

  if (!pagou || !phone) { res.status(200).json({ ok:true, ignorado:true }); return; }

  const cs = process.env.RADAR_DB;
  if (!cs) { res.status(200).json({ ok:true }); return; }
  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized:false } });
  try {
    await c.connect();
    await c.query(
      `update radar_cadastros
          set liberado_ate = greatest(now(), coalesce(liberado_ate, now())) + interval '1 month'
        where regexp_replace(coalesce(whatsapp,''),'\\D','','g') = $1`, [phone]);
    res.status(200).json({ ok:true, liberado:phone });
  } catch (e) {
    res.status(200).json({ ok:true, err:String(e&&e.message||e).slice(0,120) });
  } finally { try { await c.end(); } catch (_) {} }
};
