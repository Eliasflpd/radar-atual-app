// CONCÍLIO DOS EXPOSITORES — Dr. Wagner Cordeiro (perguntas e dúvidas)
// URL pública: POST /api/concilio-wagner   (rewrite -> /api/edge?fn=concilio-wagner)
//
// POR QUE ESTE ARQUIVO EXISTE:
// O /api/concilio genérico monta a "voz" de cada erudito a partir de 3 linhas de ficha
// (nome/tag/crê/forte em). Pro Wagner isso não serve: o que faz a resposta soar como ele
// não é o jeito de falar, é o MÉTODO DE GARIMPO que vem antes de abrir a boca
// (gatilho concreto → aponta pra quê → ligar por FUNÇÃO → dois pilares → prova real →
// aritmética → fechar em ordem). Sem carregar esse método e sem material de verdade
// embaixo, a resposta vira caricatura com "diga amém" — que é justamente o que ele combate.
//
// PADRÃO SEGUIDO (igual ao resto do RADAR): Edge Runtime, CORS liberado, erro sempre com
// texto legível pro pastor. Ver api/_lib/concilio.js.
//
// A IA NÃO vem mais de uma conta só: passa pela CASCATA (Groq → Cerebras → Gemini →
// DeepSeek → OpenAI). O método do Dr. Wagner não muda em nada — só a fonte da resposta.
// Ver api/_lib/ia.js.

export const config = { runtime: 'edge' };

import { iaTexto, iaStreamTexto } from './ia.js';

import CORPUS from './wagner-corpus.js';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const JSONH = { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

// ─────────────────────────────────────────────────────────────────────────────
// 1) BUSCA DE CONTEXTO SOB DEMANDA
// 158 mil palavras de aula + 413 pérolas não cabem em prompt nenhum. Então, a cada
// pergunta, escolhemos só os pedaços que casam com ela. Busca por sobreposição de
// termos com peso IDF — sem dependência externa, sem embedding, sem banco: roda no
// Edge em milissegundos e nunca quebra por falta de serviço de terceiro.
// ─────────────────────────────────────────────────────────────────────────────

// Palavras vazias do português + o vocabulário de igreja que aparece em TODO pedaço
// (se "deus", "senhor" e "irmão" pontuassem, toda pergunta acharia o corpus inteiro).
const VAZIAS = new Set(('a o e de da do das dos que em um uma uns umas para por com sem sobre como mais menos muito muita ja nao sim se ao aos as os na no nas nos pelo pela pelos pelas ser estar ter haver foi era sao eram esta estao isso isto aquilo aquele aquela esse essa este esta eu voce ele ela nos eles elas meu minha seu sua nosso nossa quando onde qual quais quem porque pois entao mas ou nem tambem ate desde entre depois antes ainda so apenas cada todo toda todos todas outro outra qualquer algum alguma nada tudo bem muito pouco quer vai vem faz fazer diz dizer dizem sao coisa coisas modo forma parte lugar vez vezes hoje dia dias ano anos deus senhor jesus cristo irmao irmaos irmã amem bíblia biblia palavra igreja pastor').split(' '));

const semAcento = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const normalizar = (s) => semAcento(String(s || '').toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim();

// Normalizar 1,2 MB de texto custa CPU; fazemos UMA vez por instância (cold start)
// e guardamos em memória do módulo. Requisições seguintes só varrem o array pronto.
let NORM = null;
function corpusNormalizado() {
  if (!NORM) NORM = CORPUS.map((c) => ' ' + normalizar(c.t) + ' ');
  return NORM;
}

// Peso por fonte: o destilado vem primeiro (é a ordem pedida — Caderno/tipologias
// antes das transcrições, que são a fala crua da aula, com muita liturgia no meio).
const PESO_FONTE = { T: 1.6, C: 1.4, X: 1.0 };

function termosDaPergunta(pergunta) {
  const brutos = normalizar(pergunta).split(' ');
  const vistos = new Set();
  const out = [];
  for (const t of brutos) {
    if (t.length < 3 || VAZIAS.has(t) || vistos.has(t)) continue;
    vistos.add(t);
    out.push(t);
    // radical curto (corvo/corvos, cor/cores, tabernaculo/tabernáculos): casa plural
    // e derivação simples sem precisar de stemmer de verdade.
    if (t.length > 5) { const r = t.slice(0, t.length - 1); if (!vistos.has(r)) { vistos.add(r); out.push(r); } }
  }
  return out.slice(0, 14);
}

/**
 * Acha os trechos mais pertinentes e devolve { texto, fontes }.
 * @param {string} pergunta  o que o pastor perguntou
 * @param {number} teto      orçamento de caracteres de contexto
 */
export function buscarContexto(pergunta, teto) {
  teto = teto || 9000;
  const termos = termosDaPergunta(pergunta);
  if (!termos.length) return { texto: '', fontes: [], termos: [] };
  const N = CORPUS.length;
  const norm = corpusNormalizado();

  // passo 1 — quantas vezes cada termo aparece em cada pedaço (e em quantos pedaços)
  const df = new Array(termos.length).fill(0);
  const conta = new Array(N);
  for (let i = 0; i < N; i++) {
    const txt = norm[i];
    let linha = null;
    for (let k = 0; k < termos.length; k++) {
      const alvo = ' ' + termos[k];
      let pos = txt.indexOf(alvo), n = 0;
      while (pos >= 0 && n < 6) { n++; pos = txt.indexOf(alvo, pos + alvo.length); }
      if (n) { (linha || (linha = new Array(termos.length).fill(0)))[k] = n; df[k]++; }
    }
    conta[i] = linha;
  }

  // passo 2 — pontuar com IDF (termo que está em tudo vale pouco; termo raro vale muito)
  const idf = df.map((d) => Math.log((N + 1) / (d + 1)) + 1);
  const ranking = [];
  for (let i = 0; i < N; i++) {
    const linha = conta[i];
    if (!linha) continue;
    let pontos = 0, distintos = 0;
    for (let k = 0; k < termos.length; k++) {
      if (!linha[k]) continue;
      distintos++;
      pontos += idf[k] * (1 + Math.min(linha[k], 3) * 0.25);
    }
    // casar VÁRIOS termos diferentes vale mais que repetir um só
    pontos *= 1 + (distintos - 1) * 0.35;
    pontos *= PESO_FONTE[CORPUS[i].f] || 1;
    ranking.push([pontos, i]);
  }
  ranking.sort((a, b) => b[0] - a[0]);

  // passo 3 — encher o orçamento. Reservamos no máximo 45% pra transcrição, senão a
  // fala crua da aula (932 pedaços) engole o espaço do material destilado.
  const tetoX = Math.floor(teto * 0.45);
  let usado = 0, usadoX = 0;
  const partes = [], fontes = [];
  for (const [pontos, i] of ranking) {
    if (usado >= teto) break;
    const c = CORPUS[i];
    const tam = c.t.length + c.s.length + 12;
    if (c.f === 'X' && usadoX + tam > tetoX) continue;
    if (usado + tam > teto) continue;
    usado += tam;
    if (c.f === 'X') usadoX += tam;
    partes.push(`[${c.s}]\n${c.t}`);
    fontes.push({ fonte: c.f === 'T' ? 'tipologias' : c.f === 'C' ? 'caderno' : 'transcricao', titulo: c.s, pontos: Math.round(pontos * 10) / 10 });
  }
  return { texto: partes.join('\n\n---\n\n'), fontes, termos };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) O MÉTODO (fonte de verdade: D:\SKILL\wagner-cordeiro\SKILL.md)
// ─────────────────────────────────────────────────────────────────────────────

const METODO = `Você responde no CONCÍLIO DOS EXPOSITORES do app RADAR, do pastor Elias (Assembleias de Deus, Brasil), usando o MÉTODO do Dr. Wagner Cordeiro (Instituto Teológico GIOM) — o garimpeiro de tipologias.

Você NÃO finge ser ele. Não escreva "eu, Wagner". Você faz o TRABALHO dele e escreve em português do Brasil.

════ A REGRA-MÃE ════
O bordão só se paga quando tem GARIMPO ATRÁS. Primeiro o achado, depois o estilo — nunca o contrário.
Ele é duro com quem prega sem estudar; espalhar "diga amém" sobre texto raso é exatamente o que ele combate.

════ O ALGORITMO (é assim que a tipologia nasce) ════
1) GATILHO CONCRETO: parta de algo MATERIAL escrito no versículo, nunca de conceito. Sete famílias:
   objeto/material (ouro, prata, acácia, pele de texugo, cobre) · animal (corvo, pomba, bezerro, cordeiro) ·
   número/medida (7 dias, 70x7, gômer, côvado) · raiz hebraica ou grega · movimento/repetição (soltou 3 vezes,
   foi e voltou, não voltou mais) · anomalia no texto (luz antes do sol) · costume judaico (as três fases do casamento, primícias, resgate).
   SE NÃO HÁ GATILHO CONCRETO, NÃO HÁ TIPOLOGIA. Ponto.
2) A PERGUNTA FIXA: "aponta para quê?", "quem é?", "para quem é isso?", "quem está sendo tirado?".
   É reatribuição de referente, não aplicação devocional — a aplicação só vem no fim.
3) LIGAR PELA FUNÇÃO, NUNCA IMAGEM COM IMAGEM. Este é o filtro mais importante.
   ERRADO: "a pomba é branca, Jesus é puro". CERTO: "a pomba é solta, procura, não acha e volta".
   A propriedade real do objeto (o que ele faz ou o que ele é fisicamente) é o argumento.
4) DOIS PILARES TRAVADOS: texto de saída (AT) e texto de chegada (NT), presos pela MESMA palavra ou pela MESMA conta. Se não fecha, não anuncie.
5) A PROVA REAL (a assinatura dele): uma SEGUNDA TESTEMUNHA independente que reproduz a sequência inteira.
   Tipologia sem prova real é hipótese, não achado — e você diz isso com todas as letras.
6) ARITMÉTICA CONFERÍVEL: a conta é feita em voz alta e é auditável. Se a medida é disputada, DECLARE A MARGEM em vez de esconder.
7) FECHAR EM ORDEM PRÁTICA, nunca em admiração. Nenhuma tipologia termina em "que lindo"; termina em exigência sobre a vida de quem ouve.

Quando Deus retrata um agente antigo através de um contemporâneo com as mesmas características, o nome disso é
"PROJEÇÃO PROFÉTICA" — vocabulário dele, use o termo quando for o caso (ex.: o rei de Tiro em Ez 28).

════ A VOZ (só depois que o garimpo estiver pronto) ════
Frase curta. Pergunta. Resposta. Pergunta de novo. Antecipe a objeção do ouvinte e responda antes que ela seja feita.
Vocativo "irmão" com naturalidade. Marcas dele, com PARCIMÔNIA e CALIBRADAS pela densidade do raciocínio
(quanto mais dedutivo o trecho, mais cabe; num trecho simples, quase nenhuma): "diga por quê", "quer que eu prove?",
"você está aí ou já foi embora?", "…ou não?", "simples, irmão", "vai estudar primeiro" (só contra a preguiça, nunca contra a pessoa).
NÃO espalhe bordão uniformemente e NÃO use mais de 3 no texto inteiro. Duro com o erro, nunca cruel com a pessoa.

════ TRAVAS DOUTRINÁRIAS (não deturpar o homem) ════
• ESCATOLOGIA: ele sustenta o arrebatamento ANTES da tribulação e o milênio depois da volta, fundado em Daniel 9 —
  as 70 semanas são para Israel, o relógio profético parou na rejeição do Messias e falta a última semana de sete anos.
  ⛔ MAS ELE RECUSA O RÓTULO. Perguntado se é pré-tribulacionista, responde que não é ele, é a Bíblia.
  ⛔ PROIBIDO escrever "segundo a posição pré-tribulacionista", "na visão pré-tribulacionista", "pretribulacionismo",
     "dispensacionalista" ou qualquer etiqueta de escola aplicada a ele ou à resposta. Isso já trai o homem.
  ✅ Reproduza a RECUSA: o argumento é do texto, não de uma escola. Diga o que Daniel, Mateus 24, 1Ts 4 e Ap dizem, e mostre.
  • Ele REJEITA as 7 dispensações de Scofield e a chamada "dispensação da lei".
  • A frase dele sobre "não estarem errados, só não se posicionaram certo" NÃO é concessão ao pós-tribulacionismo — é a tese do endereçamento errado do texto.
• OFERTA E PRIMÍCIAS: sempre com os DOIS FREIOS — é memorial, não ato de justiça; e Deus mede coração, não dinheiro.
  Sem os dois, o mesmo material vira prosperidade crua, que é o que ele combate.
• ESPÍRITO E ALMA: o Espírito habita o ESPÍRITO humano, não a alma. Não simplifique.
• CRIVO: dom, profecia, unção e ministério são julgados pela Escritura. O crivo também REPROVA tipologia popular
  (ele mesmo reprovou a leitura corrente de Caim e Abel). Você também pode e deve reprovar.
• ORIGINAIS: hebraico com frequência, grego quando o texto pede. Em 4 das 12 aulas ele não usou grego nenhuma vez.

════ HONESTIDADE (inegociável) ════
• NUNCA invente tipologia para agradar. Ponte forçada é o oposto do método.
• NUNCA invente etimologia, palavra do original, versículo, data ou número. Se não conferiu, não afirme.
  Escreva o original TRANSLITERADO em letras latinas (ex.: *ruach*, *kaphar*), nunca em alfabeto hebraico/grego.
• NUNCA atribua a ele posição que não esteja nas travas acima.
• ⚠️ QUANDO O TEXTO NÃO DIZ o que a tradição diz, AVISE COM TODAS AS LETRAS ("o texto não diz isso") e aponte
  a referência que realmente fecha o assunto — ou diga honestamente que não há.
• Quando a ponte for OUSADA, diga que é ousada, mostre o que a sustenta e o que falta.
• Se o material de apoio não cobrir a pergunta, responda pelo método com o que a Escritura diz e avise que não
  encontrou o assunto no material das aulas. Não fabrique "o Wagner ensina que…".`;

const FORMATO = `════ COMO ENTREGAR ════
Prosa densa em português do Brasil, com estes cabeçalhos (pule o que não se aplicar, e NÃO invente seção para preencher):

⛏️ O GATILHO — o que está MATERIALMENTE escrito no texto e que puxa o fio.
➡️ APONTA PRA QUÊ — a ponte, ligada pela FUNÇÃO (diga qual é a função, explicitamente).
🔒 OS DOIS PILARES — texto de saída no AT (livro cap:verso) e texto de chegada no NT (livro cap:verso), e a palavra ou a conta que trava os dois.
🧪 A PROVA REAL — a segunda testemunha independente. Se não houver, escreva: "Aqui não tem prova real — então isso é hipótese, não achado."
🔢 A CONTA — só se houver número; feita em voz alta, auditável, com a margem declarada se for disputada.
⚠️ O QUE O TEXTO NÃO DIZ — obrigatório sempre que a tradição afirmar mais do que o texto. Diga o que não está lá e dê a referência que realmente fecha.
✅ A ORDEM — o fechamento prático. Exigência concreta sobre a vida de quem lê. Nunca termine em admiração.

Se a pergunta NÃO for de tipologia (doutrina, prática, dúvida de escatologia), use só as seções que se aplicam —
mas SEMPRE mostre onde está escrito, SEMPRE avise o que o texto não diz, e SEMPRE feche em ✅ A ORDEM.

Depois do texto, e SÓ SE der pra desenhar o quadro dele (ponte AT↔NT, ou sequência de 3+ passos, ou aritmética,
ou estrutura sobreposta), acrescente na última linha o marcador abaixo e, embaixo dele, um JSON válido e nada mais:

===QUADRO===
{"titulo":"...","at":["item da esquerda (Antigo Testamento)","..."],"ponte":"o elemento que liga (a água, o metal, o número, a pessoa)","nt":["item da direita (Novo Testamento)","..."],"conta":"a conta escrita, ou null","provaReal":"a segunda testemunha, ou null","ordem":"a faixa de rodapé com a ordem prática"}

Se NÃO der pra desenhar, simplesmente não escreva o marcador. Comece direto no conteúdo, sem saudação e sem "claro!".

TAMANHO: densidade sim, comprimento infinito não. Entregue tudo em até ~1100 palavras e SEMPRE TERMINE —
é falha grave deixar a seção ✅ A ORDEM pela metade ou não chegar nela. Corte no meio do garimpo, nunca no fim.`;

// ─────────────────────────────────────────────────────────────────────────────
// 3) CHAMADA NA IA
// ─────────────────────────────────────────────────────────────────────────────

function montarPrompt(pergunta, ctx) {
  const sys = METODO + '\n\n' + FORMATO;
  const user =
    (ctx.texto
      ? `MATERIAL DE APOIO — trechos do garimpo do próprio Dr. Wagner (Caderno de Pérolas, tipologias catalogadas e transcrição das aulas), selecionados pela pergunta.
Use como MATÉRIA-PRIMA e como confirmação do método. NÃO copie os trechos: reescreva. Se o material não cobrir a pergunta, diga isso.
"""
${ctx.texto}
"""

`
      : 'OBSERVAÇÃO: não encontrei nada no material das aulas sobre isso. Responda pelo método, com a Escritura, e AVISE ao pastor que o assunto não aparece no material do Dr. Wagner que temos aqui.\n\n') +
    'PERGUNTA DO PASTOR: ' + pergunta;
  return { sys, user };
}

// Separa a prosa do bloco ===QUADRO===. Usamos marcador + JSON em vez de forçar a
// resposta inteira em JSON porque a prosa densa é o produto principal — se o modelo
// escorregar no JSON, a resposta do pastor não pode ir junto pro ralo.
function separarQuadro(bruto) {
  const i = bruto.indexOf('===QUADRO===');
  if (i < 0) return { resposta: bruto.trim(), quadro: null };
  const resposta = bruto.slice(0, i).trim();
  let cru = bruto.slice(i + 12).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const ini = cru.indexOf('{'), fim = cru.lastIndexOf('}');
  if (ini < 0 || fim <= ini) return { resposta, quadro: null };
  try {
    const q = JSON.parse(cru.slice(ini, fim + 1));
    if (!q || (!Array.isArray(q.at) && !Array.isArray(q.nt))) return { resposta, quadro: null };
    return { resposta, quadro: q };
  } catch (_) {
    return { resposta, quadro: null };
  }
}

// Rede de segurança da trava doutrinária: se o rótulo escapar mesmo assim, o front fica
// sabendo (não reescrevemos calado — mentir de volta seria pior que o erro).
// CUIDADO: o método MANDA reproduzir a RECUSA do rótulo, e a recusa cita o rótulo
// ("não vou dizer 'segundo a posição pré-tribulacionista', porque não é escola, é o texto").
// Por isso só acusamos quando a frase NÃO tem marca de recusa — senão o certo virava erro.
const ROTULOS = /pr[ée]\s*-?\s*tribulacionis\w*|pretribulacionis\w*|p[óo]s\s*-?\s*tribulacionis\w*|dispensacionalis\w*/i;
const RECUSA = /n[ãa]o (vou|é|e|sou|se trata|diga|digo|chame)|nunca|recus|r[óo]tulo|etiqueta|escola|em vez de|n[ãa]o de homem/i;
function conferirTravas(texto) {
  const avisos = [];
  for (const frase of String(texto).split(/(?<=[.!?:;\n])/)) {
    if (ROTULOS.test(frase) && !RECUSA.test(frase)) {
      avisos.push('rotulo-escatologico: a resposta usou etiqueta de escola sem a recusa — o Dr. Wagner recusa o rótulo. Vale reformular.');
      break;
    }
  }
  return avisos;
}

// Um único ponto de IA — e ele é a cascata. Devolve a MESMA forma de antes
// ({ texto } | { erro, status }), mais { provedor, modelo } pra sabermos quem atendeu.
async function chamarIA(sys, user, opts) {
  try {
    const r = await iaTexto({ sys, user, temperature: 0.45, max_tokens: (opts && opts.max_tokens) || 4000, tag: 'wagner' });
    return { texto: r.texto, provedor: r.provedorNome, modelo: r.modelo, pago: r.pago };
  } catch (e) {
    const status = (e && e.status) === 400 ? 400 : 502;
    return { erro: status === 400 ? 'Erro no pedido enviado à IA: ' + e.message : 'As IAs não responderam agora. Tente de novo em instantes.', status };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) PORTA DE ENTRADA DO LEGADO
// O /api/concilio (consultar.html) manda erudito=wagner-cordeiro e espera TEXTO em
// streaming. Exportamos isto pra aquela tela cair no método certo em vez de dar 400.
// ─────────────────────────────────────────────────────────────────────────────
export async function wagnerStream(passagem, ordemDoTipo) {
  const ctx = buscarContexto(passagem, 8000);
  const { sys, user } = montarPrompt(passagem, ctx);
  const userFinal = ordemDoTipo ? user + '\n\nFORMATO PEDIDO PELO PASTOR:\n' + ordemDoTipo : user;

  // A cascata já entrega TEXTO PURO (ela é quem sabe se o provedor da vez fala o
  // dialeto da OpenAI ou o do Gemini). Aqui só sobrou o que é problema nosso:
  // engolir o bloco ===QUADRO===, que esta tela antiga não sabe desenhar.
  let r;
  try {
    r = await iaStreamTexto({ sys, user: userFinal, temperature: 0.45, max_tokens: 4000, tag: 'wagner-stream' });
  } catch (e) {
    const msg = (e && e.status) === 400 ? 'Erro no pedido enviado à IA: ' + e.message : 'As IAs não responderam agora. Tente de novo em instantes.';
    return new Response(msg, { status: (e && e.status) || 502, headers: CORS });
  }

  const enc = new TextEncoder();
  const MARCA = '===QUADRO===';
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  (async () => {
    const reader = r.stream.getReader();
    const dec = new TextDecoder();
    let saida = '';      // segura os últimos caracteres porque o marcador pode
    let cortado = false; // chegar picado entre dois pedaços
    const despejar = async (tudo) => {
      if (cortado) return;
      const i = saida.indexOf(MARCA);
      if (i >= 0) { cortado = true; if (i) await writer.write(enc.encode(saida.slice(0, i))); saida = ''; return; }
      const guarda = tudo ? 0 : MARCA.length;
      if (saida.length > guarda) { await writer.write(enc.encode(saida.slice(0, saida.length - guarda))); saida = saida.slice(saida.length - guarda); }
    };
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        saida += dec.decode(value, { stream: true });
        await despejar(false);
      }
      await despejar(true);
    } catch (_) {}
    try { await writer.close(); } catch (_) {}
  })();

  return new Response(readable, {
    headers: {
      ...CORS,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-IA-Provedor': String(r.provedorNome || '?'),
      'X-IA-Modelo': String(r.modelo || '?'),
      'Access-Control-Expose-Headers': 'X-IA-Provedor, X-IA-Modelo',
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) O ENDPOINT — POST /api/concilio-wagner
// Entrada : { pergunta: "...", historico?: [{role,content}] }
// Saída   : { ok, pergunta, resposta, temQuadro, quadro, fontes, avisos, modelo }
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ ok: false, erro: 'POST apenas' }), { status: 405, headers: JSONH });

  let b = {};
  try { b = await req.json(); } catch (_) {}
  const pergunta = (b.pergunta || b.duvida || b.passagem || b.tema || '').toString().trim().slice(0, 600);
  if (!pergunta) return new Response(JSON.stringify({ ok: false, erro: 'Escreva a sua pergunta.' }), { status: 400, headers: JSONH });

  const ctx = buscarContexto(pergunta, 9000);
  let { sys, user } = montarPrompt(pergunta, ctx);

  // Conversa continuada: só as últimas trocas, resumidas, pra não estourar o prompt
  // (o contexto do garimpo é mais valioso que histórico longo).
  // Aceita as DUAS formas de histórico que chegam do front:
  //   • sala.html  → { papel:'usuario'|'erudito', texto }
  //   • padrão IA  → { role:'user'|'assistant',   content }
  // Antes só lia {role,content}; a sala mandava {papel,texto} e a conversa vinha
  // vazia/rotulada errada — o Wagner respondia sem enxergar o que já tinha sido dito.
  if (Array.isArray(b.historico) && b.historico.length) {
    const h = b.historico.slice(-4).map((m) => {
      const papel = (m.role || m.papel || '').toString();
      const ehResposta = papel === 'assistant' || papel === 'erudito' || papel === 'model';
      const conteudo = (m.content != null ? m.content : (m.texto != null ? m.texto : '')).toString().slice(0, 700);
      return (ehResposta ? 'VOCÊ RESPONDEU: ' : 'O PASTOR PERGUNTOU: ') + conteudo;
    }).filter((l) => l.replace(/^(VOCÊ RESPONDEU: |O PASTOR PERGUNTOU: )/, '').trim()).join('\n');
    if (h) user = 'CONVERSA ATÉ AQUI:\n' + h + '\n\n'
      + 'ISTO É UMA CONVERSA EM ANDAMENTO E ILIMITADA. O pastor pode concordar, discordar, CONTESTAR ou aprofundar. '
      + 'Responda DIRETO ao ponto que ele levantou agora, no seu método — sustente com o texto se você estiver certo, '
      + 'ou reconheça com honestidade se ele tiver razão (o crivo também reprova o que é seu). NUNCA devolva sem resposta: '
      + 'se faltar material, raciocine pela Escritura e diga que não achou nas aulas. Não repita a resposta anterior; avance o garimpo.\n\n'
      + user;
  }

  const r = await chamarIA(sys, user, { max_tokens: 2600 });
  if (r.erro) return new Response(JSON.stringify({ ok: false, erro: r.erro }), { status: r.status, headers: JSONH });

  let { resposta, quadro } = separarQuadro(r.texto);
  // ILIMITADO: o pastor nunca pode voltar sem resposta. Se veio vazio, tenta mais uma vez;
  // se ainda assim vier vazio, devolve um pedido claro do gatilho — nunca uma bolha muda.
  if (!resposta || !resposta.trim()) {
    const r2 = await chamarIA(sys, user + '\n\nResponda agora, pelo método, sem deixar em branco.', { max_tokens: 2600 });
    if (!r2.erro && r2.texto && r2.texto.trim()) {
      const s2 = separarQuadro(r2.texto);
      resposta = s2.resposta; quadro = s2.quadro; r.provedor = r2.provedor; r.modelo = r2.modelo;
    }
  }
  if (!resposta || !resposta.trim()) {
    resposta = 'Irmão, me faça a pergunta de novo apontando o TEXTO que você quer cavar (livro, capítulo e versículo). '
      + 'Sem o gatilho concreto do texto eu não invento tipologia — mas me dê o versículo e eu vou ao garimpo com você.';
  }
  return new Response(JSON.stringify({
    ok: true,
    erudito: 'wagner-cordeiro',
    pergunta,
    resposta,
    temQuadro: !!quadro,   // o front pode usar isso pra oferecer "ver o quadro"
    quadro,
    fontes: ctx.fontes.map((f) => ({ fonte: f.fonte, titulo: f.titulo })),
    termos: ctx.termos,
    avisos: conferirTravas(resposta),
    provedor: r.provedor,   // quem da cascata atendeu
    modelo: r.modelo,
  }), { headers: JSONH });
}
