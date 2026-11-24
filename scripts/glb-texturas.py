# Diminui as texturas embutidas num .glb (para carregar rápido no tablet) sem mexer na malha nem nas animações.
# uso: python scripts/glb-texturas.py entrada.glb saida.glb [lado_max=1024]
import sys, json, struct, io
from PIL import Image

ent, sai = sys.argv[1], sys.argv[2]
LADO = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
b = open(ent, 'rb').read()
n = struct.unpack('<I', b[12:16])[0]
j = json.loads(b[20:20 + n])
p = 20 + n
bn = struct.unpack('<I', b[p:p + 4])[0]
binb = b[p + 8:p + 8 + bn]
bvs = j['bufferViews']
img_bv = {im['bufferView']: k for k, im in enumerate(j.get('images', [])) if 'bufferView' in im}
novos = []   # (bufferView index, bytes)
for k, bv in enumerate(bvs):
    dado = binb[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
    if k in img_bv:
        im = j['images'][img_bv[k]]
        try:
            pi = Image.open(io.BytesIO(dado)); pi.load()
            if max(pi.size) > LADO:
                f = LADO / max(pi.size); pi = pi.resize((max(1, round(pi.size[0] * f)), max(1, round(pi.size[1] * f))), Image.LANCZOS)
            alfa = pi.mode in ('RGBA', 'LA') or (pi.mode == 'P' and 'transparency' in pi.info)
            out = io.BytesIO()
            if alfa: pi.convert('RGBA').save(out, 'PNG', optimize=True); im['mimeType'] = 'image/png'
            else: pi.convert('RGB').save(out, 'JPEG', quality=86, optimize=True); im['mimeType'] = 'image/jpeg'
            dado = out.getvalue()
        except Exception as e:
            print('imagem mantida', k, e)
    novos.append(dado)
# reconstrói o BIN com alinhamento de 4 bytes
nb = bytearray();
for k, dado in enumerate(novos):
    while len(nb) % 4: nb.append(0)
    bvs[k]['byteOffset'] = len(nb); bvs[k]['byteLength'] = len(dado); nb += dado
while len(nb) % 4: nb.append(0)
j['buffers'][0]['byteLength'] = len(nb)
js = json.dumps(j, separators=(',', ':')).encode('utf-8')
while len(js) % 4: js += b' '
total = 12 + 8 + len(js) + 8 + len(nb)
o = struct.pack('<4sII', b'glTF', 2, total) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(nb), b'BIN\x00') + bytes(nb)
open(sai, 'wb').write(o)
print(sai, round(len(b) / 1e6, 1), '->', round(len(o) / 1e6, 1), 'MB')
