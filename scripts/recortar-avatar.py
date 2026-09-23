#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════════
  O RECORTADOR DE AVATAR — transforma a folha de bocas em peças usáveis.

  POR QUE EXISTE (23/09/2026):
  O Elias criou o avatar num gerador de imagem e mandou "bocas.png": o rosto
  inteiro de um lado e, na coluna da direita, cinco bocas e um par de olhos
  fechados. Perfeito — só que o PNG veio em RGB, SEM canal alfa: aquele fundo
  quadriculado que parece transparência está PINTADO dentro da imagem. Usado
  assim, o avatar apareceria com o xadrez atrás dele.

  COMO ELE TIRA O XADREZ SEM FURAR O ROSTO:
  não dá pra simplesmente apagar "tudo que for cinza claro" — os dentes, a
  camisa e o branco dos olhos também são claros, e o rosto ficaria esburacado.
  Então o corte é por INUNDAÇÃO a partir das bordas: começa nos quatro cantos e
  vai espalhando só por pixel que continua parecendo xadrez. O que está DENTRO
  do rosto nunca é alcançado, porque a inundação não atravessa o contorno.

  Depois ele acha sozinho cada ilha de pixel que sobrou (o rosto e as peças da
  coluna) e grava uma por uma, já aparadas.

  Uso:  python scripts/recortar-avatar.py <entrada.png> <pasta-de-saida>
  Ex.:  python scripts/recortar-avatar.py _provas-trava/bocas.png public/avatar
═══════════════════════════════════════════════════════════════════════════════
"""
import sys, os
from collections import deque
from PIL import Image

# Tolerância do que conta como xadrez.
# ⚠️ MEDIDO, depois de o avatar sair com o quadriculado na tela do pastor: os
# quadrados ESCUROS do xadrez ficam em 200-208, não em 238 como eu supus. Com
# o corte em 210 eles viravam MURO e a inundação parava neles. 178 passa por
# todos os dois tons. Pele e camisa não correm risco: quem protege é o teste
# de neutralidade abaixo (pele tem R muito maior que B).
CLARO_MIN = 178
# Quanto os três canais podem diferir entre si.
# ⚠️ MEDIDO, depois de a inundação COMER A PELE em volta dos lábios e sobrar só
# uma tira de 13 pixels: o xadrez é PERFEITAMENTE neutro (200,200,200 — zero de
# diferença), enquanto a pele clara fica por volta de (205,198,192), que dá 13.
# Com a folga em 14 a pele passava por xadrez. Em 6 os dois se separam limpo.
# Esta é a trava que impede o corte de comer o rosto — mexer aqui é perigoso.
NEUTRO_MAX = 6


def eh_magenta(p):
    """Fundo MAGENTA chapado — o jeito certo de pedir ao gerador de imagem.
    Depois de perder três tentativas com o xadrez pintado, a lição ficou: peça
    #FF00FF liso. Magenta é vermelho alto, verde BAIXO e azul alto — nenhuma
    pele, cabelo, camisa ou dente do mundo cai nessa combinação. O corte fica
    perfeito de primeira, sem risco de comer o rosto.
    A folga existe porque JPEG/WEBP amassam a cor: o canto veio (248,3,248)."""
    r, g, b = p[0], p[1], p[2]
    return r > 170 and b > 170 and g < 110 and abs(r - b) < 70


def eh_xadrez(p):
    """O fundo xadrez pintado, do jeito antigo. Fica aqui porque as duas
    primeiras folhas do Elias vieram assim e podem precisar ser refeitas."""
    r, g, b = p[0], p[1], p[2]
    if eh_magenta(p):
        return True
    if r < CLARO_MIN or g < CLARO_MIN or b < CLARO_MIN:
        return False
    return (max(r, g, b) - min(r, g, b)) <= NEUTRO_MAX


def tirar_fundo(im):
    """Inunda a partir das bordas e marca como transparente só o que for xadrez."""
    im = im.convert("RGBA")
    L, A = im.size
    px = im.load()
    visto = bytearray(L * A)
    fila = deque()

    def semear(x, y):
        if 0 <= x < L and 0 <= y < A and not visto[y * L + x] and eh_xadrez(px[x, y]):
            visto[y * L + x] = 1
            fila.append((x, y))

    for x in range(L):
        semear(x, 0); semear(x, A - 1)
    for y in range(A):
        semear(0, y); semear(L - 1, y)

    apagados = 0
    while fila:
        x, y = fila.popleft()
        px[x, y] = (0, 0, 0, 0)
        apagados += 1
        # 8 direções, não 4: o xadrez é um tabuleiro, e quadrado só toca o
        # vizinho de mesma cor na DIAGONAL. Com 4 direções a inundação ficava
        # presa dentro de uma cor só.
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
            semear(x + dx, y + dy)
    return im, apagados


def ilhas(im, minimo=9000):
    """Acha cada pedaço opaco separado. Devolve as caixas, de cima pra baixo."""
    L, A = im.size
    px = im.load()
    visto = bytearray(L * A)
    caixas = []
    # passo de 3 pixels na varredura: peça de avatar tem centenas de pixels,
    # e varrer de 1 em 1 nesta resolução é desperdício de minuto.
    for y0 in range(0, A, 3):
        for x0 in range(0, L, 3):
            if visto[y0 * L + x0] or px[x0, y0][3] < 40:
                continue
            fila = deque([(x0, y0)])
            visto[y0 * L + x0] = 1
            xi = xf = x0; yi = yf = y0; n = 0
            while fila:
                x, y = fila.popleft(); n += 1
                if x < xi: xi = x
                if x > xf: xf = x
                if y < yi: yi = y
                if y > yf: yf = y
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < L and 0 <= ny < A and not visto[ny * L + nx] and px[nx, ny][3] >= 40:
                        visto[ny * L + nx] = 1
                        fila.append((nx, ny))
            if n >= minimo:
                caixas.append((xi, yi, xf + 1, yf + 1, n))
    caixas.sort(key=lambda c: (c[0] // 200, c[1]))   # coluna primeiro, depois de cima pra baixo
    return caixas


def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    entrada, saida = sys.argv[1], sys.argv[2]
    os.makedirs(saida, exist_ok=True)

    im = Image.open(entrada)
    print("entrada: %s  %s  %s" % (entrada, im.size, im.mode))
    im, apagados = tirar_fundo(im)
    print("xadrez removido: %d pixels viraram transparentes" % apagados)

    cx = ilhas(im)
    print("peças encontradas: %d" % len(cx))
    if not cx:
        print("!! nenhuma peça — o fundo pode não ser xadrez. Confira a imagem.")
        sys.exit(1)

    # A MAIOR peça é o rosto; as outras são a coluna da direita, na ordem em que
    # foram desenhadas (de cima pra baixo). Não adivinho qual boca é qual: elas
    # saem numeradas e quem nomeia é quem olhou a imagem.
    cx_por_tamanho = sorted(cx, key=lambda c: -c[4])
    rosto = cx_por_tamanho[0]
    pecas = [c for c in cx if c is not rosto]

    def gravar(caixa, nome):
        rec = im.crop((caixa[0], caixa[1], caixa[2], caixa[3]))
        cam = os.path.join(saida, nome)
        rec.save(cam, optimize=True)
        print("  %-14s %4dx%-4d  %6.1f KB" % (nome, rec.size[0], rec.size[1], os.path.getsize(cam) / 1024))

    gravar(rosto, "rosto.png")
    for i, c in enumerate(pecas, 1):
        gravar(c, "peca-%02d.png" % i)

    print("\nPronto. Agora é dizer qual peça é qual boca (a última costuma ser os olhos fechados).")


if __name__ == "__main__":
    main()
