# O Owens inteiro entrou — e dois arquivos eram repetição

**21/09/2026** · `biblioteca_trechos`, banco de produção · fonte `owens`, peso 2

Antes: **215 trechos** (só Gênesis 1–9).
Agora: **2.137 versículos**, em **10 livros** — Gênesis, Êxodo, Levítico, Números,
Deuteronômio, Josué, Rute, 1 Samuel, 1 Reis e 2 Reis.

O banco foi de **1.074 MB para 1.081 MB**. O Owens custou **7 MB**. O freio de mão
estava armado em 1.100 MB e **não chegou perto** de disparar.

---

## ⚠️ O que eu achei ANTES de carregar (e por que não carreguei 2.589)

O aviso era pra não confundir os dois arquivos de nome parecido. O problema era maior
que isso: **não são dois arquivos diferentes — são o mesmo material, três vezes.**

Conferi versículo por versículo, comparando o texto hebraico:

| arquivo | versículos | o que é de verdade |
|---|---|---|
| `Analytical Key to the Old Testament.docx` | 215 | Gênesis 1:1–9:9 |
| `Analytical Key to the Old Testamen1.docx` | 430 | **o MESMO Gênesis 1:1–9:9, colado duas vezes dentro do próprio arquivo** |

Os 430 do segundo arquivo são **215 únicos, repetidos**. E esses 215 batem
**palavra por palavra, 215/215 idênticos**, com os do primeiro arquivo — que já estava
no banco desde hoje de manhã. Ou seja: naquele arquivo de 430 **não havia um versículo
novo sequer**. Sem trava, Gênesis 1–9 entraria **três vezes** no banco de produção.

Tem um segundo encontro do mesmo tipo: o `1&2 SAMUEL.docx` **começa no meio de Rute** —
os 22 primeiros versículos dele são Rute 4:1–4:22, e conferi que são **idênticos** aos
que já vêm no `Ruth.docx` (que traz o livro de Rute completo, 85 versículos).

Fecha a conta: **2.589 blocos lidos = 2.137 únicos + 430 repetidos + 22 de Rute.**
Os 2.589 estavam certos; só que 452 deles eram o mesmo material de novo.

### A trava que ficou no script

Pus a dedução no próprio carregador (`scripts/indexar-biblioteca.mjs`, `pedacosOwens`):
**um versículo só entra uma vez**, quem chega primeiro fica. Isso não é só economia de
espaço — versículo repetido faz a busca devolver o mesmo trecho três vezes e **empurra
pra fora as outras fontes** que o globo ia citar junto. Como as exportações do Logos se
sobrepõem por natureza, a trava serve pra todas as próximas também. Ela avisa na tela
quantos pulou.

---

## 🔎 O que os arquivos cobrem de verdade

Cada arquivo é uma exportação **parcial** — traz os primeiros capítulos do livro, não o
livro inteiro. Só Rute está completo.

| livro | versículos | vai de | até |
|---|---|---|---|
| Números | 281 | 1:1 | 7:35 |
| Levítico | 263 | 1:1 | 11:29 |
| 1 Reis | 247 | 1:1 | 7:39 |
| Deuteronômio | 233 | 1:1 | 7:14 |
| 2 Reis | 230 | 1:1 | 9:7 |
| Gênesis | 215 | 1:1 | 9:9 |
| Êxodo | 204 | 1:1 | 8:22 |
| Josué | 195 | 1:1 | 9:9 |
| 1 Samuel | 184 | 1:1 | 9:5 |
| **Rute** | **85** | 1:1 | 4:22 — **livro completo** |

### Dois buracos que valem um aviso

- **2 Samuel não existe nesses arquivos.** O arquivo se chama `1&2 SAMUEL.docx`, mas
  dentro dele só tem 1 Samuel (e o pedaço de Rute). Não há um único versículo de 2 Samuel.
- **Juízes não foi exportado.** Não há arquivo de Juízes na pasta.

Então a cobertura não é "Gênesis até 2 Reis" corrido: é **o começo de 10 livros**, com
Juízes e 2 Samuel de fora. Quando o Logos exportar esses dois, é só jogar o `.docx` na
pasta e rodar de novo — o resto não é refeito.

*(O arquivo `~$...` de trava do Word não estava na pasta nesta rodada; de todo jeito o
carregador já ignora qualquer nome que comece com `~$`.)*

---

## ✅ A prova: perguntei de livro que só entrou agora

Busca de verdade, pela mesma consulta que o `pesquisar_biblioteca` usa em produção
(vetor `bge-m3` + ordem de autoridade por peso), contra o banco de produção.

**Pergunta:** *"qual a palavra hebraica de 1 Samuel 1:11, na oração de Ana, o voto que
ela fez ao SENHOR dos Exércitos"*

> **1º lugar — John Joseph Owens (Analytical Key) · 1 Samuel 1:11 · peso 2**
> A palavra é **נֶדֶר** (*néder*), "voto", no par `vatidor néder` — literalmente
> *"e ela votou um voto"*.

**Pergunta:** *"qual a palavra hebraica de Rute 1:16, quando Rute diz a Noemi aonde quer
que tu fores eu irei"*

> **1º lugar — John Joseph Owens (Analytical Key) · Rute 1:16 · peso 2**
> A palavra é **עָזַב** (*azáv*), "abandonar, deixar", no `le'ozvêch` —
> *"para te deixar"*. É o verbo do "não me instes que te deixe".

Nos dois casos o **versículo exato** veio em primeiro lugar, com o nome da obra colado.
Antes de hoje essas duas perguntas não tinham resposta nenhuma na biblioteca: 1 Samuel e
Rute simplesmente não estavam lá.

---

## 🛡️ O que eu NÃO toquei

Mexi só na `biblioteca_trechos`, e dentro dela só nas linhas `fonte='owens'` (o carregador
apaga e regrava essa fonte, por isso não duplicou nada). Conferi as tabelas do app depois
da carga — todas iguais ao que estavam:

| tabela | linhas | |
|---|---|---|
| `versiculo_emb_voyage` | 31.104 | o motor de ligações que está no ar |
| `versiculo_emb_voyage4` | 5.100 | |
| `estudo_trechos` | 54.343 | |
| `kittel_verbetes` | 850 | |
| `radar_cadastros` | 22 | o cadastro dos irmãos |

`biblioteca_trechos` fechou em **71.344 trechos, 16 fontes** (era 69.422: saíram os 215
antigos do Owens, entraram os 2.137).

### O embutidor e o rodízio

Uma das três contas do Cloudflare já estava com a cota do dia estourada (`429`) e o
rodízio passou sozinho pra próxima, sem perder lote. Os 2.137 versículos foram embutidos
em **20 segundos**. Não precisei do Cohere, e não encostei no Voyage.

---

## 🔒 De brinde: a trava pegou chave exposta na raiz

Rodando `node scripts/guarda.mjs` antes de fechar, ela **barrou a publicação** por uma
coisa que não tinha nada a ver com o Owens: dois arquivos soltos na raiz do repositório —
`.env.dev2` e `.env.radar` — com **chave da Groq, chave do Google e senha de Postgres
dentro**, e **fora do `.gitignore`**. Não estavam no git ainda, mas um `git add -A`
distraído publicaria os três segredos **num repositório que é público**.

Pus os dois no `.gitignore`, junto com um `.env*` que fecha a porta pra qualquer `.env`
novo que apareça amanhã. Conferi antes: **nenhum `.env` é rastreado pelo git**, então a
regra larga não quebra nada.

Depois disso: **`node scripts/guarda.mjs` ✅ 50 conferências, "PODE PUBLICAR"**.

---

## Onde ficou cada coisa

| arquivo | o que mudou |
|---|---|
| `scripts/indexar-biblioteca.mjs` | trava de versículo repetido em `pedacosOwens`, com o achado escrito no comentário |
| `.gitignore` | `.env.dev2`, `.env.radar` e `.env*` — segredo não vai pro repositório público |
| `D:\RADAR-BIBLIOTECA\owens.idx.json` / `.vec.bin` | cache refeito: 2.137 trechos (fora do repositório, de propósito) |

Nada de texto do Owens entrou no repositório — o hebraico mora só no Postgres dele, e
o que aparece aqui em cima é uma palavra citada com a fonte, que é o que o globo fala
em voz alta.

**Comandos, pra repetir quando chegar Juízes e 2 Samuel:**

```
node scripts/indexar-biblioteca.mjs owens
node scripts/indexar-biblioteca.mjs --subir owens
```
