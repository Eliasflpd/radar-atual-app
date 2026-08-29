# -*- coding: utf-8 -*-
"""Limpeza OCR das notas via Groq (gpt-oss-120b), FIEL, com trava de fidelidade.
Resumível (mesmo checkpoint _limpeza-pentecostal.ckpt.json). Uso: python _robo_groq.py pentecostal"""
import sys,os,io,json,re,time,urllib.request,urllib.error,threading
from concurrent.futures import ThreadPoolExecutor
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding="utf-8",errors="replace")
DIR=os.path.dirname(os.path.abspath(__file__))
def gkeys():
    ks=[]
    for line in open(r"D:\APIS-CLAUDE\COFRE\cofre.env",encoding="utf-8",errors="ignore"):
        m=re.search(r"GROQ_API_KEY\w*\s*=\s*(\S+)",line)
        if m: ks.append(m.group(1).strip())
    out=[];[out.append(k) for k in ks if k not in out];return out
KEYS=gkeys()
print("groq keys:",len(KEYS),flush=True)

SYS=("Você conserta APENAS erros de OCR em NOTAS DE ESTUDO BÍBLICO em português do Brasil. "
"Correções permitidas: restaurar acentos/til/cedilha (atengao->atenção, criagao->criação, e->é, a->à quando crase), "
"trocar caracteres que o OCR quebrou (í que virou f/1/apóstrofo; '\ufffd' pelo caractere certo pelo contexto; « » por aspas), "
"JUNTAR palavra partida por espaço/hífen de fim de linha (empre gou->empregou, cria gao->criação), "
"e juntar MAIÚSCULAS espaçadas (M O R A L->MORAL). "
"PROIBIDO: NUNCA troque uma palavra por outra (jamais empregou->empreendeu), NUNCA reordene palavras "
"(mantenha 'ERA BOA A LUZ' exatamente assim), NÃO resuma, NÃO reescreva, NÃO traduza, "
"NÃO acrescente nem remova palavras; preserve EXATOS a ordem das palavras, as referências (Gn 1.1), números, nomes e o sentido. "
"Na dúvida sobre palavra partida, apenas una removendo o espaço; jamais invente outra palavra. "
'Responda SOMENTE um objeto JSON {"id":"texto corrigido",...} com as MESMAS chaves recebidas.')

def _one(mapa,key):
    body=json.dumps({"model":"openai/gpt-oss-120b","temperature":0,"reasoning_effort":"low",
        "response_format":{"type":"json_object"},
        "messages":[{"role":"system","content":SYS},
                    {"role":"user","content":"Conserte o OCR e devolva JSON:\n"+json.dumps(mapa,ensure_ascii=False)}]}).encode("utf-8")
    r=urllib.request.Request("https://api.groq.com/openai/v1/chat/completions",data=body,
        headers={"Authorization":"Bearer "+key,"Content-Type":"application/json","User-Agent":"Mozilla/5.0"})
    resp=json.loads(urllib.request.urlopen(r,timeout=120).read())
    return json.loads(resp["choices"][0]["message"]["content"])

_ki=[0]; _klock=threading.Lock()
def call(mapa,startkey=0):
    """rotaciona por TODAS as chaves; em 429 pula p/ próxima; poucos sleeps."""
    n=len(KEYS)
    for attempt in range(n*3):
        with _klock:
            k=KEYS[_ki[0]%n]; _ki[0]+=1
        try:
            return _one(mapa,k)
        except urllib.error.HTTPError as e:
            if e.code==429:
                time.sleep(0.4); continue
            if e.code in (400,413): raise      # JSON/payload -> deixa fallback tratar
            time.sleep(1); continue
        except Exception:
            time.sleep(1); continue
    raise RuntimeError("todas as chaves 429")

def ok_fidelity(orig,clean):
    if not isinstance(clean,str) or not clean.strip(): return False
    lo,lc=len(orig),len(clean)
    if lc<0.7*lo or lc>1.4*lo: return False        # comprimento muito diferente => rejeita
    # nº de palavras parecido (OCR não muda contagem drasticamente; junção reduz pouco)
    wo=len(orig.split()); wc=len(clean.split())
    if wc<0.75*wo or wc>1.1*wo: return False
    return True

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
    src=os.path.join(DIR,f"notas-{bid}.json"); ckpt=os.path.join(DIR,f"_limpeza-{bid}.ckpt.json")
    d=json.load(open(src,encoding="utf-8")); itens=flatten(d)
    done=json.load(open(ckpt,encoding="utf-8")) if os.path.exists(ckpt) else {}
    orig={f"{a}|{c}|{v}":t for a,c,v,t in itens}
    pend=[it for it in itens if f"{it[0]}|{it[1]}|{it[2]}" not in done]
    print(f"[{bid}] total {len(itens)} | feitas {len(done)} | pendentes {len(pend)}",flush=True)
    BATCH=1
    lotes=[pend[i:i+BATCH] for i in range(0,len(pend),BATCH)]
    lock=threading.Lock(); cnt={"n":0,"rej":0}
    def work(idx_lote):
        idx,lote=idx_lote
        mapa={f"{a}|{c}|{v}":t for a,c,v,t in lote}
        try: out=call(mapa)
        except Exception as e:
            out={}
            for kk,tt in mapa.items():
                try: out.update(call({kk:tt}))
                except Exception as e2: print("  erro nota",kk,":",e2,flush=True)
        with lock:
            for k in mapa:
                v=out.get(k) if isinstance(out,dict) else None
                if v and ok_fidelity(orig[k],v): done[k]=v      # só grava se limpou fiel
                else: cnt["rej"]+=1                              # falha/429 -> deixa PENDENTE p/ retry
            cnt["n"]+=1
            if cnt["n"]%10==0 or cnt["n"]==len(lotes):
                json.dump(done,open(ckpt,"w",encoding="utf-8"),ensure_ascii=False)
                print(f"  {cnt['n']}/{len(lotes)} lotes | {len(done)}/{len(itens)} | rejeitados(fidelidade)={cnt['rej']}",flush=True)
    with ThreadPoolExecutor(max_workers=6) as ex:
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
        print(f"[{bid}] CONCLUIDO — {len(done)} notas, rejeitados={cnt['rej']} (.bak salvo)",flush=True)
    else:
        print(f"[{bid}] parcial {len(done)}/{len(itens)}",flush=True)
if __name__=="__main__": main()
