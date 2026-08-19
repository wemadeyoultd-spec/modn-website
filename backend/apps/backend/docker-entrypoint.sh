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

# ---------------------------------------------------------------------------
# Wait for Postgres to be reachable before running migrations/seed. On a fresh
# Railway project the Postgres service can still be booting when the backend
# container starts; running migrations too early crashes the deploy. Parse the
# host/port from DATABASE_URL and probe it (pg_isready > nc > /dev/tcp), then
# fall back to a fixed sleep if no probe tool is available. Never hard-fails on
# a missing probe tool — the migrate step below still retries.
# ---------------------------------------------------------------------------
wait_for_postgres() {
  [ -z "$DATABASE_URL" ] && { echo "[entrypoint] DATABASE_URL unset; skipping DB wait."; return 0; }

  # Strip scheme + credentials, then isolate host:port before the first '/'.
  hostport="$(printf '%s' "$DATABASE_URL" | sed -e 's#^[a-zA-Z]*://##' -e 's#^[^@]*@##' -e 's#/.*##' -e 's#?.*##')"
  host="$(printf '%s' "$hostport" | sed -e 's#:.*##')"
  port="$(printf '%s' "$hostport" | sed -n 's#^[^:]*:\([0-9]*\).*#\1#p')"
  [ -z "$port" ] && port=5432
  [ -z "$host" ] && { echo "[entrypoint] Could not parse host from DATABASE_URL; skipping DB wait."; return 0; }

  echo "[entrypoint] Waiting for Postgres at ${host}:${port} (up to ~90s)..."
  i=0
  while [ "$i" -lt 45 ]; do
    if command -v pg_isready >/dev/null 2>&1; then
      pg_isready -h "$host" -p "$port" >/dev/null 2>&1 && { echo "[entrypoint] Postgres is ready."; return 0; }
    elif command -v nc >/dev/null 2>&1; then
      nc -z "$host" "$port" >/dev/null 2>&1 && { echo "[entrypoint] Postgres port is open."; return 0; }
    else
      # No probe tool: try a bash-style TCP check, else just wait out the loop.
      (exec 3<>"/dev/tcp/${host}/${port}") >/dev/null 2>&1 && { echo "[entrypoint] Postgres port is open (tcp)."; return 0; }
    fi
    i=$((i + 1))
    sleep 2
  done
  echo "[entrypoint] Postgres not confirmed ready after wait; proceeding anyway (migrate will retry)."
  return 0
}

wait_for_postgres

echo "[entrypoint] Running database migrations..."
# Retry migrations a few times in case Postgres is still finishing startup.
migrate_ok=0
i=0
while [ "$i" -lt 5 ]; do
  if npx medusa db:migrate; then
    migrate_ok=1
    break
  fi
  i=$((i + 1))
  echo "[entrypoint] Migration attempt $i failed; retrying in 10s..."
  sleep 10
done
if [ "$migrate_ok" -ne 1 ]; then
  echo "[entrypoint] Migrations failed after retries."
  exit 1
fi

# ---------------------------------------------------------------------------
# Seeding runs in the BACKGROUND so it never blocks the HTTP server from
# starting. The platform healthcheck (and CI /health poll) gate the deploy on
# GET /health returning 200; if the (non-idempotent, multi-minute) seed ran in
# the foreground the server would not start until it finished, the healthcheck
# would time out, and the deploy would be marked failed — leaving the public
# domain returning 404. Backgrounding the seed lets the server come up in
# seconds; the seed then populates the DB while the server serves. Each seed
# step is non-fatal (guarded) so a single failing script cannot restart-loop
# the container.
# ---------------------------------------------------------------------------
run_seeds() {
  echo "[entrypoint][seed] RUN_SEED=true — seeding store data (one-time, background)..."
  npx medusa exec ./src/migration-scripts/initial-data-seed.ts || echo "[entrypoint][seed] initial-data-seed FAILED"
  npx medusa exec ./src/scripts/seed-sorinex.ts || echo "[entrypoint][seed] seed-sorinex FAILED"
  npx medusa exec ./src/scripts/seed-us-region.ts || echo "[entrypoint][seed] seed-us-region FAILED"
  npx medusa exec ./src/scripts/fix-inventory.ts || echo "[entrypoint][seed] fix-inventory FAILED"

  if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
    echo "[entrypoint][seed] Creating admin user $ADMIN_EMAIL..."
    npx medusa user -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD" || echo "[entrypoint][seed] admin user creation failed (may already exist)"
  fi

  echo "[entrypoint][seed] SEED COMPLETE. IMPORTANT: re-deploy with RUN_SEED=false before the next deploy."
}

if [ "$RUN_SEED" = "true" ]; then
  ( run_seeds ) &
fi

echo "[entrypoint] Starting Medusa server..."
exec npx medusa start
