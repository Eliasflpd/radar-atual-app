# -*- coding: utf-8 -*-
"""Limpa OCR das introduções (fiel) e gera HTML estruturado. Resumível.
Uso: python _intros_clean.py [abbrev|all]"""
import sys,os,io,json,re,time,urllib.request,threading
from concurrent.futures import ThreadPoolExecutor
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding="utf-8",errors="replace")
DIR=os.path.dirname(os.path.abspath(__file__))
def keys():
    ks=[];src=r"D:\APIS-CLAUDE\COFRE\cofre.env"
    if os.path.exists(src):
        for line in open(src,encoding="utf-8",errors="ignore"):
            m=re.search(r"OPENAI_API_KEY\w*\s*=\s*(sk-[A-Za-z0-9_-]{20,})",line)
            if m: ks.append(m.group(1))
    if not ks:
        for line in open(r"D:\APIS-CLAUDE\CHAVES.md",encoding="utf-8",errors="ignore"):
            m=re.search(r"sk-proj-[A-Za-z0-9_-]{20,}",line)
            if m: ks.append(m.group(0))
    out=[]; [out.append(k) for k in ks if k not in out]; return out
def working(ks):
    import urllib.error
    ok=[]; body=json.dumps({"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}],"max_tokens":2}).encode()
    for k in ks:
        r=urllib.request.Request("https://api.openai.com/v1/chat/completions",data=body,headers={"Authorization":"Bearer "+k,"Content-Type":"application/json"})
        try: urllib.request.urlopen(r,timeout=20); ok.append(k)
        except urllib.error.HTTPError as e:
            if e.code!=429: ok.append(k)
        except Exception: ok.append(k)
    return ok or ks
KEYS=working(keys())

SYS=(
"Você RESTAURA a INTRODUÇÃO de um livro da Bíblia de Estudo Pentecostal (CPAD) que veio de um OCR sujo. "
"O texto tem: um ESBOÇO (outline com I., A., 1. e referências como 1.1-2.25), e campos/§ como Autor, Data, Tema, Propósito, "
"Considerações Preliminares, Características Especiais, Visão Panorâmica, Fundo Histórico, etc. "
"SUA TAREFA: (1) Consertar TODOS os erros de OCR (acentos, ç trocado por g: criagao=criação; í virou f/1/'; palavras grudadas; "
"'�' e '«»' pelo caractere correto no contexto; MAIÚSCULAS espaçadas; hifenização de quebra de linha). "
"(2) Remover LIXO de digitalização: letras soltas de capitular ('A','AO'), números de página soltos, cabeçalhos repetidos "
"(ex.: 'GENESIS : INTRODUÇÃO'). "
"(3) Estruturar em HTML SIMPLES e fiel, SEM inventar nada. Formato: "
"para o esboço use <h4>Esboço</h4> seguido das linhas do outline separadas por <br> (preserve numeração I./A./1. e as referências entre parênteses). "
"Para cada rótulo (Autor, Data, Tema, Propósito, etc.) use <h4>Rótulo</h4><p>conteúdo</p>. "
"Parágrafos de prosa em <p>...</p>. "
"REGRAS DE FIDELIDADE ABSOLUTA: NÃO resuma, NÃO reescreva, NÃO traduza, NÃO acrescente nem remova conteúdo ou palavras; "
"apenas conserte a grafia e organize o que já existe. Mantenha nomes, datas, números e referências EXATOS. "
"Responda SOMENTE com o HTML (sem ```), começando por uma tag."
)

def call(txt,key):
    body=json.dumps({"model":"gpt-4o-mini","temperature":0,
        "messages":[{"role":"system","content":SYS},
                    {"role":"user","content":"Restaure e estruture esta introdução:\n\n"+txt}]}).encode("utf-8")
    req=urllib.request.Request("https://api.openai.com/v1/chat/completions",data=body,
        headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"})
    for t in range(5):
        try:
            r=urllib.request.urlopen(req,timeout=180)
            j=json.loads(r.read().decode("utf-8"))
            return j["choices"][0]["message"]["content"].strip()
        except Exception as e:
            if t==4: raise
            time.sleep(2*(t+1))

def main():
    arg=sys.argv[1] if len(sys.argv)>1 else "all"
    raw=json.load(open(DIR+r"\_intros_raw.json",encoding="utf-8"))
    out_path=DIR+r"\intros-pentecostal.json"
    out=json.load(open(out_path,encoding="utf-8")) if os.path.exists(out_path) else {}
    items=[(ab,d) for ab,d in raw.items()]
    if arg!="all":
        items=[(ab,d) for ab,d in items if ab==arg]
    todo=[(ab,d) for ab,d in items if ab not in out]
    print("chaves:",len(KEYS),"| a limpar:",len(todo),flush=True)
    lock=threading.Lock(); cnt={"n":0}
    def work(i_ab):
        i,(ab,d)=i_ab
        html=call(d["raw"],KEYS[i%len(KEYS)])
        html=re.sub(r"^```html\s*|```$","",html).strip()
        html=re.sub(r"(?is)<!doctype[^>]*>|</?html[^>]*>|<head>.*?</head>|</?body[^>]*>","",html).strip()
        html=re.sub(r"(?is)<title>.*?</title>","",html).strip()
        with lock:
            out[ab]=html; cnt["n"]+=1
            json.dump(out,open(out_path,"w",encoding="utf-8"),ensure_ascii=False,indent=0)
            print(f"  {cnt['n']}/{len(todo)} {ab} ({len(html)}c)",flush=True)
    with ThreadPoolExecutor(max_workers=max(3,len(KEYS)*2)) as ex:
        list(ex.map(work,list(enumerate(todo))))
    json.dump(out,open(out_path,"w",encoding="utf-8"),ensure_ascii=False,indent=0)
    print("OK intros:",len(out),flush=True)

if __name__=="__main__": main()
