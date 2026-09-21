// GERADOR DO CORPUS DO DR. WAGNER CORDEIRO
// ------------------------------------------------------------------
// POR QUE ISSO EXISTE:
// O endpoint /api/concilio-wagner roda no EDGE RUNTIME da Vercel (ver api/edge.js).
// No Edge não existe `fs` — a função NÃO enxerga D:\RADAR-APP\_TRANSCRICOES-WAGNER\
// nem o _CADERNO-PEROLAS-WAGNER.md em produção. Logo, o material precisa ser
// EMBUTIDO no bundle como módulo JavaScript. É o que este script faz.
//
// COMO REGERAR (depois de mexer no caderno / nas transcrições / nas tipologias):
//   cd D:\RADAR-APP
//   node scripts/gerar-corpus-wagner.mjs
// Ele reescreve api/_lib/wagner-corpus.js e imprime o tamanho no fim.
//
// TETO: ~1,5 MB de arquivo gerado (limite combinado). O script AVISA e CORTA
// as transcrições (a fonte mais gorda e menos destilada) se passar disso.
// Lembrando que o limite real da Vercel é do bundle COMPRIMIDO (1 MB no Hobby),
// e texto puro comprime ~4x — por isso 1,5 MB cru cabe com folga.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const SKILL = 'D:/SKILL/wagner-cordeiro';
const SAIDA = path.join(RAIZ, 'api', '_lib', 'wagner-corpus.js');
const TETO_BYTES = 1_500_000;

const ler = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch (_) { return ''; } };
const limpar = (s) => s.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

const chunks = [];
// f = fonte  ('T' tipologias | 'C' caderno | 'X' transcrição)
// s = título/seção (de onde veio — vai no relatório de fontes da resposta)
// t = texto
const add = (f, s, t) => { t = limpar(t); if (t.length > 120) chunks.push({ f, s: limpar(s).slice(0, 120), t }); };

// ── 1) TIPOLOGIAS CATALOGADAS (o mais destilado de todos: a ponte já vem montada)
{
  const txt = ler(path.join(SKILL, 'referencias/tipologias.md'));
  // O arquivo tem DOIS formatos de entrada (o Bloco A é uma linha só;
  // os Blocos B e C são "**N.**" seguido de bullets). Cobrimos os dois.
  let bloco = 'tipologias';
  const partes = txt.split(/\n(?=\d+\.\s+\*\*Texto|\*\*\d+\.\*\*\s*$)/m);
  for (const p of partes) {
    const hs = [...p.matchAll(/^##\s+(.+)$/gm)];
    if (hs.length) bloco = hs[hs.length - 1][1];
    if (!/\*\*Texto:\*\*/.test(p)) continue;
    add('T', 'Tipologias catalogadas — ' + bloco, p.replace(/^##\s+.+$/gm, '').replace(/^>.*$/gm, ''));
  }
}

// ── 2) CADERNO DE PÉROLAS (413+ garimpos já destilados, 1 por bloco "### 🔹")
{
  const txt = ler(path.join(RAIZ, '_CADERNO-PEROLAS-WAGNER.md'));
  let aula = 'Caderno de Pérolas';
  const partes = txt.split(/\n(?=###\s)/);
  for (const p of partes) {
    // a aula corrente vem do último "## " visto dentro do pedaço
    const aulas = [...p.matchAll(/^##\s+(.+)$/gm)];
    if (aulas.length) aula = aulas[aulas.length - 1][1];
    const t = p.match(/^###\s+🔹?\s*(.+)$/m);
    if (!t) continue;
    add('C', aula + ' · ' + t[1], p.replace(/^##\s+.+$/gm, ''));
  }
}

// ── 3) TRANSCRIÇÕES DAS 12 AULAS (a fonte bruta — só entra quando o destilado não basta)
// As transcrições são LINHAS GIGANTES sem parágrafo, então fatiamos por janela de
// caracteres cortando na fronteira de frase mais próxima (pra não partir raciocínio no meio).
const transcricoes = [];
{
  const dir = path.join(RAIZ, '_TRANSCRICOES-WAGNER');
  const arquivos = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort() : [];
  const JANELA = 1000;
  for (const arq of arquivos) {
    const nome = arq.replace(/\.txt$/, '');
    const txt = limpar(ler(path.join(dir, arq)));
    let i = 0;
    while (i < txt.length) {
      let fim = Math.min(i + JANELA, txt.length);
      if (fim < txt.length) {
        const corte = txt.lastIndexOf('. ', fim);
        if (corte > i + JANELA * 0.5) fim = corte + 1;
      }
      const t = limpar(txt.slice(i, fim));
      if (t.length > 120) transcricoes.push({ f: 'X', s: 'Aula: ' + nome, t });
      i = fim;
    }
  }
}

// Monta, mede e corta as transcrições se estourar o teto.
function montar(trans) {
  const todos = chunks.concat(trans);
  const cab = `// GERADO AUTOMATICAMENTE por scripts/gerar-corpus-wagner.mjs — NÃO EDITE À MÃO.
// Fontes: D:/SKILL/wagner-cordeiro/referencias/tipologias.md, D:/RADAR-APP/_CADERNO-PEROLAS-WAGNER.md,
// D:/RADAR-APP/_TRANSCRICOES-WAGNER/*.txt  ·  gerado em ${new Date().toISOString().slice(0, 10)}
// f: T=tipologia catalogada · C=Caderno de Pérolas · X=transcrição da aula
export default `;
  return cab + JSON.stringify(todos) + ';\n';
}

let trans = transcricoes;
let saida = montar(trans);
while (Buffer.byteLength(saida, 'utf8') > TETO_BYTES && trans.length > 0) {
  // corta 5% dos pedaços de transcrição por vez, tirando do fim de cada aula
  const alvo = Math.floor(trans.length * 0.95);
  console.warn(`⚠ passou de ${TETO_BYTES} bytes — reduzindo transcrições de ${trans.length} para ${alvo} pedaços`);
  trans = trans.slice(0, alvo);
  saida = montar(trans);
}

fs.writeFileSync(SAIDA, saida, 'utf8');
const bytes = Buffer.byteLength(saida, 'utf8');
const gz = zlib.gzipSync(Buffer.from(saida, 'utf8')).length;
const porFonte = {};
for (const c of chunks.concat(trans)) porFonte[c.f] = (porFonte[c.f] || 0) + 1;
console.log('✔ escrito:', SAIDA);
console.log('  pedaços :', chunks.length + trans.length, JSON.stringify(porFonte), '(T=tipologias, C=caderno, X=transcrição)');
console.log('  tamanho :', (bytes / 1048576).toFixed(2), 'MB cru  ·', (gz / 1024).toFixed(0), 'KB gzip (é o que conta no limite da Vercel)');
