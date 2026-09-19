/* ══════════════════════════════════════════════════════════════════════════════
   PROVA DO CONFERIDOR — a trava "não empurra besteira"

     node scripts/_provar-conferidor.mjs

   Roda o MESMO arquivo que vai pro navegador (public/assets/conferidor.js) contra
   a MESMA Bíblia do app (public/biblia.json), sem servidor e sem internet.

   O banco de casos não é inventado: as invenções aqui embaixo foram capturadas ao
   vivo na Sala do Concílio, em produção, e estão copiadas ao pé da letra. Os casos
   CERTOS existem pra provar a outra metade do trabalho — ALARME FALSO É TÃO RUIM
   QUANTO O ERRO. Se um acerto começar a acender aviso, o pastor para de confiar
   no aviso, e aí a trava não serve mais pra nada.

   Mexeu no conferidor? Rode isto ANTES de subir. Verde = pode ir.
   ══════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIBLIA = fs.readFileSync(path.join(RAIZ, 'public/biblia.json'), 'utf8');

// o conferidor é código de navegador: damos a ele um window, um document de mentira
// e um fetch que devolve a Bíblia do disco. Nada mais ele usa.
const janela = {};
const ctx = {
  window: janela,
  document: { getElementById: () => null, createElement: () => ({ style: {} }), head: { appendChild() {} } },
  fetch: async () => ({ text: async () => BIBLIA }),
  Promise, console, JSON,
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(RAIZ, 'public/assets/conferidor.js'), 'utf8'), ctx, { filename: 'conferidor.js' });
const C = janela.RadarConferidor;

const CASOS = [];
const erra = (nome, texto) => CASOS.push({ nome, texto, espera: 'ERRO' });
const acerta = (nome, texto) => CASOS.push({ nome, texto, espera: 'LIMPO' });

/* ─────────── AS DUAS INVENÇÕES QUE ESCAPARAM EM PRODUÇÃO ─────────── */

erra('PRODUÇÃO · Levítico 23:10-12 entre aspas com novilho e maná (não estão lá)',
`🔒 **OS DOIS PILARES**
- **Texto de saída (AT):** Levítico 23:10‑12 – “tomar o novilho … e o cordeiro … oferecer … e a porção de maná …”.
- **Texto de chegada (NT):** 1 Coríntios 15:20 – “Cristo ressuscitou dos mortos, tornando‑se as **primícias** dos que dormem”.`);

erra('PRODUÇÃO · Levítico 23:10-12 entre aspas com oferta movida sobre o altar',
`- Texto de saída (AT): Levítico 23:10‑12 – “tomar a primeira porção do maná … e oferecê‑la ao Senhor, como oferta movida, sobre o altar do Senhor”.`);

erra('PRODUÇÃO · ἐποίησεν apresentado como o texto de saída do AT em Gênesis 1:1',
`🔒 OS DOIS PILARES
- **Texto de saída (AT):** Gênesis 1:1 – ἐποίησεν
A palavra que trava os dois é **ποιέω**.`);

erra('RELATADO · "criou", em Gênesis 1:1, seria o grego ποιεῖν',
`A palavra "criou", em Gênesis 1:1, é o grego ποιεῖν, que significa fazer a partir de algo já existente.`);

erra('RELATADO · o mesmo erro só em transliteração, sem alfabeto grego',
`Em Gênesis 1:1 o verbo usado no grego é poiein, que significa fabricar.`);

/* ─────────── OUTRAS PORTAS DA MESMA MENTIRA ─────────── */

erra('Hebraico colado num texto do Novo Testamento',
`Em Efésios 2:8 a palavra do original é חֶסֶד (chesed), que quer dizer graça.`);

erra('Referência que simplesmente não existe',
`Como está escrito em Gênesis 99:1, Deus é fiel.`);

/* ─────────── OS CERTOS: AQUI A TRAVA TEM QUE FICAR CALADA ─────────── */

acerta('CERTO · bará em hebraico, ligado a Gênesis 1:1 (resposta boa de produção)',
`⛏️ O GATILHO — O verbo que aparece em Gênesis 1:1 é *bará* (בָּרָא). Ele está escrito literalmente no texto: “בְּרֵאשִׁית בָּרָא אֱלֹהִים…” – “No princípio criou Deus…”.

🔒 OS DOIS PILARES — Texto de saída (AT): Gênesis 1:1 – *bará* (criar do nada). Texto de chegada (NT): João 1:3 – “Todas as coisas foram feitas por ele, e sem ele nada do que foi feito se fez”.`);

acerta('CERTO · grego legítimo ligado a textos do Novo Testamento',
`Em João 1:1 lemos o termo grego λόγος (logos), o Verbo eterno. E Filipenses 2:7 traz ἐκένωσεν, "esvaziou-se a si mesmo". A palavra grega ἀγάπη aparece em 1 Coríntios 13:4.`);

acerta('CERTO · citação exata entre aspas, nas duas ordens (aspas→ref e ref→aspas)',
`Está escrito: "No princípio criou Deus os céus e a terra." (Gênesis 1:1)

E Romanos 8:1 diz: "Portanto, agora nenhuma condenação há para os que estão em Cristo Jesus".`);

acerta('CERTO · Septuaginta: grego no Antigo Testamento é correto',
`⛏️ O GATILHO — Gênesis 1:1 traz o verbo hebraico **בָּרָא** (*bara*), "criar". Na tradução grega da Septuaginta (LXX) o termo aparece como **ἐποίησεν** (*epoiesen*), forma de *ποιέω*.`);

acerta('CERTO · aramaico de Jesus no Novo Testamento',
`Em Marcos 5:41 Jesus diz "Talitá cumi", expressão aramaica que Marcos traduz. Em Mateus 27:46 o grito é אֵלִי אֵלִי, "Eli, Eli, lemá sabactâni?".`);

acerta('CERTO · Novo Testamento citando o Antigo, com o hebraico por trás',
`Hebreus 4:9 fala do descanso, citando o Salmo 95. Por trás está o hebraico שַׁבָּת (shabbat), o sábado da criação.`);

acerta('CERTO · hebraico legítimo em textos do Antigo Testamento',
`Em Isaías 7:14 aparece עַלְמָה (almah), "virgem". Já em Salmos 23:1 o nome é יְהוָה (YHWH). O termo hebraico chesed domina Oseias 6:6.`);

acerta('CERTO · a frase nomeia os DOIS idiomas — está comparando, não errando',
`A palavra que trava os dois é "primícia" (do hebraico *reishit* e do grego *proto-genē*).`);

acerta('CERTO · resposta sem referência bíblica nenhuma',
`Irmão, a fé vem pelo ouvir, e o ouvir pela palavra de Deus. Ore antes de pregar.`);

acerta('CERTO · citação curta demais pra julgar (João 6:35, outra tradução)',
`Jesus afirma em João 6:35: "Eu sou o pão vivo".`);

/* ─────────── RODA ─────────── */
let falhas = 0;
for (const c of CASOS) {
  const L = await C.analisar(c.texto);
  const acendeu = !!(L && (L.erros.length || L.inexistentes.length || L.idioma.length));
  const passou = c.espera === 'ERRO' ? acendeu : !acendeu && !L.duvidas.length;
  if (!passou) falhas++;
  console.log((passou ? '  ok  ' : ' FALHA') + ' │ ' + (acendeu ? 'avisou ' : 'calado ') + '│ ' + c.nome);
  if (L) {
    for (const a of L.idioma) console.log('         ↳ idioma: "' + a.amostra + '" (' + a.idioma + ') ligado a ' + a.refs);
    for (const a of L.erros) console.log('         ↳ aspas : ' + a.rot + ' — ' + (a.tipo === 'nao-existe' ? 'não existe' : Math.round(a.o * 100) + '% das palavras batem'));
    for (const a of L.duvidas) console.log('         ↳ dúvida: ' + a.rot + ' — ' + Math.round(a.o * 100) + '% (parafraseado)');
    for (const a of L.inexistentes) console.log('         ↳ inexistente: ' + a);
  }
}
console.log('\n' + (CASOS.length - falhas) + '/' + CASOS.length + ' passaram · ' + falhas + ' falha(s)');
process.exit(falhas ? 1 : 0);
