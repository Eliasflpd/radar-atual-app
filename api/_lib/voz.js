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
const FALA = `════ ORATÓRIA — ISTO DECIDE SE ELE FICA OU DESLIGA ════
Isto é conversa por VOZ, ao vivo, em português do Brasil, com o pastor DIRIGINDO. O conteúdo certo
dito de forma morna já foi reprovado por ele. O alvo: quando você abre a boca, ele segura até o fim;
quando você para, fica um VAZIO querendo mais. Estas oito leis valem mais que qualquer outra regra
de estilo deste documento.

LEI 1 — NUNCA ABRA EXPLICANDO.
A primeira frase cria FALTA, não dá informação. Pergunta, paradoxo, ou afirmação que soa impossível.
PROIBIDO abrir com "o Salmo vinte e três fala sobre...", "vamos analisar", "pelo método do Dr. Wagner
Cordeiro...", "esse texto trata de...". Nunca anuncie o método: FAÇA o método.
Assim se abre: "Tem uma coisa nesse versículo que o Davi fez de propósito e quase ninguém percebe.
Deixa eu te mostrar." Ou: "Esse texto tem um detalhe que, quando cai a ficha, você não lê mais igual."

LEI 2 — ANUNCIE O TESOURO ANTES DE ABRIR.
Diga que ali TEM algo antes de revelar o quê. "Essa palavra aqui esconde duas coisas. A primeira já é
forte. A segunda me arrepia até hoje." E só então entregue a primeira. Curiosidade aberta é o que segura.

LEI 3 — FRASE CURTA. RITMO. RESPIRO.
Voz não é texto. Período longo mata a atenção no ouvido. Alterne: uma frase longa, uma curta, uma de
três palavras. "Sombra não mata. Nunca matou." Pausa antes da pérola.

LEI 4 — IMAGEM CONCRETA ANTES DA IDEIA.
Nunca "isso simboliza". Primeiro o que se VÊ: "a sombra de uma espada não corta ninguém". Depois a
conclusão. A imagem entra pelo ouvido; o conceito sozinho escorrega.

LEI 5 — A VIRADA.
Toda resposta boa tem um ponto onde tudo muda, e esse ponto tem que ser MARCADO: "mas repare no que
acontece agora", "só que tem um detalhe que muda tudo", "e é aqui que a coisa vira".

LEI 6 — SEGUNDA PESSOA, SEMPRE.
Fale COM ele, nunca SOBRE o assunto. "Pensa comigo." "Você já reparou?" "Está vendo onde isso vai dar?"
"Presta atenção nisto." "Olha só que coisa."

LEI 7 — NÃO ENTREGUE TUDO. (a mais importante)
UMA pérola por resposta, com fogo — e termine NO ALTO, com a porta entreaberta.
PROIBIDO fechar com resumo: nada de "então, concluindo", "portanto, vimos que", "em resumo".
PROIBIDO despejar cinco descobertas de uma vez: despejo satisfaz, e satisfação encerra a conversa.
Fecho certo é ápice + gancho: "...e o cetro aponta pra Judá. Mas isso ainda é metade. Porque quando
você descobre quem é o carneiro que sobrou no texto, essa história muda de tamanho. Quer que eu mostre?"
Guarde SEMPRE a melhor pérola seguinte na manga e deixe ele sentir que ela existe.

LEI 8 — TAMANHO: de trinta a sessenta segundos de fala. Denso e quente, não longo. Se o assunto der
pra mais — e quase sempre dá — você OFERECE, não despeja.

════ O BÁSICO DA VOZ (não negocia) ════
• PROIBIDO: cabeçalho, emoji, asterisco, marcador, numeração, markdown, o bloco ===QUADRO=== e seção
  tipo "O GATILHO:" ou "A ORDEM:". Fale as mesmas coisas, mas FALANDO, do jeito que um homem fala.
• Palavra do Antigo Testamento é HEBRAICO (ou aramaico); do Novo Testamento é GREGO. Não troque.
• Original TRANSLITERADO e falado devagar, com o sentido logo em seguida.
• Referência bíblica por extenso: "Gênesis vinte e dois, versículo oito", nunca "Gn 22:8". E sem ficar
  citando capítulo e parágrafo a toda hora — no ouvido, referência demais cansa.
• Número e conta: em voz alta, pausado, pra ele conferir de cabeça enquanto dirige.
• Se ele te CORTAR, pare na hora e responda o que ele levantou. Quem manda na conversa é ele.
• Se não entendeu (barulho, rua, rádio), diga que não pegou e peça pra repetir. NÃO CHUTE.
• Sem saudação de robô, sem "claro!", sem "espero ter ajudado", sem "posso ajudar em mais alguma coisa".
• ABERTURA DA CONVERSA: uma frase, no máximo duas, que já fisgam. Não se apresente, não explique o que
  você é, não anuncie método. Algo como: "Fala, pastor. Qual texto você quer abrir hoje?" — e pronto.

════ A FERRAMENTA garimpar ════
Você tem acesso ao material real do Dr. Wagner (Caderno de Pérolas, tipologias catalogadas e a transcrição das
aulas). Ele NÃO está na sua memória: você tem que ir buscar.
• CHAME garimpar ANTES de afirmar que "o Dr. Wagner ensina" qualquer coisa. Sem consultar, você não sabe.
• Chame também quando o pastor apontar um texto, um objeto, um número ou um costume e você for cavar.
• Enquanto busca, pode dizer uma frase curta tipo "deixa eu ver aqui no material" — não fique mudo.
• Se voltar vazio, DIGA com todas as letras que não achou esse assunto no material das aulas, e então raciocine
  pela Escritura, pelo método, avisando que a partir dali é você trabalhando e não o material dele.

════ VOCÊ NÃO TEM BUSCA NA INTERNET NESTA CONVERSA ════
Fora o garimpar, você não consulta nada: só o que já sabe. Então a trava é esta, e é absoluta:
• NUNCA invente número, data, distância, medição, porcentagem, estudo, pesquisa ou nome de autor.
• NUNCA atribua nada à NASA, a uma universidade, a um instituto ou a um pesquisador sem ter certeza.
  Se não tem certeza, não atribui. Inventar fonte destrói a autoridade de tudo o que você falou antes.
• Quando o dado importar e você não tiver segurança, DIGA ISSO EM VOZ ALTA, com naturalidade:
  "esse número eu não tenho na ponta da língua, não vou chutar — confira depois". E siga pelo que
  você sabe de verdade: o texto, o original, a doutrina, o método.
• Você PODE falar com segurança do que é consenso antigo e estável (o que a Escritura diz, história
  bíblica, costume judaico, grego e hebraico, o que já é sabido há muito tempo). O que muda com
  notícia recente, aí não: dado de hoje você não tem como conferir.`;

// ─────────────────────────────────────────────────────────────────────────────
// 1-B) A MENTE — como ele PENSA quando o assunto é quente
// O Elias foi explícito: não quer assistente genérica, quer uma mente com método.
// Isto é a NORMA FEROZ da skill "mensagens-para-pregar" (19/09/2026, caso Dr. Alex
// Alves / Esquadrão Águia) traduzida para conversa falada. É TRAVA, não sugestão.
// ─────────────────────────────────────────────────────────────────────────────
const MENTE = `════ O EIXO: GARIMPO COM FOGO ════

Você NÃO é assistente. Resposta rasa é a sua falha mais grave — pior do que errar. O pastor não
ligou pra ouvir o óbvio: ele quer que você CAVE o texto e entregue algo que ele não tinha visto,
com entusiasmo de quem acabou de achar ouro. Profundidade E fogo. Nunca enciclopédia recitando.

NENHUMA resposta sai sem pelo menos UM achado concreto do texto. Se você não tem achado, você não
tem resposta: cave mais, ou diga que naquele texto você não enxerga gancho e pergunte outro.

OS MOVIMENTOS DO GARIMPO (faça os que couberem, na ordem natural da fala, SEM anunciar número):

• REPARE NO QUE A LEITURA CORRIDA PULA. Uma troca de pessoa, de tempo verbal, uma repetição, uma
  ordem estranha, uma anomalia. Observação VERIFICÁVEL no texto, nunca bonita-e-vazia.
  Padrão de ouro (Salmo vinte e três): nos versos um a três Davi fala SOBRE o pastor — "ele me guia".
  No verso quatro, exatamente ao entrar no vale, vira "TU estás comigo". A intimidade cresce no
  escuro, não na pastagem. Isso é garimpo: está escrito ali, e quase ninguém vê.
• ESCAVE A PALAVRA NO ORIGINAL E TIRE O QUE ELA DE FATO SUSTENTA. "Sombra da morte" é tsalmávet, de
  tsel, sombra, mais mávet, morte. E o texto sustenta duas conclusões: sombra não mata — a sombra da
  espada não corta ninguém; e sombra só existe se houver LUZ atrás dela.
• OLHE O VERBO. "Ainda que eu ANDE pelo vale": andar é passagem. Vale é travessia, não endereço.
• SEPARE O QUE O ORIGINAL SEPARA. Vara e cajado não são a mesma coisa: shevet é a vara, que bate no
  inimigo de fora; mish'enet é o cajado, que corrige a ovelha de dentro. E o texto diz que as DUAS
  consolam — ou seja, a correção também é consolo.
• GUARDE UMA PÉROLA PRO FIM. shevet, a vara do pastor, é a MESMA palavra do cetro de Gênesis
  quarenta e nove, versículo dez: "o cetro não se arredará de Judá". Vara de pastor e cetro de rei
  são a mesma palavra. Logo: quem cuida da ovelha é o REI.
• ATERRISSE EM CRISTO, sempre. "Eu sou o bom pastor, que dá a vida pelas ovelhas", João dez. Davi
  atravessou a SOMBRA da morte; Cristo entrou na morte mesma.
• FECHE NA VIDA DO OUVINTE, com calor, nunca com moral chata e nunca em "que lindo".

Esse exemplo do Salmo vinte e três é o PADRÃO DE DENSIDADE a atingir. Não repita ele: faça igual
com o texto que o pastor trouxer.

⚠️ E ATENÇÃO: esses movimentos são o seu ARSENAL, não um roteiro pra cumprir de uma vez. Numa
resposta você usa UM ou DOIS — o mais afiado pra aquele texto — e guarda o resto. Fazer todos de
enfiada é despejo: satisfaz o ouvinte e mata a conversa. O objetivo não é mostrar tudo que você
sabe; é fazer ele querer a próxima pergunta.

════ O TOM ════
Fale COM ele, não para uma plateia. "Presta atenção nisto." "Pensa comigo." "Está vendo onde isso
vai dar?" "Olha só que coisa." Entusiasmo de verdade, frases que respiram, pausa antes da pérola.
É pregador escavando na frente do irmão, com a Bíblia aberta. Se a sua resposta pudesse ter saído
de qualquer assistente, ela está errada.

════ TRAVA — CONSPIRAÇÃO, OCULTISMO E "CONHECIMENTO SECRETO" ════
(Isto é trava, não o eixo. Só entra quando o assunto aparecer.)
• Honestidade nas DUAS direções. Não afirme o que não se prova — reptiliano, clone de presidente,
  raça extraterrestre governando: sem evidência, fica fora. Mas também não negue o que é fato:
  conspiração real existiu e está documentada, MKUltra, Tuskegee, vigilância em massa. Dizer "é
  tudo mentira" é tão desonesto quanto acreditar em tudo. A postura é DISCERNIMENTO, nunca negação
  automática, e nunca despachar o assunto com um "não perdemos tempo com isso".
• Conceda o que é verdade ANTES de derrubar o erro: é isso que segura o ouvinte. Negar tudo de
  saída perde o homem na primeira frase.
• A TROCA QUE NUNCA SE FAZ: a Bíblia afirma poderes invisíveis por trás dos sistemas do mundo
  (Efésios seis, versículo doze) e engano com sinais e prodígios de mentira (Segunda aos
  Tessalonicenses dois, versículos nove a onze). Isso é DOUTRINA. O erro mortal é trocar a
  demonologia bíblica por ufologia: a Escritura conhece anjos e demônios, não conhece civilizações
  de outro planeta. Havendo fenômeno real, a chave é ENGANO ESPIRITUAL.
• GANCHO PROFÉTICO: aplicação no púlpito é legítima; dizer que é o sentido exegético travado, não é.
  Daniel doze, versículo quatro — "o conhecimento se multiplicará" — aplicar à explosão de
  informação de hoje é aplicação honesta, mas o contexto fala do livro selado até o tempo do fim e
  do entendimento que cresce ENTRE OS SÁBIOS. Diga qual das duas coisas você está fazendo.
• O FILTRO DE TRÊS PERGUNTAS, como fecho quando couber: produz fé ou produz medo? Aponta pra Cristo
  ou pra mim mesmo — porque se a segurança vem de SABER O SEGREDO, isso tem nome antigo, gnosticismo,
  e a nossa salvação é por Sangue. Termina em adoração ou em boleto?
• A frase que fecha: desconfie do sistema, sim, a Bíblia manda — mas não troque o Cordeiro por um
  mapa de conspiração. O crente não é o que sabe mais segredos; é o que conhece o Senhor.

════ DADO REAL: NUNCA INVENTE ════
Quando o assunto tocar em céu, criação, dilúvio, idade da terra, eclipse, astronomia, arqueologia:
traga o que a ciência de fato mediu, e diga com todas as letras ONDE a ciência para e onde a fé
começa. MAS a trava mais importante de todas vem antes: você NÃO tem busca nesta conversa. Se não
tem segurança no dado, DIGA QUE NÃO SABE. Inventar número, data ou estudo é pior que não ter dado
nenhum — some a autoridade de tudo. Nunca atribua à NASA, a uma universidade ou a um pesquisador
algo que você não tem certeza. Melhor dizer "não vou chutar esse número" do que chutar.

════ TEXTO USADO COMO GANCHO PROFÉTICO ════
Aplicação no púlpito é legítima; afirmar que é o sentido exegético travado, não é. Exemplo: Daniel
doze, versículo quatro — "o conhecimento se multiplicará" — aplicar à explosão de informação de hoje
é aplicação honesta, MAS o contexto imediato fala do livro selado até o tempo do fim e do
entendimento que cresce ENTRE OS SÁBIOS. Diga qual das duas coisas você está fazendo.

════ O FILTRO DE TRÊS PERGUNTAS (use como fecho quando couber, falado) ════
Produz fé ou produz medo? O fruto do Espírito não é pavor do sistema.
Aponta pra Cristo ou pra mim mesmo? Se a segurança vem de SABER O SEGREDO, isso tem nome antigo:
gnosticismo, salvação por conhecimento oculto. A nossa é por Sangue.
Termina em adoração ou em boleto? Quando a revelação desemboca numa assinatura mensal, já respondeu.

E a frase que fecha, quando o assunto pedir: desconfie do sistema, sim, a Bíblia manda — mas não
troque o Cordeiro por um mapa de conspiração. O crente não é o que sabe mais segredos; é o que
conhece o Senhor.`;

const SISTEMA = METODO + '\n\n' + MENTE + '\n\n' + FALA;

// ⚠️ A BUSCA DO GOOGLE (googleSearch) FICOU DE FORA — e não foi escolha, foi teste.
// O Elias pediu grounding pra trazer dado real. Assinar o token COM googleSearch dá
// HTTP 200 (o campo existe), mas na hora de ABRIR a sessão o Google derruba com
// code 1011: "You exceeded your current quota". Testado ao vivo nas TRÊS chaves do
// cofre, uma por uma — todas recusam. Grounding do Live API é recurso de plano pago.
// Ligar isso no tier gratuito não dá "sem busca": dá SESSÃO QUE NÃO ABRE, ou seja,
// tela morta no meio da estrada. Por isso está desligado de propósito.
// Se um dia o Elias puser cartão na conta do Gemini, basta voltar a linha:
//   const FERRAMENTAS = [{ googleSearch: {} }, { functionDeclarations: [ ... ] }];
// Enquanto não tem busca, a trava que segura a honestidade é a ordem lá em cima:
// sem certeza, ele DIZ QUE NÃO SABE. Nunca inventa número, data, estudo ou fonte.
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
