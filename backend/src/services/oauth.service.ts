
// oauth.service.ts — lógica del flujo OAuth2 con Google
//
// CONCEPTO: este servicio encapsula toda la complejidad de OAuth2.
// Las rutas no saben cómo funciona OAuth2, solo llaman a este servicio.
// Separación de responsabilidades: HTTP en rutas, lógica en servicios.

import { z } from 'zod'
import { createSecretsService } from './secrets.service.js'
import type { AuthCallbackResponse } from '../schemas/auth.schema.js'

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube'
].join(' ')

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// CONCEPTO: validamos la respuesta de Google con Zod.
// response.json() devuelve unknown en TypeScript estricto.
// No confiamos en datos externos sin validarlos primero.
// Si Google cambia su respuesta, Zod lo detecta inmediatamente.
const GoogleTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  token_type: z.string()
})

export class OAuthService {
  private secrets = createSecretsService()

  async buildAuthUrl(): Promise<string> {
    const clientId = await this.secrets.getSecret('GOOGLE_CLIENT_ID')
    const redirectUri = await this.secrets.getSecret('GOOGLE_REDIRECT_URI')

    const state = crypto.randomUUID()

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: YOUTUBE_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state
    })

    return `${GOOGLE_AUTH_URL}?${params.toString()}`
  }

  async exchangeCode(code: string): Promise<AuthCallbackResponse> {
    const clientId = await this.secrets.getSecret('GOOGLE_CLIENT_ID')
    const clientSecret = await this.secrets.getSecret('GOOGLE_CLIENT_SECRET')
    const redirectUri = await this.secrets.getSecret('GOOGLE_REDIRECT_URI')

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      throw new Error(`Google token exchange failed: ${response.statusText}`)
    }

    // Zod valida que la respuesta tiene la forma esperada
    const tokens = GoogleTokenResponseSchema.parse(await response.json())

    return {
      sessionToken: tokens.access_token,
      expiresIn: tokens.expires_in
    }
  }
}

export const createOAuthService = (): OAuthService => new OAuthService()

