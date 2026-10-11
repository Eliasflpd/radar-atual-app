// Faz o texto das lições da EBD ocupar a tela toda do celular (pedido do Elias em 11/10/2026):
// - margens laterais mínimas (7px; antes 11 a 20px conforme a revista);
// - lang="pt-BR" na <html>, que é o que faz o Chrome hifenizar em português (hyphens:auto);
// - quebra de palavra só quando a palavra não cabe na linha (nada de estourar nem rolar de lado).
// Idempotente: se o marcador já existe, não faz de novo.
// Uso:  node scripts/ebd-texto-tela-cheia.mjs          (simulação)
//       node scripts/ebd-texto-tela-cheia.mjs --gravar
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EBD = path.join(RAIZ, 'public', 'ebd');
const GRAVAR = process.argv.includes('--gravar');
const MARCA = '/*tela-cheia-2026-10-11b*/';
const MARCA_VELHA = /\/\*tela-cheia-2026-10-11\*\/[\s\S]*?iframe\{max-width:100%\}/;   // 1ª versão (tinha width:100% + padding e cortava 7px à direita)
const CSS = MARCA +
  'html,body{max-width:100%;overflow-x:hidden}' +
  'body{box-sizing:border-box;padding-left:7px;padding-right:7px;overflow-wrap:anywhere}' +
  'p,li,.subpoint,.verso,.box-aureo,.box-pratica,.bible-passage{text-align:justify;hyphens:auto;-webkit-hyphens:auto;overflow-wrap:anywhere;word-break:break-word;min-width:0}' +
  'ul,ol{padding-left:18px}' +
  'img,table,iframe{max-width:100%}';

let alterados = 0, jaTinha = 0, semStyle = 0;
for (const turma of fs.readdirSync(EBD)) {
  const dir = path.join(EBD, turma, 'html');
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
    const arq = path.join(dir, f);
    let s = fs.readFileSync(arq, 'utf8');
    if (s.includes(MARCA)) { jaTinha++; continue; }
    if (MARCA_VELHA.test(s)) { s = s.replace(MARCA_VELHA, CSS); if (GRAVAR) fs.writeFileSync(arq, s, 'utf8'); alterados++; continue; }
    const i = s.indexOf('</style>');
    if (i < 0) { semStyle++; console.log('SEM <style>:', turma + '/' + f); continue; }
    s = s.slice(0, i) + CSS + s.slice(i);
    if (!/<html[^>]*\blang=/i.test(s)) s = s.replace(/<html(\s|>)/i, (m, g) => '<html lang="pt-BR"' + (g === '>' ? '>' : ' '));
    if (GRAVAR) fs.writeFileSync(arq, s, 'utf8');
    alterados++;
  }
}
console.log(`${GRAVAR ? 'GRAVADO' : 'SIMULAÇÃO'}: ${alterados} páginas ajustadas · ${jaTinha} já tinham · ${semStyle} sem <style>`);
