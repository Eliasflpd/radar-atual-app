# -*- coding: utf-8 -*-
import glob,fitz,sys,io,re
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding="utf-8",errors="replace")
f=glob.glob(r'E:\DOWNLOADS\BIBLIA PR. RAPHAEL\*GILBERTO*\*.pdf')[0]
d=fitz.open(f)
print("PAGES",d.page_count)
which=sys.argv[1:] or ["3","4","5","6","7","8"]
for s in which:
    p=int(s)
    t=d[p].get_text()
    print("==== PDF page",p,"len",len(t),"====")
    print(t[:1800])
