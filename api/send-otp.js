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

  const { phone, nome } = body;
  const cleanPhone = String(phone || '').replace(/\D/g, '');

  if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 11) {
    return Response.json({ error: 'Número de WhatsApp inválido' }, { status: 400, headers: CORS });
  }

  // Generate 6-digit OTP
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const exp = Date.now() + 10 * 60 * 1000; // 10 min

  // Create signed token: base64(payload) + '.' + hmac(base64)
  const payloadB64 = btoa(JSON.stringify({ phone: cleanPhone, code, exp }));
  const secret = process.env.OTP_SECRET || 'radar-ebd-2026';
  const sig = await hmacSign(payloadB64, secret);
  const token = payloadB64 + '.' + sig;

  // Send via Fonnte WhatsApp API (setup: fonnte.com — connect your number → get token → set FONNTE_TOKEN env var)
  const FONNTE_TOKEN = process.env.FONNTE_TOKEN;
  if (FONNTE_TOKEN) {
    const saudacao = nome ? `, ${nome.split(' ')[0]}` : '';
    const msg = `🎯 *RADAR ATUAL — EBD*\n\nOlá${saudacao}! Seu código de verificação é:\n\n*${code}*\n\nVálido por 10 minutos.`;
    try {
      await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 'Authorization': FONNTE_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: '55' + cleanPhone, message: msg, typing: false, delay: 1 })
      });
    } catch (e) {
      console.error('Fonnte error:', e.message);
    }
  } else {
    // DEV: log the OTP (configure FONNTE_TOKEN in Vercel env vars for production)
    console.log(`[DEV OTP] ${cleanPhone} → ${code}`);
  }

  return Response.json({ ok: true, token }, { headers: CORS });
}
