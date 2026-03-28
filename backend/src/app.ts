// app.ts — factory de la aplicación Fastify
//
// CONCEPTO: este archivo es el punto de ensamblaje del sistema.
// No contiene lógica de negocio. Solo registra plugins y rutas.
// Cada ruta vive en su propio archivo con su propia responsabilidad.
//
// PATRÓN PLUGIN DE FASTIFY: cada ruta se registra como un plugin
// con un prefijo. Fastify encapsula cada plugin en su propio scope.
// Esto significa que los plugins no se contaminan entre sí:
// los hooks, decorators y schemas de /auth no afectan a /subscriptions.
//
// SEPARACIÓN app.ts / lambda.ts:
// Este archivo no sabe si corre en Docker o en Lambda.
// lambda.ts hace de adaptador para AWS.
// En local, Docker ejecuta este archivo directamente.

import Fastify from 'fastify'
import { healthRoutes } from './routes/health.routes.js'
import { authRoutes } from './routes/auth.routes.js'
import { subscriptionRoutes } from './routes/subscriptions.routes.js'

const app = Fastify({
  logger: {
    // CONCEPTO: logs estructurados en JSON.
    // En local: pino-pretty los formatea para lectura humana.
    // En Lambda: CloudWatch los indexa como JSON queryable.
    // El código no cambia, solo el formato de salida.
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined
  }
})

// Registro de rutas con prefijos
// CONCEPTO: el prefijo /api/v1 es versionado de API.
// Si en el futuro necesitas cambiar el contrato de un endpoint,
// creas /api/v2 sin romper los clientes que usan /api/v1.
// Es una decisión que cuesta cero ahora y vale mucho después.
await app.register(healthRoutes)
await app.register(authRoutes, { prefix: '/api/v1' })
await app.register(subscriptionRoutes, { prefix: '/api/v1' })

// Arranque del servidor
// CONCEPTO: este bloque solo corre en local con Docker.
// En Lambda, lambda.ts importa el app y lo adapta al handler.
// El servidor nunca "arranca" en Lambda, simplemente responde invocaciones.
const start = async (): Promise<void> => {
  try {
    await app.listen({
      port: Number(process.env.PORT) ?? 3000,
      // 0.0.0.0 es crítico en Docker — escucha en todas las interfaces
      // 127.0.0.1 solo escucharía dentro del container, inaccesible desde fuera
      host: '0.0.0.0'
    })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

export default app
await start()
