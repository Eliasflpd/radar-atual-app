# O globo passou a LEMBRAR

**22/09/2026** · a terceira perna do globo de voz (`/biblioteca/voz`) · versão **v161**

O Elias comparou: *"o do chatgpt a conversa é top, já tem conhecimento, não trava"*.
O **conhecimento** foi resolvido ontem (as seis ferramentas). O **travamento** foi
resolvido ontem (tela apagada, Wake Lock, Media Session). Faltava a terceira: ele
**esquecia tudo** ao fechar a página, e esquecia de novo se caísse a rede.

Agora não esquece. E — isto importa tanto quanto — **quando não lembra, ele diz
que não lembra.** Não inventa.

---

## As três provas que foram pedidas, na íntegra

Sessões de verdade no Gemini Live (`models/gemini-3.8-live`), token assinado pelo
`/api/voz` real, ferramentas respondidas pelo mesmo caminho do navegador, memória
gravada no `RADAR_DB` de produção. **"Fechar a página" aqui é fechar o WebSocket e
pedir um token NOVO**: a sessão do Google morre junto, e tudo o que sobra teve que
vir da nossa tabela.

### 1. Conversa → fecha a página → abre de novo → ele sabe do que falaram

**1-A · primeira conversa** — *"Me explique Daniel 12:4 e o conhecimento crescendo."*
**Ferramentas:** `ler_versiculo {"ref":"Daniel 12:4"}` · `pesquisar_biblioteca` · 2,45 MB de áudio
**Token assinado com memória:** *não* (é a primeira vez — e ele não finge que é)

> Tem uma coisa nesse versículo que muita gente aplica para tecnologia hoje, mas o
> contexto esconde um detalhe que muda tudo. Deixa eu te mostrar. O texto diz que
> "muitos correrão de uma parte para outra, e a ciência se multiplicará". Antônio
> Gilberto observa que essa multiplicação da ciência aponta para uma corrida
> desesperada da humanidade por respostas nos últimos dias. Mas repare no que
> Severino Pedro destaca: esse movimento de correr de uma parte para outra, no
> original, está ligado ao povo buscando o verdadeiro entendimento da Palavra no
> tempo do fim. Ou seja, não é só sobre tecnologia, é sobre a busca espiritual que
> antecede a volta de Jesus. Mas isso ainda é metade. Porque quando você descobre o
> que significa o livro estar selado até esse exato momento, a história muda de
> tamanho. Quer que eu mostre?

*… a página FOI FECHADA — WebSocket encerrado, sessão do Google morta …*

**1-B · abriu de novo, sessão NOVA do Google** — *"Voltei. De onde a gente parou?"*
**Ferramentas:** nenhuma · **Token assinado com memória: SIM** · 0,66 MB de áudio

> Fala, pastor. A gente estava exatamente no meio daquela análise sobre Daniel doze,
> versículo quatro, destravando o verdadeiro sentido do aumento do conhecimento e da
> busca pela revelação. Quer continuar cavando esse texto?

Nenhuma ferramenta foi chamada: ele **já abriu a boca sabendo**, porque o resumo veio
dentro do token assinado.

---

### 2. Conversa → corta ele no meio → pergunta outra coisa → ele volta ao assunto

**2-A** — *"Me fala da visão dos quatro animais de Daniel capítulo 7."* — e no meio da
resposta o pastor fala por cima: *"Peraí, esquece isso. Me explica o Salmo 23:4."*
**Ferramentas:** `ler_versiculo {"ref":"Daniel 7:1-3"}` · `ler_versiculo {"ref":"Salmos 23:4"}`

> Você já reparou de onde esses animais saem? O texto diz que eles sobem do Mar
> Grande. No original, em aramaico, o mar aqui fala de agitação, das nações revoltas.
> Mas tem um detalhe: os ventos do céu ▌*(cortado aqui)*

*… fechou a página de novo …*

**2-B · sessão NOVA** — *"Você ficou devendo alguma coisa pra mim?"*
**Ferramentas:** nenhuma · **Token assinado com memória: SIM**

> Ficou sim, irmão. Você me cortou bem na hora que eu estava explicando de onde sobem
> aqueles animais de Daniel. Eu ia te mostrar o que o original em aramaico diz sobre o
> mar. Quer que eu volte de onde paramos?

---

### 3. Pergunta sobre algo que NUNCA foi falado → ele diz que não lembra

Chave de pastor **novo**, memória vazia — *"O que eu te perguntei semana passada sobre
as cidades de refúgio?"*
**Ferramentas:** `o_que_ja_falamos {"assunto":"cidades de refúgio"}`

> Isso eu não tenho guardado aqui. Não achei esse assunto no que a gente já conversou.
> Mas se você quiser, podemos abrir as Escrituras agora e cavar esse tema. Quer que eu
> mostre?

Ele **chamou a ferramenta** em vez de fingir, e **não inventou** uma conversa que nunca
houve — que é exatamente o erro fácil aqui.

---

## Como ele lembra: duas memórias, e uma só tabela

### Memória curta — o "de onde paramos"
Cada turno de conversa vai pro servidor (só a **transcrição**, nunca o áudio). O
servidor **não guarda a transcrição**: acumula um rascunho curto e, quando ele
engorda — ou quando o pastor encerra —, transforma em **resumo rolante de no máximo
8 linhas**. É esse resumo que entra na instrução de sistema do token seguinte.

> **Por que resumo e não a conversa inteira:** a janela do Live são ~131 mil tokens.
> Devolver a transcrição inteira no começo de cada sessão é a receita de estourar o
> contexto e ficar lento — justamente o defeito que o Elias elogiou no outro ("não
> trava"). Memória que deixa o app pesado não é memória, é peso.

### Memória longa — os assuntos, entre conversas
**Esta é a parte que se escreve sozinha, e é também a garantia de privacidade.** Para
saber do que se falou, o servidor **não precisa ler a conversa**: toda ferramenta que
o globo chama já passa pelo `/api/voz` e traz o assunto em texto limpo — `ler_versiculo
{"ref":"Daniel 12:4"}`, `buscar_no_acervo {"pergunta":"a escada de Jacó"}`. **Tema e
pergunta**, que é exatamente o que foi mandado guardar, e nada além disso.

Assunto repetido não vira linha nova: vira `vezes=3`. É o que deixa o mestre dizer
*"você volta sempre nesse texto"* em vez de repetir oito linhas iguais.

### O assunto pela metade
Quando o pastor fala por cima, o Live avisa (`interrupted`) e a página manda pro
servidor **o que o mestre estava dizendo naquele instante**, marcado como cortado. Na
conversa seguinte isso encabeça a memória.

> 🔎 **Isto só ficou certo por causa da prova, e fica escrito.** Na primeira rodada o
> pendente estava **embaixo** do resumo — e o modelo, lendo o resumo primeiro,
> respondia *"o que ficou faltando?"* com o assunto **velho**. Era a ordem do texto
> ganhando da verdade. O pendente é, por construção, a coisa mais recente entre os
> dois: agora ele vem primeiro, no prompt **e** na resposta da ferramenta.

**E tem prazo: 48 horas.** Passado isso, "você ficou me devendo aquilo" deixa de ser
atenção e vira disco arranhado — o pastor já virou a página.

### A sétima ferramenta
`o_que_ja_falamos(assunto?)` — mesmo padrão das outras seis. Com assunto, procura na
memória; sem assunto, devolve de onde pararam e os últimos temas. **Quando não acha,
devolve uma ordem explícita de dizer que não lembra.** Entrou na `REGRA DE OURO` como
**LEI 7**: *não sabe de cabeça, e não LEMBRA de cabeça.*

---

## ⚠️ O que NUNCA é guardado — e como isso é máquina, não promessa

A página avisa que a conversa passa pelo Google, e a ordem foi clara: **ninguém fala
nome de membro nem segredo de aconselhamento.** Então a memória tem duas camadas,
igual à trava de citação: a IA recebe ordem escrita, e **uma peneira mecânica confere
depois**. Pedir cuidado não é trava; máquina é.

`semSegredo()` roda **antes** de qualquer gravação e, na dúvida, **joga fora**:

| o que chega | o que acontece |
|---|---|
| "o aconselhamento sobre o casamento da irmã" | 🛑 descartado inteiro |
| "ele me contou em segredo o que aconteceu" | 🛑 descartado inteiro |
| telefone, e-mail, CPF, `R$`, pix, endereço | 🛑 descartado inteiro |
| "a dívida do irmão e a briga com a esposa" | 🛑 descartado (delicado, sem texto bíblico) |
| "o divórcio dele e a depressão depois disso" | 🛑 descartado |
| "o **adultério de Davi** em 2 Samuel 11" | ✅ guardado — delicado **com** âncora bíblica é ESTUDO, não caso |
| "o irmão **Marcos** perguntou sobre a escada de Jacó" | ✅ vira "o irmão (alguém) perguntou sobre a escada de Jacó" |
| "a **Cláudia** me procurou sobre Gênesis 28" | ✅ vira "a alguém me procurou sobre Gênesis 28" |
| "o **pastor Joel** falou de **Joel 2:28**" | ✅ o nome cai, o LIVRO fica |

> 🔎 **A armadilha que a peneira me pregou, e por isso está comentada no código:**
> o `\b` do JavaScript só conhece A-Z, a-z, 0-9 e `_`. Para ele, **"ó" não é letra**.
> Com `/\b[A-Z][a-z]{2,}\b/` a palavra **"Jacó"** casava só até o "c", e a peneira
> devolvia **"alguémó"** — destruindo justamente o personagem que ela devia proteger.
> Agora é `\p{Lu}` com trava Unicode, e "Jacó" cai na lista de permitidos e passa limpo.

A **peneira `semNome()` continua passando por cima de tudo o que foi acrescentado** —
no bloco de memória que entra na instrução de sistema, no que volta da ferramenta
nova, e também **na entrada**, antes de gravar (o que entra sujo sai sujo semana que
vem, pela memória). `_provar-sem-nome.mjs`: **6/6**.

E **esquecer é direito do dono**: botão **🧠 Apagar a memória** no painel da página.
Apaga no banco, sem lixeira e sem cópia. O aviso de privacidade da página foi
reescrito: ele dizia *"o RADAR não grava nada"*, e isso deixou de ser verdade hoje.
Agora diz exatamente o que é guardado e o que nunca é.

---

## Onde guardar: Postgres, e o motivo é de segurança

A escolha era `localStorage` ou o Postgres dele. Ficou **Postgres**, por três razões,
e a primeira vale mais que as outras duas:

1. **O resumo entra na INSTRUÇÃO DE SISTEMA, e quem assina o token é o servidor.** Se
   a memória viesse do aparelho, qualquer um poderia mandar texto arbitrário e
   **escrever dentro do prompt do mestre**. Memória no aparelho é um buraco de
   injeção; memória no servidor, não.
2. O Elias testa no A22 **e** no PC. `localStorage` não atravessa aparelho.
3. Limpar o navegador apagaria a memória longa inteira, sem aviso.

**O custo no banco é desprezível, e foi medido:** uma tabela nova, `globo_memoria`,
com teto por pessoa (80 temas, resumo de 1.400 caracteres) — **~15 KB por pastor no
pior caso**. A tabela vazia com os índices ocupa **64 kB**. O banco segue onde estava,
com o freio em 1,1 GB. **Nenhuma tabela existente foi tocada.**

E **sem banco a memória simplesmente não existe** — e isso é dito, não escondido: o
globo passa a responder que não está guardando nada. Ele nunca finge.

---

## Onde ficou cada coisa

| arquivo | o que é |
|---|---|
| `api/_lib/voz-memoria.js` | **novo** — a CABEÇA: peneira do segredo, resumo rolante, bloco do prompt, a ferramenta |
| `api/_lib/globo-memoria.js` | **novo** — o ARMAZÉM (Node + pg), burro de propósito, protegido por token |
| `api/dados.js` | uma linha: `memoria` registrada no roteador |
| `api/_lib/voz.js` | lê a memória antes de assinar o token; `acao:'lembrar'`, `acao:'esquecer'`; LEI 7; `semNome()` por cima de tudo |
| `api/_lib/voz-ferramentas.js` | `o_que_ja_falamos` declarada; LEI 7 na REGRA DE OURO; `escrever` exportado |
| `public/biblioteca/voz/index.html` | a costura + **a PORTA ÚNICA das ferramentas** + rótulo por ferramenta + botão de apagar |
| `api/edge.js` | uma palavra: o `context` da Vercel passa adiante (ver os 1.729 ms, abaixo) |
| `scripts/_provar-globo-memoria.mjs` | **novo** — a peneira (19) + as 3 conversas de verdade |
| `scripts/_provar-globo-memoria-front.mjs` | **novo** — a costura do navegador, com o JS real da página (19) |

**Nenhuma função nova em `api/`** — a Vercel segue em 12/12. `api/estudo-busca.js`,
`concilio-wagner.js` e `scripts/indexar-biblioteca.mjs` **não foram tocados**.

### 🔧 A porta única, que ainda não tinha sido trocada
O `index.html` ainda mandava **toda** ferramenta pro `acao:'garimpo'`. Ou seja: as
ferramentas de ontem (`ler_versiculo`, `conferir_citacao`, `pesquisar_biblioteca`,
`buscar_no_acervo`, `versiculos_ligados`) estavam declaradas, o servidor sabia
respondê-las, e **voltavam vazias no celular** — o mestre pedia o texto exato e
recebia nada. Trocado agora, junto com a memória, e provado na bancada.

---

## As provas

| prova | resultado |
|---|---|
| `_provar-globo-memoria.mjs` — peneira + corrida + 3 conversas reais | **29/29** |
| `_provar-globo-memoria-front.mjs` — a costura, com o JS real da página | **19/19** |
| `_provar-voz-ferramentas.mjs` — as ferramentas (não quebrou nada) | **32/32** |
| `_provar-sem-nome.mjs` — o nome não volta pela memória | **6/6** |
| `_provar-tela-apagada.mjs` — o conserto do outro mago continua de pé | **20/20** |
| `node scripts/guarda.mjs` | ✅ **50 conferências** |

> 🔎 **Um susto que vale registrar:** numa rodada, 6 provas de ferramenta falharam.
> Não era o código: era a **cota diária do Cloudflare estourada** (`you have used up
> your daily free allocation of 10,000 neurons`) — `buscar_no_acervo` e
> `pesquisar_biblioteca` dependem dela pra virar pergunta em vetor. Virou o dia,
> voltou 32/32. **A memória de propósito NÃO depende do Cloudflare**: busca por
> palavra, que em 80 frases curtas por pessoa basta e é instantânea. Uma perna a
> menos pra quebrar.

---

## Dois defeitos que só apareceram MEDINDO no ar — e os dois estão consertados

Nenhum dos dois aparece na bancada. Só depois de subir e cronometrar.

### 1. O pastor esperava a memória ser gravada: **1.729 ms** por versículo
O roteador `api/edge.js` chamava `h(req)` e **engolia o `context` da Vercel** —
então o `waitUntil` não existia, e a gravação entrava no caminho da resposta.
Toda vez que o globo abria um versículo, eram **um segundo e sete décimos de
silêncio** no meio da frase.

| medido em produção | antes | depois |
|---|---|---|
| ferramenta **sem** memória | 89 ms | 89 ms |
| ferramenta **com** memória | **1.729 ms** | **68 ms** |

Conserto: passar o `context` adiante (`h(req, ctx)`), e tirar a DDL (`create
table` / `alter` / dois índices) do caminho quente — ela rodava a cada
requisição, e o globo chama isto a cada versículo.

### 2. O conserto de cima **acordou um bug escondido**: o assunto duplicava
Enquanto a gravação esperava na frente da resposta, uma de cada vez, o "não
duplica" funcionava. Quando ela saiu do caminho, cinco chamadas passaram a correr
**juntas** — e o "não duplica" era um **SELECT e depois um INSERT**. As cinco
leram *"não existe"* antes de qualquer uma escrever, e o mesmo "Salmos 23:4"
virou **três linhas** em vez de `vezes=5`. Corrida clássica, e ela só nasceu
porque o primeiro conserto funcionou.

Conserto: quem garante unicidade passa a ser **o banco**, não a ordem em que as
coisas chegam — coluna `chave_tema`, índice único parcial e um `INSERT … ON
CONFLICT DO UPDATE`, que é atômico. A migração limpa os duplicados que já
nasceram tortos antes de criar o índice. **Conferido no ar:** cinco chamadas ao
mesmo tempo → uma linha, `vezes=5`. E virou prova permanente no banco de provas.

---

## Como o Elias confere sozinho, no celular, em 30 segundos

```
https://radar-atual.vercel.app/biblioteca/voz/?prova=memoria
```

Abre, espera o quadro encher (uns 10 segundos — ele resume de verdade) e toca em
**📋 Copiar**. O quadro roda o ciclo inteiro numa chave descartável — gravar assunto →
gravar conversa → resumir → ler de volta → perguntar do que nunca se falou → apagar —
e, embaixo, mostra **a memória real dele**, só leitura, sem mexer em nada.

E a prova de verdade, a que vale: **conversar, fechar a página, e abrir de novo.**
Quando houver memória, aparece na tela a nota *"🧠 retomando de onde vocês pararam"*.

---

## O que ficou de fora, dito na cara

- **A memória de uma pessoa é lida por quem souber o WhatsApp dela.** O `/api/voz` não
  tem autenticação por pessoa — e isso **já é assim** no resto do app
  (`/api/dados?fn=pregado&user=<chave>` devolve o caderno de pregações inteiro sem
  trava nenhuma). O que eu guardo é **menos** sensível que aquilo, e passa pela
  peneira. Mas é um buraco real e existente, não um que eu abri: merece uma porta
  própria, fora deste trabalho.
- **O A22 não estava ligado no PC.** Tudo aqui foi provado na bancada e contra o banco
  de produção, como o outro mago fez. O `?prova=memoria` existe justamente pra ele
  fechar essa última milha sozinho, sem cabo.
