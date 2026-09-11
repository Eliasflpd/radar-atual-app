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
// ORDEM DOS DEGRAUS (grátis primeiro, pago só no fim):
//   1. Groq       — grátis, o mais rápido (~1s)
//   2. Cerebras   — grátis (quando a conta tem cota)
//   3. Gemini     — grátis
//   4. DeepSeek   — PAGO, com saldo
//   5. OpenAI     — PAGO, só se ainda houver OPENAI_API_KEY configurada (rede final)
//
// ⚠️ ARMADILHA DO CLOUDFLARE: Groq e Cerebras ficam atrás do Cloudflare e devolvem
// 403 "error code 1010" quando a requisição não tem User-Agent de navegador. Parece
// chave morta e NÃO é. Por isso TODA chamada daqui manda o UA de Chrome (const UA).
//
// ─────────────────────────────────────────────────────────────────────────────
// MODELOS VALIDADOS DE VERDADE (testado chamando a API, não copiado de doc):
//   Data do teste: 11/09/2026
//   Groq      ✅ qwen/qwen3.8-27b        0,8s  · português limpo, sem "reasoning"
//             ✅ openai/gpt-oss-120b     0,9s  · funciona, mas gasta parte do
//                                              max_tokens com raciocínio interno
//                                              (campo delta.reasoning) — por isso é
//                                              o 2º da fila, não o 1º.
//             ❌ llama-3.1-8b-instant / llama3.x — APOSENTADOS, não existem mais.
//   Cerebras  ⚠️ gpt-oss-120b, qwen-3.8-27b existem no catálogo, MAS as 3 chaves do
//                cofre responderam HTTP 402 "Payment required" em 11/09/2026.
//                (O diagnóstico antigo marcou "chave viva" por engano: ele testava
//                 `llama3.1-8b`, que não existe mais, e o 404 de modelo foi lido
//                 como "chave boa". O degrau fica montado e volta a funcionar
//                 sozinho no dia em que a conta tiver cota.)
//             ❌ gemma-4-31b — 404, a chave não tem acesso.
//   Gemini    ✅ gemini-3-flash-preview  2,8s  · o mais rápido dos que respondem
//             ✅ gemini-2.5-flash       20,1s  · lento, mas estável
//             ✅ gemini-3.5-flash       26,8s  · lento
//             ❌ gemini-3.8-flash / gemini-3.6-flash — 503 "high demand" o tempo todo
//             ❌ gemini-2.5-flash-lite — 404, aposentado
//   DeepSeek  ✅ deepseek-flash          1,9s  · PAGO
//             ✅ deepseek-v4-pro        10,7s  · PAGO, mais caro/lento
//             ❌ deepseek-chat / deepseek-reasoner — nomes antigos, não existem mais.
//
// 🔑 CHAVES: NUNCA no código. Só em variável de ambiente da Vercel, em lista
// separada por vírgula. Ver D:\RADAR-APP\_CONFIGURAR-CHAVES.md (não vai pro git).
// ─────────────────────────────────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Quanto esperamos pelos CABEÇALHOS da resposta. Depois que o cabeçalho chega, o
// corpo (streaming) corre sem limite — senão cortaríamos o sermão no meio.
const TIMEOUT_MS = 12000;

// ─────────────────────────────────────────────────────────────────────────────
// 1) OS DEGRAUS
// `env` lista os nomes de variável aceitos, do mais novo pro mais antigo (as
// versões no singular existem pra não quebrar quem já configurou assim).
// ─────────────────────────────────────────────────────────────────────────────
export const DEGRAUS = [
  {
    id: 'groq',
    nome: 'Groq',
    pago: false,
    dialeto: 'openai',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    env: ['GROQ_API_KEYS', 'GROQ_API_KEY'],
    // gpt-oss-120b primeiro (testado 11/09 respondendo); qwen como reserva.
    modelos: ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'],
  },
  {
    // DeepSeek EM 2º (pago, barato, RÁPIDO e confiável) — rede de segurança logo cedo.
    // O modo não-stream (Sala do Wagner) precisa de um provedor que devolva CONTEÚDO na
    // certa e rápido; deixá-lo em 6º fazia os provedores lentos/de-raciocínio antes dele
    // estourarem os 25s do Edge (504). Só é chamado quando o Groq grátis não atende, então
    // o custo fica pertinho de zero. deepseek-chat = conteúdo limpo (flash é raciocínio).
    id: 'deepseek',
    nome: 'DeepSeek',
    pago: true,
    dialeto: 'openai',
    url: 'https://api.deepseek.com/chat/completions',
    modelos: ['deepseek-chat', 'deepseek-flash'],
    env: ['DEEPSEEK_API_KEYS', 'DEEPSEEK_API_KEY'],
  },
  {
    // NOVO degrau grátis (11/09/2026): NVIDIA NIM hospeda DeepSeek V4 Flash de graça
    // (só verificação de telefone, sem cartão). Testado respondendo 200 com conteúdo
    // LIMPO — entra logo depois do Groq pra tapar o buraco do Cerebras (sem cota) e do
    // OpenAI (sem crédito). Chave: env NVIDIA_API_KEYS. Dialeto OpenAI.
    id: 'nvidia',
    nome: 'NVIDIA',
    pago: false,
    dialeto: 'openai',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    env: ['NVIDIA_API_KEYS', 'NVIDIA_API_KEY'],
    modelos: ['deepseek-ai/deepseek-v4-flash-0731'],
  },
  {
    id: 'gemini',
    nome: 'Gemini',
    pago: false,
    dialeto: 'gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/models',
    env: ['GEMINI_API_KEYS', 'GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    // gemini-2.5-flash primeiro (o que responde de verdade); os "3.x" ficam de reserva
    // porque o id do preview muda e às vezes dá 404 (a cascata pula sozinha, mas assim
    // não gasta a 1ª tentativa num id instável).
    modelos: ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3-flash-preview'],
  },
  {
    // NOVO degrau grátis (11/09/2026): OpenRouter com modelo :free (contexto gigante).
    // Testado 200. Chave: env OPENROUTER_API_KEYS. Dialeto OpenAI.
    id: 'openrouter',
    nome: 'OpenRouter',
    pago: false,
    dialeto: 'openai',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    env: ['OPENROUTER_API_KEYS', 'OPENROUTER_API_KEY'],
    modelos: ['nvidia/nemotron-3.5-lightning:free'],
  },
  {
    id: 'cerebras',
    nome: 'Cerebras',
    pago: false,
    dialeto: 'openai',
    url: 'https://api.cerebras.ai/v1/chat/completions',
    env: ['CEREBRAS_API_KEYS', 'CEREBRAS_API_KEY'],
    modelos: ['gpt-oss-120b', 'qwen-3.8-27b'],
  },
  {
    id: 'openai',
    nome: 'OpenAI',
    pago: true,
    dialeto: 'openai',
    url: 'https://api.openai.com/v1/chat/completions',
    env: ['OPENAI_API_KEYS', 'OPENAI_API_KEY'],
    modelos: ['gpt-4o-mini', 'gpt-4o'],
  },
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
const PROBLEMA_DE_MODELO = /model[_\s-]?not[_\s-]?found|does not exist|decommission|no longer|unsupported|not supported|max_tokens|maxoutputtokens|context length|too many tokens|too large/i;

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
    model: modelo,
    messages: msgs,
    temperature: p.temperature != null ? p.temperature : 0.5,
    max_tokens: p.max_tokens || 2200,
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
      // ⚠️ ISTO AQUI NÃO É ENFEITE. Sem `thinkingBudget: 0`, o Gemini gasta o
      // orçamento inteiro "pensando" e entrega o sermão cortado no meio da frase.
      // Medido em 11/09/2026 com gemini-2.5-flash e maxOutputTokens=1000:
      //   sem o knob        → 958 tokens de pensamento, 38 de saída, 135 caracteres,
      //                       finishReason=MAX_TOKENS (texto truncado)
      //   thinkingLevel:low → IGUAL de ruim (958 tokens de pensamento) — não resolve
      //   thinkingBudget:0  → 0 de pensamento, 519 de saída, 2012 caracteres, STOP ✅
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (sys) b.systemInstruction = { parts: [{ text: sys }] };
  // Busca na web de verdade (usada só pela Lupa do Concílio, via p.web).
  if (p.__comBusca) b.tools = [{ google_search: {} }];
  const metodo = stream ? 'streamGenerateContent?alt=sse&key=' : 'generateContent?key=';
  return { url: `${degrau.url}/${modelo}:${metodo}${encodeURIComponent(p.__chave)}`, body: b, headers: { 'Content-Type': 'application/json', 'User-Agent': UA, Accept: stream ? 'text/event-stream' : 'application/json' } };
}

const montar = (degrau, modelo, p, stream) => (degrau.dialeto === 'gemini' ? corpoGemini : corpoOpenAI)(degrau, modelo, p, stream);

// Texto de uma resposta NÃO-streaming, nos dois dialetos.
function extrairTexto(degrau, j) {
  if (degrau.dialeto === 'gemini') {
    const c = (j.candidates || [])[0];
    if (!c) return '';
    // `thought: true` = raciocínio interno do modelo; não é resposta pro pastor.
    return (c.content && c.content.parts || []).filter((x) => !x.thought).map((x) => x.text || '').join('');
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
  const relogio = setTimeout(() => { try { ctrl.abort(); } catch (_) {} }, TIMEOUT_MS);
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
async function cascataComBusca(p, stream, tentativas) {
  const degrau = DEGRAUS.find((d) => d.id === 'gemini');
  const chaves = degrau ? lerChaves(degrau) : [];
  if (!chaves.length) { tentativas.push('busca-web: Gemini sem chave'); return null; }
  const inicio = Math.floor(Math.random() * chaves.length);
  for (let i = 0; i < chaves.length; i++) {
    const chave = chaves[(inicio + i) % chaves.length];
    if (castigado('busca|' + marcaChave(chave))) continue;
    for (const modelo of degrau.modelos) {
      if (castigado('busca@' + modelo)) continue;
      const r = await tentar(degrau, modelo, chave, { ...p, __comBusca: true }, stream);
      if (r.ok) return { ...r, provedor: 'gemini', provedorNome: 'Gemini (com busca na web)', modelo, pago: false, comBusca: true };
      const c = classificar(r.status, r.corpo);
      tentativas.push(`busca-web ${modelo} ${marcaChave(chave)}: ${c.motivo}`);
      if (c.alvo === 'modelo' && c.castigo) castigar('busca@' + modelo, c.castigo);
      if (c.alvo === 'chave') { if (c.castigo) castigar('busca|' + marcaChave(chave), c.castigo); break; }
    }
  }
  return null;
}

async function cascata(p, stream) {
  const tentativas = [];
  const tag = p.tag || 'ia';

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
    if (pular.includes(degrau.id)) { tentativas.push(`${degrau.id}: pulado (já devolveu vazio)`); continue; }
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
        if (castigado(degrau.id + '@' + modelo)) continue;
        const t0 = Date.now();
        const r = await tentar(degrau, modelo, chave, p, stream);
        const ms = Date.now() - t0;

        if (r.ok) {
          if (tentativas.length) {
            console.log(`[IA:${tag}] TROCA DE DEGRAU — atendido por ${degrau.nome}/${modelo} (${ms}ms) depois de: ${tentativas.join(' | ')}`);
          }
          if (degrau.pago) {
            console.warn(`[IA:${tag}] ⚠️ CAINDO NO PAGO — ${degrau.nome}/${modelo}. Os provedores grátis não atenderam: ${tentativas.join(' | ') || '(nenhum configurado)'}`);
          }
          return { ...r, provedor: degrau.id, provedorNome: degrau.nome, modelo, pago: !!degrau.pago, ms, tentativas };
        }

        const c = classificar(r.status, r.corpo);
        const linha = `${degrau.id}/${modelo} ${marcaChave(chave)}: ${c.motivo}`;
        tentativas.push(linha);

        // Bug NOSSO (prompt malformado): não mascarar com fallback — tem que estourar.
        if (c.acao === 'parar') {
          console.error(`[IA:${tag}] PEDIDO INVÁLIDO em ${linha}`);
          throw new IaError(c.motivo, 400, tentativas);
        }
        if (c.alvo === 'modelo') {
          if (c.castigo) castigar(degrau.id + '@' + modelo, c.castigo);
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
          let pedaco = extrairPedaco(res.provedor === 'gemini' ? { dialeto: 'gemini' } : { dialeto: 'openai' }, dado);
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
