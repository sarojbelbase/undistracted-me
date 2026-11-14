import { defineConfig } from 'vitest/config';

// Separate Vitest config — intentionally excludes @crxjs/vite-plugin and
// the chrome-extension manifest because they have no relevance in jsdom.
// No React/Preact plugin is needed: unit tests run on real React, and Vite's
// esbuild transform handles JSX automatically (automatic runtime → react/jsx-runtime).
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.js'],
    include: ['tests/unit/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: [
        'api/**',
        'app/components/LookAway/**',
        'app/components/FocusMode/**',
        'app/widgets/**',
        'app/store/**',
        'app/theme.js',
        'app/constants/**',
        'app/utilities/**',
      ],
      exclude: [
        '**/useWidgetInstances.js.bak',
        // Chrome extension APIs — not available in jsdom
        'app/utilities/chrome.js',
        // OAuth / Google API — require real browser auth flows + network
        'app/utilities/googleAuth.js',
        'app/utilities/googleContacts.js',
        // Media capture — requires camera/microphone hardware
        'app/utilities/media.js',
        // Complex canvas+fetch browser APIs (favicon generation)
        'app/utilities/favicon.js',
        // matchMedia API dependency
        'app/utilities/useAutoTheme.js',
        // Deprecated re-export shims — no testable logic
        'app/utilities/useAgeLabel.js',
        'app/widgets/useEvents.js',
        'app/store/index.js',
        'app/constants/settings.js',
        // Widget registry metadata — pure constant objects, no logic
        '**/config.js',
        // Complex Spotify OAuth + media control (Spotify API connectivity required)
        'app/widgets/spotify/**',
        // Occasions widget — complex date-based calendar widget, low priority
        'app/widgets/occasions/**',
        // Quick Access widget — minimal logic, external URL handling
        'app/widgets/quickAccess/**',
        // Bookmarks utils is a re-export façade for the excluded favicon.js
        'app/widgets/bookmarks/utils.js',
      ],
      reporter: ['text', 'json-summary'],
      reportOnFailure: true,
    },
  },
});
