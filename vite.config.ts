import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './public/manifest.json'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  server: {
    port: 3000,
    cors: true,
    proxy: {
      '/np-api': {
        target: 'https://nepalipaisa.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/np-api/, '/api'),
      },
      '/ml-api': {
        target: 'https://www.merolagani.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ml-api/, '/handlers/TechnicalChartHandler.ashx'),
      },
    },
  },
})
