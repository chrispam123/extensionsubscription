// health.routes.ts — endpoint de salud del servicio
//
// CONCEPTO: el health check es el primer endpoint que cualquier
// sistema de infraestructura consulta. API Gateway, load balancers,
// y sistemas de monitorización llaman aquí constantemente.
// Si no responde 200, el sistema considera el servicio caído.
//
// En AWS Lambda este endpoint también sirve para warm-up:
// llamarlo periódicamente evita cold starts en momentos críticos.

import type { FastifyInstance } from 'fastify'

export const healthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }
  })
}
