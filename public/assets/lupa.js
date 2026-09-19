
var _lupaLicao=1,_lupaTurma='adulto';
function mostrarLupa(){ var b=document.getElementById('lupa-btn'); if(b){ b.style.display='block'; _lupaInit(); _lupaRestorePos(); } }
function esconderLupa(){ var b=document.getElementById('lupa-btn'); if(b) b.style.display='none'; fecharLupa(); }
// Botão da Lupa FLUTUANTE e ARRASTÁVEL — o Elias tira ele de cima do texto e ele lembra o lugar.
var _lupaDragOn=false;
function _lupaSetPos(x,y){
  var b=document.getElementById('lupa-btn'); if(!b) return;
  var w=b.offsetWidth||150, h=b.offsetHeight||44;
  x=Math.max(6,Math.min(window.innerWidth-w-6,x));
  y=Math.max(60,Math.min(window.innerHeight-h-6,y));
  b.style.left=x+'px'; b.style.top=y+'px'; b.style.right='auto'; b.style.bottom='auto'; b.style.transform='none';
  try{ localStorage.setItem('radar_lupa_pos',x+','+y); }catch(_){}
}
function _lupaRestorePos(){
  try{ var p=(localStorage.getItem('radar_lupa_pos')||'').split(','); if(p.length===2 && p[0]) _lupaSetPos(parseFloat(p[0]),parseFloat(p[1])); }catch(_){}
}
function _lupaInit(){
  if(_lupaDragOn) return; var b=document.getElementById('lupa-btn'); if(!b) return; _lupaDragOn=true;
  var moved=false,sx=0,sy=0,ox=0,oy=0,drag=false;
  b.addEventListener('pointerdown',function(e){ drag=true;moved=false;sx=e.clientX;sy=e.clientY;
    var r=b.getBoundingClientRect(); ox=e.clientX-r.left; oy=e.clientY-r.top;
    try{ b.setPointerCapture(e.pointerId); }catch(_){}; b.style.cursor='grabbing'; });
  b.addEventListener('pointermove',function(e){ if(!drag)return;
    if(Math.abs(e.clientX-sx)>5||Math.abs(e.clientY-sy)>5) moved=true;
    if(moved){ e.preventDefault(); _lupaSetPos(e.clientX-ox,e.clientY-oy); } });
  b.addEventListener('pointerup',function(e){ if(!drag)return; drag=false; b.style.cursor='grab';
    if(!moved) abrirLupaPanel(); });
  b.addEventListener('pointercancel',function(){ drag=false; b.style.cursor='grab'; });
}
function abrirLupaPanel(){
  document.getElementById('lupa-ov').style.display='block';
  document.getElementById('lupa-resp').innerHTML='<div style="color:#8a8f98;text-align:center;padding:14px">Pergunte com suas palavras sobre a lição que você está lendo. 🙏</div>';
  var chips=['Explique o Texto Áureo','O que é a Verdade Prática?','Um versículo que confirma?','Como aplicar na minha vida?'];
  document.getElementById('lupa-chips').innerHTML=chips.map(function(c){
    return '<button onclick="document.getElementById(\'lupa-q\').value=this.textContent;perguntarLupa()" style="background:#eef6f7;border:1px solid #cfe3e6;color:#0f6d78;border-radius:999px;padding:8px 12px;font-size:.85rem;font-weight:700;font-family:inherit;cursor:pointer">'+c+'</button>';
  }).join('');
  setTimeout(function(){document.getElementById('lupa-q').focus();},200);
}
function fecharLupa(){ var o=document.getElementById('lupa-ov'); if(o) o.style.display='none'; }
async function perguntarLupa(){
  var q=document.getElementById('lupa-q').value.trim();
  if(q.length<3) return;
  document.getElementById('lupa-env').disabled=true;
  document.getElementById('lupa-resp').innerHTML='<div style="color:#0f6d78;text-align:center;padding:16px;font-weight:700">🔎 Buscando na lição…</div>';
  try{
    var r=await fetch('/api/ebd-lupa',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({token:'radar-elias-2026',licao:_lupaLicao,revista:_lupaTurma,pergunta:q})});
    var d=await r.json();
    if(d.ok){
      document.getElementById('lupa-resp').innerHTML=
        '<div style="background:#f6faf7;border:1px solid #d7ecdd;border-radius:12px;padding:13px 14px">'+
        d.resposta.replace(/</g,'&lt;').replace(/\n/g,'<br>')+'</div>'+
        '<div style="font-size:.76rem;color:#9aa1ad;text-align:center;margin-top:10px">Auxiliar de estudo · para decisões, confirme com seu pastor</div>';
    }else{
      document.getElementById('lupa-resp').innerHTML='<div style="color:#8a1c1c;text-align:center;padding:14px">Não consegui responder agora. Tente de novo em instantes.</div>';
    }
  }catch(e){ document.getElementById('lupa-resp').innerHTML='<div style="color:#8a1c1c;text-align:center;padding:14px">Sem conexão agora.</div>'; }
  document.getElementById('lupa-env').disabled=false;
  document.getElementById('lupa-q').value='';
}
document.addEventListener('keydown',function(e){ if(e.key==='Enter'&&document.activeElement&&document.activeElement.id==='lupa-q'){ e.preventDefault(); perguntarLupa(); }});

/* ═══════════════ AVISO INTELIGENTE — o app toca e FALA (EBD/eventos) ═══════════════
   Quando você abre o app no sábado ou domingo, ele mostra um alerta, dá um chime
   e fala em voz alta qual é a lição da EBD. 1x por dia. Voz pode ser desligada. */
(function(){
  function hoje0(){ var d=new Date(); d.setHours(0,0,0,0); return d; }
  // nº e título da lição do próximo domingo (usa a função que o app já tem)
  function ebdProxima(){
    var n=0;
    try{ n=(typeof licaoDaSemana==='function')?licaoDaSemana():0; }catch(_){ n=0; }
    var tit='';
    try{
      if(typeof EBD_LICOES!=='undefined' && EBD_LICOES.adulto){
        var it=EBD_LICOES.adulto.find(function(x){ return x.n===n; });
        if(it) tit=it.titulo||'';
      }
    }catch(_){}
    return {n:n, titulo:tit};
  }
  // chime agradável (3 notas) via WebAudio
  function chime(){
    try{
      var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
      var ac=new AC(); var notas=[523.25,659.25,783.99]; var t=ac.currentTime;
      notas.forEach(function(f,i){
        var o=ac.createOscillator(), g=ac.createGain();
        o.type='sine'; o.frequency.value=f; o.connect(g); g.connect(ac.destination);
        var s=t+i*0.16; g.gain.setValueAtTime(0.0001,s);
        g.gain.exponentialRampToValueAtTime(0.28,s+0.03);
        g.gain.exponentialRampToValueAtTime(0.0001,s+0.42);
        o.start(s); o.stop(s+0.45);
      });
    }catch(_){}
  }
  // fala pt-BR
  function falar(txt){
    try{
      if(localStorage.getItem('aviso_voz')==='off') return;
      if(!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      var u=new SpeechSynthesisUtterance(txt);
      u.lang='pt-BR'; u.rate=0.98; u.pitch=1;
      var vs=speechSynthesis.getVoices()||[];
      var pt=vs.find(function(v){ return /pt.?BR/i.test(v.lang); })||vs.find(function(v){ return /^pt/i.test(v.lang); });
      if(pt) u.voice=pt;
      speechSynthesis.speak(u);
    }catch(_){}
  }
  function tocar(txt){ chime(); }  /* só som (chime), sem voz */

  function fechar(){ var o=document.getElementById('aviso-int'); if(o) o.remove(); }
  function mudo(){
    var off=localStorage.getItem('aviso_voz')==='off';
    localStorage.setItem('aviso_voz', off?'on':'off');
    try{ if(!off) speechSynthesis.cancel(); }catch(_){}
    var b=document.getElementById('aviso-mudo'); if(b) b.textContent = off?'🔔 Voz ligada':'🔕 Voz desligada';
  }
  window._avisoMudo=mudo;

  function mostrar(tituloMsg, corpo, fala){
    fechar();
    var off=localStorage.getItem('aviso_voz')==='off';
    var o=document.createElement('div');
    o.id='aviso-int';
    o.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(8,20,34,.55);display:flex;align-items:flex-start;justify-content:center;padding:calc(18px + env(safe-area-inset-top)) 16px 16px;animation:avfade .25s';
    o.innerHTML=''+
     '<div style="background:#fff;max-width:440px;width:100%;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.35)">'+
       '<div style="background:linear-gradient(135deg,#0f3d5c,#0f6d78);color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px">'+
         '<div style="font-size:30px;animation:avring 1.2s infinite">🔔</div>'+
         '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:1.12rem;line-height:1.15">'+tituloMsg+'</div>'+
         '<div style="color:#cfe3ec;font-size:.8rem">Aviso do RADAR</div></div>'+
       '</div>'+
       '<div style="padding:16px 18px;color:#1c2230;font-size:1.05rem;line-height:1.5">'+corpo+'</div>'+
       '<div style="display:flex;gap:9px;padding:0 16px 16px">'+
         '<button onclick="_avisoTocar()" style="flex:1;background:#a9791c;color:#fff;border:none;border-radius:12px;padding:13px;font-weight:800;font-family:inherit;font-size:1rem;cursor:pointer">🔔 Tocar de novo</button>'+
         '<button onclick="document.getElementById(\'aviso-int\').remove()" style="flex:1;background:#0f3d5c;color:#fff;border:none;border-radius:12px;padding:13px;font-weight:800;font-family:inherit;font-size:1rem;cursor:pointer">OK, entendi</button>'+
       '</div>'+
     '</div>';
    document.body.appendChild(o);
    o.addEventListener('click',function(e){ if(e.target===o) fechar(); });
    window._avisoTocar=function(){ tocar(fala); };
    tocar(fala);
  }

  function rodar(){
    var d=hoje0(), dow=d.getDay(); // 0=dom .. 6=sáb
    if(dow!==6 && dow!==0) return;            // só avisa no fim de semana (sáb/dom)
    var chave='aviso_'+d.toISOString().slice(0,10);
    if(localStorage.getItem(chave)) return;   // já avisou hoje
    var e=ebdProxima();
    if(!e.n || e.n<1) return;
    var quando = (dow===6)?'Amanhã é domingo — tem EBD!':'Hoje tem EBD!';
    var falaQuando = (dow===6)?'Amanhã é domingo. Tem escola bíblica.':'Hoje tem escola bíblica dominical.';
    var corpo = '<b>Lição '+e.n+'</b>'+(e.titulo?': '+e.titulo:'')+'.';
    var fala = falaQuando+' A lição '+e.n+(e.titulo?': '+e.titulo:'')+'.';
    localStorage.setItem(chave,'1');
    mostrar(quando, corpo, fala);
  }

  // as vozes carregam assíncrono; espera a home assentar
  if('speechSynthesis' in window){ try{ speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged=function(){}; }catch(_){} }
  if(document.readyState==='complete') setTimeout(rodar,1400);
  else window.addEventListener('load', function(){ setTimeout(rodar,1400); });
})();

/* ═══════════════ PUSH — avisos com o app FECHADO (apita o celular) ═══════════════ */
(function(){
  var VAPID='BM9z6FNx-VTiqq2tn_juuW3Qqt7zRsNFwtmYjX290tV1NgkmjhIqLTzYHx3svqzgjMgrP6LiG7EsdKl--DIg85g';
  function b64(s){ var pad='='.repeat((4-s.length%4)%4); var b=(s+pad).replace(/-/g,'+').replace(/_/g,'/'); var raw=atob(b); var arr=new Uint8Array(raw.length); for(var i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i); return arr; }
  function suportado(){ return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window); }
  async function inscrever(){
    var reg=await navigator.serviceWorker.ready;
    var sub=await reg.pushManager.getSubscription();
    if(!sub){ sub=await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64(VAPID)}); }
    var j=sub.toJSON();
    await fetch('/api/videos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({acao:'push-sub', sub:{endpoint:j.endpoint, keys:j.keys}})});
    return true;
  }
  function fecharPrompt(){ var p=document.getElementById('push-prompt'); if(p) p.remove(); }
  window._pushDispensar=function(){ localStorage.setItem('push_dispensado','1'); fecharPrompt(); };
  window._ativarAvisos=async function(){
    try{
      if(!suportado()){ alert('Para receber avisos no iPhone, primeiro adicione o app à tela inicial (compartilhar → Adicionar à Tela de Início). No Android já funciona.'); return; }
      var p=await Notification.requestPermission();
      if(p!=='granted'){ localStorage.setItem('push_dispensado','1'); fecharPrompt(); return; }
      await inscrever();
      localStorage.setItem('push_ok','1'); fecharPrompt();
      var t=document.createElement('div'); t.textContent='✓ Avisos ativados!';
      t.style.cssText='position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#14804a;color:#fff;padding:11px 18px;border-radius:999px;font-weight:800;z-index:99999';
      document.body.appendChild(t); setTimeout(function(){t.remove();},1800);
    }catch(e){ localStorage.setItem('push_dispensado','1'); fecharPrompt(); }
  };
  function mostrarPrompt(){
    if(document.getElementById('push-prompt')||document.getElementById('aviso-int')) return;
    var p=document.createElement('div'); p.id='push-prompt';
    p.style.cssText='position:fixed;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));max-width:440px;margin:0 auto;background:#fff;border:1px solid #e4e7ec;border-radius:16px;box-shadow:0 12px 34px rgba(0,0,0,.22);z-index:9998;padding:14px 15px;display:flex;align-items:center;gap:12px';
    p.innerHTML='<div style="font-size:26px">🔔</div>'+
      '<div style="flex:1;min-width:0"><div style="font-weight:800;color:#0f3d5c">Ativar avisos do RADAR</div>'+
      '<div style="font-size:.84rem;color:#5c6470;line-height:1.35">A lição da EBD e novidades chegam pra você — mesmo com o app fechado.</div></div>'+
      '<div style="display:flex;flex-direction:column;gap:6px">'+
      '<button onclick="_ativarAvisos()" style="background:#0f3d5c;color:#fff;border:none;border-radius:10px;padding:9px 14px;font-weight:800;font-family:inherit;cursor:pointer">Ativar</button>'+
      '<button onclick="_pushDispensar()" style="background:none;border:none;color:#8a91a0;font-family:inherit;font-size:.78rem;cursor:pointer">agora não</button></div>';
    document.body.appendChild(p);
  }
  function iniciar(){
    if(!suportado()) return;
    if(Notification.permission==='granted'){ inscrever().catch(function(){}); return; }  // já aceitou → renova inscrição
    if(Notification.permission==='denied') return;
    if(localStorage.getItem('push_dispensado')||localStorage.getItem('push_ok')) return;
    setTimeout(mostrarPrompt, 6500);  // deixa o alerta inteligente aparecer primeiro
  }
  if(document.readyState==='complete') iniciar();
  else window.addEventListener('load', iniciar);
})();
