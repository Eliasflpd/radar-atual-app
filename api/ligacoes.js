// MOTOR DE LIGAÇÕES — busca SEMÂNTICA de versículos (pgvector, estilo Logos).
// GET ?ref=jo 3:16   -> versículos mais parecidos POR SENTIDO (usa o vetor já salvo, ZERO custo de IA)
// GET ?q=texto livre -> gera o vetor da consulta via Gemini e busca os mais próximos
// Público (é só a Bíblia). limit padrão 8.
const { Client } = require('pg');

const DIM = parseInt(process.env.EMB_DIM || '768', 10);
const GKEY = process.env.GEMINI_API_KEY;
const GMODEL = process.env.GEMINI_MODEL || 'gemini-embedding-001';

// normaliza "Jo 3:16", "jo 3.16", "joão 3 16" -> {abbrev-ish, cap, ver}
const ALIAS = { rm:'rm', rom:'rm', romanos:'rm', gn:'gn', genesis:'gn', ex:'ex', exodo:'ex',
  lv:'lv', nm:'nm', dt:'dt', js:'js', jz:'jz', rt:'rt', sl:'sl', salmos:'sl', salmo:'sl',
  pv:'pv', ec:'ec', ct:'ct', is:'is', isaias:'is', jr:'jr', lm:'lm', ez:'ez', dn:'dn',
  mt:'mt', mateus:'mt', mc:'mc', marcos:'mc', lc:'lc', lucas:'lc', jo:'jo', joao:'jo',
  atos:'atos', at:'atos', ap:'ap', apocalipse:'ap', hb:'hb', hebreus:'hb', tg:'tg',
  ef:'ef', efesios:'ef', fp:'fp', cl:'cl', gl:'gl', galatas:'gl' };

function parseRef(s) {
  const m = s.trim().match(/^(.*?)[\s]*?(\d{1,3})[:\s.](\d{1,3})\s*$/);
  if (!m) return null;
  let liv = m[1].trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.\s]/g, '');
  return { abbrev: ALIAS[liv] || liv, cap: +m[2], ver: +m[3] };
}

async function embedQuery(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GMODEL}:embedContent?key=${GKEY}`;
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: DIM }) });
  if (!r.ok) throw new Error('gemini ' + r.status);
  const j = await r.json();
  return j.embedding.values;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const q = req.query || {};
  const limit = Math.min(parseInt(q.limit || '8', 10) || 8, 25);
  const cs = process.env.RADAR_DB;
  if (!cs) { res.status(200).json({ ok: false, off: true }); return; }
  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();

    // --- modo REFERÊNCIA: usa o vetor JÁ salvo (sem IA) ---
    if (q.ref) {
      const ref = parseRef(q.ref.toString());
      if (!ref) { res.status(400).json({ ok: false, err: 'ref' }); return; }
      const base = await c.query(
        `select ref,livro,cap,ver,texto,embedding from versiculo_embeddings
          where abbrev=$1 and cap=$2 and ver=$3 and embedding is not null limit 1`,
        [ref.abbrev, ref.cap, ref.ver]);
      if (!base.rowCount) { res.status(200).json({ ok: true, modo: 'ref', achou: false, total: 0, itens: [], msg: 'versículo ainda não indexado' }); return; }
      const emb = base.rows[0].embedding;
      const r = await c.query(
        `select ref,livro,cap,ver,texto, 1-(embedding <=> $1::vector) as score
           from versiculo_embeddings
          where embedding is not null and ref <> $2
          order by embedding <=> $1::vector
          limit $3`, [emb, base.rows[0].ref, limit]);
      res.status(200).json({ ok: true, modo: 'ref', achou: true,
        base: { ref: base.rows[0].ref, livro: base.rows[0].livro, cap: base.rows[0].cap, ver: base.rows[0].ver, texto: base.rows[0].texto },
        total: r.rowCount, itens: r.rows });
      return;
    }

    // --- modo TEXTO LIVRE: gera vetor da consulta via Gemini ---
    const termo = (q.q || '').toString().trim().slice(0, 300);
    if (termo.length < 2) { res.status(400).json({ ok: false, err: 'curto' }); return; }
    if (!GKEY) { res.status(200).json({ ok: false, err: 'sem chave IA p/ texto livre' }); return; }
    const vec = '[' + (await embedQuery(termo)).join(',') + ']';
    const r = await c.query(
      `select ref,livro,cap,ver,texto, 1-(embedding <=> $1::vector) as score
         from versiculo_embeddings
        where embedding is not null
        order by embedding <=> $1::vector
        limit $2`, [vec, limit]);
    res.status(200).json({ ok: true, modo: 'texto', q: termo, total: r.rowCount, itens: r.rows });
  } catch (e) {
    res.status(200).json({ ok: false, err: String(e).slice(0, 160) });
  } finally { try { await c.end(); } catch (_) {} }
};
