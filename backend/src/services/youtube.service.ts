// backend/src/services/youtube.service.ts
//
// CONCEPTO: Wrapper sobre YouTube Data API v3.
// Este servicio centraliza la comunicación con Google.
// Implementa Throttling (límite de 50) para proteger la cuota y el timeout de Lambda.

import { z } from 'zod'
import type { Channel, ExportResponse, ImportResponse } from '../schemas/subscription.schema.js'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

// ── SCHEMAS DE VALIDACIÓN ──────────────────────────────────────────────────
// Validamos lo que responde Google para evitar errores de "undefined"
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

  /**
   * EXPORTAR: Lista todas las suscripciones del usuario.
   * Coste: 1 unidad por página de 50.
   */
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
        const err = await response.json();
        console.error("[YouTubeService] Error en exportación:", JSON.stringify(err));
        throw new Error(`YouTube API error: ${response.statusText}`)
      }

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

  /**
   * IMPORTAR: Suscribe al usuario a una lista de canales.
   * Coste: 50 unidades por canal.
   * Límite: 50 canales por ejecución para evitar Timeout y agotar cuota.
   */
  async importSubscriptions(channels: Channel[]): Promise<ImportResponse> {
    // LIMITACIÓN: Solo procesamos los primeros 50 canales
    const LIMIT = 50;
    const channelsToProcess = channels.slice(0, LIMIT);
    
    let imported = 0;
    let failed = 0;

    console.log(`[YouTubeService] Iniciando importación de ${channelsToProcess.length} canales (Límite aplicado: ${LIMIT})`);

    for (const channel of channelsToProcess) {
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
          imported++;
        } else {
          const errorData = await response.json();
          // LOG CRÍTICO para CloudWatch: Aquí veremos si es Quota, Duplicado o Permisos
          console.error(`[YouTubeService] Fallo al suscribir a ${channel.channelTitle} (${channel.channelId}):`, JSON.stringify(errorData));
          failed++;
        }
      } catch (err) {
        console.error(`[YouTubeService] Error de red en canal ${channel.channelId}:`, err);
        failed++;
      }
    }

    console.log(`[YouTubeService] Ritual completado. Éxitos: ${imported}, Fallos: ${failed}`);

    return { 
      imported, 
      failed, 
      total: channelsToProcess.length 
    };
  }
}

export const createYouTubeService = (accessToken: string): YouTubeService =>
  new YouTubeService(accessToken)
