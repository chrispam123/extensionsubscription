// subscription.schema.ts — contratos de datos con Zod
//
// CONCEPTO: Zod valida en runtime lo que TypeScript valida en compilación.
// TypeScript desaparece en producción (se compila a JS).
// Zod sigue ahí en producción, validando cada request entrante.
// Si alguien manda un JSON malformado a tu Lambda, Zod lo rechaza
// antes de que llegue a tu lógica de negocio.
//
// REEMPLAZA: el pattern de validación manual (if (!body.channels) return 400)
// que es frágil, verboso y fácil de olvidar en algún endpoint.

import { z } from 'zod'

// Schema de un canal individual de YouTube
export const ChannelSchema = z.object({
  channelId: z.string().min(1),
  channelTitle: z.string().min(1),
  // URL del thumbnail — opcional porque algunos canales no tienen
  thumbnailUrl: z.string().url().optional()
})

// Schema para exportar — lo que devuelve GET /subscriptions
export const ExportResponseSchema = z.object({
  exportedAt: z.string().datetime(),
  totalChannels: z.number().int().nonnegative(),
  channels: z.array(ChannelSchema)
})

// Schema para importar — lo que recibe POST /subscriptions/import
export const ImportRequestSchema = z.object({
  channels: z.array(ChannelSchema).min(1, {
    message: 'Debes enviar al menos un canal para importar'
  })
})

// Schema de respuesta del import
export const ImportResponseSchema = z.object({
  imported: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative()
})

// Tipos TypeScript inferidos desde los schemas
// CONCEPTO: inferimos los tipos desde Zod en lugar de definirlos
// por separado. Una sola fuente de verdad: el schema ES el tipo.
// Si cambias el schema, el tipo cambia automáticamente.
export type Channel = z.infer<typeof ChannelSchema>
export type ExportResponse = z.infer<typeof ExportResponseSchema>
export type ImportRequest = z.infer<typeof ImportRequestSchema>
export type ImportResponse = z.infer<typeof ImportResponseSchema>

