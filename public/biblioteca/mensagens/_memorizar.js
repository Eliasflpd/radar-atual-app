// Botão "🧠 Memorizar esta mensagem": só aparece se existir memorizar/<slug>.json.
(function(){
  var m = location.pathname.match(/\/mensagens\/([a-z0-9-]+)\.html$/);
  if(!m) return;
  var slug = m[1];
  fetch('/biblioteca/mensagens/memorizar/' + slug + '.json?v=1', { method:'HEAD' }).then(function(r){
    if(!r.ok) return;
    var a = document.createElement('a');
    a.href = '/biblioteca/mensagens/memorizar/?m=' + slug;
    a.textContent = '🧠 Memorizar esta mensagem';
    a.setAttribute('style','display:block;margin:0 auto 22px;max-width:420px;text-align:center;background:linear-gradient(135deg,#a9791c,#c99a3a);color:#fff;text-decoration:none;font-weight:800;font-size:1.08rem;border-radius:14px;padding:13px 16px;box-shadow:0 6px 16px rgba(169,121,28,.3)');
    var sub = document.createElement('div');
    sub.textContent = 'Imagens, teste falado e cartão de púlpito';
    sub.setAttribute('style','font-weight:600;font-size:.82rem;opacity:.9;margin-top:2px');
    a.appendChild(sub);
    var ref = document.querySelector('.divisor');
    if(ref && ref.parentNode){ ref.parentNode.insertBefore(a, ref.nextSibling); } else { document.body.insertBefore(a, document.body.firstChild); }
  }).catch(function(){});
})();