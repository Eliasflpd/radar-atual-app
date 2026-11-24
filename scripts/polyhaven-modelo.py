# Baixa um modelo 3D do Poly Haven (CC0) em glTF 1k e junta tudo num .glb só (malha + texturas), para o NEXUS.
# uso: python scripts/polyhaven-modelo.py <id> <saida.glb> [resolucao=1k]
import sys, json, struct, urllib.request, os
aid, saida = sys.argv[1], sys.argv[2]; res = sys.argv[3] if len(sys.argv) > 3 else '1k'
pegar = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'nexus-biblico'})).read()
info = json.loads(pegar('https://api.polyhaven.com/files/' + aid))
g = info['gltf'][res]['gltf']; gl = json.loads(pegar(g['url'])); inc = g.get('include', {})
dados = {rel: pegar(v['url']) for rel, v in inc.items()}
binario = bytearray(); bvs = []
def adiciona(b):
    while len(binario) % 4: binario.append(0)
    off = len(binario); binario.extend(b); return off
# buffers externos viram um só buffer embutido
base_bv = []
for i, buf in enumerate(gl['buffers']):
    off = adiciona(dados[buf['uri']]); base_bv.append(off)
for bv in gl['bufferViews']:
    bv['byteOffset'] = bv.get('byteOffset', 0) + base_bv[bv['buffer']]; bv['buffer'] = 0
for im in gl.get('images', []):
    if 'uri' in im:
        b = dados[im['uri']]; off = adiciona(b); gl['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b)})
        im['bufferView'] = len(gl['bufferViews']) - 1; im['mimeType'] = 'image/png' if im['uri'].lower().endswith('.png') else 'image/jpeg'; del im['uri']
while len(binario) % 4: binario.append(0)
gl['buffers'] = [{'byteLength': len(binario)}]
js = json.dumps(gl, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
total = 12 + 8 + len(js) + 8 + len(binario)
open(saida, 'wb').write(struct.pack('<4sII', b'glTF', 2, total) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(binario), b'BIN\x00') + bytes(binario))
print(saida, round(total / 1e6, 2), 'MB')
