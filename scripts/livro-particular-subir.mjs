#!/usr/bin/env node
// Sobe um livro particular (só o dono lê) para a tabela livros_particulares. Ver api/_lib/livro-particular.js.
// O .md fica FORA do repositório (D:\LIVROS-MOTOR\...); cada "## " vira um capítulo, na ordem do arquivo.
//   RADAR_DB=... node scripts/livro-particular-subir.mjs <id> "<arquivo.md>" "<Título>" "<Autor>"
//   RADAR_DB=... node scripts/livro-particular-subir.mjs <id> --capa "<capa.jpg>"   (capa também só no banco)
import fs from 'node:fs';
import pg from 'pg';

if (process.argv[3] === '--capa') {
  const [id, , img] = process.argv.slice(2);
  const c = new pg.Client({ connectionString: process.env.RADAR_DB, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query('create table if not exists livros_particulares_capas(livro text primary key, capa text)');
  const url = 'data:image/jpeg;base64,' + fs.readFileSync(img).toString('base64');
  await c.query('insert into livros_particulares_capas(livro,capa) values($1,$2) on conflict(livro) do update set capa=$2', [id, url]);
  console.log(`✅ capa de ${id}: ${Math.round(url.length / 1024)} KB`);
  await c.end();
  process.exit(0);
}

const [id, arq, titulo, autor] = process.argv.slice(2);
if (!id || !arq || !titulo) { console.log('uso: node scripts/livro-particular-subir.mjs <id> <arquivo.md> <Título> <Autor>'); process.exit(1); }
const cs = process.env.RADAR_DB;
if (!cs) { console.log('✖ Sem RADAR_DB no ambiente.'); process.exit(1); }

const md = fs.readFileSync(arq, 'utf8').replace(/\r/g, '');
const caps = md.split(/\n(?=## )/).filter((b) => b.startsWith('## ')).map((b, i) => {
  const t = b.match(/^## (.+)$/m)[1].trim();
  return { ordem: i + 1, titulo: t, texto: b.replace(/^## .+\n+/, '').trim() };
});

const c = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
await c.connect();
await c.query(`create table if not exists livros_particulares(
  livro text not null, ordem int not null, titulo text, texto text, livro_titulo text, autor text,
  primary key(livro, ordem))`);
// TRAVA DOS LIVROS (25/10/2026): substituir um livro que já está na estante exige --autorizado-pelo-elias
// (o banco recusa o delete sem isso). Livro novo entra sem flag.
await c.query('begin');
if (process.argv.includes('--autorizado-pelo-elias')) await c.query("select set_config('radar.elias_autorizou','SIM',true)");
try { await c.query('delete from livros_particulares where livro=$1', [id]); }
catch (e) { await c.query('rollback'); console.log(`🔒 ${id} já está na estante e a TRAVA DOS LIVROS não deixou substituir. Só com --autorizado-pelo-elias.`); process.exit(1); }
for (const k of caps) {
  await c.query('insert into livros_particulares(livro,ordem,titulo,texto,livro_titulo,autor) values($1,$2,$3,$4,$5,$6)',
    [id, k.ordem, k.titulo, k.texto, titulo, autor || '']);
}
await c.query('commit');
console.log(`✅ ${id}: ${caps.length} capítulos, ${Math.round(caps.reduce((s, k) => s + k.texto.length, 0) / 1000)} mil letras`);
await c.end();
