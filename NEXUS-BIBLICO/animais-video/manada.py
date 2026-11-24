# Recorta uma MANADA inteira de um vídeo de câmera parada (IS-Net, no PC) e monta um laço emendado numa folha de quadros (atlas).
# uso: python manada.py video.mp4 nome inicio_s duracao_s [quadros=36]
import sys, os, json
import numpy as np, cv2, onnxruntime as ort
vid, nome, t0, dur = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
NQ = int(sys.argv[5]) if len(sys.argv) > 5 else 36
A = os.path.dirname(os.path.abspath(__file__))
sess = ort.InferenceSession(os.path.join(A, '..', 'modelos', 'isnet-general-use.onnx'), providers=['CPUExecutionProvider']); inp = sess.get_inputs()[0].name
cap = cv2.VideoCapture(vid); fps = cap.get(cv2.CAP_PROP_FPS)
# pega NQ quadros no trecho + KF quadros a mais antes do início, para emendar o laço
KF = 8; passo = dur / NQ
tempos = [t0 - KF * passo + i * passo for i in range(NQ + KF)]
Q, M = [], []
for t in tempos:
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000); ok, f = cap.read()
    if not ok: break
    rgb = cv2.cvtColor(f, cv2.COLOR_BGR2RGB)
    x = cv2.resize(rgb, (1024, 1024)).astype(np.float32) / 255.0 - 0.5
    y = sess.run(None, {inp: x.transpose(2, 0, 1)[None]})[0][0, 0]; y = (y - y.min()) / (y.max() - y.min() + 1e-6)
    Q.append(rgb); M.append(cv2.resize(y, (f.shape[1], f.shape[0])))
    print('quadro', len(Q), flush=True)
cap.release()
H, W = Q[0].shape[:2]
# caixa de todos os quadros juntos
uni = np.zeros((H, W), np.float32)
for m in M: uni = np.maximum(uni, m)
ys, xs = np.where(uni > 0.5); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
pad = 6; x0 = max(0, x0 - pad); y0 = max(0, y0 - pad); x1 = min(W - 1, x1 + pad); y1 = min(H - 1, y1 + pad)
def tile(k):
    m = np.clip((M[k] - 0.2) / 0.6, 0, 1)
    return np.dstack([Q[k].astype(np.float32), m * 255])[y0:y1 + 1, x0:x1 + 1]
tiles = []
for j in range(NQ):
    t = tile(KF + j)
    if j >= NQ - KF: w = (j - (NQ - KF) + 1) / (KF + 1); t = t * (1 - w) + tile(j - (NQ - KF)) * w   # o fim se mistura com os quadros de antes do começo
    tiles.append(np.clip(t, 0, 255).astype(np.uint8))
th, tw = tiles[0].shape[:2]; alto = 256; larg = int(round(tw / th * alto / 2)) * 2
cols = 6; rows = (NQ + cols - 1) // cols
atlas = np.zeros((rows * alto, cols * larg, 4), np.uint8)
for q, t in enumerate(tiles): r, c = divmod(q, cols); atlas[r * alto:(r + 1) * alto, c * larg:(c + 1) * larg] = cv2.resize(t, (larg, alto), interpolation=cv2.INTER_AREA)
os.makedirs(os.path.join(A, 'saida'), exist_ok=True)
cv2.imwrite(os.path.join(A, 'saida', nome + '.png'), cv2.cvtColor(atlas, cv2.COLOR_RGBA2BGRA))
info = {'quadros': NQ, 'cols': cols, 'rows': rows, 'w': larg, 'h': alto, 'dur': dur, 'origem': os.path.basename(vid)}
json.dump(info, open(os.path.join(A, 'saida', nome + '.json'), 'w')); print(json.dumps(info))
