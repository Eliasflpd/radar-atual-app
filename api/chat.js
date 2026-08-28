// BATE-PAPO Elias <-> Claude, dentro do RADAR.
// GET  ?token=&desde=<id>   -> mensagens novas (ou últimas 200)
// POST {token, texto, autor} -> grava mensagem (autor 'elias' por padrão)
const { Client } = require('pg');

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
      res.json({ok:true, msg:r.rows[0]});
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
    res.json({ok:true, msgs:r.rows});
  }catch(e){
    res.status(200).json({ok:false, err:String(e).slice(0,140)});
  }finally{ try{ await c.end(); }catch(_){}}
};
