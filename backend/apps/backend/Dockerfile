# syntax=docker/dockerfile:1
# ===========================================================================
# Medusa backend production image (apps/backend)
# Build context MUST be the monorepo root that contains package-lock.json,
# i.e. the "backend/" directory. On Railway set the service Root Directory to
# "backend" and the Dockerfile path to "apps/backend/Dockerfile".
# ===========================================================================

# ---- Stage 1: install deps + build ---------------------------------------
FROM node:22-slim AS builder

WORKDIR /app

# Copy only manifests first for better layer caching. All workspace package.json
# files must be present so `npm ci` can resolve the workspaces graph.
COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/storefront/package.json ./apps/storefront/package.json

RUN npm ci

# Copy the rest of the source and build the backend (compiles server + admin
# into apps/backend/.medusa/server).
COPY . .
RUN cd apps/backend && npx medusa build

# ---- Stage 2: runtime ----------------------------------------------------
FROM node:22-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

# Bring over installed dependencies and the built application.
COPY --from=builder /app ./

WORKDIR /app/apps/backend

# Medusa serves on PORT (Railway/Render inject it); default to 9000 locally.
ENV PORT=9000
EXPOSE 9000

# Entrypoint runs migrations (always) + optional one-time seed (RUN_SEED=true),
# then starts the server. For zero-downtime multi-instance setups, move
# migrations into a dedicated release step and start with `npx medusa start`.
RUN chmod +x ./docker-entrypoint.sh
CMD ["./docker-entrypoint.sh"]
