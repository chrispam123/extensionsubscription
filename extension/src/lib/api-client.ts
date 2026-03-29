// api-client.ts — único punto de contacto con el backend
//
// CONCEPTO: este archivo es el equivalente de youtube.service.ts
// en el backend. Centraliza todas las llamadas HTTP al backend.
// Si la URL cambia, si añades headers de autenticación, si cambias
// el formato de errores — todo ocurre aquí, en un solo lugar.
//
// DIFERENCIA CON NODE:
// En el backend usas process.env para leer variables.
// En la extensión no existe process.env en runtime.
// Vite reemplaza import.meta.env.VITE_* en tiempo de compilación.
// Es una constante compilada, no una variable de entorno en runtime.
//
// BACKEND_URL en local:  http://localhost:3000
// BACKEND_URL en prod:   https://tu-api-gateway.amazonaws.com

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000'

// Tipo base para todas las respuestas del API
interface ApiResponse<T> {
  data?: T
  error?: string
}

// Cliente HTTP centralizado
const request = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    // Lee el session token guardado en chrome.storage.local
    // CONCEPTO: chrome.storage.local es el equivalente a una
    // variable en memoria, pero persiste aunque el service worker
    // se duerma. Es donde guardamos el token OAuth2 de la sesión.
    const { sessionToken } = await chrome.storage.local.get('sessionToken')

    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // Inyecta el token en cada request si existe
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken as string}` } : {}),
        ...options.headers
      }
    })

    if (!response.ok) {
      return { error: `HTTP ${response.status}: ${response.statusText}` }
    }

    const data = await response.json() as T
    return { data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Endpoints del backend ─────────────────────────────────────────

export const apiClient = {
  // Inicia el flujo OAuth2 — obtiene la URL de Google
  getAuthUrl: async (): Promise<ApiResponse<{ authUrl: string }>> =>
    request('/api/v1/auth/google'),

  // Exporta todas las suscripciones del usuario
  exportSubscriptions: async (): Promise<ApiResponse<{
    exportedAt: string
    totalChannels: number
    channels: Array<{ channelId: string; channelTitle: string; thumbnailUrl?: string }>
  }>> =>
    request('/api/v1/subscriptions'),

  // Importa una lista de suscripciones
  importSubscriptions: async (channels: Array<{
    channelId: string
    channelTitle: string
    thumbnailUrl?: string
  }>): Promise<ApiResponse<{
    imported: number
    failed: number
    total: number
  }>> =>
    request('/api/v1/subscriptions/import', {
      method: 'POST',
      body: JSON.stringify({ channels })
    }),

  // Guarda el session token en chrome.storage.local
  saveSessionToken: async (token: string): Promise<void> => {
    await chrome.storage.local.set({ sessionToken: token })
  },

  // Cierra sesión limpiando el storage
  clearSession: async (): Promise<void> => {
    await chrome.storage.local.remove('sessionToken')
  }
}
