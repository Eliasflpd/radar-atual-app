// Cria a cobrança PIX (Asaas) da assinatura do RADAR e devolve o QR + copia-e-cola.
// POST {nome, phone, cpf?}  -> {ok, paymentId, qr, copia, venc}
const BASE = 'https://api.asaas.com/v3';
const VALOR = 9.90;

async function asaas(path, method, body){
  const r = await fetch(BASE + path, {
    method,
    headers: { 'access_token': process.env.ASAAS_API_KEY, 'Content-Type':'application/json', 'User-Agent':'RADAR' },
    body: body ? JSON.stringify(body) : undefined
  });
  const d = await r.json().catch(()=>({}));
  return { ok: r.ok, status: r.status, d };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method==='OPTIONS'){ res.status(200).end(); return; }
  if (req.method!=='POST'){ res.status(405).json({error:'POST'}); return; }
  if (!process.env.ASAAS_API_KEY){ res.status(200).json({ok:false, err:'sem chave asaas'}); return; }

  let b=req.body; if(typeof b==='string'){ try{b=JSON.parse(b);}catch(_){b={};} } b=b||{};
  const nome=(b.nome||'Assinante RADAR').toString().trim().slice(0,80);
  const phone=(b.phone||'').replace(/\D/g,'');
  const cpf=(b.cpf||'').replace(/\D/g,'');
  if(phone.length<10){ res.status(400).json({error:'phone'}); return; }

  try{
    // 1) acha ou cria o cliente (identificado pelo telefone via externalReference)
    let customerId=null;
    const busca = await asaas('/customers?externalReference='+phone, 'GET');
    if(busca.ok && busca.d && busca.d.data && busca.d.data[0]) customerId = busca.d.data[0].id;
    if(!customerId){
      const novo = await asaas('/customers','POST',{ name:nome, mobilePhone:phone, externalReference:phone, ...(cpf?{cpfCnpj:cpf}:{}) });
      if(!novo.ok){ res.status(200).json({ok:false, err:(novo.d&&novo.d.errors&&novo.d.errors[0]&&novo.d.errors[0].description)||'cliente', precisaCpf: JSON.stringify(novo.d).toLowerCase().includes('cpf') }); return; }
      customerId = novo.d.id;
    }
    // 2) cria a cobrança PIX
    const hoje = new Date().toISOString().slice(0,10);
    const cob = await asaas('/payments','POST',{
      customer: customerId, billingType:'PIX', value: VALOR, dueDate: hoje,
      description:'Assinatura RADAR — 1 mês', externalReference: phone
    });
    if(!cob.ok){ res.status(200).json({ok:false, err:(cob.d&&cob.d.errors&&cob.d.errors[0]&&cob.d.errors[0].description)||'cobranca'}); return; }
    const payId = cob.d.id;
    // 3) pega o QR PIX
    const qr = await asaas('/payments/'+payId+'/pixQrCode','GET');
    res.json({ ok:true, paymentId:payId, qr:(qr.d&&qr.d.encodedImage)||'', copia:(qr.d&&qr.d.payload)||'', venc:hoje, valor:VALOR });
  }catch(e){
    res.status(200).json({ ok:false, err:String(e&&e.message||e).slice(0,140) });
  }
};
