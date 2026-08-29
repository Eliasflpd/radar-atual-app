# -*- coding: utf-8 -*-
"""Aplica o checkpoint de limpeza (parcial ou total) no notas-<id>.json, com .bak.
Notas não presentes no checkpoint permanecem como estão. Uso: python _apply_ckpt.py pentecostal"""
import sys,os,io,json
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding="utf-8",errors="replace")
DIR=os.path.dirname(os.path.abspath(__file__))
bid=sys.argv[1] if len(sys.argv)>1 else "pentecostal"
src=os.path.join(DIR,f"notas-{bid}.json"); ckpt=os.path.join(DIR,f"_limpeza-{bid}.ckpt.json")
d=json.load(open(src,encoding="utf-8"))
done=json.load(open(ckpt,encoding="utf-8"))
if not os.path.exists(src+".bak"):
    import shutil; shutil.copy(src,src+".bak"); print(".bak criado")
n=0
for ab,caps in d.items():
    if not isinstance(caps,dict): continue
    for cap,vers in caps.items():
        if not isinstance(vers,dict): continue
        for ver in vers:
            k=f"{ab}|{cap}|{ver}"
            if k in done and isinstance(done[k],str) and done[k].strip():
                vers[ver]=done[k]; n+=1
json.dump(d,open(src,"w",encoding="utf-8"),ensure_ascii=False)
print(f"aplicadas {n} notas limpas em {os.path.basename(src)}")
