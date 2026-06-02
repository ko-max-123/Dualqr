import { useState } from 'react'
import QRCode from 'qrcode'
import {
  QR_CANVAS_SCALE,
  QR_CELL_SIZE,
  QR_VERSION_OPTIONS,
  QUIET_ZONE_MODULES,
} from '../qrOptions'

function ColorQRCodeGenerator() {
  const [url1, setUrl1] = useState('')
  const [url2, setUrl2] = useState('')
  const [url3, setUrl3] = useState('')
  const [qrCodeData, setQrCodeData] = useState('')
  const [error, setError] = useState('')
  const [qrVersion, setQrVersion] = useState(4)

  const generateColorQRCode = async () => {
    try {
      if (!url1 || !url2 || !url3) {
        setError('URLを3つ入力してください')
        return
      }

      setError('')
      const options = { errorCorrectionLevel: 'H', version: qrVersion }
      const qr1 = await QRCode.create(url1, options)
      const qr2 = await QRCode.create(url2, options)
      const qr3 = await QRCode.create(url3, options)
      const moduleCount = qr1.modules.size
      const margin = QUIET_ZONE_MODULES * QR_CELL_SIZE
      const logicalSize = moduleCount * QR_CELL_SIZE + margin * 2
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
          const redCell = qr1.modules.get(row, col)
          const greenCell = qr2.modules.get(row, col)
          const blueCell = qr3.modules.get(row, col)
          const red = redCell ? 0 : 255
          const green = greenCell ? 0 : 255
          const blue = blueCell ? 0 : 255
          const x = col * QR_CELL_SIZE + margin
          const y = row * QR_CELL_SIZE + margin

          ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`
          ctx.fillRect(x, y, QR_CELL_SIZE, QR_CELL_SIZE)
        }
      }

      setQrCodeData(canvas.toDataURL('image/png'))
    } catch (err) {
      setError(`生成に失敗しました: ${err.message}`)
    }
  }

  return (
    <section className="tool-panel" aria-labelledby="color-title">
      <div className="tool-header color-heading">
        <h1 id="color-title">カラーQR</h1>
        <p>RGBチャンネルに3つのURLを重ねます</p>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Red URL</span>
          <input
            type="url"
            placeholder="https://example.com/red"
            value={url1}
            onChange={(event) => setUrl1(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') generateColorQRCode()
            }}
          />
        </label>

        <label className="field">
          <span>Green URL</span>
          <input
            type="url"
            placeholder="https://example.com/green"
            value={url2}
            onChange={(event) => setUrl2(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') generateColorQRCode()
            }}
          />
        </label>

        <label className="field">
          <span>Blue URL</span>
          <input
            type="url"
            placeholder="https://example.com/blue"
            value={url3}
            onChange={(event) => setUrl3(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') generateColorQRCode()
            }}
          />
        </label>

        <fieldset className="option-group">
          <legend>QR Version</legend>
          <div className="radio-group compact">
            {QR_VERSION_OPTIONS.map((version) => (
              <label key={version}>
                <input
                  type="radio"
                  name="color-version"
                  value={version}
                  checked={qrVersion === version}
                  onChange={(event) => setQrVersion(Number(event.target.value))}
                />
                <span>v{version}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button className="primary-button color-button" type="button" onClick={generateColorQRCode}>
          Generate Color QR
        </button>
      </div>

      {error && <div className="status error">{error}</div>}

      {qrCodeData && (
        <div className="qr-output">
          <img src={qrCodeData} alt="Generated color QR" />
          <a className="download-link" href={qrCodeData} download="color-qr.png">
            Download PNG
          </a>
        </div>
      )}
    </section>
  )
}

export default ColorQRCodeGenerator
