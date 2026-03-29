// vite.config.ts — configuración del bundler para la extensión
//
// CONCEPTO: Vite reemplaza el proceso manual de compilación.
// En tu flujo anterior con Lambda usabas Make + zip para empaquetar.
// Aquí Vite hace el equivalente: toma TypeScript, lo compila,
// resuelve imports, y genera los archivos finales en dist/.
//
// @crxjs/vite-plugin es un plugin específico para Chrome Extensions.
// Lee el manifest.json y sabe exactamente qué archivos compilar:
// el service worker, el popup, los content scripts.
// Sin él tendrías que configurar cada entry point manualmente.
//
// PARIDAD CON BACKEND:
// Backend  → tsx watch   (hot reload en Node)
// Extension → vite --watch (hot reload en navegador vía CRX HMR)

import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import { resolve } from 'path'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    // CONCEPTO: este plugin lee manifest.json y genera automáticamente
    // la estructura correcta de una Chrome Extension en dist/.
    // Gestiona el service worker, los permisos, y el hot reload
    // durante el desarrollo.
    crx({ manifest })
  ],

  resolve: {
    alias: {
      // Alias para imports más limpios dentro de la extensión
      // import { apiClient } from '@lib/api-client'
      // en lugar de '../../../lib/api-client'
      '@lib': resolve(__dirname, 'src/lib')
    }
  },

  build: {
    // CONCEPTO: outDir es donde Vite deposita los archivos compilados.
    // Este directorio es lo que cargas en chrome://extensions
    // en modo desarrollador. Es el equivalente al zip que
    // subías a Lambda, pero para el navegador.
    outDir: 'dist',
    emptyOutDir: true
  }
})
