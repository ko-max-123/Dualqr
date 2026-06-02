import { useEffect, useMemo, useState } from 'react'
import ColorQRCodeGenerator from './components/ColorQRCodeGenerator'
import ColorQRCodeReader from './components/ColorQRCodeReader'
import DualQRCodeGenerator from './components/DualQRCodeGenerator'
import './App.css'

const MODES = [
  {
    id: 'dual',
    label: '2URL QR',
    title: '2URL QR',
    component: DualQRCodeGenerator,
    aliases: ['2url', 'dualqr', 'dual-qr', 'generator'],
  },
  {
    id: 'color',
    label: 'Color QR',
    title: 'カラーQR',
    component: ColorQRCodeGenerator,
    aliases: ['colorqr', 'color-qr', 'rgb'],
  },
  {
    id: 'reader',
    label: 'Color Reader',
    title: 'カラーQRリーダー',
    component: ColorQRCodeReader,
    aliases: ['read', 'scanner', 'color-reader', 'colorqr-reader', 'rgb-reader'],
  },
]

function resolveMode() {
  const params = new URLSearchParams(window.location.search)
  const rawMode = (params.get('mode') || params.get('app') || 'dual').toLowerCase()

  return (
    MODES.find((mode) => mode.id === rawMode || mode.aliases.includes(rawMode))?.id ?? 'dual'
  )
}

function App() {
  const [activeMode, setActiveMode] = useState(resolveMode)

  useEffect(() => {
    const handlePopState = () => setActiveMode(resolveMode())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const activeConfig = useMemo(
    () => MODES.find((mode) => mode.id === activeMode) ?? MODES[0],
    [activeMode],
  )
  const ActiveComponent = activeConfig.component

  const openMode = (event, modeId) => {
    event.preventDefault()
    const url = new URL(window.location.href)
    url.searchParams.set('mode', modeId)
    window.history.pushState({}, '', url)
    setActiveMode(modeId)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">QR Tools</span>
          <h1>{activeConfig.title}</h1>
        </div>
        <nav className="mode-tabs" aria-label="QR tool mode">
          {MODES.map((mode) => (
            <a
              className={`mode-tab ${mode.id === activeMode ? 'active' : ''}`}
              href={`?mode=${mode.id}`}
              key={mode.id}
              onClick={(event) => openMode(event, mode.id)}
            >
              {mode.label}
            </a>
          ))}
        </nav>
      </header>

      <ActiveComponent />
    </main>
  )
}

export default App
