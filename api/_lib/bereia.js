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
- buscas: 5 perguntas em português natural para uma biblioteca de comentários, dicionários, história e aulas. Cada uma sobre um ângulo diferente: (1) o texto em si; (2) a palavra no original; (3) o mundo antigo da época (costume, arqueologia, Josefo, história); (4) o que a igreja antiga e a tradição cristã disseram sobre esse texto ou tema; (5) a doutrina e a escatologia ligadas ao tema. NÃO ponha nome de autor nem de livro de comentário na pergunta (só o assunto e a referência bíblica).
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
      buscas: (Array.isArray(j.buscas) ? j.buscas : []).map(String).filter(Boolean).slice(0, 5),
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
      premium: true, prazoPremium: 70000, fundo: true, prazoTotal: 120000 });
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
Escreve uma pregação COMPLETA, em prosa que prende, para cristãos com fome e sede da Palavra. Nada raso, nada vazio, nada de autoajuda.

TAMANHO (a linha TAMANHO DA PREGAÇÃO do pedido manda):
- Curta: 1.000 a 1.300 palavras, 5 partes curtas, cada uma com 2 ou 3 parágrafos.
- Longa: 2.100 a 2.400 palavras, 6 ou 7 partes, cada uma com 3 ou 4 parágrafos.
Em qualquer tamanho, cada parte termina com um GANCHO que puxa para a próxima.

REGRAS DO PASTOR (obrigatórias):
1. NUNCA comece com "Igreja,". A primeira linha é uma frase de impacto com um FATO CONCRETO e verificável (cena, lugar, data, nome) que prende quem ouve.
2. Quando um lugar ou fato do mundo entrar, diga ONDE fica e cite nomes reais.
3. Tem que ter ÂMAGO: uma tese central, em UMA frase forte, dita no fim da abertura e repetida no fecho.
4. PROIBIDO pergunta binária batida ("em qual das duas você está?", "você é X ou Y?"). Afirme em vez de perguntar.
5. Nunca use um versículo que puxe contra a tese.
6. Doutrina pentecostal clássica, sem teologia da prosperidade.

PROFUNDIDADE (o pastor recusa mensagem rasa: quem ouve tem que perceber que o pregador pesquisou e foi a fundo):
A. Cada parte traz pelo menos UMA camada funda, e a pregação inteira passa por TODAS estas:
   - o ORIGINAL: a palavra hebraica ou grega que abre o texto, com o sentido explicado em português simples;
   - a ANTIGUIDADE: o mundo do texto (costume, lei, geografia, arqueologia, Josefo, história de Israel e dos impérios) contado como cena;
   - os PAIS DA IGREJA ou a história da igreja (Inácio, Policarpo, Justino, Irineu, Agostinho, Crisóstomo; reforma, avivamentos, Azusa, os pioneiros da Assembleia de Deus no Brasil): o que disseram ou viveram. Cite a OBRA só se você souber com certeza, e liste em "Fatos para conferir";
   - a TEOLOGIA: a doutrina que o texto sustenta, dita com firmeza (Cristo, Espírito Santo, salvação, santificação, Igreja);
   - a ESCATOLOGIA quando o texto abrir essa porta, sem forçar (arrebatamento da Igreja, tribulação, milênio, juízo, novos céus e nova terra).
B. PRENDER O POVO: conte pelo menos duas cenas (uma bíblica narrada por dentro e uma da história antiga ou da igreja); alterne frase longa com frase curta de impacto; nada de parágrafo que só repete o versículo.
C. A IGREJA TEM QUE ENTENDER: todo termo técnico (palavra grega, concílio, "escatologia", "tipologia") vem explicado na mesma frase, com palavras do dia a dia. Profundo, nunca difícil.
D. Proibido o genérico: "Deus é fiel" e "precisamos buscar mais a Deus" só entram amarrados a um fato do texto.
7. Se vierem DESCOBERTAS DAS 4 CAMADAS, as 3 a 5 mais fortes entram no CORPO da pregação (não só nas notas), cada uma dita de onde vem ("no grego…", "isso ecoa Daniel 7…", "Edersheim lembra que…"). Descoberta marcada "conferir" só entra se você tiver certeza, e vai para "Fatos para conferir".

A BÍBLIA: você NUNCA digita o texto de um versículo. Para citar, escreva SÓ a referência entre chaves duplas, ex.: {{Gn 40:14}} ou {{Sl 105:17-19}}, e o servidor põe o texto inteiro da Almeida. Nunca escreva o versículo você mesmo, nem uma parte dele entre aspas seguida da referência: isso duplica o texto na tela. Se quiser só uma expressão do texto no meio da frase, escreva a expressão e depois a referência entre parênteses, sem chaves, ex.: (Lc 19:3). Use as referências do PLANO e outras que conheça com certeza.

AS FONTES DA BIBLIOTECA: cite pelo NOME do autor ("Keil e Delitzsch observam…", "segundo Josefo…"), com as suas próprias palavras; nunca mais de seis palavras seguidas de um autor. Atribua a cada autor SOMENTE o que está no trecho que você recebeu dele; se o trecho não diz, não atribua. Obedeça o selo de cada fonte. Tradição judaica (Midrash, Rashi, lendas) é dita como tradição, nunca como Bíblia. Notícia só entra se ilustrar com honestidade, citando o veículo e a data.

COMPARAÇÕES COM A LEI E COM OS NÚMEROS: antes de dizer que uma exigência era "o dobro", "o quádruplo" ou outro número, confira no texto da Almeida. Exemplo: Êxodo 22:1 já manda quatro ovelhas por uma ovelha furtada e morta ou vendida; o "dobro" é o caso geral de Êxodo 22:7. Não diga que uma restituição ultrapassa a lei sem conferir o caso exato.

PALAVRAS E SENTIDOS: não dê sentido litúrgico, místico ou "oculto" a uma palavra grega ou hebraica se a fonte não disser isso. Não invente número com significado oculto.

FATOS: só afirme o que é certo. Imagem de pregação ("imagine…") é dita como imagem. Tudo o que não for Bíblia nem fonte da biblioteca vai listado nas notas para conferir.

O FECHO DE FOGO (a última parte, a mais alta): sobe em degraus, com marcações de condução entre colchetes, cada uma em linha própria: [Baixe a voz.] (tom de confissão), [Comece a subir.] (o ritmo cresce), [Peça à igreja que fique de pé.] (o convite), [No auge.] (frases curtas, uma atrás da outra), [Clamor.] (a igreja repete). Dentro do fecho: (a) quando couber, a ligação com o Espírito Santo e o Pentecoste, amarrada ao tema; (b) um momento de RESPOSTA DA IGREJA, em três ou quatro trocas, cada uma numa linha:
**Pregador:** a frase da Escritura (com {{ref}}) ou a ordem de culto
**Igreja:** a resposta curta, entre aspas
(c) clamor em frases curtas, uma por linha; (d) o final apontando para a ministração ("venha ao altar", "fique de pé e receba"). Sem pergunta binária.

FORMATO (Markdown, exatamente nesta ordem):
# Título
*referências principais*
> frase de abertura (o fato concreto)
2 ou 3 parágrafos de abertura em cena
> **ÂMAGO:** a tese central
## 1. … (as partes, cada uma com um título, os parágrafos do TAMANHO e as referências {{…}})
## 🔥 Título do fecho
o fecho, com as marcações entre colchetes e a resposta da igreja
## 📝 Notas para quem vai pregar
- **Fontes consultadas:** autor, obra e o endereço (campo endereco) de cada fonte usada
- **Fatos para conferir:** cada fato que não é Bíblia nem biblioteca
- **Tempo:** estimativa

Revise a digitação antes de terminar (ex.: "Cordeiro", nunca "Cordão").`;

// A conferência (depois da pregação escrita): não escreve; só aponta o que não se sustenta e troca o trecho.
const SYS_CONFERE = `Você é o REVISOR DE FATOS da pregação do pastor Elias. Você NÃO escreve a pregação: só confere e corrige o que está errado.
Recebe: a PREGAÇÃO já escrita, o TEXTO das referências (Almeida) e as FONTES DA BIBLIOTECA usadas (autor, obra, endereço e o trecho que o autor realmente escreveu).
Confira frase por frase:
1. Cada afirmação atribuída a um autor ou obra ("Spurgeon disse", "Edersheim lembra", "segundo Josefo") tem que estar no trecho recebido daquele autor. Se o trecho não sustenta, troque a frase por uma versão que diga só o que o trecho diz, ou tire a atribuição; se não der para corrigir, marque para conferir.
2. Cada comparação com a Lei, com outro versículo, com um número ou com "o dobro"/"o quádruplo" bate com o texto da Almeida recebido.
3. Nenhum sentido litúrgico, místico ou "oculto" dado a uma palavra grega ou hebraica que a fonte não diga.
4. Erros de digitação (ex.: "Cordão" no lugar de "Cordeiro") e palavras trocadas.
Devolva SÓ um JSON, sem nada antes ou depois:
{"trocas":[{"de":"trecho EXATO da pregação, copiado letra por letra, até 300 caracteres","para":"o trecho corrigido (vazio para tirar)"}],"conferir":["fato curto que precisa de conferência humana"]}
Regras: "de" é cópia exata de um trecho da pregação; trocas só para erro comprovado; no máximo 12 trocas; não reescreva o texto inteiro; não mude o estilo nem o tom. Se tudo bate, devolva {"trocas":[],"conferir":[]}.`;

function montarPedido(pedido, plano, fontes, notas, versos, achados = []) {
  const p = [`PEDIDO DO PASTOR:\n${pedido}`];
  if (achados.length) p.push('DESCOBERTAS DAS 4 CAMADAS (já conferidas pelo servidor; use as mais fortes no corpo):\n'
    + achados.map((a) => `- [${a.camada}] ${a.titulo} — ${a.explica} (${a.refs.join('; ')}) · fonte: ${a.fonte}`).join('\n'));
  if (plano.titulo) p.push(`TÍTULO SUGERIDO: ${plano.titulo}`);
  if (versos.length) p.push('VERSÍCULOS DO PLANO (texto da Almeida, só para você entender; no texto use {{ref}}):\n'
    + versos.map((v) => `${v.ref}: ${v.texto}`).join('\n'));
  if (fontes.length) p.push('FONTES DA BIBLIOTECA (material privado: use o sentido, cite o autor, não copie):\n'
    + fontes.map((x, i) => `■ [${i + 1}] ${x.autor}${x.obra ? ' — ' + x.obra : ''}${x.secao ? ' (' + x.secao + ')' : ''}${x.endereco ? ' · endereco: ' + x.endereco : ''} [${selo(x)}]\n${String(x.texto).slice(0, 1200)}`).join('\n\n'));
  if (notas.length) p.push('NOTÍCIAS DE FONTES FIÉIS (use no máximo uma, se ilustrar com honestidade):\n'
    + notas.map((n) => `- ${n.titulo} (${n.fonte || n.veiculo || ''}, ${n.data || ''})`).join('\n'));
  return p.join('\n\n');
}

// 16/11/2026: se a pregação JÁ CITOU parte do versículo logo antes da referência (4 palavras seguidas do texto),
// o servidor põe só a referência entre parênteses. Antes, a tela mostrava a frase duas vezes (Lucas 19:3).
function jaCitado(antes, verso) {
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const a = norm(String(antes).slice(-260)), w = norm(verso).split(' ');
  for (let i = 0; i + 4 <= w.length; i++) if (a.includes(w.slice(i, i + 4).join(' '))) return true;
  return false;
}
function referenciaEmTexto(biblia, bruto, antes = '') {
  const r = acharReferencias(' ' + bruto)[0];
  if (!r) return null;
  const t = textoDoVersiculo(biblia, r);
  if (!t) return null;
  const nome = LIVRO_NOME[r.abbrev] || r.abbrev;
  const ref = `${nome} ${r.cap}:${r.v1}${r.v2 && r.v2 !== r.v1 ? '-' + r.v2 : ''}`;
  if (jaCitado(antes, t)) return `(${ref})`;
  return `“${t}” (${ref})`;
}

// 16/11/2026: a conferência depois da pregação escrita. Uma IA barata confere atribuições, números e digitação
// contra as fontes que a Biblioteca realmente devolveu; devolve trocas exatas (de -> para) e pontos para conferir.
async function conferirFatos(texto, fontes, versos) {
  const p = [`PREGAÇÃO:\n${texto}`];
  if (versos.length) p.push('TEXTO DAS REFERÊNCIAS (Almeida):\n' + versos.map((v) => `${v.ref}: ${v.texto}`).join('\n'));
  if (fontes.length) p.push('FONTES DA BIBLIOTECA USADAS (o que cada autor realmente escreveu):\n'
    + fontes.map((x) => `■ ${x.autor}${x.obra ? ' — ' + x.obra : ''}${x.endereco ? ' (' + x.endereco + ')' : ''}\n${String(x.texto).slice(0, 900)}`).join('\n\n'));
  try {
    const r = await iaTexto({ sys: SYS_CONFERE, user: p.join('\n\n'), temperature: 0.1, max_tokens: 2500, tag: 'bereia-confere',
      fundo: true, prazoTotal: 60000 });
    const j = JSON.parse(String(r.texto || '').replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1'));
    return {
      ok: true,
      trocas: (Array.isArray(j.trocas) ? j.trocas : []).filter((t) => t && t.de && String(t.de).length <= 400).slice(0, 12),
      conferir: (Array.isArray(j.conferir) ? j.conferir : []).map((s) => String(s).slice(0, 200)).filter(Boolean).slice(0, 8),
    };
  } catch (_) { return { ok: false, trocas: [], conferir: [] }; }
}
function aplicarTrocas(md, trocas) {
  let n = 0;
  for (const t of trocas) {
    const de = String(t.de), i = md.indexOf(de);
    if (i < 0) continue;                       // trecho que não existe exatamente: não mexe
    md = md.slice(0, i) + String(t.para || '') + md.slice(i + de.length); n++;
  }
  return { md, n };
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

  // 16/11/2026: tamanho da pregação (Curta ~20 min padrão; Longa ~35-40 min). A palavra-guia é a mesma do prompt.
  const tam = b.tamanho === 'Longa' ? 'Longa' : 'Curta';
  const pedidoTam = pedido + `\nTAMANHO DA PREGAÇÃO: ${tam} (${tam === 'Longa' ? '2.100 a 2.400' : '1.000 a 1.300'} palavras)`;

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
      const r = await iaStreamTexto({ sys: SYS_PREGACAO, user: montarPedido(pedidoTam, plano, todas, notas, versos, cav.achados),
        temperature: 0.8, max_tokens: 14000, tag: 'bereia', premium: true, fundo: true, prazoTotal: 120000 });
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
          const t = biblia ? referenciaEmTexto(biblia, bruto, tudo + out + buf.slice(0, i)) : null;
          if (!t) refsRuins.push(bruto);
          out += buf.slice(0, i) + (t || '(' + bruto + ')');
          buf = buf.slice(f + 2);
        }
        await solta(out);
      }
      await solta(buf);

      // A CONFERÊNCIA (16/11/2026): confere atribuições, comparações e digitação contra as fontes da Biblioteca e
      // a Almeida. Trocas exatas entram no texto (a tela recebe o texto corrigido em 'final'); o resto vai aos avisos.
      await manda({ t: 'etapa', id: 'conferencia', msg: 'Conferindo os fatos, as citações e a digitação…' });
      const confe = await conferirFatos(tudo, todas, versos);
      let md = tudo;
      const troca = aplicarTrocas(md, confe.trocas);
      md = troca.md;
      // Tempo calculado pelo servidor (~60 palavras por minuto de pregação, a medida que o pastor usa: ~1.200 palavras = 20 min)
      const palavras = md.replace(/[#*>\[\]{}()_]/g, ' ').split(/\s+/).filter((w) => /\w/.test(w)).length;
      const minutos = Math.max(1, Math.round(palavras / 60));
      md = md.replace(/^(\s*-\s*\*\*Tempo:\*\*).*$/m, (_, ini) => ini + ` cerca de ${minutos} min de pregação (${palavras} palavras)`);
      if (md !== tudo) await manda({ t: 'final', md });
      const avisosConf = confe.conferir.map((c) => 'Fato para conferir: ' + c);
      if (!confe.ok) avisosConf.push('A conferência automática não rodou desta vez: confira as fontes das Notas antes de pregar.');
      await manda({ t: 'fim', avisos: conferir(md, refsRuins).concat(avisosConf), palavras, minutos });
    } catch (e) {
      await manda({ t: 'erro', msg: String((e && e.message) || e).slice(0, 200) });
    }
    try { await w.close(); } catch (_) {}
  })();

  return new Response(readable, { headers: { ...CORS, 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
}
