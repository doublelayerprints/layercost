import { defineConfig, devices } from '@playwright/test'

const isCI = Boolean(process.env.CI)
const forceFreshServer =
  process.env.E2E_AUTH === '1' || process.env.E2E_SYNC === '1' || process.env.E2E_FRESH === '1'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    locale: 'it-IT',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /webkit\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        channel: isCI ? undefined : 'chrome',
      },
    },
    {
      name: 'webkit',
      testMatch: /webkit\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !isCI && !forceFreshServer,
    timeout: 120_000,
  },
})
