# -*- coding: utf-8 -*-
"""JUVENIS -> RADAR. Capas 300 DPI + texto (aluno=licao, professor=apoio) a
partir da lição 10, LIMPO por IA (Groq) pra ficar fiel (conserta OCR do PDF)."""
import fitz, re, os, json, html as _html, urllib.request, urllib.error, time

DL = os.path.expanduser("~/Downloads")
DIR = next(p for p in os.listdir(DL) if p.startswith("CPAD") and "TRIMESTRE" in p)
J = os.path.join(DL, DIR, "JUVENIS")
ALUNO = os.path.join(J, "Revista de Juvenis_Aluno_7 2.pdf")
PROF  = os.path.join(J, "Revista de Juvenis_Professor_7.pdf")
OUT = r"D:/RADAR-APP/public/ebd/juvenis"
os.makedirs(OUT + "/img", exist_ok=True); os.makedirs(OUT + "/html", exist_ok=True)

# ── CHAVES GROQ: NUNCA escritas aqui (senão vazam num `git add -A`) ──────────
# Lê de GROQ_API_KEYS (várias, separadas por vírgula, igual à cascata do
# api/_lib/ia.js) ou GROQ_API_KEY; se não achar, cai no cofre CHAVES.md.
def _groq_keys():
    ks = []
    for nome in ("GROQ_API_KEYS", "GROQ_API_KEY"):
        ks += re.split(r"[,\s;]+", os.environ.get(nome, "").strip())
    if not [k for k in ks if k.strip()]:
        cofre = os.environ.get("COFRE_CHAVES", r"D:\APIS-CLAUDE\CHAVES.md")
        try:
            with open(cofre, encoding="utf-8", errors="ignore") as f:
                ks = re.findall(r"gsk_[A-Za-z0-9]{20,}", f.read())
        except OSError:
            ks = []
    out = []
    for k in ks:
        k = k.strip()
        if k and k not in out: out.append(k)
    if not out:
        raise SystemExit("Sem chave Groq: defina GROQ_API_KEYS=chave1,chave2 "
                         r"ou preencha o cofre D:\APIS-CLAUDE\CHAVES.md")
    return out

GROQ_KEYS = _groq_keys()

# n, titulo, pag ABERTURA no PDF (offset +2 nos dois)
ALUNO_LES = [(10,'UMA CARTA PARA VOCÊ',50,53),(11,'DIGA "NÃO!"',54,57),
             (12,'CUIDADO COM O EGO E SUAS AMBIÇÕES',58,61),(13,'LUTE POR SUA FÉ',62,65)]
PROF_LES  = [(10,'UMA CARTA PARA VOCÊ',70,76),(11,'DIGA "NÃO!"',77,83),
             (12,'CUIDADO COM O EGO E SUAS AMBIÇÕES',84,90),(13,'LUTE POR SUA FÉ',91,97)]
# capas: todas as 13 (pag abertura aluno)
CAPAS = [7,12,17,22,27,32,37,42,46,50,54,58,62]

CSS = ("body{margin:0;padding:22px 20px 70px;background:#fff;font-family:Georgia,serif;"
       "font-size:16.5px;line-height:1.78;color:#1a1a1a;text-align:justify}"
       "h1{font-size:22px;line-height:1.25;margin:0 0 4px;color:#0f2c4a;text-align:left}"
       ".sub{color:#8a6a1e;font-weight:700;font-size:12.5px;letter-spacing:.4px;margin:0 0 18px;text-align:left;text-transform:uppercase}"
       "h2.sec{font-size:16.5px;color:#123a6b;margin:20px 0 8px;text-align:left;font-family:Georgia,serif}"
       "p{margin:0 0 12px}strong{font-weight:900}"
       ".bref{color:#1863c4;font-weight:700;cursor:pointer;border-bottom:1px dotted #1863c4}")

_BOOKS = (r'(?:[123]\s*Jo|[12]\s*Co|[12]\s*Ts|[12]\s*Tm|[12]\s*Pe|[12]\s*Sm|[12]\s*Rs|[12]\s*Cr|'
          r'At|Mt|Mc|Lc|Jo|Rm|Gl|Ef|Fp|Cl|Tt|Fm|Hb|Tg|Jd|Ap|Gn|Ex|Lv|Nm|Dt|Js|Jz|Rt|Ed|Ne|Et|'
          r'Jó|Sl|Pv|Ec|Ct|Is|Jr|Lm|Ez|Dn|Os|Jl|Am|Ob|Jn|Mq|Na|Hc|Sf|Ag|Zc|Ml)')
_REF = re.compile(r'(?<!\w)(' + _BOOKS + r'\s+\d+[.:]\d+(?:[,\-]\d+)?(?:\s*;\s*(?:' + _BOOKS + r'\s+)?\d+[.:]\d+(?:[,\-]\d+)?)*)')
def linkify(h): return _REF.sub(lambda m: f'<span class="bref" data-ref="{m.group(0)}">{m.group(0)}</span>', h)

def groq(texto):
    sys = ("Você recebe o TEXTO BRUTO (com erros de digitalização/OCR) de UMA lição da revista EBD Juvenis da CPAD. "
           "LIMPE e devolva FIEL: conserte erros de OCR (ex.: 'Fithinhos'->'Filhinhos', 'the arrastou'->'lhe arrastou'), "
           "junte palavras quebradas por hífen, conserte acentos, remova lixo (símbolos ¥, números de página soltos, "
           "'JUVENIS' de rodapé, marcas de ícone soltas). NÃO invente, NÃO resuma, NÃO comente. Preserve TUDO: versículo-chave, "
           "leituras diárias, LEITURA BÍBLICA EM CLASSE, subtítulos numerados (1., 2.1., etc.), e as perguntas de HORA DA REVISÃO. "
           "Marque cada SUBTÍTULO/seção com '## ' no início da linha. Separe parágrafos por linha em branco. Responda SÓ o texto limpo.")
    body = json.dumps({"model":"openai/gpt-oss-20b","temperature":0.1,"max_tokens":12000,"reasoning_effort":"low",
        "messages":[{"role":"system","content":sys},{"role":"user","content":texto[:14000]}]}).encode()
    for tent in range(6):  # tenta com backoff no 429, rodiziando chave
        k = GROQ_KEYS[tent % len(GROQ_KEYS)]
        try:
            req = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions", body,
                {"Authorization":"Bearer "+k,"Content-Type":"application/json",
                 "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
            r = json.loads(urllib.request.urlopen(req, timeout=180).read())
            return r["choices"][0]["message"]["content"].strip()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                ra = e.headers.get("retry-after"); esp = float(ra) if ra else (8*(tent+1))
                print(f"  429, esperando {esp:.0f}s..."); time.sleep(min(esp+2, 65)); continue
            print("  http", e.code, e.read().decode()[:120]); time.sleep(3)
        except Exception as e:
            print("  erro:", str(e)[:80]); time.sleep(3)
    return texto  # se tudo falhar, devolve cru

def to_html(titulo, n, limpo):
    out = []
    for bloco in re.split(r'\n\s*\n', limpo):
        b = bloco.strip()
        if not b: continue
        if b.startswith('## '):
            out.append(f'<h2 class="sec">{_html.escape(b[3:].strip())}</h2>')
        else:
            out.append(f'<p>{linkify(_html.escape(b))}</p>')
    return (f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1"><style>{CSS}</style></head><body>'
            f'<h1>{_html.escape(titulo)}</h1><div class="sub">Lição {n} · Juvenis · 3º Trim 2026</div>'
            f'{"".join(out)}</body></html>')

def extrai(doc, ini, fim):
    return "\n".join(doc[p].get_text('text') for p in range(ini-1, fim))

def run():
    da = fitz.open(ALUNO); dp = fitz.open(PROF)
    # capas 300 DPI
    for i, pg in enumerate(CAPAS, 1):
        da[pg-1].get_pixmap(dpi=300).save(f"{OUT}/img/licao-{i:02d}.jpg")
    print("13 capas 300dpi ok")
    # ALUNO -> licao-NN.html (limpo por IA)
    for n,t,ini,fim in ALUNO_LES:
        print("aluno licao", n, "...")
        limpo = groq(extrai(da, ini, fim))
        open(f"{OUT}/html/licao-{n:02d}.html","w",encoding="utf-8").write(to_html(t,n,limpo))
    # PROFESSOR -> apoio-NN.html (limpo por IA)
    for n,t,ini,fim in PROF_LES:
        print("prof apoio", n, "...")
        limpo = groq(extrai(dp, ini, fim))
        open(f"{OUT}/html/apoio-{n:02d}.html","w",encoding="utf-8").write(to_html(t,n,limpo))
    print("PRONTO")

if __name__ == "__main__":
    run()
