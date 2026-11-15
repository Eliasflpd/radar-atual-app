// Mercado Pago avisa aqui quando um pagamento muda de status.
// Nunca confiamos no corpo do aviso: consultamos o pagamento direto na API do MP.
import crypto from 'node:crypto';
import { sbAdmin, mp } from './_lib.js';

function assinaturaValida(req, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // opcional: configure para validar a assinatura
  const sig = String(req.headers['x-signature'] || '');
  const ts = /ts=([^,]+)/.exec(sig)?.[1];
  const v1 = /v1=([^,]+)/.exec(sig)?.[1];
  if (!ts || !v1) return false;
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${req.headers['x-request-id'] || ''};ts:${ts};`;
  const esperado = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return esperado.length === v1.length && crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(v1));
}

export default async function handler(req, res) {
  try {
    const tipo = req.query.type || req.query.topic || req.body?.type;
    const id = req.query['data.id'] || req.body?.data?.id || req.query.id;
    if (tipo !== 'payment' || !id) return res.status(200).send('ignorado');
    if (!assinaturaValida(req, id)) return res.status(401).send('assinatura inválida');

    const pg = await mp(`/v1/payments/${encodeURIComponent(id)}`);
    if (pg.status !== 'approved') return res.status(200).send(`status ${pg.status}`);

    // o banco confere o valor devido (entrada/restante/total) e ignora pagamento repetido
    try {
      await sbAdmin('rpc/registrar_pagamento', {
        method: 'POST',
        body: JSON.stringify({
          cid: pg.external_reference, p_mp_id: String(pg.id), p_valor: Number(pg.transaction_amount),
          p_parcelas: Number(pg.installments || 1), p_forma: pg.payment_type_id === 'bank_transfer' || pg.payment_method_id === 'pix' ? 'pix' : 'cartao',
        }),
      });
    } catch (e) {
      console.error('pagamento não registrado', e.message);
      return res.status(200).send('não registrado');
    }
    res.status(200).send('ok');
  } catch (e) {
    console.error(e);
    res.status(500).send('erro');
  }
}
