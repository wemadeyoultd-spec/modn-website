import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Optional Redis. When REDIS_URL is set (recommended in production) it is used
// for distributed locking plus the Redis-backed event bus, cache and workflow
// engine. When it is absent Medusa falls back to in-memory implementations,
// which are fine for local development and a single-instance deployment.
const REDIS_URL = process.env.REDIS_URL

// Worker mode controls whether this instance serves HTTP, runs background jobs,
// or both. Default "shared" (one instance does everything) is right for small
// deployments. Scale later by running a second instance in "worker" mode and
// switching the HTTP instance to "server".
const WORKER_MODE =
  (process.env.MEDUSA_WORKER_MODE as 'shared' | 'worker' | 'server') || 'shared'

const redisModules = REDIS_URL
  ? [
      {
        resolve: '@medusajs/medusa/event-bus-redis',
        options: { redisUrl: REDIS_URL },
      },
      {
        resolve: '@medusajs/medusa/cache-redis',
        options: { redisUrl: REDIS_URL },
      },
      {
        resolve: '@medusajs/medusa/workflow-engine-redis',
        options: { redis: { url: REDIS_URL } },
      },
    ]
  : []

// Only register the Stripe payment provider when an API key is configured so the
// server still boots cleanly in environments where Stripe is not yet set up.
const stripeModules = process.env.STRIPE_API_KEY
  ? [
      {
        resolve: '@medusajs/medusa/payment',
        options: {
          providers: [
            {
              resolve: '@medusajs/medusa/payment-stripe',
              id: 'stripe',
              options: {
                apiKey: process.env.STRIPE_API_KEY,
                webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
              },
            },
          ],
        },
      },
    ]
  : []

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Railway/Render Postgres usually requires SSL; enable it via env without
    // hardcoding it so local Postgres keeps working.
    databaseDriverOptions:
      process.env.DATABASE_SSL === 'true'
        ? { connection: { ssl: { rejectUnauthorized: false } } }
        : undefined,
    redisUrl: REDIS_URL,
    workerMode: WORKER_MODE,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  admin: {
    // Absolute URL the admin dashboard uses to reach this backend in production
    // (e.g. https://your-backend.up.railway.app). Falls back to same-origin.
    backendUrl: process.env.MEDUSA_BACKEND_URL,
    // Disable serving the admin from the worker-only instance.
    disable: process.env.MEDUSA_DISABLE_ADMIN === 'true',
  },
  modules: [...stripeModules, ...redisModules],
})
