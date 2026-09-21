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
  { id: 'kittel',   autor: 'Kittel (TDNT)', peso: 2, aprovado: true,
    obra: 'Dicionário Teológico do Novo Testamento (Kittel), verbetes em português',
    dir: 'D:\\PR RAPHAEL\\KITTEL-PT\\verbetes', tipo: 'verbete' },

  // ── 3º escalão: os aprovados. Primeiro os que mais rendem por palavra
  //    (originais, exegese e a linha pentecostal, que é a alma do app). ───────
  { id: 'waltke',   autor: 'Bruce Waltke',   peso: 3, aprovado: true, obra: 'Bruce Waltke — comentários',            dir: AUT('Bruce-Waltke'),      tipo: 'comentario' },
  { id: 'kidner',   autor: 'Derek Kidner',   peso: 3, aprovado: true, obra: 'Derek Kidner — comentários',            dir: AUT('Derek-Kidner'),      tipo: 'comentario' },
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

  // ── 4º escalão: REPROVADO no Concílio, entra com filtro ────────────────────
  { id: 'champlin', autor: 'Champlin', peso: 4, aprovado: false,
    obra: 'Champlin — O Antigo/Novo Testamento Interpretado, versículo por versículo',
    dir: AUT('Champlin'), tipo: 'comentario' },
];

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
    for (const c of ['D:/APIS-CLAUDE/CHAVES.md', 'D:\\APIS-CLAUDE\\CHAVES.md']) {
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
function livroDoNome(arquivo) {
  let s = path.basename(arquivo, '.md');
  s = s.replace(/^\s*\d+\s*[-–—]\s*/, '');                    // tira "1 - "
  s = s.replace(/[-–—]\s*(CHAMPLIN|COMENT[ÁA]RIO)[\s\S]*$/i, '');
  s = s.replace(/\s{2,}/g, ' ').trim();
  if (!s) return '';
  return s.length > 44 ? s.slice(0, 44) : s;
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
  for (const arq of arquivosDocx(f)) {
    let livro = '', cap = 0, ver = 0, linhas = [];
    const fechar = () => {
      if (livro && cap && linhas.length) {
        const ref = `${livro} ${cap}:${ver}`;
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
    const livro = livroDoNome(arq);
    const texto = limpar(fs.readFileSync(arq, 'utf8'));
    // As primeiras ~2500 letras de livro escaneado são capa, ficha e dedicatória.
    const corpo = f.tipo === 'comentario' && texto.length > 20000 ? texto.slice(2500) : texto;
    for (const t of fatiar(corpo)) {
      pedacos.push({
        autor: f.autor,
        obra: f.obra,
        livro,
        secao: f.tipo === 'comentario' ? pistaDeReferencia(t, livro) : livro,
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
  let feitos = 0, t0 = Date.now();
  // O Cloudflare cobra o LOTE INTEIRO contra um teto de 60.000 tokens. Contar só
  // "quantos textos" não basta — o que estoura é a soma. Fechamos o lote pelo que
  // vier primeiro: 24 textos ou ~55.000 caracteres (bem abaixo do teto, com folga
  // pro português, que gasta mais token por letra que o inglês).
  const TETO_LETRAS = 55000;
  const lotes = [];
  for (let i = 0; i < textos.length;) {
    let j = i, letras = 0;
    while (j < textos.length && (j - i) < LOTE && (letras + textos[j].length) <= TETO_LETRAS) {
      letras += textos[j].length; j++;
    }
    if (j === i) j = i + 1;                    // um texto sozinho já passa do teto: vai só ele
    lotes.push([i, j]);
    i = j;
  }

  let prox = 0;
  await Promise.all(Array.from({ length: LANES }, async () => {
    while (prox < lotes.length) {
      const [de, ate] = lotes[prox++];
      const vs = await embutir(textos.slice(de, ate));
      for (let k = 0; k < vs.length; k++) vetores[de + k] = vs[k];
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
  const c = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query('create extension if not exists vector');

  // ⚠️ FREIO DE MÃO — este banco é o do app NO AR.
  // O cadastro dos irmãos, o controle de acesso e o push moram nele. Encher o
  // banco até o teto pra indexar comentário derruba coisa que o pastor usa todo
  // dia. Então medimos o tamanho a cada lote e PARAMOS antes de apertar.
  // Teto em MB; muda com PARAR_EM_MB se um dia o plano crescer.
  const TETO_MB = parseInt(process.env.PARAR_EM_MB || '1100', 10);
  const tamanhoMB = async () => {
    const r = await c.query('select pg_database_size(current_database()) b');
    return Math.round(Number(r.rows[0].b) / 1048576);
  };
  const inicio = await tamanhoMB();
  console.log(`   banco em ${inicio} MB · freio de mão em ${TETO_MB} MB`);
  let parou = null;
  await c.query(`create table if not exists biblioteca_trechos(
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
    try { await c.query('alter table biblioteca_trechos add column if not exists ' + col); } catch (_) {}
  }

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
    await c.query('delete from biblioteca_trechos where fonte=$1', [f.id]);
    // Teto opcional por fonte. Serve pra caber num banco apertado (o Neon grátis
    // são 512 MB e a biblioteca inteira passa disso) e pra provar uma fonte nova
    // sem subir a obra completa. Sem a variável, sobe tudo.
    const teto = Math.min(meta.total, parseInt(process.env.SUBIR_MAX || "0", 10) || meta.total);
    for (let i = 0; i < teto; i += 200) {
      const vals = [], params = [];
      for (let k = i; k < Math.min(i + 200, teto); k++) {
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
      await c.query(`insert into biblioteca_trechos(fonte,autor,obra,livro,secao,tipo,texto,peso,aprovado,emb) values ${vals.join(',')}`, params);
      process.stdout.write(`\r   ${f.id}: ${Math.min(i + 200, teto)}/${teto}   `);

      // Confere o tamanho a cada ~2000 linhas. E barato, e e o que evita o estrago:
      // este banco e o do app NO AR — cadastro, acesso e push dos irmaos moram nele.
      if (i % 2000 === 0) {
        const agora = await tamanhoMB();
        if (agora >= TETO_MB) {
          console.log(`\n   🛑 PAREI: o banco chegou a ${agora} MB (teto ${TETO_MB} MB).`);
          console.log(`      ${f.id} entrou ate o trecho ${i}. O cache local continua inteiro —`);
          console.log('      e so rodar --subir de novo quando houver espaco.');
          parou = { fonte: f.id, ate: i, mb: agora };
          break;
        }
      }
    }
    if (parou) break;
    console.log(`\r   ✅ ${f.id} no banco (${teto})  ·  banco em ${await tamanhoMB()} MB      `);
  }
  // ÍNDICE HNSW: SÓ SE PEDIR (--hnsw). Medido neste acervo, ele pesa 58 MB para
  // 22 mil trechos — quase 60% do tamanho da tabela — e a biblioteca inteira passa
  // dos 512 MB do Neon grátis só por causa dele. Sem HNSW o Postgres varre tudo:
  // com 76 mil trechos de 1024 dimensões isso é trabalho de milissegundos em C, e
  // ainda tem uma vantagem — varredura dá o vizinho EXATO, enquanto o HNSW é
  // aproximado. Se um dia o acervo virar meio milhão de trechos, aí sim vale ligar.
  if (process.argv.includes('--hnsw')) {
    try {
      await c.query('create index if not exists biblioteca_trechos_emb on biblioteca_trechos using hnsw (emb halfvec_cosine_ops)');
      console.log('   índice HNSW criado');
    } catch (e) { console.log('   (índice HNSW não criado: ' + e.message.slice(0, 80) + ')'); }
  }
  const fim = await tamanhoMB();
  console.log(`\n   banco: ${inicio} MB -> ${fim} MB  (a biblioteca custou ${fim - inicio} MB)`);
  const q = await c.query('select count(*)::int n from biblioteca_trechos');
  console.log(`   biblioteca_trechos: ${q.rows[0].n} trechos`);
  await c.end();
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
