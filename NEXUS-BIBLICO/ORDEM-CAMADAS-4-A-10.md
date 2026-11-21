# ORDEM DO ELIAS — construir as camadas 4 a 10 sem parar (21/11/2026)

Autorização do Elias, no tablet (21/11/2026, 00:12 UTC): "pode fazer todos os módulos sem parar ou pedir permissão (...) cada módulo é uma camada que sobrepõe uma em cima da outra se completando como um todo, vou deixar o pc ligado".

## Prompt para mim mesmo (Claude)

Você está construindo as camadas do Céu Infinito do NEXUS (branch `claude/project-thread-i8qac8`, PR 46, arquivo principal `public/nexus/ceu-universo.js`). O Elias NÃO está no PC. Ele acompanha só pelo tablet.

1. **Não pare e não peça permissão.** Siga a ordem abaixo até o fim. Ao terminar uma camada, mande no thread um resumo curto (até 80 palavras) e passe para a próxima.
2. **Nada que abra janela ou pedido de aprovação no PC**: nada de instalar programa, UAC, login/OAuth, liberação de site, mudança de configuração ou permissão. Se algo travar, pule, registre aqui em "Pendências" e siga.
3. **Ordem:**
   - 4 Tempo / cronologia
   - 5 Personagens / genealogias
   - 6 Línguas originais
   - 7 História e cultura
   - 8 Manuscritos / crítica textual
   - 9 Teologia / doutrinas
   - 10 Tradição / História da Igreja
   - Por fim: interligar todas (a busca acende todas as camadas; tocar em algo mostra as ligações nas outras).
4. **Cada camada é um acetato transparente**, sobreposto e alinhado aos versículos das camadas 1–3, registrado em `registrarCamada`, com liga/desliga e barra de opacidade. Escondida não custa nada.
5. **Só dados reais, com fonte e licença**, e tudo tem informação ao tocar (ficha com versículos e fonte). Hipótese aparece como hipótese, tradição como tradição. Nada inventado para encher a tela.
6. **Não estrague o que existe**: céu ao vivo, Livros/Bíblia, Atlas-globo, legenda, Trilha, Céu v9 publicado. Teste com Playwright (sem erros de página, FPS ok) antes de cada commit.
7. **Não alterar**: banco de dados, autenticação, PIN, Biblioteca, índice patrístico, entidades, investigações salvas, integração Anthropic, outros módulos do RADAR. Ler os dados é permitido; escrever não.
8. **Commit por camada** na branch do PR 46 e push. **Nunca fazer merge nem publicar**: isso exige a frase do Elias no thread ("aprovo o merge do PR 46 do radar-atual-app").
9. Nunca usar `git checkout -- .`, `reset --hard` ou `clean`. Preservar `scripts/indexar-biblioteca.mjs` e as pastas não versionadas.
10. Todo texto ao Elias em português do Brasil.

## Andamento

- [x] 4 Tempo (commit abaixo; 501 acontecimentos, Theographic CC BY-SA)
- [x] 5 Personagens (3.066 pessoas, 1.785 ligações de família; nomes na forma da Almeida para 880)
- [x] 6 Línguas originais (16.559 lemas, 349.927 ocorrências; STEPBible CC BY)
- [x] 7 História e cultura (216 temas do Easton 1897, títulos em português)
- [x] 8 Manuscritos (5.472 versículos com diferença entre edições/manuscritos; STEPBible CC BY)
- [x] 9 Teologia (89 doutrinas do Easton + Deus e Espírito Santo; aviso de perspectiva reformada)
- [x] 10 Tradição (802 artigos de 7 documentos com textos-prova; linha do tempo de 32 documentos)
- [x] Interligação (versículo nas 10 camadas; ligações por versículos compartilhados; fios entre folhas; teste 50/50)

## Pendências

(nenhuma ainda)
