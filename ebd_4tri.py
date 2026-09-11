# -*- coding: utf-8 -*-
"""4º TRIMESTRE 2026 -> RADAR (adulto4 = O Deus da Aliança; jovem4 = Filipenses).
Professor: capas 300dpi + 13 lições limpas por IA. Vão como PRÓXIMO TRIMESTRE (travadas)."""
import fitz, re, os, json, html as _html, urllib.request, urllib.error, time

DL = os.path.expanduser("~/Downloads")

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

# (turma, nome, pdf, tema, [(n,titulo,printed_pag)...])
ADULTO_T = [(1,'DEUTERONÔMIO: O LIVRO DA ALIANÇA',3),(2,'RECAPITULANDO A JORNADA NO DESERTO',10),
 (3,'A FIDELIDADE DE DEUS DIANTE DA INFIDELIDADE DE ISRAEL',18),(4,'O CHAMADO À OBEDIÊNCIA',25),
 (5,'O GRANDE MANDAMENTO',32),(6,'A ALIANÇA E AS BÊNÇÃOS DA OBEDIÊNCIA',39),(7,'MALDIÇÕES E BÊNÇÃOS DA ALIANÇA',46),
 (8,'ESCOLHENDO A VIDA OU A MORTE',53),(9,'A SUCESSÃO DE MOISÉS',60),(10,'O CÂNTICO DE MOISÉS: ADVERTÊNCIA E ESPERANÇA',67),
 (11,'A BÊNÇÃO FINAL DE MOISÉS',74),(12,'A MORTE DE MOISÉS E A CONTINUIDADE DA PROMESSA',81),(13,'O CUMPRIMENTO DE DEUTERONÔMIO EM CRISTO',89)]
JOVEM_T = [(1,'CARTA AOS FILIPENSES: UM CHAMADO À ALEGRIA',3),(2,'UMA VIDA DIGNA DO EVANGELHO',11),
 (3,'A HUMILDADE DE CRISTO: O EXEMPLO SUPREMO',18),(4,'BRILHE A LUZ DE CRISTO EM MEIO À GERAÇÃO CORROMPIDA',25),
 (5,'EXEMPLO DE SERVOS FIÉIS: TIMÓTEO E EPAFRODITO',32),(6,'GUARDANDO-SE DOS FALSOS MESTRES',39),
 (7,'O ALVO SUPREMO: CONHECER A CRISTO',47),(8,'UNIDADE E ALEGRIA NO SENHOR',55),(9,'A PAZ DE DEUS GUARDA O CORAÇÃO',62),
 (10,'O PENSAR CRISTÃO: O QUE OCUPA A SUA MENTE?',69),(11,'CONTENTAMENTO EM TODA E QUALQUER SITUAÇÃO',76),
 (12,'GENEROSIDADE E CUIDADO COM A OBRA DE DEUS',83),(13,'SAUDAÇÕES FINAIS, COMUNHÃO E BÊNÇÃOS',90)]

REVISTAS = [
  ('adulto4','Adultos · 4º Tri 2026','REVISTA_ADULTO_PROF_4TRIM_2026.pdf','O Deus da Aliança (Deuteronômio)',ADULTO_T),
  ('jovem4','Jovens · 4º Tri 2026','EBD_JOVENS_PROF_4_TRIMESTRE_2026.pdf','Filipenses',JOVEM_T),
]

CSS = ("body{margin:0;padding:22px 20px 70px;background:#fff;font-family:Georgia,serif;font-size:16.5px;line-height:1.78;color:#1a1a1a;text-align:justify}"
       "h1{font-size:22px;line-height:1.25;margin:0 0 4px;color:#0f2c4a;text-align:left}"
       ".sub{color:#8a6a1e;font-weight:700;font-size:12.5px;letter-spacing:.4px;margin:0 0 18px;text-align:left;text-transform:uppercase}"
       "h2.sec{font-size:16.5px;color:#123a6b;margin:20px 0 8px;text-align:left;font-family:Georgia,serif}"
       "p{margin:0 0 12px}strong{font-weight:900}.bref{color:#1863c4;font-weight:700;cursor:pointer;border-bottom:1px dotted #1863c4}")
_BOOKS=(r'(?:[123]\s*Jo|[12]\s*Co|[12]\s*Ts|[12]\s*Tm|[12]\s*Pe|[12]\s*Sm|[12]\s*Rs|[12]\s*Cr|At|Mt|Mc|Lc|Jo|Rm|Gl|Ef|Fp|Cl|Tt|Fm|Hb|Tg|Jd|Ap|Gn|Ex|Lv|Nm|Dt|Js|Jz|Rt|Ed|Ne|Et|Jó|Sl|Pv|Ec|Ct|Is|Jr|Lm|Ez|Dn|Os|Jl|Am|Ob|Jn|Mq|Na|Hc|Sf|Ag|Zc|Ml)')
_REF=re.compile(r'(?<!\w)('+_BOOKS+r'\s+\d+[.:]\d+(?:[,\-]\d+)?(?:\s*;\s*(?:'+_BOOKS+r'\s+)?\d+[.:]\d+(?:[,\-]\d+)?)*)')
def linkify(h): return _REF.sub(lambda m:f'<span class="bref" data-ref="{m.group(0)}">{m.group(0)}</span>',h)

def groq(texto, tema):
    sysm=("Você recebe o TEXTO BRUTO (com erros de OCR) de UMA lição da revista EBD da CPAD (tema: "+tema+"). "
          "LIMPE e devolva FIEL: conserte OCR, junte palavras quebradas por hífen, conserte acentos, remova lixo "
          "(símbolos, números de página soltos, rodapé, marcas de ícone). NÃO invente, NÃO resuma, NÃO comente. "
          "Preserve TUDO: versículo-chave, leituras, subtítulos numerados (1., 2.1.), perguntas. Cada SUBTÍTULO começa com '## '. "
          "Parágrafos separados por linha em branco. Responda SÓ o texto limpo.")
    body=json.dumps({"model":"openai/gpt-oss-20b","temperature":0.1,"max_tokens":11000,"reasoning_effort":"low",
        "messages":[{"role":"system","content":sysm},{"role":"user","content":texto[:13000]}]}).encode()
    for t in range(6):
        k=GROQ_KEYS[t%len(GROQ_KEYS)]
        try:
            req=urllib.request.Request("https://api.groq.com/openai/v1/chat/completions",body,
                {"Authorization":"Bearer "+k,"Content-Type":"application/json","User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            return json.loads(urllib.request.urlopen(req,timeout=180).read())["choices"][0]["message"]["content"].strip()
        except urllib.error.HTTPError as e:
            if e.code==429:
                ra=e.headers.get("retry-after"); esp=float(ra) if ra else 8*(t+1); print(f"   429 {esp:.0f}s"); time.sleep(min(esp+2,65)); continue
            print("   http",e.code); time.sleep(3)
        except Exception as ex: print("   erro",str(ex)[:60]); time.sleep(3)
    return texto

def to_html(titulo,n,sub,limpo):
    o=[]
    for b in re.split(r'\n\s*\n',limpo):
        b=b.strip()
        if not b: continue
        b=re.sub(r'^##\s*','',b) if not b.startswith('## ') else b
        o.append(f'<h2 class="sec">{_html.escape(b[3:].strip())}</h2>' if b.startswith('## ') else f'<p>{linkify(_html.escape(b))}</p>')
    return (f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<style>{CSS}</style></head><body><h1>{_html.escape(titulo)}</h1><div class="sub">{_html.escape(sub)}</div>{"".join(o)}</body></html>')

def run():
    for turma,sub,pdf,tema,LES in REVISTAS:
        OUT=f"D:/RADAR-APP/public/ebd/{turma}"; os.makedirs(OUT+"/img",exist_ok=True); os.makedirs(OUT+"/html",exist_ok=True)
        d=fitz.open(os.path.join(DL,pdf)); N=len(d)
        opens=[p+2 for (_,_,p) in LES]  # offset +2
        print(f"== {turma} ({N} pgs) ==")
        for i,(n,t,pp) in enumerate(LES):
            d[opens[i]-1].get_pixmap(dpi=300).save(f"{OUT}/img/licao-{n:02d}.jpg")
        print("  13 capas ok")
        for i,(n,t,pp) in enumerate(LES):
            ini=opens[i]; fim=(opens[i+1]-1) if i+1<len(opens) else N
            print(f"  licao {n}...")
            limpo=groq("\n".join(d[p].get_text('text') for p in range(ini-1,fim)), tema)
            open(f"{OUT}/html/licao-{n:02d}.html","w",encoding="utf-8").write(to_html(t,n,f'Lição {n} · {sub}',limpo))
    print("PRONTO")

if __name__=="__main__": run()
