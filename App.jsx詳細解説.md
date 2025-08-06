# App.jsx 詳細解説

## 概要

`App.jsx`は、DualQRCodeプロジェクトのメインコンポーネントです。1つのQRコードに2つの異なるURLを埋め込む実験的な機能を実装しています。

## ファイル構造

### インポート文
```javascript
import { useState } from 'react'
import QRCode from 'qrcode'
import './App.css'
```

- **useState**: Reactの状態管理フック
- **QRCode**: QRコード生成ライブラリ
- **App.css**: コンポーネント専用スタイル

## 状態管理（State Management）

### 主要な状態変数

```javascript
const [url1, setUrl1] = useState('')           // 1つ目のURL
const [url2, setUrl2] = useState('')           // 2つ目のURL
const [qrCodeData, setQrCodeData] = useState('') // 生成されたQRコード画像データ
const [error, setError] = useState('')         // エラーメッセージ
const [splitPattern, setSplitPattern] = useState('vertical') // 分割パターン
const [invertUrls, setInvertUrls] = useState(false) // URL反転フラグ
const [qrVersion, setQrVersion] = useState(4)  // QRコードバージョン
const [optionsOpen, setOptionsOpen] = useState(false) // オプション表示フラグ
```

### 状態変数の役割

1. **url1, url2**: ユーザーが入力する2つのURL
2. **qrCodeData**: 生成されたQRコードのBase64画像データ
3. **error**: エラー発生時のメッセージ表示
4. **splitPattern**: ピクセル分割パターン（vertical/horizontal/diagonal）
5. **invertUrls**: URLの順序を反転させるフラグ
6. **qrVersion**: QRコードのバージョン（2-10）
7. **optionsOpen**: オプション設定パネルの表示/非表示

## 核心機能: generateDualQRCode関数

### 関数の概要
```javascript
const generateDualQRCode = async () => {
  // 非同期関数として実装
  // 2つのURLからデュアルQRコードを生成
}
```

### 処理フロー

#### 1. 入力検証
```javascript
if (!url1 || !url2) {
  setError('Please enter both URLs')
  return
}
setError('')
```
- 両方のURLが入力されているかチェック
- エラー状態をリセット

#### 2. QRコードデータ生成
```javascript
const qr1Data = await QRCode.create(url1, {
  errorCorrectionLevel: 'H',  // 高エラー訂正レベル
  version: qrVersion
})
const qr2Data = await QRCode.create(url2, {
  errorCorrectionLevel: 'H',
  version: qrVersion
})
```

**重要な設定:**
- **errorCorrectionLevel: 'H'**: 最高レベルのエラー訂正
- **version**: ユーザーが選択したQRコードバージョン

#### 3. キャンバス設定
```javascript
const moduleCount = qr1Data.modules.size
const cellSize = 10 // セルサイズ（ピクセル）
const margin = 4 * cellSize // マージン
const size = moduleCount * cellSize + 2 * margin

const canvas = document.createElement('canvas')
const scale = 2 // 高解像度のためのスケールファクター
canvas.width = size * scale
canvas.height = size * scale
const ctx = canvas.getContext('2d', { alpha: false })
```

**設定の詳細:**
- **cellSize: 10**: 各QRコードセルのサイズ
- **margin: 4 * cellSize**: QRコード周囲のマージン
- **scale: 2**: 高解像度出力のためのスケールファクター

#### 4. 背景描画
```javascript
ctx.imageSmoothingEnabled = false
ctx.scale(scale, scale)
ctx.fillStyle = '#FFFFFF'
ctx.fillRect(0, 0, size, size)
```

#### 5. ピクセル分割アルゴリズム

**メインループ:**
```javascript
for (let row = 0; row < moduleCount; row++) {
  for (let col = 0; col < moduleCount; col++) {
    const cell1 = invertUrls ? qr2Data.modules.get(row, col) : qr1Data.modules.get(row, col)
    const cell2 = invertUrls ? qr1Data.modules.get(row, col) : qr2Data.modules.get(row, col)
    
    const x = col * cellSize + margin
    const y = row * cellSize + margin
```

**セル比較ロジック:**
```javascript
if (cell1 === cell2) {
  // 同じ値の場合：単色で描画
  ctx.fillStyle = cell1 ? '#000000' : '#FFFFFF'
  ctx.fillRect(x, y, cellSize, cellSize)
} else {
  // 異なる値の場合：分割パターンで描画
  // パターン別の処理...
}
```

#### 6. 分割パターンの実装

**対角線分割（Diagonal）:**
```javascript
if (splitPattern === 'diagonal') {
  // 1つ目のセル（左上から右下）
  ctx.fillStyle = cell1 ? '#000000' : '#FFFFFF'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + cellSize, y)
  ctx.lineTo(x + cellSize, y + cellSize)
  ctx.fill()

  // 2つ目のセル（左下から右上）
  ctx.fillStyle = cell2 ? '#000000' : '#FFFFFF'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y + cellSize)
  ctx.lineTo(x + cellSize, y + cellSize)
  ctx.fill()
}
```

**水平分割（Horizontal）:**
```javascript
else if (splitPattern === 'horizontal') {
  // 上半分
  ctx.fillStyle = cell1 ? '#000000' : '#FFFFFF'
  ctx.fillRect(x, y, cellSize, cellSize / 2)

  // 下半分
  ctx.fillStyle = cell2 ? '#000000' : '#FFFFFF'
  ctx.fillRect(x, y + cellSize / 2, cellSize, cellSize / 2)
}
```

**垂直分割（Vertical）:**
```javascript
else {
  // 左半分
  ctx.fillStyle = cell1 ? '#000000' : '#FFFFFF'
  ctx.fillRect(x, y, cellSize / 2, cellSize)

  // 右半分
  ctx.fillStyle = cell2 ? '#000000' : '#FFFFFF'
  ctx.fillRect(x + cellSize / 2, y, cellSize / 2, cellSize)
}
```

#### 7. 画像データの出力
```javascript
const dataUrl = canvas.toDataURL('image/png')
setQrCodeData(dataUrl)
```

## UIコンポーネント

### 1. GitHubリンク
```javascript
<a href="https://github.com/zacharyreese/DualQRCode" 
   target="_blank" 
   rel="noopener noreferrer" 
   className="github-button">
  <svg>...</svg>
  GitHub
</a>
```

### 2. ヘッダー
```javascript
<h1 id="header">Dual-Link QR Code Generator</h1>
<h4 id="subheader">Embed two URLs inside one QR code</h4>
```

### 3. 入力フォーム
```javascript
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
```

**特徴:**
- URL型の入力フィールド
- EnterキーでQRコード生成
- リアルタイム状態更新

### 4. オプション設定パネル

**折りたたみ機能:**
```javascript
<button className="options-toggle" onClick={() => setOptionsOpen(!optionsOpen)}>
  {optionsOpen ? '▼ Options' : '▶ Options'}
</button>
<div className={`options-container ${optionsOpen ? 'open' : ''}`}>
```

**分割パターン選択:**
```javascript
<div className="pattern-selector">
  <label>
    <input
      type="radio"
      value="vertical"
      checked={splitPattern === 'vertical'}
      onChange={(e) => setSplitPattern(e.target.value)}
    />
    Vertical
  </label>
  // horizontal, diagonal も同様
</div>
```

**QRコードバージョン選択:**
```javascript
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
  // v4, v6, v8, v10 も同様
</div>
```

**URL反転オプション:**
```javascript
<div className="invert-checkbox">
  <input
    type="checkbox"
    checked={invertUrls}
    onChange={(e) => setInvertUrls(e.target.checked)}
    id="invert-checkbox"
  />
  <label htmlFor="invert-checkbox">Invert Pixel Splitting</label>
</div>
```

### 5. 生成ボタン
```javascript
<button onClick={generateDualQRCode}>Generate QR Code</button>
```

### 6. エラー表示
```javascript
{error && <div className="error">{error}</div>}
```

### 7. QRコード表示
```javascript
{qrCodeData && (
  <div className="qr-code-container">
    <img src={qrCodeData} alt="Dual QR Code" />
  </div>
)}
```

### 8. フッター情報
```javascript
<p className="app-subtitle">Try scanning from different angles</p>
<div className="error">WARNING: This is experimental code...</div>
<div className="footer">
  All processing is client side and no data is collected
</div>
```

## 技術的特徴

### 1. エラーハンドリング
```javascript
try {
  // QRコード生成処理
} catch (err) {
  setError('Error generating QR code: ' + err.message)
}
```

### 2. 高解像度出力
- スケールファクター2を使用
- `imageSmoothingEnabled = false`でピクセルアート風の出力
- PNG形式で高品質画像を生成

### 3. レスポンシブ対応
- モバイル対応のメディアクエリ
- タッチフレンドリーなUI
- フレキシブルレイアウト

### 4. アクセシビリティ
- 適切なラベルとID
- キーボードナビゲーション対応
- セマンティックなHTML構造

## パフォーマンス考慮事項

### 1. メモリ管理
- キャンバス要素の適切な使用
- 大きな画像データの効率的な処理

### 2. 非同期処理
- QRコード生成を非同期で実行
- UIのブロッキングを防止

### 3. 状態更新の最適化
- 必要な時のみ状態を更新
- 不要な再レンダリングを防止

## セキュリティ考慮事項

### 1. クライアントサイド処理
- すべての処理がブラウザ内で完結
- サーバーへのデータ送信なし

### 2. 入力検証
- URL形式の基本的な検証
- エラーメッセージの適切な表示

### 3. 外部リンク
- `rel="noopener noreferrer"`の使用
- セキュアな外部リンク

## まとめ

App.jsxは、QRコード標準の制限を超えた実験的な機能を実装した複雑で興味深いコンポーネントです。高エラー訂正レベルを活用したピクセル分割アルゴリズム、高解像度出力、直感的なUI設計など、多くの技術的工夫が含まれています。ただし、これは教育的・研究的価値に重点を置いた概念実証であり、実用性よりも技術的可能性の探求が主目的となっています。 