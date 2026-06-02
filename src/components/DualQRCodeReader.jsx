import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import {
  AUTO_QR_VERSION_OPTIONS,
  CHECKERBOARD_PRIMARY_RATIO,
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
    const firstCenter = CHECKERBOARD_PRIMARY_RATIO / 2
    const secondCenter = CHECKERBOARD_PRIMARY_RATIO + (1 - CHECKERBOARD_PRIMARY_RATIO) / 2

    return [
      { x: firstCenter, y: firstCenter },
      { x: secondCenter, y: firstCenter },
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

function imageDataToCanvas(imageData) {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  canvas.getContext('2d').putImageData(imageData, 0, 0)
  return canvas
}

function cropCenteredSquare(imageData) {
  if (imageData.width === imageData.height) return imageData

  const sourceCanvas = imageDataToCanvas(imageData)
  const size = Math.min(imageData.width, imageData.height)
  const sourceX = Math.floor((imageData.width - size) / 2)
  const sourceY = Math.floor((imageData.height - size) / 2)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { alpha: false })
  ctx.drawImage(sourceCanvas, sourceX, sourceY, size, size, 0, 0, size, size)
  return ctx.getImageData(0, 0, size, size)
}

function distance(pointA, pointB) {
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y)
}

function warpDetectedQRCode(imageData) {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  })

  if (!code?.location) return null

  const { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } = code.location
  const side = Math.max(
    320,
    Math.round(
      Math.max(
        distance(topLeftCorner, topRightCorner),
        distance(topRightCorner, bottomRightCorner),
        distance(bottomRightCorner, bottomLeftCorner),
        distance(bottomLeftCorner, topLeftCorner),
      ),
    ),
  )
  const output = new Uint8ClampedArray(side * side * 4)
  const { data, width, height } = imageData

  for (let y = 0; y < side; y += 1) {
    const v = side === 1 ? 0 : y / (side - 1)
    for (let x = 0; x < side; x += 1) {
      const u = side === 1 ? 0 : x / (side - 1)
      const topX = topLeftCorner.x + (topRightCorner.x - topLeftCorner.x) * u
      const topY = topLeftCorner.y + (topRightCorner.y - topLeftCorner.y) * u
      const bottomX = bottomLeftCorner.x + (bottomRightCorner.x - bottomLeftCorner.x) * u
      const bottomY = bottomLeftCorner.y + (bottomRightCorner.y - bottomLeftCorner.y) * u
      const sourceX = Math.max(0, Math.min(width - 1, Math.round(topX + (bottomX - topX) * v)))
      const sourceY = Math.max(0, Math.min(height - 1, Math.round(topY + (bottomY - topY) * v)))
      const sourceIndex = (sourceY * width + sourceX) * 4
      const targetIndex = (y * side + x) * 4

      output[targetIndex] = data[sourceIndex]
      output[targetIndex + 1] = data[sourceIndex + 1]
      output[targetIndex + 2] = data[sourceIndex + 2]
      output[targetIndex + 3] = 255
    }
  }

  return new ImageData(output, side, side)
}

function sampleDualModules(imageData, version, splitPattern, hasQuietZone) {
  const moduleCount = moduleCountForVersion(version)
  const { width, height } = imageData
  const qrSize = Math.min(width, height)
  const offsetX = (width - qrSize) / 2
  const offsetY = (height - qrSize) / 2
  const quietZone = hasQuietZone ? QUIET_ZONE_MODULES : 0
  const totalModules = moduleCount + quietZone * 2
  const modulePitch = qrSize / totalModules
  const radius = Math.max(1, Math.floor(modulePitch * 0.08))
  const points = getSamplePoints(splitPattern)
  const firstModules = []
  const secondModules = []

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      const firstX = offsetX + (quietZone + col + points[0].x) * modulePitch
      const firstY = offsetY + (quietZone + row + points[0].y) * modulePitch
      const secondX = offsetX + (quietZone + col + points[1].x) * modulePitch
      const secondY = offsetY + (quietZone + row + points[1].y) * modulePitch

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

function attemptDecode(imageData, version, splitPattern, invertUrls, hasQuietZone, source) {
  const { firstModules, secondModules, moduleCount } = sampleDualModules(
    imageData,
    version,
    splitPattern,
    hasQuietZone,
  )
  const first = renderCleanQR(firstModules, moduleCount)
  const second = renderCleanQR(secondModules, moduleCount)
  const results = invertUrls ? [second, first] : [first, second]

  return {
    version,
    urls: [results[0].data, results[1].data],
    previews: [results[0].preview, results[1].preview],
    score: Number(Boolean(results[0].data)) + Number(Boolean(results[1].data)),
    source,
  }
}

function decodeBestAttempt(imageData, versions, splitPattern, invertUrls) {
  const candidates = [
    { imageData: cropCenteredSquare(imageData), hasQuietZone: true, source: 'center' },
  ]
  const warpedImageData = warpDetectedQRCode(imageData)
  if (warpedImageData) {
    candidates.unshift({
      imageData: warpedImageData,
      hasQuietZone: false,
      source: 'detected',
    })
  }

  let bestAttempt = null
  for (const candidate of candidates) {
    for (const version of versions) {
      const attempt = attemptDecode(
        candidate.imageData,
        version,
        splitPattern,
        invertUrls,
        candidate.hasQuietZone,
        candidate.source,
      )

      if (!bestAttempt || attempt.score > bestAttempt.score) {
        bestAttempt = attempt
      }
      if (attempt.score === 2) return attempt
    }
  }

  return bestAttempt
}

function DualQRCodeReader() {
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [sourceMode, setSourceMode] = useState('camera')
  const [splitPattern, setSplitPattern] = useState('vertical')
  const [qrVersion, setQrVersion] = useState('auto')
  const [invertUrls, setInvertUrls] = useState(false)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)

  useEffect(() => {
    if (sourceMode !== 'camera') return undefined

    let mounted = true

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('このブラウザではカメラを使用できません')
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setCameraReady(true)
        setError('')
      } catch (err) {
        setCameraReady(false)
        setError(`カメラを起動できませんでした: ${err.message}`)
      }
    }

    startCamera()

    return () => {
      mounted = false
      setCameraReady(false)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [sourceMode])

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
      setSourceMode('upload')
      setResult(null)
      setError('')
    }
    image.onerror = () => {
      setError('画像を読み込めませんでした')
      URL.revokeObjectURL(image.src)
    }
    image.src = URL.createObjectURL(file)
  }

  const captureCameraFrame = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setError('カメラ映像を取得できませんでした')
      return false
    }

    const ctx = canvas.getContext('2d', { alpha: false })
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return true
  }

  const decodeImage = () => {
    const canvas = canvasRef.current

    if (sourceMode === 'camera' && !captureCameraFrame()) return

    if (sourceMode === 'upload' && (!fileName || !canvas || !canvas.width || !canvas.height)) {
      setError('先にQR画像を選択してください')
      return
    }

    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const versions = qrVersion === 'auto' ? AUTO_QR_VERSION_OPTIONS : [Number(qrVersion)]
    const bestAttempt = decodeBestAttempt(imageData, versions, splitPattern, invertUrls)

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
        <div className="source-toggle" aria-label="Reader source">
          <button
            className={sourceMode === 'camera' ? 'active' : ''}
            type="button"
            onClick={() => {
              setSourceMode('camera')
              setResult(null)
              setError('')
            }}
          >
            Camera
          </button>
          <button
            className={sourceMode === 'upload' ? 'active' : ''}
            type="button"
            onClick={() => {
              setSourceMode('upload')
              setResult(null)
              setError('')
            }}
          >
            Upload
          </button>
        </div>

        {sourceMode === 'upload' && (
          <label className="file-field">
            <span>{fileName || 'PNG/JPEGを選択'}</span>
            <input type="file" accept="image/*" onChange={handleUpload} />
          </label>
        )}

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
          {sourceMode === 'camera' ? 'Scan Camera' : 'Decode 2URL QR'}
        </button>
      </div>

      <div className="reader-preview">
        {sourceMode === 'camera' && (
          <video ref={videoRef} autoPlay muted playsInline aria-label="Camera preview" />
        )}
        <canvas
          className={sourceMode === 'camera' ? 'capture-canvas' : ''}
          ref={canvasRef}
          aria-label="Selected QR image preview"
        />
        {sourceMode === 'camera' && !cameraReady && !error && (
          <div className="camera-pending">カメラ起動中</div>
        )}
      </div>

      {error && <div className="status error">{error}</div>}

      {result && (
        <div className="reader-results">
          <div className="result-meta">
            Detected version: v{result.version} / source: {result.source}
          </div>
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
