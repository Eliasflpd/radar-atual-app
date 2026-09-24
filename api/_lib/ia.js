// ─────────────────────────────────────────────────────────────────────────────
// CASCATA DE IA DO RADAR  —  api/_lib/ia.js
//
// POR QUE ESTE ARQUIVO EXISTE:
// Até hoje TODA chamada de IA do RADAR ia direto na OpenAI com UMA chave
// (OPENAI_API_KEY). No dia em que aquela conta secou, o Concílio dos Expositores e
// o Escavador de Pérolas caíram juntos (502 "You have no credits remaining").
// Este módulo é o ponto único por onde passa toda IA do app: ele tenta provedor
// por provedor, chave por chave, e só entrega erro quando TODOS falharem.
//
// ORDEM DOS DEGRAUS (velocidade COM qualidade; grátis primeiro, pago como rede rápida):
//   1. Groq       — grátis, ~2,0s   (o degrau que atende quase sempre)
//   2. DeepSeek   — PAGO, ~3,4s     (rede de segurança RÁPIDA, custo perto de zero)
//   3. Gemini     — grátis, ~5,2s
//   4. Z.ai       — grátis, LENTO   (só quando os de cima caírem)
//   5. NVIDIA     — grátis          (dorminhoco hoje; volta sozinho)
//   6. OpenRouter — grátis          (último recurso)
//
// ⚠️ ARMADILHA DO CLOUDFLARE: Groq e Cerebras ficam atrás do Cloudflare e devolvem
// 403 "error code 1010" quando a requisição não tem User-Agent de navegador. Parece
// chave morta e NÃO é. Por isso TODA chamada daqui manda o UA de Chrome (const UA).
//
// ─────────────────────────────────────────────────────────────────────────────
// MEDIÇÃO DE 19/09/2026 — a MESMA pergunta real ("Explique em 2 frases a tipologia
// da arca de Noé"), com o prompt INTEIRO do Wagner (sys 7.554 + contexto 9.216
// caracteres), max_tokens 2600, 3 a 4 rodadas por modelo. Tempo = resposta completa.
//
//   PROVEDOR / MODELO                     MÉDIA     OK     LIMPA?  SEÇÕES
//   Groq  gpt-oss-20b  reasoning=low      1,56s    4/4     sim     5/5
//   Groq  gpt-oss-120b reasoning=low      2,02s    3/4     sim     5/5   ← 1º
//   Groq  qwen3.8-27b                     2,32s    1/4     sim     5/5
//   Groq  gpt-oss-120b (sem reasoning)    3,85s    2/3     sim     5/5   ← era o que rodava
//   DeepSeek deepseek-chat (PAGO)         3,44s    3/3     sim      —
//   Gemini gemini-3.5-flash-lite          5,18s    4/4     sim     5/5
//   Gemini gemini-2.5-flash               6,04s    3/3     sim     5/5
//   Z.ai   glm-4.7-flash                 28,52s    3/4     sim     5/5   ← lento demais
//   Z.ai   glm-4.5-flash                 22,46s    3/3     sim      —
//
//   MORTOS HOJE (medidos, não chutados) — tirados do caminho quente:
//   ❌ Cerebras        HTTP 402 "Payment required" (free tier acabou, exige cartão)
//   ❌ OpenAI          HTTP 429 "You have no credits remaining"
//   ❌ NVIDIA direto   deepseek-v4-flash e nemotron-3-ultra: TIMEOUT 3/3 (60s)
//   ❌ OpenRouter      nemotron-3.5-lightning:free e os outros :free: timeout ou 429
//   ❌ Cloudflare      @cf/google/gemma-4-26b-a4b-it: HTTP 200 com corpo VAZIO 3/3
//   ❌ SambaNova       HTTP 402, saldo zerado
//
// 🔍 A DESCOBERTA QUE DEU A VELOCIDADE: o gargalo NÃO era o tamanho do prompt nem o
// cold start da função. Medido lado a lado no mesmo modelo:
//     contexto 9.000 → 2,02s  ·  contexto 6.000 → 1,92s  ·  contexto 4.000 → 2,16s
// Ou seja: cortar o material de apoio do garimpo NÃO acelera nada (está no ruído) e
// só empobreceria a resposta. O que pesava era o RACIOCÍNIO INTERNO do gpt-oss:
//     reasoning_effort ausente → 3,85s   ·   'medium' → 3,27s   ·   'low' → 2,02s
// Por isso o contexto continua em 9.000 caracteres, intocado, e o que mudou foi o knob.
//
// 🧊 COLD START: medido separado, em produção. Um POST sem pergunta (o handler
// responde 400 antes de tocar na IA) volta em 0,20s — praticamente o mesmo que servir
// um arquivo estático do mesmo domínio (0,19s). O bundle de 1,2 MB do corpus do Wagner
// NÃO está custando espera. A normalização do corpus custa 0,38s UMA vez por instância
// (depois, 0,02s por pergunta). Conclusão: a demora era do provedor, não da Vercel.
//
// ⚠️ ARMADILHAS DE PARÂMETRO (esquecer qualquer uma põe raciocínio em inglês na tela
// do aluno, ou devolve resposta vazia). Cada uma vive no `extra` do modelo:
//   Z.ai            "thinking": {"type":"disabled"}          senão volta VAZIO
//   NVIDIA nemotron "chat_template_kwargs": {"thinking":false} senão despeja o
//                                                            raciocínio em inglês
//   Gemini 2.5      thinkingConfig.thinkingBudget = 0        senão trunca o sermão
//   Gemini 3.5-lite NÃO aceita thinkingConfig — manda 400 "invalid argument".
//                   (Era isso que derrubava o modelo mais confiável das 3 chaves.)
//
// 🔑 CHAVES: NUNCA no código. Só em variável de ambiente da Vercel, em lista
// separada por vírgula. Ver D:\RADAR-APP\_CONFIGURAR-CHAVES.md (não vai pro git).
// ─────────────────────────────────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Quanto esperamos pelos CABEÇALHOS da resposta. Depois que o cabeçalho chega, o
// corpo (streaming) corre sem limite — senão cortaríamos o sermão no meio.
// Cada degrau pode ter o SEU prazo (campo `timeout`): num degrau que mede 2s, esperar
// 12s é jogar 10s fora antes de tentar o próximo. Este valor é só o padrão.
const TIMEOUT_MS = 12000;

// Prazo da CASCATA inteira. A função Edge da Vercel morre aos 25s e o pastor leva 504.
// Aos 20s a gente para de abrir degrau novo e devolve um erro legível, que é melhor
// que uma tela de gateway. (Não corta resposta em andamento — só impede tentar mais.)
const PRAZO_TOTAL_MS = 20000;

// Açucar pra declarar modelo com os parâmetros próprios dele.
// `extra` entra no corpo do pedido: na RAIZ no dialeto OpenAI, dentro de
// `generationConfig` no dialeto Gemini.
const M = (id, extra) => ({ id, extra: extra || null });

// ─────────────────────────────────────────────────────────────────────────────
// 1) OS DEGRAUS
// `env` lista os nomes de variável aceitos, do mais novo pro mais antigo (as
// versões no singular existem pra não quebrar quem já configurou assim).
// ─────────────────────────────────────────────────────────────────────────────
export const DEGRAUS = [
  {
    // 0º — CLAUDE (Anthropic), o CÉREBRO PREMIUM (24/09/2026, chave do Elias no cofre).
    // ⚠️ `premium: true` — NÃO entra na cascata comum. Só é chamado quando o pedido
    // traz `premium:true` (as partes fundas: Concílio, Mensagem, a nota de pesquisa
    // do globo). Assim o resto do app segue de graça e a chave paga só é gasta onde
    // a profundidade vale. Modelo: Sonnet 5 (ótimo e mais barato que o Opus); trocar
    // por ANTHROPIC_MODEL se um dia quiser o Opus. Sem `temperature` — o Sonnet 5 recusa.
    id: 'claude',
    nome: 'Claude',
    pago: true,
    premium: true,
    dialeto: 'anthropic',
    url: 'https://api.anthropic.com/v1/messages',
    env: ['ANTHROPIC_API_KEYS', 'ANTHROPIC_API_KEY'],
    timeout: 22000,   // Claude pensa fundo; dá mais prazo que os rápidos
    modelos: [M(process.env.ANTHROPIC_MODEL || 'claude-sonnet-5')],
  },
  {
    // 1º — Groq. Mediu 2,02s com o prompt inteiro do Wagner e atende praticamente
    // sempre (7 chaves em rodízio). O `reasoning_effort: 'low'` é o que tirou 1,8s:
    // sem ele o gpt-oss gasta metade do orçamento pensando antes de escrever.
    // O LIMITE DE COTA DO GROQ É POR MODELO ("Rate limit reached for model X"), então
    // o 20b não é só reserva de qualidade: ele tem cota PRÓPRIA e salva o degrau
    // inteiro quando o 120b bate no teto de tokens por minuto.
    // ⚠️ o qwen fica por último de propósito: com o contexto de 9.000 ele às vezes
    // devolve "Request too large" (o teto por pedido dele é menor que o do gpt-oss).
    id: 'groq',
    nome: 'Groq',
    pago: false,
    dialeto: 'openai',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    env: ['GROQ_API_KEYS', 'GROQ_API_KEY'],
    timeout: 9000,
    modelos: [
      M('openai/gpt-oss-120b', { reasoning_effort: 'low' }),
      M('openai/gpt-oss-20b', { reasoning_effort: 'low' }),
      M('qwen/qwen3.8-27b'),
    ],
  },
  {
    // 2º — DeepSeek (pago, barato, 3,44s e 3/3 nas medições). Rede de segurança logo
    // cedo: o modo não-stream (Sala do Wagner) precisa de um provedor que devolva
    // CONTEÚDO na certa e rápido; empurrá-lo pro fim fazia os lentos antes dele
    // estourarem os 25s do Edge (o 504 do pastor). Só é chamado quando o Groq não
    // atende, então o custo fica pertinho de zero.
    // deepseek-chat = conteúdo limpo. O `flash` manda raciocínio antes do texto.
    id: 'deepseek',
    nome: 'DeepSeek',
    pago: true,
    dialeto: 'openai',
    url: 'https://api.deepseek.com/chat/completions',
    env: ['DEEPSEEK_API_KEYS', 'DEEPSEEK_API_KEY'],
    timeout: 12000,
    modelos: [M('deepseek-chat'), M('deepseek-flash')],
  },
  {
    // 3º — Gemini, o melhor degrau GRÁTIS depois do Groq (5,18s, 4/4).
    // ⚠️ A ORDEM DOS MODELOS MUDOU E ISSO IMPORTA: testado chave por chave hoje,
    //    gemini-3.5-flash-lite responde 200 nas TRÊS chaves;
    //    gemini-2.5-flash dá 404 na conta nova ("no longer available to new users");
    //    gemini-3.8-flash dá 503 "high demand" em 2 das 3 chaves.
    // ⚠️ E o flash-lite só entrou porque descobrimos que ele RECUSA thinkingConfig
    //    (HTTP 400 "invalid argument"). Por isso o knob agora é por modelo.
    id: 'gemini',
    nome: 'Gemini',
    pago: false,
    dialeto: 'gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/models',
    env: ['GEMINI_API_KEYS', 'GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    timeout: 14000,
    modelos: [
      M('gemini-3.5-flash-lite'),
      M('gemini-2.5-flash', { thinkingConfig: { thinkingBudget: 0 } }),
      M('gemini-3.8-flash'),
    ],
  },
  {
    // 4º — Z.ai (GLM). GRÁTIS permanente e com 200K de contexto, mas HOJE é LENTO:
    // 28,5s de média no glm-4.7-flash (e 429 "1305 temporarily overloaded" em parte
    // das tentativas). Fica como degrau tardio justamente por isso — é rede, não é
    // atalho. O prazo dele é maior que o dos outros porque com 9s ele nunca chegaria.
    // ⚠️ sem "thinking: disabled" a Z.ai devolve 200 com o corpo VAZIO.
    id: 'zai',
    nome: 'Z.ai',
    pago: false,
    dialeto: 'openai',
    url: 'https://api.z.ai/api/paas/v4/chat/completions',
    env: ['ZAI_API_KEYS', 'ZAI_API_KEY'],
    timeout: 18000,
    modelos: [
      M('glm-4.7-flash', { thinking: { type: 'disabled' } }),
      M('glm-4.5-flash', { thinking: { type: 'disabled' } }),
    ],
  },
  {
    // 5º — NVIDIA. Hoje os dois modelos deram TIMEOUT em 3/3 (60s sem responder), então
    // saiu do 3º lugar e veio pro fim, com prazo curto pra não custar caro quando está
    // dormindo. O degrau fica montado porque volta sozinho quando o NIM desafoga — e o
    // nemotron-3-ultra (550B) é o nosso degrau de QUALIDADE quando os rápidos falharem.
    // ⚠️ sem "chat_template_kwargs: {thinking:false}" o nemotron despeja o raciocínio
    //    dele em INGLÊS no lugar da resposta — o aluno do Elias veria isso na tela.
    id: 'nvidia',
    nome: 'NVIDIA',
    pago: false,
    dialeto: 'openai',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    env: ['NVIDIA_API_KEYS', 'NVIDIA_API_KEY'],
    timeout: 8000,
    modelos: [
      M('nvidia/nemotron-3-ultra-550b-a55b', { chat_template_kwargs: { thinking: false } }),
      M('deepseek-ai/deepseek-v4-flash-0731'),
    ],
  },
  {
    // 6º — OpenRouter, último recurso. Medido hoje: nemotron-3.5-lightning:free dá
    // timeout 3/3 e os outros :free ou não existem mais ou devolvem 429 do provedor
    // de trás. Custa pouco (o 429 volta em ~0,3s) e um dia desafoga. Os ids abaixo
    // foram conferidos contra /api/v1/models — os antigos já tinham sido aposentados.
    id: 'openrouter',
    nome: 'OpenRouter',
    pago: false,
    dialeto: 'openai',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    env: ['OPENROUTER_API_KEYS', 'OPENROUTER_API_KEY'],
    timeout: 8000,
    modelos: [
      M('nvidia/nemotron-3-super-120b-a12b:free'),
      M('qwen/qwen3.8-27b:free'),
      M('google/gemma-4-31b-it:free'),
    ],
  },
  // DEGRAUS APOSENTADOS em 19/09/2026 (medidos mortos, não chutados) — não voltam sem
  // medição nova, porque degrau morto não é "rede de segurança", é atraso:
  //   • Cerebras — HTTP 402 "Payment required": o free tier acabou e agora exige cartão.
  //   • OpenAI   — HTTP 429 "You have no credits remaining": a conta está sem crédito.
  //     (A variável OPENAI_API_KEY continua na Vercel, intocada, pro dia em que recarregar.)
];

// ─────────────────────────────────────────────────────────────────────────────
// 2) CHAVES — só do ambiente, nunca do código
// ─────────────────────────────────────────────────────────────────────────────
function lerChaves(degrau) {
  const vistas = new Set();
  const out = [];
  for (const nome of degrau.env) {
    const bruto = (typeof process !== 'undefined' && process.env && process.env[nome]) || '';
    for (const k of String(bruto).split(/[,\s;]+/)) {
      const chave = k.trim();
      if (chave && !vistas.has(chave)) { vistas.add(chave); out.push(chave); }
    }
  }
  return out;
}

// Só pra log: nunca imprimimos a chave inteira.
const marcaChave = (k) => '…' + String(k).slice(-4);

// ─────────────────────────────────────────────────────────────────────────────
// 3) MEMÓRIA CURTA DE FRACASSO (evita bater de novo em porta que acabou de fechar)
// Vive só na instância quente do Edge. Se a instância morrer, começa limpo.
// ─────────────────────────────────────────────────────────────────────────────
const CASTIGO = new Map(); // 'degrau|…abcd' -> timestamp em que pode tentar de novo
const castigado = (id) => (CASTIGO.get(id) || 0) > Date.now();
const castigar = (id, ms) => CASTIGO.set(id, Date.now() + ms);

// ─────────────────────────────────────────────────────────────────────────────
// 4) CLASSIFICAÇÃO DO ERRO — a decisão mais importante do módulo
//    'pular'  = problema do provedor/chave (sem crédito, inválida, 429, 5xx,
//               timeout, modelo aposentado) → tenta o próximo.
//    'parar'  = problema do NOSSO pedido (prompt malformado) → é bug nosso,
//               tem que aparecer, não pode ser mascarado por fallback.
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ A lista cresceu em 19/09/2026 por causa dos knobs de "thinking". Agora mandamos
// parâmetros que só ALGUNS modelos aceitam (reasoning_effort no gpt-oss, thinking na
// Z.ai, chat_template_kwargs no nemotron, thinkingConfig no gemini-2.5). Se um provedor
// mudar e recusar o knob, o 400 dele NÃO pode ser lido como "bug nosso" — isso abortaria
// a cascata inteira e derrubaria o app por causa de um parâmetro opcional. É problema
// DAQUELE MODELO: pula pro próximo e segue a vida.
// (Foi exatamente assim que o gemini-3.5-flash-lite ficava fora: ele responde
//  400 "Request contains an invalid argument" quando recebe thinkingConfig.)
const PROBLEMA_DE_MODELO = /model[_\s-]?not[_\s-]?found|does not exist|decommission|no longer|unsupported|not supported|max_tokens|maxoutputtokens|context length|too many tokens|too large|invalid argument|reasoning_effort|chat_template_kwargs|thinking|is not a valid model/i;

// ⚠️ PEGADINHA REAL: o Gemini devolve HTTP **400** (não 401) quando a chave é ruim
// — "API key not valid. Please pass a valid API key.". Sem esta lista, um 400 desses
// era lido como "bug nosso" e ABORTAVA a cascata inteira: uma chave podre do Gemini
// derrubava o app todo, que é exatamente o que este módulo existe pra impedir.
const PROBLEMA_DE_CHAVE = /api.?key.{0,20}not valid|invalid.{0,10}api.?key|invalid_api_key|api key expired|unauthenticated|permission.?denied|invalid authentication|incorrect api key|no credits|insufficient/i;

// `alvo` diz O QUE fica de castigo — e isso importa muito:
//   'chave'  = a conta está sem crédito/inválida → trocar de modelo não adianta,
//              pula direto pra próxima chave.
//   'modelo' = aquele modelo específico está fora (aposentado, sobrecarregado 503) →
//              a chave continua boa, tenta o PRÓXIMO MODELO dela.
//   null     = tropeço passageiro (rede) → não castiga ninguém, só segue.
// (Isto aqui já pegou um bug de verdade: um 503 do gemini-3-flash-preview estava
//  matando a chave inteira do Gemini e nunca chegava no gemini-2.5-flash, que estava
//  perfeito. Errar o alvo do castigo derruba um degrau bom.)
export function classificar(status, corpo) {
  const txt = String(corpo || '');
  if (status === 0) return { acao: 'pular', motivo: 'rede/timeout: ' + txt.slice(0, 80), alvo: null };
  if (status === 401 || status === 403) return { acao: 'pular', motivo: 'chave inválida/bloqueada', alvo: 'chave', castigo: 600000 };
  if (status === 402) return { acao: 'pular', motivo: 'sem crédito', alvo: 'chave', castigo: 600000 };
  if (status === 404) return { acao: 'pular', motivo: 'modelo/rota inexistente', alvo: 'modelo', castigo: 1800000 };
  if (status === 408) return { acao: 'pular', motivo: 'timeout do provedor', alvo: null };
  if (status === 429) {
    // O Groq limita POR MODELO ("Rate limit reached for model openai/gpt-oss-120b") e
    // também recusa pedido grande POR MODELO ("Request too large for model qwen/..."),
    // com o mesmo código 429. Nos dois casos a CHAVE continua ótima — castigar a chave
    // aqui jogaria fora as outras cotas dela (cada modelo do Groq tem a sua). Só o
    // modelo fica de molho, e o próximo da fila atende na hora.
    if (/for model|too large/i.test(txt)) {
      return { acao: 'pular', motivo: 'modelo no teto de cota (429)', alvo: 'modelo', castigo: 30000 };
    }
    const cota = /spending cap|quota|exceeded|insufficient|billing/i.test(txt);
    return { acao: 'pular', motivo: cota ? 'cota estourada' : 'limite de uso (429)', alvo: 'chave', castigo: cota ? 600000 : 30000 };
  }
  // 5xx é do LADO DELES e quase sempre do modelo (503 "high demand" do Gemini).
  if (status >= 500) return { acao: 'pular', motivo: 'erro do provedor (' + status + ')', alvo: 'modelo', castigo: status === 503 ? 60000 : 15000 };
  if (status === 400 || status === 422) {
    // Um 400 pode ser três coisas bem diferentes. A ordem da checagem importa:
    //   1) chave ruim (o Gemini responde 400 nesse caso)  → pula
    //   2) modelo aposentado / max_tokens grande demais    → pula
    //   3) prompt malformado                               → PARA, é bug nosso e
    //      tem que aparecer em vez de sumir atrás do fallback.
    if (PROBLEMA_DE_CHAVE.test(txt)) return { acao: 'pular', motivo: 'chave inválida (400)', alvo: 'chave', castigo: 600000 };
    if (PROBLEMA_DE_MODELO.test(txt)) return { acao: 'pular', motivo: 'modelo recusou os parâmetros', alvo: 'modelo', castigo: 1800000 };
    return { acao: 'parar', motivo: 'pedido inválido (bug nosso): ' + txt.slice(0, 200) };
  }
  return { acao: 'pular', motivo: 'HTTP ' + status, alvo: null };
}

export class IaError extends Error {
  constructor(msg, status, tentativas) {
    super(msg);
    this.name = 'IaError';
    this.status = status || 502;
    this.tentativas = tentativas || [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) TRADUÇÃO DOS DIALETOS
// Groq / Cerebras / DeepSeek / OpenAI falam OpenAI. O Gemini fala outra língua
// (contents/parts/generationConfig). Aqui a diferença morre — o resto do RADAR
// não precisa saber de nada disso.
// ─────────────────────────────────────────────────────────────────────────────
function normalizarMensagens(p) {
  if (Array.isArray(p.messages) && p.messages.length) {
    const sys = p.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    return { sys: [p.sys, sys].filter(Boolean).join('\n\n'), conversa: p.messages.filter((m) => m.role !== 'system') };
  }
  return { sys: p.sys || '', conversa: [{ role: 'user', content: p.user || '' }] };
}

function corpoOpenAI(degrau, modelo, p, stream) {
  const { sys, conversa } = normalizarMensagens(p);
  const msgs = sys ? [{ role: 'system', content: sys }, ...conversa] : conversa;
  const b = {
    model: modelo.id,
    messages: msgs,
    temperature: p.temperature != null ? p.temperature : 0.5,
    max_tokens: p.max_tokens || 2200,
    // Os parâmetros próprios do modelo (reasoning_effort do gpt-oss, thinking da Z.ai,
    // chat_template_kwargs do nemotron). Ver as ARMADILHAS lá no topo do arquivo.
    ...(modelo.extra || {}),
  };
  if (stream) b.stream = true;
  return { url: degrau.url, body: b, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + p.__chave, 'User-Agent': UA, Accept: stream ? 'text/event-stream' : 'application/json' } };
}

function corpoGemini(degrau, modelo, p, stream) {
  const { sys, conversa } = normalizarMensagens(p);
  const b = {
    contents: conversa.map((m) => ({ role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user', parts: [{ text: String(m.content || '') }] })),
    generationConfig: {
      temperature: p.temperature != null ? p.temperature : 0.5,
      maxOutputTokens: Math.round((p.max_tokens || 2200) * 1.5), // folga: o português acentuado rende mais token
      // ⚠️ O `thinkingConfig` AGORA VEM DO MODELO, não daqui — e isso não é frescura.
      // Sem `thinkingBudget: 0`, o gemini-2.5-flash gasta o orçamento inteiro "pensando"
      // e entrega o sermão cortado no meio da frase. Medido em 11/09/2026 com
      // maxOutputTokens=1000:
      //   sem o knob        → 958 tokens de pensamento, 38 de saída, 135 caracteres,
      //                       finishReason=MAX_TOKENS (texto truncado)
      //   thinkingLevel:low → IGUAL de ruim (958 tokens de pensamento) — não resolve
      //   thinkingBudget:0  → 0 de pensamento, 519 de saída, 2012 caracteres, STOP ✅
      // MAS em 19/09/2026 medimos o outro lado da moeda: o gemini-3.5-flash-lite, que é
      // o único que responde 200 nas TRÊS chaves, RECUSA esse campo com HTTP 400
      // "Request contains an invalid argument". Mandar o knob pra todo mundo estava
      // matando o melhor modelo grátis que temos. Por isso é por modelo.
      ...(modelo.extra || {}),
    },
  };
  if (sys) b.systemInstruction = { parts: [{ text: sys }] };
  // Busca na web de verdade (usada só pela Lupa do Concílio, via p.web).
  if (p.__comBusca) b.tools = [{ google_search: {} }];
  const metodo = stream ? 'streamGenerateContent?alt=sse&key=' : 'generateContent?key=';
  return { url: `${degrau.url}/${modelo.id}:${metodo}${encodeURIComponent(p.__chave)}`, body: b, headers: { 'Content-Type': 'application/json', 'User-Agent': UA, Accept: stream ? 'text/event-stream' : 'application/json' } };
}

// CLAUDE (Anthropic) — dialeto próprio (24/09/2026). Nem OpenAI nem Gemini:
//   • autentica em `x-api-key` (não Bearer), com o cabeçalho `anthropic-version`;
//   • o sistema vai no campo `system` (string), fora das mensagens;
//   • ⚠️ NÃO manda `temperature`: o Sonnet 5 RECUSA esse campo com HTTP 400
//     (dito no guia oficial da API). Mandar temperatura mataria o degrau inteiro.
function corpoAnthropic(degrau, modelo, p, stream) {
  const { sys, conversa } = normalizarMensagens(p);
  const b = {
    model: modelo.id,
    max_tokens: p.max_tokens || 2200,
    messages: conversa.map((m) => ({
      role: (m.role === 'assistant' || m.role === 'model') ? 'assistant' : 'user',
      content: String(m.content || ''),
    })),
    ...(modelo.extra || {}),
  };
  if (sys) b.system = sys;
  if (stream) b.stream = true;
  return { url: degrau.url, body: b, headers: {
    'Content-Type': 'application/json', 'x-api-key': p.__chave,
    'anthropic-version': '2023-06-01', 'User-Agent': UA,
    Accept: stream ? 'text/event-stream' : 'application/json' } };
}

const montar = (degrau, modelo, p, stream) =>
  (degrau.dialeto === 'gemini' ? corpoGemini
    : degrau.dialeto === 'anthropic' ? corpoAnthropic
    : corpoOpenAI)(degrau, modelo, p, stream);

// Texto de uma resposta NÃO-streaming, nos três dialetos.
function extrairTexto(degrau, j) {
  if (degrau.dialeto === 'gemini') {
    const c = (j.candidates || [])[0];
    if (!c) return '';
    // `thought: true` = raciocínio interno do modelo; não é resposta pro pastor.
    return (c.content && c.content.parts || []).filter((x) => !x.thought).map((x) => x.text || '').join('');
  }
  if (degrau.dialeto === 'anthropic') {
    return (j.content || []).filter((x) => x.type === 'text').map((x) => x.text || '').join('');
  }
  const m = j.choices && j.choices[0] && j.choices[0].message;
  return (m && m.content) || '';
}

// Pedaço de texto de UMA linha SSE, nos dois dialetos. Devolve '' pro que não é texto
// (ex.: delta.reasoning do gpt-oss, ou parts com thoughtSignature no Gemini).
function extrairPedaco(degrau, dado) {
  try {
    const j = JSON.parse(dado);
    if (degrau.dialeto === 'gemini') {
      const c = (j.candidates || [])[0];
      if (!c) return '';
      return (c.content && c.content.parts || []).filter((x) => !x.thought).map((x) => x.text || '').join('');
    }
    if (degrau.dialeto === 'anthropic') {
      // Claude manda eventos SSE: o texto vem em content_block_delta/text_delta.
      if (j.type === 'content_block_delta' && j.delta && j.delta.type === 'text_delta') return j.delta.text || '';
      return '';
    }
    const d = j.choices && j.choices[0] && j.choices[0].delta;
    if (!d) return '';
    // O `deepseek-flash` manda TODO o raciocínio em `reasoning_content` antes de
    // emitir a primeira letra de `content`. Lendo só `content`, o stream saía
    // com 0 byte e HTTP 200 — a tela dizia "a IA devolveu vazio" e a cascata
    // nem tentava o próximo degrau. Raciocínio é descartado de propósito (não é
    // a resposta), mas precisa ser reconhecido pra não ser confundido com falha.
    return d.content || '';
  } catch (_) { return ''; }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) UMA TENTATIVA
// ─────────────────────────────────────────────────────────────────────────────
async function tentar(degrau, modelo, chave, p, stream) {
  const { url, body, headers } = montar(degrau, modelo, { ...p, __chave: chave }, stream);
  const ctrl = new AbortController();
  // Só o cabeçalho tem prazo. Assim que ele chega a gente solta o cronômetro e
  // deixa o corpo (o sermão) sair inteiro, no tempo que precisar.
  // O prazo é DO DEGRAU: num provedor que mede 2s, esperar 12s antes de desistir é
  // jogar 10 segundos fora na cara do pastor. Num lento de propósito (Z.ai), é o
  // contrário: com 9s ele nunca chegaria a responder.
  const prazo = degrau.timeout || TIMEOUT_MS;
  const relogio = setTimeout(() => { try { ctrl.abort(); } catch (_) {} }, prazo);
  let r;
  try {
    r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
  } catch (e) {
    clearTimeout(relogio);
    return { ok: false, status: 0, corpo: String((e && e.message) || e).slice(0, 200) };
  }
  if (!r.ok) {
    clearTimeout(relogio);
    const corpo = await r.text().catch(() => '');
    return { ok: false, status: r.status, corpo };
  }
  if (stream) {
    clearTimeout(relogio);   // streaming: depois do cabeçalho, o corpo corre sem prazo
    if (!r.body) return { ok: false, status: 0, corpo: 'provedor não devolveu corpo pra streaming' };
    return { ok: true, upstream: r };
  }
  // NÃO-STREAM: mantém o relógio até o corpo inteiro chegar. Assim um provedor que manda
  // o cabeçalho e depois arrasta a geração é ABORTADO em TIMEOUT_MS e a cascata tenta o
  // próximo — em vez de arrastar até o Vercel matar a função aos 25s (o 504 do pastor).
  let j;
  try { j = await r.json(); } catch (_) { clearTimeout(relogio); return { ok: false, status: 0, corpo: 'resposta ilegível/abortada' }; }
  clearTimeout(relogio);
  const texto = extrairTexto(degrau, j);
  // Resposta 200 com texto vazio (acontece no Gemini quando o "pensamento" comeu
  // o orçamento) conta como falha — senão o pastor recebia uma tela em branco.
  if (!texto || !texto.trim()) return { ok: false, status: 0, corpo: 'resposta vazia' };
  return { ok: true, texto };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) A CASCATA
// Percorre degrau → chave (começando numa posição ALEATÓRIA, pra espalhar a carga
// entre as chaves em vez de queimar sempre a primeira) → modelo.
// ─────────────────────────────────────────────────────────────────────────────
// A Lupa do Concílio pesquisava na web pela OpenAI (/v1/responses + web_search_preview),
// que é exclusividade deles. Dos provedores da cascata, só o Gemini tem busca de verdade
// (tools: google_search). Então a Lupa tenta PRIMEIRO o Gemini com busca; se não rolar,
// cai na cascata normal SEM busca — e aí o chamador troca o texto do prompt (p.sysSemWeb)
// pra IA NÃO dizer que pesquisou. Prometer pesquisa que não houve é o caminho mais curto
// pra fonte inventada, que é exatamente o que a LEI do app proíbe.
// ── TAVILY: a busca na web que NÃO depende do Gemini (21/09/2026) ───────────
// Antes, pesquisar na web só existia se o Gemini estivesse de bom humor: era o
// único provedor da cascata com busca embutida. Quando ele negava, o app
// simplesmente não pesquisava — e o gerador de Estudo de Doutrina, que promete
// "assuntos atuais", virava um chute de memória do modelo.
// A Tavily inverte isso: ela SÓ pesquisa (não escreve), devolve os trechos e um
// resumo, e a gente entrega esse material pra QUALQUER motor da cascata. Ou seja,
// agora o Groq — que responde em 2 segundos — também sabe da notícia de hoje.
// 1.000 buscas por mês, renovando, sem cartão.
const TAVILY = () => (process.env.TAVILY_API_KEY || process.env.TAVILY_API_KEYS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

async function pesquisarTavily(consulta) {
  const chaves = TAVILY();
  if (!chaves.length) return null;
  const chave = chaves[Math.floor(Math.random() * chaves.length)];
  try {
    const r = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + chave, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: String(consulta || '').slice(0, 380),
        max_results: 5,
        include_answer: true,      // devolve o resumo já mastigado, não só links
        search_depth: 'basic'
      })
    });
    if (!r.ok) return null;
    const d = await r.json();
    const itens = (d.results || []).slice(0, 5);
    if (!itens.length && !d.answer) return null;
    // O material vai pro prompt COM a fonte colada em cada trecho. Sem isso a IA
    // resume tudo junto e a citação vira enfeite — impossível de conferir depois.
    const blocos = itens.map((x, i) =>
      `[${i + 1}] ${x.title || ''}\n${(x.content || '').slice(0, 900)}\nFonte: ${x.url || ''}`).join('\n\n');
    return { resumo: d.answer || '', blocos, fontes: itens.map((x) => x.url).filter(Boolean) };
  } catch (_) { return null; }
}

// ── EXA: a segunda perna da busca, por SIGNIFICADO ──────────────────────────
// A Tavily busca por palavra, como um buscador comum. A Exa busca por SENTIDO —
// ela entende a pergunta e acha a página que responde, mesmo sem as mesmas
// palavras. Pra pergunta de pastor ("o que Daniel 12:4 realmente quer dizer")
// isso muda o resultado: voltam comentários e estudos, não notícia com a palavra.
// Entra como reserva da Tavily: ~1.400 buscas/mês (US$ 0,007 cada, US$ 10 que
// renovam sozinhos, sem cartão). Testada 21/09: 1,25s, resultados em português.
const EXA = () => (process.env.EXA_API_KEY || process.env.EXA_API_KEYS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

async function pesquisarExa(consulta) {
  const chaves = EXA();
  if (!chaves.length) return null;
  const chave = chaves[Math.floor(Math.random() * chaves.length)];
  try {
    const r = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'x-api-key': chave, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: String(consulta || '').slice(0, 380),
        numResults: 5,
        type: 'auto',                                   // ela decide entre neural e palavra-chave
        contents: { text: { maxCharacters: 900 } }      // já vem com o texto, sem 2ª chamada
      })
    });
    if (!r.ok) return null;
    const d = await r.json();
    const itens = (d.results || []).filter((x) => x && (x.text || '').trim());
    if (!itens.length) return null;
    const blocos = itens.slice(0, 5).map((x, i) =>
      `[${i + 1}] ${x.title || ''}\n${(x.text || '').slice(0, 900)}\nFonte: ${x.url || ''}`).join('\n\n');
    return { resumo: '', blocos, fontes: itens.map((x) => x.url).filter(Boolean) };
  } catch (_) { return null; }
}

// Tavily primeiro (4.000/mês de graça), Exa como reserva (~1.400/mês).
async function pesquisarWeb(consulta, tentativas) {
  const t = await pesquisarTavily(consulta);
  if (t) return { ...t, motor: 'Tavily' };
  tentativas.push('busca-web: Tavily não respondeu');
  const e = await pesquisarExa(consulta);
  if (e) return { ...e, motor: 'Exa' };
  tentativas.push('busca-web: Exa não respondeu');
  return null;
}

async function cascataComBusca(p, stream, tentativas) {
  // 1º degrau da busca: Tavily/Exa + a cascata inteira (rápida e independente do Gemini)
  const achado = await pesquisarWeb(p.consultaWeb || p.user || '', tentativas);
  if (achado) {
    const material = 'MATERIAL PESQUISADO NA WEB AGORA (use e CITE a fonte; se não sustentar o que '
      + 'você ia dizer, NÃO diga):\n\n'
      + (achado.resumo ? 'Resumo: ' + achado.resumo + '\n\n' : '') + achado.blocos;
    const comMaterial = { ...p, sys: [p.sys, material].filter(Boolean).join('\n\n'), web: false };
    const r = await cascata(comMaterial, stream);
    if (r && r.ok !== false) {
      return { ...r, comBusca: true, fontesWeb: achado.fontes, provedorNome: (r.provedorNome || '') + ' + ' + achado.motor };
    }
    tentativas.push('busca-web: ' + achado.motor + ' achou mas a cascata não respondeu');
  } else {

  }

  // 2º degrau: o jeito antigo — Gemini com busca embutida
  const degrau = DEGRAUS.find((d) => d.id === 'gemini');
  const chaves = degrau ? lerChaves(degrau) : [];
  if (!chaves.length) { tentativas.push('busca-web: Gemini sem chave'); return null; }
  const inicio = Math.floor(Math.random() * chaves.length);
  for (let i = 0; i < chaves.length; i++) {
    const chave = chaves[(inicio + i) % chaves.length];
    if (castigado('busca|' + marcaChave(chave))) continue;
    for (const modelo of degrau.modelos) {
      if (castigado('busca@' + modelo.id)) continue;
      const r = await tentar(degrau, modelo, chave, { ...p, __comBusca: true }, stream);
      if (r.ok) return { ...r, provedor: 'gemini', provedorNome: 'Gemini (com busca na web)', modelo: modelo.id, pago: false, comBusca: true };
      const c = classificar(r.status, r.corpo);
      tentativas.push(`busca-web ${modelo.id} ${marcaChave(chave)}: ${c.motivo}`);
      if (c.alvo === 'modelo' && c.castigo) castigar('busca@' + modelo.id, c.castigo);
      if (c.alvo === 'chave') { if (c.castigo) castigar('busca|' + marcaChave(chave), c.castigo); break; }
    }
  }
  return null;
}

async function cascata(p, stream) {
  const tentativas = [];
  const tag = p.tag || 'ia';
  const comecou = Date.now();

  if (p.web) {
    const r = await cascataComBusca(p, stream, tentativas);
    if (r) return { ...r, ms: 0, tentativas };
    console.warn(`[IA:${tag}] sem busca na web hoje (${tentativas.join(' | ')}) — segue sem pesquisar, com o prompt honesto`);
    if (p.sysSemWeb) p = { ...p, sys: p.sysSemWeb };
  }

  // __pular: degraus já descartados nesta mesma requisição. Usado quando um
  // provedor devolve 200 com stream VAZIO — aí a falha só aparece depois de
  // abrir o corpo, e a cascata precisa ser refeita sem ele.
  const pular = (p.__pular || []);

  for (const degrau of DEGRAUS) {
    // Vale a pena abrir MAIS UM degrau? Se já queimamos o prazo, não: o Edge da Vercel
    // corta a função aos 25s e o pastor leva um 504 mudo. Um erro escrito em português
    // é melhor que uma tela de gateway.
    if (Date.now() - comecou > PRAZO_TOTAL_MS) {
      tentativas.push(`parou em ${degrau.id}: estourou o prazo da cascata (${PRAZO_TOTAL_MS}ms)`);
      break;
    }
    if (pular.includes(degrau.id)) { tentativas.push(`${degrau.id}: pulado (já devolveu vazio)`); continue; }
    // DEGRAU PREMIUM (Claude): só entra quando o chamador pede `premium:true`. Nas
    // chamadas comuns ele é pulado, pra a chave paga não ser gasta em tudo.
    if (degrau.premium && !p.premium) { continue; }
    const chaves = lerChaves(degrau);
    if (!chaves.length) { tentativas.push(`${degrau.id}: sem chave configurada`); continue; }
    if (castigado(degrau.id)) { tentativas.push(`${degrau.id}: em castigo (falhou há pouco)`); continue; }

    const inicio = Math.floor(Math.random() * chaves.length); // rodízio
    let vivas = 0;

    for (let i = 0; i < chaves.length; i++) {
      const chave = chaves[(inicio + i) % chaves.length];
      const idChave = degrau.id + '|' + marcaChave(chave);
      if (castigado(idChave)) { tentativas.push(`${degrau.id} ${marcaChave(chave)}: em castigo`); continue; }
      vivas++;

      for (const modelo of degrau.modelos) {
        if (castigado(degrau.id + '@' + modelo.id)) continue;
        const t0 = Date.now();
        const r = await tentar(degrau, modelo, chave, p, stream);
        const ms = Date.now() - t0;

        if (r.ok) {
          if (tentativas.length) {
            console.log(`[IA:${tag}] TROCA DE DEGRAU — atendido por ${degrau.nome}/${modelo.id} (${ms}ms) depois de: ${tentativas.join(' | ')}`);
          }
          if (degrau.pago) {
            console.warn(`[IA:${tag}] ⚠️ CAINDO NO PAGO — ${degrau.nome}/${modelo.id}. Os provedores grátis não atenderam: ${tentativas.join(' | ') || '(nenhum configurado)'}`);
          }
          return { ...r, provedor: degrau.id, provedorNome: degrau.nome, modelo: modelo.id, pago: !!degrau.pago, ms, tentativas };
        }

        const c = classificar(r.status, r.corpo);
        const linha = `${degrau.id}/${modelo.id} ${marcaChave(chave)}: ${c.motivo}`;
        tentativas.push(linha);

        // Bug NOSSO (prompt malformado): não mascarar com fallback — tem que estourar.
        if (c.acao === 'parar') {
          console.error(`[IA:${tag}] PEDIDO INVÁLIDO em ${linha}`);
          throw new IaError(c.motivo, 400, tentativas);
        }
        if (c.alvo === 'modelo') {
          if (c.castigo) castigar(degrau.id + '@' + modelo.id, c.castigo);
          continue; // chave continua boa — tenta o próximo modelo dela
        }
        if (c.alvo === 'chave') {
          if (c.castigo) castigar(idChave, c.castigo);
          break; // conta ruim: trocar de modelo não resolve, vai pra próxima chave
        }
      }
    }
    if (!vivas) tentativas.push(`${degrau.id}: todas as chaves em castigo`);
  }

  console.error(`[IA:${tag}] TODOS OS DEGRAUS FALHARAM — ${tentativas.join(' | ')}`);
  throw new IaError('Nenhum provedor de IA respondeu agora. Tente de novo em instantes.', 502, tentativas);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) API PÚBLICA
// ─────────────────────────────────────────────────────────────────────────────

/** Resposta inteira de uma vez. Devolve { texto, provedor, modelo, ... } ou lança IaError. */
export function iaTexto(p) { return cascata(p || {}, false); }

/** Igual, mas em streaming. Devolve { upstream, provedor, modelo, ... }. */
export function iaStreamBruto(p) { return cascata(p || {}, true); }

/**
 * Streaming já convertido em TEXTO PURO (é o que as telas do RADAR consomem).
 * Devolve { stream, provedor, modelo, tentativas }.
 *
 * `filtro(pedaco) -> string|null` deixa o chamador mexer no texto antes de sair
 * (o Wagner usa isso pra engolir o bloco ===QUADRO===).
 *
 * ⚠️ SE CAIR NO MEIO DO STREAM: não dá pra trocar de provedor — o pastor já está
 * lendo o começo do texto. Fechamos com um aviso honesto no fim, em vez de cortar
 * calado e deixar ele achar que o sermão acabou ali.
 */
export async function iaStreamTexto(p) {
  const r = await cascata(p || {}, true);
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const filtro = (p && p.filtro) || null;

  // Lê um upstream até o fim, empurrando o texto pro writer.
  // Devolve o que aconteceu pra quem chamou decidir se precisa tentar de novo.
  async function bombear(res) {
    const reader = res.upstream.body.getReader();
    let buf = '';
    let saiuAlgo = false;
    let quebrou = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const linha = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!linha.startsWith('data:')) continue;
          const dado = linha.slice(5).trim();
          if (dado === '[DONE]') { buf = ''; break; }
          // ⚠️ o dialeto do STREAM tem que casar com o provedor, senão o texto sai
          // vazio: o Claude (anthropic) lido como openai não acha nenhuma letra.
          let pedaco = extrairPedaco(
            { dialeto: res.provedor === 'gemini' ? 'gemini'
              : res.provedor === 'claude' ? 'anthropic'
              : 'openai' }, dado);
          if (!pedaco) continue;
          if (filtro) { pedaco = filtro(pedaco); if (!pedaco) continue; }
          saiuAlgo = true;
          await writer.write(enc.encode(pedaco));
        }
      }
    } catch (e) {
      quebrou = true;
      console.error(`[IA:${(p && p.tag) || 'ia'}] stream de ${res.provedorNome}/${res.modelo} caiu no meio: ${String((e && e.message) || e).slice(0, 150)}`);
    }
    return { saiuAlgo, quebrou };
  }

  (async () => {
    let atual = r;
    let out = await bombear(atual);

    // 200 com ZERO byte é falha, não resposta. Como nada foi escrito ainda,
    // dá pra refazer a cascata sem esse degrau e emendar aqui mesmo — o pastor
    // nem percebe. Antes daqui, isso virava "a IA devolveu vazio" na tela e a
    // cascata nunca tentava o próximo provedor.
    if (!out.saiuAlgo && !out.quebrou) {
      console.warn(`[IA:${(p && p.tag) || 'ia'}] ${atual.provedorNome}/${atual.modelo} devolveu 200 com stream VAZIO — pulando o degrau`);
      try {
        const jaPulados = (p.__pular || []).concat([atual.provedor]);
        atual = await cascata({ ...p, __pular: jaPulados }, true);
        out = await bombear(atual);
      } catch (e) {
        console.error(`[IA:${(p && p.tag) || 'ia'}] nenhum provedor sobrou depois do vazio: ${String((e && e.message) || e).slice(0, 150)}`);
        try { await writer.write(enc.encode('⚠️ *Nenhum provedor de IA conseguiu responder agora. Tente de novo em instantes.*')); } catch (_) {}
      }
    }

    if (out.quebrou && out.saiuAlgo) {
      // Honestidade: o texto acima está incompleto e o pastor precisa saber.
      try { await writer.write(enc.encode('\n\n⚠️ *A conexão com a IA (' + atual.provedorNome + ') caiu no meio da resposta — o texto acima está incompleto. Peça de novo.*')); } catch (_) {}
    }
    try { await writer.close(); } catch (_) {}
  })();

  return { stream: readable, provedor: r.provedor, provedorNome: r.provedorNome, modelo: r.modelo, pago: r.pago, tentativas: r.tentativas };
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) ATALHOS QUE JÁ DEVOLVEM UMA Response PRONTA (é o que os handlers usam)
// Todo mundo sai com X-IA-Provedor / X-IA-Modelo pro Elias saber quem atendeu —
// e com Access-Control-Expose-Headers pro navegador conseguir ler.
// ─────────────────────────────────────────────────────────────────────────────
export function cabecalhosIa(r, extra) {
  return {
    ...(extra || {}),
    'X-IA-Provedor': String(r.provedorNome || r.provedor || '?'),
    'X-IA-Modelo': String(r.modelo || '?'),
    'X-IA-Pago': r.pago ? 'sim' : 'nao',
    'Access-Control-Expose-Headers': 'X-IA-Provedor, X-IA-Modelo, X-IA-Pago',
  };
}

/** Streaming pronto pra devolver do handler. `cors` = os headers de CORS do arquivo. */
export async function respostaStream(p, cors) {
  const r = await iaStreamTexto(p);
  return new Response(r.stream, {
    headers: cabecalhosIa(r, { ...(cors || {}), 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }),
  });
}

/** Texto inteiro pronto pra devolver do handler. */
export async function respostaTexto(p, cors) {
  const r = await iaTexto(p);
  return new Response(r.texto, {
    headers: cabecalhosIa(r, { ...(cors || {}), 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }),
  });
}

/** Transforma qualquer erro da cascata em Response legível pro pastor. */
export function respostaErro(e, cors) {
  const err = e instanceof IaError ? e : new IaError(String((e && e.message) || e), 502, []);
  const msg = err.status === 400
    ? 'Erro no pedido enviado à IA: ' + err.message
    : 'As IAs não responderam agora. Tente de novo em instantes.';
  return new Response(msg, { status: err.status, headers: { ...(cors || {}), 'Content-Type': 'text/plain; charset=utf-8' } });
}
