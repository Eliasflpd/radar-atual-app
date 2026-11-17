// ═══════════════════════════════════════════════════════════════════════════════
// CONEXÃO JOVEM — FUNÇÃO SERVERLESS PROPOSTA (Fase 2)
//
// ⚠️ ESTE ARQUIVO NÃO ESTÁ ATIVO. Ele mora em conexao-jovem/api-proposta/, fora de
//    api/, e a Vercel não o publica. Ligar ao app exige aprovação do dono do Radar
//    (ver conexao-jovem/PLANO-FASE2.md, seção "Como ligar").
//
// COMO A PESSOA É IDENTIFICADA (recomendação "A", ver PLANO-FASE2.md):
//  1. O app do Radar já guarda no aparelho o CRACHÁ (localStorage 'radar_chave'),
//     emitido só depois que a pessoa provou o WhatsApp com o código (api/cadastros.js).
//  2. O /jovem/ manda esse crachá no cabeçalho `x-radar-chave` (nunca na URL).
//  3. Aqui, o crachá vira o dono (user_key = telefone em dígitos) olhando SÓ O HASH
//     em radar_chaves — leitura apenas; este arquivo nunca escreve em tabela do Radar.
//  4. O telefone vira um HMAC (CJ_VINCULO_SEGREDO) e acha o perfil em cj.profiles.
//     O schema cj não guarda telefone.
//  5. Cada ação roda numa transação com `set local role authenticated` e
//     `request.jwt.claims = {sub: <id do perfil>}`. A partir daí quem decide o que a
//     pessoa vê é o RLS do banco (o mesmo que os testes provam), não este código.
//     Nenhum token vai para o navegador; nenhuma service role sai do servidor.
//
// FORMATO: um handler (req, res) no estilo dos módulos de api/_lib/ do Radar, para
// entrar como `fn=jovem` no roteador api/dados.js (o plano Hobby da Vercel não
// comporta função nova — ver o cabeçalho de api/_lib/chave.js).
//   POST /api/dados?fn=jovem   corpo: { acao: 'inicio', ...parâmetros }
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
// HMAC e não SHA puro: telefone tem pouca entropia e um SHA dele se quebra por força bruta.
function hashVinculo(userKey) {
  const segredo = process.env.CJ_VINCULO_SEGREDO || '';
  if (segredo.length < 32) throw new Error('CJ_VINCULO_SEGREDO ausente ou curto');
  return crypto.createHmac('sha256', segredo).update('cj:' + String(userKey)).digest('hex');
}

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

  atualizar_perfil: async (c, b) => linha(c,
    `update cj.profiles set display_name = coalesce($1, display_name), bio = $2,
            interests = coalesce($3, interests), show_full_name = coalesce($4, show_full_name),
            notification_prefs = coalesce($5, notification_prefs)
      where id = auth.uid() returning display_name, bio, interests, show_full_name, notification_prefs`,
    [b.nome == null ? null : texto(b.nome, 'nome', 1, 60), opcional(b.sobre, 'sobre', 280),
     b.interesses == null ? null : b.interesses.slice(0, 12).map((x) => texto(x, 'interesse', 1, 30)),
     typeof b.nome_completo === 'boolean' ? b.nome_completo : null,
     b.notificacoes && typeof b.notificacoes === 'object' ? JSON.stringify({
       palavra: !!b.notificacoes.palavra, circulo: !!b.notificacoes.circulo, missao: !!b.notificacoes.missao,
       hora: /^\d{2}:\d{2}$/.test(b.notificacoes.hora || '') ? b.notificacoes.hora : '07:00' }) : null]),

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

  // Meu Círculo (tela 05)
  circulo: async (c) => {
    const ci = await linha(c, `select ci.id, ci.name, ci.description, ci.age_band, cm.change_requested
                                 from cj.circle_members cm join cj.circles ci on ci.id = cm.circle_id
                                where cm.user_id = auth.uid() and cm.membership_status = 'ativo'`);
    if (!ci) return { circulo: null, disponiveis: await linhas(c, `select id, name, description, age_band from cj.circles
                                                                     where status = 'ativo' and age_band = cj.minha_faixa() order by name`) };
    return {
      circulo: ci,
      lideres: await linhas(c, `select cj.nome_publico(x.id) as nome, x.papel from (
                                  select leader_id as id, 'Líder' as papel from cj.circles where id = $1 and leader_id is not null
                                  union all select assistant_id, 'Auxiliar' from cj.circles where id = $1 and assistant_id is not null) x`, [ci.id]),
      integrantes: await linhas(c, `select cj.nome_publico(user_id) as nome from cj.circle_members
                                     where circle_id = $1 and membership_status = 'ativo'`, [ci.id]),
      encontros: await linhas(c, `select m.id, m.starts_at, m.theme, m.place_note, m.status, r.response as minha_resposta
                                    from cj.circle_meetings m
                                    left join cj.meeting_rsvps r on r.meeting_id = m.id and r.user_id = auth.uid()
                                   where m.circle_id = $1 and m.starts_at > now() - interval '1 day' order by m.starts_at limit 5`, [ci.id])
    };
  },
  pedir_circulo: async (c, b) => linha(c, `insert into cj.circle_members(circle_id, user_id) values ($1, auth.uid())
                                           returning circle_id, membership_status`, [uuid(b.circulo, 'círculo')]),
  pedir_troca: async (c, b) => linha(c, `update cj.circle_members set change_requested = $1
                                          where user_id = auth.uid() and membership_status = 'ativo' returning change_requested`, [b.trocar !== false]),
  propor_encontro: async (c, b) => linha(c, `insert into cj.circle_meetings(circle_id, starts_at, theme)
                                             values ($1, $2, $3) returning id, status`,
    [uuid(b.circulo, 'círculo'), dataHora(b.quando, 'data'), opcional(b.tema, 'tema', 200)]),
  responder_presenca: async (c, b) => linha(c, `insert into cj.meeting_rsvps(meeting_id, user_id, response) values ($1, auth.uid(), $2)
                                                on conflict (meeting_id, user_id) do update set response = excluded.response
                                                returning response`, [uuid(b.encontro, 'encontro'), umDe(b.resposta, 'resposta', ['sim', 'nao'])]),

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

  // Eventos (tela 08)
  eventos: async (c) => linhas(c,
    `select e.id, e.title, e.category, e.description, e.start_at, e.end_at, e.location, e.age_bands, e.requires_guardian_auth,
            e.capacity, e.accessibility, e.guidance, e.responsible, r.status as minha_inscricao, r.consent_status
       from cj.events e left join cj.event_registrations r on r.event_id = e.id and r.user_id = auth.uid()
      where e.status = 'publicado' and e.start_at > now() - interval '6 hours' order by e.start_at limit 30`),
  inscrever: async (c, b) => linha(c,
    `insert into cj.event_registrations(event_id, user_id) values ($1, auth.uid())
     on conflict (event_id, user_id) do update
       set status = case when cj.event_registrations.status = 'cancelada' then 'confirmada' else cj.event_registrations.status end
     returning status, consent_status`, [uuid(b.evento, 'evento')]),
  cancelar_inscricao: async (c, b) => linha(c, `update cj.event_registrations set status = 'cancelada'
                                                 where event_id = $1 and user_id = auth.uid() returning status`, [uuid(b.evento, 'evento')]),

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
    umDe(b.status || 'ativo', 'status', ['pendente', 'ativo', 'suspenso'])]); return { ok: true }; }
};

// Erros do banco → resposta curta, sem vazar detalhe interno.
function traduzErro(e) {
  if (e instanceof ErroEntrada) return { status: 400, corpo: { ok: false, motivo: e.message } };
  const cod = e && e.code;
  if (cod === '42501') return { status: 403, corpo: { ok: false, motivo: 'sem_permissao' } };
  if (cod === 'P0002') return { status: 404, corpo: { ok: false, motivo: 'nao_encontrado' } };
  if (cod === '23505') return { status: 409, corpo: { ok: false, motivo: 'ja_existe' } };
  if (['23514', '22023', '23503', '23502', '22P02', '22001'].includes(cod)) {
    // Mensagens dos gatilhos/funções são escritas para o jovem ler; as de constraint, não.
    const amigavel = cod === '23514' && e.message && !/violates check constraint/.test(e.message) ? e.message : 'dados_invalidos';
    return { status: 400, corpo: { ok: false, motivo: amigavel } };
  }
  return { status: 500, corpo: { ok: false, motivo: 'erro_interno' } };
}

function lerCorpo(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  if (Buffer.isBuffer(b)) { try { b = JSON.parse(b.toString('utf8')); } catch (_) { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}

// ─── fábrica do handler (injeção permite testar sem o banco do Radar) ─────────
// chave:    o módulo api/_lib/chave.js do Radar (usa só funções puras: segredoLimpo, sha,
//           daRequisicao, pareceTelefone — nada que escreva).
// conectar: () => Promise<pg.Client conectado> (banco onde está o schema cj)
// conectarRadar (opcional): banco onde está radar_chaves, se o Conexão Jovem ganhar um
//           projeto Supabase SEPARADO (CJ_DB_URL). Sem ele, usa a mesma conexão.
function criarHandler({ chave, conectar, conectarRadar }) {
  return async function jovem(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    // Sem CORS: só a própria página /jovem/ (mesma origem) chama.
    if (req.method !== 'POST') { res.status(405).json({ ok: false, motivo: 'so_post' }); return; }
    const b = lerCorpo(req);
    const acao = String(b.acao || '');
    if (acao !== 'entrar' && !Object.prototype.hasOwnProperty.call(ACOES, acao)) {
      res.status(400).json({ ok: false, motivo: 'acao_desconhecida' }); return;
    }
    const segredo = chave.daRequisicao(req, {});   // só cabeçalho; nunca URL
    if (!segredo) { res.status(401).json({ ok: false, motivo: 'cracha_ausente' }); return; }

    let c, cr;
    try {
      c = await conectar();
      cr = conectarRadar ? await conectarRadar() : c;
      // 1) crachá → dono (LEITURA em radar_chaves; nada é escrito no Radar)
      const dono = await linha(cr, 'select user_key from radar_chaves where chave_hash = $1 limit 1', [chave.sha(segredo)]);
      if (cr !== c) { try { await cr.end(); } catch (_) { /* ok */ } cr = null; }
      // Só gente que provou o WhatsApp (crachá de telefone). Id anônimo de aparelho não entra.
      if (!dono || !chave.pareceTelefone(dono.user_key)) { res.status(401).json({ ok: false, motivo: 'cracha_invalido' }); return; }

      // 2) dono → perfil (vínculo por HMAC)
      const vinculo = hashVinculo(dono.user_key);
      let perfil = await linha(c, 'select id, status from cj.profiles where radar_key_hash = $1', [vinculo]);
      if (acao === 'entrar') {
        if (!perfil) {
          // Único INSERT feito com o usuário do servidor: o perfil nasce 'pendente' e só a
          // liderança ativa (acolhimento humano). Nome e faixa validados aqui e no banco.
          perfil = await linha(c, `insert into cj.profiles(radar_key_hash, display_name, age_band) values ($1, $2, $3)
                                   on conflict (radar_key_hash) do update set radar_key_hash = excluded.radar_key_hash
                                   returning id, status`,
                               [vinculo, texto(b.nome, 'nome', 1, 60), umDe(b.faixa, 'faixa etária', FAIXAS)]);
          await c.query('insert into cj.profile_private(user_id) values ($1) on conflict do nothing', [perfil.id]);
        }
        res.status(200).json({ ok: true, status: perfil.status }); return;
      }
      if (!perfil) { res.status(404).json({ ok: false, motivo: 'sem_perfil' }); return; }
      if (perfil.status === 'suspenso' || perfil.status === 'encerrado') { res.status(403).json({ ok: false, motivo: 'perfil_' + perfil.status }); return; }

      // 3) a ação roda COMO a pessoa: o RLS decide.
      const dados = await comoUsuario(c, perfil.id, (cx) => ACOES[acao](cx, b));
      res.status(200).json({ ok: true, dados: dados == null ? null : dados });
    } catch (e) {
      const t = traduzErro(e);
      if (t.status === 500) console.error('[jovem]', acao, (e && e.code) || '', String((e && e.message) || e).slice(0, 120));
      res.status(t.status).json(t.corpo);
    } finally {
      if (cr && cr !== c) { try { await cr.end(); } catch (_) { /* ok */ } }
      if (c) { try { await c.end(); } catch (_) { /* ok */ } }
    }
  };
}

// Handler padrão, para quando o arquivo for copiado para api/_lib/jovem.js.
let _padrao = null;
module.exports = function (req, res) {
  if (!_padrao) {
    const { Client } = require('pg');
    const abrir = async (cs) => {
      if (!cs) throw new Error('banco não configurado');
      const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
      await c.connect();
      return c;
    };
    const radar = process.env.RADAR_DB_DATABASE_URL || process.env.RADAR_DB;
    const separado = process.env.CJ_DB_URL;   // opcional: projeto Supabase só do Conexão Jovem
    _padrao = criarHandler({
      chave: require('./chave.js'),
      conectar: () => abrir(separado || radar),
      conectarRadar: separado ? () => abrir(radar) : undefined
    });
  }
  return _padrao(req, res);
};
module.exports.criarHandler = criarHandler;
module.exports.ACOES = ACOES;
module.exports.comoUsuario = comoUsuario;
module.exports.hashVinculo = hashVinculo;
module.exports.traduzErro = traduzErro;
