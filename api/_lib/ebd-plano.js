// PLANO DE AULA DA EBD — a "Priscila" do Igreja Squad dentro do RADAR
// URL pública: POST /api/ebd-plano   (rewrite -> /api/edge?fn=ebd-plano)
// Corpo: { turma: 'adulto4', licao: 2, classe: 'Adultos' }  (a aula da EBD é sempre de 60 minutos)
//
// POR QUE ISTO EXISTE:
// o professor abre a lição do domingo e precisa transformar 8 páginas de revista numa
// aula de 1 hora: objetivo, tempos, perguntas, dinâmica, desafio. A Priscila
// (persona do Igreja Squad, At 18.26) faz esse roteiro EM CIMA DA LIÇÃO DO RADAR —
// não inventa outra aula, organiza a da revista para a classe e o tempo que ele tem.
//
// 🔒 TRAVAS DE FIDELIDADE (as mesmas do checklist do Igreja Squad):
//   • versículo transcrito SÓ se estiver no texto da lição (texto áureo / leitura em classe);
//     fora disso, só a referência. A página ainda confere tudo contra /biblia.json.
//   • nada de hebraico/grego, número de Strong ou "significado no original": modelo
//     gratuito inventa isso com facilidade, e o professor repetiria na classe.
//   • resumir a revista com palavras próprias — nunca copiar o comentário (direitos da CPAD).
//
// ⚙️ IA: cascata única do RADAR (api/_lib/ia.js). Sem `premium` — vai de graça.
// 📤 SAÍDA: markdown em streaming, no mesmo contrato do estudo-doutrina
//    (TITULO:, TEMA:, ## n ..., - item, **negrito**, > frase final).

export const config = { runtime: 'edge' };

import { iaStreamTexto, cabecalhosIa, respostaErro } from './ia.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const CLASSES = ['Adultos', 'Jovens', 'Adolescentes', 'Juvenis', 'Juniores', 'Primários', 'Jardim de Infância'];

const SECOES = [
  '## 1 🎯 OBJETIVO DA AULA',
  '## 2 📖 TEXTO ÁUREO E LEITURA',
  '## 3 ⏱️ ROTEIRO DA AULA',
  '## 4 💬 PERGUNTAS PARA DISCUSSÃO',
  '## 5 ✅ PERGUNTAS DE REVISÃO',
  '## 6 🧩 DINÂMICA',
  '## 7 🙌 DESAFIO DA SEMANA',
];

function limparHtml(h) {
  return String(h || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>|<\/h\d>|<\/li>|<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

async function buscar(origem, caminho, limite) {
  try {
    const r = await fetch(origem + caminho);
    if (!r.ok) return '';
    const t = await r.text();
    return (caminho.endsWith('.html') ? limparHtml(t) : t.replace(/\n\s*\n+/g, '\n')).slice(0, limite);
  } catch (_) { return ''; }
}

function sistema(classe, minutos) {
  return `Você é PRISCILA, mestre da Escola Bíblica Dominical do Igreja Squad, servindo no app RADAR de uma igreja Assembleia de Deus (pentecostal clássica). Como Priscila e Áquila "lhe declararam mais pontualmente o caminho de Deus" (At 18.26), você ensina com paciência, ordem e clareza.

SUA TAREFA: transformar a LIÇÃO fornecida num PLANO DE AULA pronto para o professor usar no domingo, para a classe de ${classe}, em ${minutos} minutos — a aula da Escola Bíblica Dominical tem UMA HORA para a lição COMPLETA, do primeiro tópico à oração final. Não existe tempo extra: tudo o que você propuser (acolhida, perguntas, dinâmica, aplicação) precisa caber dentro dessa hora.

REGRAS INVIOLÁVEIS:
1. Siga a lição: mesmos tópicos, mesma doutrina, mesma verdade prática. Você organiza e aplica — não cria outra aula.
2. NÃO copie o comentário da revista. Resuma com suas palavras, em frases curtas (direitos autorais).
3. VERSÍCULOS: só transcreva entre aspas um versículo que esteja ESCRITO na lição (texto áureo ou leitura bíblica em classe), copiando letra por letra, no formato "texto" (Dt 1.30). Qualquer outro versículo: SÓ a referência, sem transcrever. Nunca invente referência.
4. NÃO escreva palavras em hebraico ou grego, transliterações, números de Strong nem "no original significa". Isso fica para o professor pesquisar.
5. Nada de teologia da prosperidade, promessa que a Bíblia não faz, ou história inventada apresentada como real. Ilustração inventada: escreva "(ilustração)".
6. Linguagem simples e calorosa, adequada a ${classe}. Português do Brasil.
7. O roteiro tem de SOMAR exatamente ${minutos} minutos, sem passar nem sobrar um minuto, e os tempos têm de ser realistas para uma classe de EBD: acolhida e oração 5 min; revisão da lição anterior até 3 min; introdução até 3 min; aplicação e desafio 5 a 7 min; oração final 2 min. O restante (cerca de 40 min) é dividido entre os tópicos da lição, em proporção ao tamanho de cada um. A dinâmica e as perguntas NÃO são tempo à parte: use-as dentro do momento de um tópico ou da aplicação, e escreva ali o tempo que levam.
8. Se não couber, corte: é melhor menos atividades e a lição inteira ensinada do que um roteiro bonito que estoura a hora.

FORMATO (markdown, nesta ordem, copiando os cabeçalhos letra por letra):
TITULO: Plano de Aula — Lição <número>: <título da lição>
TEMA: Classe de ${classe} · ${minutos} minutos
${SECOES[0]}
Uma frase: o que o aluno deve entender e decidir ao sair da aula.
${SECOES[1]}
O texto áureo transcrito da lição, com referência; a referência da leitura bíblica em classe.
${SECOES[2]}
Uma linha por momento, no formato: - **0–5 min · Acolhida** — o que o professor faz e fala.
Momentos: acolhida e oração; revisão rápida da lição anterior; introdução com um gancho; um momento para CADA tópico da lição (com o tempo proporcional ao tamanho dele); aplicação; oração final. Confira a soma antes de responder: o último momento termina em ${minutos} min.
${SECOES[3]}
5 perguntas abertas, uma por linha começando com "- ".
${SECOES[4]}
5 perguntas com a resposta logo depois, no formato: - **Pergunta?** Resposta (referência).
${SECOES[5]}
Uma dinâmica simples, com nome, material e passo a passo em até 5 linhas.
${SECOES[6]}
2 ou 3 tarefas práticas para a semana, cada uma começando com "- ".
Termine com UMA linha curta começando com "> " que a classe possa repetir. Nada depois dela.`;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
  if (req.method !== 'POST') return new Response('use POST', { status: 405, headers: CORS });

  let b = {};
  try { b = await req.json(); } catch (_) {}
  const turma = String(b.turma || 'adulto').toLowerCase();
  if (!/^[a-z0-9]{2,20}$/.test(turma)) return new Response('turma inválida', { status: 400, headers: CORS });
  const licao = Math.max(1, Math.min(14, parseInt(b.licao, 10) || 1));
  const classe = CLASSES.includes(b.classe) ? b.classe : 'Adultos';
  // A EBD tem 1 hora para a lição completa: o tempo não é escolhido (nem pela IA, nem pelo professor).
  const minutos = 60;

  // A lição e o apoio vêm do PRÓPRIO site (mesma origem do deploy: produção, preview ou local).
  const origem = new URL(req.url).origin;
  const nn = String(licao).padStart(2, '0');
  const [txtLicao, txtApoio, txtProf] = await Promise.all([
    buscar(origem, `/ebd/${turma}/html/licao-${nn}.html`, 9000),
    buscar(origem, `/ebd/${turma}/html/apoio-${nn}.md`, 4000),
    // Plano de Aula da própria Revista do Professor (objetivos e método sugeridos), quando a turma tem
    buscar(origem, `/ebd/${turma}/html/professor-${nn}.html`, 3800),
  ]);
  if (!txtLicao) {
    return new Response('Não encontrei o texto desta lição no RADAR (' + turma + ', lição ' + licao + ').', { status: 404, headers: CORS });
  }

  const user = `LIÇÃO ${licao} (revista da turma "${turma}"):
══════ TEXTO DA LIÇÃO ══════
${txtLicao}
══════ FIM DA LIÇÃO ══════
${txtProf ? `
══════ SUGESTÃO DA REVISTA DO PROFESSOR (objetivos e método sugeridos: aproveite a ideia, com palavras suas, sem copiar; o roteiro continua tendo de caber em ${minutos} minutos) ══════
${txtProf}
══════ FIM DA SUGESTÃO ══════
` : ''}${txtApoio ? `
══════ MATERIAL DE APOIO AO PROFESSOR (use só como ideia; não copie) ══════
${txtApoio}
══════ FIM DO APOIO ══════
` : ''}
Escreva agora o plano de aula completo, com as 7 partes e a frase final.`;

  try {
    const r = await iaStreamTexto({ sys: sistema(classe, minutos), user, temperature: 0.5, max_tokens: 2800, tag: 'ebd-plano' });
    return new Response(r.stream, {
      headers: cabecalhosIa(r, { ...CORS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }),
    });
  } catch (e) {
    return respostaErro(e, CORS);
  }
}
