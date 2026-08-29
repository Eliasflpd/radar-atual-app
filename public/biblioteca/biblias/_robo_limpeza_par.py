# -*- coding: utf-8 -*-
"""Limpeza OCR paralela das notas (resumível, multi-chave). Uso: python _robo_limpeza_par.py pentecostal"""
import sys, os, io, json, re, time, urllib.request, threading
from concurrent.futures import ThreadPoolExecutor

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
DIR = os.path.dirname(os.path.abspath(__file__))

def keys():
    ks=[]
    src=r"D:\APIS-CLAUDE\COFRE\cofre.env"
    if os.path.exists(src):
        for line in open(src,encoding="utf-8",errors="ignore"):
            m=re.search(r"OPENAI_API_KEY\w*\s*=\s*(sk-[A-Za-z0-9_-]{20,})",line)
            if m: ks.append(m.group(1))
    if not ks:
        for line in open(r"D:\APIS-CLAUDE\CHAVES.md",encoding="utf-8",errors="ignore"):
            m=re.search(r"sk-proj-[A-Za-z0-9_-]{20,}",line)
            if m: ks.append(m.group(0))
    seen=[];[seen.append(k) for k in ks if k not in seen]
    return seen

def working_keys(ks):
    import urllib.error
    ok=[]
    body=json.dumps({"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}],"max_tokens":2}).encode()
    for k in ks:
        r=urllib.request.Request("https://api.openai.com/v1/chat/completions",data=body,
            headers={"Authorization":"Bearer "+k,"Content-Type":"application/json"})
        try:
            urllib.request.urlopen(r,timeout=20); ok.append(k)
        except urllib.error.HTTPError as e:
            if e.code!=429: ok.append(k)   # 429 sem crédito = descarta; outros erros mantém
        except Exception: ok.append(k)
    return ok or ks

KEYS=working_keys(keys())
print("chaves com credito:",len(KEYS),flush=True)

SYS = (
    "Você conserta erros de OCR em NOTAS DE ESTUDO BÍBLICO em português do Brasil. "
    "Os textos vêm com acentuação quebrada, cedilha trocada por 'g' (atengao=atenção, criagao=criação), "
    "acentos virando aspa/f/0 (princi'pio=princípio, Bfblia=Bíblia, 0=o), caracteres estranhos (=Ê,Õ,Ç,«,» conforme o contexto), "
    "palavras partidas por quebra de linha (empre gou=empregou) e MAIÚSCULAS espaçadas (M O R A L=MORAL). "
    "CONSERTE tudo isso restaurando o português correto. "
    "REGRAS: NÃO resuma, NÃO reescreva, NÃO acrescente nem remova conteúdo, NÃO traduza, "
    "mantenha as referências bíblicas (Gn 1.1), números e o sentido EXATOS. Apenas conserte a grafia. "
    "Responda SOMENTE um objeto JSON {\"id\": \"texto corrigido\", ...} com as MESMAS chaves recebidas."
)

def call_openai(mapa, key):
    body = json.dumps({
        "model": "gpt-4o-mini","temperature":0,
        "response_format":{"type":"json_object"},
        "messages":[{"role":"system","content":SYS},
            {"role":"user","content":"Conserte o OCR destas notas e devolva o JSON:\n"+json.dumps(mapa,ensure_ascii=False)}],
    }).encode("utf-8")
    req=urllib.request.Request("https://api.openai.com/v1/chat/completions",data=body,
        headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"})
    for tent in range(5):
        try:
            r=urllib.request.urlopen(req,timeout=120)
            j=json.loads(r.read().decode("utf-8"))
            return json.loads(j["choices"][0]["message"]["content"])
        except Exception as e:
            if tent==4: raise
            time.sleep(5*(tent+1))

def flatten(d):
    it=[]
    for ab,caps in d.items():
        if not isinstance(caps,dict): continue
        for cap,vers in caps.items():
            if not isinstance(vers,dict): continue
            for ver,txt in vers.items():
                if isinstance(txt,str) and txt.strip(): it.append((ab,cap,ver,txt))
    return it

def main():
    bid=sys.argv[1] if len(sys.argv)>1 else "pentecostal"
    src=os.path.join(DIR,f"notas-{bid}.json")
    ckpt=os.path.join(DIR,f"_limpeza-{bid}.ckpt.json")
    d=json.load(open(src,encoding="utf-8"))
    itens=flatten(d)
    done=json.load(open(ckpt,encoding="utf-8")) if os.path.exists(ckpt) else {}
    pend=[it for it in itens if f"{it[0]}|{it[1]}|{it[2]}" not in done]
    print(f"[{bid}] total {len(itens)} | feitas {len(done)} | pendentes {len(pend)}",flush=True)

    BATCH=12
    lotes=[pend[i:i+BATCH] for i in range(0,len(pend),BATCH)]
    lock=threading.Lock()
    counter={"n":0,"done":len(done)}
    def work(idx_lote):
        idx,lote=idx_lote
        key=KEYS[idx % len(KEYS)]
        mapa={f"{ab}|{cap}|{ver}":txt for ab,cap,ver,txt in lote}
        try:
            out=call_openai(mapa,key)
        except Exception as e:
            print("  erro lote:",e,flush=True); return
        with lock:
            for k,v in out.items():
                if isinstance(v,str) and v.strip(): done[k]=v
            counter["n"]+=1; counter["done"]=len(done)
            if counter["n"]%10==0 or counter["n"]==len(lotes):
                json.dump(done,open(ckpt,"w",encoding="utf-8"),ensure_ascii=False)
                print(f"  {counter['n']}/{len(lotes)} lotes | {len(done)}/{len(itens)}",flush=True)
    with ThreadPoolExecutor(max_workers=len(KEYS)) as ex:   # 1 thread por chave = rate-limit natural
        list(ex.map(work,list(enumerate(lotes))))
    json.dump(done,open(ckpt,"w",encoding="utf-8"),ensure_ascii=False)

    if len(done)>=len(itens):
        for ab,caps in d.items():
            if not isinstance(caps,dict): continue
            for cap,vers in caps.items():
                if not isinstance(vers,dict): continue
                for ver in vers:
                    k=f"{ab}|{cap}|{ver}"
                    if k in done: vers[ver]=done[k]
        if not os.path.exists(src+".bak"):
            import shutil; shutil.copy(src,src+".bak")
        json.dump(d,open(src,"w",encoding="utf-8"),ensure_ascii=False)
        print(f"[{bid}] CONCLUIDO — {len(done)} notas limpas, gravado (.bak salvo)",flush=True)
    else:
        print(f"[{bid}] parcial {len(done)}/{len(itens)} — rode de novo",flush=True)

if __name__=="__main__":
    main()
