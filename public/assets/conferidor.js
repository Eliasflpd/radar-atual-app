/* ══════════════════════════════════════════════════════════════════════════════
   CONFERIDOR — a trava "não empurra besteira", mecânica, sem IA.
   ------------------------------------------------------------------------------
   POR QUE ESTE ARQUIVO EXISTE

   O Elias é pastor. O que sai destas telas ele lê NO PÚLPITO, de pé, com a
   igreja de Bíblia aberta na mão. Uma besteira aqui não é bug: é vexame.

   Pedir honestidade à IA não resolve — já foi tentado no prompt e voltou errado.
   Então a regra é outra: NÃO PEDE, CONFERE. Depois que a resposta chega, a
   página abre a Bíblia de verdade (/biblia.json, Almeida — a mesma do app) e
   confronta o que a IA afirmou.

   DUAS PORTAS DE MENTIRA, DUAS TRAVAS

   1) VERSÍCULO ENTRE ASPAS QUE NÃO DIZ AQUILO
      Achado em produção: a Sala do Concílio escreveu
        Levítico 23:10-12 – "tomar a primeira porção do maná … e oferecê-la ao
        Senhor, como oferta movida, sobre o altar do Senhor"
      Levítico 23:10-12 fala de MOLHO DAS PRIMÍCIAS e de um CORDEIRO. Não tem
      maná nenhum ali. O pastor lê isso no culto e a igreja não acha na Bíblia.
      A trava compara palavra por palavra e, quando não bate, MOSTRA O QUE A
      REFERÊNCIA DIZ DE VERDADE.

   2) IDIOMA ERRADO NO ORIGINAL
      Achado em produção: a resposta afirmou que "criou", em Gênesis 1:1, é o
      grego ποιεῖν. Gênesis é hebraico — a palavra é bará (ברא). Afirmar grego
      num texto do Antigo Testamento é erro grosseiro; destrói a autoridade.
      A trava é aritmética de testamento, não teologia:
        Antigo Testamento  → hebraico/aramaico
        Novo Testamento    → grego
      Palavra em alfabeto grego colada num texto do AT = erro. E vice-versa.

   A LEI DO FALSO ALARME
   Acusar um acerto é tão ruim quanto deixar passar um erro — o pastor para de
   confiar no aviso e aí ele não serve pra nada. Por isso a trava CALA A BOCA
   sempre que a leitura for ambígua:
     • frase com referência do AT e do NT ao mesmo tempo → cala
     • frase que nomeia os DOIS idiomas ("do hebraico X e do grego Y") → cala
     • parágrafo que fala de Septuaginta / LXX / tradução grega → cala
       (a LXX é o AT EM GREGO de verdade — citar grego ali é correto)
     • grego colado em texto do NT → cala (é o certo)
     • letra hebraica perto de texto do NT com cheiro de aramaico, citação do
       AT ou transliteração → cala (Jesus falou aramaico: "talitá cumi",
       "Eli, Eli, lemá sabactâni" — isso é legítimo no NT)
   Quando não dá pra ter certeza, não inventa aviso.

   COMO USAR NUMA PÁGINA
     <script src="/assets/conferidor.js"></script>
     RadarConferidor.aquecer();                  // baixa a Bíblia em segundo plano
     RadarConferidor.caixa(texto, elemento);     // devolve Promise; injeta o aviso
     RadarConferidor.analisar(texto);            // devolve Promise com o laudo cru

   CUSTO: zero no tempo de resposta. A resposta é pintada primeiro; a conferência
   roda depois, sobre o texto já na tela. O download da Bíblia (≈4 MB, ~1 MB
   comprimido) começa assim que o usuário envia a pergunta e fica em cache do
   navegador — na segunda pergunta já está pronto.
   ══════════════════════════════════════════════════════════════════════════════ */
(function (janela) {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────────────
     1) OS LIVROS — apelido, nome bonito e a que testamento pertencem
     ───────────────────────────────────────────────────────────────────────── */
  var MAP = {
    genesis:'gn',gn:'gn',exodo:'ex',ex:'ex',levitico:'lv',lv:'lv',numeros:'nm',nm:'nm',
    deuteronomio:'dt',dt:'dt',josue:'js',js:'js',juizes:'jz',jz:'jz',rute:'rt',rt:'rt',
    '1samuel':'1sm','1sm':'1sm','2samuel':'2sm','2sm':'2sm','1reis':'1rs','1rs':'1rs',
    '2reis':'2rs','2rs':'2rs','1cronicas':'1cr','1cr':'1cr','2cronicas':'2cr','2cr':'2cr',
    esdras:'ed',ed:'ed',neemias:'ne',ne:'ne',ester:'et',et:'et',
    salmos:'sl',salmo:'sl',sl:'sl',sal:'sl',proverbios:'pv',pv:'pv',prov:'pv',
    eclesiastes:'ec',ec:'ec',cantares:'ct',canticos:'ct',ct:'ct',isaias:'is',is:'is',
    jeremias:'jr',jr:'jr',lamentacoes:'lm',lm:'lm',ezequiel:'ez',ez:'ez',daniel:'dn',dn:'dn',
    oseias:'os',os:'os',joel:'jl',jl:'jl',amos:'am',am:'am',obadias:'ob',ob:'ob',
    jonas:'jn',jn:'jn',miqueias:'mq',mq:'mq',naum:'na',na:'na',habacuque:'hc',hc:'hc',
    sofonias:'sf',sf:'sf',ageu:'ag',ag:'ag',zacarias:'zc',zc:'zc',malaquias:'ml',ml:'ml',
    mateus:'mt',mt:'mt',marcos:'mc',mc:'mc',lucas:'lc',lc:'lc',joao:'jo',
    atos:'atos',at:'atos',romanos:'rm',rm:'rm',
    '1corintios':'1co','1co':'1co','1cor':'1co','2corintios':'2co','2co':'2co','2cor':'2co',
    galatas:'gl',gl:'gl',efesios:'ef',ef:'ef',filipenses:'fp',fp:'fp',fil:'fp',
    colossenses:'cl',cl:'cl','1tessalonicenses':'1ts','1ts':'1ts','2tessalonicenses':'2ts','2ts':'2ts',
    '1timoteo':'1tm','1tm':'1tm','2timoteo':'2tm','2tm':'2tm',tito:'tt',tt:'tt',
    filemom:'fm',fm:'fm',hebreus:'hb',hb:'hb',heb:'hb',tiago:'tg',tg:'tg',
    '1pedro':'1pe','1pe':'1pe','2pedro':'2pe','2pe':'2pe','1joao':'1jo','1jo':'1jo',
    '2joao':'2jo','2jo':'2jo','3joao':'3jo','3jo':'3jo',judas:'jd',jd:'jd',apocalipse:'ap',ap:'ap'
  };
  var NOMES = {
    gn:'Gênesis',ex:'Êxodo',lv:'Levítico',nm:'Números',dt:'Deuteronômio',js:'Josué',jz:'Juízes',
    rt:'Rute','1sm':'1 Samuel','2sm':'2 Samuel','1rs':'1 Reis','2rs':'2 Reis','1cr':'1 Crônicas',
    '2cr':'2 Crônicas',ed:'Esdras',ne:'Neemias',et:'Ester','jó':'Jó',sl:'Salmos',pv:'Provérbios',
    ec:'Eclesiastes',ct:'Cantares',is:'Isaías',jr:'Jeremias',lm:'Lamentações',ez:'Ezequiel',
    dn:'Daniel',os:'Oseias',jl:'Joel',am:'Amós',ob:'Obadias',jn:'Jonas',mq:'Miqueias',na:'Naum',
    hc:'Habacuque',sf:'Sofonias',ag:'Ageu',zc:'Zacarias',ml:'Malaquias',mt:'Mateus',mc:'Marcos',
    lc:'Lucas',jo:'João',atos:'Atos',rm:'Romanos','1co':'1 Coríntios','2co':'2 Coríntios',
    gl:'Gálatas',ef:'Efésios',fp:'Filipenses',cl:'Colossenses','1ts':'1 Tessalonicenses',
    '2ts':'2 Tessalonicenses','1tm':'1 Timóteo','2tm':'2 Timóteo',tt:'Tito',fm:'Filemom',
    hb:'Hebreus',tg:'Tiago','1pe':'1 Pedro','2pe':'2 Pedro','1jo':'1 João','2jo':'2 João',
    '3jo':'3 João',jd:'Judas',ap:'Apocalipse'
  };
  // os 39 do Antigo; o resto é Novo. É daqui que sai a trava de idioma.
  var ANTIGO = {};
  'gn ex lv nm dt js jz rt 1sm 2sm 1rs 2rs 1cr 2cr ed ne et jó sl pv ec ct is jr lm ez dn os jl am ob jn mq na hc sf ag zc ml'
    .split(' ').forEach(function (a) { ANTIGO[a] = 1; });
  function testamento(ab) { return ANTIGO[ab] ? 'AT' : 'NT'; }

  /* ─────────────────────────────────────────────────────────────────────────
     2) A BÍBLIA DE VERDADE
     ───────────────────────────────────────────────────────────────────────── */
  var BIB = null, IDX = null, baixando = null;
  function aquecer() {
    if (BIB) return Promise.resolve(true);
    if (baixando) return baixando;
    baixando = fetch('/biblia.json')
      .then(function (r) { return r.text(); })
      .then(function (t) {
        BIB = JSON.parse(t.replace(/^﻿/, ''));
        IDX = {}; BIB.forEach(function (b, i) { IDX[b.abbrev] = i; });
        return true;
      })
      .catch(function () { baixando = null; return false; });   // sem Bíblia, a página segue de pé
    return baixando;
  }

  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.\s]/g, ''); }
  function pal(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(function (w) { return w.length >= 4; });
  }
  function versos(ab, c, v, v2) {
    var bi = IDX ? IDX[ab] : null; if (bi == null) return null;
    var ch = BIB[bi].chapters[c - 1]; if (!ch) return null;
    var i = v ? +v : 1, f = v2 ? +v2 : (v ? +v : ch.length);
    if (i < 1 || i > ch.length) return null;
    if (f > ch.length) f = ch.length;
    return ch.slice(i - 1, f).join(' ');
  }
  // "Jo" no Brasil é João; "Jó" é o livro de Jó. Sem acento, tenta João e cai pra Jó.
  function resolver(livroBruto) {
    var k = norm(livroBruto);
    if (k === 'jo') return /ó/i.test(livroBruto) ? ['jó', 'jo'] : ['jo', 'jó'];
    var ab = MAP[k];
    return ab ? [ab] : null;
  }

  var RE_REF = /([123])?\s*([A-Za-zÀ-ÿçÇ]{2,20})\.?\s*(\d{1,3})(?::(\d{1,3})(?:\s*[-–—‑]\s*(\d{1,3}))?)?/;
  // "Livro 12:34" ou "Livro 12:34-36" — a forma com capítulo E versículo, que é a que a IA usa
  var RE_REF_G = /([123])?\s*([A-Za-zÀ-ÿçÇ]{2,20})\.?\s*(\d{1,3}):(\d{1,3})(?:\s*[-–—‑]\s*(\d{1,3}))?/g;
  // pra saber o testamento basta livro + capítulo (ex.: "Gênesis 1", "Levítico 23")
  var RE_REF_CAP = /([123])?\s*([A-Za-zÀ-ÿçÇ]{2,20})\.?\s*(\d{1,3})(?::(\d{1,3}))?/g;

  function localizar(refRaw) {
    var r = refRaw.match(RE_REF); if (!r) return null;
    var cands = resolver((r[1] || '') + r[2]); if (!cands) return null;
    for (var i = 0; i < cands.length; i++) {
      var txt = versos(cands[i], +r[3], r[4], r[5]);
      if (txt != null) return { ab: cands[i], c: +r[3], v: r[4], v2: r[5], texto: txt };
    }
    return { ab: cands[0], c: +r[3], v: r[4], v2: r[5], texto: null };
  }
  function rotulo(x) { return (NOMES[x.ab] || x.ab) + ' ' + x.c + (x.v ? (':' + x.v + (x.v2 ? '-' + x.v2 : '')) : ''); }

  /* ─────────────────────────────────────────────────────────────────────────
     3) TRAVA 1 — O VERSÍCULO ENTRE ASPAS DIZ MESMO AQUILO?
        Régua herdada do Gerador de Estudo de Doutrina, medida em produção:
          ≥45% das palavras batendo → confere
          25% a 45%                 → parafraseado, vale um olhar
          <25%                      → o texto citado NÃO é dessa referência
        As trocas reais capturadas deram 0% e 16%; a citação boa mais fraca, 44%.
     ───────────────────────────────────────────────────────────────────────── */

  // (a) aspas e DEPOIS a referência:  *"texto"* (João 1:32)  ·  "texto" — João 1:32
  var RE_ASPAS_REF = /[“"]([^”"]{15,600})[”"][*_\s,;:.–—‑-]{0,4}(?:[(]\s*([^)]{3,45}?)\s*[)]|[–—‑-]\s*([123]?\s*[A-Za-zÀ-ÿçÇ]{2,20}\.?\s*\d{1,3}:\d{1,3}(?:\s*[-–—‑]\s*\d{1,3})?))/g;
  // (b) referência e DEPOIS as aspas:  Levítico 23:10-12 – "texto"  ·  Rm 8:1 diz: "texto"
  //     Foi assim que a Sala do Concílio errou. O conferidor antigo só via a forma (a)
  //     e por isso essa passava batido. A janela entre a referência e a aspa é curta
  //     (até 26 caracteres, sem quebra de linha) pra não emparelhar frases vizinhas.
  var RE_REF_ASPAS = /([123])?\s*([A-Za-zÀ-ÿçÇ]{2,20})\.?\s*(\d{1,3}):(\d{1,3})(?:\s*[-–—‑]\s*(\d{1,3}))?([^“"\n]{0,26})[“"]([^”"]{15,600})[”"]/g;

  function medir(quote, real) {
    var A = pal(quote), S = {};
    pal(real).forEach(function (w) { S[w] = 1; });
    var h = 0; A.forEach(function (w) { if (S[w]) h++; });
    return A.length ? h / A.length : 1;
  }

  function conferirAspas(txt, achados, vistos) {
    var m;
    RE_ASPAS_REF.lastIndex = 0;
    while ((m = RE_ASPAS_REF.exec(txt))) {
      juntar(m[1], (m[2] || m[3] || '').replace(/[*_]/g, '').trim(), achados, vistos);
    }
    RE_REF_ASPAS.lastIndex = 0;
    while ((m = RE_REF_ASPAS.exec(txt))) {
      var meio = m[6] || '';
      // o miolo entre a referência e a aspa só pode ser "cola" — travessão, dois
      // pontos, um verbo de fala. Se tiver frase ali no meio, não é a mesma citação.
      if (!/^[\s*_]*(?:[:–—‑-]|,)?[\s*_]*(?:\b(?:diz|dizia|afirma|registra|declara|ordena|ensina|manda|lemos|traz|escreve|conta|relata)\b[\s:]*)?[\s*_(]*$/i.test(meio)) continue;
      var ref = (m[1] || '') + ' ' + m[2] + ' ' + m[3] + ':' + m[4] + (m[5] ? '-' + m[5] : '');
      juntar(m[7], ref.trim(), achados, vistos);
    }
  }

  // MASSA MÍNIMA PRA JULGAR — medido no lote de produção.
  // "Eu sou o pão vivo" (João 6:35) tem UMA palavra de 4+ letras: "vivo". Zero por
  // cento de acerto num universo de uma palavra não é prova de invenção, é ruído —
  // e "Arrependam-se e sejam batizados" (Atos 2:38) dava 0% só porque a nossa Bíblia
  // é Almeida ("Arrependei-vos... seja batizado"). Citação curta demais a trava
  // ignora: prefiro deixar passar um deslize pequeno a queimar a confiança do pastor
  // com alarme falso. As invenções de verdade são longas — as duas de Levítico 23
  // capturadas em produção tinham 6 e 12 palavras cheias.
  var MASSA = 4;

  function juntar(quote, refRaw, achados, vistos) {
    if (!refRaw) return;
    if (pal(quote).length < MASSA) return;
    var loc = localizar(refRaw); if (!loc) return;
    // dedup tolerante: o modelo troca hífen comum por hífen não-separável e acento,
    // então a MESMA citação aparecia várias vezes na lista.
    var chave = norm(refRaw) + '|' + pal(quote).slice(0, 8).join('');
    if (vistos[chave]) { vistos[chave]++; return; }
    vistos[chave] = 1;
    if (loc.texto == null) { achados.push({ tipo: 'nao-existe', rot: refRaw }); return; }
    var o = medir(quote, loc.texto);
    achados.push({ tipo: (o >= 0.45 ? 'ok' : (o >= 0.25 ? 'duvida' : 'erro')), rot: rotulo(loc), o: o, quote: quote, real: loc.texto });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     4) TRAVA 2 — O IDIOMA DO ORIGINAL BATE COM O TESTAMENTO?
     ───────────────────────────────────────────────────────────────────────── */

  // Alfabetos. O grego politônico da Bíblia usa o bloco estendido (ποιεῖν tem ῖ
  // em ῖ) — sem ele a trava passava ao largo justamente da palavra do bug.
  var RE_GREGO    = /[Ͱ-Ͽἀ-῿]/g;
  var RE_HEBRAICO = /[א-תיִ-ﭏ]/g;

  // Afirmação de idioma por extenso (pega a transliteração: "é o grego poiein").
  // Proposital e estreito: "cultura grega", "os gregos de João 12" NÃO entram aqui.
  var DIZ_GREGO = /(?:\b(?:n[oa]|em|d[oa]|ao|pelo|com o)\s+greg[oa]\b)|(?:\bgreg[oa]\s*[:=]\s*)|(?:\b(?:termo|palavra|vocábulo|vocabulo|verbo|substantivo|adjetivo|raiz|forma|expressão|expressao|original)\s+greg[oa]s?\b)|(?:\bé\s+o\s+greg[oa]\b)|(?:\bgreg[oa]\s+(?:é|e)\s)/i;
  var DIZ_HEBRAICO = /(?:\b(?:n[oa]|em|d[oa]|ao|pelo|com o)\s+hebraic[oa]\b)|(?:\bhebraic[oa]\s*[:=]\s*)|(?:\b(?:termo|palavra|vocábulo|vocabulo|verbo|substantivo|adjetivo|raiz|forma|expressão|expressao|original)\s+hebraic[oa]s?\b)|(?:\bé\s+o\s+hebraic[oa]\b)|(?:\bhebraic[oa]\s+(?:é|e)\s)/i;

  // O grego É legítimo no Antigo Testamento quando o assunto é a Septuaginta —
  // ela é o AT traduzido para o grego. Nesse parágrafo, a trava fica quieta.
  var PERDAO_AT = /septuaginta|\bLXX\b|vers[ãa]o greg|tradu[çc][ãa]o greg|grego da septuaginta|texto grego do antigo/i;
  // O hebraico/aramaico É legítimo no Novo Testamento: "talitá cumi" (Mc 5:41),
  // "Eli, Eli, lemá sabactâni" (Mt 27:46), "Abba" (Rm 8:15), e toda citação do AT.
  var PERDAO_NT = /aramaic|siríac|siriac|hebraísmo|hebraismo|septuaginta|\bLXX\b|antigo testamento|\bA\.?T\.?\b|cita[çc]|citando|citad[oa]|alus[ãa]o|transliter|eco d|remete a|remonta a/i;

  function temGrego(s) { RE_GREGO.lastIndex = 0; return (s.match(RE_GREGO) || []).length >= 2; }
  function temHebraico(s) { RE_HEBRAICO.lastIndex = 0; return (s.match(RE_HEBRAICO) || []).length >= 2; }
  function amostraGrego(s) { var m = s.match(/[Ͱ-Ͽἀ-῿][Ͱ-Ͽἀ-῿̀-ͅ᾽-῾'’]{1,26}/); return m ? m[0] : ''; }
  function amostraHebraico(s) { var m = s.match(/[א-ת][֐-״]{0,34}/); return m ? m[0] : ''; }

  // Todas as referências (livro + capítulo, com ou sem versículo) de um pedaço de texto.
  function refsDe(s) {
    var out = [], m;
    RE_REF_CAP.lastIndex = 0;
    while ((m = RE_REF_CAP.exec(s))) {
      var cands = resolver((m[1] || '') + m[2]); if (!cands) continue;
      var ab = cands[0];
      // "Jo 1" sem acento: João (NT). "Jó 1": Jó (AT). resolver() já ordena certo.
      out.push({ ab: ab, rot: (NOMES[ab] || ab) + ' ' + m[3] + (m[4] ? ':' + m[4] : ''), t: testamento(ab) });
    }
    return out;
  }

  // Quebra em frases guardando o texto de cada uma. Sem lookbehind, pra rodar
  // no celular velho do irmão também.
  function frases(par) {
    var out = [], atual = '';
    for (var i = 0; i < par.length; i++) {
      atual += par[i];
      if (/[.!?;]/.test(par[i]) && /\s|$/.test(par[i + 1] || ' ')) { out.push(atual); atual = ''; }
    }
    if (atual.trim()) out.push(atual);
    return out.filter(function (f) { return f.trim(); });
  }

  function conferirIdioma(txt) {
    var avisos = [], vistos = {};
    // parágrafo = bloco separado por linha em branco. É o alcance do "perdão"
    // (Septuaginta, citação do AT), porque o contexto que legitima o idioma
    // costuma estar na frase vizinha, não na mesma.
    var blocos = String(txt || '').split(/\n\s*\n/);
    for (var b = 0; b < blocos.length; b++) {
      var bloco = blocos[b];
      var linhas = bloco.split(/\r?\n/);
      for (var L = 0; L < linhas.length; L++) {
        var fs = frases(linhas[L]);
        for (var i = 0; i < fs.length; i++) {
          var f = fs[i];
          var g = temGrego(f) || DIZ_GREGO.test(f);
          var h = temHebraico(f) || DIZ_HEBRAICO.test(f);
          if (!g && !h) continue;
          if (g && h) continue;                     // nomeou os dois: está comparando, não errando

          // escopo: a própria frase; se ela não traz referência, herda a anterior
          var escopo = f, refs = refsDe(f);
          if (!refs.length && i > 0) { escopo = fs[i - 1] + ' ' + f; refs = refsDe(escopo); }
          if (!refs.length && L > 0) { escopo = linhas[L - 1] + ' ' + f; refs = refsDe(escopo); }
          if (!refs.length) continue;               // sem âncora, não há o que conferir

          var soAT = true, soNT = true;
          for (var r = 0; r < refs.length; r++) { if (refs[r].t === 'AT') soNT = false; else soAT = false; }
          if (soAT === soNT) continue;              // frase mistura AT e NT → cala a boca

          var alvo = refs.map(function (x) { return x.rot; }).join(', ');
          var chave;

          if (g && soAT) {
            if (PERDAO_AT.test(bloco)) continue;    // é a Septuaginta: grego no AT é correto
            chave = 'g|' + alvo;
            if (vistos[chave]) continue; vistos[chave] = 1;
            avisos.push({
              idioma: 'grego', certo: 'hebraico', refs: alvo,
              amostra: amostraGrego(f) || 'a palavra grega citada',
              trecho: f.trim().slice(0, 190)
            });
          } else if (h && soNT) {
            if (PERDAO_NT.test(bloco)) continue;    // aramaico de Jesus, citação do AT etc.
            chave = 'h|' + alvo;
            if (vistos[chave]) continue; vistos[chave] = 1;
            avisos.push({
              idioma: 'hebraico', certo: 'grego', refs: alvo,
              amostra: amostraHebraico(f) || 'a palavra hebraica citada',
              trecho: f.trim().slice(0, 190)
            });
          }
        }
      }
    }
    return avisos;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     5) O LAUDO
     ───────────────────────────────────────────────────────────────────────── */
  function analisar(txt) {
    return aquecer().then(function (ok) {
      if (!ok) return null;                        // Bíblia não veio: nenhum palpite
      var achados = [], vistos = {};
      conferirAspas(String(txt || ''), achados, vistos);

      // toda referência com capítulo:versículo precisa ao menos EXISTIR
      var inexistentes = [], vis2 = {}, existem = 0, m2;
      RE_REF_G.lastIndex = 0;
      while ((m2 = RE_REF_G.exec(txt))) {
        var cru = m2[0].replace(/[*_]/g, '').trim();
        if (vis2[norm(cru)]) continue; vis2[norm(cru)] = 1;
        var loc2 = localizar(cru); if (!loc2) continue;
        if (loc2.texto == null) inexistentes.push(cru); else existem++;
      }

      var idioma = conferirIdioma(txt);
      var erros = achados.filter(function (a) { return a.tipo === 'erro' || a.tipo === 'nao-existe'; });
      var duvidas = achados.filter(function (a) { return a.tipo === 'duvida'; });
      var ok2 = achados.filter(function (a) { return a.tipo === 'ok'; }).length;

      return {
        existem: existem, conferem: ok2,
        erros: erros, duvidas: duvidas, inexistentes: inexistentes, idioma: idioma,
        limpo: !erros.length && !duvidas.length && !inexistentes.length && !idioma.length
      };
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     6) A CAIXA NA TELA — discreta, honesta, e NUNCA apaga a resposta.
        Só aparece quando há o que dizer. Silêncio aqui quer dizer "passou".
     ───────────────────────────────────────────────────────────────────────── */
  var CSS_ID = 'radar-conferidor-css';
  var CSS =
    '.rcf{margin-top:10px;padding-top:9px;border-top:1px dashed #e0e4ea;font-size:.9rem;line-height:1.5;text-align:left}' +
    '.rcf .rcf-t{font-weight:800;color:#8a1c1c;font-size:.79rem;letter-spacing:.4px;text-transform:uppercase;margin-bottom:5px}' +
    '.rcf .rcf-i{margin-top:6px;padding:8px 10px;border-radius:10px}' +
    '.rcf .rcf-e{background:#fef2f2;border:1px solid #fecaca;color:#7f1d1d}' +
    '.rcf .rcf-d{background:#fffbeb;border:1px solid #fde68a;color:#78350f}' +
    '.rcf .rcf-i b{font-weight:800}' +
    '.rcf .rcf-diz{display:block;margin-top:4px;font-style:italic;color:#1c2230}';
  function css() {
    if (document.getElementById(CSS_ID)) return;
    var s = document.createElement('style'); s.id = CSS_ID; s.textContent = CSS;
    document.head.appendChild(s);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function corta(s, n) { s = String(s || ''); return esc(s.slice(0, n)) + (s.length > n ? '…' : ''); }

  function html(L) {
    if (!L || L.limpo) return '';
    var h = '<div class="rcf"><div class="rcf-t">⚠️ Confira antes de pregar</div>';

    L.idioma.forEach(function (a) {
      h += '<div class="rcf-i rcf-e">⚠️ A resposta ligou <b>' + esc(a.amostra) + '</b> (' + a.idioma + ') a <b>' +
        esc(a.refs) + '</b>, que é do <b>' + (a.idioma === 'grego' ? 'Antigo' : 'Novo') + ' Testamento</b>. ' +
        'O original ali é <b>' + a.certo + '</b>' + (a.certo === 'hebraico' ? ' (ou aramaico)' : '') + ', não ' + a.idioma + '.' +
        '<span class="rcf-diz">Trecho: “' + corta(a.trecho, 190) + '”</span></div>';
    });

    L.erros.forEach(function (a) {
      if (a.tipo === 'nao-existe') {
        h += '<div class="rcf-i rcf-e">❌ <b>' + esc(a.rot) + '</b> — essa referência <b>não existe</b> na Bíblia.</div>';
      } else {
        h += '<div class="rcf-i rcf-e">⚠️ <b>' + esc(a.rot) + '</b> — o texto citado entre aspas <b>não é dessa referência</b>.' +
          '<span class="rcf-diz">' + esc(a.rot) + ' diz: “' + corta(a.real, 260) + '”</span></div>';
      }
    });

    L.duvidas.forEach(function (a) {
      h += '<div class="rcf-i rcf-d">🔎 <b>' + esc(a.rot) + '</b> — a citação está <b>parafraseada</b>, não é o texto ao pé da letra.' +
        '<span class="rcf-diz">' + esc(a.rot) + ' diz: “' + corta(a.real, 260) + '”</span></div>';
    });

    if (L.inexistentes.length) {
      h += '<div class="rcf-i rcf-e">❌ Não existe(m) na Bíblia: <b>' + L.inexistentes.map(esc).join(', ') + '</b>.</div>';
    }
    return h + '</div>';
  }

  // Injeta o aviso dentro de `alvo`. Se `antes` vier, insere antes desse filho
  // (é assim que na Sala o aviso fica acima dos botões "Copiar / Gerar").
  function caixa(txt, alvo, antes) {
    return analisar(txt).then(function (L) {
      var h = html(L);
      if (!h || !alvo) return L;
      css();
      var velho = alvo.querySelector(':scope > .rcf'); if (velho) velho.remove();
      var d = document.createElement('div');
      d.innerHTML = h;
      var no = d.firstChild;
      if (antes && antes.parentNode === alvo) alvo.insertBefore(no, antes);
      else alvo.appendChild(no);
      return L;
    }).catch(function () { return null; });   // trava quebrada nunca derruba a página
  }

  // A trava de idioma é pura leitura de texto — NÃO precisa da Bíblia baixada.
  // Fica exposta sozinha pra quem já tem o próprio conferidor de citações
  // (o Gerador de Estudo de Doutrina) não baixar /biblia.json duas vezes.
  function avisoIdiomaHtml(txt) {
    var L = { idioma: conferirIdioma(txt), erros: [], duvidas: [], inexistentes: [], limpo: false };
    L.limpo = !L.idioma.length;
    return html(L);
  }

  janela.RadarConferidor = {
    aquecer: aquecer,
    analisar: analisar,
    caixa: caixa,
    html: html,
    idioma: conferirIdioma,
    avisoIdiomaHtml: avisoIdiomaHtml,
    estiloCaixa: css,
    testamento: testamento
  };
})(window);
