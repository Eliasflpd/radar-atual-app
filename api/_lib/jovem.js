// ═══════════════════════════════════════════════════════════════════════════════
// CONEXÃO JOVEM — função do módulo (fn=jovem no roteador api/dados.js)
// Módulo 1 (17/11/2026): identidade, login pelo crachá do Radar e gestão de pessoas.
// Módulo 2 (17/11/2026): Círculos (gestão, líder/auxiliar e jovem) — migração 003.
// Módulo 3 (17/11/2026): Eventos (gestão, líder do círculo, inscrição, autorização,
//                        lista de espera, check-in/out e .ics) — migração 004.
// Origem: conexao-jovem/api-proposta/jovem.js (Fase 2), revisada e testada em
// conexao-jovem/testes/ (Postgres local descartável).
//
// ⚠️ NÃO PODE QUEBRAR O RADAR. Este arquivo é carregado pelo api/dados.js junto com
//    todas as outras rotas. Por isso:
//     · nada aqui roda no carregamento (o `pg` só é pedido na primeira chamada);
//     · sem CJ_DB_URL / CJ_VINCULO_SEGREDO / banco do Radar, a rota responde
//       200 { ok:false, motivo:'nao_configurado' } — sem exceção e sem tocar em banco
//       (200 de propósito: o app cai no modo demonstração sem sujar o console);
//     · qualquer erro inesperado vira JSON 500, nunca exceção para o roteador.
//
// COMO A PESSOA É IDENTIFICADA (recomendação "A" do PLANO-FASE2.md):
//  1. O app do Radar guarda no aparelho o CRACHÁ (localStorage 'radar_chave'),
//     emitido só depois que a pessoa provou o WhatsApp com o código (api/cadastros.js).
//  2. O /jovem/ manda esse crachá no cabeçalho `x-radar-chave` (nunca na URL).
//  3. Aqui, o crachá vira o dono (user_key = telefone em dígitos) olhando SÓ O HASH
//     em radar_chaves, no banco do Radar — leitura apenas; nada é escrito no Radar.
//  4. O telefone vira um HMAC (CJ_VINCULO_SEGREDO) e acha o perfil em cj.profiles,
//     no banco do Conexão Jovem (CJ_DB_URL). O schema cj não guarda telefone.
//     O mesmo HMAC é usado no pré-cadastro feito pela liderança: quando o dono do
//     número entra, o perfil já está lá e se vincula sozinho.
//  5. Cada ação roda numa transação com `set local role authenticated` e
//     `request.jwt.claims = {sub: <id do perfil>}`. Quem decide o que a pessoa vê e
//     pode fazer é o RLS / as funções do banco (testadas), não este código.
//     Nenhum token vai para o navegador; nenhuma service role é usada.
//
//   POST /api/dados?fn=jovem   corpo: { acao: 'eu', ...parâmetros }
//   cabeçalho: x-radar-chave: rk_...
// Tudo é POST (inclusive leituras) para o crachá nunca ir parar em URL/log.
// ═══════════════════════════════════════════════════════════════════════════════
'use strict';
const crypto = require('crypto');

// ─── validação de entrada ─────────────────────────────────────────────────────
class ErroEntrada extends Error { constructor(m) { super(m); this.status = 400; } }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuid(v, campo) { const s = String(v == null ? '' : v); if (!UUID.test(s)) throw new ErroEntrada(campo + ' inválido'); return s.toLowerCase(); }
function texto(v, campo, min, max) {
  const s = (v == null ? '' : String(v)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (s.length < min || s.length > max) throw new ErroEntrada(campo + ` precisa ter entre ${min} e ${max} caracteres`);
  return s;
}
function opcional(v, campo, max) { return v == null || v === '' ? null : texto(v, campo, 1, max); }
function umDe(v, campo, lista) { if (!lista.includes(v)) throw new ErroEntrada(campo + ' inválido'); return v; }
function lista(v, campo, permitidos, max) {
  if (!Array.isArray(v) || v.length > max) throw new ErroEntrada(campo + ' inválido');
  v.forEach((x) => { if (!permitidos.includes(x)) throw new ErroEntrada(campo + ' inválido'); });
  return v;
}
function indices(v, max) {
  if (!Array.isArray(v) || v.length > max) throw new ErroEntrada('ações inválidas');
  return v.map((n) => { const i = Number(n); if (!Number.isInteger(i) || i < 0 || i > 20) throw new ErroEntrada('ações inválidas'); return i; });
}
function dataHora(v, campo) {
  const d = new Date(String(v || ''));
  if (isNaN(d.getTime())) throw new ErroEntrada(campo + ' inválida');
  return d.toISOString();
}
const FAIXAS = ['15-17', '18-21', '22-25'];
const TALENTOS = ['louvor', 'instrumentos', 'midia', 'foto', 'video', 'recepcao', 'esporte', 'teatro', 'social', 'ensino', 'missoes'];
const DISPONIBILIDADE = ['sabado_manha', 'sabado_tarde', 'domingo', 'semana_noite'];

// ─── vínculo Radar → Conexão Jovem ───────────────────────────────────────────
// O Radar guarda o WhatsApp como o usuário digitou (só dígitos): brasileiro quase
// sempre SEM o 55 (DDD + número), estrangeiro COM o código do país. Para o
// pré-cadastro da liderança casar com o crachá, os dois lados passam por aqui:
// "55" + número brasileiro válido vira só DDD + número.
const DDD_BR = new Set(('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 ' +
  '51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99').split(' '));
function pareceBrasil(d) {
  if (!/^\d+$/.test(d) || (d.length !== 10 && d.length !== 11)) return false;
  if (!DDD_BR.has(d.slice(0, 2))) return false;
  return d.length === 11 ? d[2] === '9' : true;
}
function telefoneCanonico(v) {
  let d = String(v == null ? '' : v).replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55') && pareceBrasil(d.slice(2))) d = d.slice(2);
  return d;
}
// HMAC e não SHA puro: telefone tem pouca entropia e um SHA dele se quebra por força bruta.
function hashVinculo(userKey) {
  const segredo = process.env.CJ_VINCULO_SEGREDO || '';
  if (segredo.length < 32) throw new Error('CJ_VINCULO_SEGREDO ausente ou curto');
  return crypto.createHmac('sha256', segredo).update('cj:' + telefoneCanonico(userKey)).digest('hex');
}
function whatsapp(v) {
  const d = telefoneCanonico(v);
  if (d.length < 10 || d.length > 15) throw new ErroEntrada('WhatsApp inválido: use DDD + número (10 ou 11 dígitos)');
  return d;
}
// ─── Eventos (Módulo 3) ───────────────────────────────────────────────────────
const CATEGORIAS = ['culto', 'estudo', 'esporte', 'acao_social', 'circulo', 'acampamento', 'ensaio', 'treinamento'];
const CAMPOS_EVENTO = `id, titulo, categoria, descricao, inicio, fim, local, faixas::text[] as faixas, autorizacao, capacidade, vagas,
  acessibilidade, orientacoes, responsavel, contato, regras_menores, circulo, status, motivo_cancelamento, minha_inscricao,
  minha_autorizacao, posicao_espera, autorizacao_geral`;
// iCalendar (RFC 5545): texto escapado, linhas dobradas em 75 octetos, horários em UTC.
function icsTexto(v) { return String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
function icsData(d) { return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
function icsDobra(l) {
  const out = []; let atual = '', tam = 0;
  for (const ch of l) { const n = Buffer.byteLength(ch, 'utf8'); if (tam + n > 74) { out.push(atual); atual = ' '; tam = 1; } atual += ch; tam += n; }
  out.push(atual); return out.join('\r\n');
}
function icsEvento(ev) {
  const fim = ev.fim || new Date(new Date(ev.inicio).getTime() + 2 * 3600e3).toISOString();
  const desc = [ev.descricao, ev.orientacoes ? 'Orientações: ' + ev.orientacoes : '', ev.responsavel ? 'Responsável: ' + ev.responsavel : '',
                ev.contato ? 'Contato: ' + ev.contato : ''].filter(Boolean).join('\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Conexao Jovem//Eventos//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    'UID:' + ev.id + '@conexao-jovem', 'DTSTAMP:' + icsData(new Date()), 'DTSTART:' + icsData(ev.inicio), 'DTEND:' + icsData(fim),
    'SUMMARY:' + icsTexto(ev.titulo), ev.local ? 'LOCATION:' + icsTexto(ev.local) : '', desc ? 'DESCRIPTION:' + icsTexto(desc) : '',
    ev.status === 'cancelado' ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR']
    .filter(Boolean).map(icsDobra).join('\r\n') + '\r\n';
}
const PAPEIS = ['member', 'circle_leader', 'assistant', 'youth_admin', 'pastor', 'safeguarding_admin'];

// ─── executa como o usuário: daqui para dentro, vale o RLS ────────────────────
async function comoUsuario(c, uid, fn) {
  await c.query('begin');
  try {
    await c.query("set local statement_timeout = '5s'");
    await c.query('set local role authenticated');
    await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, role: 'authenticated' })]);
    const r = await fn(c);
    await c.query('commit');
    return r;
  } catch (e) {
    try { await c.query('rollback'); } catch (_) { /* conexão já caiu */ }
    throw e;
  }
}

const linhas = async (c, sql, p) => (await c.query(sql, p)).rows;
const linha = async (c, sql, p) => (await c.query(sql, p)).rows[0] || null;

// ═══════════════════════════════════════════════════════════════════════════════
// AÇÕES. Todas usam auth.uid() no SQL: o id da pessoa nunca vem do corpo da requisição.
// Cada uma corresponde a uma tela/ação do protótipo (public/jovem/cj.js).
// ═══════════════════════════════════════════════════════════════════════════════
const ACOES = {
  // Perfil e preferências (tela 13) + estado do consentimento (tela 03)
  perfil: async (c) => ({
    perfil: await linha(c, `select id, display_name, age_band, bio, interests, show_full_name, notification_prefs, status
                              from cj.profiles where id = auth.uid()`),
    papeis: (await linhas(c, 'select role from cj.roles where user_id = auth.uid()')).map((r) => r.role),
    consentimento: await linha(c, `select status, allow_social, allow_events, allow_image from cj.guardian_consents
                                    where minor_id = auth.uid() order by created_at desc limit 1`),
    pode_social: (await linha(c, 'select cj.pode_social() as ok')).ok
  }),

  // `sobre` só muda quando vem no corpo (antes, qualquer atualização apagava o "sobre mim").
  atualizar_perfil: async (c, b) => linha(c,
    `update cj.profiles set display_name = coalesce($1, display_name), bio = case when $6::boolean then $2 else bio end,
            interests = coalesce($3, interests), show_full_name = coalesce($4, show_full_name),
            notification_prefs = coalesce($5, notification_prefs)
      where id = auth.uid() returning display_name, bio, interests, show_full_name, notification_prefs`,
    [b.nome == null ? null : texto(b.nome, 'nome', 1, 60), opcional(b.sobre, 'sobre', 280),
     b.interesses == null ? null : (Array.isArray(b.interesses) ? b.interesses : []).slice(0, 12).map((x) => texto(x, 'interesse', 1, 30)),
     typeof b.nome_completo === 'boolean' ? b.nome_completo : null,
     b.notificacoes && typeof b.notificacoes === 'object' ? JSON.stringify({
       palavra: !!b.notificacoes.palavra, circulo: !!b.notificacoes.circulo, missao: !!b.notificacoes.missao,
       hora: /^\d{2}:\d{2}$/.test(b.notificacoes.hora || '') ? b.notificacoes.hora : '07:00' }) : null,
     Object.prototype.hasOwnProperty.call(b, 'sobre')]),

  aceitar_termos: async (c, b) => {
    const docs = lista(b.documentos, 'documentos', ['termos_uso', 'privacidade', 'regras_comunidade'], 3);
    await c.query(`insert into cj.term_acceptances(user_id, document, version)
                   select auth.uid(), d, $2 from unnest($1::text[]) d on conflict do nothing`,
                  [docs, texto(b.versao, 'versão', 1, 20)]);
    return { ok: true };
  },

  pedir_consentimento: async (c, b) => linha(c,
    `insert into cj.guardian_consents(minor_id, guardian_name, guardian_relationship, guardian_contact,
                                      allow_social, allow_events, allow_image, policy_version)
     values (auth.uid(), $1, $2, $3, $4, $5, $6, $7) returning id, status`,
    [texto(b.responsavel, 'nome do responsável', 3, 120), umDe(b.parentesco, 'parentesco', ['mae', 'pai', 'responsavel_legal', 'outro']),
     texto(b.contato, 'contato do responsável', 8, 120), !!b.social, !!b.eventos, !!b.imagem, texto(b.versao, 'versão', 1, 20)]),

  // Início (tela 04): só o relevante, sem feed.
  inicio: async (c) => ({
    devocional: await linha(c, `select id, publish_date, title, scripture_reference, verse_text from cj.devotionals
                                 where status = 'publicado' and publish_date <= (now() at time zone 'America/Sao_Paulo')::date
                                 order by publish_date desc limit 1`),
    eventos: await linhas(c, `select id, title, category, start_at, location from cj.events
                               where status = 'publicado' and start_at > now() order by start_at limit 3`),
    circulo: await linha(c, `select ci.id, ci.name,
                                    (select min(m.starts_at) from cj.circle_meetings m
                                      where m.circle_id = ci.id and m.starts_at > now() and m.status = 'confirmado') as proximo_encontro
                               from cj.circle_members cm join cj.circles ci on ci.id = cm.circle_id
                              where cm.user_id = auth.uid() and cm.membership_status = 'ativo'`),
    missao: await linha(c, `select id, title from cj.missions where status = 'publicado'
                              and current_date between start_at and end_at order by start_at desc limit 1`)
  }),

  // ─── MÓDULO 2 · Círculos (dossiê 6.3) ────────────────────────────────────────
  // Meu Círculo (tela 05). Sem círculo: os da minha faixa (tela "Encontrar um círculo").
  // O local do encontro só chega a quem é integrante: o RLS de circle_meetings decide.
  circulo: async (c) => {
    const ci = await linha(c, `select ci.id, ci.name, ci.description, ci.age_band, ci.max_members, cm.change_requested,
                                      cm.change_note, cm.joined_at
                                 from cj.circle_members cm join cj.circles ci on ci.id = cm.circle_id
                                where cm.user_id = auth.uid() and cm.membership_status = 'ativo'`);
    const pode_social = (await linha(c, 'select cj.pode_social() as ok')).ok;
    if (!ci) return { circulo: null, pode_social, disponiveis: await ACOES.circulos_disponiveis(c) };
    return {
      circulo: ci,
      pode_social,
      lideres: await linhas(c, `select cj.nome_publico(x.id) as nome, x.papel from (
                                  select leader_id as id, 'Líder' as papel from cj.circles where id = $1 and leader_id is not null
                                  union all select assistant_id, 'Auxiliar' from cj.circles where id = $1 and assistant_id is not null) x`, [ci.id]),
      integrantes: await linhas(c, `select cj.nome_publico(user_id) as nome, user_id = auth.uid() as eu from cj.circle_members
                                     where circle_id = $1 and membership_status = 'ativo' order by joined_at`, [ci.id]),
      encontros: await linhas(c, `select m.id, m.starts_at, m.theme, m.place_note, m.status, r.response as minha_resposta,
                                         m.proposed_by = auth.uid() as minha_proposta
                                    from cj.circle_meetings m
                                    left join cj.meeting_rsvps r on r.meeting_id = m.id and r.user_id = auth.uid()
                                   where m.circle_id = $1 and m.starts_at > now() - interval '6 hours'
                                     and m.status in ('proposto','confirmado','cancelado')
                                   order by m.starts_at limit 6`, [ci.id])
    };
  },
  circulos_disponiveis: async (c) => linhas(c, `select id, nome, descricao, faixa, limite, vagas, lider, auxiliar, meu_pedido, sou_integrante
                                                 from cj.circulos_disponiveis()`),
  pedir_circulo: async (c, b) => ({ circulo: uuid(b.circulo, 'círculo'),
    membership_status: (await linha(c, 'select cj.pedir_entrada($1) as s', [uuid(b.circulo, 'círculo')])).s }),
  cancelar_pedido_circulo: async (c, b) => {
    const r = await linha(c, `delete from cj.circle_members where circle_id = $1 and user_id = auth.uid() and membership_status = 'solicitado'
                              returning circle_id`, [uuid(b.circulo, 'círculo')]);
    if (!r) throw Object.assign(new Error('pedido não encontrado'), { code: 'P0002' });
    return { ok: true };
  },
  pedir_troca: async (c, b) => ({ change_requested: (await linha(c, 'select cj.pedir_troca($1, $2) as t',
    [b.trocar !== false, opcional(b.motivo, 'motivo', 300)])).t }),
  sair_circulo: async (c, b) => {
    if (b.confirmo !== 'SAIR') throw new ErroEntrada('confirmação ausente');
    await c.query('select cj.sair_do_circulo()'); return { ok: true };
  },
  // Integrante PROPÕE (o gatilho força 'proposto'); líder/gestão pode já confirmar.
  propor_encontro: async (c, b) => {
    const quando = dataHora(b.quando, 'data');
    if (new Date(quando).getTime() < Date.now()) throw new ErroEntrada('Escolha uma data futura');
    return linha(c, `insert into cj.circle_meetings(circle_id, starts_at, theme, place_note, status)
                     values ($1, $2, $3, $4, $5) returning id, status`,
      [uuid(b.circulo, 'círculo'), quando, opcional(b.tema, 'tema', 200), opcional(b.local, 'local', 200), b.confirmar === true ? 'confirmado' : 'proposto']);
  },
  responder_presenca: async (c, b) => linha(c, `insert into cj.meeting_rsvps(meeting_id, user_id, response) values ($1, auth.uid(), $2)
                                                on conflict (meeting_id, user_id) do update set response = excluded.response
                                                returning response`, [uuid(b.encontro, 'encontro'), umDe(b.resposta, 'resposta', ['sim', 'nao'])]),

  // Líder/auxiliar: os círculos que eu conduzo (cj.lidera_circulo: só ativos e com o papel).
  lider_circulos: async (c) => linhas(c, `select ci.id, ci.name as nome, ci.age_band as faixa, ci.max_members as limite,
                                                 case when ci.leader_id = auth.uid() then 'lider' else 'auxiliar' end as meu_papel,
                                                 (select count(*) from cj.circle_members m where m.circle_id = ci.id and m.membership_status = 'ativo')::int as ativos,
                                                 (select count(*) from cj.circle_members m where m.circle_id = ci.id and m.membership_status = 'solicitado')::int as pedidos,
                                                 (select min(m.starts_at) from cj.circle_meetings m where m.circle_id = ci.id and m.status = 'confirmado' and m.starts_at > now()) as proximo
                                            from cj.circles ci where cj.lidera_circulo(ci.id) order by ci.name`),
  // Um círculo, visto por quem conduz (líder/auxiliar) ou pela equipe: integrantes, pedidos,
  // encontros e quem confirmou presença. Integrante comum recebe 403 do banco.
  gerir_circulo: async (c, b) => {
    const id = uuid(b.circulo, 'círculo');
    const integrantes = await linhas(c, `select user_id as id, nome, situacao, faixa, menor, autorizacao_ok, pedido_em, entrou_em,
                                                quer_trocar, motivo_troca, papel from cj.integrantes_do_circulo($1)`, [id]);
    const circulo = await linha(c, `select ci.id, ci.name as nome, ci.description as descricao, ci.age_band as faixa, ci.max_members as limite,
                                           ci.status, ci.leader_id as lider_id, ci.assistant_id as auxiliar_id,
                                           cj.nome_publico(ci.leader_id) as lider, cj.nome_publico(ci.assistant_id) as auxiliar,
                                           cj.lidera_circulo(ci.id) as conduzo
                                      from cj.circles ci where ci.id = $1`, [id]);
    const encontros = await linhas(c, `select m.id, m.starts_at, m.theme, m.place_note, m.status, cj.nome_publico(m.proposed_by) as proposto_por,
                                              coalesce((select json_agg(json_build_object('nome', cj.nome_publico(r.user_id), 'resposta', r.response) order by r.response desc)
                                                          from cj.meeting_rsvps r where r.meeting_id = m.id), '[]'::json) as presencas
                                         from cj.circle_meetings m
                                        where m.circle_id = $1 and m.starts_at > now() - interval '30 days'
                                        order by (m.starts_at < now()), m.starts_at limit 12`, [id]);
    return { circulo, integrantes, encontros };
  },
  atualizar_encontro: async (c, b) => {
    await c.query('select cj.atualizar_encontro($1, $2, $3, $4, $5)', [uuid(b.encontro, 'encontro'),
      b.status ? umDe(b.status, 'situação', ['proposto', 'confirmado', 'realizado', 'cancelado']) : null,
      b.quando ? dataHora(b.quando, 'data') : null, opcional(b.tema, 'tema', 200), opcional(b.local, 'local', 200)]);
    return { ok: true };
  },

  // Gestão (youth_admin/pastor; a proteção só consulta): lista, candidatos a líder/auxiliar
  // e pedidos de troca. O RLS da equipe libera a leitura; as escritas são funções auditadas.
  circulos_gestao: async (c) => {
    const eq = (await linha(c, 'select cj.eh_equipe() as e, cj.eh_gestao() as g'));
    if (!eq.e) throw Object.assign(new Error('sem permissão'), { code: '42501' });
    return {
      gestao: eq.g,
      circulos: await linhas(c, `select ci.id, ci.name as nome, ci.description as descricao, ci.age_band as faixa, ci.max_members as limite,
                                        ci.status, ci.leader_id as lider_id, ci.assistant_id as auxiliar_id,
                                        lp.display_name as lider, ap.display_name as auxiliar,
                                        (select count(*) from cj.circle_members m where m.circle_id = ci.id and m.membership_status = 'ativo')::int as ativos,
                                        (select count(*) from cj.circle_members m where m.circle_id = ci.id and m.membership_status = 'solicitado')::int as pedidos,
                                        (select count(*) from cj.circle_members m where m.circle_id = ci.id and m.membership_status = 'ativo' and m.change_requested)::int as trocas,
                                        (select min(m.starts_at) from cj.circle_meetings m where m.circle_id = ci.id and m.status = 'confirmado' and m.starts_at > now()) as proximo
                                   from cj.circles ci
                                   left join cj.profiles lp on lp.id = ci.leader_id
                                   left join cj.profiles ap on ap.id = ci.assistant_id
                                  where ci.status <> 'encerrado'
                                  order by (ci.status = 'ativo') desc, ci.age_band, ci.name`),
      candidatos: await linhas(c, `select p.id, p.display_name as nome, p.age_band as faixa,
                                          array_agg(r.role::text order by r.role) as papeis
                                     from cj.profiles p join cj.roles r on r.user_id = p.id
                                    where p.status = 'ativo' and p.age_band <> '15-17' and r.role in ('circle_leader', 'assistant')
                                    group by p.id order by lower(p.display_name)`),
      trocas: await linhas(c, `select m.user_id as id, p.display_name as nome, p.age_band as faixa, ci.id as circulo_id, ci.name as circulo,
                                      case when cj.eh_gestao() then m.change_note end as motivo
                                 from cj.circle_members m join cj.profiles p on p.id = m.user_id join cj.circles ci on ci.id = m.circle_id
                                where m.membership_status = 'ativo' and m.change_requested order by p.display_name`)
    };
  },
  salvar_circulo: async (c, b) => {
    const limite = Number(b.limite);
    if (!Number.isInteger(limite)) throw new ErroEntrada('limite inválido');
    const r = await linha(c, 'select cj.salvar_circulo($1, $2, $3, $4, $5, $6, $7) as id',
      [b.id ? uuid(b.id, 'círculo') : null, texto(b.nome, 'nome', 2, 60), opcional(b.descricao, 'descrição', 600),
       umDe(b.faixa, 'faixa etária', FAIXAS), limite, b.lider ? uuid(b.lider, 'líder') : null, b.auxiliar ? uuid(b.auxiliar, 'auxiliar') : null]);
    return { id: r.id };
  },
  status_circulo: async (c, b) => { await c.query('select cj.definir_status_circulo($1, $2)', [uuid(b.circulo, 'círculo'),
    umDe(b.status, 'situação', ['ativo', 'pausado', 'encerrado'])]); return { ok: true }; },
  adicionar_ao_circulo: async (c, b) => { await c.query('select cj.adicionar_ao_circulo($1, $2, $3)', [uuid(b.circulo, 'círculo'),
    uuid(b.usuario, 'usuário'), b.mover === true]); return { ok: true }; },
  // Quem pode entrar num círculo desta faixa (para "Adicionar pessoa"): ativos da faixa.
  candidatos_circulo: async (c, b) => linhas(c, `select id, nome, circulo_id, circulo_nome, consentimento
                                                   from cj.listar_pessoas('ativo', $1, null, null, null)`, [umDe(b.faixa, 'faixa etária', FAIXAS)]),

  // Minha Jornada (tela 06): convite, não prova.
  jornada: async (c) => ({
    etapas: await linhas(c, `select id, step_code, title, description, day_start, day_end, actions, reading, suggested_meeting
                               from cj.journey_steps where age_band is null or age_band = cj.minha_faixa() order by sort_order`),
    progresso: await linhas(c, 'select step_id, status, actions_done from cj.journey_progress where user_id = auth.uid()')
  }),
  marcar_jornada: async (c, b) => linha(c,
    `insert into cj.journey_progress(user_id, step_id, actions_done, status, completed_at)
     values (auth.uid(), $1, $2, $3, case when $3 = 'concluida' then now() end)
     on conflict (user_id, step_id) do update set actions_done = excluded.actions_done, status = excluded.status,
                                                completed_at = excluded.completed_at
     returning step_id, status, actions_done`,
    [uuid(b.etapa, 'etapa'), indices(b.feitos || [], 10), umDe(b.status || 'em_andamento', 'status', ['em_andamento', 'concluida', 'pausada'])]),

  // Missão da Semana (tela 07)
  missao: async (c) => {
    const m = await linha(c, `select id, title, objective, actions, safety_notes, responsible, start_at, end_at, requires_guardian_auth
                                from cj.missions where status = 'publicado' and current_date between start_at and end_at
                               order by start_at desc limit 1`);
    return { missao: m, minha: m ? await linha(c, `select status, actions_done, optional_reflection from cj.mission_participation
                                                   where mission_id = $1 and user_id = auth.uid()`, [m.id]) : null };
  },
  participar_missao: async (c, b) => linha(c,
    `insert into cj.mission_participation(mission_id, user_id, status, actions_done, optional_reflection)
     values ($1, auth.uid(), $2, $3, $4)
     on conflict (mission_id, user_id) do update set status = excluded.status, actions_done = excluded.actions_done,
                                                   optional_reflection = excluded.optional_reflection
     returning status`,
    [uuid(b.missao, 'missão'), umDe(b.status || 'aceita', 'status', ['aceita', 'concluida', 'desistiu']), indices(b.feitos || [], 10),
     opcional(b.reflexao, 'reflexão', 1000)]),

  // ─── MÓDULO 3 · Eventos (dossiê 6.7) ─────────────────────────────────────────
  // Eventos (tela 08): publicados da minha faixa (e do meu círculo), com vagas e a minha
  // inscrição; também os cancelados em que eu estava inscrito. Filtro opcional por categoria.
  eventos: async (c, b) => linhas(c, `select ${CAMPOS_EVENTO} from cj.meus_eventos($1)`,
    [b.categoria ? umDe(b.categoria, 'categoria', CATEGORIAS) : null]),
  evento: async (c, b) => {
    const ev = await linha(c, `select ${CAMPOS_EVENTO} from cj.meus_eventos(null) where id = $1`, [uuid(b.evento, 'evento')]);
    if (!ev) throw Object.assign(new Error('Evento não encontrado ou não disponível para você'), { code: 'P0002' });
    return ev;
  },
  // O servidor decide o status (confirmada · aguardando_autorizacao · lista_espera): gatilho cj.trg_inscricao.
  inscrever: async (c, b) => {
    const id = uuid(b.evento, 'evento');
    await c.query(`insert into cj.event_registrations(event_id, user_id) values ($1, auth.uid())
                   on conflict (event_id, user_id) do update
                     set status = case when cj.event_registrations.status = 'cancelada' then 'confirmada' else cj.event_registrations.status end`, [id]);
    return linha(c, 'select minha_inscricao as status, minha_autorizacao as consent_status, posicao_espera, vagas from cj.meus_eventos(null) where id = $1', [id]);
  },
  // Cancelar abre a vaga: o gatilho t_espera promove a 1ª pessoa da lista de espera.
  cancelar_inscricao: async (c, b) => {
    const r = await linha(c, `update cj.event_registrations set status = 'cancelada'
                               where event_id = $1 and user_id = auth.uid() and status <> 'cancelada' returning status`, [uuid(b.evento, 'evento')]);
    if (!r) throw Object.assign(new Error('Inscrição não encontrada'), { code: 'P0002' });
    return r;
  },
  // Arquivo .ics (agenda do celular) de um evento que eu posso ver.
  evento_ics: async (c, b) => {
    const ev = await ACOES.evento(c, b);
    return { nome: 'evento-' + ev.id.slice(0, 8) + '.ics', conteudo: icsEvento(ev) };
  },

  // Painel · Eventos: equipe vê todos; líder/auxiliar, os do círculo que conduz (o banco decide).
  eventos_gestao: async (c) => {
    const eventos = await linhas(c, `select id, titulo, categoria, inicio, fim, local, faixas::text[] as faixas, autorizacao, capacidade, status,
                                            circulo_id, circulo, pode_editar, confirmados, aguardando, espera, presentes
                                       from cj.eventos_gestao()`);
    const eq = await linha(c, 'select cj.eh_equipe() as e, cj.eh_gestao() as g');
    return {
      gestao: eq.g, equipe: eq.e, eventos,
      // Círculos em que posso criar evento: gestão = todos os ativos; líder = os que conduz.
      circulos: await linhas(c, `select id, name as nome, age_band as faixa from cj.circles
                                  where status = 'ativo' and (cj.eh_gestao() or cj.lidera_circulo(id)) order by name`)
    };
  },
  // Um evento visto pela gestão/líder: todos os campos + inscritos (consulta auditada).
  gerir_evento: async (c, b) => {
    const id = uuid(b.evento, 'evento');
    const inscritos = await linhas(c, `select user_id as id, nome, faixa, menor, status, autorizacao, autorizacao_geral, responsavel,
                                              contato_responsavel, posicao_espera, inscrito_em, entrada_em, saida_em, retirado_por
                                         from cj.inscritos_evento($1)`, [id]);
    const evento = await linha(c, `select e.id, e.title as titulo, e.category as categoria, e.description as descricao, e.start_at as inicio,
                                          e.end_at as fim, e.location as local, e.age_bands::text[] as faixas, e.requires_guardian_auth as autorizacao,
                                          e.capacity as capacidade, e.accessibility as acessibilidade, e.guidance as orientacoes,
                                          e.responsible as responsavel, e.contact as contato, e.minor_rules as regras_menores,
                                          e.circle_id as circulo_id, ci.name as circulo, e.status, e.cancel_reason as motivo_cancelamento,
                                          cj.gere_evento(e.id) as pode_editar, cj.eh_equipe() as decido_autorizacao
                                     from cj.events e left join cj.circles ci on ci.id = e.circle_id where e.id = $1`, [id]);
    if (!evento) throw Object.assign(new Error('evento não encontrado'), { code: 'P0002' });
    return { evento, inscritos };
  },
  salvar_evento: async (c, b) => {
    const cap = b.capacidade == null || b.capacidade === '' ? null : Number(b.capacidade);
    if (cap !== null && !Number.isInteger(cap)) throw new ErroEntrada('capacidade inválida');
    const dados = {
      titulo: texto(b.titulo, 'título', 3, 120), categoria: umDe(b.categoria, 'categoria', CATEGORIAS),
      descricao: opcional(b.descricao, 'descrição', 2000), inicio: dataHora(b.inicio, 'data de início'),
      fim: b.fim ? dataHora(b.fim, 'data de fim') : null, local: opcional(b.local, 'local', 200),
      faixas: b.circulo ? [] : lista(b.faixas || [], 'faixas etárias', FAIXAS, 3), autorizacao: b.autorizacao === true, capacidade: cap,
      acessibilidade: opcional(b.acessibilidade, 'acessibilidade', 500), orientacoes: opcional(b.orientacoes, 'orientações', 1000),
      responsavel: opcional(b.responsavel, 'responsável', 120), contato: opcional(b.contato, 'contato', 120),
      regras_menores: opcional(b.regras_menores, 'regras para menores', 1000), circulo: b.circulo ? uuid(b.circulo, 'círculo') : null
    };
    const r = await linha(c, 'select cj.salvar_evento($1, $2) as id', [b.id ? uuid(b.id, 'evento') : null, JSON.stringify(dados)]);
    return { id: r.id };
  },
  status_evento: async (c, b) => {
    await c.query('select cj.definir_status_evento($1, $2, $3)', [uuid(b.evento, 'evento'),
      umDe(b.status, 'situação', ['rascunho', 'publicado', 'cancelado', 'encerrado']), opcional(b.motivo, 'motivo', 300)]);
    return { ok: true };
  },
  autorizar_evento: async (c, b) => {
    await c.query('select cj.decidir_autorizacao_evento($1, $2, $3)', [uuid(b.evento, 'evento'), uuid(b.usuario, 'usuário'), b.aprovado === true]);
    return { ok: true };
  },
  presenca_evento: async (c, b) => {
    await c.query('select cj.registrar_presenca_evento($1, $2, $3, $4)', [uuid(b.evento, 'evento'), uuid(b.usuario, 'usuário'),
      umDe(b.tipo, 'tipo', ['entrada', 'saida', 'desfazer']), opcional(b.obs, 'retirado por', 120)]);
    return { ok: true };
  },

  // Palavra (tela 09). O DIÁRIO NÃO VEM PARA CÁ: continua só no aparelho.
  devocionais: async (c) => linhas(c, `select id, publish_date, title, scripture_reference, verse_text, reflection, question, prayer, readings
                                         from cj.devotionals where status = 'publicado'
                                          and publish_date <= (now() at time zone 'America/Sao_Paulo')::date
                                        order by publish_date desc limit 7`),

  // Comunidade (tela 10): página fixa (sem rolagem infinita), sem curtidas/ranking.
  mural: async (c, b) => {
    const aba = umDe(b.aba || 'geral', 'aba', ['geral', 'circulo', 'testemunhos']);
    const filtro = aba === 'circulo' ? 'p.circle_id is not null'
      : aba === 'testemunhos' ? "p.circle_id is null and p.kind = 'testemunho'" : "p.circle_id is null and p.kind <> 'testemunho'";
    return linhas(c, `select p.id, p.kind, p.body, p.created_at, p.moderation_status, p.author_id = auth.uid() as meu,
                             cj.nome_publico(p.author_id) as autor,
                             (select count(*) from cj.content_comments k where k.post_id = p.id and k.moderation_status = 'aprovado')::int as comentarios
                        from cj.content_posts p where ${filtro} order by p.created_at desc limit 20`);
  },
  comentarios: async (c, b) => linhas(c, `select id, body, created_at, cj.nome_publico(author_id) as autor from cj.content_comments
                                           where post_id = $1 order by created_at limit 50`, [uuid(b.post, 'publicação')]),
  publicar: async (c, b) => linha(c, `insert into cj.content_posts(author_id, circle_id, kind, body, testimony_consent)
                                      values (auth.uid(), $1, $2, $3, $4) returning id, moderation_status`,
    [b.circulo ? uuid(b.circulo, 'círculo') : null, umDe(b.tipo || 'mural', 'tipo', ['mural', 'testemunho']),
     texto(b.texto, 'texto', 1, 1000), b.tipo === 'testemunho' ? b.consentimento_testemunho === true : false]),
  comentar: async (c, b) => linha(c, `insert into cj.content_comments(post_id, author_id, body) values ($1, auth.uid(), $2)
                                      returning id, moderation_status`, [uuid(b.post, 'publicação'), texto(b.texto, 'texto', 1, 500)]),
  denunciar: async (c, b) => linha(c, `insert into cj.reports(reporter_id, target_type, target_id, reason, details)
                                       values (auth.uid(), $1, $2, $3, $4) returning id, status`,
    [umDe(b.tipo, 'tipo', ['post', 'comentario', 'perfil', 'evento', 'circulo', 'outro']), b.alvo ? uuid(b.alvo, 'alvo') : null,
     umDe(b.motivo, 'motivo', ['ofensa', 'assedio', 'conteudo_improprio', 'risco_seguranca', 'spam', 'outro']), opcional(b.detalhes, 'detalhes', 1000)]),
  // Silenciar alguém a partir de um post (o cliente não conhece o id da pessoa).
  silenciar_autor: async (c, b) => linha(c, `insert into cj.user_blocks(blocker_id, blocked_id)
                                             select auth.uid(), p.author_id from cj.content_posts p where p.id = $1 and p.author_id <> auth.uid()
                                             on conflict do nothing returning blocked_id is not null as ok`, [uuid(b.post, 'publicação')]),
  dessilenciar_todos: async (c) => { await c.query('delete from cj.user_blocks where blocker_id = auth.uid()'); return { ok: true }; },

  // Talentos e Serviço (tela 11)
  talentos: async (c) => linha(c, 'select talents, availability, note, status from cj.talent_interests where user_id = auth.uid()'),
  salvar_talentos: async (c, b) => linha(c,
    `insert into cj.talent_interests(user_id, talents, availability, note) values (auth.uid(), $1, $2, $3)
     on conflict (user_id) do update set talents = excluded.talents, availability = excluded.availability, note = excluded.note
     returning status`,
    [lista(b.talentos || [], 'talentos', TALENTOS, 11), lista(b.disponibilidade || [], 'disponibilidade', DISPONIBILIDADE, 4), opcional(b.obs, 'observação', 300)]),

  // Acolhimento (tela 12). "Só para mim" fica no aparelho e nem chega aqui.
  orar: async (c, b) => linha(c, `insert into cj.prayer_requests(owner_id, body, visibility) values (auth.uid(), $1, $2)
                                  returning id, status, visibility`,
    [texto(b.texto, 'pedido', 3, 2000), umDe(b.visibilidade || 'equipe_pastoral', 'visibilidade', ['equipe_pastoral', 'somente_pastor'])]),
  meus_pedidos: async (c) => linhas(c, `select id, body, visibility, status, created_at from cj.prayer_requests
                                         where owner_id = auth.uid() order by created_at desc limit 30`),
  apagar_pedido: async (c, b) => { await c.query('delete from cj.prayer_requests where id = $1 and owner_id = auth.uid()', [uuid(b.id, 'pedido')]); return { ok: true }; },
  pedir_conversa: async (c, b) => linha(c, `insert into cj.conversation_requests(requester_id, category, note, preferred_channel)
                                            values (auth.uid(), $1, $2, $3) returning id, status, response_due_at`,
    [umDe(b.categoria, 'categoria', ['fe_duvidas', 'relacionamentos', 'familia', 'estudo_trabalho', 'saude_emocional', 'protecao', 'outro']),
     opcional(b.obs, 'observação', 500),
     umDe(b.canal || 'presencial_na_igreja', 'canal', ['presencial_na_igreja', 'ligacao_institucional', 'presencial_com_responsavel'])]),
  minhas_conversas: async (c) => linhas(c, `select id, category, status, response_due_at, created_at from cj.conversation_requests
                                             where requester_id = auth.uid() order by created_at desc limit 20`),

  // LGPD
  exportar: async (c) => (await linha(c, 'select cj.exportar_meus_dados() as dados')).dados,
  excluir_conta: async (c, b) => {
    if (b.confirmo !== 'EXCLUIR') throw new ErroEntrada('confirmação ausente');
    await c.query('select cj.excluir_minha_conta()');
    return { ok: true };
  },

  // ─── Painel de liderança (tela 14). O banco recusa (42501) quem não tem papel. ─
  painel: async (c) => (await linha(c, 'select cj.painel_indicadores() as p')).p,
  lider_pedidos_oracao: async (c) => linhas(c, 'select id, body, visibility, status, created_at, cj.nome_publico(owner_id) as nome from cj.ler_pedidos_oracao()'),
  lider_conversas: async (c) => linhas(c, `select id, category, note, preferred_channel, status, response_due_at, assigned_to,
                                                  cj.nome_publico(requester_id) as nome from cj.ler_conversas()`),
  lider_denuncias: async (c) => linhas(c, 'select id, target_type, target_id, reason, details, severity, status, created_at from cj.ler_denuncias()'),
  lider_fila_moderacao: async (c) => linhas(c, `select id, circle_id, kind, body, created_at, cj.nome_publico(author_id) as autor
                                                  from cj.content_posts where moderation_status = 'pendente' order by created_at limit 50`),
  lider_consentimentos: async (c) => linhas(c, `select id, minor_id, guardian_name, guardian_relationship, guardian_contact,
                                                       allow_social, allow_events, allow_image, created_at
                                                  from cj.guardian_consents where status = 'pendente' order by created_at`),
  moderar: async (c, b) => { await c.query('select cj.moderar($1, $2, $3)', [umDe(b.tipo, 'tipo', ['post', 'comentario']), uuid(b.id, 'id'),
    umDe(b.decisao, 'decisão', ['aprovado', 'rejeitado', 'removido'])]); return { ok: true }; },
  decidir_consentimento: async (c, b) => { await c.query('select cj.decidir_consentimento($1, $2, $3)', [uuid(b.id, 'id'),
    umDe(b.decisao, 'decisão', ['aprovado', 'recusado', 'revogado']), umDe(b.metodo, 'método', ['presencial', 'video_chamada', 'documento_assinado', 'outro'])]); return { ok: true }; },
  decidir_membro: async (c, b) => { await c.query('select cj.decidir_membro($1, $2, $3)', [uuid(b.circulo, 'círculo'), uuid(b.usuario, 'usuário'),
    umDe(b.status, 'status', ['ativo', 'recusado', 'removido'])]); return { ok: true }; },
  atribuir_conversa: async (c, b) => { await c.query('select cj.atribuir_conversa($1, $2)', [uuid(b.id, 'id'), uuid(b.responsavel, 'responsável')]); return { ok: true }; },
  tratar_denuncia: async (c, b) => { await c.query('select cj.tratar_denuncia($1, $2)', [uuid(b.id, 'id'),
    umDe(b.status, 'status', ['em_analise', 'resolvida', 'descartada'])]); return { ok: true }; },
  registrar_acolhimento: async (c, b) => { await c.query('select cj.registrar_acolhimento($1)', [uuid(b.usuario, 'usuário')]); return { ok: true }; },
  ativar_perfil: async (c, b) => { await c.query('select cj.definir_status_perfil($1, $2)', [uuid(b.usuario, 'usuário'),
    umDe(b.status || 'ativo', 'status', ['pendente', 'ativo', 'suspenso'])]); return { ok: true }; },

  // ─── MÓDULO 1 · Gestão de pessoas (tela "Pessoas" do painel) ─────────────────
  // Lista: só a equipe (o banco recusa os demais com 42501). Consulta auditada.
  pessoas: async (c, b) => {
    const f = b.filtros && typeof b.filtros === 'object' ? b.filtros : {};
    const status = f.status ? umDe(f.status, 'situação', ['todos', 'pendente', 'ativo', 'suspenso', 'nao_vinculado']) : null;
    const faixa = f.faixa ? umDe(f.faixa, 'faixa etária', FAIXAS) : null;
    const circulo = f.circulo ? (f.circulo === 'nenhum' ? 'nenhum' : uuid(f.circulo, 'círculo')) : null;
    const papel = f.papel ? umDe(f.papel, 'papel', PAPEIS) : null;
    const busca = opcional(f.busca, 'busca', 60);
    const pessoas = await linhas(c, `select id, nome, faixa, status, papeis::text[] as papeis, circulo_id, circulo_nome, vinculado,
                                          pre_cadastrado, regras_aceitas, consentimento, acolhido, criado_em
                                     from cj.listar_pessoas($1, $2, $3, $4, $5)`, [status, faixa, circulo, busca, papel]);
    return {
      pessoas,
      circulos: await linhas(c, "select id, name as nome, age_band as faixa from cj.circles where status = 'ativo' order by name"),
      pode_conceder: (await linha(c, 'select cj.papeis_que_concedo()::text[] as p')).p
    };
  },
  // Pré-cadastro pelo WhatsApp: o número vira HMAC AQUI; o banco nunca o vê.
  pre_cadastrar: async (c, b) => {
    const hash = hashVinculo(whatsapp(b.whatsapp));
    const r = await linha(c, 'select cj.pre_cadastrar($1, $2, $3, $4) as id',
      [hash, texto(b.nome, 'nome', 2, 60), umDe(b.faixa, 'faixa etária', FAIXAS), b.ativar !== false]);
    return { id: r.id };
  },
  conceder_papel: async (c, b) => { await c.query('select cj.conceder_papel($1, $2)', [uuid(b.usuario, 'usuário'), umDe(b.papel, 'papel', PAPEIS)]); return { ok: true }; },
  revogar_papel: async (c, b) => { await c.query('select cj.revogar_papel($1, $2)', [uuid(b.usuario, 'usuário'), umDe(b.papel, 'papel', PAPEIS)]); return { ok: true }; },
  desativar_pessoa: async (c, b) => { await c.query("select cj.definir_status_perfil($1, 'suspenso')", [uuid(b.usuario, 'usuário')]); return { ok: true }; },
  definir_faixa: async (c, b) => { await c.query('select cj.definir_faixa($1, $2)', [uuid(b.usuario, 'usuário'), umDe(b.faixa, 'faixa etária', FAIXAS)]); return { ok: true }; }
};
// Ações tratadas fora da tabela (precisam acontecer antes/sem o RLS do perfil).
const ESPECIAIS = ['entrar', 'eu', 'status'];

// Erros do banco → resposta curta, sem vazar detalhe interno. As mensagens que as
// NOSSAS funções/gatilhos levantam são escritas para a pessoa ler e vão em `mensagem`;
// as do próprio Postgres (permissão de tabela, constraint) não.
function amigavel(e) {
  const m = String((e && e.message) || '');
  if (!m || /permission denied|violates|row-level security|invalid input|duplicate key|null value|value too long/i.test(m)) return undefined;
  return m.slice(0, 160);
}
function traduzErro(e) {
  if (e instanceof ErroEntrada) return { status: 400, corpo: { ok: false, motivo: e.message, mensagem: e.message } };
  const cod = e && e.code;
  if (cod === '42501') return { status: 403, corpo: { ok: false, motivo: 'sem_permissao', mensagem: amigavel(e) } };
  if (cod === 'P0002') return { status: 404, corpo: { ok: false, motivo: 'nao_encontrado', mensagem: amigavel(e) } };
  if (cod === '23505') return { status: 409, corpo: { ok: false, motivo: 'ja_existe', mensagem: amigavel(e) } };
  if (['23514', '22023', '23503', '23502', '22P02', '22001'].includes(cod)) {
    const msg = amigavel(e);
    return { status: 400, corpo: { ok: false, motivo: msg && (cod === '23514' || cod === '22023') ? msg : 'dados_invalidos', mensagem: msg } };
  }
  return { status: 500, corpo: { ok: false, motivo: 'erro_interno' } };
}

function lerCorpo(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  if (Buffer.isBuffer(b)) { try { b = JSON.parse(b.toString('utf8')); } catch (_) { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}

// ─── configuração (sem ela, a rota diz "não configurado" e não toca em banco) ─
function configuracao(env) {
  const e = env || process.env;
  const cj = e.CJ_DB_URL || '';
  const radar = e.RADAR_DB_DATABASE_URL || e.RADAR_DB || '';
  const segredo = e.CJ_VINCULO_SEGREDO || '';
  const faltando = [];
  if (!cj) faltando.push('CJ_DB_URL');
  if (segredo.length < 32) faltando.push('CJ_VINCULO_SEGREDO');
  if (!radar) faltando.push('RADAR_DB_DATABASE_URL');
  return { ok: faltando.length === 0, faltando, cj, radar };
}
const NAO_CONFIGURADO = { ok: false, motivo: 'nao_configurado', mensagem: 'Módulo Conexão Jovem ainda não configurado.' };

// ─── fábrica do handler (injeção permite testar sem o banco do Radar) ─────────
// chave:    o módulo api/_lib/chave.js do Radar (usa só funções puras: sha,
//           daRequisicao, pareceTelefone — nada que escreva).
// conectar: () => Promise<pg.Client conectado> (banco do Conexão Jovem, schema cj)
// conectarRadar (opcional): banco onde está radar_chaves. Sem ele, usa a mesma conexão.
// configurado (opcional): () => boolean. Falso = responde "nao_configurado".
function criarHandler({ chave, conectar, conectarRadar, configurado }) {
  return async function jovem(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    // Sem CORS: só a própria página /jovem/ (mesma origem) chama.
    if (configurado && !configurado()) { res.status(200).json(NAO_CONFIGURADO); return; }
    if (req.method !== 'POST') { res.status(405).json({ ok: false, motivo: 'so_post' }); return; }
    const b = lerCorpo(req);
    const acao = String(b.acao || '');
    if (!ESPECIAIS.includes(acao) && !Object.prototype.hasOwnProperty.call(ACOES, acao)) {
      res.status(400).json({ ok: false, motivo: 'acao_desconhecida' }); return;
    }
    // 'status': o app pergunta se o módulo está no ar antes de existir crachá. Não lê nada.
    if (acao === 'status') { res.status(200).json({ ok: true, configurado: true }); return; }
    const segredo = chave.daRequisicao(req, {});   // só cabeçalho; nunca URL
    if (!segredo) { res.status(401).json({ ok: false, motivo: 'cracha_ausente' }); return; }

    let c, cr;
    try {
      cr = conectarRadar ? await conectarRadar() : null;
      c = await conectar();
      // 1) crachá → dono (LEITURA em radar_chaves; nada é escrito no Radar)
      const dono = await linha(cr || c, 'select user_key from radar_chaves where chave_hash = $1 limit 1', [chave.sha(segredo)]);
      if (cr) { try { await cr.end(); } catch (_) { /* ok */ } cr = null; }
      // Só gente que provou o WhatsApp (crachá de telefone). Id anônimo de aparelho não entra.
      if (!dono || !chave.pareceTelefone(dono.user_key)) { res.status(401).json({ ok: false, motivo: 'cracha_invalido' }); return; }

      // 2) dono → perfil (vínculo por HMAC)
      const vinculo = hashVinculo(dono.user_key);
      let perfil = await linha(c, 'select id, status from cj.profiles where radar_key_hash = $1', [vinculo]);
      const bloqueado = perfil && (perfil.status === 'suspenso' || perfil.status === 'encerrado');

      if (acao === 'eu') {
        if (!perfil) { res.status(200).json({ ok: true, dados: { perfil: null } }); return; }
        if (bloqueado) { res.status(200).json({ ok: true, dados: { perfil: { status: perfil.status } } }); return; }
        const dados = await comoUsuario(c, perfil.id, async (cx) => {
          const vinculou = (await linha(cx, 'select cj.confirmar_vinculo() as v')).v;
          return { perfil: (await linha(cx, 'select cj.quem_sou() as q')).q, acabou_de_vincular: vinculou };
        });
        res.status(200).json({ ok: true, dados }); return;
      }

      if (acao === 'entrar') {
        if (bloqueado) { res.status(403).json({ ok: false, motivo: 'perfil_' + perfil.status }); return; }
        let novo = false;
        if (!perfil) {
          // Único INSERT feito com o usuário do servidor: o perfil nasce 'pendente' e só a
          // liderança ativa (acolhimento humano). Nome e faixa validados aqui e no banco.
          const nome = texto(b.nome, 'nome', 2, 60), faixa = umDe(b.faixa, 'faixa etária', FAIXAS);
          perfil = await linha(c, `insert into cj.profiles(radar_key_hash, display_name, age_band) values ($1, $2, $3)
                                   on conflict (radar_key_hash) do update set radar_key_hash = excluded.radar_key_hash
                                   returning id, status, (xmax = 0) as novo`, [vinculo, nome, faixa]);
          novo = perfil.novo;
          await c.query('insert into cj.profile_private(user_id) values ($1) on conflict do nothing', [perfil.id]);
          if (novo) {
            await c.query(`insert into cj.audit_logs(actor_id, action, entity_type, entity_id, metadata)
                           values ($1, 'criar_perfil', 'profiles', $2, $3)`, [perfil.id, String(perfil.id), JSON.stringify({ faixa })]);
          }
        }
        const vinculou = await comoUsuario(c, perfil.id, async (cx) => (await linha(cx, 'select cj.confirmar_vinculo() as v')).v);
        res.status(200).json({ ok: true, status: perfil.status, novo, vinculou }); return;
      }

      if (!perfil) { res.status(404).json({ ok: false, motivo: 'sem_perfil' }); return; }
      if (bloqueado) { res.status(403).json({ ok: false, motivo: 'perfil_' + perfil.status }); return; }

      // 3) a ação roda COMO a pessoa: o RLS decide.
      const dados = await comoUsuario(c, perfil.id, (cx) => ACOES[acao](cx, b));
      res.status(200).json({ ok: true, dados: dados == null ? null : dados });
    } catch (e) {
      const t = traduzErro(e);
      if (t.status === 500) console.error('[jovem]', acao, (e && e.code) || '', String((e && e.message) || e).slice(0, 120));
      res.status(t.status).json(t.corpo);
    } finally {
      if (cr) { try { await cr.end(); } catch (_) { /* ok */ } }
      if (c) { try { await c.end(); } catch (_) { /* ok */ } }
    }
  };
}

// ─── handler padrão (o que o api/dados.js usa) ───────────────────────────────
// Nada de banco ou `pg` no carregamento: tudo na primeira chamada, e só se configurado.
let _padrao = null;
function handlerPadrao(req, res) {
  try {
    if (!configuracao().ok) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(NAO_CONFIGURADO);
      return;
    }
    if (!_padrao) {
      const { Client } = require('pg');
      const abrir = async (cs) => {
        const cl = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
        await cl.connect();
        return cl;
      };
      _padrao = criarHandler({
        chave: require('./chave.js'),
        configurado: () => configuracao().ok,
        conectar: () => abrir(configuracao().cj),
        conectarRadar: () => abrir(configuracao().radar)
      });
    }
    return Promise.resolve(_padrao(req, res)).catch((e) => falhaGeral(res, e));
  } catch (e) {
    falhaGeral(res, e);
  }
}
function falhaGeral(res, e) {
  console.error('[jovem] falha geral', String((e && e.message) || e).slice(0, 120));
  try { if (!res.headersSent) res.status(500).json({ ok: false, motivo: 'erro_interno' }); } catch (_) { /* nada a fazer */ }
}

module.exports = handlerPadrao;
module.exports.criarHandler = criarHandler;
module.exports.configuracao = configuracao;
module.exports.ACOES = ACOES;
module.exports.comoUsuario = comoUsuario;
module.exports.hashVinculo = hashVinculo;
module.exports.telefoneCanonico = telefoneCanonico;
module.exports.traduzErro = traduzErro;
module.exports.icsEvento = icsEvento;
