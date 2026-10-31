import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: process.env.BASE_APP || 'http://127.0.0.1:3000',
    channel: process.env.CI ? undefined : 'chrome',
    viewport: { width: 390, height: 844 },
  },
});
