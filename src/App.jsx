import { useState } from 'react'
import QRCode from 'qrcode'
import './App.css'

function App() {
  const [url1, setUrl1] = useState('')
  const [url2, setUrl2] = useState('')
  const [url3, setUrl3] = useState('')
  const [qrCodeData, setQrCodeData] = useState('')
  const [error, setError] = useState('')
  const [qrVersion, setQrVersion] = useState(4)

  const generateTripleQRCode = async () => {
    try {
      if (!url1 || !url2 || !url3) {
        setError('Please enter three URLs')
        return
      }
      setError('')

      // Generate QR code data for all three URLs
      const opts = { errorCorrectionLevel: 'H', version: qrVersion }
      const qr1 = await QRCode.create(url1, opts)
      const qr2 = await QRCode.create(url2, opts)
      const qr3 = await QRCode.create(url3, opts)

      const sizeModules = qr1.modules.size
      const cellSize = 10
      const margin = 4 * cellSize
      const pixelSize = sizeModules * cellSize + 2 * margin

      const canvas = document.createElement('canvas')
      const scale = 2
      canvas.width = pixelSize * scale
      canvas.height = pixelSize * scale
      const ctx = canvas.getContext('2d', { alpha: false })
      ctx.imageSmoothingEnabled = false
      ctx.scale(scale, scale)

      // White background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, pixelSize, pixelSize)

      // Draw each module cell with RGB mixing
      for (let r = 0; r < sizeModules; r++) {
        for (let c = 0; c < sizeModules; c++) {
          const bit1 = qr1.modules.get(r, c)
          const bit2 = qr2.modules.get(r, c)
          const bit3 = qr3.modules.get(r, c)
          const x = c * cellSize + margin
          const y = r * cellSize + margin

          // Determine fill color by channel
          const R = bit1 ? 0 : 255
          const G = bit2 ? 0 : 255
          const B = bit3 ? 0 : 255
          ctx.fillStyle = `rgb(${R},${G},${B})`
          ctx.fillRect(x, y, cellSize, cellSize)
        }
      }

      setQrCodeData(canvas.toDataURL('image/png'))
    } catch (e) {
      setError('Error: ' + e.message)
    }
  }

  return (
    <div className="app-container">
      <h1>Triple-URL QR Code Generator</h1>
      <div className="input-container">
        <input type="url" placeholder="URL 1" value={url1} onChange={e => setUrl1(e.target.value)} />
        <input type="url" placeholder="URL 2" value={url2} onChange={e => setUrl2(e.target.value)} />
        <input type="url" placeholder="URL 3" value={url3} onChange={e => setUrl3(e.target.value)} />
        <div className="version-selector">
          <label>QR Version:</label>
          {[2,4,6,8,10].map(v => (
            <label key={v}>
              <input
                type="radio"
                value={v}
                checked={qrVersion === v}
                onChange={e => setQrVersion(Number(e.target.value))}
              />
              v{v}
            </label>
          ))}
        </div>
        <button onClick={generateTripleQRCode}>Generate Triple QR</button>
      </div>
      {error && <div className="error">{error}</div>}
      {qrCodeData && (
        <div className="qr-container">
          <img src={qrCodeData} alt="Triple QR Code" />
        </div>
      )}
    </div>
  )
}

export default App
