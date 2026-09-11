// GERAR UMA PEÇA (mensagem ou estudo) A PARTIR DE UM ESTUDO COM O CONCÍLIO
// URL pública: POST /api/peca   (rewrite -> /api/edge?fn=peca)
//
// O CICLO QUE ISTO FECHA:
// o pastor termina de cavar um texto com um dos 42 servos → clica "Gerar uma mensagem" ou
// "Gerar um estudo" → a IA transforma o que foi garimpado numa peça PRONTA, no formato certo
// → ele confere no preview, copia se quiser, e publica (POST /api/publicacoes) → cai na lista.
//
// A GRAVAÇÃO NÃO É AQUI. Aqui só nasce o texto (streaming, pra ele ver saindo).
// Gravar é /api/publicacoes (Node + pg), porque banco não roda no Edge.
//
// ⚙️ IA: passa pela cascata única do RADAR (api/_lib/ia.js — Groq→Cerebras→Gemini→
// DeepSeek→OpenAI). Aqui NÃO existe chamada direta a provedor nenhum, de propósito:
// no dia em que a conta da OpenAI secou, o Concílio inteiro caiu junto. Nunca mais.

export const config = { runtime: 'edge' };

import { respostaStream, respostaErro } from './ia.js';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

// ─────────────────────────────────────────────────────────────────────────────
// 1) O QUE FAZ A PEÇA PRESTAR
// ─────────────────────────────────────────────────────────────────────────────

// Travas que valem pros 42 — é o que impede a peça de virar "besteira bonita".
const CRIVO = `
LEIS INEGOCIÁVEIS (se quebrar uma, a peça não presta):
1. VERDADE ANTES DE EFEITO. Nunca invente etimologia, número, costume ou "curiosidade" pra impressionar. Nunca cite versículo que não existe — só referência real (Livro capítulo:versículo), conferida.
2. DIGA O QUE É O QUÊ. Se está escrito, cite o versículo. Se é dedução, escreva como dedução ("o texto diz X, logo Y"). Se é TRADIÇÃO que o texto NÃO afirma, AVISE que é tradição e mostre onde o texto para.
3. CRISTO NO CENTRO. Tudo cresce e desemboca na pessoa e na obra de Jesus.
4. DOUTRINA: evangélica pentecostal clássica (Assembleia de Deus). Nada de prosperidade torta, alegoria sem base, achismo teológico.
5. NADA DE ENCHIMENTO. Cada parágrafo entrega um tesouro novo. Se a frase não acrescenta, corte.
6. PORTUGUÊS DO BRASIL. Reverente, claro — o leitor é pregador, não acadêmico.`;

// O método do Wagner (destilado de D:\\SKILL\\wagner-cordeiro\\SKILL.md — 12 aulas do GIOM).
// Sem isto, "no estilo do Wagner" vira caricatura com "diga amém" em cima de texto raso.
const METODO_WAGNER = `
MÉTODO DE GARIMPO TIPOLÓGICO (Dr. Wagner Cordeiro — GIOM). A regra-mãe: o bordão só se paga quando tem GARIMPO atrás. Primeiro o achado, depois o estilo.
• GATILHO CONCRETO: parta de algo MATERIAL escrito no versículo (objeto, material, animal, número/medida, raiz hebraica/grega, movimento/repetição, anomalia no texto, costume judaico). Sem gatilho concreto NÃO HÁ tipologia.
• A PERGUNTA FIXA: "aponta para quê?", "quem é?", "para quem é isso?" — reatribuição de referente, não aplicação devocional.
• LIGUE PELA FUNÇÃO, nunca imagem com imagem. Errado: "a pomba é branca, Jesus é puro". Certo: "a pomba é solta, procura, não acha onde pousar e volta — é a trajetória do Espírito". A propriedade REAL do objeto é o argumento.
• DOIS PILARES TRAVADOS: texto de saída (AT) e texto de chegada (NT), presos pela mesma palavra ou pela mesma conta.
• PROVA REAL (a assinatura dele): uma SEGUNDA testemunha independente no texto que reproduz a sequência inteira. Sem prova real é hipótese — e hipótese se anuncia como hipótese.
• ARITMÉTICA CONFERÍVEL: se houver número, faça a conta em voz alta e auditável. Se a medida for disputada, declare a margem.
• FECHE EM ORDEM PRÁTICA, nunca em admiração. Nada termina em "que lindo".
• AVISE QUANDO O TEXTO NÃO AFIRMA o que a tradição afirma. Ele mesmo reprova tipologia popular que não passa no crivo — e é isso que dá autoridade ao que ele aprova.
• RITMO: frase curta, pergunta, objeção do ouvinte antecipada e respondida. Bordões ("irmão", "diga por quê", "quer que eu prove?") CALIBRADOS pela densidade do raciocínio — nunca espalhados de enfeite.
• ESCATOLOGIA: ele recusa rótulo ("não sou eu, é a Bíblia"). NUNCA escreva "posição pré-tribulacionista" como etiqueta dele.`;

// MENSAGEM = curta, devocional, pra LER. Prosa. Final que queima (padrão do Escavador).
const FORMA_MENSAGEM = `
VOCÊ VAI ESCREVER UMA **MENSAGEM** — curta, devocional, feita pra ser LIDA (e pregada).
• Prosa contínua e fluida. NADA de tópicos numerados, nada de cabeçalho de seção.
• Tamanho: 450 a 750 palavras. Densa do primeiro ao último parágrafo.
• Abertura que fisga: comece por uma cena, uma imagem ou uma tensão do PRÓPRIO texto. Nunca "hoje falaremos sobre".
• UM fio condutor que cresce.
• O FECHO TEM QUE QUEIMAR: sobe, não desce. Frases curtas de martelo, 2ª pessoa, verbo no imperativo, o Nome de Jesus dito com força. Proibido terminar num parágrafo calmo de resumo ("Portanto, lembre-se…"). Se dá pra ler o último parágrafo sem levantar a voz, reescreva.
• Use **negrito** só nas palavras no original e nas frases-chave; *itálico* nas citações.`;

// ESTUDO = longo, com desenvolvimento e pontos.
const FORMA_ESTUDO = `
VOCÊ VAI ESCREVER UM **ESTUDO** — longo, com desenvolvimento e pontos, pra estudar e ensinar.
• Tamanho: 900 a 1500 palavras.
• De 5 a 8 seções. Cada seção começa numa linha própria assim: "## 📖 Nome da seção" (o emoji é opcional, o "## " é obrigatório).
• Dentro da seção: parágrafos OU tópicos começando com "- ". Tópico tem que ter carne, não pode ser frase solta.
• Sequência que faz sentido pra quem ensina: o texto e o pano de fundo → o gatilho/a palavra no original → o desenvolvimento → a ponte pro Novo Testamento → o que o texto NÃO afirma (se a tradição afirmar) → a aplicação.
• A ÚLTIMA seção é o fechamento em ORDEM PRÁTICA — o que a pessoa faz a partir de hoje. Nunca termine em admiração.
• Use **negrito** nas palavras no original e nas frases-chave; *itálico* nas citações.`;

const FORMATO_SAIDA = `
FORMATO DA RESPOSTA — obrigatório, exatamente nesta ordem, sem nada antes nem depois:
TITULO: (título forte, sem aspas, no máximo 8 palavras)
REFERENCIA: (as referências bíblicas centrais, ex.: "Gênesis 8 · João 1:32")
EMOJI: (UM emoji que combine com a peça)
RESUMO: (1 a 2 frases densas que dão vontade de abrir — é a isca do card na lista)
CORPO:
(o texto da peça, daqui até o fim)

Não escreva "CORPO" de novo lá dentro. Não use crase nem bloco de código. Não comente o que você fez.`;

// ─────────────────────────────────────────────────────────────────────────────
// 2) O HANDLER
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('POST apenas', { status: 405, headers: CORS });

  let b = {};
  try { b = await req.json(); } catch (_) {}

  const tipo = String(b.tipo || '').trim() === 'estudo' ? 'estudo' : 'mensagem';
  const e = b.expositor || {};
  const nome = String(e.nome || '').trim() || 'o Concílio dos Expositores';
  const idExp = String(e.id || '').trim();
  const tag = String(e.tag || '').trim();
  const cre = String(e.cre || '').trim();
  const forte = String(e.forte || '').trim();
  const tema = String(b.tema || '').trim().slice(0, 300);
  const estudado = String(b.estudo || '').trim().slice(0, 14000);

  // REFINAR: o pastor leu a peça pronta, reprovou pontos e quer melhorar COM o servo.
  // Chega o rascunho atual + os apontamentos dele; a gente reescreve a peça inteira melhor.
  const rascunho = String(b.rascunho || '').trim().slice(0, 16000);
  const criticas = String(b.criticas || '').trim().slice(0, 2500);
  const refinando = !!(rascunho && criticas);

  if (!estudado && !tema && !refinando) {
    return new Response('Não veio nada do estudo pra transformar em peça.', { status: 400, headers: CORS });
  }

  // A VOZ: pro Wagner é o método (o que ele faz ANTES de abrir a boca);
  // pros outros 41 é a ficha do eruditos.json (crê / forte em).
  const ehWagner = /wagner/.test(idExp) || /wagner/i.test(nome);
  const voz = ehWagner
    ? METODO_WAGNER
    : `A VOZ DE ${nome.toUpperCase()}${tag ? ' — ' + tag : ''}.
${cre ? 'O que ele crê: ' + cre + '.' : ''}
${forte ? 'Onde ele é forte: ' + forte + '.' : ''}
Escreva no jeito DELE de cavar o texto: os ganchos que ele persegue, o rigor que ele cobra, os assuntos que ele domina. Não imite trejeito de fala — reproduza o TRABALHO que ele faz no texto. Não atribua a ele posição doutrinária que não esteja na ficha acima.`;

  const sistema = `Você escreve como ${nome}, do Concílio dos Expositores do RADAR — a biblioteca de estudo do pastor.
${voz}
${CRIVO}
${tipo === 'estudo' ? FORMA_ESTUDO : FORMA_MENSAGEM}
${FORMATO_SAIDA}`;

  const usuario = refinando
    ?
`Você JÁ escreveu a ${tipo === 'estudo' ? 'peça de estudo' : 'mensagem'} abaixo. O pastor LEU, REPROVOU pontos e quer que você MELHORE — junto com ele, no seu método, deixando as LIGAÇÕES do texto mais claras.

${tema ? 'TEXTO/TEMA CENTRAL: ' + tema + '\n' : ''}
══════ O QUE VOCÊ ESCREVEU (rascunho a melhorar) ══════
${rascunho}
══════ FIM ══════

══════ O QUE O PASTOR REPROVOU / PEDIU PRA MELHORAR ══════
${criticas}
══════ FIM ══════

Reescreva a ${tipo === 'estudo' ? 'PEÇA DE ESTUDO' : 'MENSAGEM'} INTEIRA, melhor que antes: atenda CADA ponto que o pastor levantou, sem perder o que já estava bom. Mantenha o rigor do método (gatilho concreto, ligação pela FUNÇÃO, dois pilares travados, prova real, aritmética conferível, fechar em ordem prática) e mostre as ligações com mais clareza. Se um pedido dele forçar uma ponte que o texto não sustenta, NÃO force: faça o melhor que o texto permite e diga com franqueza onde ele para. Confira cada referência bíblica.
Responda SÓ no formato pedido (TITULO/REFERENCIA/EMOJI/RESUMO/CORPO).`
    :
`Abaixo está o estudo que acabou de ser feito com ${nome}. Transforme o que foi garimpado aqui numa ${tipo === 'estudo' ? 'PEÇA DE ESTUDO' : 'MENSAGEM'} pronta para o RADAR.

${tema ? 'TEMA/TEXTO CENTRAL: ' + tema + '\n' : ''}
══════ O QUE FOI ESTUDADO ══════
${estudado || '(sem transcrição — trabalhe o tema acima do zero, com o mesmo método)'}
══════ FIM ══════

Aproveite os achados que já estão aí (as pontes, as palavras no original, as contas) — não jogue fora o trabalho. Onde faltar, complete com o mesmo rigor. Confira cada referência bíblica antes de escrever. Se alguma coisa dita ali for tradição e não texto, avise no corpo da peça.
Responda SÓ no formato pedido (TITULO/REFERENCIA/EMOJI/RESUMO/CORPO).`;

  // Streaming: o pastor vê a peça se formando, em vez de encarar tela parada.
  // Quem escolhe o provedor é a cascata — e ela devolve X-IA-Provedor no cabeçalho.
  try {
    return await respostaStream({
      sys: sistema,
      user: usuario,
      temperature: 0.85,
      max_tokens: tipo === 'estudo' ? 3600 : 2400,
      tag: 'peca-' + tipo
    }, CORS);
  } catch (e) {
    return respostaErro(e, CORS);
  }
}
