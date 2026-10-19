// ═══════════════════════════════════════════════════════════════════════════════
// O CADERNO DE APRENDIZADO DO GLOBO — o armazém. Burro de propósito, igual ao da memória.
// URL interna: POST /api/dados?fn=aprendizado   (registrado em api/dados.js)
//
// POR QUE EXISTE (18/10/2026, pedido do Elias: "como fazer pra ele aprender com cada
// pergunta e se atualizar"). O modelo de voz não se re-treina sozinho — nenhum se
// re-treina no meio da conversa. Então o aprendizado é um CICLO, e este é o caderno dele:
//   • LACUNA   — pergunta em que a biblioteca/acervo não achou apoio. A lista diz qual
//                livro falta. É global (o livro que falta falta pra todos) e não guarda dono.
//   • CORRECAO — o pastor disse "isso está errado, o certo é…". Vira nota que o globo lê
//                ANTES de responder da próxima vez (entra no prompt da sessão e no
//                pensar_a_fundo). Abaixo da Escritura, acima dos comentaristas.
//   • APROVADA — "essa foi boa, guarda": a resposta boa fica como modelo pro mesmo assunto.
//   • ENSINO   — "guarda isso: …": algo que ele quer que o globo saiba dali pra frente.
//
// ⚠️ POR CONTA DE QUEM: correção/aprovada/ensino ficam presas à CHAVE DE QUEM ENSINOU, e só
// quem provou ser o dono (crachá conferido em voz.js) grava ou lê. Sem isso, quem soubesse
// um telefone plantaria "correções" na voz de outra pessoa. Nada de identidade do Elias
// escrita no código (o repositório é público).
//
// ⚠️ TABELA PRÓPRIA, de propósito: "esquece tudo" (acao 'esquecer' da memória) apaga a
// CONVERSA, não o que o pastor ensinou de caso pensado. Pra tirar um ensino, existe a ação
// 'apagar' aqui (o globo chama pela ferramenta ensinos_do_pastor com apagar:true).
//
// Quem peneira segredo (nome de membro, aconselhamento) é semSegredo(), no Edge, ANTES de
// chegar aqui. Aqui só há corte de tamanho e teto de linhas — cinto e suspensório.
// ═══════════════════════════════════════════════════════════════════════════════
const { Client } = require('pg');
const { chaveDe, normalizar } = require('./globo-memoria.js');

const TIPOS_DO_PASTOR = ['correcao', 'aprovada', 'ensino'];
const TETO = { lacuna: 400, correcao: 200, aprovada: 200, ensino: 200 };   // linhas por dono (lacuna: no total)
const MAX_ASSUNTO = 200;
const MAX_CONTEUDO = 1500;

function corta(v, n) { return (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim().slice(0, n); }

let pronta = false;
async function tabela(c) {
  if (pronta) return;
  await c.query(`create table if not exists globo_aprendizado(
    id bigserial primary key,
    user_key text not null default '',
    tipo text not null,
    assunto text not null default '',
    conteudo text not null default '',
    ferramenta text not null default '',
    chave text not null default '',
    vezes int not null default 1,
    criado_em timestamptz default now(),
    atualizado_em timestamptz default now()
  )`);
  // Unicidade quem garante é o banco (a lição da corrida do "Salmos 23:4" em globo-memoria.js):
  // a mesma lacuna perguntada cinco vezes vira UMA linha com vezes=5.
  try {
    await c.query(`create unique index if not exists globo_aprendizado_unico
                   on globo_aprendizado(user_key, tipo, chave)`);
  } catch (_) {}
  pronta = true;
}

const linha = (r) => ({ id: Number(r.id), tipo: r.tipo, assunto: r.assunto, conteudo: r.conteudo,
  ferramenta: r.ferramenta || '', vezes: Number(r.vezes || 1), quando: r.atualizado_em });

async function gravar(c, dono, tipo, assunto, conteudo, ferramenta) {
  const a = corta(assunto, MAX_ASSUNTO);
  const chave = normalizar(a).slice(0, 160);
  if (chave.length < 3) return { ok: false, err: 'assunto vazio' };
  await c.query(
    `insert into globo_aprendizado(user_key, tipo, assunto, conteudo, ferramenta, chave)
     values($1,$2,$3,$4,$5,$6)
     on conflict (user_key, tipo, chave) do update set
       vezes = globo_aprendizado.vezes + 1,
       atualizado_em = now(),
       conteudo = coalesce(nullif(excluded.conteudo,''), globo_aprendizado.conteudo),
       ferramenta = coalesce(nullif(excluded.ferramenta,''), globo_aprendizado.ferramenta)`,
    [dono, tipo, a, corta(conteudo, MAX_CONTEUDO), corta(ferramenta, 40), chave]);
  await c.query(
    `delete from globo_aprendizado where id in (
       select id from globo_aprendizado where user_key=$1 and tipo=$2
        order by atualizado_em desc offset $3)`, [dono, tipo, TETO[tipo] || 200]);
  return { ok: true, gravado: true };
}

// Busca por palavra (sem vetor): o universo é de algumas centenas de frases por pessoa.
async function buscar(c, dono, q, n) {
  const palavras = normalizar(q).split(' ').filter((w) => w.length >= 4).slice(0, 10);
  const r = await c.query(
    `select id, tipo, assunto, conteudo, ferramenta, vezes, atualizado_em, chave from globo_aprendizado
      where user_key=$1 and tipo = any($2::text[]) order by atualizado_em desc limit 400`,
    [dono, TIPOS_DO_PASTOR]);
  if (!palavras.length) return r.rows.slice(0, n).map(linha);
  return r.rows.map((x) => {
    const alvo = ' ' + x.chave + ' ' + normalizar(x.conteudo).slice(0, 600) + ' ';
    let p = 0;
    for (const w of palavras) if (alvo.indexOf(w) >= 0) p += x.chave.indexOf(w) >= 0 ? 2 : 1;
    return { x, p };
  }).filter((y) => y.p >= 2).sort((a, b) => b.p - a.p).slice(0, n).map((y) => linha(y.x));
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(405).end(); return; }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  if (Buffer.isBuffer(b)) { try { b = JSON.parse(b.toString('utf8')); } catch (_) { b = {}; } }
  b = b || {};

  const ADM = process.env.RADAR_ADMIN_TOKEN;
  if (!ADM || b.token !== ADM) { res.status(403).json({ ok: false, err: 'token' }); return; }
  const cs = (process.env.RADAR_DB_DATABASE_URL || process.env.RADAR_DB);
  if (!cs) { res.status(200).json({ ok: true, off: true, itens: [] }); return; }

  const acao = String(b.acao || '');
  const dono = chaveDe(b.user);
  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    await tabela(c);

    // LACUNA: global (user_key ''), sem dono — o livro que falta falta pra todos.
    if (acao === 'lacuna') {
      res.status(200).json(await gravar(c, '', 'lacuna', b.assunto, b.conteudo || '', b.ferramenta));
      return;
    }
    // A LISTA DAS LACUNAS — pra o Elias e eu vermos o que falta comprar/indexar.
    if (acao === 'lacunas') {
      const r = await c.query(
        `select id, tipo, assunto, conteudo, ferramenta, vezes, atualizado_em from globo_aprendizado
          where user_key='' and tipo='lacuna' order by vezes desc, atualizado_em desc limit $1`,
        [Math.min(Number(b.n) || 60, 400)]);
      res.status(200).json({ ok: true, itens: r.rows.map(linha) });
      return;
    }
    if (acao === 'resolver_lacuna') {
      const d = await c.query(`delete from globo_aprendizado where user_key='' and tipo='lacuna' and id=$1`, [Number(b.id) || 0]);
      res.status(200).json({ ok: true, apagados: d.rowCount });
      return;
    }

    // Daqui pra baixo é coisa DO PASTOR: sem dono, nada.
    if (!dono) { res.status(200).json({ ok: true, sem_dono: true, itens: [] }); return; }

    if (acao === 'ensinar') {
      const tipo = TIPOS_DO_PASTOR.includes(b.tipo) ? b.tipo : 'ensino';
      if (corta(b.conteudo, 10).length < 3) { res.status(200).json({ ok: false, err: 'conteúdo vazio' }); return; }
      res.status(200).json(await gravar(c, dono, tipo, b.assunto, b.conteudo, b.ferramenta));
      return;
    }
    if (acao === 'ler') {
      const r = await c.query(
        `select id, tipo, assunto, conteudo, ferramenta, vezes, atualizado_em from globo_aprendizado
          where user_key=$1 and tipo = any($2::text[])
          order by (tipo='correcao') desc, atualizado_em desc limit $3`,
        [dono, TIPOS_DO_PASTOR, Math.min(Number(b.n) || 12, 40)]);
      res.status(200).json({ ok: true, itens: r.rows.map(linha) });
      return;
    }
    if (acao === 'buscar') {
      res.status(200).json({ ok: true, itens: await buscar(c, dono, b.q || '', Math.min(Number(b.n) || 5, 12)) });
      return;
    }
    if (acao === 'apagar') {
      // Apaga o(s) ensino(s) DELE que casam com o assunto. Nunca o de outra pessoa.
      const achados = await buscar(c, dono, b.assunto || '', 3);
      if (!achados.length) { res.status(200).json({ ok: true, apagados: 0 }); return; }
      const d = await c.query(`delete from globo_aprendizado where user_key=$1 and id = any($2::bigint[])`,
        [dono, achados.map((x) => x.id)]);
      res.status(200).json({ ok: true, apagados: d.rowCount, assuntos: achados.map((x) => x.assunto) });
      return;
    }
    res.status(400).json({ ok: false, err: 'ação desconhecida: ' + acao });
  } catch (e) {
    // Erro de banco nunca derruba a conversa: o globo só fica sem caderno e diz isso.
    res.status(200).json({ ok: false, itens: [], err: String((e && e.message) || e).slice(0, 160) });
  } finally { try { await c.end(); } catch (_) {} }
};
