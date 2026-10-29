#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════════
   INDEXADOR DA BIBLIOTECA — o motor invisível do globo de voz.

     node scripts/indexar-biblioteca.mjs                 (tudo da fase 1)
     node scripts/indexar-biblioteca.mjs champlin kittel (só essas fontes)
     node scripts/indexar-biblioteca.mjs --subir         (só empurra o cache pro Postgres)
     node scripts/indexar-biblioteca.mjs --listar        (mostra as fontes e o tamanho)

   ⚖️ A LINHA QUE NÃO SE CRUZA — leia antes de mexer em qualquer coisa aqui.
   Estes livros são COMPRADOS pelo Elias. Ler, pesquisar e citar a fonte é legítimo;
   DISTRIBUIR não é. Por isso, tecnicamente:
     • o texto NUNCA entra no repositório (o repo do RADAR é público);
     • o texto NUNCA vai pro celular — nem como "trecho de resposta";
     • o texto mora no Postgres do Elias e só é lido DENTRO do servidor;
     • o que sai do servidor é a resposta ORIGINAL do modelo, com o NOME da obra.
   É a mesma norma que já valia pro Kittel ("motor invisível, nunca vira tela"),
   agora valendo pra biblioteca inteira.
   Por isso o cache local fica FORA do repositório, em D:\RADAR-BIBLIOTECA\.

   ONDE O MODELO EMBUTE: Cloudflare Workers AI, @cf/baai/bge-m3, 1024 dimensões.
   Escolhido porque é grátis com folga pro volume (são dezenas de milhares de
   trechos), aguenta trecho longo (8192 tokens de contexto, contra 2048 do
   EmbeddingGemma que indexa a Bíblia e as mensagens) e fala português bem.
   O Voyage está FORA de propósito: outro serviço está trocando o modelo dele.
   O Cohere também: a chave de teste é 1.000 chamadas por MÊS, não dá nem pro começo.

   GUARDA O CAMINHO: grava checkpoint por fonte. Cai a luz, roda de novo, continua.
   ══════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// FORA do repositório, de propósito. Se um dia alguém mudar isto pra dentro de
// public/ ou do repo, está distribuindo obra com dono — e é processo, não bug.
const CACHE = process.env.BIBLIOTECA_CACHE || 'D:\\RADAR-BIBLIOTECA';

const MODELO = '@cf/baai/bge-m3';
const DIMS = 1024;
const LOTE = 24;              // bge-m3 é pesado; 24 por chamada passa com folga
const LANES = 3;              // três chamadas ao mesmo tempo

// ═══ AS FONTES, EM ORDEM DE AUTORIDADE ═══════════════════════════════════════
//
// A ORDEM DESTA LISTA É A ORDEM DE QUEM MANDA, e ela vai junto pro banco no campo
// `peso`. Não é capricho de organização: é o que o globo usa pra saber em quem
// acreditar quando duas fontes discordam.
//
//   1º  a Bíblia (biblia.json) — não está aqui porque não é biblioteca; é a
//       última palavra, sempre, e o globo lê ela por outra ferramenta.
//   2º  OWENS e KITTEL — os que dizem QUAL É A PALAVRA. Owens dá o hebraico do
//       Antigo, palavra por palavra, com análise gramatical; Kittel dá o grego do
//       Novo. Estes dois são a TRAVA ANTI-INVENÇÃO: com eles na mão, o globo não
//       precisa "lembrar" uma raiz — ele consulta.
//   3º  os autores APROVADOS pelo Concílio (aprovado: true).
//   4º  CHAMPLIN — REPROVADO no Concílio (aprovado: false). Fica na biblioteca
//       porque em grego, crítica textual e estudo de palavra ele é forte e
//       ninguém joga isso fora. Mas NUNCA é voz em interpretação disputada e
//       NUNCA é palavra final. O campo `aprovado` é o que carrega esse aviso até
//       dentro do prompt — ver api/_lib/biblioteca.js.
const LOGOS = 'D:\\RADAR ATUAL\\BIBLIOTECA LOGOS\\REFERENCIA';
const AUT = (n) => path.join(LOGOS, 'AUTORES', n);

const FONTES = [
  // ── 2º escalão: quem diz qual é a palavra ──────────────────────────────────
  { id: 'owens',    autor: 'John Joseph Owens (Analytical Key)', peso: 2, aprovado: true,
    obra: 'Analytical Key to the Old Testament — hebraico do AT palavra por palavra, com análise gramatical',
    dir: 'D:\\RADAR\\COMENTARIOS-PENTECOSTAIS\\BAIXADOS DA LOGOS', tipo: 'hebraico', formato: 'docx' },
  // 25/10/2026: a pasta antiga (D:\PR RAPHAEL\KITTEL-PT\verbetes) sumiu e o banco estava SEM Kittel. Agora vem do KITTEL.docx
  // do Elias (Kittel condensado por Bromiley, ed. Cultura Cristã), convertido por D:\LIVROS-MOTOR\converter-kittel.py:
  // um "## termo — sentido" por verbete (1.033), e a seção citada é o próprio verbete.
  { id: 'kittel',   autor: 'Kittel (TDNT)', peso: 2, aprovado: true,
    obra: 'Dicionário Teológico do Novo Testamento (Kittel, condensado por Bromiley), verbetes em português',
    dir: 'D:\\LIVROS-MOTOR\\kittel', tipo: 'verbete', semCapa: true, capitulos: true },
  // Thayer (1889, domínio público): léxico grego do NT, MESMA chave de Strong do Kittel (G0026.md = G26), então os dois
  // se cruzam. Tradução PT feita por IA em 10/10/2026, sem revisão humana (o aviso vai no cabeçalho de cada verbete).
  // Mesmo escalão do Kittel (diz QUAL é a palavra). Se o Concílio quiser tratá-lo com a cautela do Champlin até revisar,
  // troque `aprovado: true` por `aprovado: false`. Para entrar no banco: rodar este script (precisa do acesso ao Radar DB).
  { id: 'thayer',   autor: 'Thayer (Léxico Grego do NT)', peso: 2, aprovado: true,
    obra: 'Léxico Grego-Inglês do Novo Testamento (Thayer), verbetes em português',
    dir: 'D:\\PR RAPHAEL\\THAYER-PT\\verbetes', tipo: 'verbete' },

  // ── 3º escalão: os aprovados. Primeiro os que mais rendem por palavra
  //    (originais, exegese e a linha pentecostal, que é a alma do app). ───────
  { id: 'waltke',   autor: 'Bruce Waltke',   peso: 3, aprovado: true, obra: 'Bruce Waltke — comentários',            dir: AUT('Bruce-Waltke'),      tipo: 'comentario' },
  { id: 'kidner',   autor: 'Derek Kidner',   peso: 3, aprovado: true, obra: 'Derek Kidner — comentários',            dir: AUT('Derek-Kidner'),      tipo: 'comentario' },
  // Keil & Delitzsch (séc. XIX, domínio público no original). Tradução PT feita por IA no Tradutor Fiel (out/2026), sem revisão
  // humana; cerca de 4% dos trechos ainda estão em inglês (blocos que o tradutor deixou pendentes) e falta Isaías.
  // Os .md vêm de D:\KEIL\converter_todos.py (EPUB -> um .md por livro, com "## Livro N" por capítulo e "### Livro N:v" por seção).
  // semCapa: não corta as primeiras 2500 letras (não tem capa de livro escaneado; é a introdução do livro).
  // capitulos: a `secao` de cada trecho vira o capítulo/versículo em que ele está (o globo cita "Keil & Delitzsch, Josué 5").
  { id: 'keil',     autor: 'Keil & Delitzsch', peso: 3, aprovado: true,
    obra: 'C. F. Keil & Franz Delitzsch — Comentário sobre o Antigo Testamento (tradução por IA)',
    dir: 'D:\\PR RAPHAEL\\KEIL-PT\\comentario', tipo: 'comentario', semCapa: true, capitulos: true },
  // Duewel — Fogo do Avivamento (Hagnos, 2015; COM direitos autorais): motor invisível, texto só no Postgres, nunca no repo
  // nem em página. O .md é o PDF do Elias convertido (D:\DUEWEL\), guardado FORA do repositório em D:\LIVROS-MOTOR\duewel.
  // Livros novos do Elias entram assim: uma pasta em D:\LIVROS-MOTOR\<autor> com .md ("## Capítulo" por capítulo) + uma linha aqui.
  { id: 'duewel',   autor: 'Wesley L. Duewel', peso: 3, aprovado: true,
    obra: 'Wesley L. Duewel — Fogo do Avivamento (história dos avivamentos e sua aplicação)',
    dir: 'D:\\LIVROS-MOTOR\\duewel', tipo: 'comentario', semCapa: true, capitulos: true },
  // Edersheim — A Vida e os Tempos de Jesus, o Messias (1883/1886; o original é domínio público, a tradução PT do PDF do
  // Elias não). Motor invisível, como o Duewel. O .md sai de D:\LIVROS-MOTOR\converter-edersheim.py, cortado pelos 107
  // marcadores do PDF: a seção citada fica "Livro III, cap. XIV — ...".
  { id: 'edersheim', autor: 'Alfred Edersheim', peso: 3, aprovado: true,
    obra: 'Alfred Edersheim — A Vida e os Tempos de Jesus, o Messias',
    dir: 'D:\\LIVROS-MOTOR\\edersheim', tipo: 'comentario', semCapa: true, capitulos: true },
  // Moldenke — Plantas da Bíblia (1952) e Wood — Animais da Bíblia (1869), da coleção Cultura Bíblica do Elias. Motor
  // invisível. Os .md saem de D:\LIVROS-MOTOR\converter-plantas-animais.py (cada planta/animal vira "## Nome"; o Moldenke
  // comenta várias espécies juntas, então o título junta os nomes com " · "; o PDF traduzido por máquina trazia
  // "madeira de merda" no lugar de "madeira de sitim", corrigido lá).
  { id: 'moldenke', autor: 'Harold N. Moldenke & Alma L. Moldenke', peso: 3, aprovado: true,
    obra: 'Harold N. e Alma L. Moldenke — Plantas da Bíblia',
    dir: 'D:\\LIVROS-MOTOR\\moldenke', tipo: 'comentario', semCapa: true, capitulos: true },
  { id: 'wood', autor: 'J. G. Wood', peso: 3, aprovado: true,
    obra: 'J. G. Wood — Animais da Bíblia',
    dir: 'D:\\LIVROS-MOTOR\\wood', tipo: 'comentario', semCapa: true, capitulos: true },
  { id: 'motyer',   autor: 'Alec Motyer',    peso: 3, aprovado: true, obra: 'Alec Motyer — comentários',             dir: AUT('Alec-Motyer'),       tipo: 'comentario' },
  { id: 'horton',   autor: 'Stanley Horton', peso: 3, aprovado: true, obra: 'Stanley Horton — obras',                dir: AUT('Stanley-Horton'),    tipo: 'comentario' },
  { id: 'stronstad', autor: 'Roger Stronstad', peso: 3, aprovado: true, obra: 'Roger Stronstad — obras',             dir: AUT('Roger-Stronstad'),   tipo: 'comentario' },
  { id: 'arrington', autor: 'French Arrington', peso: 3, aprovado: true, obra: 'French Arrington — obras',           dir: AUT('French-Arrington'),  tipo: 'comentario' },
  { id: 'fee',      autor: 'Gordon Fee',     peso: 3, aprovado: true, obra: 'Gordon Fee — comentários',              dir: AUT('Gordon-Fee'),        tipo: 'comentario' },
  { id: 'keener',   autor: 'Craig Keener',   peso: 3, aprovado: true, obra: 'Craig Keener — comentários',            dir: AUT('Craig-Keener'),      tipo: 'comentario' },
  { id: 'gilberto', autor: 'Antônio Gilberto', peso: 3, aprovado: true, obra: 'Antônio Gilberto — obras',            dir: AUT('Antonio-Gilberto'),  tipo: 'comentario' },
  { id: 'cabral',   autor: 'Elienai Cabral', peso: 3, aprovado: true, obra: 'Elienai Cabral — obras',                dir: AUT('Elienai-Cabral'),    tipo: 'comentario' },
  { id: 'severino', autor: 'Severino Pedro', peso: 3, aprovado: true, obra: 'Severino Pedro — obras',                dir: AUT('Severino-Pedro'),    tipo: 'comentario' },
  { id: 'pearlman', autor: 'Myer Pearlman',  peso: 3, aprovado: true, obra: 'Myer Pearlman — obras',                 dir: AUT('Myer-Pearlman'),     tipo: 'comentario' },
  { id: 'moo',      autor: 'Douglas Moo',    peso: 3, aprovado: true, obra: 'Douglas Moo — comentários',             dir: AUT('Douglas-Moo'),       tipo: 'comentario' },
  { id: 'morris',   autor: 'Leon Morris',    peso: 3, aprovado: true, obra: 'Leon Morris — comentários',             dir: AUT('Leon-Morris'),       tipo: 'comentario' },
  { id: 'beale',    autor: 'G.K. Beale',     peso: 3, aprovado: true, obra: 'G.K. Beale — comentários',              dir: AUT('GK-Beale'),          tipo: 'comentario' },
  { id: 'ffbruce',  autor: 'F.F. Bruce',     peso: 3, aprovado: true, obra: 'F.F. Bruce — comentários',              dir: AUT('FF-Bruce'),          tipo: 'comentario' },
  { id: 'carson',   autor: 'D.A. Carson',    peso: 3, aprovado: true, obra: 'D.A. Carson — obras',                   dir: AUT('DA-Carson'),         tipo: 'comentario' },
  { id: 'hendriksen', autor: 'William Hendriksen', peso: 3, aprovado: true, obra: 'William Hendriksen — comentários', dir: AUT('William-Hendriksen'), tipo: 'comentario' },
  { id: 'stott',    autor: 'John Stott',     peso: 3, aprovado: true, obra: 'John Stott — obras',                    dir: AUT('John-Stott'),        tipo: 'comentario' },
  { id: 'ryle',     autor: 'J.C. Ryle',      peso: 3, aprovado: true, obra: 'J.C. Ryle — obras',                     dir: AUT('JC-Ryle'),           tipo: 'comentario' },
  { id: 'sproul',   autor: 'R.C. Sproul',    peso: 3, aprovado: true, obra: 'R.C. Sproul — obras',                   dir: AUT('RC-Sproul'),         tipo: 'comentario' },
  { id: 'wiersbe',  autor: 'Warren Wiersbe', peso: 3, aprovado: true, obra: 'Warren Wiersbe — comentários',          dir: AUT('Warren-Wiersbe'),    tipo: 'comentario' },
  { id: 'gill',     autor: 'John Gill',      peso: 3, aprovado: true, obra: 'John Gill — comentários',               dir: AUT('John-Gill'),         tipo: 'comentario' },
  { id: 'owen',     autor: 'John Owen',      peso: 3, aprovado: true, obra: 'John Owen — obras',                     dir: AUT('John-Owen'),         tipo: 'comentario' },
  { id: 'macarthur', autor: 'John MacArthur', peso: 3, aprovado: true, obra: 'John MacArthur — obras',               dir: AUT('John-MacArthur'),    tipo: 'comentario' },
  { id: 'henry',    autor: 'Matthew Henry',  peso: 3, aprovado: true, obra: 'Matthew Henry — comentário bíblico',    dir: AUT('Matthew-Henry'),     tipo: 'comentario' },
  { id: 'calvino',  autor: 'João Calvino',   peso: 3, aprovado: true, obra: 'João Calvino — obras',                  dir: AUT('Joao-Calvino'),      tipo: 'comentario' },
  { id: 'lutero',   autor: 'Martinho Lutero', peso: 3, aprovado: true, obra: 'Martinho Lutero — obras',              dir: AUT('Martinho-Lutero'),   tipo: 'comentario' },
  { id: 'edwards',  autor: 'Jonathan Edwards', peso: 3, aprovado: true, obra: 'Jonathan Edwards — obras',            dir: AUT('Jonathan-Edwards'),  tipo: 'comentario' },
  { id: 'lloydjones', autor: 'Martyn Lloyd-Jones', peso: 3, aprovado: true, obra: 'Martyn Lloyd-Jones — obras',      dir: AUT('Martyn-Lloyd-Jones'), tipo: 'comentario' },
  { id: 'spurgeon', autor: 'Charles Spurgeon', peso: 3, aprovado: true, obra: 'Charles Spurgeon — sermões e obras',  dir: AUT('Charles-Spurgeon'),  tipo: 'comentario' },

  // As pregações do Pr. Sadrak são FALA, não livro. Entram por outro motivo: é
  // daqui que sai o jeito de DIZER, o calor do púlpito — não a erudição.
  { id: 'sadrak',   autor: 'Pr. Sadrak Lufuankenda', peso: 3, aprovado: true,
    obra: 'pregações transcritas do Pr. Sadrak', dir: 'D:\\PREGACOES\\transcricoes', tipo: 'pregacao' },

  // Augusto Cury — VOZ COMPLEMENTAR, não autoridade doutrinária (pedido do
  // Elias, 24/09/2026). É escritor e psiquiatra, não exegeta da linha da AD. A
  // "Análise da Inteligência de Cristo" é leitura inspiradora sobre a mente e o
  // caráter de Jesus — entra com filtro (aprovado:false), citada pelo NOME, e o
  // globo marca como o olhar DELE, nunca como doutrina fechada. Livros comprados
  // pelo Elias: motor invisível, texto só no Postgres, nunca no repo nem na tela.
  { id: 'cury', autor: 'Augusto Cury', peso: 4, aprovado: false,
    obra: 'Augusto Cury — Análise da Inteligência de Cristo (coleção)',
    dir: AUT('Augusto-Cury'), tipo: 'comentario' },

  // ── 4º escalão: REPROVADO no Concílio, entra com filtro ────────────────────
  { id: 'champlin', autor: 'Champlin', peso: 4, aprovado: false,
    obra: 'Champlin — O Antigo/Novo Testamento Interpretado, versículo por versículo',
    dir: AUT('Champlin'), tipo: 'comentario' },
];

// ═══ A PASTA DE ALIMENTAÇÃO (18/10/2026) ═════════════════════════════════════
// Livro novo do Elias entra SEM mexer neste arquivo: uma pasta em D:\RADAR-ALIMENTAR\<nome> com os
// .pdf/.docx/.txt/.md (ou um fonte.json apontando "origem" para onde eles já estão). Toda noite
// scripts/alimentar-biblioteca.mjs converte para texto em <nome>\_texto, escreve a lista em
// D:\RADAR-ALIMENTAR\_fontes.json e chama este indexador só com essas fontes. Fica FORA do
// repositório de propósito (livro comprado = motor invisível, nunca no repo nem em página).
const ALIMENTAR = process.env.RADAR_ALIMENTAR || 'D:\\RADAR-ALIMENTAR';
try {
  const lista = JSON.parse(fs.readFileSync(path.join(ALIMENTAR, '_fontes.json'), 'utf8'));
  for (const f of lista) if (f && f.id && f.dir && !FONTES.some((x) => x.id === f.id)) FONTES.push(f);
} catch (_) { /* sem pasta de alimentação: só as fontes fixas */ }

// ═══ AS CONTAS DO CLOUDFLARE, EM RODIZIO ═════════════════════════════════════
// Cada conta da 10.000 neurons POR DIA, de graca. Uma conta sozinha nao aguenta a
// biblioteca inteira — bati nesse teto hoje, ao vivo:
//   "you have used up your daily free allocation of 10,000 neurons"
// Por isso sao TRES contas, e cada uma tem o SEU proprio Account ID: token de uma
// conta em cima do ID de outra responde 401 "Authentication error", que parece
// token errado mas e so o par trocado. Custou tempo descobrir; fica escrito.
//
// Quando uma conta estoura a cota do dia (429 com "daily free allocation"), o
// embutidor marca ela como dormindo e segue na proxima, SEM perder o lote. Se
// todas dormirem, ele para e diz onde parou — o cache guarda o caminho.

// Pares (conta, token). Vem do ambiente quando só tem uma; do cofre quando é rodízio.
function contasDoCofre() {
  const texto = (() => {
    // APIS_COFRE aponta o cofre quando ele não está no lugar de sempre (hoje a cópia fica em D:\BACKUP\APIS-CLAUDE).
    for (const c of [process.env.APIS_COFRE, 'D:/APIS-CLAUDE/CHAVES.md', 'D:\\APIS-CLAUDE\\CHAVES.md', 'D:/BACKUP/APIS-CLAUDE/CHAVES.md'].filter(Boolean)) {
      try { return fs.readFileSync(c, 'utf8'); } catch { /* segue */ }
    }
    return '';
  })();
  const fora = [];
  // As contas 2 e 3 vêm em seções próprias, com ID e token coladinhos.
  for (const m of texto.matchAll(/Account ID\s*=\s*`?([0-9a-f]{32})`?[\s\S]{0,200}?API Token\s*=\s*`?(cfut_[A-Za-z0-9]+)`?/gi)) {
    fora.push({ conta: m[1], token: m[2] });
  }
  // A 1ª conta é diferente: o ID mora num bloco e o token aparece solto, longe dele.
  const idTopo = (texto.match(/Account ID\s*=\s*`?([0-9a-f]{32})`?/i) || [])[1];
  const tokens = texto.match(/\bcfut_[A-Za-z0-9]{30,}/g) || [];
  if (idTopo && tokens[0] && !fora.some((x) => x.token === tokens[0])) {
    fora.unshift({ conta: idTopo, token: tokens[0] });
  }
  return fora;
}

const CONTAS = (process.env.CF_ACCOUNT_ID && process.env.CF_AI_TOKEN)
  ? [{ conta: process.env.CF_ACCOUNT_ID, token: process.env.CF_AI_TOKEN }]
  : contasDoCofre();
const dormindo = new Set();

// ─── limpeza: tirar o lixo de OCR e a ficha catalográfica ────────────────────
// Livro digitalizado vem com capa, CIP, endereço da editora, número de página
// solto e cabeçalho repetido. Isso não é conteúdo — e, pior, atrapalha a busca:
// "São Paulo" e "ISBN" viram vizinhos de qualquer pergunta.
const LIXO = [
  /^\s*p[áa]gina\s+\d+\s*$/i, /^\s*\d{1,4}\s*$/, /^\s*[-–—_=.·•\s]{3,}\s*$/,
  /www\.[a-z0-9.-]+\.(com|br)/i, /\bISBN\b/i, /\bCDD-?\d/i, /Todos os direitos/i,
  /Editora\s+\w+\s+Ltda/i, /^\s*(TEL|CEP|Av\.|Rua)\b/i, /Dados Internacionais de Cataloga/i,
  /Impress[ãa]o e acabamento/i, /Diagrama[çc][ãa]o/i, /Coordenador de produ/i,
  /^\s*©/, /Used by permis/i,
];
const ehLixo = (l) => LIXO.some((r) => r.test(l));

// OCR de livro escaneado vem com byte zero no meio do texto. O Postgres RECUSA
// 0x00 em campo text ("invalid byte sequence for encoding UTF8") e derruba o
// INSERT inteiro — 200 trechos perdidos por causa de um byte. Tira na entrada.
const semNulo = (s) => (s == null ? '' : String(s)).split(String.fromCharCode(0)).join('');

function limpar(txt) {
  return semNulo(txt).split(/\r?\n/).filter((l) => !ehLixo(l)).join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── fatiar: parágrafos emendados até ~1600 caracteres, com beirada ──────────
// Beirada (overlap) existe porque a frase que responde costuma estar na emenda:
// o autor cita a palavra hebraica num parágrafo e explica no seguinte.
const ALVO = 1600, BEIRADA = 260, MINIMO = 260;

// Transcrição de pregação vem SEM linha em branco: o arquivo inteiro é um
// parágrafo só. Sem isto, a "fatia" vira o livro todo e o embutidor estoura
// (aconteceu: 237.936 tokens num lote de 24, e o teto do Cloudflare é 60.000).
// Então: parágrafo maior que o alvo é quebrado por FRASE antes de entrar na fila.
function porFrase(p) {
  if (p.length <= ALVO) return [p];
  const frases = p.split(/(?<=[.!?…])\s+/);
  const out = [];
  let buf = '';
  for (const fr of frases) {
    const pedaco = fr.length > ALVO ? fr.match(new RegExp('.{1,' + ALVO + '}', 'gs')) : [fr];
    for (const x of pedaco) {
      if (buf && buf.length + x.length + 1 > ALVO) { out.push(buf); buf = x; }
      else buf = buf ? buf + ' ' + x : x;
    }
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function fatiar(texto) {
  const paras = texto.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 40)
    .flatMap(porFrase);
  const out = [];
  let buf = '';
  for (const p of paras) {
    if (buf && (buf.length + p.length + 2) > ALVO) {
      out.push(buf);
      buf = buf.slice(-BEIRADA) + '\n' + p;      // carrega a beirada pro próximo
    } else {
      buf = buf ? buf + '\n' + p : p;
    }
  }
  if (buf.trim().length >= MINIMO) out.push(buf);
  return out;
}

// ─── de que versículo esse trecho fala? (pra o globo poder citar direito) ────
// Champlin é versículo por versículo e marca a referência no corpo do texto.
// Capturar isso deixa a busca MUITO mais precisa: quem pergunta de Gênesis 28:12
// quer o trecho que fala de Gênesis 28:12, não o que fala de "escada" em geral.
const RE_VERS = /\b(\d{1,3})\s*[:.]\s*(\d{1,3})\b/g;
function pistaDeReferencia(trecho, livroDoArquivo) {
  RE_VERS.lastIndex = 0;
  const m = RE_VERS.exec(trecho);
  if (!m) return livroDoArquivo || '';
  return ((livroDoArquivo || '') + ' ' + m[1] + ':' + m[2]).trim();
}
// "1- GÊNESIS -  CHAMPLIN ANTIGO NOVA EDIÇÃO.md" -> "Gênesis"
function livroDoNome(arquivo, teto = 44) {
  let s = path.basename(arquivo, '.md');
  s = s.replace(/^\s*\d+\s*[-–—]\s*/, '');                    // tira "1 - "
  s = s.replace(/[-–—]\s*(CHAMPLIN|COMENT[ÁA]RIO)[\s\S]*$/i, '');
  s = s.replace(/\s{2,}/g, ' ').trim();
  if (!s) return '';
  return s.length > teto ? s.slice(0, teto) : s;
}

// ─── verbete de léxico: a palavra em letras LATINAS também ───────────────────
// O Thayer/Kittel guardam a palavra só em grego ("αγαπη"). Quem pergunta digita "ágape". Só por sentido o
// verbete certo quase nunca aparece (medido em 18/10/2026: "ágape" trazia o verbete de Ágabo). Então a `secao`
// do trecho passa a ser "G0026 · αγαπη · agape / agape": serve de pista pro embutidor E pra busca por palavra
// da rota (api/_lib/biblioteca.js), que casa o termo digitado com este campo. Variante 2 = grafias comuns
// em português (f no lugar de ph, u no lugar de y, t no lugar de th).
const GREGO = { α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'e', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n',
  ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'ph', χ: 'ch', ψ: 'ps', ω: 'o' };
function transliterarGrego(palavra) {
  let s = String(palavra || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  s = s.replace(/γγ/g, 'ng').replace(/γκ/g, 'nk').replace(/γξ/g, 'nx').replace(/γχ/g, 'nch')
    .replace(/(α|ε|η|ο)υ/g, (m, v) => GREGO[v] + 'u');
  return [...s].map((c) => GREGO[c] || (/[a-z0-9]/.test(c) ? c : '')).join('');
}
function secaoDoVerbete(texto, livro) {
  const m = String(texto || '').match(/^palavra:\s*(.+)$/m);
  if (!m) return '';
  const grego = m[1].trim();
  const a = transliterarGrego(grego);
  if (!a) return livro || '';
  const b = a.replace(/ph/g, 'f').replace(/y/g, 'u').replace(/th/g, 't');
  return `${livro} · ${grego} · ${a}${b !== a ? ' / ' + b : ''}`;
}

// ─── o embutidor ─────────────────────────────────────────────────────────────
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

// A COTA DO DIA ACABOU nesta conta? O Cloudflare diz com todas as letras.
// Reconhecer isso e o que separa "troca de conta e segue" de "o script morre".
const cotaEstourada = (t) => /daily free allocation|out of neurons|quota/i.test(t || '');

async function embutir(textos) {
  let ultimo = 'sem conta do Cloudflare configurada';
  for (let volta = 0; volta < 3; volta++) {
    for (const cc of CONTAS) {
      if (dormindo.has(cc.token)) continue;
      try {
        const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cc.conta}/ai/run/${MODELO}`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + cc.token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textos }),
        });
        if (r.ok) {
          const j = await r.json();
          const d = (j.result && (j.result.data || j.result.response)) || [];
          if (Array.isArray(d) && d.length === textos.length) return d;
          ultimo = 'resposta sem vetor';
        } else {
          const t = await r.text();
          ultimo = `conta ...${cc.conta.slice(-4)}: HTTP ${r.status} ${t.slice(0, 120)}`;
          if (cotaEstourada(t) || r.status === 401 || r.status === 403) {
            // cota do dia ou par (conta, token) trocado: insistir nao resolve.
            dormindo.add(cc.token);
            console.log(`\n      conta ...${cc.conta.slice(-4)} fora por hoje (${r.status}) — seguindo na proxima`);
            continue;
          }
        }
      } catch (e) { ultimo = String((e && e.message) || e); }
      await dorme(600 * (volta + 1));
    }
    if (dormindo.size >= CONTAS.length) break;
  }
  throw new Error(`o embutidor parou: ${ultimo}`);
}

// Guarda em int8: 1024 números viram 1024 bytes em vez de 4096. Como só interessa
// a ORDEM dos resultados, a perda é invisível — e o cache fica 4x menor.
function paraInt8(vetores) {
  let pico = 0;
  for (const v of vetores) for (const x of v) { const a = Math.abs(x); if (a > pico) pico = a; }
  const escala = 127 / (pico || 1);
  const buf = Buffer.alloc(vetores.length * DIMS);
  let i = 0;
  for (const v of vetores) for (let d = 0; d < DIMS; d++) buf[i++] = (Math.round(v[d] * escala) + 256) % 256;
  return { buf, escala: (pico || 1) / 127 };
}

// ═══ O OWENS — hebraico do Antigo Testamento, palavra por palavra ════════════
// Vem em .docx exportado do Logos. O formato é limpo e previsível:
//     "Genesis"   → nome do livro
//     "1:1"       → marcador de versículo
//     "בְּרֵאשִׁית prep.-n.f.s. cstr. (912; GK 5n) In beginning"   → uma linha por palavra
// Juntamos o versículo INTEIRO num trecho só: é assim que a pergunta "qual a
// palavra hebraica de Gênesis 28:12" cai exatamente no lugar certo.
//
// INCREMENTAL DE PROPÓSITO: o Elias vai exportando o resto aos poucos (hoje vai
// até Gênesis 9). Cada .docx novo que cair na pasta entra sozinho, e o que já
// estava indexado NÃO é refeito — o selo (nome+tamanho+data dos arquivos) é que
// manda. Sem isso, cada exportação nova custaria a biblioteca inteira de novo.
const LIVROS_EN = {
  Genesis: 'Gênesis', Exodus: 'Êxodo', Leviticus: 'Levítico', Numbers: 'Números',
  Deuteronomy: 'Deuteronômio', Joshua: 'Josué', Judges: 'Juízes', Ruth: 'Rute',
  Samuel: 'Samuel', Kings: 'Reis', Chronicles: 'Crônicas', Ezra: 'Esdras',
  Nehemiah: 'Neemias', Esther: 'Ester', Job: 'Jó', Psalm: 'Salmos', Psalms: 'Salmos',
  Proverbs: 'Provérbios', Ecclesiastes: 'Eclesiastes', Isaiah: 'Isaías',
  Jeremiah: 'Jeremias', Lamentations: 'Lamentações', Ezekiel: 'Ezequiel',
  Daniel: 'Daniel', Hosea: 'Oseias', Joel: 'Joel', Amos: 'Amós', Obadiah: 'Obadias',
  Jonah: 'Jonas', Micah: 'Miqueias', Nahum: 'Naum', Habakkuk: 'Habacuque',
  Zephaniah: 'Sofonias', Haggai: 'Ageu', Zechariah: 'Zacarias', Malachi: 'Malaquias',
};

// Lê um .docx sem biblioteca nenhuma: .docx é um zip com word/document.xml
// dentro. Como só precisamos do texto, e o Windows tem tar/unzip, descompactamos
// só esse arquivo num temporário. Uma dependência a menos pra envelhecer.
function paragrafosDoDocx(caminho) {
  try {
    const xml = lerDoZip(caminho, 'word/document.xml');
    if (!xml) return [];
    return [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)]
      .map((m) => [...m[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((x) => x[1]).join('')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'"))
      .filter((t) => t.trim());
  } catch (e) {
    console.log('   ⚠  nao consegui abrir ' + path.basename(caminho) + ': ' + String(e.message).slice(0, 70));
    return [];
  }
}

// Um leitor de ZIP em 25 linhas, sem dependencia nenhuma. Por que nao usar uma
// biblioteca (ou o tar do Windows): dependencia nova em projeto que roda na
// Vercel e no PC do Elias e um dia quebra; e o tar do Windows recusou o caminho
// com espaco no meio ("BAIXADOS DA LOGOS"). Aqui so precisamos de UM arquivo
// dentro do zip, e isso o proprio node ja sabe fazer com zlib.
function lerDoZip(arquivo, alvo) {
  const b = fs.readFileSync(arquivo);
  // o fim do diretorio central (EOCD) fica no rabo do arquivo
  let eocd = -1;
  for (let i = b.length - 22; i >= 0 && i > b.length - 66000; i--) {
    if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('nao parece um zip/docx');
  let p = b.readUInt32LE(eocd + 16);                 // offset do diretorio central
  const n = b.readUInt16LE(eocd + 10);               // quantas entradas
  for (let k = 0; k < n; k++) {
    if (b.readUInt32LE(p) !== 0x02014b50) break;
    const metodo = b.readUInt16LE(p + 10);
    const compr  = b.readUInt32LE(p + 20);
    const nomeN  = b.readUInt16LE(p + 28);
    const extraN = b.readUInt16LE(p + 30);
    const comN   = b.readUInt16LE(p + 32);
    const local  = b.readUInt32LE(p + 42);
    const nome   = b.slice(p + 46, p + 46 + nomeN).toString('utf8');
    if (nome === alvo) {
      // no cabecalho local os campos de nome/extra tem tamanho PROPRIO
      const lnN = b.readUInt16LE(local + 26), leN = b.readUInt16LE(local + 28);
      const ini = local + 30 + lnN + leN;
      const cru = b.slice(ini, ini + compr);
      return (metodo === 0 ? cru : zlib.inflateRawSync(cru)).toString('utf8');
    }
    p += 46 + nomeN + extraN + comN;
  }
  return null;
}

const TEM_HEBRAICO = /[֐-׿]/;

function pedacosOwens(f) {
  const pedacos = [];
  // UM VERSÍCULO SÓ ENTRA UMA VEZ. O Elias exporta do Logos aos poucos, e as
  // exportações SE SOBREPÕEM — isso não é acidente, é como a ferramenta dele
  // funciona. Medido em 21/09/2026, nos 11 arquivos da pasta:
  //   • "Analytical Key to the Old Testamen1.docx" traz Gênesis 1:1–9:9 DUAS
  //     vezes dentro do MESMO arquivo (430 versículos, 215 únicos) — e esses 215
  //     são idênticos, palavra por palavra, aos de "Analytical Key to the Old
  //     Testament.docx". Sem esta trava, Gênesis entraria TRÊS vezes no banco.
  //   • "1&2 SAMUEL.docx" começa com Rute 4:1–4:22, que já vem inteiro no
  //     "Ruth.docx" (esse a trava de livro já barrava, por vir sem cabeçalho).
  // Versículo repetido no banco não é só desperdício: a busca devolve o mesmo
  // trecho três vezes e empurra para fora as outras fontes que o globo ia citar.
  // Quem chega primeiro fica; a ordem dos arquivos é alfabética e estável.
  const vistos = new Set();
  let repetidos = 0;
  for (const arq of arquivosDocx(f)) {
    let livro = '', cap = 0, ver = 0, linhas = [];
    const fechar = () => {
      if (livro && cap && linhas.length) {
        const ref = `${livro} ${cap}:${ver}`;
        if (vistos.has(ref)) { repetidos++; linhas = []; return; }
        vistos.add(ref);
        pedacos.push({ autor: f.autor, obra: f.obra, livro, secao: ref, tipo: 'hebraico',
          texto: `${ref} — hebraico palavra por palavra (Owens, Analytical Key):\n` + linhas.join('\n') });
      }
      linhas = [];
    };
    for (const p of paragrafosDoDocx(arq)) {
      const t = p.trim();
      const mv = t.match(/^(\d{1,3})[:.](\d{1,3})$/);
      if (mv) { fechar(); cap = +mv[1]; ver = +mv[2]; continue; }
      const nome = t.replace(/^\s*([123])\s+/, '$1 ');
      if (!TEM_HEBRAICO.test(t) && LIVROS_EN[nome.replace(/^[123]\s+/, '')]) {
        // "1 Samuel" -> "1 Samuel"; "Genesis" -> "Gênesis"
        fechar();
        const n = nome.match(/^([123])\s+(\w+)$/);
        livro = n ? n[1] + ' ' + (LIVROS_EN[n[2]] || n[2]) : (LIVROS_EN[nome] || nome);
        cap = 0; ver = 0;
        continue;
      }
      if (TEM_HEBRAICO.test(t)) linhas.push(t);
    }
    fechar();
  }
  if (repetidos) console.log(`   ℹ  owens: ${repetidos} versículos repetidos entre os .docx — entraram uma vez só`);
  return pedacos;
}

// ─── o trabalho ──────────────────────────────────────────────────────────────
function arquivosDe(f) {
  if (!fs.existsSync(f.dir)) return [];
  return fs.readdirSync(f.dir)
    .filter((n) => n.toLowerCase().endsWith('.md'))
    .sort()
    .map((n) => path.join(f.dir, n));
}
function arquivosDocx(f) {
  if (!fs.existsSync(f.dir)) return [];
  return fs.readdirSync(f.dir)
    // "~$nome.docx" é o arquivo de trava do Word aberto, não é documento.
    .filter((n) => n.toLowerCase().endsWith('.docx') && !n.startsWith('~$'))
    .sort()
    .map((n) => path.join(f.dir, n));
}

// O SELO: nome + tamanho + data de cada arquivo da fonte. É o que responde
// "mudou alguma coisa desde a última vez?" sem ter que ler 100 MB de novo.
function seloDe(f) {
  const arqs = f.formato === 'docx' ? arquivosDocx(f) : arquivosDe(f);
  return arqs.map((a) => {
    const s = fs.statSync(a);
    return path.basename(a) + ':' + s.size + ':' + Math.round(s.mtimeMs);
  }).join('|');
}

function pedacosDe(f) {
  if (f.formato === 'docx') return pedacosOwens(f);
  const pedacos = [];
  for (const arq of arquivosDe(f)) {
    // Edição de jornal (tipo 'historico'): o nome inteiro É a citação ("Mensageiro da Paz nº 24 — dezembro de 1945 (2ª quinzena)").
    const livro = livroDoNome(arq, f.tipo === 'historico' ? 90 : 44);
    const texto = limpar(fs.readFileSync(arq, 'utf8'));
    // As primeiras ~2500 letras de livro escaneado são capa, ficha e dedicatória.
    const corpo = f.tipo === 'comentario' && !f.semCapa && texto.length > 20000 ? texto.slice(2500) : texto;
    if (f.capitulos) {
      // Comentário já dividido por capítulo ("## Livro N") e seção ("### Livro N:v"): a referência vem do próprio arquivo.
      for (const bloco of corpo.split(/\n(?=## )/)) {
        const cap = (bloco.match(/^## (.+)$/m) || [])[1] || livro;
        for (const t of fatiar(bloco)) {
          const sub = (t.match(/^### (.+)$/m) || [])[1];
          pedacos.push({ autor: f.autor, obra: f.obra, livro, secao: (sub || cap).trim(), tipo: f.tipo, texto: t });
        }
      }
      continue;
    }
    const secaoVerb = f.tipo === 'verbete' ? secaoDoVerbete(texto, livro) : '';
    for (const t of fatiar(corpo)) {
      pedacos.push({
        autor: f.autor,
        obra: f.obra,
        livro,
        secao: secaoVerb || (f.tipo === 'comentario' ? pistaDeReferencia(t, livro) : livro),
        tipo: f.tipo,
        texto: t,
      });
    }
  }
  return pedacos;
}

async function indexar(f) {
  fs.mkdirSync(CACHE, { recursive: true });
  const alvoIdx = path.join(CACHE, f.id + '.idx.json');
  const alvoVec = path.join(CACHE, f.id + '.vec.bin');
  const selo = seloDe(f);
  if (fs.existsSync(alvoIdx) && fs.existsSync(alvoVec) && !process.env.REFAZER) {
    const m = JSON.parse(fs.readFileSync(alvoIdx, 'utf8'));
    // Fonte que CRESCE (o Owens vai ganhando .docx novo) precisa perceber sozinha.
    // Selo igual = nada mudou, pula. Selo diferente = arquivo novo ou alterado.
    if (m.selo === selo || (!m.selo && !f.formato)) {
      console.log(`   ⏭  ${f.id}: já indexado (${m.total} trechos)`);
      return;
    }
    console.log(`   ♻  ${f.id}: o material mudou desde a última vez — refazendo`);
  }

  const pedacos = pedacosDe(f);
  if (!pedacos.length) { console.log(`   ⚠  ${f.id}: nada encontrado em ${f.dir}`); return; }
  console.log(`   ${f.id}: ${pedacos.length} trechos…`);

  // prefixo de documento: o bge-m3 não exige, mas dar o título ajuda o vizinho certo
  const textos = pedacos.map((p) => `${p.autor} — ${p.livro || p.obra}${p.secao ? ' (' + p.secao + ')' : ''}\n${p.texto}`);

  const vetores = new Array(pedacos.length);
  // REAPROVEITA o que não mudou (26/10/2026). Antes, cada aula nova do Dr. Wagner fazia refazer o vetor das 6.871
  // partes de todas as aulas: a cota grátis diária da Cloudflare acabava de madrugada e a voz amanhecia sem busca
  // por sentido. Agora o trecho idêntico ao do índice anterior (mesmo autor, livro, seção e texto) usa o vetor antigo;
  // só o texto novo vai para a Cloudflare.
  let reaproveitados = 0;
  if (fs.existsSync(alvoIdx) && fs.existsSync(alvoVec) && !process.env.REFAZER) {
    try {
      const velho = JSON.parse(fs.readFileSync(alvoIdx, 'utf8'));
      const vbuf = fs.readFileSync(alvoVec);
      if (velho.modelo === MODELO && velho.dims === DIMS && Array.isArray(velho.itens) && vbuf.length === velho.itens.length * DIMS) {
        const chave = (a, l, s, t) => a + '\u0001' + l + '\u0001' + s + '\u0001' + t;
        const antes = new Map(velho.itens.map((x, k) => [chave(x[0], x[2], x[3], x[5]), k]));
        pedacos.forEach((p, i) => {
          const k = antes.get(chave(p.autor, p.livro, p.secao, p.texto));
          if (k === undefined) return;
          const v = new Array(DIMS);
          for (let d = 0; d < DIMS; d++) { const b = vbuf[k * DIMS + d]; v[d] = (b > 127 ? b - 256 : b) * velho.escala; }
          vetores[i] = v; reaproveitados++;
        });
      }
    } catch (_) { /* índice antigo ilegível: refaz tudo, como antes */ }
    if (reaproveitados) console.log(`      ${reaproveitados} trechos reaproveitados do índice anterior; ${pedacos.length - reaproveitados} novos`);
  }
  let feitos = 0, t0 = Date.now();
  // O Cloudflare cobra o LOTE INTEIRO contra um teto de 60.000 tokens. Contar só
  // "quantos textos" não basta — o que estoura é a soma. Fechamos o lote pelo que
  // vier primeiro: 24 textos ou ~55.000 caracteres (bem abaixo do teto, com folga
  // pro português, que gasta mais token por letra que o inglês).
  const TETO_LETRAS = 55000;
  const faltam = textos.map((_, i) => i).filter((i) => !vetores[i]);   // só o que não foi reaproveitado
  const lotes = [];
  for (let a = 0; a < faltam.length;) {
    let b = a, letras = 0;
    while (b < faltam.length && (b - a) < LOTE && (letras + textos[faltam[b]].length) <= TETO_LETRAS) {
      letras += textos[faltam[b]].length; b++;
    }
    if (b === a) b = a + 1;                    // um texto sozinho já passa do teto: vai só ele
    lotes.push(faltam.slice(a, b));
    a = b;
  }

  let prox = 0;
  await Promise.all(Array.from({ length: LANES }, async () => {
    while (prox < lotes.length) {
      const idx = lotes[prox++];
      const vs = await embutir(idx.map((i) => textos[i]));
      for (let k = 0; k < vs.length; k++) vetores[idx[k]] = vs[k];
      feitos += vs.length;
      if (feitos % (LOTE * 12) < LOTE) {
        const seg = (Date.now() - t0) / 1000;
        process.stdout.write(`\r      ${feitos}/${pedacos.length}  (${Math.round(feitos / seg * 60)}/min)   `);
      }
    }
  }));
  process.stdout.write('\r' + ' '.repeat(60) + '\r');

  const { buf, escala } = paraInt8(vetores);
  fs.writeFileSync(alvoVec, buf);
  fs.writeFileSync(alvoIdx, JSON.stringify({
    modelo: MODELO, dims: DIMS, escala, total: pedacos.length,
    gerado: new Date().toISOString().slice(0, 10), selo,
    peso: f.peso, aprovado: f.aprovado,
    itens: pedacos.map((p) => [p.autor, p.obra, p.livro, p.secao, p.tipo, p.texto]),
  }));
  console.log(`   ✅ ${f.id}: ${pedacos.length} trechos em ${Math.round((Date.now() - t0) / 1000)}s`);
}

// ─── empurrar pro Postgres (é LÁ que isto vive de verdade) ───────────────────
async function subir(quais) {
  const cs = process.env.RADAR_DB;
  if (!cs) {
    console.log('\n✖ Sem RADAR_DB no ambiente — não dá pra subir.');
    console.log('  O cache local está pronto em ' + CACHE + '.');
    console.log('  Rode assim quando tiver a credencial:');
    console.log('    set RADAR_DB=... && node scripts/indexar-biblioteca.mjs --subir');
    return false;
  }
  const { default: pg } = await import('pg');

  // 28/10/2026: DOIS BANCOS. O banco 1 (RADAR_DB) é o do app NO AR e chegou a 427 de 512 MB; o banco 2 (RADAR_DB2,
  // Neon "radar-biblioteca-2") é só da biblioteca. Regra: fonte que JÁ TEM trechos no banco 1 continua no banco 1
  // (inclusive as do Dr. Wagner, que só acrescentam); fonte NOVA vai para o banco 2. Sem RADAR_DB2, tudo no banco 1.
  // Cada banco tem o seu freio de mão e é medido sozinho.
  const BANCOS = [
    { nome: 'banco 1', cs, teto: parseInt(process.env.PARAR_EM_MB || '440', 10) },   // 27/10/2026: era 1100, acima do limite real do Neon grátis (512 MB)
    ...(process.env.RADAR_DB2 ? [{ nome: 'banco 2', cs: process.env.RADAR_DB2, teto: parseInt(process.env.PARAR_EM_MB2 || '440', 10) }] : []),  // Neon grátis: 0,5 GB por projeto (o mesmo freio do banco 1)
  ];
  const tamanhoMB = async (c) => {
    const r = await c.query('select pg_database_size(current_database()) b');
    return Math.round(Number(r.rows[0].b) / 1048576);
  };
  for (const B of BANCOS) {
    B.c = new pg.Client({ connectionString: B.cs, ssl: { rejectUnauthorized: false } });
    await B.c.connect();
    await B.c.query('create extension if not exists vector');
    // ⚠️ FREIO DE MÃO — o banco 1 é o do app NO AR.
    // O cadastro dos irmãos, o controle de acesso e o push moram nele. Encher o
    // banco até o teto pra indexar comentário derruba coisa que o pastor usa todo
    // dia. Então medimos o tamanho a cada lote e PARAMOS antes de apertar.
    // Teto em MB; muda com PARAR_EM_MB (banco 1) e PARAR_EM_MB2 (banco 2).
    B.inicio = await tamanhoMB(B.c);
    console.log(`   ${B.nome} em ${B.inicio} MB · freio de mão em ${B.teto} MB`);
    await B.c.query(`create table if not exists biblioteca_trechos(
      id bigserial primary key,
      fonte text not null,
      autor text not null,
      obra  text not null,
      livro text,
      secao text,
      tipo  text,
      texto text not null,
      -- A PROCEDENCIA, que o globo usa pra saber em quem acreditar:
      --   peso 2 = Owens/Kittel (dizem QUAL e a palavra)
      --   peso 3 = autores aprovados pelo Concilio
      --   peso 4 = Champlin, REPROVADO: consulta com filtro, nunca voz
      peso  int  not null default 3,
      aprovado boolean not null default true,
      emb   halfvec(${DIMS})
    )`);
    // tabela que ja existia de uma rodada anterior ganha as colunas novas sem drama
    for (const col of ['peso int not null default 3', 'aprovado boolean not null default true']) {
      try { await B.c.query('alter table biblioteca_trechos add column if not exists ' + col); } catch (_) {}
    }
  }
  let parou = null;

  // A ORDEM DOS ARGUMENTOS MANDA. Com o freio de mao ligado, a carga pode parar no
  // meio — entao o que vale mais tem que entrar PRIMEIRO. Quem chama decide a ordem.
  const fila = (quais && quais.length)
    ? quais.map((id) => FONTES.find((f) => f.id === id)).filter(Boolean)
    : FONTES;
  for (const f of fila) {
    const ai = path.join(CACHE, f.id + '.idx.json'), av = path.join(CACHE, f.id + '.vec.bin');
    if (!fs.existsSync(ai)) continue;
    const meta = JSON.parse(fs.readFileSync(ai, 'utf8'));
    const vec = fs.readFileSync(av);
    // Em qual banco esta fonte mora: onde ela já tem trechos; se em nenhum, no último (o banco 2, quando existe).
    let B = BANCOS[BANCOS.length - 1], jaTem = 0;
    for (const X of BANCOS) {
      const n = (await X.c.query('select count(*)::int n from biblioteca_trechos where fonte=$1', [f.id])).rows[0].n;
      if (n) { B = X; jaTem = n; break; }
    }
    if (B.cheio) { console.log(`\n   ⏭ ${f.id}: o ${B.nome} já bateu no freio nesta rodada — fica para a próxima.`); continue; }
    const c = B.c;
    // TRAVA DOS LIVROS (25/10/2026): o banco recusa apagar trechos de livro sem a autorização do Elias (ver
    // D:\LIVROS-MOTOR\travas-livros.mjs). Fonte que já está no banco só é substituída com --autorizado-pelo-elias;
    // sem a flag, pula esta fonte e segue as outras (as aulas do Dr. Wagner estão na exceção e passam sempre).
    if (jaTem && process.argv.includes('--autorizado-pelo-elias')) {
      await c.query("select set_config('radar.elias_autorizou','SIM',false)");
    }
    // 27/10/2026: cada fonte sobe numa TRANSAÇÃO. Antes, o freio de mão parava no meio e deixava a fonte pela metade
    // no banco — e a TRAVA DOS LIVROS não deixa apagar a metade para tentar de novo. Agora ou entra inteira, ou nada.
    // O DR. WAGNER É ABSOLUTO (norma do Elias, 27/10/2026: "nada dele pode ser apagado nem deixado de fora"). A fonte
    // dele NUNCA é apagada para ser regravada: só ACRESCENTA o trecho que ainda não está no banco (mesmo texto = já está).
    const soAcrescentar = /dr-wagner/i.test(f.id) || /wagner cordeiro/i.test(String((meta.itens[0] && meta.itens[0][0]) || ''));
    let ordem = null;
    if (soAcrescentar) {
      const ja = new Set((await c.query('select md5(texto) h from biblioteca_trechos where fonte=$1', [f.id])).rows.map((r) => r.h));
      ordem = meta.itens.map((_, k) => k).filter((k) => !ja.has(createHash('md5').update(semNulo(meta.itens[k][5]), 'utf8').digest('hex')));
      console.log(`\n   ➕ ${f.id} (${B.nome}): só acrescentar — ${ja.size} textos já no banco, ${ordem.length} novos`);
      if (!ordem.length) continue;
      await c.query('begin');
    } else {
      await c.query('begin');
      try { await c.query('delete from biblioteca_trechos where fonte=$1', [f.id]); }
      catch (e) {
        await c.query('rollback');
        console.log(`\n   🔒 ${f.id}: já tem ${jaTem} trechos no ${B.nome} e a TRAVA DOS LIVROS não deixou substituir. Só com --autorizado-pelo-elias.`);
        continue;
      }
    }
    if (!ordem) ordem = meta.itens.map((_, k) => k);
    // Teto opcional por fonte. Serve pra caber num banco apertado (o Neon grátis
    // são 512 MB e a biblioteca inteira passa disso) e pra provar uma fonte nova
    // sem subir a obra completa. Sem a variável, sobe tudo.
    const teto = Math.min(ordem.length, parseInt(process.env.SUBIR_MAX || "0", 10) || ordem.length);
    let estourou = false;
    for (let i = 0; i < teto; i += 200) {
      const vals = [], params = [];
      for (let j = i; j < Math.min(i + 200, teto); j++) {
        const k = ordem[j];
        const [autor, obra, livro, secao, tipo, texto] = meta.itens[k];
        const v = [];
        for (let d = 0; d < DIMS; d++) { const b = vec[k * DIMS + d]; v.push(((b > 127 ? b - 256 : b) * meta.escala).toFixed(6)); }
        const o = params.length;
        vals.push(`($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8},$${o + 9},$${o + 10})`);
        // semNulo de novo aqui: o cache antigo foi gravado antes desta trava existir,
        // e reindexar 53 mil trechos por causa de um byte seria desperdicio.
        params.push(f.id, autor, obra, semNulo(livro), semNulo(secao), tipo, semNulo(texto),
          f.peso || 3, f.aprovado !== false, '[' + v.join(',') + ']');
      }
      try { await c.query(`insert into biblioteca_trechos(fonte,autor,obra,livro,secao,tipo,texto,peso,aprovado,emb) values ${vals.join(',')}`, params); }
      catch (e) { await c.query('rollback'); throw e; }
      process.stdout.write(`\r   ${f.id}: ${Math.min(i + 200, teto)}/${teto}   `);

      // Confere o tamanho a cada lote. E barato, e e o que evita o estrago:
      // o banco 1 e o do app NO AR — cadastro, acesso e push dos irmaos moram nele.
      const agora = await tamanhoMB(c);
      if (agora >= B.teto) {
        await c.query('rollback');
        console.log(`\n   🛑 PAREI: o ${B.nome} chegou a ${agora} MB (teto ${B.teto} MB) no trecho ${i} de ${f.id}.`);
        console.log('      Desfiz a fonte inteira: nada dela ficou no banco. O cache local continua inteiro —');
        console.log('      e so rodar --subir de novo quando houver espaco.');
        parou = { fonte: f.id, ate: i, mb: agora, banco: B.nome };
        B.cheio = true;
        estourou = true;
        break;
      }
    }
    if (estourou) continue;
    await c.query('commit');
    console.log(`\r   ✅ ${f.id} no ${B.nome} (${teto})  ·  ${B.nome} em ${await tamanhoMB(c)} MB      `);
  }
  // ÍNDICE HNSW: SÓ SE PEDIR (--hnsw). Medido neste acervo, ele pesa 58 MB para
  // 22 mil trechos — quase 60% do tamanho da tabela — e a biblioteca inteira passa
  // dos 512 MB do Neon grátis só por causa dele. Sem HNSW o Postgres varre tudo:
  // com 76 mil trechos de 1024 dimensões isso é trabalho de milissegundos em C, e
  // ainda tem uma vantagem — varredura dá o vizinho EXATO, enquanto o HNSW é
  // aproximado. Se um dia o acervo virar meio milhão de trechos, aí sim vale ligar.
  for (const B of BANCOS) {
    if (process.argv.includes('--hnsw')) {
      try {
        await B.c.query('create index if not exists biblioteca_trechos_emb on biblioteca_trechos using hnsw (emb halfvec_cosine_ops)');
        console.log(`   índice HNSW criado no ${B.nome}`);
      } catch (e) { console.log('   (índice HNSW não criado: ' + e.message.slice(0, 80) + ')'); }
    }
    const fim = await tamanhoMB(B.c);
    console.log(`\n   ${B.nome}: ${B.inicio} MB -> ${fim} MB  (a biblioteca custou ${fim - B.inicio} MB)`);
    const q = await B.c.query('select count(*)::int n from biblioteca_trechos');
    console.log(`   biblioteca_trechos no ${B.nome}: ${q.rows[0].n} trechos`);
    await B.c.end();
  }
  if (parou) { console.log('\n⚠️  A carga ficou PELA METADE — ver o aviso acima.'); return false; }
  return true;
}

// ─── principal ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes('--listar')) {
  for (const f of FONTES) {
    const n = (f.formato === 'docx' ? arquivosDocx(f) : arquivosDe(f)).length;
    console.log(`${f.id.padEnd(10)} ${String(n).padStart(5)} arquivos  ${f.dir}`);
  }
  process.exit(0);
}
if (args.includes('--subir')) { await subir(args.filter((a) => !a.startsWith('--'))); process.exit(0); }

if (!CONTAS.length) { console.error('✖ Nenhuma conta do Cloudflare: ponha CF_ACCOUNT_ID/CF_AI_TOKEN ou deixe o cofre no lugar.'); process.exit(1); }
const pedidas = args.filter((a) => !a.startsWith('--'));
const lista = pedidas.length ? FONTES.filter((f) => pedidas.includes(f.id)) : FONTES;

console.log('📚 INDEXANDO A BIBLIOTECA (motor invisível — nada disto vai pro celular)\n');
for (const f of lista) await indexar(f);
console.log('\ncache em ' + CACHE);
// Subir é passo SEPARADO de propósito. Indexar é caro e demorado; subir é rápido
// e escreve num banco de verdade. Misturar os dois já fez o cache ir pro banco
// errado uma vez — o que estivesse em RADAR_DB na hora. Agora é preciso pedir:
//    node scripts/indexar-biblioteca.mjs --subir
if (args.includes('--e-subir')) await subir(pedidas);
else console.log('\npara pôr no Postgres:  node scripts/indexar-biblioteca.mjs --subir');
