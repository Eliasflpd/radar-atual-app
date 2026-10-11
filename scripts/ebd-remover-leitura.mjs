// Remove a seção "LEITURA DIÁRIA" / "LEITURA SEMANAL" (lista Segunda..Sábado) das lições da EBD.
// Pedido do Elias em 11/10/2026. NÃO mexe em "LEITURA BÍBLICA EM CLASSE" (é outra seção).
// Segurança: só remove se o bloco for uma ou mais <ul> cujos itens (1 a 7) começam todos por dia
// da semana e se logo depois vier outro <p class="sec-head">. Qualquer coisa fora disso é pulada
// e relatada. Exceção conhecida: jovem/licao-01 (OCR ruim do 3º tri: os dias ficaram colados
// dentro da caixa do versículo) tem um corte exato e conferido mais abaixo.
// Uso:  node scripts/ebd-remover-leitura.mjs          (simulação, não grava nada)
//       node scripts/ebd-remover-leitura.mjs --gravar (grava)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EBD = path.join(RAIZ, 'public', 'ebd');
const GRAVAR = process.argv.includes('--gravar');
const DIAS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const semAcento = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const RE = /<p class="sec-head">\s*(?:<strong>)?LEITURA (?:DI[ÁA]RIA|SEMANAL)(?:<\/strong>)?\s*<\/p>\s*((?:<ul>[\s\S]*?<\/ul>\s*)+)(?=<p class="sec-head">)/g;

// jovem/licao-01: o cabeçalho "LEITURA SEMANAL" ficou colado em cima da caixa "Versículo da Lição"
// e os dias (SEGUNDA..SABADO, com OCR quebrado) estão dentro do parágrafo dela.
function consertaJovem01(s) {
  const cab = /<p class="sec-head">LEITURA SEMANAL<\/p>\r?\n(?=<div class="box-aureo">)/;
  const ini = s.indexOf(' SEGUNDA - Js 1,1-g');
  const fim = s.indexOf(" OBJET'IVO5");
  if (!cab.test(s) || ini < 0 || fim < ini || fim - ini > 400) return null;
  const corte = s.slice(ini, fim);
  if (!/Esp[ií]r[ií]to$/.test(corte) || !/SABADO/.test(corte)) return null;
  return (s.slice(0, ini) + s.slice(fim)).replace(cab, '');
}

let tocados = 0, pulados = 0, semBloco = 0;
for (const turma of fs.readdirSync(EBD)) {
  const dir = path.join(EBD, turma, 'html');
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
    const arq = path.join(dir, f), rotulo = turma + '/' + f;
    const s = fs.readFileSync(arq, 'utf8');
    let novo = null;
    const achados = [...s.matchAll(RE)];
    if (achados.length) {
      let ok = achados.length === 1;
      for (const m of achados) {
        const itens = [...m[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(x => semAcento(x[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()));
        if (itens.length < 1 || itens.length > 7 || !itens.every(t => DIAS.some(d => t.startsWith(d)))) ok = false;
      }
      if (ok) novo = s.replace(RE, '');
    } else if (rotulo === 'jovem/licao-01.html') {
      novo = consertaJovem01(s);
    } else if (!/LEITURA (DI[ÁA]RIA|SEMANAL)/.test(s)) { semBloco++; continue; }
    if (novo === null) { console.log('PULADO (não é o formato esperado):', rotulo); pulados++; continue; }
    if (GRAVAR) fs.writeFileSync(arq, novo, 'utf8');
    tocados++;
    console.log((GRAVAR ? 'gravado  ' : 'removeria ') + rotulo.padEnd(28) + (s.length - novo.length) + ' caracteres');
  }
}
console.log(`\n${GRAVAR ? 'GRAVADO' : 'SIMULAÇÃO'}: ${tocados} arquivos alterados · ${pulados} pulados · ${semBloco} sem o bloco`);
