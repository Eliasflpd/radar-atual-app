-- ═══════════════════════════════════════════════════════════════════════════════
-- CONEXÃO JOVEM — MÓDULO 3 — MIGRAÇÃO 004: Eventos e experiências (dossiê, seção 6.7)
--
-- ⚠️ AINDA NÃO APLICADA EM NENHUM BANCO REAL. Aplicar SEMPRE depois da 001, 002 e 003,
--    no mesmo banco do Conexão Jovem, com o usuário dono (postgres). Se a 001 for
--    reaplicada algum dia, reaplique 002, 003 e esta 004 logo em seguida (a 001 recria
--    cj.trg_inscricao, cj.decidir_autorizacao_evento e cj.registrar_presenca_evento
--    com a versão antiga e refaz os GRANTs de funções do schema).
--
-- COMO FOI ESCRITA (para rodar no Supabase sem pedir confirmação manual):
--  · Nenhum comando destrutivo neste arquivo (nem no nível superior, nem dentro das
--    funções): só `alter table ... add column if not exists`, `create index if not
--    exists`, `create or replace function` e gatilhos criados dentro de `do $$ ... if
--    not exists (select ... from pg_trigger) ... $$`. Idempotente: pode rodar várias vezes.
--  · Nenhuma política (RLS) nova ou alterada: as da 001 já cobrem eventos e inscrições
--    (evento_ler, evento_criar, evento_editar, inscricao_*). As regras de negócio novas
--    moram em FUNÇÕES security definer, com `search_path` vazio, checagem de papel e
--    registro em cj.audit_logs.
--
-- O QUE ACRESCENTA
--  · cj.events: contact (contato), minor_rules (transporte, imagem, entrega/retirada de
--    menores), cancel_reason (motivo do cancelamento, visto pelos inscritos).
--  · cj.event_registrations: waitlist_at (ordem justa da lista de espera), check_in_by,
--    check_out_by e pickup_note ("retirado por", na saída de menores).
--  · Gatilho de inscrição revisto (cj.trg_inscricao): faixa, círculo, evento publicado e
--    futuro; MENOR fica "aguardando autorização" se o evento pede autorização OU se ele
--    ainda não tem a autorização geral de eventos aprovada; lotado → lista de espera.
--  · Lista de espera andando sozinha: quando alguém cancela (ou a autorização é recusada,
--    ou a capacidade aumenta), a 1ª pessoa da fila sobe (cj.promover_lista_espera).
--  · Gestão (youth_admin, pastor) e líder/auxiliar (só eventos do PRÓPRIO círculo):
--      cj.salvar_evento(id, dados)          cria (rascunho) / edita, com validação
--      cj.definir_status_evento(...)        publicar · voltar a rascunho · cancelar · encerrar
--      cj.eventos_gestao()                  lista com contagens (equipe: todos; líder: do círculo)
--      cj.inscritos_evento(e)               inscritos, autorização, espera e presença (auditada)
--      cj.registrar_presenca_evento(...)    entrada · saída (com "retirado por" p/ menores) · desfazer
--      cj.decidir_autorizacao_evento(...)   (substitui a da 001) respeita a lista de espera
--  · Jovem:
--      cj.meus_eventos(categoria)           publicados da minha faixa (e do meu círculo), com
--                                           vagas, minha inscrição e posição na espera; também
--                                           os CANCELADOS em que eu estava inscrito (para avisar)
-- ═══════════════════════════════════════════════════════════════════════════════

set client_min_messages = warning;

-- ─── Colunas, restrições e índices novos ──────────────────────────────────────
alter table cj.events add column if not exists contact text;
alter table cj.events add column if not exists minor_rules text;
alter table cj.events add column if not exists cancel_reason text;
alter table cj.event_registrations add column if not exists waitlist_at timestamptz;
alter table cj.event_registrations add column if not exists check_in_by uuid;
alter table cj.event_registrations add column if not exists check_out_by uuid;
alter table cj.event_registrations add column if not exists pickup_note text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'events_contact_tamanho') then
    alter table cj.events add constraint events_contact_tamanho check (contact is null or char_length(contact) <= 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_minor_rules_tamanho') then
    alter table cj.events add constraint events_minor_rules_tamanho check (minor_rules is null or char_length(minor_rules) <= 1000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_cancel_reason_tamanho') then
    alter table cj.events add constraint events_cancel_reason_tamanho check (cancel_reason is null or char_length(cancel_reason) <= 300);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_registrations_pickup_tamanho') then
    alter table cj.event_registrations add constraint event_registrations_pickup_tamanho
      check (pickup_note is null or char_length(pickup_note) <= 120);
  end if;
end $$;
comment on column cj.events.contact is 'Contato institucional do evento (nunca telefone pessoal de menor).';
comment on column cj.events.minor_rules is 'Regras para menores: transporte, uso de imagem, acompanhamento e entrega/retirada.';
comment on column cj.event_registrations.pickup_note is 'Na saída de menor: quem retirou (ou "saiu sozinho, autorizado"). Só equipe/líder do evento lê.';

create index if not exists event_registrations_evento_status_idx on cj.event_registrations(event_id, status);
create index if not exists events_status_inicio_idx on cj.events(status, start_at);

-- Vagas ocupadas que contam para a capacidade: confirmadas + aguardando autorização
-- (cj.ocupacao_evento, da 001). A lista de espera NÃO ocupa vaga.

-- ═══════════════════════════════════════════════════════════════════════════════
-- INSCRIÇÃO (gatilho revisto) E LISTA DE ESPERA
-- ═══════════════════════════════════════════════════════════════════════════════

-- O cliente NÃO escolhe status nem consentimento: o servidor decide.
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
  if ev.circle_id is not null and not (cj.membro_do_circulo(ev.circle_id) or cj.lidera_circulo(ev.circle_id)) then
    raise exception 'Este evento é só para integrantes do círculo' using errcode = '42501';
  end if;
  new.check_in_at := null; new.check_out_at := null; new.consent_decided_by := null;
  new.check_in_by := null; new.check_out_by := null; new.pickup_note := null; new.waitlist_at := null;
  -- Menor: o evento pede autorização OU ainda não há autorização geral de eventos aprovada.
  if cj.eh_menor(new.user_id) and (ev.requires_guardian_auth or not cj.consentimento_aprovado(new.user_id, 'eventos')) then
    new.consent_status := 'pendente'; new.status := 'aguardando_autorizacao';
  else
    new.consent_status := 'nao_exigido'; new.status := 'confirmada';
  end if;
  if ev.capacity is not null and cj.ocupacao_evento(ev.id) >= ev.capacity then
    new.status := 'lista_espera'; new.waitlist_at := now();
  end if;
  return new;
end $$;

-- Sobe a fila enquanto houver vaga. INTERNA (sem grant): só gatilho e funções abaixo chamam.
-- Quem sobe com autorização pendente vira "aguardando autorização" (ocupa a vaga enquanto a
-- equipe decide); quem já tem autorização (ou não precisa) vira "confirmada".
create or replace function cj.promover_lista_espera(p_evento uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare ev record; alvo record; n integer := 0;
begin
  select * into ev from cj.events where id = p_evento;
  if not found or ev.status <> 'publicado' or ev.start_at < now() then return 0; end if;
  loop
    exit when ev.capacity is not null and cj.ocupacao_evento(p_evento) >= ev.capacity;
    select r.user_id, r.consent_status into alvo
      from cj.event_registrations r
     where r.event_id = p_evento and r.status = 'lista_espera'
     order by coalesce(r.waitlist_at, r.created_at), r.created_at
     limit 1 for update;
    exit when not found;
    update cj.event_registrations
       set status = case when alvo.consent_status = 'pendente' then 'aguardando_autorizacao' else 'confirmada' end,
           waitlist_at = null
     where event_id = p_evento and user_id = alvo.user_id;
    perform cj.auditar('promover_lista_espera', 'event_registrations', p_evento::text || ':' || alvo.user_id::text,
                       jsonb_build_object('para', case when alvo.consent_status = 'pendente' then 'aguardando_autorizacao' else 'confirmada' end));
    n := n + 1;
  end loop;
  return n;
end $$;

-- Depois de um cancelamento (pelo jovem ou por autorização recusada): abre vaga → fila anda.
create or replace function cj.trg_inscricao_pos() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status in ('confirmada','aguardando_autorizacao') and new.status = 'cancelada' then
    perform cj.promover_lista_espera(new.event_id);
  end if;
  return null;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 't_espera' and tgrelid = 'cj.event_registrations'::regclass) then
    create trigger t_espera after update of status on cj.event_registrations
      for each row execute function cj.trg_inscricao_pos();
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- GESTÃO (youth_admin, pastor) E LÍDER/AUXILIAR DO CÍRCULO
-- ═══════════════════════════════════════════════════════════════════════════════

-- Posso gerir este evento? Gestão: qualquer um. Líder/auxiliar: só evento do círculo que conduz.
create or replace function cj.gere_evento(p_evento uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select cj.eh_gestao() or cj.lidera_evento(p_evento)
$$;

-- Cria (p_id nulo; nasce RASCUNHO) ou edita um evento. `p` é um objeto JSON com:
--   titulo, categoria, descricao, inicio, fim, local, faixas (array), autorizacao (bool),
--   capacidade (int ou null), acessibilidade, orientacoes, responsavel, contato,
--   regras_menores, circulo (uuid ou null)
create or replace function cj.salvar_evento(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  gestao boolean := cj.eh_gestao();
  atual record; ci record; novo uuid;
  v_titulo text := btrim(coalesce(p ->> 'titulo', ''));
  v_cat text := p ->> 'categoria';
  v_desc text := nullif(btrim(coalesce(p ->> 'descricao', '')), '');
  v_inicio timestamptz := nullif(p ->> 'inicio', '')::timestamptz;
  v_fim timestamptz := nullif(p ->> 'fim', '')::timestamptz;
  v_local text := nullif(btrim(coalesce(p ->> 'local', '')), '');
  v_faixas cj.faixa_etaria[];
  v_aut boolean := coalesce((p ->> 'autorizacao')::boolean, false);
  v_cap integer := nullif(p ->> 'capacidade', '')::integer;
  v_acess text := nullif(btrim(coalesce(p ->> 'acessibilidade', '')), '');
  v_orient text := nullif(btrim(coalesce(p ->> 'orientacoes', '')), '');
  v_resp text := nullif(btrim(coalesce(p ->> 'responsavel', '')), '');
  v_contato text := nullif(btrim(coalesce(p ->> 'contato', '')), '');
  v_regras text := nullif(btrim(coalesce(p ->> 'regras_menores', '')), '');
  v_circ uuid := nullif(p ->> 'circulo', '')::uuid;
  ocupados integer;
begin
  if auth.uid() is null then raise exception 'sem sessão' using errcode = '42501'; end if;
  if p is null or jsonb_typeof(p) <> 'object' then raise exception 'dados do evento ausentes' using errcode = '22023'; end if;
  -- Quem pode: gestão; líder/auxiliar só no círculo que conduz.
  if not gestao and (v_circ is null or not cj.lidera_circulo(v_circ)) then
    raise exception 'Líder e auxiliar só criam eventos do próprio círculo' using errcode = '42501';
  end if;
  if p_id is not null then
    select * into atual from cj.events where id = p_id;
    if not found then raise exception 'evento não encontrado' using errcode = 'P0002'; end if;
    if not cj.gere_evento(p_id) then raise exception 'sem permissão' using errcode = '42501'; end if;
    if atual.status in ('cancelado','encerrado') then
      raise exception 'Evento cancelado ou encerrado não pode ser editado' using errcode = '22023';
    end if;
  end if;

  -- Validação (mensagens para a pessoa ler)
  if char_length(v_titulo) not between 3 and 120 then raise exception 'O título precisa ter entre 3 e 120 caracteres' using errcode = '22023'; end if;
  if v_cat is null or v_cat not in ('culto','estudo','esporte','acao_social','circulo','acampamento','ensaio','treinamento') then
    raise exception 'Escolha a categoria do evento' using errcode = '22023';
  end if;
  if v_desc is not null and char_length(v_desc) > 2000 then raise exception 'A descrição pode ter até 2000 caracteres' using errcode = '22023'; end if;
  if v_inicio is null then raise exception 'Informe a data e o horário de início' using errcode = '22023'; end if;
  if v_inicio < now() then
    if p_id is null then raise exception 'O início precisa ser no futuro' using errcode = '22023'; end if;
    if v_inicio is distinct from atual.start_at then raise exception 'O início precisa ser no futuro' using errcode = '22023'; end if;
  end if;
  if v_fim is not null and v_fim <= v_inicio then raise exception 'O fim precisa ser depois do início' using errcode = '22023'; end if;
  if v_local is not null and char_length(v_local) > 200 then raise exception 'O local pode ter até 200 caracteres' using errcode = '22023'; end if;
  if v_cap is not null and v_cap not between 1 and 2000 then raise exception 'A capacidade precisa ficar entre 1 e 2000 (ou sem limite)' using errcode = '22023'; end if;
  if v_acess is not null and char_length(v_acess) > 500 then raise exception 'Acessibilidade: até 500 caracteres' using errcode = '22023'; end if;
  if v_orient is not null and char_length(v_orient) > 1000 then raise exception 'Orientações: até 1000 caracteres' using errcode = '22023'; end if;
  if v_resp is not null and char_length(v_resp) > 120 then raise exception 'Responsável: até 120 caracteres' using errcode = '22023'; end if;
  if v_contato is not null and char_length(v_contato) > 120 then raise exception 'Contato: até 120 caracteres' using errcode = '22023'; end if;
  if v_regras is not null and char_length(v_regras) > 1000 then raise exception 'Regras para menores: até 1000 caracteres' using errcode = '22023'; end if;

  if v_circ is not null then
    select * into ci from cj.circles where id = v_circ;
    if not found or ci.status <> 'ativo' then raise exception 'Este círculo não está ativo' using errcode = '23514'; end if;
    v_faixas := array[ci.age_band];             -- evento de círculo = faixa do círculo
  else
    if jsonb_typeof(p -> 'faixas') <> 'array' or jsonb_array_length(p -> 'faixas') = 0 then
      raise exception 'Escolha pelo menos uma faixa etária' using errcode = '22023';
    end if;
    select array_agg(distinct f::cj.faixa_etaria order by f::cj.faixa_etaria) into v_faixas from jsonb_array_elements_text(p -> 'faixas') f;
  end if;
  -- Acampamento com menores sempre pede autorização do responsável (dossiê 6.7).
  if v_cat = 'acampamento' and '15-17' = any(v_faixas) then v_aut := true; end if;

  if p_id is null then
    insert into cj.events(title, category, description, start_at, end_at, location, age_bands, requires_guardian_auth, capacity,
                          accessibility, guidance, responsible, contact, minor_rules, circle_id, created_by, status)
    values (v_titulo, v_cat, v_desc, v_inicio, v_fim, v_local, v_faixas, v_aut, v_cap,
            v_acess, v_orient, v_resp, v_contato, v_regras, v_circ, auth.uid(), 'rascunho')
    returning id into novo;
    perform cj.auditar('criar_evento', 'events', novo::text,
                       jsonb_build_object('categoria', v_cat, 'faixas', v_faixas, 'circulo', v_circ, 'capacidade', v_cap, 'autorizacao', v_aut));
    return novo;
  end if;

  -- Edição: líder não tira o evento do próprio círculo nem leva para outro que não conduz.
  if not gestao and (atual.circle_id is distinct from v_circ) then
    raise exception 'Líder e auxiliar só criam eventos do próprio círculo' using errcode = '42501';
  end if;
  ocupados := cj.ocupacao_evento(p_id);
  if v_cap is not null and v_cap < ocupados then
    raise exception 'A capacidade não pode ficar abaixo das % inscrições que já ocupam vaga', ocupados using errcode = '23514';
  end if;
  if exists (select 1 from cj.event_registrations r join cj.profiles pr on pr.id = r.user_id
              where r.event_id = p_id and r.status <> 'cancelada' and pr.age_band <> all (v_faixas)) then
    raise exception 'Há inscritos de uma faixa que você está tirando. Cancele com eles antes' using errcode = '23514';
  end if;
  if v_aut and not atual.requires_guardian_auth and exists (
       select 1 from cj.event_registrations r where r.event_id = p_id and r.status = 'confirmada'
          and r.consent_status <> 'aprovado' and cj.eh_menor(r.user_id)) then
    raise exception 'Já há menores confirmados sem autorização deste evento. Fale com eles antes de exigir autorização' using errcode = '23514';
  end if;
  update cj.events set title = v_titulo, category = v_cat, description = v_desc, start_at = v_inicio, end_at = v_fim,
                       location = v_local, age_bands = v_faixas, requires_guardian_auth = v_aut, capacity = v_cap,
                       accessibility = v_acess, guidance = v_orient, responsible = v_resp, contact = v_contato,
                       minor_rules = v_regras, circle_id = v_circ
   where id = p_id;
  perform cj.auditar('editar_evento', 'events', p_id::text,
                     jsonb_strip_nulls(jsonb_build_object('capacidade', v_cap, 'autorizacao', v_aut,
                       'inicio', case when v_inicio is distinct from atual.start_at then v_inicio end)));
  -- Mais vagas? a fila anda.
  if atual.status = 'publicado' then perform cj.promover_lista_espera(p_id); end if;
  return p_id;
end $$;

-- Ciclo de vida: rascunho → publicado → encerrado; rascunho/publicado → cancelado.
-- Publicado volta a rascunho só se ninguém se inscreveu. Cancelado/encerrado é final.
-- Cancelar NÃO mexe nas inscrições (histórico): o jovem inscrito vê "evento cancelado".
create or replace function cj.definir_status_evento(p_evento uuid, p_status text, p_motivo text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare ev record;
begin
  if p_status not in ('rascunho','publicado','cancelado','encerrado') then raise exception 'situação inválida' using errcode = '22023'; end if;
  select * into ev from cj.events where id = p_evento;
  if not found then raise exception 'evento não encontrado' using errcode = 'P0002'; end if;
  if not cj.gere_evento(p_evento) then raise exception 'sem permissão' using errcode = '42501'; end if;
  if ev.status = p_status then return; end if;
  if ev.status in ('cancelado','encerrado') then raise exception 'Evento cancelado ou encerrado não muda mais de situação' using errcode = '22023'; end if;
  if p_motivo is not null and char_length(p_motivo) > 300 then raise exception 'O motivo pode ter até 300 caracteres' using errcode = '22023'; end if;
  if p_status = 'publicado' then
    if ev.start_at < now() then raise exception 'Para publicar, a data de início precisa ser no futuro' using errcode = '23514'; end if;
    if ev.circle_id is not null and not exists (select 1 from cj.circles c where c.id = ev.circle_id and c.status = 'ativo') then
      raise exception 'O círculo deste evento não está ativo' using errcode = '23514';
    end if;
  elsif p_status = 'rascunho' then
    if exists (select 1 from cj.event_registrations r where r.event_id = p_evento and r.status <> 'cancelada') then
      raise exception 'Já há inscrições: para tirar do ar, cancele o evento' using errcode = '23514';
    end if;
  elsif p_status = 'encerrado' then
    if ev.status <> 'publicado' then raise exception 'Só um evento publicado pode ser encerrado' using errcode = '23514'; end if;
    if ev.start_at > now() then raise exception 'Só dá para encerrar depois que o evento começar' using errcode = '23514'; end if;
  end if;
  update cj.events set status = p_status,
                       cancel_reason = case when p_status = 'cancelado' then nullif(btrim(coalesce(p_motivo, '')), '') else cancel_reason end
   where id = p_evento;
  perform cj.auditar(case p_status when 'publicado' then 'publicar_evento' when 'cancelado' then 'cancelar_evento'
                                   when 'encerrado' then 'encerrar_evento' else 'despublicar_evento' end,
                     'events', p_evento::text, jsonb_build_object('de', ev.status, 'para', p_status));
end $$;

-- Lista para o painel: equipe vê todos (menos os encerrados/cancelados há mais de 60 dias);
-- líder/auxiliar vê só os eventos dos círculos que conduz. Demais: 42501. Só números, sem nomes.
create or replace function cj.eventos_gestao()
returns table (id uuid, titulo text, categoria text, inicio timestamptz, fim timestamptz, local text, faixas cj.faixa_etaria[],
               autorizacao boolean, capacidade integer, status text, circulo_id uuid, circulo text, pode_editar boolean,
               confirmados integer, aguardando integer, espera integer, presentes integer, criado_em timestamptz)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare equipe boolean := cj.eh_equipe();
begin
  if not (equipe or exists (select 1 from cj.circles c where cj.lidera_circulo(c.id))) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return query
    select e.id, e.title, e.category, e.start_at, e.end_at, e.location, e.age_bands, e.requires_guardian_auth, e.capacity, e.status,
           e.circle_id, ci.name, cj.gere_evento(e.id),
           (select count(*)::int from cj.event_registrations r where r.event_id = e.id and r.status = 'confirmada'),
           (select count(*)::int from cj.event_registrations r where r.event_id = e.id and r.status = 'aguardando_autorizacao'),
           (select count(*)::int from cj.event_registrations r where r.event_id = e.id and r.status = 'lista_espera'),
           (select count(*)::int from cj.event_registrations r where r.event_id = e.id and r.check_in_at is not null),
           e.created_at
      from cj.events e left join cj.circles ci on ci.id = e.circle_id
     where (equipe or (e.circle_id is not null and cj.lidera_circulo(e.circle_id)))
       and (e.status in ('rascunho','publicado') or e.start_at > now() - interval '60 days')
     order by (e.status in ('cancelado','encerrado')), (e.start_at < now() - interval '6 hours'), e.start_at;
end $$;

-- Inscritos de um evento (equipe ou líder do evento de círculo). Consulta AUDITADA.
-- Equipe vê nome completo e o contato do responsável (para a retirada); o líder vê nome curto
-- e só o nome/parentesco do responsável. Nunca o telefone do jovem (o schema não guarda).
create or replace function cj.inscritos_evento(p_evento uuid)
returns table (user_id uuid, nome text, faixa cj.faixa_etaria, menor boolean, status text, autorizacao text,
               autorizacao_geral boolean, responsavel text, contato_responsavel text, posicao_espera integer,
               inscrito_em timestamptz, entrada_em timestamptz, saida_em timestamptz, retirado_por text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare equipe boolean := cj.eh_equipe();
begin
  if not exists (select 1 from cj.events e where e.id = p_evento) then raise exception 'evento não encontrado' using errcode = 'P0002'; end if;
  if not (equipe or cj.lidera_evento(p_evento)) then raise exception 'sem permissão' using errcode = '42501'; end if;
  perform cj.auditar('consultar', 'event_registrations', p_evento::text, '{}'::jsonb);
  return query
    select r.user_id,
           case when equipe then p.display_name else cj.nome_curto(p.id) end,
           p.age_band, p.age_band = '15-17', r.status, r.consent_status,
           p.age_band <> '15-17' or cj.consentimento_aprovado(p.id, 'eventos'),
           g.resp, case when equipe then g.contato end,
           case when r.status = 'lista_espera' then
             (select count(*)::int from cj.event_registrations w
               where w.event_id = r.event_id and w.status = 'lista_espera'
                 and (coalesce(w.waitlist_at, w.created_at), w.created_at) <= (coalesce(r.waitlist_at, r.created_at), r.created_at)) end,
           r.created_at, r.check_in_at, r.check_out_at, r.pickup_note
      from cj.event_registrations r
      join cj.profiles p on p.id = r.user_id
      left join lateral (select gc.guardian_name || ' (' || case gc.guardian_relationship when 'mae' then 'mãe' when 'pai' then 'pai'
                                  when 'responsavel_legal' then 'responsável legal' else 'outro' end || ')' as resp,
                                gc.guardian_contact as contato
                           from cj.guardian_consents gc
                          where gc.minor_id = p.id and gc.status in ('aprovado','pendente') and p.age_band = '15-17'
                          order by (gc.status = 'aprovado') desc, gc.created_at desc limit 1) g on true
     where r.event_id = p_evento and r.status <> 'cancelada'
     order by case r.status when 'aguardando_autorizacao' then 0 when 'confirmada' then 1 else 2 end,
              coalesce(r.waitlist_at, r.created_at), lower(p.display_name);
end $$;

-- Autorização do responsável para um evento (equipe). Substitui a da 001: quem está na
-- lista de espera continua na fila (com a autorização já aprovada) — não fura a capacidade.
create or replace function cj.decidir_autorizacao_evento(p_evento uuid, p_usuario uuid, p_aprovado boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not cj.eh_equipe() then raise exception 'sem permissão' using errcode = '42501'; end if;
  update cj.event_registrations
     set consent_status = case when p_aprovado then 'aprovado' else 'recusado' end,
         status = case when not p_aprovado then 'cancelada'
                       when status = 'lista_espera' then 'lista_espera' else 'confirmada' end,
         consent_decided_by = auth.uid()
   where event_id = p_evento and user_id = p_usuario and consent_status = 'pendente' and status <> 'cancelada';
  if not found then raise exception 'não há autorização pendente' using errcode = 'P0002'; end if;
  perform cj.auditar(case when p_aprovado then 'aprovar_autorizacao_evento' else 'recusar_autorizacao_evento' end,
                     'event_registrations', p_evento::text || ':' || p_usuario::text, '{}'::jsonb);
end $$;

-- Check-in/check-out (entrada e retirada de menores): equipe ou líder do evento de círculo.
--  · entrada: só inscrição CONFIRMADA de evento publicado/encerrado (não cancelado).
--  · saida: só depois da entrada; menor exige `p_obs` ("retirado por" ou "saiu sozinho, autorizado").
--  · desfazer: limpa entrada e saída (registro errado). Tudo auditado.
create or replace function cj.registrar_presenca_evento(p_evento uuid, p_usuario uuid, p_tipo text, p_obs text) returns void
language plpgsql security definer set search_path = '' as $$
declare r record; st text; obs text := nullif(btrim(coalesce(p_obs, '')), '');
begin
  if not (cj.eh_equipe() or cj.lidera_evento(p_evento)) then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_tipo not in ('entrada','saida','desfazer') then raise exception 'tipo inválido' using errcode = '22023'; end if;
  if obs is not null and char_length(obs) > 120 then raise exception 'Use até 120 caracteres' using errcode = '22023'; end if;
  select status into st from cj.events where id = p_evento;
  if st is null then raise exception 'evento não encontrado' using errcode = 'P0002'; end if;
  if st not in ('publicado','encerrado') then raise exception 'Presença só em evento publicado' using errcode = '23514'; end if;
  select * into r from cj.event_registrations where event_id = p_evento and user_id = p_usuario and status = 'confirmada' for update;
  if not found then raise exception 'inscrição confirmada não encontrada' using errcode = 'P0002'; end if;
  if p_tipo = 'entrada' then
    if r.check_in_at is not null then raise exception 'Entrada já registrada' using errcode = '23514'; end if;
    update cj.event_registrations set check_in_at = now(), check_in_by = auth.uid()
     where event_id = p_evento and user_id = p_usuario;
  elsif p_tipo = 'saida' then
    if r.check_in_at is null then raise exception 'Registre a entrada antes da saída' using errcode = '23514'; end if;
    if r.check_out_at is not null then raise exception 'Saída já registrada' using errcode = '23514'; end if;
    if cj.eh_menor(p_usuario) and obs is null then
      raise exception 'Para menores, informe quem retirou (ou "saiu sozinho, autorizado")' using errcode = '22023';
    end if;
    update cj.event_registrations set check_out_at = now(), check_out_by = auth.uid(), pickup_note = obs
     where event_id = p_evento and user_id = p_usuario;
  else
    update cj.event_registrations set check_in_at = null, check_in_by = null, check_out_at = null, check_out_by = null, pickup_note = null
     where event_id = p_evento and user_id = p_usuario;
  end if;
  perform cj.auditar('presenca_' || p_tipo, 'event_registrations', p_evento::text || ':' || p_usuario::text, '{}'::jsonb);
end $$;

-- A assinatura antiga (3 argumentos, da 001) continua valendo e passa pela nova.
create or replace function cj.registrar_presenca_evento(p_evento uuid, p_usuario uuid, p_tipo text) returns void
language sql security definer set search_path = '' as $$
  select cj.registrar_presenca_evento(p_evento, p_usuario, p_tipo, null)
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- JOVEM
-- ═══════════════════════════════════════════════════════════════════════════════

-- Eventos para mim: publicados, futuros (ou começados há < 6 h), da minha faixa e, se de
-- círculo, do meu círculo — a mesma regra da política evento_ler — mais os CANCELADOS em que
-- eu tinha inscrição ativa (para eu saber). Vagas = capacidade − ocupação (sem nomes).
create or replace function cj.meus_eventos(p_categoria text default null)
returns table (id uuid, titulo text, categoria text, descricao text, inicio timestamptz, fim timestamptz, local text,
               faixas cj.faixa_etaria[], autorizacao boolean, capacidade integer, vagas integer, acessibilidade text,
               orientacoes text, responsavel text, contato text, regras_menores text, circulo text, status text,
               motivo_cancelamento text, minha_inscricao text, minha_autorizacao text, posicao_espera integer,
               autorizacao_geral boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare u uuid := auth.uid(); fx cj.faixa_etaria := cj.minha_faixa();
begin
  if u is null or not cj.perfil_valido() then raise exception 'sem permissão' using errcode = '42501'; end if;
  return query
    select e.id, e.title, e.category, e.description, e.start_at, e.end_at, e.location, e.age_bands, e.requires_guardian_auth,
           e.capacity, case when e.capacity is null then null else greatest(e.capacity - cj.ocupacao_evento(e.id), 0) end,
           e.accessibility, e.guidance, e.responsible, e.contact, e.minor_rules, ci.name, e.status,
           case when e.status = 'cancelado' then e.cancel_reason end,
           r.status, r.consent_status,
           case when r.status = 'lista_espera' then
             (select count(*)::int from cj.event_registrations w
               where w.event_id = e.id and w.status = 'lista_espera'
                 and (coalesce(w.waitlist_at, w.created_at), w.created_at) <= (coalesce(r.waitlist_at, r.created_at), r.created_at)) end,
           fx <> '15-17' or cj.consentimento_aprovado(u, 'eventos')
      from cj.events e
      left join cj.circles ci on ci.id = e.circle_id
      left join cj.event_registrations r on r.event_id = e.id and r.user_id = u
     where e.start_at > now() - interval '6 hours'
       and (p_categoria is null or e.category = p_categoria)
       and ((e.status = 'publicado' and fx = any(e.age_bands)
             and (e.circle_id is null or cj.membro_do_circulo(e.circle_id) or cj.lidera_circulo(e.circle_id)))
         or (e.status = 'cancelado' and r.status is not null and r.status <> 'cancelada'))
     order by e.start_at
     limit 60;
end $$;

-- ─── Privilégios ──────────────────────────────────────────────────────────────
revoke all on function cj.trg_inscricao(), cj.promover_lista_espera(uuid), cj.trg_inscricao_pos(), cj.gere_evento(uuid),
  cj.salvar_evento(uuid, jsonb), cj.definir_status_evento(uuid, text, text), cj.eventos_gestao(), cj.inscritos_evento(uuid),
  cj.decidir_autorizacao_evento(uuid, uuid, boolean), cj.registrar_presenca_evento(uuid, uuid, text, text),
  cj.registrar_presenca_evento(uuid, uuid, text), cj.meus_eventos(text)
  from public, anon, authenticated;
grant execute on function
  cj.gere_evento(uuid), cj.salvar_evento(uuid, jsonb), cj.definir_status_evento(uuid, text, text), cj.eventos_gestao(),
  cj.inscritos_evento(uuid), cj.decidir_autorizacao_evento(uuid, uuid, boolean),
  cj.registrar_presenca_evento(uuid, uuid, text, text), cj.registrar_presenca_evento(uuid, uuid, text), cj.meus_eventos(text)
  to authenticated;
-- cj.promover_lista_espera, cj.trg_inscricao e cj.trg_inscricao_pos: de propósito, SEM grant (uso interno).

-- Fim da migração 004.
