import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Separate Vitest config — intentionally excludes @crxjs/vite-plugin and
// the chrome-extension manifest because they have no relevance in jsdom.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.js'],
    include: ['tests/unit/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: [
        'src/components/LookAway/**',
        'src/components/FocusMode/**',
        'src/widgets/**',
        'src/store/**',
        'src/theme.js',
        'src/constants/**',
        'src/utilities/**',
      ],
      exclude: [
        '**/*.bak',
        '**/useWidgetInstances.js.bak',
      ],
      reporter: ['text', 'json-summary'],
      reportOnFailure: true,
    },
  },
});
