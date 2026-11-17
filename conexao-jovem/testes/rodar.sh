#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Roda os testes de RLS/autorização do Conexão Jovem num Postgres LOCAL e
# DESCARTÁVEL (pasta temporária, porta 54329, só socket local). Nunca conecta
# em banco remoto: não lê nenhuma variável de ambiente de banco do Radar.
#
# Requisitos: PostgreSQL 15+ instalado (initdb/pg_ctl) e Node 18+ com npm.
#   Ubuntu/Debian:  sudo apt-get install -y postgresql
# Uso:  bash conexao-jovem/testes/rodar.sh
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Garante que nenhuma conexão herdada aponte para outro banco.
unset DATABASE_URL PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSERVICE 2>/dev/null || true

BIN="$(pg_config --bindir 2>/dev/null || true)"
if [ -z "$BIN" ] || [ ! -x "$BIN/initdb" ]; then
  BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
fi
if [ -z "$BIN" ] || [ ! -x "$BIN/initdb" ]; then
  echo "ERRO: PostgreSQL não encontrado. Instale com: sudo apt-get install -y postgresql" >&2
  exit 2
fi

TMP="$(mktemp -d -t cj-testes-XXXXXX)"
PORTA=54329
chmod 755 "$TMP"
COMO=()
if [ "$(id -u)" = "0" ]; then
  # initdb não roda como root: usa o usuário de sistema postgres.
  chown postgres "$TMP"
  COMO=(runuser -u postgres --)
fi

limpar() {
  "${COMO[@]}" "$BIN/pg_ctl" -D "$TMP/dados" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap limpar EXIT

echo "→ Postgres local descartável em $TMP (binários: $BIN)"
"${COMO[@]}" "$BIN/initdb" -D "$TMP/dados" -U postgres -A trust -E UTF8 --locale=C.UTF-8 >/dev/null
"${COMO[@]}" "$BIN/pg_ctl" -D "$TMP/dados" -l "$TMP/pg.log" -w \
  -o "-p $PORTA -k $TMP -c listen_addresses='' -c timezone=UTC" start >/dev/null

# Driver pg do Node numa pasta temporária (não toca no package.json do Radar).
if ! (cd "$TMP" && npm install --no-save --no-audit --no-fund --silent pg@8.13.1 >/dev/null 2>&1); then
  echo "ERRO: não consegui instalar o pacote 'pg' pelo npm." >&2
  exit 2
fi

CJ_PGHOST="$TMP" CJ_PGPORT="$PORTA" NODE_PATH="$TMP/node_modules" \
  node "$AQUI/rls.test.js"
