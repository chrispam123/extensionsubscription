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

// extension/src/background/index.ts
interface AuthData {
  sessionToken: string;
  expiresIn: number;
}


chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Solo actuamos cuando la pestaña termina de cargar
  if (changeInfo.status !== 'complete' || !tab.url) return;

  console.log("Inspeccionando URL:", tab.url);

  // Detectamos nuestra API de AWS
  if (tab.url.includes('execute-api.eu-west-1.amazonaws.com') && tab.url.includes('/auth/callback')) {
    console.log("Protocolo de callback detectado. Extrayendo esencia...");

    try {
      // Ejecutamos el script para obtener el JSON del body
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // Intentamos obtener el texto del body, limpiando posibles etiquetas <pre> 
          // que Chrome añade automáticamente al mostrar JSON
          return document.body.innerText;
        },
      });

      if (!results || !results[0] || !results[0].result) {
        throw new Error("No se pudo leer el contenido de la pestaña");
      }

      const rawResult = results[0].result;
      console.log("Datos en bruto capturados:", rawResult);

      const authData = JSON.parse(rawResult) as AuthData;

      if (authData.sessionToken) {
        // Guardamos en el almacenamiento local
        await chrome.storage.local.set({ 
          sessionToken: authData.sessionToken 
        });
        
        console.log("Vínculo establecido. Token guardado.");

        // Cerramos la pestaña
        await chrome.tabs.remove(tabId);

        // Enviamos mensaje al popup (si está abierto)
        chrome.runtime.sendMessage({ type: 'AUTH_COMPLETE' }).catch(() => {
          // Es normal que falle si el popup está cerrado, lo ignoramos
          console.log("Popup cerrado, mensaje no enviado pero token guardado.");
        });
      }
    } catch (error) {
      console.error("Fallo en el ritual de captura:", error);
    }
  }
});
