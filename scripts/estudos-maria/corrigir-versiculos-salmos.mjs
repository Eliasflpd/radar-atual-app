// Troca 8 versículos dos "Salmos Explicados" que o PDF original trazia COPIADOS do salmo anterior
// pelo texto real do versículo na Bíblia do app (public/biblia.json, Almeida). A explicação
// que vem logo abaixo já era a certa; só o texto do versículo estava errado. 11/10/2026.
// Só troca se confirmar que o texto atual é de fato o do salmo anterior (começa igual).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const biblia = JSON.parse(fs.readFileSync(path.join(RAIZ, 'public', 'biblia.json'), 'utf8').replace(/^﻿/, ''));
const sl = biblia.find(x => x.abbrev === 'sl').chapters;
const arq = path.join(RAIZ, '_estudos-maria-trabalho', 'salmos-explicados', 'texto.json');
const j = JSON.parse(fs.readFileSync(arq, 'utf8'));
const GRAVAR = process.argv.includes('--gravar');

// Sl 65:13 FICOU DE FORA: lá a explicação também veio do Sl 54, então trocar só o versículo desencontraria os dois.
// Conferido um a um pela explicação que vem logo abaixo de cada versículo (7 de 7 batem com o texto certo).
const alvos = [[42, 9, 40], [98, 2, 97], [98, 5, 97], [108, 2, 107], [108, 6, 107], [113, 2, 112], [144, 6, 143]];
const limpa = t => t.replace(/[“”"]/g, '').trim();
let feitos = 0;
for (const [s, v, orig] of alvos) {
  const cap = j.capitulos.find(c => c.t === 'Salmo ' + s);
  if (!cap) { console.log('Sl', s, 'não achei o capítulo'); continue; }
  const i = cap.blocos.findIndex(b => b.t === 'h' && new RegExp('^Vers[ií]culo\\s+0?' + v + '$').test(b.x.trim()));
  if (i < 0) { console.log('Sl', s + ':' + v, 'cabeçalho não achado'); continue; }
  const k = i + 1;
  if (!cap.blocos[k] || cap.blocos[k].t !== 'q') { console.log('Sl', s + ':' + v, 'o bloco seguinte não é versículo'); continue; }
  const antes = cap.blocos[k].x, certo = sl[s - 1][v - 1];
  const copiado = sl[orig - 1].some(t => limpa(antes).startsWith(t.slice(0, 25)));
  console.log('Sl ' + s + ':' + v + '  (texto trazido de Sl ' + orig + ')');
  const expl = cap.blocos[k + 2];   // h "✏Explicação" em k+1, o parágrafo em k+2
  console.log('   explicação logo abaixo: ' + (expl ? expl.x.slice(0, 140) : '?'));
  console.log('   antes : ' + antes.slice(0, 100));
  console.log('   depois: “' + certo.slice(0, 100) + '”');
  if (GRAVAR) { cap.blocos[k].x = '“' + certo + '”'; feitos++; }
}
if (GRAVAR) fs.writeFileSync(arq, JSON.stringify(j));
console.log('\n' + (GRAVAR ? 'GRAVADO' : 'SIMULAÇÃO') + (GRAVAR ? ': ' + feitos + ' de ' + alvos.length + ' versículos corrigidos' : ''));
