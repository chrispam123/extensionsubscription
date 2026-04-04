import type { FastifyInstance } from 'fastify'
import crypto from 'node:crypto'
import { CreateJobRequestSchema } from '../schemas/jobs.schema.js'
import { createYouTubeService } from '../services/youtube.service.js'
import { 
  batchPutJobItems, 
  putJob, 
  tryConsumeQuota, 
  listJobsByUserId 
} from '../services/jobs.repository.js'

const toUtcDateKey = (iso: string): string => iso.slice(0, 10)

const tomorrowMidnightUtcIso = (now: Date): string => {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const d = now.getUTCDate()
  // 00:00:00 del día siguiente en UTC
  return new Date(Date.UTC(y, m, d + 1, 0, 0, 0)).toISOString()
}

export const jobsRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // --- GET: Listar jobs del usuario ---
  app.get('/jobs', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid Authorization header' })
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const youtube = createYouTubeService(accessToken)
    
    // OJO: Esto consume cuota de YouTube. 
    // En el futuro, usa el userId que viene en el ID Token de Google decodificado.
    const userId = await youtube.getMyChannelId()

    const jobs = await listJobsByUserId(userId)

    // Ordenar por fecha descendente (más recientes primero)
    jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return reply.send({
      userId,
      count: jobs.length,
      jobs
    })
  })

  // --- POST: Crear un nuevo Job ---
  app.post('/jobs', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid Authorization header' })
    }

    const parseResult = CreateJobRequestSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parseResult.error.flatten()
      })
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const dateKey = toUtcDateKey(nowIso)
    const jobId = crypto.randomUUID()

    const accessToken = authHeader.replace('Bearer ', '')
    const youtube = createYouTubeService(accessToken)
    const userId = await youtube.getMyChannelId()

    const channels = parseResult.data.channels
    const unitsRequested = channels.length * 50 // Costo de suscripción en YouTube API

    // TTL de 7 días para que DynamoDB limpie los registros automáticamente
    const ttlEpochSeconds = Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000)

    // Lógica de decisión de cuota
    const consumeRes = await tryConsumeQuota({
      date: dateKey,
      userId,
      units: unitsRequested,
      nowIso,
      jobId,
      ttlEpochSeconds
    })

    let status: 'PENDING' | 'PAUSED_QUOTA'
    let runAfter: string

    if (consumeRes.consumed) {
      status = 'PENDING'
      runAfter = nowIso // Ejecución inmediata
    } else {
      status = 'PAUSED_QUOTA'
      runAfter = tomorrowMidnightUtcIso(now) // Esperar al reset UTC
    }

    // 1. Guardar el Job principal
    await putJob({
      jobId,
      userId,
      status,
      createdAt: nowIso,
      runAfter,
      jobType: 'IMPORT_SUBSCRIPTIONS',
      unitsRequested,
      channelsCount: channels.length
    })

    // 2. Guardar los items (canales individuales)
    await batchPutJobItems({
      jobId,
      channels,
      status,
      createdAt: nowIso
    })

    return reply.status(201).send({
      jobId,
      status,
      createdAt: nowIso,
      runAfter,
      unitsRequested,
      channelsCount: channels.length
    })
  })
}
