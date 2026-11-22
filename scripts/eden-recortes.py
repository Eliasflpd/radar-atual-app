# Prepara os recortes do ChatGPT para o Éden andável: tira o fundo (transparente ou verde chroma),
# corta as bordas vazias, reduz o tamanho e grava em public/nexus/eden/ com a proporção de cada peça em pecas.json.
# uso: python scripts/eden-recortes.py <pasta com os PNG do ChatGPT>
import sys, os, json
from PIL import Image, ImageFilter
import numpy as np

src = sys.argv[1]
dst = os.path.join(os.path.dirname(__file__), '..', 'public', 'nexus', sys.argv[2] if len(sys.argv) > 2 else 'eden')
os.makedirs(dst, exist_ok=True)
pecas = {}
try:
    pecas = json.load(open(os.path.join(dst, 'pecas.json')))
except Exception:
    pass
for nome in sorted(os.listdir(src)):
    if not nome.lower().endswith('.png'):
        continue
    base = nome[:-4]
    im = Image.open(os.path.join(src, nome)).convert('RGBA')
    if base.startswith('alvo'):
        continue
    if base.startswith('ceu'):
        im2 = im.convert('RGB'); w0, h0 = im2.size; esc0 = min(1, 4096 / w0); im2.resize((round(w0 * esc0), round(h0 * esc0)), Image.LANCZOS).save(os.path.join(dst, base + '.jpg'), quality=88); continue
    if base.startswith('chao'):
        im.convert('RGB').resize((1024, 1024), Image.LANCZOS).save(os.path.join(dst, base + '.jpg'), quality=88)
        pecas[base] = {'w': 1, 'h': 1}
        continue
    a = np.array(im).astype(np.float32)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    if al.min() > 250:  # sem transparência: tira o verde chroma (ou o branco, se for o caso)
        verde = (g - np.maximum(r, b)) / 255.0
        k = np.clip((verde - 0.12) / 0.18, 0, 1)
        if k.mean() < 0.05:  # não é verde: tenta fundo branco liso
            br = np.minimum(np.minimum(r, g), b) / 255.0
            k = np.clip((br - 0.93) / 0.05, 0, 1)
        al = (1 - k) * 255
        # tira o reflexo verde das bordas
        g = np.where(g > np.maximum(r, b), np.maximum(r, b) + (g - np.maximum(r, b)) * 0.25, g)
        a[..., 1] = g
        a[..., 3] = al
    out = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
    m = out.split()[3].filter(ImageFilter.MinFilter(3))  # aperta 1 px a borda
    out.putalpha(m)
    caixa = out.split()[3].point(lambda v: 255 if v > 20 else 0).getbbox()
    if caixa:
        out = out.crop(caixa)
    w, h = out.size
    s = 1024 / max(w, h)
    if s < 1:
        out = out.resize((round(w * s), round(h * s)), Image.LANCZOS)
    out.save(os.path.join(dst, base + '.png'), optimize=True)
    pecas[base] = {'w': out.size[0], 'h': out.size[1]}
    print(base, out.size)
json.dump(pecas, open(os.path.join(dst, 'pecas.json'), 'w'), indent=0)
print(len(pecas), 'peças')
