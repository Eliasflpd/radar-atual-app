// ═══════════════════════════════════════════════════════════════════════════════
// A MEMÓRIA DO GLOBO — a cabeça. É aqui que se decide o que lembrar e o que é
// proibido guardar.
//
// O QUE FALTAVA (21/09/2026, pedido do Elias):
// o globo já sabia (as seis ferramentas) e já não travava. Faltava a terceira
// perna: ele esquecia tudo ao fechar a página, e esquecia de novo se caísse a
// rede no meio. O do ChatGPT lembra entre conversas; o dele, não.
//
// ┌─ ONDE MORA CADA PEDAÇO ────────────────────────────────────────────────────┐
// │ api/_lib/globo-memoria.js  → o ARMAZÉM (Node + pg, entra por /api/dados)   │
// │ api/_lib/voz-memoria.js    → a CABEÇA (Edge): peneira, resumo, prompt      │
// │ api/_lib/voz-ferramentas.js→ declara a ferramenta o_que_ja_falamos         │
// │ api/_lib/voz.js            → costura: assina o token COM a memória dentro  │
// └────────────────────────────────────────────────────────────────────────────┘
//
// ⚠️ POR QUE POSTGRES E NÃO localStorage — a decisão, com o motivo:
// 1. O resumo tem que entrar na INSTRUÇÃO DE SISTEMA, e quem assina o token é o
//    servidor. Se a memória viesse do aparelho, qualquer um poderia mandar texto
//    arbitrário e escrever dentro do prompt do mestre. Memória no aparelho é um
//    buraco de injeção; memória no servidor, não.
// 2. O Elias testa no celular A22 E no PC. localStorage não atravessa aparelho.
// 3. Limpar o navegador apagaria a memória longa inteira, sem aviso.
// Custo: a tabela é UMA, nova, com teto — ~15 KB por pastor no pior caso. O
// banco está em 1.074 MB com freio em 1.100; isto não move o ponteiro.
//
// ⚠️⚠️ A REGRA QUE MANDA EM TUDO AQUI:
// A página avisa que a conversa passa pelo Google, e o Elias foi explícito:
// ninguém fala nome de membro nem segredo de aconselhamento. Então a memória
// guarda TEMA e PERGUNTA — nunca o caso, nunca a pessoa. `semSegredo()` roda
// ANTES de qualquer gravação e, na dúvida, JOGA FORA. Perder uma lembrança é
// barato; guardar o nome de um membro numa tabela é imperdoável.
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1) A PENEIRA DO SEGREDO
// Duas camadas, como a trava de citação: a IA recebe ordem escrita de não
// escrever nada disso, e ESTA máquina confere depois. Pedir cuidado não é trava;
// máquina é.
// ─────────────────────────────────────────────────────────────────────────────

// Nomes que PODEM ficar: personagem e lugar da Bíblia, palavra de teologia que
// se escreve com maiúscula, e autor de obra consultada (citar fonte é a
// honestidade do mestre — a peneira do nome próprio do globo é outra coisa e
// vive no voz.js). Tudo o que for maiúsculo e NÃO estiver aqui vira "alguém".
const PERMITIDOS = new Set(`
deus senhor jesus cristo espirito santo pai filho verbo messias salvador cordeiro rocha
biblia escritura escrituras palavra evangelho evangelhos lei aliança alianca profeta profetas
igreja reino ceu ceus terra israel juda judah israelita judeu judeus gentio gentios
antigo novo testamento salmo salmos evangelho epistola epistolas apocalipse
genesis exodo levitico numeros deuteronomio josue juizes rute samuel reis cronicas
esdras neemias ester jo salmos proverbios eclesiastes cantares cantico isaias jeremias
lamentacoes ezequiel daniel oseias joel amos obadias jonas miqueias naum habacuque
sofonias ageu zacarias malaquias mateus marcos lucas joao atos romanos corintios
galatas efesios filipenses colossenses tessalonicenses timoteo tito filemom hebreus
tiago pedro judas
adao eva caim abel sete noe sem cam jafe abraao abrao sara sarai isaque ismael rebeca
jaco jacob esau raquel lia labao jose benjamim ruben simeao levi juda issacar zebulom
da naftali gade aser efraim manasses moises araao arao miria zipora josue calebe
gideao sansao debora baraque jefte samuel saul davi jonatas golias salomao roboao
jeroboao acabe jezabel elias eliseu ezequias josias manasses jeoias zedequias
neemias esdras ester mardoqueu ame ciro dario nabucodonosor belsazar
isaias jeremias ezequiel daniel oseias amos jonas ninive babilonia egito assiria persia
canaa cana belem betel jerusalem sinai horebe moria hebrom siquem berseba jerico
galileia samaria nazare cafarnaum jordao jope damasco antioquia efeso corinto roma
atenas filipos colossos tessalonica creta chipre mileto patmos sion siao
maria jose isabel zacarias joao batista simeao ana herodes pilatos caifas anas
pedro simao andre tiago joao filipe bartolomeu tome mateus levi judas iscariotes
matias paulo saulo barnabe silas timoteo tito lucas marcos estevao filipe apolo
priscila aquila lidia febe onesimo filemom gamaliel nicodemos lazaro marta
madalena zaqueu cornelio ananias safira agabo festo agripa felix
faraó farao moloque baal astarote dagom belial satanas lucifer abadom
adonai elohim yahweh javé jeova shaddai sabaoth emanuel
pascoa pentecostes tabernaculo templo arca queruvim querubim serafim urim tumim
torah tora talmude midrash septuaginta massoretico vulgata pergaminho
champlin kittel waltke kidner pearlman horton gilberto keener fee moo morris
motyer stronstad arrington cabral severino owens sadrak
brasil radar concilio
`.trim().split(/\s+/));

// PAROU AQUI: qualquer um destes derruba a lembrança inteira. Não se redige, não
// se aproveita um pedaço — some. É segredo de gabinete pastoral ou dado pessoal.
const PORTA_FECHADA = [
  /\bsegredo\b/i, /\bsigilo/i, /\bconfidencial/i, /\baconselh/i, /\bconfess/i,
  /\bdesabaf/i, /\bme cont(ou|aram)\b/i, /\bentre n[óo]s\b/i, /\bn[ãa]o (conte|fale|comente)\b/i,
  /\bem sigilo\b/i, /\bfic(a|ou) entre\b/i, /\bn[ãa]o pode saber\b/i,
  /[\w.+-]+@[\w-]+\.[\w.]+/,                                   // e-mail
  /\(?\d{2}\)?\s?9?\d{4}[-\s.]?\d{4}\b/,                        // telefone
  /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, /\b\d{11,}\b/,               // CPF / número comprido
  /R\$\s*\d/i, /\bpix\b/i,                                      // dinheiro
  /\brua\b|\bavenida\b|\bcep\b|\bbairro\b/i,                    // endereço
];

// ASSUNTO DELICADO: pode ser ESTUDO ("o adultério de Davi") ou pode ser CASO
// ("o adultério do irmão"). A diferença é a âncora bíblica. Sem âncora, some.
const DELICADO = [
  /adult[ée]rio/i, /tra[íi][çc][ãa]o/i, /div[óo]rcio/i, /separa[çc][ãa]o/i,
  /depress[ãa]o/i, /suic[íi]dio/i, /aborto/i, /v[íi]cio/i, /alco[óo]l/i, /droga/i,
  /d[íi]vida/i, /fal[êe]ncia/i, /demiss[ãa]o/i, /desemprego/i, /processo/i, /advogad/i,
  /briga/i, /fofoca/i, /disciplina/i, /excomunh/i, /c[âa]ncer/i, /doen[çc]a/i,
  /gravidez/i, /homossexual/i, /prostitui/i,
];

const ANCORA_BIBLICA = /\b(g[êe]n|[êe]xo|lev|n[úu]m|deut|jos|ju[íi]z|rute|samuel|reis|cr[ôo]n|esdras|neemias|ester|j[óo]|salmo|prov|eclesiastes|cantares|isa[íi]as|jeremias|lament|ezequiel|daniel|oseias|joel|am[óo]s|obadias|jonas|miqueias|naum|habacuque|sofonias|ageu|zacarias|malaquias|mateus|marcos|lucas|jo[ãa]o|atos|romanos|cor[íi]ntios|g[áa]latas|ef[ée]sios|filipenses|colossenses|tessalon|tim[óo]teo|tito|filemom|hebreus|tiago|pedro|judas|apocalipse)\b/i;

function semAcentoBaixo(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// TÍTULO NA FRENTE DO NOME é o sinal mais forte que existe: "o irmão Marcos",
// "a irmã Cláudia", "o pastor Joel", "dona Maria". Marcos e Joel estão na lista
// de permitidos como LIVRO — e é exatamente por isso que o título vem primeiro:
// depois de "irmão", nome nenhum passa, esteja onde estiver.
const COM_TITULO = /\b(irm[ãa]os?|irm[ãa]|pr\.?|pastora?|pb\.?|presb[íi]tero|di[áa]cono|dona|seu|sr\.?|sra\.?|dr\.?|dra\.?|missionári[oa]|evangelista|obreir[oa]|membro)\s+\p{Lu}[\p{L}\p{M}]+/gu;

// ⚠️ ARMADILHA QUE ME PEGOU NA PRIMEIRA PROVA, e por isso fica escrita:
// `\b` do JavaScript só conhece A-Z, a-z, 0-9 e _. Para ele, "ó" NÃO é letra.
// Com /\b[A-Z][a-z]{2,}\b/ a palavra "Jacó" casava só até o "c", e a peneira
// devolvia "alguémó" — troçando justamente o personagem que ela devia proteger.
// Com \p{Lu} e a trava (?![\p{L}\p{N}]) o acento vira letra de verdade, "Jacó"
// casa inteiro, cai na lista de permitidos e passa limpo.
const NOME_PROPRIO = /(?<![\p{L}\p{N}])\p{Lu}[\p{L}\p{M}]{2,}(?![\p{L}\p{N}])/gu;

/**
 * A PENEIRA. Recebe um pedaço de lembrança; devolve { ok, texto, motivo }.
 * ok:false significa NÃO GUARDE — e quem chama simplesmente não guarda.
 */
export function semSegredo(bruto, opcoes) {
  const o = opcoes || {};
  let t = String(bruto == null ? '' : bruto).replace(/\s+/g, ' ').trim();
  if (!t) return { ok: false, texto: '', motivo: 'vazio' };

  for (const r of PORTA_FECHADA) {
    if (r.test(t)) return { ok: false, texto: '', motivo: 'dado pessoal ou matéria de sigilo' };
  }

  // 1) título + nome: sai o nome, fica o título genérico
  t = t.replace(COM_TITULO, (m) => m.split(/\s+/)[0] + ' (alguém)');

  // 2) maiúscula solta que não está na lista de permitidos
  t = t.replace(NOME_PROPRIO, (p, pos) => {
    if (PERMITIDOS.has(semAcentoBaixo(p))) return p;
    // início de frase é quase sempre palavra comum ("Quando", "Sobre", "Depois").
    // Ali a maiúscula não prova nada, então não se acusa ninguém.
    const antes = t.slice(0, pos).replace(/\s+$/, '');
    if (!antes || /[.!?:]$/.test(antes)) return p;
    return 'alguém';
  });

  // 3) assunto delicado só sobrevive com âncora bíblica — senão é caso, não estudo
  if (DELICADO.some((r) => r.test(t)) && !(ANCORA_BIBLICA.test(t) || ANCORA_BIBLICA.test(o.ref || ''))) {
    return { ok: false, texto: '', motivo: 'assunto delicado sem texto bíblico junto' };
  }

  t = t.slice(0, o.max || 220).trim();
  if (t.length < 3) return { ok: false, texto: '', motivo: 'sobrou nada depois da peneira' };
  return { ok: true, texto: t, motivo: '' };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) FALAR COM O ARMAZÉM (servidor-pra-servidor, com o token do env)
// ─────────────────────────────────────────────────────────────────────────────
function tokenAdm() {
  return (typeof process !== 'undefined' && process.env && process.env.RADAR_ADMIN_TOKEN) || '';
}

async function armazem(origem, corpo) {
  const token = tokenAdm();
  if (!token || !corpo.user) return null;
  try {
    const r = await fetch(origem + '/api/dados?fn=memoria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...corpo, token }),
    });
    return await r.json();
  } catch (_) { return null; }
}

export const lerMemoria   = (origem, user, n) => armazem(origem, { acao: 'ler', user, n });
export const buscarMemoria = (origem, user, q, n) => armazem(origem, { acao: 'buscar', user, q, n });
export const gravarSessao = (origem, user, campos) => armazem(origem, { acao: 'sessao', user, ...campos });
export const esquecerTudo = (origem, user) => armazem(origem, { acao: 'esquecer', user });

/** Grava temas — SEMPRE passando pela peneira, sem exceção e sem atalho. */
export async function gravarTemas(origem, user, itens) {
  const limpos = [];
  for (const it of (itens || []).slice(0, 12)) {
    const tema = semSegredo(it.tema, { max: 120, ref: it.ref });
    if (!tema.ok) continue;
    const perg = semSegredo(it.pergunta || '', { max: 220, ref: it.ref });
    limpos.push({ tema: tema.texto, pergunta: perg.ok ? perg.texto : '', ref: String(it.ref || '').slice(0, 60) });
  }
  if (!limpos.length) return { ok: true, gravados: 0 };
  return armazem(origem, { acao: 'temas', user, itens: limpos });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) A MEMÓRIA QUE SE ESCREVE SOZINHA — a partir das ferramentas que ele chamou
//
// ESTE É O PULO DO GATO, e é também a garantia de privacidade: o servidor não
// precisa ler a conversa pra saber do que se falou. Toda ferramenta que o globo
// chama já passa por aqui (`/api/voz {acao:'ferramenta'}`) e traz, em texto
// limpo, O ASSUNTO: a referência que ele abriu, a pergunta que ele pesquisou.
// Tema e pergunta — exatamente o que o Elias mandou guardar, e só isso.
// Consequência prática: a memória longa funciona mesmo que o globo nunca mande
// uma linha de transcrição pra cá.
// ─────────────────────────────────────────────────────────────────────────────
export function temasDeFerramenta(nome, args) {
  const a = args || {};
  const ref = String(a.ref || a.referencia || '').trim().slice(0, 60);
  switch (String(nome || '')) {
    case 'ler_versiculo':
      return ref ? [{ tema: ref, pergunta: '', ref }] : [];
    case 'versiculos_ligados':
      return ref ? [{ tema: ref, pergunta: 'referências ligadas a ' + ref, ref }] : [];
    case 'conferir_citacao':
      return ref ? [{ tema: ref, pergunta: '', ref }] : [];
    case 'buscar_no_acervo': {
      const p = String(a.pergunta || a.q || a.assunto || '').trim();
      return p ? [{ tema: p, pergunta: 'o que ele já pregou sobre isso', ref: '' }] : [];
    }
    case 'pesquisar_biblioteca': {
      const p = String(a.pergunta || a.q || a.assunto || '').trim();
      return p ? [{ tema: p, pergunta: p, ref: '' }] : [];
    }
    case 'garimpar': {
      const p = String(a.assunto || a.q || '').trim();
      return p ? [{ tema: p, pergunta: '', ref: '' }] : [];
    }
    default:
      return [];   // o_que_ja_falamos NÃO vira tema: consultar a memória não é assunto
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) O RESUMO ROLANTE — memória curta, a que faz ele RETOMAR
//
// Por que resumo e não transcrição: a janela do Live são ~131 mil tokens e a
// conversa de voz enche depressa. Guardar a conversa inteira e devolver no
// começo da sessão nova é a receita de estourar o contexto e ficar lento — que
// é justamente o defeito que o Elias reclamou ("não trava" era o elogio ao
// outro). Então guarda-se um RASCUNHO curto e, quando ele engorda, vira resumo.
// ─────────────────────────────────────────────────────────────────────────────
const RASCUNHO_VIRA_RESUMO = 2200;   // caracteres de rascunho que disparam o resumo
const MAX_PENDENTE_BRUTO   = 400;    // quanto da última frase do mestre vira 'pendente'

function ordemDeResumir(resumoVelho, rascunho) {
  return `Você mantém o caderno de memória de um mestre da Bíblia que conversa por voz com um pastor.
Escreva o RESUMO ATUALIZADO da conversa, para o mestre RETOMAR de onde parou se a página fechar.

RESUMO ATÉ AGORA:
"""${resumoVelho || '(ainda não há)'}"""

O QUE FOI DITO DEPOIS DISSO:
"""${rascunho}"""

REGRAS ABSOLUTAS:
1. No máximo 8 linhas, texto corrido, português do Brasil. Junte o velho e o novo
   numa coisa só; o que ficou velho demais, descarte.
2. Guarde ASSUNTO e ONDE PARARAM: os textos bíblicos abertos, as perguntas do
   pastor, o que o mestre estava desenvolvendo e o que ficou pela metade.
3. ⛔ PROIBIDO escrever nome de pessoa que não seja personagem bíblico ou autor de
   livro citado. Nada de nome de membro, de parente, de igreja, de cidade dele.
   Nada de telefone, e-mail, valor, endereço.
4. ⛔ PROIBIDO guardar matéria de aconselhamento, confissão, problema de família,
   doença, dívida, briga ou qualquer coisa dita em confidência. Se a conversa foi
   disso, escreva apenas: "assunto pastoral reservado — não guardado".
5. ⛔ NÃO INVENTE. Só entra o que está escrito acima. Se não deu pra resumir,
   escreva exatamente: SEM RESUMO.
6. Sem título, sem marcador, sem introdução. Comece pelo assunto.`;
}

/**
 * Registra um turno de conversa. `escrever` é injetado por quem chama (voz.js)
 * — assim este arquivo não importa voz-ferramentas.js e não há import circular.
 */
export async function registrarTurno(origem, user, turno, escrever) {
  const t = turno || {};
  const eu = String(t.eu || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
  const mestre = String(t.mestre || '').replace(/\s+/g, ' ').trim().slice(0, 1800);
  if (!eu && !mestre && !t.cortado && !t.fim) return { ok: true, nada: true };

  const m = await lerMemoria(origem, user, 0);
  if (!m || m.off) return { ok: false, off: true };

  let rascunho = String((m && m.rascunho) || '');
  if (eu) rascunho += '\nPASTOR: ' + eu;
  if (mestre) rascunho += '\nMESTRE: ' + mestre;
  rascunho = rascunho.slice(-6000);

  // ── O ASSUNTO INTERROMPIDO ────────────────────────────────────────────────
  // "posso ficar falando o tempo todo mesmo cortando ele e fica perfeito".
  // Cortar já funciona (o Live cala na hora). O que faltava é o mestre SABER
  // que ficou devendo. Quando o front avisa que houve corte, a última frase do
  // mestre vira o pendente — é ela que ele vai poder retomar depois.
  const campos = { rascunho, sessao: String(t.sessao || '').slice(0, 60) };
  if (t.cortado) {
    const p = semSegredo(mestre.slice(-MAX_PENDENTE_BRUTO), { max: 240 });
    if (p.ok) campos.pendente = p.texto;
  }
  // Pergunta nova depois do corte = ele mudou de assunto de propósito. O
  // pendente continua guardado (é o que permite voltar), mas não vira dívida
  // eterna: quem fecha o assunto é o front mandando { fechou:true }.
  if (t.fechou) campos.pendente = '';

  await gravarSessao(origem, user, campos);

  // Só resume quando o rascunho engorda: chamar a IA a cada frase seria lento e
  // caro, e o pastor sentiria o silêncio.
  if (rascunho.length >= RASCUNHO_VIRA_RESUMO || t.fim) {
    if (typeof escrever === 'function') {
      const bruto = await escrever(ordemDeResumir(m.resumo || '', rascunho));
      const limpo = semSegredo(bruto || '', { max: 1400 });
      if (limpo.ok && !/^\s*SEM RESUMO/i.test(limpo.texto)) {
        await gravarSessao(origem, user, { resumo: limpo.texto, rascunho: '' });
        return { ok: true, resumido: true };
      }
      // Resumo que não passou na peneira NÃO vira resumo — e o rascunho some
      // junto, porque ele é que estava contaminado.
      if (bruto && !limpo.ok) await gravarSessao(origem, user, { rascunho: '' });
    }
  }
  return { ok: true, resumido: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) O BLOCO QUE ENTRA NA INSTRUÇÃO DE SISTEMA
// É isto que faz o globo abrir a boca já sabendo de quem ele está falando.
// ─────────────────────────────────────────────────────────────────────────────
function quando(d) {
  if (!d) return '';
  const dias = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (dias <= 0) {
    const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (min < 2) return 'agora há pouco';
    if (min < 60) return 'há ' + min + ' minutos';
    return 'há ' + Math.floor(min / 60) + ' horas';
  }
  if (dias === 1) return 'ontem';
  if (dias < 7) return 'há ' + dias + ' dias';
  if (dias < 14) return 'semana passada';
  if (dias < 60) return 'há ' + Math.floor(dias / 7) + ' semanas';
  return 'há ' + Math.floor(dias / 30) + ' meses';
}

export const LEI_DA_MEMORIA = `════ LEI 7 — A SUA MEMÓRIA É ESTA, E SÓ ESTA ════
Você lembra do que está escrito no bloco A SUA MEMÓRIA DESTE PASTOR, aqui embaixo,
e do que voltar da ferramenta o_que_ja_falamos. MAIS NADA.
• Não está lá? Então VOCÊ NÃO LEMBRA, e diz isso: "isso eu não tenho guardado
  aqui", "não achei isso no que a gente já conversou". Sem se desculpar muito, e
  sem preencher o buraco.
• É PROIBIDO inventar que vocês já falaram de alguma coisa. Ele sabe o que
  perguntou; uma lembrança falsa derruba tudo o que você acertou antes dela.
• Na dúvida, CHAME o_que_ja_falamos em vez de tentar lembrar. Lembrar de cabeça
  é o mesmo erro de citar versículo de cabeça — e já custou caro aqui.
• Você guarda ASSUNTO, nunca a vida dele. Se ele contar alguma coisa de membro,
  de família ou de aconselhamento, isso NÃO é guardado e você não repete depois.`;

// ASSUNTO PELA METADE TEM PRAZO. Passadas 48 horas, "você ficou me devendo
// aquilo" deixa de ser atenção e vira disco arranhado — o pastor já virou a
// página. Depois do prazo o pendente simplesmente não é mostrado: ele continua
// na tabela (o resumo pode ter engolido o assunto), mas não cobra mais nada.
const PENDENTE_VALE_HORAS = 48;
function pendenteVivo(m) {
  if (!m || !m.pendente) return '';
  if (!m.pendente_em) return m.pendente;           // linha antiga, sem data: vale
  const h = (Date.now() - new Date(m.pendente_em).getTime()) / 3600000;
  return h <= PENDENTE_VALE_HORAS ? m.pendente : '';
}

/** Monta o bloco. Devolve '' quando não há memória — e aí o globo não finge que há. */
export async function blocoDoSistema(origem, user) {
  if (!user) return '';
  const m = await lerMemoria(origem, user, 12);
  if (!m || !m.ok || !m.lembro) return '';
  const pendente = pendenteVivo(m);

  const L = [];
  L.push('════ A SUA MEMÓRIA DESTE PASTOR ════');
  L.push('Tudo o que você lembra dele está aqui. O que não está aqui, você NÃO lembra.');
  L.push('');

  const min = m.atualizado_em ? (Date.now() - new Date(m.atualizado_em).getTime()) / 60000 : 1e9;

  // ⚠️ O PENDENTE VEM PRIMEIRO, E ISSO FOI DESCOBERTO NA PROVA, NÃO NO PROJETO.
  // Na primeira rodada ele ficava embaixo do resumo — e o modelo, lendo o resumo
  // primeiro, respondia "o que ficou faltando?" com o assunto VELHO, que estava
  // resumido, em vez do assunto NOVO, em que ele tinha sido cortado. Era a
  // ordem do texto ganhando da verdade. O pendente é, por construção, a coisa
  // mais recente que aconteceu entre os dois: então ele encabeça a memória.
  if (pendente) {
    L.push('▸ ISTO É O MAIS RECENTE — FOI AQUI QUE ELE TE CORTOU, no meio da frase:');
    L.push('"…' + pendente + '"');
    L.push('Se ele perguntar o que ficou faltando, o que você ficou devendo, ou pedir');
    L.push('pra voltar: é ISTO, e não o resumo mais abaixo (aquilo é mais antigo).');
    L.push('Volte assim, com naturalidade: "voltando no que eu dizia sobre…".');
    L.push('Uma vez só, e sem forçar: se ele trocou de assunto de propósito, respeite.');
    L.push('');
  }

  if (m.resumo) {
    L.push(min < 180
      ? '▸ ANTES DISSO, VOCÊS ESTAVAM CONVERSANDO ' + quando(m.atualizado_em) + ' — você está RETOMANDO, não começando:'
      : '▸ DA ÚLTIMA VEZ QUE CONVERSARAM (' + quando(m.atualizado_em) + '):');
    L.push(m.resumo);
    L.push('');
    if (min < 180) {
      L.push('Cumprimente como quem volta, não como quem chega: emende no assunto.');
      L.push('Nada de "como posso ajudar" — vocês já estavam no meio de uma coisa.');
      L.push('');
    }
  }

  if ((m.temas || []).length) {
    L.push('▸ ASSUNTOS QUE JÁ PASSARAM POR AQUI (do mais novo pro mais velho):');
    for (const t of m.temas.slice(0, 12)) {
      L.push('  · ' + t.tema + (t.ref && t.ref !== t.tema ? ' — ' + t.ref : '')
        + ' (' + quando(t.quando) + (t.vezes > 1 ? ', ' + t.vezes + ' vezes' : '') + ')');
    }
    L.push('Isto é uma LISTA DE ASSUNTOS, não o conteúdo. Para saber o que foi dito,');
    L.push('chame o_que_ja_falamos — e, para o texto, ler_versiculo, como sempre.');
    L.push('');
  }

  return L.join('\n').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) A FERRAMENTA — o globo consultando a própria memória em vez de fingir
// ─────────────────────────────────────────────────────────────────────────────
export const FERRAMENTA_MEMORIA = {
  name: 'o_que_ja_falamos',
  description: 'Consulta a SUA MEMÓRIA das conversas com este pastor: os assuntos que já passaram por aqui, '
    + 'quando passaram, e de onde vocês pararam da última vez. '
    + 'CHAME sempre que ele perguntar o que vocês já conversaram, o que ele te perguntou antes, se já falaram de um assunto, '
    + 'ou quando você quiser retomar algo que ficou pela metade. '
    + 'Você NÃO lembra de nada que não volte daqui: se esta ferramenta não achar, você diz que não lembra e NÃO inventa.',
  parameters: {
    type: 'OBJECT',
    properties: {
      assunto: {
        type: 'STRING',
        description: 'O assunto a procurar na memória, em português (ex.: "escada de Jacó", "Daniel 12"). '
          + 'Deixe vazio para ver de onde vocês pararam e os últimos assuntos.',
      },
    },
  },
};

export async function oQueJaFalamos(args, origem, user) {
  const assunto = String((args && (args.assunto || args.q || args.tema)) || '').trim().slice(0, 200);

  if (!user) {
    return { lembro: false,
      ordem: 'Você não tem memória ligada nesta conversa. Diga ao pastor, com naturalidade, que desta vez você não está guardando nada — e NÃO invente lembrança.' };
  }

  if (assunto) {
    const r = await buscarMemoria(origem, user, assunto, 8);
    const itens = (r && r.itens) || [];
    if (!itens.length) {
      return { lembro: false, procurei: assunto,
        ordem: 'NÃO ACHEI isso na memória de vocês. Diga com todas as letras que não lembra de ter falado disso — '
             + '"isso eu não tenho guardado aqui" — e ofereça abrir o assunto agora. É PROIBIDO inventar que já falaram.' };
    }
    return {
      lembro: true,
      procurei: assunto,
      assuntos: itens.map((t) => ({ assunto: t.tema, texto_ligado: t.ref || '',
        quando: quando(t.quando), vezes: t.vezes })),
      ordem: 'Isto é o que vocês JÁ conversaram sobre esse assunto. Diga QUANDO foi, com naturalidade, como um mestre lembra '
           + '("semana passada você me perguntou sobre isso"). Estes são os ASSUNTOS, não o conteúdo — para o conteúdo, '
           + 'abra o texto com ler_versiculo. Não afirme nada além do que está nesta lista.',
    };
  }

  const m = await lerMemoria(origem, user, 12);
  if (!m || !m.ok || !m.lembro) {
    return { lembro: false,
      ordem: 'A memória de vocês está vazia — é a primeira vez, ou não sobrou nada guardado. Diga isso com naturalidade e NÃO invente conversa passada.' };
  }
  // A ORDEM DOS CAMPOS AQUI É A MESMA DO BLOCO DO PROMPT, e pelo mesmo motivo
  // medido na prova: o pendente é o MAIS RECENTE e tem que ser lido primeiro,
  // senão o modelo responde "o que ficou faltando?" com o assunto antigo.
  return {
    lembro: true,
    ficou_pela_metade: pendenteVivo(m),
    de_onde_pararam: m.resumo || '',
    quando_foi: quando(m.atualizado_em),
    assuntos: (m.temas || []).map((t) => ({ assunto: t.tema, texto_ligado: t.ref || '',
      quando: quando(t.quando), vezes: t.vezes })),
    ordem: 'Isto é a sua memória real. Fale em cima dela, dizendo quando foi. '
         + 'Se houver algo em "ficou_pela_metade", É ISSO que você ficou devendo — ele te cortou ali, '
         + 'e é dali que você volta ("voltando no que eu dizia…"), uma vez só, sem forçar. '
         + '"de_onde_pararam" é mais ANTIGO que isso. '
         + 'Nada além disto você lembra: o que não está aqui, você diz que não lembra.',
  };
}
