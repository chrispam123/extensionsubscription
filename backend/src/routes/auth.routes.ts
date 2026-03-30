// auth.routes.ts — endpoints del flujo OAuth2
//
// CONCEPTO: estas rutas son el guardián de secretos en acción.
// La extensión nunca ve las credenciales de Google.
// Solo ve una URL de redirección y un session token.
// Todo lo sensible ocurre aquí, en el servidor.
//
// FLUJO:
// 1. Extensión llama GET /auth/google
// 2. Backend devuelve URL de Google con client_id y scopes
// 3. Usuario aprueba en Google
// 4. Google redirige a GET /auth/callback con código temporal
// 5. Backend intercambia código por tokens
// 6. Backend devuelve session token a la extensión

import type { FastifyInstance } from 'fastify'
import { createOAuthService } from '../services/oauth.service.js'
import type { OAuthCallback } from '../schemas/auth.schema.js'

export const authRoutes = async (app: FastifyInstance): Promise<void> => {

  // Inicia el flujo OAuth2 — devuelve la URL de Google
  app.get('/auth/google', async (_request, reply) => {
    const oauthService = createOAuthService()
    const authUrl = await oauthService.buildAuthUrl()

    return reply.send({ authUrl })
  })

  // Callback de Google — intercambia código por tokens
  app.get<{ Querystring: OAuthCallback }>(
    '/auth/callback',
    async (request, reply) => {
      const { code, state } = request.query

      // CONCEPTO: validación del state anti-CSRF.
      // En una implementación completa, verificaríamos que el state
      // coincide con el que generamos en buildAuthUrl() usando
      // una store temporal (Redis, DynamoDB, o memoria en Lambda).
      // Por ahora validamos que existe.
      if (!code || !state) {
        return reply.status(400).send({
          error: 'Missing code or state parameter'
        })
      }

      const oauthService = createOAuthService()
      const result = await oauthService.exchangeCode(code);
      const redirectUrl = `https://www.youtube.com/?auth_success=true#token=${result.sessionToken}`;
      app.log.info("[Auth] Ritual completado. Redirigiendo a YouTube...");
      return reply.redirect(redirectUrl);
    }
  )
}
