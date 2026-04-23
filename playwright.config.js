import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright/specs',
  timeout: 20000,
  expect: { timeout: 6000 },
  fullyParallel: false,
  retries: 1,
  reporter: [['html', { outputFolder: 'tests/playwright/report', open: 'never' }], ['list']],
  outputDir: 'tests/playwright/results',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    colorScheme: 'dark',
    viewport: { width: 1440, height: 900 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Auto-start the dev server before running tests
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
