# -*- coding: utf-8 -*-
"""Extrai subtítulos de seção e mapeia ao versículo que precedem, casando com biblia.json."""
import fitz,re,json,unicodedata,sys,io,difflib
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding="utf-8",errors="replace")
PDF=r"E:\DOWNLOADS\BIBLIA PR. RAPHAEL\BIBLIAS\BÍBLIA DE ESTUDO PENTECOSTAL.pdf"
DIR=r"D:\RADAR-APP\public\biblioteca\biblias"
doc=fitz.open(PDF)
bib=json.load(open(r"D:\RADAR-APP\public\biblia.json",encoding="utf-8-sig"))
ranges=json.load(open(DIR+r"\_intros_raw.json",encoding="utf-8"))  # has pages per book (intro); we need text ranges
brng=json.load(open(DIR+r"\_book_ranges.json",encoding="utf-8"))  # header-based; use text_s/e as hint
NOMES=[b["name"] for b in bib]

_DCACHE={}
def pdict(i):
    if i not in _DCACHE: _DCACHE[i]=doc[i].get_text("dict")
    return _DCACHE[i]
def norm(s):
    s=unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode().lower()
    return re.sub(r"[^a-z0-9 ]"," ",s)
def normc(s):
    return re.sub(r"\s+","",norm(s))

def title_lines(i):
    d=pdict(i); res=[]
    for b in d["blocks"]:
        if b.get("type")!=0: continue
        for l in b["lines"]:
            sp=l["spans"]
            if not sp: continue
            txt="".join(s["text"] for s in sp).strip()
            s0=sp[0]; sz=s0["size"]; y=l["bbox"][1]; x=l["bbox"][0]
            bold="Bo" in s0["font"] or (s0["flags"]&16)
            if not bold or sz<8.3 or sz>12.5 or y<26: continue
            if len(txt)<4 or len(txt)>90: continue
            if not re.search(r"[a-z]",txt): continue
            if re.search(r"\d",txt): continue                  # sem números
            if re.search(r'[:"�]',txt): continue                # dois-pontos/aspas => escritura
            if txt[-1] in ".,": continue                        # pontuação final => escritura
            res.append({"x":x,"y":y,"yb":l["bbox"][3],"sz":sz,"txt":txt})
    return res

def group_titles(lines):
    lines=sorted(lines,key=lambda r:(0 if r["x"]<190 else 1,r["y"]))
    groups=[]
    for r in lines:
        if groups:
            g=groups[-1]
            samecol=(g["x"]<190)==(r["x"]<190)
            if samecol and 0< r["y"]-g["ytop"] <14 and abs(r["sz"]-g["sz"])<1.2:
                g["txt"]+=" "+r["txt"]; g["ytop"]=r["y"]; g["y2"]=max(g["y2"],r["yb"]); continue
        groups.append({"x":r["x"],"y":r["y"],"ytop":r["y"],"y2":r["yb"],"sz":r["sz"],"txt":r["txt"]})
    return groups

def _colof(x): return 0 if x<185 else (1 if x>210 else -1)
def study_note_boundary(i):
    """menor y (por coluna) onde começam as NOTAS DE ESTUDO (lema 'N.N LEMMA')."""
    d=pdict(i); bnd={0:1e9,1:1e9}
    for b in d["blocks"]:
        if b.get("type")!=0: continue
        for l in b["lines"]:
            sp=l["spans"]
            if not sp: continue
            txt="".join(s["text"] for s in sp).strip()
            c=_colof(l["bbox"][0])
            if c<0: continue
            if re.match(r"^[il1I]?\.?\d{1,3}\.\d{1,3}\s+[A-ZÀ-Ú]",txt) or re.match(r"^\d{1,3}\.\d{1,3}\s+[A-ZÀ-Ú]",txt):
                bnd[c]=min(bnd[c],l["bbox"][1])
    return bnd
def scripture_snippet(i,x,y2):
    """texto de ESCRITURA logo abaixo do título (y2=base do título), mesma coluna, ACIMA das notas."""
    col=_colof(x)
    if col<0: col=0
    bnd=study_note_boundary(i)[col]
    pr=doc[i].rect
    if col==0: x0,x1=28,184
    else:      x0,x1=210,pr.x1
    y_top=y2+2
    y_bot=min(bnd, pr.y1)
    if y_bot<=y_top: return ""
    clip=fitz.Rect(x0,y_top,x1,y_bot)
    txt=doc[i].get_text("text",clip=clip)
    txt=re.sub(r"\s+"," ",txt).strip()
    return txt[:130]

def build():
    result={}
    for bo in brng:
        bi=bo["idx"]; ab=bib[bi]["abbrev"]
        ts=bo["text_s"]; te=bo["text_e"] or (ts+2)
        # guard against bad ranges
        if te<ts or te-ts>400: te=ts+ (len(bib[bi]["chapters"])*4)+5
        # ground truth verses
        verses=[]
        for ci,ch in enumerate(bib[bi]["chapters"]):
            for vi,vt in enumerate(ch):
                verses.append((ci+1,vi+1,normc(vt)))
        found={}
        for p in range(ts,min(te+1,doc.page_count)):
            for g in group_titles(title_lines(p)):
                gt=g["txt"].strip()
                if not re.match(r"[A-ZÁÉÍÓÚÂÊÔÃÕÀ]",gt): continue        # grupo começa maiúscula
                if re.match(r"(?i)^(E |Ora |Porque |Entao |Então |Disse |Assim |Depois |Mas |Tao |Tão )",gt): continue
                if len(gt)<8: continue
                snip=scripture_snippet(p,g["x"],g["y2"])
                sn=normc(snip)
                if len(sn)<12:
                    # título no pé da coluna -> pega topo da mesma coluna na próxima página
                    if p+1<doc.page_count:
                        snip2=scripture_snippet(p+1,g["x"],26)
                        sn=(sn+normc(snip2))[:60]
                if len(sn)<12: continue
                sn=sn[:44]
                best=(0,None)
                for ci,vi,vt in verses:
                    r=difflib.SequenceMatcher(None,sn,vt[:len(sn)]).ratio()
                    if r>best[0]: best=(r,(ci,vi))
                if best[0]>=0.72 and best[1]:
                    ci,vi=best[1]
                    tt=re.sub(r"\s+"," ",g["txt"]).strip()
                    cell=found.setdefault(str(ci),{})
                    prev=cell.get(str(vi))
                    if (not prev) or best[0]>prev["score"]:
                        cell[str(vi)]={"t":tt,"score":round(best[0],2)}
        result[ab]=found
    return result

if __name__=="__main__":
    onlygn=len(sys.argv)>1 and sys.argv[1]=="gn"
    if onlygn:
        bo=[b for b in brng if b["abbrev"]=="gn"][0]
        globals()["brng"]=[bo]
    res=build()
    tot=sum(len(v) for b in res.values() for v in b.values())
    print("livros:",len(res),"| subtitulos:",tot)
    for ab,ch in list(res.items())[:1]:
        for c in sorted(ch,key=int):
            for v in sorted(ch[c],key=int):
                print(f"  {ab} {c}.{v}  [{ch[c][v]['score']}]  {ch[c][v]['t']}")
    if not onlygn:
        json.dump({ab:{c:{v:ch[c][v]['t'] for v in ch[c]} for c in ch} for ab,ch in res.items()},
                  open(DIR+r"\subtitulos-pentecostal.json","w",encoding="utf-8"),ensure_ascii=False,indent=0)
        print("salvo subtitulos-pentecostal.json")
