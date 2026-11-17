// Aviso de mensagem nova na tela inicial (pedido do Elias, 16/11/2026: "cada mensagem que eu posto tem que ter um novo").
// Lê as datas da lista de Pregações; o que tem até 14 dias e ainda não foi visto ganha o selo NOVA nos botões de Pregações.
// "Visto" = o irmão abriu a lista de Pregações (lá o index grava mensagens.vistoAte).
(function(){
  var DIAS = 14;
  function ler(k){ try { return localStorage.getItem(k) || ''; } catch(e){ return ''; } }
  fetch('/biblioteca/mensagens/index.html', { cache: 'no-cache' }).then(function(r){ return r.ok ? r.text() : ''; }).then(function(html){
    if(!html) return;
    var ini = html.indexOf('var MENSAGENS'); if(ini < 0) return;
    var trecho = html.slice(ini);
    // pega pares data/título de cada card
    var cards = [], m, reCard = /\{[^{}]*?arquivo:[^{}]*?\}/g;
    while((m = reCard.exec(trecho))){
      var c = m[0];
      var d = c.match(/data:\s*["'](\d{4}-\d{2}-\d{2})["']/);
      var t = c.match(/titulo:\s*"([^"]+)"/) || c.match(/titulo:\s*'([^']+)'/);
      if(d) cards.push({ data: d[1], titulo: t ? t[1] : '' });
    }
    var visto = ler('mensagens.vistoAte');
    var limite = Date.now() - DIAS * 864e5;
    var novas = cards.filter(function(c){ return new Date(c.data + 'T12:00:00').getTime() >= limite && (!visto || c.data > visto); });
    if(!novas.length) return;
    // a lista já vem com a mais nova em cima; em data igual, vale a ordem da lista
    novas.forEach(function(c, i){ c.ordem = i; });
    novas.sort(function(a,b){ return a.data === b.data ? a.ordem - b.ordem : (a.data < b.data ? 1 : -1); });
    var rotulo = novas.length === 1 ? 'NOVA' : novas.length + ' NOVAS';
    function selo(extra){
      var s = document.createElement('span');
      s.className = 'selo-nova';
      s.textContent = rotulo;
      s.setAttribute('style', 'display:inline-block;background:#1f9d57;color:#fff;font-size:10px;font-weight:800;letter-spacing:.5px;line-height:1;padding:4px 7px;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,.25);white-space:nowrap;' + (extra || ''));
      return s;
    }
    function aplicar(){
      // 1) tudo que abre a lista de Pregações/Mensagens
      var alvos = document.querySelectorAll('[onclick*="/biblioteca/mensagens/"]');
      Array.prototype.forEach.call(alvos, function(el){
        if(el.querySelector('.selo-nova')) return;
        if(el.classList.contains('bib-mod')){
          // card "Mensagens" da Biblioteca: usa o selo NOVO que a Biblioteca já tem
          var velho = el.querySelector('.bm-novo'); if(velho) velho.remove();
          var s = document.createElement('span'); s.className = 'bm-novo selo-nova'; s.textContent = rotulo;
          el.insertBefore(s, el.firstChild);
        } else if(el.classList.contains('he-pl-txt')){
          var b = el.querySelector('b');
          if(b){ b.textContent = 'Nova: ' + novas[0].titulo; }
          var sp = el.querySelector('span'); if(sp){ sp.appendChild(selo('margin-left:6px;vertical-align:middle')); }
        } else if(el.classList.contains('vit-card')){
          if(getComputedStyle(el).position === 'static'){ el.style.position = 'relative'; }
          el.appendChild(selo('position:absolute;top:8px;right:8px'));
        } else {
          el.appendChild(selo('margin-left:6px;vertical-align:middle'));
        }
      });
      // 2) o botão "Biblioteca" da tela inicial (é por ele que se chega em Mensagens)
      var bib = document.querySelectorAll('.nh-card[onclick*="manuais"]');
      Array.prototype.forEach.call(bib, function(el){
        if(el.querySelector('.selo-nova')) return;
        if(getComputedStyle(el).position === 'static'){ el.style.position = 'relative'; }
        el.appendChild(selo('position:absolute;top:-7px;right:8px'));
      });
    }
    aplicar();
    // a Biblioteca monta os cards depois; reaplica quando a tela muda
    var pend = null;
    new MutationObserver(function(){ if(pend) return; pend = setTimeout(function(){ pend = null; aplicar(); }, 250); })
      .observe(document.body, { childList: true, subtree: true });
  }).catch(function(){});
})();
