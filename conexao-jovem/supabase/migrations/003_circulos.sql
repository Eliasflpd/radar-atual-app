-- ═══════════════════════════════════════════════════════════════════════════════
-- CONEXÃO JOVEM — MÓDULO 2 — MIGRAÇÃO 003: Círculos de Conexão (dossiê, seção 6.3)
--
-- ⚠️ AINDA NÃO APLICADA EM NENHUM BANCO REAL. Aplicar SEMPRE depois da 001 e da 002,
--    no mesmo banco do Conexão Jovem, com o usuário dono (postgres). Se a 001 for
--    reaplicada algum dia, reaplique a 002 e esta 003 logo em seguida (a 001 recria
--    cj.decidir_membro com a versão antiga e refaz os GRANTs de funções do schema).
--
-- COMO FOI ESCRITA (para rodar no Supabase sem pedir confirmação manual):
--  · Nenhum DROP, DELETE ou TRUNCATE neste arquivo — nem no nível superior, nem dentro
--    das funções. Só `alter table ... add column if not exists`, `create index if not
--    exists`, `create or replace function` e gatilhos criados dentro de `do $$ ... if
--    not exists (select ... from pg_trigger) ... $$`. Idempotente: pode rodar várias vezes.
--  · Nenhuma política (RLS) nova ou alterada: as da 001 já cobrem os círculos. Esta
--    migração acrescenta FUNÇÕES com as regras de negócio, todas security definer, com
--    `search_path` vazio, checagem de papel e registro em cj.audit_logs.
--
-- O QUE ACRESCENTA
--  · cj.circle_members.change_note — motivo OPCIONAL do pedido de troca (só a gestão lê;
--    o líder do círculo não vê nem que houve pedido de troca: "sem constrangimento").
--  · Gatilho de auditoria em cj.circle_meetings (propor/confirmar/cancelar encontro) e
--    regra em cj.meeting_rsvps (não se confirma presença em encontro cancelado/realizado).
--  · Gestão (youth_admin, pastor):
--      cj.salvar_circulo(...)            cria/edita (nome, descrição, faixa, limite, líder, auxiliar)
--      cj.definir_status_circulo(...)    ativo · pausado · encerrado
--      cj.adicionar_ao_circulo(...)      põe alguém direto num círculo (opcional: mover de outro)
--  · Líder/auxiliar do círculo OU gestão:
--      cj.integrantes_do_circulo(c)      integrantes e pedidos de entrada (consulta auditada)
--      cj.decidir_membro(...)            (substitui a da 001) aceitar/recusar/remover, com limite,
--                                        consentimento de menor e troca de círculo
--      cj.atualizar_encontro(...)        confirmar/cancelar/marcar realizado, mudar data/tema/local
--  · Jovem:
--      cj.circulos_disponiveis()         círculos ATIVOS da minha faixa, com vagas (sem lista de nomes)
--      cj.pedir_entrada(c)               pedido de entrada (faixa, limite, consentimento, 1 pedido por vez)
--      cj.pedir_troca(bool, texto)       "quero trocar de círculo" (motivo opcional)
--      cj.sair_do_circulo()              sai do círculo (vira 'saiu'; nada é apagado)
-- ═══════════════════════════════════════════════════════════════════════════════

set client_min_messages = warning;

-- ─── Colunas e índices novos ──────────────────────────────────────────────────
alter table cj.circle_members add column if not exists change_note text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'circle_members_change_note_tamanho') then
    alter table cj.circle_members add constraint circle_members_change_note_tamanho
      check (change_note is null or char_length(change_note) <= 300);
  end if;
end $$;
comment on column cj.circle_members.change_note is 'Motivo opcional do pedido de troca de círculo. Só a gestão (youth_admin/pastor) lê.';

create index if not exists circle_members_circle_status_idx on cj.circle_members(circle_id, membership_status);
create index if not exists circle_members_troca_idx on cj.circle_members(change_requested) where change_requested;

-- ─── Nome curto (primeiro nome + inicial). INTERNO: sem GRANT para ninguém do app;
--     só as funções abaixo (que já checaram quem pode ver) o usam. ─────────────────
create or replace function cj.nome_curto(p_usuario uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when p.show_full_name then p.display_name
              else split_part(btrim(p.display_name), ' ', 1)
                   || coalesce(' ' || nullif(left(split_part(btrim(p.display_name), ' ', 2), 1), '') || '.', '') end
    from cj.profiles p where p.id = p_usuario
$$;

-- Vagas ocupadas (integrantes ativos) de um círculo. Interno.
create or replace function cj.ocupacao_circulo(c uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from cj.circle_members m where m.circle_id = c and m.membership_status = 'ativo'
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- GATILHOS NOVOS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Presença só em encontro proposto/confirmado e ainda não passado.
create or replace function cj.trg_presenca() returns trigger
language plpgsql security definer set search_path = '' as $$
declare st text; quando timestamptz;
begin
  select m.status, m.starts_at into st, quando from cj.circle_meetings m where m.id = new.meeting_id;
  if st is null then raise exception 'encontro não encontrado' using errcode = 'P0002'; end if;
  if st not in ('proposto','confirmado') then
    raise exception 'Este encontro foi cancelado ou já aconteceu' using errcode = '23514';
  end if;
  if quando < now() - interval '6 hours' then
    raise exception 'Este encontro já aconteceu' using errcode = '23514';
  end if;
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 't_regras_m2' and tgrelid = 'cj.meeting_rsvps'::regclass) then
    create trigger t_regras_m2 before insert or update on cj.meeting_rsvps
      for each row execute function cj.trg_presenca();
  end if;
  -- Encontros entram na trilha de auditoria (quem propôs, confirmou, cancelou). Não grava o tema/local.
  if not exists (select 1 from pg_trigger where tgname = 't_auditoria' and tgrelid = 'cj.circle_meetings'::regclass) then
    create trigger t_auditoria after insert or update or delete on cj.circle_meetings
      for each row execute function cj.trg_auditoria();
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- GESTÃO (youth_admin, pastor)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Cria (p_id nulo) ou edita um círculo. Líder e auxiliar: adultos ATIVOS com o papel
-- (circle_leader / assistant) — a regra mora no gatilho cj.trg_circulo da 001 e é
-- repetida aqui só para devolver uma mensagem clara.
create or replace function cj.salvar_circulo(p_id uuid, p_nome text, p_descricao text, p_faixa cj.faixa_etaria,
                                             p_limite integer, p_lider uuid, p_auxiliar uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare atual record; novo uuid; ocupados integer;
begin
  if not cj.eh_gestao() then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_nome is null or char_length(btrim(p_nome)) not between 2 and 60 then
    raise exception 'O nome do círculo precisa ter entre 2 e 60 caracteres' using errcode = '22023';
  end if;
  if p_descricao is not null and char_length(p_descricao) > 600 then
    raise exception 'A descrição pode ter até 600 caracteres' using errcode = '22023';
  end if;
  if p_faixa is null then raise exception 'Escolha a faixa etária do círculo' using errcode = '22023'; end if;
  if p_limite is null or p_limite not between 2 and 20 then
    raise exception 'O limite de integrantes precisa ficar entre 2 e 20' using errcode = '22023';
  end if;
  if p_lider is not null and p_lider = p_auxiliar then
    raise exception 'Líder e auxiliar precisam ser pessoas diferentes' using errcode = '23514';
  end if;
  if p_lider is not null and (cj.eh_menor(p_lider) or not cj.usuario_tem_papel(p_lider, 'circle_leader')) then
    raise exception 'Líder precisa ser adulto, estar ativo e ter o papel de líder de círculo' using errcode = '23514';
  end if;
  if p_auxiliar is not null and (cj.eh_menor(p_auxiliar) or not cj.usuario_tem_papel(p_auxiliar, 'assistant')) then
    raise exception 'Auxiliar precisa ser adulto, estar ativo e ter o papel de auxiliar' using errcode = '23514';
  end if;

  if p_id is null then
    insert into cj.circles(name, description, age_band, max_members, leader_id, assistant_id)
    values (btrim(p_nome), nullif(btrim(coalesce(p_descricao, '')), ''), p_faixa, p_limite, p_lider, p_auxiliar)
    returning id into novo;
    perform cj.auditar('criar_circulo', 'circles', novo::text,
                       jsonb_build_object('faixa', p_faixa, 'limite', p_limite, 'lider', p_lider, 'auxiliar', p_auxiliar));
    return novo;
  end if;

  select * into atual from cj.circles where id = p_id;
  if not found then raise exception 'círculo não encontrado' using errcode = 'P0002'; end if;
  if atual.status = 'encerrado' then raise exception 'Círculo encerrado não pode ser editado' using errcode = '22023'; end if;
  ocupados := cj.ocupacao_circulo(p_id);
  if p_faixa <> atual.age_band and exists (select 1 from cj.circle_members m where m.circle_id = p_id
                                                and m.membership_status in ('ativo','solicitado')) then
    raise exception 'Não dá para mudar a faixa de um círculo que tem integrantes ou pedidos' using errcode = '23514';
  end if;
  if p_limite < ocupados then
    raise exception 'O limite não pode ficar abaixo dos % integrantes atuais', ocupados using errcode = '23514';
  end if;
  update cj.circles set name = btrim(p_nome), description = nullif(btrim(coalesce(p_descricao, '')), ''),
                        age_band = p_faixa, max_members = p_limite, leader_id = p_lider, assistant_id = p_auxiliar
   where id = p_id;
  perform cj.auditar('editar_circulo', 'circles', p_id::text,
                     jsonb_strip_nulls(jsonb_build_object('limite', p_limite,
                       'lider', case when p_lider is distinct from atual.leader_id then coalesce(p_lider::text, 'nenhum') end,
                       'auxiliar', case when p_auxiliar is distinct from atual.assistant_id then coalesce(p_auxiliar::text, 'nenhum') end)));
  return p_id;
end $$;

-- Pausar (ninguém pede entrada; líder perde a gestão até reativar), reativar ou encerrar.
-- Encerrar tira integrantes e pedidos (viram 'removido', nada é apagado) para que possam
-- entrar em outro círculo.
create or replace function cj.definir_status_circulo(p_circulo uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare atual text;
begin
  if not cj.eh_gestao() then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_status not in ('ativo','pausado','encerrado') then raise exception 'situação inválida' using errcode = '22023'; end if;
  select status into atual from cj.circles where id = p_circulo;
  if not found then raise exception 'círculo não encontrado' using errcode = 'P0002'; end if;
  if atual = p_status then return; end if;
  if atual = 'encerrado' then raise exception 'Círculo encerrado não pode ser reaberto: crie um novo' using errcode = '22023'; end if;
  if p_status = 'encerrado' then
    update cj.circle_members set membership_status = 'removido', change_requested = false
     where circle_id = p_circulo and membership_status in ('ativo','solicitado');
    update cj.circle_meetings set status = 'cancelado'
     where circle_id = p_circulo and status in ('proposto','confirmado') and starts_at > now();
  end if;
  update cj.circles set status = p_status where id = p_circulo;
  perform cj.auditar(case p_status when 'ativo' then 'reativar_circulo' when 'pausado' then 'pausar_circulo' else 'encerrar_circulo' end,
                     'circles', p_circulo::text, jsonb_build_object('de', atual, 'para', p_status));
end $$;

-- Põe uma pessoa direto num círculo (gestão). Mesmas regras de faixa, limite e
-- consentimento. Se ela já está noutro círculo, só com p_mover = true (a saída do
-- outro fica registrada como 'saiu').
create or replace function cj.adicionar_ao_circulo(p_circulo uuid, p_usuario uuid, p_mover boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare ci record; pf record; outro uuid;
begin
  if not cj.eh_gestao() then raise exception 'sem permissão' using errcode = '42501'; end if;
  select * into ci from cj.circles where id = p_circulo;
  if not found then raise exception 'círculo não encontrado' using errcode = 'P0002'; end if;
  if ci.status <> 'ativo' then raise exception 'Este círculo não está ativo' using errcode = '23514'; end if;
  select * into pf from cj.profiles where id = p_usuario;
  if not found then raise exception 'perfil não encontrado' using errcode = 'P0002'; end if;
  if pf.status <> 'ativo' then raise exception 'Aprove o acesso da pessoa antes de colocá-la num círculo' using errcode = '23514'; end if;
  if pf.age_band <> ci.age_band then raise exception 'Círculos são separados por faixa etária' using errcode = '23514'; end if;
  if pf.age_band = '15-17' and not cj.consentimento_aprovado(p_usuario, 'social') then
    raise exception 'Menor de idade só entra em círculo com a autorização do responsável aprovada' using errcode = '23514';
  end if;
  if exists (select 1 from cj.circle_members where circle_id = p_circulo and user_id = p_usuario and membership_status = 'ativo') then
    return;   -- já está
  end if;
  if cj.ocupacao_circulo(p_circulo) >= ci.max_members then
    raise exception 'Círculo cheio: aumente o limite ou escolha outro' using errcode = '23514';
  end if;
  select circle_id into outro from cj.circle_members where user_id = p_usuario and membership_status = 'ativo';
  if outro is not null then
    if not coalesce(p_mover, false) then
      raise exception 'Esta pessoa já participa de outro círculo' using errcode = '23514';
    end if;
    update cj.circle_members set membership_status = 'saiu', change_requested = false, change_note = null
     where circle_id = outro and user_id = p_usuario;
  end if;
  insert into cj.circle_members(circle_id, user_id, membership_status, joined_at)
  values (p_circulo, p_usuario, 'ativo', now())
  on conflict (circle_id, user_id) do update
    set membership_status = 'ativo', joined_at = now(), requested_at = now(), change_requested = false, change_note = null;
  -- outros pedidos pendentes dessa pessoa deixam de valer
  update cj.circle_members set membership_status = 'recusado'
   where user_id = p_usuario and membership_status = 'solicitado' and circle_id <> p_circulo;
  perform cj.auditar('adicionar_ao_circulo', 'circle_members', p_circulo::text || ':' || p_usuario::text,
                     jsonb_strip_nulls(jsonb_build_object('de_circulo', outro)));
end $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- LÍDER/AUXILIAR DO CÍRCULO OU GESTÃO
-- ═══════════════════════════════════════════════════════════════════════════════

-- Integrantes ativos e pedidos de entrada de UM círculo. Líder/auxiliar: só o próprio
-- círculo (e só com o círculo ativo). Equipe: qualquer um. Consulta auditada.
-- O líder vê o nome curto; a gestão vê o nome completo, o pedido de troca e o motivo.
create or replace function cj.integrantes_do_circulo(p_circulo uuid)
returns table (user_id uuid, nome text, situacao text, faixa cj.faixa_etaria, menor boolean, autorizacao_ok boolean,
               pedido_em timestamptz, entrou_em timestamptz, quer_trocar boolean, motivo_troca text, papel text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare equipe boolean := cj.eh_equipe(); gestao boolean := cj.eh_gestao();
begin
  if not (equipe or cj.lidera_circulo(p_circulo)) then raise exception 'sem permissão' using errcode = '42501'; end if;
  perform cj.auditar('consultar', 'circle_members', p_circulo::text, '{}'::jsonb);
  return query
    select m.user_id,
           case when equipe then p.display_name else cj.nome_curto(p.id) end,
           m.membership_status, p.age_band, p.age_band = '15-17',
           p.age_band <> '15-17' or cj.consentimento_aprovado(p.id, 'social'),
           m.requested_at, m.joined_at,
           case when gestao then m.change_requested else null end,
           case when gestao then m.change_note else null end,
           case when ci.leader_id = p.id then 'lider' when ci.assistant_id = p.id then 'auxiliar' else null end
      from cj.circle_members m
      join cj.profiles p on p.id = m.user_id
      join cj.circles ci on ci.id = m.circle_id
     where m.circle_id = p_circulo and m.membership_status in ('ativo','solicitado')
     order by (m.membership_status = 'solicitado') desc, lower(p.display_name);
end $$;

-- Aceitar / recusar / remover integrante (SUBSTITUI a versão da 001, mesma assinatura).
--  · aceitar ('ativo') só um pedido 'solicitado'; respeita o limite; menor só com
--    consentimento aprovado; se a pessoa já está noutro círculo, só se ela pediu troca
--    (aí a saída do outro fica como 'saiu').
--  · recusar ('recusado') só um pedido 'solicitado'; remover ('removido') só um integrante ativo.
create or replace function cj.decidir_membro(p_circulo uuid, p_usuario uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare lim smallint; n integer; atual text; outro uuid; troca boolean;
begin
  if not (cj.lidera_circulo(p_circulo) or cj.eh_gestao()) then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_status not in ('ativo','recusado','removido') then raise exception 'status inválido' using errcode = '22023'; end if;
  select membership_status into atual from cj.circle_members where circle_id = p_circulo and user_id = p_usuario;
  if not found then raise exception 'pedido não encontrado' using errcode = 'P0002'; end if;
  if p_status in ('ativo','recusado') and atual <> 'solicitado' then
    raise exception 'Este pedido já foi respondido' using errcode = '23514';
  end if;
  if p_status = 'removido' and atual <> 'ativo' then
    raise exception 'Esta pessoa não é integrante ativa do círculo' using errcode = '23514';
  end if;
  if p_status = 'ativo' then
    select max_members into lim from cj.circles where id = p_circulo;
    n := cj.ocupacao_circulo(p_circulo);
    if n >= lim then raise exception 'círculo cheio' using errcode = '23514'; end if;
    if cj.eh_menor(p_usuario) and not cj.consentimento_aprovado(p_usuario, 'social') then
      raise exception 'Menor de idade só entra em círculo com a autorização do responsável aprovada' using errcode = '23514';
    end if;
    select circle_id, change_requested into outro, troca from cj.circle_members
     where user_id = p_usuario and membership_status = 'ativo' and circle_id <> p_circulo;
    if outro is not null then
      if not coalesce(troca, false) then
        raise exception 'Esta pessoa já participa de outro círculo' using errcode = '23514';
      end if;
      update cj.circle_members set membership_status = 'saiu', change_requested = false, change_note = null
       where circle_id = outro and user_id = p_usuario;
    end if;
  end if;
  update cj.circle_members
     set membership_status = p_status, joined_at = case when p_status = 'ativo' then now() else joined_at end,
         change_requested = false, change_note = null
   where circle_id = p_circulo and user_id = p_usuario;
  if p_status = 'ativo' then
    update cj.circle_members set membership_status = 'recusado'
     where user_id = p_usuario and membership_status = 'solicitado' and circle_id <> p_circulo;
  end if;
  perform cj.auditar('decidir_membro', 'circle_members', p_circulo::text || ':' || p_usuario::text,
                     jsonb_strip_nulls(jsonb_build_object('de', atual, 'para', p_status, 'troca_de', outro)));
end $$;

-- Confirmar / cancelar / marcar como realizado um encontro e (opcional) mudar data,
-- tema e local. Só o líder/auxiliar do círculo ou a gestão. Integrante apenas PROPÕE
-- (insert com status forçado a 'proposto' pelo gatilho cj.trg_encontro da 001).
create or replace function cj.atualizar_encontro(p_encontro uuid, p_status text, p_quando timestamptz default null,
                                                 p_tema text default null, p_local text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare m record;
begin
  select * into m from cj.circle_meetings where id = p_encontro;
  if not found then raise exception 'encontro não encontrado' using errcode = 'P0002'; end if;
  if not (cj.lidera_circulo(m.circle_id) or cj.eh_gestao()) then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_status is not null and p_status not in ('proposto','confirmado','realizado','cancelado') then
    raise exception 'situação inválida' using errcode = '22023';
  end if;
  if m.status in ('cancelado','realizado') and coalesce(p_status, m.status) <> m.status then
    raise exception 'Este encontro já foi encerrado' using errcode = '23514';
  end if;
  if p_status = 'confirmado' and coalesce(p_quando, m.starts_at) < now() then
    raise exception 'Escolha uma data futura para confirmar o encontro' using errcode = '23514';
  end if;
  if p_status = 'realizado' and m.starts_at > now() then
    raise exception 'Só dá para marcar como realizado depois do horário do encontro' using errcode = '23514';
  end if;
  if p_tema is not null and char_length(p_tema) > 200 then raise exception 'O tema pode ter até 200 caracteres' using errcode = '22023'; end if;
  if p_local is not null and char_length(p_local) > 200 then raise exception 'O local pode ter até 200 caracteres' using errcode = '22023'; end if;
  update cj.circle_meetings
     set status = coalesce(p_status, status), starts_at = coalesce(p_quando, starts_at),
         theme = coalesce(nullif(btrim(p_tema), ''), theme), place_note = coalesce(nullif(btrim(p_local), ''), place_note)
   where id = p_encontro;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- JOVEM
-- ═══════════════════════════════════════════════════════════════════════════════

-- Círculos que posso pedir: ATIVOS, da MINHA faixa. Só informação básica, vagas e o
-- nome curto de quem lidera — nunca a lista de integrantes nem o local dos encontros.
create or replace function cj.circulos_disponiveis()
returns table (id uuid, nome text, descricao text, faixa cj.faixa_etaria, limite smallint, vagas integer,
               lider text, auxiliar text, meu_pedido text, sou_integrante boolean)
language sql stable security definer set search_path = '' as $$
  select ci.id, ci.name, ci.description, ci.age_band, ci.max_members,
         greatest(ci.max_members - cj.ocupacao_circulo(ci.id), 0),
         case when ci.leader_id is not null then cj.nome_curto(ci.leader_id) end,
         case when ci.assistant_id is not null then cj.nome_curto(ci.assistant_id) end,
         (select m.membership_status from cj.circle_members m where m.circle_id = ci.id and m.user_id = auth.uid()),
         cj.membro_do_circulo(ci.id)
    from cj.circles ci
   where ci.status = 'ativo' and cj.perfil_valido() and ci.age_band = cj.minha_faixa()
   order by ci.name
$$;

-- Pedido de entrada. Devolve a situação do pedido ('solicitado').
create or replace function cj.pedir_entrada(p_circulo uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); ci record; atual text; ativo_em uuid; troca boolean;
begin
  if u is null then raise exception 'sem sessão' using errcode = '42501'; end if;
  if not cj.pode_social() then
    raise exception 'Para entrar num círculo, seu cadastro precisa estar aprovado (e, para 15–17 anos, com a autorização do responsável)'
      using errcode = '42501';
  end if;
  select * into ci from cj.circles where id = p_circulo;
  if not found or ci.status <> 'ativo' then raise exception 'Este círculo não está recebendo pedidos agora' using errcode = 'P0002'; end if;
  if ci.age_band <> cj.minha_faixa() then raise exception 'Círculos são separados por faixa etária' using errcode = '23514'; end if;
  select membership_status into atual from cj.circle_members where circle_id = p_circulo and user_id = u;
  if atual = 'ativo' then raise exception 'Você já participa deste círculo' using errcode = '23514'; end if;
  if atual = 'solicitado' then return 'solicitado'; end if;
  if atual = 'removido' then
    raise exception 'Para voltar a este círculo, fale com a coordenação de jovens' using errcode = '42501';
  end if;
  select circle_id, change_requested into ativo_em, troca from cj.circle_members where user_id = u and membership_status = 'ativo';
  if ativo_em is not null and not coalesce(troca, false) then
    raise exception 'Você já participa de um círculo. Se quiser outro, peça a troca primeiro' using errcode = '23514';
  end if;
  if exists (select 1 from cj.circle_members where user_id = u and membership_status = 'solicitado') then
    raise exception 'Você já tem um pedido aguardando resposta. Cancele-o para pedir outro círculo' using errcode = '23514';
  end if;
  if cj.ocupacao_circulo(p_circulo) >= ci.max_members then
    raise exception 'Este círculo está cheio no momento. Escolha outro ou fale com a coordenação' using errcode = '23514';
  end if;
  insert into cj.circle_members(circle_id, user_id) values (p_circulo, u)
  on conflict (circle_id, user_id) do update set membership_status = 'solicitado', requested_at = now(), joined_at = null;
  perform cj.auditar('pedir_entrada', 'circle_members', p_circulo::text || ':' || u::text, '{}'::jsonb);
  return 'solicitado';
end $$;

-- "Quero trocar de círculo" (ou desistir do pedido de troca). Motivo opcional, só a gestão lê.
create or replace function cj.pedir_troca(p_quer boolean, p_motivo text default null) returns boolean
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); c uuid;
begin
  if u is null then raise exception 'sem sessão' using errcode = '42501'; end if;
  if p_motivo is not null and char_length(p_motivo) > 300 then raise exception 'O motivo pode ter até 300 caracteres' using errcode = '22023'; end if;
  update cj.circle_members
     set change_requested = coalesce(p_quer, true),
         change_note = case when coalesce(p_quer, true) then nullif(btrim(coalesce(p_motivo, '')), '') else null end
   where user_id = u and membership_status = 'ativo'
  returning circle_id into c;
  if c is null then raise exception 'Você ainda não participa de um círculo' using errcode = 'P0002'; end if;
  perform cj.auditar(case when coalesce(p_quer, true) then 'pedir_troca' else 'cancelar_troca' end, 'circle_members',
                     c::text || ':' || u::text, '{}'::jsonb);
  return coalesce(p_quer, true);
end $$;

-- Sair do círculo. Fica registrado como 'saiu' (histórico), nada é apagado.
create or replace function cj.sair_do_circulo() returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); c uuid;
begin
  if u is null then raise exception 'sem sessão' using errcode = '42501'; end if;
  update cj.circle_members set membership_status = 'saiu', change_requested = false, change_note = null
   where user_id = u and membership_status = 'ativo'
  returning circle_id into c;
  if c is null then raise exception 'Você não participa de um círculo' using errcode = 'P0002'; end if;
  perform cj.auditar('sair_do_circulo', 'circle_members', c::text || ':' || u::text, '{}'::jsonb);
end $$;

-- ─── Privilégios ──────────────────────────────────────────────────────────────
revoke all on function cj.nome_curto(uuid), cj.ocupacao_circulo(uuid), cj.trg_presenca(),
  cj.salvar_circulo(uuid, text, text, cj.faixa_etaria, integer, uuid, uuid), cj.definir_status_circulo(uuid, text),
  cj.adicionar_ao_circulo(uuid, uuid, boolean), cj.integrantes_do_circulo(uuid), cj.decidir_membro(uuid, uuid, text),
  cj.atualizar_encontro(uuid, text, timestamptz, text, text), cj.circulos_disponiveis(), cj.pedir_entrada(uuid),
  cj.pedir_troca(boolean, text), cj.sair_do_circulo()
  from public, anon, authenticated;
grant execute on function
  cj.salvar_circulo(uuid, text, text, cj.faixa_etaria, integer, uuid, uuid), cj.definir_status_circulo(uuid, text),
  cj.adicionar_ao_circulo(uuid, uuid, boolean), cj.integrantes_do_circulo(uuid), cj.decidir_membro(uuid, uuid, text),
  cj.atualizar_encontro(uuid, text, timestamptz, text, text), cj.circulos_disponiveis(), cj.pedir_entrada(uuid),
  cj.pedir_troca(boolean, text), cj.sair_do_circulo()
  to authenticated;
-- cj.nome_curto, cj.ocupacao_circulo e cj.trg_presenca: de propósito, SEM grant (uso interno).

-- Fim da migração 003.
