/* _refs.js — toda referência bíblica vira um toque que abre o versículo,
   com botão "✕ Voltar à mensagem". Usa /biblia.json (Almeida), carregada só ao 1º toque.
   Uso: <script src="_refs.js" defer></script> em cada mensagem e no Fixar na Mente. */
(function(){
  if(window.__refsInit) return; window.__refsInit=true;

  // nome/abbrev (normalizado: minúsculo, sem acento, sem espaço/ponto) -> sigla do biblia.json
  var MAP = {
    genesis:'gn',gn:'gn', exodo:'ex',ex:'ex', levitico:'lv',lv:'lv', numeros:'nm',nm:'nm',
    deuteronomio:'dt',dt:'dt', josue:'js',js:'js', juizes:'jz',jz:'jz', rute:'rt',rt:'rt',
    '1samuel':'1sm','1sm':'1sm', '2samuel':'2sm','2sm':'2sm', '1reis':'1rs','1rs':'1rs', '2reis':'2rs','2rs':'2rs',
    '1cronicas':'1cr','1cr':'1cr', '2cronicas':'2cr','2cr':'2cr', esdras:'ed',ed:'ed', neemias:'ne',ne:'ne', ester:'et',et:'et',
    jo:'jó', salmos:'sl',salmo:'sl',sl:'sl', proverbios:'pv',pv:'pv', eclesiastes:'ec',ec:'ec',
    cantares:'ct',canticos:'ct',cantico:'ct',ct:'ct', isaias:'is',is:'is', jeremias:'jr',jr:'jr',
    lamentacoes:'lm',lm:'lm', ezequiel:'ez',ez:'ez', daniel:'dn',dn:'dn', oseias:'os',os:'os', joel:'jl',jl:'jl',
    amos:'am',am:'am', obadias:'ob',ob:'ob', jonas:'jn',jn:'jn', miqueias:'mq',mq:'mq', naum:'na',na:'na',
    habacuque:'hc',hc:'hc', sofonias:'sf',sf:'sf', ageu:'ag',ag:'ag', zacarias:'zc',zc:'zc', malaquias:'ml',ml:'ml',
    mateus:'mt',mt:'mt', marcos:'mc',mc:'mc', lucas:'lc',lc:'lc', joao:'jo', atos:'atos',at:'atos',
    romanos:'rm',rm:'rm', '1corintios':'1co','1co':'1co', '2corintios':'2co','2co':'2co',
    galatas:'gl',gl:'gl', efesios:'ef',ef:'ef', filipenses:'fp',fp:'fp', colossenses:'cl',cl:'cl',
    '1tessalonicenses':'1ts','1ts':'1ts', '2tessalonicenses':'2ts','2ts':'2ts',
    '1timoteo':'1tm','1tm':'1tm', '2timoteo':'2tm','2tm':'2tm', tito:'tt',tt:'tt', filemom:'fm',fm:'fm',
    hebreus:'hb',hb:'hb', tiago:'tg',tg:'tg', '1pedro':'1pe','1pe':'1pe', '2pedro':'2pe','2pe':'2pe',
    '1joao':'1jo','1jo':'1jo', '2joao':'2jo','2jo':'2jo', '3joao':'3jo','3jo':'3jo', judas:'jd',jd:'jd', apocalipse:'ap',ap:'ap'
  };
  var NOMES = {gn:'Gênesis',ex:'Êxodo',lv:'Levítico',nm:'Números',dt:'Deuteronômio',js:'Josué',jz:'Juízes',rt:'Rute',
    '1sm':'1 Samuel','2sm':'2 Samuel','1rs':'1 Reis','2rs':'2 Reis','1cr':'1 Crônicas','2cr':'2 Crônicas',ed:'Esdras',ne:'Neemias',et:'Ester',
    'jó':'Jó',sl:'Salmos',pv:'Provérbios',ec:'Eclesiastes',ct:'Cantares',is:'Isaías',jr:'Jeremias',lm:'Lamentações',ez:'Ezequiel',dn:'Daniel',
    os:'Oseias',jl:'Joel',am:'Amós',ob:'Obadias',jn:'Jonas',mq:'Miqueias',na:'Naum',hc:'Habacuque',sf:'Sofonias',ag:'Ageu',zc:'Zacarias',ml:'Malaquias',
    mt:'Mateus',mc:'Marcos',lc:'Lucas',jo:'João',atos:'Atos',rm:'Romanos','1co':'1 Coríntios','2co':'2 Coríntios',gl:'Gálatas',ef:'Efésios',
    fp:'Filipenses',cl:'Colossenses','1ts':'1 Tessalonicenses','2ts':'2 Tessalonicenses','1tm':'1 Timóteo','2tm':'2 Timóteo',tt:'Tito',fm:'Filemom',
    hb:'Hebreus',tg:'Tiago','1pe':'1 Pedro','2pe':'2 Pedro','1jo':'1 João','2jo':'2 João','3jo':'3 João',jd:'Judas',ap:'Apocalipse'};

  function norm(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[.\s]/g,''); }

  var RE = /([123]?)\s?([A-Za-zÀ-ÿçÇ]{2,16})\.?\s*(\d{1,3})(?::(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?/g;

  function skip(p){
    while(p && p.nodeType===1){
      var t=p.nodeName.toLowerCase();
      if(t==='a'||t==='button'||t==='script'||t==='style'||t==='textarea') return true;
      if(p.classList && (p.classList.contains('ref-link')||p.classList.contains('refmodal')||p.classList.contains('lm-panel'))) return true;
      p=p.parentNode;
    }
    return false;
  }

  function scan(root){
    if(!root) return;
    var walker=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode:function(n){
        if(!n.nodeValue || n.nodeValue.indexOf(':')<0 && !/\d/.test(n.nodeValue)) return NodeFilter.FILTER_SKIP;
        if(!/\d/.test(n.nodeValue)) return NodeFilter.FILTER_SKIP;
        if(skip(n.parentNode)) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(processNode);
  }

  function processNode(node){
    var text=node.nodeValue, m, last=0, frag=null;
    RE.lastIndex=0;
    while((m=RE.exec(text))){
      var key=norm((m[1]||'')+m[2]);
      var ab=MAP[key];
      if(!ab) continue;
      // exige pelo menos capítulo (m[3]); versículo é opcional
      if(!m[3]) continue;
      if(!frag) frag=document.createDocumentFragment();
      if(m.index>last) frag.appendChild(document.createTextNode(text.slice(last,m.index)));
      var a=document.createElement('a');
      a.className='ref-link'; a.href='javascript:void(0)';
      a.setAttribute('data-ab',ab); a.setAttribute('data-c',m[3]);
      if(m[4]) a.setAttribute('data-v',m[4]);
      if(m[5]) a.setAttribute('data-v2',m[5]);
      a.textContent=m[0];
      frag.appendChild(a);
      last=m.index+m[0].length;
    }
    if(frag){
      if(last<text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      if(node.parentNode) node.parentNode.replaceChild(frag,node);
    }
  }

  // estilo do link + balão
  var css=''
   +'.ref-link{color:#0f6d78;text-decoration:none;border-bottom:1px dotted #0f6d78;cursor:pointer;font-weight:600}'
   +'.ref-link:active{opacity:.6}'
   +'.refmodal{position:fixed;inset:0;z-index:90;display:none}'
   +'.refmodal.on{display:block}'
   +'.refmodal .bk{position:absolute;inset:0;background:rgba(10,22,36,.55)}'
   +'.refmodal .cd{position:absolute;left:0;right:0;bottom:0;max-width:820px;margin:0 auto;background:#fff;border-radius:20px 20px 0 0;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 -8px 30px rgba(0,0,0,.3)}'
   +'.refmodal .hd{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #eef0f3}'
   +'.refmodal .hd b{font-family:Georgia,serif;color:#0f3d5c;font-size:1.12rem}'
   +'.refmodal .bd{overflow-y:auto;padding:14px 16px}'
   +'.refmodal .bd p{margin:0 0 10px;font-size:1.06rem;line-height:1.6;color:#1c2230;text-align:justify}'
   +'.refmodal .bd p b{color:#a9791c;font-weight:800;margin-right:2px}'
   +'.refmodal .ft{padding:10px 14px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #eef0f3}'
   +'.refmodal .volta{display:block;width:100%;background:linear-gradient(135deg,#0f6d78,#0f3d5c);color:#fff;border:none;border-radius:13px;padding:14px;font-size:1.03rem;font-weight:800;font-family:inherit;cursor:pointer}';
  var st=document.createElement('style'); st.textContent=css; (document.head||document.documentElement).appendChild(st);

  var modal=null;
  function ensureModal(){
    if(modal) return modal;
    modal=document.createElement('div'); modal.className='refmodal';
    modal.innerHTML='<div class="bk"></div><div class="cd">'
      +'<div class="hd"><b id="ref-tit"></b><button id="ref-x" style="background:#eef2f4;border:none;border-radius:50%;width:32px;height:32px;font-size:1rem;font-weight:800;color:#0f3d5c;cursor:pointer">✕</button></div>'
      +'<div class="bd" id="ref-bd"></div>'
      +'<div class="ft"><button class="volta" id="ref-volta">✕ Voltar à mensagem</button></div>'
      +'</div>';
    document.body.appendChild(modal);
    function close(){ modal.classList.remove('on'); }
    modal.querySelector('.bk').addEventListener('click',close);
    modal.querySelector('#ref-x').addEventListener('click',close);
    modal.querySelector('#ref-volta').addEventListener('click',close);
    return modal;
  }

  var biblia=null, idx=null, carregando=null;
  function carregar(){
    if(biblia) return Promise.resolve();
    if(carregando) return carregando;
    carregando=fetch('/biblia.json').then(function(r){return r.text();}).then(function(t){
      biblia=JSON.parse(t.replace(/^﻿/,''));
      idx={}; biblia.forEach(function(b,i){ idx[b.abbrev]=i; });
    });
    return carregando;
  }

  function openRef(ab,c,v,v2,label){
    var mo=ensureModal(); mo.classList.add('on');
    document.getElementById('ref-tit').textContent=label||(NOMES[ab]+' '+c);
    var bd=document.getElementById('ref-bd');
    bd.innerHTML='<p style="color:#0f6d78">Abrindo o versículo…</p>';
    carregar().then(function(){
      var bi=idx[ab]; if(bi==null){ bd.innerHTML='<p>Não encontrei esse livro.</p>'; return; }
      var ch=biblia[bi].chapters[c-1];
      if(!ch){ bd.innerHTML='<p>Capítulo não encontrado.</p>'; return; }
      var html='', ini, fim;
      if(v){ ini=parseInt(v,10); fim=v2?parseInt(v2,10):ini; }
      else { ini=1; fim=ch.length; }
      if(fim>ch.length) fim=ch.length;
      for(var i=ini;i<=fim;i++){ if(ch[i-1]!=null) html+='<p><b>'+i+'</b>'+esc(ch[i-1])+'</p>'; }
      document.getElementById('ref-tit').textContent=(NOMES[ab]||ab)+' '+c+(v?(':'+v+(v2?'-'+v2:'')):'');
      bd.innerHTML=html||'<p>Versículo não encontrado.</p>';
      bd.scrollTop=0;
    }).catch(function(){ bd.innerHTML='<p style="color:#b91c1c">Não deu pra abrir agora. Tente de novo.</p>'; });
  }
  function esc(s){ return ' '+(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  document.addEventListener('click', function(e){
    var a=e.target.closest ? e.target.closest('.ref-link') : null;
    if(!a) return;
    e.preventDefault();
    openRef(a.getAttribute('data-ab'), parseInt(a.getAttribute('data-c'),10), a.getAttribute('data-v'), a.getAttribute('data-v2'), a.textContent);
  });

  function start(){
    scan(document.body);
    // conteúdo que aparece depois (abas do Fixar, etc.)
    try{
      var obs=new MutationObserver(function(muts){
        var adds=[];
        muts.forEach(function(m){ for(var i=0;i<m.addedNodes.length;i++){ var nn=m.addedNodes[i]; if(nn.nodeType===1 && !skip(nn)) adds.push(nn); } });
        if(adds.length){ obs.disconnect(); adds.forEach(function(el){ if(el.isConnected) scan(el); }); obs.observe(document.body,{childList:true,subtree:true}); }
      });
      obs.observe(document.body,{childList:true,subtree:true});
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ setTimeout(start,60); });
  else setTimeout(start,60);
})();
