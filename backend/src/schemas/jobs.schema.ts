import { z } from 'zod'
import { ChannelSchema } from './subscription.schema.js'

export const JobTypeSchema = z.enum(['IMPORT_SUBSCRIPTIONS'])

export const CreateJobRequestSchema = z.object({
  jobType: JobTypeSchema.default('IMPORT_SUBSCRIPTIONS'),
  channels: z.array(ChannelSchema).min(1, { message: 'Debes enviar al menos un canal' })
})

export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>

export const CreateJobResponseSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(['PENDING', 'PAUSED_QUOTA']),
  createdAt: z.string().datetime(),
  runAfter: z.string().datetime(),
  unitsRequested: z.number().int().nonnegative(),
  channelsCount: z.number().int().nonnegative()
})

export type CreateJobResponse = z.infer<typeof CreateJobResponseSchema>
