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

  # Diagnostics: show whether the DB host resolves over Railway's private
  # network. `.railway.internal` names are IPv6-only and may take a few seconds
  # to resolve after the container starts.
  echo "[entrypoint] DNS lookup for ${host}:"
  getent hosts "$host" 2>/dev/null || echo "  (no DNS resolution yet for ${host})"

  # Probe TCP with node (always present in this image) — pg_isready/nc are not
  # installed and dash has no /dev/tcp. Up to ~180s so a slow Postgres first
  # boot or a private-network warm-up does not fail the deploy.
  echo "[entrypoint] Waiting for Postgres at ${host}:${port} (up to ~180s)..."
  i=0
  while [ "$i" -lt 60 ]; do
    if node -e '
      const net = require("net");
      const s = net.connect({ host: process.argv[1], port: +process.argv[2] }, () => { s.end(); process.exit(0); });
      s.setTimeout(3000, () => { s.destroy(); process.exit(1); });
      s.on("error", () => process.exit(1));
    ' "$host" "$port" >/dev/null 2>&1; then
      echo "[entrypoint] Postgres TCP port ${host}:${port} is open."
      return 0
    fi
    i=$((i + 1))
    [ $((i % 5)) -eq 0 ] && echo "[entrypoint] ...still waiting for ${host}:${port} (${i}/60)"
    sleep 3
  done
  echo "[entrypoint] Postgres not reachable after wait. Final DNS state:"
  getent hosts "$host" 2>/dev/null || echo "  (still no DNS resolution for ${host})"
  echo "[entrypoint] Proceeding anyway (migrate will retry)."
  return 0
}

wait_for_postgres

# ---------------------------------------------------------------------------
# Optional one-time DESTRUCTIVE reset. When RESET_DB=true, drop and recreate the
# public schema BEFORE migrations so migrations + seed run against a truly empty
# database. Use this to recover from a persistent volume left in a half-seeded
# state (e.g. after an earlier crash-loop), then set RESET_DB=false again.
# ---------------------------------------------------------------------------
if [ "$RESET_DB" = "true" ]; then
  echo "[entrypoint] RESET_DB=true — dropping and recreating public schema (DESTRUCTIVE)..."
  node -e '
    const { Client } = require("pg");
    const ssl = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl });
    c.connect()
      .then(() => c.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
      .then(() => { console.log("[entrypoint] public schema dropped and recreated."); return c.end(); })
      .then(() => process.exit(0))
      .catch((e) => { console.error("[entrypoint] RESET_DB failed:", e.message); process.exit(1); });
  ' || { echo "[entrypoint] RESET_DB step failed; aborting."; exit 1; }
fi

echo "[entrypoint] Running database migrations..."
# Retry migrations for a while in case Postgres is still finishing startup or
# the private network is still warming up (~10 attempts x 15s ≈ 2.5m).
migrate_ok=0
i=0
while [ "$i" -lt 10 ]; do
  if npx medusa db:migrate; then
    migrate_ok=1
    break
  fi
  i=$((i + 1))
  echo "[entrypoint] Migration attempt $i failed; retrying in 15s..."
  sleep 15
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
# ---------------------------------------------------------------------------
# Optional one-time admin password set. When SET_ADMIN=true, create or reset the
# admin user (ADMIN_EMAIL / ADMIN_PASSWORD) in-container via Medusa so the
# password is hashed correctly (raw SQL cannot do this). Runs synchronously
# before the server starts; failures are non-fatal so they never crash-loop the
# container. Set SET_ADMIN=false again after a successful run.
# ---------------------------------------------------------------------------
if [ "$SET_ADMIN" = "true" ]; then
  echo "[entrypoint] SET_ADMIN=true — setting admin password for ${ADMIN_EMAIL:-admin@medusa.local}..."
  npx medusa exec ./src/scripts/set-admin.ts \
    && echo "[entrypoint] SET_ADMIN COMPLETE. IMPORTANT: re-deploy with SET_ADMIN=false." \
    || echo "[entrypoint] SET_ADMIN FAILED (see error above)."
fi

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

echo "[entrypoint] Starting Medusa server from the build output (.medusa/server)..."
# Medusa v2 emits the compiled server + the admin dashboard into
# .medusa/server (admin at .medusa/server/public/admin). `medusa start` must run
# from that build-output directory or it aborts on boot with:
#   "Could not find index.html in the admin build directory. Make sure to run
#    'medusa build' before starting the server."
# which crash-loops the container so /health never turns green. Migrations and
# the (backgrounded) seed above run from the project root against the TypeScript
# sources; only the long-running server switches into the build output. The seed
# subshell forked above keeps its own working directory, unaffected by this cd.
cd .medusa/server
exec npx medusa start
