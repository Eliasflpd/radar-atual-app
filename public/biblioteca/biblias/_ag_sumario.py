# -*- coding: utf-8 -*-
"""Le o Sumario da AG, monta {livro->pagina impressa}, verifica offset."""
import glob,fitz,sys,io,re,json,unicodedata
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding="utf-8",errors="replace")
f=glob.glob(r'E:\DOWNLOADS\BIBLIA PR. RAPHAEL\*GILBERTO*\*.pdf')[0]
d=fitz.open(f)

NOMES=["Gênesis","Êxodo","Levítico","Números","Deuteronômio","Josué","Juízes","Rute","1 Samuel","2 Samuel","1 Reis","2 Reis","1 Crônicas","2 Crônicas","Esdras","Neemias","Ester","Jó","Salmos","Provérbios","Eclesiastes","Cânticos","Isaías","Jeremias","Lamentações","Ezequiel","Daniel","Oseias","Joel","Amós","Obadias","Jonas","Miqueias","Naum","Habacuque","Sofonias","Ageu","Zacarias","Malaquias","Mateus","Marcos","Lucas","João","Atos","Romanos","1 Coríntios","2 Coríntios","Gálatas","Efésios","Filipenses","Colossenses","1 Tessalonicenses","2 Tessalonicenses","1 Timóteo","2 Timóteo","Tito","Filemom","Hebreus","Tiago","1 Pedro","2 Pedro","1 João","2 João","3 João","Judas","Apocalipse"]
def norm(s):
    s=unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode().upper()
    return re.sub(r"[^A-Z0-9]","",s)
# aliases OCR
ALI={norm(n):i for i,n in enumerate(NOMES)}
ALI.update({"CANTARES":21,"UOAO":61,"1OAO":61,"JUIZES":6})
# collect sumario lines from pages 5,6 (0-indexed)
lines=[]
for p in (5,6):
    lines+=d[p].get_text().split("\n")
res={}
for ln in lines:
    m=re.match(r"\s*([1-3]?\s?[A-Za-zÀ-ú][A-Za-zÀ-ú\s]+?)\s*[\.\s_]{2,}\s*(\d{1,4})\s*$",ln)
    if not m: continue
    nm=norm(m.group(1)); pg=int(m.group(2))
    # fuzzy: exact alias or startswith
    idx=ALI.get(nm)
    if idx is None:
        for k,i in ALI.items():
            if nm and (nm==k or (len(nm)>3 and (nm.startswith(k) or k.startswith(nm)))):
                idx=i;break
    if idx is not None and idx not in res:
        res[idx]=pg
print("achados",len(res))
for i in range(66):
    print(f"{i:2d} {NOMES[i]:18s} impressa={res.get(i,'?')}")
json.dump(res,open("_ag_printed.json","w"),ensure_ascii=False)
