import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

const CHANNELS = [
  { key: 'red', label: 'Red URL', offset: 0 },
  { key: 'green', label: 'Green URL', offset: 1 },
  { key: 'blue', label: 'Blue URL', offset: 2 },
]

function getPercentileRange(imageData, offset) {
  const histogram = new Array(256).fill(0)
  const pixelCount = imageData.width * imageData.height

  for (let index = 0; index < pixelCount; index += 1) {
    histogram[imageData.data[index * 4 + offset]] += 1
  }

  const lowTarget = pixelCount * 0.02
  const highTarget = pixelCount * 0.98
  let cumulative = 0
  let low = 0
  let high = 255

  for (let value = 0; value < histogram.length; value += 1) {
    cumulative += histogram[value]
    if (cumulative >= lowTarget) {
      low = value
      break
    }
  }

  cumulative = 0
  for (let value = 0; value < histogram.length; value += 1) {
    cumulative += histogram[value]
    if (cumulative >= highTarget) {
      high = value
      break
    }
  }

  if (high - low < 24) {
    return { low: 0, high: 255 }
  }

  return { low, high }
}

function makeChannelImageData(imageData, offset) {
  const { width, height, data } = imageData
  const { low, high } = getPercentileRange(imageData, offset)
  const scale = 255 / Math.max(1, high - low)
  const mono = new Uint8ClampedArray(width * height * 4)

  for (let index = 0; index < width * height; index += 1) {
    const rawValue = data[index * 4 + offset]
    const value = Math.max(0, Math.min(255, Math.round((rawValue - low) * scale)))
    const target = index * 4
    mono[target] = value
    mono[target + 1] = value
    mono[target + 2] = value
    mono[target + 3] = 255
  }

  return new ImageData(mono, width, height)
}

function imageDataToPreview(imageData) {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  canvas.getContext('2d').putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

function decodeChannel(imageData, channel) {
  const channelImageData = makeChannelImageData(imageData, channel.offset)
  const code = jsQR(channelImageData.data, channelImageData.width, channelImageData.height, {
    inversionAttempts: 'attemptBoth',
  })

  return {
    ...channel,
    data: code?.data ?? null,
    preview: imageDataToPreview(channelImageData),
  }
}

function decodeColorQR(imageData) {
  return CHANNELS.map((channel) => decodeChannel(imageData, channel))
}

function ColorQRCodeReader() {
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [uploadedName, setUploadedName] = useState('')

  useEffect(() => {
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  const decodeCanvas = (sourceLabel) => {
    const canvas = canvasRef.current
    if (!canvas || !canvas.width || !canvas.height) {
      setError('読み取る画像がありません')
      return
    }

    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const nextResults = decodeColorQR(imageData)
    const successCount = nextResults.filter((result) => result.data).length
    setResults(nextResults)
    setError(successCount ? '' : `${sourceLabel}からカラーQRを読み取れませんでした`)
  }

  const scanCamera = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setError('カメラ映像を取得できませんでした')
      return
    }

    const ctx = canvas.getContext('2d', { alpha: false })
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setUploadedName('')
    decodeCanvas('カメラ')
  }

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
      setUploadedName(file.name)
      decodeCanvas('画像')
    }
    image.onerror = () => {
      setError('画像を読み込めませんでした')
      URL.revokeObjectURL(image.src)
    }
    image.src = URL.createObjectURL(file)
  }

  return (
    <section className="tool-panel color-reader-panel" aria-labelledby="reader-title">
      <div className="tool-header reader-heading">
        <h1 id="reader-title">カラーQRリーダー</h1>
        <p>RGBチャンネルを分離して3つのURLを読み取ります</p>
      </div>

      <div className="form-grid">
        <button className="primary-button reader-button" type="button" onClick={scanCamera}>
          Scan Camera
        </button>

        <label className="file-field">
          <span>{uploadedName || '画像から読む'}</span>
          <input type="file" accept="image/*" onChange={handleUpload} />
        </label>
      </div>

      <div className="reader-preview">
        <video ref={videoRef} autoPlay muted playsInline aria-label="Camera preview" />
        <canvas className="capture-canvas" ref={canvasRef} aria-label="Captured QR image" />
        {!cameraReady && !error && <div className="camera-pending">カメラ起動中</div>}
      </div>

      {error && <div className="status error">{error}</div>}

      {results.length > 0 && (
        <div className="channel-results">
          {results.map((result) => (
            <div className={`channel-card ${result.key}`} key={result.key}>
              <img src={result.preview} alt={`${result.label} channel preview`} />
              <div>
                <strong>{result.label}</strong>
                {result.data ? (
                  <a href={result.data} target="_blank" rel="noopener noreferrer">
                    {result.data}
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

export default ColorQRCodeReader
