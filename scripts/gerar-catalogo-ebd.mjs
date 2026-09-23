#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════════
   O CALENDÁRIO DA EBD — pra o globo saber em que lição a igreja está HOJE.

   POR QUE (23/09/2026, pedido do Elias):
   "precisa saber responder o nome de todas as lições — qual a lição 3, qual a
   12 — e em que lição estamos de acordo com as datas vigentes. E focar sempre
   na lição que estudaremos no próximo domingo."

   DE ONDE VEM (e por que NÃO se digita nada aqui):
   a lista de lições já existe no app, em `const EBD_LICOES` de
   public/assets/app.js, e a conta da semana em `licaoDaSemana()`. Se eu
   copiasse os títulos pra cá, no dia em que o Elias corrigisse um título lá o
   globo passaria a mentir. Então este script LÊ o app.js e gera o catálogo.
   Fonte única: o app manda, o globo obedece.

   SAÍDA: public/ebd/catalogo.json — turmas, lições com número/título/datas,
   o versículo áureo (de previa.json) e a data de início do trimestre.
   É arquivo estático: o globo busca por HTTP, sem banco e sem chave.

   Uso:  node scripts/gerar-catalogo-ebd.mjs
   ══════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(RAIZ, 'public', 'assets', 'app.js');

const src = fs.readFileSync(APP, 'utf8');

// ─── 1) a data em que o trimestre começou, tirada do próprio licaoDaSemana() ──
// Está escrita como `new Date(2026,6,5)` — mês em JavaScript começa no ZERO,
// então 6 é JULHO. Ler daqui em vez de fixar evita o catálogo envelhecer calado
// quando o Elias virar o trimestre.
const mStart = src.match(/function licaoDaSemana\(\)\s*\{[\s\S]*?new Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})\)/);
if (!mStart) { console.error('❌ não achei a data de início em licaoDaSemana()'); process.exit(1); }
const INICIO = new Date(+mStart[1], +mStart[2], +mStart[3]);

// ─── 2) as lições ────────────────────────────────────────────────────────────
// Recorto o objeto EBD_LICOES contando chaves, e leio com Function em vez de
// JSON.parse: ele é JavaScript de verdade (chaves sem aspas, vírgula sobrando),
// e tentar consertar isso com regex é o caminho curto pra quebrar em silêncio.
const ini = src.indexOf('const EBD_LICOES');
if (ini < 0) { console.error('❌ não achei EBD_LICOES em app.js'); process.exit(1); }
let i = src.indexOf('{', ini), nivel = 0, fim = -1;
for (let k = i; k < src.length; k++) {
  if (src[k] === '{') nivel++;
  else if (src[k] === '}') { nivel--; if (nivel === 0) { fim = k + 1; break; } }
}
let LICOES;
try { LICOES = Function('return ' + src.slice(i, fim))(); }
catch (e) { console.error('❌ não consegui ler EBD_LICOES:', e.message); process.exit(1); }

// ─── 3) versículo áureo e aplicação, de previa.json ──────────────────────────
let previa = {};
try { previa = JSON.parse(fs.readFileSync(path.join(RAIZ, 'public', 'ebd', 'previa.json'), 'utf8')); } catch (_) {}

// ─── 4) a data do domingo de cada lição ──────────────────────────────────────
const domingoDa = (n) => {
  const d = new Date(INICIO); d.setDate(INICIO.getDate() + (n - 1) * 7);
  return d.toISOString().slice(0, 10);
};

// ─── 4b) OS PONTOS E SUBPONTOS DE CADA LIÇÃO ────────────────────────────────
// Elias: "ele parece que não tá dentro da lição... precisa ler o texto áureo na
// íntegra, a verdade prática, e cada ponto da lição e subpontos, destacando e
// explicando". O título e o áureo já chegavam; o MIOLO não. Ele está no
// subsídio de cada turma (public/ebd/<turma>/html/subsidio-NN.html), marcado
// por romano (I —, II —) nos pontos e por número (2., 3)) nos subpontos.
function limpar(t) {
  return String(t || '').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&hellip;/g, '...').replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ').trim();
}
function pontosDaLicao(turma, n) {
  const dir = path.join(RAIZ, 'public', 'ebd', turma, 'html');
  if (!fs.existsSync(dir)) return [];
  const dois = String(n).padStart(2, '0');
  const alvo = ['subsidio-' + dois, 'subsidio-' + n, 'apoio-' + dois, 'apoio-' + n,
                'licao-' + dois, 'licao-' + n]
    .map((b) => path.join(dir, b + '.html')).find((f) => fs.existsSync(f));
  if (!alvo) return [];

  // ⚠️ COMO A LIÇÃO É GUARDADA DE VERDADE (visto no arquivo, não suposto):
  //   <p class="sec-head">I — O MANDATO UNIVERSAL DE</p>
  //   <p>JESUS
  //   1. A Autoridade de Cristo sobre Todas as
  //   Nações (Mt 28:18)
  //   Antes de ordenar a missão...
  // Ou seja: (a) o título do PONTO nasce partido em DOIS parágrafos — o resto
  // dele ("JESUS") abre o parágrafo seguinte; (b) dentro do parágrafo, as
  // quebras de linha são só do editor e cortam o subponto no meio.
  // Por isso: junto as linhas de dentro do parágrafo, e depois costuro o
  // pedaço perdido do título com o começo do parágrafo seguinte.
  const paras = fs.readFileSync(alvo, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .split(/<\/p>/i)
    .map((b) => b.replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'").replace(/&hellip;/g, '...').replace(/&mdash;/g, '—')
      .replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const achados = [];
  for (let i = 0; i < paras.length; i++) {
    const t = paras[i];

    // PONTO: romano + travessão. O resto do título vem no parágrafo seguinte,
    // ANTES do primeiro subponto numerado.
    const mp = /^([IVX]{1,4})\s*[—.\-–)]\s*(.{3,120})$/.exec(t);
    if (mp) {
      let titulo = (mp[1] + ' — ' + mp[2]).trim();
      const prox = paras[i + 1] || '';
      const resto = prox.split(/\s\d{1,2}\.\s/)[0].trim();
      // só costura se for curto e em MAIÚSCULAS — senão é o corpo do texto
      if (resto && resto.length <= 40 && resto === resto.toUpperCase()) titulo += ' ' + resto;
      achados.push({ nivel: 'ponto', texto: titulo.replace(/\s+/g, ' ') });
    }

    // SUBPONTO: "N. Título (Referência)". A referência entre parênteses é o que
    // marca o fim — sem ela o texto do comentário entraria junto.
    const re = /(?:^|\s)(\d{1,2})\.\s+([A-ZÀ-Ú][^()]{4,110}\([^)]{2,30}\))/g;
    let m;
    while ((m = re.exec(t))) {
      achados.push({ nivel: 'subponto', texto: (m[1] + '. ' + m[2]).replace(/\s+/g, ' ').trim() });
    }
  }
  return achados;
}

const catalogo = {
  gerado_em: new Date().toISOString().slice(0, 10),
  inicio_trimestre: INICIO.toISOString().slice(0, 10),
  // A MESMA conta de licaoDaSemana() no app.js. Escrita aqui em palavras pra
  // quem ler o catálogo entender sem abrir o app: o domingo que vem é o alvo;
  // se hoje JÁ é domingo, o alvo é hoje.
  regra_da_semana: 'lição = semanas inteiras entre inicio_trimestre e o PRÓXIMO domingo, mais 1. Se hoje é domingo, o próximo domingo é hoje.',
  turmas: {},
};

for (const [turma, lista] of Object.entries(LICOES)) {
  catalogo.turmas[turma] = (lista || []).map((l) => ({
    n: l.n,
    titulo: l.titulo || '',
    domingo: domingoDa(l.n),
    aureo: (previa[turma] && previa[turma][String(l.n)] && previa[turma][String(l.n)].aureo) || '',
    pratica: (previa[turma] && previa[turma][String(l.n)] && previa[turma][String(l.n)].pratica) || '',
    tem_video: !!l.video, tem_slides: !!l.ppt,
    pontos: pontosDaLicao(turma, l.n),
  }));
}

const saida = path.join(RAIZ, 'public', 'ebd', 'catalogo.json');
fs.writeFileSync(saida, JSON.stringify(catalogo));

// ─── prova na tela: qual é a lição de hoje, pela conta de verdade ────────────
const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
const prox = new Date(hoje); if (hoje.getDay() !== 0) prox.setDate(hoje.getDate() + (7 - hoje.getDay()));
const atual = Math.max(1, Math.round((prox - INICIO) / (7 * 86400000)) + 1);

console.log(`📅 Catálogo da EBD gravado: ${saida}`);
console.log(`   início do trimestre: ${INICIO.toISOString().slice(0, 10)}`);
console.log(`   turmas: ${Object.keys(catalogo.turmas).length} · lições: ${Object.values(catalogo.turmas).reduce((a, b) => a + b.length, 0)}`);
console.log(`\n   👉 PRÓXIMO DOMINGO (${prox.toISOString().slice(0, 10)}) é a LIÇÃO ${atual}:`);
for (const [t, ls] of Object.entries(catalogo.turmas)) {
  const l = ls.find((x) => x.n === atual);
  if (l) console.log(`      ${t.padEnd(14)} ${l.titulo}`);
}
