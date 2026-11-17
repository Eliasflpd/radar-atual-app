# Conexão Jovem — Fase 2: banco de dados, segurança e login

> **Atualização 17/11/2026 — Módulo 3 (Eventos) construído, ainda NÃO ligado em produção.**
> - Migração nova `supabase/migrations/004_eventos.sql` (aplicar depois da 001, 002 e 003; se a 001 for reaplicada, reaplicar 002, 003 e 004). Sem `drop`/`delete`/`truncate` em lugar nenhum do arquivo (nem em comentários); nenhuma política RLS alterada. Colunas novas: `events.contact`, `events.minor_rules`, `events.cancel_reason`; `event_registrations.waitlist_at`, `check_in_by`, `check_out_by`, `pickup_note`. Funções novas (security definer, auditadas): `salvar_evento`, `definir_status_evento`, `eventos_gestao`, `inscritos_evento`, `meus_eventos`, `gere_evento`, `promover_lista_espera` (interna) e `registrar_presenca_evento` de 4 argumentos; `trg_inscricao` e `decidir_autorizacao_evento` substituídas; gatilho novo `t_espera` (cancelou → a fila anda).
> - Regras: o servidor decide o status da inscrição (confirmada · aguardando autorização · lista de espera); menor sem autorização geral de eventos (ou em evento que pede autorização) fica aguardando; autorização aprovada não fura a fila; acampamento com menores sempre pede autorização; líder/auxiliar cria e gere só eventos do próprio círculo; check-in/out só equipe ou líder do evento do círculo, e a saída de menor exige "retirado por".
> - Ações novas em `api/_lib/jovem.js`: `evento`, `evento_ics`, `eventos_gestao`, `gerir_evento`, `salvar_evento`, `status_evento`, `autorizar_evento`, `presenca_evento` (e `eventos`, `inscrever`, `cancelar_inscricao` revistas).
> - Telas: Eventos e detalhe (reais), Gestão de eventos no Painel (`#/eventos-gestao`) para a equipe e para o líder (só o círculo). Na demonstração, simulador local com eventos fictícios e "Ver a tela como" Coordenação/Líder.

> **Atualização 17/11/2026 — Módulo 2 (Círculos) construído, ainda NÃO ligado em produção.**
> - Migração nova `supabase/migrations/003_circulos.sql` (aplicar depois da 001 e da 002; se a 001 for reaplicada, reaplicar 002 e 003). Sem `drop`/`delete`/`truncate` em lugar nenhum do arquivo; nenhuma política RLS alterada. Funções novas (security definer, auditadas): `salvar_circulo`, `definir_status_circulo`, `adicionar_ao_circulo`, `integrantes_do_circulo`, `atualizar_encontro`, `circulos_disponiveis`, `pedir_entrada`, `pedir_troca`, `sair_do_circulo`; `decidir_membro` substituída (limite, consentimento de menor, troca). Coluna nova `circle_members.change_note` (motivo da troca, só a gestão lê; o líder não vê o pedido de troca).
> - Ações novas em `api/_lib/jovem.js`: `circulos_disponiveis`, `cancelar_pedido_circulo`, `sair_circulo`, `lider_circulos`, `gerir_circulo`, `atualizar_encontro`, `circulos_gestao`, `salvar_circulo`, `status_circulo`, `adicionar_ao_circulo`, `candidatos_circulo` (e `circulo`, `pedir_circulo`, `pedir_troca`, `propor_encontro` revistas).
> - Telas: Meu Círculo (real), Encontrar um círculo, Conduzir meu círculo (líder/auxiliar) e Círculos (painel da gestão). Na demonstração, simulador local com círculos fictícios.

> **Atualização 17/11/2026 — Módulo 1 (gestão de pessoas e login) construído, ainda NÃO ligado em produção.**
> - Função de verdade: `api/_lib/jovem.js`, registrada como `fn=jovem` em `api/dados.js` (uma linha). Sem `CJ_DB_URL` / `CJ_VINCULO_SEGREDO` ela responde `{"ok":false,"motivo":"nao_configurado"}` e o app fica na demonstração. `api-proposta/jovem.js` agora só reaponta para ela.
> - Migração nova `supabase/migrations/002_gestao_pessoas.sql` (aplicar depois da 001): pré-cadastro por WhatsApp via HMAC, lista de pessoas para a equipe, regras de papéis/status reforçadas, auditoria explícita e `cj.promover_primeiro_admin`.
> - Primeiro administrador: `supabase/primeiro-admin.md`.
> - Frontend: `public/jovem/cj-api.js` (modo automático real/demonstração) e as telas Entrar, Consentimento, Perfil e **Pessoas** ligadas à API.
> - Testes: `bash testes/rodar.sh` (banco + função) e `bash testes/navegador.sh` (Chromium contra a função e o Postgres local; precisa do pacote `playwright`).
> - Decisão pendente nova: faixas vão só até 22–25; adultos da equipe acima de 25 entram como 22–25 por enquanto.

> **Situação: pronto para revisão, NADA está no ar.**
> Tudo desta fase mora na pasta `conexao-jovem/`. A Vercel só publica `public/` e `api/`, então esta pasta não muda nada no app Radar. Nenhum banco real foi tocado.

## 1. O que foi feito (em palavras simples)

| Arquivo | Para que serve |
|---|---|
| `supabase/migrations/001_conexao_jovem.sql` | Cria as "gavetas" do Conexão Jovem num espaço separado do banco (schema `cj`), com as regras de quem pode ver o quê. |
| `supabase/seed_demo.sql` | Dados **fictícios** para teste (nomes com "(demo)"). Ele se recusa a rodar sem uma trava, para nunca cair em produção por engano. |
| `testes/rodar.sh` + `testes/rls.test.js` | Liga um banco de teste **descartável** no próprio computador, aplica tudo e confere 79 situações de segurança. |
| `api-proposta/jovem.js` | O código do servidor que o app vai chamar. **Ainda não está ativo.** |

### As regras de segurança que o banco garante (e os testes provam)
- **Visitante sem login não vê nada.**
- **Pedido de oração e pedido de conversa são privados.** O jovem vê só os seus. A equipe só lê por uma "porta" que **anota cada leitura** num livro de registro (auditoria): quem leu, qual pedido, quando — sem copiar o texto.
  - Pastor: lê todos. Coordenação de jovens: só os marcados "equipe pastoral" (não os "só para o pastor"). Equipe de proteção: só os que foram encaminhados a ela. **Líder de círculo não lê pedidos de oração.**
- **Líder de círculo só enxerga o próprio círculo** (integrantes, encontros, mural, progresso da jornada).
- **Menores (15–17):** mural, comentários e círculo só depois que **uma pessoa da equipe aprova o consentimento do responsável** (o próprio jovem não consegue se aprovar). Mesmo sem consentimento, o menor **pode pedir oração, pedir conversa e denunciar**.
- **Não existe chat privado** no app. Conversa é sempre por canal institucional (pedido de conversa com responsável designado).
- **Círculos separados por faixa etária**; menor não recebe papel de liderança.
- **Tudo o que alguém publica entra "em moderação"**; aviso oficial só a liderança publica; dá para silenciar alguém e denunciar.
- **Devocional só vai ao ar com aprovação do pastor** e com licença do texto conferida.
- **Ninguém dá papel a si mesmo.** Coordenação concede líder/auxiliar; só o pastor concede "proteção" e "pastor".
- **Livro de auditoria não se apaga nem se edita** (nem pelo pastor).
- **Painel da liderança só mostra números**, nunca nomes ou textos.
- **Diário espiritual não vai para o banco** — continua só no celular do jovem. Pedido de oração "só para mim" também fica no celular.
- **LGPD:** o jovem pode exportar todos os seus dados e excluir a própria conta.

## 2. Como rodar os testes

Precisa de PostgreSQL e Node instalados (no Ubuntu: `sudo apt-get install -y postgresql`). Na raiz do repositório:

```bash
bash conexao-jovem/testes/rodar.sh
```

O script cria um banco temporário, roda tudo e apaga ao final. Ele **não lê** nenhuma senha ou endereço de banco do Radar. Resultado da última execução: **79 passaram, 0 falharam.** Também confirmamos que os testes **detectam** falhas: ao afrouxar de propósito duas regras, 5 testes acusaram na hora.

## 3. Como o login do Radar vira permissão no banco (recomendação)

O Radar já identifica a pessoa pelo **crachá** (`radar_chave`), que só nasce depois que ela confirma o WhatsApp com o código. O `/jovem/` fica no mesmo site, então consegue usar esse mesmo crachá.

| Opção | Como funciona | Prós | Contras |
|---|---|---|---|
| **A — servidor confere o crachá e o banco aplica as regras por pessoa** ✅ | A função confere o crachá, acha o perfil e roda cada consulta **"como aquela pessoa"** (é o mesmo mecanismo que o Supabase usa por dentro: `role authenticated` + identificação). | Reaproveita o login do Radar (um login só); as regras do banco valem de verdade; **nenhum token nem chave vai para o navegador**; não precisa expor o schema `cj` na internet; os testes provam exatamente esse caminho. | Tudo passa pela função (sem "tempo real" do Supabase); o código precisa manter a disciplina de rodar tudo "como a pessoa" (só a criação do perfil roda como servidor). |
| A1 — variante: emitir um JWT curto para o navegador | A função assina um token com o segredo JWT do Supabase e o navegador fala direto com o Supabase. | Permite usar o Supabase direto do navegador. | O segredo JWT na Vercel é poderoso (forja qualquer usuário); expõe o schema na internet; o Supabase está migrando para chaves assimétricas. |
| B — Supabase Auth com código por SMS | Login próprio do Supabase. | Pronto e mantido pelo Supabase. | **Segundo login** (o jovem já entrou no Radar); SMS custa e não é WhatsApp; telefones (inclusive de menores) duplicados em outro cadastro. |
| C — função com "service role" checando tudo no código | Servidor com poder total decide no JavaScript. | Simples de começar. | Um erro de programação = vazamento de todos os pedidos de oração. As regras do banco viram enfeite. |

**Escolha: A.** O que a função proposta faz: lê o crachá do cabeçalho `x-radar-chave` (nunca da URL) → acha o dono em `radar_chaves` **só lendo** (nunca escreve em tabela do Radar) → aceita apenas crachá de telefone confirmado → transforma o telefone num código irreversível (HMAC) para achar o perfil (o schema `cj` **não guarda telefone**) → roda a ação "como a pessoa".

**Service role nunca vai para o navegador.** Nem é usada.

## 4. Para ligar ao app: arquivos FORA de `conexao-jovem/` (só com aprovação do dono)

> O próprio código do Radar registra que o plano gratuito da Vercel está **no limite de funções** (12/12). Por isso o módulo entra como mais uma rota dentro de `api/dados.js` (como já é feito com outros módulos), e não como função nova.

1. **Criar** `api/_lib/jovem.js` — cópia de `conexao-jovem/api-proposta/jovem.js` (sem alterações).
2. **Alterar** `api/dados.js` — **uma linha** na lista `HANDLERS`: `jovem: require('./_lib/jovem.js'),`
3. **Alterar** `public/jovem/cj.js` — trocar o estado em `localStorage` por chamadas `POST /api/dados?fn=jovem` com `{ acao: ... }` e o cabeçalho `x-radar-chave` (lido de `localStorage.radar_chave`). Mapa das telas → ações: Início `inicio`; Círculo `circulo`, `pedir_circulo`, `propor_encontro`, `responder_presenca`, `pedir_troca`; Jornada `jornada`, `marcar_jornada`; Missão `missao`, `participar_missao`; Eventos `eventos`, `inscrever`, `cancelar_inscricao`; Palavra `devocionais`; Comunidade `mural`, `comentarios`, `publicar`, `comentar`, `denunciar`, `silenciar_autor`; Talentos `talentos`, `salvar_talentos`; Acolhimento `orar`, `meus_pedidos`, `pedir_conversa`, `minhas_conversas`; Perfil `perfil`, `atualizar_perfil`, `exportar`, `excluir_conta`; Consentimento `aceitar_termos`, `pedir_consentimento`; Liderança `painel`, `lider_*`, `moderar`, `decidir_*`, `atribuir_conversa`, `tratar_denuncia`, `registrar_acolhimento`, `ativar_perfil`. **Continuam no aparelho:** diário espiritual e oração "só para mim". Se não houver crachá, a tela "Entrar" leva ao login por WhatsApp do Radar.
4. **Alterar** `public/jovem/index.html` — deixar de carregar `dados-demo.js` quando o modo real estiver ligado.
5. **Não precisa mexer** em `vercel.json` nem em `package.json` (o pacote `pg` já existe).

### Variáveis de ambiente (só os nomes)
- `CJ_VINCULO_SEGREDO` — **nova**, obrigatória: texto aleatório com 32+ caracteres (gera o código irreversível do telefone). Se mudar depois, os perfis perdem o vínculo.
- `RADAR_DB_DATABASE_URL` / `RADAR_DB` — **já existem** (mesmo banco do Radar).
- `CJ_DB_URL` — **opcional**, só se a liderança decidir por um projeto Supabase separado para o Conexão Jovem (ver riscos).

### Aplicar a migração no Supabase (somente com aprovação do dono)
1. Fazer **backup** do banco.
2. Testar primeiro numa cópia/ramo de homologação, se houver.
3. Rodar `supabase/migrations/001_conexao_jovem.sql` pelo SQL Editor do Supabase (ou `psql`) com o usuário dono (`postgres`).
4. Conferir que o usuário da conexão do servidor consegue `set role authenticated` (no Supabase o `postgres` consegue — confirmar no projeto).
5. **Não** adicionar o schema `cj` aos "Exposed schemas" da API do Supabase (com a opção A ele não precisa ser exposto).
6. **Nunca** rodar `seed_demo.sql` em produção.
7. Cadastrar as pessoas reais da equipe: o primeiro pastor precisa receber o papel `pastor` por SQL do dono do banco (é o único papel que nasce fora do app); depois disso tudo é pelas funções, com auditoria.

## 5. Riscos
- **Espaço do banco:** o próprio Radar anota que o banco está perto do limite (≈1.074 MB de 1.100 MB). As tabelas do `cj` são pequenas, mas fotos/arquivos não devem ir para o banco. Considerar um **projeto Supabase separado** (o código já aceita `CJ_DB_URL`) — também isola melhor os dados de menores.
- **Idade é autodeclarada:** um menor pode se declarar adulto. Mitigação: o perfil nasce "pendente" até o acolhimento humano, e a gestão corrige a faixa (`cj.definir_faixa`), o que remove do círculo e exige consentimento.
- **Crachá no aparelho:** quem pega o celular desbloqueado entra como a pessoa (já vale para o Radar). Uma falha de script (XSS) no mesmo site poderia ler o crachá — `cj.js` escapa todo texto, e isso precisa continuar.
- **Texto de oração fica no banco** (criptografado em repouso pelo Supabase, mas legível pelo dono do banco). Se a liderança quiser mais, dá para cifrar a coluna depois.
- **Sem limite de envios por pessoa** ainda (spam de posts/pedidos). Recomendado antes do piloto.
- **Prazo de 72 h úteis** ignora feriados.
- **Conexão com o banco** herda do Radar `ssl rejectUnauthorized: false`.
- Isto **não é parecer jurídico**: LGPD e ECA Digital (Lei 15.211/2025) exigem revisão por profissional antes de abrir para menores.

## 6. Decisões que a liderança e o jurídico precisam tomar
1. **Quem é quem:** nomes do pastor responsável, coordenação (`youth_admin`), equipe de proteção (`safeguarding_admin`), líderes e auxiliares.
2. **Consentimento de menores:** texto do termo, versão, **como verificar o responsável** (presencial? documento assinado?), e quais escopos (mural, eventos, imagem).
3. **Menores no mural geral:** liberar no piloto ou deixar só o círculo?
4. **Retenção:** por quanto tempo guardar pedidos de oração, conversas encerradas, denúncias, auditoria e dados de quem excluiu a conta.
5. **Quem lê pedidos de oração:** confirmar "pastor + coordenação" (e líder de círculo **não**), ou outra regra.
6. **Protocolo de proteção:** o que fazer quando surge risco, abuso ou violência; prazos; contato com a rede de proteção. O app não promete sigilo absoluto.
7. **Menor sem WhatsApp próprio:** pode entrar? (Hoje o login é pelo número de quem confirmou o código.)
8. **Banco:** mesmo projeto do Radar ou projeto separado; política de backup; responsável técnico.
9. **Encarregado de dados (LGPD)** da igreja e texto da política de privacidade.
