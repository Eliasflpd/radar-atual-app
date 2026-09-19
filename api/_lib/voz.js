// CONVERSA POR VOZ COM O CONCÍLIO — Dr. Wagner Cordeiro (Gemini Live, áudio↔áudio)
// URL pública: POST /api/voz   (rewrite -> /api/edge?fn=voz)
//
// POR QUE ESTE ARQUIVO EXISTE E POR QUE ELE É TÃO PEQUENO:
// Conversa de voz é uma conexão WebSocket ABERTA, que dura a sessão inteira. O plano
// Hobby da Vercel corta função em 300s — se o servidor segurasse esse socket, a conversa
// morria no meio da frase. Então o servidor NÃO fica no caminho do áudio. Ele faz uma
// coisa só, rápida: assina um TOKEN EFÊMERO no Google e devolve. O NAVEGADOR conecta
// direto em generativelanguage.googleapis.com e o áudio nunca passa por aqui.
//
// A CHAVE REAL NUNCA VAI PRO NAVEGADOR. Ela só existe aqui dentro (env da Vercel), no
// cabeçalho x-goog-api-key da chamada de assinatura. O que desce pro celular do pastor
// é um token de uso único que expira em minutos.
//
// COMO A PERSONA FICA TRAVADA (isto é segurança, não capricho):
// O token é assinado COM o setup inteiro embutido (modelo, voz, instrução de sistema,
// ferramentas) e SEM fieldMask. Pela regra do Google, fieldMask vazio + setup presente
// significa "o setup da conexão é IGNORADO, vale só o que está no token". Ou seja: mesmo
// que alguém pegue o token no meio do caminho, não consegue trocar o modelo, mudar a
// persona nem transformar isto num chatbot genérico à custa da conta do Elias.
// Consequência prática: pra RETOMAR uma sessão caída, o handle tem que ser assinado num
// token NOVO (o front manda { handle }), porque o setup do navegador não é lido.
//
// O CORPUS (1,28 MB) NÃO ENTRA NA SESSÃO. Cabe 131 mil tokens de contexto, e mandar o
// corpus inteiro comeria a janela toda e a latência junto. Em vez disso o mestre ganha
// uma FERRAMENTA (`garimpar`): quando ele precisa do material das aulas, ele pede, o
// navegador vem buscar aqui em /api/voz?acao=garimpo e devolve só o trecho que casa.
// A busca é a MESMA de /api/concilio-wagner (buscarContexto) — um método só, sem cópia.

export const config = { runtime: 'edge' };

// Reaproveita o garimpo do handler de texto. NÃO duplicamos a busca: se ela melhorar lá,
// melhora aqui no mesmo instante. (wagner-corpus.js já vem no bundle do edge por causa
// do /api/concilio-wagner — esta rota não acrescenta peso nenhum ao deploy.)
import { buscarContexto } from './concilio-wagner.js';
// A instrução de sistema é a MESMA do Concílio escrito — método, travas doutrinárias e
// honestidade. Importada, não copiada: se o Elias corrigir uma trava lá, a voz obedece
// na mesma hora. O que muda aqui embaixo é só a ENTREGA (falar ≠ escrever).
import { METODO } from './concilio-wagner.js';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const JSONH = { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

const MODELO = 'models/gemini-3.8-live';

// A VOZ DO MESTRE.
// O Google rotula cada timbre. Pra um professor que ensina firme, só quatro servem:
//   Orus        — "Firm" (firme). É a que fica de padrão: voz masculina, assertiva, de quem ensina.
//   Charon      — "Informative" (informativa). Mais grave e expositiva, um pouco mais fria.
//   Sadaltager  — "Knowledgeable" (douta). Cheira a erudito; menos calor humano.
//   Gacrux      — "Mature" (madura). Mais velha, mais pausada.
// O pastor ouve as quatro PARADO e, se quiser trocar, abre a página com ?voz=Charon.
// A lista é fechada de propósito: ninguém injeta nome de voz arbitrário no token.
const VOZES = ['Orus', 'Charon', 'Sadaltager', 'Gacrux'];
const VOZ_PADRAO = 'Orus';
function escolherVoz(pedida) {
  const p = String(pedida || '').trim();
  return VOZES.find((v) => v.toLowerCase() === p.toLowerCase()) || VOZ_PADRAO;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) COMO ELE FALA (substitui o FORMATO escrito: nada de cabeçalho, emoji ou JSON)
// ─────────────────────────────────────────────────────────────────────────────
const FALA = `════ AGORA VOCÊ ESTÁ FALANDO, NÃO ESCREVENDO ════
Isto é uma CONVERSA POR VOZ, ao vivo, em português do Brasil. O pastor pode estar dirigindo.
Tudo o que você disser vai virar som — então nada de formatação.

• PROIBIDO em voz: cabeçalho, emoji, asterisco, marcador, numeração, markdown, o bloco ===QUADRO=== e qualquer
  seção tipo "O GATILHO:" ou "A ORDEM:". Fale as mesmas coisas, mas FALANDO, do jeito que um homem fala.
• TURNO CURTO. De três a seis frases e devolva a palavra. É conversa, não preleção — se o assunto for grande,
  entregue o primeiro degrau e pergunte se ele quer que você avance. NUNCA despeje a exposição inteira de uma vez.
• Referência bíblica SEMPRE por extenso, do jeito que se lê em voz alta: "Gênesis vinte e dois, versículo oito",
  nunca "Gn 22:8".
• Palavra do original TRANSLITERADA e falada devagar, e diga o que ela quer dizer logo em seguida.
• Número e conta: fale a conta em voz alta, pausado, pra ele conferir de cabeça enquanto dirige.
• Se ele te CORTAR no meio, pare na hora e responda o que ele acabou de levantar. Não volte pro que você estava
  dizendo a não ser que ele peça — quem manda na conversa é ele.
• Se não entendeu o que ele falou (barulho, rua, rádio), diga que não pegou e peça pra repetir. NÃO CHUTE.
• Sem saudação de robô, sem "claro!", sem "espero ter ajudado", sem se oferecer pra "ajudar em mais alguma coisa".
• Abertura da conversa: cumprimente curto, diga que é o método do Dr. Wagner Cordeiro e pergunte qual texto ele
  quer cavar hoje. Uma ou duas frases, no máximo.

════ A FERRAMENTA garimpar ════
Você tem acesso ao material real do Dr. Wagner (Caderno de Pérolas, tipologias catalogadas e a transcrição das
aulas). Ele NÃO está na sua memória: você tem que ir buscar.
• CHAME garimpar ANTES de afirmar que "o Dr. Wagner ensina" qualquer coisa. Sem consultar, você não sabe.
• Chame também quando o pastor apontar um texto, um objeto, um número ou um costume e você for cavar.
• Enquanto busca, pode dizer uma frase curta tipo "deixa eu ver aqui no material" — não fique mudo.
• Se voltar vazio, DIGA com todas as letras que não achou esse assunto no material das aulas, e então raciocine
  pela Escritura, pelo método, avisando que a partir dali é você trabalhando e não o material dele.`;

const SISTEMA = METODO + '\n\n' + FALA;

const FERRAMENTAS = [{
  functionDeclarations: [{
    name: 'garimpar',
    description: 'Busca no material real do Dr. Wagner Cordeiro (Caderno de Pérolas, tipologias catalogadas e transcrições das aulas). '
      + 'Use ANTES de afirmar o que ele ensina, e sempre que for cavar um texto, um objeto, um número, uma raiz do original ou um costume judaico. '
      + 'Devolve os trechos que mais casam com o assunto.',
    parameters: {
      type: 'OBJECT',
      properties: {
        assunto: {
          type: 'STRING',
          description: 'O que procurar, em português, com as palavras CONCRETAS do texto (ex.: "corvo pomba arca Noé", '
            + '"pele de texugo tabernáculo", "setenta semanas Daniel"). Termos concretos acham; termos vagos não.',
        },
      },
      required: ['assunto'],
    },
  }],
}];

// ─────────────────────────────────────────────────────────────────────────────
// 2) AS CHAVES — mesmo padrão do resto do app (rodízio entre as 3)
// ─────────────────────────────────────────────────────────────────────────────
function chaves() {
  const out = [];
  for (const nome of ['GEMINI_API_KEYS', 'GEMINI_API_KEY', 'GOOGLE_API_KEY']) {
    const bruto = (typeof process !== 'undefined' && process.env && process.env[nome]) || '';
    for (const k of String(bruto).split(/[,\s;]+/)) {
      const t = k.trim();
      if (t && !out.includes(t)) out.push(t);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) ASSINAR O TOKEN EFÊMERO
// ─────────────────────────────────────────────────────────────────────────────
function setupDaSessao(handle, voz) {
  const setup = {
    model: MODELO,
    generationConfig: {
      responseModalities: ['AUDIO'],
      // pt-BR nativo, confirmado na lista de idiomas aceitos pelo campo languageCode.
      speechConfig: { languageCode: 'pt-BR', voiceConfig: { prebuiltVoiceConfig: { voiceName: escolherVoz(voz) } } },
      temperature: 0.55,
    },
    systemInstruction: { parts: [{ text: SISTEMA }] },
    tools: FERRAMENTAS,
    // O servidor manda um handle a cada tanto; guardando ele, uma queda de rede não
    // apaga a conversa — o front pede token novo com o handle e retoma do ponto.
    sessionResumption: handle ? { handle } : {},
    // Sessão morre em 15 min sem isto. Com a janela deslizante, ela segue além disso:
    // o servidor descarta o começo do contexto em vez de encerrar.
    contextWindowCompression: { slidingWindow: {}, triggerTokens: '16000' },
    // As duas transcrições existem pra TELA: é assim que o pastor enxerga o que ele
    // falou e o que o mestre respondeu enquanto dirige. Não alteram o áudio.
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: {
      // O CORAÇÃO DO PEDIDO DO ELIAS: falou por cima, o mestre CALA na hora.
      activityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
      automaticActivityDetection: {
        // Dentro do carro tem motor, vento e rádio. Exigir um tiquinho mais de fala antes
        // de considerar "ele começou a falar" evita o mestre se calar por causa de barulho;
        // e esperar um pouco mais de silêncio evita cortá-lo no meio de uma pausa de raciocínio.
        prefixPaddingMs: 300,
        silenceDurationMs: 900,
        startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
        endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
      },
    },
  };
  return setup;
}

async function assinarToken(handle, voz) {
  const ks = chaves();
  if (!ks.length) return { erro: 'Não há chave do Gemini configurada no servidor (GEMINI_API_KEYS).', status: 500 };

  const agora = Date.now();
  const corpo = JSON.stringify({
    uses: 1,                                                    // um token, uma conexão
    expireTime: new Date(agora + 30 * 60 * 1000).toISOString(), // a sessão morre em 30 min
    newSessionExpireTime: new Date(agora + 2 * 60 * 1000).toISOString(), // e só pode ABRIR nos próximos 2 min
    bidiGenerateContentSetup: setupDaSessao(handle, voz),
    // fieldMask ausente DE PROPÓSITO: trava o setup inteiro no token (ver cabeçalho).
  });

  // Rodízio: 3 chaves grátis, e uma que estourou a cota não pode derrubar a conversa.
  // Começamos em um ponto que gira com o relógio pra não martelar sempre a mesma chave,
  // e daí percorremos TODAS antes de desistir.
  let ultimo = 'as chaves do Gemini não responderam';
  const inicio = (agora / 60000 | 0) % ks.length;
  for (let n = 0; n < ks.length; n++) {
    const chave = ks[(inicio + n) % ks.length];
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
        method: 'POST',
        headers: { 'x-goog-api-key': chave, 'Content-Type': 'application/json' },
        body: corpo,
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j && j.name) return { token: j.name };
      ultimo = (j && j.error && j.error.message) || ('HTTP ' + r.status);
      // 429/503 = cota ou aperto: tenta a próxima chave. 400 = nosso pedido está errado,
      // trocar de chave não conserta — para aqui e mostra o motivo de verdade.
      if (r.status === 400) break;
    } catch (e) {
      ultimo = e.message || 'falha de rede';
    }
  }
  return { erro: 'Não consegui abrir a linha de voz agora: ' + ultimo, status: 502 };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) O ENDPOINT
// POST /api/voz  { acao:'token', handle? }     -> { ok, token, url, modelo, expiraEm }
// POST /api/voz  { acao:'garimpo', assunto }   -> { ok, texto, fontes }
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ ok: false, erro: 'POST apenas' }), { status: 405, headers: JSONH });

  let b = {};
  try { b = await req.json(); } catch (_) {}
  const acao = (b.acao || 'token').toString();

  if (acao === 'garimpo') {
    const assunto = (b.assunto || b.q || '').toString().trim().slice(0, 300);
    // Teto curto de propósito: em voz, contexto gordo atrasa a resposta e o pastor sente
    // o silêncio. 4500 caracteres é o suficiente pra sustentar um garimpo falado.
    const ctx = assunto ? buscarContexto(assunto, 4500) : { texto: '', fontes: [] };
    return new Response(JSON.stringify({
      ok: true,
      texto: ctx.texto || '',
      achou: !!ctx.texto,
      fontes: (ctx.fontes || []).map((f) => ({ fonte: f.fonte, titulo: f.titulo })),
    }), { headers: JSONH });
  }

  if (acao === 'token') {
    const handle = (b.handle || '').toString().slice(0, 4000) || null;
    const voz = escolherVoz(b.voz);
    const r = await assinarToken(handle, voz);
    if (r.erro) return new Response(JSON.stringify({ ok: false, erro: r.erro }), { status: r.status, headers: JSONH });
    return new Response(JSON.stringify({
      ok: true,
      token: r.token,   // <- é ISTO que desce pro navegador. A chave real fica aqui.
      modelo: MODELO,
      voz,
      // O endpoint "Constrained" é o que aceita token efêmero no lugar da chave.
      url: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained',
      retomando: !!handle,
      expiraEmMin: 30,
    }), { headers: JSONH });
  }

  return new Response(JSON.stringify({ ok: false, erro: 'ação desconhecida: ' + acao }), { status: 400, headers: JSONH });
}
