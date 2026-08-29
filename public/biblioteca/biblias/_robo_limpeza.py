# -*- coding: utf-8 -*-
"""
ROBÔ DE LIMPEZA DE NOTAS (OCR) — RADAR Bíblias
Conserta erros de OCR nas notas de estudo (acentos, ç, aspas, palavras quebradas)
SEM alterar o conteúdo. Resumível (checkpoint) e seguro (.bak antes de gravar).

Uso:
  python _robo_limpeza.py teste            -> limpa 6 notas e mostra ANTES/DEPOIS (não grava)
  python _robo_limpeza.py <id> [maxbatches] -> limpa notas-<id>.json de verdade (checkpoint)
     ex: python _robo_limpeza.py pentecostal
"""
import sys, os, io, json, re, time, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
DIR = os.path.dirname(os.path.abspath(__file__))

def openai_key():
    for line in open(r"D:\APIS-CLAUDE\CHAVES.md", encoding="utf-8", errors="ignore"):
        m = re.search(r"sk-proj-[A-Za-z0-9_-]{20,}", line)
        if m: return m.group(0)
    raise SystemExit("sem chave OpenAI no cofre")

KEY = openai_key()

SYS = (
    "Você conserta erros de OCR em NOTAS DE ESTUDO BÍBLICO em português do Brasil. "
    "Os textos vêm com acentuação quebrada, cedilha trocada por 'g' (atengao=atenção, criagao=criação), "
    "acentos virando aspa/f/0 (princi'pio=princípio, Bfblia=Bíblia, 0=o), caracteres '�' (=Ê,Õ,Ç,«,» conforme o contexto), "
    "palavras partidas por quebra de linha (empre gou=empregou) e MAIÚSCULAS espaçadas (M O R A L=MORAL). "
    "CONSERTE tudo isso restaurando o português correto. "
    "REGRAS: NÃO resuma, NÃO reescreva, NÃO acrescente nem remova conteúdo, NÃO traduza, "
    "mantenha as referências bíblicas (Gn 1.1), números e o sentido EXATOS. Apenas conserte a grafia. "
    "Responda SOMENTE um objeto JSON {\"id\": \"texto corrigido\", ...} com as MESMAS chaves recebidas."
)

def call_openai(mapa):
    body = json.dumps({
        "model": "gpt-4o-mini",
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYS},
            {"role": "user", "content": "Conserte o OCR destas notas e devolva o JSON:\n" + json.dumps(mapa, ensure_ascii=False)},
        ],
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions", data=body,
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"},
    )
    for tent in range(4):
        try:
            r = urllib.request.urlopen(req, timeout=120)
            j = json.loads(r.read().decode("utf-8"))
            return json.loads(j["choices"][0]["message"]["content"])
        except Exception as e:
            if tent == 3: raise
            time.sleep(3 * (tent + 1))

def flatten(d):
    """gera lista de (abbrev, cap, ver, texto)"""
    itens = []
    for ab, caps in d.items():
        if not isinstance(caps, dict): continue
        for cap, vers in caps.items():
            if not isinstance(vers, dict): continue
            for ver, txt in vers.items():
                if isinstance(txt, str) and txt.strip():
                    itens.append((ab, cap, ver, txt))
    return itens

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "teste"

    if arg == "teste":
        d = json.load(open(os.path.join(DIR, "notas-pentecostal.json"), encoding="utf-8"))
        itens = flatten(d)[:6]
        mapa = {f"{ab}|{cap}|{ver}": txt for ab, cap, ver, txt in itens}
        print("== enviando", len(mapa), "notas pro robô ==\n")
        out = call_openai(mapa)
        for k in mapa:
            print("### " + k)
            print("ANTES: " + mapa[k][:280])
            print("DEPOIS:", out.get(k, "(sem retorno)")[:280])
            print()
        return

    bid = arg
    src = os.path.join(DIR, f"notas-{bid}.json")
    if not os.path.exists(src): raise SystemExit("não existe: " + src)
    ckpt = os.path.join(DIR, f"_limpeza-{bid}.ckpt.json")

    d = json.load(open(src, encoding="utf-8"))
    itens = flatten(d)
    done = {}
    if os.path.exists(ckpt):
        done = json.load(open(ckpt, encoding="utf-8"))
    pend = [it for it in itens if f"{it[0]}|{it[1]}|{it[2]}" not in done]
    print(f"[{bid}] total {len(itens)} notas | já feitas {len(done)} | pendentes {len(pend)}", flush=True)

    BATCH = 12
    maxb = int(sys.argv[2]) if len(sys.argv) > 2 else 10**9
    feitos = 0
    for i in range(0, len(pend), BATCH):
        if feitos >= maxb: break
        lote = pend[i:i + BATCH]
        mapa = {f"{ab}|{cap}|{ver}": txt for ab, cap, ver, txt in lote}
        try:
            out = call_openai(mapa)
        except Exception as e:
            print("  erro no lote, pulando:", e, flush=True); continue
        for k, v in out.items():
            if isinstance(v, str) and v.strip(): done[k] = v
        json.dump(done, open(ckpt, "w", encoding="utf-8"), ensure_ascii=False)
        feitos += 1
        print(f"  lote {feitos}: +{len(mapa)} | acumulado {len(done)}/{len(itens)}", flush=True)

    # aplica de volta na estrutura e grava (com .bak salva-vidas)
    if len(done) >= len(itens):
        for ab, caps in d.items():
            if not isinstance(caps, dict): continue
            for cap, vers in caps.items():
                if not isinstance(vers, dict): continue
                for ver in vers:
                    k = f"{ab}|{cap}|{ver}"
                    if k in done: vers[ver] = done[k]
        if not os.path.exists(src + ".bak"):
            import shutil; shutil.copy(src, src + ".bak")
        json.dump(d, open(src, "w", encoding="utf-8"), ensure_ascii=False)
        print(f"[{bid}] CONCLUÍDO — {len(done)} notas limpas, gravado {os.path.basename(src)} (.bak salvo)", flush=True)
    else:
        print(f"[{bid}] parcial — {len(done)}/{len(itens)}. Rode de novo pra continuar (checkpoint salvo).", flush=True)

if __name__ == "__main__":
    main()
