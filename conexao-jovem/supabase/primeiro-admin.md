# Conexão Jovem — como criar o primeiro administrador

O primeiro administrador (o responsável pelo módulo) recebe os papéis **`pastor`** e **`youth_admin`**.
É o **único** passo feito por SQL. Depois dele, a equipe e os jovens são cadastrados pelo próprio app
(Painel de liderança → **Pessoas**), com regras do banco e registro de auditoria.

> Nenhum número de telefone vai para o repositório nem para o banco. O banco guarda só um código
> irreversível (HMAC) calculado com `CJ_VINCULO_SEGREDO`.

## Antes de começar (uma vez)

1. **Aplicar as migrações** no projeto Supabase do Conexão Jovem (SQL Editor, usuário `postgres`), nesta ordem:
   1. `conexao-jovem/supabase/migrations/001_conexao_jovem.sql`
   2. `conexao-jovem/supabase/migrations/002_gestao_pessoas.sql`

   Se a 001 for reaplicada algum dia, reaplique a 002 logo depois. **Nunca** rode `seed_demo.sql` em produção.
   **Não** adicione o schema `cj` aos "Exposed schemas" da API do Supabase.
2. **Criar as variáveis na Vercel** (Production), sem colocar os valores no repositório:
   - `CJ_DB_URL` — a connection string (Postgres) do projeto do Conexão Jovem. O usuário precisa conseguir `set role authenticated` (o `postgres` do Supabase consegue).
   - `CJ_VINCULO_SEGREDO` — um texto aleatório de **32 caracteres ou mais** (ex.: `openssl rand -hex 32`). Guarde-o: se mudar, todos os perfis perdem o vínculo com o WhatsApp.
   - `RADAR_DB_DATABASE_URL` (ou `RADAR_DB`) — **já existe**; é dali que o crachá do Radar é conferido (só leitura).
3. Publicar de novo (redeploy) para a função ler as variáveis. Sem elas, `/api/dados?fn=jovem` responde
   `{"ok":false,"motivo":"nao_configurado"}` e o app continua no modo demonstração.

## Caminho A (recomendado): entrar primeiro, promover depois

1. No celular do responsável: abrir o **Radar Atual**, ter o cadastro com o WhatsApp **confirmado pelo código**.
2. Abrir **/jovem/** no mesmo aparelho → "Entrar com a conta do Radar" → informar nome e faixa (para adultos acima de 25, use `22–25` por enquanto; ver "Decisões pendentes" no PLANO).
   O perfil nasce como `pendente`.
3. No SQL Editor do Supabase (usuário `postgres`), achar o perfil — ele será o único, ou o mais recente:

   ```sql
   select id, display_name, status, created_at from cj.profiles order by created_at desc limit 5;
   ```
4. Promover (troque pelo `id` da linha certa):

   ```sql
   select cj.promover_primeiro_admin('00000000-0000-0000-0000-000000000000');
   ```
   A função ativa o perfil, concede `pastor` + `youth_admin` e grava a ação em `cj.audit_logs`.
   Ela **recusa** rodar se já existir um pastor ativo, se a pessoa for menor de idade, e não pode ser chamada pelo app
   (nenhum papel do app tem permissão de executá-la).
5. Recarregar /jovem/ no celular: o menu **Mais** passa a mostrar **Pessoas**.

## Caminho B: cadastrar antes de a pessoa abrir o app

1. No seu computador, com o repositório: calcular o código de vínculo do WhatsApp (o número é pedido pelo teclado e não é guardado):

   ```bash
   CJ_VINCULO_SEGREDO='(o mesmo valor da Vercel)' node conexao-jovem/supabase/vinculo-whatsapp.js
   ```
2. No SQL Editor (usuário `postgres`), criar o perfil e promover:

   ```sql
   with novo as (
     insert into cj.profiles (radar_key_hash, display_name, age_band, vinculado_em)
     values ('(código de 64 caracteres do passo 1)', 'Nome do responsável', '22-25', null)
     returning id
   )
   select cj.promover_primeiro_admin(id) from novo;
   ```
3. Quando ele abrir /jovem/ com o Radar já confirmado naquele número, o perfil se liga sozinho
   (aparece o aviso "Encontramos o seu cadastro").

## Depois: cadastrar a equipe e os jovens (pelo app)

Painel de liderança → **Pessoas**:
- **Cadastrar pessoa pelo WhatsApp** (nome + WhatsApp + faixa): pré-cadastro que se liga quando a pessoa entrar no Radar com aquele número.
- **Aprovar** pendentes, **Desativar/Reativar** (nada é apagado), **corrigir faixa**, **registrar acolhimento**.
- **Papéis**: a coordenação (`youth_admin`) concede Líder de círculo e Auxiliar; o pastor concede também Proteção (`safeguarding_admin`), Coordenação e Pastor.
  Menores não recebem papel de liderança; o último pastor ativo não perde o papel nem é desativado.
- Tudo fica em `cj.audit_logs` (quem fez, o quê, quando — sem textos sensíveis). Pastor e Proteção podem consultar:

  ```sql
  select created_at, actor_id, action, entity_type, entity_id, metadata from cj.audit_logs order by id desc limit 50;
  ```
