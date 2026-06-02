import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

const CHANNELS = [
  { key: 'red', label: 'Red URL', offset: 0 },
  { key: 'green', label: 'Green URL', offset: 1 },
  { key: 'blue', label: 'Blue URL', offset: 2 },
]

const BACK_CAMERA_LABEL_PATTERN =
  /(back|rear|environment|world|out|背面|外|後|リア|バック|後置|后置)/i
const FRONT_CAMERA_LABEL_PATTERN = /(front|user|face|前面|内|フロント|イン|前置)/i
const CAMERA_VIDEO_HINTS = {
  width: { ideal: 1280 },
  height: { ideal: 1280 },
}
const CAMERA_START_TIMEOUT_MS = 10000
const VIDEO_PLAY_TIMEOUT_MS = 5000

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

function getCameraErrorMessage(err) {
  if (!window.isSecureContext) {
    return [
      'スマホのブラウザではHTTPSのページでないとカメラを起動できません。',
      'PCのローカルIPをhttpで開いている場合は、HTTPSで公開したURLから開くか、写真を撮って読む機能を使ってください。',
    ].join('')
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return 'このブラウザではカメラを使用できません'
  }

  if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
    return 'カメラの使用が許可されていません。ブラウザのサイト設定でカメラ許可を有効にしてください。'
  }

  if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
    return '利用できるカメラが見つかりませんでした'
  }

  if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
    return '他のアプリがカメラを使用中の可能性があります。カメラアプリ等を閉じて再試行してください。'
  }

  if (err?.name === 'TimeoutError') {
    return 'カメラ起動がタイムアウトしました。ページを再読み込みするか、カメラ切替/写真を撮って読むを試してください。'
  }

  return `カメラを起動できませんでした: ${err?.message || '原因不明のエラー'}`
}

function createTimeoutError(message) {
  const err = new Error(message)
  err.name = 'TimeoutError'
  return err
}

function withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(createTimeoutError(message))
    }, timeoutMs)

    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        window.clearTimeout(timer)
        reject(err)
      },
    )
  })
}

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop())
}

function isConstraintError(err) {
  return err?.name === 'OverconstrainedError' || err?.name === 'ConstraintNotSatisfiedError'
}

function findBackCameraDevice(devices, currentDeviceId) {
  const videoDevices = devices.filter((device) => device.kind === 'videoinput')
  const backCamera = videoDevices.find((device) => {
    const label = device.label || ''
    return BACK_CAMERA_LABEL_PATTERN.test(label) && !FRONT_CAMERA_LABEL_PATTERN.test(label)
  })

  if (backCamera) return backCamera

  if (videoDevices.length <= 1) {
    return null
  }

  if (currentDeviceId) {
    const otherDevices = videoDevices.filter((device) => device.deviceId !== currentDeviceId)
    return otherDevices[otherDevices.length - 1] ?? null
  }

  return videoDevices[videoDevices.length - 1] ?? null
}

function findNextCameraDevice(devices, currentDeviceId) {
  const videoDevices = devices.filter((device) => device.kind === 'videoinput')

  if (videoDevices.length <= 1) {
    return null
  }

  const currentIndex = videoDevices.findIndex((device) => device.deviceId === currentDeviceId)
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % videoDevices.length : videoDevices.length - 1
  return videoDevices[nextIndex]
}

async function getVideoDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return []
  }

  return (await navigator.mediaDevices.enumerateDevices()).filter(
    (device) => device.kind === 'videoinput',
  )
}

function getActiveCameraInfo(stream, devices) {
  const track = stream.getVideoTracks()[0]
  const settings = track?.getSettings?.() ?? {}
  const activeDevice = devices.find((device) => device.deviceId === settings.deviceId)
  const label = activeDevice?.label || track?.label || settings.facingMode || 'カメラ'

  return {
    id: activeDevice?.deviceId || settings.deviceId || '',
    label,
  }
}

async function getStream(video) {
  return withTimeout(
    navigator.mediaDevices.getUserMedia({ video, audio: false }),
    CAMERA_START_TIMEOUT_MS,
    'camera start timed out',
  )
}

async function switchToBackCameraIfAvailable(stream) {
  const track = stream.getVideoTracks()[0]
  const settings = track?.getSettings?.() ?? {}

  if (settings.facingMode === 'environment') {
    return stream
  }

  if (!navigator.mediaDevices?.enumerateDevices) {
    return stream
  }

  const devices = await navigator.mediaDevices.enumerateDevices()
  const backCamera = findBackCameraDevice(devices, settings.deviceId)

  if (!backCamera) {
    return stream
  }

  try {
    const backStream = await getStream({
      ...CAMERA_VIDEO_HINTS,
      deviceId: { exact: backCamera.deviceId },
    })
    stopStream(stream)
    return backStream
  } catch {
    return stream
  }
}

async function requestCameraStream() {
  try {
    const stream = await getStream({
      ...CAMERA_VIDEO_HINTS,
      facingMode: { ideal: 'environment' },
    })
    return await switchToBackCameraIfAvailable(stream)
  } catch (err) {
    if (isConstraintError(err)) {
      const stream = await getStream(true)
      return switchToBackCameraIfAvailable(stream)
    }

    throw err
  }
}

async function requestCameraStreamByDeviceId(deviceId) {
  return getStream({
    ...CAMERA_VIDEO_HINTS,
    deviceId: { exact: deviceId },
  })
}

function ColorQRCodeReader() {
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [cameraDevices, setCameraDevices] = useState([])
  const [activeCameraId, setActiveCameraId] = useState('')
  const [activeCameraLabel, setActiveCameraLabel] = useState('')
  const [uploadedName, setUploadedName] = useState('')

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraReady(false)
  }, [])

  const attachCameraStream = useCallback(async (stream) => {
    streamRef.current = stream
    if (videoRef.current) {
      videoRef.current.muted = true
      videoRef.current.playsInline = true
      videoRef.current.srcObject = stream
    }

    const devices = await getVideoDevices()
    const activeCamera = getActiveCameraInfo(stream, devices)

    setCameraDevices(devices)
    setActiveCameraId(activeCamera.id)
    setActiveCameraLabel(activeCamera.label)
    setCameraReady(true)
    setError('')

    if (videoRef.current) {
      try {
        await withTimeout(
          videoRef.current.play(),
          VIDEO_PLAY_TIMEOUT_MS,
          'video playback timed out',
        )
      } catch (err) {
        setError(getCameraErrorMessage(err))
      }
    }
  }, [])

  const startCamera = useCallback(async () => {
    setCameraStarting(true)
    setError('')

    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('camera api unavailable')
      }

      stopCamera()
      const stream = await requestCameraStream()
      await attachCameraStream(stream)
    } catch (err) {
      setCameraReady(false)
      setError(getCameraErrorMessage(err))
    } finally {
      setCameraStarting(false)
    }
  }, [attachCameraStream, stopCamera])

  const switchCamera = useCallback(async () => {
    setCameraStarting(true)
    setError('')

    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('camera api unavailable')
      }

      const currentTrack = streamRef.current?.getVideoTracks()[0]
      const currentDeviceId = currentTrack?.getSettings?.().deviceId || activeCameraId
      const devices = cameraDevices.length ? cameraDevices : await getVideoDevices()
      const nextCamera = findNextCameraDevice(devices, currentDeviceId)

      if (!nextCamera) {
        setError('切り替え可能なカメラが見つかりませんでした')
        return
      }

      stopCamera()
      const stream = await requestCameraStreamByDeviceId(nextCamera.deviceId)
      await attachCameraStream(stream)
    } catch (err) {
      setCameraReady(false)
      setError(getCameraErrorMessage(err))
    } finally {
      setCameraStarting(false)
    }
  }, [activeCameraId, attachCameraStream, cameraDevices, stopCamera])

  useEffect(() => {
    startCamera()

    return () => {
      stopCamera()
    }
  }, [startCamera, stopCamera])

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

    if (!cameraReady) {
      startCamera()
      return
    }

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
        <button
          className="primary-button reader-button"
          type="button"
          onClick={scanCamera}
          disabled={cameraStarting}
        >
          {cameraReady ? 'Scan Camera' : cameraStarting ? '背面カメラ起動中' : '背面カメラ開始'}
        </button>

        {cameraReady && (
          <button
            className="secondary-button"
            type="button"
            onClick={switchCamera}
            disabled={cameraStarting}
          >
            カメラ切替
          </button>
        )}

        {cameraReady && activeCameraLabel && (
          <div className="camera-meta">使用中: {activeCameraLabel}</div>
        )}

        <label className="file-field">
          <span>{uploadedName || '写真を撮って読む'}</span>
          <input type="file" accept="image/*" capture="environment" onChange={handleUpload} />
        </label>

        <label className="file-field">
          <span>{uploadedName || '画像から読む'}</span>
          <input type="file" accept="image/*" onChange={handleUpload} />
        </label>
      </div>

      <div className="reader-preview">
        <video ref={videoRef} autoPlay muted playsInline aria-label="Camera preview" />
        <canvas className="capture-canvas" ref={canvasRef} aria-label="Captured QR image" />
        {!cameraReady && !error && <div className="camera-pending">背面カメラ起動中</div>}
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
