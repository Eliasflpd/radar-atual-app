/* _leitura.js — Camada de LEITURA das Mensagens para Pregar.
   Acrescenta, SEM tocar no texto original de cada mensagem:
     • 📋 Copiar a mensagem inteira (norma do Elias: texto pra pregar SEMPRE tem Copiar)
     • A− / A+  controle de tamanho da letra (fica salvo) — leitura de púlpito e acessibilidade
     • Barra de progresso de leitura no topo (foco em textos longos)
     • Tempo estimado de leitura ("~N min")
   Uso: <script src="_leitura.js" defer></script> em cada mensagem (antes do _lupa.js).
   Paleta: navy/teal/dourado — ZERO roxo. */
(function(){
  var path = location.pathname;
  // não roda na lista nem no treinador "Fixar na mente" (que já tem Copiar próprio)
  if (/\/mensagens\/(index\.html)?$/.test(path)) return;
  if (/-fixar\.html$/.test(path)) return;
  if (window.__leituraInit) return; window.__leituraInit = true;

  var FONT_MIN = 15, FONT_MAX = 24, FONT_BASE = 17, KEY = 'radar_msg_fontpx';

  // ---------- estilos ----------
  var css = ''
   + '.lt-prog{position:fixed;top:0;left:0;height:4px;width:0;z-index:80;'
   + 'background:linear-gradient(90deg,#0f6d78,#a9791c);transition:width .08s linear}'
   + '.lt-bar{position:fixed;top:calc(8px + env(safe-area-inset-top));right:10px;z-index:81;display:flex;gap:6px;align-items:center;'
   + 'background:rgba(255,255,255,.94);border:1px solid #e4e7ec;border-radius:999px;padding:5px 7px;'
   + 'box-shadow:0 4px 16px rgba(15,61,92,.16);backdrop-filter:saturate(1.2) blur(2px)}'
   + '.lt-bar button{border:none;border-radius:999px;font-family:inherit;font-weight:800;cursor:pointer;color:#0f3d5c;background:#eef2f4}'
   + '.lt-a{width:32px;height:32px;font-size:.82rem;line-height:1;display:flex;align-items:center;justify-content:center}'
   + '.lt-a .s{font-size:1.15rem}'
   + '.lt-copy{height:32px;padding:0 13px;font-size:.9rem;color:#fff !important;background:linear-gradient(135deg,#0f6d78,#0f3d5c) !important;display:flex;align-items:center;gap:5px}'
   + '.lt-copy.ok{background:#14804a !important}'
   + '.lt-time{text-align:center;color:#6b7280;font-size:.9rem;font-weight:700;margin:-8px 0 16px}'
   + '.lt-copybottom{display:block;width:100%;margin:22px 0 4px;background:linear-gradient(135deg,#0f6d78,#0f3d5c);color:#fff;border:none;'
   + 'border-radius:13px;padding:14px;font-size:1.03rem;font-weight:800;font-family:inherit;cursor:pointer}'
   + '.lt-copybottom.ok{background:#14804a}'
   + '@media print{.lt-prog,.lt-bar,.lt-copybottom,.lm-fab,.lm-back,.lm-panel{display:none !important}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- barra de progresso ----------
  var prog = document.createElement('div'); prog.className = 'lt-prog'; document.body.appendChild(prog);
  function onScroll(){
    var h = document.documentElement;
    var max = (h.scrollHeight - h.clientHeight);
    var pct = max > 0 ? (h.scrollTop || document.body.scrollTop) / max * 100 : 0;
    prog.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll);

  // ---------- tamanho da letra (salvo) ----------
  function getFont(){ var v = parseInt(localStorage.getItem(KEY), 10); return isNaN(v) ? FONT_BASE : Math.max(FONT_MIN, Math.min(FONT_MAX, v)); }
  function applyFont(px){ document.documentElement.style.fontSize = px + 'px'; setTimeout(onScroll, 30); }
  var fpx = getFont(); applyFont(fpx);
  function bumpFont(d){ fpx = Math.max(FONT_MIN, Math.min(FONT_MAX, fpx + d)); localStorage.setItem(KEY, fpx); applyFont(fpx); }

  // ---------- texto limpo pra copiar ----------
  function dentroDeChat(el){ return !!(el.closest && el.closest('.lm-panel,.lm-body,.lm-a,.refmodal,.lt-bar')); }
  function textoDaMensagem(){
    var out = [];
    var nos = document.querySelectorAll('h1, .ref, p, .grito');
    for (var i=0;i<nos.length;i++){
      var el = nos[i];
      if (dentroDeChat(el)) continue;
      if (el.classList && el.classList.contains('lt-time')) continue;
      var t = (el.innerText || el.textContent || '').trim();
      if (t) out.push(t);
    }
    return out.join('\n\n');
  }

  // ---------- copiar ----------
  function copiar(txt, cb){
    function fb(){ var a=document.createElement('textarea'); a.value=txt; a.style.position='fixed'; a.style.opacity='0';
      document.body.appendChild(a); a.focus(); a.select(); try{document.execCommand('copy');}catch(e){} document.body.removeChild(a); cb&&cb(); }
    if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(function(){cb&&cb();}).catch(fb); }
    else fb();
  }
  function flashOk(btn, label){
    btn.classList.add('ok'); var o = btn.innerHTML; btn.innerHTML = '✅ Copiado';
    setTimeout(function(){ btn.classList.remove('ok'); btn.innerHTML = label || o; }, 1600);
  }

  // ---------- barra flutuante (A- A+ Copiar) ----------
  var bar = document.createElement('div'); bar.className = 'lt-bar';
  bar.innerHTML =
      '<button class="lt-a" id="lt-menos" aria-label="Diminuir letra">A<span class="s">−</span></button>'
    + '<button class="lt-a" id="lt-mais" aria-label="Aumentar letra">A<span class="s">+</span></button>'
    + '<button class="lt-copy" id="lt-copy">📋 Copiar</button>';
  document.body.appendChild(bar);
  document.getElementById('lt-menos').onclick = function(){ bumpFont(-1); };
  document.getElementById('lt-mais').onclick = function(){ bumpFont(1); };
  var btnTopo = document.getElementById('lt-copy');
  btnTopo.onclick = function(){ copiar(textoDaMensagem(), function(){ flashOk(btnTopo, '📋 Copiar'); }); };

  // ---------- tempo de leitura + botão Copiar no fim ----------
  function palavras(s){ var m = (s||'').trim().match(/\S+/g); return m ? m.length : 0; }
  document.addEventListener('DOMContentLoaded', montar);
  if (document.readyState !== 'loading') montar();
  function montar(){
    if (montar._feito) return; montar._feito = true;

    // tempo de leitura, logo abaixo da referência
    var ref = document.querySelector('.ref');
    var min = Math.max(1, Math.round(palavras(textoDaMensagem()) / 200));
    if (ref && !document.querySelector('.lt-time')){
      var t = document.createElement('div'); t.className = 'lt-time';
      t.textContent = '⏱️ ~' + min + ' min de leitura';
      (ref.nextSibling ? ref.parentNode.insertBefore(t, ref.nextSibling) : ref.parentNode.appendChild(t));
    }

    // botão Copiar grande no fim do conteúdo (antes dos scripts)
    if (!document.querySelector('.lt-copybottom')){
      var b = document.createElement('button'); b.className = 'lt-copybottom';
      b.innerHTML = '📋 Copiar a mensagem inteira';
      b.onclick = function(){ copiar(textoDaMensagem(), function(){ flashOk(b, '📋 Copiar a mensagem inteira'); }); };
      var scripts = document.body.querySelector('script[src]');
      if (scripts) document.body.insertBefore(b, scripts); else document.body.appendChild(b);
    }
    onScroll();
  }
})();
