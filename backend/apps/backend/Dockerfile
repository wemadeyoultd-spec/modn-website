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

# The storefront (Next.js 15) depends on react@19, which npm hoists to the root
# node_modules of this workspace install. The Medusa admin dashboard renders
# with react@18. React 19 changed the internal element `$$typeof` symbol, so the
# admin's React-18 elements are seen as plain objects by the reconciler and the
# admin crashes at runtime with "Objects are not valid as a React child",
# leaving /app blank (HTTP 200 shell, nothing rendered). This image only builds
# and runs the BACKEND (the storefront is deployed separately on Vercel), so pin
# react/react-dom to 18.3.1 for the image install. That guarantees a single
# React 18 in the admin bundle. The committed repo and the Vercel storefront
# build are untouched, so the storefront keeps React 19.
RUN npm pkg set overrides.react=18.3.1 overrides.react-dom=18.3.1 \
 && npm install --no-audit --no-fund

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
