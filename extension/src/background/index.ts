// background/index.ts — service worker de la extensión
//
// CONCEPTO: en Manifest V3 el background script es un service worker.
// Se activa cuando recibe un mensaje o evento, procesa, y se duerme.
// NO puede mantener estado en variables globales entre activaciones.
// TODO el estado persiste en chrome.storage.local.
//
// RESPONSABILIDAD: gestionar el callback de OAuth2.
// Cuando Google redirige al usuario después de autenticarse,
// este service worker intercepta la URL, extrae el código,
// llama al backend para intercambiarlo por tokens, y los guarda.
import { apiClient } from '../lib/api-client.js'

// Tipamos los argumentos para cumplir con el modo estricto
chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url?.includes('localhost:3000/auth/callback')
  ) {
    const url = new URL(tab.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code || !state) return

    const result = await apiClient.getAuthUrl()

    if (result.data) {
      await chrome.storage.local.set({ sessionToken: code })
      await chrome.tabs.remove(tabId)
      await chrome.runtime.sendMessage({ type: 'AUTH_COMPLETE' })
    }
  }
})
// 1. Definimos una interfaz para los mensajes internos
interface ExtensionMessage {
  type: string;
  payload?: unknown;
}
// 2. Aplicamos los tipos en el listener
chrome.runtime.onMessage.addListener((
  message: ExtensionMessage, 
  _sender: chrome.runtime.MessageSender, 
  sendResponse: (response?: unknown) => void
) => {
  if (message.type === 'GET_AUTH_URL') {
    apiClient.getAuthUrl()
      .then(result => sendResponse(result))
      .catch((err: unknown) => sendResponse({
        error: err instanceof Error ? err.message : 'Unknown error'
      }))
    return true 
  }
})
