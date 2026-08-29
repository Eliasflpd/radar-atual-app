// CURSO DE TEOLOGIA — área trancada a senha (só o Elias).
// POST {senha, curso?} -> se a senha bater, devolve os módulos+aulas (com os links dos vídeos).
// Sem a senha certa, NÃO devolve link nenhum. Os vídeos ficam em nuvem privada (URL secreta).
const { Client } = require('pg');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){ res.status(200).end(); return; }
  if(req.method!=='POST'){ res.status(405).json({ok:false}); return; }

  let b=req.body; if(typeof b==='string'){ try{ b=JSON.parse(b);}catch(_){ b={}; } } b=b||{};
  const senha=(b.senha||'').toString();
  const SENHA=process.env.CURSO_SENHA||'__sem_senha_configurada__';
  if(senha!==SENHA){ res.status(403).json({ok:false,erro:'senha'}); return; }

  const curso=(b.curso||'escatologia-ivan-santos').toString();
  const cs=process.env.RADAR_DB;
  if(!cs){ res.status(200).json({ok:false,off:true}); return; }
  const c=new Client({connectionString:cs, ssl:{rejectUnauthorized:false}});
  try{
    await c.connect();
    const r=await c.query(
      'select modulo_ordem,modulo_nome,aula_ordem,titulo,tipo,blob_url from curso_aulas where curso=$1 and blob_url is not null order by modulo_ordem,aula_ordem',[curso]);
    const mods=[]; const idx={};
    for(const row of r.rows){
      const k=row.modulo_ordem;
      if(idx[k]===undefined){ idx[k]=mods.length; mods.push({ordem:row.modulo_ordem,nome:row.modulo_nome,aulas:[]}); }
      mods[idx[k]].aulas.push({ordem:row.aula_ordem,titulo:row.titulo,tipo:row.tipo,url:row.blob_url});
    }
    const tot=r.rows.length;
    res.status(200).json({ok:true, curso, total:tot, modulos:mods});
  }catch(e){
    res.status(200).json({ok:false, err:String(e).slice(0,160)});
  }finally{ try{ await c.end(); }catch(_){}}
};
