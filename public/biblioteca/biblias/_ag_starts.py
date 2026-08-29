# -*- coding: utf-8 -*-
"""Acha a pagina fitz de inicio de cada livro procurando o TITULO em fonte grande (sz>=18)
perto do topo, casando com o nome do livro (desacentuado). Usa printed+10 como dica de janela."""
import glob,fitz,sys,io,re,json,unicodedata,difflib
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding="utf-8",errors="replace")
f=glob.glob(r'E:\DOWNLOADS\BIBLIA PR. RAPHAEL\*GILBERTO*\*.pdf')[0]
d=fitz.open(f)
bib=json.load(open(r"D:\RADAR-APP\public\biblia.json",encoding="utf-8-sig"))
printed=json.load(open("_ag_printed.json")); printed={int(k):v for k,v in printed.items()}
NOMES=["Gênesis","Êxodo","Levítico","Números","Deuteronômio","Josué","Juízes","Rute","1 Samuel","2 Samuel","1 Reis","2 Reis","1 Crônicas","2 Crônicas","Esdras","Neemias","Ester","Jó","Salmos","Provérbios","Eclesiastes","Cânticos","Isaías","Jeremias","Lamentações","Ezequiel","Daniel","Oseias","Joel","Amós","Obadias","Jonas","Miqueias","Naum","Habacuque","Sofonias","Ageu","Zacarias","Malaquias","Mateus","Marcos","Lucas","João","Atos","Romanos","1 Coríntios","2 Coríntios","Gálatas","Efésios","Filipenses","Colossenses","1 Tessalonicenses","2 Tessalonicenses","1 Timóteo","2 Timóteo","Tito","Filemom","Hebreus","Tiago","1 Pedro","2 Pedro","1 João","2 João","3 João","Judas","Apocalipse"]
def dn(s):
    s=unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode().upper()
    return re.sub(r"[^A-Z0-9]","",s)
CAN=[dn(n) for n in NOMES]

def bigheader(pi):
    """retorna string desacentuada do texto de fonte grande (sz>=18) no topo (y<120)."""
    try: dd=d[pi].get_text("dict")
    except: return ""
    chunks=[]
    for b in dd["blocks"]:
        if "lines" not in b: continue
        for l in b["lines"]:
            for s in l["spans"]:
                if s["size"]>=17.5 and s["bbox"][1]<130 and s["text"].strip():
                    chunks.append(s["text"])
    return dn(" ".join(chunks))

def score(cardidx,pi):
    h=bigheader(pi)
    if not h: return 0
    c=CAN[cardidx]
    # match: header contains canon OR high ratio
    if c and c in h: return 1.0
    return difflib.SequenceMatcher(None,c,h).ratio()

starts={}
prevkey=CAN[0]
for idx in range(66):
    hint=printed.get(idx)
    center=(hint+10) if hint else (starts.get(idx-1,13)+8)
    best=(0,None)
    for pi in range(max(6,center-9),min(d.page_count,center+10)):
        sc=score(idx,pi)
        # evitar casar com livro de nome-prefixo (ex Joao vs 1Joao): exigir header comeca com canon
        h=bigheader(pi)
        if sc>best[0] and h.startswith(CAN[idx][:max(3,len(CAN[idx])-1)]):
            best=(sc,pi)
    if best[1] is None:
        # fallback: melhor score sem prefixo
        for pi in range(max(6,center-9),min(d.page_count,center+10)):
            sc=score(idx,pi)
            if sc>best[0]: best=(sc,pi)
    starts[idx]=best[1] if best[1] is not None else center
    print(f"{idx:2d} {bib[idx]['abbrev']:5s} {NOMES[idx]:16s} hint{ (hint+10) if hint else 0:5d} -> fitz {starts[idx]:5d} sc{best[0]:.2f}  hdr='{bigheader(starts[idx])[:24]}'")
json.dump(starts,open("_ag_starts.json","w"),ensure_ascii=False)
print("OK")
