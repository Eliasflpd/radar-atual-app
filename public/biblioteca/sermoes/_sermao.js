/* _sermao.js — melhorias do módulo SERMÕES, sem tocar no texto original.
   1) Botão flutuante "COPIAR TUDO" (regra do Elias: onde há texto, há Copiar).
   2) Reaproveita o linkador de referências das Mensagens (../mensagens/_refs.js):
      toda referência bíblica vira um toque que abre o versículo. (Reuso, não cópia.)
   Uso: <script src="_sermao.js" defer></script> no fim de cada sermão. */
(function(){
  var path = location.pathname;
  // nunca na lista (index) — só nas páginas de sermão
  if (/\/sermoes\/(index\.html)?$/.test(path)) return;
  if (document.getElementById('sm-copia')) return;

  // ── 1) texto completo do sermão, em ordem de leitura ──
  function textoCompleto(){
    var partes = [];
    var h1 = document.querySelector('h1');
    var ref = document.querySelector('.ref');
    if (h1) partes.push((h1.innerText||'').trim());
    if (ref) partes.push((ref.innerText||'').trim());
    // corpo: intro, seções, parágrafos e listas — na ordem em que aparecem
    var sel = 'h2.sec, .intro p, body > p, .final p, ul li';
    var nós = document.querySelectorAll(sel);
    Array.prototype.forEach.call(nós, function(n){
      var t = (n.innerText||'').trim();
      if (!t) return;
      if (n.tagName === 'LI') t = '• ' + t;
      partes.push(t);
    });
    return partes.filter(Boolean).join('\n\n');
  }

  function copiar(txt, btn){
    function ok(){ var o=btn.textContent; btn.textContent='✅ Copiado!'; setTimeout(function(){ btn.textContent=o; },1600); }
    function fb(){ var a=document.createElement('textarea'); a.value=txt; a.style.position='fixed'; a.style.opacity='0'; document.body.appendChild(a); a.focus(); a.select(); try{ document.execCommand('copy'); }catch(e){} document.body.removeChild(a); ok(); }
    if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(ok).catch(fb); } else fb();
  }

  var css = ''
    + '.sm-copia{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom));z-index:60;'
    + 'background:linear-gradient(135deg,#0f6d78,#0f3d5c);color:#fff;border:none;border-radius:999px;padding:13px 22px;font-size:.98rem;'
    + 'font-weight:800;font-family:inherit;cursor:pointer;box-shadow:0 6px 20px rgba(15,61,92,.35)}'
    + '.sm-copia:active{opacity:.85}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var btn = document.createElement('button');
  btn.className = 'sm-copia'; btn.id = 'sm-copia'; btn.type = 'button';
  btn.textContent = '📋 COPIAR TUDO';
  btn.addEventListener('click', function(){ copiar(textoCompleto(), btn); });
  document.body.appendChild(btn);

  // ── 2) referências bíblicas tocáveis (reuso do módulo Mensagens) ──
  try {
    if (!window.__refsInit) {
      var s = document.createElement('script');
      s.src = '../mensagens/_refs.js'; s.defer = true;
      document.body.appendChild(s); // se falhar, o botão Copiar continua funcionando
    }
  } catch(e){}
})();
