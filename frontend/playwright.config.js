// 13.0 — end-to-end tests in a real browser: the demo build (example data, no server) served by
// `vite preview`, driven by Playwright in Chromium with a phone-sized screen.
//   npm run e2e          builds the demo into dist-e2e/, then runs e2e/*.e2e.js
// PW_CHROMIUM=/path/to/chromium runs them with a browser of your own instead of Playwright's.
import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const own = process.env.PW_CHROMIUM

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.js',          // not *.test.js — those are Vitest's
  timeout: 60000,
  expect: { timeout: 15000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    ...devices['Pixel 7'],
    baseURL: `http://127.0.0.1:${PORT}/`,
    trace: 'retain-on-failure',
    ...(own ? { launchOptions: { executablePath: own, args: ['--no-sandbox', '--disable-gpu', '--no-zygote'] } } : {}),
  },
  webServer: {
    command: `npx vite preview --outDir dist-e2e --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
})
