# Conserto do motor de áudio do globo de voz

**Arquivo mexido:** `public/biblioteca/voz/index.html` (só ele)
**No ar:** https://radar-atual.vercel.app/biblioteca/voz/ — versão **v155**
**Medido em:** Samsung A22 (Android 10), aparelho real, 21/09/2026

---

## Os três defeitos, e o que causava cada um

### 1. "às vezes fala duas vezes ao mesmo tempo" — a voz dupla

Não era o áudio. Eram **duas conexões vivas com o Google ao mesmo tempo**.

`reconectar()` era chamado de quatro lugares diferentes — a queda da linha, o erro
ao conectar, a aba voltando à tela, e o sinal de internet voltando — e **nenhum
deles olhava se já havia uma conexão aberta ou uma tentativa em andamento**.

No carro isso acontece o tempo todo: ao sair de um túnel, o evento `online`
disparava uma conexão nova por cima de uma que estava viva e saudável. A variável
`S.ws` passava a apontar para a nova, mas **a antiga continuava com o `onmessage`
grudado** — e continuava despejando a fala dela na mesma fila de reprodução. Duas
respostas diferentes, montadas uma por cima da outra.

Havia mais duas portas para o mesmo defeito:

- **Dois toques rápidos no globo subiam duas sessões inteiras.** A trava era
  `cv.disabled = true`, mas `<canvas>` não tem `disabled` — não travava nada.
  Resultado: dois microfones, dois contextos de áudio e duas linhas.
- **A leitura do socket não garantia ordem.** As mensagens do Google chegam como
  `Blob`, e o código fazia `await blob.text()`. Esse `await` não preserva a ordem
  entre mensagens: o aviso de `interrupted` podia ser processado **depois** do
  áudio que ele deveria cancelar — e aí a fala velha seguia saindo por baixo da nova.

**O que mudou:** cada conexão recebe um número de **geração**, e só a geração
atual é ouvida — mensagem de linha aposentada não entra. Um cadeado
(`S.conectando`) impede duas tentativas em voo. O `online` só reconecta se a linha
estiver realmente morta. `ligar()` ganhou trava de reentrada. E a leitura virou
**síncrona** (`binaryType = 'arraybuffer'` + `TextDecoder`), sem `await` no caminho.

### 2. "tá travando" — engasgo e congelamento no meio da fala

Duas causas somadas.

**A armadilha do viva-voz (a principal, e a que explica o carro).** O cancelamento
de eco do navegador não dá conta quando o som sai pelo Web Audio no alto-falante do
celular. O microfone ouve o próprio mestre falando; o detector de fala do Google
entende "alguém começou a falar"; e como o servidor está em
`START_OF_ACTIVITY_INTERRUPTS`, **ele interrompe a si mesmo**. Visto de fora é
exatamente isto: o globo trava no meio da frase.

**O agendamento apertado.** Cada pedacinho que chegava virava uma fonte de áudio
solta, empurrada para a frente com **30 ms** de gordura. Qualquer soluço de rede
estourava a margem. E não havia ninguém religando o contexto de áudio quando o
Android o suspendia (tela apagando, ligação entrando).

**O que mudou:**

- **Porteiro de microfone meio-duplex no viva-voz** — o microfone fecha enquanto o
  mestre fala, então não há eco para ele se cortar sozinho. Com fone ou Bluetooth
  detectado, libera **full-duplex** e ele volta a poder cortar falando por cima.
  Na dúvida fica no meio-duplex (esperar é melhor que travar). Tem **barge-in
  local**: se ele falar alto e seguido por 250 ms, o motor cala o mestre por conta
  própria e reabre a porta. E tem um **botão 🔈/🎧** na barra para ele mandar na mão
  quando a detecção do Android não ajudar — a escolha fica guardada.
- **A fila de reprodução passou a seguir a receita do Google**: blocos de **7680**
  amostras, **0,1 s** de gordura inicial, agendamento só **0,2 s** à frente, e a
  linha que garante que duas notas nunca se sobrepõem —
  `inicio = Math.max(proximoSom, ctx.currentTime)`.
- `latencyHint:'playback'` no contexto de saída; entrada e saída em contextos
  separados (16 kHz sobe, 24 kHz desce); AudioWorklet na captura (já havia).
- **Um vigia de 1 em 1 segundo** que religa contexto suspenso, reacende a fila
  parada, reconecta linha morta e solta porteiro preso.

### 3. Cortar o globo no meio não limpava direito

O corte antigo parava as fontes e zerava o relógio, mas **cortava seco** (estalo) e
não tinha como jogar fora o que já estava entregue ao hardware sem deixar rastro.
O `desligar()` fechava os contextos de áudio **antes** de o último naco terminar.

**O que mudou:** o corte emudece com **fade de 100 ms** num nó de ganho que é
**descartado** (o áudio seguinte nasce num canal limpo, sem pegar carona na rampa
que vai para zero), joga fora a fila inteira, mata as fontes já agendadas e **zera
o relógio**. O `desligar()` segue a mesma ordem — som, linha, microfone — e só
fecha o contexto de saída **depois** do fade terminar.

---

## Os números medidos

### No A22, motor real, Web Audio real (`?prova=1`)

A página se testa sozinha: despeja 8 segundos de áudio pela **mesma fila de
reprodução de verdade**, corta três vezes no meio, e olha **50 vezes por segundo**
quantas fontes estão soando.

| medida | resultado | tem que ser |
|---|---|---|
| **pico de fontes soando ao mesmo tempo** | **1** | 1 |
| **pares sobrepostos** | **0** | 0 |
| pior sobreposição | **0,000 ms** | 0 |
| **engasgos na fala corrida** | **0** | 0 |
| maior buraco na fala | **0,0 ms** | — |
| fontes agendadas / medições ao vivo | 24 / **496** | — |
| cortes executados | 3 | — |
| remendos do relógio | 0 | — |
| fila presa no fim / sobra presa | 0 / 0 | 0 |
| retomada depois de corte | 2 (máx. 527 ms) | silêncio correto |

**É esta a prova de que a voz dupla morreu: em 496 medições ao vivo, nunca houve
2 fontes tocando ao mesmo tempo.** A retomada de até 527 ms depois de um corte não
é defeito — é o silêncio certo: ele mandou calar.

Na conversa de verdade ligada no aparelho, o medidor de tela (`?hud=1`) mostrou
**linhas 1 (pico 1)** — uma única conexão viva com o Google, que era a raiz do
defeito nº 1.

### Na bancada (Node, o JS real da página num Web Audio de mentira)

Cenário com 59 fontes, 6 cortes e 2 túneis de rede:

| medida | ANTES | AGORA |
|---|---|---|
| pico de fontes simultâneas | — | **1** |
| pares sobrepostos | — | **0** |
| engasgos em fala contínua | 0 | **0** |
| fontes de áudio criadas (mesma fala de 8 s) | 40 | **25** (1,6x menos trabalho no A22) |
| gordura inicial | 30 ms | **100 ms** |
| áudio aceito de conexão aposentada | (aceitava) | **0 amostras** |

Honestidade sobre a comparação: com a rede entregando bem, o agendador antigo
também não abria buraco — o engasgo dele aparecia na **starvation** e no
**eco do viva-voz**, não no caso fácil. Os ganhos que a bancada mede de forma
limpa são: 1,6x menos fontes de áudio criadas, agendamento limitado a 0,2 s à
frente, e **zero** áudio aceito de linha aposentada.

---

## Como conferir de novo

- `https://radar-atual.vercel.app/biblioteca/voz/?prova=1` → toca no botão e o
  aparelho mede sozinho, com veredito na tela.
- `https://radar-atual.vercel.app/biblioteca/voz/?hud=1` → medidor ao vivo durante
  a conversa (fontes audíveis, pico, fila, linhas vivas, cortes, modo).
- Depois de publicar, **abra duas vezes**: o service worker serve do cache na
  primeira.
