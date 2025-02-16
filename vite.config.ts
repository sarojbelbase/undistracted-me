import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import tailwindcss from "@tailwindcss/vite";
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    webExtension({
      manifest: 'public/manifest.json',
      browser: process.env.BROWSER ?? 'chrome',
    }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'public/index.html'),
        popup: path.resolve(__dirname, 'src/popup/index.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    open: false,
    hmr: true,
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  },
});