#!/usr/bin/env node
// Define (ou troca) o PIN dos livros particulares. Ver api/_lib/livro-particular.js.
// No banco fica só o hash salgado; trocar o PIN também troca o segredo, e os aparelhos que já tinham entrado
// precisam digitar o PIN novo.
//   RADAR_DB=... node scripts/livro-particular-pin.mjs <pin>
import crypto from 'node:crypto';
import pg from 'pg';

const pin = String(process.argv[2] || '').trim();
if (!/^\d{4,8}$/.test(pin)) { console.log('uso: node scripts/livro-particular-pin.mjs <pin de 4 a 8 dígitos>'); process.exit(1); }
const cs = process.env.RADAR_DB;
if (!cs) { console.log('✖ Sem RADAR_DB no ambiente.'); process.exit(1); }

const sal = crypto.randomBytes(16).toString('hex');
const segredo = crypto.randomBytes(32).toString('hex');
const hash = crypto.createHash('sha256').update(sal + pin).digest('hex');
const c = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
await c.connect();
await c.query(`create table if not exists livros_particulares_cfg(
  id int primary key, sal text, hash text, segredo text, erros int default 0, erros_desde timestamptz)`);
await c.query(`insert into livros_particulares_cfg(id,sal,hash,segredo,erros,erros_desde) values(1,$1,$2,$3,0,null)
  on conflict(id) do update set sal=$1, hash=$2, segredo=$3, erros=0, erros_desde=null`, [sal, hash, segredo]);
console.log('✅ PIN dos livros particulares gravado (só o hash).');
await c.end();
