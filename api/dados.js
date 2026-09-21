// ROTEADOR de endpoints do RADAR — agrupa vários handlers numa única Serverless Function.
// Motivo: o plano Hobby da Vercel limita a 12 Serverless Functions por deploy.
// Os handlers moram em api/_lib/ (prefixo _ = não vira função). As URLs públicas
// continuam iguais (ex.: /api/hit, /api/leitura) via "rewrites" no vercel.json.
const { Client } = require('pg');

// ═══════════════════════════════════════════════════════════════════════════
// PAINEL DE USO — só o pastor, protegido por RADAR_ADMIN_TOKEN.
// GET /api/dados?fn=painel&token=<RADAR_ADMIN_TOKEN>
// Mora AQUI DENTRO de propósito: o plano da Vercel já está em 11/12 funções,
// então nenhum arquivo novo pode nascer em api/.
// Lê radar_cadastros + leitura_progresso + curso_progresso + radar_acessos e,
// SE JÁ EXISTIR, a tabela radar_uso (marcador de tempo de tela — outro serviço
// a cria). Se radar_uso não existir ou estiver vazia, devolve sem_dados:true e
// NÃO inventa número nenhum.
// ═══════════════════════════════════════════════════════════════════════════
const TELAS_OK = ['home','biblia','harpa','mensagem','estudo','curso','concilio',
                  'ebd','quiz','historinhas','manuais','outro'];

function soDigitos(v){ return (v==null?'':String(v)).replace(/\D/g,''); }
function chaveDe(v){
  const d = soDigitos(v);
  return d.length >= 8 ? d : (v==null?'':String(v)).trim().toLowerCase();
}

async function painel(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store');
  if(req.method === 'OPTIONS'){ res.status(200).end(); return; }

  const q = req.query || {};
  // Mesma trava de fn=kittel / fn=avaliacao (api/estudo-busca.js)
  const ADM = process.env.RADAR_ADMIN_TOKEN;
  if(ADM && q.token !== ADM){ res.status(403).json({ ok:false, err:'token' }); return; }

  const cs = process.env.RADAR_DB;
  if(!cs){ res.status(200).json({ ok:false, off:true, err:'db não configurado' }); return; }

  const c = new Client({ connectionString: cs, ssl:{ rejectUnauthorized:false } });
  try{
    await c.connect();

    // ── 1) quem se cadastrou ────────────────────────────────────────────────
    const cad = await c.query(
      `select id, nome, cargo, whatsapp, criado_em, trial_inicio, liberado_ate
         from radar_cadastros
        order by criado_em asc
        limit 2000`);

    // ── 2) capítulos lidos (plano de leitura) ───────────────────────────────
    let leitura = { rows: [] };
    try{
      leitura = await c.query(
        `select user_key,
                count(*)::int          as n,
                max(lido_em)           as ultimo
           from leitura_progresso
          group by user_key`);
    }catch(_){}

    // ── 3) aulas de curso vistas ────────────────────────────────────────────
    // ATENÇÃO: curso_progresso guarda "perfil" (id anônimo do aparelho), não o
    // WhatsApp. Só dá pra casar com a pessoa quando o perfil é o próprio
    // telefone. O resto entra só no total global — e é dito na tela.
    let curso = { rows: [] };
    try{
      curso = await c.query(
        `select perfil,
                count(*) filter (where vista)::int as vistas,
                max(atualizado_em)                 as ultimo
           from curso_progresso
          group by perfil`);
    }catch(_){}

    // ── 4) contadores globais e anônimos (os antigos) ───────────────────────
    let acessos = { rows: [] };
    try{
      acessos = await c.query(
        `select chave, coalesce(nullif(grupo,''),'') as grupo,
                coalesce(nullif(rotulo,''),'') as rotulo,
                views::bigint as views, primeiro, ultimo
           from radar_acessos
          order by views desc
          limit 200`);
    }catch(_){}

    // ── 5) radar_uso — o marcador novo (pode ainda não existir) ─────────────
    let temUso = false;
    try{
      const t = await c.query(`select to_regclass('public.radar_uso') as t`);
      temUso = !!(t.rows[0] && t.rows[0].t);
    }catch(_){ temUso = false; }

    let usoPessoa = { rows: [] }, usoTela = { rows: [] }, usoTotal = null;
    if(temUso){
      try{
        usoPessoa = await c.query(
          `select user_key,
                  count(*)::int                       as visitas,
                  sum(coalesce(segundos,0))::bigint   as segundos,
                  max(criado_em)                      as ultimo
             from radar_uso
            group by user_key
            limit 5000`);
        usoTela = await c.query(
          `select coalesce(nullif(tela,''),'outro')          as tela,
                  coalesce(nullif(rotulo,''),'')             as rotulo,
                  count(*)::int                              as visitas,
                  count(distinct user_key)::int              as pessoas,
                  sum(coalesce(segundos,0))::bigint          as segundos,
                  count(*) filter (where gostei is true)::int  as gostaram,
                  count(*) filter (where gostei is false)::int as nao_gostaram,
                  max(criado_em)                             as ultimo
             from radar_uso
            group by 1,2
            order by segundos desc nulls last, visitas desc
            limit 400`);
        usoTotal = await c.query(
          `select count(*)::int                    as registros,
                  sum(coalesce(segundos,0))::bigint as segundos,
                  count(distinct tela)::int         as telas,
                  count(distinct user_key)::int     as pessoas
             from radar_uso`);
        usoTotal = usoTotal.rows[0] || null;
      }catch(e){
        temUso = false; // tabela existe mas com outro formato — não quebra o painel
        usoPessoa = { rows: [] }; usoTela = { rows: [] }; usoTotal = null;
      }
    }

    // ── junta tudo em memória (são poucas linhas) ───────────────────────────
    const mapLeitura = new Map();
    leitura.rows.forEach(r => mapLeitura.set(chaveDe(r.user_key), r));
    const mapCurso = new Map();
    curso.rows.forEach(r => mapCurso.set(chaveDe(r.perfil), r));
    const mapUso = new Map();
    usoPessoa.rows.forEach(r => {
      const k = chaveDe(r.user_key);
      const a = mapUso.get(k);
      if(a){ a.visitas += r.visitas; a.segundos = Number(a.segundos) + Number(r.segundos||0);
             if(!a.ultimo || (r.ultimo && r.ultimo > a.ultimo)) a.ultimo = r.ultimo; }
      else mapUso.set(k, { visitas:r.visitas, segundos:Number(r.segundos||0), ultimo:r.ultimo });
    });

    const agora = Date.now();
    const DIA = 86400000;
    const usados = new Set();
    const pessoas = cad.rows.map(p => {
      const k = chaveDe(p.whatsapp);
      usados.add(k);
      const L = mapLeitura.get(k), C = mapCurso.get(k), U = mapUso.get(k);
      const datas = [U && U.ultimo, L && L.ultimo, C && C.ultimo]
        .filter(Boolean).map(d => new Date(d).getTime());
      const ultima = datas.length ? new Date(Math.max.apply(null, datas)) : null;
      const seg = U ? Number(U.segundos||0) : 0;
      return {
        nome: p.nome || '(sem nome)',
        cargo: p.cargo || '',
        whatsapp: p.whatsapp || '',
        criado_em: p.criado_em,
        ultima_visita: ultima,
        visitas: U ? U.visitas : 0,
        minutos: Math.round(seg/60),
        segundos: seg,
        capitulos_lidos: L ? L.n : 0,
        aulas_vistas: C ? C.vistas : 0,
        dias_sumido: ultima ? Math.floor((agora - ultima.getTime())/DIA) : null,
        dias_desde_cadastro: p.criado_em ? Math.floor((agora - new Date(p.criado_em).getTime())/DIA) : null,
        medido: !!(U || L || C)
      };
    });

    // quem usou mas não está no cadastro (visitante anônimo / aparelho sem cadastro)
    let anonimos = 0, anonimos_minutos = 0;
    mapUso.forEach((v,k) => { if(!usados.has(k)){ anonimos++; anonimos_minutos += Math.round(Number(v.segundos||0)/60); } });
    mapLeitura.forEach((v,k) => { if(!usados.has(k) && !mapUso.has(k)) anonimos++; });

    const ativos = (dias) => pessoas.filter(p => p.ultima_visita &&
      (agora - new Date(p.ultima_visita).getTime()) <= dias*DIA).length;

    const telas = usoTela.rows.map(r => ({
      tela: r.tela,
      rotulo: r.rotulo,
      visitas: r.visitas,
      pessoas: r.pessoas,
      minutos: Math.round(Number(r.segundos||0)/60),
      segundos: Number(r.segundos||0),
      gostaram: r.gostaram,
      nao_gostaram: r.nao_gostaram,
      ultimo: r.ultimo
    }));

    const segTotal = usoTotal ? Number(usoTotal.segundos||0) : 0;
    const semDados = !temUso || !usoTotal || !usoTotal.registros;

    res.status(200).json({
      ok: true,
      gerado_em: new Date(),
      sem_dados: semDados,
      marcador: {
        existe: temUso,
        registros: usoTotal ? usoTotal.registros : 0,
        motivo: temUso
          ? (semDados ? 'A tabela radar_uso existe mas ainda está vazia — o marcador acabou de ser ligado.'
                      : null)
          : 'A tabela radar_uso ainda não foi criada — o marcador de tempo de tela não está ligado.'
      },
      resumo: {
        cadastrados: pessoas.length,
        ativos7: ativos(7),
        ativos30: ativos(30),
        nunca_usaram: pessoas.filter(p => !p.medido).length,
        minutos_total: Math.round(segTotal/60),
        telas_medidas: usoTotal ? usoTotal.telas : 0,
        leram_capitulo: pessoas.filter(p => p.capitulos_lidos > 0).length,
        viram_aula: pessoas.filter(p => p.aulas_vistas > 0).length,
        primeiro_cadastro: pessoas.length ? pessoas[0].criado_em : null,
        ultimo_cadastro: pessoas.length ? pessoas[pessoas.length-1].criado_em : null,
        anonimos: anonimos,
        anonimos_minutos: anonimos_minutos
      },
      cargos: (() => {
        const m = {};
        pessoas.forEach(p => { const k = p.cargo || '(não informado)'; m[k] = (m[k]||0)+1; });
        return Object.keys(m).map(k => ({ cargo:k, n:m[k] })).sort((a,b) => b.n-a.n);
      })(),
      pessoas: pessoas,
      telas: telas,
      telas_validas: TELAS_OK,
      // contadores antigos: globais e ANÔNIMOS (não dá pra saber quem clicou)
      contadores: acessos.rows.map(r => ({
        chave: r.chave, grupo: r.grupo, rotulo: r.rotulo,
        views: Number(r.views||0), primeiro: r.primeiro, ultimo: r.ultimo
      })),
      curso_global: {
        perfis: curso.rows.length,
        aulas_vistas: curso.rows.reduce((s,r) => s + (r.vistas||0), 0),
        nota: 'O curso registra por perfil anônimo do aparelho, não pelo WhatsApp — por isso nem sempre dá pra dizer QUEM assistiu.'
      }
    });
  }catch(e){
    res.status(200).json({ ok:false, err:String(e && e.message || e).slice(0,200) });
  }finally{ try{ await c.end(); }catch(_){} }
}

// ═══════════════════════════════════════════════════════════════════════════
// MARCADOR DE USO — registra QUEM viu O QUÊ, por QUANTO TEMPO e se GOSTOU.
// POST /api/dados?fn=uso
//   { "user":"99988031747", "tela":"mensagem", "rotulo":"O Pão que Desceu",
//     "segundos":145, "gostei":true }
//   ou, pra fila offline:  { "lote":[ {...}, {...} ] }
// Responde sempre {ok:true}. É o app registrando: sem token, mas VALIDADO.
// Mora AQUI DENTRO de propósito: a Vercel já está em 11/12 funções — nenhum
// arquivo novo pode nascer em api/.
// NUNCA pode travar nem atrasar o app: qualquer erro de banco vira ok:true
// com salvo:false, porque perder um registro de uso é melhor que travar a tela.
// ═══════════════════════════════════════════════════════════════════════════
const USO_MAX_SEG  = 7200;   // 2 horas — teto do contrato
const USO_MAX_TXT  = 200;    // textos cortados em 200 caracteres
const USO_MAX_LOTE = 200;    // quantos registros a fila offline pode mandar de uma vez

function usoTexto(v){
  return (v==null ? '' : String(v)).replace(/\s+/g,' ').trim().slice(0, USO_MAX_TXT);
}
function usoLimpaRegistro(b){
  b = b || {};
  const tela = usoTexto(b.tela).toLowerCase();
  if(!tela) return null;                                   // tela é OBRIGATÓRIA
  let seg = parseInt(b.segundos, 10);
  if(!(seg > 0)) seg = 0;
  if(seg > USO_MAX_SEG) seg = USO_MAX_SEG;
  let gostei = null;
  if(b.gostei === true  || b.gostei === 'true')  gostei = true;
  if(b.gostei === false || b.gostei === 'false') gostei = false;
  return {
    // user_key = whatsapp só com dígitos (mesmo padrão de leitura_progresso).
    // Pode vir vazio: visitante ainda não cadastrado -> guarda como '' mesmo.
    user_key: soDigitos(b.user != null ? b.user : b.user_key).slice(0, 60),
    tela:     TELAS_OK.indexOf(tela) >= 0 ? tela : 'outro',
    rotulo:   usoTexto(b.rotulo),
    segundos: seg,
    gostei:   gostei
  };
}

async function uso(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store');
  if(req.method === 'OPTIONS'){ res.status(200).end(); return; }

  if(req.method !== 'POST'){
    res.status(200).json({ ok:true, rota:'POST /api/dados?fn=uso',
      campos:['user','tela','rotulo','segundos','gostei'], telas: TELAS_OK });
    return;
  }

  let b = req.body;
  if(typeof b === 'string'){ try{ b = JSON.parse(b); }catch(_){ b = {}; } }
  if(Buffer.isBuffer(b)){ try{ b = JSON.parse(b.toString('utf8')); }catch(_){ b = {}; } }
  b = b || {};

  // aceita 1 registro OU um lote (a fila offline do _uso.js manda em lote)
  const cru = Array.isArray(b) ? b : (Array.isArray(b.lote) ? b.lote : [b]);
  const itens = cru.slice(0, USO_MAX_LOTE).map(usoLimpaRegistro).filter(Boolean);
  if(!itens.length){ res.status(400).json({ ok:false, err:'tela obrigatória' }); return; }

  const cs = process.env.RADAR_DB;
  if(!cs){ res.status(200).json({ ok:true, salvo:false, off:true }); return; }

  const c = new Client({ connectionString: cs, ssl:{ rejectUnauthorized:false } });
  try{
    await c.connect();
    await c.query(`create table if not exists radar_uso(
      id bigserial primary key,
      user_key text,
      tela text not null,
      rotulo text,
      segundos int default 0,
      gostei boolean,
      criado_em timestamptz default now()
    )`);
    // um único INSERT pro lote inteiro
    const vals = [], params = [];
    itens.forEach((it, i) => {
      const o = i * 5;
      vals.push(`($${o+1},$${o+2},$${o+3},$${o+4},$${o+5})`);
      params.push(it.user_key, it.tela, it.rotulo, it.segundos, it.gostei);
    });
    const r = await c.query(
      `insert into radar_uso(user_key,tela,rotulo,segundos,gostei)
       values ${vals.join(',')} returning id`, params);
    res.status(200).json({ ok:true, salvo:true, n:r.rowCount, ids:r.rows.map(x=>Number(x.id)) });
  }catch(e){
    // erro de banco NUNCA derruba a resposta — o app não pode nem travar nem saber
    res.status(200).json({ ok:true, salvo:false, err:String(e && e.message || e).slice(0,160) });
  }finally{ try{ await c.end(); }catch(_){} }
}

// ═══════════════════════════════════════════════════════════════════════════
// AVISO DE REPETIÇÃO — o caderno do que o pastor JÁ PREGOU.
//   GET  /api/dados?fn=pregado&user=<chave>            -> lista o que já pregou
//   POST /api/dados?fn=pregado                          -> registra
//        { user, slug, titulo, ref, livros:['gn 28'], tema, angulo, publico, data }
//   POST /api/dados?fn=pregado  { acao:'apagar', user, id }
//
// Mora AQUI DENTRO de propósito: a Vercel Hobby está em 11/12 funções — nenhum
// arquivo novo pode nascer em api/. Mesmo estilo do fn=uso logo acima.
// O AVISO em si (comparar texto bíblico e tema) acontece no celular, em
// public/_pregado.js — aqui só se guarda e se devolve a memória.
// ═══════════════════════════════════════════════════════════════════════════
const PREG_MAX_TXT = 220;
const PREG_MAX_LIV = 40;      // no máximo 40 chaves "livro capítulo" por peça

function pregTexto(v, max){
  return (v==null ? '' : String(v)).replace(/\s+/g,' ').trim().slice(0, max || PREG_MAX_TXT);
}
function pregData(v){
  const s = pregTexto(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;   // null => o banco põe hoje
}
function pregLivros(v){
  let arr = v;
  if(typeof arr === 'string') arr = arr.split('|');
  if(!Array.isArray(arr)) arr = [];
  const vistos = {}, out = [];
  arr.forEach(x => {
    const k = pregTexto(x, 24).toLowerCase();
    if(k && !vistos[k]){ vistos[k] = 1; out.push(k); }
  });
  return out.slice(0, PREG_MAX_LIV);
}
function pregLinha(r){
  return {
    id: Number(r.id),
    slug: r.slug || '',
    titulo: r.titulo || '',
    ref: r.ref || '',
    livros: (r.livros || '').split('|').filter(Boolean),
    tema: r.tema || '',
    angulo: r.angulo || '',
    publico: r.publico || '',
    data: r.pregado_em ? new Date(r.pregado_em).toISOString().slice(0,10) : '',
    criado_em: r.criado_em
  };
}

async function pregTabela(c){
  await c.query(`create table if not exists radar_pregacoes(
    id bigserial primary key,
    user_key text not null default '',
    slug text,
    titulo text not null,
    ref text,
    livros text,
    tema text,
    angulo text,
    publico text,
    pregado_em date default current_date,
    criado_em timestamptz default now()
  )`);
  try{ await c.query(`create index if not exists radar_pregacoes_user on radar_pregacoes(user_key)`); }catch(_){}
}

async function pregado(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store');
  if(req.method === 'OPTIONS'){ res.status(200).end(); return; }

  const q = req.query || {};
  let b = req.body;
  if(typeof b === 'string'){ try{ b = JSON.parse(b); }catch(_){ b = {}; } }
  if(Buffer.isBuffer(b)){ try{ b = JSON.parse(b.toString('utf8')); }catch(_){ b = {}; } }
  b = b || {};

  const chave = chaveDe(req.method === 'POST' ? (b.user != null ? b.user : b.user_key) : q.user).slice(0,60);
  if(!chave){
    // sem dono não há caderno — e não se devolve o caderno dos outros
    res.status(200).json({ ok:true, itens:[], sem_dono:true });
    return;
  }

  const cs = process.env.RADAR_DB;
  if(!cs){ res.status(200).json({ ok:true, itens:[], off:true, salvo:false }); return; }

  const c = new Client({ connectionString: cs, ssl:{ rejectUnauthorized:false } });
  try{
    await c.connect();
    await pregTabela(c);

    // ── apagar (desmarcar "já preguei") ──────────────────────────────────────
    if(req.method === 'POST' && b.acao === 'apagar'){
      const id = parseInt(b.id, 10);
      if(!(id > 0)){ res.status(400).json({ ok:false, err:'id' }); return; }
      const d = await c.query(
        `delete from radar_pregacoes where id=$1 and user_key=$2`, [id, chave]);
      res.status(200).json({ ok:true, apagado:d.rowCount });
      return;
    }

    // ── registrar ────────────────────────────────────────────────────────────
    if(req.method === 'POST'){
      const titulo = pregTexto(b.titulo);
      if(!titulo){ res.status(400).json({ ok:false, err:'título obrigatório' }); return; }
      const slug   = pregTexto(b.slug, 160);
      const data   = pregData(b.data);
      const livros = pregLivros(b.livros).join('|');

      // não duplica: mesma peça, mesmo dia, mesma pessoa = o mesmo registro
      const ja = await c.query(
        `select * from radar_pregacoes
          where user_key=$1
            and coalesce(nullif(slug,''), titulo) = $2
            and pregado_em = coalesce($3::date, current_date)
          limit 1`, [chave, slug || titulo, data]);
      if(ja.rowCount){
        res.status(200).json({ ok:true, salvo:true, ja:true, item: pregLinha(ja.rows[0]) });
        return;
      }

      const r = await c.query(
        `insert into radar_pregacoes(user_key,slug,titulo,ref,livros,tema,angulo,publico,pregado_em)
         values($1,$2,$3,$4,$5,$6,$7,$8, coalesce($9::date, current_date))
         returning *`,
        [chave, slug, titulo, pregTexto(b.ref), livros, pregTexto(b.tema, 400),
         pregTexto(b.angulo, 400), pregTexto(b.publico, 120), data]);
      res.status(200).json({ ok:true, salvo:true, item: pregLinha(r.rows[0]) });
      return;
    }

    // ── listar ───────────────────────────────────────────────────────────────
    const l = await c.query(
      `select * from radar_pregacoes
        where user_key=$1
        order by pregado_em desc, id desc
        limit 500`, [chave]);
    res.status(200).json({ ok:true, total:l.rowCount, itens: l.rows.map(pregLinha) });
  }catch(e){
    // igual ao fn=uso: erro de banco NUNCA pode travar a tela do pastor
    res.status(200).json({ ok:true, itens:[], salvo:false, err:String(e && e.message || e).slice(0,160) });
  }finally{ try{ await c.end(); }catch(_){} }
}

const HANDLERS = {
  hit:          require('./_lib/hit.js'),
  hist:         require('./_lib/hist.js'),
  igrejas:      require('./_lib/igrejas.js'),
  acesso:       require('./_lib/acesso.js'),
  'ebd-lupa':   require('./_lib/ebd-lupa.js'),
  manual:       require('./_lib/manual.js'),
  leitura:      require('./_lib/leitura.js'),
  publicacoes:  require('./_lib/publicacoes.js'),
  // MOTOR INVISÍVEL da biblioteca do Elias (livros comprados: Champlin, Kittel,
  // Waltke, Kidner…). Entra AQUI porque precisa de pg — o /api/voz é Edge e não
  // tem pg — e porque nenhuma função nova cabe no plano Hobby. Protegida por
  // RADAR_ADMIN_TOKEN: só servidor chama, nunca o navegador. Ver o cabeçalho de
  // api/_lib/biblioteca.js pra entender por que o texto não pode sair daqui.
  biblioteca:   require('./_lib/biblioteca.js'),
  painel:       painel,
  uso:          uso,
  pregado:      pregado
};

module.exports = async (req, res) => {
  const fn = (req.query && req.query.fn) || '';
  const h = HANDLERS[fn];
  if(!h){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.status(404).json({ error: 'endpoint desconhecido', fn: fn });
    return;
  }
  return h(req, res);
};
