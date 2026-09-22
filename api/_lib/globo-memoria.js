// ═══════════════════════════════════════════════════════════════════════════════
// A MEMÓRIA DO GLOBO — o armazém. Burro de propósito.
// URL interna: POST /api/dados?fn=memoria   (registrado em api/dados.js)
//
// POR QUE ESTE ARQUIVO EXISTE, E POR QUE ELE NÃO PENSA NADA:
// O globo fala pelo /api/voz, que roda no EDGE. Edge não tem `pg`. Então o mesmo
// desenho que o motor da biblioteca já usa vale aqui: quem guarda mora em
// api/_lib/ e entra pelo roteador api/dados.js (Node, com pg); quem DECIDE
// (resumir, peneirar segredo, montar o bloco do prompt) mora em
// api/_lib/voz-memoria.js, do lado do Edge. Este arquivo só escreve e lê.
//
// ⚠️ POR QUE ELE EXIGE O RADAR_ADMIN_TOKEN:
// aqui dentro está o que o pastor conversou. Sem trava, qualquer um leria a
// memória de qualquer pessoa digitando um telefone na barra de endereço. Quem
// chama é sempre servidor-pra-servidor (/api/voz), com o token vindo do env.
// Sem CORS, de propósito: NINGUÉM deve chamar isto do navegador.
//
// ⚠️ O QUE **NÃO** ENTRA AQUI (o Elias foi explícito):
// nome de membro, segredo de aconselhamento, telefone, e-mail, valor, endereço.
// A peneira que decide isso é `semSegredo()`, em voz-memoria.js, e ela roda
// ANTES de qualquer coisa chegar neste arquivo. Aqui só há um último corte de
// tamanho — cinto e suspensório, não substituto.
//
// ⚠️ O BANCO ESTÁ APERTADO: 1.074 MB de 1.100 MB de freio. Por isso a memória é
// UMA tabela nova, minúscula, com teto por pessoa (80 temas, resumo de 1.400
// caracteres). Cheio, isso dá ~15 KB por pastor. Nada existente foi tocado.
// ═══════════════════════════════════════════════════════════════════════════════
const { Client } = require('pg');

// ─── tetos. Existem pra que a memória NUNCA cresça sem fim ───────────────────
const MAX_TEMAS    = 80;    // por pessoa. Passou disso, o mais velho sai.
const MAX_RESUMO   = 1400;  // o resumo rolante da conversa
const MAX_RASCUNHO = 4000;  // o que ainda não virou resumo
const MAX_PENDENTE = 240;   // o assunto deixado pela metade
const MAX_TEMA     = 120;
const MAX_PERGUNTA = 220;
const MAX_REF      = 60;

function corta(v, n) {
  return (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim().slice(0, n);
}
function chaveDe(v) {
  const d = (v == null ? '' : String(v)).replace(/\D/g, '');
  // telefone vira só dígitos (mesmo padrão de leitura_progresso e radar_uso);
  // aparelho sem cadastro manda um id anônimo tipo "ap_k3f9..." e ele fica assim.
  return (d.length >= 8 ? d : (v == null ? '' : String(v)).trim().toLowerCase()).slice(0, 60);
}

// A chave de busca dos temas: sem acento, minúscula, só palavra. É o que permite
// achar "escada de Jacó" procurando por "escada jaco" sem depender de vetor
// nenhum — tema é frase curta, e pra frase curta palavra basta. (Vetor aqui
// custaria uma chamada de rede por pergunta e uma cota que não sobra.)
function normalizar(s) {
  return (s == null ? '' : String(s))
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// A DDL roda UMA VEZ por instância quente, não a cada requisição.
// `create table if not exists` + `alter table` + dois `create index` são quatro
// idas ao banco que quase sempre não fazem nada — e o globo chama isto a cada
// versículo que ele abre. Instância nova confere de novo, que é o certo: quem
// garante o formato é o banco, não a nossa lembrança.
let pronta = false;

async function tabela(c) {
  if (pronta) return;
  await c.query(`create table if not exists globo_memoria(
    id bigserial primary key,
    user_key text not null default '',
    tipo text not null,
    sessao text default '',
    resumo text default '',
    pendente text default '',
    rascunho text default '',
    tema text default '',
    pergunta text default '',
    ref text default '',
    busca text default '',
    vezes int default 1,
    criado_em timestamptz default now(),
    atualizado_em timestamptz default now()
  )`);
  // QUANDO ele foi cortado. Tem que ser uma data PRÓPRIA, separada do
  // atualizado_em da linha: sem ela, "você ficou devendo aquilo" volta pra
  // sempre, e o mestre que repete a mesma dívida na terceira conversa parece
  // disco arranhado. Com ela, o assunto pela metade vale 48 horas e depois
  // some sozinho. `if not exists` porque a tabela já pode ter nascido sem.
  try { await c.query(`alter table globo_memoria add column if not exists pendente_em timestamptz`); } catch (_) {}
  // Uma linha 'sessao' por pessoa — é o "de onde paramos". O índice único é o
  // que faz o upsert ser upsert, e não uma pilha de resumos velhos.
  try {
    await c.query(`create unique index if not exists globo_memoria_sessao
                   on globo_memoria(user_key) where tipo='sessao'`);
  } catch (_) {}
  try {
    await c.query(`create index if not exists globo_memoria_temas
                   on globo_memoria(user_key, atualizado_em desc) where tipo='tema'`);
  } catch (_) {}
  pronta = true;
}

function linhaTema(r) {
  return {
    tema: r.tema || '',
    pergunta: r.pergunta || '',
    ref: r.ref || '',
    vezes: Number(r.vezes || 1),
    quando: r.atualizado_em,
  };
}

// ─── ler: o que o globo sabe deste pastor ────────────────────────────────────
async function ler(c, chave, quantos) {
  const s = await c.query(
    `select sessao, resumo, pendente, rascunho, atualizado_em, pendente_em
       from globo_memoria where user_key=$1 and tipo='sessao' limit 1`, [chave]);
  const t = await c.query(
    `select tema, pergunta, ref, vezes, atualizado_em
       from globo_memoria where user_key=$1 and tipo='tema'
      order by atualizado_em desc limit $2`, [chave, Math.min(quantos || 12, 40)]);
  const ses = s.rows[0] || null;
  return {
    ok: true,
    lembro: !!(ses && (ses.resumo || ses.pendente)) || !!t.rowCount,
    sessao: ses ? (ses.sessao || '') : '',
    resumo: ses ? (ses.resumo || '') : '',
    pendente: ses ? (ses.pendente || '') : '',
    pendente_em: ses ? (ses.pendente_em || null) : null,
    rascunho: ses ? (ses.rascunho || '') : '',
    atualizado_em: ses ? ses.atualizado_em : null,
    temas: t.rows.map(linhaTema),
  };
}

// ─── buscar por assunto, sem vetor ───────────────────────────────────────────
// Placar simples: cada palavra da pergunta que aparece no tema vale ponto, e
// palavra que aparece no tema E na pergunta guardada vale um pouco mais. É
// grosseiro e é suficiente: o universo é de 80 frases curtas por pessoa.
async function buscar(c, chave, q, quantos) {
  const palavras = normalizar(q).split(' ').filter((w) => w.length >= 4).slice(0, 8);
  const t = await c.query(
    `select tema, pergunta, ref, vezes, atualizado_em, busca
       from globo_memoria where user_key=$1 and tipo='tema'
      order by atualizado_em desc limit 200`, [chave]);
  if (!palavras.length) return { ok: true, itens: t.rows.slice(0, quantos).map(linhaTema) };

  const postos = t.rows.map((r) => {
    const b = ' ' + (r.busca || '') + ' ';
    let p = 0;
    for (const w of palavras) if (b.indexOf(w) >= 0) p++;
    return { r, p };
  }).filter((x) => x.p > 0).sort((a, b) => b.p - a.p);

  return { ok: true, itens: postos.slice(0, Math.min(quantos || 8, 20)).map((x) => linhaTema(x.r)) };
}

// ─── gravar tema ─────────────────────────────────────────────────────────────
// Não duplica: perguntar duas vezes sobre a escada de Jacó não vira dois temas,
// vira um tema com vezes=2. É isso que deixa o globo dizer "você volta nesse
// assunto" em vez de repetir a mesma linha oito vezes.
async function gravarTemas(c, chave, itens) {
  let n = 0;
  for (const it of (itens || []).slice(0, 12)) {
    const tema = corta(it.tema, MAX_TEMA);
    if (tema.length < 3) continue;
    // A CHAVE DO TEMA VEM NA FRENTE, com uma barra depois. Parece detalhe e não
    // é: sem a barra, "daniel 12 4" também era prefixo de "daniel 12 4 daniel
    // 12 4" (a busca repetia o tema) e o mesmo assunto entrava duas vezes em
    // vez de virar vezes=2. Peguei isso na primeira prova contra o banco.
    // `normalizar` só deixa passar letra, número e espaço — então nada de % nem
    // _ chega no LIKE. A barra é o único caractere de fora, posto por nós.
    const chaveTema = normalizar(tema).slice(0, 110);
    const busca = (chaveTema + ' | ' + normalizar((it.pergunta || '') + ' ' + (it.ref || ''))).slice(0, 300);
    const ja = await c.query(
      `select id, pergunta, ref from globo_memoria
        where user_key=$1 and tipo='tema' and busca like $2 limit 1`, [chave, chaveTema + ' |%']);
    if (ja.rowCount) {
      await c.query(
        `update globo_memoria
            set vezes=vezes+1, atualizado_em=now(),
                pergunta=coalesce(nullif($2,''), pergunta),
                ref=coalesce(nullif($3,''), ref)
          where id=$1`,
        [ja.rows[0].id, corta(it.pergunta, MAX_PERGUNTA), corta(it.ref, MAX_REF)]);
    } else {
      await c.query(
        `insert into globo_memoria(user_key, tipo, tema, pergunta, ref, busca)
         values($1,'tema',$2,$3,$4,$5)`,
        [chave, tema, corta(it.pergunta, MAX_PERGUNTA), corta(it.ref, MAX_REF), busca]);
    }
    n++;
  }
  // o teto por pessoa. Memória que cresce sem freio é banco estourado — e este
  // banco está a 26 MB do freio.
  if (n) {
    await c.query(
      `delete from globo_memoria where id in (
         select id from globo_memoria where user_key=$1 and tipo='tema'
          order by atualizado_em desc offset $2)`, [chave, MAX_TEMAS]);
  }
  return { ok: true, gravados: n };
}

// ─── gravar/atualizar a sessão (o "de onde paramos") ─────────────────────────
// Campo ausente no pedido NÃO é apagado: quem manda só o pendente não perde o
// resumo. Pra apagar de propósito manda string vazia explícita (null_* abaixo).
async function gravarSessao(c, chave, b) {
  const campos = {
    sessao:   b.sessao   === undefined ? null : corta(b.sessao, 60),
    resumo:   b.resumo   === undefined ? null : corta(b.resumo, MAX_RESUMO),
    pendente: b.pendente === undefined ? null : corta(b.pendente, MAX_PENDENTE),
    rascunho: b.rascunho === undefined ? null : corta(b.rascunho, MAX_RASCUNHO),
  };
  await c.query(
    `insert into globo_memoria(user_key, tipo, sessao, resumo, pendente, rascunho, pendente_em)
     values($1,'sessao',coalesce($2,''),coalesce($3,''),coalesce($4,''),coalesce($5,''),
            case when coalesce($4,'')='' then null else now() end)
     on conflict (user_key) where tipo='sessao' do update set
       sessao   = coalesce($2, globo_memoria.sessao),
       resumo   = coalesce($3, globo_memoria.resumo),
       pendente = coalesce($4, globo_memoria.pendente),
       rascunho = coalesce($5, globo_memoria.rascunho),
       -- a data do corte só se mexe quando o pendente mexe: campo ausente no
       -- pedido não pode ressuscitar uma dívida velha nem apagar uma nova.
       pendente_em = case when $4 is null then globo_memoria.pendente_em
                          when $4 = ''    then null
                          else now() end,
       atualizado_em = now()`,
    [chave, campos.sessao, campos.resumo, campos.pendente, campos.rascunho]);
  return { ok: true, salvo: true };
}

module.exports = async (req, res) => {
  // Sem CORS de propósito — ver o cabeçalho. Quem chama é o /api/voz.
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(405).end(); return; }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  if (Buffer.isBuffer(b)) { try { b = JSON.parse(b.toString('utf8')); } catch (_) { b = {}; } }
  b = b || {};
  const q = req.query || {};

  const ADM = process.env.RADAR_ADMIN_TOKEN;
  const veio = b.token || q.token;
  if (!ADM || veio !== ADM) { res.status(403).json({ ok: false, err: 'token' }); return; }

  const chave = chaveDe(b.user != null ? b.user : q.user);
  if (!chave) { res.status(200).json({ ok: true, lembro: false, sem_dono: true, temas: [] }); return; }

  const cs = process.env.RADAR_DB;
  // SEM BANCO A MEMÓRIA SIMPLESMENTE NÃO EXISTE — e isso é dito, não escondido.
  // O globo prefere dizer "não lembro" a fingir que lembra.
  if (!cs) { res.status(200).json({ ok: true, lembro: false, off: true, temas: [] }); return; }

  const acao = String(b.acao || q.acao || 'ler');
  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    await tabela(c);

    if (acao === 'ler')     { res.status(200).json(await ler(c, chave, b.n || q.n)); return; }
    if (acao === 'buscar')  { res.status(200).json(await buscar(c, chave, b.q || q.q || '', b.n || 8)); return; }
    if (acao === 'temas')   { res.status(200).json(await gravarTemas(c, chave, b.itens)); return; }
    if (acao === 'sessao')  { res.status(200).json(await gravarSessao(c, chave, b)); return; }
    // ESQUECER É DIREITO DO DONO. Se o pastor quiser apagar o que o globo sabe
    // dele, apaga — inteiro, sem sobra, sem lixeira.
    if (acao === 'esquecer') {
      const d = await c.query(`delete from globo_memoria where user_key=$1`, [chave]);
      res.status(200).json({ ok: true, apagados: d.rowCount });
      return;
    }
    res.status(400).json({ ok: false, err: 'ação desconhecida: ' + acao });
  } catch (e) {
    // Igual ao fn=uso: erro de banco NUNCA derruba a conversa do pastor. A
    // memória some, a conversa continua, e o globo passa a dizer que não lembra.
    res.status(200).json({ ok: true, lembro: false, temas: [], salvo: false,
      err: String((e && e.message) || e).slice(0, 160) });
  } finally { try { await c.end(); } catch (_) {} }
};

// Exportados para o banco de provas poder bater na peneira de chave e na
// normalização sem subir banco nenhum.
module.exports.chaveDe = chaveDe;
module.exports.normalizar = normalizar;
