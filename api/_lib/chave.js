// ═══════════════════════════════════════════════════════════════════════════════
// A CHAVE DO APARELHO — o crachá que prova "estes dados são MEUS".
// URL interna: POST /api/dados?fn=chave   (registrado em api/dados.js)
//
// POR QUE ESTE ARQUIVO EXISTE (22/09/2026):
// As rotas que devolvem dados POR PESSOA não pediam NADA. Bastava saber o
// WhatsApp de alguém pra ler o caderno de pregações dela (fn=pregado) e os
// assuntos que ela conversou com o globo (/api/voz). Número de WhatsApp de
// pastor se acha em qualquer cartaz de igreja — então não era um buraco
// teórico, era um buraco adivinhável.
//
// O QUE É A CHAVE:
// um segredo aleatório de 32 bytes, emitido no cadastro, que fica guardado no
// APARELHO da pessoa (localStorage 'radar_chave') e sobe em toda chamada por
// pessoa. Aqui no banco fica só o SHA-256 dela — se o banco vazar amanhã,
// ninguém entra com o que vazou.
//
// ⚠️ A CHAVE NUNCA DESCE POR GET. Existe /api/cadastros?phone=<whatsapp> que
// devolve o cadastro só com o telefone (é o "Já cadastrado?"). Se a chave
// descesse por ali, quem rouba pelo telefone roubaria a chave junto e a trava
// inteira não valeria nada. Ela sai UMA vez, na resposta do POST que a emitiu.
//
// ⚠️ SEM CORS, de propósito — igual a fn=memoria e fn=biblioteca: ninguém deve
// chamar ISTO do navegador. Quem chama é servidor-pra-servidor (o /api/voz, que
// roda no Edge e não tem `pg`), com o RADAR_ADMIN_TOKEN vindo do env. As rotas
// Node (fn=pregado) usam as funções aqui embaixo DIRETO, sem passar pela rede.
//
// ⚠️ NÃO NASCE FUNÇÃO NOVA: a Vercel Hobby está em 12/12 Serverless Functions.
// Por isso isto mora em api/_lib/ e entra como `fn=` no roteador api/dados.js.
//
// ⚠️ A REGRA DA CASA ACIMA DE TUDO: nada aqui pode TRAVAR o app do pastor.
// Quando a conferência diz não, quem chamou degrada em silêncio (caderno vazio,
// globo sem memória) — nunca tela de erro, nunca app que não abre.
// ═══════════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');
const { Client } = require('pg');

// ─── os tetos e a data da parede ────────────────────────────────────────────
const MAX_CHAVES = 8;            // aparelhos por pessoa. Cheio, o mais parado sai.
const TOLERANCIA_PADRAO = '2026-12-31';

// ─── quem é a pessoa: MESMA regra de api/dados.js e de globo-memoria.js ──────
// Telefone vira só dígitos; aparelho sem cadastro manda um id anônimo tipo
// "ap3f9k2..." e ele fica como está. Se esta regra divergir, a chave de uma
// pessoa deixa de casar com os dados dela e o caderno some — por isso é cópia
// fiel, não "parecida".
function chaveDe(v) {
  const d = (v == null ? '' : String(v)).replace(/\D/g, '');
  return (d.length >= 8 ? d : (v == null ? '' : String(v)).trim().toLowerCase()).slice(0, 60);
}

// Telefone é ADIVINHÁVEL; id de aparelho, não. Essa diferença decide tudo lá
// embaixo em `conferir` — leia o comentário do TOFU antes de mexer aqui.
//
// ⚠️ POR QUE OLHAR SÓ O FORMATO NÃO BASTA (o banco de provas me pegou nisto):
// o `chaveDe` daqui de cima — que é cópia do que api/dados.js já fazia muito
// antes desta trava — transforma em SÓ DÍGITOS qualquer coisa com 8 dígitos ou
// mais. Um id de aparelho sorteado em base36 tipo "aparelho-12345678" vira
// "12345678" e fica com cara de telefone, mesmo não sendo. Se eu decidisse só
// pelo formato, esse aparelho nunca ganharia crachá e perderia o caderno no dia
// em que a tolerância acabasse.
// Então a pergunta certa não é "parece telefone?", é "É DE ALGUÉM?": está no
// cadastro? Se está, é pessoa de verdade, com número que se acha em cartaz de
// igreja — e aí NÃO se adota por quem chegar primeiro. Se não está, é um id
// sorteado, que ninguém adivinha, e adotar é seguro.
function pareceTelefone(userKey) {
  return /^\d{8,}$/.test(String(userKey || ''));
}

async function estaNoCadastro(c, userKey) {
  if (!pareceTelefone(userKey)) return false;
  try {
    const r = await c.query(
      `select 1 from radar_cadastros
        where regexp_replace(coalesce(whatsapp,''),'\\D','','g') = $1 limit 1`, [userKey]);
    return r.rowCount > 0;
  } catch (_) {
    // Sem conseguir perguntar, o seguro é tratar como pessoa de verdade: não
    // adota. Adotar por engano entregaria uma conta; não adotar só adia.
    return true;
  }
}

function sha(s) {
  return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
}

// O formato é fechado de propósito: o que não tem a cara do que a gente emite
// nem chega a virar consulta no banco.
function segredoLimpo(v) {
  const s = (v == null ? '' : String(v)).trim();
  return /^rk_[A-Za-z0-9_-]{20,120}$/.test(s) ? s : '';
}

function novoSegredo() {
  return 'rk_' + crypto.randomBytes(32).toString('base64url');
}

// ─── de onde a chave vem numa requisição ────────────────────────────────────
// Cabeçalho primeiro, corpo depois. NUNCA a query string: URL vai pro log da
// Vercel, pro histórico do navegador e pro Referer — segredo em URL é segredo
// publicado devagar. O corpo existe porque o `navigator.sendBeacon` do globo
// (aquele que salva o último turno quando o pastor fecha a aba) não consegue
// mandar cabeçalho nenhum.
function daRequisicao(req, corpo) {
  const h = (req && req.headers) || {};
  const doCabecalho = h['x-radar-chave'] || h['X-Radar-Chave'] || '';
  if (segredoLimpo(doCabecalho)) return segredoLimpo(doCabecalho);
  const b = corpo || {};
  return segredoLimpo(b.chave || b.chave_aparelho || '');
}

function toleranciaAte() {
  const s = String(process.env.RADAR_CHAVE_ATE || TOLERANCIA_PADRAO).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : TOLERANCIA_PADRAO;
}
function dentroDaTolerancia() {
  // data ISO compara bem como texto — "2026-09-23" <= "2026-12-31" é verdade.
  return new Date().toISOString().slice(0, 10) <= toleranciaAte();
}

// ─────────────────────────────────────────────────────────────────────────────
// A TABELA. Minúscula de propósito: o banco está em 1.074 MB de 1.100 MB de
// freio (ver o cabeçalho de globo-memoria.js). Uma linha aqui tem ~120 bytes.
// ─────────────────────────────────────────────────────────────────────────────
async function tabela(c) {
  await c.query(`create table if not exists radar_chaves(
    id bigserial primary key,
    user_key text not null,
    chave_hash text not null unique,
    apelido text,
    criado_em timestamptz default now(),
    usado_em timestamptz
  )`);
  try { await c.query(`create index if not exists radar_chaves_user on radar_chaves(user_key)`); } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// EMITIR — nasce um crachá novo pra um aparelho.
// Devolve o segredo EM TEXTO uma única vez. Quem chamou tem que entregá-lo ao
// dono na mesma resposta: depois daqui só existe o hash, e nem eu consigo ler.
// ─────────────────────────────────────────────────────────────────────────────
async function emitir(c, user, apelido) {
  const dono = chaveDe(user);
  if (!dono) return { ok: false, motivo: 'sem_dono' };
  await tabela(c);

  const segredo = novoSegredo();
  await c.query(
    `insert into radar_chaves(user_key, chave_hash, apelido, usado_em)
     values($1,$2,$3, now())`,
    [dono, sha(segredo), (apelido == null ? '' : String(apelido)).slice(0, 40)]);

  // Lotou? sai o aparelho que está parado há mais tempo. O teto existe pra uma
  // conta não virar molho de chaves sem fim; a ordem de saída é "o mais parado"
  // porque é o que tem menos chance de ser o aparelho que ele usa hoje.
  let cortadas = 0;
  try {
    const r = await c.query(
      `delete from radar_chaves
        where id in (
          select id from radar_chaves
           where user_key=$1
           order by coalesce(usado_em, criado_em) desc
          offset $2)`, [dono, MAX_CHAVES]);
    cortadas = r.rowCount || 0;
  } catch (_) {}

  const n = await c.query(`select count(*)::int as n from radar_chaves where user_key=$1`, [dono]);
  return { ok: true, chave: segredo, cortadas, aparelhos: (n.rows[0] && n.rows[0].n) || 1 };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFERIR — o coração da trava. Responde uma pergunta só:
//   "quem está batendo pode mesmo mexer nos dados de `user`?"
//
// A ORDEM DAS DECISÕES IMPORTA E NÃO PODE SER TROCADA:
//
// 1) Chave apresentada que é de OUTRA PESSOA  ->  NÃO, sempre, fim.
//    Nunca cai na tolerância, nunca tem jeitinho. É exatamente isto que o
//    banco de provas (scripts/_provar-trava-pessoa.mjs) mede: a chave do
//    pastor A não abre o caderno do pastor B.
//
// 2) Chave certa  ->  SIM, e carimba o uso.
//
// 3) Sem chave (ou chave que não existe mais), e a pessoa JÁ TEM chave ->  NÃO.
//    Quem já foi trancado fica trancado. É isto que fecha o buraco de verdade.
//
// 4) Sem chave e a pessoa NÃO TEM chave nenhuma  ->  o período de tolerância:
//    · NÃO ESTÁ NO CADASTRO (id de aparelho, ou número que ninguém registrou):
//      emite na hora e devolve. Id de aparelho é sorteado, ninguém adivinha —
//      então adotar o primeiro que aparece é seguro, e é o que mantém vivo o
//      caderno de quem nunca se cadastrou. Ver `estaNoCadastro` lá em cima.
//    · PESSOA DO CADASTRO: passa enquanto a tolerância durar, pedindo `renove`. O app
//      refaz o cadastro sozinho, ganha a chave e a conta se tranca. Não emito
//      chave de telefone aqui de propósito: telefone é adivinhável, e emitir
//      pra quem chega primeiro entregaria a conta ao ladrão de bandeja.
//      Quem emite chave de telefone é o cadastro — que avisa no WhatsApp DELE.
// ─────────────────────────────────────────────────────────────────────────────
async function conferir(c, user, chaveBruta) {
  const dono = chaveDe(user);
  if (!dono) return { ok: false, motivo: 'sem_dono' };
  await tabela(c);

  const segredo = segredoLimpo(chaveBruta);

  if (segredo) {
    const r = await c.query(
      `select id, user_key from radar_chaves where chave_hash=$1 limit 1`, [sha(segredo)]);
    const linha = r.rows[0];
    if (linha) {
      // ── (1) A PROVA: crachá de outro dono não abre porta nenhuma ──────────
      if (linha.user_key !== dono) {
        return { ok: false, motivo: 'chave_de_outro' };
      }
      // ── (2) crachá certo ──────────────────────────────────────────────────
      try { await c.query(`update radar_chaves set usado_em=now() where id=$1`, [linha.id]); } catch (_) {}
      return { ok: true, dono: true, legado: false };
    }
    // chave com a cara certa mas que não existe (aparelho antigo, conta
    // apagada): cai no mesmo caminho de quem não mandou chave. Não é erro.
  }

  const n = await c.query(`select count(*)::int as n from radar_chaves where user_key=$1`, [dono]);
  const quantas = (n.rows[0] && n.rows[0].n) || 0;

  // ── (3) já tem dono, e não é quem está batendo ────────────────────────────
  if (quantas > 0) {
    return { ok: false, motivo: segredo ? 'chave_desconhecida' : 'chave_exigida' };
  }

  // ── (4) tolerância ────────────────────────────────────────────────────────
  if (!(await estaNoCadastro(c, dono))) {
    const e = await emitir(c, dono, 'aparelho');
    if (e.ok) return { ok: true, dono: true, legado: false, adotado: true, chave_nova: e.chave };
    return { ok: true, dono: false, legado: true, renove: true };   // falhou emitir: não trava ninguém
  }
  if (dentroDaTolerancia()) {
    return { ok: true, dono: false, legado: true, renove: true, tolerancia_ate: toleranciaAte() };
  }
  return { ok: false, motivo: 'tolerancia_encerrada', tolerancia_ate: toleranciaAte() };
}

// ─────────────────────────────────────────────────────────────────────────────
// A PORTA HTTP — só pra quem não tem `pg` (o /api/voz, que roda no Edge).
// Protegida pelo RADAR_ADMIN_TOKEN, igual a fn=memoria. Sem CORS.
// ─────────────────────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(405).end(); return; }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  if (Buffer.isBuffer(b)) { try { b = JSON.parse(b.toString('utf8')); } catch (_) { b = {}; } }
  b = b || {};
  const q = req.query || {};

  const ADM = process.env.RADAR_ADMIN_TOKEN;
  const veio = b.token || q.token;
  if (!ADM || veio !== ADM) { res.status(403).json({ ok: false, motivo: 'token' }); return; }

  const cs = process.env.RADAR_DB;
  if (!cs) { res.status(200).json({ ok: false, motivo: 'db_fora' }); return; }

  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    const acao = String(b.acao || q.acao || 'conferir');
    const user = b.user || b.user_key || q.user || '';

    if (acao === 'conferir') {
      res.status(200).json(await conferir(c, user, b.chave || q.chave || ''));
      return;
    }
    if (acao === 'emitir') {
      res.status(200).json(await emitir(c, user, b.apelido));
      return;
    }
    res.status(400).json({ ok: false, motivo: 'ação desconhecida: ' + acao });
  } catch (e) {
    // Banco fora NÃO pode virar porta aberta. Diz que não deu, e quem chamou
    // degrada: o globo conversa sem memória, o caderno aparece vazio. Chato,
    // honesto, e não entrega dado de ninguém.
    res.status(200).json({ ok: false, motivo: 'erro', err: String((e && e.message) || e).slice(0, 160) });
  } finally { try { await c.end(); } catch (_) {} }
};

module.exports.conferir = conferir;
module.exports.emitir = emitir;
module.exports.tabela = tabela;
module.exports.daRequisicao = daRequisicao;
module.exports.segredoLimpo = segredoLimpo;
module.exports.novoSegredo = novoSegredo;
module.exports.chaveDe = chaveDe;
module.exports.pareceTelefone = pareceTelefone;
module.exports.estaNoCadastro = estaNoCadastro;
module.exports.sha = sha;
module.exports.toleranciaAte = toleranciaAte;
module.exports.dentroDaTolerancia = dentroDaTolerancia;
module.exports.MAX_CHAVES = MAX_CHAVES;
