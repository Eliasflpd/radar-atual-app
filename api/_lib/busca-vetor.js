// A PERGUNTA VIRA VETOR — a única parte da Busca por Significado que precisa de servidor.
// URL pública: GET/POST /api/busca-vetor   (rewrite -> /api/edge?fn=busca-vetor)
//
// O RESTO DA BUSCA NÃO PASSA POR AQUI. O índice do acervo e da Bíblia é
// pré-calculado no PC do Elias (scripts/indexar-busca.mjs) e servido como arquivo
// estático em /busca/*.bin. O celular baixa uma vez, guarda no cache do service
// worker, e compara tudo sozinho com produto escalar. Motivo: a Vercel é Hobby
// (12 funções, 11 já usadas) — não cabe banco vetorial nem função nova, e o irmão
// de internet fraca não pode depender de servidor a cada busca.
//
// Aqui só acontece uma coisa: pegar o texto da pergunta e devolver 256 números.
// O token NUNCA sai daqui.
//
// MODELO: @cf/google/embeddinggemma-300m (Cloudflare Workers AI), 768 dims cortadas
// para 256 e renormalizadas — igualzinho ao indexador. Se mudar um, muda o outro,
// senão a pergunta e o índice passam a falar línguas diferentes.
//
// O PREFIXO É PARTE DO MODELO, NÃO ENFEITE: o EmbeddingGemma espera
// "task: search result | query: …" na pergunta e "title: … | text: …" no documento.
// Sem isso a busca erra o alvo (testado: 2 das 5 perguntas de prova iam para o
// lugar errado).
//
// Não usamos Gemini aqui porque o free tier de embedding dele é 100 textos por
// minuto e a cota do dia acaba — ver o comentário grande em scripts/indexar-busca.mjs.

export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
const MODELO = '@cf/google/embeddinggemma-300m';
const DIMS = 256;

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json', ...extra } });

// corta 768 → 256 e renormaliza (Matryoshka). Sem renormalizar, cosseno deixa de ser cosseno.
function cortar(v) {
  const w = v.slice(0, DIMS);
  let s = 0;
  for (const x of w) s += x * x;
  s = Math.sqrt(s) || 1;
  return w.map((x) => x / s);
}

// A PERGUNTA → VETOR, separado do handler DE PROPÓSITO.
// Quem mais usa isto: api/_lib/voz-ferramentas.js (a ferramenta buscar_no_acervo do
// globo de voz). Se o globo copiasse esta chamada, no dia em que o modelo, o prefixo
// ou a quantidade de dimensões mudasse aqui, a busca da voz passaria a falar uma
// língua diferente do índice — e erraria calado, que é o pior jeito de errar.
// Devolve o vetor de 256 números, ou null se não deu (nunca lança).
export async function embutirPergunta(pergunta) {
  const texto = String(pergunta || '').trim().slice(0, 600);
  if (texto.length < 2) return null;

  const conta = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_AI_TOKEN;
  if (!conta || !token) return null;

  for (let tent = 0; tent < 3; tent++) {
    try {
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${conta}/ai/run/${MODELO}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: [`task: search result | query: ${texto}`] })
      });
      if (r.ok) {
        const j = await r.json();
        const bruto = (j.result?.data || j.result?.response || [])[0];
        if (Array.isArray(bruto) && bruto.length >= DIMS) return cortar(bruto);
      } else if (r.status !== 429 && r.status < 500) {
        return null;                                    // 400/403: insistir não resolve
      }
    } catch (_) { /* rede tropeçou: tenta de novo */ }
    await new Promise((s) => setTimeout(s, 400 * (tent + 1)));
  }
  return null;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  let pergunta = '';
  try {
    if (req.method === 'POST') pergunta = ((await req.json()) || {}).q || '';
    else pergunta = new URL(req.url).searchParams.get('q') || '';
  } catch { pergunta = ''; }
  pergunta = String(pergunta).trim().slice(0, 600);
  if (pergunta.length < 2) return json({ ok: false, erro: 'pergunta vazia' }, 400);

  if (!process.env.CF_ACCOUNT_ID || !process.env.CF_AI_TOKEN)
    return json({ ok: false, erro: 'servidor sem credencial de embedding' }, 500);

  const v = await embutirPergunta(pergunta);
  if (!v) return json({ ok: false, erro: 'não consegui entender a pergunta agora' }, 503);

  // 10 min de cache na borda: pergunta repetida (e tem muita) nem chega no Cloudflare
  return json({ ok: true, dims: DIMS, v }, 200,
    { 'Cache-Control': 'public, s-maxage=600, max-age=600' });
}
