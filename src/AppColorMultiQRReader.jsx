import React, { useRef, useState, useEffect } from 'react';
import jsQR from 'jsqr';
import './AppColorMultiQRReader.css';

function AppColorMultiQRReader() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [urls, setUrls] = useState([null, null, null]);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('camera'); // 'camera' or 'upload'

  // カメラストリーム開始
  useEffect(() => {
    if (mode !== 'camera') return;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      })
      .catch(err => setError('Camera Error: ' + err.message));
  }, [mode]);

  const processImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // video or uploaded image
    if (mode === 'camera') {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;

    // チャンネル別二値化関数
    const binarizeChannel = (offset) => {
      const bin = new Uint8ClampedArray(width * height);
      for (let i = 0; i < width * height; i++) {
        const val = data[i * 4 + offset];
        bin[i] = val > 128 ? 255 : 0; // 固定しきい値128
      }
      return bin;
    };

    const decodeFromBin = (bin) => {
      // jsQR expects Uint8ClampedArray RGBA-like, but we can reconstruct RGBA for each pixel
      const mono = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < width * height; i++) {
        const v = bin[i];
        mono[i * 4 + 0] = v;
        mono[i * 4 + 1] = v;
        mono[i * 4 + 2] = v;
        mono[i * 4 + 3] = 255;
      }
      const code = jsQR(mono, width, height);
      return code ? code.data : null;
    };

    try {
      const rBin = binarizeChannel(0);
      const gBin = binarizeChannel(1);
      const bBin = binarizeChannel(2);
      const rUrl = decodeFromBin(rBin);
      const gUrl = decodeFromBin(gBin);
      const bUrl = decodeFromBin(bBin);
      setUrls([rUrl, gUrl, bUrl]);
      setError('');
    } catch (e) {
      setError('Decode Error: ' + e.message);
    }
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
    };
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className="app-reader">
      <h1>カラー多重QRリーダー</h1>
      <div className="mode-switch">
        <button onClick={() => setMode('camera')}>カメラ</button>
        <button onClick={() => setMode('upload')}>ファイルアップロード</button>
      </div>
      {mode === 'upload' && <input type="file" accept="image/*" onChange={handleUpload} />}
      <div className="video-container">
        {mode === 'camera'
          ? <video ref={videoRef} width={400} height={400} />
          : <canvas ref={canvasRef} width={400} height={400} />
        }
      </div>
      <button onClick={processImage}>スキャン</button>
      {error && <div className="error">{error}</div>}
      <div className="results">
        <h2>読み取り結果</h2>
        <ul>
          {urls.map((u, i) => (
            <li key={i}>{u ? <a href={u} target="_blank" rel="noopener noreferrer">URL {i+1}</a> : `URL ${i+1} 読み取り失敗`}</li>
          ))}
        </ul>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

export default AppColorMultiQRReader;
