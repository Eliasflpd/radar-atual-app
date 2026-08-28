// MOTOR DE LIGAÇÕES — busca do "Meu Estudo".
// GET ?q=palavra|"livro cap:vers"  &token=<admin>
// Modo TEXTO: acha o termo em TODOS os livros (Postgres full-text pt, ignora acento).
// Modo VERSÍCULO: "Romanos 8:28" -> o que CADA autor comentou sobre aquele versículo.
const { Client } = require('pg');

// aliases de livros -> nome canônico usado no banco (livro)
const ALIAS={ rm:'romanos', rom:'romanos', gn:'genesis', gen:'genesis', ex:'exodo', lv:'levitico',
  nm:'numeros', dt:'deuteronomio', js:'josue', sl:'salmos', sal:'salmos', pv:'proverbios',
  ec:'eclesiastes', is:'isaias', jr:'jeremias', ez:'ezequiel', dn:'daniel', mt:'mateus',
  mc:'marcos', lc:'lucas', jo:'joao', at:'atos', '1co':'1 corintios', '2co':'2 corintios',
  gl:'galatas', ef:'efesios', fp:'filipenses', cl:'colossenses', hb:'hebreus', tg:'tiago',
  ap:'apocalipse', 'apoc':'apocalipse' };

function parseRef(s){
  const m=s.trim().match(/^(.*?)[\s]*?(\d{1,3})[:\s.](\d{1,3})\s*$/);
  if(!m) return null;
  let livro=m[1].trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  livro=livro.replace(/[.]/g,'').trim();
  if(ALIAS[livro]) livro=ALIAS[livro];
  return { livro, cap:+m[2], vers:+m[3] };
}

module.exports = async (req,res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){ res.status(200).end(); return; }

  const ADM=process.env.RADAR_ADMIN_TOKEN;
  const q=req.query||{};
  if(ADM && q.token!==ADM){ res.status(403).json({error:'token'}); return; }
  const termo=(q.q||'').toString().trim().slice(0,120);
  if(termo.length<2){ res.status(400).json({error:'curto'}); return; }

  const cs=process.env.RADAR_DB;
  if(!cs){ res.status(200).json({ok:false,off:true}); return; }
  const c=new Client({connectionString:cs, ssl:{rejectUnauthorized:false}});
  try{
    await c.connect();
    const ref=parseRef(termo);
    if(ref && ref.cap){
      // === cruzamento por versículo ===
      const params=[ref.cap, ref.vers]; let filtroLivro='';
      if(ref.livro){ params.push('%'+ref.livro+'%'); filtroLivro=' and f_unaccent(lower(livro)) like $3'; }
      const r=await c.query(
        `select autor,titulo,livro,slug,ref,ordem,left(texto,320) as snippet
           from estudo_trechos
          where cap=$1 and vers=$2 ${filtroLivro}
          order by autor limit 60`, params);
      res.json({ok:true, modo:'versiculo', ref:`${ref.livro||''} ${ref.cap}:${ref.vers}`.trim(),
                 total:r.rowCount, itens:r.rows});
      return;
    }
    // === busca em texto ===
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
