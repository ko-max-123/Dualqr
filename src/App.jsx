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
    overview:
      '2つのURLから作ったQRコードをセル単位で重ね、読み取り条件によって異なるURLが現れる仕組みを試せます。',
    steps: [
      {
        title: '2つのURLを入力',
        description: 'URL 1 と URL 2 に、それぞれ異なるリンクを入力します。',
      },
      {
        title: 'QR Versionを選択',
        description: '長いURLほど大きなVersionが必要です。迷ったらv4から試してください。',
      },
      {
        title: '生成して読み取る',
        description: 'QRを生成し、スマホなどで角度や距離を変えながら読み取ります。',
      },
    ],
  },
  {
    id: 'color',
    label: 'Color QR',
    title: 'カラーQR',
    component: ColorQRCodeGenerator,
    aliases: ['colorqr', 'color-qr', 'rgb'],
    overview:
      'Red・Green・Blueの各色チャンネルに別々のQRコードを割り当て、3つのURLを1枚に重ねる仕組みを試せます。',
    steps: [
      {
        title: '3つのURLを入力',
        description: 'Red・Green・Blueの各入力欄に、重ねたいリンクを入力します。',
      },
      {
        title: 'QR Versionを選択',
        description: 'すべてのURLが収まるVersionを選び、カラーQRを生成します。',
      },
      {
        title: '専用リーダーで確認',
        description: 'Color Readerタブを開き、生成したQRをカメラまたは画像から読み取ります。',
      },
    ],
  },
  {
    id: 'reader',
    label: 'Color Reader',
    title: 'カラーQRリーダー',
    component: ColorQRCodeReader,
    aliases: ['read', 'scanner', 'color-reader', 'colorqr-reader', 'rgb-reader'],
    overview:
      'カラーQRをRGBチャンネルに分離し、それぞれに重ねられたURLをカメラまたは画像から読み取ります。',
    steps: [
      {
        title: '読み取り方法を選ぶ',
        description: 'カメラ、撮影した写真、保存済み画像のいずれかを使います。',
      },
      {
        title: 'カラーQRを正面に置く',
        description: 'QR全体が明るく鮮明に写るように、距離や角度を調整します。',
      },
      {
        title: 'チャンネル別の結果を見る',
        description: 'Red・Green・Blueごとの画像と、読み取れたURLを確認します。',
      },
    ],
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
          <span className="eyebrow">Experimental Demo</span>
          <h1>QR Tools</h1>
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

      <section
        className={`demo-guide ${activeMode}-guide`}
        aria-labelledby="demo-overview-title"
      >
        <div className="demo-overview">
          <span className="section-label">概要</span>
          <h2 id="demo-overview-title">1枚のQRコードに複数のURLを重ねる実験デモ</h2>
          <p className="demo-lead">
            QR Toolsは、規格外の方法でQRコードを多重化し、その生成と読み取りをブラウザ上で試せる概念実証です。
            上のタブからデモを切り替えられます。
          </p>

          <div className="active-mode-summary">
            <strong>{activeConfig.title}</strong>
            <span>{activeConfig.overview}</span>
          </div>

          <div className="demo-notice" role="note">
            <strong>実験用デモ</strong>
            <span>
              読み取り結果は端末・アプリ・表示条件によって変わります。実運用には使用しないでください。
            </span>
          </div>
        </div>

        <div className="usage-guide">
          <span className="section-label">使い方</span>
          <h2>「{activeConfig.title}」を試す</h2>
          <ol className="usage-steps">
            {activeConfig.steps.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <span>{step.description}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ActiveComponent />
    </main>
  )
}

export default App
