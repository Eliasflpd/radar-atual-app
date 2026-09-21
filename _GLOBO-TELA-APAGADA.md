# O globo sobrevive à tela apagada

**Arquivo mexido:** `public/biblioteca/voz/index.html` (só ele)
**Bancada nova:** `scripts/_provar-tela-apagada.mjs`
**No ar:** https://radar-atual.vercel.app/biblioteca/voz/ — versão **v160**
**Data:** 21/09/2026

---

## O buraco

O pastor põe o celular no suporte, começa a conversar, a tela apaga sozinha — e o
Android **suspende a aba**. O áudio para, o AudioContext dorme, o WebSocket cai.
Pra reviver, ele tinha que **pegar no celular dirigindo**. Perigoso, e matava a
ideia inteira: o uso principal disto é justamente o carro.

Não existe UMA chave que resolva isso. São **três defesas em camada** — nenhuma
sozinha basta, e é por isso que estão as três.

---

## 1. Wake Lock — a tela não apaga

`navigator.wakeLock.request('screen')` enquanto a conversa está ligada, solto ao
encerrar.

A pegadinha: **o navegador solta o lock sozinho toda vez que a aba sai de vista**
(uma ligação entrando, ele trocando de app no semáforo). Pedir uma vez numa
viagem de três horas não serve de nada. Então o pedido é **repetido**:

- no `visibilitychange`, quando a aba volta;
- no `release` do próprio lock;
- e pelo vigia de 1 em 1 segundo — mas **só com a aba à vista**, porque escondida
  o Android recusa, e martelar à toa só gasta bateria.

Android sem a API não é erro: `S.wakeSuporte=false`, segue a vida, e as defesas 2
e 3 seguram sozinhas.

## 2. Media Session — a aba vira TOCADOR (e o carro para de sequestrar)

Duas coisas, ambas importantes.

**(a) O Android para de congelar.** Aba escondida é congelada — *menos* a que está
tocando mídia. Então a página passa a tocar, em laço, um `<audio>` com som **de
verdade**, no volume de um fio de cabelo: amplitude **1 de 32768**, uns −90 dB.
Nenhum ouvido humano pega, nem no carro no talo.

> ⚠️ **NÃO PODE SER SILÊNCIO PURO.** Navegador que detecta faixa muda solta o foco
> de mídia e o Android volta a congelar tudo. É por isso que a amplitude é 1 e não
> 0 — está comentado no código, para ninguém apagar achando que é lixo.

O WAV é montado na hora, em memória (`wavQuaseMudo()`), 10 s em laço, 8 kHz mono.
Não entra arquivo binário nenhum no repositório.

**(b) O carro controla a conversa, e não o contrário.** Foi o pedido do Elias na
primeira conversa: *"quando conectar no bluetooth do carro precisamos de ter o
cuidado de o som do carro não pegar o controle do celular"*.

O que acontecia sem isto: ao parear, o rádio dispara um **PLAY**. Quem atende é
quem for o "tocador" do celular naquele momento — normalmente outro app de música.
Esse app toma o foco de áudio e **o globo emudece no meio da frase**.

O conserto é **tomar a sessão de mídia pra nós**. A aba vira o tocador oficial,
com cartaz próprio (título "Conversa por Voz", artista "RADAR", ícone do app), e o
botão do volante chega **aqui**. Cada botão foi escolhido para que **nenhum deles
derrube a conversa**:

| botão do volante | o que faz |
|---|---|
| ▶ play | retoma; se já estava tocando, não faz mal nenhum |
| ⏸ pause | **só** emudece e fecha o microfone. A linha com o Google **continua de pé**, o áudio de mídia **continua tocando** (senão a aba congela), e um toque no globo volta. Pausa **não** é encerrar |
| ⏹ stop | tratado como pausa, pelo mesmo motivo |
| ⏭ ⏮ ⏩ ⏪ | registrados **fazendo nada**, de propósito: assim "próxima faixa" não pula pra outro app do celular |

Pausado, o globo fica cinza-azulado com "⏸️ PAUSADO", o botão redondo vira ▶, e
nada sobe pro Google.

## 3. Sobreviver mesmo assim

Wake Lock e Media Session **reduzem**, não eliminam. Então, se ainda assim dormir:

- o vigia de 1 s religa `AudioContext` suspenso (som e microfone);
- o `visibilitychange` religa também quando a aba volta;
- se o WebSocket caiu, **reconecta sozinho** — pelo caminho **único** que já
  existia: `reconectar()`, com **geração** de conexão e **cadeado de tentativa em
  voo**. ⚠️ Nenhum atalho novo de reconexão foi criado: foi exatamente isso que já
  produziu a voz dupla uma vez;
- e quando a linha volta, **o aparelho avisa por voz: "Voltei. Pode continuar."**

O aviso por voz é `speechSynthesis` — voz **do celular**, não do Google. Não passa
pela fila de reprodução nem pela linha, então **não tem como virar voz dupla**. O
microfone fecha durante o aviso (senão o Google ouviria o "voltei" como pergunta),
e há trava de 15 s pra não virar papagaio. Só avisa quando a queda aconteceu com a
**tela apagada** — com a tela acesa a nota escrita já basta.

---

## Como conferir, no celular, sem PC e sem cabo

`https://radar-atual.vercel.app/biblioteca/voz/?prova=escuro`

1. toque no globo e comece a conversar
2. **apague a tela** pelo botão lateral e conte 60 segundos
3. acenda: o quadro embaixo já está com **antes / durante / depois**
4. **📋 Copiar** e manda

O vigia guarda uma **fita**: de segundo em segundo anota estado do contexto de
áudio, do microfone, do WebSocket, do áudio de mídia, do wake lock e se a tela
estava acesa. O número que mais importa é simples: **a fita anda 1 foto por
segundo. Se o Android tivesse congelado a aba, ela parava. Se ela não parou, a aba
não congelou.**

Também vale `?hud=1` (medidor ao vivo, agora com `som / mic / ws / mídia / wake`)
e, no console, `__VOZDIAG()`.

---

## OS NÚMEROS DO TESTE DE 60 SEGUNDOS

### ⚠️ O A22 NÃO ESTAVA LIGADO NO PC

Procurei o aparelho de quatro jeitos e **não achei**:

```
adb devices                                    -> lista vazia
adb kill-server + start-server + 3 tentativas  -> lista vazia
USB do Windows, procurando Samsung (VID_04E8)  -> nenhum aparelho Samsung presente
adb connect pela rede (172.16.100.15:5555)     -> sem resposta
```

Então **o teste dos 60 segundos no A22 não foi feito**. Não vou dizer que foi.
Assim que o aparelho estiver no cabo, ele sai em dois minutos — ou o próprio Elias
tira em trinta segundos com `?prova=escuro`, que foi feito pra isso.

### O que FOI medido: a bancada, com o JS real da página

`node scripts/_provar-tela-apagada.mjs`

Não é simulação do nosso código: a bancada **arranca o `<script>` de dentro de
`public/biblioteca/voz/index.html`** — o mesmo arquivo que vai pro ar — e roda num
Android de mentira (AudioContext, WebSocket, wakeLock, mediaSession, `<audio>` e
microfone falsos). Aí faz o Android se comportar como ele se comporta de verdade
quando a tela apaga: esconde a aba, **solta o wake lock**, **suspende os dois
AudioContexts** (o relógio do áudio congela) e **derruba o WebSocket com 1006**.
E conta **60 segundos de relógio de verdade**.

| momento | ctx SOM | ctx MIC | WebSocket | áudio de mídia |
|---|---|---|---|---|
| **ANTES** (tela acesa) | `running` | `running` | **1 (aberto)** | tocando |
| **DURANTE** (no escuro) | `running` | `running` | **1 (aberto)** | tocando |
| **DEPOIS** (tela acesa) | `running` | `running` | **1 (aberto)** | tocando |

```
fotos tiradas no escuro : 59  (esperado 60, 1 por segundo)  -> a aba NÃO congelou
o relógio do som andou  : 60,2 s
contextos religados     : som 1x · mic 1x (pelo vigia, sozinho, no escuro)
WebSockets criados      : 2  ·  PICO DE LINHAS VIVAS: 1     -> voz dupla: zero
wake lock               : 3 pedidos · 1 negado (aba escondida, como é de esperar)
avisos por voz          : ["Voltei. Pode continuar."]        -> 1, exatamente 1
```

**20 de 20 conferências passaram:**

```
✅  1. wake lock pedido ao ligar
✅  2. áudio de mídia tocando em laço
✅  3. controle do carro armado (play/pause/stop/faixas) — 8 botões tomados do carro
✅  4. o carro vê a aba como TOCANDO
✅  5. o carro vê o cartaz do RADAR
✅  6. linha aberta
✅  7. a aba NÃO congelou (a fita continuou correndo) — 59/60 fotos
✅  8. o áudio de mídia nunca parou
✅  9. os contextos de áudio voltaram sozinhos, no escuro
✅ 10. a linha reconectou sozinha
✅ 11. NUNCA houve duas linhas vivas (voz dupla) — pico 1
✅ 12. avisou "voltei" por voz, uma vez só
✅ 13. wake lock repedido quando a aba voltou
✅ 14. pausa do volante NÃO derruba a linha
✅ 15. pausado, nada sobe pro Google
✅ 16. pausado, o áudio de mídia continua (senão a aba congela)
✅ 17. o carro vê "pausado"
✅ 18. play do volante retoma
✅ 19. ao encerrar, solta a sessão de mídia (o carro volta a mandar no que é dele)
✅ 20. ao encerrar, nenhuma linha fica viva
```

Saída inteira guardada em `_provas-voz/tela-apagada-60s.txt`.

### O que a bancada NÃO prova (honestidade)

A bancada prova a **nossa lógica**: que o wake lock é repedido, que o canal de
mídia fica de pé, que o contexto religa, que a reconexão é uma só e que o "voltei"
sai. O que ela **não** prova é o **comportamento do Android de verdade** — se o
Chrome do A22 vai de fato deixar a aba viva por causa do áudio de mídia, e se o
rádio do carro dele vai de fato mandar os comandos no nosso tocador. Isso só o
aparelho responde, e é por isso que `?prova=escuro` existe.

---

## O que mais mudou de tabela

| antes | agora |
|---|---|
| wake lock pedido, mas sem nenhuma forma de saber se foi conquistado | `?prova=escuro` e `?hud=1` mostram wake, mídia, som, mic e ws |
| sem Media Session: o rádio do carro mandava em outro app | a aba é o tocador oficial, com cartaz do RADAR |
| aba escondida = congelada em menos de 1 min | áudio quase mudo em laço mantém a aba viva como mídia |
| caiu no escuro e voltou: só uma nota escrita que ele não vê dirigindo | o aparelho fala "Voltei. Pode continuar." |
| toque no globo com a conversa de pé = encerrar | pausado pelo volante, o toque no globo **retoma** |
| o vigia media só o áudio | o vigia guarda a **fita** com 6 estados por segundo |

## O que NÃO foi tocado

- a fila de reprodução, o corte com fade, o porteiro de microfone do viva-voz e o
  barge-in local — o motor de áudio consertado hoje ficou inteiro
  (`_CONSERTO-VOZ-AUDIO.md`);
- `api/_lib/voz.js` e `api/_lib/voz-ferramentas.js` — são de outro mago;
- a geração de conexão e o cadeado de tentativa: **usados**, não substituídos.

## Publicação

- `public/index.html` e `public/sw.js` subiram juntos para **v160** (5 refs + 1).
- `node scripts/guarda.mjs` → **50 conferências, PODE PUBLICAR**.
- Depois de publicar, **abra duas vezes**: o service worker serve do cache na
  primeira.
