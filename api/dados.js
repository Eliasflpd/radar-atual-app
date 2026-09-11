// ROTEADOR de endpoints do RADAR — agrupa vários handlers numa única Serverless Function.
// Motivo: o plano Hobby da Vercel limita a 12 Serverless Functions por deploy.
// Os handlers moram em api/_lib/ (prefixo _ = não vira função). As URLs públicas
// continuam iguais (ex.: /api/hit, /api/leitura) via "rewrites" no vercel.json.
const HANDLERS = {
  hit:          require('./_lib/hit.js'),
  hist:         require('./_lib/hist.js'),
  igrejas:      require('./_lib/igrejas.js'),
  acesso:       require('./_lib/acesso.js'),
  'ebd-lupa':   require('./_lib/ebd-lupa.js'),
  manual:       require('./_lib/manual.js'),
  leitura:      require('./_lib/leitura.js'),
  publicacoes:  require('./_lib/publicacoes.js')
};

module.exports = async (req, res) => {
  const fn = (req.query && req.query.fn) || '';
  const h = HANDLERS[fn];
  if(!h){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.status(404).json({ error: 'endpoint desconhecido', fn: fn });
    return;
  }
  return h(req, res);
};
