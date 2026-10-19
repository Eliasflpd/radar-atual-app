// O PACOTE DA EBD PARA O GLOBO DE VOZ (19/10/2026, pedido do Elias: "o globo deve ter TODO o conteúdo da
// lição adulto e jovem — qual é a lição do próximo domingo, o texto áureo, me explique o primeiro tópico,
// agora o segundo —, o livro de apoio, a revista Cristão Alerta e tudo sobre o autor").
//
// Lê as páginas que o app JÁ publica (public/ebd/<turma>/html/*.html|md) e grava um JSON por lição em
// public/ebd/<turma>/voz/NN.json, já separado em partes (áureo, leitura, introdução, tópicos I/II/III com
// os subtópicos, conclusão, revisão, professor, Cristão Alerta, livro de apoio, devocional). A ferramenta
// licao_da_ebd (api/_lib/voz-ferramentas.js) busca só a parte pedida. Nada novo fica público: é o mesmo
// conteúdo das páginas, só organizado.
//
// Uso: node scripts/ebd-voz-pacote.mjs            (refaz adulto4 e jovem4)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EBD = path.join(RAIZ, 'public', 'ebd');
const TURMAS = ['adulto4', 'jovem4'];

const ent = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&[a-z]+;/g, '');
const texto = (h) => ent(String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
  .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
const corpo = (h) => h.replace(/[\s\S]*<body[^>]*>/i, '').replace(/<\/body>[\s\S]*/i, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
const ler = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');

function licao(html) {
  const b = corpo(html);
  const L = { titulo: '', data: '', aureo: '', verdade_pratica: '', leitura: { referencia: '', versiculos: [] },
    introducao: '', topicos: [], conclusao: '', revisao: [] };
  const m = (re) => (b.match(re) || [])[1] || '';
  L.titulo = texto(m(/<p class="titulo">([\s\S]*?)<\/p>/)).replace(/^LIÇÃO\s*\d+\s*-\s*/i, '');
  L.data = texto(m(/<p class="data">([\s\S]*?)<\/p>/));
  L.aureo = texto(m(/<div class="box-aureo">([\s\S]*?)<\/div>/)).replace(/^(Texto Áureo|Texto Principal)\s*/i, '');
  L.verdade_pratica = texto(m(/<div class="box-pratica">([\s\S]*?)<\/div>/)).replace(/^(Verdade Prática|Resumo da Lição)\s*/i, '');
  L.leitura.referencia = texto(m(/<p class="bible-ref">([\s\S]*?)<\/p>/));
  for (const v of b.matchAll(/<p class="verso">([\s\S]*?)<\/p>/g)) {
    const n = texto((v[1].match(/<span class="verso-num">([\s\S]*?)<\/span>/) || [])[1]);
    L.leitura.versiculos.push((n ? n + ' ' : '') + texto(v[1].replace(/<span class="verso-num">[\s\S]*?<\/span>/, '')));
  }
  // Depois da leitura, percorre os blocos em ordem.
  const resto = b.slice(Math.max(0, b.search(/<p class="sec-head">/)));
  let sec = '', top = null;
  for (const blk of resto.matchAll(/<(p|li)(?: class="([^"]*)")?>([\s\S]*?)<\/\1>/g)) {
    const [, tag, cls = '', inner] = blk;
    const t = texto(inner);
    if (!t) continue;
    if (cls.includes('sec-head')) { sec = t.toUpperCase(); top = null; continue; }
    if (cls.includes('roman-head')) { top = { titulo: t, subtopicos: [] }; L.topicos.push(top); continue; }
    if (cls.includes('subpoint') && top) {
      const tit = texto((inner.match(/<strong>([\s\S]*?)<\/strong>/) || [])[1]);
      top.subtopicos.push({ titulo: tit, texto: t.slice(tit.length).trim() });
      continue;
    }
    if (tag === 'li' && /REVIS/.test(sec)) { L.revisao.push(t); continue; }
    if (/CONCLUS/.test(sec)) { L.conclusao += (L.conclusao ? '\n' : '') + t; continue; }
    if (!top && (/COMENT|INTRODU/.test(sec) || !sec)) { L.introducao += (L.introducao ? '\n' : '') + t.replace(/^Introdução\s*/i, ''); continue; }
    if (top) { // parágrafo solto dentro de um tópico (sem subtópico numerado)
      top.subtopicos.push({ titulo: '', texto: t });
    }
  }
  return L;
}

for (const turma of TURMAS) {
  const dir = path.join(EBD, turma, 'html');
  const out = path.join(EBD, turma, 'voz');
  fs.mkdirSync(out, { recursive: true });
  let n = 0;
  for (let i = 1; i <= 13; i++) {
    const nn = String(i).padStart(2, '0');
    const h = ler(path.join(dir, `licao-${nn}.html`));
    if (!h) continue;
    const L = { turma, n: i, ...licao(h) };
    const prof = ler(path.join(dir, `professor-${nn}.html`));
    const alerta = ler(path.join(dir, `subsidio-${nn}.html`));
    const devoc = ler(path.join(dir, `devocional-${nn}.html`));
    const apoioMd = ler(path.join(dir, `apoio-${nn}.md`));
    if (prof) L.professor = texto(corpo(prof).replace(/<\/(p|li|h\d|div)>/g, '\n'));
    if (alerta) L.cristao_alerta = texto(corpo(alerta).replace(/<\/(p|li|h\d|div)>/g, '\n'));
    if (devoc) L.devocional = texto(corpo(devoc).replace(/<\/(p|li|h\d|div)>/g, '\n'));
    // O livro de apoio vem de PDF: junta as linhas quebradas em parágrafos.
    if (apoioMd) L.livro_de_apoio = apoioMd.replace(/\r/g, '').replace(/([^\n.!?:”"])\n(?=[a-zà-ú(])/g, '$1 ').replace(/\n{3,}/g, '\n\n').trim();
    fs.writeFileSync(path.join(out, `${nn}.json`), JSON.stringify(L));
    n++;
    if (i === 4) console.log(`  ${turma} 04: "${L.titulo}" · ${L.topicos.length} tópicos (${L.topicos.map((t) => t.subtopicos.length).join('/')}) · `
      + `intro ${L.introducao.length} · concl ${L.conclusao.length} · prof ${(L.professor || '').length} · alerta ${(L.cristao_alerta || '').length} · apoio ${(L.livro_de_apoio || '').length} · devoc ${(L.devocional || '').length}`);
  }
  console.log(`✔ ${turma}: ${n} lições em ${path.relative(RAIZ, out)}`);
}
