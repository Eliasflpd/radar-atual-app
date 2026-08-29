// BATE-PAPO Elias <-> Claude, dentro do RADAR.
// GET  ?token=&desde=<id>   -> mensagens novas (ou últimas 200) + status do Claude
// POST {token, texto, autor} -> grava mensagem (autor 'elias' por padrão)
const { Client } = require('pg');

// Status do Claude (AO VIVO x fora do ar). Nunca pode derrubar o chat:
// se a tabela não existir ou der erro, devolve null e o chat segue igual.
async function lerStatus(c){
  try{
    const s=await c.query('select ao_vivo_ate, nota, atualizado_em from radar_claude_status where id=1');
    if(!s.rows.length) return null;
    const r=s.rows[0];
    const ate=r.ao_vivo_ate?new Date(r.ao_vivo_ate).getTime():0;
    return { ao_vivo: ate>Date.now(), ao_vivo_ate: r.ao_vivo_ate, nota: r.nota||'' };
  }catch(_){ return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){ res.status(200).end(); return; }

  const ADM=process.env.RADAR_ADMIN_TOKEN;
  const cs=process.env.RADAR_DB;
  if(!cs){ res.status(200).json({ok:false,off:true}); return; }
  const c=new Client({connectionString:cs, ssl:{rejectUnauthorized:false}});
  try{
    await c.connect();

    if(req.method==='POST'){
      let b=req.body;
      if(typeof b==='string'){ try{ b=JSON.parse(b); }catch(_){ b={}; } }
      b=b||{};
      if(ADM && b.token!==ADM){ res.status(403).json({error:'token'}); return; }
      const autor = b.autor==='claude' ? 'claude' : 'elias';
      const texto = (b.texto||'').toString().trim().slice(0,4000);
      if(!texto){ res.status(400).json({error:'vazio'}); return; }
      const r=await c.query('insert into radar_chat(autor,texto) values($1,$2) returning id,autor,texto,criado_em',[autor,texto]);

      // RESPOSTA INSTANTÂNEA (24h, sem depender do PC): a IA do RADAR responde na hora
      let reply=null;
      const KEY=process.env.OPENAI_API_KEY;
      if(autor==='elias' && KEY){
        try{
          const hist=await c.query("select autor,texto from radar_chat order by id desc limit 12");
          const msgs=hist.rows.reverse().map(function(m){ return {role: m.autor==='elias'?'user':'assistant', content:m.texto}; });
          const SYS="Você é o assistente pessoal do RADAR, o app do Pastor Elias (Assembleia de Deus). Fale em português do Brasil, com carinho e respeito, sempre fiel à sã doutrina pentecostal (AD) e cristocêntrica. Ajude o Elias com: dúvidas bíblicas, ideias de pregação e EBD, e como usar o app. NUNCA invente versículo, dado ou fato — se não tiver certeza, diga com humildade. Se ele pedir para CONSTRUIR, mudar ou consertar algo no app, responda que ANOTOU o pedido e que será feito (NÃO diga que já fez). Seja curto, prático e caloroso. Aponte sempre para Cristo.";
          const rr=await fetch('https://api.openai.com/v1/chat/completions',{
            method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+KEY},
            body:JSON.stringify({ model:'gpt-4o-mini', temperature:0.5, max_tokens:500,
              messages:[{role:'system',content:SYS}].concat(msgs) })
          });
          const dd=await rr.json();
          const ans=dd && dd.choices && dd.choices[0] && dd.choices[0].message && dd.choices[0].message.content;
          if(ans){
            const ins=await c.query('insert into radar_chat(autor,texto) values($1,$2) returning id,autor,texto,criado_em',['claude',ans.trim()]);
            reply=ins.rows[0];
          }
        }catch(e){ /* se a IA falhar, ainda salva a msg do Elias */ }
      }
      res.json({ok:true, msg:r.rows[0], reply:reply, status: await lerStatus(c)});
      return;
    }

    // GET
    const q=req.query||{};
    if(ADM && q.token!==ADM){ res.status(403).json({error:'token'}); return; }
    const desde=parseInt(q.desde||'0',10)||0;
    let r;
    if(desde>0){
      r=await c.query('select id,autor,texto,criado_em from radar_chat where id>$1 order by id asc limit 200',[desde]);
    }else{
      r=await c.query('select id,autor,texto,criado_em from (select id,autor,texto,criado_em from radar_chat order by id desc limit 200) t order by id asc');
    }
    res.json({ok:true, msgs:r.rows, status: await lerStatus(c)});
  }catch(e){
    res.status(200).json({ok:false, err:String(e).slice(0,140)});
  }finally{ try{ await c.end(); }catch(_){}}
};
