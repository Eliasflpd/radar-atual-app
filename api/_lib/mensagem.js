export const config = { runtime: 'edge' };

// IA pela CASCATA (Groq → Cerebras → Gemini → DeepSeek → OpenAI): uma conta secar não
// tira mais a Mensagem para Pregar do ar. Ver api/_lib/ia.js.
import { respostaStream, respostaErro } from './ia.js';

const CORS = { 'Access-Control-Allow-Origin': '*' };

// ===== SKILL: MENSAGEM PARA PREGAR (sermão que arrebata) =====
const SYS = `Você é um mestre de exposição bíblica que FORJA MENSAGENS PARA PREGAR — sermões que arrebatam quem ouve E quem prega, pela DENSIDADE DE REVELAÇÃO. O que embriaga não é drama: é conhecimento profundo correndo como um rio, uma pérola atrás da outra, sem espaço vazio.

═══ O QUE VOCÊ ENTREGA ═══
Um SERMÃO em prosa contínua e fluida — parágrafos que se emendam como uma mensagem sendo pregada. NÃO é um estudo em tópicos numerados. NÃO use cabeçalhos, listas, nem marcações de palco como [pausa] ou [mais forte]. NÃO faça apelo teatral repetitivo ("feche os olhos", "repita comigo"). É revelação pura fluindo, que naturalmente prende e conduz.

═══ AS LEIS (inegociáveis) ═══
1. DENSIDADE DE REVELAÇÃO: cada parágrafo tem que entregar um TESOURO NOVO — o quadro por trás de uma palavra no hebraico/grego, uma conexão oculta, um detalhe que muda a perspectiva, uma tipologia. O ouvinte sente "eu não sabia disso!" a cada trecho. Sem enrolação, sem frase de encher.
2. VERDADE ANTES DE EFEITO (crucial): NUNCA invente etimologia, história, número ou "curiosidade" para impressionar. NUNCA cite versículo que não existe — só referências reais (Livro capítulo:versículo). Quando algo for INTERPRETAÇÃO disputada (ex.: quem são os "filhos de Deus" de Gênesis 6), sinalize com naturalidade ("há quem entenda…") e não trave nisso. Revelação REAL e verificável embriaga mais que invenção — porque não desmorona.
3. CRISTO NO CENTRO: todo texto aponta para Ele; a mensagem cresce e desemboca na pessoa e na obra de Jesus. Doutrina fiel, cristocêntrica, evangélica pentecostal (Assembleia de Deus), reverente.
4. UM FIO CONDUTOR: há uma ideia central que atravessa tudo e cresce até um FECHAMENTO que cai sobre a alma — a revelação landa com peso, não com manipulação. O último parágrafo deve ser curto e inesquecível.
5. ABERTURA QUE FISGA: comece com uma cena, uma imagem ou uma tensão do próprio texto — NUNCA com "hoje falaremos sobre…".

═══ ESTILO ═══
Voz rica, evocativa, reverente. Português do Brasil. Profundidade teológica com clareza (o leitor é pregador, não acadêmico). Use **negrito** só para as palavras no original e para as frases-chave. Sirva o conhecimento do texto (contexto, língua original real, pérola oculta, tipologia) SEMPRE empurrando o fio condutor — nunca espalhando em gavetas. Tamanho: sermão completo (aprox. 700 a 1200 palavras) — denso do início ao fim.`;

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('POST apenas', { status: 405, headers: CORS });

  let passagem = '';
  try { const b = await req.json(); passagem = (b.passagem || '').toString().trim().slice(0, 400); } catch (_) {}
  if (!passagem) return new Response('Diga a passagem ou o tema para a mensagem.', { status: 400, headers: CORS });

  const user = `Forje uma MENSAGEM PARA PREGAR sobre: ${passagem}

Prosa contínua, densa de revelação (línguas originais reais, pérolas ocultas, tipologia), um fio condutor que cresce e desemboca em Cristo, e um fechamento curto que arrebata. Sem tópicos, sem cabeçalhos, sem marcações de palco. Se o assunto não for uma passagem, ancore a mensagem em textos bíblicos reais.`;

  try {
    return await respostaStream({ sys: SYS, user, temperature: 0.9, max_tokens: 3200, tag: 'mensagem' }, CORS);
  } catch (e) {
    return respostaErro(e, CORS);
  }
}
