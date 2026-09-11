# -*- coding: utf-8 -*-
"""Sobe os .enc do Meu Estudo pro Supabase Storage (bucket midias, prefixo estudo/).
Motivo: o Vercel Blob do RADAR foi SUSPENSO (store_suspended) e nao serve mais
os livros — nem deixa apagar nada. Os .enc originais estao no disco, entao a
biblioteca volta a funcionar sem depender do desbloqueio da Vercel.
Os arquivos ja estao criptografados (AES-256-GCM); o bucket publico so guarda
bytes ilegiveis sem a senha, igual era no Blob."""
import os, re, sys, json, urllib.request, urllib.error, concurrent.futures as cf

SUPA = "https://tjyquvmbaaavqnpirapp.supabase.co"
ANON = re.search(r"const ANON='(eyJ[^']+)'", open(r"D:\RADAR-APP\api\videos.js", encoding="utf-8").read()).group(1)

FONTES = [(r"D:\RADAR ATUAL\_enc_champlin", "champlin"),
          (r"D:\RADAR ATUAL\_cultura_md",   "cultura")]

def subir(args):
    caminho, destino = args
    dados = open(caminho, "rb").read()
    req = urllib.request.Request(
        f"{SUPA}/storage/v1/object/midias/estudo/{destino}",
        data=dados, method="POST",
        headers={"Authorization": "Bearer " + ANON, "apikey": ANON,
                 "Content-Type": "application/octet-stream",
                 "x-upsert": "true"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return (destino, len(dados), r.status, "")
    except urllib.error.HTTPError as e:
        return (destino, len(dados), e.code, e.read().decode("utf-8", "ignore")[:120])
    except Exception as e:
        return (destino, len(dados), 0, str(e)[:120])

tarefas = []
for pasta, sub in FONTES:
    if not os.path.isdir(pasta):
        print("PASTA NAO EXISTE:", pasta); continue
    for nome in sorted(os.listdir(pasta)):
        if nome.endswith(".enc"):
            tarefas.append((os.path.join(pasta, nome), f"{sub}/{nome}"))

print(f"{len(tarefas)} arquivos a subir\n")
ok = falhou = 0; bytes_ok = 0
with cf.ThreadPoolExecutor(max_workers=6) as ex:
    for destino, tam, st, err in ex.map(subir, tarefas):
        if st == 200:
            ok += 1; bytes_ok += tam
            print(f"  ok   {destino:<45} {tam/1e6:>6.2f} MB")
        else:
            falhou += 1
            print(f"  FALHOU {destino:<43} HTTP {st}  {err}")

print(f"\n{'='*58}\nsubiram {ok}/{len(tarefas)}  ({bytes_ok/1e6:.1f} MB)   falhas: {falhou}")
sys.exit(1 if falhou else 0)
