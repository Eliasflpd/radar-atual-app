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

// ===== PUSH (notificação com app fechado) =====
const EBD_TITULOS=['O CHAMADO PARA OS GENTIOS','A PORTA DA FÉ SE ABRE ENTRE OS GENTIOS','A GRAÇA QUE ALCANÇA TODAS AS NAÇÕES','O ESPÍRITO QUE NOS GUIA PARA ALÉM DAS FRONTEIRAS','CRISTO ENTRE OS FILÓSOFOS — O DEUS DESCONHECIDO SE REVELA','A SUFICIÊNCIA DA GRAÇA NA CIDADE DE CORINTO','QUANDO O ESPÍRITO SOPRA EM ÉFESO','DESPEDIDA EM ÉFESO ENTRE LÁGRIMAS E ALERTAS','CORAGEM PARA TESTEMUNHAR — PAULO DIANTE DA MULTIDÃO','UMA ESPERANÇA INABALÁVEL PERANTE OS PODEROSOS','ENTRE TEMPESTADES E PROMESSAS','O EVANGELHO CHEGA AO CORAÇÃO DO IMPÉRIO','A MISSÃO CONTINUA EM NÓS'];
function ebdInfo(){
  const sp=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
  sp.setHours(0,0,0,0);
  const start=new Date(2026,6,5); start.setHours(0,0,0,0);
  const dow=sp.getDay();
  const prox=new Date(sp); if(dow!==0) prox.setDate(sp.getDate()+(7-dow));
  const wk=Math.round((prox-start)/(7*86400000));
  const n=Math.max(1,wk+1);
  return {dow, n, titulo:(EBD_TITULOS[n-1]||'')};
}
async function ensurePush(c){
  await c.query(`create table if not exists push_subs(id bigserial primary key, endpoint text unique not null, p256dh text not null, auth text not null, criado_em timestamptz default now(), ultimo_ok timestamptz)`);
}
async function enviarPush(c, payload){
  const webpush=require('web-push');
  webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:radar@radar-atual.vercel.app', process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);
  const subs=await c.query('select id,endpoint,p256dh,auth from push_subs');
  const data=JSON.stringify(payload);
  let ok=0, rm=0;
  for(const s of subs.rows){
    try{
      await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}}, data);
      ok++;
    }catch(err){
      const sc=err&&err.statusCode;
      if(sc===404||sc===410){ await c.query('delete from push_subs where id=$1',[s.id]); rm++; }
    }
  }
  if(ok) await c.query('update push_subs set ultimo_ok=now()');
  return {enviados:ok, removidos:rm, total:subs.rows.length};
}

// ===== MÍDIAS DA COMUNIDADE (qualquer um publica) + CRM =====
async function ensureMidias(c){
  await c.query(`create table if not exists midias(
    id bigserial primary key, autor_nome text, autor_cargo text, autor_fone text,
    autor_cidade text, autor_bairro text, autor_igreja text, texto text,
    media_url text, media_tipo text, aprovado boolean default true, criado_em timestamptz default now())`);
  await c.query(`create table if not exists cadastros_crm(
    id bigserial primary key, fone text unique, nome text, cargo text, cidade text, bairro text, igreja text,
    criado_em timestamptz default now(), atualizado_em timestamptz default now())`);
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

      // === INSCREVER no push (qualquer pessoa que aceitar receber avisos) ===
      if(b.acao==='push-sub'){
        const sub=b.sub||{};
        if(!sub.endpoint||!sub.keys||!sub.keys.p256dh||!sub.keys.auth){ res.status(400).json({ok:false,erro:'sub'}); return; }
        await ensurePush(c);
        await c.query('insert into push_subs(endpoint,p256dh,auth) values($1,$2,$3) on conflict(endpoint) do update set p256dh=excluded.p256dh,auth=excluded.auth',[sub.endpoint,sub.keys.p256dh,sub.keys.auth]);
        res.status(200).json({ok:true});
        return;
      }

      // === PUBLICAR MÍDIA (qualquer pessoa) + vira CRM ===
      if(b.acao==='midia-sub'){
        const nome=(b.nome||'').toString().trim().slice(0,80);
        const fone=(b.fone||'').toString().trim().slice(0,30);
        if(!nome || !fone){ res.status(400).json({ok:false,erro:'Nome e telefone são obrigatórios'}); return; }
        await ensureMidias(c);
        let media_url=null, media_tipo=null;
        if(b.imgBase64){
          try{
            const m=(b.imgBase64||'').match(/^data:([^;]+);base64,(.*)$/);
            const mime = m? m[1] : 'image/jpeg';
            const data = m? m[2] : b.imgBase64;
            const buf = Buffer.from(data,'base64');
            if(buf.length > 5*1024*1024){ res.status(413).json({ok:false,erro:'Imagem muito grande (máx 5MB)'}); return; }
            const ext=(mime.split('/')[1]||'jpg').replace('jpeg','jpg');
            const fname=Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext;
            const SUPA='https://tjyquvmbaaavqnpirapp.supabase.co';
            const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqeXF1dm1iYWFhdnFucGlyYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NjY1NjEsImV4cCI6MjEwMzQ0MjU2MX0.-MAINAAdh3XBvLD8UAdgtBwv5Ze4skAeKSocrGXWxGc';
            const up=await fetch(SUPA+'/storage/v1/object/midias/'+fname, {method:'POST', headers:{'Authorization':'Bearer '+ANON,'apikey':ANON,'Content-Type':mime}, body:buf});
            if(!up.ok){ const t=await up.text(); res.status(200).json({ok:false,erro:'Falha no upload: '+t.slice(0,90)}); return; }
            media_url=SUPA+'/storage/v1/object/public/midias/'+fname; media_tipo='imagem';
          }catch(e){ res.status(200).json({ok:false,erro:'Falha no upload: '+String(e.message||e).slice(0,90)}); return; }
        } else if(b.videoLink){
          media_url=(b.videoLink||'').toString().trim().slice(0,500); media_tipo='video';
        }
        const ins=await c.query('insert into midias(autor_nome,autor_cargo,autor_fone,autor_cidade,autor_bairro,autor_igreja,texto,media_url,media_tipo) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id',
          [nome,(b.cargo||'').toString().slice(0,60),fone,(b.cidade||'').toString().slice(0,60),(b.bairro||'').toString().slice(0,60),(b.igreja||'').toString().slice(0,90),(b.texto||'').toString().slice(0,4000),media_url,media_tipo]);
        await c.query(`insert into cadastros_crm(fone,nome,cargo,cidade,bairro,igreja) values($1,$2,$3,$4,$5,$6)
          on conflict(fone) do update set nome=excluded.nome,cargo=excluded.cargo,cidade=excluded.cidade,bairro=excluded.bairro,igreja=excluded.igreja,atualizado_em=now()`,
          [fone,nome,(b.cargo||'').toString(),(b.cidade||'').toString(),(b.bairro||'').toString(),(b.igreja||'').toString()]);
        res.status(200).json({ok:true, id:ins.rows[0].id});
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

    // === CRON: envia o aviso da EBD (chamado pelo Vercel no sábado/domingo) ===
    if(q.acao==='push-cron'){
      if((q.k||'')!==(process.env.PUSH_CRON_SECRET||'__x__')){ res.status(403).json({ok:false}); return; }
      await ensurePush(c);
      await c.query('create table if not exists push_estado(id int primary key default 1, ultimo_envio date)');
      try{ await c.query('alter table push_estado add column if not exists ultimo_agenda date'); }catch(_){}
      const hojeSP=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'})); hojeSP.setHours(0,0,0,0);
      const hojeStr=hojeSP.toISOString().slice(0,10);
      const amanha=new Date(hojeSP); amanha.setDate(hojeSP.getDate()+1);
      const amanhaStr=amanha.toISOString().slice(0,10);
      const est0=await c.query('select ultimo_envio,ultimo_agenda from push_estado where id=1');
      const est=est0.rows[0]||{};
      const out={ok:true, hoje:hojeStr, amanha:amanhaStr};

      // ===== DESPERTADOR DA AGENDA — avisa 1 dia antes (todo dia) =====
      const jaAgenda = est.ultimo_agenda && new Date(est.ultimo_agenda).toISOString().slice(0,10)===hojeStr;
      if(!jaAgenda){
        let ev=[];
        try{ const q2=await c.query('select titulo,origem from agenda_eventos where data=$1 order by origem',[amanhaStr]); ev=q2.rows; }catch(_){}
        if(ev.length){
          const body = ev.length===1 ? (ev[0].titulo+' ('+ev[0].origem+')') : ('Amanhã: '+ev.map(r=>r.titulo).join(' · '));
          const ra=await enviarPush(c,{title:(ev.length>1?('🔔 Amanhã — '+ev.length+' eventos'):'🔔 Amanhã na agenda'), body:body, url:'/', tag:'agenda-'+amanhaStr});
          out.agenda={eventos:ev.length, ...ra};
        } else { out.agenda={eventos:0}; }
        await c.query('insert into push_estado(id,ultimo_agenda) values(1,$1) on conflict(id) do update set ultimo_agenda=excluded.ultimo_agenda',[hojeStr]);
      } else { out.agenda={pulou:'ja avisou hoje'}; }

      // ===== EBD — véspera (sáb) e dia (dom) =====
      const e=ebdInfo();
      const jaEbd = est.ultimo_envio && new Date(est.ultimo_envio).toISOString().slice(0,10)===hojeStr;
      if((e.dow===6 || e.dow===0) && !jaEbd){
        const quando=(e.dow===6)?'Amanhã tem EBD!':'Hoje tem EBD!';
        const body=(e.titulo?('Lição '+e.n+': '+e.titulo):('Lição '+e.n))+' — toque para abrir.';
        const rb=await enviarPush(c,{title:'🔔 '+quando, body:body, url:'/', tag:'ebd'});
        await c.query('insert into push_estado(id,ultimo_envio) values(1,$1) on conflict(id) do update set ultimo_envio=excluded.ultimo_envio',[hojeStr]);
        out.ebd={licao:e.n, ...rb};
      } else { out.ebd={pulou:true, dow:e.dow}; }

      res.status(200).json(out);
      return;
    }
    // debug (admin): ver os eventos de uma data (YYYY-MM-DD)
    if(q.acao==='agenda-check'){
      if(!admin){ res.status(403).json({ok:false}); return; }
      const d=(q.d||'').toString();
      const r=await c.query('select data,titulo,origem from agenda_eventos where data=$1 order by origem',[d]);
      res.status(200).json({ok:true, data:d, eventos:r.rows});
      return;
    }
    // === TESTE (só admin): dispara uma notificação agora pra todos os inscritos ===
    if(q.acao==='push-test'){
      if(!admin){ res.status(403).json({ok:false}); return; }
      await ensurePush(c);
      const r=await enviarPush(c,{title:'🔔 RADAR', body:'Teste de notificação — funcionando! 🎉', url:'/', tag:'teste'});
      res.status(200).json({ok:true, ...r});
      return;
    }
    // quantos inscritos (só admin)
    if(q.acao==='push-count'){
      if(!admin){ res.status(403).json({ok:false}); return; }
      await ensurePush(c);
      const r=await c.query('select count(*)::int n from push_subs');
      res.status(200).json({ok:true, inscritos:r.rows[0].n});
      return;
    }
    // lista pública das mídias publicadas pela comunidade
    if(q.acao==='midia-list'){
      await ensureMidias(c);
      const r=await c.query('select id,autor_nome,autor_cargo,autor_igreja,autor_cidade,autor_bairro,texto,media_url,media_tipo,criado_em from midias where aprovado=true order by criado_em desc limit 100');
      res.status(200).json({ok:true, midias:r.rows});
      return;
    }
    if(q.acao==='midia-del'){ if(!admin){ res.status(403).json({ok:false}); return; } await ensureMidias(c); await c.query('delete from midias where id=$1',[parseInt(q.id,10)||0]); res.status(200).json({ok:true}); return; }
    if(q.acao==='crm-list'){ if(!admin){ res.status(403).json({ok:false}); return; } await ensureMidias(c); const r=await c.query('select fone,nome,cargo,cidade,bairro,igreja,atualizado_em from cadastros_crm order by atualizado_em desc'); res.status(200).json({ok:true, total:r.rows.length, crm:r.rows}); return; }

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
