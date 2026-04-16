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
        'api/**',
        'src/components/LookAway/**',
        'src/components/FocusMode/**',
        'src/widgets/**',
        'src/store/**',
        'src/theme.js',
        'src/constants/**',
        'src/utilities/**',
      ],
      exclude: [
        '**/useWidgetInstances.js.bak',
        // Chrome extension APIs — not available in jsdom
        'src/utilities/chrome.js',
        // OAuth / Google API — require real browser auth flows + network
        'src/utilities/googleAuth.js',
        'src/utilities/googleContacts.js',
        // Media capture — requires camera/microphone hardware
        'src/utilities/media.js',
        // Complex canvas+fetch browser APIs (favicon generation)
        'src/utilities/favicon.js',
        // matchMedia API dependency
        'src/utilities/useAutoTheme.js',
        // Deprecated re-export shims — no testable logic
        'src/utilities/useAgeLabel.js',
        'src/widgets/useEvents.js',
        'src/store/index.js',
        'src/constants/settings.js',
        // Widget registry metadata — pure constant objects, no logic
        '**/config.js',
        // Complex Spotify OAuth + media control (Spotify API connectivity required)
        'src/widgets/spotify/**',
        // Occasions widget — complex date-based calendar widget, low priority
        'src/widgets/occasions/**',
        // Quick Access widget — minimal logic, external URL handling
        'src/widgets/quickAccess/**',
        // Bookmarks utils is a re-export façade for the excluded favicon.js
        'src/widgets/bookmarks/utils.js',
      ],
      reporter: ['text', 'json-summary'],
      reportOnFailure: true,
    },
  },
});
