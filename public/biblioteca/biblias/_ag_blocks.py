# -*- coding: utf-8 -*-
import glob,fitz,sys,io
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding="utf-8",errors="replace")
f=glob.glob(r'E:\DOWNLOADS\BIBLIA PR. RAPHAEL\*GILBERTO*\*.pdf')[0]
d=fitz.open(f)
p=int(sys.argv[1])
pg=d[p]
print("PAGE",p,"rect",pg.rect)
dd=pg.get_text("dict")
for b in dd["blocks"]:
    if "lines" not in b: continue
    x0,y0,x1,y1=b["bbox"]
    # gather text + font sizes
    txt=[]; sizes=set()
    for l in b["lines"]:
        for s in l["spans"]:
            txt.append(s["text"]); sizes.add(round(s["size"],1))
    t=" ".join(txt).strip()
    if not t: continue
    print(f"[x{x0:5.0f}-{x1:5.0f} y{y0:5.0f} sz{sorted(sizes)}] {t[:110]}")
