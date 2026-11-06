-- =====================================================================
-- Contrata Aí — marketplace de serviços
-- Rode este arquivo inteiro no Supabase: Dashboard > SQL Editor > New query
-- Regras de negócio garantidas NO BANCO (não dá para burlar pelo app):
--   * Contato (WhatsApp/telefone/e-mail/Pix) só aparece após pagamento
--   * Chat bloqueia tentativas de passar contato antes do pagamento
--   * 3 tentativas = conta suspensa automaticamente
--   * Comissão de 10% descontada do prestador
-- =====================================================================

-- ---------- Categorias ----------
create table if not exists public.categorias (
  id    serial primary key,
  nome  text not null unique,
  icone text not null default '🛠️'
);

insert into public.categorias (nome, icone) values
  ('Pedreiro','🧱'),('Eletricista','💡'),('Encanador','🚰'),('Pintor','🎨'),
  ('Diarista / Limpeza','🧹'),('Jardineiro','🌿'),('Marceneiro','🪚'),('Serralheiro','⚙️'),
  ('Mecânico','🔧'),('Técnico em informática','💻'),('Designer','✏️'),('Programador','👨‍💻'),
  ('Fotógrafo','📷'),('Professor particular','📚'),('Cabeleireiro / Beleza','💇'),
  ('Cozinheiro / Buffet','🍳'),('Motorista / Frete','🚚'),('Contador','📊'),
  ('Advogado','⚖️'),('Cuidador / Babá','🤝'),('Outros','🛠️')
on conflict (nome) do nothing;

-- ---------- Perfis (dados públicos — NUNCA contato) ----------
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  nome             text not null default '',
  cidade           text not null default '',
  uf               text not null default '',
  bio              text not null default '',
  foto_url         text not null default '',
  categoria_id     int references public.categorias(id),
  preco_base       numeric(10,2),
  is_prestador     boolean not null default false,
  is_contratante   boolean not null default true,
  -- campos controlados só pelo sistema/admin:
  is_admin         boolean not null default false,
  verificado       boolean not null default false,
  suspenso         boolean not null default false,
  avisos           int not null default 0,
  avaliacao_media  numeric(3,2) not null default 0,
  avaliacao_qtd    int not null default 0,
  criado_em        timestamptz not null default now()
);

-- ---------- Contatos privados (separados do perfil) ----------
create table if not exists public.contatos_privados (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  whatsapp   text not null default '',
  email      text not null default '',
  chave_pix  text not null default ''   -- para o repasse ao prestador
);

-- ---------- Conversas e mensagens ----------
create table if not exists public.conversas (
  id              uuid primary key default gen_random_uuid(),
  contratante_id  uuid not null references public.profiles(id) on delete cascade,
  prestador_id    uuid not null references public.profiles(id) on delete cascade,
  criado_em       timestamptz not null default now(),
  unique (contratante_id, prestador_id),
  check (contratante_id <> prestador_id)
);

create table if not exists public.mensagens (
  id           bigserial primary key,
  conversa_id  uuid not null references public.conversas(id) on delete cascade,
  autor_id     uuid not null references public.profiles(id) on delete cascade,
  texto        text not null check (length(texto) between 1 and 2000),
  bloqueada    boolean not null default false,
  criado_em    timestamptz not null default now()
);
create index if not exists mensagens_conversa_idx on public.mensagens (conversa_id, criado_em);

-- ---------- Contratações (proposta -> paga -> concluída) ----------
create table if not exists public.contratacoes (
  id                uuid primary key default gen_random_uuid(),
  conversa_id       uuid not null references public.conversas(id) on delete cascade,
  contratante_id    uuid not null references public.profiles(id),
  prestador_id      uuid not null references public.profiles(id),
  descricao         text not null,
  valor             numeric(10,2) not null check (valor >= 10),
  taxa_comissao     numeric(4,3) not null default 0.10,
  comissao          numeric(10,2) generated always as (round(valor * taxa_comissao, 2)) stored,
  valor_prestador   numeric(10,2) generated always as (valor - round(valor * taxa_comissao, 2)) stored,
  status            text not null default 'proposta'
                    check (status in ('proposta','paga','concluida','cancelada')),
  mp_payment_id     text,
  pago_em           timestamptz,
  concluido_em      timestamptz,
  repassado_em      timestamptz,   -- quando o admin pagou o prestador
  criado_em         timestamptz not null default now()
);
create index if not exists contratacoes_conversa_idx on public.contratacoes (conversa_id);

-- ---------- Avaliações (só de serviço pago e concluído pelo app) ----------
create table if not exists public.avaliacoes (
  contratacao_id  uuid primary key references public.contratacoes(id) on delete cascade,
  prestador_id    uuid not null references public.profiles(id),
  autor_id        uuid not null references public.profiles(id),
  nota            int not null check (nota between 1 and 5),
  comentario      text not null default '',
  criado_em       timestamptz not null default now()
);

-- ---------- Registro de tentativas de burla (só admin vê) ----------
create table if not exists public.tentativas_burla (
  id              bigserial primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  conversa_id     uuid references public.conversas(id) on delete set null,
  onde            text not null default 'chat',
  texto_original  text not null,
  criado_em       timestamptz not null default now()
);

-- =====================================================================
-- Funções auxiliares
-- =====================================================================

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Os dois já têm contratação paga/concluída entre si?
create or replace function public.contato_liberado(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.contratacoes
    where status in ('paga','concluida')
      and ((contratante_id = a and prestador_id = b) or (contratante_id = b and prestador_id = a))
  );
$$;

-- Detecta tentativa de passar contato (telefone, e-mail, link, "zap" etc.)
-- Mesma lógica de public/js/filtro.js (mantenha as duas iguais).
create or replace function public.tem_contato(txt text) returns boolean
language plpgsql immutable as $$
declare t text;
begin
  t := translate(lower(coalesce(txt,'')),
        'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc');
  -- números por extenso -> dígitos ("nove nove oito" -> "9 9 8")
  t := regexp_replace(t, '\mzero\M', '0', 'g');
  t := regexp_replace(t, '\m(um|uma)\M', '1', 'g');
  t := regexp_replace(t, '\m(dois|duas)\M', '2', 'g');
  t := regexp_replace(t, '\mtres\M', '3', 'g');
  t := regexp_replace(t, '\mquatro\M', '4', 'g');
  t := regexp_replace(t, '\mcinco\M', '5', 'g');
  t := regexp_replace(t, '\m(seis|meia)\M', '6', 'g');
  t := regexp_replace(t, '\msete\M', '7', 'g');
  t := regexp_replace(t, '\moito\M', '8', 'g');
  t := regexp_replace(t, '\mnove\M', '9', 'g');

  -- 9+ dígitos, mesmo separados por espaço, ponto, traço, parênteses...
  if t ~ '([0-9][^0-9a-z]{0,3}){9,}' then return true; end if;
  -- e-mail (inclui "arroba" e "ponto com")
  if t ~ '[a-z0-9._-]+\s*(@|\(at\)|\marroba\M)\s*[a-z0-9-]+' then return true; end if;
  if t ~ '(\mponto\s+com\M|\.com\M|\.com\.br|gmail|hotmail|outlook|yahoo)' then return true; end if;
  -- links e redes sociais
  if t ~ '(https?://|www\.|wa\.me|t\.me|bit\.ly|instagram|facebook|telegram|tiktok|linkedin)' then return true; end if;
  -- palavras-chave
  if t ~ '\m(zap|zapzap|zapp|whats|whatsapp|whatsap|watsap|wats|wpp|uats|insta|telegram|tel|cel|celular|fone|telefone|email|e-mail)\M' then return true; end if;
  if t ~ '(me\s+chama\s+(no|la|por)|me\s+liga|meu\s+(numero|contato|perfil)|fala\s+comigo\s+(no|por)|por\s+fora|fora\s+do\s+app)' then return true; end if;
  return false;
end $$;

-- =====================================================================
-- Gatilhos
-- =====================================================================

-- Cria o perfil automaticamente no cadastro
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, is_prestador, is_contratante)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    coalesce((new.raw_user_meta_data->>'is_prestador')::boolean, false),
    coalesce((new.raw_user_meta_data->>'is_contratante')::boolean, true)
  );
  insert into public.contatos_privados (user_id, whatsapp, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'whatsapp', ''), coalesce(new.email, ''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.novo_usuario();

-- Registra tentativa e suspende na 3ª
create or replace function public.registrar_burla(uid uuid, conv uuid, local text, txt text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.tentativas_burla (user_id, conversa_id, onde, texto_original)
  values (uid, conv, local, txt);
  update public.profiles
     set avisos = avisos + 1,
         suspenso = suspenso or (avisos + 1) >= 3
   where id = uid;
end $$;

-- Filtro do chat: antes do pagamento, contato é bloqueado
create or replace function public.filtrar_mensagem() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversas;
begin
  select * into c from public.conversas where id = new.conversa_id;
  new.bloqueada := false;
  if public.contato_liberado(c.contratante_id, c.prestador_id) then
    return new;
  end if;
  if public.tem_contato(new.texto) then
    perform public.registrar_burla(new.autor_id, new.conversa_id, 'chat', new.texto);
    new.texto := '🚫 Mensagem bloqueada: não é permitido passar contato antes da contratação. '
              || 'Após o pagamento pelo app, o WhatsApp é liberado automaticamente.';
    new.bloqueada := true;
  end if;
  return new;
end $$;

drop trigger if exists filtro_mensagem on public.mensagens;
create trigger filtro_mensagem before insert on public.mensagens
  for each row execute function public.filtrar_mensagem();

-- Filtro do perfil público e da proposta (bio, nome, descrição)
create or replace function public.filtrar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.tem_contato(new.bio) or public.tem_contato(new.nome) then
    raise exception 'Não é permitido colocar contato (telefone, WhatsApp, e-mail, redes) no perfil público.';
  end if;
  return new;
end $$;

drop trigger if exists filtro_perfil on public.profiles;
create trigger filtro_perfil before update of nome, bio on public.profiles
  for each row execute function public.filtrar_perfil();

create or replace function public.filtrar_proposta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.tem_contato(new.descricao) then
    raise exception 'Não é permitido colocar contato na proposta.';
  end if;
  return new;
end $$;

drop trigger if exists filtro_proposta on public.contratacoes;
create trigger filtro_proposta before insert on public.contratacoes
  for each row execute function public.filtrar_proposta();

-- Recalcula a média do prestador
create or replace function public.atualizar_media() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles p set
    avaliacao_media = coalesce((select round(avg(nota)::numeric, 2) from public.avaliacoes where prestador_id = new.prestador_id), 0),
    avaliacao_qtd   = (select count(*) from public.avaliacoes where prestador_id = new.prestador_id)
  where p.id = new.prestador_id;
  return new;
end $$;

drop trigger if exists media_avaliacao on public.avaliacoes;
create trigger media_avaliacao after insert on public.avaliacoes
  for each row execute function public.atualizar_media();

-- =====================================================================
-- Ações (RPC) — mudanças de status passam só por aqui
-- =====================================================================

-- Prestador envia proposta dentro da conversa
create or replace function public.enviar_proposta(conv uuid, p_descricao text, p_valor numeric) returns uuid
language plpgsql security definer set search_path = public as $$
declare c public.conversas; novo uuid;
begin
  select * into c from public.conversas where id = conv;
  if c.prestador_id is distinct from auth.uid() then raise exception 'Só o prestador pode enviar proposta.'; end if;
  if (select suspenso from public.profiles where id = auth.uid()) then raise exception 'Conta suspensa.'; end if;
  insert into public.contratacoes (conversa_id, contratante_id, prestador_id, descricao, valor)
  values (conv, c.contratante_id, c.prestador_id, p_descricao, p_valor)
  returning id into novo;
  return novo;
end $$;

-- Contratante confirma que o serviço foi feito (libera o repasse)
create or replace function public.concluir_servico(cid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.contratacoes set status = 'concluida', concluido_em = now()
   where id = cid and contratante_id = auth.uid() and status = 'paga';
  if not found then raise exception 'Contratação não encontrada ou ainda não paga.'; end if;
end $$;

-- Cancelar proposta ainda não paga (qualquer um dos dois)
create or replace function public.cancelar_proposta(cid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.contratacoes set status = 'cancelada'
   where id = cid and status = 'proposta' and auth.uid() in (contratante_id, prestador_id);
  if not found then raise exception 'Só dá para cancelar proposta ainda não paga.'; end if;
end $$;

-- Contato do outro lado — só depois do pagamento
create or replace function public.ver_contato(outro uuid) returns table (whatsapp text, email text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.contato_liberado(auth.uid(), outro) or public.is_admin()) then
    raise exception 'Contato liberado só após o pagamento pelo app.';
  end if;
  return query select cp.whatsapp, cp.email from public.contatos_privados cp where cp.user_id = outro;
end $$;

-- ---------- Ações do administrador ----------
create or replace function public.admin_atualizar_usuario(uid uuid, p_verificado boolean, p_suspenso boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Apenas administrador.'; end if;
  update public.profiles set verificado = p_verificado, suspenso = p_suspenso,
         avisos = case when suspenso and not p_suspenso then 0 else avisos end
   where id = uid;
end $$;

create or replace function public.admin_marcar_repasse(cid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Apenas administrador.'; end if;
  update public.contratacoes set repassado_em = now()
   where id = cid and status = 'concluida' and repassado_em is null;
end $$;

create or replace function public.admin_resumo() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Apenas administrador.'; end if;
  return json_build_object(
    'usuarios',      (select count(*) from public.profiles),
    'prestadores',   (select count(*) from public.profiles where is_prestador),
    'contratantes',  (select count(*) from public.profiles where is_contratante),
    'contratacoes',  (select count(*) from public.contratacoes where status in ('paga','concluida')),
    'faturado',      (select coalesce(sum(valor),0) from public.contratacoes where status in ('paga','concluida')),
    'comissao',      (select coalesce(sum(comissao),0) from public.contratacoes where status in ('paga','concluida')),
    'repasse_pendente', (select coalesce(sum(valor_prestador),0) from public.contratacoes where status = 'concluida' and repassado_em is null),
    'tentativas',    (select count(*) from public.tentativas_burla)
  );
end $$;

-- =====================================================================
-- Segurança (RLS + permissões por coluna)
-- =====================================================================
alter table public.categorias        enable row level security;
alter table public.profiles          enable row level security;
alter table public.contatos_privados enable row level security;
alter table public.conversas         enable row level security;
alter table public.mensagens         enable row level security;
alter table public.contratacoes      enable row level security;
alter table public.avaliacoes        enable row level security;
alter table public.tentativas_burla  enable row level security;

-- categorias: todos leem
drop policy if exists cat_ler on public.categorias;
create policy cat_ler on public.categorias for select using (true);

-- perfis: públicos para leitura; cada um edita só o próprio, e só colunas permitidas
drop policy if exists perfil_ler on public.profiles;
create policy perfil_ler on public.profiles for select using (true);
drop policy if exists perfil_editar on public.profiles;
create policy perfil_editar on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from anon, authenticated;
grant update (nome, cidade, uf, bio, foto_url, categoria_id, preco_base, is_prestador, is_contratante)
  on public.profiles to authenticated;

-- contatos: só o dono (os outros usam ver_contato) e o admin
drop policy if exists contato_ler on public.contatos_privados;
create policy contato_ler on public.contatos_privados for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists contato_editar on public.contatos_privados;
create policy contato_editar on public.contatos_privados for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.contatos_privados from anon, authenticated;
grant update (whatsapp, chave_pix) on public.contatos_privados to authenticated;
revoke select on public.contatos_privados from anon;

-- conversas: participantes e admin; o contratante inicia
drop policy if exists conv_ler on public.conversas;
create policy conv_ler on public.conversas for select
  using (auth.uid() in (contratante_id, prestador_id) or public.is_admin());
drop policy if exists conv_criar on public.conversas;
create policy conv_criar on public.conversas for insert with check (
  contratante_id = auth.uid()
  and not (select suspenso from public.profiles where id = auth.uid())
  and exists (select 1 from public.profiles where id = prestador_id and is_prestador and not suspenso)
);

-- mensagens: participantes leem; autor envia (filtro roda no gatilho)
drop policy if exists msg_ler on public.mensagens;
create policy msg_ler on public.mensagens for select using (
  public.is_admin() or exists (select 1 from public.conversas c where c.id = conversa_id and auth.uid() in (c.contratante_id, c.prestador_id))
);
drop policy if exists msg_enviar on public.mensagens;
create policy msg_enviar on public.mensagens for insert with check (
  autor_id = auth.uid()
  and not (select suspenso from public.profiles where id = auth.uid())
  and exists (select 1 from public.conversas c where c.id = conversa_id and auth.uid() in (c.contratante_id, c.prestador_id))
);
revoke update, delete on public.mensagens from anon, authenticated;

-- contratações: só leitura direta; mudanças via funções acima ou webhook de pagamento
drop policy if exists contr_ler on public.contratacoes;
create policy contr_ler on public.contratacoes for select
  using (auth.uid() in (contratante_id, prestador_id) or public.is_admin());
revoke insert, update, delete on public.contratacoes from anon, authenticated;

-- avaliações: públicas; contratante avalia uma vez, serviço concluído
drop policy if exists aval_ler on public.avaliacoes;
create policy aval_ler on public.avaliacoes for select using (true);
drop policy if exists aval_criar on public.avaliacoes;
create policy aval_criar on public.avaliacoes for insert with check (
  autor_id = auth.uid() and exists (
    select 1 from public.contratacoes ct
    where ct.id = contratacao_id and ct.contratante_id = auth.uid()
      and ct.prestador_id = avaliacoes.prestador_id and ct.status = 'concluida')
);

-- tentativas de burla: só admin
drop policy if exists burla_ler on public.tentativas_burla;
create policy burla_ler on public.tentativas_burla for select using (public.is_admin());

-- funções internas não podem ser chamadas direto pelo app
revoke execute on function public.registrar_burla(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.contato_liberado(uuid, uuid) from anon;

-- Chat em tempo real
do $$ begin
  alter publication supabase_realtime add table public.mensagens;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.contratacoes;
exception when others then null; end $$;

-- =====================================================================
-- DEPOIS de criar sua conta no app, torne-se administrador:
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'SEU-EMAIL-AQUI');
-- =====================================================================
