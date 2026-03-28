// auth.schema.ts — contratos de datos para el flujo OAuth2
//
// CONCEPTO: el flujo OAuth2 tiene dos endpoints críticos.
// Cada uno tiene un contrato de datos estricto.
// Validar los parámetros de entrada protege contra:
// - Ataques CSRF (validando el parámetro state)
// - Errores de integración con Google (code ausente o malformado)

import { z } from 'zod'

// Lo que Google devuelve en el callback
export const OAuthCallbackSchema = z.object({
  // Código temporal que intercambiamos por tokens
  code: z.string().min(1),
  // Token anti-CSRF que generamos nosotros y Google devuelve intacto
  state: z.string().min(1)
})

// Respuesta del endpoint /auth/google
export const AuthUrlResponseSchema = z.object({
  // URL a la que la extensión redirige al usuario
  authUrl: z.string().url()
})

// Respuesta del callback exitoso
export const AuthCallbackResponseSchema = z.object({
  // Session token que la extensión guarda y usa en cada request
  sessionToken: z.string().min(1),
  expiresIn: z.number().int().positive()
})

export type OAuthCallback = z.infer<typeof OAuthCallbackSchema>
export type AuthUrlResponse = z.infer<typeof AuthUrlResponseSchema>
export type AuthCallbackResponse = z.infer<typeof AuthCallbackResponseSchema>

