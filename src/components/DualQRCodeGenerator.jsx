import { useState } from 'react'
import QRCode from 'qrcode'
import {
  CHECKERBOARD_MASK_PATTERN,
  CHECKERBOARD_QR_CELL_SIZE,
  QR_CANVAS_SCALE,
  QR_CELL_SIZE,
  QR_VERSION_OPTIONS,
  QUIET_ZONE_MODULES,
  SPLIT_PATTERN_OPTIONS,
} from '../qrOptions'

function drawSplitCell(ctx, x, y, cellSize, firstCell, secondCell, splitPattern) {
  const firstColor = firstCell ? '#000000' : '#ffffff'
  const secondColor = secondCell ? '#000000' : '#ffffff'

  if (splitPattern === 'diagonal') {
    ctx.fillStyle = firstColor
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + cellSize, y)
    ctx.lineTo(x + cellSize, y + cellSize)
    ctx.fill()

    ctx.fillStyle = secondColor
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y + cellSize)
    ctx.lineTo(x + cellSize, y + cellSize)
    ctx.fill()
    return
  }

  if (splitPattern === 'horizontal') {
    const topHeight = Math.floor(cellSize / 2)
    ctx.fillStyle = firstColor
    ctx.fillRect(x, y, cellSize, topHeight)
    ctx.fillStyle = secondColor
    ctx.fillRect(x, y + topHeight, cellSize, cellSize - topHeight)
    return
  }

  if (splitPattern === 'checkerboard') {
    const leftWidth = Math.ceil(cellSize / 2)
    const topHeight = Math.ceil(cellSize / 2)
    const rightWidth = cellSize - leftWidth
    const bottomHeight = cellSize - topHeight

    ctx.fillStyle = firstColor
    ctx.fillRect(x, y, leftWidth, topHeight)
    ctx.fillRect(x + leftWidth, y + topHeight, rightWidth, bottomHeight)
    ctx.fillStyle = secondColor
    ctx.fillRect(x + leftWidth, y, rightWidth, topHeight)
    ctx.fillRect(x, y + topHeight, leftWidth, bottomHeight)
    return
  }

  const leftWidth = Math.floor(cellSize / 2)
  ctx.fillStyle = firstColor
  ctx.fillRect(x, y, leftWidth, cellSize)
  ctx.fillStyle = secondColor
  ctx.fillRect(x + leftWidth, y, cellSize - leftWidth, cellSize)
}

function DualQRCodeGenerator() {
  const [url1, setUrl1] = useState('')
  const [url2, setUrl2] = useState('')
  const [qrCodeData, setQrCodeData] = useState('')
  const [error, setError] = useState('')
  const [splitPattern, setSplitPattern] = useState('vertical')
  const [invertUrls, setInvertUrls] = useState(false)
  const [qrVersion, setQrVersion] = useState(4)

  const generateDualQRCode = async () => {
    try {
      if (!url1 || !url2) {
        setError('URLを2つ入力してください')
        return
      }

      setError('')
      const cellSize =
        splitPattern === 'checkerboard' ? CHECKERBOARD_QR_CELL_SIZE : QR_CELL_SIZE
      const options = {
        errorCorrectionLevel: 'H',
        version: qrVersion,
        ...(splitPattern === 'checkerboard' ? { maskPattern: CHECKERBOARD_MASK_PATTERN } : {}),
      }
      const qr1 = await QRCode.create(url1, options)
      const qr2 = await QRCode.create(url2, options)
      const moduleCount = qr1.modules.size
      const margin = QUIET_ZONE_MODULES * cellSize
      const logicalSize = moduleCount * cellSize + margin * 2
      const canvas = document.createElement('canvas')
      canvas.width = logicalSize * QR_CANVAS_SCALE
      canvas.height = logicalSize * QR_CANVAS_SCALE

      const ctx = canvas.getContext('2d', { alpha: false })
      ctx.imageSmoothingEnabled = false
      ctx.scale(QR_CANVAS_SCALE, QR_CANVAS_SCALE)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, logicalSize, logicalSize)

      for (let row = 0; row < moduleCount; row += 1) {
        for (let col = 0; col < moduleCount; col += 1) {
          const firstCell = invertUrls ? qr2.modules.get(row, col) : qr1.modules.get(row, col)
          const secondCell = invertUrls ? qr1.modules.get(row, col) : qr2.modules.get(row, col)
          const x = col * cellSize + margin
          const y = row * cellSize + margin

          if (firstCell === secondCell) {
            ctx.fillStyle = firstCell ? '#000000' : '#ffffff'
            ctx.fillRect(x, y, cellSize, cellSize)
          } else {
            drawSplitCell(ctx, x, y, cellSize, firstCell, secondCell, splitPattern)
          }
        }
      }

      setQrCodeData(canvas.toDataURL('image/png'))
    } catch (err) {
      setError(`生成に失敗しました: ${err.message}`)
    }
  }

  return (
    <section
      className={`tool-panel ${splitPattern === 'checkerboard' ? 'checkerboard-mode' : ''}`}
      aria-labelledby="dual-title"
    >
      <div className="tool-header">
        <h1 id="dual-title">2URL QR</h1>
        <p>
          1枚のQRに2つのURLを重ねます
          {splitPattern === 'checkerboard' ? ' / left tilt URL1, right tilt URL2' : ''}
        </p>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>URL 1</span>
          <input
            type="url"
            placeholder="https://example.com/a"
            value={url1}
            onChange={(event) => setUrl1(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') generateDualQRCode()
            }}
          />
        </label>

        <label className="field">
          <span>URL 2</span>
          <input
            type="url"
            placeholder="https://example.com/b"
            value={url2}
            onChange={(event) => setUrl2(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') generateDualQRCode()
            }}
          />
        </label>

        <fieldset className="option-group">
          <legend>Pixel Split</legend>
          <div className="radio-group">
            {SPLIT_PATTERN_OPTIONS.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="split-pattern"
                  value={option.value}
                  checked={splitPattern === option.value}
                  onChange={(event) => setSplitPattern(event.target.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="option-group">
          <legend>QR Version</legend>
          <div className="radio-group compact">
            {QR_VERSION_OPTIONS.map((version) => (
              <label key={version}>
                <input
                  type="radio"
                  name="dual-version"
                  value={version}
                  checked={qrVersion === version}
                  onChange={(event) => setQrVersion(Number(event.target.value))}
                />
                <span>v{version}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={invertUrls}
            onChange={(event) => setInvertUrls(event.target.checked)}
          />
          <span>Invert Pixel Splitting</span>
        </label>

        <button className="primary-button" type="button" onClick={generateDualQRCode}>
          Generate 2URL QR
        </button>
      </div>

      {error && <div className="status error">{error}</div>}

      {qrCodeData && (
        <div className="qr-output">
          <img src={qrCodeData} alt="Generated 2URL QR" />
          <a className="download-link" href={qrCodeData} download="dual-url-qr.png">
            Download PNG
          </a>
        </div>
      )}
    </section>
  )
}

export default DualQRCodeGenerator
