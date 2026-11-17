// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE RLS / AUTORIZAÇÃO — CONEXÃO JOVEM
// Rodados por testes/rodar.sh contra um Postgres LOCAL descartável.
// Cada teste roda numa transação que é desfeita no fim (um não contamina o outro).
// "Como fulano" = set local role authenticated + request.jwt.claims {sub: fulano},
// exatamente o que o Supabase (PostgREST) e a função proposta fazem.
// ═══════════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const RAIZ = path.resolve(__dirname, '..');
const MIGRACAO = path.join(RAIZ, 'supabase/migrations/001_conexao_jovem.sql');
const MIGRACAO_2 = path.join(RAIZ, 'supabase/migrations/002_gestao_pessoas.sql');
const SEED = path.join(RAIZ, 'supabase/seed_demo.sql');
const MINIMO = path.join(__dirname, '00_supabase_minimo.sql');

if (!process.env.CJ_PGHOST || !process.env.CJ_PGPORT) {
  console.error('Rode pelo testes/rodar.sh (ele sobe o Postgres local descartável).');
  process.exit(2);
}
const CONEXAO = { host: process.env.CJ_PGHOST, port: Number(process.env.CJ_PGPORT), user: 'postgres', database: 'cj_teste' };

// ─── pessoas do seed (fictícias) ───────────────────────────────────────────────
const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const P = {
  pastor: id(1), coord: id(2), protecao: id(3), rafael: id(4), camila: id(5), marcos: id(6),
  davi: id(7), ana: id(8), lucas: id(9), bruno: id(10), bia: id(11), theo: id(12), novo: id(13)
};
const C = { esperanca: id(101), renovo: id(102), caminho: id(103) };
const E = { quinta: id(201), futebol: id(202), encontroEsp: id(203), vagaUnica: id(204), rascunho: id(205) };
const POST = { anaEsp: id(601), avisoEsp: id(602), lucasGeral: id(603), lucasCaminho: id(604), daviPendente: id(605) };
const ORACAO = { davi: id(701), ana: id(702), lucas: id(703) };
const CONVERSA = { davi: id(801), bia: id(802) };
const CONSENT = { bia: id(901), theo: id(902) };
const DENUNCIA = id(851);

// ─── mini-executor de testes ──────────────────────────────────────────────────
const testes = [];
const teste = (nome, fn) => testes.push({ nome, fn });
class Falha extends Error {}
function espera(cond, msg) { if (!cond) throw new Falha(msg); }
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Falha(`${msg} (esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)})`); }

let db;

// Contexto de um teste: helpers para trocar de pessoa dentro da mesma transação.
function contexto() {
  let sp = 0;
  const ctx = {
    async como(uid) {
      await db.query('reset role');
      await db.query("select set_config('request.jwt.claims', $1, true)", [uid ? JSON.stringify({ sub: uid, role: 'authenticated' }) : '']);
      await db.query(uid ? 'set local role authenticated' : 'set local role anon');
    },
    async comoDono() { await db.query('reset role'); await db.query("select set_config('request.jwt.claims', '', true)"); },
    q: async (sql, p) => (await db.query(sql, p)).rows,
    um: async (sql, p) => (await db.query(sql, p)).rows[0],
    n: async (sql, p) => Number(Object.values((await db.query(sql, p)).rows[0])[0]),
    // espera que a instrução FALHE (com o código SQLSTATE, se dado), sem abortar a transação
    async falha(sql, p, codigo, msg) {
      const nome = 'sp' + (++sp);
      await db.query('savepoint ' + nome);
      try {
        await db.query(sql, p);
      } catch (e) {
        await db.query('rollback to savepoint ' + nome);
        if (codigo && e.code !== codigo) throw new Falha(`${msg}: falhou com ${e.code} (${e.message}), esperado ${codigo}`);
        return e;
      }
      await db.query('release savepoint ' + nome);
      throw new Falha(msg + ': deveria ter sido recusado, mas passou');
    }
  };
  return ctx;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. VISITANTE SEM LOGIN (anon)
// ═══════════════════════════════════════════════════════════════════════════════
teste('anon não lê nenhuma tabela do schema cj', async (t) => {
  await t.como(null);
  for (const tab of ['profiles', 'prayer_requests', 'conversation_requests', 'content_posts', 'events', 'devotionals',
                     'circles', 'audit_logs', 'guardian_consents', 'reports']) {
    await t.falha(`select * from cj.${tab}`, [], '42501', `anon lendo cj.${tab}`);
  }
});
teste('anon não executa funções (nem as de leitura auditada)', async (t) => {
  await t.como(null);
  await t.falha('select * from cj.ler_pedidos_oracao()', [], '42501', 'anon chamando ler_pedidos_oracao');
  await t.falha('select cj.painel_indicadores()', [], '42501', 'anon chamando painel');
});
teste('anon não escreve', async (t) => {
  await t.como(null);
  await t.falha(`insert into cj.prayer_requests(owner_id, body) values ($1, 'teste')`, [P.davi], '42501', 'anon inserindo oração');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. PEDIDOS DE ORAÇÃO E CONVERSA (privados e auditáveis)
// ═══════════════════════════════════════════════════════════════════════════════
teste('membro vê só o próprio pedido de oração', async (t) => {
  await t.como(P.davi);
  const r = await t.q('select id, owner_id from cj.prayer_requests');
  igual(r.map((x) => x.id), [ORACAO.davi], 'Davi deveria ver só o pedido dele');
  igual(await t.n('select count(*) from cj.prayer_requests where id = $1', [ORACAO.ana]), 0, 'Davi não pode ver o pedido da Ana');
});
teste('membro não usa a leitura da equipe para ver pedidos dos outros', async (t) => {
  await t.como(P.davi);
  await t.falha('select * from cj.ler_pedidos_oracao()', [], '42501', 'membro chamando ler_pedidos_oracao');
});
teste('membro não cria pedido em nome de outra pessoa', async (t) => {
  await t.como(P.davi);
  await t.falha(`insert into cj.prayer_requests(owner_id, body) values ($1, 'forjado')`, [P.ana], '42501', 'Davi criando pedido como Ana');
});
teste('membro não altera status do próprio pedido diretamente (só a equipe, por função)', async (t) => {
  await t.como(P.davi);
  await t.falha(`update cj.prayer_requests set status = 'encerrado' where id = $1`, [ORACAO.davi], '42501', 'Davi alterando status');
});
teste('líder de círculo NÃO lê pedidos de oração (nem do próprio círculo)', async (t) => {
  await t.como(P.rafael);
  igual(await t.n('select count(*) from cj.prayer_requests'), 0, 'Rafael (líder) não deveria ver pedidos');
  await t.falha('select * from cj.ler_pedidos_oracao()', [], '42501', 'líder chamando ler_pedidos_oracao');
});
teste('pastor lê todos os pedidos pela função, e CADA leitura fica em audit_logs', async (t) => {
  await t.como(P.pastor);
  igual(await t.n('select count(*) from cj.prayer_requests'), 0, 'leitura direta da tabela continua fechada até para o pastor');
  const r = await t.q('select id from cj.ler_pedidos_oracao()');
  igual(r.length, 3, 'pastor deveria ver os 3 pedidos (inclusive o "somente_pastor")');
  const log = await t.q(`select entity_id from cj.audit_logs where actor_id = $1 and action = 'ler' and entity_type = 'prayer_requests'`, [P.pastor]);
  igual(log.map((x) => x.entity_id).sort(), [ORACAO.davi, ORACAO.ana, ORACAO.lucas].sort(), 'cada pedido lido deve gerar uma linha de auditoria');
  igual(await t.n(`select count(*) from cj.audit_logs where actor_id = $1 and action = 'consultar'`, [P.pastor]), 1, 'a consulta em si também é registrada');
});
teste('auditoria não guarda o texto do pedido', async (t) => {
  await t.como(P.pastor);
  await t.q('select id from cj.ler_pedidos_oracao()');
  await t.comoDono();
  igual(await t.n(`select count(*) from cj.audit_logs where metadata::text ilike '%fictício%' or metadata::text ilike '%família%'`), 0,
        'metadata não pode conter o conteúdo');
});
teste('coordenação (youth_admin) não vê pedido "somente_pastor"', async (t) => {
  await t.como(P.coord);
  const r = await t.q('select id from cj.ler_pedidos_oracao()');
  espera(!r.some((x) => x.id === ORACAO.ana), 'youth_admin viu um pedido somente_pastor');
  igual(r.length, 2, 'youth_admin deveria ver 2 pedidos (equipe_pastoral)');
});
teste('proteção (safeguarding) só vê pedido de oração ESCALADO, e o escalonamento é auditado', async (t) => {
  await t.como(P.protecao);
  igual((await t.q('select id from cj.ler_pedidos_oracao()')).length, 0, 'sem escalonamento, proteção não vê pedidos');
  await t.como(P.pastor);
  await t.q('select cj.escalar_para_protecao($1, $2)', ['oracao', ORACAO.davi]);
  await t.como(P.protecao);
  igual((await t.q('select id from cj.ler_pedidos_oracao()')).map((x) => x.id), [ORACAO.davi], 'proteção deveria ver só o escalado');
  igual(await t.n(`select count(*) from cj.audit_logs where entity_type = 'prayer_requests' and entity_id = $1 and action = 'update'
                    and metadata -> 'campos' ? 'escalated_to_safeguarding'`, [ORACAO.davi]), 1, 'escalonamento deveria estar na auditoria');
});
teste('pedido de conversa: membro vê só o seu; responsável designado vê o atribuído; tudo auditado', async (t) => {
  await t.como(P.davi);
  igual((await t.q('select id from cj.conversation_requests')).map((x) => x.id), [CONVERSA.davi], 'Davi deveria ver só a sua conversa');
  await t.como(P.rafael);
  igual((await t.q('select id from cj.ler_conversas()')).length, 0, 'líder sem atribuição não vê conversas');
  await t.como(P.coord);
  await t.q('select cj.atribuir_conversa($1, $2)', [CONVERSA.davi, P.rafael]);
  await t.como(P.rafael);
  igual((await t.q('select id from cj.ler_conversas()')).map((x) => x.id), [CONVERSA.davi], 'Rafael deveria ver a conversa atribuída a ele');
  await t.comoDono();
  igual(await t.n(`select count(*) from cj.audit_logs where actor_id = $1 and action = 'ler' and entity_id = $2`, [P.rafael, CONVERSA.davi]), 1,
        'leitura do responsável auditada');
});
teste('conversa não pode ser atribuída a quem não é da equipe de cuidado', async (t) => {
  await t.como(P.coord);
  await t.falha('select cj.atribuir_conversa($1, $2)', [CONVERSA.davi, P.ana], '23514', 'atribuir conversa a membro comum');
});
teste('prazo de retorno da conversa é calculado pelo servidor (o cliente não escolhe)', async (t) => {
  await t.como(P.ana);
  const r = await t.um(`insert into cj.conversation_requests(requester_id, category) values ($1, 'familia') returning status, response_due_at, assigned_to`, [P.ana]);
  igual(r.status, 'aberto', 'status inicial');
  espera(r.assigned_to === null, 'cliente não escolhe responsável');
  espera(new Date(r.response_due_at) > new Date(), 'prazo no futuro');
});
teste('proteção vê conversa de categoria "protecao" (da menor) pela função auditada', async (t) => {
  await t.como(P.protecao);
  igual((await t.q('select id from cj.ler_conversas()')).map((x) => x.id), [CONVERSA.bia], 'proteção deveria ver a conversa de proteção');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CÍRCULOS: líder só vê o próprio
// ═══════════════════════════════════════════════════════════════════════════════
teste('líder vê integrantes só do próprio círculo', async (t) => {
  await t.como(P.rafael);
  const r = await t.q('select distinct circle_id from cj.circle_members');
  igual(r.map((x) => x.circle_id), [C.esperanca], 'Rafael deveria ver só o Esperança');
  igual(await t.n('select count(*) from cj.circle_members where circle_id = $1', [C.caminho]), 0, 'Rafael não vê integrantes do Caminho');
});
teste('líder não vê posts, encontros nem perfis de outro círculo', async (t) => {
  await t.como(P.rafael);
  igual(await t.n('select count(*) from cj.content_posts where id = $1', [POST.lucasCaminho]), 0, 'post do Caminho');
  igual(await t.n('select count(*) from cj.circle_meetings where circle_id = $1', [C.caminho]), 0, 'encontro do Caminho');
  igual(await t.n('select count(*) from cj.profiles where id = $1', [P.lucas]), 0, 'perfil do Lucas (Caminho)');
  igual(await t.n('select count(*) from cj.profiles where id = $1', [P.davi]), 1, 'mas vê o Davi, do seu círculo');
});
teste('líder não modera post de outro círculo, mas modera no seu', async (t) => {
  await t.como(P.rafael);
  await t.falha(`select cj.moderar('post', $1, 'removido')`, [POST.lucasCaminho], '42501', 'Rafael moderando post do Caminho');
  await t.q(`select cj.moderar('post', $1, 'removido')`, [POST.anaEsp]);
  await t.comoDono();
  igual((await t.um('select moderation_status from cj.content_posts where id = $1', [POST.anaEsp])).moderation_status, 'removido', 'moderação no próprio círculo');
});
teste('líder não aceita integrante em círculo alheio', async (t) => {
  await t.como(P.rafael);
  await t.falha(`select cj.decidir_membro($1, $2, 'removido')`, [C.caminho, P.lucas], '42501', 'Rafael removendo Lucas do Caminho');
});
teste('líder vê o progresso da jornada só de quem é do seu círculo', async (t) => {
  await t.como(P.rafael);
  const r = await t.q('select distinct user_id from cj.journey_progress');
  igual(r.map((x) => x.user_id), [P.davi], 'Rafael deveria ver só o progresso do Davi');
});
teste('líder não vê participação/reflexão de missão (só totais pela gestão)', async (t) => {
  await t.como(P.rafael);
  igual(await t.n('select count(*) from cj.mission_participation'), 0, 'líder lendo mission_participation');
  await t.como(P.coord);
  igual(await t.n('select count(*) from cj.mission_participation'), 0, 'nem a coordenação lê reflexões');
  const r = await t.um(`select cj.resumo_missao($1) as r`, [id(501)]);
  igual(r.r, { aceitaram: 2, concluiram: 1 }, 'resumo agregado');
});
teste('membro vê colegas do próprio círculo, não os de outro', async (t) => {
  await t.como(P.davi);
  igual(await t.n('select count(*) from cj.profiles where id = $1', [P.ana]), 1, 'Davi vê a Ana (mesmo círculo)');
  igual(await t.n('select count(*) from cj.profiles where id = $1', [P.lucas]), 0, 'Davi não vê o Lucas');
  igual(await t.n('select count(*) from cj.profiles where id = $1', [P.rafael]), 1, 'Davi vê o seu líder');
});
teste('membro do círculo não vê pedidos de entrada de outras pessoas', async (t) => {
  await t.comoDono();
  await t.q(`insert into cj.circle_members(circle_id, user_id) values ($1, $2)`, [C.esperanca, P.novo]);
  await t.como(P.davi);
  igual(await t.n('select count(*) from cj.circle_members where user_id = $1', [P.novo]), 0, 'pedido "solicitado" de outro é invisível ao membro');
  await t.como(P.rafael);
  igual(await t.n('select count(*) from cj.circle_members where user_id = $1', [P.novo]), 1, 'mas o líder vê o pedido');
});
teste('círculos separados por faixa: adulto não entra em círculo de adolescentes', async (t) => {
  await t.como(P.davi);
  await t.falha('insert into cj.circle_members(circle_id, user_id) values ($1, $2)', [C.renovo, P.davi], null, 'Davi (18–21) no Renovo (15–17)');
});
teste('pedido de entrada no círculo sempre nasce "solicitado" (não dá para se autoaprovar)', async (t) => {
  await t.comoDono();
  await t.q(`delete from cj.circle_members where user_id = $1`, [P.ana]);
  await t.como(P.ana);
  await t.falha(`insert into cj.circle_members(circle_id, user_id, membership_status) values ($1, $2, 'ativo')`, [C.caminho, P.ana], '42501',
                'coluna membership_status não é liberada ao cliente');
  const r = await t.um('insert into cj.circle_members(circle_id, user_id) values ($1, $2) returning membership_status', [C.caminho, P.ana]);
  igual(r.membership_status, 'solicitado', 'status inicial');
});
teste('membro não altera o próprio status no círculo', async (t) => {
  await t.como(P.davi);
  await t.falha(`update cj.circle_members set membership_status = 'removido' where user_id = $1`, [P.davi], '42501', 'alterar status');
});
teste('faixa autodeclarada errada: gestão corrige, e o "menor" perde círculo adulto e recursos sociais', async (t) => {
  await t.como(P.davi);
  await t.falha(`select cj.definir_faixa($1, '15-17')`, [P.davi], '42501', 'membro mudando a própria faixa pela função');
  await t.como(P.coord);
  await t.q(`select cj.definir_faixa($1, '15-17')`, [P.davi]);
  await t.como(P.davi);
  igual(await t.n(`select count(*) from cj.circle_members where user_id = $1 and membership_status = 'ativo'`, [P.davi]), 0, 'saiu do círculo 18–21');
  await t.falha(`insert into cj.content_posts(author_id, body) values ($1, 'oi')`, [P.davi], '42501', 'agora precisa de consentimento');
});
teste('menor não pode ser líder de círculo', async (t) => {
  await t.como(P.pastor);
  await t.falha(`select cj.conceder_papel($1, 'circle_leader')`, [P.bia], '23514', 'papel de liderança para menor');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. MENORES E CONSENTIMENTO
// ═══════════════════════════════════════════════════════════════════════════════
teste('menor SEM consentimento aprovado não publica no mural', async (t) => {
  await t.como(P.theo);
  await t.falha(`insert into cj.content_posts(author_id, body) values ($1, 'oi')`, [P.theo], '42501', 'Theo publicando sem consentimento');
});
teste('menor SEM consentimento não comenta, não lê o mural e não entra em círculo', async (t) => {
  await t.como(P.theo);
  await t.falha(`insert into cj.content_comments(post_id, author_id, body) values ($1, $2, 'oi')`, [POST.lucasGeral, P.theo], '42501', 'Theo comentando');
  igual(await t.n('select count(*) from cj.content_posts'), 0, 'Theo não deveria ler o mural');
  await t.falha('insert into cj.circle_members(circle_id, user_id) values ($1, $2)', [C.renovo, P.theo], '42501', 'Theo pedindo círculo');
});
teste('menor SEM consentimento ainda pode pedir ajuda (oração, conversa) e denunciar', async (t) => {
  await t.como(P.theo);
  await t.q(`insert into cj.prayer_requests(owner_id, body) values ($1, 'pedido do Theo (teste)')`, [P.theo]);
  await t.q(`insert into cj.conversation_requests(requester_id, category) values ($1, 'outro')`, [P.theo]);
  await t.q(`insert into cj.reports(reporter_id, target_type, reason) values ($1, 'outro', 'risco_seguranca')`, [P.theo]);
});
teste('menor não aprova o próprio consentimento', async (t) => {
  await t.como(P.theo);
  await t.falha(`update cj.guardian_consents set status = 'aprovado' where minor_id = $1`, [P.theo], '42501', 'update direto');
  await t.falha(`select cj.decidir_consentimento($1, 'aprovado', 'presencial')`, [CONSENT.theo], '42501', 'função de decisão');
});
teste('pedido de consentimento nasce pendente mesmo se o cliente mandar "aprovado"', async (t) => {
  await t.comoDono();
  await t.q('delete from cj.guardian_consents where minor_id = $1', [P.theo]);
  await t.como(P.theo);
  await t.falha(`insert into cj.guardian_consents(minor_id, guardian_name, guardian_relationship, guardian_contact, policy_version, status)
                 values ($1, 'Resp Teste', 'pai', '00000000', 'v1', 'aprovado')`, [P.theo], '42501', 'coluna status não liberada');
  const r = await t.um(`insert into cj.guardian_consents(minor_id, guardian_name, guardian_relationship, guardian_contact, allow_social, policy_version)
                        values ($1, 'Resp Teste', 'pai', '00000000', true, 'v1') returning status`, [P.theo]);
  igual(r.status, 'pendente', 'status inicial');
});
teste('adulto não abre pedido de consentimento de menor', async (t) => {
  await t.como(P.davi);
  await t.falha(`insert into cj.guardian_consents(minor_id, guardian_name, guardian_relationship, guardian_contact, policy_version)
                 values ($1, 'Resp Teste', 'pai', '00000000', 'v1')`, [P.davi], '23514', 'adulto pedindo consentimento');
});
teste('depois que a equipe aprova o consentimento, o menor publica (e entra em moderação)', async (t) => {
  await t.como(P.coord);
  await t.q(`select cj.decidir_consentimento($1, 'aprovado', 'presencial')`, [CONSENT.theo]);
  await t.como(P.theo);
  const r = await t.um(`insert into cj.content_posts(author_id, body) values ($1, 'primeiro post') returning moderation_status`, [P.theo]);
  igual(r.moderation_status, 'pendente', 'post de cliente sempre entra pendente');
  await t.comoDono();
  igual(await t.n(`select count(*) from cj.audit_logs where entity_type = 'guardian_consents' and entity_id = $1 and actor_id = $2`, [CONSENT.theo, P.coord]), 1,
        'decisão de consentimento auditada');
});
teste('menor com consentimento (Bia) lê o mural e vê só o próprio círculo', async (t) => {
  await t.como(P.bia);
  espera(await t.n('select count(*) from cj.content_posts where id = $1', [POST.lucasGeral]) === 1, 'Bia deveria ver o mural geral aprovado');
  igual(await t.n('select count(*) from cj.content_posts where circle_id = $1', [C.esperanca]), 0, 'Bia não vê posts do Esperança');
});
teste('adulto comum não vê perfil de menor', async (t) => {
  await t.como(P.davi);
  igual(await t.n('select count(*) from cj.profiles where age_band = $1', ['15-17']), 0, 'Davi vendo perfis de 15–17');
  igual((await t.um('select cj.nome_publico($1) as n', [P.bia])).n, null, 'nome_publico de menor para adulto sem vínculo');
});
teste('não existe tabela de mensagem privada (sem conversa privada adulto↔menor pelo app)', async (t) => {
  await t.comoDono();
  const r = await t.q(`select table_name from information_schema.tables where table_schema = 'cj'
                        and (table_name ilike '%message%' or table_name ilike '%mensag%' or table_name ilike '%chat%' or table_name ilike '%dm%')`);
  igual(r, [], 'não deveria haver tabela de mensagens diretas');
});
teste('inscrição de menor em evento com autorização fica aguardando, e só a equipe libera', async (t) => {
  await t.como(P.bia);
  const r = await t.um('insert into cj.event_registrations(event_id, user_id) values ($1, $2) returning status, consent_status', [E.futebol, P.bia]);
  igual([r.status, r.consent_status], ['aguardando_autorizacao', 'pendente'], 'menor em evento com autorização');
  await t.falha(`update cj.event_registrations set status = 'confirmada' where event_id = $1 and user_id = $2`, [E.futebol, P.bia], '42501',
                'menor se autoconfirmando');
  await t.como(P.rafael);
  await t.falha('select cj.decidir_autorizacao_evento($1, $2, true)', [E.futebol, P.bia], '42501', 'líder comum liberando autorização');
  await t.como(P.coord);
  await t.q('select cj.decidir_autorizacao_evento($1, $2, true)', [E.futebol, P.bia]);
  await t.como(P.bia);
  igual((await t.um('select status from cj.event_registrations where event_id = $1 and user_id = $2', [E.futebol, P.bia])).status, 'confirmada', 'após autorização');
});
teste('adulto em evento com autorização é confirmado direto', async (t) => {
  await t.como(P.davi);
  const r = await t.um('insert into cj.event_registrations(event_id, user_id) values ($1, $2) returning status, consent_status', [E.futebol, P.davi]);
  igual([r.status, r.consent_status], ['confirmada', 'nao_exigido'], 'adulto');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PAPÉIS, CONTEÚDO, EVENTOS
// ═══════════════════════════════════════════════════════════════════════════════
teste('ninguém se dá papel sozinho (nem por insert, nem pela função)', async (t) => {
  await t.como(P.davi);
  await t.falha(`insert into cj.roles(user_id, role) values ($1, 'pastor')`, [P.davi], '42501', 'insert direto em roles');
  await t.falha(`select cj.conceder_papel($1, 'youth_admin')`, [P.davi], '42501', 'função conceder_papel');
  await t.como(P.coord);
  await t.falha(`select cj.conceder_papel($1, 'safeguarding_admin')`, [P.davi], '42501', 'youth_admin concedendo safeguarding');
  await t.falha(`select cj.conceder_papel($1, 'pastor')`, [P.coord], '42501', 'youth_admin se promovendo');
});
teste('pastor concede papel e isso fica auditado', async (t) => {
  await t.como(P.pastor);
  await t.q(`select cj.conceder_papel($1, 'assistant')`, [P.ana]);
  igual(await t.n(`select count(*) from cj.audit_logs where entity_type = 'roles' and actor_id = $1 and metadata ->> 'papel' = 'assistant'`, [P.pastor]), 1,
        'concessão auditada');
});
teste('membro não altera o próprio status/faixa etária (colunas protegidas)', async (t) => {
  await t.como(P.theo);
  await t.falha(`update cj.profiles set age_band = '18-21' where id = $1`, [P.theo], '42501', 'menor mudando a própria faixa');
  await t.falha(`update cj.profiles set status = 'ativo' where id = $1`, [P.novo], '42501', 'mudar status');
  const r = await t.um(`update cj.profiles set bio = 'nova bio' where id = $1 returning bio`, [P.theo]);
  igual(r.bio, 'nova bio', 'campos liberados funcionam');
});
teste('membro não edita perfil de outra pessoa', async (t) => {
  await t.como(P.davi);
  const r = await t.q(`update cj.profiles set bio = 'invadido' where id = $1 returning id`, [P.ana]);
  igual(r.length, 0, 'update em perfil alheio não deveria afetar linha nenhuma');
});
teste('post de membro entra pendente e não aparece para os outros até ser aprovado', async (t) => {
  await t.como(P.davi);
  const r = await t.um(`insert into cj.content_posts(author_id, body) values ($1, 'olá') returning id, moderation_status`, [P.davi]);
  igual(r.moderation_status, 'pendente', 'pendente');
  await t.como(P.ana);
  igual(await t.n('select count(*) from cj.content_posts where id = $1', [r.id]), 0, 'Ana não vê post pendente');
  await t.como(P.coord);
  await t.q(`select cj.moderar('post', $1, 'aprovado')`, [r.id]);
  await t.como(P.ana);
  igual(await t.n('select count(*) from cj.content_posts where id = $1', [r.id]), 1, 'Ana vê depois de aprovado');
});
teste('membro não publica "aviso oficial"', async (t) => {
  await t.como(P.davi);
  await t.falha(`insert into cj.content_posts(author_id, kind, body) values ($1, 'aviso', 'falso aviso')`, [P.davi], '42501', 'aviso por membro');
});
teste('bloquear um autor esconde os posts dele', async (t) => {
  await t.como(P.ana);
  igual(await t.n('select count(*) from cj.content_posts where id = $1', [POST.lucasGeral]), 1, 'antes do bloqueio');
  await t.q('insert into cj.user_blocks(blocker_id, blocked_id) values ($1, $2)', [P.ana, P.lucas]);
  igual(await t.n('select count(*) from cj.content_posts where id = $1', [POST.lucasGeral]), 0, 'depois do bloqueio');
});
teste('denúncia: autor vê a sua; outro membro não; proteção lê pela função auditada', async (t) => {
  await t.como(P.ana);
  igual(await t.n('select count(*) from cj.reports'), 1, 'Ana vê a denúncia dela');
  await t.como(P.davi);
  igual(await t.n('select count(*) from cj.reports'), 0, 'Davi não vê denúncia alheia');
  await t.falha('select * from cj.ler_denuncias()', [], '42501', 'membro lendo denúncias');
  await t.como(P.protecao);
  igual((await t.q('select id from cj.ler_denuncias()')).map((x) => x.id), [DENUNCIA], 'proteção vê a denúncia');
  igual(await t.n(`select count(*) from cj.audit_logs where actor_id = $1 and entity_id = $2 and action = 'ler'`, [P.protecao, DENUNCIA]), 1, 'leitura auditada');
});
teste('denúncia de risco vira severidade crítica (o cliente não escolhe)', async (t) => {
  await t.como(P.davi);
  const r = await t.um(`insert into cj.reports(reporter_id, target_type, reason) values ($1, 'outro', 'risco_seguranca') returning severity, status`, [P.davi]);
  igual([r.severity, r.status], ['critica', 'aberta'], 'severidade calculada');
});
teste('devocional: coordenação cria, mas só o pastor publica', async (t) => {
  await t.como(P.coord);
  await t.falha(`update cj.devotionals set status = 'publicado' where id = $1`, [id(302)], '42501', 'youth_admin publicando');
  await t.como(P.davi);
  const r = await t.q(`update cj.devotionals set title = 'hackeado' where id = $1 returning id`, [id(301)]);
  igual(r.length, 0, 'membro não edita devocional');
  await t.como(P.pastor);
  const p = await t.um(`update cj.devotionals set status = 'publicado' where id = $1 returning approved_by`, [id(302)]);
  igual(p.approved_by, P.pastor, 'aprovação registrada');
});
teste('membro vê só devocional publicado até hoje', async (t) => {
  await t.como(P.davi);
  igual((await t.q('select id from cj.devotionals')).map((x) => x.id), [id(301)], 'só o publicado de hoje');
});
teste('evento em rascunho e evento de outro círculo são invisíveis ao membro', async (t) => {
  await t.como(P.lucas);
  igual(await t.n('select count(*) from cj.events where id = $1', [E.rascunho]), 0, 'rascunho');
  igual(await t.n('select count(*) from cj.events where id = $1', [E.encontroEsp]), 0, 'evento do Esperança para o Lucas');
  await t.falha('insert into cj.event_registrations(event_id, user_id) values ($1, $2)', [E.encontroEsp, P.lucas], null, 'inscrição em evento invisível');
});
teste('lotação: segunda pessoa vai para a lista de espera', async (t) => {
  await t.como(P.davi);
  igual((await t.um('insert into cj.event_registrations(event_id, user_id) values ($1, $2) returning status', [E.vagaUnica, P.davi])).status, 'confirmada', '1ª vaga');
  await t.como(P.ana);
  igual((await t.um('insert into cj.event_registrations(event_id, user_id) values ($1, $2) returning status', [E.vagaUnica, P.ana])).status, 'lista_espera', '2ª pessoa');
});
teste('membro não lê a inscrição dos outros; líder do evento de círculo lê a do seu círculo', async (t) => {
  await t.comoDono();
  await t.q(`insert into cj.event_registrations(event_id, user_id) values ($1, $2), ($1, $3)`, [E.encontroEsp, P.davi, P.ana]);
  await t.como(P.davi);
  igual(await t.n('select count(*) from cj.event_registrations where event_id = $1', [E.encontroEsp]), 1, 'Davi vê só a dele');
  await t.como(P.rafael);
  igual(await t.n('select count(*) from cj.event_registrations where event_id = $1', [E.encontroEsp]), 2, 'Rafael vê as do seu evento');
  await t.como(P.bruno);
  igual(await t.n('select count(*) from cj.event_registrations where event_id = $1', [E.encontroEsp]), 0, 'Bruno (outro círculo) não vê');
});
teste('perfil pendente (sem acolhimento) não usa recursos sociais', async (t) => {
  await t.comoDono();
  await t.q(`insert into cj.term_acceptances(user_id, document, version) values ($1, 'regras_comunidade', 'v1')`, [P.novo]);
  await t.como(P.novo);
  await t.falha(`insert into cj.content_posts(author_id, body) values ($1, 'oi')`, [P.novo], '42501', 'pendente postando');
  igual(await t.n('select count(*) from cj.devotionals'), 1, 'mas lê o devocional');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. AUDITORIA E PAINEL
// ═══════════════════════════════════════════════════════════════════════════════
teste('audit_logs: membro não lê; pastor e proteção leem', async (t) => {
  await t.como(P.davi);
  igual(await t.n('select count(*) from cj.audit_logs'), 0, 'membro lendo auditoria');
  await t.como(P.coord);
  igual(await t.n('select count(*) from cj.audit_logs'), 0, 'coordenação não lê auditoria');
  await t.como(P.pastor);
  espera(await t.n('select count(*) from cj.audit_logs') > 0, 'pastor lê auditoria');
  await t.como(P.protecao);
  espera(await t.n('select count(*) from cj.audit_logs') > 0, 'proteção lê auditoria');
});
teste('audit_logs é imutável (nem pastor apaga/edita; ninguém forja linha)', async (t) => {
  await t.como(P.pastor);
  await t.falha('delete from cj.audit_logs', [], '42501', 'pastor apagando auditoria');
  await t.falha(`update cj.audit_logs set action = 'x'`, [], '42501', 'pastor editando auditoria');
  await t.falha(`insert into cj.audit_logs(action, entity_type) values ('forjado', 'x')`, [], '42501', 'inserção direta');
  await t.falha(`select cj.auditar('forjado', 'x', null, '{}')`, [], '42501', 'função auditar não é pública');
  await t.comoDono();
  await t.falha('delete from cj.audit_logs', [], '42501', 'nem o dono apaga sem a função de expurgo');
});
teste('painel da liderança: só números agregados e só para gestão', async (t) => {
  await t.como(P.rafael);
  await t.falha('select cj.painel_indicadores()', [], '42501', 'líder de círculo no painel');
  await t.como(P.coord);
  const p = (await t.um('select cj.painel_indicadores() as p')).p;
  igual(p.sem_acolhimento > 0, true, 'há participante sem acolhimento no seed');
  igual(p.consentimentos_pendentes, 1, 'consentimento pendente do Theo');
  espera(Object.values(p).every((v) => v === null || typeof v === 'number'), 'painel só devolve números');
});
teste('membro exporta os próprios dados (LGPD) e a exportação é auditada', async (t) => {
  await t.como(P.davi);
  const d = (await t.um('select cj.exportar_meus_dados() as d')).d;
  igual(d.perfil.id, P.davi, 'perfil exportado');
  espera(!('radar_key_hash' in d.perfil), 'não exporta o vínculo técnico');
  igual(d.pedidos_oracao.length, 1, 'inclui os próprios pedidos');
  await t.comoDono();
  igual(await t.n(`select count(*) from cj.audit_logs where action = 'exportar' and actor_id = $1`, [P.davi]), 1, 'exportação auditada');
});
teste('excluir a própria conta apaga os dados em cascata', async (t) => {
  await t.como(P.ana);
  await t.q('select cj.excluir_minha_conta()');
  await t.comoDono();
  igual(await t.n('select count(*) from cj.prayer_requests where owner_id = $1', [P.ana]), 0, 'pedidos apagados');
  igual(await t.n('select count(*) from cj.reports where id = $1 and reporter_id is null', [DENUNCIA]), 1, 'denúncia fica, anônima');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. ESTRUTURA
// ═══════════════════════════════════════════════════════════════════════════════
teste('RLS está ligado em TODAS as tabelas do schema cj', async (t) => {
  await t.comoDono();
  const r = await t.q(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
                        where n.nspname = 'cj' and c.relkind = 'r' and not c.relrowsecurity`);
  igual(r, [], 'tabelas sem RLS');
});
teste('toda função security definer tem search_path fixo', async (t) => {
  await t.comoDono();
  const r = await t.q(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                        where n.nspname = 'cj' and p.prosecdef
                          and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`);
  igual(r, [], 'funções definer sem search_path');
});
teste('anon não tem nenhum privilégio em tabela do cj', async (t) => {
  await t.comoDono();
  igual(await t.n(`select count(*) from information_schema.role_table_grants where table_schema = 'cj' and grantee in ('anon','PUBLIC')`), 0, 'grants para anon/PUBLIC');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. MÓDULO 1 — GESTÃO DE PESSOAS (migração 002)
// ═══════════════════════════════════════════════════════════════════════════════
const HASH_PRE = 'ab'.repeat(32);   // HMAC fictício de um WhatsApp (o banco nunca vê o número)
teste('M1: membro comum NÃO lista pessoas', async (t) => {
  await t.como(P.davi);
  await t.falha('select * from cj.listar_pessoas()', [], '42501', 'Davi listando pessoas');
});
teste('M1: líder de círculo NÃO lista pessoas (só vê o próprio círculo pelo RLS)', async (t) => {
  await t.como(P.rafael);
  await t.falha('select * from cj.listar_pessoas()', [], '42501', 'Rafael listando pessoas');
});
teste('M1: visitante (anon) não chama nenhuma função nova', async (t) => {
  await t.como(null);
  await t.falha('select * from cj.listar_pessoas()', [], '42501', 'anon listando');
  await t.falha('select cj.quem_sou()', [], '42501', 'anon quem_sou');
  await t.falha(`select cj.pre_cadastrar($1, 'x', '18-21')`, [HASH_PRE], '42501', 'anon pré-cadastrando');
});
teste('M1: coordenação lista pessoas com filtros e a lista NÃO traz o vínculo do WhatsApp', async (t) => {
  await t.como(P.coord);
  const todos = await t.q('select * from cj.listar_pessoas()');
  igual(todos.length, 13, 'todas as 13 pessoas do seed');
  espera(!Object.keys(todos[0]).some((k) => /hash|radar|whats|telefone/i.test(k)), 'nenhuma coluna de vínculo/telefone na lista');
  igual(todos[0].status, 'pendente', 'pendentes aparecem primeiro');
  igual((await t.q(`select id from cj.listar_pessoas('pendente')`)).map((x) => x.id), [P.novo], 'filtro pendentes');
  igual((await t.q(`select id from cj.listar_pessoas(null, '15-17')`)).map((x) => x.id).sort(), [P.bia, P.theo].sort(), 'filtro faixa 15–17');
  igual((await t.q(`select id from cj.listar_pessoas(null, null, $1)`, [C.esperanca])).map((x) => x.id).sort(), [P.davi, P.ana].sort(), 'filtro círculo');
  igual((await t.q(`select id from cj.listar_pessoas(null, null, null, 'lucas')`)).map((x) => x.id), [P.lucas], 'busca por nome');
  igual((await t.q(`select id from cj.listar_pessoas(null, null, null, null, 'circle_leader')`)).map((x) => x.id).sort(), [P.rafael, P.marcos, P.bruno].sort(), 'filtro papel');
  const theo = (await t.q(`select consentimento, papeis from cj.listar_pessoas(null, null, null, 'theo')`))[0];
  igual(theo.consentimento, 'pendente', 'situação do consentimento do menor');
  await t.falha(`select * from cj.listar_pessoas('qualquer')`, [], '22023', 'filtro inválido');
});
teste('M1: proteção (safeguarding_admin) lê a lista, mas não pré-cadastra nem dá papel', async (t) => {
  await t.como(P.protecao);
  espera((await t.q('select id from cj.listar_pessoas()')).length === 13, 'proteção lê a lista');
  await t.falha(`select cj.pre_cadastrar($1, 'Fulano', '18-21')`, [HASH_PRE], '42501', 'proteção pré-cadastrando');
  await t.falha(`select cj.conceder_papel($1, 'assistant')`, [P.ana], '42501', 'proteção concedendo papel');
});
teste('M1: cada consulta da lista de pessoas fica em audit_logs (sem o texto da busca)', async (t) => {
  await t.como(P.coord);
  await t.q(`select id from cj.listar_pessoas('ativo', null, null, 'Ana Barros')`);
  await t.comoDono();
  const log = await t.q(`select metadata from cj.audit_logs where actor_id = $1 and action = 'consultar' and entity_type = 'pessoas'`, [P.coord]);
  igual(log.length, 1, 'uma linha de auditoria');
  igual(log[0].metadata.status, 'ativo', 'filtro registrado');
  espera(!/Ana/.test(JSON.stringify(log[0].metadata)), 'o nome buscado não vai para a auditoria');
});
teste('M1: youth_admin concede líder/auxiliar, mas NÃO concede pastor, proteção nem coordenação', async (t) => {
  await t.como(P.coord);
  await t.q(`select cj.conceder_papel($1, 'circle_leader')`, [P.ana]);
  await t.falha(`select cj.conceder_papel($1, 'pastor')`, [P.ana], '42501', 'youth_admin dando pastor');
  await t.falha(`select cj.conceder_papel($1, 'safeguarding_admin')`, [P.ana], '42501', 'youth_admin dando proteção');
  await t.falha(`select cj.conceder_papel($1, 'youth_admin')`, [P.ana], '42501', 'youth_admin dando coordenação');
  await t.falha(`select cj.revogar_papel($1, 'safeguarding_admin')`, [P.protecao], '42501', 'youth_admin tirando proteção');
  await t.falha(`select cj.revogar_papel($1, 'pastor')`, [P.pastor], '42501', 'youth_admin tirando pastor');
  igual((await t.um('select cj.papeis_que_concedo() as p')).p, '{member,circle_leader,assistant}', 'papéis que a coordenação concede');
  await t.comoDono();
  igual(await t.n(`select count(*) from cj.audit_logs where action = 'conceder_papel' and actor_id = $1 and entity_id = $2 and metadata ->> 'papel' = 'circle_leader'`, [P.coord, P.ana]), 1, 'concessão auditada');
});
teste('M1: pastor concede e retira pastor/proteção/coordenação, tudo auditado', async (t) => {
  await t.como(P.pastor);
  for (const papel of ['safeguarding_admin', 'youth_admin', 'pastor']) await t.q(`select cj.conceder_papel($1, $2)`, [P.ana, papel]);
  igual((await t.q('select role from cj.roles where user_id = $1 order by role', [P.ana])).map((x) => x.role), ['youth_admin', 'pastor', 'safeguarding_admin'], 'papéis da Ana');
  await t.q(`select cj.revogar_papel($1, 'pastor')`, [P.ana]);
  await t.comoDono();
  igual(await t.n(`select count(*) from cj.audit_logs where actor_id = $1 and entity_id = $2 and action in ('conceder_papel','revogar_papel')`, [P.pastor, P.ana]), 4, '3 concessões + 1 retirada auditadas');
});
teste('M1: o último pastor ativo não perde o papel nem é desativado', async (t) => {
  await t.como(P.pastor);
  await t.falha(`select cj.revogar_papel($1, 'pastor')`, [P.pastor], '23514', 'tirar o próprio papel de último pastor');
  await t.q(`select cj.conceder_papel($1, 'pastor')`, [P.coord]);
  await t.q(`select cj.revogar_papel($1, 'pastor')`, [P.pastor]);   // agora há outro pastor ativo
  await t.comoDono();
  igual(await t.n(`select count(*) from cj.roles where role = 'pastor'`), 1, 'sobrou um pastor');
});
teste('M1: desativar — gestão desativa membro; ninguém se desativa; só o pastor mexe na equipe', async (t) => {
  await t.como(P.coord);
  await t.falha(`select cj.definir_status_perfil($1, 'suspenso')`, [P.coord], '42501', 'coordenação se desativando');
  await t.falha(`select cj.definir_status_perfil($1, 'suspenso')`, [P.pastor], '42501', 'coordenação desativando o pastor');
  await t.falha(`select cj.definir_status_perfil($1, 'suspenso')`, [P.protecao], '42501', 'coordenação desativando a proteção');
  await t.q(`select cj.definir_status_perfil($1, 'suspenso')`, [P.rafael]);
  await t.como(P.rafael);
  igual((await t.um('select cj.lidera_circulo($1) as ok', [C.esperanca])).ok, false, 'desativado perde o efeito do papel de líder');
  await t.como(P.davi);
  await t.falha(`select cj.definir_status_perfil($1, 'ativo')`, [P.rafael], '42501', 'membro reativando alguém');
  await t.comoDono();
  igual(await t.n(`select count(*) from cj.audit_logs where action = 'desativar_perfil' and actor_id = $1 and entity_id = $2`, [P.coord, P.rafael]), 1, 'desativação auditada');
  igual(await t.n(`select count(*) from cj.roles where user_id = $1`, [P.rafael]), 1, 'o papel fica guardado (nada é apagado)');
});
teste('M1: pré-cadastro pelo WhatsApp — só gestão; nasce sem vínculo; duplicado recusado; auditado', async (t) => {
  await t.como(P.davi);
  await t.falha(`select cj.pre_cadastrar($1, 'Fulano', '18-21')`, [HASH_PRE], '42501', 'membro pré-cadastrando');
  await t.como(P.coord);
  const novo = (await t.um(`select cj.pre_cadastrar($1, 'Maria Pré (teste)', '18-21') as id`, [HASH_PRE])).id;
  await t.falha(`select cj.pre_cadastrar($1, 'Outra', '22-25')`, [HASH_PRE], '23505', 'mesmo WhatsApp duas vezes');
  await t.falha(`select cj.pre_cadastrar('123', 'Outra', '22-25')`, [], '22023', 'vínculo fora do formato');
  const r = (await t.q(`select vinculado, pre_cadastrado, status from cj.listar_pessoas('nao_vinculado')`));
  igual(r, [{ vinculado: false, pre_cadastrado: true, status: 'ativo' }], 'aparece como "ainda não entrou"');
  await t.comoDono();
  igual(await t.n(`select count(*) from cj.audit_logs where action = 'pre_cadastrar' and actor_id = $1 and entity_id = $2`, [P.coord, novo]), 1, 'pré-cadastro auditado');
  // a pessoa entra: o vínculo acende uma única vez e fica auditado
  await t.como(novo);
  igual((await t.um('select cj.confirmar_vinculo() as v')).v, true, '1ª entrada vincula');
  igual((await t.um('select cj.confirmar_vinculo() as v')).v, false, '2ª entrada não muda nada');
  igual((await t.um('select cj.quem_sou() as q')).q.nome, 'Maria Pré (teste)', 'ela se vê com o nome do pré-cadastro');
  await t.comoDono();
  igual(await t.n(`select count(*) from cj.audit_logs where action = 'vincular' and actor_id = $1`, [novo]), 1, 'vínculo auditado');
});
teste('M1: quem_sou devolve papéis e o que cada um pode conceder', async (t) => {
  await t.como(P.pastor);
  const p = (await t.um('select cj.quem_sou() as q')).q;
  igual([p.papeis, p.gestao, p.pode_conceder.length], [['pastor'], true, 6], 'pastor');
  await t.como(P.davi);
  const d = (await t.um('select cj.quem_sou() as q')).q;
  igual([d.papeis, d.equipe, d.pode_conceder, d.circulo], [[], false, [], 'Círculo Esperança (demo)'], 'membro');
  espera(!('radar_key_hash' in d), 'sem vínculo na resposta');
});
teste('M1: primeiro administrador — só o dono do banco, e só sem pastor ativo', async (t) => {
  await t.como(P.coord);
  await t.falha('select cj.promover_primeiro_admin($1)', [P.coord], '42501', 'app chamando promover_primeiro_admin');
  await t.comoDono();
  await t.falha('select cj.promover_primeiro_admin($1)', [P.lucas], '23514', 'já existe pastor ativo');
  await t.q(`delete from cj.roles where role = 'pastor'`);
  await t.falha('select cj.promover_primeiro_admin($1)', [P.bia], '23514', 'menor não vira admin');
  const r = (await t.um('select cj.promover_primeiro_admin($1) as r', [P.novo])).r;
  igual(r.papeis, ['pastor', 'youth_admin'], 'papéis do primeiro admin');
  igual((await t.um('select status from cj.profiles where id = $1', [P.novo])).status, 'ativo', 'perfil ativado');
  igual(await t.n(`select count(*) from cj.audit_logs where action = 'primeiro_admin' and entity_id = $1`, [P.novo]), 1, 'auditado');
  await t.falha('select cj.promover_primeiro_admin($1)', [P.lucas], '23514', 'segunda vez recusada');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. A FUNÇÃO (api/_lib/jovem.js, antes api-proposta/jovem.js) DE PONTA A PONTA
// Crachá falso numa tabela radar_chaves LOCAL (cópia mínima do formato do Radar).
// ═══════════════════════════════════════════════════════════════════════════════
const ARQ_FUNCAO = path.resolve(RAIZ, '..', 'api/_lib/jovem.js');
const jovemMod = require(ARQ_FUNCAO);
const crypto = require('crypto');
const sha = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
// Funções puras equivalentes às de api/_lib/chave.js (o teste não importa nada do Radar).
const chaveFalsa = {
  sha,
  segredoLimpo: (v) => (/^rk_[A-Za-z0-9_-]{20,120}$/.test(String(v || '').trim()) ? String(v).trim() : ''),
  daRequisicao(req) { return this.segredoLimpo((req.headers || {})['x-radar-chave']); },
  pareceTelefone: (k) => /^\d{8,}$/.test(String(k || ''))
};
const CRACHA_DAVI = 'rk_teste_davi_aaaaaaaaaaaaaaaaaaaaaaaa';
const CRACHA_NOVO = 'rk_teste_novato_bbbbbbbbbbbbbbbbbbbbbbbb';
const CRACHA_APARELHO = 'rk_teste_aparelho_cccccccccccccccccccc';
const CRACHA_COORD = 'rk_teste_coord_eeeeeeeeeeeeeeeeeeeeeeee';
const CRACHA_PASTOR = 'rk_teste_pastor_ffffffffffffffffffffffff';
const CRACHA_MARIA = 'rk_teste_maria_gggggggggggggggggggggggg';   // pré-cadastrada pela liderança
const handler = jovemMod.criarHandler({
  chave: chaveFalsa,
  conectar: async () => { const c = new Client(CONEXAO); await c.connect(); return c; }
});
async function chamar(cracha, corpo) {
  const res = { code: 0, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  await handler({ method: 'POST', headers: cracha ? { 'x-radar-chave': cracha } : {}, body: corpo }, res);
  return res;
}
const testesHandler = [];
const testeHandler = (nome, fn) => testesHandler.push({ nome, fn });

testeHandler('handler: sem crachá → 401', async () => {
  igual((await chamar(null, { acao: 'perfil' })).code, 401, 'sem crachá');
});
testeHandler('handler: crachá desconhecido → 401', async () => {
  igual((await chamar('rk_nao_existe_dddddddddddddddddddddddd', { acao: 'perfil' })).code, 401, 'crachá falso');
});
testeHandler('handler: crachá de aparelho anônimo (não é telefone) → 401', async () => {
  igual((await chamar(CRACHA_APARELHO, { acao: 'perfil' })).code, 401, 'id de aparelho');
});
testeHandler('handler: ação fora da lista → 400', async () => {
  igual((await chamar(CRACHA_DAVI, { acao: 'drop table' })).code, 400, 'ação desconhecida');
});
testeHandler('handler: GET recusado (crachá nunca em URL)', async () => {
  const res = { code: 0, setHeader() {}, status(c) { this.code = c; return this; }, json() { return this; } };
  await handler({ method: 'GET', headers: {}, query: {} }, res);
  igual(res.code, 405, 'GET');
});
testeHandler('handler: Davi entra pelo crachá e vê só o próprio pedido de oração (RLS por usuário)', async () => {
  const r = await chamar(CRACHA_DAVI, { acao: 'meus_pedidos' });
  igual(r.code, 200, 'status');
  igual(r.body.dados.map((x) => x.id), [ORACAO.davi], 'só o pedido do Davi');
});
testeHandler('handler: Davi pede o painel da liderança → 403 vindo do banco', async () => {
  igual((await chamar(CRACHA_DAVI, { acao: 'painel' })).code, 403, 'painel para membro');
});
testeHandler('handler: tela de início e mural funcionam para o Davi', async () => {
  const i = await chamar(CRACHA_DAVI, { acao: 'inicio' });
  igual(i.code, 200, 'inicio');
  igual(i.body.dados.circulo.name, 'Círculo Esperança (demo)', 'círculo do Davi');
  const m = await chamar(CRACHA_DAVI, { acao: 'mural', aba: 'circulo' });
  espera(m.body.dados.every((p) => p.autor && !/Caminho/.test(p.body)), 'mural do círculo sem posts do Caminho');
});
testeHandler('handler: validação de entrada recusa texto vazio', async () => {
  const r = await chamar(CRACHA_DAVI, { acao: 'orar', texto: '  ' });
  igual(r.code, 400, 'pedido vazio');
});
testeHandler('handler: modo projeto separado (conectarRadar) também identifica pelo crachá', async () => {
  const h2 = jovemMod.criarHandler({ chave: chaveFalsa,
    conectar: async () => { const c = new Client(CONEXAO); await c.connect(); return c; },
    conectarRadar: async () => { const c = new Client(CONEXAO); await c.connect(); return c; } });
  const res = { code: 0, body: null, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  await h2({ method: 'POST', headers: { 'x-radar-chave': CRACHA_DAVI }, body: { acao: 'meus_pedidos' } }, res);
  igual([res.code, res.body.dados.length], [200, 1], 'separado');
});
testeHandler('handler: pessoa nova entra, nasce "pendente" e não publica até ser acolhida', async () => {
  igual((await chamar(CRACHA_NOVO, { acao: 'perfil' })).code, 404, 'sem perfil ainda');
  const e = await chamar(CRACHA_NOVO, { acao: 'entrar', nome: 'Pessoa Nova (teste)', faixa: '18-21' });
  igual([e.code, e.body.status], [200, 'pendente'], 'entrar');
  await chamar(CRACHA_NOVO, { acao: 'aceitar_termos', documentos: ['regras_comunidade'], versao: 'v1' });
  igual((await chamar(CRACHA_NOVO, { acao: 'publicar', texto: 'oi' })).code, 403, 'pendente não publica');
  igual((await chamar(CRACHA_NOVO, { acao: 'devocionais' })).code, 200, 'mas lê a Palavra');
});

// ─── Módulo 1 pela função, de ponta a ponta ───────────────────────────────────
const dono = async (sql, p) => (await db.query(sql, p)).rows;
testeHandler('M1 handler: "status" responde sem crachá (o app descobre se o módulo está no ar)', async () => {
  const r = await chamar(null, { acao: 'status' });
  igual([r.code, r.body.configurado], [200, true], 'status');
  igual((await chamar(null, { acao: 'eu' })).code, 401, '"eu" sem crachá continua 401');
});
testeHandler('M1 handler: "eu" de quem entrou no Radar mas ainda não tem perfil → perfil null', async () => {
  await dono(`insert into radar_chaves(user_key, chave_hash) values ('99900000123', $1) on conflict do nothing`, [sha('rk_teste_sem_perfil_hhhhhhhhhhhhhhhhhh')]);
  const r = await chamar('rk_teste_sem_perfil_hhhhhhhhhhhhhhhhhh', { acao: 'eu' });
  igual([r.code, r.body.dados.perfil], [200, null], 'sem perfil');
});
testeHandler('M1 handler: "eu" devolve papéis e status (Davi, membro)', async () => {
  const r = await chamar(CRACHA_DAVI, { acao: 'eu' });
  igual([r.code, r.body.dados.perfil.status, r.body.dados.perfil.papeis, r.body.dados.perfil.equipe], [200, 'ativo', [], false], 'eu do Davi');
});
testeHandler('M1 handler: membro comum NÃO lista pessoas nem dá papel (403 do banco)', async () => {
  igual((await chamar(CRACHA_DAVI, { acao: 'pessoas' })).code, 403, 'Davi listando');
  igual((await chamar(CRACHA_DAVI, { acao: 'conceder_papel', usuario: P.ana, papel: 'circle_leader' })).code, 403, 'Davi dando papel');
  igual((await chamar(CRACHA_DAVI, { acao: 'pre_cadastrar', nome: 'X Y', whatsapp: '11990000000', faixa: '18-21' })).code, 403, 'Davi pré-cadastrando');
});
testeHandler('M1 handler: coordenação lista pessoas com filtros', async () => {
  const r = await chamar(CRACHA_COORD, { acao: 'pessoas', filtros: { status: 'pendente' } });
  igual(r.code, 200, 'status');
  espera(r.body.dados.pessoas.some((x) => x.id === P.novo) && r.body.dados.pessoas.every((x) => x.status === 'pendente'), 'só pendentes');
  igual(r.body.dados.pode_conceder, ['member', 'circle_leader', 'assistant'], 'o que a coordenação concede');
  espera(r.body.dados.circulos.length === 3, 'círculos para o filtro');
  igual((await chamar(CRACHA_COORD, { acao: 'pessoas', filtros: { faixa: '99' } })).code, 400, 'filtro inválido');
});
testeHandler('M1 handler: youth_admin NÃO dá pastor/proteção; dá líder de círculo', async () => {
  igual((await chamar(CRACHA_COORD, { acao: 'conceder_papel', usuario: P.ana, papel: 'pastor' })).code, 403, 'youth_admin → pastor');
  igual((await chamar(CRACHA_COORD, { acao: 'conceder_papel', usuario: P.ana, papel: 'safeguarding_admin' })).code, 403, 'youth_admin → proteção');
  igual((await chamar(CRACHA_COORD, { acao: 'conceder_papel', usuario: P.ana, papel: 'circle_leader' })).code, 200, 'youth_admin → líder');
  igual((await chamar(CRACHA_COORD, { acao: 'revogar_papel', usuario: P.ana, papel: 'circle_leader' })).code, 200, 'youth_admin retira líder');
  igual((await chamar(CRACHA_COORD, { acao: 'conceder_papel', usuario: P.bia, papel: 'assistant' })).code, 400, 'menor não vira auxiliar');
});
testeHandler('M1 handler: pastor dá proteção e pastor (e retira)', async () => {
  igual((await chamar(CRACHA_PASTOR, { acao: 'conceder_papel', usuario: P.ana, papel: 'safeguarding_admin' })).code, 200, 'pastor → proteção');
  igual((await chamar(CRACHA_PASTOR, { acao: 'conceder_papel', usuario: P.ana, papel: 'pastor' })).code, 200, 'pastor → pastor');
  igual((await dono('select role from cj.roles where user_id = $1 order by role', [P.ana])).map((x) => x.role), ['pastor', 'safeguarding_admin'], 'papéis da Ana');
  igual((await chamar(CRACHA_PASTOR, { acao: 'revogar_papel', usuario: P.ana, papel: 'pastor' })).code, 200, 'retira pastor');
  igual((await chamar(CRACHA_PASTOR, { acao: 'revogar_papel', usuario: P.ana, papel: 'safeguarding_admin' })).code, 200, 'retira proteção');
  igual((await chamar(CRACHA_PASTOR, { acao: 'conceder_papel', usuario: P.ana, papel: 'dono_de_tudo' })).code, 400, 'papel inexistente');
});
testeHandler('M1 handler: pré-cadastro pelo WhatsApp se vincula quando a pessoa entra no Radar com aquele número', async () => {
  // a liderança digita com +55 e máscara; o Radar guarda sem o 55 — os dois casam
  const p = await chamar(CRACHA_COORD, { acao: 'pre_cadastrar', nome: 'Maria Pré (teste)', whatsapp: '+55 (21) 99876-5432', faixa: '18-21' });
  igual(p.code, 200, 'pré-cadastro');
  const dup = await chamar(CRACHA_COORD, { acao: 'pre_cadastrar', nome: 'Maria de novo', whatsapp: '21998765432', faixa: '18-21' });
  igual(dup.code, 409, 'mesmo número de novo');
  igual((await chamar(CRACHA_COORD, { acao: 'pre_cadastrar', nome: 'Curto', whatsapp: '1234', faixa: '18-21' })).code, 400, 'número curto');
  const linhaPre = (await dono('select radar_key_hash, vinculado_em from cj.profiles where id = $1', [p.body.dados.id]))[0];
  espera(!/21998765432|99876/.test(JSON.stringify(linhaPre)) && linhaPre.vinculado_em === null, 'banco guarda só o HMAC, ainda sem vínculo');
  // a Maria se cadastra no Radar (crachá emitido para o número sem 55) e abre o Conexão Jovem
  await dono(`insert into radar_chaves(user_key, chave_hash) values ('21998765432', $1)`, [sha(CRACHA_MARIA)]);
  const eu = await chamar(CRACHA_MARIA, { acao: 'eu' });
  igual([eu.code, eu.body.dados.perfil.id, eu.body.dados.perfil.nome, eu.body.dados.acabou_de_vincular], [200, p.body.dados.id, 'Maria Pré (teste)', true], 'vinculou na 1ª entrada');
  igual((await chamar(CRACHA_MARIA, { acao: 'eu' })).body.dados.acabou_de_vincular, false, 'não vincula duas vezes');
  igual((await chamar(CRACHA_MARIA, { acao: 'entrar', nome: 'Outro Nome', faixa: '22-25' })).body.novo, false, 'entrar não cria perfil duplicado');
  igual((await chamar(CRACHA_MARIA, { acao: 'aceitar_termos', documentos: ['termos_uso', 'privacidade', 'regras_comunidade'], versao: '2026-11' })).code, 200, 'aceita os termos');
  igual((await chamar(CRACHA_MARIA, { acao: 'eu' })).body.dados.perfil.termos.length, 3, 'termos registrados');
});
testeHandler('M1 handler: desativar e reativar pessoa; desativado não usa o app', async () => {
  igual((await chamar(CRACHA_COORD, { acao: 'desativar_pessoa', usuario: P.davi })).code, 200, 'desativa o Davi');
  const r = await chamar(CRACHA_DAVI, { acao: 'perfil' });
  igual([r.code, r.body.motivo], [403, 'perfil_suspenso'], 'Davi bloqueado');
  igual((await chamar(CRACHA_DAVI, { acao: 'eu' })).body.dados.perfil, { status: 'suspenso' }, '"eu" só conta a situação');
  igual((await chamar(CRACHA_COORD, { acao: 'desativar_pessoa', usuario: P.pastor })).code, 403, 'coordenação não desativa o pastor');
  igual((await chamar(CRACHA_COORD, { acao: 'ativar_perfil', usuario: P.davi })).code, 200, 'reativa');
  igual((await chamar(CRACHA_DAVI, { acao: 'perfil' })).code, 200, 'Davi de volta');
});
testeHandler('M1 handler: aprovar pendente (ativar) e corrigir faixa', async () => {
  igual((await chamar(CRACHA_COORD, { acao: 'ativar_perfil', usuario: P.novo })).code, 200, 'aprova o pendente');
  igual((await dono('select status from cj.profiles where id = $1', [P.novo]))[0].status, 'ativo', 'ativo');
  igual((await chamar(CRACHA_COORD, { acao: 'definir_faixa', usuario: P.novo, faixa: '22-25' })).code, 200, 'corrige faixa');
});
testeHandler('M1 handler: tudo o que a liderança fez está em audit_logs', async () => {
  const acoes = (await dono(`select distinct action from cj.audit_logs where actor_id = any($1::uuid[])`, [[P.coord, P.pastor]])).map((x) => x.action);
  for (const a of ['consultar', 'conceder_papel', 'revogar_papel', 'pre_cadastrar', 'desativar_perfil', 'ativar_perfil']) {
    espera(acoes.includes(a), 'faltou na auditoria: ' + a);
  }
  const maria = (await dono(`select id from cj.profiles where display_name = 'Maria Pré (teste)'`))[0].id;
  igual(Number((await dono(`select count(*) from cj.audit_logs where action = 'vincular' and actor_id = $1`, [maria]))[0].count), 1, 'vínculo auditado');
  const novoPerfil = (await dono(`select count(*) from cj.audit_logs where action = 'criar_perfil'`))[0].count;
  espera(Number(novoPerfil) >= 1, 'criação de perfil pelo "entrar" auditada');
});
testeHandler('M1 handler: sem CJ_DB_URL/CJ_VINCULO_SEGREDO a rota responde "não configurado" (JSON) sem exceção', async () => {
  const salvo = { CJ_DB_URL: process.env.CJ_DB_URL, CJ_VINCULO_SEGREDO: process.env.CJ_VINCULO_SEGREDO, RADAR_DB_DATABASE_URL: process.env.RADAR_DB_DATABASE_URL };
  delete process.env.CJ_DB_URL; delete process.env.CJ_VINCULO_SEGREDO; delete process.env.RADAR_DB_DATABASE_URL;
  try {
    for (const req of [{ method: 'POST', headers: { 'x-radar-chave': CRACHA_DAVI }, body: { acao: 'eu' } }, { method: 'GET', headers: {}, query: {} },
                       { method: 'POST', headers: {}, body: 'isto não é json' }]) {
      const res = { code: 0, body: null, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
      await jovemMod(req, res);
      igual([res.code, res.body.ok, res.body.motivo], [200, false, 'nao_configurado'], 'resposta sem configuração');
    }
    igual(jovemMod.configuracao({}).faltando, ['CJ_DB_URL', 'CJ_VINCULO_SEGREDO', 'RADAR_DB_DATABASE_URL'], 'o que falta');
    igual(jovemMod.configuracao({ CJ_DB_URL: 'x', RADAR_DB: 'y', CJ_VINCULO_SEGREDO: 'curto' }).faltando, ['CJ_VINCULO_SEGREDO'], 'segredo curto');
  } finally {
    for (const k of Object.keys(salvo)) if (salvo[k] !== undefined) process.env[k] = salvo[k];
  }
});
testeHandler('M1 handler: o arquivo carrega sem o pacote pg e sem variáveis (não derruba o api/dados.js)', async () => {
  const { spawnSync } = require('child_process');
  const env = { PATH: process.env.PATH };   // sem NODE_PATH (sem pg) e sem nenhuma variável do módulo
  const r = spawnSync(process.execPath, ['-e', `const j = require(${JSON.stringify(ARQ_FUNCAO)});
    const res = { setHeader() {}, status(c) { this.c = c; return this; }, json(b) { console.log(this.c, b.motivo); } };
    j({ method: 'POST', headers: {}, body: { acao: 'eu' } }, res);`], { env, encoding: 'utf8' });
  igual([r.status, r.stdout.trim()], [0, '200 nao_configurado'], 'carregou e respondeu: ' + r.stderr);
});

// ═══════════════════════════════════════════════════════════════════════════════
async function principal() {
  // banco limpo
  const adm = new Client({ ...CONEXAO, database: 'postgres' });
  await adm.connect();
  await adm.query('drop database if exists cj_teste');
  await adm.query('create database cj_teste');
  await adm.end();

  db = new Client(CONEXAO);
  await db.connect();
  await db.query('set client_min_messages = warning');
  const ler = (f) => fs.readFileSync(f, 'utf8');
  let ok = 0, falhou = 0;
  const marcar = (passou, nome, erro) => {
    if (passou) { ok++; console.log('  ✔ ' + nome); } else { falhou++; console.log('  ✘ ' + nome + '\n      → ' + erro); }
  };

  console.log('\nPreparação');
  await db.query(ler(MINIMO));
  try { await db.query(ler(MIGRACAO)); marcar(true, 'migração aplicada (1ª vez)'); } catch (e) { marcar(false, 'migração aplicada (1ª vez)', e.message); throw e; }
  try { await db.query(ler(MIGRACAO_2)); marcar(true, 'migração 002 (gestão de pessoas) aplicada'); } catch (e) { marcar(false, 'migração 002 aplicada', e.message); throw e; }
  try { await db.query(ler(MIGRACAO)); await db.query(ler(MIGRACAO_2)); marcar(true, 'migrações 001 + 002 reaplicadas sem erro (idempotentes)'); } catch (e) { marcar(false, 'migração idempotente', e.message); }
  try { await db.query(ler(SEED)); marcar(false, 'seed recusa rodar sem a trava', 'rodou sem a trava'); } catch (e) { marcar(/recusado/.test(e.message), 'seed recusa rodar sem a trava', e.message); }
  await db.query("set cj.permitir_seed_demo = 'sim'");
  await db.query(ler(SEED));
  await db.query(ler(SEED));
  marcar(Number((await db.query('select count(*) from cj.profiles')).rows[0].count) === 13, 'seed aplicado duas vezes sem duplicar', 'contagem errada');
  await db.query('reset cj.permitir_seed_demo');

  console.log('\nRLS e autorização (banco)');
  for (const t of testes) {
    await db.query('begin');
    try { await t.fn(contexto()); marcar(true, t.nome); }
    catch (e) { marcar(false, t.nome, e instanceof Falha ? e.message : `erro inesperado: ${e.code || ''} ${e.message}`); }
    finally { await db.query('rollback'); }
  }

  console.log('\nFunção api/_lib/jovem.js (ponta a ponta)');
  process.env.CJ_VINCULO_SEGREDO = 'segredo-de-teste-local-com-mais-de-32-caracteres';
  // radar_chaves/vínculo LOCAIS e fictícios: Davi (telefone fictício 99900000007) e uma pessoa nova.
  await db.query(`create table radar_chaves(id bigserial primary key, user_key text not null, chave_hash text not null unique)`);
  await db.query(`insert into radar_chaves(user_key, chave_hash) values ('99900000007', $1), ('99900000099', $2), ('ap3f9k2zz', $3)`,
                 [sha(CRACHA_DAVI), sha(CRACHA_NOVO), sha(CRACHA_APARELHO)]);
  await db.query('update cj.profiles set radar_key_hash = $1 where id = $2', [jovemMod.hashVinculo('99900000007'), P.davi]);
  await db.query(`insert into radar_chaves(user_key, chave_hash) values ('99900000002', $1), ('99900000001', $2)`, [sha(CRACHA_COORD), sha(CRACHA_PASTOR)]);
  await db.query('update cj.profiles set radar_key_hash = $1 where id = $2', [jovemMod.hashVinculo('99900000002'), P.coord]);
  await db.query('update cj.profiles set radar_key_hash = $1 where id = $2', [jovemMod.hashVinculo('99900000001'), P.pastor]);
  for (const t of testesHandler) {
    try { await t.fn(); marcar(true, t.nome); }
    catch (e) { marcar(false, t.nome, e instanceof Falha ? e.message : `erro inesperado: ${e.code || ''} ${e.message}`); }
  }

  await db.end();
  console.log(`\nResultado: ${ok} passaram, ${falhou} falharam (total ${ok + falhou}).`);
  process.exit(falhou ? 1 : 0);
}

principal().catch((e) => { console.error('ERRO FATAL:', e); process.exit(1); });
