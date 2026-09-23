// PLANO DE LEITURA BÍBLICA do RADAR — progresso por usuário (capítulos lidos), config de plano e streak.
// Persistência em Postgres (Supabase). Segue o mesmo padrão dos outros endpoints (pg + RADAR_DB).
// Ações:
//   GET  /api/leitura?user=<chave>                    -> { ok, config, progresso:[{livro,capitulo,lido_em}], total_lidos }
//   POST /api/leitura  { user, acao:'marcar',   livro, capitulo }
//   POST /api/leitura  { user, acao:'desmarcar',livro, capitulo }
//   POST /api/leitura  { user, acao:'marcar_lote', itens:[{livro,capitulo}] }   (migra progresso local)
//   POST /api/leitura  { user, acao:'plano', plano:'livre'|'ano'|'cronologico', meta_dia? }
const { Client } = require('pg');
// A TRAVA POR PESSOA. Até 23/09/2026 esta rota era a única por pessoa SEM
// trava nenhuma: com o WhatsApp de alguém dava pra ler o plano de leitura dela
// e, pior, APAGAR capítulo por capítulo o ano inteiro de leitura bíblica —
// sem backup e sem confirmação. Ver api/_lib/chave.js.
const CHAVE = require('./chave.js');

async function ensure(c){
  await c.query(`create table if not exists leitura_progresso(
    id serial primary key,
    user_key text not null,
    livro text not null,
    capitulo int not null,
    lido_em timestamptz default now(),
    unique(user_key,livro,capitulo)
  )`);
  await c.query(`create index if not exists idx_leitura_prog_user on leitura_progresso(user_key)`);
  await c.query(`create table if not exists leitura_config(
    user_key text primary key,
    plano text not null default 'livre',
    iniciado_em date default current_date,
    meta_dia int not null default 1,
    atualizado_em timestamptz default now()
  )`);
}

// MESMA regra de api/dados.js, chave.js, globo-memoria.js e voz.js.
// Antes esta cópia só tirava espaco: o mesmo pastor virava DUAS identidades
// (11999999999 aqui, (11)99999-9999 ali) e o painel mostrava 0 capitulos
// lidos pra quem le todo dia. Agora e a regra unica: CHAVE.chaveDe.
function normKey(v){ return CHAVE.chaveDe(v); }
function normLivro(v){ return (v||'').toString().toLowerCase().trim().slice(0,12); }
function planoValido(p){ return ['livre','ano','cronologico'].includes(p) ? p : 'livre'; }

async function pegarConfig(c, user){
  let r = await c.query('select user_key,plano,iniciado_em,meta_dia from leitura_config where user_key=$1',[user]);
  if(!r.rows.length){
    await c.query(`insert into leitura_config(user_key,plano,iniciado_em,meta_dia,atualizado_em)
      values($1,'livre',current_date,1,now()) on conflict(user_key) do nothing`,[user]);
    r = await c.query('select user_key,plano,iniciado_em,meta_dia from leitura_config where user_key=$1',[user]);
  }
  return r.rows[0];
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, x-radar-chave');
  if(req.method==='OPTIONS'){ res.status(200).end(); return; }

  const cs=process.env.RADAR_DB;
  if(!cs){ res.status(200).json({ok:false, off:true, err:'db não configurado'}); return; }
  const c=new Client({connectionString:cs, ssl:{rejectUnauthorized:false}});
  try{
    await c.connect(); await ensure(c);

    // ── A TRAVA POR PESSOA ────────────────────────────────────────────────
    // Recusa NAO trava a tela: devolve o plano vazio, igual a quem nunca leu.
    // Quem desenha a tela so mostra o que vier; nada de erro na cara do pastor.
    let _b = req.body;
    if(typeof _b === 'string'){ try{ _b = JSON.parse(_b); }catch(e){ _b = {}; } }
    _b = _b || {};
    const _dono = normKey(req.method==='POST' ? _b.user : (req.query||{}).user);
    if(_dono){
      const porte = await CHAVE.conferir(c, _dono, CHAVE.daRequisicao(req, _b));
      if(!porte.ok){
        res.status(200).json({ ok:true, lidos:[], total:0, precisa_chave:true, motivo:porte.motivo });
        return;
      }
    }

    if(req.method==='POST'){
      let b=req.body; if(typeof b==='string'){ try{ b=JSON.parse(b); }catch(e){ b={}; } }
      b=b||{};
      const user=normKey(b.user);
      const acao=(b.acao||'').toString();
      if(!user){ res.status(400).json({ok:false, err:'sem user'}); return; }

      if(acao==='marcar'){
        const livro=normLivro(b.livro); const cap=parseInt(b.capitulo,10);
        if(!livro || !(cap>0)){ res.status(400).json({ok:false, err:'livro/capitulo inválido'}); return; }
        await c.query(`insert into leitura_progresso(user_key,livro,capitulo,lido_em)
          values($1,$2,$3,now())
          on conflict(user_key,livro,capitulo) do update set lido_em=now()`,[user,livro,cap]);
        res.json({ok:true, marcado:{livro,capitulo:cap}}); return;
      }

      if(acao==='desmarcar'){
        const livro=normLivro(b.livro); const cap=parseInt(b.capitulo,10);
        if(!livro || !(cap>0)){ res.status(400).json({ok:false, err:'livro/capitulo inválido'}); return; }
        const r=await c.query('delete from leitura_progresso where user_key=$1 and livro=$2 and capitulo=$3',[user,livro,cap]);
        res.json({ok:true, removidos:r.rowCount}); return;
      }

      if(acao==='marcar_lote'){
        const itens=Array.isArray(b.itens)?b.itens.slice(0,2000):[];
        let n=0;
        for(const it of itens){
          const livro=normLivro(it.livro); const cap=parseInt(it.capitulo,10);
          if(!livro || !(cap>0)) continue;
          await c.query(`insert into leitura_progresso(user_key,livro,capitulo,lido_em)
            values($1,$2,$3,now()) on conflict(user_key,livro,capitulo) do nothing`,[user,livro,cap]);
          n++;
        }
        res.json({ok:true, inseridos:n}); return;
      }

      if(acao==='plano'){
        const plano=planoValido(b.plano);
        const meta=Math.max(1, Math.min(20, parseInt(b.meta_dia,10)||1));
        await c.query(`insert into leitura_config(user_key,plano,iniciado_em,meta_dia,atualizado_em)
          values($1,$2,current_date,$3,now())
          on conflict(user_key) do update set plano=excluded.plano, meta_dia=excluded.meta_dia, atualizado_em=now()`,
          [user,plano,meta]);
        const cfg=await pegarConfig(c,user);
        res.json({ok:true, config:cfg}); return;
      }

      res.status(400).json({ok:false, err:'ação desconhecida'}); return;
    }

    // GET — progresso + config
    const user=normKey((req.query||{}).user);
    if(!user){ res.status(400).json({ok:false, err:'sem user'}); return; }
    const cfg=await pegarConfig(c,user);
    const pr=await c.query('select livro,capitulo,lido_em from leitura_progresso where user_key=$1 order by lido_em',[user]);
    res.json({ ok:true, config:cfg, progresso:pr.rows, total_lidos:pr.rows.length });
  }catch(e){
    res.status(200).json({ok:false, err:String(e && e.message || e).slice(0,180)});
  }finally{ try{ await c.end(); }catch(_){} }
};
