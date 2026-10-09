# Estudos MARIA no RADAR — andamento (2026-10-09)

Pedido do Elias: colocar os 15 PDFs de `D:\MEUS ESTUDOS\MARIA` na Biblioteca do app,
num módulo só pra eles, com leitura otimizada, "como todos os meus estudos" (= trancado
com senha, igual ao Meu Estudo, porque é material comprado com aviso de direitos autorais).

## Decisões
- Código-fonte de verdade: este clone (`D:\radar-atual-app`, master = site no ar). Backup
  feito antes de qualquer mudança: `D:\BACKUP\radar-atual-app-ANTES-MARIA-2026-10-09.zip`
  e tag git `antes-estudos-maria-2026-10-09`.
- Módulo novo: `public/biblioteca/estudos-maria/` (index.html + manifest.json + dados/*.enc).
  Conteúdo cifrado AES-256-GCM com a senha do Elias (um salt por módulo, no manifest).
  Formato: ver `scripts/estudos-maria/cifrar.mjs`.
- Pasta `_estudos-maria-trabalho/` (gitignored) = conteúdo ABERTO gerado dos PDFs:
  `<slug>/texto.json` (capítulos → blocos h/p/q/s), `<slug>/paginas/pNNN.jpg` (760px),
  `<slug>/capa.jpg`, `manifest-fonte.json` (lista/títulos/séries), `_ocr/*.json` (OCR bruto).
- Leitura: estudos ilustrados (Parábolas 1-4, Jesus no AT 1-5, Curiosidades, 12 Apóstolos)
  abrem em modo PÁGINAS (imagens originais) com modo TEXTO (OCR) de apoio; estudos de
  texto (70 Semanas, Salmos, Parábolas texto completo) só em modo TEXTO.
- Arquivos `SALMOS EXPLICADOS - BÔNUS1.pdf` é cópia idêntica do BÔNUS → ignorado.
- O PDF "Simplificado" das Parábolas tem 3 títulos "Contexto —" defeituosos NO ORIGINAL;
  reconstruídos em `build-texto.mjs` (CONSERTOS), com […] onde o texto se perdeu.

## Feito
- [x] texto.json pronto e conferido: parabolas-texto (40 parábolas), escatologia-70-semanas
      (96 seções), salmos-explicados (150 salmos + introdução).
- [x] páginas re-encodadas (760px/q70, ~38 MB) + capas para os 11 estudos ilustrados.
- [x] OCR por linha (`_ocr/doc4.json`, `doc6.json`); OCR por PALAVRA (`w*.json`) estava
      rodando em segundo plano no scratchpad (pode não ter terminado — refaça com
      `node ocr3.mjs <pasta-imagens> <saida.json>` a partir das imagens 2x; se as imagens
      do scratchpad sumiram, gere de novo com `render2.mjs <idx> <pasta> all 2.0`).
- [x] `scripts/estudos-maria/cifrar.mjs` (pede a senha no terminal, gera dados/*.enc + manifest.json).
- [x] ferramentas copiadas para `scripts/estudos-maria/ferramentas/` (precisam de `npm install` lá).

## Falta
1. `build-ocr.mjs`: usar `w*.json` (palavras com confiança) e descartar palavras com conf < 60
   para limpar o texto dos ilustrados; gerar texto.json de jesus-at-1..5 e curiosidades-biblia.
2. Escrever `public/biblioteca/estudos-maria/index.html` (modelo: `biblioteca/estudo/index.html`):
   cadeado reaproveitando `localStorage.estudo_pass`, derivar chave UMA vez (PBKDF2 iter/salt
   do manifest, decifrar `dados/prova.enc` = "RADAR-ESTUDOS-MARIA-OK"), estante por série com
   capa (blob da capa.enc) e barra de progresso, leitor com modo Páginas (imagens decifradas
   sob demanda, IntersectionObserver) e modo Texto (capítulos, índice, buscar, copiar, A−/A+,
   retomar onde parou em `localStorage.maria_pos_<slug>`).
3. Card "Estudos MARIA" 🗂️ em `renderManuais()` (`public/assets/app.js` ~linha 3262) e
   subir a versão do SW (`public/sw.js`, V='radar-v207').
4. Elias roda `node scripts/estudos-maria/cifrar.mjs` (digita a senha), confere no celular,
   depois `git add public/biblioteca/estudos-maria public/assets/app.js public/sw.js scripts/estudos-maria .gitignore`
   + commit + push (Vercel publica sozinho).

## Pr. Wagner (tarefa paralela)
Um agente estava analisando as transcrições e ajustando `api/_lib/concilio-wagner.js` /
`wagner-corpus.js`; relatório em `_PERFIL-WAGNER-2026-10-09.md` (backups em `_BACKUP/`).
Conferir o diff com `git diff api/_lib` antes de commitar.
