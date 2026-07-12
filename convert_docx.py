import mammoth, os, re

# ── Padrão de referências bíblicas ──────────────────────────────────────────
_BOOKS = (
    r'(?:'
    # NT numerados primeiro (para "1Jo" não bater em "Jo")
    r'[123]\s*Jo|[12]\s*Co|[12]\s*Ts|[12]\s*Tm|[12]\s*Pe|[12]\s*Sm|[12]\s*Rs|[12]\s*Cr|'
    # NT sem número
    r'At|Mt|Mc|Lc|Jo|Rm|Gl|Ef|Fp|Cl|Tt|Fm|Hb|Tg|Jd|Ap|'
    # AT sem número
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
    """Envolve referências bíblicas em <span class="bref"> sem tocar nas tags HTML."""
    parts = re.split(r'(<[^>]+>)', html)
    for i in range(0, len(parts), 2):  # índices pares = texto puro
        parts[i] = _REF_RE.sub(
            lambda m: '<span class="bref" data-ref="'
                      + m.group(0).replace('"', '&quot;')
                      + '">' + m.group(0) + '</span>',
            parts[i]
        )
    return ''.join(parts)

BASE = "D:/RADAR-APP/public/ebd/adulto"
OUT  = BASE + "/html"
os.makedirs(OUT, exist_ok=True)

CSS = """
body{margin:0;padding:20px 20px 64px;background:#fff;font-family:Georgia,serif;font-size:16px;line-height:1.75;color:#1a1a1a;text-align:justify}
p{margin:0 0 12px}
strong{font-weight:900}
ul,ol{margin:4px 0 14px 0;padding:0 0 0 20px}
li{margin-bottom:8px;text-align:justify}

/* TÍTULO da lição */
.titulo{text-align:center;color:#7b0000;font-size:19px;font-weight:900;line-height:1.3;margin:10px 0 2px;padding:0 4px;font-family:Georgia,serif}

/* Data abaixo do título */
.data{text-align:center;font-size:12px;color:#888;font-weight:600;letter-spacing:.5px;margin-bottom:18px}

/* TEXTO ÁUREO */
.box-aureo{background:#fffaf0;border-radius:8px;padding:0 16px 14px;margin:14px 0;font-style:italic;color:#5a3a00;text-align:justify;overflow:hidden}
.box-aureo .lbl{display:block;font-style:normal;font-size:10px;font-weight:900;color:#7a4e00;letter-spacing:2.5px;text-transform:uppercase;margin:0 -16px 12px;padding:6px 16px;text-align:center;background:rgba(201,161,74,.22);border-bottom:1px solid rgba(201,161,74,.35)}

/* VERDADE PRÁTICA */
.box-pratica{background:#f0faf5;border-radius:8px;padding:0 16px 14px;margin:14px 0;color:#1a3a2a;text-align:justify;overflow:hidden}
.box-pratica .lbl{display:block;font-size:10px;font-weight:900;color:#14532d;letter-spacing:2.5px;text-transform:uppercase;margin:0 -16px 12px;padding:6px 16px;text-align:center;background:rgba(22,163,74,.15);border-bottom:1px solid rgba(22,163,74,.3)}

/* Cabeçalhos de seção */
.sec-head{text-align:center;font-size:13px;font-weight:900;color:#1d3a8a;letter-spacing:1.5px;margin:24px 0 10px;padding:10px 0 0;border-top:1px solid #eaeaea}

/* Referência bíblica */
.bible-ref{text-align:center;font-weight:900;color:#1d3a8a;margin:0 0 14px;font-size:14px}

/* Versículos — número inline como superscript */
.bible-passage{margin-bottom:18px}
.verso{margin-bottom:10px;text-align:justify}
.verso-num{font-weight:900;color:#c9a14a;font-size:10px;vertical-align:super;line-height:0;margin-right:2px}
.verso-txt{}

/* Cabeçalho de capítulo romano */
.roman-head{font-weight:900;color:#1d3a8a;font-size:15px;margin:26px 0 6px;padding:10px 12px;background:#f0f4ff;border-left:4px solid #1d3a8a;border-radius:0 6px 6px 0;text-align:left}

/* Subponto numerado — cada um em parágrafo próprio */
.subpoint{text-align:justify;margin-bottom:12px}
.subpoint strong:first-child{color:#1d3a8a}

/* Label embutido */
.lbl-inline{font-weight:900;color:#7b0000;text-transform:uppercase;letter-spacing:.5px}

/* Referência bíblica clicável */
.bref{color:#1d4ed8;font-weight:700;text-decoration:underline dotted;cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
"""

STYLE_MAP = """
b => strong
i => em
u => u
"""

def post_process(body):
    # ─── 1. LEITURA BÍBLICA — divide versículos ───────────────────────────
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

    # ─── 2. Transformar <p> sem classe ─────────────────────────────────────
    def xform(m):
        inner = m.group(1)
        sm = re.match(r'<strong>(.*?)</strong>', inner)
        if not sm:
            return f'<p>{inner}</p>'
        first = sm.group(1)
        rest  = inner[sm.end():].strip()

        # Título da lição
        if re.match(r'^LIÇÃO \d+', first):
            date_m = re.search(r'<strong>Data.*?</strong>(.*?)$', rest, re.DOTALL)
            date_html = ''
            if date_m:
                date_html = f'\n<p class="data">{date_m.group(1).strip()}</p>'
            return f'<p class="titulo">{first}</p>{date_html}'

        # TEXTO ÁUREO
        if first == 'TEXTO ÁUREO':
            return f'<div class="box-aureo"><span class="lbl">Texto Áureo</span>{rest}</div>'

        # VERDADE PRÁTICA
        if first == 'VERDADE PRÁTICA':
            return f'<div class="box-pratica"><span class="lbl">Verdade Prática</span>{rest}</div>'

        # Algarismos romanos — separa cada subponto em parágrafo próprio
        if re.match(r'^[IVX]+\s*-', first):
            heading = f'<p class="roman-head">{first}</p>\n'
            if not rest:
                return heading.strip()
            # divide o corpo nos subpontos numerados (1. 2. 3.)
            subparts = re.split(r'(?=<strong>\d+\.)', rest)
            out = heading
            for part in subparts:
                part = part.strip()
                if part:
                    out += f'<p class="subpoint">{part}</p>\n'
            return out.strip()

        # Subpontos "1. Título..." avulsos
        if re.match(r'^\d+\.', first) and not rest.startswith('<strong>'):
            return f'<p class="subpoint">{inner}</p>'

        # Seções isoladas
        if first in ('LEITURA DIÁRIA','COMENTÁRIO','CONCLUSÃO','REVISANDO O CONTEÚDO'):
            body_txt = f'<p class="sec-head">{first}</p>'
            if rest:
                body_txt += f'\n<p>{rest}</p>'
            return body_txt

        # INTRODUÇÃO inline
        if first.startswith('INTRODUÇÃO'):
            return f'<p><span class="lbl-inline">Introdução</span> {rest}</p>'

        return f'<p>{inner}</p>'

    # só bate em <p> sem atributos
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


for i in range(1, 14):
    convert(f"{BASE}/licoes/licao-{i}.docx", f"{OUT}/licao-{i:02d}.html")
for i in range(1, 14):
    convert(f"{BASE}/apoio/apoio-{i}.docx",  f"{OUT}/apoio-{i:02d}.html")

print("Pronto.")
