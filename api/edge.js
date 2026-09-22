// ROTEADOR EDGE do RADAR — agrupa as funções de IA (Edge Runtime) numa única função.
// Motivo: plano Hobby limita a 12 Serverless Functions por deploy.
// Handlers em api/_lib/ (prefixo _ = não vira função). URLs preservadas via rewrites no vercel.json.
export const config = { runtime: 'edge' };

import perolas from './_lib/perolas.js';
import mensagem from './_lib/mensagem.js';
import concilio from './_lib/concilio.js';
import concilioWagner from './_lib/concilio-wagner.js';
import peca from './_lib/peca.js';
import estudoDoutrina from './_lib/estudo-doutrina.js';
import buscaVetor from './_lib/busca-vetor.js';
import voz from './_lib/voz.js';

const MAP = { perolas, mensagem, concilio, 'concilio-wagner': concilioWagner, peca, 'estudo-doutrina': estudoDoutrina, 'busca-vetor': buscaVetor, voz };

// ⚠️ O SEGUNDO ARGUMENTO NÃO É ENFEITE — MEDIDO EM PRODUÇÃO (22/09/2026).
// A Vercel entrega um `context` com `waitUntil`: é ele que deixa a resposta sair
// JÁ e o trabalho de escrita terminar depois. Este roteador chamava `h(req)` e
// engolia o context, então a gravação da memória entrava no caminho da resposta:
// toda chamada de ferramenta do globo passou de **76 ms para 1.729 ms** — um
// segundo e meio de silêncio que o pastor ouve no meio da frase, a cada
// versículo aberto. Passando o context adiante, volta pros 76 ms e a gravação
// acontece fora do relógio. Handler que não usa simplesmente ignora.
export default async function handler(req, ctx) {
  const fn = new URL(req.url).searchParams.get('fn') || '';
  const h = MAP[fn];
  if (!h) {
    return new Response(JSON.stringify({ error: 'endpoint desconhecido', fn: fn }), {
      status: 404,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    });
  }
  return h(req, ctx);
}
