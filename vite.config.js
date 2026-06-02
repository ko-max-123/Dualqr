import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      includeAssets: ['qr-icon.svg'],
      manifest: {
        name: 'QR Tools',
        short_name: 'QR Tools',
        description: 'Generate 2URL QR, generate color QR, and read color QR images',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/?mode=dual',
        icons: [
          {
            src: 'qr-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  // Vercelではbaseパスは不要（ルートドメインでデプロイ）
  base: process.env.NODE_ENV === 'production' && process.env.VERCEL ? '/' : '/DualQRCode-main/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
