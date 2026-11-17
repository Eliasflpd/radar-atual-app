-- ═══════════════════════════════════════════════════════════════════════════════
-- CONEXÃO JOVEM — FASE 2 — MIGRAÇÃO 001
-- Banco de dados, segurança (RLS) e auditoria do módulo, num schema PRÓPRIO: `cj`.
--
-- ⚠️ ESTE ARQUIVO AINDA NÃO FOI APLICADO EM NENHUM BANCO REAL.
--    Só roda em produção com aprovação expressa do dono do Radar (ver PLANO-FASE2.md).
--    Não toca em NENHUMA tabela do Radar (radar_cadastros, radar_chaves etc.).
--
-- PRINCÍPIOS (dossiê, seções 9 e 10):
--  · RLS ligado em TODAS as tabelas. Sem política = ninguém lê/escreve (negar por padrão).
--  · `anon` (visitante sem login) não tem acesso nenhum ao schema.
--  · Papel (member, circle_leader, assistant, youth_admin, pastor, safeguarding_admin)
--    nunca vem do cliente: mora em cj.roles e só muda por função autorizada e auditada.
--  · Pedidos de oração, conversas e denúncias: o dono vê o seu; a equipe só lê por
--    FUNÇÕES que registram cada leitura em cj.audit_logs.
--  · Diário espiritual NÃO existe aqui: fica só no aparelho do jovem.
--  · Não existe tabela de mensagem privada. Logo, não há conversa privada adulto↔menor
--    pelo app: só canais institucionais (pedido de conversa com responsável designado).
--  · Menores (15–17): recursos sociais (mural, comentários, círculo) só com
--    consentimento do responsável APROVADO por pessoa da equipe.
--  · Funções `security definer` sempre com `search_path` vazio e nomes qualificados.
--  · Idempotente: pode rodar duas vezes sem erro e sem duplicar nada.
--
-- PRÉ-REQUISITOS (já existem em qualquer projeto Supabase):
--  roles `anon` e `authenticated`; função `auth.uid()` (lê o `sub` de request.jwt.claims).
-- ═══════════════════════════════════════════════════════════════════════════════

set client_min_messages = warning;  -- esconde os avisos "já existe" ao reaplicar

create schema if not exists cj;
comment on schema cj is 'Conexão Jovem — módulo de comunhão e discipulado (Fase 2). Isolado do Radar.';

-- Ninguém além do dono do banco mexe no schema por padrão.
revoke all on schema cj from public;
revoke all on schema cj from anon;
grant usage on schema cj to authenticated;

-- ─── Tipos ────────────────────────────────────────────────────────────────────
do $$ begin
  create type cj.papel as enum ('member','circle_leader','assistant','youth_admin','pastor','safeguarding_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cj.faixa_etaria as enum ('15-17','18-21','22-25');
exception when duplicate_object then null; end $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABELAS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Perfil "visível" (nome de exibição, faixa, interesses). Dados administrativos
-- privados ficam em profile_private. O vínculo com o login do Radar é um HMAC do
-- WhatsApp (radar_key_hash): o telefone em si não fica neste schema.
create table if not exists cj.profiles (
  id                 uuid primary key default gen_random_uuid(),
  radar_key_hash     text not null unique check (radar_key_hash ~ '^[0-9a-f]{64}$'),
  display_name       text not null check (char_length(btrim(display_name)) between 1 and 60),
  age_band           cj.faixa_etaria not null,
  avatar_path        text check (avatar_path is null or avatar_path ~ '^[a-z0-9/_.-]{1,200}$'),
  bio                text check (bio is null or char_length(bio) <= 280),
  interests          text[] not null default '{}' check (cardinality(interests) <= 12),
  show_full_name     boolean not null default false,
  notification_prefs jsonb not null default '{"palavra":false,"hora":"07:00","circulo":false,"missao":false}'
                     check (jsonb_typeof(notification_prefs) = 'object'),
  status             text not null default 'pendente'
                     check (status in ('pendente','ativo','suspenso','encerrado')),
  is_demo            boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table cj.profiles is 'Perfil do jovem. pendente = aguardando acolhimento humano; ativo = liberado pela liderança.';

-- Dados privados: só o próprio jovem e a equipe (youth_admin, pastor, safeguarding_admin).
create table if not exists cj.profile_private (
  user_id          uuid primary key references cj.profiles(id) on delete cascade,
  birth_date       date,
  contact          text check (contact is null or char_length(contact) <= 120),
  requested_at     timestamptz not null default now(),   -- pedido de entrada
  first_contact_at timestamptz,                          -- 1º contato humano (meta: 72 h úteis)
  first_contact_by uuid,
  updated_at       timestamptz not null default now()
);

-- Aceite de termos/política/regras, com versão.
create table if not exists cj.term_acceptances (
  user_id     uuid not null references cj.profiles(id) on delete cascade,
  document    text not null check (document in ('termos_uso','privacidade','regras_comunidade')),
  version     text not null check (char_length(version) between 1 and 20),
  accepted_at timestamptz not null default now(),
  primary key (user_id, document, version)
);

-- Consentimento do responsável (menores de 18). O jovem PEDE; só a equipe APROVA,
-- depois de verificar o responsável (método registrado). Escopos separados.
create table if not exists cj.guardian_consents (
  id                    uuid primary key default gen_random_uuid(),
  minor_id              uuid not null references cj.profiles(id) on delete cascade,
  guardian_name         text not null check (char_length(btrim(guardian_name)) between 3 and 120),
  guardian_relationship text not null check (guardian_relationship in ('mae','pai','responsavel_legal','outro')),
  guardian_contact      text not null check (char_length(guardian_contact) between 8 and 120),
  allow_social          boolean not null default false,  -- mural, comentários, círculo
  allow_events          boolean not null default false,  -- inscrições (cada evento com autorização ainda pede a sua)
  allow_image           boolean not null default false,  -- uso de imagem
  policy_version        text not null check (char_length(policy_version) between 1 and 20),
  status                text not null default 'pendente'
                        check (status in ('pendente','aprovado','recusado','revogado')),
  verification_method   text check (verification_method in ('presencial','video_chamada','documento_assinado','outro')),
  verified_by           uuid,
  verified_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint aprovado_exige_verificacao check (
    status <> 'aprovado' or (verified_by is not null and verified_at is not null and verification_method is not null))
);
-- No máximo um consentimento pendente/aprovado por menor.
create unique index if not exists guardian_consents_um_vigente
  on cj.guardian_consents(minor_id) where status in ('pendente','aprovado');

-- Papéis. Sem linha aqui = membro comum. Concedidos só por cj.conceder_papel().
create table if not exists cj.roles (
  user_id    uuid not null references cj.profiles(id) on delete cascade,
  role       cj.papel not null,
  granted_by uuid,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists cj.circles (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 2 and 60),
  description  text check (description is null or char_length(description) <= 600),
  age_band     cj.faixa_etaria not null,
  leader_id    uuid references cj.profiles(id) on delete set null,
  assistant_id uuid references cj.profiles(id) on delete set null,
  cover_path   text check (cover_path is null or cover_path ~ '^[a-z0-9/_.-]{1,200}$'),
  max_members  smallint not null default 10 check (max_members between 2 and 20),
  status       text not null default 'ativo' check (status in ('ativo','pausado','encerrado')),
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint lider_diferente_do_auxiliar check (leader_id is null or assistant_id is null or leader_id <> assistant_id)
);

create table if not exists cj.circle_members (
  circle_id              uuid not null references cj.circles(id) on delete cascade,
  user_id                uuid not null references cj.profiles(id) on delete cascade,
  membership_status      text not null default 'solicitado'
                         check (membership_status in ('solicitado','ativo','recusado','saiu','removido')),
  requested_at           timestamptz not null default now(),
  joined_at              timestamptz,
  change_requested       boolean not null default false,   -- "quero trocar de círculo", sem constrangimento
  visibility_preferences jsonb not null default '{"mostrar_nome_completo":false}'
                         check (jsonb_typeof(visibility_preferences) = 'object'),
  primary key (circle_id, user_id)
);
-- Um círculo de referência ativo por jovem.
create unique index if not exists circle_members_um_ativo
  on cj.circle_members(user_id) where membership_status = 'ativo';

create table if not exists cj.circle_meetings (
  id          uuid primary key default gen_random_uuid(),
  circle_id   uuid not null references cj.circles(id) on delete cascade,
  starts_at   timestamptz not null,
  theme       text check (theme is null or char_length(theme) <= 200),
  place_note  text check (place_note is null or char_length(place_note) <= 200), -- só integrantes veem
  status      text not null default 'proposto' check (status in ('proposto','confirmado','realizado','cancelado')),
  proposed_by uuid references cj.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists cj.meeting_rsvps (
  meeting_id uuid not null references cj.circle_meetings(id) on delete cascade,
  user_id    uuid not null references cj.profiles(id) on delete cascade,
  response   text not null check (response in ('sim','nao')),
  updated_at timestamptz not null default now(),
  primary key (meeting_id, user_id)
);

create table if not exists cj.events (
  id                     uuid primary key default gen_random_uuid(),
  title                  text not null check (char_length(btrim(title)) between 3 and 120),
  category               text not null check (category in
                         ('culto','estudo','esporte','acao_social','circulo','acampamento','ensaio','treinamento')),
  description            text check (description is null or char_length(description) <= 2000),
  start_at               timestamptz not null,
  end_at                 timestamptz,
  location               text check (location is null or char_length(location) <= 200),
  age_bands              cj.faixa_etaria[] not null default '{15-17,18-21,22-25}' check (cardinality(age_bands) >= 1),
  requires_guardian_auth boolean not null default false,
  capacity               integer check (capacity is null or capacity > 0),
  accessibility          text check (accessibility is null or char_length(accessibility) <= 500),
  guidance               text check (guidance is null or char_length(guidance) <= 1000),
  responsible            text check (responsible is null or char_length(responsible) <= 120),
  circle_id              uuid references cj.circles(id) on delete set null,  -- evento só do círculo
  created_by             uuid,
  status                 text not null default 'rascunho' check (status in ('rascunho','publicado','cancelado','encerrado')),
  is_demo                boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint fim_depois_do_inicio check (end_at is null or end_at > start_at)
);

create table if not exists cj.event_registrations (
  event_id           uuid not null references cj.events(id) on delete cascade,
  user_id            uuid not null references cj.profiles(id) on delete cascade,
  status             text not null default 'confirmada'
                     check (status in ('confirmada','aguardando_autorizacao','lista_espera','cancelada')),
  consent_status     text not null default 'nao_exigido'
                     check (consent_status in ('nao_exigido','pendente','aprovado','recusado')),
  consent_decided_by uuid,
  check_in_at        timestamptz,
  check_out_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists cj.devotionals (
  id                  uuid primary key default gen_random_uuid(),
  publish_date        date not null,
  title               text not null check (char_length(btrim(title)) between 3 and 120),
  scripture_reference text not null check (char_length(scripture_reference) between 2 and 60),
  verse_text          text check (verse_text is null or char_length(verse_text) <= 600),
  reflection          text check (reflection is null or char_length(reflection) <= 4000),
  question            text check (question is null or char_length(question) <= 300),
  prayer              text check (prayer is null or char_length(prayer) <= 600),
  readings            text[] not null default '{}' check (cardinality(readings) <= 10),
  author              text not null check (char_length(author) between 2 and 120),
  license_status      text not null default 'pendente'
                      check (license_status in ('original','licenciado','dominio_publico','pendente')),
  status              text not null default 'rascunho'
                      check (status in ('rascunho','aguardando_aprovacao','publicado','arquivado')),
  approved_by         uuid,
  approved_at         timestamptz,
  created_by          uuid,
  is_demo             boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Não publica conteúdo sem licença conferida (dossiê 6.5).
  constraint publicado_exige_licenca check (status <> 'publicado' or license_status <> 'pendente')
);

create table if not exists cj.journey_steps (
  id                uuid primary key default gen_random_uuid(),
  step_code         text not null unique check (step_code ~ '^[a-z0-9_-]{2,30}$'),
  title             text not null check (char_length(title) between 2 and 80),
  description       text check (description is null or char_length(description) <= 600),
  day_start         smallint not null check (day_start between 1 and 90),
  day_end           smallint not null check (day_end between 1 and 90),
  age_band          cj.faixa_etaria,                  -- null = todas as faixas
  actions           text[] not null default '{}' check (cardinality(actions) <= 10),
  reading           text check (reading is null or char_length(reading) <= 120),
  suggested_meeting text check (suggested_meeting is null or char_length(suggested_meeting) <= 200),
  content_id        uuid references cj.devotionals(id) on delete set null,
  sort_order        smallint not null default 0,
  constraint dias_em_ordem check (day_end >= day_start)
);

-- Progresso da jornada: só status operacional. SEM nota, ranking ou "medida de fé".
create table if not exists cj.journey_progress (
  user_id      uuid not null references cj.profiles(id) on delete cascade,
  step_id      uuid not null references cj.journey_steps(id) on delete cascade,
  status       text not null default 'em_andamento' check (status in ('em_andamento','concluida','pausada')),
  actions_done smallint[] not null default '{}',
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, step_id)
);

create table if not exists cj.missions (
  id                     uuid primary key default gen_random_uuid(),
  title                  text not null check (char_length(btrim(title)) between 3 and 120),
  objective              text not null check (char_length(objective) between 10 and 600),
  actions                text[] not null default '{}' check (cardinality(actions) <= 10),
  safety_notes           text not null check (char_length(safety_notes) >= 10),   -- segurança é obrigatória
  responsible            text check (responsible is null or char_length(responsible) <= 120),
  start_at               date not null,
  end_at                 date not null,
  requires_guardian_auth boolean not null default false,
  age_bands              cj.faixa_etaria[] not null default '{15-17,18-21,22-25}' check (cardinality(age_bands) >= 1),
  status                 text not null default 'rascunho' check (status in ('rascunho','publicado','encerrado')),
  created_by             uuid,
  is_demo                boolean not null default false,
  created_at             timestamptz not null default now(),
  constraint missao_datas check (end_at >= start_at)
);

-- Participação opcional. Liderança só vê totais agregados (cj.resumo_missao), nunca a reflexão.
create table if not exists cj.mission_participation (
  mission_id          uuid not null references cj.missions(id) on delete cascade,
  user_id             uuid not null references cj.profiles(id) on delete cascade,
  status              text not null default 'aceita' check (status in ('aceita','concluida','desistiu')),
  actions_done        smallint[] not null default '{}',
  optional_reflection text check (optional_reflection is null or char_length(optional_reflection) <= 1000),
  updated_at          timestamptz not null default now(),
  primary key (mission_id, user_id)
);

-- Pedido de oração. "Só para mim" NÃO vem para o banco (fica no aparelho, como o diário).
-- equipe_pastoral = pastor + coordenação de jovens; somente_pastor = só pastor.
create table if not exists cj.prayer_requests (
  id                        uuid primary key default gen_random_uuid(),
  owner_id                  uuid not null references cj.profiles(id) on delete cascade,
  body                      text not null check (char_length(btrim(body)) between 3 and 2000),
  visibility                text not null default 'equipe_pastoral' check (visibility in ('equipe_pastoral','somente_pastor')),
  assigned_team             text not null default 'oracao' check (assigned_team in ('oracao','pastoral')),
  status                    text not null default 'aberto' check (status in ('aberto','em_oracao','encerrado')),
  escalated_to_safeguarding boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Pedido de conversa: canal INSTITUCIONAL, nunca chat privado.
create table if not exists cj.conversation_requests (
  id                        uuid primary key default gen_random_uuid(),
  requester_id              uuid not null references cj.profiles(id) on delete cascade,
  category                  text not null check (category in
                            ('fe_duvidas','relacionamentos','familia','estudo_trabalho','saude_emocional','protecao','outro')),
  note                      text check (note is null or char_length(note) <= 500),
  preferred_channel         text not null default 'presencial_na_igreja'
                            check (preferred_channel in ('presencial_na_igreja','ligacao_institucional','presencial_com_responsavel')),
  assigned_to               uuid references cj.profiles(id) on delete set null,
  status                    text not null default 'aberto'
                            check (status in ('aberto','atribuido','respondido','encerrado','encaminhado')),
  escalated_to_safeguarding boolean not null default false,
  response_due_at           timestamptz not null,   -- preenchido pelo gatilho: 3 dias úteis (~72 h úteis)
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  closed_at                 timestamptz
);

create table if not exists cj.content_posts (
  id                uuid primary key default gen_random_uuid(),
  author_id         uuid not null references cj.profiles(id) on delete cascade,
  circle_id         uuid references cj.circles(id) on delete cascade,   -- null = mural geral
  kind              text not null default 'mural' check (kind in ('mural','testemunho','aviso')),
  body              text not null check (char_length(btrim(body)) between 1 and 1000),
  media_path        text check (media_path is null or media_path ~ '^[a-z0-9/_.-]{1,200}$'),
  testimony_consent boolean not null default false,
  moderation_status text not null default 'pendente' check (moderation_status in ('pendente','aprovado','rejeitado','removido')),
  moderated_by      uuid,
  moderated_at      timestamptz,
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now(),
  constraint testemunho_com_consentimento check (kind <> 'testemunho' or testimony_consent)
);

create table if not exists cj.content_comments (
  id                uuid primary key default gen_random_uuid(),
  post_id           uuid not null references cj.content_posts(id) on delete cascade,
  author_id         uuid not null references cj.profiles(id) on delete cascade,
  body              text not null check (char_length(btrim(body)) between 1 and 500),
  moderation_status text not null default 'pendente' check (moderation_status in ('pendente','aprovado','rejeitado','removido')),
  moderated_by      uuid,
  moderated_at      timestamptz,
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now()
);

-- Bloquear/silenciar alguém: some do meu mural.
create table if not exists cj.user_blocks (
  blocker_id uuid not null references cj.profiles(id) on delete cascade,
  blocked_id uuid not null references cj.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint nao_bloqueia_a_si check (blocker_id <> blocked_id)
);

create table if not exists cj.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references cj.profiles(id) on delete set null,
  target_type text not null check (target_type in ('post','comentario','perfil','evento','circulo','outro')),
  target_id   uuid,
  reason      text not null check (reason in ('ofensa','assedio','conteudo_improprio','risco_seguranca','spam','outro')),
  details     text check (details is null or char_length(details) <= 1000),
  severity    text not null default 'normal' check (severity in ('normal','alta','critica')),
  status      text not null default 'aberta' check (status in ('aberta','em_analise','resolvida','descartada')),
  handled_by  uuid,
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists cj.talent_interests (
  user_id      uuid primary key references cj.profiles(id) on delete cascade,
  talents      text[] not null default '{}' check (talents <@ array['louvor','instrumentos','midia','foto','video',
                 'recepcao','esporte','teatro','social','ensino','missoes']::text[]),
  availability text[] not null default '{}' check (availability <@ array['sabado_manha','sabado_tarde','domingo',
                 'semana_noite']::text[]),
  note         text check (note is null or char_length(note) <= 300),
  status       text not null default 'enviado' check (status in ('enviado','em_contato','concluido')),
  updated_at   timestamptz not null default now()
);

-- Auditoria: só cresce. Metadados mínimos (nunca o texto de oração/conversa/post).
create table if not exists cj.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ─── Índices (colunas usadas em políticas e chaves estrangeiras) ──────────────
create index if not exists circle_members_user_idx      on cj.circle_members(user_id);
create index if not exists circles_leader_idx           on cj.circles(leader_id);
create index if not exists circles_assistant_idx        on cj.circles(assistant_id);
create index if not exists circle_meetings_circle_idx   on cj.circle_meetings(circle_id, starts_at);
create index if not exists meeting_rsvps_user_idx       on cj.meeting_rsvps(user_id);
create index if not exists events_start_idx             on cj.events(start_at);
create index if not exists events_circle_idx            on cj.events(circle_id);
create index if not exists event_registrations_user_idx on cj.event_registrations(user_id);
create index if not exists devotionals_date_idx         on cj.devotionals(publish_date desc);
create index if not exists journey_progress_step_idx    on cj.journey_progress(step_id);
create index if not exists mission_part_user_idx        on cj.mission_participation(user_id);
create index if not exists prayer_owner_idx             on cj.prayer_requests(owner_id);
create index if not exists conversation_requester_idx   on cj.conversation_requests(requester_id);
create index if not exists conversation_assigned_idx    on cj.conversation_requests(assigned_to);
create index if not exists posts_circle_idx             on cj.content_posts(circle_id, created_at desc);
create index if not exists posts_author_idx             on cj.content_posts(author_id);
create index if not exists comments_post_idx            on cj.content_comments(post_id);
create index if not exists comments_author_idx          on cj.content_comments(author_id);
create index if not exists blocks_blocked_idx           on cj.user_blocks(blocked_id);
create index if not exists reports_status_idx           on cj.reports(status, created_at);
create index if not exists reports_reporter_idx         on cj.reports(reporter_id);
create index if not exists consents_minor_idx           on cj.guardian_consents(minor_id);
create index if not exists audit_created_idx            on cj.audit_logs(created_at);
create index if not exists audit_entity_idx             on cj.audit_logs(entity_type, entity_id);
create index if not exists audit_actor_idx              on cj.audit_logs(actor_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNÇÕES AUXILIARES DE AUTORIZAÇÃO
-- security definer: leem as tabelas sem cair no RLS (evita recursão nas políticas).
-- Todas olham SÓ para o usuário logado (auth.uid()) e devolvem sim/não.
-- ═══════════════════════════════════════════════════════════════════════════════

-- "Esta instrução veio direto do cliente (anon/authenticated)?" — INVOKER de propósito:
-- dentro de uma função security definer, current_user vira o dono e a resposta é não.
create or replace function cj.eh_cliente() returns boolean
language sql stable set search_path = '' as $$
  select current_user in ('anon','authenticated')
$$;

create or replace function cj.minha_faixa() returns cj.faixa_etaria
language sql stable security definer set search_path = '' as $$
  select p.age_band from cj.profiles p where p.id = auth.uid()
$$;

-- perfil existente e não suspenso/encerrado
create or replace function cj.perfil_valido() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from cj.profiles p where p.id = auth.uid() and p.status in ('pendente','ativo'))
$$;

create or replace function cj.usuario_tem_papel(u uuid, p cj.papel) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from cj.roles r join cj.profiles pr on pr.id = r.user_id
                  where r.user_id = u and r.role = p and pr.status = 'ativo')
$$;

create or replace function cj.tem_papel(p cj.papel) returns boolean
language sql stable security definer set search_path = '' as $$
  select cj.usuario_tem_papel(auth.uid(), p)
$$;

create or replace function cj.tem_algum_papel(ps cj.papel[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from cj.roles r join cj.profiles pr on pr.id = r.user_id
                  where r.user_id = auth.uid() and r.role = any(ps) and pr.status = 'ativo')
$$;

-- equipe = coordenação de jovens, pastor e proteção
create or replace function cj.eh_equipe() returns boolean
language sql stable security definer set search_path = '' as $$
  select cj.tem_algum_papel('{youth_admin,pastor,safeguarding_admin}'::cj.papel[])
$$;

-- gestão = quem administra conteúdo, círculos e eventos
create or replace function cj.eh_gestao() returns boolean
language sql stable security definer set search_path = '' as $$
  select cj.tem_algum_papel('{youth_admin,pastor}'::cj.papel[])
$$;

-- Sem perfil, trata como menor (o mais protegido).
create or replace function cj.eh_menor(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.age_band = '15-17' from cj.profiles p where p.id = u), true)
$$;

create or replace function cj.consentimento_aprovado(u uuid, escopo text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from cj.guardian_consents g
                  where g.minor_id = u and g.status = 'aprovado'
                    and case escopo when 'social' then g.allow_social
                                    when 'eventos' then g.allow_events
                                    when 'imagem' then g.allow_image
                                    else false end)
$$;

-- Recursos sociais (mural, comentários, círculo): perfil ATIVO, regras aceitas e,
-- se menor, consentimento social aprovado.
create or replace function cj.pode_social() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from cj.profiles p
     where p.id = auth.uid() and p.status = 'ativo'
       and (p.age_band <> '15-17' or cj.consentimento_aprovado(p.id, 'social'))
       and exists (select 1 from cj.term_acceptances t where t.user_id = p.id and t.document = 'regras_comunidade'))
$$;

create or replace function cj.lidera_circulo(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from cj.circles ci
     where ci.id = c and ci.status = 'ativo'
       and ((ci.leader_id = auth.uid() and cj.tem_papel('circle_leader'))
         or (ci.assistant_id = auth.uid() and cj.tem_papel('assistant'))))
$$;

create or replace function cj.membro_do_circulo(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from cj.circle_members m
                  where m.circle_id = c and m.user_id = auth.uid() and m.membership_status = 'ativo')
$$;

create or replace function cj.ve_circulo(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select cj.membro_do_circulo(c) or cj.lidera_circulo(c) or cj.eh_equipe()
$$;

-- sou líder/auxiliar de um círculo em que `u` é integrante ativo?
create or replace function cj.lidera_usuario(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from cj.circle_members m
                  where m.user_id = u and m.membership_status = 'ativo' and cj.lidera_circulo(m.circle_id))
$$;

-- `u` está no mesmo círculo que eu (ambos ativos)?
create or replace function cj.compartilha_circulo(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from cj.circle_members a
                   join cj.circle_members b on b.circle_id = a.circle_id
                  where a.user_id = auth.uid() and a.membership_status = 'ativo'
                    and b.user_id = u and b.membership_status = 'ativo')
$$;

-- `u` é líder/auxiliar do círculo em que estou?
create or replace function cj.e_lider_do_meu_circulo(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from cj.circles c
                  where c.status = 'ativo' and (c.leader_id = u or c.assistant_id = u)
                    and cj.membro_do_circulo(c.id))
$$;

create or replace function cj.bloqueado_por_mim(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from cj.user_blocks b where b.blocker_id = auth.uid() and b.blocked_id = u)
$$;

create or replace function cj.circulo_do_encontro(m uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select cm.circle_id from cj.circle_meetings cm where cm.id = m
$$;

create or replace function cj.lidera_evento(e uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from cj.events ev
                  where ev.id = e and ev.circle_id is not null and cj.lidera_circulo(ev.circle_id))
$$;

create or replace function cj.ocupacao_evento(e uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from cj.event_registrations r
   where r.event_id = e and r.status in ('confirmada','aguardando_autorizacao')
$$;

-- Prazo em dias úteis (seg–sex, horário de Brasília). Feriados: decisão pendente.
create or replace function cj.prazo_util(inicio timestamptz, dias integer) returns timestamptz
language plpgsql stable set search_path = '' as $$
declare
  t timestamptz := inicio;
  n integer := 0;
begin
  while n < dias loop
    t := t + interval '1 day';
    if extract(isodow from (t at time zone 'America/Sao_Paulo')) < 6 then n := n + 1; end if;
  end loop;
  return t;
end $$;

-- Registro de auditoria. NÃO é liberado ao cliente (ninguém forja log);
-- só funções security definer e o gatilho chamam.
create or replace function cj.auditar(p_acao text, p_tipo text, p_id text, p_meta jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into cj.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_acao, p_tipo, p_id, coalesce(p_meta, '{}'::jsonb))
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- GATILHOS
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function cj.trg_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

-- Auditoria genérica: quem, o quê, em qual registro e QUAIS campos mudaram.
-- Nunca grava o conteúdo (texto de oração, post, conversa).
create or replace function cj.trg_auditoria() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  n jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  o jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  r jsonb := coalesce(n, o);
  campos text[];
  meta jsonb;
begin
  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into campos
      from jsonb_object_keys(n) k where (n -> k) is distinct from (o -> k) and k <> 'updated_at';
    if campos is null then return new; end if;   -- nada mudou de fato
  end if;
  meta := jsonb_strip_nulls(jsonb_build_object(
    'op', lower(tg_op),
    'campos', campos,
    'status', coalesce(r ->> 'status', r ->> 'membership_status', r ->> 'moderation_status'),
    'papel', r ->> 'role'));
  insert into cj.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), lower(tg_op), tg_table_name,
          coalesce(r ->> 'id', concat_ws(':', r ->> 'circle_id', r ->> 'event_id', r ->> 'meeting_id',
                                              r ->> 'user_id', r ->> 'role')),
          meta);
  return coalesce(new, old);
end $$;

-- audit_logs é só-acréscimo. Expurgo de retenção só pela função cj.expurgar_auditoria.
create or replace function cj.trg_auditoria_imutavel() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('cj.expurgo', true), '') = 'sim' then
    return old;
  end if;
  raise exception 'audit_logs é imutável' using errcode = '42501';
end $$;

-- Inscrição em evento: o cliente NÃO escolhe status nem consentimento.
create or replace function cj.trg_inscricao() returns trigger
language plpgsql set search_path = '' as $$
declare ev record;
begin
  if not cj.eh_cliente() then return new; end if;
  if tg_op = 'UPDATE' and not (old.status = 'cancelada' and new.status <> 'cancelada') then
    if new.status is distinct from old.status and new.status <> 'cancelada' then
      raise exception 'Você só pode cancelar a própria inscrição' using errcode = '42501';
    end if;
    return new;
  end if;
  -- inscrição nova (ou reativação de uma cancelada): calcula tudo no servidor
  select e.* into ev from cj.events e where e.id = new.event_id;
  if not found or ev.status <> 'publicado' then
    raise exception 'Evento indisponível para inscrição' using errcode = '23514';
  end if;
  if ev.start_at < now() then
    raise exception 'Este evento já começou' using errcode = '23514';
  end if;
  if cj.minha_faixa() is null or cj.minha_faixa() <> all (ev.age_bands) then
    raise exception 'Evento não é para a sua faixa etária' using errcode = '42501';
  end if;
  new.check_in_at := null; new.check_out_at := null; new.consent_decided_by := null;
  if ev.requires_guardian_auth and cj.eh_menor(new.user_id) then
    new.consent_status := 'pendente'; new.status := 'aguardando_autorizacao';
  else
    new.consent_status := 'nao_exigido'; new.status := 'confirmada';
  end if;
  if ev.capacity is not null and cj.ocupacao_evento(ev.id) >= ev.capacity then
    new.status := 'lista_espera';
  end if;
  return new;
end $$;

-- Publicação/comentário do cliente sempre entra "pendente" de moderação.
create or replace function cj.trg_post() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not cj.eh_cliente() then return new; end if;
  new.moderation_status := 'pendente'; new.moderated_by := null; new.moderated_at := null; new.is_demo := false;
  if new.kind = 'aviso' and not (cj.eh_gestao() or (new.circle_id is not null and cj.lidera_circulo(new.circle_id))) then
    raise exception 'Aviso oficial só pela liderança' using errcode = '42501';
  end if;
  return new;
end $$;

create or replace function cj.trg_comentario() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not cj.eh_cliente() then return new; end if;
  new.moderation_status := 'pendente'; new.moderated_by := null; new.moderated_at := null; new.is_demo := false;
  return new;
end $$;

-- Círculos separados por faixa etária (vale para todos, inclusive funções da equipe).
create or replace function cj.trg_membro_circulo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare fc cj.faixa_etaria; fp cj.faixa_etaria;
begin
  select age_band into fc from cj.circles where id = new.circle_id;
  select age_band into fp from cj.profiles where id = new.user_id;
  if fc is distinct from fp then
    raise exception 'Círculos são separados por faixa etária' using errcode = '23514';
  end if;
  return new;
end $$;

create or replace function cj.trg_membro_cliente() returns trigger
language plpgsql set search_path = '' as $$
begin
  if cj.eh_cliente() and tg_op = 'INSERT' then
    new.membership_status := 'solicitado'; new.joined_at := null; new.change_requested := false;
  end if;
  return new;
end $$;

-- Líder e auxiliar: adultos, com o papel concedido.
create or replace function cj.trg_circulo() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.leader_id is not null and (cj.eh_menor(new.leader_id) or not cj.usuario_tem_papel(new.leader_id, 'circle_leader')) then
    raise exception 'Líder precisa ser adulto e ter o papel circle_leader' using errcode = '23514';
  end if;
  if new.assistant_id is not null and (cj.eh_menor(new.assistant_id) or not cj.usuario_tem_papel(new.assistant_id, 'assistant')) then
    raise exception 'Auxiliar precisa ser adulto e ter o papel assistant' using errcode = '23514';
  end if;
  return new;
end $$;

-- Integrante pode PROPOR encontro; só líder/gestão confirma.
create or replace function cj.trg_encontro() returns trigger
language plpgsql set search_path = '' as $$
begin
  if cj.eh_cliente() then
    new.proposed_by := auth.uid();
    if not (cj.lidera_circulo(new.circle_id) or cj.eh_gestao()) then new.status := 'proposto'; end if;
  end if;
  return new;
end $$;

-- Devocional só vai ao ar com o pastor.
create or replace function cj.trg_devocional() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not cj.eh_cliente() then return new; end if;
  if tg_op = 'INSERT' then new.created_by := auth.uid(); new.is_demo := false; end if;
  if new.status = 'publicado' and (tg_op = 'INSERT' or old.status <> 'publicado') then
    if not cj.tem_papel('pastor') then
      raise exception 'Somente o pastor aprova a publicação do devocional' using errcode = '42501';
    end if;
    new.approved_by := auth.uid(); new.approved_at := now();
  end if;
  return new;
end $$;

create or replace function cj.trg_oracao() returns trigger
language plpgsql set search_path = '' as $$
begin
  if cj.eh_cliente() then new.status := 'aberto'; new.escalated_to_safeguarding := false; end if;
  return new;
end $$;

create or replace function cj.trg_conversa() returns trigger
language plpgsql set search_path = '' as $$
begin
  if cj.eh_cliente() then
    new.status := 'aberto'; new.assigned_to := null; new.escalated_to_safeguarding := false; new.closed_at := null;
    new.response_due_at := null;
  end if;
  if new.response_due_at is null then new.response_due_at := cj.prazo_util(now(), 3); end if;
  return new;
end $$;

create or replace function cj.trg_consentimento() returns trigger
language plpgsql set search_path = '' as $$
begin
  if cj.eh_cliente() then
    if not cj.eh_menor(new.minor_id) then
      raise exception 'Consentimento de responsável é só para menores de 18' using errcode = '23514';
    end if;
    new.status := 'pendente'; new.verified_by := null; new.verified_at := null; new.verification_method := null;
  end if;
  return new;
end $$;

create or replace function cj.trg_denuncia() returns trigger
language plpgsql set search_path = '' as $$
begin
  if cj.eh_cliente() then
    new.status := 'aberta'; new.handled_by := null; new.handled_at := null;
    new.severity := case new.reason when 'risco_seguranca' then 'critica' when 'assedio' then 'alta' else 'normal' end;
  end if;
  return new;
end $$;

-- Instala gatilhos de forma idempotente.
do $$
declare t text;
begin
  -- updated_at
  foreach t in array array['profiles','profile_private','guardian_consents','circles','events','event_registrations',
                           'devotionals','journey_progress','mission_participation','prayer_requests',
                           'conversation_requests','talent_interests','meeting_rsvps'] loop
    execute format('drop trigger if exists t_updated_at on cj.%I', t);
    execute format('create trigger t_updated_at before update on cj.%I for each row execute function cj.trg_updated_at()', t);
  end loop;
  -- auditoria de tudo (inserção, alteração, exclusão) nas tabelas administrativas/sensíveis
  foreach t in array array['roles','guardian_consents','circles','events','devotionals','missions','reports',
                           'journey_steps'] loop
    execute format('drop trigger if exists t_auditoria on cj.%I', t);
    execute format('create trigger t_auditoria after insert or update or delete on cj.%I for each row execute function cj.trg_auditoria()', t);
  end loop;
  -- auditoria de alteração/exclusão (decisões sobre dados de jovens)
  foreach t in array array['profiles','profile_private','circle_members','event_registrations','prayer_requests',
                           'conversation_requests','content_posts','content_comments'] loop
    execute format('drop trigger if exists t_auditoria on cj.%I', t);
    execute format('create trigger t_auditoria after update or delete on cj.%I for each row execute function cj.trg_auditoria()', t);
  end loop;
end $$;

drop trigger if exists t_imutavel on cj.audit_logs;
create trigger t_imutavel before update or delete on cj.audit_logs
  for each row execute function cj.trg_auditoria_imutavel();

drop trigger if exists t_regras on cj.event_registrations;
create trigger t_regras before insert or update on cj.event_registrations
  for each row execute function cj.trg_inscricao();

drop trigger if exists t_regras on cj.content_posts;
create trigger t_regras before insert on cj.content_posts for each row execute function cj.trg_post();

drop trigger if exists t_regras on cj.content_comments;
create trigger t_regras before insert on cj.content_comments for each row execute function cj.trg_comentario();

drop trigger if exists t_faixa on cj.circle_members;
create trigger t_faixa before insert or update of circle_id, user_id on cj.circle_members
  for each row execute function cj.trg_membro_circulo();

drop trigger if exists t_regras on cj.circle_members;
create trigger t_regras before insert on cj.circle_members for each row execute function cj.trg_membro_cliente();

drop trigger if exists t_regras on cj.circles;
create trigger t_regras before insert or update of leader_id, assistant_id on cj.circles
  for each row execute function cj.trg_circulo();

drop trigger if exists t_regras on cj.circle_meetings;
create trigger t_regras before insert on cj.circle_meetings for each row execute function cj.trg_encontro();

drop trigger if exists t_regras on cj.devotionals;
create trigger t_regras before insert or update on cj.devotionals for each row execute function cj.trg_devocional();

drop trigger if exists t_regras on cj.prayer_requests;
create trigger t_regras before insert on cj.prayer_requests for each row execute function cj.trg_oracao();

drop trigger if exists t_regras on cj.conversation_requests;
create trigger t_regras before insert on cj.conversation_requests for each row execute function cj.trg_conversa();

drop trigger if exists t_regras on cj.guardian_consents;
create trigger t_regras before insert on cj.guardian_consents for each row execute function cj.trg_consentimento();

drop trigger if exists t_regras on cj.reports;
create trigger t_regras before insert on cj.reports for each row execute function cj.trg_denuncia();

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — ligado em todas as tabelas; o que não está aqui é negado.
-- ═══════════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array['profiles','profile_private','term_acceptances','guardian_consents','roles','circles',
                           'circle_members','circle_meetings','meeting_rsvps','events','event_registrations',
                           'devotionals','journey_steps','journey_progress','missions','mission_participation',
                           'prayer_requests','conversation_requests','content_posts','content_comments',
                           'user_blocks','reports','talent_interests','audit_logs'] loop
    execute format('alter table cj.%I enable row level security', t);
  end loop;
end $$;

-- Recomeça do zero: remove TODAS as políticas existentes do schema (idempotência).
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'cj' loop
    execute format('drop policy %I on cj.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles: eu; meu círculo; meus líderes; quem me lidera; equipe.
create policy perfil_ler on cj.profiles for select to authenticated using (
  id = auth.uid() or cj.eh_equipe() or cj.compartilha_circulo(id) or cj.lidera_usuario(id) or cj.e_lider_do_meu_circulo(id));
create policy perfil_editar_proprio on cj.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy privado_ler on cj.profile_private for select to authenticated using (user_id = auth.uid() or cj.eh_equipe());
create policy privado_criar on cj.profile_private for insert to authenticated with check (user_id = auth.uid());
create policy privado_editar on cj.profile_private for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy termos_ler on cj.term_acceptances for select to authenticated using (user_id = auth.uid());
create policy termos_aceitar on cj.term_acceptances for insert to authenticated with check (user_id = auth.uid());

create policy consent_ler on cj.guardian_consents for select to authenticated using (minor_id = auth.uid() or cj.eh_equipe());
create policy consent_pedir on cj.guardian_consents for insert to authenticated
  with check (minor_id = auth.uid() and cj.perfil_valido());

create policy papeis_ler on cj.roles for select to authenticated using (user_id = auth.uid() or cj.eh_equipe());

-- círculos: informação básica dos círculos da MINHA faixa (para pedir entrada) + os que vejo.
create policy circulo_ler on cj.circles for select to authenticated using (
  cj.eh_equipe() or cj.ve_circulo(id) or (status = 'ativo' and cj.perfil_valido() and age_band = cj.minha_faixa()));
create policy circulo_criar on cj.circles for insert to authenticated with check (cj.eh_gestao());
create policy circulo_editar on cj.circles for update to authenticated using (cj.eh_gestao()) with check (cj.eh_gestao());

create policy membro_ler on cj.circle_members for select to authenticated using (
  user_id = auth.uid() or cj.lidera_circulo(circle_id) or cj.eh_equipe()
  or (membership_status = 'ativo' and cj.membro_do_circulo(circle_id)));
create policy membro_pedir on cj.circle_members for insert to authenticated
  with check (user_id = auth.uid() and cj.pode_social());
create policy membro_editar_proprio on cj.circle_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy membro_sair on cj.circle_members for delete to authenticated using (user_id = auth.uid());

create policy encontro_ler on cj.circle_meetings for select to authenticated using (cj.ve_circulo(circle_id));
create policy encontro_propor on cj.circle_meetings for insert to authenticated with check (
  cj.lidera_circulo(circle_id) or cj.eh_gestao() or (cj.membro_do_circulo(circle_id) and cj.pode_social()));
create policy encontro_editar on cj.circle_meetings for update to authenticated
  using (cj.lidera_circulo(circle_id) or cj.eh_gestao()) with check (cj.lidera_circulo(circle_id) or cj.eh_gestao());
create policy encontro_apagar on cj.circle_meetings for delete to authenticated
  using (cj.lidera_circulo(circle_id) or cj.eh_gestao());

create policy presenca_ler on cj.meeting_rsvps for select to authenticated using (
  user_id = auth.uid() or cj.lidera_circulo(cj.circulo_do_encontro(meeting_id)) or cj.eh_gestao());
create policy presenca_responder on cj.meeting_rsvps for insert to authenticated with check (
  user_id = auth.uid() and cj.membro_do_circulo(cj.circulo_do_encontro(meeting_id)));
create policy presenca_mudar on cj.meeting_rsvps for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and cj.membro_do_circulo(cj.circulo_do_encontro(meeting_id)));
create policy presenca_apagar on cj.meeting_rsvps for delete to authenticated using (user_id = auth.uid());

-- eventos: publicados, da minha faixa, e (se de círculo) do meu círculo.
create policy evento_ler on cj.events for select to authenticated using (
  cj.eh_equipe()
  or (circle_id is not null and cj.lidera_circulo(circle_id))
  or (status = 'publicado' and cj.perfil_valido() and cj.minha_faixa() = any(age_bands)
      and (circle_id is null or cj.membro_do_circulo(circle_id))));
create policy evento_criar on cj.events for insert to authenticated with check (
  cj.eh_gestao() or (circle_id is not null and cj.lidera_circulo(circle_id)));
create policy evento_editar on cj.events for update to authenticated
  using (cj.eh_gestao() or (circle_id is not null and cj.lidera_circulo(circle_id)))
  with check (cj.eh_gestao() or (circle_id is not null and cj.lidera_circulo(circle_id)));
create policy evento_apagar on cj.events for delete to authenticated using (cj.eh_gestao());

create policy inscricao_ler on cj.event_registrations for select to authenticated using (
  user_id = auth.uid() or cj.eh_equipe() or cj.lidera_evento(event_id));
create policy inscricao_criar on cj.event_registrations for insert to authenticated with check (
  user_id = auth.uid() and cj.perfil_valido() and exists (select 1 from cj.events e where e.id = event_id));
create policy inscricao_cancelar on cj.event_registrations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy devocional_ler on cj.devotionals for select to authenticated using (
  cj.eh_gestao()
  or (status = 'publicado' and publish_date <= (now() at time zone 'America/Sao_Paulo')::date and cj.perfil_valido()));
create policy devocional_criar on cj.devotionals for insert to authenticated with check (cj.eh_gestao());
create policy devocional_editar on cj.devotionals for update to authenticated using (cj.eh_gestao()) with check (cj.eh_gestao());

create policy etapa_ler on cj.journey_steps for select to authenticated using (cj.perfil_valido() or cj.eh_equipe());
create policy etapa_criar on cj.journey_steps for insert to authenticated with check (cj.eh_gestao());
create policy etapa_editar on cj.journey_steps for update to authenticated using (cj.eh_gestao()) with check (cj.eh_gestao());
create policy etapa_apagar on cj.journey_steps for delete to authenticated using (cj.eh_gestao());

create policy jornada_ler on cj.journey_progress for select to authenticated using (
  user_id = auth.uid() or cj.lidera_usuario(user_id) or cj.eh_gestao());
create policy jornada_criar on cj.journey_progress for insert to authenticated with check (user_id = auth.uid() and cj.perfil_valido());
create policy jornada_editar on cj.journey_progress for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy jornada_apagar on cj.journey_progress for delete to authenticated using (user_id = auth.uid());

create policy missao_ler on cj.missions for select to authenticated using (
  cj.eh_gestao() or (status = 'publicado' and cj.perfil_valido() and cj.minha_faixa() = any(age_bands)));
create policy missao_criar on cj.missions for insert to authenticated with check (cj.eh_gestao());
create policy missao_editar on cj.missions for update to authenticated using (cj.eh_gestao()) with check (cj.eh_gestao());

-- participação em missão: só o próprio jovem (liderança vê só totais).
create policy participacao_propria on cj.mission_participation for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and cj.perfil_valido());

-- pedidos de oração: SÓ o dono, direto. Equipe lê por cj.ler_pedidos_oracao() (auditada).
create policy oracao_ler_propria on cj.prayer_requests for select to authenticated using (owner_id = auth.uid());
create policy oracao_criar on cj.prayer_requests for insert to authenticated with check (owner_id = auth.uid() and cj.perfil_valido());
create policy oracao_apagar_propria on cj.prayer_requests for delete to authenticated using (owner_id = auth.uid());

-- pedidos de conversa: SÓ o solicitante, direto. Equipe/responsável lê por cj.ler_conversas() (auditada).
create policy conversa_ler_propria on cj.conversation_requests for select to authenticated using (requester_id = auth.uid());
create policy conversa_criar on cj.conversation_requests for insert to authenticated
  with check (requester_id = auth.uid() and cj.perfil_valido());
create policy conversa_cancelar on cj.conversation_requests for delete to authenticated
  using (requester_id = auth.uid() and status = 'aberto');

-- mural: aprovado + recursos sociais liberados + autor não bloqueado + (se de círculo) do meu círculo.
create policy post_ler on cj.content_posts for select to authenticated using (
  author_id = auth.uid() or cj.eh_equipe()
  or (circle_id is not null and cj.lidera_circulo(circle_id))
  or (moderation_status = 'aprovado' and cj.pode_social() and not cj.bloqueado_por_mim(author_id)
      and (circle_id is null or cj.membro_do_circulo(circle_id))));
create policy post_criar on cj.content_posts for insert to authenticated with check (
  author_id = auth.uid() and cj.pode_social()
  and (circle_id is null or cj.membro_do_circulo(circle_id) or cj.lidera_circulo(circle_id)));
create policy post_apagar_proprio on cj.content_posts for delete to authenticated using (author_id = auth.uid());

create policy comentario_ler on cj.content_comments for select to authenticated using (
  author_id = auth.uid() or cj.eh_equipe()
  or (moderation_status = 'aprovado' and cj.pode_social() and not cj.bloqueado_por_mim(author_id)
      and exists (select 1 from cj.content_posts p where p.id = post_id)));
create policy comentario_criar on cj.content_comments for insert to authenticated with check (
  author_id = auth.uid() and cj.pode_social()
  and exists (select 1 from cj.content_posts p where p.id = post_id and p.moderation_status = 'aprovado'));
create policy comentario_apagar_proprio on cj.content_comments for delete to authenticated using (author_id = auth.uid());

create policy bloqueio_proprio on cj.user_blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- denúncia: qualquer perfil válido denuncia (inclusive menor sem consentimento); vê só as suas.
create policy denuncia_ler_propria on cj.reports for select to authenticated using (reporter_id = auth.uid());
create policy denuncia_criar on cj.reports for insert to authenticated with check (reporter_id = auth.uid() and cj.perfil_valido());

create policy talento_ler on cj.talent_interests for select to authenticated using (user_id = auth.uid() or cj.eh_gestao());
create policy talento_criar on cj.talent_interests for insert to authenticated with check (user_id = auth.uid() and cj.perfil_valido());
create policy talento_editar on cj.talent_interests for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy auditoria_ler on cj.audit_logs for select to authenticated using (
  cj.tem_algum_papel('{pastor,safeguarding_admin}'::cj.papel[]));

-- ═══════════════════════════════════════════════════════════════════════════════
-- PRIVILÉGIOS (camada 1; o RLS é a camada 2). Colunas sensíveis só por função.
-- ═══════════════════════════════════════════════════════════════════════════════
revoke all on all tables in schema cj from public, anon, authenticated;
revoke all on all sequences in schema cj from public, anon, authenticated;
revoke all on all functions in schema cj from public, anon, authenticated;

grant select on cj.profiles to authenticated;
grant update (display_name, bio, avatar_path, interests, show_full_name, notification_prefs) on cj.profiles to authenticated;
grant select on cj.profile_private to authenticated;
grant insert (user_id, birth_date, contact) on cj.profile_private to authenticated;
grant update (birth_date, contact) on cj.profile_private to authenticated;
grant select, insert on cj.term_acceptances to authenticated;
grant select on cj.guardian_consents to authenticated;
grant insert (minor_id, guardian_name, guardian_relationship, guardian_contact, allow_social, allow_events, allow_image, policy_version)
  on cj.guardian_consents to authenticated;
grant select on cj.roles to authenticated;
grant select, insert, update on cj.circles to authenticated;
grant select, delete on cj.circle_members to authenticated;
grant insert (circle_id, user_id, visibility_preferences) on cj.circle_members to authenticated;
grant update (change_requested, visibility_preferences) on cj.circle_members to authenticated;
grant select, update, delete on cj.circle_meetings to authenticated;
grant insert (circle_id, starts_at, theme, place_note, status) on cj.circle_meetings to authenticated;
grant select, insert, delete on cj.meeting_rsvps to authenticated;
grant update (response) on cj.meeting_rsvps to authenticated;
grant select, insert, update, delete on cj.events to authenticated;
grant select on cj.event_registrations to authenticated;
grant insert (event_id, user_id) on cj.event_registrations to authenticated;
grant update (status) on cj.event_registrations to authenticated;
grant select, insert, update on cj.devotionals to authenticated;
grant select, insert, update, delete on cj.journey_steps to authenticated;
grant select, insert, update, delete on cj.journey_progress to authenticated;
grant select, insert, update on cj.missions to authenticated;
grant select, insert, update, delete on cj.mission_participation to authenticated;
grant select, delete on cj.prayer_requests to authenticated;
grant insert (owner_id, body, visibility) on cj.prayer_requests to authenticated;
grant select, delete on cj.conversation_requests to authenticated;
grant insert (requester_id, category, note, preferred_channel) on cj.conversation_requests to authenticated;
grant select, delete on cj.content_posts to authenticated;
grant insert (author_id, circle_id, kind, body, media_path, testimony_consent) on cj.content_posts to authenticated;
grant select, delete on cj.content_comments to authenticated;
grant insert (post_id, author_id, body) on cj.content_comments to authenticated;
grant select, insert, delete on cj.user_blocks to authenticated;
grant select on cj.reports to authenticated;
grant insert (reporter_id, target_type, target_id, reason, details) on cj.reports to authenticated;
grant select, insert on cj.talent_interests to authenticated;
grant update (talents, availability, note) on cj.talent_interests to authenticated;
grant select on cj.audit_logs to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNÇÕES DA EQUIPE (security definer, checam papel, ficam na auditoria)
-- Erro 42501 = sem permissão.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Leitura AUDITADA dos pedidos de oração. Cada pedido lido vira uma linha em audit_logs.
--  pastor: todos · youth_admin: só 'equipe_pastoral' · safeguarding_admin: só os escalados.
create or replace function cj.ler_pedidos_oracao() returns setof cj.prayer_requests
language plpgsql security definer set search_path = '' as $$
declare r cj.prayer_requests; pastor boolean := cj.tem_papel('pastor');
        coord boolean := cj.tem_papel('youth_admin'); prot boolean := cj.tem_papel('safeguarding_admin');
begin
  if not (pastor or coord or prot) then
    raise exception 'sem permissão para ler pedidos de oração' using errcode = '42501';
  end if;
  perform cj.auditar('consultar', 'prayer_requests', null, jsonb_build_object('via', 'ler_pedidos_oracao'));
  for r in select p.* from cj.prayer_requests p
            where pastor
               or (coord and p.visibility = 'equipe_pastoral')
               or (prot and p.escalated_to_safeguarding)
            order by p.created_at desc loop
    perform cj.auditar('ler', 'prayer_requests', r.id::text, jsonb_build_object('via', 'ler_pedidos_oracao'));
    return next r;
  end loop;
end $$;

create or replace function cj.atualizar_pedido_oracao(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  select visibility into v from cj.prayer_requests where id = p_id;
  if v is null then raise exception 'pedido não encontrado' using errcode = 'P0002'; end if;
  if not (cj.tem_papel('pastor') or (v = 'equipe_pastoral' and cj.tem_papel('youth_admin'))) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  update cj.prayer_requests set status = p_status where id = p_id;
end $$;

-- Leitura AUDITADA dos pedidos de conversa.
--  pastor/youth_admin: todos · responsável designado: os seus · safeguarding: proteção/escalados.
create or replace function cj.ler_conversas() returns setof cj.conversation_requests
language plpgsql security definer set search_path = '' as $$
declare r cj.conversation_requests; gestao boolean := cj.eh_gestao(); prot boolean := cj.tem_papel('safeguarding_admin');
        lider boolean := cj.tem_algum_papel('{circle_leader,assistant}'::cj.papel[]);
begin
  if not (gestao or prot or lider) then
    raise exception 'sem permissão para ler pedidos de conversa' using errcode = '42501';
  end if;
  perform cj.auditar('consultar', 'conversation_requests', null, jsonb_build_object('via', 'ler_conversas'));
  for r in select c.* from cj.conversation_requests c
            where gestao or c.assigned_to = auth.uid()
               or (prot and (c.category = 'protecao' or c.escalated_to_safeguarding))
            order by c.response_due_at loop
    perform cj.auditar('ler', 'conversation_requests', r.id::text, jsonb_build_object('via', 'ler_conversas'));
    return next r;
  end loop;
end $$;

-- Designa quem responde. Responsável precisa ter papel de cuidado (adulto, aprovado).
create or replace function cj.atribuir_conversa(p_id uuid, p_responsavel uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not cj.eh_gestao() then raise exception 'sem permissão' using errcode = '42501'; end if;
  if cj.eh_menor(p_responsavel) or not (
       cj.usuario_tem_papel(p_responsavel, 'circle_leader') or cj.usuario_tem_papel(p_responsavel, 'assistant')
    or cj.usuario_tem_papel(p_responsavel, 'youth_admin') or cj.usuario_tem_papel(p_responsavel, 'pastor')
    or cj.usuario_tem_papel(p_responsavel, 'safeguarding_admin')) then
    raise exception 'responsável precisa ser adulto da equipe de cuidado' using errcode = '23514';
  end if;
  update cj.conversation_requests set assigned_to = p_responsavel, status = 'atribuido' where id = p_id;
  if not found then raise exception 'pedido não encontrado' using errcode = 'P0002'; end if;
end $$;

create or replace function cj.atualizar_conversa(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare resp uuid;
begin
  select assigned_to into resp from cj.conversation_requests where id = p_id;
  if not found then raise exception 'pedido não encontrado' using errcode = 'P0002'; end if;
  if not (cj.eh_gestao() or resp = auth.uid()) then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_status not in ('respondido','encerrado','encaminhado') then
    raise exception 'status inválido' using errcode = '22023';
  end if;
  update cj.conversation_requests
     set status = p_status, closed_at = case when p_status = 'encerrado' then now() else closed_at end
   where id = p_id;
end $$;

-- Encaminha à equipe de proteção (risco, abuso, violência...). Fica auditado.
create or replace function cj.escalar_para_protecao(p_tipo text, p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_tipo = 'oracao' then
    if not cj.eh_gestao() then raise exception 'sem permissão' using errcode = '42501'; end if;
    update cj.prayer_requests set escalated_to_safeguarding = true where id = p_id;
  elsif p_tipo = 'conversa' then
    if not (cj.eh_gestao() or exists (select 1 from cj.conversation_requests where id = p_id and assigned_to = auth.uid())) then
      raise exception 'sem permissão' using errcode = '42501';
    end if;
    update cj.conversation_requests set escalated_to_safeguarding = true, status = 'encaminhado' where id = p_id;
  else
    raise exception 'tipo inválido' using errcode = '22023';
  end if;
  if not found then raise exception 'registro não encontrado' using errcode = 'P0002'; end if;
end $$;

-- Leitura AUDITADA das denúncias. proteção/pastor: todas · coordenação: só de conteúdo.
create or replace function cj.ler_denuncias() returns setof cj.reports
language plpgsql security definer set search_path = '' as $$
declare r cj.reports; total boolean := cj.tem_algum_papel('{pastor,safeguarding_admin}'::cj.papel[]);
        coord boolean := cj.tem_papel('youth_admin');
begin
  if not (total or coord) then raise exception 'sem permissão para ler denúncias' using errcode = '42501'; end if;
  perform cj.auditar('consultar', 'reports', null, jsonb_build_object('via', 'ler_denuncias'));
  for r in select d.* from cj.reports d
            where total or (coord and d.target_type in ('post','comentario') and d.severity = 'normal')
            order by (d.severity = 'critica') desc, d.created_at loop
    perform cj.auditar('ler', 'reports', r.id::text, jsonb_build_object('via', 'ler_denuncias'));
    return next r;
  end loop;
end $$;

create or replace function cj.tratar_denuncia(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare d cj.reports;
begin
  select * into d from cj.reports where id = p_id;
  if not found then raise exception 'denúncia não encontrada' using errcode = 'P0002'; end if;
  if not (cj.tem_algum_papel('{pastor,safeguarding_admin}'::cj.papel[])
          or (cj.tem_papel('youth_admin') and d.target_type in ('post','comentario') and d.severity = 'normal')) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if p_status not in ('em_analise','resolvida','descartada') then raise exception 'status inválido' using errcode = '22023'; end if;
  update cj.reports set status = p_status, handled_by = auth.uid(), handled_at = now() where id = p_id;
end $$;

-- Moderação de post/comentário: equipe, ou líder/auxiliar no próprio círculo.
create or replace function cj.moderar(p_tipo text, p_id uuid, p_decisao text) returns void
language plpgsql security definer set search_path = '' as $$
declare c uuid;
begin
  if p_decisao not in ('aprovado','rejeitado','removido') then raise exception 'decisão inválida' using errcode = '22023'; end if;
  if p_tipo = 'post' then
    select circle_id into c from cj.content_posts where id = p_id;
    if not found then raise exception 'publicação não encontrada' using errcode = 'P0002'; end if;
    if not (cj.eh_equipe() or (c is not null and cj.lidera_circulo(c))) then
      raise exception 'sem permissão para moderar' using errcode = '42501';
    end if;
    update cj.content_posts set moderation_status = p_decisao, moderated_by = auth.uid(), moderated_at = now() where id = p_id;
  elsif p_tipo = 'comentario' then
    select p.circle_id into c from cj.content_comments k join cj.content_posts p on p.id = k.post_id where k.id = p_id;
    if not found then raise exception 'comentário não encontrado' using errcode = 'P0002'; end if;
    if not (cj.eh_equipe() or (c is not null and cj.lidera_circulo(c))) then
      raise exception 'sem permissão para moderar' using errcode = '42501';
    end if;
    update cj.content_comments set moderation_status = p_decisao, moderated_by = auth.uid(), moderated_at = now() where id = p_id;
  else
    raise exception 'tipo inválido' using errcode = '22023';
  end if;
end $$;

-- Decide o consentimento do responsável (depois de verificar quem é o responsável).
create or replace function cj.decidir_consentimento(p_id uuid, p_decisao text, p_metodo text) returns void
language plpgsql security definer set search_path = '' as $$
declare menor uuid;
begin
  if not cj.eh_equipe() then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_decisao not in ('aprovado','recusado','revogado') then raise exception 'decisão inválida' using errcode = '22023'; end if;
  select minor_id into menor from cj.guardian_consents where id = p_id;
  if not found then raise exception 'consentimento não encontrado' using errcode = 'P0002'; end if;
  if menor = auth.uid() then raise exception 'ninguém decide o próprio consentimento' using errcode = '42501'; end if;
  update cj.guardian_consents
     set status = p_decisao, verification_method = coalesce(p_metodo, verification_method),
         verified_by = auth.uid(), verified_at = now()
   where id = p_id;
end $$;

-- Aceita/recusa/remove integrante: líder do círculo ou gestão. Respeita o limite do círculo.
create or replace function cj.decidir_membro(p_circulo uuid, p_usuario uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare lim smallint; n integer;
begin
  if not (cj.lidera_circulo(p_circulo) or cj.eh_gestao()) then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_status not in ('ativo','recusado','removido') then raise exception 'status inválido' using errcode = '22023'; end if;
  if p_status = 'ativo' then
    select max_members into lim from cj.circles where id = p_circulo;
    select count(*) into n from cj.circle_members where circle_id = p_circulo and membership_status = 'ativo';
    if n >= lim then raise exception 'círculo cheio' using errcode = '23514'; end if;
  end if;
  update cj.circle_members
     set membership_status = p_status, joined_at = case when p_status = 'ativo' then now() else joined_at end,
         change_requested = false
   where circle_id = p_circulo and user_id = p_usuario;
  if not found then raise exception 'pedido não encontrado' using errcode = 'P0002'; end if;
end $$;

-- Autorização do responsável para um evento específico (equipe).
create or replace function cj.decidir_autorizacao_evento(p_evento uuid, p_usuario uuid, p_aprovado boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not cj.eh_equipe() then raise exception 'sem permissão' using errcode = '42501'; end if;
  update cj.event_registrations
     set consent_status = case when p_aprovado then 'aprovado' else 'recusado' end,
         status = case when p_aprovado then 'confirmada' else 'cancelada' end,
         consent_decided_by = auth.uid()
   where event_id = p_evento and user_id = p_usuario and consent_status = 'pendente';
  if not found then raise exception 'não há autorização pendente' using errcode = 'P0002'; end if;
end $$;

-- Check-in/check-out (entrada e retirada de menores): equipe ou líder do evento de círculo.
create or replace function cj.registrar_presenca_evento(p_evento uuid, p_usuario uuid, p_tipo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (cj.eh_equipe() or cj.lidera_evento(p_evento)) then raise exception 'sem permissão' using errcode = '42501'; end if;
  update cj.event_registrations
     set check_in_at  = case when p_tipo = 'entrada' then now() else check_in_at end,
         check_out_at = case when p_tipo = 'saida' then now() else check_out_at end
   where event_id = p_evento and user_id = p_usuario and status = 'confirmada';
  if not found then raise exception 'inscrição confirmada não encontrada' using errcode = 'P0002'; end if;
end $$;

-- Concede papel. youth_admin: member/circle_leader/assistant. pastor: qualquer um.
-- safeguarding_admin e pastor: só o pastor concede. Menor não recebe papel de liderança.
create or replace function cj.conceder_papel(p_usuario uuid, p_papel cj.papel) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_usuario = auth.uid() and not cj.tem_papel('pastor') then
    raise exception 'ninguém concede papel a si mesmo' using errcode = '42501';
  end if;
  if not (cj.tem_papel('pastor') or (cj.tem_papel('youth_admin') and p_papel in ('member','circle_leader','assistant'))) then
    raise exception 'sem permissão para conceder este papel' using errcode = '42501';
  end if;
  if p_papel <> 'member' and cj.eh_menor(p_usuario) then
    raise exception 'menor de idade não recebe papel de liderança' using errcode = '23514';
  end if;
  insert into cj.roles(user_id, role, granted_by) values (p_usuario, p_papel, auth.uid())
  on conflict (user_id, role) do nothing;
end $$;

create or replace function cj.revogar_papel(p_usuario uuid, p_papel cj.papel) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (cj.tem_papel('pastor') or (cj.tem_papel('youth_admin') and p_papel in ('member','circle_leader','assistant'))) then
    raise exception 'sem permissão para revogar este papel' using errcode = '42501';
  end if;
  delete from cj.roles where user_id = p_usuario and role = p_papel;
end $$;

-- Ativa/suspende perfil (gestão).
create or replace function cj.definir_status_perfil(p_usuario uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not cj.eh_gestao() then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_status not in ('pendente','ativo','suspenso') then raise exception 'status inválido' using errcode = '22023'; end if;
  update cj.profiles set status = p_status where id = p_usuario;
  if not found then raise exception 'perfil não encontrado' using errcode = 'P0002'; end if;
end $$;

-- Corrige a faixa etária (ela é autodeclarada; o acolhimento humano confere).
-- Se a faixa muda, a pessoa sai do círculo atual (círculos são por faixa) e, se virou
-- menor, perde os papéis de liderança e volta a precisar de consentimento.
create or replace function cj.definir_faixa(p_usuario uuid, p_faixa cj.faixa_etaria) returns void
language plpgsql security definer set search_path = '' as $$
declare atual cj.faixa_etaria;
begin
  if not cj.eh_gestao() then raise exception 'sem permissão' using errcode = '42501'; end if;
  select age_band into atual from cj.profiles where id = p_usuario;
  if not found then raise exception 'perfil não encontrado' using errcode = 'P0002'; end if;
  if atual = p_faixa then return; end if;
  update cj.circle_members set membership_status = 'removido'
   where user_id = p_usuario and membership_status in ('ativo','solicitado');
  if p_faixa = '15-17' then
    delete from cj.roles where user_id = p_usuario and role <> 'member';
    update cj.circles set leader_id = null where leader_id = p_usuario;
    update cj.circles set assistant_id = null where assistant_id = p_usuario;
  end if;
  update cj.profiles set age_band = p_faixa where id = p_usuario;
end $$;

-- Registra o 1º contato humano de acolhimento (indicador "tempo até acolhimento").
create or replace function cj.registrar_acolhimento(p_usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (cj.eh_equipe() or cj.tem_algum_papel('{circle_leader,assistant}'::cj.papel[])) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  insert into cj.profile_private(user_id, first_contact_at, first_contact_by) values (p_usuario, now(), auth.uid())
  on conflict (user_id) do update set first_contact_at = coalesce(cj.profile_private.first_contact_at, now()),
                                      first_contact_by = coalesce(cj.profile_private.first_contact_by, auth.uid());
end $$;

-- Painel da liderança: SÓ números agregados. Nada de nomes, textos ou diário.
create or replace function cj.painel_indicadores() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare j jsonb;
begin
  if not cj.eh_gestao() then raise exception 'sem permissão' using errcode = '42501'; end if;
  perform cj.auditar('consultar', 'painel', null, '{}'::jsonb);
  select jsonb_build_object(
    'participantes', (select count(*) from cj.profiles where status in ('pendente','ativo')),
    'sem_acolhimento', (select count(*) from cj.profiles p left join cj.profile_private pp on pp.user_id = p.id
                         where p.status in ('pendente','ativo') and pp.first_contact_at is null),
    'horas_medias_ate_acolhimento', (select round(avg(extract(epoch from (first_contact_at - requested_at)) / 3600)::numeric, 1)
                                       from cj.profile_private where first_contact_at is not null),
    'conectados_a_circulo', (select count(distinct user_id) from cj.circle_members where membership_status = 'ativo'),
    'circulos_sem_encontro_planejado', (select count(*) from cj.circles c where c.status = 'ativo' and not exists (
         select 1 from cj.circle_meetings m where m.circle_id = c.id and m.starts_at > now() and m.status in ('proposto','confirmado'))),
    'conversas_aguardando', (select count(*) from cj.conversation_requests where status in ('aberto','atribuido')),
    'conversas_fora_do_prazo', (select count(*) from cj.conversation_requests where status in ('aberto','atribuido') and response_due_at < now()),
    'denuncias_abertas', (select count(*) from cj.reports where status in ('aberta','em_analise')),
    'consentimentos_pendentes', (select count(*) from cj.guardian_consents where status = 'pendente')
  ) into j;
  return j;
end $$;

-- Missão: só totais (sem placar, sem nomes, sem reflexões).
create or replace function cj.resumo_missao(p_missao uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not cj.eh_gestao() then raise exception 'sem permissão' using errcode = '42501'; end if;
  return (select jsonb_build_object('aceitaram', count(*) filter (where status in ('aceita','concluida')),
                                    'concluiram', count(*) filter (where status = 'concluida'))
            from cj.mission_participation where mission_id = p_missao);
end $$;

-- Nome público (primeiro nome + inicial, salvo se a pessoa optou pelo nome completo),
-- só para quem tem motivo para ver: mesmo círculo, liderança, equipe, ou autor de algo aprovado.
create or replace function cj.nome_publico(p_usuario uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when p.show_full_name then p.display_name
              else split_part(btrim(p.display_name), ' ', 1)
                   || coalesce(' ' || nullif(left(split_part(btrim(p.display_name), ' ', 2), 1), '') || '.', '') end
    from cj.profiles p
   where p.id = p_usuario
     and cj.perfil_valido()
     and (p.id = auth.uid() or cj.eh_equipe() or cj.compartilha_circulo(p.id) or cj.lidera_usuario(p.id)
          or cj.e_lider_do_meu_circulo(p.id)
          or (cj.pode_social() and (exists (select 1 from cj.content_posts x where x.author_id = p.id and x.moderation_status = 'aprovado')
                                 or exists (select 1 from cj.content_comments x where x.author_id = p.id and x.moderation_status = 'aprovado'))))
$$;

-- LGPD: exportar os meus dados (titular).
create or replace function cj.exportar_meus_dados() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); j jsonb;
begin
  if u is null or not exists (select 1 from cj.profiles where id = u) then raise exception 'sem perfil' using errcode = '42501'; end if;
  perform cj.auditar('exportar', 'profiles', u::text, '{}'::jsonb);
  select jsonb_build_object(
    'perfil', (select to_jsonb(p) - 'radar_key_hash' from cj.profiles p where p.id = u),
    'dados_privados', (select to_jsonb(x) from cj.profile_private x where x.user_id = u),
    'termos', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from cj.term_acceptances x where x.user_id = u),
    'consentimentos', (select coalesce(jsonb_agg(to_jsonb(x) - 'verified_by'), '[]') from cj.guardian_consents x where x.minor_id = u),
    'circulos', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from cj.circle_members x where x.user_id = u),
    'inscricoes', (select coalesce(jsonb_agg(to_jsonb(x) - 'consent_decided_by'), '[]') from cj.event_registrations x where x.user_id = u),
    'jornada', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from cj.journey_progress x where x.user_id = u),
    'missoes', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from cj.mission_participation x where x.user_id = u),
    'pedidos_oracao', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from cj.prayer_requests x where x.owner_id = u),
    'pedidos_conversa', (select coalesce(jsonb_agg(to_jsonb(x) - 'assigned_to'), '[]') from cj.conversation_requests x where x.requester_id = u),
    'publicacoes', (select coalesce(jsonb_agg(to_jsonb(x) - 'moderated_by'), '[]') from cj.content_posts x where x.author_id = u),
    'comentarios', (select coalesce(jsonb_agg(to_jsonb(x) - 'moderated_by'), '[]') from cj.content_comments x where x.author_id = u),
    'talentos', (select to_jsonb(x) from cj.talent_interests x where x.user_id = u),
    'denuncias_feitas', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'motivo', x.reason, 'status', x.status, 'criada', x.created_at)), '[]')
                           from cj.reports x where x.reporter_id = u)
  ) into j;
  return j;
end $$;

-- LGPD: excluir minha conta (apaga em cascata; denúncias feitas ficam anônimas;
-- a trilha de auditoria permanece pelo prazo de retenção — decisão pendente).
create or replace function cj.excluir_minha_conta() returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'sem sessão' using errcode = '42501'; end if;
  perform cj.auditar('excluir_conta', 'profiles', u::text, '{}'::jsonb);
  delete from cj.profiles where id = u;
end $$;

-- Retenção: expurga auditoria antiga. NÃO é liberada a nenhum papel do app;
-- roda só pelo dono do banco, conforme a política de retenção aprovada.
create or replace function cj.expurgar_auditoria(p_antes timestamptz) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  perform set_config('cj.expurgo', 'sim', true);
  delete from cj.audit_logs where created_at < p_antes;
  get diagnostics n = row_count;
  perform set_config('cj.expurgo', '', true);
  return n;
end $$;

-- Execução de funções: só `authenticated`, e só as que fazem sentido.
-- (cj.auditar, cj.expurgar_auditoria e as funções de gatilho NÃO são liberadas.)
revoke all on all functions in schema cj from public, anon, authenticated;
grant execute on function
  cj.eh_cliente(), cj.minha_faixa(), cj.perfil_valido(), cj.usuario_tem_papel(uuid, cj.papel), cj.tem_papel(cj.papel),
  cj.tem_algum_papel(cj.papel[]), cj.eh_equipe(), cj.eh_gestao(), cj.eh_menor(uuid), cj.consentimento_aprovado(uuid, text),
  cj.pode_social(), cj.lidera_circulo(uuid), cj.membro_do_circulo(uuid), cj.ve_circulo(uuid), cj.lidera_usuario(uuid),
  cj.compartilha_circulo(uuid), cj.e_lider_do_meu_circulo(uuid), cj.bloqueado_por_mim(uuid), cj.circulo_do_encontro(uuid),
  cj.lidera_evento(uuid), cj.ocupacao_evento(uuid), cj.prazo_util(timestamptz, integer),
  cj.ler_pedidos_oracao(), cj.atualizar_pedido_oracao(uuid, text), cj.ler_conversas(), cj.atribuir_conversa(uuid, uuid),
  cj.atualizar_conversa(uuid, text), cj.escalar_para_protecao(text, uuid), cj.ler_denuncias(), cj.tratar_denuncia(uuid, text),
  cj.moderar(text, uuid, text), cj.decidir_consentimento(uuid, text, text), cj.decidir_membro(uuid, uuid, text),
  cj.decidir_autorizacao_evento(uuid, uuid, boolean), cj.registrar_presenca_evento(uuid, uuid, text),
  cj.conceder_papel(uuid, cj.papel), cj.revogar_papel(uuid, cj.papel), cj.definir_status_perfil(uuid, text),
  cj.definir_faixa(uuid, cj.faixa_etaria),
  cj.registrar_acolhimento(uuid), cj.painel_indicadores(), cj.resumo_missao(uuid), cj.nome_publico(uuid),
  cj.exportar_meus_dados(), cj.excluir_minha_conta()
to authenticated;

-- Funções de gatilho não recebem EXECUTE: o Postgres não confere esse privilégio ao disparar
-- um gatilho, e elas não podem ser chamadas diretamente.

-- Fim da migração 001.
