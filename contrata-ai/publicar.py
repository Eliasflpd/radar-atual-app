#!/usr/bin/env python3
"""Gera a cópia publicada do Contrata Aí dentro do site do Radar Atual.

O Radar Atual (radar-atual.vercel.app) publica a pasta `public/` deste repositório
sozinho a cada mudança no ramo principal. Este script copia `contrata-ai/public/`
para `public/contrata/`, trocando os caminhos absolutos ("/css/app.css") por
relativos ("./css/app.css"), para o app funcionar em
https://radar-atual.vercel.app/contrata/ sem projeto separado na Vercel.

Rode a partir da raiz do repositório:  python3 contrata-ai/publicar.py
"""
import json
import re
import shutil
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / 'contrata-ai' / 'public'
DESTINO = RAIZ / 'public' / 'contrata'
# a demonstração (dados de mentira) não vai para o site de verdade
NAO_COPIAR = {'demo.html', 'demo.js'}


def copiar():
    if DESTINO.exists():
        shutil.rmtree(DESTINO)
    shutil.copytree(ORIGEM, DESTINO, ignore=lambda d, nomes: [n for n in nomes if n in NAO_COPIAR])


def trocar(arquivo: Path, pares):
    texto = arquivo.read_text(encoding='utf-8')
    for antes, depois in pares:
        if antes not in texto:
            raise SystemExit(f'{arquivo.name}: não achei {antes!r} (o app mudou; ajuste publicar.py)')
        texto = texto.replace(antes, depois)
    arquivo.write_text(texto, encoding='utf-8')


def main():
    copiar()
    trocar(DESTINO / 'index.html', [
        ('href="/manifest.webmanifest"', 'href="./manifest.webmanifest"'),
        ('href="/icons/', 'href="./icons/'),
        ('href="/css/app.css"', 'href="./css/app.css"'),
        ('src="/js/app.js"', 'src="./js/app.js"'),
    ])
    trocar(DESTINO / 'js' / 'app.js', [
        ("fetch('/api/config')", "fetch('./api/config')"),
        ("s.src = '/js/vendor/supabase.js';", "s.src = './js/vendor/supabase.js';"),
        ("navigator.serviceWorker.register('/sw.js')", "navigator.serviceWorker.register('./sw.js', { scope: './' })"),
    ])
    sw = DESTINO / 'sw.js'
    texto = sw.read_text(encoding='utf-8')
    texto = re.sub(r"'/(?=[^']*')", "'./", texto, count=0)  # '/x' -> './x' dentro da lista e do match
    texto = texto.replace("url.pathname.startsWith('/api/')", "url.pathname.includes('/api/')")
    sw.write_text(texto, encoding='utf-8')
    m = DESTINO / 'manifest.webmanifest'
    manifesto = json.loads(m.read_text(encoding='utf-8'))
    manifesto['start_url'] = './'
    manifesto['scope'] = './'
    for ic in manifesto['icons']:
        ic['src'] = '.' + ic['src']
    m.write_text(json.dumps(manifesto, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    # confere que não sobrou caminho absoluto
    sobras = []
    for arq in [DESTINO / 'index.html', DESTINO / 'js' / 'app.js', sw, m]:
        for linha in arq.read_text(encoding='utf-8').splitlines():
            if re.search(r"""(href|src)=["']/(?!/)|['"]/(?:js|css|icons|img|sw\.js|index\.html|manifest)""", linha):
                sobras.append(f'{arq.name}: {linha.strip()[:90]}')
    if sobras:
        raise SystemExit('Caminhos absolutos ainda presentes:\n' + '\n'.join(sobras))
    print(f'Publicado em {DESTINO.relative_to(RAIZ)}/ ({sum(1 for _ in DESTINO.rglob("*") if _.is_file())} arquivos)')


if __name__ == '__main__':
    main()
