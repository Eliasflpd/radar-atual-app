export const config = { runtime: 'edge' };

async function hmacSign(data, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const buf = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  let body;
  try { body = await req.json(); } catch { return new Response('Bad request', { status: 400, headers: CORS }); }

  const { token, code } = body;

  if (!token || !code) {
    return Response.json({ error: 'Dados incompletos' }, { status: 400, headers: CORS });
  }

  const dotIdx = token.indexOf('.');
  if (dotIdx < 0) {
    return Response.json({ error: 'Token inválido' }, { status: 400, headers: CORS });
  }

  const payloadB64 = token.slice(0, dotIdx);
  const givenSig   = token.slice(dotIdx + 1);

  let payload;
  try { payload = JSON.parse(atob(payloadB64)); } catch {
    return Response.json({ error: 'Token corrompido' }, { status: 400, headers: CORS });
  }

  // Check expiry
  if (Date.now() > payload.exp) {
    return Response.json({ error: 'Código expirado. Solicite um novo.' }, { status: 400, headers: CORS });
  }

  // Verify signature
  const secret = process.env.OTP_SECRET || 'radar-ebd-2026';
  const expectedSig = await hmacSign(payloadB64, secret);
  if (givenSig !== expectedSig) {
    return Response.json({ error: 'Token inválido' }, { status: 400, headers: CORS });
  }

  // Check code
  if (String(code).trim() !== payload.code) {
    return Response.json({ error: 'Código incorreto. Tente novamente.' }, { status: 400, headers: CORS });
  }

  const uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return Response.json({ ok: true, uid }, { headers: CORS });
}
