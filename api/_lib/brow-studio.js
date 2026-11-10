// ═══════════════════════════════════════════════════════════════════════════
// BROW STUDIO — CADASTRO DE CLIENTES (10/11/2026)
// URL pública: /api/brow   (rewrite no vercel.json → /api/dados?fn=brow)
//
// Não é do RADAR: o app de sobrancelhas só mora neste repositório porque o plano
// gratuito do GitHub/Vercel não comporta outro projeto. Por isso:
//   • tabelas com prefixo brow_ (nada do RADAR é lido ou alterado);
//   • entra como `fn=` no roteador api/dados.js (a Vercel Hobby está em 12/12
//     funções — nenhum arquivo novo pode nascer em api/).
//
// FOTOS: ficam DENTRO do Postgres (bytea), comprimidas no aparelho (~60 KB a
// foto e ~5 KB a miniatura). Não existe link público: a foto só sai por esta
// rota, para quem passar na trava de acesso abaixo.
//
// ⚠️ TRAVA DE ACESSO — O LOGIN AINDA NÃO EXISTE (decisão da dona: login por
// último). Enquanto não existir, a rota RECUSA tudo (503 login_pendente) e
// nenhum dado de cliente fica exposto na internet. Só para testes locais:
// BROW_TESTE_SEM_LOGIN=1 libera como o estabelecimento "principal".
// NUNCA ligar BROW_TESTE_SEM_LOGIN na Vercel. Quando o login vier, ele só
// precisa preencher `acesso()` devolvendo o estabelecimento da pessoa logada —
// todas as consultas já filtram por `estab`.
//
// Ações (clientes; serviços em api/_lib/brow-servicos.js, ações "servico*"):
//   GET  ?acao=listar&q=&limite=&pagina=   → { ok, itens:[{id,nome,apelido,telefone,mini}], total, pagina, limite }
//   GET  ?acao=ver&id=                     → { ok, cliente:{..., foto:'data:image/jpeg;base64,...'|null} }
//   POST ?acao=criar      { chave_envio, nome, ..., foto?, foto_mini? }   → { ok, id, repetido? }
//   POST ?acao=atualizar&id=  { campos parciais; foto:null remove }      → { ok }
// ═══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');
const { Client } = require('pg');

const CONTATOS = ['whatsapp', 'ligacao', 'email', 'nenhum'];
const ORIGENS = ['instagram', 'indicacao', 'google', 'ja_cliente', 'outro', 'nao_informado'];
const DDD_BR = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
const MAX_FOTO = 1500 * 1024;   // bytes, depois de decodificar (a foto chega já comprimida)
const MAX_MINI = 80 * 1024;

// ─── trava de acesso (ver cabeçalho) ────────────────────────────────────────
function acesso(req) {
  // usuario: quem está logado (o login vai preencher; hoje é nulo). Os módulos gravam a autoria com ele.
  if (process.env.BROW_TESTE_SEM_LOGIN === '1' && !process.env.VERCEL) return { ok: true, estab: 'principal', usuario: null };
  return { ok: false };
}

async function garantirTabelas(c) {
  await c.query(`create table if not exists brow_clientes(
    id            text primary key,
    estab         text not null,
    nome          text not null,
    apelido       text,
    nascimento    date,
    telefone      text,
    email         text,
    contato_pref  text,
    origem        text,
    lembretes     boolean not null default false,
    novidades     boolean not null default false,
    observacoes   text,
    foto          bytea,
    foto_mini     bytea,
    foto_tipo     text,
    chave_envio   text,
    criado_em     timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
  )`);
  await c.query(`create unique index if not exists brow_clientes_envio on brow_clientes(estab, chave_envio) where chave_envio is not null`);
  await c.query(`create index if not exists brow_clientes_estab_nome on brow_clientes(estab, lower(nome))`);
}

// ─── validação (a mesma regra do aparelho; o servidor nunca confia nele) ─────
const txt = (v, max) => { const s = (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim(); return s ? s.slice(0, max) : null; };
const digitos = (v) => (v == null ? '' : String(v)).replace(/\D/g, '');

function telefoneValido(d) {
  if (d.length !== 10 && d.length !== 11) return false;
  if (!DDD_BR.has(d.slice(0, 2))) return false;
  return d.length === 11 ? d[2] === '9' : /[2-5]/.test(d[2]);
}
function emailValido(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 160; }
function dataValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T12:00:00Z');
  if (isNaN(d) || d.toISOString().slice(0, 10) !== s) return false;
  const ano = d.getUTCFullYear();
  return ano >= 1900 && d <= new Date();
}

// Converte "data:image/jpeg;base64,..." em Buffer conferindo a assinatura do arquivo.
function decodificarImagem(dataUrl, max) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return { erro: 'formato' };
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length || buf.length > max) return { erro: 'tamanho' };
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP';
  if (!(jpeg || png || webp)) return { erro: 'formato' };
  return { buf, tipo: m[1] };
}

// Lê e valida os campos enviados. `parcial` = edição (só o que veio é alterado).
function lerCampos(b, parcial) {
  const out = {}; const erros = {};
  const tem = (k) => Object.prototype.hasOwnProperty.call(b, k);

  if (!parcial || tem('nome')) {
    const nome = txt(b.nome, 120);
    if (!nome || nome.length < 2) erros.nome = 'Informe o nome completo.';
    else out.nome = nome;
  }
  if (tem('apelido')) out.apelido = txt(b.apelido, 60);
  if (tem('nascimento')) {
    const n = txt(b.nascimento, 10);
    if (n && !dataValida(n)) erros.nascimento = 'Data de nascimento inválida.';
    else out.nascimento = n;
  }
  if (tem('telefone')) {
    const d = digitos(b.telefone);
    if (d && !telefoneValido(d)) erros.telefone = 'Telefone inválido. Use DDD + número.';
    else out.telefone = d || null;
  }
  if (tem('email')) {
    const e = txt(b.email, 160);
    const el = e ? e.toLowerCase() : null;
    if (el && !emailValido(el)) erros.email = 'E-mail inválido.';
    else out.email = el;
  }
  if (tem('contato_pref')) {
    const v = b.contato_pref || null;
    if (v && !CONTATOS.includes(v)) erros.contato_pref = 'Escolha uma opção válida.';
    else out.contato_pref = v;
  }
  if (tem('origem')) {
    const v = b.origem || null;
    if (v && !ORIGENS.includes(v)) erros.origem = 'Escolha uma opção válida.';
    else out.origem = v;
  }
  if (tem('lembretes')) out.lembretes = b.lembretes === true;
  if (tem('novidades')) out.novidades = b.novidades === true;
  if (tem('observacoes')) {
    const o = (b.observacoes == null ? '' : String(b.observacoes)).trim().slice(0, 2000);
    out.observacoes = o || null;
  }
  // coerência: quem prefere WhatsApp/ligação precisa de telefone; e-mail precisa de e-mail
  const tel = tem('telefone') ? out.telefone : undefined;
  const mail = tem('email') ? out.email : undefined;
  if (out.contato_pref === 'whatsapp' || out.contato_pref === 'ligacao') {
    if (tel === null || (!parcial && !tel)) erros.contato_pref = 'Para esse contato, informe o telefone.';
  }
  if (out.contato_pref === 'email' && (mail === null || (!parcial && !mail))) erros.contato_pref = 'Para esse contato, informe o e-mail.';

  if (tem('foto')) {
    if (b.foto === null) { out.foto = null; out.foto_mini = null; out.foto_tipo = null; }
    else {
      const f = decodificarImagem(b.foto, MAX_FOTO);
      const mi = decodificarImagem(b.foto_mini, MAX_MINI);
      if (f.erro || mi.erro) erros.foto = 'A foto não pôde ser salva (arquivo inválido ou grande demais).';
      else { out.foto = f.buf; out.foto_mini = mi.buf; out.foto_tipo = f.tipo; }
    }
  }
  return { out, erros };
}

function paraDataUrl(buf, tipo) { return buf ? `data:${tipo || 'image/jpeg'};base64,${Buffer.from(buf).toString('base64')}` : null; }
function corpo(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  return (b && typeof b === 'object') ? b : {};
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Sem CORS aberto: o app chama do mesmo endereço.

  const porta = acesso(req);
  if (!porta.ok) {
    res.status(503).json({ ok: false, erro: 'login_pendente',
      msg: 'O salvamento definitivo ainda não está ativo: falta configurar o login do Brow Studio.' });
    return;
  }
  const cs = (process.env.RADAR_DB_DATABASE_URL || process.env.RADAR_DB);
  if (!cs) { res.status(503).json({ ok: false, erro: 'sem_banco', msg: 'Banco de dados não configurado.' }); return; }

  const q = req.query || {};
  const acao = String(q.acao || '');
  const estab = porta.estab;
  const ssl = /localhost|127\.0\.0\.1/.test(cs) ? false : { rejectUnauthorized: false };
  const c = new Client({ connectionString: cs, ssl });
  try {
    await c.connect();

    // SERVIÇOS E VALORES (módulo 2): mesma trava e mesma conexão. Ver api/_lib/brow-servicos.js.
    if (acao.startsWith('servico')) { await require('./brow-servicos.js')(c, estab, req, res, acao); return; }
    // AGENDA, AGENDAMENTOS E ENCAIXES (módulo 3). Ver api/_lib/brow-agenda.js.
    // CONTATOS DO ESTÚDIO (módulo 7). Ver api/_lib/brow-contatos.js.
    if (acao.startsWith('ct_')) {
      await require('./brow-contatos.js')(c, estab, req, res, acao, async (cc) => { await require('./brow-agenda.js').garantirTabelas(cc); });
      return;
    }
    // REGISTRO DE ATENDIMENTOS E FOTOS (módulo 6). Ver api/_lib/brow-registros.js.
    if (acao.startsWith('rg_')) {
      req.brow_usuario = porta.usuario || null;
      await require('./brow-registros.js')(c, estab, req, res, acao, async (cc) => {
        await garantirTabelas(cc); await require('./brow-servicos.js').garantirTabela(cc); await require('./brow-agenda.js').garantirTabelas(cc);
      });
      return;
    }
    // TERMOS E AUTORIZAÇÕES (módulo 5). Ver api/_lib/brow-termos.js.
    if (acao.startsWith('tm_')) {
      req.brow_usuario = porta.usuario || null;
      await require('./brow-termos.js')(c, estab, req, res, acao, async (cc) => {
        await garantirTabelas(cc); await require('./brow-servicos.js').garantirTabela(cc); await require('./brow-agenda.js').garantirTabelas(cc);
      });
      return;
    }
    // FICHA DE ANAMNESE (módulo 4). Ver api/_lib/brow-anamnese.js.
    if (acao.startsWith('an_')) {
      req.brow_usuario = porta.usuario || null;
      await require('./brow-anamnese.js')(c, estab, req, res, acao, async (cc) => {
        await garantirTabelas(cc); await require('./brow-servicos.js').garantirTabela(cc); await require('./brow-agenda.js').garantirTabelas(cc);
      });
      return;
    }
    if (acao.startsWith('ag_') || acao.startsWith('enc_')) {
      await require('./brow-agenda.js')(c, estab, req, res, acao, async (cc) => { await garantirTabelas(cc); await require('./brow-servicos.js').garantirTabela(cc); });
      return;
    }

    await garantirTabelas(c);

    if (req.method === 'GET' && acao === 'listar') {
      const limite = Math.min(Math.max(parseInt(q.limite, 10) || 8, 1), 50);
      const pagina = Math.max(parseInt(q.pagina, 10) || 1, 1);
      const termo = txt(q.q, 80);
      const params = [estab];
      let filtro = '';
      if (termo) {
        // nome sem acento/maiúscula OU telefone por dígitos
        params.push('%' + termo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '%');
        const sem = `translate(lower(nome),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn')`;
        filtro = ` and (${sem} like $2 or translate(lower(coalesce(apelido,'')),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn') like $2`;
        const d = digitos(termo);
        if (d.length >= 3) { params.push('%' + d + '%'); filtro += ` or telefone like $3`; }
        filtro += ')';
      }
      const tot = await c.query(`select count(*)::int n from brow_clientes where estab=$1${filtro}`, params);
      const total = tot.rows[0].n;
      const pags = Math.max(1, Math.ceil(total / limite));
      const pg = Math.min(pagina, pags);
      const r = await c.query(
        `select id, nome, apelido, telefone, foto_mini, foto_tipo from brow_clientes
          where estab=$1${filtro} order by lower(nome), criado_em
          limit ${limite} offset ${(pg - 1) * limite}`, params);
      res.status(200).json({ ok: true, total, pagina: pg, paginas: pags, limite,
        itens: r.rows.map(x => ({ id: x.id, nome: x.nome, apelido: x.apelido, telefone: x.telefone,
          mini: paraDataUrl(x.foto_mini, 'image/jpeg') })) });
      return;
    }

    if (req.method === 'GET' && acao === 'ver') {
      const r = await c.query(
        `select id,nome,apelido,to_char(nascimento,'YYYY-MM-DD') nascimento,telefone,email,contato_pref,origem,
                lembretes,novidades,observacoes,foto,foto_tipo,criado_em,atualizado_em
           from brow_clientes where estab=$1 and id=$2`, [estab, String(q.id || '')]);
      if (!r.rows.length) { res.status(404).json({ ok: false, erro: 'nao_encontrada', msg: 'Cliente não encontrada.' }); return; }
      const x = r.rows[0];
      const foto = paraDataUrl(x.foto, x.foto_tipo); delete x.foto; delete x.foto_tipo;
      res.status(200).json({ ok: true, cliente: { ...x, foto } });
      return;
    }

    if (req.method === 'POST' && acao === 'criar') {
      const b = corpo(req);
      const chave = txt(b.chave_envio, 64);
      if (!chave) { res.status(400).json({ ok: false, erro: 'chave_envio', msg: 'Pedido incompleto.' }); return; }
      // toque repetido / reenvio: devolve a mesma cliente em vez de duplicar
      const ja = await c.query('select id from brow_clientes where estab=$1 and chave_envio=$2', [estab, chave]);
      if (ja.rows.length) { res.status(200).json({ ok: true, id: ja.rows[0].id, repetido: true }); return; }

      const { out, erros } = lerCampos(b, false);
      if (Object.keys(erros).length) { res.status(422).json({ ok: false, erro: 'validacao', erros }); return; }
      const id = crypto.randomUUID();
      const cols = ['id', 'estab', 'chave_envio', ...Object.keys(out)];
      const vals = [id, estab, chave, ...Object.values(out)];
      const r = await c.query(
        `insert into brow_clientes(${cols.join(',')}) values(${cols.map((_, i) => '$' + (i + 1)).join(',')})
         on conflict (estab, chave_envio) where chave_envio is not null do nothing returning id`, vals);
      if (!r.rows.length) {   // dois toques chegaram juntos: o outro gravou primeiro
        const o = await c.query('select id from brow_clientes where estab=$1 and chave_envio=$2', [estab, chave]);
        res.status(200).json({ ok: true, id: o.rows[0].id, repetido: true }); return;
      }
      res.status(201).json({ ok: true, id });
      return;
    }

    if (req.method === 'POST' && acao === 'atualizar') {
      const id = String(q.id || '');
      const b = corpo(req);
      const { out, erros } = lerCampos(b, true);
      // coerência com o que já está salvo (ex.: mudou para WhatsApp sem mandar telefone)
      if (!erros.contato_pref && out.contato_pref && out.contato_pref !== 'nenhum') {
        const atual = await c.query('select telefone,email from brow_clientes where estab=$1 and id=$2', [estab, id]);
        if (atual.rows.length) {
          const tel = 'telefone' in out ? out.telefone : atual.rows[0].telefone;
          const mail = 'email' in out ? out.email : atual.rows[0].email;
          if ((out.contato_pref === 'whatsapp' || out.contato_pref === 'ligacao') && !tel) erros.contato_pref = 'Para esse contato, informe o telefone.';
          if (out.contato_pref === 'email' && !mail) erros.contato_pref = 'Para esse contato, informe o e-mail.';
        }
      }
      if (Object.keys(erros).length) { res.status(422).json({ ok: false, erro: 'validacao', erros }); return; }
      const ks = Object.keys(out);
      if (!ks.length) { res.status(200).json({ ok: true, sem_mudanca: true }); return; }
      const sets = ks.map((k, i) => `${k}=$${i + 3}`).join(',');
      const r = await c.query(`update brow_clientes set ${sets}, atualizado_em=now() where estab=$1 and id=$2`,
        [estab, id, ...ks.map(k => out[k])]);
      if (!r.rowCount) { res.status(404).json({ ok: false, erro: 'nao_encontrada', msg: 'Cliente não encontrada.' }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ ok: false, erro: 'acao', msg: 'Ação desconhecida.' });
  } catch (e) {
    console.error('brow-studio:', e && e.message);
    res.status(500).json({ ok: false, erro: 'servidor', msg: 'Não foi possível concluir agora. Tente novamente.' });
  } finally {
    try { await c.end(); } catch (_) {}
  }
};

module.exports._teste = { telefoneValido, emailValido, dataValida, lerCampos };
