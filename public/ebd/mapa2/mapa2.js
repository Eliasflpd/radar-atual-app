/* Mapa mental ilustrado (16/11/2026, pedido do Elias: "visual impecável, animado, imagens, desenhos, links").
   Cada mapa-NN.html só traz os DADOS da lição; aqui o cartaz é montado, desenhado e animado.
   O texto é o da revista (não é imagem de IA); só os desenhos vêm do ChatGPT (pasta ic/). */
(function(){
var D=window.DADOS||{}, CFG=window.MAPA||{};
var CORES=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)'];
var IC='/ebd/mapa2/ic/';
function sa(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
function esc(t){return String(t||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

/* desenho de cada quadro: palavras da revista -> figurinha */
var DIC={templo:'templo|casa de deus|santuario|reconstrucao do templo',pergaminho:'profecia|profet|escrit|carta|autor|mensagem|oraculo|sentenc',cidade:'jerusalem|cidade|muro|muralha|siao|judeia',coroa:'rei |reis|reino|reinad|realeza|trono|soberan',castical:'castical|candelabro|menora|candeeiro',oliveira:'oliveira|ungid|azeite',pomba:'espirito|paz ',trombeta:'trombeta|alarde|toque',espada:'guerra|inimig|batalha|combate|espada',balanca:'justica|juizo|julg|retribui|direito',coracao:'coracao|amor|sincer|afeto|compaix',chave:'chave|acesso|entrada ao|segredo',globo:'nacoes|mundo|gentio|povos|terra inteira',cavalo:'cavalo|cavaleiro',cordel:'cordel|medir|medida',pedra:'pedra|alicerce|fundament|angular',chama:'fogo|ira |indignac|zelo|queima',fonte:'agua|fonte|lavar|purifica',cruz:'cruz|calvario|crucific|redenc|expiac',cordeiro:'cordeiro|sacrificio',pastor:'pastor|ovelha|rebanho|cajado',calice:'calice|sangue|concerto|alianca nova',pao:' pao|pães|maná',oracao:'oracao|orar|ora |jejum|clam|suplic|intercess',olho:'visao|visoes|vidente|olhar|olhos|ver ',gloria:'gloria|presenca|ceu|celest|majest',montanha:'monte|montanha',caminho:'caminho|voltar|retorno|tornai|convert|volta',sol:'esperanc|futuro|amanhecer|restaur',ampulheta:'tempo|ano |anos|data|cronolog|historic|epoca|periodo',altar:'altar|oferta|holocausto',incenso:'incenso|aroma',mitra:'sumo sacerdote|sacerdo|levita',escudo:'protec|defesa|guarda|livramento|seguranc',ancora:'firme|ancora|perseveran|constan',trofeu:'vitoria|vencer|galardao|premio|recompensa',corredor:'corrida|carreira|correr|alvo',arvore:'raiz|fruto|arvore',broto:'renovo|broto|crescimento|nascer',corrente:'cativeiro|exilio|escrav|liberta|prisao',portas:'porta|portao',tenda:'tabernaculo|tenda',arca:'arca|alianca',tabuas:'lei |lei,|leis|mandament|moises|estatuto',moedas:'prata|dinheiro|moeda|avareza|riqueza',martelo:'ferreiro|construc|edific|obra',chifres:'chifre',cesto:'efa|cesto',carro:'carro|carros',rolovoante:'rolo voante|maldic',vestes:'vestes|veste|roupa|vestid|trajes',lampada:'luz|lampada|ilumin',megafone:'anunci|prega|proclam|testemunh',lupa:'estudo|examin|natureza|estrutura|entender|compreen',livros:'novo testamento|antigo testamento|livros|epistola',biblia:'palavra|biblia|escritura'};
var RESERVA=['biblia','pergaminho','lupa','livros','lampada','gloria','caminho','sol'];
var usados={};
function escolhe(titulo,texto,forca){
  if(forca){usados[forca]=1;return forca;}
  var t=' '+sa(titulo)+' ', x=' '+sa(texto)+' ', melhor=null, nota=0;
  Object.keys(DIC).forEach(function(k){
    var n=0; DIC[k].split('|').forEach(function(p){ if(t.indexOf(p)>=0)n+=4; if(x.indexOf(p)>=0)n+=1; });
    if(usados[k])n-=3.5;
    if(n>nota){nota=n;melhor=k;}
  });
  if(!melhor){ for(var i=0;i<RESERVA.length;i++){ if(!usados[RESERVA[i]]){melhor=RESERVA[i];break;} } melhor=melhor||'biblia'; }
  usados[melhor]=1; return melhor;
}

/* referências bíblicas viram link para a Bíblia do app */
var LIV='Gn|Êx|Ex|Lv|Nm|Dt|Js|Jz|Rt|1 Sm|2 Sm|1 Rs|2 Rs|1 Cr|2 Cr|Ed|Ne|Et|Jó|Sl|Pv|Ec|Ct|Is|Jr|Lm|Ez|Dn|Os|Jl|Am|Ob|Jn|Mq|Na|Hc|Sf|Ag|Zc|Ml|Mt|Mc|Lc|Jo|At|Rm|1 Co|2 Co|Gl|Ef|Fp|Cl|1 Ts|2 Ts|1 Tm|2 Tm|Tt|Fm|Hb|Tg|1 Pe|2 Pe|1 Jo|2 Jo|3 Jo|Jd|Ap';
var RX=new RegExp('\\b(?:'+LIV+')\\s?\\d+(?:[.:]\\d+(?:[-–,]\\d+)*)?(?:;\\s?\\d+[.:]\\d+(?:[-–,]\\d+)*)*','g');
function linka(t){ return esc(t).replace(RX,function(m){return '<span class="ref" data-ref="'+m+'">'+m+'</span>';}); }
function manda(ref){ if(window.parent&&window.parent!==window){ try{window.parent.postMessage({type:'ebd-ref',ref:ref},'*');}catch(e){} } }
document.addEventListener('click',function(e){ var r=e.target.closest('.ref'); if(r){ e.stopPropagation(); manda(r.dataset.ref); } },true);

/* data da lição: 1º tri 2027 começa em 3 de janeiro */
function dataLicao(n){ var m=['janeiro','fevereiro','março','abril'], d=new Date(2027,0,3+7*(n-1)); return d.getDate()+' de '+m[d.getMonth()]+' de 2027'; }

function monta(){
  var titulo=String(D.centro||'').split(':')[0].trim(), pal=titulo.split(' '), ult=pal.pop();
  var ramos=D.ramos||[], h='';
  var icC=escolhe(titulo, D.centro+' '+(D.pratica||''), CFG.centro);
  var dl=0.35;
  h+='<div class="centro"><img class="ilu" src="'+IC+icC+'.webp" alt=""><div class="caixa"><div class="num">Lição '+D.n+' · Mapa mental</div><h1>'+esc(pal.join(' '))+' <em>'+esc(ult)+'</em></h1><div class="data">'+dataLicao(D.n)+'</div></div></div>';
  ramos.forEach(function(r,i){
    var lado=(i%2===0)?'e':'d', cor=CORES[i%CORES.length], d0=dl+0.55+i*0.55;
    /* com 3 ramos, o terceiro vai embaixo ocupando a largura (abaixo do centro); com 4, fica 2 e 2 */
    var baixo=ramos.length===3&&i===2;
    h+='<section class="ramo '+(baixo?'baixo':lado)+'" data-i="'+i+'" style="--cor:'+cor+';--d:'+d0.toFixed(2)+'">';
    var icR=escolhe(r.titulo,r.sinopse||'',(CFG.icones||{})['r'+i]);
    h+='<div class="cab"><span class="bola">'+(i+1)+'</span><img class="ric" src="'+IC+icR+'.webp" alt=""><span class="tit">'+esc(r.titulo)+'</span></div>';
    if(r.sinopse) h+='<p class="sin">'+linka(r.sinopse)+'</p>';
    h+='<div class="filhos">';
    (r.filhos||[]).forEach(function(f,j){
      var ic=escolhe(f.titulo,(f.folhas||[]).join(' ')+' '+r.titulo,(CFG.icones||{})[i+'.'+j]);
      f._ic=ic;
      h+='<button class="filho" data-i="'+i+'" data-j="'+j+'" style="--d:'+(d0+0.35+j*0.14).toFixed(2)+';--f:'+((i*3+j)%5)+'"><img src="'+IC+ic+'.webp" alt=""><span><span class="ft">'+esc(f.titulo)+'</span></span></button>';
    });
    h+='</div></section>';
  });
  document.querySelector('.grade').innerHTML=h;
  var dr=dl+0.55+ramos.length*0.55+0.6, rod='';
  if(D.aureo&&D.aureo.texto) rod+='<div class="aureo" style="--d:'+dr.toFixed(2)+'"><img src="'+IC+'pergaminho.webp" alt=""><div><div class="r">'+esc(CFG.rotAureo||'Texto Áureo')+'</div><p>“'+esc(D.aureo.texto)+'” <span class="ref" data-ref="'+esc(D.aureo.ref)+'">'+esc(D.aureo.ref)+'</span></p></div></div>';
  if(D.pratica) rod+='<div class="pratica" style="--d:'+(dr+0.2).toFixed(2)+'"><img src="'+IC+'lampada.webp" alt=""><div><div class="r">'+(CFG.rotPratica||'Verdade Prática')+'</div><p>'+linka(D.pratica)+'</p></div></div>';
  document.querySelector('.rodape').innerHTML=rod;
}

/* fios: centro -> ramo (grosso) e ramo -> quadro (fino), desenhados com animação */
function fios(animar){
  var svg=document.getElementById('fios'), palco=document.getElementById('palco'), P=palco.getBoundingClientRect();
  var largo=window.innerWidth>=900, h='';
  /* posição pelo layout (offset), não pelo getBoundingClientRect: a animação de entrada muda a escala e os fios sairiam tortos */
  var palco=document.getElementById('palco');
  function box(el){var x=0,y=0,e=el;while(e&&e!==palco){x+=e.offsetLeft;y+=e.offsetTop;e=e.offsetParent;}return{x:x,y:y,w:el.offsetWidth,h:el.offsetHeight};}
  var c=box(document.querySelector('.centro .caixa'));
  document.querySelectorAll('.ramo').forEach(function(r,i){
    var cor=getComputedStyle(r).getPropertyValue('--cor'), d0=parseFloat(r.style.getPropertyValue('--d'));
    var b=box(r.querySelector('.bola')), bx=b.x+b.w/2, by=b.y+b.h/2, x0,y0,p;
    if(largo && r.classList.contains('baixo')){
      /* ramo de baixo: sai da borda inferior da caixa central, no meio, e desce até a bolinha */
      x0=c.x+c.w/2; y0=c.y+c.h; var meio=(y0+b.y)/2;
      p='M'+x0+','+y0+' C'+x0+','+meio+' '+bx+','+meio+' '+bx+','+b.y;
    } else if(largo){
      /* sempre sai da borda da caixa central (nunca de dentro dela, por cima do texto) */
      var esq=r.classList.contains('e'); x0=esq?c.x:c.x+c.w; y0=Math.max(c.y+30,Math.min(c.y+c.h-30,by));
      var bx2=esq?b.x+b.w:b.x, mx=(x0+bx2)/2;
      p='M'+x0+','+y0+' C'+mx+','+y0+' '+mx+','+by+' '+bx2+','+by;
    } else {
      /* celular: o tronco desce pela calha da esquerda (onde não há texto), do centro ou do ramo anterior até a bolinha */
      var anterior=i>0?box(document.querySelectorAll('.ramo')[i-1]):null;
      y0=anterior?anterior.y+anterior.h:c.y+c.h-4;
      p='M'+bx+','+y0+' L'+bx+','+b.y;
    }
    h+='<path d="'+p+'" stroke="'+cor+'" stroke-width="'+(largo?9:7)+'" data-d="'+(d0-0.3)+'" data-t=".7"/>';
    r.querySelectorAll('.filho').forEach(function(f){
      /* cada quadro (cartão vertical) é ligado pelo topo, no centro dele */
      var q=box(f), fd=parseFloat(f.style.getPropertyValue('--d')), qx=q.x+q.w/2, ty=q.y+6;
      var pp;
      if(largo){ pp='M'+bx+','+(b.y+b.h)+' C'+bx+','+(ty-22)+' '+qx+','+(ty-22)+' '+qx+','+ty; }
      else { /* celular: saída horizontal do tronco até a borda esquerda do cartão, na altura do meio dele */
        var my=q.y+q.h/2; pp='M'+bx+','+my+' L'+q.x+','+my; }
      h+='<path d="'+pp+'" stroke="'+cor+'" stroke-width="3.5" opacity=".75" data-d="'+(fd-0.25)+'" data-t=".45"/>';
    });
    /* celular: o tronco da bolinha desce pela calha até o último cartão, de onde saem as saídas horizontais */
    if(!largo){ var fs=r.querySelectorAll('.filho'); if(fs.length){ var ul=box(fs[fs.length-1]); var fm=ul.y+ul.h/2;
      h+='<path d="M'+bx+','+(b.y+b.h)+' L'+bx+','+fm+'" stroke="'+cor+'" stroke-width="3.5" opacity=".75" data-d="'+(d0+0.2)+'" data-t=".5"/>'; } }
  });
  svg.setAttribute('viewBox','0 0 '+P.width+' '+palco.scrollHeight);
  svg.style.height=palco.scrollHeight+'px';
  svg.innerHTML=h;
  svg.querySelectorAll('path').forEach(function(p){
    var L=p.getTotalLength(); p.style.strokeDasharray=L;
    if(animar){ p.style.strokeDashoffset=L; p.getBoundingClientRect();
      p.style.transition='stroke-dashoffset '+p.dataset.t+'s ease-out '+p.dataset.d+'s'; p.style.strokeDashoffset=0; }
    else p.style.strokeDashoffset=0;
  });
}

function abre(i,j){
  var r=D.ramos[i], f=r.filhos[j], F=document.getElementById('folha');
  F.style.setProperty('--cor',CORES[i%CORES.length]);
  F.innerHTML='<div class="fcab"><img src="'+IC+f._ic+'.webp" alt=""><div><div class="fram">'+(i+1)+' · '+esc(r.titulo)+'</div><h2>'+esc(f.titulo)+'</h2>'+(f.ref?'<span class="ref" data-ref="'+esc(f.ref)+'">'+esc(f.ref)+'</span>':'')+'</div></div><ul>'+(f.folhas||[]).map(function(x){return '<li>'+linka(x)+'</li>';}).join('')+'</ul><button class="fechar">Fechar</button>';
  document.body.classList.add('aberto');
}
function fecha(){document.body.classList.remove('aberto');}

function rever(){
  var g=document.getElementById('palco'); g.classList.remove('ani'); void g.offsetWidth; g.classList.add('ani'); fios(true);
}

document.addEventListener('DOMContentLoaded',function(){
  monta();
  /* figurinha que não carrega (ainda falta gerar) some sem quebrar o layout */
  /* figurinha que falta: troca por uma reserva já pronta (nunca fica vazio); se nem a reserva carregar, some */
  document.addEventListener('error',function(e){ var t=e.target; if(!t||t.tagName!=='IMG') return;
    if(!t.dataset.reserva){ t.dataset.reserva='1'; var RES=['biblia','templo','pergaminho','coroa','castical','oliveira','pomba','trombeta'];
      window.__reserva=((window.__reserva||0)+1)%RES.length; t.src=IC+RES[window.__reserva]+'.webp'; } else t.style.display='none'; },true);
  document.getElementById('palco').classList.add('ani');
  document.querySelector('.grade').addEventListener('click',function(e){ var b=e.target.closest('.filho'); if(b) abre(+b.dataset.i,+b.dataset.j); });
  document.getElementById('veu').onclick=fecha;
  document.getElementById('folha').addEventListener('click',function(e){ if(e.target.closest('.fechar')) fecha(); });
  document.getElementById('b-voltar').onclick=function(){ if(window.parent&&window.parent!==window){ try{window.parent.postMessage({type:'ebd-voltar'},'*');}catch(e){} } else if(history.length>1) history.back(); };
  document.getElementById('b-rever').onclick=rever;
  var pronto=function(){ fios(true); };
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){ setTimeout(pronto,60); });
  var t; window.addEventListener('resize',function(){ clearTimeout(t); t=setTimeout(function(){fios(false);},150); });
});
})();
