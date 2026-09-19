// GERADOR DE ESTUDOS DE DOUTRINA — culto de doutrina sobre ASSUNTOS ATUAIS
// URL pública: POST /api/estudo-doutrina   (rewrite -> /api/edge?fn=estudo-doutrina)
//
// POR QUE ISTO EXISTE:
// o pastor sobe no culto de doutrina com um assunto que a igreja está vivendo ESTA semana
// (conspiração, "fé quântica", ansiedade, IA, pornografia, prosperidade). Ou ele trata com
// profundidade bíblica, ou a internet trata primeiro — e trata errado.
//
// A ESTRUTURA É FIXA, EM 6 PARTES. Ela nasceu de uma resposta sobre conspiração/ocultismo
// que o Elias aprovou, e o que a faz funcionar é a PARTE 2: a concessão honesta. Dizer
// "é tudo mentira" é tão desonesto quanto acreditar em tudo. O estudo só ganha autoridade
// quando reconhece o caroço de verdade ANTES de desmontar o erro.
//
// ⚙️ IA: passa pela cascata única do RADAR (api/_lib/ia.js — Groq→Cerebras→Gemini→
// DeepSeek→OpenAI). Nenhuma chamada direta a provedor aqui, de propósito.
//
// 📤 SAÍDA: MARKDOWN ESTRUTURADO em streaming (text/plain; charset=utf-8).
//    Escolhi markdown, e não HTML pronto, por três motivos:
//    1) o pastor vê o estudo SE FORMANDO (streaming) em vez de encarar tela parada 40s;
//    2) o botão "📋 Copiar" entrega texto limpo, que cola no WhatsApp e no Word;
//    3) a página desenha o visual do RADAR por cima — o HTML fica onde ele deve ficar.
//    Contrato do markdown (a página conta com isto):
//      TITULO: ...            → <h1>
//      TEMA: ...              → linha dourada de referência
//      ## 1 ... até ## 6 ...  → <h2> das seis partes (SEMPRE as seis, nesta ordem)
//      **negrito**  *itálico* → <strong> vinho / <em> navy
//      - item                 → tópico
//      > linha                → destaque (a frase que fecha)

export const config = { runtime: 'edge' };

import { iaStreamTexto, iaTexto, cabecalhosIa, respostaErro } from './ia.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ─────────────────────────────────────────────────────────────────────────────
// 1) AS SEIS PARTES — o esqueleto que o Elias aprovou
// ─────────────────────────────────────────────────────────────────────────────
const SECOES = [
  { n: 1, cab: '## 1 ❌ O QUE É FALSO MESMO',
    ordem: 'Nomeie SEM RODEIO o que, dentro deste assunto, não tem prova nenhuma — a afirmação exagerada, o boato, a promessa que ninguém cumpre, o número inventado. Chame cada coisa pelo nome. Não é aqui que você pega leve.' },
  { n: 2, cab: '## 2 🪝 O QUE É VERDADE E SERVE DE ISCA',
    ordem: 'A CONCESSÃO HONESTA — esta é a parte que dá autoridade ao estudo inteiro. Diga o caroço de verdade REAL que existe no assunto e que é justamente o que dá combustível ao erro: a dor legítima, o fato documentado, a desconfiança que se justifica. Dizer "é tudo mentira" é tão desonesto quanto acreditar em tudo. Reconheça o que é fato — e depois mostre por que o fato não sustenta a conclusão errada que tiraram dele.' },
  { n: 3, cab: '## 3 📖 O QUE A BÍBLIA DIZ DE FATO',
    ordem: 'Doutrina firme. A parte MAIS LONGA do estudo — no mínimo metade dele. TRANSCREVA entre aspas pelo menos 3 versículos-chave, cada um seguido da referência entre parênteses, exatamente neste formato: "texto do versículo" (Efésios 6:12). É assim que o irmão acompanha de Bíblia aberta. Puxe os textos que realmente tratam do assunto e exponha o que eles ensinam. Traga 1 a 3 palavras no hebraico/grego SOMENTE quando o original muda o sentido — e só termos que você tem certeza absoluta que existem. Diga o que está escrito, o que é dedução e o que é tradição. Doutrina evangélica pentecostal clássica (Assembleia de Deus).' },
  { n: 4, cab: '## 4 ⚠️ A TROCA PERIGOSA',
    ordem: 'O erro exato que se comete. Formule como TROCA: o crente larga uma verdade bíblica e pega no lugar uma falsificação parecida com ela. Escreva no formato "trocar X por Y" e mostre por que a falsificação é parecida o bastante para enganar e diferente o bastante para matar.' },
  { n: 5, cab: '## 5 🧪 O TESTE QUE RESOLVE NO ATACADO',
    ordem: 'De 2 a 4 perguntas práticas, numeradas com "- ", que o irmão leva pra casa e aplica SOZINHO em qualquer caso parecido — não só neste. Cada pergunta em negrito, seguida de uma frase curta explicando o que a resposta revela. Perguntas de peneira, não de catequese.' },
  { n: 6, cab: '## 6 🔨 A FRASE QUE FECHA',
    ordem: 'UMA linha curta, de martelo, que a igreja consegue repetir em voz alta e levar na memória. Escreva a linha começando com "> " (blockquote) e NADA depois dela. Ela aterrissa em Cristo, não no assunto. Nada de parágrafo de resumo.' },
];

// O piso de palavras POR PARTE. Sem isto o estudo sai curto:
// pedir "1100 a 1500 palavras" no topo do prompt não segura — testado em produção,
// curto/médio/longo davam 575/630/637 palavras, praticamente o mesmo texto. O que
// funciona é cobrar o tamanho DENTRO de cada parte, onde o modelo está escrevendo.
// ⚠️ Piso alto demais faz MAIS mal que piso baixo: com 900 palavras na parte 3 o
// modelo entrou em loop e repetiu Romanos 12:2 vinte e nove vezes, com o mesmo
// comentário reescrito, pra bater a meta. Volume falso é pior que estudo curto.
// Estes números são os que ele preenche com conteúdo de verdade.
const PISOS = {
  curto: [90, 90, 330, 110, 90],
  medio: [150, 160, 560, 180, 130],
  longo: [200, 220, 700, 240, 170],
};

function esqueleto(chave) {
  const p = PISOS[chave] || PISOS.medio;
  return SECOES.map((s, i) => {
    const piso = i < 5 ? ` [NO MÍNIMO ${p[i]} PALAVRAS NESTA PARTE]` : ' [UMA LINHA SÓ]';
    return s.cab + piso + '\n(' + s.ordem + ')';
  }).join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) AS TRAVAS — vêm da skill "mensagens-para-pregar" (SKILL.md).
//    Não é decoração de prompt: é o que impede o estudo de virar besteira bonita.
// ─────────────────────────────────────────────────────────────────────────────
const TRAVA_QUALIDADE = `
TRAVA DE QUALIDADE (se quebrar uma, o estudo não presta — refaça antes de entregar):
1. TODA REFERÊNCIA BÍBLICA CORRETA e conferida: livro, capítulo e versículo reais, e o versículo tem que dizer MESMO o que você afirma que ele diz. Na dúvida, troque por outro que você tenha certeza. NUNCA cite versículo que não existe.
1b. A TRANSCRIÇÃO TEM QUE BATER COM A REFERÊNCIA. Se você colocar o versículo entre aspas, as palavras citadas precisam ser DAQUELA referência exata. Transcrever o texto de um versículo e etiquetar com a referência de outro é o erro mais comum e o mais grave — o pastor lê no púlpito, a igreja abre a Bíblia e não acha. Se você lembra da frase mas não tem certeza absoluta do capítulo e versículo, NÃO TRANSCREVA: só remeta à referência e explique com as suas palavras o que ela ensina.
2. NENHUM SIGNIFICADO DE PALAVRA INVENTADO. Só hebraico/grego real e defensável. Se não tem certeza do termo, NÃO USE — o estudo fica ótimo sem ele e morre com um inventado.
3. DOUTRINA ASSEMBLEIA DE DEUS (pentecostal clássica) intacta: nada de prosperidade torta, alegoria sem base, achismo teológico, nem sincretismo.
4. FIEL AO TEXTO: a verdade nasce da Escritura, não é imposta sobre ela.
5. TERMINA EM CRISTO. Sempre.
6. NADA DE ENCHIMENTO. Cada parágrafo entrega algo novo. Se a frase não acrescenta, corte.
6b. PROIBIDO REPETIR PARA ENCHER. Cada versículo transcrito aparece UMA ÚNICA VEZ no estudo inteiro — se você já citou, não cite de novo. Nunca reescreva o mesmo parágrafo com outras palavras para alcançar o tamanho. Se faltar conteúdo para o piso de palavras, AVANCE: traga outro texto bíblico, responda uma objeção nova, desça ao detalhe concreto. Estudo curto e honesto vale mil vezes mais que estudo inchado de repetição — e a repetição é percebida na hora por quem está ouvindo.
7. PORTUGUÊS DO BRASIL, reverente e claro. O leitor é pregador e igreja, não academia.
8. SEM DATA DE VALIDADE CURTA: trate o assunto pela raiz. Não invente notícia, estatística, nome de pessoa, caso recente nem pesquisa. Se não sabe um dado, fale do fenômeno sem o dado.`;

const NORMA_FEROZ = `
NORMA FEROZ — CONSPIRAÇÃO, ESOTERISMO E "CONHECIMENTO SECRETO" (vale para QUALQUER assunto deste estudo, não só os de conspiração):

As três perguntas que resolvem no atacado:
1. PRODUZ FÉ OU PRODUZ MEDO? O fruto do Espírito não é pavor do sistema.
2. APONTA PRA CRISTO OU PRA MIM MESMO? Se a segurança vem de SABER O SEGREDO, isso tem nome antigo: gnosticismo — salvação por conhecimento oculto. A nossa é por Sangue.
3. TERMINA EM ADORAÇÃO OU EM BOLETO? Quando a "revelação" desemboca numa assinatura mensal, a resposta já veio.

A TROCA QUE NUNCA SE FAZ: a Bíblia afirma poderes invisíveis por trás dos sistemas do mundo (Efésios 6:12) e engano com sinais e prodígios de mentira (2 Tessalonicenses 2:9-11). Isso é DOUTRINA, não conspiração. O erro mortal é trocar a demonologia bíblica por ufologia: a Escritura conhece anjos e demônios — não conhece civilizações de outro planeta. Se há fenômeno real, a chave de leitura é ENGANO ESPIRITUAL, nunca "visita de vizinhos cósmicos".

SEJA HONESTO NAS DUAS DIREÇÕES:
• Não afirme o que não se prova: reptiliano, clone de presidente, raça extraterrestre governando — sem evidência, fica fora. Ponto.
• Nem negue o que é fato: conspirações reais existiram e estão documentadas (MKUltra, Tuskegee, vigilância em massa). Dizer "é tudo mentira" é tão desonesto quanto acreditar em tudo. A postura certa é DISCERNIMENTO, não negação automática.

TEXTO USADO COMO GANCHO PROFÉTICO — a régua: aplicação no púlpito é legítima; afirmar que é o sentido exegético travado, não é. Exemplo: Daniel 12:4 ("o conhecimento se multiplicará") aplicado à explosão de informação do nosso tempo é aplicação homilética honesta; mas o contexto imediato fala do livro selado até o tempo do fim e do entendimento que cresce ENTRE OS SÁBIOS. DIGA QUAL DAS DUAS VOCÊ ESTÁ FAZENDO.

O AVISO DE PAULO É A DESCRIÇÃO DO GÊNERO: virá gente que desvia os ouvidos da verdade para as FÁBULAS — no grego, mýthous (2 Timóteo 4:3-4). Reconheça o gênero e não o coloque no púlpito.

REGRA DE OURO DESTA NORMA: o crente não é o que sabe mais segredos; é o que conhece o Senhor. Se o seu estudo deixa o ouvinte com mais medo do que fé, ou mais esperto do que santo, ele está reprovado — reescreva.`;

// ─────────────────────────────────────────────────────────────────────────────
// 3) TAMANHO E PÚBLICO
// ─────────────────────────────────────────────────────────────────────────────
const TAMANHOS = {
  curto: { chave: 'curto', palavras: '700 a 950 palavras', tokens: 2600 },
  medio: { chave: 'medio', palavras: '1100 a 1500 palavras', tokens: 3800 },
  longo: { chave: 'longo', palavras: '1700 a 2300 palavras', tokens: 5200 },
};

function lerTamanho(v) {
  const t = String(v || '').trim().toLowerCase();
  if (t === 'curto' || t === 'pequeno') return TAMANHOS.curto;
  if (t === 'longo' || t === 'grande' || t === 'profundo') return TAMANHOS.longo;
  return TAMANHOS.medio;
}

function lerPublico(v) {
  const p = String(v || '').trim().toLowerCase();
  if (/jovem|jovens|adolesc/.test(p))
    return 'PÚBLICO: JOVENS. Linguagem direta e viva, exemplos do mundo deles (celular, rede social, faculdade, namoro, trabalho), sem gíria forçada e sem infantilizar. Eles aguentam doutrina — o que eles não aguentam é enrolação.';
  if (/líder|lider|obreir|diácon|diacon|pastor|ministério|ministerio/.test(p))
    return 'PÚBLICO: LÍDERES E OBREIROS. Pode aprofundar o argumento, nomear a corrente teológica e mostrar onde ela nasceu. Eles vão ENSINAR isto adiante, então entregue o estudo com as costuras à mostra: onde o texto sustenta, onde é aplicação, onde a tradição foi longe demais.';
  return 'PÚBLICO: A IGREJA TODA. Do adolescente ao idoso, gente simples e gente formada no mesmo banco. Explique todo termo técnico na primeira vez que usar. Profundidade sim, hermetismo não.';
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) O PROMPT
// ─────────────────────────────────────────────────────────────────────────────
function montarPrompt(tema, publico, tam) {
  const sys = `Você é o preparador de ESTUDOS DE DOUTRINA do RADAR — a biblioteca de estudo de um pastor da Assembleia de Deus. O estudo que você escreve vai ser ENSINADO no culto de doutrina, de pé, diante da igreja.

O QUE VOCÊ FAZ: pega um assunto ATUAL — desses que a igreja está vivendo, vendo no celular e discutindo no grupo — e trata com PROFUNDIDADE BÍBLICA. Não é opinião de púlpito. Não é desabafo. É doutrina aplicada ao que está acontecendo agora.

${lerPublico(publico)}
TAMANHO: ${tam.palavras} — este tamanho é PISO, não teto. Um estudo curto demais não dá culto. A parte 3 (o que a Bíblia diz) sozinha leva metade do estudo; as partes 1, 2 e 4 são médias; a 5 é enxuta; a 6 é uma linha só.
${TRAVA_QUALIDADE}
${NORMA_FEROZ}

═══ ESTRUTURA OBRIGATÓRIA — SEIS PARTES, NESTA ORDEM, SEM PULAR NENHUMA ═══
Comece com estas duas linhas, exatamente assim:
TITULO: (título forte do estudo, sem aspas, no máximo 8 palavras)
TEMA: (o assunto em 3 a 6 palavras · e as referências bíblicas centrais)

Depois, as seis partes. Copie os seis cabeçalhos LETRA POR LETRA, cada um numa linha própria:

${esqueleto(tam.chave)}

O PISO DE PALAVRAS DE CADA PARTE É PARA CUMPRIR. Um estudo curto demais não dá culto de doutrina: o pastor fica sem material no meio da mensagem. Desenvolva de verdade — explique, exemplifique, responda a objeção que o ouvinte faria. O que não vale é encher linguiça repetindo a mesma ideia com outras palavras.

REGRAS DE ESCRITA:
• Prosa de ensino, corrida — não é lista de tópicos soltos. Use "- " só na parte 5.
• **Negrito** nas palavras no original, nas referências-chave e nas frases de martelo. *Itálico* nas citações de versículo.
• Sem crase tripla, sem bloco de código, sem tabela, sem HTML.
• Não escreva nada antes do TITULO nem depois da linha do "> ". Não comente o que você fez.`;

  const user = `ASSUNTO DO CULTO DE DOUTRINA:
${tema}

Escreva o estudo completo agora, nas seis partes, com os cabeçalhos copiados letra por letra.
Antes de escrever cada referência bíblica, confira mentalmente se o versículo existe e se diz mesmo o que você vai afirmar — se ficar em dúvida, use outro.
Se este assunto tiver cheiro de conspiração, esoterismo ou "conhecimento secreto", a NORMA FEROZ manda: honesto nas duas direções, e o fecho aponta pro Cordeiro, não pro mapa.`;

  return { sys, user };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) GUARDA ANTI-VAZIO / ANTI-CAPENGA
// A ideia vem do concilio-wagner.js ("o pastor nunca pode voltar sem resposta"),
// só que aqui ela é mais exigente: não basta VIR texto — têm que vir as SEIS partes.
// Estudo com a parte 5 faltando é pior que estudo nenhum, porque o pastor só
// descobre o buraco no meio do culto.
//
// Como funciona: o texto sai em streaming (ele vê se formando) e a gente vai
// guardando uma cópia. Quando o stream acaba, conferimos os seis cabeçalhos.
// Se faltar alguma parte, pedimos SÓ as partes que faltaram e emendamos no fim.
// Se não veio nada, sai um recado claro — nunca uma bolha muda.
// ─────────────────────────────────────────────────────────────────────────────
function faltando(txt) {
  return SECOES.filter((s) => !new RegExp('^\\s*#{1,3}\\s*' + s.n + '\\b', 'm').test(txt));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) O HANDLER
// Entrada: { tema, publico?, tamanho? }
// Saída  : markdown em streaming (text/plain) + X-IA-Provedor / X-IA-Modelo
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('POST apenas', { status: 405, headers: CORS });

  let b = {};
  try { b = await req.json(); } catch (_) {}

  const tema = String(b.tema || b.assunto || '').trim().slice(0, 600);
  if (!tema) {
    return new Response('Escreva o assunto do culto de doutrina (ou toque num dos temas sugeridos).', { status: 400, headers: CORS });
  }

  const tam = lerTamanho(b.tamanho);
  const { sys, user } = montarPrompt(tema, b.publico, tam);

  let r;
  try {
    r = await iaStreamTexto({ sys, user, temperature: 0.7, max_tokens: tam.tokens, tag: 'estudo-doutrina' });
  } catch (e) {
    return respostaErro(e, CORS);
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    let tudo = '';
    try {
      const reader = r.stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const pedaco = dec.decode(value, { stream: true });
        tudo += pedaco;
        await writer.write(enc.encode(pedaco));
      }
    } catch (e) {
      console.error('[estudo-doutrina] stream caiu: ' + String((e && e.message) || e).slice(0, 150));
    }

    // (a) não veio NADA — recado honesto, nunca bolha vazia
    if (!tudo.trim()) {
      try {
        await writer.write(enc.encode(
          'TITULO: Nenhuma IA respondeu agora\nTEMA: ' + tema + '\n\n' +
          '## 1 ❌ O QUE É FALSO MESMO\nO gerador não conseguiu falar com nenhum provedor de IA neste momento — e eu não vou te entregar um estudo pela metade fingindo que deu certo.\n\n' +
          '## 6 🔨 A FRASE QUE FECHA\n> Toque em "Gerar estudo" de novo em alguns instantes.'
        ));
      } catch (_) {}
      try { await writer.close(); } catch (_) {}
      return;
    }

    // (b) veio capenga — pede SÓ o que faltou e emenda
    const buracos = faltando(tudo);
    if (buracos.length) {
      console.warn('[estudo-doutrina] faltaram as partes: ' + buracos.map((s) => s.n).join(','));
      try {
        const pedido = buracos.map((s) => s.cab + '\n(' + s.ordem + ')').join('\n\n');
        const c = await iaTexto({
          sys,
          user: `O estudo sobre "${tema}" foi escrito, mas FICOU FALTANDO ${buracos.length === 1 ? 'uma parte' : 'partes'}. Aqui está o que já existe:

══════ ESTUDO ATÉ AQUI ══════
${tudo.slice(-6000)}
══════ FIM ══════

Escreva AGORA, e somente, ${buracos.length === 1 ? 'a parte que falta' : 'as partes que faltam'}, no mesmo tom e sem repetir o que já foi dito, copiando o cabeçalho letra por letra:

${pedido}

Não escreva mais nada além ${buracos.length === 1 ? 'dessa parte' : 'dessas partes'}.`,
          temperature: 0.7,
          max_tokens: 1800,
          tag: 'estudo-doutrina-emenda',
        });
        if (c && c.texto && c.texto.trim()) {
          await writer.write(enc.encode('\n\n' + c.texto.trim()));
          tudo += '\n' + c.texto;
        }
      } catch (e) {
        console.error('[estudo-doutrina] emenda falhou: ' + String((e && e.message) || e).slice(0, 150));
      }

      // ainda capenga depois da emenda: avisa em vez de deixar o pastor descobrir no culto
      const aindaFalta = faltando(tudo);
      if (aindaFalta.length) {
        try {
          await writer.write(enc.encode(
            '\n\n⚠️ *A IA não entregou ' + (aindaFalta.length === 1 ? 'a parte ' : 'as partes ') +
            aindaFalta.map((s) => s.n).join(', ') + ' deste estudo. Gere de novo para receber as seis completas.*'
          ));
        } catch (_) {}
      }
    }

    try { await writer.close(); } catch (_) {}
  })();

  return new Response(readable, {
    headers: cabecalhosIa(r, { ...CORS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }),
  });
}
