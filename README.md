# QR Tools

QRコードの規格外な多重化を試す実験用Reactアプリです。実運用向けではなく、検証・デモ用途のPoCとして扱ってください。

## Modes

起動時のURLパラメータで機能を切り替えます。

- `?mode=dual` - 2つのURLを1枚に重ねる2URL QR生成
- `?mode=color` - RGBチャンネルに3つのURLを重ねるカラーQR生成
- `?mode=reader` - カラーQRをカメラまたは画像から読み取り

`mode` の代わりに `app` パラメータも使えます。

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Notes

2URL QRは、2つのQRコードの同じモジュール位置を比較し、値が違うセルだけを垂直・水平・対角・チェッカーボードのいずれかで分割して描画します。読み取りは生成時と同じ分割パターンとQRバージョンを選ぶと安定します。

`checkerboard` は本家にはない追加パターンです。通常のカメラ読み取りで左傾きはURL 1、右傾きはURL 2へ寄りやすくするため、checkerboard時だけ大きめの奇数セル、左右非対称分割、固定QRマスクを使います。実機で左右が逆に感じる場合は `Invert Pixel Splitting` を使います。

カラーQRはRed/Green/Blue各チャンネルを個別のQRとして扱います。`reader` モードではカメラ画像をRGBチャンネルに分離し、それぞれをQRとして読み取ります。
