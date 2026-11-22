"""Transforma uma imagem do ChatGPT em modelo 3D (GLB com textura) usando o Hunyuan3D-2 (Tencent),
modelo aberto e gratuito que roda no espaço público do Hugging Face (cota gratuita diária).
uso: python scripts/imagem-para-3d.py <imagem.png> <saida.glb>
"""
import os, shutil, sys
from gradio_client import Client, handle_file

img, saida = sys.argv[1], sys.argv[2]; RES = int(sys.argv[3]) if len(sys.argv) > 3 else 256   # resolução menor = arquivo mais leve
# com uma chave gratuita do Hugging Face (variável HF_TOKEN) a cota diária fica bem maior
c = Client('tencent/Hunyuan3D-2', verbose=False, token=os.environ.get('HF_TOKEN') or None) if 'token' in Client.__init__.__code__.co_varnames else Client('tencent/Hunyuan3D-2', verbose=False)
r = c.predict(caption=None, image=handle_file(img), mv_image_front=None, mv_image_back=None, mv_image_left=None, mv_image_right=None,
              steps=30, guidance_scale=5.0, seed=1234, octree_resolution=RES, check_box_rembg=True, num_chunks=8000, randomize_seed=False,
              api_name='/shape_generation')
# r = (malha sem textura, malha com textura, html, estatísticas, semente)
com_textura = r[0]   # o espaco gratuito esta sem a etapa de textura: vem so a forma; o material (ouro, bronze) e aplicado na maquete
if isinstance(com_textura, dict): com_textura = com_textura.get('value') or com_textura.get('path')
shutil.copy(com_textura, saida)
# registra a peça pronta (a maquete só carrega o que está nesta lista)
import json
lst = os.path.join(os.path.dirname(os.path.abspath(saida)), 'pecas.json')
try: pecas = json.load(open(lst, encoding='utf-8'))
except Exception: pecas = []
nome = os.path.splitext(os.path.basename(saida))[0]
if nome not in pecas: pecas.append(nome)
json.dump(pecas, open(lst, 'w', encoding='utf-8'))
print('ok', saida, r[2] if len(r) > 2 else '')
