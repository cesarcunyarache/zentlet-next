#!/bin/sh
set -e

# reinstala sólo si cambió el lockfile desde la última vez
lock_hash=$(sha256sum pnpm-lock.yaml | cut -d ' ' -f 1)
if [ "$(cat node_modules/.lock-hash 2>/dev/null)" != "$lock_hash" ]; then
  echo "→ Instalando dependencias…"
  CI=true pnpm install --frozen-lockfile
  echo "$lock_hash" > node_modules/.lock-hash
fi

echo "→ Aplicando migraciones…"
pnpm exec prisma migrate deploy
pnpm exec prisma generate > /dev/null

exec "$@"
