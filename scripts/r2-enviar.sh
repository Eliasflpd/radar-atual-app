#!/usr/bin/env bash
# Envia para o Cloudflare R2 (bucket nexus-midia) as imagens e peças 3D do NEXUS que mudaram desde o último envio.
# uso: bash scripts/r2-enviar.sh        (precisa do login do wrangler já feito: npx wrangler@3 login)
cd "$(dirname "$0")/.." || exit 1
marca=.r2-ultimo-envio; n=0
for f in public/nexus/livros/*.jpg public/nexus/lugares/*.jpg public/nexus/templo3d/*.glb; do
  [ -f "$marca" ] && [ ! "$f" -nt "$marca" ] && continue
  k=${f#public/nexus/}; npx wrangler@3 r2 object put "nexus-midia/$k" --file "$f" > /dev/null 2>&1 && n=$((n+1)) || echo "falhou: $k"
done
touch "$marca"; echo "enviados: $n"
