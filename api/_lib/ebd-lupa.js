// LUPA DA LIÇÃO — tutor de IA da EBD. Responde dúvidas do aluno com base NA LIÇÃO + Bíblia, com trava de doutrina AD.
// POST {token, pergunta, licao (1..13), revista}  -> {ok, resposta}
const SISTEMA = `Você é o "Tutor da Lição", auxiliar de estudo bíblico do app RADAR, para uma igreja Assembleia de Deus (pentecostal clássica).
Responda a dúvida do aluno SOMENTE com base na LIÇÃO fornecida e na Bíblia Sagrada. Regras invioláveis:
- Fidelidade absoluta à Bíblia e à sã doutrina pentecostal (Assembleia de Deus). Nunca ensine nada contrário às Escrituras.
- Baseie-se na LIÇÃO abaixo. Se a resposta não estiver na lição nem claramente na Bíblia, diga com humildade que não sabe e oriente levar ao professor ou pastor.
- Sempre que possível, cite o versículo (ex.: At 13.2). Não invente referências.
- Aponte para Cristo e edifique a fé. Linguagem simples, calorosa e CURTA (2 a 5 frases).
- Você é um AUXILIAR, NÃO a autoridade final. Em tema polêmico ou de interpretação disputada, oriente: "confirme com o seu pastor".
- NUNCA invente fatos, datas, números ou "significado no original" sem certeza. Nada de heresia, teologia da prosperidade torta, ou achismo.
- Responda em português do Brasil.`;

async function textoLicao(revista, n){
  const nn = String(n).padStart(2,'0');
  const url = `https://radar-atual.vercel.app/ebd/${revista}/html/licao-${nn}.html`;
  try{
    const r = await fetch(url);
    if(!r.ok) return '';
    let h = await r.text();
    h = h.replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'');
    h = h.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
    return h.slice(0, 7000);
  }catch(e){ return ''; }
}

module.exports = async (req,res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){ res.status(200).end(); return; }
  if(req.method!=='POST'){ res.status(405).json({error:'use POST'}); return; }

  let b=req.body; if(typeof b==='string'){ try{b=JSON.parse(b);}catch(_){b={};} } b=b||{};
  const ADM=process.env.RADAR_ADMIN_TOKEN;
  if(ADM && b.token!==ADM){ res.status(403).json({error:'token'}); return; }
  const pergunta=(b.pergunta||'').toString().trim().slice(0,500);
  const licao=parseInt(b.licao||'1',10)||1;
  const revista=(b.revista==='juvenil'||b.revista==='jovem')?b.revista:'adulto';
  if(pergunta.length<3){ res.status(400).json({error:'pergunta curta'}); return; }

  const KEY=process.env.OPENAI_API_KEY;
  if(!KEY){ res.status(200).json({ok:false, err:'sem chave'}); return; }

  const licaoTxt = await textoLicao(revista, licao);
  const userMsg = `LIÇÃO ATUAL (nº ${licao}):\n${licaoTxt || '(texto da lição indisponível — responda com base na Bíblia e na sã doutrina)'}\n\n--- Pergunta do aluno: ${pergunta}`;

  try{
    const r = await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+KEY},
      body:JSON.stringify({
        model:'gpt-4o-mini',
        temperature:0.3,
        max_tokens:420,
        messages:[{role:'system',content:SISTEMA},{role:'user',content:userMsg}]
      })
    });
    const d = await r.json();
    const resposta = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    if(!resposta){ res.status(200).json({ok:false, err:(d.error&&d.error.message)||'sem resposta'}); return; }
    res.json({ok:true, resposta:resposta.trim()});
  }catch(e){
    res.status(200).json({ok:false, err:String(e).slice(0,140)});
  }
};
