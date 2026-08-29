# -*- coding: utf-8 -*-
"""Extrai a SINTESE (introducao) de cada livro da Biblia AG.
Sintese = spans tamanho ~7.0, acima do primeiro texto biblico (tam>=8) na pagina inicial do livro.
Ordem colunar: coluna esquerda (x<210) top->bottom, depois direita.
Gera _ag_intros_raw.json {abbrev: texto_cru}
"""
import glob,fitz,sys,io,re,json,unicodedata
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding="utf-8",errors="replace")
f=glob.glob(r'E:\DOWNLOADS\BIBLIA PR. RAPHAEL\*GILBERTO*\*.pdf')[0]
d=fitz.open(f)
bib=json.load(open(r"D:\RADAR-APP\public\biblia.json",encoding="utf-8-sig"))
printed=json.load(open("_ag_printed.json"))
# 2 Samuel ausente -> inferir depois; por ora derive from sumario gap (399..483). Vamos localizar.
printed={int(k):v for k,v in printed.items()}

def spans(pg):
    out=[]
    for b in pg.get_text("dict")["blocks"]:
        if "lines" not in b: continue
        for l in b["lines"]:
            for s in l["spans"]:
                t=s["text"]
                if t.strip():
                    out.append((s["bbox"][0],s["bbox"][1],round(s["size"],1),s["flags"],t))
    return out
# flags: bit2(4)=serif, bit4(16)=bold. Sintese = sans (Calibri/Arial) e NAO-negrito.
def is_sintese(flags): return (flags & 20)==0
LABELS={"titulo","autor","autoria","data","epoca","tema","assunto","esfera de acao",
 "divisao","mensagem","proposito","palavra-chave","palavra chave","versiculo-chave",
 "versiculo chave","ocasiao","destinatario","destinatarios","esboco","conteudo",
 "finalidade","contexto","chave","local","genero","estilo","personagens"}
LABEL_RE=re.compile(r"^(t.?['’ ]?tulo|autor|autoria|data|epoca|tema|assunto|esfera[ .]*de[ .]*a.ao|"
 r"divis.o|mensagem|proposito|ocasiao|esbo.o|conteudo|finalidade|contexto|chave|local|genero|"
 r"destinat\w*|personagens|palavra[ .-]*chave|versiculo[ .-]*chave)$")
def is_label(fl,t):
    if not (fl & 16): return False   # rotulos vem em NEGRITO nas paginas jitter
    k=da(t).strip(" .:-'’\"")
    return k in LABELS or bool(LABEL_RE.match(k))

MID=210
def dropcap_y(sp):
    """y do drop-cap do cap.1 = glifo GRANDE (sz>=18) na MARGEM ESQUERDA (x<86), abaixo da
    faixa ornamental da SINTESE (y>150)."""
    cand=[y for x,y,sz,fl,t in sp
          if y>175 and ( sz>=18.0 or (sz>=12.5 and len(t.strip())==1 and re.match(r"[0-9A-Za-z|]",t.strip())) )]
    return min(cand) if cand else None

def colorder(items):
    """agrupa spans em linhas (por proximidade de y) e ordena dentro da linha por x."""
    items=sorted(items,key=lambda e:(e[1],e[0]))
    lines=[]; cur=[]; last=None
    for x,y,t in items:
        if last is not None and (y-last)>5: lines.append(cur); cur=[]
        cur.append((x,y,t)); last=y
    if cur: lines.append(cur)
    out=[]
    for ln in lines:
        ln.sort(key=lambda e:e[0]); out+=[t for x,y,t in ln]
    return out

def region_text(sp,ytop,ybot,drop=True):
    # drop=True: remove contaminantes (negrito-nao-rotulo e serifa/comentario), mantem ordem
    reg=[]
    for x,y,sz,fl,t in sp:
        if not (ytop<y<ybot): continue
        if drop and not (is_sintese(fl) or is_label(fl,t)): continue
        reg.append((x,y,t))
    left=colorder([e for e in reg if e[0]<MID])
    right=colorder([e for e in reg if e[0]>=MID])
    return " ".join(left+right)

def da(s):
    return unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode().lower()
def bible_cut(txt,verse1):
    """corta txt onde comeca o texto biblico (1a palavras do versiculo 1.1). So p/ intros longas."""
    if len(txt)<2400: return txt
    D=da(txt); ws=re.findall(r"[a-z]{4,}",da(verse1))[:8]
    if len(ws)<3: return txt
    for m in re.finditer(re.escape(ws[0]),D):
        if m.start()<=150: continue
        p=m.end(); hits=0
        for w in ws[1:6]:
            j=D.find(w,p,p+130)
            if j>=0: hits+=1; p=j+len(w)
        if hits>=2:
            return txt[:m.start()].rstrip(" .,-")
    return txt

def extract_intro(pageidx):
    sp=spans(d[pageidx])
    # topo abaixo do titulo do livro (titulo sz>=20 no topo)
    thead=[ (y+ (sz*0.9)) for x,y,sz,fl,t in sp if sz>=20 and y<90]
    ytop=max(thead) if thead else 70
    bstart=dropcap_y(sp)
    def build(drop):
        if bstart is None:
            t=region_text(sp,ytop,9999,drop)
            sp2=spans(d[pageidx+1]); b2=dropcap_y(sp2)
            t+=" "+region_text(sp2,60,b2 if b2 else 9999,drop)
            return t
        return region_text(sp,ytop,bstart,drop)
    filt=build(True); full=build(False)
    # usa filtrado (limpo) so se preservou o corpo; senao cai p/ full (corpo era serifa)
    txt = filt if len(filt)>=max(320,0.5*len(full)) else full
    # corta lixo decorativo antes do rotulo "Titulo" (tolera OCR: Tftulo, Tltulo, Ti'tulo, Ti tulo)
    # remove ornamento "S I N T E S E" solto no inicio
    txt=re.sub(r"^\W*S\s*[l1ifíI]?\s*N\s*T\s*[EÊ]?\s*S\s*E\W*"," ",txt).strip()
    m=re.search(r"T\S{0,3}\s?['’]?\s?tulo",txt)
    if m and m.start()<40: txt=txt[m.start():]
    txt=re.sub(r"\s{2,}"," ",txt).strip()
    return txt

# offset constante +10; 2 Samuel (idx9) sem sumario -> fitz 455 (conferido)
STARTS={idx:(printed[idx]+10) for idx in printed}
STARTS[9]=455
def find_start(idx):
    return STARTS.get(idx)

raw={}
for idx in range(66):
    ab=bib[idx]["abbrev"]
    st=find_start(idx)
    if st is None:
        print("SEM start",idx);continue
    txt=extract_intro(st)
    try: v1=bib[idx]["chapters"][0][0]
    except: v1=""
    if v1: txt=bible_cut(txt,v1)
    raw[ab]=txt
    print(f"{idx:2d} {ab:5s} fitz{st:5d} len{len(txt):5d}  {txt[:70]}")
json.dump(raw,open("_ag_intros_raw.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
print("OK",len(raw))
