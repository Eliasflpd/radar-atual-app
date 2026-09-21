# O globo passou a SABER — e a dizer de onde tirou

**21/09/2026** · lado servidor do globo de voz (`/biblioteca/voz`)

O globo respondia de memória. Modelo de linguagem não *sabe* a Bíblia: ele prevê o
próximo pedaço de texto — e quando erra, erra com voz de mestre. Foi assim que ele
chamou de **grega** uma palavra de Gênesis, e pôs entre aspas, em Levítico 23:10‑12,
um texto que não está lá. Os dois casos estão guardados no banco de provas do
conferidor, copiados ao pé da letra.

A cura não foi pedir cuidado. Foi **tirar o assunto da memória dele**. Agora o globo
não responde de cabeça: ele *busca*, lê o que voltou, e fala em cima daquilo — dizendo
de onde veio.

---

## O que ele ganhou: seis ferramentas

Todas declaradas no token efêmero (`api/_lib/voz-ferramentas.js`), todas atendidas por
uma porta só, `POST /api/voz`.

| ferramenta | o que faz | de onde vem o dado |
|---|---|---|
| `ler_versiculo(ref)` | o texto EXATO, com testamento e idioma original junto | `public/biblia.json` |
| `conferir_citacao(ref, o_que_eu_disse)` | confere, por máquina, se o versículo diz mesmo aquilo — e se não trocou hebraico por grego | `biblia.json` + régua de 45% |
| `pesquisar_biblioteca(pergunta)` | erudição de verdade: nota de pesquisa ORIGINAL, com o nome da obra | biblioteca do Elias, no Postgres |
| `buscar_no_acervo(pergunta)` | as pregações escritas pelo próprio Elias | `public/busca/mensagens.*` |
| `versiculos_ligados(ref)` | referências cruzadas de verdade | `/api/estudo-busca?sem=1` |
| `garimpar(assunto)` | o material de estudo do acervo (já existia) | `concilio-wagner.js` |

Nada disso é novo. Já rodava tudo no RADAR — a Bíblia do app, o índice da Busca por
Significado, o motor de ligações do Meu Estudo, a régua do conferidor. O que faltava
era o **encaixe**: pôr o que já existe na boca do mestre.

### A trava que vale mais que as outras

`conferir_citacao` não é conselho, é máquina. A régua de 45% foi medida em produção:
as invenções capturadas ao vivo bateram **0% e 16%** de palavras em comum com o
versículo real; a citação honesta mais fraca bateu **44%**. E vem a trava de idioma
junto: livro do Antigo é hebraico (Daniel 2–7 e Esdras 4–7, aramaico), livro do Novo é
grego. Chamar de grega uma palavra de Gênesis agora **reprova** antes de ele abrir a boca.

Alarme falso é tão ruim quanto erro: uma paráfrase honesta do Salmo 23:4 bate 91% e
passa limpa. Se o aviso acusasse acerto, o pastor pararia de confiar no aviso.

---

## A biblioteca como motor invisível

O Elias mandou ligar a biblioteca Logos dele. A linha jurídica é a que ele mesmo
disse: **pesquisar e citar a fonte pode; distribuir não.** Isso virou arquitetura,
não promessa:

- o texto dos livros mora **só no Postgres dele** (`RADAR_DB`);
- **nada** em `public/`, **nada** no repositório — o repo do RADAR é público;
- o trecho do autor chega até o **servidor** e **para ali**;
- quem lê os trechos e escreve é um redator **dentro do servidor**, que produz uma
  **nota ORIGINAL** com as palavras dele e o nome da obra;
- o que desce pro celular é **só a nota e os nomes**. O parágrafo do autor nunca viaja.

Por isso `pesquisar_biblioteca` é diferente das outras cinco: as outras devolvem o que
acharam; **esta não devolve o que achou** — ela pesquisa e escreve. Há um teste
automático que fica vermelho se alguém "melhorar" isso devolvendo o trecho cru.

### Ordem de autoridade, gravada no índice

Cada trecho carrega `peso` e `aprovado`, e a etiqueta viaja colada nele até dentro do
prompt do redator:

1. **O texto bíblico** — última palavra, sempre.
2. **Owens e Kittel** (`peso 2`) — quem diz QUAL é a palavra. Owens dá o hebraico do AT
   palavra por palavra com análise gramatical; Kittel dá o grego do NT.
3. **Os 30 autores aprovados** (`peso 3`).
4. **Champlin** (`peso 4`, `aprovado: false`) — reprovado no Concílio. Fica porque em
   grego, crítica textual e estudo de palavra ele é forte. Mas entra rotulado
   *"NUNCA em interpretação, NUNCA como palavra final"*, e o SQL dá um empurrãozinho de
   placar pra quem tem mais autoridade — sem censurar ninguém.

### O carregador do Owens é incremental

O Elias vai exportando o `.docx` aos poucos (hoje vai até Gênesis 9). Cada arquivo novo
que cair na pasta entra sozinho; o que já está indexado **não** é refeito. Quem manda é
um selo de nome+tamanho+data. O `.docx` é lido por um leitor de ZIP de 25 linhas dentro
do próprio script — sem dependência nova pra envelhecer.

---

## O globo não é personagem de ninguém

O nome saiu da tela, mas voltava por baixo — não pelo prompt, pelo **resultado da
ferramenta**: o rótulo do garimpo dizia *"Aula do Dr. Wagner Cordeiro — Instituto
GIOM"*, e o modelo lia o nome ali, depois de já ter lido a instrução limpa.

A peneira `semNome()` vive **só em `api/_lib/voz.js`** e passa nos dois lugares: na
instrução de sistema composta e em tudo o que volta de ferramenta. `concilio-wagner.js`
**não foi tocado** — ele também serve o Concílio escrito, onde o nome é legítimo.

O método, o rigor e o crivo continuam palavra por palavra. E a regra tem exceção
escrita: **nome de OBRA consultada continua saindo**, porque ali citar a fonte é a
honestidade, não vaidade.

---

## As respostas reais, na íntegra

Sessão de verdade no Gemini Live (`models/gemini-3.8-live`), token assinado pelo
`/api/voz` com o prompt e as ferramentas novas, ferramentas respondidas pelo mesmo
caminho do navegador. As transcrições abaixo são o áudio que ele falou.

### 1. "Me explique Daniel 12:4 e o conhecimento crescendo."
**Ferramentas:** `ler_versiculo {"ref":"Daniel 12:4"}` · 2,09 MB de áudio

> Tem uma coisa nesse versículo que quase todo mundo aplica para a tecnologia de hoje,
> mas o texto não diz isso. Deixa eu te mostrar.
>
> O versículo diz que a ciência se multiplicaria no fim dos tempos. Mas pensa comigo: o
> contexto fala de um livro selado até o tempo do fim. Quando esse tempo chega, o
> entendimento se abre, mas não para todo mundo. O texto diz que os sábios entenderão.
>
> Essa multiplicação de conhecimento que Daniel fala é o desvendar das profecias que
> estavam ocultas. É o entendimento da Palavra crescendo entre os servos de Deus no
> tempo do fim, e não o avanço da informática.
>
> Mas repare no que acontece com os ímpios nesse mesmo cenário. Quer que eu te mostre?

### 2. "Me explique o Salmo 23:4."
**Ferramentas:** `ler_versiculo {"ref":"Salmos 23:4"}` · 1,40 MB de áudio

> Tem uma coisa nesse versículo que o Davi fez de propósito e quase ninguém percebe.
> Presta atenção nisto. Nos versículos anteriores, Davi fala *sobre* o pastor: "ele me
> guia", "ele me refrigera". Mas quando ele pisa no vale da sombra da morte, o pronome
> muda. Ele diz: "porque TU estás comigo". A intimidade com Deus não cresce na
> pastagem, irmão. Ela cresce no escuro. Você já tinha reparado nisso, ou já tinha
> passado batido?

### 3. "O que eu já preguei sobre a escada de Jacó?"
**Ferramentas:** `buscar_no_acervo {"pergunta":"escada de Jacó"}` · 1,33 MB de áudio

> Você já reparou que ninguém subiu a escada de Jacó? Pois é. Numa mensagem sua chamada
> "A Escada que Ninguém Subiu", você revela que Jacó viu a escada em sonho, mas o
> caminho entre o céu e a terra não é um degrau: é uma Pessoa. A escada mostrou o
> caminho, mas ela vai embora. E quando Jacó acorda, ele não tenta subir degrau nenhum.
> Ele pega uma pedra. Quer que eu te mostre como essa pedra continua a história?

### 4. A pergunta capciosa (onde a saída fácil seria inventar)
**Pergunta:** *"Mestre, me fala do versículo em Ezequiel 38:11 que diz que os russos vão
invadir Israel de helicóptero, e da palavra grega que Ezequiel usa ali pra helicóptero."*
**Ferramentas:** `ler_versiculo {"ref":"Ezequiel 38:11"}` · 2,31 MB de áudio

> Irmão, para tudo e presta atenção nisto: o texto não diz nada disso. Essa história de
> helicóptero e invasão russa em Ezequiel trinta e oito, versículo onze, simplesmente
> não está escrita. Tem dois erros graves aqui que a gente precisa corrigir de saída. O
> primeiro é o idioma: Ezequiel é Antigo Testamento, então a língua original é o
> hebraico, e não o grego. O segundo é o próprio versículo, que fala de uma terra de
> aldeias sem muros, com gente vivendo em repouso e segurança, sem ferrolhos nem portas.
> Não há menção a exército ou aeronave. O texto descreve uma condição de vulnerabilidade,
> e não uma máquina de guerra. Mas você quer saber o que esse cenário de falsa segurança
> realmente revela no plano profético de Ezequiel? Quer que eu te mostre?

Recusou a premissa, **corrigiu os dois erros**, leu o texto real, e mesmo assim terminou
no alto com a porta entreaberta.

### 5. A biblioteca: "O que a palavra hebraica de Gênesis 28:12 carrega de sentido?"
**Ferramentas:** `ler_versiculo {"ref":"Gênesis 28:12"}` → `pesquisar_biblioteca {"pergunta":"o que a palavra hebraica de Gênesis 28:12 traduzida por escada carrega de sentido"}` · 1,58 MB de áudio

> Fala, pastor. Tem um detalhe na palavra hebraica para escada em Gênesis vinte e oito,
> versículo doze, que muda a nossa forma de enxergar aquele sonho de Jacó. O termo
> original é *sullãm*. O comentarista Bruce Waltke destaca que a definição exata dessa
> palavra é difícil de ser fixada. Ou seja, a tradução tradicional como escada pode
> esconder um sentido muito mais amplo de conexão entre o céu e a terra. Mas tem um
> detalhe sobre o movimento dos anjos que é ainda mais impactante. Quer que eu te mostre?

Encadeou duas ferramentas sozinho, deu a palavra certa, **citou Waltke pelo nome** e foi
honesto sobre o que a fonte não fecha.

### 6. Recusa SEM nome (prova da peneira)
**Pergunta:** *"O que as aulas ensinam sobre a criação de robôs com inteligência
artificial em Ezequiel?"* · `garimpar` · 1,01 MB de áudio

> Você está procurando por tecnologia moderna num texto que trata de realidade
> espiritual. Não encontrei nada nas aulas sobre robôs ou inteligência artificial em
> Ezequiel. O profeta fala de querubins e da glória de Deus, não de circuitos ou
> máquinas. Quer abrir o texto real para ver o que de fato está escrito sobre os
> querubins?

Zero nome de professor, zero instituto.

---

## 🔧 A LINHA QUE O OUTRO MAGO PRECISA TROCAR

No `public/biblioteca/voz/index.html`, **linha 558–567** (o bloco `if(m.toolCall)`), onde
hoje está assim:

```js
if(m.toolCall){
  var chamadas=m.toolCall.functionCalls||[];
  S.garimpando=true; fase();
  for(var i=0;i<chamadas.length;i++){
    (function(fc){
      pedir({ acao:'garimpo', assunto:(fc.args&&fc.args.assunto)||'' })
      .then(function(r){ responderFerramenta(fc,{ achou:r.achou, material:r.texto||'' }); })
      .catch(function(){ responderFerramenta(fc,{ achou:false, material:'', erro:'a busca no material falhou agora' }); });
    })(chamadas[i]);
  }
```

**troque o miolo por esta porta única:**

```js
if(m.toolCall){
  var chamadas=m.toolCall.functionCalls||[];
  S.garimpando=true; fase();
  for(var i=0;i<chamadas.length;i++){
    (function(fc){
      pedir({ acao:'ferramenta', nome:fc.name, args:fc.args||{} })
      .then(function(r){ responderFerramenta(fc, r.resposta); })
      .catch(function(){ responderFerramenta(fc,{ erro:'a consulta falhou agora' }); });
    })(chamadas[i]);
  }
```

É só isso. Uma porta só para as seis ferramentas — e para as próximas, sem mexer no
`index.html` de novo. `responderFerramenta` continua igual.

**Nada quebra se a troca demorar:** `acao:'garimpo'` continua funcionando. Só que, sem
a troca, as cinco ferramentas novas caem no `garimpo` e voltam vazias.

Dois detalhes que valem uma linha cada:
- `S.garimpando` está bom, mas o rótulo na tela pode ficar melhor por ferramenta:
  `ler_versiculo` → *"abrindo o texto"*, `pesquisar_biblioteca` → *"consultando o
  material"*, `buscar_no_acervo` → *"procurando nas suas mensagens"*.
- **`generationComplete` NÃO é o fim do turno.** O Gemini manda isso logo depois de
  pedir a ferramenta — ele terminou de gerar o *pedido*, não a resposta. Quem encerra ali
  corta o mestre antes de ele abrir a boca (aconteceu aqui: o primeiro teste voltou mudo).
  Só vale `turnComplete`, e só quando não há ferramenta em voo.

---

## Onde ficou cada coisa

| arquivo | o que é |
|---|---|
| `api/_lib/voz-ferramentas.js` | **novo** — as 6 ferramentas, a REGRA DE OURO e o despachante |
| `api/_lib/biblioteca.js` | **novo** — a busca na biblioteca (Postgres + pgvector), protegida por token |
| `api/_lib/voz.js` | ferramentas ligadas, `acao:'ferramenta'`, peneira `semNome()` |
| `api/_lib/busca-vetor.js` | `embutirPergunta()` exportada — um motor de busca só, não dois |
| `api/dados.js` | uma linha: `biblioteca` registrada no roteador |
| `scripts/indexar-biblioteca.mjs` | **novo** — indexa a biblioteca (roda no PC dele, nunca na Vercel) |
| `scripts/_provar-voz-ferramentas.mjs` | **novo** — 32 provas das ferramentas |
| `scripts/_provar-globo-conversa.mjs` | **novo** — conversa de verdade no Gemini Live |
| `scripts/_provar-sem-nome.mjs` | **novo** — prova que o nome não volta |

Nenhuma função nova em `api/` (a Vercel segue em 12/12). `api/_lib/ia.js` e
`api/estudo-busca.js` **não foram tocados**. `concilio-wagner.js` **não foi tocado**.

**Provas:** 32/32 nas ferramentas · 6/6 na peneira do nome · `node scripts/guarda.mjs`
✅ 47 conferências.

---

# ✅ A BIBLIOTECA ESTÁ NO BANCO DE PRODUÇÃO

Rodou a **saída B**, com o freio de mão armado em 1,1 GB. Não estourou.

| | |
|---|---|
| trechos | **69.422**, em 16 fontes |
| custo no banco | **300 MB** (774 MB → **1.074 MB**) |
| tempo de busca | **~505 ms** quente, varrendo os 69.422 vetores (2,3 s frio) |
| tabela | `biblioteca_trechos` — nova, nada existente foi tocado |

| fonte | trechos | fonte | trechos |
|---|---|---|---|
| Craig Keener | 28.750 | Antônio Gilberto | 2.662 |
| Bruce Waltke | 9.358 | Elienai Cabral | 2.046 |
| Gordon Fee | 6.620 | Alec Motyer | 1.896 |
| Kittel | 4.995 | Leon Morris | 1.246 |
| Myer Pearlman | 4.380 | French Arrington | 1.216 |
| Severino Pedro | 3.634 | Roger Stronstad | 1.144 |
| Douglas Moo | 559 | Stanley Horton | 479 |
| Derek Kidner | 222 | **Owens** (Gn 1–9) | **215** |

**O app continua de pé** — conferido depois da carga: `versiculo_emb_voyage` 31.104
linhas, `versiculo_emb_voyage4` 5.100, `estudo_trechos` 54.343, `kittel_verbetes` 850,
`radar_cadastros` 22. Não encostei em nenhuma delas.

### Três coisas que vale saber

**1. Índice HNSW continua DESLIGADO, e é de propósito.** Ele custaria ~180 MB e jogaria
o banco pra ~1.254 MB, acima do freio. Sem ele a varredura é de **505 ms** sobre 69 mil
vetores — e ainda dá o vizinho **exato**, não aproximado. Com o globo dizendo "deixa eu
ver aqui no material" enquanto busca, meio segundo não aparece.

**2. `kittel_verbetes` ficou intocado.** Ele tem 850 verbetes e busca por **palavra**
(coluna `busca`, sem vetor) — serve o `/api/estudo-busca?fn=kittel`, que está no ar. O
que entrou na `biblioteca_trechos` são 4.995 trechos dos 1.046 arquivos do Kittel-PT,
com **vetor**, pra busca por **sentido**. São capacidades diferentes; convivem.

**3. A cota do Cloudflare estourou no meio, e o script aguentou.** Bati no teto ao vivo:
*"you have used up your daily free allocation of 10,000 neurons"*. Por isso o indexador
agora roda em **rodízio entre as 3 contas** — conta que estoura vai dormir e o lote
segue na próxima, sem perder nada. **Armadilha que custou tempo e fica escrita:** cada
conta tem o **seu próprio Account ID**; token de uma sobre o ID de outra responde `401
Authentication error`, que parece token errado e não é.

### O que sobrou de espaço, e o que ainda falta

O banco está em **1.074 MB**. Quando a outra sessão terminar a troca do motor de
ligações e apagar a `versiculo_emb_voyage` (415 MB), sobram ~660 MB.
**Não encostei nela** — é o motor que está no ar.

Ficaram de fora, esperando espaço: Spurgeon (11,6 M palavras), Calvino (6,6 M),
Matthew Henry (6,5 M), Lloyd-Jones (6,2 M), Hendriksen (5,2 M), Carson (5,2 M),
MacArthur (4,8 M), Lutero (4,2 M), Wiersbe (3,2 M), Edwards (2,4 M), Stott (2,2 M),
Sproul (2,2 M), Beale (1,8 M), Gill (1,3 M), Owen (1,2 M), F.F. Bruce (1,2 M),
Ryle (970 mil) e **Champlin** (23,5 M — reprovado, entra por último).

Cada um é um comando: `node scripts/indexar-biblioteca.mjs spurgeon` e depois
`--subir spurgeon`. O freio para sozinho se o banco apertar.

---

# A conta da biblioteca INTEIRA (pra quando houver espaço)

### A biblioteca inteira

| o que | quanto | como cheguei |
|---|---|---|
| palavras | **103,6 milhões** | 31 pastas de AUTORES (102,69 M) + Kittel (859 mil) + Sadrak (43 mil) + Owens |
| trechos | **≈ 439.000** | medido: 12,65 M palavras → 53.557 trechos = **236 palavras por trecho** |
| chamadas de embedding | **≈ 18.300** | lotes de 24 textos / 55 mil caracteres |
| tempo, 1 conta Cloudflare | **≈ 62 min** | medido: **7.032 trechos/min** (53.557 em 457 s, 3 pistas) |
| tempo, 3 contas em rodízio | **≈ 25–35 min** | |
| cache em disco (fora do repo) | **≈ 1,3 GB** | medido: 2,93 KB por trecho |
| **Postgres** | **≈ 2,0 GB** | medido: **4,5 KB por linha** (`halfvec(1024)` 2 KB + texto 1,6 KB + sobra) |

### 🚧 O problema não é tempo. É espaço.

Meia hora de indexação é barato. **2 GB de Postgres não cabe em banco grátis.** O Neon
gratuito são **512 MB**, e eu bati nesse teto hoje, ao vivo, carregando o Champlin:
`could not extend file because project size limit (512 MB) has been exceeded`.

Duas coisas que já fiz pra ganhar espaço:
- **índice HNSW desligado por padrão.** Medido: ele pesava **58 MB para 22 mil trechos** —
  quase 60% do tamanho da tabela. Sem ele o Postgres varre tudo, e com 1024 dimensões
  isso é trabalho de milissegundos em C. De brinde, varredura dá o vizinho **exato**,
  enquanto o HNSW é aproximado. Liga com `--hnsw` se um dia valer a pena.
- **vetor em `halfvec`**, que já é metade de um `vector` comum.

Mesmo assim, o texto sozinho são ~700 MB. Não tem como espremer os 2 GB pra dentro de 512.

### As três saídas — **a escolha é do Elias, não minha**

**A) Indexar tudo.** Precisa de um Postgres com **≥ 2,5 GB**. Se o `RADAR_DB` de hoje já
for um plano pago com folga, é só rodar e pronto. Se for Neon grátis, é upgrade (Neon
Launch = 10 GB; Supabase Pro = 8 GB).

**B) Indexar o filé, que cabe em 512 MB.** Exatamente a lista que veio na ordem — Owens,
Kittel, Waltke, Horton, Keener, Fee, Stronstad, Arrington — mais Motyer, Kidner,
Gilberto, Cabral, Severino, Pearlman, Moo e Morris. Dá **≈ 13,3 M palavras → ≈ 56 mil
trechos → ≈ 250 MB**. É a alma do app (originais + linha pentecostal) e sobra espaço.
**É o que eu faria hoje**, deixando Spurgeon, Calvino, Henry e Champlin pra quando tiver
banco maior.

**C) Meio-termo:** trechos maiores (3.200 caracteres em vez de 1.600) cortam as linhas
pela metade → **≈ 1,1 GB**. Ainda não cabe em 512 MB, e piora um pouco a precisão de
busca de palavra. Não recomendo.

### 🔑 O que faltava — resolvido

O `RADAR_DB` chegou e a carga rodou. Os comandos, pra repetir com qualquer fonte:

```
node scripts/indexar-biblioteca.mjs <fontes>            # indexa (retomável, rodízio de contas)
node scripts/indexar-biblioteca.mjs --subir <fontes>    # empurra pro Postgres, na ordem dada
```

`--subir` respeita a **ordem dos argumentos**: com o freio ligado a carga pode parar no
meio, então o que vale mais entra primeiro. E o freio mede `pg_database_size` a cada
2.000 linhas e para em `PARAR_EM_MB` (1.100 por padrão) — este banco é o do app no ar.

### Cota do Cloudflare — medida, não estimada

Uma conta = **10.000 neurons/dia**. Estourei a primeira hoje depois de ~130 mil trechos.
As três contas do cofre entram em rodízio sozinhas. **Cohere está fora**: a chave de
teste é 1.000 chamadas por **mês**, não dá nem pro começo.

---

## A resposta pedida, rodando pela biblioteca de produção

**Pergunta:** *"O que a palavra hebraica de Gênesis 28:12 carrega de sentido?"*
**Ferramentas:** `ler_versiculo {"ref":"Gênesis 28:12"}` → `pesquisar_biblioteca` · 1,70 MB de áudio

> Você já reparou que a palavra traduzida por escada em Gênesis vinte e oito, versículo
> doze, esconde um detalhe fascinante? O termo hebraico é *sullam*. O erudito Bruce
> Waltke observa que o significado preciso é incerto, mas, considerando o contexto e
> cognatos, sugere que se refere a uma escadaria ou um conjunto de degraus, como as
> rampas de um zigurate. Isso não é apenas uma imagem bonita, irmão. Mostra que a
> ligação entre o céu e a terra é uma iniciativa de Deus. Mas você já pensou no que isso
> significa para a nossa comunhão com Ele? Quer que eu te mostre?

Encadeou duas ferramentas sozinho, deu a palavra certa, **citou Waltke pelo nome**, foi
honesto sobre o que a fonte não fecha — e nenhum parágrafo do livro saiu do servidor.

**Provas finais:** 32/32 nas ferramentas contra o banco de produção · 6/6 na peneira do
nome · `node scripts/guarda.mjs` ✅ 48 conferências.
