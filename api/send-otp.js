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

// DDDs que existem no Brasil
const DDD_BR = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
// Brasil sem o código do país: DDD válido + 8 dígitos (fixo) ou DDD + 9 + 8 dígitos (celular).
function pareceBrasil(d) {
  if (!/^\d+$/.test(d) || (d.length !== 10 && d.length !== 11)) return false;
  if (!DDD_BR.has(d.slice(0, 2))) return false;
  return d.length === 11 ? d[2] === '9' : true;
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
  // `intl:true` = o app sabe que o número é de fora (a pessoa escolheu o país na lista ou digitou +).
  const intl = body.intl === true;

  // 8 a 15 dígitos — o mesmo que o app aceita, pra não barrar quem é de fora do
  // Brasil (Angola +244, Portugal +351...). Antes exigia 10-11 e prendia o
  // código só no Brasil.
  if (!cleanPhone || cleanPhone.length < 8 || cleanPhone.length > 15) {
    return Response.json({ error: 'Número de WhatsApp inválido' }, { status: 400, headers: CORS });
  }
  // Pra ENTREGAR pelo Fonnte precisa do código do país. Brasil curto (10/11) leva
  // 55; número que já veio com código de país (12+) vai como está — senão um
  // +244 de Angola viraria 55244... e a mensagem nunca chegaria.
  // ⚠️ 12/10/2026 — BUG QUE MANDAVA O CÓDIGO PRO NÚMERO ERRADO (cliente da Suíça): a regra era
  // "10 ou 11 dígitos = Brasil, põe 55". Mas o número suíço +41 79 123 45 67 tem 11 dígitos, e o
  // americano +1 305 867 5309 também: viravam 55 41 79123 4567 (um número do Paraná!) e o código
  // nunca chegava a quem pediu. Agora só é Brasil quem TEM FORMATO de número brasileiro: DDD
  // válido e, com 11 dígitos, o 9 do celular logo depois. E se o app avisou que é de fora (intl),
  // nunca mexe no número.
  const alvoFonnte = (!intl && pareceBrasil(cleanPhone)) ? '55' + cleanPhone : cleanPhone;

  // Generate 6-digit OTP
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const exp = Date.now() + 10 * 60 * 1000; // 10 min

  // Create signed token: base64(payload) + '.' + hmac(base64)
  const payloadB64 = btoa(JSON.stringify({ phone: cleanPhone, code, exp }));
  // ⚠️ SEM segredo fraco de reserva. O fallback 'radar-ebd-2026' estava no
  // código-fonte: qualquer um que visse o repositório forjava um token e
  // "confirmava" sem receber código nenhum. Sem OTP_SECRET forte, recusa.
  const secret = process.env.OTP_SECRET;
  if (!secret) return Response.json({ error: 'verificação indisponível' }, { status: 503, headers: CORS });
  const sig = await hmacSign(payloadB64, secret);
  const token = payloadB64 + '.' + sig;

  // Send via Fonnte WhatsApp API (setup: fonnte.com — connect your number → get token → set FONNTE_TOKEN env var)
  const FONNTE_TOKEN = process.env.FONNTE_TOKEN;
  if (FONNTE_TOKEN) {
    const saudacao = nome ? `, ${nome.split(' ')[0]}` : '';
    const msg = `🎯 *RADAR ATUAL — EBD*\n\nOlá${saudacao}! Seu código de verificação é:\n\n*${code}*\n\nVálido por 10 minutos.`;
    // ⚠️ 12/10/2026 — antes a resposta do Fonnte era JOGADA FORA: se o WhatsApp recusasse o envio
    // (número errado, aparelho do Fonnte desconectado, cota), o app dizia "código enviado" e a
    // pessoa ficava esperando um código que nunca viria — foi o que a cliente da Suíça viveu.
    // Agora, se o Fonnte diz que falhou, o app avisa na hora. Só conta como falha quando o Fonnte
    // responde erro de verdade (HTTP ruim ou status:false); resposta de formato desconhecido
    // continua valendo como enviada, pra não barrar quem está recebendo normal.
    let entregue = true;
    let motivo = '';   // razão devolvida pelo Fonnte (só aparece na resposta quando o pedido traz diag:true)
    try {
      const fr = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        // ⚠️ 12/10/2026 — O FONNTE NÃO LÊ CORPO EM JSON: devolvia "invalid/empty body value" e o código
        // NUNCA saía (era isso que as pessoas relatavam). Ele espera formulário (form-urlencoded).
        // countryCode=0: o número já vai completo, com o código do país; sem isso o Fonnte pode
        // tentar "corrigir" o prefixo pelo país padrão dele.
        headers: { 'Authorization': FONNTE_TOKEN },
        body: new URLSearchParams({ target: alvoFonnte, message: msg, typing: 'false', delay: '1', countryCode: '0' })
      });
      const fj = await fr.json().catch(() => ({}));
      if (!fr.ok || (fj && (fj.status === false || fj.status === 'false'))) {
        entregue = false;
        motivo = String((fj && (fj.reason || fj.detail || fj.message)) || ('HTTP ' + fr.status)).slice(0, 160);
        console.error('Fonnte recusou o envio:', JSON.stringify(fj || {}).slice(0, 200));
      }
    } catch (e) {
      entregue = false;
      motivo = 'erro de rede: ' + String(e.message).slice(0, 100);
      console.error('Fonnte error:', e.message);
    }
    if (!entregue) {
      return Response.json(
        { error: 'Não consegui entregar o código nesse WhatsApp. Confira o número — se for de fora do Brasil, escolha o país na lista — e tente de novo.',
          ...(body.diag === true ? { motivo } : {}) },
        { status: 502, headers: CORS });
    }
  } else {
    // DEV: log the OTP (configure FONNTE_TOKEN in Vercel env vars for production)
    console.log(`[DEV OTP] ${cleanPhone} → ${code}`);
  }

  return Response.json({ ok: true, token }, { headers: CORS });
}
