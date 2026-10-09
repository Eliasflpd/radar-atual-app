// Extrai texto de um PDF em JSON por página. Decide por PÁGINA se há duas colunas.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
export async function extrair(file){
  const doc = await getDocument({ data:new Uint8Array(fs.readFileSync(file)), verbosity:0 }).promise;
  const pages=[];
  for (let p=1;p<=doc.numPages;p++){
    const page=await doc.getPage(p); const vp=page.getViewport({scale:1});
    const W=vp.width, H=vp.height, mid=W/2;
    const tc=await page.getTextContent();
    let items=tc.items.filter(it=>'str' in it && it.str.trim()!=='').map(it=>({x0:it.transform[4], y:it.transform[5], h:Math.abs(it.transform[3])||it.height||10, w:it.width, x1:it.transform[4]+it.width, s:it.str}));
    const hs=items.map(i=>i.h).sort((a,b)=>a-b); const med=hs[Math.floor(hs.length/2)]||10;
    const drops=items.filter(i=>i.s.trim().length===1 && /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(i.s.trim()) && i.h>=med*2.2);
    items=items.filter(i=>!drops.includes(i));
    items.sort((a,b)=>(b.y-a.y)||(a.x0-b.x0));
    // 1) linhas só por baseline
    const ylines=[];
    for(const it of items){ const L=ylines[ylines.length-1]; if(L && Math.abs(L.y-it.y)<=Math.max(2,it.h*0.45)) L.items.push(it); else ylines.push({y:it.y,items:[it]}); }
    // 2) segmentos: quebra onde há vão grande que atravessa o meio
    const segs=[];
    for(const L of ylines){ L.items.sort((a,b)=>a.x0-b.x0); let cur=[L.items[0]];
      for(let k=1;k<L.items.length;k++){ const prev=L.items[k-1], it=L.items[k]; const gap=it.x0-prev.x1;
        if(gap>Math.max(14,prev.h*1.2) && prev.x1<mid+4 && it.x0>mid-4){ segs.push({y:L.y,items:cur}); cur=[it]; } else cur.push(it); }
      segs.push({y:L.y,items:cur}); }
    const mk=sg=>{ let s=''; let prev=null; for(const it of sg.items){ if(prev){ const gap=it.x0-prev.x1; if(gap>prev.h*0.22 && !s.endsWith(' ') && !it.s.startsWith(' ')) s+=' '; } s+=it.s; prev=it; }
      const x0=sg.items[0].x0, x1=Math.max(...sg.items.map(i=>i.x1)), h=Math.max(...sg.items.map(i=>i.h));
      return {y:sg.y,x0,x1,h,text:s.replace(/\s+/g,' ').trim()}; };
    let lines=segs.map(mk);
    // 3) a página é de duas colunas?
    const cross=lines.filter(l=>l.x0<mid-10 && l.x1>mid+10).length;
    const left=lines.filter(l=>l.x1<=mid+10).length, right=lines.filter(l=>l.x0>=mid-10).length;
    const twoCol = (left+right)>=6 && cross <= 0.3*(left+right+cross);
    for(const l of lines) l.col = !twoCol ? 'F' : (l.x0<mid-10 && l.x1>mid+10) ? 'F' : (l.x0>=mid-10 ? 'R' : 'L');
    for(const d of drops){ const cands=lines.filter(L=>L.y<=d.y+d.h+2 && L.y>=d.y-2 && L.x0>=d.x0-2).sort((a,b)=>b.y-a.y); if(cands[0]) cands[0].text=d.s.trim()+cands[0].text; }
    lines.sort((a,b)=>(b.y-a.y)||(a.x0-b.x0));
    const out=[]; let band=[];
    const flush=()=>{ out.push(...band.filter(l=>l.col==='L')); out.push(...band.filter(l=>l.col==='R')); band=[]; };
    for(const L of lines){ if(L.col==='F'){ flush(); out.push(L); } else band.push(L); }
    flush();
    pages.push({p,w:W,h:H,twoCol,lines:out.map(L=>({x0:Math.round(L.x0),x1:Math.round(L.x1),y:Math.round(L.y),h:Math.round(L.h*10)/10,col:L.col,text:L.text}))});
  }
  return pages;
}
if (process.argv[1].endsWith('extract4.mjs')) {
  const [,, idxArg, outJson] = process.argv;
  const dir='D:/MEUS ESTUDOS/MARIA'; const files=fs.readdirSync(dir).filter(f=>f.toLowerCase().endsWith('.pdf')).sort();
  const pages=await extrair(dir+'/'+files[+idxArg]);
  fs.writeFileSync(outJson, JSON.stringify(pages));
  console.log(files[+idxArg], pages.length, 'paginas', pages.filter(p=>p.twoCol).length, 'com 2 colunas');
}
