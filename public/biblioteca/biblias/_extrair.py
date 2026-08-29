# -*- coding: utf-8 -*-
"""
EXTRATOR DE NOTAS DE ESTUDO — RADAR Bíblias (método IA, formato-agnóstico)
A IA lê cada página CRUA do PDF (colunas na ordem), identifica o LIVRO pelo cabeçalho/refs,
extrai SÓ as notas de estudo (não o texto bíblico), conserta OCR e devolve por versículo.
Resumível (checkpoint por página) e seguro.

Uso:
  python _extrair.py <id> "<pedaço-do-nome-do-PDF>" [pag_ini] [pag_fim]
  ex (proof):  python _extrair.py macarthur "MACARTHUR" 34 82
  ex (tudo):   python _extrair.py macarthur "MACARTHUR"
Saída: notas-<id>.json  (formato {abbrev:{cap:{ver:texto}}}) + _extrai-<id>.prog.json
"""
import sys, os, io, re, json, time, glob, urllib.request
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
import fitz
DIR = os.path.dirname(os.path.abspath(__file__))

def key():
    for l in open(r"D:\APIS-CLAUDE\CHAVES.md", encoding="utf-8", errors="ignore"):
        m = re.search(r"sk-proj-[A-Za-z0-9_-]{20,}", l)
        if m: return m.group(0)
    raise SystemExit("sem chave OpenAI")
KEY = key()

# livros canônicos (abbrev do leitor) a partir do biblia.json
BOOKS = json.load(open(os.path.join(DIR, "..", "..", "biblia.json"), encoding="utf-8-sig"))
NOMES = "; ".join(f"{b['name']}={b['abbrev']}" for b in BOOKS)
ABBREVS = {b['abbrev'] for b in BOOKS}

SYS = (
    "Você recebe o TEXTO CRU (OCR sujo, colunas às vezes embaralhadas) de UMA página de uma Bíblia de Estudo. "
    "Sua tarefa: extrair SOMENTE as NOTAS DE ESTUDO / notas de rodapé (comentário do editor), NUNCA o texto bíblico dos versículos. "
    "Cada nota se refere a um versículo (ex.: '3:16') ou faixa ('3:16-18'). Desembaralhe as colunas, junte cada nota inteira, "
    "conserte o OCR (acentos, ç, '0'->'o', palavras partidas) SEM mudar o conteúdo, sem resumir, sem inventar. "
    "Identifique a que LIVRO da Bíblia esta página pertence, pelo cabeçalho/refs. Use SOMENTE esta tabela de abreviações: "
    + NOMES + ". "
    "Responda um JSON: {\"abbrev\":\"<abbrev do livro ou vazio se não der>\",\"notas\":{\"3:16\":\"texto\",...}}. "
    "Se a página não tiver notas de estudo (só texto bíblico, índice, capa), responda {\"abbrev\":\"\",\"notas\":{}}."
)

def call(txt):
    body = json.dumps({"model":"gpt-4o-mini","temperature":0,"response_format":{"type":"json_object"},
        "messages":[{"role":"system","content":SYS},{"role":"user","content":txt[:9000]}]}).encode("utf-8")
    req = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=body,
        headers={"Authorization":"Bearer "+KEY,"Content-Type":"application/json"})
    for t in range(4):
        try:
            r = urllib.request.urlopen(req, timeout=120)
            return json.loads(json.loads(r.read().decode("utf-8"))["choices"][0]["message"]["content"])
        except Exception as e:
            if t==3: raise
            time.sleep(3*(t+1))

def raw_page(pg):
    W = pg.rect.width; mid = W/2
    bl = [b for b in pg.get_text("blocks") if b[4].strip()]
    esq = sorted([b for b in bl if (b[0]+b[2])/2 < mid], key=lambda b:b[1])
    dr  = sorted([b for b in bl if (b[0]+b[2])/2 >= mid], key=lambda b:b[1])
    return "\n".join(b[4].strip() for b in esq+dr)

def main():
    bid = sys.argv[1]; needle = sys.argv[2]
    pdfs = glob.glob(r"E:/DOWNLOADS/BIBLIA PR. RAPHAEL/BIBLIAS/*.pdf")
    hit = [f for f in pdfs if needle.upper() in os.path.basename(f).upper()]
    if not hit: raise SystemExit("PDF não achado p/ "+needle)
    f = hit[0]; d = fitz.open(f)
    p0 = int(sys.argv[3]) if len(sys.argv)>3 else 0
    p1 = int(sys.argv[4]) if len(sys.argv)>4 else d.page_count
    out = os.path.join(DIR, f"notas-{bid}.json")
    prog = os.path.join(DIR, f"_extrai-{bid}.prog.json")
    notas = json.load(open(out, encoding="utf-8")) if os.path.exists(out) else {"_fonte": os.path.basename(f)}
    done = json.load(open(prog, encoding="utf-8")).get("last",-1) if os.path.exists(prog) else -1
    print(f"[{bid}] {os.path.basename(f)} | paginas {d.page_count} | janela {p0}-{p1} | retoma de {done+1}", flush=True)
    add = 0
    for pi in range(max(p0, done+1), p1):
        txt = raw_page(d[pi])
        if not re.search(r"\d+[:.]\d+", txt):  # sem ref de versiculo, provável só texto/índice
            done = pi
            if pi % 25 == 0: json.dump({"last":done}, open(prog,"w"))
            continue
        try:
            r = call(txt)
        except Exception as e:
            print(f"  pg{pi} erro {e}", flush=True); continue
        ab = (r.get("abbrev") or "").strip().lower()
        nt = r.get("notas") or {}
        if ab in ABBREVS and nt:
            book = notas.setdefault(ab, {})
            for ref, texto in nt.items():
                mm = re.match(r"\s*(\d+)\s*[:.]\s*(\d+)", str(ref))
                if not mm or not isinstance(texto,str) or not texto.strip(): continue
                cap, ver = mm.group(1), mm.group(2)
                book.setdefault(cap, {})[ver] = texto.strip()
                add += 1
        done = pi
        json.dump(notas, open(out,"w",encoding="utf-8"), ensure_ascii=False)
        json.dump({"last":done}, open(prog,"w"))
        if pi % 20 == 0:
            tot = sum(len(v) for k,c in notas.items() if isinstance(c,dict) for v in c.values() if isinstance(v,dict))
            print(f"  pg{pi}/{p1} | notas acumuladas ~{add}", flush=True)
    print(f"[{bid}] FIM janela — notas somadas nesta rodada: {add} | arquivo: notas-{bid}.json", flush=True)

if __name__ == "__main__":
    main()
