/* HIFENIZAÇÃO EM PORTUGUÊS — 11/10/2026 (pedido do Elias: "o texto deve ocupar a tela toda, mesmo
   que precise quebrar uma palavra").
   Por que existe: o CSS `hyphens:auto` depende de um dicionário que cada Chrome/Android pode ou não
   ter baixado. Sem ele, o texto justificado fica com buracos enormes entre as palavras. Aqui o corte
   é feito pelo próprio app: coloca um hífen suave (U+00AD) dentro das palavras longas, em fronteiras
   de sílaba. O hífen suave é INVISÍVEL, só aparece quando a palavra precisa quebrar no fim da linha.
   Regras (conservadoras de propósito — melhor não cortar do que cortar errado):
   - só corta ENTRE CONSOANTES e antes de consoante entre vogais; nunca separa vogais (ditongo/hiato);
   - dígrafos ch lh nh qu gu ficam juntos; rr ss sc sç xc se separam;
   - encontros b/c/d/f/g/p/t/v + l/r vão juntos para a sílaba seguinte (pro-ble-ma, es-tru-tu-ra);
   - palavra com 7+ letras e mínimo de 3 letras de cada lado do corte;
   - não mexe em títulos, referências bíblicas (.bref), números de versículo, scripts, nem em
     palavras com número ou hífen.
   Uso: carrega sozinho no fim da página; `hifenizar(elemento)` para conteúdo montado depois. */
(function () {
  var SHY = '­';
  var V = 'aeiouáéíóúâêôãõàüAEIOUÁÉÍÓÚÂÊÔÃÕÀÜ';
  function ehV(c) { return V.indexOf(c) >= 0; }
  var ONSET2 = /^(b|c|d|f|g|p|t|v)(l|r)$/i;

  // devolve as posições (índices) onde um corte é permitido dentro da palavra
  function cortes(w) {
    var pos = [], n = w.length, i = 0;
    while (i < n) {
      if (!ehV(w[i])) { i++; continue; }
      // acha o fim do grupo de vogais e o grupo de consoantes seguinte
      var j = i; while (j < n && ehV(w[j])) j++;       // j = primeira consoante depois das vogais
      var k = j; while (k < n && !ehV(w[k])) k++;       // k = próxima vogal
      if (j >= n || k >= n) break;                      // sem vogal depois: palavra acabou
      var cons = w.slice(j, k), cl = cons.toLowerCase(), corte;
      // dígrafos que não se separam: trata como 1 unidade
      var unid = [], p = 0;
      while (p < cl.length) {
        var d2 = cl.substr(p, 2);
        if (d2 === 'ch' || d2 === 'lh' || d2 === 'nh' || ((d2 === 'qu' || d2 === 'gu') && p + 2 <= cl.length && p + 2 === cl.length)) { unid.push(cl.substr(p, 2)); p += 2; }
        else { unid.push(cl[p]); p++; }
      }
      var u = unid.length;
      if (u === 1) corte = j;                                            // V|CV
      else if (u === 2 && ONSET2.test(unid[0] + unid[1])) corte = j;      // V|CCV com bl/br/cr...
      else if (u === 2) corte = j + unid[0].length;                      // VC|CV  (rr, ss, sc, rt, mp...)
      else {                                                             // 3+ unidades
        var last2 = unid[u - 2] + unid[u - 1];
        var tail = ONSET2.test(last2) ? (unid[u - 2].length + unid[u - 1].length) : unid[u - 1].length;
        corte = k - tail;
      }
      if (corte > 0 && corte < n) pos.push(corte);
      i = k;
    }
    return pos;
  }

  function hifenizaPalavra(w) {
    if (w.length < 7) return w;
    var c = cortes(w), out = '', ult = 0;
    for (var a = 0; a < c.length; a++) {
      var x = c[a];
      if (x < 3 || w.length - x < 3) continue;       // mínimo 3 letras de cada lado
      out += w.slice(ult, x) + SHY; ult = x;
    }
    return out + w.slice(ult);
  }

  var RE_PALAVRA = /[A-Za-zÀ-ÖØ-öø-ÿ]{7,}/g;
  var PULA = 'SCRIPT,STYLE,CODE,PRE,TEXTAREA,INPUT,BUTTON,H1,H2,H3,H4,.bref,.titulo,.data,.sec-head,.roman-head,.lbl,.verso-num,.bible-ref,.cap,.rt,.ra,.rosto';
  function pular(el) { while (el && el.nodeType === 1) { if (el.matches && el.matches(PULA)) return true; el = el.parentNode; } return false; }

  function hifenizar(raiz) {
    raiz = raiz || document.body; if (!raiz) return;
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, null), nos = [], n;
    while ((n = w.nextNode())) { if (n.nodeValue.length >= 7 && !pular(n.parentNode)) nos.push(n); }
    nos.forEach(function (no) {
      var t = no.nodeValue;
      if (t.indexOf(SHY) >= 0) return;                // já feito
      var nt = t.replace(RE_PALAVRA, function (m, off) {
        var ant = t.charAt(off - 1), dep = t.charAt(off + m.length);
        if (ant === '-' || dep === '-' || /\d/.test(ant) || /\d/.test(dep)) return m;   // composta ou com número
        return hifenizaPalavra(m);
      });
      if (nt !== t) no.nodeValue = nt;
    });
  }
  window.hifenizar = hifenizar;
  window.__hifenCortes = cortes;   // só para teste
  if (document.body && document.readyState !== 'loading') hifenizar(); else document.addEventListener('DOMContentLoaded', function () { hifenizar(); });
})();
