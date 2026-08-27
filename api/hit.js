// Contador GLOBAL de acessos do RADAR — 1 chave por peça (módulo, item da biblioteca, vídeo, CRM).
// Chamado (fire-and-forget) quando alguém ABRE a peça. Painel lê o ranking (token admin).
const { Client } = require('pg');

async function ensure(c){
  await c.query(`create table if not exists radar_acessos(
    chave text primary key,
    grupo text,
    rotulo text,
    views bigint default 0,
    primeiro timestamptz default now(),
    ultimo timestamptz default now()
  )`);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){ res.status(200).end(); return; }

  const cs=process.env.RADAR_DB;
  if(!cs){ res.status(200).json({ok:false, off:true}); return; }  // sem DB = não quebra o app
  const c=new Client({connectionString:cs, ssl:{rejectUnauthorized:false}});
  try{
    await c.connect(); await ensure(c);
    const q=req.query||{};

    // === painel: ranking completo (protegido por token) ===
    if(q.all){
      const ADM=process.env.RADAR_ADMIN_TOKEN;
      if(ADM && q.token!==ADM){ res.status(403).json({error:'token'}); return; }
      const r=await c.query('select chave,grupo,rotulo,views,ultimo from radar_acessos order by views desc limit 500');
      res.json({ok:true, itens:r.rows});
      return;
    }

    // === registrar 1 acesso (público) ===
    const k=(q.k||'').toString().slice(0,120).trim();
    if(!k){ res.status(400).json({error:'sem chave'}); return; }
    const grupo=(q.g||'').toString().slice(0,40);
    const rotulo=(q.r||'').toString().slice(0,120);
    const r=await c.query(
      `insert into radar_acessos(chave,grupo,rotulo,views,ultimo)
       values($1,$2,$3,1,now())
       on conflict(chave) do update set
         views=radar_acessos.views+1,
         ultimo=now(),
         grupo=coalesce(nullif(excluded.grupo,''),radar_acessos.grupo),
         rotulo=coalesce(nullif(excluded.rotulo,''),radar_acessos.rotulo)
       returning views`,
      [k,grupo,rotulo]);
    res.json({ok:true, views:r.rows[0].views});
  }catch(e){
    res.status(200).json({ok:false, err:String(e).slice(0,120)});  // nunca quebra o cliente
  }finally{
    try{ await c.end(); }catch(_){}
  }
};
