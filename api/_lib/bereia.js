// BEREIA — o ajudante de pregação do RADAR (01/11/2026, pedido do Elias: "esse Bereia será o que me ajudará a criar
// minhas pregações quando você não tá por perto"). O nome vem de At 17:11: os de Bereia "examinavam cada dia nas
// Escrituras se estas coisas eram assim". É um módulo NOVO: não substitui o Preparador, o Concílio nem a Escola.
//
// O caminho de uma pregação (tudo em streaming, linha a linha em JSON, para a tela mostrar cada etapa na hora):
//   1. PLANO      — uma IA rápida lê o pedido e devolve: os textos bíblicos, 3-4 pesquisas e o assunto da notícia.
//   2. BIBLIOTECA — cada pesquisa vai à busca da Biblioteca (servidor-a-servidor, com o token). Lá dentro a
//                   JOEIRA (o reordenador, api/_lib/biblioteca.js) escolhe os trechos certeiros. A tela recebe só
//                   NOMES de autor e obra — o texto dos livros comprados nunca sai daqui ("pesquisar e citar pode;
//                   distribuir não").
//   3. NOTÍCIAS   — as manchetes do motor de notícias fiéis (/api/noticias-fieis); a IA só usa uma se servir de
//                   ilustração honesta, citando o veículo e a data.
//   4. PREGAÇÃO   — a Claude (degrau premium) escreve no estilo do Elias. A Bíblia NUNCA é digitada pela IA:
//                   ela escreve {{Gn 40:14}} e o servidor troca pelo texto da Almeida (public/biblia.json).
//   5. CONFERÊNCIA — referência inexistente, "Igreja," no começo, falta de âmago e pergunta binária viram avisos.
// Porta: só abre para quem já entra nos livros particulares (crachá do aparelho do Elias ou o PIN dele) — cada
// pregação gasta várias chamadas pagas de IA e o repositório é público.
import { iaTexto, iaStreamTexto } from './ia.js';
import { carregarBiblia, acharReferencias, textoDoVersiculo, LIVRO_NOME } from './concilio.js';
import { ehHistorico } from './celulas.js';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };

async function liberado(origem, cracha, token) {
  try {
    const r = await fetch(origem + '/api/livro-particular', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cracha: cracha || '', token: token || '' }) });
    const d = await r.json().catch(() => ({}));
    return !!(r.ok && d && d.ok);
  } catch (_) { return false; }
}

// ── 1. O PLANO ───────────────────────────────────────────────────────────────
const SYS_PLANO = `Você planeja a pesquisa de uma pregação evangélica pentecostal (Assembleia de Deus).
Devolva SÓ um JSON, sem nada antes ou depois:
{"titulo":"título forte, curto, sem clichê","refs":["Gn 40:14","Sl 105:17-19"],"buscas":["...","...","..."],"camadas":{"original":"...","ecos":"...","estrutura":"...","contexto":"..."},"noticia":"palavras-chave curtas ou vazio"}
- refs: 4 a 10 referências bíblicas REAIS e certeiras para o tema (formato "Livro cap:vers" ou "Livro cap:v1-v2", siglas como Gn, Ex, 1Sm, Sl, Pv, Is, Mt, Jo, Rm, Hb, Ap).
- buscas: 3 ou 4 perguntas em português natural para uma biblioteca de comentários, dicionários, história e aulas. Cada uma sobre um ângulo diferente: o texto em si, palavra no original, contexto histórico, aplicação. NÃO ponha nome de autor nem de livro de comentário na pergunta (só o assunto e a referência bíblica).
- camadas: uma pergunta para cada camada de descoberta do texto principal, no mesmo estilo das buscas (sem nome de autor):
  original = a palavra-chave grega ou hebraica do texto e o seu sentido; ecos = onde o Antigo Testamento já falou disso (profecia, tipo, alusão);
  estrutura = como o texto se liga ao começo, ao meio e ao fim do próprio livro; contexto = costume, lei, lugar ou história da época que o leitor de hoje não sabe.
- noticia: palavras-chave de um assunto atual que poderia ilustrar o tema, em português E em inglês (ex.: "perseguição cristãos persecution christians", "Israel Jerusalém Jerusalem"), ou "" se não couber.`;

function planoReserva(pedido) {
  const refs = acharReferencias(pedido).slice(0, 8).map((r) => r.bruto);
  return { titulo: '', refs, buscas: [pedido.slice(0, 300)], noticia: '', camadas: {} };
}
async function planejar(pedido) {
  try {
    const r = await iaTexto({ sys: SYS_PLANO, user: pedido, temperature: 0.3, max_tokens: 700, tag: 'bereia-plano' });
    const j = JSON.parse(String(r.texto || '').replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1'));
    const p = {
      titulo: String(j.titulo || '').slice(0, 120),
      refs: (Array.isArray(j.refs) ? j.refs : []).map(String).slice(0, 12),
      buscas: (Array.isArray(j.buscas) ? j.buscas : []).map(String).filter(Boolean).slice(0, 4),
      noticia: String(j.noticia || '').slice(0, 80),
      camadas: Object.fromEntries(CAMADAS.map((c) => [c.id, String((j.camadas && j.camadas[c.id]) || '').slice(0, 300)]).filter((x) => x[1])),
    };
    if (!p.buscas.length) p.buscas = [pedido.slice(0, 300)];
    return p;
  } catch (_) { return planoReserva(pedido); }
}

// ── 2. A BIBLIOTECA (com a Joeira lá dentro) ─────────────────────────────────
async function pesquisar(origem, q, n = 5) {
  const tk = process.env.RADAR_ADMIN_TOKEN || '';
  if (!tk) return [];
  try {
    const r = await fetch(origem + '/api/dados?fn=biblioteca', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: String(q).slice(0, 400), n, token: tk }), signal: AbortSignal.timeout(15000) });
    const d = await r.json();
    return ((d && d.ok && d.itens) || []).filter((x) => x && x.texto);
  } catch (_) { return []; }
}
async function bibliotecaToda(origem, buscas) {
  const listas = await Promise.all(buscas.map((q) => pesquisar(origem, q)));
  // intercala: o 1º de cada pesquisa, depois o 2º de cada… — cada ângulo do plano ganha voz
  const vistos = new Set(), out = [];
  for (let i = 0; i < 5; i++) for (const l of listas) {
    const x = l[i]; if (!x) continue;
    const k = x.autor + '|' + x.texto.slice(0, 60);
    if (vistos.has(k)) continue;
    vistos.add(k); out.push(x);
  }
  return out.slice(0, 10);
}
const selo = (x) => ehHistorico(x) ? 'fonte histórica (jornal antigo): só ilustração, nunca doutrina'
  : x.autor === 'Flávio Josefo' ? 'historiador judeu do séc. I: diga "segundo Josefo"'
  : /rashi|midrash|rabbah/i.test(x.autor + ' ' + (x.obra || '')) ? 'TRADIÇÃO JUDAICA, não Escritura: diga de onde vem'
  : x.peso === 2 ? 'fonte primária (sentido da palavra no original)'
  : x.aprovado === false ? 'com filtro: só grego e estudo de palavra, nunca ponto disputado'
  : 'autor aprovado';

// ── 3. AS NOTÍCIAS FIÉIS ─────────────────────────────────────────────────────
async function noticias(origem, assunto) {
  if (!assunto) return [];
  try {
    const r = await fetch(origem + '/api/noticias-fieis', { signal: AbortSignal.timeout(6000) });
    const d = await r.json();
    const todas = ((d && d.secoes) || []).flatMap((x) => x.itens || []);
    const chaves = String(assunto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\W+/).filter((p) => p.length > 3);
    const sem = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return todas.filter((n) => chaves.some((c) => sem((n.titulo || '') + ' ' + (n.resumo || '')).includes(c))).slice(0, 5);
  } catch (_) { return []; }
}

// ── 3b. AS 4 CAMADAS (03/11/2026, pedido do Elias: "faz as camadas na Bereia") ──────────────────────────────
// O "nossa, isso eu não sabia" nasce de 4 perguntas ao texto: o que a tradução esconde, onde o AT já falou disso,
// como o autor amarrou o livro e o que o leitor da época sabia. Cada camada ganha a sua pesquisa na Biblioteca;
// a IA cava as descobertas e o SERVIDOR confere: referência que não existe na Almeida cai, e fonte que não veio da
// Biblioteca fica marcada "conferir" — descoberta inventada é pior que nenhuma.
const CAMADAS = [
  { id: 'original', nome: 'O que a tradução esconde (grego e hebraico)' },
  { id: 'ecos', nome: 'Ecos do Antigo Testamento' },
  { id: 'estrutura', nome: 'Como o autor amarrou o livro' },
  { id: 'contexto', nome: 'O que o leitor da época sabia' },
];
async function bibliotecaDasCamadas(origem, camadas, jaTem) {
  const listas = await Promise.all(CAMADAS.map((c) => camadas[c.id] ? pesquisar(origem, camadas[c.id], 4) : []));
  const vistos = new Set(jaTem.map((x) => x.autor + '|' + x.texto.slice(0, 60))), out = [];
  listas.forEach((l, i) => l.slice(0, 3).forEach((x) => {
    const k = x.autor + '|' + x.texto.slice(0, 60);
    if (!vistos.has(k)) { vistos.add(k); out.push({ ...x, camada: CAMADAS[i].id }); }
  }));
  return out;
}
const SYS_CAMADAS = `Você é exegeta evangélico (linha pentecostal clássica, Assembleia de Deus) e cava DESCOBERTAS num texto bíblico
para um pastor que prega a cristãos com fome da Palavra. Descoberta é o que um leitor comum da Bíblia NÃO percebe sozinho
e que, quando ouve, pensa "nossa, isso eu não sabia". Resumo, aplicação genérica ou óbvio NÃO é descoberta.

Devolva SÓ um JSON, sem nada antes ou depois:
{"original":[ACHADO],"ecos":[ACHADO],"estrutura":[ACHADO],"contexto":[ACHADO]}
ACHADO = {"titulo":"a descoberta numa frase curta e forte","explica":"2 a 4 frases: o que é, a prova e por que importa para a pregação","refs":["Mt 28:19","Dn 7:14"],"fonte":"..."}

AS CAMADAS:
- original: a palavra grega ou hebraica do PRÓPRIO texto (transliterada, com o sentido) e o que a tradução não mostra: tempo verbal, repetição, jogo de palavras, termo técnico.
- ecos: onde o Antigo Testamento já falou disso — profecia, tipo, mesma expressão, mesma cena. Dê as duas pontas (o texto e o eco).
- estrutura: como o texto se liga ao começo, ao meio e ao fim do próprio livro (moldura, repetição, contraste, palavra que volta).
- contexto: costume, lei, lugar, data ou fato histórico da época que muda o sentido para quem ouve hoje.

REGRAS DE HONESTIDADE (obrigatórias):
1. De 1 a 3 achados por camada, só os fortes. Se uma camada não tiver nada sólido, devolva [] — vazio é melhor que raso.
2. "fonte": o NOME do autor das FONTES DA BIBLIOTECA de onde tirou (ex.: "Kittel (TDNT)", "Alfred Edersheim", "Flávio Josefo"); ou "texto bíblico" quando a descoberta sai da comparação dos próprios versículos; ou "conhecimento geral" quando não veio de nenhum dos dois.
3. Só cite palavra grega/hebraica se tiver CERTEZA de que ela está naquele versículo. Nunca invente referência.
4. PROIBIDAS as falácias de púlpito: "dynamis = dinamite"; ágape × philéo como regra rígida (Jo 21); "ekklēsia = os chamados para fora" como sentido decisivo; etimologia de raiz como se fosse o sentido; "o 'ide' de Mt 28:19 não é ordem" (o particípio poreuthentes acompanha o imperativo e leva a força dele); número com "significado oculto" sem base no texto.
5. Tradição judaica (Midrash, Rashi, Talmude) é dita como tradição, nunca como Bíblia.
6. Português do Brasil, frases claras, sem academiquês.`;

// ── 2b. A OFICINA (03/11/2026) ───────────────────────────────────────────────
// Este módulo é Edge e não fala com o banco 2 (o driver pg não roda aqui). Então pede à rota Node
// /api/dados?fn=oficina, servidor-a-servidor, com o RADAR_ADMIN_TOKEN (a mesma porta da Biblioteca).
// Se a rota não responder, a pregação segue como antes, sem a Oficina.
const NT_ABREV = new Set(['mt', 'mc', 'lc', 'jo', 'atos', 'rm', '1co', '2co', 'gl', 'ef', 'fp', 'cl', '1ts', '2ts', '1tm', '2tm',
  'tt', 'fm', 'hb', 'tg', '1pe', '2pe', '1jo', '2jo', '3jo', 'jd', 'ap']);
async function oficinaDe(origem, ref) {
  const tk = process.env.RADAR_ADMIN_TOKEN || '';
  if (!tk || !ref) return null;
  try {
    const r = await fetch(origem + '/api/dados?fn=oficina', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: String(ref).slice(0, 80), token: tk }), signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    return d && d.ok ? d : null;
  } catch (_) { return null; }
}

function refsConferidas(biblia, refs) {
  const boas = [], ruins = [];
  for (const bruto of (Array.isArray(refs) ? refs : []).map(String).slice(0, 4)) {
    const r = acharReferencias(' ' + bruto)[0];
    if (r && biblia && textoDoVersiculo(biblia, r)) boas.push(`${r.abbrev ? (LIVRO_NOME[r.abbrev] || r.abbrev) : bruto} ${r.cap}:${r.v1}${r.v2 && r.v2 !== r.v1 ? '-' + r.v2 : ''}`);
    else ruins.push(bruto.trim());
  }
  return { boas, ruins };
}
function montarMd(achados) {
  return achados.length ? ['## 🔎 Descobertas — as 4 camadas', ...CAMADAS.flatMap((c) => {
    const l = achados.filter((a) => a.camada === c.id);
    return l.length ? ['', `### ${c.nome}`, ...l.map((a) => `- **${a.titulo}** ${a.explica}${a.refs.length ? ' (' + a.refs.join('; ') + ')' : ''} · *${a.oficina ? 'cavado na Oficina · fonte: ' + a.fonte : a.fonte === 'conferir' ? '⚠️ conferir antes de pregar' : 'fonte: ' + a.fonte}*`)] : [];
  })].join('\n') : '';
}
async function descobrir(pedido, versos, fontes, biblia, ecos = [], doOficina = []) {
  // 03/11/2026: as descobertas JÁ GUARDADAS na Oficina entram primeiro. Com 4 ou mais, a IA nem é chamada.
  if (doOficina.length >= 4) return { achados: doOficina, md: montarMd(doOficina) };
  const p = [`PEDIDO DO PASTOR:\n${pedido}`];
  if (versos.length) p.push('TEXTOS (Almeida):\n' + versos.map((v) => `${v.ref}: ${v.texto}`).join('\n'));
  if (ecos.length) p.push('ECOS (referências cruzadas, texto da Almeida; use se ajudarem o eco do AT):\n'
    + ecos.map((e) => `${e.rotulo}: ${e.texto}`).join('\n'));
  if (fontes.length) p.push('FONTES DA BIBLIOTECA (cite pelo nome do autor):\n'
    + fontes.map((x) => `■ ${x.autor}${x.secao ? ' (' + x.secao + ')' : ''} [${selo(x)}]\n${String(x.texto).slice(0, 900)}`).join('\n\n'));
  let j;
  try {
    const r = await iaTexto({ sys: SYS_CAMADAS, user: p.join('\n\n'), temperature: 0.4, max_tokens: 9000, tag: 'bereia-camadas',
      premium: true, prazoPremium: 70000 });
    j = JSON.parse(String(r.texto || '').replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1'));
  } catch (_) { return { achados: doOficina, md: montarMd(doOficina) }; }
  const autores = fontes.map((x) => String(x.autor || '').toLowerCase()).filter(Boolean);
  const achados = [];
  for (const c of CAMADAS) {
    for (const a of (Array.isArray(j[c.id]) ? j[c.id] : []).slice(0, 3)) {
      const titulo = String((a && a.titulo) || '').trim().slice(0, 200), explica = String((a && a.explica) || '').trim().slice(0, 900);
      if (!titulo || !explica) continue;
      const { boas, ruins } = refsConferidas(biblia, a.refs);
      if (ruins.length && !boas.length) continue;                       // só referência inventada: descarta
      if ((c.id === 'ecos' || c.id === 'estrutura') && boas.length < 2) continue;   // eco/moldura precisa das duas pontas
      let fonte = String(a.fonte || '').trim().slice(0, 80);
      const daBiblioteca = fonte && autores.some((au) => au.includes(fonte.toLowerCase()) || fonte.toLowerCase().includes(au.split(' (')[0]));
      if (!daBiblioteca && !/^texto b[ií]blico$/i.test(fonte)) fonte = 'conferir';
      achados.push({ camada: c.id, titulo, explica, refs: boas, fonte });
    }
  }
  const todos = doOficina.concat(achados.filter((a) => !doOficina.some((o) => o.titulo === a.titulo)));
  return { achados: todos, md: montarMd(todos) };
}

// ── 4. A PREGAÇÃO ─────────────────────────────────────────────────────────────
const SYS_PREGACAO = `Você é o BEREIA, o ajudante de pregação do pastor Elias (Assembleia de Deus, Cong. Monte Carmelo).
Escreve uma pregação COMPLETA, em prosa que prende, para cristãos com fome e sede da Palavra — nada raso, nada vazio, nada de autoajuda.

REGRAS DO PASTOR (obrigatórias):
1. NUNCA comece com "Igreja,". A primeira linha é uma frase de impacto com um FATO CONCRETO e verificável (cena, lugar, data, nome) que prende quem ouve.
2. Quando um lugar ou fato do mundo entrar, diga ONDE fica e cite nomes reais.
3. Tem que ter ÂMAGO: uma tese central, curta e forte, afirmada e repetida no fim.
4. PROIBIDO pergunta binária batida ("em qual das duas você está?", "você é X ou Y?"). Afirme em vez de perguntar.
5. Nunca use um versículo que puxe contra a tese.
6. Doutrina pentecostal clássica, sem teologia da prosperidade.
7. Se vierem DESCOBERTAS DAS 4 CAMADAS, as 3 a 5 mais fortes entram no CORPO da pregação (não só nas notas), cada uma dita de onde vem ("no grego…", "isso ecoa Daniel 7…", "Edersheim lembra que…"). Descoberta marcada "conferir" só entra se você tiver certeza, e vai para "Fatos para conferir".

A BÍBLIA: você NUNCA digita o texto de um versículo. Escreva a referência entre chaves duplas — {{Gn 40:14}} ou {{Sl 105:17-19}} — e o servidor põe o texto da Almeida. Use as referências do PLANO e outras que conheça com certeza. Pode citar sem chaves só a referência entre parênteses, ex.: (Gn 37:2).

AS FONTES: use as fontes da biblioteca pelo NOME do autor ("Keil e Delitzsch observam…", "segundo Josefo…"), com as suas próprias palavras — nunca mais de seis palavras seguidas de um autor. Obedeça o selo de cada fonte. Tradição judaica (Midrash, Rashi, lendas) é dita como tradição, nunca como Bíblia. Notícia só entra se ilustrar com honestidade, citando o veículo e a data.
FATOS: só afirme o que é certo. Imagem de pregação ("imagine…") é dita como imagem. Tudo o que não for Bíblia nem fonte da biblioteca vai listado nas notas para conferir.

FORMATO (Markdown, exatamente nesta ordem):
# Título
*referências principais*
> frase de abertura (o fato concreto)
2-3 parágrafos de abertura em cena
> **ÂMAGO:** a tese central
## 1. … (4 a 5 partes com título, cada uma com 2-4 parágrafos e as referências {{…}})
## 🔥 (título de clamor)
- 4 linhas curtas para a igreja repetir
parágrafo de apelo (salvação, quebrantamento, compromisso)
## 📝 Notas para quem vai pregar
- **Fontes consultadas:** autores e obras usados
- **Fatos para conferir:** cada fato que não é Bíblia nem biblioteca
- **Tempo:** estimativa`;

function montarPedido(pedido, plano, fontes, notas, versos, achados = []) {
  const p = [`PEDIDO DO PASTOR:\n${pedido}`];
  if (achados.length) p.push('DESCOBERTAS DAS 4 CAMADAS (já conferidas pelo servidor; use as mais fortes no corpo):\n'
    + achados.map((a) => `- [${a.camada}] ${a.titulo} — ${a.explica} (${a.refs.join('; ')}) · fonte: ${a.fonte}`).join('\n'));
  if (plano.titulo) p.push(`TÍTULO SUGERIDO: ${plano.titulo}`);
  if (versos.length) p.push('VERSÍCULOS DO PLANO (texto da Almeida, só para você entender; no texto use {{ref}}):\n'
    + versos.map((v) => `${v.ref}: ${v.texto}`).join('\n'));
  if (fontes.length) p.push('FONTES DA BIBLIOTECA (material privado: use o sentido, cite o autor, não copie):\n'
    + fontes.map((x, i) => `■ [${i + 1}] ${x.autor}${x.obra ? ' — ' + x.obra : ''}${x.secao ? ' (' + x.secao + ')' : ''} [${selo(x)}]\n${String(x.texto).slice(0, 1200)}`).join('\n\n'));
  if (notas.length) p.push('NOTÍCIAS DE FONTES FIÉIS (use no máximo uma, se ilustrar com honestidade):\n'
    + notas.map((n) => `- ${n.titulo} (${n.fonte || n.veiculo || ''}, ${n.data || ''})`).join('\n'));
  return p.join('\n\n');
}

function referenciaEmTexto(biblia, bruto) {
  const r = acharReferencias(' ' + bruto)[0];
  if (!r) return null;
  const t = textoDoVersiculo(biblia, r);
  if (!t) return null;
  const nome = LIVRO_NOME[r.abbrev] || r.abbrev;
  return `“${t}” (${nome} ${r.cap}:${r.v1}${r.v2 && r.v2 !== r.v1 ? '-' + r.v2 : ''})`;
}

// ── 5. A CONFERÊNCIA ─────────────────────────────────────────────────────────
function conferir(texto, refsRuins) {
  const avisos = [];
  const corpo = texto.replace(/^#.*$/m, '').replace(/^\*.*\*$/m, '').trim();
  if (/^>?\s*\**\s*igreja\s*,/i.test(corpo)) avisos.push('Começa com "Igreja," — troque por um fato concreto.');
  if (!/ÂMAGO/i.test(texto)) avisos.push('Não achei o âmago marcado.');
  const binarias = texto.match(/[^.!?\n]*\b(ou|qual das duas|qual dos dois)\b[^.!?\n]*\?/gi) || [];
  for (const b of binarias.slice(0, 2)) if (/\bvocê\b|\bvoce\b|\bqual\b/i.test(b)) avisos.push('Possível pergunta binária: "' + b.trim().slice(0, 120) + '"');
  for (const r of refsRuins) avisos.push('Referência que não existe na Almeida: ' + r + ' (ficou só a referência, sem texto).');
  return avisos;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('{"ok":false}', { status: 405, headers: CORS });
  const origem = new URL(req.url).origin;
  let b = {};
  try { b = await req.json(); } catch (_) { b = {}; }
  const pedido = [b.texto && `Texto bíblico: ${b.texto}`, b.tema && `Tema: ${b.tema}`, b.ideia && `Ideia / ângulo: ${b.ideia}`,
    b.tipo && `Ocasião: ${b.tipo}`].filter(Boolean).join('\n').slice(0, 1500);
  if (!pedido) return new Response(JSON.stringify({ ok: false, err: 'Escreva o texto bíblico ou o tema.' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
  if (!(await liberado(origem, b.cracha, b.token))) {
    return new Response(JSON.stringify({ ok: false, motivo: 'particular' }), { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  const enc = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const w = writable.getWriter();
  const manda = (o) => w.write(enc.encode(JSON.stringify(o) + '\n'));

  (async () => {
    try {
      await manda({ t: 'etapa', id: 'plano', msg: 'Lendo o pedido e planejando a pesquisa…' });
      const [plano, biblia] = await Promise.all([planejar(pedido), carregarBiblia(origem)]);
      const versos = [];
      for (const ref of plano.refs) {
        const r = acharReferencias(' ' + ref)[0];
        const t = r && biblia && textoDoVersiculo(biblia, r);
        if (t) versos.push({ ref: ref.trim(), texto: t });
      }
      await manda({ t: 'plano', titulo: plano.titulo, refs: versos.map((v) => v.ref), buscas: plano.buscas });

      // A OFICINA (03/11/2026): o pedido (ou as 2 primeiras refs do plano) vai ao índice por versículo. Os trechos que
      // COMENTAM o texto entram primeiro nas fontes; as referências cruzadas viram ECOS; as descobertas guardadas entram
      // como achados. Se a Oficina não responder, a pregação segue como antes.
      const principais = [];
      for (const c of [b.texto, ...plano.refs]) {
        if (principais.length >= 2) break;
        if (c && acharReferencias(' ' + c)[0]) principais.push(String(c).trim());
      }
      const ofic = (await Promise.all(principais.map((r) => oficinaDe(origem, r)))).filter(Boolean);
      const ofFontes = ofic.flatMap((d) => (d.autores || []).map((a) => ({ autor: a.autor, obra: a.obra, secao: a.secao, tipo: a.tipo,
        peso: a.peso, aprovado: a.aprovado, livro: '', texto: a.trecho })));
      const ecos = [];
      for (const d of ofic) {
        const nt = NT_ABREV.has(d.ref && d.ref.livro);
        for (const x of (d.cruzadas || [])) {
          if (nt && x.b > 39) continue;                       // texto do NT: eco vem do AT
          if (!ecos.some((e) => e.rotulo === x.rotulo)) ecos.push({ rotulo: x.rotulo, texto: x.texto });
        }
      }
      ecos.splice(6);
      if (ecos.length && plano.camadas && plano.camadas.ecos) {
        plano.camadas.ecos = (plano.camadas.ecos + ' (cf. ' + ecos.slice(0, 3).map((e) => e.rotulo).join('; ') + ')').slice(0, 300);
      }
      const doOficina = [];
      for (const d of ofic) for (const x of (d.descobertas || [])) {
        const { boas, ruins } = refsConferidas(biblia, x.refs);
        if (ruins.length && !boas.length) continue;
        if ((x.camada === 'ecos' || x.camada === 'estrutura') && boas.length < 2) continue;
        if (doOficina.some((o) => o.titulo === x.titulo)) continue;
        doOficina.push({ camada: x.camada, titulo: String(x.titulo).slice(0, 200), explica: String(x.explica).slice(0, 900),
          refs: boas, fonte: x.fonte || 'Oficina', oficina: true });
      }

      await manda({ t: 'etapa', id: 'biblioteca', msg: 'Bereia examinando a Biblioteca · Joeira separando o trigo da palha…' });
      const [fontes, notas] = await Promise.all([bibliotecaToda(origem, plano.buscas), noticias(origem, plano.noticia)]);
      const fontesCam = await bibliotecaDasCamadas(origem, plano.camadas || {}, fontes);
      const vistosT = new Set();
      const todas = [...ofFontes, ...fontes, ...fontesCam].filter((x) => {
        const k = x.autor + '|' + String(x.texto).slice(0, 60);
        if (vistosT.has(k)) return false;
        vistosT.add(k); return true;
      }).slice(0, 16);
      await manda({ t: 'joeira', fontes: todas.map((x) => ({ autor: x.autor, onde: x.secao || x.livro || '', obra: x.obra || '' })) });
      if (plano.noticia) await manda({ t: 'noticias', itens: notas.map((n) => ({ titulo: n.titulo, fonte: n.fonte || n.veiculo || '', data: n.data || '', link: n.link || '' })) });

      await manda({ t: 'etapa', id: 'camadas', msg: 'Cavando as 4 camadas: original, ecos do AT, estrutura, contexto…' });
      const cav = await descobrir(pedido, versos, todas, biblia, ecos, doOficina);
      await manda({ t: 'camadas', md: cav.md, n: cav.achados.length, conferir: cav.achados.filter((a) => a.fonte === 'conferir').length });

      await manda({ t: 'etapa', id: 'escrita', msg: 'Escrevendo a pregação…' });
      const r = await iaStreamTexto({ sys: SYS_PREGACAO, user: montarPedido(pedido, plano, todas, notas, versos, cav.achados),
        temperature: 0.8, max_tokens: 14000, tag: 'bereia', premium: true });
      await manda({ t: 'ia', modelo: r.modelo || '', provedor: r.provedorNome || r.provedor || '' });
      const reader = r.stream.getReader(), dec = new TextDecoder();
      let buf = '', tudo = '';
      const refsRuins = [];
      const solta = async (s) => { if (s) { tudo += s; await manda({ t: 'txt', d: s }); } };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        // troca {{ref}} pelo texto da Almeida; segura o pedaço que pode ser um {{ partido no meio
        let out = '';
        for (;;) {
          const i = buf.indexOf('{{');
          if (i < 0) { const k = buf.endsWith('{') ? buf.length - 1 : buf.length; out += buf.slice(0, k); buf = buf.slice(k); break; }
          const f = buf.indexOf('}}', i);
          if (f < 0) { out += buf.slice(0, i); buf = buf.slice(i); if (buf.length > 60) { out += buf; buf = ''; } break; }
          const bruto = buf.slice(i + 2, f).trim();
          const t = biblia ? referenciaEmTexto(biblia, bruto) : null;
          if (!t) refsRuins.push(bruto);
          out += buf.slice(0, i) + (t || '(' + bruto + ')');
          buf = buf.slice(f + 2);
        }
        await solta(out);
      }
      await solta(buf);
      await manda({ t: 'fim', avisos: conferir(tudo, refsRuins) });
    } catch (e) {
      await manda({ t: 'erro', msg: String((e && e.message) || e).slice(0, 200) });
    }
    try { await w.close(); } catch (_) {}
  })();

  return new Response(readable, { headers: { ...CORS, 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
}
