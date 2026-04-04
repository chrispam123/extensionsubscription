import type { FastifyInstance } from 'fastify'
import { claimJob, listJobsByStatus } from '../services/jobs.repository.js'

// 1. ESTO ES LO QUE FALTABA AGREGAR:
type JobRow = {
  jobId: string
  runAfter?: string
}

type ClaimedJob = {
  jobId: string
  previousStatus: 'PENDING' | 'PAUSED_QUOTA'
}

// 2. AQUÍ CAMBIAMOS 'any' POR 'JobRow':
const isReady = (job: JobRow, nowIso: string): boolean => {
  const runAfter = typeof job?.runAfter === 'string' ? job.runAfter : ''
  return runAfter !== '' && runAfter <= nowIso
}

export const workerRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post('/worker/tick', async (request, reply) => {
    if (process.env.NODE_ENV !== 'development') {
      return reply.status(404).send({ error: 'Not found' })
    }

    const url = new URL(request.url, 'http://localhost')
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '20'), 50)

    const nowIso = new Date().toISOString()

    const statuses: Array<'PENDING' | 'PAUSED_QUOTA'> = ['PENDING', 'PAUSED_QUOTA']

    // 3. AQUÍ YA APLICASTE EL CAMBIO CORRECTAMENTE:
    const scanned: JobRow[] = []
    const ready: JobRow[] = []
    const claimed: ClaimedJob[] = []

    for (const status of statuses) {
      const jobs = await listJobsByStatus({ status, limit })
      scanned.push(...jobs)

      for (const job of jobs) {
        // 'job' aquí viene de 'jobs' que devuelve el repository
        if (!isReady(job as JobRow, nowIso)) continue
        ready.push(job)

        const res = await claimJob({
          jobId: job.jobId,
          expectedStatus: status,
          nowIso
        })

        if (res.claimed) {
          claimed.push({ jobId: job.jobId, previousStatus: status })
        }
      }
    }

    return reply.send({
      now: nowIso,
      scanned: scanned.length,
      ready: ready.length,
      claimed: claimed.length,
      claimedJobs: claimed
    })
  })
}
