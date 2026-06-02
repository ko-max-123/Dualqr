import { useRef, useState } from 'react'
import jsQR from 'jsqr'
import {
  AUTO_QR_VERSION_OPTIONS,
  QR_VERSION_OPTIONS,
  QUIET_ZONE_MODULES,
  SPLIT_PATTERN_OPTIONS,
  moduleCountForVersion,
} from '../qrOptions'

const PREVIEW_MODULE_PIXELS = 8

function getSamplePoints(splitPattern) {
  if (splitPattern === 'horizontal') {
    return [
      { x: 0.5, y: 0.25 },
      { x: 0.5, y: 0.75 },
    ]
  }

  if (splitPattern === 'diagonal') {
    return [
      { x: 0.72, y: 0.28 },
      { x: 0.28, y: 0.72 },
    ]
  }

  if (splitPattern === 'checkerboard') {
    return [
      { x: 0.25, y: 0.25 },
      { x: 0.75, y: 0.25 },
    ]
  }

  return [
    { x: 0.25, y: 0.5 },
    { x: 0.75, y: 0.5 },
  ]
}

function sampleLuma(imageData, x, y, radius) {
  const { data, width, height } = imageData
  const startX = Math.max(0, Math.round(x) - radius)
  const endX = Math.min(width - 1, Math.round(x) + radius)
  const startY = Math.max(0, Math.round(y) - radius)
  const endY = Math.min(height - 1, Math.round(y) + radius)
  let total = 0
  let count = 0

  for (let yy = startY; yy <= endY; yy += 1) {
    for (let xx = startX; xx <= endX; xx += 1) {
      const index = (yy * width + xx) * 4
      total += data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114
      count += 1
    }
  }

  return count ? total / count : 255
}

function sampleDualModules(imageData, version, splitPattern) {
  const moduleCount = moduleCountForVersion(version)
  const { width, height } = imageData
  const qrSize = Math.min(width, height)
  const offsetX = (width - qrSize) / 2
  const offsetY = (height - qrSize) / 2
  const totalModules = moduleCount + QUIET_ZONE_MODULES * 2
  const modulePitch = qrSize / totalModules
  const radius = Math.max(1, Math.floor(modulePitch * 0.08))
  const points = getSamplePoints(splitPattern)
  const firstModules = []
  const secondModules = []

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      const firstX = offsetX + (QUIET_ZONE_MODULES + col + points[0].x) * modulePitch
      const firstY = offsetY + (QUIET_ZONE_MODULES + row + points[0].y) * modulePitch
      const secondX = offsetX + (QUIET_ZONE_MODULES + col + points[1].x) * modulePitch
      const secondY = offsetY + (QUIET_ZONE_MODULES + row + points[1].y) * modulePitch

      firstModules.push(sampleLuma(imageData, firstX, firstY, radius) < 128)
      secondModules.push(sampleLuma(imageData, secondX, secondY, radius) < 128)
    }
  }

  return { firstModules, secondModules, moduleCount }
}

function renderCleanQR(modules, moduleCount) {
  const quietZone = QUIET_ZONE_MODULES
  const size = (moduleCount + quietZone * 2) * PREVIEW_MODULE_PIXELS
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { alpha: false })
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#000000'

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (modules[row * moduleCount + col]) {
        const x = (quietZone + col) * PREVIEW_MODULE_PIXELS
        const y = (quietZone + row) * PREVIEW_MODULE_PIXELS
        ctx.fillRect(x, y, PREVIEW_MODULE_PIXELS, PREVIEW_MODULE_PIXELS)
      }
    }
  }

  const imageData = ctx.getImageData(0, 0, size, size)
  const code = jsQR(imageData.data, size, size, { inversionAttempts: 'dontInvert' })
  return {
    data: code?.data ?? null,
    preview: canvas.toDataURL('image/png'),
  }
}

function attemptDecode(imageData, version, splitPattern, invertUrls) {
  const { firstModules, secondModules, moduleCount } = sampleDualModules(
    imageData,
    version,
    splitPattern,
  )
  const first = renderCleanQR(firstModules, moduleCount)
  const second = renderCleanQR(secondModules, moduleCount)
  const results = invertUrls ? [second, first] : [first, second]

  return {
    version,
    urls: [results[0].data, results[1].data],
    previews: [results[0].preview, results[1].preview],
    score: Number(Boolean(results[0].data)) + Number(Boolean(results[1].data)),
  }
}

function DualQRCodeReader() {
  const canvasRef = useRef(null)
  const [splitPattern, setSplitPattern] = useState('vertical')
  const [qrVersion, setQrVersion] = useState('auto')
  const [invertUrls, setInvertUrls] = useState(false)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const image = new Image()
    image.onload = () => {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d', { alpha: false })
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0)
      URL.revokeObjectURL(image.src)
      setFileName(file.name)
      setResult(null)
      setError('')
    }
    image.onerror = () => {
      setError('画像を読み込めませんでした')
      URL.revokeObjectURL(image.src)
    }
    image.src = URL.createObjectURL(file)
  }

  const decodeImage = () => {
    const canvas = canvasRef.current
    if (!fileName || !canvas || !canvas.width || !canvas.height) {
      setError('先にQR画像を選択してください')
      return
    }

    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const versions = qrVersion === 'auto' ? AUTO_QR_VERSION_OPTIONS : [Number(qrVersion)]
    let bestAttempt = null

    for (const version of versions) {
      const attempt = attemptDecode(imageData, version, splitPattern, invertUrls)
      if (!bestAttempt || attempt.score > bestAttempt.score) {
        bestAttempt = attempt
      }
      if (attempt.score === 2) break
    }

    setResult(bestAttempt)
    setError(bestAttempt?.score ? '' : '2URL QRとして読み取れませんでした')
  }

  return (
    <section className="tool-panel" aria-labelledby="reader-title">
      <div className="tool-header reader-heading">
        <h1 id="reader-title">2URL QR Reader</h1>
        <p>2URL QR画像から2つのURLを復元します</p>
      </div>

      <div className="form-grid">
        <label className="file-field">
          <span>{fileName || 'PNG/JPEGを選択'}</span>
          <input type="file" accept="image/*" onChange={handleUpload} />
        </label>

        <fieldset className="option-group">
          <legend>Pixel Split</legend>
          <div className="radio-group">
            {SPLIT_PATTERN_OPTIONS.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="reader-pattern"
                  value={option.value}
                  checked={splitPattern === option.value}
                  onChange={(event) => setSplitPattern(event.target.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>QR Version</span>
          <select value={qrVersion} onChange={(event) => setQrVersion(event.target.value)}>
            <option value="auto">Auto</option>
            {QR_VERSION_OPTIONS.map((version) => (
              <option key={version} value={version}>
                v{version}
              </option>
            ))}
          </select>
        </label>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={invertUrls}
            onChange={(event) => setInvertUrls(event.target.checked)}
          />
          <span>Invert Pixel Splitting</span>
        </label>

        <button className="primary-button reader-button" type="button" onClick={decodeImage}>
          Decode 2URL QR
        </button>
      </div>

      <div className="reader-preview">
        <canvas ref={canvasRef} aria-label="Selected QR image preview" />
      </div>

      {error && <div className="status error">{error}</div>}

      {result && (
        <div className="reader-results">
          <div className="result-meta">Detected version: v{result.version}</div>
          {[0, 1].map((index) => (
            <div className="decoded-card" key={index}>
              <img src={result.previews[index]} alt={`Restored QR ${index + 1}`} />
              <div>
                <strong>URL {index + 1}</strong>
                {result.urls[index] ? (
                  <a href={result.urls[index]} target="_blank" rel="noopener noreferrer">
                    {result.urls[index]}
                  </a>
                ) : (
                  <span>読み取り失敗</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default DualQRCodeReader
