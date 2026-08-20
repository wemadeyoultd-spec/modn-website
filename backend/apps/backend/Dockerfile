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

# Copy only the manifests needed to build the backend (the storefront manifest
# is intentionally omitted — see below).
COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/package.json

# This image builds and runs ONLY the Medusa backend; the Next.js storefront is
# deployed separately on Vercel. The storefront depends on react@19, which npm
# hoists into the shared workspace node_modules and collides with the react@18
# that the admin dashboard renders with. React 19 changed the internal element
# `$$typeof` symbol, so the admin's React-18 elements are seen as plain objects
# by the reconciler and the admin crashes at runtime ("Objects are not valid as
# a React child") — /app returns its HTML shell (HTTP 200) but renders blank.
#
# Restrict the workspace install to apps/backend and re-resolve from scratch so
# ONLY a single react@18 is present when `medusa build` bundles the admin. A
# root `overrides` pin was tried first and did NOT work (npm keeps the locked
# react@19), so the storefront is excluded from the install entirely. The
# committed repo and the Vercel storefront build are untouched (storefront keeps
# React 19). The later `COPY . .` restores the original manifests, but the
# backend-only node_modules is already resolved and `medusa build` does not
# reinstall.
RUN node -e "const fs=require('fs');const p=require('./package.json');p.workspaces=['apps/backend'];fs.writeFileSync('package.json',JSON.stringify(p,null,2))" \
 && rm -f package-lock.json \
 && npm install --no-audit --no-fund \
 && node -e "console.log('resolved root react =', require('react/package.json').version)"

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
