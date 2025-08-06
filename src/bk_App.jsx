import { useState } from 'react'
import QRCode from 'qrcode'
import './App.css'

function App() {
  const [url1, setUrl1] = useState('')
  const [url2, setUrl2] = useState('')
  const [qrCodeData, setQrCodeData] = useState('')
  const [error, setError] = useState('')
  const [splitPattern, setSplitPattern] = useState('vertical')
  const [invertUrls, setInvertUrls] = useState(false)
  const [qrVersion, setQrVersion] = useState(4)
  const [optionsOpen, setOptionsOpen] = useState(false)

  const generateDualQRCode = async () => {
    try {
      if (!url1 || !url2) {
        setError('Please enter both URLs')
        return
      }
      setError('')

      // Generate QR code data for both URLs with explicit version
      const qr1Data = await QRCode.create(url1, {
        errorCorrectionLevel: 'H',
        version: qrVersion
      })
      const qr2Data = await QRCode.create(url2, {
        errorCorrectionLevel: 'H',
        version: qrVersion
      })

      const moduleCount = qr1Data.modules.size
      const cellSize = 10 // Increased for better quality
      const margin = 4 * cellSize // Adjusted margin for better scanning
      const size = moduleCount * cellSize + 2 * margin

      // Create high-resolution canvas for the merged QR code
      const canvas = document.createElement('canvas')
      const scale = 2 // Scale factor for higher resolution
      canvas.width = size * scale
      canvas.height = size * scale
      const ctx = canvas.getContext('2d', { alpha: false })
      
      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = false
      ctx.scale(scale, scale)

      // Fill background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, size, size)

      // Draw QR code cells
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          const cell1 = invertUrls ? qr2Data.modules.get(row, col) : qr1Data.modules.get(row, col)
          const cell2 = invertUrls ? qr1Data.modules.get(row, col) : qr2Data.modules.get(row, col)
          
          const x = col * cellSize + margin
          const y = row * cellSize + margin

          if (cell1 === cell2) {
            // If cells are the same, draw solid color
            ctx.fillStyle = cell1 ? '#000000' : '#FFFFFF'
            ctx.fillRect(x, y, cellSize, cellSize)
          } else {
            if (splitPattern === 'diagonal') {
              // Diagonal split pattern
              ctx.fillStyle = cell1 ? '#000000' : '#FFFFFF'
              ctx.beginPath()
              ctx.moveTo(x, y)
              ctx.lineTo(x + cellSize, y)
              ctx.lineTo(x + cellSize, y + cellSize)
              ctx.fill()

              ctx.fillStyle = cell2 ? '#000000' : '#FFFFFF'
              ctx.beginPath()
              ctx.moveTo(x, y)
              ctx.lineTo(x, y + cellSize)
              ctx.lineTo(x + cellSize, y + cellSize)
              ctx.fill()
            } else if (splitPattern === 'horizontal') {
              // Horizontal split pattern
              ctx.fillStyle = cell1 ? '#000000' : '#FFFFFF'
              ctx.fillRect(x, y, cellSize, cellSize / 2)

              ctx.fillStyle = cell2 ? '#000000' : '#FFFFFF'
              ctx.fillRect(x, y + cellSize / 2, cellSize, cellSize / 2)
            } else if (splitPattern === 'checkerboard') {
              // ─── チェッカーシンメトリック4分割パターン ───
              // セル内を2×2に分割し、対角に配置する色を決定
              const halfW1 = Math.floor(cellSize / 2)      // 左側の幅
              const halfH1 = Math.floor(cellSize / 2)      // 上側の高さ
              const halfW2 = cellSize - halfW1             // 右側の幅
              const halfH2 = cellSize - halfH1             // 下側の高さ
              
              // URL1の色を左上&右下、URL2の色を右上&左下に配置
              const color1 = cell1 ? '#000000' : '#FFFFFF'
              const color2 = cell2 ? '#000000' : '#FFFFFF'
              
              // 4つの小矩形領域を塗り分ける
              // 左上小領域
              ctx.fillStyle = color1
              ctx.fillRect(x, y, halfW1, halfH1)
              // 右上小領域
              ctx.fillStyle = color2
              ctx.fillRect(x + halfW1, y, halfW2, halfH1)
              // 左下小領域
              ctx.fillStyle = color2
              ctx.fillRect(x, y + halfH1, halfW1, halfH2)
              // 右下小領域
              ctx.fillStyle = color1
              ctx.fillRect(x + halfW1, y + halfH1, halfW2, halfH2)
            } else {
              // Vertical split pattern
              ctx.fillStyle = cell1 ? '#000000' : '#FFFFFF'
              ctx.fillRect(x, y, cellSize / 2, cellSize)

              ctx.fillStyle = cell2 ? '#000000' : '#FFFFFF'
              ctx.fillRect(x + cellSize / 2, y, cellSize / 2, cellSize)
            }
          }
        }
      }

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png')
      setQrCodeData(dataUrl)

      // No cleanup needed since we're using canvas directly
    } catch (err) {
      setError('Error generating QR code: ' + err.message)
    }
  }

  return (
    <div className="app-container">
      <a
        href="https://github.com/zacharyreese/DualQRCode"
        target="_blank"
        rel="noopener noreferrer"
        className="github-button"
      >
        <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        GitHub
      </a>
      <h1 id="header">Dual-Link QR Code Generator</h1>
      <h4 id="subheader">Embed two URLs inside one QR code</h4>
      <div className="input-container">
        <input
          type="url"
          placeholder="Enter first URL"
          value={url1}
          onChange={(e) => setUrl1(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              generateDualQRCode()
            }
          }}
        />
        <input
          type="url"
          placeholder="Enter second URL"
          value={url2}
          onChange={(e) => setUrl2(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              generateDualQRCode()
            }
          }}
        />
        <button className="options-toggle" onClick={() => setOptionsOpen(!optionsOpen)}>
          {optionsOpen ? '▼ Options' : '▶ Options'}
        </button>
        <div className={`options-container ${optionsOpen ? 'open' : ''}`}>
          <div className="pattern-selector">
            <label>
              Pixel Split
            </label>
            <label>
              <input
                type="radio"
                value="vertical"
                checked={splitPattern === 'vertical'}
                onChange={(e) => setSplitPattern(e.target.value)}
              />
              Vertical
            </label>
            <label>
              <input
                type="radio"
                value="horizontal"
                checked={splitPattern === 'horizontal'}
                onChange={(e) => setSplitPattern(e.target.value)}
              />
              Horizontal
            </label>
            <label>
              <input
                type="radio"
                value="diagonal"
                checked={splitPattern === 'diagonal'}
                onChange={(e) => setSplitPattern(e.target.value)}
              />
              Diagonal
            </label>
            <label>
              <input
                type="radio"
                value="checkerboard"
                checked={splitPattern === 'checkerboard'}
                onChange={(e) => setSplitPattern(e.target.value)}
              />
              Checkerboard
            </label>
          </div>
          <div className="pattern-selector">
            <label>QR Code Version</label>
            <label>
              <input
                type="radio"
                value="2"
                checked={qrVersion === 2}
                onChange={(e) => setQrVersion(Number(e.target.value))}
              />
              v2
            </label>
            <label>
              <input
                type="radio"
                value="4"
                checked={qrVersion === 4}
                onChange={(e) => setQrVersion(Number(e.target.value))}
              />
              v4
            </label>
            <label>
              <input
                type="radio"
                value="6"
                checked={qrVersion === 6}
                onChange={(e) => setQrVersion(Number(e.target.value))}
              />
              v6
            </label>
            <label>
              <input
                type="radio"
                value="8"
                checked={qrVersion === 8}
                onChange={(e) => setQrVersion(Number(e.target.value))}
              />
              v8
            </label>
            <label>
              <input
                type="radio"
                value="10"
                checked={qrVersion === 10}
                onChange={(e) => setQrVersion(Number(e.target.value))}
              />
              v10
            </label>
          </div>
          <div className="invert-checkbox">
            <input
              type="checkbox"
              checked={invertUrls}
              onChange={(e) => setInvertUrls(e.target.checked)}
              id="invert-checkbox"
            />
            <label htmlFor="invert-checkbox">Invert Pixel Splitting</label>
          </div>
        </div>
        <button onClick={generateDualQRCode}>Generate QR Code</button>
      </div>
      {error && <div className="error">{error}</div>}
      {qrCodeData && (
        <div className="qr-code-container">
          <img src={qrCodeData} alt="Dual QR Code" />
        </div>
      )}
      <p className="app-subtitle">Try scanning from different angles</p>
      <div className="error">WARNING: This is experimental code that goes against and breaks the QR code standard. 
        This should NEVER be used for real world applications and is merely a proof of concept.</div>
        <div className="footer">
        All processing is client side and no data is collected
        </div>
      <div className="footer">
        Inspired by <a href="https://mstdn.social/@isziaui/113874436953157913" target="_blank" rel="noopener noreferrer">Christian Walther</a>
      </div>
      <div className="footer">
       <a href="https://buymeacoffee.com/zacreese" target="_blank">Buy me a coffee ☕</a>
      </div>
    </div>
  )
}

export default App
