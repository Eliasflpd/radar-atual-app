// ROTEADOR EDGE do RADAR — agrupa as funções de IA (Edge Runtime) numa única função.
// Motivo: plano Hobby limita a 12 Serverless Functions por deploy.
// Handlers em api/_lib/ (prefixo _ = não vira função). URLs preservadas via rewrites no vercel.json.
export const config = { runtime: 'edge' };

import perolas from './_lib/perolas.js';
import mensagem from './_lib/mensagem.js';
import concilio from './_lib/concilio.js';
import concilioWagner from './_lib/concilio-wagner.js';
import peca from './_lib/peca.js';

const MAP = { perolas, mensagem, concilio, 'concilio-wagner': concilioWagner, peca };

export default async function handler(req) {
  const fn = new URL(req.url).searchParams.get('fn') || '';
  const h = MAP[fn];
  if (!h) {
    return new Response(JSON.stringify({ error: 'endpoint desconhecido', fn: fn }), {
      status: 404,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    });
  }
  return h(req);
}
