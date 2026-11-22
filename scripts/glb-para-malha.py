# Converte um .glb (forma do Hunyuan3D) numa malha binária simples que o NEXUS lê sem carregador externo:
# [nVert uint32][nIdx uint32][posições float32 * 3n][índices uint32 * nIdx]   (as normais são calculadas no navegador)
# uso: python scripts/glb-para-malha.py <entrada.glb> <saida.malha>
import sys, json, struct
import numpy as np

dados = open(sys.argv[1], 'rb').read()
assert dados[:4] == b'glTF'
p = 12; js = None; binario = None
while p < len(dados):
    ln, tipo = struct.unpack_from('<I4s', dados, p); corpo = dados[p + 8:p + 8 + ln]
    if tipo == b'JSON': js = json.loads(corpo)
    elif tipo == b'BIN\x00': binario = corpo
    p += 8 + ln
TIPOS = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
COMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
def acessor(i):
    a = js['accessors'][i]; bv = js['bufferViews'][a['bufferView']]; dt = TIPOS[a['componentType']]
    ini = bv.get('byteOffset', 0) + a.get('byteOffset', 0); n = a['count'] * COMP[a['type']]
    return np.frombuffer(binario, dtype=dt, count=n, offset=ini).reshape(a['count'], COMP[a['type']])
P, I, base = [], [], 0
for malha in js['meshes']:
    for prim in malha['primitives']:
        pos = acessor(prim['attributes']['POSITION']).astype(np.float32)
        idx = acessor(prim['indices']).astype(np.uint32).ravel() if 'indices' in prim else np.arange(len(pos), dtype=np.uint32)
        P.append(pos); I.append(idx + base); base += len(pos)
P = np.concatenate(P); I = np.concatenate(I)
# aplica a matriz do nó, se houver (rotação/escala do Hunyuan)
for no in js.get('nodes', []):
    if 'matrix' in no:
        M = np.array(no['matrix'], dtype=np.float64).reshape(4, 4).T
        P = (np.c_[P, np.ones(len(P))] @ M.T)[:, :3].astype(np.float32)
        break
with open(sys.argv[2], 'wb') as f:
    f.write(struct.pack('<II', len(P), len(I))); f.write(P.tobytes()); f.write(I.tobytes())
print(len(P), 'vértices', len(I) // 3, 'triângulos', P.min(0), P.max(0))
