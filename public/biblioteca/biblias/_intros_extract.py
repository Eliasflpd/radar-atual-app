# -*- coding: utf-8 -*-
"""Extrai faixas de introdução por livro (1 âncora/livro) e salva texto BRUTO."""
import fitz,re,json,unicodedata,sys,io
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding="utf-8",errors="replace")
PDF=r"E:\DOWNLOADS\BIBLIA PR. RAPHAEL\BIBLIAS\BÍBLIA DE ESTUDO PENTECOSTAL.pdf"
DIR=r"D:\RADAR-APP\public\biblioteca\biblias"
doc=fitz.open(PDF)
bib=json.load(open(r"D:\RADAR-APP\public\biblia.json",encoding="utf-8-sig"))
NOMES=["Gênesis","Êxodo","Levítico","Números","Deuteronômio","Josué","Juízes","Rute","1 Samuel","2 Samuel","1 Reis","2 Reis","1 Crônicas","2 Crônicas","Esdras","Neemias","Ester","Jó","Salmos","Provérbios","Eclesiastes","Cânticos","Isaías","Jeremias","Lamentações","Ezequiel","Daniel","Oseias","Joel","Amós","Obadias","Jonas","Miqueias","Naum","Habacuque","Sofonias","Ageu","Zacarias","Malaquias","Mateus","Marcos","Lucas","João","Atos","Romanos","1 Coríntios","2 Coríntios","Gálatas","Efésios","Filipenses","Colossenses","1 Tessalonicenses","2 Tessalonicenses","1 Timóteo","2 Timóteo","Tito","Filemom","Hebreus","Tiago","1 Pedro","2 Pedro","1 João","2 João","3 João","Judas","Apocalipse"]
def N(s): return unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode()
heads=json.load(open(DIR+r"\_headers.json",encoding="utf-8"))

def is_intro_header(h):
    return bool(re.search(r"[I1L]NTRODU",N(h).upper()))
def is_esbogo(i):
    for l in [x.strip() for x in doc[i].get_text().splitlines() if x.strip()][:4]:
        if re.match(r"(?i)esbo[gcçq]o$",N(l).strip()): return True
    return False
def scripture_chap(h):
    u=N(h).upper().strip()
    if is_intro_header(u) or len(u)<3: return False
    u2=re.sub(r"^\s*[123]\s+","",u)
    return bool(re.search(r"[A-Z]{3,}[^0-9]*\b\d{1,3}\b",u2))

# one anchor per book = Esbogo outline page. Jeremias (idx23) has NO outline -> use its INTRODU page 1079.
esb=[i for i in range(24,1990) if len(doc[i].get_text().strip())>=20 and is_esbogo(i)]
starts=sorted(esb)
print("esbogo pages:",len(esb),"| starts:",len(starts))

book_order=[i for i in range(66) if i!=54]  # 2tm image-only
if len(starts)!=len(book_order):
    print("MISMATCH",len(starts),"vs",len(book_order))
    for s in starts: print("  ",s,"|",heads[s][:34],"| esb" if is_esbogo(s) else "")
    sys.exit(1)

def verse_lines(i):
    return len(re.findall(r"(?m)^\s*\d{1,3}\s+[A-Za-zÀ-Ú'\"]",doc[i].get_text()))
def intro_end(s,cap):
    p=s
    while p+1<=cap and (p+1)-s<=5:
        if verse_lines(p+1)>=6: break          # scripture page
        if len(doc[p+1].get_text().strip())<20: break
        p+=1
    return p

def page_intro_text(i):
    out=[]
    for l in doc[i].get_text().splitlines():
        t=l.strip()
        if not t: continue
        if re.fullmatch(r"\d{1,4}",t): continue
        if is_intro_header(t) and len(t)<40: continue
        out.append(l.rstrip())
    return "\n".join(out)

raw={}
for k,(bi,s) in enumerate(zip(book_order,starts)):
    cap=(starts[k+1]-1) if k+1<len(starts) else s+5
    e=intro_end(s,cap)
    txt="\n".join(page_intro_text(p) for p in range(s,e+1))
    raw[bib[bi]["abbrev"]]={"idx":bi,"name":NOMES[bi],"pages":[s,e],"raw":txt}
    print(f'{bi:2d} {bib[bi]["abbrev"]:5s} {NOMES[bi]:16s} p{s}-{e} chars {len(txt)}')
json.dump(raw,open(DIR+r"\_intros_raw.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
print("2tm (idx54) pulado: regiao so-imagem")
