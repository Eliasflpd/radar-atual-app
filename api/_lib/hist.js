// CRM Historinhas Infantil do RADAR — vídeos compartilháveis + CONTADOR GLOBAL de visualizações.
const { Client } = require('pg');

async function ensure(c){
  await c.query(`create table if not exists radar_historinhas(
    id serial primary key,
    titulo text,
    video text,
    views integer default 0,
    ativo boolean default true,
    criado_em timestamptz default now()
  )`);
}
function tipoDe(v){
  var u=(v||'').toLowerCase();
  if(u.includes('youtube.com')||u.includes('youtu.be')) return 'youtube';
  if(u.includes('facebook.com')||u.includes('fb.watch')||u.includes('fb.me')) return 'facebook';
  if(u.endsWith('.mp4')||u.startsWith('/videos')||u.includes('.mp4')) return 'mp4';
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
    const q=req.query||{};

    // conta 1 visualização (público) — chamado quando alguém assiste
    if(q.ver){
      const r=await c.query('update radar_historinhas set views=views+1 where id=$1 returning views',[parseInt(q.ver,10)]);
      res.json({ok:true, views: r.rows[0] ? r.rows[0].views : 0});
      return;
    }

    if(req.method==='POST'){
      let b=req.body; if(typeof b==='string'){ try{ b=JSON.parse(b); }catch(e){ b={}; } }
      b=b||{};
      if((b.token||'')!==ADM){ res.status(401).json({error:'não autorizado'}); return; }
      const video=(b.video||'').trim();
      const titulo=(b.titulo||'').trim();
      if(!video){ res.status(400).json({error:'sem vídeo/link'}); return; }
      const r=await c.query('insert into radar_historinhas(titulo,video) values($1,$2) returning id',[titulo,video]);
      res.json({ok:true, id:r.rows[0].id});
      return;
    }

    const admin=(q.token||'')===ADM;
    if(admin && q.del){
      const rd=await c.query('delete from radar_historinhas where id=$1',[parseInt(q.del,10)]);
      res.json({ok:true, apagados:rd.rowCount});
      return;
    }
    const r=await c.query('select id,titulo,video,views from radar_historinhas where ativo=true order by criado_em desc');
    const rows=r.rows.map(x=>Object.assign({}, x, {tipo:tipoDe(x.video)}));
    res.json({total:rows.length, historinhas:rows});
  }catch(e){
    res.status(500).json({error:String(e && e.message || e)});
  }finally{ try{ await c.end(); }catch(_){} }
};
