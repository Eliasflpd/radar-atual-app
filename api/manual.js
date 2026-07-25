// Serve o conteúdo dos manuais SÓ pra dentro do app — bloqueia download direto/hotlink.
// O .md não fica mais em /public (não é baixável). Aqui checa origem e proíbe cache/indexação.
const MANUAIS = {
  cerimonias: require('./_manuais/cerimonias.json')
};

module.exports = (req, res) => {
  const host = (req.headers.host || '').toLowerCase();
  const ref = (req.headers.referer || '').toLowerCase();
  const origin = (req.headers.origin || '').toLowerCase();
  // só libera se a requisição veio de dentro do próprio app (mesma origem)
  const daCasa = (host && (ref.includes(host) || origin.includes(host)));

  const id = (req.query && req.query.id) || '';
  const m = MANUAIS[id];

  // trava indexação/cache em qualquer resposta
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Content-Disposition', 'inline'); // nunca como anexo (download)

  if (!m) { res.status(404).json({ error: 'não encontrado' }); return; }
  if (!daCasa) {
    res.status(403).send('⚠️ Conteúdo protegido por direitos autorais. Acesso permitido apenas dentro do app RADAR. Pirataria é crime — Lei 9.610/98.');
    return;
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(m.content);
};
