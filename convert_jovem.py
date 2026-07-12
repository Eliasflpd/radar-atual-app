import mammoth, os, re, glob

# ── Bible ref linkifier ───────────────────────────────────────────────────────
_BOOKS = (r'(?:[123]\s*Jo|[12]\s*Co|[12]\s*Ts|[12]\s*Tm|[12]\s*Pe|[12]\s*Sm|'
          r'[12]\s*Rs|[12]\s*Cr|At|Mt|Mc|Lc|Jo|Rm|Gl|Ef|Fp|Cl|Tt|Fm|Hb|Tg|Jd|Ap|'
          r'Gn|Ex|Lv|Nm|Dt|Js|Jz|Rt|Ed|Ne|Et|Jó|Sl|Pv|Ec|Ct|Is|Jr|Lm|Ez|Dn|Os|'
          r'Jl|Am|Ob|Jn|Mq|Na|Hc|Sf|Ag|Zc|Ml|G[lG]|Ef|Cl)')
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

# ── Paths ────────────────────────────────────────────────────────────────────
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

# ── CSS ──────────────────────────────────────────────────────────────────────
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

/* Lesson verse/quote box — same visual as Texto Áureo */
.box-aureo{background:#fffaf0;border-radius:8px;padding:0 16px 14px;margin:14px 0;
  font-style:italic;color:#5a3a00;text-align:justify;overflow:hidden}
.box-aureo .lbl{display:block;font-style:normal;font-size:10px;font-weight:900;
  color:#7a4e00;letter-spacing:2.5px;text-transform:uppercase;margin:0 -16px 12px;
  padding:6px 16px;text-align:center;background:rgba(201,161,74,.22);
  border-bottom:1px solid rgba(201,161,74,.35)}

/* Verdade Prática */
.box-pratica{background:#f0faf5;border-radius:8px;padding:0 16px 14px;margin:14px 0;
  color:#1a3a2a;text-align:justify;overflow:hidden}
.box-pratica .lbl{display:block;font-size:10px;font-weight:900;color:#14532d;
  letter-spacing:2.5px;text-transform:uppercase;margin:0 -16px 12px;padding:6px 16px;
  text-align:center;background:rgba(22,163,74,.15);border-bottom:1px solid rgba(22,163,74,.3)}

/* Subsídio */
.box-subsidio{background:#f0f4ff;border-radius:8px;padding:0 16px 14px;margin:14px 0;
  color:#1d3a8a;overflow:hidden}
.box-subsidio .lbl{display:block;font-size:10px;font-weight:900;color:#1d3a8a;
  letter-spacing:2.5px;text-transform:uppercase;margin:0 -16px 12px;padding:6px 16px;
  text-align:center;background:rgba(29,58,138,.1);border-bottom:1px solid rgba(29,58,138,.2)}
.box-subsidio p{color:#1a1a1a;font-style:italic;margin-bottom:8px}
.box-subsidio .ref-bib{font-size:12px;color:#555;font-style:normal;
  border-top:1px solid rgba(29,58,138,.15);padding-top:6px;margin-top:8px}

/* Resumo da Lição */
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

# ── OCR / font-error fix ─────────────────────────────────────────────────────
_WORD_FIXES = {
    'fidetidade': 'fidelidade', 'fidetidades': 'fidelidades',
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
    'inctuindo': 'incluindo',
    'mititar': 'militar',
    'fithos': 'filhos', 'fitho': 'filho',
    'tivro': 'livro', 'tivros': 'livros',
    'tatbem': 'também',
    'tatho': 'talho', 'tathar': 'talhar',
    'vitoria': 'vitória', 'vitorias': 'vitórias',
    'cotoca': 'coloca', 'cotocam': 'colocam',
    'rea[': 'real',
    'ULNMAVITORIA': 'ÚLTIMA VITÓRIA',
    'ULNTMAVITORIA': 'ÚLTIMA VITÓRIA',
}

def fix_ocr(txt):
    txt = re.sub(r'(?<=[A-Za-zÀ-ÿ])\[(?=[A-Za-zÀ-ÿ])', 'l', txt)
    txt = re.sub(r'(?<=\s)\[(?=[a-záéíóúàâêôãõç])', 'l', txt)
    txt = re.sub(r'^\[(?=[a-záéíóúàâêôãõç])', 'l', txt)
    txt = re.sub(r'^\^lll+', '', txt)
    txt = re.sub(r'\^\^l+', '', txt)
    txt = re.sub(r'\blsrael[tL]?\b', 'Israel', txt)
    txt = re.sub(r'\blsraeL\b', 'Israel', txt)
    txt = re.sub(r'\blsroel\b', 'Israel', txt)
    txt = re.sub(r'\blsraet\b', 'Israel', txt)
    txt = re.sub(r'(?<=[A-Za-zÀ-ÿ])[,.](?=[a-záéíóúàâêôãõç]{3,})', '', txt)
    txt = re.sub(r'\b(d?El),\s(e|es)\b', r'\1\2', txt)
    txt = re.sub(r'([aeiouáéíóúâêô])L(?=\b)', lambda m: m.group(1)+'l', txt)
    txt = re.sub(r'TEXTO\s+B[ÍI]?\s*BLICO', 'TEXTO BÍBLICO', txt)
    txt = re.sub(r'Y[aohsh]{1,3}hweh', 'Yahweh', txt)
    txt = re.sub(r'(?<=[A-Za-zÀ-ÿ]{2})\[(?=[\s,;.:!?)\-]|$)', 'l', txt)
    txt = re.sub(r'\bfidel,\s+idade\b', 'fidelidade', txt)
    txt = re.sub(r'\bfidel\s+idade\b', 'fidelidade', txt)
    for bad, good in sorted(_WORD_FIXES.items(), key=lambda x: -len(x[0])):
        txt = txt.replace(bad, good)
    return txt

# ── Junk detection ───────────────────────────────────────────────────────────
_JUNK_EXACT = {
    't', 'L', 'r', '# E', 'IOVENS', 'JOVENS', 'ANOTAÇÕrs',
    'ANOTAÇors', 'ANOTAÇÕES', 'ANOTAÇOeS', 'w', ':', ',', '.', ';',
    'DÂ', 'DÁ', 'DÃ', 'DA', 'I I LI', 'I I',
}
_JUNK_RE = [
    re.compile(r'^ANOTA[CÇ]', re.I),                                    # ANOTAÇÕES / ANOTAÇors
    re.compile(r'^(JOVENS|IOVENS|IOVfNS|lovENS|T\d[pP][vV]ENS|pvENS)\s*\d*$', re.I),
    re.compile(r'^\d+\s*(lovENS|JOVENS|IOVENS|pvENS)', re.I),
    re.compile(r'^[A-Z]{1,3}\s+[A-Z0-9]{1,6}TAO\s+DE\b'),
    re.compile(r'^[a-záéíóú][ÇÃçã]{1,3}[a-záãõ]{0,3}$'),
    re.compile(r"^['\-\*]\s*[a-z\-']\s*[\-:]"),
    re.compile(r'^=[\'"\.\-\*]'),
    re.compile(r'^sUBSÍD[pP]\s'), re.compile(r'^SUBSíD[pP]\s'),
    re.compile(r'^ff"'), re.compile(r'^\{[A-Z][a-z]'),
    re.compile(r'^ffi\s*["\-_]'),
    re.compile(r'^\{[A-ZÀ-Ÿa-z]'),
    re.compile(r"^,,"),
    # garbled decorative page header e.g. "-J E DERROTAS", "., i.;:..i,."
    re.compile(r'^[.\-,;]+\s*[a-z]'),
    re.compile(r'^-[A-Z]\s+[A-Z]'),
    # page/section markers ending in digits with junk
    re.compile(r'^[A-Z][A-Z\s]{2,12}\s*\d{1,3}$'),
]

# Teacher-block detection for PLAIN paragraphs (not inside <strong>)
_TEACHER_RE = [
    re.compile(r'^[TO]NTERA[CÇ]', re.I),
    re.compile(r'^INTERA[CÇ][AÃ]O\s', re.I),
    re.compile(r'^oRIENTA', re.I),
    re.compile(r'^ORIENTA[CÇ][AÃ]O\s+PEDAG', re.I),
    re.compile(r'^Prezado\(a\)\s+professor', re.I),
    re.compile(r'^Pontos\s+fortes\s+e', re.I),
    re.compile(r'^Fraquezas\s+e\s+erros', re.I),
    re.compile(r'^Extro[íi]do\s+de', re.I),
    re.compile(r'^[A-Z]{2,8},\s+[A-Z][a-z]+'),   # bibliography "CESAR, Marcelino..."
    re.compile(r'CPAD,\s*p\.\s*\d'),              # CPAD bibliography ref
    re.compile(r'LIVINGSTON|RIDALL|PFEIFER|BEACON|WYCLIFFE', re.I),
]

def is_hora_da_revisao(plain):
    """Detect garbled 'O HORA DA REVISÃO' in any OCR corruption variant."""
    p = plain[:35].upper().replace(' ', '').replace('-', '')
    if not p.startswith('O'):
        return False
    has_hora = 'HORA' in p or 'NORA' in p or 'HORA' in p
    # n=H corruption: O-N-O-R-A
    if not has_hora:
        has_hora = bool(re.match(r'^O[A-Z]{0,3}ORA', p))
    has_revis = bool(re.search(r'RE(?:V|B)[ITS]|REVI|NEVL|NEVS', p))
    return has_hora and has_revis

def hora_rest(plain):
    """Extract content after the garbled HORA DA REVISÃO header (if inline)."""
    rest = re.sub(r'^[O0].{1,25}[AaÃã][oO]\s*', '', plain).strip()
    return rest

def is_junk(txt):
    t = re.sub(r'<[^>]+>', '', txt).strip()
    if not t or t in _JUNK_EXACT:
        return True
    for p in _JUNK_RE:
        if p.search(t):
            return True
    alpha = sum(1 for c in t if c.isalpha())
    if len(t) < 50 and alpha / max(len(t), 1) < 0.45 and len(t) > 3:
        return True
    return False

def is_teacher(txt):
    """Detect teacher-only content that should be skipped."""
    for p in _TEACHER_RE:
        if p.search(txt):
            return True
    return False

# ── Section head normalization ───────────────────────────────────────────────
_HEAD_MAP = [
    (re.compile(r'RESUMO\s+DA\s+LI',      re.I),   'RESUMO DA LIÇÃO'),
    (re.compile(r'TEXTO\s+BÍBLICO',        re.I),   'TEXTO BÍBLICO'),
    (re.compile(r'TEXTO\s+B[ÍI]?\s*BLICO', re.I),  'TEXTO BÍBLICO'),
    (re.compile(r'LEITURA\s+SEMANAL',      re.I),   'LEITURA SEMANAL'),
    (re.compile(r'LEITURA\s+DIÁRIA',       re.I),   'LEITURA DIÁRIA'),
    (re.compile(r'OBJETIVOS?',             re.I),   'OBJETIVOS'),
    (re.compile(r'OBJET[\'"]?IVO',         re.I),   'OBJETIVOS'),
    (re.compile(r'INTERA[CÇ][AÃ]O',       re.I),   'INTERAÇÃO'),
    (re.compile(r'TNTERA[CÇ]',            re.I),   'INTERAÇÃO'),
    (re.compile(r'INTRODU[CÇ]|^INTRO$',   re.I),   'INTRODUÇÃO'),
    (re.compile(r'\bINTRO\b',             re.I),   'INTRODUÇÃO'),
    (re.compile(r'CONCLUS[AÃ]O',         re.I),   'CONCLUSÃO'),
    (re.compile(r'^0coNCLU|^ocoNCLU',    re.I),   'CONCLUSÃO'),
    (re.compile(r'coNCLU',               re.I),   'CONCLUSÃO'),
    (re.compile(r'HORA\s+DA\s+REVIS',    re.I),   'HORA DA REVISÃO'),
    (re.compile(r'(O\s*)?HoRA\s*DA\s*REV', re.I), 'HORA DA REVISÃO'),
    (re.compile(r'OHoRADAREvI',          re.I),   'HORA DA REVISÃO'),
    (re.compile(r'TEXTO\s+PRINCIPAL',    re.I),   '__REMOVE__'),
    (re.compile(r'TEXTO\s+PRINCIP',      re.I),   '__REMOVE__'),
    (re.compile(r'ANOTA[CÇ][OÕ]',       re.I),   '__REMOVE__'),
    (re.compile(r'ESTANTE\s+DO',         re.I),   '__REMOVE__'),
    (re.compile(r'SUBSÍDIO',             re.I),   '__SUBSIDIO__'),
    (re.compile(r'SUBSíDIO',            re.I),   '__SUBSIDIO__'),
    (re.compile(r'ORIENT|PEDAGOG',       re.I),   '__REMOVE__'),
]

def normalize_head(raw):
    for pat, fixed in _HEAD_MAP:
        if pat.search(raw):
            return fixed
    return raw

# OBJETIVOS: strip garbled bullet prefix, keep verb + rest
_OBJ_RE = re.compile(
    r'(?:^|(?:[^A-Za-zÀ-ÿ]+))'
    r'(COMPREENDER|IDENTIFICAR|APLICAR|RECONHECER|REFLETIR|DESTACAR|'
    r'ANALISAR|PERCEBER|ENTENDER|DISCUTIR|RELACIONAR|CITAR|AVALIAR|MOSTRAR)(.+)',
    re.I | re.DOTALL)

def extract_objetivo(plain):
    m = _OBJ_RE.search(plain)
    if m:
        return (m.group(1).capitalize() + m.group(2)).strip()
    return None

# Daily reading line pattern: SEGUNDA, TERÇA etc.
_DAILY_RE = re.compile(
    r'(SEGUNDA|TERÇA|AU?ARTA|AU?INTA|QUINTA|SEXTA|S[AÁ]BADO)\s*[-–*]\s*(.+?)(?=(?:SEGUNDA|TERÇA|AU?ARTA|AU?INTA|QUINTA|SEXTA|S[AÁ]BADO)|$)',
    re.I)

# ── Main post-processor ──────────────────────────────────────────────────────
def post_process(body, num, titulo):
    paras = re.split(r'(?=<p[ >])', body)
    out_parts = [f'<p class="titulo">LIÇÃO {num}</p>',
                 f'<p class="subtitulo">{titulo.title()}</p>']

    i = 0
    skip_until_next_head = False
    in_objetivos     = False
    obj_items        = []
    in_resumo        = False
    resumo_buf       = []
    in_quote         = False
    quote_parts      = []
    pending_roman    = None  # accumulating split roman head
    conclusao_buf    = []
    in_conclusao     = False

    def flush_objetivos():
        if obj_items:
            out_parts.append('<ul>' + ''.join(obj_items) + '</ul>')
        obj_items.clear()

    def flush_resumo():
        if resumo_buf:
            content = ' '.join(resumo_buf)
            out_parts.append(
                f'<div class="box-resumo"><span class="lbl">Resumo da Lição</span>'
                f'<p>{fix_ocr(content)}</p></div>')
        resumo_buf.clear()

    def flush_quote():
        if quote_parts:
            out_parts.append(
                f'<div class="box-aureo"><span class="lbl">Versículo da Lição</span>'
                f'<p>{fix_ocr(" ".join(quote_parts))}</p></div>')
        quote_parts.clear()

    def flush_conclusao():
        if conclusao_buf:
            content = ' '.join(conclusao_buf)
            out_parts.append(f'<p>{fix_ocr(content)}</p>')
        conclusao_buf.clear()

    while i < len(paras):
        raw = paras[i].strip()
        i += 1
        if not raw:
            continue

        m_p = re.match(r'<p(?:[^>]*)>(.*?)</p>\s*$', raw, re.DOTALL)
        if not m_p:
            out_parts.append(raw)
            continue
        inner = m_p.group(1).strip()
        plain = re.sub(r'<[^>]+>', '', inner).strip()

        # Skip lesson title/subtitle (already added)
        if re.match(r'^LIÇÃO\s+\d+\s*$', plain, re.I):
            continue
        if plain.lower() == titulo.lower() or plain.lower() == titulo.title().lower():
            continue

        # Junk
        if is_junk(plain):
            continue

        # Teacher block detection (plain paragraph)
        if is_teacher(plain):
            # Bibliography lines (AUTHOR, Name...) skip just themselves
            # Full teacher blocks (TNTERAÇÃO, ORIENTAÇÃO etc.) start a skip block
            is_bib = bool(re.match(r'^[A-Z]{2,8},\s+[A-Z][a-z]+', plain) or
                          re.search(r'CPAD,\s*p\.\s*\d', plain))
            if not is_bib:
                skip_until_next_head = True
            continue

        # PENSE! / PONTO IMPORTANTE! teacher callouts
        if re.match(r'^[@§@]\s*PENSE|^§\s*PONTO', plain, re.I):
            skip_until_next_head = True
            continue

        # While skipping teacher block, check if we've hit a new section
        if skip_until_next_head:
            head_plain = re.sub(r'<[^>]+>', '', inner).strip()
            is_new_head = (
                (head_plain and head_plain.upper() == head_plain and len(head_plain) > 4 and not re.search(r'\d', head_plain[:5]))
            )
            is_roman = re.match(r'^[IVX]+\s*[-–]', head_plain)
            # Also detect garbled HORA DA REVISÃO, CONCLUSÃO even if mixed-case
            is_garbled_section = bool(
                is_hora_da_revisao(head_plain) or
                re.match(r'^[0O]?\s*coNCLU', head_plain, re.I) or
                re.match(r'^coNCLU', head_plain, re.I) or
                re.search(r'(?<![A-Za-z])[O0]\s*coNCLU', head_plain, re.I)
            )
            if is_new_head or is_roman or is_garbled_section:
                skip_until_next_head = False
                # fall through
            else:
                continue

        # ── Strong-only paragraphs (section heads / roman heads) ──────────────
        strong_m = re.match(r'^<strong>(.*?)</strong>$', inner)
        if strong_m:
            head_raw  = strong_m.group(1)
            head_plain = re.sub(r'<[^>]+>', '', head_raw).strip()
            head_fixed = fix_ocr(head_plain)
            norm = normalize_head(head_fixed)

            # Accumulate split roman heads
            if pending_roman is not None:
                if head_fixed.upper() == head_fixed or re.match(r'^[A-ZÁÉÍÓÚ\s\-–]+$', head_fixed):
                    pending_roman += ' ' + head_fixed
                    continue
                else:
                    # flush pending
                    out_parts.append(f'<p class="roman-head">{fix_ocr(pending_roman)}</p>')
                    pending_roman = None

            # Roman numeral heading
            if re.match(r'^[IVX]+\s*[-–]', head_fixed):
                flush_objetivos()
                in_objetivos = False
                # Incomplete if ends with hyphen or a dangling conjunction/preposition
                _incomplete = re.search(r'[-–]\s*$|\b(E|A|OU|DE|DO|DA|EM|COM|OS|AS|O)\s*$', head_fixed)
                if _incomplete or len(head_fixed.split()) <= 3:
                    pending_roman = head_fixed
                else:
                    out_parts.append(f'<p class="roman-head">{head_fixed}</p>')
                continue

            if norm == '__REMOVE__':
                continue
            if norm == '__SUBSIDIO__':
                continue  # handled below
            if norm == 'INTERAÇÃO':
                skip_until_next_head = True
                continue

            # Known section heads
            _KNOWN = ('TEXTO BÍBLICO','HORA DA REVISÃO','CONCLUSÃO','RESUMO DA LIÇÃO',
                      'OBJETIVOS','LEITURA SEMANAL','LEITURA DIÁRIA','INTRODUÇÃO')

            if norm in _KNOWN:
                flush_objetivos(); in_objetivos = False
                flush_resumo();    in_resumo = False
                flush_quote();     in_quote = False
                if in_conclusao:   flush_conclusao(); in_conclusao = False

                if norm == 'OBJETIVOS':
                    in_objetivos = True
                    out_parts.append(f'<p class="sec-head">OBJETIVOS</p>')
                elif norm == 'RESUMO DA LIÇÃO':
                    in_resumo = True
                elif norm == 'CONCLUSÃO':
                    in_conclusao = True
                    out_parts.append(f'<p class="sec-head">CONCLUSÃO</p>')
                elif norm == 'HORA DA REVISÃO':
                    in_conclusao = False
                    out_parts.append(f'<p class="sec-head">HORA DA REVISÃO</p>')
                else:
                    out_parts.append(f'<p class="sec-head">{norm}</p>')
                continue

            # Numbered subpoint (1., 2., 3. ...)
            if re.match(r'^\d+\.', head_fixed):
                flush_objetivos(); in_objetivos = False
                if in_resumo: flush_resumo(); in_resumo = False
                out_parts.append(f'<p class="subpoint"><strong>{fix_ocr(head_raw)}</strong></p>')
                continue

            # ALL-CAPS fallback
            if head_plain.upper() == head_plain and len(head_plain) > 4:
                norm2 = normalize_head(head_plain)
                if norm2 in ('__REMOVE__', '__SUBSIDIO__'):
                    continue
                flush_objetivos(); in_objetivos = False
                out_parts.append(f'<p class="sec-head">{norm2 if norm2 != head_plain else head_fixed}</p>')
                continue

            out_parts.append(f'<p class="subtitulo">{fix_ocr(head_raw)}</p>')
            continue

        # ── Flush pending roman head if next is not a continuation ────────────
        if pending_roman is not None:
            # Plain ALL-CAPS paragraph? Full continuation of split heading
            if plain and plain.upper() == plain and not re.search(r'\d', plain) and len(plain) < 60:
                if pending_roman.rstrip().endswith('-'):
                    pending_roman = pending_roman.rstrip()[:-1] + plain
                else:
                    pending_roman += ' ' + plain
                continue
            # Mixed-case: extract ALL leading uppercase words as title continuation
            # Handles e.g. "III - A MORTE DE SANSÃO E" + "SUA ULNMAVITORIA r. Entretendo..."
            words = plain.split()
            head_extra = []
            body_start = 0
            for j, w in enumerate(words):
                alpha_only = re.sub(r'[^A-ZÁÉÍÓÚÂÊÔÃÕÇ]', '', w)
                if alpha_only and alpha_only == alpha_only.upper() and not re.search(r'\d', w):
                    head_extra.append(w)
                    body_start = j + 1
                else:
                    break
            if head_extra:
                extra_str = fix_ocr(' '.join(head_extra))
                if pending_roman.rstrip().endswith('-'):
                    pending_roman = pending_roman.rstrip()[:-1] + extra_str
                else:
                    pending_roman += ' ' + extra_str
                plain = ' '.join(words[body_start:])
                inner = plain
            out_parts.append(f'<p class="roman-head">{fix_ocr(pending_roman.rstrip("-").strip())}</p>')
            pending_roman = None

        plain_fixed = fix_ocr(plain)

        # ── All-CAPS plain paragraph → section head ───────────────────────────
        if plain and plain.upper() == plain and len(plain) > 3 and not re.search(r'\d', plain):
            norm = normalize_head(fix_ocr(plain))
            if norm in ('__REMOVE__', '__SUBSIDIO__'):
                continue
            if norm == 'INTERAÇÃO':
                skip_until_next_head = True
                continue

            flush_objetivos(); in_objetivos = False
            flush_resumo();    in_resumo = False
            flush_quote();     in_quote = False
            if in_conclusao:   flush_conclusao(); in_conclusao = False

            _KNOWN2 = ('TEXTO BÍBLICO','HORA DA REVISÃO','CONCLUSÃO','RESUMO DA LIÇÃO',
                       'OBJETIVOS','LEITURA SEMANAL','LEITURA DIÁRIA','INTRODUÇÃO')
            if norm in _KNOWN2:
                if norm == 'OBJETIVOS':
                    in_objetivos = True
                    out_parts.append(f'<p class="sec-head">OBJETIVOS</p>')
                elif norm == 'RESUMO DA LIÇÃO':
                    in_resumo = True
                elif norm == 'CONCLUSÃO':
                    in_conclusao = True
                    out_parts.append(f'<p class="sec-head">CONCLUSÃO</p>')
                elif norm == 'HORA DA REVISÃO':
                    out_parts.append(f'<p class="sec-head">HORA DA REVISÃO</p>')
                else:
                    out_parts.append(f'<p class="sec-head">{norm}</p>')
            else:
                out_parts.append(f'<p class="sec-head">{norm}</p>')
            continue

        # ── SUBSÍDIO start detection ───────────────────────────────────────────
        subsídio_start = re.match(
            r'^(?:sUBSÍD[pP][oO]?|SUBSíDI[oO]|SUBSÍDIO|SUBSíDWW\s+Professor[^"]*|'
            r'SUBSíDI[oO]\.ffi)\s*(?:["\'"]+\s*|ffi\s*)?(.+)',
            plain, re.I | re.DOTALL)
        if subsídio_start:
            flush_objetivos(); in_objetivos = False
            quote = fix_ocr(subsídio_start.group(1))
            subsídio_buf = [quote]
            # Collect continuation and optional bibliography
            while i < len(paras):
                nxt_raw = paras[i].strip()
                nxt_m = re.match(r'<p(?:[^>]*)>(.*?)</p>', nxt_raw, re.DOTALL)
                nxt_plain = re.sub(r'<[^>]+>', '', nxt_m.group(1) if nxt_m else nxt_raw).strip()
                norm_nxt = normalize_head(nxt_plain)
                if norm_nxt in ('__REMOVE__','__SUBSIDIO__') or is_junk(nxt_plain):
                    i += 1; continue
                if re.search(r'CPAD|Rio de Janeiro|\.p\.\s*\d|LIVINGSTON|RIDALL|CESAR|PFEIFER', nxt_plain):
                    bib = fix_ocr(re.sub(r'^[^A-ZÁÉÍÓÚ]+', '', nxt_plain))
                    subsídio_buf.append(f'__BIB__{bib}')
                    i += 1; break
                # Check if it's a "professor" note after subsídio
                if re.match(r'^(?:sUBSÍD|SUBSíD)', nxt_plain, re.I) or norm_nxt in ('HORA DA REVISÃO','CONCLUSÃO','__REMOVE__'):
                    break
                if is_teacher(nxt_plain):
                    break
                subsídio_buf.append(fix_ocr(nxt_plain))
                i += 1
                if len(subsídio_buf) > 6:
                    break
            quote_html = ' '.join(x for x in subsídio_buf if not x.startswith('__BIB__'))
            bib_html = ''
            for x in subsídio_buf:
                if x.startswith('__BIB__'):
                    bib_html = f'<p class="ref-bib">{x[7:]}</p>'
            out_parts.append(
                f'<div class="box-subsidio"><span class="lbl">📚 Subsídio</span>'
                f'<p>"{quote_html}"</p>{bib_html}</div>')
            continue

        # ── RESUMO: collect next paragraphs into box ───────────────────────────
        if in_resumo:
            if plain_fixed:
                resumo_buf.append(plain_fixed)
            # Stop collecting after one substantive paragraph
            if len(resumo_buf) >= 1 and len(plain_fixed) > 20:
                flush_resumo()
                in_resumo = False
            continue

        # ── Quote/verse box: detect "..." paragraph as lesson verse ───────────
        # inner may have &quot; entity before stripping — check both
        starts_quote = (re.match(r'^["""\'"]', plain) or
                        inner.lstrip().startswith('&quot;') or
                        re.match(r'^&[ql]', inner.lstrip()))
        if starts_quote and not in_quote:
            in_quote = True
            clean = re.sub(r'^["""\'"\s&quot;]+', '', plain).lstrip()
            quote_parts = [clean]
            continue
        if in_quote:
            # End quote when we see a source reference (Jz 16.28) etc.
            if re.match(r'^\(', plain) and re.search(r'[A-Z][a-z]?\s*\d+', plain):
                src = plain.strip('()')
                quote_parts.append(f'({src})')
                flush_quote()
                in_quote = False
            elif inner.strip().endswith(')') and re.search(r'[A-Z][a-z]?\s*\d+', plain):
                quote_parts.append(plain)
                flush_quote()
                in_quote = False
            elif is_junk(plain):
                pass  # skip junk inside quote
            else:
                quote_parts.append(plain)
            continue

        # ── OBJETIVOS items ───────────────────────────────────────────────────
        if in_objetivos:
            obj = extract_objetivo(plain_fixed)
            if obj:
                obj_items.append(f'<li>{fix_ocr(obj)}</li>')
                continue
            # Non-objective paragraph: flush and fall through
            flush_objetivos()
            in_objetivos = False

        # ── CONCLUSÃO: join small fragments ──────────────────────────────────
        if in_conclusao:
            # Stop collecting at teacher blocks, HORA DA REVISÃO (all OCR variants), or end markers
            stop_conclusao = (
                is_teacher(plain_fixed) or
                is_hora_da_revisao(plain_fixed) or
                re.match(r'HORA\s+DA\s+REVIS', plain_fixed, re.I) or
                re.match(r'ANOTA[CÇ][OÕ]', plain_fixed, re.I) or
                re.match(r'^[0O]?\s*coNCLU', plain_fixed, re.I) or  # nested / garbled duplicate
                re.search(r'(?<![A-Za-z])[O0]\s*coNCLU', plain_fixed, re.I)
            )
            if stop_conclusao:
                flush_conclusao(); in_conclusao = False
                # If we stopped because of HORA, fall through to HORA detection below
                # For other stop triggers, skip the line
                if not is_hora_da_revisao(plain_fixed):
                    continue
            elif plain_fixed:
                conclusao_buf.append(plain_fixed)
                continue

        # ── Daily readings ────────────────────────────────────────────────────
        if re.search(r'(SEGUNDA|TERÇA|QUARTA|AUINTA|QUINTA|SEXTA|S[AÁ]BADO)\s*[-–*]', plain, re.I):
            # AUINTA is garbled QUINTA (OCR Q→AU)
            plain_d = re.sub(r'\bAUINTA\b', 'QUINTA', plain, flags=re.I)
            plain_d = re.sub(r'\bAUARTA\b', 'QUARTA', plain_d, flags=re.I)
            items = []
            for m in _DAILY_RE.finditer(plain_d):
                day = m.group(1).capitalize()
                desc = fix_ocr(m.group(2).strip().rstrip(',;'))
                items.append(f'<li><strong>{day}:</strong> {desc}</li>')
            if not items:
                items.append(f'<li>{fix_ocr(plain_fixed)}</li>')
            if items:
                out_parts.append('<ul>' + ''.join(items) + '</ul>')
            continue

        # ── Numbered subpoints ────────────────────────────────────────────────
        if re.match(r'^\d+\.', plain_fixed):
            out_parts.append(f'<p class="subpoint">{fix_ocr(inner)}</p>')
            continue

        # ── Letter subpoints A. B. C. ─────────────────────────────────────────
        if re.match(r'^[A-CaA]\.\s+[A-ZÁÉÍÓÚ]', plain_fixed):
            out_parts.append(f'<p class="subpoint">{fix_ocr(inner)}</p>')
            continue

        # ── Garbled CONCLUSÃO detection (plain, mixed-case) ─────────────────
        # Handles: "0coNcLUSÃo", "O coNCLUsÃo", "'.-*=o- O coNcLUSÃo"
        if (re.match(r'^[0O]?\s*coNCLU|^coNCLU|^0coN', plain, re.I) or
                re.search(r'(?<![A-Za-z])[O0]\s*coNCLU', plain, re.I)):
            flush_objetivos(); in_objetivos = False
            if in_conclusao: flush_conclusao()
            in_conclusao = True
            out_parts.append(f'<p class="sec-head">CONCLUSÃO</p>')
            continue

        # ── HORA DA REVISÃO detection (all OCR variants, inline or standalone) ──
        if is_hora_da_revisao(plain):
            if in_conclusao: flush_conclusao(); in_conclusao = False
            out_parts.append(f'<p class="sec-head">HORA DA REVISÃO</p>')
            rest = fix_ocr(hora_rest(plain))
            if rest:
                out_parts.append(f'<p>{rest}</p>')
            continue

        # ── Regular paragraph ─────────────────────────────────────────────────
        fixed_inner = fix_ocr(inner)
        if fixed_inner.strip():
            out_parts.append(f'<p>{fixed_inner}</p>')

    # Flush any remaining buffers
    flush_objetivos()
    flush_resumo()
    flush_quote()
    if pending_roman:
        out_parts.append(f'<p class="roman-head">{pending_roman}</p>')
    if in_conclusao:
        flush_conclusao()

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
