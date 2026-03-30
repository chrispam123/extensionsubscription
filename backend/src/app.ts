// backend/src/app.ts
import Fastify from 'fastify'
import cors from '@fastify/cors' // 1. Importar el plugin
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

// 2. Registrar CORS antes que las rutas
await app.register(cors, {
  origin: "*", // En producción podrías poner "chrome-extension://tu-id-aqui"
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})

await app.register(healthRoutes)
await app.register(authRoutes, { prefix: '/api/v1' })
await app.register(subscriptionRoutes, { prefix: '/api/v1' })

// IMPORTANTE: Solo exportamos, no escuchamos.
export default app
