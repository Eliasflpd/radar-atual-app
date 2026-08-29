# -*- coding: utf-8 -*-
"""Limpeza OCR das notas via MULTIPLOS provedores (rotacao). FIEL. Resumivel.
Uso: python _robo_multi.py pentecostal"""
import sys,os,io,json,re,time,urllib.request,urllib.error,threading,itertools
from concurrent.futures import ThreadPoolExecutor
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding="utf-8",errors="replace")
DIR=os.path.dirname(os.path.abspath(__file__))
env={}
for l in open(r"D:\APIS-CLAUDE\COFRE\cofre.env",encoding="utf-8",errors="ignore"):
    m=re.match(r"\s*([A-Z0-9_]+)\s*=\s*(\S+)",l)
    if m: env[m.group(1)]=m.group(2)
def K(*names): return [env[n] for n in names if env.get(n)]

# pool de slots FIEIS (llama-3.3-70b / deepseek-chat) — so os que respondem
SLOTS=[]
for k in K("DEEPSEEK_API_KEY"):
    SLOTS.append(("DeepSeek","https://api.deepseek.com/chat/completions",k,"deepseek-chat"))
for k in K("OPENROUTER_API_KEY","OPENROUTER_API_KEY_2"):
    SLOTS.append(("OpenRouter","https://openrouter.ai/api/v1/chat/completions",k,"meta-llama/llama-3.3-70b-instruct"))

def probe():
    ok=[]
    for name,url,key,model in SLOTS:
        body=json.dumps({"model":model,"temperature":0,"max_tokens":3,"messages":[{"role":"user","content":"ok"}]}).encode()
        r=urllib.request.Request(url,data=body,headers={"Authorization":"Bearer "+key,"Content-Type":"application/json","User-Agent":"Mozilla/5.0"})
        try:
            urllib.request.urlopen(r,timeout=12).read(); ok.append((name,url,key,model))
        except Exception as e:
            print("  slot fora:",name,str(e)[:40],flush=True)
    return ok
SLOTS=probe()
print("slots ATIVOS:",[s[0] for s in SLOTS],flush=True)
if not SLOTS: raise SystemExit("nenhum slot ativo")

SYS=("Você conserta APENAS erros de OCR em uma NOTA DE ESTUDO BÍBLICO em português do Brasil. "
"Permitido: restaurar acentos/til/cedilha (atengao->atenção, criagao->criação, e->é, a->à quando crase), "
"trocar caracteres que o OCR quebrou (í que virou f/1/apóstrofo; '\ufffd' pelo caractere certo pelo contexto; « » por aspas), "
"JUNTAR palavra partida por espaço/hífen de fim de linha (empre gou->empregou), juntar MAIÚSCULAS espaçadas (M O R A L->MORAL). "
"PROIBIDO: NUNCA troque uma palavra por outra, NUNCA reordene palavras, NÃO resuma, NÃO reescreva, NÃO traduza, "
"NÃO acrescente nem remova palavras nem comentários. Preserve EXATOS a ordem das palavras, referências (Gn 1.1), números, nomes e o sentido. "
"Responda SOMENTE com o texto corrigido — nada de aspas, rótulos ou explicações.")

_cyc=itertools.cycle(range(len(SLOTS))); _clock=threading.Lock()
def _next():
    with _clock: return next(_cyc)
def clean_one(text):
    mx=min(8000,int(len(text)/2)+400)   # espaco de saida suficiente p/ nota longa
    for attempt in range(len(SLOTS)*2):
        i=_next(); name,url,key,model=SLOTS[i]
        body=json.dumps({"model":model,"temperature":0,"max_tokens":mx,
            "messages":[{"role":"system","content":SYS},{"role":"user","content":text}]}).encode("utf-8")
        r=urllib.request.Request(url,data=body,headers={"Authorization":"Bearer "+key,"Content-Type":"application/json","User-Agent":"Mozilla/5.0"})
        try:
            resp=json.loads(urllib.request.urlopen(r,timeout=120).read())
            return resp["choices"][0]["message"]["content"].strip()
        except urllib.error.HTTPError as e:
            if e.code in (429,402,403,404,410,401): time.sleep(0.2); continue
            time.sleep(0.6); continue
        except Exception:
            time.sleep(0.6); continue
    return None

import unicodedata,difflib
def _canon(s):
    s=unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode().lower()
    return re.sub(r"[^a-z0-9]","",s)   # tira espacos/acentos/pontuacao -> so as letras/numeros
def ok_fidelity(orig,clean):
    if not isinstance(clean,str) or not clean.strip(): return False
    if re.match(r"(?i)\s*(desculp|sorry|n[aã]o posso|aqui est|claro[,:]|segue o|here is|note:|nota:)",clean): return False
    co,cc=_canon(orig),_canon(clean)
    if not cc or not co: return False
    # conteudo de letras deve bater (OCR so muda acento/juncao/char) -> pega juncao E pega truncamento/resumo
    r=difflib.SequenceMatcher(None,co,cc).ratio()
    return r>=0.90

def flatten(d):
    return [(a,c,v,t) for a,caps in d.items() if isinstance(caps,dict)
            for c,vs in caps.items() if isinstance(vs,dict)
            for v,t in vs.items() if isinstance(t,str) and t.strip()]

def main():
    bid=sys.argv[1] if len(sys.argv)>1 else "pentecostal"
    src=os.path.join(DIR,f"notas-{bid}.json"); ckpt=os.path.join(DIR,f"_limpeza-{bid}.ckpt.json")
    d=json.load(open(src,encoding="utf-8")); itens=flatten(d)
    done=json.load(open(ckpt,encoding="utf-8")) if os.path.exists(ckpt) else {}
    orig={f"{a}|{c}|{v}":t for a,c,v,t in itens}
    pend=[it for it in itens if f"{it[0]}|{it[1]}|{it[2]}" not in done]
    pend.sort(key=lambda it:len(it[3]))   # menores primeiro = ganhos rápidos
    print(f"[{bid}] total {len(itens)} | feitas {len(done)} | pendentes {len(pend)}",flush=True)
    lock=threading.Lock(); cnt={"n":0,"ok":0,"rej":0}
    def work(it):
        a,c,v,t=it; k=f"{a}|{c}|{v}"
        out=clean_one(t)
        with lock:
            cnt["n"]+=1
            if out and ok_fidelity(orig[k],out): done[k]=out; cnt["ok"]+=1
            else: cnt["rej"]+=1        # falha -> deixa pendente p/ proxima rodada
            if cnt["n"]%10==0:
                json.dump(done,open(ckpt,"w",encoding="utf-8"),ensure_ascii=False)
                print(f"  {cnt['n']}/{len(pend)} | limpas {len(done)}/{len(itens)} | falhas {cnt['rej']}",flush=True)
    with ThreadPoolExecutor(max_workers=len(SLOTS)*3) as ex:
        list(ex.map(work,pend))
    json.dump(done,open(ckpt,"w",encoding="utf-8"),ensure_ascii=False)
    print(f"[{bid}] rodada fim: limpas {len(done)}/{len(itens)} | falhas nesta rodada {cnt['rej']}",flush=True)
if __name__=="__main__": main()
