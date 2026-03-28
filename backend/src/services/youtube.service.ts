// youtube.service.ts — wrapper sobre YouTube Data API v3
//
// CONCEPTO: único punto del sistema que habla con YouTube.
// Centralizar el acceso facilita el mock en tests y la gestión de quota.

import { z } from 'zod'
import type { Channel, ExportResponse, ImportResponse } from '../schemas/subscription.schema.js'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

// CONCEPTO: schemas Zod para validar respuestas de YouTube API.
// La API externa puede cambiar o devolver datos inesperados.
// Validar en el boundary protege el resto del sistema.
const YouTubeSubscriptionItemSchema = z.object({
  snippet: z.object({
    title: z.string(),
    resourceId: z.object({
      channelId: z.string()
    }),
    thumbnails: z.object({
      default: z.object({
        url: z.string()
      }).optional()
    }).optional()
  })
})

const YouTubeSubscriptionsResponseSchema = z.object({
  items: z.array(YouTubeSubscriptionItemSchema).default([]),
  nextPageToken: z.string().optional()
})

export class YouTubeService {
  constructor(private readonly accessToken: string) {}

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

      const response = await fetch(
        `${YOUTUBE_API_BASE}/subscriptions?${params.toString()}`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      )

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.statusText}`)
      }

      // Zod valida la respuesta de YouTube antes de procesarla
      const data = YouTubeSubscriptionsResponseSchema.parse(await response.json())

      for (const item of data.items) {
        channels.push({
          channelId: item.snippet.resourceId.channelId,
          channelTitle: item.snippet.title,
          thumbnailUrl: item.snippet.thumbnails?.default?.url
        })
      }

      pageToken = data.nextPageToken
    } while (pageToken)

    return {
      exportedAt: new Date().toISOString(),
      totalChannels: channels.length,
      channels
    }
  }

  async importSubscriptions(channels: Channel[]): Promise<ImportResponse> {
    let imported = 0
    let failed = 0

    for (const channel of channels) {
      try {
        const response = await fetch(
          `${YOUTUBE_API_BASE}/subscriptions?part=snippet`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              snippet: {
                resourceId: {
                  kind: 'youtube#channel',
                  channelId: channel.channelId
                }
              }
            })
          }
        )

        if (response.ok) {
          imported++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }

    return { imported, failed, total: channels.length }
  }
}

export const createYouTubeService = (accessToken: string): YouTubeService =>
  new YouTubeService(accessToken)

