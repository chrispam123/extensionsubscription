// App.tsx — UI principal del popup "The Nocturne"
//
// FLUJO DE PANTALLAS:
// 1. Initiation    → autenticación con Google
// 2. Home/Ritual   → selección exportar o importar (imagen catedral de fondo)
// 3. Export result → resultado exitoso de exportación
// 4. Import progress → estado mientras se importa (imagen catedral de fondo)
//
// DESIGN SYSTEM: The Modern Nocturne (ver DESIGN.md)
// Fuentes: MedievalSharp (H1), Newsreader italic (headlines),
//          Space Grotesk (labels/botones), Inter (body/meta)
// Acento:  #8B0000 — sangre coagulada, solo para estados de resultado
// Regla:   0px border-radius absoluto. Sin excepciones.

import { useState, useEffect, useRef } from 'react'
import { apiClient } from '../lib/api-client.js'
// ─── IMAGEN DE FONDO ────────────────────────────────────────────────────────
// Coloca tu imagen en: extension/src/assets/cathedral.png
// Si cambias el nombre del archivo, actualiza este import.
import cathedralImg from '../assets/cathedral.png'
// ────────────────────────────────────────────────────────────────────────────

type Screen = 'initiation' | 'home' | 'export-result' | 'import-progress'

interface ExportResult {
  totalChannels: number
  exportedAt: string
  filename: string
}

interface ImportState {
  granted: number
  rejected: number
  filename: string
  total: number
}

// ── ESTILOS GLOBALES inyectados una vez al montar el componente
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=MedievalSharp&family=Newsreader:ital,wght@0,400;0,600;1,400;1,600&family=Space+Grotesk:wght@300;400;500&family=Inter:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    width: 400px;
    min-height: 600px;
    background: #0e0e0e;
    overflow-x: hidden;
  }

  #root {
    width: 400px;
    min-height: 600px;
  }

  /* Animación del contador de import */
  @keyframes countUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Pulso del hourglass */
  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50%       { opacity: 1; }
  }
`

export default function App():React.ReactElement {
  const [screen, setScreen] = useState<Screen>('initiation')
  const [exportResult, setExportResult] = useState<ExportResult | null>(null)
  const [importState, setImportState] = useState<ImportState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const styleInjected = useRef(false)

  // Inyecta estilos globales una sola vez
  useEffect(() => {
    if (styleInjected.current) return
    const style = document.createElement('style')
    style.textContent = GLOBAL_STYLES
    document.head.appendChild(style)
    styleInjected.current = true
  }, [])

  // Verifica sesión activa al abrir el popup
  useEffect(() => {
    chrome.storage.local.get('sessionToken').then(({ sessionToken }) => {
      if (sessionToken) setScreen('home')
    }).catch(() => null)
  }, [])

  const handleAuthenticate = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    const result = await apiClient.getAuthUrl()
    if (result.error ?? !result.data) {
      setError('Authentication protocol failed.')
      setIsLoading(false)
      return
    }
    await chrome.tabs.create({ url: result.data.authUrl })
    setIsLoading(false)
    setScreen('home')
  }

  const handleExport = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    const result = await apiClient.exportSubscriptions()
    if (result.error ?? !result.data) {
      setError('Export sequence failed.')
      setIsLoading(false)
      return
    }
    const filename = `nocturne_export_${new Date().toISOString().split('T')[0]}.json`
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    setExportResult({
      totalChannels: result.data.totalChannels,
      exportedAt: result.data.exportedAt,
      filename
    })
    setIsLoading(false)
    setScreen('export-result')
  }

  const handleImport = async (file: File): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setImportState({ granted: 0, rejected: 0, filename: file.name, total: 0 })
    setScreen('import-progress')
    const text = await file.text()
    const parsed = JSON.parse(text) as {
      channels: Array<{ channelId: string; channelTitle: string; thumbnailUrl?: string }>
    }
    const result = await apiClient.importSubscriptions(parsed.channels)
    if (result.error ?? !result.data) {
      setError('Import sequence failed.')
      setIsLoading(false)
      return
    }
    setImportState({
      granted: result.data.imported,
      rejected: result.data.failed,
      filename: file.name,
      total: result.data.total
    })
    setIsLoading(false)
  }

  const handleTerminateSession = async (): Promise<void> => {
    await apiClient.clearSession()
    setScreen('initiation')
    setExportResult(null)
    setImportState(null)
  }

  return (
    <div style={{ width: 400, minHeight: 600, background: '#0e0e0e', display: 'flex', flexDirection: 'column' }}>
      {screen === 'initiation' && (
        <ScreenInitiation
          isLoading={isLoading}
          error={error}
          onAuthenticate={() => { void handleAuthenticate() }}
        />
      )}
      {screen === 'home' && (
        <ScreenHome
          cathedralImg={cathedralImg}
          isLoading={isLoading}
          error={error}
          onExport={() => { void handleExport() }}
          onImport={(file) => { void handleImport(file) }}
          onTerminate={() => { void handleTerminateSession() }}
        />
      )}
      {screen === 'export-result' && exportResult && (
        <ScreenExportResult
          result={exportResult}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'import-progress' && importState && (
        <ScreenImportProgress
          state={importState}
          isLoading={isLoading}
          cathedralImg={cathedralImg}
          onFinish={() => setScreen('home')}
          onAbort={() => setScreen('home')}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// PANTALLA 1 — INITIATION
// ══════════════════════════════════════════════════════════════════
function ScreenInitiation({ isLoading, error, onAuthenticate }: {
  isLoading: boolean
  error: string | null
  onAuthenticate: () => void
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 600, background: 'radial-gradient(ellipse at 50% 30%, #131313 50%, #0e0e0e 100%)' }}>

      {/* Cuerpo principal */}
      <div style={{ flex: 1, padding: '3rem 2.75rem 0 2.75rem', display: 'flex', flexDirection: 'column' }}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.2rem' }}>
          <div style={{ width: 40, height: 1, background: '#fff', opacity: 0.25 }} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, letterSpacing: '0.22em', color: '#474747', textTransform: 'uppercase' }}>
            Initiation
          </span>
        </div>

        {/* Headline MedievalSharp */}
        <h1 style={{ fontFamily: "'MedievalSharp', serif", fontSize: 52, color: '#fff', lineHeight: 0.95, letterSpacing: '-0.01em', marginBottom: '3rem' }}>
          THE<br />NOCTURNE
        </h1>

        {/* Copy Newsreader italic */}
        <p style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 15, color: '#5a5a5a', lineHeight: 1.75, flex: 1 }}>
          Surrender to the digital void.<br />
          Your journey into the atmospheric<br />
          abyss begins with a single connection.
        </p>

        {/* Security badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', marginBottom: 0, paddingBottom: '2rem' }}>
          <ShieldIcon size={20} color="#8B0000" />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, letterSpacing: '0.18em', color: '#474747', textTransform: 'uppercase' }}>
            Vault Security Protocol Active
          </span>
        </div>
      </div>

      {/* Footer con botón */}
      <div style={{ padding: '0 2.75rem 1.5rem' }}>
        <button
          onClick={onAuthenticate}
          disabled={isLoading}
          style={{
            width: '100%', background: isLoading ? '#353534' : '#fff',
            color: isLoading ? '#fff' : '#0e0e0e', border: 'none', borderRadius: 0,
            padding: '1.1rem 1.2rem', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 11,
            letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>G</span>
            <span>{isLoading ? 'Initiating Protocol...' : 'Conectar con Google'}</span>
          </div>
          <span style={{ opacity: 0.7, fontSize: 16 }}>→</span>
        </button>

        {error && (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#8B0000', marginTop: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {error}
          </p>
        )}
      </div>

      {/* Legal */}
      <div style={{ margin: '0 2.75rem 2rem', borderLeft: '2px solid rgba(255,255,255,0.08)', paddingLeft: '1rem' }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: '0.08em', color: '#333', textTransform: 'uppercase', lineHeight: 1.7, marginBottom: '0.8rem' }}>
          Al proceder, reconoces los términos del pacto<br />digital y nuestra política de sombras.
        </p>
        <div style={{ display: 'flex', gap: '1.2rem' }}>
          {['Privacidad', 'Términos'].map(t => (
            <span key={t} style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: '0.1em', color: '#474747', textTransform: 'uppercase', cursor: 'pointer' }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// PANTALLA 2 — HOME / RITUAL
// ══════════════════════════════════════════════════════════════════
function ScreenHome({ cathedralImg, isLoading, error, onExport, onImport, onTerminate }: {
  cathedralImg: string
  isLoading: boolean
  error: string | null
  onExport: () => void
  onImport: (file: File) => void
  onTerminate: () => void
}): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 600, position: 'relative', background: '#0e0e0e' }}>

      {/* ── IMAGEN DE FONDO CATEDRAL ─────────────────────────────────────
          Ajusta opacity (0.12-0.20) según contraste deseado.
          objectPosition controla qué parte de la imagen es visible.
          ─────────────────────────────────────────────────────────────── */}
      <img
        src={cathedralImg}
        alt=""
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center top',
          opacity: 0.15, pointerEvents: 'none', userSelect: 'none'
        }}
      />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#474747', cursor: 'pointer' }}>≡</span>
        <span style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 16, color: '#fff', letterSpacing: '0.02em' }}>The Nocturne</span>
        <div style={{ width: 18 }} />
      </div>

      {/* Cuerpo */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, padding: '2.5rem 2rem 0', display: 'flex', flexDirection: 'column' }}>

        {/* Corner ornament — esquina superior izquierda */}
        <div style={{ position: 'absolute', top: '2rem', left: '1.5rem', width: 40, height: 40, borderTop: '1px solid rgba(255,255,255,0.2)', borderLeft: '1px solid rgba(255,255,255,0.2)' }} />

        <h2 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 36, color: '#fff', lineHeight: 1.15, textAlign: 'center', marginBottom: '0.6rem', marginTop: '1rem' }}>
          Seleccione su protocolo<br />de transmisión
        </h2>

        {/* Separador */}
        <div style={{ width: 60, height: 1, background: 'rgba(255,255,255,0.15)', margin: '1rem auto' }} />

        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, letterSpacing: '0.18em', color: '#474747', textTransform: 'uppercase', textAlign: 'center', marginBottom: '2.5rem' }}>
          Digital Relic V1.0 // Subscription Engine
        </p>

        {/* Botones de acción */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: 'auto' }}>
          <button
            onClick={onExport}
            disabled={isLoading}
            style={{
              width: '100%', background: '#fff', color: '#0e0e0e',
              border: 'none', borderRadius: 0, padding: '1.1rem 1.4rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500
            }}
          >
            <span>Exportar Suscripciones</span>
            <span style={{ fontSize: 16, opacity: 0.7 }}>→</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            style={{
              width: '100%', background: 'transparent', color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 0,
              padding: '1.1rem 1.4rem', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 11,
              letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500
            }}
          >
            <span>Importar Suscripciones</span>
            <span style={{ fontSize: 14, opacity: 0.7 }}>↑</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) onImport(file)
            }}
          />
        </div>

        {error && (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#8B0000', marginTop: 12, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center' }}>
            {error}
          </p>
        )}

        {/* Quote atmosférico */}
        <div style={{ textAlign: 'center', padding: '2rem 0 1.5rem' }}>
          <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 auto 1rem' }} />
          <ShieldIcon size={16} color="rgba(255,255,255,0.15)" />
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, letterSpacing: '0.16em', color: '#333', textTransform: 'uppercase', marginTop: '0.8rem', lineHeight: 1.7 }}>
            The essence of your connections,<br />preserved in the obsidian vault.
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <BottomBar active="ritual" onTerminate={onTerminate} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// PANTALLA 3 — EXPORT RESULT
// ══════════════════════════════════════════════════════════════════
function ScreenExportResult({ result, onBack }: {
  result: ExportResult
  onBack: () => void
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 600, background: '#0e0e0e' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span onClick={onBack} style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#474747', cursor: 'pointer' }}>✕</span>
        <span style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 15, color: '#fff' }}>The Nocturne</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#474747' }}>+</span>
      </div>

      <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Shield icon con borde rojo */}
        <div style={{ width: 80, height: 80, border: '1px solid #8B0000', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.8rem', position: 'relative' }}>
          <span style={{ position: 'absolute', top: -8, left: -8, color: '#8B0000', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>+</span>
          <span style={{ position: 'absolute', bottom: -8, right: -8, color: '#8B0000', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>+</span>
          <ShieldIcon size={36} color="#8B0000" />
        </div>

        {/* Headline en rojo */}
        <h2 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 28, color: '#8B0000', textAlign: 'center', lineHeight: 1.2, marginBottom: '0.8rem' }}>
          Exportados {result.totalChannels}<br />canales correctamente
        </h2>

        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, letterSpacing: '0.18em', color: '#474747', textTransform: 'uppercase', textAlign: 'center', marginBottom: '2.5rem' }}>
          El archivo de suscripciones ha sido procesado
        </p>

        {/* Meta: destino */}
        <div style={{ width: '100%', borderLeft: '2px solid rgba(255,255,255,0.12)', padding: '1rem 1.2rem', background: '#1c1b1b', marginBottom: '0.9rem' }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, letterSpacing: '0.16em', color: '#474747', textTransform: 'uppercase', marginBottom: 6 }}>
            Destino de Archivo
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#fff' }}>
            /Downloads/{result.filename}
          </div>
        </div>

        {/* Meta: grid tamaño / formato */}
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '2rem' }}>
          {[['Tamaño', '— KB'], ['Formato', 'UTF-8 JSON']].map(([label, val]) => (
            <div key={label} style={{ background: '#1c1b1b', padding: '0.9rem 1rem' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, letterSpacing: '0.16em', color: '#474747', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#fff' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 2rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <NocturneButton onClick={() => null} label="Abrir Carpeta" variant="primary" />
        <NocturneButton onClick={onBack} label="Volver al Inicio" variant="ghost" />
      </div>

      <BottomBar active="ritual" onTerminate={() => null} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// PANTALLA 4 — IMPORT PROGRESS
// ══════════════════════════════════════════════════════════════════
function ScreenImportProgress({ state, isLoading, cathedralImg, onFinish, onAbort }: {
  state: ImportState
  isLoading: boolean
  cathedralImg: string
  onFinish: () => void
  onAbort: () => void
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 600, position: 'relative', background: '#0e0e0e' }}>

      {/* ── IMAGEN DE FONDO CATEDRAL ─────────────────────────────────────
          Misma imagen que pantalla 2. Ajusta opacity si necesitas
          más o menos contraste con el contenido encima.
          ─────────────────────────────────────────────────────────────── */}
      <img
        src={cathedralImg}
        alt=""
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center top',
          opacity: 0.18, pointerEvents: 'none', userSelect: 'none'
        }}
      />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span onClick={onAbort} style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#474747', cursor: 'pointer' }}>✕</span>
        <span style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 15, color: '#fff' }}>The Nocturne</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#474747' }}>+</span>
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column' }}>

        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, letterSpacing: '0.2em', color: '#474747', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
          Protocolo de Alma
        </div>
        <h2 style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 32, color: '#fff', lineHeight: 1.1, marginBottom: '2.5rem' }}>
          Importando<br />Transmisiones
        </h2>

        {/* Hourglass con cross motifs */}
        <div style={{ width: 80, height: 80, border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', position: 'relative' }}>
          <span style={{ position: 'absolute', top: -8, left: -8, color: 'rgba(255,255,255,0.25)', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>+</span>
          <span style={{ position: 'absolute', bottom: -8, right: -8, color: 'rgba(255,255,255,0.25)', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>+</span>
          <span style={{
            fontSize: 28, color: '#fff', opacity: isLoading ? undefined : 0.9,
            animation: isLoading ? 'pulse 1.5s ease-in-out infinite' : 'none',
            fontFamily: 'Inter, sans-serif'
          }}>
            ⧗
          </span>
        </div>

        {/* Contador */}
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, letterSpacing: '0.18em', color: '#474747', textTransform: 'uppercase', textAlign: 'center', marginBottom: '0.4rem' }}>
          Estado del Vínculo
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'center', marginBottom: '0.4rem', animation: 'countUp 0.3s ease-out' }}>
          <span style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 48, color: '#c8a89a', lineHeight: 1 }}>
            {state.granted}
          </span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, letterSpacing: '0.16em', color: '#474747', textTransform: 'uppercase' }}>
            Concedidos
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'center', marginBottom: '2rem' }}>
          <span style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 24, color: '#2d6a2d' }}>
            {state.rejected}
          </span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, letterSpacing: '0.16em', color: '#474747', textTransform: 'uppercase' }}>
            Rechazados
          </span>
        </div>

        {/* Meta fuente */}
        <div style={{ borderLeft: '2px solid rgba(255,255,255,0.12)', padding: '1rem 1.2rem', background: 'rgba(28,27,27,0.85)', marginBottom: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, letterSpacing: '0.16em', color: '#474747', textTransform: 'uppercase' }}>
              Fuente de Datos
            </span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#fff' }}>
              {state.filename}
            </span>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />
          <p style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 12, color: '#474747', lineHeight: 1.65 }}>
            {isLoading
              ? 'Extrayendo hilos de comunicación de la red profana. La integración está casi completa.'
              : 'Transmisión completada. El vínculo ha sido establecido.'
            }
          </p>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '0 2rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <NocturneButton
          onClick={onFinish}
          label={isLoading ? 'Procesando...' : 'Finalizar Integración'}
          variant="primary"
          disabled={isLoading}
        />
        <NocturneButton onClick={onAbort} label="Abortar Secuencia" variant="ghost" />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <BottomBar active="ritual" onTerminate={() => null} />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// COMPONENTES COMPARTIDOS
// ══════════════════════════════════════════════════════════════════

function ShieldIcon({ size, color }: { size: number; color: string }): React.ReactElement {
  return (
    <svg width={size} height={Math.round(size * 1.1)} viewBox="0 0 20 22" fill="none">
      <path d="M10 1L19 5V10C19 15 14.5 19.5 10 21C5.5 19.5 1 15 1 10V5L10 1Z" fill={color} />
    </svg>
  )
}

function NocturneButton({ onClick, label, variant, disabled }: {
  onClick: () => void
  label: string
  variant: 'primary' | 'ghost'
  disabled?: boolean
}): React.ReactElement {
  const base: React.CSSProperties = {
    width: '100%', border: 'none', borderRadius: 0,
    padding: '1rem', cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: "'Space Grotesk', sans-serif", fontSize: 11,
    letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
    opacity: disabled ? 0.5 : 1, transition: 'background 0.15s, color 0.15s'
  }
  const styles: React.CSSProperties = variant === 'primary'
    ? { ...base, background: '#fff', color: '#0e0e0e' }
    : { ...base, background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }

  return <button onClick={onClick} disabled={disabled} style={styles}>{label}</button>
}

function BottomBar({ active, onTerminate }: {
  active: 'history' | 'ritual' | 'config'
  onTerminate: () => void
}): React.ReactElement {
  const items = [
    { key: 'history', label: 'History', icon: '↺' },
    { key: 'ritual',  label: 'Ritual',  icon: '🛡' },
    { key: 'config',  label: 'Config',  icon: '⚙' },
  ] as const

  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1rem 0 1.2rem' }}>
      {items.map(item => (
        <div
          key={item.key}
          onClick={item.key === 'config' ? onTerminate : undefined}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
        >
          <span style={{ fontSize: 16, color: item.key === active ? '#fff' : '#474747' }}>
            {item.icon}
          </span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#474747' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
