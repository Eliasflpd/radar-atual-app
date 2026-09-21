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

---

# A tela do globo (v156–v158)

**No ar:** versão **v158**

## O que mudou

| antes | agora |
|---|---|
| selo, título, subtítulo com nome de pessoa, aviso grande e seletor de voz na abertura | só o globo, a barra de escrever e "← Início" discreto |
| "Dr. Wagner Cordeiro" e "Concílio dos Expositores" no topo, nas bolhas, no texto copiado e no título da aba | **nome nenhum** em lugar nenhum |
| fundo branco | azul-marinho profundo + dourado, zero roxo |
| a página rolava e o globo subia | página travada em `100dvh`, o globo fica de frente e **cresce** (48vh → 54vh) |
| só falar | falar **ou escrever** |

## Os três defeitos da tela

**1. "o globo continua subindo, e o texto passando".**
Havia um `window.scrollTo(0, document.body.scrollHeight)` rodando a cada pedaço
de transcrição. Era ele. Foi removido: a página não rola mais (`100dvh` +
`overflow:hidden`) e quem rola é só a caixa da transcrição, com teto de 22vh.

**2. O aviso atrapalhava o globo.**
Virou balão flutuante (`position:fixed`), 3 linhas, que entra 0,9 s depois sem
empurrar nada. No X: `.remove()` de verdade — sai do DOM, não sobra camada
invisível — e grava no `localStorage`. Nas próximas aberturas **nem chega a ser
criado**. O texto completo continua no ⚙️. Atalho `?aviso=1` para reler.

**3. O balão podia nascer invisível.** *(achado durante o teste)*
Ele nasce em `opacity:0` e só aparece ao ganhar a classe `.entrou`, que era
adicionada por `requestAnimationFrame`. **rAF não roda com a aba escondida.**
Tela apagando no carro, notificação por cima ou protetor de tela entrando no
meio do carregamento e o aviso ficaria invisível para sempre — presente no DOM,
mudo. Aconteceu exatamente isso no A22 durante o teste. Agora um `setTimeout`
de 60 ms acende junto com o rAF.

## Escrever, além de falar

Campo de texto com botão redondo que muda de cara: escreveu → **enviar**,
conversa de pé → **parar**, parado → **microfone**. Escrever **não pede
microfone**: a linha sobe surda (`clientContent`) e ele liga o mic quando
quiser. Pergunta escrita antes do aperto de mão terminar fica guardada e vai no
`setupComplete`.

## O globo em 3D

Atmosfera que respira no volume, luz fora do centro, escurecimento de borda
(*limb darkening*), contraluz dourada no lado oposto à luz e reflexo especular.
A malha de paralelos e meridianos gira, e a largura dos meridianos muda com o
giro — é isso que dá esfera rodando em vez de desenho parado. A pulsação
continua vindo do **volume real** do áudio, não de animação em laço.

## O que foi provado no A22, e o que não foi

Provado no aparelho, servindo o **mesmo arquivo** por `adb reverse`:
abertura só com o globo · balão flutuando sem empurrar nada · X → tela limpa ·
recarregar → balão não voltou · ⚙️ com modo, vozes, copiar/encerrar e o aviso
completo.

**Não provado:** o globo grande durante uma conversa de verdade no ar. O A22
entrou em protetor de tela e depois travou na tela de bloqueio, que pede a senha
do Elias — não dá para destravar daqui. Assim que ele destravar o aparelho, esse
print sai em um minuto.

---

# v159 — texto embolado, e o nome que voltou por baixo

## 1. Texto embolado na transcrição — CONSERTADO

**O defeito:** com a resposta na tela, o rótulo "RESPOSTA", a dica do viva-voz e
o texto da resposta ficavam um por cima do outro.

**A causa:** `.palco` era `flex:1 1 auto` (base **auto**) e o globo tinha altura
fixa em `vh` com `flex:0 0 auto`. Enquanto a tela era só o globo, coube. Quando
a transcrição apareceu, o palco encolheu — **e o canvas não**. O globo
transbordou o palco, que não tinha `overflow`, e `#estado`/`#dica` foram
desenhados por cima das bolhas.

**O conserto:** `.palco{flex:1 1 0}` — base **zero**, então a altura dele é
puramente a sobra da tela, sem depender do conteúdo. O JS mede essa sobra,
desconta o que estado e dica ocupam, e dimensiona o globo para o que restar.
Resposta longa faz a caixa crescer até o teto dela (30vh) e **o globo cede o
espaço em vez de atropelar**. Mais `overflow:hidden` no palco como última linha
de defesa, e a dica do viva-voz encurtada para uma linha.

**Prova:** `?prova=tela` enche a tela com resposta longa, mede as caixas de
verdade com `getBoundingClientRect` e acusa qualquer sobreposição entre globo,
estado, dica, transcrição e barra. Tem que dar **0**.

## 2. O nome no prompt — NÃO CONSERTADO (é de outro dono)

O nome saiu da interface, mas continua no **prompt do servidor**. Ele mora em
dois arquivos, e **nenhum dos dois é meu**:

### `api/_lib/voz.js` — o outro mago está nele
| linha | o que diz hoje | trocar por |
|---|---|---|
| 78-79 | `"pelo método do Dr. Wagner Cordeiro..."` | `"pelo método consagrado..."` |
| 131 | `material real do Dr. Wagner (Caderno de Pérolas...)` | `material de estudo (Caderno de Pérolas...)` |
| 133 | `afirmar que "o Dr. Wagner ensina" qualquer coisa` | `afirmar que "o material ensina" qualquer coisa` |
| 137 | `...e não o material dele.` | `...e não o material.` |

### `api/_lib/concilio-wagner.js` — ⚠️ COMPARTILHADO, **não limpe na origem**
O `SISTEMA` do globo é `METODO + ...`, e `METODO` vem daqui (linha 188). Mas
este arquivo também serve o **Concílio de texto**, onde o nome é legítimo e
deve continuar. Limpar aqui quebraria o Concílio.

Com nome: linha 188 (`MÉTODO do Dr. Wagner Cordeiro (Instituto Teológico GIOM)`),
190 (`Não escreva "eu, Wagner"`), 257 (`"o Wagner ensina que…"`), e os rótulos
do garimpo — 84 (`Caderno de Pérolas do Dr. Wagner`) e 88 (`Aula do Dr. Wagner
Cordeiro — Instituto GIOM`). **Os rótulos são o mais importante:** eles voltam
dentro do resultado da ferramenta, então o modelo LÊ o nome mesmo com o prompt
limpo — foi daí que saiu o "não encontrei uma aula específica do Dr. Wagner".

### A correção recomendada, toda contida em `voz.js`
```js
// O globo não é personagem de ninguém: FAZ o método, mas não se apresenta
// citando professor por nome. O /api/concilio-wagner continua com o nome — lá
// é o Concílio, e lá o nome é legítimo. Por isso a limpeza é AQUI.
const semNome = (t) => String(t || '')
  .replace(/o\s+MÉTODO\s+do\s+Dr\.?\s*Wagner\s+Cordeiro\s*\(Instituto\s+Teológico\s+GIOM\)/gi,
           'o MÉTODO do garimpo de tipologias')
  .replace(/Você NÃO finge ser ele\. Não escreva "eu, Wagner"\./gi,
           'Você não finge ser ninguém. Não assuma a identidade de nenhum professor.')
  .replace(/Caderno de Pérolas do Dr\.?\s*Wagner/gi, 'Caderno de Pérolas')
  .replace(/Aula do Dr\.?\s*Wagner Cordeiro\s*—\s*Instituto GIOM/gi, 'Aula do material de estudo')
  .replace(/material real do Dr\.?\s*Wagner/gi, 'material de estudo')
  .replace(/"o (Dr\.?\s*)?Wagner ensina( que…)?"/gi, '"o material ensina$2"')
  .replace(/não o material dele/gi, 'não o material')
  .replace(/Dr\.?\s*Wagner\s+Cordeiro/gi, 'o material de estudo')
  .replace(/Dr\.?\s*Wagner/gi, 'o material de estudo')
  .replace(/Instituto\s+(Teológico\s+)?GIOM/gi, 'o instituto');

const SISTEMA = semNome(
  METODO + '\n\n' + MENTE + '\n\n' + FALA + '\n\n' + REGRA_DE_OURO + '\n\n' + PORTEIRO
  + '\n\n════ SEM NOME PRÓPRIO ════\n'
  + 'Nunca cite professor, autor vivo ou instituição por nome ao se explicar, e '
  + 'nunca fale de si na terceira pessoa de outro. Se não achar o assunto, diga '
  + 'apenas: "não encontrei isso no material". Nada de "a aula do fulano" nem '
  + '"o material dele".'
);
```
E no garimpo (≈ linha 439), passar o resultado pela mesma peneira antes de
devolver ao navegador — é por ali que o nome entrava:
```js
const ctx = assunto ? buscarContexto(assunto, 4500) : { texto: '', fontes: [] };
ctx.texto  = semNome(ctx.texto);
ctx.fontes = (ctx.fontes || []).map(semNome);
```
O método, o rigor e o crivo continuam inteiros. Muda só que o globo deixa de
ser personagem de alguém.
