# "Pérolas Descoberta" (ex-Estudos MARIA) no RADAR — andamento (2026-10-09)

> Nome final do módulo, escolhido pelo Elias: **Pérolas Descoberta**. Pasta:
> `public/biblioteca/perolas-descoberta/`. Os slugs internos (estudos-maria, _estudos-maria-trabalho)
> continuam, só o nome visível e a URL mudaram.

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
- Leitura SÓ TEXTO (pedido do Elias em 09/10: "nunca pedi pdf, só textos, siga a paleta
  da EBD"). Nada de imagem de página. O leitor usa as classes/cores da lição da EBD
  (`public/ebd/adulto4/html/licao-01.html`): .titulo, .sec-head, .roman-head, .subpoint,
  .box-aureo, .bref (referência clicável → versículo do /biblia.json).
- Parábolas = UM estudo (o PDF "Simplificado" tem as 40 parábolas em 4 módulos; os 4 PDFs
  ilustrados são o mesmo conteúdo). Jesus no AT 1-5, Curiosidades e 12 Apóstolos vêm do
  OCR por palavra (qualidade boa nos parágrafos, títulos às vezes "Página N").
- `SALMOS EXPLICADOS - BÔNUS1.pdf` é cópia idêntica do BÔNUS → ignorado.
- O PDF "Simplificado" das Parábolas tem 3 títulos "Contexto —" defeituosos NO ORIGINAL;
  reconstruídos em `build-texto.mjs` (CONSERTOS), com […] onde o texto se perdeu.

## Feito (commit local "Estudos MARIA: módulo novo…", ainda NÃO enviado ao GitHub)
- [x] texto.json conferido: parabolas-texto (40 parábolas), escatologia-70-semanas (96 seções),
      salmos-explicados (150 salmos + introdução), jesus-at-1 e curiosidades-biblia (OCR).
- [x] páginas re-encodadas (760px/q70) + capas para os 11 estudos ilustrados (329 arquivos, 41 MB).
- [x] `public/biblioteca/estudos-maria/index.html` pronto e TESTADO no navegador local
      (estante com capas, modo páginas, modo texto, índice, busca) com uma senha de teste.
- [x] card "Estudos MARIA" no hub da Biblioteca (`public/assets/app.js`, renderManuais).
- [x] SW subiu para `radar-v207`.
- [x] `scripts/estudos-maria/cifrar.mjs` + ferramentas em `scripts/estudos-maria/ferramentas/`.
- [x] OCR (texto de apoio) pronto para todos os ilustrados com texto: jesus-at-1..5 e
      curiosidades (9 estudos com texto.json; os 4 módulos ilustrados das Parábolas usam o
      "texto completo" como irmão de texto; 12 Apóstolos é só o infográfico).
- [ ] Commit do Pr. Wagner ficou pendente (bloqueio de permissão na minha sessão): os
      arquivos estão alterados no working tree; basta `git add -A api/_lib scripts _PERFIL-WAGNER-2026-10-09.md && git commit`.

## Falta (passos do Elias)
1. No terminal, dentro de `D:\radar-atual-app`:
   `node scripts/estudos-maria/cifrar.mjs`  → digita a senha do Meu Estudo (2x).
   Isso APAGA os dados de teste e gera `dados/*.enc` + `manifest.json` com a senha dele.
2. `git add public/biblioteca/estudos-maria && git commit -m "Estudos MARIA: dados cifrados" && git push`
   (Vercel publica sozinho; no celular, abrir Biblioteca → Estudos MARIA).

## Pr. Wagner (tarefa paralela)
Agente ajustou `api/_lib/concilio-wagner.js`, `wagner-corpus.js`, `scripts/gerar-corpus-wagner.mjs`
e `scripts/_teste-wagner.mjs` (backups em `_BACKUP/*.20261009-1155`); relatório em
`_PERFIL-WAGNER-2026-10-09.md`. Conferir `git diff api/_lib` antes de commitar.
