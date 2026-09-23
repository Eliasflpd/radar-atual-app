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

// Motor semântico agora padronizado em Voyage 1024 dims (tabela versiculo_emb_voyage).
// MODELO: trocar pelo painel (VOYAGE_MODEL na Vercel) — o default aqui é só a rede de
// segurança. voyage-4-lite entrega 1024 dims nativo (mesma coluna vector(1024)) e está
// na cota grátis de 200M tokens; voyage-3.x virou "older model" e NÃO tem mais free tier.
// ATENÇÃO: modelo diferente = ESPAÇO VETORIAL diferente. Dimensão igual só evita erro de
// SQL, não garante busca certa. Ao trocar VOYAGE_MODEL é OBRIGATÓRIO regerar os vetores
// (scripts/embed_versiculos.js, que reindexa sozinho quando a coluna modelo não bate).
// Confira o que está gravado com  ?sem=1&diag=1  antes e depois da troca.
const SEM_TABLE=(process.env.EMB_TABLE||'versiculo_emb_voyage').replace(/[^a-z0-9_]/gi,'');
const VDIM=parseInt(process.env.EMB_DIM||'1024',10);
const VKEY=process.env.VOYAGE_API_KEY;
const VMODEL=process.env.VOYAGE_MODEL||'voyage-4-lite';

// ── A RESERVA (23/09/2026) ───────────────────────────────────────────────────
// POR QUE: a cota grátis da Voyage é de ~3 buscas POR MINUTO. Testando a busca
// ao vivo, três perguntas seguidas já devolveram `voyage 429` — ou seja, numa
// classe de EBD com vários pastores procurando ao mesmo tempo no domingo, a
// busca por sentido simplesmente PARA, e o irmão não vê motivo nenhum na tela.
// ⚠️ A PEGADINHA QUE QUASE ME PEGOU: ter o MESMO TAMANHO de vetor (1024) NÃO
// deixa os dois motores comparáveis. Cada modelo tem o seu próprio "espaço": um
// vetor de um motor procurado na tabela do outro devolve LIXO, e lixo silencioso,
// que é pior que erro. Por isso a reserva tem TABELA PRÓPRIA, indexada com o
// mesmo motor — e quem escolhe o motor escolhe a tabela junto, sempre no par.
//
// POR QUE CLOUDFLARE, e não o Gemini (que era o plano de manhã): RESERVA NO
// MESMO DONO NÃO É RESERVA. O globo de voz já depende inteiro do Google. Se o
// Google tiver um dia ruim, a voz e a busca cairiam JUNTAS, e o pastor ficaria
// sem nada. A Cloudflare é casa diferente, o bge-m3 entrega 1024 dims nativo, a
// conta (CF_ACCOUNT_ID/CF_AI_TOKEN) já está na Vercel, e a cota é de outra
// ordem: 10.000 neurônios/dia, e a Bíblia inteira custa cerca de 10% disso.
const RKEY=process.env.CF_AI_TOKEN||'';
const RCONTA=process.env.CF_ACCOUNT_ID||'';
const RMODEL=process.env.CF_EMB_MODEL||'@cf/baai/bge-m3';
const RTABLE=(process.env.EMB_TABLE_RESERVA||'versiculo_emb_cf').replace(/[^a-z0-9_]/gi,'');

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
async function embedVoyage(text){
  // Voyage — mesma família/dimensão dos vetores salvos (input_type:query melhora a busca)
  const r=await fetch('https://api.voyageai.com/v1/embeddings',{method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+VKEY},
    body:JSON.stringify({model:VMODEL,input:[text],output_dimension:VDIM,input_type:'query'})});
  if(!r.ok) throw new Error('voyage '+r.status);
  return (await r.json()).data[0].embedding;
}
async function embedReserva(text){
  // bge-m3 entrega 1024 dims nativo — não precisa pedir tamanho nem cortar.
  const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+RCONTA+'/ai/run/'+RMODEL,
    {method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+RKEY},
     body:JSON.stringify({text:[text]})});
  if(!r.ok) throw new Error('cloudflare '+r.status);
  const j=await r.json();
  const v=j&&j.result&&((j.result.data&&j.result.data[0])||(j.result.response&&j.result.response.data&&j.result.response.data[0]));
  if(!Array.isArray(v)) throw new Error('cloudflare sem vetor');
  return v;
}
// ── O REFINADOR (Cohere rerank) ──────────────────────────────────────────────
// POR QUE (23/09/2026, liberado pelo Elias: "o RADAR tá longe de funil e venda"):
// a busca por vetor acha o ASSUNTO, mas erra a ORDEM. Medido: perguntando
// "quando o filho volta arrependido e o pai o recebe com festa", o vetor sozinho
// devolvia 2Rs 4:18, Lv 25:41 e Gn 27:31 — texto de pai e filho, nenhum deles o
// que foi perguntado. Com o rerank, **Lucas 15:25 sobe pra primeiro**.
// Por isso a busca agora pega TRÊS VEZES mais versículos do banco (é de graça,
// o vetor já está lá) e deixa o Cohere escolher quais merecem aparecer.
//
// ⚠️ O rerank NUNCA pode derrubar a busca. Se a Cohere falhar, atrasar ou bater
// no teto, fica a ordem do vetor — que já era o que existia antes. Refinamento
// que quebra o principal não é refinamento, é risco.
// Limite: chave de teste = 20 chamadas/min. Temos SEIS (todas testadas vivas em
// 23/09), revezando dá 120/min. O sorteio do ponto de partida espalha a carga
// entre as funções da Vercel, que não conversam entre si.
const CKEYS=(process.env.COHERE_API_KEYS||process.env.COHERE_API_KEY||'').split(/[,\s]+/).filter(Boolean);
let cAtual=CKEYS.length?Math.floor(Math.random()*CKEYS.length):0;
async function refinar(pergunta, itens, quantos){
  if(!CKEYS.length || itens.length<=quantos) return { itens: itens.slice(0,quantos), reordenado:false };
  const chave=CKEYS[cAtual]; cAtual=(cAtual+1)%CKEYS.length;
  try{
    const ctrl=new AbortController();
    const corta=setTimeout(()=>ctrl.abort(), 4000);   // busca lenta é busca quebrada
    const r=await fetch('https://api.cohere.com/v2/rerank',{method:'POST',signal:ctrl.signal,
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+chave},
      body:JSON.stringify({model:'rerank-v3.5',query:pergunta,
        documents:itens.map(i=>i.texto||''),top_n:quantos})});
    clearTimeout(corta);
    if(!r.ok) throw new Error('cohere '+r.status);
    const j=await r.json();
    if(!Array.isArray(j.results)||!j.results.length) throw new Error('cohere sem resultado');
    return { itens: j.results.map(x=>Object.assign({}, itens[x.index], {score_refinado:x.relevance_score}))
                              .filter(Boolean), reordenado:true };
  }catch(_){
    return { itens: itens.slice(0,quantos), reordenado:false };
  }
}

// Devolve SEMPRE o par { vetor, tabela } — nunca um sem o outro, porque procurar
// na tabela errada não dá erro: dá resposta bonita e errada.
//
// E só cai pra reserva se ela estiver INTEIRA. Enquanto a Bíblia está sendo
// indexada, a tabela existe mas tem um punhado de versículos — e uma reserva pela
// metade é pior que reserva nenhuma: ela responde sempre, sempre com o pedaço
// errado, e ninguém desconfia. Meia-boca não entra no lugar do bom.
const MINIMO_RESERVA = 31000;   // a Bíblia tem 31.102; 31.000 dá folga
let reservaPronta = null;       // lembrada entre chamadas na mesma função quente
async function embedQuery(text, c){
  try{
    return { vec: await embedVoyage(text), tabela: SEM_TABLE, motor: VMODEL };
  }catch(e){
    if(!RKEY||!RCONTA) throw e;
    if(reservaPronta === null){
      try{
        const n = await c.query(`select count(*)::int n from ${RTABLE} where embedding is not null`);
        reservaPronta = n.rows[0].n >= MINIMO_RESERVA;
      }catch(_){ reservaPronta = false; }
    }
    if(!reservaPronta) throw e;   // devolve o erro DE VERDADE, não uma resposta falsa
    return { vec: await embedReserva(text), tabela: RTABLE, motor: RMODEL,
             reserva: 'principal falhou ('+String(e.message||e).slice(0,40)+')' };
  }
}

module.exports = async (req,res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){ res.status(200).end(); return; }

  const q=req.query||{};
  const cs=process.env.RADAR_DB;
  if(!cs){ res.status(200).json({ok:false,off:true}); return; }

  // ===== KITTEL — fonte privada do Concílio (nunca vai pro navegador) =====
  if(q.fn==='kittel'){
    const ADMK=process.env.RADAR_ADMIN_TOKEN;
    if(ADMK && q.token!==ADMK){ res.status(403).json({ok:false,err:'token'}); return; }
    const semAcento=(s)=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
      .replace(/[\u00f5\u00f4\u014d]/g,'o').replace(/[\u00ea\u0113\u1e17]/g,'e')
      .replace(/[\u00e1\u00e0\u00e2\u0101]/g,'a').replace(/[\u00ed\u00ec\u00ee\u012b]/g,'i')
      .replace(/[\u00fa\u00f9\u00fb\u016b]/g,'u');
    const PARE=new Set(('sobre para como qual quais quando onde porque pastor texto tema '
      +'versiculo capitulo palavra significa significado explica explique fale falar '
      +'mensagem sermao estudo biblia senhor deus jesus cristo esse essa isso aquilo '
      +'quero preciso pode voce mais muito ainda entre depois antes').split(' '));
    const palavras=[...new Set(semAcento(q.q||'').split(/[^a-z0-9]+/)
      .filter(w=>w.length>=4 && !PARE.has(w)))].slice(0,8);
    if(!palavras.length){ res.status(200).json({ok:true,total:0,itens:[]}); return; }

    const quantos=Math.min(parseInt(q.n||'2',10)||2,4);
    const casos=palavras.map((_,i)=>`(case when busca like $${i+1} then 4 else 0 end)`).join('+');
    const ors=palavras.map((_,i)=>`busca like $${i+1}`).join(' or ');
    const vals=palavras.map(w=>'%'+w+'%');

    const c=new Client({connectionString:cs, ssl:{rejectUnauthorized:false}});
    try{
      await c.connect();
      const r=await c.query(
        `select termos,glosas,volume,pagina,tdnt,left(texto,2600) as texto, (${casos}) as peso
           from kittel_verbetes where ${ors}
          order by peso desc, length(texto) desc limit ${quantos}`, vals);
      res.status(200).json({ok:true,total:r.rowCount,itens:r.rows});
    }catch(e){ res.status(200).json({ok:false,err:String(e.message||e).slice(0,120)}); }
    finally{ try{ await c.end(); }catch(_){} }
    return;
  }

  // ===== AVALIAÇÃO DA MENSAGEM — ✅ aprovei / ❌ reprovei + o porquê, por escrito =====
  // O pastor lê a mensagem, marca o estado e escreve a observação dele. Reavaliar
  // SOBRESCREVE (chave única slug+user_key) — o parecer é um só, sempre o último.
  //   ?fn=avaliacao&slug=..&user=..&token=..                 -> lê o parecer daquela mensagem
  //   ?fn=avaliacao&acao=salvar&slug=..&user=..&estado=..&obs=..&token=..  -> grava
  //   ?fn=avaliacao&acao=listar&user=..&token=..             -> tudo que ele já avaliou
  if(q.fn==='avaliacao'){
    const ADMA=process.env.RADAR_ADMIN_TOKEN;
    if(ADMA && q.token!==ADMA){ res.status(403).json({ok:false,err:'token'}); return; }

    const acao=(q.acao||'ler').toString().trim().toLowerCase();
    // O whatsapp é gravado SÓ COM DÍGITOS em radar_cadastros (índice uq_cad_whats usa
    // regexp_replace). Se a tela mandar "(11) 99999-0000" num dia e "11999990000" no
    // outro, viram dois pareceres pra mesma mensagem. Normalizamos aqui, na entrada.
    const userBruto=(q.user||'').toString().trim().slice(0,60);
    const user=/^[\d\s().+-]+$/.test(userBruto)
      ? userBruto.replace(/\D/g,'')
      : userBruto.toLowerCase();
    const slug=(q.slug||'').toString().trim().slice(0,200);
    if(!user){ res.status(400).json({ok:false,err:'sem user'}); return; }
    if(acao!=='listar' && !slug){ res.status(400).json({ok:false,err:'sem slug'}); return; }

    // '', 'null', 'limpar' apagam o estado sem apagar a observação.
    let estado=(q.estado==null?'':q.estado.toString().trim().toLowerCase());
    if(estado==='null'||estado==='limpar'||estado==='') estado=null;
    if(acao==='salvar' && estado!==null && estado!=='aprovado' && estado!=='reprovado'){
      res.status(400).json({ok:false,err:'estado'}); return;
    }
    const obs=(q.obs==null?null:q.obs.toString().slice(0,4000));

    const c=new Client({connectionString:cs, ssl:{rejectUnauthorized:false}});
    try{
      await c.connect();
      if(acao==='salvar'){
        const r=await c.query(
          `insert into mensagem_avaliacao (slug,user_key,estado,obs)
                values ($1,$2,$3,$4)
           on conflict (slug,user_key) do update
                  set estado=excluded.estado,
                      obs=coalesce(excluded.obs, mensagem_avaliacao.obs),
                      atualizado_em=now()
             returning id,slug,user_key,estado,obs,criado_em,atualizado_em`,
          [slug,user,estado,obs]);
        res.status(200).json({ok:true,salvo:true,item:r.rows[0]});
        return;
      }
      if(acao==='listar'){
        const r=await c.query(
          `select id,slug,user_key,estado,obs,criado_em,atualizado_em
             from mensagem_avaliacao
            where user_key=$1 and (estado is not null or coalesce(obs,'')<>'')
            order by atualizado_em desc limit 500`, [user]);
        res.status(200).json({ok:true,total:r.rowCount,itens:r.rows});
        return;
      }
      const r=await c.query(
        `select id,slug,user_key,estado,obs,criado_em,atualizado_em
           from mensagem_avaliacao where slug=$1 and user_key=$2 limit 1`, [slug,user]);
      res.status(200).json({ok:true,achou:r.rowCount>0,item:r.rows[0]||null});
    }catch(e){ res.status(200).json({ok:false,err:String(e.message||e).slice(0,160)}); }
    finally{ try{ await c.end(); }catch(_){} }
    return;
  }

  // ===== MOTOR SEMÂNTICO (versículos ligados por sentido) — PÚBLICO, é só a Bíblia =====
  if(q.sem){
    const limit=Math.min(parseInt(q.limit||'8',10)||8,25);
    const c=new Client({connectionString:cs, ssl:{rejectUnauthorized:false}});
    try{
      await c.connect();
      // ?sem=1&diag=1 — confere se o modelo configurado é o MESMO que gerou os vetores
      // salvos. Vetor de um modelo buscado com consulta de outro devolve lixo silencioso.
      if(q.diag){
        const d=await c.query(
          `select modelo, dim, count(*)::int as n from ${SEM_TABLE}
            where embedding is not null group by modelo, dim order by n desc`);
        const gravados=d.rows.map(x=>x.modelo);
        // A RESERVA também tem que aparecer aqui. Reserva que ninguém confere é
        // reserva que só se descobre quebrada no domingo, com a classe esperando.
        let res_ok=null;
        try{
          const g=await c.query(
            `select modelo, dim, count(*)::int as n from ${RTABLE}
              where embedding is not null group by modelo, dim order by n desc`);
          res_ok={ tabela:RTABLE, chave:!!(RKEY&&RCONTA), modelo:RMODEL, gravado:g.rows,
                   pronta: g.rows.length===1 && g.rows[0].modelo===RMODEL
                           && g.rows[0].dim===VDIM && g.rows[0].n>=31000 };
        }catch(e){ res_ok={ tabela:RTABLE, chave:!!(RKEY&&RCONTA), erro:String(e.message||e).slice(0,80), pronta:false }; }

        res.status(200).json({ok:true,modo:'diag',tabela:SEM_TABLE,
          configurado:{modelo:VMODEL,dim:VDIM,chave:!!VKEY}, gravado:d.rows,
          reserva:res_ok,
          refinador:{ motor:'cohere rerank-v3.5', chaves:CKEYS.length,
                      ligado:CKEYS.length>0, teto:'20 chamadas/min por chave' },
          bate: gravados.length===1 && gravados[0]===VMODEL && d.rows[0].dim===VDIM,
          aviso: gravados.length===1 && gravados[0]===VMODEL ? null
            : `vetores gravados com [${gravados.join(', ')}] mas as consultas usam [${VMODEL}] — reindexe com scripts/embed_versiculos.js`});
        return;
      }
      if(q.ref){
        const ref=parseAbbrev(q.ref.toString());
        if(!ref){ res.status(400).json({ok:false,err:'ref'}); return; }
        const base=await c.query(
          `select ref,livro,cap,ver,texto,embedding from ${SEM_TABLE}
            where abbrev=$1 and cap=$2 and ver=$3 and embedding is not null limit 1`,
          [ref.abbrev,ref.cap,ref.ver]);
        if(!base.rowCount){ res.status(200).json({ok:true,modo:'ref',achou:false,total:0,itens:[],msg:'versículo ainda não indexado'}); return; }
        const bruto=CKEYS.length ? Math.min(limit*3,40) : limit;
        const r=await c.query(
          `select ref,livro,cap,ver,texto, 1-(embedding <=> $1::vector) as score
             from ${SEM_TABLE}
            where embedding is not null and ref <> $2
            order by embedding <=> $1::vector limit $3`,
          [base.rows[0].embedding, base.rows[0].ref, bruto]);
        // aqui a "pergunta" é o próprio versículo que o irmão abriu
        const fino=await refinar(base.rows[0].texto, r.rows, limit);
        res.status(200).json({ok:true,modo:'ref',achou:true,
          base:{ref:base.rows[0].ref,livro:base.rows[0].livro,cap:base.rows[0].cap,ver:base.rows[0].ver,texto:base.rows[0].texto},
          total:fino.itens.length,itens:fino.itens,refinado:fino.reordenado});
        return;
      }
      const termo=(q.q||'').toString().trim().slice(0,300);
      if(termo.length<2){ res.status(400).json({ok:false,err:'curto'}); return; }
      if(!VKEY){ res.status(200).json({ok:false,err:'sem chave IA'}); return; }
      const emb=await embedQuery(termo,c);
      const vec='['+emb.vec.join(',')+']';
      // pega 3x pro refinador ter de onde escolher (teto 40: mais que isso só
      // engorda o pedido pro Cohere sem melhorar o que vai aparecer na tela)
      const bruto=CKEYS.length ? Math.min(limit*3,40) : limit;
      const r=await c.query(
        `select ref,livro,cap,ver,texto, 1-(embedding <=> $1::vector) as score
           from ${emb.tabela} where embedding is not null
          order by embedding <=> $1::vector limit $2`, [vec,bruto]);
      const fino=await refinar(termo, r.rows, limit);
      res.status(200).json({ok:true,modo:'texto',q:termo,total:fino.itens.length,itens:fino.itens,
        motor:emb.motor, reserva:emb.reserva||null, refinado:fino.reordenado});
    }catch(e){ res.status(200).json({ok:false,err:String(e).slice(0,160)}); }
    finally{ try{ await c.end(); }catch(_){}}
    return;
  }

  // ===== BUSCA no ESTUDO (full-text) — protegida por token =====
  const ADM=process.env.RADAR_ADMIN_TOKEN;
  if(!ADM || q.token!==ADM){ res.status(403).json({error:'token'}); return; }
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
