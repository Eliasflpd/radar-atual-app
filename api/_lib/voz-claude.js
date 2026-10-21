// O MODO CLAUDE DO GLOBO (21/10/2026)
//
// Pedido do Elias: "coloca a API do Claude especialmente para a voz, somente o Claude… eu preciso sentir
// firmeza igual converso com você aqui". No modo Gemini o Gemini Live é quem pensa E fala, e a Claude só
// manda bilhetes pra ele (pensar_a_fundo). Aqui a Claude É o cérebro inteiro:
//
//   ouvir  → o próprio Chrome do celular transforma a fala em texto (Web Speech, pt-BR) — ver index.html;
//   pensar → ESTE arquivo: a Claude recebe a conversa inteira (só texto) e as ferramentas do globo, e decide
//            sozinha quando abrir a Bíblia, a biblioteca, a lição, o acervo, a internet, a memória;
//   falar  → a voz sintética do Google (Gemini TTS, as mesmas vozes do globo), pedaço por pedaço, enquanto
//            a Claude ainda escreve. O áudio desce como PCM 24 kHz, o mesmo que o Gemini Live mandava, e
//            entra na MESMA fila de reprodução do globo (enfileirarPCM / calarMestre).
//
// O que desce pro celular, numa linha JSON por evento (NDJSON): o texto da Claude, o rótulo da ferramenta
// em uso, os NOMES das fontes, o áudio, os pedidos de telão e de troca de voz, e no fim qual modelo
// respondeu. O texto dos livros da biblioteca NUNCA desce: fica aqui, só a Claude lê (são livros comprados).
//
// O histórico viaja como TEXTO PURO (a fala dele e a resposta final). Os blocos de pensamento da Claude só
// existem dentro de UMA resposta (o vaivém das ferramentas), e voltam inteiros, sem mexer — é a regra do
// "preserved thinking" do Sonnet 5.5: editar o que veio antes de um pensamento dá erro 400.
//
// Sem queda silenciosa: se a Claude não responder, o globo DIZ isso e mostra. Nada de cair escondido na
// cascata grátis — foi o que o Elias pediu ("tornar visíveis as trocas de modelo").

import { FERRAMENTAS, executarFerramenta, chavesGemini, registrarLacuna } from './voz-ferramentas.js';
import { temasDeFerramenta, gravarTemas } from './voz-memoria.js';

// Uma linha só pra trocar de cérebro (ex.: ANTHROPIC_MODEL_VOZ=claude-opus-5-5 na Vercel).
export const MODELO_CLAUDE = (typeof process !== 'undefined' && process.env && process.env.ANTHROPIC_MODEL_VOZ) || 'claude-sonnet-5-5';
const NOME_DO_MODELO = { 'claude-sonnet-5-5': 'Claude Sonnet 5.5', 'claude-opus-5-5': 'Claude Opus 5.5', 'claude-sonnet-5': 'Claude Sonnet 5' };
const URL_ANTHROPIC = 'https://api.anthropic.com/v1/messages';

// Travas de custo: o repositório é público e o modelo é pago.
const MAX_RODADAS = 6;            // idas e voltas de ferramenta numa resposta
const MAX_HISTORICO = 24;         // falas anteriores
const MAX_LETRAS_HIST = 30000;
const PRAZO_TOTAL_MS = 150000;

// A voz: os modelos de TTS do Google, cada um com a sua cota grátis. Medido em 21/10/2026:
// flash ~3,5–5,8 s por 13 s de fala; 3.1-preview ~2,9 s; o lite tem cota diária pequena (acabou em ~11 chamadas).
// Os modelos LEEM EM VOZ ALTA qualquer instrução de estilo ("leia devagar…") — testado. Por isso o jeito de
// falar de cada persona vai para a Claude (o jeito de ESCREVER), e aqui vai só o texto.
const MODELOS_TTS = ['gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts', 'gemini-3.8-flash-lite-tts'];
const esfriando = new Map();     // `${chave}|${modelo}` -> até quando não tentar de novo (429)

// ─────────────────────────────────────────────────────────────────────────────
// AS FERRAMENTAS — as mesmas do globo, no formato da Anthropic.
// Ficam de fora pensar_a_fundo e pesquisar_biblioteca: as duas chamam a Claude por dentro (era o bilhete
// pro Gemini). Aqui quem lê os livros é a própria Claude, pela buscar_biblioteca.
// ─────────────────────────────────────────────────────────────────────────────
const DO_GLOBO = ['ler_versiculo', 'conferir_citacao', 'versiculos_ligados', 'licao_da_ebd', 'buscar_no_acervo', 'garimpar',
  'saber_agora', 'meu_conhecimento', 'guardar_ensino', 'ensinos_do_pastor', 'o_que_ja_falamos', 'trocar_voz'];
// (mostrar_na_tela saiu: custava uma volta inteira da Claude, ~3 s de silêncio medidos. O versículo que ela abre
// com ler_versiculo vai pro telão sozinho, aqui do servidor.)

// Descrições reescritas onde a do Gemini empurrava para o lugar errado nesta conversa.
const DESCRICAO_PROPRIA = {
  conferir_citacao: 'Confere mecanicamente, contra o texto real, se um versículo diz mesmo o que você vai afirmar, '
    + 'e se a palavra no original é do idioma certo (hebraico no Antigo, grego no Novo). Use quando for afirmar algo '
    + 'delicado sobre o texto ou sobre uma palavra no original e não tiver o texto exato na mão.',
  meu_conhecimento: 'Devolve, sempre atualizado, tudo o que você tem à disposição: as ferramentas, as fontes fixas e a lista REAL '
    + 'de autores e obras da biblioteca de estudo. Chame quando ele perguntar o que você sabe, quais são as suas fontes, quais '
    + 'livros ou autores você tem. (Nesta conversa o "estudioso" da lista é você mesmo.)',
};

function paraJsonSchema(s) {
  if (!s || typeof s !== 'object') return s;
  const o = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === 'type') o.type = String(v).toLowerCase();
    else if (k === 'properties') o.properties = Object.fromEntries(Object.entries(v).map(([p, d]) => [p, paraJsonSchema(d)]));
    else if (k === 'items') o.items = paraJsonSchema(v);
    else o[k] = v;
  }
  return o;
}

const BUSCAR_BIBLIOTECA = {
  name: 'buscar_biblioteca',
  description: 'A BIBLIOTECA DE ESTUDO do pastor: comentários (Keil e Delitzsch, Waltke, Kidner, Wiersbe, Spurgeon…), léxicos '
    + '(Thayer, Strong, Kittel), dicionários e livros que ele comprou. Devolve os trechos que mais casam com a pergunta, com o '
    + 'autor, a obra e o lugar. Use antes de afirmar sentido de palavra no original, pano de fundo, costume, crítica textual ou o '
    + 'que os expositores dizem de uma passagem. Pode chamar mais de uma vez, com perguntas mais precisas, se a primeira não trouxer.',
  input_schema: {
    type: 'object',
    properties: {
      pergunta: { type: 'string', description: 'O que procurar, em português e concreto, com a referência por extenso quando houver '
        + '(ex.: "o sentido de andar em todo o caminho em Deuteronômio 5:33", "a palavra hebraica para escada em Gênesis 28:12").' },
    },
    required: ['pergunta'],
  },
};

const DECL = (FERRAMENTAS[0] && FERRAMENTAS[0].functionDeclarations) || [];
export const FERRAMENTAS_CLAUDE = (() => {
  const lista = DO_GLOBO.map((n) => DECL.find((d) => d.name === n)).filter(Boolean).map((d) => ({
    name: d.name,
    description: DESCRICAO_PROPRIA[d.name] || d.description,
    input_schema: d.parameters ? paraJsonSchema(d.parameters) : { type: 'object', properties: {} },
  }));
  lista.push(BUSCAR_BIBLIOTECA);
  // O cache da Anthropic guarda tudo até esta marca: ferramentas + a parte fixa do sistema.
  lista[lista.length - 1] = { ...lista[lista.length - 1], cache_control: { type: 'ephemeral' } };
  return lista;
})();

// ─────────────────────────────────────────────────────────────────────────────
// A INSTRUÇÃO DE SISTEMA — enxuta. A Claude segue à risca o que lê; o prompt de 9 mil tokens do Gemini
// (gritos, leis de oratória) aqui só engessaria.
// ─────────────────────────────────────────────────────────────────────────────
const SISTEMA_CLAUDE = `Você é a voz de estudo do RADAR, o app de uma igreja Assembleia de Deus no Brasil. Você conversa POR VOZ com um pastor: tudo o que você escreve é lido em voz alta por um sintetizador e aparece escrito na tela dele.

COMO FALAR
- Português do Brasil, conversa natural, calorosa e firme, como um irmão culto que é homem de Deus. A resposta vem na primeira frase.
- Só frases faladas: sem markdown, sem listas, sem títulos, sem emoji, sem asterisco, sem parênteses longos. Frases curtas e médias, com ritmo de fala.
- Referência bíblica sempre por extenso, do jeito que se fala: "Deuteronômio cinco, versículo trinta e três", nunca "Dt 5:33". Números também por extenso.
- Tamanho: pergunta simples, de uma a três frases. Explicação ou estudo: pesquise a fundo, mas FALE curto — de quatro a sete frases (uns trinta a quarenta segundos), com o ponto principal primeiro e a melhor pérola bem entregue. O resto do que você achou fica guardado para quando ele pedir. Se o assunto der para mais, ofereça aprofundar numa frase curta no fim, e não faça isso em toda resposta. Quando ele pedir para aprofundar, continuar ou falar mais, aí vá longe.
- Não termine toda resposta com pergunta. Nada de "claro!", "ótima pergunta" ou "espero ter ajudado".
- Antes de uma consulta, diga em poucas palavras o que vai fazer ("deixa eu abrir o texto aqui") e chame a ferramenta. Não repita essa frase depois que o resultado voltar.
- O que ele fala chega pelo reconhecimento de voz do celular, que às vezes erra palavras. Se a frase veio truncada ou sem sentido, pergunte com naturalidade o que ele quis dizer.

BÍBLIA E ESTUDO — aqui você é mestre, e o pastor confere tudo
- Antes de citar ou explicar um versículo, leia o texto exato com ler_versiculo, mesmo tendo certeza: ele usa a Almeida, e citação de memória sai diferente. Fale em cima do texto que voltou.
- Erudição (palavra no original, pano de fundo, costume, o que os comentaristas dizem) vem de buscar_biblioteca. Use com as suas palavras e diga de quem veio pelo nome ("Keil e Delitzsch observam…"). Nunca copie mais de seis palavras seguidas de um livro: são livros comprados e o texto deles não pode ser repetido. Descarte trecho que não trata da pergunta. Autor marcado "com filtro" só vale para grego, crítica textual e estudo de palavra, nunca para interpretação.
- Seu conhecimento próprio de estudioso vale, mas não atribua a um autor nada que a ferramenta não trouxe, e não invente página, ano, número ou citação entre aspas.
- Antigo Testamento é hebraico (aramaico em Daniel dois a sete e Esdras quatro a sete); Novo Testamento é grego. Nunca troque. Palavra no original só com fonte ou certeza absoluta.
- Linha pentecostal clássica (Assembleia de Deus), cristocêntrica. Em ponto disputado, apresente as posições com honestidade e diga qual a linha pentecostal sustenta. Respeite as outras tradições sem atacar.
- O que ele mesmo já pregou: buscar_no_acervo. A lição da Escola Dominical: licao_da_ebd, sempre antes de falar da lição. Referências cruzadas: versiculos_ligados. O material das aulas do acervo: garimpar.
- Não achou apoio? Diga que não achou e siga pelo que tem. Não saber é resposta; inventar não é.

O RESTO
- Assunto geral (história, saúde, conselho, o dia a dia) você responde do que sabe, direto. Fato de hoje (notícia, jogo, cotação, tempo): saber_agora.
- Use as ferramentas para conferir o que precisa ser exato ou pode ter mudado, mesmo quando se sentir seguro.
- Se ele te corrigir, agradeça em meia frase, guarde com guardar_ensino (tipo correcao) e siga corrigido. Se aprovar uma resposta e mandar guardar, guardar_ensino (tipo aprovada). O que ele ensinou vale acima dos comentaristas, abaixo só da Escritura.
- Memória: só lembre do que está no bloco de memória abaixo ou do que o_que_ja_falamos trouxer. Nunca invente que já conversaram algo.
- Nunca cite professor, autor vivo ou instituição por nome ao falar de você ou do seu método. Autor de livro consultado se cita, sim: é fonte.
- Perguntado sobre o que você sabe ou quais fontes tem: chame meu_conhecimento e responda completo.
- O versículo que você abre com ler_versiculo aparece sozinho, grande, na tela dele; não comente isso. Troca de voz: trocar_voz.
- Nunca guarde nome de membro nem caso de aconselhamento.`;

// ─────────────────────────────────────────────────────────────────────────────
// A BIBLIOTECA, CRUA — a mesma coleta do pensarAFundo, entregue à própria Claude.
// ─────────────────────────────────────────────────────────────────────────────
const SELO = (x) => x.peso === 2 ? 'fonte primária (diz qual é a palavra no original)'
  : x.aprovado === false ? 'COM FILTRO (só grego, crítica textual e estudo de palavra; nunca interpretação)'
  : 'autor aprovado';

async function comPrazo(url, init, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

async function buscarBiblioteca(pergunta, origem) {
  const q = String(pergunta || '').trim().slice(0, 400);
  if (q.length < 4) return { achou: false, motivo: 'pergunta curta demais' };
  const token = (typeof process !== 'undefined' && process.env && process.env.RADAR_ADMIN_TOKEN) || '';
  if (!token) return { achou: false, motivo: 'a biblioteca não está configurada neste servidor' };
  let j = null;
  try {
    const r = await comPrazo(origem + '/api/dados?fn=biblioteca', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q, n: 8, token }),
    }, 10000);
    j = await r.json();
  } catch (_) { j = null; }
  if (!j || !j.ok) return { achou: false, motivo: 'a biblioteca não respondeu agora' };
  const bons = (j.itens || []).filter((x) => x.score >= 0.45).slice(0, 7);
  if (!bons.length) return { achou: false, motivo: 'nada na biblioteca casou com essa pergunta' };
  return {
    achou: true,
    trechos: bons.map((x) => ({ autor: x.autor, obra: x.obra || '', onde: x.secao || x.livro || '', selo: SELO(x),
      nota: x.score, texto: String(x.texto || '').slice(0, 1400) })),
    regra: 'Uso interno: o pastor não vê este texto. Fale com as suas palavras, cite o autor pelo nome, '
      + 'nunca copie mais de seis palavras seguidas, e descarte o trecho que não trata da pergunta.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// A VOZ (Gemini TTS) — rodízio de chaves × modelos; 429 esfria aquele par por um minuto.
// ─────────────────────────────────────────────────────────────────────────────
function pcmDoAudio(b64) {
  const bin = atob(b64);
  // WAV: acha o pedaço "data" (o cabeçalho nem sempre tem 44 bytes). Senão já é PCM cru (audio/L16).
  if (bin.slice(0, 4) !== 'RIFF') return b64;
  let i = 12;
  while (i + 8 <= bin.length) {
    const id = bin.slice(i, i + 4);
    const tam = bin.charCodeAt(i + 4) | (bin.charCodeAt(i + 5) << 8) | (bin.charCodeAt(i + 6) << 16) | (bin.charCodeAt(i + 7) << 24);
    if (id === 'data') return btoa(bin.slice(i + 8, i + 8 + tam));
    i += 8 + tam + (tam & 1);
  }
  return btoa(bin.slice(44));
}

function paraFala(t) {
  return String(t || '')
    .replace(/[*_#`>|]+/g, ' ')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function falar(texto, vozGoogle) {
  const t = paraFala(texto);
  if (!t) return null;
  const ks = chavesGemini();
  const agora = Date.now();
  const inicio = ks.length ? (agora / 60000 | 0) % ks.length : 0;
  for (const modelo of MODELOS_TTS) {
    for (let n = 0; n < ks.length; n++) {
      const chave = ks[(inicio + n) % ks.length];
      const par = chave.slice(-6) + '|' + modelo;
      if ((esfriando.get(par) || 0) > Date.now()) continue;
      try {
        const r = await comPrazo(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: 'POST', headers: { 'x-goog-api-key': chave, 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: t }] }],
            generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: vozGoogle } } } } }),
        }, 20000);
        if (r.status === 429) { esfriando.set(par, Date.now() + 5 * 60000); continue; }   // cota do minuto ou do dia: deixa descansar
        if (!r.ok) continue;
        const j = await r.json();
        const parte = (((j.candidates || [])[0] || {}).content || {}).parts || [];
        const dado = parte.find((p) => p.inlineData && p.inlineData.data);
        if (dado) return pcmDoAudio(dado.inlineData.data);
      } catch (_) { /* próxima */ }
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// A CLAUDE — uma chamada em fluxo (SSE), lida bloco por bloco.
// ─────────────────────────────────────────────────────────────────────────────
function chavesAnthropic() {
  const env = (typeof process !== 'undefined' && process.env) || {};
  return String(env.ANTHROPIC_API_KEYS || env.ANTHROPIC_API_KEY || '').split(/[,\s]+/).filter(Boolean);
}

const PEDE_FUNDO = /\b(a fundo|aprofund|mais fundo|estudo|explica(r)? (melhor|direito|tudo)|detalh|exegese|doutrina|comparar|compara|prepar(ar|a) (um|uma|o|a) (serm|prega|estudo|aula))/i;

async function chamarClaude(corpo, aoTexto) {
  const ks = chavesAnthropic();
  if (!ks.length) throw new Error('não há chave da Anthropic configurada no servidor');
  let ultimo = '';
  for (let n = 0; n < Math.min(ks.length + 1, 3); n++) {
    const chave = ks[((Date.now() / 1000 | 0) + n) % ks.length];
    let r;
    try {
      r = await comPrazo(URL_ANTHROPIC, {
        method: 'POST',
        headers: { 'x-api-key': chave, 'anthropic-version': '2023-06-01', 'content-type': 'application/json',
          'anthropic-beta': 'server-side-fallback-2026-07-01' },
        body: JSON.stringify(corpo),
      }, 90000);
    } catch (e) { ultimo = 'rede: ' + ((e && e.message) || e); continue; }
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      ultimo = 'HTTP ' + r.status + ' ' + txt.slice(0, 200);
      if (r.status === 429 || r.status === 529 || r.status >= 500) continue;
      throw new Error(ultimo);
    }
    return await lerFluxo(r, aoTexto);
  }
  throw new Error(ultimo || 'a Claude não respondeu');
}

async function lerFluxo(r, aoTexto) {
  const leitor = r.body.getReader();
  const dec = new TextDecoder();
  const blocos = [];
  let buf = '', parar = null, modelo = '', usos = null;
  const tratar = (e) => {
    if (e.type === 'message_start') { modelo = (e.message && e.message.model) || ''; usos = (e.message && e.message.usage) || null; }
    else if (e.type === 'content_block_start') {
      const b = { ...e.content_block };
      if (b.type === 'text') b.text = b.text || '';
      if (b.type === 'tool_use') { b.input = {}; b._json = ''; }
      if (b.type === 'thinking') { b.thinking = b.thinking || ''; b.signature = b.signature || ''; }
      blocos[e.index] = b;
    } else if (e.type === 'content_block_delta') {
      const b = blocos[e.index]; const d = e.delta || {};
      if (!b) return;
      if (d.type === 'text_delta') { b.text += d.text; aoTexto(d.text); }
      else if (d.type === 'input_json_delta') b._json += d.partial_json || '';
      else if (d.type === 'thinking_delta') b.thinking += d.thinking || '';
      else if (d.type === 'signature_delta') b.signature = (b.signature || '') + (d.signature || '');
    } else if (e.type === 'content_block_stop') {
      const b = blocos[e.index];
      if (b && b.type === 'tool_use') {
        try { b.input = b._json ? JSON.parse(b._json) : {}; } catch (_) { b.input = {}; b._erroJson = true; }
        delete b._json;
      }
    } else if (e.type === 'message_delta') {
      parar = (e.delta && e.delta.stop_reason) || parar;
      if (e.usage) usos = { ...(usos || {}), ...e.usage };
    } else if (e.type === 'error') {
      throw new Error('a Claude mandou erro: ' + JSON.stringify(e.error || e).slice(0, 200));
    }
  };
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const linha = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!linha.startsWith('data:')) continue;
      let e; try { e = JSON.parse(linha.slice(5)); } catch (_) { continue; }
      tratar(e);
    }
  }
  return { blocos: blocos.filter(Boolean), parar, modelo, usos };
}

// O histórico que veio do celular, conferido: só texto, papéis alternados, começa pelo pastor, com teto.
function historicoLimpo(h, textoAgora) {
  const msgs = [];
  let total = 0;
  const lista = Array.isArray(h) ? h.slice(-MAX_HISTORICO) : [];
  for (const x of lista) {
    const role = x && (x.r === 'ele' || x.role === 'assistant') ? 'assistant' : 'user';
    const t = String((x && (x.t || x.texto || x.content)) || '').trim().slice(0, 2500);
    if (!t) continue;
    total += t.length;
    if (msgs.length && msgs[msgs.length - 1].role === role) msgs[msgs.length - 1].content += '\n' + t;
    else msgs.push({ role, content: t });
  }
  while (total > MAX_LETRAS_HIST && msgs.length > 2) { total -= msgs[0].content.length; msgs.shift(); }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  const agora = String(textoAgora || '').trim().slice(0, 2000);
  if (msgs.length && msgs[msgs.length - 1].role === 'user') msgs[msgs.length - 1].content += '\n' + agora;
  else msgs.push({ role: 'user', content: agora });
  return msgs;
}

function hojeEmBrasilia() {
  try {
    return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch (_) { return new Date().toISOString().slice(0, 10); }
}

// ─────────────────────────────────────────────────────────────────────────────
// A CONVERSA — devolve a Response em fluxo. `apoio` vem do voz.js (crachá conferido, peneira, persona…).
// ─────────────────────────────────────────────────────────────────────────────
export function conversarComClaude({ texto, historico, voz, origem, ctx, dono, chaveNova, semNome, personaDe, memoria, depois }) {
  const enc = new TextEncoder();
  const t0 = Date.now();
  let ctrl = null, ultimaSaida = Date.now(), fechado = false;
  const mandar = (o) => {
    if (fechado || !ctrl) return;
    try { ctrl.enqueue(enc.encode(JSON.stringify(o) + '\n')); ultimaSaida = Date.now(); } catch (_) {}
  };

  let persona = personaDe(voz);
  // ── a fila de fala: corta o texto em pedaços, sintetiza já, e entrega NA ORDEM ──
  // Medido no rastreio (21/10/2026): pedaço grande demora a sintetizar e deixa buraco. Então o primeiro
  // pedaço de cada trecho é UMA frase (sai rápido), o segundo é curto e os outros médios; e no máximo duas
  // sínteses correm juntas, pra a da frente não disputar a cota com as de trás.
  let pend = '', nPedaco = 0, noTrecho = 0, corrente = Promise.resolve(), falado = '', novoTrecho = false;
  let rodando = 0; const esperando = [];
  const vaga = () => new Promise((ok) => { if (rodando < 2) { rodando++; ok(); } else esperando.push(ok); });
  const soltar = () => { const p = esperando.shift(); if (p) p(); else rodando--; };
  const pedacoPronto = (p) => {
    const t = p.trim(); if (!t) return;
    const i = nPedaco++; noTrecho++;
    const vozAgora = persona.google;
    const audio = vaga().then(() => falar(t, vozAgora)).finally(soltar);
    corrente = corrente.then(async () => {
      const pcm = await audio;
      if (pcm) mandar({ t: 'som', i, pcm });
      else mandar({ t: 'falar', i, texto: paraFala(t) });   // sem cota de voz: o celular fala com a voz dele
    });
  };
  const fimDeFrase = /[.!?…](?=\s|$)|[:;](?=\s)/g;
  const cortar = (fim) => {
    for (;;) {
      const minimo = noTrecho === 0 ? 12 : noTrecho === 1 ? 150 : 450;   // pedaço maior = menos chamadas da cota grátis
      fimDeFrase.lastIndex = 0;
      let m, corte = -1;
      while ((m = fimDeFrase.exec(pend))) {
        const pos = m.index + 1;
        if (pos >= minimo) { corte = pos; break; }
      }
      if (corte < 0 && pend.length > minimo + 400) {      // frase sem fim: corta no último espaço
        corte = pend.lastIndexOf(' ', minimo + 300);
        if (corte < minimo) corte = -1;
      }
      if (corte < 0) break;
      pedacoPronto(pend.slice(0, corte)); pend = pend.slice(corte);
    }
    if (fim && pend.trim()) { pedacoPronto(pend); pend = ''; }
  };
  const aoTexto = (d) => {
    // texto que volta depois de uma ferramenta: um espaço antes, senão "aqui.Pastor" gruda na tela
    if (novoTrecho) { novoTrecho = false; if (falado && !/\s$/.test(falado) && !/^\s/.test(d)) d = ' ' + d; }
    falado += d; mandar({ t: 'txt', d }); pend += d; cortar(false);
  };

  const trabalho = async () => {
    mandar({ t: 'oi', modelo: MODELO_CLAUDE, nome: NOME_DO_MODELO[MODELO_CLAUDE] || MODELO_CLAUDE, chave_nova: chaveNova || undefined });
    if (!dono) {
      const aviso = 'Este aparelho ainda não está confirmado no RADAR, e o modo Claude só abre para aparelho confirmado. Abra o RADAR uma vez e volte aqui.';
      mandar({ t: 'erro', msg: aviso }); aoTexto(aviso); cortar(true); await corrente; return;
    }
    // Esforço: medido em 21/10/2026 na mesma pergunta (Dt 5:33). No "low" a Claude trocou a referência de Jeremias
    // por "Deuteronômio cinco, trinta"; no "medium" acertou e trouxe os versículos 29 e 32, por só ~1,5 s a mais
    // até a primeira fala. Firmeza vem antes: medium é o padrão; low só pra conversa curta, sem referência.
    const fundo = PEDE_FUNDO.test(String(texto || ''));
    const papo = !fundo && String(texto || '').trim().length < 40 && !/\d/.test(String(texto || ''));
    const esforco = papo ? 'low' : 'medium';
    const sistema = [
      { type: 'text', text: SISTEMA_CLAUDE + (persona.estilo ? '\n\n' + persona.estilo : ''), cache_control: { type: 'ephemeral' } },
      { type: 'text', text: 'Hoje é ' + hojeEmBrasilia() + ' (horário de Brasília).' + (memoria ? '\n\n' + memoria : '') },
    ];
    const msgs = historicoLimpo(historico, texto);
    const usadas = [], fontesVistas = [], etapas = [];
    const marca = (o) => etapas.push({ ms: Date.now() - t0, ...o });
    let modeloQueRespondeu = '', parouPor = '', entrada = 0, saida = 0, cache = 0;

    for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
      if (Date.now() - t0 > PRAZO_TOTAL_MS) break;
      const corpo = {
        model: MODELO_CLAUDE,
        max_tokens: fundo ? 16000 : 8000,
        stream: true,
        // A 1ª volta só decide o que abrir e diz "deixa eu abrir o texto": low basta e a voz sai mais cedo.
        // Quem escreve a resposta (depois das ferramentas) pensa no esforço da pergunta.
        output_config: { effort: rodada === 0 ? 'low' : esforco },
        fallbacks: 'default',
        system: sistema,
        tools: FERRAMENTAS_CLAUDE,
        messages: msgs,
      };
      marca({ rodada, pediu: 'claude' });
      let primeira = true;
      const r = await chamarClaude(corpo, (d) => { if (primeira) { primeira = false; marca({ rodada, primeiro_texto: true }); } aoTexto(d); });
      marca({ rodada, claude_fim: r.parar });
      modeloQueRespondeu = r.modelo || modeloQueRespondeu;
      parouPor = r.parar || '';
      if (r.usos) { entrada += (r.usos.input_tokens || 0); saida += (r.usos.output_tokens || 0); cache += (r.usos.cache_read_input_tokens || 0); }
      if (parouPor === 'refusal') { aoTexto(' Essa eu não consigo responder por aqui.'); break; }
      const pedidas = r.blocos.filter((b) => b.type === 'tool_use');
      if (parouPor !== 'tool_use' && parouPor !== 'pause_turn') break;
      // o que ficou escrito antes da ferramenta ("deixa eu abrir o texto") já sai falado,
      // e o que vier depois começa trecho novo (primeira frase curta, pra voz voltar logo)
      cortar(true); noTrecho = 0; novoTrecho = true;
      msgs.push({ role: 'assistant', content: r.blocos.filter((b) => !(b.type === 'text' && !b.text)) });
      if (!pedidas.length) continue;
      const resultados = await Promise.all(pedidas.map(async (b) => {
        usadas.push(b.name);
        mandar({ t: 'ferr', nome: b.name });
        let res, erro = false;
        try {
          if (b._erroJson) throw new Error('argumentos ilegíveis');
          if (b.name === 'trocar_voz') {
            const nova = personaDe((b.input || {}).voz);
            persona = nova;
            mandar({ t: 'voz', voz: nova.id });
            res = { ok: true, nova_voz: nova.id, ordem: 'A voz já trocou. Siga a conversa normalmente.' };
          } else if (b.name === 'buscar_biblioteca') {
            res = await buscarBiblioteca((b.input || {}).pergunta, origem);
            if (res.achou) for (const x of res.trechos) if (!fontesVistas.some((f) => f.autor === x.autor)) fontesVistas.push({ autor: x.autor, onde: x.onde });
            const pg = depois(ctx, registrarLacuna(origem, 'pesquisar_biblioteca', b.input, res));
            if (pg) await pg;
          } else {
            res = await executarFerramenta(b.name, b.input || {}, origem, { user: dono });
            if (b.name === 'ler_versiculo' && res && res.achou) mandar({ t: 'tela', args: { tipo: 'versiculo', texto: String(res.texto || '').slice(0, 700), referencia: res.referencia || '' } });
            if (b.name === 'garimpar') { const pg = depois(ctx, registrarLacuna(origem, 'garimpar', b.input, res)); if (pg) await pg; }
          }
          // assunto da conversa vai pra memória, como no modo Gemini (fora do caminho da resposta)
          const temas = temasDeFerramenta(b.name === 'buscar_biblioteca' ? 'pesquisar_biblioteca' : b.name, b.input || {});
          if (temas.length) { const pg = depois(ctx, gravarTemas(origem, dono, JSON.parse(semNome(JSON.stringify(temas))))); if (pg) await pg; }
        } catch (e) {
          erro = true;
          res = { erro: 'a consulta falhou: ' + ((e && e.message) || 'motivo desconhecido'), ordem: 'Não invente para tapar o buraco; diga que a consulta falhou.' };
        }
        const conteudo = semNome(JSON.stringify(res)).slice(0, 24000);
        return { type: 'tool_result', tool_use_id: b.id, content: conteudo, ...(erro ? { is_error: true } : {}) };
      }));
      marca({ rodada, ferramentas_fim: pedidas.map((b) => b.name).join(',') });
      mandar({ t: 'pensa' });
      msgs.push({ role: 'user', content: resultados });
    }
    cortar(true);
    // Na tela, só as fontes que a Claude CITOU na fala (a busca traz autor que ela descartou por não servir).
    const semAc = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const dito = semAc(falado);
    const citadas = fontesVistas.filter((f) => semAc(f.autor).split(/[^a-z]+/).filter((p) => p.length >= 4).some((p) => dito.includes(p)));
    if (citadas.length) mandar({ t: 'fontes', fontes: citadas });
    await corrente;
    mandar({ t: 'fim', modelo: modeloQueRespondeu || MODELO_CLAUDE,
      nome: NOME_DO_MODELO[modeloQueRespondeu] || modeloQueRespondeu || MODELO_CLAUDE,
      parou: parouPor, ferramentas: usadas, ms: Date.now() - t0, etapas, tokens: { entrada, saida, cache }, falado: falado.length });
  };

  const corpo = new ReadableStream({
    start(c) {
      ctrl = c;
      const vivo = setInterval(() => { if (Date.now() - ultimaSaida > 3500) mandar({ t: '.' }); }, 2000);
      trabalho()
        .catch(async (e) => {
          const msg = String((e && e.message) || e).slice(0, 240);
          mandar({ t: 'erro', msg: 'A Claude não respondeu agora (' + msg + ').' });
          aoTexto(' A Claude não respondeu agora. Tente de novo daqui a pouco, ou troque para o modo Gemini na engrenagem.');
          cortar(true);
          try { await corrente; } catch (_) {}
          mandar({ t: 'fim', modelo: '', nome: 'sem resposta', parou: 'erro', ms: Date.now() - t0 });
        })
        .finally(() => { clearInterval(vivo); fechado = true; try { c.close(); } catch (_) {} });
    },
    cancel() { fechado = true; },
  });
  return new Response(corpo, { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export { buscarBiblioteca, falar, historicoLimpo, paraJsonSchema, SISTEMA_CLAUDE };
