# -*- coding: utf-8 -*-
"""Limpa OCR dos SUBTÍTULOS (curtos), fiel. Usa OpenAI (chave com crédito). Resumível."""
import sys,os,io,json,re,time,urllib.request,urllib.error,threading
from concurrent.futures import ThreadPoolExecutor
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding="utf-8",errors="replace")
DIR=os.path.dirname(os.path.abspath(__file__))
def keys():
    ks=[]
    for line in open(r"D:\APIS-CLAUDE\COFRE\cofre.env",encoding="utf-8",errors="ignore"):
        m=re.search(r"OPENAI_API_KEY\w*\s*=\s*(sk-\S+)",line)
        if m: ks.append(m.group(1).strip())
    out=[];[out.append(k) for k in ks if k not in out]
    ok=[]; body=json.dumps({"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}],"max_tokens":2}).encode()
    for k in out:
        r=urllib.request.Request("https://api.openai.com/v1/chat/completions",data=body,headers={"Authorization":"Bearer "+k,"Content-Type":"application/json"})
        try: urllib.request.urlopen(r,timeout=20); ok.append(k)
        except urllib.error.HTTPError as e:
            if e.code!=429: ok.append(k)
        except Exception: ok.append(k)
    return ok or out
KEYS=keys()
print("chaves:",len(KEYS),flush=True)
SYS=("Você conserta erros de OCR em TÍTULOS DE SEÇÃO de uma Bíblia (curtos). "
"Restaure acentos/cedilha (coragdo->coração, Farad->Faraó, recem->recém), junte palavras partidas. "
"NÃO reescreva, NÃO traduza, NÃO mude palavras nem a ordem; só conserte a grafia. "
'Responda SOMENTE JSON {"id":"titulo corrigido",...} com as MESMAS chaves.')
def call(mapa,key):
    body=json.dumps({"model":"gpt-4o-mini","temperature":0,"response_format":{"type":"json_object"},
        "messages":[{"role":"system","content":SYS},{"role":"user","content":json.dumps(mapa,ensure_ascii=False)}]}).encode()
    r=urllib.request.Request("https://api.openai.com/v1/chat/completions",data=body,headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"})
    for t in range(5):
        try: return json.loads(json.loads(urllib.request.urlopen(r,timeout=90).read())["choices"][0]["message"]["content"])
        except Exception as e:
            if t==4: raise
            time.sleep(3*(t+1))
def main():
    src=DIR+r"\subtitulos-pentecostal.json"
    s=json.load(open(src,encoding="utf-8"))
    flat=[]
    for ab,ch in s.items():
        for c,vs in ch.items():
            for v,t in vs.items(): flat.append((f"{ab}|{c}|{v}",t))
    print("subtitulos:",len(flat),flush=True)
    BATCH=25
    lotes=[flat[i:i+BATCH] for i in range(0,len(flat),BATCH)]
    done={}; lock=threading.Lock(); cnt={"n":0}
    def work(il):
        idx,lote=il; mapa=dict(lote)
        try: out=call(mapa,KEYS[idx%len(KEYS)])
        except Exception as e: print("erro",e,flush=True); out={}
        with lock:
            for k,orig in lote:
                v=out.get(k) if isinstance(out,dict) else None
                # fidelidade: comprimento parecido
                if isinstance(v,str) and v.strip() and 0.6*len(orig)<=len(v)<=1.6*len(orig)+4: done[k]=v
                else: done[k]=orig
            cnt["n"]+=1
    with ThreadPoolExecutor(max_workers=len(KEYS)) as ex:
        list(ex.map(work,list(enumerate(lotes))))
    # write back
    for ab,ch in s.items():
        for c,vs in ch.items():
            for v in vs:
                k=f"{ab}|{c}|{v}"
                if k in done: vs[v]=done[k]
    if not os.path.exists(src+".bak"):
        import shutil; shutil.copy(src,src+".bak")
    json.dump(s,open(src,"w",encoding="utf-8"),ensure_ascii=False,indent=0)
    print("OK subtitulos limpos:",len(done),flush=True)
if __name__=="__main__": main()
