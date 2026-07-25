// Cadastros do RADAR — salva na nuvem (Supabase pessoal) e lista pro admin (Elias).
const { Client } = require('pg');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const cs = process.env.RADAR_DB;
  if (!cs) { res.status(500).json({ error: 'db não configurado' }); return; }
  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    if (req.method === 'POST') {
      let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
      const nome = (b && b.nome || '').trim();
      const cargo = (b && b.cargo || '').trim();
      const whatsapp = (b && b.whatsapp || '').replace(/\D/g, '');
      if (!nome) { res.status(400).json({ error: 'sem nome' }); return; }
      if (whatsapp) await c.query('delete from radar_cadastros where regexp_replace(coalesce(whatsapp,\'\'),\'\\D\',\'\',\'g\') = $1', [whatsapp]); // 1 cadastro por WhatsApp
      await c.query('insert into radar_cadastros(nome,cargo,whatsapp) values($1,$2,$3)', [nome, cargo, whatsapp]);
      // Confirmação no WhatsApp da própria pessoa (evita gente mentirosa) — via Fonnte, sem bloquear o cadastro se falhar
      let avisado = false;
      const FT = process.env.FONNTE_TOKEN;
      if (FT && whatsapp) {
        let alvo = whatsapp; if (!alvo.startsWith('55')) alvo = '55' + alvo; // Brasil
        const primeiroNome = nome.split(/\s+/)[0];
        const msg = 'Ola ' + primeiroNome + '! ✅ Seu cadastro no *RADAR* foi feito com sucesso.'
          + (cargo ? ('\nCargo: ' + cargo) : '')
          + '\n\nAcesse o app aqui:\nhttps://radar-atual.vercel.app\n\n_Avisos e agenda da igreja na palma da mao._ 🙏';
        try {
          const fr = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: { 'Authorization': FT, 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: alvo, message: msg, countryCode: '55' })
          });
          const fj = await fr.json().catch(() => ({}));
          avisado = !!(fj && (fj.status === true || fj.status === 'true'));
        } catch (e) { avisado = false; }
      }
      res.json({ ok: true, avisado });
    } else {
      const phone = ((req.query && req.query.phone) || '').replace(/\D/g, '');
      if (phone) { // "Já cadastrado?" — restaura pelo WhatsApp
        const r = await c.query('select nome,cargo,whatsapp from radar_cadastros where regexp_replace(coalesce(whatsapp,\'\'),\'\\D\',\'\',\'g\') = $1 limit 1', [phone]);
        res.json({ cadastro: r.rows[0] || null });
        return;
      }
      const token = (req.query && req.query.token) || '';
      if (token !== process.env.RADAR_ADMIN_TOKEN) { res.status(401).json({ error: 'não autorizado' }); return; }
      const r = await c.query('select nome,cargo,whatsapp,criado_em from radar_cadastros order by criado_em desc');
      res.json({ total: r.rows.length, cadastros: r.rows });
    }
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  } finally {
    try { await c.end(); } catch (_) {}
  }
};
