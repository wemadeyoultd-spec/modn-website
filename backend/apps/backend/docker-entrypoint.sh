#!/bin/sh
# Production entrypoint for the Medusa backend container.
#
# Always applies pending DB migrations, then starts the server.
#
# Optional one-time bootstrap (mobile-friendly — no terminal needed):
# set RUN_SEED=true on the FIRST deploy to seed the store, then REMOVE it.
#   - RUN_SEED=true            run the seeds + inventory fix once on a fresh DB
#   - ADMIN_EMAIL / ADMIN_PASSWORD  also create an admin user
# WARNING: the initial seed is NOT idempotent — only run it on an empty DB and
# unset RUN_SEED afterwards, or you will create duplicate store data.
set -e

echo "[entrypoint] Running database migrations..."
npx medusa db:migrate

if [ "$RUN_SEED" = "true" ]; then
  echo "[entrypoint] RUN_SEED=true — seeding store data (one-time)..."
  npx medusa exec ./src/migration-scripts/initial-data-seed.ts
  npx medusa exec ./src/scripts/seed-sorinex.ts
  npx medusa exec ./src/scripts/seed-us-region.ts
  npx medusa exec ./src/scripts/fix-inventory.ts

  if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
    echo "[entrypoint] Creating admin user $ADMIN_EMAIL..."
    npx medusa user -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD" || true
  fi

  echo "[entrypoint] Seeding complete. IMPORTANT: remove RUN_SEED before the next deploy."
fi

echo "[entrypoint] Starting Medusa server..."
exec npx medusa start
