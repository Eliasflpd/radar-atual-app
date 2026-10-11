// CRM Igrejas do RADAR — pastor divulga a igreja dele (dados + fotos + vídeos + avisos).
// Fotos vão como dataURL comprimida direto no Postgres (sem storage externo). Vídeo = link YouTube.
const { Client } = require('pg');

// 12/10/2026 — antes TODO número sem 55 na frente ganhava 55 (número de fora virava 55 + número e
// a mensagem nunca chegava). Agora só ganha 55 quem tem formato de número brasileiro: DDD válido +
// 8 dígitos (fixo) ou + 9 + 8 (celular). Mesma regra de api/send-otp.js.
const DDD_BR = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
function pareceBrasil(d) {
  if (!/^\d+$/.test(d) || (d.length !== 10 && d.length !== 11)) return false;
  if (!DDD_BR.has(d.slice(0, 2))) return false;
  return d.length === 11 ? d[2] === '9' : true;
}

async function ensure(c) {
  await c.query(`create table if not exists radar_igrejas(
    id serial primary key,
    nome_igreja text,
    endereco text,
    cidade text,
    responsavel text,
    whatsapp text,
    capa text,
    fotos jsonb default '[]',
    videos jsonb default '[]',
    avisos jsonb default '[]',
    ativo boolean default true,
    criado_em timestamptz default now()
  )`);
}

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
    await ensure(c);
    const ADM = process.env.RADAR_ADMIN_TOKEN;

    if (req.method === 'POST') {
      let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
      b = b || {};
      const id = b.id ? parseInt(b.id, 10) : null;
      const nome = (b.nome_igreja || '').trim();
      if (!nome) { res.status(400).json({ error: 'sem nome da igreja' }); return; }
      const endereco = (b.endereco || '').trim();
      const cidade = (b.cidade || '').trim();
      const responsavel = (b.responsavel || '').trim();
      const whatsapp = (b.whatsapp || '').replace(/\D/g, '');
      const capa = b.capa || '';
      const fotos = JSON.stringify(Array.isArray(b.fotos) ? b.fotos.slice(0, 8) : []);
      const videos = JSON.stringify(Array.isArray(b.videos) ? b.videos.slice(0, 10) : []);
      const avisos = JSON.stringify(Array.isArray(b.avisos) ? b.avisos.slice(0, 30) : []);

      if (id) {
        await c.query(
          `update radar_igrejas set nome_igreja=$1,endereco=$2,cidade=$3,responsavel=$4,whatsapp=$5,capa=$6,fotos=$7,videos=$8,avisos=$9 where id=$10`,
          [nome, endereco, cidade, responsavel, whatsapp, capa, fotos, videos, avisos, id]
        );
        res.json({ ok: true, id });
        return;
      }
      const r = await c.query(
        `insert into radar_igrejas(nome_igreja,endereco,cidade,responsavel,whatsapp,capa,fotos,videos,avisos) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
        [nome, endereco, cidade, responsavel, whatsapp, capa, fotos, videos, avisos]
      );
      const novoId = r.rows[0].id;
      // Confirmação no WhatsApp do responsável (via Fonnte)
      let avisado = false;
      const FT = process.env.FONNTE_TOKEN;
      if (FT && whatsapp) {
        let alvo = String(whatsapp).replace(/\D/g, ''); if (!alvo.startsWith('55') && pareceBrasil(alvo)) alvo = '55' + alvo;
        const primeiro = (responsavel || '').split(/\s+/)[0] || 'Pastor';
        const msg = 'Ola ' + primeiro + '! ⛪ A igreja *' + nome + '* foi cadastrada no *RADAR* e ja aparece pra galera divulgar.'
          + '\n\nVeja no app:\nhttps://radar-atual.vercel.app\n\n_Que Deus abencoe seu ministerio._ 🙏';
        try {
          const fr = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: { 'Authorization': FT, 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({ target: alvo, message: msg }, alvo.startsWith('55') ? { countryCode: '55' } : {}))
          });
          const fj = await fr.json().catch(() => ({}));
          avisado = !!(fj && (fj.status === true || fj.status === 'true'));
        } catch (e) { avisado = false; }
      }
      res.json({ ok: true, id: novoId, avisado });
      return;
    }

    // GET
    const q = req.query || {};
    const token = q.token || '';
    const admin = token && token === ADM;

    if (admin && q.del) {
      const rd = await c.query('delete from radar_igrejas where id=$1', [parseInt(q.del, 10)]);
      res.json({ ok: true, apagados: rd.rowCount });
      return;
    }
    if (q.id) { // detalhe de uma igreja (público)
      const r = await c.query('select * from radar_igrejas where id=$1 limit 1', [parseInt(q.id, 10)]);
      res.json({ igreja: r.rows[0] || null });
      return;
    }
    if (admin) {
      const r = await c.query('select * from radar_igrejas order by criado_em desc');
      res.json({ total: r.rows.length, igrejas: r.rows });
      return;
    }
    // público: só ativas, sem as fotos pesadas na lista (capa basta) — detalhe puxa o resto
    const r = await c.query('select id,nome_igreja,cidade,endereco,responsavel,whatsapp,capa,avisos from radar_igrejas where ativo=true order by criado_em desc');
    res.json({ total: r.rows.length, igrejas: r.rows });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  } finally {
    try { await c.end(); } catch (_) {}
  }
};
