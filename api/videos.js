// CRM de Vídeos do RADAR — Elias cola link do YouTube/Facebook, aparece no slide pra todos.
const { Client } = require('pg');

async function ensure(c){
  await c.query(`create table if not exists radar_videos(
    id serial primary key,
    url text,
    tipo text,
    titulo text,
    ativo boolean default true,
    criado_em timestamptz default now()
  )`);
}
function detectar(url){
  var u=(url||'').toLowerCase();
  if(u.includes('youtube.com')||u.includes('youtu.be')) return 'youtube';
  if(u.includes('facebook.com')||u.includes('fb.watch')||u.includes('fb.me')) return 'facebook';
  return 'link';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){ res.status(200).end(); return; }

  const cs=process.env.RADAR_DB;
  if(!cs){ res.status(500).json({error:'db não configurado'}); return; }
  const c=new Client({connectionString:cs, ssl:{rejectUnauthorized:false}});
  try{
    await c.connect(); await ensure(c);
    const ADM=process.env.RADAR_ADMIN_TOKEN;

    if(req.method==='POST'){
      let b=req.body; if(typeof b==='string'){ try{ b=JSON.parse(b); }catch(e){ b={}; } }
      b=b||{};

      // === CURSO DE TEOLOGIA (área trancada a senha) ===
      // POST {acao:'curso', senha, curso?} -> se a senha bater, devolve módulos+aulas com os links.
      if(b.acao==='curso'){
        const SENHA=process.env.CURSO_SENHA||'__sem_senha_configurada__';
        if((b.senha||'')!==SENHA){ res.status(403).json({ok:false,erro:'senha'}); return; }
        const curso=(b.curso||'escatologia-ivan-santos').toString();
        await c.query(`create table if not exists curso_aulas(
          id bigserial primary key, curso text not null default 'escatologia-ivan-santos',
          modulo_ordem int not null, modulo_nome text not null, aula_ordem int not null,
          titulo text not null, tipo text not null default 'video', blob_url text,
          tamanho_bytes bigint, criado_em timestamptz default now())`);
        const rc=await c.query('select modulo_ordem,modulo_nome,aula_ordem,titulo,tipo,blob_url from curso_aulas where curso=$1 and blob_url is not null order by modulo_ordem,aula_ordem',[curso]);
        const mods=[]; const idx={};
        for(const row of rc.rows){
          const k=row.modulo_ordem;
          if(idx[k]===undefined){ idx[k]=mods.length; mods.push({ordem:row.modulo_ordem,nome:row.modulo_nome,aulas:[]}); }
          mods[idx[k]].aulas.push({ordem:row.aula_ordem,titulo:row.titulo,tipo:row.tipo,url:row.blob_url});
        }
        res.status(200).json({ok:true, curso, total:rc.rows.length, modulos:mods});
        return;
      }

      if((b.token||'')!==ADM){ res.status(401).json({error:'não autorizado'}); return; }
      const url=(b.url||'').trim();
      if(!url){ res.status(400).json({error:'sem link'}); return; }
      const titulo=(b.titulo||'').trim();
      const tipo=detectar(url);
      const r=await c.query('insert into radar_videos(url,tipo,titulo) values($1,$2,$3) returning id',[url,tipo,titulo]);
      res.json({ok:true, id:r.rows[0].id, tipo});
      return;
    }

    const q=req.query||{};
    const admin=(q.token||'')===ADM;
    if(admin && q.del){
      const rd=await c.query('delete from radar_videos where id=$1',[parseInt(q.del,10)]);
      res.json({ok:true, apagados:rd.rowCount});
      return;
    }
    const r=await c.query('select id,url,tipo,titulo from radar_videos where ativo=true order by criado_em desc');
    res.json({total:r.rows.length, videos:r.rows});
  }catch(e){
    res.status(500).json({error:String(e && e.message || e)});
  }finally{ try{ await c.end(); }catch(_){} }
};
