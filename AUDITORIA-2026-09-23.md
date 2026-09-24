# AUDITORIA COMPLETA DO RADAR — 23/09/2026

Pedida pelo Elias: *"revise, audite tudo e tenha seu próprio veredito, tô vendo
você perder muita coisa."* Ele estava certo. Este documento é a fonte única de
verdade do RADAR — **ler ANTES de tocar em qualquer coisa.**

Três frentes: segurança/dinheiro, mapa das APIs, banco de dados. Cada afirmação
tem arquivo e linha. O que foi provado ao vivo está marcado **[PROVADO]**.

---

## VEREDITO EM 5 LINHAS

1. **O RADAR está vazando assinatura E dado de pessoa, agora.** O pior:
   `POST /api/cadastros` entrega um crachá válido pra QUALQUER telefone —
   provado ao vivo hoje. Isso anula a trava por pessoa que eu construí ontem.
2. **O PIN `0607` está no SERVIDOR** (`api/videos.js:89`), não só no app. Abre o
   curso pago inteiro. E está impresso no `placeholder` da tela de login.
3. **O paywall de 30 dias não existe no servidor.** Nenhuma rota confere se pagou
   antes de entregar conteúdo. É só uma tela no navegador.
4. **6 rotas de IA sem trava nenhuma** — qualquer um gasta a cota do Elias.
5. O que está BEM: "Meu Estudo" (livros cifrados de verdade), a trava do crachá
   em si (`chave.js`), o globo de voz (fail-closed), zero chave de API em `public/`.

---

## OS BURACOS — do pior pro menos grave

| # | O quê | Onde | Gravidade |
|---|---|---|---|
| 1 | **[PROVADO]** `POST /api/cadastros` dá crachá pra qualquer WhatsApp. Testei com número inventado → recebi `rk_E5hxBPEn...`. Com ele lê/apaga caderno de pregação, plano de leitura e memória do globo de qualquer pastor, e sobrescreve nome/cargo dele | `api/cadastros.js:78-81,132` | 🔴 CRÍTICO |
| 2 | PIN `0607` NO SERVIDOR libera os vídeos de todos os cursos. `CURSO_PIN` não existe em `.env`, então o `0607` do código é o que vale | `api/videos.js:89,91` | 🔴 CRÍTICO |
| 3 | O PIN está escrito no `placeholder` da tela de login do curso | `public/biblioteca/curso-teologia/index.html:223` | 🔴 CRÍTICO |
| 4 | Paywall só no navegador. `if(u.admin) return` e `u.admin` vem do localStorage; `if(!d||!d.ok) return` deixa passar se a API cair | `app.js:155,159,161` | 🔴 CRÍTICO |
| 5 | PIN `0607` no app abre 4º trimestre e lições futuras | `app.js:2490` | 🟠 ALTO |
| 6 | `POST /api/igrejas` sem token: cria/edita qualquer igreja E dispara WhatsApp pela Fonnte pro número que quiser (metralhadora de spam na conta do Elias) | `api/_lib/igrejas.js:36-77` | 🟠 ALTO |
| 7 | `?fn=avaliacao&acao=listar&user=<whatsapp>` — fail-open E sem crachá. Lista os pareceres que o pastor escreveu (até 4000 caracteres) | `api/estudo-busca.js:206,245` | 🟠 ALTO |
| 8 | `?fn=kittel` fail-open: variável vazia = trava some = despeja o acervo pago (Kittel) | `api/estudo-busca.js:167` | 🟠 ALTO |
| 9 | `/api/publicacoes` fail-open (`token||''` + `!==`): variável vazia = qualquer um publica/apaga | `api/_lib/publicacoes.js:72,80,126` | 🟠 ALTO |
| 10 | `GET /api/cadastros?phone=` público: confirma número e devolve nome+cargo. Lista telefônica + alvo pro nº 1 | `api/cadastros.js:134-138` | 🟠 ALTO |
| 11 | `OTP_SECRET` fixo no código (`'radar-ebd-2026'`), não existe em `.env`. Dá pra forjar token e "verificar" sem código. (Mas o cadastro atual nem passa por OTP — rota meio morta) | `api/send-otp.js:39`, `verify-otp.js:51` | 🟠 ALTO |
| 12 | Token de admin na URL — **10 lugares** (auditor externo achou 6). Vaza no log da Vercel, histórico e Referer | `app.js:1150,1157,1183,1199,2980,3003,3177,3207,4069,4102` | 🟠 ALTO |
| 13 | `ADMIN_PHONES=['99988031747']` + `OWNER='5599988031747'`: quem usa esse número vira admin e `/api/acesso?phone=5599...` responde `ativo` | `app.js:39`, `api/_lib/acesso.js:5` | 🟠 ALTO |
| 14 | Webhook PIX com trava opcional (`if(tk && ...)`): se `ASAAS_WEBHOOK_TOKEN` sumir, qualquer um se libera 1 mês | `api/asaas-webhook.js:8` | 🟠 ALTO |
| 15 | `curso-quem` sem token: devolve nomes de quem estuda e quanto assistiu | `api/videos.js:191` | 🟡 MÉDIO |
| 16 | `midia-sub` sem trava: enche o CRM e usa o Storage da Supabase de hospedagem grátis | `api/videos.js:219` | 🟡 MÉDIO |
| 17 | `corpo_html` de publicação entra cru por innerHTML (resto da página é escapado) | `public/biblioteca/publicacao.html:96` | 🟡 MÉDIO |
| 18 | 6 rotas de IA sem trava: `peca, perolas, mensagem, concilio-wagner, estudo-doutrina, busca-vetor` — gastam cota de IA | `api/edge.js:15` | 🟡 MÉDIO |
| 19 | `fn=uso`/`fn=hit` gravam sem trava nem limite. Banco já em 1074 MB de 1100 | `api/dados.js:292`, `hit.js:38` | 🟡 MÉDIO |
| 20 | Fallbacks adivinháveis: `PUSH_CRON_SECRET||'__x__'` | `api/videos.js:269` | 🟡 MÉDIO |

**Padrão que se repete (a raiz de metade dos buracos):** `if(ADM && token!==ADM)`
— quando a variável está vazia, `ADM` é falso, a condição inteira é falsa, e a
trava **some**. O jeito certo é `if(!ADM || token!==ADM)` — que FECHA quando a
variável falta. O `chave.js:265` já faz certo; os outros não.

---

## O BANCO — 31 tabelas [conferido ao vivo]

- **Nenhuma tabela fantasma:** todo `select` do código encontra a tabela.
- **4 tabelas são ENTULHO de tentativas de embedding:**

| Tabela | Linhas | Status |
|---|---|---|
| `versiculo_emb_v4` | 31.104 | ✅ **é a que a busca usa** |
| `versiculo_emb_cf` | 31.104 | ✅ a reserva (Cloudflare), criada hoje |
| `versiculo_emb_voyage` | 31.104 | ❌ voyage-3.5, motor morto |
| `versiculo_emb_voyage4` | 5.100 | ❌ pela metade |
| `versiculo_embeddings` | 879 | ❌ dimensão antiga |
| `versiculo_emb_gemini` | 925 | ❌ minha tentativa de hoje, abandonada |

**⚠️ MINA:** a busca só sabe usar a `_v4` por causa da variável `EMB_TABLE` na
Vercel. Se ela sumir, o código cai no default escrito nele: `versiculo_emb_voyage`
— a tabela do motor MORTO. E não quebra: responde com LIXO silencioso. Consertar
é trocar o default no `estudo-busca.js:31` pra apontar pra `versiculo_emb_v4`.

**Dado de gente (o que não se refaz), backup salvo hoje:** 24 cadastros,
4 pregações, 8 crachás, 17 progressos de leitura, 12 memórias do globo.

---

## AS 11 FUNÇÕES (de 12 — cabe mais 1)

Node: `dados.js` (roteador `?fn=`), `cadastros.js`, `videos.js`, `estudo-busca.js`,
`chat.js`, `assinar.js`, `asaas-webhook.js`.
Edge: `edge.js` (roteador `?fn=` de IA), `noticias.js`, `send-otp.js`, `verify-otp.js`.

Handlers em `api/_lib/` (não contam no limite): 19 registrados + `ia.js`,
`wagner-corpus.js`, `voz-ferramentas.js`, `voz-memoria.js` (peças internas).

**Código morto: `api/_lib/ouvido.js`** — o OUVIDO que comecei hoje. Está pronto
pela metade, NÃO registrado em roteador nenhum, e fora do git. Não faz mal
parado, mas é trabalho pela metade.

**`OPENAI_API_KEY` não é lida por ninguém** — a cascata de IA não usa mais. Está
na Vercel à toa (a Copa acabou, chaves canceladas).

---

## O QUE FAZER — ordem proposta (NÃO aplicado ainda)

1. **Tapar o nº 1** (`/api/cadastros` só emite crachá pro mesmo aparelho, ou com
   OTP). É o que mais dói: anula a trava de ontem.
2. **PIN pro servidor + trocar** (nº 2, 3, 5).
3. **Servidor recusa conteúdo de quem não pagou** (nº 4).
4. **Trancar `/api/igrejas`** (nº 6 — spam na conta do Elias).
5. **Corrigir o padrão fail-open** em bloco (nº 7, 8, 9, 14).
6. **Tokens saem da URL** pro cabeçalho (nº 12).
7. **Trava leve nas 6 rotas de IA** (nº 18).
8. Trocar o default de `EMB_TABLE` (a mina do banco).
9. Apagar as 4 tabelas de entulho (depois de confirmar que a busca vai bem).

---

## O QUE EU JÁ ERREI HOJE (pra não repetir)

- Quebrei o globo apagando 2 botões e não vi por horas → fusível + trava na
  `guarda.mjs`. Ver [[radar_globo_botao_sumido_matou_pagina]].
- Disse "1 chave Gemini" quando eram 3 (olhei só um pedaço do cofre).
- Mandei cadastrar Mistral que já tínhamos.
- Construí a trava por pessoa (`fn=pregado`) e deixei a porta `/api/cadastros`
  escancarada — o buraco nº 1. **Trava só vale se TODAS as portas fecham.**

Backup e trava deste ponto: etiqueta git `trava-2026-09-23`, commit `623c239`.
