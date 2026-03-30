// subscriptions.routes.ts — endpoints de exportación e importación
//
// CONCEPTO: estas rutas son el núcleo del negocio.
// Delegan todo el trabajo a YouTubeService.
// La ruta no sabe cómo funciona YouTube API, solo orquesta.
//
// AUTENTICACIÓN: el Authorization header transporta el access token
// que la extensión recibió del flujo OAuth2.
// En una implementación completa, este token se verificaría
// con un Fastify plugin de autenticación antes de llegar a la ruta.

import type { FastifyInstance } from 'fastify'
import { createYouTubeService } from '../services/youtube.service.js'
import { ImportRequestSchema } from '../schemas/subscription.schema.js'

export const subscriptionRoutes = async (app: FastifyInstance): Promise<void> => {

  // Exporta todas las suscripciones del usuario
  app.get('/subscriptions', async (request, reply) => {
    const authHeader = request.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid Authorization header' })
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const youtubeService = createYouTubeService(accessToken)
    const result = await youtubeService.listSubscriptions()

    return reply.send(result)
  })

  // Importa una lista de suscripciones
  app.post('/subscriptions/import', async (request, reply) => {
    const authHeader = request.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid Authorization header' })
    }

    // Valida el body con Zod antes de procesarlo
    const parseResult = ImportRequestSchema.safeParse(request.body)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parseResult.error.flatten()
      })
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const youtubeService = createYouTubeService(accessToken)
    const result = await youtubeService.importSubscriptions(parseResult.data.channels)

    return reply.send(result)
  })
}
