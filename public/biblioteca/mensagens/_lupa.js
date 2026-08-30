/* Lupa da Mensagem — chat que aprofunda a mensagem SEM tocar no texto original.
   Uso: <script src="_lupa.js" defer></script> no fim de cada mensagem. */
(function(){
  var path = location.pathname;
  // não injeta na lista nem no treinador "Fixar na mente"
  if (/\/mensagens\/(index\.html)?$/.test(path)) return;
  if (/-fixar\.html$/.test(path)) return;
  if (document.getElementById('lm-fab')) return;

  function ctx(){
    var h1 = document.querySelector('h1');
    var ref = document.querySelector('.ref');
    var ps = Array.prototype.slice.call(document.querySelectorAll('p'))
      .map(function(p){ return (p.innerText||'').trim(); }).filter(Boolean);
    return ((h1?h1.innerText.trim():'') + '\n' + (ref?ref.innerText.trim():'') + '\n\n' + ps.join('\n\n')).slice(0, 9000);
  }
  var TITULO = document.querySelector('h1') ? document.querySelector('h1').innerText.trim() : 'esta mensagem';

  var css = ''
  + '.lm-fab{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom));z-index:60;'
  + 'background:linear-gradient(135deg,#0f6d78,#0f3d5c);color:#fff;border:none;border-radius:999px;padding:13px 20px;font-size:.98rem;'
  + 'font-weight:800;font-family:inherit;cursor:pointer;box-shadow:0 6px 20px rgba(15,61,92,.35)}'
  + '.lm-back{position:fixed;inset:0;background:rgba(10,22,36,.5);z-index:70;display:none}'
  + '.lm-back.on{display:block}'
  + '.lm-panel{position:fixed;left:0;right:0;bottom:0;z-index:71;background:#fff;border-radius:20px 20px 0 0;max-width:820px;margin:0 auto;'
  + 'display:flex;flex-direction:column;max-height:86vh;box-shadow:0 -8px 30px rgba(0,0,0,.25);transform:translateY(100%);transition:transform .22s}'
  + '.lm-panel.on{transform:translateY(0)}'
  + '.lm-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #eef0f3;color:#0f3d5c}'
  + '.lm-head b{font-family:Georgia,serif;font-size:1.08rem}'
  + '.lm-head button{background:#eef2f4;border:none;border-radius:50%;width:32px;height:32px;font-size:1rem;cursor:pointer;color:#0f3d5c;font-weight:800}'
  + '.lm-body{flex:1;overflow-y:auto;padding:14px 15px;background:#f6f8fb}'
  + '.lm-hint{color:#5b6675;font-size:.96rem;line-height:1.5;background:#fff;border:1px solid #e6ebf1;border-radius:14px;padding:13px 14px;margin-bottom:10px}'
  + '.lm-sug{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:6px}'
  + '.lm-sug button{background:#fff;border:1px solid #cfe0e5;color:#0f6d78;border-radius:999px;padding:8px 12px;font-size:.86rem;font-weight:700;font-family:inherit;cursor:pointer}'
  + '.lm-q{align-self:flex-end;background:#0f3d5c;color:#fff;border-radius:15px 15px 4px 15px;padding:10px 13px;margin:12px 0 4px auto;max-width:85%;font-size:1rem;line-height:1.45;width:fit-content}'
  + '.lm-a{background:#fff;border:1px solid #e6ebf1;border-radius:15px 15px 15px 4px;padding:13px 14px;margin:4px 0 6px;max-width:96%;color:#1c2230;font-size:1.04rem;line-height:1.62}'
  + '.lm-a p{margin:0 0 10px;text-align:justify}.lm-a p:last-child{margin-bottom:0}.lm-a strong{color:#8a1c1c}.lm-a em{color:#0f3d5c;font-style:italic}'
  + '.lm-a .lm-copy{margin-top:9px;background:rgba(15,61,92,.07);border:1px solid #e4e7ec;color:#0f3d5c;border-radius:10px;padding:8px 12px;font-weight:800;font-family:inherit;font-size:.86rem;cursor:pointer}'
  + '.lm-load{color:#0f6d78;font-weight:700;font-size:.95rem;padding:6px 2px}'
  + '.lm-foot{display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));border-top:1px solid #eef0f3;background:#fff}'
  + '.lm-foot textarea{flex:1;border:2px solid #e4e7ec;border-radius:14px;padding:11px 12px;font-size:1.02rem;font-family:inherit;resize:none;max-height:120px;color:#1c2230}'
  + '.lm-foot textarea:focus{outline:none;border-color:#0f6d78}'
  + '.lm-foot .lm-send{background:linear-gradient(135deg,#0f6d78,#0f3d5c);color:#fff;border:none;border-radius:14px;width:50px;font-size:1.2rem;font-weight:800;cursor:pointer}'
  + '.lm-foot .lm-send:disabled{opacity:.5}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var fab = document.createElement('button'); fab.className='lm-fab'; fab.id='lm-fab'; fab.textContent='🔎 Perguntar sobre esta mensagem';
  var back = document.createElement('div'); back.className='lm-back'; back.id='lm-back';
  var panel = document.createElement('div'); panel.className='lm-panel'; panel.id='lm-panel';
  panel.innerHTML =
    '<div class="lm-head"><b>🔎 Lupa desta mensagem</b><button id="lm-x" aria-label="fechar">✕</button></div>'
    + '<div class="lm-body" id="lm-body">'
      + '<div class="lm-hint">Pergunte o que quiser sobre <b>'+esc(TITULO)+'</b> — o Concílio aprofunda e enriquece pra você, firmado na Palavra. O texto da mensagem <b>não muda</b>.</div>'
      + '<div class="lm-sug" id="lm-sug"></div>'
    + '</div>'
    + '<div class="lm-foot"><textarea id="lm-q" rows="1" placeholder="Escreva sua pergunta…" enterkeyhint="send"></textarea><button class="lm-send" id="lm-send">➤</button></div>';
  document.body.appendChild(fab); document.body.appendChild(back); document.body.appendChild(panel);

  var body=el('lm-body'), q=el('lm-q'), send=el('lm-send'), sug=el('lm-sug');
  var historico=[], ocupado=false;

  // sugestões
  ['O que a palavra no original acrescenta?','Qual o pano de fundo histórico?','Como aplicar isso hoje?'].forEach(function(s){
    var b=document.createElement('button'); b.textContent=s; b.onclick=function(){ q.value=s; enviar(); }; sug.appendChild(b);
  });

  function abrir(){ back.classList.add('on'); panel.classList.add('on'); setTimeout(function(){ q.focus(); },260); }
  function fechar(){ back.classList.remove('on'); panel.classList.remove('on'); }
  fab.onclick=abrir; back.onclick=fechar; el('lm-x').onclick=fechar;
  q.addEventListener('input',function(){ q.style.height='auto'; q.style.height=Math.min(q.scrollHeight,120)+'px'; });
  q.addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); enviar(); } });
  send.onclick=enviar;

  function enviar(){
    var t=q.value.trim(); if(!t||ocupado) return;
    if(sug){ sug.remove(); sug=null; }
    ocupado=true; send.disabled=true;
    add('q', t); q.value=''; q.style.height='auto';
    var load=document.createElement('div'); load.className='lm-load'; load.textContent='🔎 Consultando o Concílio…'; body.appendChild(load); scroll();
    var acc='';
    fetch('/api/concilio',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({acao:'lupa-msg',pergunta:t,contexto:ctx(),historico:historico.slice(-6)})})
    .then(function(r){
      if(!r.body||!r.body.getReader) return r.text().then(function(x){acc=x;});
      var reader=r.body.getReader(), dec=new TextDecoder();
      return (function pump(){ return reader.read().then(function(x){ if(x.done) return; acc+=dec.decode(x.value,{stream:true}); }); })();
    })
    .then(function(){ load.remove(); var txt=(acc||'').trim()||'Não veio resposta. Tente de novo.'; add('a', txt); historico.push({role:'user',content:t}); historico.push({role:'assistant',content:txt}); })
    .catch(function(e){ load.remove(); add('a','Não deu certo agora: '+esc(e.message||'falha')+'. Tente de novo.'); })
    .then(function(){ ocupado=false; send.disabled=false; });
  }

  function add(tipo, txt){
    var d=document.createElement('div');
    if(tipo==='q'){ d.className='lm-q'; d.textContent=txt; }
    else {
      d.className='lm-a'; d.innerHTML=fmt(txt)
        + '<button class="lm-copy">📋 Copiar</button>';
      d.querySelector('.lm-copy').onclick=function(){ copiar(txt, d.querySelector('.lm-copy')); };
    }
    body.appendChild(d); scroll();
  }
  function fmt(txt){
    return txt.split(/\n{2,}/).map(function(par){
      return '<p>'+inl(par.replace(/\n/g,' '))+'</p>';
    }).join('');
  }
  function inl(s){ return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>'); }
  function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function scroll(){ body.scrollTop=body.scrollHeight; }
  function el(id){ return document.getElementById(id); }
  function copiar(txt, btn){
    function fb(){ var a=document.createElement('textarea');a.value=txt;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.focus();a.select();try{document.execCommand('copy')}catch(e){}document.body.removeChild(a); }
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).catch(fb); } else fb();
    var o=btn.textContent; btn.textContent='✅ Copiado'; setTimeout(function(){btn.textContent=o;},1500);
  }
})();
