-- ═══════════════════════════════════════════════════════════════════════════════
-- CONEXÃO JOVEM — MÓDULO 1 — MIGRAÇÃO 002: gestão de pessoas e login
--
-- ⚠️ AINDA NÃO APLICADA EM NENHUM BANCO REAL. Aplicar SEMPRE depois da 001, no mesmo
--    banco do Conexão Jovem, com o usuário dono (postgres). Se a 001 for reaplicada
--    algum dia, reaplique esta 002 logo em seguida (a 001 recria funções e refaz os
--    GRANTs do schema, o que desfaria o que está aqui).
--
-- O QUE ESTA MIGRAÇÃO ACRESCENTA (nada é apagado; nenhuma tabela é recriada):
--  · cj.profiles ganha duas colunas: `pre_cadastrado_por` (quem da liderança cadastrou
--    a pessoa pelo WhatsApp) e `vinculado_em` (quando a pessoa entrou pela primeira vez
--    com o crachá do Radar). Pré-cadastro = perfil com o HMAC do WhatsApp e
--    vinculado_em nulo; ele "acende" sozinho quando a pessoa entra com aquele número.
--    O telefone continua FORA do banco: o HMAC é calculado no servidor
--    (CJ_VINCULO_SEGREDO, só na Vercel).
--  · Funções da liderança, todas security definer, com checagem de papel e
--    registro em cj.audit_logs:
--      cj.listar_pessoas(...)        equipe (youth_admin, pastor, safeguarding_admin) lê a lista
--      cj.pre_cadastrar(...)         gestão (youth_admin, pastor) cadastra pelo WhatsApp
--      cj.papeis_que_concedo()       quais papéis EU posso conceder/retirar
--      cj.conceder_papel / revogar_papel  (mesmas regras da 001 + auditoria explícita
--                                    + o último pastor ativo não perde o papel)
--      cj.definir_status_perfil      (mesmas regras da 001 + ninguém muda o próprio
--                                    status + só o pastor mexe em quem é da equipe)
--  · Funções do próprio usuário: cj.quem_sou() e cj.confirmar_vinculo().
--  · cj.promover_primeiro_admin(uuid): SÓ o dono do banco roda (não é liberada a
--    nenhum papel do app), e só enquanto não existir pastor ativo.
--
-- Idempotente: pode rodar várias vezes. Sem DROP de tabela/coluna.
-- ═══════════════════════════════════════════════════════════════════════════════

set client_min_messages = warning;

-- ─── Colunas novas ────────────────────────────────────────────────────────────
alter table cj.profiles add column if not exists pre_cadastrado_por uuid;
-- Perfis que já existem (e os criados pelo próprio jovem ao entrar) nascem vinculados.
alter table cj.profiles add column if not exists vinculado_em timestamptz default now();
comment on column cj.profiles.pre_cadastrado_por is 'Quem da liderança fez o pré-cadastro pelo WhatsApp (null = a própria pessoa entrou).';
comment on column cj.profiles.vinculado_em is 'Quando a pessoa entrou com o crachá do Radar. Null = pré-cadastro ainda não usado.';

create index if not exists profiles_status_idx on cj.profiles(status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- QUAIS PAPÉIS EU POSSO CONCEDER/RETIRAR (fonte única da regra)
--   pastor:      todos (member, circle_leader, assistant, youth_admin, safeguarding_admin, pastor)
--   youth_admin: member, circle_leader, assistant
--   demais:      nenhum
-- ═══════════════════════════════════════════════════════════════════════════════
create or replace function cj.papeis_que_concedo() returns cj.papel[]
language sql stable security definer set search_path = '' as $$
  select case
    when cj.tem_papel('pastor') then '{member,circle_leader,assistant,youth_admin,safeguarding_admin,pastor}'::cj.papel[]
    when cj.tem_papel('youth_admin') then '{member,circle_leader,assistant}'::cj.papel[]
    else '{}'::cj.papel[] end
$$;

-- "Esta pessoa é da equipe (coordenação, pastor ou proteção)?" — vale mesmo se o
-- perfil dela estiver suspenso (para proteger quem é da equipe contra rebaixamento).
create or replace function cj.usuario_e_equipe(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from cj.roles r where r.user_id = u and r.role in ('youth_admin','pastor','safeguarding_admin'))
$$;

-- ─── Conceder papel (mesmas regras da 001, agora com auditoria explícita) ─────
create or replace function cj.conceder_papel(p_usuario uuid, p_papel cj.papel) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_usuario = auth.uid() and not cj.tem_papel('pastor') then
    raise exception 'ninguém concede papel a si mesmo' using errcode = '42501';
  end if;
  if not (p_papel = any(cj.papeis_que_concedo())) then
    raise exception 'sem permissão para conceder este papel' using errcode = '42501';
  end if;
  if not exists (select 1 from cj.profiles where id = p_usuario) then
    raise exception 'perfil não encontrado' using errcode = 'P0002';
  end if;
  if p_papel <> 'member' and cj.eh_menor(p_usuario) then
    raise exception 'menor de idade não recebe papel de liderança' using errcode = '23514';
  end if;
  insert into cj.roles(user_id, role, granted_by) values (p_usuario, p_papel, auth.uid())
  on conflict (user_id, role) do nothing;
  if found then
    perform cj.auditar('conceder_papel', 'profiles', p_usuario::text, jsonb_build_object('papel', p_papel));
  end if;
end $$;

-- ─── Retirar papel ────────────────────────────────────────────────────────────
create or replace function cj.revogar_papel(p_usuario uuid, p_papel cj.papel) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (p_papel = any(cj.papeis_que_concedo())) then
    raise exception 'sem permissão para revogar este papel' using errcode = '42501';
  end if;
  -- Trava contra "ficar sem pastor": o último pastor ativo não perde o papel.
  if p_papel = 'pastor' and cj.usuario_tem_papel(p_usuario, 'pastor')
     and (select count(*) from cj.roles r join cj.profiles p on p.id = r.user_id
           where r.role = 'pastor' and p.status = 'ativo') <= 1 then
    raise exception 'não dá para retirar o papel do último pastor ativo' using errcode = '23514';
  end if;
  delete from cj.roles where user_id = p_usuario and role = p_papel;
  if found then
    perform cj.auditar('revogar_papel', 'profiles', p_usuario::text, jsonb_build_object('papel', p_papel));
  end if;
end $$;

-- ─── Ativar / deixar pendente / desativar (suspender) um perfil ──────────────
-- Gestão (youth_admin, pastor). Ninguém muda o próprio status. Só o pastor mexe no
-- status de quem é da equipe (coordenação, pastor, proteção). Desativar não apaga
-- nada: os papéis ficam guardados e sem efeito até a pessoa ser reativada.
create or replace function cj.definir_status_perfil(p_usuario uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare atual text;
begin
  if not cj.eh_gestao() then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_status not in ('pendente','ativo','suspenso') then raise exception 'status inválido' using errcode = '22023'; end if;
  if p_usuario = auth.uid() then raise exception 'ninguém altera o próprio status' using errcode = '42501'; end if;
  select status into atual from cj.profiles where id = p_usuario;
  if not found then raise exception 'perfil não encontrado' using errcode = 'P0002'; end if;
  if cj.usuario_e_equipe(p_usuario) and not cj.tem_papel('pastor') then
    raise exception 'só o pastor altera o status de quem é da equipe' using errcode = '42501';
  end if;
  if atual = 'encerrado' then raise exception 'perfil encerrado não pode ser reativado' using errcode = '22023'; end if;
  if atual = p_status then return; end if;
  -- Desativar o último pastor ativo deixaria o módulo sem ninguém para dar papéis.
  if p_status <> 'ativo' and cj.usuario_tem_papel(p_usuario, 'pastor')
     and (select count(*) from cj.roles r join cj.profiles p on p.id = r.user_id
           where r.role = 'pastor' and p.status = 'ativo') <= 1 then
    raise exception 'não dá para desativar o último pastor ativo' using errcode = '23514';
  end if;
  update cj.profiles set status = p_status where id = p_usuario;
  perform cj.auditar(case p_status when 'ativo' then 'ativar_perfil' when 'suspenso' then 'desativar_perfil' else 'perfil_pendente' end,
                     'profiles', p_usuario::text, jsonb_build_object('de', atual, 'para', p_status));
end $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- LISTA DE PESSOAS (tela "Pessoas" do painel). Só a equipe. Cada consulta é auditada
-- (sem o texto da busca, que pode ser um nome). Nunca devolve o HMAC do WhatsApp.
--   p_status:  null/'todos' (menos encerrados) · 'pendente' · 'ativo' · 'suspenso' · 'nao_vinculado'
--   p_faixa:   null ou a faixa
--   p_circulo: null · 'nenhum' (sem círculo ativo) · uuid do círculo
--   p_busca:   trecho do nome (sem diferenciar maiúsculas/acentos simples)
--   p_papel:   null ou um papel
-- ═══════════════════════════════════════════════════════════════════════════════
create or replace function cj.listar_pessoas(p_status text default null, p_faixa cj.faixa_etaria default null,
                                             p_circulo text default null, p_busca text default null,
                                             p_papel cj.papel default null)
returns table (id uuid, nome text, faixa cj.faixa_etaria, status text, papeis cj.papel[],
               circulo_id uuid, circulo_nome text, vinculado boolean, pre_cadastrado boolean,
               regras_aceitas boolean, consentimento text, acolhido boolean, criado_em timestamptz)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare circ uuid;
begin
  if not cj.eh_equipe() then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_status is not null and p_status not in ('todos','pendente','ativo','suspenso','nao_vinculado') then
    raise exception 'filtro de situação inválido' using errcode = '22023';
  end if;
  if p_circulo is not null and p_circulo <> 'nenhum' then
    begin circ := p_circulo::uuid; exception when others then raise exception 'círculo inválido' using errcode = '22023'; end;
  end if;
  perform cj.auditar('consultar', 'pessoas', null, jsonb_strip_nulls(jsonb_build_object(
    'status', p_status, 'faixa', p_faixa, 'circulo', p_circulo, 'papel', p_papel, 'com_busca', p_busca is not null and btrim(p_busca) <> '')));
  return query
    select p.id, p.display_name, p.age_band, p.status,
           coalesce((select array_agg(r.role order by r.role) from cj.roles r where r.user_id = p.id), '{}'::cj.papel[]),
           cm.circle_id, ci.name,
           p.vinculado_em is not null, p.pre_cadastrado_por is not null,
           exists (select 1 from cj.term_acceptances t where t.user_id = p.id and t.document = 'regras_comunidade'),
           case when p.age_band <> '15-17' then 'nao_exigido'
                else coalesce((select g.status from cj.guardian_consents g where g.minor_id = p.id
                                order by (g.status in ('pendente','aprovado')) desc, g.created_at desc limit 1), 'nao_pedido') end,
           exists (select 1 from cj.profile_private pp where pp.user_id = p.id and pp.first_contact_at is not null),
           p.created_at
      from cj.profiles p
      left join cj.circle_members cm on cm.user_id = p.id and cm.membership_status = 'ativo'
      left join cj.circles ci on ci.id = cm.circle_id
     where (case coalesce(p_status, 'todos')
              when 'todos' then p.status <> 'encerrado'
              when 'nao_vinculado' then p.vinculado_em is null and p.status <> 'encerrado'
              else p.status = p_status end)
       and (p_faixa is null or p.age_band = p_faixa)
       and (p_circulo is null or (p_circulo = 'nenhum' and cm.circle_id is null) or cm.circle_id = circ)
       and (p_busca is null or btrim(p_busca) = '' or p.display_name ilike '%' || replace(replace(btrim(p_busca), '%', ''), '_', '') || '%')
       and (p_papel is null or exists (select 1 from cj.roles r where r.user_id = p.id and r.role = p_papel))
     order by (p.status = 'pendente') desc, lower(p.display_name)
     limit 300;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PRÉ-CADASTRO PELO WHATSAPP. O servidor calcula o HMAC do número (o banco nunca vê o
-- telefone) e chama esta função "como" a pessoa da liderança. Quando o dono do número
-- entrar no Radar e abrir o Conexão Jovem, o crachá dele cai neste mesmo HMAC e o
-- perfil se vincula sozinho (cj.confirmar_vinculo).
-- ═══════════════════════════════════════════════════════════════════════════════
create or replace function cj.pre_cadastrar(p_hash text, p_nome text, p_faixa cj.faixa_etaria, p_ativar boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare novo uuid;
begin
  if not cj.eh_gestao() then raise exception 'sem permissão' using errcode = '42501'; end if;
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then raise exception 'vínculo inválido' using errcode = '22023'; end if;
  if p_nome is null or char_length(btrim(p_nome)) not between 1 and 60 then
    raise exception 'nome precisa ter entre 1 e 60 caracteres' using errcode = '22023';
  end if;
  if exists (select 1 from cj.profiles where radar_key_hash = p_hash) then
    raise exception 'já existe uma pessoa com este WhatsApp' using errcode = '23505';
  end if;
  insert into cj.profiles(radar_key_hash, display_name, age_band, status, pre_cadastrado_por, vinculado_em)
  values (p_hash, btrim(p_nome), p_faixa, case when coalesce(p_ativar, true) then 'ativo' else 'pendente' end, auth.uid(), null)
  returning id into novo;
  insert into cj.profile_private(user_id) values (novo) on conflict do nothing;
  perform cj.auditar('pre_cadastrar', 'profiles', novo::text,
                     jsonb_build_object('faixa', p_faixa, 'status', case when coalesce(p_ativar, true) then 'ativo' else 'pendente' end));
  return novo;
end $$;

-- ─── O próprio usuário: vincula o pré-cadastro na primeira entrada ────────────
-- Devolve true só na vez em que o vínculo acontece (para o app avisar a pessoa).
create or replace function cj.confirmar_vinculo() returns boolean
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then return false; end if;
  update cj.profiles set vinculado_em = now() where id = u and vinculado_em is null;
  if not found then return false; end if;
  perform cj.auditar('vincular', 'profiles', u::text, '{}'::jsonb);
  return true;
end $$;

-- ─── "Quem sou eu" (tela de entrada, consentimento, perfil, menu) ─────────────
create or replace function cj.quem_sou() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when p.id is null then null else jsonb_build_object(
    'id', p.id,
    'nome', p.display_name,
    'faixa', p.age_band,
    'status', p.status,
    'sobre', p.bio,
    'interesses', to_jsonb(p.interests),
    'nome_completo', p.show_full_name,
    'notificacoes', p.notification_prefs,
    'pre_cadastrado', p.pre_cadastrado_por is not null,
    'papeis', coalesce((select jsonb_agg(r.role order by r.role) from cj.roles r where r.user_id = p.id), '[]'::jsonb),
    'termos', coalesce((select jsonb_agg(distinct t.document) from cj.term_acceptances t where t.user_id = p.id), '[]'::jsonb),
    'consentimento', (select jsonb_build_object('status', g.status, 'social', g.allow_social, 'eventos', g.allow_events, 'imagem', g.allow_image)
                        from cj.guardian_consents g where g.minor_id = p.id
                       order by (g.status in ('pendente','aprovado')) desc, g.created_at desc limit 1),
    'circulo', (select ci.name from cj.circle_members cm join cj.circles ci on ci.id = cm.circle_id
                 where cm.user_id = p.id and cm.membership_status = 'ativo' limit 1),
    'pode_social', cj.pode_social(),
    'equipe', cj.eh_equipe(),
    'gestao', cj.eh_gestao(),
    'pode_conceder', to_jsonb(cj.papeis_que_concedo())
  ) end
  from (select auth.uid() as uid) x left join cj.profiles p on p.id = x.uid
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PRIMEIRO ADMINISTRADOR. NÃO é liberada a nenhum papel do app: só o dono do banco
-- (SQL Editor do Supabase / psql como postgres) consegue rodar. Só funciona enquanto
-- não houver nenhum pastor ATIVO — depois disso, papéis só pelo app, com auditoria.
-- Ver conexao-jovem/supabase/primeiro-admin.md.
-- ═══════════════════════════════════════════════════════════════════════════════
create or replace function cj.promover_primeiro_admin(p_perfil uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare nome text;
begin
  -- A proteção é o privilégio: nenhum papel do app recebe EXECUTE (ver o fim do arquivo).
  if exists (select 1 from cj.roles r join cj.profiles p on p.id = r.user_id where r.role = 'pastor' and p.status = 'ativo') then
    raise exception 'já existe pastor ativo: os próximos papéis são dados pelo app (tela Pessoas)' using errcode = '23514';
  end if;
  select display_name into nome from cj.profiles where id = p_perfil;
  if not found then raise exception 'perfil não encontrado' using errcode = 'P0002'; end if;
  if cj.eh_menor(p_perfil) then raise exception 'menor de idade não recebe papel de liderança' using errcode = '23514'; end if;
  update cj.profiles set status = 'ativo' where id = p_perfil;
  insert into cj.roles(user_id, role, granted_by) values (p_perfil, 'pastor', null), (p_perfil, 'youth_admin', null)
  on conflict do nothing;
  insert into cj.profile_private(user_id) values (p_perfil) on conflict do nothing;
  insert into cj.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (null, 'primeiro_admin', 'profiles', p_perfil::text, '{"papeis":["pastor","youth_admin"],"por":"dono_do_banco"}'::jsonb);
  return jsonb_build_object('ok', true, 'perfil', p_perfil, 'nome', nome, 'papeis', jsonb_build_array('pastor', 'youth_admin'));
end $$;

-- ─── Privilégios das funções novas ────────────────────────────────────────────
revoke all on function cj.papeis_que_concedo(), cj.usuario_e_equipe(uuid),
  cj.listar_pessoas(text, cj.faixa_etaria, text, text, cj.papel), cj.pre_cadastrar(text, text, cj.faixa_etaria, boolean),
  cj.confirmar_vinculo(), cj.quem_sou(), cj.promover_primeiro_admin(uuid)
  from public, anon, authenticated;
grant execute on function cj.papeis_que_concedo(), cj.usuario_e_equipe(uuid),
  cj.listar_pessoas(text, cj.faixa_etaria, text, text, cj.papel), cj.pre_cadastrar(text, text, cj.faixa_etaria, boolean),
  cj.confirmar_vinculo(), cj.quem_sou()
  to authenticated;
-- As substituídas mantêm o GRANT da 001; reforço aqui para a 002 valer sozinha.
grant execute on function cj.conceder_papel(uuid, cj.papel), cj.revogar_papel(uuid, cj.papel),
  cj.definir_status_perfil(uuid, text) to authenticated;
-- cj.promover_primeiro_admin: de propósito, SEM grant para ninguém do app.

-- Fim da migração 002.
