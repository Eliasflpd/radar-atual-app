#!/usr/bin/env node
// Sobe um livro particular (só o dono lê) para a tabela livros_particulares. Ver api/_lib/livro-particular.js.
// O .md fica FORA do repositório (D:\LIVROS-MOTOR\...); cada "## " vira um capítulo, na ordem do arquivo.
//   RADAR_DB=... node scripts/livro-particular-subir.mjs <id> "<arquivo.md>" "<Título>" "<Autor>"
import fs from 'node:fs';
import pg from 'pg';

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
await c.query('begin');
await c.query('delete from livros_particulares where livro=$1', [id]);
for (const k of caps) {
  await c.query('insert into livros_particulares(livro,ordem,titulo,texto,livro_titulo,autor) values($1,$2,$3,$4,$5,$6)',
    [id, k.ordem, k.titulo, k.texto, titulo, autor || '']);
}
await c.query('commit');
console.log(`✅ ${id}: ${caps.length} capítulos, ${Math.round(caps.reduce((s, k) => s + k.texto.length, 0) / 1000)} mil letras`);
await c.end();
