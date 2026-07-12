import sys, io, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from pypdf import PdfReader

PDF_PATH = r'C:\Users\mc1ar\Downloads\CPAD - 3 TRIMESTRE 2026-20250624T152353Z-3-001 (1)\CPAD - 3 TRIMESTRE 2026\ADULTOS\Cristão_Alerta-3Trim_2026_Subsídios.pdf'
# fallback com path exato
import glob
matches = glob.glob(r'C:\Users\mc1ar\Downloads\CPAD*\**\Cristão_Alerta*.pdf', recursive=True)
if matches:
    PDF_PATH = matches[0]

OUT = r'D:\RADAR ATUAL\EBD\LIÇÃO ADULTO\REVISTA CRISTÃO ALERTA'
os.makedirs(OUT, exist_ok=True)

# ── Ranges 0-indexed (doc page N → index N) ─────────────────────────────────
LESSONS = [
    (1,  "O CHAMADO PARA OS GENTIOS",                             5,  31),
    (2,  "A PORTA DA FÉ SE ABRE ENTRE OS GENTIOS",               32, 63),
    (3,  "A GRAÇA QUE ALCANÇA TODAS AS NAÇÕES",                  64, 91),
    (4,  "O ESPÍRITO QUE NOS GUIA PARA ALÉM DAS FRONTEIRAS",     92, 121),
    (5,  "CRISTO ENTRE OS FILÓSOFOS: O DEUS DESCONHECIDO SE REVELA", 122, 149),
    (6,  "A SUFICIÊNCIA DA GRAÇA NA CIDADE DE CORINTO",          150, 172),
    (7,  "QUANDO O ESPÍRITO SOPRA EM ÉFESO",                     173, 191),
    (8,  "DESPEDIDA EM ÉFESO — ENTRE LÁGRIMAS E ALERTA",        192, 211),
    (9,  "CORAGEM PARA TESTEMUNHAR: PAULO DIANTE DA MULTIDÃO",   212, 231),
    (10, "UMA ESPERANÇA INABALÁVEL PERANTE OS PODEROSOS",        232, 254),
    (11, "ENTRE TEMPESTADES E PROMESSAS",                        255, 274),
    (12, "O EVANGELHO CHEGA AO CORAÇÃO DO IMPÉRIO",              275, 295),
    (13, "A MISSÃO CONTINUA EM NÓS",                             296, 319),
]

# ── CSS ─────────────────────────────────────────────────────────────────────
CSS = """
body{margin:0;padding:16px 18px 72px;background:#fff;font-family:Georgia,serif;font-size:15px;line-height:1.75;color:#1a1a1a;text-align:justify}
h1{text-align:center;color:#7b0000;font-size:18px;font-weight:900;line-height:1.3;margin:8px 0 4px;font-family:Georgia,serif}
h1 small{display:block;font-size:12px;color:#888;font-weight:600;letter-spacing:.5px;margin-top:4px}
.tag{display:inline-block;background:#7b0000;color:#fff;font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;padding:2px 8px;border-radius:3px;margin-bottom:12px}
.box-chave{background:#fffaf0;border-radius:8px;padding:14px 16px;margin:14px 0;color:#5a3a00;font-style:italic;text-align:justify}
.box-chave .lbl{display:block;font-style:normal;font-size:10px;font-weight:900;color:#c9a14a;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:8px;text-align:center}
.box-chave .ref{display:block;font-size:11px;font-style:normal;color:#888;margin-top:6px;text-align:right}
.box-leitura{background:#f0f4ff;border-radius:8px;padding:10px 16px;margin:12px 0;color:#1d3a8a;font-weight:700;text-align:center;font-size:13px}
.pensamento{background:#f0faf5;border-radius:8px;padding:14px 16px;margin:14px 0;color:#1a3a2a;text-align:justify;border-left:4px solid #16a34a}
.pensamento .lbl{display:block;font-size:10px;font-weight:900;color:#16a34a;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:8px}
.sec-head{text-align:center;font-size:12px;font-weight:900;color:#1d3a8a;letter-spacing:1.5px;margin:22px 0 8px;padding:8px 0 0;border-top:1px solid #eaeaea}
.sub-head{font-weight:900;color:#7b0000;font-size:14px;margin:18px 0 6px;background:#fff8f0;padding:6px 10px;border-left:3px solid #7b0000;border-radius:0 4px 4px 0}
.box-sub{background:#f7f3e8;border-radius:8px;padding:12px 16px;margin:14px 0}
.box-sub .sub-titulo{font-size:11px;font-weight:900;color:#c9a14a;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;text-align:center;display:block}
p{margin:0 0 10px}
strong{font-weight:900}
em{font-style:italic}
hr{border:none;border-top:1px solid #eee;margin:20px 0}
"""

# ── Helpers ──────────────────────────────────────────────────────────────────
HEADER_RE = re.compile(
    r'^R\s*e\s*v\s*i\s*s\s*t\s*a\s+C\s*r\s*i\s*s\s*t\s*[aã]\s*o\s+A\s*l\s*e\s*r\s*t\s*a.*',
    re.IGNORECASE)
SITE_RE = re.compile(r'Site\s*\|\s*WWW\.CRISTAOALERTA', re.IGNORECASE)

def clean_page(txt):
    lines = txt.split('\n')
    out = []
    for line in lines:
        l = line.strip()
        if HEADER_RE.match(l): continue
        if SITE_RE.search(l): continue
        out.append(l)
    return '\n'.join(out).strip()

def extract_lesson_text(reader, start_idx, end_idx):
    pages_text = []
    for i in range(start_idx, end_idx + 1):
        raw = reader.pages[i].extract_text() or ''
        pages_text.append(clean_page(raw))
    return '\n\n'.join(pages_text)

# ── Text → HTML converter ────────────────────────────────────────────────────
def text_to_html(num, title, raw_text):
    # Split into paragraphs (double newline)
    paras = [p.strip() for p in re.split(r'\n{2,}', raw_text) if p.strip()]

    html_parts = []
    i = 0
    leitura_bib = ''
    versiculo_chave = []
    versiculo_ref = ''
    pensamento_lines = []
    in_versic = False
    in_pensam = False

    # First pass: collect LEITURA BÍBLICA, VERSÍCULO CHAVE, Pensamento Cristão
    body_start = 0
    for idx, para in enumerate(paras):
        first_line = para.split('\n')[0].strip()
        if re.match(r'LEITURA\s+BÍBLICA', first_line, re.IGNORECASE):
            # next para is the citation
            if idx + 1 < len(paras):
                leitura_bib = paras[idx + 1].strip()
        elif re.match(r'VERSÍCULO\s+CHAVE', first_line, re.IGNORECASE):
            in_versic = True
            continue
        elif in_versic:
            lines = para.split('\n')
            ref_match = re.search(r'\(At\s[\d:]+.*?\)|[\(\[][A-Z][a-z]+\s[\d:]+.*?[\)\]]', para)
            versiculo_lines = []
            for ln in lines:
                versiculo_lines.append(ln.strip())
            versiculo_chave = versiculo_lines
            in_versic = False
        elif re.match(r'Pensamento\s+Crist[ãa]o', first_line, re.IGNORECASE):
            # collect this para as pensamento
            rest = '\n'.join(para.split('\n')[1:]).strip()
            pensamento_lines = [rest] if rest else []
        elif pensamento_lines == [] and re.match(r'Subsídios\s+Lição', first_line, re.IGNORECASE):
            body_start = idx + 1

    # Build header block
    html_parts.append(f'<h1>LIÇÃO {num}<small>{title}</small></h1>')
    html_parts.append(f'<p style="text-align:center"><span class="tag">Cristão Alerta · 3º Trimestre 2026</span></p>')

    if leitura_bib:
        html_parts.append(f'<div class="box-leitura">📖 LEITURA BÍBLICA — {leitura_bib}</div>')

    if versiculo_chave:
        verse_text = ' '.join(versiculo_chave)
        # tentar extrair referência do fim
        ref_m = re.search(r'\(([^)]+)\)\s*\.?\s*$', verse_text)
        ref_str = ref_m.group(0) if ref_m else ''
        clean_verse = verse_text[:ref_m.start()].strip() if ref_m else verse_text
        html_parts.append(
            f'<div class="box-chave"><span class="lbl">Versículo Chave</span>'
            f'{clean_verse}'
            f'<span class="ref">{ref_str}</span></div>')

    # Build body: iterate through all paras and format
    all_paras = paras  # process all

    html_parts.append('<hr>')

    subsec_re = re.compile(r'^SUBSÍDIO\s+(?:GEOGRÁFICO|HISTÓRICO|TEOLÓGICO|PASTORAL|PRÁTICO|REFLEXIVO|DOCTRINAL|LITÚRGICO|CULTURAL|BIOGRÁFICO|BÍBLICO|EXEGÉTICO)[\s:]+(.+)', re.IGNORECASE)
    allcaps_re = re.compile(r'^[A-ZÀÁÂÃÉÊÍÓÔÕÚÜÇ\s\-–—:\/,\.!?]{8,}$')
    intro_re   = re.compile(r'^Introdução', re.IGNORECASE)
    concl_re   = re.compile(r'^(?:Conclusão|Aplicação|Considerações|Para Refletir)', re.IGNORECASE)
    num_head_re= re.compile(r'^(\d+)\.\s+(.+)')
    letra_re   = re.compile(r'^([A-Z])\)\s+(.+)')

    skip_patterns = [
        re.compile(r'LEITURA\s+BÍBLICA', re.IGNORECASE),
        re.compile(r'VERSÍCULO\s+CHAVE', re.IGNORECASE),
        re.compile(r'Pensamento\s+Crist', re.IGNORECASE),
        re.compile(r'^Subsídios\s+Lição\s+\d+', re.IGNORECASE),
        re.compile(r'^$'),
    ]

    i = 0
    pensamento_done = False
    for para in all_paras:
        first = para.split('\n')[0].strip()
        # skip header blocks
        skip = False
        for pat in skip_patterns:
            if pat.match(first):
                skip = True
                break
        if skip:
            continue

        # Pensamento Cristão body (the para right after the header)
        if not pensamento_done and para and re.search(r'missão|Evangelho|Igreja|ouvir|crer|agir|missionário', para):
            # heuristic: first substantive para after the header block is pensamento
            pass  # let it fall through to normal rendering

        # SUBSÍDIO section box
        sm = subsec_re.match(first)
        if sm:
            subtitle = sm.group(1).strip()
            rest_lines = '\n'.join(para.split('\n')[1:]).strip()
            html_parts.append(f'<div class="box-sub"><span class="sub-titulo">📚 Subsídio: {subtitle}</span>')
            if rest_lines:
                html_parts.append(f'<p>{rest_lines}</p>')
            html_parts.append('</div>')
            continue

        # ALL-CAPS section header
        if allcaps_re.match(first) and len(first) > 5:
            html_parts.append(f'<p class="sec-head">{first}</p>')
            rest = '\n'.join(para.split('\n')[1:]).strip()
            if rest:
                html_parts.append(f'<p>{rest}</p>')
            continue

        # Introdução / Conclusão special headers
        if intro_re.match(first) or concl_re.match(first):
            html_parts.append(f'<p class="sub-head">{first}</p>')
            rest = '\n'.join(para.split('\n')[1:]).strip()
            if rest:
                html_parts.append(f'<p>{rest}</p>')
            continue

        # Normal paragraph
        text = para.replace('\n', ' ').strip()
        if text:
            # Make quoted scripture italic
            text = re.sub(r'"([^"]+)"', r'<em>"\1"</em>', text)
            text = re.sub(r'"([^"]+)"', r'<em>"\1"</em>', text)
            html_parts.append(f'<p>{text}</p>')

    return '\n'.join(html_parts)


def build_html(num, title, body_html):
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width,initial-scale=1'>
<style>{CSS}</style>
</head>
<body>
{body_html}
</body>
</html>"""


def main():
    try:
        reader = PdfReader(PDF_PATH)
    except Exception as e:
        print(f'ERRO ao abrir PDF: {e}')
        return

    print(f'PDF aberto: {len(reader.pages)} páginas')

    for num, title, start, end in LESSONS:
        print(f'  Extraindo Lição {num} (páginas {start+1}-{end+1})...')
        raw = extract_lesson_text(reader, start, end)
        body = text_to_html(num, title, raw)
        html = build_html(num, title, body)

        fname = f'subsidio-{num:02d}.html'
        fpath = os.path.join(OUT, fname)
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f'    -> {fpath}  ({len(html)} bytes)')

    print('\nPronto.')

main()
