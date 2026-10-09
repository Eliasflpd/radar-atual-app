// Monta texto.json (capítulos → blocos) a partir do JSON do extract4 para os 3 PDFs com texto.
import fs from 'fs';
const WORK='D:/radar-atual-app/_estudos-maria-trabalho';
const RE_FIM=/[.!?”"’:;]$/;
function juntar(lines, tipo){ // run de linhas do mesmo estilo -> blocos (parágrafos)
  const out=[]; if(!lines.length) return out;
  const right=Math.max(...lines.map(l=>l.x1)), left=Math.min(...lines.map(l=>l.x0)), wid=Math.max(1,right-left);
  // margem esquerda "normal" do bloco (moda do x0) — texto centralizado não tem recuo de parágrafo confiável
  const cnt={}; for(const l of lines){ const k=Math.round(l.x0/2)*2; cnt[k]=(cnt[k]||0)+1; }
  const modo=+Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0];
  const alinhado = lines.filter(l=>Math.abs(l.x0-modo)<=3).length >= lines.length*0.6;
  let cur=[];
  for(let i=0;i<lines.length;i++){ const l=lines[i], nx=lines[i+1];
    let t=l.text; const m=t.length%2===0 && t.slice(0,t.length/2)===t.slice(t.length/2) ? t.slice(0,t.length/2) : t; // texto duplicado (capa)
    cur.push(m);
    const curto = l.x1 < right-0.14*wid;
    const indent = alinhado && nx && Math.abs(l.x0-modo)<=3 && nx.x0 > modo+7;
    const fim = !nx || (RE_FIM.test(l.text) && (curto||indent)) || indent;
    if(fim){ out.push({t:tipo,x:cur.join(' ').replace(/\s+/g,' ').trim()}); cur=[]; }
  }
  return out;
}
function paraBlocos(linhas, classif){ // classif(line)-> 'h'|'p'|'q'|'s'|null(skip)
  const blocos=[]; let run=[], runT=null;
  const flush=()=>{ if(!run.length) return; if(runT==='h'||runT==='s') blocos.push({t:runT,x:run.map(l=>l.text).join(' ')}); else blocos.push(...juntar(run,runT)); run=[]; };
  for(const l of linhas){ const t=classif(l); if(!t) continue; if(t!==runT){ flush(); runT=t; } run.push(l); }
  flush(); return blocos;
}
function salvar(slug, obj){ fs.mkdirSync(WORK+'/'+slug,{recursive:true}); fs.writeFileSync(WORK+'/'+slug+'/texto.json', JSON.stringify(obj));
  const nb=obj.capitulos.reduce((a,c)=>a+c.blocos.length,0), nc=obj.capitulos.reduce((a,c)=>a+c.blocos.reduce((b,x)=>b+x.x.length,0),0);
  console.log(slug, obj.capitulos.length,'capitulos', nb,'blocos', nc,'chars'); }

// ───────── 1) PARÁBOLAS (texto) ─────────
function parabolas(){
  const pages=JSON.parse(fs.readFileSync('txt/parabolas4.json'));
  const nomes=["O Semeador","O Joio e o Trigo","A Semente de Mostarda","O Fermento","O Tesouro Escondido","A Pérola de Grande Valor","A Rede","A Semente que Cresce Secretamente","Os Trabalhadores da Vinha","As Bodas do Filho do Rei","O Bom Samaritano","O Filho Pródigo","A Ovelha Perdida","A Dracma Perdida","O Servo Implacável","Os Dois Devedores","O Fariseu e o Publicano","Os Dois Filhos","A Grande Ceia","O Bom Pastor","As Dez Virgens","Os Talentos","As Minas","Os Servos Vigilantes","O Servo Fiel e Prudente","O Porteiro Vigilante","O Rico Insensato","O Rico e Lázaro","A Figueira Estéril","Os Lavradores Maus","O Amigo Importuno","A Viúva Persistente","O Construtor da Torre","O Rei que vai à Guerra","O Administrador Infiel","O Servo Inútil","Os Primeiros Lugares no Banquete","A Figueira (sinal dos tempos)","A Videira Verdadeira","As Ovelhas e os Bodes"];
  const RE_REF=/^(\d\s)?[A-ZÁ][a-záéíóúçãõâêô]+(\s\d+:\d+(-\d+)?)(\s·\s.*)?$/;
  // O PDF original tem 3 títulos de "Contexto" com texto sobreposto (defeito do arquivo de origem).
  // Reconstruímos só o que está legível na página; o que se perdeu fica marcado com […].
  const CONSERTOS={
    36:{ini:'Contexto — Subir ao templo', pula:1, h:'Contexto — Subir ao templo', p:'Lucas é direto sobre a quem Jesus dirigiu esta parábola: aos'},
    46:{ini:'Contexto — O cortejo e noivo', pula:1, h:'Contexto — O cortejo e o noivo', p:'Esta parábola está no discurso do monte das Oliveiras.'},
    66:{ini:'Contexto — A árvore que era israel', pula:1, h:'Contexto — A árvore que era Israel', p:'A parábola foi contada num momento difícil […]'}
  };
  const caps=[]; let cap=null, grupo='', linhas=[];
  const fecha=()=>{ if(cap){ cap.blocos=paraBlocos(linhas, l=>{
      if(l.force) return l.force;
      if(/^\d{1,3}$/.test(l.text)) return null;
      if(/^(Texto bíblico|A parábola|A parábola explicada|A revelação|Contexto(\s—.*)?|Para levar|Aplicação|A explicação)$/.test(l.text)) return 'h';
      if(/^\[/.test(l.text)||/\]$/.test(l.text)) return 's';
      if(l.x0>=75) return 'q';
      return 'p'; }); caps.push(cap); } linhas=[]; };
  for(const pg of pages){ if(pg.p<=1) continue; let viu=pg.p>2;
    for(let i=0;i<pg.lines.length;i++){ const l=pg.lines[i]; const t=l.text;
      if(/^Módulo \d/.test(t)){ viu=true; grupo=t.replace(/^Módulo (\d)\s*—\s*/,'Módulo $1 · '); continue; }
      if(!viu) continue; const nx=pg.lines[i+1];
      const cs=CONSERTOS[pg.p];
      if(cs && t.startsWith(cs.ini)){ linhas.push({text:cs.h, force:'h', x0:61, x1:540, h:16, y:l.y}); linhas.push({text:cs.p, force:'p', x0:61, x1:540, h:16, y:l.y}); i+=cs.pula; continue; }
      if(nomes.includes(t) && nx && RE_REF.test(nx.text)){ fecha(); cap={t, grupo, ref:nx.text, blocos:[]}; i++; continue; }
      if(!cap){ continue; }
      linhas.push(l);
    } }
  fecha();
  salvar('parabolas-texto',{titulo:'As Parábolas de Jesus — Texto completo', subtitulo:'As 40 parábolas explicadas, módulo por módulo', capitulos:caps});
  console.log('  faltaram:', nomes.filter(n=>!caps.find(c=>c.t===n)).join(' | ')||'nenhuma');
}
// ───────── 2) 70 SEMANAS ─────────
function setenta(){
  const pages=JSON.parse(fs.readFileSync('txt/70semanas4.json'));
  const caps=[]; let cap=null, linhas=[];
  const fecha=()=>{ if(cap){ cap.blocos=paraBlocos(linhas,l=>{ if(/^\d{1,3}$/.test(l.text)) return null; if(l.h>=14.5&&l.text.length<80) return 'h'; return 'p'; }); caps.push(cap);} linhas=[]; };
  for(const pg of pages){ const ls=pg.lines; if(!ls.length) continue;
    if(/AVISO LEGAL/i.test(ls.map(l=>l.text).join(' '))) continue;
    const head=ls.find(l=>l.h>=14.5&&l.h<=16);
    const titulo=head?head.text:null;
    if(titulo && (!cap || cap.t!==titulo)){ fecha(); cap={t:titulo, grupo:'', blocos:[]}; }
    if(!cap) continue;
    for(const l of ls){ if(l===head) continue; linhas.push(l); }
  }
  fecha();
  for(let i=1;i<caps.length;i++) if(/^Síntese do Capítulo$/i.test(caps[i].t)) caps[i].t='Síntese: '+caps[i-1].t;
  salvar('escatologia-70-semanas',{titulo:'Escatologia: As 70 Semanas de Daniel', subtitulo:'O cronômetro profético de Deus', capitulos:caps});
}
// ───────── 3) SALMOS ─────────
function salmos(){
  const pages=JSON.parse(fs.readFileSync('txt/salmos4.json'));
  const caps=[]; let cap=null, linhas=[], livro='';
  const classif=l=>{ const t=l.text, h=l.h;
    if(/^\d{1,3}$/.test(t)) return null; if(/anotaçõe/i.test(t)) return null;
    if(h>=40) return 'h'; if(h>=25) return null;
    if(h>=13.5&&h<=15) return 'h';
    if(h>=5.9&&h<=6.9){ return /Explicação/.test(t) ? 'h' : 'q'; }
    if(h>=7.5&&h<=8.5) return 's';
    return 'p'; };
  const fecha=()=>{ if(cap){ cap.blocos=paraBlocos(linhas,classif); caps.push(cap);} linhas=[]; };
  for(const pg of pages){ const ls=pg.lines; if(!ls.length) continue;
    const txt=ls.map(l=>l.text);
    const big=ls.filter(l=>l.h>=40).map(l=>l.text).join(' ').trim();
    const mLivro=big.match(/^LIVRO (\d+)$/);
    let mSalmo=txt.map(t=>t.match(/^(\d{1,3})\s+\S{0,2}\s*(\d+)\s+vers[ií]culos?$/)).find(Boolean);
    // Salmo 119 (e similares): página de abertura tem só o número grande, e as partes vêm como "119 Versículos 1 a 8"
    const mBig=big.match(/^(\d{1,3})(?:\s+(Versículos\s+\d+\s+a\s+\d+))?$/);
    if(!mSalmo && mBig && livro && !(cap && cap.t==='Salmo '+(+mBig[1]))){ mSalmo=[null, mBig[1], '']; }
    if(mBig && mBig[2] && cap && cap.t==='Salmo '+(+mBig[1])){ linhas.push({text:mBig[2], h:14.2, x0:0, x1:300, y:0, col:'F'}); for(const l of ls){ if(l.h>=40) continue; linhas.push(l); } continue; }
    if(mLivro){ fecha(); livro='Livro '+(+mLivro[1]); const sub=ls.filter(l=>l.h<40).map(l=>l.text).join(' '); cap={t:livro, grupo:'', sub, blocos:[]}; for(const l of ls) if(l.h<40) linhas.push(l); continue; }
    if(mSalmo){ fecha(); const tipo=ls.filter(l=>l.h>=7.5&&l.h<=8.5&&!/vers[ií]culos?$/.test(l.text)).map(l=>l.text).join(' ');
      cap={t:'Salmo '+(+mSalmo[1]), grupo:livro, sub:tipo+(tipo&&mSalmo[2]?' · ':'')+(mSalmo[2]?mSalmo[2]+' versículos':''), blocos:[]};
      for(const l of ls){ if(l.h>=7.5&&l.h<=8.5) continue; if(l.h>=40) continue; if(/^\d{1,3}\s+\S{0,2}\s*\d+\s+vers[ií]culos?$/.test(l.text)) continue; linhas.push(l); } continue; }
    if(!livro){
      if(big){ if(!cap||cap.t!==big){ fecha(); cap={t:big.replace(/\s+/g,' '), grupo:'Introdução', blocos:[]}; } }
      else if(!cap){ cap={t:'Apresentação', grupo:'Introdução', blocos:[]}; }
      for(const l of ls){ if(l.h>=40) continue; linhas.push(l); } continue; }
    if(cap) for(const l of ls) linhas.push(l);
  }
  fecha();
  salvar('salmos-explicados',{titulo:'Salmos Explicados', subtitulo:'150 salmos explicados versículo por versículo', capitulos:caps});
  console.log('  salmos encontrados:', caps.filter(c=>/^Salmo \d+$/.test(c.t)).length);
}
parabolas(); setenta(); salmos();
