import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

// Plugin untuk menghubungkan route /Gambar tags langsung ke folder TA_PPB/Gambar tags
function serveGambarTagsPlugin() {
  return {
    name: 'serve-gambar-tags',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const decoded = decodeURIComponent(req.url || '')
        if (decoded.startsWith('/Gambar tags/')) {
          const fileName = decoded.replace('/Gambar tags/', '').split('?')[0]
          const filePath = path.resolve(__dirname, 'Gambar tags', fileName)
          if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase()
            const mime = ext === '.png' ? 'image/png' : 'image/jpeg'
            res.setHeader('Content-Type', mime)
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
            return fs.createReadStream(filePath).pipe(res)
          }
        }
        next()
      })
    },
    buildStart() {
      const srcDir = path.resolve(__dirname, 'Gambar tags')
      const destDir = path.resolve(__dirname, 'public/Gambar tags')
      if (fs.existsSync(srcDir)) {
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
        const files = fs.readdirSync(srcDir)
        files.forEach(file => {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file))
        })
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  envPrefix: ['VITE_', 'SUPABASE_'],
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  plugins: [
    react(),
    serveGambarTagsPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        name: 'PilMate',
        short_name: 'PilMate',
        description: 'Pengingat obat dan riwayat konsumsi.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f4f8f7',
        theme_color: '#1f8a70',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webmanifest}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // cache respons GET dari API sendiri
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
})

