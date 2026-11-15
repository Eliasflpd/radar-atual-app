// Contratante clica em "Pagar": cria o checkout no Mercado Pago.
// O dinheiro cai na conta da plataforma; o app guarda 10% e o admin
// repassa 90% ao prestador depois que o serviço é concluído.
import { sbAdmin, usuarioDoToken, mp, baseUrl } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });
  try {
    const user = await usuarioDoToken(req);
    if (!user) return res.status(401).json({ erro: 'Faça login.' });

    const { contratacao_id } = req.body || {};
    if (!/^[0-9a-f-]{36}$/i.test(contratacao_id || '')) return res.status(400).json({ erro: 'Contratação inválida.' });

    const [ct] = await sbAdmin(`contratacoes?id=eq.${contratacao_id}&select=*`);
    if (!ct) return res.status(404).json({ erro: 'Contratação não encontrada.' });
    if (ct.contratante_id !== user.id) return res.status(403).json({ erro: 'Só o contratante pode pagar.' });
    // entrada, restante ou total: quem calcula é o banco (o app não decide o valor)
    const [prox] = await sbAdmin('rpc/proximo_pagamento', { method: 'POST', body: JSON.stringify({ cid: ct.id }) });
    if (!prox) return res.status(409).json({ erro: 'Não há nada a pagar nesta contratação.' });
    const rotulo = { total: 'Pagamento', entrada: `Entrada (${ct.entrada_pct}%)`, restante: 'Restante' }[prox.tipo];

    const url = baseUrl(req);
    const pref = await mp('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items: [{
          id: ct.id,
          title: `${rotulo} · ${ct.descricao.slice(0, 180)}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(prox.valor),
        }],
        payment_methods: { installments: 12 },   // cartão em até 12x (Pix também aceito)
        metadata: { tipo: prox.tipo },
        payer: { email: user.email },
        external_reference: ct.id,
        notification_url: `${url}/api/webhook-mp`,
        back_urls: {
          success: `${url}/#/chat/${ct.conversa_id}?pago=1`,
          pending: `${url}/#/chat/${ct.conversa_id}?pago=pendente`,
          failure: `${url}/#/chat/${ct.conversa_id}?pago=0`,
        },
        auto_return: 'approved',
        statement_descriptor: 'CONTRATA AI',
      }),
    });
    res.json({ checkout_url: pref.init_point });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Não foi possível iniciar o pagamento.' });
  }
}
