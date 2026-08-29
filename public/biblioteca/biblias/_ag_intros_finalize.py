# -*- coding: utf-8 -*-
"""Finaliza as introducoes AG: descarta livros ruins, limpa prefixo, conserta OCR via LLM (FIEL),
estrutura em HTML e grava intros-antonio-gilberto.json."""
import sys,os,io,re,json,time,urllib.request,urllib.error,unicodedata,difflib
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding="utf-8",errors="replace")
DIR=os.path.dirname(os.path.abspath(__file__))

env={}
for l in open(r"D:\APIS-CLAUDE\COFRE\cofre.env",encoding="utf-8",errors="ignore"):
    m=re.match(r"\s*([A-Z0-9_]+)\s*=\s*(\S+)",l)
    if m: env[m.group(1)]=m.group(2)
def K(*n): return [env[x] for x in n if env.get(x)]
SLOTS=[]
for k in K("DEEPSEEK_API_KEY","DEEPSEEK_API_KEY_2"): SLOTS.append(("DeepSeek","https://api.deepseek.com/chat/completions",k,"deepseek-chat"))
for k in K("CEREBRAS_API_KEY","CEREBRAS_API_KEY_2","CEREBRAS_API_KEY_3"): SLOTS.append(("Cerebras","https://api.cerebras.ai/v1/chat/completions",k,"llama-3.3-70b"))
for k in K("NVIDIA_API_KEY"): SLOTS.append(("NVIDIA","https://integrate.api.nvidia.com/v1/chat/completions",k,"meta/llama-3.3-70b-instruct"))
def probe():
    ok=[]
    for s in SLOTS:
        name,url,key,model=s
        b=json.dumps({"model":model,"temperature":0,"max_tokens":3,"messages":[{"role":"user","content":"ok"}]}).encode()
        r=urllib.request.Request(url,data=b,headers={"Authorization":"Bearer "+key,"Content-Type":"application/json","User-Agent":"Mozilla/5.0"})
        try: urllib.request.urlopen(r,timeout=15).read(); ok.append(s)
        except Exception as e: print("slot fora",name,str(e)[:30])
    return ok
SLOTS=probe(); print("slots:",[s[0] for s in SLOTS])
if not SLOTS: raise SystemExit("sem slot")

SYS=("Voce conserta APENAS erros de OCR num texto de INTRODUCAO de livro biblico em portugues do Brasil. "
"Permitido: restaurar acentos/til/cedilha (historia->historia com acento, Biblia, secao, acao, e->e com acento, a->a com crase); "
"trocar caracteres quebrados pelo OCR (f->i com acento quando for 'i'; '0' que era a letra 'o'; £->E; simbolos soltos como ^ que separavam letras de uma palavra: 'se ^ ao'->'secao' com acento); "
"juntar palavra partida por espaco ('ab ran ge'->'abrange') ou por hifen de fim de linha ('deriva - se'->'deriva-se', 'aproxi - mar'->'aproximar'); "
"normalizar espacos antes de pontuacao. "
"PROIBIDO: NUNCA troque uma palavra por outra, NUNCA reordene, NAO resuma, NAO reescreva, NAO traduza, NAO acrescente nem remova palavras, referencias (Gn 1.1), numeros ou nomes. Preserve EXATA a ordem das palavras e o sentido. "
"Responda SOMENTE com o texto corrigido, sem aspas, rotulos ou comentarios.")

def clean_one(text):
    mx=min(4000,int(len(text)/1.5)+400)
    for i in range(len(SLOTS)*2):
        name,url,key,model=SLOTS[i%len(SLOTS)]
        b=json.dumps({"model":model,"temperature":0,"max_tokens":mx,
            "messages":[{"role":"system","content":SYS},{"role":"user","content":text}]}).encode("utf-8")
        r=urllib.request.Request(url,data=b,headers={"Authorization":"Bearer "+key,"Content-Type":"application/json","User-Agent":"Mozilla/5.0"})
        try:
            resp=json.loads(urllib.request.urlopen(r,timeout=120).read())
            return resp["choices"][0]["message"]["content"].strip()
        except Exception: time.sleep(0.5)
    return None
def canon(s):
    s=unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode().lower()
    return re.sub(r"[^a-z0-9]","",s)
def ok_fid(orig,clean):
    if not clean or not clean.strip(): return False
    if re.match(r"(?i)\s*(desculp|sorry|n[aã]o posso|aqui est|claro[,:]|segue|here is|nota:)",clean): return False
    co,cc=canon(orig),canon(clean)
    if not co or not cc: return False
    # autojunk=False: senao letras comuns viram 'junk' em strings longas e o ratio despenca
    return difflib.SequenceMatcher(None,co,cc,autojunk=False).ratio()>=0.88

# ---------- limpeza de prefixo / lixo ----------
DROP={"is","ag","lm","ed","fm","2jo","3jo","ap"}
ANCHOR={"rt":"Rute faz","1rs":"1 e 2 Reis","ne":"Neemias ,","et":"0 livro de Ester",
        "fp":"A Epfstola aos Filipenses","2sm":"2 Samuel e a","jd":"A Epfstola de Judas"}
def prefix_fix(ab,t):
    if ab in ANCHOR:
        i=t.find(ANCHOR[ab])
        if i>0: t=t[i:]
    # remove ornamento SINTESE residual e simbolos soltos no comeco
    t=re.sub(r"^[^A-Za-zÀ-ú0]*","",t)
    return t.strip()

# ---------- estrutura em HTML ----------
LAB=r"(T[íi]tulo|Autor(?:ia)?|Data|[ÉE]poca|Tema|Assunto|Esfera de a[çc][ãa]o|Divis[ãa]o|Mensagem|Prop[óo]sito|Palavra[- ]chave|Vers[íi]culo[- ]chave|Ocasi[ãa]o|Destinat[áa]rios?|Esbo[çc]o|Conte[úu]do|Finalidade|Contexto|Local|G[êe]nero)"
def esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
def structure(txt):
    txt=re.sub(r"\s+"," ",txt).strip()
    parts=re.split(r"\s*\b"+LAB+r"\b\s*[:.]?\s*",txt)
    html=""
    if len(parts)>=3:
        lead=parts[0].strip()
        if len(lead)>3: html+="<p>"+esc(lead)+"</p>"
        it=iter(parts[1:])
        for lab in it:
            body=next(it,"").strip()
            if not body: continue
            html+="<h4>"+esc(lab.strip())+"</h4><p>"+esc(body)+"</p>"
    else:
        html="<p>"+esc(txt)+"</p>"
    return html

def main():
    raw=json.load(open(os.path.join(DIR,"_ag_intros_raw.json"),encoding="utf-8"))
    ck=os.path.join(DIR,"_ag_intros_clean.ckpt.json")
    done=json.load(open(ck,encoding="utf-8")) if os.path.exists(ck) else {}
    items=[(ab,t) for ab,t in raw.items() if ab not in DROP and len(t.strip())>=300]
    print("livros a processar:",len(items),"| ja limpos:",len(done))
    for ab,t in items:
        if ab in done: continue
        pt=prefix_fix(ab,t)
        out=None
        for attempt in range(3):
            c=clean_one(pt)
            if c and ok_fid(pt,c): out=c; break
        if out is None:
            print("  REJEITADO (fica cru):",ab); out=pt  # mantem cru se LLM falhar
        done[ab]=out
        json.dump(done,open(ck,"w",encoding="utf-8"),ensure_ascii=False)
        print(f"  {ab:5s} ok ({len(out)})")
    # monta HTML final
    final={ab:structure(txt) for ab,txt in done.items()}
    json.dump(final,open(os.path.join(DIR,"intros-antonio-gilberto.json"),"w",encoding="utf-8"),ensure_ascii=False,indent=0)
    print("GRAVADO intros-antonio-gilberto.json com",len(final),"livros")
if __name__=="__main__": main()
