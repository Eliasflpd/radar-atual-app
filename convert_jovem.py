import mammoth, os, re, glob

# ── Referências bíblicas ────────────────────────────────────────────────────
_BOOKS = (
    r'(?:'
    r'[123]\s*Jo|[12]\s*Co|[12]\s*Ts|[12]\s*Tm|[12]\s*Pe|[12]\s*Sm|[12]\s*Rs|[12]\s*Cr|'
    r'At|Mt|Mc|Lc|Jo|Rm|Gl|Ef|Fp|Cl|Tt|Fm|Hb|Tg|Jd|Ap|'
    r'Gn|Ex|Lv|Nm|Dt|Js|Jz|Rt|Ed|Ne|Et|Jó|Sl|Pv|Ec|Ct|'
    r'Is|Jr|Lm|Ez|Dn|Os|Jl|Am|Ob|Jn|Mq|Na|Hc|Sf|Ag|Zc|Ml'
    r')'
)
_VREF  = r'\d+[.]\d+(?:[,\-]\d+)?'
_REF_RE = re.compile(
    r'(?<!\w)(' + _BOOKS + r'\s+' + _VREF
    + r'(?:\s*;\s*(?:' + _BOOKS + r'\s+)?' + _VREF + r')*)',
    re.UNICODE
)

def linkify_refs(html):
    parts = re.split(r'(<[^>]+>)', html)
    for i in range(0, len(parts), 2):
        parts[i] = _REF_RE.sub(
            lambda m: '<span class="bref" data-ref="'
                      + m.group(0).replace('"', '&quot;')
                      + '">' + m.group(0) + '</span>',
            parts[i]
        )
    return ''.join(parts)

SRC_DIR = "D:/RADAR ATUAL/EBD/LIÇÃO JOVEM/LIÇÕES"
OUT_DIR = "D:/RADAR-APP/public/ebd/jovem/html"
os.makedirs(OUT_DIR, exist_ok=True)

# Mapa número → nome do arquivo (glob por número)
LESSONS = [
    (1,  "O LIVRO DE JUÍZES: QUANDO CADA UM FAZIA O QUE PARECIA CERTO"),
    (2,  "FIDELIDADE A DEUS: UMA QUESTÃO DE ESCOLHA"),
    (3,  "CLAMOR E LIBERTAÇÃO: A LIDERANÇA DE OTNIEL"),
    (4,  "EÚDE E SANGAR: DEUS USA OS IMPROVÁVEIS"),
    (5,  "DÉBORA E BARAQUE: UNIÃO PARA FAZER A OBRA DE DEUS"),
    (6,  "GIDEÃO: DEUS TRANSFORMA A INSEGURANÇA EM CORAGEM"),
    (7,  "O FIM DA LIDERANÇA DE GIDEÃO E O GOVERNO DE ABIMELEQUE"),
    (8,  "JEFTÉ: DE REJEITADO A LIBERTADOR"),
    (9,  "SANSÃO: A FORÇA E A FRAQUEZA DE UM JOVEM"),
    (10, "SANSÃO: ENTRE VITÓRIAS E DERROTAS"),
    (11, "CRISE ESPIRITUAL E FALSA RELIGIOSIDADE"),
    (12, "TEMPOS DE DECADÊNCIA MORAL E MALDADE"),
    (13, "ESPERANÇA EM MEIO AO CAOS: AGUARDANDO A VINDA DO REI"),
]

CSS = """
body{margin:0;padding:20px 20px 64px;background:#fff;font-family:Georgia,serif;font-size:16px;line-height:1.75;color:#1a1a1a;text-align:justify}
p{margin:0 0 12px}
strong{font-weight:900}
ul,ol{margin:4px 0 14px 0;padding:0 0 0 20px}
li{margin-bottom:8px;text-align:justify}

.titulo{text-align:center;color:#1d3a8a;font-size:19px;font-weight:900;line-height:1.3;margin:10px 0 2px;padding:0 4px;font-family:Georgia,serif}
.data{text-align:center;font-size:12px;color:#888;font-weight:600;letter-spacing:.5px;margin-bottom:18px}

/* TEXTO ÁUREO */
.box-aureo{background:#fffaf0;border-radius:8px;padding:0 16px 14px;margin:14px 0;font-style:italic;color:#5a3a00;text-align:justify;overflow:hidden}
.box-aureo .lbl{display:block;font-style:normal;font-size:10px;font-weight:900;color:#7a4e00;letter-spacing:2.5px;text-transform:uppercase;margin:0 -16px 12px;padding:6px 16px;text-align:center;background:rgba(201,161,74,.22);border-bottom:1px solid rgba(201,161,74,.35)}

/* VERDADE PRÁTICA */
.box-pratica{background:#f0faf5;border-radius:8px;padding:0 16px 14px;margin:14px 0;color:#1a3a2a;text-align:justify;overflow:hidden}
.box-pratica .lbl{display:block;font-size:10px;font-weight:900;color:#14532d;letter-spacing:2.5px;text-transform:uppercase;margin:0 -16px 12px;padding:6px 16px;text-align:center;background:rgba(22,163,74,.15);border-bottom:1px solid rgba(22,163,74,.3)}

.sec-head{text-align:center;font-size:13px;font-weight:900;color:#1d3a8a;letter-spacing:1.5px;margin:24px 0 10px;padding:10px 0 0;border-top:1px solid #eaeaea}
.bible-ref{text-align:center;font-weight:900;color:#1d3a8a;margin:0 0 14px;font-size:14px}
.bible-passage{margin-bottom:18px}
.verso{margin-bottom:10px;text-align:justify}
.verso-num{font-weight:900;color:#c9a14a;font-size:10px;vertical-align:super;line-height:0;margin-right:2px}
.roman-head{font-weight:900;color:#1d3a8a;font-size:15px;margin:26px 0 6px;padding:10px 12px;background:#f0f4ff;border-left:4px solid #1d3a8a;border-radius:0 6px 6px 0;text-align:left}
.subpoint{text-align:justify;margin-bottom:12px}
.subpoint strong:first-child{color:#1d3a8a}
.lbl-inline{font-weight:900;color:#1d3a8a;text-transform:uppercase;letter-spacing:.5px}
.bref{color:#1d4ed8;font-weight:700;text-decoration:underline dotted;cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
"""

STYLE_MAP = """
b => strong
i => em
u => u
"""

def post_process(body):
    def split_bible(m):
        inner = m.group(1)
        p = re.match(
            r'(<strong>LEITURA BÍBLICA EM CLASSE</strong>)\s*(<strong>[^<]+</strong>)\s*(.*)',
            inner, re.DOTALL)
        if not p:
            return f'<p class="sec-head">{inner}</p>'
        head, ref, passage = p.group(1), p.group(2), p.group(3).strip()
        parts = re.split(r'<strong>(\d+)\s*-</strong>', passage)
        out = (f'<p class="sec-head">{head}</p>\n'
               f'<p class="bible-ref">{ref}</p>\n'
               f'<div class="bible-passage">')
        i = 1
        while i < len(parts):
            num = parts[i]
            txt = parts[i+1].strip() if i+1 < len(parts) else ''
            out += (f'\n<p class="verso">'
                    f'<span class="verso-num">{num}</span>'
                    f'{txt}'
                    f'</p>')
            i += 2
        return out + '\n</div>'

    body = re.sub(
        r'<p>(<strong>LEITURA BÍBLICA EM CLASSE</strong>.*?)</p>',
        split_bible, body, flags=re.DOTALL)

    def xform(m):
        inner = m.group(1)
        sm = re.match(r'<strong>(.*?)</strong>', inner)
        if not sm:
            return f'<p>{inner}</p>'
        first = sm.group(1)
        rest  = inner[sm.end():].strip()

        if re.match(r'^LIÇÃO \d+', first):
            date_m = re.search(r'<strong>Data.*?</strong>(.*?)$', rest, re.DOTALL)
            date_html = ''
            if date_m:
                date_html = f'\n<p class="data">{date_m.group(1).strip()}</p>'
            return f'<p class="titulo">{first}</p>{date_html}'

        if first == 'TEXTO ÁUREO':
            return f'<div class="box-aureo"><span class="lbl">Texto Áureo</span>{rest}</div>'

        if first == 'VERDADE PRÁTICA':
            return f'<div class="box-pratica"><span class="lbl">Verdade Prática</span>{rest}</div>'

        if re.match(r'^[IVX]+\s*-', first):
            heading = f'<p class="roman-head">{first}</p>\n'
            if not rest:
                return heading.strip()
            subparts = re.split(r'(?=<strong>\d+\.)', rest)
            out = heading
            for part in subparts:
                part = part.strip()
                if part:
                    out += f'<p class="subpoint">{part}</p>\n'
            return out.strip()

        if re.match(r'^\d+\.', first) and not rest.startswith('<strong>'):
            return f'<p class="subpoint">{inner}</p>'

        if first in ('LEITURA DIÁRIA','COMENTÁRIO','CONCLUSÃO','REVISANDO O CONTEÚDO','OBJETIVOS','INTERAÇÃO','PARA REFLETIR'):
            body_txt = f'<p class="sec-head">{first}</p>'
            if rest:
                body_txt += f'\n<p>{rest}</p>'
            return body_txt

        if first.startswith('INTRODUÇÃO'):
            return f'<p><span class="lbl-inline">Introdução</span> {rest}</p>'

        return f'<p>{inner}</p>'

    body = re.sub(r'<p>(.*?)</p>', xform, body, flags=re.DOTALL)
    return body


REF_JS = """<script>
document.addEventListener('touchstart',function(e){
  if(e.target.closest('.bref')) e.preventDefault();
},{passive:false});
document.addEventListener('touchend',function(e){
  var el=e.target.closest('.bref');
  if(el){e.preventDefault();window.parent.postMessage({type:'ebd-ref',ref:el.dataset.ref},'*');}
},{passive:false});
document.addEventListener('click',function(e){
  var el=e.target.closest('.bref');
  if(el) window.parent.postMessage({type:'ebd-ref',ref:el.dataset.ref},'*');
});
</script>"""

def convert(src, dst):
    with open(src, 'rb') as f:
        result = mammoth.convert_to_html(f, style_map=STYLE_MAP)
    body = post_process(result.value)
    body = linkify_refs(body)
    full = (f"<!DOCTYPE html><html><head>"
            f"<meta charset='utf-8'>"
            f"<meta name='viewport' content='width=device-width,initial-scale=1'>"
            f"<style>{CSS}</style></head><body>{body}{REF_JS}</body></html>")
    with open(dst, 'w', encoding='utf-8') as f:
        f.write(full)
    print(f"  OK {dst}")

for num, titulo in LESSONS:
    pattern = f"{SRC_DIR}/LIÇÃO {num} - *.docx"
    found = glob.glob(pattern)
    if not found:
        print(f"  AVISO: nao encontrado - {pattern}")
        continue
    src = found[0]
    dst = f"{OUT_DIR}/licao-{num:02d}.html"
    print(f"Lição {num}: {os.path.basename(src)}")
    convert(src, dst)

print("\nPronto.")
