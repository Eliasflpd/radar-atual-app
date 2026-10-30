// ═══════════════════════════════════════════════════════════
// "QUAL É ESSE LOUVOR?" do WorshipOS (30/10/2026) — NÃO é do RADAR, só mora aqui
// por enquanto (depois vai pro servidor próprio do WorshipOS).
// Um celular abre /ouvir?s=<SALA>, ouve a pessoa cantar junto com o vocal e manda o
// TEXTO reconhecido; o WorshipOS daquela igreja lê a sala e descobre o louvor.
// É só um corredor: guarda frases por poucas horas e apaga. Nada de áudio, nada de nome.
//   POST /api/ws-ouvir  { sala, texto, tipo? }   -> grava 1 frase (tipo: fala|ligou|parou)
//   GET  /api/ws-ouvir?sala=XXXX&desde=N         -> frases com id > N
// Cada WorshipOS cria a SUA sala (código aleatório) — igrejas nunca se misturam.
// ═══════════════════════════════════════════════════════════
const { Client } = require('pg');

const SALA_OK = /^[A-Z0-9]{6,16}$/;
const TEXTO_MAX = 600;
const POR_MINUTO = 120;      // trava contra abuso (fala normal manda bem menos)

async function ensure(c){
  await c.query(`create table if not exists ws_ouvir(
    id bigserial primary key,
    sala text not null,
    tipo text not null default 'fala',
    texto text not null default '',
    criado timestamptz not null default now()
  )`);
  await c.query(`create index if not exists ws_ouvir_sala on ws_ouvir(sala, id)`);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store');
  if(req.method === 'OPTIONS'){ res.status(200).end(); return; }

  const q = req.query || {};
  let b = req.body;
  if(typeof b === 'string'){ try{ b = JSON.parse(b); }catch(_){ b = {}; } }
  if(Buffer.isBuffer(b)){ try{ b = JSON.parse(b.toString('utf8')); }catch(_){ b = {}; } }
  b = b || {};

  const sala = String((req.method === 'POST' ? b.sala : q.sala) || '').toUpperCase().trim();
  if(!SALA_OK.test(sala)){ res.status(200).json({ ok:false, err:'sala' }); return; }

  const cs = (process.env.RADAR_DB_DATABASE_URL||process.env.RADAR_DB);
  if(!cs){ res.status(200).json({ ok:false, off:true }); return; }
  const c = new Client({ connectionString: cs, ssl:{ rejectUnauthorized:false } });
  try{
    await c.connect();
    await ensure(c);
    if(Math.random() < 0.05) await c.query(`delete from ws_ouvir where criado < now() - interval '3 hours'`);

    if(req.method === 'POST'){
      const tipo = ['fala','ligou','parou'].includes(b.tipo) ? b.tipo : 'fala';
      const texto = String(b.texto || '').replace(/\s+/g,' ').trim().slice(0, TEXTO_MAX);
      if(tipo === 'fala' && !texto){ res.status(200).json({ ok:true, vazio:true }); return; }
      const r = await c.query(`select count(*)::int n from ws_ouvir where sala=$1 and criado > now() - interval '1 minute'`, [sala]);
      if((r.rows[0] && r.rows[0].n) >= POR_MINUTO){ res.status(200).json({ ok:false, err:'devagar' }); return; }
      const ins = await c.query(`insert into ws_ouvir(sala,tipo,texto) values($1,$2,$3) returning id`, [sala, tipo, texto]);
      res.status(200).json({ ok:true, id: ins.rows[0].id });
      return;
    }
    const desde = Math.max(0, parseInt(q.desde, 10) || 0);
    const r = await c.query(
      `select id, tipo, texto, extract(epoch from criado)*1000 as t from ws_ouvir
        where sala=$1 and id>$2 and criado > now() - interval '3 hours' order by id limit 60`, [sala, desde]);
    res.status(200).json({ ok:true, frases: r.rows.map((x) => ({ id: Number(x.id), tipo: x.tipo, texto: x.texto, t: Math.round(Number(x.t)) })) });
  }catch(e){
    res.status(200).json({ ok:false, err: String(e && e.message || e).slice(0,160) });
  }finally{ try{ await c.end(); }catch(_){} }
};
