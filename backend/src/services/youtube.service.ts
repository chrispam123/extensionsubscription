import { z } from 'zod'
import type { Channel, ExportResponse, ImportResponse } from '../schemas/subscription.schema.js'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

// --- SCHEMAS (Sin cambios, están perfectos) ---
const YouTubeSubscriptionItemSchema = z.object({
  snippet: z.object({
    title: z.string(),
    resourceId: z.object({ channelId: z.string() }),
    thumbnails: z.object({ default: z.object({ url: z.string() }).optional() }).optional()
  })
})

const YouTubeSubscriptionsResponseSchema = z.object({
  items: z.array(YouTubeSubscriptionItemSchema).default([]),
  nextPageToken: z.string().optional()
})

const YouTubeMyChannelResponseSchema = z.object({
  items: z.array(z.object({ id: z.string() })).default([])
})

export class YouTubeService {
  constructor(private readonly accessToken: string) {}

  async getMyChannelId(): Promise<string> {
    const params = new URLSearchParams({ part: 'id', mine: 'true', maxResults: '1' })
    const response = await fetch(`${YOUTUBE_API_BASE}/channels?${params.toString()}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    })
     // 1. Extraemos el JSON primero para tenerlo disponible
    const rawData = await response.json();
    // 2. Si hay error, mostramos el JSON real que envió Google
    if (!response.ok) {
       throw new Error(`YouTube API error (${response.status}): ${JSON.stringify(rawData)}`);
    }
    
    // 3. Si no hay error, validamos la estructura
    const data = YouTubeMyChannelResponseSchema.parse(rawData);
    const id = data.items[0]?.id;
    if (!id) throw new Error('Unable to determine authenticated user channel id');
    return id
  }

  async listSubscriptions(): Promise<ExportResponse> {
    const channels: Channel[] = []
    let pageToken: string | undefined

    do {
      const params = new URLSearchParams({
        part: 'snippet',
        mine: 'true',
        maxResults: '50',
        ...(pageToken ? { pageToken } : {})
      })

      const response = await fetch(`${YOUTUBE_API_BASE}/subscriptions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      })

      const rawData = await response.json() // Guardamos una vez para evitar agotar el stream
      if (!response.ok) throw new Error(`YouTube API error: ${JSON.stringify(rawData)}`)

      const data = YouTubeSubscriptionsResponseSchema.parse(rawData)

      for (const item of data.items) {
        channels.push({
          channelId: item.snippet.resourceId.channelId,
          channelTitle: item.snippet.title,
          thumbnailUrl: item.snippet.thumbnails?.default?.url
        })
      }
      pageToken = data.nextPageToken
    } while (pageToken)

    return { exportedAt: new Date().toISOString(), totalChannels: channels.length, channels }
  }

  async importSubscriptions(channels: Channel[]): Promise<ImportResponse> {
    const LIMIT = 50;
    const channelsToProcess = channels.slice(0, LIMIT);
    let imported = 0;
    let failed = 0;

    for (const channel of channelsToProcess) {
      try {
        const response = await fetch(`${YOUTUBE_API_BASE}/subscriptions?part=snippet`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            snippet: {
              resourceId: { kind: 'youtube#channel', channelId: channel.channelId }
            }
          })
        })

        if (response.ok) {
          imported++;
        } else {
          const errorData = await response.json();
          
          // CAMBIO APLICADO: Solo loguea en desarrollo y evita el warning del linter
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error(`[YouTubeService] Fallo en ${channel.channelTitle}:`, JSON.stringify(errorData))
          }
          
          failed++;
        }
      } catch { 
        // CAMBIO EXTRA: Usamos _err para que el linter no se queje de variable no usada
        failed++;
      }
    }

    return { imported, failed, total: channelsToProcess.length };
  }
} 

export const createYouTubeService = (accessToken: string): YouTubeService =>
  new YouTubeService(accessToken)
