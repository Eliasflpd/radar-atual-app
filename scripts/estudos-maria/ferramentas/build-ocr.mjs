// Monta texto.json a partir do OCR estruturado (doc*.json) dos estudos ilustrados.
// Um capítulo por página (cada página é um tema), título = linha grande mais confiável.
import fs from 'fs';
const WORK='D:/radar-atual-app/_estudos-maria-trabalho';
const LIXO=/direitos reservados|GPS DIGITAL|CNPJ|^\d{1,3}\s*[|l]\s|Jesus Cristo no Antigo Testamento$|Curiosidades das Palavras Originais$/i;
function letras(t){ const l=(t.match(/[A-Za-zÀ-ÿ]/g)||[]).length; return l/Math.max(1,t.replace(/\s/g,'').length); }
function limpaLinhas(lines){
  const ok=[];
  for(const l of lines){
    const t=l.text.replace(/\s+/g,' ').trim();
    if(!t) continue;
    if(LIXO.test(t)) continue;
    const h=l.y1-l.y0;
    if(t.length<3 && !/^\d+$/.test(t)) continue;
    if(l.conf<58) continue;
    if(letras(t)<0.62 && t.length<40) continue;     // "= =", "F 3", "o É)"…
    if(letras(t)<0.5) continue;
    // palavra solta em caixa alta com pouca confiança = decoração
    if(l.conf<75 && t.split(' ').length<=2 && t.length<8) continue;
    ok.push({t, h, conf:l.conf, x0:l.x0, x1:l.x1, y0:l.y0, y1:l.y1});
  }
  return ok;
}
function estruturaPagina(lines, numPag){
  const ls=limpaLinhas(lines);
  if(!ls.length) return null;
  const hs=ls.filter(l=>l.t.length>=12).map(l=>l.h).sort((a,b)=>a-b);
  const med=hs[Math.floor(hs.length/2)]||ls[0].h;
  // título = maior linha confiável (até 2 linhas consecutivas do mesmo tamanho)
  const grandes=ls.filter(l=>l.h>=med*1.45 && l.conf>=70 && l.t.length>=4);
  let titulo='';
  if(grandes.length){ const g=grandes.reduce((a,b)=>b.h>a.h*1.15?b:a); const idx=ls.indexOf(g); titulo=g.t;
    const nx=ls[idx+1]; if(nx && Math.abs(nx.h-g.h)<=g.h*0.2 && nx.y0-g.y1<g.h && nx.t.length>=4) titulo+=' '+nx.t; }
  const blocos=[]; let par=[]; let prev=null; let parT='p';
  const flush=()=>{ if(par.length){ let x=par.join(' ').replace(/\s+/g,' ').replace(/(\w)- (\w)/g,'$1$2').trim(); blocos.push({t:parT,x}); } par=[]; };
  for(const l of ls){
    const eTitulo = titulo && (titulo===l.t || titulo.startsWith(l.t+' ') || titulo.endsWith(' '+l.t));
    if(eTitulo) { flush(); continue; }
    const ehH = l.h>=med*1.25 && l.t.length<=80;
    const ehQ = /^[“"].*|.*[”"]$/.test(l.t) && !ehH;
    const gap = prev ? (l.y0 - prev.y1) : 0;
    const novo = !prev || ehH || gap > Math.max(8, prev.h*0.9) || (parT==='h') || (ehQ!==(parT==='q')) || Math.abs(l.x0-prev.x0)>prev.h*2.5;
    if(novo){ flush(); parT = ehH?'h':(ehQ?'q':'p'); }
    par.push(l.t); prev=l;
  }
  flush();
  // sub-título: 2ª linha grande logo após o título
  return { t: titulo || ('Página '+numPag), blocos };
}
export function montar(docJson, slug, titulo, subtitulo, grupoDe){
  const pages=JSON.parse(fs.readFileSync(docJson));
  const caps=[];
  pages.forEach((pg,i)=>{ const c=estruturaPagina(pg.lines, i+1); if(!c) return; c.pag=i+1; if(grupoDe) c.grupo=grupoDe(i+1,c); if(c.blocos.length||caps.length) caps.push(c); });
  // capítulos vazios (só título) colam no seguinte como grupo
  const obj={titulo, subtitulo, capitulos:caps};
  fs.mkdirSync(WORK+'/'+slug,{recursive:true}); fs.writeFileSync(WORK+'/'+slug+'/texto.json', JSON.stringify(obj));
  const nb=caps.reduce((a,c)=>a+c.blocos.length,0); console.log(slug, caps.length,'capitulos', nb,'blocos', caps.reduce((a,c)=>a+c.blocos.reduce((b,x)=>b+x.x.length,0),0),'chars');
  return obj;
}
if (process.argv[1].endsWith('build-ocr.mjs')) {
  const [,, docJson, slug, titulo, subtitulo] = process.argv;
  const obj=montar(docJson, slug, titulo, subtitulo||'');
  for(const c of obj.capitulos.slice(0,8)){ console.log('## p'+c.pag, c.t); for(const b of c.blocos.slice(0,5)) console.log('   ',b.t,'|',b.x.slice(0,110)); }
}
