# -*- coding: utf-8 -*-
"""
Motor de extração EBD (revista CPAD -> RADAR).
Gera: capas de cada lição em máxima qualidade (300 DPI) + HTML do texto
(a partir da lição 10), no formato fiel do app (CSS Georgia, refs bíblicas
viram <span class="bref">). Prova na JUVENIS; depois replica nas outras.
"""
import fitz, re, os, html as _html

DL = os.path.expanduser("~/Downloads")
DIR = next(p for p in os.listdir(DL) if p.startswith("CPAD") and "TRIMESTRE" in p)
ALUNO = os.path.join(DL, DIR, "JUVENIS", "Revista de Juvenis_Aluno_7 2.pdf")
PROF  = os.path.join(DL, DIR, "JUVENIS", "Revista de Juvenis_Professor_7.pdf")

OUT = r"D:/RADAR-APP/public/ebd/juvenis"
os.makedirs(OUT + "/img", exist_ok=True)
os.makedirs(OUT + "/html", exist_ok=True)

# n, título, página de ABERTURA no PDF do ALUNO (printed + offset 2)
LES = [
 (1,'A SUPERIORIDADE DE CRISTO',7),
 (2,'CRISTO ENTENDE VOCÊ',12),
 (3,'A FÉ E O NOSSO RELACIONAMENTO COM DEUS',17),
 (4,'MAIS QUE VENCEDOR: PROVAS E TENTAÇÕES',22),
 (5,'FÉ E OBRAS',27),
 (6,'UMA ARMA PODEROSAMENTE MORTAL',32),
 (7,'A SANTIFICAÇÃO NECESSÁRIA',37),
 (8,'O PROPÓSITO DO SOFRIMENTO',42),
 (9,'INIMIGO ÍNTIMO',46),
 (10,'UMA CARTA PARA VOCÊ',50),
 (11,'DIGA "NÃO!"',54),
 (12,'CUIDADO COM O EGO E SUAS AMBIÇÕES',58),
 (13,'LUTE POR SUA FÉ',62),
]

# ── refs bíblicas viram <span class="bref"> (igual convert_jovem.py) ──
_BOOKS = (r'(?:[123]\s*Jo|[12]\s*Co|[12]\s*Ts|[12]\s*Tm|[12]\s*Pe|[12]\s*Sm|'
          r'[12]\s*Rs|[12]\s*Cr|At|Mt|Mc|Lc|Jo|Rm|Gl|Ef|Fp|Cl|Tt|Fm|Hb|Tg|Jd|Ap|'
          r'Gn|Ex|Lv|Nm|Dt|Js|Jz|Rt|Ed|Ne|Et|Jó|Sl|Pv|Ec|Ct|Is|Jr|Lm|Ez|Dn|Os|'
          r'Jl|Am|Ob|Jn|Mq|Na|Hc|Sf|Ag|Zc|Ml)')
_VREF = r'\d+[.:]\d+(?:[,\-]\d+)?'
_REF_RE = re.compile(r'(?<!\w)(' + _BOOKS + r'\s+' + _VREF +
                     r'(?:\s*;\s*(?:' + _BOOKS + r'\s+)?' + _VREF + r')*)', re.UNICODE)
def linkify(h):
    parts = re.split(r'(<[^>]+>)', h)
    for i in range(0, len(parts), 2):
        parts[i] = _REF_RE.sub(lambda m: f'<span class="bref" data-ref="{m.group(0)}">{m.group(0)}</span>', parts[i])
    return ''.join(parts)

CSS = ("body{margin:0;padding:20px 20px 64px;background:#fff;font-family:Georgia,serif;"
       "font-size:16px;line-height:1.75;color:#1a1a1a;text-align:justify}"
       "h1{font-size:21px;line-height:1.25;margin:0 0 6px;color:#0f2c4a;text-align:left}"
       ".sub{color:#8a6a1e;font-weight:700;font-size:13px;margin:0 0 16px;text-align:left}"
       "p{margin:0 0 12px}strong{font-weight:900}"
       ".bref{color:#1863c4;font-weight:700;cursor:pointer;border-bottom:1px dotted #1863c4}")

def limpa(t):
    t = t.replace('\r', '')
    t = re.sub(r'[ \t]+', ' ', t)
    linhas = [l.strip() for l in t.split('\n')]
    # junta em parágrafos: linha vazia separa
    paras, buff = [], []
    for l in linhas:
        if not l:
            if buff: paras.append(' '.join(buff)); buff=[]
        else:
            buff.append(l)
    if buff: paras.append(' '.join(buff))
    # remove ruído curto (números de página soltos, rodapé)
    paras = [p for p in paras if len(p) > 2 and not re.fullmatch(r'\d{1,3}', p)]
    return paras

def html_licao(doc, n, title, ini, fim):
    txt = "\n".join(doc[p].get_text('text') for p in range(ini-1, fim))
    paras = limpa(txt)
    corpo = "\n".join(f'<p>{linkify(_html.escape(p))}</p>' for p in paras)
    return (f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<style>{CSS}</style></head><body>'
            f'<h1>{_html.escape(title)}</h1><div class="sub">Lição {n} · Juvenis · 3º Trim 2026</div>'
            f'{corpo}</body></html>')

def run():
    da = fitz.open(ALUNO)
    # CAPAS de todas as 13 lições, 300 DPI (máxima qualidade)
    for n, title, pg in LES:
        pix = da[pg-1].get_pixmap(dpi=300)
        pix.save(f"{OUT}/img/licao-{n:02d}.jpg")
    print("capas:", len([1 for _ in LES]), "em 300dpi")
    # HTML do ALUNO (licao-NN.html) a partir da lição 10
    for i, (n, title, pg) in enumerate(LES):
        if n < 10: continue
        fim = LES[i+1][2]-1 if i+1 < len(LES) else len(da)
        open(f"{OUT}/html/licao-{n:02d}.html", "w", encoding="utf-8").write(html_licao(da, n, title, pg, fim))
    print("licao-10..13.html ok")
    # HTML do PROFESSOR (apoio-NN.html) — mesma revista do professor
    if os.path.exists(PROF):
        dp = fitz.open(PROF)
        # o professor costuma ter o MESMO índice; tenta o mesmo mapa de páginas
        for i, (n, title, pg) in enumerate(LES):
            if n < 10: continue
            fim = LES[i+1][2]-1 if i+1 < len(LES) else len(dp)
            pg2 = min(pg, len(dp))
            open(f"{OUT}/html/apoio-{n:02d}.html", "w", encoding="utf-8").write(html_licao(dp, n, title, pg2, min(fim, len(dp))))
        print("apoio-10..13.html ok (professor)")

if __name__ == "__main__":
    run()
    print("PRONTO")
