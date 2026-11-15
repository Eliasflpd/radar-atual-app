// Utilidades compartilhadas pelas funções do servidor (Vercel).
export const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Variável de ambiente ausente: ${k}`);
  return v;
};

// Chamada ao Supabase com a chave de serviço (ignora RLS — só no servidor!)
export async function sbAdmin(path, init = {}) {
  const r = await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
      Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${body}`);
  return body ? JSON.parse(body) : null;
}

// Descobre o usuário logado a partir do token enviado pelo app
export async function usuarioDoToken(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const r = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, {
    headers: { apikey: env('SUPABASE_ANON_KEY'), Authorization: `Bearer ${token}` },
  });
  return r.ok ? r.json() : null;
}

export async function mp(path, init = {}) {
  const r = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env('MP_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}: ${JSON.stringify(body)}`);
  return body;
}

export const baseUrl = (req) =>
  process.env.APP_URL || `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
