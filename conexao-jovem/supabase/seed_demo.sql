-- ═══════════════════════════════════════════════════════════════════════════════
-- CONEXÃO JOVEM — DADOS DE DEMONSTRAÇÃO (FICTÍCIOS)
--
-- ⚠️ TUDO AQUI É INVENTADO. Nenhuma pessoa real. Nomes terminam com "(demo)",
--    registros têm is_demo = true e os UUIDs começam com 00000000-0000-4000-8000-.
-- ⚠️ NUNCA rodar no banco de produção. Por isso o arquivo SE RECUSA a rodar sem a trava:
--       set cj.permitir_seed_demo = 'sim';
-- Usado pelos testes automáticos (conexao-jovem/testes/) e por ambientes de homologação.
-- Idempotente: rodar duas vezes não duplica nada.
-- ═══════════════════════════════════════════════════════════════════════════════

do $$ begin
  if coalesce(current_setting('cj.permitir_seed_demo', true), '') <> 'sim' then
    raise exception 'seed_demo.sql recusado: rode "set cj.permitir_seed_demo = ''sim'';" antes (e nunca em produção).';
  end if;
end $$;

-- ─── Pessoas fictícias ────────────────────────────────────────────────────────
-- radar_key_hash de demonstração = sha256('demo:<apelido>'), não corresponde a telefone nenhum.
insert into cj.profiles (id, radar_key_hash, display_name, age_band, bio, interests, status, is_demo) values
 ('00000000-0000-4000-8000-000000000001', encode(sha256(convert_to('demo:pastor','UTF8')),'hex'),  'Pastor Samuel (demo)',    '22-25', null, '{}', 'ativo', true),
 ('00000000-0000-4000-8000-000000000002', encode(sha256(convert_to('demo:coord','UTF8')),'hex'),   'Coordenadora Lia (demo)', '22-25', null, '{}', 'ativo', true),
 ('00000000-0000-4000-8000-000000000003', encode(sha256(convert_to('demo:protecao','UTF8')),'hex'),'Irmã Rute (demo)',        '22-25', null, '{}', 'ativo', true),
 ('00000000-0000-4000-8000-000000000004', encode(sha256(convert_to('demo:rafael','UTF8')),'hex'),  'Rafael Teixeira (demo)',  '22-25', 'Líder do Círculo Esperança.', '{}', 'ativo', true),
 ('00000000-0000-4000-8000-000000000005', encode(sha256(convert_to('demo:camila','UTF8')),'hex'),  'Camila Souza (demo)',     '22-25', 'Auxiliar do Círculo Esperança.', '{}', 'ativo', true),
 ('00000000-0000-4000-8000-000000000006', encode(sha256(convert_to('demo:marcos','UTF8')),'hex'),  'Marcos Lima (demo)',      '22-25', 'Líder do Círculo Renovo.', '{}', 'ativo', true),
 ('00000000-0000-4000-8000-000000000007', encode(sha256(convert_to('demo:davi','UTF8')),'hex'),    'Davi Andrade (demo)',     '18-21', 'Gosto de música e futebol.', '{Louvor,Esporte}', 'ativo', true),
 ('00000000-0000-4000-8000-000000000008', encode(sha256(convert_to('demo:ana','UTF8')),'hex'),     'Ana Barros (demo)',       '18-21', null, '{Amizade}', 'ativo', true),
 ('00000000-0000-4000-8000-000000000009', encode(sha256(convert_to('demo:lucas','UTF8')),'hex'),   'Lucas Mendes (demo)',     '18-21', null, '{}', 'ativo', true),
 ('00000000-0000-4000-8000-000000000010', encode(sha256(convert_to('demo:bruno','UTF8')),'hex'),   'Bruno Costa (demo)',      '22-25', 'Líder do Círculo Caminho.', '{}', 'ativo', true),
 ('00000000-0000-4000-8000-000000000011', encode(sha256(convert_to('demo:bia','UTF8')),'hex'),     'Bia Ramos (demo)',        '15-17', null, '{}', 'ativo', true),
 ('00000000-0000-4000-8000-000000000012', encode(sha256(convert_to('demo:theo','UTF8')),'hex'),    'Theo Nunes (demo)',       '15-17', null, '{}', 'ativo', true),
 ('00000000-0000-4000-8000-000000000013', encode(sha256(convert_to('demo:novo','UTF8')),'hex'),    'Jonas Pereira (demo)',    '18-21', null, '{}', 'pendente', true)
on conflict (id) do nothing;

insert into cj.profile_private (user_id, requested_at, first_contact_at, first_contact_by) values
 ('00000000-0000-4000-8000-000000000007', now() - interval '12 days', now() - interval '11 days', '00000000-0000-4000-8000-000000000004'),
 ('00000000-0000-4000-8000-000000000008', now() - interval '40 days', now() - interval '39 days', '00000000-0000-4000-8000-000000000004'),
 ('00000000-0000-4000-8000-000000000013', now() - interval '2 days', null, null)
on conflict (user_id) do nothing;

-- Regras da comunidade aceitas por todos os perfis ativos (inclusive o Theo, cujo
-- único bloqueio é o consentimento do responsável ainda pendente).
insert into cj.term_acceptances (user_id, document, version)
select id, d, '2026-11' from cj.profiles, unnest(array['termos_uso','privacidade','regras_comunidade']) d
 where is_demo and status = 'ativo'
on conflict do nothing;

insert into cj.roles (user_id, role, granted_by) values
 ('00000000-0000-4000-8000-000000000001', 'pastor',             null),
 ('00000000-0000-4000-8000-000000000002', 'youth_admin',        '00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000003', 'safeguarding_admin', '00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000004', 'circle_leader',      '00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000005', 'assistant',          '00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000006', 'circle_leader',      '00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000010', 'circle_leader',      '00000000-0000-4000-8000-000000000002')
on conflict do nothing;

-- Consentimentos: Bia aprovado (verificado presencialmente); Theo ainda pendente.
insert into cj.guardian_consents (id, minor_id, guardian_name, guardian_relationship, guardian_contact,
                                  allow_social, allow_events, allow_image, policy_version, status,
                                  verification_method, verified_by, verified_at) values
 ('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000011', 'Responsável da Bia (demo)', 'mae',
  'contato fictício 0000-0000', true, true, false, '2026-11', 'aprovado', 'presencial',
  '00000000-0000-4000-8000-000000000002', now() - interval '5 days'),
 ('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000012', 'Responsável do Theo (demo)', 'pai',
  'contato fictício 0000-0001', true, true, false, '2026-11', 'pendente', null, null, null)
on conflict (id) do nothing;

-- ─── Círculos ─────────────────────────────────────────────────────────────────
insert into cj.circles (id, name, description, age_band, leader_id, assistant_id, status, is_demo) values
 ('00000000-0000-4000-8000-000000000101', 'Círculo Esperança (demo)', 'Grupo pequeno para caminhar junto: conversa, oração, amizade e serviço.',
  '18-21', '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000005', 'ativo', true),
 ('00000000-0000-4000-8000-000000000102', 'Círculo Renovo (demo)', 'Círculo de adolescentes, sempre com dois adultos responsáveis.',
  '15-17', '00000000-0000-4000-8000-000000000006', null, 'ativo', true),
 ('00000000-0000-4000-8000-000000000103', 'Círculo Caminho (demo)', 'Encontros às sextas, com estudo e lanche.',
  '18-21', '00000000-0000-4000-8000-000000000010', null, 'ativo', true)
on conflict (id) do nothing;

insert into cj.circle_members (circle_id, user_id, membership_status, joined_at) values
 ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000007', 'ativo', now() - interval '10 days'),
 ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000008', 'ativo', now() - interval '35 days'),
 ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000009', 'ativo', now() - interval '20 days'),
 ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000011', 'ativo', now() - interval '4 days')
on conflict do nothing;

insert into cj.circle_meetings (id, circle_id, starts_at, theme, place_note, status, proposed_by) values
 ('00000000-0000-4000-8000-000000000151', '00000000-0000-4000-8000-000000000101', now() + interval '4 days',
  'Como ser presença na vida de alguém? (Lucas 10:25-37)', 'Casa de família (endereço fictício)', 'confirmado', '00000000-0000-4000-8000-000000000004'),
 ('00000000-0000-4000-8000-000000000152', '00000000-0000-4000-8000-000000000103', now() + interval '3 days',
  'Estudo de Marcos 1', 'Sala 3 (fictícia)', 'confirmado', '00000000-0000-4000-8000-000000000010')
on conflict (id) do nothing;

-- ─── Eventos (datas relativas a hoje, para a demonstração nunca "vencer") ───────
insert into cj.events (id, title, category, description, start_at, location, age_bands, requires_guardian_auth,
                       capacity, accessibility, guidance, responsible, circle_id, status, is_demo) values
 ('00000000-0000-4000-8000-000000000201', 'Conexão de Quinta (demo)', 'culto', 'Culto dos jovens com louvor, Palavra e comunhão.',
  now() + interval '2 days', 'Templo Sede (fictício)', '{15-17,18-21,22-25}', false, null,
  'Entrada sem degraus pela lateral.', 'Não é preciso inscrição.', 'Equipe de jovens (demo)', null, 'publicado', true),
 ('00000000-0000-4000-8000-000000000202', 'Futebol da Juventude (demo)', 'esporte', 'Futebol misto, sem placar oficial.',
  now() + interval '4 days', 'Quadra (fictícia)', '{15-17,18-21,22-25}', true, 24,
  'Arquibancada acessível.', 'Menores precisam de autorização do responsável.', 'Equipe de esportes (demo)', null, 'publicado', true),
 ('00000000-0000-4000-8000-000000000203', 'Encontro do Círculo Esperança (demo)', 'circulo', 'Encontro quinzenal do círculo.',
  now() + interval '4 days', 'Casa de família (só integrantes)', '{18-21}', false, 10,
  null, 'Endereço só para integrantes.', 'Rafael e Camila (demo)', '00000000-0000-4000-8000-000000000101', 'publicado', true),
 ('00000000-0000-4000-8000-000000000204', 'Oficina de mídia — vaga única (demo)', 'treinamento', 'Evento com 1 vaga, usado nos testes de lotação.',
  now() + interval '6 days', 'Sala de mídia (fictícia)', '{18-21,22-25}', false, 1,
  null, null, 'Equipe de mídia (demo)', null, 'publicado', true),
 ('00000000-0000-4000-8000-000000000205', 'Planejamento interno (demo)', 'treinamento', 'Rascunho, ainda não publicado.',
  now() + interval '20 days', null, '{22-25}', false, null, null, null, null, null, 'rascunho', true)
on conflict (id) do nothing;

-- ─── Devocionais (texto original fictício) ────────────────────────────────────
insert into cj.devotionals (id, publish_date, title, scripture_reference, verse_text, reflection, question, prayer,
                            readings, author, license_status, status, approved_by, approved_at, is_demo) values
 ('00000000-0000-4000-8000-000000000301', (now() at time zone 'America/Sao_Paulo')::date, 'Permanecendo em Cristo (demo)', 'João 15:4',
  'Texto bíblico a confirmar com tradução licenciada.', 'Permanecer é ficar perto, todos os dias.', 'Em que área você precisa ficar mais perto de Deus?',
  'Senhor, me ajuda a ficar perto de Ti hoje. Amém.', '{"João 15:1-8","Salmos 1"}', 'Equipe de conteúdo (demo)', 'original', 'publicado',
  '00000000-0000-4000-8000-000000000001', now(), true),
 ('00000000-0000-4000-8000-000000000302', (now() at time zone 'America/Sao_Paulo')::date + 1, 'Fé nas pequenas coisas (demo)', 'Lucas 16:10',
  null, 'Rascunho aguardando o pastor.', null, null, '{}', 'Equipe de conteúdo (demo)', 'original', 'aguardando_aprovacao',
  null, null, true)
on conflict (id) do nothing;

-- ─── Jornada de 90 dias ───────────────────────────────────────────────────────
insert into cj.journey_steps (id, step_code, title, description, day_start, day_end, actions, reading, suggested_meeting, sort_order) values
 ('00000000-0000-4000-8000-000000000401', 'acolhimento', 'Acolhimento', 'Conhecer a comunidade e ser bem-vindo.', 1, 7,
  '{"Conversar com quem fez seu acolhimento","Conhecer o líder do seu círculo","Ler Salmos 23 com calma"}', 'Salmos 23', 'Um café depois do culto', 1),
 ('00000000-0000-4000-8000-000000000402', 'vinculos', 'Vínculos', 'Construir amizades e participar do círculo.', 8, 30,
  '{"Ir a um encontro do círculo","Convidar alguém para um lanche","Ler Lucas 10:25-37"}', 'Lucas 10', 'Encontro do círculo', 2),
 ('00000000-0000-4000-8000-000000000403', 'fundamentos', 'Fundamentos da fé', 'Aprofundar na Palavra, com espaço para perguntas.', 31, 60,
  '{"Ler Marcos no seu ritmo","Levar uma pergunta sincera ao estudo"}', 'Evangelho de Marcos', 'Estudo de sexta', 3),
 ('00000000-0000-4000-8000-000000000404', 'servico', 'Participação e serviço', 'Descobrir dons e servir.', 61, 90,
  '{"Indicar seus talentos","Acompanhar uma equipe por um dia","Dar um retorno sobre os 90 dias"}', 'Romanos 12', 'Ação solidária do mês', 4)
on conflict (id) do nothing;

insert into cj.journey_progress (user_id, step_id, status, actions_done, completed_at) values
 ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000401', 'concluida', '{0,1,2}', now() - interval '5 days'),
 ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000402', 'em_andamento', '{0}', null),
 ('00000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000401', 'em_andamento', '{0}', null)
on conflict do nothing;

-- ─── Missão da semana ─────────────────────────────────────────────────────────
insert into cj.missions (id, title, objective, actions, safety_notes, responsible, start_at, end_at, status, is_demo) values
 ('00000000-0000-4000-8000-000000000501', 'Ninguém caminha sozinho (demo)',
  'Ser presença, de forma simples e segura, na vida de alguém da igreja que está mais afastado.',
  '{"Escolha alguém que você já conhece","Ouça sem pressa e sem julgamento","Se fizer sentido, ore e convide para o próximo encontro"}',
  'Converse com quem você já conhece; menores, prefiram lugares públicos; se ouvir algo grave, procure um líder.',
  'Rafael (demo)', current_date - 1, current_date + 6, 'publicado', true)
on conflict (id) do nothing;

insert into cj.mission_participation (mission_id, user_id, status, optional_reflection) values
 ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000007', 'aceita', 'Reflexão fictícia do Davi (demo).'),
 ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000008', 'concluida', null)
on conflict do nothing;

-- ─── Mural (moderado) ─────────────────────────────────────────────────────────
insert into cj.content_posts (id, author_id, circle_id, kind, body, moderation_status, moderated_by, moderated_at, is_demo) values
 ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000101', 'mural',
  'Como vocês têm se organizado para ler a Bíblia durante a semana? (demo)', 'aprovado', '00000000-0000-4000-8000-000000000004', now(), true),
 ('00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000101', 'aviso',
  'Sábado tem encontro. Quem não puder vir, avise sem problema. (demo)', 'aprovado', '00000000-0000-4000-8000-000000000005', now(), true),
 ('00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000009', null, 'mural',
  'O culto de quinta foi muito especial. Obrigado à recepção! (demo)', 'aprovado', '00000000-0000-4000-8000-000000000002', now(), true),
 ('00000000-0000-4000-8000-000000000604', '00000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000103', 'mural',
  'Post só do Círculo Caminho (demo).', 'aprovado', '00000000-0000-4000-8000-000000000010', now(), true),
 ('00000000-0000-4000-8000-000000000605', '00000000-0000-4000-8000-000000000007', null, 'mural',
  'Publicação aguardando moderação (demo).', 'pendente', null, null, true)
on conflict (id) do nothing;

insert into cj.content_comments (id, post_id, author_id, body, moderation_status, is_demo) values
 ('00000000-0000-4000-8000-000000000651', '00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000007',
  'Eu leio de manhã, no ônibus. (demo)', 'aprovado', true)
on conflict (id) do nothing;

-- ─── Acolhimento (privado) ────────────────────────────────────────────────────
insert into cj.prayer_requests (id, owner_id, body, visibility) values
 ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000007', 'Pedido fictício do Davi: oração pela família. (demo)', 'equipe_pastoral'),
 ('00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000008', 'Pedido fictício da Ana, só para o pastor. (demo)', 'somente_pastor'),
 ('00000000-0000-4000-8000-000000000703', '00000000-0000-4000-8000-000000000009', 'Pedido fictício do Lucas. (demo)', 'equipe_pastoral')
on conflict (id) do nothing;

insert into cj.conversation_requests (id, requester_id, category, preferred_channel) values
 ('00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000007', 'fe_duvidas', 'presencial_na_igreja'),
 ('00000000-0000-4000-8000-000000000802', '00000000-0000-4000-8000-000000000011', 'protecao', 'presencial_com_responsavel')
on conflict (id) do nothing;

insert into cj.reports (id, reporter_id, target_type, target_id, reason, details) values
 ('00000000-0000-4000-8000-000000000851', '00000000-0000-4000-8000-000000000008', 'post', '00000000-0000-4000-8000-000000000603',
  'ofensa', 'Denúncia fictícia para teste. (demo)')
on conflict (id) do nothing;

insert into cj.talent_interests (user_id, talents, availability, note) values
 ('00000000-0000-4000-8000-000000000007', '{louvor,esporte}', '{sabado_tarde}', 'Toco violão. (demo)')
on conflict (user_id) do nothing;
