# -*- coding: utf-8 -*-
"""Analisa o PDF Pentecostal: mapeia faixas de páginas por livro (intro vs texto)."""
import fitz,re,json,unicodedata,difflib,sys,io
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding="utf-8",errors="replace")
PDF=r"E:\DOWNLOADS\BIBLIA PR. RAPHAEL\BIBLIAS\BÍBLIA DE ESTUDO PENTECOSTAL.pdf"
DIR=r"D:\RADAR-APP\public\biblioteca\biblias"

bib=json.load(open(r"D:\RADAR-APP\public\biblia.json",encoding="utf-8-sig"))
NOMES=["Gênesis","Êxodo","Levítico","Números","Deuteronômio","Josué","Juízes","Rute","1 Samuel","2 Samuel","1 Reis","2 Reis","1 Crônicas","2 Crônicas","Esdras","Neemias","Ester","Jó","Salmos","Provérbios","Eclesiastes","Cânticos","Isaías","Jeremias","Lamentações","Ezequiel","Daniel","Oseias","Joel","Amós","Obadias","Jonas","Miqueias","Naum","Habacuque","Sofonias","Ageu","Zacarias","Malaquias","Mateus","Marcos","Lucas","João","Atos","Romanos","1 Coríntios","2 Coríntios","Gálatas","Efésios","Filipenses","Colossenses","1 Tessalonicenses","2 Tessalonicenses","1 Timóteo","2 Timóteo","Tito","Filemom","Hebreus","Tiago","1 Pedro","2 Pedro","1 João","2 João","3 João","Judas","Apocalipse"]
def norm(s):
    s=unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode()
    s=s.upper()
    s=s.replace("f","I")  # OCR í->f sometimes; loose
    return re.sub(r"[^A-Z0-9 ]","",s)
# canonical header keys (book part, uppercase, no accents)
CANON=[]
for nm in NOMES:
    n=unicodedata.normalize("NFKD",nm).encode("ascii","ignore").decode().upper()
    CANON.append(re.sub(r"[^A-Z0-9 ]","",n).strip())
# manual OCR alias helps
ALIAS={"CANTARES":"CANTICOS","JIJIZES":"JUIZES","LEVITICO":"LEVITICO"}

heads=json.load(open(DIR+r"\_headers.json",encoding="utf-8"))

def parse(h):
    """return (bookidx or None, chapter_present)"""
    up=h.upper()
    intro="INTRODU" in up
    bookpart=re.split(r"[:0-9]",up,1)[0].strip() if not intro else up.split("INTRODU")[0].replace(":","").strip()
    # chapter present if there is a standalone number after bookname (not in intro)
    chap=bool(re.search(r"\b\d{1,3}\b",re.sub(r"^\s*\d+\s+(SAMUEL|REIS|CRONICAS|CORINTIOS|TIMOTEO|TESSALONICENSES|PEDRO|JOAO)","",up))) and not intro
    key=norm(bookpart)
    key=re.sub(r"\s+"," ",key).strip()
    if not key: return (None,intro,chap)
    # fuzzy match to canon
    cand=[]
    for i,c in enumerate(CANON):
        r=difflib.SequenceMatcher(None,key,norm(c)).ratio()
        cand.append((r,i))
    cand.sort(reverse=True)
    best=cand[0]
    if best[0]<0.6: return (None,intro,chap)
    return (best[1],intro,chap)

# classify pages
info=[parse(h) for h in heads]
# Build ranges: for each book, intro pages = pages classified to book with intro flag OR front(no chapter, matches book & precedes its intro run)
# We anchor on intro runs.
intro_pages={}  # bookidx -> list
for pno,(bi,intro,chap) in enumerate(info):
    if bi is not None and intro:
        intro_pages.setdefault(bi,[]).append(pno)
# ensure all 66
missing=[i for i in range(66) if i not in intro_pages]
print("livros sem intro detectada:",missing)
# For each book compute intro range (include preceding Esboço page if header matches book & no intro & no chapter)
ranges=[]
starts={}
for bi in range(66):
    ip=sorted(intro_pages.get(bi,[]))
    if not ip:
        ranges.append(None); continue
    s=ip[0]; e=ip[-1]
    # extend backwards to grab Esboço page(s) that belong to this book (header matches, no chapter, not intro)
    j=s-1
    while j>0:
        bj,ij,cj=info[j]
        if bj==bi and not cj:
            s=j; j-=1
        else: break
    starts[bi]=s
    ranges.append([s,e])
# text start = last intro page +1 ; text end = next book intro start -1
out=[]
book_start_sorted=sorted(starts.items(),key=lambda x:x[1])
for idx,(bi,st) in enumerate(book_start_sorted):
    intro_s,intro_e=ranges[bi]
    text_s=intro_e+1
    # next book start
    if idx+1<len(book_start_sorted):
        nxt=book_start_sorted[idx+1][1]
    else:
        nxt=None
    text_e=(nxt-1) if nxt else None
    out.append({"idx":bi,"abbrev":bib[bi]["abbrev"],"name":NOMES[bi],
                "intro_s":intro_s,"intro_e":intro_e,"text_s":text_s,"text_e":text_e,
                "nchaps":len(bib[bi]["chapters"])})
out.sort(key=lambda x:x["idx"])
json.dump(out,open(DIR+r"\_book_ranges.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
for o in out:
    print(f'{o["idx"]:2d} {o["abbrev"]:5s} {o["name"]:16s} intro {o["intro_s"]}-{o["intro_e"]} texto {o["text_s"]}-{o["text_e"]} chaps {o["nchaps"]}')
