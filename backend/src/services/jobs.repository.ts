import {
  BatchWriteCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb'
import type { Channel } from '../schemas/subscription.schema.js'
import { ddbDocClient } from './dynamodb.client.js'

// --- CONFIGURACIÓN ---
const JOBS_TABLE_NAME = process.env.JOBS_TABLE_NAME!
const JOBITEMS_TABLE_NAME = process.env.JOBITEMS_TABLE_NAME!
const QUOTA_LEDGER_TABLE_NAME = process.env.QUOTA_LEDGER_TABLE_NAME!

const GLOBAL_QUOTA_LIMIT_UNITS = Number(process.env.GLOBAL_QUOTA_LIMIT_UNITS ?? '10000')
const GLOBAL_QUOTA_SAFETY_MARGIN_UNITS = Number(process.env.GLOBAL_QUOTA_SAFETY_MARGIN_UNITS ?? '500')
const USER_DAILY_SOFT_CAP_UNITS = Number(process.env.USER_DAILY_SOFT_CAP_UNITS ?? '1000')

const GLOBAL_USER_ID = '__GLOBAL__'

// --- TIPOS ---
export type JobStatus = 'PENDING' | 'PAUSED_QUOTA' | 'RUNNING' | 'DONE' | 'FAILED'

export type JobItem = {
  jobId: string
  userId: string
  status: JobStatus
  createdAt: string
  runAfter: string
  jobType: 'IMPORT_SUBSCRIPTIONS'
  unitsRequested: number
  channelsCount: number
  startedAt?: string
}

type QuotaLedgerItem = {
  date: string
  userId: string
  consumedUnits?: number
}

// --- UTILIDADES ---
const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// --- SERVICIOS ---

/**
 * Obtiene las unidades consumidas para un usuario o para el total global en una fecha.
 */
export const getQuotaConsumedUnits = async (date: string, userId: string): Promise<number> => {
  const res = await ddbDocClient.send(
    new GetCommand({
      TableName: QUOTA_LEDGER_TABLE_NAME,
      Key: { date, userId }
    })
  )
  const item = res.Item as QuotaLedgerItem | undefined
  return item?.consumedUnits ?? 0
}

/**
 * Intenta reservar cuota tanto a nivel global como de usuario mediante actualizaciones atómicas.
 *
 * Notas DynamoDB:
 * - NO se permite `if_not_exists()` en ConditionExpression (lo probamos y falla).
 * - NO se permite aritmética tipo `consumedUnits + :u` en ConditionExpression (falla).
 *
 * Estrategia:
 * - ConditionExpression: attribute_not_exists(consumedUnits) OR consumedUnits <= :maxMinusUnits
 * - UpdateExpression: consumedUnits = if_not_exists(consumedUnits, :zero) + :u
 */
export const tryConsumeQuota = async (params: {
  date: string
  userId: string
  units: number
  nowIso: string
  jobId: string
  ttlEpochSeconds: number
}): Promise<{ consumed: true } | { consumed: false; reason: 'NO_QUOTA' | 'RACE_CONDITION' }> => {
  const { date, userId, units, nowIso, jobId, ttlEpochSeconds } = params

  const globalConsumed = await getQuotaConsumedUnits(date, GLOBAL_USER_ID)
  const userConsumed = await getQuotaConsumedUnits(date, userId)

  const globalMax = GLOBAL_QUOTA_LIMIT_UNITS - GLOBAL_QUOTA_SAFETY_MARGIN_UNITS
  const hasQuota = globalConsumed + units <= globalMax && userConsumed + units <= USER_DAILY_SOFT_CAP_UNITS

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[tryConsumeQuota] check', {
      date,
      userId,
      units,
      globalConsumed,
      userConsumed,
      globalMax,
      USER_DAILY_SOFT_CAP_UNITS,
      hasQuota
    })
  }

  if (!hasQuota) return { consumed: false, reason: 'NO_QUOTA' }

  try {
    // 1) Consumo Global
    await ddbDocClient.send(
      new UpdateCommand({
        TableName: QUOTA_LEDGER_TABLE_NAME,
        Key: { date, userId: GLOBAL_USER_ID },
        UpdateExpression:
          'SET consumedUnits = if_not_exists(consumedUnits, :zero) + :u, updatedAt = :now, lastJobId = :jobId, #t = :ttl',
        ConditionExpression: 'attribute_not_exists(consumedUnits) OR consumedUnits <= :maxMinusUnits',
        ExpressionAttributeNames: { '#t': 'ttl' },
        ExpressionAttributeValues: {
          ':zero': 0,
          ':u': units,
          ':now': nowIso,
          ':jobId': jobId,
          ':ttl': ttlEpochSeconds,
          ':maxMinusUnits': globalMax - units
        }
      })
    )

    // 2) Consumo de Usuario
    await ddbDocClient.send(
      new UpdateCommand({
        TableName: QUOTA_LEDGER_TABLE_NAME,
        Key: { date, userId },
        UpdateExpression:
          'SET consumedUnits = if_not_exists(consumedUnits, :zero) + :u, updatedAt = :now, lastJobId = :jobId, #t = :ttl',
        ConditionExpression: 'attribute_not_exists(consumedUnits) OR consumedUnits <= :maxMinusUnits',
        ExpressionAttributeNames: { '#t': 'ttl' },
        ExpressionAttributeValues: {
          ':zero': 0,
          ':u': units,
          ':now': nowIso,
          ':jobId': jobId,
          ':ttl': ttlEpochSeconds,
          ':maxMinusUnits': USER_DAILY_SOFT_CAP_UNITS - units
        }
      })
    )

    return { consumed: true }
  } catch (err: unknown) {
    if (process.env.NODE_ENV === 'development') {
      const e = err as { name?: string; message?: string; $metadata?: unknown }
      // eslint-disable-next-line no-console
      console.error('[tryConsumeQuota] update failed', {
        name: e?.name,
        message: e?.message,
        $metadata: e?.$metadata
      })
    }
    return { consumed: false, reason: 'RACE_CONDITION' }
  }
}

/**
 * Crea un nuevo registro de Job.
 */
export const putJob = async (job: JobItem): Promise<void> => {
  await ddbDocClient.send(
    new PutCommand({
      TableName: JOBS_TABLE_NAME,
      Item: job
    })
  )
}

/**
 * Lista los jobs de un usuario específico usando GSI1.
 */
export const listJobsByUserId = async (userId: string): Promise<JobItem[]> => {
  const res = await ddbDocClient.send(
    new QueryCommand({
      TableName: JOBS_TABLE_NAME,
      IndexName: 'gsi1_userId',
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
      ScanIndexForward: false
    })
  )

  return (res.Items ?? []) as JobItem[]
}

/**
 * Crea múltiples items de canales asociados a un Job en lotes de 25.
 */
export const batchPutJobItems = async (params: {
  jobId: string
  channels: Channel[]
  status: JobStatus
  createdAt: string
}): Promise<void> => {
  const { jobId, channels, status, createdAt } = params

  const putRequests = channels.map((c) => ({
    PutRequest: {
      Item: {
        jobId,
        channelId: c.channelId,
        channelTitle: c.channelTitle,
        thumbnailUrl: c.thumbnailUrl,
        status, // status del job-item (por ahora reusamos JobStatus)
        createdAt
      }
    }
  }))

  for (const batch of chunk(putRequests, 25)) {
    await ddbDocClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [JOBITEMS_TABLE_NAME]: batch
        }
      })
    )
  }
}

// --- FUNCIONES PARA EL WORKER ---

/**
 * Lista jobs filtrando por estado (PENDING o PAUSED_QUOTA) usando GSI2.
 */
export const listJobsByStatus = async (params: {
  status: 'PENDING' | 'PAUSED_QUOTA'
  limit: number
}): Promise<JobItem[]> => {
  const res = await ddbDocClient.send(
    new QueryCommand({
      TableName: JOBS_TABLE_NAME,
      IndexName: 'gsi2_status_createdAt',
      KeyConditionExpression: '#st = :s',
      ExpressionAttributeNames: {
        '#st': 'status'
      },
      ExpressionAttributeValues: {
        ':s': params.status
      },
      Limit: params.limit,
      ScanIndexForward: false
    })
  )

  return (res.Items ?? []) as JobItem[]
}

/**
 * Intenta "reclamar" un job para procesarlo.
 */
export const claimJob = async (params: {
  jobId: string
  expectedStatus: 'PENDING' | 'PAUSED_QUOTA'
  nowIso: string
}): Promise<{ claimed: true } | { claimed: false }> => {
  try {
    await ddbDocClient.send(
      new UpdateCommand({
        TableName: JOBS_TABLE_NAME,
        Key: { jobId: params.jobId },
        UpdateExpression: 'SET #st = :running, startedAt = :now',
        ConditionExpression: '#st = :expected AND runAfter <= :now',
        ExpressionAttributeNames: {
          '#st': 'status'
        },
        ExpressionAttributeValues: {
          ':running': 'RUNNING',
          ':expected': params.expectedStatus,
          ':now': params.nowIso
        }
      })
    )
    return { claimed: true }
  } catch {
    return { claimed: false }
  }
}
