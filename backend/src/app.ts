// backend/src/app.ts
import Fastify from 'fastify'
import { healthRoutes } from './routes/health.routes.js'
import { authRoutes } from './routes/auth.routes.js'
import { subscriptionRoutes } from './routes/subscriptions.routes.js'

const app = Fastify({
  logger: {
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined
  }
})

await app.register(healthRoutes)
await app.register(authRoutes, { prefix: '/api/v1' })
await app.register(subscriptionRoutes, { prefix: '/api/v1' })

// IMPORTANTE: Solo exportamos, no escuchamos.
export default app
