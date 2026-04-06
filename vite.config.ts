import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './public/manifest.json'
import { obscureEnvKeys } from './plugins/obscureEnvKeys'

export default defineConfig({
  plugins: [
    // Must be first — transforms import.meta.env.VITE_* before Vite's own define pass.
    obscureEnvKeys([
      'VITE_OWM_API_KEY',
      'VITE_UNSPLASH_ACCESS_KEY',
      'VITE_SPOTIFY_CLIENT_ID',
      'VITE_GOOGLE_DESKTOP_CLIENT_ID',
      'VITE_GOOGLE_DESKTOP_CLIENT_SECRET',
    ]),
    react(),
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-grid-layout') || id.includes('node_modules/react-resizable')) return 'vendor-grid';
          if (id.includes('node_modules/react-bootstrap-icons')) return 'vendor-icons';
          if (id.includes('node_modules/dayjs')) return 'vendor-dayjs';
          if (id.includes('node_modules/zustand')) return 'vendor-zustand';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor-react';
        },
      },
    },
  },
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
