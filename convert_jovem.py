import mammoth, os, re, glob

# ── Bible ref linkifier ────────────────────────────────────────────────────────
_BOOKS = (r'(?:[123]\s*Jo|[12]\s*Co|[12]\s*Ts|[12]\s*Tm|[12]\s*Pe|[12]\s*Sm|'
          r'[12]\s*Rs|[12]\s*Cr|At|Mt|Mc|Lc|Jo|Rm|Gl|Ef|Fp|Cl|Tt|Fm|Hb|Tg|Jd|Ap|'
          r'Gn|Ex|Lv|Nm|Dt|Js|Jz|Rt|Ed|Ne|Et|Jó|Sl|Pv|Ec|Ct|Is|Jr|Lm|Ez|Dn|Os|'
          r'Jl|Am|Ob|Jn|Mq|Na|Hc|Sf|Ag|Zc|Ml)')
_VREF   = r'\d+[.]\d+(?:[,\-]\d+)?'
_REF_RE = re.compile(
    r'(?<!\w)(' + _BOOKS + r'\s+' + _VREF
    + r'(?:\s*;\s*(?:' + _BOOKS + r'\s+)?' + _VREF + r')*)',
    re.UNICODE)

def linkify(html):
    parts = re.split(r'(<[^>]+>)', html)
    for i in range(0, len(parts), 2):
        parts[i] = _REF_RE.sub(
            lambda m: f'<span class="bref" data-ref="{m.group(0).replace(chr(34),"&quot;")}">{m.group(0)}</span>',
            parts[i])
    return ''.join(parts)

# ── Paths ─────────────────────────────────────────────────────────────────────
SRC = "D:/RADAR ATUAL/EBD/LIÇÃO JOVEM/LIÇÕES"
OUT = "D:/RADAR-APP/public/ebd/jovem/html"
os.makedirs(OUT, exist_ok=True)

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

# ── CSS ───────────────────────────────────────────────────────────────────────
CSS = """
body{margin:0;padding:20px 20px 64px;background:#fff;font-family:Georgia,serif;
  font-size:16px;line-height:1.75;color:#1a1a1a;text-align:justify}
p{margin:0 0 12px}
strong{font-weight:900}
ul,ol{margin:4px 0 14px 0;padding:0 0 0 20px}
li{margin-bottom:8px;text-align:justify}

.titulo{text-align:center;color:#1d3a8a;font-size:19px;font-weight:900;
  line-height:1.3;margin:10px 0 2px;padding:0 4px;font-family:Georgia,serif}
.subtitulo{text-align:center;color:#3a3a6a;font-size:15px;font-weight:700;
  margin:0 0 4px}
.data{text-align:center;font-size:12px;color:#888;font-weight:600;
  letter-spacing:.5px;margin-bottom:18px}

.box-aureo{background:#fffaf0;border-radius:8px;padding:0 16px 14px;margin:14px 0;
  font-style:italic;color:#5a3a00;text-align:justify;overflow:hidden}
.box-aureo .lbl{display:block;font-style:normal;font-size:10px;font-weight:900;
  color:#7a4e00;letter-spacing:2.5px;text-transform:uppercase;margin:0 -16px 12px;
  padding:6px 16px;text-align:center;background:rgba(201,161,74,.22);
  border-bottom:1px solid rgba(201,161,74,.35)}

.box-pratica{background:#f0faf5;border-radius:8px;padding:0 16px 14px;margin:14px 0;
  color:#1a3a2a;text-align:justify;overflow:hidden}
.box-pratica .lbl{display:block;font-size:10px;font-weight:900;color:#14532d;
  letter-spacing:2.5px;text-transform:uppercase;margin:0 -16px 12px;padding:6px 16px;
  text-align:center;background:rgba(22,163,74,.15);border-bottom:1px solid rgba(22,163,74,.3)}

.box-subsidio{background:#f0f4ff;border-radius:8px;padding:0 16px 14px;margin:14px 0;
  color:#1d3a8a;overflow:hidden}
.box-subsidio .lbl{display:block;font-size:10px;font-weight:900;color:#1d3a8a;
  letter-spacing:2.5px;text-transform:uppercase;margin:0 -16px 12px;padding:6px 16px;
  text-align:center;background:rgba(29,58,138,.1);border-bottom:1px solid rgba(29,58,138,.2)}
.box-subsidio p{color:#1a1a1a;font-style:italic;margin-bottom:8px}
.box-subsidio .ref-bib{font-size:12px;color:#555;font-style:normal;
  border-top:1px solid rgba(29,58,138,.15);padding-top:6px;margin-top:8px}

.box-resumo{background:#fdf8f0;border-radius:8px;padding:0 16px 14px;margin:14px 0;
  color:#3a1a00;overflow:hidden}
.box-resumo .lbl{display:block;font-size:10px;font-weight:900;color:#7a4e00;
  letter-spacing:2.5px;text-transform:uppercase;margin:0 -16px 12px;padding:6px 16px;
  text-align:center;background:rgba(201,130,44,.15);border-bottom:1px solid rgba(201,130,44,.25)}

.sec-head{text-align:center;font-size:13px;font-weight:900;color:#1d3a8a;
  letter-spacing:1.5px;margin:24px 0 10px;padding:10px 0 0;border-top:1px solid #eaeaea}
.bible-ref{text-align:center;font-weight:900;color:#1d3a8a;margin:0 0 14px;font-size:14px}
.bible-passage{margin-bottom:18px;color:#1a1a1a}
.verso{margin-bottom:10px;text-align:justify}
.verso-num{font-weight:900;color:#c9a14a;font-size:10px;vertical-align:super;
  line-height:0;margin-right:2px}
.roman-head{font-weight:900;color:#1d3a8a;font-size:15px;margin:26px 0 6px;
  padding:10px 12px;background:#f0f4ff;border-left:4px solid #1d3a8a;
  border-radius:0 6px 6px 0;text-align:left}
.subpoint{text-align:justify;margin-bottom:12px}
.subpoint strong:first-child{color:#1d3a8a}
.revisao-q{font-weight:700;color:#1d3a8a;margin-bottom:2px}
.revisao-r{color:#333;margin-bottom:10px;padding-left:12px;
  border-left:3px solid #c9a14a}
.lbl-inline{font-weight:900;color:#1d3a8a;text-transform:uppercase;letter-spacing:.5px}
.bref{color:#1d4ed8;font-weight:700;text-decoration:underline dotted;cursor:pointer;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
"""

STYLE_MAP = "b => strong\ni => em\nu => u\n"

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

# ── OCR / font-error fix ──────────────────────────────────────────────────────
# Word-level OCR dictionary (common corruptions in CPAD youth docx)
_WORD_FIXES = {
    # fidelidade variants
    'fidetidade': 'fidelidade', 'fidetidades': 'fidelidades',
    # common OCR errors
    'batatha': 'batalha', 'reftetem': 'refletem',
    'retacionamento': 'relacionamento', 'possibitidade': 'possibilidade',
    'possibitidades': 'possibilidades',
    'inftuência': 'influência', 'inftuências': 'influências',
    'utitizar': 'utilizar', 'UtiLize': 'Utilize',
    'ídotos': 'ídolos', 'ídoto': 'ídolo',
    'espirituat': 'espiritual', 'espirituats': 'espirituais',
    'fiet': 'fiel', 'fiets': 'fiéis',
    'Exp[ique': 'Explique', 'exp[ique': 'explique',
    'oprender': 'aprender', 'idolotria': 'idolatria', 'idolotrio': 'idolatria',
    'recompens a': 'recompensa',
    'inctuindo': 'incluindo', 'ptan': 'plan',
    'mititar': 'militar', 'mititar': 'militar',
    'fithos': 'filhos', 'fitho': 'filho',
    'tivro': 'livro', 'tivros': 'livros',
    'tatbem': 'também',
}

def fix_ocr(txt):
    # 1. '[' used as 'l' (ell) — most impactful
    txt = re.sub(r'(?<=[A-Za-zÀ-ÿ])\[(?=[A-Za-zÀ-ÿ])', 'l', txt)
    txt = re.sub(r'(?<=\s)\[(?=[a-záéíóúàâêôãõç])', 'l', txt)
    txt = re.sub(r'(?<=^)\[(?=[a-záéíóúàâêôãõç])', 'l', txt)

    # 2. '^lll...' garbage prefix before actual words
    txt = re.sub(r'^\^lll+', '', txt)
    txt = re.sub(r'\^\^l+', '', txt)

    # 3. Israel variants
    txt = re.sub(r'\blsrael[t]?\b', 'Israel', txt)
    txt = re.sub(r'\blsraeL\b', 'Israel', txt)
    txt = re.sub(r'\blsroel\b', 'Israel', txt)
    txt = re.sub(r'\blsraet\b', 'Israel', txt)

    # 4. Comma/period INSIDE word only (no surrounding space): "fidel,idade" → "fidelidade"
    txt = re.sub(r'(?<=[A-Za-zÀ-ÿ])[,.](?=[a-záéíóúàâêôãõç]{3,})', '', txt)
    # "l, e" glued-word pattern only for known short joins (dEl, e → dEle)
    txt = re.sub(r'\b(d?El),\s(e|es)\b', r'\1\2', txt)

    # 5. Capital L at word-end acting as lowercase l
    txt = re.sub(r'([aeiouáéíóúâêô])L(?=\b)', lambda m: m.group(1)+'l', txt)

    # 6. TEXTO BÍBLICO
    txt = re.sub(r'TEXTO\s+B[ÍI]?\s*BLICO', 'TEXTO BÍBLICO', txt)

    # 7. Yahweh variants
    txt = re.sub(r'Y[aohsh]{1,3}hweh', 'Yahweh', txt)

    # 8. '[' at END of word before space/punctuation (e.g. "Baa[" → "Baal")
    txt = re.sub(r'(?<=[A-Za-zÀ-ÿ]{2})\[(?=[\s,;.:!?)\-]|$)', 'l', txt)

    # 9. fidel, idade → fidelidade (comma+space variant)
    txt = re.sub(r'\bfidel,\s+idade\b', 'fidelidade', txt)
    txt = re.sub(r'\bfidel\s+idade\b', 'fidelidade', txt)

    # 10. Word-level dictionary (simple string replace, ordered longest first)
    for bad, good in sorted(_WORD_FIXES.items(), key=lambda x: -len(x[0])):
        txt = txt.replace(bad, good)

    return txt

# ── Junk paragraph detection ──────────────────────────────────────────────────
_JUNK_EXACT = {
    't', 'L', 'r', '# E', 'IOVENS', 'JOVENS', 'ANOTAÇÕrs', 'oRTENTAÇÃO PEDAGOGTCA',
    'OQIENTAÇÃO PEDAGOGTCA', 'ORIENTAÇÃO PEDAGÓGICA', 'ESTANTE DO PROFESSOR',
    'ANOTAÇÕES', 'ANOTAÇOeS',
}
_JUNK_RE = [
    re.compile(r'^(JOVENS|IOVENS|IOVfNS|lovENS)\s*\d+$', re.I),
    re.compile(r'^\d+\s*(lovENS|JOVENS|IOVENS)', re.I),
    re.compile(r'^[A-Z]{1,3}\s+[A-Z0-9]{1,6}TAO\s+DE\b'),    # "H AUESTAO DE ESCOLHA"
    re.compile(r'^[a-záéíóú][ÇÃçã]{1,3}[a-záãõ]{0,3}$'),     # "uÇÃoã"
    re.compile(r"^['\-\*]\s*[a-z\-']\s*[\-:]"),                # "'t -j i-::"
    re.compile(r'^=[\'"\.\-\*]'),                                # "='.-*=o-" or "=.-"
    re.compile(r'^sUBSÍD[pP]\s'),                               # garbled SUBSÍDIO prefix
    re.compile(r'^SUBSíD[pP]\s'),
    re.compile(r'^ff"'),                                        # garbled bibliography
    re.compile(r'^\{[A-Z][a-z]'),                              # {Biblia de ...} bib ref
    re.compile(r'^ffi\s*["\-]'),
    re.compile(r'^\{[A-ZÀ-Ÿa-z]'),                            # "{Bíblia de..." bib ref
    re.compile(r'^[A-Z]{2,8},\s+[A-Z][a-z]+\s+[A-Z]'),       # "MERRIL, Eugene H." bib
    re.compile(r'^ffi\s*_'),                                   # "ffi _-1,, M"
    re.compile(r"^[,;]\s*[a-z',;]"),       # ", i, REFLETIR..." garbled bullets
    re.compile(r"^,,"),                      # ",,' DESTACAR..." garbled bullets
    re.compile(r'^\*\s+[A-Z]'),             # "* CONHECER" bullet noise (handled elsewhere)
]

def is_junk(txt):
    t = re.sub(r'<[^>]+>', '', txt).strip()
    if not t or t in _JUNK_EXACT:
        return True
    for p in _JUNK_RE:
        if p.search(t):
            return True
    # High non-alpha ratio in short lines
    alpha = sum(1 for c in t if c.isalpha())
    if len(t) < 50 and alpha / max(len(t), 1) < 0.45 and len(t) > 3:
        return True
    return False

# ── Garbled section head normalization ───────────────────────────────────────
_HEAD_MAP = [
    (re.compile(r'RESUMO\s+DA\s+LI[CÇ]', re.I),   'RESUMO DA LIÇÃO'),
    (re.compile(r'TEXTO\s+BÍBLICO',        re.I),   'TEXTO BÍBLICO'),
    (re.compile(r'TEXTO\s+PRINCIPAL',      re.I),   'TEXTO PRINCIPAL'),
    (re.compile(r'LEITURA\s+SEMANAL',      re.I),   'LEITURA SEMANAL'),
    (re.compile(r'LEITURA\s+DIÁRIA',       re.I),   'LEITURA DIÁRIA'),
    (re.compile(r'OBJETIVOS',              re.I),   'OBJETIVOS'),
    (re.compile(r'INTERA[CÇ][AÃ]O',       re.I),   'INTERAÇÃO'),
    (re.compile(r'INTRODU[CÇ]?[AÃ]?O?',    re.I),   'INTRODUÇÃO'),
    (re.compile(r'CONCLUS[AÃ]O',          re.I),   'CONCLUSÃO'),
    (re.compile(r'HORA\s+DA\s+REVIS',     re.I),   'HORA DA REVISÃO'),
    (re.compile(r'(O\s*)?HoRA\s*DA\s*REV', re.I),  'HORA DA REVISÃO'),
    (re.compile(r'O\s*no\s*RA\s*DA\s*REV', re.I),  'HORA DA REVISÃO'),
    (re.compile(r'coNCLU',                re.I),   'CONCLUSÃO'),
    (re.compile(r'ANOTA[CÇ][OÕ]',        re.I),   '__REMOVE__'),
    (re.compile(r'ESTANTE\s+DO',          re.I),   '__REMOVE__'),
    (re.compile(r'SUBSÍDIO',              re.I),   '__SUBSIDIO__'),
    (re.compile(r'SUBSíDIO',             re.I),   '__SUBSIDIO__'),
    (re.compile(r'ORIENT',               re.I),   '__REMOVE__'),
    (re.compile(r'PEDAGOG',             re.I),   '__REMOVE__'),
]

def normalize_head(raw):
    for pat, fixed in _HEAD_MAP:
        if pat.search(raw):
            return fixed
    return raw

# ── Main post-processor ───────────────────────────────────────────────────────
def post_process(body, num, titulo):
    # Split into <p> blocks
    paras = re.split(r'(?=<p[ >])', body)
    out_parts = [f'<p class="titulo">LIÇÃO {num}</p>',
                 f'<p class="subtitulo">{titulo.title()}</p>']

    i = 0
    subsídio_buf = []
    in_texto_biblico = False
    skip_until_next_head = False  # used to skip INTERAÇÃO (teacher block)

    while i < len(paras):
        raw = paras[i].strip()
        i += 1
        if not raw:
            continue

        # Extract inner HTML from <p>...</p>
        m_p = re.match(r'<p(?:[^>]*)>(.*?)</p>\s*$', raw, re.DOTALL)
        if not m_p:
            out_parts.append(raw)
            continue
        inner = m_p.group(1).strip()

        # Plain text version for detection
        plain = re.sub(r'<[^>]+>', '', inner).strip()
        plain_fixed = fix_ocr(plain)

        # Skip the lição title/subtitle (already added above)
        if re.match(r'^LIÇÃO\s+\d+', plain, re.I):
            continue
        if plain == titulo or plain.lower() == titulo.lower():
            continue

        # Skip junk lines
        if is_junk(plain):
            continue

        # If we're skipping the INTERAÇÃO teacher block, skip until next strong ALL-CAPS head
        if skip_until_next_head:
            is_head = (re.match(r'^<strong>[A-ZÁÉÍÓÚ\s\-–—IVX]+</strong>$', inner) and
                       len(re.sub(r'<[^>]+>', '', inner).strip()) > 2)
            all_caps_p = (plain and plain.upper() == plain and len(plain) > 3)
            if is_head or all_caps_p:
                skip_until_next_head = False
                # fall through to process this head normally
            else:
                continue

        # Check for SUBSÍDIO start (garbled prefix + quote)
        subsídio_start = re.match(
            r'^(?:sUBSÍD[pP]|SUBSíD[pP]|SUBSÍDIO|SUBSíDIO)\s*(?:ffi\s*)?"(.+)',
            plain, re.I | re.DOTALL)
        if subsídio_start:
            # Start of a subsídio block — collect quote text
            quote = fix_ocr(subsídio_start.group(1))
            subsídio_buf = [quote]
            # Look ahead for bibliography line
            while i < len(paras):
                nxt_raw = paras[i].strip()
                nxt_m = re.match(r'<p(?:[^>]*)>(.*?)</p>', nxt_raw, re.DOTALL)
                nxt_plain = re.sub(r'<[^>]+>', '', nxt_m.group(1) if nxt_m else nxt_raw).strip() if nxt_raw else ''
                # bibliography lines are short, italic, garbled
                if nxt_plain and (re.match(r'^(?:ff|{|\()', nxt_plain) or
                                  re.search(r'CPAD|Rio de Janeiro|\.p\.\s*\d', nxt_plain)):
                    # Clean up bibliography
                    bib = fix_ocr(re.sub(r'^ff"[^,]*,\s*', '', nxt_plain))
                    bib = re.sub(r'^[^A-ZÁÉÍÓÚ]+', '', bib)
                    subsídio_buf.append(f'__BIB__{bib}')
                    i += 1
                    break
                elif is_junk(nxt_plain):
                    i += 1
                else:
                    break
            # Render subsídio block
            quote_html = subsídio_buf[0] if subsídio_buf else ''
            bib_html = ''
            for x in subsídio_buf[1:]:
                if x.startswith('__BIB__'):
                    bib_html = f'<p class="ref-bib">{x[7:]}</p>'
            out_parts.append(
                f'<div class="box-subsidio"><span class="lbl">📚 Subsídio</span>'
                f'<p>"{quote_html}"</p>{bib_html}</div>')
            continue

        # Strong-only paragraphs → potential section heads
        strong_m = re.match(r'^<strong>(.*?)</strong>$', inner)
        if strong_m:
            head_plain = re.sub(r'<[^>]+>', '', strong_m.group(1)).strip()
            head_plain = fix_ocr(head_plain)
            norm = normalize_head(head_plain)

            if norm == '__REMOVE__':
                # Skip this and following paragraph(s) until next strong head
                continue
            if norm == '__SUBSIDIO__':
                continue  # handled above
            if norm == 'TEXTO BÍBLICO':
                in_texto_biblico = True
                out_parts.append(f'<p class="sec-head">TEXTO BÍBLICO</p>')
                continue
            if norm == 'INTERAÇÃO':
                # Teacher-only block — skip content until next section head
                skip_until_next_head = True
                continue
            if norm in ('HORA DA REVISÃO',):
                in_texto_biblico = False
                skip_until_next_head = False
                out_parts.append(f'<p class="sec-head">{norm}</p>')
                continue
            if norm in ('CONCLUSÃO',):
                in_texto_biblico = False
                skip_until_next_head = False
                out_parts.append(f'<p class="sec-head">{norm}</p>')
                continue
            if norm != head_plain and norm not in ('__REMOVE__', '__SUBSIDIO__'):
                # Known section → sec-head
                in_texto_biblico = (norm == 'TEXTO BÍBLICO')
                out_parts.append(f'<p class="sec-head">{norm}</p>')
                continue

            # Roman numeral heading (I - ..., II - ..., III - ...)
            if re.match(r'^[IVX]+\s*[-–]', head_plain):
                in_texto_biblico = False
                out_parts.append(f'<p class="roman-head">{fix_ocr(strong_m.group(1))}</p>')
                continue

            # Numbered subpoint head (1., 2., 3. ...)
            if re.match(r'^\d+\.', head_plain):
                out_parts.append(f'<p class="subpoint"><strong>{fix_ocr(strong_m.group(1))}</strong></p>')
                continue

            # Fallback: render as section head
            if head_plain.isupper() and len(head_plain) > 4:
                norm2 = normalize_head(head_plain)
                if norm2 == '__REMOVE__':
                    continue
                out_parts.append(f'<p class="sec-head">{norm2 if norm2 not in ("__REMOVE__","__SUBSIDIO__") else head_plain}</p>')
                continue

            # Bold subtitle (mixed case)
            out_parts.append(f'<p class="subtitulo">{fix_ocr(inner)}</p>')
            continue

        # Plain ALL-CAPS paragraph → check section heads
        if plain and plain.upper() == plain and len(plain) > 3 and not re.search(r'\d', plain):
            norm = normalize_head(fix_ocr(plain))
            if norm == '__REMOVE__':
                continue
            if norm == '__SUBSIDIO__':
                continue
            if norm in ('TEXTO BÍBLICO', 'HORA DA REVISÃO', 'CONCLUSÃO', 'RESUMO DA LIÇÃO',
                        'OBJETIVOS', 'INTERAÇÃO', 'LEITURA SEMANAL', 'TEXTO PRINCIPAL',
                        'LEITURA DIÁRIA', 'INTRODUÇÃO'):
                in_texto_biblico = (norm == 'TEXTO BÍBLICO')
                out_parts.append(f'<p class="sec-head">{norm}</p>')
                continue
            if len(plain) < 80:
                out_parts.append(f'<p class="sec-head">{fix_ocr(plain)}</p>')
                continue

        # TEXTO ÁUREO / VERDADE PRÁTICA
        strong_first = re.match(r'^<strong>(TEXTO ÁUREO|VERDADE PRÁTICA)</strong>(.*)', inner, re.DOTALL)
        if strong_first:
            key = strong_first.group(1)
            rest = fix_ocr(strong_first.group(2).strip())
            if key == 'TEXTO ÁUREO':
                out_parts.append(f'<div class="box-aureo"><span class="lbl">Texto Áureo</span>{rest}</div>')
            else:
                out_parts.append(f'<div class="box-pratica"><span class="lbl">Verdade Prática</span>{rest}</div>')
            continue

        # RESUMO DA LIÇÃO as special box
        if re.match(r'^RESUMO\s+DA\s+LI[CÇ]', plain, re.I):
            out_parts.append('<p class="sec-head">RESUMO DA LIÇÃO</p>')
            continue

        # Regular numbered subpoints (1. Text, 2. Text, ...)
        if re.match(r'^\d+\.', plain):
            out_parts.append(f'<p class="subpoint">{fix_ocr(inner)}</p>')
            continue

        # Regular paragraph
        fixed_inner = fix_ocr(inner)
        if fixed_inner.strip():
            out_parts.append(f'<p>{fixed_inner}</p>')

    return '\n'.join(out_parts)


def convert(src, num, titulo):
    with open(src, 'rb') as f:
        result = mammoth.convert_to_html(f, style_map=STYLE_MAP)
    body = post_process(result.value, num, titulo)
    body = linkify(body)
    html = (f"<!DOCTYPE html><html><head>"
            f"<meta charset='utf-8'>"
            f"<meta name='viewport' content='width=device-width,initial-scale=1'>"
            f"<style>{CSS}</style></head><body>{body}{REF_JS}</body></html>")
    dst = f"{OUT}/licao-{num:02d}.html"
    with open(dst, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"  OK licao-{num:02d}.html")


for num, titulo in LESSONS:
    found = glob.glob(f"{SRC}/LIÇÃO {num} - *.docx")
    if not found:
        print(f"  AVISO: não encontrado LIÇÃO {num}")
        continue
    print(f"Lição {num}: {os.path.basename(found[0])}")
    convert(found[0], num, titulo)

print("\nPronto.")
