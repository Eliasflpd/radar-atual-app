// MOTOR DE LIGAÇÕES — busca do "Meu Estudo" + busca SEMÂNTICA de versículos (pgvector).
// GET ?q=palavra|"livro cap:vers"  &token=<admin>   -> full-text nos livros de estudo
// GET ?sem=1&ref=jo 3:16                             -> versículos ligados por SENTIDO (vetor salvo, ZERO IA)
// GET ?sem=1&q=texto livre                           -> ligados por sentido (embed da consulta via Gemini)
const { Client } = require('pg');

// aliases de livros -> nome canônico usado no banco (livro)
const ALIAS={ rm:'romanos', rom:'romanos', gn:'genesis', gen:'genesis', ex:'exodo', lv:'levitico',
  nm:'numeros', dt:'deuteronomio', js:'josue', sl:'salmos', sal:'salmos', pv:'proverbios',
  ec:'eclesiastes', is:'isaias', jr:'jeremias', ez:'ezequiel', dn:'daniel', mt:'mateus',
  mc:'marcos', lc:'lucas', jo:'joao', at:'atos', '1co':'1 corintios', '2co':'2 corintios',
  gl:'galatas', ef:'efesios', fp:'filipenses', cl:'colossenses', hb:'hebreus', tg:'tiago',
  ap:'apocalipse', 'apoc':'apocalipse' };

// aliases -> abbrev do biblia.json (para o motor semântico de versículos)
const ABBR={ rm:'rm', rom:'rm', romanos:'rm', gn:'gn', genesis:'gn', ex:'ex', exodo:'ex',
  lv:'lv', nm:'nm', dt:'dt', js:'js', jz:'jz', rt:'rt', sl:'sl', salmos:'sl', salmo:'sl',
  pv:'pv', ec:'ec', ct:'ct', is:'is', isaias:'is', jr:'jr', lm:'lm', ez:'ez', dn:'dn',
  mt:'mt', mateus:'mt', mc:'mc', marcos:'mc', lc:'lc', lucas:'lc', jo:'jo', joao:'jo',
  atos:'atos', at:'atos', ap:'ap', apocalipse:'ap', hb:'hb', hebreus:'hb', tg:'tg',
  ef:'ef', efesios:'ef', fp:'fp', cl:'cl', gl:'gl', galatas:'gl' };

const DIM=parseInt(process.env.EMB_DIM||'768',10);
const GKEY=process.env.GEMINI_API_KEY;
const GMODEL=process.env.GEMINI_MODEL||'gemini-embedding-001';

function parseRef(s){
  const m=s.trim().match(/^(.*?)[\s]*?(\d{1,3})[:\s.](\d{1,3})\s*$/);
  if(!m) return null;
  let livro=m[1].trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  livro=livro.replace(/[.]/g,'').trim();
  if(ALIAS[livro]) livro=ALIAS[livro];
  return { livro, cap:+m[2], vers:+m[3] };
}
function parseAbbrev(s){
  const m=s.trim().match(/^(.*?)[\s]*?(\d{1,3})[:\s.](\d{1,3})\s*$/);
  if(!m) return null;
  let a=m[1].trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[.\s]/g,'');
  return { abbrev:ABBR[a]||a, cap:+m[2], ver:+m[3] };
}
async function embedQuery(text){
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${GMODEL}:embedContent?key=${GKEY}`;
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({content:{parts:[{text}]},outputDimensionality:DIM})});
  if(!r.ok) throw new Error('gemini '+r.status);
  return (await r.json()).embedding.values;
}

module.exports = async (req,res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){ res.status(200).end(); return; }

  const q=req.query||{};
  const cs=process.env.RADAR_DB;
  if(!cs){ res.status(200).json({ok:false,off:true}); return; }

  // ===== MOTOR SEMÂNTICO (versículos ligados por sentido) — PÚBLICO, é só a Bíblia =====
  if(q.sem){
    const limit=Math.min(parseInt(q.limit||'8',10)||8,25);
    const c=new Client({connectionString:cs, ssl:{rejectUnauthorized:false}});
    try{
      await c.connect();
      if(q.ref){
        const ref=parseAbbrev(q.ref.toString());
        if(!ref){ res.status(400).json({ok:false,err:'ref'}); return; }
        const base=await c.query(
          `select ref,livro,cap,ver,texto,embedding from versiculo_embeddings
            where abbrev=$1 and cap=$2 and ver=$3 and embedding is not null limit 1`,
          [ref.abbrev,ref.cap,ref.ver]);
        if(!base.rowCount){ res.status(200).json({ok:true,modo:'ref',achou:false,total:0,itens:[],msg:'versículo ainda não indexado'}); return; }
        const r=await c.query(
          `select ref,livro,cap,ver,texto, 1-(embedding <=> $1::vector) as score
             from versiculo_embeddings
            where embedding is not null and ref <> $2
            order by embedding <=> $1::vector limit $3`,
          [base.rows[0].embedding, base.rows[0].ref, limit]);
        res.status(200).json({ok:true,modo:'ref',achou:true,
          base:{ref:base.rows[0].ref,livro:base.rows[0].livro,cap:base.rows[0].cap,ver:base.rows[0].ver,texto:base.rows[0].texto},
          total:r.rowCount,itens:r.rows});
        return;
      }
      const termo=(q.q||'').toString().trim().slice(0,300);
      if(termo.length<2){ res.status(400).json({ok:false,err:'curto'}); return; }
      if(!GKEY){ res.status(200).json({ok:false,err:'sem chave IA'}); return; }
      const vec='['+(await embedQuery(termo)).join(',')+']';
      const r=await c.query(
        `select ref,livro,cap,ver,texto, 1-(embedding <=> $1::vector) as score
           from versiculo_embeddings where embedding is not null
          order by embedding <=> $1::vector limit $2`, [vec,limit]);
      res.status(200).json({ok:true,modo:'texto',q:termo,total:r.rowCount,itens:r.rows});
    }catch(e){ res.status(200).json({ok:false,err:String(e).slice(0,160)}); }
    finally{ try{ await c.end(); }catch(_){}}
    return;
  }

  // ===== BUSCA no ESTUDO (full-text) — protegida por token =====
  const ADM=process.env.RADAR_ADMIN_TOKEN;
  if(ADM && q.token!==ADM){ res.status(403).json({error:'token'}); return; }
  const termo=(q.q||'').toString().trim().slice(0,120);
  if(termo.length<2){ res.status(400).json({error:'curto'}); return; }

  const c=new Client({connectionString:cs, ssl:{rejectUnauthorized:false}});
  try{
    await c.connect();
    const ref=parseRef(termo);
    if(ref && ref.cap){
      const refStr=`${ref.livro||''} ${ref.cap}:${ref.vers}`.trim();
      const params=[ref.cap, ref.vers]; let filtroLivro='';
      if(ref.livro){ params.push('%'+ref.livro+'%'); filtroLivro=' and f_unaccent(lower(livro)) like $3'; }
      let r=await c.query(
        `select autor,titulo,livro,slug,ref,ordem,left(texto,320) as snippet
           from estudo_trechos
          where cap=$1 and vers=$2 ${filtroLivro}
          order by autor limit 60`, params);
      if(r.rowCount===0){
        const cite=`${ref.cap}:${ref.vers}`, cite2=`${ref.cap}.${ref.vers}`;
        const p2=[`%${cite}%`,`%${cite2}%`]; let fl='';
        if(ref.livro){ p2.push('%'+ref.livro+'%'); fl=' and f_unaccent(lower(livro)) like $3'; }
        r=await c.query(
          `select autor,titulo,livro,slug,ref,ordem, left(texto,320) as snippet
             from estudo_trechos
            where (texto like $1 or texto like $2) ${fl}
            order by autor limit 60`, p2);
      }
      res.json({ok:true, modo:'versiculo', ref:refStr, total:r.rowCount, itens:r.rows});
      return;
    }
    const r=await c.query(
      `select autor,titulo,livro,slug,ref,ordem,
              ts_headline('portuguese', f_unaccent(texto), plainto_tsquery('portuguese', f_unaccent($1)),
                'StartSel=«,StopSel=»,MaxWords=40,MinWords=18,MaxFragments=1') as snippet
         from estudo_trechos
        where tsv @@ plainto_tsquery('portuguese', f_unaccent($1))
        order by ts_rank(tsv, plainto_tsquery('portuguese', f_unaccent($1))) desc
        limit 50`, [termo]);
    res.json({ok:true, modo:'texto', total:r.rowCount, itens:r.rows});
  }catch(e){
    res.status(200).json({ok:false, err:String(e).slice(0,140)});
  }finally{ try{ await c.end(); }catch(_){}}
};
