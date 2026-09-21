
// ══ MÓDULOS ═══════════════════════════════════════
const MODS = [
  {id:'desafiomateus', nome:'Maratona de Marcos',  icon:'🏆', img:'icons/maratona.png', cor:'#C9A14A', desc:'Game bíblico — Marcos 1 a 5 · leia, ouça e jogue'},
  {id:'perolas', nome:'Descobrindo as Pérolas',   icon:'💎', img:'icons/perolas.png', cor:'#17a2a2', desc:'Análise bíblica de qualquer assunto'},
  {id:'devocional', nome:'Devocional Diário',     icon:'🕊️', img:'icons/devocional.png', cor:'#C9A14A', desc:'Palavra de hoje · versículo, reflexão e oração'},
  {id:'plano', nome:'Plano de Leitura',           icon:'📅', img:'icons/plano.png', cor:'#2563eb', desc:'Leia a Bíblia todo dia com progresso'},
  {id:'biblia',  nome:'Bíblia e Harpa Cristã',   icon:'📖', img:'icons/biblia.png', cor:'#C9A14A', desc:'Bíblia + 640 hinos'},
  {id:'ebd',     nome:'EBD',                      icon:'🏫', img:'icons/ebd.png', cor:'#34c77b', desc:'Lições adulto e jovem'},
  {id:'silas',   nome:'Projeto Silas',            icon:'✝️', img:'img/ceadema.png', cor:'#0e2a63', desc:'Documentos, cartazes, vídeos'},
  {id:'templo',  nome:'Templo Central Tuntum-MA', icon:'⛪', img:'icons/templo.png', cor:'#f5a623', desc:'Sede central — Tuntum-MA'},
  {id:'igrejas', nome:'Igrejas Parceiras',        icon:'📣', img:'icons/igrejas.png', cor:'#2563eb', desc:'Conheça igrejas · divulgue a sua'},
  {id:'manuais', nome:'Biblioteca',               icon:'📚', img:'icons/biblioteca.png', cor:'#8b3a4a', desc:'Livros e manuais do obreiro'},
];

// ══ STATE ═════════════════════════════════════════
let modAtual=null, editId=null, modPaiTela='home';
function chave(id){ return 'radar_'+id; }
function getData(id){ return JSON.parse(localStorage.getItem(chave(id))||'[]'); }
function setData(id,arr){ localStorage.setItem(chave(id),JSON.stringify(arr)); }
function ocultarTodas(){ document.querySelectorAll('.tela').forEach(t=>t.classList.remove('ativa')); }

// ══ AUTH ══════════════════════════════════════════
let _cadPendente = {nome:'',cargo:'',fone:'',token:''};

function getUser(){ return JSON.parse(localStorage.getItem('radar_user')||'null'); }
function saveUser(u){ localStorage.setItem('radar_user',JSON.stringify(u)); }

// Ativa conta admin via ?_a=radar2026admin
(function(){
  const p=new URLSearchParams(location.search).get('_a');
  if(p==='radar2026admin'){const u=getUser();if(u){u.admin=true;saveUser(u);}
  history.replaceState({},'',location.pathname);}
})();

const ADMIN_PHONES=['99988031747'];

function checkAuth(){
  if(getUser()) return true;
  ocultarTodas();
  document.getElementById('tela-cadastro').classList.add('ativa');
  setTimeout(()=>document.getElementById('cad-nome').focus(),350);
  return false;
}

function foneSoDigitos(s){ return (s||'').replace(/\D/g,''); }
// No Brasil o numero tem 10 ou 11 digitos. Qualquer outro tamanho SEM o '+'
// e' gente de fora que esqueceu o codigo do pais — e sem ele o WhatsApp nao chega.
function precisaCodigoPais(bruto){
  var v=foneSoDigitos(bruto);
  var temMais=(bruto||'').trim().charAt(0)==='+';
  if(temMais) return false;
  return !(v.length===10 || v.length===11);
}
// aceita numero de fora do Brasil (Angola +244, EUA +1, Portugal +351...)
// brasileiro digita igual a sempre e continua saindo (99) 99999-9999
function mascaraFone(el){
  var bruto=el.value||'';
  var v=foneSoDigitos(bruto);
  var internacional = bruto.trim().charAt(0)==='+' || v.length>11;
  if(internacional){
    if(v.length>15) v=v.slice(0,15);          // 15 e o maximo que existe no mundo
    el.value = v.length ? '+'+v : '';
    return;
  }
  if(v.length<=2)el.value=v.length?'('+v:v;
  else if(v.length<=7)el.value='('+v.slice(0,2)+') '+v.slice(2);
  else el.value='('+v.slice(0,2)+') '+v.slice(2,7)+'-'+v.slice(7);
}

async function submitCadastro(){
  const nome=document.getElementById('cad-nome').value.trim();
  const cargo=document.getElementById('cad-cargo').value;
  const fone=document.getElementById('cad-fone').value.replace(/\D/g,'');
  const err=document.getElementById('cad-erro');
  err.style.display='none';
  if(!nome){err.textContent='Digite seu nome.';err.style.display='block';document.getElementById('cad-nome').focus();return;}
  if(!cargo){err.textContent='Selecione seu cargo na igreja.';err.style.display='block';return;}
  if(precisaCodigoPais(document.getElementById('cad-fone').value)){err.textContent='Esse número não parece do Brasil. Se você é de fora, comece com + e o código do país — ex.: +244 923 000 000 (Angola), +1 305 867 5309 (EUA). Sem isso o WhatsApp não chega até você.';err.style.display='block';document.getElementById('cad-fone').focus();return;}
  if(fone.length<8||fone.length>15){err.textContent='WhatsApp inválido. No Brasil: (99) 99999-9999. Fora do Brasil, use o código do país: +244 923 000 000';err.style.display='block';document.getElementById('cad-fone').focus();return;}
  const btn=document.getElementById('btn-cad-enviar');
  btn.textContent='Entrando...';btn.disabled=true;
  const uid='u_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const isAdmin=ADMIN_PHONES.includes(fone);
  saveUser({nome,cargo,whatsapp:fone,id:uid,...(isAdmin&&{admin:true})});
  salvarNuvem(nome,cargo,fone);   // guarda na nuvem pro Elias ver todos
  irHome();
}
// salva o cadastro na nuvem (não trava o app se falhar)
function salvarNuvem(nome,cargo,fone){
  try{ fetch('/api/cadastros',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nome:nome,cargo:cargo,whatsapp:fone})}).catch(function(){}); }catch(e){}
}
// "Já cadastrado?" — restaura pelo WhatsApp
async function jaCadastrado(){
  var fone=prompt('Digite seu WhatsApp (com DDD):'); if(!fone) return;
  var _bruto=fone; fone=fone.replace(/\D/g,''); if(precisaCodigoPais(_bruto)){ alert('Esse número não parece do Brasil.\nSe você é de fora, digite com o código do país.\nEx.: +244 923 000 000 (Angola), +1 305 867 5309 (EUA).'); return; } if(fone.length<8||fone.length>15){ alert('WhatsApp inválido.\nBrasil: (99) 99999-9999\nFora do Brasil: com o código do país, ex. +244923000000'); return; }
  try{
    var r=await fetch('/api/cadastros?phone='+fone); var d=await r.json();
    if(d && d.cadastro){
      saveUser({nome:d.cadastro.nome,cargo:d.cadastro.cargo,whatsapp:fone,id:'u_'+Date.now().toString(36),...(ADMIN_PHONES.includes(fone)&&{admin:true})});
      irHome();
    } else { alert('Não encontramos esse WhatsApp. Faça o cadastro abaixo. 🙂'); }
  }catch(e){ alert('Não consegui verificar agora. Tente de novo.'); }
}

// ══ GATE de 30 dias ═══════════════════════════════
let _acessoVerificado=false, _acessoBloqueado=false;
async function verificarAcesso(){
  var u=getUser(); if(!u||!u.whatsapp){ return; }
  if(u.admin) return;                       // Elias nunca bloqueia
  try{
    var r=await fetch('/api/acesso?phone='+u.whatsapp.replace(/\D/g,''));
    var d=await r.json();
    if(!d||!d.ok){ return; }                 // erro/DB fora = não trava ninguém (fail-open)
    if(d.status==='novo'){ salvarNuvem(u.nome,u.cargo,u.whatsapp); return; } // começa os 30 dias agora
    if(d.status==='expirado'){ _acessoBloqueado=true; mostrarBloqueio(); }
  }catch(e){ /* offline: não trava */ }
}
function copiarTexto(txt, btnId){
  try{ navigator.clipboard && navigator.clipboard.writeText(txt); }catch(e){}
  var b=document.getElementById(btnId); if(b){ var t=b.textContent; b.textContent='✅ Copiado!'; setTimeout(function(){b.textContent=t;},1600); }
}
async function gerarPixAsaas(){
  var u=getUser()||{};
  var cpf=(document.getElementById('bloq-cpf').value||'').replace(/\D/g,'');
  var er=document.getElementById('bloq-cpf-erro');
  if(cpf.length!==11){ er.textContent='Digite um CPF válido (11 números).'; er.style.display='block'; return; }
  er.style.display='none';
  var btn=document.getElementById('bloq-gerar'); btn.textContent='Gerando PIX…'; btn.disabled=true;
  try{
    var r=await fetch('/api/assinar',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({nome:u.nome,phone:(u.whatsapp||'').replace(/\D/g,''),cpf:cpf})});
    var d=await r.json();
    if(d.ok && d.copia){
      document.getElementById('bloq-cpf-box').style.display='none';
      document.getElementById('bloq-pix-area').innerHTML=
        (d.qr?'<img src="data:image/png;base64,'+d.qr+'" alt="QR PIX" style="width:186px;height:186px;display:block;margin:4px auto 10px;border-radius:10px">':'')
        +'<div style="font-size:.8rem;color:#6b7280;text-align:center;margin-bottom:4px">PIX copia e cola:</div>'
        +'<div style="display:flex;gap:8px;align-items:center;background:#f2f7f8;border:1px solid #d5e6e8;border-radius:10px;padding:10px 12px">'
          +'<div style="flex:1;font-size:.76rem;color:#0f3d5c;word-break:break-all;max-height:50px;overflow:auto">'+d.copia+'</div>'
          +'<button id="pix-copiar" onclick="copiarTexto(this.getAttribute(\'data-c\'),\'pix-copiar\')" data-c="'+d.copia.replace(/"/g,'&quot;')+'" style="background:#0f3d5c;color:#fff;border:none;border-radius:8px;padding:9px 12px;font-weight:800;font-family:inherit;cursor:pointer;flex-shrink:0">Copiar</button></div>'
        +'<div style="font-size:.84rem;color:#14804a;font-weight:700;text-align:center;margin-top:10px">Pague no seu banco. O acesso libera sozinho em segundos. 🙌</div>';
    } else {
      er.textContent=(d.err||'Não consegui gerar o PIX. Confira o CPF.'); er.style.display='block';
      btn.textContent='Gerar PIX ➜'; btn.disabled=false;
    }
  }catch(e){ er.textContent='Sem conexão agora. Tente de novo.'; er.style.display='block'; btn.textContent='Gerar PIX ➜'; btn.disabled=false; }
}
async function jaPaguei(){
  var u=getUser(); if(!u||!u.whatsapp) return;
  var b=document.getElementById('bloq-japaguei'); if(b){b.textContent='Verificando…';b.disabled=true;}
  try{
    var r=await fetch('/api/acesso?phone='+u.whatsapp.replace(/\D/g,'')); var d=await r.json();
    if(d&&d.status==='ativo'){ _acessoBloqueado=false; var o=document.getElementById('bloq-ov'); if(o)o.remove(); irHome(); return; }
  }catch(e){}
  if(b){b.textContent='Ainda não liberado — mande o comprovante 🙏';b.disabled=false;}
}
function mostrarBloqueio(){
  var u=getUser()||{}; var nome=(u.nome||'').split(/\s+/)[0];
  var msg=encodeURIComponent('Ola! Sou '+(u.nome||'')+' ('+(u.whatsapp||'')+'). Paguei a assinatura do RADAR e estou enviando o comprovante.');
  var wa='https://wa.me/5599988031747?text='+msg;
  var ov=document.getElementById('bloq-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='bloq-ov'; document.body.appendChild(ov); }
  ov.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#0f3d5c;color:#fff;overflow-y:auto;font-family:inherit';
  ov.innerHTML=
   '<div style="max-width:480px;margin:0 auto;padding:34px 22px 40px;text-align:center">'
   +'<div style="font-size:52px">🔒</div>'
   +'<h1 style="font-family:Georgia,serif;font-size:1.7rem;margin:8px 0 6px">Seu período gratuito terminou</h1>'
   +'<p style="color:#cfe0e8;font-size:1.05rem;margin:0 0 18px">'+(nome?nome+', obrigado':'Obrigado')+' por usar o RADAR nesses 30 dias! 🙏 Continue com tudo — Bíblias de estudo, EBD, Meu Estudo e a Lupa.</p>'
   +'<div style="background:#fff;color:#1c2230;border-radius:16px;padding:20px 18px;text-align:left">'
     +'<div style="text-align:center;color:#0f6d78;font-weight:800;font-size:1.5rem">R$ 9,90 <span style="font-size:.95rem;color:#6b7280;font-weight:600">/mês</span></div>'
     +'<div style="text-align:center;color:#6b7280;font-size:.85rem;margin-top:2px">PIX · liberação automática</div>'
     +'<div style="border-top:1px solid #e4e7ec;margin:14px 0"></div>'
     +'<div id="bloq-cpf-box">'
       +'<div style="font-weight:800;color:#0f3d5c;margin-bottom:6px">Pagar com PIX</div>'
       +'<input id="bloq-cpf" inputmode="numeric" placeholder="Seu CPF (só pra gerar o PIX)" style="width:100%;border:1.5px solid #e4e7ec;border-radius:10px;padding:12px 14px;font-size:1.05rem;font-family:inherit">'
       +'<div id="bloq-cpf-erro" style="display:none;color:#8a1c1c;font-size:.85rem;font-weight:700;margin-top:6px"></div>'
       +'<button id="bloq-gerar" onclick="gerarPixAsaas()" style="width:100%;margin-top:10px;background:#0f6d78;color:#fff;border:none;border-radius:12px;padding:14px;font-size:1.05rem;font-weight:800;font-family:inherit;cursor:pointer">Gerar PIX ➜</button>'
     +'</div>'
     +'<div id="bloq-pix-area"></div>'
   +'</div>'
   +'<button id="bloq-japaguei" onclick="jaPaguei()" style="margin-top:16px;background:transparent;color:#fff;border:2px solid rgba(255,255,255,.5);border-radius:12px;padding:12px 20px;font-weight:800;font-family:inherit;cursor:pointer">Já paguei · atualizar</button>'
   +'<div style="margin-top:22px;font-size:.82rem;color:#9fbccb;line-height:1.6">Deu problema no PIX automático? Pague em <b style="color:#fff">03106988711</b> <button id="pix-man" onclick="copiarTexto(\'03106988711\',\'pix-man\')" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:6px;padding:3px 8px;font-weight:700;font-family:inherit;cursor:pointer">copiar</button> e <a href="'+wa+'" target="_blank" style="color:#8fe6ad;font-weight:700">mande o comprovante</a>.</div>'
   +'</div>';
}

function voltarCadastro(){
  document.getElementById('otp-erro').style.display='none';
  Array.from(document.getElementById('otp-digits').children).forEach(d=>d.value='');
  ocultarTodas();document.getElementById('tela-cadastro').classList.add('ativa');
}

async function reenviarOtp(){
  const btn=document.querySelector('#tela-otp .btn-reenviar');
  btn.textContent='Reenviando...';btn.disabled=true;
  try{
    const res=await fetch('/api/send-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nome:_cadPendente.nome,cargo:_cadPendente.cargo,phone:_cadPendente.fone})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Erro');
    _cadPendente.token=data.token;
    Array.from(document.getElementById('otp-digits').children).forEach(d=>d.value='');
    document.getElementById('otp-erro').style.display='none';
    document.getElementById('otp-digits').children[0].focus();
  }catch(e){
    document.getElementById('otp-erro').textContent=e.message;document.getElementById('otp-erro').style.display='block';
  }finally{
    btn.textContent='Reenviar código';btn.disabled=false;
  }
}

function otpInput(el,idx){
  el.value=el.value.replace(/\D/g,'').slice(-1);
  const d=document.getElementById('otp-digits').children;
  if(el.value&&idx<5)d[idx+1].focus();
  if(idx===5&&el.value){
    const code=Array.from(d).map(x=>x.value).join('');
    if(code.length===6)submitOtp();
  }
}
function otpKey(e,idx){
  if(e.key==='Backspace'&&!e.target.value&&idx>0)
    document.getElementById('otp-digits').children[idx-1].focus();
}

async function submitOtp(){
  const d=document.getElementById('otp-digits').children;
  const code=Array.from(d).map(x=>x.value).join('');
  const err=document.getElementById('otp-erro');
  err.style.display='none';
  if(code.length<6){err.textContent='Digite todos os 6 dígitos.';err.style.display='block';return;}
  const btn=document.getElementById('btn-otp-verificar');
  btn.textContent='Verificando...';btn.disabled=true;
  try{
    const res=await fetch('/api/verify-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:_cadPendente.token,code})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Código inválido');
    saveUser({nome:_cadPendente.nome,cargo:_cadPendente.cargo,whatsapp:_cadPendente.fone,id:data.uid});
    irHome();
  }catch(e){
    err.textContent=e.message;err.style.display='block';
    Array.from(d).forEach(x=>x.value='');
    d[0].focus();
  }finally{
    btn.textContent='VERIFICAR';btn.disabled=false;
  }
}

function compartilharEbd(){
  const url=location.origin+'?mod=ebd';
  if(navigator.share){navigator.share({title:'RADAR ATUAL — EBD',text:'Acesse as lições da EBD pelo app RADAR ATUAL',url});}
  else{navigator.clipboard.writeText(url).then(()=>showToast('Link copiado!'));}
}

function showToast(msg){
  let t=document.getElementById('_toast_geral');
  if(t)t.remove();
  t=document.createElement('div');t.id='_toast_geral';
  t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(10,15,30,.97);color:#fff;padding:10px 22px;border-radius:22px;font-size:13px;font-weight:700;border:1px solid rgba(201,161,74,.3);z-index:999;pointer-events:none;white-space:nowrap';
  t.textContent=msg;document.body.appendChild(t);
  setTimeout(()=>{t.style.transition='opacity .3s';t.style.opacity='0';setTimeout(()=>t.remove(),320)},1800);
}

function toastBloqueado(){
  showToast('🔒 Lição será liberada em breve');
}

// ══ SPLASH ════════════════════════════════════════
// sem cadastro? vai DIRETO pro cadastro (logo no início). Já cadastrado? mostra o splash.
if(getUser()){ setTimeout(irHome, 2200); } else { irHome(); }
var _deepLinkFeito=false;
function irHome(){
  if(!checkAuth()) return;
  if(_acessoBloqueado){ mostrarBloqueio(); return; }
  // logo que abre o app: primeiro os SLIDES (se houver), com botão "Ir para o menu"
  if(!_slidesMostrados){ _slidesMostrados=true; if(typeof _temSlides==='function' && _temSlides()){ abrirSlides(); return; } }
  ocultarTodas();
  document.getElementById('home').classList.add('ativa');
  renderHome();
  if(!_acessoVerificado){ _acessoVerificado=true; verificarAcesso(); }
  if(!_deepLinkFeito){                 // ?mod=... / ?ir=... abre direto SÓ na 1ª carga; voltar nunca reabre
    _deepLinkFeito=true;
    const _qs = new URLSearchParams(location.search);
    const p = _qs.get('mod');
    const ir = _qs.get('ir');
    if(p){ history.replaceState({},'',location.pathname); abrirMod(p); }
    else if(ir==='jovem'){ history.replaceState({},'',location.pathname); abrirMonteCarmelo(); abrirMcGrupo('jovem'); }
    else if(_qs.get('hist')){ history.replaceState({},'',location.pathname); var _hid=_qs.get('hist'); setTimeout(function(){ abrirHistorinhas().then(function(){ verHistorinha(_hid); }); },300); }
    else if(_qs.get('manual')){ history.replaceState({},'',location.pathname); var _mid=_qs.get('manual'); if(typeof abrirManuais==='function') abrirManuais(); setTimeout(function(){ if(typeof abrirManual==='function') abrirManual(_mid); },140); }
  }
}

// ══ HOME ══════════════════════════════════════════
function renderHome(){
  const u = getUser();
  // Saudação dinâmica
  const h = new Date().getHours();
  const [saud, icone] = h < 12 ? ['Bom dia','☀️'] : h < 18 ? ['Boa tarde','🌤️'] : ['Boa noite','🌙'];
  var _gb=document.getElementById('greet-bom'); if(_gb) _gb.textContent = saud + ' ' + icone; // saudação removida do topo

  // Carousel — 7 louvores + 5 vídeos
  soLouvores();
  seedMais5e10();
  limparLicaoDomingo();   // 🗑️ tira as imagens de lição/eventos que já passaram (foto1-10 + cartaz 1-10)
  renderCarousel();
  fetchCloudVideos();   // busca vídeos da nuvem (YouTube/Facebook do Elias) e re-renderiza
  seedAgendaCeadema();   // agenda CEADEMA (avisos até o fim do ano)
  checkNovidade();       // 🔔 avisa "NOVIDADE" (apito + banner) se saiu conteúdo novo

  // Painel Hoje
  const hoje = new Date();
  const DIAS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const dataStr = DIAS[hoje.getDay()] + ', ' + hoje.getDate() + ' de ' + MESES[hoje.getMonth()];
  const AGENDA = {
    0:[{i:'⛪',t:'Escola Dominical',s:'09h00'},{i:'⛪',t:'Culto da Manhã',s:'10h00'},{i:'⛪',t:'Culto da Noite',s:'19h00'}],
    4:[{i:'🙏',t:'Reunião de Oração',s:'19h30'}],
    6:[{i:'✝️',t:'Culto de Jovens',s:'19h00'}]
  };
  const dataHoje=hoje.toISOString().split('T')[0];
  const userEvHoje=getEventos().filter(ev=>
    (ev.tipo==='fixo'&&ev.diaSemana===hoje.getDay())||
    (ev.tipo==='data'&&ev.data===dataHoje)
  ).map(ev=>({i:ev.icone||({ebd:'🏫',biblia:'📖',harpa:'🎵'}[ev.modulo])||'📅',t:ev.titulo,s:ev.hora||''}));
  const itens=[...(AGENDA[hoje.getDay()]||[]),...userEvHoje];
  const itensPainel = itens.length
    ? itens.map(it=>`<div class="painel-item"><span class="painel-item-icone">${it.i}</span><div><div class="painel-item-txt">${it.t}</div><div class="painel-item-sub">${it.s}</div></div></div>`).join('')
    : `<div class="painel-item"><span class="painel-item-icone">📅</span><div><div class="painel-item-txt">Sem eventos hoje</div><div class="painel-item-sub">Fique atento aos avisos</div></div></div>`;
  document.getElementById('painel-hoje-wrap').innerHTML =
    `<div class="painel-hoje"><div class="painel-hoje-topo"><span class="painel-hoje-label">Hoje</span><span class="painel-hoje-data">${dataStr}</span></div>${itensPainel}</div>`;

  // Palavra de Hoje (devocional do dia)
  try{
    const dv = devocionalDoDia();
    const dw = document.getElementById('devocional-home-wrap');
    if(dw) dw.innerHTML =
      `<div class="dev-home" onclick="abrirDevocional()">
        <div class="dev-home-ico">🕊️</div>
        <div class="dev-home-info">
          <div class="dev-home-rot">Palavra de hoje</div>
          <div class="dev-home-tit">${dv.t}</div>
          <div class="dev-home-ref">${dv.ref}</div>
        </div>
        <span class="dev-home-arr">›</span>
      </div>`;
  }catch(e){}

  // Continuar acessando
  const ultimo = localStorage.getItem('radar_ultimo_mod');
  const ultimoMod = ultimo ? MODS.find(m=>m.id===ultimo) : null;
  document.getElementById('continuar-wrap').innerHTML = ultimoMod
    ? `<div class="continuar-card" onclick="abrirMod('${ultimoMod.id}')"><span class="continuar-icone">${ultimoMod.img?`<img class="cont-icone-img" src="${ultimoMod.img}">`:ultimoMod.icon}</span><div class="continuar-info"><div class="continuar-rotulo">Continuar acessando</div><div class="continuar-nome">${ultimoMod.nome}</div></div><span class="continuar-arr">›</span></div>`
    : '';

  // Módulos — esconde da lista de baixo o que JÁ está na vitrine 3x3 (nao duplicar / menos rolagem).
  // Nao apaga nada: continuam abrindo pela vitrine e aparecendo na busca.
  const NA_VITRINE = ['biblia','ebd'];
  document.getElementById('modulos').innerHTML = MODS.filter(m=>!NA_VITRINE.includes(m.id)).map(m=>{
    const linha = `<div class="tile-icon">${m.img?`<img class="tile-icon-img" src="${m.img}">`:m.icon}</div>`
      + `<div class="tile-info"><div class="tile-nome">${m.nome}</div><div class="tile-desc">${m.desc}</div></div>`
      + `<div class="tile-arr">›</div>`;
    if(m.id==='manuais'){
      // botão de compartilhar DENTRO do card, na MESMA LINHA (mantém a altura igual aos outros)
      return `<div class="modulo-tile" style="--tile-color:${m.cor}" onclick="abrirMod('manuais')">
        <div class="tile-icon">${m.img?`<img class="tile-icon-img" src="${m.img}">`:m.icon}</div>
        <div class="tile-info" style="min-width:0">
          <div class="tile-nome" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.nome}</div>
          <div class="tile-desc" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.desc}</div>
        </div>
        <button onclick="event.stopPropagation();compartilharManuais()" style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#fff;border:none;border-radius:999px;padding:8px 13px;font-size:12px;font-weight:800;font-family:inherit;cursor:pointer">📤 Compartilhar</button>
      </div>`;
    }
    if(m.id==='desafiomateus'){
      // botão de compartilhar DENTRO do card, no canto de baixo à direita
      return `<div class="modulo-tile" style="--tile-color:${m.cor};flex-direction:column;align-items:stretch;gap:0" >
        <div style="display:flex;align-items:center;gap:14px;cursor:pointer" onclick="abrirMod('desafiomateus')">${linha}</div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px">
          <button onclick="event.stopPropagation();compartilharMarcos()" style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#fff;border:none;border-radius:999px;padding:8px 14px;font-size:12px;font-weight:800;font-family:inherit;cursor:pointer">📤 Compartilhar</button>
        </div>
      </div>`;
    }
    return `<div class="modulo-tile" style="--tile-color:${m.cor}" onclick="abrirMod('${m.id}')">${linha}</div>`;
  }).join('');
}
function compartilharMarcos(){
  var txt='🏆 *Maratona de Marcos* — game bíblico de Marcos 1 a 5: leia, ouça e jogue! No app RADAR.\n\nAcesse aqui:\nhttps://radar-atual.vercel.app/?mod=desafiomateus';
  if(navigator.share){ navigator.share({title:'Maratona de Marcos — RADAR',text:txt}).catch(function(){}); }
  else { window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank'); }
}
function compartilharManuais(){
  var txt='📚 *Biblioteca* — livros e manuais do obreiro no app RADAR (Manual de Cerimônias e mais).\n\nAcesse aqui:\nhttps://radar-atual.vercel.app/?mod=manuais';
  if(navigator.share){ navigator.share({title:'Biblioteca — RADAR',text:txt}).catch(function(){}); }
  else { window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank'); }
}

// ══ DEVOCIONAL DIÁRIO ═════════════════════════════════
const DEVOCIONAIS = [
  {t:'A paz que excede todo entendimento', ref:'Filipenses 4:6-7',
   v:'Não estejais inquietos por coisa alguma; antes, as vossas petições sejam em tudo conhecidas diante de Deus, pela oração e súplica, com ações de graças. E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos sentimentos em Cristo Jesus.',
   r:['A ansiedade quer roubar o sono do obreiro e a alegria do crente. Mas Deus não nos manda apenas parar de nos preocupar — Ele nos ensina o caminho: trocar a inquietação pela oração. Cada aflição que você entrega no altar sai das suas mãos e vai para as mãos do Pai.','Repare que a promessa não é a paz que você entende, mas a que excede o entendimento. É uma paz que não depende de tudo estar resolvido; ela guarda o coração como uma sentinela, mesmo no meio da tempestade. Ore hoje, com gratidão, e deixe essa paz montar guarda na sua alma.'],
   o:'Pai, eu entrego a Ti toda a minha ansiedade. Enche o meu coração da Tua paz que guarda e sustenta. Em nome de Jesus, amém.'},

  {t:'Firmes sobre a Rocha', ref:'Mateus 7:24-25',
   v:'Todo aquele, pois, que escuta estas minhas palavras e as pratica, assemelhá-lo-ei ao homem prudente, que edificou a sua casa sobre a rocha. E desceu a chuva, e correram rios, e assopraram ventos, e combateram aquela casa, e não caiu, porque estava edificada sobre a rocha.',
   r:['A diferença entre a casa que cai e a que permanece não estava na tempestade — as duas enfrentaram a mesma chuva. A diferença estava no alicerce. Ouvir a Palavra é bom, mas é praticá-la que firma a nossa vida sobre a Rocha, que é Cristo.','Você não escolhe se a tempestade vem; ela vem para todos. Mas você escolhe hoje onde vai construir. Cada obediência à Palavra é mais um tijolo assentado sobre o fundamento que não se abala.'],
   o:'Senhor, ajuda-me a não ser apenas ouvinte, mas praticante da Tua Palavra. Firma a minha vida na Rocha que é Cristo. Amém.'},

  {t:'O poder do sangue de Jesus', ref:'1 João 1:7',
   v:'Mas, se andarmos na luz, como ele na luz está, temos comunhão uns com os outros, e o sangue de Jesus Cristo, seu Filho, nos purifica de todo o pecado.',
   r:['Não há mancha que o sangue de Jesus não alcance. O inimigo gosta de nos lembrar do passado para nos manter presos à culpa, mas a Palavra declara: o sangue nos purifica de TODO o pecado. Não de alguns — de todos.','Andar na luz é viver com o coração aberto diante de Deus, sem esconder nada. E quem anda na luz descobre que a cruz não foi só suficiente para salvar um dia; ela continua purificando hoje. Descanse nessa obra completa.'],
   o:'Jesus, obrigado pelo Teu sangue que me purifica e me aproxima do Pai. Lava o meu coração e me guarda na luz. Amém.'},

  {t:'Renovados na mente', ref:'Romanos 12:2',
   v:'E não vos conformeis com este mundo, mas transformai-vos pela renovação do vosso entendimento, para que experimenteis qual seja a boa, agradável e perfeita vontade de Deus.',
   r:['A transformação que Deus quer não é apenas de comportamento, mas de mente. O mundo tenta nos moldar todos os dias com seus valores; Deus nos transforma de dentro para fora, renovando a forma como pensamos.','Essa renovação vem pela Palavra e pela comunhão com o Espírito Santo. Quando a mente é renovada, passamos a enxergar a vontade de Deus como boa, agradável e perfeita — e não mais como um peso. Alimente o seu entendimento hoje com aquilo que vem do alto.'],
   o:'Espírito Santo, renova a minha mente. Que eu não me conforme com este mundo, mas seja transformado para conhecer a Tua vontade. Amém.'},

  {t:'Misericórdias que se renovam', ref:'Lamentações 3:22-23',
   v:'As misericórdias do Senhor são a causa de não sermos consumidos; porque as suas misericórdias não têm fim. Novas são cada manhã; grande é a tua fidelidade.',
   r:['Se ainda estamos de pé, não é por nossa força — é pela misericórdia de Deus. Ela é o motivo de não sermos consumidos pelas nossas próprias falhas e pelas lutas da vida.','E o mais lindo: essa misericórdia é nova a cada manhã. O erro de ontem não esgota a graça de hoje. Você acordou hoje sob um suprimento fresco do amor de Deus. Grande é a fidelidade dEle sobre a sua vida.'],
   o:'Senhor, obrigado porque a Tua misericórdia me alcança nova a cada manhã. Eu confio na Tua fidelidade. Amém.'},

  {t:'Descanso para a alma cansada', ref:'Mateus 11:28',
   v:'Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.',
   r:['Jesus não chama os fortes e descansados; Ele chama os cansados e oprimidos. Se você chegou hoje ao limite, saiba que esse convite é para você. O peso que você carrega não foi feito para os seus ombros.','O descanso que Cristo oferece não é ausência de trabalho, mas a presença dEle no meio do trabalho. Vá a Ele em oração, tire o fardo, e receba o alívio que só o Salvador pode dar.'],
   o:'Jesus, eu venho a Ti cansado. Toma o meu fardo e dá-me o Teu descanso. Em Ti eu encontro alívio. Amém.'},

  {t:'A oração que mobiliza o céu', ref:'Tiago 5:16',
   v:'A oração feita por um justo pode muito em seus efeitos.',
   r:['Muitas vezes subestimamos a oração, como se fosse o último recurso. Mas a Palavra ensina que a oração do justo é poderosa, produz efeitos, move a mão de Deus. Não há desperdício em oração.','Você não precisa de palavras bonitas, mas de um coração sincero e reto diante de Deus. Persista, mesmo quando a resposta demora. O justo ora, e o céu se move. Não desista de orar.'],
   o:'Pai, ensina-me a orar com fé e perseverança. Que a minha oração seja agradável a Ti e poderosa em efeitos. Amém.'},

  {t:'Mais que vencedores', ref:'Romanos 8:37',
   v:'Mas em todas estas coisas somos mais do que vencedores, por aquele que nos amou.',
   r:['Repare que o texto não diz que seremos livres das lutas — diz que EM todas estas coisas somos vencedores. A vitória não está na ausência do problema, mas na presença dAquele que nos ama.','Ser mais que vencedor é vencer sem depender das próprias forças, mas sustentado pelo amor de Cristo. Nada — nem tribulação, nem angústia, nem perseguição — pode nos separar desse amor. Levante a cabeça: a vitória já tem dono.'],
   o:'Senhor, obrigado porque em Ti sou mais que vencedor. Fortalece a minha fé no Teu amor que nunca me abandona. Amém.'},

  {t:'A Palavra é lâmpada', ref:'Salmos 119:105',
   v:'Lâmpada para os meus pés é a tua palavra e luz para o meu caminho.',
   r:['A lâmpada não ilumina o caminho todo de uma vez — ilumina o próximo passo. Assim é a Palavra de Deus: ela nos dá luz suficiente para andar hoje, confiando o amanhã ao Senhor.','Quando você não sabe qual direção tomar, volte à Palavra. Ela é a luz que expõe os enganos do caminho e mostra a vereda da justiça. Não ande no escuro tendo a lâmpada de Deus ao alcance das mãos.'],
   o:'Senhor, que a Tua Palavra ilumine cada passo meu. Guia-me na Tua verdade e não me deixes andar no escuro. Amém.'},

  {t:'O Senhor é o meu Pastor', ref:'Salmos 23:1',
   v:'O Senhor é o meu pastor; nada me faltará.',
   r:['Davi não disse "o Senhor é UM pastor", mas "o MEU pastor". A fé se torna pessoal quando entendemos que Deus cuida de cada ovelha pelo nome. Ele conhece você, guia você e provê para você.','"Nada me faltará" não é promessa de luxo, mas de suficiência. Sob os cuidados do Bom Pastor, você tem tudo o que precisa para hoje. Onde Ele guia, Ele sustenta. Confie no Pastor que dá a vida pelas ovelhas.'],
   o:'Bom Pastor, obrigado por cuidares de mim. Guia-me e supre as minhas necessidades. Em Ti nada me faltará. Amém.'},

  {t:'Esforça-te e tem bom ânimo', ref:'Josué 1:9',
   v:'Não to mandei eu? Esforça-te, e tem bom ânimo; não pasmes, nem te espantes, porque o Senhor, teu Deus, é contigo, por onde quer que andares.',
   r:['A coragem que Deus pede não nasce das circunstâncias, mas da Sua presença. "O Senhor é contigo" — essa é a razão para não temer. Josué enfrentaria gigantes, mas não sozinho.','Talvez você esteja diante de uma tarefa maior que a sua força. Lembre-se: o mesmo Deus que chama, capacita e acompanha. Esforça-te, tem bom ânimo, e avança — porque a presença dEle vai contigo por onde quer que andares.'],
   o:'Senhor, dá-me coragem e bom ânimo. Confio que estás comigo em cada passo. Não temerei, porque Tu vais adiante. Amém.'},

  {t:'A graça é suficiente', ref:'2 Coríntios 12:9',
   v:'A minha graça te basta, porque o meu poder se aperfeiçoa na fraqueza.',
   r:['Paulo pediu três vezes que Deus tirasse o seu espinho, e a resposta veio diferente: não a remoção da fraqueza, mas a suficiência da graça. Deus nem sempre tira o peso; muitas vezes Ele dá força para carregá-lo.','A sua fraqueza não é um obstáculo para Deus — é o palco onde o poder dEle se manifesta. Quando você reconhece que não dá conta sozinho, a graça entra em ação. Descanse: a graça de Deus basta para você hoje.'],
   o:'Senhor, a Tua graça me basta. No meio da minha fraqueza, manifesta o Teu poder. Eu confio em Ti. Amém.'},

  {t:'Salvos pela graça', ref:'Efésios 2:8-9',
   v:'Porque pela graça sois salvos, por meio da fé; e isto não vem de vós, é dom de Deus. Não vem das obras, para que ninguém se glorie.',
   r:['A salvação não é um salário que ganhamos por bom comportamento; é um presente que recebemos pela fé. Se dependesse das nossas obras, sempre haveria motivo para orgulho ou para desespero. Mas depende da graça — e por isso é segura.','Isso não diminui as boas obras; ao contrário, elas nascem da gratidão de quem foi salvo. Você não trabalha para ser aceito por Deus; você já foi aceito em Cristo e agora vive para agradá-lo. Descanse nessa graça hoje.'],
   o:'Pai, obrigado pela salvação que recebi de graça, pela fé em Jesus. Que a minha vida seja gratidão a Ti. Amém.'},

  {t:'Nascer de novo', ref:'João 3:3',
   v:'Na verdade, na verdade te digo que aquele que não nascer de novo não pode ver o reino de Deus.',
   r:['Nicodemos era mestre, religioso e sincero, mas Jesus lhe mostrou que religião não basta: é preciso nascer de novo. O novo nascimento não é reforma de fora para dentro; é vida nova gerada pelo Espírito de Deus.','Você pode conhecer muito sobre Deus e ainda não tê-lo encontrado. O convite de Cristo é para uma vida transformada na raiz. Se você já nasceu de novo, viva essa novidade; se ainda não, hoje é o dia de render o coração a Ele.'],
   o:'Espírito Santo, opera em mim o novo nascimento. Que eu não viva de aparência, mas de vida nova em Cristo. Amém.'},

  {t:'O Consolador que fica', ref:'João 14:16',
   v:'E eu rogarei ao Pai, e ele vos dará outro Consolador, para que fique convosco para sempre.',
   r:['Jesus não deixou os discípulos órfãos. Ele prometeu o Espírito Santo, o Consolador que fica para sempre. Não é uma visita ocasional; é uma presença permanente dentro do crente.','Quando a solidão apertar, lembre-se: você não está sozinho. O mesmo Espírito que consolou a igreja primitiva mora em você, ensina, guia e fortalece. Dê ouvidos à Sua voz e ande na Sua companhia hoje.'],
   o:'Espírito Santo, obrigado por seres o meu Consolador que nunca me deixa. Enche-me e guia-me hoje. Amém.'},

  {t:'O fruto do Espírito', ref:'Gálatas 5:22-23',
   v:'Mas o fruto do Espírito é: amor, gozo, paz, longanimidade, benignidade, bondade, fé, mansidão, temperança.',
   r:['Repare que a Bíblia fala em FRUTO, no singular, não em frutos. É um só fruto com muitos sabores — todos nascem da mesma vida do Espírito em nós. Não se produz isso pela força de vontade, mas pela comunhão com Deus.','Fruto leva tempo para amadurecer. Não desanime se o seu caráter ainda está em formação. Permaneça ligado a Cristo, a videira verdadeira, e o Espírito produzirá em você aquilo que você não consegue produzir sozinho.'],
   o:'Espírito Santo, produz em mim o Teu fruto. Que a minha vida tenha o sabor de Cristo em amor, paz e mansidão. Amém.'},

  {t:'Eu e a minha casa', ref:'Josué 24:15',
   v:'Porém eu e a minha casa serviremos ao Senhor.',
   r:['Josué não impôs a fé pela força, mas assumiu uma decisão pessoal e firme como líder do lar: a casa dele serviria ao Senhor. A fé começa com uma escolha, e o lar é o primeiro campo de missão.','Servir a Deus em casa é mais do que frequentar a igreja; é viver o evangelho diante dos que mais nos conhecem. Que tipo de exemplo a sua família vê em você? Hoje, renove esse compromisso pela sua casa.'],
   o:'Senhor, eu decido: eu e a minha casa serviremos a Ti. Ajuda-me a ser exemplo de fé no meu lar. Amém.'},

  {t:'Ensina a criança', ref:'Provérbios 22:6',
   v:'Ensina a criança no caminho em que deve andar, e até quando envelhecer não se desviará dele.',
   r:['A infância é terreno fértil; o que se planta ali marca a vida inteira. Ensinar não é só falar, é mostrar com o exemplo o caminho da justiça e do temor a Deus.','Pais, professores da EBD e obreiros: não subestimem o valor de uma palavra semeada no coração de uma criança. Muitas vezes a colheita demora, mas a Palavra não volta vazia. Persevere em ensinar o caminho certo.'],
   o:'Senhor, ajuda-me a ensinar as crianças no Teu caminho, com palavras e com exemplo. Guarda-as para Ti. Amém.'},

  {t:'Alegria na provação', ref:'Tiago 1:2-4',
   v:'Meus irmãos, tende grande gozo quando cairdes em várias tentações, sabendo que a prova da vossa fé produz a paciência.',
   r:['A alegria na provação não é fingir que não dói; é confiar que Deus está fazendo algo através do que dói. A prova não veio para te destruir, mas para produzir em você paciência e maturidade.','O ouro passa pelo fogo para sair puro. Se você está no fogo hoje, não desperdice a lição: Deus está formando o Seu caráter em você. Aquilo que hoje parece perda, amanhã será visto como ganho na sua fé.'],
   o:'Senhor, ajuda-me a confiar em Ti no meio da provação. Produz em mim paciência e caráter que Te agradem. Amém.'},

  {t:'Quando passares pelas águas', ref:'Isaías 43:2',
   v:'Quando passares pelas águas, estarei contigo, e quando pelos rios, eles não te submergirão; quando passares pelo fogo, não te queimarás, nem a chama arderá em ti.',
   r:['Deus não promete que não haverá águas nem fogo — promete que estará conosco no meio deles. A presença dEle não elimina o vale, mas nos atravessa por ele em segurança.','Talvez você esteja hoje no meio da correnteza ou no calor da fornalha. Ouça a promessa: as águas não vão te submergir, a chama não vai te consumir. O Deus que chama pelo nome caminha ao seu lado. Não temas.'],
   o:'Senhor, obrigado porque estás comigo nas águas e no fogo. Eu não temerei, porque Tu me sustentas. Amém.'},

  {t:'Em tudo, dai graças', ref:'1 Tessalonicenses 5:18',
   v:'Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus para convosco.',
   r:['Não diz "por tudo", mas "em tudo". Não precisamos agradecer pelo mal, mas podemos agradecer a Deus EM meio a qualquer situação, porque Ele permanece bom e fiel mesmo quando as circunstâncias não são.','A gratidão muda os nossos olhos: em vez de enxergar só o que falta, passamos a ver o que Deus já fez. Um coração grato é um coração que descansa. Comece hoje contando as bênçãos, e a murmuração perderá a força.'],
   o:'Pai, ensina-me a ser grato em todas as circunstâncias. Que a gratidão encha o meu coração e cale a murmuração. Amém.'},

  {t:'Bendize, ó minha alma', ref:'Salmos 103:1-2',
   v:'Bendize, ó minha alma, ao Senhor, e tudo o que há em mim bendiga o seu santo nome. Bendize, ó minha alma, ao Senhor, e não te esqueças de nenhum de seus benefícios.',
   r:['Davi conversa com a própria alma e a chama à adoração. Às vezes a alma está desanimada e precisa ser lembrada de quem Deus é e de tudo o que Ele já fez.','Não te esqueças dos benefícios: o perdão dos pecados, a cura, o resgate da tua vida, o amor e a misericórdia. Quando a memória se enche das bondades de Deus, o louvor brota naturalmente. Bendiga ao Senhor hoje.'],
   o:'Bendigo o Teu santo nome, Senhor, com tudo o que há em mim. Não me deixes esquecer dos Teus benefícios. Amém.'},

  {t:'Perdoando uns aos outros', ref:'Efésios 4:32',
   v:'Antes, sede uns para com os outros benignos, misericordiosos, perdoando-vos uns aos outros, como também Deus vos perdoou em Cristo.',
   r:['O padrão do perdão cristão não são os nossos sentimentos, mas a cruz. Fomos perdoados de uma dívida impagável; como reter contra o próximo uma dívida menor?','Guardar mágoa é beber veneno esperando que o outro adoeça. O perdão liberta primeiro quem perdoa. Não é fácil, mas é possível pela graça. Entregue a ofensa a Deus e escolha perdoar, como você foi perdoado em Cristo.'],
   o:'Senhor, ajuda-me a perdoar como fui perdoado. Tira de mim toda amargura e enche-me da Tua misericórdia. Amém.'},

  {t:'A esperança não envergonha', ref:'Romanos 5:5',
   v:'E a esperança não traz confusão, porquanto o amor de Deus está derramado em nossos corações pelo Espírito Santo que nos foi dado.',
   r:['A esperança do mundo muitas vezes decepciona, porque se apoia em coisas que passam. A esperança cristã não envergonha, porque está fundada no amor de Deus, derramado em nós pelo Espírito.','Quando a espera cansa, lembre-se: quem espera no Senhor não fica envergonhado. O Deus que prometeu é fiel para cumprir. Levante os olhos; a sua esperança tem endereço certo, e Ele nunca falha.'],
   o:'Pai, firma a minha esperança em Ti. Enche o meu coração do Teu amor pelo Espírito Santo e sustenta a minha fé. Amém.'},

  {t:'Buscai primeiro o Reino', ref:'Mateus 6:33',
   v:'Mas buscai primeiro o reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas.',
   r:['Jesus não proíbe cuidar das necessidades, mas ensina a ordem certa: primeiro o Reino, depois o resto. Quando Deus está em primeiro lugar, as demais coisas encontram o seu devido lugar.','A ansiedade nasce quando invertemos a ordem e colocamos as coisas antes de Deus. Coloque o Reino no centro do seu dia — na oração, na Palavra, na obediência — e confie que o Pai cuida do acréscimo. Ele nunca falha em prover.'],
   o:'Senhor, ajuda-me a buscar primeiro o Teu Reino e a Tua justiça. Confio que Tu cuidas de todo o resto. Amém.'},

  {t:'A fé vem pelo ouvir', ref:'Romanos 10:17',
   v:'De sorte que a fé é pelo ouvir, e o ouvir pela palavra de Deus.',
   r:['A fé não brota do nada; ela nasce quando ouvimos a Palavra de Deus. Por isso o inimigo tanto tenta nos afastar da Bíblia e da pregação: ele sabe que ali a fé é alimentada.','Se a sua fé anda fraca, verifique a sua dieta espiritual. Quanto da Palavra tem entrado no seu coração? Alimente-se dela todos os dias, e verá a fé crescer. Ouvir a Deus é o combustível de uma vida que confia.'],
   o:'Senhor, dá-me fome da Tua Palavra. Que ao ouvi-la a minha fé cresça e se firme em Ti a cada dia. Amém.'},

  {t:'Sede santos', ref:'1 Pedro 1:15-16',
   v:'Mas, como é santo aquele que vos chamou, sede vós também santos em toda a vossa maneira de viver. Porquanto está escrito: Sede santos, porque eu sou santo.',
   r:['Santidade não é isolamento nem lista de proibições; é pertencer a Deus e refletir o Seu caráter em toda a maneira de viver. Fomos chamados por um Deus santo para vivermos separados para Ele.','A santidade se manifesta no dia a dia: nas palavras, nas escolhas, no que vemos e no que fazemos escondido. Não é perfeccionismo, mas direção de vida. Peça hoje ao Espírito que te santifique e te faça semelhante a Cristo.'],
   o:'Senhor, santifica-me. Que toda a minha maneira de viver Te agrade e reflita a Tua santidade. Amém.'},

  {t:'Humilhai-vos', ref:'Tiago 4:10',
   v:'Humilhai-vos perante o Senhor, e ele vos exaltará.',
   r:['O caminho para cima, no Reino de Deus, passa por baixo. A humildade não é fraqueza; é reconhecer que tudo o que somos e temos vem de Deus. O orgulhoso confia em si; o humilde confia no Senhor.','Deus resiste aos soberbos, mas dá graça aos humildes. Quem se abaixa diante dEle é levantado no tempo certo, e essa exaltação é firme, porque vem de Deus. Humilhe-se hoje, e deixe que Ele cuide da sua honra.'],
   o:'Senhor, dá-me um coração humilde diante de Ti. Que eu confie em Tua graça e não na minha força. Amém.'},

  {t:'Deus ama quem dá com alegria', ref:'2 Coríntios 9:7',
   v:'Cada um contribua segundo propôs no seu coração, não com tristeza ou por necessidade; porque Deus ama ao que dá com alegria.',
   r:['A generosidade cristã não é imposta, é fruto de um coração grato. Deus não olha só para o quanto damos, mas para o coração com que damos. Ele ama o que dá com alegria.','Quem semeia com fé e alegria colhe as bênçãos de Deus, não como comércio, mas como filho que confia no Pai provedor. Abra a mão para abençoar — a sua vida, o seu tempo, os seus recursos — e descubra a alegria de dar.'],
   o:'Senhor, dá-me um coração generoso e alegre para abençoar os outros. Tudo o que tenho vem de Ti. Amém.'},

  {t:'Faço novas todas as coisas', ref:'Apocalipse 21:5',
   v:'E o que estava assentado sobre o trono disse: Eis que faço novas todas as coisas.',
   r:['O nosso Deus é especialista em recomeços. Ele não apenas conserta o velho; Ele faz novo. Onde havia ruína, Ele planta vida; onde havia culpa, Ele traz perdão.','Se você acha que o seu erro foi grande demais ou que já é tarde para mudar, ouça a voz do trono: "Eis que faço novas todas as coisas". Em Cristo, você é nova criatura. Entregue o velho a Ele e receba o novo que Ele quer fazer.'],
   o:'Senhor, faze novas todas as coisas na minha vida. Renova o meu coração e conduz-me ao Teu propósito. Amém.'},

  {t:'Tudo coopera para o bem', ref:'Romanos 8:28',
   v:'E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.',
   r:['O texto não diz que todas as coisas são boas, mas que todas cooperam para o bem. Deus é tão soberano que até o que o inimigo pretendeu para o mal, Ele redireciona para o bem dos que O amam.','Você pode não entender o capítulo que está vivendo hoje, mas confie no Autor da sua história. Ele tem um propósito, e nenhum fio da sua vida se perde nas mãos dEle. O que hoje parece contra você, amanhã será visto cooperando a seu favor.'],
   o:'Senhor, eu confio que tudo coopera para o bem na Tua mão. Cumpre em mim o Teu propósito. Amém.'},

  {t:'Ele sara os quebrantados', ref:'Salmos 147:3',
   v:'Sara os quebrantados de coração, e liga-lhes as feridas.',
   r:['Deus se importa com as feridas que ninguém vê. Ele não despreza um coração partido; Ele se aproxima dele. O mesmo Deus que conta as estrelas cuida da sua dor pessoal.','Talvez você carregue uma ferida antiga que ainda dói. Leve-a ao Médico dos médicos. Ele não apenas alivia o sintoma; Ele sara a raiz e liga as feridas com cuidado. Entregue hoje o seu coração quebrantado ao Deus que restaura.'],
   o:'Senhor, sara as feridas do meu coração e restaura a minha alma. Em Ti encontro cura e descanso. Amém.'}
];

function _devDiaDoAno(){
  const hoje=new Date();
  const inicio=new Date(hoje.getFullYear(),0,0);
  const diff=hoje-inicio;
  return Math.floor(diff/86400000);
}
function devocionalDoDia(){ return DEVOCIONAIS[_devDiaDoAno()%DEVOCIONAIS.length]; }

let _devIdxLendo=-1;
function abrirDevocional(){
  mostrarTela('tela-devocional');
  _devIdxLendo=_devDiaDoAno()%DEVOCIONAIS.length;
  renderDevLeitura(_devIdxLendo);
  renderDevTodos();
  const sc=document.querySelector('#tela-devocional .dev-scroll'); if(sc) sc.scrollTop=0;
}
function renderDevLeitura(idx){
  const d=DEVOCIONAIS[idx]; if(!d) return;
  const corpo=d.r.map(p=>'<p>'+p+'</p>').join('');
  document.getElementById('dev-leitura').innerHTML=
    '<div class="dev-sheet">'
    +'<h2>'+d.t+'</h2>'
    +'<div class="dev-ref">'+d.ref+'</div>'
    +'<div class="dev-verse">"'+d.v+'"</div>'
    +'<div class="dev-body">'+corpo+'</div>'
    +'<div class="dev-oracao-tit">Oração</div>'
    +'<div class="dev-oracao">'+d.o+'</div>'
    +'<div class="dev-acts">'
      +'<button class="dev-act copy" onclick="copiarDevocional('+idx+')">📋 Copiar</button>'
      +'<button class="dev-act share" onclick="compartilharDevocional('+idx+')">📤 Compartilhar</button>'
    +'</div></div>';
}
function renderDevTodos(){
  const hojeIdx=_devDiaDoAno()%DEVOCIONAIS.length;
  document.getElementById('dev-todos').innerHTML=DEVOCIONAIS.map(function(d,i){
    return '<div class="dev-card" onclick="verDevocional('+i+')">'
      +'<div class="dev-card-num">'+(i+1)+'</div>'
      +'<div class="dev-card-info"><div class="dev-card-tit">'+d.t+(i===hojeIdx?' ✨':'')+'</div><div class="dev-card-ref">'+d.ref+'</div></div>'
      +'<span class="dev-card-arr">›</span></div>';
  }).join('');
}
function verDevocional(idx){
  _devIdxLendo=idx;
  renderDevLeitura(idx);
  const sc=document.querySelector('#tela-devocional .dev-scroll'); if(sc) sc.scrollTop=0;
}
function _devTexto(idx){
  const d=DEVOCIONAIS[idx];
  return '🕊️ *'+d.t+'*\n📖 '+d.ref+'\n\n"'+d.v+'"\n\n'+d.r.join('\n\n')+'\n\n🙏 *Oração:* '+d.o+'\n\n— Devocional Diário · App RADAR\nhttps://radar-atual.vercel.app/?mod=devocional';
}
function copiarDevocional(idx){
  const txt=_devTexto(idx);
  const done=function(){ const b=document.querySelector('#tela-devocional .dev-act.copy'); if(b){ const o=b.innerHTML; b.innerHTML='✔ Copiado!'; setTimeout(function(){b.innerHTML=o;},1600); } };
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(done).catch(function(){ _devCopyFallback(txt); done(); }); }
  else { _devCopyFallback(txt); done(); }
}
function _devCopyFallback(txt){
  try{ const ta=document.createElement('textarea'); ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }catch(e){}
}
function compartilharDevocional(idx){
  const txt=_devTexto(idx);
  if(navigator.share){ navigator.share({title:'Devocional Diário — RADAR',text:txt}).catch(function(){}); }
  else { window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank'); }
}

// ══ PLANO DE LEITURA DA BÍBLIA — Bíblia inteira · progresso por usuário (DB) ══
const BIB_TOTAL_CAPS = 1189;
// Ordem cronológica aproximada (nível livro; capítulos sequenciais dentro de cada livro).
// Livros faltantes são anexados ao fim automaticamente (garante os 66 livros).
const CHRON_LIVROS = ['gn','jó','ex','lv','nm','dt','js','jz','rt','1sm','2sm','1cr','sl','1rs','pv','ec','ct','2rs','2cr','jl','am','os','is','mq','na','sf','hc','jr','lm','ob','ez','dn','ag','zc','et','ed','ne','ml','jn',
  'mt','mc','lc','jo','atos','tg','gl','1ts','2ts','1co','2co','rm','ef','fp','cl','fm','1tm','tt','1pe','hb','2tm','2pe','jd','1jo','2jo','3jo','ap'];
const PLANOS_META = { livre:1, ano:4, cronologico:3 };
const PLANOS_INFO = {
  livre:       {ico:'🕊️', tit:'Livre',       sub:'no seu ritmo'},
  ano:         {ico:'📅', tit:'1 ano',       sub:'~4 caps/dia'},
  cronologico: {ico:'⏳', tit:'Cronológico', sub:'ordem dos fatos'}
};
const LEIT = { key:null, plano:'livre', meta:1, iniciado:null, set:new Set(), datas:new Set(), carregado:false, migrado:false };

function leitKey(){ var u=getUser()||{}; if(u.whatsapp) return u.whatsapp.replace(/\D/g,''); return (u.id||'anon'); }
function _ck(abbrev,cap){ return abbrev.toLowerCase()+'|'+cap; }
function leitLido(abbrev,cap){ return LEIT.set.has(_ck(abbrev,cap)); }
function _fmtDia(dt){ var m=dt.getMonth()+1, d=dt.getDate(); return dt.getFullYear()+'-'+(m<10?'0'+m:m)+'-'+(d<10?'0'+d:d); }
function _hojeStr(){ return _fmtDia(new Date()); }

function _leitCache(){ try{ return 'radar_leitura_'+(LEIT.key||'x'); }catch(e){ return 'radar_leitura_x'; } }
function _leitSalvarCache(){
  try{ localStorage.setItem(_leitCache(), JSON.stringify({plano:LEIT.plano,meta:LEIT.meta,iniciado:LEIT.iniciado,set:[...LEIT.set],datas:[...LEIT.datas]})); }catch(e){}
}
function _leitLerCache(){
  try{ var o=JSON.parse(localStorage.getItem(_leitCache())||'null'); if(o){ LEIT.plano=o.plano||'livre'; LEIT.meta=o.meta||PLANOS_META[LEIT.plano]||1; LEIT.iniciado=o.iniciado||null; LEIT.set=new Set(o.set||[]); LEIT.datas=new Set(o.datas||[]); return true; } }catch(e){}
  return false;
}

function leitCarregar(cb){
  LEIT.key = leitKey();
  _leitLerCache(); // instantâneo (offline-friendly)
  fetch('/api/leitura?user='+encodeURIComponent(LEIT.key)).then(function(r){return r.json();}).then(function(d){
    if(d && d.ok){
      LEIT.plano = (d.config && d.config.plano) || 'livre';
      LEIT.meta  = (d.config && d.config.meta_dia) || PLANOS_META[LEIT.plano] || 1;
      LEIT.iniciado = d.config && d.config.iniciado_em || null;
      LEIT.set = new Set();
      LEIT.datas = new Set();
      (d.progresso||[]).forEach(function(p){
        LEIT.set.add(_ck(p.livro, p.capitulo));
        if(p.lido_em){ try{ LEIT.datas.add(_fmtDia(new Date(p.lido_em))); }catch(e){} }
      });
      LEIT.carregado = true;
      _leitSalvarCache();
      leitMigrarLocal();
    }
    if(cb) cb();
  }).catch(function(){ LEIT.carregado = _leitLerCache(); if(cb) cb(); });
}

// Migra o progresso local antigo (bib_marcados, índices) pro servidor — uma vez.
function leitMigrarLocal(){
  if(LEIT.migrado || !bibData) return;
  var itens=[];
  try{
    var m=JSON.parse(localStorage.getItem('bib_marcados')||'{}');
    Object.keys(m).forEach(function(k){
      var mm=k.match(/^(\d+)_(\d+)$/); if(!mm) return; // só capítulos (não versículos v_)
      var li=+mm[1], ci=+mm[2];
      if(bibData[li] && bibData[li].chapters[ci]){
        var ab=bibData[li].abbrev.toLowerCase(), cap=ci+1;
        if(!leitLido(ab,cap)) itens.push({livro:ab,capitulo:cap});
      }
    });
  }catch(e){}
  LEIT.migrado=true;
  if(!itens.length) return;
  itens.forEach(function(it){ LEIT.set.add(_ck(it.livro,it.capitulo)); });
  LEIT.datas.add(_hojeStr()); _leitSalvarCache();
  fetch('/api/leitura',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:LEIT.key,acao:'marcar_lote',itens:itens})}).catch(function(){});
}

function leitMarcar(abbrev,cap,estado){
  abbrev=abbrev.toLowerCase();
  var k=_ck(abbrev,cap);
  if(estado){ LEIT.set.add(k); LEIT.datas.add(_hojeStr()); }
  else{ LEIT.set.delete(k); }
  _leitSalvarCache();
  fetch('/api/leitura',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:LEIT.key,acao:(estado?'marcar':'desmarcar'),livro:abbrev,capitulo:cap})}).catch(function(){});
}

function leitStreak(){
  if(!LEIT.datas.size) return 0;
  var probe=new Date(); probe.setHours(0,0,0,0);
  if(!LEIT.datas.has(_fmtDia(probe))) probe.setDate(probe.getDate()-1); // vale se leu ontem
  var s=0;
  while(LEIT.datas.has(_fmtDia(probe))){ s++; probe.setDate(probe.getDate()-1); }
  return s;
}

// sequência de leitura conforme o plano (lista de {li,ci,abbrev,cap,nome})
function _seqPlano(){
  var seq=[], vistos={};
  function pushLivro(li){
    if(li<0 || vistos[li]) return; vistos[li]=1;
    var b=bibData[li];
    for(var ci=0; ci<b.chapters.length; ci++) seq.push({li:li,ci:ci,abbrev:b.abbrev.toLowerCase(),cap:ci+1,nome:b.name});
  }
  if(LEIT.plano==='cronologico'){
    CHRON_LIVROS.forEach(function(ab){ pushLivro(bibData.findIndex(function(x){return x.abbrev.toLowerCase()===ab;})); });
    for(var i=0;i<bibData.length;i++) pushLivro(i); // anexa faltantes
  }else{
    for(var j=0;j<bibData.length;j++) pushLivro(j); // canônica (livre e 1 ano)
  }
  return seq;
}
function _proxNaoLidos(n){
  var seq=_seqPlano(), out=[];
  for(var i=0;i<seq.length && out.length<n;i++){ if(!leitLido(seq[i].abbrev,seq[i].cap)) out.push(seq[i]); }
  return out;
}

function abrirPlano(){ mostrarTela('tela-plano'); var sc=document.getElementById('pl-conteudo'); if(sc) sc.scrollTop=0;
  document.getElementById('pl-conteudo').innerHTML='<div class="pl-intro">Carregando seu progresso…</div>';
  var render=function(){ if(!bibData){ fetch('/biblia.json').then(function(r){return r.json();}).then(function(d){bibData=d;renderPlano();}).catch(function(){renderPlano();}); } else { leitMigrarLocal(); renderPlano(); } };
  if(!LEIT.carregado) leitCarregar(render); else render();
}

function escolherPlano(id){
  if(!PLANOS_INFO[id]) return;
  LEIT.plano=id; LEIT.meta=PLANOS_META[id]||1; _leitSalvarCache();
  fetch('/api/leitura',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:LEIT.key,acao:'plano',plano:id,meta_dia:LEIT.meta})}).catch(function(){});
  renderPlano();
}

function leitContinuar(){
  var prox=_proxNaoLidos(1)[0];
  if(!prox){ alert('🎉 Você já leu a Bíblia inteira! Glória a Deus.'); return; }
  abrirBiblia();
  setTimeout(function(){ bibMostrarVers(prox.li, prox.ci); },60);
}

function renderPlano(){
  if(!bibData){ document.getElementById('pl-conteudo').innerHTML='<div class="pl-intro">Não consegui carregar a Bíblia agora. Tente de novo.</div>'; return; }
  var lidos=LEIT.set.size; var pct=Math.round(lidos/BIB_TOTAL_CAPS*100);
  var streak=leitStreak();
  var hoje=_proxNaoLidos(LEIT.plano==='livre'?1:LEIT.meta);
  var prox=hoje[0];

  var html='';
  // seletor de plano
  html+='<div class="pl-planos">'+['livre','ano','cronologico'].map(function(id){
    var info=PLANOS_INFO[id], on=(LEIT.plano===id);
    return '<button class="pl-plano-btn'+(on?' on':'')+'" onclick="escolherPlano(\''+id+'\')">'
      +'<span class="pl-pb-ico">'+info.ico+'</span><span class="pl-pb-tit">'+info.tit+'</span><span class="pl-pb-sub">'+info.sub+'</span></button>';
  }).join('')+'</div>';

  // cabeçalho de progresso
  html+='<div class="pl-head">'
    +'<div class="pl-head-nome">📖 Bíblia inteira</div>'
    +'<div class="pl-head-sub">'+(LEIT.plano==='ano'?'Plano de 1 ano':(LEIT.plano==='cronologico'?'Ordem cronológica':'No seu ritmo'))+'</div>'
    +'<div class="pl-bar"><div class="pl-fill" style="width:'+pct+'%"></div></div>'
    +'<div class="pl-bar-txt"><span class="pl-pct">'+pct+'%</span><span class="pl-conta">'+lidos+' de '+BIB_TOTAL_CAPS+' capítulos</span></div>'
    +'<div class="pl-stats">'
      +'<div class="pl-stat"><b>'+streak+'</b><span>'+(streak===1?'dia seguido':'dias seguidos')+'</span></div>'
      +'<div class="pl-stat"><b>'+lidos+'</b><span>capítulos lidos</span></div>'
      +'<div class="pl-stat"><b>'+(BIB_TOTAL_CAPS-lidos)+'</b><span>faltam</span></div>'
    +'</div>';
  if(prox){
    html+='<div class="pl-proxima"><span style="font-size:20px">👉</span><div style="flex:1;min-width:0"><div style="font-size:11px;color:var(--sub);font-weight:700">Hoje leia</div><b>'+hoje.map(function(x){return x.nome+' '+x.cap;}).join(' · ')+'</b></div></div>';
    html+='<button class="pl-cont-btn" onclick="leitContinuar()">▶ Continuar — '+prox.nome+' '+prox.cap+'</button>';
  }else{
    html+='<div class="pl-parabens">🎉 <b>Parabéns!</b><br>Você leu a Bíblia inteira. Que a Palavra continue frutificando!</div>';
  }
  html+='</div>';

  // visão geral por livro
  html+='<div class="pl-sec">Avanço por livro</div><div class="pl-livros">';
  bibData.forEach(function(b,li){
    var ab=b.abbrev.toLowerCase(), tot=b.chapters.length, n=0;
    for(var ci=1;ci<=tot;ci++){ if(leitLido(ab,ci)) n++; }
    var lp=Math.round(n/tot*100), full=(n===tot);
    html+='<div class="pl-livro-row'+(full?' full':'')+'" onclick="planoAbrirLivro('+li+')">'
      +'<div class="pl-lr-nome">'+(full?'✓ ':'')+b.name+'</div>'
      +'<div class="pl-lr-bar"><div class="pl-lr-fill" style="width:'+lp+'%"></div></div>'
      +'<div class="pl-lr-cnt">'+n+'/'+tot+'</div></div>';
  });
  html+='</div>';
  html+='<div class="pl-acts"><button class="pl-act" onclick="compartilharPlano()">📤 Compartilhar progresso</button></div>';

  document.getElementById('pl-conteudo').innerHTML=html;
}

function planoAbrirLivro(li){ abrirBiblia(); setTimeout(function(){ bibMostrarCaps(li); },60); }

function compartilharPlano(){
  var lidos=LEIT.set.size, pct=Math.round(lidos/BIB_TOTAL_CAPS*100), streak=leitStreak();
  var txt='📖 Meu plano de leitura da Bíblia (App RADAR)\n\n✅ '+lidos+' de '+BIB_TOTAL_CAPS+' capítulos ('+pct+'%)\n🔥 '+streak+' '+(streak===1?'dia seguido':'dias seguidos')+'\n\nLeia a Bíblia todo dia também:\nhttps://radar-atual.vercel.app';
  if(navigator.share){ navigator.share({title:'Meu progresso na Bíblia',text:txt}).catch(function(){}); }
  else { try{ navigator.clipboard.writeText(txt); alert('Progresso copiado! 📋'); }catch(e){ window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank'); } }
}
function buscaGlobal(q){
  const v = q.trim().toLowerCase();
  document.getElementById('painel-hoje-wrap').innerHTML = '';
  document.getElementById('continuar-wrap').innerHTML = '';
  const _dw=document.getElementById('devocional-home-wrap'); if(_dw) _dw.innerHTML='';
  if(!v){renderHome();return;}
  const mf = MODS.filter(m=>m.nome.toLowerCase().includes(v)||m.desc.toLowerCase().includes(v));
  document.getElementById('modulos').innerHTML = mf.length
    ? mf.map(m=>`<div class="modulo-tile" style="--tile-color:${m.cor}" onclick="abrirMod('${m.id}')"><div class="tile-icon">${m.img?`<img class="tile-icon-img" src="${m.img}">`:m.icon}</div><div class="tile-info"><div class="tile-nome">${m.nome}</div><div class="tile-desc">${m.desc}</div></div><div class="tile-arr">›</div></div>`).join('')
    : '<div style="text-align:center;padding:32px 0;color:var(--sub);font-size:13px">Nenhum resultado</div>';
}
function focusBusca(){ document.getElementById('home-busca').focus(); }
function irFavoritos(){ alert('Favoritos — em breve'); }
function irPerfil(){
  const u=getUser();
  if(!u){ if(typeof checkAuth==='function'){checkAuth();} return; }
  mostrarTela('tela-perfil');
  renderPerfil();
}
function renderPerfil(){
  const u=getUser()||{};
  const nome=u.nome||'Visitante';
  document.getElementById('pf-nome').textContent=nome;
  document.getElementById('pf-cargo').textContent=u.cargo||'—';
  const fone=u.whatsapp||'';
  document.getElementById('pf-fone').textContent = fone ? ('📱 '+fone) : '';
  const ini=(nome.trim()[0]||'?').toUpperCase();
  document.getElementById('pf-avatar').textContent=ini;
  atualizarFsUI();
}
// ── Tamanho da letra (leitura) ──
function getFs(){ var n=parseInt(localStorage.getItem('radar_fs')||'1',10); return (n>=1&&n<=3)?n:1; }
function aplicarFs(){ document.documentElement.setAttribute('data-fs', String(getFs())); }
function mudarFs(delta){
  var n=getFs()+delta;
  if(n<1)n=1; if(n>3)n=3;
  localStorage.setItem('radar_fs', String(n));
  aplicarFs();
  atualizarFsUI();
}
function atualizarFsUI(){
  var n=getFs();
  var nomes={1:'Normal',2:'Grande',3:'Enorme'};
  var el=document.getElementById('pf-fs-nivel'); if(el) el.textContent=nomes[n];
  var sample=document.getElementById('pf-fs-sample');
  if(sample) sample.style.fontSize=({1:'15px',2:'18px',3:'21px'})[n];
  var menos=document.getElementById('pf-fs-menos'), mais=document.getElementById('pf-fs-mais');
  if(menos) menos.disabled=(n<=1);
  if(mais) mais.disabled=(n>=3);
}
function compartilharApp(){
  var txt='📱 *RADAR ATUAL* — o app da nossa igreja: Bíblia, Harpa Cristã, EBD, Devocional Diário e muito mais, tudo num lugar só.\n\nBaixe grátis aqui:\nhttps://radar-atual.vercel.app';
  if(navigator.share){ navigator.share({title:'App RADAR ATUAL',text:txt}).catch(function(){}); }
  else { window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank'); }
}
aplicarFs();

function compartilhar(e, id, nome){
  e.stopPropagation();
  const url = location.origin + '?mod=' + id;
  if(navigator.share){
    navigator.share({title:'RADAR ATUAL — ' + nome, text: nome, url});
  } else {
    navigator.clipboard.writeText(url).then(()=>{
      const btn = e.currentTarget;
      btn.style.color='var(--gold)';
      setTimeout(()=>btn.style.color='',1200);
    });
  }
}
// compartilha o LINK DIRETO do jogo Maratona de Marcos
function compartilharJogo(e){
  if(e) e.stopPropagation();
  const url='https://quiz-marcos.vercel.app';
  const texto='🏆 Maratona de Marcos — Game bíblico\nEstude Marcos 1 a 5 jogando! 10 modos, grátis, abre no celular:';
  if(navigator.share){
    navigator.share({title:'Maratona de Marcos',text:texto,url}).catch(function(){});
  } else {
    navigator.clipboard.writeText(texto+'\n'+url).then(function(){ showToast('🔗 Link copiado!'); })
      .catch(function(){ showToast(url); });
  }
}

const AG_ESTADUAL=[["JANEIRO", [["16 e 17", "SEC", "4º SISLED – Simpósio Estadual de Superintendentes e líderes de EBD", "AD Pedreiras"], ["28 a 31", "SEDAC", "Formação de Formadores", "A definir"], ["31", "UNILIDER", "Seletivo do Festival Adora São Luís", "São Luís"]]], ["FEVEREIRO", [["05 a 08", "C. de Ingresso", "1ª Etapa do Treinamento de Ingresso", "AD Presidente Dutra"]]], ["MARÇO", [["01/03 a 15/08", "SEC", "4º Concurso Bíblico Estadual “Gosto de Ler a Bíblia” – Início das Inscrições", "Todas as ADs do MA"], ["18 a 20", "CEADEMA", "1ª AGE", "AD Santa Luzia do Paruá"], ["27 a 29", "UMAD", "Liderar Nordeste", "Fortaleza - CE"]]], ["ABRIL", [["03 a 05", "UFPMA", "16º Encontro da UFPMA", "AD Santa Inês"], ["10 a 12", "SEDAC", "Mentoriar KIDS", "A definir"], ["16 a 19", "C. de Ingresso", "2ª Etapa do Treinamento de Ingresso", "AD Sucupira do Norte"]]], ["MAIO", [["01 a 31", "SEC", "Mês da Família – Mob. Pró-Família · Tema: “Famílias que vencem em tempos difíceis”", "Todas as ADs do MA"], ["01 a 03", "SEMADEMA", "Imersão Missionária", "Caxias - MA"]]], ["JUNHO", [["04 a 06", "UMADENE", "Fórum de Missões do Nordeste", "Abreu Lima - PE"], ["07", "SECPAD", "1ª Edição Seminário “O Bom Samaritano”", "AD Barra do Corda"], ["11 a 14", "C. de Ingresso", "3ª Etapa do Treinamento de Ingresso", "AD Timbiras"], ["24 a 26", "CEADEMA", "2ª AGE", "AD São Mateus"]]], ["JULHO", [["01 a 31", "SEDAC", "Escola Bíblica de Férias", "Todas as ADs do MA"], ["05", "SEMADEMA", "Mobilização Missionária", "Todas as ADs do MA"], ["10 a 12", "FAMÍLIA", "ELFAD 2026 – Enc. de Líderes de Família da AD", "A definir"], ["22 a 24", "UNEOMAD", "42º Cong. Est. de Missionárias e Dirig. de C. Oração", "AD Santa Inês"], ["30/07 a 01/08", "UNILIDER", "SIMJAD", "AD Vitória do Mearim"]]], ["AGOSTO", [["07 a 09", "SENAMI/SEMADEMA", "Simpósio Nacional de Missões", "AD Lago da Pedra"], ["08", "UNILIDER", "Dia do Jovem Assembleiano", "Todas as ADs do MA"], ["12/08 a 12/09", "SEMADEMA/SEDAC", "31 Dias de Oração Pelo Nordeste", "Todas as ADs do MA"], ["14 a 16", "SEDAC", "Conferência de Discipulado e Mentoria", "A definir"], ["15", "SEC", "Final do 4º Conc. Bíblico Estadual “Gosto de Ler a Bíblia”", "AD Lago da Pedra"], ["20 a 22", "UMADENE/UMAD", "40ª AGO e EBO / Impactar Nordeste", "São Luís - MA"]]], ["SETEMBRO", [["12", "SEMADEMA/SEDAC", "Nordeste para Cristo · Nordeste para Cristo Kids - Impacto", "Todas as ADs do MA"], ["12 a 13", "CGADB", "Fórum Nacional da Juventude", "São Luís - MA"]]], ["OUTUBRO", [["01 a 15", "SEDAC", "Semana de Oração, Mobilização e Evangelização Infantojuvenil", "Todas as ADs do MA"], ["10 a 11", "UFPMA", "UFPMA em Missão", "AD Presidente Médice"]]], ["NOVEMBRO", [["14", "SECPAD", "2ª Edição Seminário “O Bom Samaritano”", "AD Tirirical / São Luís"]]], ["DEZEMBRO", [["05", "SEDAC", "Feira Bíblica Infantojuvenil", "Todas as ADs do MA"], ["14 a 18", "CEADEMA", "87ª Assembleia Geral Ordinária - AGO", "AD Barra do Corda"]]], ["JANEIRO 2027", [["21 a 23", "SEC", "8º CEEDC – Congresso Estadual de Escola Dominical da CEADEMA", "AD Bacabal"]]]];
const AG_REGIONAL=[["MARÇO", [["20 a 22", "Evangelismo", "Cruzada Evangelística CEADEMA – Projeto Barnabé", "AD Livramento - Peritoró"]]], ["ABRIL", [["10 a 11", "UNILIDER", "1º TILL", "AD Buriti Bravo"], ["17 a 19", "Evangelismo", "Cruzada Evangelística CEADEMA – Projeto Trôade", "AD Brejinho - Caxias"]]], ["MAIO", [["15 a 17", "Evangelismo", "Cruzada Evangelística CEADEMA – Projeto Silas", "AD Serrinha - Joselândia"]]], ["JUNHO", [["19 a 21", "Evangelismo", "Cruzada Evangelística CEADEMA – Projeto Trôade", "AD Paiol do Centro - Parnarama"]]], ["JULHO", [["17 a 19", "Evangelismo", "Cruzada Evangelística CEADEMA – Projeto Barnabé", "AD Morros dos Cabocos – Bernardo do Mearim"]]], ["AGOSTO", [["08", "SEC", "3ª CREDC – Conferência Regional de Escola Dominical da CEADEMA – Polo Metropolitano do Estado, Muniz e Lençóis Maranhenses · Projetos: Atos e Marcos", "AD Barreirinhas"], ["21 a 23", "Evangelismo", "Cruzada Evangelística CEADEMA – Projeto Tito", "AD Brejo das Flores – Vitorino Freire"]]], ["SETEMBRO", [["18 a 20", "Evangelismo", "Cruzada Evangelística CEADEMA – Projeto Atos", "AD Jussatuba - Icatu"]]], ["OUTUBRO", [["16 a 18", "Evangelismo", "Cruzada Evangelística CEADEMA – Projeto Eliseu", "AD Conceição - Mirador"]]], ["NOVEMBRO", [["20 a 22", "Evangelismo", "Cruzada Evangelística CEADEMA – Projeto ENCOPAELO", "AD Maçaricó - Guimarães"], ["20 a 21", "UNILIDER", "2º TILL", "AD Bacabeira"]]], ["DEZEMBRO", [["12 a 13", "Evangelismo", "Cruzada Evangelística CEADEMA – Projeto Eliseu", "AD São João da Mata – Governador Luiz Rocha"], ["19", "SEDAC", "Cantata de Natal", "Sede dos Polos"]]]];
const AG_TEMPLO_JUL=[["QUI", "02/jul", "Vigília Geral", "Templo Central"], ["SÁB", "04/jul", "Café do Silas", "AD Santa Luzia"], ["SÁB", "04/jul", "6º Encontro UMADET", "Cong. Lírio dos Vales"], ["DOM", "05/jul", "Culto da Família", ""], ["SEG", "06/jul", "Culto Geral de Santa Ceia", ""], ["", "08 a 10/07", "2ª AGE CEADEMA", "AD São Mateus - MA"], ["QUA", "08/jul", "Encontro UFADET", "Cong. Monte das Oliveiras"], ["SÁB", "11/jul", "Culto Local UMADET", "Templo Sede e Congregações"], ["DOM", "12/jul", "Ceia nas Congregações do Campo", ""], ["", "13 a 18/07", "EBF 2026 - Jesus a Bordo", ""], ["DOM", "19/jul", "Culto Local de Missões · Mob. Missionária SEMADEMA 2026", ""], ["", "22 a 24/07", "42º UNEOMAD", "AD Santa Inês"], ["SÁB", "25/jul", "Culto Local UMADET", "Templo Sede e Congregações"], ["DOM", "26/jul", "Culto de Louvor e Adoração", ""], ["QUI", "30/jul", "Encontro UHADET", ""], ["", "30/07 a 01/08", "SIMJAD UNILIDER", "AD Vitorino Freire - MA"]];
const AG_TEMPLO_AGO=[["SÁB", "01/ago", "2º Encontrão UMADEAS", "AD Vila São Paulo - Senador"], ["DOM", "02/ago", "Culto da Família", ""], ["SEG", "03/ago", "Culto Geral de Santa Ceia", ""], ["QUI", "06/ago", "Encontro UCADET / Vigília Geral", ""], ["", "07 a 09/08", "Simpósio Nacional de Missões SEMANI/SEMADEMA", "AD Lago da Pedra"], ["SÁB", "08/ago", "Culto de Ações de Graças · Aniversário do Pr. Domingos", ""], ["DOM", "09/ago", "Culto Local em Homenagem ao Dia dos Pais", ""], ["QUA", "12/ago", "Encontro da UFADET", "Cong. Moriá Arroz"], ["QUI", "13/ago", "Encontro Geral UHADET", ""], ["SÁB", "15/ago", "7º Encontro UMADET", "Cong. Monte das Oliveiras"], ["DOM", "16/ago", "Culto Local de Missões", "Templo Sede e Congregações"], ["QUI", "20/ago", "Cruzadas Tuntum para Cristo", "Cong. Canaã"], ["SEX", "21/ago", "Cruzadas Tuntum para Cristo", "Cong. Vila Bento"], ["SÁB", "22/ago", "1º Simpósio de Missões", "Templo Central"], ["DOM", "23/ago", "Culto de Santa Ceia nas Congregações", ""], ["QUI", "27/ago", "Cruzadas Tuntum para Cristo", "Cong. Vila Mata"], ["SEX", "28/ago", "Cruzadas Tuntum para Cristo", "Cong. Nova Aliança"], ["SÁB", "29/ago", "Culto Local UMADET", "Templo Sede e Congregações"], ["DOM", "30/ago", "Culto de Louvor e Adoração", ""]];
const AG_SEMANAL=[["DOM", ["1º Domingo — Culto da Família", "2º Domingo — Culto Local de Missões", "3º e 4º Domingo — Culto de Louvor e Adoração"]], ["SEG", ["Culto de Assembleia Geral", "1ª Segunda do mês — Santa Ceia Geral"]], ["TER", ["Livre / Ensaio Orquestra"]], ["QUA", ["Consagração / Círculo de Oração", "2ª Quarta do mês — Encontro Geral UFADET"]], ["QUI", ["Culto de Crianças / Culto da UHADET", "2ª Quinta — Encontro Geral UCADET", "4ª Quinta — Encontro Geral UHADET"]], ["SEX", ["Culto de Oração e Ensino nas Congregações"]], ["SÁB", ["1º Sábado — Culto Geral de Jovens", "2º Sábado — Culto de Jovens no Setor", "3º Sábado — UMADET em Missão", "4º — Agendamento de Eventos"]]];
const AG_TEMPLO_FIXO=[["Domingo", "EBD e cultos conforme cronograma"], ["Segunda", "Culto de Doutrina"], ["Terça", "Ensaio Orquestra"], ["Quarta", "Círculo de Oração"], ["Quinta", "UHADET / UCADET"], ["Sexta", "Culto de Oração"], ["Sábado", "Culto de Jovens"]];
const AG_ENSAIOS=[["UMADET", "14h às 15h"], ["UCADET", "15h às 15h30"], ["Jovens e Adolescentes", "15h30 às 16h"], ["UFADET", "16h às 16h45"], ["UHADET", "16h45 às 17h30"]];
const AG_MURAL=["11 e 12/09 — Festa Cong. Lírio dos Vales", "26/09 — 1º Encontrão UHADET", "31/10 a 01/11 — Conferência EBD"];

// ===== AGENDAS (CEADEMA + Templo Central) =====
function mostrarTela(id){ ocultarTodas(); document.getElementById(id).classList.add('ativa'); }

/* ===== CARTAZES (mural visual de eventos) ===== */
var CARTAZES=[
  {id:'encontro-projetos', titulo:'Encontro de Projetos', data:'05 de setembro de 2026', dataISO:'2026-09-05', sub:'AD Governador Archer',
   img:'/img/cartazes/encontro-projetos.jpg', link:'https://forms.gle/8j69Up7inBNigtXGA', linkTxt:'📝 Fazer inscrição',
   texto:'Em nome do Pastor Elizaldo Abreu, coordenador do PRO-JETRO, e do Pastor José Aguinaldo, coordenador do Projeto SILAS, juntamente com o Pastor Lázaro, presidente da Assembleia de Deus em Governador Archer. Convidamos todos para o Encontro de Projetos, dia 05 de setembro.\n\n🕗 1ª Plenária: 8h às 11h30\n🍽️ Almoço: 11h30 às 13h30\n🕜 2ª Plenária: 13h30 às 16h\n\n💰 Inscrição: Individual R$ 20 | Casal R$ 30\n\n🎤 Pregador: Pr. Euvaldo Sá – Timon\n🎶 Cantora: Vitória – Dom Pedro\n\n🤝 Participação:\n • SEDAC\n • Conselho Político\n\nContamos com a presença de todos!'}
];
var _slides=[], _slideIdx=0, _slideTimer=null, _slideBox='slideshow', _slidesMostrados=false;
function _naoExpirou(iso){ if(!iso) return true; try{ var t=new Date(iso+'T23:59:59'); var h=new Date(); h.setHours(0,0,0,0); return t>=h; }catch(e){ return true; } }
function _fmtData(iso){ if(!iso) return ''; var p=(''+iso).split('-'); return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):iso; }
function embedMedia(u){
  u=(u||'').trim();
  var yt=u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if(yt) return {type:'yt', src:'https://www.youtube.com/embed/'+yt[1]};
  if(/instagram\.com/.test(u)){ var b=u.split('?')[0].replace(/\/+$/,''); return {type:'ig', src:b+'/embed'}; }
  if(/facebook\.com|fb\.watch|fb\.me/.test(u)){ return {type:'fb', src:'https://www.facebook.com/plugins/video.php?href='+encodeURIComponent(u)+'&show_text=false&width=500'}; }
  if(/drive\.google\.com/.test(u)){ var g=u.match(/\/d\/([^/]+)/)||u.match(/[?&]id=([^&]+)/); return {type:'gd', src:(g?('https://drive.google.com/file/d/'+g[1]+'/preview'):u)}; }
  return {type:'link', src:u};
}
function abrirCartazes(){
  mostrarTela('tela-cartazes'); _slideBox='slideshow'; _slideIdx=0;
  _slides=CARTAZES.filter(function(c){return _naoExpirou(c.dataISO);}).map(function(c){var o={};for(var k in c)o[k]=c[k];o._t='cartaz';return o;});
  renderSlideshow();
  carregarMidias();
}
function carregarMidias(){
  fetch('/api/videos?acao=midia-list').then(function(r){return r.json();}).then(function(d){
    var est=CARTAZES.filter(function(c){return _naoExpirou(c.dataISO);}).map(function(c){var o={};for(var k in c)o[k]=c[k];o._t='cartaz';return o;});
    var din=(d&&d.ok&&d.midias?d.midias:[]).map(function(m){m._t='midia';return m;});
    _slides=est.concat(din);
    if(_slideIdx>=_slides.length)_slideIdx=0;
    renderSlideshow();
  }).catch(function(){});
}
function slideMediaHTML(s){
  if(s._t==='cartaz') return '<img src="'+s.img+'" onclick="_abrirImg(\''+s.img+'\')" style="width:100%;display:block;cursor:pointer">';
  if(s.media_tipo==='imagem' && s.media_url) return '<img src="'+s.media_url+'" onclick="_abrirImg(\''+s.media_url+'\')" style="width:100%;display:block;cursor:pointer">';
  if(s.media_tipo==='video' && s.media_url){
    var e=embedMedia(s.media_url);
    if(e.type==='link') return '<a href="'+e.src+'" target="_blank" style="display:block;background:#0f3d5c;color:#fff;text-align:center;padding:18px;font-weight:800;text-decoration:none">▶ Abrir vídeo</a>';
    if(e.type==='yt') return '<div style="position:relative;padding-top:56.25%;background:#000"><iframe src="'+e.src+'" allow="autoplay;encrypted-media;fullscreen" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>';
    return '<iframe src="'+e.src+'" allow="autoplay;encrypted-media;fullscreen" allowfullscreen scrolling="no" style="width:100%;height:560px;border:0;background:#000;display:block"></iframe>';
  }
  return '';
}
function slideHTML(s){
  var isVid=(s.media_tipo==='video' && s.media_url);
  var img = s._t==='cartaz' ? s.img : (s.media_tipo==='imagem'? s.media_url : '');
  if(!isVid && img){
    var ov='';
    if(s._t==='cartaz'){
      ov='<div style="font-weight:800;font-size:1.08rem;line-height:1.2">'+esc2(s.titulo)+'</div>'
        +'<div style="font-size:.8rem;color:#ffe1a6;margin-top:2px">📅 '+esc2(s.data)+(s.sub?(' · '+esc2(s.sub)):'')+'</div>';
      if(s.texto) ov+='<div style="font-size:.85rem;line-height:1.45;margin-top:7px;color:#eef3fa;max-height:30vh;overflow:auto;white-space:pre-line">'+esc2(s.texto)+'</div>';
    } else {
      if(s.texto) ov+='<div style="font-weight:700;font-size:.98rem;line-height:1.45;color:#fff;max-height:30vh;overflow:auto;white-space:pre-line">'+esc2(s.texto)+'</div>';
      ov+='<div style="font-size:.78rem;color:#cfe0ee;margin-top:6px">👤 '+esc2(s.autor_nome||'')+(s.autor_cargo?(' · '+esc2(s.autor_cargo)):'')+(s.autor_igreja?(' · '+esc2(s.autor_igreja)):'')+(s.data_evento?(' · 📅 '+_fmtData(s.data_evento)):'')+'</div>';
    }
    var btns='';
    if(s._t==='cartaz'){
      var b='';
      if(s.link) b+='<a href="'+s.link+'" target="_blank" style="flex:1;text-align:center;background:#0f3d5c;color:#fff;border-radius:11px;padding:12px;font-weight:800;text-decoration:none;font-size:.92rem">'+esc2(s.linkTxt||'Abrir link')+'</a>';
      b+='<button onclick="compartilharCartaz(\''+s.id+'\')" style="'+(s.link?'':'flex:1;')+'background:#25D366;color:#fff;border:none;border-radius:11px;padding:12px 16px;font-weight:800;font-family:inherit;cursor:pointer">📤</button>';
      btns='<div style="display:flex;gap:8px;padding:10px 12px">'+b+'</div>';
    }
    return '<div style="background:#fff;border:1px solid #e4e7ec;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(15,61,92,.12)">'
      +'<div style="position:relative">'
        +'<img src="'+img+'" onclick="_abrirImg(\''+img+'\')" style="width:100%;display:block;cursor:pointer">'
        +'<div style="position:absolute;left:0;right:0;bottom:0;padding:48px 15px 14px;background:linear-gradient(to top, rgba(8,20,34,.95), rgba(8,20,34,.78) 42%, rgba(8,20,34,0));color:#fff">'+ov+'</div>'
      +'</div>'+btns+'</div>';
  }
  var cap='<div style="padding:13px 15px">';
  if(s.texto) cap+='<div style="color:#1b2436;font-size:.96rem;line-height:1.55;white-space:pre-line;margin-bottom:9px">'+esc2(s.texto)+'</div>';
  if(s._t!=='cartaz') cap+='<div style="font-size:.82rem;color:#6b7280;border-top:1px solid #eef1f5;padding-top:9px">👤 <b style="color:#0f3d5c">'+esc2(s.autor_nome||'')+'</b>'+(s.autor_cargo?(' · '+esc2(s.autor_cargo)):'')+(s.autor_igreja?('<br>⛪ '+esc2(s.autor_igreja)):'')+(s.data_evento?('<br>📅 '+_fmtData(s.data_evento)):'')+'</div>';
  cap+='</div>';
  return '<div style="background:#fff;border:1px solid #e4e7ec;border-radius:16px;overflow:hidden;box-shadow:0 3px 12px rgba(15,61,92,.10)">'+slideMediaHTML(s)+cap+'</div>';
}
function _ovTexto(s){
  var ov='';
  if(s._t==='cartaz'){
    ov='<div style="font-weight:800;font-size:1.06rem;line-height:1.2">'+esc2(s.titulo)+'</div>'
      +'<div style="font-size:.8rem;color:#ffe1a6;margin-top:2px">📅 '+esc2(s.data)+(s.sub?(' · '+esc2(s.sub)):'')+'</div>';
    if(s.texto) ov+='<div style="font-size:.85rem;line-height:1.42;margin-top:6px;color:#eef3fa;max-height:26vh;overflow:auto;white-space:pre-line">'+esc2(s.texto)+'</div>';
    if(s.link) ov+='<a href="'+s.link+'" target="_blank" style="display:inline-block;margin-top:9px;background:#a9791c;color:#fff;border-radius:10px;padding:9px 14px;font-weight:800;text-decoration:none;font-size:.86rem">'+esc2(s.linkTxt||'Abrir link')+'</a>';
  } else {
    if(s.texto) ov+='<div style="font-weight:700;font-size:.98rem;line-height:1.45;color:#fff;max-height:26vh;overflow:auto;white-space:pre-line">'+esc2(s.texto)+'</div>';
    ov+='<div style="font-size:.78rem;color:#cfe0ee;margin-top:6px">👤 '+esc2(s.autor_nome||'')+(s.autor_cargo?(' · '+esc2(s.autor_cargo)):'')+(s.autor_igreja?(' · '+esc2(s.autor_igreja)):'')+(s.data_evento?(' · 📅 '+_fmtData(s.data_evento)):'')+'</div>';
  }
  return ov;
}
function _ytThumb(u){ var m=(u||'').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/); return m?('https://img.youtube.com/vi/'+m[1]+'/mqdefault.jpg'):''; }
function _playVideo(enc){
  clearTimeout(_slideTimer);
  var url=decodeURIComponent(enc), e=embedMedia(url);
  if(e.type==='link'){ window.open(e.src,'_blank'); return; }
  var src=(e.type==='yt')?(e.src+'?autoplay=1&rel=0'):e.src;
  var o=document.createElement('div'); o.style.cssText='position:fixed;inset:0;background:#000;z-index:99999;display:flex;flex-direction:column';
  o.innerHTML='<button onclick="this.parentNode.remove();try{renderSlideshow()}catch(e){}" style="align-self:flex-end;background:#e50914;color:#fff;border:none;padding:11px 20px;margin:10px;border-radius:999px;font-weight:800;font-family:inherit;cursor:pointer">✕ Fechar</button>'
    +'<iframe src="'+src+'" allow="autoplay;encrypted-media;fullscreen" allowfullscreen style="flex:1;width:100%;border:0"></iframe>';
  document.body.appendChild(o);
}
function slideHTMLFull(s){
  var isVid=(s.media_tipo==='video' && s.media_url);
  var img = s._t==='cartaz' ? s.img : (isVid ? (s.poster_url||_ytThumb(s.media_url)) : s.media_url);
  var ov='';
  if(s._t==='cartaz'){
    ov='<div style="font-weight:800;font-size:1.05rem;line-height:1.2">'+esc2(s.titulo)+'</div>'
      +'<div style="font-size:.8rem;color:#ffe1a6;margin:2px 0 4px">📅 '+esc2(s.data)+(s.sub?(' · '+esc2(s.sub)):'')+'</div>';
    if(s.texto) ov+='<div style="font-size:.9rem;line-height:1.5;color:#eef3fa;white-space:pre-line">'+esc2(s.texto)+'</div>';
    var bl='';
    if(s.link) bl+='<a href="'+s.link+'" target="_blank" onclick="event.stopPropagation()" style="flex:1;text-align:center;background:#a9791c;color:#fff;border-radius:10px;padding:11px;font-weight:800;text-decoration:none;font-size:.88rem">'+esc2(s.linkTxt||'Abrir link')+'</a>';
    bl+='<button onclick="event.stopPropagation();compartilharCartaz(\''+s.id+'\')" style="'+(s.link?'':'flex:1;')+'background:#25D366;color:#fff;border:none;border-radius:10px;padding:11px 16px;font-weight:800;font-family:inherit;cursor:pointer">📤</button>';
    ov+='<div style="display:flex;gap:8px;margin-top:10px">'+bl+'</div>';
  } else {
    if(s.texto) ov+='<div style="font-weight:600;font-size:.94rem;line-height:1.48;color:#fff;white-space:pre-line">'+esc2(s.texto)+'</div>';
    ov+='<div style="font-size:.78rem;color:#cfe0ee;margin-top:6px">👤 '+esc2(s.autor_nome||'')+(s.autor_cargo?(' · '+esc2(s.autor_cargo)):'')+(s.autor_igreja?(' · '+esc2(s.autor_igreja)):'')+'</div>';
    if(_ehAdmin()&&s.id) ov+='<button onclick="event.stopPropagation();deletePost('+s.id+')" style="margin-top:8px;background:#8a1c1c;color:#fff;border:none;border-radius:8px;padding:7px 12px;font-weight:800;font-family:inherit;cursor:pointer">🗑️ Apagar</button>';
  }
  var onclick = isVid ? ('_playVideo(\''+encodeURIComponent(s.media_url)+'\')') : ('_abrirImg(\''+img+'\')');
  var playbtn = isVid ? '<div style="position:absolute;left:0;right:0;top:32%;display:flex;justify-content:center;pointer-events:none"><div style="width:74px;height:74px;border-radius:50%;background:rgba(0,0,0,.55);border:3px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:30px;padding-left:5px">▶</div></div>' : '';
  return '<div onclick="'+onclick+'" style="position:relative;height:calc(100dvh - 165px);min-height:360px;background:#0a1420;border-radius:14px;overflow:hidden;display:flex;align-items:center;justify-content:center;cursor:pointer">'
    +(img?('<img src="'+img+'" style="max-width:100%;max-height:100%;display:block">'):'')
    +playbtn
    +'<div style="position:absolute;left:0;right:0;bottom:0;max-height:46%;overflow-y:auto;padding:56px 16px 16px;background:linear-gradient(to top, rgba(6,16,30,.97) 60%, rgba(6,16,30,.82) 82%, transparent);color:#fff">'+ov+'</div>'
    +'</div>';
}
function renderSlideshow(){
  var box=document.getElementById(_slideBox); if(!box) return;
  if(!_slides.length){ box.innerHTML='<div style="text-align:center;color:#6b7280;padding:40px 16px">Nenhum cartaz ou mídia no momento.<br><span style="font-size:.85rem">Toque em “Publicar minha mídia” pra começar.</span></div>'; return; }
  if(_slideIdx>=_slides.length)_slideIdx=0;
  var s=_slides[_slideIdx], dots='';
  for(var i=0;i<_slides.length;i++){ dots+='<span onclick="_slideGo('+i+')" style="width:9px;height:9px;border-radius:50%;background:'+(i===_slideIdx?'#0f3d5c':'#c3d2e0')+';cursor:pointer;display:inline-block"></span>'; }
  var ctrl=_slides.length>1?('<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:12px">'
    +'<button onclick="_slidePrev()" style="background:#eef4f8;border:none;border-radius:10px;width:42px;height:38px;font-size:20px;color:#0f3d5c;cursor:pointer">‹</button>'
    +'<div style="display:flex;gap:7px;align-items:center">'+dots+'</div>'
    +'<button onclick="_slideNext()" style="background:#eef4f8;border:none;border-radius:10px;width:42px;height:38px;font-size:20px;color:#0f3d5c;cursor:pointer">›</button></div>'
    +'<div style="text-align:center;color:#8a91a0;font-size:.78rem;margin-top:6px">'+(_slideIdx+1)+' de '+_slides.length+'</div>'):'';
  box.innerHTML=(_slideBox==='slides-full'?slideHTMLFull(s):slideHTML(s))+ctrl;
  clearTimeout(_slideTimer);
  if(_slides.length>1){ _slideTimer=setTimeout(_slideNext,8000); }
}
function _slideNext(){ if(!_slides.length)return; _slideIdx=(_slideIdx+1)%_slides.length; renderSlideshow(); }
function _slidePrev(){ if(!_slides.length)return; _slideIdx=(_slideIdx-1+_slides.length)%_slides.length; renderSlideshow(); }
function _slideGo(i){ _slideIdx=i; renderSlideshow(); }
function abrirCartaz(id){
  var c=CARTAZES.find(function(x){return x.id===id;}); if(!c) return;
  document.getElementById('cartaz-tit').textContent=c.titulo;
  document.getElementById('cartaz-sub').textContent=c.data;
  var h='<img src="'+c.img+'" style="width:100%;border-radius:16px;display:block;box-shadow:0 6px 18px rgba(0,0,0,.18)">';
  if(c.texto) h+='<div style="background:#fff;border:1px solid #e4e7ec;border-radius:16px;padding:16px;margin-top:14px;color:#1b2436;font-size:.98rem;line-height:1.62;white-space:pre-line">'+esc2(c.texto)+'</div>';
  if(c.link) h+='<a href="'+c.link+'" target="_blank" style="display:block;text-align:center;background:#0f3d5c;color:#fff;border-radius:13px;padding:15px;font-weight:800;text-decoration:none;margin-top:13px">'+esc2(c.linkTxt||'Abrir link')+'</a>';
  h+='<button onclick="compartilharCartaz(\''+c.id+'\')" style="display:block;width:100%;background:#25D366;color:#fff;border:none;border-radius:13px;padding:14px;font-weight:800;font-family:inherit;cursor:pointer;margin-top:10px">📤 Compartilhar</button>';
  var b=document.getElementById('cartaz-body'); b.innerHTML=h; b.scrollTop=0;
  mostrarTela('tela-cartaz');
}
function compartilharCartaz(id){
  var c=CARTAZES.find(function(x){return x.id===id;}); if(!c) return;
  var txt='📢 '+c.titulo+' — '+c.data+(c.sub?(' · '+c.sub):'')+(c.link?('\n📝 Inscrição: '+c.link):'')+'\n\nVeja no RADAR: https://radar-atual.vercel.app';
  if(navigator.share){ navigator.share({title:c.titulo,text:txt}).catch(function(){}); }
  else { navigator.clipboard&&navigator.clipboard.writeText(txt); window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank'); }
}

function _abrirImg(u){ var o=document.createElement('div'); o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:14px'; o.innerHTML='<img src="'+u+'" style="max-width:100%;max-height:100%;border-radius:8px">'; o.onclick=function(){o.remove();}; document.body.appendChild(o); }
function abrirEnviarMidia(){ mostrarTela('tela-enviar'); }

/* ===== SLIDES DE ABERTURA (Slides & Cia) ===== */
function _carregarSlides(cb){
  _slides=CARTAZES.filter(function(c){return _naoExpirou(c.dataISO);}).map(function(c){var o={};for(var k in c)o[k]=c[k];o._t='cartaz';return o;});
  if(cb)cb();
  fetch('/api/videos?acao=midia-list').then(function(r){return r.json();}).then(function(d){
    var est=CARTAZES.filter(function(c){return _naoExpirou(c.dataISO);}).map(function(c){var o={};for(var k in c)o[k]=c[k];o._t='cartaz';return o;});
    var din=(d&&d.ok&&d.midias?d.midias:[]).map(function(m){m._t='midia';return m;});
    _slides=est.concat(din); if(_slideIdx>=_slides.length)_slideIdx=0; renderSlideshow();
  }).catch(function(){});
}
function abrirSlides(){ _slideBox='slides-full'; _slideIdx=0; mostrarTela('tela-slides'); _carregarSlides(function(){ renderSlideshow(); }); }
function irParaMenu(){ clearTimeout(_slideTimer); _slidesMostrados=true; irHome(); }
function _temSlides(){ return CARTAZES.filter(function(c){return _naoExpirou(c.dataISO);}).length>0; }

/* ===== PAINEL DO PASTOR (CRM + apagar publicações) ===== */
function abrirAdmin(){ mostrarTela('tela-admin'); var tk=localStorage.getItem('radar_adm')||''; if(!tk){ _admPrompt(); } else { renderAdmin(tk); } }
function _admPrompt(){
  document.getElementById('admin-body').innerHTML=
   '<div style="background:#fff;border:1px solid #e4e7ec;border-radius:16px;padding:22px;text-align:center">'
   +'<div style="font-size:40px">🔒</div><div style="font-weight:800;color:#0f3d5c;margin:6px 0">Área do pastor</div>'
   +'<div style="color:#6b7280;font-size:.9rem;margin-bottom:12px">Digite a senha de administrador.</div>'
   +'<input id="adm-token" type="password" placeholder="Senha admin" style="width:100%;box-sizing:border-box;border:1.6px solid #dbe6f2;border-radius:12px;padding:13px;text-align:center;font-size:1rem;font-family:inherit">'
   +'<button onclick="_admUnlock()" style="width:100%;background:#0f3d5c;color:#fff;border:none;border-radius:12px;padding:13px;font-weight:800;font-family:inherit;cursor:pointer;margin-top:10px">Entrar</button>'
   +'<div id="adm-erro" style="color:#a8162a;font-weight:700;font-size:.85rem;margin-top:8px"></div></div>';
}
function _admUnlock(){
  var tk=document.getElementById('adm-token').value.trim(); if(!tk) return;
  fetch('/api/videos?acao=crm-list&token='+encodeURIComponent(tk)).then(function(r){return r.json();}).then(function(d){
    if(d&&d.ok){ localStorage.setItem('radar_adm',tk); renderAdmin(tk); } else { document.getElementById('adm-erro').textContent='Senha incorreta.'; }
  }).catch(function(){ document.getElementById('adm-erro').textContent='Sem conexão.'; });
}
function renderAdmin(tk){
  var box=document.getElementById('admin-body'); box.innerHTML='<div style="text-align:center;color:#6b7280;padding:20px">Carregando…</div>';
  Promise.all([
    fetch('/api/videos?acao=crm-list&token='+encodeURIComponent(tk)).then(function(r){return r.json();}),
    fetch('/api/videos?acao=midia-list').then(function(r){return r.json();})
  ]).then(function(res){
    var crm=(res[0]&&res[0].crm)||[], mid=(res[1]&&res[1].midias)||[]; window._admCRM=crm;
    var h='<div class="sec-label" style="margin:2px 2px 8px;color:#a9791c">Publicações no mural ('+mid.length+')</div>';
    if(!mid.length) h+='<div style="color:#6b7280;font-size:.9rem;margin-bottom:14px">Nenhuma publicação.</div>';
    mid.forEach(function(m){
      h+='<div style="background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:11px 13px;margin-bottom:9px;display:flex;align-items:center;gap:10px">'
       +'<div style="flex:1;min-width:0"><div style="font-weight:700;color:#0f3d5c;font-size:.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc2((m.texto||'(mídia)').slice(0,60))+'</div>'
       +'<div style="font-size:.78rem;color:#6b7280">'+esc2(m.autor_nome||'')+(m.data_evento?(' · 📅 '+_fmtData(m.data_evento)):'')+'</div></div>'
       +'<button onclick="delMidiaAdmin('+m.id+')" style="background:#8a1c1c;color:#fff;border:none;border-radius:9px;padding:9px 12px;font-weight:800;cursor:pointer;flex-shrink:0">🗑️</button></div>';
    });
    h+='<div class="sec-label" style="margin:18px 2px 8px;color:#a9791c">Cadastros — CRM ('+crm.length+')</div>';
    h+='<button onclick="_admCopiarCRM()" style="width:100%;background:#0f6d78;color:#fff;border:none;border-radius:11px;padding:11px;font-weight:800;font-family:inherit;cursor:pointer;margin-bottom:10px">📋 Copiar lista de contatos</button>';
    if(!crm.length) h+='<div style="color:#6b7280;font-size:.9rem">Ninguém cadastrado ainda.</div>';
    crm.forEach(function(p){
      h+='<div style="background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:12px 14px;margin-bottom:8px">'
       +'<div style="font-weight:800;color:#0f3d5c">'+esc2(p.nome||'')+(p.cargo?(' · '+esc2(p.cargo)):'')+'</div>'
       +'<div style="font-size:.85rem;color:#6b7280;margin-top:2px">📞 '+esc2(p.fone||'')+(p.igreja?('<br>⛪ '+esc2(p.igreja)):'')+((p.cidade||p.bairro)?('<br>📍 '+esc2([p.bairro,p.cidade].filter(Boolean).join(', '))):'')+'</div></div>';
    });
    box.innerHTML=h;
  }).catch(function(){ box.innerHTML='<div style="color:#a8162a;text-align:center;padding:20px">Erro ao carregar.</div>'; });
}
function delMidiaAdmin(id){
  if(!confirm('Apagar esta publicação do mural?')) return;
  var tk=localStorage.getItem('radar_adm')||'';
  fetch('/api/videos?acao=midia-del&id='+id+'&token='+encodeURIComponent(tk)).then(function(r){return r.json();}).then(function(){ renderAdmin(tk); }).catch(function(){});
}
function _admToken(){ var tk=localStorage.getItem('radar_adm'); if(tk) return tk; try{ var u=getUser(); if(u&&u.admin){ return 'radar-elias-2026'; } }catch(e){} return ''; }
function _ehAdmin(){ return !!_admToken(); }
function deletePost(id){
  if(!confirm('Apagar esta publicação?')) return;
  var tk=_admToken();
  if(!tk){ alert('Pra apagar, entre no Painel do Pastor (Perfil) com a senha uma vez.'); return; }
  fetch('/api/videos?acao=midia-del&id='+id+'&token='+encodeURIComponent(tk)).then(function(r){return r.json();}).then(function(d){
    if(d&&d.ok){
      _slides=_slides.filter(function(x){ return !(x._t==='midia'&&x.id===id); });
      if(_slideIdx>=_slides.length)_slideIdx=Math.max(0,_slides.length-1);
      renderSlideshow();
      var ta=document.getElementById('tela-admin'); if(ta&&ta.classList.contains('ativa')) renderAdmin(tk);
    } else { alert('Não consegui apagar. Confira a senha no Painel do Pastor.'); }
  }).catch(function(){ alert('Sem conexão.'); });
}
function _admCopiarCRM(){
  var crm=window._admCRM||[]; var t='CADASTROS RADAR ('+crm.length+')\n\n'+crm.map(function(p){return p.nome+' · '+(p.cargo||'')+'\n📞 '+(p.fone||'')+' · '+(p.igreja||'')+' · '+[p.bairro,p.cidade].filter(Boolean).join(', ');}).join('\n\n');
  if(navigator.clipboard){ navigator.clipboard.writeText(t).then(function(){alert('Lista copiada!');}).catch(function(){alert(t);}); } else { alert(t); }
}
var _midImgData=null;
function _midPreview(inp){
  var f=inp.files&&inp.files[0]; if(!f) return;
  if(f.size>5*1024*1024){ alert('Imagem muito grande (máximo 5MB). Escolha uma menor.'); inp.value=''; return; }
  var rd=new FileReader();
  rd.onload=function(){ _midImgData=rd.result; document.getElementById('mid-prev').innerHTML='<img src="'+rd.result+'" style="width:100%;border-radius:12px">'; document.getElementById('mid-video').value=''; };
  rd.readAsDataURL(f);
}
function enviarMidia(){
  var nome=document.getElementById('mid-nome').value.trim();
  var fone=document.getElementById('mid-fone').value.trim();
  var vlink=document.getElementById('mid-video').value.trim();
  var st=document.getElementById('mid-status');
  if(!nome||!fone){ st.style.color='#a8162a'; st.textContent='Preencha seu nome e telefone.'; return; }
  if(!_midImgData && !vlink){ st.style.color='#a8162a'; st.textContent='Envie uma imagem OU um link de vídeo.'; return; }
  var btn=document.getElementById('mid-enviar'); btn.disabled=true; st.style.color='#0f6d78'; st.textContent='Publicando… aguarde';
  var body={acao:'midia-sub', nome:nome, cargo:document.getElementById('mid-cargo').value.trim(), fone:fone,
    cidade:document.getElementById('mid-cidade').value.trim(), bairro:document.getElementById('mid-bairro').value.trim(),
    igreja:document.getElementById('mid-igreja').value.trim(), texto:document.getElementById('mid-texto').value.trim(),
    data:document.getElementById('mid-data').value};
  if(_midImgData) body.imgBase64=_midImgData; else body.videoLink=vlink;
  fetch('/api/videos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json();}).then(function(d){
    btn.disabled=false;
    if(d && d.ok){ st.style.color='#14804a'; st.textContent='✓ Publicado! Obrigado.';
      ['mid-nome','mid-cargo','mid-fone','mid-cidade','mid-bairro','mid-igreja','mid-texto','mid-video','mid-data'].forEach(function(id){document.getElementById(id).value='';});
      _midImgData=null; document.getElementById('mid-prev').innerHTML=''; document.getElementById('mid-img').value='';
      setTimeout(function(){ abrirCartazes(); },900);
    } else { st.style.color='#a8162a'; st.textContent=(d&&d.erro)||'Não consegui publicar. Tente de novo.'; }
  }).catch(function(){ btn.disabled=false; st.style.color='#a8162a'; st.textContent='Sem conexão. Tente de novo.'; });
}
function esc2(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ══ AUTO-EXPIRAÇÃO DE DATAS (remove avisos vencidos, deixa só de hoje em diante) ══
function _hoje0(){ var d=new Date(); d.setHours(0,0,0,0); return d; }
/* PRÓXIMO TRIMESTRE (turmas *4): tudo travado até o 4º Trim começar (04/10/2026). */
function ebd4TriTravado(){ return _hoje0() < new Date(2026,9,4); }
function _mesNum(s){
  var m={jan:0,fev:1,mar:2,abr:3,mai:4,jun:5,jul:6,ago:7,set:8,out:9,nov:10,dez:11};
  s=(''+s).toLowerCase().slice(0,3);
  if(s in m) return m[s];
  var n=parseInt(s,10); return (n>=1&&n<=12)?n-1:-1;
}
// acha a ÚLTIMA data do texto (dd/mês ou dd/NN). Ex "30/07 a 01/08" -> 01/ago ; "08 a 10/07" -> 10/jul
function _fimEvento(badge, mesDef, ano){
  var re=/(\d{1,2})\s*\/\s*([a-zç]{3,}|\d{1,2})/gi, m, last=null;
  while((m=re.exec(badge))){ var mn=_mesNum(m[2]); if(mn>=0) last=[parseInt(m[1],10),mn]; }
  if(last) return new Date(ano, last[1], last[0], 23,59,59);
  var dias=(badge.match(/\d{1,2}/g)||[]).map(Number).filter(function(d){return d>=1&&d<=31;});
  if(!dias.length) return null;
  return new Date(ano, (mesDef>=0?mesDef:0), Math.max.apply(null,dias), 23,59,59);
}
// true = ainda vale (hoje ou futuro). Se não achar data, mantém (não some por engano).
function _agFuturo(badge, mesDef, ano){
  var f=_fimEvento(badge, mesDef, ano);
  if(!f) return true;
  return f.getTime() >= _hoje0().getTime();
}
function _mesHeaderNum(hd){
  var m={janeiro:0,fevereiro:1,marco:2,'março':2,abril:3,maio:4,junho:5,julho:6,agosto:7,setembro:8,outubro:9,novembro:10,dezembro:11};
  var nm=(''+hd).toLowerCase().replace(/\s*\d{4}\s*/,'').trim();
  return (nm in m)?m[nm]:-1;
}
function _anoHeader(hd){ var mm=(''+hd).match(/(20\d{2})/); return mm?parseInt(mm[1],10):2026; }
// filtra agenda anual [ [MÊS,[ [badge,org,ev,loc],... ]], ... ] removendo eventos vencidos e meses vazios
function _filtrarAgendaAnual(arr){
  return arr.map(function(bloco){
    var mi=_mesHeaderNum(bloco[0]), an=_anoHeader(bloco[0]);
    var evs=bloco[1].filter(function(e){ return _agFuturo(e[0], mi, an); });
    return [bloco[0], evs];
  }).filter(function(b){ return b[1].length>0; });
}
// lição da semana: nº da lição do próximo domingo (3º trimestre 2026 — lição 1 = domingo 05/jul/2026)
function licaoDaSemana(){
  var start=new Date(2026,6,5); start.setHours(0,0,0,0);
  var d=_hoje0(), dow=d.getDay();
  var prox=new Date(d); if(dow!==0) prox.setDate(d.getDate()+(7-dow)); // se hoje=domingo, é hoje
  var wk=Math.round((prox.getTime()-start.getTime())/(7*86400000));
  return Math.max(1, wk+1);
}

function cardsMes(lista, tema){
  return lista.map(function(g){
    var mes=g[0], evs=g[1];
    var cs=evs.map(function(e){
      var data=e[0],org=e[1],ev=e[2],loc=e[3];
      return '<div class="agv-card '+tema+'"><div class="agv-ch">'+
        '<span class="agv-data '+tema+'">'+esc2(data)+'</span>'+
        (org?'<span class="agv-org">'+esc2(org)+'</span>':'')+'</div>'+
        '<div class="agv-ev">'+esc2(ev)+'</div>'+
        (loc?'<div class="agv-loc">📍 '+esc2(loc)+'</div>':'')+'</div>';
    }).join('');
    return '<div class="agv-mes '+tema+'">'+esc2(mes)+'</div>'+cs;
  }).join('');
}

function abrirSilas(){ mostrarTela('tela-silas'); }

function abrirCeadema(qual){
  mostrarTela('tela-ceadema');
  renderCeadema(qual||'estadual');
}
function renderCeadema(qual){
  var azul = qual==='estadual';
  var tema = azul?'azul':'verde';
  var dados = _filtrarAgendaAnual(azul?AG_ESTADUAL:AG_REGIONAL);
  var titTema = azul?'azul':'verde';
  var h='';
  h+='<div class="agv-brand azul"><img class="agv-logo" src="img/ceadema.png">'+
     '<div><div class="agv-bnome">CEADEMA</div><div class="agv-bsub">Convenção Estadual das Igrejas Evangélicas · Assembleias de Deus no Maranhão</div></div></div>';
  h+='<div class="agv-tit '+titTema+'"><b>Agenda '+(azul?'Estadual':'Regional')+' de 2026</b><span>'+(azul?'Eventos oficiais da Convenção':'Eventos regionais da Convenção')+'</span></div>';
  h+='<div class="agv-tabs azul">'+
     '<div class="agv-tab '+(azul?'on-az':'off-az')+'" onclick="renderCeadema(\'estadual\')">Estadual</div>'+
     '<div class="agv-tab '+(!azul?'on-vd':'off-vd')+'" onclick="renderCeadema(\'regional\')">Regional</div></div>';
  h+='<div class="agv-lista">'+cardsMes(dados,tema)+'</div>';
  var _cb=document.getElementById('ceadema-body');
  _cb.innerHTML=h; _cb.scrollTop=0;
  setTimeout(function(){_cb.scrollTop=0;},40);
}

function abrirTemplo(){ mostrarTela('tela-templo'); }
function abrirTemploAg(){ mostrarTela('tela-templo-ag'); renderTemplo(); }
function abrirMonteCarmelo(){ mostrarTela('tela-monte-carmelo'); }
var _MC_GRUPOS={
  jovem:{nome:'Jovem em Busca de Mais Um', ic:'🔥', desc:'Ministério de Jovens'},
  vocal:{nome:'Vocal dos Homens', ic:'🎙️', desc:'Ministério de Louvor'}
};
function abrirMcGrupo(t){
  var g=_MC_GRUPOS[t]; if(!g) return;
  document.getElementById('mc-grupo-nome').textContent=g.nome;
  document.getElementById('mc-grupo-ic').textContent=g.ic;
  var c=document.getElementById('mc-grupo-conteudo');
  if(t==='jovem'){ c.innerHTML=htmlJovemHub(); renderLouvoresLista(''); }
  else {
    c.innerHTML=
      '<div style="text-align:center;padding:24px 8px">'
      +'<div style="font-size:52px">'+g.ic+'</div>'
      +'<div style="font-family:\'Playfair Display\',serif;font-size:22px;font-weight:900;color:var(--txt);margin-top:10px">'+g.nome+'</div>'
      +'<div style="font-size:13px;color:var(--gold);font-weight:600;margin-top:3px">'+g.desc+' · Cong. Monte Carmelo</div>'
      +'<div style="background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;margin-top:22px;text-align:left;color:var(--sub);font-size:13.5px;line-height:1.6">📋 <b style="color:var(--txt)">Espaço pronto pro grupo.</b><br>Aqui vão os <b>avisos</b>, a <b>agenda</b> e os <b>membros</b> do '+g.nome+'. Me mande o conteúdo que eu coloco.</div>'
      +'</div>';
  }
  mostrarTela('tela-mc-grupo');
}

/* ===== JOVEM EM BUSCA DE MAIS UM — Louvores ===== */
function htmlJovemHub(){
  return ''
  +'<div style="text-align:center;padding:8px 4px 2px">'
    +'<div style="font-size:44px">🔥</div>'
    +'<div style="font-family:\'Playfair Display\',serif;font-size:20px;font-weight:900;color:var(--txt);margin-top:4px">Jovem em Busca de Mais Um</div>'
    +'<div style="font-size:12px;color:var(--gold);font-weight:600;margin-top:2px">Ministério de Jovens · Cong. Monte Carmelo</div>'
  +'</div>'
  +'<button onclick="compartilharJovem()" style="width:100%;margin:14px 0 4px;padding:14px;border-radius:14px;font-weight:800;font-size:15px;font-family:inherit;cursor:pointer;color:#fff;background:#25D366;border:none">📲 Compartilhar o link</button>'
  +'<div style="display:flex;align-items:center;gap:8px;margin:18px 2px 8px"><span style="font-size:20px">🎵</span><b style="color:var(--txt);font-size:16px">Louvores</b><span style="margin-left:auto;font-size:12px;color:var(--sub)" id="louvores-cont"></span></div>'
  +'<input id="louvores-busca" oninput="renderLouvoresLista(this.value)" placeholder="🔍 Buscar por título ou trecho da letra..." '
    +'style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--txt);font-size:14px;font-family:inherit;outline:none;margin-bottom:12px;box-sizing:border-box">'
  +'<div id="louvores-lista"></div>';
}
function _norm(s){ return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); }
function renderLouvoresLista(q){
  var el=document.getElementById('louvores-lista'); if(!el) return;
  var nq=_norm(q).trim(); var h=''; var n=0;
  _LOUVORES.forEach(function(s,i){
    var full=_norm(s.t+' '+s.l.map(function(st){return st.join(' ')}).join(' '));
    if(nq && full.indexOf(nq)<0) return;
    n++;
    var prev=(s.l[0]&&s.l[0][0])?s.l[0][0]:'';
    h+='<div onclick="abrirLouvor('+i+')" style="display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:13px 14px;margin-bottom:9px;cursor:pointer">'
      +'<div style="width:38px;height:38px;flex-shrink:0;border-radius:10px;background:#0b4aa2;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px">'+(i+1)+'</div>'
      +'<div style="min-width:0"><div style="font-weight:800;color:var(--txt);font-size:15px">'+s.t+'</div>'
      +'<div style="font-size:12.5px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+prev+'</div></div>'
      +'<span style="margin-left:auto;color:var(--gold);font-size:20px">›</span></div>';
  });
  if(!n) h='<div style="text-align:center;color:var(--sub);padding:24px;font-size:13.5px">Nenhum louvor encontrado.</div>';
  el.innerHTML=h;
  var cc=document.getElementById('louvores-cont'); if(cc) cc.textContent=_LOUVORES.length+(_LOUVORES.length>1?' louvores':' louvor');
}
var _LOUVOR_ATUAL=0;
var _louvorFont=parseInt(localStorage.getItem('louvor_font')||'21',10);
if(!(_louvorFont>=14&&_louvorFont<=48)) _louvorFont=21;
function mudarFonteLouvor(d){
  _louvorFont=Math.max(14,Math.min(48,_louvorFont+d));
  localStorage.setItem('louvor_font',_louvorFont);
  [].forEach.call(document.querySelectorAll('#louvor-conteudo p.louvor-linha'),function(p){ p.style.fontSize=_louvorFont+'px'; });
}
function abrirLouvor(i){
  _LOUVOR_ATUAL=i; var s=_LOUVORES[i]; if(!s) return;
  var h='<h1 style="font-family:\'Playfair Display\',serif;color:#0b4aa2;font-size:30px;font-weight:900;text-align:center;margin:0 0 24px;line-height:1.2">'+s.t+'</h1>';
  s.l.forEach(function(st){
    h+='<p class="louvor-linha" style="color:#111;font-size:'+_louvorFont+'px;line-height:1.5;font-weight:600;margin:0 0 20px;text-align:center">'+st.join('<br>')+'</p>';
  });
  document.getElementById('louvor-conteudo').innerHTML=h;
  document.getElementById('louvor-hdr').textContent=s.t;
  document.querySelector('#tela-louvor .agv-scroll').scrollTop=0;
  mostrarTela('tela-louvor');
}
function compartilharJovem(){
  var url='https://radar-atual.vercel.app/?ir=jovem';
  var txt='🔥 Jovem em Busca de Mais Um — Louvores e mais no app RADAR ATUAL';
  if(navigator.share){ navigator.share({title:'Jovem em Busca de Mais Um',text:txt,url:url}).catch(function(){}); }
  else { try{navigator.clipboard.writeText(url);}catch(e){} alert('Link copiado!\n'+url); }
}
function compartilharLouvorAtual(){
  var s=_LOUVORES[_LOUVOR_ATUAL]; if(!s) return;
  var txt=s.t+'\n\n'+s.l.map(function(st){return st.join('\n')}).join('\n\n');
  if(navigator.share){ navigator.share({title:s.t,text:txt}).catch(function(){}); }
  else { try{navigator.clipboard.writeText(txt);}catch(e){} alert('Letra copiada!'); }
}
var _LOUVORES=(function(){
  /* DESERTO */
  var d1=['Eu não preciso transformar','Pedras em pães para provar','Que no deserto Tu estás','Cuidando de mim'];
  var d2=['De um lugar alto não vou me lançar','Só pra demonstrar o Teu poder','Eu não preciso ver fenômenos para crer em Ti'];
  var d3=['Não troco nossa comunhão','Pelo prazer de conquistar','Palácios, riquezas','Como um deserto, isso vai passar'];
  var d4=['Por isso resistindo estou','E quando a minha força se esgotar','O Teu anjo vai me alimentar'];
  var dc=['Te adorar é o que sustenta-me de pé','Eu não vou, não vou perder a guerra','Te louvar em meio às tentações','É mais que estratégia'];
  var dc2=['Posso não ver o amanhã','Mas hoje sei','Que esse deserto vai chegar ao fim','O Senhor está cuidando de mim'];
  var deserto=[d1,d2,d3,d4,dc,dc2,d1,d2,d3,d4,dc,dc2,dc,dc2];
  /* COMO ZAQUEU */
  var z1=['Como Zaqueu, eu quero subir','O mais alto que eu puder','Só pra Te ver, olhar para Ti','E chamar Sua atenção para mim!'];
  var z2=['Eu preciso de Ti, Senhor','Eu preciso de Ti, ó Pai','Sou pequeno demais, me dá a Tua paz','Largo tudo pra Te seguir'];
  var zc=['Entra na minha casa','Entra na minha vida','Mexe com minha estrutura','Sara todas as feridas','Me ensina a ter santidade','Quero amar somente a Ti','Porque o Senhor é o meu bem maior','Faz um milagre em mim'];
  var zaqueu=[z1,z2,zc,z1,z2,zc,zc];
  /* DEIXA */
  var x1=['Tá ansioso por quê?','Você não faz ideia do que estou fazendo','Nem tente entender','Mas essa prova está te amadurecendo'];
  var xp=['Onde você vê deserto, eu vejo processo','Onde você sente dor, eu vejo experiência','Pra você contar','Quando lá chegar, quando lá chegar'];
  var xp2=['Você só enxerga perda, mas é livramento','Porque antes do alívio tem o sofrimento','Não permita que essa luta roube a sua paz','Mas deixa'];
  var xc=['Deixa, deixa eu trabalhar do meu jeito','Deixa acontecer no meu tempo','O amanhã não te pertence','Só confia em mim, uoh'];
  var xc2=['Deixa, deixa teus projetos comigo','Deixa eu cuidar dos teus sonhos','Os meus planos são melhores'];
  var xb=['O que o olho não viu, ouvido não ouviu','E nem sequer subiu ao seu coração','É o que eu planejei, é o que eu preparei','É o que eu reservei pra você, oh'];
  var deixa=[x1,xp,xp2,xc,xc2,xp,xp2,xc,xc2,xb,xb];
  return [
    {t:'Deserto', l:deserto},
    {t:'Como Zaqueu', l:zaqueu},
    {t:'Deixa', l:deixa}
  ];
})();
function renderTemplo(){
  var h='';
  h+='<div class="agv-brand marrom"><img class="agv-logo" src="img/ieadet.png">'+
     '<div><div class="agv-bnome" style="font-size:16px">IEADET</div><div class="agv-bsub">Igreja Evangélica Assembleia de Deus · Templo Central · Tuntum - MA</div></div></div>';
  h+='<div class="agv-tit marrom"><b>Agenda Bimestral</b><span>Julho / Agosto de 2026</span></div>';
  h+='<a href="/biblioteca/agenda-set-out.html" style="display:block;text-align:center;text-decoration:none;background:linear-gradient(135deg,#8a5a2b,#5a3a1a);color:#fff;border-radius:12px;padding:13px 14px;font-weight:800;margin:0 0 10px;box-shadow:0 4px 12px rgba(90,58,26,.3)">🗓️ Nova Agenda — Setembro e Outubro 2026 →</a>';
  h+='<button onclick="var u=\'https://radar-atual.vercel.app/biblioteca/agenda-set-out.html\';if(navigator.share){navigator.share({title:\'Agenda Set/Out — Templo Central\',url:u})}else{window.open(\'https://wa.me/?text=\'+encodeURIComponent(\'Agenda Set/Out — Templo Central Tuntum: \'+u),\'_blank\')}" style="display:block;width:100%;background:#25D366;color:#fff;border:none;border-radius:12px;padding:11px;font-weight:800;font-family:inherit;cursor:pointer;margin:0 0 14px">📤 Compartilhar agenda</button>';
  h+='<div class="agv-lista">';
  var _meses=[]; var _jul=AG_TEMPLO_JUL_R(); if(_jul.length)_meses.push(['JULHO DE 2026',_jul]);
  var _ago=AG_TEMPLO_AGO_R(); if(_ago.length)_meses.push(['AGOSTO DE 2026',_ago]);
  h+=cardsMes(_meses,'marrom');
  // cultos semanais
  h+='<div class="agv-secao">Agenda dos Cultos — Semanal</div>';
  h+=AG_SEMANAL.map(function(g){
    return '<div class="agv-wk"><div class="agv-wk-dia">'+g[0]+'</div>'+
      g[1].map(function(i){return '<div class="agv-wk-item">• '+esc2(i)+'</div>';}).join('')+'</div>';
  }).join('');
  // cultos fixos templo central
  h+='<div class="agv-secao">Cultos do Templo Central</div>';
  h+=AG_TEMPLO_FIXO.map(function(g){
    return '<div class="agv-wk"><div class="agv-wk-dia">'+g[0].toUpperCase()+'</div><div class="agv-wk-item">'+esc2(g[1])+'</div></div>';
  }).join('');
  // ensaios
  h+='<div class="agv-secao">Ensaios Gerais — Domingo</div>';
  h+=AG_ENSAIOS.map(function(g){
    return '<div class="agv-wk"><div class="agv-wk-item"><b>'+esc2(g[0])+'</b> — '+esc2(g[1])+'</div></div>';
  }).join('');
  // mural
  h+='<div class="agv-mural"><h4>📌 Mural de Avisos — O que ainda vem!</h4>'+
     AG_MURAL.map(function(m){return '<div>'+esc2(m)+'</div>';}).join('')+'</div>';
  h+='</div>';
  var _tb=document.getElementById('templo-body');
  _tb.innerHTML=h; _tb.scrollTop=0;
  setTimeout(function(){_tb.scrollTop=0;},40);
}
// converte agendamentos [dia,data,ev,loc] -> [dataBadge,org,ev,loc]
function AG_TEMPLO_JUL_R(){ return AG_TEMPLO_JUL.filter(function(e){return _agFuturo(e[1],6,2026);}).map(function(e){return [((e[0]?e[0]+' ':'')+e[1]), '', e[2], e[3]];}); }
function AG_TEMPLO_AGO_R(){ return AG_TEMPLO_AGO.filter(function(e){return _agFuturo(e[1],7,2026);}).map(function(e){return [((e[0]?e[0]+' ':'')+e[1]), '', e[2], e[3]];}); }

// aviso PREMIUM de direitos autorais ao abrir a EBD (padrão navy+dourado, Playfair/Lora)
var _ebdAvisoVisto=false;   // 1x por abertura do app; não reaparece ao voltar de dentro da EBD
function mostrarAvisoEBD(){
  if(_ebdAvisoVisto) return;
  if(document.getElementById('ebd-aviso-bg')) return;
  _ebdAvisoVisto=true;
  var it=function(t){ return `<div style="display:flex;align-items:center;gap:11px;padding:10px 0;border-top:1px solid rgba(201,161,74,.14)">
      <span style="width:23px;height:23px;flex-shrink:0;border-radius:50%;background:rgba(201,161,74,.18);display:flex;align-items:center;justify-content:center;color:#F5C842;font-size:12px;font-weight:900">✓</span>
      <span style="font-size:15px;font-weight:600;color:#fff">${t}</span></div>`; };
  var bg=document.createElement('div');
  bg.id='ebd-aviso-bg';
  bg.style.cssText='position:fixed;inset:0;z-index:3000;background:rgba(4,7,16,.82);display:flex;align-items:center;justify-content:center;padding:20px';
  bg.innerHTML=`<style>@keyframes ebdUp{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}</style>
  <div style="max-width:412px;width:100%;background:linear-gradient(165deg,#141C30,#0B1020);border:1px solid rgba(201,161,74,.34);border-radius:26px;overflow:hidden;box-shadow:0 26px 72px rgba(0,0,0,.62);animation:ebdUp .34s cubic-bezier(.2,.8,.2,1)">
    <div style="height:4px;background:linear-gradient(90deg,#C9A14A,#F5C842,#C9A14A)"></div>
    <div style="text-align:center;padding:26px 24px 4px">
      <div style="width:76px;height:76px;margin:0 auto 15px;border-radius:50%;background:radial-gradient(circle at 50% 34%,#F5C842,#C9A14A);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 26px rgba(201,161,74,.5)">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0B1020" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h6a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H2z"/><path d="M22 4h-6a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H22z"/></svg>
      </div>
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:25px;font-weight:800;color:#F5C842">Antes de acessar</div>
      <div style="font-size:10.5px;font-weight:700;letter-spacing:3px;color:rgba(201,161,74,.72);text-transform:uppercase;margin-top:6px">Direitos autorais · EBD</div>
    </div>
    <div style="padding:15px 26px 2px;text-align:center;font-family:'Lora',Georgia,serif;font-size:15px;line-height:1.78;color:rgba(255,255,255,.8)">
      Todo cristão deve <b style="color:#fff">adquirir e pagar</b> o seu próprio material. Aqui ele fica apenas como <b style="color:#fff">apoio</b> ao seu estudo.
    </div>
    <div style="padding:16px 26px 6px">${it('Lições da EBD')}${it('Livros de apoio')}${it('Revista Cristã Alerta')}</div>
    <div style="padding:6px 26px 0;text-align:center;font-family:'Lora',Georgia,serif;font-size:12.5px;font-style:italic;color:rgba(255,255,255,.44)">“Digno é o obreiro do seu salário.” — 1 Timóteo 5.18</div>
    <div style="padding:18px 22px 24px">
      <button onclick="document.getElementById('ebd-aviso-bg').remove()" style="width:100%;padding:15px;border:none;border-radius:999px;background:linear-gradient(90deg,#C9A14A,#F5C842);color:#0B1020;font-size:15.5px;font-weight:800;cursor:pointer;box-shadow:0 10px 24px rgba(201,161,74,.4)">Entendi — acessar</button>
    </div>
  </div>`;
  document.body.appendChild(bg);
}
function abrirMod(id){
  localStorage.setItem('radar_ultimo_mod', id);
  try{ trackVisit(id); }catch(e){}   // conta acesso de CADA módulo (global via /api/hit)
  ocultarTodas();
  if(id==='desafiomateus'){
    document.getElementById('tela-desafiomateus').classList.add('ativa');
    return;
  }
  if(id==='perolas'){
    document.getElementById('tela-perolas').classList.add('ativa');
    return;
  }
  if(id==='devocional'){ abrirDevocional(); return; }
  if(id==='plano'){ abrirPlano(); return; }
  if(id==='biblia'){
    document.getElementById('tela-bh-landing').classList.add('ativa');
    atualizarContadoresEv();
    return;
  }
  if(id==='ebd'){
    document.getElementById('tela-ebd').classList.add('ativa');
    mostrarAvisoEBD();
    return;
  }
  if(id==='israel'){
    abrirNoticias();
    return;
  }
  if(id==='silas'){ abrirSilas(); return; }
  if(id==='templo'){ abrirTemplo(); return; }
  if(id==='igrejas'){ abrirIgrejas(); return; }
  if(id==='manuais'){ abrirManuais(); return; }
  modAtual=id;
  const m=MODS.find(x=>x.id===id);
  document.getElementById('mod-titulo-h').textContent=m.nome;
  document.getElementById('mod-icon-h').textContent=m.icon;
  document.getElementById('mod-busca').value='';
  document.getElementById('tela-modulo').classList.add('ativa');
  renderMod();
}

function voltarHome(){
  ocultarTodas();
  if(modPaiTela==='bh'){
    document.getElementById('tela-bh-landing').classList.add('ativa');
    modPaiTela='home';
    return;
  }
  if(modPaiTela==='biblia'){
    document.getElementById('tela-biblia').classList.add('ativa');
    modPaiTela='home';
    return;
  }
  if(modPaiTela==='harpa-lista'){
    document.getElementById('tela-harpa-lista').classList.add('ativa');
    modPaiTela='home';
    return;
  }
  document.getElementById('home').classList.add('ativa');
  renderHome();
}

function abrirCRM(id, nome, icon, paiTela){
  modAtual=id; modPaiTela=paiTela||'home'; editId=null;
  document.getElementById('mod-titulo-h').textContent=nome;
  document.getElementById('mod-icon-h').textContent=icon;
  document.getElementById('mod-busca').value='';
  ocultarTodas();
  document.getElementById('tela-modulo').classList.add('ativa');
  renderMod();
}

function atualizarContadoresBH(){
  const nb=getData('crm_biblia').length;
  const nh=getData('crm_harpa').length;
  const eb=document.getElementById('cnt-crm-biblia');
  const eh=document.getElementById('cnt-crm-harpa');
  if(eb) eb.textContent=nb||'';
  if(eh) eh.textContent=nh||'';
}

function renderMod(){
  const items=getData(modAtual);
  const busca=document.getElementById('mod-busca').value.toLowerCase();
  const filtrado=busca?items.filter(i=>i.titulo.toLowerCase().includes(busca)||(i.sub||'').toLowerCase().includes(busca)||(i.obs||'').toLowerCase().includes(busca)):items;
  document.getElementById('mod-count-h').textContent=items.length+' item'+(items.length!==1?'s':'');
  const el=document.getElementById('mod-lista');
  if(!filtrado.length){
    const iconeVazio = (MODS.find(x=>x.id===modAtual)||{icon:'📋'}).icon;
    el.innerHTML=`<div class="mod-empty"><div class="mod-empty-icon">${iconeVazio}</div><div class="mod-empty-txt">Nenhum item ainda.<br>Toque em + ADD para começar.</div></div>`;
    return;
  }
  el.innerHTML=filtrado.map(i=>`
    <div class="item">
      <div class="item-body">
        <div class="item-tit">${i.titulo}</div>
        ${i.sub?`<div class="item-meta">${i.sub}${i.data?' · '+i.data:''}</div>`:(i.data?`<div class="item-meta">${i.data}</div>`:'')}
        ${i.obs?`<div class="item-obs">${i.obs}</div>`:''}
        ${i.link?`<div class="item-meta" style="color:#4f8ef7;margin-top:4px">🔗 ${i.link.substring(0,40)}${i.link.length>40?'…':''}</div>`:''}
      </div>
      <div class="item-acts">
        <button class="btn-sm btn-ed" onclick="editarItem('${i.id}')">✏️</button>
        <button class="btn-sm btn-dl" onclick="deletarItem('${i.id}')">🗑️</button>
      </div>
    </div>`).join('');
}

function abrirModal(id){
  editId=id||null;
  document.getElementById('modal-label').textContent=id?'Editar Item':'Novo Item';
  if(id){const item=getData(modAtual).find(x=>x.id===id);document.getElementById('f-titulo').value=item.titulo;document.getElementById('f-sub').value=item.sub||'';document.getElementById('f-data').value=item.data||'';document.getElementById('f-link').value=item.link||'';document.getElementById('f-obs').value=item.obs||'';}
  else{['f-titulo','f-sub','f-link','f-obs'].forEach(f=>document.getElementById(f).value='');document.getElementById('f-data').value=new Date().toISOString().split('T')[0];}
  document.getElementById('modal').classList.add('open');
  setTimeout(()=>document.getElementById('f-titulo').focus(),100);
}
function fecharModal(){document.getElementById('modal').classList.remove('open');}
function editarItem(id){abrirModal(id);}
function salvarItem(){
  const titulo=document.getElementById('f-titulo').value.trim();
  if(!titulo){document.getElementById('f-titulo').focus();return;}
  const obj={id:editId||Date.now().toString(),titulo,sub:document.getElementById('f-sub').value.trim(),data:document.getElementById('f-data').value,link:document.getElementById('f-link').value.trim(),obs:document.getElementById('f-obs').value.trim()};
  const arr=getData(modAtual);
  if(editId){const i=arr.findIndex(x=>x.id===editId);arr[i]=obj;}else arr.unshift(obj);
  setData(modAtual,arr);fecharModal();renderMod();
}
function deletarItem(id){
  if(!confirm('Excluir este item?'))return;
  setData(modAtual,getData(modAtual).filter(x=>x.id!==id));renderMod();
}
document.getElementById('modal').addEventListener('click',e=>{if(e.target===document.getElementById('modal'))fecharModal();});

// ══════════════════════════════════════════════════
// ══ BÍBLIA ════════════════════════════════════════
// ══════════════════════════════════════════════════
const AT_TOTAL=39;
let bibData=null, bibLevel='livros', bibLivroIdx=0, bibCapIdx=0;
let bibMarcados=JSON.parse(localStorage.getItem('bib_marcados')||'{}');
let bibBuscaTimer=null;

function salvarPos(){localStorage.setItem('bib_pos',JSON.stringify({l:bibLivroIdx,c:bibCapIdx}));}
function carregarPos(){const p=JSON.parse(localStorage.getItem('bib_pos')||'null');if(p){bibLivroIdx=p.l;bibCapIdx=p.c;}}

function abrirBiblia(){
  ocultarTodas();
  document.getElementById('tela-biblia').classList.add('ativa');
  if(typeof leitCarregar==='function' && !LEIT.carregado) leitCarregar();
  if(bibData){bibMostrarLivros();return;}
  document.getElementById('bib-body').innerHTML='<div class="bib-loading"><div class="bib-spinner"></div><span>Carregando Bíblia...</span></div>';
  document.getElementById('bib-search-wrap').style.display='none';
  document.getElementById('bib-pos-bar').style.display='none';
  fetch('/biblia.json').then(r=>r.json()).then(d=>{bibData=d;bibMostrarLivros();}).catch(()=>{
    // "Erro ao carregar" não explica nada pra quem está sem sinal no ônibus.
    var semRede = !navigator.onLine;
    document.getElementById('bib-body').innerHTML=
      '<div style="padding:26px 20px;text-align:center;line-height:1.6">'
      +'<div style="font-size:40px;margin-bottom:8px">'+(semRede?'📡':'⚠️')+'</div>'
      +'<div style="font-weight:800;font-size:16px;margin-bottom:7px">'
      +(semRede?'A Bíblia ainda não está guardada neste aparelho':'Não consegui carregar a Bíblia agora')+'</div>'
      +'<div style="color:#9fb0bd;font-size:14px;margin-bottom:16px">'
      +(semRede
        ? 'Você está sem internet. Quando pegar sinal, toque em <b>“📥 Deixar disponível sem internet”</b> na tela inicial — depois disso ela abre sempre, com ou sem rede.'
        : 'Pode ser a internet oscilando. Tente de novo.')
      +'</div>'
      +'<button onclick="abrirBiblia()" style="background:#C9A14A;color:#15202b;border:none;border-radius:11px;padding:12px 20px;font-weight:800;font-size:14.5px;font-family:inherit;cursor:pointer">🔄 Tentar de novo</button>'
      +'<button onclick="voltarHome()" style="display:block;margin:10px auto 0;background:none;color:#9fb0bd;border:1px solid #2b3a4a;border-radius:11px;padding:11px 20px;font-weight:700;font-size:14px;font-family:inherit;cursor:pointer">← Voltar ao Início</button>'
      +'</div>';
  });
}

function bibVoltar(){
  if(bibLevel==='caps'){bibMostrarLivros();return;}
  if(bibLevel==='vers'){bibMostrarCaps(bibLivroIdx);return;}
  if(bibLevel==='busca'){bibMostrarLivros();return;}
  ocultarTodas();document.getElementById('tela-bh-landing').classList.add('ativa');
}

function bibSetHeader(titulo,bread,posBar,posLabel,search){
  document.getElementById('bib-titulo').textContent=titulo;
  document.getElementById('bib-bread').textContent=bread||'';
  document.getElementById('bib-pos-bar').style.display=posBar?'flex':'none';
  document.getElementById('bib-pos-txt').textContent=posLabel||'';
  document.getElementById('bib-search-wrap').style.display=search?'block':'none';
  if(search)document.getElementById('bib-search').value='';
}

function bibMostrarLivros(){
  bibLevel='livros'; carregarPos();
  bibSetHeader('Bíblia — Almeida Atualizada','66 livros',false,'',true);
  let html='<div class="bib-secao">Antigo Testamento — 39 livros</div>';
  bibData.forEach((liv,idx)=>{
    const isLast=(idx===bibLivroIdx);
    const abbrev=liv.abbrev.substring(0,3).toUpperCase();
    html+=`<div class="bib-livro" onclick="bibMostrarCaps(${idx})">
      <div class="bib-livro-abbrev">${abbrev}</div>
      <div class="bib-livro-nome">${liv.name}</div>
      ${isLast?`<span class="bib-last-tag">última leitura</span>`:`<span class="bib-livro-caps">${liv.chapters.length} cap</span>`}
      <span class="bib-livro-arr">›</span>
    </div>`;
    if(idx===AT_TOTAL-1)html+='<div class="bib-secao" style="margin-top:8px">Novo Testamento — 27 livros</div>';
  });
  document.getElementById('bib-body').innerHTML=html;
}

function bibMostrarCaps(livIdx){
  bibLevel='caps'; bibLivroIdx=livIdx;
  const liv=bibData[livIdx];
  const _ab=liv.abbrev.toLowerCase();
  bibSetHeader(liv.name,'Selecione o capítulo',false,'',false);
  let html='<div class="bib-caps-grid">';
  liv.chapters.forEach((_,ci)=>{
    const marcado=(typeof leitLido==='function' && leitLido(_ab,ci+1)) || bibMarcados[`${livIdx}_${ci}`];
    html+=`<div class="bib-cap ${marcado?'lido':''}" onclick="bibMostrarVers(${livIdx},${ci})">${ci+1}</div>`;
  });
  document.getElementById('bib-body').innerHTML=html+'</div>';
}

function _capMarkHTML(li,ci,ab){
  var lido = (typeof leitLido==='function') && leitLido(ab, ci+1);
  return '<div class="bib-capmark'+(lido?'':' nao')+'" id="capmark_'+li+'_'+ci+'">'
    +'<span class="cm-txt">'+(lido?'✓ Capítulo marcado como lido':'Já leu este capítulo?')+'</span>'
    +'<button class="cm-btn" onclick="toggleCapLido('+li+','+ci+')">'+(lido?'Desmarcar':'Marcar como lido')+'</button></div>';
}
function toggleCapLido(li,ci){
  var b=bibData[li]; if(!b) return; var ab=b.abbrev.toLowerCase(); var cap=ci+1;
  var novo=!((typeof leitLido==='function') && leitLido(ab,cap));
  if(typeof leitMarcar==='function') leitMarcar(ab,cap,novo);
  var box=document.getElementById('capmark_'+li+'_'+ci);
  if(box){ box.className='bib-capmark'+(novo?'':' nao'); box.querySelector('.cm-txt').textContent=novo?'✓ Capítulo marcado como lido':'Já leu este capítulo?'; box.querySelector('.cm-btn').textContent=novo?'Desmarcar':'Marcar como lido'; }
}
function bibMostrarVers(livIdx,capIdx){
  bibLevel='vers'; bibLivroIdx=livIdx; bibCapIdx=capIdx; salvarPos();
  bibMarcados[`${livIdx}_${capIdx}`]=true;
  localStorage.setItem('bib_marcados',JSON.stringify(bibMarcados));
  const liv=bibData[livIdx]; const cap=liv.chapters[capIdx];
  bibSetHeader(liv.name,`Capítulo ${capIdx+1} de ${liv.chapters.length}`,true,`${liv.name} ${capIdx+1}`,false);
  let html=_capMarkHTML(livIdx,capIdx,liv.abbrev.toLowerCase())+'<div class="bib-vers-wrap">';
  cap.forEach((v,vi)=>{
    const mk=bibMarcados[`v_${livIdx}_${capIdx}_${vi}`];
    html+=`<div class="bib-verso ${mk?'marcado':''}" id="bv_${livIdx}_${capIdx}_${vi}" onclick="toggleVers(${livIdx},${capIdx},${vi},this)"><span class="bib-vers-num">${vi+1}</span><span class="bib-vers-txt">${v}</span><button class="bib-link-btn" title="Versículos ligados" onclick="event.stopPropagation();verLigados(${livIdx},${capIdx},${vi})">🔗</button></div><div class="bib-lig" id="lig_${livIdx}_${capIdx}_${vi}"></div>`;
  });
  document.getElementById('bib-body').innerHTML=html+'</div>';
  document.getElementById('bib-body').scrollTop=0;
}

// 🔗 MOTOR DE LIGAÇÕES — versículos parecidos por SENTIDO (busca semântica pgvector)
function verLigados(li,ci,vi){
  const box=document.getElementById(`lig_${li}_${ci}_${vi}`);
  if(!box) return;
  if(box.classList.contains('aberto')){ box.classList.remove('aberto'); box.innerHTML=''; return; }
  const abbrev=bibData[li].abbrev;
  const ref=`${abbrev} ${ci+1}:${vi+1}`;
  box.classList.add('aberto');
  box.innerHTML=`<div class="bib-lig-head">🔗 Versículos ligados</div><div class="bib-lig-load">Buscando ligações…</div>`;
  fetch('/api/estudo-busca?sem=1&limit=6&ref='+encodeURIComponent(ref)).then(r=>r.json()).then(d=>{
    if(!d.ok||!d.itens||!d.itens.length){
      box.innerHTML=`<div class="bib-lig-head">🔗 Versículos ligados</div><div class="bib-lig-load">${d&&d.msg?d.msg:'Ainda não indexado (motor cobre João na Fase 1).'}</div>`;
      return;
    }
    let h=`<div class="bib-lig-head">🔗 Versículos ligados por sentido</div>`;
    d.itens.forEach(it=>{
      const nome=it.livro?it.livro.replace(/\b\w/g,m=>m.toUpperCase()):it.ref;
      const pct=Math.round((it.score||0)*100);
      h+=`<div class="bib-lig-item" onclick="navLig('${it.ref}')"><div class="bib-lig-ref"><span>${nome} ${it.cap}:${it.ver}</span><span class="bib-lig-score">${pct}%</span></div><div class="bib-lig-txt">${(it.texto||'').replace(/</g,'&lt;')}</div></div>`;
    });
    box.innerHTML=h;
  }).catch(()=>{ box.innerHTML=`<div class="bib-lig-head">🔗 Versículos ligados</div><div class="bib-lig-load">Sem conexão com o motor.</div>`; });
}
function navLig(refStr){
  const m=refStr.match(/^(\S+)\s+(\d+):(\d+)$/); if(!m) return;
  const abbrev=m[1].toLowerCase(), cap=+m[2]-1, ver=+m[3]-1;
  const li=bibData.findIndex(x=>x.abbrev.toLowerCase()===abbrev);
  if(li<0||!bibData[li].chapters[cap]) return;
  bibMostrarVers(li,cap);
  setTimeout(()=>{
    const el=document.getElementById(`bv_${li}_${cap}_${ver}`);
    if(el){ el.scrollIntoView({block:'center'}); el.classList.add('lig-flash'); setTimeout(()=>el.classList.remove('lig-flash'),1600); }
  },120);
}

function toggleVers(li,ci,vi,el){
  const k=`v_${li}_${ci}_${vi}`;
  if(bibMarcados[k]){delete bibMarcados[k];el.classList.remove('marcado');}
  else{bibMarcados[k]=true;el.classList.add('marcado');}
  localStorage.setItem('bib_marcados',JSON.stringify(bibMarcados));
}

function bibCapAnterior(){
  if(bibCapIdx>0){bibMostrarVers(bibLivroIdx,bibCapIdx-1);return;}
  if(bibLivroIdx>0){const p=bibData[bibLivroIdx-1];bibMostrarVers(bibLivroIdx-1,p.chapters.length-1);}
}
function bibCapProximo(){
  if(bibCapIdx<bibData[bibLivroIdx].chapters.length-1){bibMostrarVers(bibLivroIdx,bibCapIdx+1);return;}
  if(bibLivroIdx<bibData.length-1)bibMostrarVers(bibLivroIdx+1,0);
}

function bibBuscar(){
  clearTimeout(bibBuscaTimer);
  const q=document.getElementById('bib-search').value.trim();
  if(!q){bibMostrarLivros();return;}
  const refMatch=q.match(/^(\w+)\s+(\d+)\.(\d+)$/i);
  if(refMatch){
    const abbrev=refMatch[1].toLowerCase();
    const ci=parseInt(refMatch[2])-1; const vi=parseInt(refMatch[3])-1;
    const livIdx=bibData.findIndex(l=>l.abbrev.toLowerCase().startsWith(abbrev)||(l.name||'').toLowerCase().startsWith(refMatch[1].toLowerCase()));
    if(livIdx>=0&&bibData[livIdx].chapters[ci]&&bibData[livIdx].chapters[ci][vi]!==undefined){
      bibBuscaTimer=setTimeout(()=>bibMostrarVers(livIdx,ci),300);return;
    }
  }
  bibBuscaTimer=setTimeout(()=>{
    bibLevel='busca';
    bibSetHeader('Busca',`"${q}"`,false,'',true);
    document.getElementById('bib-search').value=q;
    const qLow=q.toLowerCase(); let resultados=[],total=0;
    for(let li=0;li<bibData.length&&total<120;li++){
      for(let ci=0;ci<bibData[li].chapters.length&&total<120;ci++){
        for(let vi=0;vi<bibData[li].chapters[ci].length&&total<120;vi++){
          const txt=bibData[li].chapters[ci][vi];
          if(txt.toLowerCase().includes(qLow)){resultados.push({li,ci,vi,nome:bibData[li].name,txt});total++;}
        }
      }
    }
    if(!resultados.length){document.getElementById('bib-body').innerHTML=`<div class="bib-loading"><span style="color:var(--sub)">Nenhum resultado para "${q}"</span></div>`;return;}
    const re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
    let html=resultados.map(r=>`<div class="bib-result" onclick="bibMostrarVers(${r.li},${r.ci})"><div class="bib-result-ref">${r.nome} ${r.ci+1}.${r.vi+1}</div><div class="bib-result-txt">${r.txt.replace(re,m=>`<em>${m}</em>`)}</div></div>`).join('');
    if(total===120)html+=`<div class="bib-result" style="color:var(--sub);font-size:12px;text-align:center">Primeiros 120 resultados</div>`;
    document.getElementById('bib-body').innerHTML=html;
  },500);
}

// ══════════════════════════════════════════════════
// ══ HARPA CRISTÃ ══════════════════════════════════
// ══════════════════════════════════════════════════
let harpaData=null, harpaFiltrada=null, harpaHinoIdx=0;
let harpaTimer=null;

async function abrirHarpa(){
  ocultarTodas();
  document.getElementById('tela-harpa-lista').classList.add('ativa');
  if(harpaData){renderHarpaLista(harpaData);return;}
  document.getElementById('harpa-lista').innerHTML='<div class="bib-loading"><div class="bib-spinner"></div><span>Carregando Harpa...</span></div>';
  try{
    const r=await fetch('/harpa.json');
    harpaData=await r.json();
    harpaFiltrada=harpaData;
    document.getElementById('harpa-lista-sub').textContent=`${harpaData.length} hinos`;
    renderHarpaLista(harpaData);
  }catch(e){
    var semRede = !navigator.onLine;
    document.getElementById('harpa-lista').innerHTML=
      '<div style="padding:26px 20px;text-align:center;line-height:1.6">'
      +'<div style="font-size:40px;margin-bottom:8px">'+(semRede?'📡':'⚠️')+'</div>'
      +'<div style="font-weight:800;font-size:16px;margin-bottom:7px">'
      +(semRede?'A Harpa ainda não está guardada neste aparelho':'Não consegui carregar a Harpa agora')+'</div>'
      +'<div style="color:#9fb0bd;font-size:14px;margin-bottom:16px">'
      +(semRede
        ? 'Você está sem internet. Quando pegar sinal, toque em <b>“📥 Deixar disponível sem internet”</b> na tela inicial — depois disso os 640 hinos abrem sempre.'
        : 'Pode ser a internet oscilando. Tente de novo.')
      +'</div>'
      +'<button onclick="abrirHarpa()" style="background:#C9A14A;color:#15202b;border:none;border-radius:11px;padding:12px 20px;font-weight:800;font-size:14.5px;font-family:inherit;cursor:pointer">🔄 Tentar de novo</button>'
      +'<button onclick="voltarHome()" style="display:block;margin:10px auto 0;background:none;color:#9fb0bd;border:1px solid #2b3a4a;border-radius:11px;padding:11px 20px;font-weight:700;font-size:14px;font-family:inherit;cursor:pointer">← Voltar ao Início</button>'
      +'</div>';
  }
}

function fecharHarpaLista(){
  ocultarTodas();
  document.getElementById('tela-bh-landing').classList.add('ativa');
}

function fecharHarpaHino(){
  ocultarTodas();
  document.getElementById('tela-harpa-lista').classList.add('ativa');
}

function renderHarpaLista(lista){
  document.getElementById('harpa-lista').innerHTML=lista.map((h,fi)=>
    `<div class="harpa-item" onclick="abrirHino(${h.n-1})">
      <div class="harpa-num">${h.n}</div>
      <div class="harpa-nome">${h.t}</div>
      <span class="harpa-arr">›</span>
    </div>`
  ).join('');
}

function filtrarHarpa(){
  clearTimeout(harpaTimer);
  harpaTimer=setTimeout(()=>{
    const q=document.getElementById('harpa-search').value.trim().toLowerCase();
    if(!q){harpaFiltrada=harpaData;document.getElementById('harpa-lista-sub').textContent=`${harpaData.length} hinos`;renderHarpaLista(harpaData);return;}
    const numExato=parseInt(q);
    if(!isNaN(numExato)){
      harpaFiltrada=harpaData.filter(h=>h.n===numExato||String(h.n).startsWith(q));
    } else {
      harpaFiltrada=harpaData.filter(h=>h.t.toLowerCase().includes(q)||h.c.toLowerCase().includes(q)||h.e.some(e=>e.toLowerCase().includes(q)));
    }
    document.getElementById('harpa-lista-sub').textContent=`${harpaFiltrada.length} resultado${harpaFiltrada.length!==1?'s':''}`;
    renderHarpaLista(harpaFiltrada);
  },300);
}

function abrirHino(idx){
  // idx = índice 0-based no array harpaData (h.n - 1)
  harpaHinoIdx=idx;
  renderHino(idx);
  ocultarTodas();
  document.getElementById('tela-harpa-hino').classList.add('ativa');
  document.getElementById('harpa-hino-scroll').scrollTop=0;
}

function renderHino(idx){
  const h=harpaData[idx];
  document.getElementById('harpa-hino-header-titulo').textContent=h.t;
  document.getElementById('harpa-hino-header-sub').textContent=`Harpa Cristã — Hino ${h.n}`;
  document.getElementById('harpa-nav-txt').textContent=`Hino ${h.n} de ${harpaData.length}`;

  // Monta corpo: estrofe → coro → estrofe → coro ...
  const coroHtml=h.c?`
    <div class="harpa-coro-block">
      <span class="harpa-coro-label">🎶 Coro</span>
      <div class="harpa-coro-txt">${h.c.trim()}</div>
    </div>`:'';

  let estrofesHtml='';
  h.e.forEach((est,i)=>{
    estrofesHtml+=`
      <div class="harpa-estrofe-label">Estrofe ${i+1}</div>
      <div class="harpa-estrofe-txt">${est.trim()}</div>
      ${coroHtml}`;
  });

  document.getElementById('harpa-hino-body').innerHTML=`
    <div class="harpa-hino-num">${h.n}</div>
    <div class="harpa-hino-titulo">${h.t}</div>
    <div class="harpa-divider"></div>
    ${estrofesHtml}`;
}

function hinoAnterior(){
  if(harpaHinoIdx>0){harpaHinoIdx--;renderHino(harpaHinoIdx);document.getElementById('harpa-hino-scroll').scrollTop=0;}
}
function hinoProximo(){
  if(harpaHinoIdx<harpaData.length-1){harpaHinoIdx++;renderHino(harpaHinoIdx);document.getElementById('harpa-hino-scroll').scrollTop=0;}
}

// ══════════════════════════════════════════════════
// ══ EBD ═══════════════════════════════════════════
// ══════════════════════════════════════════════════

const EBD_LICOES = {
  adulto:[
    {n:1,  titulo:'O CHAMADO PARA OS GENTIOS',
     licao:'/ebd/adulto/licoes/licao-1.docx',  ppt:null,
     apoio:'/ebd/adulto/apoio/apoio-1.docx',   mapa:null},
    {n:2,  titulo:'A PORTA DA FÉ SE ABRE ENTRE OS GENTIOS',
     licao:'/ebd/adulto/licoes/licao-2.docx',  ppt:{folder:'licao-02',slides:21},
     apoio:'/ebd/adulto/apoio/apoio-2.docx',   mapa:null, video:'/ebd/adulto/video/licao-02.mp4'},
    {n:3,  titulo:'A GRAÇA QUE ALCANÇA TODAS AS NAÇÕES',
     licao:'/ebd/adulto/licoes/licao-3.docx',  ppt:{folder:'licao-03',slides:12},
     apoio:'/ebd/adulto/apoio/apoio-3.docx',   mapa:null},
    {n:4,  titulo:'O ESPÍRITO QUE NOS GUIA PARA ALÉM DAS FRONTEIRAS',
     licao:'/ebd/adulto/licoes/licao-4.docx',  ppt:{folder:'licao-04',slides:12},
     apoio:'/ebd/adulto/apoio/apoio-4.docx',   mapa:null},
    {n:5,  titulo:'CRISTO ENTRE OS FILÓSOFOS — O DEUS DESCONHECIDO SE REVELA',
     licao:'/ebd/adulto/licoes/licao-5.docx',  ppt:{folder:'licao-05',slides:14},
     apoio:'/ebd/adulto/apoio/apoio-5.docx',   mapa:null},
    {n:6,  titulo:'A SUFICIÊNCIA DA GRAÇA NA CIDADE DE CORINTO',
     licao:'/ebd/adulto/licoes/licao-6.docx',  ppt:{folder:'licao-06',slides:15},
     apoio:'/ebd/adulto/apoio/apoio-6.docx',   mapa:null},
    {n:7,  titulo:'QUANDO O ESPÍRITO SOPRA EM ÉFESO',
     licao:'/ebd/adulto/licoes/licao-7.docx',  ppt:{folder:'licao-07',slides:14},
     apoio:'/ebd/adulto/apoio/apoio-7.docx',   mapa:null},
    {n:8,  titulo:'DESPEDIDA EM ÉFESO ENTRE LÁGRIMAS E ALERTAS',
     licao:'/ebd/adulto/licoes/licao-8.docx',  ppt:{folder:'licao-08',slides:16},
     apoio:'/ebd/adulto/apoio/apoio-8.docx',   mapa:null},
    {n:9,  titulo:'CORAGEM PARA TESTEMUNHAR — PAULO DIANTE DA MULTIDÃO',
     licao:'/ebd/adulto/licoes/licao-9.docx',  ppt:{folder:'licao-09',slides:15},
     apoio:'/ebd/adulto/apoio/apoio-9.docx',   mapa:null},
    {n:10, titulo:'UMA ESPERANÇA INABALÁVEL PERANTE OS PODEROSOS',
     licao:'/ebd/adulto/licoes/licao-10.docx', ppt:{folder:'licao-10',slides:12},
     apoio:'/ebd/adulto/apoio/apoio-10.docx',  mapa:null},
    {n:11, titulo:'ENTRE TEMPESTADES E PROMESSAS',
     licao:'/ebd/adulto/licoes/licao-11.docx', ppt:{folder:'licao-11',slides:13},
     apoio:'/ebd/adulto/apoio/apoio-11.docx',  mapa:null},
    {n:12, titulo:'O EVANGELHO CHEGA AO CORAÇÃO DO IMPÉRIO',
     licao:'/ebd/adulto/licoes/licao-12.docx', ppt:{folder:'licao-12',slides:13},
     apoio:'/ebd/adulto/apoio/apoio-12.docx',  mapa:null},
    {n:13, titulo:'A MISSÃO CONTINUA EM NÓS',
     licao:'/ebd/adulto/licoes/licao-13.docx', ppt:{folder:'licao-13',slides:15},
     apoio:'/ebd/adulto/apoio/apoio-13.docx',  mapa:null},
    {n:0,  titulo:'CARTOGRAFIA DO ESPÍRITO SANTO',
     licao:null, ppt:{folder:'extra',slides:15},
     apoio:null, mapa:null}
  ],
  jovem:[
    {n:1,  titulo:'O LIVRO DE JUÍZES: QUANDO CADA UM FAZIA O QUE PARECIA CERTO',
     licao:'/ebd/jovem/licoes/licao-1.docx', ppt:null, apoio:null, mapa:null},
    {n:2,  titulo:'FIDELIDADE A DEUS: UMA QUESTÃO DE ESCOLHA',
     licao:'/ebd/jovem/licoes/licao-2.docx', ppt:null, apoio:null, mapa:null},
    {n:3,  titulo:'CLAMOR E LIBERTAÇÃO: A LIDERANÇA DE OTNIEL',
     licao:'/ebd/jovem/licoes/licao-3.docx', ppt:{folder:'licao-03',slides:12}, apoio:null, mapa:null, video:'/ebd/jovem/video/licao-03.mp4'},
    {n:4,  titulo:'EÚDE E SANGAR: DEUS USA OS IMPROVÁVEIS',
     licao:'/ebd/jovem/licoes/licao-4.docx', ppt:null, apoio:null, mapa:null},
    {n:5,  titulo:'DÉBORA E BARAQUE: UNIÃO PARA FAZER A OBRA DE DEUS',
     licao:'/ebd/jovem/licoes/licao-5.docx', ppt:null, apoio:null, mapa:null},
    {n:6,  titulo:'GIDEÃO: DEUS TRANSFORMA A INSEGURANÇA EM CORAGEM',
     licao:'/ebd/jovem/licoes/licao-6.docx', ppt:null, apoio:null, mapa:null},
    {n:7,  titulo:'O FIM DA LIDERANÇA DE GIDEÃO E O GOVERNO DE ABIMELEQUE',
     licao:'/ebd/jovem/licoes/licao-7.docx', ppt:null, apoio:null, mapa:null},
    {n:8,  titulo:'JEFTÉ: DE REJEITADO A LIBERTADOR',
     licao:'/ebd/jovem/licoes/licao-8.docx', ppt:null, apoio:null, mapa:null},
    {n:9,  titulo:'SANSÃO: A FORÇA E A FRAQUEZA DE UM JOVEM',
     licao:'/ebd/jovem/licoes/licao-9.docx', ppt:null, apoio:null, mapa:null},
    {n:10, titulo:'SANSÃO: ENTRE VITÓRIAS E DERROTAS',
     licao:'/ebd/jovem/licoes/licao-10.docx',ppt:null, apoio:null, mapa:null},
    {n:11, titulo:'CRISE ESPIRITUAL E FALSA RELIGIOSIDADE',
     licao:'/ebd/jovem/licoes/licao-11.docx',ppt:null, apoio:null, mapa:null},
    {n:12, titulo:'TEMPOS DE DECADÊNCIA MORAL E MALDADE',
     licao:'/ebd/jovem/licoes/licao-12.docx',ppt:null, apoio:null, mapa:null},
    {n:13, titulo:'ESPERANÇA EM MEIO AO CAOS: AGUARDANDO A VINDA DO REI',
     licao:'/ebd/jovem/licoes/licao-13.docx',ppt:null, apoio:null, mapa:null},
  ],
  juvenis:[
    {n:1,  titulo:'A SUPERIORIDADE DE CRISTO',              licao:null, ppt:null, apoio:null, mapa:null},
    {n:2,  titulo:'CRISTO ENTENDE VOCÊ',                    licao:null, ppt:null, apoio:null, mapa:null},
    {n:3,  titulo:'A FÉ E O NOSSO RELACIONAMENTO COM DEUS', licao:null, ppt:null, apoio:null, mapa:null},
    {n:4,  titulo:'MAIS QUE VENCEDOR: PROVAS E TENTAÇÕES',  licao:null, ppt:null, apoio:null, mapa:null},
    {n:5,  titulo:'FÉ E OBRAS',                             licao:null, ppt:null, apoio:null, mapa:null},
    {n:6,  titulo:'UMA ARMA PODEROSAMENTE MORTAL',          licao:null, ppt:null, apoio:null, mapa:null},
    {n:7,  titulo:'A SANTIFICAÇÃO NECESSÁRIA',              licao:null, ppt:null, apoio:null, mapa:null},
    {n:8,  titulo:'O PROPÓSITO DO SOFRIMENTO',              licao:null, ppt:null, apoio:null, mapa:null},
    {n:9,  titulo:'INIMIGO ÍNTIMO',                         licao:null, ppt:null, apoio:null, mapa:null},
    {n:10, titulo:'UMA CARTA PARA VOCÊ',                    licao:'/ebd/juvenis/html/licao-10.html', ppt:null, apoio:'/ebd/juvenis/html/apoio-10.html', mapa:null},
    {n:11, titulo:'DIGA "NÃO!"',                            licao:'/ebd/juvenis/html/licao-11.html', ppt:null, apoio:'/ebd/juvenis/html/apoio-11.html', mapa:null},
    {n:12, titulo:'CUIDADO COM O EGO E SUAS AMBIÇÕES',      licao:'/ebd/juvenis/html/licao-12.html', ppt:null, apoio:'/ebd/juvenis/html/apoio-12.html', mapa:null},
    {n:13, titulo:'LUTE POR SUA FÉ',                        licao:'/ebd/juvenis/html/licao-13.html', ppt:null, apoio:'/ebd/juvenis/html/apoio-13.html', mapa:null},
  ],
  adolescentes:[
    {n:1,  titulo:'A IGREJA E A ÉPOCA DO APÓSTOLO PAULO',       licao:null, ppt:null, apoio:null, mapa:null},
    {n:2,  titulo:'A GRANDE MUDANÇA: DE PERSEGUIDOR A PERSEGUIDO', licao:null, ppt:null, apoio:null, mapa:null},
    {n:3,  titulo:'OS PRIMEIROS PASSOS DE PAULO',               licao:null, ppt:null, apoio:null, mapa:null},
    {n:4,  titulo:'A PRIMEIRA VIAGEM MISSIONÁRIA',              licao:null, ppt:null, apoio:null, mapa:null},
    {n:5,  titulo:'O PRIMEIRO DIÁRIO DE VIAGEM',                licao:null, ppt:null, apoio:null, mapa:null},
    {n:6,  titulo:'O CONCÍLIO DE JERUSALÉM',                    licao:null, ppt:null, apoio:null, mapa:null},
    {n:7,  titulo:'A SEGUNDA VIAGEM MISSIONÁRIA',               licao:null, ppt:null, apoio:null, mapa:null},
    {n:8,  titulo:'O SEGUNDO DIÁRIO DE VIAGEM',                 licao:null, ppt:null, apoio:null, mapa:null},
    {n:9,  titulo:'A TERCEIRA VIAGEM MISSIONÁRIA',              licao:null, ppt:null, apoio:null, mapa:null},
    {n:10, titulo:'O TERCEIRO DIÁRIO DE VIAGEM',                licao:'/ebd/adolescentes/html/licao-10.html', ppt:null, apoio:'/ebd/adolescentes/html/apoio-10.html', mapa:null},
    {n:11, titulo:'A PRISÃO E O JULGAMENTO DE PAULO',           licao:'/ebd/adolescentes/html/licao-11.html', ppt:null, apoio:'/ebd/adolescentes/html/apoio-11.html', mapa:null},
    {n:12, titulo:'OS AMIGOS E COOPERADORES DE PAULO',          licao:'/ebd/adolescentes/html/licao-12.html', ppt:null, apoio:'/ebd/adolescentes/html/apoio-12.html', mapa:null},
    {n:13, titulo:'A PARTIDA E O LEGADO DE PAULO',              licao:'/ebd/adolescentes/html/licao-13.html', ppt:null, apoio:'/ebd/adolescentes/html/apoio-13.html', mapa:null},
  ],
  juniores:[
    {n:1,  titulo:'A DESOBEDIÊNCIA DO POVO DE DEUS',            licao:null, ppt:null, apoio:null, mapa:null},
    {n:2,  titulo:'DEUS ESCOLHE LIBERTADORES',                 licao:null, ppt:null, apoio:null, mapa:null},
    {n:3,  titulo:'OTNIEL E OS MESOPOTÂMIOS',                  licao:null, ppt:null, apoio:null, mapa:null},
    {n:4,  titulo:'EÚDE E OS MOABITAS',                        licao:null, ppt:null, apoio:null, mapa:null},
    {n:5,  titulo:'SANGAR E OS FILISTEUS',                     licao:null, ppt:null, apoio:null, mapa:null},
    {n:6,  titulo:'DÉBORA E BARAQUE NA BATALHA CONTRA OS CANANEUS', licao:null, ppt:null, apoio:null, mapa:null},
    {n:7,  titulo:'GIDEÃO ENFRENTA OS MIDIANITAS',             licao:null, ppt:null, apoio:null, mapa:null},
    {n:8,  titulo:'ABIMELEQUE LIDERA ISRAEL',                  licao:null, ppt:null, apoio:null, mapa:null},
    {n:9,  titulo:'JEFTÉ LIVRA ISRAEL DOS AMONITAS',           licao:null, ppt:null, apoio:null, mapa:null},
    {n:10, titulo:'JEFTÉ BATALHA CONTRA OS EFRAIMITAS',        licao:'/ebd/juniores/html/licao-10.html', ppt:null, apoio:'/ebd/juniores/html/apoio-10.html', mapa:null},
    {n:11, titulo:'O NASCIMENTO E VIDA DE SANSÃO',             licao:'/ebd/juniores/html/licao-11.html', ppt:null, apoio:'/ebd/juniores/html/apoio-11.html', mapa:null},
    {n:12, titulo:'SANSÃO LIVRA ISRAEL DOS FILISTEUS',         licao:'/ebd/juniores/html/licao-12.html', ppt:null, apoio:'/ebd/juniores/html/apoio-12.html', mapa:null},
    {n:13, titulo:'MICA E O LEVITA EM SUA CASA',               licao:'/ebd/juniores/html/licao-13.html', ppt:null, apoio:'/ebd/juniores/html/apoio-13.html', mapa:null},
  ],
  adulto4:[
    {n:1,  titulo:'Deuteronômio: O Livro da Aliança',              licao:'/ebd/adulto4/html/licao-01.html', ppt:null, apoio:null, mapa:null},
    {n:2,  titulo:'Recapitulando a Jornada no Deserto',            licao:'/ebd/adulto4/html/licao-02.html', ppt:null, apoio:null, mapa:null},
    {n:3,  titulo:'A Fidelidade de Deus diante da Infidelidade de Israel', licao:'/ebd/adulto4/html/licao-03.html', ppt:null, apoio:null, mapa:null},
    {n:4,  titulo:'O Chamado à Obediência',                        licao:'/ebd/adulto4/html/licao-04.html', ppt:null, apoio:null, mapa:null},
    {n:5,  titulo:'O Grande Mandamento',                           licao:'/ebd/adulto4/html/licao-05.html', ppt:null, apoio:null, mapa:null},
    {n:6,  titulo:'A Aliança e as Bênçãos da Obediência',          licao:'/ebd/adulto4/html/licao-06.html', ppt:null, apoio:null, mapa:null},
    {n:7,  titulo:'Maldições e Bênçãos da Aliança',                licao:'/ebd/adulto4/html/licao-07.html', ppt:null, apoio:null, mapa:null},
    {n:8,  titulo:'Escolhendo a Vida ou a Morte',                  licao:'/ebd/adulto4/html/licao-08.html', ppt:null, apoio:null, mapa:null},
    {n:9,  titulo:'A Sucessão de Moisés',                          licao:'/ebd/adulto4/html/licao-09.html', ppt:null, apoio:null, mapa:null},
    {n:10, titulo:'O Cântico de Moisés: Advertência e Esperança',  licao:'/ebd/adulto4/html/licao-10.html', ppt:null, apoio:null, mapa:null},
    {n:11, titulo:'A Bênção Final de Moisés',                      licao:'/ebd/adulto4/html/licao-11.html', ppt:null, apoio:null, mapa:null},
    {n:12, titulo:'A Morte de Moisés e a Continuidade da Promessa',licao:'/ebd/adulto4/html/licao-12.html', ppt:null, apoio:null, mapa:null},
    {n:13, titulo:'O Cumprimento de Deuteronômio em Cristo',       licao:'/ebd/adulto4/html/licao-13.html', ppt:null, apoio:null, mapa:null},
  ],
  jovem4:[
    {n:1,  titulo:'Carta aos Filipenses: Um Chamado à Alegria',    licao:'/ebd/jovem4/html/licao-01.html', ppt:null, apoio:null, mapa:null},
    {n:2,  titulo:'Uma Vida Digna do Evangelho',                   licao:'/ebd/jovem4/html/licao-02.html', ppt:null, apoio:null, mapa:null},
    {n:3,  titulo:'A Humildade de Cristo: O Exemplo Supremo',      licao:'/ebd/jovem4/html/licao-03.html', ppt:null, apoio:null, mapa:null},
    {n:4,  titulo:'Brilhe a Luz de Cristo em Meio à Geração Corrompida', licao:'/ebd/jovem4/html/licao-04.html', ppt:null, apoio:null, mapa:null},
    {n:5,  titulo:'Exemplo de Servos Fiéis: Timóteo e Epafrodito', licao:'/ebd/jovem4/html/licao-05.html', ppt:null, apoio:null, mapa:null},
    {n:6,  titulo:'Guardando-se dos Falsos Mestres',               licao:'/ebd/jovem4/html/licao-06.html', ppt:null, apoio:null, mapa:null},
    {n:7,  titulo:'O Alvo Supremo: Conhecer a Cristo',             licao:'/ebd/jovem4/html/licao-07.html', ppt:null, apoio:null, mapa:null},
    {n:8,  titulo:'Unidade e Alegria no Senhor',                   licao:'/ebd/jovem4/html/licao-08.html', ppt:null, apoio:null, mapa:null},
    {n:9,  titulo:'A Paz de Deus Guarda o Coração',                licao:'/ebd/jovem4/html/licao-09.html', ppt:null, apoio:null, mapa:null},
    {n:10, titulo:'O Pensar Cristão: O que Ocupa a Sua Mente?',    licao:'/ebd/jovem4/html/licao-10.html', ppt:null, apoio:null, mapa:null},
    {n:11, titulo:'Contentamento em Toda e Qualquer Situação',     licao:'/ebd/jovem4/html/licao-11.html', ppt:null, apoio:null, mapa:null},
    {n:12, titulo:'Generosidade e Cuidado com a Obra de Deus',     licao:'/ebd/jovem4/html/licao-12.html', ppt:null, apoio:null, mapa:null},
    {n:13, titulo:'Saudações Finais, Comunhão e Bênçãos',          licao:'/ebd/jovem4/html/licao-13.html', ppt:null, apoio:null, mapa:null},
  ]
};

let ebdTurmaAtual='adulto', ebdDetalheIdx=0, pptLicao=null, pptIdx=0, _pptTx=0;

var _PROX_4TRI=[
 'Deuteronômio: O Livro da Aliança',
 'Recapitulando a Jornada no Deserto',
 'A Fidelidade de Deus diante da Infidelidade de Israel',
 'O Chamado à Obediência',
 'O Grande Mandamento',
 'A Aliança e as Bênçãos da Obediência',
 'As Maldições e as Bênçãos da Aliança',
 'Escolhendo entre a Vida e a Morte',
 'A Sucessão de Moisés',
 'O Cântico de Moisés: Advertência e Esperança',
 'A Bênção Final de Moisés',
 'A Morte de Moisés e a Continuidade da Promessa',
 'O Cumprimento de Deuteronômio em Cristo'
];
function abrirProximoTrimestre(){
  var ov=document.getElementById('prox-4tri-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='prox-4tri-ov'; document.body.appendChild(ov); }
  ov.style.cssText='position:fixed;inset:0;z-index:99998;background:#0a1420;display:flex;flex-direction:column';
  var lis=_PROX_4TRI.map(function(t,i){
    var img='/ebd/adulto/img/prox4-licao-'+String(i+1).padStart(2,'0')+'.png';
    return '<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;margin-bottom:10px">'
      +'<div style="position:relative;width:100%;aspect-ratio:16/9;background:#0f3d5c">'
        +'<img src="'+img+'" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;display:block" onerror="this.style.display=\'none\'">'
        +'<div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(10,20,32,0) 55%,rgba(10,20,32,.75) 100%)"></div>'
        +'<div style="position:absolute;top:8px;left:8px;width:28px;height:28px;border-radius:8px;background:#123a52;color:#f0d488;font-weight:900;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.5)">'+(i+1)+'</div>'
      +'</div>'
      +'<div style="display:flex;gap:10px;align-items:center;padding:10px 12px">'
        +'<div style="color:#eaf2f8;font-size:13.5px;font-weight:600;line-height:1.3">'+t+'</div>'
        +'<span style="margin-left:auto;color:#7f97a8;font-size:15px;flex-shrink:0">🔒</span></div>'
      +'</div>';
  }).join('');
  ov.innerHTML=''
   +'<div style="position:absolute;top:0;left:0;right:0;z-index:5;display:flex;align-items:center;gap:10px;padding:12px 14px">'
     +'<button onclick="fecharProximoTrimestre()" style="background:rgba(0,0,0,.42);border:none;color:#fff;width:38px;height:38px;border-radius:12px;font-size:20px;cursor:pointer">‹</button>'
     +'<button onclick="compartilharProximoTrimestre()" title="Compartilhar" style="margin-left:auto;background:#25D366;border:none;color:#fff;padding:9px 15px;border-radius:999px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit">📤 Compartilhar</button></div>'
   +'<div style="flex:1;overflow-y:auto">'
     +'<div style="position:relative;height:46vh;min-height:320px;overflow:hidden;background:#0a1420">'
       +'<img src="/ebd/adulto/img/proximo-4tri-hero.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;opacity:.95" onerror="this.style.display=\'none\'">'
       +'<div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(10,20,32,.5) 0%,rgba(10,20,32,.05) 24%,rgba(10,20,32,.05) 66%,rgba(10,20,32,.5) 86%,#0a1420 100%)"></div>'
       +'<div style="position:absolute;top:62px;left:16px;z-index:2"><div style="display:inline-block;background:#c99a3a;color:#20160a;font-size:11px;font-weight:800;padding:5px 12px;border-radius:999px;box-shadow:0 3px 10px rgba(0,0,0,.4)">🔒 EM BREVE · OUT 2026</div></div>'
       +'<div style="position:absolute;left:0;right:0;bottom:0;padding:0 16px 12px;z-index:2;text-align:center"><div style="color:#f0d488;font-size:12.5px;font-weight:700;text-shadow:0 1px 8px rgba(0,0,0,.9)">4º Trimestre 2026 · Comentarista Pr. Osiel Gomes</div></div>'
     +'</div>'
     +'<div style="padding:16px 16px 40px">'
       +'<div style="color:#f0d488;font-weight:800;font-size:13px;margin:0 2px 10px;letter-spacing:.5px">AS 13 LIÇÕES</div>'
       +lis
       +'<button onclick="compartilharProximoTrimestre()" style="width:100%;margin-top:16px;padding:14px;border-radius:14px;border:none;background:#25D366;color:#fff;font-weight:800;font-size:15px;font-family:inherit;cursor:pointer">📤 Compartilhar nos grupos</button>'
       +'<div style="text-align:center;color:#7f97a8;font-size:12px;margin-top:14px;line-height:1.5">📖 Liberado automaticamente quando o trimestre começar.</div>'
     +'</div>'
   +'</div>';
  ov.style.display='flex';
}
function fecharProximoTrimestre(){ var ov=document.getElementById('prox-4tri-ov'); if(ov){ ov.style.display='none'; ov.innerHTML=''; } }
function compartilharProximoTrimestre(){
  var url='https://radar-atual.vercel.app/?mod=ebd';
  var txt='🔜 PRÓXIMO TRIMESTRE da EBD (Adultos)\n\n📖 *O Deus da Aliança* — Advertências, Promessas e Bênçãos no Livro de Deuteronômio\n4º Trimestre 2026 · 13 lições · Pr. Osiel Gomes\n\nJá dá pra ver tudo no app RADAR ATUAL 👇\n'+url;
  if(navigator.share){ navigator.share({title:'Próximo Trimestre — O Deus da Aliança',text:txt,url:url}).catch(function(){}); }
  else { try{navigator.clipboard.writeText(txt);}catch(e){} alert('Copiado pra compartilhar!\n\n'+txt); }
}
function abrirEbd(){
  ocultarTodas();
  document.getElementById('tela-ebd').classList.add('ativa');
  atualizarContadorEbdAlunos();
  atualizarContadoresEv();
}

// ══ EBD CRM ═══════════════════════════════════════
let ebdCrmFiltro='', ebdCrmEditId=null;
function getAlunos(){ return JSON.parse(localStorage.getItem('ebd_alunos')||'[]'); }
function setAlunos(arr){ localStorage.setItem('ebd_alunos',JSON.stringify(arr)); }

function abrirEbdCrm(){
  ocultarTodas();
  document.getElementById('tela-ebd-crm').classList.add('ativa');
  document.getElementById('ebd-crm-busca').value='';
  ebdCrmFiltro='';
  document.querySelectorAll('.ebd-crm-chip').forEach(c=>c.classList.toggle('ativa',c.dataset.turma===''));
  renderEbdCrm();
}

function filtroEbdCrm(el,turma){
  ebdCrmFiltro=turma;
  document.querySelectorAll('.ebd-crm-chip').forEach(c=>c.classList.remove('ativa'));
  el.classList.add('ativa');
  renderEbdCrm();
}

function renderEbdCrm(){
  const alunos=getAlunos();
  const busca=document.getElementById('ebd-crm-busca').value.toLowerCase().trim();
  let filtrado=ebdCrmFiltro?alunos.filter(a=>a.turma===ebdCrmFiltro):alunos;
  if(busca) filtrado=filtrado.filter(a=>a.nome.toLowerCase().includes(busca)||(a.fone||'').includes(busca)||(a.obs||'').toLowerCase().includes(busca));
  document.getElementById('ebd-crm-sub').textContent=`${alunos.length} aluno${alunos.length!==1?'s':''}`;
  atualizarContadorEbdAlunos();
  const el=document.getElementById('ebd-crm-lista');
  if(!filtrado.length){
    el.innerHTML=`<div class="ebd-crm-empty"><div style="font-size:40px">👥</div><div>${busca||ebdCrmFiltro?'Nenhum aluno encontrado.':'Nenhum aluno cadastrado.<br>Toque em + para adicionar.'}</div></div>`;
    return;
  }
  const lbl={adulto:'Adulto',jovem:'Jovem',crianca:'Criança'};
  el.innerHTML=filtrado.map(a=>`
    <div class="ebd-crm-aluno">
      <div class="ebd-crm-info">
        <div class="ebd-crm-nome">${a.nome}</div>
        <div class="ebd-crm-meta">
          <span class="ebd-crm-badge ${a.turma}">${lbl[a.turma]||a.turma}</span>${a.fone?` 📞 ${a.fone}`:''}
        </div>
        ${a.obs?`<div class="item-obs" style="margin-top:4px">${a.obs}</div>`:''}
      </div>
      <div class="item-acts">
        <button class="btn-sm btn-ed" onclick="abrirModalAluno('${a.id}')">✏️</button>
        <button class="btn-sm btn-dl" onclick="deletarAluno('${a.id}')">🗑️</button>
      </div>
    </div>`).join('');
}

function atualizarContadorEbdAlunos(){
  const el=document.getElementById('cnt-ebd-alunos');
  if(!el)return;
  const n=getAlunos().length;
  el.textContent=n?n:'';
}

function abrirModalAluno(id){
  ebdCrmEditId=id||null;
  document.getElementById('mal-label').textContent=id?'Editar Aluno':'Novo Aluno';
  if(id){
    const a=getAlunos().find(x=>x.id===id)||{};
    document.getElementById('mal-nome').value=a.nome||'';
    document.getElementById('mal-turma').value=a.turma||'adulto';
    document.getElementById('mal-fone').value=a.fone||'';
    document.getElementById('mal-obs').value=a.obs||'';
  } else {
    document.getElementById('mal-nome').value='';
    document.getElementById('mal-turma').value='adulto';
    document.getElementById('mal-fone').value='';
    document.getElementById('mal-obs').value='';
  }
  document.getElementById('modal-aluno').classList.add('open');
  setTimeout(()=>document.getElementById('mal-nome').focus(),120);
}

function fecharModalAluno(){
  document.getElementById('modal-aluno').classList.remove('open');
}

function salvarAluno(){
  const nome=document.getElementById('mal-nome').value.trim();
  if(!nome){document.getElementById('mal-nome').focus();return;}
  const obj={
    id:ebdCrmEditId||Date.now().toString(),
    nome,
    turma:document.getElementById('mal-turma').value,
    fone:document.getElementById('mal-fone').value.trim(),
    obs:document.getElementById('mal-obs').value.trim()
  };
  const arr=getAlunos();
  if(ebdCrmEditId){const i=arr.findIndex(x=>x.id===ebdCrmEditId);if(i>=0)arr[i]=obj;else arr.unshift(obj);}
  else arr.unshift(obj);
  setAlunos(arr);
  fecharModalAluno();
  renderEbdCrm();
}

function deletarAluno(id){
  if(!confirm('Excluir este aluno?'))return;
  setAlunos(getAlunos().filter(x=>x.id!==id));
  renderEbdCrm();
}
// ══ FIM EBD CRM ═══════════════════════════════════

// ══ EVENTOS ════════════════════════════════════════
let evModuloAtual='', evEditId=null, evPaiTela='home';
const EV_ICONES={ebd:'🏫',biblia:'📖',harpa:'🎵'};
const EV_DIAS=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

function getEventos(){ return JSON.parse(localStorage.getItem('radar_eventos')||'[]'); }
function setEventos(arr){ localStorage.setItem('radar_eventos',JSON.stringify(arr)); }

// Agenda Regional CEADEMA 2026 — avisos até o fim do ano (fonte: PDF oficial CEADEMA)
const AGENDA_CEADEMA_2026=[
  {id:'cea-0717',data:'2026-07-17',icone:'📣',titulo:'Cruzada CEADEMA – Projeto Barnabé (17 a 19/07) · AD Morros dos Cabocos, Bernardo do Mearim'},
  {id:'cea-0808',data:'2026-08-08',icone:'📖',titulo:'3ª CREDC – Conferência Regional de Escola Dominical (Projetos Atos e Marcos) · AD Barreirinhas'},
  {id:'cea-0821',data:'2026-08-21',icone:'📣',titulo:'Cruzada CEADEMA – Projeto Tito (21 a 23/08) · AD Brejo das Flores, Vitorino Freire'},
  {id:'cea-0918',data:'2026-09-18',icone:'📣',titulo:'Cruzada CEADEMA – Projeto Atos (18 a 20/09) · AD Jussatuba, Icatu'},
  {id:'cea-1016',data:'2026-10-16',icone:'📣',titulo:'Cruzada CEADEMA – Projeto Eliseu (16 a 18/10) · AD Conceição, Mirador'},
  {id:'cea-1120',data:'2026-11-20',icone:'📣',titulo:'Cruzada CEADEMA – Projeto ENCOPAELO (20 a 22/11) · AD Maçaricó, Guimarães'},
  {id:'cea-1120t',data:'2026-11-20',icone:'👑',titulo:'2º TILL – UNILIDER (20 a 21/11) · AD Bacabeira'},
  {id:'cea-1212',data:'2026-12-12',icone:'📣',titulo:'Cruzada CEADEMA – Projeto Eliseu (12 a 13/12) · AD São João da Mata, Governador Luiz Rocha'},
  {id:'cea-1219',data:'2026-12-19',icone:'🎄',titulo:'Cantata de Natal · Sede dos Polos'},
];
// semeia a agenda CEADEMA 1 vez, sem apagar/duplicar eventos que já existam
function seedAgendaCeadema(){
  if(localStorage.getItem('radar_seed_agenda_ceadema_v1')) return;
  const base=getEventos(); const ids=new Set(base.map(e=>e.id));
  const novos=AGENDA_CEADEMA_2026.filter(e=>!ids.has(e.id))
    .map(e=>({id:e.id,titulo:e.titulo,modulo:'ebd',icone:e.icone,tipo:'data',data:e.data,hora:''}));
  if(novos.length) setEventos(base.concat(novos));
  localStorage.setItem('radar_seed_agenda_ceadema_v1','1');
}

function abrirEventos(modulo){
  evModuloAtual=modulo;
  // registrar de onde viemos
  if(modulo==='ebd') evPaiTela='tela-ebd';
  else evPaiTela='tela-bh-landing';
  ocultarTodas();
  document.getElementById('tela-eventos').classList.add('ativa');
  const nomes={ebd:'Eventos EBD',biblia:'Eventos Bíblia',harpa:'Eventos Harpa'};
  document.getElementById('ev-titulo').textContent=nomes[modulo]||'Eventos';
  renderEventos();
}

function fecharEventos(){
  ocultarTodas();
  document.getElementById(evPaiTela||'home').classList.add('ativa');
  if(evPaiTela==='home') renderHome();
}

function filtroEventos(el, mod){
  evModuloAtual=mod;
  document.querySelectorAll('#ev-filters .ebd-crm-chip').forEach(c=>c.classList.remove('ativa'));
  el.classList.add('ativa');
  renderEventos();
}

function renderEventos(){
  const todos=getEventos();
  const filtrado=evModuloAtual?todos.filter(e=>e.modulo===evModuloAtual):todos;
  document.getElementById('ev-sub').textContent=`${filtrado.length} evento${filtrado.length!==1?'s':''}`;
  atualizarContadoresEv();
  const el=document.getElementById('ev-lista');
  if(!filtrado.length){
    el.innerHTML=`<div class="ev-empty"><div style="font-size:40px">📅</div><div>Nenhum evento cadastrado.<br>Toque em + para adicionar.</div></div>`;
    return;
  }
  const hoje=new Date().toISOString().split('T')[0];
  const sorted=[...filtrado].sort((a,b)=>{
    const da=a.tipo==='data'?a.data:'9999-'+String(a.diaSemana||0).padStart(2,'0');
    const db=b.tipo==='data'?b.data:'9999-'+String(b.diaSemana||0).padStart(2,'0');
    return da<db?-1:1;
  });
  const nomesMod={ebd:'EBD',biblia:'Bíblia',harpa:'Harpa'};
  el.innerHTML=sorted.map(ev=>{
    const vencido=ev.tipo==='data'&&ev.data<hoje;
    const quando=ev.tipo==='fixo'?`🔁 ${EV_DIAS[ev.diaSemana||0]}${ev.hora?' · '+ev.hora:''}`:
      `📆 ${ev.data?ev.data.split('-').reverse().join('/'):''}${ev.hora?' · '+ev.hora:''}`;
    return `<div class="ev-card" style="${vencido?'opacity:.45':''}">
      <div class="ev-icone">${ev.icone||EV_ICONES[ev.modulo]||'📅'}</div>
      <div class="ev-info">
        <div class="ev-titulo">${ev.titulo}</div>
        <div class="ev-meta">
          <span class="ev-badge ${ev.modulo}">${nomesMod[ev.modulo]||ev.modulo}</span>
          <span>${quando}</span>
        </div>
      </div>
      <div class="item-acts">
        <button class="btn-sm btn-ed" onclick="abrirModalEvento('${ev.id}')">✏️</button>
        <button class="btn-sm btn-dl" onclick="deletarEvento('${ev.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function atualizarContadoresEv(){
  const todos=getEventos();
  ['ebd','biblia','harpa'].forEach(m=>{
    const el=document.getElementById('cnt-ev-'+m);
    if(!el)return;
    const n=todos.filter(e=>e.modulo===m).length;
    el.textContent=n?n:'';
  });
}

function toggleEvTipo(){
  const t=document.getElementById('mev-tipo').value;
  document.getElementById('mev-dia-wrap').style.display=t==='fixo'?'':'none';
  document.getElementById('mev-data-wrap').style.display=t==='data'?'':'none';
}

function abrirModalEvento(id){
  evEditId=id||null;
  document.getElementById('mev-label').textContent=id?'Editar Evento':'Novo Evento';
  if(id){
    const ev=getEventos().find(x=>x.id===id)||{};
    document.getElementById('mev-titulo').value=ev.titulo||'';
    document.getElementById('mev-modulo').value=ev.modulo||evModuloAtual||'ebd';
    document.getElementById('mev-icone').value=ev.icone||'';
    document.getElementById('mev-tipo').value=ev.tipo||'fixo';
    document.getElementById('mev-dia').value=ev.diaSemana||0;
    document.getElementById('mev-data').value=ev.data||'';
    document.getElementById('mev-hora').value=ev.hora||'';
  } else {
    document.getElementById('mev-titulo').value='';
    document.getElementById('mev-modulo').value=evModuloAtual||'ebd';
    document.getElementById('mev-icone').value='';
    document.getElementById('mev-tipo').value='fixo';
    document.getElementById('mev-dia').value=new Date().getDay();
    document.getElementById('mev-data').value='';
    document.getElementById('mev-hora').value='';
  }
  toggleEvTipo();
  document.getElementById('modal-evento').classList.add('open');
  setTimeout(()=>document.getElementById('mev-titulo').focus(),120);
}

function fecharModalEvento(){
  document.getElementById('modal-evento').classList.remove('open');
}

function salvarEvento(){
  const titulo=document.getElementById('mev-titulo').value.trim();
  if(!titulo){document.getElementById('mev-titulo').focus();return;}
  const tipo=document.getElementById('mev-tipo').value;
  const obj={
    id:evEditId||Date.now().toString(),
    titulo,
    modulo:document.getElementById('mev-modulo').value,
    icone:document.getElementById('mev-icone').value.trim(),
    tipo,
    diaSemana:tipo==='fixo'?parseInt(document.getElementById('mev-dia').value):null,
    data:tipo==='data'?document.getElementById('mev-data').value:null,
    hora:document.getElementById('mev-hora').value
  };
  const arr=getEventos();
  if(evEditId){const i=arr.findIndex(x=>x.id===evEditId);if(i>=0)arr[i]=obj;else arr.unshift(obj);}
  else arr.unshift(obj);
  setEventos(arr);
  fecharModalEvento();
  renderEventos();
  renderHome();
}

function deletarEvento(id){
  if(!confirm('Excluir este evento?'))return;
  setEventos(getEventos().filter(x=>x.id!==id));
  renderEventos();
  renderHome();
}
// ══ FIM EVENTOS ════════════════════════════════════

// ══ MEU PROGRESSO EBD ════════════════════════════
// Marca lição como concluída (só no aparelho do aluno, offline). Guarda por turma
// -> lição, pra cada turma ter sua própria trilha. Nunca sobe pra servidor: é o
// caderninho pessoal do aluno acompanhar o trimestre.
function ebdProg(){ try{ return JSON.parse(localStorage.getItem('radar_ebd_progresso')||'{}'); }catch(_){ return {}; } }
function ebdProgSave(o){ try{ localStorage.setItem('radar_ebd_progresso',JSON.stringify(o)); }catch(_){} }
function ebdConcluida(turma,n){ const p=ebdProg(); return !!(p[turma]&&p[turma][n]); }
function ebdToggleConcluida(turma,n){
  const p=ebdProg(); if(!p[turma]) p[turma]={};
  if(p[turma][n]){ delete p[turma][n]; } else { p[turma][n]=true; }
  if(!Object.keys(p[turma]).length) delete p[turma];
  ebdProgSave(p);
  return ebdConcluida(turma,n);
}
function ebdProgTurma(turma){
  const lics=EBD_LICOES[turma]||[];
  const comConteudo=lics.filter(l=>l.n>0 && (l.licao||l.apoio||l.ppt)); // só conta lição que tem conteúdo
  const total=comConteudo.length;
  const p=ebdProg()[turma]||{}; const feitas=comConteudo.filter(l=>p[l.n]).length;
  return {feitas,total};
}

// ══ PIN MESTRE (0607) — abre QUALQUER bloqueio do app ════════════
// O Elias nem sempre está por perto; com o PIN ele destrava tudo (lições futuras,
// 4º tri, configs). Fica guardado no aparelho até ele sair (basta digitar 1 vez).
function pinMaster(){ try{ return localStorage.getItem('radar_pin_master')==='1'; }catch(_){ return false; } }
function pedirPinMaster(aposOk){
  const p=prompt('🔒 Conteúdo bloqueado.\nDigite o PIN para abrir:');
  if(p===null) return;
  if(p.trim()==='0607'){ try{ localStorage.setItem('radar_pin_master','1'); }catch(_){ } if(typeof showToast==='function') showToast('🔓 Desbloqueado com PIN'); if(aposOk) aposOk(); }
  else if(typeof showToast==='function') showToast('PIN incorreto');
}

// ══ PRÉVIA da lição bloqueada (capa + Texto Áureo + Verdade Prática) ══
let EBD_PREVIA=null;
function carregarPrevia(cb){
  if(EBD_PREVIA){ if(cb)cb(); return; }
  fetch('/ebd/previa.json').then(r=>r.json()).then(d=>{ EBD_PREVIA=d||{}; if(cb)cb(); }).catch(()=>{ EBD_PREVIA={}; if(cb)cb(); });
}
function previaLic(turma,n){ try{ return (EBD_PREVIA&&EBD_PREVIA[turma]&&EBD_PREVIA[turma][String(n)])||null; }catch(_){ return null; } }

function abrirEbdTurma(turma){
  ebdTurmaAtual=turma;
  carregarPrevia();
  const lics=EBD_LICOES[turma];
  const label={adulto:'LIÇÃO ADULTO',jovem:'LIÇÃO JOVEM',juvenis:'LIÇÃO JUVENIS',adolescentes:'LIÇÃO ADOLESCENTES',juniores:'LIÇÃO JUNIORES',adulto4:'ADULTO · 4º TRI',jovem4:'JOVEM · 4º TRI'}[turma]||'LIÇÃO';
  const icon={adulto:'👨',jovem:'🧑',juvenis:'🧒',adolescentes:'🧑‍🎓',juniores:'🧒',adulto4:'📘',jovem4:'📗'}[turma]||'📖';
  document.getElementById('ebd-turma-titulo').textContent=label;
  document.getElementById('ebd-turma-icon').textContent=icon;
  const body=document.getElementById('ebd-turma-body');
  if(!lics.length){
    body.innerHTML=`<div class="mod-empty"><div class="mod-empty-icon">${icon}</div><div class="mod-empty-txt">Em breve</div></div>`;
    document.getElementById('ebd-turma-sub').textContent='Em breve';
  } else {
    const main=lics.filter(l=>l.n>0);
    const extra=lics.filter(l=>l.n===0);
    document.getElementById('ebd-turma-sub').textContent=main.length+' lições';
    const _capaHero=`<div style="margin:0 0 16px;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.32)"><img src="/ebd/${turma}/img/capa.jpg" style="width:100%;display:block" onerror="this.parentNode.style.display='none'"></div>`;
    const _pg=ebdProgTurma(turma); const _pct=_pg.total?Math.round(_pg.feitas/_pg.total*100):0;
    const _progBar=_pg.total?`<div style="margin:0 0 16px;background:rgba(15,24,38,.6);border:1px solid rgba(240,226,184,.18);border-radius:14px;padding:12px 14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:12.5px;font-weight:800;color:#f0dca0;letter-spacing:.3px">📗 MEU PROGRESSO</div>
        <div style="font-size:12px;color:var(--sub)">${_pg.feitas} de ${_pg.total} concluídas</div>
      </div>
      <div style="height:9px;background:rgba(255,255,255,.09);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${_pct}%;background:linear-gradient(90deg,#c8873f,#f0dca0);border-radius:99px;transition:width .4s"></div>
      </div>
    </div>`:'';
    body.innerHTML=_capaHero+_progBar+main.map(lic=>{
      const idx=lics.indexOf(lic);
      const _feita=ebdConcluida(turma,lic.n);
      const _selo=_feita?'<div style="position:absolute;top:10px;left:10px;background:#25D366;color:#fff;font-size:11px;font-weight:800;padding:5px 10px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.4)">✓ CONCLUÍDA</div>':'';
      const _selo2=_feita?'<span style="background:#25D366;color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;flex-shrink:0">✓</span>':'';
      const isLocked=pinMaster()?false:(turma.endsWith('4') ? ebd4TriTravado() : (lic.n!==licaoDaSemana())); /* PIN mestre abre tudo; senão 4º tri travado até OUT e só a do domingo atual */
      const tags=[lic.licao?'Lição':'',lic.ppt?'PPT':'',lic.apoio?'Apoio':''].filter(Boolean).join(' · ');
      if(ebdTurmaAtual==='adulto' && lic.n>=1 && lic.n<=13){
        const nn=String(lic.n).padStart(2,'0');
        const _at=licaoDaSemana();
        const badge = lic.n<_at
          ?'<div style="position:absolute;top:10px;right:10px;background:rgba(15,24,38,.82);color:#f0dca0;border:1px solid rgba(240,226,184,.45);font-size:11px;font-weight:800;padding:5px 11px;border-radius:999px;letter-spacing:.5px">📘 ANTIGA</div>'
          : lic.n===_at
          ?'<div style="position:absolute;top:10px;right:10px;background:#25D366;color:#fff;font-size:11px;font-weight:800;padding:5px 11px;border-radius:999px;letter-spacing:.5px">ESTA SEMANA</div>'
          :'<div style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,.62);color:#fff;font-size:11.5px;font-weight:700;padding:5px 11px;border-radius:999px">🔒 Em breve</div>';
        return `<div class="ebd-item ppt-item" style="display:block;padding:0;overflow:hidden;margin-bottom:12px${lic.n>_at?';opacity:.9':''}" onclick="abrirLicaoDetalhe(${idx})">
          <div style="position:relative">
            <img src="/ebd/${ebdTurmaAtual}/img/licao-${nn}.jpg" loading="lazy" style="width:100%;display:block" onerror="this.style.display='none'">
            ${badge}${_selo}
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:11px 14px">
            <div style="background:var(--gold);color:#0a3a33;font-weight:900;border-radius:8px;padding:3px 10px;font-size:13px;flex-shrink:0">LIÇÃO ${nn}</div>
            <div style="font-size:12px;color:var(--sub);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${lic.titulo}</div>
            <span style="margin-left:auto;color:var(--gold);font-size:22px;flex-shrink:0">›</span>
          </div>
        </div>`;
      }
      if(isLocked){
        return `<div class="ebd-item ppt-item" style="opacity:.72;cursor:pointer" onclick="abrirLicaoDetalhe(${idx})">
          <div class="ebd-lic-num">${String(lic.n).padStart(2,'0')}</div>
          <div class="ebd-item-info">
            <div class="ebd-item-titulo">${lic.titulo}</div>
            <div class="ebd-item-meta">🔒 Ver prévia · abre com PIN</div>
          </div>
          <span style="font-size:18px;flex-shrink:0">🔒</span>
        </div>`;
      }
      return `<div class="ebd-item ppt-item" onclick="abrirLicaoDetalhe(${idx})">
        <div class="ebd-lic-num">${String(lic.n).padStart(2,'0')}</div>
        <div class="ebd-item-info">
          <div class="ebd-item-titulo">${lic.titulo}</div>
          <div class="ebd-item-meta">${tags}</div>
        </div>
        ${_selo2}<span style="color:var(--sub);font-size:22px;flex-shrink:0">›</span>
      </div>`;
    }).join('')+
    (extra.length?`<div style="padding:8px 0 4px"><div class="bh-secao" style="margin:0">Extra</div></div>`+
    extra.map(lic=>{
      return `<div class="ebd-item" style="opacity:.42;cursor:pointer" onclick="toastBloqueado()">
        <div class="ebd-lic-num" style="font-size:10px">EXT</div>
        <div class="ebd-item-info">
          <div class="ebd-item-titulo">${lic.titulo}</div>
          <div class="ebd-item-meta">Em breve</div>
        </div>
        <span style="font-size:18px;flex-shrink:0">🔒</span>
      </div>`;
    }).join(''):'');
  }
  ocultarTodas();
  document.getElementById('tela-ebd-turma').classList.add('ativa');
}

function fecharEbdTurma(){
  ocultarTodas();
  document.getElementById('tela-ebd').classList.add('ativa');
}

function abrirLicaoDetalhe(idx){
  const _lc=EBD_LICOES[ebdTurmaAtual][idx];
  const _detLocked=pinMaster()?false:(ebdTurmaAtual.endsWith('4') ? ebd4TriTravado() : !!(_lc && _lc.n>0 && _lc.n>licaoDaSemana()));  /* PIN mestre abre; senão 4º tri travado até OUT e só a FUTURA trava */
  const _needPrevia=_detLocked && !EBD_PREVIA;
  ebdDetalheIdx=idx;
  const lic=EBD_LICOES[ebdTurmaAtual][idx];
  const nLabel=lic.n>0?`LIÇÃO ${String(lic.n).padStart(2,'0')}`:'EXTRA';
  document.getElementById('ebd-det-titulo').textContent=nLabel;
  document.getElementById('ebd-det-sub').textContent=lic.titulo;
  const n=String(lic.n>0?lic.n:0).padStart(2,'0');
  const _licBanner=(lic.n>=1&&lic.n<=13)?`<img src="/ebd/${ebdTurmaAtual}/img/licao-${String(lic.n).padStart(2,'0')}.jpg" style="width:100%;border-radius:14px;margin-bottom:14px;box-shadow:0 8px 22px rgba(0,0,0,.28);display:block" onerror="this.style.display='none'">`:'';
  const itens=[
    {num:'1',icon:'📝',nome:'LIÇÃO',
     ativo:!!lic.licao,
     tap:lic.licao?`abrirReader(${idx},'licao',this)`:null},
    {num:'2',icon:'📊',nome:'PPT',
     ativo:!!lic.ppt,
     tap:null,
     btn:lic.ppt?`<button class="ebd-btn-ppt" onclick="event.stopPropagation();abrirPptViewer(${idx})">▶</button>`:`<span class="ebd-em-breve">Em breve</span>`},
    {num:'3',icon:'📁',nome:'APOIO',
     ativo:!!lic.apoio,
     tap:lic.apoio?`abrirReader(${idx},'apoio',this)`:null},
    {num:'4',icon:'🧠',nome:'MAPA MENTAL',
     ativo:false,tap:null},
    {num:'5',icon:'📰',nome:'REVISTA CRISTÃO ALERTA',
     ativo:lic.n>0 && ebdTurmaAtual==='adulto',
     tap:lic.n>0 && ebdTurmaAtual==='adulto'?`abrirReader(${idx},'subsidio')`:null},
    {num:'6',icon:'🎬',nome:'RESUMO EM VÍDEO',
     ativo:!!lic.video,
     tap:lic.video?`abrirVideo('${lic.video||''}')`:null}
  ];
  const _fnd=lic.n>0&&ebdConcluida(ebdTurmaAtual,lic.n);
  const _btnConcluir=(lic.n>0&&!_detLocked)?`<button id="ebd-btn-concluir" onclick="ebdMarcarConcluida(${idx})" style="width:100%;margin-bottom:14px;padding:13px;border:none;border-radius:14px;font-size:14px;font-weight:800;cursor:pointer;letter-spacing:.3px;${_fnd?'background:#25D366;color:#fff':'background:rgba(15,24,38,.7);color:#f0dca0;border:1px solid rgba(240,226,184,.35)'}">${_fnd?'✓ LIÇÃO CONCLUÍDA':'MARCAR COMO CONCLUÍDA'}</button>`:'';
  // PRÉVIA da lição bloqueada: capa (acima) + Texto Áureo + Verdade Prática + botão de PIN
  const _pv=_detLocked?previaLic(ebdTurmaAtual,lic.n):null;
  const _previaBlk=_detLocked?`<div style="background:linear-gradient(160deg,#0d1826,#12233a);border:1px solid rgba(240,226,184,.22);border-radius:16px;padding:16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:${(_pv&&(_pv.aureo||_pv.pratica))?'13px':'4px'}">
        <span style="font-size:22px">🔒</span>
        <div><div style="font-size:13px;font-weight:800;color:#f0dca0;letter-spacing:.4px">PRÉVIA DA LIÇÃO</div>
        <div style="font-size:11.5px;color:var(--sub)">O conteúdo completo abre no domingo — ou agora com o PIN</div></div>
      </div>
      ${_pv&&_pv.aureo?`<div style="background:rgba(201,161,74,.10);border:1px solid rgba(201,161,74,.28);border-radius:12px;padding:12px 14px;margin-bottom:10px">
        <div style="font-size:11px;font-weight:900;color:#e8c877;letter-spacing:2px;margin-bottom:6px">✨ TEXTO ÁUREO</div>
        <div style="font-size:14.5px;line-height:1.55;color:#efe7d2;font-style:italic">${_pv.aureo}</div></div>`:''}
      ${_pv&&_pv.pratica?`<div style="background:rgba(52,199,123,.09);border:1px solid rgba(52,199,123,.26);border-radius:12px;padding:12px 14px;margin-bottom:12px">
        <div style="font-size:11px;font-weight:900;color:#6fe0a3;letter-spacing:2px;margin-bottom:6px">🎯 VERDADE PRÁTICA</div>
        <div style="font-size:14px;line-height:1.55;color:#dceee3">${_pv.pratica}</div></div>`:''}
      <button onclick="pedirPinMaster(function(){abrirLicaoDetalhe(${idx});})" style="width:100%;padding:13px;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;background:var(--gold);color:#0a2a24;letter-spacing:.3px">🔓 ABRIR AGORA COM PIN</button>
    </div>`:'';
  document.getElementById('ebd-det-body').innerHTML=_licBanner+_previaBlk+_btnConcluir+itens.map(it=>{
    const tappable=it.ativo&&it.tap&&!_detLocked;
    const action=_detLocked?`<span class="ebd-em-breve">🔒 Em breve</span>`:(it.btn??(tappable?`<span style="color:var(--sub);font-size:22px;flex-shrink:0">›</span>`:`<span class="ebd-em-breve">Em breve</span>`));
    return `<div class="ebd-item${it.ativo?'':' ebd-item-em-breve'}${tappable?' ppt-item':''}"${tappable?` onclick="${it.tap}"`:''}>
      <div class="ebd-det-num">${it.num}</div>
      <div class="ebd-item-icon">${it.icon}</div>
      <div class="ebd-item-info"><div class="ebd-item-titulo">${it.nome}</div></div>
      ${action}
    </div>`;
  }).join('');
  if(_needPrevia) carregarPrevia(function(){ if(ebdDetalheIdx===idx && document.getElementById('tela-ebd-detalhe').classList.contains('ativa')) abrirLicaoDetalhe(idx); });
  ocultarTodas();
  document.getElementById('tela-ebd-detalhe').classList.add('ativa');
}

function ebdMarcarConcluida(idx){
  const lic=EBD_LICOES[ebdTurmaAtual][idx]; if(!lic||lic.n<=0) return;
  const feita=ebdToggleConcluida(ebdTurmaAtual,lic.n);
  const b=document.getElementById('ebd-btn-concluir');
  if(b){
    b.textContent=feita?'✓ LIÇÃO CONCLUÍDA':'MARCAR COMO CONCLUÍDA';
    b.style.cssText=`width:100%;margin-bottom:14px;padding:13px;border:none;border-radius:14px;font-size:14px;font-weight:800;cursor:pointer;letter-spacing:.3px;${feita?'background:#25D366;color:#fff':'background:rgba(15,24,38,.7);color:#f0dca0;border:1px solid rgba(240,226,184,.35)'}`;
  }
  if(typeof showToast==='function') showToast(feita?'Lição marcada como concluída ✓':'Marcação removida');
}

function abrirReader(idx,tipo){
  const lic=EBD_LICOES[ebdTurmaAtual][idx];
  const nLabel=lic.n>0?`LIÇÃO ${String(lic.n).padStart(2,'0')}`:'EXTRA';
  const tipoLabel=tipo==='licao'?'LIÇÃO':tipo==='apoio'?'APOIO':'CRISTÃO ALERTA';
  document.getElementById('reader-titulo').textContent=tipoLabel+' — '+nLabel;
  document.getElementById('reader-sub').textContent=lic.titulo;
  const n=String(lic.n).padStart(2,'0');
  document.getElementById('reader-frame').src=`/ebd/${ebdTurmaAtual}/html/${tipo}-${n}.html`;
  ocultarTodas();
  document.getElementById('tela-ebd-reader').classList.add('ativa');
  // Lupa da Lição: guarda a lição aberta e mostra o botão (só em lição/apoio de nº válido)
  _lupaLicao=lic.n; _lupaTurma=ebdTurmaAtual;
  if(lic.n>=1 && (tipo==='licao'||tipo==='apoio')) mostrarLupa(); else esconderLupa();
}

function fecharReader(){
  document.getElementById('reader-frame').src='';
  esconderLupa();
  ocultarTodas();
  document.getElementById('tela-ebd-detalhe').classList.add('ativa');
}

function fecharLicaoDetalhe(){
  ocultarTodas();
  document.getElementById('tela-ebd-turma').classList.add('ativa');
}

function abrirPptViewer(idx){
  pptLicao=EBD_LICOES[ebdTurmaAtual][idx];
  pptIdx=0;
  _pptRender();
  const v=document.getElementById('ppt-viewer');
  v.ontouchstart=e=>{_pptTx=e.touches[0].clientX;};
  v.ontouchend=e=>{
    const dx=e.changedTouches[0].clientX-_pptTx;
    if(Math.abs(dx)>40) pptSlide(dx<0?1:-1);
  };
  ocultarTodas();
  document.getElementById('tela-ebd-ppt').classList.add('ativa');
}

function _pptRender(){
  const {titulo,ppt,n}=pptLicao;
  document.getElementById('ppt-titulo').textContent=n>0?`LIÇÃO ${String(n).padStart(2,'0')}`:'EXTRA';
  document.getElementById('ppt-sub').textContent=titulo;
  document.getElementById('ppt-counter').textContent=(pptIdx+1)+' / '+ppt.slides;
  document.getElementById('ppt-slide-img').src='/ebd/'+ebdTurmaAtual+'/ppt/'+ppt.folder+'/slide-'+String(pptIdx+1).padStart(3,'0')+'.jpg';
}

function pptSlide(dir){
  pptIdx=Math.max(0,Math.min(pptLicao.ppt.slides-1,pptIdx+dir));
  _pptRender();
}

function fecharPptViewer(){
  ocultarTodas();
  document.getElementById('tela-ebd-detalhe').classList.add('ativa');
}

function abrirVideo(url){
  if(!url) return;
  const lic=EBD_LICOES[ebdTurmaAtual][ebdDetalheIdx];
  document.getElementById('video-sub').textContent=lic?lic.titulo:'';
  const v=document.getElementById('ebd-video');
  v.src=url;
  ocultarTodas();
  document.getElementById('tela-ebd-video').classList.add('ativa');
}

function fecharVideo(){
  const v=document.getElementById('ebd-video');
  v.pause();
  v.src='';
  ocultarTodas();
  document.getElementById('tela-ebd-detalhe').classList.add('ativa');
}

// ══ NOTÍCIAS DE ISRAEL ════════════════════════════
const NOT_CORES={Profecia:'#f5a623',Arqueologia:'#c8873f',Política:'#4f8ef7','Povo Judeu':'#34c77b',Conflito:'#f75f5f',Sociedade:'#38bdf8'};
const NOT_ART={
  Profecia:   {bg:'linear-gradient(150deg,#1c0d00 0%,#3d1f00 45%,#1a0900 100%)',em:'🕊️'},
  Arqueologia:{bg:'linear-gradient(150deg,#1a1206 0%,#4a3212 45%,#150e04 100%)',em:'🏺'},
  Conflito:   {bg:'linear-gradient(150deg,#200000 0%,#4a0000 45%,#1a0000 100%)',em:'⚔️'},
  'Povo Judeu':{bg:'linear-gradient(150deg,#001a0a 0%,#00442a 45%,#000e05 100%)',em:'✡️'},
  Política:   {bg:'linear-gradient(150deg,#000a1a 0%,#001a44 45%,#00051a 100%)',em:'⚖️'},
  Sociedade:  {bg:'linear-gradient(150deg,#001a22 0%,#003344 45%,#000d11 100%)',em:'🌍'},
};
function catArt(cat,cor){
  const a=NOT_ART[cat]||{bg:'linear-gradient(150deg,#0a1020 0%,#0f2040 100%)',em:'📰'};
  return`<div class="not-img-ph" style="background:${a.bg};flex-direction:column;gap:5px">
    <span style="font-size:58px;line-height:1;filter:drop-shadow(0 0 18px ${cor}99)">${a.em}</span>
    <span style="font-size:9px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:${cor};opacity:.8">${cat||'Israel'}</span>
  </div>`;
}
let _notCache=null,_notAba='news',_notIdx=0,_notItens=[],_notYtId=null;

function abrirNoticias(){
  // sempre abre na aba Notícias
  _notAba='news';
  document.getElementById('not-tab-news').classList.add('on');
  document.getElementById('not-tab-videos').classList.remove('on');
  ocultarTodas();
  document.getElementById('tela-noticias').classList.add('ativa');
  if(!_notCache) carregarNoticias(false);
  else renderNotAba();
}
function fecharNoticias(){
  ocultarTodas();
  document.getElementById('home').classList.add('ativa');
  renderHome();
}
function mudarAba(aba){
  _notAba=aba;
  document.getElementById('not-tab-news').classList.toggle('on',aba==='news');
  document.getElementById('not-tab-videos').classList.toggle('on',aba==='videos');
  renderNotAba();
}
async function carregarNoticias(force){
  const list=document.getElementById('not-list');
  list.innerHTML=`<div class="not-loading"><div class="not-spin"></div><div style="font-size:13px">Carregando notícias...</div></div>`;
  try{
    const url='/api/noticias'+(force?'?_t='+Date.now():'');
    const res=await fetch(url,{cache:force?'no-store':'default'});
    const data=await res.json();
    if(!data.ok) throw new Error(data.error||'Erro');
    _notCache=data;
    _notItens=data.items||[];
    const ts=data.ts?new Date(data.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'';
    document.getElementById('not-sub').textContent=_notItens.length+' notícias'+(ts?' · '+ts:'');
    renderNotAba();
  }catch(e){
    list.innerHTML=`<div class="not-loading"><div style="font-size:36px">📡</div><div style="font-size:13px;text-align:center">Sem conexão.<br>Verifique a internet.</div><button onclick="carregarNoticias(true)" style="margin-top:12px;padding:10px 24px;background:#4f8ef7;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Tentar novamente</button></div>`;
  }
}
function renderNotAba(){
  const list=document.getElementById('not-list');
  if(_notAba==='news'){
    if(!_notItens.length){list.innerHTML='<div class="not-loading"><div style="font-size:36px">📰</div><div style="font-size:13px">Nenhuma notícia ainda.</div></div>';return;}
    list.innerHTML=_notItens.map((n,i)=>{
      const cor=NOT_CORES[n.categoria]||'#C9A14A';
      const imgHtml=n.img
        ?`<img class="not-img" src="${n.img}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`+
         `<div style="display:none">${catArt(n.categoria,cor)}</div>`
        :catArt(n.categoria,cor);
      return`<div class="not-card" onclick="abrirLeitor(${i})">
        ${imgHtml}
        <div class="not-body">
          ${n.categoria?`<span class="not-badge" style="background:${cor}22;color:${cor}">${n.categoria}</span>`:''}
          <div class="not-titulo">${_esc(n.titulo_pt||n.title)}</div>
          ${n.ancora?`<div class="not-ancora">📖 ${_esc(n.ancora)}</div>`:''}
          <div class="not-fonte">${_esc(n.fonte||'')}${n.ytId?' · ▶️ tem vídeo':''}</div>
        </div>
      </div>`;
    }).join('');
  } else {
    const CANAIS=[
      {nome:'i24 NEWS — Israel ao Vivo',canal:'i24NEWS',emoji:'📡',cor:'#4f8ef7',ytUrl:'https://www.youtube.com/results?search_query=i24+news+israel+live'},
      {nome:'Israel em Profecia Bíblica',canal:'Profecia',emoji:'📖',cor:'#f5a623',ytUrl:'https://www.youtube.com/results?search_query=israel+profecia+biblica+hoje'},
      {nome:'Jerusalem Post — Notícias',canal:'Jerusalem Post',emoji:'🗞️',cor:'#34c77b',ytUrl:'https://www.youtube.com/results?search_query=jerusalem+post+israel+today'},
      {nome:'Descobertas Arqueológicas',canal:'Arqueologia',emoji:'🏺',cor:'#c8873f',ytUrl:'https://www.youtube.com/results?search_query=arqueologia+biblica+israel+descoberta'},
    ];
    list.innerHTML=`<div style="font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:var(--gold);opacity:.6;padding:6px 2px 8px">Canais Recomendados</div>`+
    CANAIS.map(v=>{
      return`<div class="not-video-card" onclick="location.href='${v.ytUrl}'">
        <div style="width:100px;height:58px;flex-shrink:0;background:${v.cor}22;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px">${v.emoji}</div>
        <div class="not-video-info">
          <div class="not-video-titulo">${_esc(v.nome)}</div>
          <div class="not-video-canal">${_esc(v.canal)}</div>
        </div>
        <span style="font-size:20px;flex-shrink:0;color:#f75f5f;opacity:.8">▶</span>
      </div>`;
    }).join('');
  }
}
function _esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function abrirLeitor(idx){
  _notIdx=idx;
  const n=_notItens[idx];
  if(!n) return;
  const cor=NOT_CORES[n.categoria]||'#C9A14A';
  document.getElementById('leitor-titulo-h').textContent=n.titulo_pt||n.title;
  document.getElementById('leitor-fonte-h').textContent=n.fonte||'';
  const img=document.getElementById('leitor-img');
  if(n.img){img.src=n.img;img.style.display='block';img.onerror=()=>img.style.display='none';}
  else img.style.display='none';
  const badge=document.getElementById('leitor-badge');
  if(n.categoria){badge.textContent=n.categoria;badge.style.cssText=`display:inline-block;margin-bottom:10px;font-size:9px;font-weight:900;letter-spacing:1px;text-transform:uppercase;border-radius:5px;padding:2px 7px;background:${cor}22;color:${cor}`;}
  else badge.style.display='none';
  document.getElementById('leitor-titulo').textContent=n.titulo_pt||n.title;
  let metaParts=[n.fonte||''];
  if(n.pubDate){try{metaParts.push(new Date(n.pubDate).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}));}catch{}}
  document.getElementById('leitor-meta').textContent=metaParts.filter(Boolean).join(' · ');
  if(n.ancora){document.getElementById('leitor-ancora-block').style.display='block';document.getElementById('leitor-ancora').textContent=n.ancora;}
  else document.getElementById('leitor-ancora-block').style.display='none';
  document.getElementById('leitor-resumo').textContent=n.resumo_pt||n.description||n.title||'';
  document.getElementById('leitor-link').href=n.link||'#';
  const ytBtn=document.getElementById('leitor-yt-btn');
  _notYtId=n.ytId||null;
  if(n.ytId){ytBtn.style.display='flex';ytBtn.onclick=()=>abrirYT(n.ytId,n.titulo_pt||n.title,n.fonte||'');}
  else ytBtn.style.display='none';
  ocultarTodas();
  document.getElementById('tela-noticia-leitor').classList.add('ativa');
}
function fecharLeitor(){
  ocultarTodas();
  document.getElementById('tela-noticias').classList.add('ativa');
}
function abrirYT(videoId,titulo,canal){
  document.getElementById('yt-titulo-h').textContent=titulo||'Vídeo';
  document.getElementById('yt-canal-h').textContent=canal||'';
  document.getElementById('yt-iframe').src='https://www.youtube.com/embed/'+videoId+'?autoplay=1&rel=0&modestbranding=1';
  ocultarTodas();
  document.getElementById('tela-yt-player').classList.add('ativa');
}
function fecharYT(){
  document.getElementById('yt-iframe').src='';
  ocultarTodas();
  document.getElementById('tela-noticias').classList.add('ativa');
}

// ══ UTILS ═════════════════════════════════════════
let tapCount=0,tapTimer=null;
function tapLogo(){
  tapCount++;clearTimeout(tapTimer);
  if(tapCount>=5){tapCount=0;abrirPainelAdm();return;}
  tapTimer=setTimeout(()=>tapCount=0,1500);
}
function irBusca(){alert('Busca global — em breve');}
function irRecentes(){alert('Recentes — em breve');}

// ══════════════════════════════════════════════════════════
// PAINEL ADMINISTRATIVO — NAVEGAÇÃO E LÓGICA
// ══════════════════════════════════════════════════════════

// ── HARDWARE BACK BUTTON (Android/iOS) ───────────────────
// Empurra um estado no history quando entra no admin.
// Quando o usuário pressiona o botão voltar do celular,
// o popstate navega dentro do app em vez de sair para 404.
history.replaceState({admTela:'home'},'');
window.addEventListener('popstate',function(e){
  const tela=document.querySelector('.tela.ativa');
  const id=tela?tela.id:'';
  // sub-tela admin → volta pro menu admin
  if(id&&id.startsWith('tela-adm-')){
    history.pushState({admTela:'tela-painel-adm'},'');
    ocultarTodas();
    document.getElementById('tela-painel-adm').classList.add('ativa');
  } else if(id==='tela-painel-adm'){
    // menu admin → home
    history.pushState({admTela:'home'},'');
    irHome();
  } else {
    // qualquer outra tela → home (comportamento padrão seguro)
    history.pushState({admTela:'home'},'');
    irHome();
  }
});

function abrirPainelAdm(){
  const u=JSON.parse(localStorage.getItem('radar_user')||'{}');
  document.getElementById('adm-user-nome').textContent=u.nome||'Administrador';
  // contadores
  const vis=getVisitantes();
  const alunos=JSON.parse(localStorage.getItem('ebd_alunos')||'[]');
  const evs=JSON.parse(localStorage.getItem('radar_eventos')||'[]');
  document.getElementById('adm-cnt-visitantes').textContent=vis.length+' cadastrado'+(vis.length!==1?'s':'');
  document.getElementById('adm-cnt-alunos').textContent=alunos.length+' cadastrado'+(alunos.length!==1?'s':'');
  document.getElementById('adm-cnt-eventos').textContent=evs.length+' programado'+(evs.length!==1?'s':'');
  history.pushState({admTela:'home'},''); // base de segurança
  abrirTelaAdm('tela-painel-adm');
}

function abrirTelaAdm(telaId){
  history.pushState({admTela:telaId},'');
  ocultarTodas();
  const el=document.getElementById(telaId);
  if(el) el.classList.add('ativa');
  // inicializa CRM ao abrir tela
  if(typeof _crmInitMap!=='undefined' && _crmInitMap[telaId]) _crmInitMap[telaId]();
}

function abrirAdm(modulo){
  trackVisit('admin_'+modulo);
  switch(modulo){
    case 'dashboard':   renderAdmDashboard(); abrirTelaAdm('tela-adm-dashboard'); break;
    case 'visitantes':  renderVisitantes();    abrirTelaAdm('tela-adm-visitantes'); break;
    case 'alunos':      abrirTelaAdm('tela-adm-alunos'); break;
    case 'turmas':      abrirTelaAdm('tela-adm-turmas'); break;
    case 'presenca':    abrirTelaAdm('tela-adm-presenca'); break;
    case 'licoes':      abrirTelaAdm('tela-adm-licoes'); break;
    case 'eventos-adm': abrirTelaAdm('tela-adm-eventos-adm'); break;
    case 'conteudos':   abrirTelaAdm('tela-adm-conteudos'); break;
    case 'comunicacao': abrirTelaAdm('tela-adm-comunicacao'); break;
    case 'relatorios':  abrirTelaAdm('tela-adm-relatorios'); break;
    case 'usuarios':    abrirTelaAdm('tela-adm-usuarios'); break;
    case 'config':      abrirTelaAdm('tela-adm-config'); setTimeout(renderCfgCards,50); break;
    case 'cadastros':   abrirTelaAdm('tela-adm-cadastros'); renderCadastros(); break;
    case 'igrejas':     abrirTelaAdm('tela-adm-igrejas'); renderIgrejasAdm(); break;
    case 'videos':      abrirTelaAdm('tela-adm-videos'); renderVideosAdm(); break;
  }
}
// lista TODOS os cadastros (da nuvem) com botão de recado no WhatsApp
async function renderCadastros(){
  var box=document.getElementById('cad-adm-lista'); if(!box) return;
  box.innerHTML='<div style="text-align:center;color:var(--sub);padding:30px">Carregando cadastros…</div>';
  try{
    var r=await fetch('/api/cadastros?token=radar-elias-2026');
    var d=await r.json();
    var lista=(d&&d.cadastros)||[];
    document.getElementById('cad-adm-sub').textContent=lista.length+' cadastrado'+(lista.length!==1?'s':'');
    if(!lista.length){ box.innerHTML='<div style="text-align:center;color:var(--sub);padding:40px">Ninguém cadastrado ainda.</div>'; return; }
    box.innerHTML=lista.map(function(c){
      var fone=(c.whatsapp||'').replace(/\D/g,'');
      var wa=fone?('https://wa.me/55'+fone):'';
      var foneFmt=fone?('('+fone.slice(0,2)+') '+fone.slice(2)):'sem WhatsApp';
      return '<div style="display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:10px">'
        +'<div style="width:44px;height:44px;border-radius:50%;background:rgba(201,161,74,.15);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:var(--gold);flex-shrink:0">'+((c.nome||'?')[0].toUpperCase())+'</div>'
        +'<div style="flex:1;min-width:0"><div style="font-weight:800;color:var(--txt);font-size:15px">'+(c.nome||'')+'</div>'
        +'<div style="font-size:12.5px;color:var(--gold);font-weight:600">'+(c.cargo||'')+'</div>'
        +'<div style="font-size:12.5px;color:var(--sub)">📱 '+foneFmt+'</div></div>'
        +(wa?'<a href="'+wa+'" target="_blank" style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#fff;font-size:13px;font-weight:800;padding:10px 14px;border-radius:999px;text-decoration:none">💬 Recado</a>':'')
        +(fone?'<button onclick="apagarCadastro(\''+fone+'\',\''+(c.nome||'').replace(/\x27/g,"")+'\')" style="flex-shrink:0;background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.3);color:#ff6b6b;font-size:16px;padding:9px 11px;border-radius:999px;cursor:pointer;line-height:1">🗑️</button>':'')
        +'</div>';
    }).join('');
  }catch(e){ box.innerHTML='<div style="text-align:center;color:var(--red);padding:30px">Erro ao carregar. Tente de novo.</div>'; }
}
async function apagarCadastro(fone,nome){
  if(!confirm('Apagar o cadastro de '+(nome||'esta pessoa')+'?\n\nEla não perde acesso agora, mas some da sua lista.')) return;
  try{
    var r=await fetch('/api/cadastros?token=radar-elias-2026&del='+encodeURIComponent(fone));
    var d=await r.json();
    if(d&&d.ok){ renderCadastros(); }
    else alert('Não deu pra apagar. Tente de novo.');
  }catch(e){ alert('Erro ao apagar.'); }
}

// ══ IGREJAS PARCEIRAS (CRM divulgação) ═══════════════════════
let _igrejaForm = { id:null, capa:'', fotos:[], videos:[], avisos:[] };

function comprimirImagem(file, max, cb){
  var fr=new FileReader();
  fr.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var w=img.width, h=img.height, m=max||1000;
      if(w>h && w>m){ h=Math.round(h*m/w); w=m; }
      else if(h>=w && h>m){ w=Math.round(w*m/h); h=m; }
      var cv=document.createElement('canvas'); cv.width=w; cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      cb(cv.toDataURL('image/jpeg',0.72));
    };
    img.src=e.target.result;
  };
  fr.readAsDataURL(file);
}
function igrejaSetCapa(input){
  var f=input.files&&input.files[0]; if(!f) return;
  comprimirImagem(f,1100,function(d){ _igrejaForm.capa=d; renderIgrejaCapaPrev(); });
}
function renderIgrejaCapaPrev(){
  var el=document.getElementById('igr-capa-prev');
  el.innerHTML=_igrejaForm.capa
    ? '<div style="position:relative"><img src="'+_igrejaForm.capa+'" style="width:100%;height:150px;object-fit:cover;border-radius:14px"><button onclick="_igrejaForm.capa=\'\';renderIgrejaCapaPrev()" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:15px">✕</button></div>'
    : '';
}
function igrejaAddFoto(input){
  var f=input.files&&input.files[0]; if(!f) return;
  if(_igrejaForm.fotos.length>=8){ alert('Máximo de 8 fotos.'); input.value=''; return; }
  comprimirImagem(f,1000,function(d){ _igrejaForm.fotos.push(d); renderIgrejaFotosPrev(); input.value=''; });
}
function renderIgrejaFotosPrev(){
  document.getElementById('igr-fotos-prev').innerHTML=_igrejaForm.fotos.map(function(d,i){
    return '<div style="position:relative;width:72px;height:72px"><img src="'+d+'" style="width:72px;height:72px;object-fit:cover;border-radius:10px"><button onclick="_igrejaForm.fotos.splice('+i+',1);renderIgrejaFotosPrev()" style="position:absolute;top:-6px;right:-6px;background:#ff5050;color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:12px;line-height:1">✕</button></div>';
  }).join('');
}
function ytId(url){ var m=(url||'').match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/); return m?m[1]:''; }
function igrejaAddVideo(){
  var inp=document.getElementById('igr-video-in'); var u=inp.value.trim(); if(!u) return;
  _igrejaForm.videos.push({ url:u }); inp.value=''; renderIgrejaVideos();
}
function renderIgrejaVideos(){
  document.getElementById('igr-videos-lista').innerHTML=_igrejaForm.videos.map(function(v,i){
    var id=ytId(v.url);
    return '<div style="display:flex;align-items:center;gap:8px;background:var(--card2);border:1px solid var(--line);border-radius:10px;padding:8px;margin-bottom:6px">'
      +(id?'<img src="https://img.youtube.com/vi/'+id+'/default.jpg" style="width:52px;height:38px;object-fit:cover;border-radius:6px">':'<div style="font-size:20px">🎬</div>')
      +'<div style="flex:1;min-width:0;font-size:12px;color:var(--sub);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+v.url+'</div>'
      +'<button onclick="_igrejaForm.videos.splice('+i+',1);renderIgrejaVideos()" style="background:none;border:none;color:#ff5050;cursor:pointer;font-size:16px">✕</button></div>';
  }).join('');
}
function igrejaAddAviso(){
  var inp=document.getElementById('igr-aviso-in'); var t=inp.value.trim(); if(!t) return;
  _igrejaForm.avisos.push({ texto:t }); inp.value=''; renderIgrejaAvisos();
}
function renderIgrejaAvisos(){
  document.getElementById('igr-avisos-lista').innerHTML=_igrejaForm.avisos.map(function(a,i){
    return '<div style="display:flex;align-items:center;gap:8px;background:var(--card2);border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:6px">'
      +'<span style="font-size:15px">📌</span><div style="flex:1;font-size:13px;color:var(--txt)">'+(a.texto||'')+'</div>'
      +'<button onclick="_igrejaForm.avisos.splice('+i+',1);renderIgrejaAvisos()" style="background:none;border:none;color:#ff5050;cursor:pointer;font-size:16px">✕</button></div>';
  }).join('');
}
function abrirCadastroIgreja(igreja){
  _igrejaForm={ id:null, capa:'', fotos:[], videos:[], avisos:[] };
  var g=igreja||{};
  document.getElementById('igr-id').value=g.id||'';
  document.getElementById('igr-nome').value=g.nome_igreja||'';
  document.getElementById('igr-cidade').value=g.cidade||'';
  document.getElementById('igr-endereco').value=g.endereco||'';
  document.getElementById('igr-responsavel').value=g.responsavel||'';
  document.getElementById('igr-whatsapp').value=g.whatsapp?('('+g.whatsapp.replace(/\D/g,'').replace(/^55/,'').slice(0,2)+') '+g.whatsapp.replace(/\D/g,'').replace(/^55/,'').slice(2)):'';
  _igrejaForm.id=g.id||null;
  _igrejaForm.capa=g.capa||'';
  _igrejaForm.fotos=Array.isArray(g.fotos)?g.fotos.slice():[];
  _igrejaForm.videos=Array.isArray(g.videos)?g.videos.slice():[];
  _igrejaForm.avisos=Array.isArray(g.avisos)?g.avisos.slice():[];
  document.getElementById('igr-form-titulo').textContent=g.id?'Editar igreja':'Divulgar igreja';
  document.getElementById('igr-btn-salvar').textContent=g.id?'Salvar alterações':'Publicar igreja';
  document.getElementById('igr-form-msg').textContent='';
  renderIgrejaCapaPrev(); renderIgrejaFotosPrev(); renderIgrejaVideos(); renderIgrejaAvisos();
  mostrarTela('tela-cadastro-igreja');
}
async function submitIgreja(){
  var nome=document.getElementById('igr-nome').value.trim();
  var msg=document.getElementById('igr-form-msg');
  if(!nome){ msg.style.color='#ff6b6b'; msg.textContent='Escreva o nome da igreja.'; return; }
  var btn=document.getElementById('igr-btn-salvar'); btn.disabled=true; var txt=btn.textContent; btn.textContent='Enviando…';
  var payload={
    id:_igrejaForm.id||undefined,
    nome_igreja:nome,
    cidade:document.getElementById('igr-cidade').value.trim(),
    endereco:document.getElementById('igr-endereco').value.trim(),
    responsavel:document.getElementById('igr-responsavel').value.trim(),
    whatsapp:document.getElementById('igr-whatsapp').value.replace(/\D/g,''),
    capa:_igrejaForm.capa, fotos:_igrejaForm.fotos, videos:_igrejaForm.videos, avisos:_igrejaForm.avisos
  };
  try{
    var r=await fetch('/api/igrejas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    var d=await r.json();
    if(d&&d.ok){ msg.style.color='var(--gold)'; msg.textContent='✅ Igreja publicada!'; setTimeout(abrirIgrejas,700); }
    else { msg.style.color='#ff6b6b'; msg.textContent='Não deu pra salvar. Tente de novo.'; }
  }catch(e){ msg.style.color='#ff6b6b'; msg.textContent='Erro de conexão. Tente de novo.'; }
  btn.disabled=false; btn.textContent=txt;
}
function abrirIgrejas(){ mostrarTela('tela-igrejas'); renderIgrejasPub(); }
async function renderIgrejasPub(){
  var box=document.getElementById('igrejas-lista');
  box.innerHTML='<div style="text-align:center;color:var(--sub);padding:30px">Carregando…</div>';
  try{
    var r=await fetch('/api/igrejas'); var d=await r.json();
    var lista=(d&&d.igrejas)||[];
    if(!lista.length){ box.innerHTML='<div style="text-align:center;color:var(--sub);padding:36px">Nenhuma igreja ainda.<br>Seja o primeiro a divulgar! 🙏</div>'; return; }
    box.innerHTML=lista.map(function(g){
      var av=Array.isArray(g.avisos)?g.avisos.length:0;
      return '<div onclick="abrirIgrejaDetalhe('+g.id+')" style="background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;margin-bottom:14px;cursor:pointer">'
        +(g.capa?'<img src="'+g.capa+'" style="width:100%;height:140px;object-fit:cover">':'<div style="height:90px;background:linear-gradient(135deg,#2563eb,#1e40af);display:flex;align-items:center;justify-content:center;font-size:34px">⛪</div>')
        +'<div style="padding:14px"><div style="font-weight:800;font-size:16px;color:var(--txt)">'+(g.nome_igreja||'')+'</div>'
        +(g.cidade?'<div style="font-size:12.5px;color:var(--gold);font-weight:600;margin-top:2px">📍 '+g.cidade+'</div>':'')
        +(g.responsavel?'<div style="font-size:12.5px;color:var(--sub);margin-top:2px">'+g.responsavel+'</div>':'')
        +(av?'<div style="display:inline-block;margin-top:8px;font-size:11.5px;background:rgba(37,99,235,.15);color:#7aa5f7;font-weight:700;padding:3px 10px;border-radius:999px">📌 '+av+' aviso'+(av!==1?'s':'')+'</div>':'')
        +'</div></div>';
    }).join('');
  }catch(e){ box.innerHTML='<div style="text-align:center;color:#ff6b6b;padding:30px">Erro ao carregar.</div>'; }
}
async function abrirIgrejaDetalhe(id){
  mostrarTela('tela-igreja-detalhe');
  var box=document.getElementById('igreja-detalhe');
  box.innerHTML='<div style="text-align:center;color:var(--sub);padding:40px">Carregando…</div>';
  try{
    var r=await fetch('/api/igrejas?id='+id); var d=await r.json(); var g=d&&d.igreja;
    if(!g){ box.innerHTML='<div style="text-align:center;color:var(--sub);padding:40px">Igreja não encontrada.</div>'; return; }
    document.getElementById('igr-det-titulo').textContent=g.nome_igreja||'Igreja';
    document.getElementById('igr-det-cidade').textContent=g.cidade||'';
    var fone=(g.whatsapp||'').replace(/\D/g,''); if(fone&&!fone.startsWith('55'))fone='55'+fone;
    var fotos=Array.isArray(g.fotos)?g.fotos:[]; var videos=Array.isArray(g.videos)?g.videos:[]; var avisos=Array.isArray(g.avisos)?g.avisos:[];
    var html='';
    if(g.capa) html+='<img src="'+g.capa+'" style="width:100%;height:190px;object-fit:cover">';
    html+='<div style="padding:16px">';
    html+='<div style="font-weight:900;font-size:20px;color:var(--txt);font-family:\'Playfair Display\',serif">'+(g.nome_igreja||'')+'</div>';
    if(g.cidade) html+='<div style="font-size:13px;color:var(--gold);font-weight:600;margin-top:4px">📍 '+g.cidade+'</div>';
    if(g.endereco) html+='<div style="font-size:13px;color:var(--sub);margin-top:2px">'+g.endereco+'</div>';
    if(g.responsavel) html+='<div style="font-size:13px;color:var(--sub);margin-top:6px">👤 '+g.responsavel+'</div>';
    if(fone) html+='<a href="https://wa.me/'+fone+'" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#25D366;color:#fff;font-weight:800;padding:13px;border-radius:14px;text-decoration:none;margin-top:14px">💬 Falar no WhatsApp</a>';
    if(avisos.length){
      html+='<div style="margin-top:20px;font-weight:800;color:var(--txt);font-size:15px">📌 Avisos</div>';
      html+=avisos.map(function(a){ return '<div style="background:var(--card2);border-left:3px solid var(--gold);border-radius:8px;padding:11px 12px;margin-top:8px;font-size:13.5px;color:var(--txt)">'+(a.texto||'')+'</div>'; }).join('');
    }
    if(videos.length){
      html+='<div style="margin-top:20px;font-weight:800;color:var(--txt);font-size:15px">🎬 Vídeos</div>';
      html+=videos.map(function(v){ var yid=ytId(v.url);
        return yid?'<div style="position:relative;padding-bottom:56%;height:0;margin-top:10px;border-radius:12px;overflow:hidden"><iframe src="https://www.youtube.com/embed/'+yid+'" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen loading="lazy"></iframe></div>'
          :'<a href="'+v.url+'" target="_blank" style="display:block;margin-top:10px;color:var(--gold);font-size:13px">▶ '+v.url+'</a>'; }).join('');
    }
    if(fotos.length){
      html+='<div style="margin-top:20px;font-weight:800;color:var(--txt);font-size:15px">🖼️ Fotos</div>';
      html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">'+fotos.map(function(f){ return '<img src="'+f+'" style="width:100%;height:120px;object-fit:cover;border-radius:10px">'; }).join('')+'</div>';
    }
    html+='<div style="height:24px"></div></div>';
    box.innerHTML=html;
  }catch(e){ box.innerHTML='<div style="text-align:center;color:#ff6b6b;padding:40px">Erro ao carregar.</div>'; }
}
async function renderIgrejasAdm(){
  var box=document.getElementById('igr-adm-lista'); if(!box) return;
  box.innerHTML='<div style="text-align:center;color:var(--sub);padding:30px">Carregando…</div>';
  try{
    var r=await fetch('/api/igrejas?token=radar-elias-2026'); var d=await r.json();
    var lista=(d&&d.igrejas)||[];
    document.getElementById('igr-adm-sub').textContent=lista.length+' igreja'+(lista.length!==1?'s':'');
    box.innerHTML='<button onclick="abrirCadastroIgreja()" style="width:100%;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;border-radius:14px;padding:13px;font-weight:800;font-family:inherit;cursor:pointer;margin-bottom:14px">➕ Nova igreja</button>';
    if(!lista.length){ box.innerHTML+='<div style="text-align:center;color:var(--sub);padding:30px">Nenhuma igreja cadastrada.</div>'; return; }
    box.innerHTML+=lista.map(function(g){
      var fone=(g.whatsapp||'').replace(/\D/g,''); var wa=fone?('https://wa.me/55'+fone.replace(/^55/,'')):'';
      var gj=JSON.stringify(g).replace(/'/g,'&#39;').replace(/"/g,'&quot;');
      return '<div style="background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:10px">'
        +'<div style="display:flex;align-items:center;gap:12px">'
        +(g.capa?'<img src="'+g.capa+'" style="width:48px;height:48px;object-fit:cover;border-radius:10px;flex-shrink:0">':'<div style="width:48px;height:48px;border-radius:10px;background:rgba(37,99,235,.18);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">⛪</div>')
        +'<div style="flex:1;min-width:0"><div style="font-weight:800;color:var(--txt);font-size:15px">'+(g.nome_igreja||'')+'</div>'
        +'<div style="font-size:12px;color:var(--gold)">'+(g.cidade||'')+'</div>'
        +'<div style="font-size:12px;color:var(--sub)">'+(g.responsavel||'')+'</div></div></div>'
        +'<div style="display:flex;gap:8px;margin-top:12px">'
        +(wa?'<a href="'+wa+'" target="_blank" style="flex:1;text-align:center;background:#25D366;color:#fff;font-size:13px;font-weight:800;padding:9px;border-radius:10px;text-decoration:none">💬 Recado</a>':'')
        +'<button onclick=\'editarIgreja('+g.id+')\' style="flex:1;background:rgba(201,161,74,.15);border:1px solid var(--line);color:var(--gold);font-size:13px;font-weight:800;padding:9px;border-radius:10px;cursor:pointer;font-family:inherit">✏️ Editar</button>'
        +'<button onclick="apagarIgreja('+g.id+',\''+((g.nome_igreja||'').replace(/\x27/g,''))+'\')" style="background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.3);color:#ff6b6b;font-size:15px;padding:9px 12px;border-radius:10px;cursor:pointer">🗑️</button>'
        +'</div></div>';
    }).join('');
    window._igrejasCache=lista;
  }catch(e){ box.innerHTML='<div style="text-align:center;color:#ff6b6b;padding:30px">Erro ao carregar.</div>'; }
}
function editarIgreja(id){
  var g=(window._igrejasCache||[]).find(function(x){return x.id===id;});
  if(g) abrirCadastroIgreja(g);
}
async function apagarIgreja(id,nome){
  if(!confirm('Apagar a igreja '+(nome||'')+'?')) return;
  try{
    var r=await fetch('/api/igrejas?token=radar-elias-2026&del='+id); var d=await r.json();
    if(d&&d.ok) renderIgrejasAdm(); else alert('Não deu pra apagar.');
  }catch(e){ alert('Erro ao apagar.'); }
}

// ══ MANUAIS E AFINS (estante de livros) ══════════════════════
const MANUAIS = [
  { id:'cerimonias', titulo:'Manual de Cerimônias', autor:'Temóteo Ramos de Oliveira',
    emoji:'⛪', cor:'#8b3a4a',
    desc:'Roteiros para casamento, funeral, batismo, ceia, ordenação e todas as cerimônias do obreiro.',
    arquivo:'/api/manual?id=cerimonias' },
  { id:'declaracao-fe', titulo:'Declaração de Fé', autor:'CPAD — Conselho de Doutrina',
    emoji:'📜', cor:'#1b3b6f', capa:'/capas/declaracao-fe.jpg',
    desc:'A Declaração de Fé das Assembleias de Deus no Brasil — 25 capítulos com as doutrinas bíblicas.',
    arquivo:'/api/manual?id=declaracao-fe' }
];
let _manualAtual = null, _manualToc = [], _manualSecoes = [], _manualIndiceHtml = '', _manualView = 'indice';

function abrirManuais(){ mostrarTela('tela-manuais'); renderManuais(); }
function renderManuais(){
  // Manual de Cerimônias e Declaração de Fé saíram daqui → vão pro Meu Estudo (livros particulares)
  var itens=[];
  itens.push({onclick:"location.href='/biblioteca/biblias/'", titulo:'Bíblias', autor:'A Palavra pra ler', capa:'/biblioteca/biblias/biblia-icone2.png', emoji:'📖', cor:'#8b6a1e'});
  itens.push({onclick:"location.href='/biblioteca/sermoes/'", titulo:'Sermões', autor:'Escavador de Pérolas', emoji:'📜', cor:'#0f6d78'});
  itens.push({onclick:"location.href='/biblioteca/mensagens/'", titulo:'Mensagens', autor:'Sermões em prosa', emoji:'🔥', cor:'#8a1c1c'});
  itens.push({onclick:"location.href='/biblioteca/concilio/'", titulo:'Concílio', autor:'42 expositores + Lupa', emoji:'📖', cor:'#0f3d5c'});
  itens.push({onclick:"location.href='/biblioteca/escola-pregacao/'", titulo:'Escola de Pregação', autor:'Curso + unção', emoji:'🎓', cor:'#a9791c'});
  itens.push({onclick:"location.href='/biblioteca/livros/'", titulo:'Livros', autor:'Biblioteca do obreiro', emoji:'📚', cor:'#2f6b4f'});
  itens.push({onclick:"location.href='/biblioteca/estudo/'", titulo:'Meu Estudo', autor:'Privado · senha', emoji:'🔒', cor:'#5b3a1a'});
  var box=document.getElementById('manuais-lista');
  box.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">'+itens.map(function(m){
    var capa = m.capa
      ? '<img src="'+m.capa+'" style="width:100%;height:70px;object-fit:cover;border-radius:10px;box-shadow:0 3px 10px rgba(0,0,0,.22)" onerror="this.outerHTML=\'<div style=&quot;width:100%;height:70px;border-radius:10px;background:linear-gradient(135deg,'+m.cor+',#20122a);display:flex;align-items:center;justify-content:center;font-size:30px&quot;>'+m.emoji+'</div>\'">'
      : '<div style="width:100%;height:70px;border-radius:10px;background:linear-gradient(135deg,'+m.cor+',#20122a);display:flex;align-items:center;justify-content:center;font-size:30px">'+m.emoji+'</div>';
    return '<div onclick="'+m.onclick+'" style="background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:7px;cursor:pointer;box-shadow:0 2px 8px rgba(15,61,92,.06)">'
      +capa
      +'<div style="font-weight:800;font-size:12.5px;color:#0f3d5c;font-family:\'Playfair Display\',serif;margin-top:6px;line-height:1.15">'+m.titulo+'</div>'
      +'<div style="font-size:10.5px;color:#8a6a2f;margin-top:1px;line-height:1.15">'+m.autor+'</div></div>';
  }).join('')+'</div>';
}
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _pHtml(t){ return '<p style="margin:0 0 15px;text-align:justify;-webkit-hyphens:auto;hyphens:auto">'+esc(t)+'</p>'; }
function _liHtml(t){ return '<div style="display:flex;gap:9px;margin:0 0 9px;text-align:left"><span style="color:#8a6a2f;font-weight:700">•</span><span>'+esc(t)+'</span></div>'; }
function _headHtml(niv,txt){
  if(niv>=3) return '<h3 style="font-family:Lora,Georgia,serif;font-size:18px;font-weight:700;color:#8a6a2f;margin:20px 0 10px">'+esc(txt)+'</h3>';
  return '<h2 style="font-family:Lora,Georgia,serif;font-size:22px;font-weight:800;color:#6b4a1e;margin:4px 0 15px;padding-bottom:9px;border-bottom:2px solid #e5dcc8">'+esc(txt)+'</h2>';
}
function parseManual(md){
  md=md.replace(/^---[\s\S]*?---\s*/, '');
  var linhas=md.split(/\r?\n/), itens=[], buf=[];
  function flush(){ if(buf.length){ itens.push({k:'p',html:_pHtml(buf.join(' '))}); buf=[]; } }
  for(var i=0;i<linhas.length;i++){
    var L=linhas[i].trim();
    if(!L){ flush(); continue; }
    if(/\.{6,}/.test(L)){ flush(); continue; }
    var mH=L.match(/^(#{1,3})\s+(.*)$/);
    if(mH){ flush(); var niv=mH[1].length, txt=mH[2].trim();
      if(/^r?índice$/i.test(txt)||/^cpc$/i.test(txt)) continue;
      itens.push({k:'h',nivel:niv,txt:txt}); continue; }
    if(/^[-•]\s+/.test(L)){ flush(); itens.push({k:'li',html:_liHtml(L.replace(/^[-•]\s+/,''))}); continue; }
    buf.push(L);
  }
  flush();
  var toc=[], secoes=[], hpos=[];
  for(var j=0;j<itens.length;j++) if(itens[j].k==='h') hpos.push(j);
  for(var a=0;a<hpos.length;a++){
    var start=hpos[a], h=itens[start], end=itens.length;
    for(var b=a+1;b<hpos.length;b++){ if(itens[hpos[b]].nivel<=h.nivel){ end=hpos[b]; break; } }
    var parts=[ _headHtml(h.nivel,h.txt) ];
    for(var c=start+1;c<end;c++){ var it=itens[c]; parts.push(it.k==='h'?_headHtml(it.nivel,it.txt):it.html); }
    toc.push({txt:h.txt, sub:(h.nivel>=3)});
    secoes.push(parts.join('\n'));
  }
  return {toc:toc, secoes:secoes};
}
function montarIndiceManual(){
  return '<div style="background:#fff;border:1px solid #e5dcc8;border-radius:12px;padding:16px 18px;box-shadow:0 2px 8px rgba(0,0,0,.05)">'
    +'<div style="font-family:Lora,Georgia,serif;font-size:19px;color:#6b4a1e;font-weight:800;margin-bottom:6px;text-align:center">📖 Índice</div>'
    +'<div style="text-align:center;color:#9a8a6a;font-size:12px;margin-bottom:14px">Toque no capítulo para ler</div>'
    +_manualToc.map(function(t,k){
        return '<div onclick="abrirCapitulo('+k+')" style="cursor:pointer;color:#1d4ed8;text-decoration:underline;text-underline-offset:3px;font-size:'+(t.sub?'15px':'16.5px')+';font-weight:'+(t.sub?'500':'700')+';padding:'+(t.sub?'9px 0 9px 20px':'11px 0')+';border-bottom:1px solid #efe8d8;display:flex;align-items:center;gap:8px">'+(t.sub?'<span style="text-decoration:none;color:#9a8a6a">↳</span>':'<span style="text-decoration:none">🔗</span>')+'<span>'+esc(t.txt)+'</span></div>';
      }).join('')
    +'</div>';
}
function abrirCapitulo(k){
  if(k<0||k>=_manualSecoes.length) return;
  _manualView='capitulo';
  var voltar='<button onclick="voltarIndiceManual()" style="display:inline-flex;align-items:center;gap:6px;background:#6b4a1e;color:#fff;border:none;border-radius:999px;padding:9px 16px;font-size:13.5px;font-weight:800;font-family:inherit;cursor:pointer;margin-bottom:18px">← Índice</button>';
  var voltarBaixo='<div style="margin-top:24px"><button onclick="voltarIndiceManual()" style="width:100%;background:#fff;color:#6b4a1e;border:1px solid #e5dcc8;border-radius:12px;padding:13px;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer">← Voltar ao índice</button></div>';
  document.getElementById('manual-conteudo').innerHTML=voltar+_manualSecoes[k]+voltarBaixo;
  var sc=document.querySelector('#tela-manual-leitor .dash-scroll');
  if(sc) sc.scrollTop=0;
  var fab=document.getElementById('man-fab-top'); if(fab) fab.style.display='none';
}
function voltarIndiceManual(){
  _manualView='indice';
  document.getElementById('manual-conteudo').innerHTML=_manualIndiceHtml;
  var sc=document.querySelector('#tela-manual-leitor .dash-scroll');
  if(sc) sc.scrollTop=0;
  var fab=document.getElementById('man-fab-top'); if(fab) fab.style.display='none';
}
function voltarLeitor(){ if(_manualView==='capitulo') voltarIndiceManual(); else abrirManuais(); }
async function abrirManual(id){
  var m=MANUAIS.find(function(x){return x.id===id;}); if(!m) return;
  _manualAtual=m;
  document.getElementById('man-titulo').textContent=m.titulo;
  document.getElementById('man-autor').textContent=m.autor;
  var box=document.getElementById('manual-conteudo');
  box.innerHTML='<div style="text-align:center;color:#9a8a6a;padding:40px">Abrindo o manual…</div>';
  mostrarTela('tela-manual-leitor');
  var sc=document.querySelector('#tela-manual-leitor .dash-scroll');
  sc.scrollTop=0;
  var fab=document.getElementById('man-fab-top');
  if(fab) fab.style.display='none';
  sc.onscroll=function(){ if(!fab)return; fab.style.display = (sc.scrollTop > window.innerHeight*2.5) ? 'block' : 'none'; };
  try{
    var r=await fetch(m.arquivo); var t=await r.text();
    var d=parseManual(t);
    _manualToc=d.toc; _manualSecoes=d.secoes;
    _manualIndiceHtml=montarIndiceManual();
    voltarIndiceManual();
  }catch(e){ box.innerHTML='<div style="text-align:center;color:#ff6b6b;padding:40px">Não deu pra abrir. Tente de novo.</div>'; }
}
function manualTopo(){
  var sc=document.querySelector('#tela-manual-leitor .dash-scroll');
  if(sc) sc.scrollTo({top:0,behavior:'smooth'});
  var fab=document.getElementById('man-fab-top'); if(fab) fab.style.display='none';
}
function compartilharManual(id){
  var m=MANUAIS.find(function(x){return x.id===id;}); if(!m) return;
  var txt='📚 *'+m.titulo+'* — '+m.autor+'\n'+m.desc+'\n\nLeia no app RADAR:\nhttps://radar-atual.vercel.app';
  if(navigator.share){ navigator.share({title:m.titulo,text:txt}).catch(function(){}); }
  else { window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank'); }
}
function compartilharManualAtual(){ if(_manualAtual) compartilharManual(_manualAtual.id); }

// ── ANALYTICS / TRACKING ──────────────────────────────────
function trackVisit(modulo,grupo,rotulo){
  try{
    const visits=JSON.parse(localStorage.getItem('radar_visits')||'[]');
    visits.push({m:modulo,t:Date.now()});
    // manter só 500 mais recentes
    if(visits.length>500)visits.splice(0,visits.length-500);
    localStorage.setItem('radar_visits',JSON.stringify(visits));
  }catch(e){}
  // CONTAGEM GLOBAL (todos os usuários) — fire-and-forget, nunca trava o app; ignora ações de admin
  try{
    if(modulo && modulo.indexOf('admin_')!==0){
      var u='/api/hit?k='+encodeURIComponent(modulo)
        +(grupo?'&g='+encodeURIComponent(grupo):'')
        +(rotulo?'&r='+encodeURIComponent(rotulo):'');
      if(navigator.sendBeacon){ navigator.sendBeacon(u); }
      else { fetch(u,{keepalive:true}).catch(function(){}); }
    }
  }catch(e){}
}

// ── DASHBOARD ─────────────────────────────────────────────
function renderAdmDashboard(){
  const vis=getVisitantes();
  const alunos=JSON.parse(localStorage.getItem('ebd_alunos')||'[]');
  const evs=JSON.parse(localStorage.getItem('radar_eventos')||'[]');
  const visits=JSON.parse(localStorage.getItem('radar_visits')||'[]');

  const semContato=vis.filter(v=>v.status==='sem_contato').length;
  const retornaram=vis.filter(v=>v.status==='retornou').length;
  const ativos=vis.filter(v=>v.status==='ativo').length;

  // top módulos
  const contagem={};
  visits.forEach(v=>{if(!v.m.startsWith('admin_'))contagem[v.m]=(contagem[v.m]||0)+1;});
  const top=Object.entries(contagem).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxTop=top[0]?top[0][1]:1;

  const nomeModulo=m=>({
    biblia:'Bíblia',harpa:'Harpa Cristã',ebd:'EBD',eventos:'Eventos',
    noticias:'Notícias','yt-player':'Vídeos',cadastro:'Cadastro'
  }[m]||m);

  // log de atividade recente
  const recentes=visits.slice(-10).reverse();
  const logHTML=recentes.length?recentes.map(v=>{
    const d=new Date(v.t);
    const hora=d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');
    return `<div class="dash-log-item"><div class="dash-log-ico">📱</div><div class="dash-log-body"><div class="dash-log-txt">${nomeModulo(v.m)}</div><div class="dash-log-when">${hora}</div></div></div>`;
  }).join(''):'<div style="color:var(--sub);font-size:12px;padding:8px 0">Nenhuma atividade registrada ainda.</div>';

  const topHTML=top.length?top.map(([m,c])=>`
    <div class="dash-rank-item">
      <span style="font-size:12px;width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nomeModulo(m)}</span>
      <div class="dash-rank-bar-wrap"><div class="dash-rank-bar" style="width:${Math.round(c/maxTop*100)}%"></div></div>
      <span class="dash-rank-val">${c}</span>
    </div>`).join(''):'<div style="color:var(--sub);font-size:12px">Ainda sem dados</div>';

  const evsFut=evs.filter(e=>new Date(e.data)>=new Date());

  document.getElementById('dash-scroll-content').innerHTML=`
    <div class="dash-row">
      <div class="dash-card verde">
        <div class="dash-card-icon">👤</div>
        <div class="dash-card-num">${vis.length}</div>
        <div class="dash-card-lbl">Total visitantes</div>
      </div>
      <div class="dash-card">
        <div class="dash-card-icon">🔄</div>
        <div class="dash-card-num">${retornaram}</div>
        <div class="dash-card-lbl">Retornaram</div>
      </div>
    </div>
    <div class="dash-row">
      <div class="dash-card ${semContato>0?'alerta':''}">
        <div class="dash-card-icon">⚠️</div>
        <div class="dash-card-num">${semContato}</div>
        <div class="dash-card-lbl">Sem contato</div>
      </div>
      <div class="dash-card">
        <div class="dash-card-icon">🎯</div>
        <div class="dash-card-num">${ativos}</div>
        <div class="dash-card-lbl">Em acompanhamento</div>
      </div>
    </div>
    <div class="dash-row">
      <div class="dash-card">
        <div class="dash-card-icon">👥</div>
        <div class="dash-card-num">${alunos.length}</div>
        <div class="dash-card-lbl">Alunos EBD</div>
      </div>
      <div class="dash-card">
        <div class="dash-card-icon">📅</div>
        <div class="dash-card-num">${evsFut.length}</div>
        <div class="dash-card-lbl">Eventos futuros</div>
      </div>
    </div>
    <div class="dash-card full" style="margin-bottom:8px">
      <div style="font-size:11px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:var(--sub);margin-bottom:8px">📊 Módulos mais acessados</div>
      <div class="dash-rank">${topHTML}</div>
    </div>
    <div class="dash-card full" style="margin-bottom:8px">
      <div style="font-size:11px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:var(--sub);margin-bottom:8px">⏱️ Atividade recente</div>
      <div class="dash-log">${logHTML}</div>
    </div>
    <div style="text-align:center;font-size:10px;color:var(--sub);padding:8px 0 16px">Dados salvos localmente · ${visits.length} eventos registrados</div>
  `;
}

// ══ VISITANTES CRUD ═══════════════════════════════════════

let _visFiltroCurrent='todos';
let _visEditId=null;

function getVisitantes(){
  return JSON.parse(localStorage.getItem('radar_visitantes')||'[]');
}
function setVisitantes(arr){
  localStorage.setItem('radar_visitantes',JSON.stringify(arr));
}

function filtrarVisitantes(btn){
  document.querySelectorAll('.vis-chip').forEach(c=>c.classList.remove('ativa'));
  btn.classList.add('ativa');
  _visFiltroCurrent=btn.dataset.status;
  renderVisitantes();
}

function renderVisitantes(){
  const lista=document.getElementById('vis-lista');
  const busca=(document.getElementById('vis-search')?.value||'').toLowerCase();
  let vis=getVisitantes();
  if(_visFiltroCurrent!=='todos') vis=vis.filter(v=>v.status===_visFiltroCurrent);
  if(busca) vis=vis.filter(v=>(v.nome||'').toLowerCase().includes(busca)||(v.fone||'').includes(busca));

  if(!vis.length){
    lista.innerHTML=`<div class="vis-empty"><div style="font-size:40px;opacity:.3">👤</div><div>${_visFiltroCurrent==='todos'&&!busca?'Nenhum visitante cadastrado ainda.':'Nenhum resultado encontrado.'}</div></div>`;
    return;
  }

  const statusLabel={ativo:'Em acompanhamento',retornou:'Retornou',sem_contato:'Sem contato',arquivado:'Arquivado'};
  lista.innerHTML=vis.map(v=>`
    <div class="vis-card" onclick="editarVisitante('${v.id}')">
      <div class="vis-avatar">${(v.nome||'?')[0].toUpperCase()}</div>
      <div class="vis-info">
        <div class="vis-nome">${v.nome||'—'}</div>
        <div class="vis-meta">${v.fone||'Sem telefone'}${v.responsavel?' · '+v.responsavel:''}</div>
        <span class="vis-status ${v.status||'ativo'}">${statusLabel[v.status]||'Ativo'}</span>
      </div>
    </div>
  `).join('');
}

function abrirModalVisitante(){
  _visEditId=null;
  document.getElementById('mvis-label').textContent='Novo Visitante';
  document.getElementById('mvis-nome').value='';
  document.getElementById('mvis-fone').value='';
  document.getElementById('mvis-data').value=new Date().toISOString().split('T')[0];
  document.getElementById('mvis-origem').value='';
  document.getElementById('mvis-status').value='ativo';
  document.getElementById('mvis-responsavel').value='';
  document.getElementById('mvis-obs').value='';
  document.getElementById('mvis-btn-del').style.display='none';
  document.getElementById('mvis-btn-wpp').style.display='none';
  document.getElementById('modal-visitante').classList.add('open');
}

function editarVisitante(id){
  const vis=getVisitantes();
  const v=vis.find(x=>x.id===id);
  if(!v)return;
  _visEditId=id;
  document.getElementById('mvis-label').textContent='Editar Visitante';
  document.getElementById('mvis-nome').value=v.nome||'';
  document.getElementById('mvis-fone').value=v.fone||'';
  document.getElementById('mvis-data').value=v.dataVisita||'';
  document.getElementById('mvis-origem').value=v.origem||'';
  document.getElementById('mvis-status').value=v.status||'ativo';
  document.getElementById('mvis-responsavel').value=v.responsavel||'';
  document.getElementById('mvis-obs').value=v.obs||'';
  document.getElementById('mvis-btn-del').style.display='block';
  document.getElementById('mvis-btn-wpp').style.display=v.fone?'block':'none';
  document.getElementById('modal-visitante').classList.add('open');
}

function fecharModalVisitante(){
  document.getElementById('modal-visitante').classList.remove('open');
  _visEditId=null;
}

function salvarVisitante(){
  const nome=document.getElementById('mvis-nome').value.trim();
  if(!nome){document.getElementById('mvis-nome').focus();return;}
  const vis=getVisitantes();
  const obj={
    id:_visEditId||(Date.now().toString(36)+Math.random().toString(36).slice(2,6)),
    nome,
    fone:document.getElementById('mvis-fone').value.trim(),
    dataVisita:document.getElementById('mvis-data').value,
    origem:document.getElementById('mvis-origem').value,
    status:document.getElementById('mvis-status').value,
    responsavel:document.getElementById('mvis-responsavel').value.trim(),
    obs:document.getElementById('mvis-obs').value.trim(),
    updatedAt:Date.now()
  };
  if(_visEditId){
    const idx=vis.findIndex(x=>x.id===_visEditId);
    if(idx>=0)vis[idx]=obj;
  }else{
    obj.createdAt=Date.now();
    vis.push(obj);
  }
  setVisitantes(vis);
  fecharModalVisitante();
  renderVisitantes();
  // atualizar contador no menu
  document.getElementById('adm-cnt-visitantes').textContent=vis.length+' cadastrado'+(vis.length!==1?'s':'');
}

function deletarVisitante(){
  if(!_visEditId)return;
  if(!confirm('Excluir este visitante?'))return;
  const vis=getVisitantes().filter(x=>x.id!==_visEditId);
  setVisitantes(vis);
  fecharModalVisitante();
  renderVisitantes();
  document.getElementById('adm-cnt-visitantes').textContent=vis.length+' cadastrado'+(vis.length!==1?'s':'');
}

function whatsappVisitante(){
  const fone=document.getElementById('mvis-fone').value.trim().replace(/\D/g,'');
  if(fone) window.open('https://wa.me/55'+fone,'_blank');
}

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(function(reg){
    reg.update();
    setInterval(function(){ reg.update(); }, 60000); // checa versão nova a cada 1 min
    function ativar(w){ w&&w.addEventListener('statechange',function(){
      if(w.state==='installed' && navigator.serviceWorker.controller){ w.postMessage({type:'SKIP_WAITING'}); }
    }); }
    if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
    reg.addEventListener('updatefound',function(){ ativar(reg.installing); });
  }).catch(function(){});
  navigator.serviceWorker.addEventListener('controllerchange',function(){
    // trava por SESSÃO (sobrevive ao reload) — impede LOOP de recarregar que travava o app
    try{ if(sessionStorage.getItem('_swReloaded')==='1') return; sessionStorage.setItem('_swReloaded','1'); }catch(e){}
    location.reload();
  });
  // reforço: checa versão nova toda vez que o app volta pro primeiro plano
  document.addEventListener('visibilitychange',function(){ if(!document.hidden){ navigator.serviceWorker.getRegistration().then(function(r){ if(r) r.update(); }); } });
}

// ===== INSTALAR O APP — convite aparece SÓ quando dá pra instalar (não fica flutuando) =====
(function(){
  var deferred=null;
  function jaInstalado(){ try{ return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone===true; }catch(e){ return false; } }
  function fechar(){ var b=document.getElementById('inst-banner'); if(b) b.remove(); localStorage.setItem('inst_dispensado','1'); }
  window.dispensarInstalar=fechar;
  function banner(html){
    if(document.getElementById('inst-banner')||jaInstalado()||localStorage.getItem('inst_dispensado')==='1') return;
    var b=document.createElement('div'); b.id='inst-banner';
    b.style.cssText='position:fixed;left:10px;right:10px;bottom:calc(74px + env(safe-area-inset-bottom));z-index:100000;background:linear-gradient(135deg,#0f6d78,#0f3d5c);color:#fff;border:2px solid #f5c842;border-radius:14px;padding:11px 12px;display:flex;gap:10px;align-items:center;box-shadow:0 8px 22px rgba(0,0,0,.45)';
    b.innerHTML=html; document.body.appendChild(b);
  }
  window.instalarApp=function(){ if(deferred){ deferred.prompt(); deferred.userChoice.then(function(){ deferred=null; var b=document.getElementById('inst-banner'); if(b) b.remove(); }); } };
  window.addEventListener('beforeinstallprompt',function(e){
    e.preventDefault(); deferred=e;
    banner('<span style="font-size:22px">📲</span><div style="flex:1;font-size:13px;line-height:1.3"><b>Instale o RADAR</b> no seu celular — abre igual app, sem navegador.</div><button onclick="instalarApp()" style="background:#f5c842;color:#20160a;border:none;border-radius:9px;padding:8px 13px;font-weight:800;font-family:inherit;cursor:pointer;flex-shrink:0">Instalar</button><button onclick="dispensarInstalar()" style="background:transparent;color:#cfe0e8;border:none;font-size:18px;cursor:pointer;flex-shrink:0">✕</button>');
  });
  window.addEventListener('appinstalled',function(){ var b=document.getElementById('inst-banner'); if(b) b.remove(); localStorage.setItem('inst_dispensado','1'); });
  // iPhone (Safari não dispara o evento): dica só se não estiver instalado
  setTimeout(function(){
    if(/iphone|ipad|ipod/i.test(navigator.userAgent) && !jaInstalado())
      banner('<span style="font-size:22px">📲</span><div style="flex:1;font-size:12.5px;line-height:1.3">Pra instalar: toque em <b>Compartilhar</b> e depois <b>“Adicionar à Tela de Início”</b>.</div><button onclick="dispensarInstalar()" style="background:transparent;color:#cfe0e8;border:none;font-size:18px;cursor:pointer;flex-shrink:0">✕</button>');
  }, 3500);
})();

// ══════════════════════════════════════════════════════════
// CAROUSEL HOME
// ══════════════════════════════════════════════════════════

function getCarouselCards(){
  return JSON.parse(localStorage.getItem('radar_carousel')||'[]');
}
// ── VÍDEOS: visualizações + compartilhar + baixar ──
function getViews(){ try{ return JSON.parse(localStorage.getItem('radar_views'))||{}; }catch(e){ return {}; } }
var _viewedSession={};
function bumpView(id){
  if(!id || _viewedSession[id]) return;   // conta 1x por vídeo a cada abertura do app
  _viewedSession[id]=1;
  var v=getViews(); v[id]=(v[id]||0)+1;
  try{ localStorage.setItem('radar_views', JSON.stringify(v)); }catch(e){}
  var el=document.getElementById('views-'+id); if(el) el.textContent=v[id];
}
function shareVid(u){
  var url=location.origin+u;
  if(navigator.share){ navigator.share({title:'RADAR SEMANAL', text:'Olha esse vídeo 🙏', url:url}).catch(function(){}); }
  else if(navigator.clipboard){ navigator.clipboard.writeText(url).then(function(){ alert('Link copiado ✓'); }); }
}
function baixarVid(u,nome){
  var a=document.createElement('a'); a.href=u; a.download=nome||'video.mp4'; a.rel='noopener';
  document.body.appendChild(a); a.click(); a.remove();
}
// semeia os 6 cartazes da EBD no carrossel — 1 vez só, sem apagar cards que já existam
function seedVideoInicio(){
  if(localStorage.getItem('radar_seed_vidinicio_v1')) return;
  var base=getCarouselCards();
  if(!base.some(function(c){return c.id==='vid-inicio';})){
    base.unshift({id:'vid-inicio',tipo:'mp4',video:'/carousel/video-inicio.mp4',titulo:'',ativo:true}); // vai pro começo
    setCarouselCards(base);
  }
  localStorage.setItem('radar_seed_vidinicio_v1','1');
}
// vídeo MONTE CARMELO no começo do carrossel (1x só, não apaga o resto)
function seedVideoMonteCarmelo(){
  if(localStorage.getItem('radar_seed_montecarmelo_v1')) return;
  var base=getCarouselCards();
  if(!base.some(function(c){return c.id==='vid-montecarmelo';})){
    base.unshift({id:'vid-montecarmelo',tipo:'mp4',video:'/carousel/monte-carmelo.mp4',titulo:'',ativo:true}); // vai pro começo
    setCarouselCards(base);
  }
  localStorage.setItem('radar_seed_montecarmelo_v1','1');
}
// vídeo LEITURA BÍBLICA EM CLASSE no começo do carrossel (1x só, não apaga o resto)
function seedVideoLeitura(){
  if(localStorage.getItem('radar_seed_leitura_v1')) return;
  var base=getCarouselCards();
  if(!base.some(function(c){return c.id==='vid-leitura';})){
    base.unshift({id:'vid-leitura',tipo:'mp4',video:'/carousel/leitura-classe.mp4',titulo:'',ativo:true}); // vai pro começo
    setCarouselCards(base);
  }
  localStorage.setItem('radar_seed_leitura_v1','1');
}
// cartaz 7 no começo do carrossel (1x só, não apaga o resto)
function seedCartaz7(){
  if(localStorage.getItem('radar_seed_cartaz7_v1')) return;
  var base=getCarouselCards();
  if(!base.some(function(c){return c.id==='cartaz-7';})){
    base.unshift({id:'cartaz-7',tipo:'imagem',imagem:'/carousel/7.jpg',titulo:'',link:'',ativo:true}); // vai pro começo
    setCarouselCards(base);
  }
  localStorage.setItem('radar_seed_cartaz7_v1','1');
}
// cartaz 8 no começo do carrossel (1x só, não apaga o resto)
function seedCartaz8(){
  if(localStorage.getItem('radar_seed_cartaz8_v1')) return;
  var base=getCarouselCards();
  if(!base.some(function(c){return c.id==='cartaz-8';})){
    base.unshift({id:'cartaz-8',tipo:'imagem',imagem:'/carousel/8.jpg',titulo:'',link:'',ativo:true}); // vai pro começo
    setCarouselCards(base);
  }
  localStorage.setItem('radar_seed_cartaz8_v1','1');
}
// cartazes 9 e 10 no começo do carrossel (1x só, não apaga o resto)
function seedCartaz910(){
  if(localStorage.getItem('radar_seed_cartaz910_v1')) return;
  var base=getCarouselCards();
  var add=[];
  if(!base.some(function(c){return c.id==='cartaz-9';}))  add.push({id:'cartaz-9', tipo:'imagem',imagem:'/carousel/9.jpg', titulo:'',link:'',ativo:true});
  if(!base.some(function(c){return c.id==='cartaz-10';})) add.push({id:'cartaz-10',tipo:'imagem',imagem:'/carousel/10.jpg',titulo:'',link:'',ativo:true});
  if(add.length){ base.unshift.apply(base, add); setCarouselCards(base); } // vão pro começo (9,10,...)
  localStorage.setItem('radar_seed_cartaz910_v1','1');
}
// 🗑️ deixa SÓ o vídeo da Leitura Bíblica em Classe no carrossel (tira vídeos e cartazes antigos). 1x só.
function soLeitura(){
  if(localStorage.getItem('radar_solo_leitura_v2')) return;
  var base=getCarouselCards();
  var limpo=base.filter(function(c){ return c.id==='vid-leitura'; });
  if(!limpo.length) limpo=[{id:'vid-leitura',tipo:'mp4',video:'/carousel/leitura-classe.mp4',titulo:'',ativo:true}];
  if(limpo.length!==base.length){ setCarouselCards(limpo); try{ localStorage.setItem('radar_novidade_sig', novidadeSig()); }catch(_){} } // não alarmar "novidade" por remoção
  localStorage.setItem('radar_solo_leitura_v2','1');
}
// 🎵 deixa SÓ os 7 vídeos de louvor no carrossel (apaga os antigos). 1x só.
function soLouvores(){
  if(localStorage.getItem('radar_solo_louvores_v1')) return;
  var novos=[];
  for(var n=1;n<=7;n++){ novos.push({id:'louvor-'+n,tipo:'mp4',video:'/carousel/louvor'+n+'.mp4',titulo:'',ativo:true}); }
  setCarouselCards(novos);   // substitui tudo pelos 7 louvores
  try{ localStorage.setItem('radar_novidade_sig', novidadeSig()); }catch(_){} // não alarmar "novidade" pela troca
  localStorage.setItem('radar_solo_louvores_v1','1');
}
// ➕ adiciona 5 vídeos (louvor8..12) + 10 imagens (foto1..10) ao carrossel (1x só)
function seedMais5e10(){
  if(localStorage.getItem('radar_seed_mais_v1')) return;
  var base=getCarouselCards();
  var has=function(id){ return base.some(function(c){return c.id===id}); };
  for(var v=8;v<=12;v++){ if(!has('louvor-'+v)) base.push({id:'louvor-'+v,tipo:'mp4',video:'/carousel/louvor'+v+'.mp4',titulo:'',ativo:true}); }
  for(var f=1;f<=10;f++){ if(!has('foto-'+f)) base.push({id:'foto-'+f,tipo:'imagem',imagem:'/carousel/foto'+f+'.jpg',titulo:'',link:'',ativo:true}); }
  setCarouselCards(base);
  localStorage.setItem('radar_seed_mais_v1','1');
}
// 🗑️ remove as imagens de lição/eventos que já passaram (foto1-10 + cartaz 1-10). Roda sempre, idempotente.
function limparLicaoDomingo(){
  var rem={}; for(var f=1;f<=10;f++){ rem['foto-'+f]=1; rem['cartaz-'+f]=1; }
  var base=getCarouselCards();
  var limpo=base.filter(function(c){
    if(rem[c.id]) return false;
    if(/\/carousel\/(?:foto)?(?:[1-9]|10)\.jpg$/.test(c.imagem||'')) return false;
    return true;
  });
  if(limpo.length!==base.length){
    setCarouselCards(limpo);
    try{ localStorage.setItem('radar_novidade_sig', novidadeSig()); }catch(_){}   // não alarmar "novidade" por remoção
  }
  // trava os seeds pra não readicionarem em aparelho novo
  try{ localStorage.setItem('radar_seed_mais_v1','1');
       localStorage.setItem('radar_seed_cartaz7_v1','1');
       localStorage.setItem('radar_seed_cartaz8_v1','1');
       localStorage.setItem('radar_seed_cartaz910_v1','1'); }catch(_){}
}
// 🎵 adiciona os 7 vídeos de louvor ao carrossel (1x só, sem duplicar)
function seedLouvores(){
  if(localStorage.getItem('radar_seed_louvores_v1')) return;
  var base=getCarouselCards();
  for(var n=1;n<=7;n++){
    var id='louvor-'+n;
    if(!base.some(function(c){return c.id===id;})){
      base.push({id:id,tipo:'mp4',video:'/carousel/louvor'+n+'.mp4',titulo:'',ativo:true});
    }
  }
  setCarouselCards(base);   // não mexe na sig: são conteúdos novos → dispara "NOVIDADE" de propósito
  localStorage.setItem('radar_seed_louvores_v1','1');
}

// 🔔 NOVIDADE — avisa (apito + banner) quando sai conteúdo novo (cartaz/vídeo/evento)
function novidadeSig(){
  var ids=getCarouselCards().map(function(c){return c.id;}).sort().join(',');
  var ev=[]; try{ ev=(JSON.parse(localStorage.getItem('radar_eventos')||'[]')).map(function(e){return e.id;}).sort(); }catch(_){}
  return ids+'||'+ev.join(',');
}
function apitarNovidade(){
  try{ if(navigator.vibrate) navigator.vibrate([130,70,130]); }catch(_){}
  var done=false;
  function play(){ if(done) return; try{
    var C=window.AudioContext||window.webkitAudioContext; if(!C) return;
    var ctx=new C();
    [[880,0,.18],[1245,.20,.32]].forEach(function(s){
      var o=ctx.createOscillator(),g=ctx.createGain(); o.type='triangle'; o.frequency.value=s[0];
      o.connect(g); g.connect(ctx.destination); var t=ctx.currentTime+s[1];
      g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.35,t+.02);
      g.gain.exponentialRampToValueAtTime(.0001,t+s[2]); o.start(t); o.stop(t+s[2]+.03);
    });
    done=true;
  }catch(_){} }
  play(); // tenta na hora
  // se o navegador bloqueou o som sem toque, apita no 1º toque na tela
  document.addEventListener('pointerdown',function h(){ document.removeEventListener('pointerdown',h); play(); },{once:true});
}
function mostrarNovidade(){
  apitarNovidade();
  if(!document.getElementById('nv-style')){
    var st=document.createElement('style'); st.id='nv-style';
    st.textContent='.nv-toast{position:fixed;left:12px;right:88px;bottom:96px;max-width:420px;margin:0 auto;transform:translateY(220%);z-index:99999;display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:16px;background:linear-gradient(90deg,#C8A24A,#F2D98A);color:#241a0a;box-shadow:0 14px 36px rgba(0,0,0,.5);font-family:Inter,system-ui,sans-serif;transition:transform .5s cubic-bezier(.34,1.56,.64,1)}.nv-toast.show{transform:translateY(0)}.nv-toast .nvic{font-size:28px;animation:nvring .7s ease-in-out 3}.nv-toast b{font-size:17px;font-weight:800;display:block;line-height:1.1}.nv-toast small{font-size:13px;font-weight:600;opacity:.85}.nv-toast .nvx{margin-left:6px;font-size:22px;font-weight:800;opacity:.55;cursor:pointer;padding:0 4px}@keyframes nvring{0%,100%{transform:rotate(0)}25%{transform:rotate(-20deg)}75%{transform:rotate(20deg)}}';
    document.head.appendChild(st);
  }
  var b=document.createElement('div'); b.className='nv-toast'; b.style.cursor='pointer';
  b.innerHTML='<span class="nvic">🔔</span><div><b>NOVIDADE!</b><small>Toca aqui pra conferir!</small></div><span class="nvx">×</span>';
  document.body.appendChild(b);
  requestAnimationFrame(function(){ b.classList.add('show'); });
  b.querySelector('.nvx').onclick=function(e){ e.stopPropagation(); b.classList.remove('show'); setTimeout(function(){b.remove();},450); };
  b.onclick=function(){ irParaNovidade(); }; // clicar no balão leva até a novidade
  setTimeout(function(){ b.classList.remove('show'); setTimeout(function(){b.remove();},450); }, 8000);
}
var _novidadeAlvo=null; // pra onde o balão de NOVIDADE leva ao clicar
function checkNovidade(){
  var sig=novidadeSig();
  var last=localStorage.getItem('radar_novidade_sig');
  if(last===null){ localStorage.setItem('radar_novidade_sig',sig); return; } // 1ª vez: só registra, não alarma
  if(last!==sig){
    // descobre o que é novo (cards do carrossel que não existiam antes)
    var oldSet={}; (last.split('||')[0]||'').split(',').filter(Boolean).forEach(function(id){oldSet[id]=1;});
    var novos=getCarouselCards().filter(function(c){ return c.ativo!==false && !oldSet[c.id]; });
    _novidadeAlvo = novos.length ? {tipo:'lista', itens:novos.map(function(c){return {id:c.id,titulo:c.titulo,tipo:c.tipo};})} : {tipo:'evento'};
    localStorage.setItem('radar_novidade_sig',sig);
    mostrarNovidade();
  }
}
// clicar no balão -> ABRE o painel de Novidades mostrando o que entrou (antes só piscava o carrossel)
function irParaNovidade(){
  var t=document.querySelector('.nv-toast'); if(t){ t.classList.remove('show'); setTimeout(function(){ if(t) t.remove(); },400); }
  var alvo=_novidadeAlvo;
  var itens=(alvo && alvo.tipo==='lista' && alvo.itens) ? alvo.itens : [];
  mostrarNovidadesPanel(itens);
}
function novidadeLabel(tp){
  if(tp==='flyer'||tp==='imagem') return {ic:'🖼️',txt:'Novo cartaz'};
  if(tp==='mp4'||tp==='video'||tp==='localvideo'||tp==='linkvideo'||tp==='fbvideo') return {ic:'🎬',txt:'Novo vídeo'};
  if(tp==='aviso') return {ic:'📢',txt:'Novo aviso'};
  if(tp==='notapesar') return {ic:'🕊️',txt:'Nota de pesar'};
  if(tp==='licaobanner') return {ic:'📖',txt:'Lição nova'};
  return {ic:'✨',txt:'Novidade'};
}
// leva ao carrossel e destaca o card novo
function irParaCard(id){
  if(!document.getElementById('home').classList.contains('ativa')){ try{ voltarHome(); }catch(_){} }
  setTimeout(function(){
    var cards=getCarouselCards().filter(function(c){ return c.ativo!==false; });
    var idx=-1; cards.forEach(function(c,i){ if(c.id===id) idx=i; });
    if(idx>=0) irSlide(idx);
    var sc=document.querySelector('.home-scroll'); if(sc) sc.scrollTo({top:0,behavior:'smooth'});
    var car=document.getElementById('home-carousel');
    if(car){ car.style.transition='box-shadow .3s'; car.style.boxShadow='0 0 0 3px var(--gold)'; setTimeout(function(){ car.style.boxShadow=''; },1800); }
  }, 80);
}
// painel que MOSTRA as novidades (lista com botão pra ver cada uma)
function mostrarNovidadesPanel(itens){
  var ov=document.getElementById('nv-panel'); if(ov) ov.remove();
  ov=document.createElement('div'); ov.id='nv-panel';
  ov.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(8,12,20,.72);display:flex;align-items:center;justify-content:center;padding:20px';
  var corpo;
  if(itens && itens.length){
    corpo=itens.map(function(it){
      var L=novidadeLabel(it.tipo); var nome=(it.titulo&&String(it.titulo).trim())?it.titulo:L.txt;
      return '<button class="nvp-item" data-id="'+it.id+'" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#f4f7fa;border:1px solid #e3e9ef;border-radius:14px;padding:12px 14px;margin-bottom:10px;cursor:pointer;font-family:inherit">'
        +'<span style="font-size:1.6rem">'+L.ic+'</span>'
        +'<span style="flex:1;min-width:0"><b style="display:block;color:#12324e;font-size:.98rem;line-height:1.2">'+nome+'</b><small style="color:#7488a0;font-size:.76rem">'+L.txt+' · toque para ver</small></span>'
        +'<span style="color:#C8A24A;font-size:1.3rem;font-weight:800">&rsaquo;</span></button>';
    }).join('');
  } else {
    corpo='<p style="margin:0 0 14px;text-align:center;color:#54627a;font-size:.9rem;line-height:1.4">Entrou conteúdo novo na <b>tela inicial</b>. Toque abaixo para conferir.</p>'
      +'<button id="nvp-home" style="display:block;width:100%;background:linear-gradient(90deg,#C8A24A,#F2D98A);color:#241a0a;border:none;border-radius:14px;padding:13px;font-weight:800;font-family:inherit;font-size:.95rem;cursor:pointer">Ver na tela inicial</button>';
  }
  ov.innerHTML='<div style="background:#fff;border-radius:18px;max-width:420px;width:100%;padding:20px 18px 16px;box-shadow:0 18px 50px rgba(0,0,0,.45)">'
    +'<div style="text-align:center;margin-bottom:4px;font-size:2rem">🔔</div>'
    +'<h3 style="margin:0 0 3px;text-align:center;color:#12324e;font-size:1.2rem">Novidades no RADAR</h3>'
    +'<p style="margin:0 0 16px;text-align:center;color:#7488a0;font-size:.85rem">Isto acabou de entrar:</p>'
    + corpo
    +'<button id="nvp-close" style="display:block;margin:10px auto 0;background:none;border:none;color:#7488a0;font-size:.86rem;font-family:inherit;cursor:pointer">Fechar</button>'
    +'</div>';
  document.body.appendChild(ov);
  ov.onclick=function(e){ if(e.target===ov) ov.remove(); };
  var cl=document.getElementById('nvp-close'); if(cl) cl.onclick=function(){ ov.remove(); };
  var hm=document.getElementById('nvp-home'); if(hm) hm.onclick=function(){ ov.remove(); try{ voltarHome(); }catch(_){} var sc=document.querySelector('.home-scroll'); if(sc) sc.scrollTo({top:0,behavior:'smooth'}); };
  Array.prototype.forEach.call(ov.querySelectorAll('.nvp-item'),function(btn){
    btn.onclick=function(){ var id=btn.getAttribute('data-id'); ov.remove(); irParaCard(id); };
  });
}

// ══ ESCAVADOR DE PÉROLAS BÍBLICAS ══
function prlChip(t){ var i=document.getElementById('prl-input'); i.value=t; escavarPerola(); }
// ── MODO do Escavador: 'perola' (estudo) ou 'mensagem' (sermão) ──
var PRL_MODES={
  perola:  { ep:'/api/perolas',  btn:'💎 Escavar Pérola',      busy:'⛏️ Escavando…',   load:'💎 Buscando pérolas nas Escrituras…' },
  mensagem:{ ep:'/api/mensagem', btn:'🔥 Gerar Mensagem',       busy:'🔥 Forjando…',     load:'🔥 Forjando a mensagem pra pregar…' }
};
function prlMode(){ var m=localStorage.getItem('prl_mode'); return PRL_MODES[m]?m:'perola'; }
function setPrlMode(m){
  if(!PRL_MODES[m]) m='perola';
  localStorage.setItem('prl_mode',m);
  var btns=document.querySelectorAll('#prl-modes .prl-mode');
  for(var i=0;i<btns.length;i++){ btns[i].classList.toggle('active', btns[i].getAttribute('data-mode')===m); }
  var b=document.getElementById('prl-btn'); if(b && !b.disabled) b.textContent=PRL_MODES[m].btn;
}
try{ setPrlMode(prlMode()); }catch(_){}
function mdPerola(t){
  var esc=(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  esc=esc.replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>');      // **negrito**
  esc=esc.replace(/\*([^*\n]+)\*/g,'<i>$1</i>');          // *itálico*
  var secRe=/^\d{1,2}[\.\)]\s*[\u{1F000}-\u{1FAFF}☀-➿←-⇿⬀-⯿]/u;
  var out=esc.split('\n').map(function(ln){
    var s=ln.trim();
    if(!s) return '';
    if(/^#{1,6}\s+/.test(s)) return '<h3>'+s.replace(/^#{1,6}\s+/,'')+'</h3>';
    // "1. 📖 TÍTULO — corpo do texto": separa o TÍTULO (vira cabeçalho) do CORPO (vira parágrafo justificado)
    if(secRe.test(s)){
      var m=s.match(/^([\s\S]*?)\s[—–:-]\s([\s\S]*)$/);
      if(m) return '<h3>'+m[1].trim()+'</h3><p>'+m[2].trim()+'</p>';
      return '<h3>'+s+'</h3>';
    }
    return '<p>'+s+'</p>';
  }).join('');
  return out;
}
async function escavarPerola(){
  var inp=document.getElementById('prl-input'), out=document.getElementById('prl-out'), btn=document.getElementById('prl-btn');
  var q=(inp.value||'').trim();
  if(!q){ inp.focus(); return; }
  inp.blur();
  var mode=PRL_MODES[prlMode()];
  btn.disabled=true; var lbl=mode.btn; btn.textContent=mode.busy;
  out.innerHTML='<div class="prl-loading">'+mode.load+'</div>';
  var box=document.querySelector('#tela-perolas .prl-scroll');
  var acc='';
  try{
    var r=await fetch(mode.ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({passagem:q})});
    if(!r.ok || !r.body){ var msg=await r.text().catch(function(){return'';}); throw new Error(msg||('erro '+r.status)); }
    var reader=r.body.getReader(), dec=new TextDecoder();
    out.innerHTML='';
    while(true){
      var chunk=await reader.read();
      if(chunk.done) break;
      acc+=dec.decode(chunk.value,{stream:true});
      out.innerHTML=mdPerola(acc);
      out.classList.add('prl-cursor');
      if(box) box.scrollTop=box.scrollHeight;
    }
    out.classList.remove('prl-cursor');
    if(!acc.trim()) out.innerHTML='<div class="prl-loading">Não consegui gerar agora. Tente de novo.</div>';
  }catch(e){
    out.classList.remove('prl-cursor');
    out.innerHTML='<div class="prl-loading">⚠️ '+((e&&e.message)||'Não deu pra escavar agora.')+' Confira a internet e tente de novo.</div>';
  }
  btn.disabled=false; btn.textContent=lbl;
}
function seedCartazes(){
  if(localStorage.getItem('radar_seed_cartaz_v2')) return;   // v2 = cartazes em alta qualidade (.jpg)
  const cards=getCarouselCards();
  [1,2,3,4,5,6].forEach(function(n){
    const id='cartaz-'+n, path='/carousel/'+n+'.jpg';
    const c=cards.find(function(x){return x.id===id;});
    if(c){ c.imagem=path; c.tipo='imagem'; if(c.ativo===undefined)c.ativo=true; } // troca o antigo pelo novo
    else { cards.push({id:id,tipo:'imagem',imagem:path,titulo:'',link:'',ativo:true}); } // novo aparelho
  });
  setCarouselCards(cards);
  localStorage.setItem('radar_seed_cartaz_v2','1');
}
function seedLouvores(){
  if(localStorage.getItem('radar_seed_louvores_v1')) return;
  var cards=getCarouselCards();
  for(var n=1;n<=7;n++){
    var id='louvor-'+n;
    if(!cards.some(function(c){return c.id===id;})){
      cards.push({id:id,tipo:'mp4',video:'/carousel/louvor'+n+'.mp4',titulo:'',link:'',ativo:true});
    }
  }
  setCarouselCards(cards);
  localStorage.setItem('radar_seed_louvores_v1','1');
}
function setCarouselCards(arr){
  localStorage.setItem('radar_carousel',JSON.stringify(arr));
}

let _carIdx=0;
let _carTimer=null;
let _carTouchX=null;

function ytEmbedUrl(url){
  // extrai ID do YouTube e retorna embed URL
  const m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m?'https://www.youtube.com/embed/'+m[1]+'?autoplay=1&rel=0':null;
}
function ytThumbUrl(url){
  const m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m?'https://img.youtube.com/vi/'+m[1]+'/mqdefault.jpg':null;
}

// ── PRÓXIMO AVISO (automático): acha o evento mais próximo de hoje nas agendas CEADEMA + Templo ──
var _MES_NUM={'JANEIRO':0,'FEVEREIRO':1,'MARÇO':2,'ABRIL':3,'MAIO':4,'JUNHO':5,'JULHO':6,'AGOSTO':7,'SETEMBRO':8,'OUTUBRO':9,'NOVEMBRO':10,'DEZEMBRO':11};
var _MES_ABR={jan:0,fev:1,mar:2,abr:3,mai:4,jun:5,jul:6,ago:7,set:8,out:9,nov:10,dez:11};
function _parseData(data, mesGrupo, ano){
  data=String(data||'');
  var d=data.match(/\d{1,2}/); if(!d) return null;
  var dia=parseInt(d[0],10), mes=mesGrupo;
  var mm=data.match(/\/\s*(\d{1,2}|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i);
  if(mm){ var t=mm[1].toLowerCase(); mes=/^\d/.test(t)?(parseInt(t,10)-1):_MES_ABR[t.slice(0,3)]; }
  if(mes==null||isNaN(dia)) return null;
  return new Date(ano, mes, dia);
}
function proximoAviso(){
  try{
    var hoje=new Date(); hoje.setHours(0,0,0,0);
    var lista=[];
    function addMeses(ag, fonte){ if(!ag)return; ag.forEach(function(g){
      var nome=g[0], ano=2026; if(/2027/.test(nome)){ano=2027;nome=nome.replace(/\s*2027/,'');}
      var mesG=_MES_NUM[nome.trim()];
      g[1].forEach(function(e){ var dt=_parseData(e[0],mesG,ano); if(dt) lista.push({dt:dt,data:e[0],ev:e[2],local:e[3],fonte:fonte}); });
    }); }
    function addTemplo(ag){ if(!ag)return; ag.forEach(function(e){ var dt=_parseData(e[1],null,2026); if(dt) lista.push({dt:dt,data:e[1],ev:e[2],local:e[3],fonte:'Templo Central'}); }); }
    if(typeof AG_ESTADUAL!=='undefined') addMeses(AG_ESTADUAL,'CEADEMA Estadual');
    if(typeof AG_REGIONAL!=='undefined') addMeses(AG_REGIONAL,'CEADEMA Regional');
    if(typeof AG_TEMPLO_JUL!=='undefined') addTemplo(AG_TEMPLO_JUL);
    if(typeof AG_TEMPLO_AGO!=='undefined') addTemplo(AG_TEMPLO_AGO);
    var fut=lista.filter(function(x){return x.dt>=hoje;}).sort(function(a,b){return a.dt-b.dt;});
    return fut[0]||null;
  }catch(e){ return null; }
}
function avisoCard(){
  var a=proximoAviso(); if(!a) return null;
  var hoje=new Date(); hoje.setHours(0,0,0,0);
  var dias=Math.round((a.dt-hoje)/86400000);
  var quando = dias<=0?'HOJE': dias===1?'AMANHÃ':('EM '+dias+' DIAS');
  var WD=['dom','seg','ter','qua','qui','sex','sáb'], MS=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  var dataTxt = WD[a.dt.getDay()]+', '+a.dt.getDate()+' de '+MS[a.dt.getMonth()];
  return {id:'_aviso', tipo:'aviso', fonte:a.fonte, quando:quando, dataTxt:dataTxt, ev:a.ev, local:a.local, dia:a.dt.getDate(), mesAbr:MS[a.dt.getMonth()].toUpperCase()};
}
// Eventos da SEMANA (hoje até +7 dias) — Templo Central + Projeto Silas/CEADEMA
function avisosSemana(){
  try{
    var hoje=new Date(); hoje.setHours(0,0,0,0);
    var fim=new Date(hoje); fim.setDate(fim.getDate()+7);
    var lista=[];
    function addMeses(ag, fonte){ if(!ag)return; ag.forEach(function(g){
      var nome=g[0], ano=2026; if(/2027/.test(nome)){ano=2027;nome=nome.replace(/\s*2027/,'');}
      var mesG=_MES_NUM[nome.trim()];
      g[1].forEach(function(e){ var dt=_parseData(e[0],mesG,ano); if(dt) lista.push({dt:dt,ev:e[2],local:e[3],fonte:fonte}); });
    }); }
    function addTemplo(ag){ if(!ag)return; ag.forEach(function(e){ var dt=_parseData(e[1],null,2026); if(dt) lista.push({dt:dt,ev:e[2],local:e[3],fonte:'Templo Central'}); }); }
    if(typeof AG_TEMPLO_JUL!=='undefined') addTemplo(AG_TEMPLO_JUL);
    if(typeof AG_TEMPLO_AGO!=='undefined') addTemplo(AG_TEMPLO_AGO);
    if(typeof AG_ESTADUAL!=='undefined') addMeses(AG_ESTADUAL,'CEADEMA Estadual');
    if(typeof AG_REGIONAL!=='undefined') addMeses(AG_REGIONAL,'CEADEMA Regional');
    return lista.filter(function(x){return x.dt>=hoje && x.dt<=fim;}).sort(function(a,b){return a.dt-b.dt;});
  }catch(e){ return []; }
}
function avisosSemanaCards(){
  var evs=avisosSemana();
  var hoje=new Date(); hoje.setHours(0,0,0,0);
  var WD=['dom','seg','ter','qua','qui','sex','sáb'], MS=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return evs.slice(0,8).map(function(a,i){
    var dias=Math.round((a.dt-hoje)/86400000);
    var quando=dias<=0?'HOJE':dias===1?'AMANHÃ':('EM '+dias+' DIAS');
    var dataTxt=WD[a.dt.getDay()]+', '+a.dt.getDate()+' de '+MS[a.dt.getMonth()];
    return {id:'_aviso'+i, tipo:'aviso', fonte:a.fonte, quando:quando, dataTxt:dataTxt, ev:a.ev, local:a.local, dia:a.dt.getDate(), mesAbr:MS[a.dt.getMonth()].toUpperCase()};
  });
}
var _cloudVideos=[];
async function fetchCloudVideos(){
  try{ var r=await fetch('/api/videos'); var d=await r.json(); _cloudVideos=(d&&d.videos)||[]; renderCarousel(); }
  catch(e){ _cloudVideos=[]; }
}
async function renderVideosAdm(){
  var box=document.getElementById('vid-adm-lista'); if(!box) return;
  box.innerHTML='<div style="text-align:center;color:var(--sub);padding:24px">Carregando…</div>';
  try{
    var r=await fetch('/api/videos?token=radar-elias-2026'); var d=await r.json();
    var lista=(d&&d.videos)||[];
    var sub=document.getElementById('vid-adm-sub'); if(sub) sub.textContent=lista.length+' vídeo'+(lista.length!==1?'s':'')+' no slide';
    var cnt=document.getElementById('adm-cnt-videos'); if(cnt) cnt.textContent=lista.length+' no slide';
    if(!lista.length){ box.innerHTML='<div style="text-align:center;color:var(--sub);padding:24px">Nenhum vídeo ainda.<br>Cole um link acima pra começar.</div>'; return; }
    box.innerHTML=lista.map(function(v){
      var th=v.tipo==='youtube'?(ytThumbUrl(v.url)||''):'';
      var ic=v.tipo==='youtube'?'▶️':(v.tipo==='facebook'?'📘':'🎬');
      return '<div style="display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;margin-bottom:10px">'
        +(th?'<img src="'+th+'" style="width:64px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0">':'<div style="width:64px;height:44px;border-radius:8px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">'+ic+'</div>')
        +'<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--txt);font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(v.titulo||'(sem título)')+'</div>'
        +'<div style="font-size:11px;color:var(--sub);text-transform:capitalize">'+v.tipo+'</div></div>'
        +'<button onclick="delVideoAdm('+v.id+')" style="background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.3);color:#ff6b6b;font-size:15px;padding:9px 12px;border-radius:10px;cursor:pointer;flex-shrink:0">🗑️</button>'
        +'</div>';
    }).join('');
  }catch(e){ box.innerHTML='<div style="text-align:center;color:#ff6b6b;padding:24px">Erro ao carregar.</div>'; }
}
async function addVideoAdm(){
  var url=document.getElementById('vid-url').value.trim();
  var titulo=document.getElementById('vid-titulo').value.trim();
  var msg=document.getElementById('vid-msg');
  if(!url){ msg.style.color='#ff6b6b'; msg.textContent='Cole um link primeiro.'; return; }
  var btn=document.getElementById('vid-btn-add'); btn.disabled=true; var t=btn.textContent; btn.textContent='Adicionando…';
  try{
    var r=await fetch('/api/videos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:'radar-elias-2026',url:url,titulo:titulo})});
    var d=await r.json();
    if(d&&d.ok){ document.getElementById('vid-url').value=''; document.getElementById('vid-titulo').value=''; msg.style.color='var(--gold)'; msg.textContent='✅ Adicionado ao slide!'; renderVideosAdm(); fetchCloudVideos(); }
    else { msg.style.color='#ff6b6b'; msg.textContent='Não deu. Confira o link e tente de novo.'; }
  }catch(e){ msg.style.color='#ff6b6b'; msg.textContent='Erro de conexão. Tente de novo.'; }
  btn.disabled=false; btn.textContent=t;
}
async function delVideoAdm(id){
  if(!confirm('Remover este vídeo do slide?')) return;
  try{ var r=await fetch('/api/videos?token=radar-elias-2026&del='+id); var d=await r.json();
    if(d&&d.ok){ renderVideosAdm(); fetchCloudVideos(); } else alert('Não deu pra remover.'); }
  catch(e){ alert('Erro ao remover.'); }
}
function notaPesarCard(){
  // Nota de pesar CEADEMA — visível no topo do carrossel até 10 dias após (06/08/2026)
  try{ var fim=new Date(2026,7,6), hoje=new Date(); hoje.setHours(0,0,0,0);
    if(hoje>fim) return null; }catch(e){}
  return {id:'_notapesar', tipo:'notapesar'};
}
function cultoCard(){
  // Flyer do Culto de Assembleia Geral — some depois de 28/07/2026
  try{ var fim=new Date(2026,6,28), hoje=new Date(); hoje.setHours(0,0,0,0);
    if(hoje>fim) return null; }catch(e){}
  return {id:'_culto', tipo:'flyer', imagem:'/carousel/culto-geral.jpg'};
}
function daviCard(){
  // Corrente de Oração pela vida de Davi Ximenes — no topo até 10/08/2026
  try{ var fim=new Date(2026,7,10), hoje=new Date(); hoje.setHours(0,0,0,0);
    if(hoje>fim) return null; }catch(e){}
  return {id:'_davi', tipo:'flyer', imagem:'/carousel/davi-ximenes.jpg'};
}
function parabensCard(){
  // Parabéns Pr. Pedro Aldir Damasceno (Semadema/CEADEMA) — até 05/08/2026
  try{ var fim=new Date(2026,7,5), hoje=new Date(); hoje.setHours(0,0,0,0);
    if(hoje>fim) return null; }catch(e){}
  return {id:'_parabens', tipo:'flyer', imagem:'/carousel/parabens-pedro.jpg'};
}
function umadeasCard(){
  // VII Congresso da UMADEAS (Josué e Milena) — no topo até 20/09/2026
  try{ var fim=new Date(2026,8,20), hoje=new Date(); hoje.setHours(0,0,0,0);
    if(hoje>fim) return null; }catch(e){}
  return {id:'_umadeas', tipo:'flyer', imagem:'/carousel/umadeas.jpg'};
}
function abrirNotaPesar(){
  mostrarTela('tela-nota-pesar');
  var sc=document.querySelector('#tela-nota-pesar .np-scroll'); if(sc) sc.scrollTop=0;
}
/* FLYERS da igreja jogados via clipboard — cada um some sozinho na data 'fim' (YYYY-MM-DD) */
var FLYERS_EXTRA=[
  {img:'/carousel/cruzadas-tuntum.jpg', fim:'2026-08-28'},       // Cruzadas Evangelísticas Tuntum · 20-28/08
  {img:'/carousel/encontro-monte-sinai.jpg', fim:'2026-08-14'},  // Encontro Evangelístico · Monte Sinai Vila Mata · hoje
  {img:'/carousel/culto-ensino-biblico.jpg', fim:'2026-08-14'},  // Culto Ensino Bíblico · Monte Carmelo · sexta 19h30
  {img:'/carousel/iead-culto-14ago.jpg', fim:'2026-08-14'},      // IEADCJ 60 anos · culto 19h30 14/08 · Pr Enilsom
  {img:'/carousel/nordeste-cristo-3dia.jpg', fim:'2026-08-14'},  // Nordeste para Cristo · 3º dia (diário, some amanhã)
  {img:'/carousel/iead-jubileu-1016.jpg', fim:'2026-08-16'}   // IEADCJ 60 anos · 10 a 16 de agosto
];
function flyersExtrasCards(){
  var hoje=new Date(); hoje.setHours(0,0,0,0);
  return FLYERS_EXTRA.filter(function(f){
    if(!f.fim) return true;
    var p=String(f.fim).split('-'); var d=new Date(+p[0],+p[1]-1,+p[2],23,59,59);
    return d>=hoje;
  }).map(function(f,i){ return {id:'fx'+i, tipo:'flyer', imagem:f.img}; });
}
function licaoSemanaCard(){
  var n=(typeof licaoDaSemana==='function')?licaoDaSemana():0;
  if(n<1||n>13) return null;
  var nn=('0'+n).slice(-2);
  return {id:'_licsem', tipo:'licaobanner', img:'/ebd/adulto/img/licao-'+nn+'.jpg', n:n};
}
function abrirEbdAdultoLicao(n){
  try{
    abrirEbdTurma('adulto');
    var lics=(typeof EBD_LICOES!=='undefined')?EBD_LICOES['adulto']:[];
    var idx=-1; for(var i=0;i<lics.length;i++){ if(lics[i].n===n){ idx=i; break; } }
    if(idx>=0) abrirLicaoDetalhe(idx);
  }catch(e){}
}
function tetelestaiCard(){ return {id:'_tete', tipo:'tetelestai'}; }
function abrirTetelestai(){ mostrarTela('tela-tetelestai'); var s=document.querySelector('#tela-tetelestai .tt-scroll'); if(s){ setTimeout(function(){ s.scrollTop=0; },30); } }
function renderCarousel(){
  const wrap=document.getElementById('home-carousel');
  if(!wrap)return;
  let cards=getCarouselCards().filter(c=>c.ativo!==false && c.tipo!=='mp4'); // mp4 (louvores/filmes) fora do slide (pedido do Elias)
  // vídeos da nuvem (YouTube/Facebook add pelo Elias) — entram antes das louvores
  if(_cloudVideos && _cloudVideos.length){
    var cv=_cloudVideos.map(function(v){
      if(v.tipo==='youtube') return {id:'cv'+v.id, tipo:'video', video:v.url, titulo:v.titulo||''};
      if(v.tipo==='facebook') return {id:'cv'+v.id, tipo:'fbvideo', url:v.url, titulo:v.titulo||''};
      return {id:'cv'+v.id, tipo:'linkvideo', url:v.url, titulo:v.titulo||''};
    });
    cards=cv.concat(cards);
  }
  var _sem=avisosSemanaCards(); if(_sem.length) cards=_sem.concat(cards);   // agenda da SEMANA toda (Templo + Silas/CEADEMA)
  var _uma=umadeasCard(); if(_uma) cards=[_uma].concat(cards);   // VII Congresso UMADEAS — 1º card, até 20/09/2026
  var _lsem=licaoSemanaCard(); if(_lsem) cards=[_lsem].concat(cards);   // LIÇÃO DA SEMANA (imagem real da revista) — 1º card, tocável
  var _tete=tetelestaiCard(); if(_tete) cards=[_tete].concat(cards);   // ESTUDO Tetelestai — card tocável
  var _fx=flyersExtrasCards(); if(_fx.length) cards=_fx.concat(cards);   // FLYERS da igreja (clipboard) — 1os cards, somem sozinhos na data
  var _vloc=videosLocaisCards(); if(_vloc.length) cards=cards.concat(_vloc);   // 6 vídeos (Downloads) — tocam em TELA CHEIA + botão Sair
  // removidos do slide a pedido do Elias (28/07): Aniversário Pr. Pedro, Culto Assembleia Geral, Nota de Pesar
  // corrente de oração (Davi Ximenes) — REMOVIDO a pedido do Elias (28/07)
  if(!cards.length){
    wrap.innerHTML='<div class="carousel-empty"><div style="font-size:28px;opacity:.3">🖼️</div><div>Nenhum card no carousel</div><div style="font-size:10px;opacity:.6">Adicione em Admin → Configurações</div></div>';
    return;
  }
  _carIdx=Math.min(_carIdx,cards.length-1);
  const slides=cards.map((c,i)=>{
    let inner='';
    if(c.tipo==='flyer'){
      inner=`<div style="height:460px;background:#0a1a3a;display:flex;align-items:center;justify-content:center"><img src="${c.imagem}" style="max-width:100%;max-height:100%;object-fit:contain" onerror="this.style.display='none'"></div>`;
    } else if(c.tipo==='fbvideo'){
      inner=`<div style="height:460px;background:#000;display:flex;align-items:center;justify-content:center">
        <iframe src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(c.url)}&show_text=false&width=560" style="width:100%;height:100%;border:0" allowfullscreen scrolling="no" allow="encrypted-media; picture-in-picture; web-share"></iframe></div>`;
      if(c.titulo) inner+=`<div class="cs-overlay"><div class="cs-overlay-titulo">${c.titulo}</div></div>`;
    } else if(c.tipo==='linkvideo'){
      inner=`<div style="height:460px;background:linear-gradient(160deg,#1a1a2e,#16213e);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;color:#fff">
        <div style="font-size:52px">🎬</div>
        <div style="font-size:18px;font-weight:800;margin:14px 0 6px">${c.titulo||'Vídeo'}</div>
        <a href="${c.url}" target="_blank" style="margin-top:14px;background:#e50914;color:#fff;font-weight:800;padding:12px 22px;border-radius:999px;text-decoration:none">▶ Assistir</a>
      </div>`;
    } else if(c.tipo==='notapesar'){
      inner=`<div style="height:460px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:26px 24px;background:linear-gradient(160deg,#112155,#3a78b5);color:#fff;position:relative">
        <img src="img/ceadema.png" style="width:76px;height:76px;object-fit:contain;margin-bottom:12px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35))">
        <div style="font-size:11.5px;font-weight:800;letter-spacing:3px;color:#bfe3f5">CEADEMA</div>
        <div style="width:42px;height:2px;background:#5dd8e3;margin:11px 0"></div>
        <div style="font-family:'Playfair Display',serif;font-size:29px;font-weight:900;letter-spacing:1px">NOTA DE PESAR</div>
        <div style="font-size:15px;margin-top:11px;color:#eaf2fb;line-height:1.4">Missionária<br><b style="font-size:17px">Maria Alves da Silva</b></div>
        <div style="margin-top:20px;font-size:12.5px;color:#eaf2fb;border:1px solid rgba(255,255,255,.35);padding:8px 18px;border-radius:999px">🕊️ Toque para ler</div>
      </div>`;
    } else if(c.tipo==='aviso'){
      inner=`<div class="cs-aviso">
        <div class="cs-av-daycircle"><div class="cs-av-daynum">${c.dia}</div><div class="cs-av-daymon">${c.mesAbr}</div></div>
        <span class="cs-av-fonte">📅 ${c.fonte}</span>
        <div class="cs-av-lbl">Próximo aviso · <b>${c.quando}</b></div>
        <div class="cs-av-data">${c.dataTxt}</div>
        <div class="cs-av-nome">${c.ev}</div>
        ${c.local?`<div class="cs-av-local">📍 ${c.local}</div>`:''}
      </div>`;
    } else if(c.tipo==='imagem'){
      inner=`<img class="cs-img" src="${c.imagem||''}" alt="${c.titulo||''}" onerror="this.style.display='none'">`;
      if(c.titulo) inner+=`<div class="cs-overlay"><div class="cs-overlay-titulo">${c.titulo}</div></div>`;
    } else if(c.tipo==='mp4'){
      const _u=c.video||''; const _nome=(_u.split('/').pop()||'video.mp4'); const _vw=(getViews()[c.id]||0);
      inner=`<video class="cs-mp4" src="${_u}" data-id="${c.id}" controls playsinline preload="metadata"></video>
        <div class="cs-vbar">
          <span class="cs-views">👁 <b id="views-${c.id}">${_vw}</b> visualizações</span>
          <span class="cs-acts">
            <button class="cs-abtn" onclick="event.stopPropagation();shareVid('${_u}')">↗ Compartilhar</button>
            <button class="cs-abtn" onclick="event.stopPropagation();baixarVid('${_u}','${_nome}')">⬇ Baixar</button>
          </span>
        </div>`;
    } else if(c.tipo==='video'){
      const thumb=ytThumbUrl(c.video||'');
      inner=`<div class="cs-video-thumb" onclick="abrirVideoCard(${i})">
        ${thumb?`<img src="${thumb}" alt="">`:''}<div class="cs-video-play">▶</div></div>`;
      if(c.titulo) inner+=`<div class="cs-overlay"><div class="cs-overlay-titulo">${c.titulo}</div></div>`;
    } else if(c.tipo==='localvideo'){
      const _lvw=(getViews()[c.id]||0);
      inner=`<div onclick="abrirVideoTela('${c.video}','${(c.titulo||'').replace(/'/g,'’')}','${c.id}')" style="height:460px;position:relative;background:#000;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden">
        <video src="${c.video}#t=0.1" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover"></video>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.18)"><div style="width:70px;height:70px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;display:flex;align-items:center;justify-content:center;font-size:30px">▶</div></div>
        <div style="position:absolute;top:12px;left:12px;background:rgba(0,0,0,.6);color:#fff;font-size:12.5px;font-weight:700;padding:6px 11px;border-radius:999px">👁 <b id="views-${c.id}">${_lvw}</b> acessos</div>
        ${c.titulo?`<div class="cs-overlay"><div class="cs-overlay-titulo">${c.titulo}</div></div>`:''}</div>`;
    } else if(c.tipo==='tetelestai'){
      inner=`<div onclick="abrirTetelestai()" style="height:460px;background:linear-gradient(160deg,#7a1626,#9E2233 55%,#5e0f1c);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;cursor:pointer;overflow:hidden;text-align:center;padding:24px">
        <div style="width:34px;height:44px;position:relative;margin-bottom:2px">
          <div style="position:absolute;width:7px;height:44px;left:13px;top:0;background:#f0d488;border-radius:2px"></div>
          <div style="position:absolute;width:26px;height:7px;left:4px;top:12px;background:#f0d488;border-radius:2px"></div>
        </div>
        <div style="background:#f0d488;color:#5e0f1c;font-weight:900;font-size:12px;padding:6px 15px;border-radius:999px;letter-spacing:1px">✝ ESTUDO</div>
        <div style="color:#fff;font-size:40px;font-weight:800;letter-spacing:3px;font-family:'Playfair Display',serif;line-height:1">TETELESTAI</div>
        <div style="color:#f6dfe3;font-size:14px;font-style:italic">“Está Consumado” — João 19:30</div>
        <div style="color:#fff;font-size:13.5px;font-weight:800;margin-top:6px;border:1px solid rgba(255,255,255,.5);padding:8px 18px;border-radius:999px">🕊️ Toque para ler ›</div>
      </div>`;
    } else if(c.tipo==='licaobanner'){
      inner=`<div onclick="abrirEbdAdultoLicao(${c.n})" style="height:460px;background:linear-gradient(160deg,#0a3a33,#0e5347);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;cursor:pointer;overflow:hidden">
        <div style="background:linear-gradient(150deg,#f0d488,#c99a3a);color:#0a3a33;font-weight:900;font-size:12.5px;padding:7px 15px;border-radius:999px;letter-spacing:.5px;box-shadow:0 4px 12px rgba(0,0,0,.35)">📖 LIÇÃO DA SEMANA</div>
        <img src="${c.img}" style="width:100%;display:block;box-shadow:0 10px 26px rgba(0,0,0,.45)" onerror="this.style.display='none'">
        <div style="color:#fff;font-size:13.5px;font-weight:800;opacity:.95">Toque para abrir a lição ›</div>
      </div>`;
    } else {
      inner=`<div class="cs-txt" style="--tc:${c.cor||'var(--card)'}">
        ${c.titulo?`<div class="cs-titulo">${c.titulo}</div>`:''}
        ${c.texto?`<div class="cs-body">${c.texto}</div>`:''}
      </div>`;
    }
    let link;
    if(c.tipo==='notapesar') link='onclick="abrirNotaPesar()" style="cursor:pointer"';
    else if(c.link) link=`onclick="window.open('${c.link}','_blank')" style="cursor:pointer"`;
    else link=(c.tipo!=='video'&&c.tipo!=='mp4'&&c.tipo!=='localvideo'&&c.tipo!=='licaobanner'&&c.tipo!=='tetelestai')?'onclick="void(0)"':'';
    return `<div class="carousel-slide" ${link}>${inner}</div>`;
  }).join('');

  const dots=cards.map((_,i)=>`<button class="c-dot${i===_carIdx?' on':''}" onclick="irSlide(${i})"></button>`).join('');

  wrap.innerHTML=`<div class="carousel-wrap">
    <div class="carousel-track" id="car-track" style="transform:translateX(-${_carIdx*100}%)">${slides}</div>
  </div>${cards.length>1?`<div class="carousel-dots" id="car-dots">${dots}</div>`:''}`;

  // touch swipe
  const track=document.getElementById('car-track');
  track.addEventListener('touchstart',e=>{_carTouchX=e.touches[0].clientX;},{ passive:true });
  track.addEventListener('touchend',e=>{
    if(_carTouchX===null)return;
    const dx=e.changedTouches[0].clientX-_carTouchX;
    _carTouchX=null;
    if(Math.abs(dx)<40)return;
    dx<0?irSlide(_carIdx+1):irSlide(_carIdx-1);
  },{ passive:true });

  // conta a visualização quando o vídeo começa a tocar (1x por vídeo por abertura)
  wrap.querySelectorAll('video.cs-mp4').forEach(function(v){
    v.addEventListener('play', function(){ bumpView(v.dataset.id); });
  });

  // agenda inteligente do carrossel (slide normal = 5s; slide de vídeo = toca até acabar)
  agendarSlide();
}
// decide quando passar o slide atual: vídeo toca sozinho e só avança ao terminar; os outros passam em 5s
function agendarSlide(){
  clearTimeout(_carTimer); clearInterval(_carTimer);
  const cards=getCarouselCards().filter(c=>c.ativo!==false);
  const slides=document.querySelectorAll('.carousel-slide');
  slides.forEach((s,i)=>{ const v=s.querySelector('video.cs-mp4'); if(v && i!==_carIdx){ try{ v.pause(); v.currentTime=0; }catch(e){} } });
  if(cards.length<2) return;
  const cur=slides[_carIdx];
  const vid=cur?cur.querySelector('video.cs-mp4'):null;
  if(vid){
    vid.muted=true;                                   // mudo → o navegador deixa tocar sozinho (toque no vídeo p/ ouvir)
    try{ vid.currentTime=0; }catch(e){}
    const p=vid.play(); if(p&&p.catch) p.catch(()=>{});
    vid.onended=()=>irSlide(_carIdx+1);               // acabou o vídeo → passa pro próximo
  } else {
    _carTimer=setTimeout(()=>irSlide(_carIdx+1),5000); // slide normal passa em 5s
  }
}

function irSlide(idx){
  const cards=getCarouselCards().filter(c=>c.ativo!==false);
  if(!cards.length)return;
  _carIdx=((idx%cards.length)+cards.length)%cards.length;
  const track=document.getElementById('car-track');
  if(track) track.style.transform=`translateX(-${_carIdx*100}%)`;
  document.querySelectorAll('.c-dot').forEach((d,i)=>d.classList.toggle('on',i===_carIdx));
  agendarSlide();
}

function abrirVideoCard(idx){
  const cards=getCarouselCards().filter(c=>c.ativo!==false);
  const c=cards[idx];
  if(!c||c.tipo!=='video')return;
  const embed=ytEmbedUrl(c.video||'');
  if(embed){
    const slide=document.querySelectorAll('.carousel-slide')[idx];
    if(slide) slide.innerHTML=`<iframe class="cs-video-frame" src="${embed}" allow="autoplay;encrypted-media" allowfullscreen></iframe>`;
  } else if(c.video){
    window.open(c.video,'_blank');
  }
}

// 6 vídeos locais (Downloads) — aparecem como slides e tocam em TELA CHEIA
// ===== Historinhas Infantil (compartilhavel + contador GLOBAL via Abacus) =====
// Lista no codigo (banco do RADAR fora do ar). Novos videos: manda o arquivo pro Claude adicionar.
var _HIST=[
  {id:'noe', titulo:'A Arca de Noé', video:'https://www.youtube.com/watch?v=bdCuh2_k184', capa:'https://img.youtube.com/vi/bdCuh2_k184/mqdefault.jpg'},
  {id:'jose', titulo:'José e seus Sonhos', video:'https://www.youtube.com/watch?v=Lc4VKPvWdhk', capa:'https://img.youtube.com/vi/Lc4VKPvWdhk/mqdefault.jpg'},
  {id:'natal', titulo:'O Primeiro Natal — O Nascimento de Jesus', video:'https://www.youtube.com/watch?v=aRE7U-5O13U', capa:'https://img.youtube.com/vi/aRE7U-5O13U/mqdefault.jpg'},
  {id:'salomao', titulo:'O Rei Salomão e a Sabedoria', video:'https://www.youtube.com/watch?v=pSHJrh3PnYo', capa:'https://img.youtube.com/vi/pSHJrh3PnYo/mqdefault.jpg'},
  {id:'elias', titulo:'Elias e o Fogo do Céu', video:'https://www.youtube.com/watch?v=lwnIoFNpIR0', capa:'https://img.youtube.com/vi/lwnIoFNpIR0/mqdefault.jpg'},
  {id:'lazaro', titulo:'Jesus e o seu Amigo Lázaro', video:'https://www.youtube.com/watch?v=hpjg_rDcVGQ', capa:'https://img.youtube.com/vi/hpjg_rDcVGQ/mqdefault.jpg'},
  {id:'prodigo', titulo:'O Filho Pródigo', video:'https://www.youtube.com/watch?v=8wH5e_WRPXY', capa:'https://img.youtube.com/vi/8wH5e_WRPXY/mqdefault.jpg'},
  {id:'isaque-rebeca', titulo:'Isaque e Rebeca', video:'https://www.youtube.com/watch?v=KWKhYWrPPdg', capa:'https://img.youtube.com/vi/KWKhYWrPPdg/mqdefault.jpg'},
  {id:'joao-batista', titulo:'O Nascimento de João Batista', video:'https://www.youtube.com/watch?v=41WMuAd-Eaw', capa:'https://img.youtube.com/vi/41WMuAd-Eaw/mqdefault.jpg'},
  {id:'apocalipse', titulo:'Apocalipse — A Grande Promessa', video:'https://www.youtube.com/watch?v=-kI517dxNeE', capa:'https://img.youtube.com/vi/-kI517dxNeE/mqdefault.jpg'}
];
var _ABC='https://abacus.jasoncameron.dev';
function _htoast(m){ try{ var t=document.getElementById('_htoast'); if(!t){t=document.createElement('div');t.id='_htoast';t.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%) translateY(120px);background:#111;color:#fff;padding:12px 18px;border-radius:12px;font-weight:800;font-size:14px;z-index:99999;transition:.3s;box-shadow:0 10px 30px rgba(0,0,0,.3)';document.body.appendChild(t);} t.textContent=m;t.style.transform='translateX(-50%) translateY(0)';clearTimeout(t._t);t._t=setTimeout(function(){t.style.transform='translateX(-50%) translateY(120px)';},2600);}catch(e){} }
async function abrirHistorinhas(){ mostrarTela('tela-historinhas'); renderHist(); _carregaViews(); }
async function fetchHist(){ renderHist(); _carregaViews(); }
function _carregaViews(){ _HIST.forEach(function(h){ fetch(_ABC+'/get/radaratual-hist/'+h.id).then(function(r){return r.json();}).then(function(d){ var sp=document.getElementById('hv-'+h.id); if(sp&&d&&d.value!=null)sp.textContent=d.value; }).catch(function(){}); }); }
function _histById(id){ return _HIST.find(function(x){return x.id==id;}); }
function renderHist(){ var el=document.getElementById('hist-lista'); if(!el)return; var sub=document.getElementById('hist-sub'); if(sub)sub.textContent=_HIST.length+' video(s)';
  if(!_HIST.length){ el.innerHTML='<div style="text-align:center;color:#9fb0bd;padding:40px 16px">Nenhuma historinha ainda.</div>'; return; }
  el.innerHTML=_HIST.map(function(h){ var cap=(h.capa||('/img/hist/'+h.id+'.jpg')); return '<div class="hcard" onclick="verHistorinha(\''+h.id+'\')" style="background-image:url(\''+cap+'\'),linear-gradient(135deg,#2a4a80,#16305c)"><span class="hplay">▶</span><div class="htit">'+String(h.titulo||'Historinha').replace(/</g,'&lt;')+'</div></div>'; }).join(''); }
function verHistorinha(id){ var h=_histById(id); if(!h)return;
  fetch(_ABC+'/hit/radaratual-hist/'+id).then(function(r){return r.json();}).then(function(d){ var sp=document.getElementById('hv-'+id); if(sp&&d&&d.value!=null)sp.textContent=d.value; }).catch(function(){});
  var v=h.video||''; if((h.tipo=='mp4')||v.indexOf('.mp4')>=0||v.indexOf('/videos')===0){ abrirVideoTela(v, h.titulo||'Historinha', 'hist-'+id); } else { var yt=_ytId(v); if(yt){ _playYT(yt, h.titulo||'Historinha'); } else { window.open(v,'_blank'); } } }
function _ytId(u){ var m=(u||'').match(/(?:v=|youtu\.be\/|\/embed\/)([A-Za-z0-9_-]{11})/); return m?m[1]:''; }
function _playYT(id,titulo){
  var ov=document.getElementById('yt-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='yt-ov';
    ov.style.cssText='position:fixed;inset:0;z-index:100050;background:#000;display:none;flex-direction:column';
    ov.innerHTML='<div style="display:flex;align-items:center;gap:10px;padding:calc(8px + env(safe-area-inset-top)) 12px 8px;color:#fff;background:#0a1420"><button onclick="_closeYT()" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:9px;padding:8px 14px;font-weight:800;font-family:inherit;cursor:pointer">&lsaquo; Voltar</button><span id="yt-tit" style="flex:1;min-width:0;font-size:.95rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></span></div><div style="flex:1;display:flex;align-items:center;justify-content:center;padding:0 8px 8px"><div style="position:relative;width:100%;max-width:960px;aspect-ratio:16/9;max-height:100%;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.5)"><iframe id="yt-if" allow="autoplay;encrypted-media;fullscreen;picture-in-picture" allowfullscreen playsinline style="position:absolute;inset:0;width:100%;height:100%;border:0;background:#000"></iframe></div></div>';
    document.body.appendChild(ov);
  }
  document.getElementById('yt-tit').textContent=titulo||'Historinha';
  document.getElementById('yt-if').src='https://www.youtube.com/embed/'+id+'?rel=0&autoplay=1&playsinline=1&modestbranding=1';
  ov.style.display='flex';
}
function _closeYT(){ var ov=document.getElementById('yt-ov'); if(ov){ var f=document.getElementById('yt-if'); if(f)f.src=''; ov.style.display='none'; } }
function shareHist(id){ var h=_histById(id); var url=location.origin+'/?hist='+id; var dados={title:(h&&h.titulo)||'Historinha Infantil', text:'Assista essa historinha no app RADAR:', url:url}; if(navigator.share){ navigator.share(dados).catch(function(){}); } else { navigator.clipboard.writeText(url).then(function(){_htoast('🔗 Link copiado!');}).catch(function(){_htoast(url);}); } }
function toggleHistAdm(){ var a=document.getElementById('hist-adm'); a.style.display=a.style.display=='none'?'block':'none'; }
function addHistAdm(){ _htoast('Pra adicionar um video novo, manda o arquivo pro Claude ✅'); }

function videosLocaisCards(){
  var r=[];
  r.push({id:'lv-jabez', tipo:'localvideo', video:'/videos/jabez.mp4', titulo:'Jabez'});
  for(var i=1;i<=6;i++){ r.push({id:'lv'+i, tipo:'localvideo', video:'/videos/v'+i+'.mp4', titulo:'Vídeo '+i}); }
  return r;
}
function abrirVideoTela(url, titulo, id){
  try{ if(id) bumpView(id); }catch(e){}
  try{ clearTimeout(_carTimer); clearInterval(_carTimer); }catch(e){}
  var ov=document.getElementById('video-fs');
  if(!ov){ ov=document.createElement('div'); ov.id='video-fs'; document.body.appendChild(ov); }
  ov.style.cssText='position:fixed;inset:0;z-index:99999;background:#000;display:flex;flex-direction:column';
  ov.innerHTML=''
    +'<div style="position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:12px 14px;z-index:2;background:linear-gradient(rgba(0,0,0,.65),transparent);pointer-events:none">'
      +'<div style="color:#fff;font-weight:800;font-size:15px;max-width:64%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(titulo||'')+'</div>'
      +'<button onclick="fecharVideoTela()" style="pointer-events:auto;background:#e50914;color:#fff;border:none;border-radius:999px;padding:10px 20px;font-weight:800;font-size:15px;font-family:inherit;cursor:pointer">✕ Sair</button>'
    +'</div>'
    +'<video src="'+url+'" controls autoplay playsinline style="width:100%;height:100%;object-fit:contain;background:#000"></video>';
  ov.style.display='flex';
  try{ var fn=ov.requestFullscreen||ov.webkitRequestFullscreen||ov.msRequestFullscreen; if(fn) fn.call(ov); }catch(e){}
  document.addEventListener('keydown', _escFecharVideo);
}
function _escFecharVideo(e){ if(e.key==='Escape') fecharVideoTela(); }
function fecharVideoTela(){
  var ov=document.getElementById('video-fs'); if(!ov) return;
  var v=ov.querySelector('video'); if(v){ try{ v.pause(); }catch(e){} }
  try{ if(document.fullscreenElement||document.webkitFullscreenElement) (document.exitFullscreen||document.webkitExitFullscreen).call(document); }catch(e){}
  document.removeEventListener('keydown', _escFecharVideo);
  ov.style.display='none'; ov.innerHTML='';
  try{ agendarSlide(); }catch(e){}
}

// ══════════════════════════════════════════════════════════
// CONFIGURAÇÕES — CRUD DE CARDS
// ══════════════════════════════════════════════════════════

let _cfgEditId=null;
let _cfgCorSel='#0F1525';

function renderCfgCards(){
  const lista=document.getElementById('cfg-lista');
  const strip=document.getElementById('cfg-strip');
  const totalEl=document.getElementById('cfg-total');
  if(!lista)return;
  const cards=getCarouselCards();
  const n=cards.length;
  if(totalEl) totalEl.textContent=n===0?'Nenhum card':(n===1?'1 card':n+' cards');

  // Tira de prévia (strip horizontal)
  if(strip){
    if(!n){strip.innerHTML='';} else {
      strip.innerHTML=cards.map((c,i)=>{
        const ativo=c.ativo!==false;
        if(c.tipo==='imagem'&&c.imagem)
          return `<div class="cfg-strip-thumb${ativo?' ativo-strip':''}" onclick="rolarParaCard(${i})" title="${c.titulo||''}"><img src="${c.imagem}" onerror="this.parentElement.innerHTML='🖼️'"></div>`;
        if(c.tipo==='video'&&c.video){
          const th=ytThumbUrl(c.video)||'';
          return `<div class="cfg-strip-thumb${ativo?' ativo-strip':''}" onclick="rolarParaCard(${i})"><img src="${th}" onerror="this.parentElement.innerHTML='▶️'"></div>`;
        }
        return `<div class="cfg-strip-txt${ativo?' ativo-strip':''}" style="background:${c.cor||'var(--card)'};" onclick="rolarParaCard(${i})"><span style="font-size:8px;font-weight:900;color:#fff;opacity:.8;text-align:center;line-height:1.2">${c.titulo||'Texto'}</span></div>`;
      }).join('');
    }
  }

  // Cards visuais
  if(!n){
    lista.innerHTML='<div class="cfg-empty-msg">Nenhum card ainda.<br><span style="font-size:11px;opacity:.5">Toque em "+ Novo card" para começar.</span></div>';
    return;
  }

  lista.innerHTML=cards.map((c,i)=>{
    const ativo=c.ativo!==false;
    let preview='';
    if(c.tipo==='imagem'){
      preview=`<div class="cfg-vc-prev">
        <img class="cfg-vc-prev-img" src="${c.imagem||''}" onerror="this.style.display='none'">
        ${c.titulo?`<div class="cfg-vc-overlay"><div class="cfg-vc-overlay-tit">${c.titulo}</div></div>`:''}
      </div>`;
    } else if(c.tipo==='video'){
      const th=ytThumbUrl(c.video||'')||'';
      preview=`<div class="cfg-vc-prev">
        <div class="cfg-vc-prev-video">
          ${th?`<img src="${th}" onerror="this.style.display='none'">`:''}
          <div class="cfg-play">▶</div>
        </div>
        ${c.titulo?`<div class="cfg-vc-overlay"><div class="cfg-vc-overlay-tit">${c.titulo}</div></div>`:''}
      </div>`;
    } else {
      preview=`<div class="cfg-vc-prev">
        <div class="cfg-vc-prev-txt" style="background:${c.cor||'var(--card)'}">
          ${c.titulo?`<div class="pv-tit">${c.titulo}</div>`:''}
          ${c.texto?`<div class="pv-body">${c.texto}</div>`:''}
        </div>
      </div>`;
    }

    const btnSubir=i>0
      ?`<button class="cfg-vc-btn" onclick="moverCard('${c.id}',-1)"><span class="bi">↑</span><span>Subir</span></button><div class="cfg-vc-sep"></div>`
      :'';
    const btnDescer=i<n-1
      ?`<div class="cfg-vc-sep"></div><button class="cfg-vc-btn" onclick="moverCard('${c.id}',1)"><span class="bi">↓</span><span>Descer</span></button>`
      :'';

    return `<div class="cfg-vc-wrap" id="cfg-vc-${i}">
      <div class="cfg-vc${ativo?'':' inativo'}">
        ${preview}
        <div class="cfg-vc-bar">
          ${btnSubir}
          <button class="cfg-vc-btn editar" onclick="editarCard('${c.id}')"><span class="bi">✏️</span><span>Editar</span></button>
          <div class="cfg-vc-sep"></div>
          <button class="cfg-vc-btn${ativo?'':' oculto'}" onclick="toggleAtivoCard('${c.id}')"><span class="bi">${ativo?'👁':'🚫'}</span><span>${ativo?'Visível':'Oculto'}</span></button>
          ${btnDescer}
        </div>
      </div>
    </div>`;
  }).join('');
}

function rolarParaCard(i){
  const el=document.getElementById('cfg-vc-'+i);
  if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
}

function toggleAtivoCard(id){
  const cards=getCarouselCards();
  const c=cards.find(x=>x.id===id);
  if(!c)return;
  c.ativo=c.ativo===false?true:false;
  setCarouselCards(cards);
  renderCfgCards();
  renderCarousel();
}

function abrirModalCfg(id){
  _cfgEditId=id||null;
  // reset form
  document.getElementById('mcfg-label').textContent=id?'Editar Card':'Novo Card';
  document.getElementById('mcfg-titulo').value='';
  document.getElementById('mcfg-imagem').value='';
  document.getElementById('mcfg-video').value='';
  document.getElementById('mcfg-texto').value='';
  document.getElementById('mcfg-link').value='';
  document.getElementById('mcfg-ativo').classList.add('on');
  document.getElementById('mcfg-del-btn').style.display=id?'block':'none';
  _cfgCorSel='#0F1525';
  document.querySelectorAll('.mcfg-cor').forEach(c=>c.classList.toggle('sel',c.dataset.cor===_cfgCorSel));

  if(id){
    const c=getCarouselCards().find(x=>x.id===id);
    if(c){
      document.getElementById('mcfg-titulo').value=c.titulo||'';
      document.getElementById('mcfg-imagem').value=c.imagem||'';
      document.getElementById('mcfg-video').value=c.video||'';
      document.getElementById('mcfg-texto').value=c.texto||'';
      document.getElementById('mcfg-link').value=c.link||'';
      if(c.ativo===false) document.getElementById('mcfg-ativo').classList.remove('on');
      if(c.cor){ _cfgCorSel=c.cor; document.querySelectorAll('.mcfg-cor').forEach(x=>x.classList.toggle('sel',x.dataset.cor===c.cor)); }
      // selecionar tipo
      document.querySelectorAll('.mcfg-tipo').forEach(b=>{
        b.classList.toggle('sel',b.dataset.tipo===c.tipo);
      });
      mostrarCamposCfg(c.tipo||'imagem');
    }
  } else {
    document.querySelectorAll('.mcfg-tipo').forEach((b,i)=>b.classList.toggle('sel',i===0));
    mostrarCamposCfg('imagem');
  }
  document.getElementById('modal-cfg').classList.add('open');
}

function editarCard(id){ abrirModalCfg(id); }

function fecharModalCfg(){
  document.getElementById('modal-cfg').classList.remove('open');
  _cfgEditId=null;
}

function selecionarTipoCfg(btn){
  document.querySelectorAll('.mcfg-tipo').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');
  mostrarCamposCfg(btn.dataset.tipo);
}

function mostrarCamposCfg(tipo){
  document.getElementById('mcfg-f-imagem').style.display=tipo==='imagem'?'flex':'none';
  document.getElementById('mcfg-f-video').style.display=tipo==='video'?'flex':'none';
  document.getElementById('mcfg-f-texto').style.display=tipo==='texto'?'flex':'none';
}

function selecionarCor(el){
  document.querySelectorAll('.mcfg-cor').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  _cfgCorSel=el.dataset.cor;
}

function salvarCardCfg(){
  const tipoSel=document.querySelector('.mcfg-tipo.sel');
  const tipo=tipoSel?tipoSel.dataset.tipo:'imagem';
  const titulo=document.getElementById('mcfg-titulo').value.trim();
  const imagem=document.getElementById('mcfg-imagem').value.trim();
  const video=document.getElementById('mcfg-video').value.trim();
  const texto=document.getElementById('mcfg-texto').value.trim();
  const link=document.getElementById('mcfg-link').value.trim();
  const ativo=document.getElementById('mcfg-ativo').classList.contains('on');

  if(tipo==='imagem'&&!imagem&&!titulo){ document.getElementById('mcfg-imagem').focus(); return; }
  if(tipo==='video'&&!video){ document.getElementById('mcfg-video').focus(); return; }
  if(tipo==='texto'&&!texto&&!titulo){ document.getElementById('mcfg-texto').focus(); return; }

  const cards=getCarouselCards();
  const obj={
    id:_cfgEditId||(Date.now().toString(36)+Math.random().toString(36).slice(2,5)),
    tipo,titulo,imagem,video,texto,link,cor:_cfgCorSel,ativo,
    updatedAt:Date.now()
  };
  if(_cfgEditId){
    const idx=cards.findIndex(x=>x.id===_cfgEditId);
    if(idx>=0) cards[idx]=obj; else cards.push(obj);
  } else {
    obj.createdAt=Date.now();
    cards.push(obj);
  }
  setCarouselCards(cards);
  fecharModalCfg();
  renderCfgCards();
  renderCarousel();
}

function deletarCardCfg(){
  if(!_cfgEditId)return;
  if(!confirm('Excluir este card?'))return;
  const cards=getCarouselCards().filter(x=>x.id!==_cfgEditId);
  setCarouselCards(cards);
  fecharModalCfg();
  renderCfgCards();
  renderCarousel();
}

function moverCard(id,dir){
  const cards=getCarouselCards();
  const idx=cards.findIndex(x=>x.id===id);
  if(idx<0)return;
  const newIdx=idx+dir;
  if(newIdx<0||newIdx>=cards.length)return;
  [cards[idx],cards[newIdx]]=[cards[newIdx],cards[idx]];
  setCarouselCards(cards);
  renderCfgCards();
  renderCarousel();
}

// ── BIBLE REF SHEET ──────────────────────────────────────
const BREF_MAP={
  'At':'atos','Mt':'mt','Mc':'mc','Lc':'lc','Jo':'jo','Rm':'rm',
  '1Co':'1co','2Co':'2co','Gl':'gl','Ef':'ef','Fp':'fp','Cl':'cl',
  '1Ts':'1ts','2Ts':'2ts','1Tm':'1tm','2Tm':'2tm','Tt':'tt','Fm':'fm',
  'Hb':'hb','Tg':'tg','1Pe':'1pe','2Pe':'2pe','1Jo':'1jo','2Jo':'2jo',
  '3Jo':'3jo','Jd':'jd','Ap':'ap','Gn':'gn','Ex':'ex','Lv':'lv',
  'Nm':'nm','Dt':'dt','Js':'js','Jz':'jz','Rt':'rt','1Sm':'1sm',
  '2Sm':'2sm','1Rs':'1rs','2Rs':'2rs','1Cr':'1cr','2Cr':'2cr',
  'Ed':'ed','Ne':'ne','Et':'et','Jó':'jó','Sl':'sl','Pv':'pv',
  'Ec':'ec','Ct':'ct','Is':'is','Jr':'jr','Lm':'lm','Ez':'ez',
  'Dn':'dn','Os':'os','Jl':'jl','Am':'am','Ob':'ob','Jn':'jn',
  'Mq':'mq','Na':'na','Hc':'hc','Sf':'sf','Ag':'ag','Zc':'zc','Ml':'ml'
};
let _brefData=null;

function fecharRefSheet(){
  document.getElementById('ref-sheet').style.display='none';
  document.getElementById('ref-overlay').style.display='none';
}

function _parseSingleRef(token, lastBook){
  const t=token.trim();
  const mBook=t.match(/^((?:[123]\s*)?[A-ZÀ-ÚJó][a-záàâãéêíóôõúü]{0,5})\s+(\d+)[.](\d+)(?:[,\-](\d+))?/);
  const mOnly=t.match(/^(\d+)[.](\d+)(?:[,\-](\d+))?/);
  let bookRaw,cap,v1s,v2s;
  if(mBook){bookRaw=mBook[1].replace(/\s/g,'');cap=+mBook[2];v1s=mBook[3];v2s=mBook[4]||null;}
  else if(mOnly&&lastBook){bookRaw=lastBook;cap=+mOnly[1];v1s=mOnly[2];v2s=mOnly[3]||null;}
  else return null;
  const abbrev=BREF_MAP[bookRaw];
  if(!abbrev||!_brefData) return null;
  const livro=_brefData.find(x=>x.abbrev===abbrev);
  if(!livro) return null;
  const chapter=livro.chapters[cap-1];
  if(!chapter) return null;
  const v1=+v1s-1, v2=v2s?+v2s-1:v1;
  const isRange=t.includes('-')&&!t.includes(',');
  const verses=[];
  if(isRange){for(let i=v1;i<=Math.min(v2,chapter.length-1);i++){if(chapter[i])verses.push({n:i+1,t:chapter[i]});}}
  else{if(chapter[v1])verses.push({n:v1+1,t:chapter[v1]});if(v2!==v1&&chapter[v2])verses.push({n:v2+1,t:chapter[v2]});}
  return{label:livro.name+' '+cap,verses,bookRaw};
}

function mostrarRefSheet(refStr){
  const tokens=refStr.split(/;\s*/);
  let html='',lastBook=null;
  for(const tok of tokens){
    const r=_parseSingleRef(tok,lastBook);
    if(!r)continue;
    lastBook=r.bookRaw;
    html+=`<div style="margin-bottom:18px"><p style="font-weight:900;color:#1d3a8a;margin:0 0 8px;font-size:13px;letter-spacing:.5px">${r.label}</p>`;
    for(const v of r.verses){
      html+=`<p style="margin:0 0 8px;text-align:justify;font-family:Georgia,serif;font-size:15px;line-height:1.75;color:#1a1a1a"><sup style="color:#c9a14a;font-weight:900;font-size:10px">${v.n}</sup> ${v.t}</p>`;
    }
    html+='</div>';
  }
  if(!html)return;
  document.getElementById('ref-sheet-titulo').textContent=tokens.length>1?'Referências':'Referência';
  document.getElementById('ref-sheet-body').innerHTML=html;
  document.getElementById('ref-sheet').style.display='block';
  document.getElementById('ref-overlay').style.display='block';
}

window.addEventListener('message',function(e){
  if(!e.data||e.data.type!=='ebd-ref')return;
  const ref=e.data.ref;
  if(_brefData){mostrarRefSheet(ref);return;}
  fetch('/biblia.json').then(r=>r.json()).then(d=>{_brefData=d;mostrarRefSheet(ref);});
});

// ══════════════════════════════════════════════════════
// CRM 1 — ALUNOS EBD (admin)
// FLUXO: Lista → busca/filtro → item → modal → salvar/deletar/wpp
// STORAGE: ebd_alunos
// ══════════════════════════════════════════════════════
let _admAlunoFiltro = '';
function getAdmAlunos(){ return JSON.parse(localStorage.getItem('ebd_alunos')||'[]'); }
function setAdmAlunos(d){ localStorage.setItem('ebd_alunos', JSON.stringify(d)); }

function renderAdmAlunos(){
  const q = (document.getElementById('admAluno-busca')||{value:''}).value.toLowerCase();
  const lista = getAdmAlunos().filter(a=>{
    const matchQ = !q || a.nome.toLowerCase().includes(q) || (a.fone||'').includes(q);
    const matchT = !_admAlunoFiltro || a.turma===_admAlunoFiltro;
    return matchQ && matchT;
  });
  const el = document.getElementById('admAluno-lista');
  if(!el) return;
  if(!lista.length){ el.innerHTML='<div class="crm-empty">Nenhum aluno encontrado</div>'; return; }
  el.innerHTML = lista.map(a=>`
    <div class="crm-item" onclick="abrirModalAdmAluno('${a.id}')">
      <div class="crm-item-icon">👤</div>
      <div class="crm-item-body">
        <div class="crm-item-nome">${a.nome}</div>
        <div class="crm-item-sub">${a.turma||'Sem turma'}${a.fone?' · '+a.fone:''}</div>
      </div>
      <span class="crm-item-badge ${a.status==='ativo'?'badge-ativo':'badge-inativo'}">${a.status==='ativo'?'Ativo':'Inativo'}</span>
    </div>`).join('');
}

function filtrarAdmAluno(el, turma){
  _admAlunoFiltro = turma;
  document.querySelectorAll('#admAluno-chips .crm-chip').forEach(c=>c.classList.remove('ativo'));
  el.classList.add('ativo');
  renderAdmAlunos();
}

function abrirModalAdmAluno(id){
  const all = getAdmAlunos();
  const a = id ? all.find(x=>x.id===id) : null;
  document.getElementById('modal-admAluno-titulo').textContent = a ? 'Editar Aluno' : 'Novo Aluno';
  document.getElementById('admAluno-id').value = a?.id||'';
  document.getElementById('admAluno-nome').value = a?.nome||'';
  document.getElementById('admAluno-turma').value = a?.turma||'';
  document.getElementById('admAluno-fone').value = a?.fone||'';
  document.getElementById('admAluno-nasc').value = a?.nasc||'';
  document.getElementById('admAluno-resp').value = a?.resp||'';
  document.getElementById('admAluno-obs').value = a?.obs||'';
  document.getElementById('admAluno-status').value = a?.status||'ativo';
  document.getElementById('admAluno-btn-del').style.display = a ? '' : 'none';
  document.getElementById('admAluno-btn-wpp').style.display = a?.fone ? '' : 'none';
  document.getElementById('modal-admAluno-bg').classList.add('open');
}

function fecharModalAdmAluno(){
  document.getElementById('modal-admAluno-bg').classList.remove('open');
}

function salvarAdmAluno(){
  const nome = document.getElementById('admAluno-nome').value.trim();
  if(!nome){ alert('Informe o nome do aluno'); return; }
  const all = getAdmAlunos();
  const id = document.getElementById('admAluno-id').value;
  const obj = {
    id: id || 'a'+Date.now(),
    nome,
    turma: document.getElementById('admAluno-turma').value,
    fone: document.getElementById('admAluno-fone').value.trim(),
    nasc: document.getElementById('admAluno-nasc').value,
    resp: document.getElementById('admAluno-resp').value.trim(),
    obs: document.getElementById('admAluno-obs').value.trim(),
    status: document.getElementById('admAluno-status').value,
    criado: id ? (all.find(x=>x.id===id)||{}).criado : new Date().toISOString()
  };
  const idx = all.findIndex(x=>x.id===id);
  if(idx>=0) all[idx]=obj; else all.push(obj);
  setAdmAlunos(all);
  fecharModalAdmAluno();
  renderAdmAlunos();
}

function deletarAdmAluno(){
  const id = document.getElementById('admAluno-id').value;
  if(!id || !confirm('Excluir este aluno?')) return;
  setAdmAlunos(getAdmAlunos().filter(x=>x.id!==id));
  fecharModalAdmAluno();
  renderAdmAlunos();
}

function whatsappAdmAluno(){
  const fone = document.getElementById('admAluno-fone').value.replace(/\D/g,'');
  if(fone) window.open('https://wa.me/55'+fone);
}

// ══════════════════════════════════════════════════════
// CRM 2 — TURMAS
// FLUXO: Lista → clica → modal (nome/faixa/professor/sala/horário) → salvar/deletar
// STORAGE: radar_turmas
// ══════════════════════════════════════════════════════
function getTurmas(){ return JSON.parse(localStorage.getItem('radar_turmas')||'[]'); }
function setTurmas(d){ localStorage.setItem('radar_turmas', JSON.stringify(d)); }

function renderTurmas(){
  const lista = getTurmas();
  const el = document.getElementById('turma-lista');
  if(!el) return;
  if(!lista.length){ el.innerHTML='<div class="crm-empty">Nenhuma turma cadastrada</div>'; return; }
  el.innerHTML = lista.map(t=>{
    const alunos = getAdmAlunos().filter(a=>a.turma===t.nome).length;
    return `<div class="crm-item" onclick="abrirModalTurma('${t.id}')">
      <div class="crm-item-icon">🏫</div>
      <div class="crm-item-body">
        <div class="crm-item-nome">${t.nome}</div>
        <div class="crm-item-sub">${t.professor||'Sem professor'} · ${t.horario||''}</div>
      </div>
      <span class="crm-item-badge badge-turma">${alunos} alunos</span>
    </div>`;
  }).join('');
}

function abrirModalTurma(id){
  const all = getTurmas();
  const t = id ? all.find(x=>x.id===id) : null;
  document.getElementById('modal-turma-titulo').textContent = t ? 'Editar Turma' : 'Nova Turma';
  document.getElementById('turma-id').value = t?.id||'';
  document.getElementById('turma-nome').value = t?.nome||'';
  document.getElementById('turma-faixa').value = t?.faixa||'';
  document.getElementById('turma-professor').value = t?.professor||'';
  document.getElementById('turma-sala').value = t?.sala||'';
  document.getElementById('turma-horario').value = t?.horario||'';
  document.getElementById('turma-btn-del').style.display = t ? '' : 'none';
  document.getElementById('modal-turma-bg').classList.add('open');
}

function fecharModalTurma(){
  document.getElementById('modal-turma-bg').classList.remove('open');
}

function salvarTurma(){
  const nome = document.getElementById('turma-nome').value.trim();
  if(!nome){ alert('Informe o nome da turma'); return; }
  const all = getTurmas();
  const id = document.getElementById('turma-id').value;
  const obj = {
    id: id || 't'+Date.now(),
    nome,
    faixa: document.getElementById('turma-faixa').value.trim(),
    professor: document.getElementById('turma-professor').value.trim(),
    sala: document.getElementById('turma-sala').value.trim(),
    horario: document.getElementById('turma-horario').value.trim()
  };
  const idx = all.findIndex(x=>x.id===id);
  if(idx>=0) all[idx]=obj; else all.push(obj);
  setTurmas(all);
  fecharModalTurma();
  renderTurmas();
}

function deletarTurma(){
  const id = document.getElementById('turma-id').value;
  if(!id || !confirm('Excluir esta turma?')) return;
  setTurmas(getTurmas().filter(x=>x.id!==id));
  fecharModalTurma();
  renderTurmas();
}

// ══════════════════════════════════════════════════════
// CRM 3 — PRESENÇA
// FLUXO: Seleciona turma → seleciona data → lista alunos com toggle P/A/J → Salvar
// STORAGE: radar_presenca
// ══════════════════════════════════════════════════════
let _presencaMap = {};

function getPresenca(){ return JSON.parse(localStorage.getItem('radar_presenca')||'[]'); }
function setPresenca(d){ localStorage.setItem('radar_presenca', JSON.stringify(d)); }

function initPresenca(){
  const sel = document.getElementById('pres-turma-sel');
  if(!sel) return;
  const turmas = ['Adulto','Jovem','Adolescente','Infantil','Berçário'];
  sel.innerHTML = '<option value="">Selecionar turma...</option>' +
    turmas.map(t=>`<option>${t}</option>`).join('');
  const hoje = new Date().toISOString().slice(0,10);
  document.getElementById('pres-data').value = hoje;
}

function carregarChamada(){
  const turma = document.getElementById('pres-turma-sel').value;
  const data = document.getElementById('pres-data').value;
  const el = document.getElementById('pres-lista');
  const resumo = document.getElementById('pres-resumo');
  const salvarWrap = document.getElementById('pres-salvar-wrap');
  if(!turma || !data){ el.innerHTML='<div class="crm-empty">Selecione turma e data</div>'; resumo.textContent=''; return; }

  const alunos = getAdmAlunos().filter(a=>a.turma===turma && a.status==='ativo');
  if(!alunos.length){ el.innerHTML='<div class="crm-empty">Nenhum aluno ativo nesta turma</div>'; return; }

  // Carrega chamada salva se existir
  const registros = getPresenca();
  const chamadaSalva = registros.find(r=>r.turma===turma && r.data===data);
  _presencaMap = {};
  if(chamadaSalva) chamadaSalva.chamada.forEach(c=>{ _presencaMap[c.aluno_id]=c.status; });

  el.innerHTML = alunos.map(a=>{
    const st = _presencaMap[a.id]||'';
    return `<div class="pres-item">
      <div class="pres-nome">${a.nome}</div>
      <div class="pres-toggle">
        <button class="pres-btn p ${st==='P'?'sel':''}" onclick="setPres('${a.id}','P',this)">P</button>
        <button class="pres-btn a ${st==='A'?'sel':''}" onclick="setPres('${a.id}','A',this)">A</button>
        <button class="pres-btn j ${st==='J'?'sel':''}" onclick="setPres('${a.id}','J',this)">J</button>
      </div>
    </div>`;
  }).join('');

  atualizarResumoPres(alunos.length);
  salvarWrap.style.display='';
}

function setPres(id, status, btn){
  _presencaMap[id] = status;
  const item = btn.closest('.pres-item');
  item.querySelectorAll('.pres-btn').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');
  const total = document.querySelectorAll('.pres-item').length;
  atualizarResumoPres(total);
}

function atualizarResumoPres(total){
  const p = Object.values(_presencaMap).filter(v=>v==='P').length;
  const a = Object.values(_presencaMap).filter(v=>v==='A').length;
  const j = Object.values(_presencaMap).filter(v=>v==='J').length;
  const resumo = document.getElementById('pres-resumo');
  if(resumo) resumo.textContent = `Total: ${total} · ✅ ${p} presentes · ❌ ${a} ausentes · 📋 ${j} justificados`;
}

function salvarChamada(){
  const turma = document.getElementById('pres-turma-sel').value;
  const data = document.getElementById('pres-data').value;
  if(!turma || !data) return;
  const alunos = getAdmAlunos().filter(a=>a.turma===turma && a.status==='ativo');
  const chamada = alunos.map(a=>({ aluno_id:a.id, nome:a.nome, status:_presencaMap[a.id]||'A' }));
  const registros = getPresenca().filter(r=>!(r.turma===turma && r.data===data));
  registros.push({ id:'p'+Date.now(), turma, data, chamada, salvo: new Date().toISOString() });
  setPresenca(registros);
  alert('✅ Chamada salva com sucesso!');
}

// ══════════════════════════════════════════════════════
// CRM 4 — LIÇÕES
// FLUXO: Lista → filtro status → modal → publicar/rascunho/deletar
// STORAGE: radar_licoes
// ══════════════════════════════════════════════════════
let _licaoFiltro = '';
function getLicoes(){ return JSON.parse(localStorage.getItem('radar_licoes')||'[]'); }
function setLicoes(d){ localStorage.setItem('radar_licoes', JSON.stringify(d)); }

function renderLicoes(){
  const lista = getLicoes().filter(l=> !_licaoFiltro || l.status===_licaoFiltro)
    .sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  const el = document.getElementById('licao-lista');
  if(!el) return;
  if(!lista.length){ el.innerHTML='<div class="crm-empty">Nenhuma lição encontrada</div>'; return; }
  el.innerHTML = lista.map(l=>`
    <div class="crm-item" onclick="abrirModalLicao('${l.id}')">
      <div class="crm-item-icon">📝</div>
      <div class="crm-item-body">
        <div class="crm-item-nome">${l.titulo}</div>
        <div class="crm-item-sub">${l.turma||'Geral'} · ${l.data||'sem data'}</div>
      </div>
      <span class="crm-item-badge ${l.status==='publicado'?'badge-ativo':'badge-inativo'}">${l.status==='publicado'?'Publicado':'Rascunho'}</span>
    </div>`).join('');
}

function filtrarLicao(el, status){
  _licaoFiltro = status;
  document.querySelectorAll('#licao-chips .crm-chip').forEach(c=>c.classList.remove('ativo'));
  el.classList.add('ativo');
  renderLicoes();
}

function abrirModalLicao(id){
  const all = getLicoes();
  const l = id ? all.find(x=>x.id===id) : null;
  document.getElementById('modal-licao-titulo').textContent = l ? 'Editar Lição' : 'Nova Lição';
  document.getElementById('licao-id').value = l?.id||'';
  document.getElementById('licao-titulo').value = l?.titulo||'';
  document.getElementById('licao-turma').value = l?.turma||'Geral';
  document.getElementById('licao-data').value = l?.data||'';
  document.getElementById('licao-link').value = l?.link||'';
  document.getElementById('licao-ppt').value = l?.ppt||'';
  document.getElementById('licao-apoio').value = l?.apoio||'';
  document.getElementById('licao-status').value = l?.status||'rascunho';
  document.getElementById('licao-btn-del').style.display = l ? '' : 'none';
  document.getElementById('modal-licao-bg').classList.add('open');
}

function fecharModalLicao(){
  document.getElementById('modal-licao-bg').classList.remove('open');
}

function salvarLicao(){
  const titulo = document.getElementById('licao-titulo').value.trim();
  if(!titulo){ alert('Informe o título da lição'); return; }
  const all = getLicoes();
  const id = document.getElementById('licao-id').value;
  const obj = {
    id: id || 'l'+Date.now(),
    titulo,
    turma: document.getElementById('licao-turma').value,
    data: document.getElementById('licao-data').value,
    link: document.getElementById('licao-link').value.trim(),
    ppt: document.getElementById('licao-ppt').value.trim(),
    apoio: document.getElementById('licao-apoio').value.trim(),
    status: document.getElementById('licao-status').value
  };
  const idx = all.findIndex(x=>x.id===id);
  if(idx>=0) all[idx]=obj; else all.push(obj);
  setLicoes(all);
  fecharModalLicao();
  renderLicoes();
}

function deletarLicao(){
  const id = document.getElementById('licao-id').value;
  if(!id || !confirm('Excluir esta lição?')) return;
  setLicoes(getLicoes().filter(x=>x.id!==id));
  fecharModalLicao();
  renderLicoes();
}

// ══════════════════════════════════════════════════════
// CRM 5 — EVENTOS ADMIN
// FLUXO: Lista → modal → salvar/deletar/wpp lembrete
// STORAGE: radar_eventos (chave já existente)
// ══════════════════════════════════════════════════════
let _evAdmFiltro = '';
function getEvAdm(){ return JSON.parse(localStorage.getItem('radar_eventos')||'[]'); }
function setEvAdm(d){ localStorage.setItem('radar_eventos', JSON.stringify(d)); }

function renderEvAdm(){
  const lista = getEvAdm()
    .filter(e=> !_evAdmFiltro || e.tipo===_evAdmFiltro)
    .sort((a,b)=>(a.data||'').localeCompare(b.data||''));
  const el = document.getElementById('evadm-lista');
  if(!el) return;
  if(!lista.length){ el.innerHTML='<div class="crm-empty">Nenhum evento cadastrado</div>'; return; }
  const hoje = new Date().toISOString().slice(0,10);
  el.innerHTML = lista.map(e=>{
    const passado = e.data && e.data < hoje;
    return `<div class="crm-item" onclick="abrirModalEvAdm('${e.id}')">
      <div class="crm-item-icon">📅</div>
      <div class="crm-item-body">
        <div class="crm-item-nome">${e.titulo||e.nome||'Evento'}</div>
        <div class="crm-item-sub">${e.data||'sem data'}${e.hora?' '+e.hora:''} · ${e.local||''}</div>
      </div>
      <span class="crm-item-badge ${passado?'badge-inativo':'badge-ativo'}">${passado?'Encerrado':'Próximo'}</span>
    </div>`;
  }).join('');
}

function filtrarEvAdm(el, tipo){
  _evAdmFiltro = tipo;
  document.querySelectorAll('#tela-adm-eventos-adm .crm-chips .crm-chip').forEach(c=>c.classList.remove('ativo'));
  el.classList.add('ativo');
  renderEvAdm();
}

function abrirModalEvAdm(id){
  const all = getEvAdm();
  const e = id ? all.find(x=>x.id===id) : null;
  document.getElementById('modal-evadm-titulo').textContent = e ? 'Editar Evento' : 'Novo Evento';
  document.getElementById('evadm-id').value = e?.id||'';
  document.getElementById('evadm-titulo').value = e?.titulo||e?.nome||'';
  document.getElementById('evadm-data').value = e?.data||'';
  document.getElementById('evadm-hora').value = e?.hora||'';
  document.getElementById('evadm-local').value = e?.local||'';
  document.getElementById('evadm-tipo').value = e?.tipo||'culto';
  document.getElementById('evadm-desc').value = e?.desc||e?.descricao||'';
  document.getElementById('evadm-btn-del').style.display = e ? '' : 'none';
  document.getElementById('modal-evadm-bg').classList.add('open');
}

function fecharModalEvAdm(){
  document.getElementById('modal-evadm-bg').classList.remove('open');
}

function salvarEvAdm(){
  const titulo = document.getElementById('evadm-titulo').value.trim();
  if(!titulo){ alert('Informe o título do evento'); return; }
  const all = getEvAdm();
  const id = document.getElementById('evadm-id').value;
  const obj = {
    id: id || 'e'+Date.now(),
    titulo,
    nome: titulo,
    data: document.getElementById('evadm-data').value,
    hora: document.getElementById('evadm-hora').value,
    local: document.getElementById('evadm-local').value.trim(),
    tipo: document.getElementById('evadm-tipo').value,
    desc: document.getElementById('evadm-desc').value.trim()
  };
  const idx = all.findIndex(x=>x.id===id);
  if(idx>=0) all[idx]=obj; else all.push(obj);
  setEvAdm(all);
  fecharModalEvAdm();
  renderEvAdm();
}

function deletarEvAdm(){
  const id = document.getElementById('evadm-id').value;
  if(!id || !confirm('Excluir este evento?')) return;
  setEvAdm(getEvAdm().filter(x=>x.id!==id));
  fecharModalEvAdm();
  renderEvAdm();
}

function whatsappEvAdm(){
  const titulo = document.getElementById('evadm-titulo').value;
  const data = document.getElementById('evadm-data').value;
  const hora = document.getElementById('evadm-hora').value;
  const local = document.getElementById('evadm-local').value;
  const desc = document.getElementById('evadm-desc').value;
  const txt = `📅 *${titulo}*\n📆 Data: ${data}${hora?' às '+hora:''}\n📍 Local: ${local}\n\n${desc}`.trim();
  window.open('https://wa.me/?text='+encodeURIComponent(txt));
}

// ══════════════════════════════════════════════════════
// CRM 6 — CONTEÚDOS
// FLUXO: Lista por tipo → modal → toggle ativo/deletar
// STORAGE: radar_conteudos
// ══════════════════════════════════════════════════════
let _conteudoFiltro = '';
function getConteudos(){ return JSON.parse(localStorage.getItem('radar_conteudos')||'[]'); }
function setConteudos(d){ localStorage.setItem('radar_conteudos', JSON.stringify(d)); }

const _tipoIcone = {aviso:'📢',versiculo:'📖',banner:'🖼️',outro:'📌'};

function renderConteudos(){
  const lista = getConteudos().filter(c=> !_conteudoFiltro || c.tipo===_conteudoFiltro);
  const el = document.getElementById('conteudo-lista');
  if(!el) return;
  if(!lista.length){ el.innerHTML='<div class="crm-empty">Nenhum conteúdo encontrado</div>'; return; }
  el.innerHTML = lista.map(c=>`
    <div class="crm-item" onclick="abrirModalConteudo('${c.id}')">
      <div class="crm-item-icon">${_tipoIcone[c.tipo]||'📌'}</div>
      <div class="crm-item-body">
        <div class="crm-item-nome">${c.titulo||'Sem título'}</div>
        <div class="crm-item-sub">${c.texto?c.texto.slice(0,60)+'...':''}</div>
      </div>
      <span class="crm-item-badge ${c.ativo?'badge-ativo':'badge-inativo'}">${c.ativo?'Ativo':'Inativo'}</span>
    </div>`).join('');
}

function filtrarConteudo(el, tipo){
  _conteudoFiltro = tipo;
  document.querySelectorAll('#tela-adm-conteudos .crm-chips .crm-chip').forEach(c=>c.classList.remove('ativo'));
  el.classList.add('ativo');
  renderConteudos();
}

function abrirModalConteudo(id){
  const all = getConteudos();
  const c = id ? all.find(x=>x.id===id) : null;
  document.getElementById('modal-conteudo-titulo').textContent = c ? 'Editar Conteúdo' : 'Novo Conteúdo';
  document.getElementById('conteudo-id').value = c?.id||'';
  document.getElementById('conteudo-tipo').value = c?.tipo||'aviso';
  document.getElementById('conteudo-titulo-inp').value = c?.titulo||'';
  document.getElementById('conteudo-texto').value = c?.texto||'';
  document.getElementById('conteudo-link').value = c?.link||'';
  document.getElementById('conteudo-ativo').value = c?.ativo ? '1' : '0';
  document.getElementById('conteudo-btn-del').style.display = c ? '' : 'none';
  document.getElementById('modal-conteudo-bg').classList.add('open');
}

function fecharModalConteudo(){
  document.getElementById('modal-conteudo-bg').classList.remove('open');
}

function salvarConteudo(){
  const titulo = document.getElementById('conteudo-titulo-inp').value.trim();
  if(!titulo){ alert('Informe o título'); return; }
  const all = getConteudos();
  const id = document.getElementById('conteudo-id').value;
  const obj = {
    id: id || 'c'+Date.now(),
    tipo: document.getElementById('conteudo-tipo').value,
    titulo,
    texto: document.getElementById('conteudo-texto').value.trim(),
    link: document.getElementById('conteudo-link').value.trim(),
    ativo: document.getElementById('conteudo-ativo').value==='1'
  };
  const idx = all.findIndex(x=>x.id===id);
  if(idx>=0) all[idx]=obj; else all.push(obj);
  setConteudos(all);
  fecharModalConteudo();
  renderConteudos();
}

function deletarConteudo(){
  const id = document.getElementById('conteudo-id').value;
  if(!id || !confirm('Excluir este conteúdo?')) return;
  setConteudos(getConteudos().filter(x=>x.id!==id));
  fecharModalConteudo();
  renderConteudos();
}

// ══════════════════════════════════════════════════════
// CRM 7 — COMUNICAÇÃO
// FLUXO: escolhe destino → compõe → preview → copiar/wpp
// SEM STORAGE (ferramenta de envio)
// ══════════════════════════════════════════════════════
function atualizarPreviewCom(){
  const dest = document.querySelector('input[name="com-dest"]:checked');
  const turma = document.getElementById('com-turma-sel').value;
  const msg = document.getElementById('com-mensagem').value.trim();
  const preview = document.getElementById('com-preview');
  if(!preview) return;

  let destinatarios = [];
  if(dest?.value==='todos') destinatarios = getAdmAlunos().filter(a=>a.status==='ativo').map(a=>a.nome);
  else if(dest?.value==='turma' && turma) destinatarios = getAdmAlunos().filter(a=>a.turma===turma && a.status==='ativo').map(a=>a.nome);
  else if(dest?.value==='visitantes') destinatarios = (JSON.parse(localStorage.getItem('radar_visitantes')||'[]')).filter(v=>v.status==='ativo').map(v=>v.nome);

  if(!dest || !msg){ preview.textContent='Preencha os campos acima para ver o preview.'; return; }

  const texto = `${msg}\n\n👥 Para: ${destinatarios.length} ${dest.value==='visitantes'?'visitantes':'alunos'}${turma?' ('+turma+')':''}\n📋 Lista: ${destinatarios.slice(0,5).join(', ')}${destinatarios.length>5?' e mais '+( destinatarios.length-5):''}`;
  preview.textContent = texto;
}

function copiarMensagemCom(){
  const msg = document.getElementById('com-mensagem').value.trim();
  if(!msg){ alert('Escreva uma mensagem primeiro'); return; }
  navigator.clipboard.writeText(msg).then(()=>alert('✅ Mensagem copiada!')).catch(()=>{
    const el=document.createElement('textarea');el.value=msg;document.body.appendChild(el);el.select();document.execCommand('copy');el.remove();alert('✅ Copiado!');
  });
}

function enviarWppCom(){
  const msg = document.getElementById('com-mensagem').value.trim();
  if(!msg){ alert('Escreva uma mensagem primeiro'); return; }
  window.open('https://wa.me/?text='+encodeURIComponent(msg));
}

// ══════════════════════════════════════════════════════
// CRM 8 — RELATÓRIOS
// FLUXO: Cards de resumo (lê todos os dados) → copiar seção
// SEM STORAGE (lê dados existentes)
// ══════════════════════════════════════════════════════
function renderRelatorios(){
  const el = document.getElementById('relatorios-corpo');
  if(!el) return;

  const alunos = getAdmAlunos();
  const visitantes = JSON.parse(localStorage.getItem('radar_visitantes')||'[]');
  const presenca = getPresenca();
  const eventos = getEvAdm();
  const licoes = getLicoes();

  const hoje = new Date().toISOString().slice(0,10);
  const evProximos = eventos.filter(e=>e.data>=hoje).length;

  // Frequência última chamada
  const ultimaChamada = presenca.sort((a,b)=>b.data.localeCompare(a.data))[0];
  let freqStr = 'Sem registros';
  if(ultimaChamada){
    const p = ultimaChamada.chamada.filter(c=>c.status==='P').length;
    const tot = ultimaChamada.chamada.length;
    freqStr = `${p}/${tot} (${Math.round(p/tot*100)||0}%) em ${ultimaChamada.turma} — ${ultimaChamada.data}`;
  }

  // Turmas
  const turmasAtivas = [...new Set(alunos.map(a=>a.turma).filter(Boolean))];

  el.innerHTML = `
    <div class="crm-section-title">ALUNOS EBD</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      ${card('👥','Total',''+alunos.length,'alunos')}
      ${card('✅','Ativos',''+alunos.filter(a=>a.status==='ativo').length,'alunos')}
      ${card('🏫','Turmas',''+turmasAtivas.length,'ativas')}
      ${card('❌','Inativos',''+alunos.filter(a=>a.status!=='ativo').length,'alunos')}
    </div>

    <div class="crm-section-title">VISITANTES</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      ${card('🙋','Total',''+visitantes.length,'visitantes')}
      ${card('🔥','Acompanhar',''+visitantes.filter(v=>v.status==='ativo').length,'em acomp.')}
      ${card('✨','Retornaram',''+visitantes.filter(v=>v.status==='retornou').length,'convertidos')}
    </div>

    <div class="crm-section-title">ÚLTIMA FREQUÊNCIA</div>
    <div style="background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:16px;font-size:13px;color:var(--txt)">${freqStr}</div>

    <div class="crm-section-title">AGENDA</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      ${card('📅','Próximos',''+evProximos,'eventos')}
      ${card('📝','Lições',''+licoes.filter(l=>l.status==='publicado').length,'publicadas')}
    </div>

    <button onclick="copiarRelatorio()" style="width:100%;background:rgba(201,161,74,.12);border:1px solid rgba(201,161,74,.3);border-radius:12px;padding:13px;font-size:13px;font-weight:800;color:var(--gold);cursor:pointer;font-family:inherit">📋 Copiar resumo para WhatsApp</button>
  `;

  function card(icon,label,val,sub){
    return `<div style="background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:22px;margin-bottom:4px">${icon}</div>
      <div style="font-size:20px;font-weight:900;color:var(--gold)">${val}</div>
      <div style="font-size:10px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">${label}</div>
      <div style="font-size:10px;color:var(--sub)">${sub}</div>
    </div>`;
  }
}

function copiarRelatorio(){
  const alunos = getAdmAlunos();
  const visitantes = JSON.parse(localStorage.getItem('radar_visitantes')||'[]');
  const txt = `📊 *RELATÓRIO RADAR*\n\n` +
    `👥 Alunos EBD: ${alunos.filter(a=>a.status==='ativo').length} ativos / ${alunos.length} total\n` +
    `🙋 Visitantes: ${visitantes.filter(v=>v.status==='ativo').length} em acompanhamento\n` +
    `📅 Data: ${new Date().toLocaleDateString('pt-BR')}`;
  navigator.clipboard.writeText(txt).then(()=>alert('✅ Copiado!')).catch(()=>{
    const el=document.createElement('textarea');el.value=txt;document.body.appendChild(el);el.select();document.execCommand('copy');el.remove();alert('✅ Copiado!');
  });
}

// ══════════════════════════════════════════════════════
// CRM 9 — USUÁRIOS
// FLUXO: Lista por nível → modal (nome/contato/nível/status) → salvar/deletar
// STORAGE: radar_usuarios
// ══════════════════════════════════════════════════════
let _usuarioFiltro = '';
function getUsuarios(){ return JSON.parse(localStorage.getItem('radar_usuarios')||'[]'); }
function setUsuarios(d){ localStorage.setItem('radar_usuarios', JSON.stringify(d)); }

const _nivelIcon = {admin:'👑',editor:'✏️',professor:'🎓',secretaria:'📋'};

function renderUsuarios(){
  const lista = getUsuarios().filter(u=> !_usuarioFiltro || u.nivel===_usuarioFiltro);
  const el = document.getElementById('usuario-lista');
  if(!el) return;
  if(!lista.length){ el.innerHTML='<div class="crm-empty">Nenhum usuário cadastrado</div>'; return; }
  el.innerHTML = lista.map(u=>`
    <div class="crm-item" onclick="abrirModalUsuario('${u.id}')">
      <div class="crm-item-icon">${_nivelIcon[u.nivel]||'👤'}</div>
      <div class="crm-item-body">
        <div class="crm-item-nome">${u.nome}</div>
        <div class="crm-item-sub">${u.contato||''} · ${u.nivel||''}</div>
      </div>
      <span class="crm-item-badge ${u.status==='ativo'?'badge-ativo':'badge-inativo'}">${u.status==='ativo'?'Ativo':'Inativo'}</span>
    </div>`).join('');
}

function filtrarUsuario(el, nivel){
  _usuarioFiltro = nivel;
  document.querySelectorAll('#tela-adm-usuarios .crm-chips .crm-chip').forEach(c=>c.classList.remove('ativo'));
  el.classList.add('ativo');
  renderUsuarios();
}

function abrirModalUsuario(id){
  const all = getUsuarios();
  const u = id ? all.find(x=>x.id===id) : null;
  document.getElementById('modal-usuario-titulo').textContent = u ? 'Editar Usuário' : 'Novo Usuário';
  document.getElementById('usuario-id').value = u?.id||'';
  document.getElementById('usuario-nome').value = u?.nome||'';
  document.getElementById('usuario-contato').value = u?.contato||'';
  document.getElementById('usuario-nivel').value = u?.nivel||'professor';
  document.getElementById('usuario-status').value = u?.status||'ativo';
  document.getElementById('usuario-btn-del').style.display = u ? '' : 'none';
  document.getElementById('modal-usuario-bg').classList.add('open');
}

function fecharModalUsuario(){
  document.getElementById('modal-usuario-bg').classList.remove('open');
}

function salvarUsuario(){
  const nome = document.getElementById('usuario-nome').value.trim();
  if(!nome){ alert('Informe o nome'); return; }
  const all = getUsuarios();
  const id = document.getElementById('usuario-id').value;
  const obj = {
    id: id || 'u'+Date.now(),
    nome,
    contato: document.getElementById('usuario-contato').value.trim(),
    nivel: document.getElementById('usuario-nivel').value,
    status: document.getElementById('usuario-status').value
  };
  const idx = all.findIndex(x=>x.id===id);
  if(idx>=0) all[idx]=obj; else all.push(obj);
  setUsuarios(all);
  fecharModalUsuario();
  renderUsuarios();
}

function deletarUsuario(){
  const id = document.getElementById('usuario-id').value;
  if(!id || !confirm('Excluir este usuário?')) return;
  setUsuarios(getUsuarios().filter(x=>x.id!==id));
  fecharModalUsuario();
  renderUsuarios();
}

// ══ HOOK DE INIT — chama render ao entrar em cada tela CRM ══
const _crmInitMap = {
  'tela-adm-alunos': ()=>renderAdmAlunos(),
  'tela-adm-turmas': ()=>renderTurmas(),
  'tela-adm-presenca': ()=>initPresenca(),
  'tela-adm-licoes': ()=>renderLicoes(),
  'tela-adm-eventos-adm': ()=>renderEvAdm(),
  'tela-adm-conteudos': ()=>renderConteudos(),
  'tela-adm-relatorios': ()=>renderRelatorios(),
  'tela-adm-usuarios': ()=>renderUsuarios(),
};

/* ════════════════════════════════════════════════════════════════════════════
   MODO SEM INTERNET — o irmão no ônibus, no porão do templo, no interior.
   Três coisas: (1) diz na tela quando está sem rede e o que ainda funciona,
   (2) deixa ele BAIXAR o conteúdo pesado de propósito, com tamanho e progresso,
   (3) nunca deixa um botão morrer calado.
   O pacote mora num cache separado do shell: subir a versão do app NÃO apaga
   os MB que ele baixou com o plano de dados dele.
   ════════════════════════════════════════════════════════════════════════════ */
(function(){
  var PACOTE='radar-pacote-v1';
  var MARCA='radar_pacote_ok';           // carimbo local: pacote já baixado
  var baixando=false;

  function temCache(){ return ('caches' in window); }
  function esta(n){ return document.getElementById(n); }
  function mb(b){ return (b/1048576).toFixed(1).replace('.',',')+' MB'; }

  /* ── o que entra no pacote ────────────────────────────────────────────────
     Lista montada na hora a partir dos índices de Mensagens e Sermões: quando
     o Elias publicar mensagem nova, ela entra no pacote sozinha — ninguém
     precisa lembrar de mexer aqui. */
  var FIXOS=[
    '/',                                  // a casa
    '/capa.jpg',                          // splash
    '/biblia.json',                       // O CORAÇÃO — a Bíblia inteira
    '/harpa.json',                        // 640 hinos
    '/ebd/previa.json',
    '/_pregado.js',                       // usado pelas páginas de mensagem
    '/busca/mensagens.idx.json',          // dá busca por palavra offline
    // ATENÇÃO: o app navega para a PASTA ('/biblioteca/mensagens/'), não para
    // o index.html. Chave de cache é a URL inteira — guardar só o index.html
    // deixaria a lista de mensagens sem abrir offline. Guardamos as duas formas.
    '/biblioteca/busca/',            '/biblioteca/busca/index.html',
    '/biblioteca/mensagens/',        '/biblioteca/mensagens/index.html',
    '/biblioteca/mensagens/_leitura.js',
    '/biblioteca/mensagens/_lupa.js',
    '/biblioteca/mensagens/_refs.js',
    '/biblioteca/sermoes/',          '/biblioteca/sermoes/index.html',
    '/biblioteca/sermoes/_sermao.js'
  ];

  function lerIndice(url, base){
    return fetch(url).then(function(r){ if(!r.ok) throw 0; return r.text(); }).then(function(t){
      var out=[], re=/arquivo\s*:\s*['"]([^'"]+\.html)['"]/g, m;
      while((m=re.exec(t))) out.push(base+m[1]);
      return out;
    }).catch(function(){ return []; });
  }

  function licoesDaVez(){
    var n=0; try{ n=(typeof licaoDaSemana==='function')?licaoDaSemana():0; }catch(e){}
    if(!(n>=1)) return [];
    var out=[];
    ['adulto','jovem','adulto4','jovem4'].forEach(function(t){
      [n-1,n,n+1].forEach(function(k){
        if(k<1||k>13) return;
        var nn=(k<10?'0':'')+k;
        out.push('/ebd/'+t+'/html/licao-'+nn+'.html');
        out.push('/ebd/'+t+'/html/apoio-'+nn+'.html');
      });
    });
    return out;   // o que não existir dá 404 e é pulado — não quebra o pacote
  }

  function montarLista(){
    return Promise.all([
      lerIndice('/biblioteca/mensagens/index.html','/biblioteca/mensagens/'),
      lerIndice('/biblioteca/sermoes/index.html','/biblioteca/sermoes/')
    ]).then(function(r){
      var todos=FIXOS.concat(r[0]).concat(r[1]).concat(licoesDaVez());
      var vistos={}, lim=[];
      todos.forEach(function(u){ if(!vistos[u]){ vistos[u]=1; lim.push(u); } });
      return lim;
    });
  }

  /* ── baixar ─────────────────────────────────────────────────────────────── */
  function baixarPacote(){
    if(baixando || !temCache()) return;
    if(!navigator.onLine){ pintarPainel('sem-rede'); return; }
    baixando=true; pintarPainel('baixando',{feitos:0,total:0,bytes:0});
    var cache, lista, bytes=0, feitos=0, falhas=0;

    caches.open(PACOTE).then(function(c){ cache=c; return montarLista(); }).then(function(l){
      lista=l;
      pintarPainel('baixando',{feitos:0,total:lista.length,bytes:0});
      var fila=lista.slice(), ativos=0, POR_VEZ=4;

      return new Promise(function(pronto){
        function proximo(){
          if(!fila.length){ if(ativos===0) pronto(); return; }
          var u=fila.shift(); ativos++;
          fetch(u,{cache:'reload'}).then(function(r){
            if(!r||!r.ok) throw 0;
            bytes+=(+(r.headers.get('content-length')||0));
            return cache.put(u,r);
          }).catch(function(){ falhas++; }).then(function(){
            ativos--; feitos++;
            pintarPainel('baixando',{feitos:feitos,total:lista.length,bytes:bytes});
            proximo();
          });
        }
        for(var i=0;i<POR_VEZ;i++) proximo();
      });
    }).then(function(){
      baixando=false;
      try{ localStorage.setItem(MARCA,JSON.stringify({em:Date.now(),arquivos:feitos-falhas,bytes:bytes})); }catch(e){}
      pintarPainel('pronto',{arquivos:feitos-falhas,bytes:bytes});
    })['catch'](function(){
      baixando=false;
      pintarPainel('falhou');
    });
  }

  function apagarPacote(){
    if(!temCache()) return;
    if(!confirm('Apagar o conteúdo guardado no aparelho? O app volta a precisar de internet para a Bíblia, as mensagens e os sermões.')) return;
    caches['delete'](PACOTE).then(function(){
      try{ localStorage.removeItem(MARCA); }catch(e){}
      pintarPainel('novo');
    });
  }

  function jaBaixado(){
    try{ return JSON.parse(localStorage.getItem(MARCA)||'null'); }catch(e){ return null; }
  }

  /* ── o painel na home ───────────────────────────────────────────────────── */
  function criarPainel(){
    var alvo=document.querySelector('#home .home-scroll');
    if(!alvo || esta('off-painel')) return null;
    var d=document.createElement('div');
    d.id='off-painel';
    d.style.cssText='margin:14px 14px 22px;padding:15px 15px 16px;border-radius:16px;'
      +'background:linear-gradient(160deg,#16222f,#101821);border:1px solid rgba(201,161,74,.28);'
      +'box-shadow:0 10px 26px rgba(0,0,0,.28);font-size:14px;line-height:1.5;color:#e8eef5';
    alvo.appendChild(d);
    return d;
  }

  function pintarPainel(estado, info){
    var d=esta('off-painel')||criarPainel(); if(!d) return;
    info=info||{};
    var topo='<div style="display:flex;align-items:center;gap:9px;margin-bottom:9px">'
      +'<span style="font-size:20px">📥</span>'
      +'<b style="font-size:15px;color:#C9A14A">Usar o RADAR sem internet</b></div>';
    var bt='background:#C9A14A;color:#15202b;border:none;border-radius:11px;padding:12px 16px;'
      +'font-weight:800;font-size:14.5px;font-family:inherit;cursor:pointer;width:100%;margin-top:11px';

    if(estado==='baixando'){
      var pc=info.total?Math.round(info.feitos/info.total*100):0;
      d.innerHTML=topo
        +'<div style="color:#9fb0bd">Guardando no aparelho… <b style="color:#e8eef5">'+pc+'%</b>'
        +(info.total?' · '+info.feitos+' de '+info.total+' arquivos':'')
        +(info.bytes?' · '+mb(info.bytes):'')+'</div>'
        +'<div style="height:8px;background:#0a0c10;border-radius:5px;overflow:hidden;margin-top:9px">'
        +'<i style="display:block;height:100%;width:'+pc+'%;background:#C9A14A;transition:width .25s"></i></div>'
        +'<div style="color:#7f8c99;font-size:12.5px;margin-top:8px">Pode deixar o app aberto. É só desta vez.</div>';
      return;
    }
    if(estado==='pronto'){
      d.innerHTML=topo
        +'<div style="color:#34c77b"><b>✅ Pronto.</b> Bíblia, Harpa, mensagens e sermões estão no seu aparelho'
        +(info.bytes?' ('+mb(info.bytes)+')':'')+'.</div>'
        +'<div style="color:#9fb0bd;font-size:13px;margin-top:7px">Pode ficar sem sinal que eles abrem do mesmo jeito. '
        +'Continuam pedindo internet: Concílio, geradores de mensagem e sermão, busca por significado, vídeos e o quiz.</div>'
        +'<button style="'+bt+';background:#233244;color:#c7d3de" onclick="radarBaixarPacote()">🔄 Atualizar o conteúdo guardado</button>'
        +'<button style="'+bt+';background:none;color:#7f8c99;border:1px solid #2b3a4a;margin-top:7px" onclick="radarApagarPacote()">🗑️ Apagar e liberar espaço</button>';
      return;
    }
    if(estado==='falhou'){
      d.innerHTML=topo
        +'<div style="color:#e06b6b">Não consegui terminar o download agora.</div>'
        +'<button style="'+bt+'" onclick="radarBaixarPacote()">Tentar de novo</button>';
      return;
    }
    if(estado==='sem-rede'){
      d.innerHTML=topo
        +'<div style="color:#e0a76b">Você está sem internet agora. Para guardar o conteúdo preciso de rede uma vez só.</div>'
        +'<button style="'+bt+'" onclick="radarBaixarPacote()">Tentar de novo</button>';
      return;
    }
    d.innerHTML=topo
      +'<div style="color:#9fb0bd">Baixe uma vez e leia a <b style="color:#e8eef5">Bíblia inteira</b>, a <b style="color:#e8eef5">Harpa</b>, '
      +'as <b style="color:#e8eef5">mensagens</b>, os <b style="color:#e8eef5">sermões</b> e a <b style="color:#e8eef5">lição da EBD</b> '
      +'sem gastar mais nada de internet.</div>'
      +'<div style="color:#7f8c99;font-size:12.5px;margin-top:7px">São cerca de <b style="color:#c7d3de">5,5 MB</b>. '
      +'Faça no wi-fi se o seu plano for curto.</div>'
      +'<button style="'+bt+'" onclick="radarBaixarPacote()">📥 Deixar disponível sem internet</button>';
  }

  /* ── a tarja de "você está sem internet" ────────────────────────────────── */
  function tarja(){
    var t=esta('off-tarja');
    if(navigator.onLine){ if(t) t.remove(); return; }
    if(t) return;
    t=document.createElement('div');
    t.id='off-tarja';
    t.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99998;background:#3a2a12;'
      +'color:#f0d9a8;border-top:1px solid #C9A14A;padding:9px 14px;font-size:13px;line-height:1.45;'
      +'display:flex;align-items:center;gap:10px;font-family:inherit';
    t.innerHTML='<span style="font-size:17px">📡</span>'
      +'<span style="flex:1"><b>Sem internet.</b> <span id="off-tarja-txt"></span></span>'
      +'<button onclick="this.parentNode.remove()" '
      +'style="background:none;border:none;color:#f0d9a8;font-size:19px;cursor:pointer;padding:0 4px">&times;</button>';
    document.body.appendChild(t);
    var p=jaBaixado();
    var tx=esta('off-tarja-txt');
    if(tx) tx.innerHTML = p
      ? 'Bíblia, Harpa, mensagens e sermões abrem normal. Concílio, geradores e vídeos voltam com o sinal.'
      : 'Funciona o que você já abriu antes. Para ter a Bíblia sempre, toque em <b>“Deixar disponível sem internet”</b> na tela inicial quando pegar sinal.';
  }

  window.radarBaixarPacote=baixarPacote;
  window.radarApagarPacote=apagarPacote;
  window.radarPacoteOk=function(){ return !!jaBaixado(); };

  window.addEventListener('online',function(){ tarja(); });
  window.addEventListener('offline',function(){ tarja(); });

  function iniciar(){
    if(!temCache()) return;
    caches.has(PACOTE).then(function(tem){
      var p=jaBaixado();
      pintarPainel(tem&&p?'pronto':'novo', p||{});
    })['catch'](function(){ pintarPainel('novo'); });
    tarja();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar);
  else setTimeout(iniciar,60);
})();
